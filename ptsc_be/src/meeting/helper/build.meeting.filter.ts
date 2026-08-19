import { MEETING_STATE, MEETING_STATE_LABEL, MeetingDurationInfo } from "./meeting.mapper";
import * as dayjs from 'dayjs';
import * as timezone from 'dayjs/plugin/timezone';

dayjs.extend(timezone);
export interface StatusStyle {
  label: string;
  color: string;      // Màu nổi
  background: string; // Màu nền
}

export function escapeLike(str: string) {
  return str.replace(/([%_\\[\]])/g, '\\$1');
}

export function buildMeetingCriteriaHelper(
  criteria: any[],
  tableName: string,
  featureManagement?: any,
  leaderUserIds: string[] = [],
): {
  statusCondition: string;
  filterCondition: string;
  sql: string;
  joins?: string;
  from: string;
} {
  const defaultTable = tableName;
  const from = tableName;
  const meetingColumns = new Set<string>([
    'id', 'title', 'status_code', 'status', 'priority', 'meeting_type', 'meeting_mode', 'meeting_date', 'meeting_time', 'room_ids',
    'chairman_id', 'secretary_id', 'user_id', 'unit_id', 'online_meeting_id', 'meeting_link', 'platform', 'passcode',
    'content', 'document_name', 'conclusion', 'meeting_state', 'attendance_locked', 'started_at', 'ended_at', 'timezone',
    'bpmn_version', 'seat_number', 'direct_command', 'created_by', 'created_at', 'updated_at', 'meeting_title', 'is_company', 'organizational_unit'
  ]);

  const fieldTableMap: Record<string, string> = {
    platform: 'om', meeting_link: 'om', passcode: 'om',
    user_id: 'mp', seat_number: 'mp',
    unit_id: 'mu',
    content: 'mt', document_name: 'mt',
    receiver: 'a',
  };

  const joinMap: Record<string, string> = {
    om: `LEFT JOIN online_meetings om ON om.id = ${defaultTable}.online_meeting_id`,
    mp: `LEFT JOIN meeting_participants mp ON mp.meeting_id = ${defaultTable}.id`,
    mu: `LEFT JOIN meeting_units mu ON mu.meeting_id = ${defaultTable}.id`,
    mt: `LEFT JOIN meeting_tasks mt ON mt.meeting_id = ${defaultTable}.id`,
    a: `LEFT JOIN audit a ON a.document_id = CAST(${defaultTable}.id AS NVARCHAR(64))`,
  };

  const jsonStringFields = new Set<string>([]);
  const SPECIAL_FIELDS = new Set(['participationRole', 'delegatedFromUser', 'leaderState', 'participatingComponents']);

  const operatorMap: Record<string, string> = {
    eq: '=', neq: '!=', gt: '>', gte: '>=', gteq: '>=',
    lt: '<', lte: '<=', lteq: '<=', like: 'LIKE', in: 'IN', between: 'BETWEEN',
  };

  const grouped = criteria.reduce((acc, c) => {
    (acc[c.name] ||= []).push(c);
    return acc;
  }, {} as Record<string, any[]>);

  const textFieldSet = new Set(
    featureManagement?.valueField?.field?.filter((f: any) => f.type === 'text')?.map((f: any) => f.key)
  );

  const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);

  const VN_CHARS = 'àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ';
  const VN_CHARS_ASCII = 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd';
  const buildVnInsensitiveLike = (field: string, keyword: string) => {
    const clean = escapeLike(keyword.trim());
    if (!clean) return '';
    return `(
      ${field} COLLATE Vietnamese_CI_AI LIKE N'%${clean}%' ESCAPE '\\'
      OR TRANSLATE(LOWER(${field} COLLATE Vietnamese_CI_AI),N'${VN_CHARS}',N'${VN_CHARS_ASCII}') LIKE '%${clean.toLowerCase()}%' ESCAPE '\\'
    )`;
  };

  const textSubParts: string[] = [];
  const globalTextParts: string[] = [];
  const otherParts: string[] = [];
  const statusParts: string[] = [];
  const joinedTables = new Set<string>();
  let joins = '';

  Object.entries(grouped).forEach(([rawField, conditions]) => {
    if (['currentDate', 'currentMonth', 'currentWeek'].includes(rawField)) {
      for (const c of conditions as any[]) {
        if (rawField === 'currentDate' && c.value) {
          otherParts.push(`(${defaultTable}.meeting_date >= '${c.value} 00:00:00.000' AND ${defaultTable}.meeting_date <= '${c.value} 23:59:59.997')`);
        }
        if (rawField === 'currentMonth' && c.value) {
          const [y, m] = String(c.value).split('-').map(Number);

          if (y && m) {
            const lastDay = new Date(y, m, 0).getDate(); // lấy số ngày trong tháng

            const first = `${y}-${String(m).padStart(2, '0')}-01`;
            const last = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

            otherParts.push(`
              (
                CAST(${defaultTable}.meeting_date AS DATE)
                BETWEEN '${first}' AND '${last}'
              )
            `);
          }
        }
        if (rawField === 'currentWeek' && c.value?.startDate && c.value?.endDate) {
          const start = c.value.startDate;
          const end = c.value.endDate;

          otherParts.push(`
            (
              ${defaultTable}.meeting_date 
              BETWEEN '${start}' AND '${end}'
            )
          `);
        }
      }
      return;
    }
    if (rawField === 'participationRole') {
      for (const c of conditions as any[]) {
        const role = String(c.value);

        if (role === 'chutri') {
          otherParts.push(`
            (
              EXISTS (
                SELECT 1
                FROM meeting_units mu
                JOIN meeting_participants mp ON mp.meeting_unit_id = mu.id
                WHERE mu.meeting_id = ${defaultTable}.id
                  AND mp.user_id = @userId
                  AND mp.participant_role = 'CHAIRMAN'
              )
              OR ${defaultTable}.chairman_id = @userId
            )
          `);
        }

        if (role === 'thuky') {
          otherParts.push(`
            (
              EXISTS (
                SELECT 1
                FROM meeting_units mu
                JOIN meeting_participants mp ON mp.meeting_unit_id = mu.id
                WHERE mu.meeting_id = ${defaultTable}.id
                  AND mp.user_id = @userId
                  AND mp.participant_role = 'SECRETARY'
              )
              OR ${defaultTable}.secretary_id = @userId
            )
          `);
        }

        if (role === 'thamgia') {
          otherParts.push(`
            EXISTS (
              SELECT 1
              FROM meeting_units mu
              JOIN meeting_participants mp ON mp.meeting_unit_id = mu.id
              WHERE mu.meeting_id = ${defaultTable}.id
                AND mp.user_id = @userId
                AND (
                  mp.participant_role IS NULL
                  OR mp.participant_role NOT IN ('CHAIRMAN','SECRETARY')
                )
            )
          `);
        }
      }
      return;
    }

    // ===== Được ủy quyền cho =====
    if (rawField === 'delegatedFromUser') {
      for (const c of conditions as any[]) {
        const userId = String(c.value).replace(/'/g, "''");

        otherParts.push(`
          EXISTS (
            SELECT 1
            FROM meeting_units mu
            JOIN meeting_participants mp ON mp.meeting_unit_id = mu.id
            WHERE mu.meeting_id = ${defaultTable}.id
              AND mp.delegated_to_user_id = '${userId}'
          )
        `);
      }
      return;
    }

    // ===== leaderState =====
    if (rawField === 'leaderState') {
      const leaderIds = leaderUserIds || [];
      if (!leaderIds.length) return;

      const inList = leaderIds
        .map(id => `'${String(id).replace(/'/g, "''")}'`)
        .join(',');

      for (const c of conditions as any[]) {
        const state = String(c.value); // 'co' | 'khong'

        if (state === 'co') {
          otherParts.push(`
            (
              ${defaultTable}.chairman_id IN (${inList})
              OR ${defaultTable}.secretary_id IN (${inList})
              OR EXISTS (
                SELECT 1
                FROM meeting_units mu
                JOIN meeting_participants mp ON mp.meeting_unit_id = mu.id
                WHERE mu.meeting_id = ${defaultTable}.id
                  AND mp.user_id IN (${inList})
              )
            )
          `);
        }

        if (state === 'khong') {
          otherParts.push(`
            (
              (${defaultTable}.chairman_id IS NULL OR ${defaultTable}.chairman_id NOT IN (${inList}))
              AND (${defaultTable}.secretary_id IS NULL OR ${defaultTable}.secretary_id NOT IN (${inList}))
              AND NOT EXISTS (
                SELECT 1
                FROM meeting_units mu
                JOIN meeting_participants mp ON mp.meeting_unit_id = mu.id
                WHERE mu.meeting_id = ${defaultTable}.id
                  AND mp.user_id IN (${inList})
              )
            )
          `);
        }
      }
      return;
    }

    // ===== participatingComponents (unit tham gia) =====
    if (rawField === 'participatingComponents' || rawField === 'unitGuest') {
      for (const c of conditions as any[]) {
        const unitId = String(c.value).replace(/'/g, "''");

        otherParts.push(`
          EXISTS (
            SELECT 1
            FROM meeting_units mu
            WHERE mu.meeting_id = ${defaultTable}.id
              AND mu.unit_id = '${unitId}'
          )
        `);
      }
      return;
    }


    let snakeField = toSnakeCase(rawField);

    // Map frontend filter keys → actual DB column names
    const fieldAliasMap: Record<string, string> = {
      'stage_status': 'meeting_state',
      'document_date': 'meeting_date',
    };
    if (fieldAliasMap[snakeField]) {
      snakeField = fieldAliasMap[snakeField];
    }

    // documentType (loại lịch họp) → lọc trên is_company (bit)
    // COMPANY → is_company = 1, UNIT → is_company = 0
    if (snakeField === 'document_type') {
      for (const c of conditions as any[]) {
        if (!c.value) continue;
        const val = String(c.value).toUpperCase();
        if (val === 'COMPANY') {
          otherParts.push(`(${defaultTable}.is_company = 1)`);
        } else if (val === 'UNIT') {
          otherParts.push(`(${defaultTable}.is_company = 0)`);
        }
      }
      return;
    }

    if (!meetingColumns.has(snakeField)) return;

    const tableAlias = fieldTableMap[rawField] || defaultTable;
    const field = `${tableAlias}.${snakeField}`;

    if (tableAlias !== defaultTable && !joinedTables.has(tableAlias)) {
      joins += ` ${joinMap[tableAlias]}`;
      joinedTables.add(tableAlias);
    }

    const subParts: string[] = [];
    for (const c of conditions as any[]) {
      const op = operatorMap[c.operator];
      if (!op) continue;

      if (['status', 'status_code'].includes(rawField) && c.operator === 'eq') {
        subParts.push(`${field} = '${String(c.value).replace(/'/g, "''")}'`);
        continue;
      }

      if (typeof c.value === 'string' && !['status', 'status_code'].includes(rawField) && (textFieldSet.has(rawField) || ['title', 'meeting_title', 'conclusion'].includes(snakeField))) {
        const words = c.value.split(/\s+/).filter(Boolean);
        if (words.length) {
          subParts.push('(' + words.map(w => buildVnInsensitiveLike(field, w)).join(' AND ') + ')');
        }
        continue;
      }

      if (c.operator === 'in') {
        const list = (Array.isArray(c.value) ? c.value : []).map(v => `'${v}'`).join(',');
        subParts.push(`${field} IN (${list})`);
        continue;
      }

      if (c.operator === 'between') {
        let [s, e] = c.value || [];
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += ' 00:00:00.000';
        if (/^\d{4}-\d{2}-\d{2}$/.test(e)) e += ' 23:59:59.997';
        subParts.push(`${field} >= '${s}' AND ${field} <= '${e}'`);
        continue;
      }

      if (jsonStringFields.has(snakeField)) {
        subParts.push(`ISJSON(${field})=1 AND EXISTS (SELECT 1 FROM OPENJSON(${field}) WHERE value ${op} '${String(c.value).replace(/'/g, "''")}')`);
        continue;
      }
      if (snakeField === 'room_ids') {
        const value = String(c.value).replace(/'/g, "''");
        subParts.push(`
          (
            ${field} = '${value}'
            OR ${field} LIKE '${value},%'
            OR ${field} LIKE '%,${value}'
            OR ${field} LIKE '%,${value},%'
          )
        `);
        continue;
      }

      subParts.push(`${field} ${op} '${String(c.value).replace(/'/g, "''")}'`);
    }

    if (subParts.length > 0) {
      const combined = subParts.join(' OR ');
      if (['status', 'status_code'].includes(rawField)) {
        statusParts.push(`(${combined})`);
      } else if (['title', 'meeting_title', 'conclusion'].includes(snakeField)) {
        globalTextParts.push(combined);
      } else if (textFieldSet.has(rawField)) {
        textSubParts.push(combined);
      } else {
        otherParts.push(`(${combined})`);
      }
    }
  });

  const globalTextCondition = globalTextParts.length ? `(${globalTextParts.join(' OR ')})` : '';
  const textCondition = textSubParts.length ? `(${textSubParts.join(' AND ')})` : '';
  const statusCondition = statusParts.join(' OR ');
  const filterParts = [...otherParts];
  if (globalTextCondition) filterParts.push(globalTextCondition);
  if (textCondition) filterParts.push(textCondition);
  const filterCondition = filterParts.join(' AND ');
  const sql = [statusCondition, filterCondition].filter(Boolean).join(' AND ');

  return { statusCondition, filterCondition, sql, joins, from };
}

export function parseSortMeeting(
  sort: Record<string, any> | string | undefined,
  aliases: Record<string, string> = {},
  table: string = 'm',
  customColumns: Record<string, string> = {},
): string {
  // Ưu tiên sắp xếp theo thời gian cập nhật và tạo mới nhất
  const defaultSortParts = [
    `[${table}].[updated_at] DESC`,
    `[${table}].[created_at] DESC`,
  ];
  const defaultSort = defaultSortParts.join(', ');

  if (!sort) return defaultSort;

  const normalizeDir = (v: any): 'ASC' | 'DESC' => {
    if (v === 1 || v === '1' || v === 'asc' || v === 'ASC') return 'ASC';
    if (v === -1 || v === '-1' || v === 'desc' || v === 'DESC') return 'DESC';
    return 'DESC';
  };

  const orderBy: string[] = [];

  try {
    const sortObj: Record<string, any> =
      typeof sort === 'string' ? JSON.parse(sort) : sort;

    if (sortObj && typeof sortObj === 'object') {
      for (const key in sortObj) {
        if (!Object.prototype.hasOwnProperty.call(sortObj, key)) continue;

        const column =
          Object.keys(aliases).find(k => aliases[k] === key) || key;

        const dir = normalizeDir(sortObj[key]);

        if (customColumns[column]) {
          orderBy.push(`${customColumns[column]} ${dir}`);
          continue;
        }

        orderBy.push(`[${table}].[${column}] ${dir}`);
      }
    }
  } catch (e) {
    // Nếu parse lỗi thì dùng mặc định
    return defaultSort;
  }

  // Luôn thêm fallback là updated_at, created_at để đảm bảo "mới nhất" lên đầu nếu trùng các tiêu chí khác
  const finalSortParts = [...orderBy];
  
  // Kiểm tra xem đã có updated_at/created_at trong orderBy chưa để tránh lặp
  if (!orderBy.some(s => s.includes('updated_at'))) {
    finalSortParts.push(`[${table}].[updated_at] DESC`);
  }
  if (!orderBy.some(s => s.includes('created_at'))) {
    finalSortParts.push(`[${table}].[created_at] DESC`);
  }

  return finalSortParts.join(', ');
}

export function buildMeetingCustomSortColumns(
  tableAlias: string,
  leaderUserIds: string[],
): Record<string, string> {
  return {
    // 1️⃣ Tài liệu chuẩn bị (của participant hiện tại)
    documentPrepared: `
      (
        SELECT 
          ISNULL(SUM(CASE WHEN mt.is_document_prepared = 1 THEN 1 ELSE 0 END), 0)
        FROM meeting_tasks mt
        LEFT JOIN meeting_participants mp 
          ON mp.id = mt.attachable_id
          AND mt.attachable_type = 'PARTICIPANT'
        WHERE mt.meeting_id = ${tableAlias}.id
          AND mp.user_id = @userId
      )
    `,

    // 2️⃣ Thành phần tham gia (số đơn vị thực)
    participatingComponents: `
      (
        SELECT COUNT(*)
        FROM meeting_units mu
        WHERE mu.meeting_id = ${tableAlias}.id
          AND mu.unit_id NOT IN ('CHAIRMAN_UNIT','SECRETARY_UNIT')
      )
    `,

    // 3️⃣ Vai trò tham gia
    participationRole: `
      (
        CASE 
          WHEN ${tableAlias}.chairman_id = @userId THEN 1
          WHEN ${tableAlias}.secretary_id = @userId THEN 2
          ELSE 3
        END
      )
    `,

    // 4️⃣ Lãnh đạo tham gia
    leaderState: `
    (
      SELECT CASE 
        WHEN EXISTS (
          SELECT 1
          FROM meeting_participants mp
          JOIN meeting_units mu ON mu.id = mp.meeting_unit_id
          WHERE mu.meeting_id = ${tableAlias}.id
            AND mp.user_id IN (${leaderUserIds.map(id => `'${id}'`).join(',') || `'__NONE__'`})
        )
        THEN 1 ELSE 0
      END
    )
    `,

    // 5️⃣ Gán chỗ ngồi (assign_participants)
    seatAssignment: `
      (
        SELECT 
          ISNULL(SUM(CASE WHEN mu.assign_participants = 1 THEN 1 ELSE 0 END),0)
        FROM meeting_units mu
        WHERE mu.meeting_id = ${tableAlias}.id
      )
    `,
  };
}
export function normalizeDateValueDDMMYYYY(
  val?: string | number | Date | null
): string {
  if (!val) return "-";

  let d: Date;

  if (val instanceof Date) {
    d = val;
  } else if (typeof val === "number") {
    d = new Date(val);
  } else if (typeof val === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(val)) {
      d = new Date(val);
    }
    else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(val)) {
      d = new Date(val.replace(" ", "T"));
    }
    else {
      const m = val.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
      if (!m) return "-";
      let [, dd, mm, yyyy] = m;
      if (yyyy.length === 2) yyyy = +yyyy < 70 ? "20" + yyyy : "19" + yyyy;
      d = new Date(Date.UTC(+yyyy, +mm - 1, +dd));
    }
  } else {
    return "-";
  }

  if (isNaN(d.getTime())) return "-";

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();

  return `${dd}/${mm}/${yyyy}`;
}

export function normalizeDateValueHHmmDDMMYYYY(
  val?: string | number | Date | null
): string {
  if (!val) return "-";

  let d: Date;

  if (val instanceof Date) {
    d = val;
  } else if (typeof val === "number") {
    d = new Date(val);
  } else if (typeof val === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(val)) {
      d = new Date(val);
    }
    else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(val)) {
      d = new Date(val.replace(" ", "T"));
    }
    else {
      const m = val.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
      if (!m) return "-";
      let [, dd, mm, yyyy] = m;
      if (yyyy.length === 2) yyyy = +yyyy < 70 ? "20" + yyyy : "19" + yyyy;
      d = new Date(Date.UTC(+yyyy, +mm - 1, +dd));
    }
  } else {
    return "-";
  }

  if (isNaN(d.getTime())) return "-";

  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();

  return `${hh}:${mi} ${dd}/${mm}/${yyyy}`;
}

function renderStatusHtml(status: string): string {
  const s = status?.trim();
  const styleBase = `
    display:flex;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    align-items:center;
    justify-content:center;
    width:100%;
    height:30px;
    padding:0 16px;
    font-weight:700;
    font-size:14px;
    border-radius:15px;
  `;

  switch (s) {
    case 'Dự kiến':
      return `<div style="${styleBase} border:1px solid #69B1FF; background: #DBEAFE; color: #0062AD;">Dự kiến</div>`;

    case 'Chuẩn bị':
      return `<div style="${styleBase} border:1px solid #95E3B0; background: #D0FFDE;color: #007222;">Chuẩn bị</div>`;
    case 'Đang họp':
      return `<div style="${styleBase} border:1px solid #FFC069; background: #FEF9C2;color: #FFA600;">Đang họp</div>`;
    case 'Kết thúc':
      return `<div style="${styleBase} border:1px solid #BFBFBF; background: #E0E0E0;color: #555555;">Kết thúc</div>`;
    case 'Điều chỉnh':
      return `<div style="${styleBase} background: #ADECC0AB;color: #007222;">Điều chỉnh</div>`;
    case 'Dự thảo':
      return `<div style="${styleBase} background: #DBEAFE; color: #0062AD;">Dự thảo</div>`;
    case 'Hủy':
      return `<div style="${styleBase} border:1px solid #FF8F8F; background: #FFDCD9;color: #F44336;">Hủy</div>`;

    default:
      return `<div style="${styleBase} background:#fef9c2;color:#666;">${s || 'Không xác định'}</div>`;
  }
}

function renderStatusHtmlForSource(status: string): string {
  const s = status?.trim();
  const styleBase = `
    display:flex;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    align-items:center;
    justify-content:center;
    width:100%;
    height:30px;
    padding:0 16px;
    font-weight:700;
    font-size:14px;
    border-radius:15px;
  `;

  switch (s) {
    case 'Dự kiến':
      return `<div style="${styleBase} border:1px solid #abd0fe; background: #d0dff4; color: #0062ac;">Dự kiến</div>`;

    case 'Chuẩn bị':
      return `<div style="${styleBase} border:1px solid #95E3B0; background: #D0FFDE;color: #007222;">Chuẩn bị</div>`;
    case 'Đang họp':
      return `<div style="${styleBase} border:1px solid #fed88f; background: #fef9c2;color: #ffa600;">Đang họp</div>`;
    case 'Kết thúc':
      return `<div style="${styleBase} border:1px solid #acebc0; background: #d0ffdd;color: #027122;">Kết thúc</div>`;
    case 'Điều chỉnh':
      return `<div style="${styleBase} background: #ADECC0AB;color: #007222;">Điều chỉnh</div>`;
    case 'Dự thảo':
      return `<div style="${styleBase} background: #DBEAFE; color: #0062AD;">Dự thảo</div>`;
    case 'Hủy':
      return `<div style="${styleBase} border:1px solid #FF8F8F; background: #FFDCD9;color: #F44336;">Hủy</div>`;

    default:
      return `<div style="${styleBase} background:#fef9c2;color:#666;">${s || 'Không xác định'}</div>`;
  }
}

export function mapActionToLabel(code?: string): string {
  if (!code) return renderStatusHtml('Không xác định');
  const key = code.toUpperCase();

  switch (key) {
    case 'CHUAN_BI':
      return renderStatusHtml('Chuẩn bị');
    case 'DRAFT':
      return renderStatusHtml('Dự thảo');
    case 'DANG_HOP':
      return renderStatusHtml('Đang họp');
    case 'BAT_DAU':
      return renderStatusHtml('Đang họp');
    case 'KET_THUC':
      return renderStatusHtml('Kết thúc');
    case 'DIEU_CHINH':
      return renderStatusHtml('Điều chỉnh');

    case 'DU_KIEN':
      return renderStatusHtml('Dự kiến');

    case 'DA_HUY':
      return renderStatusHtml('Hủy');

    default:
      return renderStatusHtml('Dự kiến');
  }
}

export function mapActionToLabelForSource(code?: string): string {
  if (!code) return renderStatusHtmlForSource('Không xác định');
  const key = code.toUpperCase();

  switch (key) {
    case 'CHUAN_BI':
      return renderStatusHtmlForSource('Chuẩn bị');
    case 'DRAFT':
      return renderStatusHtmlForSource('Dự thảo');
    case 'DANG_HOP':
      return renderStatusHtmlForSource('Đang họp');
    case 'BAT_DAU':
      return renderStatusHtmlForSource('Đang họp');
    case 'KET_THUC':
      return renderStatusHtmlForSource('Kết thúc');
    case 'DIEU_CHINH':
      return renderStatusHtmlForSource('Điều chỉnh');

    case 'DU_KIEN':
      return renderStatusHtmlForSource('Dự kiến');

    case 'DA_HUY':
      return renderStatusHtmlForSource('Hủy');

    default:
      return renderStatusHtmlForSource('Dự kiến');
  }
}

export function mapActionToLabelExport(code?: string): string {
  if (!code) return 'Không xác định';
  const key = code.toUpperCase();

  switch (key) {
    case 'CHUAN_BI':
      return 'Chuẩn bị';
    case 'DRAFT':
      return 'Dự thảo';
    case 'DANG_HOP':
      return 'Đang họp';
    case 'KET_THUC':
      return 'Kết thúc';
    case 'DIEU_CHINH':
      return 'Điều chỉnh';

    case 'DU_KIEN':
      return 'Dự kiến';

    case 'DA_HUY':
      return 'Hủy';

    default:
      return 'Dự kiến';
  }
}

// Sửa lại hàm mapActionToLabel
export function mapActionToLabelMeetingHistory(code?: string): { status: string; color: string; background: string } {
  if (!code) {
    return {
      status: 'Dự kiến',
      color: '#0161ac',
      background: '#deebf4',
    };
  }
  const key = code.toUpperCase();
  switch (key) {
    case 'DU_KIEN':
      return {
        status: 'Dự kiến',
        color: '#0161ac',
        background: '#deebf4',
      };
    case 'CHUAN_BI':
      return {
        status: 'Chuẩn bị',
        color: '#1b8739',
        background: '#ddede2',
      };
    case 'DANG_HOP':
      return {
        status: 'Đang họp',
        color: '#ffa600',
        background: '#fff3dd',
      };
    case 'DA_KET_THUC':
      return {
        status: 'Kết thúc',
        color: '#555555',
        background: '#e9e9e9',
      };
    case 'KET_THUC':
      return {
        status: 'Kết thúc',
        color: '#555555',
        background: '#e9e9e9',
      };
    case 'DA_HUY':
      return {
        status: 'Huỷ',
        color: '#d54545',
        background: '#fae8e8',
      };
    default:
      return {
        status: 'Dự kiến',
        color: '#0161ac',
        background: '#deebf4',
      };
  }
}

export function mapActionToStatusStyle(code?: string): StatusStyle {
  if (!code) return DEFAULT_STATUS_STYLE;

  const key = code.toUpperCase();
  return MEETING_STATUS_STYLES[key] || DEFAULT_STATUS_STYLE;
}

export const MEETING_STATUS_STYLES: Record<string, StatusStyle> = {
  'DU_KIEN': {
    label: 'Dự kiến',
    color: '#1e40af',      // Xanh dương đậm
    background: '#dbeafe', // Xanh dương nhạt
  },
  'CHUAN_BI': {
    label: 'Chuẩn bị',
    color: '#15803d',      // Xanh lá đậm
    background: '#dcfce7', // Xanh lá nhạt
  },
  'DANG_HOP': {
    label: 'Đang họp',
    color: '#ffa600',      // Cam đậm
    background: '#fff3dd', // Cam nhạt
  },
  'BAT_DAU': {
    label: 'Đang họp',
    color: '#ffa600',      // Cam đậm
    background: '#fff3dd', // Cam nhạt
  },
  'KET_THUC': {
    label: 'Kết thúc',
    color: '#4b5563',      // Xám đậm
    background: '#f3f4f6', // Xám nhạt
  },
  'DA_HUY': {
    label: 'Hủy',
    color: '#991b1b',      // Đỏ đậm
    background: '#fee2e2', // Đỏ nhạt
  },
  'DRAFT': {
    label: 'Dự kiến',
    color: '#1e40af',
    background: '#dbeafe',
  },
  'HOAN_THANH': {
    label: 'Văn bản đã xử lý',
    color: '#4b5563',
    background: '#f3f4f6',
  },
  'CANCEL': {
    label: 'Hủy',
    color: '#991b1b',
    background: '#fee2e2',
  },
  'PENDING': {
    label: 'Chờ xử lý',
    color: '#92400e',      // Vàng nâu
    background: '#fef3c7', // Vàng nhạt
  },
  'IN_PROGRESS': {
    label: 'Đang xử lý',
    color: '#7c2d12',      // Cam nâu
    background: '#fed7aa', // Cam nhạt
  },
  'APPROVED': {
    label: 'Đã duyệt',
    color: '#065f46',      // Xanh lá đậm
    background: '#d1fae5', // Xanh lá nhạt
  },
  'REJECTED': {
    label: 'Từ chối',
    color: '#be123c',      // Đỏ hồng
    background: '#fce7f3', // Hồng nhạt
  },
};

const DEFAULT_STATUS_STYLE: StatusStyle = {
  label: 'Dự thảo',
  color: '#6b7280',
  background: '#f9fafb',
};

export const participantActions = [
  {
    code: 'THAM_GIA_LICH',
    label: 'Xác nhận tham gia',
    type: 'confirm_join',
    selectionMode: 'single'
  },
  {
    code: 'TU_CHOI_LICH',
    label: 'Từ chối tham gia',
    type: 'reject_join',
    selectionMode: 'single'
  },
];

export const processAcitonMeeting = [
  {
    code: 'XU_LY_LICH',
    label: 'Xử lý lịch',
    type: 'proccess_meeting',
    selectionMode: 'single',
  },
];

export function collectUserIds(
  chairman: any,
  secretary: any,
  units: any[] = [],
): string[] {
  const set = new Set<string>();

  if (chairman?.userId) {
    set.add(chairman.userId);
  }

  if (secretary?.userId) {
    set.add(secretary.userId);
  }

  for (const unit of units) {
    for (const p of unit.participants ?? []) {
      if (p.userId) {
        set.add(p.userId);
      }
    }
  }

  return Array.from(set);
}

export function collectSeats(
  units: any[] = [],
): { roomId: string; seatNumber: string }[] {
  const seats: { roomId: string; seatNumber: string }[] = [];

  for (const u of units) {
    for (const sp of u.sittingPosition ?? []) {
      for (const seat of sp.seatNumber ?? []) {
        if (sp.roomId && seat) {
          seats.push({
            roomId: sp.roomId,
            seatNumber: seat,
          });
        }
      }
    }
  }

  return seats;
}

export function formatDateVN(date: string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function parseMeetingTimeRange(meetingTime: string) {
  const [start, end] = meetingTime.split('-').map(t => t.trim());

  return {
    startTime: start, // "02:00"
    endTime: end,     // "09:00"
  };
}

export function getMeetingStartTime(
  meetingDate: string | Date,
  meetingTime: string,
  tz: string,
) {
  const { startTime } = parseMeetingTimeRange(meetingTime);

  const dateStr = typeof meetingDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(meetingDate)
    ? meetingDate
    : dayjs(meetingDate).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');

  return dayjs.tz(
    `${dateStr} ${startTime}`,
    'YYYY-MM-DD HH:mm',
    tz,
  );
}

export function getMeetingEndTime(
  meetingDate: string | Date,
  meetingTime: string,
  tz: string,
) {
  const { startTime, endTime } = parseMeetingTimeRange(meetingTime);

  const dateStr = typeof meetingDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(meetingDate)
    ? meetingDate
    : dayjs(meetingDate).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');

  const start = dayjs.tz(
    `${dateStr} ${startTime}`,
    'YYYY-MM-DD HH:mm',
    tz,
  );

  let end = dayjs.tz(
    `${dateStr} ${endTime}`,
    'YYYY-MM-DD HH:mm',
    tz,
  );

  // họp qua ngày (vd: 22:00-01:00)
  if (end.isBefore(start)) {
    end = end.add(1, 'day');
  }

  return end;
}

export function parseMeetingTime(
  meetingDate: string | Date,
  meetingTime: string,
): { start: Date; end: Date };

export function parseMeetingTime(
  meetingTime: string,
): { start: Date; end: Date };

export function parseMeetingTime(
  arg1: string | Date,
  arg2?: string,
) {
  let baseDate: Date;
  let timeRange: string;

  if (arg2) {
    baseDate = new Date(arg1);
    timeRange = arg2;
  } else {
    baseDate = new Date();
    timeRange = arg1 as string;
  }

  const [startStr, endStr] = timeRange.split('-');

  const [sh, sm] = startStr.split(':').map(Number);
  const [eh, em] = endStr.split(':').map(Number);

  const start = new Date(baseDate);
  start.setHours(sh, sm, 0, 0);

  const end = new Date(baseDate);
  end.setHours(eh, em, 0, 0);

  return { start, end };
}

export function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return `${h.toString().padStart(2, '0')}:${m
    .toString()
    .padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
export function calculateMeetingDuration(params: {
  meetingDate: string | Date;
  meetingTime: string;
  startedAt?: Date | null;
  endedAt?: Date | null;
  meetingState?: MEETING_STATE; // state lưu DB
  now?: Date;
}): MeetingDurationInfo {
  const {
    meetingDate,
    meetingTime,
    startedAt,
    endedAt,
    meetingState = MEETING_STATE.DU_KIEN,
    now = new Date(),
  } = params;

  // 1. Hủy → ưu tiên tuyệt đối
  if (meetingState === MEETING_STATE.DA_HUY) {
    return buildDuration(
      MEETING_STATE.DA_HUY,
      0,
      0,
      0,
      null as any,
      null as any,
    );
  }

  // Parse thời gian
  const parsedTime = parseMeetingTime(meetingDate, meetingTime);

  const actualStart = startedAt
    ? new Date(startedAt)
    : parsedTime.start;

  const actualEnd = endedAt
    ? new Date(endedAt)
    : parsedTime.end;

  const totalDurationMs = Math.max(
    0,
    actualEnd.getTime() - actualStart.getTime(),
  );

  // 2. ĐÃ KẾT THÚC (có endedAt hoặc state DB đã là kết thúc)
  if (endedAt || meetingState === MEETING_STATE.KET_THUC) {
    return buildDuration(
      MEETING_STATE.KET_THUC,
      totalDurationMs,
      totalDurationMs,
      0,
      actualStart,
      actualEnd,
    );
  }

  // 3. ĐANG HỌP (chỉ khi đã startedAt)
  if (startedAt) {
    const elapsedMs = Math.max(0, now.getTime() - actualStart.getTime());
    const remainingMs = Math.max(0, actualEnd.getTime() - now.getTime());

    return buildDuration(
      MEETING_STATE.DANG_HOP,
      totalDurationMs,
      elapsedMs,
      remainingMs,
      actualStart,
      actualEnd,
    );
  }

  // 4. CÒN LẠI → GIỮ NGUYÊN STATE DB
  return buildDuration(
    meetingState,
    totalDurationMs,
    0,
    totalDurationMs,
    actualStart,
    actualEnd,
  );
}

export function buildDuration(
  state: MEETING_STATE,
  totalMs: number,
  elapsedMs: number,
  remainingMs: number,
  actualStart: Date,
  actualEnd: Date,
): MeetingDurationInfo {
  return {
    state,
    stateLabel: MEETING_STATE_LABEL[state],
    totalMs,
    elapsedMs,
    remainingMs,
    elapsedTime: formatDuration(elapsedMs),
    remainingTime: formatDuration(remainingMs),
    actualStart,
    actualEnd,
  };
}


export function getAvailableActions({
  hasTrinhLich,
  isCreatedByMe,
  isMeetingApproved,
  isChairman,
  isSecretary,
  isMeetingNotApproved,
}: {
  hasTrinhLich: boolean;
  isCreatedByMe: boolean;
  isMeetingApproved: boolean;
  isChairman: boolean;
  isSecretary: boolean;
  isMeetingNotApproved: boolean;
}) {
  const canCancel = isCreatedByMe || isChairman || isSecretary;
  if (hasTrinhLich) {
    return [
      {
        code: 'SUA_LICH_HOP',
        type: 'edit_meeting',
        label: 'Chỉnh sửa',
        canExecute: true,
      },
    ];
  }

  if (!hasTrinhLich && isCreatedByMe && !isMeetingApproved && isMeetingNotApproved) {
    return [
      {
        code: 'THU_HOI_LICH',
        type: 'recall_meeting',
        label: 'Thu hồi',
        canExecute: true,
      },
    ];
  }

  if (!hasTrinhLich && canCancel && isMeetingApproved) {
    return [
      {
        code: 'SUA_LICH_HOP',
        type: 'edit_meeting',
        label: 'Chỉnh sửa',
        canExecute: true,
      },
      {
        code: 'HUY_LICH',
        type: 'cancel_meeting',
        label: 'Hủy lịch',
        canExecute: true,
      },
    ];
  }

  return [];
}


export function buildDocumentStatus(prepared: number, total: number) {
  // Không có tài liệu nào cần chuẩn bị
  if (total === 0) {
    return {
      color: '#2196F3',
      text: 'Không',
    };
  }

  // Chưa upload tài liệu nào
  if (prepared === 0) {
    return {
      color: '#FFA600',
      text: `${0/total}`,
    };
  }

  // Upload chưa đủ
  if (prepared < total) {
    return {
      color: '#FFA600',
      text: `${prepared}/${total}`,
    };
  }

  // Upload đủ
  return {
    color: '#2E7D32',
    text: `${prepared}/${total}`,
  };
};
export function formatMeetingDuration(v: string) {
  const m = v.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (!m) return v;

  const [_, start, end] = m;

  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const diff = toMinutes(end) - toMinutes(start);
  if (diff <= 0) return `${start} - ${end}`;

  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;

  const durationText =
    hours && minutes
      ? `${hours} giờ ${minutes} phút`
      : hours
        ? `${hours} giờ`
        : `${minutes} phút`;

  return `${start} - ${end}\n(${durationText})`;
};


export function buildDayKey(row: any) {
  const zone = row.timezone || 'Asia/Ho_Chi_Minh';

  const dateStr =
    typeof row.meeting_date === 'string'
      ? row.meeting_date
      : row.meeting_date.toISOString().slice(0, 10);

  const d = dayjs.tz(dateStr, zone);

  const date = d.format('YYYY-MM-DD');
  const dayName = d.format('dddd'); // Thứ hai, Thứ ba...

  return `${date} (${dayName})`;
}
export function isParticipantOwner(participant: any, userId: string) {
  if (!participant) return false;

  if (participant.userId === userId) return true;

  if (
    participant.assignmentType === 'DELEGATED' &&
    participant.delegatedToUserId === userId &&
    participant.delegationState === 'ACCEPTED'
  ) {
    return true;
  }

  return false;
}

export function calculateUnitSeatAssigned(units: any[]) {
  const validUnits = (units ?? []).filter(
    (u) =>
      u.unitId !== 'CHAIRMAN_UNIT' &&
      u.unitId !== 'SECRETARY_UNIT' &&
      u.isRoomSelected === true
  );

  const assignedUnits = validUnits.filter(
    (u) => u.seatParticipants === true // = 1
  );

  return {
    assigned: assignedUnits.length,
    total: validUnits.length,
    text: `${assignedUnits.length}/${validUnits.length}`,
  };
}
function toMinute(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function isOverlap(start1: string, end1: string, start2: string, end2: string) {
  return toMinute(start1) < toMinute(end2) &&
         toMinute(end1) > toMinute(start2);
}