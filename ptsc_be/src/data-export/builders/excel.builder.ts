/**
 * ============================================================
 * FILE 4/10: builders/excel.builder.ts
 *
 * Chịu trách nhiệm DUY NHẤT: nhận data + columns → trả về Buffer Excel.
 * Không biết gì về service, repository hay PDF.
 *
 * Input:
 *   - data[]          : raw data từ service
 *   - columns[]       : đã bao gồm STT column (key='stt')
 *   - nameOfList      : tên danh sách (dùng làm tiêu đề + tên file)
 *
 * Output: IExportFileResult { buffer, filename, contentType }
 * ============================================================
 */

import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

import { IColumnConfig, IExportFileResult, IWidthAccumulator } from '../interfaces/data-export.interface';
import { RowTransformHelper } from '../helpers/row-transform.helper';

@Injectable()
export class ExcelBuilder {
  private readonly logger = new Logger(ExcelBuilder.name);

  constructor(private readonly rowTransform: RowTransformHelper) { }

  /**
   * Build Excel buffer từ data + columns.
   *
   * @param data        Raw data rows
   * @param columns     Column definitions (bao gồm STT nếu muốn)
   * @param nameOfList  Tên danh sách — dùng làm tiêu đề & filename
   */
  async build(
    data: any[],
    columns: IColumnConfig[],
    nameOfList: string,
  ): Promise<IExportFileResult> {
    const start = Date.now();

    // 1. Pre-compile resolvers + transform rows (single pass)
    const compiled = this.rowTransform.compileColumns(columns);
    const { rows, widthAccumulators } = this.rowTransform.transformRows(data, compiled, columns);

    // 2. Build workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Danh sách');
    sheet.columns = columns.map(c => ({ key: c.key, width: c.width ?? 15 }));

    const columnIndex = sheet.columnCount || columns.length || 1;
    const lastCol = sheet.getColumn(columnIndex)?.letter ?? 'A';

    // 3. Title + date rows + header row
    this.applyTitleSection(sheet, nameOfList, lastCol, columns);

    // 4. Data rows
    sheet.addRows(rows);

    // 5. Styling (single-pass)
    const HEADER_ROW_INDEX = 3;
    this.applyAllStyles(sheet, HEADER_ROW_INDEX, widthAccumulators);
    this.applyPrintSetup(sheet, lastCol, HEADER_ROW_INDEX);

    // 6. Serialize
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());


    return {
      buffer,
      filename: `${nameOfList}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  // ─── Private styling methods ──────────────────────────────────────────────

  /**
   * Chèn 2 dòng trên cùng: tiêu đề (row 1) + ngày xuất (row 2).
   * Row 3 = header (được tạo từ sheet.columns.header).
   */
  private applyTitleSection(
    sheet: ExcelJS.Worksheet,
    nameOfList: string,
    lastCol: string,
    columns: IColumnConfig[],
  ): void {
    // Row 1: tiêu đề
    const titleText = nameOfList.toUpperCase().startsWith('DANH SÁCH')
      ? nameOfList.toUpperCase()
      : `DANH SÁCH ${nameOfList.toUpperCase()}`;
    sheet.insertRow(1, [titleText]);
    sheet.mergeCells(`A1:${lastCol}1`);
    const title = sheet.getRow(1);
    title.font = { bold: true, size: 14, name: 'Times New Roman' };
    title.alignment = { horizontal: 'center', vertical: 'middle' };
    title.height = 34;

    // Row 2: ngày xuất
    sheet.insertRow(2, [`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`]);
    sheet.mergeCells(`A2:${lastCol}2`);
    const dateRow = sheet.getRow(2);
    dateRow.font = { italic: true, size: 11, name: 'Times New Roman' };
    dateRow.alignment = { horizontal: 'right', vertical: 'middle' };
    dateRow.height = 22;

    // Row 3: header — tự động tạo từ sheet.columns nếu có header
    // Nhưng insertRow đã đẩy header xuống row 3, ta set lại values cho chắc
    const headerValues = columns.map(c => c.header ?? c.key ?? '');
    sheet.getRow(3).values = headerValues;
  }

  /**
   * Single-pass styling cho toàn bộ sheet:
   * - Font Times New Roman
   * - Border mỏng/dày
   * - Fill header
   * - Wrap data rows
   * - Độ rộng cột từ widthAccumulators
   */
  private applyAllStyles(
    sheet: ExcelJS.Worksheet,
    headerRowIndex: number,
    widthAccumulators: IWidthAccumulator[],
  ): void {
    const MAX_WIDTH = 30;
    const MIN_WIDTH = 5;

    sheet.eachRow((row, rowNumber) => {
      const isHeader = rowNumber === headerRowIndex;
      const isData = rowNumber > headerRowIndex;

      row.font = {
        name: 'Times New Roman',
        size: isHeader ? 12 : 11,
        bold: isHeader,
      };

      if (isHeader) {
        row.height = 28;
        row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
      }

      row.eachCell({ includeEmpty: true }, cell => {
        cell.border = {
          top: { style: isHeader ? 'medium' : 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };

        if (isHeader) {
          cell.fill = {
            type: 'pattern', pattern: 'solid',
            fgColor: { argb: 'FFEFEFEF' },
          };
        }

        if (isData) {
          cell.alignment = { ...cell.alignment, wrapText: true, vertical: 'top' };
        }
      });
    });

    // STT column: căn giữa
    sheet.getColumn('stt').alignment = { horizontal: 'center', vertical: 'middle' };

    // Áp dụng độ rộng đã tính trước
    for (const acc of widthAccumulators) {
      const col = sheet.getColumn(acc.key);
      if (!col) continue;

      if (acc.fixedPx !== undefined) {
        col.width = acc.fixedPx;
      } else if (acc.isAuto) {
        col.width = Math.min(Math.max(acc.maxLen + 2, MIN_WIDTH), MAX_WIDTH);
      }
    }
  }

  /** Page setup cho in ấn (A4 landscape, fit to 1 page wide) */
  private applyPrintSetup(
    sheet: ExcelJS.Worksheet,
    lastCol: string,
    headerRowIndex: number,
  ): void {
    sheet.pageSetup = {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      printTitlesRow: `${headerRowIndex}:${headerRowIndex}`,
    };
    sheet.pageSetup.printArea = `A1:${lastCol}${sheet.rowCount}`;
    sheet.headerFooter.oddFooter = '&LNgày in: &D&RTrang &P / &N';
  }
}