// src/files-management/files-management.service.ts

import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
  BadGatewayException,
} from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { isSuperAdminByKeycloakId } from 'src/utils/super-admin.util';
// import { Pool } from 'mysql2/promise';
import * as fsPromises from 'fs/promises'; // Import fs.promises for async file operations

// import { InjectModel } from '@nestjs/mongoose';
// import { User, UserDocument } from 'src/user/user.schema';
// import { Model } from 'mongoose';
import { InsertTextDto } from './dto/insert-text-to-pdf.dto';
import { UpdateFileLocationDto } from './dto/update-file-location.dto';
import { StandardFonts, PDFDocument, rgb, degrees } from 'pdf-lib';
import * as fontkit from '@pdf-lib/fontkit';
import { SignFileOtpDto } from './dto/sign-file-otp';
import axios from 'axios';
import { Client as MinioClient } from 'minio';
import { ConnectionPool } from 'mssql';
import * as sql from 'mssql';
import { ConfigService } from '@nestjs/config';
import { getMssqlPool } from 'src/database/mssql.pool';
import { UserEntity } from 'src/users/entities/user.entity';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PassThrough } from 'stream';
import { pipeline } from 'stream/promises';
import * as archiver from 'archiver';
import { FilesRepository } from './repositories/files.repository';
import { MinioConfigService } from 'src/utils/config-minio.util';
import { UpdateSignedDto } from 'src/Intergration-signature/dto/update-signed.dto';
import { UploadFileRemoteSingningDto } from 'src/Intergration-signature/dto/uploadFileRemoteSingningDto.dto';
import { SystemLogTaskServiceSql } from 'src/task/dto/system-log-service-sql';
import FormData = require('form-data');
import { WorkItemsService } from 'src/work-items/work-items.service';
import { isThisMonth } from 'date-fns';
import { Readable } from 'stream';
import { UploadFileDto } from './dto/upload-file.dto';
import { SignFilesOtpDto } from './dto/sign-files-otp';
import { tryParseJson } from 'src/utils/util';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);
import * as jwt from 'jsonwebtoken';
import { validateFileType } from 'src/file-manager/multer.config';
import * as sharp from 'sharp';
import { randomUUID } from 'crypto';

type ManualTextItem = {
  content: string;
  x: number;
  y: number;
  fontSize?: number;
};

type DownloadMode = 'none' | 'nostamp' | 'watermark';
type DownloadNewQuery = {
  downloadMode?: DownloadMode;
  stampX?: number;
  stampY?: number;
  stampScale?: number;
};

type DownloadNewPrepared = {
  outputBuffer?: Buffer;
  outputFilename: string;
  outputMimetype: string;
  fallbackFullPath?: string;
  fallbackFilename?: string;
  canUseFallbackDownload: boolean;
};

type SignOtpFileSource = {
  filename: string;
  mimetype: string;
  fileSize?: number;
  fullPath?: string;
  stream?: Readable;
  buffer?: Buffer;
};

@Injectable()
export class FilesManagementService {
  private readonly logger = new Logger(FilesManagementService.name);
  private uploadBase = path.join(process.cwd(), 'upload');
  private pool: ConnectionPool | null = null;
  private dbname: string;

  /** Kích thước resize cho ảnh news */
  private readonly NEWS_IMAGE_SIZES: Record<string, { width: number; height: number }> = {
    sizeSmall: { width: 150, height: 150 },
    sizeMedium: { width: 500, height: 500 },
    sizeBig: { width: 1024, height: 1024 },
  };

  /** Kiểm tra file có phải ảnh không */
  private isImageFile(mimetype: string): boolean {
    return /^image\/(jpeg|jpg|png|gif|webp|bmp|tiff)$/i.test(mimetype);
  }

  /** Normalize typeSize value */
  private normalizeNewsTypeSize(typeSize?: string): 'sizeSmall' | 'sizeMedium' | 'sizeBig' | null {
    if (!typeSize) return null;
    const normalized = typeSize.trim();
    if (['sizeSmall', 'sizeMedium', 'sizeBig'].includes(normalized)) {
      return normalized as 'sizeSmall' | 'sizeMedium' | 'sizeBig';
    }
    return null;
  }

  /**
   * Resize ảnh news thành 3 kích thước và lưu vào storage + DB,
   * sau đó cập nhật 3 trường sizeSmall/sizeMedium/sizeBig trong bảng news.
   */
  private async resizeAndUploadNewsImages(
    fileBuffer: Buffer,
    originalFileName: string,
    mimeType: string,
    objectId: string | number,
    config: any,
    useMinio: boolean,
    userId: string | undefined,
    transaction: sql.Transaction,
  ): Promise<void> {
    if (!this.isImageFile(mimeType)) return;

    const sizeFieldUpdates: Record<string, string> = {};

    for (const [sizeKey, dimensions] of Object.entries(this.NEWS_IMAGE_SIZES)) {
      try {
        // Resize ảnh (fit inside, không phóng to)
        const resizedBuffer = await (sharp as any)(fileBuffer)
          .resize(dimensions.width, dimensions.height, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .toBuffer();

        // Tạo tên file resize
        const ext = path.extname(originalFileName);
        const base = path.basename(originalFileName, ext);
        const resizedFileName = `${base}_${sizeKey}${ext}`;
        const storagePath = `TCSG/news/${Date.now()}_${resizedFileName}`;

        // Upload lên MinIO hoặc filesystem
        if (useMinio) {
          const minioClient = await this.getMinioClient(config);
          await minioClient.putObject(
            config.minio_bucket,
            storagePath,
            resizedBuffer,
            resizedBuffer.length,
          );
        } else {
          const destinationDir = path.join(this.uploadBase, 'TCSG', 'news');
          await fsPromises.mkdir(destinationDir, { recursive: true });
          await fsPromises.writeFile(
            path.join(this.uploadBase, storagePath),
            resizedBuffer,
          );
        }

        // Tạo record file trong DB
        const resizedFileId = await this.filesRepository.createFile(
          {
            file_name: resizedFileName,
            storage_type: useMinio ? 'minio' : 'filesystem',
            storage_path: storagePath,
            file_path: storagePath,
            mime_type: mimeType,
            file_size: resizedBuffer.length,
            created_by: userId,
            typeSize: sizeKey,
          },
          transaction,
        );

        // Tạo file relation
        await this.filesRepository.createFileRelation(
          {
            object_type: 'news',
            object_id: objectId,
            file_id: resizedFileId,
          },
          transaction,
        );

        sizeFieldUpdates[sizeKey] = String(resizedFileId);
        this.logger.log(
          `[resizeNewsImage] Created ${sizeKey} (${dimensions.width}x${dimensions.height}) → fileId=${resizedFileId}`,
        );
      } catch (err) {
        this.logger.error(
          `[resizeNewsImage] Failed to resize ${sizeKey}: ${err?.message || err}`,
        );
      }
    }

    // Cập nhật 3 trường size trong bảng news (ghi đè toàn bộ, kể cả NULL)
    await this.updateNewsImageSizeFields(
      objectId,
      sizeFieldUpdates,
      transaction,
    );
  }

  /**
   * Ghi đè 3 trường sizeSmall/sizeMedium/sizeBig trong bảng news.
   * Bất kỳ trường nào không có trong sizeFileIds sẽ bị set NULL.
   */
  private async updateNewsImageSizeFields(
    objectId: string | number | undefined,
    sizeFileIds: Record<string, string>,
    transaction?: sql.Transaction,
  ) {
    if (!objectId) return;

    const request = transaction
      ? new sql.Request(transaction)
      : (await this.getMsPool()).request();
    request.input('newsId', String(objectId));

    // Ghi đè toàn bộ - NULL nếu không có giá trị mới
    request.input('sizeSmall', sizeFileIds['sizeSmall'] || null);
    request.input('sizeMedium', sizeFileIds['sizeMedium'] || null);
    request.input('sizeBig', sizeFileIds['sizeBig'] || null);

    await request.query(`
      UPDATE news
      SET sizeSmall = @sizeSmall,
          sizeMedium = @sizeMedium,
          sizeBig = @sizeBig
      WHERE CAST(id AS NVARCHAR(255)) = @newsId
    `);
  }

  /**
   * Soft-delete các file resize cũ của news (typeSize = sizeSmall/sizeMedium/sizeBig)
   * để tránh lẫn lộn khi upload ảnh mới.
   */
  private async removeOldNewsResizedFiles(
    objectId: string | number,
    transaction: sql.Transaction,
  ): Promise<void> {
    try {
      const req = new sql.Request(transaction);
      req.input('objectId', String(objectId));
      // Soft-delete file relations của các file resize cũ
      await req.query(`
        UPDATE fr SET fr.status = 0
        FROM file_relations fr
        INNER JOIN files f ON f.id = fr.file_id
        WHERE fr.object_type = 'news'
          AND CAST(fr.object_id AS NVARCHAR(255)) = @objectId
          AND fr.status = 1
          AND f.typeSize IN ('sizeSmall', 'sizeMedium', 'sizeBig')
      `);
      this.logger.log(`[removeOldNewsResizedFiles] Soft-deleted old resize files for news ${objectId}`);
    } catch (err) {
      this.logger.error(
        `[removeOldNewsResizedFiles] Failed: ${err?.message || err}`,
      );
    }
  }

  private async mirrorTaskDocumentToRecurringConfigs(
    transaction: sql.Transaction,
    taskId: string | number,
    fileId: number,
  ): Promise<void> {
    if (!taskId || !fileId) return;

    const req = new sql.Request(transaction);
    req.input('taskId', String(taskId));
    const rs = await req.query(`
      SELECT rc.id
      FROM task_recurring_config rc
      WHERE rc.status = 1
        AND JSON_VALUE(rc.task_data, '$.taskId') = @taskId
    `);

    const recurringIds = (rs.recordset || [])
      .map((r: any) => Number(r.id))
      .filter((id: number) => Number.isFinite(id) && id > 0);

    for (const recurringId of recurringIds) {
      const checkReq = new sql.Request(transaction);
      checkReq.input('fileId', fileId);
      checkReq.input('objectId', String(recurringId));
      const existed = await checkReq.query(`
        SELECT TOP 1 1 AS found
        FROM file_relations
        WHERE status = 1
          AND file_id = @fileId
          AND object_type = 'taskdocuments'
          AND CAST(object_id AS NVARCHAR(255)) = @objectId
      `);
      if (existed.recordset?.length) continue;

      await this.filesRepository.createFileRelation({
        object_type: 'taskdocuments',
        object_id: recurringId,
        file_id: fileId,
      }, transaction);
    }
  }

  private async mirrorTaskDocumentFolderToRecurringConfigs(
    transaction: sql.Transaction,
    taskId: string | number,
    folderId: number,
  ): Promise<void> {
    if (!taskId || !folderId) return;
    await this.mirrorTaskDocumentToRecurringConfigs(transaction, taskId, folderId);
  }
  private watermarkFontBytesCache: Buffer | null = null;
  private watermarkLogoBytesCache: Buffer | null = null;

  constructor(
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepository: Repository<UserEntity>,
    private readonly configService: ConfigService,
    private readonly filesRepository: FilesRepository,
    private readonly systemLogTaskServiceSql: SystemLogTaskServiceSql,
    private readonly workItemsService: WorkItemsService,
    private readonly minioConfigService: MinioConfigService,
  ) { }

  onModuleInit() {
    this.dbname = this.getDatabaseName();
  }

  private normalizeAndValidateUploadFile(file: Express.Multer.File): string {
    const normalizedFileName = validateFileType({
      originalname: file.originalname,
      mimetype: file.mimetype,
    });
    file.originalname = normalizedFileName;
    return normalizedFileName;
  }

  private getDatabaseName(): string {
    const dbName = this.configService.get<string>('SQLSERVER_DATABASE');
    if (!dbName) throw new Error('SQLSERVER_DATABASE not defined in .env');
    return dbName;
  }

  private normalizeSignedFileName(fileName: string): string {
    if (!fileName) return '';
    const ext = path.extname(fileName);
    const base = path.basename(fileName, ext);
    let cleaned = base
      .replace(/_signed_\d{8}_\d{6}/g, '')
      .replace(/__+/g, '_')
      .replace(/^_+|_+$/g, '')
      .trim();

    // Collapse suffixes generated by duplicate uploads/signing, e.g.
    // "Form (1) (2) (1).docx" and "Form (1) (2).docx" -> "Form.docx".
    let previous = '';
    while (previous !== cleaned) {
      previous = cleaned;
      cleaned = cleaned
        .replace(/\s*-\s*Copy(?:\s*\(\d+\))?$/i, '')
        .replace(/\s*\(\d+\)$/g, '')
        .trim();
    }

    return `${cleaned}${ext}`;
  }

  private pickMostSignedByName(files: any[]): any[] {
    const byName = new Map<string, any>();
    for (const f of files) {
      const rawName = f?.file_name || '';
      const key = rawName ? this.normalizeSignedFileName(rawName) : String(f?.id ?? '');
      const exist = byName.get(key);
      if (!exist) {
        byName.set(key, f);
        continue;
      }

      const curSigned = Number(f?.number_of_signed_file) || 0;
      const existSigned = Number(exist?.number_of_signed_file) || 0;

      if (curSigned > existSigned) {
        byName.set(key, f);
        continue;
      }

      if (curSigned === existSigned) {
        const curTime = new Date(f?.updated_at || f?.created_at || 0).getTime();
        const existTime = new Date(exist?.updated_at || exist?.created_at || 0).getTime();
        if (curTime > existTime) {
          byName.set(key, f);
        }
      }
    }
    return Array.from(byName.values());
  }

  private async getMsPool(): Promise<ConnectionPool> {
    // Nếu đã có pool instance và nó còn sống thì trả về luôn
    if (this.pool?.connected) {
      return this.pool;
    }

    // Nếu pool disconnected, cố gắng reconnect
    if (this.pool && !this.pool.connected && !this.pool.connecting) {
      console.warn('[MSSQL] Pool disconnected, attempting to reconnect...');
      try {
        await this.pool.connect();
        return this.pool;
      } catch (err) {
        console.error('[MSSQL] Reconnect failed, creating new pool...', err);
        try {
          await this.pool.close();
        } catch { }
        this.pool = null;
      }
    }

    // Nếu chưa có hoặc reconnect failed, tạo pool mới
    this.pool = await getMssqlPool(this.configService);

    if (!this.pool.connected) {
      throw new InternalServerErrorException('MSSQL pool not connected');
    }

    return this.pool;
  }

  async getFilesByOutgoingDocumentIds(
    documentIds: string[],
    objectTypes?: string[],
  ): Promise<Record<string, any[]>> {
    if (!documentIds || documentIds.length === 0) return {};

    const rows = await this.filesRepository.getFilesByDocumentIds(this.dbname, documentIds, objectTypes);

    const fileMap = new Map<number, any>(rows.map((r: any) => [r.fileId, r] as [number, any]));
    const findRootId = (fileId: number): number => {
      let currentId = fileId;
      const visited = new Set<number>();
      while (true) {
        if (visited.has(currentId)) break;
        visited.add(currentId);
        const currentFile = fileMap.get(currentId);
        if (!currentFile || !currentFile.parentId) {
          break;
        }
        currentId = currentFile.parentId;
      }
      return currentId;
    };

    const certifiedCopyMap = new Map<string, number>();
    const certRows = await this.filesRepository.getFilesByDocumentIds(this.dbname, documentIds, ['attachments_cert_copy']);
    for (const row of certRows) {
      certifiedCopyMap.set(String(row.documentId), row.fileId);
    }

    const tempMap: Record<string, Map<number, any>> = {};

    for (const row of rows) {
      const docId = String(row.documentId);
      const rootId = findRootId(row.fileId);

      if (!tempMap[docId]) {
        tempMap[docId] = new Map();
      }

      const exist = tempMap[docId].get(rootId);

      const shouldUseFile = (() => {
        if (!exist) return true;
        
        const PRIORITY_TYPES_TO_IGNORE = ['attachments_cert_copy', 'temp_stamp'];
        const existIsMain = !PRIORITY_TYPES_TO_IGNORE.includes(exist.object_type);
        const rowIsMain = !PRIORITY_TYPES_TO_IGNORE.includes(row.object_type);
        
        if (existIsMain && !rowIsMain) return false;
        if (!existIsMain && rowIsMain) return true;
        
        return new Date(row.updatedAt || row.createdAt) > new Date(exist.updatedAt || exist.createdAt);
      })();

      if (shouldUseFile) {
        tempMap[docId].set(rootId, row);
      }
    }

    const filesMap: Record<string, any[]> = {};
    for (const docId of Object.keys(tempMap)) {
      const latestFiles = Array.from(tempMap[docId].values());
      const certFileId = certifiedCopyMap.get(docId);
      
      filesMap[docId] = latestFiles.map((f: any) => ({
        ...f,
        isCertifiedCopy: certFileId ? String(f.fileId) === String(certFileId) : false,
      })).filter(f => {
        if (objectTypes && objectTypes.length > 0) {
          return objectTypes.includes(f.object_type);
        }
        return !['attachments_cert_copy', 'temp_stamp'].includes(f.object_type);
      });
    }

    return filesMap;
  }
  async createLogFromSystem(systemLogDto: any): Promise<void> {

    const logData = {
      ...systemLogDto,
      timestamp: systemLogDto.timestamps || new Date().toISOString(),
      note: systemLogDto.note ?? systemLogDto.note,
    };

    try {
      await this.systemLogTaskServiceSql.create(logData);
    } catch (err) {
      console.error('[SYSTEM LOG] SQL create FAILED', err);
    }
  }


  async getFileMeta(id: number): Promise<{
    id: number;
    is_directory: number;
    file_name: string;
  }> {
    const file = await this.filesRepository.getFileMeta(id);

    if (!file) {
      throw new NotFoundException('Không tìm thấy file hoặc thư mục');
    }
    return file;
  }

  async getFileInfo(id: number, currentUserId?: string) {
    if (!currentUserId) {
      throw new ForbiddenException('Không xác định được người dùng');
    }
    const hasPermission = await this.filesRepository.canUserViewFile(
      String(id),
      String(currentUserId),
    );
    if (!hasPermission) {
      throw new ForbiddenException('Bạn không có quyền xem thông tin file này');
    }

    const file = await this.filesRepository.getFileInfo(id);

    if (!file) {
      throw new NotFoundException('Không tìm thấy file');
    }

    return {
      success: true,
      data: {
        public_id: await this.filesRepository.getFileUuidById(Number(file.id)),
        fileName: file.file_name,
        mimeType: file.mime_type,
        fileSize: file.file_size,
        storageType: file.storage_type,
        storagePath: file.storage_path,
        filePath: file.file_path,
        isDirectory: file.is_directory,
        version: file.version,
        description: file.description,
        createdAt: file.created_at,
        updatedAt: file.updated_at,
        createdBy: file.created_by,
        createdByName: file.created_by_name ?? null,
      },
    };
  }


  private resolveDocumentContextByObjectType(objectType: string): {
    kind: 'incoming' | 'outgoing';
    key: 'VIEW_INCOMING_DOC' | 'VIEW_OUTCOMING_DOC';
    category: 'Văn bản đến' | 'Văn bản đi';
    linkPrefix: '/incomming-documents' | '/outgoing-documents';
  } | null {
    const normalized = String(objectType || '').trim().toLowerCase();
    if (!normalized) return null;
    if (normalized.includes('docDraft') || normalized.includes('docdraft')) {
      return {
        kind: 'outgoing',
        key: 'VIEW_OUTCOMING_DOC',
        category: 'Văn bản đi',
        linkPrefix: '/outgoing-documents',
      };
    }
    if (
      normalized.includes('incommingdocument') ||
      normalized.includes('incoming') ||
      normalized === 'attachments_cert_copy'
    ) {
      return {
        kind: 'incoming',
        key: 'VIEW_INCOMING_DOC',
        category: 'Văn bản đến',
        linkPrefix: '/incomming-documents',
      };
    }



    return null;
  }

  async getDocumentInfoByFileId(fileId: number, currentUserId?: string) {
    // if (!currentUserId) {
    //   throw new ForbiddenException('Bạn không có quyền xem tài liệu này.');
    // }

    // const hasPermission = await this.filesRepository.canUserViewFile(
    //   String(fileId),
    //   currentUserId,
    // );
    // if (!hasPermission) {
    //   throw new ForbiddenException('Bạn không có quyền xem tài liệu này.');
    // }

    const relation = await this.filesRepository.getLatestRelationByFileId(fileId);
    if (!relation) {
      throw new NotFoundException('Không tìm thấy liên kết văn bản của file');
    }

    const docContext = this.resolveDocumentContextByObjectType(relation.object_type);
    if (!docContext) {
      throw new BadRequestException(`Loại file không phải văn bản đến/đi: ${relation.object_type}`);
    }

    const recordId = String(relation.object_id);
    const docSummary = docContext.kind === 'incoming'
      ? await this.filesRepository.getIncomingDocumentSummary(recordId)
      : await this.filesRepository.getOutgoingDocumentSummary(recordId);

    if (!docSummary) {
      throw new NotFoundException(`Không tìm thấy văn bản với id: ${recordId}`);
    }

    let recordActivity = await this.filesRepository.getLatestRecordActivityByRecord(
      recordId,
      docContext.key,
      currentUserId,
    );

    if (!recordActivity && currentUserId) {
      recordActivity = await this.filesRepository.getLatestRecordActivityByRecord(
        recordId,
        docContext.key,
      );
    }

    const abstractNote = docSummary.abstract_note ?? null;

    return {
      id: recordActivity?.id ?? null,
      recipientId: recordActivity?.recipientId ?? (currentUserId || null),
      key: recordActivity?.key ?? docContext.key,
      recordId,
      category: docContext.category,
      abstractNote,

    };
  }

  async resolveFileIdOrThrow(idOrUuid: string | number, transaction?: sql.Transaction): Promise<number> {
    const raw = String(idOrUuid ?? '').trim();
    if (!raw) {
      throw new BadRequestException('Thiếu file id');
    }
    const resolvedId = await this.filesRepository.resolveInternalId(raw, transaction);
    if (!resolvedId) {
      throw new NotFoundException(`Không tìm thấy file với ID: ${raw}`);
    }
    return resolvedId;
  }

  private async getActiveStorageConfig(): Promise<any> {
    return this.minioConfigService.getMinioConfig();
  }

  /** Khởi tạo client MinIO */
  private async getMinioClient(config: any) {
    const [host, portStr] = config.minio_endpoint.split(':');
    const port = parseInt(portStr) || 9000;
    return new MinioClient({
      endPoint: host,
      port,
      useSSL: true,
      accessKey: config.minio_access_key,
      secretKey: config.minio_secret_key,
      pathStyle: true,
    });
  }
  /** Upload file (Filesystem hoặc MinIO) */
  async uploadFile(
    dto: UploadFileDto,
    file: Express.Multer.File,
    userId?: string,
    externalTransaction?: sql.Transaction, // Thêm tham số nhận Transaction từ bên ngoài
  ) {
    let pool;
    let transaction = externalTransaction;
    let shouldManageTransaction = false; // Flag phân biệt transaction nội bộ hay ngoài truyền vào

    // Nếu không có transaction truyền vào, tự tạo mới
    if (!transaction) {
      pool = await this.getMsPool();
      transaction = new sql.Transaction(pool);
      await transaction.begin();
      shouldManageTransaction = true; // Bật cờ cho phép hàm tự commit/rollback
    }

    try {
      let finalFileName = file.originalname;
      try {
        finalFileName = decodeURIComponent(file.originalname);
      } catch (e) {
        console.warn('Decode filename error, using original:', e);
      }
      file.originalname = finalFileName;
      finalFileName = this.normalizeAndValidateUploadFile(file);

      let fileSize = file.size;

      if (!file.buffer && !file.path) {
        throw new Error('Invalid file object');
      }
      if (!file.buffer) {
        const stat = await fsPromises.stat(file.path);
        fileSize = stat.size;
      } else {
        fileSize = file.buffer.length;
      }

      const tConfigStart = performance.now();
      const config = await this.getActiveStorageConfig();
      const tConfigEnd = performance.now();
      console.log(`  3.1 getActiveStorageConfig: ${(tConfigEnd - tConfigStart).toFixed(3)}ms`);

      const useMinio = config.active_type === 'minio';
      let storagePath: string;

      const tWriteStart = performance.now();
      if (useMinio) {
        const minioClient = await this.getMinioClient(config);
        storagePath = `TCSG/${dto.object_type || 'default'}/${Date.now()}_${finalFileName}`;
        try {
          if (file.buffer) {
            await minioClient.putObject(config.minio_bucket, storagePath, file.buffer, fileSize);
          } else {
            await minioClient.fPutObject(config.minio_bucket, storagePath, file.path, {
              'Content-Type': file.mimetype
            });
          }
        } catch (err: any) {
          this.logger.error(
            `[MinIO upload error] ${JSON.stringify({
              message: err?.message,
              code: err?.code,
              statusCode: err?.statusCode,
              requestId: err?.requestid || err?.requestId || err?.amzRequestid,
              bucket: config.minio_bucket,
              endpoint: config.minio_endpoint,
              object: storagePath,
              objectType: dto.object_type || 'default',
              fileName: finalFileName,
              fileSize,
              uploadMode: file.buffer ? 'putObject-buffer' : 'fPutObject-path',
              partSize: (minioClient as any)?.partSize,
              isMultipartCandidate: fileSize > ((minioClient as any)?.partSize || 64 * 1024 * 1024),
            })}`,
            err?.stack,
          );
          throw err;
        }
      } else {
        const destinationDir = path.join(this.uploadBase, 'TCSG', dto.object_type || 'default');
        await fsPromises.mkdir(destinationDir, { recursive: true });
        let newPath = path.join(destinationDir, finalFileName);
        let counter = 1;
        while (
          await fsPromises
            .access(newPath)
            .then(() => true)
            .catch(() => false)
        ) {
          const ext = path.extname(finalFileName);
          const base = path.basename(finalFileName, ext);
          newPath = path.join(destinationDir, `${base}_${counter}${ext}`);
          counter++;
        }
        if (file.buffer) {
          await fsPromises.writeFile(newPath, file.buffer);
        } else {
          await fsPromises.copyFile(file.path, newPath);
        }
        storagePath = path.relative(this.uploadBase, newPath).replace(/\\/g, '/');
      }
      const tWriteEnd = performance.now();
      console.log(`  3.2 writeToStorage (${useMinio ? 'MinIO' : 'Filesystem'}): ${(tWriteEnd - tWriteStart).toFixed(3)}ms`);

      // ===== CASE 1: Upload mới =====
      if (!dto.edit_file_id && !dto.signed_file_id) {
        const tDbStart = performance.now();
        finalFileName = await this.filesRepository.generateUniqueFileName(
          finalFileName,
          dto.object_type,
          dto.object_id,
        );

        const isImportant =
          dto.isImportant === true ||
          dto.isImportant === 'true' ||
          dto.isImportant === '1' ||
          dto.is_important === true ||
          dto.is_important === 'true' ||
          dto.is_important === '1';

        const fileId = await this.filesRepository.createFile({
          file_name: finalFileName,
          storage_type: useMinio ? 'minio' : 'filesystem',
          storage_path: storagePath,
          file_path: storagePath,
          mime_type: file.mimetype,
          file_size: fileSize,
          parent_id: dto.parent_id,
          description: dto.description,
          created_by: userId,
          typeSize: dto.typeSize,
          is_important: isImportant || false,
          isImportant: isImportant || false,
        }, transaction);

        await this.filesRepository.createFileRelation({
          object_type: dto.object_type || 'default',
          object_id: dto.object_id || 0,
          file_id: fileId,
        }, transaction);
        if (dto.object_type === 'taskdocuments' && dto.object_id) {
          await this.mirrorTaskDocumentToRecurringConfigs(transaction, dto.object_id, fileId);
        }

        if (dto.object_type === 'document-library' && dto.object_id) {
          const docIdNum = Number(dto.object_id);
          const updateReq = new sql.Request(transaction);
          updateReq.input('docId', sql.Int, docIdNum);
          updateReq.input('fileId', sql.BigInt, fileId);
          await updateReq.query(`UPDATE document_library SET file_id = @fileId WHERE id = @docId`);
        }

        const isCertifiedCopy =
          dto.isCertifiedCopy === true ||
          dto.isCertifiedCopy === 'true' ||
          dto.isCertifiedCopy === '1';

        if (isCertifiedCopy && dto.object_id) {
          await this.filesRepository.setCertifiedCopyRelation(String(dto.object_id), fileId, transaction);
        }

        if (dto.object_type === 'taskdocuments' && dto.object_id) {
          await this.createLogFromSystem({ actions: 'PATCH', details: 'Thêm mới file công việc', userInfo: userId, timestamps: new Date().toISOString(), taskId: dto.object_id.toString() });
        }
        if (dto.object_type === 'finaldocuments' && dto.object_id) {
          await this.createLogFromSystem({ actions: 'PATCH', details: 'Thêm mới file kết quả công việc', userInfo: userId, timestamps: new Date().toISOString(), taskId: dto.object_id.toString() });
        }
        if (dto.object_type === 'project' && dto.object_id && dto.isUpdate) {
          await this.createLogFromSystem({ actions: 'PATCH', details: 'Cập nhật tài liệu dự án', userInfo: userId, timestamps: new Date().toISOString(), taskId: dto.object_id.toString() });
        }
        if (dto.object_type === 'MeetingTask' && dto.object_id) {
          // Lưu ý quan trọng: Dùng new sql.Request(transaction) để gắn vào transaction hiện tại thay vì mở request riêng
          const meetingReq = new sql.Request(transaction);
          await meetingReq
            .input('meetingId', dto.object_id)
            .input('isDocumentPrepared', 1)
            .query(`UPDATE ${this.dbname}.dbo.meeting_tasks SET is_document_prepared = @isDocumentPrepared WHERE id = @meetingId`);
        }

        // === Auto-resize ảnh news ===
        if (dto.object_type === 'news' && dto.object_id && this.isImageFile(file.mimetype)) {
          const bufferForResize = file.buffer ?? await fsPromises.readFile(file.path);
          await this.resizeAndUploadNewsImages(
            bufferForResize,
            finalFileName,
            file.mimetype,
            dto.object_id,
            config,
            useMinio,
            userId,
            transaction,
          );
        }
        const tDbEnd = performance.now();
        console.log(`  3.3 databaseOperations (create): ${(tDbEnd - tDbStart).toFixed(3)}ms`);

        // Chỉ gọi commit nếu là transaction tự tạo nội tại
        const tCommitStart = performance.now();
        if (shouldManageTransaction) {
          await transaction.commit();
        }
        const tCommitEnd = performance.now();
        console.log(`  3.5 transactionCommit: ${(tCommitEnd - tCommitStart).toFixed(3)}ms`);

        const publicId = await this.filesRepository.getFileUuidById(
          fileId,
          shouldManageTransaction ? undefined : transaction,
        );
        const result = {
          public_id: publicId,
          id: fileId,
          internal_id: fileId,
          file_name: finalFileName,
          storage_type: useMinio ? 'minio' : 'filesystem',
          file_path: storagePath,
          object_type: dto.object_type || 'default',
          typeSize: dto.typeSize,
        };
        // Pre-create backup for normal uploads only. sign-otp can pass very large
        // signed PDFs by path, so do not read those files back into heap here.
        if (!(dto as any).skipPdfBackupPrecreate) {
          const tBackupStart = performance.now();
          const backupBuffer = file.buffer ?? await fsPromises.readFile(file.path);
          this.precreateOutgoingPdfBackupIfNeeded({
            fileId,
            objectType: dto.object_type,
            fileName: finalFileName,
            mimeType: file.mimetype,
            fileBuffer: backupBuffer,
          });
          const tBackupEnd = performance.now();
          console.log(`  3.6 precreateOutgoingPdfBackupIfNeeded: ${(tBackupEnd - tBackupStart).toFixed(3)}ms`);
        }
        return result;
      }

      // ===== CASE 2: Chỉnh sửa =====
      if (dto.edit_file_id) {
        const tDbStart = performance.now();
        const origin = await this.filesRepository.getFileById(Number(dto.edit_file_id), transaction);
        if (!origin) throw new Error('File chỉnh sửa không tồn tại');

        let versionIdToUse = origin.id;
        let isNewVersion = false;
        const finalVerName = finalFileName;
        let newVersionStr = String(origin.version);

        if (origin.created_by === userId || !userId) {
          await this.filesRepository.updateFile(origin.id, {
            file_name: finalFileName,
            file_path: storagePath,
            storage_path: storagePath,
            mime_type: file.mimetype,
            file_size: fileSize,
            typeSize: dto.typeSize,
          }, transaction);

          // === Auto-resize ảnh news khi chỉnh sửa (same user) ===
          if (dto.object_type === 'news' && dto.object_id && this.isImageFile(file.mimetype)) {
            const bufferForResize = file.buffer ?? await fsPromises.readFile(file.path);
            await this.removeOldNewsResizedFiles(dto.object_id, transaction);
            await this.resizeAndUploadNewsImages(
              bufferForResize,
              finalFileName,
              file.mimetype,
              dto.object_id,
              config,
              useMinio,
              userId,
              transaction,
            );
          }
        } else {
          isNewVersion = true;
          const latestVersion = await this.filesRepository.getLatestVersion(origin.id, transaction);
          const newVersion = latestVersion + 1.0;
          newVersionStr = newVersion.toFixed(1);

          versionIdToUse = await this.filesRepository.createFile({
            file_name: finalFileName,
            storage_type: useMinio ? 'minio' : 'filesystem',
            storage_path: storagePath,
            file_path: storagePath,
            mime_type: file.mimetype,
            file_size: fileSize,
            parent_id: origin.id,
            description: dto.description,
            created_by: userId,
            version: newVersionStr,
            typeSize: dto.typeSize,
          }, transaction);

          await this.filesRepository.createFileRelation({
            object_type: dto.object_type || 'default',
            object_id: dto.object_id || 0,
            file_id: versionIdToUse,
          }, transaction);

          // === Auto-resize ảnh news khi chỉnh sửa (version mới) ===
          if (dto.object_type === 'news' && dto.object_id && this.isImageFile(file.mimetype)) {
            const bufferForResize = file.buffer ?? await fsPromises.readFile(file.path);
            await this.removeOldNewsResizedFiles(dto.object_id, transaction);
            await this.resizeAndUploadNewsImages(
              bufferForResize,
              finalFileName,
              file.mimetype,
              dto.object_id,
              config,
              useMinio,
              userId,
              transaction,
            );
          }
        }
        const tDbEnd = performance.now();
        console.log(`  3.3 databaseOperations (edit): ${(tDbEnd - tDbStart).toFixed(3)}ms`);

        const tCommitStart = performance.now();
        if (shouldManageTransaction) {
          await transaction.commit();
        }
        const tCommitEnd = performance.now();
        console.log(`  3.5 transactionCommit: ${(tCommitEnd - tCommitStart).toFixed(3)}ms`);

        const publicId = await this.filesRepository.getFileUuidById(
          versionIdToUse,
          shouldManageTransaction ? undefined : transaction,
        );
        return {
          public_id: publicId,
          id: versionIdToUse,
          internal_id: versionIdToUse,
          file_name: isNewVersion ? file.originalname : finalFileName,
          storage_type: useMinio ? 'minio' : 'filesystem',
          file_path: storagePath,
          version: newVersionStr,
          object_type: dto.object_type || 'default',
          typeSize: dto.typeSize,
        };
      }

      // ===== CASE 3: Ký file =====
      if (dto.signed_file_id) {
        const tDbStart = performance.now();
        const rawSignedFileId = String(dto.signed_file_id).trim();
        // Dùng resolveInternalId để hỗ trợ cả numeric ID và UUID (public_id)
        const signedFileId = await this.filesRepository.resolveInternalId(rawSignedFileId, transaction);
        if (!signedFileId) throw new Error('File ký không tồn tại');
        const origin = await this.filesRepository.getFileById(signedFileId, transaction);
        if (!origin) throw new Error('File ký không tồn tại');

        let nextSignedCount = 1;
        const isSigned = Number(origin.is_signed_file) === 1;
        if (isSigned) {
          nextSignedCount = (Number(origin.number_of_signed_file) || 0) + 1;
        }

        const latestVersion = await this.filesRepository.getLatestVersion(origin.id, transaction);
        const newVersion = latestVersion + 1.0;

        const signedId = await this.filesRepository.createFile({
          file_name: finalFileName,
          storage_type: useMinio ? 'minio' : 'filesystem',
          storage_path: storagePath,
          file_path: storagePath,
          file_size: fileSize,
          mime_type: file.mimetype,
          parent_id: origin.id,
          is_signed_file: 1,
          number_of_signed_file: nextSignedCount,
          version: newVersion.toFixed(1),
          description: dto.description,
          created_by: userId,
          typeSize: dto.typeSize,
        }, transaction);

        let relationObjectType = dto.object_type || 'default';
        let relationObjectId = dto.object_id || 0;
        const certCopyRelation =
          (
            await this.filesRepository.getActiveFileRelationsByFileIdAndType(
              origin.id,
              'attachments_cert_copy',
              transaction,
            )
          )?.[0];

        if (certCopyRelation) {
          relationObjectType = certCopyRelation.object_type;
          relationObjectId = certCopyRelation.object_id;
        }

        await this.filesRepository.createFileRelation({
          object_type: relationObjectType,
          object_id: relationObjectId,
          file_id: signedId,
        }, transaction);

        const defaultRelationObjectType = dto.object_type || 'default';
        const defaultRelationObjectId = dto.object_id || 0;
        if (
          String(relationObjectType) !== String(defaultRelationObjectType) ||
          String(relationObjectId) !== String(defaultRelationObjectId)
        ) {
          await this.filesRepository.createFileRelation({
            object_type: defaultRelationObjectType,
            object_id: defaultRelationObjectId,
            file_id: signedId,
          }, transaction);
        }
        const tDbEnd = performance.now();
        console.log(`  3.3 databaseOperations (sign): ${(tDbEnd - tDbStart).toFixed(3)}ms`);

        const tCommitStart = performance.now();
        if (shouldManageTransaction) {
          await transaction.commit();
        }
        const tCommitEnd = performance.now();
        console.log(`  3.5 transactionCommit: ${(tCommitEnd - tCommitStart).toFixed(3)}ms`);

        const publicId = await this.filesRepository.getFileUuidById(
          signedId,
          shouldManageTransaction ? undefined : transaction,
        );
        return {
          public_id: publicId,
          id: signedId,
          internal_id: signedId,
          file_name: finalFileName,
          storage_type: useMinio ? 'minio' : 'filesystem',
          file_path: storagePath,
          number_of_signed_file: nextSignedCount,
          object_type: dto.object_type || 'default',
          typeSize: dto.typeSize,
        };
      }

    } catch (err) {
      // Cũng chỉ rollback nội tại nếu đây là transaction tự tạo
      if (shouldManageTransaction) {
        try {
          await transaction.rollback();
        } catch (rollbackError: any) {
          if (rollbackError?.code !== 'ENOTBEGUN') {
            throw rollbackError;
          }
        }
      }
      throw err;
    }
  }

  private isPdfFile(fileName?: string, mimeType?: string, buffer?: Buffer): boolean {
    if (mimeType === 'application/pdf') return true;
    if (fileName && fileName.toLowerCase().endsWith('.pdf')) return true;
    if (buffer && buffer.length >= 4) {
      return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
    }
    return false;
  }

  private async precreateOutgoingPdfBackupIfNeeded(input: {
    fileId: number;
    objectType?: string;
    fileName?: string;
    mimeType?: string;
    fileBuffer?: Buffer;
  }) {
    const { fileId, objectType, fileName, mimeType, fileBuffer } = input;
    if (objectType !== 'docDraft') return;
    if (!this.isPdfFile(fileName, mimeType, fileBuffer)) return;

    try {
      await this.getOrCreatePdfBackup(fileId);
    } catch (err) {
      this.logger?.error?.(`[uploadFile] pre-create PDF backup failed fileId=${fileId}`, err?.stack || err);
    }
  }
  /**
   * Upload file signed từ hệ thống ký số về
   */

  async uploadFileRemoteSigning(dto: UploadFileRemoteSingningDto, file: Express.Multer.File) {
    const pool = await this.getMsPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      let finalFileName = file.originalname;
      try {
        finalFileName = decodeURIComponent(file.originalname);
      } catch (e) {
        console.warn('Decode filename error, using original:', e);
      }
      file.originalname = finalFileName;
      finalFileName = this.normalizeAndValidateUploadFile(file);

      const config = await this.getActiveStorageConfig();
      const useMinio = config.active_type === 'minio';
      let storagePath: string;

      if (useMinio) {
        const minioClient = await this.getMinioClient(config);
        storagePath = `TCSG/${dto.objectType || 'default'}/${Date.now()}_${finalFileName}`;
        const fileBuffer = await fs.promises.readFile(file.path);
        await minioClient.putObject(
          config.minio_bucket,
          storagePath,
          fileBuffer,
          file.size,
        );
      } else {
        const destinationDir = path.join(
          this.uploadBase,
          'TCSG',
          dto.objectType || 'default',
        );
        await fsPromises.mkdir(destinationDir, { recursive: true });
        let newPath = path.join(destinationDir, finalFileName);
        let counter = 1;
        while (
          await fsPromises
            .access(newPath)
            .then(() => true)
            .catch(() => false)
        ) {
          const ext = path.extname(finalFileName);
          const base = path.basename(finalFileName, ext);
          newPath = path.join(destinationDir, `${base}_${counter}${ext}`);
          counter++;
        }
        await fsPromises.rename(file.path, newPath);
        storagePath = path
          .relative(this.uploadBase, newPath)
          .replace(/\\/g, '/');
      }

      const fileId = await this.filesRepository.createFile({
        file_name: finalFileName,
        storage_type: useMinio ? 'minio' : 'filesystem',
        storage_path: storagePath,
        file_path: storagePath,
        mime_type: file.mimetype,
        file_size: file.size,
        parent_id: null,
        description: "File ký số từ hệ thống remote signing(chưa xác nhận)",
        created_by: dto.userId,
        createFile: 1
      }, transaction);

      await transaction.commit();
      const publicId = await this.filesRepository.getFileUuidById(fileId);
      const baseUrl = (process.env.URL_NESTJS || '').trim().replace(/\/+$/, '');
      const fileViewId = publicId || String(fileId);
      const fileUrl = baseUrl
        ? `${baseUrl}/api/files/download-tool/${fileViewId}`
        : `/api/files/download-tool/${fileViewId}`;

      return {
        id: fileId,
        public_id: publicId,
        file_name: finalFileName,
        storage_type: useMinio ? 'minio' : 'filesystem',
        file_path: storagePath,
        object_type: dto.objectType || 'default',
        file_url: fileUrl,
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
  async uploadFileSinged(dto: UpdateSignedDto) {
    const pool = await this.getMsPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const config = await this.getActiveStorageConfig();
      const useMinio = config.active_type === 'minio';
      const userId = dto?.data?.userId || 'system';
      const docId = dto.data.document_id;

      if (useMinio) {
        const listDocument = dto.data.documentFiles;

        if (!Array.isArray(listDocument)) {
          this.logger?.warn?.(`[uploadFileSinged] documentFiles không phải array hoặc bị thiếu: ${JSON.stringify(listDocument)}`);
        } else {
          for (const documentItem of listDocument) {
            const fileList = documentItem?.fileList;
            if (!Array.isArray(fileList)) continue;

            for (const fileItem of fileList) {
              if (fileItem.isSigned) {
                const signedId = fileItem?.uploadRes?.id;
                const objectType = fileItem?.uploadRes?.object_type;
                const parentId = fileItem?.originalFile?.fileUrl?.split('/').pop();

                const origin = await this.filesRepository.getFileById(Number(parentId), transaction);
                if (!origin) throw new Error('File ký không tồn tại');

                const latestVersion = await this.filesRepository.getLatestVersion(parentId, transaction);
                const newVersion = latestVersion + 1.0;
                await this.filesRepository.updateSignedCount(
                  parentId || 0,
                  newVersion,
                  transaction
                );

                await this.filesRepository.updateParentFile(
                  signedId,
                  parentId || 0,
                  transaction
                )

                await this.filesRepository.createFileRelation({
                  object_type: objectType || 'default',
                  object_id: docId || 0,
                  file_id: signedId
                }, transaction);
              }
            }
          }
        }
      }
      await transaction.commit();
      return {
        success: true,
        message: 'Upload file signed thành công',
        data: {
          storage_type: useMinio ? 'minio' : 'filesystem',
        },
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  // Helper: đi ngược chuỗi parent_id để tìm file gốc (root)
  private findRootId(fileId: number, fileMap: Map<number, any>): number {
    let currentId = fileId;
    const visited = new Set<number>();
    while (true) {
      if (visited.has(currentId)) break;
      visited.add(currentId);
      const file = fileMap.get(currentId);
      if (!file || !file.parent_id) break;
      currentId = file.parent_id;
    }
    return currentId;
  }

  async getOldFilesByObject(
    type: string,
    objectId: string,
    pagination: { page: number; limit: number },
  ) {
    const allFiles = await this.filesRepository.getFilesByObjectAndStatus(type, objectId);
    const fileMap = new Map(allFiles.map((f: any) => [f.id, f]));
    const latestMap = new Map<number, any>();
    for (const f of allFiles) {
      const rootId = this.findRootId(f.id, fileMap);
      const exist = latestMap.get(rootId);
      if (!exist || new Date(f.created_at) > new Date(exist.created_at)) {
        latestMap.set(rootId, f);
      }
    }

    const latestFiles = Array.from(latestMap.values());
    const latestByName = this.pickMostSignedByName(latestFiles);
    const latestIds = new Set(latestByName.map((f) => f.id));
    const oldFiles = allFiles.filter((f) => !latestIds.has(f.id));

    const page = +pagination.page > 0 ? +pagination.page : 1;
    const limit = +pagination.limit > 0 ? +pagination.limit : 10;
    const offset = (page - 1) * limit;

    const pagedData = oldFiles.slice(offset, offset + limit);

    const userIds = [
      ...new Set(pagedData.map((row) => row.created_by).filter(Boolean)),
    ];

    let userMap = new Map<string, string>();

    if (userIds.length > 0) {
      const users = await this.userRepository.find({
        where: { id: In(userIds) },
        select: ['id', 'name'],
      });
      userMap = new Map(users.map((user) => [user.id, user.name]));
    }

    const data = pagedData.map((row) => ({
      ...row,
      id: Number(row?.id) ?? null,
      created_by: userMap.get(row.created_by) || null,
    }));

    return {
      data,
      total: oldFiles.length,
      page,
      limit,
    };
  }

  // ===================== UPDATE SIGN STATUS =====================
  async updateSignStatus(id: number, is_signed_file: number, currentUserId?: string) {
    if (!currentUserId) {
      throw new ForbiddenException('Khong xac dinh duoc nguoi dung');
    }

    if (is_signed_file !== 0 && is_signed_file !== 1) {
      throw new BadRequestException('is_signed_file chi nhan gia tri 0 hoac 1');
    }

    const hasPermission = await this.filesRepository.canUserUpdateSignStatus(
      String(id),
      String(currentUserId),
    );
    if (!hasPermission) {
      throw new ForbiddenException('Bạn không có quyền cập nhật trạng thái ký của file này');
    }

    const pool = await this.getMsPool();
    const request = pool.request();
    request.input('id', String(id));
    request.input('is_signed_file', is_signed_file);

    const result = await request.query(`
      UPDATE files 
      SET is_signed_file = @is_signed_file, updated_at = GETUTCDATE() 
      WHERE id = @id
    `);

    if (result.rowsAffected[0] === 0) {
      throw new NotFoundException('File không tồn tại');
    }

    return {
      success: true,
      message: 'Cập nhật trạng thái ký số thành công',
      public_id: await this.filesRepository.getFileUuidById(id),
      is_signed_file,
    };
  }

  private async getReturnedAfterSignedDraftDocIds(documentIds: string[]): Promise<Set<string>> {
    const cleanDocIds = Array.from(new Set((documentIds || []).map((id) => String(id || '').trim()).filter(Boolean)));
    if (!cleanDocIds.length) return new Set();

    const pool = await this.getMsPool();
    const request = pool.request();
    const placeholders = cleanDocIds
      .map((id, index) => {
        const key = `docId${index}`;
        request.input(key, sql.NVarChar(100), id);
        return `@${key}`;
      })
      .join(',');

    const result = await request.query(`
      SELECT document_id
      FROM ${this.dbname}.dbo.audit WITH (NOLOCK)
      WHERE document_id IN (${placeholders})
      GROUP BY document_id
      HAVING
        MAX(CASE
          WHEN action_code IN ('TRA_LAI', 'THU_HOI', 'RETURN', 'RECALL', 'TRA_LAI_VT', 'TRA_LAI_TPSL', 'NO')
            OR stage_status IN ('TRA_LAI', 'THU_HOI', 'TRA_LAI_VT', 'TRA_LAI_TPSL')
          THEN id ELSE 0
        END)
        >
        MAX(CASE
          WHEN action_code IN ('KY_NHAY_NOI_DUNG', 'KY_NHAY_THE_THUC', 'KY_SO', 'KY_BAN_HANH', 'DONG_DAU', 'paraphSigner', 'reportSigner', 'stampDoc')
            OR stage_status IN ('DA_KY_NHAY', 'DA_KY', 'DA_KY_THE_THUC', 'DA_KY_BAN_HANH', 'DA_DONG_DAU')
          THEN id ELSE 0
        END)
    `);

    return new Set((result.recordset || []).map((row: any) => String(row.document_id)));
  }

  async getLatestFilesByObject(
    type: string,
    objectId: string,
    pagination: { page: number; limit: number },
    userId?: string,
  ) {
    const allFiles = await this.filesRepository.getFilesByObjectAndStatus(type, objectId);
    const fileMap = new Map(allFiles.map((f: any) => [f.id, f]));
    const latestMap = new Map<number, any>();
    const preferOriginalDraft = false;

    for (const f of allFiles) {
      const rootId = this.findRootId(f.id, fileMap);
      const exist = latestMap.get(rootId);
      const shouldUseFile = (() => {
        if (!exist) return true;
        return new Date(f.created_at) > new Date(exist.created_at);
      })();

      if (shouldUseFile) {
        latestMap.set(rootId, f);
      }
    }

    const latestFiles = Array.from(latestMap.values());
    const latestByName = latestFiles;

    const page = +pagination.page > 0 ? +pagination.page : 1;
    const limit = +pagination.limit > 0 ? +pagination.limit : 10;
    const offset = (page - 1) * limit;

    const certifiedCopyFileId = type === 'incommingdocument'
      ? await this.filesRepository.getFirstCertifiedCopyFileId(objectId)
      : null;

    let hasPendingSignStep = false;
    if (userId && (String(type).toLowerCase() === 'docdraft' || String(type).toLowerCase() === 'outgoingdocument')) {
      try {
        const pool = await this.getMsPool();
        const signCheck = await pool.request()
          .input('docId', objectId)
          .input('userId', userId)
          .query(`
            SELECT TOP 1 1 
            FROM outgoing_document_users 
            WHERE document_id = @docId AND user_id = @userId AND is_signed = 0
          `);
        if (signCheck.recordset.length > 0) {
          hasPendingSignStep = true;
        }
      } catch (err) {
        console.warn('Error checking pending signature steps:', err);
      }
    }

    const paged = latestByName.slice(offset, offset + limit).map((f) => {
      const isCreatedByUser = String(f?.created_by) === String(userId);
      const isSignedFile = String(f?.is_signed_file) === '1';
      const { id, ...rest } = f;

      return {
        ...rest,
        id: Number(f?.id) ?? null,
        public_id: f?.public_id ?? null,
        isCertifiedCopy: certifiedCopyFileId ? String(id) === String(certifiedCopyFileId) : false,
        canSign: hasPendingSignStep ? true : !(isCreatedByUser && isSignedFile),
      };
    });
    const certifiedCopyPublicId = certifiedCopyFileId
      ? (latestByName.find((f) => String(f.id) === String(certifiedCopyFileId))?.public_id ?? null)
      : null;
    return {
      data: paged,
      total: latestByName.length,
      page,
      limit,
      certifiedCopyFileId: certifiedCopyPublicId,
    };
  }

  async getLatestFilesByObjectLite(
    {
      type,
      objectId,
      pagination,
    }: {
      type: string;
      objectId: string;
      pagination?: { page: number; limit: number };
    },
    transaction?: any,
  ): Promise<{
    data: Array<{
      object_id: string | number;
      is_signed_file: string | number;
      created_by: string | number;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const allFiles = await this.filesRepository.getFilesByObjectAndStatus(type, objectId, transaction);
    const fileMap = new Map(allFiles.map((f: any) => [f.id, f]));
    const latestMap = new Map<number, any>();
    const preferOriginalDraft = false;

    for (const f of allFiles) {
      const rootId = this.findRootId(f.id, fileMap);
      const exist = latestMap.get(rootId);
      const shouldUseFile = (() => {
        if (!exist) return true;
        return new Date(f.created_at) > new Date(exist.created_at);
      })();

      if (shouldUseFile) {
        latestMap.set(rootId, f);
      }
    }

    const latestFiles = Array.from(latestMap.values());
    const latestByName = this.pickMostSignedByName(latestFiles);

    const page = +(pagination?.page ?? 1) > 0 ? +(pagination?.page ?? 1) : 1;
    const limit = +(pagination?.limit ?? 10) > 0 ? +(pagination?.limit ?? 10) : 10;
    const offset = (page - 1) * limit;

    const paged = latestByName.slice(offset, offset + limit).map((f) => ({
      object_id: f.object_id,
      is_signed_file: f.is_signed_file,
      created_by: f.created_by,
    }));

    return {
      data: paged,
      total: latestByName.length,
      page,
      limit,
    };
  }

  /**
   * Batch: Lấy latest files cho nhiều objectId cùng lúc
   * Trả về Record<objectId, latestFiles[]>
   */
  async getLatestFilesByObjectIds(type: string, objectIds: string[], selectColumns?: string[]): Promise<Record<string, any[]>> {
    if (!objectIds || objectIds.length === 0) return {};
    const allFiles = await this.filesRepository.getFilesByObjectIds(type, objectIds, selectColumns);

    const preferOriginalDraftsMap = new Set<string>();

    const fileMap = new Map(allFiles.map((f: any) => [f.id, f]));

    // Group by object_id, lấy latest version (giống logic getLatestFilesByObject)
    const groupMap: Record<string, Map<number, any>> = {};
    for (const f of allFiles) {
      const oid = String(f.object_id);
      if (!groupMap[oid]) groupMap[oid] = new Map();
      const rootId = this.findRootId(f.id, fileMap);
      const exist = groupMap[oid].get(rootId);

      const shouldUseFile = (() => {
        if (!exist) return true;
        return new Date(f.created_at) > new Date(exist.created_at);
      })();

      if (shouldUseFile) {
        groupMap[oid].set(rootId, f);
      }
    }

    const result: Record<string, any[]> = {};
    for (const oid of objectIds) {
      const latestFiles = groupMap[oid] ? Array.from(groupMap[oid].values()) : [];
      const picked = latestFiles;
      result[oid] = picked.map((f: any) => ({
        ...f,
        fileId: f.fileId ?? f.id,
        fileName: f.fileName ?? f.file_name,
        filePath: f.filePath ?? f.file_path,
        fileSize: f.fileSize ?? f.file_size,
        mimeType: f.mimeType ?? f.mime_type,
        isSignedFile: f.isSignedFile ?? (Number(f.is_signed_file) === 1),
        id: f.id ?? f.fileId,
        file_name: f.file_name ?? f.fileName,
      }));
    }
    return result;
  }

  async setAttachmentsCertifiedCopy(objectId: string, fileId: number | null) {
    const pool = await this.getMsPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      await this.filesRepository.setCertifiedCopyRelation(objectId, fileId, tx);
      await tx.commit();
      return { success: true };
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  async checkIsRecall(fileId: number): Promise<boolean> {
    const file = await this.filesRepository.getFileForView(fileId);
    return file ? !!file.is_recall : false;
  }

  /** Download file (Filesystem hoặc MinIO) */
  async getFileForView(
    id: number,
    opts?: {
      object_type?: string;
      object_id?: string;
      edit_file_id?: string;
      userId?: string;
      backup?: boolean | string;
      range?: { start: number; end: number };
      streamOnly?: boolean;
    },
  ): Promise<{
    filePath?: string;
    fileBuffer?: Buffer;
    fullPath?: string;
    filename: string;
    mimetype: string;
    fileSize: number;
    isRange?: boolean;
    stream?: any;
  }> {

    const file = await this.filesRepository.getFileForView(id, opts?.backup);
    if (!file) throw new NotFoundException('Không tìm thấy file');

    const fileSize = Number(file.file_size) || 0;

    if (file.storage_type === 'minio') {
      const config = await this.getActiveStorageConfig();
      const minioClient = await this.getMinioClient(config);
      try {
        if (opts?.range) {
          const { start, end } = opts.range;
          const stream = await minioClient.getPartialObject(
            config.minio_bucket,
            file.storage_path,
            start,
            end - start + 1
          );
          return {
            filePath: file.file_path,
            filename: file.file_name,
            mimetype: file.mime_type || 'application/octet-stream',
            fileSize,
            isRange: true,
            stream
          };
        } else {
          const obj = await minioClient.getObject(
            config.minio_bucket,
            file.storage_path,
          );

          if (opts?.streamOnly) {
            return {
              filePath: file.file_path,
              filename: file.file_name,
              mimetype: file.mime_type || 'application/octet-stream',
              fileSize,
              stream: obj
            };
          }

          // Convert stream sang Buffer để tương thích ngược (WOPI, Download, Video Duration)
          const chunks: any[] = [];
          for await (const chunk of obj) {
            chunks.push(chunk);
          }
          const fileBuffer = Buffer.concat(chunks);

          // Tạo stream mới từ Buffer (vì stream cũ đã bị consume)
          const { Readable } = require('stream');
          const newStream = Readable.from(fileBuffer);

          return {
            filePath: file.file_path,
            filename: file.file_name,
            mimetype: file.mime_type || 'application/octet-stream',
            fileSize,
            fileBuffer,
            stream: newStream // Stream mới có thể đọc được
          };
        }
      } catch (err) {
        console.error('MinIO error:', err);
        throw new NotFoundException('File không tồn tại trên MinIO');
      }
    } else {
      const relativePath = file.storage_path || file.file_path;
      const fullPath = path.join(this.uploadBase, relativePath);
      if (!fs.existsSync(fullPath))
        throw new NotFoundException('File không tồn tại trên máy chủ');

      const stat = fs.statSync(fullPath);
      return {
        filePath: relativePath,
        fullPath,
        filename: file.file_name,
        mimetype: file.mime_type || 'application/octet-stream',
        fileSize: stat.size
      };
    }
  }

  async getLatestObjectTypeByFileId(fileId: number): Promise<string | null> {
    return this.filesRepository.getLatestObjectTypeByFileId(fileId);
  }

  async getPreviousFileIdByFileId(fileId: number): Promise<number | null> {
    return this.filesRepository.getPreviousFileIdByFileId(fileId);
  }

  async getWatermarkSignerContextByFileId(
    fileId: number,
  ): Promise<{ signerUserId: string | null; signedAt: string | null }> {
    const relation = await this.filesRepository.getLatestRelationByFileId(fileId);
    this.logger.log(`[getWatermarkSignerContextByFileId] DEBUG fileId=${fileId} -> relation=${JSON.stringify(relation)}`);
    if (!relation) {
      return { signerUserId: null, signedAt: null };
    }

    const objectType = String(relation.object_type || '').toLowerCase();
    let outgoingDocId: string | null = null;
    if (objectType.includes('incommingdocument') || objectType.includes('incomingdocument')) {
      outgoingDocId = await this.filesRepository.getParentOutgoingDocIdByIncomingDocId(
        String(relation.object_id),
      );
    } else if (
      objectType.includes('docdraft') ||
      objectType.includes('doc_draft') ||
      objectType.includes('outgoingdocument') ||
      objectType.includes('outgoing_document') ||
      objectType.includes('document')
    ) {
      outgoingDocId = String(relation.object_id);
    }

    this.logger.log(`[getWatermarkSignerContextByFileId] DEBUG fileId=${fileId} -> objectType='${relation.object_type}', objectId='${relation.object_id}', outgoingDocId='${outgoingDocId}'`);

    if (!outgoingDocId) {
      return { signerUserId: null, signedAt: null };
    }

    const [signerUserId, releaseDate] = await Promise.all([
      this.filesRepository.getMaxOrderSignerUserIdByOutgoingDocId(outgoingDocId),
      this.filesRepository.getReleaseDateByOutgoingDocId(outgoingDocId),
    ]);

    this.logger.log(`[getWatermarkSignerContextByFileId] DEBUG outgoingDocId='${outgoingDocId}' -> signerUserId='${signerUserId}', releaseDate='${releaseDate}'`);

    return {
      signerUserId: signerUserId || null,
      signedAt: releaseDate || null,
    };
  }

  async prepareDownloadNew(
    fileId: number,
    req: any,
    query: DownloadNewQuery = {},
  ): Promise<DownloadNewPrepared> {
    const userId = this.extractUserIdFromRequest(req);
    const effectiveMode: DownloadMode = query.downloadMode || 'watermark';
    let targetFileId = Number(fileId);

    if (effectiveMode === 'nostamp') {
      const previousFileId = await this.getPreviousFileIdByFileId(Number(fileId));
      if (previousFileId) {
        targetFileId = previousFileId;
      }
    }

    const { fileBuffer, fullPath, filename, mimetype } = await this.getFileForView(targetFileId, {});
    let outputBuffer = fileBuffer;
    let outputFilename = filename;
    let outputMimetype = mimetype;
    if (!outputBuffer && fullPath) {
      outputBuffer = await fsPromises.readFile(fullPath);
    }

    const needWatermark = effectiveMode === 'watermark' || effectiveMode === 'nostamp';
    const isPdf =
      outputMimetype?.toLowerCase().includes('pdf') ||
      outputFilename?.toLowerCase().endsWith('.pdf');

    if (needWatermark && !isPdf) {
      const convertedPdf = outputBuffer
        ? await this.convertBufferToPdfByProxy(outputBuffer, outputFilename)
        : await this.convertFileToPdfByProxy(targetFileId, req);
      outputBuffer = convertedPdf;
      outputMimetype = 'application/pdf';
      outputFilename = this.toPdfFilename(outputFilename);
    }

    if (
      needWatermark &&
      outputBuffer &&
      (outputMimetype?.toLowerCase().includes('pdf') || outputFilename?.toLowerCase().endsWith('.pdf'))
    ) {
      const watermarkContext = await this.getWatermarkSignerContextByFileId(targetFileId);
      const authHeader = req?.headers?.authorization || req?.headers?.Authorization;
      const token = (typeof authHeader === 'string' && authHeader.startsWith('Bearer '))
        ? authHeader.slice(7).trim()
        : (typeof authHeader === 'string' ? authHeader.trim() : undefined);

      outputBuffer = await this.addIncomingWatermarkToPdf(
        outputBuffer,
        {
          signerUserId: watermarkContext.signerUserId,
          signedAt: watermarkContext.signedAt,
        },
        {
          stampX: query.stampX,
          stampY: query.stampY,
          stampScale: query.stampScale,
          printerUserId: userId,
          token: token,
        },
      );
      outputMimetype = 'application/pdf';
      outputFilename = this.toPdfFilename(outputFilename);
    }

    return {
      outputBuffer,
      outputFilename,
      outputMimetype,
      fallbackFullPath: fullPath,
      fallbackFilename: filename,
      canUseFallbackDownload: effectiveMode !== 'watermark',
    };
  }

  private extractUserIdFromRequest(req: any): string | null {
    const fromReq = req?.user?.userId || req?.user?.id || req?.authorizedUser;
    if (fromReq) return String(fromReq);
    const auth = req?.headers?.authorization || req?.headers?.Authorization;
    if (!auth || typeof auth !== 'string' || !auth.startsWith('Bearer ')) return null;
    const token = auth.slice(7).trim();
    if (!token) return null;
    const payload = jwt.decode(token) as any;
    return payload?.userId || payload?.id || payload?.sub || null;
  }

  private toPdfFilename(filename: string): string {
    if (!filename) return 'file.pdf';
    if (filename.toLowerCase().endsWith('.pdf')) return filename;
    return filename.replace(/\.[^/.]+$/, '.pdf');
  }

  private buildSelfRawUrl(fileId: number, req: any): string {
    const baseUrl = (process.env.URL_NESTJS || '').trim();
    if (baseUrl) return `${baseUrl}/api/files/raw/${fileId}`;

    const forwardedProto = req?.headers?.['x-forwarded-proto'];
    const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) || req?.protocol || 'http';
    const host = req?.get?.('host') || req?.headers?.host;
    return `${proto}://${host}/api/files/raw/${fileId}`;
  }

  private async convertFileToPdfByProxy(fileId: number, req: any): Promise<Buffer> {
    const fileUrl = this.buildSelfRawUrl(fileId, req);
    const convertEndpoint = `${process.env.APP_CONVERT_URL}/doc-url-to-pdf?docUrl=${encodeURIComponent(fileUrl)}`;
    try {
      const startTime = Date.now();
      const response = await axios.get(convertEndpoint, {
        responseType: 'arraybuffer',
        timeout: 60000,
      });
      const duration = Date.now() - startTime;
      const buffer = Buffer.from(response.data);
      const contentType = response?.headers?.['content-type'] || '';


      if (!this.isPdfBuffer(buffer)) {
        const preview = buffer.subarray(0, 120).toString('utf8');
        this.logger.error(
          `[download-new] convert response is not PDF. fileId=${fileId}, contentType=${contentType}, head="${preview}"`,
        );
        throw new BadRequestException('Dịch vụ chuyển đổi không trả về PDF hợp lệ');
      }
      return buffer;
    } catch (err: any) {
      this.logger.error(`[convertFileToPdfByProxy] Failed fileId=${fileId}: ${err?.message || err}`);
      if (err.response) {
        this.logger.error(`[convertFileToPdfByProxy] Error response status: ${err.response.status}`);
      }
      throw new BadRequestException(
        `Không thể chuyển đổi file sang PDF để chèn watermark: ${err?.message || 'unknown'}`,
      );
    }
  }

  private async convertBufferToPdfByProxy(fileBuffer: Buffer, filename: string): Promise<Buffer> {
    const endpoint = `${process.env.APP_CONVERT_URL}/file-to-pdf`;
    try {
      const startTime = Date.now();
      const formData = new FormData();
      formData.append('file', fileBuffer, {
        filename: filename || 'document',
      });
      const response = await axios.post(endpoint, formData, {
        headers: formData.getHeaders(),
        responseType: 'arraybuffer',
        maxBodyLength: Infinity,
        timeout: 60000,
      });
      const duration = Date.now() - startTime;
      const buffer = Buffer.from(response.data);
      const contentType = response?.headers?.['content-type'] || '';


      if (!this.isPdfBuffer(buffer)) {
        const preview = buffer.subarray(0, 120).toString('utf8');
        this.logger.error(
          `[download-new] file-to-pdf response is not PDF. contentType=${contentType}, head="${preview}"`,
        );
        throw new BadRequestException('Dịch vụ chuyển đổi file-to-pdf không trả về PDF hợp lệ');
      }
      return buffer;
    } catch (err: any) {
      const responseData = err?.response?.data;
      const detail = Buffer.isBuffer(responseData)
        ? responseData.subarray(0, 160).toString('utf8')
        : typeof responseData === 'string'
          ? responseData.slice(0, 160)
          : err?.message || 'unknown';
      this.logger.error(`[convertBufferToPdfByProxy] Failed. filename=${filename}: ${detail}`);
      throw new BadRequestException(
        `Không thể chuyển đổi file sang PDF để chèn watermark: ${err?.message || 'unknown'}`,
      );
    }
  }

  private formatPrintTime(date: Date): string {
    const two = (n: number) => String(n).padStart(2, '0');
    return `${two(date.getDate())}/${two(date.getMonth() + 1)}/${date.getFullYear()} ${two(
      date.getHours(),
    )}:${two(date.getMinutes())}:${two(date.getSeconds())}`;
  }

  private async getWatermarkFontBytesCached(): Promise<Buffer | null> {
    if (this.watermarkFontBytesCache) return this.watermarkFontBytesCache;
    const fontCandidates = [
      path.join(process.cwd(), 'src', 'assets', 'fonts', 'NotoSans-Regular.ttf'),
      path.join(process.cwd(), 'dist', 'src', 'assets', 'fonts', 'NotoSans-Regular.ttf'),
      path.join(process.cwd(), 'src', 'assets', 'fonts', 'arial.ttf'),
      path.join(process.cwd(), 'dist', 'src', 'assets', 'fonts', 'arial.ttf'),
      path.join(process.cwd(), 'assets', 'fonts', 'NotoSans-Regular.ttf'),
      path.join(process.cwd(), 'assets', 'fonts', 'arial.ttf'),
      '/app/assets/fonts/NotoSans-Regular.ttf',
      '/app/assets/fonts/arial.ttf',
      '/app/dist/assets/fonts/NotoSans-Regular.ttf',
      '/app/dist/assets/fonts/arial.ttf',
      path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts', 'arial.ttf'),
      path.join('/usr/share/fonts/truetype/msttcorefonts', 'arial.ttf'),
      path.join('/usr/share/fonts/truetype/dejavu', 'DejaVuSans.ttf'),
      path.join('/usr/share/fonts/dejavu', 'DejaVuSans.ttf'),
      path.join('/usr/share/fonts/truetype/noto', 'NotoSans-Regular.ttf'),
      path.join('/usr/share/fonts/truetype', 'arial.ttf'),
      path.join('/usr/share/fonts', 'arial.ttf'),
    ];

    for (const fontPath of fontCandidates) {
      if (!fs.existsSync(fontPath)) continue;
      try {
        const bytes = await fsPromises.readFile(fontPath);
        this.watermarkFontBytesCache = bytes;
        return bytes;
      } catch {
        // try next
      }
    }
    return null;
  }

  private async getWatermarkLogoBytesCached(): Promise<Buffer | null> {
    if (this.watermarkLogoBytesCache) return this.watermarkLogoBytesCache;
    const logoCandidates = [
      path.join(process.cwd(), 'src', 'assets', 'logo.png'),
      path.join(process.cwd(), 'dist', 'src', 'assets', 'logo.png'),
      path.join(process.cwd(), 'assets', 'logo.png'),
      path.join(process.cwd(), 'dist', 'assets', 'logo.png'),
      path.join(process.cwd(), 'dist', 'assets', 'assets', 'logo.png'),
      '/app/assets/logo.png',
      '/app/dist/assets/logo.png',
      '/app/dist/assets/assets/logo.png',
      path.join(__dirname, '..', 'assets', 'logo.png'),
    ];

    for (const logoPath of logoCandidates) {
      if (!fs.existsSync(logoPath)) continue;
      try {
        const bytes = await fsPromises.readFile(logoPath);
        this.watermarkLogoBytesCache = bytes;
        return bytes;
      } catch {
        // try next
      }
    }
    return null;
  }

  private async addIncomingWatermarkToPdf(
    pdfBuffer: Buffer,
    context: { signerUserId: string | null; signedAt: string | null },
    options: { stampX?: number; stampY?: number; stampScale?: number; printerUserId?: string | null; token?: string } = {},
  ): Promise<Buffer> {
    if (!this.isPdfBuffer(pdfBuffer)) {
      throw new BadRequestException('Dữ liệu không phải PDF hợp lệ để chèn watermark');
    }

    const [signerUser, printUser] = await Promise.all([
      context?.signerUserId
        ? this.userRepository.findOne({
          where: { id: context.signerUserId as any },
          select: ['id', 'name', 'username', 'position', 'emailUser'],
        })
        : Promise.resolve(null),
      options?.printerUserId
        ? this.userRepository.findOne({
          where: { id: options.printerUserId as any },
          select: ['id', 'name', 'username', 'position', 'emailUser'],
        })
        : Promise.resolve(null),
    ]);

    const userName = signerUser?.name || signerUser?.username || context?.signerUserId || '';
    const position = signerUser?.position || '';
    const signedAt = context?.signedAt || '';
    const printUserName = printUser?.name || printUser?.username || '';
    const printPosition = printUser?.position || '';
    const printEmail = printUser?.emailUser || '';

    this.logger.debug(`[addIncomingWatermarkToPdf] DEBUG -> contextKeys=${Object.keys(context || {}).join(',')}, options=${JSON.stringify({ stampX: options.stampX, stampY: options.stampY, stampScale: options.stampScale, hasPrinterUserId: Boolean(options.printerUserId), hasToken: !!options.token })}`);
    this.logger.debug(`[addIncomingWatermarkToPdf] DEBUG -> parsed params: hasUserName=${Boolean(userName)}, hasPosition=${Boolean(position)}, hasSignedAt=${Boolean(signedAt)}, hasPrintUserName=${Boolean(printUserName)}, hasPrintPosition=${Boolean(printPosition)}, hasPrintEmail=${Boolean(printEmail)}`);

    const rawSigningUrl = process.env.URL_SERVICE_SIGNING;
    if (!rawSigningUrl || !rawSigningUrl.trim()) {
      this.logger.error('[addIncomingWatermarkToPdf] Thieu cau hinh URL_SERVICE_SIGNING trong environment');
    } else {
      const signingServiceUrl = rawSigningUrl.trim().replace(/\/+$/, '');
      const watermarkEndpoint = `${signingServiceUrl}/api/sign/watermark/apply`;
      this.logger.log(`[addIncomingWatermarkToPdf] Calling Java Watermark API: ${watermarkEndpoint}`);

      try {
        const formData = new FormData();
        formData.append('file', pdfBuffer, { filename: 'document.pdf', contentType: 'application/pdf' });
        if (userName) formData.append('signerName', userName); // Keep for compatibility if needed, or we can just send the lines
        
        // Build the text lines with hardcoded labels in NestJS as requested
        const printAt = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false }).replace(',', '');
        const companyAddress = '722 Điện Biên Phủ, P. Thạnh Mỹ Tây, TP. HCM';
        const companyPhone = 'Điện thoại: (+84) 283 8990694; Fax: (+84) 283 8993950';
        const signerLine = `Người ký: ${userName}${position ? ` - ${position}` : ''}`;
        const signedTimeLine = `Thời gian ký: ${signedAt}`;
        const printLine1 = `Người in: ${printUserName}${printPosition ? ` - ${printPosition}` : ''}${printEmail ? ` - ${printEmail}` : ''}`;
        const printLine2 = `Ngày in: ${printAt}`;

        const topRightLines = [companyAddress, companyPhone, signerLine, signedTimeLine].filter(Boolean).join('\n');
        const diagonalLines = [printLine1, printLine2].filter(Boolean).join('\n');

        formData.append('topRightLines', topRightLines);
        formData.append('diagonalLines', diagonalLines);
        if (options.stampX !== undefined) formData.append('stampX', String(options.stampX));
        if (options.stampY !== undefined) formData.append('stampY', String(options.stampY));
        if (options.stampScale !== undefined) formData.append('stampScale', String(options.stampScale));

        const requestHeaders: Record<string, string> = {
          ...formData.getHeaders(),
        };
        if (options.token) {
          requestHeaders['Authorization'] = options.token.startsWith('Bearer ') ? options.token : `Bearer ${options.token}`;
        }

        const response = await axios.post(watermarkEndpoint, formData, {
          headers: requestHeaders,
          responseType: 'arraybuffer',
          maxBodyLength: Infinity,
          timeout: 30000,
        });

        const resultBuffer = Buffer.from(response.data);
        this.logger.log(`[addIncomingWatermarkToPdf] Java API response status=${response.status}, resultBufferLength=${resultBuffer.length}`);
        if (this.isPdfBuffer(resultBuffer)) {
          this.logger.log('[addIncomingWatermarkToPdf] SUCCESS via Java Watermark Service');
          return resultBuffer;
        }
        this.logger.warn('[addIncomingWatermarkToPdf] Java Watermark API returned invalid PDF, fallback to local pdf-lib');
      } catch (err: any) {
        this.logger.error(`[addIncomingWatermarkToPdf] Failed via Java Watermark Service (${watermarkEndpoint}): ${err?.message || err}`);
      }
    }

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    pdfDoc.registerFontkit(fontkit);

    const toAscii = (value: string) =>
      (value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\u0111/g, 'd')
        .replace(/\u0110/g, 'D');

    let font: any;
    let useAsciiOnly = false;
    const rawFontBytes = await this.getWatermarkFontBytesCached();
    if (Boolean(rawFontBytes) && (rawFontBytes as Buffer).length > 0) {
      try {
        font = await pdfDoc.embedFont(rawFontBytes as Buffer);
      } catch {
        font = null;
      }
    }
    if (!font) {
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      useAsciiOnly = true;
    }

    let logoImage: any = null;
    const rawLogoBytes = await this.getWatermarkLogoBytesCached();
    if (Boolean(rawLogoBytes) && (rawLogoBytes as Buffer).length > 0) {
      try {
        logoImage = await pdfDoc.embedPng(rawLogoBytes as Buffer);
      } catch (err: any) {
        this.logger.error(`[addIncomingWatermarkToPdf] embedPng failed: ${err?.message || err}`);
      }
    }

    const valueUserName = useAsciiOnly ? toAscii(userName) : userName;
    const valuePosition = useAsciiOnly ? toAscii(position) : position;
    const valuePrintUserName = useAsciiOnly ? toAscii(printUserName) : printUserName;
    const valuePrintPosition = useAsciiOnly ? toAscii(printPosition) : printPosition;
    const valuePrintEmail = useAsciiOnly ? toAscii(printEmail) : printEmail;
    const valueSignedAt = useAsciiOnly ? toAscii(signedAt) : signedAt;
    const printAt = this.formatPrintTime(new Date());

    const line1 = useAsciiOnly
      ? `Nguoi in: ${valuePrintUserName}${valuePrintPosition ? ` - ${valuePrintPosition}` : ''}${valuePrintEmail ? ` - ${valuePrintEmail}` : ''}`
      : `Người in: ${valuePrintUserName}${valuePrintPosition ? ` - ${valuePrintPosition}` : ''}${valuePrintEmail ? ` - ${valuePrintEmail}` : ''}`;
    const line2 = useAsciiOnly ? `Ngay in: ${printAt}` : `Ngày in: ${printAt}`;

    for (const page of pdfDoc.getPages()) {
      const { width, height } = page.getSize();

      if (logoImage) {
        const scale = Number(options.stampScale) || 1;
        const logoW = 42 * scale;
        const logoH = 42 * scale;
        const topY = height - (Number(options.stampY) || 40);
        const groupX = options.stampX !== undefined ? Number(options.stampX) : Math.max(20, width - 270 * scale);

        page.drawImage(logoImage, {
          x: groupX,
          y: topY - 14 * scale,
          width: logoW,
          height: logoH,
          opacity: 0.95,
        });

        const textX = groupX + 50 * scale;
        page.drawText(
          useAsciiOnly ? 'TONG CONG TY TAN CANG SAI GON' : 'TỔNG CÔNG TY TÂN CẢNG SÀI GÒN',
          { x: textX, y: topY + 20 * scale, size: 8.5 * scale, font, color: rgb(0.06, 0.24, 0.58) },
        );
        page.drawText(
          useAsciiOnly
            ? '722 Dien Bien Phu, P. Thanh My Tay, TP. HCM'
            : '722 Điện Biên Phủ, P. Thạnh Mỹ Tây, TP. HCM',
          { x: textX, y: topY + 8 * scale, size: 6.5 * scale, font, color: rgb(0.18, 0.18, 0.18) },
        );
        page.drawText(
          useAsciiOnly
            ? 'Dien thoai: (+84) 283 8990694; Fax: (+84) 283 8993950'
            : 'Điện thoại: (+84) 283 8990694; Fax: (+84) 283 8993950',
          { x: textX, y: topY - 2 * scale, size: 6.5 * scale, font, color: rgb(0.18, 0.18, 0.18) },
        );
        page.drawText(
          useAsciiOnly
            ? `Nguoi ky: ${valueUserName}${valuePosition ? ` - ${valuePosition}` : ''}`
            : `Người ký: ${valueUserName}${valuePosition ? ` - ${valuePosition}` : ''}`,
          { x: textX, y: topY - 12 * scale, size: 6.5 * scale, font, color: rgb(0.18, 0.18, 0.18) },
        );
        page.drawText(
          useAsciiOnly ? `Thoi gian ky: ${valueSignedAt}` : `Thời gian ký: ${valueSignedAt}`,
          { x: textX, y: topY - 22 * scale, size: 6.5 * scale, font, color: rgb(0.18, 0.18, 0.18) },
        );
      }

      const centerX = width / 2;
      const centerY = height / 2;
      const angle = degrees(45);
      const cos45 = 0.7071;
      const line1W = font.widthOfTextAtSize(line1, 13);
      const line2W = font.widthOfTextAtSize(line2, 12);

      page.drawText(line1, {
        x: centerX - (line1W / 2) * cos45 - 8,
        y: centerY - (line1W / 2) * cos45 + 16,
        size: 13,
        font,
        color: rgb(0.55, 0.55, 0.55),
        rotate: angle,
        opacity: 0.6,
      });

      page.drawText(line2, {
        x: centerX - (line2W / 2) * cos45 + 5,
        y: centerY - (line2W / 2) * cos45 - 5,
        size: 12,
        font,
        color: rgb(0.55, 0.55, 0.55),
        rotate: angle,
        opacity: 0.6,
      });
    }

    return Buffer.from(await pdfDoc.save());
  }

  private isPdfBuffer(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 5) return false;
    const isPdf =
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46;
    if (!isPdf) {
      const hex = buffer.subarray(0, 10).toString('hex');
      const head = buffer.subarray(0, 80).toString('utf8').replace(/[\r\n]/g, ' ');
      this.logger.warn(`[isPdfBuffer] Not a PDF buffer. Hex(10)=${hex} Head(80)="${head}"`);
    }
    return isPdf;
  }

  /** Download nhiều files cùng lúc */
  async getMultipleFilesForView(
    ids: number[],
    opts?: {
      object_type?: string;
      object_id?: string;
      edit_file_id?: string;
      userId?: string;
      backup?: boolean | string;
      range?: { start: number; end: number };
    },
  ): Promise<Array<{
    id: number;
    filePath?: string;
    fileBuffer?: Buffer;
    fullPath?: string;
    filename: string;
    mimetype: string;
    fileSize: number;
    isRange?: boolean;
    stream?: any;
    error?: string;
  }>> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('Danh sách ID không được rỗng');
    }


    const results: Array<{
      id: number;
      filePath?: string;
      fileBuffer?: Buffer;
      fullPath?: string;
      filename: string;
      mimetype: string;
      fileSize: number;
      isRange?: boolean;
      stream?: any;
      error?: string;
    }> = [];

    for (const id of ids) {
      try {
        const file = await this.filesRepository.getFileForView(id, opts?.backup);
        if (!file) {
          results.push({
            id,
            filename: '',
            mimetype: '',
            fileSize: 0,
            error: 'Không tìm thấy file',
          });
          continue;
        }

        const fileSize = Number(file.file_size) || 0;

        if (file.storage_type === 'minio') {
          const config = await this.getActiveStorageConfig();
          const minioClient = await this.getMinioClient(config);
          try {
            if (opts?.range) {
              const { start, end } = opts.range;
              const stream = await minioClient.getPartialObject(
                config.minio_bucket,
                file.storage_path,
                start,
                end - start + 1
              );
              results.push({
                id,
                filePath: file.file_path,
                filename: file.file_name,
                mimetype: file.mime_type || 'application/octet-stream',
                fileSize,
                isRange: true,
                stream
              });
            } else {
              const obj = await minioClient.getObject(
                config.minio_bucket,
                file.storage_path,
              );

              // Convert stream sang Buffer
              const chunks: any[] = [];
              for await (const chunk of obj) {
                chunks.push(chunk);
              }
              const fileBuffer = Buffer.concat(chunks);

              // Tạo stream mới từ Buffer
              const { Readable } = require('stream');
              const newStream = Readable.from(fileBuffer);

              results.push({
                id,
                filePath: file.file_path,
                filename: file.file_name,
                mimetype: file.mime_type || 'application/octet-stream',
                fileSize,
                fileBuffer,
                stream: newStream
              });
            }
          } catch (err) {
            console.error('MinIO error for file ID', id, ':', err);
            results.push({
              id,
              filename: file.file_name,
              mimetype: '',
              fileSize: 0,
              error: 'File không tồn tại trên MinIO',
            });
          }
        } else {
          const relativePath = file.file_path;
          const fullPath = path.join(this.uploadBase, relativePath);
          if (!fs.existsSync(fullPath)) {
            results.push({
              id,
              filename: file.file_name,
              mimetype: '',
              fileSize: 0,
              error: 'File không tồn tại trên máy chủ',
            });
            continue;
          }

          const stat = fs.statSync(fullPath);
          results.push({
            id,
            filePath: relativePath,
            fullPath,
            filename: file.file_name,
            mimetype: file.mime_type || 'application/octet-stream',
            fileSize: stat.size
          });
        }
      } catch (err) {
        console.error('Error processing file ID', id, ':', err);
        results.push({
          id,
          filename: '',
          mimetype: '',
          fileSize: 0,
          error: err.message || 'Lỗi không xác định',
        });
      }
    }

    return results;
  }

  buildZipPath(
    file: any,
    rootId: number,
    fileMap: Map<number, any>,
  ): string {
    const paths: string[] = [file.file_name];
    let current: any = file;

    while (true) {
      // 👉 Nếu không có parent → đã là root
      if (!current.parent_id) {
        break;
      }

      // 👉 Nếu parent chính là root folder
      if (current.parent_id === rootId) {
        break;
      }

      const parent = fileMap.get(current.parent_id);

      // 👉 Không tìm thấy parent → dừng để tránh crash
      if (!parent) {
        break;
      }

      paths.unshift(parent.file_name);
      current = parent;
    }

    return paths.join('/');
  }


  async downloadFolderAsZip(
    folderId: number,
  ): Promise<{
    stream: PassThrough;
    filename: string;
  }> {
    /**
     * 1️⃣ Kiểm tra root folder
     */
    const rootFolder = await this.filesRepository.getFolderRoot(folderId);

    if (!rootFolder) {
      throw new NotFoundException('Không tìm thấy thư mục');
    }

    /**
     * 2️⃣ Lấy TOÀN BỘ cây (folder + file)
     */
    const items = await this.filesRepository.getFolderTree(folderId);

    if (!items.length) {
      throw new NotFoundException('Thư mục không có dữ liệu');
    }

    const map = new Map<number, any>();
    items.forEach(i => map.set(i.id, i));

    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = new PassThrough();
    archive.pipe(stream);

    for (const item of items) {
      const zipPath = this.buildZipPath(item, rootFolder.id, map);

      if (item.is_directory) {
        archive.append(null, { name: `${zipPath}/` });
      } else {
        const fileData = await this.getFileForView(item.id);
        if (fileData?.fileBuffer) {
          archive.append(fileData.fileBuffer, { name: zipPath });
        } else if (fileData?.fullPath) {
          archive.file(fileData.fullPath, { name: zipPath });
        }
      }
    }

    archive.finalize(); // ✅ KHÔNG await

    return {
      stream,
      filename: `${rootFolder.file_name}.zip`,
    };
  }

  async downloadMultiAsZip(
    ids: number[],
    objectType?: string,
  ): Promise<{ stream: PassThrough; filename: string }> {
    if (!ids || !ids.length) {
      throw new BadRequestException('Danh sách id rỗng');
    }

    if (objectType === 'document-library') {
      const itemsMeta: any[] = await this.filesRepository.getDocumentLibraryTreeByIds(ids);

      if (!itemsMeta.length) {
        throw new NotFoundException('Không tìm thấy dữ liệu');
      }

      const hasFiles = itemsMeta.some(item => item?.type === 'file');
      if (!hasFiles) {
        throw new BadRequestException('Thư mục trống');
      }

      const archive = archiver('zip', { zlib: { level: 9 } });
      const stream = new PassThrough();
      archive.pipe(stream);

      const addedPaths = new Set<string>();

      for (const item of itemsMeta) {
        let zipPath = item.relativePath;

        let counter = 1;
        while (addedPaths.has(zipPath)) {
          if (item.type === 'file') {
            const extIndex = item.relativePath.lastIndexOf('.');
            if (extIndex !== -1 && extIndex > item.relativePath.lastIndexOf('/')) {
              const name = item.relativePath.substring(0, extIndex);
              const ext = item.relativePath.substring(extIndex);
              zipPath = `${name} (${counter})${ext}`;
            } else {
              zipPath = `${item.relativePath} (${counter})`;
            }
          } else {
            zipPath = `${item.relativePath} (${counter})`;
          }
          counter++;
        }

        addedPaths.add(zipPath);

        if (item.type === 'folder') {
          archive.append(null, { name: `${zipPath}/` });
        } else if (item.type === 'file' && item.file_id) {
          const fileData = await this.getFileForView(item.file_id, { streamOnly: true });
          if (fileData?.stream) {
            archive.append(fileData.stream, { name: zipPath });
          } else if (fileData?.fileBuffer) {
            archive.append(fileData.fileBuffer, { name: zipPath });
          } else if (fileData?.fullPath) {
            archive.file(fileData.fullPath, { name: zipPath });
          }
        }
      }

      archive.finalize();

      return {
        stream,
        filename: `download_${Date.now()}.zip`,
      };
    }

    const itemsMeta: any[] = await this.filesRepository.getItemsByIds(ids);

    if (!itemsMeta.length) {
      throw new NotFoundException('Không tìm thấy dữ liệu');
    }

    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = new PassThrough();
    archive.pipe(stream);

    for (const item of itemsMeta) {
      if (item.is_directory === 0) {
        const fileData = await this.getFileForView(item.id, { streamOnly: true });
        const zipPath = item.file_name;

        if (fileData?.stream) {
          archive.append(fileData.stream, { name: zipPath });
        } else if (fileData?.fileBuffer) {
          archive.append(fileData.fileBuffer, { name: zipPath });
        } else if (fileData?.fullPath) {
          archive.file(fileData.fullPath, { name: zipPath });
        }
        continue;
      }

      const items = await this.filesRepository.getFolderTree(item.id);

      if (!items.length) continue;

      const map = new Map<number, any>();
      items.forEach(i => map.set(i.id, i));

      for (const child of items) {
        const relativePath = this.buildZipPath(child, item.id, map);
        const zipPath = `${item.file_name}/${relativePath}`;

        if (child.is_directory) {
          archive.append(null, { name: `${zipPath}/` });
        } else {
          const fileData = await this.getFileForView(child.id, { streamOnly: true });

          if (fileData?.stream) {
            archive.append(fileData.stream, { name: zipPath });
          } else if (fileData?.fileBuffer) {
            archive.append(fileData.fileBuffer, { name: zipPath });
          } else if (fileData?.fullPath) {
            archive.file(fileData.fullPath, { name: zipPath });
          }
        }
      }
    }

    archive.finalize();

    return {
      stream,
      filename: `download_${Date.now()}.zip`,
    };
  }




  /** CREATE FOLDER */
  async createFolder(dto: any, userId?: string) {
    const folder_name = dto.folder_name ?? dto.folderName ?? dto.name;
    const rawParentId = dto.parent_id ?? dto.parentId ?? null;
    const rawObjectId = dto.object_id ?? dto.objectId ?? null;
    const object_type = dto.object_type ?? dto.objectType ?? null;
    const parentIdText =
      rawParentId === null || rawParentId === undefined
        ? null
        : String(rawParentId).trim();
    const parent_id =
      parentIdText && /^\d+$/.test(parentIdText)
        ? Number(parentIdText)
        : null;
    const objectIdText =
      rawObjectId === null || rawObjectId === undefined
        ? null
        : String(rawObjectId).trim();
    const object_id =
      objectIdText && /^\d+$/.test(objectIdText)
        ? Number(objectIdText)
        : null;

    const pool = await this.getMsPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      if (parentIdText && parent_id === null) {
        throw new BadRequestException('parent_id phải là số hợp lệ');
      }
      if (object_type && objectIdText && object_id === null) {
        throw new BadRequestException('object_id phải là số hợp lệ');
      }

      const fileName = await this.filesRepository.generateUniqueFileNameFolder(
        folder_name,
        object_type ?? '',
        objectIdText ?? '',
      );
      const folderId = await this.filesRepository.createFolder({
        fileName,
        parent_id,
        description: dto.description,
        userId,
      }, transaction);

      // 2️⃣ TẠO QUAN HỆ FILE_RELATIONS (NẾU CÓ object)
      if (object_type && object_id) {
        await this.filesRepository.createFileRelation({
          object_type,
          object_id,
          file_id: folderId
        }, transaction);

        // Mirror folder relation sang recurring config để giữ nguyên cấu trúc thư mục
        if (object_type === 'taskdocuments') {
          await this.mirrorTaskDocumentFolderToRecurringConfigs(
            transaction,
            object_id,
            folderId,
          );
        }
      }

      await transaction.commit();

      const publicId = await this.filesRepository.getFileUuidById(folderId);
      return {
        public_id: publicId,
        id: folderId,
        name: folder_name,
        object_type: object_type || null,
        object_id: object_id || null,
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async getFilesByObject(
    type: string,
    objectId: string,
    pagination: { page: number; limit: number },
    is_signed_file?: number,
    userId?: string,
    fileName?: string,
  ) {
    const page = +pagination.page > 0 ? +pagination.page : 1;
    const limit = +pagination.limit > 0 ? +pagination.limit : 10;
    const offset = (page - 1) * limit;

    // Nếu object_type là finaldocuments hoặc project, lấy cả file của các task con
    let result;
    if (type === 'finaldocuments') {
      result = await this.filesRepository.getFilesByObjectWithPaginationIncludeChildren(
        type,
        objectId,
        is_signed_file,
        offset,
        limit,
        fileName
      );
    } else if (type === 'project') {
      result = await this.filesRepository.getFilesForProjectWithPagination(
        objectId,
        is_signed_file,
        offset,
        limit,
        fileName
      );
    } else {
      result = await this.filesRepository.getFilesByObjectWithPagination(
        type,
        objectId,
        is_signed_file,
        offset,
        limit,
        fileName
      );
    }

    if (type === 'MeetingTask') {
      try {
        const pool = await this.getMsPool();
        const meetingRes = await pool.request()
          .input('objectId', sql.UniqueIdentifier, objectId)
          .query(`
            SELECT m.ended_at, m.meeting_date, m.meeting_time, m.timezone
            FROM meeting_tasks mt
            JOIN meetings m ON mt.meeting_id = m.id
            WHERE mt.id = @objectId
          `);

        const meeting = meetingRes.recordset[0];
        if (meeting) {
          const tz = meeting.timezone || 'Asia/Ho_Chi_Minh';
          const now = dayjs().tz(tz);
          let endedTime: dayjs.Dayjs | null = null;

          if (meeting.ended_at) {
            endedTime = dayjs(meeting.ended_at).tz(tz);
          } else if (meeting.meeting_time && meeting.meeting_date) {
            const parts = meeting.meeting_time.split('-');
            const endStr = parts[1] ? parts[1].trim() : null;

            if (endStr) {
              let dateStr = '';
              if (typeof meeting.meeting_date === 'string') {
                if (/^\d{4}-\d{2}-\d{2}/.test(meeting.meeting_date)) {
                  dateStr = meeting.meeting_date.substring(0, 10);
                } else {
                  dateStr = dayjs(meeting.meeting_date).format('YYYY-MM-DD');
                }
              } else if (meeting.meeting_date instanceof Date) {
                dateStr = dayjs(meeting.meeting_date).format('YYYY-MM-DD');
              } else {
                dateStr = dayjs(meeting.meeting_date).format('YYYY-MM-DD');
              }

              endedTime = dayjs.tz(`${dateStr} ${endStr}`, 'YYYY-MM-DD HH:mm', tz);
            }
          }

          if (endedTime) {
            const diffMinutes = now.diff(endedTime, 'minute');
            if (diffMinutes >= 30) {
              result.data = result.data.filter(
                (file: any) => !(file.is_recall === 1 || file.is_recall === true || file.isRecall === true)
              );
              result.total = result.data.length;
            }
          }
        }
      } catch (error) {
        this.logger.error('Lỗi khi kiểm tra thời gian cuộc họp trong getFilesByObject:', error);
      }
    }

    const { data: rows, total } = result;

    if (!rows.length) {
      return { data: [], total, page, limit };
    }

    const userIds = [
      ...new Set(rows.map((row) => row.created_by).filter(Boolean)),
    ];

    const users = await this.userRepository.find({
      where: { id: In(userIds) },
      select: ['id', 'name'],
    });

    const userMap = new Map(users.map((user) => [user.id, user.name]));

    // Đồng bộ kiểu id/parent_id theo public_id phục vụ hiển thị cây.
    // Backfill public_id cho dữ liệu cũ nếu còn null để tránh parent_id bị null hàng loạt.
    const idToPublic = new Map<string, string>();
    const allRelatedIds = Array.from(
      new Set(
        rows
          .map((r) => r?.id)
          .filter((v) => v !== null && v !== undefined)
          .map((v) => String(v).trim())
          .filter((v) => /^\d+$/.test(v))
          .filter((v) => v !== ''),
      ),
    );

    if (allRelatedIds.length > 0) {
      const pool = await this.getMsPool();
      const req = pool.request();
      const placeholders = allRelatedIds.map((_, i) => `@pid${i}`).join(',');
      allRelatedIds.forEach((pid, i) => req.input(`pid${i}`, pid));

      const parentRows = await req.query(`
        IF COL_LENGTH('files', 'public_id') IS NOT NULL
        BEGIN
          UPDATE files
          SET public_id = NEWID()
          WHERE id IN (${placeholders})
            AND (public_id IS NULL OR LTRIM(RTRIM(CAST(public_id AS NVARCHAR(36)))) = '');

          SELECT id, CAST(public_id AS NVARCHAR(36)) AS public_id
          FROM files
          WHERE id IN (${placeholders})
        END
        ELSE
        BEGIN
          SELECT id, CAST(NULL AS NVARCHAR(36)) AS public_id
          FROM files
          WHERE id IN (${placeholders})
        END
      `);

      parentRows.recordset.forEach((p: any) => {
        const id = p?.id !== null && p?.id !== undefined ? String(p.id).trim() : '';
        if (id && p?.public_id) {
          idToPublic.set(id, String(p.public_id));
        }
      });
    }

    const data = rows.map((row) => {
      // Kiểm tra file thuộc task cha hay task con
      const isParentTask = String(row.object_id) === String(objectId);

      const fileName = row.file_name?.toLowerCase() || '';
      const mimeType = row.mime_type?.toLowerCase() || '';

      let category = 'OTHER';
      if (mimeType.includes('pdf') || fileName.endsWith('.pdf')) {
        category = 'PDF';
      } else if (
        mimeType.includes('word') ||
        mimeType.includes('officedocument.wordprocessingml') ||
        fileName.endsWith('.doc') ||
        fileName.endsWith('.docx')
      ) {
        category = 'WORD';
      } else if (
        mimeType.includes('excel') ||
        mimeType.includes('officedocument.spreadsheetml') ||
        fileName.endsWith('.xls') ||
        fileName.endsWith('.xlsx') ||
        fileName.endsWith('.csv')
      ) {
        category = 'EXCEL';
      } else if (
        mimeType.includes('presentation') ||
        mimeType.includes('officedocument.presentationml') ||
        fileName.endsWith('.ppt') ||
        fileName.endsWith('.pptx')
      ) {
        category = 'POWERPOINT';
      } else if (
        mimeType.startsWith('image/') ||
        ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'].some(ext => fileName.endsWith(ext))
      ) {
        category = 'IMAGE';
      }

      return {
        ...(() => {
          const { id, ...rest } = row;
          return rest;
        })(),
        id: Number(row?.id),
        public_id: row?.id !== null && row?.id !== undefined ? (idToPublic.get(String(row.id).trim()) ?? null) : null,
        parent_id: row?.parent_id,
        // row?.parent_id !== null && row?.parent_id !== undefined
        //   ? (
        //     row?.parent_public_id
        //       ? String(row.parent_public_id)
        //       : (
        //         /^\d+$/.test(String(row.parent_id).trim())
        //           ? (idToPublic.get(String(row.parent_id).trim()) ?? null)
        //           : null
        //       )
        //   )
        //   : null,
        fileTypeCategory: category,
        type_file: row.is_directory === 1 ? 'Thư mục' : 'File',
        created_by_name: userMap.get(row.created_by) || null,
        task_name: row.task_name || null,
        task_code: row.task_code || null,
        from_task: row.task_name ? `${row.task_code || ''} - ${row.task_name}` : null,
        // Trường tổng hợp: Nếu task cha → người tải, nếu task con → tên task
        from_source: isParentTask
          ? (userMap.get(row.created_by) || 'Không xác định')
          : (row.task_name || 'Không xác định'),
        // Trường phân biệt loại nguồn
        source_type: isParentTask ? 'person' : 'task',
        is_uploader: userId && row.created_by && String(row.created_by) === String(userId) ? true : false,
        is_recall: !!(row.is_recall || row.isRecall),
        isRecall: !!(row.is_recall || row.isRecall),
      };
    });

    return { data, total, page, limit };
  }

  // ===================== DOWNLOAD FILE =====================
  // async getFileForView(
  //   id: number,
  // ): Promise<{ fullPath: string; filename: string; mimetype: string }> {
  //   const [rows]: any = await this.pool.query(
  //     `SELECT file_name, file_path, mime_type FROM files WHERE id = ? AND is_directory = 0 AND status = 1`,
  //     [id],
  //   );

  //   if (!rows.length) {
  //     throw new NotFoundException(`Không tìm thấy file với ID: ${id}`);
  //   }

  //   const fileRecord = rows[0];
  //   const fullPath = path.join(this.uploadBase, fileRecord.file_path);

  //   if (!fs.existsSync(fullPath)) {
  //     throw new NotFoundException('File không tồn tại trên máy chủ');
  //   }

  //   return {
  //     fullPath,
  //     filename: fileRecord.file_name,
  //     mimetype: fileRecord.mime_type || 'application/octet-stream',
  //   };
  // }

  // ===================== DOWNLOAD FILE (NEW) =====================
  async downloadFile(
    id: number,
  ): Promise<{ fullPath: string; filename: string }> {
    const fileRecord = await this.filesRepository.getFilePath(id);

    if (!fileRecord) {
      throw new NotFoundException(`Không tìm thấy file với ID: ${id}`);
    }

    const fullPath = path.join(this.uploadBase, fileRecord.file_path);

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('File vật lý không tồn tại trên máy chủ.');
    }

    return {
      fullPath,
      filename: fileRecord.file_name,
    };
  }

  async deleteFile(id: number, userId?: string) {
    // 1️⃣ Lấy thông tin file
    const file = await this.filesRepository.getFileById(id);
    if (!file) throw new NotFoundException('Không tìm thấy file hoặc file đã bị xóa');

    // Kiểm tra quyền sở hữu, admin, hoặc quyền view
    let isAllowed = false;
    if (userId) {
      if (file.created_by && String(file.created_by) === String(userId)) {
        isAllowed = true;
      } else {
        if (isSuperAdminByKeycloakId(userId)) {
          isAllowed = true;
        } else {
          const canView = await this.filesRepository.canUserViewFile(String(id), userId);
          if (canView) isAllowed = true;
        }
      }
    }

    if (userId && !isAllowed) {
      throw new ForbiddenException('Bạn không có quyền xóa tập tin này');
    }

    const idsToDelete = await this.filesRepository.getFileAndChildren(id);
    if (!idsToDelete) throw new NotFoundException('Không tìm thấy file hoặc file đã bị xóa');

    // Lấy thông tin relation trước khi soft delete để ghi log
    const relation = await this.filesRepository.getLatestRelationByFileId(id);

    // 2️⃣ Nếu là thư mục → lấy toàn bộ cây con
    // Logic đã được chuyển vào getFileAndChildren

    // 3️⃣ Update file_relations
    await this.filesRepository.softDeleteFileRelations(idsToDelete);

    // 4️⃣ Update files
    await this.filesRepository.softDeleteFiles(idsToDelete);

    // Ghi log hành động xóa file
    if (relation && relation.object_id) {
      if (relation.object_type === 'taskdocuments') {
        await this.createLogFromSystem({
          actions: 'DELETE',
          details: `Xóa file công việc`,
          userInfo: userId,
          timestamps: new Date().toISOString(),
          taskId: relation.object_id.toString(),
        });
      } else if (relation.object_type === 'finaldocuments') {
        await this.createLogFromSystem({
          actions: 'DELETE',
          details: `Xóa file kết quả công việc`,
          userInfo: userId,
          timestamps: new Date().toISOString(),
          taskId: relation.object_id.toString(),
        });
      } else if (relation.object_type === 'project') {
        await this.createLogFromSystem({
          actions: 'DELETE',
          details: `Xóa tài liệu dự án`,
          userInfo: userId,
          timestamps: new Date().toISOString(),
          taskId: relation.object_id.toString(),
        });
      }
    }

    return {
      success: true,
      deletedIds: idsToDelete,
    };
  }

  async buildRawFileResponse(
    fileId: number,
    opts?: { backup?: any },
  ) {
    const isBackup = opts?.backup === true || opts?.backup === 'true' || opts?.backup === 1 || opts?.backup === '1';
    let resolvedFileId = fileId;
    if (isBackup) {
      const backup = await this.filesRepository.getBackupByFileId(fileId);
      if (!backup?.id) {
        throw new ConflictException({ message: 'File chưa có backup' });
      }
      resolvedFileId = Number(backup.id);
    }
    const { fileBuffer, fullPath, filename, mimetype } =
      await this.getFileForView(resolvedFileId, { backup: isBackup });
    if (!filename || !mimetype) {
      throw new InternalServerErrorException('Metadata file không hợp lệ');
    }
    // BACKUP MODE → LUÔN CLONE
    if (isBackup) {
      const buffer = await this.loadAsBuffer(fileBuffer, fullPath);
      return {
        mimetype,
        filename,
        body: {
          kind: 'buffer' as const,
          buffer, // buffer clone
        },
      };
    }
    // NORMAL MODE
    if (fileBuffer) {
      return {
        mimetype,
        filename,
        body: {
          kind: 'buffer' as const,
          buffer: fileBuffer,
        },
      };
    }

    if (fullPath) {
      return {
        mimetype,
        filename,
        body: {
          kind: 'stream' as const,
          stream: fs.createReadStream(fullPath),
        },
      };
    }

    throw new BadRequestException('Không thể tìm thấy nội dung file');
  }

  private async loadAsBuffer(
    fileBuffer?: Buffer,
    fullPath?: string,
  ): Promise<Buffer> {
    if (fileBuffer) {
      return Buffer.from(fileBuffer);
    }
    if (!fullPath) {
      throw new InternalServerErrorException('Không có dữ liệu backup');
    }
    return fs.promises.readFile(fullPath);
  }

  async convertDocxToPdf(id: string | number, userId: string, accessToken?: string) {
    const fileId = await this.resolveFileIdOrThrow(id);

    // 1. Parallel initial data fetching
    const [file, config] = await Promise.all([
      this.filesRepository.getFileById(fileId),
      this.getActiveStorageConfig().catch(() => null),
    ]);
    if (!file) {
      throw new NotFoundException('File không tồn tại');
    }

    // Nếu đã là PDF → bỏ qua
    if (
      file.mime_type === 'application/pdf' ||
      file.type === '.pdf' ||
      (file.file_name && file.file_name.toLowerCase().endsWith('.pdf'))
    ) {
      return {
        pdfFileId: fileId,
        name: file.file_name,
        path: path.join(this.uploadBase, file.file_path),
        storageType: file.storage_type,
        storagePath: file.storage_path,
        message: 'File đã là PDF, bỏ qua bước convert',
      };
    }

    // Chỉ hỗ trợ DOCX / DOC
    const isWord =
      file.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === '.docx' ||
      file.type === '.doc' ||
      (file.file_name && (file.file_name.toLowerCase().endsWith('.docx') || file.file_name.toLowerCase().endsWith('.doc')));

    if (!isWord) {
      throw new BadRequestException('Chỉ hỗ trợ convert file Word (DOC/DOCX)');
    }

    const pdfName = file.file_name.replace(file.type || '.docx', '.pdf').replace(/\.doc$/i, '.pdf');

    const outputPath = path.join(
      this.uploadBase,
      path.dirname(file.file_path),
      pdfName,
    );

    const fileUrl = this.buildRawFileUrlForConverter(fileId, accessToken);
    const encodedDocUrl = encodeURIComponent(fileUrl);
    const convertUrl = `${process.env.APP_CONVERT_URL}/doc-url-to-pdf?docUrl=${encodedDocUrl}`;


    // 2. Call convert API (có timeout)
    let response;
    try {
      response = await axios.get(convertUrl, {
        responseType: 'arraybuffer',
        timeout: 15000,
      });
    } catch (error) {
      this.logger?.error?.('[convertDocxToPdf] convert API failed', error?.stack || error);
      throw new BadGatewayException('Không thể convert file');
    }

    const pdfBuffer = Buffer.from(response.data, 'binary');

    // 3. Prepare paths
    const relativePath = path.relative(this.uploadBase, outputPath).replace(/\\/g, '/');
    let finalStoragePath = relativePath;

    if (file.storage_type === 'minio' && config) {
      finalStoragePath = path
        .join(path.dirname(file.storage_path), pdfName)
        .replace(/\\/g, '/');
    }

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 4. FS + DB + MinIO (await all to ensure consistency)
    const tasks: Promise<any>[] = [
      fsPromises.writeFile(outputPath, pdfBuffer),

      this.filesRepository.updateFileConversion(fileId, {
        file_name: pdfName,
        file_path: relativePath,
        mime_type: 'application/pdf',
        file_size: pdfBuffer.length,
        parent_id: file.parent_id || null,
        description: file.description || null,
        storage_path: finalStoragePath,
      }),

      this.filesRepository.createFileRelation({
        object_type: file.object_type || 'default',
        object_id: file.object_id || 0,
        file_id: fileId,
      }),
    ];

    if (file.storage_type === 'minio' && config) {
      tasks.push((async () => {
        const minioClient = await this.getMinioClient(config);
        const tMinio = Date.now();
        await minioClient.putObject(
          config.minio_bucket,
          finalStoragePath,
          pdfBuffer, // Use buffer directly
          pdfBuffer.length,
          { contentType: 'application/pdf' },
        );
      })());
    }

    await Promise.all(tasks);

    return {
      pdfFileId: fileId,
      name: pdfName,
      path: outputPath,
      storageType: file.storage_type,
      storagePath: finalStoragePath,
    };
  }

  async insertTextsToPdfFile(
    dto: InsertTextDto,
    userId: string,
    accessToken?: string,
  ) {
    const { id, texts, auto } = dto;
    const publicId = (dto as any)?.public_id;
    const fileId = await this.resolveFileIdOrThrow(publicId ?? id);

    const file = await this.filesRepository.getFileById(fileId);
    if (!file) throw new NotFoundException('File không tồn tại');

    this.logger.log(`[insertTextsToPdfFile] Start processing: fileId=${fileId}, fileName=${file.file_name}, mimeType=${file.mime_type}, type=${file.type}`);

    const isPdf =
      file.mime_type === 'application/pdf' ||
      file.type === '.pdf' ||
      (file.file_name && file.file_name.toLowerCase().endsWith('.pdf'));

    if (!isPdf) {
      throw new BadRequestException('Chỉ hỗ trợ xử lý file PDF');
    }

    const { storage_type, storage_path } = file;

    // AUTO: gọi thẳng external service truyền file bytes
    if (auto && Array.isArray(auto) && auto.length > 0) {
      let originalPdfBytes: Buffer;
      try {
        const { fullPath, fileBuffer } = await this.getFileForView(fileId);
        if (fileBuffer) {
          originalPdfBytes = fileBuffer;
        } else if (fullPath) {
          originalPdfBytes = await fs.promises.readFile(fullPath);
        } else {
          throw new InternalServerErrorException('Không có dữ liệu file gốc');
        }
      } catch (err) {
        this.logger?.error?.('[insertTextsToPdfFile] load original failed', err?.stack || err);
        throw new InternalServerErrorException('Không đọc được file để chèn chữ');
      }

      const authorizationHeader = accessToken ? `Bearer ${accessToken}` : undefined;

      let username = '';
      if (userId) {
        try {
          const user = await this.userRepository.findOne({ where: { id: userId } });
          if (user) {
            username = user.username || user.emailUser || '';
          }
        } catch (err) {
          this.logger?.warn?.(`[insertTextsToPdfFile] Failed to fetch username for userId=${userId}: ${err.message}`);
        }
      }

      this.logger.log(`[insertTextsToPdfFile] Bắt đầu gọi insertAutoTextsByBytes cho fileId=${fileId}, fileName=${file?.file_name}, typeFile=pdf`);
      let newPdfBytes: Uint8Array;
      try {
        newPdfBytes = await this.insertAutoTextsByBytes(auto, 'pdf', originalPdfBytes, authorizationHeader, {
          username,
          reason: dto.reason || 'Ký số điện tử',
          location: dto.location || 'Việt Nam',
          signatureLevel: dto.signatureLevel || 'B',
          fileName: file?.file_name,
        });
        this.logger.log(`[insertTextsToPdfFile] Gọi insertAutoTextsByBytes thành công cho fileId=${fileId}, fileName=${file?.file_name}`);
      } catch (err) {
        const detail = this.getExternalServiceErrorMessage(err);
        this.logger?.error?.('[insertTextsToPdfFile] AUTO external service failed', detail || err?.stack || err);
        throw new BadGatewayException(`External service xử lý PDF thất bại${detail ? `: ${detail}` : ''}`);
      }

      try {
        await this.writePdfToPrimaryStorage(fileId, storage_type, storage_path, newPdfBytes, userId);
      } catch (err) {
        this.logger?.error?.('[insertTextsToPdfFile] AUTO write storage failed', err?.stack || err);
        throw new InternalServerErrorException('Ghi file PDF thất bại');
      }

      return { status: 1, message: 'Auto text inserted via external service' };
    }

    if (!texts || Object.keys(texts).length === 0) {
      throw new BadRequestException('Cần truyền texts hoặc auto');
    }

    // MANUAL: cần backup PDF hợp lệ
    const backupInfo = await this.getOrCreatePdfBackup(fileId);

    let originalPdfBytes: Buffer;
    try {
      originalPdfBytes = await this.loadBackupPdfBytes(backupInfo);
    } catch (err) {
      this.logger?.error?.('[insertTextsToPdfFile] MANUAL load backup failed', err?.stack || err);
      throw new InternalServerErrorException('Không tải được PDF backup');
    }

    // Validate PDF magic bytes (%PDF)
    if (
      originalPdfBytes.length < 4 ||
      originalPdfBytes[0] !== 0x25 ||
      originalPdfBytes[1] !== 0x50 ||
      originalPdfBytes[2] !== 0x44 ||
      originalPdfBytes[3] !== 0x46
    ) {
      throw new InternalServerErrorException('PDF backup không hợp lệ');
    }

    let pdfDoc: PDFDocument;
    try {
      pdfDoc = await PDFDocument.load(originalPdfBytes);
    } catch (err) {
      this.logger?.error?.('[insertTextsToPdfFile] PDFDocument.load failed', err?.stack || err);
      throw new InternalServerErrorException('Không thể parse PDF backup');
    }

    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const page = pdfDoc.getPages()[0];
    if (!page) throw new InternalServerErrorException('PDF backup không có trang nào');
    const { height } = page.getSize();
    this.insertManualTexts(page, height, font, texts);

    let newBytes: Uint8Array;
    try {
      newBytes = await pdfDoc.save();
    } catch (err) {
      this.logger?.error?.('[insertTextsToPdfFile] pdfDoc.save failed', err?.stack || err);
      throw new InternalServerErrorException('Lưu PDF thất bại');
    }

    try {
      await this.writePdfToPrimaryStorage(fileId, storage_type, storage_path, newBytes, userId);
    } catch (err) {
      this.logger?.error?.('[insertTextsToPdfFile] MANUAL write storage failed', err?.stack || err);
      throw new InternalServerErrorException('Ghi file PDF thất bại');
    }

    this.logger.log(`[insertTextsToPdfFile] Finished MANUAL process successfully: fileId=${fileId}, fileName=${file.file_name}`);
    return { status: 1, message: 'Text inserted into PDF successfully' };
  }

  async insertUserInfoToPdfFile(id: string | number, auto: any[] = [], assignment?: string, accessToken?: string) {
    const autoReplacements = Array.isArray(auto) ? [...auto] : [];

    const targetUserId = assignment;

    let hoTen = '';
    let chucDanh = '';

    if (targetUserId) {
      try {
        const user = await this.userRepository.findOne({ where: { id: targetUserId } });
        if (user) {
          const isValid = (val: any) => {
            if (val === null || val === undefined) return false;
            const str = String(val).trim().toLowerCase();
            return str !== '' && str !== 'null';
          };
          hoTen = isValid(user.fullName) ? (user.fullName as string) : (isValid(user.name) ? (user.name as string) : '');
          chucDanh = isValid(user.position) ? (user.position as string) : '';
        }
      } catch (err) {
        this.logger?.error?.(`[insertUserInfoToPdfFile] Failed to fetch user info for targetUserId=${targetUserId}`, err?.stack || err);
      }
    }

    if (!autoReplacements.find((a) => a.key === '[nam]')) {
      autoReplacements.push({ key: '[nam]', value: hoTen });
    }
    if (!autoReplacements.find((a) => a.key === '[bon]')) {
      autoReplacements.push({ key: '[bon]', value: chucDanh });
    }

    return this.insertTextsToPdfFileWithConverter({ id, auto: autoReplacements, texts: {} }, targetUserId || '', accessToken);
  }

  private async writePdfToPrimaryStorage(
    fileId: number,
    storageType: string,
    storagePath: string,
    pdfBytes: Uint8Array,
    userId: string,
  ) {
    const buffer = Buffer.from(pdfBytes);

    await this.filesRepository.updateFileMetadataAfterOverwrite({
      fileId,
      storagePath,
      storageType,
      fileSize: pdfBytes.length,
      mimeType: 'application/pdf',
      updatedBy: userId,
    });

    if (storageType === 'minio') {
      const t0 = Date.now();
      const config = await this.getActiveStorageConfig();
      const minioClient = await this.getMinioClient(config);
      await minioClient.putObject(
        config.minio_bucket,
        storagePath,
        buffer,
        buffer.length,
        { contentType: 'application/pdf' },
      );
      return;
    }

    await fs.promises.writeFile(storagePath, buffer);
  }

  // Fast path: backup tồn tại → return ngay. Slow path: load file gốc, validate, tạo backup. Race condition: duplicate key → query lại.
  private async getOrCreatePdfBackup(fileId: number): Promise<{ storage_type: string; storage_path: string }> {
    const existing = await this.filesRepository.getBackupByFileId(fileId);
    if (existing) return existing as { storage_type: string; storage_path: string };

    const fileInfo = await this.filesRepository.getFileStorageInfo(fileId);
    if (!fileInfo) throw new NotFoundException('File không tồn tại');

    let buffer: Buffer;
    try {
      const { fullPath, fileBuffer } = await this.getFileForView(fileId);
      if (fileBuffer) {
        buffer = fileBuffer;
      } else if (fullPath) {
        buffer = await fs.promises.readFile(fullPath);
      } else {
        throw new InternalServerErrorException('Không có dữ liệu file gốc');
      }
    } catch (err) {
      this.logger?.error?.('[getOrCreatePdfBackup] load original failed', err?.stack || err);
      if (err?.status) throw err;
      throw new InternalServerErrorException('Không đọc được file gốc');
    }

    // Validate PDF magic bytes (%PDF)
    if (buffer.length < 4 || buffer[0] !== 0x25 || buffer[1] !== 0x50 || buffer[2] !== 0x44 || buffer[3] !== 0x46) {
      this.logger?.error?.(`[getOrCreatePdfBackup] invalid PDF magic fileId=${fileId}`);
      throw new InternalServerErrorException('File gốc không phải PDF hợp lệ');
    }

    const backupPath = fileInfo.storage_path.replace(/\.pdf$/, '-backup.pdf');

    try {
      if (fileInfo.storage_type === 'minio') {
        const t0 = Date.now();
        const config = await this.getActiveStorageConfig();
        const minioClient = await this.getMinioClient(config);
        await minioClient.putObject(config.minio_bucket, backupPath, buffer, buffer.length, { contentType: 'application/pdf' });
      } else {
        const backupFullPath = path.join(this.uploadBase, backupPath);
        await fs.promises.mkdir(path.dirname(backupFullPath), { recursive: true });
        await fs.promises.writeFile(backupFullPath, buffer);
      }
    } catch (err) {
      this.logger?.error?.('[getOrCreatePdfBackup] write backup storage failed', err?.stack || err);
      throw new InternalServerErrorException('Ghi backup storage thất bại');
    }

    try {
      await this.filesRepository.createBackupIfNotExists({ fileId, storagePath: backupPath, fileSize: buffer.length });
    } catch (err) {
      // Duplicate key → race condition, backup đã được tạo bởi request song song
      const isDuplicateKey = err?.number === 2627 || err?.number === 2601 || err?.code === 'ER_DUP_ENTRY';
      if (isDuplicateKey) {
        const retried = await this.filesRepository.getBackupByFileId(fileId);
        if (retried) return retried as { storage_type: string; storage_path: string };
      }
      this.logger?.error?.('[getOrCreatePdfBackup] createBackup DB failed', err?.stack || err);
      throw new InternalServerErrorException('Tạo backup thất bại');
    }

    const created = await this.filesRepository.getBackupByFileId(fileId);
    if (!created) throw new InternalServerErrorException('Backup không tồn tại sau khi tạo');
    return created as { storage_type: string; storage_path: string };
  }

  private async loadBackupPdfBytes(backup: { storage_type: string; storage_path: string }): Promise<Buffer> {
    if (backup.storage_type === 'minio') {
      const t0 = Date.now();
      const config = await this.getActiveStorageConfig();
      const minioClient = await this.getMinioClient(config);
      const stream = await minioClient.getObject(config.minio_bucket, backup.storage_path);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const buf = Buffer.concat(chunks);
      return buf;
    }

    const fullPath = path.join(this.uploadBase, backup.storage_path);
    if (!fs.existsSync(fullPath)) {
      throw new InternalServerErrorException(`Backup file không tồn tại: ${fullPath}`);
    }
    return fs.promises.readFile(fullPath);
  }

  private insertManualTexts(
    page: any,
    height: number,
    font: any,
    texts?: Record<string, ManualTextItem>,
  ) {
    if (!texts) return;
    Object.values(texts).forEach((item) => {
      if (
        !item ||
        !item.content ||
        item.x == null ||
        item.y == null
      ) {
        return;
      }
      page.drawText(String(item.content), {
        x: Number(item.x),
        y: height - Number(item.y),
        size: Number(item.fontSize) || 16,
        font,
      });
    });
  }

  private buildRawFileUrlForConverter(fileId: number, accessToken?: string): string {
    const tokenSuffix = accessToken ? `?accessToken=${encodeURIComponent(accessToken)}` : '';
    const baseUrl = this.getConverterReachableNestBaseUrl();
    return `${baseUrl}/api/files/raw/${fileId}${tokenSuffix}`;
  }

  private getConverterReachableNestBaseUrl(): string {
    const configuredNestUrl = (process.env.URL_NESTJS || '').trim().replace(/\/+$/, '');
    const port = (process.env.PORT || '3156').trim();
    const convertUrl = (process.env.APP_CONVERT_URL || '').trim();

    try {
      const parsedConvertUrl = new URL(convertUrl);
      const convertHost = parsedConvertUrl.hostname.toLowerCase();
      if (['localhost', '127.0.0.1', '::1', '[::1]'].includes(convertHost)) {
        return `http://localhost:${port}`;
      }
    } catch {
      // Fall back to URL_NESTJS below when APP_CONVERT_URL is not parseable.
    }

    return configuredNestUrl || `http://localhost:${port}`;
  }
  private getExternalServiceErrorMessage(error: any): string {
    const data = error?.response?.data;
    const fallback = error?.message || '';

    try {
      const raw = Buffer.isBuffer(data)
        ? data.toString('utf8')
        : data instanceof ArrayBuffer
          ? Buffer.from(data).toString('utf8')
          : typeof data === 'string'
            ? data
            : data
              ? JSON.stringify(data)
              : '';

      if (!raw) return fallback;

      try {
        const parsed = JSON.parse(raw);
        return parsed?.message || parsed?.error || raw;
      } catch {
        return raw;
      }
    } catch {
      return fallback;
    }
  }
  async insertTextsToPdfFileWithConverter(dto: InsertTextDto, userId: string, accessToken?: string) {
    const { id, texts, auto } = dto;
    const publicId = (dto as any)?.public_id;
    const fileId = await this.resolveFileIdOrThrow(publicId ?? id);

    const fileInfo = await this.filesRepository.getFileStorageInfo(fileId);
    if (!fileInfo) throw new NotFoundException('File không tồn tại');
    const { storage_type, storage_path } = fileInfo;

    // AUTO: bỏ qua load PDF local, gọi thẳng converter service
    if (auto && Array.isArray(auto) && auto.length > 0) {
      const fileUrl = this.buildRawFileUrlForConverter(fileId, accessToken);
      const authorizationHeader = accessToken ? `Bearer ${accessToken}` : undefined;

      let newPdfBytes: Uint8Array;
      try {
        newPdfBytes = await this.insertAutoTextsByConverterUrl(auto, 'pdf', fileUrl, authorizationHeader);
      } catch (err) {
        const detail = this.getExternalServiceErrorMessage(err);
        this.logger?.error?.('[insertTextsToPdfFileWithConverter] AUTO external service failed', detail || err?.stack || err);
        throw new BadGatewayException(`External service xử lý PDF thất bại${detail ? `: ${detail}` : ''}`);
      }

      try {
        await this.writePdfToPrimaryStorage(fileId, storage_type, storage_path, newPdfBytes, userId);
      } catch (err) {
        this.logger?.error?.('[insertTextsToPdfFileWithConverter] AUTO write storage failed', err?.stack || err);
        throw new InternalServerErrorException('Ghi file PDF thất bại');
      }

      return { status: 1, message: 'Auto text inserted via converter service' };
    }

    if (!texts || Object.keys(texts).length === 0) {
      throw new BadRequestException('Cần truyền texts hoặc auto');
    }

    // MANUAL:
    const backupInfo = await this.getOrCreatePdfBackup(fileId);

    let originalPdfBytes: Buffer;
    try {
      originalPdfBytes = await this.loadBackupPdfBytes(backupInfo);
    } catch (err) {
      this.logger?.error?.('[insertTextsToPdfFileWithConverter] MANUAL load backup failed', err?.stack || err);
      throw new InternalServerErrorException('Không tải được PDF backup');
    }

    // Validate PDF magic bytes (%PDF)
    if (
      originalPdfBytes.length < 4 ||
      originalPdfBytes[0] !== 0x25 ||
      originalPdfBytes[1] !== 0x50 ||
      originalPdfBytes[2] !== 0x44 ||
      originalPdfBytes[3] !== 0x46
    ) {
      throw new InternalServerErrorException('PDF backup không hợp lệ');
    }

    let pdfDoc: PDFDocument;
    try {
      pdfDoc = await PDFDocument.load(originalPdfBytes);
    } catch (err) {
      this.logger?.error?.('[insertTextsToPdfFileWithConverter] PDFDocument.load failed', err?.stack || err);
      throw new InternalServerErrorException('Không thể parse PDF backup');
    }

    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const page = pdfDoc.getPages()[0];
    if (!page) throw new InternalServerErrorException('PDF backup không có trang nào');
    const { height } = page.getSize();
    this.insertManualTexts(page, height, font, texts);

    let newBytes: Uint8Array;
    try {
      newBytes = await pdfDoc.save();
    } catch (err) {
      this.logger?.error?.('[insertTextsToPdfFileWithConverter] pdfDoc.save failed', err?.stack || err);
      throw new InternalServerErrorException('Lưu PDF thất bại');
    }

    try {
      await this.writePdfToPrimaryStorage(fileId, storage_type, storage_path, newBytes, userId);
    } catch (err) {
      this.logger?.error?.('[insertTextsToPdfFileWithConverter] MANUAL write storage failed', err?.stack || err);
      throw new InternalServerErrorException('Ghi file PDF thất bại');
    }

    return { status: 1, message: 'Text inserted into PDF successfully' };
  }

  async insertAutoTextsByConverterUrl(
    auto: any[],
    typeFile: string,
    fileUrl: string,
    authorization?: string
  ): Promise<Uint8Array> {
    if (!auto || !Array.isArray(auto) || auto.length === 0) {
      throw new BadRequestException('Auto data is required');
    }

    const normalizedAuto = auto.map((item) => {
      if (!item || typeof item !== 'object') throw new BadRequestException('Invalid auto item');
      const key = String(item.key ?? '').trim();
      let value = item.value != null ? String(item.value) : '';
      if (key === 'number') {
        const trimmed = value.trim();
        if (trimmed && !trimmed.toLowerCase().startsWith('số:')) value = `Số: ${trimmed}`;
      }
      return { ...item, key, value };
    });

    const url = `${process.env.APP_CONVERT_URL}/replace-text-in-pdf-tcsg?docUrl=${encodeURIComponent(fileUrl)}`;

    const payload = { data: normalizedAuto };

    try {
      const axiosConfig: any = {
        method: 'post',
        url,
        data: payload,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        responseType: 'arraybuffer',
      };

      if (authorization) {
        axiosConfig.headers = {
          ...axiosConfig.headers,
          Authorization: authorization,
        };
      }

      const response = await axios(axiosConfig);

      if (response.status !== 200 || !response.data) {
        throw new Error(`Convert service failed: ${response.status}`);
      }
      return new Uint8Array(response.data);
    } catch (error: any) {
      const res = error?.response;
      const data = res?.data;

      const responseDataSize = Buffer.isBuffer(data)
        ? data.length
        : data
          ? Buffer.byteLength(JSON.stringify(data))
          : 0;
      console.error('Converter status:', res?.status);
      console.error('Converter response summary:', {
        dataType: Buffer.isBuffer(data) ? 'buffer' : typeof data,
        dataSize: responseDataSize,
      });
      console.error('Converter request summary:', {
        autoCount: normalizedAuto.length,
        typeFile,
        hasFileUrl: Boolean(fileUrl),
        hasAuthorization: Boolean(authorization),
      });

      throw new InternalServerErrorException(`Failed to auto insert texts: ${error.message}`);
    }
  }

  async insertAutoTextsByBytes(
    auto: any[],
    typeFile: string,
    fileBuffer: Buffer,
    authorization?: string,
    options?: { username?: string; reason?: string; location?: string; signatureLevel?: string; fileName?: string }
  ): Promise<Uint8Array> {
    this.logger.log(`[insertAutoTextsByBytes] Bắt đầu chèn chữ tự động cho user: ${options?.username || 'unknown'}, fileName: ${options?.fileName || 'unknown'}, typeFile: ${typeFile}`);
    if (!auto || !Array.isArray(auto) || auto.length === 0) {
      throw new BadRequestException('Auto data is required');
    }

    const filteredAuto = (auto || []).filter(item => item && item.key && String(item.key).trim() !== '');

    const normalizedAuto = filteredAuto.map((item) => {
      if (!item || typeof item !== 'object') throw new BadRequestException('Invalid auto item');
      let key = String(item.key ?? '').trim();
      if (key) {
        if (!key.startsWith('[')) key = `[${key}`;
        if (!key.endsWith(']')) key = `${key}]`;
      }
      let value = item.value != null ? String(item.value) : '';
      if (key === 'number' || key === '[number]') {
        const trimmed = value.trim();
        if (trimmed && !trimmed.toLowerCase().startsWith('số:')) value = `Số: ${trimmed}`;
      }
      return { ...item, key, value };
    });

    if (!process.env.URL_SERVICE_SIGNING) {
      throw new InternalServerErrorException('Chưa cấu hình biến môi trường URL_SERVICE_SIGNING');
    }
    const url = `${process.env.URL_SERVICE_SIGNING}api/sign/insert-texts`;
    this.logger.log(`[insertAutoTextsByBytes] Gọi service ngoài qua URL: ${url}`);

    const payload = {
      data: normalizedAuto,
      username: options?.username,
      reason: options?.reason,
      location: options?.location,
      signatureLevel: options?.signatureLevel,
    };

    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: 'document.pdf',
      contentType: 'application/pdf',
    });
    formData.append('payload', JSON.stringify(payload));

    try {
      const axiosConfig: any = {
        method: 'post',
        url,
        data: formData,
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        responseType: 'arraybuffer',
      };

      // Thêm Authorization header nếu có
      if (authorization) {
        axiosConfig.headers = {
          ...axiosConfig.headers,
          Authorization: authorization,
        };
      }

      const response = await axios(axiosConfig);

      if (response.status !== 200 || !response.data) {
        throw new Error(`Signing service failed: ${response.status}`);
      }
      this.logger.log(`[insertAutoTextsByBytes] Chèn chữ tự động thành công cho fileName: ${options?.fileName || 'unknown'}`);
      return new Uint8Array(response.data);
    } catch (error: any) {
      const res = error?.response;
      const data = res?.data;

      const responseDataSize = Buffer.isBuffer(data)
        ? data.length
        : data
          ? Buffer.byteLength(JSON.stringify(data))
          : 0;
      console.error('Signing service status:', res?.status);
      console.error('Signing service response summary:', {
        dataType: Buffer.isBuffer(data) ? 'buffer' : typeof data,
        dataSize: responseDataSize,
      });
      console.error('Signing service request summary:', {
        autoCount: normalizedAuto.length,
        typeFile,
        hasFileBuffer: Boolean(fileBuffer),
        fileSize: fileBuffer?.length || 0,
        hasAuthorization: Boolean(authorization),
      });

      throw new InternalServerErrorException(`Failed to auto insert texts via signing service: ${error.message}`);
    }
  }

  async previewTextToPdfFile(
    dto: InsertTextDto,
  ): Promise<{ data: string }> {
    const { id, texts, newFile } = dto;
    const fileId = Number(id);

    // 1. Validate boundary
    if (!fileId || !texts || Object.keys(texts).length === 0) {
      throw new BadRequestException('Thiếu thông tin bắt buộc');
    }

    let pdfBytes: Buffer;

    // 2. Resolve source PDF
    if (newFile) {
      /**
       * PREVIEW FILE MỚI
       * - PDF → load trực tiếp
       * - DOCX → convert → PDF (in-memory)
       */
      const file = await this.filesRepository.getFileById(fileId);
      if (!file) {
        throw new NotFoundException('File không tồn tại');
      }

      const isPdf =
        file.mime_type === 'application/pdf' || file.type === '.pdf';

      const isDocx =
        file.mime_type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === '.docx';

      if (isPdf) {
        const { fileBuffer, fullPath } =
          await this.getFileForView(fileId);

        if (fileBuffer) {
          pdfBytes = fileBuffer;
        } else if (fullPath && fs.existsSync(fullPath)) {
          pdfBytes = await fs.promises.readFile(fullPath);
        } else {
          throw new NotFoundException('Không load được PDF');
        }
      } else if (isDocx) {
        const fileUrl =
          `${process.env.URL_NESTJS}/api/files/raw/${fileId}`;

        const response = await axios.get(
          `${process.env.APP_CONVERT_URL}/doc-url-to-pdf?docUrl=${encodeURIComponent(
            fileUrl,
          )}`,
          { responseType: 'arraybuffer' },
        );

        pdfBytes = Buffer.from(response.data);
      } else {
        throw new BadRequestException('Chỉ hỗ trợ PDF hoặc DOCX');
      }
    } else {
      /**
       * PREVIEW FILE ĐÃ TỒN TẠI
       * → BẮT BUỘC dùng BACKUP
       */
      const { body, mimetype } =
        await this.buildRawFileResponse(fileId, { backup: true });

      if (mimetype !== 'application/pdf') {
        throw new BadRequestException('Backup không phải PDF');
      }

      if (body.kind !== 'buffer') {
        throw new InternalServerErrorException(
          'Preview chỉ hỗ trợ buffer backup',
        );
      }

      pdfBytes = body.buffer;
    }

    // 3. Validate PDF magic
    if (
      pdfBytes.length < 4 ||
      pdfBytes[0] !== 0x25 || // %
      pdfBytes[1] !== 0x50 || // P
      pdfBytes[2] !== 0x44 || // D
      pdfBytes[3] !== 0x46    // F
    ) {
      throw new InternalServerErrorException('PDF không hợp lệ');
    }

    // 4. Modify PDF in-memory
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    const page = pdfDoc.getPages()[0];
    if (!page) {
      throw new NotFoundException('PDF trống');
    }

    const { height } = page.getSize();

    Object.values(texts).forEach((item: any) => {
      if (
        !item ||
        !item.content ||
        item.x == null ||
        item.y == null
      ) {
        return;
      }

      page.drawText(String(item.content), {
        x: Number(item.x),
        y: height - Number(item.y),
        size: Number(item.fontSize) || 16,
        font,
      });
    });

    // 5. Return base64
    const newBytes = await pdfDoc.save();

    return {
      data: Buffer.from(newBytes).toString('base64'),
    };
  }


  async getFileHistory(fileId: number) {
    // 1) Lấy file hiện tại
    const pool = await this.getMsPool();
    const currentRes = await pool
      .request()
      .input('fileId', sql.Int, fileId).query(`
      SELECT TOP 1 id, parent_id, updated_at
      FROM files
      WHERE id = @fileId
    `);

    const current = currentRes.recordset?.[0];
    if (!current) throw new Error('File không tồn tại');

    // 2) Xác định rootId: nếu là bản con thì rootId = parent_id, còn không thì rootId = id
    const rootId = current.parent_id
      ? Number(current.parent_id)
      : Number(current.id);

    // Get updated timestamp for key generation
    const updatedAt = current.updated_at;
    const updatedTimestamp = updatedAt ? new Date(updatedAt).getTime() : Date.now();

    // 3) Lấy versions: bản gốc + tất cả bản con trực tiếp của root
    const pool2 = await this.getMsPool();
    const versionsRes = await pool2
      .request()
      .input('rootId', sql.Int, rootId).query(`
      SELECT id, parent_id, created_at, created_by, updated_at, version
      FROM files
      WHERE id = @rootId OR parent_id = @rootId
      ORDER BY
        TRY_CONVERT(decimal(10,2), version) ASC,
        created_at ASC
    `);

    const versions: any[] = versionsRes.recordset || [];

    const userIds = [
      ...new Set(versions.map((v) => v.created_by).filter(Boolean)),
    ];
    let users: any[] = [];

    if (userIds.length > 0) {
      users = await this.userRepository.find({
        where: { id: In(userIds) },
        select: ['id', 'name'],
      });
    }

    const userMap = new Map();
    users.forEach((u) => userMap.set(u.id, u.name));

    // 4) currentVersion = max(version) (không dùng history.length)
    const currentVersion = versions.length
      ? Math.trunc(Math.max(...versions.map((v) => Number(v.version) || 1)))
      : 1;


    const toVNTime = (d: any) => {
      const date = new Date(d);
      const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000); // +07
      return vn.toISOString().slice(0, 19).replace('T', ' ');
    };

    // 5) history chỉ chứa version cũ hơn currentVersion (và version lấy từ DB)
    const history = versions
      .map((v: any) => {
        const ver = Math.trunc(Number(v.version) || 1);
        return {
          version: ver,
          key: `file-${rootId}-v${ver}`,
          created: toVNTime(v.updated_at || v.created_at),
          user: {
            id: (v.created_by ?? 'unknown').toString(),
            name: userMap.get(v.created_by) ?? 'Người dùng',
          },
          __fileRowId: Number(v.id), // giữ nội bộ để map /history/:version
        };
      })
      .filter((h) => h.version < currentVersion);

    return { rootId, currentVersion, history, updatedTimestamp };
  }

  // file.service.ts

  async getFileHistoryVersion(fileId: number, versionIndex: number) {
    // 1) Lấy bản hiện tại để xác định root
    const pool = await this.getMsPool();
    const currentRes = await pool
      .request()
      .input('fileId', sql.Int, fileId).query(`
      SELECT TOP 1 *
      FROM files
      WHERE id = @fileId
    `);

    const current = currentRes.recordset?.[0];
    if (!current) throw new Error('File không tồn tại');

    const rootId = current.parent_id ?? current.id;

    // 2) Lấy toàn bộ versions theo root
    const pool2 = await this.getMsPool();
    const versionsRes = await pool2
      .request()
      .input('rootId', sql.Int, rootId).query(`
      SELECT *
      FROM files
      WHERE id = @rootId OR parent_id = @rootId
      ORDER BY 
        TRY_CONVERT(decimal(18,4), version) ASC,
        id ASC
    `);

    const versions = versionsRes.recordset || [];

    if (!versions.length) throw new Error('Không có version nào');
    if (versionIndex < 1 || versionIndex > versions.length) {
      throw new Error('Version không hợp lệ');
    }

    const currentVersionRow = versions[versionIndex - 1];
    const previousVersionRow =
      versionIndex > 1 ? versions[versionIndex - 2] : null;

    return {
      rootId,
      currentVersionRow,
      previousVersionRow,
      currentIndex: versionIndex,
    };
  }

  /** Update file_relations object_id sau khi có ID thực */
  async updateFileRelation(
    fileId: number,
    objectType: string,
    objectId: string,
  ) {
    try {
      const pool = await this.getMsPool();
      const request = pool.request();
      request.input('file_id', fileId);
      request.input('object_type', objectType);
      request.input('object_id', objectId);

      // Update existing relation hoặc tạo mới nếu chưa có
      const checkResult = await request.query(`
        SELECT id FROM file_relations 
        WHERE file_id = @file_id AND object_type = @object_type
      `);

      if (checkResult.recordset.length > 0) {
        // Update
        const pool2 = await this.getMsPool();
        await pool2
          .request()
          .input('file_id', fileId)
          .input('object_type', objectType)
          .input('object_id', objectId).query(`
            UPDATE file_relations 
            SET object_id = @object_id, status = 1
            WHERE file_id = @file_id AND object_type = @object_type
          `);
      } else {
        // Insert
        const pool3 = await this.getMsPool();
        await pool3
          .request()
          .input('file_id', fileId)
          .input('object_type', objectType)
          .input('object_id', objectId).query(`
            INSERT INTO file_relations (object_type, object_id, file_id, status)
            VALUES (@object_type, @object_id, @file_id, 1)
          `);
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating file relation:', error);
      throw new InternalServerErrorException('Lỗi khi cập nhật file relation');
    }
  }

  async removeMany(ids: number[], userId?: string) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('Cần cung cấp danh sách ID để xóa.');
    }

    const pool = await this.getMsPool();
    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();

      // Kiểm tra quyền sở hữu, quyền admin, quyền view cho tất cả các file
      if (userId) {
        for (const id of ids) {
          const file = await this.filesRepository.getFileById(id, transaction);
          if (file) {
            let isAllowed = false;
            if (file.created_by && String(file.created_by) === String(userId)) {
              isAllowed = true;
            } else {
              if (isSuperAdminByKeycloakId(userId)) {
                isAllowed = true;
              } else {
                const canView = await this.filesRepository.canUserViewFile(String(id), userId);
                if (canView) isAllowed = true;
              }
            }

            if (!isAllowed) {
              throw new ForbiddenException(`Bạn không có quyền xóa tập tin: ${file.file_name}`);
            }
          }
        }
      }

      const request = transaction.request();
      // Chuyển danh sách ids thành table-valued parameter hoặc dùng IN với @id1, @id2, ...
      ids.forEach((id, idx) => request.input(`id${idx}`, id));
      const placeholders = ids.map((_, idx) => `@id${idx}`).join(',');

      await this.filesRepository.softDeleteFileRelations(ids, transaction);
      const affected = await this.filesRepository.softDeleteFiles(ids, transaction);
      await transaction.commit();

      return {
        message: `Đã xóa thành công ${affected} file/thư mục.`,
      };
    } catch (error) {
      console.error('Lỗi khi xóa file:', error);
      await transaction.rollback();
      throw new InternalServerErrorException('Lỗi khi xóa file.');
    }
  }

  async updateFileById(id: number, fileBuffer: Buffer) {
    const file = await this.filesRepository.getFileById(id);
    if (!file) {
      throw new NotFoundException(`File with id ${id} not found`);
    }

    const fullPath = path.join(this.uploadBase, file.file_path);

    // Ghi đè file vật lý
    fs.writeFileSync(fullPath, fileBuffer);

    // Cập nhật size và thời gian trong DB
    await this.filesRepository.updateFileSizeAndDate(id, fileBuffer.length);

    return { success: true };
  }
  async updateOrDownload2(body: any, userId: string) {
    const NEXTCLOUD_URL = process.env.NEXTCLOUD_URL;
    const NEXTCLOUD_USERNAME = process.env.NEXTCLOUD_USERNAME;
    const NEXTCLOUD_PASSWORD = process.env.NEXTCLOUD_PASSWORD;
    const LOCAL_DOWNLOAD_PATH = process.env.LOCAL_DOWNLOAD_PATH;

    if (
      !NEXTCLOUD_URL ||
      !NEXTCLOUD_USERNAME ||
      !NEXTCLOUD_PASSWORD ||
      !LOCAL_DOWNLOAD_PATH
    ) {
      throw new InternalServerErrorException(
        'Thiếu cấu hình môi trường cho NextCloud hoặc LOCAL_DOWNLOAD_PATH',
      );
    }

    const {
      file_name,
      folder_name,
      object_type,
      object_id,
      edit_file_id,
      description,
      download_path,
    } = body;
    if (!file_name || !folder_name) {
      throw new BadRequestException('Thiếu file_name hoặc folder_name');
    }

    const pool = await this.getMsPool();
    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();

      const urls = [
        `${NEXTCLOUD_URL}/remote.php/dav/files/${NEXTCLOUD_USERNAME}/${folder_name}/${file_name}`,
        `${NEXTCLOUD_URL}/remote.php/dav/files/${NEXTCLOUD_USERNAME}/${folder_name}/${encodeURIComponent(file_name)}`,
        `${NEXTCLOUD_URL}/remote.php/dav/files/${NEXTCLOUD_USERNAME}/${folder_name}/${file_name.replace(/ /g, '%20')}`,
      ];

      let fileBuffer: Buffer | null = null;
      let lastError: unknown = null;

      for (const url of urls) {
        try {
          const response = await axios.get(url, {
            auth: {
              username: NEXTCLOUD_USERNAME,
              password: NEXTCLOUD_PASSWORD,
            },
            responseType: 'arraybuffer',
            timeout: 30000,
          });
          fileBuffer = Buffer.from(response.data);
          break;
        } catch (err) {
          lastError = err;
        }
      }

      if (!fileBuffer) {
        const message =
          lastError instanceof Error ? lastError.message : 'Unknown error';
        throw new NotFoundException(
          `Không thể tải file từ NextCloud: ${message}`,
        );
      }

      const targetPath = download_path || LOCAL_DOWNLOAD_PATH;
      const fullFolderPath = path.join(targetPath, folder_name);
      if (!fs.existsSync(fullFolderPath)) {
        await fsPromises.mkdir(fullFolderPath, { recursive: true });
      }

      const filePath = path.join(fullFolderPath, file_name);
      await fsPromises.writeFile(filePath, fileBuffer);

      // Tạo mock Multer file
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: file_name,
        encoding: '7bit',
        mimetype: this.getMimeType(file_name),
        size: fileBuffer.length,
        destination: path.dirname(filePath),
        filename: file_name,
        path: filePath,
        buffer: fileBuffer,
        stream: null,
      } as any;

      const dto: UploadFileDto = {
        file: null,
        object_type: object_type || 'default',
        object_id: object_id || '0',
        parent_id: undefined,
        description: description || null,
      } as any;

      if (edit_file_id) dto.edit_file_id = edit_file_id;

      // MSSQL: dùng pool + transaction
      const result = await this.uploadFile(dto, mockFile, userId);

      // Xóa file tạm
      try {
        await fsPromises.unlink(filePath);
      } catch (err) {
      }

      await transaction.commit();

      return {
        status: true,
        message: 'Download và upload thành công',
        data: result,
      };
    } catch (error) {
      await transaction.rollback();
      const msg = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(`Lỗi khi xử lý: ${msg}`);
    }
  }

  // Helper function MIME type
  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  async uploadToNextcloud(dto: any, file: Express.Multer.File) {
    const NEXTCLOUD_API_URL = process.env.NEXTCLOUD_API_URL;
    if (!NEXTCLOUD_API_URL) {
      throw new InternalServerErrorException(
        'NEXTCLOUD_API_URL không được cấu hình trong môi trường',
      );
    }
    try {
      this.normalizeAndValidateUploadFile(file);
      let fileBuffer: Buffer;
      if (file.buffer) {
        fileBuffer = file.buffer;
      } else if (file.path) {
        fileBuffer = await fsPromises.readFile(file.path);
      } else {
        throw new BadRequestException('File không hợp lệ');
      }
      // Tạo multipart/form-data thủ công
      const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;
      const parts: Buffer[] = [];
      // Part 1: object_id
      parts.push(
        Buffer.from(
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="object_id"\r\n\r\n` +
          `${dto.object_id}\r\n`,
        ),
      );
      // Part 2: file
      parts.push(
        Buffer.from(
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="file"; filename="${file.originalname}"\r\n` +
          `Content-Type: ${file.mimetype || 'application/octet-stream'}\r\n\r\n`,
        ),
      );
      parts.push(fileBuffer);
      parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
      const body = Buffer.concat(parts);
      const response = await axios.post(NEXTCLOUD_API_URL, body, {
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length.toString(),
        },
        timeout: 60000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      if (file.path) {
        try {
          await fsPromises.unlink(file.path);
        } catch { }
      }
      return response.data;
    } catch (error) {
      console.error('❌ NextCloud upload error:', error);
      if (file.path) {
        try {
          await fsPromises.unlink(file.path);
        } catch { }
      }
      if (axios.isAxiosError(error)) {
        console.error('Response:', error.response?.data);
        throw new InternalServerErrorException(
          `Lỗi: ${error.response?.data?.message || error.message}`,
        );
      }
      throw new InternalServerErrorException(`Lỗi: ${error.message}`);
    }
  }

  // Service để cập nhật trạng thái quan trọng của tài liệu
  async updateFileImportance(fileId: number, isImportant: boolean, userId?: string) {
    const pool = await this.getMsPool();  // Lấy pool MSSQL từ hàm getMsPool
    const transaction = new sql.Transaction(pool); // Khởi tạo giao dịch (transaction)

    try {
      // Kiểm tra quyền sở hữu
      if (userId) {
        const file = await this.filesRepository.getFileById(fileId);
        if (file && file.created_by && String(file.created_by) !== String(userId)) {
          throw new ForbiddenException('Bạn không có quyền cập nhật trạng thái của tập tin này');
        }
      }

      // Bắt đầu giao dịch
      await transaction.begin();

      const query = `
        UPDATE ${this.dbname}.dbo.files
        SET is_important = @is_important
        WHERE id = @file_id;
      `;

      const request = transaction.request();
      request.input('is_important', sql.Bit, isImportant ? 1 : 0); // Đánh dấu là quan trọng hoặc không
      request.input('file_id', sql.BigInt, fileId); // ID của tài liệu

      // Thực hiện câu lệnh SQL trong giao dịch
      await request.query(query);

      // Commit giao dịch sau khi thực hiện thành công
      await transaction.commit();

      // Trả về thông tin phản hồi thành công
      return {
        success: true,
        message: `File with ID ${fileId} has been marked as ${isImportant ? 'important' : 'not important'}.`,
        fileId: fileId,
        isImportant: isImportant,
      };
    } catch (error) {
      // Rollback giao dịch nếu có lỗi
      console.error('Error updating file importance:', error);
      await transaction.rollback();

      // Trả về thông tin lỗi
      return {
        success: false,
        message: 'An error occurred while updating the file importance.',
        error: error.message,
      };
    }
  }

  // Service để cập nhật trạng thái thu hồi của tài liệu
  async updateFileRecall(fileId: number, isRecall: boolean, userId?: string) {
    const pool = await this.getMsPool();
    const transaction = new sql.Transaction(pool);

    try {
      if (userId) {
        const file = await this.filesRepository.getFileById(fileId);
        if (file && file.created_by && String(file.created_by) !== String(userId)) {
          throw new ForbiddenException('Bạn không có quyền cập nhật trạng thái của tập tin này');
        }
      }

      await transaction.begin();

      const query = `
        UPDATE ${this.dbname}.dbo.files
        SET is_recall = @is_recall
        WHERE id = @file_id;
      `;

      const request = transaction.request();
      request.input('is_recall', sql.Bit, isRecall ? 1 : 0);
      request.input('file_id', sql.BigInt, fileId);

      await request.query(query);
      await transaction.commit();

      return {
        success: true,
        message: `File with ID ${fileId} has been marked as ${isRecall ? 'recalled' : 'not recalled'}.`,
        fileId: fileId,
        isRecall: isRecall,
      };
    } catch (error) {
      console.error('Error updating file recall status:', error);
      await transaction.rollback();

      return {
        success: false,
        message: 'An error occurred while updating the file recall status.',
        error: error.message,
      };
    }
  }

  // Service để cập nhật vị trí file (object_type, object_id, parent_id)
  async updateFileLocation(fileId: number, dto: UpdateFileLocationDto, userId?: string) {
    const pool = await this.getMsPool();
    const transaction = new sql.Transaction(pool);

    try {
      // Kiểm tra quyền sở hữu
      if (userId) {
        const file = await this.filesRepository.getFileById(fileId);
        if (file && file.created_by && String(file.created_by) !== String(userId)) {
          throw new ForbiddenException('Bạn không có quyền thay đổi vị trí của tập tin này');
        }
      }

      await transaction.begin();

      // 1. Cập nhật parent_id trong bảng files nếu có
      if (dto.parent_id !== undefined) {
        await this.filesRepository.updateParentFile(fileId, dto.parent_id, transaction);
      }

      // 2. Cập nhật hoặc tạo mới file relation nếu có object_type và object_id
      if (dto.object_type && dto.object_id) {
        const checkResult = await this.filesRepository.checkFileRelation(fileId, dto.object_type, transaction);

        if (checkResult) {
          // Update existing relation
          await this.filesRepository.updateFileRelationObjectId(fileId, dto.object_type, dto.object_id, transaction);
        } else {
          // Insert new relation
          await this.filesRepository.insertFileRelationFull(fileId, dto.object_type, dto.object_id, transaction);
        }
      }

      await transaction.commit();
      return { success: true, message: 'Cập nhật vị trí file thành công' };
    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error('Error updating file location:', error);
      throw new InternalServerErrorException('Lỗi khi cập nhật vị trí file');
    }
  }
  async uploadFileWithTransaction(
    dto: UploadFileDto,
    file: Express.Multer.File,
    userId?: string,
    externalTransaction?: sql.Transaction,
  ) {
    const pool = await this.getMsPool();

    // Nếu có transaction từ bên ngoài, dùng nó. Nếu không, tạo mới
    const shouldManageTransaction = !externalTransaction;
    const transaction = externalTransaction || new sql.Transaction(pool);

    if (shouldManageTransaction) {
      await transaction.begin();
    }

    try {
      let finalFileName = file.originalname;
      try {
        finalFileName = decodeURIComponent(file.originalname);
      } catch (e) {
        console.warn('Decode filename error, using original:', e);
      }

      const config = await this.getActiveStorageConfig();
      const useMinio = config.active_type === 'minio';
      let storagePath: string;

      if (useMinio) {
        const minioClient = await this.getMinioClient(config);
        storagePath = `TCSG/${dto.object_type || 'default'}/${Date.now()}_${finalFileName}`;
        const fileBuffer = await fs.promises.readFile(file.path);
        await minioClient.putObject(
          config.minio_bucket,
          storagePath,
          fileBuffer,
          file.size,
        );
      } else {
        const destinationDir = path.join(
          this.uploadBase,
          'TCSG',
          dto.object_type || 'default',
        );
        await fsPromises.mkdir(destinationDir, { recursive: true });
        let newPath = path.join(destinationDir, finalFileName);
        let counter = 1;
        while (
          await fsPromises
            .access(newPath)
            .then(() => true)
            .catch(() => false)
        ) {
          const ext = path.extname(finalFileName);
          const base = path.basename(finalFileName, ext);
          newPath = path.join(destinationDir, `${base}_${counter}${ext}`);
          counter++;
        }
        await fsPromises.rename(file.path, newPath);
        storagePath = path
          .relative(this.uploadBase, newPath)
          .replace(/\\/g, '/');
      }

      // ===== CASE 1: Upload mới =====
      if (!dto.edit_file_id && !dto.signed_file_id) {
        finalFileName = await this.filesRepository.generateUniqueFileName(
          finalFileName,
          dto.object_type,
          dto.object_id,
        );

        const isImportant =
          dto.isImportant === true ||
          dto.isImportant === 'true' ||
          dto.isImportant === '1' ||
          dto.is_important === true ||
          dto.is_important === 'true' ||
          dto.is_important === '1';

        const fileId = await this.filesRepository.createFile({
          file_name: finalFileName,
          storage_type: useMinio ? 'minio' : 'filesystem',
          storage_path: storagePath,
          file_path: storagePath,
          mime_type: file.mimetype,
          file_size: file.size,
          parent_id: dto.parent_id,
          description: dto.description,
          created_by: userId,
          typeSize: dto.typeSize,
          isImportant: isImportant || false
        }, transaction);

        await this.filesRepository.createFileRelation({
          object_type: dto.object_type || 'default',
          object_id: dto.object_id || 0,
          file_id: fileId
        }, transaction);

        // ✅ Kết nối ngược lại DocumentLibrary nếu object_type phù hợp
        if (dto.object_type === 'document-library' && dto.object_id) {
          const updateReq = new sql.Request(transaction);
          updateReq.input('docId', dto.object_id);
          updateReq.input('fileId', fileId);
          await updateReq.query(`UPDATE document_library SET file_id = @fileId WHERE id = @docId`);
        }

        const isCertifiedCopy =
          dto.isCertifiedCopy === true ||
          dto.isCertifiedCopy === 'true' ||
          dto.isCertifiedCopy === '1';

        if (isCertifiedCopy && dto.object_id) {
          await this.filesRepository.setCertifiedCopyRelation(String(dto.object_id), fileId, transaction);
        }
        if (dto.object_type === 'taskdocuments' && dto.object_id) {
          await this.createLogFromSystem({
            actions: 'PATCH',
            details: 'Thêm mới file công việc',
            userInfo: userId,
            timestamps: new Date().toISOString(),
            taskId: dto.object_id.toString(),
          });
        }

        if (dto.object_type === 'finaldocuments' && dto.object_id) {
          await this.createLogFromSystem({
            actions: 'PATCH',
            details: 'Thêm mới file kết quả công việc',
            userInfo: userId,
            timestamps: new Date().toISOString(),
            taskId: dto.object_id.toString(),
          });
        }

        if (dto.object_type === 'project' && dto.object_id && dto.isUpdate) {
          await this.createLogFromSystem({
            actions: 'PATCH',
            details: 'Cập nhật tài liệu dự án',
            userInfo: userId,
            timestamps: new Date().toISOString(),
            taskId: dto.object_id.toString(),
          });
        }

        if (dto.object_type === 'MeetingTask' && dto.object_id) {
          const meetingReq = new sql.Request(transaction);
          await meetingReq
            .input('meetingId', dto.object_id)
            .input('isDocumentPrepared', 1)
            .query(`
            UPDATE ${this.dbname}.dbo.meeting_tasks
            SET is_document_prepared = @isDocumentPrepared
            WHERE id = @meetingId
          `);
        }

        // Chỉ commit nếu transaction do hàm này quản lý
        if (shouldManageTransaction) {
          await transaction.commit();
        }

        return {
          public_id: await this.filesRepository.getFileUuidById(
            fileId,
            shouldManageTransaction ? undefined : transaction,
          ),
          file_name: finalFileName,
          storage_type: useMinio ? 'minio' : 'filesystem',
          file_path: storagePath,
          object_type: dto.object_type || 'default',
          typeSize: dto.typeSize,
        };
      }

      // ===== CASE 2: Chỉnh sửa =====
      if (dto.edit_file_id) {
        const origin = await this.filesRepository.getFileById(Number(dto.edit_file_id), transaction);
        if (!origin) throw new Error('File chỉnh sửa không tồn tại');

        // Trường hợp 2.1: Chính chủ sửa file của mình -> UPDATE
        if (origin.created_by === userId || !userId) {
          await this.filesRepository.updateFile(origin.id, {
            file_name: finalFileName,
            file_path: storagePath,
            storage_path: storagePath,
            mime_type: file.mimetype,
            file_size: file.size,
            typeSize: dto.typeSize,
          }, transaction);

          if (shouldManageTransaction) {
            await transaction.commit();
          }

          return {
            public_id: await this.filesRepository.getFileUuidById(
              origin.id,
              shouldManageTransaction ? undefined : transaction,
            ),
            file_name: finalFileName,
            storage_type: useMinio ? 'minio' : 'filesystem',
            file_path: storagePath,
            version: origin.version,
            object_type: dto.object_type || 'default',
            typeSize: dto.typeSize,
          };
        }

        // Trường hợp 2.2: Người khác chỉnh sửa → tạo version mới
        // --------------------------------------------------------
        const latestVersion = await this.filesRepository.getLatestVersion(origin.id, transaction);
        const newVersion = latestVersion + 1.0;

        const versionId = await this.filesRepository.createFile({
          file_name: finalFileName,
          storage_type: useMinio ? 'minio' : 'filesystem',
          storage_path: storagePath,
          file_path: storagePath,
          mime_type: file.mimetype,
          file_size: file.size,
          parent_id: origin.id,
          description: dto.description,
          created_by: userId,
          version: newVersion.toFixed(1),
          typeSize: dto.typeSize,
        }, transaction);

        await this.filesRepository.createFileRelation({
          object_type: dto.object_type || 'default',
          object_id: dto.object_id || 0,
          file_id: versionId
        }, transaction);

        if (shouldManageTransaction) {
          await transaction.commit();
        }

        return {
          public_id: await this.filesRepository.getFileUuidById(
            versionId,
            shouldManageTransaction ? undefined : transaction,
          ),
          file_name: file.originalname,
          storage_type: useMinio ? 'minio' : 'filesystem',
          file_path: storagePath,
          version: newVersion.toFixed(1),
          object_type: dto.object_type || 'default',
          typeSize: dto.typeSize,
        };
      }

      // ===== CASE 3: Ký file =====
      if (dto.signed_file_id) {
        const rawSignedFileId = String(dto.signed_file_id).trim();
        // Dùng resolveInternalId để hỗ trợ cả numeric ID và UUID (public_id)
        const signedFileId = await this.filesRepository.resolveInternalId(rawSignedFileId, transaction);
        if (!signedFileId) throw new Error('File ký không tồn tại');
        const origin = await this.filesRepository.getFileById(signedFileId, transaction);
        if (!origin) throw new Error('File ký không tồn tại');

        let nextSignedCount = 1;
        const isSigned = Number(origin.is_signed_file) === 1;
        if (isSigned) {
          nextSignedCount = (Number(origin.number_of_signed_file) || 0) + 1;
        }

        const latestVersion =
          await this.filesRepository.getLatestVersion(origin.id, transaction);
        const newVersion = latestVersion + 1.0;

        const signedId = await this.filesRepository.createFile(
          {
            file_name: finalFileName,
            storage_type: useMinio ? 'minio' : 'filesystem',
            storage_path: storagePath,
            file_path: storagePath,
            file_size: file.size,
            mime_type: file.mimetype,

            parent_id: origin.id,
            is_signed_file: 1,
            number_of_signed_file: nextSignedCount,
            version: newVersion.toFixed(1),

            description: dto.description,
            created_by: userId,
            typeSize: dto.typeSize,
          },
          transaction,
        );

        let relationObjectType = dto.object_type || 'default';
        let relationObjectId = dto.object_id || 0;
        const certCopyRelation =
          (
            await this.filesRepository.getActiveFileRelationsByFileIdAndType(
              origin.id,
              'attachments_cert_copy',
              transaction,
            )
          )?.[0];

        if (certCopyRelation) {
          relationObjectType = certCopyRelation.object_type;
          relationObjectId = certCopyRelation.object_id;
        }

        await this.filesRepository.createFileRelation(
          {
            object_type: relationObjectType,
            object_id: relationObjectId,
            file_id: signedId,
          },
          transaction,
        );

        if (shouldManageTransaction) {
          await transaction.commit();
        }

        return {
          public_id: await this.filesRepository.getFileUuidById(
            signedId,
            shouldManageTransaction ? undefined : transaction,
          ),
          file_name: finalFileName,
          storage_type: useMinio ? 'minio' : 'filesystem',
          file_path: storagePath,
          number_of_signed_file: nextSignedCount,
          object_type: dto.object_type || 'default',
          typeSize: dto.typeSize,
        };
      }

    } catch (err) {
      if (shouldManageTransaction) {
        try {
          await transaction.rollback();
        } catch (rollbackError: any) {
          if (rollbackError?.code !== 'ENOTBEGUN') {
            throw rollbackError;
          }
        }
      }
      throw err;
    }
  }

  private isParaphSignatureAction(type?: string, typeSign?: string): boolean {
    const normalizedType = (type || '').trim();
    const normalizedTypeSign = (typeSign || '').trim();

    return (
      normalizedType === 'paraphSigner'
      || normalizedType === 'signFormatDraft'
      || normalizedType === 'signContentDraft'
      || normalizedTypeSign === 'draft'
    );
  }

  private isFormalInitialSignatureAction(type?: string): boolean {
    return (type || '').trim() === 'signFormatDraft';
  }


  private resolveSignatureImageDisplaySize(
    type?: string,
    width?: number,
    height?: number,
    typeSign?: string,
  ): { width?: number; height?: number } {
    const parsedWidth = Number(width);
    const parsedHeight = Number(height);
    const hasExplicitSize = Number.isFinite(parsedWidth) && parsedWidth > 0 && Number.isFinite(parsedHeight) && parsedHeight > 0;
    const normalizedType = (type || '').trim();

    // Signing service renders width/height in PDF points, not source-image pixels.
    // Source images may be stored @4x for sharpness; these values control only display size.
    if (this.isParaphSignatureAction(normalizedType, typeSign)) {
      return { width: 60, height: 30 };
    }

    switch (normalizedType) {
      case 'reportSigner':
      case 'signCopy':
      case 'officialSigner1':
      case 'officialSigner2':
      case 'officialSigner3':
        return { width: 112.5, height: 75 };
      case 'stampDoc':
        return { width: 90, height: 90 };
      default:
        return hasExplicitSize ? { width: parsedWidth, height: parsedHeight } : {};
    }
  }

  private withSignatureImageDisplaySize<T extends Record<string, any>>(
    metadata: T,
    type?: string,
    width?: number,
    height?: number,
    typeSign?: string,
  ): T {
    const size = this.resolveSignatureImageDisplaySize(type, width, height, typeSign);
    if (size.width !== undefined && size.height !== undefined) {
      return {
        ...metadata,
        width: size.width,
        height: size.height,
      };
    }
    return metadata;
  }

  private appendSignatureImageDisplaySize(
    formData: any,
    type?: string,
    width?: number,
    height?: number,
    typeSign?: string,
  ) {
    const size = this.resolveSignatureImageDisplaySize(type, width, height, typeSign);
    if (size.width !== undefined && size.height !== undefined) {
      this.appendSigningTextPart(formData, 'width', size.width);
      this.appendSigningTextPart(formData, 'height', size.height);
    }
  }

  private appendSigningTextPart(formData: any, name: string, value: unknown) {
    if (value === undefined || value === null) return;
    formData.append(name, String(value), { contentType: 'text/plain; charset=utf-8' });
  }

  private getSigningFileContentType(mimetype?: string, filename?: string): string {
    const normalizedMimetype = mimetype?.trim();
    if (
      !normalizedMimetype ||
      normalizedMimetype === 'application/octet-stream' ||
      normalizedMimetype === 'binary/octet-stream'
    ) {
      return filename?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
    }
    return normalizedMimetype;
  }

  private getSigningKeywordForService(type: string | undefined, keyword: string | undefined, isOTP: boolean): string {
    const normalizedKeyword = (keyword || '').trim();

    return normalizedKeyword;
  }
  private getSigningServiceUrl(isOTP: boolean, endpointPath: string): string {
    const envName = isOTP ? 'URL_SERVICE_SIGNING' : 'URL_SERVICE_SIGN_USBTOKEN';
    const rawBaseUrl = isOTP ? process.env.URL_SERVICE_SIGNING : process.env.URL_SERVICE_SIGN_USBTOKEN;

    if (!rawBaseUrl?.trim()) {
      throw new InternalServerErrorException(`Chưa cấu hình biến môi trường ${envName}`);
    }

    const baseUrl = rawBaseUrl.trim().replace(/\/+$/, '');
    const normalizedEndpoint = endpointPath.replace(/^\/+/, '');
    return `${baseUrl}/${normalizedEndpoint}`;
  }

  private getImageMetadataFieldName(type: string | undefined, isOTP: boolean): 'imageMetadata' | 'stampMetadata' {
    return isOTP && type?.trim() === 'stampDoc' ? 'stampMetadata' : 'imageMetadata';
  }

  private getSigningHeaders(
    formData: any,
    token?: string,
    tokenSigning?: string,
    serviceId?: string,
    includeSigningAuth = true,
  ): Record<string, any> {
    return {
      ...formData.getHeaders(),
      ...(includeSigningAuth && token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(includeSigningAuth && tokenSigning ? { 'Token-signing': tokenSigning } : {}),
      ...(serviceId ? { 'X-Service-Id': serviceId } : {}),
    };
  }

  private getFileNameFromContentDisposition(contentDisposition?: string | null): string | null {
    if (!contentDisposition) return null;

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;\n]*)/i);
    if (utf8Match?.[1]) {
      try {
        return decodeURIComponent(utf8Match[1]).split('\\').pop() || null;
      } catch {
        return utf8Match[1].split('\\').pop() || null;
      }
    }

    const match = contentDisposition.match(/filename[^;=\n]*=(?:(['"]).*?\1|[^;\n]*)/i);
    if (!match?.[0]) return null;

    return match[0]
      .replace(/filename[^=]*=/i, '')
      .replace(/['"]/g, '')
      .split('\\')
      .pop() || null;
  }
  /**
   * Ký số hàng loạt - Download nhiều file, gửi sang API ký số, upload lại
   * @param docId - ID của document
   * @param ids - Mảng ID của các file cần ký
   * @param tokenSigning - Token ký số
   * @param token - JWT token để xác thực
   * @param signingParams - Các tham số ký số (username, password, reason, location, signatureLevel)
   * @returns Kết quả ký số
   */
  async signBatch(
    { dto, serviceId, tokenSigning, token, userId, originalUser }:
      { dto: SignFilesOtpDto, serviceId: string, tokenSigning?: string, token?: string, userId: string, originalUser: string }
  ) {
    const { docId, ids, username, password, signatureLevel, reason, location, type, typeSign, isOTP, isIncommingDoc, keyword, imageSign, workItemId, actionCode, x, y, page, width, height, qrPath } = dto;
    const startTimeTracking = Date.now();
    let objectType = 'docDraft';

    const signedResults: Array<{
      originalFileId: number;
      signedFilePublicId: string;
      fileName: string;
    }> = [];

    const tmpPaths: string[] = [];

    try {
      // ✅ Parse ids sang number array an toàn (handle cả string và number)
      const numericIds = ids.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);

      if (numericIds.length === 0) {
        throw new BadRequestException('Không có ID hợp lệ để ký');
      }


      if (workItemId && userId) {
        const pool0 = await this.getMsPool();
        const wiReq = new sql.Request(pool0);
        wiReq.input('workItemId', workItemId);
        const wiResult = await wiReq.query(`
          SELECT assignee_user_id, state
          FROM ${this.dbname}.dbo.work_items
          WHERE id = @workItemId`
        );
        const wi = wiResult.recordset?.[0];
        if (!wi) {
          throw new ForbiddenException('Work item không tồn tại hoặc đã được xử lý');
        }
        if (wi.state && wi.state !== 'open') {
          throw new ForbiddenException(`Work item đã ở trạng thái: ${wi.state}`);
        }
        const userInfo: any = await this.workItemsService['sqlsvRepo']?.getUserById?.(userId);
        const userOrgId = userInfo?.parent?.id;
        const assignee = wi.assignee_user_id;
        if (assignee !== userId && (!userOrgId || assignee !== userOrgId)) {
          throw new ForbiddenException('Ký số thất bại: không có quyền ký văn bản này');
        }
      }

      // 2️⃣ Download tất cả files một lần
      const step1Start = Date.now();
      const fileDatas = await this.getMultipleFilesForView(numericIds);


      // 2️⃣ Validate và chuẩn bị buffers cho tất cả files
      const step2Start = Date.now();
      const fileBuffersToSign: Array<{
        id: number;
        fileBuffer: Buffer;
        filename: string;
        filePath?: string;
        fileSize?: number;
        mimetype: string;
      }> = [];

      for (const id of numericIds) {
        const fileData = fileDatas.find(f => f.id === id);

        if (!fileData) {
          throw new BadRequestException(`Không tìm thấy file ID ${id}`);
        }

        if (fileData.error) {
          throw new BadRequestException(`Lỗi khi tải file ID ${id}: ${fileData.error}`);
        }

        if (!fileData.fileBuffer && !fileData.fullPath) {
          throw new BadRequestException(`Không thể download file ID ${id}`);
        }

        // Lấy buffer từ file
        let fileBuffer: Buffer;
        if (fileData.fileBuffer) {
          fileBuffer = fileData.fileBuffer;
        } else if (fileData.fullPath) {
          fileBuffer = await fsPromises.readFile(fileData.fullPath);
        } else {
          throw new BadRequestException(`Không thể đọc nội dung file ID ${id}`);
        }

        fileBuffersToSign.push({
          id: +id,
          fileBuffer: fileBuffer,
          filename: fileData.filename,
          filePath: fileData.filePath,
          fileSize: fileData.fileSize,
          mimetype: fileData.mimetype,
        });
      }

      let imageBase64Data = '';
      if (imageSign) {
        const imageSignStr = String(imageSign);
        // Nếu không phải là chuỗi base64 thì coi như là file id
        if (!imageSignStr.startsWith('data:') && !imageSignStr.startsWith('iVBORw') && !imageSignStr.startsWith('/9j/')) {
          try {
            const fileData = await this.getFileForView(Number(imageSign), { userId });
            let imgBuffer: Buffer;
            if (fileData.fileBuffer) {
              imgBuffer = fileData.fileBuffer;
            } else if (fileData.fullPath) {
              imgBuffer = await fsPromises.readFile(fileData.fullPath);
            } else {
              throw new BadRequestException('Không thể đọc ảnh ký từ Storage');
            }
            imageBase64Data = imgBuffer.toString('base64');
          } catch (err) {
            throw new BadRequestException(`Lỗi khi lấy ảnh ký từ ID: ${err.message}`);
          }
        } else {
          // Xóa header base64 nếu có
          imageBase64Data = imageSignStr.replace(/^data:([A-Za-z-+/]+);base64,/, '');
        }
      }


      function detectBase64ImageType(base64: string): string {
        if (base64.startsWith('iVBORw0KGgo')) return 'png';
        if (base64.startsWith('/9j/')) return 'jpg';
        if (base64.startsWith('UklGR')) return 'webp';
        return 'unknown';
      }
      if (imageBase64Data && detectBase64ImageType(imageBase64Data) !== 'jpg' && detectBase64ImageType(imageBase64Data) !== 'png') {
        throw new BadRequestException('File ảnh ký chỉ chập nhận định dạng png hoặc jpg');
      }
      // 3️⃣ Xác định endpoint theo loại ký
      const step3Start = Date.now();
      let URL_SIGN = '';
      const isOTPBoolean = isOTP ?? true;
      const finalTokenSigning = tokenSigning;
      const signingKeyword = this.getSigningKeywordForService(type, keyword, isOTPBoolean);

      if (isOTPBoolean && !finalTokenSigning) {
        throw new BadRequestException('Token-signing is required');
      }

      const formData = new FormData();
      let finalUsername = username;
      if (!finalUsername && userId) {
        const user: any = await this.workItemsService['sqlsvRepo']?.getUserById?.(userId);
        finalUsername = user?.username || user?.email;
      }
      if (!finalUsername) {
        throw new BadRequestException('Cannot determine username for signing');
      }


      fileBuffersToSign.forEach((fileInfo) => {
        formData.append('files', fileInfo.fileBuffer, {
          filename: fileInfo.filename,
          contentType: this.getSigningFileContentType(fileInfo.mimetype, fileInfo.filename),
        });
      });

      this.appendSigningTextPart(formData, 'username', finalUsername);
      this.appendSigningTextPart(formData, 'password', password);
      this.appendSigningTextPart(formData, 'reason', reason || 'Ký số điện tử');
      this.appendSigningTextPart(formData, 'location', location || 'Việt Nam');
      this.appendSigningTextPart(formData, 'signatureLevel', signatureLevel || 'B');
      if (qrPath) {
        this.appendSigningTextPart(formData, 'qrPath', qrPath);
      }
      if (docId) {
        this.appendSigningTextPart(formData, 'docId', docId);
      }

      switch (type?.trim()) {
        case 'paraphSigner':
        case 'signContentDraft':
        case 'signFormatDraft':
        case 'reportSigner':
        case 'signCopy':
        case 'stampDoc': {
          const isInitialSign = this.isFormalInitialSignatureAction(type);
          if (isInitialSign) {
            URL_SIGN = isOTPBoolean
              ? this.getSigningServiceUrl(true, 'api/sign/documents-formal-initial-signature')
              : this.getSigningServiceUrl(false, 'api/desktop/document-initial-signature');
          } else {
            URL_SIGN = isOTPBoolean
              ? this.getSigningServiceUrl(true, 'api/sign/documents-with-image')
              : this.getSigningServiceUrl(false, 'api/desktop/document-with-image');
          }
          if (isIncommingDoc) {
            objectType = 'incommingdocument';
          }
          if (!imageBase64Data) {
            throw new BadRequestException('Thiếu dữ liệu ảnh ký');
          }
          this.appendSigningTextPart(formData, 'base64Image', imageBase64Data);
          if (signingKeyword) {
            this.appendSigningTextPart(formData, 'keyword', signingKeyword);
          }
          if (isInitialSign) {
            this.appendSignatureImageDisplaySize(formData, type, width, height, typeSign);
          }
          if (!isInitialSign) {
            const isOverride = type?.trim() === 'stampDoc' ? true : undefined;
            const imageMetadata = [
              this.withSignatureImageDisplaySize({
                "keyWord": `${keyword}`,
                "imagesBase": imageBase64Data,
                ...(isOverride !== undefined ? { "isOverride": isOverride } : {})
              }, type, width, height, typeSign)
            ];
            const metadataKey = this.getImageMetadataFieldName(type, isOTPBoolean);
            this.appendSigningTextPart(formData, metadataKey, JSON.stringify(imageMetadata));
          }
          this.appendSigningTextPart(formData, 'page', page);
          if (dto.textMetadata) {
            this.appendSigningTextPart(formData, 'textMetadata', dto.textMetadata);
          }
          break;
        }
        default:
          throw new BadRequestException('Thể loại ký không hợp lệ');
      }


      // 4️⃣ Gọi API ký số
      const step4Start = Date.now();
      const signedFiles: any[] = [];

      const signTypeForLog = type?.trim();
      const isInitialSignForLog = this.isFormalInitialSignatureAction(type);
      try {
        if (!isOTPBoolean) {
          for (const fileInfo of fileBuffersToSign) {
            const singleFormData = new FormData();
            singleFormData.append('file', fileInfo.fileBuffer, {
              filename: fileInfo.filename,
              contentType: this.getSigningFileContentType(fileInfo.mimetype, fileInfo.filename),
            });
            this.appendSigningTextPart(singleFormData, 'username', finalUsername);
            this.appendSigningTextPart(singleFormData, 'password', password);
            this.appendSigningTextPart(singleFormData, 'reason', reason || 'Ký số điện tử');
            this.appendSigningTextPart(singleFormData, 'location', location || 'Việt Nam');
            this.appendSigningTextPart(singleFormData, 'signatureLevel', signatureLevel || 'B');
            if (qrPath) {
              this.appendSigningTextPart(singleFormData, 'qrPath', qrPath);
            }
            if (docId) {
              this.appendSigningTextPart(singleFormData, 'docId', docId);
            }
            this.appendSigningTextPart(singleFormData, 'base64Image', imageBase64Data);
            if (signingKeyword) {
              this.appendSigningTextPart(singleFormData, 'keyword', signingKeyword);
            }
            if (isInitialSignForLog) {
              this.appendSignatureImageDisplaySize(singleFormData, type, width, height, typeSign);
            } else {
              const isOverride = type?.trim() === 'stampDoc' ? true : undefined;
              const imageMetadata = [
                this.withSignatureImageDisplaySize({
                  "keyWord": `${keyword}`,
                  "imagesBase": imageBase64Data,
                  ...(isOverride !== undefined ? { "isOverride": isOverride } : {})
                }, type, width, height, typeSign)
              ];
              this.appendSigningTextPart(singleFormData, 'imageMetadata', JSON.stringify(imageMetadata));
            }
            this.appendSigningTextPart(singleFormData, 'page', page);
            if (dto.textMetadata) {
              this.appendSigningTextPart(singleFormData, 'textMetadata', dto.textMetadata);
            }

            const singleSignResponse = await axios.post(URL_SIGN, singleFormData, {
              headers: this.getSigningHeaders(singleFormData, token, finalTokenSigning, serviceId, false),
              responseType: 'arraybuffer',
              timeout: 120000,
              maxBodyLength: Infinity,
              maxContentLength: Infinity,
            });
            const signedBuffer = Buffer.from(singleSignResponse?.data || []);
            if (!signedBuffer.length) {
              throw new BadRequestException(`Không có dữ liệu file đã ký cho ${fileInfo.filename}`);
            }
            const signedFileName = this.getFileNameFromContentDisposition(
              singleSignResponse?.headers?.['content-disposition']
            ) || fileInfo.filename.replace(/\.[^/.]+$/, '') + '_signed.pdf';
            signedFiles.push({
              filename: signedFileName,
              signedBase64: signedBuffer.toString('base64'),
            });
          }
        } else {
          const signResponse = await axios.post(URL_SIGN, formData, {
          headers: this.getSigningHeaders(formData, token, finalTokenSigning, serviceId, true),
          responseType: 'json',
          timeout: 120000,
        });

        const resData = signResponse?.data;
        if (resData && resData.success === false) {
          throw new BadRequestException(resData.message || 'Lỗi dịch vụ ký số');
        }

        const responseInfo = resData?.data || resData;
        const failedCount = responseInfo?.failed || 0;
        const documentsList = responseInfo?.documents || [];

        if (failedCount > 0 || documentsList.some((d: { status?: string }) => d.status === 'FAILED')) {
          const failedDocs = documentsList.filter((d: { status?: string }) => d.status === 'FAILED');
          const errorMsg = failedDocs.length > 0
            ? failedDocs.map((d: { filename?: string; error?: string }) => d.error || 'Lỗi không xác định').join('; ')
            : 'Lỗi trong quá trình ký hàng loạt';
          throw new BadRequestException(errorMsg);
        }

        const batchSignedFiles =
          responseInfo?.documents ||
          [];

        if (Array.isArray(batchSignedFiles) && batchSignedFiles.length > 0) {
          signedFiles.push(...batchSignedFiles);
        } else {
          const item = responseInfo;
          if (item) {
            signedFiles.push({
              filename: item?.filename || fileBuffersToSign[0]?.filename,
              signedBase64: item?.signedBase64 || item?.data || item?.base64 || null,
            });
          }
        }
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        let errorMsg = error.message;
        if (error.response?.data) {
          try {
            const data = error.response.data;
            const dataStr = Buffer.isBuffer(data) ? data.toString('utf-8') : (typeof data === 'object' ? JSON.stringify(data) : data);
            const errorObj = JSON.parse(dataStr);
            errorMsg = errorObj.message || errorObj.errorMessage || errorObj.error || dataStr;
          } catch {
            // Bỏ qua nếu không parse được
          }
        }
        console.error('❌ Lỗi khi ký batch:', {
          status: error.response?.status,
          errorMsg,
        });
        throw new BadRequestException(`Lỗi ký số batch: ${errorMsg}`);
      }

      if (signedFiles.length !== fileBuffersToSign.length) {
        console.warn(`Số file đã ký (${signedFiles.length}) khác số file gửi đi (${fileBuffersToSign.length})`);
      }

      // 5️⃣ Tạo tmp files, mở transaction, upload (giống signOTP)
      const step5Start = Date.now();
      const uploadBase = path.join(process.cwd(), 'upload');
      const tmpDir = path.join(uploadBase, 'tmp-signing');
      await fsPromises.mkdir(tmpDir, { recursive: true });

      // Chuẩn bị tất cả pseudoFiles trước khi mở transaction
      const preparedUploads: Array<{
        pseudoFile: Express.Multer.File;
        uploadDto: UploadFileDto;
        signedFileName: string;
        originalFileId: number | undefined;
        tmpPath: string;
      }> = [];

      for (let i = 0; i < fileBuffersToSign.length; i++) {
        const originalFile = fileBuffersToSign[i];
        const signedFileData = signedFiles[i];

        if (!signedFileData || !signedFileData.signedBase64) {
          throw new BadRequestException(`Không có dữ liệu file đã ký cho ${originalFile.filename}`);
        }

        const signedBuffer = Buffer.from(signedFileData.signedBase64, 'base64');

        const signedFileName = signedFileData.filename || originalFile.filename.replace(/\.[^/.]+$/, '') + '_signed.pdf';
        const tmpFilename = `${(originalFile.id ?? i)}-${Date.now()}.pdf`;
        const tmpPath = path.join(tmpDir, tmpFilename);
        tmpPaths.push(tmpPath);

        await fsPromises.writeFile(tmpPath, signedBuffer);

        const pseudoFile: Express.Multer.File = {
          fieldname: 'file',
          originalname: signedFileName,
          encoding: '7bit',
          mimetype: 'application/pdf',
          size: signedBuffer.length,
          destination: tmpDir,
          filename: tmpFilename,
          path: tmpPath,
          buffer: signedBuffer,
          stream: Readable.from(signedBuffer),
        } as any;

        const uploadDto: UploadFileDto = {
          object_id: docId,
          object_type: objectType || 'docDraft',
          signed_file_id: originalFile.id ? String(originalFile.id) : undefined,
        } as any;

        preparedUploads.push({ pseudoFile, uploadDto, signedFileName, originalFileId: originalFile.id, tmpPath });
      }

      // Mở transaction sau khi axios trả về (giống signOTP)
      const pool = await this.getMsPool();
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        for (const item of preparedUploads) {
          const uploadResult = await this.uploadFile(item.uploadDto, item.pseudoFile, userId, transaction);

          if (!uploadResult || !uploadResult.public_id) {
            throw new InternalServerErrorException(`Upload file đã ký thất bại cho file ${item.originalFileId}`);
          }

          signedResults.push({
            originalFileId: item.originalFileId as number,
            signedFilePublicId: uploadResult.public_id,
            fileName: item.signedFileName,
          });
        }
        const docResult = await pool.request()
          .input('docId', sql.VarChar(100), docId)
          .query(`SELECT is_stamp AS isStamp, req_sign_format_draft AS reqSignFormatDraft FROM ${this.dbname}.dbo.outgoing_documents WHERE document_id = @docId`);
        const doc = docResult.recordset[0];
        const payloadSignDoc = {
          docIds: docId,
          actionCode: actionCode,
          userId: userId,
          displayName: '',
          receiver_unit: '',
          group_: '',
          deadline: '',
          note: '',
          targetRole: '',
          roles: '',
          signerType: '',
          signKey: keyword || '',
          isStamp: doc?.isStamp,
          reqSignFormatDraft: doc?.reqSignFormatDraft,
        }
        await this.workItemsService.signDoc(workItemId, payloadSignDoc, userId, originalUser, transaction);

        await transaction.commit();
      } catch (dbError) {
        await transaction.rollback().catch(() => { });
        for (const result of signedResults) {
          const internalId = await this.filesRepository.resolveInternalId(result.signedFilePublicId);
          if (internalId) {
            await this.filesRepository.softDeleteFiles([internalId]).catch(() => { });
          }
        }
        throw dbError;
      } finally {
        for (const tmpPath of tmpPaths) {
          await fsPromises.unlink(tmpPath).catch(() => { });
        }
      }


      return {
        success: true,
        signed: signedResults.length,
        results: signedResults,
      };

    } catch (error) {
      // Cleanup tmp files nếu lỗi xảy ra trước transaction block
      for (const tmpPath of tmpPaths) {
        await fsPromises.unlink(tmpPath).catch(() => { });
      }
      if (error?.response?.data?.message) {
        throw new BadRequestException(error?.response?.data);
      }
      console.error('[sign-batch] Service error:', error.message);

      if (error instanceof ForbiddenException || error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Lỗi khi ký batch: ${error.message || 'Unknown error'}`
      );
    }
  }
  private async extractFileSource(
    fileSign: any,
    dtoId: any,
    userId: string,
  ): Promise<SignOtpFileSource> {
    let filename = 'document.pdf';
    let mimetype = 'application/pdf';
    let base64String = '';
    const { id, base64, mimeType } = fileSign || {};

    if (fileSign) {
      if (typeof fileSign === 'object') {
        filename = fileSign.fileName || filename;
        mimetype = mimeType || mimetype;
      }

      if (typeof fileSign === 'string') {
        base64String = fileSign;
      } else {
        base64String = base64 || '';
      }
    }

    if (!base64String) {
      const fileIdToFetch = id || dtoId;
      if (fileIdToFetch) {
        try {
          const fileData = await this.getFileForView(Number(fileIdToFetch), { userId, streamOnly: true });
          filename = fileData.filename || filename;
          mimetype = fileData.mimetype || mimetype;

          if (fileData.fullPath) {
            return {
              filename,
              mimetype,
              fileSize: fileData.fileSize,
              fullPath: fileData.fullPath,
            };
          }

          if (fileData.stream) {
            return {
              filename,
              mimetype,
              fileSize: fileData.fileSize,
              stream: fileData.stream,
            };
          }

          if (fileData.fileBuffer) {
            return {
              filename,
              mimetype,
              fileSize: fileData.fileBuffer.length,
              buffer: fileData.fileBuffer,
            };
          }

          throw new BadRequestException('Cannot read file from storage');
        } catch (err) {
          throw new BadRequestException(`Lỗi khi lấy file từ ID: ${err.message}`);
        }
      } else {
        throw new BadRequestException('Thiếu nội dung fileSign hoặc file ID');
      }
    } else {
      const base64Data = base64String.replace(/^data:([A-Za-z-+/]+);base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      return {
        filename,
        mimetype,
        fileSize: buffer.length,
        buffer,
      };
    }

    throw new BadRequestException('Cannot read file source');
  }

  private async readStreamErrorBody(stream: any, maxBytes = 1024 * 1024): Promise<string> {
    if (!stream || typeof stream[Symbol.asyncIterator] !== 'function') return '';

    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of stream) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      const remaining = maxBytes - total;
      if (remaining <= 0) break;
      chunks.push(buffer.length > remaining ? buffer.subarray(0, remaining) : buffer);
      total += buffer.length;
      if (total >= maxBytes) break;
    }

    return Buffer.concat(chunks).toString('utf8');
  }

  async signOTP({ dto, serviceId, tokenSigning, token, accessToken, userId, originalUser }:
    { dto: SignFileOtpDto, serviceId: string, tokenSigning?: string, token?: string, accessToken?: string, userId: string, originalUser: string }) {
    const { docId, type, typeSign, actionCode, workItemId, keyword, isOTP, isIncommingDoc, fileSign, imageSign, x, y, page, width, height, stampImageBase64 } = dto;
    console.log('--- [signOTP] Service Start ---', { docId, type, actionCode, workItemId, keyword });
    const { id } = fileSign || {};
    const sourceFileId = id || (dto as any).id;
    const hasSignedFileBuffer = Boolean(dto.signedFileBuffer);
    let objectType = 'docDraft';
    const startTimeTracking = Date.now();
    let tmpPath: string | null = null;
    let signOtpCurrentStep = 'Step 0 (Start)';
    const logSignOtpStep = (step: string, extra: Record<string, any> = {}) => {
      signOtpCurrentStep = step;
      console.log(`--- [signOTP] Service: ${step} ---`, {
        elapsedMs: Date.now() - startTimeTracking,
        docId,
        type,
        actionCode,
        workItemId,
        keyword,
        userId,
        sourceFileId,
        ...extra,
      });
    };
    logSignOtpStep('Step 0.1 (Initialized)', {
      isOTP,
      isIncommingDoc,
      hasFileSign: Boolean(fileSign),
      hasImageSign: Boolean(imageSign),
      hasStampImageBase64: Boolean(stampImageBase64),
    });

    let finalStampImageBase64 = stampImageBase64;
    if (!finalStampImageBase64) {
      try {
        // Hỗ trợ đọc cả ảnh thực tế (.png, .jpg, .jpeg) và file text chứa base64 (.txt)
        const extensions = ['.png', '.jpg', '.jpeg', '.txt'];
        for (const ext of extensions) {
          const defaultStampPath = path.join(__dirname, 'dto', `stampImageBase64${ext}`);
          if (fs.existsSync(defaultStampPath)) {
            const fileBuffer = await fsPromises.readFile(defaultStampPath);
            if (ext === '.txt') {
              finalStampImageBase64 = fileBuffer.toString('utf8').trim();
            } else {
              finalStampImageBase64 = fileBuffer.toString('base64');
            }
            break;
          }
        }
      } catch (err) {
        console.error('--- [signOTP] Service: Default stamp catch ---', {
          currentStep: signOtpCurrentStep,
          docId,
          workItemId,
          errorMessage: err?.message || String(err),
        });
        this.logger.error('Failed to read default stampImageBase64: ' + err.message);
      }
    }

    try {
      logSignOtpStep('Step 1 (Check WorkItem)');
      // 1. CHẠY SONG SONG: Lấy ảnh chữ ký, file cần ký và kiểm tra quyền WorkItem. Tạo hiệu suất cao hơn thay vì tuần tự
      const step1Start = Date.now();

      let wiCheckPromise = Promise.resolve();
      if (workItemId && userId) {
        wiCheckPromise = (async () => {
          const wiCheckStart = Date.now();
          logSignOtpStep('Step 1.1 (Before WorkItem query)');
          const pool0 = await this.getMsPool();
          const wiReq = new sql.Request(pool0);
          wiReq.input('workItemId', workItemId);
          const wiResult = await wiReq.query(
            `SELECT assignee_user_id, state FROM ${this.dbname}.dbo.work_items WHERE id = @workItemId`
          );
          const wi = wiResult.recordset?.[0];
          if (!wi) {
            throw new ForbiddenException('Work item không tồn tại hoặc đã được xử lý');
          }
          if (wi.state && wi.state !== 'open') {
            throw new ForbiddenException(`Work item đã ở trạng thái: ${wi.state}`);
          }
          // Lấy orgId của user để check trường hợp assignee là org unit
          const userInfo: any = await this.workItemsService['sqlsvRepo']?.getUserById?.(userId);
          const userOrgId = userInfo?.parent?.id;
          const assignee = wi.assignee_user_id;
          if (assignee !== userId && (!userOrgId || assignee !== userOrgId)) {
            throw new ForbiddenException('Ký số thất bại: không có quyền ký văn bản này');
          }
          logSignOtpStep('Step 1.2 (WorkItem permission OK)', {
            wiCheckElapsedMs: Date.now() - wiCheckStart,
            assignee,
            userOrgId,
            workItemState: wi?.state,
          });
        })();
      }

      await Promise.all([
        wiCheckPromise
      ]);
      logSignOtpStep('Step 1.3 (Check WorkItem completed)', {
        step1ElapsedMs: Date.now() - step1Start,
      });

      logSignOtpStep('Step 1.4 (Resolve signature image)');
      const stepImageStart = Date.now();
      let imageBase64Data = '';
      if (imageSign) {
        const imageSignStr = String(imageSign);
        // Nếu không phải là chuỗi base64 thì coi như là file id
        if (!imageSignStr.startsWith('data:') && !imageSignStr.startsWith('iVBORw') && !imageSignStr.startsWith('/9j/')) {
          try {
            const fileData = await this.getFileForView(Number(imageSign), { userId });
            let imgBuffer: Buffer;
            if (fileData.fileBuffer) {
              imgBuffer = fileData.fileBuffer;
            } else if (fileData.fullPath) {
              imgBuffer = await fsPromises.readFile(fileData.fullPath);
            } else {
              throw new BadRequestException('Không thể đọc ảnh ký từ Storage');
            }
            imageBase64Data = imgBuffer.toString('base64');
          } catch (err) {
            console.error('--- [signOTP] Service: ImageSign catch ---', {
              currentStep: signOtpCurrentStep,
              docId,
              workItemId,
              imageSign,
              errorMessage: err?.message || String(err),
            });
            throw new BadRequestException(`Lỗi khi lấy ảnh ký từ ID: ${err.message}`);
          }
        } else {
          // Xóa header base64 nếu có
          imageBase64Data = imageSignStr.replace(/^data:([A-Za-z-+/]+);base64,/, '');
        }
      }
      function detectBase64ImageType(base64: string): string {
        if (base64.startsWith('iVBORw0KGgo')) return 'png';
        if (base64.startsWith('/9j/')) return 'jpg';
        if (base64.startsWith('UklGR')) return 'webp';
        return 'unknown';
      }
      if (imageBase64Data && detectBase64ImageType(imageBase64Data) !== 'jpg' && detectBase64ImageType(imageBase64Data) !== 'png') {
        throw new BadRequestException('File ảnh ký chỉ chập nhận định dạng png hoặc jpg');
      }
      logSignOtpStep('Step 1.5 (Signature image resolved)', {
        imageElapsedMs: Date.now() - stepImageStart,
        hasImageBase64Data: Boolean(imageBase64Data),
        imageBase64Length: imageBase64Data ? imageBase64Data.length : 0,
        imageType: imageBase64Data ? detectBase64ImageType(imageBase64Data) : null,
      });

      // 2. Lay file source without buffering file by ID in memory.
      logSignOtpStep('Step 2 (Get File Source)');
      const step2Start = Date.now();
      const fileSource: SignOtpFileSource = hasSignedFileBuffer
        ? {
          filename: fileSign?.fileName || 'signed.pdf',
          mimetype: fileSign?.mimeType || 'application/pdf',
        }
        : await this.extractFileSource(fileSign, (dto as any).id, userId);
      const { filename, mimetype } = fileSource;
      logSignOtpStep('Step 2.1 (File source resolved)', {
        step2ElapsedMs: Date.now() - step2Start,
        filename,
        mimetype,
        fileSize: fileSource.fileSize || 0,
        source: fileSource.fullPath ? 'filesystem' : (fileSource.stream ? 'stream' : (fileSource.buffer ? 'buffer' : 'unknown')),
        bufferBytes: fileSource.buffer?.length || 0,
      });

      // 4. Chuẩn bị FormData (Giữ nguyên vẹn logic cũ)
      logSignOtpStep('Step 3 (Prepare FormData)');
      const step3Start = Date.now();
      const formData = new FormData();
      const fileAppendOptions: any = {
        filename,
        contentType: this.getSigningFileContentType(mimetype, filename),
      };
      if (fileSource.fileSize) {
        fileAppendOptions.knownLength = fileSource.fileSize;
      }

      if (!hasSignedFileBuffer) {
        if (fileSource.fullPath) {
          formData.append('file', fs.createReadStream(fileSource.fullPath), fileAppendOptions);
        } else if (fileSource.stream) {
          formData.append('file', fileSource.stream, fileAppendOptions);
        } else if (fileSource.buffer) {
          formData.append('file', fileSource.buffer, fileAppendOptions);
        } else {
          throw new BadRequestException('Cannot read file source');
        }
      }
      // resolve username chuẩn (không để undefined)
      let finalUsername = dto.username;

      if (!finalUsername && userId) {
        const user: any = await this.workItemsService['sqlsvRepo']?.getUserById?.(userId);
        finalUsername = user?.username || user?.email; // chỉnh đúng field hệ m
      }

      if (!finalUsername) {
        throw new BadRequestException('Không xác định được username để ký số');
      }

      this.appendSigningTextPart(formData, 'username', finalUsername);
      // formData.append('username', dto.username);
      this.appendSigningTextPart(formData, 'password', dto.password);
      this.appendSigningTextPart(formData, 'reason', dto.reason || 'Ký số điện tử');
      this.appendSigningTextPart(formData, 'location', dto.location || 'Việt Nam');
      this.appendSigningTextPart(formData, 'signatureLevel', dto.signatureLevel || 'B');
      if (dto.qrPath) {
        this.appendSigningTextPart(formData, 'qrPath', dto.qrPath);
      }
      if (dto.docId) {
        this.appendSigningTextPart(formData, 'docId', dto.docId);
      }
      let URL_SIGN = '';
      const isOTPBoolean = isOTP ?? true;
      const signingKeyword = this.getSigningKeywordForService(type, keyword, isOTPBoolean);
      const resolveSignUrl = (otpEndpoint: string, usbEndpoint: string) =>
        hasSignedFileBuffer ? '' : this.getSigningServiceUrl(isOTPBoolean, isOTPBoolean ? otpEndpoint : usbEndpoint);
      switch (type.trim()) {
        case 'paraphSigner':
        case 'signContentDraft':
        case 'signFormatDraft': {
          const isInitialSign = this.isFormalInitialSignatureAction(type);
          if (isInitialSign) {
            URL_SIGN = resolveSignUrl(
              'api/sign/document-formal-initial-signature',
              'api/desktop/document-initial-signature',
            );
          } else {
            URL_SIGN = resolveSignUrl(
            'api/sign/document-with-image',
            'api/desktop/document-with-image',
          );
          }
          if (isIncommingDoc) {
            objectType = 'incommingdocument';
          }
          if (!imageBase64Data) {
            throw new BadRequestException('Thiếu dữ liệu ảnh ký');
          }
          this.appendSigningTextPart(formData, 'base64Image', imageBase64Data);
          if (signingKeyword) {
            this.appendSigningTextPart(formData, 'keyword', signingKeyword);
          }
          if (isInitialSign) {
            this.appendSignatureImageDisplaySize(formData, type, width, height, typeSign);
          }
          if (!isInitialSign) {
            const imageMetadata = [
              this.withSignatureImageDisplaySize({
                "keyWord": `${keyword}`,
                "imagesBase": imageBase64Data,
              }, type, width, height, typeSign)
            ];
            this.appendSigningTextPart(formData, 'imageMetadata', JSON.stringify(imageMetadata));
          }
          this.appendSigningTextPart(formData, 'page', page);
          break;
        }
        // case 'signFormatDraft': {
        //   URL_SIGN = `${process.env.URL_SERVICE_SIGNING}api/desktop/document-with-image`;
        //   if (!isOTPBoolean) {
        //     URL_SIGN = `${process.env.URL_SERVICE_SIGN_USBTOKEN}api/desktop/document-with-image`;
        //   }
        //   if (isIncommingDoc) {
        //     objectType = 'incommingdocument'
        //   }
        //   if (!imageBase64Data) {
        //     throw new BadRequestException('Thiếu dữ liệu ảnh ký');
        //   }
        //   this.appendSigningTextPart(formData, 'base64Image', imageBase64Data);
        //   if (keyword) {
        //     formData.append('keyword', keyword);
        //   }
        //   const imageMetadata = [
        //     {
        //       "keyWord": `${keyword}`,
        //       "imagesBase": imageBase64Data,
        //       "width": 100,
        //       "height": 80,
        //     }
        //   ]
        //   this.appendSigningTextPart(formData, 'imageMetadata', JSON.stringify(imageMetadata));
        //   if (x !== undefined) formData.append('x', String(x));
        //   if (y !== undefined) formData.append('y', String(y));
        //   this.appendSigningTextPart(formData, 'page', page);
        //   // formData.append('width', String(width !== undefined && width !== null ? width : 70));
        //   // formData.append('height', String(height !== undefined && height !== null ? height : 50));
        //   break;
        // }
        case 'reportSigner': {
          URL_SIGN = resolveSignUrl(
            'api/sign/document-with-image',
            'api/desktop/document-with-image',
          );
          if (isIncommingDoc) {
            objectType = 'incommingdocument'
          }
          if (!keyword) {
            throw new BadRequestException('Không tìm thấy từ khóa ký số');
          }
          if (!imageBase64Data) {
            throw new BadRequestException('Thiếu dữ liệu ảnh ký');
          }
          const imageMetadata = [
            this.withSignatureImageDisplaySize({
              "keyWord": `${keyword}`,
              "imagesBase": imageBase64Data,
            }, type, width, height, typeSign)
          ]
          this.appendSigningTextPart(formData, 'imageMetadata', JSON.stringify(imageMetadata));
          if (finalStampImageBase64) {
            const mimeMatch = finalStampImageBase64.match(/^data:([A-Za-z-+/]+);base64,/);
            const contentType = mimeMatch ? mimeMatch[1] : 'image/png';
            const base64Data = finalStampImageBase64.replace(/^data:([A-Za-z-+/]+);base64,/, '');
            const stampBuffer = Buffer.from(base64Data, 'base64');

            let ext = 'png';
            if (contentType.includes('jpeg') || contentType.includes('jpg')) {
              ext = 'jpg';
            } else if (contentType.includes('gif')) {
              ext = 'gif';
            }

            formData.append('stampImageBase64', stampBuffer, {
              filename: `stamp.${ext}`,
              contentType: contentType,
            });
          }
          // formData.append('stampImageBase64', JSON.stringify(imageBase64Data));

          if (dto.textMetadata) {
            this.appendSigningTextPart(formData, 'textMetadata', dto.textMetadata);
          }
          break;
        }
        case 'signCopy': {
          URL_SIGN = resolveSignUrl(
            'api/sign/document-with-image',
            'api/desktop/document-with-image',
          );
          if (isIncommingDoc) {
            objectType = 'incommingdocument'
          }
          if (!keyword) {
            throw new BadRequestException('Không tìm thấy từ khóa ký số');
          }
          if (!imageBase64Data) {
            throw new BadRequestException('Thiếu dữ liệu ảnh ký');
          }
          const imageMetadata = [
            this.withSignatureImageDisplaySize({
              "keyWord": `${keyword}`,
              "align": "start",
              "imagesBase": imageBase64Data,
            }, type, width, height, typeSign)
          ]
          this.appendSigningTextPart(formData, 'imageMetadata', JSON.stringify(imageMetadata));
          if (finalStampImageBase64) {
            const mimeMatch = finalStampImageBase64.match(/^data:([A-Za-z-+/]+);base64,/);
            const contentType = mimeMatch ? mimeMatch[1] : 'image/png';
            const base64Data = finalStampImageBase64.replace(/^data:([A-Za-z-+/]+);base64,/, '');
            const stampBuffer = Buffer.from(base64Data, 'base64');

            let ext = 'png';
            if (contentType.includes('jpeg') || contentType.includes('jpg')) {
              ext = 'jpg';
            } else if (contentType.includes('gif')) {
              ext = 'gif';
            }

            formData.append('stampImageBase64', stampBuffer, {
              filename: `stamp.${ext}`,
              contentType: contentType,
            });
          }
          // formData.append('stampImageBase64', JSON.stringify(imageBase64Data));

          if (dto.textMetadata) {
            this.appendSigningTextPart(formData, 'textMetadata', dto.textMetadata);
          }
          break;
        }
        case 'stampDoc': {
          URL_SIGN = resolveSignUrl(
            'api/sign/document-with-image',
            'api/desktop/document-with-image',
          );
          if (isIncommingDoc) {
            objectType = 'incommingdocument'
          }
          if (!keyword) {
            throw new BadRequestException('Không tìm thấy từ khóa ký số');
          }
          if (!imageBase64Data) {
            throw new BadRequestException('Thiếu dữ liệu ảnh ký');
          }
          const imageMetadata = [
            this.withSignatureImageDisplaySize({
              "keyWord": `${keyword}`,
              "imagesBase": imageBase64Data,
              "isOverride": true
            }, type, width, height, typeSign)
          ]
          const metadataKey = this.getImageMetadataFieldName(type, isOTPBoolean);
          this.appendSigningTextPart(formData, metadataKey, JSON.stringify(imageMetadata));
          // if (finalStampImageBase64) {
          //   const mimeMatch = finalStampImageBase64.match(/^data:([A-Za-z-+/]+);base64,/);
          //   const contentType = mimeMatch ? mimeMatch[1] : 'image/png';
          //   const base64Data = finalStampImageBase64.replace(/^data:([A-Za-z-+/]+);base64,/, '');
          //   const stampBuffer = Buffer.from(base64Data, 'base64');

          //   let ext = 'png';
          //   if (contentType.includes('jpeg') || contentType.includes('jpg')) {
          //     ext = 'jpg';
          //   } else if (contentType.includes('gif')) {
          //     ext = 'gif';
          //   }

          //   formData.append('stampImageBase64', stampBuffer, {
          //     filename: `stamp.${ext}`,
          //     contentType: contentType,
          //   });
          // }
          // formData.append('stampImageBase64', JSON.stringify(imageBase64Data));

          if (dto.textMetadata) {
            console.log(`[stampDoc - multi] textMetadata sent: ${dto.textMetadata}`);
            this.appendSigningTextPart(formData, 'textMetadata', dto.textMetadata);
          }
          break;
        }

        default:
          throw new BadRequestException('Thể loại ký không lệ. Cần là "digital" hoặc "draft".');
      }
      logSignOtpStep('Step 3.1 (FormData ready)', {
        step3ElapsedMs: Date.now() - step3Start,
        url: URL_SIGN,
        objectType,
        isOTP: isOTPBoolean,
        username: finalUsername,
        hasBase64Image: Boolean(imageBase64Data),
        hasStampImageBase64: Boolean(finalStampImageBase64),
        hasTextMetadata: Boolean(dto.textMetadata),
        multipartHeaders: Object.keys(formData.getHeaders()),
        keyword: keyword,
        signingKeyword: signingKeyword
      });


      // Helper function to extract filename from content-disposition header
      const getFileNameFromHeader = (contentDisposition: string | null | undefined) => {
        if (!contentDisposition) return null;
        const match = contentDisposition.match(
          /filename[^;=\n]*=(?:(['"]).*?\1|[^;\n]*)/
        );
        if (match && match[0]) {
          const fname = match[0]
            .replace(/filename[^=]*=/, "")
            .replace(/['"]/g, "");
          return fname.split("\\").pop();
        }
        return null;
      };

      const uploadBase = path.join(process.cwd(), 'upload');
      const tmpDir = path.join(uploadBase, 'tmp-signing');
      await fsPromises.mkdir(tmpDir, { recursive: true });
      tmpPath = path.join(tmpDir, `${randomUUID()}.pdf`);

      // 5. Nếu FE đã gọi USB service trực tiếp và gửi signed buffer lên thì dùng buffer đó
      let signResponseHeaders: Record<string, string> = {};
      if (dto.signedFileBuffer) {
        logSignOtpStep('Step 4 (Use signedFileBuffer from FE)', {
          signedFileBufferLength: dto.signedFileBuffer?.length || 0,
        });
        // FE đã ký USB, nhận buffer từ FE
        const cleanedBase64 = dto.signedFileBuffer.replace(/^data:[^,]+,/, '');
        await fsPromises.writeFile(tmpPath, Buffer.from(cleanedBase64, 'base64'));
        // Debug: check if it's a valid PDF by looking at first bytes
      } else {
        // BE gọi USB service như cũ
        logSignOtpStep('Step 4 (Calling Axios)', { url: URL_SIGN });
        const step4Start = Date.now();
        const signingToken = tokenSigning;
        if (isOTPBoolean && !signingToken) {
          throw new BadRequestException('Thiếu token ký số (Token-signing)');
        }
        const signTypeForLog = type?.trim();
        const isInitialSignForLog = this.isFormalInitialSignatureAction(type);
        const metadataKeyForLog = isInitialSignForLog
          ? undefined
          : this.getImageMetadataFieldName(type, isOTPBoolean);
        this.logger.log(`[sign-otp] Sending request to signing service: ${JSON.stringify({
          url: URL_SIGN,
          type: signTypeForLog,
          isOTP: isOTPBoolean,
          isInitialSign: isInitialSignForLog,
          metadataKey: metadataKeyForLog,
          docId,
          workItemId,
          actionCode,
          objectType,
          sourceFileId,
          file: {
            filename,
            mimetype,
            fileSize: fileSource.fileSize || 0,
            source: fileSource.fullPath ? 'filesystem' : (fileSource.stream ? 'stream' : (fileSource.buffer ? 'buffer' : 'unknown')),
            bufferBytes: fileSource.buffer?.length || 0,
          },
          fields: {
            username: finalUsername,
            reason: dto.reason || 'Ký số điện tử',
            location: dto.location || 'Việt Nam',
            signatureLevel: dto.signatureLevel || 'B',
            keyword: keyword || '',
            signingKeyword: signingKeyword,
            hasQrPath: Boolean(dto.qrPath),
            hasBase64Image: Boolean(imageBase64Data),
            base64ImageLength: imageBase64Data ? String(imageBase64Data).length : 0,
            hasStampImageBase64: Boolean(finalStampImageBase64),
            stampImageBase64Length: finalStampImageBase64 ? String(finalStampImageBase64).length : 0,
            hasTextMetadata: Boolean(dto.textMetadata),
            textMetadataLength: dto.textMetadata ? String(dto.textMetadata).length : 0,
            x,
            y,
            page,
            width,
            height,
          },
          headers: {
            hasAuthorization: Boolean(token),
            hasTokenSigning: Boolean(signingToken),
            serviceId: serviceId || '',
            multipartHeaders: Object.keys(formData.getHeaders()),
          },
        })}`);
        let signResponse;
        try {
          signResponse = await axios.post(URL_SIGN, formData, {
            headers: this.getSigningHeaders(formData, token, signingToken, serviceId, isOTPBoolean),
            withCredentials: true,
            responseType: 'stream',
            timeout: 120000,
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
          });
          logSignOtpStep('Step 4.1 (Axios returned successfully)', {
            step4ElapsedMs: Date.now() - step4Start,
            status: signResponse?.status,
            contentDisposition: signResponse?.headers?.['content-disposition'],
          });
        } catch (error) {
          console.log('--- [signOTP] Service: Axios Error Catch Block ---', error?.message);
          console.error('--- [signOTP] Service: Axios catch context ---', {
            currentStep: signOtpCurrentStep,
            elapsedMs: Date.now() - startTimeTracking,
            docId,
            workItemId,
            actionCode,
            type,
            url: URL_SIGN,
            errorMessage: error?.message || String(error),
          });
          let errorMsg = error.message;
          let errorDetails: any = null;
          if (error.response?.data) {
            try {
              if (typeof error.response.data?.[Symbol.asyncIterator] === 'function') {
                errorDetails = await this.readStreamErrorBody(error.response.data);
              } else if (Buffer.isBuffer(error.response.data)) {
                errorDetails = error.response.data.toString('utf8');
              } else if (typeof error.response.data === 'object') {
                errorDetails = JSON.stringify(error.response.data);
              } else {
                errorDetails = String(error.response.data);
              }
              errorMsg = errorDetails;
            } catch (parseError) {
              console.error('--- [signOTP] Service: Axios parse error catch ---', {
                currentStep: signOtpCurrentStep,
                docId,
                workItemId,
                errorMessage: parseError?.message || String(parseError),
              });
              errorMsg = 'Cannot parse error response';
            }
          }
          console.error('❌ [sign-otp] Signing service error:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            errorMsg,
            errorDetails,
            hasAuth: !!token,
            hasTokenSigning: !!signingToken,
            url: URL_SIGN,
            requestHeaders: {
              hasServiceId: !!serviceId,
            },
          });
          const parsed = tryParseJson(errorMsg);


          if (parsed && typeof parsed === 'object') {
            throw new BadRequestException({
              success: false,
              message: parsed?.message || 'Lỗi khi ký OTP',
              errorCode: parsed?.errorCode || null,
              data: parsed?.data || null,
            });
          }

          throw new BadRequestException(`Lỗi khi ký OTP: ${errorMsg}`);
        }

        logSignOtpStep('Step 5 (Streaming Axios Data)');
        const step5Start = Date.now();
        if (!signResponse?.data) {
          throw new InternalServerErrorException('Signing API returned empty file stream');
        }

        await pipeline(signResponse.data, fs.createWriteStream(tmpPath));
        logSignOtpStep('Step 5.1 (Axios stream saved)', {
          step5ElapsedMs: Date.now() - step5Start,
          tmpPath,
        });
        signResponseHeaders = {
          'content-disposition': signResponse.headers?.['content-disposition'],
        };
      }
      // When FE provides signed buffer, we don't have signResponse headers, so use filename directly
      const fileNameFromHeader = dto.signedFileBuffer ? null : getFileNameFromHeader(
        signResponseHeaders['content-disposition']
      );
      const fileName =
        fileNameFromHeader ||
        (filename ? filename : "signed.pdf");
      const signedFileStat = await fsPromises.stat(tmpPath);

      const pseudoFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: fileName,
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: signedFileStat.size,
        destination: tmpDir,
        filename: path.basename(tmpPath),
        path: tmpPath,
        // stream: fs.createReadStream(tmpPath),
      } as any;

      const uploadDto: UploadFileDto = {
        object_id: docId,
        object_type: objectType || 'docDraft',
        signed_file_id: sourceFileId ? String(sourceFileId) : undefined,
      };
      (uploadDto as any).skipPdfBackupPrecreate = true;


      let uploadResult;

      logSignOtpStep('Step 6 (Begin DB Transaction and Upload)', {
        signedFileSize: signedFileStat.size,
        fileName,
        tmpPath,
      });
      // 6. TỐI ƯU CỰC QUAN TRỌNG: Mở block transaction ở MỨC THẤP NHẤT sau khi Axios trả về
      // vì lúc axios call gọi tới server signing có thể mất >10s, không nên hold transaction database quá lâu.
      const step6Start = Date.now();
      console.log('--- [signOTP] Service: Step 6.1 (Before getMsPool) ---', { docId, workItemId, sourceFileId, tmpPath });
      const pool = await this.getMsPool();
      console.log('--- [signOTP] Service: Step 6.2 (After getMsPool / Before transaction.begin) ---', { elapsedMs: Date.now() - step6Start });
      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      console.log('--- [signOTP] Service: Step 6.3 (After transaction.begin / Before uploadFile) ---', { elapsedMs: Date.now() - step6Start, fileName, fileSize: signedFileStat.size });

      try {
        const uploadStart = Date.now();
        uploadResult = await this.uploadFile(uploadDto, pseudoFile, userId, transaction);
        console.log('--- [signOTP] Service: Step 6.4 (After uploadFile) ---', {
          elapsedMs: Date.now() - step6Start,
          uploadElapsedMs: Date.now() - uploadStart,
          signedFilePublicId: uploadResult?.public_id,
          signedFileInternalId: uploadResult?.internal_id || uploadResult?.id,
        });

        console.log('--- [signOTP] Service: Step 6.5 (Before outgoing document query) ---', { elapsedMs: Date.now() - step6Start, docId });
        const docResult = await pool.request()
          .input('docId', sql.VarChar(100), docId)
          .query(`SELECT is_stamp AS isStamp, req_sign_format_draft AS reqSignFormatDraft FROM ${this.dbname}.dbo.outgoing_documents WHERE document_id = @docId`);
        console.log('--- [signOTP] Service: Step 6.6 (After outgoing document query / Before signDoc) ---', {
          elapsedMs: Date.now() - step6Start,
          foundDoc: !!docResult.recordset?.[0],
        });
        const doc = docResult.recordset[0];
        const payloadSignDoc = {
          docIds: docId,
          actionCode: actionCode,
          userId: userId,
          displayName: '',
          receiver_unit: '',
          group_: '',
          deadline: '',
          note: '',
          targetRole: '',
          roles: '',
          signerType: '',
          signKey: keyword || '',
          isStamp: doc?.isStamp,
          reqSignFormatDraft: doc?.reqSignFormatDraft,
        }
        const step7Start = Date.now();
        logSignOtpStep('Step 6.6.1 (Before workItemsService.signDoc)', {
          payloadSignDoc,
        });
        await this.workItemsService.signDoc(
          workItemId,
          payloadSignDoc,
          userId,
          originalUser,
          transaction,
        );
        console.log('--- [signOTP] Service: Step 6.7 (After signDoc / Before commit) ---', {
          elapsedMs: Date.now() - step6Start,
          signDocElapsedMs: Date.now() - step7Start,
        });
        await transaction.commit();
        console.log('--- [signOTP] Service: Step 6.8 (After commit) ---', { elapsedMs: Date.now() - step6Start });

      } catch (dbError) {
        console.error('--- [signOTP] Service: Step 6 DB Catch ---', {
          currentStep: signOtpCurrentStep,
          elapsedMs: Date.now() - startTimeTracking,
          docId,
          workItemId,
          actionCode,
          sourceFileId,
          tmpPath,
          errorName: dbError?.name,
          errorMessage: dbError?.message || String(dbError),
        });
        await transaction.rollback().catch((rollbackError) => {
          console.error('--- [signOTP] Service: Step 6 Rollback Catch ---', {
            docId,
            workItemId,
            errorMessage: rollbackError?.message || String(rollbackError),
          });
        });
        throw dbError;
      } finally {
        if (tmpPath) {
          await fsPromises.unlink(tmpPath).catch((cleanupError) => {
            console.warn('--- [signOTP] Service: Cleanup tmp file catch ---', {
              currentStep: signOtpCurrentStep,
              docId,
              workItemId,
              tmpPath,
              errorMessage: cleanupError?.message || String(cleanupError),
            });
          });
        }
      }


      logSignOtpStep('Step 7 (Service End successfully)', {
        signedFilePublicId: uploadResult?.public_id,
        fileName: uploadResult?.signedFileName,
      });
      return {
        success: true,
        signedFilePublicId: uploadResult?.public_id,
        fileName: uploadResult?.signedFileName,
      };

    } catch (error) {
      if (tmpPath) {
        await fsPromises.unlink(tmpPath).catch((cleanupError) => {
            console.warn('--- [signOTP] Service: Cleanup tmp file catch ---', {
              currentStep: signOtpCurrentStep,
              docId,
              workItemId,
              tmpPath,
              errorMessage: cleanupError?.message || String(cleanupError),
            });
          });
      }
      console.log('--- [signOTP] Service: Global Catch Block ---', error?.message);
      console.error('--- [signOTP] Service: Global Catch Context ---', {
        currentStep: signOtpCurrentStep,
        elapsedMs: Date.now() - startTimeTracking,
        docId,
        type,
        actionCode,
        workItemId,
        keyword,
        userId,
        originalUser,
        sourceFileId,
        tmpPath,
        errorName: error?.name,
        errorMessage: error?.message || String(error),
      });
      console.error(error.stack);

      const errorMsg = error.message;
      if (error?.response?.data?.message) {
        throw new BadRequestException(error?.response?.data);
      }

      console.error('[sign-otp] Service error:', errorMsg);
      if (error instanceof ForbiddenException || error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new BadRequestException(`Lỗi khi ký OTP: ${errorMsg}`);
    }
  }

  // ==================== EXAMPLE FILES CRUD ====================
  async createExampleFile(
    file: Express.Multer.File,
    dto: any,
    userId: string,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('File không được để trống');
      }

      // Check if example_key already exists
      const existingKey = await this.filesRepository.checkExampleKeyExists(dto.example_key);
      if (existingKey) {
        throw new ConflictException(`example_key '${dto.example_key}' đã tồn tại`);
      }

      // Upload file như bình thường
      const uploadDto: UploadFileDto = {
        object_id: 'example_files',
        object_type: 'example_file',
      };

      const uploadResult = await this.uploadFile(uploadDto, file, userId);

      if (!uploadResult || !uploadResult.id) {
        throw new InternalServerErrorException('Upload file mẫu thất bại');
      }

      // Update file với example_key và example_type
      const pool = await this.getMsPool();
      const request = pool.request();
      request.input('file_id', uploadResult.id);
      request.input('example_key', dto.example_key);
      request.input('example_type', dto.example_type || 'template');
      request.input('description', dto.description || null);

      await request.query(`
        UPDATE files 
        SET example_key = @example_key,
            example_type = @example_type,
            description = @description
        WHERE id = @file_id
      `);

      return uploadResult;
    } catch (error) {
      this.logger.error(`Create example file error: ${error.message}`);
      throw error;
    }
  }

  async getExampleFiles(type?: string, page: number = 1, limit: number = 10) {
    try {
      return await this.filesRepository.getExampleFiles(type, page, limit);
    } catch (error) {
      this.logger.error(`Get example files error: ${error.message}`);
      throw new InternalServerErrorException('Lấy file mẫu thất bại');
    }
  }

  async getExampleFileByKey(exampleKey: string) {
    try {
      const file = await this.filesRepository.getExampleFileByKey(exampleKey);
      if (!file) {
        throw new NotFoundException(`File mẫu '${exampleKey}' không tồn tại`);
      }
      return file;
    } catch (error) {
      this.logger.error(`Get example file by key error: ${error.message}`);
      throw error;
    }
  }

  async updateExampleFile(
    exampleKey: string,
    dto: any,
    file?: Express.Multer.File,
    userId?: string,
  ) {
    try {
      const existingFile = await this.filesRepository.getExampleFileByKey(exampleKey);
      if (!existingFile) {
        throw new NotFoundException(`File mẫu '${exampleKey}' không tồn tại`);
      }

      const updateData: any = {};

      if (dto.example_type !== undefined) {
        updateData.example_type = dto.example_type;
      }
      if (dto.description !== undefined) {
        updateData.description = dto.description;
      }

      // Nếu có file mới thì upload và cập nhật các trường liên quan đến file
      if (file) {
        let finalFileName = file.originalname;
        try {
          finalFileName = decodeURIComponent(file.originalname);
        } catch (e) {
          this.logger.warn('Decode filename error, using original');
        }
        file.originalname = finalFileName;

        const fileBuffer: Buffer = file.buffer ?? await fsPromises.readFile(file.path);

        const config = await this.getActiveStorageConfig();
        const useMinio = config.active_type === 'minio';
        let storagePath: string;

        if (useMinio) {
          const minioClient = await this.getMinioClient(config);
          storagePath = `TCSG/example_file/${Date.now()}_${finalFileName}`;
          await minioClient.putObject(config.minio_bucket, storagePath, fileBuffer, fileBuffer.length);
        } else {
          const destinationDir = path.join(this.uploadBase, 'TCSG', 'example_file');
          await fsPromises.mkdir(destinationDir, { recursive: true });
          let newPath = path.join(destinationDir, finalFileName);
          let counter = 1;
          while (
            await fsPromises
              .access(newPath)
              .then(() => true)
              .catch(() => false)
          ) {
            const ext = path.extname(finalFileName);
            const base = path.basename(finalFileName, ext);
            newPath = path.join(destinationDir, `${base}_${counter}${ext}`);
            counter++;
          }
          await fsPromises.writeFile(newPath, fileBuffer);
          storagePath = path.relative(this.uploadBase, newPath).replace(/\\/g, '/');
        }

        updateData.file_name = finalFileName;
        updateData.storage_path = storagePath;
        updateData.file_path = storagePath;
        updateData.mime_type = file.mimetype;
        updateData.file_size = fileBuffer.length;
        updateData.storage_type = useMinio ? 'minio' : 'filesystem';
      }

      await this.filesRepository.updateExampleFile(exampleKey, updateData);
      return await this.filesRepository.getExampleFileByKey(exampleKey);
    } catch (error) {
      this.logger.error(`Update example file error: ${error.message}`);
      throw error;
    }
  }

  async deleteExampleFile(exampleKey: string) {
    try {
      const file = await this.filesRepository.getExampleFileByKey(exampleKey);
      if (!file) {
        throw new NotFoundException(`File mẫu '${exampleKey}' không tồn tại`);
      }

      await this.filesRepository.softDeleteExampleFile(exampleKey);
      return { message: `Xóa file mẫu '${exampleKey}' thành công` };
    } catch (error) {
      this.logger.error(`Delete example file error: ${error.message}`);
      throw error;
    }
  }

  async getExampleFileById(id: number) {
    try {
      const file = await this.filesRepository.getExampleFileById(id);
      if (!file) {
        throw new NotFoundException(`File mẫu ID '${id}' không tồn tại`);
      }
      return file;
    } catch (error) {
      this.logger.error(`Get example file by id error: ${error.message}`);
      throw error;
    }
  }

  async updateExampleFileById(
    id: number,
    dto: any,
    file?: Express.Multer.File,
    userId?: string,
  ) {
    try {
      const existingFile = await this.filesRepository.getExampleFileById(id);
      if (!existingFile) {
        throw new NotFoundException(`File mẫu ID '${id}' không tồn tại`);
      }

      const updateData: any = {};

      if (dto.example_type !== undefined) {
        updateData.example_type = dto.example_type;
      }
      if (dto.description !== undefined) {
        updateData.description = dto.description;
      }

      if (file) {
        let finalFileName = file.originalname;
        try {
          finalFileName = decodeURIComponent(file.originalname);
        } catch (e) {
          this.logger.warn('Decode filename error, using original');
        }
        file.originalname = finalFileName;

        const fileBuffer: Buffer = file.buffer ?? await fsPromises.readFile(file.path);

        const config = await this.getActiveStorageConfig();
        const useMinio = config.active_type === 'minio';
        let storagePath: string;

        if (useMinio) {
          const minioClient = await this.getMinioClient(config);
          storagePath = `TCSG/example_file/${Date.now()}_${finalFileName}`;
          await minioClient.putObject(config.minio_bucket, storagePath, fileBuffer, fileBuffer.length);
        } else {
          const destinationDir = path.join(this.uploadBase, 'TCSG', 'example_file');
          await fsPromises.mkdir(destinationDir, { recursive: true });
          let newPath = path.join(destinationDir, finalFileName);
          let counter = 1;
          while (
            await fsPromises
              .access(newPath)
              .then(() => true)
              .catch(() => false)
          ) {
            const ext = path.extname(finalFileName);
            const base = path.basename(finalFileName, ext);
            newPath = path.join(destinationDir, `${base}_${counter}${ext}`);
            counter++;
          }
          await fsPromises.writeFile(newPath, fileBuffer);
          storagePath = path.relative(this.uploadBase, newPath).replace(/\\/g, '/');
        }

        updateData.file_name = finalFileName;
        updateData.storage_path = storagePath;
        updateData.file_path = storagePath;
        updateData.mime_type = file.mimetype;
        updateData.file_size = fileBuffer.length;
        updateData.storage_type = useMinio ? 'minio' : 'filesystem';
      }

      await this.filesRepository.updateExampleFileById(id, updateData);
      return await this.filesRepository.getExampleFileById(id);
    } catch (error) {
      this.logger.error(`Update example file by id error: ${error.message}`);
      throw error;
    }
  }

  async deleteExampleFileById(id: number) {
    try {
      const file = await this.filesRepository.getExampleFileById(id);
      if (!file) {
        throw new NotFoundException(`File mẫu ID '${id}' không tồn tại`);
      }

      await this.filesRepository.softDeleteExampleFileById(id);
      return { message: `Xóa file mẫu ID '${id}' thành công` };
    } catch (error) {
      this.logger.error(`Delete example file by id error: ${error.message}`);
      throw error;
    }
  }
}



