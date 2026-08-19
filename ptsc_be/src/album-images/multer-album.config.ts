import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { extname } from 'path';
import { decodeOriginalName } from '../file-manager/multer.config';
import { v4 as uuidv4 } from 'uuid';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

// Chỉ cho phép upload ảnh
const allowedImageMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/apng',
  'image/tiff',
];

const uploadBaseDir = path.resolve(process.cwd(), 'upload');

const multerOptionsAlbum: MulterOptions = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.resolve(uploadBaseDir, 'album-images');

      fs.promises
        .mkdir(uploadPath, { recursive: true })
        .then(() => cb(null, uploadPath))
        .catch((error) => cb(error, ''));
    },
    filename: (req, file, cb) => {
      // Fix lỗi font chữ tiếng Việt khi upload
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
    fileSize: 50 * 1024 * 1024, // 50MB max per image
  },
  fileFilter: (req, file, cb) => {
    if (allowedImageMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Định dạng file không hỗ trợ: ${file.mimetype}. Chỉ chấp nhận ảnh (JPG, PNG, GIF, WebP, BMP, SVG, HEIC, AVIF, TIFF)`), false);
    }
  },
};

// Helper function để tạo URL từ filename
const getImageUrl = (filename: string): string => {
  return `/upload/album-images/${filename}`;
};

export { multerOptionsAlbum, allowedImageMimeTypes, getImageUrl, uploadBaseDir };
