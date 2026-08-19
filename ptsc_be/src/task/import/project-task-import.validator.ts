export type RowType = 'project' | 'task';

export interface ImportRow {
  rowNumber: number;
  stt?: string;
  name?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  remindDays?: string | number;
  priority?: string;
  description?: string;
  projectType?: string;
  investmentTotal?: string | number;
  projectManager?: string;
  projectMembers?: string;
  projectViewers?: string;
  assigner?: string;
  director?: string;
  supporters?: string;
  taskViewers?: string;
  approvalRequired?: string;
}

export interface UserDirectoryItem {
  username: string;
  active: boolean;
}

export interface ValidationError {
  row: number;
  field: string;
  code: string;
  message: string;
}

export interface ValidateInput {
  rows: ImportRow[];
  users: UserDirectoryItem[];
  projectTypes: string[];
  allowProjectTaskFields?: boolean;
}

const STT_REGEX = /^\d+(\.\d+)*$/;
const PROJECT_ONLY_FIELDS: Array<keyof ImportRow> = [
  'projectType', 'investmentTotal', 'projectManager', 'projectMembers', 'projectViewers',
];

const TASK_ONLY_FIELDS: Array<keyof ImportRow> = [
  'assigner', 'director', 'supporters', 'taskViewers', 'approvalRequired',
];

const FIELD_LABELS: Record<string, string> = {
  stt: 'STT',
  name: 'Tên dự án / công việc',
  startDate: 'Ngày bắt đầu',
  endDate: 'Ngày kết thúc',
  remindDays: 'Thời gian nhắc hạn (ngày)',
  priority: 'Độ ưu tiên',
  description: 'Mô tả',
  projectType: 'Loại dự án',
  investmentTotal: 'Tổng mức đầu tư',
  projectManager: 'Quản lý dự án',
  projectMembers: 'Thành viên dự án',
  projectViewers: 'Người xem dự án',
  assigner: 'Người giao việc',
  director: 'Người chủ trì',
  supporters: 'Người phối hợp',
  taskViewers: 'Người xem công việc',
  approvalRequired: 'Công việc cần phê duyệt',
  users: 'Tài khoản',
  date: 'Thời gian',
};

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] || field;
}

function normalizeText(v: unknown): string {
  return String(v ?? '').trim();
}

function normalizeComparable(v: unknown): string {
  return normalizeText(v)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePriority(v: unknown): 'gap' | 'binhthuong' {
  const n = normalizeComparable(v).replace(/\s+/g, '');
  if (n === 'gap' || n === 'gấp') return 'gap';
  return 'binhthuong';
}

function parseUsers(raw?: string): string[] {
  return normalizeText(raw)
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseDate(v: string | Date | undefined): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const raw = normalizeText(v);
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*-\s*(\d{1,2}):(\d{2}))?$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    const hh = Number(m[4] ?? 0);
    const mm = Number(m[5] ?? 0);
    const t2 = new Date(year, month - 1, day, hh, mm, 0, 0);
    if (
      t2.getFullYear() === year &&
      t2.getMonth() === month - 1 &&
      t2.getDate() === day
    ) {
      return t2;
    }
  }
  const t = new Date(raw);
  return isNaN(t.getTime()) ? null : t;
}

function isNonEmpty(v: unknown): boolean {
  return normalizeText(v) !== '';
}

function parentStt(stt: string): string | null {
  const parts = stt.split('.');
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('.');
}

function rootStt(stt: string): string {
  return stt.split('.')[0];
}

export function validateProjectTaskImport(input: ValidateInput): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const userMap = new Map(input.users.map((u) => [normalizeComparable(u.username), u.active]));
  const projectTypeSet = new Set(input.projectTypes.map((x) => normalizeComparable(x)));

  const sttMap = new Map<string, ImportRow>();
  const rowTypeMap = new Map<string, RowType>();

  for (const row of input.rows) {
    const stt = normalizeText(row.stt);
    if (!stt) {
      errors.push({ row: row.rowNumber, field: 'stt', code: 'STT_REQUIRED', message: 'STT bắt buộc nhập.' });
      continue;
    }
    if (!STT_REGEX.test(stt)) {
      errors.push({ row: row.rowNumber, field: 'stt', code: 'STT_INVALID_FORMAT', message: 'STT không đúng định dạng phân cấp.' });
      continue;
    }
    if (sttMap.has(stt)) {
      errors.push({ row: row.rowNumber, field: 'stt', code: 'STT_DUPLICATE', message: `STT ${stt} bị trùng.` });
      continue;
    }

    sttMap.set(stt, row);
    rowTypeMap.set(stt, stt.includes('.') ? 'task' : 'project');
  }

  for (const [stt, row] of sttMap.entries()) {
    const p = parentStt(stt);
    if (p && !sttMap.has(p)) {
      errors.push({ row: row.rowNumber, field: 'stt', code: 'STT_PARENT_MISSING', message: `Thiếu cấp cha của STT ${stt} (cần ${p}).` });
    }

    const rowType = rowTypeMap.get(stt)!;

    if (!isNonEmpty(row.name)) errors.push({ row: row.rowNumber, field: 'name', code: 'REQUIRED_FIELD_MISSING', message: 'Tên dự án / công việc là bắt buộc.' });

    const start = parseDate(row.startDate);
    const end = parseDate(row.endDate);
    if (!start) errors.push({ row: row.rowNumber, field: 'startDate', code: 'REQUIRED_FIELD_MISSING', message: 'Ngày bắt đầu là bắt buộc và hợp lệ.' });
    if (!end) errors.push({ row: row.rowNumber, field: 'endDate', code: 'REQUIRED_FIELD_MISSING', message: 'Ngày kết thúc là bắt buộc và hợp lệ.' });
    if (start && end && start > end) {
      errors.push({ row: row.rowNumber, field: 'endDate', code: 'DATE_RANGE_INVALID', message: 'Ngày bắt đầu không được lớn hơn Ngày kết thúc.' });
    }

    if (isNonEmpty(row.remindDays) && !Number.isInteger(Number(row.remindDays))) {
      errors.push({ row: row.rowNumber, field: 'remindDays', code: 'REMIND_DAYS_NOT_INTEGER', message: 'Thời gian nhắc hạn phải là số nguyên.' });
    }

    row.priority = normalizePriority(row.priority);

    if (rowType === 'project') {
      if (!input.allowProjectTaskFields) {
        for (const f of TASK_ONLY_FIELDS) {
          if (isNonEmpty(row[f])) errors.push({ row: row.rowNumber, field: fieldLabel(String(f)), code: 'FIELD_NOT_ALLOWED_FOR_ROW_TYPE', message: `Dòng dự án không được nhập ${fieldLabel(String(f))}.` });
        }
      }
      if (!isNonEmpty(row.projectManager)) {
        errors.push({ row: row.rowNumber, field: 'projectManager', code: 'REQUIRED_FIELD_MISSING', message: 'Quản lý dự án là bắt buộc.' });
      }
      if (isNonEmpty(row.projectType) && !projectTypeSet.has(normalizeComparable(row.projectType))) {
        errors.push({ row: row.rowNumber, field: 'projectType', code: 'PROJECT_TYPE_NOT_FOUND', message: 'Loại dự án không tồn tại trong cấu hình.' });
      }
    } else {
      for (const f of PROJECT_ONLY_FIELDS) {
        if (isNonEmpty(row[f])) errors.push({ row: row.rowNumber, field: fieldLabel(String(f)), code: 'FIELD_NOT_ALLOWED_FOR_ROW_TYPE', message: `Dòng công việc không được nhập ${fieldLabel(String(f))}.` });
      }
      if (!isNonEmpty(row.assigner)) errors.push({ row: row.rowNumber, field: 'assigner', code: 'REQUIRED_FIELD_MISSING', message: 'Người giao việc là bắt buộc.' });
      if (!isNonEmpty(row.director)) errors.push({ row: row.rowNumber, field: 'director', code: 'REQUIRED_FIELD_MISSING', message: 'Người chủ trì là bắt buộc.' });
    }

    const singleUserFields: Array<keyof ImportRow> = ['projectManager', 'assigner', 'director'];
    const multiUserFields: Array<keyof ImportRow> = ['projectMembers', 'projectViewers', 'supporters', 'taskViewers'];

    for (const f of singleUserFields) {
      if (!isNonEmpty(row[f])) continue;
      const users = parseUsers(String(row[f]));
      if (users.length !== 1) {
        errors.push({ row: row.rowNumber, field: fieldLabel(String(f)), code: 'USER_CARDINALITY_INVALID', message: `${fieldLabel(String(f))} chỉ được nhập một tài khoản.` });
      }
    }

    const roleUsers: string[] = [];
    for (const f of singleUserFields) {
      if (isNonEmpty(row[f])) roleUsers.push(...parseUsers(String(row[f])));
    }
    for (const f of multiUserFields) {
      if (isNonEmpty(row[f])) roleUsers.push(...parseUsers(String(row[f])));
    }

    for (const u of roleUsers) {
      const key = normalizeComparable(u);
      if (!userMap.has(key)) {
        errors.push({ row: row.rowNumber, field: 'users', code: 'USER_NOT_FOUND', message: `Tài khoản ${u} không tồn tại.` });
      } else if (!userMap.get(key)) {
        errors.push({ row: row.rowNumber, field: 'users', code: 'USER_INACTIVE', message: `Tài khoản ${u} đã ngừng hoạt động.` });
      }
    }

    if (rowType === 'task') {
      const root = sttMap.get(rootStt(stt));
      if (root) {
        const allowed = new Set<string>([
          ...parseUsers(root.projectManager),
          ...parseUsers(root.projectMembers),
        ].map((x) => normalizeComparable(x)));

        const taskRoleUsers = [
          ...parseUsers(row.assigner),
          ...parseUsers(row.director),
          ...parseUsers(row.supporters),
          ...parseUsers(row.taskViewers),
        ];

        for (const u of taskRoleUsers) {
          if (u && !allowed.has(normalizeComparable(u))) {
            errors.push({ row: row.rowNumber, field: 'users', code: 'TASK_USER_NOT_IN_PROJECT_TEAM', message: `Tài khoản ${u} không thuộc Quản lý dự án/Thành viên dự án.` });
          }
        }

        const rootStart = parseDate(root.startDate);
        const rootEnd = parseDate(root.endDate);
        if (start && end && rootStart && rootEnd && (start < rootStart || end > rootEnd)) {
          errors.push({ row: row.rowNumber, field: 'date', code: 'DATE_OUTSIDE_PROJECT', message: 'Thời gian công việc nằm ngoài thời gian dự án.' });
        }
      }

      const pStt = parentStt(stt);
      const pRow = pStt ? sttMap.get(pStt) : null;
      if (pStt && pRow && rowTypeMap.get(pStt) === 'task') {
        const pStart = parseDate(pRow.startDate);
        const pEnd = parseDate(pRow.endDate);
        if (start && end && pStart && pEnd && (start < pStart || end > pEnd)) {
          errors.push({ row: row.rowNumber, field: 'date', code: 'DATE_OUTSIDE_PARENT_TASK', message: 'Thời gian công việc con nằm ngoài thời gian công việc cha.' });
        }
      }
    }
  }

  const normalizedErrors = errors.map((e) => ({
    ...e,
    field: fieldLabel(e.field),
  }));

  return { valid: normalizedErrors.length === 0, errors: normalizedErrors };
}
