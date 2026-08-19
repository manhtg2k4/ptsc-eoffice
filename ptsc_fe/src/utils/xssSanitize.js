/**
 * XSS Sanitization Utility
 * Prevents Cross-Site Scripting (XSS) attacks through properly configured HTML sanitization
 *
 * This module provides:
 * 1. Whitelist-based HTML tag filtering (only safe tags allowed)
 * 2. URL scheme validation (only http/https allowed)
 * 3. Blocking of dangerous attributes (on* event handlers)
 * 4. CSP meta tag for browser-level XSS protection
 */

import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";

/**
 * Whitelist of allowed HTML tags
 * Only basic formatting, structural, and content tags are permitted
 */
const ALLOWED_TAGS = [
  "b", "i", "em", "strong", "u", "p", "br", "a",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "code", "pre",
  "span", "div",
  "table", "thead", "tbody", "tr", "th", "td",
  "sup", "sub"
];

/**
 * Whitelist of allowed attributes per tag
 * Only safe attributes are permitted
 */
const ALLOWED_ATTR = ["href", "target", "rel", "src", "alt", "title", "class"];

/**
 * Dangerous tags that should never be allowed
 */
const FORBID_TAGS = [
  "script", "style", "iframe", "object", "embed",
  "svg", "math", "meta", "base", "form", "input",
  "textarea", "select", "button", "link", "noscript"
];

/**
 * Dangerous attribute patterns - all attributes starting with "on" are blocked
 * This prevents event handler based XSS attacks
 */
const FORBID_ATTR = [
  "onerror", "onclick", "onload", "onmouseover", "onfocus",
  "onblur", "onchange", "onsubmit", "onkeydown", "onkeyup",
  "onkeypress", "onscroll", "onresize", "onabort", "onunload",
  "onfocus", "onblur", "onchange", "onclick",
  "ondblclick", "ondrag", "ondragend", "ondragenter", "ondragleave",
  "ondragover", "ondragstart", "ondrop", "onfocus", "onhashchange",
  "oninput", "oninvalid", "onload", "onloadstart", "onmousedown",
  "onmousemove", "onmouseout", "onmouseover", "onmouseup", "onmousewheel",
  "onoffline", "ononline", "onpagehide", "onpageshow", "onpopstate",
  "onprogress", "onratechange", "onreset", "onresize", "onscroll",
  "onsearch", "onseeked", "onseeking", "onselect", "onstalled", "onstorage",
  "onsubmit", "onsuspend", "ontimeupdate", "ontoggle", "onunload",
  "onvolumechange", "onwaiting", "onwheel", "onauxclick", "oncontextmenu",
  "oncopy", "oncut", "onpaste", "onended", "onended", "onfullscreenchange",
  "onfullscreenerror", "ongotpointercapture", "onlostpointercapture",
  "onpointercancel", "onpointerdown", "onpointerenter", "onpointerleave",
  "onpointermove", "onpointerout", "onpointerover", "onpointerup",
  "onwheel"
];

/**
 * Normalize URL by removing control characters and normalizing whitespace
 * @param {string} url - The URL to normalize
 * @returns {string} Normalized URL
 */
function normalizeUrl(url) {
  if (typeof url !== "string") return "";

  return url
  // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

/**
 * Check if a URL uses a safe protocol (http or https only)
 * Prevents javascript:, data:, and vbscript: URL attacks
 * @param {string} url - The URL to validate
 * @returns {boolean} True if URL is safe
 */
function isSafeUrl(url) {
  if (!url || typeof url !== "string") return false;

  let cleaned = normalizeUrl(url);

  // Check for dangerous protocols (common XSS vectors)
  if (cleaned.startsWith("javascript:")) return false;
  if (cleaned.startsWith("data:")) return false;
  if (cleaned.startsWith("vbscript:")) return false;

  let parsed;
  try {
    parsed = new URL(cleaned);
  } catch {
    // If URL parsing fails, check if it's a relative path
    if (cleaned.startsWith("/") && !cleaned.startsWith("//")) return true;
    return false;
  }

  // Only allow http and https protocols
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

/**
 * Configure DOMPurify with strict security settings
 */
const DEFAULT_DOMPURIFY_CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  FORBID_TAGS,
  FORBID_ATTR,
  ADD_ATTR: ["target", "rel"],
  ALLOW_DATA_ATTR: false,
  FORCE_BODY: false,
  ALLOW_ARIA_ATTR: false
};

// Configure DOMPurify defaults
DOMPurify.setConfig(DEFAULT_DOMPURIFY_CONFIG);

/**
 * Add hook to additionally validate URLs after DOMPurify processing
 */
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  // Validate href attribute on anchor tags
  if (node.tagName === "A" && node.hasAttribute("href")) {
    const href = node.getAttribute("href");
    if (!isSafeUrl(href)) {
      node.removeAttribute("href");
    } else {
      // Add security attributes to external links
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  }

  // Validate src attribute on media tags
  if (node.hasAttribute("src")) {
    const src = node.getAttribute("src");
    if (!isSafeUrl(src)) {
      node.removeAttribute("src");
    }
  }
});

/**
 * Sanitize HTML content with comprehensive XSS protection
 * @param {string} dirty - The potentially dangerous HTML
 * @param {object} options - Optional DOMPurify options to override defaults
 * @returns {string} Sanitized HTML safe for rendering
 */
function sanitizeHtml(dirty, options = {}) {
  if (!dirty || typeof dirty !== "string") {
    return "";
  }

  // Merge default options with any provided overrides
  const mergeOptions = { ...DEFAULT_DOMPURIFY_CONFIG, ...options };

  // DOMPurify sanitization - first pass
  let clean = DOMPurify.sanitize(dirty, mergeOptions);

  // Second pass: Additional URL validation using JSDOM
  try {
    const window = new JSDOM("").window;
    const doc = window.document;
    doc.body.innerHTML = clean;

    // Validate all anchor tags
    doc.querySelectorAll("a").forEach(a => {
      const href = a.getAttribute("href");
      if (href && !isSafeUrl(href)) {
        // Replace dangerous link with just text content
        a.replaceWith(doc.createTextNode(a.textContent || ""));
      }
    });

    // Validate src attributes on all elements
    doc.querySelectorAll("[src]").forEach(el => {
      const src = el.getAttribute("src");
      if (src && !isSafeUrl(src)) {
        el.removeAttribute("src");
      }
    });

    clean = doc.body.innerHTML;
  } catch {
    // If JSDOM processing fails, return DOMPurify output only
    return clean;
  }

  return clean;
}

/**
 * CSP Header configuration for HTTP response headers
 * Content-Security-Policy header to instruct browsers to block XSS
 */
const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'none'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join("; ");

/**
 * Generate CSP meta tag for HTML head
 * Note: For full XSS protection, CSP should be set via HTTP headers on the server
 * @returns {string} CSP meta tag string
 */
function getCspMetaTag() {
  return `<meta http-equiv="Content-Security-Policy" content="${CSP_HEADER}">`;
}

export {
  sanitizeHtml,
  isSafeUrl,
  normalizeUrl,
  getCspMetaTag,
  CSP_HEADER,
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  FORBID_TAGS,
  FORBID_ATTR,
  DEFAULT_DOMPURIFY_CONFIG
};

export default sanitizeHtml;
