import { Injectable } from '@nestjs/common';
import { buildDocumentCriteriaHelper, parseSort } from 'src/documents/helpers/build.filter';
import { ConfigurationService } from 'src/view-config/configuration.service';

@Injectable()
export class AmenitiesQueryBuilder {
  buildCriteriaFromFilter(filter: any): Array<{ name: string; operator: string; value: string | string[] }> {
    const criteria: Array<{ name: string; operator: string; value: string | string[] }> = [];
    if (!filter || typeof filter !== 'object') return criteria;

    Object.entries(filter).forEach(([key, value]) => {
      if (!value) return;

      if (typeof value === 'object') {
        const val = value as { startDate?: string; endDate?: string; value?: string };
        if (val.startDate && val.endDate) {
          criteria.push({ name: key, operator: 'between', value: [String(val.startDate), String(val.endDate)] });
        } else if (val.startDate) {
          criteria.push({ name: key, operator: 'gte', value: String(val.startDate) });
        } else if (val.endDate) {
          criteria.push({ name: key, operator: 'lte', value: String(val.endDate) });
        } else if (val.value !== undefined && val.value !== null) {
          criteria.push({ name: key, operator: 'like', value: String(val.value) });
        }
      } else {
        const operator = typeof value === 'string' ? 'like' : 'eq';
        criteria.push({ name: key, operator, value: String(value) });
      }
    });

    return criteria;
  }

  buildWhereClause(
    criteria: Array<{ name: string; operator: string; value: string | string[] }>,
    featureManagement: any,
  ): { whereClause: string; joins: string } {
    const { sql: filterFeature, joins: filterJoins } = buildDocumentCriteriaHelper(
      criteria,
      'amenities',
      featureManagement,
    );

    const where: string[] = [];
    if (filterFeature) where.push(`(${filterFeature})`);

    const whereClause = where.length
      ? ' WHERE ' + where.join(' AND ') + ' AND amenities.status != 3'
      : ' WHERE amenities.status != 3';

    return { whereClause, joins: filterJoins || '' };
  }

  async buildSelectFields(
    processFn: string,
    configurationService: ConfigurationService,
  ): Promise<{ selectFields: string; aliases: Record<string, string> }> {
    const excludeKeys = [];
    const { dbKeys, aliases } = await configurationService.buildFilterFieldsMeetings(
      'amenities',
      excludeKeys,
      processFn,
    );

    let selectFields: string;

    if (!processFn) {
      selectFields = dbKeys && dbKeys.length ? dbKeys.join(',') : 'id,name';
    } else {
      selectFields = dbKeys.join(',');
    }

    return { selectFields, aliases };
  }

  buildPagination(page: number, limit: number): { page: number; limit: number; offset: number } {
    const limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;

    return { page: pageNum, limit: limitNum, offset: offsetNum };
  }

  buildOrderBy(sort: any, aliases: Record<string, string>): string {
    return parseSort(sort, aliases, 'amenities');
  }
}