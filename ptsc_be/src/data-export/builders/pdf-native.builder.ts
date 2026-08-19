/**
 * ============================================================
 * FILE 5/10: builders/pdf-native.builder.ts
 *
 * Cách 1 — Build PDF TRỰC TIẾP bằng DocumentsPdfBuilder (pdfkit).
 * Không cần service convert bên ngoài.
 *
 * Khi nào dùng:
 *   - Khi muốn kiểm soát hoàn toàn layout PDF
 *   - Khi không có APP_CONVERT_URL
 *
 * Input/Output giống ExcelBuilder để dễ hoán đổi.
 * ============================================================
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { IColumnConfig, IExportFileResult } from '../interfaces/data-export.interface';
import { RowTransformHelper } from '../helpers/row-transform.helper';

// Import từ module documents (giữ nguyên để không phải rewrite pdfkit logic)
import { DocumentsPdfBuilder, PdfColumnDef } from 'src/documents/helpers/documents-pdf.builder';

@Injectable()
export class PdfNativeBuilder {
  private readonly logger = new Logger(PdfNativeBuilder.name);

  constructor(
    private readonly rowTransform: RowTransformHelper,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Build PDF trực tiếp từ data + columns (không qua Excel).
   *
   * @param data       Raw data rows
   * @param columns    Column definitions (bao gồm STT)
   * @param nameOfList Tên danh sách
   */
  async build(
    data: any[],
    columns: IColumnConfig[],
    nameOfList: string,
  ): Promise<IExportFileResult> {
    const start = Date.now();

    // 1. Transform rows (không cần widthAccumulators cho PDF)
    const compiled      = this.rowTransform.compileColumns(columns);
    const { rows }      = this.rowTransform.transformRows(data, compiled);

    // 2. Build PDF buffer qua DocumentsPdfBuilder
    const buffer   = await DocumentsPdfBuilder.build({
      nameOfList,
      columns: columns as PdfColumnDef[],
      rows,
    });


    return {
      buffer,
      filename:    `${nameOfList}.pdf`,
      contentType: 'application/pdf',
    };
  }
}