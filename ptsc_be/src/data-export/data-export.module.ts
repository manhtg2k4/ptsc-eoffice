/**
 * ============================================================
 * FILE 10/10: data-export.module.ts
 *
 * Wires toàn bộ module:
 *   - Repository (DB access)
 *   - RowTransformHelper
 *   - ExcelBuilder
 *   - PdfNativeBuilder
 *   - PdfConvertBuilder
 *   - DataExportService (orchestrator)
 *   - DataExportController
 *
 * Để chuyển giữa 2 cách build PDF:
 *   - PdfNativeBuilder  → không cần provider nào thêm
 *   - PdfConvertBuilder → phụ thuộc ExcelBuilder + axios (đã có sẵn)
 *   Đổi trong DataExportService.buildOutput() — không cần sửa module.
 * ============================================================
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { TableConfigEntity } from 'src/table-config/table-config.entity';
import { ViewConfigEntity } from 'src/view-config/entities/view-config.entity';

import { DataExportRepository } from './data-export.repository';
import { RowTransformHelper } from './helpers/row-transform.helper';
import { ExcelBuilder } from './builders/excel.builder';
import { PdfNativeBuilder } from './builders/pdf-native.builder';
import { PdfConvertBuilder } from './builders/pdf-convert.builder';
import { WordBuilder } from './builders/word.builder';
import { DataExportService } from './data-export.service';
import { DataExportController } from './data-export.controller';
import { ExcelBuilderOption } from './builders/excel-option.builder';
import { DataExportPermissionService } from './data-export-permission.service';
import { DataExportPermissionGuard } from './guards/data-export-permission.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [FeatureManagementEntity, TableConfigEntity, ViewConfigEntity, ],
      'mssqlConnection',
    ),
  ],

  controllers: [DataExportController],

  providers: [
    // ── Infrastructure ─────────────────────────────────────────────────────
    DataExportRepository,

    // ── Helpers & Builders ─────────────────────────────────────────────────
    RowTransformHelper,
    ExcelBuilder,
    ExcelBuilderOption,
    PdfNativeBuilder,
    PdfConvertBuilder,
    WordBuilder,

    // ── Core service ───────────────────────────────────────────────────────
    DataExportService,
    DataExportPermissionService,
    DataExportPermissionGuard,
    {
      provide: 'RUNTIME_SERVICE',
      useFactory: () => {
        return {
          repo: {
            getAuthorIdIfAuthorized: async (userId: string) => null,
          },
        };
      },
    },
  ],

  exports: [DataExportService],
})
export class DataExportModule {}