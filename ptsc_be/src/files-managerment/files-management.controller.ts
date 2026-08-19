// src/files-management/files-management.controller.ts

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  Param,
  Res,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  ForbiddenException,
  Req,
  Put,
  Head,
  HttpCode,
  UnauthorizedException,
  InternalServerErrorException,
  NotFoundException,
  Patch,
  Headers,
  Inject,
  Logger,
  UseFilters,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { FilesManagementService } from './files-management-mssql.service';
import { DeleteFilesDto, UploadFileDto } from './dto/upload-file.dto';
import { CreateExampleFileDto, UpdateExampleFileDto, GetExampleFilesResponseDto } from './dto/example-file.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFileLocationDto } from './dto/update-file-location.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { InsertTextDto } from './dto/insert-text-to-pdf.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../file-manager/multer.config';
import { Response } from 'express';
import * as fs from 'fs';
import { Public } from 'src/oauth/decorator/public.decorator';
import { AllowCookieAuth } from 'src/oauth/decorator/allow-cookie-auth.decorator';
import { JwtService } from '@nestjs/jwt';
import { NotificationService } from 'src/notifycation/notification.service';
import * as path from 'path';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import { Readable } from 'stream';
import * as fsp from 'fs/promises';
import * as FormData from 'form-data';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import * as fontkit from '@pdf-lib/fontkit';
import { SignFileOtpDto } from './dto/sign-file-otp';
import { AuthorityStages, CheckAuthority, EffectiveUser, OriginalUser, AuthorityGuard } from 'src/authority-documents';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { UsersService } from 'src/users/users.service';
import { SignFilesOtpDto } from './dto/sign-files-otp';

import { JwtAuthGuard } from 'src/oauth/jwt.guard';
import { FilesViewPermissionGuard } from './guards/files-view-permission.guard';
import { FilesEditFileDocPermissionGuard } from './guards/files-edit-file-doc-permission.guard';
import { FilesApiExceptionFilter } from './filters/files-api-exception.filter';
import { DocumentPermissionGuard } from 'src/common/guards/document-permission.guard';
import { WopiTokenService } from 'src/wopi/wopi-token.service';
import { maskToken } from 'src/wopi/wopi-token.util';
import { DisallowQueryAuth } from 'src/oauth/decorator/disallow-query-auth.decorator';
import { verifyKeycloakToken } from 'src/utils/keycloak-verify';
import { BpmnEngineService } from 'src/bpmn/bpmn-engine.service';

@ApiTags('Quản lý Tập tin')
@Controller('files')
@UseGuards(JwtAuthGuard, AuthorityGuard)
@UseFilters(FilesApiExceptionFilter)
export class FilesManagementController {
  private readonly logger = new Logger(FilesManagementController.name);

  constructor(
    private readonly fileService: FilesManagementService,
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepository: Repository<UserEntity>,
    private readonly systemLogService: SystemLogServiceSql,
    @Inject('MSSQL_REPO') private readonly repo: MSSQLRepository,
    private readonly usersService: UsersService,
    private readonly wopiTokenService: WopiTokenService,
    private readonly bpmnEngine: BpmnEngineService,
  ) { }

  private upsertNgayVanBanReplacement(replacements: any[], align?: string, required?: boolean): void {
    const target: any = { keyWord: '[NgayVanBan]', type: 'CURRENT_DATE', required: required || false, isOverride: true };

    if (align) {
      target.align = align;
    }

    replacements.push(target);
  }

  private async getCurrentNodeAlign(
    documentId?: string,
    workItemId?: string,
    bpmnXML?: string | null,
  ): Promise<string | undefined> {
    if (!documentId || !workItemId || !bpmnXML) return undefined;

    try {
      const workItem = await this.repo.getWorkItem(documentId, workItemId);
      if (!workItem?.nodeId) return undefined;

      const { process } = await this.bpmnEngine.loadBpmnFromString(bpmnXML);
      const indexes = this.bpmnEngine.buildIndexes(process);
      const currentNode = indexes.nodes.get(workItem.nodeId);
      const align = this.bpmnEngine.getCamundaProperties(currentNode)?.align;

      return typeof align === 'string' && align.trim() ? align.trim() : undefined;
    } catch (error) {
      this.logger.warn(`Cannot resolve current node align for [NgayVanBan]: ${error?.message || error}`);
      return undefined;
    }
  }

  private async createTokenForSign(userId: string): Promise<string> {
    try {
      if (!userId) {
        throw new UnauthorizedException('Không xác định được user để tạo token');
      }

      const keySign = await this.repo.getSigningConfig();
      const secret = keySign?.secretSign || process.env.SECRET_SIGN;
      if (!secret) {
        console.error('SECRET_SIGN is not configured');
        throw new InternalServerErrorException('Server chưa cấu hình SECRET_SIGN');
      }
      const expiresIn = keySign?.expiresIn || (process.env.EXPIRES_IN_TOKEN_SIGN as string) || '300s';

      const data = await this.usersService.findById(userId);
      // Sign a minimal payload to avoid serializing the full request user object
      const payload = {
        userId: data.id,
        username: data.username,
        email: data.emailUser,
        phoneNumber: data.phoneNumberUser || null,
        iss: process.env.REDIRECT_URI_FE,
        sub: 'service:document-service',
        aud: ['signing-service']
      };
      return jwt.sign(payload, secret, { expiresIn } as any);
    } catch (error) {
      throw error;
    }
  }
  @Post('upload')
  @ApiOperation({ summary: 'Tải lên một file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadFileDto })
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req) {
    const originalName = file?.originalname || 'unknown';
    const fileSizeMB = file?.size ? (file.size / (1024 * 1024)).toFixed(2) : '0';
    console.log(`\n=== [UPLOAD START] File: ${originalName} (${fileSizeMB} MB) ===`);
    console.time('==> [TOTAL FLOW TIME]');

    if (!file) throw new BadRequestException('File is required');

    if (file.originalname.length > 255) {
      throw new BadRequestException('Tên file không được vượt quá 255 ký tự');
    }

    // Lấy userId từ request
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException(
        'Thông tin người dùng không tồn tại trong request.',
      );
    }

    const dto: UploadFileDto = req.body;

    // Lớp bảo mật 1: Kiểm tra phần mở rộng và nội dung thực (Magic Bytes)
    // console.time('  [STEP 1] validateFileSecurity (CPU/Magic Bytes)');
    // await validateFileSecurity(file);
    // console.timeEnd('  [STEP 1] validateFileSecurity (CPU/Magic Bytes)');

    // // Lớp bảo mật 2: Chặn mã độc (Blocking) và Làm sạch nội dung (Sanitization)
    // console.time('  [STEP 2] sanitizeFileContent (CPU/Parsing)');
    // await sanitizeFileContent(file);
    // console.timeEnd('  [STEP 2] sanitizeFileContent (CPU/Parsing)');

    // Gọi service thực hiện lưu trữ và cập nhật DB
    console.time('  [STEP 3] fileService.uploadFile (Total Service Time)');
    const result = await this.fileService.uploadFile(dto, file, userId);
    console.timeEnd('  [STEP 3] fileService.uploadFile (Total Service Time)');

    console.timeEnd('==> [TOTAL FLOW TIME]');
    console.log('=== [UPLOAD END] ===\n');
    return result;
  }

  // Route để đánh dấu tài liệu quan trọng
  @Patch(':fileId/importance')
  async updateFileImportance(
    @Param('fileId') fileId: string,    // Lấy fileId từ URL
    @Body('isImportant') isImportant: boolean,   // Lấy 'isImportant' từ body request
  ) {
    // Kiểm tra dữ liệu đầu vào
    if (typeof isImportant !== 'boolean') {
      throw new BadRequestException('isImportant should be a boolean value');
    }

    try {
      // Gọi service để cập nhật trạng thái quan trọng của tài liệu
      const isInpotant = await this.fileService.updateFileImportance(Number(fileId), isImportant);

      // Trả về phản hồi thành công
      return isInpotant;
    } catch (error) {
      console.error('Error updating file importance:', error);
      throw new InternalServerErrorException('An error occurred while updating the file importance');
    }
  }

  // Route để đánh dấu tài liệu thu hồi
  @Patch(':fileId/recall')
  async updateFileRecall(
    @Param('fileId') fileId: string,    // Lấy fileId từ URL
    @Body('isRecall') isRecall: boolean,   // Lấy 'isRecall' từ body request
  ) {
    // Kiểm tra dữ liệu đầu vào
    if (typeof isRecall !== 'boolean') {
      throw new BadRequestException('isRecall should be a boolean value');
    }

    try {
      // Gọi service để cập nhật trạng thái thu hồi của tài liệu
      const result = await this.fileService.updateFileRecall(Number(fileId), isRecall);

      // Trả về phản hồi thành công
      return result;
    } catch (error) {
      console.error('Error updating file recall status:', error);
      throw new InternalServerErrorException('An error occurred while updating the file recall status');
    }
  }

  @Patch(':id/location')
  @ApiOperation({ summary: 'Cập nhật vị trí file (object_type, object_id, parent_id)' })
  @ApiParam({ name: 'id', description: 'ID của file' })
  async updateFileLocation(
    @Param('id') id: string,
    @Body() dto: UpdateFileLocationDto,
  ) {
    const fileId = await this.resolveLegacyFileId(id);
    return this.fileService.updateFileLocation(fileId, dto);
  }

  @Put('updateordownload')
  @ApiOperation({ summary: 'Tải lên một file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadFileDto })
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async updateordownload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    if (!file) throw new BadRequestException('File is required');

    if (file.originalname.length > 255) {
      throw new BadRequestException('Tên file không được vượt quá 255 ký tự');
    }

    // Giả định req.user.sub chứa ID người dùng từ JWT Guard
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException(
        'Thông tin người dùng không tồn tại trong request.',
      );
    }

    const dto: UploadFileDto = req.body;

    // Bảo mật file: Kiểm tra phần mở rộng, magic bytes và làm sạch nội dung
    // await validateFileSecurity(file);
    // await sanitizeFileContent(file);

    return this.fileService.uploadFile(dto, file, userId);
  }

  @Get('updateordownload')
  @ApiOperation({ summary: 'Tải một file về máy' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 123 },
      },
      required: ['id'],
    },
  })
  async updateordownload1(@Body() body: { id: number }, @Res() res: Response) {
    const { id } = body;

    const { fullPath, filename } = await this.fileService.downloadFile(id);
    return res.download(fullPath, filename);
  }
  @Get('latest-by-object')
  @UseGuards(DocumentPermissionGuard)//object_id(in/out document id,draft doc id,other)
  async getLatestByObject(
    @Query('object_type') type: string,
    @Query('object_id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Req() req,
  ) {
    const userId = req.user?.userId;
    // Giới hạn max limit để bảo vệ DoS (CWE-400)
    const maxLimit = parseInt(process.env.MAX_PAGE_LIMIT || '100', 10);
    const safeLimit = Math.min(Math.max(limit, 1), maxLimit);
    return this.fileService.getLatestFilesByObject(type, id, { page, limit: safeLimit }, userId);
  }

  @Patch('attachments-cert-copy')
  async setAttachmentsCertCopy(
    @Body()
    body: {
      documentId?: string;
      fileId?: number | string | null;
      isCertifiedCopy?: boolean | string | number | null;
      object_id?: string;
      file_id?: number | string | null;
    },
  ) {
    const documentId = body?.documentId ?? body?.object_id;
    if (!documentId) {
      throw new BadRequestException('documentId is required');
    }

    const rawFileId = body.fileId ?? body.file_id;

    const rawIsCertifiedCopy = body.isCertifiedCopy;
    const hasIsCertifiedCopy = rawIsCertifiedCopy !== undefined;
    const isCertifiedCopy =
      rawIsCertifiedCopy === true ||
      rawIsCertifiedCopy === 'true' ||
      rawIsCertifiedCopy === 1 ||
      rawIsCertifiedCopy === '1';

    // Nếu FE gửi isCertifiedCopy=false => clear sao y
    // Nếu FE gửi isCertifiedCopy=true => set sao y theo fileId
    if (hasIsCertifiedCopy) {
      if (!isCertifiedCopy) {
        return this.fileService.setAttachmentsCertifiedCopy(documentId, null);
      }

      const fileId = rawFileId === undefined || rawFileId === null || rawFileId === '' ? null : Number(rawFileId);
      if (!fileId) {
        throw new BadRequestException('fileId is required when isCertifiedCopy=true');
      }
      return this.fileService.setAttachmentsCertifiedCopy(documentId, fileId);
    }

    // Backward compatible: không có isCertifiedCopy thì dùng behavior cũ
    const fileId = rawFileId === undefined || rawFileId === null || rawFileId === '' ? null : Number(rawFileId);
    return this.fileService.setAttachmentsCertifiedCopy(documentId, fileId);
  }
  @Get('old-by-object')
  async getOldByObject(
    @Query('object_type') type: string,
    @Query('object_id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 1000000,
  ) {
    return this.fileService.getOldFilesByObject(type, id, { page, limit });
  }

  @Post('folder')
  @ApiOperation({ summary: 'Tạo một thư mục mới' })
  @ApiBody({ type: CreateFolderDto })
  async createFolder(@Body() dto: any, @Req() req) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException(
        'Thông tin người dùng không tồn tại trong request.',
      );
    }
    return this.fileService.createFolder(dto, userId);
  }

  @Get(':id/info')
  @ApiOperation({ summary: 'Lấy thông tin metadata của file theo ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID của file' })
  async getFileInfo(@Param('id') id: string, @Req() req: any) {
    const userId = req?.authorizedUser || req?.user?.userId || req?.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Không xác định được người dùng');
    }
    const fileId = await this.resolveLegacyFileId(id);
    return this.fileService.getFileInfo(fileId, String(userId));
  }

  @Get('by-object') // Lấy danh sách file theo đối tượng
  @ApiOperation({ summary: 'Lấy danh sách file/thư mục theo đối tượng' })
  @ApiQuery({
    name: 'object_type',
    required: false,
    description: 'Loại đối tượng để lọc',
  })
  @ApiQuery({
    name: 'object_id',
    required: false,
    description: 'ID của đối tượng để lọc',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Số trang',
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Số lượng bản ghi mỗi trang',
    type: Number,
    example: 10,
  })
  async listByObject(
    @Query('object_type') type: string,
    @Query('object_id') id: string, // object_id là chuỗi
    @Query('is_signed_file') is_signed_file: number, // object_id là chuỗi
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 1000000,
    @Query('file_name') fileName: string,
    @Req() req,
  ) {
    return this.fileService.getFilesByObject(
      type,
      id,
      { page, limit },
      is_signed_file,
      req.user?.userId,
      fileName,
    );
  }


  @Get('view/:id')
  @AllowCookieAuth()
  @ApiOperation({ summary: 'Xem trước một file (inline)' })
  @ApiParam({
    name: 'id',
    description: 'ID của file trong bảng `files`',
    type: 'number',
  })
  // @Head('view/:id')
  // @AllowCookieAuth()
  // @ApiOperation({ summary: 'Xem trước một file (inline)' })
  // @ApiParam({
  //   name: 'id',
  //   description: 'ID của file trong bảng `files`',
  //   type: 'number',
  // })
  @UseGuards(FilesViewPermissionGuard)
  async fileview(@Param('id') id: string, @Res() res: Response, @Req() req: any) {
    const numericId = await this.resolveLegacyFileId(id);
    // const isRecall = await this.fileService.checkIsRecall(numericId);
    // if (isRecall) {
    //   throw new ForbiddenException('Tài liệu đã được đánh dấu thu hồi, không thể tải xuống');
    // }

    const rangeHeader = req.headers.range;

    const fileInfo = await this.fileService.getFileForView(numericId, {
      streamOnly: true
    });
    const { fullPath, filename, mimetype, fileSize, stream: fullStream } = fileInfo;

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', mimetype);
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );

    if (rangeHeader && fileSize > 0) {
      const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
      const start = match ? parseInt(match[1], 10) : 0;
      const end = match && match[2]
        ? parseInt(match[2], 10)
        : Math.min(start + 1024 * 1024 - 1, fileSize - 1); // chunk 1MB

      // Nếu có request range, huỷ stream full ban đầu để tránh leak connection
      if (fullStream && typeof fullStream.destroy === 'function') {
        fullStream.destroy();
      }

      if (start >= fileSize) {
        res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
        return;
      }

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', end - start + 1);

      if (fullPath) {
        // Filesystem partial
        fs.createReadStream(fullPath, { start, end }).pipe(res);
      } else {
        // MinIO partial: Cần gọi lại service với range để lấy stream từng phần
        const partialInfo = await this.fileService.getFileForView(numericId, { range: { start, end } });
        if (partialInfo.stream) {
          partialInfo.stream.pipe(res);
        } else {
          res.status(500).send('Không thể tạo stream từ storage');
        }
      }
    } else {
      // Trả về toàn bộ file
      res.setHeader('Content-Length', fileSize);
      if (fullPath) {
        fs.createReadStream(fullPath).pipe(res);
      } else if (fullStream) {
        fullStream.pipe(res);
      } else {
        res.status(404).send('Nội dung file không tồn tại');
      }
    }
  }
  // =================================================================
  // 1. GET: Tải file (Download)
  // =================================================================

  @Get('download/:id/:userId/:object_type/:object_id/:edit_file_id/:filename')
  async fileForWord(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Param('object_type') object_type: string,
    @Param('object_id') object_id: string,
    @Param('edit_file_id') edit_file_id: string,
    @Res() res: Response,
  ) {
    // Nếu cần, có thể truyền các param vào service, ví dụ log hoặc kiểm tra quyền
    const fileId = await this.resolveLegacyFileId(id);
    const { fileBuffer, fullPath, filename, mimetype, stream: fullStream } =
      await this.fileService.getFileForView(fileId, {
        object_type,
        object_id,
        edit_file_id,
        userId,
        streamOnly: true
      });

    if (!fileBuffer && !fullPath && !fullStream) {
      throw new BadRequestException(
        'Không thể tìm thấy nội dung file để tải xuống.',
      );
    }
    res.setHeader('Content-Type', mimetype);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );

    if (fullStream) {
      fullStream.pipe(res);
    } else if (fileBuffer) {
      res.send(fileBuffer);
    } else if (fullPath) {
      res.download(fullPath, filename); // chắc chắn string
    } else {
      throw new BadRequestException(
        'Không thể tìm thấy nội dung file để tải xuống.',
      );
    }
  }


  @Head('download/:id/:userId/:object_type/:object_id/:edit_file_id/:filename')
  async fileForWordHead(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Param('object_type') object_type: string,
    @Param('object_id') object_id: string,
    @Param('edit_file_id') edit_file_id: string,
    @Res() res: Response,
  ) {
    const fileId = await this.resolveLegacyFileId(id);
    const { fullPath, filename, mimetype } =
      await this.fileService.getFileForView(fileId, {
        object_type,
        object_id,
        edit_file_id,
        userId,
      });

    if (!fullPath) {
      return res.status(404).send('File not found');
    }

    const stat = fs.statSync(fullPath);

    res.setHeader('Content-Type', mimetype);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );

    res.end();
  }


  @Put('download/:id/:userId/:object_type/:object_id/:edit_file_id/:filename')
  @ApiOperation({ summary: 'Chỉnh sửa lên một file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadFileDto })
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadupdate(
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
    @Param('userId') userId: string,
    @Param('object_type') object_type: string,
    @Param('object_id') object_id: string,
    @Param('edit_file_id') edit_file_id: string,
  ) {
    if (!file) throw new BadRequestException('File is required');

    if (file.originalname.length > 255) {
      throw new BadRequestException('Tên file không được vượt quá 255 ký tự');
    }

    // Lấy DTO từ body
    const dto: UploadFileDto = req.body;

    // Gán các param vào dto
    dto.object_type = object_type;
    dto.object_id = object_id;
    dto.edit_file_id = Number(edit_file_id);

    // Gọi service với đúng chữ ký hiện tại
    // Bảo mật file: Kiểm tra phần mở rộng, magic bytes và làm sạch nội dung
    // await validateFileSecurity(file);
    // await sanitizeFileContent(file);

    const result = await this.fileService.uploadFile(dto, file, userId);

    // Gửi sự kiện WebSocket khi thành công
    await this.notificationService.broadcastSuccessStatus(
      'fileUpdateSuccess', // Tên sự kiện tùy chỉnh
      { message: 'File updated successfully', fileInfo: result },
    );

    return result;
  }

  @Get('download/:id')
  @UseGuards(FilesViewPermissionGuard)
  @ApiOperation({ summary: 'Tải một file về máy' })
  @ApiParam({
    name: 'id',
    description: 'ID của file trong bảng `files`',
    type: 'number',
  })
  async download(@Param('id') id: string, @Res() res: Response) {
    const fileId = await this.resolveLegacyFileId(id);
    // const isRecall = await this.fileService.checkIsRecall(fileId);
    // if (isRecall) {
    //   throw new ForbiddenException('Tài liệu đã được đánh dấu thu hồi, không thể tải xuống');
    // }
    // Tái sử dụng logic của getFileForView vì nó đã hỗ trợ cả MinIO và Filesystem
    const { fileBuffer, fullPath, filename, mimetype, stream: fullStream } =
      await this.fileService.getFileForView(fileId, {
        streamOnly: true
      });

    res.setHeader('Content-Type', mimetype);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );

    if (fullStream) {
      fullStream.pipe(res);
    } else if (fileBuffer) {
      // Trường hợp MinIO: Gửi buffer về client
      res.send(fileBuffer);
    } else if (fullPath) {
      // Trường hợp Filesystem: Dùng res.download() để stream file
      res.download(fullPath, filename);
    } else {
      throw new BadRequestException(
        'Không thể tìm thấy nội dung file để tải xuống.',
      );
    }
  }
  @Public()
  @Get('download-tool/:id')
  @ApiOperation({ summary: 'Tải một file về máy' })
  @ApiParam({
    name: 'id',
    description: 'ID của file trong bảng `files`',
    type: 'number',
  })
  async downloadTool(@Param('id') id: string, @Res() res: Response) {
    const fileId = await this.resolveLegacyFileId(id);
    // const isRecall = await this.fileService.checkIsRecall(fileId);
    // if (isRecall) {
    //   throw new ForbiddenException('Tài liệu đã được đánh dấu thu hồi, không thể tải xuống');
    // }
    // Tái sử dụng logic của getFileForView vì nó đã hỗ trợ cả MinIO và Filesystem
    const { fileBuffer, fullPath, filename, mimetype, stream: fullStream } =
      await this.fileService.getFileForView(fileId, {
        streamOnly: true
      });

    res.setHeader('Content-Type', mimetype);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );

    if (fullStream) {
      fullStream.pipe(res);
    } else if (fileBuffer) {
      // Trường hợp MinIO: Gửi buffer về client
      res.send(fileBuffer);
    } else if (fullPath) {
      // Trường hợp Filesystem: Dùng res.download() để stream file
      res.download(fullPath, filename);
    } else {
      throw new BadRequestException(
        'Không thể tìm thấy nội dung file để tải xuống.',
      );
    }
  }


  @Get('download-new/:id')
  @UseGuards(FilesViewPermissionGuard)
  @ApiOperation({ summary: 'Tải file (API mới, tách khỏi API cũ)' })
  @ApiParam({
    name: 'id',
    description: 'ID của file trong bảng `files`',
    type: 'number',
  })
  async downloadNew(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
    @Query('downloadMode') downloadMode?: 'none' | 'nostamp' | 'watermark',
    @Query('stampX') stampX?: number,
    @Query('stampY') stampY?: number,
    @Query('stampScale') stampScale?: number,
  ) {
    const fileId = await this.resolveLegacyFileId(id);
    // const isRecall = await this.fileService.checkIsRecall(fileId);
    // if (isRecall) {
    //   throw new ForbiddenException('Tài liệu đã được đánh dấu thu hồi, không thể tải xuống');
    // }
    const prepared = await this.fileService.prepareDownloadNew(fileId, req, {
      downloadMode,
      stampX: stampX !== undefined ? Number(stampX) : undefined,
      stampY: stampY !== undefined ? Number(stampY) : undefined,
      stampScale: stampScale !== undefined ? Number(stampScale) : undefined,
    });

    res.setHeader('Content-Type', prepared.outputMimetype);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(prepared.outputFilename)}`,
    );

    if (prepared.outputBuffer) {
      return res.send(prepared.outputBuffer);
    }
    if (prepared.fallbackFullPath && prepared.canUseFallbackDownload) {
      const fallbackName = prepared.fallbackFilename || prepared.outputFilename || 'file';
      return res.download(prepared.fallbackFullPath, fallbackName);
    }

    throw new BadRequestException(
      'Không thể tìm thấy nội dung file để tải xuống.',
    );
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

  private async resolveLegacyFileId(idOrUuid: string | number): Promise<number> {
    return this.fileService.resolveFileIdOrThrow(idOrUuid);
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
        this.logger.error(`[download-new] convert response is not PDF. fileId=${fileId}, contentType=${contentType}, head="${preview}"`);
        throw new BadRequestException('Dịch vụ chuyển đổi không trả về PDF hợp lệ');
      }
      return buffer;
    } catch (err: any) {
      this.logger.error(`[convertFileToPdfByProxy] Failed fileId=${fileId}: ${err?.message || err}`);
      if (err.response) {
        this.logger.error(`[convertFileToPdfByProxy] Error response status: ${err.response.status}`);
      }
      throw new BadRequestException(`Không thể chuyển đổi file sang PDF để chèn watermark: ${err?.message || 'unknown'}`);
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
        this.logger.error(`[download-new] file-to-pdf response is not PDF. contentType=${contentType}, head="${preview}"`);
        throw new BadRequestException('Dịch vụ chuyển đổi file-to-pdf không trả về PDF hợp lệ');
      }
      return buffer;
    } catch (err: any) {
      const responseData = err?.response?.data;
      const detail = Buffer.isBuffer(responseData)
        ? responseData.subarray(0, 160).toString('utf8')
        : (typeof responseData === 'string' ? responseData.slice(0, 160) : err?.message || 'unknown');
      this.logger.error(`[convertBufferToPdfByProxy] Failed. filename=${filename}: ${detail}`);
      throw new BadRequestException(`Không thể chuyển đổi file sang PDF để chèn watermark: ${err?.message || 'unknown'}`);
    }
  }

  private isIncomingObjectType(objectType?: string | null): boolean {
    if (!objectType) return false;
    const value = objectType.toLowerCase();
    return value.includes('incoming') || value.includes('incomming');
  }

  private async isVanThuUser(userId: string): Promise<boolean> {
    const rows = await this.userRepository.manager.query(
      `
      SELECT TOP 1 g.code
      FROM user_group_users ugu
      JOIN group_users g ON g.id = ugu.group_user_id
      WHERE ugu.user_id = @0 AND g.status = 1 AND g.code = 'vanthutct'
      `,
      [userId],
    );
    return !!rows?.length;
  }

  private formatPrintTime(date: Date): string {
    const two = (n: number) => String(n).padStart(2, '0');
    return `${two(date.getDate())}/${two(date.getMonth() + 1)}/${date.getFullYear()} ${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`;
  }

  private async addIncomingWatermarkToPdf(
    pdfBuffer: Buffer,
    context: { signerUserId: string | null; signedAt: string | null },
    options: { stampX?: number; stampY?: number; stampScale?: number; printerUserId?: string | null } = {},
  ): Promise<Buffer> {
    if (!this.isPdfBuffer(pdfBuffer)) {
      const preview = pdfBuffer?.subarray?.(0, 120)?.toString('utf8') || '';
      // this.logger.error(`[addIncomingWatermarkToPdf] Invalid PDF buffer. head="${preview}"`);
      throw new BadRequestException('Dữ liệu không phải PDF hợp lệ để chèn watermark');
    }
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    pdfDoc.registerFontkit(fontkit);
    const toAscii = (value: string) =>
      (value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\u0111/g, 'd')
        .replace(/\u0110/g, 'D');

    let userName = '';
    let position = '';
    if (context?.signerUserId) {
      const user = await this.userRepository.findOne({
        where: { id: context.signerUserId as any },
        select: ['id', 'name', 'username', 'position', 'emailUser'],
      });
      userName = user?.name || user?.username || context.signerUserId;
      position = user?.position || '';
    }

    let font: any;
    let useAsciiOnly = false;
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
    // console.log('[addIncomingWatermarkToPdf] cwd=', process.cwd());
    // console.log('[addIncomingWatermarkToPdf] fontCandidates=', fontCandidates);
    for (const fontPath of fontCandidates) {
      const exists = fs.existsSync(fontPath);
      // console.log('[addIncomingWatermarkToPdf] fontPath', fontPath, 'exists=', exists);
      if (!exists) continue;
      try {
        const fontBytes = await fsp.readFile(fontPath);
        font = await pdfDoc.embedFont(fontBytes);
        // console.log('[addIncomingWatermarkToPdf] using font', fontPath);
        break;
      } catch (err) {
        // console.error('[addIncomingWatermarkToPdf] embedFont failed', fontPath, err?.message || err);
      }
    }
    if (!font) {
      // console.warn('[addIncomingWatermarkToPdf] fallback to StandardFonts.Helvetica (WinAnsi)');
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      useAsciiOnly = true;
    }

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
    let logoImage: any = null;
    for (const logoPath of logoCandidates) {
      const exists = fs.existsSync(logoPath);
      // console.log('[addIncomingWatermarkToPdf] logoPath', logoPath, 'exists=', exists);
      if (!exists) continue;
      try {
        const logoBytes = await fsp.readFile(logoPath);
        logoImage = await pdfDoc.embedPng(logoBytes);
        // console.log('[addIncomingWatermarkToPdf] using logo', logoPath);
        break;
      } catch (err) {
        console.error(`[addIncomingWatermarkToPdf] embedPng failed at ${logoPath}: ${err?.message || err}`);
      }
    }

    // console.log('[addIncomingWatermarkToPdf] useAsciiOnly=', useAsciiOnly, 'signerUserId=', context?.signerUserId);
    const signedAt = context?.signedAt || '';
    let printUserName = '';
    let printPosition = '';
    let printEmail = '';
    if (options?.printerUserId) {
      const printUser = await this.userRepository.findOne({
        where: { id: options.printerUserId as any },
        select: ['id', 'name', 'username', 'position', 'emailUser'],
      });
      printUserName = printUser?.name || printUser?.username || '';
      printPosition = printUser?.position || '';
      printEmail = printUser?.emailUser || '';
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
      : `Ng\u01b0\u1eddi in: ${valuePrintUserName}${valuePrintPosition ? ` - ${valuePrintPosition}` : ''}${valuePrintEmail ? ` - ${valuePrintEmail}` : ''}`;
    const line2 = useAsciiOnly ? `Ngay in: ${printAt}` : `Ng\u00e0y in: ${printAt}`;

    for (const page of pdfDoc.getPages()) {
      const { width, height } = page.getSize();

      if (logoImage) {
        const scale = Number(options.stampScale) || 1;
        const logoW = 42 * scale;
        const logoH = 42 * scale;
        const topY = height - (Number(options.stampY) || 40);
        const groupX = (options.stampX !== undefined) ? Number(options.stampX) : Math.max(20, width - 270 * scale);

        page.drawImage(logoImage, {
          x: groupX,
          y: topY - 14 * scale,
          width: logoW,
          height: logoH,
          opacity: 0.95,
        });

        const textX = groupX + 50 * scale;

        page.drawText(useAsciiOnly ? 'TONG CONG TY TAN CANG SAI GON' : 'T\u1ed4NG C\u00d4NG TY T\u00c2N C\u1ea2NG S\u00c0I G\u00d2N', {
          x: textX, y: topY + 20 * scale, size: 8.5 * scale, font, color: rgb(0.06, 0.24, 0.58),
        });
        page.drawText(useAsciiOnly ? '722 Dien Bien Phu, P. Thanh My Tay, TP. HCM' : '722 \u0110i\u1ec7n Bi\u00ean Ph\u1ee7, P. Th\u1ea1nh M\u1ef9 T\u00e2y, TP. HCM', {
          x: textX, y: topY + 8 * scale, size: 6.5 * scale, font, color: rgb(0.18, 0.18, 0.18),
        });
        page.drawText(useAsciiOnly ? 'Dien thoai: (+84) 283 8990694; Fax: (+84) 283 8993950' : '\u0110i\u1ec7n tho\u1ea1i: (+84) 283 8990694; Fax: (+84) 283 8993950', {
          x: textX, y: topY - 2 * scale, size: 6.5 * scale, font, color: rgb(0.18, 0.18, 0.18),
        });
        page.drawText(useAsciiOnly ? `Nguoi ky: ${valueUserName}${valuePosition ? ` - ${valuePosition}` : ''}` : `Ng\u01b0\u1eddi k\u00fd: ${valueUserName}${valuePosition ? ` - ${valuePosition}` : ''}`, {
          x: textX, y: topY - 12 * scale, size: 6.5 * scale, font, color: rgb(0.18, 0.18, 0.18),
        });
        page.drawText(useAsciiOnly ? `Thoi gian ky: ${valueSignedAt}` : `Th\u1eddi gian k\u00fd: ${valueSignedAt}`, {
          x: textX, y: topY - 22 * scale, size: 6.5 * scale, font, color: rgb(0.18, 0.18, 0.18),
        });
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
    const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
    if (!isPdf) {
      const hex = buffer.subarray(0, 10).toString('hex');
      const head = buffer.subarray(0, 80).toString('utf8').replace(/[\r\n]/g, ' ');
      this.logger.warn(`[isPdfBuffer] Not a PDF buffer. Hex(10)=${hex} Head(80)="${head}"`);
    }
    return isPdf;
  }
  @Get('download-folder/:id')
  async downloadFolder(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const fileId = await this.resolveLegacyFileId(id);
    // 1. Kiem tra file hay folder
    const result = await this.fileService.getFileMeta(fileId);

    // 2. Nếu là FILE → tải như download/:id
    if (result.is_directory === 0) {
      const { fileBuffer, fullPath, filename, mimetype } =
        await this.fileService.getFileForView(fileId);

      res.setHeader('Content-Type', mimetype);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      );

      if (fileBuffer) {
        return res.send(fileBuffer);
      }
      if (fullPath) {
        return res.download(fullPath, filename);
      }

      throw new BadRequestException('Không thể tải file');
    } else {
      const resultZip = await this.fileService.downloadFolderAsZip(fileId);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${resultZip.filename}"`,
      );
      res.setHeader('Content-Type', 'application/zip');
      resultZip.stream.pipe(res);
    }


  }

  @Post('download-multi')
  async downloadMulti(
    @Body() body: any,
    @Res() res: Response,
  ) {
    const { stream, filename } =
      await this.fileService.downloadMultiAsZip(body.ids, body?.objectType || null);

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.setHeader('Content-Type', 'application/zip');

    stream.pipe(res);
  }


  @Put(':id/sign-status')
  @UseGuards(FilesViewPermissionGuard)
  @ApiOperation({ summary: 'Cập nhật trạng thái ký số cho file' })
  @ApiParam({
    name: 'id',
    description: 'ID của file trong bảng `files`',
    type: 'number',
  })
  async updateSignStatus(
    @Param('id') id: string,
    @Body() body: { is_signed_file?: number; isSignedFile?: number },
    @Req() req: any,
  ) {
    const userId = req?.authorizedUser || req?.user?.userId || req?.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Không xác định được người dùng');
    }
    const fileId = await this.resolveLegacyFileId(id);
    const signedStatus = body.is_signed_file ?? body.isSignedFile ?? 0;
    return this.fileService.updateSignStatus(fileId, signedStatus, String(userId));
  }

  @Delete('')
  @ApiOperation({ summary: 'Xóa nhiều file hoặc thư mục' })
  removeMany(@Body() deleteFilesDto: DeleteFilesDto, @Req() req: any) {
    const userId = req.authorizedUser || req.user?.userId;
    const numericIds = (deleteFilesDto.ids || [])
      .map((id) => Number(id))
      .filter((id) => !Number.isNaN(id));
    return this.fileService.removeMany(numericIds, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa mềm một file hoặc thư mục' })
  @ApiParam({
    name: 'id',
    description: 'ID của file/thư mục trong bảng `files`',
    type: 'number',
  })
  async delete(@Param('id') id: string, @Req() req: any) {
    const userId = req.authorizedUser || req.user?.userId;
    const fileId = await this.resolveLegacyFileId(id);
    return this.fileService.deleteFile(fileId, userId);
  }


  @Get('raw/:id')
  @ApiOperation({ summary: 'Lấy file RAW (phục vụ convert, viewer, API)' })
  async getRaw(@Param('id') id: string, @Res() res: Response, @Req() req: any, @Query('backup') backup?: any) {
    const fileId = await this.resolveLegacyFileId(id);
    const payload = await this.fileService.buildRawFileResponse(fileId, { backup: backup });
    const encodedFilename = encodeURIComponent(payload.filename);

    res.setHeader('Content-Type', payload.mimetype);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="file"; filename*=UTF-8''${encodedFilename}`,
    );

    if (payload.body.kind === 'buffer') {
      return res.send(payload.body.buffer);
    }

    // Nếu là stream (thường là filesystem trong code này)
    // Cần kiểm tra xem có hỗ trợ range trực tiếp từ payload không, 
    // nhưng ở đây buildRawFileResponse đã trả về stream/buffer.
    // Nếu buildRawFileResponse dựa trên filesystem, ta có thể lấy path để hỗ trợ range.
    // Do cấu trúc hiện tại của buildRawFileResponse có thể phức tạp, tôi sẽ tập trung vào fileview trước.
    // Nếu getRaw cũng cần tua, ta cần refactor buildRawFileResponse để trả về path nếu là file local.

    return payload.body.stream.pipe(res);
  }

  @Post('convert-docx-to-pdf')
  @ApiOperation({ summary: 'Convert file DOCX sang PDF' })
  async convertDocxToPdf(@Body('id') id: string | number, @Req() req) {
    if (!id) throw new BadRequestException('Thiếu id');

    const userId = req.user?.userId;
    if (!userId) throw new BadRequestException('Không xác định được user');

    const authHeader = req.headers.authorization || req.headers.Authorization;
    const rawQueryToken = req.query.accessToken || req.query.access_token;
    const queryTokenFromReq = Array.isArray(rawQueryToken) ? rawQueryToken[0] : rawQueryToken;
    const accessToken = (typeof authHeader === 'string' && authHeader.startsWith('Bearer '))
      ? authHeader.slice(7).trim()
      : (typeof queryTokenFromReq === 'string' ? queryTokenFromReq : undefined);

    const result = await this.fileService.convertDocxToPdf(id, userId, accessToken);

    return { status: 1, ...result };
  }

  @Post('insert-texts-to-pdf-file')
  @ApiOperation({ summary: 'Chèn text vào PDF' })
  async insertTextsToPdfFile(@Body() dto: InsertTextDto, @Req() req) {
    if (!dto.auto) {
      dto.auto = [];
    }
    const userId = req.user?.userId;
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const rawQueryToken = req.query.accessToken || req.query.access_token;
    const queryTokenFromReq = Array.isArray(rawQueryToken) ? rawQueryToken[0] : rawQueryToken;
    const accessToken = (typeof authHeader === 'string' && authHeader.startsWith('Bearer '))
      ? authHeader.slice(7).trim()
      : (typeof queryTokenFromReq === 'string' ? queryTokenFromReq : undefined);
    return this.fileService.insertTextsToPdfFile(dto, userId, accessToken);
  }

  @Post('insert-user-info-to-pdf')
  @ApiOperation({ summary: 'Chèn thông tin user vào PDF (chức danh, họ tên)' })
  async insertUserInfoToPdfFile(@Body() dto: InsertTextDto, @Req() req) {
    const userId = req.user?.userId;
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const rawQueryToken = req.query.accessToken || req.query.access_token;
    const queryTokenFromReq = Array.isArray(rawQueryToken) ? rawQueryToken[0] : rawQueryToken;
    const accessToken = (typeof authHeader === 'string' && authHeader.startsWith('Bearer '))
      ? authHeader.slice(7).trim()
      : (typeof queryTokenFromReq === 'string' ? queryTokenFromReq : undefined);
    return this.fileService.insertUserInfoToPdfFile(dto.id, dto.auto, dto.assignment || userId, accessToken);
  }
  @Post('preview-text-to-pdf-file')
  @ApiOperation({ summary: 'Chèn text vào PDF' })
  async previewTextToPdfFile(@Body() dto: InsertTextDto) {
    return this.fileService.previewTextToPdfFile(dto);
  }

  @Post('updateordownload2')
  @ApiOperation({ summary: 'Tải file từ NextCloud và upload lại' })
  @ApiConsumes('application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file_name: { type: 'string', example: 'namtest2.docx' },
        folder_name: { type: 'string', example: '123456' },
        object_type: { type: 'string', example: 'contract1' },
        object_id: { type: 'string', example: '123456' },
        edit_file_id: { type: 'number', example: 999 },
      },
      required: ['file_name', 'folder_name', 'object_type', 'object_id'],
    },
  })
  async updateordownload2(@Body() body: any, @Req() req) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException(
        'Thông tin người dùng không tồn tại trong request.',
      );
    }
    return this.fileService.updateOrDownload2(body, userId);
  }
  @Post('upload-to-nextcloud')
  @ApiOperation({ summary: 'Upload file lên NextCloud server' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File cần upload',
        },
        object_id: {
          type: 'string',
          example: '819',
          description: 'ID của đối tượng',
        },
      },
      required: ['file', 'object_id'],
    },
  })
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadToNextcloud(
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    if (!file) throw new BadRequestException('File is required');

    if (file.originalname.length > 255) {
      throw new BadRequestException('Tên file không được vượt quá 255 ký tự');
    }
    // Lấy object_id từ req.body thay vì @Body decorator
    const object_id = req.body?.object_id;
    if (!object_id) throw new BadRequestException('Thiếu object_id');
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException(
        'Thông tin người dùng không tồn tại trong request.',
      );
    }

    // Bảo mật file: Kiểm tra phần mở rộng, magic bytes và làm sạch nội dung
    // await validateFileSecurity(file);
    // await sanitizeFileContent(file);

    // TODO: Implement NextCloud upload logic
    const dto = { object_id };
    return this.fileService.uploadToNextcloud(dto, file);
  }

  /* ==================== ONLYOFFICE_DEPRECATED ====================
   * Commented out for migration to Collabora Online (WOPI)
   * Keep for rollback if needed
   * Uncomment these methods if you need to rollback to OnlyOffice
   */

  private readonly documentServerUrl = process.env.URL_OFFICE;
  private readonly jwtSecret = process.env.TOKEN_OFFICE || '';

  @Get('config/:fileId')
  @UseGuards(FilesViewPermissionGuard)
  async getEditorConfig(
    @Req() req: Request,
    @Param('fileId') fileId: string,
    @Query('fileName') fileName?: string,
    @Query('object_type') object_type?: string,
    @Query('object_id') object_id?: string,
  ) {
    // 1. XỬ LÝ TÊN FILE AN TOÀN
    let finalFileName = fileName;

    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing/invalid Authorization header');
    }

    const accessToken = authHeader.slice('Bearer '.length).trim();
    // console.log('Access Token:', accessToken);

    let decoded: any;
    try {
      decoded = await verifyKeycloakToken(accessToken);
    } catch (e) {
      throw new UnauthorizedException('Invalid login token');
    }
    // console.log(decoded, 'decoded');

    // ✅ 3) MAP USER THẬT
    const user = {
      id: String(decoded.sub || decoded.user || 'unknown'),
      name:
        decoded.fullName || decoded.name || decoded.preferred_username || decoded.username || 'Người dùng',
      group: decoded.role || decoded.group || 'USER',
    };

    // Bước A: Decode URL
    try {
      if (finalFileName) {
        finalFileName = decodeURIComponent(finalFileName);
      }
    } catch (e) {
      console.error('Lỗi decode fileName:', e);
    }

    // Bước B: Kiểm tra hợp lệ
    const isValidName =
      finalFileName &&
      finalFileName !== 'undefined' &&
      finalFileName !== 'null' &&
      finalFileName.trim() !== '';

    // Bước C: Gán tên (FIX LỖI TS Ở ĐÂY)
    // Dùng (finalFileName as string) để báo cho TS biết đây chắc chắn là string
    // console.log(isValidName, 'isValidName');
    // console.log(finalFileName, 'finalFileName');

    const originalName = isValidName
      ? (finalFileName as string)
      : `File_${fileId}.docx`;

    // console.log('Original Name Final:', originalName);

    // 2. XỬ LÝ EXTENSION
    // originalName giờ chắc chắn là string, không còn lỗi undefined
    let ext = this.getExtension(originalName);

    if (ext && ext.startsWith('.')) {
      ext = ext.slice(1);
    }
    ext = ext ? ext.toLowerCase() : '';

    const documentType = this.mapExtToDocType(ext);

    if (!documentType) {
      throw new BadRequestException(
        `Định dạng .${ext} chưa được hỗ trợ mở bằng ONLYOFFICE`,
      );
    }

    const { currentVersion, updatedTimestamp } = await this.fileService.getFileHistory(
      Number(fileId),
    );

    // 3. CẤU HÌNH FILE
    const file = {
      id: fileId,
      title: originalName,
      fileType: ext,
      url: `${process.env.URL_NESTJS}/api/files/download/${fileId}`,
      key: `file-${fileId}-v${currentVersion}-${updatedTimestamp}`,
    };

    // const user = {
    //   id: 'user-1',
    //   name: 'Người dùng A',
    //   group: 'Group2',
    // };

    const callbackUrl = `${process.env.URL_NESTJS}/api/files/callback/${fileId}?filename=${encodeURIComponent(originalName)}&object_id=${object_id}&object_type=${object_type}`;

    const config: any = {
      documentType,
      document: {
        fileType: file.fileType,
        key: file.key,
        title: file.title,
        url: file.url,
        permissions: {
          edit: true,
          review: true,
          comment: true,
          fillForms: true,
          download: true,
          print: true,
          copy: true,
          chat: true,
        },
      },
      editorConfig: {
        mode: 'edit',
        callbackUrl,
        user,
        customization: {
          autosave: true,
          forcesave: true,
        },
      },
      height: '100%',
      width: '100%',
    };

    const token = jwt.sign(config, this.jwtSecret);
    config.token = token;

    return {
      documentServerUrl: this.documentServerUrl,
      config,
    };
  }

  /**
   * Get Collabora Online configuration
   * This endpoint generates WOPI token and returns config for frontend
   * Now fetches discovery to get correct Collabora URL for file type
   *  to allow cross-origin calls from Collabora iframe
   */

  @ApiTags('WOPI')
  @Get('collabora/config/:fileId')
  @UseGuards(FilesEditFileDocPermissionGuard)
  @DisallowQueryAuth()
  @ApiOperation({ summary: 'Lấy cấu hình tích hợp Document Online' })
  @ApiParam({ name: 'fileId', description: 'ID của tệp' })
  @ApiQuery({ name: 'mode', enum: ['edit', 'view'], required: false, description: 'Chế độ mở (chỉnh sửa hoặc xem)' })
  @ApiQuery({ name: 'fileName', required: false, description: 'Tên tệp hiển thị' })
  @ApiResponse({ status: 200, description: 'Cấu hình Document được tạo thành công' })
  async getCollaboraConfig(
    @Param('fileId') fileId: string,
    @Query('mode') mode: 'edit' | 'view' = 'edit',
    @Query('fileName') fileName?: string,
    @Req() req?: any,
  ) {
    const userId = String(req?.user?.userId || req?.user?.id || req?.user?.sub || 'unknown');
    if (!req?.user?.userId && !req?.user?.id && !req?.user?.sub) {
      throw new UnauthorizedException('Thiếu phiên đăng nhập hợp lệ');
    }

    const canEdit = mode === 'edit';
    this.logger.log(
      `[CollaboraConfig] start fileId=${fileId} userId=${userId} mode=${mode} fileName=${fileName || '<empty>'} authUser=${JSON.stringify({ userId: req?.user?.userId, id: req?.user?.id, sub: req?.user?.sub })}`,
    );

    // Get file info
    const fileData = await this.fileService.getFileForView(Number(fileId));
    if (!fileData) {
      throw new NotFoundException('File not found');
    }

    // Determine file extension
    const ext = path.extname(fileData.filename || fileName || '').toLowerCase().replace('.', '');

    // Check if file type is supported by Collabora
    const editableFormats = ['docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp', 'doc', 'xls', 'ppt'];
    const action = canEdit && editableFormats.includes(ext) ? 'edit' : 'view';

    // Fetch Collabora discovery to get correct URL
    const collaboraBaseUrl = process.env.COLLABORA_URL || 'https://vpstc-document.lifetex.vn';
    let collaboraActionUrl = `${collaboraBaseUrl}/loleaflet/dist/loleaflet.html`; // fallback

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const axios = require('axios');
      const discoveryResponse = await axios.get(`${collaboraBaseUrl}/hosting/discovery`);
      const discoveryXml = discoveryResponse.data;

      // Parse XML to find action URL for this file type
      const regex = new RegExp(`<action[^>]*ext="${ext}"[^>]*name="${action}"[^>]*urlsrc="([^"]+)"`, 'i');
      const match = discoveryXml.match(regex);

      if (match && match[1]) {
        collaboraActionUrl = match[1];
        // Discovery URLs often end with ? or already contain params
        // If it already has ?, we don't need to add another one in FE
      } else {
        console.warn(`No discovery URL found for ${ext} ${action}, using fallback`);
        if (!collaboraActionUrl.includes('?')) {
          collaboraActionUrl += '?';
        }
      }
    } catch (error) {
      console.error('Failed to fetch Collabora discovery:', error.message);
      if (!collaboraActionUrl.includes('?')) {
        collaboraActionUrl += '?';
      }
    }

    const wopiToken = this.wopiTokenService.generateToken(fileId, userId, action === 'edit');

    // Build WOPI URL
    const wopiSrc = `${process.env.URL_NESTJS}/api/wopi/files/${fileId}`;

    this.logger.log(
      `[CollaboraConfig] resolved fileId=${fileId} userId=${userId} action=${action} ext=${ext} collaboraBaseUrl=${collaboraBaseUrl} wopiSrc=${wopiSrc} token=${maskToken(wopiToken)}`,
    );

    return {
      collaboraUrl: collaboraBaseUrl,
      collaboraActionUrl, // URL from discovery
      wopiSrc: wopiSrc,
      accessToken: wopiToken,
      action,
      fileName: fileData.filename || fileName || `File_${fileId}.${ext}`,
      fileExtension: ext,
    };
  }

  // helper lấy đuôi file
  private getExtension(fileName: string): string {
    const idx = fileName.lastIndexOf('.');
    if (idx === -1) return '';
    return fileName.substring(idx + 1).toLowerCase();
  }

  // helper map đuôi -> loại editor
  private mapExtToDocType(
    ext: string,
  ): 'word' | 'cell' | 'slide' | 'pdf' | null {
    const wordExts = ['doc', 'docx', 'odt', 'rtf', 'txt'];
    const cellExts = ['xls', 'xlsx', 'csv', 'ods'];
    const slideExts = ['ppt', 'pptx', 'odp'];

    const pdfExts = ['pdf'];

    if (wordExts.includes(ext)) return 'word';
    if (cellExts.includes(ext)) return 'cell';
    if (slideExts.includes(ext)) return 'slide';
    if (pdfExts.includes(ext)) return 'pdf';
    return null;
  }


  @Post('callback/:fileId')
  @HttpCode(200) // luôn trả 200 cho OnlyOffice
  async onlyOfficeCallback(
    @Param('fileId') fileId: string,
    @Body() body: any,
    @Query('object_id') object_id: string,
    @Query('object_type') object_type: string,
    @Query('filename') queryFileName: string, // <--- 1. THÊM DÒNG NÀY
  ) {
    const status = body.status;

    // Trả OK cho DocumentServer ngay, không chờ lưu xong
    if (status === 6) {
      const fileUrl = body.url;
      const fileType = body.filetype || 'docx';
      let fileName = queryFileName;
      if (!fileName) {
        fileName = body.filename || `File_${fileId}.${fileType}`;
      }
      // Decode lại tên file nếu nó bị encode URL (phòng trường hợp queryFileName vẫn còn dạng %20...)
      try {
        fileName = decodeURIComponent(fileName);
      } catch (e) { }

      if (fileUrl) {
        (async () => {
          try {
            // 1. Download file từ DocumentServer
            const resp = await axios.get<ArrayBuffer>(fileUrl, {
              responseType: 'arraybuffer',
            });
            const buffer = Buffer.from(resp.data);

            // 2. Ghi ra file tạm như Multer diskStorage làm
            const tmpDir = path.join(process.cwd(), 'tmp-onlyoffice');
            if (!fs.existsSync(tmpDir)) {
              await fsp.mkdir(tmpDir, { recursive: true });
            }

            const tmpFilename = `${fileId}-${Date.now()}.${fileType}`;
            const tmpPath = path.join(tmpDir, tmpFilename);
            await fsp.writeFile(tmpPath, buffer);

            // 3. Tạo pseudo Multer file với path đầy đủ
            const pseudoFile: Express.Multer.File = {
              fieldname: 'file',
              originalname: fileName,
              encoding: '7bit',
              mimetype: this.mapExtToMime(fileType),
              size: buffer.length,
              destination: tmpDir,
              filename: tmpFilename,
              path: tmpPath, // 👈 quan trọng: uploadFile() đang dùng cái này
              buffer,
              stream: Readable.from(buffer),
            } as any;

            // 4. Tạo DTO như lúc upload bình thường
            const dto: UploadFileDto = {
              object_id: object_id || body.documentId || fileId, // tùy bạn muốn gắn vào object nào
              object_type: object_type || 'docProposal',
              folder_name: object_type || 'docProposal',
              edit_file_id: fileId,
              // ... nếu UploadFileDto còn field nào required thì điền thêm
            } as any;

            // 5. Lấy userId – tạm dùng user hệ thống, hoặc map từ body.actions[0].userid
            const userId = body.actions?.[0]?.userid || 'system-onlyoffice';

            // 6. Gọi lại service upload như API /upload
            await this.fileService.uploadFile(dto, pseudoFile, userId);

          } catch (err) {
            console.error('Error while saving file from OnlyOffice:', err);
          }
        })();
      }
    }

    // ONLYOFFICE chỉ cần nhận {error:0}
    return { error: 0 };
  }

  private mapExtToMime(ext: string): string {
    switch (ext.toLowerCase()) {
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'pptx':
        return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }


  // ===================== SIGN PDF =====================
  @Post('sign-pdf')
  @ApiOperation({ summary: 'Ký số PDF - gọi qua service trung gian' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async signPdf(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: {
      password: string;
      reason?: string;
      location?: string;
      signatureLevel?: string;
      fileId?: string;
      objectType?: string;
      objectId?: string;
    },
    @Req() req,
  ) {
    if (!file) throw new BadRequestException('File is required');
    if (!body.password) throw new BadRequestException('Password is required');

    // Lấy userId từ JWT token
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('Không xác định được người dùng');
    }

    // Query database để lấy username thực (MSSQL)
    const userDoc = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'username', 'emailUser', 'name'],
    });
    if (!userDoc) {
      throw new BadRequestException('Không tìm thấy thông tin người dùng');
    }
    const username =
      userDoc.username || userDoc.emailUser || userDoc.name || userId;

    // Bảo mật file: Kiểm tra phần mở rộng, magic bytes và làm sạch nội dung
    // await validateFileSecurity(file);
    // await sanitizeFileContent(file);

    try {
      // Đọc file đã upload
      const fileBuffer = await fsp.readFile(file.path);

      // Tạo FormData để gửi đến API ký số
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', fileBuffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
      formData.append('username', username);
      formData.append('password', body.password);
      formData.append('reason', body.reason || 'Digital Signature');
      formData.append('location', body.location || 'Vietnam');
      formData.append('signatureLevel', body.signatureLevel || 'B');

      // Log thông tin gửi đến API ký số
      const signApiUrl =
        process.env.SIGN_PDF_API_URL || 'http://192.168.0.67:6868/api/sign/pdf';

      // Gọi API ký số bên ngoài
      const signResponse = await axios.post(signApiUrl, formData, {
        headers: formData.getHeaders(),
        responseType: 'arraybuffer',
        timeout: 60000,
      });

      // Xóa file tạm
      await fsp.unlink(file.path).catch(() => { });

      // Nếu có fileId, upload file đã ký và cập nhật trạng thái
      if (body.fileId && body.objectType && body.objectId) {
        const signedFileName = file.originalname.replace(/\.[^/.]+$/, '.pdf');
        const signedBuffer = Buffer.from(signResponse.data);

        // Lưu file đã ký vào thư mục tạm
        const uploadBase = path.join(process.cwd(), 'upload');
        const tempSignedPath = path.join(
          uploadBase,
          `signed_${Date.now()}_${signedFileName}`,
        );
        await fsp.writeFile(tempSignedPath, signedBuffer);

        // Tạo pseudo file object
        const pseudoFile = {
          originalname: signedFileName,
          mimetype: 'application/pdf',
          size: signedBuffer.length,
          path: tempSignedPath,
          buffer: signedBuffer,
        } as Express.Multer.File;

        // Upload file đã ký, thay thế file gốc
        const dto: UploadFileDto = {
          object_id: body.objectId,
          object_type: body.objectType,
          edit_file_id: Number(body.fileId),
        } as any;

        await this.fileService.uploadFile(dto, pseudoFile, userId);

        // Cập nhật trạng thái ký số
        await this.fileService.updateSignStatus(Number(body.fileId), 1);

        // Xóa file tạm
        await fsp.unlink(tempSignedPath).catch(() => { });

        return {
          success: true,
          message: 'Ký số và lưu thành công',
          fileId: body.fileId,
        };
      }

      // Nếu không có fileId, trả về file đã ký
      return {
        success: true,
        signedFile: Buffer.from(signResponse.data).toString('base64'),
        fileName: file.originalname.replace(/\.[^/.]+$/, '_signed.pdf'),
      };
    } catch (error) {
      // Xóa file tạm nếu có lỗi
      await fsp.unlink(file.path).catch(() => { });

      // Log chi tiết lỗi từ server ký số
      if (error.response) {
        let errorBody = '';
        try {
          // Response có thể là arraybuffer, cần convert sang string
          if (error.response.data) {
            errorBody = Buffer.isBuffer(error.response.data)
              ? error.response.data.toString('utf-8')
              : typeof error.response.data === 'object'
                ? JSON.stringify(error.response.data)
                : String(error.response.data);
          }
        } catch {
          errorBody = 'Không thể parse response body';
        }

        console.error('signPdf signing service error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          responseBodySize: errorBody.length,
        });

        throw new BadRequestException(
          `Lỗi từ service ký số: ${error.response.status} - ${errorBody || error.response.statusText}`,
        );
      }

      console.error('🚨 ~ signPdf ~ Lỗi khác:', error.message);
      throw new BadRequestException(`Lỗi ký số: ${error.message}`);
    }
  }
  // files.controller.ts
  @Get(':fileId/history')
  @UseGuards(FilesViewPermissionGuard)
  async getHistory(@Param('fileId') fileId: string) {
    const { currentVersion, history } = await this.fileService.getFileHistory(
      Number(fileId),
    );

    // OnlyOffice mong chờ đúng 2 field: currentVersion + history
    const filteredHistory = history.filter((h) => h.version < currentVersion);

    return {
      currentVersion,
      history: filteredHistory,
    };
  }

  // files.controller.ts
  @Get(':fileId/history/:version')
  @UseGuards(FilesViewPermissionGuard)
  async getHistoryData(
    @Param('fileId') fileId: string,
    @Param('version') version: string,
  ) {
    const versionIndex = Number(version);

    const { rootId, currentVersionRow, previousVersionRow, currentIndex } =
      await this.fileService.getFileHistoryVersion(
        Number(fileId),
        versionIndex,
      );

    const baseUrl = process.env.URL_NESTJS;

    // 1) payload historyData theo format OnlyOffice
    const data: any = {
      key: `file-${rootId}-v${currentIndex}`,
      version: currentIndex,
      url: `${baseUrl}/api/files/download/${currentVersionRow.id}`,
    };

    if (previousVersionRow) {
      data.previous = {
        key: `file-${rootId}-v${currentIndex - 1}`,
        url: `${baseUrl}/api/files/download/${previousVersionRow.id}`,
      };
    }

    // 2) ✅ JWT cho historyData (QUAN TRỌNG)
    // Lưu ý: phải dùng đúng secret giống DocumentServer
    // ví dụ bạn đang dùng this.jwtSecret ở config/:fileId
    const secret = this.jwtSecret || process.env.ONLYOFFICE_JWT_SECRET;
    if (!secret) {
      // nếu secret undefined thì token sẽ "malformed"
      throw new Error('Missing ONLYOFFICE JWT secret');
    }

    data.token = jwt.sign(data, secret);

    // 3) ✅ Một số bản DS cần token cho previous object luôn
    if (data.previous) {
      data.previous.token = jwt.sign(data.previous, secret);
    }

    return data;
  }

  @Post('sign-batch')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  async signBatch(
    @Body() dto: SignFilesOtpDto,
    @Headers() headers: any,
    @Req() req,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
  ) {
    try {
      const tokenSigning = headers['token-signing'] as string | undefined;
      if (!tokenSigning && dto?.isOTP !== false) {
        throw new BadRequestException('Missing token-signing header');
      }

      const serviceId = headers['x-service-id'] as string;
      if (!userId) {
        throw new BadRequestException('Missing userId');
      }

      const authHeader = req.headers.authorization || req.headers.Authorization;
      const headerToken = (typeof authHeader === 'string' && authHeader.startsWith('Bearer '))
        ? authHeader.slice(7).trim()
        : undefined;

      const token = headerToken;

      if (dto.imageSign) {
        const userDoc = await this.userRepository.findOne({
          where: { id: userId },
          select: [
            'contentSignImage',
            'paraphSignImage',
            'contentSignTransparentImage',
            'paraphSignTransparentImage',
            'stampSignImage',
          ],
        });

        if (userDoc) {
          const validImageIds = [
            userDoc.contentSignImage,
            userDoc.paraphSignImage,
            userDoc.contentSignTransparentImage,
            userDoc.paraphSignTransparentImage,
            userDoc.stampSignImage,
          ].filter(Boolean);

          // Kiểm tra xem file gửi lên có phải là 1 trong các chữ ký của user không
          if (!validImageIds.map(String).includes(String(dto.imageSign))) {
            throw new BadRequestException('File chữ ký không hợp lệ hoặc bạn không có quyền sử dụng chữ ký này.');
          }


        } else {
          throw new BadRequestException('Không tìm thấy thông tin người dùng.');
        }
      }

      if (dto.docId && userId) {
        const doc = await this.repo.getOutgoingDocument(dto.docId);
        if (doc) {
          const isFinalSigner = await this.repo.isFinalOfficialSigner(dto.docId, userId);
          const isStampDoc = doc.isStamp === true || doc.isStamp === 1 || String(doc.isStamp) === 'true';

          const bpmnVersion = doc.bpmnVersion || (doc as any).bpmn_version || null;
          let hasBanHanh = false;
          let bpmnXML: string | null = null;
          if (bpmnVersion) {
            try {
              bpmnXML = await this.repo.getBpmnFile(bpmnVersion);
              if (bpmnXML && (bpmnXML.includes('BAN_HANH') || bpmnXML.includes('actionCode="BAN_HANH"'))) {
                hasBanHanh = true;
              }
            } catch (err) {
              console.error('Error fetching BPMN for date check:', err.message);
            }
          }

          // Nếu có đóng mộc: chỉ chèn khi văn thư thực hiện đóng mộc và không có bước BAN_HANH.
          // Nếu không đóng mộc: chỉ chèn khi người ký chính thức cuối cùng ký.
          const shouldAddDate = isStampDoc
            ? dto.type === 'stampDoc'
            : dto.type !== 'stampDoc' && isFinalSigner;

          if (dto.type === 'stampDoc' && hasBanHanh) {
            console.log(`[DateCheck] Quy trình có bước BAN_HANH, KHÔNG tự động chèn [Ngayvanban] tại bước đóng dấu. docId: ${dto.docId}`);
          }

          if (shouldAddDate) {
            let replacements: any[] = [];
            if (dto.textMetadata) {
              try {
                replacements = JSON.parse(dto.textMetadata);
                if (!Array.isArray(replacements)) {
                  replacements = [];
                }
              } catch {
                replacements = [];
              }
            }

            const currentNodeAlign = await this.getCurrentNodeAlign(dto.docId, dto.workItemId, bpmnXML);
            this.upsertNgayVanBanReplacement(replacements, currentNodeAlign, false);

            if (dto.type === 'stampDoc') {
              if (!replacements.some(r => r.keyWord === '[NgayVanBan]')) {
                replacements.push({ keyWord: '[NgayVanBan]', type: 'CURRENT_DATE', align: 'start', required: false, isOverride: true });
              }
            }

            dto.textMetadata = JSON.stringify(replacements);
          }
        }
      }

      if (dto.type === 'stampDoc') {
        let replacements: any[] = [];
        if (dto.textMetadata) {
          try {
            replacements = JSON.parse(dto.textMetadata);
          } catch {
            replacements = [];
          }
        }
        if (Array.isArray(replacements)) {
          replacements.forEach(r => {
            r.isOverride = true;
          });
          dto.textMetadata = JSON.stringify(replacements);
        }
      }

      const result = await this.fileService.signBatch({
        dto: dto,
        serviceId: serviceId,
        tokenSigning: tokenSigning,
        token: token,
        userId: userId,
        originalUser: originalUser,
      });

      // Ghi log thành công (không await để trả về response nhanh hơn)
      this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Ký lô file thành công, workItemId: ${dto.workItemId || 'N/A'}, fileIds: ${dto.ids?.join(', ') || 'N/A'}`,
        method: 'POST',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      }).catch(logErr => console.error('Lỗi ghi log thành công:', logErr?.message || logErr));

      return result;
    } catch (error) {
      // Ghi log lỗi (không await để ném lỗi nhanh hơn)
      this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Ký lô file thất bại. Lý do: ${error?.message || error}`,
        method: 'POST',
        status: 'FAILED',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      }).catch(logErr => console.error('Lỗi ghi log thất bại:', logErr?.message || logErr));

      console.error('❌ [sign-batch] Controller error:', error.message);
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException(`Batch signing failed: ${error.message}`);
    }
  }




  @Post('sign-otp')
  @ApiOperation({ summary: 'Ký file' })
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  async signOTP(
    @Body() dto: SignFileOtpDto,
    @Headers() headers: any,
    @Req() req,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
  ) {
    try {
      console.log('--- [signOTP] Controller Start ---', { userId, originalUser, docId: dto.docId });
      const tokenSigning = headers['token-signing'] as string | undefined;
      if (!tokenSigning && dto?.isOTP !== false && !dto?.signedFileBuffer) {
        throw new BadRequestException('Missing token-signing header');
      }

      const serviceId = headers['x-service-id'] as string;
      if (!userId) {
        throw new BadRequestException('Missing userId');
      }

      if (dto.imageSign) {
        const userDoc = await this.userRepository.findOne({
          where: { id: userId },
          select: [
            'contentSignImage',
            'paraphSignImage',
            'contentSignTransparentImage',
            'paraphSignTransparentImage',
            'stampSignImage',
          ],
        });

        if (userDoc) {
          const validImageIds = [
            userDoc.contentSignImage,
            userDoc.paraphSignImage,
            userDoc.contentSignTransparentImage,
            userDoc.paraphSignTransparentImage,
            userDoc.stampSignImage,
          ].filter(Boolean);

          // Kiểm tra xem file gửi lên có phải là 1 trong các chữ ký của user không
          if (!validImageIds.map(String).includes(String(dto.imageSign))) {
            throw new BadRequestException('File chữ ký không hợp lệ hoặc bạn không có quyền sử dụng chữ ký này.');
          }


        } else {
          throw new BadRequestException('Không tìm thấy thông tin người dùng.');
        }
      }

      const authHeader = req.headers.authorization || req.headers.Authorization;
      const headerToken = (typeof authHeader === 'string' && authHeader.startsWith('Bearer '))
        ? authHeader.slice(7).trim()
        : undefined;

      const rawQueryToken = req.query.accessToken || req.query.access_token;
      const queryToken = Array.isArray(rawQueryToken) ? rawQueryToken[0] : rawQueryToken;

      // 1. accessToken: Lấy giống hệt stampDoc (ưu tiên Header > Query) - dùng để tải file
      const accessToken = headerToken || (typeof queryToken === 'string' ? queryToken : undefined);

      const token = headerToken;

      if (dto.isIncommingDoc && dto.type === 'stampDoc') {
        let replacements: any[] = [];
        if (dto.textMetadata) {
          try {
            replacements = JSON.parse(dto.textMetadata);
            if (!Array.isArray(replacements)) {
              replacements = [];
            }
          } catch {
            replacements = [];
          }
        }
        if (!replacements.some(r => r.keyWord === '[NgayVanBan]')) {
          replacements.push({ keyWord: '[NgayVanBan]', type: 'CURRENT_DATE', align: 'start', required: false, isOverride: true });
        }
        dto.textMetadata = JSON.stringify(replacements);
      }

      if (dto.docId && userId) {
        // dto.keyword = '[Pheduyet]';
        const doc = await this.repo.getOutgoingDocument(dto.docId);
        if (doc) {
          const isFinalSigner = await this.repo.isFinalOfficialSigner(dto.docId, userId);
          const isStampDoc = doc.isStamp === true || doc.isStamp === 1 || String(doc.isStamp) === 'true';

          const bpmnVersion = doc.bpmnVersion || (doc as any).bpmn_version || null;
          let hasBanHanh = false;
          let bpmnXML: string | null = null;
          if (bpmnVersion) {
            try {
              bpmnXML = await this.repo.getBpmnFile(bpmnVersion);
              if (bpmnXML && (bpmnXML.includes('BAN_HANH') || bpmnXML.includes('actionCode="BAN_HANH"'))) {
                hasBanHanh = true;
              }
            } catch (err) {
              console.error('Error fetching BPMN for date check:', err.message);
            }
          }

          // Nếu có đóng mộc: chỉ chèn khi văn thư thực hiện đóng mộc và không có bước BAN_HANH.
          // Nếu không đóng mộc: chỉ chèn khi người ký chính thức cuối cùng ký.
          const shouldAddDate = isStampDoc
            ? dto.type === 'stampDoc'
            : dto.type !== 'stampDoc' && isFinalSigner;

          if (dto.type === 'stampDoc' && hasBanHanh) {
            console.log(`[DateCheck - USB] Quy trình có bước BAN_HANH, KHÔNG tự động chèn [Ngayvanban] tại bước đóng dấu. docId: ${dto.docId}`);
          }

          if (shouldAddDate) {
            let replacements: any[] = [];
            if (dto.textMetadata) {
              try {
                replacements = JSON.parse(dto.textMetadata);
                if (!Array.isArray(replacements)) {
                  replacements = [];
                }
              } catch {
                replacements = [];
              }
            }

            const currentNodeAlign = await this.getCurrentNodeAlign(dto.docId, dto.workItemId, bpmnXML);
            this.upsertNgayVanBanReplacement(replacements, currentNodeAlign, false);

            if (dto.type === 'stampDoc') {
              if (!replacements.some(r => r.keyWord === '[NgayVanBan]')) {
                replacements.push({ keyWord: '[NgayVanBan]', type: 'CURRENT_DATE', align: 'start', required: false, isOverride: true });
              }
            }

            dto.textMetadata = JSON.stringify(replacements);
          }
        }
      }

      if (dto.type === 'stampDoc') {
        let replacements: any[] = [];
        if (dto.textMetadata) {
          try {
            replacements = JSON.parse(dto.textMetadata);
          } catch {
            replacements = [];
          }
        }
        if (Array.isArray(replacements)) {
          replacements.forEach(r => {
            r.isOverride = true;
          });
          dto.textMetadata = JSON.stringify(replacements);
        }
      }

      console.log('--- [signOTP] Controller: Calling this.fileService.signOTP ---');
      const result = await this.fileService.signOTP({
        dto: dto,
        serviceId: serviceId,
        tokenSigning: tokenSigning,
        token: token,
        accessToken: accessToken,
        userId: userId,
        originalUser: originalUser,
      });

      console.log('--- [signOTP] Controller: this.fileService.signOTP returned successfully ---');
      // Ghi log thành công (không await để trả về response nhanh hơn)
      this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Ký file thành công, workItemId: ${dto.workItemId || 'N/A'}, fileId: ${dto.fileSign?.id || 'N/A'}`,
        method: 'POST',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      }).catch(logErr => console.error('Lỗi ghi log thành công:', logErr?.message || logErr));

      return result;
    } catch (error) {
      console.log('--- [signOTP] Controller: Catch Block ---', error.message);
      // Ghi log lỗi (không await để ném lỗi nhanh hơn)
      this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Ký file thất bại. Lý do: ${error?.message || error}`,
        method: 'POST',
        status: 'FAILED',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      }).catch(logErr => console.error('Lỗi ghi log thất bại:', logErr?.message || logErr));

      console.error('❌ [sign-otp] Controller error:', error.message);
      if (error instanceof UnauthorizedException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(`OTP signing failed: ${error.message}`);
    }
  }

  // ==================== EXAMPLE FILES CRUD ====================

  @Post('example-files')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @ApiOperation({ summary: 'Tạo file mẫu mới' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        example_key: { type: 'string', example: 'template_invoice' },
        example_type: { type: 'string', example: 'invoice' },
        description: { type: 'string', example: 'File mẫu hóa đơn' },
      },
      required: ['file', 'example_key'],
    },
  })
  @ApiResponse({ status: 201, description: 'File mẫu tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 409, description: 'Key đã tồn tại' })
  async createExampleFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateExampleFileDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return await this.fileService.createExampleFile(file, dto, userId);
  }

  @Get('example-files')
  @ApiOperation({ summary: 'Lấy danh sách file mẫu' })
  @ApiQuery({ name: 'type', required: false, description: 'Lọc theo loại file' })
  @ApiQuery({ name: 'page', required: false, type: Number, default: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 10 })
  @ApiResponse({ status: 200, type: GetExampleFilesResponseDto })
  async getExampleFiles(
    @Query('type') type?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return await this.fileService.getExampleFiles(type, page, limit);
  }

  @Get('example-files/:exampleKey/download')
  @Public()
  @ApiOperation({ summary: 'Download file mẫu theo key' })
  @ApiParam({ name: 'exampleKey', description: 'Khóa của file mẫu' })
  @ApiResponse({ status: 200, description: 'File được tải xuống' })
  @ApiResponse({ status: 404, description: 'File không tồn tại' })
  async downloadExampleFile(
    @Param('exampleKey') exampleKey: string,
    @Res() res: Response,
  ) {
    const file = await this.fileService.getExampleFileByKey(exampleKey);
    const fileId = Number(file.id);
    const { fileBuffer, fullPath, filename, mimetype } =
      await this.fileService.getFileForView(fileId);

    res.setHeader('Content-Type', mimetype || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );

    if (fileBuffer) {
      return res.send(fileBuffer);
    } else if (fullPath) {
      return res.download(fullPath, filename);
    }

    throw new BadRequestException(
      'Không thể tìm thấy nội dung file để tải xuống.',
    );
  }

  @Get('example-files/key/:exampleKey')
  @ApiOperation({ summary: 'Lấy thông tin file mẫu theo key' })
  @ApiParam({ name: 'exampleKey', description: 'Khóa của file mẫu' })
  @ApiResponse({ status: 200, description: 'Thông tin file mẫu' })
  @ApiResponse({ status: 404, description: 'File mẫu không tồn tại' })
  async getExampleFileByKey(@Param('exampleKey') exampleKey: string) {
    return await this.fileService.getExampleFileByKey(exampleKey);
  }

  @Get('example-files/:id')
  @ApiOperation({ summary: 'Lấy thông tin file mẫu theo ID' })
  @ApiParam({ name: 'id', description: 'ID của file mẫu' })
  @ApiResponse({ status: 200, description: 'Thông tin file mẫu' })
  @ApiResponse({ status: 404, description: 'File mẫu không tồn tại' })
  async getExampleFileById(@Param('id') id: string) {
    return await this.fileService.getExampleFileById(Number(id));
  }

  @Patch('example-files/:id')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @ApiOperation({ summary: 'Cập nhật file mẫu' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'ID của file mẫu' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'File mới (không bắt buộc)' },
        example_type: { type: 'string', example: 'invoice' },
        description: { type: 'string', example: 'File mẫu hóa đơn cập nhật' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'File mẫu cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'File mẫu không tồn tại' })
  async updateExampleFileById(
    @Param('id') id: string,
    @Body() dto: UpdateExampleFileDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    return await this.fileService.updateExampleFileById(Number(id), dto, file, userId);
  }

  @Delete('example-files/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Xóa file mẫu' })
  @ApiParam({ name: 'id', description: 'ID của file mẫu' })
  @ApiResponse({ status: 200, description: 'File mẫu xóa thành công' })
  @ApiResponse({ status: 404, description: 'File mẫu không tồn tại' })
  async deleteExampleFileById(@Param('id') id: string) {
    return await this.fileService.deleteExampleFileById(Number(id));
  }
}
