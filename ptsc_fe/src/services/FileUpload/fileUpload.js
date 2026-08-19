const logger = console;

import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";

export const COMPRESSED_FILE_EXTENSIONS = [
  "zip",
  "rar",
  "7z",
  "tar",
  "gz",
  "bz2",
  "xz",
  "tgz",
  "tbz2",
  "iso",
];

export const getFileExtensionFromUrlOrName = (href, fileName) => {
  if (href && typeof href === "string") {
    try {
      const dummyBase = typeof window !== "undefined" ? window.location.origin : "http://dummy.local";
      const urlObj = new URL(href, dummyBase);

      const searchParams = urlObj.searchParams;
      const filenameParam =
        searchParams.get("filename") ||
        searchParams.get("fileName") ||
        searchParams.get("file_name") ||
        searchParams.get("name") ||
        searchParams.get("originalName") ||
        searchParams.get("original_name") ||
        searchParams.get("download");

      if (filenameParam && filenameParam.includes(".")) {
        const paramExt = filenameParam.split(".").pop().split(/[?#]/)[0].toLowerCase().trim();
        if (paramExt) return paramExt;
      }

      const pathname = urlObj.pathname;
      if (pathname && pathname.includes(".")) {
        const pathExt = pathname.split(".").pop().split(/[?#]/)[0].toLowerCase().trim();
        if (pathExt && pathExt !== "view" && pathExt !== "download" && pathExt !== "preview") {
          return pathExt;
        }
      }
    } catch (e) {
      // Ignore URL parse error
    }

    const cleanHref = href.split(/[?#]/)[0];
    if (cleanHref.includes(".")) {
      const parts = cleanHref.split(".");
      const cleanExt = parts[parts.length - 1].toLowerCase().trim();
      if (cleanExt && cleanExt.length <= 10 && cleanExt !== "view" && cleanExt !== "download") {
        return cleanExt;
      }
    }
  }

  if (fileName && typeof fileName === "string" && fileName.includes(".")) {
    const parts = fileName.split(".");
    const fileExt = parts[parts.length - 1].toLowerCase().trim();
    if (fileExt && fileExt.length <= 10) return fileExt;
  }

  return "";
};

export const apiUploadFile = async (file, objectType, objectId, metadata = {}) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("object_type", objectType);
  formData.append("object_id", objectId);
  
  // Thêm từng field của metadata trực tiếp vào FormData
  Object.keys(metadata).forEach(key => {
    formData.append(key, metadata[key]);
  });

  try {
    const response = await api.post(`/api/files/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    // Trả về dữ liệu file từ server (ví dụ: { _id, name, path, url, ... })
    return response.data;
  } catch (error) {
    logger.error("Upload file error:", error);
    throw error;
  }
};

const activeDownloads = new Set();

export const downloadFileWithAuth = async ({ id, fileId, href, fileName }) => {
  const targetId = id || fileId;
  const downloadKey = `${targetId || ""}_${href || ""}_${fileName || ""}`;

  if (activeDownloads.has(downloadKey)) {
    return;
  }
  activeDownloads.add(downloadKey);
  setTimeout(() => {
    activeDownloads.delete(downloadKey);
  }, 1000);

  let downloadUrl = "";

  if (targetId) {
    downloadUrl = `${APP_BASE}/api/files/download/${targetId}`;
  } else if (href) {
    downloadUrl = href;
  } else {
    throw new Error("Không xác định được nguồn file để tải về.");
  }

  if (href && href.includes("?") && !downloadUrl.includes("?")) {
    const query = href.split("?")[1];
    downloadUrl = `${downloadUrl}?${query}`;
  }

  const response = await api.get(downloadUrl, {
    responseType: "blob",
    timeout: 0,
  });

  let finalFileName = "";
  const contentDisposition = response.headers?.["content-disposition"];
  if (contentDisposition) {
    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match && utf8Match[1]) {
      try {
        finalFileName = decodeURIComponent(utf8Match[1]);
      } catch (e) {
        finalFileName = utf8Match[1];
      }
    } else {
      const match = contentDisposition.match(/filename="?([^";]+)"?/i);
      if (match && match[1]) {
        finalFileName = match[1];
      }
    }
  }

  // Fallback to filename query param if content-disposition header wasn't present
  if (!finalFileName && href) {
    try {
      const dummyBase = typeof window !== "undefined" ? window.location.origin : "http://dummy.local";
      const urlObj = new URL(href, dummyBase);
      const filenameParam =
        urlObj.searchParams.get("filename") ||
        urlObj.searchParams.get("fileName") ||
        urlObj.searchParams.get("file_name") ||
        urlObj.searchParams.get("name");

      if (filenameParam) {
        finalFileName = decodeURIComponent(filenameParam);
      }
    } catch (e) {
      // Ignore URL parse error
    }
  }

  if (!finalFileName) {
    finalFileName = fileName || "download";
  }

  // Ensure finalFileName has a proper extension
  const hasValidExt = finalFileName.includes(".") && finalFileName.split(".").pop().split(/[?#]/)[0].length <= 10;
  if (!hasValidExt) {
    const ext =
      getFileExtensionFromUrlOrName(href, fileName) ||
      getFileExtensionFromUrlOrName("", response.headers?.["content-disposition"]);

    if (ext) {
      finalFileName = `${finalFileName}.${ext}`;
    }
  }

  const contentType = response.headers?.["content-type"] || response.data?.type || "application/octet-stream";
  const blob = new Blob([response.data], { type: contentType });
  const blobUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = finalFileName;
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }, 100);
};

export const handleCompressedFileDownload = ({ href, fileName, fileId, event }) => {
  const ext = getFileExtensionFromUrlOrName(href, fileName);

  if (COMPRESSED_FILE_EXTENSIONS.includes(ext)) {
    if (event) {
      event.preventDefault?.();
      event.stopPropagation?.();
    }
    downloadFileWithAuth({ fileId, href, fileName }).catch((err) => {
      logger.log("Lỗi khi tải file nén:", err);
    });
    return true;
  }
  return false;
};

export const handleDefaultFileClick = ({
  href,
  fileName,
  fileId,
  handlePreview,
  onFileClick,
  event,
}) => {
  if (onFileClick) {
    onFileClick({ href, fileName, event });
    return;
  }
  const match = href ? href.match(/\/api\/files\/view\/([a-zA-Z0-9]+)/) : null;
  const targetId = fileId || (match ? match[1] : null);

  if (handleCompressedFileDownload({ href, fileName, fileId: targetId, event })) {
    return;
  }

  if (targetId) {
    if (handlePreview) {
      handlePreview({ id: targetId, fileName, href });
    }
  } else if (href) {
    window.open(href, "_blank", "noopener,noreferrer");
  }
};
