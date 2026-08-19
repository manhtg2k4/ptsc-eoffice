import { Injectable, Logger } from '@nestjs/common';
import { ConfigurationService } from 'src/view-config/configuration.service';
import { buildDocumentCriteriaHelper, parseSort } from 'src/documents/helpers/build.filter';

@Injectable()
export class LeadershipDutyScheduleQueryBuilder {
  private readonly logger = new Logger(LeadershipDutyScheduleQueryBuilder.name);

  buildCriteriaFromFilter(
    filter: any,
  ): Array<{ name: string; operator: string; value: string | string[] }> {
    if (!filter || typeof filter !== 'object') return [];

    const criteria: Array<{ name: string; operator: string; value: string | string[] }> = [];

    // isNumericString inline - tránh closure overhead trong loop lớn
    const isNum = (v: unknown): v is string =>
      typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v));

    for (const [key, value] of Object.entries(filter)) {
      if (value === undefined || value === null || value === '') continue;

      if (typeof value === 'object' && !Array.isArray(value)) {
        const val = value as { startDate?: string; endDate?: string; value?: string };

        if (val.startDate && val.endDate) {
          criteria.push({ name: key, operator: 'between', value: [String(val.startDate), String(val.endDate)] });
        } else if (val.startDate) {
          criteria.push({ name: key, operator: 'gte', value: String(val.startDate) });
        } else if (val.endDate) {
          criteria.push({ name: key, operator: 'lte', value: String(val.endDate) });
        } else if (val.value !== undefined && val.value !== null && val.value !== '') {
          const v = String(val.value);
          criteria.push({ name: key, operator: isNum(v) ? 'like_or_eq' : 'like', value: v });
        }
        continue;
      }

      if (typeof value === 'string') {
        criteria.push({ name: key, operator: isNum(value) ? 'like_or_eq' : 'like', value });
        continue;
      }

      criteria.push({ name: key, operator: 'eq', value: String(value) });
    }

    return criteria;
  }

  buildWhereClause(
    criteria: Array<{ name: string; operator: string; value: string | string[] }>,
    featureManagement: any,
    isListDynamic?: string,
  ): { whereClause: string; joins: string } {
    if (!criteria?.length) {
      // Fast-path: không có filter
      const where: string[] = ['lds.status = 1'];
      if (isListDynamic === 'false') where.unshift('lds.stage IN (1, 4)');
      return { whereClause: 'WHERE ' + where.join(' AND '), joins: '' };
    }

    const participantCriteria = criteria.find(c => c.name === 'createdBy');
    const monthCriteria = criteria.find(c => c.name === 'month');

    const newCriteria = criteria.filter(c => c.name !== 'createdBy' && c.name !== 'month');

    const { sql: filterFeature, joins: filterJoins } =
      buildDocumentCriteriaHelper(newCriteria, 'lds', featureManagement);

    // Build Set một lần - O(fields) thay vì lọc lại trong điều kiện
    const textFieldSet = new Set<string>(
      featureManagement?.valueField?.field
        ?.filter((f: any) => f?.type === 'text')
        ?.map((f: any) => f.key) ?? [],
    );

    const where: string[] = [];
    let featureCondition = filterFeature ? `(${filterFeature})` : null;

    if (isListDynamic === 'false') where.push('lds.stage IN (1, 4)');
    where.push('lds.status = 1');

    // createdBy filter
    if (participantCriteria?.value) {
      const rawValue = Array.isArray(participantCriteria.value)
        ? participantCriteria.value[0]
        : participantCriteria.value;

      const value = String(rawValue ?? '').trim();

      if (value) {
        const safeValue = value.replace(/'/g, "''");

        if (textFieldSet.has('createdBy')) {
          const nameCondition = `
            EXISTS (
              SELECT 1
              FROM users u
              WHERE u.id = lds.created_by
                AND (
                  u.name COLLATE Vietnamese_CI_AI LIKE N'%${safeValue}%' ESCAPE '\\'
                  OR
                  TRANSLATE(
                    LOWER(u.name COLLATE Vietnamese_CI_AI),
                    N'àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ',
                    N'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
                  ) LIKE '%${safeValue.toLowerCase()}%' ESCAPE '\\'
                )
            )`;

          if (featureCondition) {
            where.push(`(${featureCondition} OR ${nameCondition})`);
            featureCondition = null;
          } else {
            where.push(nameCondition);
          }
        } else {
          const id = Number(value);
          if (!Number.isNaN(id) && id > 0) {
            where.push(`lds.created_by = ${id}`);
          }
        }
      }
    }

    // month filter
    if (monthCriteria?.value) {
      const month = Number(String(monthCriteria.value).trim());
      if (!Number.isNaN(month) && month >= 1 && month <= 12) {
        where.push(`(
          lds.from_date IS NOT NULL
          AND lds.to_date IS NOT NULL
          AND MONTH(lds.from_date) <= ${month}
          AND MONTH(lds.to_date) >= ${month}
        )`);
      }
    }

    if (featureCondition) where.unshift(featureCondition);

    return {
      whereClause: where.length ? 'WHERE ' + where.join(' AND ') : '',
      joins: filterJoins || '',
    };
  }

  async buildSelectFields(
    processFn: string,
    configurationService: ConfigurationService,
    featureManagement?: any,
  ): Promise<{ selectFields: string; aliases: Record<string, string> }> {
    const excludeKeys: string[] = [];
    const { dbKeys, aliases } = await configurationService.buildFilterFieldsMeetings(
      'lds',
      excludeKeys,
      processFn,
      featureManagement,
    );

    // Loại trừ các key không dùng và build fieldSet một lần
    const EXCLUDED = new Set(['lds.name', 'lds.note']);
    const REQUIRED = ['lds.created_at', 'lds.updated_at'];

    const fieldSet = new Set(dbKeys.filter(k => !EXCLUDED.has(k)));
    for (const f of REQUIRED) fieldSet.add(f);

    let baseFields = Array.from(fieldSet);
    const customClauses: string[] = [];

    if (baseFields.includes('lds.created_by')) {
      // Loại khỏi baseFields, thay bằng subquery
      baseFields = baseFields.filter(k => k !== 'lds.created_by');
      customClauses.push(`(SELECT u.name FROM users u WHERE u.id = lds.created_by) AS createdBy`);
      aliases.createdBy = 'createdBy';
    }

    // Các field chi tiết (name, note, details) sẽ được map trong JS để tránh slow subqueries
    aliases.name = 'name';
    aliases.note = 'note';
    aliases.details = 'details';
    aliases.createdAt ??= 'createdAt';
    aliases.updatedAt ??= 'updatedAt';

    const selectFields = [...baseFields, ...customClauses].join(', ');
    return { selectFields, aliases };
  }

  buildPagination(page: number, limit: number): { page: number; limit: number; offset: number } {
    const limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    return {
      page: pageNum,
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
    };
  }

  buildOrderBy(sort: any, aliases: Record<string, string>): string {
    let sortObj: Record<string, any> | undefined;
    try {
      sortObj = typeof sort === 'string' ? JSON.parse(sort) : sort;
    } catch {
      sortObj = undefined;
    }

    if (!sortObj || !Object.keys(sortObj).length) {
      return '[lds].[week] DESC';
    }

    const customColumns: Record<string, string> = {};
    if (sortObj.created_by !== undefined) {
      customColumns['created_by'] = `(SELECT TOP 1 u.name FROM users u WHERE u.id = lds.created_by)`;
    }

    return parseSort(sort, aliases, 'lds', customColumns);
  }
}