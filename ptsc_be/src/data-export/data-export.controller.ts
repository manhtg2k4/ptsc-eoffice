/**
 * ============================================================
 * FILE 9/10: data-export.controller.ts
 *
 * Hai endpoint:
 *  GET /data-export/list   → getFileExportList (processFn | viewConfigCode)
 *  GET /data-export/body   → exportBody (documentId + typeDocument)
 *
 * Controller chỉ:
 *  - Validate query params
 *  - Gọi service
 *  - Set response headers + stream buffer
 * ============================================================
 */

import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  BadRequestException,
  Logger,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';

import { DataExportService } from './data-export.service';
import { ExportListRequestDto, ExportBodyRequestDto } from './dtos/data-export.dto';
import { DataExportPermissionGuard } from './guards/data-export-permission.guard';
import {
  DataExportPermissionAction,
  RequireDataExportPermission,
} from './decorators/data-export-permission.decorator';

@ApiTags('Data Export')
@ApiBearerAuth()
@UseGuards(DataExportPermissionGuard)
@Controller('data-export')
export class DataExportController {
  private readonly logger = new Logger(DataExportController.name);

  constructor(private readonly service: DataExportService) {}

  // ─── GET /data-export/list ────────────────────────────────────────────────

  /**
   * Export danh sách ra file Excel hoặc PDF.
   *
   * Truyền processFn  → export theo cấu hình FeatureManagement / TableConfig
   * Truyền viewConfigCode → export theo ViewConfig (màn chi tiết)
   */
  @Get('list')
  @RequireDataExportPermission(DataExportPermissionAction.VIEW)
  @ApiOperation({ summary: 'Export danh sách ra Excel/PDF' })
  @ApiQuery({ name: 'processFn',     required: false, description: 'Process function code' })
  @ApiQuery({ name: 'viewConfigCode',required: false, description: 'View config code (cho export chi tiết)' })
  @ApiQuery({ name: 'exportType',    required: false, enum: ['excel', 'pdf'], description: 'Định dạng xuất' })
  @ApiQuery({ name: 'page',          required: false, description: 'Trang (mặc định 1)' })
  @ApiQuery({ name: 'limit',         required: false, description: 'Số bản ghi (mặc định 9999)' })
  @ApiQuery({ name: 'filter',        required: false, description: 'Filter JSON string' })
  async getFileExportList(
    @Query() query: Record<string, string>,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const userId = (req as any).user?.userId || (req as any).user?.id;

    if (!userId) {
      res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
      return;
    }

    if (!query.processFn && !query.viewConfigCode) {
      throw new BadRequestException('processFn hoặc viewConfigCode là bắt buộc');
    }

    const start = Date.now();

    const result = await this.service.getFileExportList(query, userId);

    // Tạo tên file fallback ASCII an toàn (không dấu, thay khoảng trắng bằng _)
    const asciiFilename = result.filename
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, m => (m === 'đ' ? 'd' : 'D'))
      .replace(/\s+/g, '_');

    const encodedFilename = encodeURIComponent(result.filename);

    res.set({
      'Content-Type':        result.contentType,
      'Content-Disposition': `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
      'Content-Length':      result.buffer.length,
    });


    res.status(HttpStatus.OK).end(result.buffer);
  }

  // ─── GET /data-export/body ────────────────────────────────────────────────

  /**
   * Lấy dữ liệu body của một văn bản để xuất (incoming / outgoing).
   * Trả về JSON — phía FE sẽ dùng dữ liệu này để render template rồi in.
   */
  @Get('body')
  @RequireDataExportPermission(DataExportPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy dữ liệu body văn bản để xuất' })
  @ApiQuery({ name: 'documentId',   required: true,  description: 'ID văn bản' })
  @ApiQuery({ name: 'typeDocument', required: true,  description: 'IncommingDocument | OutGoingDocument' })
  async exportBody(
    @Query() query: ExportBodyRequestDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const userId = (req as any).user?.userId || (req as any).user?.id;

    if (!userId) {
      res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
      return;
    }

    if (!query.documentId) throw new BadRequestException('documentId là bắt buộc');
    if (!query.typeDocument) throw new BadRequestException('typeDocument là bắt buộc');

    const result = await this.service.exportBody(query.documentId, userId, query.typeDocument);

    res.status(HttpStatus.OK).json(result);
  }
}