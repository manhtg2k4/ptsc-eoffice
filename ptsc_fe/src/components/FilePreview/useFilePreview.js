import { useState, useCallback } from "react";
import { useSelector } from "react-redux";
import api from "@services/api";
import * as XLSX from "xlsx";
import { useToast } from "@components/common/ToastProvider";
import {
  APP_BASE,
  API_XLSX_TO_PDF,
} from "@EnvironmentFile/constants/urlConfig";

// Helper to extract file extension from a string (filename or URL)
function getExtension(str) {
  if (!str || typeof str !== "string") return "";

  // 1. Check if string contains URL query parameters
  try {
    const dummyBase = "http://dummy.local";
    const urlObj = new URL(str, dummyBase);
    const searchParams = urlObj.searchParams;
    const filenameParam =
      searchParams.get("filename") ||
      searchParams.get("fileName") ||
      searchParams.get("file_name") ||
      searchParams.get("name") ||
      searchParams.get("originalName") ||
      searchParams.get("original_name") ||
      searchParams.get("download");

    if (filenameParam) {
      const decodedParam = decodeURIComponent(filenameParam);
      if (decodedParam.includes(".")) {
        const ext = decodedParam.split(".").pop().split(/[?#]/)[0].toLowerCase().trim();
        if (ext) return ext;
      }
    }

    // Check URL pathname
    const pathname = urlObj.pathname;
    if (pathname && pathname.includes(".")) {
      const ext = pathname.split(".").pop().split(/[?#]/)[0].toLowerCase().trim();
      if (ext && ext !== "view" && ext !== "download" && ext !== "preview") {
        return ext;
      }
    }
  } catch (e) {
    // Ignore URL parse error
  }

  // 2. Direct string extension check
  const cleanStr = str.split(/[?#]/)[0];
  if (cleanStr.includes(".")) {
    const parts = cleanStr.split(".");
    const ext = parts[parts.length - 1].toLowerCase().trim();
    if (ext && ext.length <= 10) return ext;
  }

  return "";
}

// Helper to get extension from MIME type
function getExtensionFromMime(mimeType) {
  if (!mimeType || typeof mimeType !== "string") return "";
  const mime = mimeType.toLowerCase().trim();

  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("wordprocessingml") || mime.includes("msword")) return "docx";
  if (mime.includes("spreadsheetml") || mime.includes("ms-excel") || mime.includes("excel")) return "xlsx";
  if (mime.includes("presentationml") || mime.includes("powerpoint") || mime.includes("ms-powerpoint")) return "pptx";
  if (mime.includes("image/jpeg") || mime.includes("image/jpg")) return "jpg";
  if (mime.includes("image/png")) return "png";
  if (mime.includes("image/gif")) return "gif";
  if (mime.includes("image/webp")) return "webp";
  if (mime.includes("image/")) return "png";
  if (mime.includes("text/plain")) return "txt";
  if (mime.includes("text/html")) return "html";

  return "";
}

// Helper to extract filename from Content-Disposition header
function getFilenameFromContentDisposition(header) {
  if (!header || typeof header !== "string") return "";

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch (e) {
      return utf8Match[1];
    }
  }

  const match = header.match(/filename="?([^";]+)"?/i);
  if (match && match[1]) {
    return match[1];
  }

  return "";
}

// Function to resolve file type flags (isDoc, isExcel, isPpt, isBrowserFile, etc.)
function resolveFileTypeFlags(file, extraExtension = "") {
  const candidates = [
    extraExtension,
    file?.rawFile?.name,
    file?.originalName,
    file?.original_name,
    file?.originFileName,
    file?.realName,
    file?.file_name,
    file?.filename,
    file?.href,
    file?.url,
    file?.path,
    file?.fileCategory,
    file?.fileTypeCategory,
    file?.fileType,
    file?.file_type,
    file?.extension,
    file?.ext,
    file?.fileName,
    file?.name,
  ];

  let ext = "";
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "string") continue;
    const foundExt = getExtension(candidate);
    if (foundExt) {
      ext = foundExt;
      break;
    }
  }

  if (!ext) {
    const mimeCandidate =
      file?.rawFile?.type ||
      file?.mimeType ||
      file?.contentType ||
      file?.type;
    if (mimeCandidate && typeof mimeCandidate === "string") {
      ext = getExtensionFromMime(mimeCandidate);
    }
  }

  const isDoc = ["doc", "docx"].includes(ext);
  const isExcel = ["xls", "xlsx"].includes(ext);
  const isPpt = ["ppt", "pptx"].includes(ext);
  const isOtherOffice = isPpt;
  const isBrowserFile = ["pdf", "jpeg", "jpg", "png", "gif", "webp", "txt"].includes(ext);

  return { ext, isDoc, isExcel, isPpt, isOtherOffice, isBrowserFile };
}

export function useFilePreview() {
  const toast = useToast();

  const { verificationResult } = useSelector((state) => state.digitalSignatureFile || {});

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewFileName, setPreviewFileName] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const handlePreview = useCallback(
    async (file) => {
      if (!file) return;

      const fileName = file.fileName || file.name || file.file_name || "file";
      let flags = resolveFileTypeFlags(file);

      // Handle rawFile (client-side File before saving)
      if (file.rawFile instanceof File && !file._id) {
        setIsPreviewLoading(true);
        try {
          if (flags.isDoc || flags.isExcel) {
            const formData = new FormData();
            formData.append("file", file.rawFile);

            let urlEndpoint = flags.isDoc ? `${APP_BASE}/api/file-to-pdf` : API_XLSX_TO_PDF;

            const response = await api.post(urlEndpoint, formData, {
              responseType: "blob",
              timeout: 0,
            });

            const pdfBlob = new Blob([response.data], {
              type: "application/pdf",
            });
            setPreviewUrl(URL.createObjectURL(pdfBlob));
            setPreviewFileName(fileName);
            setPreviewOpen(true);
            return;
          }
          if (flags.isOtherOffice) {
            const arrayBuffer = await file.rawFile.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: "array" });
            const htmlString = XLSX.utils.sheet_to_html(
              workbook.Sheets[workbook.SheetNames[0]]
            );
            const htmlBlob = new Blob([htmlString], { type: "text/html" });
            setPreviewUrl(URL.createObjectURL(htmlBlob));
            setPreviewFileName(fileName);
            setPreviewOpen(true);
            return;
          }
          if (flags.isBrowserFile) {
            const blobUrl = URL.createObjectURL(file.rawFile);
            setPreviewUrl(blobUrl);
            setPreviewFileName(fileName);
            setPreviewOpen(true);
            return;
          }
          toast("Định dạng không hỗ trợ xem trước khi chưa lưu.", "warning");
        } catch (e) {
					logger.log("Lỗi ko xem được file", e)
          const status = e?.response?.status || e?.status;
          if (status === 403) {
            toast("Bạn không có quyền xem tài liệu này.", "error");
          } else {
            toast("Không thể xem trước file này.", "error");
          }
        } finally {
          setIsPreviewLoading(false);
        }
        return;
      }

      // Handle saved file by ID
      if (file._id || file.id) {
        setIsPreviewLoading(true);
        const fileId = file._id || file.id;

        try {
          let blob;
          let previewName = fileName;

          // If flags are known upfront
          if (flags.isDoc) {
            let conversionApi = `${APP_BASE}/api/doc-url-to-pdf?id=${fileId}`;
            if (file.href && file.href.includes("?")) {
              const query = file.href.split("?")[1];
              conversionApi = `${conversionApi}&${query}`;
            }
            const res = await api.get(conversionApi, {
              responseType: "blob",
              timeout: 0,
            });
            blob = new Blob([res.data], { type: "application/pdf" });
          } else if (flags.isExcel) {
            let downloadUrl = `${APP_BASE}/api/files/download/${fileId}`;
            if (file.href && file.href.includes("?")) {
              const query = file.href.split("?")[1];
              downloadUrl = `${downloadUrl}?${query}`;
            }
            const fileRes = await api.get(downloadUrl, {
              responseType: "blob",
              timeout: 0,
            });

            let safeFileName = fileName;
            if (flags.ext && !safeFileName.toLowerCase().endsWith(`.${flags.ext}`)) {
              safeFileName = `${safeFileName}.${flags.ext}`;
            }
            const formData = new FormData();
            formData.append("file", new File([fileRes.data], safeFileName));
            formData.append("fileId", fileId);

            const res = await api.post(API_XLSX_TO_PDF, formData, {
              responseType: "blob",
              timeout: 0,
            });

            blob = new Blob([res.data], { type: "application/pdf" });
          } else if (flags.isBrowserFile) {
            let viewUrl = `${APP_BASE}/api/files/view/${fileId}`;
            if (file.href && file.href.includes("?")) {
              const query = file.href.split("?")[1];
              viewUrl = `${viewUrl}?${query}`;
            }
            const res = await api.get(viewUrl, {
              responseType: "blob",
              timeout: 100000,
            });
            blob = new Blob([res.data], {
              type: res.headers["content-type"] || res.data.type,
            });
          } else if (flags.isOtherOffice) {
            let viewUrl = `${APP_BASE}/api/files/view/${fileId}`;
            if (file.href && file.href.includes("?")) {
              const query = file.href.split("?")[1];
              viewUrl = `${viewUrl}?${query}`;
            }
            const res = await api.get(viewUrl, {
              responseType: "blob",
              timeout: 100000,
            });
            const arrayBuffer = await res.data.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: "array" });
            const html = XLSX.utils.sheet_to_html(
              workbook.Sheets[workbook.SheetNames[0]]
            );
            blob = new Blob([html], { type: "text/html" });
          } else {
            // Fallback: If format could not be determined from initial metadata, fetch via viewUrl and inspect response headers
            let viewUrl = `${APP_BASE}/api/files/view/${fileId}`;
            if (file.href && file.href.includes("?")) {
              const query = file.href.split("?")[1];
              viewUrl = `${viewUrl}?${query}`;
            }
            const res = await api.get(viewUrl, {
              responseType: "blob",
              timeout: 100000,
            });

            const dispositionFilename = getFilenameFromContentDisposition(res.headers["content-disposition"]);
            const contentType = res.headers["content-type"];

            const detectedExt = getExtension(dispositionFilename) || getExtensionFromMime(contentType);
            const dynamicFlags = resolveFileTypeFlags(file, detectedExt);

            if (dynamicFlags.isDoc) {
              let conversionApi = `${APP_BASE}/api/doc-url-to-pdf?id=${fileId}`;
              const convRes = await api.get(conversionApi, {
                responseType: "blob",
                timeout: 0,
              });
              blob = new Blob([convRes.data], { type: "application/pdf" });
            } else if (dynamicFlags.isExcel) {
              let safeFileName = fileName;
              if (dynamicFlags.ext && !safeFileName.toLowerCase().endsWith(`.${dynamicFlags.ext}`)) {
                safeFileName = `${safeFileName}.${dynamicFlags.ext}`;
              }
              const formData = new FormData();
              formData.append("file", new File([res.data], safeFileName));
              formData.append("fileId", fileId);

              const convRes = await api.post(API_XLSX_TO_PDF, formData, {
                responseType: "blob",
                timeout: 0,
              });
              blob = new Blob([convRes.data], { type: "application/pdf" });
            } else if (dynamicFlags.isOtherOffice) {
              const arrayBuffer = await res.data.arrayBuffer();
              const workbook = XLSX.read(arrayBuffer, { type: "array" });
              const html = XLSX.utils.sheet_to_html(
                workbook.Sheets[workbook.SheetNames[0]]
              );
              blob = new Blob([html], { type: "text/html" });
            } else {
              // Default to viewing as blob
              blob = new Blob([res.data], {
                type: contentType || res.data.type || "application/pdf",
              });
            }
          }

          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          setPreviewFileName(previewName);
          setPreviewOpen(true);
        } catch (e) {
          logger.log("Lỗi không xem được file", e);
          const status = e?.response?.status || e?.status;
          if (status === 403) {
            toast("Bạn không có quyền xem tài liệu này.", "error");
          } else {
            toast("Không thể xem trước tài liệu.", "error");
          }
        } finally {
          setIsPreviewLoading(false);
        }
        return;
      }
      toast("Không xác định được nguồn file để xem trước.", "error");
    },
    [toast]
  );

  const handleClosePreview = useCallback(() => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewOpen(false);
    setPreviewUrl(null);
  }, [previewUrl]);

  return {
    previewOpen,
    previewUrl,
    previewFileName,
    isPreviewLoading,
    verificationResult,
    handlePreview,
    handleClosePreview,
  };
}
