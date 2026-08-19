// src/files-management/files-management.service.ts

import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
// import { Pool } from 'mysql2/promise';
import * as fsPromises from 'fs/promises'; // Import fs.promises for async file operations
import { UploadFileDto } from './dto/upload-file.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { InsertTextDto } from './dto/insert-text-to-pdf.dto';
import { StandardFonts, PDFDocument } from 'pdf-lib';
import axios from 'axios';
import { Client as MinioClient } from 'minio';
import { ConnectionPool, IResult, MAX } from 'mssql';
import * as sql from 'mssql';
import { DataSource, In, Repository } from 'typeorm';
import { FileEntity } from './file.entity';
import { FileRelationEntity } from './file-relation.entity';
import { PostStorageAiService } from 'src/post-storage-ai/post-storage-ai.service';
import { UserEntity } from 'src/users/entities/user.entity';
import { getMssqlPool } from 'src/database/mssql.pool';
import { ConfigService } from '@nestjs/config';
import { MinioConfigService } from 'src/utils/config-minio.util';

@Injectable()
export class FilesManagementService {
  private uploadBase = path.join(process.cwd(), 'upload');
  private pool: ConnectionPool | null = null;

  constructor(
    @InjectRepository(FileEntity, 'mssqlConnection')
    private readonly fileRepo: Repository<FileEntity>,
    @InjectRepository(FileRelationEntity, 'mssqlConnection')
    private readonly fileRelationRepo: Repository<FileRelationEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepository: Repository<UserEntity>,
    private readonly dataSource: DataSource,
    private readonly postStorageAiService: PostStorageAiService,
    private readonly configService: ConfigService,
    private readonly minioConfigService: MinioConfigService,
  ) { }

  private normalizeSignedFileName(fileName: string): string {
    if (!fileName) return '';
    const ext = path.extname(fileName);
    const base = path.basename(fileName, ext);
    const cleaned = base
      .replace(/_signed_\d{8}_\d{6}/g, '')
      .replace(/__+/g, '_')
      .replace(/^_+|_+$/g, '');
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

  async uploadFile(dto: UploadFileDto, file: Express.Multer.File, userId?: string) {
    return this.dataSource.transaction(async (manager) => {
      const fileRepo = manager.getRepository(FileEntity);
      const fileRelationRepo = manager.getRepository(FileRelationEntity);

      const config = await this.getActiveStorageConfig(); // Giữ lại query thô cho config
      const useMinio = config.active_type === 'minio';
      let storagePath: string;

      if (useMinio) {
        const minioClient = await this.getMinioClient(config);
        storagePath = `TCSG/${dto.object_type || 'default'}/${Date.now()}_${file.originalname}`;
        const fileBuffer = await fs.promises.readFile(file.path);
        await minioClient.putObject(config.minio_bucket, storagePath, fileBuffer, file.size);
      } else {
        const destinationDir = path.join(
          config.fs_base_path || this.uploadBase,
          'TCSG',
          dto.object_type || 'default',
        );
        await fsPromises.mkdir(destinationDir, { recursive: true });
        let newPath = path.join(destinationDir, file.filename);
        let counter = 1;
        while (await fsPromises.access(newPath).then(() => true).catch(() => false)) {
          const ext = path.extname(file.filename);
          const base = path.basename(file.filename, ext);
          newPath = path.join(destinationDir, `${base}_${counter}${ext}`);
          counter++;
        }
        await fsPromises.rename(file.path, newPath);
        storagePath = path.relative(config.fs_base_path || this.uploadBase, newPath).replace(/\\/g, '/');
      }

      // ===== CASE 1: Upload mới =====
      if (!dto.edit_file_id && !dto.signed_file_id) {
        const newFile = fileRepo.create({
          file_name: file.originalname,
          storage_type: useMinio ? 'minio' : 'filesystem',
          storage_path: storagePath,
          file_path: storagePath,
          mime_type: file.mimetype,
          file_size: file.size,
          is_directory: false,
          parent_id: dto.parent_id,
          description: dto.description,
          created_by: userId,
          version: '1.0',
          is_signed_file: false,
          number_of_signed_file: 0,
          typeSize: dto.typeSize,
        });
        const savedFile = await fileRepo.save(newFile) as FileEntity;

        const newRelation = fileRelationRepo.create({
          object_type: dto.object_type || 'default',
          object_id: dto.object_id || '0',
          file_id: savedFile.id,
        });
        await fileRelationRepo.save(newRelation);

        // ✅ OUTGOING: docDraft
        if (dto.object_type === 'docDraft' && dto.object_id) {
          this.postStorageAiService
            .trySyncOutgoing({
              documentId: String(dto.object_id),
              event: 'file',
            })
            .catch((err) => console.error('PostStorageAI sync failed (upload outgoing):', err));
        }

        // ✅ INCOMING: incommingdocument
        if (dto.object_type === 'incommingdocument' && dto.object_id) {
          this.postStorageAiService
            .trySyncIncoming({
              documentId: String(dto.object_id),
              event: 'file',
            })
            .catch((err) => console.error('PostStorageAI sync failed (upload incoming):', err));
        }

        return { id: savedFile.id, file_name: file.originalname, storage_type: useMinio ? 'minio' : 'filesystem', file_path: storagePath, typeSize: savedFile.typeSize };
      }

      // ===== CASE 2: Chỉnh sửa =====
      if (dto.edit_file_id) {
        const origin = await fileRepo.findOneBy({ id: dto.edit_file_id });
        if (!origin) throw new NotFoundException('File chỉnh sửa không tồn tại');

        if (origin.created_by === userId || !userId) {
          await fileRepo.update(origin.id, {
            file_name: file.originalname,
            file_path: storagePath,
            storage_path: storagePath,
            mime_type: file.mimetype,
            file_size: file.size,
            typeSize: dto.typeSize,
          });

          return { id: origin.id, file_name: file.originalname, storage_type: useMinio ? 'minio' : 'filesystem', file_path: storagePath, version: origin.version, typeSize: dto.typeSize };
        }

        // Người khác chỉnh sửa → tạo version mới
        const versions = await fileRepo.find({
          where: [{ id: origin.id }, { parent_id: origin.id }],
          order: { created_at: 'DESC' }, // Sắp xếp để lấy version mới nhất
        });

        let newVersion = 1.0;
        if (versions.length > 0) {
          const latestVersion = parseFloat(versions[0].version || '1.0');
          if (!isNaN(latestVersion)) {
            newVersion = latestVersion + 1.0;
          }
        }

        const newVersionFile = fileRepo.create({
          file_name: file.originalname,
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
        });
        const savedVersion = await fileRepo.save(newVersionFile) as FileEntity;

        const newRelation = fileRelationRepo.create({
          object_type: dto.object_type || 'default',
          object_id: dto.object_id || '0',
          file_id: savedVersion.id,
        });
        await fileRelationRepo.save(newRelation);

        // ✅ OUTGOING: docDraft
        if (dto.object_type === 'docDraft' && dto.object_id) {
          this.postStorageAiService
            .trySyncOutgoing({
              documentId: String(dto.object_id),
              event: 'file',
            })
            .catch((err) => console.error('PostStorageAI sync failed (upload outgoing):', err));
        }

        // ✅ INCOMING: incommingdocument
        if (dto.object_type === 'incommingdocument' && dto.object_id) {
          this.postStorageAiService
            .trySyncIncoming({
              documentId: String(dto.object_id),
              event: 'file',
            })
            .catch((err) => console.error('PostStorageAI sync failed (upload incoming):', err));
        }

        return { id: savedVersion.id, file_name: file.originalname, storage_type: useMinio ? 'minio' : 'filesystem', file_path: storagePath, version: newVersion.toFixed(1), typeSize: savedVersion.typeSize };
      }

      // ===== CASE 3: Ký file =====
      if (dto.signed_file_id) {
        const origin = await fileRepo.findOneBy({ id: Number(dto.signed_file_id) });
        if (!origin) throw new NotFoundException('File gốc để ký không tồn tại');

        const newSignedCount = (origin.number_of_signed_file || 0) + 1;
        await fileRepo.update(origin.id, { number_of_signed_file: newSignedCount });

        const signedFile = fileRepo.create({
          file_name: file.originalname,
          storage_type: useMinio ? 'minio' : 'filesystem',
          storage_path: storagePath,
          file_path: storagePath,
          mime_type: file.mimetype,
          file_size: file.size,
          description: dto.description,
          created_by: userId,
          version: 'signed',
          is_signed_file: true,
          number_of_signed_file: newSignedCount,
        });
        const savedSignedFile = await fileRepo.save(signedFile) as FileEntity;

        const newRelation = fileRelationRepo.create({
          object_type: dto.object_type || 'default',
          object_id: dto.object_id || '0',
          file_id: savedSignedFile.id,
        });
        await fileRelationRepo.save(newRelation);

        // ✅ OUTGOING: docDraft
        if (dto.object_type === 'docDraft' && dto.object_id) {
          this.postStorageAiService
            .trySyncOutgoing({
              documentId: String(dto.object_id),
              event: 'file',
            })
            .catch((err) => console.error('PostStorageAI sync failed (upload outgoing):', err));
        }

        // ✅ INCOMING: incommingdocument
        if (dto.object_type === 'incommingdocument' && dto.object_id) {
          this.postStorageAiService
            .trySyncIncoming({
              documentId: String(dto.object_id),
              event: 'file',
            })
            .catch((err) => console.error('PostStorageAI sync failed (upload incoming):', err));
        }
        return { id: savedSignedFile.id, file_name: file.originalname, storage_type: useMinio ? 'minio' : 'filesystem', file_path: storagePath, signed_number: newSignedCount, typeSize: savedSignedFile.typeSize };
      }
    });
  }


  async getOldFilesByObject(
    type: string,
    objectId: string,
    pagination: { page: number; limit: number },
  ) {
    const pool = await this.getMsPool();
    const request = pool.request();
    request.input('type', type);
    request.input('objectId', objectId);

    const result = await request.query(`
      SELECT f.*, fr.object_type, fr.object_id
      FROM file_relations fr
      JOIN files f ON fr.file_id = f.id
      WHERE fr.object_type = @type AND fr.object_id = @objectId AND f.status = 1 AND fr.status = 1
      ORDER BY f.created_at DESC
    `);

    const allFiles = result.recordset;

    const latestMap = new Map<string, any>();
    for (const f of allFiles) {
      const rootId = f.parent_id || f.id;
      const exist = latestMap.get(rootId);
      if (!exist || new Date(f.updated_at) > new Date(exist.updated_at)) {
        latestMap.set(rootId, f);
      }
    }

    const latestFiles = Array.from(latestMap.values());
    const latestByName = this.pickMostSignedByName(latestFiles);
    const latestIds = new Set(latestByName.map(f => f.id));
    const oldFiles = allFiles.filter(f => !latestIds.has(f.id));

    const page = +pagination.page > 0 ? +pagination.page : 1;
    const limit = +pagination.limit > 0 ? +pagination.limit : 10;
    const offset = (page - 1) * limit;

    const pagedData = oldFiles.slice(offset, offset + limit);

    const userIds = Array.from(
      new Set(pagedData.map((row) => row.created_by).filter(Boolean)),
    );

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
      created_by_name: userMap.get(row.created_by) || null,
    }));

    return {
      data,
      total: oldFiles.length,
      page,
      limit,
    };
  }

  async getLatestFilesByObject(
    type: string,
    objectId: string,
    pagination: { page: number; limit: number },
  ) {
    const pool = await this.getMsPool();
    const request = pool.request();
    request.input('type', type);
    request.input('objectId', objectId);

    const result = await request.query(`
      SELECT f.*, fr.object_type, fr.object_id
      FROM file_relations fr
      JOIN files f ON fr.file_id = f.id
      WHERE fr.object_type = @type AND fr.object_id = @objectId AND f.status = 1 AND fr.status = 1
      ORDER BY f.created_at DESC
    `);

    const allFiles = result.recordset;

    const latestMap = new Map<string, any>();
    for (const f of allFiles) {
      const rootId = f.parent_id || f.id;
      const exist = latestMap.get(rootId);
      if (!exist || new Date(f.updated_at) > new Date(exist.updated_at)) {
        latestMap.set(rootId, f);
      }
    }

    const latestFiles = Array.from(latestMap.values());
    const latestByName = this.pickMostSignedByName(latestFiles);

    const page = +pagination.page > 0 ? +pagination.page : 1;
    const limit = +pagination.limit > 0 ? +pagination.limit : 10;
    const offset = (page - 1) * limit;

    return {
      data: latestByName.slice(offset, offset + limit),
      total: latestByName.length,
      page,
      limit,
    };
  }


  /** Download file (Filesystem hoặc MinIO) */
  async getFileForView(
    id: string | number,
    opts?: { object_type?: string; object_id?: string; edit_file_id?: string; userId?: string }
  ): Promise<{
    fileBuffer?: Buffer;
    fullPath?: string;
    filename: string;
    mimetype: string;
  }> {

    const pool = await this.getMsPool();
    const request = pool.request();
    request.input('id', id);

    const result = await request.query(
      `SELECT * FROM files WHERE id = @id AND is_directory = 0 AND status = 1`
    );

    const rows = result.recordset;
    if (!rows.length) throw new NotFoundException('Không tìm thấy file');
    const file = rows[0];

    if (file.storage_type === 'minio') {
      const config = await this.getActiveStorageConfig();
      const minioClient = await this.getMinioClient(config);
      try {
        const obj = await minioClient.getObject(config.minio_bucket, file.storage_path);
        const chunks: Buffer[] = [];
        for await (const chunk of obj) chunks.push(chunk);
        return {
          fileBuffer: Buffer.concat(chunks),
          filename: file.file_name,
          mimetype: file.mime_type || 'application/octet-stream',
        };
      } catch {
        throw new NotFoundException('File không tồn tại trên MinIO');
      }
    } else {
      const fullPath = path.join(this.uploadBase, file.file_path);
      if (!fs.existsSync(fullPath)) throw new NotFoundException('File không tồn tại trên máy chủ');
      return {
        fullPath,
        filename: file.file_name,
        mimetype: file.mime_type || 'application/octet-stream',
      };
    }
  }

  /** CREATE FOLDER */
  async createFolder(dto: CreateFolderDto) {
    const pool = await this.getMsPool();
    const request = pool.request();
    request.input('folder_name', dto.folder_name);
    request.input('parent_id', dto.parent_id || null);
    request.input('description', dto.description || null);

    const result = await request.query(`
      INSERT INTO files (file_name, file_path, mime_type, file_size, is_directory, parent_id, description, status)
      OUTPUT inserted.id
      VALUES (@folder_name, NULL, NULL, NULL, 1, @parent_id, @description, 1);
    `);

    const folderId = result.recordset[0].id;
    return { id: folderId, name: dto.folder_name };
  }
  async getFilesByObject(
    type: string,
    objectId: string,
    pagination: { page: number; limit: number },
    is_signed_file?: number,
  ) {
    const fromClause = `FROM file_relations fr JOIN files f ON fr.file_id = f.id`;

    const conditions: string[] = ['f.status = 1', 'fr.status = 1'];
    const pool = await this.getMsPool();
    const request = pool.request();

    if (type) {
      conditions.push('fr.object_type = @type');
      request.input('type', type);
    }

    if (objectId) {
      conditions.push('fr.object_id = @objectId');
      request.input('objectId', objectId);
    }

    if (typeof is_signed_file === 'number') {
      conditions.push('f.is_signed_file = @is_signed_file');
      request.input('is_signed_file', is_signed_file);
    } else {
      conditions.push('(f.is_signed_file IS NULL OR f.is_signed_file = 0)');
    }

    const whereClause = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';

    // ===== Count total =====
    const countQuery = `SELECT COUNT(f.id) as total ${fromClause}${whereClause}`;
    const totalResult = await request.query(countQuery);
    const total = totalResult.recordset[0]?.total || 0;

    if (total === 0) {
      return { data: [], total, page: +pagination.page, limit: +pagination.limit };
    }

    // ===== Pagination =====
    const page = +pagination.page > 0 ? +pagination.page : 1;
    const limit = +pagination.limit > 0 ? +pagination.limit : 10;
    const offset = (page - 1) * limit;
    request.input('limit', limit);
    request.input('offset', offset);

    const dataQuery = `
      SELECT f.*, fr.object_type, fr.object_id
      ${fromClause}
      ${whereClause}
      ORDER BY f.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const rowsResult = await request.query(dataQuery);
    const rows = rowsResult.recordset;

    if (!rows.length) {
      return { data: [], total, page, limit };
    }

    const userIds = Array.from(
      new Set(rows.map((row) => row.created_by).filter(Boolean)),
    );

    let userMap = new Map<string, string>();

    if (userIds.length > 0) {
      const users = await this.userRepository.find({
        where: { id: In(userIds) },
        select: ['id', 'name'],
      });
      userMap = new Map(users.map((user) => [user.id, user.name]));
    }

    const data = rows.map((row) => ({
      ...row,
      created_by_name: userMap.get(row.created_by) || null,
    }));

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
    id: string,
  ): Promise<{ fullPath: string; filename: string }> {
    const pool = await this.getMsPool();
    const request = pool.request();
    request.input('id', id);

    const result = await request.query(
      `SELECT file_name, file_path FROM files WHERE id = @id AND is_directory = 0 AND status = 1`
    );

    const rows = result.recordset;

    if (!rows.length) {
      throw new NotFoundException(`Không tìm thấy file với ID: ${id}`);
    }

    const fileRecord = rows[0];
    const fullPath = path.join(this.uploadBase, fileRecord.file_path);

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('File vật lý không tồn tại trên máy chủ.');
    }

    return {
      fullPath,
      filename: fileRecord.file_name,
    };
  }

  // ===================== DELETE =====================
  async deleteFile(id: string) {
    const pool = await this.getMsPool();
    const request = pool.request();
    request.input('id', id);

    const result = await request.query(
      `SELECT file_path, is_directory FROM files WHERE id = @id AND status = 1`
    );

    const rows = result.recordset;
    if (!rows.length) throw new NotFoundException('Không tìm thấy file hoặc file đã bị xóa');

    const file = rows[0];

    // Ghi chú: Khi xóa mềm, không xóa file vật lý ngay
    /*
    if (file.file_path) {
      const fullPath = path.join(this.uploadBase, file.file_path);
      if (!file.is_directory && fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    */

    // Cập nhật status file_relations
    const pool2 = await this.getMsPool();
    await pool2.request()
      .input('id', id)
      .query(`UPDATE file_relations SET status = 3 WHERE file_id = @id`);

    // Cập nhật status files
    const pool3 = await this.getMsPool();
    await pool3.request()
      .input('id', id)
      .query(`UPDATE files SET status = 3 WHERE id = @id`);

    return { success: true };
  }

  async convertDocxToPdf(id: string, userId: string) {
    // Lấy file gốc
    const pool = await this.getMsPool();
    const request = pool.request();
    request.input('id', id);
    const result = await request.query(
      `SELECT * FROM files WHERE id = @id AND status = 1`
    );
    const rows = result.recordset;

    if (!rows.length) throw new NotFoundException(`File DOCX không tồn tại`);
    const file = rows[0];

    if (
      file.mime_type !==
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
      file.type !== '.docx'
    ) {
      throw new BadRequestException('Chỉ hỗ trợ convert file DOCX');
    }

    const inputPath = file.file_path;
    const pdfName = file.file_name.replace(file.type || '.docx', '_converted.pdf');
    const outputPath = path.join(
      this.uploadBase,
      path.dirname(file.file_path),
      pdfName,
    );

    // Build URL file để gửi cho convert proxy
    const fileUrl = `${process.env.URL_NESTJS}/api/files/raw/${id}`;

    // Gọi API convert DOCX → PDF
    const response = await axios.get(
      `${process.env.APP_CONVERT_URL}/doc-url-to-pdf?docUrl=${encodeURIComponent(fileUrl)}`,
      { responseType: 'arraybuffer' },
    );

    // Lưu file PDF vào server
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    await fs.writeFileSync(outputPath, Buffer.from(response.data, 'binary'));

    // Tạo bản ghi file mới trong DB
    const pool2 = await this.getMsPool();
    const insertRequest = pool2.request();
    insertRequest.input('file_name', pdfName);
    insertRequest.input('file_path', path.relative(this.uploadBase, outputPath).replace(/\\/g, '/'));
    insertRequest.input('mime_type', 'application/pdf');
    insertRequest.input('file_size', response.data.length);
    insertRequest.input('parent_id', file.parent_id || null);
    insertRequest.input('description', file.description || null);
    insertRequest.input('created_by', userId);

    const insertResult = await insertRequest.query(`
      INSERT INTO files 
        (file_name, file_path, mime_type, file_size, is_directory, parent_id, description, status, created_by, version)
      OUTPUT inserted.id
      VALUES 
        (@file_name, @file_path, @mime_type, @file_size, 0, @parent_id, @description, 1, @created_by, '1.0');
    `);

    const pdfFileId = insertResult.recordset[0].id;

    // Tạo file relation
    const pool3 = await this.getMsPool();
    const relRequest = pool3.request();
    relRequest.input('object_type', file.object_type || 'default');
    relRequest.input('object_id', file.object_id || 0);
    relRequest.input('file_id', pdfFileId);

    await relRequest.query(`
      INSERT INTO file_relations (object_type, object_id, file_id, status)
      VALUES (@object_type, @object_id, @file_id, 1)
    `);

    return { pdfFileId, name: pdfName, path: outputPath };
  }


  async insertTextsToPdfFile(dto: InsertTextDto, userId: string) {
    const { id, texts, auto } = dto;
    // 1. Lấy thông tin file
    const fileId = id;
    const { fullPath, fileBuffer } = await this.getFileForView(fileId);

    let pdfBytes: Buffer;

    if (fileBuffer) {
      // Trường hợp MinIO: sử dụng buffer đã có
      pdfBytes = fileBuffer;
    } else if (fullPath && fs.existsSync(fullPath)) {
      // Trường hợp Filesystem: đọc file từ đường dẫn
      pdfBytes = fs.readFileSync(fullPath);
    } else {
      throw new NotFoundException('Không tìm thấy file trên server');
    }

    if (!pdfBytes.toString().startsWith('%PDF')) {
      throw new InternalServerErrorException('File không phải PDF hợp lệ');
    }

    // 2. Load PDF
    if (texts && typeof texts === 'object') {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const pages = pdfDoc.getPages();

      if (pages.length === 0) {
        throw new InternalServerErrorException('PDF không có trang nào');
      }

      // 3. Chèn text vào trang đầu
      const page = pages[0];
      const { height } = page.getSize();
      Object.entries(texts).forEach(([key, item]: any) => {
        const { content, x, y, fontSize = 16 } = item || {};
        if (!content || !x || !y) return;
        page.drawText(content.toString(), {
          x: Number(x),
          y: height - Number(y),
          size: Number(fontSize) || 16,
          font: timesRomanFont,
        });
      });

      // 4. Lưu file mới (chỉ áp dụng cho filesystem)
      if (fullPath) {
        const backupPath = fullPath.replace(/\.pdf$/, '-backup.pdf');
        if (!fs.existsSync(backupPath)) fs.copyFileSync(fullPath, backupPath);
        fs.writeFileSync(fullPath, await pdfDoc.save());
      }

      return {
        status: 1,
        message: 'Text inserted into PDF successfully',
        filePath: fullPath, // Lưu ý: filePath sẽ là undefined nếu là MinIO
      };
    }
    if (auto && Object.keys(auto).length) {
      try {
        // 1. Load PDF gốc
        const originalPdf = await PDFDocument.load(pdfBytes);

        // 2. Lấy trang đầu để auto insert
        const firstPage = originalPdf.getPages()[0];
        const { height } = firstPage.getSize();

        // 3. Chèn text tự động (auto) vào trang đầu
        const timesRomanFont = await originalPdf.embedFont(
          StandardFonts.TimesRoman,
        );
        const layout = {
          day: { x: 405, y: 120, fontSize: 13 },
          month: { x: 458, y: 120, fontSize: 13 },
          year: { x: 500, y: 120, fontSize: 13 },
          number: { x: 144, y: 120, fontSize: 13 },
        };
        auto.forEach((item) => {
          const pos = layout[item.key];
          if (!pos || !item.value) return;
          firstPage.drawText(item.value.toString(), {
            x: pos.x,
            y: height - pos.y,
            size: pos.fontSize,
            font: timesRomanFont,
          });
        });

        // 4. Lưu file (overwrite hoặc backup trước)
        if (fullPath) {
          const backupPath = fullPath.replace(/\.pdf$/, '-backup.pdf');
          if (!fs.existsSync(backupPath)) fs.copyFileSync(fullPath, backupPath);

          const newPdfBytes = await originalPdf.save();
          await fs.promises.writeFile(fullPath, newPdfBytes);
        }

        return {
          status: 1,
          message: 'Text auto-inserted into PDF successfully',
          filePath: fullPath, // Lưu ý: filePath sẽ là undefined nếu là MinIO
        };
      } catch (e: any) {
        throw new InternalServerErrorException(
          `Auto insert failed: ${e.message}`,
        );
      }
    }
  }

  async previewTextToPdfFile(dto: InsertTextDto): Promise<{ data: string }> {
    try {
      const { id, texts, newFile } = dto;
      const fileId = Number(id);
      if (!fileId || !texts || Object.keys(texts).length === 0) {
        throw new BadRequestException("Thiếu thông tin bắt buộc");
      }

      let pdfBytes: Buffer;

      if (newFile) {
        const pool = await this.getMsPool();
        const request = pool.request();
        request.input('id', fileId);

        const result = await request.query(`
          SELECT * FROM files WHERE id = @id AND status = 1
        `);

        if (!result.recordset.length) throw new NotFoundException(`File DOCX không tồn tại`);

        const file = result.recordset[0];

        const isPdf =
          file.mime_type === 'application/pdf' || file.type === '.pdf';

        if (isPdf) {
          const { fullPath, fileBuffer } = await this.getFileForView(fileId as any);

          if (fileBuffer) {
            pdfBytes = fileBuffer;
          } else if (fullPath && fs.existsSync(fullPath)) {
            pdfBytes = fs.readFileSync(fullPath);
          } else {
            throw new NotFoundException("File không tồn tại");
          }
        } else {
          if (
            file.mime_type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
            file.type !== '.docx'
          ) {
            throw new BadRequestException('Chỉ hỗ trợ convert file DOCX');
          }

          const fileUrl = `${process.env.URL_NESTJS}/api/files/raw/${fileId}`;
          const response = await axios.get(
            `${process.env.APP_CONVERT_URL}/doc-url-to-pdf?docUrl=${encodeURIComponent(fileUrl)}`,
            { responseType: 'arraybuffer' }
          );

          pdfBytes = Buffer.from(response.data, 'binary');
        }
      } else {
        const { fullPath, fileBuffer } = await this.getFileForView(fileId);

        if (fileBuffer) {
          pdfBytes = fileBuffer;
        } else if (fullPath && fs.existsSync(fullPath)) {
          pdfBytes = fs.readFileSync(fullPath);
        } else {
          throw new NotFoundException("File không tồn tại");
        }
      }

      const pdfDoc = await PDFDocument.load(pdfBytes);
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

      const page = pdfDoc.getPages()[0];
      if (!page) throw new NotFoundException("File PDF trống");

      const { height } = page.getSize();

      Object.entries(texts).forEach(([_, item]: any) => {
        if (!item?.content) return;
        page.drawText(item.content.toString(), {
          x: Number(item.x),
          y: height - Number(item.y),
          size: Number(item.fontSize) || 16,
          font: timesRomanFont,
        });
      });

      const newBytes = await pdfDoc.save();
      const base64 = Buffer.from(newBytes).toString("base64");

      return { data: base64 };
    } catch (err) {
      console.error("Error previewTextToPdfFile:", err);
      throw err;
    }
  }

  async removeMany(ids: number[]) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('Cần cung cấp danh sách ID để xóa.');
    }

    const pool = await this.getMsPool();
    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();

      const request = transaction.request();
      // Chuyển danh sách ids thành table-valued parameter hoặc dùng IN với @id1, @id2, ...
      ids.forEach((id, idx) => request.input(`id${idx}`, id));
      const placeholders = ids.map((_, idx) => `@id${idx}`).join(',');

      // Xóa mềm các liên kết file
      await request.query(`UPDATE file_relations SET status = 3 WHERE file_id IN (${placeholders})`);

      // Xóa mềm các file/thư mục
      const result = await request.query(`UPDATE files SET status = 3 WHERE id IN (${placeholders})`);

      await transaction.commit();

      return {
        message: `Đã xóa thành công ${result.rowsAffected[0]} file/thư mục.`,
      };
    } catch (error) {
      await transaction.rollback();
      throw new InternalServerErrorException('Lỗi khi xóa file.');
    }
  }

  async updateFileById(id: string, fileBuffer: Buffer) {
    const pool = await this.getMsPool();
    const request = pool.request();
    request.input('id', id);

    const result = await request.query(
      `SELECT file_path FROM files WHERE id = @id AND status = 1`
    );

    const rows = result.recordset;
    if (!rows.length) {
      throw new NotFoundException(`File with id ${id} not found`);
    }

    const fullPath = path.join(this.uploadBase, rows[0].file_path);

    // Ghi đè file vật lý
    fs.writeFileSync(fullPath, fileBuffer);

    // Cập nhật size và thời gian trong DB
    const pool2 = await this.getMsPool();
    await pool2.request()
      .input('file_size', fileBuffer.length)
      .input('id', id)
      .query(`UPDATE files SET file_size = @file_size, updated_at = GETDATE() WHERE id = @id`);

    return { success: true };
  }
  async updateOrDownload2(body: any, userId: string) {
    const NEXTCLOUD_URL = process.env.NEXTCLOUD_URL;
    const NEXTCLOUD_USERNAME = process.env.NEXTCLOUD_USERNAME;
    const NEXTCLOUD_PASSWORD = process.env.NEXTCLOUD_PASSWORD;
    const LOCAL_DOWNLOAD_PATH = process.env.LOCAL_DOWNLOAD_PATH;

    if (!NEXTCLOUD_URL || !NEXTCLOUD_USERNAME || !NEXTCLOUD_PASSWORD || !LOCAL_DOWNLOAD_PATH) {
      throw new InternalServerErrorException('Thiếu cấu hình môi trường cho NextCloud hoặc LOCAL_DOWNLOAD_PATH');
    }

    const { file_name, folder_name, object_type, object_id, edit_file_id, description, download_path } = body;
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
            auth: { username: NEXTCLOUD_USERNAME, password: NEXTCLOUD_PASSWORD },
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
        const message = lastError instanceof Error ? lastError.message : 'Unknown error';
        throw new NotFoundException(`Không thể tải file từ NextCloud: ${message}`);
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
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
      throw new InternalServerErrorException('NEXTCLOUD_API_URL không được cấu hình trong môi trường');
    }
    try {
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
      parts.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="object_id"\r\n\r\n` +
        `${dto.object_id}\r\n`
      ));
      // Part 2: file
      parts.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${file.originalname}"\r\n` +
        `Content-Type: ${file.mimetype || 'application/octet-stream'}\r\n\r\n`
      ));
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

}


