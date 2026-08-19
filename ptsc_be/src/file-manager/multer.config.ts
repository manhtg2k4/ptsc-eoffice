import { diskStorage, memoryStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';

const allowedFileTypes: Record<string, string[]> = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.gif': ['image/gif'],
  '.bmp': ['image/bmp'],
  '.webp': ['image/webp'],
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.ppt': ['application/vnd.ms-powerpoint'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  '.txt': ['text/plain'],
  '.csv': ['text/csv'],
  '.rtf': ['application/rtf', 'text/rtf'],
  '.odt': ['application/vnd.oasis.opendocument.text'],
  '.ods': ['application/vnd.oasis.opendocument.spreadsheet'],
  '.odp': ['application/vnd.oasis.opendocument.presentation'],
  '.svg': ['image/svg+xml'],
  '.bpmn': ['application/xml', 'text/xml', 'application/octet-stream'],
  '.mp4': ['video/mp4'],
  '.mov': ['video/quicktime'],
  '.avi': ['video/x-msvideo'],
  '.mkv': ['video/x-matroska'],
  '.webm': ['video/webm', 'audio/webm'],
  '.zip': ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
  '.rar': [
    'application/x-rar-compressed',
    'application/vnd.rar',
    'application/x-rar',
    'application/rar',
    'application/x-compressed',
    'application/octet-stream',
  ],
  '.7z': ['application/x-7z-compressed', 'application/x-7z', 'application/octet-stream'],
};

const allowedExtensions = Object.keys(allowedFileTypes);
const allowedMimeTypes = Array.from(new Set(Object.values(allowedFileTypes).flat()));

export function decodeOriginalName(originalname: string): string {
  try {
    // If the string already contains characters beyond Latin1 range, assume it's correctly decoded.
    for (let i = 0; i < originalname.length; i++) {
      if (originalname.charCodeAt(i) > 255) {
        return originalname;
      }
    }
    // Convert the raw latin1 bytes to a Buffer and decode as UTF-8.
    const buf = Buffer.from(originalname, 'latin1');
    const decoder = new TextDecoder('utf-8', { fatal: true });
    return decoder.decode(buf);
  } catch (e) {
    // If decoding fails, fall back to original name.
    return originalname;
  }
}

function unsupportedTypeError(originalname: string): BadRequestException {
  return new BadRequestException(`Định dạng file ${originalname} không hợp lệ.`);
}

function validateFileType(
  file: Pick<Express.Multer.File, 'originalname' | 'mimetype'>,
): string {
  const decodedName = decodeOriginalName(file.originalname);
  const extension = extname(decodedName).toLowerCase();
  const allowedMimesForExtension = allowedFileTypes[extension];

  if (!extension || !allowedMimesForExtension) {
    throw unsupportedTypeError(decodedName);
  }

  const mimeType = String(file.mimetype || '').toLowerCase().trim();
  if (!mimeType || !allowedMimesForExtension.includes(mimeType)) {
    throw unsupportedTypeError(decodedName);
  }

  return decodedName;
}

const createMulterOptions = (configService: ConfigService): MulterOptions => {
  const uploadBaseDir =
    configService.get<string>('UPLOAD_DIR') ||
    path.resolve(process.cwd(), 'upload');

  return {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const clientId = req.body.clientId || 'TCSG';
        const uploadPath = path.resolve(uploadBaseDir, clientId);

        fs.promises
          .mkdir(uploadPath, { recursive: true })
          .then(() => cb(null, uploadPath))
          .catch((error) => cb(error, ''));
      },
      filename: (req, file, cb) => {
        const originalnameDecoded = decodeOriginalName(file.originalname);
        file.originalname = originalnameDecoded;

        const fileExt = extname(originalnameDecoded).toLowerCase();
        const fileName = originalnameDecoded
          .replace(fileExt, '')
          .replace(/\s+/g, '_')
          .replace(/[^\w-]/g, '');

        cb(null, `${fileName}-${uuidv4()}${fileExt}`);
      },
    }),
    limits: {
      fileSize: 10 * 1024 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
      try {
        file.originalname = validateFileType(file);
        cb(null, true);
      } catch (error) {
        cb(error as Error, false);
      }
    },
  };
};

const multerOptions: MulterOptions & { allowedMimeTypes: string[] } = {
  ...createMulterOptions(new ConfigService()),
  allowedMimeTypes,
};

const memoryMulterOptions: MulterOptions & { allowedMimeTypes: string[] } = {
  storage: memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    try {
      file.originalname = validateFileType(file);
      cb(null, true);
    } catch (error) {
      cb(error as Error, false);
    }
  },
  allowedMimeTypes,
};

export {
  multerOptions,
  memoryMulterOptions,
  allowedMimeTypes,
  allowedExtensions,
  createMulterOptions,
  validateFileType,
};
