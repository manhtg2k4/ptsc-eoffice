
export const VEHICLE_STATE_LABEL: Record<string, string> = {
  1: 'Đang hoạt động',
  2: 'Ngừng hoạt động',
};
export function getVehicleStateLabel(code?: string | number): string {
  if (!code) return 'Không xác định';
  return VEHICLE_STATE_LABEL[String(code)] || 'Không xác định';
}
const VEHICLE_STATUS_STYLE: Record<string, string> = {
  'Đang hoạt động': 'border:1px solid #82B8FF;background: #DBEAFE;color: #0062AD;',
  'Ngừng hoạt động': 'border:1px solid #828282;background: #D1D1D1;color: #555555;',
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
    font-size:14px;
    border-radius:15px;
  `;

  const style = VEHICLE_STATUS_STYLE[status] || 'background:#f5f5f5;color:#666;';

  return `<div style="${base}${style}">${status}</div>`;
}
export function mapDriverVehicelState(code?: string | number): string {
  const label = getVehicleStateLabel(code);
  return renderVehicleStatusHtml(label);
}
export function mapDriverVehicelStateExport(code?: string | number): string {
  return getVehicleStateLabel(code);
}

export function buildDriverCriteriaHelper(
  criteria: any[],
  tableName: string,
  featureManagement?: any,
  joinOperator: 'AND' | 'OR' = 'AND',
): {
  statusCondition: string;
  filterCondition: string;
  sql: string;
  joins?: string;
  from: string;
} {

  const from = tableName;
  const table = tableName;

  /** ---------------- FIELD TYPE MAP ---------------- */

  const fieldTypeMap = new Map<string, string>();

  const fields =
    featureManagement?.valueField?.field ||
    featureManagement?.field ||
    [];

  fields.forEach((f: any) => {
    fieldTypeMap.set(f.key, f.type);
  });

  /** ---------------- HELPERS ---------------- */

  const operatorMap: Record<string, string> = {
    eq: '=',
    neq: '!=',
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<=',
  };

  const toSnakeCase = (str: string) =>
    str.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);

  const escapeSql = (v: any) =>
    String(v).replace(/'/g, "''");

  const buildLike = (field: string, keyword: string) => {
    const clean = escapeSql(keyword.trim());
    if (!clean) return '';
    return `${field} COLLATE Vietnamese_CI_AI LIKE N'%${clean}%'`;
  };

  /** ---------------- GROUP CRITERIA ---------------- */

  const grouped = criteria.reduce((acc, c) => {
    (acc[c.name] ||= []).push(c);
    return acc;
  }, {} as Record<string, any[]>);

  const conditions: string[] = [];
  const textSearchParts: string[] = [];

  /** ---------------- BUILD CONDITIONS ---------------- */

  for (const [rawField, fieldConditions] of Object.entries(grouped)) {

    const snakeField = toSnakeCase(rawField);
    const field = `${table}.${snakeField}`;
    const fieldType = fieldTypeMap.get(rawField);

    const subParts: string[] = [];

    for (const c of fieldConditions as any[]) {

      const value = c.value;

      /** -------- TEXT SEARCH -------- */

      if (fieldType === 'text') {

        const likeSql = buildLike(field, value);

        if (likeSql) {
          textSearchParts.push(likeSql);
        }

        continue;
      }

      /** -------- ENUM -------- */

      if (fieldType === 'enum') {

        if (value !== undefined && value !== null) {

          subParts.push(
            `${field} = N'${escapeSql(value)}'`,
          );
        }

        continue;
      }

      /** -------- NUMBER RANGE -------- */

      if (fieldType === 'numberRange') {

        if (Array.isArray(value)) {

          const [start, end] = value;

          if (start !== undefined && end !== undefined) {
            subParts.push(
              `${field} BETWEEN ${Number(start)} AND ${Number(end)}`,
            );
          }

        } else {

          const op = operatorMap[c.operator];

          if (op && value !== undefined) {
            subParts.push(
              `${field} ${op} ${Number(value)}`,
            );
          }

        }

        continue;
      }

      /** -------- DATE RANGE -------- */

      if (fieldType === 'date') {

        if (Array.isArray(value)) {

          let [start, end] = value;

          if (start && end) {

            if (/^\d{4}-\d{2}-\d{2}$/.test(start))
              start += ' 00:00:00';

            if (/^\d{4}-\d{2}-\d{2}$/.test(end))
              end += ' 23:59:59';

            subParts.push(
              `${field} BETWEEN '${start}' AND '${end}'`,
            );
          }
        }

        continue;
      }

      /** -------- DEFAULT LIKE -------- */

      if (c.operator === 'like') {

        subParts.push(
          `${field} LIKE N'%${escapeSql(value)}%'`,
        );

        continue;
      }

      /** -------- DEFAULT STRING / NUMBER -------- */

      const op = operatorMap[c.operator] || '=';

      if (!isNaN(Number(value))) {

        subParts.push(
          `${field} ${op} ${Number(value)}`,
        );

      } else {

        subParts.push(
          `${field} ${op} N'${escapeSql(value)}'`,
        );
      }
    }

    if (subParts.length) {
      conditions.push(`(${subParts.join(' AND ')})`);
    }
  }

  /** ---------------- TEXT SEARCH GROUP (OR) ---------------- */

  if (textSearchParts.length) {
    conditions.push(`(${textSearchParts.join(' OR ')})`);
  }

  /** ---------------- FINAL SQL ---------------- */

  const sql = conditions.join(` ${joinOperator} `);

  return {
    statusCondition: '',
    filterCondition: sql,
    sql,
    joins: '',
    from,
  };
}