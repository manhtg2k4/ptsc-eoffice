/**
 * ============================================================
 * FILE 6/10: builders/pdf-convert.builder.ts
 *
 * Cách 2 — Build Excel trước, rồi gọi APP_CONVERT_URL để convert sang PDF.
 * Giữ nguyên layout Excel (margins, page setup) trước khi gửi đi.
 *
 * Khi nào dùng:
 *   - Khi cần layout giống hệt Excel khi in
 *   - Khi APP_CONVERT_URL sẵn có
 *
 * Input/Output giống PdfNativeBuilder để dễ hoán đổi qua service.
 * ============================================================
 */

import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as os from 'os';
import * as FormData from 'form-data';
import axios from 'axios';

import { IColumnConfig, IExportFileResult } from '../interfaces/data-export.interface';
import { ExcelBuilder } from './excel.builder';

@Injectable()
export class PdfConvertBuilder {
  private readonly logger = new Logger(PdfConvertBuilder.name);

  constructor(private readonly excelBuilder: ExcelBuilder) {}

  /**
   * Build PDF = build Excel → set print margins → gửi sang APP_CONVERT_URL → trả buffer PDF.
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

    // 1. Build Excel buffer
    const excel = await this.excelBuilder.build(data, columns, nameOfList);

    // 2. Set print margins cho từng sheet trước khi convert
    const processedBuffer = await this.applyPrintMargins(excel.buffer);

    // 3. Gửi sang convert service
    const pdfBuffer = await this.callConvertService(processedBuffer);


    return {
      buffer:      pdfBuffer,
      filename:    excel.filename.replace(/\.xlsx$/, '.pdf'),
      contentType: 'application/pdf',
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /** Load Excel buffer, set margins cho mỗi sheet, trả về buffer mới */
  private async applyPrintMargins(buffer: Buffer): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    workbook.worksheets.forEach(sheet => {
      sheet.pageSetup = {
        ...sheet.pageSetup,
        paperSize:          9,
        orientation:        'landscape',
        fitToPage:          true,
        fitToWidth:         1,
        fitToHeight:        0,
        horizontalCentered: true,
        margins: {
          left:   0.25,
          right:  0.25,
          top:    0.3,
          bottom: 0.3,
          header: 0.1,
          footer: 0.1,
        },
      };
    });

    return Buffer.from(await workbook.xlsx.writeBuffer() as any);
  }

  /**
   * Ghi buffer ra file tạm, gửi multipart/form-data sang APP_CONVERT_URL,
   * trả về PDF buffer. Dọn dẹp file tạm dù có lỗi hay không.
   */
  private async callConvertService(buffer: Buffer): Promise<Buffer> {
    const convertUrl = process.env.APP_CONVERT_URL;
    if (!convertUrl) {
      throw new InternalServerErrorException(
        'APP_CONVERT_URL chưa được cấu hình. Vui lòng set biến môi trường.',
      );
    }

    const tempPath = `${os.tmpdir()}/export_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.xlsx`;
    fs.writeFileSync(tempPath, buffer);

    const formData = new FormData();
    formData.append('file', fs.createReadStream(tempPath));

    try {
      const response = await axios.post(
        `${convertUrl}/file-to-pdf`,
        formData,
        {
          headers:       formData.getHeaders(),
          responseType:  'arraybuffer',
          maxBodyLength: Infinity,
          timeout:       45_000,
        },
      );

      const result = Buffer.from(response.data);
      return result;
    } catch (err: any) {
      this.logger.error('PdfConvertBuilder: convert failed', err.message);
      throw new InternalServerErrorException(
        `Không thể convert sang PDF. Lỗi: ${err.message}`,
      );
    } finally {
      try { fs.unlinkSync(tempPath); } catch { /* ignore cleanup error */ }
    }
  }
}