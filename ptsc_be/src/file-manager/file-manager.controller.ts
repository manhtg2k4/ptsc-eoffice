import {
  Controller,
  Get,
  Post,
  Param,
  Res,
  UploadedFile,
  UseInterceptors,
  HttpStatus,
  StreamableFile,
  UploadedFiles,
  Delete,
  HttpCode,
  BadRequestException,
  NotFoundException,
  Body,
  Logger,
  InternalServerErrorException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import { FileManagerService } from './file-manager.service';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { multerOptions, allowedMimeTypes } from './multer.config';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import * as FormData from 'form-data';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
// import { multerOptions } from './multer.config';
import * as path from 'path';
import { Public } from 'src/oauth/decorator/public.decorator';
import { validateFileSecurity, sanitizeFileContent } from 'src/utils/file-security.util';

import { JwtAuthGuard } from 'src/oauth/jwt.guard';

@ApiTags('Quản lý Tập tin')
@Controller('file')
@UseGuards(JwtAuthGuard)
export class FileManagerController {
  private readonly logger = new Logger(FileManagerController.name);
  constructor(
    private readonly fileManagerService: FileManagerService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) { }

  @ApiOperation({
    summary: 'Tải lên nhiều file',
    description: 'Tải lên nhiều file lên hệ thống, tối đa 20 file',
  })
  @ApiResponse({
    status: 201,
    description: 'Tải lên thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Không có file hoặc định dạng file không hỗ trợ',
  })
  @Post('upload-multiple')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor('files', 20, multerOptions)) // max 20 files
  async uploadMultipleFiles(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Không có file nào được tải lên!');
    }

    // The fileFilter in multer handles this, but we can double-check
    for (const file of files) {
      // Bảo mật file: Kiểm tra phần mở rộng, magic bytes và làm sạch nội dung
      await validateFileSecurity(file);
      await sanitizeFileContent(file);

      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `File ${file.originalname} có định dạng không hỗ trợ`,
        );
      }
    }

    const savedFiles = await Promise.all(
      files.map((file) =>
        this.fileManagerService.createFileRecord('TTHC', file),
      ),
    );

    return {
      success: true,
      message: 'Tải lên nhiều file thành công!',
      data: savedFiles,
    };
  }
  @ApiOperation({
    summary: 'Tải lên file',
    description: 'Tải lên một hoặc nhiều file lên hệ thống, tối đa 20 file',
  })
  @ApiResponse({
    status: 201,
    description: 'Tải lên thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Không có file hoặc định dạng file không hỗ trợ',
  })
  @Post('upload-files')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor('files', 20, multerOptions)) // có thể 1 hoặc nhiều file
  async uploadFiles(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Không có file nào được tải lên!');
    }

    // Kiểm tra MIME type hợp lệ
    for (const file of files) {
      // Bảo mật file: Kiểm tra phần mở rộng, magic bytes và làm sạch nội dung
      await validateFileSecurity(file);
      await sanitizeFileContent(file);

      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `File ${file.originalname} có định dạng không hỗ trợ.`,
        );
      }
    }

    // Lưu tất cả file vào DB
    const savedFiles = await Promise.all(
      files.map((file) =>
        this.fileManagerService.createFileRecord('TTHC', file),
      ),
    );

    return {
      success: true,
      message:
        files.length === 1
          ? 'Tải lên file thành công!'
          : `Tải lên ${files.length} file thành công!`,
      data: files.length === 1 ? savedFiles[0] : savedFiles,
    };
  }
  @ApiOperation({
    summary: 'Tải lên file',
    description: 'Tải lên một file lên hệ thống và có thể gửi tới hệ thống bên ngoài',
  })
  @ApiResponse({
    status: 201,
    description: 'Tải lên thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Không có file hoặc định dạng file không hỗ trợ',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi trong quá trình xử lý',
  })
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { codeUnit?: string; maHoSo?: string; profileid?: string },
  ) {
    if (!file) {
      throw new BadRequestException('Không có file nào được tải lên!');
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('định dạng file không được hỗ trợ!');
    }

    // Bảo mật file: Kiểm tra phần mở rộng, magic bytes và làm sạch nội dung
    await validateFileSecurity(file);
    await sanitizeFileContent(file);

    const fileData = await this.fileManagerService.createFileRecord(
      'TTHC',
      file,
      body.profileid,
    );

    let externalApiResponse: any = null;
    if (body.codeUnit && body.maHoSo) {
      try {
        const baseUrl = this.configService.get<string>(
          'BASE_UPLOAD_ARCHEVEMATICA',
        );
        if (!baseUrl) {
          throw new InternalServerErrorException(
            'URL để upload file ngoài chưa được cấu hình (BASE_UPLOAD_ARCHEVEMATICA).',
          );
        }
        const url = new URL(baseUrl);
        url.searchParams.append('codeUnit', body.codeUnit);
        url.searchParams.append('maHoSo', body.maHoSo);

        const formData = new FormData();
        // Khi multer dùng diskStorage, file.buffer sẽ không tồn tại.
        // Thay vào đó, ta tạo một stream đọc từ file.path.
        const fileStream = fs.createReadStream(file.path);
        formData.append('file', fileStream, {
          filename: file.originalname, // Gửi đi với tên file gốc
          contentType: file.mimetype, // Cung cấp kiểu MIME
          knownLength: file.size, // Quan trọng: Cung cấp kích thước file để Content-Length đúng
        });
        formData.append(
          'clientId',
          this.configService.get<string>('CLIENT_ID_UPLOAD'),
        );
        formData.append('codeUnit', body.codeUnit);
        formData.append('maHoSo', body.maHoSo);
        formData.append('profileid', body.profileid);
        formData.append(
          'clientSecret',
          this.configService.get<string>('CLIENT_SECRET_UPLOAD'),
        );

        const response = await firstValueFrom(
          this.httpService.post(url.toString(), formData, {
            headers: formData.getHeaders(),
          }),
        );
        externalApiResponse = response.data;
      } catch (error) {
        this.logger.error('Lỗi khi gọi API bên ngoài:', error.stack);
        // Decide if you want to throw an error or just log it and continue
      }
    }

    return {
      success: true,
      message: 'Tải file lên thành công!',
      data: fileData,
      externalApiResponse,
    };
  }
  @ApiOperation({
    summary: 'Lấy danh sách file',
    description: 'Lấy danh sách tất cả các file được tải lên hệ thống',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
  })
  @Get()
  async findAll() {
    const files = await this.fileManagerService.findAllFiles();
    return {
      success: true,
      total: files.length,
      data: files,
    };
  }

  @ApiOperation({
    summary: 'Lấy thông tin file',
    description: 'Lấy thông tin chi tiết của một file theo ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của file',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy file với ID được chỉ định',
  })
  @Get(':id')
  async findById(@Param('id') id: string) {
    const data = await this.fileManagerService.findById(id);
    if (!data) {
      throw new NotFoundException(`Không tìm thấy file với ID: ${id}`);
    }
    return {
      success: true,
      data: data,
    };
  }

  @ApiOperation({
    summary: 'Xóa file',
    description: 'Xóa một file khỏi hệ thống',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của file cần xóa',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa file thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy file để xóa',
  })
  @Delete('delete/:id')
  @HttpCode(HttpStatus.OK)
  async deleteFile(@Param('id') fileId: string) {
    const result = await this.fileManagerService.deleteFile(fileId);

    if (!result) {
      throw new NotFoundException('Không tìm thấy file để xóa.');
    }

    return {
      success: true,
      message: 'Xóa file thành công.',
    };
  }

  @ApiOperation({
    summary: 'Tải xuống file',
    description: 'Tải xuống một file từ hệ thống',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của file cần tải xuống',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Tải xuống thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy file',
  })
  @Get('download/:id')
  async downloadFile(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    // Không cần try-catch. Service sẽ tự throw HttpException (NotFound, InternalServer)
    // và NestJS Exception Filter sẽ tự động xử lý và trả về JSON error.
    const { stream, filename, mimetype } =
      await this.fileManagerService.downloadFile(id);

    res.set({
      // Mã hóa tên file để hỗ trợ ký tự đặc biệt và tiếng Việt
      // filename* tuân theo RFC 5987
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Type': mimetype,
      'Cache-Control': 'no-store, no-cache',
      'X-Content-Type-Options': 'nosniff',
    });

    return stream;
  }
  @ApiOperation({
    summary: 'Tải xuống file',
    description: 'Tải xuống một file từ hệ thống',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của file cần tải xuống',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Tải xuống thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy file',
  })
  @Get('download-for-tool/:id')
  async downloadFilefortool(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    // Không cần try-catch. Service sẽ tự throw HttpException (NotFound, InternalServer)
    // và NestJS Exception Filter sẽ tự động xử lý và trả về JSON error.
    const { stream, filename, mimetype } =
      await this.fileManagerService.downloadFile(id);

    res.set({
      // Mã hóa tên file để hỗ trợ ký tự đặc biệt và tiếng Việt
      // filename* tuân theo RFC 5987
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Type': mimetype,
      'Cache-Control': 'no-store, no-cache',
      'X-Content-Type-Options': 'nosniff',
    });

    return stream;
  }
  @ApiOperation({
    summary: 'Xem file',
    description: 'Xem file trực tiếp trên trình duyệt, không cần tải xuống',
  })
  @ApiParam({
    name: 'path',
    description: 'Đường dẫn file cần xem',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Xem file thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy file',
  })
  @Get('views/*path')
  async viewFile(
    @Param('path') filePathParam: string | string[],
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const filePath = Array.isArray(filePathParam)
      ? filePathParam.join('/')
      : filePathParam;
    const { stream, filename, mimetype } =
      await this.fileManagerService.downloadFileByPath(filePath);

    // Security: Force attachment for potentially dangerous file types to prevent XSS
    const riskyMimeTypes = [
      'image/svg+xml',
      'application/xml',
      'text/xml',
      'text/html',
      'application/xhtml+xml',
    ];
    const isRisky = riskyMimeTypes.includes(mimetype);
    const disposition = isRisky ? 'attachment' : 'inline';
    const cacheControl = isRisky ? 'no-store, no-cache' : 'public, max-age=31536000';

    res.set({
      'Content-Type': mimetype,
      'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff',
    });

    return stream;
  }

}
