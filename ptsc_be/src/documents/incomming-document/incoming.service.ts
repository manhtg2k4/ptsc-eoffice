import { BadRequestException, ConflictException, ForbiddenException, forwardRef, HttpException, HttpStatus, Inject, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { getMssqlPool } from 'src/database/mssql.pool';
import { MSSQLRepository } from '../../database/sqlRepo.mssql';
import { GROUP_CODES, stageStatusDoc } from '../../variable/CONST_STATUS';
import { BookDocument, CRMItem, DocumentRow, OrgUnit, WorkItemRow } from './dto/recipients.dto';
import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { In, LessThanOrEqual, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { FeatureManagementEntity, StatusFeature } from 'src/feature-management/feature-management.entity';
import * as sql from 'mssql';
import { ExtendDeadlineDto, IncomingStatisticsByTimeDto, ListDocumentsDto, ListDocumentsNoTypeDto, ListDocumentsOverDueDto } from '../dto/list-documents.dto';
import { buildDocumentCriteriaHelper, buildDocumentCriteriaReplyEvictHelper, buildStatusCodeFilterClause, calcDeadlineColor, dateKeys, extractTextFromHtml, mapActionIncomingToLabel, mapActionToLabelCommon, mapDocKeys, normalizeDateValueDDMMYYYY, mapStatusDirectionLabel, normalizeDateValueHHmmDDMMYYYY, normalizeStatisticsFilterObject, parseSort, parseStatisticsFilter, parseStatisticsSort } from '../helpers/build.filter';
import BpmnEngineService from 'src/bpmn/bpmn-engine.service';
import { UsersService } from 'src/users/users.service';
import { FilesManagementService } from 'src/files-managerment/files-management-mssql.service';
import { ConfigurationService } from 'src/view-config/configuration.service';
import { Audit } from 'src/database/schema-sql/audit.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { DepartmentStatisticDto, StatisticReportResponseDto } from '../dto/statistic-report-response.dto';
import { StatisticReportQueryDto } from '../dto/statistic-report-query.dto';
import { OrganizationUnitService } from 'src/organization-unit/organization-unit_sql/organization-unit-service-sql';
import { StatisticReportSenderUnitQueryDto } from '../dto/statistic-report-sender-unit.dto';
import { DepartmentStatisticSenderUnitDto } from '../dto/statistic-report-sender-unit-response.dto';
import { CrmSourcesService } from 'src/crmsource/crmsource.service';
export enum IncomingDocGroup {
  CONG_VAN = 'Công văn',
  QUYET_DINH = 'Quyết định',
  THONG_BAO = 'Thông báo',
  BAO_CAO = 'Báo cáo',
  KHAC = 'Khác',
}
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { DOC_TYPE, VAN_THU_ALL } from 'src/variables/CONST_STATUS';
import { WorkItemsService } from 'src/work-items/work-items.service';
import { fileTypeFromBuffer } from 'file-type';
import * as path from 'path';
import Redis from 'ioredis';
import { FilesRepository } from 'src/files-managerment/repositories/files.repository';
import { GroupUserService } from 'src/group-users/group-users.service';
import { parseFlagsButton, getAllNodeExtensionProperties } from 'src/utils/util';
import { DocumentPolicy } from './policies/document.policy';
import { NotificationService } from 'src/notifycation/notification.service';
import { NotificationKey } from 'src/notifycation/notification.enum';
import { checkAdminPermission } from 'src/common/guards/admin-check.helper';
import { SpanStatusCode, trace } from '@opentelemetry/api';

type DataScope = 'ALL_CUC' | 'ALL_PHONG' | 'SELF';
const MAX_DATE = new Date('9999-12-31T23:59:59.997Z');

type BpmnCacheData = {
  process: any;
  indexes: any;
  bpmnXML?: string;
};

function deepClone<T>(value: T): T {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

@Injectable()
export class IncomingService {
  private pool: sql.ConnectionPool | null = null;
  private dbname: string;
  private readonly logger = new Logger(IncomingService.name);
  private readonly tracer = trace.getTracer('doffice-be.incoming-documents');

  private async traceMainProcessStep<T>(
    name: string,
    attributes: Record<string, string | number | boolean>,
    operation: () => Promise<T>,
    enabled = true,
  ): Promise<T> {
    if (!enabled) return operation();

    return this.tracer.startActiveSpan(name, { attributes }, async (span) => {
      try {
        return await operation();
      } catch (error) {
        span.recordException(error instanceof Error ? error : new Error(String(error)));
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }
  private readonly redisLookupInflight = new Map<string, Promise<any>>();
  private readonly inMemoryBpmnCache = new Map<string, BpmnCacheData>();
  private readonly LOOKUP_CACHE_TTL_SECONDS = 300;
  private readonly BPMN_CACHE_TTL_SECONDS = 86400;
  constructor(
    private readonly configService: ConfigService,
    @Inject('MSSQL_REPO') private readonly sqlRepo: MSSQLRepository,

    private readonly sqlsvRepo: SQLSVRepository,
    @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
    private readonly featureManagementRepo: Repository<FeatureManagementEntity>,
    private readonly bpmnEngine: BpmnEngineService,
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
    @Inject(forwardRef(() => FilesManagementService))
    private readonly fileService: FilesManagementService,
    private readonly configurationService: ConfigurationService,
    private readonly organizationUnitService: OrganizationUnitService,

    @InjectRepository(Audit, 'mssqlConnection')
    private readonly auditRepo: Repository<Audit>,

    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepo: Repository<UserEntity>,
    private readonly crmSourcesService: CrmSourcesService,

    @InjectRepository(RoleFeatureEntity, 'mssqlConnection')
    private readonly roleFeatureRepository: Repository<RoleFeatureEntity>,
    @Inject(forwardRef(() => WorkItemsService))
    private readonly workItemsService: WorkItemsService,
    private readonly filesRepository: FilesRepository,
    private readonly groupUserService: GroupUserService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
  ) { }

  private getDatabaseName(): string {
    const dbName = this.configService.get<string>('SQLSERVER_DATABASE');
    if (!dbName) throw new Error('SQLSERVER_DATABASE not defined in .env');
    return dbName;
  }

  private mapReceiverIds(list: any[], userContext: any, isAudit = false) {
    if (!Array.isArray(list)) return [];
    return list
      .filter((item: any) => {
        if (isAudit) {
          if (item.createdBy !== userContext?.userId || !item.details) return false;
          try {
            const detailsObj = typeof item.details === 'string' ? JSON.parse(item.details) : item.details;
            return detailsObj && detailsObj.phanCong === true && (!!item.receiver || !!item.receiverUnit || !!detailsObj.groupId);
          } catch {
            return false;
          }
        }
        return true;
      })
      .flatMap((item: any) => {
        const results: any[] = [];
        let groupId: string | undefined;
        let detailsObj: { groupId?: string; deadline?: unknown } | null = null;
        try {
          detailsObj = typeof item.details === 'string' ? JSON.parse(item.details) : item.details;
          if (detailsObj && detailsObj.groupId) {
            groupId = detailsObj.groupId;
          }
        } catch {
          // ignore
        }
        const deadline = item.deadline ?? detailsObj?.deadline ?? null;

        if (item.receiver) {
          results.push({ role: item.roleProcess, userId: item.receiver, deadline });
        }
        if (item.receiverUnit) {
          results.push({ role: item.roleProcess, organizationId: item.receiverUnit, deadline });
        }
        if (groupId) {
          results.push({ role: item.roleProcess, groupId, deadline });
        }
        return results;
      });
  }

  private filterUniqueReceiverIds(list: any[]) {
    const indexByKey = new Map<string, number>();
    const result: typeof list = [];
    list.forEach((item: { role?: string; userId?: string; organizationId?: string; groupId?: string }) => {
      const key = `${item.role || ''}_${item.userId || ''}_${item.organizationId || ''}_${item.groupId || ''}`;
      const existingIndex = indexByKey.get(key);
      if (existingIndex !== undefined) {
        const existingItem = result[existingIndex];
        result[existingIndex] = {
          ...existingItem,
          ...item,
          deadline: (item as { deadline?: unknown }).deadline
            ?? (existingItem as { deadline?: unknown }).deadline
            ?? null,
        };
        return;
      }
      indexByKey.set(key, result.length);
      result.push(item);
    });
    return result;
  }
  onModuleInit() {
    this.dbname = this.getDatabaseName();
  }

  async invalidateBpmnCaches(processKeys: string[]): Promise<void> {
    const normalizedKeys = [...new Set(
      (processKeys || [])
        .map((key) => String(key || '').trim())
        .filter(Boolean),
    )];

    if (!normalizedKeys.length) return;

    for (const key of normalizedKeys) {
      this.inMemoryBpmnCache.delete(key);
      this.inMemoryBpmnCache.delete(`bpmn_engine:${key}`);
    }

    if (this.cacheManager) {
      await Promise.all(
        normalizedKeys.map(async (key) => {
          try {
            await this.cacheManager.del(`bpmn_engine:${key}`);
          } catch {
            // ignore cache delete errors
          }
        }),
      );
    }

    if (this.redisClient) {
      await Promise.all(
        normalizedKeys.map(async (key) => {
          try {
            await this.redisClient.del(`bpmn_engine:${key}`);
          } catch {
            // ignore cache delete errors
          }
        }),
      );
    }
  }

  private async getRedisJson<T>(key: string, parser?: (raw: string) => T | null): Promise<T | null> {
    const inflight = this.redisLookupInflight.get(key);
    if (inflight) {
      return inflight as Promise<T | null>;
    }

    const pending = (async () => {
      try {
        const raw = await this.redisClient?.get(key);
        if (!raw) return null;
        return parser ? parser(raw) : JSON.parse(raw);
      } catch {
        return null;
      }
    })();

    this.redisLookupInflight.set(key, pending);
    try {
      return await pending;
    } finally {
      this.redisLookupInflight.delete(key);
    }
  }

  private async getRedisJsonBatch<T>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    const uniqueKeys = [...new Set(keys.filter(Boolean))];
    if (!uniqueKeys.length) return result;

    try {
      const rawValues = typeof this.redisClient?.mget === 'function'
        ? await this.redisClient.mget(...uniqueKeys)
        : await Promise.all(uniqueKeys.map((key) => this.redisClient?.get(key)));

      uniqueKeys.forEach((key, index) => {
        const raw = rawValues?.[index];
        if (!raw) return;
        try {
          result.set(key, JSON.parse(raw));
        } catch {
          // ignore malformed cache entry
        }
      });
    } catch {
      // ignore redis errors
    }

    return result;
  }

  private async setRedisJson(key: string, data: unknown, ttlSeconds = this.LOOKUP_CACHE_TTL_SECONDS): Promise<void> {
    try {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      await this.redisClient?.set(key, payload, 'EX', ttlSeconds);
    } catch {
      // ignore redis errors
    }
  }

  private async setRedisJsonBatch(entries: Array<{ key: string; data: unknown }>, ttlSeconds = this.LOOKUP_CACHE_TTL_SECONDS): Promise<void> {
    if (!entries.length) return;

    try {
      if (typeof this.redisClient?.multi === 'function') {
        const multi = this.redisClient.multi();
        for (const entry of entries) {
          if (entry?.key) {
            const payload = typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data);
            multi.set(entry.key, payload, 'EX', ttlSeconds);
          }
        }
        await multi.exec();
        return;
      }

      await Promise.all(
        entries
          .filter((entry) => entry?.key)
          .map((entry) => {
            const payload = typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data);
            return this.redisClient?.set(entry.key, payload, 'EX', ttlSeconds);
          }),
      );
    } catch {
      // ignore redis errors
    }
  }

  private buildLookupCacheKey(prefix: string, value: string): string {
    return `incoming:${prefix}:${String(value).trim().toLowerCase()}`;
  }

  private buildBpmnActionCacheKey(typeDoc: string, documentId: string, userId: string, nodeId: string): string {
    return `bpmn:actions:${typeDoc}:${documentId}:${userId}:${nodeId}`;
  }

  private isValidBpmnCacheData(data: any): data is BpmnCacheData {
    return !!(
      data?.process &&
      data?.indexes &&
      data.indexes.laneMap instanceof Map &&
      data.indexes.outgoingBySource instanceof Map &&
      data.indexes.nodes instanceof Map
    );
  }
  private async getPool(): Promise<sql.ConnectionPool> {
    // Nếu đã có pool instance thì trả về luôn
    if (this.pool && this.pool.connected) return this.pool;

    // Nếu chưa có thì tạo pool 1 lần
    this.pool = await getMssqlPool(this.configService);

    if (!this.pool.connected) {
      throw new Error('MSSQL pool not connected');
    }

    return this.pool;
  }

  /**
   * Lấy roles từ BPMN flows (luồng) cho user
   * @param userId - ID của user
   * @returns Mảng các roleCode từ BPMN flows mà user đã tham gia
   */
  private async getUserRolesFromBpmnFlows(userId: string): Promise<string[]> {
    try {
      const allRoles = new Set<string>();
      const pool = await this.getPool();

      // Bước 1: Lấy các bpmn_version mà user đã tham gia từ audit và work_items
      const bpmnVersionsQuery = `
        SELECT DISTINCT bpmn_version
        FROM (
          SELECT DISTINCT 
            COALESCE(
              (SELECT TOP 1 bpmn_version FROM ${this.dbname}.dbo.incomming_documents WHERE document_id = a.document_id),
              (SELECT TOP 1 bpmn_version FROM ${this.dbname}.dbo.outgoing_documents WHERE document_id = a.document_id)
            ) AS bpmn_version
          FROM ${this.dbname}.dbo.audit a
          WHERE (a.receiver = @userId OR a.user_id = @userId OR a.processed_by = @userId)
            AND a.document_id IS NOT NULL
          UNION
          SELECT DISTINCT bpmn_version
          FROM ${this.dbname}.dbo.work_items wi
          WHERE wi.assignee_user_id = @userId
            AND wi.bpmn_version IS NOT NULL
        ) combined
        WHERE bpmn_version IS NOT NULL
      `;

      const bpmnVersionsResult = await pool.request()
        .input('userId', sql.NVarChar, userId)
        .query(bpmnVersionsQuery);

      const bpmnVersions = (bpmnVersionsResult.recordset || [])
        .map(r => r.bpmn_version)
        .filter(Boolean);

      // Bước 2: Với mỗi bpmn_version (processKey), lấy roles từ role_feature
      if (bpmnVersions.length > 0) {
        const roleFeatures = await this.roleFeatureRepository.find({
          where: { processKey: In(bpmnVersions) },
          select: ['processKey', 'roles'],
        });

        for (const rf of roleFeatures) {
          if (rf.roles && Array.isArray(rf.roles)) {
            for (const roleObj of rf.roles) {
              if (roleObj?.users && Array.isArray(roleObj.users)) {
                const hasUser = roleObj.users.some((u: any) => String(u) === String(userId));
                if (hasUser && roleObj.roleCode) {
                  allRoles.add(roleObj.roleCode);
                }
              }
            }
          }
        }
      }

      return Array.from(allRoles);
    } catch (error) {
      this.logger.warn(`Could not fetch roles from BPMN flows for user ${userId}:`, error);
      return [];
    }
  }

  async incomingRecipients({ page = 1, limit = 20, userId, filter, sort, processFn, isExport, countOnly, skipActions, shouldLoadFiles = true }) {
    const start = Date.now();
    // this.logger.log(`[incomingRecipients] Starting search for user=${userId}, processFn=${processFn}, limit=${limit}, skipActions=${skipActions}`);

    // Normalize page/limit before building SQL pagination.
    const { pageNum, limitNum, offsetNum } = this.parsePagination(page, limit, isExport);
    const pool = await this.getPool();

    // ── Context: user roles + feature config + receiverUnit (parallel) ──
    const ctxStart = Date.now();
    // Load query context:
    // - user roles for output mapping,
    // - feature config by processFn,
    // - receiverUnit of current user.
    const { userContext, featureManagement, receiverUnit } = await this.getListContext(userId, processFn, pool);
    // this.logger.log(`[incomingRecipients] Context loaded in ${Date.now() - ctxStart}ms`);

    // Kiểm tra quyền admin
    const isAdmin = await checkAdminPermission(userId).catch(() => false);

    // ── Build WHERE ──
    // Build WHERE/JOIN from FE filter object and screen-level criteria.
    const { whereClause, joinClause } = this.buildRecipientsWhere(filter, featureManagement, userId, processFn, receiverUnit, isAdmin);

    // ── Build SELECT ──
    // Build dynamic select columns and ORDER BY for the current processFn.
    const { selectFields, aliases, orderBy } = await this.buildRecipientsSelect(processFn, userId, sort);

    const pagedOrderBy = orderBy
      .replace(/\[incomming_documents\]\./g, '')
      .replace(/incomming_documents\./g, '');

    // Dựng nhánh UserDocIds theo phân quyền Admin / User / Unit / View Group
    const unitBranchSql = (!isAdmin && receiverUnit)
      ? `SELECT d.document_id FROM ${this.dbname}.dbo.incomming_documents d WITH (NOLOCK) WHERE d.status = 1 AND d.receiver_unit = @receiverUnit`
      : `SELECT d.document_id FROM ${this.dbname}.dbo.incomming_documents d WITH (NOLOCK) WHERE 1=0`;

    const userDocIdsSql = isAdmin
      ? `SELECT d.document_id FROM ${this.dbname}.dbo.incomming_documents d WITH (NOLOCK) WHERE d.status = 1`
      : `
        -- Nhánh 1: Các văn bản phân công cá nhân
        SELECT DISTINCT ia.document_id
        FROM ${this.dbname}.dbo.incomming_assignment ia WITH (NOLOCK)
        WHERE ia.receiver = @userId
          AND (ia.role_process IS NULL OR ia.role_process <> 'viewer')

        UNION

        -- Nhánh 2: Các văn bản gửi đến ĐƠN VỊ NHẬN
        ${unitBranchSql}

        UNION

        -- Nhánh 3: Các văn bản thuộc Nhóm người xem (view_group)
        SELECT DISTINCT d.document_id
        FROM ${this.dbname}.dbo.incomming_documents d WITH (NOLOCK)
        WHERE d.status = 1
          AND d.view_group IS NOT NULL
          AND d.view_group <> ''
          AND EXISTS (
            SELECT 1
            FROM STRING_SPLIT(d.view_group, ',') s
            INNER JOIN ${this.dbname}.dbo.group_users gu_target WITH (NOLOCK)
              ON gu_target.code = LTRIM(RTRIM(s.value))
            WHERE
              EXISTS (
                SELECT 1
                FROM ${this.dbname}.dbo.user_group_users ugu WITH (NOLOCK)
                WHERE ugu.group_user_id = gu_target.id
                  AND ugu.user_id = @userId
              )
              OR EXISTS (
                SELECT 1
                FROM ${this.dbname}.dbo.user_group_users ugu_mgr WITH (NOLOCK)
                INNER JOIN ${this.dbname}.dbo.group_users gu_mgr WITH (NOLOCK)
                  ON gu_mgr.id = ugu_mgr.group_user_id
                WHERE ugu_mgr.user_id = @userId
                  AND gu_mgr.status = 5
                  AND gu_mgr.[order] IS NOT NULL
                  AND gu_target.status = 5
                  AND gu_target.[order] IS NOT NULL
                  AND gu_mgr.[order] <= gu_target.[order]
              )
          )
      `;

    // Early Pagination CTEs
    const filteredDocsCteSql = `
      WITH UserDocIds AS (
        ${userDocIdsSql}
      ),
      FilteredDocs AS (
        SELECT 
          incomming_documents.*,
          ROW_NUMBER() OVER (
            PARTITION BY ISNULL(incomming_documents.to_book, CAST(incomming_documents.document_id AS VARCHAR(50)))
            ORDER BY 
              CASE WHEN incomming_documents.parent_doc IS NULL THEN 0 ELSE 1 END,
              incomming_documents.document_id ASC
          ) AS rn_rank
        FROM UserDocIds u
        INNER JOIN ${this.dbname}.dbo.incomming_documents incomming_documents WITH (NOLOCK) 
          ON incomming_documents.document_id = u.document_id
        ${joinClause}
        ${whereClause}
        ${!isAdmin ? `AND NOT EXISTS (
          SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment excl_ia WITH (NOLOCK)
          WHERE excl_ia.document_id = incomming_documents.document_id
            AND excl_ia.receiver = @userId
            AND excl_ia.role_process = 'viewer'
        )` : ''}
      )
    `;

    const totalSql = `
      ${filteredDocsCteSql}
      SELECT COUNT(1) AS total FROM FilteredDocs WHERE rn_rank = 1;
    `;

    const dataSql = `
      ${filteredDocsCteSql},
      PagedDocIds AS (
        SELECT document_id
        FROM FilteredDocs
        WHERE rn_rank = 1
        ${pagedOrderBy}
        OFFSET @offsetNum ROWS FETCH NEXT @limitNum ROWS ONLY
      )
      SELECT 
        ${selectFields},
        incomming_documents.updated_at AS _updated_at,
        incomming_documents.parent_doc AS _parent_doc,
        incomming_documents.document_id AS _document_id,
        la.roleProcess,
        la.receiver,
        la.last_audit_id
      FROM PagedDocIds p
      INNER JOIN ${this.dbname}.dbo.incomming_documents incomming_documents WITH (NOLOCK)
        ON incomming_documents.document_id = p.document_id
      OUTER APPLY (
        SELECT TOP 1 
          ia.role_process AS roleProcess, 
          ia.receiver, 
          ia.last_audit_id
        FROM ${this.dbname}.dbo.incomming_assignment ia WITH (NOLOCK)
        WHERE ia.document_id = incomming_documents.document_id
          AND ia.receiver = @userId
        ORDER BY ia.last_audit_id DESC
      ) la
      LEFT JOIN ${this.dbname}.dbo.incomming_current_state af WITH (NOLOCK)
        ON af.document_id = incomming_documents.document_id
      ${orderBy};
    `;

    // ── Executing parameterized SQL queries ──
    const reqTotal = pool.request()
      .input('userId', sql.NVarChar, userId)
      .input('receiverUnit', sql.VarChar, receiverUnit || '')
      .input('offsetNum', sql.Int, offsetNum)
      .input('limitNum', sql.Int, limitNum);

    const reqData = pool.request()
      .input('userId', sql.NVarChar, userId)
      .input('receiverUnit', sql.VarChar, receiverUnit || '')
      .input('offsetNum', sql.Int, offsetNum)
      .input('limitNum', sql.Int, limitNum);

    // ── CountOnly shortcut ──
    if (countOnly === 'true') {
      const qStart = Date.now();
      const rs = await reqTotal.query(totalSql);
      // this.logger.log(`[incomingRecipients] CountOnly query executed in ${Date.now() - qStart}ms`);
      return { total: rs.recordset[0]?.total ?? 0 };
    }

    // ── COUNT + DATA song song ──
    const qStart = Date.now();
    const [totalResult, rowsResult] = await Promise.all([
      reqTotal.query(totalSql),
      reqData.query(dataSql),
    ]);
    // this.logger.log(`[incomingRecipients] SQL Queries (COUNT + DATA) executed in ${Date.now() - qStart}ms`);

    const total: number = totalResult.recordset[0]?.total ?? 0;
    const items: DocumentRow[] = rowsResult.recordset ?? [];

    if (!items.length) {
      // this.logger.log(`[incomingRecipients] No items found. Total time: ${Date.now() - start}ms`);
      return { items: [], total: 0, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum), isAdmin: isAdmin === true };
    }

    // ── Transform ──
    const tStart = Date.now();
    let detailedItemsMapped: any[];

    if (isExport === 'true') {
      // Export: bỏ toàn bộ BPMN / workflow mapping
      const expStart = Date.now();
      detailedItemsMapped = await this.mapDocKeysForExport(items, aliases, '', userContext, '');
      // this.logger.log(`[incomingRecipients] Export mapping done in ${Date.now() - expStart}ms`);
    } else {
      const keysStart = Date.now();
      detailedItemsMapped = await this.mapDocKeysForList(items, aliases, '', userContext, processFn, isExport);
      // this.logger.log(`[incomingRecipients] Doc keys for list mapped in ${Date.now() - keysStart}ms`);
    }

    if (isAdmin && detailedItemsMapped) {
      detailedItemsMapped = detailedItemsMapped.map((item) => ({
        ...item,
        isAdmin: true,
      }));
    }


    // this.logger.log(`[incomingRecipients] Completed in ${Date.now() - start}ms. Total items: ${items.length}`);
    return { items: detailedItemsMapped, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum), isAdmin: isAdmin === true };
  }

  // ─── Private helpers (chỉ dùng cho incomingRecipients) ───────────────────

  /** Parse và validate pagination params */
  private parsePagination(page: any, limit: any, isExport?: string) {
    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = isExport === 'true' ? 9999 : Math.min(Number(limit) || 20, 1000);
    const offsetNum = (pageNum - 1) * limitNum;
    return { pageNum, limitNum, offsetNum };
  }

  /** Build WHERE + JOIN clauses cho incomingRecipients */
  private buildRecipientsWhere(filter: any, featureManagement: any, userId: string, processFn: string, receiverUnit: string | null, isAdmin?: boolean) {
    // Convert FE filter object into runtime criteria.
    // Example request:
    // filter[receiveDate][startDate]=2025-07-18
    // filter[receiveDate][endDate]=2026-07-18
    const criteria = this.buildCriteria(filter);
    // Merge FE filter with default criteria configured by processFn.
    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, joins: filterJoins } = buildDocumentCriteriaHelper(
      [...featureCriteria, ...criteria],
      'incomming_documents',
      featureManagement,
    );

    const whereParts: string[] = [];
    if (filterFeature) whereParts.push(`(${filterFeature})`);
    if (isAdmin && (filter?.isDeleted === '1' || filter?.isDeleted === 'true')) {
      whereParts.push('incomming_documents.status = 3');
    } else {
      whereParts.push('incomming_documents.status = 1');
    }

    // KHÔNG lọc receiver_unit ở đây — điều kiện này được xử lý
    // trong baseSql kết hợp với logic group viewer (view_group)

    // Optional star filter uses current user + current processFn.
    if (filter?.isStar === '1' || filter?.isStar === 'true') {
      whereParts.push(`EXISTS ( SELECT 1 FROM document_star ds WHERE ds.document_id = incomming_documents.document_id AND ds.user_id = '${userId}' AND ds.step = '${processFn}' )`);
    }
    if (filter?.isStar === '0' || filter?.isStar === 'false') {
      whereParts.push(`NOT EXISTS ( SELECT 1 FROM document_star ds WHERE ds.document_id = incomming_documents.document_id AND ds.user_id = '${userId}' AND ds.step = '${processFn}' )`);
    }

    return {
      whereClause: 'WHERE ' + whereParts.join(' AND '),
      joinClause: filterJoins ? ' ' + filterJoins : '',
    };
  }

  /** Build SELECT fields + aliases + ORDER BY cho incomingRecipients */
  private async buildRecipientsSelect(processFn: string, userId: string, sort: any) {
    const excludeKeys = ['files', 'statusCode', 'status_code', 'userDeadline', 'user_deadline'];
    // Dynamic select columns come from the configured view of the current processFn.
    const { dbKeys, aliases, allViewFields } = await this.configurationService.buildSelectFieldsNew(
      'incomming_documents', excludeKeys, processFn,
    );

    const keyDefaultParts: string[] = [];

    // status_code is derived from the current workflow state when requested by the view.
    if (allViewFields.includes('statusCode') || allViewFields.includes('status_code')) {
      keyDefaultParts.push(
        `af.current_action_code AS status_code`,
      );
    }

    // isStar is computed per user and per processFn, not stored in the main row.
    keyDefaultParts.push(`CASE WHEN EXISTS (
      SELECT 1 FROM document_star ds
      WHERE ds.document_id = incomming_documents.document_id
        AND ds.user_id = '${userId}'
        AND ds.step = '${processFn}'
    ) THEN 1 ELSE 0 END AS isStar`);
    aliases['isStar'] = 'is_star';

    const selectFields = [...keyDefaultParts, ...dbKeys].join(', ');
    const orderBy = 'ORDER BY ' + parseSort(sort, aliases);

    return { selectFields, aliases, orderBy };
  }

  /** Build OUTER APPLY join với bảng audit (trạng thái mới nhất của user/unit) */
  private buildRecipientsAuditJoin(userId: string, receiverUnit: string | null, isAdmin?: boolean): string {
    const receiverCondition = isAdmin
      ? ''
      : (receiverUnit
        ? `AND (a.receiver='${userId}' OR a.receiver_unit='${receiverUnit}')`
        : `AND a.receiver='${userId}'`);

    return `
      OUTER APPLY (
        -- Pick the latest relevant audit row for each document and this user/unit.
        SELECT TOP 1 *
        FROM ${this.dbname}.dbo.audit a
        WHERE a.document_id = incomming_documents.document_id
          ${receiverCondition}
          AND a.stage_status IN (
            '${stageStatusDoc.HOAN_THANH_VAN_BAN}',
            '${stageStatusDoc.HOAN_THANH}',
            '${stageStatusDoc.DA_XEM}',
            '${stageStatusDoc.DA_XU_LY}',
            '${stageStatusDoc.CHUA_XU_LY}'
          )
        ORDER BY
          -- Rank more meaningful completion statuses first, then newest id.
          CASE a.stage_status
            WHEN '${stageStatusDoc.HOAN_THANH_VAN_BAN}' THEN 1
            WHEN '${stageStatusDoc.HOAN_THANH}'         THEN 2
            WHEN '${stageStatusDoc.DA_XEM}'             THEN 3
            WHEN '${stageStatusDoc.DA_XU_LY}'           THEN 4
            WHEN '${stageStatusDoc.CHUA_XU_LY}'         THEN 5
            ELSE 99
          END,
          a.id DESC
      ) la
      LEFT JOIN ${this.dbname}.dbo.incomming_current_state af
        ON af.document_id = incomming_documents.document_id
    `;
  }



  async getStatistics(userId: string) {
    const pool = await this.getPool();

    // 1. receiverUnit
    const userRes = await pool.request()
      .input('userId', userId)
      .query(`
      SELECT parent AS parentId
      FROM ${this.dbname}.dbo.users
      WHERE id = @userId
    `);

    const receiverUnit = userRes.recordset[0]?.parentId || null;

    // 2. roles
    let groupUser;
    if (groupUser === undefined) {
      try {
        groupUser = await this.groupUserService.findByCode(GROUP_CODES.VAN_THU);
      } catch (e) {
        groupUser = null;
      }
    }
    const groupUserId =
      groupUser?.data?.users?.map((user) => user.id) || [];
    const isVanThu = groupUserId.includes(userId);

    // 3. Query gộp
    const result = await pool.request()
      .input('userId', userId)
      .input('receiverUnit', receiverUnit)
      .input('chuaXuLy', stageStatusDoc.CHUA_XU_LY)
      .input('isVanThu', isVanThu ? 1 : 0)
      .query(`
      SELECT
          ia.role_process AS roleProcess,
          COUNT(*) AS count
      FROM ${this.dbname}.dbo.incomming_documents d
      JOIN ${this.dbname}.dbo.incomming_assignment ia
        ON ia.document_id = d.document_id
      LEFT JOIN ${this.dbname}.dbo.users u
        ON u.id = ia.receiver
      WHERE
        d.status = 1
        AND ia.stage_status = @chuaXuLy
        AND (
          ia.receiver = @userId
          OR (
            @isVanThu = 1
            AND @receiverUnit IS NOT NULL
            AND (
              ia.receiver = @receiverUnit
              OR u.parent = @receiverUnit
            )
          )
        )
      GROUP BY ia.role_process
    `);

    // 4. Map kết quả
    const map = Object.fromEntries(
      result.recordset.map(r => [r.roleProcess, Number(r.count)])
    );

    const response: any = {};

    if (isVanThu) {
      response.receivedDocs = {
        name: 'Tiếp nhận',
        count: map.undefined || 0,
        color: '#16A34A',
      };

      response.assignmentDocs = {
        name: 'Phân công xử lý',
        count: map.processor || 0,
        color: '#F59E0B',
      };

      response.viewerDocs = {
        name: 'Nhận để biết',
        count: map.viewer || 0,
        color: '#2563EB',
      };

      return response;
    }

    response.processorDocs = {
      name: 'Xử lý chính',
      count: map.processor || 0,
      color: '#DC2626',
    };

    response.supporterDocs = {
      name: 'Phối hợp',
      count: map.supporter || 0,
      color: '#EA580C',
    };

    response.viewerDocs = {
      name: 'Nhận để biết',
      count: map.viewer || 0,
      color: '#2563EB',
    };

    return response;
  }

  private async executeAndMapForExport(
    pool: sql.ConnectionPool,
    totalSql: string,
    rowsSql: string,
    page: number,
    limit: number,
    countOnly: string | undefined,
    userContext: any,
    receiverUnit: any,
    aliases: Record<string, string>,
    authority: string | undefined,
    type: string | undefined,
    bindQueryParams?: (request: sql.Request) => sql.Request,
  ) {
    const start = Date.now();

    // ── CountOnly shortcut ──
    if (countOnly === 'true') {
      const req = bindQueryParams ? bindQueryParams(pool.request()) : pool.request();
      const rs = await req.query(totalSql);
      return { total: rs.recordset[0]?.total ?? 0 };
    }

    // ── Parallel: COUNT + DATA ──
    const qStart = Date.now();
    let totalResult: any, rowsResult: any;
    const totalReq = bindQueryParams ? bindQueryParams(pool.request()) : pool.request();
    const rowsReq = bindQueryParams ? bindQueryParams(pool.request()) : pool.request();
    try {
      [totalResult, rowsResult] = await Promise.all([
        totalReq.query(totalSql),
        rowsReq.query(rowsSql),
      ]);
    } catch (e) {
      const boundParams: Record<string, any> = {};
      try {
        if (totalReq && (totalReq as any).parameters) {
          for (const key in (totalReq as any).parameters) {
            boundParams[key] = (totalReq as any).parameters[key]?.value;
          }
        }
      } catch (paramErr) {
        this.logger.error('Lỗi khi đọc tham số bind export:', paramErr);
      }
      this.logger.error({
        message: 'Lỗi truy vấn dữ liệu SQL parallel (Export)',
        error: e?.message || e,
        stack: e?.stack,
        boundParams,
        totalSql,
        rowsSql,
      });
      throw new InternalServerErrorException('Lỗi truy vấn dữ liệu');
    }

    const total: number = totalResult.recordset[0]?.total ?? 0;
    const items: DocumentRow[] = rowsResult.recordset ?? [];

    if (!items.length) {
      return { success: true, items: [], mesage: 'Không có dữ liệu', total: 0, page, limit, totalPages: Math.ceil(total / limit) };
    }

    // ── Transform: chỉ map dữ liệu, không map luồng ──
    const tStart = Date.now();
    const mapped = await this.mapDocKeysForExport(items, aliases, authority, userContext, type);


    return { success: true, items: mapped, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  private async mapDocKeysForExport(
    docs: any[],
    aliases: Record<string, string> = {},
    authority?: string,
    userContext?: { userId: string; roles?: string[]; unit?: string },
    type?: string,
  ): Promise<any[]> {
    if (!docs.length) return [];

    const start = Date.now();
    const pool = await this.getPool();

    // ── Collect unique IDs trước khi query ──
    const documentIds = [...new Set(
      docs.map(d => d?.documentId ?? d?.document_id ?? d?.docId).filter(Boolean).map(String),
    )];
    const orgUnitIds = [...new Set(
      docs.flatMap(d => [d?.senderUnit, d?.sender_unit, d?.receiverUnit, d?.receiver_unit])
        .filter((id: any) => id != null && String(id).trim() !== '')
        .map((id: any) => String(id).trim()),
    )];
    const processorIds = [...new Set(
      docs.flatMap(d => d?.processors ? (Array.isArray(d.processors) ? d.processors : [d.processors]) : [])
        .filter(Boolean),
    )];
    const bookIds = [...new Set(docs.map(d => d?.book_document_id).filter(Boolean).map(Number))];

    // ── Parallel lookup queries ──
    const qStart = Date.now();
    const [completedResult, orgUnitsResult, usersResult, crmResult, booksResult] = await Promise.all([
      // completed + deadline (1 query, parameterized IN với batch nếu cần)
      this.fetchCompletedAndDeadlineForExport(pool, documentIds, userContext),
      // org units
      orgUnitIds.length ? this.fetchOrgUnits(pool, orgUnitIds) : Promise.resolve([]),
      // processors
      processorIds.length ? this.fetchUserNames(pool, processorIds) : Promise.resolve([]),
      // crm sources
      pool.request().query(
        `SELECT s.code, d.value, d.title
         FROM ${this.dbname}.dbo.crm_sources s
         LEFT JOIN crm_source_data d ON s.id = d.source_id
         WHERE s.status = 1 AND s.code IN ('S20','S19','S26','S27','S21')`,
      ),
      // book documents
      bookIds.length ? this.fetchBookDocuments(pool, bookIds) : Promise.resolve([]),
    ]);

    // ── Build lookup Maps ──
    const completedMap = new Map<string, number>(
      completedResult.map((r: any) => [String(r.document_id), Number(r.is_completed_document)]),
    );
    const deadlineMap = new Map<string, string | null>(
      completedResult.map((r: any) => [
        String(r.document_id),
        r.deadline
          ? normalizeDateValueDDMMYYYY(r.deadline)
          : r.resolution_deadline
            ? normalizeDateValueDDMMYYYY(r.resolution_deadline)
            : null,
      ]),
    );
    const orgMap = new Map<string, OrgUnit>(
      orgUnitsResult.map((u: OrgUnit) => [String(u.id), u]),
    );
    const userMap = new Map<string, string>(
      usersResult.map((u: any) => [u.id, u.display_name || u.name || u.username || '-']),
    );

    const crmMap = new Map<string, CRMItem[]>();
    for (const row of crmResult.recordset) {
      if (!crmMap.has(row.code)) crmMap.set(row.code, []);
      crmMap.get(row.code)!.push({ value: row.value, title: row.title });
    }

    const bookMap = new Map<number, BookDocument>(
      booksResult.map((r: any) => [
        Number(r.book_document_id),
        { name: r.name, to_book_code: r.to_book_code, count: Number(r.count) },
      ]),
    );

    // ── CRM field code lookup ──
    const CRM_FIELD_MAP: Record<string, string> = {
      urgencyLevel: 'S20',
      documentType: 'S19',
      documentField: 'S26',
      receiveMethod: 'S27',
      privateLevel: 'S21',
    };
    const TEXT_FIELDS = new Set(['signer', 'secondBook', 'toBook', 'toBookCode', 'files', 'abstractNote']);

    // ── Map từng document ──
    const tStart = Date.now();
    const resultArray: any[] = [];
    const docIdsForFiles = new Set<string>();

    for (const doc of docs) {
      if (!doc || typeof doc !== 'object') continue;

      const rawDocId = doc?.documentId ?? doc?.document_id ?? doc?.docId;
      const docId = rawDocId ? String(rawDocId) : null;
      if (docId) docIdsForFiles.add(docId);

      const result: any = {
        isComplete: docId ? completedMap.get(docId) === 1 : false,
        isIncomming: true,
      };

      if (authority === 'true') result.isAuthority = true;

      const deadline = docId ? (deadlineMap.get(docId) ?? null) : null;

      for (const [key, value] of Object.entries(doc)) {
        const jsKey = aliases[key] || key;
        let finalValue: any = value === null || value === undefined ? '-' : value;

        // Date normalization
        if (dateKeys.has(key)) finalValue = normalizeDateValueDDMMYYYY(finalValue);

        result[jsKey] = finalValue ?? '-';

        // Deadline / userDeadline
        if (jsKey === 'deadline' || jsKey === 'user_deadline' || jsKey === 'userDeadline') {
          result[jsKey] = typeof deadline === 'string' && deadline ? deadline : '-';
        }

        // CRM label mapping
        if (CRM_FIELD_MAP[jsKey]) {
          const items = crmMap.get(CRM_FIELD_MAP[jsKey]) || [];
          result[jsKey] = items.find(i => i.value == value)?.title ?? '-';
        }

        // Text fields
        if (TEXT_FIELDS.has(jsKey)) {
          result[jsKey] = value ? String(value).trim() : '-';
        }

        // Status code — export dùng mapActionIncomingToLabel
        if (jsKey === 'status' || jsKey === 'statusCode') {
          result['statusCode'] = value ? extractTextFromHtml(mapActionIncomingToLabel(String(value))) ?? value : '-';
        }

        // Org unit names
        if (jsKey === 'receiverUnit') {
          const id = doc?.receiverUnit ?? doc?.receiver_unit;
          result['receiverUnit'] = id ? orgMap.get(String(id))?.name ?? '-' : '-';
        }
        if (jsKey === 'senderUnit') {
          const id = doc?.senderUnit ?? doc?.sender_unit;
          result['senderUnit'] = id ? orgMap.get(String(id))?.name ?? '-' : '-';
        }

        // File ids (raw)
        if (jsKey === 'fileids') result['fileids'] = value || '-';

        // isStar
        if (jsKey === 'is_star') {
          result['isStar'] = !!value;
          delete result['is_star'];
        }

        // Book document name
        if (jsKey === 'bookDocumentId') {
          result['bookDocumentId'] = bookMap.get(Number(value))?.name ?? '-';
        }

        // toBookCode — lấy phần sau dấu '/'
        if (jsKey === 'toBookCode') {
          result['toBookCode'] = value ? String(value).split('/').pop() : '-';
        }

        // Processors — map sang tên
        if (jsKey === 'processors' || jsKey === 'processorUnitsName') {
          const ids = value ? (Array.isArray(value) ? value : [value]) : [];
          result[jsKey] = ids.map((id: string) => userMap.get(id)).filter(Boolean).join(', ') || '-';
        }

        // directive_comment — export: giữ plain text (không format HTML)
        // (field đã là chuỗi từ mapDocumentDetails, không cần xử lý thêm)
      }

      // Parse suggestedHandling into JSON and ensure the name is correct
      const suggestedVal = result.suggestedHandling || result.suggested_handling;
      if (suggestedVal && typeof suggestedVal === 'string' && suggestedVal !== '-' && suggestedVal.trim() !== '') {
        try {
          result.suggestedHandling = JSON.parse(suggestedVal);
          delete result.suggested_handling;
        } catch (e) {
          // Keep string if parsing fails
          result.suggestedHandling = suggestedVal;
        }
      }

      // Override statusCode nếu document đã hoàn thành (export dùng label incoming)
      if (result.isComplete === true && type !== 'waitSign') {
        result.statusCode = extractTextFromHtml(mapActionIncomingToLabel('HOAN_THANH_VAN_BAN'));
      }

      resultArray.push(result);
    }

    // ── Files (batch) ──
    if (docIdsForFiles.size) {
      const fStart = Date.now();
      const filesMap = await this.fileService.getFilesByOutgoingDocumentIds([...docIdsForFiles]);
      for (const item of resultArray) {
        const id = String(item.documentId);
        const files = filesMap[id] || [];
        item.files = files.length ? files : '-';
        item.isCertifiedCopy = files.some((f: any) => f.isCertifiedCopy);
        if (Array.isArray(files)) {
          for (const f of files) delete f.isCertifiedCopy;
        }
      }
    }

    return resultArray;
  }

  // ── Private helpers tách ra để dùng lại ──

  /** Lấy trạng thái hoàn thành + deadline cho export (parameterized, không join string) */
  private async fetchCompletedAndDeadlineForExport(
    pool: sql.ConnectionPool,
    documentIds: string[],
    userContext?: { userId?: string; unit?: string },
  ): Promise<any[]> {
    if (!documentIds.length) return [];

    const req = pool.request();
    req.input('userId', sql.NVarChar, userContext?.userId ?? null);
    req.input('unit', sql.NVarChar, userContext?.unit ?? null);

    // Batch IN: mssql giới hạn 2100 params — với export 9999 rows dùng STRING_SPLIT an toàn
    // vì docIds là internal UUID (không từ user), không có SQL injection risk
    const idsCsv = documentIds.join(',');
    req.input('docIdsCsv', sql.NVarChar(sql.MAX), idsCsv);

    const result = await req.query(`
      SELECT
        d.document_id,
        d.deadline AS document_deadline,
        d.resolution_deadline,
        ISNULL(comp.is_completed_document, 0) AS is_completed_document,
        ad.deadline
      FROM ${this.dbname}.dbo.incomming_documents d
      JOIN STRING_SPLIT(@docIdsCsv, ',') s ON d.document_id = s.value
      OUTER APPLY (
        SELECT TOP 1 a_dead.deadline
        FROM ${this.dbname}.dbo.audit a_dead
        WHERE a_dead.document_id = d.document_id
          AND a_dead.deadline IS NOT NULL
          AND (
            (@userId IS NOT NULL AND a_dead.receiver = @userId)
            OR (@unit IS NOT NULL AND a_dead.receiver_unit = @unit)
          )
        ORDER BY a_dead.created_at DESC
      ) ad
      OUTER APPLY (
        SELECT TOP 1 a_first.details
        FROM ${this.dbname}.dbo.audit a_first
        WHERE a_first.document_id = d.document_id
          AND a_first.action_code = 'CREATE'
        ORDER BY a_first.id ASC
      ) c
      LEFT JOIN (
        SELECT document_id,
          MAX(CASE
            WHEN stage_status = '${stageStatusDoc.HOAN_THANH}'
              OR (action_code = '${stageStatusDoc.HOAN_THANH_VAN_BAN}' AND stage_status = '${stageStatusDoc.HOAN_THANH_VAN_BAN}')
            THEN 1 ELSE 0
          END) AS has_completed
        FROM ${this.dbname}.dbo.audit
        GROUP BY document_id
      ) done ON done.document_id = d.document_id
      OUTER APPLY (
        SELECT
          CASE
            WHEN done.has_completed = 1 THEN 1
            ELSE 0
          END AS is_completed_document
      ) comp
    `);

    return result.recordset;
  }

  /** Lấy tên org units theo danh sách ID */
  private async fetchOrgUnits(pool: sql.ConnectionPool, ids: string[]): Promise<any[]> {
    const req = pool.request();
    req.input('orgIds', sql.NVarChar(sql.MAX), ids.join(','));
    const rs = await req.query(
      `SELECT id, name
       FROM ${this.dbname}.dbo.organization_units
       WHERE id IN (SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(@orgIds, ','))`,
    );
    return rs.recordset;
  }

  /** Lấy display_name của users theo danh sách ID */
  private async fetchUserNames(pool: sql.ConnectionPool, ids: string[]): Promise<any[]> {
    const req = pool.request();
    ids.forEach((id, i) => req.input(`uid${i}`, id));
    const placeholders = ids.map((_, i) => `@uid${i}`).join(',');
    const rs = await req.query(
      `SELECT id, display_name, username, name
       FROM ${this.dbname}.dbo.users WHERE id IN (${placeholders})`,
    );
    return rs.recordset;
  }

  /** Lấy book documents theo danh sách ID */
  private async fetchBookDocuments(pool: sql.ConnectionPool, ids: number[]): Promise<any[]> {
    const req = pool.request();
    ids.forEach((id, i) => req.input(`bid${i}`, id));
    const placeholders = ids.map((_, i) => `@bid${i}`).join(',');
    const rs = await req.query(
      `SELECT book_document_id, name, to_book_code, count
       FROM ${this.dbname}.dbo.book_documents WHERE book_document_id IN (${placeholders})`,
    );
    return rs.recordset;
  }

  // ==================== REFACTORED: 10 PHASES ====================

  /**
   * PHASE 1: Parse & Initialize
   * Parse query parameters and initialize variables
   */
  private phase1_parseAndInitialize(query: ListDocumentsDto) {
    const startTime = Date.now();

    const { type, page = 1, limit = 20, filter, sort, processFn, authority, room, isExport, countOnly } = query;
    let limitNum = Math.min(Number(limit) || 20, 100);
    if (isExport === 'true') {
      limitNum = 9999;
    }
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;
    const tab = 'processor';
    const urgencyValue = 'khn';
    const isRoomFilter = room === 'true' ? 'ONLY_ROOM' : room === 'false' ? 'ONLY_PERSONAL' : 'ALL';
    const roomCondition = isRoomFilter === 'ONLY_ROOM'
      ? `(af.is_transfer_to_room = 1)`
      : isRoomFilter === 'ONLY_PERSONAL'
        ? `(af.is_transfer_to_room = 0 OR af.is_transfer_to_room IS NULL)`
        : '';

    const phaseTime = Date.now() - startTime;

    return {
      type,
      page: pageNum,
      limit: limitNum,
      offset: offsetNum,
      filter,
      sort,
      processFn,
      authority,
      room,
      isExport,
      countOnly,
      tab,
      urgencyValue,
      isRoomFilter,
      roomCondition,
      startTime,
    };
  }

  /**
   * PHASE 2: Get Context
   * Get user context, feature management config, and receiver unit
   */
  private async phase2_getContext(
    userId: string,
    processFn: string | undefined,
    pool: sql.ConnectionPool
  ) {
    const phaseStart = Date.now();
    const result = await this.getListContext(userId, processFn, pool);
    return result;
  }

  /**
   * PHASE 3: Build Criteria & Filters
   * Build document criteria from filter params and feature config
   */
  private phase3_buildCriteriaAndFilters(
    filter: any,
    featureManagement: any
  ) {
    const phaseStart = Date.now();

    // const criteria = this.buildCriteria(filter);
    // const { sql: filterFeature, joins: filterJoins } = buildDocumentCriteriaHelper(criteria, 'incomming_documents', null);

    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];
    const { sql: filterFeature, joins: filterJoins } = buildDocumentCriteriaHelper(
      [...featureCriteria, ...criteria],
      'incomming_documents',
      featureManagement
    );


    return { filterFeature, filterJoins };
  }

  /** 
   * PHASE 4: Validate Type
   * Validate document type and determine flow type
   */
  private phase4_validateType(type: string | undefined) {
    const USER_FLOW_TYPES = ['urgent', 'deadline', 'other', 'processed', 'notComplete', 'waitSign', 'notDone'] as const;
    const DOC_FLOW_TYPES = ['incompleted', 'completed'] as const;
    const ALLOWED_TYPES = [...USER_FLOW_TYPES, ...DOC_FLOW_TYPES];

    if (!type || !ALLOWED_TYPES.includes(type as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: ALLOWED_TYPES,
      });
    }

    type UserFlowType = typeof USER_FLOW_TYPES[number];
    type DocFlowType = typeof DOC_FLOW_TYPES[number];
    const isUserFlow = USER_FLOW_TYPES.includes(type as UserFlowType);
    const isDocFlow = DOC_FLOW_TYPES.includes(type as DocFlowType);
    const safeType = type ?? 'deadline';

    return { isUserFlow, isDocFlow, safeType, USER_FLOW_TYPES, DOC_FLOW_TYPES };
  }

  private buildAssignmentCreatedAtSql(
    alias: string,
    assignmentDateRange?: { startDate?: string; endDate?: string },
  ): string {
    if (!assignmentDateRange) return '';

    const conditions: string[] = [];
    if (assignmentDateRange.startDate) {
      conditions.push(`${alias}.created_at >= @assignmentStartDate`);
    }
    if (assignmentDateRange.endDate) {
      conditions.push(`${alias}.created_at <= @assignmentEndDate`);
    }

    return conditions.length ? ` AND ${conditions.join(' AND ')}` : '';
  }

  /**
   * PHASE 5: Build JOIN Clause
   * Build JOIN clause with audit table based on flow type
   */
  private phase5_buildJoinClause(
    isUserFlow: boolean,
    isDocFlow: boolean,
    safeType: string,
    _userId: string,
    tab: string,
    filterJoins: string | undefined,
    assignmentDateRange?: { startDate?: string; endDate?: string },
  ) {
    const phaseStart = Date.now();
    void safeType;

    let joinClause = '';

    // Current state (includes is_transfer_to_room + current_action_code)
    joinClause += ` LEFT JOIN ${this.dbname}.dbo.incomming_current_state af
      ON af.document_id = incomming_documents.document_id`;

    // Assignment type check from audit details
    joinClause += ` OUTER APPLY (
      SELECT TOP 1 assignment_type as assignmentType
      FROM ${this.dbname}.dbo.audit
      WHERE document_id = incomming_documents.document_id
        AND assignment_type IS NOT NULL
      ORDER BY id DESC
    ) ap`;

    if (isUserFlow) {
      const assignmentCreatedAtSql = this.buildAssignmentCreatedAtSql('au', assignmentDateRange);
      joinClause += ` INNER JOIN ${this.dbname}.dbo.incomming_assignment au
        ON au.document_id = incomming_documents.document_id
       AND au.receiver = @currentUserId
       AND au.role_process = '${tab}'${assignmentCreatedAtSql}`;
    }

    if (isDocFlow) {
      joinClause += ` INNER JOIN ${this.dbname}.dbo.incomming_current_state ad
        ON ad.document_id = incomming_documents.document_id`;
    }
    if (safeType === 'deadline') {
      joinClause += ` OUTER APPLY (
        SELECT TOP 1 suggested_handling
        FROM incomming_suggested_handlings
        WHERE document_id = incomming_documents.document_id
        ORDER BY created_at DESC
      ) wsh`;
    }
    if (filterJoins) {
      joinClause += ' ' + filterJoins;
    }


    return joinClause;
  }

  /**
   * PHASE 6: Build WHERE Clause
   * Build WHERE conditions based on type and filters
   */
  private phase6_buildWhereClause(
    type: string,
    filter: any,
    _userId: string,
    _processFn: string | undefined,
    filterFeature: string | undefined,
    isRoomFilter: string,
    roomCondition: string,
    urgencyValue: string,
    listCategory?: 'main-process' | 'implementation-coordination' | 'recipient-to-know',
    userDeadlineRange?: { startDate?: string; endDate?: string } | null
  ) {
    const phaseStart = Date.now();

    const { isUserFlow, isDocFlow } = this.phase4_validateType(type);
    const where: string[] = [];

    // Lọc theo khoảng userDeadline
    if (userDeadlineRange) {
      const deadlineField = isUserFlow ? 'au.deadline' : (isDocFlow ? 'ad.current_deadline' : null);
      if (deadlineField) {
        if (userDeadlineRange.startDate) {
          where.push(`(${deadlineField} >= @userDeadlineStartDate)`);
        }
        if (userDeadlineRange.endDate) {
          where.push(`(${deadlineField} <= @userDeadlineEndDate)`);
        }
      }
    }

    // Star filter
    if (filter?.isStar === '1' || filter?.isStar === 'true') {
      where.push(` EXISTS ( SELECT 1 FROM document_star ds WHERE ds.document_id = incomming_documents.document_id AND ds.user_id = @currentUserId AND ds.step = @processFn ) `);
    }
    if (filter?.isStar === '0' || filter?.isStar === 'false') {
      where.push(` NOT EXISTS ( SELECT 1 FROM document_star ds WHERE ds.document_id = incomming_documents.document_id AND ds.user_id = @currentUserId AND ds.step = @processFn ) `);
    }

    // Lọc theo processDeadline / process_deadline
    const processDeadlineVal = filter?.processDeadline ?? filter?.process_deadline;
    if (processDeadlineVal) {
      const val = String(processDeadlineVal).trim().toUpperCase();
      const deadlineField = isUserFlow ? 'au.deadline' : (isDocFlow ? 'ad.current_deadline' : null);
      if (deadlineField) {
        if (val === 'CON_HAN') {
          where.push(`(${deadlineField} >= DATEADD(day, 2, GETDATE()))`);
        } else if (val === 'QUA_HAN') {
          where.push(`(${deadlineField} < GETDATE())`);
        } else if (val === 'SAP_HET_HAN') {
          where.push(`(${deadlineField} >= GETDATE() AND ${deadlineField} < DATEADD(day, 2, GETDATE()))`);
        } else if (val === 'KHONG_CO_HAN') {
          where.push(`(${deadlineField} IS NULL)`);
        }
      }
    }

    // Lọc theo mảng statusCode nếu có
    const targetStatusFilter = filter?.statusCode ?? filter?.status_code ?? filter?.status;
    if (targetStatusFilter) {
      let rawStatuses: string[] = [];
      if (Array.isArray(targetStatusFilter)) {
        rawStatuses = targetStatusFilter;
      } else if (typeof targetStatusFilter === 'object' && targetStatusFilter !== null) {
        rawStatuses = Object.values(targetStatusFilter);
      } else if (typeof targetStatusFilter === 'string') {
        rawStatuses = [targetStatusFilter];
      }
      if (rawStatuses.length > 0) {
        const statusSql = buildStatusCodeFilterClause(rawStatuses, this.dbname, listCategory);
        if (statusSql) {
          where.push(statusSql);
        }
      }
    }

    // Exclude completed documents (use current_state)
    const excludeCompletedDoc = `ISNULL(af.is_completed_doc, 0) = 0`;

    const latestActionExclusion = `(af.current_action_code IS NULL OR af.current_action_code NOT IN ('TAO_SAO_Y', 'TRINH_KY'))`;
    const conditionChuaXuLyAndThemXuLy = `
      (
        au.stage_status = '${stageStatusDoc.CHUA_XU_LY}'
        AND af.current_action_code = 'THEM_XU_LY'
      )
      `;
    // Type-specific filters
    const typeFilters: Record<string, string[]> = {
      urgent: [
        filterFeature ? `(${filterFeature})` : undefined,
        `incomming_documents.urgency_level IN ('${urgencyValue}')`,
        `( au.stage_status='${stageStatusDoc.CHUA_XU_LY}' )`,
        `ISNULL(af.is_completed_doc, 0) = 0`,
        roomCondition
      ].filter((f): f is string => !!f),
      // deadline: [
      //   // filterFeature chỉ áp dụng cho CHUA_XU_LY, văn bản "đang chờ ký" bypass filterFeature
      //   filterFeature
      //     ? `((${filterFeature}) AND au.stage_status='${stageStatusDoc.CHUA_XU_LY}') OR (au.stage_status='${stageStatusDoc.DA_XU_LY}' AND EXISTS (SELECT 1 FROM ${this.dbname}.dbo.audit a_latest WHERE a_latest.document_id = incomming_documents.document_id AND a_latest.action_code IN ('TAO_SAO_Y', 'TRINH_KY') AND a_latest.id = (SELECT MAX(a_m.id) FROM ${this.dbname}.dbo.audit a_m WHERE a_m.document_id = incomming_documents.document_id)))`
      //     : `( au.stage_status='${stageStatusDoc.CHUA_XU_LY}' OR (au.stage_status='${stageStatusDoc.DA_XU_LY}' AND EXISTS (SELECT 1 FROM ${this.dbname}.dbo.audit a_latest WHERE a_latest.document_id = incomming_documents.document_id AND a_latest.action_code IN ('TAO_SAO_Y', 'TRINH_KY') AND a_latest.id = (SELECT MAX(a_m.id) FROM ${this.dbname}.dbo.audit a_m WHERE a_m.document_id = incomming_documents.document_id))) )`,
      //   roomCondition
      // ].filter((f): f is string => !!f),
      deadline: [
        filterFeature ? `(${filterFeature})` : undefined,
        `( au.stage_status='${stageStatusDoc.CHUA_XU_LY}' 
        AND NOT  ${conditionChuaXuLyAndThemXuLy}) `,
        // Loại trừ văn bản đã hoàn thành bởi lãnh đạo (is_completed_doc=1) → chuyển sang tab notDone
        `ISNULL(af.is_completed_doc, 0) = 0`,
        roomCondition
      ].filter((f): f is string => !!f),
      waitSign: [
        filterFeature ? `(${filterFeature})` : undefined,
        `(au.stage_status='${stageStatusDoc.DANG_CHO_KY}' OR au.stage_status='${stageStatusDoc.DA_XU_LY}')`,
        // Chỉ hiện khi document đang thực sự chờ ký (không phải DA_XU_LY bình thường)
        `af.current_action_code IN ('TAO_SAO_Y', 'TRINH_KY')`,
        roomCondition
      ].filter((f): f is string => !!f),
      other: [
        filterFeature ? `(${filterFeature})` : undefined,
        `(incomming_documents.urgency_level != '${urgencyValue}' OR incomming_documents.urgency_level IS NULL)`,
        `(incomming_documents.deadline IS NULL OR incomming_documents.deadline > DATEADD(day, 3, CAST(GETDATE() AS DATE)))`,
        `( au.stage_status='${stageStatusDoc.CHUA_XU_LY}' )`,
        `ISNULL(af.is_completed_doc, 0) = 0`,
        roomCondition
      ].filter((f): f is string => !!f),
      processed: [
        filterFeature ? `(${filterFeature})` : undefined,
        excludeCompletedDoc,
        // isRoomFilter là string ('ALL'/'ONLY_ROOM'/'ONLY_PERSONAL'), dùng === 'ONLY_ROOM' thay vì truthy check
        // Bọc outer parentheses để latestActionExclusion (AND) áp dụng đúng, tránh SQL operator precedence sai
        isRoomFilter === 'ONLY_ROOM' ?
          `((au.stage_status = '${stageStatusDoc.HOAN_THANH}' 
                OR au.stage_status = '${stageStatusDoc.DA_XU_LY}' 
                OR au.stage_status = '${stageStatusDoc.DA_PHAN_CONG}')
                  OR ${conditionChuaXuLyAndThemXuLy})`
          : `( au.stage_status = '${stageStatusDoc.DA_XU_LY}' 
            OR au.stage_status = '${stageStatusDoc.DA_PHAN_CONG}'
            OR au.stage_status = '${stageStatusDoc.HOAN_THANH}' )`,
        // Loại trừ văn bản đang chờ ký (action_code = TAO_SAO_Y hoặc TRINH_KY) - phải nằm ở tab waitSign
        latestActionExclusion,
        // Văn thư phân công: hoàn thành cá nhân hoặc chuyển xử lý cho người khác và chuỗi xử lý đã hoàn tất thì biến mất khỏi tab processed đối với người nhận phân công, nhưng VẪN HIỂN THỊ đối với Văn thư (người phân công).
        `NOT (
          ISNULL(ap.assignmentType, '') = 'VAN_THU' 
          AND NOT EXISTS (
            SELECT 1 FROM ${this.dbname}.dbo.audit a_vt
            WHERE a_vt.document_id = incomming_documents.document_id
              AND (a_vt.user_id = @currentUserId OR a_vt.created_by = @currentUserId OR a_vt.acting_as = @currentUserId)
              AND a_vt.assignment_type = 'VAN_THU'
          )
          AND (
            au.stage_status = '${stageStatusDoc.HOAN_THANH}'
            OR
            (
              au.stage_status = '${stageStatusDoc.DA_XU_LY}'
              AND NOT EXISTS (
                SELECT 1 
                FROM ${this.dbname}.dbo.audit a 
                INNER JOIN ${this.dbname}.dbo.incomming_assignment ia 
                  ON ia.document_id = a.document_id AND ia.receiver = a.receiver
                WHERE a.document_id = incomming_documents.document_id 
                  AND (a.user_id = @currentUserId OR a.created_by = @currentUserId OR a.acting_as = @currentUserId)
                  AND ia.stage_status NOT IN ('DA_XU_LY', 'HOAN_THANH')
              )
            )
          )
        )`,
        // Trưởng phòng phân công: chỉ biến mất khỏi tab processed (để chuyển sang hoàn thành hoặc chờ xác nhận) khi CẢ người xử lý chính VÀ người phối hợp đều đã xử lý xong.
        // Chỉ áp dụng điều kiện này đối với chính Trưởng phòng (người đã tạo ra các giao việc cho người khác).
        `NOT (
          ISNULL(ap.assignmentType, '') = 'TRUONG_PHONG' 
          AND EXISTS (
            SELECT 1 FROM ${this.dbname}.dbo.audit a_tp
            WHERE a_tp.document_id = incomming_documents.document_id
              AND (a_tp.user_id = @currentUserId OR a_tp.created_by = @currentUserId OR a_tp.acting_as = @currentUserId)
              AND a_tp.assignment_type = 'TRUONG_PHONG'
          )
          AND NOT EXISTS (
            SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment ia
            INNER JOIN ${this.dbname}.dbo.audit a_assign 
              ON a_assign.document_id = ia.document_id 
              AND (a_assign.receiver = ia.receiver OR a_assign.receiver_unit = ia.receiver)
              AND (a_assign.user_id = @currentUserId OR a_assign.created_by = @currentUserId OR a_assign.acting_as = @currentUserId)
            INNER JOIN ${this.dbname}.dbo.audit a_tp_node
              ON a_tp_node.document_id = ia.document_id
              AND (a_tp_node.receiver = @currentUserId OR a_tp_node.acting_as = @currentUserId)
              AND a_assign.from_node_id = a_tp_node.to_node_id
            WHERE ia.document_id = incomming_documents.document_id
              AND ia.role_process = 'processor'
              AND ia.stage_status NOT IN ('DA_XU_LY', 'HOAN_THANH')
          )
          AND NOT EXISTS (
            SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment ia
            INNER JOIN ${this.dbname}.dbo.audit a_assign 
              ON a_assign.document_id = ia.document_id 
              AND (a_assign.receiver = ia.receiver OR a_assign.receiver_unit = ia.receiver)
              AND (a_assign.user_id = @currentUserId OR a_assign.created_by = @currentUserId OR a_assign.acting_as = @currentUserId)
            INNER JOIN ${this.dbname}.dbo.audit a_tp_node
              ON a_tp_node.document_id = ia.document_id
              AND (a_tp_node.receiver = @currentUserId OR a_tp_node.acting_as = @currentUserId)
              AND a_assign.from_node_id = a_tp_node.to_node_id
            WHERE ia.document_id = incomming_documents.document_id
              AND ia.role_process = 'supporter'
              AND ia.stage_status NOT IN ('DA_XU_LY', 'HOAN_THANH')
          )
        )`,
        roomCondition
      ].filter((f): f is string => !!f),
      incompleted: [
        filterFeature ? `(${filterFeature})` : undefined,
        excludeCompletedDoc,
        `(
          -- Truong phong: Cho xac nhan khi nguoi xu ly chinh va nguoi phoi hop deu da hoan thanh nhung nguoi phan cong (truong phong) chua hoan thanh/xac nhan (au.stage_status = 'DA_PHAN_CONG')
          (ISNULL(ap.assignmentType, '') = 'TRUONG_PHONG' 
            AND EXISTS (
              SELECT 1 FROM ${this.dbname}.dbo.audit a_tp
              WHERE a_tp.document_id = incomming_documents.document_id
                AND (a_tp.user_id = @currentUserId OR a_tp.created_by = @currentUserId OR a_tp.acting_as = @currentUserId)
                AND a_tp.assignment_type = 'TRUONG_PHONG'
            )
            AND NOT EXISTS (
              SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment ia
              INNER JOIN ${this.dbname}.dbo.audit a_assign 
                ON a_assign.document_id = ia.document_id 
                AND (a_assign.receiver = ia.receiver OR a_assign.receiver_unit = ia.receiver)
                AND (a_assign.user_id = @currentUserId OR a_assign.created_by = @currentUserId OR a_assign.acting_as = @currentUserId)
              INNER JOIN ${this.dbname}.dbo.audit a_tp_node
                ON a_tp_node.document_id = ia.document_id
                AND (a_tp_node.receiver = @currentUserId OR a_tp_node.acting_as = @currentUserId)
                AND a_assign.from_node_id = a_tp_node.to_node_id
              WHERE ia.document_id = incomming_documents.document_id
                AND ia.role_process = 'processor'
                AND ia.stage_status NOT IN ('DA_XU_LY', 'HOAN_THANH')
            )
            AND NOT EXISTS (
              SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment ia
              INNER JOIN ${this.dbname}.dbo.audit a_assign 
                ON a_assign.document_id = ia.document_id 
                AND (a_assign.receiver = ia.receiver OR a_assign.receiver_unit = ia.receiver)
                AND (a_assign.user_id = @currentUserId OR a_assign.created_by = @currentUserId OR a_assign.acting_as = @currentUserId)
              INNER JOIN ${this.dbname}.dbo.audit a_tp_node
                ON a_tp_node.document_id = ia.document_id
                AND (a_tp_node.receiver = @currentUserId OR a_tp_node.acting_as = @currentUserId)
                AND a_assign.from_node_id = a_tp_node.to_node_id
              WHERE ia.document_id = incomming_documents.document_id
                AND ia.role_process = 'supporter'
                AND ia.stage_status NOT IN ('DA_XU_LY', 'HOAN_THANH')
            )
            AND EXISTS (
              SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment au
              WHERE au.document_id = incomming_documents.document_id
                AND au.receiver = @currentUserId
                AND au.stage_status NOT IN ('HOAN_THANH', 'HOAN_THANH_VAN_BAN')
            )
          )
          OR
          -- Cac truong hop khac: giu logic cu (nguoi duoc giao chua hoan thanh nhiem vu)
          (ISNULL(ap.assignmentType, '') <> 'TRUONG_PHONG' AND EXISTS (
            SELECT 1 
            FROM ${this.dbname}.dbo.audit a 
            INNER JOIN ${this.dbname}.dbo.incomming_assignment ia 
              ON ia.document_id = a.document_id AND ia.receiver = a.receiver
            WHERE a.document_id = incomming_documents.document_id 
              AND (a.user_id = @currentUserId OR a.created_by = @currentUserId OR a.acting_as = @currentUserId)
              AND NOT EXISTS (
                SELECT 1 
                FROM ${this.dbname}.dbo.audit a_sub 
                WHERE a_sub.document_id = incomming_documents.document_id 
                  AND a_sub.user_id = ia.receiver
              )
          ))
        )`,
        roomCondition
      ].filter((f): f is string => !!f),
      completed: [
        filterFeature ? `(${filterFeature})` : undefined,
        `(
          (
            (ad.current_stage_status = '${stageStatusDoc.HOAN_THANH_VAN_BAN}' OR ad.is_completed_doc = 1)
            AND EXISTS (
              SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment ia_chk
              WHERE ia_chk.document_id = incomming_documents.document_id
                AND ia_chk.receiver = @currentUserId
                AND ia_chk.role_process = 'processor'
                AND ia_chk.stage_status IN ('DA_XU_LY', 'HOAN_THANH')
            )
          )
          OR
          (ISNULL(ap.assignmentType, '') = 'VAN_THU' AND EXISTS (
            SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment ia
            WHERE ia.document_id = incomming_documents.document_id
              AND ia.receiver = @currentUserId
              AND ia.role_process = 'processor'
              AND ia.stage_status IN ('DA_XU_LY', 'HOAN_THANH')
          ) AND (
            ad.current_stage_status = '${stageStatusDoc.HOAN_THANH_VAN_BAN}'
            OR ad.is_completed_doc = 1
            OR
            NOT EXISTS (
              SELECT 1 
              FROM ${this.dbname}.dbo.audit a 
              INNER JOIN ${this.dbname}.dbo.incomming_assignment ia 
                ON ia.document_id = a.document_id AND ia.receiver = a.receiver
              WHERE a.document_id = incomming_documents.document_id 
                AND (a.user_id = @currentUserId OR a.created_by = @currentUserId OR a.acting_as = @currentUserId)
                AND ia.stage_status NOT IN ('DA_XU_LY', 'HOAN_THANH')
            )
          ))
          OR
          (ISNULL(ap.assignmentType, '') IN ('TRUONG_PHONG', 'TRINH_LANH_DAO') AND EXISTS (
            SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment au
            WHERE au.document_id = incomming_documents.document_id
              AND au.receiver = @currentUserId
              AND au.role_process = 'processor'
              AND au.stage_status IN ('DA_XU_LY', 'HOAN_THANH')
          ) AND (
            -- Hoặc văn bản hoàn thành tổng thể
            ad.current_stage_status = '${stageStatusDoc.HOAN_THANH_VAN_BAN}'
            OR ad.is_completed_doc = 1
            OR
            -- Hoặc người phân công (Trưởng phòng) đã hoàn thành / xác nhận
            EXISTS (
              SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment ia_tp
              WHERE ia_tp.document_id = incomming_documents.document_id
                AND ia_tp.receiver <> @currentUserId -- Không phải là bản thân người xử lý chính
                AND ia_tp.receiver = (
                  -- Tìm Trưởng phòng (người phân công từ Văn thư)
                  SELECT TOP 1 a.receiver FROM ${this.dbname}.dbo.audit a
                  WHERE a.document_id = incomming_documents.document_id
                    AND a.action_code = 'CHUYEN_XU_LY_PHAN_CONG'
                    ORDER BY a.id DESC
                )
                AND ia_tp.stage_status = '${stageStatusDoc.HOAN_THANH}'
            )
          ))
        )`,
        `EXISTS (SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment ia WHERE ia.document_id = incomming_documents.document_id AND ia.receiver = @currentUserId AND ia.role_process = 'processor')`,
        roomCondition
      ].filter((f): f is string => !!f),
      notComplete: [
        filterFeature ? `(${filterFeature})` : undefined,
        `( au.stage_status = '${stageStatusDoc.CHUA_XU_LY}' )`,
        `ISNULL(af.is_completed_doc, 0) = 1`,
        `au.deadline IS NOT NULL AND au.deadline < GETDATE()`,
        roomCondition
      ].filter((f): f is string => !!f),
      // [YÊU CẦU MỚI]: Văn bản chưa hoàn thành - người phân công đã hoàn thành văn bản
      // nhưng người xử lý / phối hợp chưa xử lý xong
      // Trường hợp 1: stage_status = CHUA_HOAN_THANH (quá hạn, bị đánh dấu bởi hệ thống)
      // Trường hợp 2: is_completed_doc = 1 VÀ cá nhân vẫn CHUA_XU_LY (lãnh đạo hoàn thành nhưng cá nhân chưa xử lý)
      notDone: [
        filterFeature ? `(${filterFeature})` : undefined,
        `(
          au.stage_status = '${stageStatusDoc.CHUA_HOAN_THANH}'
          OR (
            ISNULL(af.is_completed_doc, 0) = 1
            AND au.stage_status = '${stageStatusDoc.CHUA_XU_LY}'
          )
        )`,
        roomCondition
      ].filter((f): f is string => !!f),
    };

    if (type && typeFilters[type]) {
      where.push(...typeFilters[type]);
    }

    let whereClause = '';
    if (where.length) {
      whereClause = ' WHERE ' + where.join(' AND ') + ' AND incomming_documents.status = 1';
    } else {
      whereClause = ' WHERE incomming_documents.status = 1';
    }


    return whereClause;
  }

  /**
   * PHASE 7: Build SELECT Fields
   * Build SELECT fields based on config
   */
  private async phase7_buildSelectFields(
    processFn: string | undefined,
    _userId: string,
    allViewFields?: string[],
    safeType?: string,
    assignmentDateRange?: { startDate?: string; endDate?: string },
  ) {
    const phaseStart = Date.now();

    const excludeKeys = ['files', 'statusCode', 'status_code', 'userDeadline', 'user_deadline'];
    const { dbKeys, aliases, allViewFields: viewFields } = await this.configurationService.buildSelectFieldsNew(
      'incomming_documents',
      excludeKeys,
      processFn
    );

    const finalViewFields = allViewFields || viewFields;

    const keyDefaultParts: string[] = [];

    const { isUserFlow, isDocFlow } = this.phase4_validateType(safeType);
    if (isUserFlow) {
      keyDefaultParts.push('au.deadline AS user_deadline');
    } else if (isDocFlow) {
      keyDefaultParts.push('ad.current_deadline AS user_deadline');
    } else {
      keyDefaultParts.push('NULL AS user_deadline');
    }
    aliases['userDeadline'] = 'user_deadline';

    if (finalViewFields.includes('statusCode') || finalViewFields.includes('status_code')) {
      keyDefaultParts.push(`af.current_action_code AS status_code`);
    }

    if (finalViewFields.includes('processors')) {
      const processorCreatedAtSql = this.buildAssignmentCreatedAtSql('ia', assignmentDateRange);
      keyDefaultParts.push(`(SELECT TOP 1 ia.receiver FROM ${this.dbname}.dbo.incomming_assignment ia WHERE ia.document_id = incomming_documents.document_id AND ia.stage_status = 'CHUA_XU_LY' AND ia.role_process = 'processor'${processorCreatedAtSql} ORDER BY ia.created_at DESC ) AS processors`);
    }

    if (safeType === 'deadline') {
      keyDefaultParts.push('wsh.suggested_handling AS suggestedHandling');
      aliases['suggestedHandling'] = 'suggested_handling';
    }

    keyDefaultParts.push(`CASE WHEN EXISTS ( SELECT 1 FROM document_star ds WHERE ds.document_id = incomming_documents.document_id AND ds.user_id = @currentUserId AND ds.step = @processFn) THEN 1 ELSE 0 END AS isStar`);
    aliases['isStar'] = 'is_star';

    const keyDefault = keyDefaultParts.join(', ');
    const selectFieldsArray = [...(keyDefault ? [keyDefault] : []), ...dbKeys];


    return { selectFieldsArray, aliases };
  }

  /**
   * PHASE 8: Build ORDER BY
   * Build ORDER BY clause
   */
  private phase8_buildOrderBy(
    sort: any,
    aliases: Record<string, string>,
    customColumns?: Record<string, string>
  ) {
    const phaseStart = Date.now();

    const orderBy = ' ORDER BY ' + parseSort(
      sort,
      aliases,
      'incomming_documents',
      customColumns || { user_deadline: 'au.deadline', userDeadline: 'au.deadline' }
    );


    return orderBy;
  }

  /**
   * PHASE 9: Build SQL Queries
   * Build final SQL statements
   */
  private phase9_buildSqlQueries(
    selectFieldsArray: string[],
    joinClause: string,
    whereClause: string,
    orderBy: string,
    _offset: number,
    _limit: number
  ) {
    const phaseStart = Date.now();

    const selectFields = selectFieldsArray.join(', ');
    const totalSql = `SELECT COUNT(*) AS total FROM ${this.dbname}.dbo.incomming_documents ${joinClause} ${whereClause} OPTION (RECOMPILE)`;
    const rowsSql = `SELECT ${selectFields} FROM ${this.dbname}.dbo.incomming_documents ${joinClause} ${whereClause} ${orderBy} OFFSET @offsetNum ROWS FETCH NEXT @limitNum ROWS ONLY OPTION (RECOMPILE)`;
    // console.log(rowsSql);

    return { totalSql, rowsSql };
  }

  /**
   * PHASE 10: Execute SQL & Map Results
   * Execute queries and map results
   */
  private async phase10_executeAndMapResults(
    pool: sql.ConnectionPool,
    totalSql: string,
    rowsSql: string,
    page: number,
    limit: number,
    countOnly: string | undefined,
    userContext: any,
    receiverUnit: any,
    aliases: Record<string, string>,
    authority: string | undefined,
    type: string | undefined,
    isExport: string | undefined,
    startTime: number,
    bindQueryParams?: (request: sql.Request) => sql.Request,
    assignmentDateRange?: { startDate?: string; endDate?: string },
  ) {
    const phaseStart = Date.now();
    if (isExport === 'true') {
      return this.executeAndMapForExport(pool, totalSql, rowsSql, page, limit,
        countOnly, userContext, receiverUnit, aliases, authority, type, bindQueryParams);
    }

    const result = await this.executeAndMap(
      pool,
      totalSql,
      rowsSql,
      page,
      limit,
      countOnly,
      userContext,
      receiverUnit,
      aliases,
      authority,
      type,
      isExport,
      bindQueryParams,
      assignmentDateRange,
      true,
    );


    const totalTime = Date.now() - startTime;

    return result;
  }

  // ==================== MAIN FUNCTION ====================

  /**
   * Main function: List documents for main process
   * Orchestrates 10 phases of document listing
   */
  async listDocumentsMainProcessDynamic(query: ListDocumentsDto, userId: string, authorId?: string) {
    try {
      // Handle authorization
      if (query.authority === 'true' && authorId) {
        userId = authorId;
      }

      // Get connection pool
      const pool = await this.traceMainProcessStep(
        'incoming.mainProcess.getPool',
        {},
        () => this.getPool(),
      );

      const timings: Record<string, number> = {};
      let currentMark = Date.now();

      // PHASE 1: Parse & Initialize
      const phase1Result = this.phase1_parseAndInitialize(query);
      const { type, page, limit, offset, filter, sort, processFn, authority, isExport, countOnly, tab, urgencyValue, isRoomFilter, roomCondition, startTime } = phase1Result;
      const receiveDateFilter = filter?.receiveDate;
      const assignmentEndDateRaw = receiveDateFilter?.endDate;
      const assignmentDateRange = {
        startDate: receiveDateFilter?.startDate,
        endDate: /^\d{4}-\d{2}-\d{2}$/.test(assignmentEndDateRaw || '')
          ? `${assignmentEndDateRaw} 23:59:59.997`
          : assignmentEndDateRaw,
      };
      const userDeadlineFilter = filter?.userDeadline ?? filter?.user_deadline;
      const userDeadlineEndDateRaw = userDeadlineFilter?.endDate;
      const userDeadlineRange = userDeadlineFilter ? {
        startDate: userDeadlineFilter?.startDate,
        endDate: /^\d{4}-\d{2}-\d{2}$/.test(userDeadlineEndDateRaw || '')
          ? `${userDeadlineEndDateRaw} 23:59:59.997`
          : userDeadlineEndDateRaw,
      } : null;
      timings['Phase 1: Parse & Initialize'] = Date.now() - currentMark;
      currentMark = Date.now();

      // PHASE 2: Get Context (user roles, feature config, receiver unit)
      const { userContext, featureManagement, receiverUnit } = await this.traceMainProcessStep(
        'incoming.mainProcess.getContext',
        { 'app.request.process_fn': processFn || '' },
        () => this.phase2_getContext(userId, processFn, pool),
      );
      timings['Phase 2: Get Context'] = Date.now() - currentMark;
      currentMark = Date.now();

      // PHASE 3: Build Criteria & Filters
      const { filterFeature, filterJoins } = this.phase3_buildCriteriaAndFilters(filter, featureManagement);
      timings['Phase 3: Build Criteria & Filters'] = Date.now() - currentMark;
      currentMark = Date.now();

      // PHASE 4: Validate Type
      const { isUserFlow, isDocFlow, safeType } = this.phase4_validateType(type);
      timings['Phase 4: Validate Type'] = Date.now() - currentMark;
      currentMark = Date.now();

      // PHASE 5: Build JOIN Clause
      const joinClause = this.phase5_buildJoinClause(isUserFlow, isDocFlow, safeType, userId, tab, filterJoins, assignmentDateRange);
      timings['Phase 5: Build JOIN Clause'] = Date.now() - currentMark;
      currentMark = Date.now();

      // PHASE 6: Build WHERE Clause
      const whereClause = this.phase6_buildWhereClause(type!, filter, userId, processFn, filterFeature, isRoomFilter, roomCondition, urgencyValue, undefined, userDeadlineRange);
      timings['Phase 6: Build WHERE Clause'] = Date.now() - currentMark;
      currentMark = Date.now();

      // PHASE 7: Build SELECT Fields
      const { selectFieldsArray, aliases } = await this.traceMainProcessStep(
        'incoming.mainProcess.buildSelectFields',
        {
          'app.request.process_fn': processFn || '',
          'app.request.type': safeType,
        },
        () => this.phase7_buildSelectFields(processFn, userId, undefined, safeType, assignmentDateRange),
      );
      timings['Phase 7: Build SELECT Fields'] = Date.now() - currentMark;
      currentMark = Date.now();

      // PHASE 8: Build ORDER BY
      const orderBy = this.phase8_buildOrderBy(
        sort,
        aliases,
        isDocFlow
          ? { user_deadline: 'ad.current_deadline', userDeadline: 'ad.current_deadline' }
          : { user_deadline: 'au.deadline', userDeadline: 'au.deadline' }
      );
      timings['Phase 8: Build ORDER BY'] = Date.now() - currentMark;
      currentMark = Date.now();

      // PHASE 9: Build SQL Queries
      const { totalSql, rowsSql } = this.phase9_buildSqlQueries(selectFieldsArray, joinClause, whereClause, orderBy, offset, limit);
      timings['Phase 9: Build SQL Queries'] = Date.now() - currentMark;
      currentMark = Date.now();

      const processFnValue = String(processFn);
      const bindMainListQueryParams = (request: sql.Request) => {
        request.input('currentUserId', sql.NVarChar(100), userId);
        request.input('processFn', sql.NVarChar(255), processFnValue);
        if (assignmentDateRange.startDate) {
          request.input('assignmentStartDate', sql.DateTime, assignmentDateRange.startDate);
        }
        if (assignmentDateRange.endDate) {
          request.input('assignmentEndDate', sql.DateTime, assignmentDateRange.endDate);
        }
        if (userDeadlineRange?.startDate) {
          request.input('userDeadlineStartDate', sql.DateTime, userDeadlineRange.startDate);
        }
        if (userDeadlineRange?.endDate) {
          request.input('userDeadlineEndDate', sql.DateTime, userDeadlineRange.endDate);
        }
        request.input('offsetNum', sql.Int, offset);
        request.input('limitNum', sql.Int, limit);
        return request;
      };
      // PHASE 10: Execute & Map Results
      const res = await this.traceMainProcessStep(
        'incoming.mainProcess.executeAndMapResults',
        {
          'app.request.page': page,
          'app.request.limit': limit,
          'app.request.type': type || '',
          'app.request.count_only': countOnly === 'true',
          'app.request.is_export': isExport === 'true',
        },
        () => this.phase10_executeAndMapResults(pool, totalSql, rowsSql, page, limit, countOnly, userContext, receiverUnit, aliases, authority, type, isExport, startTime, bindMainListQueryParams, assignmentDateRange),
      );
      timings['Phase 10: Execute & Map Results'] = Date.now() - currentMark;

      // Find slowest phase
      let slowestPhase = '';
      let maxTime = -1;
      for (const [phaseName, duration] of Object.entries(timings)) {
        if (duration > maxTime) {
          maxTime = duration;
          slowestPhase = phaseName;
        }
      }

      // // this.logger.log(`[TIMING] listDocumentsMainProcessDynamic timings: ${JSON.stringify(timings)}`);
      // // this.logger.log(`[TIMING] Slowest Phase: ${slowestPhase} (${maxTime}ms)`);

      return res;
    } catch (error) {
      this.logger.error({
        message: 'Lỗi xảy ra trong listDocumentsMainProcessDynamic',
        error: error?.message || error,
        stack: error?.stack,
        query,
        userId,
        authorId,
      });
      throw error;
    }
  }

  async listDocumentsReceiveDynamic(query: ListDocumentsDto, userId: string, authorId?: string) {
    const { type, page = 1, limit = 20, filter, sort, processFn, processFnAll, authority, isExport, countOnly } = query;
    const pool = await this.getPool();
    const where: string[] = [];

    if (authority === 'true' && authorId) userId = authorId;

    const { userContext, featureManagement, receiverUnit } = await this.getListContext(userId, processFn, pool);
    const criteria = this.buildCriteria(filter);

    const featureCriteria = featureManagement?.criteria ?? [];
    let { sql: filterFeature, joins: filterJoins } = buildDocumentCriteriaHelper([...featureCriteria, ...criteria], 'incomming_documents', featureManagement);

    let filterFeatureWaiting = filterFeature;
    let filterFeatureSubmited = filterFeature;

    let mapping: { waiting: string; submited: string } | null = null;
    if (processFnAll) {
      const [waiting, submited] = processFnAll.split(',');
      if (waiting && submited) {
        mapping = { waiting: waiting.trim(), submited: submited.trim() };
      }
    }

    if (type === 'all' && mapping) {
      const [featureManagementWaiting, featureManagementSubmited] = await Promise.all([
        this.featureManagementRepo.findOne({ where: { code: mapping.waiting, status: 1, statusFeature: StatusFeature.ACTIVE } }),
        this.featureManagementRepo.findOne({ where: { code: mapping.submited, status: 1, statusFeature: StatusFeature.ACTIVE } })
      ]);

      const joinsSet = new Set<string>();
      if (filterJoins) joinsSet.add(filterJoins);

      if (featureManagementWaiting) {
        const waitingFeatureCriteria = featureManagementWaiting.criteria ?? [];
        const { sql: sqlWaiting, joins: joinsWaiting } = buildDocumentCriteriaHelper([...waitingFeatureCriteria, ...criteria], 'incomming_documents', featureManagementWaiting);
        filterFeatureWaiting = sqlWaiting;
        if (joinsWaiting) joinsSet.add(joinsWaiting);
      }

      if (featureManagementSubmited) {
        const submitedFeatureCriteria = featureManagementSubmited.criteria ?? [];
        const { sql: sqlSubmited, joins: joinsSubmited } = buildDocumentCriteriaHelper([...submitedFeatureCriteria, ...criteria], 'incomming_documents', featureManagementSubmited);
        filterFeatureSubmited = sqlSubmited;
        if (joinsSubmited) joinsSet.add(joinsSubmited);
      }

      filterJoins = Array.from(joinsSet).join(' ');
    }

    const ALLOWED_TYPES = ['waiting', 'submited', 'all'] as const;
    if (!type || !ALLOWED_TYPES.includes(type as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: ALLOWED_TYPES,
      });
    }

    // Lọc trùng: Nếu đã nhân bản sang phòng/ban của mình (clone) thì chỉ hiển thị bản con, không hiển thị bản gốc
    if (receiverUnit) {
      where.push(`(
        incomming_documents.receiver_unit = @receiverUnit
        OR (
          incomming_documents.parent_doc IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM ${this.dbname}.dbo.incomming_documents child
            WHERE child.parent_doc = incomming_documents.document_id
              AND child.receiver_unit = @receiverUnit
          )
        )
      )`);
    }

    const safeType = type ?? 'waiting';

    const receiverFilter = receiverUnit
      ? `(
          a.receiver = @currentUserId
          OR a.receiver = @receiverUnit
        )`
      : `(a.receiver = @currentUserId)`;

    let joinClause = `
      LEFT JOIN ${this.dbname}.dbo.incomming_current_state af
        ON af.document_id = incomming_documents.document_id
      LEFT JOIN ${this.dbname}.dbo.organization_units ou_sender
        ON ou_sender.id = incomming_documents.sender_unit
      LEFT JOIN ${this.dbname}.dbo.custom_sender_units csu_sender
        ON csu_sender.id = incomming_documents.sender_unit`;

    // Văn bản có sao
    if (filter?.isStar === '1' || filter?.isStar === 'true') {
      where.push(` EXISTS ( SELECT 1 FROM document_star ds WHERE ds.document_id = incomming_documents.document_id AND ds.user_id = @currentUserId AND ds.step = @processFn ) `);
    }
    if (filter?.isStar === '0' || filter?.isStar === 'false') {
      where.push(` NOT EXISTS ( SELECT 1 FROM document_star ds WHERE ds.document_id = incomming_documents.document_id AND ds.user_id = @currentUserId AND ds.step = @processFn ) `);
    }

    // Lọc theo processDeadline / process_deadline
    const processDeadlineVal = filter?.processDeadline ?? filter?.process_deadline;
    if (processDeadlineVal) {
      const val = String(processDeadlineVal).trim().toUpperCase();
      let subQueryCond = '';
      if (val === 'CON_HAN') {
        subQueryCond = `(a.deadline >= DATEADD(day, 2, GETDATE()))`;
      } else if (val === 'QUA_HAN') {
        subQueryCond = `(a.deadline < GETDATE())`;
      } else if (val === 'SAP_HET_HAN') {
        subQueryCond = `(a.deadline >= GETDATE() AND a.deadline < DATEADD(day, 2, GETDATE()))`;
      } else if (val === 'KHONG_CO_HAN') {
        subQueryCond = `(a.deadline IS NULL)`;
      }

      if (subQueryCond) {
        where.push(`EXISTS (
          SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment a
          WHERE a.document_id = incomming_documents.document_id
            AND (${receiverFilter})
            AND ${subQueryCond}
        )`);
      }
    }

    // Lọc theo mảng statusCode nếu có
    const targetStatusFilter = filter?.statusCode ?? filter?.status_code ?? filter?.status;
    if (targetStatusFilter) {
      let rawStatuses: string[] = [];
      if (Array.isArray(targetStatusFilter)) {
        rawStatuses = targetStatusFilter;
      } else if (typeof targetStatusFilter === 'object' && targetStatusFilter !== null) {
        rawStatuses = Object.values(targetStatusFilter);
      } else if (typeof targetStatusFilter === 'string') {
        rawStatuses = [targetStatusFilter];
      }
      if (rawStatuses.length > 0) {
        const statusSql = buildStatusCodeFilterClause(rawStatuses, this.dbname, 'receive');
        if (statusSql) {
          where.push(statusSql);
        }
      }
    }
    if (filterJoins) joinClause += ' ' + filterJoins;
    if (safeType === 'deadline') {
      joinClause += ` OUTER APPLY (
        SELECT TOP 1 suggested_handling
        FROM incomming_suggested_handlings
        WHERE document_id = incomming_documents.document_id
        ORDER BY created_at DESC
      ) wsh`;
    }




    const typeFilters: Record<string, string[]> = {
      waiting: [
        filterFeatureWaiting ? `(${filterFeatureWaiting})` : undefined,
        `EXISTS (
          SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment a
          WHERE a.document_id = incomming_documents.document_id
            AND a.stage_status = '${stageStatusDoc.CHUA_XU_LY}'
            AND (${receiverFilter})
            AND (a.role_process IS NULL OR a.role_process <> 'viewer')
        )`,
      ].filter((f): f is string => !!f),
      submited: [
        filterFeatureSubmited ? `(${filterFeatureSubmited})` : undefined,
        `(incomming_documents.status_code != '1')`,
        `EXISTS (
          SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment a
          WHERE a.document_id = incomming_documents.document_id
            AND ( a.stage_status = '${stageStatusDoc.DA_XU_LY}' OR a.stage_status = '${stageStatusDoc.DA_PHAN_CONG}' )
            AND (${receiverFilter})
        )`,
        // Loại trừ văn bản đang chờ ký (action_code = TAO_SAO_Y hoặc TRINH_KY)
        `(af.current_action_code IS NULL OR af.current_action_code NOT IN ('TAO_SAO_Y', 'TRINH_KY'))`,
      ].filter((f): f is string => !!f),
      all: [
        `(
          (
            ${filterFeatureWaiting ? `(${filterFeatureWaiting}) AND ` : ''}(EXISTS (
              SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment a
              WHERE a.document_id = incomming_documents.document_id
                AND a.stage_status = '${stageStatusDoc.CHUA_XU_LY}'
                AND (${receiverFilter})
                AND (a.role_process IS NULL OR a.role_process <> 'viewer')
            ))
          )
          OR
          (
            ${filterFeatureSubmited ? `(${filterFeatureSubmited}) AND ` : ''}(
              (incomming_documents.status_code != '1')
              AND EXISTS (
                SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment a
                WHERE a.document_id = incomming_documents.document_id
                  AND ( a.stage_status = '${stageStatusDoc.DA_XU_LY}' OR a.stage_status = '${stageStatusDoc.DA_PHAN_CONG}' )
                  AND (${receiverFilter})
              )
              AND (af.current_action_code IS NULL OR af.current_action_code NOT IN ('TAO_SAO_Y', 'TRINH_KY'))
            )
          )
        )`,
      ].filter((f): f is string => !!f),
    };

    if (type && typeFilters[type]) where.push(...typeFilters[type]);

    let whereClause = '';
    if (where.length) {
      whereClause = ' WHERE ' + where.join(' AND ') + ' AND incomming_documents.status = 1';
    } else {
      whereClause = ' WHERE incomming_documents.status = 1';
    }
    whereClause += `AND abstract_note IS NOT NULL`;

    let limitNum = Math.min(Number(limit) || 20, 1000);
    const pageNum = Math.max(Number(page) || 1, 1);
    if (isExport === 'true') {
      limitNum = 9999;
    }
    const offsetNum = (pageNum - 1) * limitNum;

    const excludeKeys = ['files', 'statusCode', 'status_code', 'userDeadline', 'user_deadline'];
    const { dbKeys, aliases, allViewFields } = await this.configurationService.buildSelectFieldsNew('incomming_documents', excludeKeys, processFn);
    const keyDefaultParts: string[] = [];
    if (allViewFields.includes('userDeadline') || allViewFields.includes('user_deadline')) {
      aliases['userDeadline'] = 'user_deadline';
      aliases['userDeadline'] = 'userDeadline';
    }
    if (allViewFields.includes('statusCode') || allViewFields.includes('status_code')) keyDefaultParts.push(`af.current_action_code AS status_code`);
    if (allViewFields.includes('processors')) keyDefaultParts.push(`(SELECT TOP 1 ia.receiver FROM ${this.dbname}.dbo.incomming_assignment ia WHERE ia.document_id = incomming_documents.document_id AND ia.stage_status = 'CHUA_XU_LY' AND ia.role_process = 'processor' ORDER BY ia.created_at DESC) AS processors`);
    if (safeType === 'deadline') {
      keyDefaultParts.push('wsh.suggested_handling AS suggestedHandling');
      aliases['suggestedHandling'] = 'suggested_handling';
    }
    keyDefaultParts.push(`CASE WHEN EXISTS ( SELECT 1 FROM document_star ds WHERE ds.document_id = incomming_documents.document_id AND ds.user_id = @currentUserId AND ds.step = @processFn) THEN 1 ELSE 0 END AS isStar`);

    //Bổ xung copy_to_internal để kiểm tra hiển thị nút "Từ chối tiếp nhận"
    keyDefaultParts.push(' copy_to_internal ');

    // Lấy tên đơn vị gửi (ưu tiên organization_units, sau đó custom_sender_units)
    keyDefaultParts.push(`COALESCE(ou_sender.name, csu_sender.name, incomming_documents.sender_unit) AS sender_unit_name`);
    aliases['sender_unit_name'] = 'sender_unit_name';

    // Luôn select to_book_code, book_document_id để xác định VB điện tử vs thêm mới
    const dbKeysJoined = dbKeys.join(' ');
    if (!dbKeysJoined.includes('to_book_code')) {
      keyDefaultParts.push(' incomming_documents.to_book_code AS to_book_code ');
    }
    if (!dbKeysJoined.includes('book_document_id')) {
      keyDefaultParts.push(' incomming_documents.book_document_id AS book_document_id ');
    }

    aliases['isStar'] = 'is_star';
    const keyDefault = keyDefaultParts.join(', ');
    const selectFieldsArray = [...(keyDefault ? [keyDefault] : []), ...dbKeys];
    const orderBy = ' ORDER BY ' + parseSort(sort, aliases, 'incomming_documents', { user_deadline: 'incomming_documents.deadline', userDeadline: 'incomming_documents.deadline' });
    const selectFields = selectFieldsArray.join(', ');

    const totalSql = `SELECT COUNT(*) AS total FROM ${this.dbname}.dbo.incomming_documents ${joinClause} ${whereClause}`;
    const rowsSql = `SELECT ${selectFields} FROM ${this.dbname}.dbo.incomming_documents ${joinClause} ${whereClause} ${orderBy} OFFSET @offsetNum ROWS FETCH NEXT @limitNum ROWS ONLY`;

    const processFnValue = String(processFn);
    const assignmentDateRange = {
      startDate: filter?.receiveDate?.startDate,
      endDate: filter?.receiveDate?.endDate,
    };
    const bindReceiveQueryParams = (request: sql.Request) => {
      request.input('currentUserId', sql.NVarChar(100), userId);
      request.input('processFn', sql.NVarChar(255), processFnValue);
      if (receiverUnit) {
        request.input('receiverUnit', sql.NVarChar(100), String(receiverUnit));
      }
      request.input('offsetNum', sql.Int, offsetNum);
      request.input('limitNum', sql.Int, limitNum);
      return request;
    };

    const dataResult = await this.executeAndMap(
      pool,
      totalSql,
      rowsSql,
      pageNum,
      limitNum,
      countOnly,
      userContext,
      receiverUnit,
      aliases,
      authority,
      type,
      isExport,
      bindReceiveQueryParams,
      assignmentDateRange,
    );
    if ('items' in dataResult && dataResult.items) {
      const isAdmin = await checkAdminPermission(userId);
      dataResult.items.map((item: any) => {
        if (isAdmin) {
          item.isAdmin = true;
        }
        // Flag VB điện tử: toBookCode (Số đến) và bookDocumentId (Số VB đến) đều trống
        const toBookCodeVal = item.toBookCode ?? item.to_book_code;
        const bookDocIdVal = item.bookDocumentId ?? item.book_document_id;
        item.isElectronic = (!toBookCodeVal || toBookCodeVal === '-') && (!bookDocIdVal || bookDocIdVal === '-');

        if (Object.keys(item.flags).length && item.flags.canSaveBook) {
          if (item.availableActions.length === 0) {
            item.availableActions = [];
          }
          item.availableActions.push(
            {
              code: 'save_book',
              label: 'Lưu sổ',
              type: 'saveBook',
            }
          )
        }
        if (Object.keys(item.flags).length && item.flags.canReject) {
          if (item.availableActions.length === 0) {
            item.availableActions = [];
          }
          if (!item.availableActions.some((action: any) => action.code === 'reject')) {
            item.availableActions.push(
              {
                code: 'reject',
                label: 'Từ chối',
                type: 'reject',
              }
            )
          }
        }
      })
    }
    return dataResult;
  }

  async listDocumentsForTask(
    query: ListDocumentsDto,
    originalUserId: string,
    effectiveUserId?: string
  ) {
    const startedAt = Date.now();
    const { page = 1, limit = 20, filter, sort, processFn, isExport, authority } = query;
    const pool = await this.getPool();
    const where: string[] = [];
    const timings: Record<string, number> = {};
    const mark = (label: string, from: number) => {
      timings[label] = Date.now() - from;
    };
    const getBoundParams = (request: sql.Request): Record<string, any> => {
      const boundParams: Record<string, any> = {};
      if (request && (request as any).parameters) {
        for (const key in (request as any).parameters) {
          boundParams[key] = (request as any).parameters[key]?.value;
        }
      }
      return boundParams;
    };

    // authority → dùng effective user
    let userId = originalUserId;
    if (authority === 'true' && effectiveUserId) userId = effectiveUserId;
    const groupStartedAt = Date.now();
    const groupUser = await this.groupUserService.findByCode(GROUP_CODES.VAN_THU);
    mark('groupUserService.findByCode', groupStartedAt);
    const listVT = groupUser?.data?.users?.map(u => u.id) || [];
    const isVanThu = listVT.includes(userId);
    const contextStartedAt = Date.now();
    const [userRoleRes, featureManagement, userRes] = await Promise.all([
      this.userService.getUserRole(userId),
      this.featureManagementRepo.findOne({
        where: { code: processFn, status: 1, statusFeature: StatusFeature.ACTIVE }
      }),
      pool.request()
        .input('currentUserId', sql.NVarChar(100), userId)
        .query(`SELECT id, parent AS parentId FROM ${this.dbname}.dbo.users WHERE id = @currentUserId`)
    ]);
    mark('context.parallel', contextStartedAt);

    const { roles } = userRoleRes;
    const receiverUnit = userRes.recordset[0]?.parentId || null;
    const userContext = { userId, roles, receiverUnit };

    // =========================
    // BUILD FILTER CRITERIA
    // =========================
    const stageStatusFilter = filter?.stage_status;
    if (filter?.stage_status) {
      delete filter.stage_status;
    }
    const criteria: Array<{ name: string; operator: string; value: string | string[] }> = [];
    const OR_SEARCH_KEYS = ['abstract_note', 'toBook'];
    const orSearchValues: string[] = [];

    if (filter && typeof filter === 'object') {
      Object.entries(filter).forEach(([key, value]) => {
        if (!value) return;
        // gom keyword cho OR
        if (OR_SEARCH_KEYS.includes(key)) {
          orSearchValues.push(String(value));
          return;
        }
        if (typeof value === 'object') {
          const val = value as { startDate?: string; endDate?: string; value?: string };
          if (val.startDate && val.endDate)
            criteria.push({ name: key, operator: 'between', value: [String(val.startDate), String(val.endDate)] });
          else if (val.startDate)
            criteria.push({ name: key, operator: 'gte', value: String(val.startDate) });
          else if (val.endDate)
            criteria.push({ name: key, operator: 'lte', value: String(val.endDate) });
          else if (val.value !== undefined)
            criteria.push({ name: key, operator: 'like', value: String(val.value) });
        } else {
          criteria.push({ name: key, operator: 'like', value: String(value) });
        }
      });
    }

    const featureCriteria = featureManagement?.criteria ?? [];
    const criteriaStartedAt = Date.now();
    const { sql: filterFeature, joins: filterJoins } =
      buildDocumentCriteriaHelper(
        [...featureCriteria, ...criteria],
        'incomming_documents',
        featureManagement
      );
    mark('buildDocumentCriteriaHelper', criteriaStartedAt);
    let orSearchSql = '';

    if (orSearchValues.length) {
      // FE gửi giống nhau
      orSearchSql = `
  (
    incomming_documents.abstract_note LIKE @searchKeyword
    OR incomming_documents.to_book LIKE @searchKeyword
  )
  `;
    }

    // =========================
    // ALLOWED STAGE STATUS
    // =========================
    const ALLOWED_STAGE_STATUSES = [
      'CREATE',
      'THU_HOI',
      'TAO_SAO_Y',
      'TRINH_KY',
    ];

    // =========================
    // JOIN AUDIT (CORE FIX)
    // =========================
    const unitCondition =
      isVanThu === true
        ? `
      OR (
        a.receiver IS NULL
        ${receiverUnit ? `AND a.receiver_unit = @receiverUnit` : 'AND 1 = 0'}
      )
    `
        : '';
    let joinClause = `
    OUTER APPLY (
      SELECT TOP 1
        a.document_id,
        a.receiver,
        a.receiver_unit,
        a.roleProcess,
        a.stage_status,
        a.action_code,
        a.deadline AS user_deadline
      FROM ${this.dbname}.dbo.audit a
      WHERE a.document_id = incomming_documents.document_id
        AND (
      (
        a.receiver IS NOT NULL
        AND a.receiver = @currentUserId
      )
      ${unitCondition}
    )
        AND a.stage_status NOT IN (${ALLOWED_STAGE_STATUSES.map(s => `'${s}'`).join(',')})
      ORDER BY
        CASE
          WHEN a.stage_status = '${stageStatusDoc.CHUA_XU_LY}' THEN 1
          WHEN a.stage_status = '${stageStatusDoc.TRA_LAI}' THEN 2
          WHEN a.stage_status = '${stageStatusDoc.HOAN_THANH_VAN_BAN}' THEN 3
          WHEN a.stage_status = '${stageStatusDoc.HOAN_THANH}' THEN 4
          ELSE 99
        END,
        a.id DESC
    ) la
  `;

    if (filterJoins) joinClause += ' ' + filterJoins;

    // =========================
    // WHERE
    // =========================

    if (filterFeature) where.push(`(${filterFeature})`);
    if (orSearchSql) where.push(orSearchSql);

    where.push('incomming_documents.status = 1');
    where.push('la.stage_status IS NOT NULL');
    if (stageStatusFilter) {
      where.push(`la.stage_status = @stageStatusFilter`);
    }

    const whereClause = ' WHERE ' + where.join(' AND ');

    // =========================
    // PAGINATION
    // =========================
    let limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    if (isExport === 'true') {
      limitNum = 9999;
    }
    const offsetNum = (pageNum - 1) * limitNum;

    // =========================
    // SELECT FIELDS
    // =========================
    const excludeKeys = ['files', 'statusCode', 'status_code', 'userDeadline', 'user_deadline'];
    const { dbKeys, aliases } =
      await this.configurationService.buildSelectFieldsNew(
        'incomming_documents',
        excludeKeys,
        processFn
      );

    const selectFields = `
    la.stage_status,
    CONCAT(
      ISNULL(incomming_documents.to_book, ''),
      CASE 
        WHEN incomming_documents.to_book IS NOT NULL 
          AND incomming_documents.abstract_note IS NOT NULL 
        THEN ' - ' ELSE '' 
      END,
      ISNULL(incomming_documents.abstract_note, '')
    ) AS toBookAbstractNote,
    ${dbKeys.join(', ')}
  `;

    const orderBy =
      ' ORDER BY ' +
      parseSort(sort, aliases, 'incomming_documents', {
        user_deadline: 'la.user_deadline',
        userDeadline: 'la.user_deadline',
      });

    // =========================
    // QUERY
    // =========================
    const totalSql = `
    SELECT COUNT(*) AS total
    FROM ${this.dbname}.dbo.incomming_documents
    ${joinClause}
    ${whereClause}
  `;

    const rowsSql = `
    SELECT ${selectFields}
    FROM ${this.dbname}.dbo.incomming_documents
    ${joinClause}
    ${whereClause}
    ${orderBy}
    OFFSET @offsetNum ROWS FETCH NEXT @limitNum ROWS ONLY
  `;

    const processFnValue = String(processFn);
    const bindTaskQueryParams = (request: sql.Request) => {
      request.input('currentUserId', sql.NVarChar(100), userId);
      request.input('processFn', sql.NVarChar(255), processFnValue);
      if (receiverUnit) {
        request.input('receiverUnit', sql.NVarChar(100), String(receiverUnit));
      }
      if (orSearchValues.length) {
        request.input('searchKeyword', sql.NVarChar(sql.MAX), `%${orSearchValues[0]}%`);
      }
      if (stageStatusFilter) {
        request.input('stageStatusFilter', sql.NVarChar(100), String(stageStatusFilter));
      }
      request.input('offsetNum', sql.Int, offsetNum);
      request.input('limitNum', sql.Int, limitNum);
      return request;
    };
    let totalResult, rowsResult;
    const totalRequest = bindTaskQueryParams(pool.request());
    const rowsRequest = bindTaskQueryParams(pool.request());
    const boundParams = getBoundParams(totalRequest);
    // this.logger.debug({
    //   message: 'incoming list/for-task start',
    //   processFn,
    //   userId,
    //   originalUserId,
    //   effectiveUserId,
    //   authority,
    //   page: pageNum,
    //   limit: limitNum,
    //   isExport,
    //   isVanThu,
    //   receiverUnit,
    //   filter,
    //   sort,
    //   stageStatusFilter,
    //   timings,
    //   boundParams,
    // });
    try {
      const totalStartedAt = Date.now();
      const rowsStartedAt = Date.now();
      [totalResult, rowsResult] = await Promise.all([
        totalRequest.query(totalSql).then((result) => {
          mark('sql.total', totalStartedAt);
          return result;
        }),
        rowsRequest.query(rowsSql).then((result) => {
          mark('sql.rows', rowsStartedAt);
          return result;
        }),
      ]);
    } catch (e) {
      const boundParams: Record<string, any> = {};
      try {
        if (totalRequest && (totalRequest as any).parameters) {
          for (const key in (totalRequest as any).parameters) {
            boundParams[key] = (totalRequest as any).parameters[key]?.value;
          }
        }
      } catch (paramErr) {
        this.logger.error('Lỗi khi đọc tham số bind task:', paramErr);
      }
      this.logger.error({
        message: 'Lỗi truy vấn dữ liệu SQL parallel (Task list)',
        error: e?.message || e,
        stack: e?.stack,
        boundParams,
        totalSql,
        rowsSql,
      });
      throw new InternalServerErrorException('Lỗi truy vấn dữ liệu');
    }

    const total = totalResult.recordset[0]?.total ?? 0;
    const items: DocumentRow[] = rowsResult.recordset;
    if (!items.length) {
      return {
        success: true,
        items: [],
        total: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
      };
    }

    // =========================
    // BPMN + MAP DATA (GIỮ NGUYÊN)
    // =========================
    // const bpmnVersions = [
    //   ...new Set(items.map(d => d.bpmn_version).filter(v => v && v !== 'NULL')),
    // ];

    // const bpmnEngineMap = new Map(
    //   await Promise.all(
    //     bpmnVersions.map(async v => {
    //       const xml = await this.sqlRepo.getBpmnFile(v);
    //       if (!xml) return [v, { process: null, indexes: null, userParent: receiverUnit }] as const;
    //       const { process } = await this.bpmnEngine.loadBpmnFromString(xml);
    //       return [v, { process, indexes: this.bpmnEngine.buildIndexes(process), userParent: receiverUnit }] as const;
    //     })
    //   )
    // );

    // const detailedItems = await this.mapDocumentDetails(items, userContext, aliases);
    const detailedItems = items;

    const mapStartedAt = Date.now();
    const detailedItemsMapped =
      await this.mapDocKeysForList(detailedItems, aliases, undefined, userContext);
    mark('mapDocKeysForList', mapStartedAt);

    const totalDuration = Date.now() - startedAt;
    // // this.logger.log(`[listDocumentsForTask] Finished. Total time: ${totalDuration}ms. Timings: ${JSON.stringify(timings)}`);

    return {
      success: true,
      items: detailedItemsMapped,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async listReplacedDocuments(userId: string, incomingId: string, query: any) {
    const { page = 1, limit = 20, filter, sort } = query;
    const pool = await this.getPool();

    const limitNum = Math.min(Number(limit) || 20, 10000);
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;

    // =========================
    // 1) incoming mới -> outgoing_new_document_id
    // =========================
    const req1 = pool.request();
    req1.input('incomingId', sql.NVarChar, incomingId);

    const incomingRes = await req1.query(`
    SELECT TOP 1
      document_id,
      copy_to_internal,
      receiver_unit
    FROM ${this.dbname}.dbo.incomming_documents
    WHERE document_id = @incomingId
  `);

    const outgoingNewDocumentId = incomingRes.recordset?.[0]?.copy_to_internal;
    if (!outgoingNewDocumentId) {
      return {
        success: true,
        items: [],
        total: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
        message: 'Không tìm thấy incoming hoặc không có copy_to_internal',
      };
    }

    // =========================
    // 2) outgoing mới -> outgoing_old_document_id (doc_replacement)
    // =========================
    const req2 = pool.request();
    req2.input('outgoingNewDocumentId', sql.NVarChar, String(outgoingNewDocumentId));

    const outgoingOldRes = await req2.query(`
    SELECT TOP 1
      JSON_VALUE(j.value, '$.documentId') AS outgoing_old_document_id
    FROM ${this.dbname}.dbo.outgoing_documents od
    CROSS APPLY OPENJSON(
      CASE
        WHEN ISJSON(od.doc_replacement) = 1 THEN od.doc_replacement
        ELSE '[]'
      END
    ) j
    WHERE od.document_id = @outgoingNewDocumentId
  `);

    const outgoingOldDocumentId = outgoingOldRes.recordset?.[0]?.outgoing_old_document_id;
    if (!outgoingOldDocumentId) {
      return {
        success: true,
        items: [],
        total: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
        message: 'VB đi mới không có doc_replacement hoặc parse không ra documentId',
      };
    }

    // =========================
    // 3) Lấy receiver_unit của user hiện tại (đơn vị đang xem)
    // =========================
    const reqUser = pool.request();
    reqUser.input('userId', sql.NVarChar, userId);

    const userRes = await reqUser.query(`
    SELECT TOP 1
      parent AS receiver_unit
    FROM ${this.dbname}.dbo.users
    WHERE id = @userId
  `);

    const currentUserReceiverUnit = userRes.recordset?.[0]?.receiver_unit || null;

    // =========================
    // 4) Build WHERE + filter chuẩn (giống các module list khác)
    // =========================
    const where: string[] = [];
    const params: Array<{ key: string; type: any; value: any }> = [];

    // core condition: incoming bị thay thế
    where.push(`incomming_documents.copy_to_internal = @outgoingOldDocumentId`);
    where.push(`incomming_documents.status = 3`);

    // Lọc theo receiver_unit của user hiện tại (đơn vị đang xem)
    // Chỉ hiển thị incoming document thay thế được gửi đến đơn vị của user đang xem
    const isAdmin = await checkAdminPermission(userId);
    if (!isAdmin) {
      if (currentUserReceiverUnit) {
        where.push(`incomming_documents.receiver_unit = @receiverUnit`);
        params.push({
          key: 'receiverUnit',
          type: sql.NVarChar,
          value: currentUserReceiverUnit,
        });
      } else {
        // Nếu user không có receiver_unit, lọc theo userId
        where.push(`incomming_documents.receiver_unit = @receiverUnit`);
        params.push({
          key: 'receiverUnit',
          type: sql.NVarChar,
          value: userId,
        });
      }
    }


    params.push({
      key: 'outgoingOldDocumentId',
      type: sql.NVarChar,
      value: String(outgoingOldDocumentId),
    });

    // --- Filter: xử lý từng field theo kiểu dữ liệu ---
    // DB collation phân biệt dấu → dùng COLLATE Latin1_General_CI_AI cho text search
    const COLLATE = 'COLLATE Latin1_General_CI_AI';
    const searchConditions: string[] = [];

    if (filter && typeof filter === 'object') {
      for (const [key, value] of Object.entries(filter)) {
        if (!value) continue;

        // Date fields: documentDate, receiveDate
        if (['documentDate', 'document_date', 'receiveDate', 'receive_date'].includes(key)) {
          const dbCol = (key === 'receiveDate' || key === 'receive_date') ? 'receive_date' : 'document_date';
          if (typeof value === 'object') {
            // Date range: {startDate, endDate} → AND filter
            const v = value as { startDate?: string; endDate?: string };
            if (v.startDate) {
              let start = String(v.startDate).replace(/'/g, "''");
              if (/^\d{4}-\d{2}-\d{2}$/.test(start)) start += ' 00:00:00.000';
              where.push(`incomming_documents.${dbCol} >= '${start}'`);
            }
            if (v.endDate) {
              let end = String(v.endDate).replace(/'/g, "''");
              if (/^\d{4}-\d{2}-\d{2}$/.test(end)) end += ' 23:59:59.997';
              where.push(`incomming_documents.${dbCol} <= '${end}'`);
            }
          } else if (typeof value === 'string' && value.trim()) {
            // Plain text: convert date → DD/MM/YYYY rồi LIKE (OR)
            const safeVal = value.replace(/'/g, "''").trim();
            searchConditions.push(
              `CONVERT(VARCHAR, incomming_documents.${dbCol}, 103) LIKE '%${safeVal}%'`
            );
          }
          continue;
        }

        // Loại văn bản: exact match (AND filter, không phải OR)
        if (key === 'documentType' || key === 'document_type') {
          const safeVal = String(value).replace(/'/g, "''").trim();
          if (safeVal) {
            where.push(`incomming_documents.document_type = N'${safeVal}'`);
          }
          continue;
        }

        // Loại văn bản quan trọng (star)
        if (key === 'isStar' || key === 'is_star') {
          if (value === 'true' || value === '1' || value === true) {
            where.push(`EXISTS (SELECT 1 FROM ${this.dbname}.dbo.document_star ds WHERE ds.document_id = incomming_documents.document_id)`);
          }
          continue;
        }

        // Chỉ xử lý text search khi value là string
        if (typeof value !== 'string') continue;
        const safeVal = String(value).replace(/'/g, "''").trim();
        if (!safeVal) continue;

        switch (key) {
          case 'toBook':
          case 'to_book':
            searchConditions.push(`incomming_documents.to_book ${COLLATE} LIKE N'%${safeVal}%'`);
            break;
          case 'abstractNote':
          case 'abstract_note':
            searchConditions.push(`incomming_documents.abstract_note ${COLLATE} LIKE N'%${safeVal}%'`);
            break;
          case 'senderUnit':
          case 'sender_unit':
            // sender_unit lưu ID → tìm tên trong organization_units
            searchConditions.push(
              `incomming_documents.sender_unit IN (SELECT id FROM ${this.dbname}.dbo.organization_units WHERE name ${COLLATE} LIKE N'%${safeVal}%')`
            );
            break;
        }
      }
    }
    if (searchConditions.length) {
      where.push(`(${searchConditions.join(' OR ')})`);
    }

    const whereClause = ` WHERE ${where.join(' AND ')}`;

    // =========================
    // 4) Sort chuẩn bằng parseSort (giống các module list khác)
    // =========================
    const aliases: Record<string, string> = {
      document_date: 'documentDate',
      receive_date: 'receiveDate',
      to_book: 'toBook',
      to_book_code: 'toBookCode',
      to_book_date: 'toBookDate',
      sender_unit: 'senderUnit',
      abstract_note: 'abstractNote',
      document_type: 'documentType',
      receive_method: 'receiveMethod',
      second_book: 'secondBook',
      private_level: 'privateLevel',
      urgency_level: 'urgencyLevel',
      signer: 'signer',
      deadline: 'deadline',
      fileids: 'files',
      updated_at: 'updatedAt',
      created_at: 'createdAt',
      document_id: 'documentId',
      copy_to_internal: 'copyToInternal',
    };
    // Parse sort nhưng không dùng prefix table vì sẽ gây lỗi trong CTE
    const orderByRaw = parseSort(sort, aliases, 'incomming_documents');
    // Xóa prefix [incomming_documents]. từ orderBy để dùng trong CTE
    const orderBy = orderByRaw.replace(/\[incomming_documents\]\./g, '');

    // =========================
    // 5) Query total + rows
    // =========================
    // Sử dụng ROW_NUMBER để chỉ lấy incoming document mới nhất cho mỗi to_book
    // (tránh hiển thị trùng lặp khi có nhiều incoming document cho cùng một văn bản đi)
    const totalSql = `
    SELECT COUNT(DISTINCT incomming_documents.to_book) AS total
    FROM ${this.dbname}.dbo.incomming_documents
    ${whereClause}
  `;

    // Sửa query để tránh lỗi multi-part identifier trong CTE
    // Thay vì dùng incomming_documents.*, chỉ định nghĩa rõ các column cần thiết
    // Và xử lý ORDER BY bên ngoài CTE để tránh lỗi binding
    const rowsSql = `
    WITH RankedDocuments AS (
      SELECT
        incomming_documents.document_id,
        incomming_documents.copy_to_internal,
        incomming_documents.receiver_unit,
        incomming_documents.to_book,
        incomming_documents.to_book_code,
        incomming_documents.to_book_date,
        incomming_documents.document_date,
        incomming_documents.receive_date,
        incomming_documents.receive_method,
        incomming_documents.deadline,
        incomming_documents.second_book,
        incomming_documents.private_level,
        incomming_documents.urgency_level,
        incomming_documents.document_type,
        incomming_documents.document_field,
        incomming_documents.signer,
        incomming_documents.abstract_note,
        incomming_documents.sender_unit,
        incomming_documents.status,
        incomming_documents.parent_doc,
        incomming_documents.type_process_doc,
        incomming_documents.bpmn_version,
        incomming_documents.resolution_deadline,
        incomming_documents.copy_count,
        incomming_documents.page_count,
        incomming_documents.view_group,
        incomming_documents.directive_comment,
        incomming_documents.created_at,
        incomming_documents.updated_at,
        ROW_NUMBER() OVER (PARTITION BY incomming_documents.to_book ORDER BY incomming_documents.created_at DESC) AS rn
      FROM ${this.dbname}.dbo.incomming_documents
      ${whereClause}
    )
    SELECT
      document_id,
      copy_to_internal,
      receiver_unit,
      to_book,
      to_book_code,
      to_book_date,
      document_date,
      receive_date,
      receive_method,
      deadline,
      second_book,
      private_level,
      urgency_level,
      document_type,
      document_field,
      signer,
      abstract_note,
      sender_unit,
      status,
      parent_doc,
      type_process_doc,
      bpmn_version,
      resolution_deadline,
      copy_count,
      page_count,
      view_group,
      directive_comment,
      created_at,
      updated_at
    FROM RankedDocuments
    WHERE rn = 1
    ORDER BY ${orderBy}
    OFFSET @offsetNum ROWS FETCH NEXT @limitNum ROWS ONLY
  `;

    const totalReq = pool.request();
    const rowsReq = pool.request();

    for (const p of params) {
      totalReq.input(p.key, p.type, p.value);
      rowsReq.input(p.key, p.type, p.value);
    }
    totalReq.input('offsetNum', sql.Int, offsetNum);
    totalReq.input('limitNum', sql.Int, limitNum);
    rowsReq.input('offsetNum', sql.Int, offsetNum);
    rowsReq.input('limitNum', sql.Int, limitNum);

    const [totalResult, rowsResult] = await Promise.all([
      totalReq.query(totalSql),
      rowsReq.query(rowsSql),
    ]);

    const total = totalResult.recordset?.[0]?.total ?? 0;
    const items = rowsResult.recordset ?? [];

    // ✅ map camelCase + enrichment giống các API list khác
    const camelItems = items.map(this.mapRowToCamelCase);
    const mappedItems = await this.mapDocKeysForList(camelItems);

    return {
      success: true,
      items: mappedItems,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };



  }

  private toCamelCase = (str: string) =>
    str.replace(/_([a-zA-Z])/g, (_, g1) => g1.toUpperCase());

  private mapRowToCamelCase = (row: Record<string, any>) => {
    const result: any = {};
    for (const key in row) {
      result[this.toCamelCase(key)] = row[key];
    }
    return result;
  };


  /**
   * Wrapper cho export pipeline (get-list-export-excel)
   * FE gọi: /api/documents/get-list-export-excel?processFn=dsVBBTT&exportType=excel&incomingId=xxx
   */
  async listReplacedDocumentsForExport(params: any, userId: string) {
    const incomingId = params?.incomingId;
    if (!incomingId) {
      return { items: [], total: 0, page: 1, limit: 9999 };
    }
    const query = {
      page: 1,
      limit: 9999,
      filter: params.filter,
      sort: params.sort,
    };
    return this.listReplacedDocuments(userId, incomingId, query);
  }

  async listDocumentsImplementationDynamic(query: ListDocumentsDto, userId: string, authorId?: string) {
    const startTime = Date.now();

    if (query.authority === 'true' && authorId) userId = authorId;

    const pool = await this.getPool();

    // PHASE 1: Parse & Initialize
    const { type, page, limit, offset, filter, sort, processFn, authority, isExport, countOnly, isRoomFilter, roomCondition } =
      this.implPhase1_parseAndInitialize(query);
    const receiveDateFilter = filter?.receiveDate;
    const assignmentEndDateRaw = receiveDateFilter?.endDate;
    const assignmentDateRange = {
      startDate: receiveDateFilter?.startDate,
      endDate: /^\d{4}-\d{2}-\d{2}$/.test(assignmentEndDateRaw || '')
        ? `${assignmentEndDateRaw} 23:59:59.997`
        : assignmentEndDateRaw,
    };

    // PHASE 2: Get Context
    const { userContext, featureManagement, receiverUnit } = await this.implPhase2_getContext(userId, processFn, pool);

    // PHASE 3: Build Criteria & Filters
    const { filterFeature, filterFeatureTab, filterFeatureUser, filterJoins, filterCondition } = this.implPhase3_buildCriteria(filter, featureManagement);

    // PHASE 4: Validate Type
    const { isUserFlow, isDocFlow, safeType } = this.implPhase4_validateType(type);

    // PHASE 5: Build JOIN Clause
    const joinClause = this.implPhase5_buildJoinClause(isUserFlow, isDocFlow, safeType, type, receiverUnit, filterJoins);

    // PHASE 6: Build WHERE Clause
    const whereClause = this.implPhase6_buildWhereClause(
      type, filter, filterFeature, filterCondition, isRoomFilter, roomCondition,
      filterFeatureTab, filterFeatureUser
    );

    // PHASE 7: Build SELECT Fields
    const { selectFieldsArray, aliases } = await this.implPhase7_buildSelectFields(processFn, userId, safeType);

    // PHASE 8: Build ORDER BY
    const orderBy = this.implPhase8_buildOrderBy(sort, aliases);

    // PHASE 9: Build SQL Queries
    const { totalSql, rowsSql } = this.implPhase9_buildSqlQueries(selectFieldsArray, joinClause, whereClause, orderBy);
    console.debug(`[DEBUG] listDocumentsImplementationDynamic: type=${type}, hasReceiverUnit=${Boolean(receiverUnit)}, selectFields=${selectFieldsArray.length}`);
    const processFnValue = String(processFn);
    const bindListQueryParams = (request: sql.Request) => {
      request.input('currentUserId', sql.NVarChar(100), userId);
      request.input('processFn', sql.NVarChar(255), processFnValue);
      if (receiverUnit) request.input('receiverUnit', sql.NVarChar(100), String(receiverUnit));
      request.input('offsetNum', sql.Int, offset);
      request.input('limitNum', sql.Int, limit);
      return request;
    };

    // PHASE 10: Execute & Map Results
    return this.implPhase10_executeAndMap(
      pool, totalSql, rowsSql, page, limit,
      countOnly, userContext, receiverUnit, aliases,
      authority, type, isExport, startTime, bindListQueryParams,
      assignmentDateRange,
    );
  }

  // ── PHASE IMPLEMENTATIONS ─────────────────────────────────────────────────

  /**
   * PHASE 1: Parse & Initialize
   */
  private implPhase1_parseAndInitialize(query: ListDocumentsDto) {
    const phaseStart = Date.now();
    const { type, page = 1, limit = 20, filter, sort, processFn, authority, isExport, countOnly, room } = query;

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = isExport === 'true' ? 9999 : Math.min(Number(limit) || 20, 1000);
    const offsetNum = (pageNum - 1) * limitNum;

    const isRoomFilter = room === 'true' ? 'ONLY_ROOM' : room === 'false' ? 'ONLY_PERSONAL' : 'ALL';
    const roomCondition = isRoomFilter === 'ONLY_ROOM'
      ? `(af.is_transfer_to_room = 1)`
      : isRoomFilter === 'ONLY_PERSONAL'
        ? `(af.is_transfer_to_room = 0 OR af.is_transfer_to_room IS NULL)`
        : '';

    return { type, page: pageNum, limit: limitNum, offset: offsetNum, filter, sort, processFn, authority, isExport, countOnly, isRoomFilter, roomCondition };
  }

  /**
   * PHASE 2: Get Context
   */
  private async implPhase2_getContext(userId: string, processFn: string | undefined, pool: sql.ConnectionPool) {
    const phaseStart = Date.now();
    const result = await this.getListContext(userId, processFn, pool);
    return result;
  }

  /**
   * PHASE 3: Build Criteria & Filters
   * Giữ filterCondition riêng cho type 'processed' (khác mainProcess dùng filterFeature)
   */
  private implPhase3_buildCriteria(filter: any, featureManagement: any) {
    const phaseStart = Date.now();
    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, joins: filterJoins, filterCondition } = buildDocumentCriteriaHelper(
      [...featureCriteria, ...criteria],
      'incomming_documents',
      featureManagement,
    );

    const { sql: filterFeatureTab } = buildDocumentCriteriaHelper(
      featureCriteria,
      'incomming_documents',
      featureManagement,
    );

    const { sql: filterFeatureUser } = buildDocumentCriteriaHelper(
      criteria,
      'incomming_documents',
      featureManagement,
    );

    return { filterFeature, filterFeatureTab, filterFeatureUser, filterJoins, filterCondition };
  }

  /**
   * PHASE 4: Validate Type
   * supporter có type set khác mainProcess (waiting thay vì urgent/deadline)
   */
  private implPhase4_validateType(type: string | undefined) {
    const USER_FLOW_TYPES = ['waiting', 'processed', 'notComplete', 'notDone'] as const;
    const DOC_FLOW_TYPES = ['incompleted', 'completed'] as const;
    const ALLOWED_TYPES = [...USER_FLOW_TYPES, ...DOC_FLOW_TYPES];

    if (!type || !ALLOWED_TYPES.includes(type as any)) {
      throw new BadRequestException({ message: 'Type không hợp lệ', allowedTypes: ALLOWED_TYPES });
    }

    type UserFlowType = typeof USER_FLOW_TYPES[number];
    type DocFlowType = typeof DOC_FLOW_TYPES[number];
    const isUserFlow = USER_FLOW_TYPES.includes(type as UserFlowType);
    const isDocFlow = DOC_FLOW_TYPES.includes(type as DocFlowType);
    const safeType = type ?? 'waiting';

    return { isUserFlow, isDocFlow, safeType };
  }

  /**
   * PHASE 5: Build JOIN Clause
   * tab = 'supporter' (khác mainProcess tab = 'processor')
   * type 'processed' → chỉ lấy bản ghi cá nhân (không OR receiver_unit)
   */
  private implPhase5_buildJoinClause(
    isUserFlow: boolean,
    isDocFlow: boolean,
    safeType: string,
    type: string | undefined,
    receiverUnit: string | null,
    filterJoins: string | undefined,
  ): string {
    const phaseStart = Date.now();
    const tab = 'supporter';
    void safeType;
    void type;
    void receiverUnit;

    let joinClause = ` LEFT JOIN ${this.dbname}.dbo.incomming_current_state af
      ON af.document_id = incomming_documents.document_id`;

    joinClause += ` OUTER APPLY (
      SELECT TOP 1 assignment_type as assignmentType
      FROM ${this.dbname}.dbo.audit
      WHERE document_id = incomming_documents.document_id
        AND assignment_type IS NOT NULL
      ORDER BY id DESC
    ) ap`;

    if (isUserFlow) {
      joinClause += ` INNER JOIN ${this.dbname}.dbo.incomming_assignment au
        ON au.document_id = incomming_documents.document_id
       AND au.receiver = @currentUserId
       AND au.role_process = '${tab}'`;
    }

    if (isDocFlow) {
      joinClause += ` INNER JOIN ${this.dbname}.dbo.incomming_current_state ad
        ON ad.document_id = incomming_documents.document_id`;
    }

    if (filterJoins) joinClause += ' ' + filterJoins;

    return joinClause;
  }

  /**
   * PHASE 6: Build WHERE Clause
   */
  private implPhase6_buildWhereClause(
    type: string | undefined,
    filter: any,
    filterFeature: string | undefined,
    filterCondition: string | undefined,
    isRoomFilter: string,
    roomCondition: string,
    filterFeatureTab?: string,
    filterFeatureUser?: string,
  ): string {
    const phaseStart = Date.now();
    const where: string[] = [];

    // Văn bản có sao
    if (filter?.isStar === '1' || filter?.isStar === 'true') {
      where.push(`EXISTS ( SELECT 1 FROM document_star ds WHERE ds.document_id = incomming_documents.document_id AND ds.user_id = @currentUserId AND ds.step = @processFn )`);
    }
    if (filter?.isStar === '0' || filter?.isStar === 'false') {
      where.push(`NOT EXISTS ( SELECT 1 FROM document_star ds WHERE ds.document_id = incomming_documents.document_id AND ds.user_id = @currentUserId AND ds.step = @processFn )`);
    }

    // Lọc theo processDeadline / process_deadline
    const { isUserFlow, isDocFlow } = this.implPhase4_validateType(type);
    const processDeadlineVal = filter?.processDeadline ?? filter?.process_deadline;
    if (processDeadlineVal) {
      const val = String(processDeadlineVal).trim().toUpperCase();
      const deadlineField = isUserFlow ? 'au.deadline' : (isDocFlow ? 'ad.current_deadline' : null);
      if (deadlineField) {
        if (val === 'CON_HAN') {
          where.push(`(${deadlineField} >= DATEADD(day, 2, GETDATE()))`);
        } else if (val === 'QUA_HAN') {
          where.push(`(${deadlineField} < GETDATE())`);
        } else if (val === 'SAP_HET_HAN') {
          where.push(`(${deadlineField} >= GETDATE() AND ${deadlineField} < DATEADD(day, 2, GETDATE()))`);
        } else if (val === 'KHONG_CO_HAN') {
          where.push(`(${deadlineField} IS NULL)`);
        }
      }
    }

    // Lọc theo mảng statusCode nếu có
    const targetStatusFilter = filter?.statusCode ?? filter?.status_code ?? filter?.status;
    if (targetStatusFilter) {
      let rawStatuses: string[] = [];
      if (Array.isArray(targetStatusFilter)) {
        rawStatuses = targetStatusFilter;
      } else if (typeof targetStatusFilter === 'object' && targetStatusFilter !== null) {
        rawStatuses = Object.values(targetStatusFilter);
      } else if (typeof targetStatusFilter === 'string') {
        rawStatuses = [targetStatusFilter];
      }
      if (rawStatuses.length > 0) {
        const statusSql = buildStatusCodeFilterClause(rawStatuses, this.dbname, 'implementation-coordination');
        if (statusSql) {
          where.push(statusSql);
        }
      }
    }

    const excludeCompletedDoc = `ISNULL(af.is_completed_doc, 0) = 0`;

    // type 'processed' dùng filterCondition (thay vì filterFeature) để lọc đúng
    const typeFilters: Record<string, Array<string | undefined>> = {
      waiting: [
        filterFeature ? `(${filterFeature})` : undefined,
        `((au.stage_status = '${stageStatusDoc.CHUA_XU_LY}') OR (au.stage_status = '${stageStatusDoc.CHUA_HOAN_THANH}' AND au.deadline IS NOT NULL AND au.deadline >= GETDATE()))`,
        // Loại trừ văn bản đã hoàn thành bởi lãnh đạo (is_completed_doc=1) → chuyển sang tab notDone
        `ISNULL(af.is_completed_doc, 0) = 0`,
        roomCondition || undefined,
      ],
      processed: [
        filterCondition ? `(${filterCondition})` : undefined,
        `(au.stage_status = '${stageStatusDoc.DA_XU_LY}' OR au.stage_status = '${stageStatusDoc.HOAN_THANH}' OR (au.stage_status = '${stageStatusDoc.DA_PHAN_CONG}' AND ISNULL(ap.assignmentType, '') = 'PHOI_HOP'))`,
        excludeCompletedDoc,
        `NOT (
          ISNULL(ap.assignmentType, '') = 'VAN_THU' 
          AND (
            au.stage_status = '${stageStatusDoc.HOAN_THANH}'
            OR
            (
              au.stage_status = '${stageStatusDoc.DA_XU_LY}'
              AND NOT EXISTS (
                SELECT 1 
                FROM ${this.dbname}.dbo.audit a 
                INNER JOIN ${this.dbname}.dbo.incomming_assignment ia 
                  ON ia.document_id = a.document_id AND ia.receiver = a.receiver
                WHERE a.document_id = incomming_documents.document_id 
                  AND (a.user_id = @currentUserId OR a.created_by = @currentUserId OR a.acting_as = @currentUserId)
                  AND ia.stage_status NOT IN ('DA_XU_LY', 'HOAN_THANH')
              )
            )
          )
        )`,
        `NOT (
          ISNULL(ap.assignmentType, '') = 'TRUONG_PHONG' 
          AND EXISTS (
            SELECT 1 FROM ${this.dbname}.dbo.audit a_tp
            WHERE a_tp.document_id = incomming_documents.document_id
              AND (
                a_tp.user_id = @currentUserId 
                OR a_tp.acting_as = @currentUserId 
                OR a_tp.created_by = @currentUserId
              )
              AND a_tp.assignment_type = 'TRUONG_PHONG'
          )
          AND NOT EXISTS (
            SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment ia
            INNER JOIN ${this.dbname}.dbo.audit a_assign 
              ON a_assign.document_id = ia.document_id 
              AND (a_assign.receiver = ia.receiver OR a_assign.receiver_unit = ia.receiver)
              AND (a_assign.user_id = @currentUserId OR a_assign.created_by = @currentUserId OR a_assign.acting_as = @currentUserId)
            INNER JOIN ${this.dbname}.dbo.audit a_tp_node
              ON a_tp_node.document_id = ia.document_id
              AND (a_tp_node.receiver = @currentUserId OR a_tp_node.acting_as = @currentUserId)
              AND a_assign.from_node_id = a_tp_node.to_node_id
            WHERE ia.document_id = incomming_documents.document_id
              AND ia.role_process = 'processor'
              AND ia.stage_status NOT IN ('DA_XU_LY', 'HOAN_THANH')
          )
          AND NOT EXISTS (
            SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment ia
            INNER JOIN ${this.dbname}.dbo.audit a_assign 
              ON a_assign.document_id = ia.document_id 
              AND (a_assign.receiver = ia.receiver OR a_assign.receiver_unit = ia.receiver)
              AND (a_assign.user_id = @currentUserId OR a_assign.created_by = @currentUserId OR a_assign.acting_as = @currentUserId)
            INNER JOIN ${this.dbname}.dbo.audit a_tp_node
              ON a_tp_node.document_id = ia.document_id
              AND (a_tp_node.receiver = @currentUserId OR a_tp_node.acting_as = @currentUserId)
              AND a_assign.from_node_id = a_tp_node.to_node_id
            WHERE ia.document_id = incomming_documents.document_id
              AND ia.role_process = 'supporter'
              AND ia.stage_status NOT IN ('DA_XU_LY', 'HOAN_THANH')
          )
        )`,
        roomCondition || undefined,
      ],
      incompleted: [
        filterFeature ? `(${filterFeature})` : undefined,
        `(
          -- Đối với người phân công (TRUONG_PHONG), chỉ hiển thị khi cả xử lý chính và phối hợp đều đã hoàn thành
          (
            ISNULL(ap.assignmentType, '') = 'TRUONG_PHONG'
            AND ${excludeCompletedDoc}
            AND ad.current_stage_status = '${stageStatusDoc.HOAN_THANH}'
            AND NOT EXISTS (
              SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment ia
              INNER JOIN ${this.dbname}.dbo.audit a_assign 
                ON a_assign.document_id = ia.document_id 
                AND (a_assign.receiver = ia.receiver OR a_assign.receiver_unit = ia.receiver)
                AND (a_assign.user_id = @currentUserId OR a_assign.created_by = @currentUserId OR a_assign.acting_as = @currentUserId)
              INNER JOIN ${this.dbname}.dbo.audit a_tp_node
                ON a_tp_node.document_id = ia.document_id
                AND (a_tp_node.receiver = @currentUserId OR a_tp_node.acting_as = @currentUserId)
                AND a_assign.from_node_id = a_tp_node.to_node_id
              WHERE ia.document_id = incomming_documents.document_id
                AND ia.role_process = 'processor'
                AND ia.stage_status NOT IN ('DA_XU_LY', 'HOAN_THANH')
            )
            AND NOT EXISTS (
              SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment ia
              INNER JOIN ${this.dbname}.dbo.audit a_assign 
                ON a_assign.document_id = ia.document_id 
                AND (a_assign.receiver = ia.receiver OR a_assign.receiver_unit = ia.receiver)
                AND (a_assign.user_id = @currentUserId OR a_assign.created_by = @currentUserId OR a_assign.acting_as = @currentUserId)
              INNER JOIN ${this.dbname}.dbo.audit a_tp_node
                ON a_tp_node.document_id = ia.document_id
                AND (a_tp_node.receiver = @currentUserId OR a_tp_node.acting_as = @currentUserId)
                AND a_assign.from_node_id = a_tp_node.to_node_id
              WHERE ia.document_id = incomming_documents.document_id
                AND ia.role_process = 'supporter'
                AND ia.stage_status NOT IN ('DA_XU_LY', 'HOAN_THANH')
            )
          )
          OR
          -- Đối với người phối hợp bình thường (không phải người phân công)
          (
            ISNULL(ap.assignmentType, '') <> 'TRUONG_PHONG'
            AND ${excludeCompletedDoc}
            AND ad.current_stage_status = '${stageStatusDoc.HOAN_THANH}'
          )
          OR
          -- Neu van ban da hoan thanh nhung nguoi phoi hop chua hoan thanh nhiem vu
          (
            (ad.current_stage_status = '${stageStatusDoc.HOAN_THANH_VAN_BAN}' OR ad.current_stage_status = '${stageStatusDoc.HOAN_THANH}')
            AND NOT EXISTS (
              SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment ia
              WHERE ia.document_id = incomming_documents.document_id
                AND ia.receiver = @currentUserId
                AND ia.role_process = 'supporter'
                AND ia.stage_status IN ('DA_XU_LY', 'HOAN_THANH', 'DA_PHAN_CONG')
            )
          )
        )`,
        `EXISTS (SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment ia WHERE ia.document_id = incomming_documents.document_id AND ia.receiver = @currentUserId AND ia.role_process = 'supporter')`,
        roomCondition || undefined,
      ],
      notDone: [
        filterFeature ? `(${filterFeature})` : undefined,
        // Trường hợp 1: stage_status = CHUA_HOAN_THANH (quá hạn, bị đánh dấu bởi hệ thống)
        // Trường hợp 2: is_completed_doc = 1 VÀ cá nhân vẫn CHUA_XU_LY (lãnh đạo hoàn thành nhưng cá nhân chưa xử lý)
        `(
          au.stage_status = '${stageStatusDoc.CHUA_HOAN_THANH}'
          OR (
            ISNULL(af.is_completed_doc, 0) = 1
            AND au.stage_status = '${stageStatusDoc.CHUA_XU_LY}'
          )
        )`,
        roomCondition || undefined,
      ],
      completed: [
        filterFeatureUser ? `(${filterFeatureUser})` : undefined,
        `(
          (
            ( ${filterFeatureTab || '1=1'} )
            AND (ad.current_stage_status = '${stageStatusDoc.HOAN_THANH_VAN_BAN}' OR ad.is_completed_doc = 1)
            AND EXISTS (
              SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment ia_chk
              WHERE ia_chk.document_id = incomming_documents.document_id
                AND ia_chk.receiver = @currentUserId
                AND ia_chk.role_process = 'supporter'
                AND ia_chk.stage_status IN ('DA_XU_LY', 'HOAN_THANH', 'DA_PHAN_CONG')
            )
          )
          OR
          (
            ISNULL(ap.assignmentType, '') = 'VAN_THU' AND EXISTS (
              SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment ia
              WHERE ia.document_id = incomming_documents.document_id
                AND ia.receiver = @currentUserId
                AND ia.role_process = 'supporter'
                AND ia.stage_status IN ('DA_XU_LY', 'HOAN_THANH', 'DA_PHAN_CONG')
            ) AND (
              ad.current_stage_status = '${stageStatusDoc.HOAN_THANH_VAN_BAN}'
              OR ad.is_completed_doc = 1
              OR
              NOT EXISTS (
                SELECT 1 
                FROM ${this.dbname}.dbo.audit a 
                INNER JOIN ${this.dbname}.dbo.incomming_assignment ia 
                  ON ia.document_id = a.document_id AND ia.receiver = a.receiver
                WHERE a.document_id = incomming_documents.document_id 
                  AND (a.user_id = @currentUserId OR a.created_by = @currentUserId OR a.acting_as = @currentUserId)
                  AND ia.stage_status NOT IN ('DA_XU_LY', 'HOAN_THANH')
              )
            )
          )
          OR
          (
            ISNULL(ap.assignmentType, '') IN ('TRUONG_PHONG', 'TRINH_LANH_DAO') AND EXISTS (
              SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment ia
              WHERE ia.document_id = incomming_documents.document_id
                AND ia.receiver = @currentUserId
                AND ia.role_process = 'supporter'
                AND ia.stage_status IN ('DA_XU_LY', 'HOAN_THANH', 'DA_PHAN_CONG')
            ) AND (
              ad.current_stage_status = '${stageStatusDoc.HOAN_THANH_VAN_BAN}'
              OR ad.is_completed_doc = 1
              OR
              EXISTS (
                SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment ia_tp
                WHERE ia_tp.document_id = incomming_documents.document_id
                  AND ia_tp.receiver = (
                    SELECT TOP 1 a.receiver FROM ${this.dbname}.dbo.audit a
                    WHERE a.document_id = incomming_documents.document_id
                      AND a.action_code = 'CHUYEN_XU_LY_PHAN_CONG'
                    ORDER BY a.id DESC
                  )
                  AND ia_tp.stage_status = '${stageStatusDoc.HOAN_THANH}'
              )
            )
          )
        )`,
        `EXISTS (SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment ia WHERE ia.document_id = incomming_documents.document_id AND ia.receiver = @currentUserId AND ia.role_process = 'supporter')`,
        roomCondition || undefined,
      ],
      notComplete: [
        filterFeature ? `(${filterFeature})` : undefined,
        `(au.stage_status = '${stageStatusDoc.CHUA_XU_LY}')`,
        `ISNULL(af.is_completed_doc, 0) = 1`,
        `au.deadline IS NOT NULL AND au.deadline < GETDATE()`,
        roomCondition || undefined,
      ],
    };

    const typeParts = (typeFilters[type!] ?? []).filter((f): f is string => !!f);
    where.push(...typeParts);

    const whereClause = where.length
      ? `WHERE ${where.join(' AND ')} AND incomming_documents.status = 1`
      : `WHERE incomming_documents.status = 1`;

    return whereClause;
  }

  /**
   * PHASE 7: Build SELECT Fields
   * Giữ nguyên các computed fields đặc thù của supporter
   */
  private async implPhase7_buildSelectFields(processFn: string | undefined, userId: string, safeType?: string) {
    const phaseStart = Date.now();
    const excludeKeys = ['files', 'statusCode', 'status_code', 'userDeadline', 'user_deadline'];

    const { dbKeys, aliases, allViewFields } = await this.configurationService.buildSelectFieldsNew(
      'incomming_documents', excludeKeys, processFn,
    );

    const keyDefaultParts: string[] = [];

    const { isUserFlow, isDocFlow } = this.implPhase4_validateType(safeType ?? 'waiting');
    if (isUserFlow) {
      keyDefaultParts.push('au.deadline AS user_deadline');
    } else if (isDocFlow) {
      keyDefaultParts.push('ad.current_deadline AS user_deadline');
    } else {
      keyDefaultParts.push('NULL AS user_deadline');
    }
    aliases['userDeadline'] = 'user_deadline';

    if (allViewFields.includes('statusCode') || allViewFields.includes('status_code')) {
      keyDefaultParts.push(
        `af.current_action_code AS status_code`,
      );
    }

    if (allViewFields.includes('processors')) {
      keyDefaultParts.push(
        `( SELECT TOP 1 ia.receiver FROM ${this.dbname}.dbo.incomming_assignment ia WHERE ia.document_id = incomming_documents.document_id AND ia.stage_status = '${stageStatusDoc.CHUA_XU_LY}' AND ia.role_process = 'processor' ORDER BY ia.created_at DESC ) AS processors`,
      );
    }

    keyDefaultParts.push(
      `CASE WHEN EXISTS ( SELECT 1 FROM document_star ds WHERE ds.document_id = incomming_documents.document_id AND ds.user_id = @currentUserId AND ds.step = @processFn ) THEN 1 ELSE 0 END AS isStar`,
    );
    aliases['isStar'] = 'is_star';

    return { selectFieldsArray: [...keyDefaultParts, ...dbKeys], aliases };
  }

  /**
   * PHASE 8: Build ORDER BY
   * user_deadline map sang au.user_deadline (giống mainProcess)
   */
  private implPhase8_buildOrderBy(sort: any, aliases: Record<string, string>): string {
    const phaseStart = Date.now();
    const orderBy = ' ORDER BY ' + parseSort(sort, aliases, 'incomming_documents', {
      user_deadline: 'au.deadline',
      userDeadline: 'au.deadline',
    });
    return orderBy;
  }

  /**
   * PHASE 9: Build SQL Queries
   */
  private implPhase9_buildSqlQueries(
    selectFieldsArray: string[],
    joinClause: string,
    whereClause: string,
    orderBy: string,
  ) {
    const phaseStart = Date.now();
    const selectFields = selectFieldsArray.join(', ');
    const base = `FROM ${this.dbname}.dbo.incomming_documents ${joinClause} ${whereClause}`;
    const totalSql = `SELECT COUNT(*) AS total ${base}`;
    const rowsSql = `SELECT ${selectFields} ${base} ${orderBy} OFFSET @offsetNum ROWS FETCH NEXT @limitNum ROWS ONLY`;
    return { totalSql, rowsSql };
  }

  /**
   * PHASE 10: Execute & Map Results
   * Phân nhánh: export → executeAndMapForExport, normal → executeAndMap
   */
  private async implPhase10_executeAndMap(
    pool: sql.ConnectionPool,
    totalSql: string,
    rowsSql: string,
    page: number,
    limit: number,
    countOnly: string | undefined,
    userContext: any,
    receiverUnit: any,
    aliases: Record<string, string>,
    authority: string | undefined,
    type: string | undefined,
    isExport: string | undefined,
    startTime: number,
    bindQueryParams?: (request: sql.Request) => sql.Request,
    assignmentDateRange?: { startDate?: string; endDate?: string },
  ) {
    const phaseStart = Date.now();

    const result = isExport === 'true'
      ? await this.executeAndMapForExport(
        pool,
        totalSql,
        rowsSql,
        page,
        limit,
        countOnly,
        userContext,
        receiverUnit,
        aliases,
        authority,
        type,
        bindQueryParams,
      )
      : await this.executeAndMap(
        pool,
        totalSql,
        rowsSql,
        page,
        limit,
        countOnly,
        userContext,
        receiverUnit,
        aliases,
        authority,
        type,
        isExport,
        bindQueryParams,
        assignmentDateRange,
      );

    return result;
  }

  async listDocumentsViewerDynamic(query: ListDocumentsDto, userId: string, authorId?: string) {
    const tab = 'viewer';
    const { type, page = 1, limit = 20, filter, sort, processFn, authority, isExport, countOnly } = query;
    const receiveDateFilter = filter?.receiveDate;
    const assignmentEndDateRaw = receiveDateFilter?.endDate;
    const assignmentDateRange = {
      startDate: receiveDateFilter?.startDate,
      endDate: /^\d{4}-\d{2}-\d{2}$/.test(assignmentEndDateRaw || '')
        ? `${assignmentEndDateRaw} 23:59:59.997`
        : assignmentEndDateRaw,
    };
    const pool = await this.getPool();
    const where: string[] = [];

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const { userContext, featureManagement, receiverUnit } = await this.getListContext(userId, processFn, pool);

    const criteria: Array<{ name: string; operator: string; value: string | string[] }> = [];

    if (filter && typeof filter === 'object') {
      for (const [key, value] of Object.entries(filter)) {
        if (!value) continue;
        // receiveDate của tab "Nhận để biết" là ngày audit, không phải
        // incomming_documents.receive_date; xử lý riêng ở JOIN audit bên dưới.
        if (['statusCode', 'status_code', 'status', 'processDeadline', 'process_deadline', 'receiveDate', 'receive_date'].includes(key)) continue;

        if (filter?.senderUnit) {
          const senderUnitStr = String(filter.senderUnit).trim();

          // Regex: chỉ cho phép chữ, số, dấu "-" hoặc "_", đủ cho GUID hoặc ID dạng chuỗi
          if (!/^[a-zA-Z0-9-_]+$/.test(senderUnitStr)) {
            throw new BadRequestException(
              'senderUnit không hợp lệ, chỉ gồm chữ, số, dấu "-" hoặc "_".'
            );
          }

          // Kiểm tra tồn tại trong bảng organization_units
          const unitExists = await pool
            .request()
            .input('senderUnit', senderUnitStr)
            .query(`SELECT 1 FROM ${this.dbname}.dbo.organization_units WHERE id = @senderUnit`);

          if (!unitExists.recordset.length) {
            throw new BadRequestException(`senderUnit với ID ${senderUnitStr} không tồn tại.`);
          }

          // Gán lại giá trị cho filter
          filter.senderUnit = senderUnitStr;
        }

        // Các filter khác (dates, strings, ...) vẫn xử lý bình thường
        if (typeof value === 'object') {
          const val = value as { startDate?: string; endDate?: string; value?: string };

          if (val.startDate && val.endDate)
            criteria.push({ name: key, operator: 'between', value: [String(val.startDate), String(val.endDate)] });
          else if (val.startDate)
            criteria.push({ name: key, operator: 'gte', value: String(val.startDate) });
          else if (val.endDate)
            criteria.push({ name: key, operator: 'lte', value: String(val.endDate) });
          else if (val.value !== undefined && val.value !== null)
            criteria.push({ name: key, operator: 'like', value: String(val.value) });
        } else {
          const operator = typeof value === 'string' ? 'like' : 'eq';
          criteria.push({ name: key, operator, value: String(value) });
        }
      }
    }

    const featureCriteria = featureManagement?.criteria ?? [];
    const { sql: filterFeature, joins: filterJoins } = buildDocumentCriteriaHelper([...featureCriteria, ...criteria], 'incomming_documents', featureManagement);

    const ALLOWED_TYPES = ['waiting', 'processed'] as const;
    if (!type || !ALLOWED_TYPES.includes(type as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: ALLOWED_TYPES,
      });
    }
    const safeType = type ?? 'waiting';

    let joinClause = `
      INNER JOIN ${this.dbname}.dbo.incomming_assignment audit
        ON audit.document_id = incomming_documents.document_id
       AND audit.role_process = '${tab}'
       AND audit.receiver = @currentUserId `;

    if (assignmentDateRange.startDate || assignmentDateRange.endDate) {
      joinClause += `
        INNER JOIN ${this.dbname}.dbo.audit receive_date_audit WITH (NOLOCK)
          ON receive_date_audit.id = audit.last_audit_id
         AND receive_date_audit.type_document IN ('IncommingDocument', 'IncomingDocument')
         ${assignmentDateRange.startDate ? 'AND receive_date_audit.created_at >= @auditStartDate' : ''}
         ${assignmentDateRange.endDate ? 'AND receive_date_audit.created_at <= @auditEndDate' : ''}
      `;
    }

    // Văn bản có sao
    if (filter?.isStar === '1' || filter?.isStar === 'true') {
      where.push(` EXISTS ( SELECT 1 FROM document_star ds WHERE ds.document_id = incomming_documents.document_id AND ds.user_id = @currentUserId AND ds.step = @processFn ) `);
    }
    if (filter?.isStar === '0' || filter?.isStar === 'false') {
      where.push(` NOT EXISTS ( SELECT 1 FROM document_star ds WHERE ds.document_id = incomming_documents.document_id AND ds.user_id = @currentUserId AND ds.step = @processFn ) `);
    }

    // Lọc theo processDeadline / process_deadline
    const processDeadlineVal = filter?.processDeadline ?? filter?.process_deadline;
    if (processDeadlineVal) {
      const val = String(processDeadlineVal).trim().toUpperCase();
      const deadlineField = 'audit.deadline';
      if (val === 'CON_HAN') {
        where.push(`(${deadlineField} >= DATEADD(day, 2, GETDATE()))`);
      } else if (val === 'QUA_HAN') {
        where.push(`(${deadlineField} < GETDATE())`);
      } else if (val === 'SAP_HET_HAN') {
        where.push(`(${deadlineField} >= GETDATE() AND ${deadlineField} < DATEADD(day, 2, GETDATE()))`);
      } else if (val === 'KHONG_CO_HAN') {
        where.push(`(${deadlineField} IS NULL)`);
      }
    }

    // Lọc theo mảng statusCode nếu có
    const targetStatusFilter = filter?.statusCode ?? filter?.status_code ?? filter?.status;
    if (targetStatusFilter) {
      let rawStatuses: string[] = [];
      if (Array.isArray(targetStatusFilter)) {
        rawStatuses = targetStatusFilter;
      } else if (typeof targetStatusFilter === 'object' && targetStatusFilter !== null) {
        rawStatuses = Object.values(targetStatusFilter);
      } else if (typeof targetStatusFilter === 'string') {
        rawStatuses = [targetStatusFilter];
      }
      if (rawStatuses.length > 0) {
        const statusSql = buildStatusCodeFilterClause(rawStatuses, this.dbname, 'recipient-to-know');
        if (statusSql) {
          where.push(statusSql);
        }
      }
    }

    if (filterJoins) {
      joinClause += ' ' + filterJoins;
    }

    const typeFilters: Record<string, string[]> = {
      waiting: [
        filterFeature ? `(${filterFeature})` : undefined,
        `( audit.stage_status = '${stageStatusDoc.CHUA_XU_LY}' )`,
      ].filter((f): f is string => !!f),

      processed: [
        filterFeature ? `(${filterFeature})` : undefined,
        `( audit.stage_status = '${stageStatusDoc.DA_XEM}' 
        OR audit.stage_status = '${stageStatusDoc.DA_XU_LY}' )`,
      ].filter((f): f is string => !!f),
    };

    if (type && typeFilters[type]) {
      where.push(...typeFilters[type]);
    }

    let whereClause = '';
    if (where.length) {
      whereClause = ' WHERE ' + where.join(' AND ') + ' AND incomming_documents.status = 1';
    } else {
      whereClause = ' WHERE incomming_documents.status = 1';
    }


    let limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    if (isExport === 'true') {
      limitNum = 9999;
    }
    const offsetNum = (pageNum - 1) * limitNum;

    const excludeKeys = ['files', 'statusCode', 'userDeadline', 'user_deadline'];
    const { dbKeys, aliases, allViewFields } = await this.configurationService.buildSelectFieldsNew('incomming_documents', excludeKeys, processFn);

    const keyDefaultParts: string[] = [];
    if (allViewFields.includes('statusCode'))
      keyDefaultParts.push(`audit.stage_status AS status_code`);
    keyDefaultParts.push(`CASE WHEN EXISTS (SELECT 1 FROM document_star ds WHERE ds.document_id = incomming_documents.document_id AND ds.user_id = @currentUserId AND ds.step = @processFn) THEN 1 ELSE 0 END AS isStar`);
    aliases['isStar'] = 'is_star';
    if (allViewFields.includes('userDeadline') || allViewFields.includes('user_deadline')) {
      aliases['userDeadline'] = 'user_deadline';
      aliases['userDeadline'] = 'userDeadline';
    }
    const keyDefault = keyDefaultParts.join(', ');
    const selectFieldsArray = [...(keyDefault ? [keyDefault] : []), ...dbKeys];
    const orderBy = ' ORDER BY ' + parseSort(sort, aliases, 'incomming_documents', { user_deadline: 'audit.deadline', userDeadline: 'audit.deadline' });
    const selectFields = selectFieldsArray.join(', ');

    const totalSql = `SELECT COUNT(*) AS total FROM ${this.dbname}.dbo.incomming_documents ${joinClause} ${whereClause}`;
    // console.log('[LIST RECEIVE] TOTAL SQL:', totalSql);

    const rowsSql = `SELECT ${selectFields} FROM ${this.dbname}.dbo.incomming_documents ${joinClause} ${whereClause} ${orderBy} OFFSET @offsetNum ROWS FETCH NEXT @limitNum ROWS ONLY`;
    // console.log('[LIST RECEIVE] ROWS SQL:', rowsSql);

    const processFnValue = String(processFn);
    const bindViewerQueryParams = (request: sql.Request) => {
      request.input('currentUserId', sql.NVarChar(100), userId);
      request.input('processFn', sql.NVarChar(255), processFnValue);
      if (assignmentDateRange.startDate) {
        request.input('auditStartDate', sql.DateTime, assignmentDateRange.startDate);
      }
      if (assignmentDateRange.endDate) {
        request.input('auditEndDate', sql.DateTime, assignmentDateRange.endDate);
      }
      request.input('offsetNum', sql.Int, offsetNum);
      request.input('limitNum', sql.Int, limitNum);
      return request;
    };

    const result = await this.executeAndMap(
      pool,
      totalSql,
      rowsSql,
      pageNum,
      limitNum,
      countOnly,
      userContext,
      receiverUnit,
      aliases,
      authority,
      type,
      isExport,
      bindViewerQueryParams,
      assignmentDateRange,
    );
    if (result && 'items' in result && Array.isArray(result.items) && result.items.length > 0) {
      await this.overrideViewerActionsAndFlags(pool, result.items, userId, assignmentDateRange);
    }
    return result;
  }

  private async overrideViewerActionsAndFlags(
    pool: sql.ConnectionPool,
    items: any[],
    userId: string,
    assignmentDateRange?: { startDate?: string; endDate?: string },
  ): Promise<void> {
    if (!Array.isArray(items) || items.length === 0) return;

    const documentIds = items.map((item) => item.documentId || item.document_id).filter(Boolean);
    if (documentIds.length === 0) return;

    // Fetch user context / Van Thu role
    const { receiverUnit } = await this.getListContext(userId, 'xulychinhCB', pool);
    let groupUser: any;
    try {
      groupUser = await this.groupUserService.findByCode(GROUP_CODES.VAN_THU);
    } catch {
      groupUser = null;
    }
    const groupUserId: string[] = groupUser?.data?.users?.map((u: any) => u.id) || [];
    const isVanThu = groupUserId.includes(userId);

    const receiverCond = isVanThu && receiverUnit
      ? `(receiver = @currentUserId OR receiver = @receiverUnit OR EXISTS (SELECT 1 FROM ${this.dbname}.dbo.users u_vt WITH (NOLOCK) WHERE u_vt.id = receiver AND u_vt.parent = @receiverUnit))`
      : `receiver = @currentUserId`;

    const reqAssign = pool.request();
    reqAssign.input('currentUserId', sql.NVarChar(100), userId);
    if (receiverUnit) {
      reqAssign.input('receiverUnit', sql.NVarChar(100), receiverUnit);
    }
    const assignmentDateConditions: string[] = [];
    if (assignmentDateRange?.startDate) {
      reqAssign.input('assignmentStartDate', sql.DateTime, assignmentDateRange.startDate);
      assignmentDateConditions.push(`created_at >= @assignmentStartDate`);
    }
    if (assignmentDateRange?.endDate) {
      const assignmentEndDate = /^\d{4}-\d{2}-\d{2}$/.test(assignmentDateRange.endDate)
        ? `${assignmentDateRange.endDate} 23:59:59.997`
        : assignmentDateRange.endDate;
      reqAssign.input('assignmentEndDate', sql.DateTime, assignmentEndDate);
      assignmentDateConditions.push(`created_at <= @assignmentEndDate`);
    }
    documentIds.forEach((id, i) => reqAssign.input(`docAssign${i}`, sql.NVarChar(100), id));
    const assignSql = documentIds.map((_, i) => `@docAssign${i}`).join(',');
    const assignmentDateWhere = assignmentDateConditions.length
      ? ` AND ${assignmentDateConditions.join(' AND ')}`
      : '';

    const assignmentsList = (
      await reqAssign.query(
        `SELECT document_id, role_process, stage_status 
         FROM dbo.incomming_assignment 
         WHERE document_id IN (${assignSql}) AND ${receiverCond}${assignmentDateWhere}`
      )
    ).recordset;

    const assignmentMap: Record<string, any[]> = {};
    for (const a of assignmentsList) {
      const docIdStr = String(a.document_id || '').toLowerCase();
      (assignmentMap[docIdStr] ||= []).push(a);
    }

    for (const item of items) {
      const docId = String(item.documentId || item.document_id || '').toLowerCase();
      const userAssignments = assignmentMap[docId] || [];

      if (userAssignments.length > 0) {
        const hasProcessorOrSupporter = userAssignments.some(
          (a: any) => (a.role_process === 'processor' || a.role_process === 'supporter') && a.stage_status === 'CHUA_XU_LY'
        );

        if (!hasProcessorOrSupporter) {
          const viewerAssignments = userAssignments.filter((a: any) => a.role_process === 'viewer');
          if (viewerAssignments.length > 0) {
            const hasUnreadViewer = viewerAssignments.some((a: any) => a.stage_status === 'CHUA_XU_LY');

            // Clear all computed actions and only keep "Đã xem" if unread
            if (Array.isArray(item.availableActions)) {
              item.availableActions.length = 0;
              if (hasUnreadViewer) {
                item.availableActions.push({
                  code: stageStatusDoc.DA_XEM,
                  label: 'Đã xem',
                  type: 'viewed',
                  canExecute: true,
                });
              }
            } else {
              if (hasUnreadViewer) {
                item.availableActions = [{
                  code: stageStatusDoc.DA_XEM,
                  label: 'Đã xem',
                  type: 'viewed',
                  canExecute: true,
                }];
              } else {
                item.availableActions = [];
              }
            }

            // Clear all flags except canViewed
            if (item.flags && typeof item.flags === 'object') {
              for (const key in item.flags) {
                if (key !== 'canViewed') {
                  item.flags[key] = false;
                }
              }
            }

            // Clear flagsProcess
            if (item.flagsProcess && typeof item.flagsProcess === 'object') {
              item.flagsProcess.canSetSupporter = false;
              item.flagsProcess.canSetViewer = true;
              item.flagsProcess.canSetProcessor = false;
            }
          }
        }
      }
    }
  }

  async countDocumentsCombinedDashboard(userId: string): Promise<number> {
    const pool = await this.getPool();

    // 1. Lấy context (isVanThu, receiverUnit) giống getStatistics
    const userRes = await pool.request()
      .input('userId', userId)
      .query(`SELECT parent AS parentId FROM ${this.dbname}.dbo.users WHERE id = @userId`);
    const receiverUnit = userRes.recordset[0]?.parentId || null;

    let groupUser;
    try {
      groupUser = await this.groupUserService.findByCode(GROUP_CODES.VAN_THU);
    } catch (e) {
      groupUser = null;
    }
    const groupUserId = groupUser?.data?.users?.map((user) => user.id) || [];
    const isVanThu = groupUserId.includes(userId);

    const sources = [
      { type: 'processor' },
      { type: 'supporter' },
      { type: 'viewer' },
    ];

    const branchQueries = sources.map((s, index) => {
      const receiverCond = isVanThu && receiverUnit
        ? `(
            au.receiver = @currentUserId
            OR au.receiver = @receiverUnit
            OR EXISTS (
              SELECT 1 FROM ${this.dbname}.dbo.users u_vt WITH (NOLOCK)
              WHERE u_vt.id = au.receiver AND u_vt.parent = @receiverUnit
            )
          )`
        : `au.receiver = @currentUserId`;

      const whereClause = [
        `d.status = 1`,
        receiverCond,
        `au.role_process = '${s.type}'`,
        `au.stage_status = '${stageStatusDoc.CHUA_XU_LY}'`,
      ].join(' AND ');

      let dedupeClause = '';
      if (index > 0) {
        const prevTypes = sources.slice(0, index).map(prev => `'${prev.type}'`).join(', ');
        dedupeClause = ` AND NOT EXISTS (
          SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment au_ex WITH (NOLOCK)
          WHERE au_ex.document_id = d.document_id
            AND ${receiverCond.replace(/au\./g, 'au_ex.')}
            AND au_ex.role_process IN (${prevTypes})
            AND au_ex.stage_status = '${stageStatusDoc.CHUA_XU_LY}'
        )`;
      }

      return `
        SELECT DISTINCT d.document_id
        FROM ${this.dbname}.dbo.incomming_documents d WITH (NOLOCK)
        INNER JOIN ${this.dbname}.dbo.incomming_assignment au WITH (NOLOCK) ON au.document_id = d.document_id
        ${isVanThu ? `LEFT JOIN ${this.dbname}.dbo.users u WITH (NOLOCK) ON u.id = au.receiver` : ''}
        WHERE ${whereClause}${dedupeClause}
      `;
    });

    const combinedSqlResult = branchQueries.join(' UNION ALL ');
    const totalSql = `SELECT COUNT(*) AS total FROM (${combinedSqlResult}) AS combined`;

    const request = pool.request();
    request.input('currentUserId', sql.NVarChar(100), userId);
    request.input('receiverUnit', sql.NVarChar(100), receiverUnit);

    const result = await request.query(totalSql);
    return result.recordset[0]?.total ?? 0;
  }
  //////////////////////////
  private isHtml(str: string): boolean {
    if (!str) return false;
    return str.includes('<div') || str.includes('<span');
  }

  private mapStatusCodeToHtmlIncoming(status: string): string {
    const s = status?.trim();
    if (!s) return s;

    // Các màu sắc tương tự Outgoing
    const colorSuccess = { bg: '#ADECC0AB', text: '#007222' };
    const colorError = { bg: '#FFDCD9', text: '#F44336' };
    const colorWarning = { bg: '#FFF9C4', text: '#FBC02D' };

    let color = colorSuccess;
    if (s.includes('trả lại') || s.includes('Thu hồi')) {
      color = colorError;
    } else if (s.includes('Chờ') || s.includes('Đang') || s.includes('tạo mới') || s.includes('Dự thảo')) {
      color = colorWarning;
    }

    return `
<div style="
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
  background:${color.bg};
  color:${color.text};
">
  ${s}
</div>`.trim();
  }

  /**
   * Gộp 3 API incoming "chờ xử lý" thành 1 endpoint duy nhất:
   *   - main-process        (processFn=xulychinhCB,    type=deadline)
   *   - recipient-to-know   (processFn=nhandebietPGD2, type=waiting)
   *   - implementation-coordination (processFn=phoihopTP, type=waiting)
   *
   * Mỗi nhánh dùng đúng type-filter giống API gốc, dedup theo document_id
   * (ưu tiên: processor > supporter > viewer).
   */
  async listDocumentsMergedWaiting(query: ListDocumentsNoTypeDto, userId: string, authorId?: string) {
    const startTime = Date.now();

    const pool = await this.getPool();
    const { page = 1, limit = 20, filter, sort, authority, isExport, countOnly } = query;

    if (authority === 'true' && authorId) userId = authorId;

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = isExport === 'true' ? 9999 : Math.min(Number(limit) || 20, 1000);
    const offsetNum = (pageNum - 1) * limitNum;

    // 1. User context
    const { userContext, receiverUnit } = await this.getListContext(userId, 'xulychinhCB', pool);

    let groupUser: any;
    try { groupUser = await this.groupUserService.findByCode(GROUP_CODES.VAN_THU); } catch { groupUser = null; }
    const groupUserId: string[] = groupUser?.data?.users?.map((u: any) => u.id) || [];
    const isVanThu = groupUserId.includes(userId);

    // 2. Xác định tab permissions từ role-feature (processKey=PHUC_DAP_DV)
    // 2. Xác định tab permissions + featureManagement
    const rfConfig = await this.roleFeatureRepository.findOne({ where: { processKey: 'PHUC_DAP_DV' } });
    let allowedTabs: Set<string> | null = null; // null = cho phép tất cả

    try {
      if (rfConfig && Array.isArray(rfConfig.roles) && rfConfig.roles.length > 0) {
        const userEntity = await this.userRepo.findOne({ where: { id: userId }, select: ['id', 'rolesByProcess'] });
        const userRoleCodes = new Set<string>();
        if (userEntity?.rolesByProcess) {
          for (const rbp of userEntity.rolesByProcess) {
            if (rbp.processKey === 'PHUC_DAP_DV' && Array.isArray(rbp.roles)) {
              for (const r of rbp.roles) { if (r.roleCode) userRoleCodes.add(r.roleCode); }
            }
          }
        }
        if (userRoleCodes.size > 0) {
          allowedTabs = new Set<string>();
          for (const role of rfConfig.roles) {
            if (userRoleCodes.has(role.roleCode) && Array.isArray(role.permissions)) {
              for (const perm of role.permissions) { if (perm) allowedTabs.add(String(perm)); }
            }
          }
        }
      }
    } catch { allowedTabs = null; }

    const findActiveCode = (equivs: string[]): string | null => {
      if (!allowedTabs || allowedTabs.size === 0) return equivs[0];
      for (const e of equivs) { if (allowedTabs.has(e)) return e; }
      return equivs[0];
    };

    const codeProc = findActiveCode(['xulychinhCB', 'xulychinhGD', 'xulychinhTP', 'xulychinhtpsl', 'xulychinhVP', 'xulychinhLDAO', 'PDDVxulychinhGD', 'PDDV_PDDV_xulychinhGD']);
    const codeView = findActiveCode(['nhandebietPGD2', 'nhandebietTP', 'nhandebietCB', 'PDDVnhandebietPGD2', 'nhandebietdaxem', 'PDDVnhandebietdaxem']);
    const codeImpl = findActiveCode(['phoihopTP', 'phoihopCB', 'phoihopGD', 'PDDVphoihopTP', 'phoihopCHTTP', 'phoihopdlx', 'PDDVphoihopdlx', 'PDDVphoihopCHTTP']);
    const codeDir = findActiveCode(['chidaoGD', 'chidaoTP', 'dscdTP', 'PDDVchidaoGD']);

    const [fmProc, fmView, fmImpl, fmDir] = await Promise.all([
      codeProc ? this.featureManagementRepo.findOne({ where: { code: codeProc as string, status: 1, statusFeature: StatusFeature.ACTIVE } }) : null,
      codeView ? this.featureManagementRepo.findOne({ where: { code: codeView as string, status: 1, statusFeature: StatusFeature.ACTIVE } }) : null,
      codeImpl ? this.featureManagementRepo.findOne({ where: { code: codeImpl as string, status: 1, statusFeature: StatusFeature.ACTIVE } }) : null,
      codeDir ? this.featureManagementRepo.findOne({ where: { code: codeDir as string, status: 1, statusFeature: StatusFeature.ACTIVE } }) : null,
    ]);

    // Helper kiểm tra tab có được phép không (bao gồm cả các mã tương đương của lãnh đạo và trưởng phòng)
    const isTabAllowed = (processFn: string): boolean => {
      if (!allowedTabs || allowedTabs.size === 0) return true;
      if (allowedTabs.has(processFn)) return true;
      const equivalents: Record<string, string[]> = {
        'xulychinhCB': ['xulychinhGD', 'xulychinhTP', 'xulychinhtpsl', 'xulychinhVP', 'xulychinhLDAO', 'PDDVxulychinhGD', 'PDDV_PDDV_xulychinhGD'],
        'nhandebietPGD2': ['nhandebietTP', 'nhandebietCB', 'PDDVnhandebietPGD2', 'nhandebietdaxem', 'PDDVnhandebietdaxem'],
        'phoihopTP': ['phoihopCB', 'phoihopGD', 'PDDVphoihopTP', 'phoihopCHTTP', 'phoihopdlx', 'PDDVphoihopdlx', 'PDDVphoihopCHTTP'],
        'chidaoGD': ['chidaoTP', 'dscdTP', 'PDDVchidaoGD'],
      };
      const equivs = equivalents[processFn] || [];
      return equivs.some(e => allowedTabs.has(e));
    };


    // 3. Xử lý filter criteria
    const criteria = this.buildCriteria(filter);

    // Helper build filterPart cho từng branch (bao gồm cả featureManagement criteria)
    const getBranchFilterPart = (fm: any) => {
      const branchCriteria = [...(fm?.criteria ?? []), ...criteria];
      const { sql: filterFeatureBranch } = buildDocumentCriteriaHelper(branchCriteria, 'd', fm, 'incomming_documents');
      return filterFeatureBranch ? ` AND (${filterFeatureBranch})` : '';
    };

    const filterPartProc = getBranchFilterPart(fmProc);
    const filterPartView = getBranchFilterPart(fmView);
    const filterPartImpl = getBranchFilterPart(fmImpl);
    const filterPartDir = getBranchFilterPart(fmDir);

    // 4. Receiver condition
    const receiverCond = isVanThu && receiverUnit
      ? `(au.receiver = @currentUserId OR au.receiver = @receiverUnit OR EXISTS (SELECT 1 FROM ${this.dbname}.dbo.users u_vt WITH (NOLOCK) WHERE u_vt.id = au.receiver AND u_vt.parent = @receiverUnit))`
      : `au.receiver = @currentUserId`;

    // 5. Fields cơ bản dùng chung cho cả 3 nhánh (chỉ giữ cột chắc chắn tồn tại)
    const selectBase = `
      d.document_id, d.abstract_note, d.created_at, d.to_book,
      d.sender_unit, d.receiver_unit, d.document_date, d.urgency_level, d.bpmn_version,
      af.current_action_code AS status_code
    `;

    // 6. isStar per processFn
    const mkStar = (fn: string) =>
      `CASE WHEN EXISTS (SELECT 1 FROM ${this.dbname}.dbo.document_star ds WITH (NOLOCK) WHERE ds.document_id = d.document_id AND ds.user_id = @currentUserId AND ds.step = '${fn}') THEN 1 ELSE 0 END AS isStar`;

    // helper: van thu join clause
    const vtJoin = isVanThu ? `LEFT JOIN ${this.dbname}.dbo.users u_join WITH (NOLOCK) ON u_join.id = au.receiver` : '';

    // === Nhánh 1: main-process (xulychinhCB) ===
    const processStageFilter = (fmProc?.criteria?.some((c: any) => c.name === 'stageStatus'))
      ? '1=1' // ưu tiên dùng filter từ fm.criteria
      : `(au.stage_status='${stageStatusDoc.CHUA_XU_LY}')`;

    const branchProcess = isTabAllowed('xulychinhCB') ? `
      SELECT DISTINCT ${selectBase}, ${mkStar('xulychinhCB')},
        'processor' AS [roleType], N'Xử lý chính' AS [typeLabel], 'xulychinhCB' AS [processFn],
        'waiting' AS [type],
        au.deadline AS userDeadline
      FROM ${this.dbname}.dbo.incomming_documents d WITH (NOLOCK)
      INNER JOIN ${this.dbname}.dbo.incomming_assignment au WITH (NOLOCK)
        ON au.document_id=d.document_id AND au.role_process='processor' AND ${receiverCond} AND ${processStageFilter}
      LEFT JOIN ${this.dbname}.dbo.incomming_current_state af WITH (NOLOCK) ON af.document_id=d.document_id
      ${vtJoin}
      WHERE d.status=1${filterPartProc} AND ISNULL(af.is_completed_doc, 0) = 0
    ` : null;

    // === Nhánh 2: recipient-to-know (nhandebietPGD2) ===
    const viewerStageFilter = (fmView?.criteria?.some((c: any) => c.name === 'stageStatus'))
      ? '1=1'
      : `(au.stage_status='${stageStatusDoc.CHUA_XU_LY}')`;

    const dedupeProcessor = `AND NOT EXISTS (SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment ae WITH (NOLOCK) WHERE ae.document_id=d.document_id AND ${receiverCond.replace(/au\./g, 'ae.')} AND ae.role_process='processor' AND ${processStageFilter.replace(/au\./g, 'ae.')})`;
    const branchViewer = isTabAllowed('nhandebietPGD2') ? `
      SELECT DISTINCT ${selectBase}, ${mkStar('nhandebietPGD2')},
        'viewer' AS [roleType], N'Nhận để biết' AS [typeLabel], 'nhandebietPGD2' AS [processFn],
        'recipient-to-know' AS [type],
        CAST(NULL AS DATETIME) AS userDeadline
      FROM ${this.dbname}.dbo.incomming_documents d WITH (NOLOCK)
      INNER JOIN ${this.dbname}.dbo.incomming_assignment au WITH (NOLOCK)
        ON au.document_id=d.document_id AND au.role_process='viewer' AND ${receiverCond} AND ${viewerStageFilter}
      LEFT JOIN ${this.dbname}.dbo.incomming_current_state af WITH (NOLOCK) ON af.document_id=d.document_id
      ${vtJoin}
      WHERE d.status=1${filterPartView} ${dedupeProcessor}
    ` : null;

    // === Nhánh 3: implementation-coordination (phoihopTP) ===
    const implStageFilter = (fmImpl?.criteria?.some((c: any) => c.name === 'stageStatus'))
      ? '1=1'
      : `((au.stage_status='${stageStatusDoc.CHUA_XU_LY}') OR (au.stage_status='${stageStatusDoc.CHUA_HOAN_THANH}' AND au.deadline IS NOT NULL AND au.deadline >= GETDATE()))`;

    const dedupeProcessorImpl = `AND NOT EXISTS (SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment ae WITH (NOLOCK) WHERE ae.document_id=d.document_id AND ${receiverCond.replace(/au\./g, 'ae.')} AND ae.role_process='processor' AND ${processStageFilter.replace(/au\./g, 'ae.')})`;
    const branchImpl = isTabAllowed('phoihopTP') ? `
      SELECT DISTINCT ${selectBase}, ${mkStar('phoihopTP')},
        'supporter' AS [roleType], N'Phối hợp' AS [typeLabel], 'phoihopTP' AS [processFn],
        'implementation-coordination' AS [type],
        au.deadline AS userDeadline
      FROM ${this.dbname}.dbo.incomming_documents d WITH (NOLOCK)
      INNER JOIN ${this.dbname}.dbo.incomming_assignment au WITH (NOLOCK)
        ON au.document_id=d.document_id AND au.role_process='supporter' AND ${receiverCond} AND ${implStageFilter}
      LEFT JOIN ${this.dbname}.dbo.incomming_current_state af WITH (NOLOCK) ON af.document_id=d.document_id
      ${vtJoin}
      WHERE d.status=1${filterPartImpl} ${dedupeProcessorImpl} AND ISNULL(af.is_completed_doc, 0) = 0
    ` : null;

    // === Nhánh 4: chỉ đạo (chidaoGD) - type=deadline, role_process=processor ===
    const directiveStageFilter = (fmDir?.criteria?.some((c: any) => c.name === 'stageStatus'))
      ? '1=1'
      : `(au.stage_status='${stageStatusDoc.CHUA_XU_LY}')`;

    const dedupeProcessorXulychinh = `AND NOT EXISTS (SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment ae WITH (NOLOCK) WHERE ae.document_id=d.document_id AND ${receiverCond.replace(/au\./g, 'ae.')} AND ae.role_process='processor' AND ${processStageFilter.replace(/au\./g, 'ae.')}) `;
    const branchDirective = isTabAllowed('chidaoGD') ? `
      SELECT DISTINCT ${selectBase}, ${mkStar('chidaoGD')},
        'processor' AS [roleType], N'Chỉ đạo' AS [typeLabel], 'chidaoGD' AS [processFn],
        'chidaoGD' AS [type],
        au.deadline AS userDeadline
      FROM ${this.dbname}.dbo.incomming_documents d WITH (NOLOCK)
      INNER JOIN ${this.dbname}.dbo.incomming_assignment au WITH (NOLOCK)
        ON au.document_id=d.document_id AND au.role_process='processor' AND ${receiverCond} AND ${directiveStageFilter}
      LEFT JOIN ${this.dbname}.dbo.incomming_current_state af WITH (NOLOCK) ON af.document_id=d.document_id
      ${vtJoin}
      WHERE d.status=1${filterPartDir} AND ISNULL(af.is_completed_doc, 0) = 0
    ` : null;

    // 7. Build UNION ALL từ các nhánh được phép (theo quyền PHUC_DAP_DV)
    const activeBranches = [branchProcess, branchViewer, branchImpl, branchDirective].filter((b): b is string => b !== null);
    // const activeBranches = [branchViewer]
    // const activeBranches = [branchImpl]
    if (activeBranches.length === 0) {
      return { items: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 };
    }
    const unionSql = activeBranches.map(b => `(${b})`).join(' UNION ALL ');
    const totalSql = `SELECT COUNT(*) AS total FROM (${unionSql}) AS merged`;
    const aliases: Record<string, string> = {
      document_id: 'documentId', created_at: 'createdAt',
      abstract_note: 'abstractNote', to_book: 'toBook',
      sender_unit: 'senderUnit', receiver_unit: 'receiverUnit', document_date: 'documentDate',
      urgency_level: 'urgencyLevel', status_code: 'statusCode', is_star: 'isStar',
    };
    const orderByColumn = sort ? parseSort(sort, aliases, 'merged') : 'merged.created_at DESC';
    const rowsSql = `SELECT * FROM (${unionSql}) AS merged ORDER BY ${orderByColumn} OFFSET @offsetNum ROWS FETCH NEXT @limitNum ROWS ONLY`;

    const bindParams = (req: sql.Request) => {
      req.input('currentUserId', sql.NVarChar(100), userId);
      req.input('receiverUnit', sql.NVarChar(100), receiverUnit ?? null);
      req.input('offsetNum', sql.Int, offsetNum);
      req.input('limitNum', sql.Int, limitNum);
      return req;
    };

    if (countOnly === 'true') {
      const r = await bindParams(pool.request()).query(totalSql);
      return { total: r.recordset[0]?.total ?? 0 };
    }

    const qStart = Date.now();
    const [totalResult, rowsResult] = await Promise.all([
      bindParams(pool.request()).query(totalSql),
      bindParams(pool.request()).query(rowsSql),
    ]);
    const total: number = totalResult.recordset[0]?.total ?? 0;
    const items: any[] = rowsResult.recordset ?? [];

    if (!items.length) {
      return { items: [], total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
    }

    // Transform
    const tStart = Date.now();
    let detailedItemsMapped: any[];
    const receiveDateFilter = filter?.receiveDate;
    const assignmentEndDateRaw = receiveDateFilter?.endDate;
    const assignmentDateRange = {
      startDate: receiveDateFilter?.startDate,
      endDate: /^\d{4}-\d{2}-\d{2}$/.test(assignmentEndDateRaw || '')
        ? `${assignmentEndDateRaw} 23:59:59.997`
        : assignmentEndDateRaw,
    };
    if (isExport === 'true') {
      detailedItemsMapped = await this.mapDocKeysForExport(items, aliases, authority, userContext, 'combined');
    } else {
      const bpmnVersions = [...new Set(items.map((d: any) => d.bpmn_version).filter(Boolean))] as string[];
      const bpmnEngineMap = await this.phase5_loadBpmnProcesses(bpmnVersions, receiverUnit);
      const detailedItems = await this.mapDocumentDetails(
        items,
        bpmnEngineMap,
        { ...userContext, __assignmentDateRange: assignmentDateRange },
        aliases,
        undefined,
        assignmentDateRange,
      );
      detailedItemsMapped = await this.mapDocKeysForList(
        detailedItems,
        aliases,
        authority,
        userContext,
        'combined',
        isExport,
        assignmentDateRange,
      );
    }

    for (const item of detailedItemsMapped as any[]) {
      if (item.statusCode && !this.isHtml(item.statusCode)) item.status = this.mapStatusCodeToHtmlIncoming(item.statusCode);
      else if (item.statusCode) item.status = item.statusCode;
    }

    // await this.overrideViewerActionsAndFlags(pool, detailedItemsMapped, userId);

    const featureManagement =
      (isTabAllowed('xulychinhCB') && fmProc) ||
      (isTabAllowed('nhandebietPGD2') && fmView) ||
      (isTabAllowed('phoihopTP') && fmImpl) ||
      (isTabAllowed('chidaoGD') && fmDir) ||
      null;

    return { items: detailedItemsMapped, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum), featureManagement };
  }

  /**
   * Chỉ lấy count của 3 danh sách incoming "chờ xử lý" (Dùng cho dashboard/global count)
   */
  async countDocumentsMergedWaiting(userId: string, returnDetails = false): Promise<number | any> {
    const pool = await this.getPool();

    // 1. User context
    const userRes = await pool.request()
      .input('uId', sql.NVarChar(100), userId)
      .query(`SELECT parent AS parentId FROM ${this.dbname}.dbo.users WHERE id = @uId`);
    const receiverUnit = userRes.recordset[0]?.parentId || null;

    let groupUser: any;
    try { groupUser = await this.groupUserService.findByCode(GROUP_CODES.VAN_THU); } catch { groupUser = null; }
    const groupUserId: string[] = groupUser?.data?.users?.map((u: any) => u.id) || [];
    const isVanThu = groupUserId.includes(userId);

    // 2. Xác định tab permissions + featureManagement
    const rfConfig = await this.roleFeatureRepository.findOne({ where: { processKey: 'PHUC_DAP_DV' } });
    let allowedTabs: Set<string> | null = null;

    try {
      if (rfConfig && Array.isArray(rfConfig.roles) && rfConfig.roles.length > 0) {
        const userEntity = await this.userRepo.findOne({ where: { id: userId }, select: ['id', 'rolesByProcess'] });
        const userRoleCodes = new Set<string>();
        if (userEntity?.rolesByProcess) {
          for (const rbp of userEntity.rolesByProcess) {
            if (rbp.processKey === 'PHUC_DAP_DV' && Array.isArray(rbp.roles)) {
              for (const r of rbp.roles) { if (r.roleCode) userRoleCodes.add(r.roleCode); }
            }
          }
        }
        if (userRoleCodes.size > 0) {
          allowedTabs = new Set<string>();
          for (const role of rfConfig.roles) {
            if (userRoleCodes.has(role.roleCode) && Array.isArray(role.permissions)) {
              for (const perm of role.permissions) { if (perm) allowedTabs.add(String(perm)); }
            }
          }
        }
      }
    } catch { allowedTabs = null; }

    const findActiveCode = (equivs: string[]): string | null => {
      if (!allowedTabs || allowedTabs.size === 0) return equivs[0];
      for (const e of equivs) { if (allowedTabs.has(e)) return e; }
      return equivs[0];
    };

    const codeProc = findActiveCode(['xulychinhCB', 'xulychinhGD', 'xulychinhTP', 'xulychinhtpsl', 'xulychinhVP', 'xulychinhLDAO', 'PDDVxulychinhGD', 'PDDV_PDDV_xulychinhGD']);
    const codeView = findActiveCode(['nhandebietPGD2', 'nhandebietTP', 'nhandebietCB', 'PDDVnhandebietPGD2', 'nhandebietdaxem', 'PDDVnhandebietdaxem']);
    const codeImpl = findActiveCode(['phoihopTP', 'phoihopCB', 'phoihopGD', 'PDDVphoihopTP', 'phoihopCHTTP', 'phoihopdlx', 'PDDVphoihopdlx', 'PDDVphoihopCHTTP']);
    const codeDir = findActiveCode(['chidaoGD', 'chidaoTP', 'dscdTP', 'PDDVchidaoGD']);

    const [fmProc, fmView, fmImpl, fmDir] = await Promise.all([
      codeProc ? this.featureManagementRepo.findOne({ where: { code: codeProc as string, status: 1, statusFeature: StatusFeature.ACTIVE } }) : null,
      codeView ? this.featureManagementRepo.findOne({ where: { code: codeView as string, status: 1, statusFeature: StatusFeature.ACTIVE } }) : null,
      codeImpl ? this.featureManagementRepo.findOne({ where: { code: codeImpl as string, status: 1, statusFeature: StatusFeature.ACTIVE } }) : null,
      codeDir ? this.featureManagementRepo.findOne({ where: { code: codeDir as string, status: 1, statusFeature: StatusFeature.ACTIVE } }) : null,
    ]);

    const isTabAllowed = (processFn: string): boolean => {
      if (!allowedTabs || allowedTabs.size === 0) return true;
      if (allowedTabs.has(processFn)) return true;
      const equivalents: Record<string, string[]> = {
        'xulychinhCB': ['xulychinhGD', 'xulychinhTP', 'xulychinhtpsl', 'xulychinhVP', 'xulychinhLDAO', 'PDDVxulychinhGD', 'PDDV_PDDV_xulychinhGD'],
        'nhandebietPGD2': ['nhandebietTP', 'nhandebietCB', 'PDDVnhandebietPGD2', 'nhandebietdaxem', 'PDDVnhandebietdaxem'],
        'phoihopTP': ['phoihopCB', 'phoihopGD', 'PDDVphoihopTP', 'phoihopCHTTP', 'phoihopdlx', 'PDDVphoihopdlx', 'PDDVphoihopCHTTP'],
        'chidaoGD': ['chidaoTP', 'dscdTP', 'PDDVchidaoGD'],
      };
      return (equivalents[processFn] || []).some(e => allowedTabs.has(e));
    };

    const buyerCondInner = isVanThu && receiverUnit
      ? `(au.receiver = @currentUserId OR au.receiver = @receiverUnit OR EXISTS (SELECT 1 FROM ${this.dbname}.dbo.users u_vt WITH (NOLOCK) WHERE u_vt.id = au.receiver AND u_vt.parent = @receiverUnit))`
      : `au.receiver = @currentUserId`;

    const getBranchFilter = (fm: any) => {
      const { sql: fSql } = buildDocumentCriteriaHelper(fm?.criteria ?? [], 'd', fm, 'incomming_documents');
      return fSql ? ` AND (${fSql})` : '';
    };

    const filterPartProc = getBranchFilter(fmProc);
    const filterPartView = getBranchFilter(fmView);
    const filterPartImpl = getBranchFilter(fmImpl);
    const filterPartDir = getBranchFilter(fmDir);

    const procFilter = (fmProc?.criteria?.some((c: any) => c.name === 'stageStatus')) ? '1=1' : `au.stage_status='${stageStatusDoc.CHUA_XU_LY}'`;
    const viewFilter = (fmView?.criteria?.some((c: any) => c.name === 'stageStatus')) ? '1=1' : `au.stage_status='${stageStatusDoc.CHUA_XU_LY}'`;
    const implFilter = (fmImpl?.criteria?.some((c: any) => c.name === 'stageStatus')) ? '1=1' : `((au.stage_status='${stageStatusDoc.CHUA_XU_LY}') OR (au.stage_status='${stageStatusDoc.CHUA_HOAN_THANH}' AND au.deadline IS NOT NULL AND au.deadline >= GETDATE()))`;
    const dirFilter = (fmDir?.criteria?.some((c: any) => c.name === 'stageStatus')) ? '1=1' : `au.stage_status='${stageStatusDoc.CHUA_XU_LY}'`;

    const branches: Array<{ code: string; sql: string }> = [];
    if (isTabAllowed('xulychinhCB')) {
      branches.push({
        code: codeProc || 'xulychinhCB',
        sql: `SELECT DISTINCT d.document_id FROM ${this.dbname}.dbo.incomming_documents d WITH (NOLOCK) INNER JOIN ${this.dbname}.dbo.incomming_assignment au WITH (NOLOCK) ON au.document_id=d.document_id AND au.role_process='processor' AND ${buyerCondInner} AND ${procFilter} LEFT JOIN ${this.dbname}.dbo.incomming_current_state af WITH (NOLOCK) ON af.document_id=d.document_id WHERE d.status=1 ${filterPartProc} AND ISNULL(af.is_completed_doc, 0) = 0`
      });
    }
    if (isTabAllowed('nhandebietPGD2')) {
      const dedup = `AND NOT EXISTS (SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment ae WITH (NOLOCK) WHERE ae.document_id=d.document_id AND ${buyerCondInner.replace(/au\./g, 'ae.')} AND ae.role_process='processor' AND ${procFilter.replace(/au\./g, 'ae.')})`;
      branches.push({
        code: codeView || 'nhandebietPGD2',
        sql: `SELECT DISTINCT d.document_id FROM ${this.dbname}.dbo.incomming_documents d WITH (NOLOCK) INNER JOIN ${this.dbname}.dbo.incomming_assignment au WITH (NOLOCK) ON au.document_id=d.document_id AND au.role_process='viewer' AND ${buyerCondInner} AND ${viewFilter} WHERE d.status=1 ${filterPartView} ${dedup}`
      });
    }
    if (isTabAllowed('phoihopTP')) {
      const dedup = `AND NOT EXISTS (SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment ae WITH (NOLOCK) WHERE ae.document_id=d.document_id AND ${buyerCondInner.replace(/au\./g, 'ae.')} AND ae.role_process='processor' AND ${procFilter.replace(/au\./g, 'ae.')})`;
      branches.push({
        code: codeImpl || 'phoihopTP',
        sql: `SELECT DISTINCT d.document_id FROM ${this.dbname}.dbo.incomming_documents d WITH (NOLOCK) INNER JOIN ${this.dbname}.dbo.incomming_assignment au WITH (NOLOCK) ON au.document_id=d.document_id AND au.role_process='supporter' AND ${buyerCondInner} AND ${implFilter} LEFT JOIN ${this.dbname}.dbo.incomming_current_state af WITH (NOLOCK) ON af.document_id=d.document_id WHERE d.status=1 ${filterPartImpl} ${dedup} AND ISNULL(af.is_completed_doc, 0) = 0`
      });
    }
    if (isTabAllowed('chidaoGD')) {
      branches.push({
        code: codeDir || 'chidaoGD',
        sql: `SELECT DISTINCT d.document_id FROM ${this.dbname}.dbo.incomming_documents d WITH (NOLOCK) INNER JOIN ${this.dbname}.dbo.incomming_assignment au WITH (NOLOCK) ON au.document_id=d.document_id AND au.role_process='processor' AND ${buyerCondInner} AND ${dirFilter} LEFT JOIN ${this.dbname}.dbo.incomming_current_state af WITH (NOLOCK) ON af.document_id=d.document_id WHERE d.status=1 ${filterPartDir} AND ISNULL(af.is_completed_doc, 0) = 0`
      });
    }

    if (!branches.length) {
      return returnDetails ? { total: 0, branchCounts: {}, allowedTabs: allowedTabs ? Array.from(allowedTabs) : null, isVanThu, receiverUnit, branchesCount: 0, codeProc, codeView, codeImpl, codeDir } : 0;
    }

    if (returnDetails) {
      const branchCounts: Record<string, number> = {};
      const queryPromises = branches.map(async (branch) => {
        const countSql = `SELECT COUNT(*) AS total FROM (${branch.sql}) AS b`;
        const res = await pool.request()
          .input('currentUserId', sql.NVarChar(100), userId)
          .input('receiverUnit', sql.NVarChar(100), receiverUnit)
          .query(countSql);

        const countVal = res.recordset[0]?.total ?? 0;
        branchCounts[branch.code] = countVal;
        return countVal;
      });

      const counts = await Promise.all(queryPromises);
      const total = counts.reduce((sum, count) => sum + count, 0);

      return {
        total,
        branchCounts,
        allowedTabs: allowedTabs ? Array.from(allowedTabs) : null,
        isVanThu,
        receiverUnit,
        branchesCount: branches.length,
        codeProc,
        codeView,
        codeImpl,
        codeDir,
      };
    }

    const unionSql = branches.map(b => `(${b.sql})`).join(' UNION ALL ');
    const countSql = `SELECT COUNT(*) AS total FROM (${unionSql}) AS merged`;
    const r = await pool.request().input('currentUserId', sql.NVarChar(100), userId).input('receiverUnit', sql.NVarChar(100), receiverUnit).query(countSql);
    return r.recordset[0]?.total ?? 0;
  }
  ////////////////////
  async listDocumentsReplyDynamic(query: ListDocumentsNoTypeDto, userId: string, authorId?: string) {
    const pool = await this.getPool();
    const { page = 1, limit = 20, filter, sort, processFn, authority, isExport, countOnly } = query;

    if (authority === 'true' && authorId) userId = authorId;

    const where: string[] = [];

    const featureManagement = await this.featureManagementRepo.findOne({
      where: { code: processFn, status: 1, statusFeature: StatusFeature.ACTIVE }
    });

    const userRes = await pool.request()
      .input('currentUserId', sql.NVarChar(100), userId)
      .query(`SELECT parent AS parentId FROM ${this.dbname}.dbo.users WHERE id = @currentUserId`);
    const receiverUnit = userRes.recordset[0]?.parentId || null;

    const criteria: Array<{ name: string; operator: string; value: string | string[] }> = [];
    if (filter && typeof filter === 'object') {
      Object.entries(filter).forEach(([key, value]) => {
        if (!value) return;
        if (typeof value === 'object') {
          const val = value as { startDate?: string; endDate?: string; value?: string };
          if (val.startDate && val.endDate)
            criteria.push({ name: key, operator: 'between', value: [String(val.startDate), String(val.endDate)] });
          else if (val.startDate)
            criteria.push({ name: key, operator: 'gte', value: String(val.startDate) });
          else if (val.endDate)
            criteria.push({ name: key, operator: 'lte', value: String(val.endDate) });
          else if (val.value !== undefined && val.value !== null)
            criteria.push({ name: key, operator: 'like', value: String(val.value) });
        } else {
          criteria.push({ name: key, operator: typeof value === 'string' ? 'like' : 'eq', value: String(value) });
        }
      });
    }

    const featureCriteria = featureManagement?.criteria ?? [];
    const { sql: filterFeature, joins: filterJoins } =
      buildDocumentCriteriaReplyEvictHelper([...featureCriteria, ...criteria], 'incomming_documents', featureManagement, ["abstractNote", "toBook"]);

    if (filterFeature) where.push(`(${filterFeature})`);

    where.push(`
      EXISTS (
        SELECT 1
        FROM ${this.dbname}.dbo.audit a
        WHERE a.document_id = incomming_documents.document_id
          AND (
            a.user_id = @currentUserId
            OR a.created_by = @currentUserId
            OR a.receiver = @currentUserId
            ${receiverUnit ? `OR a.receiver_unit = @receiverUnit OR a.receiver = @receiverUnit` : ''}
          )
      )
    `);

    where.push(`incomming_documents.status = 1`);

    let joinClause = '';
    if (filter?.isStar) {
      joinClause += ` INNER JOIN document_star ds ON ds.document_id = incomming_documents.document_id AND ds.user_id = @currentUserId AND ds.step = @processFn `;
    }

    if (filterJoins) joinClause += ' ' + filterJoins;

    const whereClause = ' WHERE ' + where.join(' AND ');

    let limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    if (isExport === 'true') {
      limitNum = 9999;
    }
    const offsetNum = (pageNum - 1) * limitNum;

    const excludeKeys = ['files', 'statusCode', 'status_code', 'isStar', 'is_star', 'userDeadline', 'user_deadline'];
    const { dbKeys, aliases, allViewFields } = await this.configurationService.buildSelectFieldsNew('incomming_documents', excludeKeys);

    const keyDefaultParts: string[] = [];

    if (allViewFields.includes('statusCode') || allViewFields.includes('status_code'))
      keyDefaultParts.push(`
        (SELECT TOP 1 af.current_action_code
        FROM ${this.dbname}.dbo.incomming_current_state af
        WHERE af.document_id = incomming_documents.document_id) AS status_code
      `);

    if (allViewFields.includes('processors'))
      keyDefaultParts.push(`
        (SELECT TOP 1 ia.receiver
        FROM ${this.dbname}.dbo.incomming_assignment ia
        WHERE ia.document_id = incomming_documents.document_id
          AND ia.stage_status = '${stageStatusDoc.CHUA_XU_LY}'
          AND ia.role_process = 'processor'
        ORDER BY ia.created_at DESC) AS processors
      `);

    keyDefaultParts.push(`
      CASE WHEN EXISTS (
        SELECT 1 FROM document_star ds
        WHERE ds.document_id = incomming_documents.document_id
          AND ds.user_id = @currentUserId
          AND ds.step = @processFn
      ) THEN 1 ELSE 0 END AS isStar
    `);
    if (allViewFields.includes('userDeadline') || allViewFields.includes('user_deadline')) {
      aliases['userDeadline'] = 'user_deadline';
      aliases['userDeadline'] = 'userDeadline';
    }
    aliases['isStar'] = 'is_star';

    const selectFields = [...keyDefaultParts, ...dbKeys].join(', ');
    const orderBy = ' ORDER BY ' + parseSort(sort, aliases);

    const totalSql = ` SELECT COUNT(*) AS total FROM ${this.dbname}.dbo.incomming_documents ${joinClause} ${whereClause} `;

    const rowsSql = ` SELECT ${selectFields} FROM ${this.dbname}.dbo.incomming_documents ${joinClause} ${whereClause} ${orderBy} OFFSET @offsetNum ROWS FETCH NEXT @limitNum ROWS ONLY `;
    // console.log('rowsSql SQL:', rowsSql);
    const processFnValue = String(processFn);
    const bindReplyQueryParams = (request: sql.Request) => {
      request.input('currentUserId', sql.NVarChar(100), userId);
      request.input('processFn', sql.NVarChar(255), processFnValue);
      if (receiverUnit) {
        request.input('receiverUnit', sql.NVarChar(100), String(receiverUnit));
      }
      request.input('offsetNum', sql.Int, offsetNum);
      request.input('limitNum', sql.Int, limitNum);
      return request;
    };
    if (countOnly === 'true') {
      const totalResult = await bindReplyQueryParams(pool.request()).query(totalSql);
      const total = totalResult.recordset[0]?.total ?? 0;
      return { total: total };
    }
    const [totalResult, rowsResult] = await Promise.all([
      bindReplyQueryParams(pool.request()).query(totalSql),
      bindReplyQueryParams(pool.request()).query(rowsSql)
    ]);

    const total = totalResult.recordset[0]?.total ?? 0;
    const items: DocumentRow[] = rowsResult.recordset as DocumentRow[];

    if (!items.length)
      return { success: true, items: [], mesage: "Không có dữ liệu", total: 0, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };

    const detailedItemsMapped = await this.mapDocKeysForList(items, aliases, authority, undefined, undefined, isExport);
    return { success: true, items: detailedItemsMapped, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
  }

  public async getAllOrganizationUnits(
    pool: sql.ConnectionPool,
    userId: any,
  ): Promise<Array<{ id: string; name: string; mpath: string | null }>> {
    const user = await this.sqlsvRepo.getUserById(userId);
    if (!user?.parent) {
      throw new Error('User chưa được gán phòng ban');
    }
    const orgUser = user?.parent?.id;
    const orgs = await this.organizationUnitService.getChildOrganizations(userId, {
      organizationId: orgUser,
      includeSelf: true, // hoặc false tùy yêu cầu
    });
    return orgs.data.map(org => ({
      id: org.id,
      name: org.name,
      mpath: org.mpath || null,
    }));
  }
  // Query 1: Lấy danh sách văn bản theo filter
  public async getFilteredDocuments({
    pool,
    startDate,
    endDate,
    typeDocument,
    receiverUnits,
    senderUnit,
    select,
    documentType,
    dateField = 'created_at',
    assigneeUser,
    useWorkingPeriodIntersection = false,
  }: {
    pool: sql.ConnectionPool;
    startDate?: string;
    endDate?: string;
    typeDocument?: string;
    receiverUnits?: string[];
    senderUnit?: string[];
    select?: string;
    documentType?: string | string[];
    dateField?: string;
    assigneeUser?: string | string[];
    useWorkingPeriodIntersection?: boolean;
  }): Promise<Array<any>> {
    let whereClause = 'WHERE 1=1';
    const request = pool.request();

    // Filter theo ngày tháng
    if (useWorkingPeriodIntersection && startDate && endDate) {
      whereClause += ` AND d.document_date <= @endDate AND ISNULL(d.deadline, d.document_date) >= @startDate`;
      request.input('startDate', sql.DateTime, startDate);
      request.input('endDate', sql.DateTime, endDate);
    } else if (useWorkingPeriodIntersection && startDate) {
      whereClause += ` AND ISNULL(d.deadline, d.document_date) >= @startDate`;
      request.input('startDate', sql.DateTime, startDate);
    } else if (useWorkingPeriodIntersection && endDate) {
      whereClause += ` AND d.document_date <= @endDate`;
      request.input('endDate', sql.DateTime, endDate);
    } else if (startDate && endDate) {
      whereClause += ` AND ${dateField} >= @startDate AND ${dateField} < DATEADD(DAY, 1, @endDate)`;
      request.input('startDate', sql.DateTime, startDate);
      request.input('endDate', sql.DateTime, endDate);
    } else if (startDate) {
      whereClause += ` AND ${dateField} >= @startDate`;
      request.input('startDate', sql.DateTime, startDate);
    } else if (endDate) {
      whereClause += ` AND ${dateField} < DATEADD(DAY, 1, @endDate)`;
      request.input('endDate', sql.DateTime, endDate);
    }

    // Filter theo receiverUnits
    if (receiverUnits && receiverUnits.length > 0) {
      const orgIdsString = receiverUnits.join(',');
      whereClause += ' AND receiver_unit IN (SELECT value FROM STRING_SPLIT(@receiverUnits, \',\'))';
      request.input('receiverUnits', sql.NVarChar(sql.MAX), orgIdsString);
    }

    // Filter theo senderUnit
    if (senderUnit && senderUnit.length > 0) {
      const orgIdsString = senderUnit.join(',');
      whereClause += ' AND d.sender_unit IN (SELECT value FROM STRING_SPLIT(@senderUnit, \',\'))';
      request.input('senderUnit', sql.NVarChar(sql.MAX), orgIdsString);
    }

    // Filter theo người thực hiện (assigneeUser)
    if (assigneeUser) {
      const users = Array.isArray(assigneeUser) ? assigneeUser : [assigneeUser];
      if (users.length > 0) {
        const userIdsString = users.join(',');
        whereClause += `
          AND EXISTS (
            SELECT 1 FROM ${this.dbname}.dbo.audit a_filter
            WHERE a_filter.document_id = d.document_id
              AND a_filter.receiver IN (SELECT value FROM STRING_SPLIT(@assigneeUserFilter, ','))
              AND a_filter.roleProcess = 'processor'
          )
        `;
        request.input('assigneeUserFilter', sql.NVarChar(sql.MAX), userIdsString);
      }
    }

    // Filter theo loại văn bản (hỗ trợ single string hoặc string[])
    const documentTypeArr: string[] = documentType
      ? (Array.isArray(documentType) ? documentType : [documentType]).filter(Boolean)
      : [];
    if (documentTypeArr.length === 1) {
      whereClause += ' AND document_type = @documentType0';
      request.input('documentType0', sql.NVarChar(100), documentTypeArr[0]);
    } else if (documentTypeArr.length > 1) {
      const dtParams = documentTypeArr.map((_, i) => `@dType${i}`).join(', ');
      whereClause += ` AND document_type IN (${dtParams})`;
      documentTypeArr.forEach((v, i) => request.input(`dType${i}`, sql.NVarChar(100), v));
    }

    const query = `
    SELECT 
    ${select}
    FROM ${this.dbname}.dbo.${typeDocument} d
    ${whereClause} AND d.status = 1
  `;

    const result = await request.query(query);
    return result.recordset;
  }

  // Query 3: Lấy thời điểm hoàn thành của văn bản
  private async getCompletedAudits(
    pool: sql.ConnectionPool,
    documentIds: string[],
    typeDocument?: string,
    stageStatus?: string,
  ): Promise<Array<{ document_id: string; completed_time: Date }>> {
    if (documentIds.length === 0) return [];

    const BATCH_SIZE = 2000; // Giới hạn dưới 2100
    const results: Array<{ document_id: string; completed_time: Date }> = [];

    // Chia thành các batch nhỏ hơn
    for (let i = 0; i < documentIds.length; i += BATCH_SIZE) {
      const batch = documentIds.slice(i, i + BATCH_SIZE);
      const request = pool.request();

      const query = `
      SELECT 
        document_id,
        MAX(created_at) as completed_time
      FROM ${this.dbname}.dbo.audit
      WHERE document_id IN (${batch.map((_, idx) => `@docId${idx}`).join(',')})
        AND stage_status = '${stageStatus || stageStatusDoc.HOAN_THANH_VAN_BAN}'
        AND type_document = '${typeDocument || 'IncommingDocument'}'
      GROUP BY document_id
    `;

      // Bind parameters cho batch hiện tại
      batch.forEach((id, index) => {
        request.input(`docId${index}`, sql.VarChar(64), id);
      });

      const result = await request.query(query);
      results.push(...result.recordset);
    }

    return results;
  }

  // Query 4: Lấy danh sách giao việc chưa hoàn thành (chỉ cho Coordinator/Supporter)
  private async getIncompletedAssignments(
    pool: sql.ConnectionPool,
    documentIds: string[],
  ): Promise<Array<{ document_id: string; department_id: string; user_id: string }>> {
    if (documentIds.length === 0) return [];

    const BATCH_SIZE = 2000;
    const results: Array<{ document_id: string; department_id: string; user_id: string }> = [];

    for (let i = 0; i < documentIds.length; i += BATCH_SIZE) {
      const batch = documentIds.slice(i, i + BATCH_SIZE);
      const request = pool.request();

      const query = `
      SELECT 
        ia.document_id,
        u.parent as department_id,
        ia.receiver as user_id
      FROM ${this.dbname}.dbo.incomming_assignment ia WITH (NOLOCK)
      JOIN ${this.dbname}.dbo.users u WITH (NOLOCK) ON u.id = ia.receiver
      WHERE ia.document_id IN (${batch.map((_, idx) => `@docId${idx}`).join(',')})
        AND ia.stage_status = '${stageStatusDoc.CHUA_XU_LY}'
        AND ia.role_process = 'supporter'
    `;

      // Bind parameters
      batch.forEach((id, index) => {
        request.input(`docId${index}`, sql.VarChar(64), id);
      });

      const result = await request.query(query);
      results.push(...result.recordset);
    }

    return results;
  }

  // Logic tính toán thống kê theo phòng ban
  private calculateDepartmentStats(
    documents: Array<{ document_id: string; deadline: Date | null; receiver_unit: string | null }>,
    completedMap: Map<string, Date>,
    incompletedAssignments: Array<{ document_id: string; department_id: string; user_id: string }> = [],
  ): Map<string, { total: number; on_time: number; late: number; unprocessed: number }> {
    const stats = new Map<string, { total: number; on_time: number; late: number; unprocessed: number }>();

    // 1. Duyệt qua văn bản lấy từ receiver_unit (Chủ trì / Xử lý chính)
    for (const doc of documents) {
      const department = doc.receiver_unit;
      if (!department) continue;

      if (!stats.has(department)) {
        stats.set(department, { total: 0, on_time: 0, late: 0, unprocessed: 0 });
      }

      const deptStats = stats.get(department)!;
      deptStats.total++;

      const completedTime = completedMap.get(doc.document_id);

      if (!completedTime) {
        deptStats.unprocessed++;
      } else {
        if (!doc.deadline) {
          deptStats.on_time++;
        } else if (completedTime <= doc.deadline) {
          deptStats.on_time++;
        } else {
          deptStats.late++;
        }
      }
    }

    // 2. Quy về phòng cho nhân sự Phối hợp (Supporter) chưa xử lý
    const processedDepartmentDocs = new Set<string>();

    for (const assign of incompletedAssignments) {
      const department = assign.department_id;
      if (!department) continue;

      const key = `${assign.document_id}_${department}`;
      if (processedDepartmentDocs.has(key)) continue;
      processedDepartmentDocs.add(key);

      if (!stats.has(department)) {
        stats.set(department, { total: 0, on_time: 0, late: 0, unprocessed: 0 });
      }

      const deptStats = stats.get(department)!;
      deptStats.total++;
      deptStats.unprocessed++;
    }

    return stats;
  }

  // Xây dựng kết quả cuối cùng và sắp xếp
  private buildFinalResult(
    departmentStats: Map<string, { total: number; on_time: number; late: number; unprocessed: number }>,
    orgMap: Map<string, { id: string; name: string; mpath: string | null }>,
  ): DepartmentStatisticDto[] {
    const result: Array<DepartmentStatisticDto & { mpath: string | null }> = [];

    for (const [deptId, stats] of departmentStats.entries()) {
      const org = orgMap.get(deptId);

      // Tính chưa xử lý = Tổng VB - Đúng hạn - Trễ hạn
      const unprocessed = stats.total - stats.on_time - stats.late;

      // Tổng số văn bản đã xử lý (có kết quả đúng hạn hoặc trễ hạn)
      const processedCount = stats.on_time + stats.late;

      // Tỷ lệ đúng hạn = Đúng hạn / (Đúng hạn + Trễ hạn) × 100%
      const onTimePercent = processedCount > 0
        ? (stats.on_time / processedCount) * 100
        : 0;

      // Tỷ lệ trễ hạn = 100% - Tỷ lệ đúng hạn
      const latePercent = processedCount > 0 ? 100 - onTimePercent : 0;

      result.push({
        id: deptId,
        senderUnit: org?.name || 'Không xác định',
        totalReceived: stats.total,
        onTime: stats.on_time,
        late: stats.late,
        unprocessed: unprocessed,
        onTimeRate: onTimePercent.toFixed(2) + '%',
        lateRate: latePercent.toFixed(2) + '%',
        onTimeRateRaw: onTimePercent,
        lateRateRaw: latePercent,
        mpath: org?.mpath || null,
      });
    }

    // Sắp xếp: mpath NULL lên đầu, sau đó theo mpath ASC
    result.sort((a, b) => {
      if (a.mpath === null && b.mpath === null) return 0;
      if (a.mpath === null) return -1;
      if (b.mpath === null) return 1;
      return a.mpath.localeCompare(b.mpath);
    });

    // Loại bỏ mpath khỏi kết quả cuối
    return result.map(({ mpath, ...rest }) => rest);
  }
  private buildCriteria(filter: any): Array<{ name: string; operator: string; value: string | string[] }> {
    const criteria: Array<{ name: string; operator: string; value: string | string[] }> = [];
    if (filter && typeof filter === 'object') {
      Object.entries(filter).forEach(([key, value]) => {
        if (!value) return;
        if (['statusCode', 'status_code', 'status', 'processDeadline', 'process_deadline', 'userDeadline', 'user_deadline'].includes(key)) return;
        if (typeof value === 'object') {
          const val = value as { startDate?: string; endDate?: string; value?: string };
          if (val.startDate && val.endDate) criteria.push({ name: key, operator: 'between', value: [String(val.startDate), String(val.endDate)] });
          else if (val.startDate) criteria.push({ name: key, operator: 'gte', value: String(val.startDate) });
          else if (val.endDate) criteria.push({ name: key, operator: 'lte', value: String(val.endDate) });
          else if (val.value !== undefined && val.value !== null) criteria.push({ name: key, operator: 'like', value: String(val.value) });
        } else {
          const operator = typeof value === 'string' ? 'like' : 'eq';
          criteria.push({ name: key, operator, value: String(value) });
        }
      });
    }
    return criteria;
  }

  private async getListContext(userId: string, processFn: string | undefined, pool: sql.ConnectionPool) {
    const getUserRoleCached = async () => {
      const cacheKey = this.buildLookupCacheKey('userRole', userId);
      const cached = await this.getRedisJson<any>(cacheKey);
      if (cached?.roles) {
        return cached;
      }

      const result = await this.userService.getUserRole(userId);
      await this.setRedisJson(cacheKey, result, 60);
      return result;
    };

    const [userRoleRes, featureManagement, userRes] = await Promise.all([
      getUserRoleCached(),
      // processFn identifies the active feature/view configuration of the lookup screen.
      processFn ? this.featureManagementRepo.findOne({
        where: { code: processFn, status: 1, statusFeature: StatusFeature.ACTIVE }
      }) : Promise.resolve(null),
      // parent user id is treated as receiverUnit in the incoming search logic.
      pool.request()
        .input('currentUserId', sql.NVarChar(100), userId)
        .query(`SELECT id, parent AS parentId FROM ${this.dbname}.dbo.users WHERE id = @currentUserId`)
    ]);

    const { roles } = userRoleRes;
    const receiverUnit = userRes.recordset[0]?.parentId || null;
    const userContext = { userId, roles, receiverUnit };

    return { userContext, featureManagement, receiverUnit };
  }

  /**
   * PHASE 1: Handle CountOnly Mode
   * Xử lý trường hợp chỉ cần đếm số lượng, không cần dữ liệu chi tiết
   */
  private async phase1_handleCountOnly(
    pool: sql.ConnectionPool,
    totalSql: string,
    countOnly: string | undefined,
    bindQueryParams?: (request: sql.Request) => sql.Request
  ): Promise<{ total: number } | null> {
    if (countOnly === 'true') {
      const request = bindQueryParams ? bindQueryParams(pool.request()) : pool.request();
      const totalResult = await request.query(totalSql);
      const total = totalResult.recordset[0]?.total ?? 0;
      return { total };
    }
    return null;
  }

  /**
   * PHASE 2: Execute Parallel SQL Queries
   * Thực thi song song 2 queries: COUNT và SELECT data
   */
  private async phase2_executeParallelQueries(
    pool: sql.ConnectionPool,
    totalSql: string,
    rowsSql: string,
    bindQueryParams?: (request: sql.Request) => sql.Request
  ): Promise<{ total: number; items: DocumentRow[] }> {
    let totalResult, rowsResult;
    const totalRequest = bindQueryParams ? bindQueryParams(pool.request()) : pool.request();
    const rowsRequest = bindQueryParams ? bindQueryParams(pool.request()) : pool.request();
    try {
      [totalResult, rowsResult] = await Promise.all([totalRequest.query(totalSql), rowsRequest.query(rowsSql)]);
    } catch (e) {
      const boundParams: Record<string, any> = {};
      try {
        if (totalRequest && (totalRequest as any).parameters) {
          for (const key in (totalRequest as any).parameters) {
            boundParams[key] = (totalRequest as any).parameters[key]?.value;
          }
        }
      } catch (paramErr) {
        this.logger.error('Lỗi khi đọc tham số bind:', paramErr);
      }
      this.logger.error({
        message: 'Lỗi truy vấn dữ liệu SQL parallel',
        error: e?.message || e,
        stack: e?.stack,
        boundParams,
        totalSql,
        rowsSql,
      });
      throw new InternalServerErrorException('Lỗi truy vấn dữ liệu');
    }

    const total = totalResult.recordset[0]?.total ?? 0;
    const items: DocumentRow[] = rowsResult.recordset;

    return { total, items };
  }

  /**
   * PHASE 3: Check Empty Results
   * Kiểm tra kết quả rỗng và early return
   */
  private phase3_checkEmptyResults(items: DocumentRow[], total: number, page: number, limit: number): { success: boolean; items: any[]; mesage: string; total: number; page: number; limit: number; totalPages: number } | null {
    if (!items.length) {
      return { success: true, items: [], mesage: "Không có dữ liệu", total: 0, page, limit, totalPages: Math.ceil(total / limit) };
    }
    return null;
  }

  /**
   * PHASE 4: Extract Unique BPMN Versions
   * Trích xuất danh sách unique BPMN versions từ documents
   */
  private phase4_extractBpmnVersions(items: DocumentRow[]): string[] {
    return [...new Set(items.map(d => d.bpmn_version).filter((v): v is string => typeof v === 'string' && v.trim().length > 0 && v.toUpperCase() !== 'NULL'))];
  }

  /**
   * Helper để serialize dữ liệu BPMN trước khi cache.
   * Xử lý các đối tượng Map và loại bỏ tham chiếu vòng ($parent).
   */
  private serializeBpmnData(data: { process: any; indexes: any; bpmnXML?: string }): string {
    const replacer = (key: string, value: any) => {
      if (key === '$parent') {
        return undefined; // Loại bỏ $parent để tránh lỗi tham chiếu vòng
      }
      if (value instanceof Map) {
        return {
          __dataType: 'Map',
          value: Array.from(value.entries()),
        };
      }
      return value;
    };
    return JSON.stringify(data, replacer);
  }

  /**
   * Helper để deserialize dữ liệu BPMN từ cache.
   * Khôi phục lại các đối tượng Map.
   */
  private deserializeBpmnData(json: string): { process: any; indexes: any; bpmnXML?: string } | null {
    try {
      const reviver = (key: string, value: any) => {
        if (typeof value === 'object' && value !== null) {
          if (value.__dataType === 'Map') {
            return new Map(value.value);
          }
        }
        return value;
      };
      return JSON.parse(json, reviver);
    } catch (error) {
      this.logger.error('Lỗi khi deserialize dữ liệu BPMN từ cache', error);
      return null;
    }
  }

  /**
   * PHASE 5: Load BPMN Processes
   * Tải và parse BPMN XML cho từng version, có sử dụng cache (Redis)
   */
  private async phase5_loadBpmnProcesses(bpmnVersions: string[], receiverUnit: any): Promise<Map<string, { process: any; indexes: any; bpmnXML?: string; userParent: any }>> {
    const bpmnEngineMap = new Map<string, { process: any; indexes: any; bpmnXML?: string; userParent: any }>();
    const rebuildBpmnDataFromXml = async (
      data: { process: any; indexes: any; bpmnXML?: string } | null,
      version: string,
    ): Promise<{ process: any; indexes: any; bpmnXML?: string } | null> => {
      if (!data?.process || !data?.indexes) return null;

      let bpmnXML = data.bpmnXML;
      if (typeof bpmnXML !== 'string') {
        bpmnXML = await this.sqlRepo.getBpmnFile(version);
      }
      if (typeof bpmnXML !== 'string' || !bpmnXML) return data;

      const { process } = await this.bpmnEngine.loadBpmnFromString(bpmnXML);
      const indexes = this.bpmnEngine.buildIndexes(process);
      return { process, indexes, bpmnXML };
    };

    const logBpmnSource = (source: string, version: string, data: { indexes?: any; bpmnXML?: string } | null | undefined) => {
      try {
        const laneMapEntries = data?.indexes?.laneMap instanceof Map
          ? Array.from(data.indexes.laneMap.entries()).slice(0, 8)
          : [];
        // this.logger.log(`[phase5_loadBpmnProcesses] source=${source} version=${version} laneMapSize=${data?.indexes?.laneMap?.size ?? 0} hasXml=${typeof data?.bpmnXML === 'string'} laneMapSample=${JSON.stringify(laneMapEntries)}`);
      } catch (error) {
        // this.logger.warn(`[phase5_loadBpmnProcesses] source=${source} version=${version} log-error=${error?.message || error}`);
      }
    };

    for (const version of bpmnVersions) {
      const cacheKey = `bpmn_engine:${version}`;
      let cachedData: { process: any; indexes: any; bpmnXML?: string } | null = null;

      if (!cachedData && this.cacheManager) {
        const cacheManagerValue = await this.cacheManager.get<any>(cacheKey);
        if (typeof cacheManagerValue === 'string') {
          cachedData = this.deserializeBpmnData(cacheManagerValue);
        } else if (cacheManagerValue?.process && cacheManagerValue?.indexes) {
          cachedData = cacheManagerValue;
        }
        cachedData = await rebuildBpmnDataFromXml(cachedData, version);

        if (cachedData && !this.isValidBpmnCacheData(cachedData)) {
          // this.logger.warn(`[phase5_loadBpmnProcesses] invalid cacheManager cache version=${version}, ignore and reload from DB`);
          cachedData = null;
        }

        if (cachedData?.process && cachedData?.indexes) {
          logBpmnSource('cacheManager', version, cachedData);
        }
      }

      if (!cachedData) {
        const redisRaw = await this.redisClient?.get(cacheKey);
        if (redisRaw) {
          cachedData = await rebuildBpmnDataFromXml(this.deserializeBpmnData(redisRaw), version);
          if (cachedData && !this.isValidBpmnCacheData(cachedData)) {
            // this.logger.warn(`[phase5_loadBpmnProcesses] invalid redis cache version=${version}, ignore and reload from DB`);
            cachedData = null;
          }
          if (cachedData?.process && cachedData?.indexes) {
            logBpmnSource('redis', version, cachedData);
            const serializedData = this.serializeBpmnData(cachedData);
            if (this.cacheManager) {
              try {
                await this.cacheManager.set(cacheKey, serializedData, this.BPMN_CACHE_TTL_SECONDS);
              } catch {
                // ignore cache write errors
              }
            }
          }
        }
      }

      if (cachedData) {
        if (cachedData?.process && cachedData?.indexes) {
          if (typeof cachedData.bpmnXML === 'string') {
            bpmnEngineMap.set(version, { ...cachedData, userParent: receiverUnit });
            continue;
          }

          const bpmnXML = await this.sqlRepo.getBpmnFile(version);
          const hydratedData = { ...cachedData, bpmnXML };
          const serializedHydrated = this.serializeBpmnData(hydratedData);
          await this.setRedisJson(cacheKey, serializedHydrated, this.BPMN_CACHE_TTL_SECONDS);
          if (this.cacheManager) {
            try {
              await this.cacheManager.set(cacheKey, serializedHydrated, this.BPMN_CACHE_TTL_SECONDS);
            } catch {
              // ignore cache write errors
            }
          }
          bpmnEngineMap.set(version, { ...hydratedData, userParent: receiverUnit });
          continue;
        }
      }

      const xml = await this.sqlRepo.getBpmnFile(version);
      if (!xml) {
        bpmnEngineMap.set(version, { process: null, indexes: null, bpmnXML: undefined, userParent: receiverUnit });
        continue;
      }

      const { process } = await this.bpmnEngine.loadBpmnFromString(xml);
      const indexes = this.bpmnEngine.buildIndexes(process);
      const dataToCache = { process, indexes, bpmnXML: xml };
      const serializedData = this.serializeBpmnData(dataToCache);
      logBpmnSource('db', version, dataToCache);

      await this.setRedisJson(cacheKey, serializedData, this.BPMN_CACHE_TTL_SECONDS);
      if (this.cacheManager) {
        try {
          await this.cacheManager.set(cacheKey, serializedData, this.BPMN_CACHE_TTL_SECONDS);
        } catch (error) {
          this.logger.error(`[CACHE] Failed to save cache for BPMN version '${version}'`, error);
        }
      }

      bpmnEngineMap.set(version, { ...dataToCache, userParent: receiverUnit });
    }

    return bpmnEngineMap;
  }
  /**
   * PHASE 6: Map Document Details
   * Enrich documents với workflow details, actions, flags
   */
  private async phase6_mapDocumentDetailsWrapper(
    items: DocumentRow[],
    bpmnEngineMap: Map<string, { process: any; indexes: any; bpmnXML?: string; userParent: any }>,
    userContext: any,
    aliases: Record<string, string>,
    assignmentDateRange?: { startDate?: string; endDate?: string },
  ): Promise<any[]> {
    return await this.mapDocumentDetails(
      items,
      bpmnEngineMap,
      {
        ...userContext,
        __assignmentDateRange:
          assignmentDateRange ?? userContext?.__assignmentDateRange,
      },
      aliases,
      undefined,
      assignmentDateRange,
    );
  }

  /**
   * PHASE 7: Map Document Keys for List
   * Transform document fields, enrich với metadata
   */
  private async phase7_mapDocKeysForListWrapper(
    detailedItems: any[],
    aliases: Record<string, string>,
    authority: string | undefined,
    userContext: any,
    type: string | undefined,
    isExport: string | undefined,
    assignmentDateRange?: { startDate?: string; endDate?: string },
  ): Promise<any[]> {
    return await this.mapDocKeysForList(
      detailedItems,
      aliases,
      authority,
      userContext,
      type,
      isExport,
      assignmentDateRange,
    );
  }

  private async executeAndMap(
    pool: sql.ConnectionPool,
    totalSql: string,
    rowsSql: string,
    page: number,
    limit: number,
    countOnly: string | undefined,
    userContext: any,
    receiverUnit: any,
    aliases: any,
    authority?: string,
    type?: string,
    isExport?: string,
    bindQueryParams?: (request: sql.Request) => sql.Request,
    assignmentDateRange?: { startDate?: string; endDate?: string },
    traceDetailedSteps = false,
  ) {
    const startTotal = Date.now();
    const executeTimings: Record<string, number> = {};

    // PHASE 1: Handle CountOnly Mode
    const startPhase1 = Date.now();
    const countOnlyResult = await this.traceMainProcessStep(
      'incoming.mainProcess.handleCountOnly',
      { 'app.request.count_only': countOnly === 'true' },
      () => this.phase1_handleCountOnly(pool, totalSql, countOnly, bindQueryParams),
      traceDetailedSteps,
    );
    executeTimings['Sub-phase 1: Handle CountOnly'] = Date.now() - startPhase1;
    if (countOnlyResult) {
      // // this.logger.log(`[TIMING] executeAndMap sub-timings: ${JSON.stringify(executeTimings)}`);
      return countOnlyResult;
    }

    // PHASE 2: Execute Parallel SQL Queries
    const startPhase2 = Date.now();
    const { total, items } = await this.traceMainProcessStep(
      'incoming.mainProcess.executeCountAndDataQueries',
      {},
      () => this.phase2_executeParallelQueries(pool, totalSql, rowsSql, bindQueryParams),
      traceDetailedSteps,
    );
    executeTimings['Sub-phase 2: Execute Parallel SQL Queries'] = Date.now() - startPhase2;

    // PHASE 3: Check Empty Results
    const startPhase3 = Date.now();
    const emptyResult = this.phase3_checkEmptyResults(items, total, page, limit);
    executeTimings['Sub-phase 3: Check Empty Results'] = Date.now() - startPhase3;
    if (emptyResult) {
      // // this.logger.log(`[TIMING] executeAndMap sub-timings: ${JSON.stringify(executeTimings)}`);
      return emptyResult;
    }

    // PHASE 4: Extract Unique BPMN Versions
    const startPhase4 = Date.now();
    const bpmnVersions = this.phase4_extractBpmnVersions(items);
    executeTimings['Sub-phase 4: Extract Unique BPMN'] = Date.now() - startPhase4;

    // PHASE 5: Load BPMN Processes
    const startPhase5 = Date.now();
    const bpmnEngineMap = await this.traceMainProcessStep(
      'incoming.mainProcess.loadBpmnProcesses',
      {
        'app.document.count': items.length,
        'app.bpmn.version_count': bpmnVersions.length,
      },
      () => this.phase5_loadBpmnProcesses(bpmnVersions, receiverUnit),
      traceDetailedSteps,
    );
    executeTimings['Sub-phase 5: Load BPMN Processes'] = Date.now() - startPhase5;

    // PHASE 6: Map Document Details
    const startPhase6 = Date.now();
    const detailedItems = await this.traceMainProcessStep(
      'incoming.mainProcess.mapDocumentDetails',
      { 'app.document.count': items.length },
      () => this.phase6_mapDocumentDetailsWrapper(
        items,
        bpmnEngineMap,
        { ...userContext, type },
        aliases,
        assignmentDateRange,
      ),
      traceDetailedSteps,
    );
    executeTimings['Sub-phase 6: Map Document Details'] = Date.now() - startPhase6;

    // PHASE 7: Map Document Keys for List
    const startPhase7 = Date.now();
    const detailedItemsMapped = await this.traceMainProcessStep(
      'incoming.mainProcess.mapDocKeysForList',
      { 'app.document.count': detailedItems.length },
      () => this.phase7_mapDocKeysForListWrapper(
        detailedItems,
        aliases,
        authority,
        userContext,
        type,
        isExport,
        assignmentDateRange,
      ),
      traceDetailedSteps,
    );
    executeTimings['Sub-phase 7: Map Document Keys'] = Date.now() - startPhase7;

    const startOverride = Date.now();
    if (detailedItemsMapped && detailedItemsMapped.length > 0 && isExport !== 'true' && userContext?.userId) {
      await this.traceMainProcessStep(
        'incoming.mainProcess.overrideViewerActionsAndFlags',
        { 'app.document.count': detailedItemsMapped.length },
        () => this.overrideViewerActionsAndFlags(pool, detailedItemsMapped, userContext.userId, assignmentDateRange),
        traceDetailedSteps,
      );
    }
    executeTimings['Sub-phase 8: Override Viewer Actions'] = Date.now() - startOverride;

    const totalTime = Date.now() - startTotal;
    executeTimings['Total'] = totalTime;
    // // this.logger.log(`[TIMING] executeAndMap sub-timings: ${JSON.stringify(executeTimings)}`);

    return { success: true, items: detailedItemsMapped, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  private async buildAdditionalProcessingMap(
    auditMap: Map<string, any[]>,
    userId: string,
    bpmnMap?: Map<string, { process: any; indexes: any; bpmnXML?: string; userParent: any }>,
    items?: DocumentRow[],
  ): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();
    if (!auditMap.size || !userId) return result;

    const createdByMap = new Map<string, Set<string>>();
    for (const [docId, audits] of auditMap) {
      if (!Array.isArray(audits) || audits.length === 0) continue;
      const createdBySet = new Set<string>();
      for (const a of audits) {
        if (a?.receiver === userId && a?.createdBy && a.createdBy !== userId) {
          createdBySet.add(String(a.createdBy));
        }
      }
      if (createdBySet.size > 0) {
        createdByMap.set(docId, createdBySet);
      }
    }

    if (!createdByMap.size) return result;

    const docIds = Array.from(createdByMap.keys());
    const pool = await this.getPool();
    const req = pool.request();
    docIds.forEach((id, i) => req.input(`docAp${i}`, sql.VarChar, id));
    const inSql = docIds.map((_, i) => `@docAp${i}`).join(',');
    const rows = (
      await req.query(`
        SELECT document_id AS documentId, user_id AS userId
        FROM ${this.dbname}.dbo.document_comments
        WHERE is_leader_suggestion = 1
          AND document_id IN (${inSql})
      `)
    ).recordset;

    // Pre-build Map lookup cho items thay vì dùng items.find() trong vòng lặp
    const itemsByDocId = new Map<string, DocumentRow>();
    if (items) {
      for (const item of items) {
        itemsByDocId.set(String(item.document_id), item);
      }
    }

    const matched = new Set<string>();
    for (const row of rows) {
      const docId = String(row.documentId);
      let hasPrevent = false;
      if (bpmnMap && items) {
        const docRow = itemsByDocId.get(docId); // O(1) thay vì O(n)
        const version = docRow?.bpmn_version?.trim();
        const engine = version ? bpmnMap.get(version) : null;
        if (engine?.indexes) {
          const audits = auditMap.get(docId) || [];
          const userAudits = audits.filter(a =>
            (String(a.userId || a.user_id) === String(userId) || String(a.createdBy) === String(userId)) &&
            a.fromNodeId && a.toNodeId
          );
          for (const a of userAudits) {
            const fromNodeId = a.fromNodeId;
            const actionCode = a.actionCode;
            if (fromNodeId && actionCode) {
              const outgoing = engine.indexes.outgoingBySource.get(fromNodeId) || [];
              const actionCodeUpper = actionCode.toUpperCase();
              for (const flow of outgoing) {
                const extProps: Record<string, any> = {};
                if (flow.extensionElements?.values) {
                  for (const ext of flow.extensionElements.values) {
                    if (ext.$type === 'camunda:properties') {
                      const values = ext.values || ext.$children || [];
                      for (const p of values) {
                        extProps[p.name] = p.value;
                      }
                    }
                  }
                }
                const flowActionCode = extProps.actionCode?.toUpperCase();
                const flowName = flow.name?.toUpperCase();
                const flowId = flow.id?.toUpperCase();

                const isMatch = (flowActionCode === actionCodeUpper) ||
                  (flowName === actionCodeUpper) ||
                  (flowId === actionCodeUpper);

                if (isMatch && extProps.preventAdditionalProcessing === 'true') {
                  hasPrevent = true;
                  break;
                }
              }
            }
            if (hasPrevent) break;
          }
        }
      }
      if (!hasPrevent) {
        matched.add(docId);
      }
    }

    for (const docId of docIds) {
      result.set(docId, matched.has(docId));
    }
    return result;
  }

  private async buildDirectiveCommentMap(
    documentIds: string[],
    userId: string,
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (!documentIds.length) return result;

    const pool = await this.getPool();

    const reqDocs = pool.request();
    documentIds.forEach((id, i) => reqDocs.input(`docDc${i}`, sql.VarChar, id));
    const inDocSql = documentIds.map((_, i) => `@docDc${i}`).join(',');
    const docRows = (
      await reqDocs.query(`
        SELECT document_id AS documentId, parent_doc AS parentDoc
        FROM ${this.dbname}.dbo.incomming_documents
        WHERE document_id IN (${inDocSql})
      `)
    ).recordset;

    const targetDocToSourceDocs = new Map<string, string[]>();
    for (const row of docRows) {
      const sourceDocId = String(row.documentId);
      const targets = [sourceDocId];
      if (row.parentDoc) targets.push(String(row.parentDoc));

      for (const targetId of targets) {
        const arr = targetDocToSourceDocs.get(targetId) || [];
        arr.push(sourceDocId);
        targetDocToSourceDocs.set(targetId, arr);
      }
    }

    const targetDocIds = Array.from(targetDocToSourceDocs.keys());
    if (!targetDocIds.length) return result;

    const reqComments = pool.request();
    reqComments.input('directiveUserId', sql.NVarChar, userId);
    targetDocIds.forEach((id, i) => reqComments.input(`docCmt${i}`, sql.VarChar, id));
    const inTargetSql = targetDocIds.map((_, i) => `@docCmt${i}`).join(',');
    const commentRows = (
      await reqComments.query(`
        SELECT
          c.id,
          c.document_id AS documentId,
          c.user_name AS userName,
          c.content,
          c.created_at AS createdAt
        FROM ${this.dbname}.dbo.document_comments c
        LEFT JOIN ${this.dbname}.dbo.comment_tags ct
          ON ct.comment_id = c.id
        WHERE c.document_id IN (${inTargetSql})
          AND c.is_leader_suggestion = 1
          AND c.parent_id IS NULL
        GROUP BY c.id, c.document_id, c.user_name, c.content, c.created_at
        HAVING MAX(
          CASE
            WHEN ct.tagged_user_id = @directiveUserId
              OR ct.tagged_by = @directiveUserId
              OR ct.tagged_user_id IS NULL
            THEN 1 ELSE 0
          END
        ) = 1
        ORDER BY c.created_at DESC
      `)
    ).recordset;

    const byDoc = new Map<string, Array<{ userName: string; content: string }>>();
    for (const row of commentRows) {
      const sourceDocs = targetDocToSourceDocs.get(String(row.documentId)) || [];
      for (const sourceDocId of sourceDocs) {
        const arr = byDoc.get(sourceDocId) || [];
        arr.push({
          userName: row.userName,
          content: row.content,
        });
        byDoc.set(sourceDocId, arr);
      }
    }

    for (const docId of documentIds) {
      const comments = byDoc.get(docId) || [];
      const directiveComment = comments
        .map((item, idx) => `${idx + 1}. ${item.userName}: ${item.content}`)
        .join('\n');
      result.set(docId, directiveComment);
    }

    return result;
  }

  // private async getLatestAssignmentInfoByDocumentIds(
  //   documentIds: string[],
  //   userId: string,
  //   assignmentDateRange?: { startDate?: string; endDate?: string },
  // ): Promise<Map<string, { roleProcess: string | null; parentDocClone: string | null }>> {
  //   const result = new Map<string, { roleProcess: string | null; parentDocClone: string | null }>();
  //   if (!documentIds.length || !userId) return result;

  //   const pool = await this.getPool();
  //   const req = pool.request();
  //   req.input('docIds', sql.NVarChar(sql.MAX), documentIds.join(','));
  //   req.input('userId', sql.NVarChar(100), userId);
  //   if (assignmentDateRange?.startDate) {
  //     req.input('assignmentStartDate', sql.DateTime, assignmentDateRange.startDate);
  //   }
  //   if (assignmentDateRange?.endDate) {
  //     req.input('assignmentEndDate', sql.DateTime, assignmentDateRange.endDate);
  //   }

  //   const rows = (
  //     await req.query(`
  //       ;WITH doc_ids AS (
  //         SELECT LTRIM(RTRIM(value)) AS document_id
  //         FROM STRING_SPLIT(@docIds, ',')
  //       ),
  //       valid_receivers AS (
  //         SELECT @userId AS receiver
  //         UNION
  //         SELECT u.parent
  //         FROM ${this.dbname}.dbo.users u WITH (NOLOCK)
  //         WHERE u.id = @userId
  //           AND u.parent IS NOT NULL
  //       ),
  //       latest_assignment AS (
  //         SELECT
  //           ia.document_id AS documentId,
  //           ia.role_process AS roleProcess,
  //           d.parent_doc_clone AS parentDocClone,
  //           ROW_NUMBER() OVER (
  //             PARTITION BY ia.document_id
  //             ORDER BY ia.created_at DESC, ia.id DESC
  //           ) AS rn
  //         FROM ${this.dbname}.dbo.incomming_assignment ia WITH (NOLOCK)
  //         INNER JOIN doc_ids doc
  //           ON doc.document_id = ia.document_id
  //         INNER JOIN valid_receivers vr
  //           ON vr.receiver = ia.receiver
  //         LEFT JOIN ${this.dbname}.dbo.incomming_documents d WITH (NOLOCK)
  //           ON d.document_id = ia.document_id
  //         WHERE 1 = 1
  //           ${assignmentDateRange?.startDate ? 'AND ia.created_at >= @assignmentStartDate' : ''}
  //           ${assignmentDateRange?.endDate ? 'AND ia.created_at <= @assignmentEndDate' : ''}
  //       )
  //       SELECT documentId, roleProcess, parentDocClone
  //       FROM latest_assignment
  //       WHERE rn = 1
  //     `)
  //   ).recordset;

  //   for (const row of rows) {
  //     result.set(String(row.documentId), {
  //       roleProcess: row.roleProcess ?? null,
  //       parentDocClone: row.parentDocClone ?? null,
  //     });
  //   }

  //   return result;
  // }

  public async mapDocumentDetails(
    items: DocumentRow[],
    bpmnMap: Map<string, { process: any; indexes: any; bpmnXML?: string; userParent: any }>,
    userContext: { userId: string; roles?: string[]; unit?: string; __assignmentDateRange?: { startDate?: string; endDate?: string } },
    aliases: Record<string, string> = {},
    skipActions?: boolean | string,
    assignmentDateRange?: { startDate?: string; endDate?: string },
  ): Promise<any[]> {
    if (!items.length) return [];
    const mapStart = Date.now();
    const isSkipActions = skipActions
    const effectiveAssignmentDateRange = assignmentDateRange ?? userContext?.__assignmentDateRange;

    const pool = await this.getPool();
    const documentIds = items.map(d => d.document_id);

    let workItems: any[] = [];
    const workItemMap: Record<string, any[]> = {};
    if (!isSkipActions) {
      const wiStart = Date.now();
      const reqWI = pool.request();
      reqWI.input('docIds', sql.NVarChar(sql.MAX), documentIds.join(','));

      workItems = (
        await reqWI.query<WorkItemRow[]>(
          `SELECT DISTINCT id, document_id, node_id, role, assignee_user_id, node_type, state
           FROM work_items
           WHERE state = 'open'
             AND document_id IN (
               SELECT LTRIM(RTRIM(value))
               FROM STRING_SPLIT(@docIds, ',')
             )`,
        )
      ).recordset;
      //this.logger.log(`[mapDocumentDetails] Step 1: work_items query took ${Date.now() - wiStart}ms`);

      for (const wi of workItems) {
        (workItemMap[wi.document_id] ||= []).push({
          id: String(wi.id),
          nodeId: wi.node_id,
          role: wi.role,
          assigneeUserId: wi.assignee_user_id,
          nodeType: wi.node_type,
          state: wi.state,
        });
      }
    } else {
      // this.logger.log(`[mapDocumentDetails] Step 1: Skipped work_items query due to skipActions`);
    }

    const auditStart = Date.now();
    const auditMap = await this.getAuditByDocumentIds(documentIds);
    const buildAssignmentAuditDate = (dateValue?: string, endOfDay = false): string | undefined => {
      if (!dateValue) return undefined;
      const baseDate = new Date(dateValue);
      if (Number.isNaN(baseDate.getTime())) return undefined;
      if (endOfDay) {
        baseDate.setHours(23, 59, 59, 997);
      } else {
        baseDate.setHours(0, 0, 0, 0);
      }
      const pad = (value: number) => String(value).padStart(2, '0');
      const year = baseDate.getFullYear();
      const month = pad(baseDate.getMonth() + 1);
      const day = pad(baseDate.getDate());
      const hours = pad(baseDate.getHours());
      const minutes = pad(baseDate.getMinutes());
      const seconds = pad(baseDate.getSeconds());
      const millis = String(baseDate.getMilliseconds()).padStart(3, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${millis}`;
    };
    const activeAssignmentsAuditFilter = {
      typeDocument: effectiveAssignmentDateRange?.startDate || effectiveAssignmentDateRange?.endDate ? 'IncommingDocument' : undefined,
      startDate: buildAssignmentAuditDate(effectiveAssignmentDateRange?.startDate, false),
      endDate: buildAssignmentAuditDate(effectiveAssignmentDateRange?.endDate, true),
    };
    const activeAssignmentsMap = await this.sqlRepo.getIncomingActiveAssignmentsMap(documentIds, activeAssignmentsAuditFilter);
    // this.logger.log(`[mapDocumentDetails] Step 2: getAuditByDocumentIds took ${Date.now() - auditStart}ms`);
    // Tạm thời không dùng latestAssignmentInfo để tránh query assignment chậm.
    // Workflow grouping và action compute sẽ chạy không kèm context assignment gần nhất.
    const latestAssignmentInfoMap = new Map<string, { roleProcess: string | null; parentDocClone: string | null }>();



    const rolesStart = Date.now();
    const uniqueBpmnVersions = [...new Set(items.map(d => d.bpmn_version?.trim()).filter(Boolean))] as string[];
    const userRolesByVersion = new Map<string, string[]>();
    const versionRoleCacheKeys = new Map<string, string>();
    for (const version of uniqueBpmnVersions) {
      versionRoleCacheKeys.set(version, this.buildLookupCacheKey('userRole', `${userContext.userId}:${version}`));
    }
    const cachedRolesByKey = await this.getRedisJsonBatch<string[]>(
      Array.from(versionRoleCacheKeys.values()),
    );
    const getUserRolesByVersionCached = async (version: string): Promise<string[]> => {
      const cacheKey = versionRoleCacheKeys.get(version) || this.buildLookupCacheKey('userRole', `${userContext.userId}:${version}`);
      const cachedRoles = cachedRolesByKey.get(cacheKey);
      if (Array.isArray(cachedRoles)) {
        return cachedRoles;
      }

      const res = await this.userService.getUserRole(userContext.userId, version);
      const roles = Array.isArray(res?.roles) ? res.roles : [];
      cachedRolesByKey.set(cacheKey, roles);
      await this.setRedisJson(cacheKey, roles, 60);
      return roles;
    };

    if (!isSkipActions) {
      await Promise.all(
        uniqueBpmnVersions.map(async (version) => {
          try {
            const roles = await getUserRolesByVersionCached(version);
            userRolesByVersion.set(version, roles);
          } catch (err) {
            console.error(`Error loading roles for version ${version}:`, err);
          }
        })
      );
      // this.logger.log(`[mapDocumentDetails] Step 3: userRolesByVersion took ${Date.now() - rolesStart}ms`);
    } else {
      // this.logger.log(`[mapDocumentDetails] Step 3: Skipped userRolesByVersion due to skipActions`);
    }

    const addProcessingStart = Date.now();
    const [additionalProcessingMap, directiveCommentMap] = await Promise.all([
      this.buildAdditionalProcessingMap(auditMap, userContext.userId, bpmnMap, items),
      this.buildDirectiveCommentMap(documentIds, userContext.userId),
    ]);
    // this.logger.log(`[mapDocumentDetails] Step 4: additionalProcessing + directiveComment took ${Date.now() - addProcessingStart}ms`);

    const groupStart = Date.now();
    const usersByRoleCache = new Map<string, Promise<any[]>>();
    const usersByRoleRedisKeyMap = new Map<string, string>();

    for (const doc of items) {
      const openWorkItems = workItemMap[doc.document_id] || [];
      for (const wi of openWorkItems) {
        const roleKey = String(wi?.role || '').trim();
        if (!roleKey || usersByRoleRedisKeyMap.has(roleKey)) continue;
        usersByRoleRedisKeyMap.set(roleKey, this.buildLookupCacheKey('usersByRole', roleKey));
      }
    }

    const cachedUsersByRole = await this.getRedisJsonBatch<any[]>(
      Array.from(usersByRoleRedisKeyMap.values()),
    );

    const getUsersByRoleCached = (role: string) => {
      const roleKey = String(role || '').trim();
      if (!roleKey) {
        return Promise.resolve([]);
      }
      if (!usersByRoleCache.has(roleKey)) {
        const redisKey = usersByRoleRedisKeyMap.get(roleKey) || this.buildLookupCacheKey('usersByRole', roleKey);
        const cachedUsers = cachedUsersByRole.get(redisKey);
        if (Array.isArray(cachedUsers)) {
          usersByRoleCache.set(roleKey, Promise.resolve(cachedUsers));
        } else {
          usersByRoleCache.set(
            roleKey,
            Promise.resolve(this.userService.getUsersByRoleSQL(roleKey)).then(async (users) => {
              const normalizedUsers = Array.isArray(users) ? users : [];
              cachedUsersByRole.set(redisKey, normalizedUsers);
              await this.setRedisJson(redisKey, normalizedUsers, 300);
              return normalizedUsers;
            }),
          );
        }
      }
      return usersByRoleCache.get(roleKey)!;
    };

    const staticActionsCache = new Map<string, Promise<any>>();
    const prefetchedActionCache = new Map<string, any>();

    const buildEmptyResult = (doc: DocumentRow, audit: any[] = [], activeAssignments: any[] = []) => {
      const directiveComment = directiveCommentMap.get(doc.document_id) || '';
      const docmWithComment = {
        ...doc,
        directive_comment: directiveComment,
      };
      const activeReceiverIdsRaw = this.mapReceiverIds(activeAssignments, userContext, false);
      const assignedReceiverIdsRaw = this.mapReceiverIds(audit, userContext, true);

      const activeReceiverIdsFiltered = this.filterUniqueReceiverIds(activeReceiverIdsRaw);
      const assignedReceiverIds = this.filterUniqueReceiverIds(assignedReceiverIdsRaw);
      const mergedReceiverIds = this.filterUniqueReceiverIds([...assignedReceiverIds, ...activeReceiverIdsFiltered]);

      return {
        ...mapDocKeys(docmWithComment, aliases),
        userPhanCong: [],
        openWorkItems: [],
        workItem: null,
        node: null,
        availableActions: [],
        flags: {
          canEditFile: true,
        },
        flagsProcess: { canSetSupporter: false, canSetViewer: false, canSetProcessor: true },
        perItems: [],
        assignedReceiverIds: mergedReceiverIds,
        activeReceiverIds: activeReceiverIdsFiltered,
      };
    };

    const buildGroupKey = (doc: DocumentRow, version: string, openWorkItems: any[], audit: any[]) => {
      const nodeParts = openWorkItems
        .map((wi) => `${wi?.nodeId || ''}:${wi?.role || ''}:${wi?.assigneeUserId || ''}`)
        .sort()
        .join('|');

      const auditParts = audit
        .map((a) => `${a.action_code || a.actionCode || ''}:${a.user_id || a.userId || ''}:${a.receiver || ''}`)
        .join(',');

      const statusCode = doc.status_code || (doc as any).statusCode || '';

      const nodeIds = Array.from(
        new Set(
          openWorkItems
            .map((wi) => String(wi?.nodeId || '').trim())
            .filter(Boolean),
        ),
      ).sort();

      return {
        key: `${version}::${nodeParts}::${statusCode}`,
        nodeIds,
      };
    };

    const documentGroupKeyMap = new Map<string, string>();
    const representativeGroupMap = new Map<
      string,
      {
        version: string;
        engine: { process: any; indexes: any; bpmnXML?: string; userParent: any };
        representativeDoc: DocumentRow;
        representativeAudit: any[];
        representativeWorkItems: any[];
      }
    >();

    if (!isSkipActions) {
      for (const doc of items) {
        const version = doc.bpmn_version?.trim();
        if (!version) continue;

        const engine = bpmnMap.get(version);
        if (!engine?.process || !engine?.indexes) continue;

        const openWorkItems = workItemMap[doc.document_id] || [];
        if (!openWorkItems.length) continue;

        const docAudit = auditMap.get(doc.document_id) || [];
        const { key, nodeIds } = buildGroupKey(doc, version, openWorkItems, docAudit);
        if (!nodeIds.length) continue;

        documentGroupKeyMap.set(doc.document_id, key);

        if (!representativeGroupMap.has(key)) {
          representativeGroupMap.set(key, {
            version,
            engine,
            representativeDoc: doc,
            representativeAudit: docAudit,
            representativeWorkItems: openWorkItems,
          });
        }
      }
    }

    if (!isSkipActions) {
      const actionCacheKeys = new Set<string>();
      for (const doc of items) {
        const openWorkItems = workItemMap[doc.document_id] || [];
        if (!openWorkItems.length) continue;

        const audit = auditMap.get(doc.document_id) || [];
        const typeDoc = String(audit?.[0]?.typeDocument || (doc as any)?.typeDocument || 'Unknown');
        for (const wi of openWorkItems) {
          const nodeId = String(wi?.nodeId || '').trim();
          if (!nodeId) continue;
          actionCacheKeys.add(
            this.buildBpmnActionCacheKey(typeDoc, String(doc.document_id), userContext.userId, nodeId),
          );
        }
      }

      const cachedActionByRedisKey = new Map<string, any>();
      for (const doc of items) {
        const version = doc.bpmn_version?.trim();
        if (!version) continue;

        const audit = auditMap.get(doc.document_id) || [];
        const openWorkItems = workItemMap[doc.document_id] || [];
        const groupKey = documentGroupKeyMap.get(doc.document_id);
        for (const wi of openWorkItems) {
          const nodeId = String(wi?.nodeId || '').trim();
          if (!nodeId) continue;

          const typeDoc = String(audit?.[0]?.typeDocument || (doc as any)?.typeDocument || 'Unknown');
          const redisKey = this.buildBpmnActionCacheKey(typeDoc, String(doc.document_id), userContext.userId, nodeId);
          const staticCacheKey = groupKey
            ? `${groupKey}::${wi.nodeId}::${wi.role || ''}::${wi.assigneeUserId || ''}`
            : `${version}::${doc.document_id}::${wi.nodeId}::${wi.role || ''}::${wi.assigneeUserId || ''}`;
          const cachedValue = cachedActionByRedisKey.get(redisKey);
          if (cachedValue) {
            prefetchedActionCache.set(staticCacheKey, cachedValue);
          }
        }
      }
    }

    const groupActionTemplateMap = new Map<
      string,
      Map<
        string,
        { node: any; availableActions: any[]; flags: Record<string, boolean> }
      >
    >();
    const actionCacheWriteEntries: Array<{ key: string; data: any }> = [];

    if (!isSkipActions) {
      await Promise.all(
        Array.from(representativeGroupMap.entries()).map(async ([groupKey, group]) => {
          const perNodeTemplate = new Map<
            string,
            { node: any; availableActions: any[]; flags: Record<string, boolean> }
          >();

          const uniqueNodeWorkItems = new Map<string, any>();
          for (const wi of group.representativeWorkItems) {
            const nodeKey = String(wi?.nodeId || '').trim();
            if (!nodeKey || uniqueNodeWorkItems.has(nodeKey)) continue;
            uniqueNodeWorkItems.set(nodeKey, wi);
          }

          await Promise.all(
            Array.from(uniqueNodeWorkItems.values()).map(async (wi) => {
              const nodeKey = String(wi?.nodeId || '').trim();
              const staticCacheKey = `${groupKey}::${wi.nodeId}::${wi.role || ''}::${wi.assigneeUserId || ''}`;

              const docRoles = userRolesByVersion.get(group.version) || userContext.roles || [];
              if (!staticActionsCache.has(staticCacheKey)) {
                const prefetched = prefetchedActionCache.get(staticCacheKey);
                if (prefetched) {
                  staticActionsCache.set(staticCacheKey, Promise.resolve(prefetched));
                } else {
                  staticActionsCache.set(
                    staticCacheKey,
                    this.bpmnEngine.computeAvailableActions({
                      process: group.engine.process,
                      indexes: group.engine.indexes,
                      currentNodeId: wi.nodeId,
                      workItem: wi,
                      document: group.representativeDoc,
                      userId: userContext.userId,
                      userRoles: docRoles,
                      getUsersByRole: getUsersByRoleCached,
                      audit: group.representativeAudit,
                      userParent: group.engine.userParent,
                      documentId: String(group.representativeDoc.document_id),
                      bpmnXML: group.engine.bpmnXML,
                      skipRedisRead: true,
                    }),
                  );
                }
              }

              const res = await staticActionsCache.get(staticCacheKey)!;

              perNodeTemplate.set(nodeKey, {
                node: res.node,
                availableActions: Array.isArray(res.availableActions)
                  ? res.availableActions
                  : [],
                flags: res.flags || {},
              });
            }),
          );

          groupActionTemplateMap.set(groupKey, perNodeTemplate);
        }),
      );

      for (const doc of items) {
        const groupKey = documentGroupKeyMap.get(doc.document_id);
        if (!groupKey) continue;

        const groupTemplate = groupActionTemplateMap.get(groupKey);
        if (!groupTemplate) continue;

        const audit = auditMap.get(doc.document_id) || [];
        const openWorkItems = workItemMap[doc.document_id] || [];
        const typeDoc = String(audit?.[0]?.typeDocument || (doc as any)?.typeDocument || 'Unknown');

        for (const wi of openWorkItems) {
          const nodeKey = String(wi?.nodeId || '').trim();
          if (!nodeKey) continue;

          const template = groupTemplate.get(nodeKey);
          if (!template) continue;

          actionCacheWriteEntries.push({
            key: this.buildBpmnActionCacheKey(typeDoc, String(doc.document_id), userContext.userId, nodeKey),
            data: {
              node: template.node,
              availableActions: template.availableActions,
              flags: template.flags,
            },
          });
        }
      }
      // this.logger.log(`[mapDocumentDetails] Step 5: Representative BPMN calculations took ${Date.now() - groupStart}ms`);
    } else {
      // this.logger.log(`[mapDocumentDetails] Step 5: Skipped Representative BPMN calculations due to skipActions`);
    }

    if (actionCacheWriteEntries.length) {
      // Skip persisting action cache here to avoid reusing stale availableActions
      // after workflow transitions that update audit/work items in place.
    }

    const loopStart = Date.now();
    const result = await Promise.all(
      items.map(async doc => {
        const version = doc.bpmn_version?.trim();
        const engine = version ? bpmnMap.get(version) : null;
        const docView = { ...doc, is_incomming: true };

        if (isSkipActions || !engine?.process || !engine?.indexes) {
          const docAudit = auditMap.get(doc.document_id) || [];
          const docActive = activeAssignmentsMap.get(doc.document_id) || [];
          return buildEmptyResult(docView as any, docAudit, docActive);
        }

        const openWorkItems = workItemMap[doc.document_id] || [];
        if (!openWorkItems.length) {
          const docAudit = auditMap.get(doc.document_id) || [];
          const docActive = activeAssignmentsMap.get(doc.document_id) || [];
          return buildEmptyResult(docView as any, docAudit, docActive);
        }

        const audit = auditMap.get(doc.document_id) || [];
        const groupKey = documentGroupKeyMap.get(doc.document_id);
        const groupTemplate = groupKey ? groupActionTemplateMap.get(groupKey) : null;

        let perItems: any[];
        if (groupTemplate) {
          perItems = openWorkItems.map((wi) => {
            const nodeKey = String(wi?.nodeId || '').trim();
            const template = groupTemplate.get(nodeKey);

            return {
              workItem: wi,
              node: template?.node ? deepClone(template.node) : null,
              availableActions: Array.isArray(template?.availableActions)
                ? deepClone(template.availableActions)
                : [],
              flags: template?.flags ? deepClone(template.flags) : {},
            };
          });
        } else {
          perItems = await Promise.all(
            openWorkItems.map(async wi => {
              const docRoles = (version && userRolesByVersion.get(version)) || userContext.roles || [];
              const staticCacheKey = `${version}::${doc.document_id}::${wi.nodeId}::${wi.role || ''}::${wi.assigneeUserId || ''}`;
              const prefetched = prefetchedActionCache.get(staticCacheKey);
              if (prefetched) {
                return {
                  workItem: wi,
                  node: prefetched.node ? deepClone(prefetched.node) : null,
                  availableActions: Array.isArray(prefetched.availableActions)
                    ? deepClone(prefetched.availableActions)
                    : [],
                  flags: prefetched.flags ? deepClone(prefetched.flags) : {},
                };
              }
              const res = await this.bpmnEngine.computeAvailableActions({
                process: engine.process,
                indexes: engine.indexes,
                currentNodeId: wi.nodeId,
                workItem: wi,
                document: docView,
                userId: userContext.userId,
                userRoles: docRoles,
                getUsersByRole: getUsersByRoleCached,
                audit,
                userParent: engine.userParent,
                documentId: String(doc.document_id),
                bpmnXML: engine.bpmnXML,
                skipRedisRead: true,
              });

              return {
                workItem: wi,
                node: res.node,
                availableActions: Array.isArray(res.availableActions)
                  ? res.availableActions
                  : [],
                flags: res.flags || {},
              };
            }),
          );
        }

        const mergedAvailableActionsAll = perItems
          .filter((x) => Array.isArray(x.availableActions))
          .flatMap((x) =>
            x.availableActions.map((a: any) => ({
              ...a,
              workItemId: x.workItem?.id,
              nodeId: x.workItem?.nodeId,
            })),
          );
        const seenActions = new Set<string>();
        const mergedAvailableActions = mergedAvailableActionsAll.filter((a: any) => {
          const key = `${a.code}_${a.flowId || ''}_${a.type || ''}_${a.label || ''}`;
          if (seenActions.has(key)) return false;
          seenActions.add(key);
          return true;
        });
        const summary =
          perItems.find(
            x =>
              Array.isArray(x.availableActions) &&
              x.availableActions.some(a => a.canExecute && a.type !== 'completeDoc'),
          ) ||
          perItems[0] ||
          { workItem: null, node: null, availableActions: [], flags: {} };

        const flags = {
          canProcess: false,
          canReturn: false,
          canComplete: false,
          canProcessSupport: false,
          canReturnSupport: false,
          canCompleteSupport: false,
          canViewed: false,
          canRecall: false,
          canCompleteDoc: false,
          canSigningSubmission: false,
          canGiveFeedback: false,
          canApprove: false,
          canCompleteProposal: false,
          canIssueProposal: false,
          canTransferFeedback: false,
          canSetNumber: false,
          canSuggestPromulgate: false,
          canTransferOptions: false,
          canSignDraft: false,
          canSignCertificate: false,
          canDigitalSign: false,
          canOfficialSigner1: false,
          canOfficialSigner2: false,
          canOfficialSigner3: false,
          canReject: false,
          canSaveBook: false,
        } as Record<string, boolean>;

        for (const item of perItems) {
          for (const key in item.flags) {
            if (item.flags[key]) flags[key] = true;
          }
        }

        const actualCanRecall = this.bpmnEngine.canRecallDocument(
          audit,
          userContext.userId,
          docView.is_incomming ? 'IncomingDocument' : 'OutgoingDocument',
          userContext.unit,
        );

        const actualIsKy = audit.some(
          x =>
            x.actionCode === 'KY_NHAY_NOI_DUNG' ||
            x.actionCode === 'KY_NHAY_THE_THUC' ||
            x.actionCode === 'KY_SO' ||
            x.actionCode === 'KY_NHAY' ||
            x.actionCode === 'DONG_DAU',
        );

        flags.canRecall = actualCanRecall;
        // Refresh: force NestJS restart to reload updated database BPMN
        const hasCannotRecall = perItems.some((item) => {
          const props = getAllNodeExtensionProperties(item.node);
          return props?.cannotRecall === 'true' || props?.cannotRecall === '1';
        });
        if (hasCannotRecall) {
          flags.canRecall = false;
        }
        if (actualIsKy) {
          flags.canEditFile = false;
        } else {
          if (flags.canEditFile === undefined) {
            flags.canEditFile = true;
          }
        }

        const hasViewedAudit = audit.some(a =>
          (a.receiver === userContext.userId || a.userId === userContext.userId) &&
          a.roleProcess === 'viewer'
        );
        if (hasViewedAudit) {
          flags.canViewed = true;
        }


        let canSetSupporter = false;
        let canSetViewer = false;
        const canSetProcessor = true;
        // const summaryAvailableActions = Array.isArray(summary?.availableActions)
        //   ? summary.availableActions
        //   : [];
        const summaryAvailableActions = mergedAvailableActions;

        const actionFind = summaryAvailableActions.find(
          a => a.code === 'CHUYEN_XU_LY',
        );
        if (actionFind?.subActions) {
          const exist = actionFind.subActions.find(e => e.actions?.length);
          if (exist) {
            for (const sa of exist.actions) {
              if (sa.code === 'NHAN_DE_BIET') canSetViewer = true;
              if (sa.code === 'PHOI_HOP') canSetSupporter = true;
            }
          }
        }
        const bpmnVersionKey = doc.bpmn_version?.trim();
        const bpmnEngineObj = bpmnVersionKey ? bpmnMap?.get(bpmnVersionKey) : undefined;

        const checkBpmnDisabled = (flagKey: string) => {
          if (bpmnEngineObj?.indexes?.nodes) {
            for (const node of bpmnEngineObj.indexes.nodes.values()) {
              const props = getAllNodeExtensionProperties(node);
              const flagsBtn = parseFlagsButton(props?.flagsButton);
              if (
                props?.[flagKey] === 'false' ||
                props?.[flagKey] === '0' ||
                props?.[flagKey] === false ||
                flagsBtn?.[flagKey] === false ||
                flagsBtn?.[flagKey] === 'false'
              ) {
                return true;
              }
            }
          }
          if (bpmnEngineObj?.indexes?.outgoingBySource) {
            for (const flows of bpmnEngineObj.indexes.outgoingBySource.values()) {
              for (const f of flows) {
                const flowProps = this.bpmnEngine.getFlowExtensionProperties(f);
                const flowFlagsBtn = parseFlagsButton(flowProps?.flagsButton || flowProps?.flags);
                if (
                  flowProps?.[flagKey] === 'false' ||
                  flowProps?.[flagKey] === '0' ||
                  flowProps?.[flagKey] === false ||
                  flowFlagsBtn?.[flagKey] === false ||
                  flowFlagsBtn?.[flagKey] === 'false'
                ) {
                  return true;
                }
              }
            }
          }
          return false;
        };

        const isSaveBookDisabled = checkBpmnDisabled('canSaveBook');
        const isRejectDisabled = checkBpmnDisabled('canReject');

        if (isRejectDisabled) {
          flags.canReject = false;
        } else if (
          doc.book_document_id == null &&
          doc.copy_to_internal &&
          doc.copy_to_internal !== ''
        ) {
          flags.canReject = true;
        }

        if (isSaveBookDisabled) {
          flags.canSaveBook = false;
        } else if (
          doc.book_document_id == null
        ) {
          flags.canSaveBook = true;
        }

        // canChangeBook: văn bản đã được lưu sổ → văn thư có thể đổi sổ (kiểm tra quyền VT tại service layer)
        if (doc.book_document_id != null) {
          flags.canChangeBook = true;
        }

        // Thêm xử lý
        const hasThemXuLyWorkItem = openWorkItems.some(
          (wi) => wi.nodeId === 'Activity_them_xu_ly_tp' && String(wi.assigneeUserId) === String(userContext.userId)
        );
        flags.canAdditionalProcessing =
          hasThemXuLyWorkItem || (additionalProcessingMap.get(doc.document_id) || false);



        const directiveComment =
          directiveCommentMap.get(doc.document_id) || '';
        const docmWithComment = {
          ...docView,
          directive_comment: directiveComment,
        };
        const handlingMap = new Map<string, any>();
        const hasOpenWorkItemForUser = openWorkItems.some(
          (wi) => String(wi.assigneeUserId || '') === String(userContext.userId)
        );
        if (!hasOpenWorkItemForUser) {
          audit.forEach((a: any) => {
            const details = typeof a?.details === 'string' ? JSON.parse(a.details) : (a?.details || {});
            const actorId = String(a?.userId || a?.user_id || a?.createdBy || a?.receiver || '').trim();
            const currentUserId = String(userContext?.userId || '').trim();
            const isAssignedByCurrentUser = !!currentUserId && !!actorId && actorId === currentUserId;
            if (details && details?.phanCong === true && isAssignedByCurrentUser) {
              const subCode = details.subActionCode || 'XU_LY_CHINH';
              if (!handlingMap.has(subCode)) {
                handlingMap.set(subCode, {
                  subActionCode: subCode,
                  users: [],
                  organizationUnits: [],
                  deadline: details.deadline || null
                });
              }
              const group = handlingMap.get(subCode);
              const assigneeId = details.assigneeUserId;
              const ouId = details?.receiverUnit;
              if (assigneeId) {
                if (!group.users.includes(assigneeId)) group.users.push(assigneeId);
              }
              if (ouId) {
                if (!group.organizationUnits.includes(ouId)) group.organizationUnits.push(ouId);
              }
            }
          })
        }
        const isFurtherAssign = audit.some((a: any) => {
          try {
            const details = typeof a.details === 'string' ? JSON.parse(a.details) : (a.details || {});
            const actorId = String(a.createdBy || a.created_by || a.userId || a.user_id || details.assigner || '').trim();
            const currentUserId = String(userContext?.userId || '').trim();
            if (details.isFurtherAssign !== true || actorId !== currentUserId) {
              return false;
            }
            // Check if this assignment has been recalled
            const isRecalled = audit.some((other: any) => {
              const act = String(other.actionCode || other.action_code || '');
              return (act === 'THU_HOI_PHAN_CONG' || act === 'THU_HOI') && String(other.originId || other.origin_id || '') === String(a.originId || a.origin_id || '');
            });
            return !isRecalled;
          } catch {
            return false;
          }
        });

        const isLeaderAssignSubmitted = audit.some((a: any) => {
          try {
            const details = typeof a.details === 'string' ? JSON.parse(a.details) : (a.details || {});
            const actorId = String(a.createdBy || a.created_by || a.userId || a.user_id || details.assigner || '').trim();
            const currentUserId = String(userContext?.userId || '').trim();
            if ((details.assignmentType !== 'TRINH_LANH_DAO' && details.assignmentType !== 'TRUONG_PHONG') || actorId !== currentUserId) {
              return false;
            }
            const isRecalled = audit.some((other: any) => {
              const act = String(other.actionCode || other.action_code || '');
              return (act === 'THU_HOI_PHAN_CONG' || act === 'THU_HOI') && String(other.originId || other.origin_id || '') === String(a.originId || a.origin_id || '');
            });
            return !isRecalled;
          } catch {
            return false;
          }
        });

        const docActive = activeAssignmentsMap.get(doc.document_id) || [];
        const activeReceiverIdsRaw = this.mapReceiverIds(docActive, userContext, false);
        const assignedReceiverIdsRaw = this.mapReceiverIds(audit, userContext, true);

        const activeReceiverIdsFiltered = this.filterUniqueReceiverIds(activeReceiverIdsRaw);
        const assignedReceiverIds = this.filterUniqueReceiverIds(assignedReceiverIdsRaw);
        const mergedReceiverIds = this.filterUniqueReceiverIds([...assignedReceiverIds, ...activeReceiverIdsFiltered]);

        const phanCongAudit = Array.from(handlingMap.values());
        const { canRecall, ...restFlags } = flags ?? {};

        // Áp dụng logic ẩn availableActions nếu là tab notDone và người dùng hiện tại đã hết hạn
        let finalAvailableActions = summaryAvailableActions;
        let finalFlagsProcess = { canSetSupporter, canSetViewer, canSetProcessor };
        let finalRestFlags = restFlags;

        const isDocCompleted = (userContext as any).type === 'notDone' || (userContext as any).type === 'completed';
        if (isDocCompleted) {
          const userDeadlineRaw = (doc as any).user_deadline || (doc as any).userDeadline || (doc as any).user_deadline;
          const userDeadline = userDeadlineRaw ? new Date(userDeadlineRaw) : null;
          if (userDeadline && new Date() > userDeadline) {
            finalAvailableActions = [];
            finalFlagsProcess = {
              canSetSupporter: false,
              canSetViewer: false,
              canSetProcessor: false
            };
            finalRestFlags = {
              ...restFlags,
              canProcess: false,
              canReturn: false,
              canComplete: false,
              canProcessSupport: false,
              canReturnSupport: false,
              canCompleteSupport: false,
              canViewed: flags.canViewed || false,
              canRecall: false,
            };
          }
        }

        return {
          ...mapDocKeys(docmWithComment, aliases),
          userPhanCong: phanCongAudit,
          openWorkItems,
          workItem: summary.workItem,
          node: summary.node,
          availableActions: finalAvailableActions,
          flags: { ...finalRestFlags, canRecallIncoming: Boolean((isLeaderAssignSubmitted || isFurtherAssign) && canRecall !== false), isFurtherAssign },
          flagsProcess: finalFlagsProcess,
          perItems,
          assignedReceiverIds: mergedReceiverIds,
          activeReceiverIds: activeReceiverIdsFiltered,
        };
      }),
    );
    return result;
  }

  async getAuditByDocumentIds(documentIds: string[]): Promise<Map<string, any[]>> {
    if (!documentIds.length) return new Map();

    const pool = await this.getPool();
    const stageStatusMap: Record<string, string> = {
      [stageStatusDoc.TRA_LAI]: 'Trả lại',
      [stageStatusDoc.DA_XU_LY]: 'Đã xử lý',
      [stageStatusDoc.CHUA_XU_LY]: 'Chưa xử lý',
      [stageStatusDoc.DANG_XU_LY]: 'Đang xử lý',
      TU_CHOI: 'Từ chối văn bản',
      TU_CHOI_VAN_BAN: 'Từ chối văn bản',
      [stageStatusDoc.HOAN_THANH]: 'Hoàn thành xử lý',
      CHUA_HOAN_THANH: 'Chưa hoàn thành xử lý',
      [stageStatusDoc.HOAN_THANH_VAN_BAN]: 'Hoàn thành văn bản',
      [stageStatusDoc.DA_XEM]: 'Đã xem',
      [stageStatusDoc.THU_HOI]: 'Đã thu hồi',
      [stageStatusDoc.DE_NGHI_BH]: 'Chờ ban hành',
      [stageStatusDoc.DONG_Y_VBDT]: 'Hoàn thành VBDT',
      [stageStatusDoc.CHO_SO]: 'Cho số',
      [stageStatusDoc.DA_CHO_SO]: 'Cho số',
      [stageStatusDoc.DA_BAN_HANH]: 'Ban hành',
      [stageStatusDoc.DA_PHAN_CONG]: 'Đã xử lý',
    };

    const req = pool.request();
    documentIds.forEach((id, i) => req.input(`doc${i}`, id));
    const inSql = documentIds.map((_, i) => `@doc${i}`).join(',');

    const sql = `
      SELECT 
        id,
        document_id AS documentId,
        time,
        user_id AS userId,
        display_name AS displayName,
        role,
        action_code AS actionCode,
        from_node_id AS fromNodeId,
        to_node_id AS toNodeId,
        origin_id AS originId,
        created_by AS createdBy,
        receiver,
        receiver_unit AS receiverUnit,
        group_ AS groupField,
        roleProcess,
        action,
        deadline,
        stage_status AS stageStatus,
        created_at AS createdAt,
        updated_at AS updatedAt,
        details,
        type_document AS typeDocument,
        processed_by AS processedBy,
        acting_as AS actingAs
      FROM ${this.dbname}.dbo.audit
      WHERE document_id IN (${inSql})
      ORDER BY document_id, time ASC, created_at ASC
    `;

    const rows = (await req.query(sql)).recordset;

    const map = new Map<string, any[]>();

    for (const r of rows) {
      const item = {
        id: r.id || null,
        documentId: r.documentId,
        time: normalizeDateValueDDMMYYYY(r.time) || null,
        userId: r.userId || null,
        displayName: r.displayName || null,
        role: r.role || null,
        actionCode: r.actionCode || null,
        fromNodeId: r.fromNodeId || null,
        toNodeId: r.toNodeId || null,
        originId: r.originId || r.documentId,
        createdBy: r.createdBy || r.userId,
        receiver: r.receiver || null,
        receiverUnit: r.receiverUnit || null,
        groupField: r.groupField || null,
        roleProcess: r.roleProcess || null,
        action: r.action || null,
        deadline: r.deadline || null,
        stageStatus: stageStatusMap[String(r.stageStatus)] || 'Chưa xử lý',
        createdAt: normalizeDateValueDDMMYYYY(r.createdAt) || null,
        updatedAt: normalizeDateValueDDMMYYYY(r.updatedAt) || null,
        details: r.details ? JSON.parse(r.details) : {},
        processedBy: r.processedBy || null,
        actingAs: r.actingAs || null,
        typeDocument: r.typeDocument || 'IncommingDocument',
      };

      (map.get(r.documentId) ?? map.set(r.documentId, []).get(r.documentId)!).push(item);
    }

    // giữ nguyên logic HOAN_THANH_VAN_BAN
    for (const [docId, audits] of map) {
      const hasHTVB = audits.some(
        a => a.stageStatus === stageStatusMap.HOAN_THANH_VAN_BAN,
      );

      if (hasHTVB) {
        audits.forEach(a => {
          if (a.stageStatus === stageStatusMap.DA_XU_LY)
            a.stageStatus = stageStatusMap.HOAN_THANH;
          else if (a.stageStatus === stageStatusMap.CHUA_XU_LY)
            a.stageStatus = 'Chưa hoàn thành văn bản';
        });
      }
    }

    return map;
  }

  async mapDocKeysForList(
    docs: any[],
    aliases: Record<string, string> = {},
    authority?: string,
    userContext?: { userId: string; roles?: string[]; unit?: string },
    type?: string,
    isExport?: string,
    assignmentDateRange?: { startDate?: string; endDate?: string },
  ): Promise<any[]> {
    if (!Array.isArray(docs)) return [];
    const perfStart = Date.now();
    const pool = await this.getPool();

    // Identify missing assignedReceiverIds to query only when necessary
    const missingAuditDocIds = docs
      .filter(d => d && d.assignedReceiverIds === undefined)
      .map(d => d?.documentId ?? d?.document_id ?? d?.docId)
      .filter(Boolean)
      .map(String);

    let auditMap = new Map<string, any[]>();
    let activeAssignmentsMap = new Map<string, any[]>();
    const buildAssignmentAuditDate = (dateValue?: string, endOfDay = false): string | undefined => {
      if (!dateValue) return undefined;
      const baseDate = new Date(dateValue);
      if (Number.isNaN(baseDate.getTime())) return undefined;
      if (endOfDay) {
        baseDate.setHours(23, 59, 59, 997);
      } else {
        baseDate.setHours(0, 0, 0, 0);
      }
      const pad = (value: number) => String(value).padStart(2, '0');
      const year = baseDate.getFullYear();
      const month = pad(baseDate.getMonth() + 1);
      const day = pad(baseDate.getDate());
      const hours = pad(baseDate.getHours());
      const minutes = pad(baseDate.getMinutes());
      const seconds = pad(baseDate.getSeconds());
      const millis = String(baseDate.getMilliseconds()).padStart(3, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${millis}`;
    };
    if (missingAuditDocIds.length > 0) {
      auditMap = await this.getAuditByDocumentIds(missingAuditDocIds);
      const activeAssignmentsAuditFilter = {
        typeDocument: assignmentDateRange?.startDate || assignmentDateRange?.endDate ? 'IncommingDocument' : undefined,
        startDate: buildAssignmentAuditDate(assignmentDateRange?.startDate, false),
        endDate: buildAssignmentAuditDate(assignmentDateRange?.endDate, true),
      };
      activeAssignmentsMap = await this.sqlRepo.getIncomingActiveAssignmentsMap(missingAuditDocIds, activeAssignmentsAuditFilter);
    }
    // Lấy các documentID để map trạng thái
    const documentIds = [
      ...new Set(
        docs
          .map(d => d?.documentId ?? d?.document_id ?? d?.docId)
          .filter(Boolean)
          .map(String)
      ),
    ];

    const tabColor = ['waiting', 'deadline']
    let completedMap = new Map<string, number>();
    let deadlineMap = new Map<string, string | null>();
    const isSaoYMap = new Map<string, boolean>();
    const pendingDocIds = new Set<string>();
    let isCompletedDocMap = new Map<string, number>();
    if (documentIds.length) {
      const idsString = documentIds.join(',');

      const tCompleted = Date.now();
      const completedResult = await pool.request()
        .input('docIds', idsString)
        .input('userId', userContext?.userId)
        .input('unit', userContext?.unit)
        .query(`
                SELECT
                    d.document_id,
                    d.resolution_deadline,
                    ISNULL(comp.is_completed_document, 0) AS is_completed_document,
                    CASE WHEN (ISNULL(cs.is_completed_doc, 0) = 1 OR cs.current_stage_status = 'HOAN_THANH_VAN_BAN') THEN 1 ELSE 0 END AS is_completed_doc,
                    ad.deadline,
                    ISNULL(ia_summary.has_pending, 0) AS has_pending_assignment,
                    ISNULL(ia_summary.my_stage_status, '') AS my_stage_status
                FROM ${this.dbname}.dbo.incomming_documents d
                JOIN STRING_SPLIT(@docIds, ',') s
                  ON d.document_id = s.value

                -- Deadline gần nhất
                OUTER APPLY (
                    SELECT TOP 1 ia_dead.deadline
                    FROM ${this.dbname}.dbo.incomming_assignment ia_dead
                    LEFT JOIN ${this.dbname}.dbo.users u_dead
                      ON u_dead.id = ia_dead.receiver
                    WHERE ia_dead.document_id = d.document_id
                      AND ia_dead.deadline IS NOT NULL
                      AND (
                        (@userId IS NOT NULL AND ia_dead.receiver = @userId)
                        OR (
                          @unit IS NOT NULL
                          AND (ia_dead.receiver = @unit OR u_dead.parent = @unit)
                        )
                      )
                    ORDER BY ia_dead.created_at DESC
                ) ad

                -- Lấy assignment_type mới nhất của document từ audit
                OUTER APPLY (
                    SELECT TOP 1 assignment_type
                    FROM ${this.dbname}.dbo.audit
                    WHERE document_id = d.document_id
                      AND assignment_type IS NOT NULL
                    ORDER BY id DESC
                ) ap

                -- Trạng thái tổng thể từ current_state
                OUTER APPLY (
                    SELECT TOP 1 is_completed_doc, current_stage_status
                    FROM ${this.dbname}.dbo.incomming_current_state
                    WHERE document_id = d.document_id
                ) cs

                -- Tổng hợp các thông tin cần thiết từ incomming_assignment trong 1 lần truy vấn để tối ưu hiệu năng (tránh quét bảng nhiều lần)
                OUTER APPLY (
                    SELECT 
                        MAX(CASE WHEN receiver = @userId AND role_process IN ('processor', 'supporter') THEN stage_status END) AS my_stage_status,
                        MAX(CASE WHEN receiver = @userId AND role_process IN ('processor', 'supporter') THEN role_process END) AS my_role_process,
                        MAX(CASE WHEN role_process IN ('processor', 'supporter') AND stage_status NOT IN ('DA_XU_LY', 'HOAN_THANH', 'HOAN_THANH_VAN_BAN') THEN 1 END) AS has_pending
                    FROM ${this.dbname}.dbo.incomming_assignment
                    WHERE document_id = d.document_id
                ) ia_summary

                -- Áp dụng nghiệp vụ xác định trạng thái hoàn thành
                OUTER APPLY (
                    SELECT
                        CASE
                            -- Trường hợp 1: Người phân công là LĐ, Chỉ huy Phòng (TRUONG_PHONG, TRINH_LANH_DAO)
                            WHEN ISNULL(ap.assignment_type, '') IN ('TRUONG_PHONG', 'TRINH_LANH_DAO') THEN
                                CASE WHEN (cs.is_completed_doc = 1 OR cs.current_stage_status = 'HOAN_THANH_VAN_BAN') THEN 1 ELSE 0 END
                            
                            -- Trường hợp 2: Người phân công là VT tổng, VT PB (VAN_THU)
                            WHEN ISNULL(ap.assignment_type, '') = 'VAN_THU' THEN
                                CASE
                                    -- Nếu người đang xem là người phân công (Văn thư)
                                    WHEN EXISTS (
                                        SELECT 1 FROM ${this.dbname}.dbo.audit a_vt
                                        WHERE a_vt.document_id = d.document_id
                                          AND a_vt.user_id = @userId
                                          AND a_vt.assignment_type = 'VAN_THU'
                                    ) THEN
                                        CASE WHEN ia_summary.has_pending IS NULL THEN 1 ELSE 0 END
                                    ELSE
                                        CASE
                                            WHEN ia_summary.my_stage_status IS NOT NULL THEN
                                                CASE 
                                                    WHEN ia_summary.my_stage_status IN ('DA_XU_LY', 'HOAN_THANH', 'HOAN_THANH_VAN_BAN') THEN
                                                        CASE 
                                                            -- Người phối hợp (supporter) chỉ được hoàn thành trạng thái khi người xử lý chính (processor) cũng hoàn thành
                                                            WHEN ia_summary.my_role_process = 'supporter' AND EXISTS (
                                                                SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment 
                                                                WHERE document_id = d.document_id 
                                                                  AND role_process = 'processor' 
                                                                  AND stage_status NOT IN ('DA_XU_LY', 'HOAN_THANH', 'HOAN_THANH_VAN_BAN')
                                                            ) THEN 0
                                                            ELSE 1
                                                        END
                                                    ELSE 0 
                                                END
                                            ELSE
                                                CASE WHEN ia_summary.has_pending IS NULL THEN 1 ELSE 0 END
                                        END
                                END

                            -- Mặc định
                            ELSE
                                CASE
                                    WHEN ia_summary.my_stage_status IS NOT NULL THEN
                                        CASE 
                                            WHEN ia_summary.my_stage_status IN ('DA_XU_LY', 'HOAN_THANH', 'HOAN_THANH_VAN_BAN') THEN
                                                CASE 
                                                    WHEN ia_summary.my_role_process = 'supporter' AND EXISTS (
                                                        SELECT 1 FROM ${this.dbname}.dbo.incomming_assignment 
                                                        WHERE document_id = d.document_id 
                                                          AND role_process = 'processor' 
                                                          AND stage_status NOT IN ('DA_XU_LY', 'HOAN_THANH', 'HOAN_THANH_VAN_BAN')
                                                    ) THEN 0
                                                    ELSE 1
                                                END
                                            ELSE 0 
                                        END
                                    ELSE
                                        CASE WHEN (cs.is_completed_doc = 1 OR cs.current_stage_status = 'HOAN_THANH_VAN_BAN') THEN 1 ELSE 0 END
                                END
                        END AS is_completed_document
                ) comp
                OPTION (RECOMPILE)
              `);


      completedMap = new Map(
        completedResult.recordset.map((r: any) => [
          String(r.document_id),
          Number(r.is_completed_document),
        ])
      );
      completedResult.recordset.forEach((r: any) => {
        const docId = String(r.document_id);
        const hasPendingAssignment = Number(r.has_pending_assignment) === 1;
        const myStageStatus = String(r.my_stage_status || '').trim();
        if (
          hasPendingAssignment ||
          myStageStatus === stageStatusDoc.CHUA_XU_LY ||
          myStageStatus === stageStatusDoc.CHUA_HOAN_THANH
        ) {
          pendingDocIds.add(docId);
        }
      });
      isCompletedDocMap = new Map(
        completedResult.recordset.map((r: any) => [
          String(r.document_id),
          Number(r.is_completed_doc),
        ])
      );
      // Dealine map
      deadlineMap = new Map(
        completedResult.recordset.map((r: any) => [
          String(r.document_id),
          r.deadline ? normalizeDateValueDDMMYYYY(r.deadline) : r.resolution_deadline ? normalizeDateValueDDMMYYYY(r.resolution_deadline) : null,
        ])
      );

      // Query to check if the document is in Sao Y flow (has work item at Activity_0cdw8az or Activity_0uli3ft)
      const saoYResult = await pool.request()
        .input('docIds', idsString)
        .query(`
          SELECT DISTINCT document_id
          FROM ${this.dbname}.dbo.work_items
          WHERE document_id IN (SELECT value FROM STRING_SPLIT(@docIds, ','))
            AND node_id IN ('Activity_0cdw8az', 'Activity_0uli3ft')
        `);
      saoYResult.recordset.forEach((row: any) => {
        isSaoYMap.set(String(row.document_id), true);
      });
    }

    // Lấy OrganizationUnits
    const orgUnitIds = [...new Set(
      docs.flatMap((doc: any) => [
        doc?.senderUnit,
        doc?.sender_unit,
        doc?.receiverUnit,
        doc?.receiver_unit,
      ])
        .filter((id: any) => id !== null && id !== undefined && String(id).trim() !== '')
        .map((id: any) => String(id).trim())
    )];
    let orgMap = new Map<string, OrgUnit>();
    if (orgUnitIds.length) {
      const tOrg = Date.now();
      const cacheKey = `incoming:orgUnits:${orgUnitIds.sort().join(',')}`;
      let orgRows: OrgUnit[] | undefined;
      if (this.cacheManager) {
        orgRows = await this.cacheManager.get<OrgUnit[]>(cacheKey);
      }
      if (!orgRows) {
        const orgRequest = pool.request();
        orgRequest.input('orgIds', sql.NVarChar(sql.MAX), orgUnitIds.join(','));
        const orgUnitsResult = await orgRequest.query(
          `SELECT id, name
           FROM ${this.dbname}.dbo.organization_units
           WHERE id IN (
             SELECT LTRIM(RTRIM(value))
             FROM STRING_SPLIT(@orgIds, ',')
           )`
        );
        orgRows = orgUnitsResult.recordset || [];

        // Query custom_sender_units for any IDs not found in organization_units
        try {
          const customRequest = pool.request();
          customRequest.input('orgIds', sql.NVarChar(sql.MAX), orgUnitIds.join(','));
          const customResult = await customRequest.query(
            `SELECT id, name
             FROM ${this.dbname}.dbo.custom_sender_units
             WHERE id IN (
               SELECT LTRIM(RTRIM(value))
               FROM STRING_SPLIT(@orgIds, ',')
             ) AND status = 1`
          );
          if (customResult.recordset?.length) {
            orgRows = [...orgRows, ...customResult.recordset];
          }
        } catch (err) {
          console.warn('Lỗi query custom_sender_units trong incoming.service mapDocKeysForList:', err);
        }

        if (this.cacheManager) {
          await this.cacheManager.set(cacheKey, orgRows, 300);
        }
      } else {
      }
      orgMap = new Map<string, OrgUnit>(
        orgRows.map((u: OrgUnit) => [String(u.id), u])
      );
    }

    // Lấy tất cả user (processor + drafter + draftSigner)
    const allUserIds: string[] = [];
    for (const doc of docs) {
      if (doc) {
        if (doc.processors) {
          if (Array.isArray(doc.processors)) allUserIds.push(...doc.processors);
          else allUserIds.push(doc.processors);
        }
        if (doc.drafter) {
          if (Array.isArray(doc.drafter)) allUserIds.push(...doc.drafter);
          else allUserIds.push(doc.drafter);
        }
        if (doc.draftSigner) {
          if (Array.isArray(doc.draftSigner)) allUserIds.push(...doc.draftSigner);
          else allUserIds.push(doc.draftSigner);
        }
      }
    }
    const uniqueUserIds = [...new Set(allUserIds)].filter(Boolean);
    const userMap = new Map<string, string>();
    const drafterSignerMap = new Map<string, { id: string, name: string }>();

    if (uniqueUserIds.length) {
      const request = pool.request();
      uniqueUserIds.forEach((id, i) => request.input(`uid${i}`, id));
      const placeholders = uniqueUserIds.map((_, i) => `@uid${i}`).join(',');
      const usersResult = await request.query(
        `SELECT id, display_name, username, name FROM ${this.dbname}.dbo.users WHERE id IN (${placeholders})`
      );
      for (const u of usersResult.recordset) {
        const userId = String(u.id);
        const displayName = u.display_name || u.name || u.username || '-';
        userMap.set(userId, displayName);
        drafterSignerMap.set(userId, { id: userId, name: u.name || displayName });
      }
    }

    // Lấy crm_sources + crm_source_data join (cache)
    const tCrm = Date.now();
    const crmCacheKey = `incoming:crmMap`;
    let crmRows: Array<{ code: string; value: string; title: string }> | undefined;
    if (this.cacheManager) {
      crmRows = await this.cacheManager.get<Array<{ code: string; value: string; title: string }>>(crmCacheKey);
    }
    if (!crmRows) {
      const crmResult = await pool.request().query(
        `SELECT s.code, d.value, d.title
        FROM ${this.dbname}.dbo.crm_sources s
        LEFT JOIN crm_source_data d ON s.id = d.source_id
        WHERE s.status = 1 AND s.code IN ('S20','S19','S26','S27','S21')`
      );
      crmRows = crmResult.recordset || [];
      if (this.cacheManager) {
        await this.cacheManager.set(crmCacheKey, crmRows, 300);
      }
    } else {
    }
    const crmMap = new Map<string, CRMItem[]>();
    for (const row of crmRows) {
      if (!crmMap.has(row.code)) crmMap.set(row.code, []);
      crmMap.get(row.code)!.push({ value: row.value, title: row.title });
    }

    // Lấy book_documents
    const bookIds: number[] = docs.filter(d => d != null).map(d => d.bookDocumentId).filter(Boolean);

    const uniqueBookIds = [...new Set(bookIds)];
    let bookMap = new Map<number, BookDocument>();
    if (uniqueBookIds.length) {
      const tBooks = Date.now();
      const bookCacheKey = `incoming:books:${uniqueBookIds.sort().join(',')}`;
      let bookRows: Array<{ book_document_id: number; name: string; to_book_code: string; count: number }> | undefined;
      if (this.cacheManager) {
        bookRows = await this.cacheManager.get<typeof bookRows>(bookCacheKey);
      }
      if (!bookRows) {
        const request = pool.request();
        uniqueBookIds.forEach((id, i) => request.input(`id${i}`, id));
        const placeholders = uniqueBookIds.map((_, i) => `@id${i}`).join(',');
        const booksResult = await request.query(
          `SELECT book_document_id, name, to_book_code, count 
          FROM ${this.dbname}.dbo.book_documents 
          WHERE book_document_id IN (${placeholders})`
        );
        bookRows = booksResult.recordset || [];
        if (this.cacheManager) {
          await this.cacheManager.set(bookCacheKey, bookRows, 300);
        }
      } else {
      }
      bookMap = new Map<number, BookDocument>(
        bookRows.map((r: any) => [
          Number(r.book_document_id),
          {
            name: r.name,
            to_book_code: r.to_book_code,
            count: Number(r.count),
          }
        ])
      );
    }

    const resultArray: any[] = [];
    const docIdsForFiles = new Set<string>();

    const tLoop = Date.now();
    for (const doc of docs) {
      const result: any = {};
      const rawUserDeadline = doc?.userDeadline ?? doc?.user_deadline;
      const hasUserDeadline = !!(rawUserDeadline && String(rawUserDeadline).trim() !== '-' && String(rawUserDeadline).trim() !== '');
      const rawDocId = doc?.documentId ?? doc?.document_id ?? doc?.docId;
      if (rawDocId) docIdsForFiles.add(String(rawDocId));
      const docId = rawDocId ? String(rawDocId) : null;
      let deadline: string | null = null;
      if (docId) {
        const rawDeadline = doc?.user_deadline ?? doc?.userDeadline ?? doc?.deadline;
        if (rawDeadline && rawDeadline !== '-') {
          deadline = normalizeDateValueDDMMYYYY(rawDeadline);
        } else {
          deadline = deadlineMap.get(docId) ?? null;
        }

        if (type && tabColor.includes(type) && deadline !== null) {
          result.color = calcDeadlineColor(deadline);
        } else if (hasUserDeadline) {
          result.colorDocumentNumber = '#2364B0';
        }

        const isCompletedFromDb = completedMap.get(docId) === 1;
        const hasPending = pendingDocIds.has(docId);
        const isCompletedDoc = isCompletedDocMap.get(docId) === 1;

        const rawStatusCode = String(doc?.status_code ?? doc?.statusCode ?? '').trim();
        const hasActiveWorkflowStatus =
          rawStatusCode === stageStatusDoc.CHUA_XU_LY ||
          rawStatusCode === stageStatusDoc.CHUA_HOAN_THANH;

        let finalComplete = isCompletedFromDb && !hasPending && !hasActiveWorkflowStatus;
        if (type === 'completed') {
          finalComplete = true;
        } else if (type === 'processed') {
          finalComplete = isCompletedDoc && !hasPending && !hasActiveWorkflowStatus;
        } else if (type === 'incompleted') {
          finalComplete = false;
        }

        result.isComplete = finalComplete;
        doc.isComplete = finalComplete;
      } else {
        result.isComplete = false;
      }
      if (doc && typeof doc === 'object') {
        for (const [key, value] of Object.entries(doc)) {
          const jsKey = aliases[key] || key;
          let finalValue: any = '-';

          if (value === null || value === undefined) finalValue = '-';
          else if (typeof value === 'string' || typeof value === 'number' || value instanceof Date) finalValue = value;
          else finalValue = value;

          if (dateKeys.has(key)) finalValue = normalizeDateValueDDMMYYYY(finalValue);
          result[jsKey] = finalValue ?? '-';



          if (jsKey === 'deadline' || jsKey === 'user_deadline' || jsKey === 'userDeadline') {
            if (typeof deadline === 'string' && deadline) {
              result[jsKey] = deadline;
              if (jsKey === 'user_deadline') result['userDeadline'] = deadline;
              if (jsKey === 'userDeadline') result['user_deadline'] = deadline;

              if (type && tabColor.includes(type)) {
                result.color = calcDeadlineColor(deadline);
                delete result.colorDocumentNumber;
              } else if (!result.color && hasUserDeadline) {
                result.colorDocumentNumber = '#2364B0';
              }
            } else {
              result[jsKey] = '-';
              if (jsKey === 'user_deadline') result['userDeadline'] = '-';
              if (jsKey === 'userDeadline') result['user_deadline'] = '-';
              if (!result.color && hasUserDeadline) {
                result.colorDocumentNumber = '#2364B0';
              }
            }
          }

          // Mapping crm_sources
          if (['urgencyLevel', 'documentType', 'documentField', 'receiveMethod', 'privateLevel'].includes(jsKey)) {
            const codeMap: Record<string, string> = {
              urgencyLevel: 'S20',
              documentType: 'S19',
              documentField: 'S26',
              receiveMethod: 'S27',
              privateLevel: 'S21',
            };
            const items = crmMap.get(codeMap[jsKey]) || [];
            const found = items.find(i => i.value == value);
            result[jsKey] = found?.title ?? '-';
          }

          // Text fields
          for (const txtField of ['signer', 'secondBook', 'toBook', 'toBookCode', 'files', 'abstractNote']) {
            if (jsKey === txtField) {
              result[jsKey] = value ? String(value).trim() : '-';
            }
          }

          // Status code
          if (jsKey === 'status' || jsKey === 'statusCode' || jsKey === 'status_code') {
            const isSaoY = docId ? isSaoYMap.get(docId) === true : false;
            let actionCode = value;
            if (type === 'processed') {
              actionCode = result.isComplete ? 'HOAN_THANH_VAN_BAN' : 'CHUA_XU_LY';
            }
            const mappedVal = actionCode ? (isExport === 'true' ? extractTextFromHtml(mapActionIncomingToLabel(String(actionCode), isSaoY)) : mapActionIncomingToLabel(String(actionCode), isSaoY)) ?? actionCode : '-';
            result['statusCode'] = mappedVal;
            result['status_code'] = mappedVal;
            result['status'] = mappedVal;
          }

          // Org units
          if (jsKey === 'receiverUnit') {
            const receiverUnitId = doc?.receiverUnit ?? doc?.receiver_unit;
            result['receiverUnit'] = receiverUnitId ? orgMap.get(String(receiverUnitId))?.name ?? '-' : '-';
          }
          if (jsKey === 'senderUnit') {
            const senderUnitId = doc?.senderUnit ?? doc?.sender_unit;
            result['senderUnit'] = senderUnitId
              ? (orgMap.get(String(senderUnitId))?.name ?? doc?.sender_unit_name ?? doc?.senderUnitName ?? '-')
              : '-';
          }

          // File ids
          if (jsKey === 'fileids') result['fileids'] = value || '-';

          // Star
          if (jsKey === 'is_star') {
            result['isStar'] = !!value;
            delete result['is_star'];
          }

          // Book
          if (jsKey === 'bookDocumentId') {
            const book = bookMap.get(Number(value));
            result['bookDocumentId'] = book?.name ?? '-';
          }

          if (jsKey === 'toBookCode') {
            result['toBookCode'] = value ? String(value).split('/').pop() : '-';
          }

          // Processors
          if (jsKey === 'processors' || jsKey === 'processorUnitsName') {
            const ids = value ? (Array.isArray(value) ? value : [value]) : [];
            const names = ids.map(id => userMap.get(id)).filter(Boolean);
            result[jsKey] = names.join(', ') || '-';
          }
          if (jsKey === 'directive_comment' && typeof value === 'string' && isExport !== 'true') {
            result[jsKey] = value
              .split('\n')
              .map(line => {
                const match = line.match(/^(\d+\.)\s([^:]+):\s(.+)$/);
                if (!match) return line;

                const [, idx, userName, content] = match;

                return `
                  ${idx}
                  <span style="font-weight:600">${userName}</span><br/>:
                  ${this.mapDirectiveContentColor(content)}
                `;
              })
              .join('<br/>');
          }

          // Drafter & draftSigner bằng SQL (Đã tối ưu hóa)
          if (jsKey === 'drafter' || jsKey === 'draftSigner') {
            if (value) {
              const ids = Array.isArray(value) ? value : [value];
              const firstId = ids[0];
              result[jsKey] = firstId ? (drafterSignerMap.get(String(firstId)) ?? '-') : '-';
            } else {
              result[jsKey] = '-';
            }
          }
          if (jsKey === 'suggested_handling' || jsKey === 'suggestedHandling') {
            if (value && value !== '-') {
              try {
                result['suggestedHandling'] = typeof value === 'string' ? JSON.parse(value) : value;
                if (jsKey === 'suggested_handling') delete result['suggested_handling'];
              } catch (e) {
                result['suggestedHandling'] = value;
              }
            } else {
              result['suggestedHandling'] = '-';
            }
          }
        }
      }

      if (docId) {
        const deadlineVal = deadlineMap.get(docId) ?? null;
        result['processDeadline'] = deadlineVal ? deadlineVal : '-';
        result['process_deadline'] = deadlineVal ? deadlineVal : '-';
      } else {
        result['processDeadline'] = '-';
        result['process_deadline'] = '-';
      }

      if (result.isComplete === true && isExport !== 'true' && type !== 'waitSign') {
        const completedLabel = mapActionIncomingToLabel('HOAN_THANH_VAN_BAN');
        result.statusCode = completedLabel;
        result.status_code = completedLabel;
        result.status = completedLabel;
      }

      if (doc && doc.assignedReceiverIds !== undefined) {
        result.assignedReceiverIds = doc.assignedReceiverIds;
      } else if (docId) {
        const docAudit = auditMap.get(docId) || [];
        const docActive = activeAssignmentsMap.get(docId) || [];
        const activeReceiverIdsRaw = this.mapReceiverIds(docActive, userContext, false);
        const assignedReceiverIdsRaw = this.mapReceiverIds(docAudit, userContext, true);

        const activeReceiverIdsFiltered = this.filterUniqueReceiverIds(activeReceiverIdsRaw);
        const assignedReceiverIds = this.filterUniqueReceiverIds(assignedReceiverIdsRaw);
        const mergedReceiverIds = this.filterUniqueReceiverIds([...assignedReceiverIds, ...activeReceiverIdsFiltered]);

        result.assignedReceiverIds = mergedReceiverIds;
        result.activeReceiverIds = activeReceiverIdsFiltered;
      } else {
        result.assignedReceiverIds = [];
      }

      result.isIncomming = true;
      if (authority === 'true') {
        result.isAuthority = true;
      }

      if (doc && doc.assignedReceiverIds !== undefined) {
        result.assignedReceiverIds = doc.assignedReceiverIds;
      } else if (docId) {
        const docAudit = auditMap.get(docId) || [];
        const docActive = activeAssignmentsMap.get(docId) || [];
        const activeReceiverIdsRaw = this.mapReceiverIds(docActive, userContext, false);
        const assignedReceiverIdsRaw = this.mapReceiverIds(docAudit, userContext, true);

        const activeReceiverIdsFiltered = this.filterUniqueReceiverIds(activeReceiverIdsRaw);
        const assignedReceiverIds = this.filterUniqueReceiverIds(assignedReceiverIdsRaw);
        const mergedReceiverIds = this.filterUniqueReceiverIds([...assignedReceiverIds, ...activeReceiverIdsFiltered]);

        result.assignedReceiverIds = mergedReceiverIds;
        result.activeReceiverIds = activeReceiverIdsFiltered;
      } else {
        result.assignedReceiverIds = [];
      }

      if (!hasUserDeadline) {
        delete result.colorDocumentNumber;
      }
      resultArray.push(result);
    }

    // MAP FILES
    if (docIdsForFiles.size) {
      const tFiles = Date.now();
      const filesMap = await this.fileService.getFilesByOutgoingDocumentIds([...docIdsForFiles]);
      for (const item of resultArray) {
        const id = String(item.documentId);
        const files = filesMap[id] || [];
        item.files = files.length ? files : '-';
        item.isCertifiedCopy = files.some((f: any) => f.isCertifiedCopy);
        if (Array.isArray(files)) {
          for (const f of files) {
            delete f.isCertifiedCopy;
          }
        }
      }
    }

    return resultArray;
  }
  async getDocumentByFields({
    documentId,
    select
  }: {
    documentId: string;
    select?: string[];
  }): Promise<any | null> {
    const pool = await this.getPool();

    // Định nghĩa mapping giữa camelCase và snake_case
    const fieldMapping: Record<string, string> = {
      documentId: 'document_id',
      statusCode: 'status_code',
      bookDocumentId: 'book_document_id',
      abstractNote: 'abstract_note',
      toBook: 'to_book',
      senderUnit: 'sender_unit',
      receiverUnit: 'receiver_unit',
      documentDate: 'document_date',
      receiveDate: 'receive_date',
      toBookDate: 'to_book_date',
      toBookCode: 'to_book_code',
      deadline: 'deadline',
      secondBook: 'second_book',
      receiveMethod: 'receive_method',
      privateLevel: 'private_level',
      urgencyLevel: 'urgency_level',
      documentType: 'document_type',
      documentField: 'document_field',
      signer: 'signer',
      fileids: 'fileids',
      bpmnVersion: 'bpmn_version',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      resolutionDeadline: 'resolution_deadline',
      copyCount: 'copy_count',
      pageCount: 'page_count',
      parentDoc: 'parent_doc',
      viewGroup: 'view_group',
      status: 'status',
    };

    // Xây dựng SELECT clause
    let selectClause = '*';
    const aliases: Record<string, string> = {};

    if (select && select.length > 0) {
      const selectParts: string[] = [];

      for (const field of select) {
        const dbField = fieldMapping[field] || field;
        selectParts.push(`${dbField} AS ${field}`);
        aliases[dbField] = field;
      }

      selectClause = selectParts.join(', ');
    } else {
      // Nếu không truyền select, lấy tất cả và map aliases
      const allFields = Object.entries(fieldMapping)
        .map(([jsKey, dbKey]) => {
          aliases[dbKey] = jsKey;
          return `${dbKey} AS ${jsKey}`;
        });
      selectClause = allFields.join(', ');
    }

    const sql = `
    SELECT ${selectClause}
    FROM ${this.dbname}.dbo.incomming_documents
    WHERE document_id = @documentId
      AND status = 1
  `;

    const request = pool.request();
    request.input('documentId', documentId);

    const result = await request.query(sql);
    const rows = result.recordset;

    if (!rows.length) return null;

    // Map dữ liệu theo aliases
    const document = rows[0];
    const mappedDocument: any = {};

    for (const [dbKey, jsKey] of Object.entries(aliases)) {
      if (document.hasOwnProperty(jsKey)) {
        mappedDocument[jsKey] = document[jsKey];
      }
    }

    // Thêm metadata
    mappedDocument.isIncomming = true;

    // Nếu cần openWorkItems, có thể thêm tùy chọn
    // mappedDocument.openWorkItems = await this.listOpenWorkItems(documentId);

    return mappedDocument;
  }

  /**
   * Từ chối tiếp nhận văn bản
   * @param documentIds Danh sách ID văn bản
   * @param userId ID người thực hiện
   * @param note Lý do Từ chối
   */
  async rejectIncomingDocuments(documentIds: string[], userId: string, note: string) {
    if (!documentIds || documentIds.length === 0) {
      throw new BadRequestException('Không có văn bản nào được chọn.');
    }

    const pool = await this.getPool();

    // Lấy ID phòng ban và tên của user
    const userRes = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`SELECT parent AS parentId, name FROM ${this.dbname}.dbo.users WHERE id = @userId`);

    const receiverUnit = userRes.recordset[0]?.parentId;
    const userName = userRes.recordset[0]?.name || 'Văn thư phòng đơn vị';
    if (!receiverUnit) {
      throw new BadRequestException('Không tìm thấy thông tin phòng ban của người dùng.');
    }

    const request = pool.request();

    // Chuẩn bị placeholder cho mệnh đề IN để tránh SQL injection
    const idPlaceholders = documentIds.map((_, i) => `@id${i}`).join(',');
    documentIds.forEach((id, i) => {
      request.input(`id${i}`, sql.NVarChar, id);
    });
    request.input('receiverUnit', sql.NVarChar, receiverUnit);

    // Kiểm tra những văn bản nào tồn tại và đủ điều kiện (stage_status = 1 và thuộc phòng ban của user)
    const checkResult = await request.query(`
      SELECT document_id, 
            copy_to_internal AS copyToInternal, 
            book_document_id AS bookDocumentId,
            to_book,
            abstract_note,
            parent_doc,
            parent_doc_clone
      FROM ${this.dbname}.dbo.incomming_documents 
      WHERE document_id IN (${idPlaceholders}) AND status_code = 1 AND receiver_unit = @receiverUnit
    `);

    const user = { userId };
    for (const row of checkResult.recordset) {
      if (!DocumentPolicy.canRejectIncommingDocument(row)) {
        // throw new ForbiddenException(); 
        console.warn(`User ${userId} không có quyền Từ chối văn bản.`);
      }
    }

    const existingIds = checkResult.recordset.map(row => row.document_id);
    const nonExistingIds = documentIds.filter(id => !existingIds.includes(id));

    const cloneIds = checkResult.recordset
      .filter(row =>
        (row.parent_doc && row.parent_doc !== row.document_id) ||
        (row.parent_doc_clone && row.parent_doc_clone !== row.document_id)
      )
      .map(row => row.document_id);

    const mainIds = checkResult.recordset
      .filter(row =>
        !((row.parent_doc && row.parent_doc !== row.document_id) ||
          (row.parent_doc_clone && row.parent_doc_clone !== row.document_id))
      )
      .map(row => row.document_id);

    let successCount = 0;
    const failureCount = nonExistingIds.length;

    // 1. Xử lý các văn bản clone: xóa hoàn toàn
    if (cloneIds.length > 0) {
      const deleteRequest = pool.request();
      const deletePlaceholders = cloneIds.map((_, i) => `@deleteId${i}`).join(',');
      cloneIds.forEach((id, i) => deleteRequest.input(`deleteId${i}`, sql.NVarChar, id));

      await deleteRequest.query(`
        DELETE FROM ${this.dbname}.dbo.work_items WHERE document_id IN (${deletePlaceholders});
        DELETE FROM ${this.dbname}.dbo.audit WHERE document_id IN (${deletePlaceholders});
        DELETE FROM ${this.dbname}.dbo.incomming_assignment WHERE document_id IN (${deletePlaceholders});
        DELETE FROM ${this.dbname}.dbo.incomming_current_state WHERE document_id IN (${deletePlaceholders});
        DELETE FROM ${this.dbname}.dbo.incomming_suggested_handlings WHERE document_id IN (${deletePlaceholders});
        DELETE FROM ${this.dbname}.dbo.document_comments WHERE document_id IN (${deletePlaceholders});
        DELETE FROM ${this.dbname}.dbo.file_relations WHERE object_id IN (${deletePlaceholders});
        DELETE FROM ${this.dbname}.dbo.incomming_documents WHERE document_id IN (${deletePlaceholders});
      `);
      successCount += cloneIds.length;
    }

    // 2. Xử lý các văn bản chính: cập nhật status_code = 0
    if (mainIds.length > 0) {
      const updateRequest = pool.request();
      const updatePlaceholders = mainIds.map((_, i) => `@updateId${i}`).join(',');
      mainIds.forEach((id, i) => updateRequest.input(`updateId${i}`, sql.NVarChar, id));

      const updateResult = await updateRequest.query(`
        UPDATE ${this.dbname}.dbo.incomming_documents
        SET status_code = 0, updated_at = GETDATE()
        WHERE document_id IN (${updatePlaceholders})
      `);
      successCount += updateResult.rowsAffected[0];
    }

    if (existingIds.length > 0) {
      // Thêm comment vào văn bản cha và gửi thông báo cho TCT clerk
      for (const row of checkResult.recordset) {
        const parentDocId = row.parent_doc || row.parent_doc_clone || row.document_id;

        // 1. Thêm ý kiến (comment) vào văn bản cha
        try {
          await this.sqlRepo.createComment({
            documentId: parentDocId,
            parentId: null,
            userId: userId,
            userName: userName,
            content: note,
            type: 'comment',
          });
        } catch (commentErr) {
          this.logger.error(`Lỗi khi tạo comment Từ chối cho tài liệu cha ${parentDocId}: ${commentErr.message}`);
        }

        // 1.b Cập nhật trạng thái của văn bản gốc (parent) của phòng đó thành TU_CHOI_VAN_BAN trong audit và assignment
        try {
          await this.sqlRepo.updateStageStatusIncommingAudit(parentDocId, {
            receiver: receiverUnit,
            stage_status: 'TU_CHOI_VAN_BAN',
            isDauPhong: true,
          });
        } catch (updateParentErr) {
          this.logger.error(`Lỗi khi cập nhật trạng thái văn bản gốc cho phòng ${receiverUnit}: ${updateParentErr.message}`);
        }

        // 2. Tìm TCT clerk/người phân công từ lịch sử audit của văn bản cha và gửi thông báo
        let tctClerkId: string | null = null;
        let assignerNodeId: string | null = null;
        let leaderRole: string | null = null;
        let assignerNodeType: string | null = null;
        try {
          const auditRes = await pool.request()
            .input('parentDocId', sql.NVarChar, parentDocId)
            .query(`
              SELECT TOP 1 user_id AS userId, from_node_id AS nodeId, role
              FROM ${this.dbname}.dbo.audit 
              WHERE document_id = @parentDocId 
                AND action_code IN ('PHAN_CONG', 'CHUYEN_XU_LY_PHAN_CONG')
              ORDER BY id DESC
            `);

          tctClerkId = auditRes.recordset[0]?.userId;
          if (tctClerkId) {
            assignerNodeId = auditRes.recordset[0]?.nodeId || null;
            if (auditRes.recordset[0]?.role) {
              leaderRole = auditRes.recordset[0].role;
            }
          }

          // Fallback 1: lấy từ lịch sử gần nhất bất kỳ có from_node_id
          if (!assignerNodeId) {
            const fallbackAuditRes = await pool.request()
              .input('parentDocId', sql.NVarChar, parentDocId)
              .query(`
                SELECT TOP 1 user_id AS userId, from_node_id AS nodeId, role
                FROM ${this.dbname}.dbo.audit
                WHERE document_id = @parentDocId AND from_node_id IS NOT NULL AND from_node_id <> ''
                ORDER BY id DESC
              `);
            assignerNodeId = fallbackAuditRes.recordset[0]?.nodeId || null;
            if (!tctClerkId) {
              tctClerkId = fallbackAuditRes.recordset[0]?.userId || null;
            }
            if (fallbackAuditRes.recordset[0]?.role) {
              leaderRole = fallbackAuditRes.recordset[0].role;
            }
          }

          // Fallback 2: lấy từ bản ghi audit đầu tiên (action CREATE)
          if (!assignerNodeId) {
            const firstAuditRes = await pool.request()
              .input('parentDocId', sql.NVarChar, parentDocId)
              .query(`
                SELECT TOP 1 user_id AS userId, to_node_id AS nodeId, role
                FROM ${this.dbname}.dbo.audit 
                WHERE document_id = @parentDocId 
                ORDER BY id ASC
              `);
            assignerNodeId = firstAuditRes.recordset[0]?.nodeId || null;
            if (!tctClerkId) {
              tctClerkId = firstAuditRes.recordset[0]?.userId || null;
            }
            if (firstAuditRes.recordset[0]?.role) {
              leaderRole = firstAuditRes.recordset[0].role;
            }
          }

          if (!assignerNodeId) {
            throw new BadRequestException('Không thể xác định nút xử lý ban đầu của người phân công.');
          }
          if (!leaderRole) {
            throw new BadRequestException('Không thể xác định vai trò của người phân công.');
          }

          // Tự động xác định node type dựa trên node ID (nếu chứa "Gateway" thì là gateway, ngược lại là UserTask)
          if (assignerNodeId.toLowerCase().includes('gateway')) {
            assignerNodeType = 'bpmn:ExclusiveGateway';
          } else {
            assignerNodeType = 'bpmn:UserTask';
          }

          if (tctClerkId) {
            await this.notificationService.create({
              content: `Văn bản đến số/ký hiệu "${row.to_book || ''}" bị Từ chối tiếp nhận. Lý do: ${note}`,
              title: row.abstract_note || 'Văn bản đến bị Từ chối tiếp nhận',
              recipientId: tctClerkId,
              senderId: userId,
              key: NotificationKey.VIEW_INCOMING_DOC,
              type: 'INCOMING_DOC_RETURNED',
              recordId: parentDocId,
              link: `/incoming-documents/detail/${parentDocId}`,
            });
          }
        } catch (notifyErr) {
          this.logger.error(`Lỗi khi gửi thông báo Từ chối cho tài liệu cha ${parentDocId}: ${notifyErr.message}`);
        }

        // 3. Kiểm tra xem tất cả các phòng đã Từ chối chưa và tạo lại workitem cho lãnh đạo phân công lại
        try {
          let isAllRejected = false;

          // Lấy bản ghi audit phân công gần nhất của văn bản cha
          const latestAuditRes = await pool.request()
            .input('parentDocId', sql.NVarChar, parentDocId)
            .query(`
              SELECT TOP 1 origin_id AS originId, details 
              FROM ${this.dbname}.dbo.audit 
              WHERE document_id = @parentDocId 
                AND action_code IN ('PHAN_CONG', 'CHUYEN_XU_LY_PHAN_CONG')
                AND details LIKE '%clonedDocIds%'
              ORDER BY id DESC
            `);

          const latestAuditRow = latestAuditRes.recordset[0];
          const auditDetailsStr = latestAuditRow?.details;
          const originId = latestAuditRow?.originId;
          let clonedDocIds: string[] = [];

          if (auditDetailsStr) {
            try {
              const auditDetailsObj = JSON.parse(auditDetailsStr);
              if (Array.isArray(auditDetailsObj?.clonedDocIds)) {
                clonedDocIds = auditDetailsObj.clonedDocIds.map(String);
              }
            } catch (jsonErr) {
              this.logger.warn(`Lỗi parse details audit của parentDocId ${parentDocId}: ${jsonErr.message}`);
            }
          }

          if (clonedDocIds.length > 0) {
            const placeholders = clonedDocIds.map((_, idx) => `@cid${idx}`).join(',');
            const countRequest = pool.request();
            clonedDocIds.forEach((cid, idx) => countRequest.input(`cid${idx}`, sql.NVarChar, cid));

            const activeCountRes = await countRequest.query(`
              SELECT COUNT(*) AS activeCount 
              FROM ${this.dbname}.dbo.incomming_documents 
              WHERE document_id IN (${placeholders})
            `);
            const activeCount = activeCountRes.recordset[0]?.activeCount || 0;

            // Kiểm tra trong lượt phân công này (cùng origin_id) có phân công trực tiếp cho cá nhân nào không
            let hasUserAssigned = false;
            if (originId) {
              const userAuditRes = await pool.request()
                .input('parentDocId', sql.NVarChar, parentDocId)
                .input('originId', sql.NVarChar, originId)
                .query(`
                  SELECT COUNT(*) AS userAuditCount 
                  FROM ${this.dbname}.dbo.audit 
                  WHERE document_id = @parentDocId 
                    AND origin_id = @originId
                    AND receiver IS NOT NULL 
                    AND receiver <> ''
                `);
              hasUserAssigned = (userAuditRes.recordset[0]?.userAuditCount || 0) > 0;
            }

            // Chỉ mở lại phân công cho Lãnh đạo nếu TẤT CẢ bản clone phòng ban đều bị Từ chối VÀ KHÔNG phân công cho cá nhân nào trong lượt đó
            if (activeCount === 0 && !hasUserAssigned) {
              isAllRejected = true;
            }
          } else {
            // Fallback đếm theo parent_doc
            const checkClonesRes = await pool.request()
              .input('parentDocId', sql.NVarChar, parentDocId)
              .query(`
                SELECT COUNT(*) AS cloneCount 
                FROM ${this.dbname}.dbo.incomming_documents 
                WHERE parent_doc = @parentDocId AND document_id <> @parentDocId
              `);
            const cloneCount = checkClonesRes.recordset[0]?.cloneCount || 0;
            if (cloneCount === 0) {
              isAllRejected = true;
            }
          }

          if (isAllRejected && tctClerkId) {
            const wiId = `wi_${Date.now()}_` + Math.random().toString(36).substring(2, 8);

            const parentDocRes = await pool.request()
              .input('parentDocId', sql.NVarChar, parentDocId)
              .query(`SELECT bpmn_version FROM ${this.dbname}.dbo.incomming_documents WHERE document_id = @parentDocId`);
            const bpmnVersion = parentDocRes.recordset[0]?.bpmn_version || 'PHUC_DAP_DV';

            // Tìm curStatusCode của nút xử lý ban đầu
            let targetStatusCode = '6'; // mặc định là 6
            try {
              const statusRes = await pool.request()
                .input('parentDocId', sql.NVarChar, parentDocId)
                .input('assignerNodeId', sql.NVarChar, assignerNodeId)
                .query(`
                  SELECT TOP 1 curStatusCode 
                  FROM ${this.dbname}.dbo.audit 
                  WHERE document_id = @parentDocId 
                    AND to_node_id = @assignerNodeId 
                    AND curStatusCode IS NOT NULL 
                    AND curStatusCode <> ''
                  ORDER BY id DESC
                `);
              if (statusRes.recordset[0]?.curStatusCode) {
                targetStatusCode = statusRes.recordset[0].curStatusCode;
              }
            } catch (statusErr) {
              this.logger.warn(`Lỗi khi lấy status code cũ cho ${parentDocId}: ${statusErr.message}`);
            }

            // Cập nhật lại status_code của văn bản cha về trạng thái trước khi phân công
            try {
              await pool.request()
                .input('parentDocId', sql.NVarChar, parentDocId)
                .input('statusCode', sql.NVarChar, targetStatusCode)
                .query(`
                  UPDATE ${this.dbname}.dbo.incomming_documents
                  SET status_code = @statusCode, updated_at = GETDATE()
                  WHERE document_id = @parentDocId
                `);
            } catch (updateDocErr) {
              this.logger.error(`Lỗi khi cập nhật status_code cho tài liệu cha ${parentDocId}: ${updateDocErr.message}`);
            }

            // Xóa các workitem open được sinh ra sau phân công của người phân công
            await pool.request()
              .input('parentDocId', sql.NVarChar, parentDocId)
              .input('tctClerkId', sql.NVarChar, tctClerkId)
              .query(`
                DELETE FROM ${this.dbname}.dbo.work_items 
                WHERE document_id = @parentDocId 
                  AND assignee_user_id = @tctClerkId 
                  AND state = 'open'
              `);

            // Chèn workitem
            await pool.request()
              .input('wiId', sql.NVarChar, wiId)
              .input('parentDocId', sql.NVarChar, parentDocId)
              .input('assignerNodeId', sql.NVarChar, assignerNodeId)
              .input('leaderRole', sql.NVarChar, leaderRole)
              .input('tctClerkId', sql.NVarChar, tctClerkId)
              .input('assignerNodeType', sql.NVarChar, assignerNodeType)
              .input('bpmnVersion', sql.NVarChar, bpmnVersion)
              .query(`
                INSERT INTO ${this.dbname}.dbo.work_items 
                  (id, document_id, node_id, role, assignee_user_id, node_type, state, created_at, bpmn_version)
                VALUES 
                  (@wiId, @parentDocId, @assignerNodeId, @leaderRole, @tctClerkId, @assignerNodeType, 'open', GETDATE(), @bpmnVersion)
              `);

            // Ghi audit trả lại phân công để tự động đồng bộ hóa bảng Current State và Assignment
            try {
              await this.sqlRepo.addIncommingAudit(parentDocId, {
                user_id: 'Hệ thống tự động trả lại cho người phân công',
                display_name: 'Hệ thống tự động trả lại cho người phân công',
                role: leaderRole,
                action_code: 'TRA_LAI',
                from_node_id: assignerNodeId,
                to_node_id: assignerNodeId,
                receiver: tctClerkId,
                roleProcess: 'processor',
                action: 'Trả lại phân công',
                created_by: 'Hệ thống tự động trả lại cho người phân công',
                stage_status: 'CHUA_XU_LY',
                origin_id: wiId,
                created_at: new Date(),
                updated_at: new Date(),
                details: {
                  note: `Tất cả các phòng ban đã Trả lại tiếp nhận. Hệ thống tự động trả lại cho người phân công.`,
                  reason: note,
                  isTraLaiPhanCong: true,
                },
                curStatusCode: targetStatusCode,
                typeDocument: 'IncommingDocument',
              });
            } catch (auditErr) {
              this.logger.error(`Lỗi khi tạo audit trả lại phân công cho tài liệu cha ${parentDocId}: ${auditErr.message}`);
              // Fallback trực tiếp bằng SQL
              await pool.request()
                .input('parentDocId', sql.NVarChar, parentDocId)
                .input('tctClerkId', sql.NVarChar, tctClerkId)
                .query(`
                  UPDATE ${this.dbname}.dbo.incomming_assignment
                  SET stage_status = 'CHUA_XU_LY', updated_at = GETDATE()
                  WHERE document_id = @parentDocId AND receiver = @tctClerkId
                `);

              await pool.request()
                .input('parentDocId', sql.NVarChar, parentDocId)
                .input('tctClerkId', sql.NVarChar, tctClerkId)
                .query(`
                  UPDATE ${this.dbname}.dbo.incomming_current_state
                  SET current_stage_status = 'CHUA_XU_LY',
                      current_receiver = @tctClerkId,
                      has_open_workitem = 1,
                      updated_at = GETDATE()
                  WHERE document_id = @parentDocId
                `);
            }

            // Cập nhật assignment của các phòng ban đã Từ chối từ DA_XU_LY → TRA_LAI
            // để khi phân công lại, validateAssigneeDifferentProcessingRole bỏ qua các bản ghi này
            try {
              await pool.request()
                .input('parentDocId', sql.NVarChar, parentDocId)
                .input('tctClerkId', sql.NVarChar, tctClerkId)
                .query(`
                  UPDATE ${this.dbname}.dbo.incomming_assignment
                  SET stage_status = 'TRA_LAI', updated_at = GETDATE()
                  WHERE document_id = @parentDocId 
                    AND stage_status IN ('DA_XU_LY', 'TU_CHOI_VAN_BAN', 'TU_CHOI')
                    AND receiver <> @tctClerkId
                `);
            } catch (updateAssignErr) {
              this.logger.error(`Lỗi khi cập nhật assignment phòng ban đã Từ chối cho ${parentDocId}: ${updateAssignErr.message}`);
            }
          }
        } catch (reassignErr) {
          this.logger.error(`Lỗi khi tạo phân công lại cho tài liệu cha ${parentDocId}: ${reassignErr.message}`);
        }

        try {
          await this.bpmnEngine.invalidateDocCache('IncommingDocument', parentDocId);
          await this.bpmnEngine.invalidateDocCache('IncommingDocument', row.document_id);
        } catch (cacheErr) {
          this.logger.error(`Lỗi khi invalidate cache cho tài liệu ${parentDocId}: ${cacheErr.message}`);
        }
      }
    }

    const message = [
      successCount > 0 ? `${successCount} văn bản Từ chối thành công` : null,
      failureCount > 0 ? `${failureCount} văn bản thất bại (không tồn tại hoặc không đủ điều kiện)` : null,
    ].filter(Boolean).join(' và ') || 'Không có văn bản nào được xử lý.';

    return {
      success: successCount > 0,
      message,
      data: { successful_ids: existingIds, failed_ids: nonExistingIds },
    };
  }

  /**
   * Thay đổi sổ văn bản đến.
   * Chỉ văn thư mới có quyền thực hiện.
   * Văn bản phải chưa được chuyển xử lý.
   */
  async changeBook(documentId: string, newBookDocumentId: string, userId: string, toBookDate?: string): Promise<{
    success: boolean;
    message: string;
    data: { toBookCode: string; bookDocumentId: string };
  }> {
    if (!documentId || !newBookDocumentId) {
      throw new BadRequestException('Thiếu documentId hoặc bookDocumentId.');
    }

    // Kiểm tra quyền văn thư
    const userRole = await this.sqlRepo.getUserRole(userId);
    const hasVanThuRole = Array.isArray(userRole?.roles) &&
      userRole.roles.some((r: string) => VAN_THU_ALL.includes(r));
    if (!hasVanThuRole) {
      throw new ForbiddenException('Chỉ văn thư mới có quyền thay đổi sổ văn bản.');
    }

    try {
      const result = await this.sqlRepo.changeIncomingDocumentBook(documentId, newBookDocumentId, toBookDate);
      return {
        success: true,
        message: `Đổi sổ thành công. Số đến mới: ${result.toBookCode}`,
        data: result,
      };
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg === 'INVALID_INPUT') {
        throw new BadRequestException('Dữ liệu đầu vào không hợp lệ.');
      }
      if (msg === 'DOCUMENT_NOT_FOUND') {
        throw new NotFoundException('Không tìm thấy văn bản.');
      }
      if (msg === 'ALREADY_TRANSFERRED') {
        throw new BadRequestException('Không thể đổi sổ vì văn bản đã được chuyển xử lý.');
      }
      if (msg === 'BOOK_NOT_FOUND') {
        throw new NotFoundException('Không tìm thấy sổ văn bản mới.');
      }
      this.logger.error(`[changeBook] documentId=${documentId} error=${msg}`, error);
      throw new InternalServerErrorException('Lỗi khi thay đổi sổ văn bản. Vui lòng thử lại.');
    }
  }

  private mapDirectiveContentColor(content: string): string {
    if (content.includes(':')) {
      return content.replace(
        /^([^:]+:)\s*([^.\n]+)(\.)/,
        (_, label, target, dot) =>
          `${label} <span style="color:#1e88e5;font-weight:500">${target}</span>${dot}`
      );
    }

    return content.replace(
      /(cho\s+)([^.\n]+)(\.)/i,
      (_, prefix, target, dot) =>
        `${prefix}<span style="color:#1e88e5;font-weight:500">${target}</span>${dot}`
    );
  }

  async getUserInFlowv1(documentId: string) {
    try {
      const audits = await this.auditRepo.find({
        where: { documentId: documentId, stageStatus: stageStatusDoc.CHUA_XU_LY },
        order: { createdAt: 'DESC' },
      });
      if (audits && audits.length) {
        const userIds = [...new Set(audits.map((audit) => audit.receiver).filter((id) => id))];
        if (userIds.length === 0) return [];

        const users = await this.userRepo.find({
          where: { id: In(userIds) },
          select: ['id', 'name'],
        });

        const userMap = new Map(users.map((u) => [u.id, u.name]));
        return userIds.map((userId: string) => {
          const audit = audits.find((a) => a.receiver === userId);
          return {
            auditId: audit?.id || null,
            userId: userId,
            name: userMap.get(userId) || '',
            deadline: audit?.deadline || null,
          };
        });
      }
      return [];
    } catch (error) {
    }
  }

  async getUserInFlow(documentId: string, currentUserId: string) {
    if (!documentId || !currentUserId) {
      throw new BadRequestException('Document ID và User ID không được để trống');
    }

    try {
      const audits = await this.auditRepo.find({
        where: {
          documentId: documentId,
          stageStatus: stageStatusDoc.CHUA_XU_LY
        },
        order: { createdAt: 'DESC' },
      });
      if (!audits || audits.length === 0) {
        return [];
      }
      const filteredAudits = audits.filter(audit => {
        const isCurrentUser = audit.receiver === currentUserId;
        const isCreatedByCurrentUser = audit.createdBy === currentUserId && audit.receiver;
        return isCurrentUser || isCreatedByCurrentUser;
      });
      if (filteredAudits.length === 0) {
        return [];
      }
      const userIds = [...new Set(
        filteredAudits
          .map(audit => audit.receiver)
          .filter(id => id)
      )];
      if (userIds.length === 0) {
        return [];
      }
      const users = await this.userRepo.find({
        where: { id: In(userIds) },
        select: ['id', 'name'],
      });
      const userMap = new Map(users.map(u => [u.id, u]));
      const result = userIds.map((userId: string) => {
        const userAudit = filteredAudits.find(a => a.receiver === userId);
        const userInfo = userMap.get(userId);
        const isCurrentUser = userId === currentUserId;
        return {
          auditId: userAudit?.id || null,
          userId: userId,
          name: userInfo?.name || 'Cán bộ',
          deadline: userAudit?.deadline || null,
          createdAt: userAudit?.createdAt || null,
          isCurrentUser: isCurrentUser,
        };
      });
      result.sort((a, b) => {
        if (a.isCurrentUser) return -1;
        if (b.isCurrentUser) return 1;
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      return result;
    } catch (error) {
      this.logger.error('Error in getUserInFlow:', error);
      throw new InternalServerErrorException('Không thể lấy danh sách người dùng trong luồng xử lý');
    }
  }

  async extensionDeadlineUserv1(documentId: string, dataExtend: ExtendDeadlineDto) {
    if (!dataExtend?.items?.length) {
      throw new BadRequestException('Danh sách người dùng cần gia hạn không được để trống.');
    }

    const pool = await this.getPool();

    try {
      const updatePromises = dataExtend.items.map(async (item) => {
        const { auditId, newDeadline } = item;

        if (isNaN(new Date(newDeadline).getTime())) {
          throw new BadRequestException(`Ngày gia hạn không hợp lệ cho auditId: ${auditId}`);
        }

        const request = pool.request();
        request.input('deadline', sql.DateTime, new Date(newDeadline));
        request.input('auditId', sql.BigInt, auditId);
        request.input('documentId', sql.NVarChar, documentId);

        const result = await request.query(`
          UPDATE ${this.dbname}.dbo.audit
          SET deadline = @deadline, updated_at = GETDATE()
          WHERE id = @auditId AND document_id = @documentId
        `);

        if (result.rowsAffected[0] === 0) {
          throw new NotFoundException(`Không tìm thấy bản ghi audit với ID ${auditId} cho văn bản này.`);
        }
      });

      await Promise.all(updatePromises);
      // await this.sqlRepo.commit(pool);
      return { success: true, message: 'Gia hạn thành công.' };
    } catch (error) {
      // await this.sqlRepo.rollback(pool);
      this.logger.error('Lỗi khi gia hạn deadline:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình gia hạn.');
    }
  }

  async extensionDeadlineUser(documentId: string, dataExtend: ExtendDeadlineDto, currentUserId: string) {
    if (!dataExtend?.items?.length) {
      throw new BadRequestException('Danh sách người dùng cần gia hạn không được để trống.');
    }

    const pool = await this.getPool();

    try {
      const docRequest = pool.request();
      docRequest.input('documentId', sql.NVarChar, documentId);
      const docResult = await docRequest.query(`
        SELECT deadline FROM ${this.dbname}.dbo.incomming_documents WHERE document_id = @documentId
        UNION ALL
        SELECT deadline_reply AS deadline FROM ${this.dbname}.dbo.outgoing_documents WHERE document_id = @documentId
      `);
      const documentDeadline: Date | null = docResult.recordset[0]?.deadline
        ? new Date(docResult.recordset[0].deadline)
        : null;

      const updatePromises = dataExtend.items.map(async (item) => {
        const { auditId, newDeadline } = item;

        if (isNaN(new Date(newDeadline).getTime())) {
          throw new BadRequestException(`Ngày gia hạn không hợp lệ cho auditId: ${auditId}`);
        }

        const selectRequest = pool.request();
        selectRequest.input('auditId', sql.BigInt, auditId);
        selectRequest.input('documentId', sql.NVarChar, documentId);
        const selectResult = await selectRequest.query(`
          SELECT deadline, details, receiver
          FROM ${this.dbname}.dbo.audit
          WHERE id = @auditId AND document_id = @documentId
        `);

        if (!selectResult.recordset.length) {
          throw new NotFoundException(`Không tìm thấy audit với ID ${auditId}.`);
        }

        const currentAudit = selectResult.recordset[0];

        let detailsObject: Record<string, any> = {};
        try {
          detailsObject = currentAudit.details ? JSON.parse(currentAudit.details) : {};
        } catch {
          this.logger.warn(`[extensionDeadlineUser] details parse lỗi – auditId=${auditId}`);
          detailsObject = {};
        }

        const newDeadlineDate = new Date(newDeadline);
        const isReceiver = currentAudit.receiver === currentUserId;
        let needUpdateDetails = false;

        if (isReceiver) {
          let managerDeadline: Date | null = null;
          if (detailsObject?.originalDeadline) {
            const parsed = new Date(detailsObject.originalDeadline);
            if (!isNaN(parsed.getTime())) {
              managerDeadline = parsed;
            }
          }

          const cap: Date = managerDeadline ?? documentDeadline ?? MAX_DATE;
          if (newDeadlineDate > cap) {
            throw new ConflictException(
              `Thời hạn gia hạn (${normalizeDateValueHHmmDDMMYYYY(newDeadlineDate)}) vượt quá hạn xử lý gốc (${normalizeDateValueHHmmDDMMYYYY(cap)}).`
            );
          }
        } else {
          // Admin/manager: không được vượt documentDeadline nếu có
          if (documentDeadline && newDeadlineDate > documentDeadline) {
            throw new ConflictException(
              `Thời hạn gia hạn (${normalizeDateValueHHmmDDMMYYYY(newDeadlineDate)}) vượt quá hạn của văn bản (${normalizeDateValueHHmmDDMMYYYY(documentDeadline)}).`
            );
          }
          detailsObject.originalDeadline = newDeadlineDate.toISOString();
          needUpdateDetails = true;
        }

        const updateRequest = pool.request();
        updateRequest.input('auditId', sql.BigInt, auditId);
        updateRequest.input('documentId', sql.NVarChar, documentId);

        const utcDate = new Date(newDeadline);

        // convert sang giờ VN (UTC+7)
        const localDate = new Date(utcDate.getTime() + 7 * 60 * 60 * 1000);

        updateRequest.input('deadline', sql.DateTime, localDate);

        let updateQuery = `
          UPDATE ${this.dbname}.dbo.audit
          SET deadline = @deadline, updated_at = GETDATE()
        `;

        if (needUpdateDetails) {
          updateRequest.input('details', sql.NVarChar, JSON.stringify(detailsObject));
          updateQuery += `, details = @details`;
        }

        updateQuery += ` WHERE id = @auditId AND document_id = @documentId`;

        const result = await updateRequest.query(updateQuery);
        if (result.rowsAffected[0] === 0) {
          throw new NotFoundException(`Không thể cập nhật audit ID ${auditId}.`);
        }

      });

      await Promise.all(updatePromises);

      return { success: true, message: 'Gia hạn thành công.', totalUpdated: dataExtend.items.length };
    } catch (error) {
      this.logger.error('[extensionDeadlineUser] Lỗi:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình gia hạn.');
    }
  }

  async exportBody(
    documentId: string,
    userId: string,
    typeDocument: string,
  ): Promise<Record<string, any>> {
    if (!documentId || !userId) {
      throw new BadRequestException('Thiếu documentId hoặc userId');
    }

    // Lấy incoming document
    const doc = await this.sqlRepo.getDocument(documentId);

    if (!doc) {
      throw new NotFoundException('Không tìm thấy văn bản đến');
    }

    // Lấy files cho incoming document
    const filesMap = await this.sqlRepo.getFilesByDocumentIds([documentId]);
    doc.files = filesMap[doc.documentId] || [];

    // Aliases cho incoming document
    const aliases = {
      statusCode: 'statusCode',
      abstractNote: 'abstractNote',
      toBook: 'toBook',
      bookDocumentId: 'bookDocumentId',
      documentDate: 'documentDate',
      senderUnit: 'senderUnit',
      toBookCode: 'toBookCode',
      receiveMethod: 'receiveMethod',
      receiverUnit: 'receiverUnit',
      receiveDate: 'receiveDate',
      toBookDate: 'toBookDate',
      deadline: 'deadline',
      secondBook: 'secondBook',
      privateLevel: 'privateLevel',
      urgencyLevel: 'urgencyLevel',
      documentType: 'documentType',
      documentField: 'documentField',
      signer: 'signer',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      resolutionDeadline: 'resolutionDeadline',
      copyCount: 'copyCount',
      pageCount: 'pageCount',
      parentDoc: 'parentDoc',
      viewGroup: 'viewGroup',
      copyToInternal: 'copyToInternal',
    };

    // Lấy và xử lý comments
    const cleanedComments = await this.getCleanedComments(documentId, doc.bpmnVersion);

    // Map document với aliases
    doc.statusCode = await this.sqlRepo.getStatusCode(documentId);
    const result = await this.sqlRepo.mapSingleDocumentWithAliases(doc, aliases);

    // Set drafter
    result.drafter = doc.createdAt
      ? this.normalizeDateValueDDMMYYYY(doc.createdAt)
      : '';

    // Thêm metadata
    result.comments = cleanedComments;
    const exportedAt = new Date(Date.now() + 7 * 60 * 60 * 1000);
    result.exportedAt = this.normalizeDateValueHHmmDDMMYYYY(exportedAt);

    const userName = await this.sqlRepo.getNameOfUser(userId);
    result.exportedBy = userName;

    return this.toSnakeCase(result);
  }

  /**
   * Get cleaned comments với role mapping
   * 
   * @private
   */
  private async getCleanedComments(documentId: string, bpmnVersion: string): Promise<any[]> {
    const commentsResult = await this.sqlRepo.findAllCommentsFlat(documentId);
    const comments = Array.isArray(commentsResult) ? commentsResult : [];

    // Get unique user IDs
    const uniqueUserIds = [...new Set(comments.map(c => c.userId).filter(Boolean))];

    // Map user roles
    const userRolesMap = new Map<string, string>();
    await Promise.all(
      uniqueUserIds.map(async (uid) => {
        const roles = await this.sqlRepo.getUserRoleWithName(uid, bpmnVersion);
        const roleText = roles?.userRoles?.length
          ? roles.userRoles.map(r => r.name).join(', ')
          : '';
        userRolesMap.set(uid, roleText);
      })
    );

    // Clean comments
    return comments.map((c, index) => {
      const roleText = c.userId ? userRolesMap.get(c.userId) || '' : '';
      const userName = c.name || '';
      return {
        index: index + 1,
        name: roleText ? `Ý kiến của ${userName} - ${roleText}` : `Ý kiến của ${userName}`,
        content: c.content
          ? c.content.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
          : ''
      };
    });
  }

  /**
   * Helper methods
   */
  private normalizeDateValueDDMMYYYY(date: Date | string): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private normalizeDateValueHHmmDDMMYYYY(date: Date | string): string {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  }

  private toSnakeCase(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.toSnakeCase(item));
    }

    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj).reduce((acc, key) => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        acc[snakeKey] = this.toSnakeCase(obj[key]);
        return acc;
      }, {} as any);
    }

    return obj;
  }

  async listDocumentsBySender(
    query: ListDocumentsOverDueDto,
    userId: string,
  ) {
    /** ================= PAGINATION ================= */
    const isExport = query.isExport === 'true';
    const page = Math.max(Number(query.page) || 1, 1);
    let limit = Math.min(Number(query.limit) || 20, 100);
    if (isExport) limit = 10000;
    const offset = (page - 1) * limit;

    const pool = await this.getPool();

    /** ================= PERMISSION CONTEXT ================= */
    const [orgInfo, highestOrder] = await Promise.all([
      this.sqlRepo.getUserOrgUnitInfo(userId),
      this.sqlRepo.getUserHighestGroupOrder(userId),
    ]);

    const { unitId: userOrgUnitId, isCuc, isPhong, mpath: userMpath } = orgInfo;

    /** ================= BASE CONDITIONS ================= */
    const baseConditions: string[] = [`d.status = 1`];

    /** ================= DETERMINE SCOPE ================= */
    const scope = this.resolveDataScope(isCuc, isPhong, highestOrder);

    /** ================= BUILD ALLOWED UNITS CTE ================= */
    let allowedUnitsCTE = '';
    let needUserId = false;
    let needUserOrgUnit = false;
    let needUserMpath = false;

    switch (scope) {
      case 'ALL_CUC':
        // Lấy tất cả phòng thuộc Cục (mpath bắt đầu bằng mpath của Cục)
        allowedUnitsCTE = `
          WITH AllowedUnits AS (
            SELECT 
              id,
              name,
              mpath,
              parentId
            FROM ${this.dbname}.dbo.organization_units
            WHERE status = 1
              AND (
                mpath LIKE @userMpath + '/%'
                OR id = @userOrgUnit
              )
          )
        `;
        needUserOrgUnit = true;
        needUserMpath = true;
        break;

      case 'ALL_PHONG':
        // Lấy phòng chính + phòng con (parentId = phòng hiện tại)
        allowedUnitsCTE = `
          WITH AllowedUnits AS (
            SELECT 
              id,
              name,
              mpath,
              parentId
            FROM ${this.dbname}.dbo.organization_units
            WHERE status = 1
              AND (
                id = @userOrgUnit
                OR parentId = @userOrgUnit
              )
          )
        `;
        needUserOrgUnit = true;
        break;

      case 'SELF':
      default:
        // Chỉ lấy phòng mà user có tham gia xử lý văn bản
        allowedUnitsCTE = `
          WITH AllowedUnits AS (
            SELECT DISTINCT
              ou.id,
              ou.name,
              ou.mpath,
              ou.parentId
            FROM ${this.dbname}.dbo.organization_units ou
            WHERE ou.status = 1
              AND ou.parentId = @userOrgUnit
              AND EXISTS (
                SELECT 1
                FROM ${this.dbname}.dbo.incomming_documents doc
                JOIN ${this.dbname}.dbo.audit a ON a.document_id = doc.document_id
                WHERE doc.sender_unit = ou.id
                  AND doc.status = 1
                  AND (
                    a.receiver = @userId
                    OR a.user_id = @userId
                    OR a.created_by = @userId
                  )
              )
          )
        `;
        needUserId = true;
        needUserOrgUnit = true;
        break;
    }

    /** ================= FILTERS (AND) ================= */
    const filters: string[] = [];

    if (query.filter?.dateFrom) filters.push(`d.receive_date >= @dateFrom`);

    if (query.filter?.dateTo)
      filters.push(`d.receive_date < DATEADD(DAY,1,@dateTo)`);

    if (query.filter?.documentType)
      filters.push(`d.document_type = @documentType`);

    /** ================= BUILD WHERE ================= */
    const documentConditions: string[] = [...baseConditions];

    // Thêm điều kiện audit cho SELF scope
    if (scope === 'SELF') {
      documentConditions.push(`
        EXISTS (
          SELECT 1
          FROM ${this.dbname}.dbo.audit a_check
          WHERE a_check.document_id = d.document_id
            AND (
              a_check.receiver = @userId
              OR a_check.user_id = @userId
              OR a_check.created_by = @userId
            )
        )
      `);
    }

    if (filters.length) documentConditions.push(filters.join(' AND '));

    const whereClause =
      documentConditions.length > 0
        ? `WHERE ${documentConditions.join(' AND ')}`
        : '';

    /** ================= BUILD REQUEST ================= */
    const buildRequest = () => {
      const req = pool.request();

      if (needUserId) req.input('userId', userId);
      if (needUserOrgUnit) req.input('userOrgUnit', userOrgUnitId);
      if (needUserMpath) req.input('userMpath', userMpath);

      if (query.filter?.documentType)
        req.input('documentType', query.filter.documentType);

      if (query.filter?.dateFrom) req.input('dateFrom', query.filter.dateFrom);

      if (query.filter?.dateTo) req.input('dateTo', query.filter.dateTo);

      req.input('TYPE_CONG_VAN', DOC_TYPE.CONG_VAN);
      req.input('TYPE_QUYET_DINH', DOC_TYPE.QUYET_DINH);
      req.input('TYPE_THONG_BAO', DOC_TYPE.THONG_BAO);
      req.input('TYPE_BAO_CAO', DOC_TYPE.BAO_CAO);
      req.input('offset', sql.Int, offset);
      req.input('limit', sql.Int, limit);

      return req;
    };

    /** ================= COUNT QUERY ================= */
    const countSql = `
      ${allowedUnitsCTE}
      SELECT COUNT(DISTINCT au.id) AS total
      FROM AllowedUnits au
    `;

    if (query.countOnly === 'true') {
      const rs = await buildRequest().query(countSql);
      return { total: rs.recordset[0]?.total || 0 };
    }

    /** ================= DATA QUERY ================= */
    const dataSql = `
      ${allowedUnitsCTE}
      SELECT
        au.id AS senderUnit,
        au.name AS senderName,
        au.mpath AS senderMpath,
        
        ISNULL(COUNT(DISTINCT d.document_id), 0) AS totalDocuments,
        
        ISNULL(SUM(CASE WHEN d.document_type = @TYPE_CONG_VAN THEN 1 ELSE 0 END), 0) AS congVan,
        ISNULL(SUM(CASE WHEN d.document_type = @TYPE_QUYET_DINH THEN 1 ELSE 0 END), 0) AS quyetDinh,
        ISNULL(SUM(CASE WHEN d.document_type = @TYPE_THONG_BAO THEN 1 ELSE 0 END), 0) AS thongBao,
        ISNULL(SUM(CASE WHEN d.document_type = @TYPE_BAO_CAO THEN 1 ELSE 0 END), 0) AS baoCao,
        
        ISNULL(COUNT(DISTINCT d.document_id), 0)
          - ISNULL(SUM(CASE WHEN d.document_type IN (
              @TYPE_CONG_VAN,
              @TYPE_QUYET_DINH,
              @TYPE_THONG_BAO,
              @TYPE_BAO_CAO
            ) THEN 1 ELSE 0 END), 0) AS khac
            
      FROM AllowedUnits au
      LEFT JOIN ${this.dbname}.dbo.organization_units sender ON sender.id = au.id
      LEFT JOIN ${this.dbname}.dbo.incomming_documents d 
        ON d.sender_unit = sender.id
        ${whereClause.replace('WHERE', 'AND')}
        
      GROUP BY au.id, au.name, au.mpath
      ORDER BY totalDocuments DESC, au.name ASC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const [countRs, rowsRs] = await Promise.all([
      buildRequest().query(countSql),
      buildRequest().query(dataSql),
    ]);

    /** ================= MAP RESPONSE ================= */
    const data = rowsRs.recordset.map((r) => ({
      senderUnit: r.senderUnit,
      senderName: r.senderName,
      senderMpath: r.senderMpath,
      totalDocuments: r.totalDocuments,
      congVan: r.congVan,
      quyetDinh: r.quyetDinh,
      thongBao: r.thongBao,
      baoCao: r.baoCao,
      khac: r.khac,
    }));

    return {
      page,
      limit,
      total: countRs.recordset[0]?.total || 0,
      data,
    };
  }

  resolveDataScope(isCuc: boolean, isPhong: boolean, order: number | null): DataScope {
    if (order === null) return 'SELF';
    // ===== CẤP CỤC =====
    if (isCuc) {
      if (order === 0) return 'ALL_CUC';     // Văn thư cục
      if (order === 1) return 'ALL_CUC';     // Giám đốc
      if (order === 2) return 'ALL_CUC';     // Phó giám đốc
    }
    // ===== CẤP PHÒNG =====
    if (isPhong) {
      if (order === 0) return 'ALL_PHONG';   // Văn thư phòng
      if (order === 3) return 'ALL_PHONG';   // Trưởng phòng
      if (order === 4) return 'ALL_PHONG';   // Phó phòng
    }
    return 'SELF';
  }

  async deleteDraftById(documentId: string) {
    if (!documentId) {
      throw new BadRequestException('documentId is required');
    }
    const tx = await this.sqlRepo.begin();
    try {
      const result = await this.sqlRepo.deleteDraftIncomingById(documentId, tx);
      await tx.commit();
      return result;
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  }
  async submitFileStampDoc(
    docId: string,
    workItemId: string,
    payload: {
      fileOrigin: string;   // URL file gốc (file cần tạo sao y)
      fileBase64: string;  // File đã preview ở bước 1
      fileName: string;
      roles?: string;
      actionCode?: string;
    },
    userId: string,
    authorizedBy: string,
  ) {
    const fs = await import('fs');
    const os = await import('os');
    let tmpFilePath: string | null = null;
    let uploadedFileId: number | null = null;

    try {
      const { fileBase64, fileName, fileOrigin } = payload;
      const object_type = 'incommingdocument';
      const copyFile = 'attachments_cert_copy';
      const object_id = docId;

      if (!fileBase64) {
        throw new BadRequestException('Thiếu dữ liệu file (fileBase64)');
      }

      function extractBase64(data: string): string {
        if (data.startsWith('data:')) {
          const commaIndex = data.indexOf(',');
          return data.slice(commaIndex + 1);
        }
        return data;
      }
      const fileBase64Clean = extractBase64(fileBase64);

      // Convert Base64 → Buffer
      const fileBuffer = Buffer.from(fileBase64Clean, 'base64');
      const fileType = await fileTypeFromBuffer(fileBuffer);

      if (!fileType) {
        throw new BadRequestException('Không xác định được định dạng file');
      }

      const newExt = fileType?.ext;
      function normalizeFileName(
        originalName: string,
        newExt: string,
      ) {
        const parsed = path.parse(originalName);
        return `${parsed.name}.${newExt}`;
      }
      const safeFileName = normalizeFileName(fileName, newExt);

      // Tạo fake Express.Multer.File object từ Buffer
      const multerFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: safeFileName || 'stamped_document.pdf',
        encoding: '7bit',
        mimetype: fileType?.mime || null,
        size: fileBuffer.length,
        buffer: fileBuffer,
        stream: null,
        destination: '',
        filename: safeFileName || 'stamped_document.pdf',
        path: '',
      } as any;

      // Ghi file tạm
      const tmpDir = os.tmpdir();
      tmpFilePath = path.join(tmpDir, `upload_${Date.now()}_${safeFileName}`);
      await fs.promises.writeFile(tmpFilePath, fileBuffer);
      multerFile.path = tmpFilePath;

      // Bắt đầu transaction cho TẤT CẢ các thao tác
      const pool = await this.getPool();
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        // Upload file (truyền transaction để share cùng phiên)
        const uploadResult = await this.fileService.uploadFileWithTransaction(
          { object_type, object_id },
          multerFile,
          userId,
          transaction
        );

        if (!uploadResult || !uploadResult.public_id) {
          throw new InternalServerErrorException('Lỗi khi lưu file');
        }

        uploadedFileId = await this.fileService.resolveFileIdOrThrow(uploadResult.public_id, transaction);
        // Tạo file relation (trong transaction)
        await this.filesRepository.createFileRelation(
          {
            object_type: copyFile,
            object_id: object_id,
            file_id: uploadedFileId
          },
          transaction
        );

        // Tiếp tục luồng workflow (dùng chung transaction)
        const result = await this.workItemsService.simpleNext(
          docId,
          workItemId,
          payload,
          userId,
          authorizedBy,
          null,
          'incoming_document',
          transaction,
          undefined, // bpmn
          undefined, // roleProcess
          true // isDelWorkItem
        );

        // 🔥 FIX: Chỉ tăng số sổ khi lưu chính thức (SAO Y)
        if (payload.actionCode === 'TAO_SAO_Y') {
          const currentYear = new Date().getFullYear();
          const bookReq = transaction.request();
          bookReq.input('currentYear', sql.Int, currentYear);
          const bookRes = await bookReq.query(`
            SELECT book_document_id 
            FROM ${this.dbname}.dbo.book_documents
            WHERE year = @currentYear
              AND active = 1
              AND is_default = 1
              AND is_certified_copies = 1
              AND status IN (0, 1)
          `);
          const certifiedBookId = bookRes.recordset[0]?.book_document_id;
          if (certifiedBookId) {
            const docInfoReq = transaction.request();
            docInfoReq.input('docId', sql.NVarChar, docId);
            const docInfoRes = await docInfoReq.query(`
              SELECT book_document_id
              FROM ${this.dbname}.dbo.incomming_documents
              WHERE document_id = @docId
            `);
            const docBookId = docInfoRes.recordset[0]?.book_document_id;

            if (docBookId && Number(certifiedBookId) === Number(docBookId)) {
              throw new BadRequestException(
                'Sổ của văn bản đến trùng với sổ sao y. Vui lòng cập nhật lại sổ của văn bản đến trước khi tạo sao y.',
              );
            }

            const updateBookReq = transaction.request();
            updateBookReq.input('bookId', sql.BigInt, certifiedBookId);
            await updateBookReq.query(`
              UPDATE ${this.dbname}.dbo.book_documents
              SET count = ISNULL(count, 0) + 1
              WHERE book_document_id = @bookId
            `);

            const docReq = transaction.request();
            docReq.input('docId', sql.NVarChar, docId);
            docReq.input('certifiedBookId', sql.BigInt, certifiedBookId);
            await docReq.query(`
              UPDATE ${this.dbname}.dbo.incomming_documents
              SET certified_book_document_id = @certifiedBookId
              WHERE document_id = @docId
            `);
          }
        }

        // Commit transaction sau khi TẤT CẢ thao tác thành công (bao gồm cả workflow)
        await transaction.commit();

        // Xóa file gốc sau khi mọi thứ hoàn tất
        try {
          await this.fileService.deleteFile(+fileOrigin);
        } catch (deleteError) {
          this.logger.warn(`Không thể xóa file gốc ${fileOrigin}: ${deleteError.message}`);
        }

        // Chỉ xóa file gốc SAU KHI transaction commit thành công

        return {
          success: true,
          fileId: uploadResult.public_id,
          fileName: uploadResult?.file_name || safeFileName,
          workflowResult: result,
        };

      } catch (transactionError) {
        // Rollback transaction nếu có lỗi
        await transaction.rollback();
        this.logger.error(`Transaction failed, rolling back: ${transactionError.message}`);
        throw transactionError;
      }

    } catch (error) {
      this.logger.error(`submitFileStampDoc error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Lỗi khi lưu file: ' + error.message);
    } finally {
      // Cleanup file tạm trong mọi trường hợp
      if (tmpFilePath) {
        try {
          await fs.promises.unlink(tmpFilePath);
        } catch (cleanupError) {
          this.logger.warn(`Không thể xóa file tạm ${tmpFilePath}`);
        }
      }
    }
  }

  buildSortClause(
    sort: any,
    fieldMap: Record<string, string>,
    defaultSort: string,
  ): string {
    if (!sort) return defaultSort;
    try {
      const parsed: Record<string, any> =
        typeof sort === 'string' ? JSON.parse(sort) : sort;
      const parts: string[] = [];
      for (const [key, val] of Object.entries(parsed)) {
        const col = fieldMap[key];
        if (!col) continue;
        parts.push(`${col} ${Number(val) === 1 ? 'ASC' : 'DESC'}`);
      }
      return parts.length ? parts.join(', ') : defaultSort;
    } catch {
      return defaultSort;
    }
  }

  applyInMemorySort<T extends Record<string, any>>(
    data: T[],
    sort: any,
    fieldMap: Record<string, string>, // camelCase → JS property name
  ): T[] {
    if (!sort) return data;
    try {
      const parsed: Record<string, any> =
        typeof sort === 'string' ? JSON.parse(sort) : sort;
      const keys = Object.keys(parsed);
      if (!keys.length) return data;

      return [...data].sort((a, b) => {
        for (const key of keys) {
          const prop = fieldMap[key];
          if (!prop) continue;
          const dir = Number(parsed[key]) === 1 ? 1 : -1;
          const av = a[prop] ?? '';
          const bv = b[prop] ?? '';
          const cmp =
            typeof av === 'number' && typeof bv === 'number'
              ? (av - bv) * dir
              : String(av).localeCompare(String(bv), 'vi') * dir;
          if (cmp !== 0) return cmp;
        }
        return 0;
      });
    } catch {
      return data;
    }
  }

  async statisticsByTime(
    query: IncomingStatisticsByTimeDto,
    userId: string,
  ) {
    const { page = '1', limit = '20', filter, sort, isExport, countOnly } = query;

    // ── Validate & normalize pagination ───────────────────────────────────────
    const limitNum = isExport === 'true' ? 9999 : Math.min(Math.max(Number(limit) || 20, 1), 1000);
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;

    const pool = await this.getPool();

    // ── User context ───────────────────────────────────────────────────────────
    const [orgInfo, highestOrder, userGroupsRes] = await Promise.all([
      this.sqlRepo.getUserOrgUnitInfo(userId),
      this.sqlRepo.getUserHighestGroupOrder(userId),
      pool.request().query(`
        SELECT gu.code
        FROM ${this.dbname}.dbo.user_group_users ugu
        JOIN ${this.dbname}.dbo.group_users gu ON gu.id = ugu.group_user_id
        WHERE ugu.user_id = '${userId.replace(/'/g, "''")}'
          AND gu.status = 1
      `),
    ]);
    const { unitId: userOrgUnitId, isCuc, isPhong } = orgInfo;
    const groupCodes = userGroupsRes.recordset.map((r: any) => r.code);

    // ── Normalize filter ───────────────────────────────────────────────────────
    const normalizedFilter = normalizeStatisticsFilterObject(filter);

    // Special fields — extracted and removed before generic SQL builder
    const assigneeUserId = normalizedFilter.assigneeUser;
    const stageStatusFilter = normalizedFilter.stageStatus;

    // FE sends: filter[receiveDate][startDate] & filter[receiveDate][endDate]
    // NestJS parses as: { receiveDate: { startDate: '...', endDate: '...' } }
    const receiveDateFilter = normalizedFilter.receiveDate;
    let startDate: string | null = null;
    let endDate: string | null = null;

    if (
      receiveDateFilter !== null &&
      typeof receiveDateFilter === 'object' &&
      !Array.isArray(receiveDateFilter)
    ) {
      startDate = (receiveDateFilter as any).startDate || null;
      endDate = (receiveDateFilter as any).endDate || null;
    }

    // Remove all special/handled fields before passing to generic builder
    const filterForSql = { ...normalizedFilter };
    delete filterForSql.assigneeUser;
    delete filterForSql.stageStatus;
    delete filterForSql.receiveDate; // handled separately as date range

    const filterSql = parseStatisticsFilter(
      filterForSql,
      {
        documentType: 'document_type',
        senderUnit: 'sender_unit',
        excerpt: 'abstract_note',
        toBook: 'to_book',
        note: 'directive_comment',
      },
      'd',
    );

    // ── WHERE clause assembly ──────────────────────────────────────────────────
    const whereParts: string[] = [];
    whereParts.push(`d.status = 1`);

    if (filterSql) {
      whereParts.push(`(${filterSql})`);
    }

    // Date range: so sánh cả document_date và deadline
    // - startDate: record hợp lệ nếu document_date >= startDate
    //              HOẶC deadline còn hạn (>= startDate) — tránh bỏ sót hồ sơ đến hạn
    // - endDate  : chỉ lấy document_date trong khoảng (inclusive end day)
    const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]*)?$/;

    if (startDate && ISO_DATE_REGEX.test(startDate)) {
      const safeStart = startDate.replace(/'/g, "''");
      whereParts.push(`(
        d.document_date >= '${safeStart}'
        OR (d.deadline IS NOT NULL AND d.deadline >= '${safeStart}')
      )`);
    }

    if (endDate && ISO_DATE_REGEX.test(endDate)) {
      const safeEnd = endDate.replace(/'/g, "''");
      // Inclusive end: lấy đến hết ngày endDate
      whereParts.push(`
        d.document_date < DATEADD(DAY, 1, CAST('${safeEnd}' AS DATE))
      `);
    }

    // ── assigneeUser filter ────────────────────────────────────────────────────
    // Lọc theo người xử lý mới nhất (từ p - đã lấy TOP 1 audit mới nhất)
    if (assigneeUserId) {
      const usersArr = Array.isArray(assigneeUserId) ? assigneeUserId : [assigneeUserId];
      if (usersArr.length) {
        const safeList = usersArr
          .map((id) => `'${String(id).replace(/'/g, "''")}'`)
          .join(',');
        whereParts.push(`p.processor_id IN (${safeList})`);
      }
    }

    // ── stageStatus filter ─────────────────────────────────────────────────────
    if (stageStatusFilter) {
      const statusArr = Array.isArray(stageStatusFilter)
        ? stageStatusFilter
        : [stageStatusFilter];
      const statusConditions: string[] = [];

      for (const s of statusArr) {
        const strCode = String(s).trim();
        switch (strCode) {
          case 'TAO_MOI':
          case 'CREATE':
            statusConditions.push(`COALESCE(af.current_action_code, p.latest_stage_status) = 'CREATE'`);
            break;
          case 'DA_HOAN_THANH':
          case 'HOAN_THANH_VAN_BAN':
            statusConditions.push(`COALESCE(af.current_action_code, p.latest_stage_status) = '${stageStatusDoc.HOAN_THANH_VAN_BAN}'`);
            break;
          case 'VAN_BAN_TRA_LAI':
          case 'TRA_LAI':
            statusConditions.push(`COALESCE(af.current_action_code, p.latest_stage_status) = '${stageStatusDoc.TRA_LAI}'`);
            break;
          case 'THU_HOI':
            statusConditions.push(`COALESCE(af.current_action_code, p.latest_stage_status) = '${stageStatusDoc.THU_HOI}'`);
            break;
          case 'CHO_KY_SAO_Y':
          case 'TRINH_KY':
            statusConditions.push(`COALESCE(af.current_action_code, p.latest_stage_status) IN ('TRINH_KY', 'DANG_CHO_KY')`);
            break;
          case 'DANG_XU_LY':
          case 'DEFAULT':
            statusConditions.push(`(
              COALESCE(af.current_action_code, p.latest_stage_status) NOT IN (
                'CREATE',
                '${stageStatusDoc.HOAN_THANH_VAN_BAN}',
                '${stageStatusDoc.TRA_LAI}',
                '${stageStatusDoc.THU_HOI}',
                'TRINH_KY', 'DANG_CHO_KY'
              )
              OR COALESCE(af.current_action_code, p.latest_stage_status) IS NULL
            )`);
            break;
          default:
            if (/^[A-Za-z0-9_]+$/.test(strCode)) {
              statusConditions.push(
                `COALESCE(af.current_action_code, p.latest_stage_status) = '${strCode.replace(/'/g, "''")}'`,
              );
            }
        }
      }

      if (statusConditions.length) {
        whereParts.push(`(${statusConditions.join(' OR ')})`);
      }
    }

    // ── Permission scope ───────────────────────────────────────────────────────
    // Phân nhóm quyền theo yêu cầu:
    // 1. Văn thư TCT, Lãnh đạo: xem tất cả văn bản (không giới hạn receiver_unit hay audit)
    // 2. Văn thư phòng, trưởng phòng: xem của phòng (lọc theo cây đơn vị của phòng đó)
    // 3. Cán bộ: xem của người đó đã tham gia (lọc EXISTS audit)
    const isVanthuTctOrLanhDao = 
      groupCodes.some((code) => ['vanthutct', 'tonggd', 'BANLANHDAO', 'phogdtongcty'].includes(code)) ||
      (isCuc && (highestOrder === 0 || highestOrder === 1 || highestOrder === 2));

    const isVanthuPhongOrTruongPhong =
      groupCodes.some((code) => ['vtphong', 'truongphong', 'photruongphong', 'chanhvanphong'].includes(code)) ||
      (isPhong && (highestOrder === 0 || highestOrder === 3 || highestOrder === 4));

    if (isVanthuTctOrLanhDao) {
      // Văn thư TCT, Lãnh đạo: xem tất cả văn bản -> không append thêm bộ lọc phân quyền
    } else if (isVanthuPhongOrTruongPhong) {
      // Văn thư phòng, Trưởng phòng: xem của phòng
      const allOrgs = await this.getAllOrganizationUnits(pool, userId);
      const userOrg = allOrgs.find((org) => org.id === userOrgUnitId);
      if (userOrg) {
        const userMpath = userOrg.mpath || userOrg.id;
        const childOrgs = allOrgs.filter((org) => {
          const orgMpath = org.mpath || org.id;
          return org.id === userOrgUnitId || orgMpath.startsWith(userMpath + '/');
        });
        const allowedIds = childOrgs.map((o) => o.id);
        if (allowedIds.length) {
          whereParts.push(
            `d.receiver_unit IN (${allowedIds.map((id) => `'${id}'`).join(',')})`,
          );
        } else {
          whereParts.push(`d.receiver_unit = '${userOrgUnitId}'`);
        }
      } else {
        whereParts.push(`d.receiver_unit = '${userOrgUnitId}'`);
      }
    } else {
      // Cán bộ: xem của người đó đã tham gia
      const safeUserId = String(userId).replace(/'/g, "''");
      whereParts.push(`
        EXISTS (
          SELECT 1
          FROM ${this.dbname}.dbo.audit ax
          WHERE ax.document_id = d.document_id
            AND (
              ax.receiver   = '${safeUserId}' OR
              ax.user_id    = '${safeUserId}' OR
              ax.created_by = '${safeUserId}'
            )
        )
      `);
    }

    const whereClause = 'WHERE ' + whereParts.join(' AND ');

    // ── JOINs ──────────────────────────────────────────────────────────────────
    const joinClause = `
      LEFT JOIN ${this.dbname}.dbo.incomming_current_state af
        ON af.document_id = d.document_id
      OUTER APPLY (
        SELECT TOP 1
          a.receiver     AS processor_id,
          a.updated_at   AS processing_date,
          a.stage_status AS latest_stage_status
        FROM ${this.dbname}.dbo.audit a
        WHERE a.document_id = d.document_id
        ORDER BY a.id DESC
      ) p
      OUTER APPLY (
        SELECT TOP 1 a.created_at AS completed_at
        FROM ${this.dbname}.dbo.audit a
        WHERE a.document_id = d.document_id
          AND a.stage_status = '${stageStatusDoc.HOAN_THANH_VAN_BAN}'
        ORDER BY a.id DESC
      ) ca
      LEFT JOIN ${this.dbname}.dbo.users u_proc
        ON u_proc.id = p.processor_id
      LEFT JOIN ${this.dbname}.dbo.organization_units ou_sender
        ON ou_sender.id = d.sender_unit
      LEFT JOIN ${this.dbname}.dbo.organization_units ou_receiver
        ON ou_receiver.id = d.receiver_unit
      LEFT JOIN ${this.dbname}.dbo.crm_sources cs
        ON cs.code = 'S19'
      LEFT JOIN ${this.dbname}.dbo.crm_source_data csd
        ON csd.source_id = cs.id AND csd.value = d.document_type
    `;

    // ── SELECT fields ──────────────────────────────────────────────────────────
    const selectFields = `
      d.document_id                       AS documentId,
      d.to_book                           AS toBook,
      d.document_date                     AS receiveDate,
      d.deadline                          AS deadlineReply,
      ISNULL(csd.title, d.document_type)  AS documentType,
      COALESCE(ou_sender.name, d.sender_unit) AS senderUnit,
      d.abstract_note                     AS excerpt,
      COALESCE(u_proc.name, ou_receiver.name) AS assigneeUser,
      COALESCE(af.current_action_code, p.latest_stage_status) AS stageStatusCode,
      p.processing_date                   AS processingDate,
      ca.completed_at                     AS completedAt,
      d.directive_comment                 AS note,
      p.processor_id                      AS has_audit_check -- used for priority
    `;

    // ── Sort ───────────────────────────────────────────────────────────────────
    const sortFieldMap: Record<string, string> = {
      toBook: 'toBook',
      receiveDate: 'receiveDate',
      deadlineReply: 'deadlineReply',
      documentType: 'documentType',
      senderUnit: 'senderUnit',
      excerpt: 'excerpt',
      assigneeUser: 'assigneeUser',
      stageStatus: 'stageStatusCode',
      processingDate: 'processingDate',
      completedAt: 'completedAt',
      note: 'note',
    };

    const orderBy =
      'ORDER BY ' + this.buildSortClause(sort, sortFieldMap, 'CASE WHEN excerpt IS NULL THEN 1 ELSE 0 END ASC, excerpt ASC');

    // ── COUNT ──────────────────────────────────────────────────────────────────
    const countSql = `
      SELECT COUNT(DISTINCT ISNULL(d.parent_doc, d.document_id)) AS total
      FROM ${this.dbname}.dbo.incomming_documents d
      ${joinClause}
      ${whereClause}
    `;

    const countResult = await pool.request().query(countSql);
    const total: number = countResult.recordset[0]?.total ?? 0;

    if (countOnly === 'true') {
      return { total };
    }

    if (total === 0) {
      return { data: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 };
    }

    // ── DATA ───────────────────────────────────────────────────────────────────
    const dataSql = `
      SELECT * FROM (
        SELECT 
          ${selectFields},
          ROW_NUMBER() OVER (
            PARTITION BY ISNULL(d.parent_doc, d.document_id)
            ORDER BY 
              CASE WHEN p.processor_id IS NOT NULL THEN 0 ELSE 1 END,
              CASE WHEN d.parent_doc IS NULL THEN 0 ELSE 1 END, 
              d.document_id ASC
          ) as rn_dedup
        FROM ${this.dbname}.dbo.incomming_documents d
        ${joinClause}
        ${whereClause}
      ) t
      WHERE rn_dedup = 1
      ${orderBy}
      OFFSET ${offsetNum} ROWS FETCH NEXT ${limitNum} ROWS ONLY
    `;

    const dataResult = await pool.request().query(dataSql);

    const items = (dataResult.recordset ?? []).map((r: any) => ({
      documentId: r.documentId ?? '',
      toBook: r.toBook ?? '',
      receiveDate: r.receiveDate ? normalizeDateValueDDMMYYYY(r.receiveDate) : null,
      deadlineReply: r.deadlineReply ? normalizeDateValueDDMMYYYY(r.deadlineReply) : null,
      documentType: r.documentType ?? '',
      senderUnit: r.senderUnit ?? '',
      excerpt: r.excerpt ?? '',
      assigneeUser: r.assigneeUser ?? '',
      stageStatus: isExport ? extractTextFromHtml(mapActionIncomingToLabel(r.stageStatusCode)) : mapActionIncomingToLabel(r.stageStatusCode),
      processingDate: r.processingDate ? normalizeDateValueDDMMYYYY(r.processingDate) : null,
      completedAt: r.processingDate ? normalizeDateValueDDMMYYYY(r.processingDate) : null,
      note: r.note ?? '',
    }));

    return {
      data: items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async listDocumentsDeadline(
    query: ListDocumentsOverDueDto,
    userId: string,
  ) {
    /** ================= PAGINATION ================= */
    const isExport = query.isExport === 'true';
    const page = Math.max(Number(query.page) || 1, 1);
    let limit = Math.min(Number(query.limit) || 20, 100);
    if (isExport) limit = 9999;
    const offset = (page - 1) * limit;

    const normalizedFilter = normalizeStatisticsFilterObject(query.filter);

    /** ================= SORT ================= */
    // Inner: columns available directly on `d` (drives CTE pagination order)
    const innerSortFieldMap: Record<string, string> = {
      toBook: 'd.to_book',
      receiveDate: 'd.document_date',
      abstractNote: 'd.abstract_note',
      resolutionDeadline: 'd.resolution_deadline',
    };
    const orderByInner =
      'ORDER BY ' +
      this.buildSortClause(query.sort, innerSortFieldMap, 'd.abstract_note ASC');

    const outerSortFieldMap: Record<string, string> = {
      toBook: 'p.to_book',
      receiveDate: 'p.receive_date',
      abstractNote: 'p.abstract_note',
      resolutionDeadline: 'p.resolution_deadline',
      receiverUnit: 'o.name',
      dayOverdue: 'DATEDIFF(DAY, p.resolution_deadline, GETDATE())',
      assigneeUser: 'assignee.name',
    };
    const orderByOuter =
      'ORDER BY ' +
      this.buildSortClause(query.sort, outerSortFieldMap, 'p.abstract_note ASC');

    const pool = await this.getPool();

    /** ================= PERMISSION ================= */
    const [orgInfo, highestOrder] = await Promise.all([
      this.sqlRepo.getUserOrgUnitInfo(userId),
      this.sqlRepo.getUserHighestGroupOrder(userId),
    ]);
    const { unitId: userOrgUnitId, isCuc, isPhong } = orgInfo;

    const baseConditions: string[] = [
      `d.status = 1`,
      `d.resolution_deadline IS NOT NULL`,
      `d.resolution_deadline < GETDATE()`,
      `NOT EXISTS (
        SELECT 1 FROM ${this.dbname}.dbo.audit ax
        WHERE ax.document_id = d.document_id
          AND ax.stage_status IN (
            '${stageStatusDoc.HOAN_THANH}',
            '${stageStatusDoc.HOAN_THANH_VAN_BAN}'
          )
      )`,
    ];

    const permissionConditions: string[] = [];
    let needUserId = false;
    let needUserOrgUnit = false;

    const scope = this.resolveDataScope(isCuc, isPhong, highestOrder);

    const auditInMyUnitCondition = `
      EXISTS (
        SELECT 1
        FROM ${this.dbname}.dbo.audit a_unit
        JOIN ${this.dbname}.dbo.users u_unit ON u_unit.id = a_unit.receiver
        WHERE a_unit.document_id = d.document_id
          AND u_unit.parent = @userOrgUnit
      )
    `;

    switch (scope) {
      case 'ALL_CUC':
        break;
      case 'ALL_PHONG':
        permissionConditions.push(
          `(d.receiver_unit = @userOrgUnit OR ${auditInMyUnitCondition})`,
        );
        needUserOrgUnit = true;
        break;
      case 'SELF':
      default:
        permissionConditions.push(`
          EXISTS (
            SELECT 1 FROM ${this.dbname}.dbo.audit a_check
            WHERE a_check.document_id = d.document_id
              AND (
                a_check.receiver   = @userId OR
                a_check.user_id    = @userId OR
                a_check.created_by = @userId
              )
          )
        `);
        needUserId = true;
        break;
    }

    /** ================= FILTERS ================= */
    const filters: string[] = [];

    if (normalizedFilter?.receiverUnit) {
      const units = Array.isArray(normalizedFilter.receiverUnit)
        ? normalizedFilter.receiverUnit
        : [normalizedFilter.receiverUnit];
      if (units.length) {
        const list = units.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',');
        filters.push(`(d.receiver_unit IN (${list}))`);
      }
    }

    // New Working Period Intersection Logic
    const startDate = normalizedFilter?.resolutionDeadline?.startDate;
    const endDate = normalizedFilter?.resolutionDeadline?.endDate;

    if (startDate) {
      filters.push(`(
        d.document_date >= @startDate
        OR (d.deadline IS NOT NULL AND d.deadline >= @startDate)
      )`);
    }
    if (endDate) {
      filters.push(`d.document_date < DATEADD(DAY, 1, CAST(@endDate AS DATE))`);
    }

    if (normalizedFilter?.assigneeUser) {
      const users = Array.isArray(normalizedFilter.assigneeUser)
        ? normalizedFilter.assigneeUser
        : [normalizedFilter.assigneeUser];

      if (users.length) {
        const list = users.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',');
        filters.push(`
          EXISTS (
            SELECT 1
            FROM ${this.dbname}.dbo.audit a_search_assignee
            WHERE a_search_assignee.document_id = d.document_id
              AND a_search_assignee.receiver IN (${list})
              AND a_search_assignee.roleProcess = 'processor'
          )
        `);
      }
    }

    /** ================= SEARCH (text OR) ================= */
    const searches: string[] = [];
    if (normalizedFilter?.toBook) searches.push(`d.to_book LIKE @toBook`);
    if (normalizedFilter?.abstractNote) searches.push(`d.abstract_note LIKE @abstractNote`);

    /** ================= WHERE ================= */
    const whereParts = [...baseConditions, ...permissionConditions];
    if (filters.length) whereParts.push(filters.join(' AND '));
    if (searches.length) whereParts.push(`(${searches.join(' OR ')})`);
    const whereClause = `WHERE ${whereParts.join(' AND ')}`;

    /** ================= BUILD REQUEST ================= */
    const buildRequest = () => {
      const req = pool.request();
      if (needUserId) req.input('userId', userId);
      if (needUserOrgUnit) req.input('userOrgUnit', userOrgUnitId);

      if (normalizedFilter?.resolutionDeadline?.startDate)
        req.input('startDate', normalizedFilter.resolutionDeadline.startDate);

      if (normalizedFilter?.resolutionDeadline?.endDate)
        req.input('endDate', normalizedFilter.resolutionDeadline.endDate);

      if (normalizedFilter?.toBook)
        req.input('toBook', `%${normalizedFilter.toBook}%`);

      if (normalizedFilter?.abstractNote)
        req.input('abstractNote', `%${normalizedFilter.abstractNote}%`);

      req.input('offset', sql.Int, offset);
      req.input('limit', sql.Int, limit);
      return req;
    };

    /** ================= COUNT ================= */
    const countSql = `
      SELECT COUNT(DISTINCT d.document_id) AS total
      FROM ${this.dbname}.dbo.incomming_documents d
      ${whereClause}
    `;

    if (query.countOnly === 'true') {
      const rs = await buildRequest().query(countSql);
      return { total: rs.recordset[0]?.total || 0 };
    }

    /** ================= DATA ================= */
    const dataSql = `
      WITH PagedDocs AS (
        SELECT
          d.document_id,
          d.to_book,
          d.receive_date,
          d.abstract_note,
          d.resolution_deadline,
          d.receiver_unit
        FROM ${this.dbname}.dbo.incomming_documents d
        ${whereClause}
        ${orderByInner}
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      )
      SELECT
        p.document_id,
        p.to_book,
        p.receive_date,
        p.abstract_note,
        o.name                                          AS receiverUnitName,
        p.resolution_deadline,
        DATEDIFF(DAY, p.resolution_deadline, GETDATE()) AS dayOverdue,
        assignee.name                                   AS assigneeUserName
      FROM PagedDocs p
      OUTER APPLY (
        SELECT TOP 1 a.receiver
        FROM ${this.dbname}.dbo.audit a
        WHERE a.document_id = p.document_id
          AND a.roleProcess = 'processor'
        ORDER BY a.created_at DESC
      ) a_proc
      LEFT JOIN ${this.dbname}.dbo.users assignee
        ON assignee.id = a_proc.receiver
      LEFT JOIN ${this.dbname}.dbo.organization_units o
        ON o.id = p.receiver_unit
      ${orderByOuter}
    `;

    const [countRs, rowsRs] = await Promise.all([
      buildRequest().query(countSql),
      buildRequest().query(dataSql),
    ]);

    const data = rowsRs.recordset.map((r) => ({
      toBook: r.to_book,
      receiveDate: this.normalizeDateValueDDMMYYYY(r.receive_date),
      abstractNote: r.abstract_note,
      receiverUnit: r.receiverUnitName || null,
      resolutionDeadline: this.normalizeDateValueDDMMYYYY(r.resolution_deadline),
      dayOverdue: Math.max(r.dayOverdue, 0),
      assigneeUser: r.assigneeUserName || null,
    }));

    const total = countRs.recordset[0]?.total || 0;

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async listDocumentsDirective(
    query: ListDocumentsOverDueDto,
    userId: string,
  ) {
    try {
      const isExport = query.isExport === 'true';

      /** ================= PAGINATION ================= */
      let page = Math.max(Number(query.page) || 1, 1);
      let limit = Math.min(Number(query.limit) || 20, 100);
      if (isExport) {
        limit = 9999;
        page = 1;
      }
      const offset = (page - 1) * limit;

      const normalizedFilter = normalizeStatisticsFilterObject(query.filter);

      /** ================= SORT ================= */
      const innerSortFieldMap: Record<string, string> = {
        toBook: 'd.to_book',
        receiveDate: 'd.receive_date',
        abstractNote: 'd.abstract_note',
        status: 'st.stage_status',
        processorFilter: 'ldr.fallback_leader',
        receiverUnits: 'ru.receiver_units',
      };
      const orderByInner =
        'ORDER BY ' +
        this.buildSortClause(query.sort, innerSortFieldMap, 'd.abstract_note ASC');

      const outerSortFieldMap: Record<string, string> = {
        toBook: 'p.to_book',
        receiveDate: 'p.receive_date',
        abstractNote: 'p.abstract_note',
        processorFilter: 'p.fallback_leader',
        receiverUnits: 'p.receiver_units',
        status: 'p.stage_status',
      };
      const orderByOuter =
        'ORDER BY ' +
        this.buildSortClause(query.sort, outerSortFieldMap, 'p.abstract_note ASC');

      const pool = await this.getPool();

      /** ================= PERMISSION ================= */
      const [orgInfo, highestOrder] = await Promise.all([
        this.sqlRepo.getUserOrgUnitInfo(userId),
        this.sqlRepo.getUserHighestGroupOrder(userId),
      ]);
      const { unitId: userOrgUnitId, isCuc, isPhong } = orgInfo;

      // Base: chỉ lấy văn bản active và đã được chuyển chỉ đạo ít nhất 1 lần
      const baseConditions: string[] = [
        `d.status = 1`,
        `d.abstract_note IS NOT NULL`,
        `EXISTS (
          SELECT 1
          FROM ${this.dbname}.dbo.audit a
          WHERE a.document_id = d.document_id
            AND a.stage_status IN ('DA_XU_LY', 'DA_PHAN_CONG')
        )`,
        `EXISTS (
          SELECT 1
          FROM ${this.dbname}.dbo.audit a
          WHERE a.document_id = d.document_id
            AND (
              a.role = 'LANH_DAO_TCT'
              OR a.roleProcess = 'commander'
            )
        )`,
      ];

      const permissionConditions: string[] = [];
      let needUserId = false;
      let needUserOrgUnit = false;

      const scope = this.resolveDataScope(isCuc, isPhong, highestOrder);

      switch (scope) {
        case 'ALL_CUC':
          // Chỉ lấy văn bản gốc (không phải văn bản con được tạo từ parent)
          baseConditions.push(`
            (
              d.parent_doc IS NULL
              OR NOT EXISTS (
                SELECT 1
                FROM ${this.dbname}.dbo.incomming_documents p
                WHERE p.document_id = d.parent_doc
              )
            )
          `);
          break;

        case 'ALL_PHONG':
          permissionConditions.push(`
            EXISTS (
              SELECT 1
              FROM ${this.dbname}.dbo.incomming_documents d_child
              JOIN ${this.dbname}.dbo.audit               a_child ON a_child.document_id = d_child.document_id
              JOIN ${this.dbname}.dbo.users               u_child ON u_child.id          = a_child.receiver
              WHERE d_child.parent_doc = d.document_id
                AND u_child.parent     = @userOrgUnit
            )
          `);
          needUserOrgUnit = true;
          break;

        default:
          permissionConditions.push(`
            EXISTS (
              SELECT 1
              FROM ${this.dbname}.dbo.audit a_check
              WHERE a_check.document_id = d.document_id
                AND (
                  a_check.receiver   = @userId OR
                  a_check.user_id    = @userId OR
                  a_check.created_by = @userId
                )
            )
          `);
          needUserId = true;
          break;
      }

      /** ================= FILTER ================= */
      const filters: string[] = [];

      const startDate = normalizedFilter?.receiveDate?.startDate;
      const endDate = normalizedFilter?.receiveDate?.endDate;

      if (startDate) {
        filters.push(`(
          d.document_date >= @startDate
          OR (d.deadline IS NOT NULL AND d.deadline >= @startDate)
        )`);
      }
      if (endDate) {
        filters.push(`d.document_date < DATEADD(DAY, 1, CAST(@endDate AS DATE))`);
      }

      if (normalizedFilter?.departmentFilter) {
        const units = Array.isArray(normalizedFilter.departmentFilter)
          ? normalizedFilter.departmentFilter
          : [normalizedFilter.departmentFilter];
        if (units.length) {
          const list = units
            .map(id => `'${String(id).replace(/'/g, "''")}'`)
            .join(',');
          filters.push(`(
            EXISTS (
              SELECT 1
              FROM ${this.dbname}.dbo.audit   a_ru
              JOIN ${this.dbname}.dbo.users   u_ru ON u_ru.id = a_ru.receiver
              WHERE a_ru.document_id = d.document_id
                AND a_ru.roleProcess = 'processor'
                AND u_ru.parent IN (${list})
            )
            OR d.receiver_unit IN (${list})
            OR d.sender_unit   IN (${list})
          )`);
        }
      }

      if (normalizedFilter?.status) {
        const statuses = Array.isArray(normalizedFilter.status)
          ? normalizedFilter.status
          : [normalizedFilter.status];
        if (statuses.length) {
          const statusConditions: string[] = [];
          for (const s of statuses) {
            const strCode = String(s).trim();
            switch (strCode) {
              case 'TAO_MOI':
              case 'CREATE':
                statusConditions.push(`tmp.stage_status = 'CREATE'`);
                break;
              case 'DA_HOAN_THANH':
              case 'HOAN_THANH_VAN_BAN':
                statusConditions.push(`tmp.stage_status = 'HOAN_THANH_VAN_BAN'`);
                break;
              case 'VAN_BAN_TRA_LAI':
              case 'TRA_LAI':
                statusConditions.push(`tmp.stage_status = 'TRA_LAI'`);
                break;
              case 'THU_HOI':
                statusConditions.push(`tmp.stage_status = 'THU_HOI'`);
                break;
              case 'CHO_KY_SAO_Y':
              case 'TRINH_KY':
                statusConditions.push(
                  `tmp.stage_status IN ('TRINH_KY', 'DANG_CHO_KY')`,
                );
                break;
              case 'DANG_XU_LY':
              case 'DEFAULT':
                statusConditions.push(`(
                  tmp.stage_status NOT IN (
                    'CREATE', 'HOAN_THANH_VAN_BAN', 'TRA_LAI', 'THU_HOI',
                    'TRINH_KY', 'DANG_CHO_KY'
                  )
                  OR tmp.stage_status IS NULL
                )`);
                break;
              default:
                if (/^[A-Za-z0-9_]+$/.test(strCode)) {
                  statusConditions.push(
                    `tmp.stage_status = '${strCode.replace(/'/g, "''")}'`,
                  );
                }
            }
          }
          filters.push(`
            EXISTS (
              SELECT 1
              FROM (
                SELECT TOP 1 stage_status
                FROM ${this.dbname}.dbo.audit
                WHERE document_id = d.document_id
                ORDER BY created_at DESC
              ) tmp
              WHERE (${statusConditions.join(' OR ')})
            )
          `);
        }
      }

      /** ================= SEARCH ================= */
      const searches: string[] = [];
      if (normalizedFilter?.abstractNote)
        searches.push(`d.abstract_note LIKE @abstractNote`);
      if (normalizedFilter?.directiveComment)
        searches.push(`d.directive_comment LIKE @directiveComment`);

      if (normalizedFilter?.processorFilter) {
        const users = Array.isArray(normalizedFilter.processorFilter)
          ? normalizedFilter.processorFilter
          : [normalizedFilter.processorFilter];
        if (users.length) {
          const list = users
            .map(id => `'${String(id).replace(/'/g, "''")}'`)
            .join(',');
          filters.push(`
            EXISTS (
              SELECT 1
              FROM ${this.dbname}.dbo.audit a_proc
              WHERE a_proc.document_id = d.document_id
                AND a_proc.receiver    IN (${list})
                AND a_proc.roleProcess = 'processor'
            )
          `);
        }
      }

      /** ================= WHERE ================= */
      const whereParts = [...baseConditions, ...permissionConditions];
      if (filters.length) whereParts.push(filters.join(' AND '));
      if (searches.length) whereParts.push(`(${searches.join(' OR ')})`);
      const whereClause = `WHERE ${whereParts.join(' AND ')}`;

      /** ================= REQUEST BUILDER ================= */
      const buildRequest = () => {
        const req = pool.request();

        if (needUserId) req.input('userId', userId);
        if (needUserOrgUnit) req.input('userOrgUnit', userOrgUnitId);

        if (startDate) req.input('startDate', startDate);
        if (endDate) req.input('endDate', endDate);

        if (normalizedFilter?.abstractNote)
          req.input('abstractNote', `%${normalizedFilter.abstractNote}%`);
        if (normalizedFilter?.directiveComment)
          req.input('directiveComment', `%${normalizedFilter.directiveComment}%`);

        req.input('offset', sql.Int, offset);
        req.input('limit', sql.Int, limit);
        return req;
      };

      /** ================= COUNT ================= */
      const countSql = `
        SELECT COUNT(DISTINCT d.document_id) AS total
        FROM ${this.dbname}.dbo.incomming_documents d
        ${whereClause}
      `;

      if (query.countOnly === 'true') {
        const rs = await buildRequest().query(countSql);
        return { total: rs.recordset[0]?.total || 0 };
      }

      /** ================= DATA ================= */
      const dataSql = `
        WITH PagedDocs AS (
          SELECT
            d.document_id,
            d.to_book,
            d.receive_date,
            d.abstract_note,
            st.stage_status,
            ldr.fallback_leader,
            cmt.directive_comment,
            ru.receiver_units
          FROM ${this.dbname}.dbo.incomming_documents d

          -- Trạng thái mới nhất
          OUTER APPLY (
            SELECT TOP 1 a.stage_status
            FROM ${this.dbname}.dbo.audit a
            WHERE a.document_id = d.document_id
            ORDER BY a.created_at DESC
          ) st

          -- Lấy leader: audit record mới nhất của Lãnh đạo
          OUTER APPLY (
            SELECT TOP 1
              a_leader.created_by AS leader_id,
              u.name              AS fallback_leader
            FROM ${this.dbname}.dbo.audit a_leader
            JOIN ${this.dbname}.dbo.users u ON u.id = a_leader.created_by
            WHERE a_leader.document_id = d.document_id
              AND (a_leader.role = 'LANH_DAO_TCT' OR a_leader.roleProcess = 'commander')
            ORDER BY a_leader.id DESC
          ) ldr

          -- Lấy comment mới nhất của leader từ document_comments
          OUTER APPLY (
            SELECT TOP 1
              dc.content AS directive_comment
            FROM ${this.dbname}.dbo.document_comments dc
            WHERE dc.document_id = d.document_id
              AND dc.user_id      = ldr.leader_id
            ORDER BY dc.created_at DESC
          ) cmt

          -- Lấy các đơn vị/người nhận từ leader
          OUTER APPLY (
            SELECT STRING_AGG(ou.display_name, ', ') AS receiver_units
            FROM (
              SELECT DISTINCT
                CASE
                  WHEN a_unit.receiver_unit IS NOT NULL THEN ou_inner.name
                  ELSE COALESCE(ou_user.name, u_unit.name)
                END AS display_name
              FROM ${this.dbname}.dbo.audit a_unit
              LEFT JOIN ${this.dbname}.dbo.organization_units ou_inner
                ON ou_inner.id = a_unit.receiver_unit
              LEFT JOIN ${this.dbname}.dbo.users u_unit
                ON u_unit.id = a_unit.receiver
              LEFT JOIN ${this.dbname}.dbo.organization_units ou_user
                ON ou_user.id = u_unit.parent
              WHERE a_unit.document_id = d.document_id
                AND a_unit.created_by  = ldr.leader_id
                AND CASE
                      WHEN a_unit.receiver_unit IS NOT NULL THEN ou_inner.name
                      ELSE COALESCE(ou_user.name, u_unit.name)
                    END IS NOT NULL
            ) ou
          ) ru

          ${whereClause}
          ${orderByInner}
          OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        )
        SELECT * FROM PagedDocs p
        ${orderByOuter}
      `;


      const [countRs, rowsRs] = await Promise.all([
        buildRequest().query(countSql),
        buildRequest().query(dataSql),
      ]);

      /** ================= MAP ================= */
      const data = rowsRs.recordset.map((r) => ({
        toBook: r.to_book,
        receiveDate: this.normalizeDateValueDDMMYYYY(r.receive_date),
        abstractNote: r.abstract_note,
        directiveLeader: r.fallback_leader || null,
        directiveComment: r.directive_comment || null,
        receiverUnits: r.receiver_units || null,
        status: isExport
          ? mapStatusDirectionLabel(r.stage_status, isExport)
          : mapStatusDirectionLabel(r.stage_status),
      }));

      const total = countRs.recordset[0]?.total || 0;

      return {
        success: true,
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (err) {
      this.logger.error('listDocumentsDirective error', err);
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to fetch directive documents',
      });
    }
  }

  async getStatisticReport(
    query: StatisticReportQueryDto,
    user: any,
  ): Promise<StatisticReportResponseDto> {
    const normalizedFilter = normalizeStatisticsFilterObject(query.filter || {});
    const { month, year, senderUnit } = normalizedFilter;
    const pool = await this.getPool();

    try {
      let startDate: string | undefined;
      let endDate: string | undefined;

      if (month && year) {
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0);
        startDate = startOfMonth.toISOString().split('T')[0];
        endDate = endOfMonth.toISOString().split('T')[0];
      }

      let orgs = await this.getAllOrganizationUnits(pool, user);

      if (senderUnit) {
        const selectedUnitIds = Array.isArray(senderUnit) ? senderUnit : [senderUnit];
        const descendantOrgIds = new Set<string>();

        const allOrgsResult = await pool.request().query(`
          SELECT id, name, mpath FROM ${this.dbname}.dbo.organization_units WHERE status = 1
          UNION ALL
          SELECT id, name, mpath FROM ${this.dbname}.dbo.custom_sender_units WHERE status = 1
        `);
        const allOrgs = allOrgsResult.recordset.map(org => ({
          id: org.id,
          name: org.name,
          mpath: org.mpath || null,
        }));

        for (const unitId of selectedUnitIds) {
          const targetOrg = allOrgs.find((o) => o.id === unitId);
          if (targetOrg) {
            const targetMpath = targetOrg.mpath ?? '';
            const separator = targetMpath.includes('/') ? '/' : '.';
            allOrgs.filter((o) =>
              o.id === unitId || (o.mpath ?? '').startsWith(targetMpath + separator)
            ).forEach(o => descendantOrgIds.add(o.id));
          }
        }

        if (selectedUnitIds.length > 0) {
          orgs = allOrgs.filter(o => descendantOrgIds.has(o.id));
        }
      }

      const orgIds = orgs.map((o) => o.id);
      if (!orgIds.length)
        return { data: [], total: 0, page: Number(query.page), limit: Number(query.limit), totalPages: 0 };

      const documents = await this.getFilteredDocuments({
        pool,
        startDate,
        endDate,
        typeDocument: 'incomming_documents',
        receiverUnits: orgIds,
        select: 'document_id, deadline, receiver_unit',
        assigneeUser: normalizedFilter.assigneeUser,
      });

      if (!documents.length)
        return { data: [], total: 0, page: Number(query.page), limit: Number(query.limit), totalPages: 0 };

      const documentIds = documents.map((d: any) => d.document_id);

      type Doc = { document_id: string; deadline: Date | null; receiver_unit: string | null };

      const documentsByDepartment = new Map<string, Doc[]>();
      for (const doc of documents as Doc[]) {
        if (!doc.receiver_unit) continue;
        if (!documentsByDepartment.has(doc.receiver_unit))
          documentsByDepartment.set(doc.receiver_unit, []);
        documentsByDepartment.get(doc.receiver_unit)!.push(doc);
      }

      const completedAudits = await this.getCompletedAudits(pool, documentIds);
      const completedMap = new Map(completedAudits.map((a: any) => [a.document_id, a.completed_time]));

      const incompletedAssignments = await this.getIncompletedAssignments(pool, documentIds);

      const departmentStats = this.calculateDepartmentStats(
        documents as Doc[],
        completedMap,
        incompletedAssignments,
      );

      const orgMap = new Map(orgs.map((o) => [o.id, o]));

      // Query missing departments from orgMap and add them
      const missingIds: string[] = [];
      for (const [deptId] of departmentStats.entries()) {
        if (!orgMap.has(deptId)) {
          missingIds.push(deptId);
        }
      }

      if (missingIds.length > 0) {
        const missingIdsStr = missingIds.join(',');
        const nameResults = await pool.request()
          .input('missingIds', sql.NVarChar(sql.MAX), missingIdsStr)
          .query(`
            SELECT id, name, mpath FROM ${this.dbname}.dbo.organization_units 
            WHERE id IN (SELECT value FROM STRING_SPLIT(@missingIds, ','))
          `);
        for (const row of nameResults.recordset) {
          orgMap.set(row.id, {
            id: row.id,
            name: row.name,
            mpath: row.mpath || null,
          });
        }
      }

      const allData: any[] = this.buildFinalResult(departmentStats, orgMap);

      const isExport = (query as any).isExport === 'true';
      const pageNum = Math.max(Number(query.page) || 1, 1);
      const limitNum = isExport ? 9999 : Math.min(Number(query.limit) || 20, 100);
      const total = allData.length;

      if ((query as any).countOnly === 'true') return { total } as any;

      // ── In-memory sort — all returned fields ──────────────────────────────────
      const sortFieldMap: Record<string, string> = {
        senderUnit: 'senderUnit',
        total: 'totalReceived',
        onTime: 'onTime',
        late: 'late',
        processing: 'unprocessed',
        onTimeRate: 'onTimeRateRaw',
        lateRate: 'lateRateRaw',
      };
      const sorted = this.applyInMemorySort(allData, (query as any).sort, sortFieldMap);

      const totalPages = Math.ceil(total / limitNum);
      const offsetNum = (pageNum - 1) * limitNum;
      const paginatedData = sorted.slice(offsetNum, offsetNum + limitNum);

      return { data: paginatedData, total, page: pageNum, limit: limitNum, totalPages };

    } catch (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }
  }

  async getStatisticReportOfSenderUnit(
    query: StatisticReportSenderUnitQueryDto,
    user: any,
  ): Promise<any> {
    const normalizedFilter = normalizeStatisticsFilterObject(query.filter || {});
    const { senderUnit, documentType, receiveDate, createdDate } = normalizedFilter;
    const pool = await this.getPool();

    try {
      let startDate: string | undefined;
      let endDate: string | undefined;
      let dateField = 'receive_date';

      if (receiveDate) {
        startDate = receiveDate.startDate;
        endDate = receiveDate.endDate;
        dateField = 'receive_date';
      } else if (createdDate) {
        startDate = createdDate.startDate;
        endDate = createdDate.endDate;
        dateField = 'created_at';
      }

      let orgs = await this.getAllOrganizationUnits(pool, user);

      if (senderUnit) {
        const selectedUnitIds = Array.isArray(senderUnit) ? senderUnit : [senderUnit];

        const allOrgsResult = await pool.request().query(`
          SELECT id, name, mpath FROM ${this.dbname}.dbo.organization_units WHERE status = 1
          UNION ALL
          SELECT id, name, mpath FROM ${this.dbname}.dbo.custom_sender_units WHERE status = 1
        `);
        const allOrgs = allOrgsResult.recordset.map(org => ({
          id: org.id,
          name: org.name,
          mpath: org.mpath || null,
        }));

        orgs = allOrgs.filter(o => selectedUnitIds.includes(o.id));
      }

      const orgIds = orgs.map((o) => o.id);
      if (!orgIds.length)
        return { data: [], total: 0, page: Number(query.page), limit: Number(query.limit), totalPages: 0 };

      const documents = await this.getFilteredDocuments({
        pool,
        startDate,
        endDate,
        typeDocument: 'incomming_documents',
        senderUnit: orgIds,
        select: 'document_id, sender_unit, document_type',
        documentType,
        dateField,
        assigneeUser: normalizedFilter.assigneeUser,
        useWorkingPeriodIntersection: !!(receiveDate || createdDate),
      });

      const isExport = (query as any).isExport === 'true';
      const pageNum = Math.max(Number(query.page) || 1, 1);
      const limitNum = isExport ? 9999 : Math.min(Number(query.limit) || 20, 100);

      type Doc = { document_id: string; sender_unit: string | null; document_type: string | null };

      const documentsByDepartment = new Map<string, Doc[]>();
      for (const doc of documents as Doc[]) {
        if (!doc.sender_unit) continue;
        if (!documentsByDepartment.has(doc.sender_unit))
          documentsByDepartment.set(doc.sender_unit, []);
        documentsByDepartment.get(doc.sender_unit)!.push(doc);
      }

      const VALUE_GROUP_MAP: Record<string, IncomingDocGroup> = {
        CongvanDen: IncomingDocGroup.CONG_VAN,
        QuyetdinhDen: IncomingDocGroup.QUYET_DINH,
        ThongbaoDen: IncomingDocGroup.THONG_BAO,
        BaocaoDen: IncomingDocGroup.BAO_CAO,
      };

      const code = await this.crmSourcesService.findByCode('S19');
      const valueToGroupMap = new Map<string, IncomingDocGroup>();
      code?.items?.forEach((item: any) => {
        valueToGroupMap.set(
          item.value,
          VALUE_GROUP_MAP[item.value] ?? IncomingDocGroup.KHAC,
        );
      });

      const departmentStats: DepartmentStatisticSenderUnitDto[] = [];

      for (const org of orgs) {
        const docs = documentsByDepartment.get(org.id) || [];
        const stats = {
          id: org.id,
          senderUnit: org.name,
          total: docs.length,
          officialLetter: 0,
          decision: 0,
          notification: 0,
          report: 0,
          other: 0,
        };

        for (const doc of docs) {
          const group = doc.document_type
            ? (valueToGroupMap.get(doc.document_type) ?? IncomingDocGroup.KHAC)
            : IncomingDocGroup.KHAC;

          switch (group) {
            case IncomingDocGroup.CONG_VAN: stats.officialLetter++; break;
            case IncomingDocGroup.QUYET_DINH: stats.decision++; break;
            case IncomingDocGroup.THONG_BAO: stats.notification++; break;
            case IncomingDocGroup.BAO_CAO: stats.report++; break;
            default: stats.other++; break;
          }
        }

        departmentStats.push(stats);
      }

      if ((query as any).countOnly === 'true')
        return { total: departmentStats.length };

      // ── In-memory sort — all returned fields ──────────────────────────────────
      // Default: mpath order (hierarchy); sort param overrides
      const sortFieldMap: Record<string, string> = {
        senderUnit: 'senderUnit',
        total: 'total',
        officialLetter: 'officialLetter',
        decision: 'decision',
        notification: 'notification',
        report: 'report',
        other: 'other',
      };

      let sortedStats: DepartmentStatisticSenderUnitDto[];
      if ((query as any).sort) {
        // User specified sort — apply it
        sortedStats = this.applyInMemorySort(
          departmentStats,
          (query as any).sort,
          sortFieldMap,
        ) as DepartmentStatisticSenderUnitDto[];
      } else {
        // Default: sort by mpath for hierarchical display
        const mpathLookup = new Map(orgs.map((o) => [o.id, o.mpath ?? '']));
        sortedStats = [...departmentStats].sort((a, b) =>
          (mpathLookup.get(a.id) ?? '').localeCompare(mpathLookup.get(b.id) ?? ''),
        );
      }

      const total = sortedStats.length;
      const totalPages = Math.ceil(total / limitNum);
      const offsetNum = (pageNum - 1) * limitNum;
      const paginatedData = sortedStats.slice(offsetNum, offsetNum + limitNum);

      return { data: paginatedData, total, page: pageNum, limit: limitNum, totalPages };

    } catch (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }
  }
}
