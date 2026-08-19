import { Injectable } from '@nestjs/common';
import {
  buildDocumentCriteriaHelper,
  parseSort,
} from 'src/documents/helpers/build.filter';
import { ConfigurationService } from 'src/view-config/configuration.service';

/**
 * Query Builder: Dynamic SQL query construction
 * - Build WHERE clause from criteria
 * - Build SELECT fields with joins
 * - Build ORDER BY with custom columns
 * - Build pagination
 */
@Injectable()
export class TravelWorkSchedulesQueryBuilder {
  /**
   * Build criteria array from filter object
   */
  buildCriteriaFromFilter(filter: any): Array<{
    name: string;
    operator: string;
    value: string | string[];
  }> {
    const criteria: Array<{
      name: string;
      operator: string;
      value: string | string[];
    }> = [];

    if (!filter || typeof filter !== 'object') return criteria;

    Object.entries(filter).forEach(([key, value]) => {
      if (!value) return;

      if (typeof value === 'object') {
        const val = value as {
          startDate?: string;
          endDate?: string;
          value?: string;
        };

        // Date range
        if (val.startDate && val.endDate) {
          criteria.push({
            name: key,
            operator: 'between',
            value: [String(val.startDate), String(val.endDate)],
          });
        } else if (val.startDate) {
          criteria.push({
            name: key,
            operator: 'gte',
            value: String(val.startDate),
          });
        } else if (val.endDate) {
          criteria.push({
            name: key,
            operator: 'lte',
            value: String(val.endDate),
          });
        } else if (val.value !== undefined && val.value !== null) {
          criteria.push({
            name: key,
            operator: 'like',
            value: String(val.value),
          });
        }
      } else {
        // Simple value
        const operator = typeof value === 'string' ? 'like' : 'eq';
        criteria.push({
          name: key,
          operator,
          value: String(value),
        });
      }
    });

    return criteria;
  }

  /**
   * Build WHERE clause and JOIN from criteria
   */
  buildWhereClause(
    criteria: Array<{
      name: string;
      operator: string;
      value: string | string[];
    }>,
    featureManagement: any,
  ): { whereClause: string; joins: string } {
    const specialFilters = {
      leader: undefined as string | undefined,
      createdBy: undefined as string | undefined,
      location: undefined as string | undefined,
    };
    const normalCriteria = criteria.filter((c) => {
      if (c.name === 'leader') {
        specialFilters.leader = String(c.value);
        return false;
      }
      if (c.name === 'createdBy') {
        specialFilters.createdBy = String(c.value);
        return false;
      }
      if (c.name === 'location') {
        specialFilters.location = String(c.value);
        return false;
      }
      return true;
    });
    const { sql: featureSql, joins } = buildDocumentCriteriaHelper(
      normalCriteria,
      'tws',
      featureManagement,
    );
    const textFieldSet = new Set(
      featureManagement?.valueField?.field
        ?.filter((f: any) => f.type === "text")
        ?.map((f: any) => f.key)
    );
    const where: string[] = [];
    const textSearchConditions: string[] = [];

    // Check if all special filters have the same value
    const specialValues = [
      specialFilters.leader,
      specialFilters.createdBy,
      specialFilters.location,
    ].filter(Boolean);
    const allSameValue = specialValues.length > 1 && 
      specialValues.every(v => v === specialValues[0]);

    if (specialFilters.leader) {
      const safeLeader = specialFilters.leader.replace(/'/g, "''");
      const condition = ` EXISTS ( SELECT 1 FROM users u WHERE u.id = tws.leader AND (u.name LIKE N'%${safeLeader}%' OR u.id LIKE N'%${safeLeader}%') ) `;
      if (textFieldSet.has('leader') || allSameValue) {
        textSearchConditions.push(condition);
      } else {
        where.push(condition);
      }
    }
    if (specialFilters.createdBy) {
      const safeCreatedBy = specialFilters.createdBy.replace(/'/g, "''");
      const condition = ` EXISTS ( SELECT 1 FROM users u WHERE u.id = tws.created_by AND (u.name LIKE N'%${safeCreatedBy}%' OR u.id LIKE N'%${safeCreatedBy}%') ) `;
      if (textFieldSet.has('createdBy') || allSameValue) {
        textSearchConditions.push(condition);
      } else {
        where.push(condition);
      }
    }
    if (specialFilters.location) {
      const safeLocation = specialFilters.location.replace(/'/g, "''");
      const condition = ` tws.location LIKE N'%${safeLocation}%' `;
      if (textFieldSet.has('location') || allSameValue) {
        textSearchConditions.push(condition);
      } else {
        where.push(condition);
      }
    }
    if (textSearchConditions.length) {
      where.push(`(${textSearchConditions.join(' OR ')})`);
    }
    if (featureSql) {
      where.push(`(${featureSql})`);
    }
    where.push(`tws.status <> '3'`);
    return {
      whereClause: `WHERE ${where.join(' AND ')}`,
      joins: joins || '',
    };
  }

  /**
   * Build SELECT fields with subqueries for related data
   */
  async buildSelectFields(
    processFn: string,
    configurationService: ConfigurationService,
  ): Promise<{ selectFields: string; aliases: Record<string, string> }> {
    const { dbKeys, aliases } =
      await configurationService.buildFilterFieldsMeetings(
        'tws',
        [],
        processFn,
      );

    let leaderSql = '';
    let createdBySql = '';
    let normalizedKeys = dbKeys;

    // Build leader subquery
    if (dbKeys.includes('tws.leader')) {
      leaderSql = `
        (
          SELECT u.name
          FROM users u
          WHERE u.id = tws.leader
        ) AS leader
      `;
      normalizedKeys = normalizedKeys.filter((k) => k !== 'tws.leader');
    }

    // Build created_by subquery
    if (dbKeys.includes('tws.created_by')) {
      createdBySql = `
        (
          SELECT u.name
          FROM users u
          WHERE u.id = tws.created_by
        ) AS createdBy
      `;
      normalizedKeys = normalizedKeys.filter((k) => k !== 'tws.created_by');
    }

    const selectFields = [
      ...normalizedKeys,
      'tws.schedules',
      ...(leaderSql ? [leaderSql] : []),
      ...(createdBySql ? [createdBySql] : []),
    ].join(', ');

    return { selectFields, aliases };
  }

  /**
   * Build pagination with limits
   */
  buildPagination(page: number, limit: number) {
    const limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);

    return {
      page: pageNum,
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
    };
  }

  /**
   * Build ORDER BY clause with custom column sorting
   */
  buildOrderBy(sort: any, aliases: Record<string, string>): string {
    const customColumns: Record<string, string> = {};
    let sortObj: Record<string, any> | undefined;

    try {
      sortObj = typeof sort === 'string' ? JSON.parse(sort) : sort;
    } catch {
      sortObj = undefined;
    }

    // Custom sort for leader
    if (sortObj?.leader !== undefined) {
      customColumns['leader'] = `
        (SELECT TOP 1 u.name 
          FROM users u 
          WHERE u.id = tws.leader)
      `;
    }

    // Custom sort for created_by
    if (sortObj?.created_by !== undefined || sortObj?.createdBy !== undefined) {
      customColumns['created_by'] = `
        (SELECT TOP 1 u.name 
          FROM users u 
          WHERE u.id = tws.created_by)
      `;
      customColumns['createdBy'] = customColumns['created_by'];
    }

    // Custom sort for workDate (handle NULL values)
    if (sortObj?.work_date !== undefined || sortObj?.workDate !== undefined) {
      customColumns['work_date'] = `
        CASE WHEN tws.work_date IS NULL THEN 1 ELSE 0 END,
        tws.work_date
      `;
      customColumns['workDate'] = customColumns['work_date'];
    }

    // Custom sort for fromDate (handle NULL values)
    if (sortObj?.from_date !== undefined || sortObj?.fromDate !== undefined) {
      customColumns['from_date'] = `
        CASE WHEN tws.from_date IS NULL THEN 1 ELSE 0 END,
        tws.from_date
      `;
      customColumns['fromDate'] = customColumns['from_date'];
    }

    return parseSort(sort, aliases, 'tws', customColumns);
  }
}