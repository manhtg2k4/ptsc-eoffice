import * as PDFDocumentModule from 'pdfkit';
type PDFKitDefault = { default: typeof PDFDocumentModule };
const PDFDocument: typeof PDFDocumentModule = (PDFDocumentModule as unknown as PDFKitDefault).default || PDFDocumentModule;
import * as fs from 'fs';

// ─── Layout ───────────────────────────────────────────────────────────────────

const PAGE_A4_LANDSCAPE = { W: 841.89, H: 595.28 } as const;
const MARGIN = { top: 28, bottom: 36, left: 18, right: 18 } as const;
const USABLE_W = PAGE_A4_LANDSCAPE.W - MARGIN.left - MARGIN.right;
const PAD = { x: 3, y: 2 } as const;

// ─── Typography ───────────────────────────────────────────────────────────────

const FS = { TITLE: 7.5, DATE: 5.5, HEADER: 5, DATA: 5, FOOTER: 4.5 };

// ─── Colors ───────────────────────────────────────────────────────────────────

const COLOR = {
  HEADER_BG: '#EFEFEF',
  ROW_ALT: '#F9F9F9',
  BORDER: '#BBBBBB',
  TEXT: '#000000',
  MUTED: '#555555',
} as const;

// ─── Column width constraints ─────────────────────────────────────────────────

const COL = {
  MIN_PT: 40,
  SAMPLE_ROWS: 200,
  AUTO_WEIGHT_MIN: 6,
  AUTO_WEIGHT_MAX: 40,
} as const;

const FIXED_COLS: Record<string, number> = { stt: 22 };
const AUTO_MEASURE_KEYS = new Set(['files']);

const FONT_PATHS = {
  normal: [
    '/usr/share/fonts/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/ttf-dejavu/DejaVuSans.ttf', // Alpine Linux
  ],
  bold: [
    '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/ttf-dejavu/DejaVuSans-Bold.ttf', // Alpine Linux
  ],
};

// ─── Vietnamese diacritic strip regex (compiled once) ─────────────────────────
const DIACRITIC_REGEX = /[\u0300-\u036f]/g;
const D_CHAR_REGEX = /[đĐ]/g;

// ─── Public types ─────────────────────────────────────────────────────────────

export interface PdfColumnDef {
  key: string;
  header: string;
  width: number;
  type?: string;
  format?: string;
}

export interface PdfBuildOptions {
  nameOfList: string;
  columns: PdfColumnDef[];
  rows: Record<string, any>[];
  fontPath?: string;
}

interface FontConfig {
  normal: string;
  bold: string;
  embedded: boolean;
}

/** Pre-computed per-column metadata used during render — avoids repeat checks */
interface ResolvedColumn {
  def: PdfColumnDef;
  width: number;
  align: 'center' | 'left';
}

// ─── DocumentsPdfBuilder ──────────────────────────────────────────────────────

export class DocumentsPdfBuilder {

  // ── Entry point ─────────────────────────────────────────────────────────────

  static async build(options: PdfBuildOptions): Promise<Buffer> {
    const { nameOfList, columns, rows } = options;

    const font = DocumentsPdfBuilder.resolveFont(options.fontPath);
    const colWidths = DocumentsPdfBuilder.computeColumnWidths(columns, rows);
    const doc = DocumentsPdfBuilder.createDocument(font);

    // Pre-resolve column metadata once — avoids repeated key/type checks per row
    const resolvedCols = DocumentsPdfBuilder.resolveColumnMeta(columns, colWidths);

    // Height memoization: "text|width" → height in pts
    const heightCache = new Map<string, number>();

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    let y = DocumentsPdfBuilder.renderTitle(doc, nameOfList, colWidths, font);
    y = DocumentsPdfBuilder.renderHeaderRow(doc, resolvedCols, y + 2, font, heightCache);
    DocumentsPdfBuilder.renderDataRows(doc, rows, resolvedCols, y, font, heightCache);
    DocumentsPdfBuilder.renderFootersAllPages(doc, font);

    return new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }

  // ── Column metadata pre-resolution ──────────────────────────────────────────
  private static resolveColumnMeta(
    columns: PdfColumnDef[],
    colWidths: number[],
  ): ResolvedColumn[] {
    return columns.map((def, i) => ({
      def,
      width: colWidths[i],
      align: def.key === 'stt' ? 'center' : 'left',
    }));
  }

  // ── Font ────────────────────────────────────────────────────────────────────
  private static resolveFont(explicitPath?: string): FontConfig {
    try {
      const normalPaths: string[] = [];

      if (explicitPath && typeof explicitPath === 'string' && explicitPath.trim()) {
        normalPaths.push(explicitPath);
      }

      if (FONT_PATHS?.normal) {
        if (Array.isArray(FONT_PATHS.normal)) {
          normalPaths.push(...FONT_PATHS.normal);
        } else {
          normalPaths.push(FONT_PATHS.normal);
        }
      }

      const normal =
        DocumentsPdfBuilder.findFirstExistingFont(normalPaths) ?? 'Times-Roman';

      let bold: string | null = null;

      if (FONT_PATHS?.bold) {
        const boldPaths = Array.isArray(FONT_PATHS.bold)
          ? FONT_PATHS.bold
          : [FONT_PATHS.bold];

        bold = DocumentsPdfBuilder.findFirstExistingFont(boldPaths);
      }

      return {
        normal,
        bold: bold ?? 'Times-Bold',
        embedded: true,
      };
    } catch (error) {
      return {
        normal: 'Times-Roman',
        bold: 'Times-Bold',
        embedded: false,
      };
    }
  }

  private static findFirstExistingFont(paths: string[]): string | null {
    return paths.find(p => p && fs.existsSync(p)) ?? null;
  }

  private static createDocument(font: FontConfig): PDFKit.PDFDocument {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: MARGIN,
      autoFirstPage: true,
      bufferPages: true,
    });

    if (font.embedded) {
      doc.registerFont('VN', font.normal);
      doc.registerFont('VN-Bold', font.bold);
    }

    return doc;
  }

  private static applyFont(
    doc: PDFKit.PDFDocument,
    font: FontConfig,
    bold = false,
    size = FS.DATA,
  ): void {
    const name = font.embedded
      ? (bold ? 'VN-Bold' : 'VN')
      : (bold ? 'Helvetica-Bold' : 'Helvetica');
    doc.font(name).fontSize(size);
  }

  /**
   * Strip Vietnamese diacritics when font doesn't support Unicode.
   * Called once per cell value, result used directly — no repeat work.
   */
  private static toSafeText(value: string | null | undefined, font: FontConfig): string {
    const str = value ?? '';
    if (font.embedded) return str;
    return str
      .normalize('NFD')
      .replace(DIACRITIC_REGEX, '')
      .replace(D_CHAR_REGEX, m => (m === 'đ' ? 'd' : 'D'));
  }

  // ── Column width computation ─────────────────────────────────────────────────

  static computeColumnWidths(columns: PdfColumnDef[], rows: Record<string, any>[]): number[] {
    const fixedTotal = columns.reduce((sum, c) => sum + (FIXED_COLS[c.key] ?? 0), 0);
    const flexBudget = USABLE_W - fixedTotal;
    const flexColumns = columns.filter(c => !(c.key in FIXED_COLS));

    const weights = flexColumns.map(col => DocumentsPdfBuilder.resolveColumnWeight(col, rows));
    const ptWidths = DocumentsPdfBuilder.distributeProportionally(weights, flexBudget);

    let fi = 0;
    return columns.map(col =>
      col.key in FIXED_COLS ? FIXED_COLS[col.key] : ptWidths[fi++],
    );
  }

  private static resolveColumnWeight(col: PdfColumnDef, rows: Record<string, any>[]): number {
    return AUTO_MEASURE_KEYS.has(col.key) || col.width <= 1
      ? DocumentsPdfBuilder.measureContentWeight(col, rows)
      : col.width;
  }

  private static measureContentWeight(col: PdfColumnDef, rows: Record<string, any>[]): number {
    const limit = Math.min(rows.length, COL.SAMPLE_ROWS);
    let maxChars = (col.header ?? '').length;

    for (let i = 0; i < limit; i++) {
      const v = rows[i]?.[col.key];
      if (v == null) continue;
      const len = Array.isArray(v) ? v.join(', ').length : String(v).length;
      if (len > maxChars) maxChars = len;
    }

    return Math.min(Math.max(maxChars, COL.AUTO_WEIGHT_MIN), COL.AUTO_WEIGHT_MAX);
  }

  private static distributeProportionally(weights: number[], budget: number): number[] {
    const totalWeight = weights.reduce((s, w) => s + w, 0);

    let widths = totalWeight === 0
      ? weights.map(() => budget / Math.max(weights.length, 1))
      : weights.map(w => (w / totalWeight) * budget);

    widths = widths.map(w => Math.max(w, COL.MIN_PT));

    const sum = widths.reduce((s, w) => s + w, 0);
    const scale = sum > 0 ? budget / sum : 1;
    widths = widths.map(w => Math.floor(w * scale));

    const remainder = budget - widths.reduce((s, w) => s + w, 0);
    if (remainder > 0 && widths.length > 0) {
      widths[widths.indexOf(Math.max(...widths))] += remainder;
    }

    return widths;
  }

  // ── Height helpers (with memoization) ───────────────────────────────────────

  /**
   * Memoized heightOfString — same (text, width) pair returns cached result.
   * Critical for large datasets where column values repeat frequently.
   */
  private static measureHeight(
    doc: PDFKit.PDFDocument,
    text: string,
    cellW: number,
    cache: Map<string, number>,
  ): number {
    const cacheKey = `${cellW}|${text}`;
    const cached = cache.get(cacheKey);
    if (cached !== undefined) return cached;

    const h = doc.heightOfString(text, { width: cellW });
    cache.set(cacheKey, h);
    return h;
  }

  // ── Title ────────────────────────────────────────────────────────────────────

  private static renderTitle(
    doc: PDFKit.PDFDocument,
    nameOfList: string,
    colWidths: number[],
    font: FontConfig,
  ): number {
    const totalW = colWidths.reduce((s, w) => s + w, 0);
    let y = MARGIN.top;

    DocumentsPdfBuilder.applyFont(doc, font, true, FS.TITLE);
    doc.fillColor(COLOR.TEXT).text(
      DocumentsPdfBuilder.toSafeText(`DANH SÁCH ${nameOfList.toUpperCase()}`, font),
      MARGIN.left, y, { width: totalW, align: 'center', lineBreak: false },
    );
    y += FS.TITLE + 4;

    DocumentsPdfBuilder.applyFont(doc, font, false, FS.DATE);
    doc.fillColor(COLOR.MUTED).text(
      DocumentsPdfBuilder.toSafeText(
        `Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, font,
      ),
      MARGIN.left, y, { width: totalW, align: 'right', lineBreak: false },
    );

    return y + 12;
  }

  // ── Header row ───────────────────────────────────────────────────────────────

  private static renderHeaderRow(
    doc: PDFKit.PDFDocument,
    cols: ResolvedColumn[],
    startY: number,
    font: FontConfig,
    heightCache: Map<string, number>,
  ): number {
    DocumentsPdfBuilder.applyFont(doc, font, true, FS.HEADER);
    const rowH = DocumentsPdfBuilder.measureHeaderHeight(doc, cols, font, heightCache);

    DocumentsPdfBuilder.applyFont(doc, font, true, FS.HEADER);
    let x = MARGIN.left;

    for (const { def, width } of cols) {
      const label = DocumentsPdfBuilder.toSafeText(def.header ?? '', font);
      doc.rect(x, startY, width, rowH).fill(COLOR.HEADER_BG);
      doc.rect(x, startY, width, rowH).stroke(COLOR.BORDER);
      doc.fillColor(COLOR.TEXT).text(label, x + PAD.x, startY + PAD.y, {
        width: width - PAD.x * 2, height: rowH - PAD.y * 2,
        align: 'center', lineBreak: true, ellipsis: false,
      });
      x += width;
    }

    return startY + rowH;
  }

  private static measureHeaderHeight(
    doc: PDFKit.PDFDocument,
    cols: ResolvedColumn[],
    font: FontConfig,
    heightCache: Map<string, number>,
  ): number {
    DocumentsPdfBuilder.applyFont(doc, font, true, FS.HEADER);
    let maxH = FS.HEADER + PAD.y * 2;

    for (const { def, width } of cols) {
      const label = DocumentsPdfBuilder.toSafeText(def.header ?? '', font);
      const cellW = Math.max(width - PAD.x * 2, 1);
      // Use cache — header labels are measured once but re-rendered on each page
      const h = DocumentsPdfBuilder.measureHeight(doc, label, cellW, heightCache) + PAD.y * 2;
      if (h > maxH) maxH = h;
    }

    return Math.max(maxH, 14);
  }

  // ── Data rows ────────────────────────────────────────────────────────────────

  private static renderDataRows(
    doc: PDFKit.PDFDocument,
    rows: Record<string, any>[],
    cols: ResolvedColumn[],
    startY: number,
    font: FontConfig,
    heightCache: Map<string, number>,
  ): void {
    let y = startY;
    const contentBottom = doc.page.height - MARGIN.bottom - 6 - FS.FOOTER;

    DocumentsPdfBuilder.applyFont(doc, font, false, FS.DATA);

    for (let i = 0; i < rows.length; i++) {
      const rowH = DocumentsPdfBuilder.measureRowHeight(
        doc, rows[i], cols, font, heightCache,
      );

      if (y + rowH > contentBottom) {
        doc.addPage();
        y = MARGIN.top;
        // Re-measure header on new page using already-warm cache
        y = DocumentsPdfBuilder.renderHeaderRow(doc, cols, y, font, heightCache);
        DocumentsPdfBuilder.applyFont(doc, font, false, FS.DATA);
      }

      DocumentsPdfBuilder.renderRow(doc, rows[i], cols, y, i, rowH, font);
      y += rowH;
    }
  }

  private static measureRowHeight(
    doc: PDFKit.PDFDocument,
    row: Record<string, any>,
    cols: ResolvedColumn[],
    font: FontConfig,
    heightCache: Map<string, number>,
  ): number {
    // Font already set by caller — avoid redundant applyFont in hot loop
    let maxH = 14;

    for (const { def, width } of cols) {
      const raw = row[def.key];
      if (raw == null || raw === '') continue;

      const text = String(raw);
      const cellW = Math.max(width - PAD.x * 2, 1);
      const h = DocumentsPdfBuilder.measureHeight(doc, text, cellW, heightCache) + PAD.y * 2;
      if (h > maxH) maxH = h;
    }

    return maxH;
  }

  private static renderRow(
    doc: PDFKit.PDFDocument,
    row: Record<string, any>,
    cols: ResolvedColumn[],
    y: number,
    rowIndex: number,
    rowHeight: number,
    font: FontConfig,
  ): void {
    const totalW = cols.reduce((s, c) => s + c.width, 0);
    let x = MARGIN.left;

    if (rowIndex % 2 === 1) {
      doc.rect(x, y, totalW, rowHeight).fill(COLOR.ROW_ALT);
    }

    // Font already set to DATA by caller
    doc.fillColor(COLOR.TEXT);

    for (const { def, width, align } of cols) {
      const raw = row[def.key] ?? '';
      const cellText = DocumentsPdfBuilder.toSafeText(String(raw), font);

      doc.rect(x, y, width, rowHeight).stroke(COLOR.BORDER);

      if (cellText) {
        doc.text(cellText, x + PAD.x, y + PAD.y, {
          width: width - PAD.x * 2,
          height: rowHeight - PAD.y * 2,
          align,
          lineBreak: true,
          ellipsis: false,
        });
      }

      x += width;
    }
  }

  // ── Footer ───────────────────────────────────────────────────────────────────

  private static renderFootersAllPages(doc: PDFKit.PDFDocument, font: FontConfig): void {
    const range = doc.bufferedPageRange();
    const totalPages = range.count;
    const contentW = PAGE_A4_LANDSCAPE.W - MARGIN.left - MARGIN.right;
    const halfW = Math.floor(contentW / 2);
    const printDate = DocumentsPdfBuilder.toSafeText(
      `Ngày in: ${new Date().toLocaleDateString('vi-VN')}`, font,
    );

    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(range.start + i);

      const savedBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;

      DocumentsPdfBuilder.applyFont(doc, font, false, FS.FOOTER);
      doc.fillColor(COLOR.MUTED);

      const footerY = doc.page.height - savedBottom + 6;

      doc.text(printDate, MARGIN.left, footerY, {
        width: halfW, align: 'left', lineBreak: false,
      });

      doc.text(`Trang ${i + 1} / ${totalPages}`, MARGIN.left + halfW, footerY, {
        width: halfW, align: 'right', lineBreak: false,
      });

      doc.page.margins.bottom = savedBottom;
    }
  }
}