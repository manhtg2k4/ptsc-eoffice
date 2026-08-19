import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileManager } from './file-manager.entity';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { STATUS } from '../variables/CONST_STATUS';

@Injectable()
export class FileManagerService {
  private readonly uploadBaseDir: string;

  constructor(
    @InjectRepository(FileManager, 'mssqlConnection') // Nếu dùng named connection
    // @InjectRepository(FileManager) // Nếu chỉ có 1 connection mặc định
    private readonly fileManagerRepository: Repository<FileManager>,
  ) {
    this.uploadBaseDir = path.resolve(__dirname, '..', '..', 'upload');
  }

  getUploadBaseDir(): string {
    return this.uploadBaseDir;
  }

  async createFileRecord(
    clientId: string,
    file: Express.Multer.File,
    profileid?: string,
  ): Promise<FileManager> {
    const relativePath = path.join(clientId, file.filename).replace(/\\/g, '/');
    const absolutePath = path.join(this.uploadBaseDir, relativePath);

    const fileData = this.fileManagerRepository.create({
      name: file.originalname,
      nameRoot: file.filename,
      username: '',
      path: relativePath,
      realPath: absolutePath,
      fullPath: absolutePath,
      clientId,
      realName: file.filename,
      parentPath: clientId.replace(/\\/g, '/'),
      mimetype: file.mimetype,
      size: file.size,
      birthtime: new Date(),
      isFile: true,
      type: file.mimetype.split('/')[1],
      createdBy: '',
      updatedBy: '',
      profileid,
      status: STATUS.ACTIVED,
    });

    return await this.fileManagerRepository.save(fileData);
  }

  async findAllFiles(): Promise<FileManager[]> {
    return this.fileManagerRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<FileManager | null> {
    return this.fileManagerRepository.findOneBy({ id });
  }

  async downloadFile(id: string): Promise<{
    stream: StreamableFile;
    filename: string;
    mimetype: string;
  }> {
    const fileRecord = await this.fileManagerRepository.findOneBy({ id });

    if (!fileRecord) {
      throw new NotFoundException(`Không tìm thấy file với ID: ${id}`);
    }

    const filePath = fileRecord.realPath;

    try {
      await fsPromises.access(filePath, fs.constants.F_OK);
    } catch {
      console.error(`File không tồn tại trên đĩa: ${filePath}`);
      throw new InternalServerErrorException('File vật lý không tồn tại trên server.');
    }

    try {
      const fileStream = fs.createReadStream(filePath);
      const stream = new StreamableFile(fileStream);

      return {
        stream,
        filename: fileRecord.name || fileRecord.nameRoot,
        mimetype: fileRecord.mimetype || 'application/octet-stream',
      };
    } catch (error) {
      console.error(`Lỗi đọc file: ${filePath}`, error);
      throw new InternalServerErrorException('Không thể đọc file từ server.');
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    const file = await this.fileManagerRepository.findOneBy({ id: fileId });
    if (!file) return false;

    const filePath = file.realPath;

    try {
      await fsPromises.access(filePath, fs.constants.F_OK);
      await fsPromises.unlink(filePath);
    } catch (error) {
      console.warn(`Không thể xóa file vật lý: ${filePath}`, error);
      // Tiếp tục xóa DB dù file vật lý không tồn tại
    }

    await this.fileManagerRepository.remove(file);
    return true;
  }

  async downloadFileByPath(filePath: string): Promise<{
    stream: StreamableFile;
    filename: string;
    mimetype: string;
  }> {
    // Kiểm tra path traversal attack
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.includes('..')) {
      throw new NotFoundException('Đường dẫn không hợp lệ');
    }

    const fullPath = path.join(this.uploadBaseDir, normalizedPath);

    try {
      await fsPromises.access(fullPath, fs.constants.F_OK);
    } catch {
      throw new NotFoundException('File không tồn tại trên server');
    }

    try {
      const fileStream = fs.createReadStream(fullPath);
      const stream = new StreamableFile(fileStream);
      const filename = path.basename(fullPath);

      // Detect mimetype from file extension
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
      const mimetype = mimeTypes[ext] || 'application/octet-stream';

      return { stream, filename, mimetype };
    } catch (error) {
      console.error(`Lỗi đọc file: ${fullPath}`, error);
      throw new InternalServerErrorException('Không thể đọc file từ server');
    }
  }
}