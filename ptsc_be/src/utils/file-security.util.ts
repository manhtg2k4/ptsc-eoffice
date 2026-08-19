import { BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';
import * as fontkit from '@pdf-lib/fontkit';
import * as DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const logger = new Logger('FileSecurityUtil');

// Initialize DOMPurify for XML/SVG sanitization
const window = new JSDOM('').window;
const createDOMPurify = (DOMPurify as any).default || DOMPurify;
const purify = createDOMPurify(window as any);

// Configure DOMPurify for XML/SVG sanitization
const XML_DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'b', 'u', 'i', 'strong', 'em', 'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre', 'span', 'div',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'sup', 'sub', 'figure', 'figcaption',
    'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
    'text', 'tspan', 'defs', 'clipPath', 'use', 'image', 'linearGradient', 'radialGradient', 'stop'
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'style', 'target', 'rel', 'x', 'y', 'width', 'height', 'viewBox', 'd', 'fill', 'stroke', 'stroke-width', 'cx', 'cy', 'r', 'points', 'transform', 'font-family', 'font-size', 'text-anchor', 'xlink:href'],
  FORBID_TAGS: ['script', 'meta', 'base', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button', 'link', 'noscript'],
  FORBID_ATTR: [],
  KEEP_CONTENT: false,
  ADD_ATTR: ['target', 'rel'],
  ALLOW_DATA_ATTR: false,
  FORCE_BODY: false,
  ALLOW_ARIA_ATTR: false,
};

// Hook để loại bỏ thuộc tính nguy hiểm và event handlers
purify.addHook('afterSanitizeAttributes', (node) => {
  // Validate href - chỉ cho phép http/https
  if (node.getAttribute('href')) {
    const href = node.getAttribute('href') || '';
    if (href && !/^https?:\/\//i.test(href)) {
      node.removeAttribute('href');
    }
  }

  // Validate src
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

purify.setConfig(XML_DOMPURIFY_CONFIG);

export const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.csv', '.rtf', '.odt', '.ods', '.odp',
  '.svg', '.bpmn', '.xml', '.html', '.mp4', '.mov', '.avi', '.mkv', '.webm',
  '.zip', '.rar', '.7z'
];

const MIME_MAP: Record<string, string[]> = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.gif': ['image/gif'],
  '.webp': ['image/webp'],
  '.bmp': ['image/bmp'],
  '.pdf': ['application/pdf'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/zip'],
  '.mp4': ['video/mp4'],
  '.mov': ['video/quicktime'],
  '.avi': ['video/x-msvideo'],
  '.mkv': ['video/x-matroska'],
  '.webm': ['video/webm', 'audio/webm'],
  '.zip': ['application/zip', 'application/x-zip-compressed'],
  '.rar': ['application/x-rar-compressed', 'application/vnd.rar'],
  '.7z': ['application/x-7z-compressed'],
};

const ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
  'application/pdf', 'image/svg+xml',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv', 'application/rtf', 'text/rtf',
  'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.spreadsheet', 'application/vnd.oasis.opendocument.presentation',
  'application/xml', 'text/xml', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm', 'audio/webm',
  'application/zip', 'application/x-zip-compressed', 'application/x-cfb',
  'application/x-rar-compressed', 'application/vnd.rar', 'application/x-7z-compressed'
];

/**
 * Lớp bảo mật 1: Kiểm tra phần mở rộng và nội dung thực (Magic Bytes)
 */
export async function validateFileSecurity(file: Express.Multer.File) {
  const ext = path.extname(file.originalname).toLowerCase();

  // 1. Kiểm tra Extension (Whitelist)
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new BadRequestException(`Định dạng file ${ext} không được hỗ trợ.`);
  }

  // 2. Kiểm tra nội dung thực tế bằng file-type
  try {
    // Dynamic import cho file-type (ESM-only package)
    const { fileTypeFromFile, fileTypeFromBuffer } = await (eval('import("file-type")') as Promise<typeof import('file-type')>);

    let type: { mime: string; ext: string } | undefined = undefined;
    if (file.path && fs.existsSync(file.path)) {
      type = await fileTypeFromFile(file.path);
    } else if (file.buffer) {
      type = await fileTypeFromBuffer(file.buffer);
    }

    if (type) {
      // Nếu file-type nhận diện được, nó phải nằm trong danh sách Mime cho phép
      if (!ALLOWED_MIMES.includes(type.mime)) {
        if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        throw new BadRequestException(`Nội dung file (${type.mime}) không được phép.`);
      }

      // Kiểm tra tính nhất quán
      // const expectedMimes = MIME_MAP[ext];
      // if (expectedMimes && !expectedMimes.includes(type.mime)) {
      //   if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      //   throw new BadRequestException(`Nội dung file không khớp với phần mở rộng ${ext}.`);
      // }
    } else {
      // Nếu file-type KHÔNG nhận diện được, mà extension lại là các loại file bắt buộc có magic bytes
      const mustHaveMagicBytes = Object.keys(MIME_MAP);
      if (mustHaveMagicBytes.includes(ext)) {
        if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        throw new BadRequestException(`File ${ext} không hợp lệ (không tìm thấy chữ ký định dạng).`);
      }
    }
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    logger.error(`Lỗi kiểm tra file-type: ${error.message}`);
    if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new InternalServerErrorException(`Hệ thống không thể xác thực nội dung file.`);
  }
}

/**
 * Lớp bảo mật 2: Chặn mã độc (Blocking) và Làm sạch nội dung (Sanitization)
 */
export async function sanitizeFileContent(file: Express.Multer.File) {
  const ext = path.extname(file.originalname).toLowerCase();

  const riskyExtensions = [
    '.svg', '.bpmn', '.xml', '.html', '.pdf',
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.txt', '.csv', '.rtf'
  ];

  if (!riskyExtensions.includes(ext)) return;

  try {
    const buffer = file.buffer || (file.path ? await fsp.readFile(file.path) : null);
    if (!buffer) return;

    // const contentStr = buffer.toString('binary');

    // --- LỚP 1: CHẶN (BLOCKING) ---

    // 1. Kiểm tra Scripts/XSS trong các file dạng văn bản
    // if (['.svg', '.bpmn', '.xml', '.html', '.txt', '.csv', '.rtf'].includes(ext)) {
    //   const contentUtf8 = buffer.toString('utf8');
    //   const hasScript = /<script[\s\S]*?<\/script>/gi.test(contentUtf8);
    //   const hasEvent = /\s+on[a-z]+\s*=\s*(["'])(?:(?!\1).)*\1/gi.test(contentUtf8);
    //   const hasJSLink = /href\s*=\s*(["'])\s*javascript:[^"']*\1/gi.test(contentUtf8);

    //   if (hasScript || hasEvent || hasJSLink) {
    //     if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    //     throw new BadRequestException(`File ${ext} bị từ chối do chứa mã thực thi nguy hiểm.`);
    //   }
    // }

    // 2. Kiểm tra mã thực thi trong PDF
    // if (ext === '.pdf') {
    //   if (contentStr.includes('/JS') || contentStr.includes('/JavaScript') || contentStr.includes('/OpenAction')) {
    //     if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    //     throw new BadRequestException('File PDF bị từ chối do chứa mã thực thi (Scripts/OpenAction).');
    //   }
    // }

    // 3. Kiểm tra Macro trong Office
    // if (['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'].includes(ext)) {
    //   if (contentStr.includes('vbaProject.bin') || contentStr.includes('VBA')) {
    //     if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    //     throw new BadRequestException(`File Office (${ext}) bị từ chối do chứa Macro tiềm ẩn nguy hiểm.`);
    //   }
    // }

    // --- LỚP 2: LÀM SẠCH (SANITIZATION) ---

    if (ext === '.pdf') {
      await sanitizePdf(file, buffer);
    } else if (ext === '.svg' || ext === '.bpmn' || ext === '.xml') {
      await sanitizeXmlContent(file, buffer.toString('utf8'));
    }
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    logger.error(`Lỗi khi kiểm tra nội dung file ${file.originalname}: ${error.message}`);
    if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new BadRequestException(`Hệ thống không thể xác thực nội dung file ${ext}.`);
  }
}

/**
 * Sanitize XML/SVG content using DOMPurify with whitelist-based approach
 * Also strips DOCTYPE to prevent XXE attacks
 */
async function sanitizeXmlContent(file: Express.Multer.File, content: string) {
  try {
    // Step 1: Strip DOCTYPE to prevent XXE attacks
    let sanitized = content.replace(/<!DOCTYPE[\s\S]*?>/gi, '');

    // Step 2: Use DOMPurify to remove XSS vectors
    try {
      sanitized = purify.sanitize(sanitized, XML_DOMPURIFY_CONFIG);
    } catch (purifyError) {
      logger.warn(`DOMPurify sanitization failed, using fallback: ${purifyError.message}`);
      // Fallback to basic regex-based sanitization if DOMPurify fails
      sanitized = sanitized
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/\s+on[a-z]+\s*=\s*(["'])(?:(?!\1).)*\1/gi, '')
        .replace(/href\s*=\s*(["'])\s*javascript:(?:(?!\1).)*\1/gi, 'href="#"')
        .replace(/xlink:href\s*=\s*(["'])\s*javascript:(?:(?!\1).)*\1/gi, 'xlink:href="#"')
        .replace(/<\?xml-stylesheet[\s\S]*?\?>/gi, '')
        .replace(/<!ENTITY[\s\S]*?>/gi, '');
    }

    if (file.path) {
      await fsp.writeFile(file.path, sanitized, 'utf8');
    } else {
      file.buffer = Buffer.from(sanitized, 'utf8');
    }
  } catch (error) {
    logger.error(`Lỗi khi sanitize XML (SVG/BPMN): ${error.message}`);
    throw new BadRequestException('Không thể xử lý file XML.');
  }
}

async function sanitizePdf(file: Express.Multer.File, data: Buffer) {
  try {
    const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
    pdfDoc.registerFontkit(fontkit);
    const sanitizedPdfBytes = await pdfDoc.save();

    if (file.path) {
      await fsp.writeFile(file.path, sanitizedPdfBytes);
    } else {
      file.buffer = Buffer.from(sanitizedPdfBytes);
    }
  } catch (error) {
    logger.error(`Lỗi khi sanitize PDF: ${error.message}`);
    throw new BadRequestException('Không thể xử lý file PDF.');
  }
}

