/**
 * ============================================================
 * FILE 1/10: interfaces/data-export.interface.ts
 * Tất cả interface dùng chung toàn module data-export
 * ============================================================
 */

// ─── API / Handler resolution ────────────────────────────────────────────────

/** Kết quả parse URL từ Feature Management (vd: "incoming/list/main-process?type=deadline") */
export interface IParsedApiUrl {
  service: string | null;
  action: 'list' | 'search';
  apiKey: string | null;
  query: Record<string, string>;
}

/**
 * Mô tả cách gọi một method của một service khi export theo processFn.
 * typeHandle quyết định cách build DTO và cách truyền tham số vào method.
 */
export interface IListHandler {
  method: string;
  typeHandle:
    | 'dto'          // ListDocumentsDto – (dto, userId, authorId?)
    | 'dtoMeeting'   // ListMeetingExportDto – (dtoMeeting, userId, authorId?)
    | 'dtoTask'      // ListTaskDto – (dtoTask, userId)
    | 'object'       // plain object – ({ page, limit, userId, filter, ... }, userId)
    | 'legacy'       // truyền ngược: (userId, dto)
    | 'dtoListRecall'    // (userId, recordId, payload)
    | 'dtoListQuanLyCV'  // (recordId, page, limit, userId)
    | 'dtoListVanBanDi'  // (recordId, payload, userId)
    | 'dtoHoistFilter';   // (dto, userId, authorId)
}

// ─── Column configuration ─────────────────────────────────────────────────────

/** Cấu hình một cột trong bảng export */
export interface IColumnConfig {
  key: string;
  header: string;
  type?: string;
  width?: number;
  format?: string;
  valueInput?: any;
  isShow?: boolean;
}

/** Kết quả lấy cấu hình cột (bao gồm nguồn lấy) */
export interface IColumnConfigResult {
  columns: IColumnConfig[];
  nameOfList: string;
  source: 'table_configs' | 'feature_management' | 'view_configs';
}

// ─── Export result ────────────────────────────────────────────────────────────

/** Kết quả cuối cùng khi export: buffer + tên file + content-type */
export interface IExportFileResult {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

export interface IExportExtraInfo {
  key?: string;
  label: string;
  value: any;
}

export interface IExportBuildOptions {
  extraInfo?: IExportExtraInfo[];
}

// ─── Row transform ────────────────────────────────────────────────────────────

/**
 * Compiled column: đã pre-build resolver function một lần,
 * tránh lặp lại logic trong vòng lặp row.
 */
export interface ICompiledColumn {
  key: string;
  resolver: (item: Record<string, any>, rowIndex: number) => any;
}

/** Accumulator theo dõi độ rộng cột trong quá trình transform */
export interface IWidthAccumulator {
  key: string;
  maxLen: number;
  isAuto: boolean;         // true nếu width cần tự tính
  fixedPx?: number;        // giá trị cố định (nếu có)
}

/** Output của transformRows */
export interface ITransformRowsResult {
  rows: Record<string, any>[];
  widthAccumulators: IWidthAccumulator[];
}

// ─── PDF builder ──────────────────────────────────────────────────────────────

/** Options để build PDF trực tiếp (không qua Excel → convert) */
export interface IPdfBuildOptions {
  nameOfList: string;
  columns: IColumnConfig[];
  rows: Record<string, any>[];
  fontPath?: string;
}

// ─── ViewConfig mapping ───────────────────────────────────────────────────────

/** Mapping viewConfigCode → { service, typeHandle, method } */
export interface IViewConfigMapping {
  service: string;
  typeHandle: IListHandler['typeHandle'];
  method: string;
}

// ─── Default API mapping ──────────────────────────────────────────────────────

export interface IDefaultApiMapping {
  [processFn: string]: string;
}

// ─── List result ──────────────────────────────────────────────────────────────

export interface IListResult<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  extraInfo?: IExportExtraInfo[];
}
