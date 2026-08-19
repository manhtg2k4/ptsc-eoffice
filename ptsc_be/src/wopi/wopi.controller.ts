import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  Res,
  Headers,
  HttpCode,
  Header,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { WopiService } from './wopi.service';
import { WopiTokenService } from './wopi-token.service';
import { Public } from '../oauth/decorator/public.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiHeader,
  ApiResponse,
} from '@nestjs/swagger';
import { maskToken } from './wopi-token.util';


@ApiTags('WOPI')
@Controller('wopi/files')
export class WopiController {
  private readonly logger = new Logger(WopiController.name);

  constructor(
    private readonly wopiService: WopiService,
    private readonly wopiTokenService: WopiTokenService,
  ) { }

  /**
   * CheckFileInfo - Get file metadata
   * GET /wopi/files/:id
   */
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin tệp (CheckFileInfo)' })
  @ApiParam({ name: 'id', description: 'ID của tệp' })
  @ApiQuery({ name: 'access_token', description: 'Token truy cập WOPI', required: true })
  @ApiResponse({ status: 200, description: 'Lấy thông tin tệp thành công' })
  async checkFileInfo(
    @Param('id') id: string,
    @Query('access_token') accessToken: string,
    @Headers('authorization') authHeader: string,
  ) {
    this.logger.log(
      `[CheckFileInfo] request fileId=${id} hasAccessToken=${Boolean(accessToken)} hasAuthorization=${Boolean(authHeader)}`,
    );

    // Validate file ID
    const fileIdNum = Number(id);
    if (!id || isNaN(fileIdNum) || fileIdNum <= 0) {
      throw new BadRequestException('Invalid file ID');
    }

    // Require WOPI access token
    if (!accessToken && !authHeader) {
      throw new UnauthorizedException('WOPI access token required');
    }

    // Extract and verify token (will throw if invalid)
    const token = this.wopiTokenService.extractToken(accessToken, authHeader);
    const payload = this.wopiTokenService.verifyToken(token);
    this.logger.log(
      `[CheckFileInfo] verified fileId=${id} token=${maskToken(token)} payloadFileId=${payload.fileId} userId=${payload.userId} canEdit=${payload.permissions?.canEdit}`,
    );

    // Verify file ID matches token
    if (String(payload.fileId) !== String(id)) {
      this.logger.error(
        `[CheckFileInfo] fileId mismatch requestId=${id} payloadFileId=${payload.fileId} token=${maskToken(token)}`,
      );
      throw new UnauthorizedException('File ID mismatch in token');
    }

    // Use info from token
    const userId = payload.userId;
    const canEdit = payload.permissions.canEdit;

    // Get file info
    const fileInfo = await this.wopiService.getFileInfo(fileIdNum, userId, canEdit);
    this.logger.log(
      `[CheckFileInfo] success fileId=${id} userId=${userId} baseFileName=${fileInfo?.BaseFileName || '<unknown>'} size=${fileInfo?.Size || 0}`,
    );

    return fileInfo;
  }

  /**
   * GetFile - Download file content
   * GET /wopi/files/:id/contents
   */
  @Public()
  @Get(':id/contents')
  @ApiOperation({ summary: 'Tải nội dung tệp (GetFile)' })
  @ApiParam({ name: 'id', description: 'ID của tệp' })
  @ApiQuery({ name: 'access_token', description: 'Token truy cập WOPI' })
  @ApiResponse({ status: 200, description: 'Nội dung tệp' })
  async getFile(
    @Param('id') id: string,
    @Query('access_token') accessToken: string,
    @Headers('authorization') authHeader: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    this.logger.log(
      `[GetFile] request fileId=${id} method=${req.method} hasAccessToken=${Boolean(accessToken)} hasAuthorization=${Boolean(authHeader)}`,
    );

    // Verify token
    const token = this.wopiTokenService.extractToken(accessToken, authHeader);
    const payload = this.wopiTokenService.verifyToken(token);
    this.logger.log(
      `[GetFile] verified fileId=${id} token=${maskToken(token)} payloadFileId=${payload.fileId} userId=${payload.userId}`,
    );
    
    if (String(payload.fileId) !== String(id)) {
      this.logger.error(
        `[GetFile] fileId mismatch requestId=${id} payloadFileId=${payload.fileId} token=${maskToken(token)}`,
      );
      throw new UnauthorizedException('File ID mismatch');
    }

    const { fileBuffer, fullPath, filename, mimetype, stream: fullStream } =
      await this.wopiService.getFileForView(Number(id));

    res.set({
      'Content-Type': mimetype || 'application/octet-stream',
      'Content-Disposition': `attachment`,
      'Cache-Control': 'no-store'
    });

    if (fullStream) {
       fullStream.pipe(res);
       return;
    }

    let buffer: Buffer | undefined = fileBuffer;
    if (!buffer && fullPath && fs.existsSync(fullPath)) {
      buffer = await fs.promises.readFile(fullPath);
    }

    if (!buffer) {
      this.logger.error(`[GetFile] content missing fileId=${id}`);
      return res.status(404).json({ message: 'File content not found' });
    }

    this.logger.log(
      `[GetFile] success fileId=${id} filename=${filename || '<unknown>'} mimetype=${mimetype || '<unknown>'} bytes=${buffer.length}`,
    );

    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);
  }

  /**
   * PutFile - Save file content
   * POST /wopi/files/:id/contents
   */
  @Public()
  @Post(':id/contents')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cập nhật nội dung tệp (PutFile)' })
  @ApiParam({ name: 'id', description: 'ID của tệp' })
  @ApiQuery({ name: 'access_token', description: 'Token truy cập WOPI' })
  @ApiHeader({
    name: 'x-wopi-override',
    description: 'Thao tác (phải là PUT)',
    example: 'PUT',
  })
  @ApiHeader({ name: 'x-wopi-lock', description: 'ID khóa (Lock ID)', required: false })
  @ApiResponse({ status: 200, description: 'Lưu tệp thành công' })
  async putFile(
    @Param('id') id: string,
    @Query('access_token') accessToken: string,
    @Headers('authorization') authHeader: string,
    @Headers('x-wopi-override') wopiOverride: string,
    @Headers('x-wopi-lock') wopiLock: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.logger.log(
      `[PutFile] request fileId=${id} override=${wopiOverride || '<empty>'} lock=${wopiLock || '<empty>'} hasAccessToken=${Boolean(accessToken)} hasAuthorization=${Boolean(authHeader)}`,
    );

    res.setHeader('ETag', '');
    res.removeHeader('ETag');

    // Validate X-WOPI-Override header
    if (wopiOverride && wopiOverride !== 'PUT') {
      return res.status(400).json({
        error: `Unsupported WOPI operation: ${wopiOverride}`,
      });
    }

    // Verify token
    const token = this.wopiTokenService.extractToken(accessToken, authHeader);
    const payload = this.wopiTokenService.verifyToken(token);
    this.logger.log(
      `[PutFile] verified fileId=${id} token=${maskToken(token)} payloadFileId=${payload.fileId} userId=${payload.userId} canEdit=${payload.permissions?.canEdit}`,
    );

    if (String(payload.fileId) !== String(id)) {
      this.logger.error(
        `[PutFile] fileId mismatch requestId=${id} payloadFileId=${payload.fileId} token=${maskToken(token)}`,
      );
      throw new UnauthorizedException('File ID mismatch');
    }
    
    if (!payload.permissions.canEdit) {
      this.logger.error(`[PutFile] no edit permission fileId=${id} userId=${payload.userId}`);
      throw new UnauthorizedException('No edit permission');
    }

    try {
      // Read file content from request body by streaming it directly to a temp file
      const tmpDir = path.join(process.cwd(), 'tmp-wopi');
      if (!fs.existsSync(tmpDir)) {
        await fs.promises.mkdir(tmpDir, { recursive: true });
      }
      const tmpFilename = `putfile-${id}-${Date.now()}.tmp`;
      const tmpPath = path.join(tmpDir, tmpFilename);
      
      const writeStream = fs.createWriteStream(tmpPath);
      let bytesWritten = 0;
      
      req.on('data', (chunk) => {
        bytesWritten += chunk.length;
      });

      await new Promise<void>((resolve, reject) => {
        req.pipe(writeStream);
        writeStream.on('finish', () => resolve());
        writeStream.on('error', (err) => reject(err));
        req.on('error', (err) => {
          writeStream.destroy();
          reject(err);
        });
      });

      if (bytesWritten === 0) {
        this.logger.error(`[PutFile] empty file stream fileId=${id}`);
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        return res.status(400).json({ error: 'Empty file content' });
      }

      this.logger.log(
        `[PutFile] saving fileId=${id} userId=${payload.userId} bytes=${bytesWritten}`,
      );

      // Save file
      try {
        await this.wopiService.saveFileContent(
          Number(id),
          payload.userId,
          tmpPath,
          bytesWritten
        );
      } finally {
        if (fs.existsSync(tmpPath)) {
          fs.promises.unlink(tmpPath).catch(() => {});
        }
      }

      // WOPI spec: Return 200 with minimal response or 204 No Content
      // Some Collabora versions prefer minimal JSON response

      // Return minimal response (WOPI standard - some fields optional)
      return res.status(200).json({
        LastModifiedTime: new Date().toISOString(),
      });

    } catch (error) {
      const err = error as any;
      this.logger.error(
        `[PutFile] error fileId=${id} message=${err?.message || 'unknown'}`,
        err?.stack,
      );
      return res.status(500).json({
        error: 'Failed to save file',
        message: err?.message,
      });
    }
  }

  /**
   * Lock/Unlock operations
   * POST /wopi/files/:id
   */
  @Public()
  @Post(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Các thao tác với tệp (Khóa/Mở khóa/Làm mới khóa)' })
  @ApiParam({ name: 'id', description: 'ID của tệp' })
  @ApiQuery({ name: 'access_token', description: 'Token truy cập WOPI' })
  @ApiHeader({ name: 'x-wopi-override', description: 'Thao tác WOPI (LOCK, UNLOCK, REFRESH_LOCK)' })
  @ApiResponse({ status: 200, description: 'Thao tác thành công' })
  async fileOperation(
    @Param('id') id: string,
    @Query('access_token') accessToken: string,
    @Headers('authorization') authHeader: string,
    @Headers('x-wopi-override') wopiOverride: string,
  ) {
    this.logger.log(
      `[FileOperation] request fileId=${id} override=${wopiOverride || '<empty>'} hasAccessToken=${Boolean(accessToken)} hasAuthorization=${Boolean(authHeader)}`,
    );

    // Extract and verify token
    const token = this.wopiTokenService.extractToken(accessToken, authHeader);
    const payload = this.wopiTokenService.verifyToken(token);
    this.logger.log(
      `[FileOperation] verified fileId=${id} token=${maskToken(token)} payloadFileId=${payload.fileId} userId=${payload.userId}`,
    );
    
    if (String(payload.fileId) !== String(id)) {
      this.logger.error(
        `[FileOperation] fileId mismatch requestId=${id} payloadFileId=${payload.fileId} token=${maskToken(token)}`,
      );
      throw new UnauthorizedException('File ID mismatch');
    }

    // Handle different operations based on X-WOPI-Override header
    switch (wopiOverride) {
      case 'LOCK':
        // TODO: Implement file locking
        return { message: 'Lock not yet implemented' };

      case 'UNLOCK':
        // TODO: Implement file unlocking
        return { message: 'Unlock not yet implemented' };

      case 'REFRESH_LOCK':
        // TODO: Implement lock refresh
        return { message: 'Refresh lock not yet implemented' };

      default:
        throw new Error(`Unsupported WOPI operation: ${wopiOverride}`);
    }
  }
}
