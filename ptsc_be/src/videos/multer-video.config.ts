import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { BadRequestException } from '@nestjs/common';
import { decodeOriginalName } from '../file-manager/multer.config';

// Định dạng file được phép
export const allowedImageMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
];

export const allowedVideoMimeTypes = [
    'video/mp4',
    'video/quicktime', // MOV
    'video/x-msvideo',  // AVI
    'video/webm',
    'video/x-matroska', // MKV
];

// Giới hạn dung lượng
export const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024;  // 5MB
export const MAX_VIDEO_SIZE = 1024 * 1024 * 1024;   // 1GB

// Thư mục upload
const uploadDir = join(process.cwd(), 'upload', 'videos');
const thumbnailDir = join(uploadDir, 'thumbnails');
const videoFilesDir = join(uploadDir, 'files');

// Tạo thư mục nếu chưa tồn tại
[uploadDir, thumbnailDir, videoFilesDir].forEach(dir => {
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
});

// Config cho thumbnail
export const multerThumbnailConfig = {
    storage: diskStorage({
        destination: (req, file, cb) => {
            cb(null, thumbnailDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const originalnameDecoded = decodeOriginalName(file.originalname);
            const ext = extname(originalnameDecoded);
            cb(null, `thumb-${uniqueSuffix}${ext}`);
        },
    }),
    fileFilter: (req: any, file: Express.Multer.File, cb: any) => {
        if (allowedImageMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new BadRequestException({
                success: false,
                message: 'Định dạng file không hỗ trợ!',
                errors: [{ field: 'thumbnail', message: `File "${file.originalname}" có định dạng không hỗ trợ. Chỉ chấp nhận: PNG, JPG, GIF, WEBP` }],
            }), false);
        }
    },
    limits: {
        fileSize: MAX_THUMBNAIL_SIZE,
    },
};

// Config cho video
export const multerVideoConfig = {
    storage: diskStorage({
        destination: (req, file, cb) => {
            cb(null, videoFilesDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const originalnameDecoded = decodeOriginalName(file.originalname);
            const ext = extname(originalnameDecoded);
            cb(null, `video-${uniqueSuffix}${ext}`);
        },
    }),
    fileFilter: (req: any, file: Express.Multer.File, cb: any) => {
        if (allowedVideoMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new BadRequestException({
                success: false,
                message: 'Định dạng file không hỗ trợ!',
                errors: [{ field: 'video', message: `File "${file.originalname}" có định dạng không hỗ trợ. Chỉ chấp nhận: MP4, MOV, AVI, WEBM, MKV` }],
            }), false);
        }
    },
    limits: {
        fileSize: MAX_VIDEO_SIZE,
    },
};

// Config cho cả thumbnail và video
export const multerVideoUploadConfig = {
    storage: diskStorage({
        destination: (req, file, cb) => {
            if (allowedImageMimeTypes.includes(file.mimetype)) {
                cb(null, thumbnailDir);
            } else {
                cb(null, videoFilesDir);
            }
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const originalnameDecoded = decodeOriginalName(file.originalname);
            const ext = extname(originalnameDecoded);
            const prefix = allowedImageMimeTypes.includes(file.mimetype) ? 'thumb' : 'video';
            cb(null, `${prefix}-${uniqueSuffix}${ext}`);
        },
    }),
    fileFilter: (req: any, file: Express.Multer.File, cb: any) => {
        if (allowedImageMimeTypes.includes(file.mimetype) || allowedVideoMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new BadRequestException({
                success: false,
                message: 'Định dạng file không hỗ trợ!',
                errors: [{ 
                    field: file.fieldname, 
                    message: `File "${file.originalname}" có định dạng không hỗ trợ. Ảnh chấp nhận: PNG, JPG, GIF, WEBP. Video chấp nhận: MP4, MOV, AVI, WEBM, MKV` 
                }],
            }), false);
        }
    },
};

// Helper function để lấy URL
export const getThumbnailUrl = (filename: string) => `/upload/videos/thumbnails/${filename}`;
export const getVideoUrl = (filename: string) => `/upload/videos/files/${filename}`;
