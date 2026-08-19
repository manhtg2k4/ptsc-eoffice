/**
 * ============================================================
 * FILE 2/10: dtos/data-export.dto.ts
 * ============================================================
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum ExportType {
  EXCEL = 'excel',
  PDF   = 'pdf',
  WORD  = 'word',
}

// ─── Export list (processFn hoặc viewConfigCode) ──────────────────────────────

/**
 * Query params khi gọi GET /data-export/list
 *
 * Hai trường hợp:
 *  1. processFn   → lấy data từ danh sách động (FeatureManagement / TableConfig)
 *  2. viewConfigCode + recordId → lấy data từ một văn bản cụ thể
 */
export class ExportListRequestDto {
  @ApiPropertyOptional({ description: 'Process function code', example: 'dsVanBanDen' })
  @IsOptional()
  @IsString()
  processFn?: string;

  @ApiPropertyOptional({ description: 'View config code (cho export từ chi tiết)', example: 'INCOMMING' })
  @IsOptional()
  @IsString()
  viewConfigCode?: string;

  @ApiPropertyOptional({ description: 'Record ID (bắt buộc khi dùng viewConfigCode)' })
  @IsOptional()
  @IsString()
  recordId?: string;

  @ApiPropertyOptional({ description: 'Export type', enum: ExportType, default: ExportType.EXCEL })
  @IsOptional()
  @IsEnum(ExportType)
  exportType?: ExportType;

  @ApiPropertyOptional({ description: 'Page', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Limit (mặc định 9999 khi export)', default: 9999 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Sort field', example: '-createdAt' })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({ description: 'Filter JSON string' })
  @IsOptional()
  @IsString()
  filter?: string;

  @ApiPropertyOptional({ description: 'User filters (alias của filter)' })
  @IsOptional()
  @IsString()
  userFilters?: string;
}

// ─── Export body (xuất văn bản) ───────────────────────────────────────────────

/**
 * Query params khi gọi GET /data-export/body
 */
export class ExportBodyRequestDto {
  @ApiProperty({ description: 'Document ID' })
  @IsString()
  documentId: string;

  @ApiProperty({ description: 'Document type', example: 'IncommingDocument | OutGoingDocument' })
  @IsString()
  typeDocument: string;
}

// ─── List result wrapper ──────────────────────────────────────────────────────

export class ListResultDto<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}