/**
 * ============================================================
 * FILE 3/10: helpers/row-transform.helper.ts
 *
 * Chứa toàn bộ logic:
 *  - Format giá trị (date, array, object, html)
 *  - compileColumns: pre-build resolver một lần cho tất cả row
 *  - transformRows: biến data thành rows + tính độ rộng cột
 *
 * Được dùng bởi cả ExcelBuilder và PdfNativeBuilder.
 * Không có dependency ngoài → dễ test độc lập.
 * ============================================================
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  IColumnConfig,
  ICompiledColumn,
  IWidthAccumulator,
  ITransformRowsResult,
} from '../interfaces/data-export.interface';

// ─── Regex constants (compile once) ──────────────────────────────────────────
const HTML_TAG_REGEX    = /<[^>]+>/g;
const CAMEL_REPLACE_RE  = /[_-]+([a-zA-Z0-9])/g;
const HAS_DELIMITER_RE  = /[_-]/;

@Injectable()
export class RowTransformHelper {
  private readonly logger = new Logger(RowTransformHelper.name);

  // ─── Value formatters (pure, dùng lại ở nhiều chỗ) ───────────────────────

  /** "some_key" → "someKey" */
  toCamelCase(str: string): string {
    if (!str || !HAS_DELIMITER_RE.test(str)) return str;
    return str.replace(CAMEL_REPLACE_RE, (_, c) => c.toUpperCase());
  }

  /** Date → "DD/MM/YYYY" */
  formatDateToDDMMYYYY(date: Date): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}/${date.getFullYear()}`;
  }

  /**
   * Format value sang chuỗi ngày
   * @param value  Date | string | null | undefined
   * @param format 'DD/MM/YYYY' (default) | 'DD/MM/YYYY HH:mm'
   */
  cleanHtmlString(value: any): string {
    if (value == null) return '';
    let strValue = '';
    if (typeof value === 'object' && !(value instanceof Date)) {
      strValue = value.title ?? value.name ?? value.code ?? value.fileName ?? '';
    } else if (typeof value === 'string') {
      strValue = value;
    } else {
      strValue = String(value);
    }

    strValue = strValue.trim();
    if (!strValue.includes('<')) {
      return strValue;
    }

    const labelMatch = strValue.match(/<[a-zA-Z0-9]+\s+[^>]*class=["']unit-task-label["'][^>]*>([\s\S]*?)<\/[a-zA-Z0-9]+>/i);
    if (labelMatch) {
      strValue = labelMatch[1];
    } else {
      if (strValue.includes('unit-task-tooltip')) {
        strValue = strValue.replace(/<[a-zA-Z0-9]+\s+[^>]*class=["']unit-task-tooltip["'][^>]*>([\s\S]*?)<\/[a-zA-Z0-9]+>/gi, '');
      }
    }

    return strValue.replace(HTML_TAG_REGEX, '').trim();
  }

  formatDateValue(value: any, format?: string): string {
    if (value == null || value === '') return '';

    if (value instanceof Date) {
      if (isNaN(value.getTime())) return '';
      const base = this.formatDateToDDMMYYYY(value);
      if (format === 'DD/MM/YYYY HH:mm') {
        const hh = String(value.getHours()).padStart(2, '0');
        const mn = String(value.getMinutes()).padStart(2, '0');
        return `${base} ${hh}:${mn}`;
      }
      return base;
    }

    return this.cleanHtmlString(value);
  }

  /** Array → chuỗi phân cách dấu phẩy */
  formatArrayValue(arr: any[]): string {
    return arr
      .map(v => {
        if (v == null) return '';
        return typeof v === 'object'
          ? (v.title ?? v.name ?? v.code ?? v.fileName ?? '')
          : String(v);
      })
      .filter(Boolean)
      .join(', ');
  }

  /**
   * Lấy giá trị theo dotted path, hỗ trợ camelCase fallback.
   * vd: extractNestedValue(item, "sender.name") → item.sender?.name
   */
  extractNestedValue(item: any, key: string): any {
    return key.split('.').reduce((obj: any, k: string) => {
      if (obj == null || typeof obj !== 'object') return undefined;
      if (obj[k] !== undefined) return obj[k];
      const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      return obj[camel];
    }, item);
  }

  // ─── Column compilation ───────────────────────────────────────────────────

  /**
   * Pre-build resolver function cho mỗi column.
   * Gọi một lần, dùng cho toàn bộ rows → tránh if/switch trong hot loop.
   *
   * @param columns - Danh sách cột đã có STT (STT column có key = 'stt')
   */
  compileColumns(columns: IColumnConfig[]): ICompiledColumn[] {
    return columns.map(col => {
      const key = col.key as string;

      // ── STT column ───────────────────────────────────────────────────────
      if (key === 'stt') {
        return { key, resolver: (_item, idx) => idx + 1 };
      }

      // ── Date column ──────────────────────────────────────────────────────
      if (col.type === 'date') {
        const fmt = col.format;
        return {
          key,
          resolver: (item: Record<string, any>) => {
            const v = this.extractNestedValue(item, key);
            return v == null ? '' : this.formatDateValue(v, fmt);
          },
        };
      }

      // ── General column ───────────────────────────────────────────────────
      // Pre-evaluate các điều kiện đặc biệt một lần (không lặp trong loop)
      const headerIncludesNgayDang = (col.header ?? '').toLowerCase().includes('ngày đăng');
      const isPublishedDate        = key === 'publishedDate';

      return {
        key,
        resolver: (item: Record<string, any>) => {
          // Special: authorityPeriod bypass
          if (item.authorityPeriod && (key === 'authorityPeriod' || key === 'authority_period')) {
            return item.authorityPeriod;
          }

          let value = this.extractNestedValue(item, key);

          // Fallback "Ngày đăng" → createdAt
          if (value == null && headerIncludesNgayDang && item.createdAt) {
            const d = new Date(item.createdAt);
            return isNaN(d.getTime()) ? '' : this.formatDateToDDMMYYYY(d);
          }

          // Fallback publishedDate → createdAt
          if (value == null && isPublishedDate) {
            value = item.publishedDate ?? item.createdAt ?? null;
          }

          if (value == null)             return '';
          if (Array.isArray(value))      return this.formatArrayValue(value);
          return this.cleanHtmlString(value);
        },
      };
    });
  }

  // ─── Row transformation ───────────────────────────────────────────────────

  /**
   * Biến mảng data thô thành rows dùng được cho Excel/PDF.
   * Đồng thời tính toán độ rộng cột trong cùng một lần lặp (không scan lại).
   *
   * @param data     - Raw data từ service
   * @param compiled - Compiled columns (từ compileColumns)
   * @param columns  - Column config gốc (để khởi tạo widthAccumulators)
   */
  transformRows(
    data: any[],
    compiled: ICompiledColumn[],
    columns?: IColumnConfig[],
  ): ITransformRowsResult {
    // ── Init width accumulators từ header lengths ─────────────────────────
    const widthAccumulators: IWidthAccumulator[] = (columns ?? []).map(col => ({
      key:     col.key,
      maxLen:  (col.header ?? '').length,
      isAuto:  col.width === 1 && col.key !== 'abstractNote',
      fixedPx: col.key === 'abstractNote' && col.width === 1
        ? 50
        : col.width !== 1 ? col.width : undefined,
    }));

    const accMap = new Map<string, IWidthAccumulator>(
      widthAccumulators.map(a => [a.key, a]),
    );

    if (!data.length) return { rows: [], widthAccumulators };

    // ── Build key-normalization map ONCE từ first non-null row ────────────
    const sample  = data.find(r => r && typeof r === 'object') ?? {};
    const keyMap  = this.buildKeyNormalizationMap(sample);

    const tStart  = Date.now();
    const rows: Record<string, any>[] = new Array(data.length);

    let currentStt = 0; // STT theo nhóm

    for (let i = 0; i < data.length; i++) {
      const raw = data[i];

      // ── Nếu là dòng group, reset STT ─────────────────────────────────
      if (raw.isGroup) {
        currentStt = 0;
        rows[i] = { ...raw }; // giữ nguyên dòng group
        continue;
      }

      // Normalize snake_case / kebab-case → camelCase
      const item = this.applyKeyMap(raw, keyMap);

      // Alias status_code_name → status_code
      if (item.statusCodeName) item.statusCode = item.statusCodeName;

      const row: Record<string, any> = {};

      for (const { key, resolver } of compiled) {
        let val = resolver(item, i);

        // ── STT tính theo nhóm
        if (key === 'stt') {
          currentStt++;
          val = currentStt;
        }

        row[key] = val;

        // Track độ rộng trong cùng vòng lặp
        const acc = accMap.get(key);
        if (acc?.isAuto && val != null) {
          const len = String(val).length;
          if (len > acc.maxLen) acc.maxLen = len;
        }
      }

      rows[i] = row;
    }

    return { rows, widthAccumulators };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /** Tạo map { rawKey → camelKey } từ sample row. Gọi một lần. */
  private buildKeyNormalizationMap(sample: Record<string, any>): Map<string, string> {
    const map = new Map<string, string>();
    for (const key of Object.keys(sample)) {
      map.set(key, this.toCamelCase(key));
    }
    return map;
  }

  /**
   * Áp dụng keyMap để convert keys của một row.
   * Keys không có trong map vẫn được giữ lại (phòng trường hợp dataset không đồng nhất).
   */
  private applyKeyMap(
    raw: Record<string, any>,
    keyMap: Map<string, string>,
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [rawKey, camelKey] of keyMap) {
      if (rawKey in raw && result[camelKey] === undefined) {
        result[camelKey] = raw[rawKey];
      }
    }

    // Pass through keys mới xuất hiện (dataset không đồng nhất)
    for (const key of Object.keys(raw)) {
      const camel = keyMap.get(key) ?? this.toCamelCase(key);
      if (result[camel] === undefined) result[camel] = raw[key];
    }

    return result;
  }
}