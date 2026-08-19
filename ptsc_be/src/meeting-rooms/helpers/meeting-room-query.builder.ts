import { Injectable } from '@nestjs/common';
import { buildDocumentCriteriaHelper, parseSort } from 'src/documents/helpers/build.filter';
import { ConfigurationService } from 'src/view-config/configuration.service';
import { getMssqlPool } from 'src/database/mssql.pool';
import { ConfigService } from '@nestjs/config';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';

/**
 * Query Builder: build các clause của SQL
 * - Build WHERE
 * - Build JOIN
 * - Build SELECT
 * - Build ORDER BY
 * - Build PAGINATION
 */
@Injectable()
export class MeetingRoomQueryBuilder {
  constructor(private readonly configService: ConfigService) { }
  /**
   * Build criteria từ filter object
   */
  buildCriteriaFromFilter(
    filter: Record<string, unknown>
  ): Array<{ name: string; operator: string; value: string | string[] }> {
    const NUMERIC_FIELDS = new Set([
      'capacity',
      'totalSeating',
    ]);
    const criteria: Array<{ name: string; operator: string; value: string | string[] }> = [];
    if (!filter || typeof filter !== 'object') return criteria;

    const isNumericString = (v: unknown): v is string =>
      typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v));

    Object.entries(filter).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;

      const isNumericField = NUMERIC_FIELDS.has(key);

      // ---- object filter (range, value wrapper)
      if (typeof value === 'object' && !Array.isArray(value)) {
        const val = value as { startDate?: string; endDate?: string; value?: string };

        if (val.startDate && val.endDate) {
          criteria.push({
            name: key,
            operator: 'between',
            value: [String(val.startDate), String(val.endDate)],
          });
          return;
        }

        if (val.startDate) {
          criteria.push({ name: key, operator: 'gte', value: String(val.startDate) });
          return;
        }

        if (val.endDate) {
          criteria.push({ name: key, operator: 'lte', value: String(val.endDate) });
          return;
        }

        if (val.value !== undefined && val.value !== null && val.value !== '') {
          const v = String(val.value);

          if (isNumericField) {
            criteria.push({ name: key, operator: 'eq', value: v });
          } else if (isNumericString(v)) {
            criteria.push({ name: key, operator: 'like_or_eq', value: v });
          } else {
            criteria.push({ name: key, operator: 'like', value: v });
          }
        }
        return;
      }

      // ---- primitive value
      if (typeof value === 'string') {
        if (isNumericField) {
          criteria.push({ name: key, operator: 'eq', value });
        } else if (isNumericString(value)) {
          criteria.push({ name: key, operator: 'like_or_eq', value });
        } else {
          criteria.push({ name: key, operator: 'like', value });
        }
        return;
      }

      criteria.push({ name: key, operator: 'eq', value: String(value) });
    });

    return criteria;
  }

  /**
   * Build WHERE clause + JOIN từ criteria
   */
  buildWhereClause(
    criteria: Array<{ name: string; operator: string; value: string | string[] }>,
    featureManagement: FeatureManagementEntity | null,
    isListDynamic?: string,
  ): { whereClause: string; joins: string } {
    const amenitiesCriteria = criteria.filter(c => c.name === 'amenities');
    const newCriteria = criteria.filter(c => c.name !== 'amenities');
    const { sql: filterFeature, joins: filterJoins } =
      buildDocumentCriteriaHelper(
        newCriteria,
        'meeting_rooms',
        featureManagement,
      );
    const valueField = featureManagement?.valueField as { field?: Array<{ type?: string; key?: string }> } | undefined;
    const textFieldSet = new Set(
      valueField?.field
        ?.filter((f: { type?: string; key?: string }) => f.type === "text")
        ?.map((f: { type?: string; key?: string }) => f.key)
    );
    const where: string[] = [];

    if (amenitiesCriteria.length > 0) {
      const rawValue = amenitiesCriteria[0].value;
      const ids = Array.isArray(rawValue)
        ? rawValue.filter(Boolean)
        : rawValue
          ? [rawValue]
          : [];
      const isAdvanced = textFieldSet.has('amenities') || isListDynamic === 'false';
      // ===== NÂNG CAO: filter theo ID, AND =====
      if (!isAdvanced && ids.length > 0) {
        const safeIds = ids.map(id => `'${id.replace(/'/g, "''")}'`).join(', ');

        const amenitiesSql = `
          EXISTS (
            SELECT 1
            FROM meeting_rooms_amenities mra
            WHERE mra.meeting_room_id = meeting_rooms.id
              AND mra.amenity_id IN (${safeIds})
          )
        `;
        if (filterFeature) {
          where.push(`(${filterFeature})`);
        }
        where.push(amenitiesSql);
      }
      // ===== KHÔNG NÂNG CAO: search theo NAME, OR =====
      if (isAdvanced) {
        const value = typeof rawValue === 'string' ? rawValue : rawValue?.[0];
        if (value) {
          const safeValue = value.replace(/'/g, "''");

          const amenitiesSql = `
            EXISTS (
              SELECT 1
              FROM meeting_rooms_amenities mra
              JOIN amenities a ON a.id = mra.amenity_id
              WHERE mra.meeting_room_id = meeting_rooms.id
                AND a.name COLLATE Latin1_General_CI_AI LIKE N'%${safeValue}%'
            )
          `;
          if (filterFeature) {
            where.push(`(${filterFeature} OR ${amenitiesSql})`);
          } else {
            where.push(amenitiesSql);
          }
        } else if (filterFeature) {
          where.push(`(${filterFeature})`);
        }
      }
    } else if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    if (isListDynamic === 'false') {
      where.push(`meeting_rooms.stage != 2`);
    }
    where.push('meeting_rooms.status = 1');

    const whereClause = ' WHERE ' + where.join(' AND ');

    return {
      whereClause,
      joins: filterJoins || '',
    };
  }

  /**
   * Build điều kiện check phòng trống (optimized)
   */
  buildAvailabilityCondition(
    startTime?: string,
    endTime?: string,
  ): string {
    // 1. Luôn loại bỏ các phòng đang có trạng thái bận (stage 3, 4) nếu là list để chọn phòng
    let condition = ' AND meeting_rooms.stage NOT IN (3, 4) ';

    if (!startTime && !endTime) {
      return condition;
    }

    const start = startTime ? `'${startTime.replace(/'/g, "''")}'` : null;
    const end = endTime ? `'${endTime.replace(/'/g, "''")}'` : null;

    // Convert meeting_date + meeting_time → DATETIME
    const timeSep = `CHARINDEX('-', m.meeting_time)`;
    const sTime = `LTRIM(RTRIM(LEFT(m.meeting_time, ${timeSep} - 1)))`;
    const eTime = `LTRIM(RTRIM(SUBSTRING(m.meeting_time, ${timeSep} + 1, 8)))`;

    const scheduledStart = `CAST(CONCAT(m.meeting_date, ' ', ${sTime}) AS DATETIME)`;
    const scheduledEnd = `CAST(CONCAT(m.meeting_date, ' ', ${eTime}) AS DATETIME)`;

    let timeCondition = '';
    if (start && end) {
      timeCondition = `${scheduledStart} < ${end} AND ${scheduledEnd} > ${start}`;
    } else if (start) {
      timeCondition = `${scheduledEnd} > ${start}`;
    } else if (end) {
      timeCondition = `${scheduledStart} < ${end}`;
    }

    // Sử dụng LIKE để check ID trong CSV string
    condition += `
      AND NOT EXISTS (
        SELECT 1
        FROM meetings m
        WHERE (',' + CAST(m.room_ids AS VARCHAR(MAX)) + ',' LIKE '%,' + CAST(meeting_rooms.id AS VARCHAR(MAX)) + ',%')
          AND m.meeting_state IN ('DU_KIEN', 'CHUAN_BI', 'DANG_HOP')
          AND m.status != '3'
          AND NOT EXISTS (
            SELECT 1
            FROM (
              SELECT TOP 1 a.action_code
              FROM audit a WITH (NOLOCK)
              WHERE a.document_id = CAST(m.id AS NVARCHAR(64))
                AND a.type_document = 'Meeting'
              ORDER BY a.created_at DESC, a.id DESC
            ) latest_audit
            WHERE latest_audit.action_code = 'TU_CHOI_LICH'
          )
          AND ${timeCondition}
      )
    `;

    return condition.trim();
  }

  /**
   * Check room availability using the buildAvailabilityCondition
   */
  async checkRoomAvailability(roomId: string, startTime?: string, endTime?: string): Promise<boolean> {
    const pool = await getMssqlPool(this.configService);
    const condition = this.buildAvailabilityCondition(startTime, endTime);

    // meeting_rooms.id is roomId
    // we need to wrap the condition in a SELECT 1 FROM meeting_rooms WHERE id = ... AND ...
    const query = `
      SELECT TOP 1 1 as available
      FROM meeting_rooms
      WHERE id = '${roomId.replace(/'/g, "''")}'
      ${condition}
    `;

    const result = await pool.request().query(query);
    return result.recordset.length > 0;
  }

  /**
   * Build SELECT fields
   */
  async buildSelectFields(
    processFn: string,
    configurationService: ConfigurationService,
  ): Promise<{ selectFields: string; aliases: Record<string, string> }> {
    const excludeKeys = [];
    const { dbKeys, aliases } =
      await configurationService.buildFilterFieldsMeetings(
        'meeting_rooms',
        excludeKeys,
        processFn,
      );
    let normalizedDbKeys = dbKeys;
    let amenitiesSql = '';

    if (dbKeys.includes('meeting_rooms.amenities')) {
      amenitiesSql = `
        (
          SELECT STRING_AGG(a.name, ', ')
          FROM meeting_rooms_amenities mra
          JOIN amenities a ON a.id = mra.amenity_id
          WHERE mra.meeting_room_id = meeting_rooms.id
        ) AS amenities
      `;

      normalizedDbKeys = dbKeys.filter(
        k => k !== 'meeting_rooms.amenities',
      );
    }

    if (!normalizedDbKeys.includes('meeting_rooms.image') && !normalizedDbKeys.includes('image')) {
      normalizedDbKeys.push('meeting_rooms.image');
    }

    const selectFields = [
      ...normalizedDbKeys.map(k => {
        if (k === 'meeting_rooms.order') {
          return 'meeting_rooms.[order] AS [order]';
        }
        return k;
      }),
      ...(amenitiesSql ? [amenitiesSql] : []),
    ].join(',\n');

    return { selectFields, aliases };
  }


  /**
   * Build pagination
   */
  buildPagination(page: number, limit: number): { page: number; limit: number; offset: number } {
    const limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;

    return {
      page: pageNum,
      limit: limitNum,
      offset: offsetNum,
    };
  }

  /**
   * Build ORDER BY
   */
  buildOrderBy(sort: Record<string, unknown> | string | undefined, aliases: Record<string, string>): string {
    const sortToUse = sort || { order: 'asc', updated_at: 'desc' };
    const customColumns: Record<string, string> = {};
    let sortObj: Record<string, unknown> | undefined;
    try {
      sortObj = typeof sortToUse === 'string' ? JSON.parse(sortToUse) : (sortToUse as Record<string, unknown>);
    } catch {
      sortObj = undefined;
    }
    if (sortObj?.amenities !== undefined) {
      customColumns['amenities'] = `
        CASE
          WHEN (
            SELECT MIN(a.name)
            FROM meeting_rooms_amenities mra
            JOIN amenities a ON a.id = mra.amenity_id
            WHERE mra.meeting_room_id = meeting_rooms.id
          ) IS NULL THEN 1
          ELSE 0
        END,
        (
          SELECT MIN(a.name)
          FROM meeting_rooms_amenities mra
          JOIN amenities a ON a.id = mra.amenity_id
          WHERE mra.meeting_room_id = meeting_rooms.id
        )
      `;
    }

    return parseSort(sortToUse, aliases, 'meeting_rooms', customColumns);
  }
}