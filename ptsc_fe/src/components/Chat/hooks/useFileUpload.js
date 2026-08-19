import { useState, useCallback } from "react";
import axios from "axios";
import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";

const UPLOAD_URL = `${APP_BASE}/api/files/upload`;
const DOWNLOAD_BASE = `${APP_BASE}/api/files/download`;

const makeKey = (file) => `${file.name}_${file.size}_${file.lastModified}`;

const useFileUpload = () => {
  const [attachedFiles, setAttachedFiles] = useState({}); 
  const [uploadingFiles, setUploadingFiles] = useState({}); 

  // ---- helpers ----
  const getAttachedFiles = useCallback(
    (convId) => attachedFiles[convId] || [],
    [attachedFiles]
  );

  const isUploading = useCallback(
    (convId) => uploadingFiles[convId] || false,
    [uploadingFiles]
  );

  // ---- upload one ----
 const uploadOne = useCallback(async (attachment, token, onProgress, onSuccess) => {
  const formData = new FormData();
  formData.append("file", attachment.file);

  const res = await axios.post(UPLOAD_URL, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (evt) => {
      if (!evt.total) return;
      const percent = Math.round((evt.loaded * 100) / evt.total);
      onProgress?.(percent);
    },
  });

  const data = res.data;

  const fileId = data.id;
  if (!fileId) {
    throw new Error("Upload OK nhưng response không có id");
  }

  const uploaded = {
    id: fileId,
    url: `${DOWNLOAD_BASE}/${fileId}`,   
    path: data.file_path,
    name: data.file_name || attachment.name,
    size: attachment.size,
    type: attachment.type,
  };

  onSuccess(uploaded);
}, []);


  // ---- upload a list of attachments (parallel) ----
  const uploadFilesList = useCallback(async (convId, filesToUpload) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setAttachedFiles((prev) => ({
        ...prev,
        [convId]: (prev[convId] || []).map((x) =>
          filesToUpload.some(f => f.key === x.key)
            ? { ...x, status: "error", error: "Missing token" }
            : x
        ),
      }));
      return;
    }

    if (filesToUpload.length === 0) return;

    setUploadingFiles((p) => ({ ...p, [convId]: true }));

    const promises = filesToUpload.map((item) => {
      const setProgress = (percent) => {
        setAttachedFiles((prev) => ({
          ...prev,
          [convId]: (prev[convId] || []).map((x) =>
            x.key === item.key ? { ...x, progress: percent, status: "uploading" } : x
          ),
        }));
      };

      const onSuccess = (uploaded) => {
        setAttachedFiles((prev) => ({
          ...prev,
          [convId]: (prev[convId] || []).map((x) =>
            x.key === item.key
              ? {
                  ...x,
                  status: "uploaded",
                  progress: 100,
                  id: uploaded.id,
                  url: uploaded.url,
                  path: uploaded.path,
                  name: uploaded.name,
                  error: null,
                }
              : x
          ),
        }));
      };

      const onError = (e) => {
        setAttachedFiles((prev) => ({
          ...prev,
          [convId]: (prev[convId] || []).map((x) =>
            x.key === item.key
              ? { ...x, status: "error", progress: 0, error: e?.message || "Upload failed" }
              : x
          ),
        }));
      };

      return uploadOne(item, token, setProgress, onSuccess, onError);
    });

    try {
      await Promise.all(promises);
    } finally {
      const after = getAttachedFiles(convId);
      const stillUploading = after.some((x) => x.status === "uploading");
      if (!stillUploading) {
        setUploadingFiles((p) => ({ ...p, [convId]: false }));
      }
    }
  }, [getAttachedFiles, uploadOne]);

  const handleFileSelect = useCallback((convId, files) => {
    if (!files || files.length === 0) return;

    const realFiles = Array.from(files).filter(
      (f) => f instanceof File
    );

    if (realFiles.length === 0) {
      return;
    }

    const incoming = realFiles.map((f) => {
      const key = makeKey(f);
      const isImage = (f.type || "").startsWith("image/");

      return {
        key,
        file: f,
        name: f.name,
        size: f.size,
        type: f.type,
        previewUrl: isImage ? URL.createObjectURL(f) : null,
        status: "pending",
        progress: 0,
        id: null,
        url: null,
        path: null,
        error: null,
      };
    });

    setAttachedFiles((prev) => {
      const prevList = prev[convId] || [];
      const existed = new Set(prevList.map((x) => x.key));
      const newOnes = incoming.filter((x) => !existed.has(x.key));
      const merged = [...prevList, ...newOnes];
      return { ...prev, [convId]: merged };
    });

    const newOnes = incoming.filter((inc) => {
      const prevList = attachedFiles[convId] || [];
      const existed = new Set(prevList.map((x) => x.key));
      return !existed.has(inc.key);
    });
    if (newOnes.length > 0) {
      uploadFilesList(convId, newOnes);
    }
  }, [attachedFiles, uploadFilesList]); 

  const handleRemoveFile = useCallback((convId, index) => {
    setAttachedFiles((prev) => {
      const list = prev[convId] || [];
      const removed = list[index];

      if (removed?.previewUrl) {
        try { URL.revokeObjectURL(removed.previewUrl); } catch (_) {
            ///
          }
      }

      const next = list.filter((_, i) => i !== index);
      return { ...prev, [convId]: next };
    });
  }, []);

  const clearAttachedFiles = useCallback((convId) => {
    setAttachedFiles((prev) => {
      const list = prev[convId] || [];
      list.forEach((x) => {
        if (x?.previewUrl) {
          try { URL.revokeObjectURL(x.previewUrl); } catch (_) {
            //////
          }
        }
      });

      const next = { ...prev };
      delete next[convId];
      return next;
    });
  }, []);

  // ---- retry pending/error ----
  const uploadPendingFiles = useCallback(async (convId) => {
    const current = getAttachedFiles(convId);
    const queue = current.filter((x) => x.status === "pending" || x.status === "error");

    if (queue.length === 0) {
      return current
        .filter((x) => x.status === "uploaded" && x.id)
        .map((x) => ({ id: x.id, url: x.url, name: x.name, size: x.size, type: x.type, path: x.path }));
    }

    await uploadFilesList(convId, queue);

    const after = getAttachedFiles(convId);
    return after
      .filter((x) => x.status === "uploaded" && x.id)
      .map((x) => ({ id: x.id, url: x.url, name: x.name, size: x.size, type: x.type, path: x.path }));
  }, [getAttachedFiles, uploadFilesList]);

  return {
    attachedFiles,
    setAttachedFiles,
    uploadingFiles,
    getAttachedFiles,
    isUploading,

    handleFileSelect,     // NOW UPLOADS IMMEDIATELY
    handleRemoveFile,
    clearAttachedFiles,

    uploadPendingFiles,   // For retry
  };
};

export default useFileUpload;