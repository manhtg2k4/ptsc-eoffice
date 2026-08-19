import { BadRequestException, forwardRef, HttpException, HttpStatus, Inject, Injectable, InternalServerErrorException, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import * as FormData from 'form-data';
import { RuntimeDbService } from 'src/bpmn/runtime-dbmssql.service';
import { DocumentPolicy } from './policies/document.policy';
import { DocumentRow, MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { stageStatusDoc, stageStatusMapV2 } from 'src/variable/CONST_STATUS';
import { FeatureManagementEntity, StatusFeature } from 'src/feature-management/feature-management.entity';
import { In, Repository, DataSource } from 'typeorm';
import { OutgoingDocumentEntity } from './entities/outgoing-document.entity';
import { BookDocumentEntity } from 'src/book-documents/entities/book-document.entity';
import { STATUS } from 'src/variables/CONST_STATUS';
import { getMssqlPool } from 'src/database/mssql.pool';
import * as sql from 'mssql';
import { ConfigService } from '@nestjs/config';
import { ListDocumentsDto, ListDocumentsNoTypeDto } from 'src/documents/dto/list-documents.dto';
import { buildDocumentCriteriaHelper, buildDocumentCriteriaReplyEvictHelper, calcDeadlineColor, dateKeys, extractTextFromHtml, mapActionToLabel, mapActionToLabelCommon, mapDocKeysOutgoing, normalizeDateValueDDMMYYYY, normalizeDateValueHHmmDDMMYYYY, normalizeStatisticsFilterObject, parseSort, parseStatisticsFilter, parseStatisticsSort, sortByStatusCode } from 'src/documents/helpers/build.filter';
import { AuditRow, WorkItemRow } from 'src/documents/incomming-document/dto/recipients.dto';
import { UsersService } from 'src/users/users.service';
import BpmnEngineService from 'src/bpmn/bpmn-engine.service';
import { FilesManagementService } from 'src/files-managerment/files-management-mssql.service';
import { ConfigurationService } from 'src/view-config/configuration.service';
import { VAN_THU_ALL } from 'src/variables/CONST_STATUS';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { StatisticProcessSignQueryDto } from './dto/statistic-process-sign.dto';
import { StatisticReportProcessResponseDto } from './dto/statistic-process-sign-respone.dto';

let globalCrmCache: any[] | null = null;
// Global cache moved to class instance
import { IncomingService } from 'src/documents/incomming-document/incoming.service';
import { ListReportOutgoingByTimeDto } from 'src/documents/dto/list-reports-documents-by-time.dto';
import { OutgoingStatisticsBySignerDto } from './dto/statistics-by-signer.dto';
import { getAllNodeExtensionProperties } from 'src/utils/util';
import { FilesRepository } from 'src/files-managerment/repositories/files.repository';
import { NotificationService } from 'src/notifycation/notification.service';
import { NotificationType } from 'src/notifycation/notification.enum';
import { MailService } from 'src/mail';
import { GroupUserInDocumentService } from 'src/group-users/group-users-in-document.service';
import { validateAndParseSortParam, getDtoKeys, getEntityKeys } from 'src/utils/sort-validator.util';
import { CreateOutgoingDto } from './dto/create-outgoing-document.dto';
import { OUTGOING_DRAFT_SIGNER_TYPES, UpdateDraftSignersDto } from './dto/update-draft-signers.dto';
import { checkAdminPermission } from 'src/common/guards/admin-check.helper';
import { SpanStatusCode, trace } from '@opentelemetry/api';


type BpmnCacheData = {
  process: any;
  indexes: any;
  bpmnXML?: string;
};

type CachedOutgoingActionPayload = {
  latestAuditId: number | null;
  workItem?: any;
  node: any;
  availableActions: any[];
  flags: Record<string, any>;
};

type OutgoingActionCacheKeyParts = {
  userId: string;
  version: string;
  nodeId: string;
  role?: string;
  assignee?: string;
  statusCode?: string;
};

const ENABLE_SIGNER_PROCESS_API_LOGS = false;
const ENABLE_OUTGOING_DETAIL_PERF_LOGS = false;

@Injectable()
export class OutgoingDocumentsService {
  private pool: sql.ConnectionPool | null = null;
  private dbname: string;
  private readonly logger = new Logger(OutgoingDocumentsService.name);
  private readonly tracer = trace.getTracer('doffice-be.outgoing-documents');

  private async traceProcessStep<T>(
    name: string,
    attributes: Record<string, string | number | boolean>,
    operation: () => Promise<T>,
  ): Promise<T> {
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

  // In-memory cache for users, orgs, agencies (Redis backup)
  private usersCache: Map<string, { data: any; expires: number }> = new Map();
  private orgsCache: Map<string, { data: any; expires: number }> = new Map();
  private agenciesCache: Map<string, { data: any; expires: number }> = new Map();
  private userProcessRolesCache: Map<string, { data: any; expires: number }> = new Map();
  private userGroupIdsCache: Map<string, { data: string[]; expires: number }> = new Map();
  private outgoingStateCache: Map<string, { data: any; expires: number }> = new Map();
  private senderUnitDetailCache: Map<string, { data: any; expires: number }> = new Map();
  private userParentCache: Map<string, { data: string | null; expires: number }> = new Map();
  private outgoingWorkItemsCache: Map<string, { data: any[]; expires: number }> = new Map();
  private readonly cacheLookupInflight = new Map<string, Promise<any | null>>();
  private readonly detailLookupInflight = new Map<string, Promise<any>>();
  private readonly actionsLookupInflight = new Map<string, Promise<any | null>>();
  private readonly userProcessRolesInflight = new Map<string, Promise<any>>();
  private readonly userGroupIdsInflight = new Map<string, Promise<string[]>>();
  private readonly CACHE_TTL = 3 * 60 * 1000; // 3 minutes
  private readonly OUTGOING_STATE_CACHE_TTL = 3 * 60 * 1000; // 3 minutes
  private readonly LOOKUP_CACHE_TTL = 3 * 60 * 1000; // 3 minutes
  private readonly OUTGOING_DETAIL_CACHE_TTL = 3 * 60 * 1000; // deprecated: kept only for helper compatibility

  // Global cache for computeAvailableActions (in-memory, not Redis)
  private actionsGlobalCache = new Map<string, { data: any; expires: number }>();
  private readonly ACTIONS_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

  constructor(
    @Inject('BPMN_RUNTIME') private readonly runtime: any,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => RuntimeDbService))
    private readonly runtimeService: RuntimeDbService,
    @Inject('MSSQL_REPO') private readonly sqlRepo: MSSQLRepository,
    private readonly sqlsvRepo: SQLSVRepository,
    @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
    private readonly featureManagementRepo: Repository<FeatureManagementEntity>,
    @InjectRepository(OutgoingDocumentEntity, 'mssqlConnection')
    private readonly outgoingRepo: Repository<OutgoingDocumentEntity>,
    @InjectRepository(BookDocumentEntity, 'mssqlConnection')
    private readonly bookRepo: Repository<BookDocumentEntity>,
    private readonly bpmnEngine: BpmnEngineService,
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
    @Inject(forwardRef(() => FilesManagementService))
    private readonly fileService: FilesManagementService,
    private readonly configurationService: ConfigurationService,
    private readonly incomingService: IncomingService,
    private readonly filesRepository: FilesRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
    private readonly mailService: MailService,
    private readonly groupUserInDocumentService: GroupUserInDocumentService,
    @InjectDataSource('mssqlConnection') private readonly dataSource: DataSource,
    @Inject('REDIS_CLIENT') private readonly redisClient: any,

  ) { }

  // ========== CACHE HELPERS ==========
  private async getFromCache<T>(cache: Map<string, { data: T; expires: number }>, key: string): Promise<T | null> {
    const entry = cache.get(key);
    if (entry && entry.expires > Date.now()) {
      return entry.data;
    }
    const redisKey = `outgoing_map:${key}`;
    const inflight = this.cacheLookupInflight.get(redisKey);
    if (inflight) {
      return inflight as Promise<T | null>;
    }

    const pending = (async () => {
      try {
        const cached = await this.redisClient?.get(redisKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          cache.set(key, { data: parsed, expires: Date.now() + this.CACHE_TTL });
          return parsed as T;
        }
      } catch (e) { /* ignore redis errors */ }
      return null;
    })();

    this.cacheLookupInflight.set(redisKey, pending);
    try {
      return await pending;
    } finally {
      this.cacheLookupInflight.delete(redisKey);
    }
  }

  private async setCache<T>(cache: Map<string, { data: T; expires: number }>, key: string, data: T): Promise<void> {
    cache.set(key, { data, expires: Date.now() + this.CACHE_TTL });
    try {
      await this.redisClient?.set(`outgoing_map:${key}`, JSON.stringify(data), 'PX', this.CACHE_TTL);
    } catch (e) { /* ignore redis errors */ }
  }

  private async getSharedCache<T>(
    cache: Map<string, { data: T; expires: number }>,
    key: string,
    ttlMs: number,
  ): Promise<T | null> {
    const entry = cache.get(key);
    if (entry && entry.expires > Date.now()) {
      return entry.data;
    }

    const redisKey = `outgoing_map:${key}`;
    const inflight = this.cacheLookupInflight.get(redisKey);
    if (inflight) {
      return inflight as Promise<T | null>;
    }

    const pending = (async () => {
      try {
        const cached = await this.redisClient?.get(redisKey);
        if (!cached) return null;

        const parsed = JSON.parse(cached);
        cache.set(key, { data: parsed, expires: Date.now() + ttlMs });
        return parsed as T;
      } catch {
        return null;
      }
    })();

    this.cacheLookupInflight.set(redisKey, pending);
    try {
      return await pending;
    } finally {
      this.cacheLookupInflight.delete(redisKey);
    }
  }

  private async setSharedCache<T>(
    cache: Map<string, { data: T; expires: number }>,
    key: string,
    data: T,
    ttlMs: number,
  ): Promise<void> {
    cache.set(key, { data, expires: Date.now() + ttlMs });
    try {
      await this.redisClient?.set(`outgoing_map:${key}`, JSON.stringify(data), 'PX', ttlMs);
    } catch { /* ignore redis errors */ }
  }

  private async getOutgoingStateCached(documentId: string): Promise<any | null> {
    const normalizedId = String(documentId || '').trim();
    if (!normalizedId) return null;

    const cacheKey = `detail:state:${normalizedId}`;
    const cached = await this.getSharedCache<any>(
      this.outgoingStateCache,
      cacheKey,
      this.OUTGOING_STATE_CACHE_TTL,
    );
    if (cached) {
      return cached;
    }

    const state = await this.sqlRepo.getOutgoingCurrentState(normalizedId, true);
    if (state) {
      await this.setSharedCache(
        this.outgoingStateCache,
        cacheKey,
        state,
        this.OUTGOING_STATE_CACHE_TTL,
      );
    }

    return state;
  }

  private buildRevisionCacheKey(baseKey: string, latestAuditId?: number | null): string {
    return `${baseKey}:audit:${latestAuditId ?? 'null'}`;
  }

  private async getUserParentCached(userId: string, pool: sql.ConnectionPool): Promise<string | null> {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) return null;

    const cacheKey = `user-parent:${normalizedUserId}`;
    const cached = await this.getSharedCache<string | null>(
      this.userParentCache,
      cacheKey,
      this.LOOKUP_CACHE_TTL,
    );
    if (cached !== null) {
      return cached;
    }

    const userRes = await pool.request()
      .input('userId', sql.NVarChar(100), normalizedUserId)
      .query(`SELECT id, parent AS parentId FROM ${this.dbname}.dbo.users WHERE id = @userId`);
    const receiverUnit = userRes.recordset[0]?.parentId || null;
    await this.setSharedCache(this.userParentCache, cacheKey, receiverUnit, this.LOOKUP_CACHE_TTL);
    return receiverUnit;
  }

  private async getOpenWorkItemsCached(
    documentId: string,
    latestAuditId: number | null,
    pool: sql.ConnectionPool,
  ): Promise<any[]> {
    const normalizedDocumentId = String(documentId || '').trim();
    if (!normalizedDocumentId) return [];

    const cacheKey = this.buildRevisionCacheKey(`work-items:${normalizedDocumentId}`, latestAuditId);
    const cached = await this.getSharedCache<any[]>(
      this.outgoingWorkItemsCache,
      cacheKey,
      this.CACHE_TTL,
    );
    if (cached) {
      return cached;
    }

    const workItemsResult = await pool.request()
      .input('documentId', sql.NVarChar(100), normalizedDocumentId)
      .query(`
        SELECT wi.id, wi.document_id, wi.node_id, wi.role, wi.assignee_user_id, wi.node_type, wi.state, wi.created_at, wi.bpmn_version
        FROM work_items wi
        WHERE wi.document_id = @documentId
          AND wi.state = 'open'
        ORDER BY wi.created_at DESC
      `);

    const rows = workItemsResult.recordset || [];
    await this.setSharedCache(this.outgoingWorkItemsCache, cacheKey, rows, this.CACHE_TTL);
    return rows;
  }

  private buildOutgoingDetailCacheKey(
    documentId: string,
    userId: string,
    roles: string[],
    isAuthority?: string,
    bpmnVersionFilter?: string,
    latestAuditId?: string | number | null,
  ): string {
    const normalizedRoles = [...new Set((roles || []).filter(Boolean))].sort().join(',');
    return [
      'detail:full',
      String(documentId || '').trim(),
      String(userId || '').trim(),
      normalizedRoles,
      String(isAuthority || '').trim(),
      String(bpmnVersionFilter || '').trim(),
      String(latestAuditId ?? 'null').trim(),
    ].join(':');
  }

  private async getOutgoingDetailCached(cacheKey: string): Promise<any | null> {
    return this.getSharedCache<any>(
      this.outgoingStateCache,
      cacheKey,
      this.OUTGOING_DETAIL_CACHE_TTL,
    );
  }

  private async setOutgoingDetailCached(cacheKey: string, data: any): Promise<void> {
    await this.setSharedCache(
      this.outgoingStateCache,
      cacheKey,
      data,
      this.OUTGOING_DETAIL_CACHE_TTL,
    );
  }

  private async attachExecutionModeToOutgoingDetail(documentId: string, result: any): Promise<any> {
    if (!result?.document) return result;

    const signers = await this.sqlRepo.getAllSignersFromOutgoingDocumentUsers(documentId);
    const executionModeBySignerType = new Map<string, Map<string, string>>();

    for (const entry of signers) {
      const signerType = String(entry?.signer_type || '').trim();
      const signerUserId = String(entry?.user_id || '').trim();
      const executionMode = String(entry?.execution_mode || '').trim();

      if (!signerType || !signerUserId || !executionMode) continue;

      if (!executionModeBySignerType.has(signerType)) {
        executionModeBySignerType.set(signerType, new Map<string, string>());
      }
      executionModeBySignerType.get(signerType)!.set(signerUserId, executionMode);
    }

    const signerFields = [
      'confirmer',
      'paraphSigner',
      'officialSigner1',
      'officialSigner2',
      'officialSigner3',
    ];

    for (const signerType of signerFields) {
      if (!Array.isArray(result.document[signerType])) continue;

      const executionModeMap = executionModeBySignerType.get(signerType) || new Map<string, string>();
      result.document[signerType] = result.document[signerType].map((user: any) => {
        const mappedUserId = String(user?.id || user?._id || user?.userId || '').trim();
        return {
          ...user,
          signUserType: signerType,
          executionMode: executionModeMap.get(mappedUserId) ?? null,
        };
      });
    }

    return result;
  }

  private cloneDetailResult<T>(data: T): T {
    return JSON.parse(JSON.stringify(data));
  }

  // Inflight chỉ "gộp" các request đang chạy đồng thời có cùng cacheKey trong cùng 1 instance NodeJS.
  // - Request đầu tiên sẽ thực thi builder() để đọc DB/tính detail.
  // - Request đến sau, nếu trùng cacheKey, sẽ await lại đúng Promise đang chạy thay vì query lại lần nữa.
  // - Khi Promise hoàn tất thì key bị xóa khỏi Map, nên request tiếp theo sẽ chạy vòng tính toán mới.
  // Lưu ý:
  // - Đây KHÔNG phải distributed lock, nên nhiều pod/process vẫn có thể cùng query song song.
  // - Hiệu quả phụ thuộc vào cách build cacheKey. Hiện tại key có documentId + userId + roles + isAuthority
  //   + bpmnVersionFilter + latestAuditId, nên chỉ request trùng đúng "ngữ cảnh detail" mới được gộp.
  // - Vì vậy cơ chế này chủ yếu chống spam/click trùng của cùng một context; user khác hoặc quyền khác sẽ tách luồng riêng.
  private async runWithDetailInflight<T>(
    cacheKey: string,
    builder: () => Promise<T>,
  ): Promise<T> {
    const inflight = this.detailLookupInflight.get(cacheKey);
    if (inflight) {
      return await inflight as T;
    }

    const pending = builder();
    this.detailLookupInflight.set(cacheKey, pending);
    try {
      return await pending as T;
    } finally {
      this.detailLookupInflight.delete(cacheKey);
    }
  }

  private async getSenderUnitDetailCached(senderUnitVal: any, pool: sql.ConnectionPool): Promise<any | null> {
    let unitId = '';
    if (typeof senderUnitVal === 'string') {
      unitId = senderUnitVal.trim();
    } else if (senderUnitVal && typeof senderUnitVal === 'object') {
      unitId = String(senderUnitVal.id ?? senderUnitVal._id ?? senderUnitVal.value ?? '').trim();
    }

    if (!unitId || unitId.toLowerCase() === 'null' || unitId.toLowerCase() === 'undefined') {
      return null;
    }

    const cacheKey = `sender-unit:${unitId}`;
    const cached = await this.getSharedCache<any>(
      this.senderUnitDetailCache,
      cacheKey,
      this.LOOKUP_CACHE_TTL,
    );
    if (cached) {
      return cached;
    }

    try {
      const req = pool.request();
      req.input('unitId', sql.NVarChar(100), unitId);

      const result = await req.query(`
        SELECT TOP 1
          src.id,
          src.name,
          src.code,
          src.type,
          src.phoneNumber,
          src.email,
          src.leader,
          src.position,
          src.address,
          src.description,
          src.status,
          src.mpath,
          src.parentId,
          src.createdAt,
          src.updatedAt,
          src.[order],
          src.nameEn,
          src.blockId,
          src.remark
        FROM (
          SELECT
            ou.id,
            ou.name,
            ou.code,
            ou.type,
            ou.phone_number AS phoneNumber,
            ou.email,
            ou.leader,
            ou.position,
            ou.address,
            ou.description,
            ou.status,
            ou.mpath,
            ou.parentId,
            ou.created_at AS createdAt,
            ou.updated_at AS updatedAt,
            ou.[order],
            ou.name_en AS nameEn,
            ou.block_id AS blockId,
            ou.remark,
            1 AS priority
          FROM ${this.dbname}.dbo.organization_units ou
          WHERE ou.id = @unitId

          UNION ALL

          SELECT
            csu.id,
            csu.name,
            csu.code,
            'CUSTOM' AS type,
            NULL AS phoneNumber,
            NULL AS email,
            NULL AS leader,
            NULL AS position,
            NULL AS address,
            NULL AS description,
            csu.status,
            NULL AS mpath,
            CONVERT(nvarchar(100), csu.parent_id) AS parentId,
            csu.created_at AS createdAt,
            csu.updated_at AS updatedAt,
            0 AS [order],
            csu.name AS nameEn,
            NULL AS blockId,
            NULL AS remark,
            2 AS priority
          FROM ${this.dbname}.dbo.custom_sender_units csu
          WHERE csu.id = @unitId
        ) src
        ORDER BY src.priority ASC
      `);

      const unit = result.recordset?.[0];
      if (!unit) {
        return null;
      }

      const normalized = {
        id: unit.id,
        name: unit.name,
        code: unit.code,
        type: unit.type ?? null,
        phoneNumber: unit.phoneNumber ?? null,
        email: unit.email ?? null,
        leader: unit.leader ?? null,
        position: unit.position ?? null,
        address: unit.address ?? null,
        description: unit.description ?? null,
        status: unit.status ?? null,
        mpath: unit.mpath ?? null,
        parentId: unit.parentId ?? null,
        createdAt: unit.createdAt ? new Date(unit.createdAt).toISOString() : null,
        updatedAt: unit.updatedAt ? new Date(unit.updatedAt).toISOString() : null,
        order: unit.order ?? 0,
        nameEn: unit.nameEn ?? null,
        blockId: unit.blockId ?? null,
        remark: unit.remark ?? null,
        _id: unit.id,
      };

      await this.setSharedCache(
        this.senderUnitDetailCache,
        cacheKey,
        normalized,
        this.LOOKUP_CACHE_TTL,
      );
      return normalized;
    } catch (err) {
      this.logger.error(`[getSenderUnitDetailCached] Lookup failed for senderUnitId ${unitId}: ${err.message}`);
      return null;
    }
  }

  private async getFromCacheBatch<T>(
    cache: Map<string, { data: T; expires: number }>,
    keys: string[],
  ): Promise<Map<string, T>> {
    const now = Date.now();
    const result = new Map<string, T>();
    const missingKeys: string[] = [];

    for (const key of [...new Set(keys.filter(Boolean))]) {
      const entry = cache.get(key);
      if (entry && entry.expires > now) {
        result.set(key, entry.data);
      } else {
        missingKeys.push(key);
      }
    }

    if (!missingKeys.length) {
      return result;
    }

    const pendingKeys = new Map<string, Promise<any | null>>();
    const redisKeysToFetch: string[] = [];
    const redisKeyToCacheKey = new Map<string, string>();

    for (const key of missingKeys) {
      const redisKey = `outgoing_map:${key}`;
      const inflight = this.cacheLookupInflight.get(redisKey);
      if (inflight) {
        pendingKeys.set(key, inflight);
      } else {
        redisKeysToFetch.push(redisKey);
        redisKeyToCacheKey.set(redisKey, key);
      }
    }

    if (redisKeysToFetch.length) {
      const fetchPromise = (async () => {
        try {
          if (typeof this.redisClient?.mget === 'function') {
            const rawValues = await this.redisClient.mget(...redisKeysToFetch);
            return Array.isArray(rawValues) ? rawValues : [];
          }

          return await Promise.all(redisKeysToFetch.map((redisKey: string) => this.redisClient?.get(redisKey)));
        } catch {
          return redisKeysToFetch.map(() => null);
        }
      })();

      redisKeysToFetch.forEach((redisKey, index) => {
        const cacheKey = redisKeyToCacheKey.get(redisKey)!;
        const pending = fetchPromise.then((values: any[]) => {
          const raw = values?.[index] ?? null;
          if (!raw) return null;
          try {
            const parsed = JSON.parse(raw);
            cache.set(cacheKey, { data: parsed, expires: Date.now() + this.CACHE_TTL });
            return parsed;
          } catch {
            return null;
          }
        });
        this.cacheLookupInflight.set(redisKey, pending);
        pendingKeys.set(cacheKey, pending);
      });
    }

    try {
      const resolved = await Promise.all(
        Array.from(pendingKeys.entries()).map(async ([key, promise]) => [key, await promise] as const),
      );
      for (const [key, value] of resolved) {
        if (value) {
          result.set(key, value as T);
        }
      }
    } finally {
      for (const redisKey of redisKeysToFetch) {
        this.cacheLookupInflight.delete(redisKey);
      }
    }

    return result;
  }

  private async setCacheBatch<T>(
    cache: Map<string, { data: T; expires: number }>,
    entries: Array<{ key: string; data: T }>,
  ): Promise<void> {
    if (!entries.length) return;

    const uniqueEntries = new Map<string, T>();
    for (const entry of entries) {
      if (entry?.key) {
        uniqueEntries.set(entry.key, entry.data);
      }
    }

    for (const [key, data] of uniqueEntries.entries()) {
      cache.set(key, { data, expires: Date.now() + this.CACHE_TTL });
    }

    try {
      if (typeof this.redisClient?.multi === 'function') {
        const multi = this.redisClient.multi();
        for (const [key, data] of uniqueEntries.entries()) {
          multi.set(`outgoing_map:${key}`, JSON.stringify(data), 'PX', this.CACHE_TTL);
        }
        await multi.exec();
        return;
      }

      await Promise.all(
        Array.from(uniqueEntries.entries()).map(([key, data]) =>
          this.redisClient?.set(`outgoing_map:${key}`, JSON.stringify(data), 'PX', this.CACHE_TTL),
        ),
      );
    } catch (e) { /* ignore redis errors */ }
  }

  private async getMsPool(): Promise<sql.ConnectionPool> {
    if (this.pool?.connected) {
      if (ENABLE_SIGNER_PROCESS_API_LOGS) {
        this.logger.log('[MSSQL] reuse connected pool');
      }
      return this.pool;
    }
    if (this.pool && !this.pool.connected && !this.pool.connecting) {
      if (ENABLE_SIGNER_PROCESS_API_LOGS) {
        this.logger.warn('[MSSQL] Pool disconnected, attempting to reconnect...');
      }
      try {
        await this.pool.connect();
        if (ENABLE_SIGNER_PROCESS_API_LOGS) {
          this.logger.log('[MSSQL] reconnect existing pool success');
        }
        return this.pool;
      } catch (err) {
        this.logger.error('[MSSQL] Reconnect failed:', err as any);
        this.pool = null;
      }
    }
    if (ENABLE_SIGNER_PROCESS_API_LOGS) {
      this.logger.warn('[MSSQL] creating new pool');
    }
    this.pool = await getMssqlPool(this.configService);
    return this.pool;
  }

  private async getSqlUserRoleCached(
    userId?: string,
    processKey?: string,
  ): Promise<{ roles: string[]; userRoles: string[] }> {
    const normalizedUserId = typeof userId === 'string' ? userId.trim() : '';
    const normalizedProcessKey = typeof processKey === 'string' ? processKey.trim() : '';
    if (!normalizedUserId || !normalizedProcessKey) {
      return { roles: [''], userRoles: [] };
    }

    const cacheKey = `${normalizedUserId}::${normalizedProcessKey}`;
    const cached = this.userProcessRolesCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    const inflight = this.userProcessRolesInflight.get(cacheKey);
    if (inflight) {
      return inflight;
    }

    const pending = this.sqlRepo
      .getUserRole(normalizedUserId, normalizedProcessKey)
      .then((data) => {
        const normalized = data || { roles: [''], userRoles: [] };
        this.userProcessRolesCache.set(cacheKey, {
          data: normalized,
          expires: Date.now() + this.CACHE_TTL,
        });
        return normalized;
      })
      .catch(() => ({ roles: [''], userRoles: [] }));

    this.userProcessRolesInflight.set(cacheKey, pending);
    try {
      return await pending;
    } finally {
      this.userProcessRolesInflight.delete(cacheKey);
    }
  }

  private async getUserGroupIdsCached(userId?: string): Promise<string[]> {
    const normalizedUserId = typeof userId === 'string' ? userId.trim() : '';
    if (!normalizedUserId) {
      return [];
    }

    const cached = this.userGroupIdsCache.get(normalizedUserId);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    const inflight = this.userGroupIdsInflight.get(normalizedUserId);
    if (inflight) {
      return inflight;
    }

    const pending = (async () => {
      const pool = await this.getMsPool();
      const res = await pool.request()
        .input('userId', sql.NVarChar(255), normalizedUserId)
        .query(`SELECT group_user_id FROM ${this.dbname}.dbo.user_group_users WHERE user_id = @userId`);

      const groupIds = (res.recordset || [])
        .map((row: any) => row?.group_user_id)
        .filter((id: any): id is string => typeof id === 'string' && id.trim().length > 0);

      this.userGroupIdsCache.set(normalizedUserId, {
        data: groupIds,
        expires: Date.now() + this.CACHE_TTL,
      });

      return groupIds;
    })().catch(() => []);

    this.userGroupIdsInflight.set(normalizedUserId, pending);
    try {
      return await pending;
    } finally {
      this.userGroupIdsInflight.delete(normalizedUserId);
    }
  }

  private async getUsersByIdsCached(userIds: string[]): Promise<Map<string, string>> {
    const pool = await this.getMsPool();
    const result = new Map<string, string>();
    if (!userIds.length) return result;

    const validIds = [...new Set(userIds.map(id => String(id).trim().toLowerCase()).filter(Boolean))];
    if (!validIds.length) return result;

    const cacheKeys = validIds.map((id) => `user:${id}`);
    const cachedUsers = await this.getFromCacheBatch<{ name?: string; username?: string }>(this.usersCache, cacheKeys);
    const uncachedIds: string[] = [];
    for (const id of validIds) {
      const cached = cachedUsers.get(`user:${id}`);
      if (cached) {
        result.set(id, cached.name || cached.username || id);
      } else {
        uncachedIds.push(id);
      }
    }

    if (uncachedIds.length > 0) {
      const idsCsv = uncachedIds.join(',');
      const res = await pool.request()
        .input('userIds', sql.NVarChar(sql.MAX), idsCsv)
        .query(`SELECT id, name, username FROM users WHERE id IN (SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(@userIds, ','))`);

      const cacheEntries: Array<{ key: string; data: { name: string; username: string } }> = [];
      for (const row of res.recordset) {
        const id = String(row.id).trim().toLowerCase();
        const name = row.name || row.username || id;
        result.set(id, name);
        cacheEntries.push({ key: `user:${id}`, data: { name, username: row.username } });
      }
      await this.setCacheBatch(this.usersCache, cacheEntries);
    }

    return result;
  }

  private async getOrgsByIdsCached(orgIds: string[]): Promise<Map<string, string>> {
    const pool = await this.getMsPool();
    const result = new Map<string, string>();
    if (!orgIds.length) return result;

    const validIds = [...new Set(orgIds.map(id => String(id).trim().toLowerCase()).filter(Boolean))];
    if (!validIds.length) return result;

    const cacheKeys = validIds.map((id) => `org:${id}`);
    const cachedOrgs = await this.getFromCacheBatch<{ name: string }>(this.orgsCache, cacheKeys);
    const uncachedIds: string[] = [];
    for (const id of validIds) {
      const cached = cachedOrgs.get(`org:${id}`);
      if (cached) {
        result.set(id, cached.name);
      } else {
        uncachedIds.push(id);
      }
    }

    if (uncachedIds.length > 0) {
      const idsCsv = uncachedIds.join(',');
      const res = await pool.request()
        .input('unitIds', sql.NVarChar(sql.MAX), idsCsv)
        .query(`SELECT id, name FROM organization_units WHERE id IN (SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(@unitIds, ','))`);

      const cacheEntries: Array<{ key: string; data: { name: string } }> = [];
      for (const row of res.recordset) {
        const id = String(row.id).trim().toLowerCase();
        result.set(id, row.name);
        cacheEntries.push({ key: `org:${id}`, data: { name: row.name } });
      }
      await this.setCacheBatch(this.orgsCache, cacheEntries);
    }

    return result;
  }

  private async getAgenciesByIdsCached(agencyIds: string[]): Promise<Map<string, string>> {
    const pool = await this.getMsPool();
    const result = new Map<string, string>();
    if (!agencyIds.length) return result;

    const validIds = [...new Set(agencyIds.map(id => String(id).trim().toLowerCase()).filter(Boolean))];
    if (!validIds.length) return result;

    const cacheKeys = validIds.map((id) => `agency:${id}`);
    const cachedAgencies = await this.getFromCacheBatch<{ name: string }>(this.agenciesCache, cacheKeys);
    const uncachedIds: string[] = [];
    for (const id of validIds) {
      const cached = cachedAgencies.get(`agency:${id}`);
      if (cached) {
        result.set(id, cached.name);
      } else {
        uncachedIds.push(id);
      }
    }

    if (uncachedIds.length > 0) {
      const idsCsv = uncachedIds.join(',');
      const res = await pool.request()
        .input('agencyIds', sql.NVarChar(sql.MAX), idsCsv)
        .query(`SELECT CAST(id AS varchar(36)) AS id, name FROM ${this.dbname}.dbo.agencies WHERE id IN (SELECT TRY_CAST(value AS uniqueidentifier) FROM STRING_SPLIT(@agencyIds, ',')) AND status = 1`);

      const cacheEntries: Array<{ key: string; data: { name: string } }> = [];
      for (const row of res.recordset) {
        const id = String(row.id).trim().toLowerCase();
        result.set(id, row.name);
        cacheEntries.push({ key: `agency:${id}`, data: { name: row.name } });
      }
      await this.setCacheBatch(this.agenciesCache, cacheEntries);
    }

    return result;
  }

  private buildOutgoingActionCacheBaseKey(parts: OutgoingActionCacheKeyParts): string {
    return [
      String(parts.userId || '').trim(),
      String(parts.version || '').trim(),
      String(parts.nodeId || '').trim(),
      String(parts.role || '').trim(),
      String(parts.assignee || '').trim(),
      String(parts.statusCode || '').trim(),
    ].join('::');
  }

  private buildOutgoingActionCacheRevisionKey(baseKey: string, latestAuditId: number | null): string {
    return `${baseKey}::${latestAuditId == null ? 'null' : String(latestAuditId)}`;
  }

  private buildOutgoingActionPointerRedisKey(baseKey: string): string {
    return `outgoing_actions_ptr:${baseKey}`;
  }

  private buildOutgoingActionValueRedisKey(revisionKey: string): string {
    return `outgoing_actions:${revisionKey}`;
  }

  private async deleteCachedActionByRevisionKey(revisionKey: string): Promise<void> {
    if (!revisionKey) return;

    this.actionsGlobalCache.delete(revisionKey);
    this.actionsLookupInflight.delete(this.buildOutgoingActionValueRedisKey(revisionKey));

    try {
      await this.redisClient?.del(this.buildOutgoingActionValueRedisKey(revisionKey));
    } catch { /* ignore redis errors */ }
  }

  private async getCachedActions(baseKey: string, latestAuditId: number | null): Promise<CachedOutgoingActionPayload | null> {
    const revisionKey = this.buildOutgoingActionCacheRevisionKey(baseKey, latestAuditId);
    const entry = this.actionsGlobalCache.get(revisionKey);
    if (entry && entry.expires > Date.now()) {
      return entry.data;
    }

    const redisKey = this.buildOutgoingActionValueRedisKey(revisionKey);
    const inflight = this.actionsLookupInflight.get(redisKey);
    if (inflight) {
      return inflight;
    }

    const pending = (async () => {
      try {
        const pointerKey = this.buildOutgoingActionPointerRedisKey(baseKey);
        const storedRevisionKey = await this.redisClient?.get(pointerKey);
        if (storedRevisionKey && storedRevisionKey !== revisionKey) {
          await this.deleteCachedActionByRevisionKey(storedRevisionKey);
          await this.redisClient?.del(pointerKey);
          return null;
        }

        const cached = await this.redisClient?.get(redisKey);
        if (cached) {
          const parsed = JSON.parse(cached) as CachedOutgoingActionPayload;
          this.actionsGlobalCache.set(revisionKey, {
            data: parsed,
            expires: Date.now() + this.ACTIONS_CACHE_TTL,
          });
          return parsed;
        }
      } catch (e) { /* ignore redis errors */ }

      return null;
    })();

    this.actionsLookupInflight.set(redisKey, pending);
    try {
      return await pending;
    } finally {
      this.actionsLookupInflight.delete(redisKey);
    }
  }

  private async setCachedActions(baseKey: string, latestAuditId: number | null, data: CachedOutgoingActionPayload): Promise<void> {
    const revisionKey = this.buildOutgoingActionCacheRevisionKey(baseKey, latestAuditId);
    this.actionsGlobalCache.set(revisionKey, { data, expires: Date.now() + this.ACTIONS_CACHE_TTL });
    try {
      const pointerKey = this.buildOutgoingActionPointerRedisKey(baseKey);
      const oldRevisionKey = await this.redisClient?.get(pointerKey);
      if (oldRevisionKey && oldRevisionKey !== revisionKey) {
        await this.deleteCachedActionByRevisionKey(oldRevisionKey);
      }

      await this.redisClient?.set(this.buildOutgoingActionValueRedisKey(revisionKey), JSON.stringify(data), 'PX', this.ACTIONS_CACHE_TTL);
      await this.redisClient?.set(pointerKey, revisionKey, 'PX', this.ACTIONS_CACHE_TTL);
    } catch (e) { /* ignore redis errors */ }
  }

  private async getCachedActionsBatch(entries: Array<{ baseKey: string; latestAuditId: number | null }>): Promise<Map<string, CachedOutgoingActionPayload>> {
    const now = Date.now();
    const result = new Map<string, CachedOutgoingActionPayload>();
    const missingEntries: Array<{ baseKey: string; latestAuditId: number | null; revisionKey: string }> = [];
    const uniqueEntries = new Map<string, { baseKey: string; latestAuditId: number | null; revisionKey: string }>();

    for (const item of entries || []) {
      if (!item?.baseKey) continue;
      const revisionKey = this.buildOutgoingActionCacheRevisionKey(item.baseKey, item.latestAuditId);
      uniqueEntries.set(revisionKey, { ...item, revisionKey });
    }

    for (const item of uniqueEntries.values()) {
      const entry = this.actionsGlobalCache.get(item.revisionKey);
      if (entry && entry.expires > now) {
        result.set(item.baseKey, entry.data);
      } else {
        missingEntries.push(item);
      }
    }

    if (!missingEntries.length) {
      return result;
    }

    const pendingKeys = new Map<string, Promise<any | null>>();
    const redisKeysToFetch: string[] = [];
    const redisKeyToCacheKey = new Map<string, string>();

    for (const item of missingEntries) {
      const redisKey = this.buildOutgoingActionValueRedisKey(item.revisionKey);
      const inflight = this.actionsLookupInflight.get(redisKey);
      if (inflight) {
        pendingKeys.set(item.baseKey, inflight);
      } else {
        redisKeysToFetch.push(redisKey);
        redisKeyToCacheKey.set(redisKey, item.baseKey);
      }
    }

    if (redisKeysToFetch.length) {
      const fetchPromise = (async () => {
        try {
          if (typeof this.redisClient?.mget === 'function') {
            const rawValues = await this.redisClient.mget(...redisKeysToFetch);
            return Array.isArray(rawValues) ? rawValues : [];
          }

          return await Promise.all(redisKeysToFetch.map((redisKey: string) => this.redisClient?.get(redisKey)));
        } catch {
          return redisKeysToFetch.map(() => null);
        }
      })();

      for (const redisKey of redisKeysToFetch) {
        const cacheKey = redisKeyToCacheKey.get(redisKey)!;
        const pending = fetchPromise.then((values: any[]) => {
          const index = redisKeysToFetch.indexOf(redisKey);
          const raw = values?.[index] ?? null;
          if (!raw) return null;

          try {
            const parsed = JSON.parse(raw) as CachedOutgoingActionPayload;
            const matched = missingEntries.find((item) => item.baseKey === cacheKey);
            if (!matched) return null;

            this.actionsGlobalCache.set(matched.revisionKey, {
              data: parsed,
              expires: Date.now() + this.ACTIONS_CACHE_TTL,
            });
            return parsed;
          } catch {
            return null;
          }
        });

        this.actionsLookupInflight.set(redisKey, pending);
        pendingKeys.set(cacheKey, pending);
      }
    }

    try {
      const resolvedEntries = await Promise.all(
        Array.from(pendingKeys.entries()).map(async ([key, promise]) => [key, await promise] as const),
      );
      for (const [key, value] of resolvedEntries) {
        if (value) {
          result.set(key, value);
        }
      }
    } finally {
      for (const redisKey of redisKeysToFetch) {
        this.actionsLookupInflight.delete(redisKey);
      }
    }

    return result;
  }

  private async setCachedActionsBatch(entries: Array<{ baseKey: string; latestAuditId: number | null; data: CachedOutgoingActionPayload }>): Promise<void> {
    if (!entries.length) return;

    const uniqueEntries = new Map<string, { baseKey: string; latestAuditId: number | null; data: CachedOutgoingActionPayload; revisionKey: string }>();
    for (const entry of entries) {
      if (entry?.baseKey) {
        const revisionKey = this.buildOutgoingActionCacheRevisionKey(entry.baseKey, entry.latestAuditId);
        uniqueEntries.set(entry.baseKey, { ...entry, revisionKey });
      }
    }

    for (const entry of uniqueEntries.values()) {
      this.actionsGlobalCache.set(entry.revisionKey, { data: entry.data, expires: Date.now() + this.ACTIONS_CACHE_TTL });
    }

    try {
      if (typeof this.redisClient?.multi === 'function') {
        const multi = this.redisClient.multi();
        for (const entry of uniqueEntries.values()) {
          multi.set(this.buildOutgoingActionValueRedisKey(entry.revisionKey), JSON.stringify(entry.data), 'PX', this.ACTIONS_CACHE_TTL);
          multi.set(this.buildOutgoingActionPointerRedisKey(entry.baseKey), entry.revisionKey, 'PX', this.ACTIONS_CACHE_TTL);
        }
        await multi.exec();
        return;
      }

      await Promise.all(
        Array.from(uniqueEntries.values()).flatMap((entry) => [
          this.redisClient?.set(this.buildOutgoingActionValueRedisKey(entry.revisionKey), JSON.stringify(entry.data), 'PX', this.ACTIONS_CACHE_TTL),
          this.redisClient?.set(this.buildOutgoingActionPointerRedisKey(entry.baseKey), entry.revisionKey, 'PX', this.ACTIONS_CACHE_TTL),
        ]),
      );
    } catch (e) { /* ignore redis errors */ }
  }

  private async getLatestAuditIdsByDocumentIds(documentIds: string[]): Promise<Map<string, number | null>> {
    const normalizedIds = [...new Set(
      (documentIds || [])
        .map((id) => String(id || '').trim())
        .filter(Boolean),
    )];
    const result = new Map<string, number | null>();

    if (!normalizedIds.length) {
      return result;
    }

    const pool = await this.getMsPool();
    const res = await pool.request()
      .input('docIds', sql.NVarChar(sql.MAX), normalizedIds.join(','))
      .query(`
        SELECT
          a.document_id AS documentId,
          MAX(a.id) AS latestAuditId
        FROM ${this.dbname}.dbo.audit a
        WHERE a.document_id IN (
          SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(@docIds, ',')
        )
        GROUP BY a.document_id
      `);

    for (const row of res.recordset || []) {
      const docId = String(row.documentId || '').trim();
      if (!docId) continue;
      result.set(docId, row.latestAuditId != null ? Number(row.latestAuditId) : null);
    }

    for (const docId of normalizedIds) {
      if (!result.has(docId)) {
        result.set(docId, null);
      }
    }

    return result;
  }

  private async getLatestAuditIdByDocumentId(documentId: string): Promise<string | number | null> {
    const normalizedId = String(documentId || '').trim();
    if (!normalizedId) return null;

    const pool = await this.getMsPool();
    const res = await pool.request()
      .input('documentId', sql.NVarChar(100), normalizedId)
      .query(`
        SELECT 
          (SELECT TOP 1 a.id FROM ${this.dbname}.dbo.audit a WITH (NOLOCK) WHERE a.document_id = @documentId ORDER BY a.id DESC) AS latestAuditId,
          (SELECT TOP 1 CONVERT(VARCHAR(30), a.updated_at, 126) FROM ${this.dbname}.dbo.audit a WITH (NOLOCK) WHERE a.document_id = @documentId ORDER BY a.updated_at DESC) AS maxAuditUpdatedAt,
          (SELECT COUNT(*) FROM work_items wi WITH (NOLOCK) WHERE wi.document_id = @documentId AND wi.state = 'open') AS openWorkItemCount,
          (SELECT TOP 1 wi.id FROM work_items wi WITH (NOLOCK) WHERE wi.document_id = @documentId ORDER BY wi.created_at DESC, wi.id DESC) AS latestWorkItemId,
          (SELECT TOP 1 d.status_code FROM outgoing_documents d WITH (NOLOCK) WHERE d.document_id = @documentId) AS statusCode,
          (SELECT TOP 1 CONVERT(VARCHAR(30), d.updated_at, 126) FROM outgoing_documents d WITH (NOLOCK) WHERE d.document_id = @documentId) AS docUpdatedAt
      `);

    const row = res.recordset?.[0];
    if (!row) return null;
    const latestAuditId = row.latestAuditId ?? 'null';
    const maxAuditUpdatedAt = row.maxAuditUpdatedAt ?? 'null';
    const openWorkItemCount = row.openWorkItemCount ?? 0;
    const latestWorkItemId = row.latestWorkItemId ?? 'null';
    const statusCode = row.statusCode ?? 'null';
    const docUpdatedAt = row.docUpdatedAt ?? 'null';

    return `${latestAuditId}_au:${maxAuditUpdatedAt}_wi:${openWorkItemCount}_${latestWorkItemId}_sc:${statusCode}_du:${docUpdatedAt}`;
  }

  private isCachedActionPayloadValid(
    cached: CachedOutgoingActionPayload | null | undefined,
    latestAuditId: string | number | null,
  ): cached is CachedOutgoingActionPayload {
    return !!cached && String(cached.latestAuditId) === String(latestAuditId);
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
  private getDatabaseName(): string {
    const dbName = this.configService.get<string>('SQLSERVER_DATABASE');
    if (!dbName) throw new Error('SQLSERVER_DATABASE not defined in .env');
    return dbName;
  }
  onModuleInit() {
    this.dbname = this.getDatabaseName();
  }

  private async resolveUserIdsFromDocumentViewerGroups(groupIds: string[] = []): Promise<string[]> {
    const normalizedGroupIds = [...new Set((groupIds || []).map((id) => String(id).trim()).filter(Boolean))];
    if (!normalizedGroupIds.length) return [];

    const userIds = new Set<string>();

    await Promise.all(
      normalizedGroupIds.map(async (groupId) => {
        try {
          const result = await this.groupUserInDocumentService.findUsersByGroupId(groupId, {
            page: 1,
            limit: 1000,
          } as any);

          const users = Array.isArray(result?.data) ? result.data : [];
          for (const user of users) {
            const userId = typeof user?.id === 'string' ? user.id.trim() : String(user?.id || '').trim();
            if (userId) userIds.add(userId);
          }
        } catch (error) {
          this.logger.warn(
            `Khong the resolve users tu documentViewerGroup ${groupId}: ${error?.message || error}`,
          );
        }
      }),
    );

    return [...userIds];
  }
  private serializeBpmnData(data: { process: any; indexes: any; bpmnXML?: string }): string {
    const replacer = (key: string, value: any) => {
      if (key === '$parent') return undefined;
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

  private deserializeBpmnData(json: any): { process: any; indexes: any; bpmnXML?: string } | null {
    if (json && typeof json !== 'string') {
      return json;
    }
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

  private async getBpmnEngineCached(
    version?: string,
  ): Promise<BpmnCacheData | null> {
    const v = typeof version === 'string' ? version.trim() : '';
    if (!v) return null;

    const cacheKey = `bpmn_engine:${v}`;
    let cachedData: BpmnCacheData | null = null;
    if (this.cacheManager) {
      const cachedRaw = await this.cacheManager.get<BpmnCacheData | string>(cacheKey);
      if (cachedRaw) {
        if (typeof cachedRaw === 'string') {
          cachedData = this.deserializeBpmnData(cachedRaw);
        } else {
          cachedData = cachedRaw;
        }
      }
    }

    if (cachedData?.process && cachedData?.indexes) {
      if (typeof cachedData.bpmnXML === 'string') {
        return cachedData;
      }

      const bpmnXML = await this.runtime.repo.getBpmnFile(v);
      const hydratedData = { ...cachedData, bpmnXML };
      if (this.cacheManager) {
        try {
          await this.cacheManager.set(cacheKey, this.serializeBpmnData(hydratedData), 180);
        } catch {
          // ignore cache write errors
        }
      }
      return hydratedData;
    }

    const xml = await this.runtime.repo.getBpmnFile(v);
    if (!xml) return null;

    const { process } = await this.bpmnEngine.loadBpmnFromString(xml);
    const indexes = this.bpmnEngine.buildIndexes(process);
    const dataToCache: BpmnCacheData = { process, indexes, bpmnXML: xml };

    if (this.cacheManager) {
      try {
        await this.cacheManager.set(cacheKey, this.serializeBpmnData(dataToCache), 180);
      } catch (error) {
        this.logger.error(`[CACHE] Lỗi khi lưu cache cho BPMN version '${v}'`, error);
      }
    }

    return dataToCache;
  }

  private async loadBpmnProcessesCached(
    bpmnVersions: string[],
    receiverUnit: any,
  ): Promise<Map<string, { process: any; indexes: any; bpmnXML?: string; userParent: any }>> {
    const normalizedVersions = [...new Set(
      (bpmnVersions || [])
        .map((version) => typeof version === 'string' ? version.trim() : '')
        .filter((version): version is string => version.length > 0)
    )];

    const result = new Map<string, { process: any; indexes: any; bpmnXML?: string; userParent: any }>();
    if (!normalizedVersions.length) {
      return result;
    }

    const cacheHits = await Promise.all(
      normalizedVersions.map(async (version) => [version, await this.getBpmnEngineCached(version)] as const)
    );

    const missingVersions: string[] = [];
    for (const [version, engine] of cacheHits) {
      if (engine?.process && engine?.indexes) {
        result.set(version, { ...engine, userParent: receiverUnit });
      } else {
        missingVersions.push(version);
      }
    }

    if (missingVersions.length) {
      const pool = await this.getMsPool();
      const request = pool.request();
      const placeholders = missingVersions.map((version, index) => {
        request.input(`bpmnVersion${index}`, sql.NVarChar(255), version);
        return `@bpmnVersion${index}`;
      }).join(',');

      const bpmnRows = await request.query(`
        SELECT id, base64_file
        FROM ${this.dbname}.dbo.bpmn_design WITH (NOLOCK)
        WHERE id IN (${placeholders})
      `);

      const xmlByVersion = new Map<string, string>();
      for (const row of bpmnRows.recordset || []) {
        const version = typeof row?.id === 'string' ? row.id.trim() : '';
        const bpmnXML = typeof row?.base64_file === 'string' ? row.base64_file : '';
        if (version && bpmnXML) {
          xmlByVersion.set(version, bpmnXML);
        }
      }

      await Promise.all(
        missingVersions.map(async (version) => {
          const bpmnXML = xmlByVersion.get(version);
          if (!bpmnXML) {
            result.set(version, { process: null, indexes: null, bpmnXML: undefined, userParent: receiverUnit });
            return;
          }

          const { process } = await this.bpmnEngine.loadBpmnFromString(bpmnXML);
          const indexes = this.bpmnEngine.buildIndexes(process);
          const engineData: BpmnCacheData = { process, indexes, bpmnXML };

          if (this.cacheManager) {
            try {
              await this.cacheManager.set(`bpmn_engine:${version}`, this.serializeBpmnData(engineData), 180);
            } catch {
              // ignore cache write errors
            }
          }

          result.set(version, { ...engineData, userParent: receiverUnit });
        })
      );
    }

    for (const version of normalizedVersions) {
      if (!result.has(version)) {
        result.set(version, { process: null, indexes: null, bpmnXML: undefined, userParent: receiverUnit });
      }
    }

    return result;
  }

  /**
   * Lấy danh sách người ký phát hành từ BPMN flow
   * Logic mới:
   * 1. Tìm tất cả luồng có relatedProcesses = docType (OutGoingDocument)
   * 2. Với mỗi luồng, parse BPMN XML, tìm nodes có signerRequired = typeSign
   * 3. Tìm lane của các nodes đó
   * 4. Lấy users từ role_feature theo processKey + lane
   */
  async getReportSigners(params: {
    userId: string;
    docType?: string;
    processKey?: string;
    typeSign?: string;
  }): Promise<any[]> {
    const { docType = 'OutGoingDocument', typeSign = 'reportSigner' } = params;

    // Bước 1: Lấy tất cả luồng có relatedProcesses = docType
    const flows = await this.sqlsvRepo.getAllFlowsByDocType(docType);

    if (!flows?.length) {
      return [];
    }

    // Collect all user IDs from all flows
    const allUserIds = new Set<string>();

    // Bước 2-4: Lặp qua từng luồng
    for (const flow of flows) {
      const processKey = flow.id;

      // Lấy BPMN XML
      const bpmnXML = await this.sqlRepo.getBpmnFile(processKey);
      if (!bpmnXML) {
        continue;
      }

      // Parse BPMN
      const { indexes } = await this.runtimeService.getModelFromXml(bpmnXML);

      // Tìm nodes có signerRequired = typeSign
      for (const [nodeId, node] of indexes.nodes) {
        const extProps = getAllNodeExtensionProperties(node);
        const signerRequired = extProps.signerRequired || null;

        if (signerRequired === typeSign) {

          // Tìm lane của node
          const lane = indexes.laneMap.get(node.id) ??
            (node.laneId ? indexes.laneMap.get(node.laneId) : undefined);

          if (lane) {
            // Lấy users từ role_feature theo processKey + lane
            const userIds = await this.sqlRepo.getUsersByRoleInFlow(processKey, lane);

            if (userIds?.length) {
              userIds.forEach((id: string) => allUserIds.add(id));
            }
          }
        }
      }
    }


    if (!allUserIds.size) {
      return [];
    }

    // Lấy thông tin chi tiết users
    const users = await this.sqlRepo.getUsersByIds([...allUserIds]);

    return users.map((user: any) => ({
      // _id: user.processId,
      id: user.processId,
      name: user.name,
      username: user.username,
      // position: user.position,
      // parent: user.parent,
    }));
  }

  private async getSignatureData(pool: sql.ConnectionPool, documentIds: string[]): Promise<Array<{ document_id: string; signed_at: Date | null; signer_type: string; is_signed: number }>> {
    try {
      if (!documentIds.length) return [];

      const batchSize = 1000;
      const allResults: Array<{ document_id: string; signed_at: Date | null; signer_type: string; is_signed: number }> = [];

      for (let i = 0; i < documentIds.length; i += batchSize) {
        const batch = documentIds.slice(i, i + batchSize);
        const placeholders = batch.map((_, idx) => `@docId${i + idx}`).join(',');

        const request = pool.request();
        batch.forEach((id, idx) => {
          request.input(`docId${i + idx}`, sql.VarChar(100), id);
        });

        const query = `
          SELECT 
            document_id,
            signed_at,
            signer_type,
            is_signed
          FROM ${this.dbname}.dbo.outgoing_document_users
          WHERE document_id IN (${placeholders})
        `;

        const result = await request.query(query);
        allResults.push(...result.recordset);
      }

      return allResults;
    } catch (error) {
      this.logger.error('getSignatureData error:', error);
      return [];
    }
  }

  // Logic tính toán thống kê theo phòng ban
  private calculateDepartmentStats(
    documents: Array<{ document_id: string; deadline_reply: Date | null; sender_unit: string | null; created_at?: Date | null }>,
    signatureMap: Map<string, Array<{ signed_at: Date | null; signer_type: string; is_signed: number }>>,
  ): Map<string, { total: number; on_time: number; late: number; processing: number; avg_days: number; on_time_rate: number }> {
    const stats = new Map<string, { total: number; on_time: number; late: number; processing: number; avg_days: number; on_time_rate: number }>();

    for (const doc of documents) {
      const deptId = doc.sender_unit;
      if (!deptId) continue;

      if (!stats.has(deptId)) {
        stats.set(deptId, { total: 0, on_time: 0, late: 0, processing: 0, avg_days: 0, on_time_rate: 0 });
      }

      const stat = stats.get(deptId)!;
      stat.total++;

      const signatures = signatureMap.get(doc.document_id) || [];
      const reportSignerSigs = signatures.filter(sig => sig.signer_type === 'reportSigner');

      if (reportSignerSigs.length === 0) {
        // Không có chữ ký reportSigner → vẫn tính là đang xử lý
        stat.processing++;
        continue;
      }

      // Kiểm tra trạng thái xử lý
      const hasUnsigned = reportSignerSigs.some(sig => sig.is_signed === 0);

      if (hasUnsigned) {
        // Đang xử lý: có reportSigner chưa ký
        stat.processing++;
      } else {
        // Đã hoàn thành: tất cả reportSigner đã ký
        const completedSig = reportSignerSigs.find(sig => sig.is_signed === 1 && sig.signed_at);

        if (completedSig && completedSig.signed_at && doc.deadline_reply) {
          const signAt = new Date(completedSig.signed_at);
          const deadline = new Date(doc.deadline_reply);

          if (signAt <= deadline) {
            // Đúng hạn
            stat.on_time++;
          } else {
            // Trễ hạn
            stat.late++;
          }
        } else {
          // Không đủ dữ liệu để xác định → tính processing
          stat.processing++;
        }
      }
    }

    // Tính thời gian trung bình (created_at → signed_at) và tỷ lệ đúng hạn
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    for (const [deptId, stat] of stats.entries()) {
      let totalDiffTime = 0;
      let completedCount = 0;

      const deptDocs = documents.filter(d => d.sender_unit === deptId);

      for (const doc of deptDocs) {
        if (!doc.document_id || !doc.created_at) continue;

        const signatures = signatureMap.get(doc.document_id) || [];
        const completedSig = signatures.find(sig =>
          sig.signer_type === 'reportSigner' &&
          sig.is_signed === 1 &&
          sig.signed_at,
        );

        if (!completedSig?.signed_at) continue;

        const signAt = new Date(completedSig.signed_at);
        const createdAt = new Date(doc.created_at);

        if (isNaN(signAt.getTime()) || isNaN(createdAt.getTime())) continue;

        // Normalize về 00:00 (giống SQL DATEDIFF DAY)
        const start = new Date(createdAt);;
        const end = new Date(signAt);;

        const diffTime = end.getTime() - start.getTime();
        if (diffTime < 0) continue;

        totalDiffTime += diffTime;
        completedCount++;
      }

      stat.avg_days = completedCount > 0
        ? Math.round(totalDiffTime / completedCount / MS_PER_DAY)
        : 0;

      // Tỷ lệ đúng hạn
      const totalCompleted = (stat.on_time || 0) + (stat.late || 0);
      stat.on_time_rate = totalCompleted > 0
        ? Math.round((stat.on_time / totalCompleted) * 100)
        : 0;
    }

    return stats;
  }

  // 📌 LIST (dynamic filtering – giống mẫu bạn gửi)
  async list(query: any, userId: string) {
    if (!userId) throw new BadRequestException('Vui lòng cung cấp userId');
    const bpmnXML = await this.runtime.repo.getBpmnFile('VAN_BAN_DI');
    const { page, limit, filter, sort, processFn } = query;

    const result = await this.runtime.repo.listOutgoingDocumentsDynamic({
      page,
      limit,
      filter,
      bpmnXML,
      sort,
      userId,
      processFn
    });

    return result;
  }

  async listOutgoingByIncomingId({
    incomingId,
    query,
  }: {
    incomingId: string;
    query: any;
  }) {
    if (!incomingId) throw new BadRequestException('incomingId bắt buộc phải có');

    const { page = 1, limit = 20, isExport } = query || {};

    const pool = await this.getMsPool();

    let limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    if (isExport === 'true') {
      limitNum = 9999;
    }
    const offsetNum = (pageNum - 1) * limitNum;

    const whereIncoming = `
      outgoing_documents.doc_answer IS NOT NULL
      AND ISJSON(outgoing_documents.doc_answer) = 1
      AND NULLIF(LTRIM(RTRIM(COALESCE(outgoing_documents.abstract_note, ''))), '') IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM OPENJSON(outgoing_documents.doc_answer)
        WITH (documentId varchar(100) '$.documentId') j
        WHERE j.documentId = @incomingId
      )
    `;

    const totalSql = `
      SELECT COUNT(*) AS total
      FROM ${this.dbname}.dbo.outgoing_documents outgoing_documents
      WHERE ${whereIncoming}
    `;

    const rowsSql = `
      SELECT outgoing_documents.document_id AS documentId
      FROM ${this.dbname}.dbo.outgoing_documents outgoing_documents
      WHERE ${whereIncoming}
      ORDER BY outgoing_documents.created_at DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const totalRes = await pool.request()
      .input('incomingId', sql.VarChar(100), String(incomingId))
      .query(totalSql);

    const total = Number(totalRes.recordset?.[0]?.total ?? 0);

    const idsRes = await pool.request()
      .input('incomingId', sql.VarChar(100), String(incomingId))
      .input('offset', sql.Int, offsetNum)
      .input('limit', sql.Int, limitNum)
      .query(rowsSql);

    const docIds = (idsRes.recordset || []).map((r: any) => String(r.documentId));
    if (!docIds.length) {
      return { items: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 };
    }

    const items = (await Promise.all(docIds.map((id: string) => this.sqlRepo.getOutgoingDocument(id)))).filter(Boolean);

    // Map/chuẩn hoá output giống các API list khác
    const mappedItems = await this.mapDocOutgoingKeysForList(items, {}, undefined, undefined, query?.isExport);

    // Convert files từ mảng object thành string tên file để FE hiển thị đúng cột "File dự thảo"
    for (const m of mappedItems) {
      if (Array.isArray(m.files)) {
        const fileNames = m.files.map((f: any) => f.file_name || f.fileName || '').filter(Boolean).join(', ') || '-';
        m.docDraft = fileNames;
        m.files = fileNames;
      }
    }

    return {
      items: mappedItems,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async listEvict(userId: string, query: any) {
    const { page = 1, limit = 20, filter, sort, processFn, isExport, countOnly, bpmnVersion } = query;
    const safeProcessFn = String(processFn || '').replace(/'/g, "''");
    const pool = await this.getMsPool();
    const where: string[] = [];

    const [featureManagement, userRes, userGroupIds, selectFieldsConfig] = await Promise.all([
      this.featureManagementRepo.findOne({
        where: { code: processFn, status: 1, statusFeature: StatusFeature.ACTIVE },
      }),
      pool.request().query(
        `SELECT id, parent AS parentId FROM ${this.dbname}.dbo.users WHERE id = '${userId}'`,
      ),
      this.getUserGroupIdsCached(userId),
      this.configurationService.buildSelectFieldsNew(
        'outgoing_documents',
        ['files', 'statusCode', 'status_code'],
      ),
    ]);

    const receiverUnit = userRes.recordset[0]?.parentId || null;
    const { dbKeys, aliases, allViewFields } = selectFieldsConfig;

    // ===== build criteria từ filter =====
    const criteria: Array<{ name: string; operator: string; value: string | string[] }> = [];
    if (filter && typeof filter === 'object') {
      Object.entries(filter).forEach(([key, value]) => {
        if (!value) return;
        if (typeof value === 'object') {
          const v = value as any;
          if (v.startDate && v.endDate)
            criteria.push({ name: key, operator: 'between', value: [String(v.startDate), String(v.endDate)] });
          else if (v.startDate)
            criteria.push({ name: key, operator: 'gte', value: String(v.startDate) });
          else if (v.endDate)
            criteria.push({ name: key, operator: 'lte', value: String(v.endDate) });
          else if (v.value !== undefined)
            criteria.push({ name: key, operator: 'like', value: String(v.value) });
        } else {
          criteria.push({ name: key, operator: 'like', value: String(value) });
        }
      });
    }

    const featureCriteria = featureManagement?.criteria ?? [];
    const { sql: filterFeature, joins: filterJoins } =
      buildDocumentCriteriaReplyEvictHelper(
        [...featureCriteria, ...criteria],
        'outgoing_documents',
        featureManagement,
        ["abstractNote", "releaseNo"]
      );

    // ===== JOIN: processed dùng last_audit =====
    let joinClause = `
      CROSS APPLY (
        SELECT TOP 1
          a.document_id,
          a.receiver,
          a.receiver_unit,
          a.stage_status,
          a.action_code,
          a.created_by
        FROM ${this.dbname}.dbo.audit a
        WHERE a.document_id = CAST(outgoing_documents.document_id AS NVARCHAR(64))
        ORDER BY a.id DESC
      ) last_audit
    `;

    // Văn bản có sao
    if (filter?.isStar === '1' || filter?.isStar === 'true') {
      where.push(` EXISTS ( SELECT 1 FROM ${this.dbname}.dbo.document_star ds WHERE ds.document_id = outgoing_documents.document_id AND ds.user_id = '${userId}' AND ds.step = '${safeProcessFn}' ) `);
    }
    if (filter?.isStar === '0' || filter?.isStar === 'false') {
      where.push(` NOT EXISTS ( SELECT 1 FROM ${this.dbname}.dbo.document_star ds WHERE ds.document_id = outgoing_documents.document_id AND ds.user_id = '${userId}' AND ds.step = '${safeProcessFn}' ) `);
    }

    if (filterJoins) joinClause += ' ' + filterJoins;

    // ===== WHERE processed =====
    if (filterFeature) where.push(`(${filterFeature})`);

    // 1. Trạng thái hiện tại = ĐÃ BAN HÀNH
    where.push(`last_audit.stage_status = '${stageStatusDoc.DA_BAN_HANH}'`);

    // 2. User / phòng TỪNG tham gia audit HOẶC người dùng nằm trong nhóm người xem văn bản

    let viewerGroupCond = '';
    if (userGroupIds.length > 0) {
      const groupList = userGroupIds.map(id => `'${id}'`).join(',');
      viewerGroupCond = `
        OR (
          ISJSON(outgoing_documents.document_viewer_groups) = 1
          AND EXISTS (
            SELECT 1 
            FROM OPENJSON(outgoing_documents.document_viewer_groups) 
            WHERE (
              CASE WHEN [type] = 5
                THEN COALESCE(JSON_VALUE([value], '$.id'), JSON_VALUE([value], '$.groupId'))
                ELSE CONVERT(NVARCHAR(100), [value])
              END
            ) IN (${groupList})
          )
        )
      `;
    }

    const knowReceiverCond = `
      OR (
        ISJSON(outgoing_documents.know_receivers) = 1
        AND EXISTS (
          SELECT 1
          FROM OPENJSON(outgoing_documents.know_receivers)
          WHERE (
            CASE WHEN [type] = 5
              THEN JSON_VALUE([value], '$.id')
              ELSE CONVERT(NVARCHAR(100), [value])
            END
          ) = '${userId.replace(/'/g, "''")}'
        )
      )
    `;

    where.push(`
      (
        EXISTS (
          SELECT 1
          FROM ${this.dbname}.dbo.audit a2
          WHERE a2.document_id = outgoing_documents.document_id
            AND (
              a2.created_by = '${userId}'
              OR a2.receiver = '${userId}'
              ${receiverUnit ? `OR a2.receiver_unit = '${receiverUnit}'` : ''}
            )
        )
        ${viewerGroupCond}
        ${knowReceiverCond}
      )
    `);

    // 3. Cùng luồng quy trình (chấp nhận cả code lẫn display name)
    if (bpmnVersion) {
      const safeBpmn = bpmnVersion.replace(/'/g, "''");
      where.push(`outgoing_documents.bpmn_version IN (
        SELECT id FROM ${this.dbname}.dbo.bpmn_design WHERE id = N'${safeBpmn}' OR name = N'${safeBpmn}'
      )`);
    }

    let whereClause = ' WHERE ' + where.join(' AND ');
    whereClause += ` AND outgoing_documents.status = 1`;

    // ===== paging =====
    let limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    if (isExport === 'true') {
      limitNum = 9999;
    }
    const offsetNum = (pageNum - 1) * limitNum;

    // ===== select fields =====

    const keyDefaults: string[] = [];
    if (allViewFields.includes('statusCode') || allViewFields.includes('status_code')) {
      keyDefaults.push(`
        (SELECT TOP 1 a.action_code
        FROM ${this.dbname}.dbo.audit a
        WHERE a.document_id = outgoing_documents.document_id
        ORDER BY a.id DESC) AS status_code
      `);
    }

    keyDefaults.push(`
      CASE
        WHEN EXISTS (
          SELECT 1 FROM ${this.dbname}.dbo.document_star ds
          WHERE ds.document_id = outgoing_documents.document_id
            AND ds.user_id = '${userId}'
            AND ds.step = '${safeProcessFn}'
        ) THEN 1 ELSE 0
      END AS isStar
    `);

    aliases['isStar'] = 'is_star';
    aliases['internalDepObj'] = 'internalDepObj';

    keyDefaults.push(`
      NULL AS internalDepObj 
    `);

    const selectFields = [...keyDefaults, ...dbKeys].join(', ');
    const orderBy = ' ORDER BY ' + parseSort(sort, aliases, 'outgoing_documents');

    const totalSql = `
      SELECT COUNT(*) AS total
      FROM ${this.dbname}.dbo.outgoing_documents
      ${joinClause}
      ${whereClause}
    `;

    const rowsSql = `
      SELECT ${selectFields}
      FROM ${this.dbname}.dbo.outgoing_documents
      ${joinClause}
      ${whereClause}
      ${orderBy}
      OFFSET ${offsetNum} ROWS
      FETCH NEXT ${limitNum} ROWS ONLY
    `;

    if (countOnly === 'true') {
      const totalResult = await pool.request().query(totalSql);
      const total = totalResult.recordset[0]?.total ?? 0;
      return { total: total };
    }
    const [totalResult, rowsResult] = await Promise.all([
      pool.request().query(totalSql),
      pool.request().query(rowsSql),
    ]);

    const total = totalResult.recordset[0]?.total ?? 0;
    const items = rowsResult.recordset as DocumentRow[];

    if (!items.length) {
      return { success: true, items: [], mesage: "Không có dữ liệu", total: 0, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
    }

    const mapped = await this.mapDocOutgoingKeysForList(items, aliases, undefined, undefined, isExport);

    return {
      items: mapped,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async listReplacedDocuments(userId: string, query: any) {
    const { page = 1, limit = 20, filter, sort, processFn, isExport, countOnly } = query;
    const pool = await this.getMsPool();
    const where: string[] = [];

    const featureManagement = await this.featureManagementRepo.findOne({
      where: { code: processFn, status: 1, statusFeature: StatusFeature.ACTIVE },
    });

    const userRes = await pool.request().query(
      `SELECT id, parent AS parentId FROM ${this.dbname}.dbo.users WHERE id = '${userId}'`,
    );
    const receiverUnit = userRes.recordset[0]?.parentId || null;

    // ===== build criteria từ filter =====
    const criteria: Array<{ name: string; operator: string; value: string | string[] }> = [];
    if (filter && typeof filter === 'object') {
      Object.entries(filter).forEach(([key, value]) => {
        if (!value) return;
        if (typeof value === 'object') {
          const v = value as any;
          if (v.startDate && v.endDate)
            criteria.push({ name: key, operator: 'between', value: [String(v.startDate), String(v.endDate)] });
          else if (v.startDate)
            criteria.push({ name: key, operator: 'gte', value: String(v.startDate) });
          else if (v.endDate)
            criteria.push({ name: key, operator: 'lte', value: String(v.endDate) });
          else if (v.value !== undefined)
            criteria.push({ name: key, operator: 'like', value: String(v.value) });
        } else {
          criteria.push({ name: key, operator: 'like', value: String(value) });
        }
      });
    }

    const featureCriteria = featureManagement?.criteria ?? [];
    const { sql: filterFeature, joins: filterJoins } =
      buildDocumentCriteriaReplyEvictHelper(
        [...featureCriteria, ...criteria],
        'outgoing_documents',
        featureManagement,
        ["abstractNote", "releaseNo"]
      );

    // ===== JOIN: processed dùng last_audit =====
    let joinClause = `
      CROSS APPLY (
        SELECT TOP 1
          a.document_id,
          a.receiver,
          a.receiver_unit,
          a.stage_status,
          a.action_code,
          a.created_by
        FROM ${this.dbname}.dbo.audit a
        WHERE a.document_id = CAST(outgoing_documents.document_id AS NVARCHAR(64))
        ORDER BY a.id DESC
      ) last_audit
    `;

    // Văn bản có sao
    if (filter?.isStar === '1' || filter?.isStar === 'true') {
      where.push(` EXISTS ( SELECT 1 FROM ${this.dbname}.dbo.document_star ds WHERE ds.document_id = outgoing_documents.document_id AND ds.user_id = '${userId}' AND ds.step = '${processFn}' ) `);
    }
    if (filter?.isStar === '0' || filter?.isStar === 'false') {
      where.push(` NOT EXISTS ( SELECT 1 FROM ${this.dbname}.dbo.document_star ds WHERE ds.document_id = outgoing_documents.document_id AND ds.user_id = '${userId}' AND ds.step = '${processFn}' ) `);
    }

    if (filterJoins) joinClause += ' ' + filterJoins;

    // ===== WHERE processed =====
    if (filterFeature) where.push(`(${filterFeature})`);

    // 1. Trạng thái hiện tại = ĐÃ BAN HÀNH hoặc BI_THAY_THE
    where.push(`last_audit.stage_status IN ('${stageStatusDoc.DA_BAN_HANH}', 'BI_THAY_THE')`);

    // 1.1 Văn bản đã bị thay thế
    where.push(`outgoing_documents.replaced = 1`);


    // 2. User / phòng TỪNG tham gia audit
    where.push(`
      EXISTS (
        SELECT 1
        FROM ${this.dbname}.dbo.audit a2
        WHERE a2.document_id = outgoing_documents.document_id
          AND (
            a2.created_by = '${userId}'
            OR a2.receiver = '${userId}'
            ${receiverUnit ? `OR a2.receiver_unit = '${receiverUnit}'` : ''}
          )
      )
    `);

    let whereClause = ' WHERE ' + where.join(' AND ');
    whereClause += ` AND outgoing_documents.status = 1`;

    // ===== paging =====
    let limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    if (isExport === 'true') {
      limitNum = 9999;
    }
    const offsetNum = (pageNum - 1) * limitNum;

    // ===== select fields =====
    const excludeKeys = ['files', 'statusCode', 'status_code'];
    const { dbKeys, aliases, allViewFields } =
      await this.configurationService.buildSelectFieldsNew(
        'outgoing_documents',
        excludeKeys,
      );

    const keyDefaults: string[] = [];
    if (allViewFields.includes('statusCode') || allViewFields.includes('status_code')) {
      keyDefaults.push(`
        (SELECT TOP 1 a.action_code
        FROM ${this.dbname}.dbo.audit a
        WHERE a.document_id = outgoing_documents.document_id
        ORDER BY a.id DESC) AS status_code
      `);
    }

    keyDefaults.push(`
      CASE
        WHEN EXISTS (
          SELECT 1 FROM ${this.dbname}.dbo.document_star ds
          WHERE ds.document_id = outgoing_documents.document_id
            AND ds.user_id = '${userId}'
            AND ds.step = '${processFn}'
        ) THEN 1 ELSE 0
      END AS isStar
    `);

    aliases['isStar'] = 'is_star';
    aliases['internalDepObj'] = 'internalDepObj';

    keyDefaults.push(`
      NULL AS internalDepObj 
    `);

    const selectFields = [...keyDefaults, ...dbKeys].join(', ');
    const orderBy = ' ORDER BY ' + parseSort(sort, aliases, 'outgoing_documents');

    const totalSql = `
      SELECT COUNT(*) AS total
      FROM ${this.dbname}.dbo.outgoing_documents
      ${joinClause}
      ${whereClause}
    `;

    const rowsSql = `
      SELECT ${selectFields}
      FROM ${this.dbname}.dbo.outgoing_documents
      ${joinClause}
      ${whereClause}
      ${orderBy}
      OFFSET ${offsetNum} ROWS
      FETCH NEXT ${limitNum} ROWS ONLY
    `;

    if (countOnly === 'true') {
      const totalResult = await pool.request().query(totalSql);
      const total = totalResult.recordset[0]?.total ?? 0;
      return { total: total };
    }
    const [totalResult, rowsResult] = await Promise.all([
      pool.request().query(totalSql),
      pool.request().query(rowsSql),
    ]);

    const total = totalResult.recordset[0]?.total ?? 0;
    const items = rowsResult.recordset as DocumentRow[];

    if (!items.length) return { success: true, items: [], mesage: "Không có dữ liệu", total: 0, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };

    const mapped = await this.mapDocOutgoingKeysForList(items, aliases, undefined, undefined, isExport);

    return {
      items: mapped,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async getPendingFeedbacks(userId: string, query: any) {
    if (!userId) throw new BadRequestException('Vui lòng cung cấp userId');

    // Sort (dùng shared utility)
    const orderField = query?.sort || 'createdAt';
    const allowedSortFields = [
      ...getDtoKeys(CreateOutgoingDto),
      ...getEntityKeys(OutgoingDocumentEntity),
      'createdAt', 'updatedAt'
    ];
    validateAndParseSortParam(orderField, allowedSortFields);

    const result = await this.runtime.repo.getPendingFeedbacks(
      userId,
      query,
    );

    // Map documents với workItems và availableActions
    const roles = query.roles
      ? (Array.isArray(query.roles) ? query.roles : query.roles.split(',').filter(Boolean))
      : [];

    return await this.mapFeedbackDocuments(result, userId, roles);
  }

  async getGivenFeedbacks(userId: string, query: any) {
    if (!userId) throw new BadRequestException('Vui lòng cung cấp userId');

    const result = await this.runtime.repo.getGivenFeedbacks(
      userId,
      query,
    );

    // Map documents với workItems và availableActions
    const roles = query.roles
      ? (Array.isArray(query.roles) ? query.roles : query.roles.split(',').filter(Boolean))
      : [];

    return await this.mapFeedbackDocuments(result, userId, roles);
  }

  async getMySentFeedbacks(userId: string, query: any) {
    if (!userId) throw new BadRequestException('Vui lòng cung cấp userId');

    const result = await this.runtime.repo.getMySentFeedbacks(
      userId,
      query,
    );

    // Map documents với workItems và availableActions
    const roles = query.roles
      ? (Array.isArray(query.roles) ? query.roles : query.roles.split(',').filter(Boolean))
      : [];

    return await this.mapFeedbackDocuments(result, userId, roles);
  }

  async getMyCompletedFeedbacks(userId: string, query: any) {
    if (!userId) throw new BadRequestException('Vui lòng cung cấp userId');

    const result = await this.runtime.repo.getMyCompletedFeedbacks(
      userId,
      query,
    );

    // Map documents với workItems và availableActions
    const roles = query.roles
      ? (Array.isArray(query.roles) ? query.roles : query.roles.split(',').filter(Boolean))
      : [];

    return await this.mapFeedbackDocuments(result, userId, roles);
  }

  async getMyReceivedFeedbackRequests(userId: string, query: any) {
    if (!userId) throw new BadRequestException('Vui lòng cung cấp userId');

    const result = await this.runtime.repo.getMyReceivedFeedbackRequests(
      userId,
      query,
    );

    // Map documents với workItems và availableActions
    const roles = query.roles
      ? (Array.isArray(query.roles) ? query.roles : query.roles.split(',').filter(Boolean))
      : [];

    return await this.mapFeedbackDocuments(result, userId, roles);
  }

  /**
   * Helper function để map feedback documents với workItems và availableActions
   */
  private async mapFeedbackDocuments(
    result: { data: any[]; total: number; page: number; limit: number; totalPages: number },
    userId: string,
    roles: string[],
  ): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
    if (!result.data || result.data.length === 0) {
      return result;
    }

    // Tách outgoing và incoming documents
    const outgoingDocs: DocumentRow[] = [];
    const incomingDocs: any[] = [];
    const docIndexMap = new Map<string, number>(); // Map document_id -> index trong result.data

    result.data.forEach((doc, index) => {
      docIndexMap.set(doc.document_id || doc.id || doc.documentId, index);
      if (doc.documentType === 'outgoing' || (!doc.documentType && doc.document_id)) {
        outgoingDocs.push(doc as DocumentRow);
      } else {
        incomingDocs.push(doc);
      }
    });

    // Chỉ map outgoing documents
    if (outgoingDocs.length === 0) {
      return result;
    }

    // Lấy BPMN XML (mặc định là VAN_BAN_DI)
    const defaultBpmnXML = await this.runtime.repo.getBpmnFile('XIN_Y_KIEN');

    // Map outgoing documents
    const mappedOutgoing = await this.mapDocumentDetailsOutgoingv2(
      outgoingDocs,
      defaultBpmnXML || '',
      { userId, roles },
      {},
    );

    // Tạo map từ document_id sang mapped document (hỗ trợ nhiều key)
    const mappedMap = new Map<string, any>();
    mappedOutgoing.forEach((mapped: any) => {
      // Thử nhiều key để match
      const docId = mapped.document_id || mapped.id || mapped.documentId;
      if (docId) {
        mappedMap.set(String(docId), mapped);
        // Cũng thêm các key khác nếu có 
        if (mapped.document_id && mapped.document_id !== docId) {
          mappedMap.set(String(mapped.document_id), mapped);
        }
        if (mapped.id && mapped.id !== docId) {
          mappedMap.set(String(mapped.id), mapped);
        }
        if (mapped.documentId && mapped.documentId !== docId) {
          mappedMap.set(String(mapped.documentId), mapped);
        }
      }
    });

    // Merge mapped documents vào result.data
    const mergedData = result.data.map((doc) => {
      // Thử nhiều key để tìm mapped
      const docId = doc.document_id || doc.id || doc.documentId;
      const mapped = docId ? mappedMap.get(String(docId)) : null;

      if (mapped) {
        // Merge: ưu tiên các field từ mapped (flags, availableActions, workItems, etc.)
        // sau đó merge doc để giữ các field khác, cuối cùng giữ lại các field đặc biệt từ feedback
        const merged = {
          ...mapped, // Đặt mapped trước để ưu tiên: flags, availableActions, workItems, perItems, flagsProcess, openWorkItems, workItem
          ...doc,    // Sau đó merge doc để giữ các field khác (documentType, documentId, documentTitle, signerOrSender, etc.)
        };

        // Đảm bảo các field quan trọng từ mapped không bị ghi đè
        if (mapped.flags) merged.flags = mapped.flags;
        if (mapped.flagsProcess) merged.flagsProcess = mapped.flagsProcess;
        if (mapped.availableActions) merged.availableActions = mapped.availableActions;
        if (mapped.workItems) merged.workItems = mapped.workItems;
        if (mapped.openWorkItems) merged.openWorkItems = mapped.openWorkItems;
        if (mapped.perItems) merged.perItems = mapped.perItems;
        if (mapped.workItem) merged.workItem = mapped.workItem;

        // Giữ lại các field đặc biệt từ feedback từ doc (ưu tiên doc)
        if (doc.requestedAt) merged.requestedAt = doc.requestedAt;
        if (doc.givenAt) merged.givenAt = doc.givenAt;
        if (doc.completedAt) merged.completedAt = doc.completedAt;
        if (doc.receivedAt) merged.receivedAt = doc.receivedAt;
        if (doc.feedbackStatus) merged.feedbackStatus = doc.feedbackStatus;
        if (doc.myFeedbackStatus) merged.myFeedbackStatus = doc.myFeedbackStatus;
        if (doc.transferredBy) merged.transferredBy = doc.transferredBy;
        if (doc.requestNote) merged.requestNote = doc.requestNote;
        if (merged.color) {
          delete merged.colorDocumentNumber;
        } else {
          merged.colorDocumentNumber = '#2364B0';
        }

        return merged;
      }

      if (doc.documentType === 'outgoing' || (!doc.documentType && doc.document_id)) {
        if (doc.color) {
          delete doc.colorDocumentNumber;
        } else {
          doc.colorDocumentNumber = '#2364B0';
        }
      }

      return doc; // Giữ nguyên incoming documents 
    });

    return {
      ...result,
      data: mergedData,
    };
  }

  // 📌 GET danh sách cần cho ý kiến
  async listRequestFeedback(id: string) {
    const doc = await this.runtime.repo.getMyPendingFeedbackRequests(id);

    if (!doc) throw new NotFoundException('Không tìm thấy văn bản');

    return doc;
  }

  /**
   * Kiểm tra văn bản đi có đang ở trạng thái "Chờ ban hành" hay không.
   * Điều kiện: has_ban_hanh = 0 VÀ current_stage_status thuộc nhóm đang chờ phát hành.
   */
  private async checkIsChoBanHanh(documentId: string): Promise<boolean> {
    try {
      const row = await this.getOutgoingStateCached(documentId);
      if (!row || row.has_ban_hanh === 1) return false;

      const CHO_BAN_HANH_STATUSES = [
        stageStatusDoc.HT_VBTT,
        stageStatusDoc.BAN_HANH_TO_TRINH,
        'CAN_CHO_SO',
      ];
      const CHO_BAN_HANH_ACTIONS = [
        stageStatusDoc.KY_SO,
        stageStatusDoc.CHO_SO,
        stageStatusDoc.DONG_DAU,
        stageStatusDoc.KY_PHAT_HANH,
      ];

      if (CHO_BAN_HANH_STATUSES.includes(row.current_stage_status)) return true;
      if (
        row.current_stage_status === stageStatusDoc.CHUA_XU_LY &&
        CHO_BAN_HANH_ACTIONS.includes(row.current_action_code)
      ) return true;

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Kiểm tra văn bản đi đã được ban hành hay chưa.
   * Điều kiện: current_stage_status = 'DA_BAN_HANH' HOẶC has_ban_hanh = 1.
   */
  async checkIsDaBanHanh(documentId: string): Promise<boolean> {
    try {
      const row = await this.getOutgoingStateCached(documentId);
      if (!row) return false;

      return row.current_stage_status === stageStatusDoc.DA_BAN_HANH || row.has_ban_hanh === 1;
    } catch {
      return false;
    }
  }

  /**
   * Kiểm tra xem một bpmnVersion có hỗ trợ tùy chọn đóng dấu hay không.
   * @param bpmnVersion ID hoặc process key của quy trình BPMN
   */
  async checkBpmnStampOption(bpmnVersion: string): Promise<{ hasStampOption: boolean }> {
    if (!bpmnVersion) return { hasStampOption: false };

    try {
      const bpmnXML = await this.sqlRepo.getBpmnFile(bpmnVersion);
      if (!bpmnXML) return { hasStampOption: false };

      const { indexes } = await this.runtimeService.getModelFromXml(bpmnXML);
      const hasStampOption = Array.from(indexes.nodes.values()).some((node: any) => {
        const props = getAllNodeExtensionProperties(node);
        return props && props.isStamp !== undefined;
      });

      return { hasStampOption };
    } catch (error) {
      this.logger.error(`Lỗi kiểm tra stamp option cho bpmnVersion ${bpmnVersion}:`, error);
      return { hasStampOption: false };
    }
  }

  async getDetailsv1(documentId: string, userId: string, roles: string[], bpmn?: string, isAuthority?: string) {
    if (!userId) throw new BadRequestException('Vui lòng cung cấp userId');
    const bpmnXML = await this.runtime.repo.getBpmnFile('VAN_BAN_DI') || bpmn;
    const result = await this.runtime.getDetailsOutgoing({ bpmnXML, documentId, userContext: { userId, roles }, isAuthority });
    const bpmnXMLs = await this.runtime.repo.getBpmnFile(result?.document?.bpmnVersion) || bpmn;
    return this.runtime.getDetailsOutgoing({ bpmnXML: bpmnXMLs, documentId, userContext: { userId, roles }, isAuthority });

  }

  async getDetails(documentId: string, userId: string, roles: string[], bpmn?: string, isAuthority?: string, bpmnVersionFilter?: string) {
    try {
      if (!userId) throw new BadRequestException('Vui lòng cung cấp userId');
      const perfStartedAt = Date.now();
      const perfMarks: Array<{ stage: string; ms: number }> = [];
      const markPerf = (stage: string, startedAt: number) => {
        if (!ENABLE_OUTGOING_DETAIL_PERF_LOGS) return;
        perfMarks.push({ stage, ms: Date.now() - startedAt });
      };

      const latestAuditStartedAt = Date.now();
      const latestAuditId = await this.getLatestAuditIdByDocumentId(documentId);
      markPerf('getLatestAuditIdByDocumentId', latestAuditStartedAt);
      const detailCacheKey = this.buildOutgoingDetailCacheKey(
        documentId,
        userId,
        roles,
        isAuthority,
        bpmnVersionFilter,
        latestAuditId,
      );

      // Tạm thời không dùng inflight để test hiệu năng thực tế theo từng request/user riêng biệt.
      // return await this.runWithDetailInflight(detailCacheKey, async () => {
      return await (async () => {
        const poolStartedAt = Date.now();
        const pool = await this.getMsPool();
        markPerf('getMsPool', poolStartedAt);

        const mapSenderUnitInResult = async (result: any) => {
          if (!result || !result.document) return result;
          const senderUnitVal = result.document.senderUnit || result.document.sender_unit;
          const senderUnitStartedAt = Date.now();
          const mappedSenderUnit = await this.getSenderUnitDetailCached(senderUnitVal, pool);
          markPerf('getSenderUnitDetailCached', senderUnitStartedAt);
          if (mappedSenderUnit) {
            result.document.senderUnit = mappedSenderUnit;
          } else if (senderUnitVal && typeof senderUnitVal === 'object') {
            result.document.senderUnit = senderUnitVal;
          } else if (senderUnitVal) {
            const fallbackSenderUnit = {
              id: String(senderUnitVal),
              _id: String(senderUnitVal),
              name: String(senderUnitVal),
              code: null,
              type: null,
            };
            result.document.senderUnit = fallbackSenderUnit;
          } else {
            result.document.senderUnit = null;
          }
          if ('sender_unit' in result.document) {
            result.document.sender_unit = mappedSenderUnit ?? senderUnitVal ?? null;
          }
          return result;
        };

        // Lấy thông tin user để check unit
        const userParentStartedAt = Date.now();
        const receiverUnit = await this.getUserParentCached(userId, pool);
        markPerf('getUserParentCached', userParentStartedAt);

        const openWorkItemsStartedAt = Date.now();
        const openWorkItemsResult = await pool.request()
          .input('documentId', sql.NVarChar(100), String(documentId || '').trim())
          .query(`
            SELECT wi.id, wi.document_id, wi.node_id, wi.role, wi.assignee_user_id, wi.node_type, wi.state, wi.created_at, wi.bpmn_version
            FROM work_items wi
            WHERE wi.document_id = @documentId
              AND wi.state = 'open'
            ORDER BY wi.created_at DESC
          `);
        const openWorkItems = openWorkItemsResult.recordset || [];
        markPerf('getOpenWorkItemsDirect', openWorkItemsStartedAt);

        const preloadStartedAt = Date.now();
        const [doc, audit, outgoingState] = await Promise.all([
          this.runtime.repo.getOutgoingDocument(documentId, openWorkItems),
          this.runtime.repo.getAuditCached(documentId, latestAuditId),
          this.getOutgoingStateCached(documentId),
        ]);
        markPerf('parallel:getOutgoingDocument|getAuditCached|getOutgoingStateCached', preloadStartedAt);

        interface WorkItemRow {
          id: string;
          document_id: string;
          node_id: string;
          role: string;
          assignee_user_id: string;
          node_type: string;
          state: string;
          created_at: Date;
          bpmn_version?: string;
        }

        let activeWorkItems: WorkItemRow[] = openWorkItems;

        // 🎯 Nếu frontend gửi bpmnVersionFilter, chỉ lấy workItem có bpmn_version match
        if (bpmnVersionFilter) {
          activeWorkItems = activeWorkItems.filter(wi => wi.bpmn_version === bpmnVersionFilter);
        } else {
          activeWorkItems = activeWorkItems.filter(wi => wi.bpmn_version !== 'XIN_Y_KIEN');
        }

        // Tìm workItem mà user có thể xử lý
        let priorityWorkItem: WorkItemRow | null = null;
        let priorityBpmnVersion: string | null = null;
        let userHasWorkItem = false;
        const candidateWorkItems: WorkItemRow[] = [];

        for (const workItem of activeWorkItems) {
          const canProcess = (
            // Check assignee (giao cho user hoặc phòng ban)
            workItem.assignee_user_id === userId ||
            workItem.assignee_user_id === receiverUnit ||
            // Check role (vai trò trong workItem match với vai trò của user)
            (workItem.role && roles && roles.includes(workItem.role))
          );

          if (canProcess) {
            candidateWorkItems.push(workItem);
            priorityWorkItem = workItem;
            userHasWorkItem = true;
            // Ưu tiên dùng bpmn_version từ workItem nếu có
            priorityBpmnVersion = workItem.bpmn_version || null;
          }
        }

        // Kiểm tra quyền xem: chỉ check nếu user KHÔNG có workItem nào
        const adminCheckStartedAt = Date.now();
        const isAdmin = await checkAdminPermission(userId).catch(() => false);
        markPerf('checkAdminPermission', adminCheckStartedAt);
        if (!userHasWorkItem && !isAdmin) {
          try {
            const escapedUserId = String(userId).replace(/'/g, "''");
            const syncPermissionStartedAt = Date.now();
            const syncPermissionResult = await pool.request().query(`
              SELECT TOP 1 1 AS hasPermission
              FROM ${this.dbname}.dbo.document_permissions_outgoing dpo
              WHERE dpo.target_document_id = '${String(documentId).replace(/'/g, "''")}'
                AND (
                  dpo.target_user_id = '${escapedUserId}'
                  OR CONVERT(NVARCHAR(100), dpo.source_personal_profile_id) = '${escapedUserId}'
                )
            `);
            markPerf('query:document_permissions_outgoing:detail', syncPermissionStartedAt);
            const hasSyncPermission = syncPermissionResult.recordset.length > 0;
            if (hasSyncPermission) {
              userHasWorkItem = true;
            }

            if (!hasSyncPermission) {
              const assertViewStartedAt = Date.now();
              await this.runtime.repo.assertCanViewDetail(userId, documentId, 'OutgoingDocument', isAdmin);
              markPerf('assertCanViewDetail', assertViewStartedAt);
            }
          } catch (error) {
            // Nếu user không có quyền và cũng không có workItem, throw error
            throw error;
          }
        }

        // Nếu có workItem ưu tiên thì tính detail theo BPMN của workItem đó
        if (priorityWorkItem) {
          // Strategy 1: Dùng bpmn_version từ workItem (ưu tiên cao nhất)
          let detectedBpmnVersion = priorityBpmnVersion;

          // Strategy 2: Nếu workItem không có bpmn_version, query database để tìm
          if (!detectedBpmnVersion) {
            const nodeId = priorityWorkItem.node_id || '';

            try {
              const bpmnLookupStartedAt = Date.now();
              const bpmnLookupResult = await pool.request()
                .input('nodeId', sql.NVarChar(255), nodeId)
                .query(`
                SELECT DISTINCT bpmn_version
                FROM work_items wi
                WHERE wi.node_id = @nodeId
                  AND wi.bpmn_version IS NOT NULL
                ORDER BY wi.created_at DESC
              `);
              markPerf('query:lookupBpmnVersionByNodeId', bpmnLookupStartedAt);

              if (bpmnLookupResult.recordset.length > 0) {
                detectedBpmnVersion = bpmnLookupResult.recordset[0].bpmn_version;
              }
            } catch (error) {
              console.warn('Could not lookup BPMN version from node_id:', error);
            }
          }

          // Strategy 3: Fallback - dùng document's current bpmnVersion
          if (!detectedBpmnVersion) {
            detectedBpmnVersion = doc.bpmnVersion;
          }

          // Strategy 4: Ultimate fallback
          if (!detectedBpmnVersion) {
            detectedBpmnVersion = 'DEFAULT';
          }

          priorityBpmnVersion = detectedBpmnVersion;

          const priorityBpmnFileStartedAt = Date.now();
          const priorityBpmnXML = await this.runtime.repo.getBpmnFile(priorityBpmnVersion);
          markPerf(`getBpmnFile:${priorityBpmnVersion}`, priorityBpmnFileStartedAt);
          if (priorityBpmnXML) {
            try {
              // User có workItem nên không cần check quyền nữa
              const candidateResults: any[] = [];
              const workItemsForDetail = candidateWorkItems.length > 0
                ? candidateWorkItems
                : [priorityWorkItem];
              for (const workItem of workItemsForDetail) {
                const priorityDetailsStartedAt = Date.now();
                const priorityResultForWorkItem = await this.runtime.getDetailsOutgoing({
                  bpmnXML: priorityBpmnXML,
                  documentId,
                  userContext: { userId, roles },
                  isAuthority,
                  skipAssertCanView: true,
                  prefetchedDoc: doc,
                  prefetchedAudit: audit,
                  prefetchedOutgoingState: outgoingState,
                  prefetchedWorkItems: openWorkItems.filter((wi: any) => String(wi.id) === String(workItem.id)),
                });
                markPerf(`runtime.getDetailsOutgoing:priority:${priorityBpmnVersion}:${workItem.node_id}`, priorityDetailsStartedAt);
                candidateResults.push(priorityResultForWorkItem);
              }
              const priorityResult = candidateResults[0];

              // Kiểm tra có action executable không
              const mergedAvailableActions = new Map<string, any>();
              const mergedFlags = { ...(priorityResult?.flags || {}) };
              const mergedFlagsProcess = { ...(priorityResult?.flagsProcess || {}) };
              const mergedPerItems: any[] = [];

              for (const item of candidateResults) {
                for (const action of item?.availableActions || []) {
                  const actionKey = action?.code === 'TRA_LAI'
                    ? 'TRA_LAI'
                    : `${action.code || ''}_${action.flowId || ''}_${action.type || ''}_${action.nodeId || ''}_${action.workItemId || ''}`;
                  if (!mergedAvailableActions.has(actionKey)) {
                    mergedAvailableActions.set(actionKey, action);
                  }
                }

                for (const [key, value] of Object.entries(item?.flags || {})) {
                  (mergedFlags as any)[key] = (mergedFlags as any)[key] || value;
                }

                for (const [key, value] of Object.entries(item?.flagsProcess || {})) {
                  (mergedFlagsProcess as any)[key] = (mergedFlagsProcess as any)[key] || value;
                }

                if (Array.isArray(item?.perItems)) {
                  mergedPerItems.push(...item.perItems);
                }
              }

              priorityResult.availableActions = Array.from(mergedAvailableActions.values());
              priorityResult.flags = mergedFlags;
              priorityResult.flagsProcess = mergedFlagsProcess;
              if (mergedPerItems.length > 0) {
                priorityResult.perItems = mergedPerItems;
              }

              const hasExecutableInPriority =
                Array.isArray(priorityResult?.availableActions) &&
                priorityResult.availableActions.some((action: any) => action?.canExecute === true);
              if (hasExecutableInPriority) {
                const priorityFlagsStartedAt = Date.now();
                const [isChoBanHanh, isDaBanHanh] = await Promise.all([
                  this.checkIsChoBanHanh(documentId),
                  this.checkIsDaBanHanh(documentId),
                ]);
                markPerf('parallel:checkIsChoBanHanh|checkIsDaBanHanh:priority', priorityFlagsStartedAt);
                if (priorityResult.document) {
                  priorityResult.document.openWorkItems = openWorkItems.map((wi: any) => ({
                    id: String(wi.id),
                    nodeId: wi.nodeId ?? wi.node_id,
                    role: wi.role,
                    assigneeUserId: wi.assigneeUserId ?? wi.assignee_user_id,
                    nodeType: wi.nodeType ?? wi.node_type,
                    state: wi.state,
                  }));
                  priorityResult.document.isChoBanHanh = isChoBanHanh;
                  priorityResult.document.isDaBanHanh = isDaBanHanh;

                }
                await this.attachExecutionModeToOutgoingDetail(documentId, priorityResult);
                await mapSenderUnitInResult(priorityResult);
                if (ENABLE_OUTGOING_DETAIL_PERF_LOGS) {
                  this.logger.log(
                    `[OutgoingDetailPerf] doc=${documentId} user=${userId} total=${Date.now() - perfStartedAt}ms stages=${perfMarks
                      .map((item) => `${item.stage}:${item.ms}ms`)
                      .join(' | ')}`,
                  );
                }
                return priorityResult;
              }
            } catch (priorityError) {
              console.warn(`Could not get details for priority BPMN version ${priorityBpmnVersion}:`, priorityError.message);
              // Continue to fallback
            }
          }
        }

        // Fallback: Tính detail theo bpmnVersion của document hoặc workItems
        let fallbackBpmnVersion = doc?.bpmnVersion;

        // Nếu document không có bpmnVersion, tìm từ workItems (loại trừ XIN_Y_KIEN)
        if (!fallbackBpmnVersion) {
          try {
            const fallbackVersionStartedAt = Date.now();
            const versionResult = await pool.request()
              .input('documentId', sql.NVarChar(100), documentId)
              .query(`
              SELECT DISTINCT TOP 5 wi.bpmn_version
              FROM work_items wi
              WHERE wi.document_id = @documentId
                AND wi.bpmn_version IS NOT NULL
              ORDER BY wi.created_at DESC
            `);
            markPerf('query:lookupFallbackBpmnVersionByDocumentId', fallbackVersionStartedAt);
            if (versionResult.recordset.length > 0) {
              fallbackBpmnVersion = versionResult.recordset[0].bpmn_version;
            }
          } catch (error) {
            console.warn('Could not find available BPMN versions for fallback:', error);
          }
        }

        // Ultimate fallback nếu không tìm được gì
        if (!fallbackBpmnVersion) {
          fallbackBpmnVersion = 'DEFAULT';
        }

        try {
          const fallbackBpmnFileStartedAt = Date.now();
          const fallbackBpmnXML = await this.runtime.repo.getBpmnFile(fallbackBpmnVersion) || bpmn;
          markPerf(`getBpmnFile:${fallbackBpmnVersion}`, fallbackBpmnFileStartedAt);
          // User có quyền xem (đã check ở trên) hoặc có workItem
          const fallbackDetailsStartedAt = Date.now();
          const fallbackResult = await this.runtime.getDetailsOutgoing({
            bpmnXML: fallbackBpmnXML,
            documentId,
            userContext: { userId, roles },
            isAuthority,
            skipAssertCanView: true,
            prefetchedDoc: doc,
            prefetchedAudit: audit,
            prefetchedOutgoingState: outgoingState,
            prefetchedWorkItems: openWorkItems,
          });
          markPerf(`runtime.getDetailsOutgoing:fallback:${fallbackBpmnVersion}`, fallbackDetailsStartedAt);

          // Bổ xung logic kiểm tra trạng thái văn bản đi, cho phép phát hành thêm nếu đã ban hành
          const fallbackFlagsStartedAt = Date.now();
          const [lastAuditInDoc, isChoBanHanh, isDaBanHanh] = await Promise.all([
            this.getLastAuditInDocument(documentId, userId),
            this.checkIsChoBanHanh(documentId),
            this.checkIsDaBanHanh(documentId),
          ]);
          markPerf('parallel:getLastAuditInDocument|checkIsChoBanHanh|checkIsDaBanHanh:fallback', fallbackFlagsStartedAt);
          if (lastAuditInDoc) {
            const checkExisIncommingDoc = this.checkOutgoingReleased(lastAuditInDoc);
            if (checkExisIncommingDoc) {
              if (fallbackResult.flags && Object.keys(fallbackResult.flags).length > 0) {
                fallbackResult.flags.canAdditionalRelease = true
              } else {
                fallbackResult.flags = { canAdditionalRelease: true }
              }
            }

            const checkCanRecallInternalReceiveUnit = this.checkOutgoingRecallInternalReceiveUnit(lastAuditInDoc, userId);
            if (checkCanRecallInternalReceiveUnit) {
              if (fallbackResult.availableActions && fallbackResult.availableActions.length === 0) {
                fallbackResult.availableActions = [];
              }
              fallbackResult.availableActions.push({
                code: 'THU_HOI_DON_VI_NHAN_NOI_BO',
                label: 'Thu hồi đơn vị nhận nội bộ',
                type: 'recallInternalReceiveUnit'
              });
              if (!fallbackResult.flags || Object.keys(fallbackResult.flags).length === 0) {
                fallbackResult.flags = {};
              }
              fallbackResult.flags.recallInternalReceiveUnit = true
            }
          }
          if (fallbackResult.document) {
            fallbackResult.document.isChoBanHanh = isChoBanHanh;
            fallbackResult.document.isDaBanHanh = isDaBanHanh;
          }
          await this.attachExecutionModeToOutgoingDetail(documentId, fallbackResult);
          await mapSenderUnitInResult(fallbackResult);
          if (ENABLE_OUTGOING_DETAIL_PERF_LOGS) {
            this.logger.log(
              `[OutgoingDetailPerf] doc=${documentId} user=${userId} total=${Date.now() - perfStartedAt}ms stages=${perfMarks
                .map((item) => `${item.stage}:${item.ms}ms`)
                .join(' | ')}`,
            );
          }
          return fallbackResult;
        } catch (fallbackError) {
          console.error(`Could not get details with fallback BPMN version ${fallbackBpmnVersion}:`, fallbackError.message);
          // If all versions fail, throw error
          throw fallbackError;
        }
      })();

    } catch (error) {
      console.error('Error in getDetails:', error);
      throw error;
    }
  }


  // 📌 GET DETAIL
  async detail(id: string, userId: any) {
    // const doc = await this.runtime.repo.getOutgoingDocumentById(id);
    const doc = await this.runtime.repo.getOutgoingDetails(id, userId);

    if (!doc) throw new NotFoundException('Không tìm thấy văn bản');

    return doc;
  }

  // 📌 CREATE
  async create(data: any, userId: string) {
    if (!userId) throw new BadRequestException('Vui lòng cung cấp userId');

    // Kiểm tra bắt buộc đơn vị nhận (Chỉ kiểm tra nếu không phải là lưu nháp)
    // if (!data.fromCreateDraf && (!data.internalReceivingDept || !Array.isArray(data.internalReceivingDept) || data.internalReceivingDept.length === 0)) {
    //   throw new BadRequestException('Vui lòng chọn ít nhất một đơn vị nhận');
    // }

    await this.runtime.repo.assertFieldsValid(data, 'OutgoingDocument');

    // Validate: VB thay thế phải cùng luồng quy trình
    const bpmnVersion = data.bpmnVersion || data.typeOfProcess;
    if (data.docReplacement && bpmnVersion) {
      await this.validateReplacementDocsBpmnVersion(data.docReplacement, bpmnVersion);
    }

    try {
      return await this.runtime.repo.createOutgoingDocument(data, data.receivers);
    } catch (error) {
      console.error('Error creating outgoing document:', error);
      throw new BadRequestException(`Không thể tạo văn bản. Vui lòng thử lại. Lỗi: ${error.message}`);
    }

  }

  async update(id: string, data: any, userId?: string) {
    const pool2 = await this.getMsPool();

    // Lấy thông tin chi tiết văn bản
    const docRes = await pool2.request()
      .input('id', sql.NVarChar(100), id)
      .query(`
        SELECT id, document_id, drafter, bpmn_version, doc_replacement 
        FROM ${this.dbname}.dbo.outgoing_documents 
        WHERE (id = TRY_CAST(@id AS INT) OR document_id = @id) AND status = 1
      `);
    const dbDoc = docRes.recordset?.[0];
    if (!dbDoc) {
      throw new NotFoundException(`Không tìm thấy văn bản đi: ${id}`);
    }
    const documentId = dbDoc.document_id;
    const bpmnVersion = dbDoc.bpmn_version || 'DEFAULT';

    // Nếu có userId, kiểm tra phân quyền chỉnh sửa văn bản
    if (userId) {
      // 1. Lấy lịch sử xử lý (audits) sắp xếp giảm dần theo id
      const auditsRes = await pool2.request()
        .input('documentId', sql.VarChar(100), documentId)
        .query(`
          SELECT id, action_code AS actionCode, stage_status AS stageStatus, updated_at AS updatedAt, created_at AS createdAt
          FROM ${this.dbname}.dbo.audit
          WHERE document_id = @documentId
          ORDER BY id DESC
        `);
      const audits = auditsRes.recordset || [];

      // 2. Lấy danh sách công việc đang xử lý (open work items)
      const workItemsRes = await pool2.request()
        .input('documentId', sql.VarChar(100), documentId)
        .query(`
          SELECT assignee_user_id AS assigneeUserId, role, state 
          FROM ${this.dbname}.dbo.work_items 
          WHERE document_id = @documentId AND state = 'open'
        `);
      const openWorkItems = workItemsRes.recordset || [];

      // 3. Lấy quyền của người dùng theo BPMN flow
      const userRolesResult = await this.sqlRepo.getUserRole(userId, bpmnVersion).catch(() => ({ roles: [] }));
      const userRoles = userRolesResult?.roles || [];
      const userObj = await this.sqlsvRepo.getUserById(userId).catch(() => null);
      const userOrgId = userObj?.parent?.id || null;

      // 4. Kiểm tra phân quyền qua Policy
      const permission = DocumentPolicy.validateUpdatePermission(
        userId,
        { drafter: dbDoc.drafter },
        audits,
        openWorkItems,
        userRoles,
        userOrgId
      );

      if (!permission.allowed) {
        throw new ForbiddenException(permission.reason);
      }
    }

    if (dbDoc && data) {
      data.drafter = dbDoc.drafter;
    }
    const dataForValidation = { ...data };
    if (!dataForValidation.internalReceivingDept || (Array.isArray(dataForValidation.internalReceivingDept) && dataForValidation.internalReceivingDept.length === 0)) {
      dataForValidation.internalReceivingDept = ['DUMMY_DEPT'];
    }
    if (!dataForValidation.textSymbols) {
      dataForValidation.textSymbols = 'DUMMY_SYM';
    }
    if (!dataForValidation.toBookTextSymbols) {
      dataForValidation.toBookTextSymbols = 'DUMMY_SYM';
    }
    await this.runtime.repo.validateRequiredTextFields(dataForValidation, 'OutgoingDocument', data?.reqSignFormatDraft);

    await this.runtime.repo.assertFieldsValid(data, 'OutgoingDocument');

    // Validate: VB thay thế phải cùng luồng quy trình
    // LUÔN LUÔN kiểm tra từ DB: lấy doc_replacement và bpmn_version hiện tại trong DB
    // để đảm bảo dù FE gửi hay không gửi các field này, validation vẫn chạy đúng
    // Ưu tiên: FE gửi > DB
    const docReplacementToCheck = data.docReplacement || dbDoc?.doc_replacement;
    const finalBpmnVersion = data.bpmnVersion || data.bpmn_version || data.typeOfProcess || data.type_of_process || dbDoc?.bpmn_version;

    if (docReplacementToCheck && finalBpmnVersion) {
      await this.validateReplacementDocsBpmnVersion(docReplacementToCheck, finalBpmnVersion);
    }

    return await this.runtime.repo.updateOutgoingDocument(id, data, data.receivers);
  }

  /**
   * Kiểm tra tất cả VB thay thế phải cùng luồng quy trình với VB hiện tại.
   * Nếu không khớp → throw BadRequestException với message tiếng Việt.
   */
  private async validateReplacementDocsBpmnVersion(
    docReplacement: string | any[],
    currentBpmnVersion: string,
  ) {
    // Parse docReplacement nếu là string JSON
    let replacements: any[];
    if (typeof docReplacement === 'string') {
      try {
        replacements = JSON.parse(docReplacement);
      } catch {
        return; // Không parse được → bỏ qua
      }
    } else {
      replacements = docReplacement;
    }

    if (!Array.isArray(replacements) || replacements.length === 0) return;

    // Lấy danh sách documentId của VB thay thế
    const replacementIds = replacements
      .map(r => r.documentId || r.document_id || r.id)
      .filter(Boolean);

    if (replacementIds.length === 0) return;

    // Query DB kiểm tra VB thay thế có cùng luồng quy trình không
    const pool = await this.getMsPool();
    const request = pool.request();

    // Input params cho từng VB thay thế
    replacementIds.forEach((id, i) => request.input(`rep${i}`, sql.NVarChar, id));
    request.input('bpmn', sql.NVarChar, currentBpmnVersion);

    const placeholders = replacementIds.map((_, i) => `@rep${i}`).join(',');

    const result = await request.query(`
      DECLARE @currentCode NVARCHAR(100);
      SELECT TOP 1 @currentCode = id FROM ${this.dbname}.dbo.bpmn_design
      WHERE id = @bpmn OR name = @bpmn;

      IF @currentCode IS NULL SET @currentCode = @bpmn;

      SELECT document_id FROM ${this.dbname}.dbo.outgoing_documents
      WHERE document_id IN (${placeholders})
        AND bpmn_version != @currentCode
        AND status = 1
    `);

    if (result.recordset.length > 0) {
      throw new BadRequestException(
        'Văn bản thay thế không cùng luồng quy trình. Vui lòng chọn lại.'
      );
    }
  }

  // 📌 DELETE (nhiều ID)
  async delete(documentIds: string[]) {
    if (!documentIds?.length)
      throw new BadRequestException('Vui lòng cung cấp danh sách ID');

    return await this.runtime.repo.deleteOutgoingDocuments(documentIds);
  }

  // SET NUMBER
  async setNumber(data: any, userId: string) {
    const wi = await this.runtime.repo.getWorkItem(data.docIds?.[0], data.workItemId);
    if (data.toBook === undefined || data.toBook === null) {
      throw new HttpException(
        {
          message: 'Vui lòng nhập số văn bản',
        },
        HttpStatus.BAD_REQUEST
      );
    }
    if (!wi) throw new BadRequestException('WorkItem not found or already completed');
    try {
      return await this.runtime.repo.setNumber(data, userId, wi);
    } catch (err: any) {
      if (err.message === 'TO_BOOK_CONFLICT') {
        throw new HttpException(
          {
            message: `Số ${data.toBook} đã tồn tại. Số gợi ý: ${err.suggestedToBook}`,
          },
          HttpStatus.CONFLICT
        );
      }
      throw err;
    }
  }

  private async resolveOutgoingDocumentIdFromFile(fileId: number): Promise<string | null> {
    const parsedFileId = Number(fileId);
    if (Number.isNaN(parsedFileId)) {
      return null;
    }

    const pool = await this.getPool();
    const request = pool.request();
    request.input('fileId', parsedFileId);

    const result = await request.query(`
      SELECT TOP 1 fr.object_id AS objectId
      FROM ${this.dbname}.dbo.file_relations fr
      WHERE fr.file_id = @fileId
        AND fr.status = 1
        AND fr.object_type IN ('docProposal', 'docDraft', 'docAttachments', 'docAnswer', 'docRecall', 'docReplacement')
      ORDER BY fr.id DESC
    `);

    const row = result.recordset?.[0];
    if (row?.objectId) {
      return String(row.objectId);
    }

    const fallbackResult = await pool.request()
      .input('fileId', parsedFileId)
      .query(`
        SELECT TOP 1 fr.object_id AS objectId
        FROM ${this.dbname}.dbo.file_relations fr
        WHERE fr.file_id = @fileId
          AND fr.status = 1
          AND fr.object_type LIKE 'doc%'
        ORDER BY fr.id DESC
      `);

    const fallbackRow = fallbackResult.recordset?.[0];
    return fallbackRow?.objectId ? String(fallbackRow.objectId) : null;
  }

  private async assertUserCanUpdateSignNumber(fileId: number, userId: string) {
    const documentId = await this.resolveOutgoingDocumentIdFromFile(fileId);
    if (!documentId) {
      throw new ForbiddenException('Không tìm thấy văn bản liên quan hoặc bạn không có quyền cập nhật ký số.');
    }

    const auditRows = await this.sqlRepo.getAudit(documentId);
    const allowed = DocumentPolicy.canUpdateSignNumber(
      { userId },
      auditRows,
    );

    if (!allowed) {
      throw new ForbiddenException('Bạn không có quyền cập nhật trạng thái ký số văn bản đi');
    }
  }

  private async resolveLatestFileIdByDocumentId(documentId: string): Promise<number | null> {
    const normalizedDocId = String(documentId || '').trim();
    if (!normalizedDocId) return null;

    const pool = await this.getPool();
    const request = pool.request();
    request.input('documentId', normalizedDocId);

    const result = await request.query(`
      SELECT TOP 1 fr.file_id AS fileId
      FROM ${this.dbname}.dbo.file_relations fr
      INNER JOIN ${this.dbname}.dbo.files f ON f.id = fr.file_id
      WHERE fr.status = 1
        AND f.status = 1
        AND fr.object_id = @documentId
        AND fr.object_type IN ('docProposal', 'docDraft', 'docAttachments', 'docAnswer', 'docRecall', 'docReplacement')
      ORDER BY fr.id DESC
    `);

    const fileId = result.recordset?.[0]?.fileId;
    return fileId !== null && fileId !== undefined ? Number(fileId) : null;
  }

  private async resolveSignNumberFileId(id: string): Promise<number | null> {
    const raw = String(id || '').trim();
    if (!raw) return null;

    const internalFileId = await this.filesRepository.resolveInternalId(raw);
    if (internalFileId) {
      return Number(internalFileId);
    }

    return this.resolveLatestFileIdByDocumentId(raw);
  }

  async updateIsSignNumber(id: string, isNumbered: number, userId: string) {
    if (!userId) {
      throw new BadRequestException('Vui lòng cung cấp userId');
    }

    const fileId = await this.resolveSignNumberFileId(id);
    if (!fileId || !Number.isFinite(fileId) || fileId <= 0) {
      throw new BadRequestException('Không tìm thấy file hợp lệ từ id được gửi lên');
    }

    await this.assertUserCanUpdateSignNumber(fileId, userId);
    await this.runtime.repo.updateIsSignNumber(fileId, isNumbered);
    return {
      status: 1,
      message: 'Updated isSignNumber successfully',
    };
  }

  // runtime-db.service.ts
  async requestLeadershipFeedback(user: any, dto: any, workItemId: string, bpmnXML: string, allowedUnitIds: string[]) {
    const currentUserId = user.userId || user.id || user._id?.toString() || user;

    const result = await this.runtime.requestLeadershipFeedback({
      docIds: dto.docIds,
      commanders: dto.commanders,
      note: dto.note,
      proposer: dto.proposer,
      currentUserId,
      workItemId,
      bpmnFeedbackXML: bpmnXML,
      allowedUnitIds,
      isPeerFeedback: dto.isPeerFeedback || false,
      role: dto.role,
    });

    return { success: true, ...result };
  }
  async transferOpinion(user: any, dto: any, workItemId: string, unit: any, bpmnXML: string) {
    const currentUserId = user.userId || user.id || user._id?.toString();

    const result = await this.runtime.transferOpinion({
      docIds: dto.docIds,
      // commanders: dto.commanders,
      bpmnXML,
      unit: unit,
      note: dto.note,
      proposer: dto.proposer,
      currentUserId,
      workItemId
    });

    return { success: true, ...result };
  }

  async outgoingRecipients({ page = 1, limit = 20, userId, filter, sort, processFn, isExport, countOnly }) {
    // ==========================================
    // PHASE 1: Parse & Initialize
    // ==========================================
    const pageNum = Math.max(Number(page) || 1, 1);
    let limitNum = Math.min(Number(limit) || 20, 100);
    if (isExport === 'true') {
      limitNum = 9999;
    }
    const offsetNum = (pageNum - 1) * limitNum;

    // ==========================================
    // PHASE 2: Get Context & User Groups
    // ==========================================
    const pool = await this.getMsPool();
    const [userRoleRes, featureManagement, userRes] = await Promise.all([
      this.userService.getUserRole(userId),
      this.featureManagementRepo.findOne({
        where: { code: processFn, status: 1, statusFeature: StatusFeature.ACTIVE }
      }),
      pool.request().query(
        `SELECT id, parent AS parentId FROM ${this.dbname}.dbo.users WHERE id = '${userId}'`
      )
    ]);

    const escapedUserId = userId.replace(/'/g, "''");
    const groupsRes = await pool.request().query(`
      SELECT DISTINCT group_user_id
      FROM (
        SELECT ugu.group_user_id
        FROM ${this.dbname}.dbo.user_group_users ugu
        WHERE ugu.user_id = '${escapedUserId}'

        UNION

        SELECT gu.id AS group_user_id
        FROM ${this.dbname}.dbo.group_users gu
        WHERE ISJSON(gu.userId) = 1
          AND EXISTS (
            SELECT 1
            FROM OPENJSON(gu.userId) j
            WHERE (
              CASE WHEN j.[type] = 5
                THEN COALESCE(
                  JSON_VALUE(j.[value], '$.id'),
                  JSON_VALUE(j.[value], '$.userId')
                )
                ELSE CONVERT(NVARCHAR(100), j.[value])
              END
            ) = '${escapedUserId}'
          )
      ) src
    `);
    const userGroupIds = groupsRes.recordset.map((r: any) => String(r.group_user_id)).filter(Boolean);

    let viewerGroupCond = '';
    if (userGroupIds.length > 0) {
      const escapedGroupIds = userGroupIds.map(id => id.replace(/'/g, "''"));
      const groupList = escapedGroupIds.map(id => `'${id}'`).join(',');
      viewerGroupCond = `
        OR (
          ISJSON(outgoing_documents.document_viewer_groups) = 1
          AND EXISTS (
            SELECT 1
            FROM OPENJSON(outgoing_documents.document_viewer_groups)
            WHERE (
              CASE WHEN [type] = 5
                THEN COALESCE(
                  JSON_VALUE([value], '$.groupId'),
                  JSON_VALUE([value], '$.id')
                )
                ELSE CONVERT(NVARCHAR(100), [value])
              END
            ) IN (${groupList})
          )
        )
      `;
    }

    const knowReceiverCond = `
      OR (
        ISJSON(outgoing_documents.know_receivers) = 1
        AND EXISTS (
          SELECT 1
          FROM OPENJSON(outgoing_documents.know_receivers)
          WHERE (
            CASE WHEN [type] = 5
              THEN JSON_VALUE([value], '$.id')
              ELSE CONVERT(NVARCHAR(100), [value])
            END
          ) = '${escapedUserId}'
        )
      )
    `;

    const syncPermissionCond = `
      OR EXISTS (
        SELECT 1
        FROM ${this.dbname}.dbo.document_permissions_outgoing dpo
        WHERE dpo.target_document_id = outgoing_documents.document_id
          AND (
            dpo.target_user_id = '${escapedUserId}'
            OR CONVERT(NVARCHAR(100), dpo.source_personal_profile_id) = '${escapedUserId}'
          )
      )
    `;

    const { roles } = userRoleRes;
    const isClerical = await this.userService.checkVanThuTct(userId);
    const receiverUnit = userRes.recordset[0]?.parentId || null;
    const userContext = { userId, roles, receiverUnit };
    const isAdmin = await checkAdminPermission(userId).catch(() => false);


    // ==========================================
    // PHASE 3: Build Criteria & Filters
    // ==========================================
    const criteria: Array<{ name: string; operator: string; value: string | string[] }> = [];
    let internalReceivingUnitFilter: string | null = null;
    if (filter && typeof filter === 'object') {
      for (const [key, value] of Object.entries(filter)) {
        if (!value) continue;
        if (key === 'internal_receiving_unit') {
          internalReceivingUnitFilter = String(value).replace(/'/g, "''");
          continue;
        }
        if (typeof value === 'object') {
          const val = value as { startDate?: string; endDate?: string; value?: string };
          if (val.startDate && val.endDate) criteria.push({ name: key, operator: 'between', value: [val.startDate, val.endDate] });
          else if (val.startDate) criteria.push({ name: key, operator: 'gte', value: val.startDate });
          else if (val.endDate) criteria.push({ name: key, operator: 'lte', value: val.endDate });
          else if (val.value !== undefined) criteria.push({ name: key, operator: 'like', value: val.value });
        } else {
          criteria.push({ name: key, operator: typeof value === 'string' ? 'like' : 'eq', value: String(value) });
        }
      }
    }

    const featureCriteria = featureManagement?.criteria ?? [];
    const { sql: filterFeature, joins: filterJoins } = buildDocumentCriteriaHelper(
      [...featureCriteria, ...criteria],
      'outgoing_documents',
      featureManagement
    );

    const whereParts: string[] = [];
    if (filterFeature) whereParts.push(`(${filterFeature})`);
    if (isAdmin && (filter?.isDeleted === '1' || filter?.isDeleted === 'true')) {
      whereParts.push('outgoing_documents.status = 3');
    } else {
      whereParts.push('outgoing_documents.status = 1');
    }

    if (internalReceivingUnitFilter) {
      whereParts.push(`(
        (ISJSON(outgoing_documents.internal_receiving_dept) = 1
          AND EXISTS (SELECT 1 FROM OPENJSON(outgoing_documents.internal_receiving_dept) WHERE value = '${internalReceivingUnitFilter}'))
        OR (ISJSON(outgoing_documents.internal_receiving_unit) = 1
          AND EXISTS (SELECT 1 FROM OPENJSON(outgoing_documents.internal_receiving_unit) WHERE value = '${internalReceivingUnitFilter}'))
      )`);
    }

    if (filter?.isStar === '1' || filter?.isStar === 'true') {
      whereParts.push(` EXISTS ( SELECT 1 FROM ${this.dbname}.dbo.document_star ds WHERE ds.document_id = outgoing_documents.document_id AND ds.user_id = '${userId}' AND ds.step = '${processFn}' ) `);
    }
    if (filter?.isStar === '0' || filter?.isStar === 'false') {
      whereParts.push(` NOT EXISTS ( SELECT 1 FROM ${this.dbname}.dbo.document_star ds WHERE ds.document_id = outgoing_documents.document_id AND ds.user_id = '${userId}' AND ds.step = '${processFn}' ) `);
    }
    const whereClause = whereParts.length ? ' WHERE ' + whereParts.join(' AND ') : '';

    // ==========================================
    // PHASE 4: Build SQL Clauses (SELECT, JOIN, WHERE)
    // ==========================================
    const excludeKeys = ['files', 'statusCode', 'status_code'];
    const { dbKeys, aliases, allViewFields } = await this.configurationService.buildSelectFieldsNew('outgoing_documents', excludeKeys, processFn);

    const keyDefaultParts: string[] = [];
    if (allViewFields.includes('statusCode') || allViewFields.includes('status_code')) {
      keyDefaultParts.push(`( SELECT TOP 1 a.action_code FROM ${this.dbname}.dbo.audit a WHERE a.document_id = outgoing_documents.document_id ORDER BY a.id DESC ) AS status_code`);
    }
    keyDefaultParts.push(`CASE WHEN EXISTS (
        SELECT 1 FROM ${this.dbname}.dbo.document_star ds
        WHERE ds.document_id = outgoing_documents.document_id
          AND ds.user_id = '${userId}'
          AND ds.step = '${processFn}'
    ) THEN 1 ELSE 0 END AS isStar`);
    keyDefaultParts.push(`ocs.current_stage_status AS stageStatus`);
    aliases['isStar'] = 'is_star';
    aliases['stageStatus'] = 'stage_status';
    const selectFieldsArray = [
      ...(keyDefaultParts.length ? [keyDefaultParts.join(', ')] : []),
      ...dbKeys
    ];
    const selectFields = selectFieldsArray.join(',');

    const orderBy = ' ORDER BY ' + parseSort(sort, aliases, 'outgoing_documents');

    const joinAudit = `
    OUTER APPLY (
        SELECT TOP 1 *
        FROM ${this.dbname}.dbo.audit a
        WHERE a.document_id = outgoing_documents.document_id
          AND (a.receiver='${userId}' ${receiverUnit ? `OR a.receiver_unit='${receiverUnit}'` : ''})
        ORDER BY
            CASE a.stage_status
                WHEN '${stageStatusDoc.DA_BAN_HANH}' THEN 1
                ELSE 99
            END,
            a.id DESC
    ) la
    `;
    let joinClause = '';
    if (filterJoins) joinClause += ' ' + filterJoins;
    let visibilityCondition = isClerical
      ? `AND (la.id IS NOT NULL ${viewerGroupCond} ${syncPermissionCond} OR (
          (SELECT TOP 1 a_global.stage_status 
           FROM ${this.dbname}.dbo.audit a_global 
           WHERE a_global.document_id = outgoing_documents.document_id 
           ORDER BY a_global.id DESC) NOT IN ('1', 'DRAFT', 'CREATE', 'CHUA_XU_LY')
          AND NULLIF(LTRIM(RTRIM(CONVERT(NVARCHAR(MAX), outgoing_documents.abstract_note))), '') IS NOT NULL
        ))`
      : `AND (la.id IS NOT NULL ${knowReceiverCond} ${viewerGroupCond} ${syncPermissionCond})`;

    if (isAdmin) {
      visibilityCondition = '';
    }


    // ==========================================
    // PHASE 5: Execute SQL Queries (COUNT & DATA)
    // ==========================================
    const totalSql = `
    SELECT COUNT(*) AS total
    FROM ${this.dbname}.dbo.outgoing_documents
    ${joinAudit}
    ${joinClause}
    ${whereClause}
    ${visibilityCondition}
    `;
    const totalResult = await pool.request().query(totalSql);
    const total = totalResult.recordset[0]?.total ?? 0;
    if (countOnly === 'true') { return { total: total }; };
    if (!total) return { success: true, items: [], mesage: "Không có dữ liệu", total: 0, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum), isAdmin: isAdmin === true };

    const dataSql = `
      SELECT ${selectFields}
      FROM ${this.dbname}.dbo.outgoing_documents
      LEFT JOIN ${this.dbname}.dbo.outgoing_current_state ocs
        ON ocs.document_id = outgoing_documents.document_id
      ${joinAudit}
      ${joinClause}
      ${whereClause}
      ${visibilityCondition}
      ${orderBy}
      OFFSET ${offsetNum} ROWS FETCH NEXT ${limitNum} ROWS ONLY
      `;
    const rowsResult = await pool.request().query(dataSql);
    const items: DocumentRow[] = rowsResult.recordset;

    // ==========================================
    // PHASE 6: Fetch Related Data (Not needed for recipients)
    // ==========================================

    // ==========================================
    // PHASE 7: Load BPMN Processes
    // ==========================================
    const bpmnVersions = [
      ...new Set(items.map(d => d.bpmn_version)
        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0 && v.toUpperCase() !== 'NULL')),
    ];

    const bpmnEngineMap = await this.loadBpmnProcessesCached(bpmnVersions, receiverUnit);

    // ==========================================
    // PHASE 8: Map Details & Keys
    // ==========================================
    // const detailedItems = await this.mapDocumentDetailsOutgoing(items, bpmnEngineMap, userContext, aliases);
    const detailedItemsMapped = await this.mapDocOutgoingKeysForList(items, aliases, undefined, undefined, isExport);
    if (isAdmin) {
      detailedItemsMapped.forEach((item: any) => {
        item.isAdmin = true;
      });
    }
    return { success: true, items: detailedItemsMapped, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum), isAdmin: isAdmin === true };

  }

  /**
   * Kiểm tra xem document đã được lưu lần đầu chưa
   * Nếu abstractNote trống → chưa lưu lần nào → là lần tạo mới
   */
  async isFirstSave(documentId: string): Promise<boolean> {
    const doc = await this.outgoingRepo.findOne({
      where: { id: Number(documentId) },
      select: ['abstractNote'],
    });
    return !doc?.abstractNote;
  }

  async markViewed(documentId: string, userId: string) {
    const doc = await this.outgoingRepo.findOne({
      where: { documentId },
    });

    if (!doc) {
      throw new NotFoundException('Không tìm thấy văn bản');
    }

    const userGroupIds = await this.getUserGroupIdsCached(userId);
    const parseIdArray = (raw: any): string[] => {
      if (!raw) return [];
      let value = raw;
      if (typeof raw === 'string') {
        try {
          value = JSON.parse(raw);
        } catch {
          value = [];
        }
      }
      return Array.isArray(value)
        ? value
          .map((item: any) => String(item?.id ?? item?.groupId ?? item).trim())
          .filter(Boolean)
        : [];
    };

    const know_receivers: string[] = parseIdArray(doc.knowReceivers);
    const documentViewerGroups: string[] = parseIdArray(doc.documentViewerGroups);

    let hasPermission = know_receivers.includes(userId);
    if (!hasPermission && documentViewerGroups.length > 0) {
      hasPermission = documentViewerGroups.some(gId => userGroupIds.includes(gId));
    }

    if (!hasPermission) {
      throw new ForbiddenException('Bạn không có quyền đánh dấu đã xem văn bản');
    }

    const viewed: string[] = doc.vieweds ? JSON.parse(doc.vieweds) : [];

    const newViewers = know_receivers.filter((id) => id !== userId);
    const newViewed = viewed.includes(userId) ? viewed : [...viewed, userId];

    doc.knowReceivers = JSON.stringify(newViewers);
    doc.vieweds = JSON.stringify(newViewed);

    await this.outgoingRepo.save(doc);

    return { message: 'Đã đánh dấu đã xem văn bản', knowReceivers: newViewers, viewed: newViewed };
  }

  /**
   * Hàm dùng chung để xử lý filter criteria với các giá trị đặc biệt
   * Hỗ trợ: to_date, over_date, is_limited cho bất kỳ trường nào
   * @param filter - Object filter từ query
   * @param criteria - Mảng criteria để push vào
   * @returns Object chứa trackedFields (Set các field đã được track để xử lý IS NOT NULL)
   */
  private processFilterCriteria(
    filter: Record<string, any>,
    criteria: Array<{ name: string; operator: string; value: string | string[] }>
  ): { trackedFields: Set<string> } {
    const trackedFields = new Set<string>(); // Track các field cần xử lý IS NOT NULL

    if (!filter || typeof filter !== 'object') {
      return { trackedFields };
    }

    // Xử lý các filter đặc biệt liên quan đến ngày
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    Object.entries(filter).forEach(([key, value]) => {
      if (!value) return;

      // Xử lý các giá trị đặc biệt cho bất kỳ trường nào
      if (value === 'to_date') {
        // Trường = ngày hiện tại (sử dụng between để so sánh ngày chính xác)
        criteria.push({
          name: key,
          operator: 'between',
          value: [todayStr, tomorrowStr]
        });
        trackedFields.add(key);
        return;
      }

      if (value === 'over_date') {
        // Trường < ngày hiện tại
        criteria.push({
          name: key,
          operator: 'lt',
          value: todayStr
        });
        trackedFields.add(key);
        return;
      }

      if (value === 'is_limited') {
        // Chỉ lấy văn bản có trường IS NOT NULL
        trackedFields.add(key);
        return;
      }

      // Xử lý filter thông thường
      if (Array.isArray(value)) {
        const cleanArr = value.map(v => String(v)).filter(v => v && v.trim() !== '');
        if (cleanArr.length > 0) {
          criteria.push({ name: key, operator: cleanArr.length === 1 ? 'eq' : 'in', value: cleanArr.length === 1 ? cleanArr[0] : cleanArr });
        }
      } else if (typeof value === 'object') {
        const val = value as any;
        if (val.startDate && val.endDate) criteria.push({ name: key, operator: 'between', value: [String(val.startDate), String(val.endDate)] });
        else if (val.startDate) criteria.push({ name: key, operator: 'gte', value: String(val.startDate) });
        else if (val.endDate) criteria.push({ name: key, operator: 'lte', value: String(val.endDate) });
        else if (val.value !== undefined && val.value !== null) criteria.push({ name: key, operator: 'like', value: String(val.value) });
        else {
          const arrVals = Object.values(val).map(v => String(v)).filter(v => v && typeof v === 'string' && v.trim() !== '');
          if (arrVals.length > 0) {
            criteria.push({ name: key, operator: arrVals.length === 1 ? 'eq' : 'in', value: arrVals.length === 1 ? arrVals[0] : arrVals });
          }
        }
      } else {
        const operator = typeof value === 'string' ? 'like' : 'eq';
        criteria.push({ name: key, operator, value: String(value) });
      }
    });

    return { trackedFields };
  }
  async listSignerProcessDynamic(query: ListDocumentsDto, userId: string, authorId?: string) {
    const fnStartTime = Date.now();
    let phaseTime = fnStartTime;
    const logPhase = (phaseName: string) => {
      if (!ENABLE_SIGNER_PROCESS_API_LOGS) return;
      const now = Date.now();
      const elapsed = now - phaseTime;
      this.logger.log(`[signerProcess] ${phaseName}: ${elapsed}ms`);
      phaseTime = now;
    };

    // console.time('[signerProcess] Total');
    // console.time('[signerProcess] Phase 1 & 2 (Parse & Context)');
    // ==========================================
    // PHASE 1: Parse & Initialize
    // ==========================================
    const { type, page = 1, limit = 20, filter, sort, processFn, authority, isExport, countOnly } = query;
    const pageNum = Number(page);
    let limitNum = Number(limit);

    if (!Number.isInteger(pageNum) || pageNum <= 0) {
      throw new BadRequestException('page phải là số nguyên dương');
    }

    if (!Number.isInteger(limitNum) || limitNum <= 0) {
      throw new BadRequestException('limit must be a positive integer');
    }

    // ==========================================
    // PHASE 2: Get Context & Feature Config
    // ==========================================
    const pool = await this.getMsPool();
    const where: string[] = [];

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const [userRoleRes, featureManagement, userRes] = await Promise.all([
      this.userService.getUserRole(userId),
      this.featureManagementRepo.findOne({
        where: { code: processFn, status: 1, statusFeature: StatusFeature.ACTIVE }
      }),
      pool.request()
        .input('currentUserId', sql.NVarChar(100), userId)
        .query(`SELECT id, parent AS parentId FROM ${this.dbname}.dbo.users WHERE id = @currentUserId`)
    ]);

    const { roles } = userRoleRes;
    const receiverUnit = userRes.recordset[0]?.parentId || null;
    const userContext = { userId, roles, receiverUnit };
    logPhase('Phase 1-2: Parse & Context');
    // console.timeEnd('[signerProcess] Phase 1 & 2 (Parse & Context)');
    // console.time('[signerProcess] Phase 3 & 4 (Build Criteria & SQL query)');
    const criteria: Array<{ name: string; operator: string; value: string | string[] }> = [];






    // Sử dụng hàm dùng chung để xử lý filter
    const { trackedFields } = this.processFilterCriteria(filter || {}, criteria);
    const hasDeadlineReplyFilter = trackedFields.has('deadline_reply') || trackedFields.has('deadlineReply');

    const featureCriteria = featureManagement?.criteria ?? [];

    const dateKeysList = ['createdAt', 'created_at', 'documentDate', 'document_date', 'releaseDate', 'release_date', 'updatedAt', 'updated_at'];
    const hasDateFilter = [...featureCriteria, ...criteria].some(c => dateKeysList.includes(c.name));
    if (!hasDateFilter) {
      const currentYear = new Date().getFullYear();
      criteria.push({
        name: 'createdAt',
        operator: 'between',
        value: [`${currentYear}-01-01`, `${currentYear}-12-31`]
      });
    }

    let auditDateFilter = '';
    const dateFilters = [...featureCriteria, ...criteria].filter(c => c.name === 'createdAt' || c.name === 'created_at');
    dateFilters.forEach(df => {
      if (df.operator === 'between' && Array.isArray(df.value)) {
        auditDateFilter += ` AND {alias}.created_at BETWEEN '${df.value[0]}' AND '${df.value[1]} 23:59:59'`;
      } else if (df.operator === 'gte' && typeof df.value === 'string') {
        auditDateFilter += ` AND {alias}.created_at >= '${df.value}'`;
      } else if (df.operator === 'lte' && typeof df.value === 'string') {
        auditDateFilter += ` AND {alias}.created_at <= '${df.value} 23:59:59'`;
      }
    });
    const getAuditDateCond = (alias: string) => auditDateFilter.replace(/{alias}/g, alias);

    let mergedCriteria = [...featureCriteria, ...criteria];
    const statusEqValues = mergedCriteria
      .filter(c => (c.name === 'status_code' || c.name === 'statusCode') && c.operator === 'eq' && typeof c.value === 'string')
      .map(c => c.value as string);
    if (statusEqValues.length > 1) {
      mergedCriteria = mergedCriteria.filter(c =>
        !((c.name === 'status_code' || c.name === 'statusCode') && c.operator === 'eq')
      );
      mergedCriteria.push({
        name: 'status_code',
        operator: 'in',
        value: [...new Set(statusEqValues)]
      });
    }
    // Khi lấy danh sách tab Soạn thảo (draft), loại bỏ hoàn toàn tiêu chí status_code
    // vì sau khi trả lại (return-outgoing), status_code có thể là NULL (BPMN node không có statusCode)
    // và SQL IN() không thể khớp NULL. Logic CROSS APPLY audit đã xử lý đúng draft bằng stage_status.
    if (type === 'draft') {
      mergedCriteria = mergedCriteria.filter(c =>
        c.name !== 'status_code' && c.name !== 'statusCode'
      );
    }

    // Xử lý bộ lọc stage_status / stageStatus cho danh sách văn bản trình ký
    const stageStatusCriteria = mergedCriteria.filter(
      c => c.name === 'stage_status' || c.name === 'stageStatus'
    );
    let stageStatusSql = '';
    if (stageStatusCriteria.length > 0) {
      mergedCriteria = mergedCriteria.filter(
        c => c.name !== 'stage_status' && c.name !== 'stageStatus'
      );
      const allVals: string[] = [];
      stageStatusCriteria.forEach(sc => {
        if (Array.isArray(sc.value)) {
          sc.value.forEach(v => {
            if (v && String(v).trim()) allVals.push(String(v).trim().replace(/'/g, "''"));
          });
        } else if (typeof sc.value === 'string' && sc.value.trim()) {
          allVals.push(sc.value.trim().replace(/'/g, "''"));
        }
      });

      // Tự động mở rộng danh sách mã nếu lọc thuộc nhóm "Chờ phát hành" hoặc các nhóm tương tự
      const PENDING_PUBLICATION_EXPAND = [
        'HT_VBTT', 'DE_NGHI_BH', 'DONG_Y_VBDT', 'CAN_CHO_SO', 'CHO_SO', 'DA_CHO_SO', 'KY_SO', 'KY_PHAT_HANH', 'BAN_HANH_TO_TRINH', 'CHO_PHAT_HANH', 'CHO_BAN_HANH', 'PENDING_PUBLICATION', 'CHO_PHAT_HANH_VAN_BAN', 'DONG_Y_DU_THAO', 'DONG_Y_PHE_DUYET'
      ];

      const STATUS_GROUP_EXPANSION_MAP: Record<string, string[]> = {
        'HT_VBTT': PENDING_PUBLICATION_EXPAND,
        'DE_NGHI_BH': PENDING_PUBLICATION_EXPAND,
        'DONG_Y_VBDT': PENDING_PUBLICATION_EXPAND,
        'CAN_CHO_SO': PENDING_PUBLICATION_EXPAND,
        'CHO_SO': PENDING_PUBLICATION_EXPAND,
        'DA_CHO_SO': PENDING_PUBLICATION_EXPAND,
        'KY_SO': PENDING_PUBLICATION_EXPAND,
        'KY_PHAT_HANH': PENDING_PUBLICATION_EXPAND,
        'BAN_HANH_TO_TRINH': PENDING_PUBLICATION_EXPAND,
        'CHO_PHAT_HANH': PENDING_PUBLICATION_EXPAND,
        'CHO_BAN_HANH': PENDING_PUBLICATION_EXPAND,
        'PENDING_PUBLICATION': PENDING_PUBLICATION_EXPAND,
        'CHO_PHAT_HANH_VAN_BAN': PENDING_PUBLICATION_EXPAND,
        'DONG_Y_DU_THAO': PENDING_PUBLICATION_EXPAND,
        'DONG_Y_PHE_DUYET': PENDING_PUBLICATION_EXPAND,

        'CHO_KY_NHAY': ['CHO_KY_NHAY', 'KY_NHAY', 'DA_KY_NHAY'],
        'KY_NHAY': ['CHO_KY_NHAY', 'KY_NHAY', 'DA_KY_NHAY'],
        'CHO_KY_NOI_DUNG': ['CHO_KY_NOI_DUNG', 'KY_NHAY_NOI_DUNG', 'DA_KY_NOI_DUNG'],
        'KY_NHAY_NOI_DUNG': ['CHO_KY_NOI_DUNG', 'KY_NHAY_NOI_DUNG', 'DA_KY_NOI_DUNG'],
        'CHO_KY_THE_THUC': ['CHO_KY_THE_THUC', 'KY_NHAY_THE_THUC', 'DA_KY_THE_THUC'],
        'KY_NHAY_THE_THUC': ['CHO_KY_THE_THUC', 'KY_NHAY_THE_THUC', 'DA_KY_THE_THUC'],
        'CHO_KY_CHINH_THUC': ['CHO_KY_CHINH_THUC', 'CHO_KY_CHINH_THUC_1', 'CHO_KY_CHINH_THUC_2', 'CHO_KY_CHINH_THUC_3', 'KY_CHINH_THUC_1', 'KY_CHINH_THUC_2', 'KY_CHINH_THUC_3', 'DA_KY_CHINH_THUC_1', 'DA_KY_CHINH_THUC_2', 'DA_KY_CHINH_THUC_3'],
        'CHO_KY_CHINH_THUC_1': ['CHO_KY_CHINH_THUC', 'CHO_KY_CHINH_THUC_1', 'CHO_KY_CHINH_THUC_2', 'CHO_KY_CHINH_THUC_3', 'KY_CHINH_THUC_1', 'KY_CHINH_THUC_2', 'KY_CHINH_THUC_3', 'DA_KY_CHINH_THUC_1', 'DA_KY_CHINH_THUC_2', 'DA_KY_CHINH_THUC_3'],
        'CHO_KY_CHINH_THUC_2': ['CHO_KY_CHINH_THUC', 'CHO_KY_CHINH_THUC_1', 'CHO_KY_CHINH_THUC_2', 'CHO_KY_CHINH_THUC_3', 'KY_CHINH_THUC_1', 'KY_CHINH_THUC_2', 'KY_CHINH_THUC_3', 'DA_KY_CHINH_THUC_1', 'DA_KY_CHINH_THUC_2', 'DA_KY_CHINH_THUC_3'],
        'CHO_KY_CHINH_THUC_3': ['CHO_KY_CHINH_THUC', 'CHO_KY_CHINH_THUC_1', 'CHO_KY_CHINH_THUC_2', 'CHO_KY_CHINH_THUC_3', 'KY_CHINH_THUC_1', 'KY_CHINH_THUC_2', 'KY_CHINH_THUC_3', 'DA_KY_CHINH_THUC_1', 'DA_KY_CHINH_THUC_2', 'DA_KY_CHINH_THUC_3'],
        'KIEM_TRA_THE_THUC': ['KIEM_TRA_THE_THUC', 'TRINH_KIEM_TRA_TT'],
        'TRINH_KIEM_TRA_TT': ['KIEM_TRA_THE_THUC', 'TRINH_KIEM_TRA_TT'],
        'CHO_XAC_NHAN': ['CHO_XAC_NHAN', 'TRINH_DUYET', 'LUAN_CHUYEN_VAN_BAN_DI'],
        'TRINH_DUYET': ['CHO_XAC_NHAN', 'TRINH_DUYET', 'LUAN_CHUYEN_VAN_BAN_DI'],
        'LUAN_CHUYEN_VAN_BAN_DI': ['CHO_XAC_NHAN', 'TRINH_DUYET', 'LUAN_CHUYEN_VAN_BAN_DI'],
        'CHO_DONG_DAU': ['CHO_DONG_DAU', 'CHO_KY_DONG_DAU', 'DONG_DAU'],
        'CHO_KY_DONG_DAU': ['CHO_DONG_DAU', 'CHO_KY_DONG_DAU', 'DONG_DAU'],
        'DA_DONG_DAU': ['DA_DONG_DAU', 'DA_DONG_DAU_HET_LUONG'],
        'CHO_KY_BAN_HANH': ['CHO_KY_BAN_HANH', 'DA_KY_BAN_HANH'],
        'CHO_KY_PHE_DUYET': ['CHO_KY_PHE_DUYET', 'DA_KY_PHE_DUYET'],
        'THU_HOI': ['THU_HOI', 'RECALL', 'THU_HOI_VAN_BAN', 'THU_HOI_PHAN_CONG'],
        'RECALL': ['THU_HOI', 'RECALL', 'THU_HOI_VAN_BAN', 'THU_HOI_PHAN_CONG'],
        'DANG_XU_LY': ['DANG_XU_LY', 'CHUA_XU_LY'],
        'CHUA_XU_LY': ['CHUA_XU_LY', 'DANG_XU_LY'],
        'HOAN_THANH': ['HOAN_THANH', 'HOAN_THANH_VAN_BAN', 'HOAN_THANH_LUAN_CHUYEN', 'DA_BAN_HANH'],
        'HOAN_THANH_VAN_BAN': ['HOAN_THANH', 'HOAN_THANH_VAN_BAN', 'HOAN_THANH_LUAN_CHUYEN', 'DA_BAN_HANH'],
        'HOAN_THANH_LUAN_CHUYEN': ['HOAN_THANH', 'HOAN_THANH_VAN_BAN', 'HOAN_THANH_LUAN_CHUYEN', 'DA_BAN_HANH'],
        'BI_THAY_THE': ['BI_THAY_THE', 'THAY_THE', 'DA_THAY_THE', 'THAY_THE_VAN_BAN'],
        'THAY_THE': ['BI_THAY_THE', 'THAY_THE', 'DA_THAY_THE', 'THAY_THE_VAN_BAN'],
        'DA_THAY_THE': ['BI_THAY_THE', 'THAY_THE', 'DA_THAY_THE', 'THAY_THE_VAN_BAN'],
      };

      const expandedVals = new Set<string>();
      allVals.forEach(v => {
        const u = v.toUpperCase();
        expandedVals.add(v);
        if (STATUS_GROUP_EXPANSION_MAP[u]) {
          STATUS_GROUP_EXPANSION_MAP[u].forEach(ev => expandedVals.add(ev));
        }
      });
      const finalVals = Array.from(expandedVals);

      if (finalVals.length > 0) {
        const inValues = finalVals.map(v => `'${v}'`).join(',');
        const uppercaseVals = finalVals.map(v => v.toUpperCase());
        const hasTraLai = uppercaseVals.some(v => v === 'TRA_LAI' || v.startsWith('TRA_LAI'));
        const hasChuaXuLy = uppercaseVals.includes('CHUA_XU_LY') || uppercaseVals.includes('DANG_XU_LY');
        const hasThuHoi = uppercaseVals.some(v => v.includes('THU_HOI') || v === 'RECALL');
        const hasPendingPub = uppercaseVals.some(v => PENDING_PUBLICATION_EXPAND.includes(v));

        const auditReturnExistsClause = `EXISTS (SELECT 1 FROM ${this.dbname}.dbo.audit a_ret WHERE a_ret.document_id = CAST(outgoing_documents.document_id AS NVARCHAR(64)) AND a_ret.type_document IN ('OutgoingDocument', 'OutGoingDocument') ${getAuditDateCond('a_ret')} AND (a_ret.action_code = '${stageStatusDoc.TRA_LAI}' OR a_ret.stage_status = '${stageStatusDoc.TRA_LAI}' OR a_ret.action_code LIKE 'TRA_LAI%') AND NOT EXISTS (SELECT 1 FROM ${this.dbname}.dbo.audit a_chk WHERE a_chk.document_id = a_ret.document_id AND a_chk.type_document IN ('OutgoingDocument', 'OutGoingDocument') AND a_chk.id > a_ret.id AND (a_chk.action_code LIKE 'THU_HOI%' OR a_chk.action_code = 'RECALL' OR a_chk.stage_status = 'THU_HOI')))`;

        const auditRecallExistsClause = `EXISTS (SELECT 1 FROM ${this.dbname}.dbo.audit a_rec WHERE a_rec.document_id = CAST(outgoing_documents.document_id AS NVARCHAR(64)) AND a_rec.type_document IN ('OutgoingDocument', 'OutGoingDocument') ${getAuditDateCond('a_rec')} AND (a_rec.action_code LIKE 'THU_HOI%' OR a_rec.action_code = 'RECALL' OR a_rec.stage_status = 'THU_HOI'))`;

        const auditPendingPubExistsClause = `EXISTS (SELECT 1 FROM ${this.dbname}.dbo.audit a_pp WHERE a_pp.document_id = CAST(outgoing_documents.document_id AS NVARCHAR(64)) AND a_pp.type_document IN ('OutgoingDocument', 'OutGoingDocument') ${getAuditDateCond('a_pp')} AND (a_pp.action_code IN (${inValues}) OR a_pp.stage_status IN (${inValues})))`;

        if (hasPendingPub) {
          stageStatusSql = ` (((last_audit.stage_status IN (${inValues}) OR last_audit.action_code IN (${inValues}) OR ${auditPendingPubExistsClause})) AND NOT EXISTS (SELECT 1 FROM ${this.dbname}.dbo.audit a_end WHERE a_end.document_id = CAST(outgoing_documents.document_id AS NVARCHAR(64)) AND a_end.type_document IN ('OutgoingDocument', 'OutGoingDocument') ${getAuditDateCond('a_end')} AND a_end.stage_status = '${stageStatusDoc.DA_BAN_HANH}')) `;
        } else if (hasTraLai && !hasChuaXuLy && !hasThuHoi) {
          stageStatusSql = ` (((last_audit.stage_status IN (${inValues}) OR last_audit.action_code IN (${inValues}) OR ${auditReturnExistsClause})) AND NOT ${auditRecallExistsClause}) `;
        } else if (hasThuHoi && !hasTraLai && !hasChuaXuLy) {
          stageStatusSql = ` (last_audit.stage_status IN (${inValues}) OR last_audit.action_code IN (${inValues}) OR last_audit.action_code LIKE 'THU_HOI%') `;
        } else if (hasChuaXuLy && !hasTraLai && !hasThuHoi) {
          stageStatusSql = ` ((last_audit.stage_status IN (${inValues}) OR last_audit.action_code IN (${inValues})) AND NOT ${auditReturnExistsClause} AND NOT ${auditRecallExistsClause}) `;
        } else if (hasTraLai && hasChuaXuLy) {
          stageStatusSql = ` (((last_audit.stage_status IN (${inValues}) OR last_audit.action_code IN (${inValues}) OR ${auditReturnExistsClause})) AND NOT ${auditRecallExistsClause}) `;
        } else {
          stageStatusSql = ` (last_audit.stage_status IN (${inValues}) OR last_audit.action_code IN (${inValues})) `;
        }
      }
    }

    const { sql: filterFeature, joins: filterJoins } = buildDocumentCriteriaHelper(mergedCriteria, 'outgoing_documents', featureManagement);
    const ALLOWED_TYPES = ['draft', 'signed', 'pending_publication', 'published', 'processing', 'dang_xu_ly', 'completed', 'hoan_thanh', 'replaced', 'thay_the', 'bi_thay_the', 'cho_phat_hanh', 'cho_ban_hanh'] as const;
    if (!type || !ALLOWED_TYPES.includes(type as any)) {
      if (ENABLE_SIGNER_PROCESS_API_LOGS) {
        this.logger.warn(`[processDocuments] Invalid type received. processFn=${processFn}, type=${type}, allowed=${ALLOWED_TYPES.join(',')}`);
      }
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: ALLOWED_TYPES,
      });
    }
    const safeType = (type === 'processing' || type === 'dang_xu_ly' ? 'draft' : type === 'completed' || type === 'hoan_thanh' ? 'published' : type === 'replaced' || type === 'thay_the' || type === 'bi_thay_the' ? 'published' : type === 'cho_phat_hanh' || type === 'cho_ban_hanh' ? 'pending_publication' : type) ?? 'draft';

    // ==========================================
    // PHASE 4: Build SQL Clauses (SELECT, JOIN, WHERE)
    // ==========================================
    const auditOrderByByType: Record<string, string> = {
      draft: `CASE WHEN a.stage_status IN ('${stageStatusDoc.CHUA_XU_LY}', '${stageStatusDoc.DANG_XU_LY}') AND (a.receiver = @currentUserId ${receiverUnit ? `OR a.receiver = @receiverUnit OR a.receiver_unit = @receiverUnit` : ''}) THEN 1 ELSE 99 END`,
      signed: `CASE WHEN a.stage_status = '${stageStatusDoc.DONG_Y_VBDT}' THEN 1 WHEN a.stage_status = '${stageStatusDoc.DA_XU_LY}' THEN 2 WHEN a.stage_status = '${stageStatusDoc.HOAN_THANH_LUAN_CHUYEN}' THEN 3 ELSE 99 END`,
      pending_publication: `CASE WHEN a.stage_status = '${stageStatusDoc.HT_VBTT}' THEN 1 ELSE 99 END`,
      published: `CASE WHEN a.stage_status = '${stageStatusDoc.DA_BAN_HANH}' THEN 1 ELSE 99 END`
    };

    const auditOrderBy = auditOrderByByType[safeType] ?? ` CASE WHEN a.id IS NOT NULL THEN 1 ELSE 99 END `;
    let joinClause = `
      CROSS APPLY (
        SELECT TOP 1 a.document_id, a.receiver, a.receiver_unit, a.stage_status, a.action_code, a.created_by
        FROM ${this.dbname}.dbo.audit a
        WHERE a.document_id = CAST(outgoing_documents.document_id AS NVARCHAR(64))
          AND a.type_document IN ('OutgoingDocument', 'OutGoingDocument')
          ${getAuditDateCond('a')}
          AND (
            a.receiver = @currentUserId
            OR a.created_by = @currentUserId
            ${receiverUnit ? `OR a.receiver = @receiverUnit OR a.receiver_unit = @receiverUnit` : ''}
          )
        ORDER BY
          ${auditOrderBy},
          a.id DESC
      ) audit
      CROSS APPLY (
        SELECT TOP 1
          a.stage_status,
          a.action_code,
          a.receiver
        FROM ${this.dbname}.dbo.audit a
        WHERE a.document_id = CAST(outgoing_documents.document_id AS NVARCHAR(64))
          AND a.type_document IN ('OutgoingDocument', 'OutGoingDocument')
          ${getAuditDateCond('a')}
        ORDER BY a.id DESC
      ) last_audit`;

    if (type === 'published') {
      joinClause = `
        CROSS APPLY (
          SELECT TOP 1
            a.document_id,
            a.receiver,
            a.receiver_unit,
            a.stage_status,
            a.action_code,
            a.created_by
          FROM ${this.dbname}.dbo.audit a
          WHERE a.document_id = CAST(outgoing_documents.document_id AS NVARCHAR(64))
            AND a.type_document IN ('OutgoingDocument', 'OutGoingDocument')
            ${getAuditDateCond('a')}
          ORDER BY a.id DESC
        ) last_audit
      `;
    }

    const excludeSignedDoc = `
      NOT EXISTS (
        SELECT 1
        FROM ${this.dbname}.dbo.audit a_end
        WHERE a_end.document_id = outgoing_documents.document_id
          AND a_end.type_document IN ('OutgoingDocument', 'OutGoingDocument')
          ${getAuditDateCond('a_end')}
          AND a_end.stage_status IN ( '${stageStatusDoc.DA_BAN_HANH}' )
      ) `;
    const excludePendingPublicationDoc = `
      NOT EXISTS (
        SELECT 1
        FROM ${this.dbname}.dbo.audit a_end
        WHERE a_end.document_id = outgoing_documents.document_id
          AND a_end.type_document IN ('OutgoingDocument', 'OutGoingDocument')
          ${getAuditDateCond('a_end')}
          AND a_end.stage_status IN ( '${stageStatusDoc.DA_BAN_HANH}' )
      ) `;
    const creatorFilter = `
      (
        EXISTS (
          SELECT 1
          FROM ${this.dbname}.dbo.audit a_create
          WHERE a_create.document_id = outgoing_documents.document_id
            AND a_create.type_document IN ('OutgoingDocument', 'OutGoingDocument')
            ${getAuditDateCond('a_create')}
            AND (
              a_create.created_by = @currentUserId
              OR a_create.user_id = @currentUserId
            )
        )
        OR outgoing_documents.drafter = @currentUserId
      )
    `;

    // Văn bản có sao
    if (filter?.isStar === '1' || filter?.isStar === 'true') {
      where.push(` EXISTS ( SELECT 1 FROM ${this.dbname}.dbo.document_star ds WHERE ds.document_id = outgoing_documents.document_id AND ds.user_id = @currentUserId AND ds.step = @processFn ) `);
    }
    if (filter?.isStar === '0' || filter?.isStar === 'false') {
      where.push(` NOT EXISTS ( SELECT 1 FROM ${this.dbname}.dbo.document_star ds WHERE ds.document_id = outgoing_documents.document_id AND ds.user_id = @currentUserId AND ds.step = @processFn ) `);
    }

    // Nếu có filter deadline_reply, chỉ lấy văn bản có deadline_reply NOT NULL
    if (hasDeadlineReplyFilter) {
      where.push(` outgoing_documents.deadline_reply IS NOT NULL `);
    }

    // Nếu có lọc stage_status / stageStatus từ URL query
    if (stageStatusSql) {
      where.push(stageStatusSql);
    }

    // Luôn loại bỏ văn bản chưa có nội dung trích yếu (NULL, rỗng hoặc chuỗi 'null').
    where.push(` NULLIF(LTRIM(RTRIM(CONVERT(NVARCHAR(MAX), outgoing_documents.abstract_note))), '') IS NOT NULL `);
    where.push(` UPPER(LTRIM(RTRIM(CONVERT(NVARCHAR(MAX), outgoing_documents.abstract_note)))) <> 'NULL' `);

    if (filterJoins) joinClause += ' ' + filterJoins;

    const pendingPubStatuses = [
      stageStatusDoc.HT_VBTT,
      stageStatusDoc.DE_NGHI_BH,
      stageStatusDoc.DONG_Y_VBDT,
      stageStatusDoc.BAN_HANH_TO_TRINH,
      stageStatusDoc.CHUA_XU_LY,
      'CAN_CHO_SO',
      stageStatusDoc.CHO_SO,
      stageStatusDoc.DA_CHO_SO,
      stageStatusDoc.KY_SO,
      stageStatusDoc.KY_PHAT_HANH,
      'CHO_PHAT_HANH',
      'CHO_BAN_HANH',
      'PENDING_PUBLICATION',
      'CHO_PHAT_HANH_VAN_BAN',
      'DONG_Y_DU_THAO',
      'DONG_Y_PHE_DUYET',
    ].filter(Boolean);
    const pendingPubInSql = pendingPubStatuses.map(s => `'${s}'`).join(',');

    const typeFilters: Record<string, string[]> = {
      // Old:
      // draft: [
      //   filterFeature ? `(${filterFeature})` : undefined,
      //   `( (audit.stage_status = '${stageStatusDoc.CHUA_XU_LY}' AND (audit.receiver = @currentUserId ${receiverUnit ? `OR audit.receiver = @receiverUnit OR audit.receiver_unit = @receiverUnit` : ''}))
      //     OR (audit.stage_status = '${stageStatusDoc.TRA_LAI}' AND last_audit.action_code = '${stageStatusDoc.TRA_LAI}') )`,
      // ].filter((f): f is string => !!f),
      draft: [
        filterFeature ? `(${filterFeature})` : undefined,
        `outgoing_documents.drafter = @currentUserId`, // Chỉ hiển thị dự thảo của chính người soạn thảo
        `( (audit.stage_status = '${stageStatusDoc.CHUA_XU_LY}' AND (audit.receiver = @currentUserId ${receiverUnit ? `OR audit.receiver = @receiverUnit OR audit.receiver_unit = @receiverUnit` : ''}))
          OR last_audit.action_code = '${stageStatusDoc.TRA_LAI}'
          OR last_audit.stage_status = '${stageStatusDoc.TRA_LAI}'
          OR last_audit.action_code = 'THU_HOI'
          OR last_audit.stage_status = 'THU_HOI'
          OR last_audit.action_code LIKE 'THU_HOI%'
          OR last_audit.action_code = 'RECALL'
          OR last_audit.stage_status = 'RECALL' )`,
      ].filter((f): f is string => !!f),

      signed: [
        filterFeature ? `(${filterFeature})` : undefined,
        processFn === 'daTrinhKyCB2' ? `outgoing_documents.drafter = @currentUserId` : undefined,

        // 1. Phải từng có DA_XU_LY, HOAN_THANH_LUAN_CHUYEN hoặc TRA_LAI bởi người dùng
        `EXISTS (
          SELECT 1
          FROM ${this.dbname}.dbo.audit a1
          WHERE a1.document_id = outgoing_documents.document_id
            AND a1.type_document IN ('OutgoingDocument', 'OutGoingDocument')
            ${getAuditDateCond('a1')}
            AND (a1.receiver = @currentUserId OR a1.processed_by = @currentUserId OR a1.created_by = @currentUserId OR a1.user_id = @currentUserId)
            AND ISNULL(a1.action_code, '') <> 'CREATE'
            AND (
              a1.stage_status IN ('${stageStatusDoc.DA_XU_LY}', '${stageStatusDoc.HOAN_THANH_LUAN_CHUYEN}', '${stageStatusDoc.TRA_LAI}', '${stageStatusDoc.DONG_Y_VBDT}', '${stageStatusDoc.HT_VBTT}', '${stageStatusDoc.DE_NGHI_BH}', 'CHO_DONG_DAU', 'DA_DONG_DAU')
              OR a1.action_code IN ('TRA_LAI', 'LUAN_CHUYEN_VAN_BAN_DI', 'DONG_Y_VBDT', 'DE_NGHI_BH', 'DONG_DAU', 'DA_DONG_DAU')
            )
        )`,

        // 2. KHÔNG CÓ bước mở (các trạng thái chờ xử lý) giao cho chính user ở bước hiện tại
        `NOT (last_audit.receiver = @currentUserId AND last_audit.stage_status IN ('${stageStatusDoc.CHUA_XU_LY}', '${stageStatusDoc.TRA_LAI}', '${stageStatusDoc.HT_VBTT}', '${stageStatusDoc.CHO_KY_NOI_DUNG}', '${stageStatusDoc.CHO_KY_THE_THUC}', '${stageStatusDoc.CHO_KY_BAN_HANH}', '${stageStatusDoc.CHO_KY_PHE_DUYET}', '${stageStatusDoc.CHO_KY_NHAY}', '${stageStatusDoc.CHO_KY_CHINH_THUC}', '${stageStatusDoc.CHO_KY_CHINH_THUC_1}', '${stageStatusDoc.CHO_KY_CHINH_THUC_2}', '${stageStatusDoc.CHO_KY_CHINH_THUC_3}', '${stageStatusDoc.CHO_XAC_NHAN}', '${stageStatusDoc.CHO_THAM_DINH}', '${stageStatusDoc.CHO_KY_DONG_DAU}', '${stageStatusDoc.CHO_DONG_DAU}', '${stageStatusDoc.THU_HOI}'))`,

        excludeSignedDoc,
        processFn === 'daTrinhKyCB2' ? undefined : creatorFilter,
      ].filter((f): f is string => !!f),


      pending_publication: [
        filterFeature ? `(${filterFeature})` : undefined,

        // 1. User CÓ THAM GIA VÀO LUỒNG (bất kỳ bước nào) HOẶC là người soạn thảo / tạo văn bản
        `(
          EXISTS (
            SELECT 1
            FROM ${this.dbname}.dbo.audit a
            WHERE a.document_id = outgoing_documents.document_id
              AND a.type_document IN ('OutgoingDocument', 'OutGoingDocument')
              ${getAuditDateCond('a')}
              AND (
                a.created_by = @currentUserId
                OR a.receiver = @currentUserId
                OR a.user_id = @currentUserId
                ${receiverUnit ? `OR a.receiver_unit = @receiverUnit` : ''}
              )
          )
          OR outgoing_documents.drafter = @currentUserId
        )`,

        // 2. Văn bản đang ở trạng thái chờ ban hành (mở rộng giống promulgate waiting)
        `EXISTS (
          SELECT 1
          FROM ${this.dbname}.dbo.audit a2
          WHERE a2.document_id = outgoing_documents.document_id
            AND a2.type_document IN ('OutgoingDocument', 'OutGoingDocument')
            ${getAuditDateCond('a2')}
            AND (
              a2.stage_status IN (${pendingPubInSql})
              OR a2.action_code IN (${pendingPubInSql})
            )
        )`,
        excludePendingPublicationDoc,
        creatorFilter,
      ].filter((f): f is string => !!f),

      published: [
        filterFeature ? `(${filterFeature})` : undefined,

        // 1. TỒN TẠI trạng thái đã ban hành
        `last_audit.stage_status = '${stageStatusDoc.DA_BAN_HANH}'`,

        // 2. User hoặc đơn vị từng tham gia luồng
        `EXISTS (
          SELECT 1
          FROM ${this.dbname}.dbo.audit a2
          WHERE a2.document_id = outgoing_documents.document_id
            AND a2.type_document IN ('OutgoingDocument', 'OutGoingDocument')
            ${getAuditDateCond('a2')}
            AND (
              a2.created_by = @currentUserId
              OR a2.receiver = @currentUserId
              ${receiverUnit ? `OR a2.receiver_unit = @receiverUnit` : ''}
            )
        )`,

        creatorFilter,
      ].filter((f): f is string => !!f),
    };

    const baseWhereParts = [...where];
    if (safeType !== 'signed' && type && typeFilters[type]) {
      baseWhereParts.push(...typeFilters[type]);
    } else if (safeType === 'signed') {
      if (filterFeature) baseWhereParts.push(`(${filterFeature})`);
      if (processFn === 'daTrinhKyCB2') baseWhereParts.push(`outgoing_documents.drafter = @currentUserId`);
    }

    let whereClause = baseWhereParts.length ? ' WHERE ' + baseWhereParts.join(' AND ') : '';
    whereClause += ` AND outgoing_documents.status = 1`;

    if (isExport === 'true') {
      limitNum = 9999;
    }
    const offsetNum = (pageNum - 1) * limitNum;

    const excludeKeys = ['files', 'statusCode', 'status_code'];
    const { dbKeys, aliases, allViewFields } = await this.configurationService.buildSelectFieldsNew('outgoing_documents', excludeKeys, processFn);

    const auditDbKeys: string[] = [];

    const keyDefaultParts: string[] = [];
    if (allViewFields.includes('statusCode') || allViewFields.includes('status_code')) {
      keyDefaultParts.push(
        `matched.status_code_current AS status_code`
      );
    }
    keyDefaultParts.push(`CASE WHEN EXISTS ( SELECT 1 FROM ${this.dbname}.dbo.document_star ds WHERE ds.document_id = outgoing_documents.document_id AND ds.user_id = @currentUserId AND ds.step = @processFn) THEN 1 ELSE 0 END AS isStar`);

    // Thêm stage_status từ last_audit (audit mới nhất toàn cục)
    keyDefaultParts.push(`matched.stage_status_current AS stageStatus`);

    aliases['isStar'] = 'is_star';
    aliases['stageStatus'] = 'stage_status';

    const keyDefault = keyDefaultParts.join(', ');
    const selectFieldsArray = [
      ...(keyDefault ? [keyDefault] : []),
      ...dbKeys,
      ...auditDbKeys,
    ];

    const orderBy = ' ORDER BY ' + parseSort(sort, aliases, 'outgoing_documents');
    const selectFields = selectFieldsArray.join(', ');
    const processFnValue = String(processFn);
    const attachBaseParams = (request: sql.Request) => {
      request.input('currentUserId', sql.NVarChar(100), userId);
      request.input('processFn', sql.NVarChar(255), processFnValue);
      if (receiverUnit) {
        request.input('receiverUnit', sql.NVarChar(100), String(receiverUnit));
      }
      return request;
    };

    logPhase('Phase 3-4: Build Criteria & SQL');
    // console.timeEnd('[signerProcess] Phase 3 & 4 (Build Criteria & SQL query)');
    // console.time('[signerProcess] Phase 5 (Execute SQL Queries)');
    // ==========================================
    // PHASE 5: Execute SQL Queries (COUNT & DATA)
    // ==========================================
    const signedAuditSummaryCte = `
      WITH base_docs AS (
        SELECT outgoing_documents.document_id, outgoing_documents.updated_at
        FROM ${this.dbname}.dbo.outgoing_documents
        CROSS APPLY (
          SELECT TOP 1
            a.stage_status,
            a.action_code,
            a.receiver
          FROM ${this.dbname}.dbo.audit a
          WHERE a.document_id = CAST(outgoing_documents.document_id AS NVARCHAR(64))
            AND a.type_document IN ('OutgoingDocument', 'OutGoingDocument')
            ${getAuditDateCond('a')}
          ORDER BY a.id DESC
        ) last_audit
        ${filterJoins ? ` ${filterJoins}` : ''}
        ${whereClause}
      ),
      audit_summary AS (
        SELECT
          bd.document_id,
          MAX(CASE WHEN a.stage_status IN ('${stageStatusDoc.DA_XU_LY}', '${stageStatusDoc.HOAN_THANH_LUAN_CHUYEN}') THEN 1 ELSE 0 END) AS has_signed_stage,
          MAX(CASE WHEN a.stage_status IN ('${stageStatusDoc.DA_XU_LY}', '${stageStatusDoc.HOAN_THANH_LUAN_CHUYEN}') THEN a.id END) AS last_signed_id,
          MAX(CASE WHEN a.stage_status = '${stageStatusDoc.TRA_LAI}' THEN a.id END) AS last_return_id,
          MAX(CASE WHEN (a.receiver = @currentUserId ${receiverUnit ? `OR a.receiver = @receiverUnit OR a.receiver_unit = @receiverUnit` : ''}) AND a.stage_status IN ('${stageStatusDoc.HT_VBTT}', '${stageStatusDoc.CHUA_XU_LY}', '${stageStatusDoc.CHO_KY_NOI_DUNG}', '${stageStatusDoc.CHO_KY_THE_THUC}', '${stageStatusDoc.CHO_KY_BAN_HANH}', '${stageStatusDoc.CHO_KY_PHE_DUYET}', '${stageStatusDoc.CHO_KY_NHAY}', '${stageStatusDoc.CHO_KY_CHINH_THUC}', '${stageStatusDoc.CHO_KY_CHINH_THUC_1}', '${stageStatusDoc.CHO_KY_CHINH_THUC_2}', '${stageStatusDoc.CHO_KY_CHINH_THUC_3}', '${stageStatusDoc.CHO_XAC_NHAN}', '${stageStatusDoc.CHO_THAM_DINH}', '${stageStatusDoc.CHO_KY_DONG_DAU}', '${stageStatusDoc.CHO_DONG_DAU}', '${stageStatusDoc.THU_HOI}', '${stageStatusDoc.TRA_LAI}') THEN a.id END) AS last_pending_receiver_audit_id,
          MAX(CASE WHEN (a.created_by = @currentUserId OR a.user_id = @currentUserId OR a.processed_by = @currentUserId) AND ISNULL(a.action_code, '') <> 'CREATE' THEN a.id END) AS last_user_action_id,
          MAX(CASE WHEN a.stage_status IN ('${stageStatusDoc.DA_BAN_HANH}','${stageStatusDoc.DE_NGHI_BH}') THEN 1 ELSE 0 END) AS has_end_signed_stage,
          MAX(CASE WHEN (
            a.created_by = @currentUserId
            OR a.user_id = @currentUserId
          ) THEN 1 ELSE 0 END) AS has_user_processed,
          MAX(CASE WHEN last_audit_rank = 1 THEN a.action_code END) AS status_code_current,
          MAX(CASE WHEN last_audit_rank = 1 THEN a.stage_status END) AS stage_status_current
        FROM base_docs bd
        INNER JOIN (
          SELECT
            a.document_id,
            a.id,
            a.stage_status,
            a.action_code,
            a.receiver,
            a.receiver_unit,
            a.created_by,
            a.processed_by,
            a.user_id,
            ROW_NUMBER() OVER (PARTITION BY a.document_id ORDER BY a.id DESC) AS last_audit_rank
          FROM ${this.dbname}.dbo.audit a
          WHERE a.type_document IN ('OutgoingDocument', 'OutGoingDocument')
            ${getAuditDateCond('a')}
        ) a ON a.document_id = CAST(bd.document_id AS NVARCHAR(64))
        GROUP BY bd.document_id
      ),
      matched AS (
        SELECT
          bd.document_id,
          bd.updated_at,
          audit_summary.status_code_current,
          audit_summary.stage_status_current
        FROM base_docs bd
        INNER JOIN audit_summary ON audit_summary.document_id = bd.document_id
        WHERE audit_summary.has_signed_stage = 1
          AND COALESCE(audit_summary.last_return_id, 0) <= COALESCE(audit_summary.last_signed_id, 0)
          AND COALESCE(audit_summary.last_pending_receiver_audit_id, 0) <= COALESCE(audit_summary.last_user_action_id, 0)
          AND audit_summary.has_end_signed_stage = 0
          AND (
            audit_summary.has_user_processed = 1
            OR EXISTS (
              SELECT 1
              FROM ${this.dbname}.dbo.outgoing_documents od_usr
              WHERE od_usr.document_id = bd.document_id
                AND od_usr.drafter = @currentUserId
            )
          )
      )
    `;

    let totalResult, rowsResult;
    if (countOnly === 'true') {
      if (safeType === 'signed') {
        totalResult = await attachBaseParams(pool.request()).query(
          `${signedAuditSummaryCte}
          SELECT COUNT(*) AS total
          FROM matched`
        );
      } else {
        totalResult = await attachBaseParams(pool.request()).query(
          `SELECT COUNT(*) AS total FROM ${this.dbname}.dbo.outgoing_documents ${joinClause}${whereClause}`
        );
      }
      const total = totalResult.recordset[0]?.total ?? 0;
      return { total: total };
    }

    try {
      const countRequest = attachBaseParams(pool.request());
      const dataRequest = attachBaseParams(pool.request())
        .input('offsetNum', sql.Int, offsetNum)
        .input('limitNum', sql.Int, limitNum);

      const countQuery = safeType === 'signed'
        ? `
        ${signedAuditSummaryCte}
        SELECT COUNT(*) AS total
        FROM matched
      `
        : `
        SELECT COUNT(*) AS total
        FROM ${this.dbname}.dbo.outgoing_documents
        ${joinClause}
        ${whereClause}
      `;

      const dataQuery = safeType === 'signed'
        ? `
        ${signedAuditSummaryCte},
        paged AS (
          SELECT *
          FROM matched
          ${orderBy.replace(/\[outgoing_documents\]\./g, '[matched].')}
          OFFSET @offsetNum ROWS FETCH NEXT @limitNum ROWS ONLY
        )
        SELECT ${selectFields}
        FROM paged AS matched
        INNER JOIN ${this.dbname}.dbo.outgoing_documents ON outgoing_documents.document_id = matched.document_id
        ${orderBy}
      `
        : `
        WITH matched AS (
          SELECT
            outgoing_documents.document_id,
            last_audit.action_code AS status_code_current,
            last_audit.stage_status AS stage_status_current
          FROM ${this.dbname}.dbo.outgoing_documents
          ${joinClause}
          ${whereClause}
          ${orderBy}
          OFFSET @offsetNum ROWS FETCH NEXT @limitNum ROWS ONLY
        )
        SELECT ${selectFields}
        FROM matched
        INNER JOIN ${this.dbname}.dbo.outgoing_documents ON outgoing_documents.document_id = matched.document_id
        ${orderBy}
      `;

      // Log SQL metadata only; do not print raw SQL text.
      if (ENABLE_SIGNER_PROCESS_API_LOGS) {
        this.logger.log(`[signerProcess]   - SQL prepared countQueryLength=${countQuery.length} dataQueryLength=${dataQuery.length}`);
      }

      // Bước 1: Query count + data
      const phase5Start = Date.now();
      const countStart = Date.now();
      totalResult = await countRequest.query(countQuery);
      const countTime = Date.now() - countStart;

      const dataStart = Date.now();
      rowsResult = await dataRequest.query(dataQuery);
      const dataTime = Date.now() - dataStart;

      const totalRows = totalResult.recordset[0]?.total ?? 0;
      const dataRows = rowsResult.recordset.length;

      if (ENABLE_SIGNER_PROCESS_API_LOGS) {
        this.logger.log(`[signerProcess]   - Phase 5 Detail: Count=${countTime}ms (${totalRows} rows), Data=${dataTime}ms (${dataRows} rows)`);
      }
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi truy vấn dữ liệu');
    }
    logPhase('Phase 5: Execute SQL Queries');
    const total = totalResult.recordset[0]?.total ?? 0;
    const items = rowsResult.recordset as DocumentRow[];
    const documentIds = items
      .map(d => d.document_id)
      .filter(Boolean)
      .map(String);
    if (!documentIds.length) {
      return {
        success: true,
        items: [],
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: 0
      };
    }

    // console.timeEnd('[signerProcess] Phase 5 (Execute SQL Queries)');
    // console.time('[signerProcess] Phase 6 (Execute Signers Query)');
    // ==========================================
    // PHASE 6: Fetch Related Data (Signers via STRING_SPLIT)
    // ==========================================
    const phase6Start = Date.now();
    const signersReq = pool.request();
    signersReq.input('docIdsCsv', sql.NVarChar(sql.MAX), documentIds.join(','));
    const signersQuery = `
      SELECT document_id, user_id, signer_type, sign_order, is_signed
      FROM ${this.dbname}.dbo.outgoing_document_users
      WHERE document_id IN (SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(@docIdsCsv, ','))
    `;
    const signersResult = await signersReq.query(signersQuery);
    if (ENABLE_SIGNER_PROCESS_API_LOGS) {
      this.logger.log(`[signerProcess]   - Signers query: ${Date.now() - phase6Start}ms (${signersResult.recordset.length} records)`);
    }
    logPhase('Phase 6: Signers Query');
    const signerMap = new Map<string, any>();
    for (const row of signersResult?.recordset) {
      if (!signerMap.has(row.document_id)) {
        signerMap.set(row.document_id, {
          reportSigner: [],
          signContentDraft: [],
          signFormatDraft: [],
          paraphSigner: []
        });
      }

      const s = signerMap.get(row.document_id);
      const signerType =
        row.signer_type === 'report_signer' ? 'reportSigner' : row.signer_type;
      if (signerType && row.user_id) {
        // đảm bảo là mảng
        if (!Array.isArray(s[signerType])) {
          s[signerType] = [];
        }

        if (!s[signerType].includes(row.user_id)) {
          s[signerType].push(row.user_id);
        }
      }
    }
    const newItems = items.map(row => {
      const docId = String(row.document_id);
      const signers = docId ? signerMap.get(docId) : undefined;
      const reportSigner = signers?.reportSigner;
      return {
        ...row,
        ...signers,
        report_signer: reportSigner,
      };
    });
    aliases['reportSigner'] = 'report_signer';
    aliases['signContentDraft'] = 'sign_content_draft';
    aliases['signFormatDraft'] = 'sign_format_draft';
    aliases['paraphSigner'] = 'paraph_signer';

    if (!items.length) return { success: true, items: [], mesage: "Không có dữ liệu", total: 0, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };

    // console.timeEnd('[signerProcess] Phase 6 (Execute Signers Query)');
    // console.time('[signerProcess] Phase 7 (Load BPMN Processes)');
    // ==========================================
    // PHASE 7: Load BPMN Processes
    // ==========================================
    const bpmnVersions = [
      ...new Set(items.map(d => d.bpmn_version)
        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0 && v.toUpperCase() !== 'NULL')),
    ];
    if (ENABLE_SIGNER_PROCESS_API_LOGS) {
      this.logger.log(`[signerProcess]   - Loading ${bpmnVersions.length} BPMN versions`);
    }

    const bpmnLoadStart = Date.now();
    const bpmnEngineMap = await this.loadBpmnProcessesCached(bpmnVersions, receiverUnit);
    if (ENABLE_SIGNER_PROCESS_API_LOGS) {
      this.logger.log(`[signerProcess]   - loadBpmnProcessesCached: ${Date.now() - bpmnLoadStart}ms`);
    }
    logPhase('Phase 7: Load BPMN Processes');
    // console.timeEnd('[signerProcess] Phase 7 (Load BPMN Processes)');
    // console.time('[signerProcess] Phase 8 (Map Details & Keys)');

    // ==========================================
    // PHASE 8: Map Details & Keys
    // ==========================================
    const detailedItems = await this.mapDocumentDetailsOutgoing(newItems, bpmnEngineMap, userContext, aliases);
    // console.timeEnd('[signerProcess] Phase 8 (Map Details & Keys)');
    // console.time('[signerProcess] Phase 9 (Map Keys for List)');
    const mapKeysStart = Date.now();
    const detailedItemsMapped = await this.mapDocOutgoingKeysForList(detailedItems, aliases, authority, type, isExport);
    if (ENABLE_SIGNER_PROCESS_API_LOGS) {
      this.logger.log(`[signerProcess]   - mapDocOutgoingKeysForList: ${Date.now() - mapKeysStart}ms`);
    }
    logPhase('Phase 9: Map Keys for List');
    // console.timeEnd('[signerProcess] Phase 9 (Map Keys for List)');
    // console.timeEnd('[signerProcess] Total');

    return { success: true, items: detailedItemsMapped, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
  }

  async listProcessDocumentsDynamic(query: ListDocumentsDto, userId: string, authorId?: string) {
    const fnStartTime = Date.now();
    let phaseTime = fnStartTime;
    const logPhase = (phaseName: string) => {
      if (!ENABLE_SIGNER_PROCESS_API_LOGS) return;
      const now = Date.now();
      const elapsed = now - phaseTime;
      this.logger.log(`[processDocuments] ${phaseName}: ${elapsed}ms`);
      phaseTime = now;
    };
    // ==========================================
    // PHASE 1: Parse & Initialize
    // ==========================================
    const { type, page = 1, limit = 20, filter, sort, processFn, authority, isExport, countOnly } = query;
    const debugDocId = '239191962444';
    const debugUserId = '4f367e1d-d7de-4b85-b022-d2c06a196590';
    const shouldTraceDebugDoc =
      processFn === 'ChoXuLyTP' &&
      type === 'waiting' &&
      userId === debugUserId;
    let limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    if (isExport === 'true') {
      limitNum = 9999;
    }
    const offsetNum = (pageNum - 1) * limitNum;

    // ==========================================
    // PHASE 2: Get Context & Feature Config
    // ==========================================
    const pool = await this.traceProcessStep(
      'processDocuments.getMsPool',
      {},
      () => this.getMsPool(),
    );
    const where: string[] = [];

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const [userRoleRes, featureManagement, userRes] = await this.traceProcessStep(
      'processDocuments.loadUserContextAndFeature',
      { 'app.request.process_fn': processFn || '' },
      () => Promise.all([
        this.userService.getUserRole(userId),
        this.featureManagementRepo.findOne({
          where: { code: processFn, status: 1, statusFeature: StatusFeature.ACTIVE }
        }),
        pool.request().query(
          `SELECT id, parent AS parentId FROM ${this.dbname}.dbo.users WHERE id = '${userId}'`
        )
      ]),
    );

    const { roles } = userRoleRes;
    const receiverUnit = userRes.recordset[0]?.parentId || null;
    const userContext = { userId, roles, receiverUnit };
    logPhase('Phase 1-2: Parse & Context');

    // ==========================================
    // PHASE 3: Build Criteria & Filters
    // ==========================================
    const criteria: Array<{ name: string; operator: string; value: string | string[] }> = [];

    // Sử dụng hàm dùng chung để xử lý filter
    const { trackedFields } = this.processFilterCriteria(filter || {}, criteria);
    const hasDeadlineReplyFilter = trackedFields.has('deadline_reply') || trackedFields.has('deadlineReply');

    const featureCriteria = featureManagement?.criteria ?? [];
    const shiftDate = (value: string, days: number, endOfDay = false): string => {
      const date = new Date(`${value}${value.includes('T') ? '' : 'T00:00:00'}`);
      if (Number.isNaN(date.getTime())) return value;
      date.setDate(date.getDate() + days);
      if (endOfDay) {
        date.setHours(23, 59, 59, 0);
      } else {
        date.setHours(0, 0, 0, 0);
      }
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const hh = String(date.getHours()).padStart(2, '0');
      const mi = String(date.getMinutes()).padStart(2, '0');
      const ss = String(date.getSeconds()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
    };

    let auditDateFilter = '';
    const dateFilters = [...featureCriteria, ...criteria].filter(c => c.name === 'createdAt' || c.name === 'created_at');
    dateFilters.forEach(df => {
      if (df.operator === 'between' && Array.isArray(df.value)) {
        const startBound = shiftDate(String(df.value[0]), -15, false);
        const endBound = shiftDate(String(df.value[1]), 15, true);
        auditDateFilter += ` AND {alias}.created_at BETWEEN '${startBound}' AND '${endBound}'`;
      } else if (df.operator === 'gte' && typeof df.value === 'string') {
        const startBound = shiftDate(df.value, -15, false);
        auditDateFilter += ` AND {alias}.created_at >= '${startBound}'`;
      } else if (df.operator === 'lte' && typeof df.value === 'string') {
        const endBound = shiftDate(df.value, 15, true);
        auditDateFilter += ` AND {alias}.created_at <= '${endBound}'`;
      }
    });
    const getAuditDateCond = (alias: string) => auditDateFilter.replace(/{alias}/g, alias);
    const { sql: filterFeature, joins: filterJoins } = buildDocumentCriteriaHelper(
      [...featureCriteria, ...criteria],
      'outgoing_documents',
      featureManagement
    );
    const ALLOWED_TYPES = ['waiting', 'processed', 'published', 'stampedDoc'] as const;
    if (!type || !ALLOWED_TYPES.includes(type as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: ALLOWED_TYPES,
      });
    }

    // ==========================================
    // PHASE 4: Build SQL Clauses (SELECT, JOIN, WHERE)
    // ==========================================
    let joinClause = `
      INNER JOIN ${this.dbname}.dbo.outgoing_current_state ocs
        ON ocs.document_id = outgoing_documents.document_id
      OUTER APPLY (
        SELECT TOP 1 oa_inner.document_id, oa_inner.receiver, oa_inner.receiver_unit, oa_inner.stage_status, oa_inner.is_creator, oa_inner.last_audit_id
        FROM ${this.dbname}.dbo.outgoing_assignment oa_inner
        WHERE oa_inner.document_id = outgoing_documents.document_id
          AND (
            oa_inner.receiver = '${userId}'
            ${receiverUnit ? `OR oa_inner.receiver = '${receiverUnit}' OR oa_inner.receiver_unit = '${receiverUnit}'` : ''}
          )
        ORDER BY
          CASE
            WHEN oa_inner.stage_status IN (
              '${stageStatusDoc.HT_VBTT}',
              '${stageStatusDoc.CHUA_XU_LY}',
              '${stageStatusDoc.CHO_KY_NOI_DUNG}',
              '${stageStatusDoc.CHO_KY_THE_THUC}',
              '${stageStatusDoc.CHO_KY_BAN_HANH}',
              '${stageStatusDoc.CHO_KY_NHAY}',
              '${stageStatusDoc.CHO_KY_CHINH_THUC}',
              '${stageStatusDoc.CHO_KY_CHINH_THUC_1}',
              '${stageStatusDoc.CHO_KY_CHINH_THUC_2}',
              '${stageStatusDoc.CHO_KY_CHINH_THUC_3}',
              '${stageStatusDoc.CHO_XAC_NHAN}',
              '${stageStatusDoc.CHO_THAM_DINH}',
              '${stageStatusDoc.CHO_KY_DONG_DAU}',
              '${stageStatusDoc.CHO_DONG_DAU}',
              '${stageStatusDoc.THU_HOI}'
            ) THEN 0
            ELSE 1
          END,
          ISNULL(oa_inner.last_audit_id, 0) DESC,
          oa_inner.updated_at DESC,
          oa_inner.created_at DESC
      ) oa
      OUTER APPLY (
        SELECT TOP 1 wi_inner.id, wi_inner.document_id, wi_inner.assignee_user_id, wi_inner.state
        FROM ${this.dbname}.dbo.work_items wi_inner
        WHERE wi_inner.document_id = outgoing_documents.document_id
          AND (
            wi_inner.assignee_user_id = '${userId}'
            ${receiverUnit ? `OR wi_inner.assignee_user_id = '${receiverUnit}'` : ''}
          )
          AND wi_inner.state = 'open'
        ORDER BY wi_inner.created_at DESC
      ) wi`;

    const excludeProcessedDoc = `ocs.has_ban_hanh = 0`;

    const receiverNotCreatorFilter = `
        (
          (oa.document_id IS NOT NULL AND ISNULL(oa.is_creator, 0) = 0)
          OR wi.id IS NOT NULL
        )
      `;
    const processedByUserFilter = `
        EXISTS (
          SELECT 1
          FROM ${this.dbname}.dbo.audit a_done
          WHERE a_done.document_id = outgoing_documents.document_id
            ${getAuditDateCond('a_done')}
            AND (
              a_done.receiver = '${userId}'
              ${receiverUnit ? `OR a_done.receiver = '${receiverUnit}' OR a_done.receiver_unit = '${receiverUnit}'` : ''}
              OR a_done.created_by = '${userId}'
              OR a_done.processed_by = '${userId}'
              OR a_done.user_id = '${userId}'
            )
            AND ISNULL(a_done.action_code, '') <> 'CREATE'
            AND (
              a_done.stage_status IN (
                '${stageStatusDoc.DA_XU_LY}',
                '${stageStatusDoc.DONG_Y_VBDT}',
                '${stageStatusDoc.DA_DONG_DAU}',
                '${stageStatusDoc.DA_KY_BAN_HANH}',
                '${stageStatusDoc.DA_KY_NHAY}',
                '${stageStatusDoc.DA_KY_NOI_DUNG}',
                '${stageStatusDoc.DA_KY_THE_THUC}',
                '${stageStatusDoc.DA_KY_CHINH_THUC_1}',
                '${stageStatusDoc.DA_KY_CHINH_THUC_2}',
                '${stageStatusDoc.DA_KY_CHINH_THUC_3}',
                '${stageStatusDoc.HOAN_THANH_LUAN_CHUYEN}',
                '${stageStatusDoc.TRA_LAI}'
              )
              OR a_done.action_code = 'TRA_LAI'
            )
        )
      `;

    // Văn bản có sao
    if (filter?.isStar === '1' || filter?.isStar === 'true') {
      where.push(` EXISTS ( SELECT 1 FROM ${this.dbname}.dbo.document_star ds WHERE ds.document_id = outgoing_documents.document_id AND ds.user_id = '${userId}' AND ds.step = '${processFn}' ) `);
    }
    if (filter?.isStar === '0' || filter?.isStar === 'false') {
      where.push(` NOT EXISTS ( SELECT 1 FROM ${this.dbname}.dbo.document_star ds WHERE ds.document_id = outgoing_documents.document_id AND ds.user_id = '${userId}' AND ds.step = '${processFn}' ) `);
    }
    if (hasDeadlineReplyFilter) {
      where.push(` outgoing_documents.deadline_reply IS NOT NULL `);
    }
    if (filterJoins) joinClause += ' ' + filterJoins;

    const typeFilters: Record<string, string[]> = {
      waiting: [
        filterFeature ? `(${filterFeature})` : undefined,
        // Dùng OR giữa oa và wi để tìm văn bản được giao cho user/đơn vị
        `(oa.last_audit_id = ocs.last_audit_id OR wi.id IS NOT NULL)`,
        // Trạng thái assignment hợp lệ hoặc fallback có wi khi không có assignment
        `(
          oa.stage_status = '${stageStatusDoc.HT_VBTT}'
          OR oa.stage_status = '${stageStatusDoc.CHUA_XU_LY}'
          OR oa.stage_status = '${stageStatusDoc.CHO_KY_NOI_DUNG}'
          OR oa.stage_status = '${stageStatusDoc.CHO_KY_THE_THUC}'
          OR oa.stage_status = '${stageStatusDoc.CHO_KY_BAN_HANH}'
          OR oa.stage_status = '${stageStatusDoc.CHO_KY_NHAY}'
          OR oa.stage_status = '${stageStatusDoc.CHO_KY_CHINH_THUC}'
          OR oa.stage_status = '${stageStatusDoc.CHO_KY_CHINH_THUC_1}'
          OR oa.stage_status = '${stageStatusDoc.CHO_KY_CHINH_THUC_2}'
          OR oa.stage_status = '${stageStatusDoc.CHO_KY_CHINH_THUC_3}'
          OR oa.stage_status = '${stageStatusDoc.CHO_XAC_NHAN}'
          OR oa.stage_status = '${stageStatusDoc.CHO_THAM_DINH}'
          OR oa.stage_status = '${stageStatusDoc.CHO_KY_DONG_DAU}'
          OR oa.stage_status = '${stageStatusDoc.CHO_DONG_DAU}'
          OR oa.stage_status = '${stageStatusDoc.THU_HOI}'
          OR (wi.id IS NOT NULL AND oa.document_id IS NULL)
        )`,
        receiverNotCreatorFilter,
      ].filter((f): f is string => !!f),


      processed: [
        filterFeature ? `(${filterFeature})` : undefined,
        processedByUserFilter,
        excludeProcessedDoc,
        receiverNotCreatorFilter,
        `NOT (
          (oa.last_audit_id = ocs.last_audit_id OR wi.id IS NOT NULL)
          AND (
            oa.stage_status IN (
              '${stageStatusDoc.HT_VBTT}',
              '${stageStatusDoc.CHUA_XU_LY}',
              '${stageStatusDoc.CHO_KY_NOI_DUNG}',
              '${stageStatusDoc.CHO_KY_THE_THUC}',
              '${stageStatusDoc.CHO_KY_BAN_HANH}',
              '${stageStatusDoc.CHO_KY_NHAY}',
              '${stageStatusDoc.CHO_KY_CHINH_THUC}',
              '${stageStatusDoc.CHO_KY_CHINH_THUC_1}',
              '${stageStatusDoc.CHO_KY_CHINH_THUC_2}',
              '${stageStatusDoc.CHO_KY_CHINH_THUC_3}',
              '${stageStatusDoc.CHO_XAC_NHAN}',
              '${stageStatusDoc.CHO_THAM_DINH}',
              '${stageStatusDoc.CHO_KY_DONG_DAU}',
              '${stageStatusDoc.CHO_DONG_DAU}',
              '${stageStatusDoc.THU_HOI}'
            )
            OR (wi.id IS NOT NULL AND oa.document_id IS NULL)
          )
        )`,
        `NOT EXISTS (
          SELECT 1 FROM ${this.dbname}.dbo.audit a_pend
          WHERE a_pend.document_id = outgoing_documents.document_id
            AND (
              a_pend.receiver = '${userId}'
              ${receiverUnit ? `OR a_pend.receiver = '${receiverUnit}' OR a_pend.receiver_unit = '${receiverUnit}'` : ''}
            )
            AND a_pend.stage_status IN (
              '${stageStatusDoc.HT_VBTT}',
              '${stageStatusDoc.CHUA_XU_LY}',
              '${stageStatusDoc.CHO_KY_NOI_DUNG}',
              '${stageStatusDoc.CHO_KY_THE_THUC}',
              '${stageStatusDoc.CHO_KY_BAN_HANH}',
              '${stageStatusDoc.CHO_KY_NHAY}',
              '${stageStatusDoc.CHO_KY_CHINH_THUC}',
              '${stageStatusDoc.CHO_KY_CHINH_THUC_1}',
              '${stageStatusDoc.CHO_KY_CHINH_THUC_2}',
              '${stageStatusDoc.CHO_KY_CHINH_THUC_3}',
              '${stageStatusDoc.CHO_XAC_NHAN}',
              '${stageStatusDoc.CHO_THAM_DINH}',
              '${stageStatusDoc.CHO_KY_DONG_DAU}',
              '${stageStatusDoc.CHO_DONG_DAU}',
              '${stageStatusDoc.THU_HOI}',
              '${stageStatusDoc.TRA_LAI}'
            )
            AND a_pend.id > ISNULL((
              SELECT MAX(a_act.id)
              FROM ${this.dbname}.dbo.audit a_act
              WHERE a_act.document_id = outgoing_documents.document_id
                AND (
                  a_act.created_by = '${userId}'
                  OR a_act.user_id = '${userId}'
                  OR a_act.processed_by = '${userId}'
                )
                AND ISNULL(a_act.action_code, '') <> 'CREATE'
            ), 0)
        )`,
      ].filter((f): f is string => !!f),

      published: [
        filterFeature ? `(${filterFeature})` : undefined,
        `ocs.has_ban_hanh = 1`,
        `EXISTS (
          SELECT 1
          FROM ${this.dbname}.dbo.outgoing_assignment oa2
          WHERE oa2.document_id = outgoing_documents.document_id
            AND (
              oa2.receiver = '${userId}'
              ${receiverUnit ? `OR oa2.receiver_unit = '${receiverUnit}'` : ''}
            )
        )`,
      ].filter((f): f is string => !!f),

      stampedDoc: [
        filterFeature ? `(${filterFeature})` : undefined,
        // `oa.last_audit_id = ocs.last_audit_id`,
        `( oa.stage_status = '${stageStatusDoc.CHUA_XU_LY}' OR oa.stage_status = '${stageStatusDoc.CHO_DONG_DAU}' )`,
        receiverNotCreatorFilter,
      ].filter((f): f is string => !!f),
    };

    if (processFn === 'ChoXuLyTPKTTT' && type === 'waiting') {
      // Logic cũ:
      // where.push(`ocs.current_action_code = 'TRINH_KIEM_TRA_TT'`);
      // where.push(`ocs.current_stage_status = 'CHUA_XU_LY'`);
      // Logic mới:
      where.push(`(
        (ocs.current_action_code = 'TRINH_KIEM_TRA_TT' AND ocs.current_stage_status = 'CHUA_XU_LY')
        OR (ocs.current_action_code IN ('TRINH_KY', 'TRINH_DUYET', 'LUAN_CHUYEN_VAN_BAN_DI', 'TRINH_KIEM_TRA_TT') AND ocs.current_stage_status = 'THU_HOI')
      )`);
    }

    if (type && typeFilters[type]) where.push(...typeFilters[type]);

    let whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';
    whereClause += ` AND outgoing_documents.status = 1`;

    const excludeKeys = ['files', 'statusCode', 'status_code'];
    const { dbKeys, aliases, allViewFields } = await this.traceProcessStep(
      'processDocuments.buildSelectFields',
      { 'app.request.process_fn': processFn || '' },
      () => this.configurationService.buildSelectFieldsNew('outgoing_documents', excludeKeys, processFn),
    );

    const keyDefaultParts: string[] = [];
    if (allViewFields.includes('statusCode') || allViewFields.includes('status_code')) {
      keyDefaultParts.push(`ocs.current_action_code AS status_code`);
    }
    keyDefaultParts.push(`CASE WHEN EXISTS ( SELECT 1 FROM ${this.dbname}.dbo.document_star ds WHERE ds.document_id = outgoing_documents.document_id AND ds.user_id = '${userId}' AND ds.step = '${processFn}') THEN 1 ELSE 0 END AS isStar`);

    keyDefaultParts.push(`ocs.current_stage_status AS stageStatus`);

    aliases['isStar'] = 'is_star';
    aliases['stageStatus'] = 'stage_status';

    const keyDefault = keyDefaultParts.join(', ');
    const selectFieldsArray = [
      ...(keyDefault ? [keyDefault] : []),
      ...dbKeys,
    ];

    const orderBy = ' ORDER BY ' + parseSort(sort, aliases, 'outgoing_documents');
    const selectFields = selectFieldsArray.join(', ');
    const countQuery = `SELECT COUNT(DISTINCT outgoing_documents.document_id) AS total FROM ${this.dbname}.dbo.outgoing_documents ${joinClause} ${whereClause}`;
    const dataQuery = `SELECT ${selectFields} FROM ${this.dbname}.dbo.outgoing_documents ${joinClause} ${whereClause} ${orderBy} OFFSET ${offsetNum} ROWS FETCH NEXT ${limitNum} ROWS ONLY`;

    if (ENABLE_SIGNER_PROCESS_API_LOGS) {
      this.logger.log(
        `[processDocuments] Branch selected: processFn=${processFn}, type=${type}, authority=${authority}, countOnly=${countOnly}, isExport=${isExport}, userId=${userId}, receiverUnit=${receiverUnit ?? 'null'}`,
      );
      this.logger.log(
        `[processDocuments] SQL prepared type=${type} joinLength=${joinClause.length} whereLength=${whereClause.length} countQueryLength=${countQuery.length} dataQueryLength=${dataQuery.length}`,
      );
    }
    logPhase('Phase 3-4: Build Criteria & SQL');

    // ==========================================
    // PHASE 5: Execute SQL Queries (COUNT & DATA)
    // ==========================================
    let totalResult, rowsResult;
    if (countOnly === 'true') {
      const countOnlyStart = Date.now();
      totalResult = await this.traceProcessStep(
        'processDocuments.countQuery',
        { 'app.request.count_only': true },
        () => pool.request().query(countQuery),
      );
      if (ENABLE_SIGNER_PROCESS_API_LOGS) {
        this.logger.log(`[processDocuments] COUNT ONLY duration: ${Date.now() - countOnlyStart}ms`);
      }
      const total = totalResult.recordset[0]?.total ?? 0;
      return { total: total };
    }

    try {
      const countStart = Date.now();
      totalResult = await this.traceProcessStep(
        'processDocuments.countQuery',
        { 'app.request.count_only': false },
        () => pool.request().query(countQuery),
      );
      const countTime = Date.now() - countStart;

      const dataStart = Date.now();
      rowsResult = await this.traceProcessStep(
        'processDocuments.dataQuery',
        {
          'app.request.page': pageNum,
          'app.request.limit': limitNum,
        },
        () => pool.request().query(dataQuery),
      );
      const dataTime = Date.now() - dataStart;

      if (ENABLE_SIGNER_PROCESS_API_LOGS) {
        this.logger.log(
          `[processDocuments] Query durations: Count=${countTime}ms (${totalResult.recordset[0]?.total ?? 0} rows), Data=${dataTime}ms (${rowsResult.recordset.length} rows)`,
        );
      }
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi truy vấn dữ liệu');
    }

    const total = totalResult.recordset[0]?.total ?? 0;
    const items = rowsResult.recordset as DocumentRow[];

    if (shouldTraceDebugDoc) {
      const matchedRawItem = items.find((item: any) => String(item?.document_id) === debugDocId);
      this.logger.warn(
        `[ChoXuLyTP Debug][raw-query] userId=${userId} docId=${debugDocId} total=${total} found=${!!matchedRawItem} raw=${matchedRawItem ? JSON.stringify({
          document_id: matchedRawItem.document_id,
          status_code: (matchedRawItem as any).status_code,
          stageStatus: (matchedRawItem as any).stageStatus,
        }) : 'null'}`,
      );
    }

    const documentIds = items
      .map(d => d.document_id)
      .filter(Boolean)
      .map(String);
    if (!documentIds.length) {
      return {
        success: true,
        items: [],
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: 0
      };
    }

    // ==========================================
    // PHASE 6: Fetch Related Data (Signers via STRING_SPLIT)
    // ==========================================
    const signersReq = pool.request();
    signersReq.input('docIdsCsv', sql.NVarChar(sql.MAX), documentIds.join(','));
    const signersQuery = `
      SELECT document_id, user_id, signer_type, sign_order, is_signed
      FROM ${this.dbname}.dbo.outgoing_document_users
      WHERE document_id IN (SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(@docIdsCsv, ','))
    `;
    if (ENABLE_SIGNER_PROCESS_API_LOGS) {
      this.logger.log(`[processDocuments] Signers query prepared documentCount=${documentIds.length}`);
    }
    const signersStart = Date.now();
    const signersResult = await this.traceProcessStep(
      'processDocuments.signersQuery',
      { 'app.document.count': documentIds.length },
      () => signersReq.query(signersQuery),
    );
    if (ENABLE_SIGNER_PROCESS_API_LOGS) {
      this.logger.log(`[processDocuments] Signers duration: ${Date.now() - signersStart}ms (${signersResult.recordset.length} rows)`);
    }
    logPhase('Phase 6: Signers Query');
    const signerMap = new Map<string, any>();
    for (const row of signersResult?.recordset) {
      if (!signerMap.has(row.document_id)) {
        signerMap.set(row.document_id, {
          reportSigner: [],
          signContentDraft: [],
          signFormatDraft: [],
          paraphSigner: []
        });
      }

      const s = signerMap.get(row.document_id);
      const signerType =
        row.signer_type === 'report_signer' ? 'reportSigner' : row.signer_type;
      if (signerType && row.user_id) {
        // đảm bảo là mảng
        if (!Array.isArray(s[signerType])) {
          s[signerType] = [];
        }

        if (!s[signerType].includes(row.user_id)) {
          s[signerType].push(row.user_id);
        }
      }
    }
    const newItems = items.map(row => {
      const docId = String(row.document_id);
      const signers = docId ? signerMap.get(docId) : undefined;
      const reportSigner = signers?.reportSigner;
      return {
        ...row,
        ...signers,
        report_signer: reportSigner,
      };
    });
    aliases['reportSigner'] = 'report_signer';
    aliases['signContentDraft'] = 'sign_content_draft';
    aliases['signFormatDraft'] = 'sign_format_draft';
    aliases['paraphSigner'] = 'paraph_signer';

    if (!items.length) return { success: true, items: [], mesage: "Không có dữ liệu", total: 0, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };

    const startTimePhase7 = Date.now();
    // ==========================================
    // PHASE 7: Load BPMN Processes
    // ==========================================
    const bpmnVersions = [
      ...new Set(items.map(d => d.bpmn_version)
        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0 && v.toUpperCase() !== 'NULL')),
    ];

    const bpmnEngineMap = await this.traceProcessStep(
      'processDocuments.loadBpmnProcessesCached',
      {
        'app.document.count': newItems.length,
        'app.bpmn.version_count': bpmnVersions.length,
      },
      () => this.loadBpmnProcessesCached(bpmnVersions, receiverUnit),
    );
    const startTimePhase8 = Date.now();

    // ==========================================
    // PHASE 8: Map Details & Keys
    // ==========================================
    const detailedItems = await this.traceProcessStep(
      'processDocuments.mapDocumentDetailsOutgoing',
      {
        'app.document.count': newItems.length,
        'app.bpmn.version_count': bpmnVersions.length,
      },
      () => this.mapDocumentDetailsOutgoing(newItems, bpmnEngineMap, userContext, aliases),
    );
    if (shouldTraceDebugDoc) {
      const matchedDetailedItem = (detailedItems as any[]).find((item: any) =>
        String(item?.document_id || item?.documentId || item?.id) === debugDocId
      );
      this.logger.warn(
        `[ChoXuLyTP Debug][after-map-details] userId=${userId} docId=${debugDocId} found=${!!matchedDetailedItem} detail=${matchedDetailedItem ? JSON.stringify({
          document_id: matchedDetailedItem.document_id,
          documentId: matchedDetailedItem.documentId,
          id: matchedDetailedItem.id,
          stage_status: matchedDetailedItem.stage_status,
          status_code: matchedDetailedItem.status_code,
          openWorkItems: Array.isArray(matchedDetailedItem.openWorkItems)
            ? matchedDetailedItem.openWorkItems.map((wi: any) => ({
              id: wi?.id,
              assigneeUserId: wi?.assigneeUserId,
              role: wi?.role,
              state: wi?.state,
            }))
            : [],
        }) : 'null'}`,
      );
    }
    const startTimePhase9 = Date.now();
    const detailedItemsMapped = await this.traceProcessStep(
      'processDocuments.mapDocOutgoingKeysForList',
      {
        'app.document.count': detailedItems.length,
        'app.request.type': type,
        'app.request.is_export': isExport === 'true',
      },
      () => this.mapDocOutgoingKeysForList(detailedItems, aliases, authority, type, isExport),
    );
    if (shouldTraceDebugDoc) {
      const matchedMappedItem = (detailedItemsMapped as any[]).find((item: any) =>
        String(item?.document_id || item?.documentId || item?.id) === debugDocId
      );
      this.logger.warn(
        `[ChoXuLyTP Debug][before-return] userId=${userId} docId=${debugDocId} found=${!!matchedMappedItem} mapped=${matchedMappedItem ? JSON.stringify({
          document_id: matchedMappedItem.document_id,
          documentId: matchedMappedItem.documentId,
          id: matchedMappedItem.id,
          status_code: matchedMappedItem.status_code,
          stage_status: matchedMappedItem.stage_status,
        }) : 'null'}`,
      );
    }

    return { success: true, items: detailedItemsMapped, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
  }
  private mapStatusCodeToHtml(status: string): string {
    const s = status?.trim();// k xoa pls

    switch (s) {
      case 'Văn bản trả lại':
        return `
<div style="
  display:flex;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  align-items:center;
  justify-content:center;
  width:100%;
  height:30px;
  padding:0 16px;
  background:#FFDCD9;
  color:#F44336;
  font-weight:700;
  font-size:14px;
  border-radius:15px;
  border:1px solid #AEB5BE;
">
  Văn bản trả lại
</div>`.trim();

      case 'Văn bản đang xử lý':
        return `
<div style="
  display:flex;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  align-items:center;
  justify-content:center;
  width:100%;
  height:30px;
  padding:0 16px;
  background:#ADECC0AB;
  color:#007222;
  font-weight:700;
  font-size:14px;
  border-radius:15px;
">
  Văn bản đang xử lý
</div>`.trim();



      case 'Văn bản thu hồi':
        return `
<div style="
  display:flex;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  align-items:center;
  justify-content:center;
  width:100%;
  height:30px;
  padding:0 16px;
  background:#FEF9C2 ;
  color:#FFA600;
  font-weight:700;
  font-size:14px;
  border-radius:15px;
">
  Văn bản thu hồi
</div>`.trim();

      case 'Văn bản đã xử lý':
        return `
<div style="
  display:flex;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  align-items:center;
  justify-content:center;
  width:100%;
  height:30px;
  padding:0 16px;
  background:#E0E0E0 ;
  color:#555555;
  font-weight:700;
  font-size:14px;
  border-radius:15px;
">
  Văn bản đã xử lý
</div>`.trim();
      case 'Văn bản tạo mới':
        return `
<div style="
  display:flex;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  align-items:center;
  justify-content:center;
  width:100%;
  height:30px;
  padding:0 16px;
  background:#FEF9C2 ;
  color:#FFA600;
  font-weight:700;
  font-size:14px;
  border-radius:15px;
">
  Văn bản tạo mới
</div>`.trim();
      case 'Đã phát hành':
        return `
<div style="
  display:flex;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  align-items:center;
  justify-content:center;
  width:100%;
  height:30px;
  padding:0 16px;
  background:#ADECC0AB ;
  color:#007222;
  font-weight:700;
  font-size:14px;
  border-radius:15px;
">
  Đã phát hành
</div>`.trim();
      default:
        return `
<div style="
  display:flex;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  align-items:center;
  justify-content:center;
  width:100%;
  height:30px;
  padding:0 16px;
  background:#fef9c2;
  color:#666;
  font-weight:700;
  font-size:14px;
  border-radius:15px;
">
  ${s || 'Không xác định'}
</div>`.trim();
    }
  }
  private isHtml(value: string): boolean {
    if (!value) return false;
    return /<\/?[a-z][\s\S]*>/i.test(value);
  }

  async listPromulgateDocumentsDynamic(query: ListDocumentsDto, userId: string, authorId?: string) {
    // ==========================================
    // PHASE 1: Parse & Initialize
    // ==========================================
    const { type, page = 1, limit = 20, filter, sort, processFn, authority, isExport, countOnly } = query;
    let limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    if (isExport === 'true') {
      limitNum = 9999;
    }
    const offsetNum = (pageNum - 1) * limitNum;

    // ==========================================
    // PHASE 2: Get Context & Feature Config
    // ==========================================
    const pool = await this.getMsPool();
    const where: string[] = [];

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const [userRoleRes, featureManagement, userRes] = await Promise.all([
      this.userService.getUserRole(userId),
      this.featureManagementRepo.findOne({
        where: { code: processFn, status: 1, statusFeature: StatusFeature.ACTIVE }
      }),
      pool.request().query(
        `SELECT id, parent AS parentId FROM ${this.dbname}.dbo.users WHERE id = '${userId}'`
      )
    ]);

    const { roles } = userRoleRes;
    const receiverUnit = userRes.recordset[0]?.parentId || null;
    const userContext = { userId, roles, receiverUnit };

    // ==========================================
    // PHASE 3: Build Criteria & Filters
    // ==========================================
    const criteria: Array<{ name: string; operator: string; value: string | string[] }> = [];
    const { trackedFields } = this.processFilterCriteria(filter || {}, criteria);
    const hasDeadlineReplyFilter = trackedFields.has('deadline_reply') || trackedFields.has('deadlineReply');

    const featureCriteria = featureManagement?.criteria ?? [];
    const { sql: filterFeature, joins: filterJoins } = buildDocumentCriteriaHelper(
      [...featureCriteria, ...criteria],
      'outgoing_documents',
      featureManagement
    );

    // Văn bản có sao
    if (filter?.isStar === '1' || filter?.isStar === 'true') {
      where.push(` EXISTS ( SELECT 1 FROM ${this.dbname}.dbo.document_star ds WHERE ds.document_id = outgoing_documents.document_id AND ds.user_id = '${userId}' AND ds.step = '${processFn}' ) `);
    }
    if (filter?.isStar === '0' || filter?.isStar === 'false') {
      where.push(` NOT EXISTS ( SELECT 1 FROM ${this.dbname}.dbo.document_star ds WHERE ds.document_id = outgoing_documents.document_id AND ds.user_id = '${userId}' AND ds.step = '${processFn}' ) `);
    }
    if (hasDeadlineReplyFilter) {
      where.push(` outgoing_documents.deadline_reply IS NOT NULL `);
    }

    // ==========================================
    // PHASE 4: Build SQL Clauses (SELECT, JOIN, WHERE)
    // ==========================================
    let joinClause = `
      INNER JOIN ${this.dbname}.dbo.outgoing_current_state ocs
        ON ocs.document_id = outgoing_documents.document_id`;
    if (filterJoins) joinClause += ' ' + filterJoins;
    const canViewDetailFilter = `EXISTS (
      SELECT 1
      FROM ${this.dbname}.dbo.audit a_perm
      WHERE a_perm.document_id = outgoing_documents.document_id
        AND (
          a_perm.user_id = '${userId}'
          OR a_perm.created_by = '${userId}'
          OR a_perm.receiver = '${userId}'
          ${receiverUnit ? `OR a_perm.receiver = '${receiverUnit}' OR a_perm.receiver_unit = '${receiverUnit}'` : ''}
        )
    )`;

    const typeFilters: Record<string, string[]> = {
      waiting: [
        filterFeature ? `(${filterFeature})` : undefined,
        `EXISTS (
          SELECT 1 FROM ${this.dbname}.dbo.outgoing_assignment oa
          WHERE oa.document_id = outgoing_documents.document_id
            AND (
              oa.receiver = '${userId}'
              ${receiverUnit ? `OR oa.receiver = '${receiverUnit}' OR oa.receiver = 'CAN_CHO_SO' OR oa.receiver_unit = '${receiverUnit}'` : ''}
            )
        )`,
        canViewDetailFilter,
        `( ocs.current_stage_status = '${stageStatusDoc.HT_VBTT}'
        OR ocs.current_stage_status = '${stageStatusDoc.BAN_HANH_TO_TRINH}'
        OR (ocs.current_stage_status = '${stageStatusDoc.CHUA_XU_LY}' AND ocs.current_action_code IN ('${stageStatusDoc.KY_SO}', '${stageStatusDoc.CHO_SO}', '${stageStatusDoc.DONG_Y_VBDT}', '${stageStatusDoc.KY_PHAT_HANH}', '${stageStatusDoc.DONG_DAU}'))
        OR ocs.current_stage_status = 'CAN_CHO_SO'
        OR ocs.current_stage_status = '${stageStatusDoc.DA_DONG_DAU}'
        OR ocs.current_stage_status = '${stageStatusDoc.DA_CHO_SO}'
        OR ocs.current_stage_status = '${stageStatusDoc.DA_KY_BAN_HANH}'
        OR ocs.current_stage_status = '${stageStatusDoc.DA_KY_NHAY}'
        OR ocs.current_stage_status = '${stageStatusDoc.DA_KY_CHINH_THUC_1}'
        OR ocs.current_stage_status = '${stageStatusDoc.DA_KY_CHINH_THUC_2}'
        OR ocs.current_stage_status = '${stageStatusDoc.DA_KY_CHINH_THUC_3}' )`,
        `ocs.has_ban_hanh = 0`,
      ].filter((f): f is string => !!f),

      processed: [
        filterFeature ? `(${filterFeature})` : undefined,
        `ocs.current_stage_status IN ('${stageStatusDoc.DA_BAN_HANH}', 'BI_THAY_THE')`,
        canViewDetailFilter,
        `EXISTS (
          SELECT 1
          FROM ${this.dbname}.dbo.outgoing_assignment oa2
          WHERE oa2.document_id = outgoing_documents.document_id
            AND (
              oa2.receiver = '${userId}'
              ${receiverUnit ? `OR oa2.receiver_unit = '${receiverUnit}'` : ''}
            )
        )`,
      ].filter((f): f is string => !!f),
    };

    if (type && typeFilters[type]) where.push(...typeFilters[type]);

    let whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';
    whereClause += ` AND outgoing_documents.status = 1`;

    const excludeKeys = ['files', 'statusCode', 'status_code'];
    const { dbKeys, aliases, allViewFields } = await this.configurationService.buildSelectFieldsNew('outgoing_documents', excludeKeys, processFn);

    const keyDefaultParts: string[] = [];
    if (allViewFields.includes('statusCode') || allViewFields.includes('status_code')) {
      keyDefaultParts.push(
        `CASE WHEN ocs.current_action_code = 'CREATE' AND ocs.current_stage_status = '${stageStatusDoc.HT_VBTT}' THEN 'CAN_CHO_SO'
             ELSE ocs.current_action_code
        END AS status_code`
      );
    }
    keyDefaultParts.push(`CASE WHEN EXISTS ( SELECT 1 FROM ${this.dbname}.dbo.document_star ds WHERE ds.document_id = outgoing_documents.document_id AND ds.user_id = '${userId}' AND ds.step = '${processFn}') THEN 1 ELSE 0 END AS isStar`);
    aliases['isStar'] = 'is_star';

    const keyDefault = keyDefaultParts.join(', ');
    const selectFieldsArray = [
      ...(keyDefault ? [keyDefault] : []),
      ...dbKeys,
    ];

    const orderBy = ' ORDER BY ' + parseSort(sort, aliases, 'outgoing_documents');
    const selectFields = selectFieldsArray.join(', ');

    // ==========================================
    // PHASE 5: Execute SQL Queries (COUNT & DATA)
    // ==========================================
    let totalResult, rowsResult;
    if (countOnly === 'true') {
      totalResult = await pool.request().query(`SELECT COUNT(*) AS total FROM outgoing_documents ${joinClause}${whereClause}`);
      const total = totalResult.recordset[0]?.total ?? 0;
      return { total: total };
    }
    try {
      [totalResult, rowsResult] = await Promise.all([
        pool.request().query(`SELECT COUNT(*) AS total FROM ${this.dbname}.dbo.outgoing_documents ${joinClause}${whereClause}`),
        pool.request().query(`SELECT ${selectFields} FROM ${this.dbname}.dbo.outgoing_documents ${joinClause}${whereClause}${orderBy} OFFSET ${offsetNum} ROWS FETCH NEXT ${limitNum} ROWS ONLY`),
      ]);
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi truy vấn dữ liệu');
    }

    const total = totalResult.recordset[0]?.total ?? 0;
    const items = rowsResult.recordset as DocumentRow[];

    if (!items.length) return { success: true, items: [], mesage: "Không có dữ liệu", total: 0, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };

    // ==========================================
    // PHASE 6: Fetch Related Data (Not needed)
    // ==========================================

    // ==========================================
    // PHASE 7: Load BPMN Processes
    // ==========================================
    const bpmnVersions = [
      ...new Set(items.map(d => d.bpmn_version)
        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0 && v.toUpperCase() !== 'NULL')),
    ];

    const bpmnEngineMap = await this.loadBpmnProcessesCached(bpmnVersions, receiverUnit);

    // ==========================================
    // PHASE 8: Map Details & Keys
    // ==========================================
    const detailedItems = await this.mapDocumentDetailsOutgoing(items, bpmnEngineMap, userContext, aliases);
    const detailedItemsMapped = await this.mapDocOutgoingKeysForList(detailedItems, aliases, authority, type, isExport);

    return { success: true, items: detailedItemsMapped, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
  }


  async listViewDocumentsDynamic(query: ListDocumentsDto, userId: string, authorId?: string) {
    // ==========================================
    // PHASE 1: Parse & Initialize
    // ==========================================
    const { type, page = 1, limit = 20, filter, sort, processFn, authority, isExport } = query;
    let limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    if (isExport === 'true') {
      limitNum = 9999;
    }
    const offsetNum = (pageNum - 1) * limitNum;

    // ==========================================
    // PHASE 2: Get Context & Feature Config
    // ==========================================
    const pool = await this.getMsPool();
    const where: string[] = [];

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const [userRoleRes, featureManagement, userRes, userGroupIds] = await Promise.all([
      this.userService.getUserRole(userId),
      this.featureManagementRepo.findOne({
        where: { code: processFn, status: 1, statusFeature: StatusFeature.ACTIVE }
      }),
      pool.request().query(
        `SELECT id, parent AS parentId FROM ${this.dbname}.dbo.users WHERE id = '${userId}'`
      ),
      this.getUserGroupIdsCached(userId),
    ]);

    const { roles } = userRoleRes;
    const receiverUnit = userRes.recordset[0]?.parentId || null;
    const userContext = { userId, roles, receiverUnit };

    // ==========================================
    // PHASE 3: Build Where Conditions & Filters
    // ==========================================
    const criteria: Array<{ name: string; operator: string; value: string | string[] }> = [];
    const { trackedFields } = this.processFilterCriteria(filter || {}, criteria);
    const hasDeadlineReplyFilter = trackedFields.has('deadline_reply') || trackedFields.has('deadlineReply');

    const featureCriteria = featureManagement?.criteria ?? [];
    const { sql: filterFeature, joins: filterJoins } = buildDocumentCriteriaHelper(
      [...featureCriteria, ...criteria],
      'outgoing_documents',
      featureManagement
    );

    let joinClause = `
      INNER JOIN ${this.dbname}.dbo.outgoing_current_state ocs
        ON ocs.document_id = outgoing_documents.document_id`;

    if (filter?.isStar === '1' || filter?.isStar === 'true') {
      where.push(` EXISTS ( SELECT 1 FROM ${this.dbname}.dbo.document_star ds WHERE ds.document_id = outgoing_documents.document_id AND ds.user_id = '${userId}' AND ds.step = '${processFn}' ) `);
    }
    if (filter?.isStar === '0' || filter?.isStar === 'false') {
      where.push(` NOT EXISTS ( SELECT 1 FROM ${this.dbname}.dbo.document_star ds WHERE ds.document_id = outgoing_documents.document_id AND ds.user_id = '${userId}' AND ds.step = '${processFn}' ) `);
    }
    if (hasDeadlineReplyFilter) {
      where.push(` outgoing_documents.deadline_reply IS NOT NULL `);
    }
    if (filterJoins) joinClause += ' ' + filterJoins;

    const wrapSqlString = (v: any) => `'${String(v).replace(/'/g, "''")}'`;

    const isKnowToKnowMenu = processFn === 'ChuaXuLyTP';
    const publishedFilter = isKnowToKnowMenu
      ? `EXISTS (
          SELECT 1 FROM (
              SELECT TOP 1 stage_status 
              FROM ${this.dbname}.dbo.audit a_sub 
              WHERE a_sub.document_id = outgoing_documents.document_id 
              ORDER BY a_sub.id DESC
          ) latest 
          WHERE latest.stage_status IN ( 'DA_DONG_DAU', 'DA_BAN_HANH' ) 
        )`
      : `(ocs.has_ban_hanh = 1 OR ocs.has_da_xu_ly = 1 OR dong_dau_cuoi = 1)`;

    const buildGroupViewerCondition = (groupIds: string[]): string | null => {
      if (!groupIds.length) return null;

      const groupIdList = groupIds.map(wrapSqlString).join(', ');

      return `(
        ISJSON(outgoing_documents.document_viewer_groups) = 1
        AND EXISTS (
          SELECT 1
          FROM OPENJSON(outgoing_documents.document_viewer_groups)
          WHERE (
            CASE WHEN [type] = 5
              THEN COALESCE(JSON_VALUE([value], '$.id'), JSON_VALUE([value], '$.groupId'))
              ELSE CONVERT(NVARCHAR(100), [value])
            END
          ) IN (${groupIdList})
        )
      )`;
    };

    const groupViewerCondition = buildGroupViewerCondition(userGroupIds);

    const buildUserVisibilityCondition = (userIdSql: string): string => {
      const knowReceiversCondition = `(
        ISJSON(outgoing_documents.know_receivers) = 1
        AND EXISTS (
          SELECT 1
          FROM OPENJSON(outgoing_documents.know_receivers)
          WHERE (
            CASE WHEN [type] = 5
              THEN JSON_VALUE([value], '$.id')
              ELSE CONVERT(NVARCHAR(100), [value])
            END
          ) = ${userIdSql}
        )
      )`;
      return knowReceiversCondition;
    };

    const wrappedUserId = wrapSqlString(userId);

    const viewedsCondition = `(
      ISJSON(outgoing_documents.vieweds) = 1
      AND EXISTS (
        SELECT 1
        FROM OPENJSON(outgoing_documents.vieweds)
        WHERE (
          CASE WHEN [type] = 5
            THEN JSON_VALUE([value], '$.id')
            ELSE CONVERT(NVARCHAR(100), [value])
          END
        ) = ${wrappedUserId}
      )
    )`;

    const typeFilters: Record<string, string[]> = {
      waiting: [
        filterFeature?.trim() ? `(${filterFeature})` : null,
        publishedFilter,
        buildUserVisibilityCondition(wrappedUserId),
        `NOT ${viewedsCondition}`,
      ].filter((f): f is string => !!f),

      processed: [
        filterFeature?.trim() ? `(${filterFeature})` : null,
        publishedFilter,
        groupViewerCondition ? `(${viewedsCondition} OR ${groupViewerCondition})` : viewedsCondition,
      ].filter((f): f is string => !!f),
    };

    if (type && typeFilters[type]) where.push(...typeFilters[type]);
    where.push('outgoing_documents.status = 1');
    const whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';

    // ==========================================
    // PHASE 4: Build Select Fields & Order By
    // ==========================================
    const excludeKeys = ['files', 'statusCode', 'status_code'];
    const { dbKeys, aliases, allViewFields } = await this.configurationService.buildSelectFieldsNew('outgoing_documents', excludeKeys, processFn);

    const keyDefaultParts: string[] = [];
    if (allViewFields.includes('statusCode') || allViewFields.includes('status_code')) {
      keyDefaultParts.push(
        `(SELECT TOP 1 CASE 
            WHEN a.action_code = 'DONG_DAU' 
                THEN 'DA_DONG_DAU_HET_LUONG'
            ELSE a.action_code
        END FROM ${this.dbname}.dbo.audit a WHERE a.document_id = outgoing_documents.document_id ORDER BY a.id DESC) AS status_code`
      );
    }
    keyDefaultParts.push(`CASE WHEN EXISTS ( SELECT 1 FROM ${this.dbname}.dbo.document_star ds WHERE ds.document_id = outgoing_documents.document_id AND ds.user_id = '${userId}' AND ds.step = '${processFn}') THEN 1 ELSE 0 END AS isStar`);
    aliases['isStar'] = 'is_star';

    const selectFieldsArray = [
      ...keyDefaultParts,
      ...dbKeys.map((f, i) => f && f.trim() ? f : `col_${i}`),
    ];
    const selectFields = selectFieldsArray.join(',');
    const orderBy = ' ORDER BY ' + parseSort(sort, aliases, 'outgoing_documents');

    // ==========================================
    // PHASE 5: Execute Queries (Count & Data)
    // ==========================================
    let totalResult, rowsResult;

    try {
      const countSql = `SELECT COUNT(*) AS total FROM ${this.dbname}.dbo.outgoing_documents ${joinClause}${whereClause}`;
      const dataSql = `SELECT ${selectFields} FROM ${this.dbname}.dbo.outgoing_documents ${joinClause}${whereClause}${orderBy} OFFSET ${offsetNum} ROWS FETCH NEXT ${limitNum} ROWS ONLY`;
      [totalResult, rowsResult] = await Promise.all([
        pool.request().query(countSql),
        pool.request().query(dataSql),
      ]);
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi truy vấn dữ liệu');
    }

    const total = totalResult.recordset[0]?.total ?? 0;
    const items = rowsResult.recordset as DocumentRow[];

    if (!items.length) {
      return { success: true, items: [], mesage: "Không có dữ liệu", total: 0, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
    }

    // ==========================================
    // PHASE 6: Load Bpmn & Cache Info
    // ==========================================
    const bpmnVersions = [
      ...new Set(items.map(d => d.bpmn_version)
        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0 && v.toUpperCase() !== 'NULL')),
    ];

    const bpmnEngineMap = await this.loadBpmnProcessesCached(bpmnVersions, receiverUnit);

    // ==========================================
    // PHASE 7: Map Document Details
    // ==========================================
    const detailedItems = await this.mapDocumentDetailsOutgoing(items, bpmnEngineMap, userContext, aliases, true);
    const detailedItemsMapped = await this.mapDocOutgoingKeysForList(detailedItems, aliases, authority, type, isExport, sort);

    if (sort?.status_code) {
      sortByStatusCode(detailedItemsMapped, Number(sort.status_code));
    }

    for (const item of detailedItemsMapped as any[]) {
      if (item.status_code && !this.isHtml(item.status_code) && isExport !== 'true') {
        item.status_code = this.mapStatusCodeToHtml(item.status_code);
      }
      item.canMarkViewed = type === 'waiting';

      let knowReceivers = item.knowReceivers || item.know_receivers || [];
      if (typeof knowReceivers === 'string') {
        try { knowReceivers = JSON.parse(knowReceivers); } catch { knowReceivers = []; }
      }
      let viewedsList = item.vieweds || [];
      if (typeof viewedsList === 'string') {
        try { viewedsList = JSON.parse(viewedsList); } catch { viewedsList = []; }
      }

      item.isKnowReceiver = Array.isArray(knowReceivers) && knowReceivers.some((r: any) =>
        (typeof r === 'string' ? r : r?.id) === userId
      );
      item.isViewed = Array.isArray(viewedsList) && viewedsList.some((r: any) =>
        (typeof r === 'string' ? r : r?.id) === userId
      );

      let documentViewerGroups = item.documentViewerGroups || item.document_viewer_groups || [];
      if (typeof documentViewerGroups === 'string') {
        try { documentViewerGroups = JSON.parse(documentViewerGroups); } catch { documentViewerGroups = []; }
      }
      item.isGroupViewer = Array.isArray(documentViewerGroups) && userGroupIds.length > 0
        && documentViewerGroups.some((g: any) =>
          userGroupIds.includes(String(typeof g === 'string' ? g : g?.id ?? g?.groupId))
        );
    }

    // ==========================================
    // PHASE 8: Return Response
    // ==========================================
    return { success: true, items: detailedItemsMapped, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
  }

  async listNextStageNotificationDocuments(query: ListDocumentsDto, userId: string, authorId?: string) {
    const { type, page = 1, limit = 20, sort, authority, isExport, countOnly, processFn } = query || {};
    let limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    if (isExport === 'true') {
      limitNum = 9999;
    }
    const offsetNum = (pageNum - 1) * limitNum;

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const pool = await this.getMsPool();
    const latestNotificationCte = `
      WITH latest AS (
        SELECT
          n.recordId,
          n.recipientId,
          n.title,
          n.content,
          n.link,
          n.isRead,
          n.createdAt,
          ROW_NUMBER() OVER (
            PARTITION BY n.recordId, n.recipientId
            ORDER BY n.createdAt DESC, n.id DESC
          ) AS rn
        FROM ${this.dbname}.dbo.notifications n
        WHERE n.recipientId = @userId
          AND n.[key] = 'VIEW_OUTCOMING_DOC'
          AND n.[type] = '${NotificationType.CONCURENT_STEP_OUTGOING.value}'
          AND ISNULL(n.recordId, '') <> ''
      )
    `;

    const readFilter =
      type === 'waiting'
        ? 'AND latest.isRead = 0'
        : '';

    if (countOnly === 'true') {
      const countResult = await pool.request()
        .input('userId', sql.NVarChar, userId)
        .query(`
          ${latestNotificationCte}
          SELECT COUNT(*) AS total
          FROM latest
          INNER JOIN ${this.dbname}.dbo.outgoing_documents outgoing_documents
            ON CAST(outgoing_documents.document_id AS NVARCHAR(255)) = latest.recordId
          WHERE latest.rn = 1
            ${readFilter}
            AND outgoing_documents.status = 1
        `);
      return { total: Number(countResult.recordset?.[0]?.total || 0) };
    }

    const excludeKeys = ['files', 'statusCode', 'status_code'];
    const { dbKeys, aliases } = await this.configurationService.buildSelectFieldsNew('outgoing_documents', excludeKeys, processFn);

    const selectFields = [
      `latest.createdAt AS next_stage_notification_at`,
      `latest.title AS next_stage_notification_title`,
      `latest.content AS next_stage_notification_content`,
      `latest.link AS next_stage_notification_link`,
      `CAST(latest.isRead AS INT) AS next_stage_notification_is_read`,
      ...dbKeys,
    ].join(', ');

    const orderBy = sort
      ? ' ORDER BY ' + parseSort(sort, aliases, 'outgoing_documents')
      : ' ORDER BY latest.createdAt DESC';

    const totalResult = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        ${latestNotificationCte}
        SELECT COUNT(*) AS total
        FROM latest
        INNER JOIN ${this.dbname}.dbo.outgoing_documents outgoing_documents
          ON CAST(outgoing_documents.document_id AS NVARCHAR(255)) = latest.recordId
        WHERE latest.rn = 1
          ${readFilter}
          AND outgoing_documents.status = 1
      `);

    const total = Number(totalResult.recordset?.[0]?.total || 0);
    if (!total) {
      return { success: true, items: [], mesage: 'Không có dữ liệu', total: 0, page: pageNum, limit: limitNum, totalPages: 0 };
    }

    const rowsResult = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        ${latestNotificationCte}
        SELECT ${selectFields}
        FROM latest
        INNER JOIN ${this.dbname}.dbo.outgoing_documents outgoing_documents
          ON CAST(outgoing_documents.document_id AS NVARCHAR(255)) = latest.recordId
        WHERE latest.rn = 1
          ${readFilter}
          AND outgoing_documents.status = 1
        ${orderBy}
        OFFSET ${offsetNum} ROWS FETCH NEXT ${limitNum} ROWS ONLY
      `);

    const items = rowsResult.recordset as DocumentRow[];
    if (!items.length) {
      return { success: true, items: [], mesage: 'Không có dữ liệu', total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
    }

    const userRoleRes = await this.userService.getUserRole(userId);
    const userRes = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`SELECT id, parent AS parentId FROM ${this.dbname}.dbo.users WHERE id = @userId`);
    const receiverUnit = userRes.recordset[0]?.parentId || null;
    const userContext = { userId, roles: userRoleRes?.roles || [], receiverUnit };

    const bpmnVersions = [
      ...new Set(items.map(d => d.bpmn_version)
        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0 && v.toUpperCase() !== 'NULL')),
    ];
    const bpmnEngineMap = await this.loadBpmnProcessesCached(bpmnVersions, receiverUnit);
    const detailedItems = await this.mapDocumentDetailsOutgoing(items, bpmnEngineMap, userContext, aliases);
    const detailedItemsMapped = await this.mapDocOutgoingKeysForList(detailedItems, aliases, authority, type, isExport);

    return {
      success: true,
      items: detailedItemsMapped,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }


  private async countProcessWaitingItems(
    pool: any,
    userId: string,
    receiverUnit: string | null,
    processFn: string,
    filter: any
  ): Promise<number> {
    const where: string[] = [];
    const criteria: Array<{ name: string; operator: string; value: string | string[] }> = [];

    const { trackedFields } = this.processFilterCriteria(filter || {}, criteria);
    const hasDeadlineReplyFilter = trackedFields.has('deadline_reply') || trackedFields.has('deadlineReply');

    const featureManagement = await this.featureManagementRepo.findOne({
      where: { code: processFn, status: 1, statusFeature: StatusFeature.ACTIVE }
    });

    const featureCriteria = featureManagement?.criteria ?? [];
    const { sql: filterFeature } = buildDocumentCriteriaHelper(
      [...featureCriteria, ...criteria],
      'outgoing_documents',
      featureManagement
    );

    // ==================== WHERE CONDITIONS ====================
    if (filter?.isStar === '1' || filter?.isStar === 'true') {
      where.push(`EXISTS (SELECT 1 FROM ${this.dbname}.dbo.document_star ds 
            WHERE ds.document_id = outgoing_documents.document_id 
              AND ds.user_id = '${userId}' AND ds.step = '${processFn}')`);
    }
    if (filter?.isStar === '0' || filter?.isStar === 'false') {
      where.push(`NOT EXISTS (SELECT 1 FROM ${this.dbname}.dbo.document_star ds 
            WHERE ds.document_id = outgoing_documents.document_id 
              AND ds.user_id = '${userId}' AND ds.step = '${processFn}')`);
    }
    if (hasDeadlineReplyFilter) {
      where.push(`outgoing_documents.deadline_reply IS NOT NULL`);
    }

    where.push(`ocs.has_ban_hanh = 0`);
    where.push(`
        (
          (oa.document_id IS NOT NULL AND ISNULL(oa.is_creator, 0) = 0)
        )
    `);
    where.push(`
        (oa.stage_status = '${stageStatusDoc.HT_VBTT}'
         OR oa.stage_status = '${stageStatusDoc.CHUA_XU_LY}'
         OR oa.stage_status = '${stageStatusDoc.CHO_KY_NOI_DUNG}'
         OR oa.stage_status = '${stageStatusDoc.CHO_KY_THE_THUC}'
         OR oa.stage_status = '${stageStatusDoc.CHO_KY_BAN_HANH}'
         OR oa.stage_status = '${stageStatusDoc.CHO_KY_NHAY}'
         OR oa.stage_status = '${stageStatusDoc.CHO_KY_CHINH_THUC}'
         OR oa.stage_status = '${stageStatusDoc.CHO_KY_CHINH_THUC_1}'
         OR oa.stage_status = '${stageStatusDoc.CHO_KY_CHINH_THUC_2}'
         OR oa.stage_status = '${stageStatusDoc.CHO_KY_CHINH_THUC_3}'
         OR oa.stage_status = '${stageStatusDoc.CHO_XAC_NHAN}'
         OR oa.stage_status = '${stageStatusDoc.CHO_THAM_DINH}'
         OR oa.stage_status = '${stageStatusDoc.CHO_KY_DONG_DAU}'
         OR oa.stage_status = '${stageStatusDoc.CHO_DONG_DAU}')
    `);

    if (filterFeature?.trim()) where.push(`(${filterFeature})`);
    where.push('outgoing_documents.status = 1');

    const whereClause = ' WHERE ' + where.join(' AND ');

    const sql = `
        SELECT COUNT(DISTINCT outgoing_documents.document_id) AS total
        FROM ${this.dbname}.dbo.outgoing_documents
        INNER JOIN ${this.dbname}.dbo.outgoing_current_state ocs 
            ON ocs.document_id = outgoing_documents.document_id
        LEFT JOIN ${this.dbname}.dbo.outgoing_assignment oa
            ON oa.document_id = outgoing_documents.document_id
            AND (oa.receiver = '${userId}'
                ${receiverUnit ? ` OR oa.receiver = '${receiverUnit}' OR oa.receiver_unit = '${receiverUnit}'` : ''})
        ${filterFeature && filterFeature.includes('JOIN') ? '' : ''}  -- nếu có join từ filterFeature thì cần xử lý sau
        ${whereClause}
    `;

    try {
      const result = await pool.request().query(sql);
      return result.recordset[0]?.total || 0;
    } catch (e) {
      this.logger.error('Error in countProcessWaitingItems:', e);
      return 0;
    }
  }

  private async countViewerWaitingItems(
    pool: any,
    userId: string,
    receiverUnit: string | null,
    processFn: string,
    filter: any
  ): Promise<number> {
    const where: string[] = [];
    const criteria: Array<{ name: string; operator: string; value: string | string[] }> = [];

    const { trackedFields } = this.processFilterCriteria(filter || {}, criteria);
    const hasDeadlineReplyFilter = trackedFields.has('deadline_reply') || trackedFields.has('deadlineReply');

    const featureManagement = await this.featureManagementRepo.findOne({
      where: { code: processFn, status: 1, statusFeature: StatusFeature.ACTIVE }
    });

    const featureCriteria = featureManagement?.criteria ?? [];
    const { sql: filterFeature } = buildDocumentCriteriaHelper(
      [...featureCriteria, ...criteria],
      'outgoing_documents',
      featureManagement
    );

    // ==================== WHERE CONDITIONS ====================
    if (filter?.isStar === '1' || filter?.isStar === 'true') {
      where.push(`EXISTS (SELECT 1 FROM ${this.dbname}.dbo.document_star ds 
            WHERE ds.document_id = outgoing_documents.document_id 
              AND ds.user_id = '${userId}' AND ds.step = '${processFn}')`);
    }

    if (filter?.isStar === '0' || filter?.isStar === 'false') {
      where.push(`NOT EXISTS (SELECT 1 FROM ${this.dbname}.dbo.document_star ds 
            WHERE ds.document_id = outgoing_documents.document_id 
              AND ds.user_id = '${userId}' AND ds.step = '${processFn}')`);
    }

    if (hasDeadlineReplyFilter) {
      where.push(`outgoing_documents.deadline_reply IS NOT NULL`);
    }

    // Viewer specific conditions
    if (processFn === 'ChuaXuLyTP') {
      where.push(`EXISTS (
            SELECT 1 FROM (
                SELECT TOP 1 stage_status 
                FROM ${this.dbname}.dbo.audit a_sub 
                WHERE a_sub.document_id = outgoing_documents.document_id 
                ORDER BY a_sub.id DESC
            ) latest 
            WHERE latest.stage_status = 'DA_BAN_HANH'
        )`);
    } else {
      where.push(`(ocs.has_ban_hanh = 1 OR ocs.has_da_xu_ly = 1)`);
    }
    where.push(`
        ISJSON(outgoing_documents.know_receivers) = 1
        AND EXISTS (SELECT 1 FROM OPENJSON(outgoing_documents.know_receivers) 
                    WHERE value = '${userId}')
    `);

    if (filterFeature?.trim()) {
      where.push(`(${filterFeature})`);
    }

    where.push('outgoing_documents.status = 1');

    const whereClause = ' WHERE ' + where.join(' AND ');

    const sql = `
        SELECT COUNT(DISTINCT outgoing_documents.document_id) AS total
        FROM ${this.dbname}.dbo.outgoing_documents
        INNER JOIN ${this.dbname}.dbo.outgoing_current_state ocs 
            ON ocs.document_id = outgoing_documents.document_id
        ${filterFeature && filterFeature.includes('JOIN') ? /* thêm filterJoins nếu cần */ '' : ''}
        ${whereClause}
    `;

    try {
      const result = await pool.request().query(sql);
      return result.recordset[0]?.total || 0;
    } catch (e) {
      this.logger.error('Error in countViewerWaitingItems:', e);
      return 0;
    }
  }

  async countCombinedProcessAndViewer(
    userId: string,
    query: ListDocumentsNoTypeDto,
    authorId?: string
  ): Promise<{
    total: number;
    totalProcess: number;
    totalViewer: number;
  }> {
    const { filter, authority } = query;

    const processFnProcess = (query as any).processFnProcess || 'ChoXuLyTP';
    const processFnViewer = (query as any).processFnViewer || 'ChuaXuLyTP';

    const pool = await this.getMsPool();

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const [userRoleRes, userRes] = await Promise.all([
      this.userService.getUserRole(userId),
      pool.request().query(`
            SELECT id, parent AS parentId 
            FROM ${this.dbname}.dbo.users 
            WHERE id = '${userId}'
        `)
    ]);

    const { roles } = userRoleRes;
    const receiverUnit = userRes.recordset[0]?.parentId || null;

    // ===================================================================
    // Chỉ lấy COUNT từ 2 hàm riêng biệt (tối ưu nhất)
    // ===================================================================
    const [processCount, viewerCount] = await Promise.all([
      this.countProcessWaitingItems(pool, userId, receiverUnit, processFnProcess, filter),
      this.countViewerWaitingItems(pool, userId, receiverUnit, processFnViewer, filter)
    ]);

    const total = processCount + viewerCount;

    return {
      total,
      totalProcess: processCount,
      totalViewer: viewerCount,
    };
  }


  private async getProcessWaitingItems(
    pool: any,
    userId: string,
    receiverUnit: string | null,
    processFn: string,
    filter: any,
    sort: any,
    isExport: string
  ): Promise<any[]> {
    const where: string[] = [];
    const criteria: Array<{ name: string; operator: string; value: string | string[] }> = [];

    const { trackedFields } = this.processFilterCriteria(filter || {}, criteria);
    const hasDeadlineReplyFilter = trackedFields.has('deadline_reply') || trackedFields.has('deadlineReply');

    const featureManagement = await this.featureManagementRepo.findOne({
      where: { code: processFn, status: 1, statusFeature: StatusFeature.ACTIVE }
    });

    const featureCriteria = featureManagement?.criteria ?? [];
    const { sql: filterFeature, joins: filterJoins } = buildDocumentCriteriaHelper(
      [...featureCriteria, ...criteria],
      'outgoing_documents',
      featureManagement
    );

    let joinClause = `
    INNER JOIN ${this.dbname}.dbo.outgoing_current_state ocs 
      ON ocs.document_id = outgoing_documents.document_id
    LEFT JOIN ${this.dbname}.dbo.outgoing_assignment oa
      ON oa.document_id = outgoing_documents.document_id
      AND (oa.receiver = '${userId}'
        ${receiverUnit ? ` OR oa.receiver = '${receiverUnit}' OR oa.receiver_unit = '${receiverUnit}'` : ''})
  `;

    if (filterJoins) joinClause += ' ' + filterJoins;

    // Filters
    if (filter?.isStar === '1' || filter?.isStar === 'true') {
      where.push(`EXISTS (SELECT 1 FROM ${this.dbname}.dbo.document_star ds 
      WHERE ds.document_id = outgoing_documents.document_id AND ds.user_id = '${userId}' AND ds.step = '${processFn}')`);
    }
    if (filter?.isStar === '0' || filter?.isStar === 'false') {
      where.push(`NOT EXISTS (SELECT 1 FROM ${this.dbname}.dbo.document_star ds 
      WHERE ds.document_id = outgoing_documents.document_id AND ds.user_id = '${userId}' AND ds.step = '${processFn}')`);
    }
    if (hasDeadlineReplyFilter) {
      where.push(`outgoing_documents.deadline_reply IS NOT NULL`);
    }

    where.push(`ocs.has_ban_hanh = 0`);
    where.push(`
    oa.document_id IS NOT NULL
    AND ISNULL(oa.is_creator, 0) = 0
  `);
    where.push(`
    (oa.stage_status = '${stageStatusDoc.HT_VBTT}'
     OR oa.stage_status = '${stageStatusDoc.CHUA_XU_LY}'
     OR oa.stage_status = '${stageStatusDoc.CHO_KY_NOI_DUNG}'
     OR oa.stage_status = '${stageStatusDoc.CHO_KY_THE_THUC}'
     OR oa.stage_status = '${stageStatusDoc.CHO_KY_BAN_HANH}'
     OR oa.stage_status = '${stageStatusDoc.CHO_KY_NHAY}'
     OR oa.stage_status = '${stageStatusDoc.CHO_KY_CHINH_THUC}'
     OR oa.stage_status = '${stageStatusDoc.CHO_KY_CHINH_THUC_1}'
     OR oa.stage_status = '${stageStatusDoc.CHO_KY_CHINH_THUC_2}'
     OR oa.stage_status = '${stageStatusDoc.CHO_KY_CHINH_THUC_3}'
     OR oa.stage_status = '${stageStatusDoc.CHO_XAC_NHAN}'
     OR oa.stage_status = '${stageStatusDoc.CHO_THAM_DINH}'
     OR oa.stage_status = '${stageStatusDoc.CHO_KY_DONG_DAU}'
     OR oa.stage_status = '${stageStatusDoc.CHO_DONG_DAU}')
  `);

    if (filterFeature?.trim()) where.push(`(${filterFeature})`);
    where.push('outgoing_documents.status = 1');

    const whereClause = ' WHERE ' + where.join(' AND ');

    // ====================== SELECT FIELDS - TRÁNH DUPLICATE ======================
    const excludeKeys = ['files', 'statusCode', 'status_code'];
    const { dbKeys, aliases } = await this.configurationService.buildSelectFieldsNew(
      'outgoing_documents',
      excludeKeys,
      processFn
    );

    // Loại bỏ trùng lặp bằng cách dùng Set cho tên cột
    const selectSet = new Set<string>();

    // Các trường chính từ outgoing_documents (không alias)
    const mainFields = [
      'outgoing_documents.document_id AS id',           // đổi thành id để dễ dùng sau
      'ocs.current_action_code AS status_code',
      'ocs.current_stage_status AS stageStatus',
      `CASE WHEN EXISTS (SELECT 1 FROM ${this.dbname}.dbo.document_star ds 
       WHERE ds.document_id = outgoing_documents.document_id 
         AND ds.user_id = '${userId}' AND ds.step = '${processFn}') 
     THEN 1 ELSE 0 END AS isStar`
    ];

    mainFields.forEach(f => selectSet.add(f));

    // Thêm dbKeys từ configuration, tránh trùng với các trường đã có
    dbKeys.forEach((key: string) => {
      if (key && key.trim()) {
        const cleanKey = key.trim().replace(/^\s*[\w.]+\s+AS\s+/i, '').trim(); // lấy phần tên cột
        if (!['document_id', 'status_code', 'stageStatus', 'isStar'].includes(cleanKey)) {
          selectSet.add(key);
        }
      }
    });

    const selectFields = Array.from(selectSet).join(', ');

    aliases['isStar'] = 'is_star';
    aliases['stageStatus'] = 'stage_status';

    const orderBy = sort
      ? ` ORDER BY ${parseSort(sort, aliases, 'outgoing_documents')}`
      : ` ORDER BY outgoing_documents.created_at DESC`;

    const sql = `
    SELECT ${selectFields}
    FROM ${this.dbname}.dbo.outgoing_documents
    ${joinClause}
    ${whereClause}
    ${orderBy}
  `;

    try {
      const result = await pool.request().query(sql);
      return result.recordset || [];
    } catch (e) {
      this.logger.error('Error in getProcessWaitingItems:', e);
      throw new InternalServerErrorException('Lỗi truy vấn danh sách xử lý');
    }
  }

  private async getViewerWaitingItems(
    pool: any,
    userId: string,
    receiverUnit: string | null,
    processFn: string,
    filter: any,
    sort: any,
    isExport: string
  ): Promise<any[]> {
    const where: string[] = [];
    const criteria: Array<{ name: string; operator: string; value: string | string[] }> = [];

    const { trackedFields } = this.processFilterCriteria(filter || {}, criteria);
    const hasDeadlineReplyFilter = trackedFields.has('deadline_reply') || trackedFields.has('deadlineReply');

    const featureManagement = await this.featureManagementRepo.findOne({
      where: { code: processFn, status: 1, statusFeature: StatusFeature.ACTIVE }
    });

    const featureCriteria = featureManagement?.criteria ?? [];
    const { sql: filterFeature, joins: filterJoins } = buildDocumentCriteriaHelper(
      [...featureCriteria, ...criteria],
      'outgoing_documents',
      featureManagement
    );

    let joinClause = `
    INNER JOIN ${this.dbname}.dbo.outgoing_current_state ocs 
      ON ocs.document_id = outgoing_documents.document_id
  `;

    if (filterJoins) joinClause += ' ' + filterJoins;

    const wrap = (v: any) => `'${String(v).replace(/'/g, "''")}'`;

    // ==================== FILTERS ====================
    if (filter?.isStar === '1' || filter?.isStar === 'true') {
      where.push(`EXISTS (SELECT 1 FROM ${this.dbname}.dbo.document_star ds 
      WHERE ds.document_id = outgoing_documents.document_id 
        AND ds.user_id = '${userId}' AND ds.step = '${processFn}')`);
    }
    if (filter?.isStar === '0' || filter?.isStar === 'false') {
      where.push(`NOT EXISTS (SELECT 1 FROM ${this.dbname}.dbo.document_star ds 
      WHERE ds.document_id = outgoing_documents.document_id 
        AND ds.user_id = '${userId}' AND ds.step = '${processFn}')`);
    }
    if (hasDeadlineReplyFilter) {
      where.push(`outgoing_documents.deadline_reply IS NOT NULL`);
    }

    // Viewer waiting specific
    where.push(`(ocs.has_ban_hanh = 1 OR ocs.has_da_xu_ly = 1)`);
    where.push(`
    ISJSON(outgoing_documents.know_receivers) = 1
    AND EXISTS (SELECT 1 FROM OPENJSON(outgoing_documents.know_receivers) 
                WHERE value = ${wrap(userId)})
  `);

    if (filterFeature?.trim()) {
      where.push(`(${filterFeature})`);
    }
    where.push('outgoing_documents.status = 1');

    const whereClause = ' WHERE ' + where.join(' AND ');

    // ====================== SELECT FIELDS - TRÁNH DUPLICATE ======================
    const excludeKeys = ['files', 'statusCode', 'status_code'];
    const { dbKeys, aliases } = await this.configurationService.buildSelectFieldsNew(
      'outgoing_documents',
      excludeKeys,
      processFn
    );

    // Sử dụng Set để tránh trùng lặp cột
    const selectSet = new Set<string>();

    // Các trường chính cần thiết
    const mainFields = [
      `outgoing_documents.document_id AS id`,                    // đổi thành id cho dễ dùng
      `(SELECT TOP 1 a.action_code FROM ${this.dbname}.dbo.audit a 
      WHERE a.document_id = outgoing_documents.document_id 
      ORDER BY a.id DESC) AS status_code`,
      `CASE WHEN EXISTS (SELECT 1 FROM ${this.dbname}.dbo.document_star ds 
       WHERE ds.document_id = outgoing_documents.document_id 
         AND ds.user_id = '${userId}' AND ds.step = '${processFn}') 
     THEN 1 ELSE 0 END AS isStar`
    ];

    mainFields.forEach(f => selectSet.add(f));

    // Thêm các trường từ dbKeys, tránh trùng với các trường đã khai báo
    dbKeys.forEach((key: string) => {
      if (key && key.trim()) {
        const cleanKey = key.trim()
          .replace(/^\s*[\w.]+\s+AS\s+[\w_]+\s*$/i, '')
          .trim()
          .replace(/^outgoing_documents\./i, '');

        if (!['document_id', 'status_code', 'isStar'].some(ex =>
          cleanKey.toLowerCase().includes(ex)
        )) {
          selectSet.add(key);
        }
      }
    });

    const selectFields = Array.from(selectSet).join(', ');

    aliases['isStar'] = 'is_star';

    const orderBy = sort
      ? ` ORDER BY ${parseSort(sort, aliases, 'outgoing_documents')}`
      : ` ORDER BY outgoing_documents.created_at DESC`;

    const sql = `
    SELECT ${selectFields}
    FROM ${this.dbname}.dbo.outgoing_documents
    ${joinClause}
    ${whereClause}
    ${orderBy}
  `;

    try {
      const result = await pool.request().query(sql);
      return result.recordset || [];
    } catch (e) {
      this.logger.error('Error in getViewerWaitingItems:', e);
      throw new InternalServerErrorException('Lỗi truy vấn danh sách nhận để biết');
    }
  }

  async listCombinedProcessAndViewer(
    query: ListDocumentsNoTypeDto,
    userId: string,
    authorId?: string
  ) {
    const {
      page = 1,
      limit = 20,
      filter,
      sort,
      authority,
      isExport,
    } = query;

    // Xử lý processFn riêng để tránh lỗi TypeScript
    const processFnProcess = (query as any).processFnProcess || 'ChoXuLyTP';
    const processFnViewer = (query as any).processFnViewer || 'ChuaXuLyTP';

    const pool = await this.getMsPool();
    const pageNum = Math.max(Number(page) || 1, 1);
    let limitNum = Math.min(Number(limit) || 20, 100);
    if (isExport === 'true') limitNum = 9999;
    const offsetNum = (pageNum - 1) * limitNum;

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const [userRoleRes, userRes] = await Promise.all([
      this.userService.getUserRole(userId),
      pool.request().query(`
      SELECT id, parent AS parentId 
      FROM ${this.dbname}.dbo.users 
      WHERE id = '${userId}'
    `)
    ]);

    const { roles } = userRoleRes;
    const receiverUnit = userRes.recordset[0]?.parentId || null;
    const userContext = { userId, roles, receiverUnit };

    // ===================================================================
    // 1. LẤY RAW ITEMS TỪ 2 PHẦN
    // ===================================================================
    const [processItems, viewerItems] = await Promise.all([
      this.getProcessWaitingItems(
        pool,
        userId,
        receiverUnit,
        processFnProcess,
        filter,
        sort,
        isExport || 'false'
      ),
      this.getViewerWaitingItems(
        pool,
        userId,
        receiverUnit,
        processFnViewer,
        filter,
        sort,
        isExport || 'false'
      )
    ]);

    // ===================================================================
    // 2. GỘP
    // ===================================================================
    const combinedRaw = [...processItems, ...viewerItems];

    // Sắp xếp theo created_at DESC
    combinedRaw.sort((a, b) => {
      const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
      const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    const total = combinedRaw.length;
    const paginatedItems = combinedRaw.slice(offsetNum, offsetNum + limitNum);

    if (!paginatedItems.length) {
      return {
        success: true,
        items: [],
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalProcess: processItems.length,
        totalViewer: viewerItems.length,
      };
    }

    const bpmnVersions = [
      ...new Set(
        paginatedItems
          .map(d => d.bpmn_version)
          .filter((v): v is string => typeof v === 'string' && v.trim().length > 0 && v.toUpperCase() !== 'NULL')
          .map(v => v.trim())
      )
    ];

    const bpmnMap = await this.loadBpmnProcessesCached(bpmnVersions, receiverUnit);

    const standardAliases = {
      'document_id': 'id',
      'abstract_note': 'abstractNote',
      'release_no': 'releaseNo',
      'sender_unit': 'senderUnit',
      'document_date': 'documentDate',
      'urgency_level': 'urgencyLevel',
      'document_type': 'documentType',
      'created_at': 'createdAt',
      'updated_at': 'updatedAt',
      'bpmn_version': 'bpmnVersion',
      'status': 'status',
      'deadline_reply': 'deadlineReply',
      'private_level': 'privateLevel',
      'know_receivers': 'knowReceivers',
      'vieweds': 'vieweds',
      'report_signer': 'reportSigner',
      'drafter': 'drafter',
      'status_code': 'status_code',
      'stageStatus': 'stageStatus',
      'isStar': 'is_star'
    };

    const detailedItems = await this.mapDocumentDetailsOutgoing(
      paginatedItems,
      bpmnMap,
      userContext,
      standardAliases,
      true
    );

    const detailedItemsMapped = await this.mapDocOutgoingKeysForList(
      detailedItems,
      standardAliases,
      authority,
      'waiting',
      isExport || 'false'
    );

    // Thêm flag cho từng item
    for (const item of detailedItemsMapped as any[]) {
      if (item.status_code && !this.isHtml(item.status_code) && isExport !== 'true') {
        item.status_code = this.mapStatusCodeToHtml(item.status_code);
        item.status = item.status_code;
      } else if (item.status_code && this.isHtml(item.status_code)) {
        item.status = item.status_code;
      }

      item.type = item.type || 'viewer';
      item.typeLabel = item.typeLabel || (item.type === 'process' ? 'Xử lý' : 'Nhận để biết');
      item.canMarkViewed = item.type === 'viewer';
    }

    return {
      success: true,
      items: detailedItemsMapped,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      totalProcess: processItems.length,
      totalViewer: viewerItems.length,
    };
  }
  ///////////////
  public async mapDocumentDetailsOutgoing(
    items: DocumentRow[],
    bpmnMap: Map<string, { process: any; indexes: any; bpmnXML?: string; userParent: any }>,
    userContext: { userId: string; roles?: string[], unit?: string },
    aliases: Record<string, string> = {},
    showViewMark: boolean = false,
  ) {
    const fnStart = Date.now();
    const pool = await this.getMsPool();
    if (!items.length) return [];

    const VIEW_MARK_ACTION = {
      code: stageStatusDoc.DA_XEM,
      label: 'Đã xem',
      type: 'viewMark',
      canExecute: true,
    };

    const buildBasicItem = (doc: any) => ({
      ...mapDocKeysOutgoing(doc, aliases),
      document_id: doc.document_id,
      id: doc.id || doc.document_id,
      openWorkItems: [],
      perItems: [],
      workItem: null,
      flags: {},
      flagsProcess: {},
      type: doc.type,
      typeLabel: doc.typeLabel,
    });

    const documentIds = [
      ...new Set(
        items
          .map(d => d.document_id)
          .filter(Boolean)
          .map((v: any) => String(v).trim()),
      ),
    ];
    if (!documentIds.length) return items.map(d => buildBasicItem(d));
    const documentIdsCsv = documentIds.join(',');

    // ===== WORK ITEMS + AUDIT (parallel) =====
    const wiQueryStart = Date.now();
    const reqWI = pool.request().input('docIds', sql.NVarChar(sql.MAX), documentIdsCsv);
    const reqAudit = pool.request().input('docIds', sql.NVarChar(sql.MAX), documentIdsCsv);

    const [workItemsRes, auditRes] = await Promise.all([
      reqWI.query<WorkItemRow[]>(
        `SELECT 
           id,
           document_id,
           node_id,
           role,
           assignee_user_id,
           node_type,
           state,
           created_at,
           bpmn_version
           FROM work_items
         WHERE document_id IN (
           SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(@docIds, ',')
         ) AND state = 'open'`,
      ),
      reqAudit.query<AuditRow[]>(
        `SELECT 
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
            roleProcess AS roleProcess,
            action,
            deadline,
            stage_status AS stageStatus,
            details,
            type_document AS typeDocument,
            created_at AS createdAt,
            updated_at AS updatedAt
           FROM ${this.dbname}.dbo.audit
        WHERE document_id IN (
          SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(@docIds, ',')
        )
        ORDER BY time ASC`,
      ),
    ]);
    let workItems: any[] = workItemsRes.recordset;
    let audits: any[] = auditRes.recordset;
    if (ENABLE_SIGNER_PROCESS_API_LOGS) {
      this.logger.log(`[mapDocumentDetailsOutgoing]   - WorkItems + Audit queries: ${Date.now() - wiQueryStart}ms (${workItems.length} WIs, ${audits.length} audits)`);
    }
    // ===== MAP WORK ITEMS =====
    const workItemsMap: Record<string, any[]> = {};
    for (const wi of workItems) {
      const docId = String(wi.document_id ?? '').trim();
      if (!docId) continue;
      if (!workItemsMap[docId]) workItemsMap[docId] = [];
      workItemsMap[docId].push({
        id: String(wi.id),
        nodeId: wi.node_id,
        role: wi.role,
        assigneeUserId: wi.assignee_user_id ? String(wi.assignee_user_id) : undefined,
        nodeType: wi.node_type,
        state: wi.state,
        bpmnVersion: (wi as any).bpmn_version,
      });
    }

    // A work item may use a BPMN version different from the document row.
    // Preload every missing version in one batch to avoid per-document Redis/SQL lookups.
    const missingWorkItemBpmnVersions = [...new Set(
      workItems
        .map((wi: any) => typeof wi?.bpmn_version === 'string' ? wi.bpmn_version.trim() : '')
        .filter((version: string) => version && !bpmnMap.has(version)),
    )];
    if (missingWorkItemBpmnVersions.length) {
      const missingBpmnMap = await this.loadBpmnProcessesCached(
        missingWorkItemBpmnVersions,
        (userContext as any).receiverUnit || userContext.unit || null,
      );
      for (const [version, engine] of missingBpmnMap) {
        bpmnMap.set(version, engine);
      }
    }

    // ===== MAP AUDIT =====
    const auditMap: Record<string, any[]> = {};
    for (const a of audits) {
      const docId = String(a.documentId ?? '').trim(); // chỉ dùng documentId
      if (!docId) continue;
      let safeDetails: any = undefined;
      if (a.details) {
        if (typeof a.details === 'string') {
          try {
            safeDetails = JSON.parse(a.details);
          } catch (e) {
            safeDetails = { note: a.details };
          }
        } else {
          safeDetails = { note: a.details };
        }
      }
      if (!auditMap[docId]) auditMap[docId] = [];
      auditMap[docId].push({
        time: a.time instanceof Date ? a.time.toISOString() : a.time,
        receiver: a.receiver,
        receiverUnit: a.receiverUnit,
        userId: a.userId,
        createdBy: a.createdBy,
        role: a.role,
        roleProcess: a.roleProcess,
        stageStatus: stageStatusMapV2[String(a.stageStatus)] || 'Chưa xử lý',
        actionCode: a.actionCode,
        fromNodeId: a.fromNodeId,
        toNodeId: a.toNodeId,
        details: safeDetails,
        updatedAt: a.updatedAt,
        typeDocument: (a as any).typeDocument || 'OutgoingDocument',
      });
    }

    const usersByRoleCache = new Map<string, Promise<any[]>>();
    const getUsersByRoleCached = (role: string) => {
      const roleKey = String(role || '').trim();
      if (!usersByRoleCache.has(roleKey)) {
        usersByRoleCache.set(roleKey, Promise.resolve(this.userService.getUsersByRoleSQL(roleKey)));
      }
      return usersByRoleCache.get(roleKey)!;
    };

    const userRolesByBpmnVersionCache = new Map<string, Promise<any>>();
    const getUserRoleByBpmnVersion = (bpmnVersion?: string) => {
      const version = typeof bpmnVersion === 'string' ? bpmnVersion.trim() : '';
      if (!version) {
        return Promise.resolve({ roles: [''], userRoles: [] });
      }
      if (!userRolesByBpmnVersionCache.has(version)) {
        userRolesByBpmnVersionCache.set(
          version,
          this.getSqlUserRoleCached(userContext?.userId, version)
        );
      }
      return userRolesByBpmnVersionCache.get(version)!;
    };

    const uniqueBpmnVersions = [...new Set(
      items
        .map(doc => String(doc.bpmn_version ?? '').trim())
        .filter((v): v is string => v.length > 0 && v.toUpperCase() !== 'NULL')
    )];

    const preloadedUserRolesByVersion = new Map<string, any>();
    await Promise.all(
      uniqueBpmnVersions.map(async version => {
        const roles = await getUserRoleByBpmnVersion(version);
        preloadedUserRolesByVersion.set(version, roles);
      })
    );

    const currentUserId = userContext.userId;
    const currentUserRoles = userContext.roles || [];
    const receiverUnit = (userContext as any).receiverUnit || userContext.unit || null;

    const normalizeViewers = (rawViewers: string | string[] | null | undefined): string[] => {
      if (Array.isArray(rawViewers)) {
        return rawViewers.filter((id: any) => typeof id === 'string' && id.trim() !== '');
      }

      if (typeof rawViewers !== 'string') {
        return [];
      }

      const trimmed = rawViewers.trim();
      if (!trimmed) {
        return [];
      }

      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed)
            ? parsed.filter((id: any) => typeof id === 'string' && id.trim() !== '')
            : [];
        } catch {
          return [trimmed];
        }
      }

      return [trimmed];
    };

    const latestAuditIdByDocId = await this.getLatestAuditIdsByDocumentIds(
      items
        .map((doc: any) => String(doc.document_id ?? '').trim())
        .filter(Boolean),
    );

    const preparedDocs = await Promise.all(
      items.map(async rawDoc => {
        const docIdKey = String(rawDoc.document_id ?? '').trim();
        const docWorkItems = docIdKey ? (workItemsMap[docIdKey] || []) : [];
        const docAudit = docIdKey ? (auditMap[docIdKey] || []) : [];

        let docBpmnVersion = rawDoc.bpmn_version ? String(rawDoc.bpmn_version).trim() : null;
        const userRoleForDefault = docBpmnVersion
          ? (preloadedUserRolesByVersion.get(docBpmnVersion) || await getUserRoleByBpmnVersion(docBpmnVersion))
          : { roles: [''], userRoles: [] };
        const defaultRoles = userRoleForDefault?.roles || currentUserRoles;

        for (const wi of docWorkItems) {
          const canProcess = (
            wi.assigneeUserId === currentUserId ||
            wi.assigneeUserId === receiverUnit ||
            (wi.role && defaultRoles && defaultRoles.includes(wi.role))
          );
          if (canProcess && wi.bpmnVersion) {
            docBpmnVersion = wi.bpmnVersion;
            break;
          }
        }

        const version = docBpmnVersion;
        if (!version) {
          return {
            rawDoc,
            docIdKey,
            docWorkItems,
            docAudit,
            skipped: true,
          };
        }

        const engine = bpmnMap?.get ? bpmnMap.get(version) : null;

        if (!engine || !engine.process || !engine.indexes) {
          console.warn('BPMN not available for document:', rawDoc.document_id, version);
          return {
            rawDoc,
            docIdKey,
            docWorkItems,
            docAudit,
            skipped: true,
          };
        }

        const doc: any = {
          ...rawDoc,
          is_incomming: false,
          viewers: normalizeViewers(rawDoc.know_receivers as string | string[] | null | undefined),
        };

        const userRoleForDoc = preloadedUserRolesByVersion.get(version) || await getUserRoleByBpmnVersion(version);
        const docRoles = userRoleForDoc?.roles || defaultRoles;
        const statusCode = doc.status_code || (doc as any).statusCode || '';
        const workItemGroups = new Map<string, { workItem: any; baseKey: string }>();

        for (const wi of docWorkItems) {
          const baseKey = this.buildOutgoingActionCacheBaseKey({
            userId: currentUserId,
            version,
            nodeId: wi.nodeId,
            role: wi.role || '',
            assignee: wi.assigneeUserId || '',
            statusCode,
          });
          if (!workItemGroups.has(baseKey)) {
            workItemGroups.set(baseKey, { workItem: wi, baseKey });
          }
        }

        const latestAuditId = latestAuditIdByDocId.get(docIdKey) ?? null;

        return {
          rawDoc,
          doc,
          docIdKey,
          docWorkItems,
          docAudit,
          latestAuditId,
          version,
          statusCode,
          docRoles,
          engine,
          workItemGroups,
          skipped: false,
        };
      }),
    );

    const allGroupedEntries = preparedDocs
      .filter((prepared: any) => !prepared.skipped)
      .flatMap((prepared: any) => Array.from(prepared.workItemGroups.values()).map((entry: any) => ({
        ...entry,
        latestAuditId: prepared.latestAuditId ?? null,
      })));
    const allCacheEntries = allGroupedEntries.map((entry: any) => ({
      baseKey: entry.baseKey,
      latestAuditId: entry.latestAuditId ?? null,
    }));
    const rawCachedActionsByKey = await this.getCachedActionsBatch(allCacheEntries);
    const cachedActionsByKey = new Map<string, CachedOutgoingActionPayload>();

    for (const prepared of preparedDocs) {
      if (prepared.skipped || !prepared.docIdKey || !prepared.workItemGroups) continue;
      const latestAuditId = prepared.latestAuditId ?? null;
      for (const { baseKey } of prepared.workItemGroups.values()) {
        const cached = rawCachedActionsByKey.get(baseKey) as CachedOutgoingActionPayload | undefined;
        if (this.isCachedActionPayloadValid(cached, latestAuditId)) {
          cachedActionsByKey.set(baseKey, cached);
        }
      }
    }

    const pendingCacheWrites: Array<{ baseKey: string; latestAuditId: number | null; data: CachedOutgoingActionPayload }> = [];
    const computedActionsByKey = new Map<string, CachedOutgoingActionPayload>();
    const missingByVersion = new Map<string, any[]>();

    for (const prepared of preparedDocs) {
      if (prepared.skipped || !prepared.version) continue;
      const misses = Array.from(prepared.workItemGroups.values()).filter(({ baseKey }) => !cachedActionsByKey.has(baseKey));
      if (misses.length) {
        const groupKey = prepared.version;
        const bucket = missingByVersion.get(groupKey) || [];
        bucket.push({ prepared, misses });
        missingByVersion.set(groupKey, bucket);
      }
    }

    const configuredChunkSize = Number(process.env.OUTGOING_ACTION_COMPUTE_CONCURRENCY);
    const computeChunkSize = Number.isFinite(configuredChunkSize) && configuredChunkSize > 0
      ? Math.min(Math.floor(configuredChunkSize), 30)
      : 12;
    for (const groupedDocs of missingByVersion.values()) {
      const computeTasks = groupedDocs.flatMap(({ prepared, misses }) =>
        misses.map(({ workItem, baseKey }: any) => async () => {
          const res = await this.bpmnEngine.computeAvailableActions({
            process: prepared.engine.process,
            indexes: prepared.engine.indexes,
            currentNodeId: workItem.nodeId,
            workItem,
            document: prepared.doc,
            userId: currentUserId,
            userRoles: prepared.docRoles,
            getUsersByRole: getUsersByRoleCached,
            audit: prepared.docAudit,
            userParent: prepared.engine.userParent,
            documentId: prepared.doc.document_id,
            // Revision-aware cache was already read in one MGET above and all
            // misses are written through one Redis MULTI below.
            skipRedisRead: true,
            skipRedisWrite: true,
          });

          const mappedRes = {
            latestAuditId: prepared.latestAuditId ?? null,
            workItem,
            node: res.node && {
              id: res.node.id,
              name: res.node.name,
              type: res.node.$type,
            },
            availableActions: res.availableActions || [],
            flags: res.flags || {},
          };

          computedActionsByKey.set(baseKey, mappedRes);
          pendingCacheWrites.push({
            baseKey,
            latestAuditId: prepared.latestAuditId ?? null,
            data: mappedRes,
          });
        }),
      );

      for (let i = 0; i < computeTasks.length; i += computeChunkSize) {
        await Promise.all(computeTasks.slice(i, i + computeChunkSize).map((task: any) => task()));
      }
    }

    await this.setCachedActionsBatch(pendingCacheWrites);

    // ===== MAIN =====
    const results = preparedDocs.map((prepared: any) => {
      if (prepared.skipped || !prepared.version || !prepared.doc || !prepared.engine) {
        return buildBasicItem(prepared.rawDoc);
      }

      const { doc, docWorkItems, docAudit, version, engine } = prepared;
      const { indexes } = engine;
      const perItems: any[] = [];

      for (const wi of docWorkItems) {
        const baseKey = this.buildOutgoingActionCacheBaseKey({
          userId: currentUserId,
          version,
          nodeId: wi.nodeId,
          role: wi.role || '',
          assignee: wi.assigneeUserId || '',
          statusCode: prepared.statusCode,
        });
        const cached = cachedActionsByKey.get(baseKey) || computedActionsByKey.get(baseKey);
        if (cached) {
          perItems.push({
            workItem: wi,
            node: cached.node,
            availableActions: cached.availableActions,
            flags: cached.flags,
          });
        }
      }

      // ===== SUMMARY FLAGS =====
      const summaryFlags = perItems.reduce(
        (acc, x) => {
          const mergedFlags = { ...acc };
          if (x.flags) {
            for (const key in x.flags) {
              if (Object.prototype.hasOwnProperty.call(x.flags, key)) {
                mergedFlags[key] = mergedFlags[key] || x.flags[key] || false;
              }
            }
          }
          return mergedFlags;
        },
        {
          canSigningSubmission: false,
          canGiveFeedback: false,
          canApprove: false,
          canCompleteProposal: false,
          canIssueProposal: false,
          canReturn: false,
          canTransferRoom: false,
          canTransferFeedback: false,
          canSetNumber: false,
          canSuggestPromulgate: false,
          canRecall: false,
          canMarkViewed: false,
        },
      );

      const blockedRecallStageStatuses = new Set([
        stageStatusDoc.DONG_Y_VBDT,
        stageStatusDoc.DE_NGHI_BH,
        stageStatusDoc.CHO_SO,
        stageStatusDoc.DA_BAN_HANH,
        stageStatusDoc.DA_DONG_DAU,
        stageStatusDoc.CHO_DONG_DAU,
      ].filter((value): value is string => typeof value === 'string' && value.length > 0));
      const currentStageStatus = typeof doc?.stageStatus === 'string' ? doc.stageStatus : null;
      const actualCanRecall = this.bpmnEngine.canRecallDocument(docAudit, currentUserId, 'OutgoingDocument');
      const isBlockedRecallByStageStatus = currentStageStatus
        ? blockedRecallStageStatuses.has(currentStageStatus)
        : false;
      summaryFlags.canRecall = actualCanRecall && !isBlockedRecallByStageStatus;

      const summary =
        perItems.find(x => x.availableActions.some((a: any) => a.canExecute)) &&
        (perItems.find(x => x.workItem && String(x.workItem.assigneeUserId || x.workItem.assignee_user_id) === String(currentUserId)) || perItems[0])
        || {
          workItem: null,
          node: null,
          availableActions: [],
          flags: {},
        };

      let availableActions = summary.availableActions || [];

      // ===== THÊM ACTION ĐÃ XEM (chỉ ở màn Nhận để biết) =====
      const canMarkViewed = Array.isArray(doc.viewers) && doc.viewers.includes(currentUserId);
      if (showViewMark && canMarkViewed && !availableActions.some(a => a.code === 'DA_XEM')) {
        availableActions = [VIEW_MARK_ACTION, ...availableActions];
      }
      summaryFlags.canMarkViewed = canMarkViewed;

      // ===== flagsProcess =====
      const flagsProcess: any = { canSetProcessor: true };
      if (canMarkViewed) flagsProcess.canMarkViewed = true;
      let canSaveBook = false;

      if (doc.book_document_id == null && doc.is_incomming) {
        const versionKey = String(doc.bpmn_version ?? '').trim();
        const userRoless = preloadedUserRolesByVersion.get(versionKey) || { roles: [''], userRoles: [] };
        const hasVanThuRole =
          Array.isArray(userRoless?.roles) &&
          userRoless.roles.some((r) => VAN_THU_ALL.includes(r));

        if (userRoless && userRoless.roles && hasVanThuRole) {
          canSaveBook = true;
        }
      }
      const { canRecall, ...restSummaryFlags } = summaryFlags ?? {};

      // Kiểm tra xem quy trình hiện tại có bước nào cấu hình ẩn/hiện theo isStamp không
      const hasStampOption = indexes?.nodes ? Array.from(indexes.nodes.values()).some((node: any) => {
        const props = getAllNodeExtensionProperties(node);
        return props && props.isStamp !== undefined;
      }) : false;

      // ===== RETURN =====
      return {
        ...mapDocKeysOutgoing(doc, aliases),
        document_id: doc.document_id,
        id: doc.id || doc.document_id,
        openWorkItems: docWorkItems,
        perItems,
        workItem: summary.workItem,
        availableActions,
        flags: { ...restSummaryFlags, canSaveBook, canRecallOutgoing: canRecall, hasStampOption },
        flagsProcess,
        type: doc.type,
        typeLabel: doc.typeLabel,
      };
    });
    if (ENABLE_SIGNER_PROCESS_API_LOGS) {
      this.logger.log(`[mapDocumentDetailsOutgoing] Total: ${Date.now() - fnStart}ms for ${items.length} items`);
    }
    return results;
  }

  public async mapDocumentDetailsOutgoingv2(
    items: DocumentRow[],
    bpmnXML: string,
    userContext: { userId: string; roles?: string[] },
    aliases: Record<string, string> = {},
  ): Promise<
    {
      document_id?: string;
      id?: string;
      openWorkItems: any[];
      perItems: any[];
      workItem: any;
      availableActions: any[];
      flags: any;
      flagsProcess: any;
    }[]
  > {
    const pool = await this.getMsPool();
    if (!items.length) return [];

    const VIEW_MARK_ACTION = {
      code: stageStatusDoc.DA_XEM,
      label: 'Đã xem',
      type: 'viewMark',
      canExecute: true,
    };

    const documentIds = items.map(d => d.document_id);

    // ===== WORK ITEMS =====
    const reqWI = pool.request();
    documentIds.forEach((id, i) => reqWI.input(`doc${i}`, id));
    const inWI = documentIds.map((_, i) => `@doc${i}`).join(',');

    const workItems = (
      await reqWI.query<WorkItemRow[]>(
        `SELECT * FROM work_items WHERE document_id IN (${inWI}) AND state = 'open'`,
      )
    ).recordset;

    // ===== AUDIT =====
    const reqAudit = pool.request();
    documentIds.forEach((id, i) => reqAudit.input(`doc${i}`, id));
    const inAudit = documentIds.map((_, i) => `@doc${i}`).join(',');

    const audits = (
      await reqAudit.query<AuditRow[]>(
        `SELECT * FROM ${this.dbname}.dbo.audit WHERE document_id IN (${inAudit}) ORDER BY time ASC`,
      )
    ).recordset;

    const { process } = await this.bpmnEngine.loadBpmnFromString(bpmnXML);
    const indexes = this.bpmnEngine.buildIndexes(process);

    // ===== MAP WORK ITEMS =====
    const workItemsMap: Record<string, any[]> = {};
    for (const wi of workItems) {
      if (!workItemsMap[wi.document_id]) workItemsMap[wi.document_id] = [];
      workItemsMap[wi.document_id].push({
        id: String(wi.id),
        nodeId: wi.node_id,
        role: wi.role,
        assigneeUserId: wi.assignee_user_id ? String(wi.assignee_user_id) : undefined,
        nodeType: wi.node_type,
        state: wi.state,
      });
    }

    // ===== MAP AUDIT =====
    const auditMap: Record<string, any[]> = {};
    for (const a of audits) {
      const docId = a.documentId; // chỉ dùng documentId
      if (!auditMap[docId]) auditMap[docId] = [];
      auditMap[docId].push({
        time: a.time instanceof Date ? a.time.toISOString() : a.time,
        receiver: a.receiver,
        receiverUnit: a.receiverUnit,
        userId: a.userId,
        createdBy: a.createdBy,
        role: a.role,
        roleProcess: a.roleProcess,
        stageStatus: a.stageStatus,
        actionCode: a.actionCode,
        fromNodeId: a.fromNodeId,
        toNodeId: a.toNodeId,
        details: a.details ? JSON.parse(a.details) : undefined,
      });
    }

    const buildBasicItem = (doc: any) => ({
      ...mapDocKeysOutgoing(doc, aliases),
      document_id: doc.document_id,
      id: doc.id || doc.document_id,
      openWorkItems: [],
      perItems: [],
      workItem: null,
      availableActions: [],
      flags: {},
      flagsProcess: {},
    });

    const uniqueBpmnVersions = [...new Set(
      items
        .map(doc => String(doc.bpmn_version ?? '').trim())
        .filter((v): v is string => v.length > 0 && v.toUpperCase() !== 'NULL')
    )];

    const userRolesByVersion = new Map<string, any>();
    await Promise.all(
      uniqueBpmnVersions.map(async version => {
        const roles = await this.getSqlUserRoleCached(userContext?.userId, version);
        userRolesByVersion.set(version, roles);
      })
    );


    const latestAuditIdByDocId = await this.getLatestAuditIdsByDocumentIds(
      items
        .map((doc: any) => String(doc.document_id ?? '').trim())
        .filter(Boolean),
    );

    // ===== MAIN =====
    const results = await Promise.all(
      items.map(async rawDoc => {
        if (!process || !indexes) {
          console.warn('BPMN not available for document:', rawDoc.document_id);
          return buildBasicItem(rawDoc);
        }

        const version = rawDoc.bpmn_version ? String(rawDoc.bpmn_version).trim() : '';

        // ===== SAFE NORMALIZE VIEWERS =====
        let viewers: string[] = [];
        const rawViewers = rawDoc.know_receivers as string | string[] | null | undefined;

        if (Array.isArray(rawViewers)) {
          viewers = rawViewers.filter((id: any) => typeof id === 'string' && id.trim() !== '');
        } else if (typeof rawViewers === 'string') {
          const trimmed = rawViewers.trim();
          if (trimmed) {
            if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
              try {
                const parsed = JSON.parse(trimmed);
                viewers = Array.isArray(parsed)
                  ? parsed.filter((id: any) => typeof id === 'string' && id.trim() !== '')
                  : [];
              } catch {
                viewers = [trimmed];
              }
            } else {
              viewers = [trimmed];
            }
          }
        }

        const doc: any = {
          ...rawDoc,
          viewers,
        };

        const docWorkItems = workItemsMap[doc.document_id ?? ''] || [];
        const docAudit = auditMap[doc.document_id ?? ''] || [];
        const latestAuditId = doc.document_id
          ? latestAuditIdByDocId.get(String(doc.document_id).trim()) ?? null
          : null;

        // ===== BUILD perItems =====
        const perItems: any[] = [];
        const statusCode = rawDoc.status_code || (rawDoc as any).statusCode || '';
        for (const wi of docWorkItems) {
          const baseKey = this.buildOutgoingActionCacheBaseKey({
            userId: userContext.userId,
            version,
            nodeId: wi.nodeId,
            role: wi.role || '',
            assignee: wi.assigneeUserId || '',
            statusCode,
          });
          const cached = await this.getCachedActions(baseKey, latestAuditId) as CachedOutgoingActionPayload | null;
          if (this.isCachedActionPayloadValid(cached, latestAuditId)) {
            perItems.push({
              workItem: wi,
              node: cached.node,
              availableActions: cached.availableActions,
              flags: cached.flags,
            });
            continue;
          }

          const res = await this.bpmnEngine.computeAvailableActions({
            process,
            indexes,
            currentNodeId: wi.nodeId,
            workItem: wi,
            document: doc,
            userId: userContext.userId,
            userRoles: userContext.roles || [],
            userParent: doc.user_parent ?? undefined,
            getUsersByRole: role => this.userService.getUsersByRoleSQL(role),
            audit: docAudit,
          });

          const mappedRes = {
            latestAuditId,
            workItem: wi,
            node: res.node && {
              id: res.node.id,
              name: res.node.name,
              type: res.node.$type,
            },
            availableActions: res.availableActions || [],
            flags: res.flags || {},
          };
          await this.setCachedActions(baseKey, latestAuditId, mappedRes);

          perItems.push(mappedRes);
        }

        // ===== SUMMARY FLAGS =====
        const summaryFlags: Record<string, boolean> = {};
        for (const x of perItems) {
          if (x.flags) {
            for (const [fKey, fVal] of Object.entries(x.flags)) {
              if (fVal === true) summaryFlags[fKey] = true;
              else if (!summaryFlags.hasOwnProperty(fKey)) summaryFlags[fKey] = false;
            }
          }
        }

        // ===== SUMMARY ITEM =====
        const summary =
          perItems.find(x => x.availableActions.some((a: any) => a.canExecute)) ||
          perItems.find(x => x.workItem && String(x.workItem.assigneeUserId || x.workItem.assignee_user_id) === String(userContext?.userId)) ||
          {
            workItem: null,
            node: null,
            availableActions: [],
            flags: {},
          };

        let availableActions = summary.availableActions || [];

        // ===== THÊM ACTION ĐÃ XEM =====
        const canMarkViewed = viewers.includes(userContext.userId);
        if (canMarkViewed && !availableActions.some(a => a.code === stageStatusDoc.DA_XEM)) {
          availableActions = [VIEW_MARK_ACTION, ...availableActions];
        }
        summaryFlags.canMarkViewed = canMarkViewed;

        // ===== flagsProcess =====
        const flagsProcess: any = { canSetProcessor: true };
        if (canMarkViewed) flagsProcess.canMarkViewed = true;

        const versionKey = String(doc.bpmn_version ?? '').trim();
        const userRoless = userRolesByVersion.get(versionKey) || await this.getSqlUserRoleCached(userContext?.userId, doc.bpmn_version);
        const hasVanThuRole = Array.isArray(userRoless?.roles) && userRoless.roles.some(r => VAN_THU_ALL.includes(r))
        let canSaveBook = false;
        if (
          (userRoless && userRoless.roles && hasVanThuRole) &&
          (doc.book_document_id == null &&
            (doc.is_incomming)
          )) {
          canSaveBook = true;
        }

        // ===== RETURN =====
        return {
          ...mapDocKeysOutgoing(doc, aliases),
          // Đảm bảo document_id được giữ lại để match sau này
          document_id: doc.document_id,
          id: doc.id || doc.document_id,
          openWorkItems: docWorkItems,
          perItems,
          workItem: summary.workItem,
          availableActions,
          flags: { ...summaryFlags, canSaveBook },
          flagsProcess,
        };
      }),
    );
    return results.filter(Boolean);
  }

  async mapDocOutgoingKeysForList(docs: any[], aliases: Record<string, string> = {}, authority?: string, type?: string, isExport?: string, sort?: any): Promise<any[]> {
    if (!Array.isArray(docs)) return [];
    const pool = await this.getMsPool();
    const normalizeId = (v: any) => String(v).trim().toLowerCase();
    const isValidId = (id: string): boolean => {
      if (!id || id === '-' || id === 'null' || id.trim() === '') return false;
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const numericPattern = /^\d+$/;
      const mongoObjectIdPattern = /^[0-9a-f]{24}$/i;
      return uuidPattern.test(id) || numericPattern.test(id) || mongoObjectIdPattern.test(id);
    };
    const bpmnCacheKey = 'outgoing:bpmn_design:names_list';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bpmnPromise = this.cacheManager
      ? this.cacheManager.get<any[]>(bpmnCacheKey).catch(() => null)
      : Promise.resolve(null);
    const tabColor = ['waiting', 'draft'];
    // Lấy các documentID để map trạng thái
    const documentIds = [
      ...new Set(
        docs
          .map(d => d?.documentId ?? d?.document_id ?? d?.docId)
          .filter(Boolean)
          .map(String)
      ),
    ];
    let completedMap = new Map<string, number>();

    // ==== Helper parse IDs ====
    const parseIds = (v: any): string[] => {
      if (!v) return [];
      if (Array.isArray(v)) return v.map(normalizeId);
      if (typeof v === 'string') {
        try {
          const parsed = JSON.parse(v);
          return Array.isArray(parsed) ? parsed.map(normalizeId) : [normalizeId(v)];
        } catch {
          return v.split(',').map(normalizeId);
        }
      }
      return [normalizeId(v)];
    };
    const hasReplacementDocumentId = (raw: any): boolean => {
      if (!raw) return false;
      let replacements: any[] = [];
      if (Array.isArray(raw)) {
        replacements = raw;
      } else if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          replacements = Array.isArray(parsed) ? parsed : [];
        } catch {
          replacements = [];
        }
      } else if (typeof raw === 'object') {
        replacements = [raw];
      }

      return replacements.some((item) => {
        const docId = item?.documentId;
        return typeof docId === 'string' ? docId.trim().length > 0 : !!docId;
      });
    };
    const REPLACEMENT_PREFIX = `<span style="color:#1677ff;">[Thay thế]</span> `;
    const hasReplacementPrefix = (value: string): boolean =>
      /\[Thay\s*thế\]/i.test(value);
    const parseReplacementValue = (raw: any): any[] => {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      if (typeof raw === 'object') return [raw];
      return [];
    };


    // Unit IDs
    const unitFields = ['sender_unit', 'senderUnit', 'receiver_unit', 'receiverUnit', 'internal_receiving_unit', 'internalReceivingUnit', 'internal_receiving_dept', 'internalReceivingDept', 'external_receiving_unit', 'externalReceivingUnit', 'external_receiving_dept', 'externalReceivingDept', 'receiving_unit', 'receivingUnit', 'receiving_dept', 'receivingDept', 'recipient_ids', 'recipientIds',
    ];
    const unitIdSet = new Set<string>();

    // Agency IDs
    const agencyFields = ['internal_receiving_unit', 'internalReceivingUnit', 'internal_receiving_dept', 'internalReceivingDept', 'external_receiving_unit', 'externalReceivingUnit', 'external_receiving_dept', 'externalReceivingDept', 'recipient_ids', 'recipientIds', 'receiving_unit', 'receivingUnit', 'receiving_dept', 'receivingDept'];
    const agencyIdSet = new Set<string>();

    // User IDs
    const userFields = ['processors', 'drafter', 'reportSigner', 'report_signer', 'draftSigner', 'draft_signer', 'viewers', 'knowReceivers', 'know_receivers', 'sign_content_draft', 'sign_format_draft'];
    const userIdSet = new Set<string>();

    // ==== Thu thập tất cả IDs trước (không query) ====
    // Reply incoming IDs
    const replyIncomingList: string[] = [];
    for (const doc of docs) {
      if (!doc) continue;

      for (const key of ['reply_incomming_doc', 'replyIncommingDoc']) {
        parseIds(doc[key]).forEach((id) => replyIncomingList.push(id));
      }

      for (const field of unitFields)
        parseIds(doc[field]).forEach(id => unitIdSet.add(id));

      for (const field of agencyFields) parseIds(doc[field]).forEach(id => agencyIdSet.add(id));

      for (const field of userFields)
        parseIds(doc[field]).forEach(id => userIdSet.add(id));
    }
    const validReplyIds = [...new Set(replyIncomingList)].filter(isValidId);
    const validUnitIds = [...unitIdSet].filter(isValidId);
    const validAgencyIds = [...agencyIdSet].filter(isValidId);
    const validUserIds = [...userIdSet].filter(isValidId);

    // Book IDs
    const bookIds = [...new Set(docs.filter(Boolean).map(d => d.bookDocumentId))].filter(isValidId);

    // BPMN Design IDs
    const bpmnVersionIds = [...new Set(
      docs.filter(Boolean).map(d => d.bpmn_version || d.bpmnVersion)
        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    )];

    // ==== ✅ Tất cả queries chạy song song (Promise.all) ====
    // Sử dụng cache methods cho Users, Orgs, Agencies
    const [orgsMap, agenciesMap, usersMap] = await Promise.all([
      this.getOrgsByIdsCached(validUnitIds),
      this.getAgenciesByIdsCached(validAgencyIds),
      this.getUsersByIdsCached(validUserIds),
    ]);

    const [
      completedResult,
      replacementRowsResult,
      outgoingReplyRows,
      crmRows,
      bookRows,
      bpmnRows,
      filesMapResult,
    ] = await Promise.all([
      // ✅ Dùng outgoing_current_state thay vì query audit và GROUP BY
      (() => {
        const cleanDocIds = documentIds.filter(isValidId);
        if (!cleanDocIds.length) return Promise.resolve({ recordset: [] });
        const req = pool.request();
        const placeholders = cleanDocIds.map((id, i) => {
          req.input(`docId${i}`, sql.VarChar(100), id);
          return `@docId${i}`;
        }).join(',');
        return req.query(`
          SELECT ocs.document_id, ISNULL(ocs.is_completed_doc, 0) AS is_completed_document
          FROM ${this.dbname}.dbo.outgoing_current_state ocs WITH (NOLOCK)
          WHERE ocs.document_id IN (${placeholders})
        `);
      })().catch(err => {
        console.error('--- [Promise.all diagnostic] Error in completedResult (outgoing_current_state) query ---', err);
        throw err;
      }),

      // Fallback doc_replacement theo document_id (đảm bảo list luôn có dữ liệu như detail)
      (() => {
        const cleanDocIds = documentIds.filter(isValidId);
        if (!cleanDocIds.length) return Promise.resolve({ recordset: [] });
        const req = pool.request();
        const placeholders = cleanDocIds.map((id, i) => {
          req.input(`repId${i}`, sql.VarChar(100), id);
          return `@repId${i}`;
        }).join(',');
        return req.query(`
          SELECT od.document_id, od.doc_replacement
          FROM ${this.dbname}.dbo.outgoing_documents od WITH (NOLOCK)
          WHERE od.document_id IN (${placeholders})
        `);
      })().catch(err => {
        console.error('--- [Promise.all diagnostic] Error in replacementRowsResult (doc_replacement) query ---', err);
        throw err;
      }),

      // Reply outgoing map
      (() => {
        const cleanReplyIds = validReplyIds.filter(isValidId);
        if (!cleanReplyIds.length) return Promise.resolve({ recordset: [] });
        const req = pool.request();
        const placeholders = cleanReplyIds.map((id, i) => {
          req.input(`replyId${i}`, sql.VarChar(100), id);
          return `@replyId${i}`;
        }).join(',');
        return req.query(`
          SELECT document_id, abstract_note
          FROM ${this.dbname}.dbo.outgoing_documents WITH (NOLOCK)
          WHERE document_id IN (${placeholders})
        `);
      })().catch(err => {
        console.error('--- [Promise.all diagnostic] Error in outgoingReplyRows (abstract_note) query ---', err);
        throw err;
      }),

      // CRM sources (static data, dùng global memory cache để tránh query database nhiều lần)
      globalCrmCache
        ? Promise.resolve({ recordset: globalCrmCache })
        : pool.request().query(`
            SELECT s.id AS source_id, s.code, s.title AS source_title,
                   d.title AS data_title, d.value AS data_value
            FROM ${this.dbname}.dbo.crm_sources s
            LEFT JOIN ${this.dbname}.dbo.crm_source_data d ON s.id = d.source_id
            WHERE s.status = 1 AND s.code IN ('S20','S19','S26','S27','S21')
          `).then(res => {
          globalCrmCache = res.recordset || [];
          return res;
        }),

      // Book documents
      (() => {
        const numericBookIds = bookIds.filter(id => /^\d+$/.test(String(id)));
        if (!numericBookIds.length) return Promise.resolve({ recordset: [] });
        const req = pool.request();
        const placeholders = numericBookIds.map((id, i) => {
          req.input(`bookId${i}`, sql.Int, Number(id));
          return `@bookId${i}`;
        }).join(',');
        return req.query(`
          SELECT book_document_id, name, to_book_code, count
          FROM book_documents WITH (NOLOCK)
          WHERE book_document_id IN (${placeholders})
        `);
      })().catch(err => {
        console.error('--- [Promise.all diagnostic] Error in bookRows query ---', err);
        throw err;
      }),

      // BPMN Design names
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bpmnPromise.then((cached: any) => {
        if (cached) return { recordset: cached };
        return pool.request().query(`SELECT id, name FROM ${this.dbname}.dbo.bpmn_design WITH (NOLOCK)`).then(async res => {
          const data = res.recordset || [];
          if (this.cacheManager) {
            try {
              await this.cacheManager.set(bpmnCacheKey, data, 300000); // 5 mins in ms
            } catch (err) {
              console.warn('Failed to set BPMN list to Redis cache:', err.message);
            }
          }
          return res;
        });
      }).catch(err => {
        console.error('--- [Promise.all diagnostic] Error in bpmnRows (bpmn_design) query ---', err);
        throw err;
      }),

      // ✅ Đưa query tệp tin vào chạy song song cùng lúc
      (documentIds.length
        ? this.fileService.getFilesByOutgoingDocumentIds(documentIds, ['docDraft'])
        : Promise.resolve({} as Record<string, any[]>)
      ).catch(err => {
        console.error('--- [Lỗi 2] Error in filesMapResult query ---', err);
        throw err;
      }),
    ]);

    // ==== Build Maps từ kết quả parallel ====
    completedMap = new Map(
      (completedResult as any).recordset.map((r: any) => [
        String(r.document_id),
        Number(r.is_completed_document),
      ])
    );
    const replacementMap = new Map<string, any>(
      (replacementRowsResult as any).recordset.map((r: any) => [
        normalizeId(r.document_id),
        r.doc_replacement,
      ])
    );

    const outgoingMap = new Map<string, any>();
    for (const r of (outgoingReplyRows as any).recordset) {
      outgoingMap.set(normalizeId(r.document_id), { documentId: r.document_id, abstractNote: r.abstract_note });
    }

    // ==== Use cached Maps for Org, Agency, User ====
    const orgMap = new Map<string, any>();
    for (const [id, name] of orgsMap.entries()) {
      orgMap.set(id, { id, name });
    }

    const agencyMap = new Map<string, string>(agenciesMap);

    // ==== Unified unit map (ORG + AGENCY) ====
    const unitMap = new Map<string, string>();

    // org
    for (const [id, u] of orgMap.entries()) {
      unitMap.set(id, u.name);
    }

    // agency
    for (const [id, name] of agencyMap.entries()) {
      if (!unitMap.has(id)) {
        unitMap.set(id, name);
      }
    }

    const unitObjMap = new Map<string, { id: string; name: string }>();

    // org
    for (const [id, u] of orgMap.entries()) {
      unitObjMap.set(id, {
        id: String(u.id ?? id),
        name: u.name || '(Không có tên)'
      });
    }

    // agency
    for (const [id, name] of agencyMap.entries()) {
      if (!unitObjMap.has(id)) {
        unitObjMap.set(id, {
          id: String(id),
          name: name || '(Không có tên)'
        });
      }
    }

    // ==== Users (from cache) ====
    const userMap = usersMap;

    // ==== CRM sources (from Promise.all) ====
    const sourcesMap = new Map<string, any>();
    for (const r of (crmRows as any).recordset) {
      if (!sourcesMap.has(r.code)) sourcesMap.set(r.code, { code: r.code, title: r.source_title, data: [] });
      if (r.data_value) sourcesMap.get(r.code).data.push({ title: r.data_title, value: r.data_value });
    }
    const sources = [...sourcesMap.values()];
    const crmMap: Record<string, string> = { urgency_level: 'S20', urgencyLevel: 'S20', document_type: 'S19', documentType: 'S19', document_field: 'S26', documentField: 'S26', receiveMethod: 'S27', receive_method: 'S27', private_level: 'S21', privateLevel: 'S21' };

    // ==== Book documents (from Promise.all) ====
    const bookMap = new Map<number, any>(
      (bookRows as any).recordset.map((r: any) => [
        Number(r.book_document_id),
        { book_document_id: Number(r.book_document_id), name: r.name, to_book_code: r.to_book_code, count: Number(r.count) }
      ])
    );

    // ==== BPMN Design names (from Promise.all) ====
    const bpmnDesignMap = new Map<string, string>(
      (bpmnRows as any).recordset.map((r: any) => [String(r.id), r.name])
    );

    // ==== Mapping chính ====
    const orgFields = ['sender_unit', 'receiver_unit', 'internal_receiving_unit', 'internal_receiving_dept', 'recipient_ids'];
    const usrFields = ['drafter', 'draft_signer', 'processors', 'processor', 'viewers', 'know_receivers', 'knowReceivers', 'report_signer', 'reportSigner', 'draftSigner'];
    const resultArray: any[] = [];
    const docIdsForFiles: string[] = [];

    // ✅ TẠO MAP stageStatusText CHO TỪNG DOCUMENT
    const stageStatusMap = new Map<string, string>();
    for (const doc of docs) {
      if (!doc) continue;
      const rawDocId = doc?.documentId ?? doc?.document_id ?? doc?.docId;
      const docId = rawDocId ? String(rawDocId) : null;

      if (docId) {
        for (const [key, value] of Object.entries(doc)) {
          const snake = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
          const camel = snake.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
          const jsKey = aliases[key] || aliases[snake] || aliases[camel] || key;

          if (['stage_status', 'stageStatus', 'auditStageStatus', 'audit_stage_status'].includes(jsKey)) {
            if (value) {
              stageStatusMap.set(docId, value as string);
            }
            break;
          }
        }
      }
    }

    for (const doc of docs) {
      if (!doc) continue;
      const out: any = {};
      const rawDocId = doc?.documentId ?? doc?.document_id ?? doc?.docId;
      if (rawDocId) docIdsForFiles.push(String(rawDocId));

      const parsedIdsCache = new Map<string, string[]>();
      const getParsedIds = (raw: any): string[] => {
        const cacheKey = typeof raw === 'string' ? raw : JSON.stringify(raw);
        const cached = parsedIdsCache.get(cacheKey);
        if (cached) return cached;
        const parsed = parseIds(raw);
        parsedIdsCache.set(cacheKey, parsed);
        return parsed;
      };

      const isComplete = rawDocId ? completedMap.get(String(rawDocId)) === 1 : false;
      out.isComplete = isComplete;
      doc.isComplete = isComplete;
      doc.bpmnVersionKey = doc?.bpmn_version || doc?.bpmnVersion;
      doc.isDataFromList = true;
      let deadline: string | null = null;
      if (doc.deadline_reply) deadline = doc.deadline_reply;
      // Chỉ tính color nếu có deadline hợp lệ và đang ở tab cần color
      if (type && tabColor.includes(type) && deadline !== null) {
        out.color = calcDeadlineColor(deadline); // ← giờ chắc chắn là string
      } else {
        out.colorDocumentNumber = '#2364B0';
      }

      // ✅ LẤY stageStatusText TỪ MAP THEO documentId
      const docId = rawDocId ? String(rawDocId) : null;
      const stageStatusText = docId ? stageStatusMap.get(docId) : undefined;

      const entries = Object.entries(doc);
      const heavyFieldSet = new Set([
        ...orgFields,
        ...agencyFields,
        ...usrFields,
        'sign_content_draft',
        'sign_format_draft',
        'report_signer',
        'replyIncommingDoc',
        'reply_incomming_doc',
        'bookDocumentId',
        'book_document_id',
        'deadline_reply',
        'deadlineReply',
        'bpmn_version',
        'is_star',
        'release_no',
        'releaseNo',
        'internalDepObj',
        'internal_receiving_unit',
        'internalReceivingDept',
        'internalReceivingUnit',
      ]);

      // PASS 1: map các field nhẹ, giữ field nặng sang xử lý riêng bên dưới
      for (const [key, value] of entries) {
        const snake = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
        const camel = snake.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        const jsKey = aliases[key] || aliases[snake] || aliases[camel] || key;

        if (!heavyFieldSet.has(snake) && !heavyFieldSet.has(jsKey) && !dateKeys.has(key)) {
          out[jsKey] = value ?? '-';
        }

        // Bảo tồn các trường đặc biệt
        if ([
          'availableActions', 'flags', 'flagsProcess', 'perItems', 'workItem', 'openWorkItems',
          'type', 'typeLabel', 'isComplete'
        ].includes(key)) {
          out[key] = value;
          continue;
        }

        if (dateKeys.has(key) && (['string', 'number'].includes(typeof value) || value instanceof Date)) {
          out[jsKey] = normalizeDateValueDDMMYYYY(value as any) || '-';
        }

        // CRM mapping
        if (crmMap[jsKey]) {
          const src = sources.find(s => s.code === crmMap[jsKey]);
          const itm = src?.data?.find((d: any) => d.value == value);
          out[jsKey] = itm?.title ?? '-';
        }

        // Status mapping
        if (['status', 'stage_status', 'statusCode', 'status_code', 'kanbanStatus'].includes(jsKey)) {
          // 🔍 DEBUG: log status mapping inputs
          // console.log(`[DEBUG-STATUS] docId=${docId} jsKey=${jsKey} value="${value}" stageStatusText="${stageStatusText}" isComplete=${out.isComplete}`);
          if (isExport === 'true') {
            if (out.isComplete) {
              const statusToMap = (value === 'HOAN_THANH' || stageStatusText === 'HOAN_THANH') ? 'HOAN_THANH' : 'BAN_HANH';
              out[jsKey] = mapActionToLabelCommon(statusToMap);
            } else {
              if (value === 'TRINH_KY' || value === 'KY_NHAY_NOI_DUNG' || value === 'KY_NHAY_THE_THUC' || value === 'KY_SO' || value === 'DONG_DAU' || value === 'isStamp == true' || value === 'LUAN_CHUYEN_VAN_BAN_DI') {
                const statusValue = (stageStatusText && stageStatusText !== stageStatusDoc.CHUA_XU_LY) ? stageStatusText : value;
                out[jsKey] = statusValue ? mapActionToLabelCommon(String(statusValue)) ?? statusValue : '-';
              }
              else {
                out[jsKey] = value ? mapActionToLabelCommon(String(value)) ?? value : '-';
              }
            }
          } else {
            if (out.isComplete) {
              const statusToMap = (value === 'HOAN_THANH' || stageStatusText === 'HOAN_THANH') ? 'HOAN_THANH' : 'BAN_HANH';
              out[jsKey] = mapActionToLabel(statusToMap);
            } else {
              if (value === 'TRINH_KY' || value === 'KY_NHAY_NOI_DUNG' || value === 'KY_NHAY_THE_THUC' || value === 'KY_SO' || value === 'DONG_DAU' || value === 'isStamp == true' || value === 'LUAN_CHUYEN_VAN_BAN_DI') {
                const statusValue = (stageStatusText && stageStatusText !== stageStatusDoc.CHUA_XU_LY) ? stageStatusText : value;
                out[jsKey] = statusValue ? mapActionToLabel(String(statusValue)) ?? statusValue : '-';
              }
              else {
                out[jsKey] = value ? mapActionToLabel(String(value)) ?? value : '-';
              }
            }
          }
          out.statusCodeText = extractTextFromHtml(String(out[jsKey]));
        }


        // ORG map
        if (orgFields.includes(snake)) {
          const ids = getParsedIds(value);
          const names = ids.map(id => unitMap.get(id)).filter(Boolean);
          out[jsKey] = names.length ? names : '-';
        }

        // Agency map
        if (agencyFields.includes(snake)) {
          const ids = getParsedIds(value);
          const names = ids.map(id => unitMap.get(id)).filter(Boolean);
          out[jsKey] = names.length ? names : '-';
        }

        // User map
        if (usrFields.includes(snake)) {
          const ids = getParsedIds(value);
          const names = ids.map(id => {
            const name = userMap.get(id);
            return name ?? id; // <<< GIỮ LẠI ID NẾU KHÔNG TÌM THẤY USERs
          });
          out[jsKey] = names.length ? names.join(', ') : '-';
        }
        // ===== SIGNERS (TRẢ OBJECT) =====
        if (snake === 'sign_content_draft' || snake === 'sign_format_draft' || snake === 'report_signer') {
          const ids = getParsedIds(value);

          const camelBase = snake.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
          const camel = `${camelBase}Object`;   // thêm hậu tố Object
          out[camel] = ids.map(id => ({
            id,
            _id: id,
            name: userMap.get(id) ?? id
          }));

          if (!ids.length) out[camel] = [];
        }

        // deadline_reply safe — MSSQL trả Date ở local timezone, dùng getDate() thay getUTCDate()
        if (jsKey === 'deadline_reply' || jsKey === 'deadlineReply') {
          let normalizedDeadline: string | null = null;

          if (value instanceof Date && !isNaN(value.getTime())) {
            // MSSQL Date object → dùng local timezone methods
            const dd = String(value.getDate()).padStart(2, '0');
            const mm = String(value.getMonth() + 1).padStart(2, '0');
            const yyyy = value.getFullYear();
            normalizedDeadline = `${dd}/${mm}/${yyyy}`;
          } else if (value != null && (typeof value === 'string' || typeof value === 'number')) {
            normalizedDeadline = normalizeDateValueDDMMYYYY(value as any);
          }
          out[jsKey] = normalizedDeadline ?? '-';
        }

        // Book mapping
        if (jsKey === 'bookDocumentId' || jsKey === 'book_document_id') out[jsKey] = bookMap.get(Number(value))?.name ?? '-';

        // BPMN version (loại quy trình) → tên quy trình
        if (snake === 'bpmn_version' && typeof value === 'string') {
          const bpmnName = bpmnDesignMap.get(value) ?? value;
          out[jsKey] = bpmnName;
          out['type_of_process'] = bpmnName;
          out['typeOfProcess'] = bpmnName;
        }

        // Star
        if (jsKey === 'is_star') {
          out['isStar'] = !!value;
          delete out[jsKey];
        }

        // Reply incoming abstract
        if (['replyIncommingDoc', 'reply_incomming_doc'].includes(jsKey)) {
          const ids = getParsedIds(value);
          const abs = ids.map(id => outgoingMap.get(id)?.abstractNote).filter(Boolean);
          out[jsKey] = abs.length ? (abs.length === 1 ? abs[0] : abs) : '-';
        }
        if (['release_no', 'releaseNo'].includes(jsKey)) {
          out[jsKey] = value ? value : doc?.toBookTextSymbols ?? '-';
        }

        // Thông tin đơn vị nhận trong văn bản thay thế 
        if (jsKey === 'internalDepObj') {
          const sourceValue = value || doc.internal_receiving_dept;
          const ids = getParsedIds(sourceValue);

          out[jsKey] = ids.map(id => {
            const unit = unitObjMap.get(id);
            return unit
              ? { id: unit.id, name: unit.name }
              : { id, name: '(Không tìm thấy)' };
          });
        }

        // Map đơn vị nhận nội bộ
        if (['internal_receiving_unit', 'internalReceivingDept', 'internalReceivingUnit', 'internal_receiving_unit'].includes(jsKey)) {
          const ids = getParsedIds(doc.internalReceivingDept || doc.internal_receiving_unit);
          const names = ids.map(id => unitMap.get(id)).filter(Boolean);
          out[jsKey] = names.length ? names : '-';
        }


      }
      out.isIncomming = false;
      if (authority === 'true') {
        out.isAuthority = true;
      }
      delete out.sign_user_id;
      delete out.sign_user_type;
      delete out.sign_order;
      delete out.is_signed;
      delete out.sign_content_draft;
      delete out.sign_format_draft;

      // Luôn expose docReplacement cho FE ở list items
      const replacementRaw = doc?.docReplacement ?? doc?.doc_replacement ?? replacementMap.get(normalizeId(rawDocId));
      const replacementList = parseReplacementValue(replacementRaw);
      out.docReplacement = replacementList;
      out.doc_replacement = replacementList;

      const isReplacementDoc = hasReplacementDocumentId(replacementRaw);
      if (isReplacementDoc) {
        const titleKey = Object.prototype.hasOwnProperty.call(out, 'abstractNote')
          ? 'abstractNote'
          : (Object.prototype.hasOwnProperty.call(out, 'abstract_note') ? 'abstract_note' : null);

        if (titleKey && typeof out[titleKey] === 'string' && out[titleKey] !== '-') {
          const rawTitle = String(out[titleKey]);
          const titleWithoutPrefix = rawTitle.replace(/^\s*<span[^>]*>\s*\[Thay\s*tháº¿\]\s*<\/span>\s*/i, '').trim();
          const coloredTitle =
            out.color && titleWithoutPrefix
              ? `<span style="color:${out.color};">${titleWithoutPrefix}</span>`
              : titleWithoutPrefix;

          out[titleKey] = `${REPLACEMENT_PREFIX}${coloredTitle || titleWithoutPrefix}`;
        }
      }


      resultArray.push(out);
    }

    // ==== Map files ====
    const filesMap = filesMapResult || {};
    for (const item of resultArray) {
      const id = String(item.documentId);
      const fileList = filesMap[id];
      if (Array.isArray(fileList) && fileList.length > 0) {
        const fileNames = fileList.map((f: any) => f.file_name || f.fileName || '').filter(Boolean).join(', ');
        item.docDraft = fileNames || '-';
        item.files = fileList; // giữ mảng object cho detail view
      } else {
        item.docDraft = '-';
        item.files = '-';
      }
    }

    return resultArray;
  }

  async getOutgoingDocumentByFields({
    documentId,
    select
  }: {
    documentId: string;
    select?: string[];
  }): Promise<any | null> {
    // Định nghĩa mapping giữa camelCase và snake_case
    const fieldMapping: Record<string, string> = {
      id: 'id',
      documentId: 'document_id',
      statusCode: 'status_code',
      bookDocumentId: 'book_document_id',
      abstractNote: 'abstract_note',
      toBook: 'to_book',
      senderUnit: 'sender_unit',
      drafter: 'drafter',
      documentType: 'document_type',
      urgencyLevel: 'urgency_level',
      privateLevel: 'private_level',
      documentField: 'document_field',
      reportSigner: 'report_signer',
      reportDocumentSymbol: 'report_document_symbol',
      toBookTextSymbols: 'to_book_text_symbols',
      viewers: 'viewers',
      deadlineReply: 'deadline_reply',
      recipientIds: 'recipient_ids',
      internalReceivingUnit: 'internal_receiving_unit',
      replyIncommingDoc: 'reply_incomming_doc',
      draftSigner: 'draft_signer',
      status: 'status',
      codeCommanders: 'code_commanders',
      commanders: 'commanders',
      currentNote: 'current_note',
      releaseNo: 'release_no',
      releaseDate: 'release_date',
      textSymbols: 'text_symbols',
      docWorkFiles: 'doc_work_files',
      docProposal: 'doc_proposal',
      docDraft: 'doc_draft',
      docAttachments: 'doc_attachments',
      docRecall: 'doc_recall',
      docReplacement: 'doc_replacement',
      docAnswer: 'doc_answer',
      externalReceivingUnit: 'external_receiving_unit',
      internalReceivingDept: 'internal_receiving_dept',
      processor: 'processor',
      bpmnVersion: 'bpmn_version',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      knowReceivers: 'know_receivers',
      documentDate: 'document_date',
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
      FROM ${this.dbname}.dbo.outgoing_documents
      WHERE document_id = @documentId
    `;

    const pool = await this.getOutgoingDocumentPool(); // Giả sử có method này
    const request = pool.request();
    request.input('documentId', documentId);

    const result = await request.query(sql);
    const rows = result.recordset;

    if (!rows.length) return null;

    const document = rows[0];

    // Parse processor từ JSON string nếu có trong select
    if (document.processor && typeof document.processor === 'string') {
      try {
        document.processor = JSON.parse(document.processor);
      } catch {
        // Giữ nguyên nếu không parse được
      }
    }

    // Thêm metadata
    const mappedDocument: any = { ...document };
    mappedDocument.isIncomming = false;

    // Nếu cần openWorkItems, có thể thêm tùy chọn
    // mappedDocument.openWorkItems = await this.listOpenWorkItems(documentId);

    return mappedDocument;
  }

  // Helper method để lấy pool (nếu chưa có)
  private async getOutgoingDocumentPool(): Promise<sql.ConnectionPool> {
    // Giả sử bạn đang dùng cùng pool với incomingService
    // Hoặc tạo pool riêng tùy theo kiến trúc của bạn
    return this.sqlRepo.getPool(); // Hoặc method tương tự
  }

  private getOutgoingDocNumber(doc: any): string {
    const num =
      doc?.toBook ||
      doc?.toBookTextSymbols ||
      doc?.to_book ||
      doc?.to_book_text_symbols ||
      doc?.releaseNo ||
      doc?.release_no ||
      '';
    return num ? `số ${num} ` : '';
  }

  private normalizeDocNumber(docNumber: string): string {
    return String(docNumber || '')
      .replace(/^số\s+/i, '')
      .trim();
  }

  private buildIncomingDocLink(incomingDocId: string): string {
    const relativePath = `/incomming-documents/${incomingDocId}`;
    const frontendBaseUrl =
      this.configService.get<string>('REDIRECT_URI_FE') ||
      this.configService.get<string>('KEYCLOAK_DOMAIN_FE') ||
      '';
    if (!frontendBaseUrl) {
      return relativePath;
    }
    return `${frontendBaseUrl.replace(/\/+$/, '')}${relativePath}`;
  }

  private async sendAdditionalReleaseEmail(
    email: string,
    docNumber: string,
    docLink: string,
    userName: string,
    unitName: string,
  ): Promise<void> {
    try {
      const normalizedDocNumber = this.normalizeDocNumber(docNumber);
      const subject = normalizedDocNumber
        ? `Thông báo ban hành văn bản số ${normalizedDocNumber}`
        : 'Thông báo ban hành văn bản';
      const recipient = (userName || '').trim() || 'Đơn vị liên quan';
      const sender = (unitName || '').trim() || 'Hệ thống điều hành văn bản';
      const publishMessage = normalizedDocNumber
        ? `Xin trân trọng thông báo: Văn bản số ${normalizedDocNumber} đã được ban hành tới đồng chí.`
        : 'Xin trân trọng thông báo: Văn bản đã được ban hành tới đồng chí.';
      const resolvedDocLink = (docLink || '').trim() || '#';
      const html = `
        <p>Kính gửi Đồng chí ${recipient},</p>
        <p>${publishMessage}</p>
        <p>Đồng chí vui lòng truy cập đường link dưới đây để xem nội dung chi tiết của văn bản:</p>
        <p><a href="${resolvedDocLink}">${resolvedDocLink}</a></p>
        <p>Kính đề nghị Đồng chí kiểm tra và thực hiện theo nội dung văn bản.</p>
        <p>Trân trọng cảm ơn.</p>
        <p>${sender}</p>
      `;

      await this.mailService.sendMail({
        to: email,
        subject,
        html,
      });
    } catch (err) {
      this.logger.error(
        `[additional-release][notify] Send email failed for ${email}`,
        err,
      );
    }
  }

  private dispatchAdditionalReleaseNotificationsForReceivingUnits(
    incomingCopiesForUnits: Array<{
      incomingDocId: string;
      flowId: string;
      receiverUnit: string;
    }>,
    senderId: string,
    content: string,
    docNumber: string,
    title?: string,
    sourceDocId?: string,
  ): void {
    if (
      !Array.isArray(incomingCopiesForUnits) ||
      incomingCopiesForUnits.length === 0
    ) {
      this.logger.warn(
        `[additional-release][notify] Skip dispatch: no incoming copies, sourceDocId=${sourceDocId || 'n/a'}`,
      );
      return;
    }

    setImmediate(async () => {
      try {
        const validCopies = incomingCopiesForUnits.filter(
          (item) =>
            item &&
            typeof item.incomingDocId === 'string' &&
            item.incomingDocId.trim() &&
            typeof item.flowId === 'string' &&
            item.flowId.trim() &&
            typeof item.receiverUnit === 'string' &&
            item.receiverUnit.trim(),
        );

        if (!validCopies.length) {
          this.logger.warn(
            `[additional-release][notify] No valid copies to dispatch, sourceDocId=${sourceDocId || 'n/a'}`,
          );
          return;
        }

        const emailRecipientIds = new Set<string>();
        const emailDocLinkByUserId = new Map<string, string>();
        const fallbackDocLink = this.buildIncomingDocLink(validCopies[0].incomingDocId);
        const senderInfo = await this.sqlsvRepo.getUserById(senderId).catch(() => null);
        const senderUnitName =
          senderInfo?.parent?.name ||
          senderInfo?.organizationName ||
          senderInfo?.name ||
          'Hệ thống điều hành văn bản';

        for (const copy of validCopies) {
          let recipients: string[] = [];
          try {
            recipients = await this.runtimeService.getStartEventUsersInUnit(
              copy.flowId,
              copy.receiverUnit,
            );
          } catch (resolveErr) {
            this.logger.warn(
              `[additional-release][notify] Resolve recipients failed incoming=${copy.incomingDocId}, flow=${copy.flowId}, unit=${copy.receiverUnit}: ${resolveErr?.message || resolveErr}`,
            );
            continue;
          }

          const recipientIds = [
            ...new Set((recipients || []).map(String).filter(Boolean)),
          ];
          if (!recipientIds.length) {
            continue;
          }

          this.notificationService.createForRecipients({
            recipientIds,
            senderId,
            content,
            title: title ? `Bạn có văn bản nhận để biết: “${title}”` : 'Bạn có văn bản nhận để biết',
            recordId: copy.incomingDocId,
            link: `/incomming-documents/${copy.incomingDocId}`,
            key: 'VIEW_INCOMING_DOC',
            type: NotificationType.INCOMING_DOC_PROCESS_ASSIGNEE.value,
            time: new Date(),
            status: 1,
          });

          const docLink = this.buildIncomingDocLink(copy.incomingDocId);
          recipientIds.forEach((id) => {
            const recipientId = String(id);
            emailRecipientIds.add(recipientId);
            if (!emailDocLinkByUserId.has(recipientId)) {
              emailDocLinkByUserId.set(recipientId, docLink);
            }
          });
        }

        if (emailRecipientIds.size === 0) {
          return;
        }

        const users = await this.sqlsvRepo.getUsersByIds([...emailRecipientIds]);
        const usersWithEmail = users.filter((u: any) => !!u?.emailUser);
        await Promise.all(
          usersWithEmail.map((u: any) =>
            this.sendAdditionalReleaseEmail(
              String(u.emailUser),
              docNumber,
              emailDocLinkByUserId.get(String(u.id)) || fallbackDocLink,
              String(u?.name || u?.username || u?.parent?.name || ''),
              senderUnitName,
            ),
          ),
        );
      } catch (err) {
        this.logger.error(
          `[additional-release][notify] Dispatch notifications/emails failed sourceDocId=${sourceDocId || 'n/a'}`,
          err,
        );
      }
    });
  }

  async sendRecallEmail(
    email: string,
    content: string,
    notifiedAt: Date = new Date(),
  ): Promise<void> {
    try {
      const subject = 'Bạn có văn bản bị thu hồi';
      const notificationTime = this.formatRecallNotificationTime(notifiedAt);
      const html = `
        <p>Kính gửi,</p>
        <p>${content}</p>
        <p>Thời gian thông báo: ${notificationTime}</p>
        <p>Trân trọng,<br/>Hệ thống điều hành văn bản</p>
      `;


      await this.mailService.sendMail({
        to: email,
        subject,
        html,
      });

    } catch (err) {
      this.logger.error(
        `[recall][notify] ❌ Send email failed for ${email}`,
        err,
      );
    }
  }

  private formatRecallNotificationTime(notifiedAt?: Date): string {
    if (!notifiedAt) {
      return 'vừa xong';
    }

    const diffMs = Date.now() - new Date(notifiedAt).getTime();
    if (diffMs < 60 * 1000) {
      return 'vừa xong';
    }

    const diffMinutes = Math.floor(diffMs / (60 * 1000));
    if (diffMinutes < 60) {
      return `${diffMinutes} phút trước`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} giờ trước`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày trước`;
  }

  dispatchRecallNotificationsForReceivingUnits(
    incomingDocIds: string[],
    senderId: string,
    content: string,
    title?: string,
    outgoingDocId?: string,
  ): void {

    if (!Array.isArray(incomingDocIds) || incomingDocIds.length === 0) {
      this.logger.warn(
        `[recall][notify] Skip dispatch: no incoming documents, outgoingDocId=${outgoingDocId || 'n/a'}`,
      );
      return;
    }

    setImmediate(async () => {
      try {
        const notifiedAt = new Date();
        // Lấy thông tin các văn bản đến bị thu hồi
        const incomingDocs = await this.sqlsvRepo.getIncomingDocumentsByIds(incomingDocIds);


        if (!Array.isArray(incomingDocs) || incomingDocs.length === 0) {
          this.logger.warn(
            `[recall][notify] No incoming documents found, outgoingDocId=${outgoingDocId || 'n/a'}`,
          );
          return;
        }

        // Loại bỏ các document trùng lặp dựa trên document_id
        const uniqueIncomingDocs = Array.from(
          new Map(incomingDocs.map(doc => [String(doc.document_id || doc.documentId), doc])).values()
        );

        const emailRecipientIds = new Set<string>();
        let totalBellNotifications = 0;

        for (const doc of uniqueIncomingDocs) {
          const incomingDocId = doc.document_id || doc.documentId;
          const flowId = doc.bpmn_version; // Sử dụng bpmn_version thay vì flow_id
          const receiverUnit = doc.receiver_unit || doc.receiverUnit;


          if (!incomingDocId || !flowId || !receiverUnit) {
            this.logger.warn(
              `[recall][notify] Missing required fields for incoming doc, incomingDocId=${incomingDocId}, flowId=${flowId}, unit=${receiverUnit}`,
            );
            continue;
          }

          let recipients: string[] = [];
          try {
            recipients = await this.runtimeService.getStartEventUsersInUnit(
              flowId,
              receiverUnit,
            );
          } catch (resolveErr) {
            this.logger.warn(
              `[recall][notify] Resolve recipients failed incoming=${incomingDocId}, flow=${flowId}, unit=${receiverUnit}: ${resolveErr?.message || resolveErr}`,
            );
            continue;
          }

          const recipientIds = [
            ...new Set((recipients || []).map(String).filter(Boolean)),
          ];
          if (!recipientIds.length) {
            this.logger.warn(
              `[recall][notify] No valid recipients for incomingDocId=${incomingDocId}, unit=${receiverUnit}`,
            );
            continue;
          }

          // Gửi thông báo chuông
          this.notificationService.createForRecipients({
            recipientIds,
            senderId,
            content,
            title: `Bạn có văn bản bị thu hồi`,
            recordId: incomingDocId,
            link: `/incomming-documents/${incomingDocId}`,
            key: 'VIEW_INCOMING_DOC',
            type: NotificationType.INCOMING_DOC_RECALLED.value,
            time: new Date(),
            status: 1,
          });
          totalBellNotifications += recipientIds.length;

          recipientIds.forEach((id) => emailRecipientIds.add(String(id)));
        }

        // Gửi email

        if (emailRecipientIds.size > 0) {
          const users = await this.sqlsvRepo.getUsersByIds([...emailRecipientIds]);
          const usersWithEmail = users.filter((u: any) => !!u?.emailUser);


          await Promise.all(
            usersWithEmail.map((u: any) =>
              this.sendRecallEmail(String(u.emailUser), content, notifiedAt),
            ),
          );
        } else {
          this.logger.warn(
            `[recall][notify] No users with email addresses found for outgoingDocId=${outgoingDocId || 'n/a'}`,
          );
        }

      } catch (err) {
        this.logger.error(
          `[recall][notify] ❌ Dispatch notifications/emails failed outgoingDocId=${outgoingDocId || 'n/a'}`,
          err,
        );
      }
    });
  }

  async additionalReleaseOutgoingDocument(
    documentId: string,
    receiveUnits: string[],
    knowReceivers: string[],
    processors: string[],
    deadline: Date | null,
    userId: string): Promise<void> {
    try {
      const doc = await this.sqlRepo.getOutgoingDocument(documentId);
      if (!doc) {
        throw new NotFoundException(`Văn bản đi với ID ${documentId} không tồn tại.`);
      }
      const outgoing = doc;
      const flowConfigMap = new Map<string, any>();
      const incomingCopiesForEmail: Array<{
        incomingDocId: string;
        flowId: string;
        receiverUnit: string;
      }> = [];

      const normalizeIds = (values: string[] = []) =>
        [...new Set((values || []).map((v) => String(v).trim()).filter(Boolean))];
      const parseJsonArray = (value: any): string[] => {
        if (!value) return [];
        if (Array.isArray(value)) return value.map(String).filter(Boolean);
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
          } catch {
            return [];
          }
        }
        return [];
      };

      const uniqueReceiveUnits = normalizeIds(receiveUnits);
      const uniqueKnowReceivers = normalizeIds(knowReceivers || []);
      const uniqueProcessors = normalizeIds(processors);

      if (
        uniqueReceiveUnits.length > 0 ||
        uniqueKnowReceivers.length > 0 ||
        uniqueProcessors.length > 0
      ) {
        const flowConfigs = await this.sqlsvRepo.getIncomingFlowsByUnits(uniqueReceiveUnits);
        for (const fc of flowConfigs) {
          if (!Array.isArray(fc.unit)) continue;
          for (const u of fc.unit) {
            flowConfigMap.set(String(u), fc);
          }
        }
      }
      const [processorInfos, knowReceiverInfosRaw] = await Promise.all([
        uniqueProcessors.length > 0
          ? Promise.all(
            uniqueProcessors.map(async (processorUserId) => {
              const user: any = await this.sqlsvRepo.getUserById(processorUserId);
              if (!user?.parent?.id) return null;
              const flowConfig = await this.sqlsvRepo.getFlowByUnit(
                String(user.parent.id),
                'IncommingDocument',
              );
              return flowConfig
                ? { processorUserId, parentUnitId: String(user.parent.id), flowConfig }
                : null;
            }),
          )
          : Promise.resolve([]),
        uniqueKnowReceivers.length > 0
          ? Promise.all(
            uniqueKnowReceivers.map(async (knowReceiverUserId) => {
              const user: any = await this.sqlsvRepo.getUserById(knowReceiverUserId);
              if (user) {
                if (!user.parent?.id) return null;
                const flowConfig = await this.sqlsvRepo.getFlowByUnit(String(user.parent.id), 'IncommingDocument');
                return { type: 'user', knowReceiverUserId, parentUnitId: String(user.parent.id), flowConfig };
              } else {
                try {
                  const result = await this.groupUserInDocumentService.findUsersByGroupId(knowReceiverUserId, { page: 1, limit: 1000 });
                  const users = Array.isArray(result?.data) ? result.data : [];
                  const resolvedUsers = await Promise.all(
                    users.map(async (u) => {
                      const uid = typeof u?.id === 'string' ? u.id.trim() : String(u?.id || '').trim();
                      if (!uid) return null;
                      const gUser: any = await this.sqlsvRepo.getUserById(uid);
                      if (!gUser?.parent?.id) return null;
                      const flowConfig = await this.sqlsvRepo.getFlowByUnit(String(gUser.parent.id), 'IncommingDocument');
                      return { knowReceiverUserId: uid, parentUnitId: String(gUser.parent.id), flowConfig };
                    })
                  );
                  return { type: 'group', members: resolvedUsers.filter(Boolean) };
                } catch (err) {
                  console.error(`Error resolving group ${knowReceiverUserId} in additionalReleaseOutgoingDocument:`, err);
                  return null;
                }
              }
            }),
          )
          : Promise.resolve([]),
      ]);

      const knowReceiverInfos: any[] = [];
      const groupMemberUserIds: string[] = [];
      for (const item of knowReceiverInfosRaw) {
        if (!item) continue;
        if (item.type === 'user') {
          knowReceiverInfos.push({ knowReceiverUserId: item.knowReceiverUserId, parentUnitId: item.parentUnitId, flowConfig: item.flowConfig });
        } else if (item.type === 'group' && Array.isArray(item.members)) {
          for (const member of item.members) {
            if (member && member.knowReceiverUserId) {
              groupMemberUserIds.push(member.knowReceiverUserId);
            }
          }
        }
      }
      if (
        uniqueReceiveUnits.length > 0 ||
        uniqueKnowReceivers.length > 0 ||
        uniqueProcessors.length > 0
      ) {
        const tx = await this.sqlRepo.begin();
        try {
          // Parse các đơn vị nhận đã có
          let existingDepts: string[] = [];
          const existingProcessors = parseJsonArray(
            (outgoing as any).processor ?? (outgoing as any).processors,
          );
          const existingKnowReceivers = parseJsonArray(
            (outgoing as any).knowReceivers ?? (outgoing as any).know_receivers,
          );
          if (outgoing.internalReceivingDept && typeof outgoing.internalReceivingDept === 'string') {
            try {
              const parsed = JSON.parse(outgoing.internalReceivingDept);
              if (Array.isArray(parsed)) {
                existingDepts = parsed.map(String);
              }
            } catch (e) {
              this.logger.warn(`Không thể phân tích internal_receiving_dept cho văn bản ${documentId}, coi như mảng rỗng.`);
            }
          }

          // Chuẩn hóa và loại bỏ các đơn vị trùng lặp trong payload
          const normalizedReceiveUnits = receiveUnits
            .map((u) => String(u).trim())
            .filter((u) => u.length > 0);
          const uniqueReceiveUnits = [...new Set(normalizedReceiveUnits)];

          // Gộp và loại bỏ các đơn vị trùng lặp
          const allDepts = [...new Set([...existingDepts, ...uniqueReceiveUnits])];
          const allProcessors = [...new Set([...existingProcessors, ...uniqueProcessors])];
          const allKnowReceivers = [...new Set([...existingKnowReceivers, ...uniqueKnowReceivers, ...groupMemberUserIds])];

          // Cập nhật lại trường internal_receiving_dept trong transaction
          const updateRequest = tx.request();
          updateRequest.input('documentId', sql.VarChar, documentId);
          updateRequest.input('internalReceivingDept', sql.NVarChar, JSON.stringify(allDepts));
          updateRequest.input('processor', sql.NVarChar, JSON.stringify(allProcessors));
          updateRequest.input('knowReceivers', sql.NVarChar, JSON.stringify(allKnowReceivers));

          await updateRequest.query(`
            UPDATE outgoing_documents
            SET internal_receiving_dept = @internalReceivingDept,
                processor = @processor,
                know_receivers = @knowReceivers,
                updated_at = GETDATE()
            WHERE document_id = @documentId
          `);

          outgoing.internalReceivingDept = JSON.stringify(allDepts);
          outgoing.processor = JSON.stringify(allProcessors);
          outgoing.knowReceivers = JSON.stringify(allKnowReceivers);

          if (uniqueReceiveUnits.length > 0) {
            for (const receiverUnit of uniqueReceiveUnits) {
              const incomingRequest = tx.request();
              incomingRequest.input('documentId', sql.VarChar, documentId);
              incomingRequest.input('receiverUnit', sql.NVarChar, receiverUnit);

              // Xoá các bản ghi cũ đã copy từ document này cho cùng các đơn vị nhận
              await incomingRequest.query(`
                UPDATE ${this.dbname}.dbo.incomming_documents
                SET status = 3,
                    updated_at = GETDATE()
                WHERE copy_to_internal = @documentId
                  AND receiver_unit = @receiverUnit
              `);

              // Cập nhật trạng thái incoming_documents nếu đã tồn tại bản ghi status = 2 cho cùng đơn vị nhận
              await incomingRequest.query(`
                UPDATE ${this.dbname}.dbo.incomming_documents
                SET status = 1,
                    updated_at = GETDATE()
                WHERE document_id = @documentId
                  AND status = 2
                  AND receiver_unit = @receiverUnit
              `);
            }
          }

          for (const info of processorInfos.filter(Boolean) as Array<any>) {
            const incomingRequest = tx.request();
            incomingRequest.input('documentId', sql.VarChar, documentId);
            incomingRequest.input('receiverUnit', sql.NVarChar, info.parentUnitId);
            incomingRequest.input('processorUserId', sql.NVarChar, info.processorUserId);
            await incomingRequest.query(`
              UPDATE d
              SET d.status = 3,
                  d.updated_at = GETDATE()
              FROM ${this.dbname}.dbo.incomming_documents d
              WHERE d.copy_to_internal = @documentId
                AND d.receiver_unit = @receiverUnit
                AND EXISTS (
                  SELECT 1
                  FROM ${this.dbname}.dbo.audit a
                  WHERE a.document_id = d.document_id
                    AND a.receiver = @processorUserId
                )
            `);
          }

          /*
          for (const info of knowReceiverInfos.filter(Boolean) as Array<any>) {
            const incomingRequest = tx.request();
            incomingRequest.input('documentId', documentId);
            incomingRequest.input('receiverUnit', info.parentUnitId);
            incomingRequest.input('knowReceiverUserId', info.knowReceiverUserId);
            await incomingRequest.query(`
              UPDATE d
              SET d.status = 3,
                  d.updated_at = GETDATE()
              FROM ${this.dbname}.dbo.incomming_documents d
              WHERE d.copy_to_internal = @documentId
                AND d.receiver_unit = @receiverUnit
                AND EXISTS (
                  SELECT 1
                  FROM ${this.dbname}.dbo.audit a
                  WHERE a.document_id = d.document_id
                    AND a.receiver = @knowReceiverUserId
                )
            `);
          }
          */

          for (const ou of uniqueReceiveUnits) {
            const flowConfig = flowConfigMap.get(String(ou));
            if (!flowConfig) {
              continue;
            }

            const createdIncoming = await this.runtimeService.createIncomingDocumentCopy({
              outgoing,
              receiverUnit: ou,
              processorUserId: null,
              flowConfig,
              payload: { userId, deadline, docIds: documentId },
              wi: { id: 'additional_release' },
              tx,
              actionCode: 'CREATE',
              details: JSON.stringify({
                isTransferOption: false,
                transferType: 'to_room',
                organizationUnit: ou,
              }),
              skipDuplicateCheck: false,
              notification: true,
              userId
            });

            // Lưu incomingDocId để gửi email sau
            if (createdIncoming?.incomingDocId) {
              incomingCopiesForEmail.push({
                incomingDocId: String(createdIncoming.incomingDocId),
                flowId: String(flowConfig.id),
                receiverUnit: String(ou),
              });
            }
          }
          for (const info of processorInfos.filter(Boolean) as Array<any>) {
            await this.runtimeService.createIncomingDocumentCopyProcessor({
              outgoing,
              receiverUnit: info.parentUnitId,
              processorUserId: info.processorUserId,
              flowConfig: info.flowConfig,
              payload: { userId, deadline, docIds: documentId },
              wi: { id: 'additional_release' },
              tx,
              actionCode: 'CREATE',
              details: JSON.stringify({
                isTransferOption: false,
                transferType: 'to_processor',
                processorUserId: info.processorUserId,
                organizationUnit: info.parentUnitId,
              }),
              skipDuplicateCheck: false,
              notification: true,
              userId,
            });
          }

          /*
          for (const info of knowReceiverInfos.filter(Boolean) as Array<any>) {
            await this.runtimeService.createIncomingDocumentCopy({
              outgoing,
              receiverUnit: info.parentUnitId,
              processorUserId: info.knowReceiverUserId,
              flowConfig: info.flowConfig,
              payload: { userId, deadline, docIds: documentId },
              wi: { id: 'additional_release' },
              tx,
              actionCode: 'CREATE',
              details: JSON.stringify({
                isTransferOption: false,
                transferType: 'to_know',
                processorUserId: info.knowReceiverUserId,
                organizationUnit: info.parentUnitId,
              }),
              skipDuplicateCheck: false,
              notification: true,
              userId,
              roleProcess: 'viewer',
            });
          }
          */

          await this.sqlRepo.commit(tx);

          const allNewKnowReceivers = [...new Set([...uniqueKnowReceivers, ...groupMemberUserIds])];

          if (this.notificationService && allNewKnowReceivers.length > 0) {
            try {
              await Promise.all(
                allNewKnowReceivers.map((recipientId) =>
                  this.notificationService.create({
                    recipientId,
                    senderId: userId,
                    content: `Văn bản đi ${outgoing.toBook ? `số ${outgoing.toBook} ` : ''}đã được chuyển đến đồng chí nhận để biết.`,
                    recordId: documentId,
                    link: `/outgoing-documents/${documentId}`,
                    key: 'VIEW_OUTCOMING_DOC',
                    type: NotificationType.OUTGOING_DOC_PUBLISHED_RECEIVER_KNOW.value,
                    time: new Date(),
                    status: 1,
                  })
                )
              );
            } catch (e: any) {
              this.logger.error(`❌ Notification for know receivers in additionalReleaseOutgoingDocument failed: ${e?.message || e}`);
            }
          }

          if (incomingCopiesForEmail.length > 0) {
            const outgoingDocNumber = this.getOutgoingDocNumber(outgoing);
            const content = `Văn bản đi ${outgoingDocNumber}đã được ban hành.`;
            this.dispatchAdditionalReleaseNotificationsForReceivingUnits(
              incomingCopiesForEmail,
              userId,
              content,
              outgoingDocNumber,
              outgoing.abstractNote,
              documentId,
            );
          } else {
            this.logger.warn(
              `[additional-release][notify] Skip dispatch: no incoming copies created, docId=${documentId}`,
            );
          }
        } catch (error) {
          await this.sqlRepo.rollback(tx);
          throw error;
        }
      }
    } catch (error) {
      console.error('additionalReleaseOutgoingDocument error:', error);
      throw error;
    }
  }


  async getLastAuditInDocument(documentId: string, userId: string): Promise<boolean> {
    if (!documentId || !userId) {
      return false;
    }
    const pool = await this.getMsPool();
    const request = pool.request();
    request.input('documentId', sql.NVarChar, documentId);
    request.input('userId', sql.NVarChar, userId);

    // Lấy bản ghi audit gần nhất cho document này
    const result = await request.query(`
      SELECT TOP 1 *
      FROM ${this.dbname}.dbo.audit
      WHERE document_id = @documentId
        AND created_by = @userId
      ORDER BY id DESC
    `);

    const row = result.recordset[0];

    return row;
  }

  /**
     * Kiểm tra xem một văn bản đi đã được ban hành hay chưa
     * @param lastAudit Bản ghi lịch sử xử lý cuối cùng của văn bản.
     * @returns `true` nếu tồn tại, ngược lại `false`.
  */
  checkOutgoingReleased(lastAudit: any) {

    if (!lastAudit) return false;

    const stage = lastAudit.stage_status;
    return String(stage).trim() === 'DA_BAN_HANH';
  }

  /**
     * Kiểm tra xem một văn bản đi đã được ban hành hay chưa
     * @param lastAudit Bản ghi lịch sử xử lý cuối cùng của văn bản.
     * @returns `true` nếu tồn tại, ngược lại `false`.
  */
  checkOutgoingRecallInternalReceiveUnit(lastAudit: any, userId: string) {

    if (!lastAudit) return false;
    if (lastAudit.created_by && lastAudit.created_by === userId) {
      const stage = lastAudit.stage_status;
      if (String(stage).trim() === 'DA_BAN_HANH')
        return true;
    }
    return false;
  }

  async exportBody(
    documentId: string,
    userId: string,
    typeDocument: string,
  ): Promise<Record<string, any>> {
    if (!documentId || !userId) {
      throw new BadRequestException('Thiếu documentId hoặc userId');
    }

    // Lấy outgoing document
    const doc = await this.runtime.repo.getOutgoingDocument(documentId);

    if (!doc) {
      throw new NotFoundException('Không tìm thấy văn bản đi');
    }

    // Lấy files cho outgoing document
    const filesMap = await this.runtime.repo.getFilesByOutgoingDocumentIds([documentId]);
    doc.files = filesMap[doc.documentId] || [];

    // Aliases cho outgoing document
    const aliases = {
      statusCode: 'statusCode',
      abstractNote: 'abstractNote',
      senderUnit: 'senderUnit',
      drafter: 'drafter',
      documentType: 'documentType',
      documentField: 'documentField',
      reportSigner: 'reportSigner',
      releaseDate: 'releaseDate',
      files: 'files',
      toBookTextSymbols: 'toBookTextSymbols',
      signType: 'signType',
      bookDocumentId: 'bookDocumentId',
      toBook: 'toBook',
      privateLevel: 'privateLevel',
      reportDocumentSymbol: 'reportDocumentSymbol',
      viewers: 'viewers',
      deadlineReply: 'deadlineReply',
      recipientIds: 'recipientIds',
      internalReceivingUnit: 'internalReceivingUnit',
      replyIncommingDoc: 'replyIncommingDoc',
      draftSigner: 'draftSigner',
      status: 'status',
      codeCommanders: 'codeCommanders',
      commanders: 'commanders',
      currentNote: 'currentNote',
      releaseNo: 'releaseNo',
      textSymbols: 'textSymbols',
      docWorkFiles: 'docWorkFiles',
      docProposal: 'docProposal',
      docDraft: 'docDraft',
      docAttachments: 'docAttachments',
      docRecall: 'docRecall',
      docReplacement: 'docReplacement',
      docAnswer: 'docAnswer',
      externalReceivingUnit: 'externalReceivingUnit',
      internalReceivingDept: 'internalReceivingDept',
      processor: 'processor',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      knowReceivers: 'knowReceivers',
    };

    // Lấy và xử lý comments
    const cleanedComments = await this.getCleanedComments(documentId, doc.bpmnVersion);

    // Map document với aliases
    doc.statusCode = await this.runtime.repo.getStatusCode(documentId);
    const result = await this.runtime.repo.mapSingleDocumentWithAliases(doc, aliases);

    // Set drafter based on status
    if (result.statusCode === 'Đã phát hành') {
      result.drafter = result.drafter || '';
    } else {
      result.drafter = doc.createdAt
        ? this.normalizeDateValueDDMMYYYY(doc.createdAt)
        : '';
    }

    // Thêm metadata
    result.comments = cleanedComments;
    const exportedAt = new Date(Date.now() + 7 * 60 * 60 * 1000);
    result.exportedAt = normalizeDateValueHHmmDDMMYYYY(exportedAt);

    const userName = await this.runtime.repo.getNameOfUser(userId);
    result.exportedBy = userName;

    result.signType = doc.signType ? 'Ký số' : 'Ký tay';

    return this.toSnakeCase(result);
  }

  /**
   * Get cleaned comments với role mapping
   * 
   * @private
   */
  private async getCleanedComments(documentId: string, bpmnVersion: string): Promise<any[]> {
    const commentsResult = await this.runtime.repo.findAllCommentsFlat(documentId);
    const comments = Array.isArray(commentsResult) ? commentsResult : [];

    // Get unique user IDs
    const uniqueUserIds = [...new Set(comments.map(c => c.userId).filter(Boolean))];

    // Map user roles
    const userRolesMap = new Map<string, string>();
    await Promise.all(
      uniqueUserIds.map(async (uid) => {
        const roles = await this.runtime.repo.getUserRoleWithName(uid, bpmnVersion);
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
   * Helper methods (giống IncomingService)
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

  buildDraftData(params: {
    raw: any;
    creatorUserId: string;
    bpmnVersion: string;
  }) {
    const { raw, creatorUserId, bpmnVersion } = params;

    // Auto-fill người soạn thảo vào "Nơi nhận để biết"
    let knowReceivers = Array.isArray(raw?.knowReceivers)
      ? [...raw.knowReceivers]
      : [];
    if (creatorUserId && !knowReceivers.includes(creatorUserId)) {
      knowReceivers = [creatorUserId, ...knowReceivers];
    }

    return {
      ...raw,
      knowReceivers,
      statusCode: raw?.statusCode ?? '1',
      createdBy: creatorUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      bpmnVersion,
      fromCreateDraf: raw?.fromCreateDraf,
    };
  }

  async deleteDraftById(documentId: string) {
    if (!documentId) {
      throw new BadRequestException('documentId is required');
    }
    const tx = await this.sqlRepo.begin();
    try {
      const result = await this.runtime.repo.deleteDraftById(documentId, tx);
      await tx.commit();
      return result;
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  }

  async updateDraftSigners(documentId: string, payload: UpdateDraftSignersDto) {
    if (!documentId) {
      throw new BadRequestException('documentId is required');
    }

    const entries = this.normalizeDraftSignerPayload(payload);
    if (!entries.length) {
      throw new BadRequestException('signerType/userIds hoac signers la bat buoc');
    }

    await this.assertOutgoingDocumentExists(documentId);

    const tx = await this.sqlRepo.begin();
    try {
      for (const entry of entries) {
        await this.sqlRepo.replaceRuntimeSigners({
          documentId,
          typeSign: entry.signerType,
          executionMode: entry.executionMode,
          assignees: entry.userIds.map((userId) => ({ userId })),
          tx,
        });
      }

      await tx.commit();

      const signers = await this.sqlRepo.getAllSignersFromOutgoingDocumentUsers(documentId);
      return {
        status: 1,
        message: 'Draft signers updated',
        documentId,
        signers,
      };
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  }

  private normalizeDraftSignerPayload(payload: UpdateDraftSignersDto): Array<{ signerType: string; executionMode: string; userIds: string[] }> {
    const rawEntries = Array.isArray(payload?.signers) && payload.signers.length
      ? payload.signers
      : payload?.signerType
        ? [{ signerType: payload.signerType, userIds: payload.userIds || [], executionMode: payload.executionMode }]
        : [];

    return rawEntries.map((entry: any) => {
      const signerType = String(entry?.signerType || '').trim();
      if (!OUTGOING_DRAFT_SIGNER_TYPES.includes(signerType as any)) {
        throw new BadRequestException(`signerType khong hop le: ${signerType}`);
      }

      const userIds: string[] = Array.from(new Set<string>(
        (Array.isArray(entry?.userIds) ? entry.userIds : [])
          .map((userId: any) => String(userId || '').trim())
          .filter(Boolean),
      ));

      return { signerType, userIds, executionMode: entry?.executionMode };
    });
  }

  private async assertOutgoingDocumentExists(documentId: string): Promise<void> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('documentId', sql.VarChar(100), documentId)
      .query(`
        SELECT TOP 1 document_id
        FROM ${this.dbname}.dbo.outgoing_documents
        WHERE document_id = @documentId
      `);

    if (!result.recordset?.length) {
      throw new NotFoundException(`Khong tim thay van ban du thao: ${documentId}`);
    }
  }

  async isWordFromUrl(id: string | number): Promise<boolean> {
    let file;
    const numericId = Number(id);
    const idStr = String(id);
    if (!isNaN(numericId) && idStr.length <= 16 && !idStr.includes('-')) {
      file = await this.filesRepository.getFileById(numericId);
    }

    if (!file) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idStr);
      if (isUUID) {
        file = await this.filesRepository.getFileByPublicId(idStr);
      }
    }

    if (!file) return false;

    const mime_type = (file.mime_type || '').toLowerCase();
    const fileName = (file.file_name || '').toLowerCase();

    if (
      mime_type === 'application/msword' ||
      mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx') ||
      fileName.endsWith('.doc') ||
      mime_type === 'application/pdf' ||
      fileName.endsWith('.pdf') ||
      mime_type === 'application/vnd.ms-excel' ||
      mime_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls')
    ) {
      return true;
    }
    return false;
  }

  async getFileTypeFromId(id: string | number): Promise<string> {
    let file;
    const numericId = Number(id);
    const idStr = String(id);
    if (!isNaN(numericId) && idStr.length <= 16 && !idStr.includes('-')) {
      file = await this.filesRepository.getFileById(numericId);
    }

    if (!file) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idStr);
      if (isUUID) {
        file = await this.filesRepository.getFileByPublicId(idStr);
      }
    }

    if (!file) return 'word';

    const mime_type = (file.mime_type || '').toLowerCase();
    const fileName = (file.file_name || '').toLowerCase();

    if (
      mime_type === 'application/pdf' ||
      fileName.endsWith('.pdf')
    ) {
      return 'pdf';
    }

    if (
      mime_type === 'application/vnd.ms-excel' ||
      mime_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls')
    ) {
      return 'excel';
    }

    return 'word';
  }


  async stampDoc(
    docId: string,
    workItemId: string,
    payload: any,
    userId: string,
    authorizedBy: string | null,
    bpmn?: string,
    accessToken?: string,
  ): Promise<any> {
    try {

      const { fileOrigin, fileExample } = payload;

      if (!fileOrigin || !fileExample) {
        throw new BadRequestException('Thiếu file để tạo sao y');
      }

      const baseUrl = (process.env.URL_NESTJS || '').trim();
      const tokenSuffix = accessToken ? `?accessToken=${accessToken}` : '';
      const fileOriginUrl = `${baseUrl}/api/files/download/${fileOrigin}${tokenSuffix}`;
      const fileExampleUrl = fileExample.startsWith('http')
        ? (accessToken && !fileExample.includes('accessToken=')
          ? `${fileExample}${fileExample.includes('?') ? '&' : '?'}accessToken=${accessToken}`
          : fileExample)
        : `${baseUrl}/api/files/download/${fileExample}${tokenSuffix}`;

      // validate file word/excel/pdf
      if (!(await this.isWordFromUrl(fileOrigin))) {
        throw new BadRequestException('File cần tạo sao y phải là Word, Excel hoặc PDF');
      }

      // =========================
      // 1. LẤY SỔ + TĂNG SỐ (LOCK)
      // =========================
      const currentYear = new Date().getFullYear();

      const book = await this.bookRepo.findOne({
        where: {
          year: currentYear,
          active: true,
          isDefault: true,
          isCertifiedCopies: true,
          status: In([STATUS.ACTIVED, STATUS.NOT_ACTIVED]),
        },
      });

      if (!book) {
        throw new BadRequestException(
          `Không có sổ sao y hợp lệ năm ${currentYear}`,
        );
      }

      const bookNumber = (book.count || 0) + 1;

      // =========================
      // 2. NƠI NHẬN (3)
      // =========================
      const docRows = await this.outgoingRepo.manager.query(
        `SELECT book_document_id FROM ${this.dbname}.dbo.incomming_documents WHERE document_id = CAST(@0 AS VARCHAR(100))`,
        [docId]
      );
      const docBookId = docRows && docRows[0]?.book_document_id;

      if (docBookId && book && Number(book.book_document_id) === Number(docBookId)) {
        throw new BadRequestException(
          'Sổ của văn bản đến trùng với sổ sao y. Vui lòng cập nhật lại sổ của văn bản đến trước khi tạo sao y.',
        );
      }

      let recipientsText = '';

      if (payload && payload.recipientsText !== undefined && payload.recipientsText !== null) {
        recipientsText = String(payload.recipientsText).trim();
      } else {
        try {
          const auditRows = await this.outgoingRepo.manager.query(
            `SELECT TOP 1 details FROM dbo.audit WHERE document_id = @0 AND details LIKE '%vanThuNote%' ORDER BY id DESC`,
            [docId]
          );
          if (auditRows && auditRows.length > 0) {
            const detailsStr = auditRows[0].details;
            if (detailsStr) {
              const parsed = JSON.parse(detailsStr);
              if (parsed && parsed.vanThuNote) {
                recipientsText = `${parsed.vanThuNote.trim()}`;
              }
            }
          }
        } catch (err) {
          this.logger.error(`Error loading vanThuNote from audit for docId ${docId}:`, err);
        }
      }

      let processedRecipientsText = '';
      if (recipientsText) {
        const lines = recipientsText.split(/\r?\n/);
        const processedLines = lines.map((line, index) => {
          const trimmed = line.trim();
          if (trimmed === '') return '';
          if (index === 0) {
            if (trimmed.startsWith('-') || trimmed.startsWith('+') || trimmed.startsWith('•')) {
              return trimmed.substring(1).trim();
            }
            return trimmed;
          } else {
            if (!trimmed.startsWith('-') && !trimmed.startsWith('+') && !trimmed.startsWith('•')) {
              return `- ${trimmed}`;
            }
            return line;
          }
        });
        processedRecipientsText = processedLines.join('\u000b');
      }

      const autoReplacements = [
        { key: '[mot]', value: book.name },
        { key: '[hai]', value: String(bookNumber) },
        { key: '[ba]', value: processedRecipientsText },
      ];

      if (payload.auto && Array.isArray(payload.auto)) {
        autoReplacements.push(...payload.auto);
      }

      // merge file
      const mergeApiUrl = `${process.env.APP_CONVERT_URL}/merge-word-urls`;
      const fileType = await this.getFileTypeFromId(fileOrigin);

      const response = await axios.post(
        mergeApiUrl,
        {
          baseUrl: fileOriginUrl,
          appendUrl: fileExampleUrl,
          replacements: autoReplacements,
          fileType,
        },
        {
          responseType: 'arraybuffer',
          timeout: 60000,
        },
      ).catch(err => {
        if (err.response?.data) {
          const errorMsg = Buffer.from(err.response.data).toString();
          this.logger.error(`[stampDoc] Merge API Error Detail: ${errorMsg}`);
        }
        throw err;
      });

      // 4.1. Upload merged buffer as temp file to get URL
      const mergedBuffer = Buffer.from(response.data);

      // Detect if the merge API returned a PDF instead of DOCX
      const isPdf = mergedBuffer.length > 4 && mergedBuffer[0] === 0x25 && mergedBuffer[1] === 0x50 && mergedBuffer[2] === 0x44 && mergedBuffer[3] === 0x46;

      const originalname = isPdf ? `merged_${docId}.pdf` : `merged_${docId}.docx`;
      const mimetype = isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      let finalPdfBuffer: Buffer = Buffer.from(mergedBuffer);
      let finalFileName = originalname;
      let finalMimeType = mimetype;

      if (!isPdf) {
        const endpoint = `${process.env.APP_CONVERT_URL}/file-to-pdf`;

        const startTime = Date.now();
        const formData = new FormData();
        formData.append('file', mergedBuffer, {
          filename: originalname,
          contentType: mimetype,
        });

        try {
          const convertResponse = await axios.post(endpoint, formData, {
            headers: formData.getHeaders(),
            responseType: 'arraybuffer',
            maxBodyLength: Infinity,
            timeout: 60000,
          });

          const duration = Date.now() - startTime;
          finalPdfBuffer = Buffer.from(convertResponse.data);
          const contentType = convertResponse?.headers?.['content-type'] || '';

          // Validate PDF magic bytes
          const isActuallyPdf = finalPdfBuffer.length > 4 && finalPdfBuffer[0] === 0x25 && finalPdfBuffer[1] === 0x50 && finalPdfBuffer[2] === 0x44 && finalPdfBuffer[3] === 0x46;

          if (!isActuallyPdf) {
            const preview = finalPdfBuffer.subarray(0, 120).toString('utf8');
            this.logger.error(`[stampDoc] file-to-pdf response is not PDF. contentType=${contentType}, head="${preview}"`);
            throw new BadRequestException('Dịch vụ chuyển đổi file-to-pdf không trả về PDF hợp lệ');
          }

          finalFileName = originalname.replace(/\.docx$/i, '.pdf');
          finalMimeType = 'application/pdf';
        } catch (err: any) {
          const responseData = err?.response?.data;
          const detail = Buffer.isBuffer(responseData)
            ? responseData.subarray(0, 160).toString('utf8')
            : typeof responseData === 'string'
              ? responseData.slice(0, 160)
              : err?.message || 'unknown';
          this.logger.error(`[stampDoc] Conversion failed. filename=${originalname}: ${detail}`);
          throw new InternalServerErrorException(`Không thể chuyển đổi file sang PDF: ${detail}`);
        }
      }

      // 4.2. Upload final PDF buffer
      const uploadBuffer = Buffer.from(new Uint8Array(finalPdfBuffer));

      const tempUpload = await this.fileService.uploadFile(
        {
          object_id: docId,
          object_type: 'temp_stamp',
        } as any,
        {
          buffer: uploadBuffer,
          originalname: finalFileName,
          mimetype: finalMimeType,
        } as any,
        userId
      );

      if (!tempUpload || !tempUpload.public_id) {
        throw new InternalServerErrorException('Không thể upload file PDF sau khi xử lý');
      }

      const pdfFileId = (tempUpload as any).internal_id || (await (this.fileService as any).resolveFileIdOrThrow(tempUpload.public_id));
      const pdfPublicId = tempUpload.public_id;

      // ==========================================
      // LOGIC CŨ: Chạy hàm insertTextsToPdfFile để ghi đè chữ lên PDF (Gây vỡ khung/lệch lề trái)
      // LOGIC MỚI: Bỏ qua (comment) vì các từ khóa đã được thay thế ngay từ tầng Word trong API /merge-word-urls.
      // ==========================================
      /*
      await this.fileService.insertTextsToPdfFile(
        {
          id: pdfPublicId,
          auto: autoReplacements,
          texts: {},
        } as any,
        userId,
        accessToken
      );
      */

      // 4.4. Get final PDF buffer for response
      const finalFile = await this.fileService.getFileForView(pdfFileId);
      if (!finalFile || !finalFile.fileBuffer) {
        throw new InternalServerErrorException('Không thể lấy nội dung file PDF sau khi xử lý');
      }

      return {
        buffer: finalFile.fileBuffer,
        bookInfo: {
          id: book.book_document_id,
          name: book.name,
          number: bookNumber,
        },
      };
    } catch (error) {
      this.logger.error(`[stampDoc] Error: ${error.message}`, error.stack);
      throw new InternalServerErrorException(error.message);
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

  async getStatisticReportOfSenderUnitService(
    query: StatisticProcessSignQueryDto,
    user: any,
  ): Promise<StatisticReportProcessResponseDto> {
    const {
      filter = {},
      page = 1,
      limit = 20,
      isExport,
      countOnly,
      typeDoc,
      sort,
    } = query;

    const pageNum = Math.max(Number(page) || 1, 1);
    let limitNum = Math.min(Number(limit) || 20, 1000);
    if (isExport === 'true') limitNum = 9999;

    const normalizedFilter = normalizeStatisticsFilterObject(filter);
    const { senderUnit, releaseDate, createdDate } = normalizedFilter;
    const documentType = typeDoc || normalizedFilter.documentType;

    const pool = await this.getPool();

    try {
      // ── Date range (ưu tiên createdDate trước releaseDate) ─────────────────
      let startDate: string | undefined;
      let endDate: string | undefined;
      let dateField = 'release_date';

      if (createdDate) {
        startDate = createdDate.startDate;
        endDate = createdDate.endDate;
        dateField = 'created_at';
      } else if (releaseDate) {
        startDate = releaseDate.startDate;
        endDate = releaseDate.endDate;
        dateField = 'release_date';
      }

      // ── Org units ───────────────────────────────────────────────────────────
      let orgs = await this.incomingService.getAllOrganizationUnits(pool, user);

      // senderUnit hỗ trợ string | string[]
      const senderUnitArr: string[] = senderUnit
        ? (Array.isArray(senderUnit) ? senderUnit : [senderUnit]).filter(Boolean)
        : [];

      if (senderUnitArr.length > 0) {
        // Lấy tất cả org thuộc bất kỳ senderUnit nào được chọn (bao gồm con cháu)
        const filteredOrgs = new Set<string>();
        for (const su of senderUnitArr) {
          const targetOrg = orgs.find((o) => o.id === su);
          const targetMpath = targetOrg?.mpath ?? '';
          for (const o of orgs) {
            if (
              o.id === su ||
              (targetOrg && (o.mpath ?? '').startsWith(targetMpath + '.'))
            ) {
              filteredOrgs.add(o.id);
            }
          }
        }
        orgs = orgs.filter((o) => filteredOrgs.has(o.id));
      }

      const orgIds = orgs.map((o) => o.id);
      if (!orgIds.length) {
        return { data: [], total: 0, page: Number(page), limit: Number(limit), totalPages: 0 };
      }

      // ── Documents ───────────────────────────────────────────────────────────
      // documentType hỗ trợ string | string[]
      const documents = await this.incomingService.getFilteredDocuments({
        pool,
        startDate,
        endDate,
        typeDocument: 'outgoing_documents',
        senderUnit: orgIds,
        select: 'document_id, deadline_reply, sender_unit, document_type, created_at',
        documentType: documentType || undefined,
        dateField,
      });

      if (!documents.length) {
        return { data: [], total: 0, page: Number(page), limit: Number(limit), totalPages: 0 };
      }

      const documentIds = documents.map((d: any) => d.document_id);

      type Doc = { document_id: string; deadline_reply: Date | null; sender_unit: string | null; created_at?: Date | null };

      // ── Group by department ─────────────────────────────────────────────────
      const documentsByDepartment = new Map<string, Doc[]>();
      for (const doc of documents as Doc[]) {
        if (!doc.sender_unit) continue;
        if (!documentsByDepartment.has(doc.sender_unit))
          documentsByDepartment.set(doc.sender_unit, []);
        documentsByDepartment.get(doc.sender_unit)!.push(doc);
      }

      // ── Signature data ──────────────────────────────────────────────────────
      const signatureData = await this.getSignatureData(pool, documentIds);
      const signatureMap = new Map<
        string,
        Array<{ signed_at: Date | null; signer_type: string; is_signed: number }>
      >();
      for (const sig of signatureData) {
        if (!signatureMap.has(sig.document_id))
          signatureMap.set(sig.document_id, []);
        signatureMap.get(sig.document_id)!.push({
          signed_at: sig.signed_at,
          signer_type: sig.signer_type,
          is_signed: sig.is_signed ? 1 : 0,
        });
      }

      if (countOnly === 'true') {
        return { data: [], total: documentIds.length, page: pageNum, limit: limitNum, totalPages: 1 };
      }

      // ── Department stats ────────────────────────────────────────────────────
      const departmentStats = this.calculateDepartmentStats(
        documents as Doc[],
        signatureMap,
      );

      const orgMap = new Map(orgs.map((o) => [o.id, o]));
      const allData: any[] = [];

      for (const [deptId, stat] of departmentStats.entries()) {
        const org = orgMap.get(deptId);
        if (!org) continue;
        allData.push({
          id: deptId,
          senderUnit: org.name,
          total: stat.total,
          onTime: stat.on_time,
          late: stat.late,
          processing: stat.processing,
          avgDays: stat.avg_days,
          onTimeRate: `${stat.on_time_rate}%`,
        });
      }

      // ── In-memory sort ──────────────────────────────────────────────────────
      // fieldMap: camelCase API key → JS property name (same here)
      const sortFieldMap: Record<string, string> = {
        senderUnit: 'senderUnit',
        total: 'total',
        onTime: 'onTime',
        late: 'late',
        processing: 'processing',
        avgDays: 'avgDays',
        onTimeRate: 'onTimeRate',
      };

      if (sort) {
        try {
          const parsed: Record<string, any> =
            typeof sort === 'string' ? JSON.parse(sort) : sort;
          const [key, val] = Object.entries(parsed)[0] ?? [];
          const prop = sortFieldMap[key];
          if (prop) {
            const dir = Number(val) === 1 ? 1 : -1;
            allData.sort((a, b) => {
              const av = a[prop] ?? '';
              const bv = b[prop] ?? '';
              if (typeof av === 'number' && typeof bv === 'number')
                return (av - bv) * dir;
              return String(av).localeCompare(String(bv), 'vi') * dir;
            });
          }
        } catch { /* ignore invalid sort */ }
      }

      // ── Pagination ──────────────────────────────────────────────────────────
      const total = allData.length;
      const totalPages = Math.ceil(total / limitNum);
      const offset = (pageNum - 1) * limitNum;

      const paginatedData =
        isExport === 'true' ? allData : allData.slice(offset, offset + limitNum);

      return { data: paginatedData, total, page: pageNum, limit: limitNum, totalPages };

    } catch (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }
  }


  async reportOutgoingByTime(
    query: ListReportOutgoingByTimeDto,
    userId: string,
    authorId?: string,
  ) {
    /** ===================== 1. VALIDATION ===================== */
    const { page = '1', limit = '20', filter = {}, isExport, countOnly, sort } = query as any;

    const pageNum = Number(page);
    let limitNum = Number(limit);

    if (!Number.isInteger(pageNum) || pageNum <= 0)
      throw new BadRequestException('page phải là số nguyên dương');
    if (!Number.isInteger(limitNum) || limitNum <= 0)
      throw new BadRequestException('limit phải là số nguyên dương');
    if (isExport === 'true') limitNum = 9999;

    const parseDate = (v: any, name: string): Date | undefined => {
      if (!v) return undefined;
      const d = new Date(v);
      if (isNaN(d.getTime())) throw new BadRequestException(`${name} không hợp lệ`);
      return d;
    };

    const normalizedFilter = normalizeStatisticsFilterObject(filter);
    const { releaseDate, createdDate, documentType, senderUnit, signType } = normalizedFilter;

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (releaseDate) {
      startDate = parseDate(releaseDate.startDate, 'startDate');
      endDate = parseDate(releaseDate.endDate, 'endDate');
    } else if (createdDate) {
      startDate = parseDate(createdDate.startDate, 'startDate');
      endDate = parseDate(createdDate.endDate, 'endDate');
    }

    if (startDate && endDate && startDate > endDate)
      throw new BadRequestException('fromDate phải <= toDate');

    /** ===================== 2. WHERE ===================== */
    const where: string[] = [];
    where.push(`od.status <> 3`);
    where.push(`
      EXISTS (
        SELECT 1
        FROM ${this.dbname}.dbo.audit a
        WHERE a.document_id = od.document_id
          AND a.stage_status = @stageStatusPublished
      )
    `);

    const pool = await this.getMsPool();
    const request = pool.request();
    request.input('stageStatusPublished', stageStatusDoc.DA_BAN_HANH);

    if (startDate) {
      where.push(`od.release_date >= @startDate`);
      request.input('startDate', sql.DateTime, startDate);
    }
    if (endDate) {
      where.push(`od.release_date < DATEADD(DAY, 1, @endDate)`);
      request.input('endDate', sql.DateTime, endDate);
    }
    // documentType: hỗ trợ single string hoặc string[]
    const documentTypeArr: string[] = documentType
      ? (Array.isArray(documentType) ? documentType : [documentType]).filter(Boolean)
      : [];
    if (documentTypeArr.length === 1) {
      where.push(`od.document_type = @documentType0`);
      request.input('documentType0', documentTypeArr[0]);
    } else if (documentTypeArr.length > 1) {
      const params = documentTypeArr.map((_, i) => `@documentType${i}`).join(', ');
      where.push(`od.document_type IN (${params})`);
      documentTypeArr.forEach((v, i) => request.input(`documentType${i}`, v));
    }

    // senderUnit: hỗ trợ single string hoặc string[]
    const senderUnitArr: string[] = senderUnit
      ? (Array.isArray(senderUnit) ? senderUnit : [senderUnit]).filter(Boolean)
      : [];
    if (senderUnitArr.length === 1) {
      where.push(`od.sender_unit = @senderUnit0`);
      request.input('senderUnit0', senderUnitArr[0]);
    } else if (senderUnitArr.length > 1) {
      const params = senderUnitArr.map((_, i) => `@senderUnit${i}`).join(', ');
      where.push(`od.sender_unit IN (${params})`);
      senderUnitArr.forEach((v, i) => request.input(`senderUnit${i}`, v));
    }
    if (signType !== undefined) {
      if (signType === 'digitalSignature')
        where.push(`od.sign_type = 1`);
      else if (signType === 'handwrittenSignature')
        where.push(`(od.sign_type = 0 OR od.sign_type IS NULL)`);
    }

    const whereClause = `WHERE ${where.join(' AND ')}`;
    const offset = (pageNum - 1) * limitNum;

    /** ===================== 3. SORT ===================== */
    // Map camelCase API field → fully-qualified SQL expression
    const sortFieldMap: Record<string, string> = {
      releaseNo: 'od.release_no',
      releaseDate: 'od.release_date',
      documentType: 'dt.title',
      abstractNote: 'od.abstract_note',
      senderUnit: 'su.name',
      reportSigner: 'signer.report_signer',
      signType: 'od.sign_type',
    };
    const orderBy = this.buildSortClause(
      sort,
      sortFieldMap,
      'od.abstract_note ASC',
    );

    /** ===================== 4. FROM ===================== */
    const baseFrom = `
      FROM ${this.dbname}.dbo.outgoing_documents od
      LEFT JOIN ${this.dbname}.dbo.crm_source_data dt   ON dt.value  = od.document_type
      LEFT JOIN ${this.dbname}.dbo.organization_units su  ON su.id    = od.sender_unit
      LEFT JOIN ${this.dbname}.dbo.organization_units iru ON iru.id   = od.internal_receiving_unit
      LEFT JOIN ${this.dbname}.dbo.organization_units eru ON eru.id   = od.external_receiving_unit

      OUTER APPLY (
        SELECT STRING_AGG(CAST(u.name AS NVARCHAR(MAX)), ', ') AS report_signer
        FROM OPENJSON(
          CASE WHEN ISJSON(od.report_signer) = 1 THEN od.report_signer ELSE '[]' END
        ) WITH (id NVARCHAR(100) '$') j
        LEFT JOIN ${this.dbname}.dbo.users u ON u.id = j.id
      ) signer

      OUTER APPLY (
        SELECT STRING_AGG(CAST(ou.name AS NVARCHAR(MAX)), ', ') AS internal_dept_names
        FROM OPENJSON(
          CASE WHEN ISJSON(od.internal_receiving_dept) = 1 THEN od.internal_receiving_dept ELSE '[]' END
        ) WITH (id NVARCHAR(100) '$') j
        JOIN ${this.dbname}.dbo.organization_units ou ON ou.id = j.id
      ) ir_dept
    `;

    try {
      /** ===================== 5. COUNT ===================== */
      const totalQuery = `SELECT COUNT(1) AS total ${baseFrom} ${whereClause}`;
      const totalRes = await request.query(totalQuery);
      const total = totalRes.recordset?.[0]?.total ?? 0;

      if (countOnly === 'true') return { success: true, data: { total } };

      /** ===================== 6. DATA ===================== */
      const dataQuery = `
        SELECT
          od.document_id,
          od.bpmn_version,
          od.release_no,
          od.release_date,
          dt.title                         AS document_type,
          od.abstract_note,
          su.name                          AS sender_unit,
          od.report_signer                 AS report_signer_id,
          signer.report_signer,
          iru.name                         AS internal_receiving_unit,
          eru.name                         AS external_receiving_unit,
          ir_dept.internal_dept_names      AS internal_receiving_dept,
          CASE od.sign_type
            WHEN 0 THEN N'Ký tay'
            WHEN 1 THEN N'Ký số'
            ELSE        N'Ký tay'
          END AS sign_type
        ${baseFrom}
        ${whereClause}
        ORDER BY ${orderBy}
        OFFSET ${offset} ROWS FETCH NEXT ${limitNum} ROWS ONLY
      `;

      const dataRes = await request.query(dataQuery);

      /** ===================== 7. MAP ===================== */
      const extractIds = (val: any): string[] => {
        if (!val) return [];
        if (Array.isArray(val)) return val.map(String);
        if (typeof val === 'string') {
          try {
            const p = JSON.parse(val);
            return Array.isArray(p) ? p.map(String) : [val];
          } catch { return [val]; }
        }
        return [String(val)];
      };

      const items = await Promise.all(
        dataRes.recordset.map(async (r) => {
          try {
            const signerIds = extractIds(r.report_signer_id);

            const roles = await Promise.all(
              signerIds.map(async (id) => {
                try { return await this.sqlsvRepo.getUserRole(id, r.bpmn_version); }
                catch (err) { this.logger.warn(`getUserRole fail id=${id}`, err); return null; }
              }),
            );

            const signerNames = r.report_signer
              ? r.report_signer.split(',').map((s: string) => s.trim())
              : [];

            const signerFull = signerIds.map((_, idx) =>
              `${signerNames[idx] ?? signerNames[0] ?? ''}`.trim(),
            );

            const internalParts: string[] = [];
            if (r.internal_receiving_unit) internalParts.push(r.internal_receiving_unit);
            if (r.internal_receiving_dept) internalParts.push(r.internal_receiving_dept);
            const externalName = r.external_receiving_unit;

            let receivingUnit = '';
            if (internalParts.length && externalName)
              receivingUnit = `Nội ngành: ${internalParts.join(', ')}; Ngoại ngành: ${externalName}`;
            else if (internalParts.length) receivingUnit = internalParts.join(', ');
            else if (externalName) receivingUnit = externalName;

            return {
              id: r.document_id,
              releaseNo: r.release_no,
              releaseDate: normalizeDateValueDDMMYYYY(r.release_date),
              documentType: r.document_type,
              abstractNote: r.abstract_note,
              senderUnit: r.sender_unit,
              reportSigner: signerFull.join(', '),
              receivingUnit,
              signType: r.sign_type,
            };
          } catch (err) {
            this.logger.warn('map record lỗi', err);
            return null;
          }
        }),
      );

      return {
        success: true,
        data: items.filter(Boolean),
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: limitNum ? Math.ceil(total / limitNum) : 0,
      };
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException('Lỗi truy vấn báo cáo văn bản đi');
    }
  }


  async statisticsBySigner(query: OutgoingStatisticsBySignerDto, userId: string) {

    // ── 1. PAGINATION ──────────────────────────────────────────────────────────
    const pageNum = Math.max(Number(query.page ?? 1) || 1, 1);
    let limitNum = Math.min(Number(query.limit ?? 20) || 20, 1000);
    if (query.isExport === 'true') limitNum = 9999;
    const offsetNum = (pageNum - 1) * limitNum;

    // ── 2. FILTER ──────────────────────────────────────────────────────────────
    const normalizedFilter = normalizeStatisticsFilterObject((query as any).filter ?? {});

    const releaseDateRange = normalizedFilter.releaseDate ?? null;
    const startDate = releaseDateRange?.startDate ?? (query as any).startDate ?? null;
    const endDate = releaseDateRange?.endDate ?? (query as any).endDate ?? null;
    const signerId = normalizedFilter.signerId ?? (query as any).signerId ?? null;
    const documentType = normalizedFilter.documentType ?? (query as any).documentType ?? null;

    // ── 3. WHERE ───────────────────────────────────────────────────────────────
    const SIGNER_TYPES = ['reportSigner', 'report_signer'];
    const where: string[] = [];
    where.push('odu.is_signed = 1');
    where.push(`odu.signer_type IN (${SIGNER_TYPES.map((_, i) => `@st${i}`).join(',')})`);

    const pool = await this.getMsPool();
    const requestBase = pool.request();
    SIGNER_TYPES.forEach((t, i) =>
      requestBase.input(`st${i}`, sql.NVarChar(50), t),
    );

    if (startDate && endDate) {
      where.push('od.release_date >= @startDate AND od.release_date < DATEADD(DAY, 1, @endDate)');
      requestBase.input('startDate', sql.DateTime, new Date(startDate));
      requestBase.input('endDate', sql.DateTime, new Date(endDate));
    } else if (startDate) {
      where.push('od.release_date >= @startDate');
      requestBase.input('startDate', sql.DateTime, new Date(startDate));
    } else if (endDate) {
      where.push('od.release_date < DATEADD(DAY, 1, @endDate)');
      requestBase.input('endDate', sql.DateTime, new Date(endDate));
    }

    // signerId: hỗ trợ string | string[]
    const signerIdArr: string[] = signerId
      ? (Array.isArray(signerId) ? signerId : [signerId]).filter(Boolean)
      : [];
    if (signerIdArr.length === 1) {
      where.push('odu.user_id = @signerId0');
      requestBase.input('signerId0', sql.NVarChar(100), signerIdArr[0]);
    } else if (signerIdArr.length > 1) {
      const siParams = signerIdArr.map((_, i) => `@signerId${i}`).join(', ');
      where.push(`odu.user_id IN (${siParams})`);
      signerIdArr.forEach((v, i) => requestBase.input(`signerId${i}`, sql.NVarChar(100), v));
    }

    // documentType: hỗ trợ string | string[]
    const documentTypeArr: string[] = documentType
      ? (Array.isArray(documentType) ? documentType : [documentType]).filter(Boolean)
      : [];
    if (documentTypeArr.length === 1) {
      where.push('od.document_type = @documentType0');
      requestBase.input('documentType0', sql.NVarChar(255), documentTypeArr[0]);
    } else if (documentTypeArr.length > 1) {
      const dtParams = documentTypeArr.map((_, i) => `@documentType${i}`).join(', ');
      where.push(`od.document_type IN (${dtParams})`);
      documentTypeArr.forEach((v, i) => requestBase.input(`documentType${i}`, sql.NVarChar(255), v));
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    // ── 4. COUNT ───────────────────────────────────────────────────────────────
    const totalSql = `
      SELECT COUNT(DISTINCT odu.user_id) AS total
      FROM   ${this.dbname}.dbo.outgoing_document_users odu
      INNER JOIN ${this.dbname}.dbo.outgoing_documents  od
        ON od.document_id = odu.document_id
      ${whereClause}
    `;

    const totalResult = await requestBase.query(totalSql);
    const total = totalResult.recordset?.[0]?.total ?? 0;

    if (query.countOnly === 'true') return { total };
    if (!total) return { data: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 };

    // ── 5. SORT ────────────────────────────────────────────────────────────────
    // Fully-qualified expressions → use buildSortClause (not parseStatisticsSort)
    const sortFieldMap: Record<string, string> = {
      signer: 'u.name',
      role: 'u.position',
      total: 'a.tongVBKy',
      officialLetter: 'a.congVan',
      decision: 'a.quyetDinh',
      announcement: 'a.thongBao',
      report: 'a.baoCao',
      other: '(a.tongVBKy - a.congVan - a.quyetDinh - a.thongBao - a.baoCao)',
      // Vietnamese backward-compat aliases
      nguoiKy: 'u.name',
      chucVu: 'u.position',
      tongVBKy: 'a.tongVBKy',
      congVan: 'a.congVan',
      quyetDinh: 'a.quyetDinh',
      thongBao: 'a.thongBao',
      baoCao: 'a.baoCao',
      khac: '(a.tongVBKy - a.congVan - a.quyetDinh - a.thongBao - a.baoCao)',
    };
    const orderBy = this.buildSortClause(
      (query as any).sort,
      sortFieldMap,
      'a.tongVBKy DESC',
    );

    // ── 6. DATA ────────────────────────────────────────────────────────────────
    const rowsSql = `
      WITH base AS (
        SELECT
          odu.user_id       AS signerId,
          od.document_type  AS documentType,
          odu.document_id   AS documentId
        FROM   ${this.dbname}.dbo.outgoing_document_users odu
        INNER JOIN ${this.dbname}.dbo.outgoing_documents  od
          ON od.document_id = odu.document_id
        ${whereClause}
      ),
      agg AS (
        SELECT
          b.signerId,
          COUNT(DISTINCT b.documentId)                                       AS tongVBKy,
          SUM(CASE WHEN b.documentType = 'CongvanDen'   THEN 1 ELSE 0 END)  AS congVan,
          SUM(CASE WHEN b.documentType = 'QuyetdinhDen' THEN 1 ELSE 0 END)  AS quyetDinh,
          SUM(CASE WHEN b.documentType = 'ThongbaoDen'  THEN 1 ELSE 0 END)  AS thongBao,
          SUM(CASE WHEN b.documentType = 'BaocaoDen'    THEN 1 ELSE 0 END)  AS baoCao
        FROM base b
        GROUP BY b.signerId
      )
      SELECT
        a.signerId,
        COALESCE(u.name, u.username, a.signerId)                             AS nguoiKy,
        COALESCE(u.position, '')                                             AS chucVu,
        a.tongVBKy,
        a.congVan,
        a.quyetDinh,
        a.thongBao,
        a.baoCao,
        (a.tongVBKy - a.congVan - a.quyetDinh - a.thongBao - a.baoCao)     AS khac
      FROM agg a
      LEFT JOIN ${this.dbname}.dbo.users u ON u.id = a.signerId
      ORDER BY ${orderBy}
      OFFSET ${offsetNum} ROWS FETCH NEXT ${limitNum} ROWS ONLY
    `;

    const rowsResult = await requestBase.query(rowsSql);

    // ── 7. MAP ─────────────────────────────────────────────────────────────────
    const data = (rowsResult.recordset ?? []).map((r: any, idx: number) => ({
      stt: offsetNum + idx + 1,
      signer: r.nguoiKy ?? '',
      role: r.chucVu ?? '',
      total: Number(r.tongVBKy ?? 0),
      officialLetter: Number(r.congVan ?? 0),
      decision: Number(r.quyetDinh ?? 0),
      announcement: Number(r.thongBao ?? 0),
      report: Number(r.baoCao ?? 0),
      other: Number(r.khac ?? 0),
    }));

    return {
      data,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }


  async getInteroperabilityStatus(query: any) {
    /** ===================== 1. VALIDATION ===================== */
    const {
      page = '1', limit = '20',
      filter = {}, isExport, countOnly, sort,
    } = query;

    const pageNum = Number(page);
    let limitNum = Number(limit);

    if (!Number.isInteger(pageNum) || pageNum <= 0)
      throw new BadRequestException('page phải là số nguyên dương');
    if (!Number.isInteger(limitNum) || limitNum <= 0)
      throw new BadRequestException('limit phải là số nguyên dương');
    if (isExport === 'true') limitNum = 9999;

    const parseDate = (v: any, name: string): Date | undefined => {
      if (!v) return undefined;
      const d = new Date(v);
      if (isNaN(d.getTime())) throw new BadRequestException(`${name} không hợp lệ`);
      return d;
    };

    const releaseDateRange = filter?.releaseDate ?? {};
    const documentType = filter?.documentType ?? null;
    const senderUnit = filter?.senderUnit ?? null;
    const receiverUnit = filter?.receiverUnit ?? null;

    const startDate = parseDate(releaseDateRange.startDate, 'releaseDate.startDate');
    const endDate = parseDate(releaseDateRange.endDate, 'releaseDate.endDate');

    if (startDate && endDate && startDate > endDate)
      throw new BadRequestException('releaseDate.startDate phải <= releaseDate.endDate');

    /** ===================== 2. WHERE ===================== */
    const where: string[] = [];
    where.push(`od.status <> 3`);
    where.push(`
      EXISTS (
        SELECT 1
        FROM ${this.dbname}.dbo.audit a
        WHERE a.document_id = od.document_id
          AND a.stage_status = @stageStatusPublished
      )
    `);

    const pool = await this.getMsPool();
    const request = pool.request();
    request.input('stageStatusPublished', stageStatusDoc.DA_BAN_HANH);

    if (startDate) {
      where.push(`od.release_date >= @startDate`);
      request.input('startDate', sql.DateTime, startDate);
    }
    if (endDate) {
      where.push(`od.release_date < DATEADD(DAY, 1, @endDate)`);
      request.input('endDate', sql.DateTime, endDate);
    }
    if (documentType) {
      where.push(`od.document_type = @documentType`);
      request.input('documentType', sql.NVarChar(255), documentType);
    }
    if (senderUnit) {
      where.push(`od.sender_unit = @senderUnit`);
      request.input('senderUnit', sql.NVarChar(100), senderUnit);
    }
    if (receiverUnit) {
      where.push(` idoc.receiver_unit = @receiverUnit `);
      request.input('receiverUnit', sql.NVarChar(100), receiverUnit);
    }

    const whereClause = `WHERE ${where.join(' AND ')}`;
    const offset = (pageNum - 1) * limitNum;

    /** ===================== 3. SORT ===================== */
    const sortFieldMap: Record<string, string> = {
      releaseNo: 'od.release_no',
      releaseDate: 'od.release_date',
      abstractNote: 'od.abstract_note',
      receiverUnit: 'ou.name',
      receiveDate: 'idoc.document_date',
      receiver: 'la.latest_receiver_name',
      // ✅ computed CASE expression — SQL có thể ORDER BY được
      interoperabilityStatus: `CASE
        WHEN od.release_date IS NULL       THEN N'Chờ gửi'
        WHEN idoc.document_id IS NOT NULL  THEN N'Đã tiếp nhận'
        ELSE N'Đã gửi'
      END`,
    };
    const orderBy = this.buildSortClause(
      sort,
      sortFieldMap,
      'od.release_date DESC, od.document_id DESC',
    );
    /** ===================== 4. FROM ===================== */
    const baseFrom = `
      FROM ${this.dbname}.dbo.outgoing_documents od
      CROSS APPLY (
        SELECT value AS unit_id FROM OPENJSON(COALESCE(od.internal_receiving_dept, '[]'))
        UNION ALL
        SELECT od.external_receiving_unit WHERE od.external_receiving_unit IS NOT NULL
      ) r
      LEFT JOIN ${this.dbname}.dbo.organization_units ou  ON ou.id  = r.unit_id
      LEFT JOIN ${this.dbname}.dbo.users u                ON u.id   = od.report_signer
      LEFT JOIN ${this.dbname}.dbo.incomming_documents idoc
        ON idoc.copy_to_internal = od.document_id
        AND idoc.receiver_unit   = r.unit_id
      OUTER APPLY (
        SELECT TOP 1 usr.name AS latest_receiver_name
        FROM ${this.dbname}.dbo.audit a_latest
        JOIN ${this.dbname}.dbo.users usr ON usr.id = a_latest.receiver
        WHERE a_latest.document_id = od.document_id
        ORDER BY a_latest.created_at DESC
      ) la
    `;

    /** ===================== 5. COUNT ===================== */
    try {
      const totalQuery = `SELECT COUNT(1) AS total ${baseFrom} ${whereClause}`;
      const totalRes = await request.query(totalQuery);
      const total = totalRes.recordset[0]?.total ?? 0;

      if (countOnly === 'true') return { total };

      /** ===================== 6. DATA ===================== */
      const dataQuery = `
      SELECT
        od.document_id,
        od.release_no                               AS release_no,
        od.release_date                             AS release_date,
        od.abstract_note                            AS abstract_note,
        ou.name                                     AS receiver_unit_name,
        u.name                                      AS report_signer_name,
        idoc.document_date                          AS incoming_receive_date,
        idoc.document_id                            AS incoming_doc_id,
        la.latest_receiver_name                     AS latest_receiver_name,
        -- ✅ tính sẵn để ORDER BY dùng được
        CASE
          WHEN od.release_date IS NULL       THEN N'Chờ gửi'
          WHEN idoc.document_id IS NOT NULL  THEN N'Đã tiếp nhận'
          ELSE N'Đã gửi'
        END                                         AS interop_status
      ${baseFrom}
      ${whereClause}
      ORDER BY ${orderBy}
      OFFSET ${offset} ROWS FETCH NEXT ${limitNum} ROWS ONLY
    `;

      const dataRes = await request.query(dataQuery);

      /** ===================== 7. MAP ===================== */
      const items = dataRes.recordset.map((r) => ({
        id: r.document_id,
        releaseNo: r.release_no,
        releaseDate: normalizeDateValueDDMMYYYY(r.release_date),
        abstractNote: r.abstract_note,
        receiverUnit: r.receiver_unit_name ?? '',
        interoperabilityStatus: r.interop_status,
        receiveDate: r.incoming_receive_date
          ? normalizeDateValueDDMMYYYY(r.incoming_receive_date)
          : '',
        receiver: r.latest_receiver_name ?? '',
      }));

      return {
        data: items,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException('Lỗi truy vấn trạng thái liên thông văn bản đi');
    }
  }
}
