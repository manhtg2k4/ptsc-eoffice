import axios from "axios";
import { APP_BASE_SIGN_USB_TOKEN } from "@EnvironmentFile/constants/urlConfig";

/**
 * Call USB Token signing service directly from FE
 * @param {Object} params
 * @param {Blob|ArrayBuffer} params.fileBuffer - PDF file buffer
 * @param {string} params.filename - File name
 * @param {string} params.mimeType - MIME type (application/pdf)
 * @param {string} params.username - Username for USB token
 * @param {string} params.password - Pin code for USB token
 * @param {string} params.reason - Reason for signing
 * @param {string} params.location - Location
 * @param {string} params.signatureLevel - Signature level (B, A, ...)
 * @param {string} params.type - Sign type: signContentDraft, signFormatDraft, reportSigner, stampDoc, signCopy
 * @param {Object} params.options - Additional options (keyword, qrPath, imageMetadata, base64Image, etc.)
 * @param {string} params.tokenSigning - Token signing from auth
 * @param {string} params.token - Auth token
 * @param {string} params.serviceId - Service ID
 * @returns {Promise<{data: ArrayBuffer, headers: Object}>}
 */
function getInitialSignatureKeyword(keyword) {
  const normalizedKeyword = (keyword || "").trim();
  return normalizedKeyword;
}
export async function signWithUSBToken({
  fileBuffer,
  filename,
  mimeType,
  username,
  password,
  reason,
  location,
  signatureLevel,
  type,
  options = {},
  tokenSigning,
  token,
  serviceId,
}) {
  const formData = new FormData();

  // Add file
  const buffer = fileBuffer instanceof Blob ? fileBuffer : new Blob([fileBuffer], { type: mimeType || "application/pdf" });
  formData.append("file", buffer, filename);

  // Add required fields
  formData.append("username", username);
  formData.append("password", password);
  formData.append("reason", reason || "Ký số điện tử");
  formData.append("location", location || "Việt Nam");
  formData.append("signatureLevel", signatureLevel || "B");
  if (options.qrPart !== undefined && options.qrPart !== null) {
    formData.append("qrPart", options.qrPart);
  }
  if (options.qrPath !== undefined && options.qrPath !== null) {
    formData.append("qrPath", options.qrPath);
  }

  // Determine URL based on type
  let url;
  const trimmedType = type?.trim();

  if (["signContentDraft", "reportSigner", "stampDoc", "signCopy", "officialSigner1", "officialSigner2", "officialSigner3"].includes(trimmedType)) {
    url = `${APP_BASE_SIGN_USB_TOKEN}/api/desktop/document-with-image`;

    if (options.keyword) {
      const imageMetadata = [
        {
          keyWord: options.keyword || "",
          imagesBase: options.imageSign || "",
          width: options.width || 80,
          height: options.height || 50,
        },
      ];
      formData.append("imageMetadata", JSON.stringify(imageMetadata));
    }
  } else if (trimmedType === "signFormatDraft") {
    url = `${APP_BASE_SIGN_USB_TOKEN}/api/desktop/document-initial-signature`;

    const initialKeyword = getInitialSignatureKeyword(options.keyword);
    if (initialKeyword) {
      formData.append("keyword", initialKeyword);
    }
    if (options.imageSign) {
      formData.append("base64Image", options.imageSign);
    }
  } else {
    throw new Error(`Invalid sign type: ${type}`);
  }

  const response = await axios.post(url, formData, {
    headers: {
      ...(tokenSigning && { "Token-signing": tokenSigning }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(serviceId && { "X-Service-Id": serviceId }),
    },
    withCredentials: true,
    responseType: "arraybuffer",
    timeout: 120000,
  });

  return {
    data: response.data,
    headers: response.headers,
  };
}

/**
 * Helper to convert ArrayBuffer/Blob to Base64 string
 * @param {Blob|ArrayBuffer} data
 * @returns {Promise<string>}
 */
export async function arrayBufferToBase64(data) {
  let arrayBuffer;
  if (data instanceof Blob) {
    arrayBuffer = await data.arrayBuffer();
  } else {
    arrayBuffer = data;
  }
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Helper to extract filename from content-disposition header
 * @param {string} contentDisposition
 * @returns {string|null}
 */
export function getFileNameFromHeader(contentDisposition) {
  if (!contentDisposition) return null;
  const match = contentDisposition.match(/filename[^;=\n]*=(?:(['"]).*?\1|[^;\n]*)/);
  if (match && match[0]) {
    return match[0].replace(/filename[^=]*=/, "").replace(/['"]/g, "").split("\\").pop();
  }
  return null;
}
