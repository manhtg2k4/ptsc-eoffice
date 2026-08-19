import DOMPurify from "dompurify";

/**
 * Encode HTML to prevent execution (XSS) by escaping special characters.
 * Useful for displaying raw HTML as text or safe rendering in templates.
 */
export const encodeHTML = (str) => {
  if (typeof str !== "string") return "";
  const cleanStr = DOMPurify.sanitize(str);
  return cleanStr.replace(/[&<>"']/g, (m) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[m];
  });
};

export const escapeHtml = (str) => {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "")
    .replace(/</g, "")
    .replace(/>/g, "")
    .replace(/"/g, "")
    .replace(/'/g, "");
};

export const isCommentRequestUrl = (url = "") => {
  const normalizedUrl = String(url || "");
  return /(^|\/)api\/(documents\/[^/?#]+\/comments|task\/[^/?#]+\/comments|meeting-task\/[^/?#]+\/comments|comments)(?:[/?#]|$)/.test(normalizedUrl);
};

export const escapeCommentRequestData = (data, url, method = "") => {
  const normalizedMethod = String(method || "").toLowerCase();
  if (!["post", "put", "patch"].includes(normalizedMethod) || !isCommentRequestUrl(url)) {
    return data;
  }

  if (!data || typeof data !== "object" || data instanceof FormData) {
    return data;
  }

  if (typeof data.content !== "string") {
    return data;
  }

  return {
    ...data,
    content: escapeHtml(data.content),
  };
};
/**
 * Sanitize HTML based on a strict whitelist by default.
 * Follows the pattern from the provided app (1).js sample.
 */
export const sanitizeHtml = (html, customConfig = {}) => {
  if (!html) return "";

  const defaultConfig = {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "u", "p", "br", "a"],
    ALLOWED_ATTR: ["href", "target", "rel", "title"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "svg", "math"],
    FORBID_ATTR: ["onerror", "onclick", "onload", "onmouseover", "onfocus"],
  };

  return DOMPurify.sanitize(html, { ...defaultConfig, ...customConfig });
};
