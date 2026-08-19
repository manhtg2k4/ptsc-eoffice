import { Logger } from '@nestjs/common';
import * as DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const logger = new Logger('HtmlSanitizeUtil');

// Initialize DOMPurify with JSDOM for server-side sanitization
const window = new JSDOM('').window;
const createDOMPurify = (DOMPurify as any).default || DOMPurify;
const purify = createDOMPurify(window as any);

/**
 * Configure DOMPurify with strict whitelist-based sanitization
 * This prevents XSS by only allowing safe tags and attributes
 */
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    '#text', 'b', 'u', 'i', 'strong', 'em', 'p', 'br',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre',
    'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'sup', 'sub', 'figure', 'figcaption',
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'style', 'target', 'rel'],
  FORBID_TAGS: [
    'script', 'style', 'meta', 'base', 'iframe', 'object', 'embed',
    'form', 'input', 'textarea', 'select', 'button', 'link', 'noscript', 'svg', 'math',
  ],
  FORBID_ATTR: [],
  KEEP_CONTENT: false,
  ADD_ATTR: ['target', 'rel'],
  ALLOW_DATA_ATTR: false,
  FORCE_BODY: false,
  ALLOW_ARIA_ATTR: false,
};


const DOMPURIFY_STRIP_CONFIG = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true, // Giữ text, chỉ bỏ tags
};

// Set global config for sanitize usecase
purify.setConfig(DOMPURIFY_CONFIG);

/**
 * Hook to validate URLs after sanitization
 * Blocks javascript:, data: (except images), and other dangerous protocols
 */
purify.addHook('afterSanitizeAttributes', (node) => {
  // Validate href - only allow http/https
  if (node.getAttribute('href')) {
    const href = node.getAttribute('href') || '';
    if (href && !/^https?:\/\//i.test(href)) {
      node.removeAttribute('href');
    }
  }

  // Validate src - only allow http/https/data for images
  if (node.getAttribute('src')) {
    const src = node.getAttribute('src') || '';
    if (src && !/^https?:\/\//i.test(src) && !/^data:image\//i.test(src)) {
      node.removeAttribute('src');
    }
  }

  // Remove all event handlers (onclick, onerror, etc.)
  const attributes = node.attributes;
  if (attributes) {
    for (let i = attributes.length - 1; i >= 0; i--) {
      const attr = attributes[i];
      if (/^on/i.test(attr.name)) {
        node.removeAttribute(attr.name);
      }
    }
  }
});

// ─────────────────────────────────────────────
// EXPORTED FUNCTIONS
// ─────────────────────────────────────────────

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  try {
    return purify.sanitize(html, DOMPURIFY_CONFIG);
  } catch (error) {
    logger.error(`[sanitizeHtml] Error: ${error.message}`);
    return '';
  }
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  try {
    return purify.sanitize(html, DOMPURIFY_STRIP_CONFIG).trim();
  } catch (error) {
    logger.error(`[stripHtml] Error: ${error.message}`);
    return '';
  }
}

export function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '')
    .replace(/</g, '')
    .replace(/>/g, '')
    .replace(/"/g, '')
    .replace(/'/g, '');
    // .replace(/&/g, '&amp;')
    // .replace(/</g, '&lt;')
    // .replace(/>/g, '&gt;')
    // .replace(/"/g, '&quot;')
    // .replace(/'/g, '&#x27;');
}

export function encodeHTML(text?: string | null): string {
  if (!text) return '';

  try {
    return text
      // remove html tags completely
      .replace(/<[^>]*>/g, ' ')

      // remove special characters
      .replace(/[^\p{L}\p{N}\s_-]/gu, '')

      // normalize spaces
      .replace(/\s+/g, ' ')
      .trim();
  } catch (error: any) {
    logger.error(`[encodeHTML] Error: ${error.message}`);
    return '';
  }
}