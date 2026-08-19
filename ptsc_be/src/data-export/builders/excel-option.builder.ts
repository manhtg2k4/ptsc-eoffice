/**
 * ============================================================
 * FILE: builders/excel-option.builder.ts
 *
 * Build Excel + hỗ trợ extraInfo (header động)
 * ============================================================
 */

import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

import {
  IColumnConfig,
  IExportBuildOptions,
  IExportFileResult,
  IWidthAccumulator,
} from '../interfaces/data-export.interface';
import { RowTransformHelper } from '../helpers/row-transform.helper';

@Injectable()
export class ExcelBuilderOption {
  private readonly logger = new Logger(ExcelBuilderOption.name);

  constructor(private readonly rowTransform: RowTransformHelper) {}

  async buildOptionExcel(
    data: any[],
    columns: IColumnConfig[],
    nameOfList: string,
    options?: IExportBuildOptions, // ✅ FIX 1: thêm options
  ): Promise<IExportFileResult> {
    const start = Date.now();
    // 1. Transform data
    const compiled = this.rowTransform.compileColumns(columns);
    const { rows, widthAccumulators } =
      this.rowTransform.transformRows(data, compiled, columns);

    // 2. Workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Danh sách');
    sheet.columns = columns.map(c => ({
      key: c.key,
      width: c.width ?? 15,
    }));

    const columnIndex = sheet.columnCount || columns.length || 1;
    const lastCol = sheet.getColumn(columnIndex)?.letter ?? 'A';

    // ✅ FIX 2: dynamic header index
    const headerRowIndex = this.applyTitleSection(
      sheet,
      nameOfList,
      lastCol,
      columns,
      options?.extraInfo ?? [],
    );

    // 3. Data
    sheet.addRows(rows);

    // 4. Style
    this.applyAllStyles(sheet, headerRowIndex, widthAccumulators);
    this.fixInfoSectionAlignment(sheet);
    this.applyPrintSetup(sheet, lastCol, headerRowIndex);

    // 5. Buffer
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());


    return {
      buffer,
      filename: `${nameOfList}.xlsx`,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
  private applyTitleSection(
    sheet: ExcelJS.Worksheet,
    nameOfList: string,
    lastCol: string,
    columns: IColumnConfig[],
    extraInfo: IExportBuildOptions['extraInfo'] = [],
  ): number {
    const titleText = nameOfList.toUpperCase();

    // ===== ROW 1: TITLE =====
    sheet.insertRow(1, [titleText]);
    sheet.mergeCells(`A1:${lastCol}1`);
    const title = sheet.getRow(1);
    title.font = { bold: true, size: 14, name: 'Times New Roman' };
    title.height = 30; // tăng height
    title.eachCell((cell) => {
      cell.alignment = { horizontal: 'center', vertical: 'middle' }; // áp dụng cho tất cả
    });

    // ===== ROW 2: EMPTY =====
    sheet.insertRow(2, []);

    let currentRow = 3;

    // ===== MAP INFO =====
    const infoMap = extraInfo.reduce((acc, item) => {
      if (item.key) acc[item.key] = item.value;
      return acc;
    }, {} as Record<string, any>);

    // ===== ROW 3: Đơn vị | Ngày báo cáo =====
    sheet.insertRow(currentRow, []);
    const row3 = sheet.getRow(currentRow);

    row3.getCell(1).value = `Đơn vị: ${infoMap.unit ?? ''}`;
    row3.getCell(4).value = `Ngày báo cáo: ${
      infoMap.dateReport ?? new Date().toLocaleDateString('vi-VN')
    }`;

    row3.font = { size: 11, name: 'Times New Roman' };
    row3.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    row3.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
    row3.height = 20;
    currentRow++;

    // ===== ROW 4: Người lập =====
    sheet.insertRow(currentRow, [`Người lập: ${infoMap.createBy ?? ''}`]);
    const row4 = sheet.getRow(currentRow);
    row4.font = { size: 11, name: 'Times New Roman' };
    row4.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    row4.height = 20;
    currentRow++;

    // ===== ROW 5: Tên cuộc họp =====
    sheet.insertRow(currentRow, [`Tên cuộc họp: ${infoMap.titleMeeting ?? ''}`]);
    const row5 = sheet.getRow(currentRow);
    row5.font = { size: 11, name: 'Times New Roman' };
    row5.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    row5.height = 20;
    currentRow++;

    // ===== ROW 6: Nội dung kết luận =====
    // sheet.insertRow(currentRow, [
    //   `Nội dung kết luận: ${infoMap.contentColusion ?? ''}`,
    // ]);
    // const row6 = sheet.getRow(currentRow);
    // row6.font = { size: 11, name: 'Times New Roman' };
    // row6.getCell(1).alignment = {
    //   horizontal: 'left',
    //   vertical: 'top',
    //   wrapText: true,
    // };
    // row6.height = 35;
    // currentRow++;

    // ===== CLEAR BORDER vùng info =====
    for (let r = 2; r <= 5; r++) {
      const row = sheet.getRow(r);
      row.eachCell((cell) => {
        cell.border = {};
      });
    }

    // ===== ROW 7: HEADER TABLE =====
    const headerValues = columns.map((c) => c.header ?? c.key ?? '');
    sheet.insertRow(currentRow, headerValues);

    const headerRow = sheet.getRow(currentRow);
    headerRow.font = { name: 'Times New Roman', bold: true, size: 12 };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;

    return currentRow;
  }
  private applyAllStyles(
    sheet: ExcelJS.Worksheet,
    headerRowIndex: number,
    widthAccumulators: IWidthAccumulator[],
  ): void {
    const MAX_WIDTH = 30;
    const MIN_WIDTH = 5;

    for (let rowNumber = headerRowIndex; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      const isHeader = rowNumber === headerRowIndex;
      const isData = rowNumber > headerRowIndex;

      const firstCellRaw = row.getCell(1).value;
      const firstCellValue = String(firstCellRaw || '').trim();

      // 🔥 detect group mạnh hơn
      const isGroupHeader =
        isData &&
        (
          firstCellValue.includes('Kết luận') ||
          /^\d+\.\s*Kết luận/i.test(firstCellValue)
        );

      // ================= HEADER =================
      if (isHeader) {
        row.height = 28;

        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.font = {
            name: 'Times New Roman',
            size: 12,
            bold: true,
          };

          cell.alignment = {
            horizontal: 'center',
            vertical: 'middle',
          };

          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFEFEFEF' },
          };

          cell.border = {
            top: { style: 'medium' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
          };
        });

        continue;
      }

      // ================= GROUP ROW =================
      if (isGroupHeader) {
        const lastColNumber = sheet.columnCount;

        // tránh merge nhiều lần gây crash
        try {
          sheet.mergeCells(rowNumber, 1, rowNumber, lastColNumber);
        } catch (_) {}

        const cell = row.getCell(1);
        cell.font = {
          name: 'Times New Roman',
          size: 11,
          bold: true,
        };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' },
        };
        row.height = 22;

        for (let i = 1; i <= lastColNumber; i++) {
          const c = row.getCell(i);
          c.border = {};
        }

        continue;
      }

      // ================= DATA ROW =================
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = {
          name: 'Times New Roman',
          size: 11,
        };

        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };

        // Ép kiểu cell.col sang number để không lỗi TS
        const colIndex = Number(cell.col) - 1;
        const colKey = sheet.columns[colIndex]?.key;

        // Chỉ căn trái cho cột STT, còn lại căn trái mặc định
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      });
    }

    // ================= AUTO WIDTH =================
    for (const acc of widthAccumulators) {
      const col = sheet.getColumn(acc.key);
      if (!col) continue;

      if (acc.fixedPx !== undefined) {
        col.width = acc.fixedPx;
      } else if (acc.isAuto) {
        col.width = Math.min(
          Math.max(acc.maxLen + 2, MIN_WIDTH),
          MAX_WIDTH,
        );
      }
    }
  }
  private fixInfoSectionAlignment(
    sheet: ExcelJS.Worksheet
  ) {
    const infoRows = [3, 4, 5];

    infoRows.forEach((r) => {
      const row = sheet.getRow(r);
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = {
          horizontal: 'left',
          vertical: 'middle',
        };
        cell.border = {};
      });
    });

    // Ngày báo cáo ở cột 4
    const row3 = sheet.getRow(3);
    row3.getCell(4).alignment = {
      horizontal: 'left',
      vertical: 'middle',
    };
  }
  private applyPrintSetup(
    sheet: ExcelJS.Worksheet,
    lastCol: string,
    headerRowIndex: number,
  ): void {
    sheet.pageSetup = {
      paperSize: 9,
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