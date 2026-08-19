import { escapeLike } from "src/meeting/helper/build.meeting.filter";

// Xây dựng mảng tiêu chí lọc từ object filter
export function buildCriteria(
  filter: any
): Array<{ name: string; operator: string; value: any }> {
  const criteria: Array<{ name: string; operator: string; value: any }> = [];

  if (filter && typeof filter === 'object') {
    Object.entries(filter).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;

      // OBJECT CASE
      if (typeof value === 'object' && !Array.isArray(value)) {
        const val = value as any;

        // ✅ BETWEEN (date hoặc number)
        if (
          (val.startDate && val.endDate) ||
          (val.start !== undefined && val.end !== undefined)
        ) {
          criteria.push({
            name: key,
            operator: 'between',
            value: [
              String(val.startDate ?? val.start),
              String(val.endDate ?? val.end),
            ],
          });
          return;
        }

        // ✅ GTE
        if (val.startDate || val.start !== undefined) {
          criteria.push({
            name: key,
            operator: 'gte',
            value: String(val.startDate ?? val.start),
          });
          return;
        }

        // ✅ LTE
        if (val.endDate || val.end !== undefined) {
          criteria.push({
            name: key,
            operator: 'lte',
            value: String(val.endDate ?? val.end),
          });
          return;
        }

        // ✅ LIKE (object.value)
        if (val.value !== undefined && val.value !== null) {
          criteria.push({
            name: key,
            operator: 'like',
            value: String(val.value),
          });
          return;
        }
      }

      // ARRAY → IN
      if (Array.isArray(value)) {
        criteria.push({
          name: key,
          operator: 'in',
          value,
        });
        return;
      }

      // PRIMITIVE
      const operator = typeof value === 'string' ? 'like' : 'eq';

      criteria.push({
        name: key,
        operator,
        value: String(value),
      });
    });
  }

  return criteria;
}
export function buildVehicleRegistrationCriteriaHelper(
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

  const defaultColumns = new Set<string>([
    'id', 'name', 'request_type', 'priority', 'is_important_guest', 'passenger_count',
    'departure_time', 'return_time', 'departure_point', 'destination',
    'contact_person', 'contact_phone', 'total_people', 'purpose', 'notes', 'status',
    'bpmn_version', 'timezone', 'vehicle_state', 'status_code',
    'request_submitted_at', 'waiting_confirmed_at', 'created_at', 'updated_at',
    'department', 'trip_duration_minutes', 'driver_ids', 'car_ids',
    'coordination_information', 'created_by',
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

  const operatorMap: Record<string, string> = {
    eq: '=', neq: '!=', gt: '>', gte: '>=',
    lt: '<', lte: '<=', like: 'LIKE', in: 'IN', between: 'BETWEEN',
  };

  const grouped = criteria.reduce((acc, c) => {
    (acc[c.name] ||= []).push(c);
    return acc;
  }, {} as Record<string, any[]>);

  const toSnakeCase = (str: string) =>
    str.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);

  // TEXT FIELD CONFIG
  const textFieldSet = new Set(
    featureManagement?.valueField?.field
      ?.filter((f: any) => f.type === 'text')
      ?.map((f: any) => f.key)
  );

  // fallback để tránh config thiếu
  const TEXT_FALLBACK = new Set([
    'departure_point',
    'destination',
    'contact_person',
    'purpose',
  ]);

  // VN LIKE
  const VN_CHARS = 'àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ';
  const VN_CHARS_ASCII = 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd';

  const escape = (v: string) => v.replace(/'/g, "''");

  const buildLike = (field: string, value: string) => {
    const clean = value.trim();
    if (!clean) return '';
    return `(
      ${field} COLLATE Vietnamese_CI_AI LIKE N'%${escape(clean)}%'
    )`;
  };

  const textParts: string[] = [];
  const otherParts: string[] = [];
  const statusParts: string[] = [];

  const joinedTables = new Set<string>();
  let joins = '';

  Object.entries(grouped).forEach(([rawField, conditions]) => {
    let snakeField = toSnakeCase(rawField);

    const fieldAliasMap: Record<string, string> = {
      stage_status: 'meeting_state',
      document_date: 'meeting_date',
    };
    if (fieldAliasMap[snakeField]) {
      snakeField = fieldAliasMap[snakeField];
    }

    if (!defaultColumns.has(snakeField)) return;

    const tableAlias = fieldTableMap[rawField] || defaultTable;
    const field = `${tableAlias}.${snakeField}`;

    if (tableAlias !== defaultTable && !joinedTables.has(tableAlias)) {
      joins += ` ${joinMap[tableAlias]}`;
      joinedTables.add(tableAlias);
    }

    const isTextField =
      textFieldSet.has(rawField) ||
      textFieldSet.has(snakeField) ||
      TEXT_FALLBACK.has(snakeField);

    const subParts: string[] = [];

    for (const c of conditions as any[]) {
      const op = operatorMap[c.operator];
      if (!op) continue;

      // STATUS
      if (['status', 'status_code'].includes(rawField)) {
        subParts.push(`${field} = '${escape(String(c.value))}'`);
        continue;
      }

      // TEXT SEARCH (LIKE)
      if (c.operator === 'like' && typeof c.value === 'string') {
        const clean = c.value.trim();
        if (clean) {
          subParts.push(buildLike(field, clean));
        }
        continue;
      }

      // IN
      if (c.operator === 'in') {
        const list = (Array.isArray(c.value) ? c.value : [])
          .map(v => `'${escape(v)}'`)
          .join(',');
        subParts.push(`${field} IN (${list})`);
        continue;
      }

      // BETWEEN
      if (c.operator === 'between') {
        let [s, e] = c.value || [];
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += ' 00:00:00.000';
        if (/^\d{4}-\d{2}-\d{2}$/.test(e)) e += ' 23:59:59.997';
        subParts.push(`${field} >= '${s}' AND ${field} <= '${e}'`);
        continue;
      }
      if (
        typeof c.value === 'object' &&
        c.value !== null &&
        c.value.start !== undefined &&
        c.value.end !== undefined
      ) {
        subParts.push(`${field} >= '${c.value.start}' AND ${field} <= '${c.value.end}'`);
        continue;
      }
      // GTE / LTE with Date string YYYY-MM-DD
      if (c.operator === 'gte' && typeof c.value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.value)) {
        subParts.push(`${field} >= '${c.value} 00:00:00.000'`);
        continue;
      }
      if (c.operator === 'lte' && typeof c.value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.value)) {
        subParts.push(`${field} <= '${c.value} 23:59:59.997'`);
        continue;
      }
      // DEFAULT
      subParts.push(`${field} ${op} '${escape(String(c.value))}'`);
    }

    if (!subParts.length) return;

    // GROUP LOGIC
    if (['status', 'status_code'].includes(rawField)) {
      statusParts.push(`(${subParts.join(' OR ')})`);
    } else if (isTextField) {
      // 🔥 flatten để OR toàn bộ text fields
      subParts.forEach(p => textParts.push(p));
    } else {
      otherParts.push(`(${subParts.join(' OR ')})`);
    }
  });

  // TEXT = OR toàn bộ field
  const textCondition = textParts.length
    ? `(${textParts.join(' OR ')})`
    : '';

  const statusCondition = statusParts.join(' OR ');

  const filterParts = [...otherParts];
  if (textCondition) filterParts.push(textCondition);

  const filterCondition = filterParts.join(' AND ');

  const sql = [statusCondition, filterCondition]
    .filter(Boolean)
    .join(' AND ');

  return { statusCondition, filterCondition, sql, joins, from };
}

export function parseSortVehicle(
  sort: Record<string, any> | string | undefined,
  aliases: Record<string, string> = {},
  table: string = 'm',
  customColumns: Record<string, string> = {},
): string {
  if (!sort) return `[${table}].[created_at] DESC, [${table}].[updated_at] DESC`;

  const normalizeDir = (v: any): 'ASC' | 'DESC' => {
    if (v === 1 || v === '1' || v === 'asc' || v === 'ASC') return 'ASC';
    if (v === -1 || v === '-1' || v === 'desc' || v === 'DESC') return 'DESC';
    return 'DESC';
  };

  const orderBy: string[] = [];

  try {
    const sortObj: Record<string, any> =
      typeof sort === 'string' ? JSON.parse(sort) : sort;

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
  } catch {
    return `[${table}].[created_at] DESC, [${table}].[updated_at] DESC`;
  }

  return orderBy.length
    ? orderBy.join(', ')
    : `[${table}].[created_at] DESC, [${table}].[updated_at] DESC`;
}

export function parseSortVehiclev2(
  sort: Record<string, any> | string | undefined,
  aliases: Record<string, string> = {},
  table: string = 'm',
  customColumns: Record<string, string> = {},
  defaultSort: string = `[${table}].[created_at] DESC, [${table}].[updated_at] DESC`,
): string {
  const normalizeDir = (v: any): 'ASC' | 'DESC' => {
    if (v === 1 || v === '1' || v === 'asc' || v === 'ASC') return 'ASC';
    if (v === -1 || v === '-1' || v === 'desc' || v === 'DESC') return 'DESC';
    return 'DESC';
  };

  if (!sort) return defaultSort;

  const orderBy: string[] = [];

  try {
    const sortObj: Record<string, any> =
      typeof sort === 'string' ? JSON.parse(sort) : sort;

    for (const key in sortObj) {
      if (!Object.prototype.hasOwnProperty.call(sortObj, key)) continue;

      const column =
        Object.keys(aliases).find((k) => aliases[k] === key) || key;

      const dir = normalizeDir(sortObj[key]);

      if (customColumns[column]) {
        orderBy.push(`${customColumns[column]} ${dir}`);
        continue;
      }

      orderBy.push(`[${table}].[${column}] ${dir}`);
    }
  } catch {
    return defaultSort;
  }

  return orderBy.length ? orderBy.join(', ') : defaultSort;
}

export const VEHICLE_STATE_LABEL: Record<string, string> = {
  CHO_DIEU_PHOI: 'Chờ điều phối',
  DA_PHAN_CONG: 'Đã phân công',
  TRONG_TIEN_TRINH: 'Trong tiến trình',
  HOAN_THANH: 'Hoàn thành',
  TU_CHOI: 'Từ chối',
  DA_HUY: 'Đã hủy',
};
export function getVehicleStateLabel(code?: string | number): string {
  if (!code) return 'Không xác định';
  return VEHICLE_STATE_LABEL[String(code)] || 'Không xác định';
}
const VEHICLE_STATUS_STYLE: Record<string, string> = {
  'Chờ điều phối': 'border:1px solid #E5CB9A;background: #FEF9C2;color: #FFA600;',
  'Đã phân công': 'border:1px solid #619FFF;background: #E6F7FF;color: #0369A1;',
  'Trong tiến trình': 'border:1px solid #569FFF;background: #ACCBFF;color: #002089;',
  'Hoàn thành': 'border:1px solid #5D896A;background: #D0FFDE;color: #007222;',
  'Từ chối': 'border:1px solid #FF7878;background: #FFDCD9;color: #F44336;',
  'Đã hủy': 'border:1px solid #828282;background: #D1D1D1;color: #555555;',
};
function renderVehicleStatusHtml(status: string): string {

  const base = `
    display:flex;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    align-items:center;
    justify-content:center;
    width:100%;
    height:30px;
    padding:0 16px;
    font-weight:600;
    font-size:13px;
    border-radius:15px;
  `;

  const style = VEHICLE_STATUS_STYLE[status] || 'background:#f5f5f5;color:#666;';

  return `<div style="${base}${style}">${status}</div>`;
}
export function mapVehicleState(code?: string | number): string {
  const label = getVehicleStateLabel(code);
  return renderVehicleStatusHtml(label);
}
export function mapVehicleStateExport(code?: string | number): string {
  return getVehicleStateLabel(code);
}

function renderVehicleStatusBadge(status: string): string {
  const base = `
    display:inline-flex;
    align-items:center;
    justify-content:center;
    padding:2px 10px;
    font-weight:600;
    font-size:12px;
    border-radius:10px;
    white-space:nowrap;
  `;

  const style = VEHICLE_STATUS_STYLE[status] || 'background:#f5f5f5;color:#666;';

  return `<span style="${base}${style}">${status}</span>`;
}

export function mapVehicleStateBadge(code?: string | number): string {
  const label = getVehicleStateLabel(code);
  return renderVehicleStatusBadge(label);
}