import { escapeLike } from 'src/meeting/helper/build.meeting.filter';

export function buildArchiveRecordsCriteriaHelper(
  criteria: any[],
  tableName: string,
  featureManagement?: any,
  joinedAliases: string[] = [],
): {
  statusCondition: string;
  filterCondition: string;
  sql: string;
  joins?: string;
  from: string;
} {
  const defaultTable = tableName;
  const from = tableName;
  const tableNameOnly = tableName.split(/\s+/)[0];

  // ===== COLUMN REGISTRY THEO BẢNG =====
  const tableColumns: Record<string, Set<string>> = {
    archive_records: new Set([
      'id', 'title', 'category', 'file_code', 'related_department',
      'formation_year', 'retention_period', 'usage_mode', 'language',
      'start_date', 'end_date', 'notes', 'status', 'record_state',
      'created_at', 'updated_at'
    ]),

    archive_record_items: new Set([
      'id', 'archive_record_id', 'sort_order',
      'group_name', 'notes', 'created_at', 'status'
    ]),

    archive_record_item_files: new Set([
      'id', 'archive_record_item_id', 'file_id', 'created_at'
    ]),

    file_relations: new Set([
      'id', 'object_type', 'object_id', 'file_id',
      'status', 'is_certified_copy', 'created_at'
    ]),

    files: new Set([
      'id', 'file_name', 'file_path', 'mime_type', 'name',
      'file_size', 'description', 'is_directory',
      'created_at', 'updated_at', 'status', 'is_important'
    ]),
  };

  // ===== MAP FIELD → ALIAS =====
  const fieldTableMap: Record<string, string> = {
    group_name: 'ari',
    file_id: 'arif',
    object_type: 'fr',
    object_id: 'fr',
    file_name: 'f',
    name: 'f', // thêm dòng này
    year: 'yc',
    document_title: 'rd',
    document_symbol: 'rd',
    stage_status: 'a',
  };

  // ===== MAP ALIAS → TABLE =====
  const aliasTableMap: Record<string, string> = {
    ari: 'archive_record_items',
    arif: 'archive_record_item_files',
    fr: 'file_relations',
    f: 'files',
    yc: 'year_category',
    rd: 'record_document',
    a: 'audit',
  };

  // ===== JOIN MAP =====
  const joinMap: Record<string, string> = {
    ari: `LEFT JOIN archive_record_items ari ON ari.archive_record_id = ${defaultTable}.id`,
    arif: `LEFT JOIN archive_record_item_files arif ON arif.archive_record_item_id = ari.id`,
    fr: `LEFT JOIN file_relations fr ON fr.file_id = arif.file_id`,
    f: `LEFT JOIN files f ON f.id = arif.file_id`,
    yc: `LEFT JOIN year_category yc ON yc.year = ${defaultTable}.formation_year`,
    rd: `LEFT JOIN record_document rd ON rd.file_record_id = arif.file_id`,
    a: `LEFT JOIN audit a ON a.document_id = rd.id`,
  };

  const operatorMap: Record<string, string> = {
    eq: '=', neq: '!=', gt: '>', gte: '>=',
    lt: '<', lte: '<=', like: 'LIKE',
    in: 'IN', between: 'BETWEEN',
  };

  const grouped = (criteria || []).reduce((acc, c) => {
    (acc[c.name] ||= []).push(c);
    return acc;
  }, {} as Record<string, any[]>);

  const textFieldSet = new Set(
    featureManagement?.valueField?.field
      ?.filter((f: any) => f.type === 'text')
      ?.map((f: any) => f.key) || []
  );
  [
    'title', 'notes', 'file_name', 'description', 'name', 'file_code',
    'usage_mode', 'language', 'fileCode', 'usageMode', 'fileName'
  ].forEach(f => textFieldSet.add(f));

  const toSnakeCase = (str: string) =>
    str.replace(/([A-Z])/g, '_$1').toLowerCase();

  const VN_CHARS =
    'àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ';
  const VN_ASCII =
    'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd';

  const buildLike = (field: string, kw: string) => {
    const clean = escapeLike(kw.trim());
    if (!clean) return '';
    return `(
      ${field} COLLATE Vietnamese_CI_AI LIKE N'%${clean}%' ESCAPE '\\'
      OR TRANSLATE(LOWER(${field}),N'${VN_CHARS}',N'${VN_ASCII}')
         LIKE '%${clean.toLowerCase()}%'
    )`;
  };

  // Các cột kiểu INT/NUMERIC → không được dùng COLLATE hoặc LIKE
  const intColumns = new Set(['record_state', 'status', 'sort_order', 'file_size', 'is_directory', 'is_important', 'is_signed_file', 'is_certified_copy']);

  const textParts: string[] = [];
  const otherParts: string[] = [];
  const statusParts: string[] = [];
  const joined = new Set<string>(joinedAliases);
  let joins = '';

  Object.entries(grouped).forEach(([rawField, conditions]) => {
    const snake = toSnakeCase(rawField);

    let realColumn = snake;
    let tableAlias = fieldTableMap[rawField] || fieldTableMap[snake] || defaultTable;

    if (['startDate', 'endDate'].includes(rawField)) {
      if (joinedAliases.includes('f')) {
        realColumn = 'created_at';
        tableAlias = 'f';
      }
    }

    // search file name
    if (['name', 'title', 'fileName', 'file_name'].includes(rawField)) {
      realColumn = 'file_name';
      tableAlias = 'f';
    }
    const realTable =
      tableAlias === defaultTable
        ? tableNameOnly
        : aliasTableMap[tableAlias];

    const allowedColumns = tableColumns[realTable];
    if (!allowedColumns || !allowedColumns.has(realColumn)) {
      return;
    }


    const field = `${tableAlias}.${realColumn}`;

    // ===== JOIN DEPENDENCY RESOLVER =====
    const joinDependencies: Record<string, string[]> = {
      ari: [],
      arif: ['ari'],
      fr: ['ari', 'arif'],
      f: ['ari', 'arif'],
      rd: ['ari', 'arif'],
      a: ['ari', 'arif', 'rd'],
    };

    const addJoin = (alias: string) => {
      if (joined.has(alias) || alias === defaultTable) return;
      if (joinDependencies[alias]) {
        for (const dep of joinDependencies[alias]) {
          addJoin(dep);
        }
      }
      if (!joined.has(alias)) {
        joins += ` ${joinMap[alias] || ''}`;
        joined.add(alias);
      }
    };

    if (tableAlias !== defaultTable) {
      addJoin(tableAlias);
    }

    const sub: string[] = [];
    const isRecordState = rawField === 'record_state' || snake === 'record_state';
    for (const c of conditions as any[]) {
      const op = operatorMap[c.operator];
      if (!op) continue;
      if (['name', 'title', 'fileName'].includes(rawField)) {
        sub.push(`
          (
            ${buildLike(`${defaultTable}.title`, c.value)}
            OR ${buildLike('f.file_name', c.value)}
          )
        `);
        continue;
      }

      if (snake === 'related_department') {
        const value = String(c.value).replace(/'/g, "''");
        sub.push(`
          (
            ${field} = '${value}'
            OR ${field} LIKE '${value},%'
            OR ${field} LIKE '%,${value}'
            OR ${field} LIKE '%,${value},%'
          )
        `);
        continue;
      }
      if (
        typeof c.value === 'string' &&
        !intColumns.has(snake) &&
        (textFieldSet.has(snake) || textFieldSet.has(rawField))
      ) {
        const words = c.value.split(/\s+/).filter(Boolean);
        sub.push('(' + words.map(w => buildLike(field, w)).join(' AND ') + ')');
        continue;
      }
      if (isRecordState) {
        // Xử lý như số nguyên (không quote)
        if (c.operator === 'in' && Array.isArray(c.value)) {
          const list = c.value
            .map((v: any) => {
              const num = Number(v);
              return isNaN(num) ? null : num;
            })
            .filter((v): v is number => v !== null)
            .join(',');
          if (list) sub.push(`${field} IN (${list})`);
        } else if (c.operator === 'between') {
          const [s, e] = c.value || [];
          const start = Number(s);
          const end = Number(e);
          if (!isNaN(start) && !isNaN(end)) {
            sub.push(`${field} BETWEEN ${start} AND ${end}`);
          }
        } else {
          const val = Number(c.value);
          if (!isNaN(val)) {
            sub.push(`${field} ${op} ${val}`);
          }
        }
      } else {
        // Các trường khác giữ nguyên cách cũ (quote value)
        if (c.operator === 'in' && Array.isArray(c.value)) {
          const list = c.value
            .map((v: any) => `'${String(v).replace(/'/g, "''")}'`)
            .join(',');
          if (list) sub.push(`${field} IN (${list})`);
        } else if (c.operator === 'between') {
          const [s, e] = c.value || [];
          if (s && e) sub.push(`${field} >= '${s}' AND ${field} <= '${e}'`);
        } else {
          sub.push(`${field} ${op} '${String(c.value).replace(/'/g, "''")}'`);
        }
      }
    }

    if (sub.length) {
      const combined = sub.join(' OR ');
      if (['status', 'record_state', 'stage_status', 'recordState', 'stageStatus'].includes(rawField) || ['status', 'record_state', 'stage_status'].includes(snake)) {
        statusParts.push(`(${combined})`);
      } else if (textFieldSet.has(rawField) || textFieldSet.has(snake)) {
        textParts.push(combined);
      } else {
        otherParts.push(`(${combined})`);
      }
    }
  });

  const textCondition =
    textParts.length ? `(${textParts.join(' OR ')})` : '';

  // STATUS: OR
  const statusCondition =
    statusParts.length ? `(${statusParts.join(' OR ')})` : '';

  // FILTER THƯỜNG: AND
  const filterParts: string[] = [];

  if (otherParts.length) {
    filterParts.push(otherParts.join(' AND '));
  }

  if (textCondition) {
    filterParts.push(textCondition);
  }

  const filterCondition = filterParts.join(' AND ');

  // SQL FINAL
  const sql = [statusCondition, filterCondition]
    .filter(Boolean)
    .join(' AND ');

  return { statusCondition, filterCondition, sql, joins, from };
}

export function parseSortArchiveRecord(
  sort: Record<string, any> | string | undefined,
  aliases: Record<string, string> = {},
  table: string = 'ar',
  customColumns: Record<string, string> = {},
): string {
  if (!sort) return `[${table}].[updated_at] DESC`;

  const normalizeDir = (v: any): 'ASC' | 'DESC' =>
    v === 1 || v === 'asc' || v === 'ASC' ? 'ASC' : 'DESC';

  const orderBy: string[] = [];

  try {
    const sortObj = typeof sort === 'string' ? JSON.parse(sort) : sort;

    for (const key in sortObj) {
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
    return `[${table}].[updated_at] DESC`;
  }

  return orderBy.length
    ? orderBy.join(', ')
    : `[${table}].[updated_at] DESC`;
}


function renderArchiveStatusHtml(status: string): string {
  const s = status?.trim();

  const styleBase = `
    display:flex;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    align-items:center;
    justify-content:center;
    width:140px;
    min-width:140px;
    max-width:140px;
    height:30px;
    padding:0 16px;
    font-weight:700;
    font-size:14px;
    border-radius:15px;
  `;

  switch (s) {
    case 'Chưa mở':
      return `<div style="${styleBase} border:1px solid #AEB5BE; background: #E0E0E0; color: #666;">Chưa mở</div>`;

    case 'Đang thu thập':
      return `<div style="${styleBase} border:1px solid #69B1FF; background:#DBEAFE; color:#0062AD;">Đang thu thập</div>`;

    case 'Đã lưu trữ':
      return `<div style="${styleBase} border:1px solid #95E3B0; background:#D0FFDE; color:#007222;">Đã lưu trữ</div>`;

    case 'Đã tiêu hủy':
      return `<div style="${styleBase} border:1px solid #FFCCC7; background:#FFF1F0; color:#CF1322;">Đã tiêu hủy</div>`;

    default:
      return `<div style="${styleBase} background:#f5f5f5; color:#666;">${s || 'Không xác định'}</div>`;
  }
}
export function mapArchiveRecordState(code?: string | number): string {
  if (code === null || code === undefined)
    return renderArchiveStatusHtml('Không xác định');

  const key = String(code);

  switch (key) {
    case '0':
      return renderArchiveStatusHtml('Chưa mở ');

    case '1':
      return renderArchiveStatusHtml('Đang thu thập');

    case '2':
      return renderArchiveStatusHtml('Đã lưu trữ');

    case '3':
      return renderArchiveStatusHtml('Đã tiêu hủy');

    default:
      return renderArchiveStatusHtml('Không xác định');
  }
}
export function mapArchiveRecordStateExport(
  code?: string | number,
): string {
  if (code === null || code === undefined) return 'Không xác định';

  const key = String(code);

  switch (key) {
    case '0':
      return 'Chưa mở';

    case '1':
      return 'Đang thu thập';

    case '2':
      return 'Đã lưu trữ';

    case '3':
      return 'Đã tiêu hủy';
    default:
      return 'Không xác định';
  }
}
export function formatDMY(val: any) {
  if (!val) return '-';

  const d = new Date(val);
  if (isNaN(d.getTime())) return '-';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
};
