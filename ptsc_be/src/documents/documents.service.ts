import {
  forwardRef,
  Inject,
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ListDocumentsDto, ListDocumentsNoTypeDto, ListMeetingExportDto } from './dto/list-documents.dto';
import { MSSQL_REPO } from 'src/database/database.provider';
import * as ExcelJS from 'exceljs';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AuthorityDocumentEntity } from 'src/authority-documents';
import axios from 'axios';
import * as sql from 'mssql';
import { getMssqlPool } from 'src/database/mssql.pool';
import { ConfigService } from '@nestjs/config';
import * as os from 'os';
import * as FormData from 'form-data';
import * as fs from 'fs';
import { UserEntity } from 'src/users/entities/user.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { STATUS } from '../variables/CONST_STATUS';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { SqlRepoCountService } from 'src/database/sqlRepoCount.mssql';
import { MenuManagerEntity } from 'src/menu-manager/entities/menu-manager.entity';
import { TableConfigEntity } from 'src/table-config/table-config.entity';
import { normalizeDateValueDDMMYYYY, normalizeDateValueHHmmDDMMYYYY } from './helpers/build.filter';
import { OutgoingDocumentsService } from 'src/outgoing-documents/outgoing-documents.service';
import { IncomingService } from './incomming-document/incoming.service';
import { PassportIncomingDelegationService } from 'src/passport-requests/passport-incoming-delegation.service';
import { UsersService } from 'src/users/users.service';
import { TaskService } from 'src/task/task.service';
import { ListTaskDto } from 'src/task/dto/list-task.dto';
import { NewsService } from 'src/news/news.service';
import { NewsWorkflowService } from 'src/news/news-workflow.service';
import { AmenitiesService } from 'src/meeting-room-amenities/amenities.service';
import { MeetingRoomService } from 'src/meeting-rooms/meeting-rooms.service';
import { MeetingService } from 'src/meeting/meeting.service';
import { MeetingScheduleService } from 'src/meeting-schedule/meeting-schedule.service';
import { TopicService } from 'src/topic/topic.service';
import { AlbumImagesService } from 'src/album-images/album-images.service';
import { VideosService } from 'src/videos/videos.service';
import { LeadershipDutyScheduleService } from 'src/leadership-duty-schedule/leadership-duty-schedule.service';
import { TravelWorkSchedulesService } from 'src/travel-work-schedules/travel-work-schedules.service';
import { ProjectService } from 'src/project/project.service';
import { ProcessTemplateService } from 'src/process-template/process-template.service';
import { AuthorityProcessService } from 'src/authority-process/authority-process.service';
import { DestroyRecordsService } from 'src/destroy-record/destroy-records.service';
import { RecordExploitationService } from '../record-exploitation/record-exploitation.service';
import { ArchiveRecordService } from 'src/archive-records/archive-record.service';
import { PassportsService } from 'src/passports/passports.service';
import { FeedbackSuggestionsService } from 'src/feedback-suggestions/feedback-suggestions.service';
import { PassportRequestsService } from 'src/passport-requests/passport-requests.service';
import { ListCarsService } from 'src/list-cars/list-cars.service';
import { ListDriversService } from 'src/list-drivers/list-drivers.service';
import { DocumentsPdfBuilder, PdfColumnDef } from './helpers/documents-pdf.builder';
import { VehicleRegistrationService } from 'src/vehicle-registration/vehicle-registration.service';
import { NotificationService } from 'src/notifycation/notification.service';
import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import { BookDocumentsService } from 'src/book-documents/book-documents.service';
import { WorkItemsService } from 'src/work-items/work-items.service';
import Redis from 'ioredis';

type ColumnType = 'string' | 'date';
type ColumnConfig = { [key: string]: ColumnType };
type CountHandler = (args: any) => Promise<{ total: number } | number>;
type ListHandler =
  | { typeHandle: 'dto'; method: string }
  | { typeHandle: 'object'; method: string }
  | { typeHandle: 'dtoTask'; method: string }
  | { typeHandle: 'dtoMeeting'; method: string }
  | { typeHandle: 'legacy'; method: string }
  | { typeHandle: 'book-documents'; method: string }
  | { typeHandle: 'dtoWithReq'; method: string };

type CountResultItem = { count: number; apiUrl?: string; apiUrlChildren?: string };
type ServiceTotal = { incomingTotalCount: number; outgoingTotalCount: number; taskTotalCount: number };
type CountCacheEntry = { data: ServiceTotal; timestamp: number };
type CountAllCacheEntry = { data: Record<string, CountResultItem>; timestamp: number };

type ParsedApiUrl = {
  service: string | null;
  action: 'list' | 'search';
  apiKey: string | null;
  query: Record<string, string>;
};

type RequestDtos = {
  dto: ListDocumentsDto;
  dtoMeeting: ListMeetingExportDto;
  dtoTask: ListTaskDto;
};

// 1. Regexes
const HTML_TAG_REGEX = /<[^>]+>/g;
const CAMEL_DELIMITER_RE = /[_-]+([a-zA-Z0-9])/g;
const HAS_DELIMITER_RE = /[_-]/;
type CellResolver = (item: Record<string, any>, rowIndex: number) => any;
const ENABLE_DOCUMENT_DETAIL_PERF_LOGS = false;

// 2. Types
interface CompiledColumn {
  key: string;
  resolver: CellResolver;
}
interface WidthAccumulator {
  key: string;
  maxLen: number;
  isAuto: boolean;
  fixedPx?: number;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private pool: sql.ConnectionPool | null = null;

  private readonly DEFAULT_PROCESS_FN_MAPPINGS: Record<string, string> = {
    topicList: 'topic/list',
    dsChuDe: 'topic/list',
    albumList: 'album-images/list',
    dshinhanh: 'album-images/list',
    videoList: 'videos/list',
    dsvideott: 'videos/list',
    dshochieu: 'passports/list',
    dsDangLuuTruHoChieu: 'passports/list',
    dsHoChieuDangSuDung: 'passports/list',
    requestPassport: 'passport-requests/list',
    requestPassportReturn: 'passport-return-requests/list',
    dsPhieuTraHoChieu: 'passport-return-requests/list',
    dstdth: 'news/my-list/recalled-by-user',
    dstth: 'news/my-list/recalled',
    dsXe: 'list-car/list',
    dsTaiXe: 'list-driver/list',
    incomingDelegations: 'passport-incoming-delegations/list',
    dsDoanVao: 'passport-incoming-delegations/list',
  };

  // ─── Cache fields ────────────────────────────────────────────────────────
  private readonly CACHE_TTL = 60_000;
  private readonly DETAIL_CACHE_TTL = 3 * 60 * 1000;
  private countCache = new Map<string, { data: Record<string, number>; timestamp: number }>();
  private countCacheTotal = new Map<string, CountCacheEntry>();
  private countAllCacheTotal = new Map<string, CountAllCacheEntry>();
  private readonly detailCacheLookupInflight = new Map<string, Promise<any | null>>();
  private readonly detailSharedInflight = new Map<string, Promise<any>>();
  private readonly detailLookupInflight = new Map<string, Promise<any>>();
  private readonly latestAuditInflight = new Map<string, Promise<string | number | null>>();
  private readonly detailPermissionCache = new Map<string, { data: boolean; expires: number }>();
  private readonly detailAuditCache = new Map<string, { data: any[]; expires: number }>();
  private readonly detailUserCache = new Map<string, { data: any; expires: number }>();
  private readonly detailAliasesCache = new Map<string, { data: any; expires: number }>();
  private readonly detailDocCache = new Map<string, { data: any; expires: number }>();
  private readonly detailUserRoleCache = new Map<string, { data: any; expires: number }>();
  private readonly detailCompletionCache = new Map<string, { data: boolean; expires: number }>();
  private readonly detailDeadlineCache = new Map<string, { data: string | null; expires: number }>();
  private readonly detailMappedDocCache = new Map<string, { data: any; expires: number }>();
  private readonly detailViewerAssignmentsCache = new Map<string, { data: any[]; expires: number }>();
  private readonly detailAdditionalProcessingCache = new Map<string, { data: boolean; expires: number }>();

  constructor(
    private readonly incomingService: IncomingService,
    private readonly outgoingService: OutgoingDocumentsService,
    private readonly usersService: UsersService,
    private readonly taskService: TaskService,
    private readonly meetingRoomService: MeetingRoomService,
    private readonly amenitiesService: AmenitiesService,
    private readonly meetingService: MeetingService,
    private readonly meetingScheduleService: MeetingScheduleService,
    private readonly newsService: NewsService,
    private readonly newsWorkflowService: NewsWorkflowService,
    private readonly topicService: TopicService,
    private readonly albumImagesService: AlbumImagesService,
    private readonly videosService: VideosService,
    private readonly leadershipDutyScheduleService: LeadershipDutyScheduleService,
    private readonly travelWorkScheduleService: TravelWorkSchedulesService,
    private readonly projectService: ProjectService,
    private readonly passportsService: PassportsService,
    private readonly processTemplateService: ProcessTemplateService,
    private readonly authorityProcessService: AuthorityProcessService,
    private readonly destroyRecordsService: DestroyRecordsService,
    private readonly recordExploitationService: RecordExploitationService,
    @Inject(forwardRef(() => ArchiveRecordService))
    private readonly archiveRecordService: ArchiveRecordService,
    @Inject(forwardRef(() => FeedbackSuggestionsService))
    private readonly feedbackSuggestionsService: FeedbackSuggestionsService,
    @Inject(forwardRef(() => PassportRequestsService))
    private readonly passportRequestsService: PassportRequestsService,
    @Inject(forwardRef(() => PassportIncomingDelegationService))
    private readonly passportIncomingDelegationService: PassportIncomingDelegationService,
    @Inject(forwardRef(() => ListCarsService))
    private readonly listCarsService: ListCarsService,
    @Inject(forwardRef(() => ListDriversService))
    private readonly listDriversService: ListDriversService,
    @Inject(forwardRef(() => VehicleRegistrationService))
    private readonly vehicleRegistrationService: VehicleRegistrationService,
    @Inject('BPMN_RUNTIME') private readonly runtime: any,
    private readonly configService: ConfigService,
    @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
    private readonly featureManagementRepo: Repository<FeatureManagementEntity>,
    @InjectRepository(TableConfigEntity, 'mssqlConnection')
    private readonly tableConfigRepo: Repository<TableConfigEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoleFeatureEntity, 'mssqlConnection')
    private readonly roleFeatureRepository: Repository<RoleFeatureEntity>,
    @InjectRepository(MenuManagerEntity, 'mssqlConnection')
    private readonly menuRepo: Repository<MenuManagerEntity>,
    @InjectRepository(AuthorityDocumentEntity, 'mssqlConnection')
    private readonly authorityDocumentRepo: Repository<AuthorityDocumentEntity>,
    @Inject(MSSQL_REPO)
    private readonly documentsSqlService: MSSQLRepository,
    private readonly countService: SqlRepoCountService,
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
    private readonly sqlsvRepo: SQLSVRepository,
    @Inject(forwardRef(() => BookDocumentsService))
    private readonly bookDocumentsService: BookDocumentsService,
    @Inject(forwardRef(() => WorkItemsService))
    private readonly workItemsService: WorkItemsService,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
  ) { }

  private buildRevisionCacheKey(baseKey: string, latestAuditId?: string | number | null): string {
    return `${baseKey}:audit:${latestAuditId ?? 'null'}`;
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

    const redisKey = `documents_map:${key}`;
    const inflight = this.detailCacheLookupInflight.get(redisKey);
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

    this.detailCacheLookupInflight.set(redisKey, pending);
    try {
      return await pending;
    } finally {
      this.detailCacheLookupInflight.delete(redisKey);
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
      await this.redisClient?.set(`documents_map:${key}`, JSON.stringify(data), 'PX', ttlMs);
    } catch { }
  }

  private async runWithSharedInflight<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const existing = this.detailSharedInflight.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    const pending = factory().finally(() => {
      this.detailSharedInflight.delete(key);
    });
    this.detailSharedInflight.set(key, pending);
    return pending;
  }

  private async runWithDetailInflight<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const existing = this.detailLookupInflight.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    const pending = factory().finally(() => {
      this.detailLookupInflight.delete(key);
    });
    this.detailLookupInflight.set(key, pending);
    return pending;
  }

  private async getDocumentScopedCacheWithAuditCheck<T>(
    cache: Map<string, { data: T; expires: number }>,
    cacheKey: string,
    ttlMs: number,
    documentId: string,
    latestAuditId: string | number | null,
    loader: () => Promise<T>,
  ): Promise<T> {
    const revisionKey = this.buildRevisionCacheKey(cacheKey, latestAuditId);
    return this.runWithSharedInflight(`documents:${revisionKey}`, async () => {
      const cached = await this.getSharedCache<T>(cache, revisionKey, ttlMs);
      if (cached !== null) {
        return cached;
      }

      const data = await loader();
      await this.setSharedCache(cache, revisionKey, data, ttlMs);
      return data;
    });
  }

  private async getLatestAuditIdInflight(documentId: string): Promise<string | number | null> {
    const normalizedId = String(documentId || '').trim();
    if (!normalizedId) return null;

    const existing = this.latestAuditInflight.get(normalizedId);
    if (existing) {
      return existing;
    }

    const pending = (async () => {
      const pool = await this.getPool();
      const result = await pool.request()
        .input('documentId', sql.NVarChar(100), normalizedId)
        .query(`
          SELECT 
            (SELECT TOP 1 a.id FROM dbo.audit a WITH (NOLOCK) WHERE a.document_id = @documentId ORDER BY a.time DESC, a.created_at DESC, a.id DESC) AS latestAuditId,
            (SELECT TOP 1 CONVERT(VARCHAR(30), a.updated_at, 126) FROM dbo.audit a WITH (NOLOCK) WHERE a.document_id = @documentId ORDER BY a.updated_at DESC) AS maxAuditUpdatedAt,
            (SELECT COUNT(*) FROM work_items wi WITH (NOLOCK) WHERE wi.document_id = @documentId AND wi.state = 'open') AS openWorkItemCount,
            (SELECT TOP 1 wi.id FROM work_items wi WITH (NOLOCK) WHERE wi.document_id = @documentId ORDER BY wi.created_at DESC, wi.id DESC) AS latestWorkItemId,
            (SELECT TOP 1 d.status_code FROM incomming_documents d WITH (NOLOCK) WHERE d.document_id = @documentId) AS statusCode,
            (SELECT TOP 1 CONVERT(VARCHAR(30), d.updated_at, 126) FROM incomming_documents d WITH (NOLOCK) WHERE d.document_id = @documentId) AS docUpdatedAt
        `);
      const row = result.recordset?.[0];
      if (!row) return null;
      const latestAuditId = row.latestAuditId ?? 'null';
      const maxAuditUpdatedAt = row.maxAuditUpdatedAt ?? 'null';
      const openWorkItemCount = row.openWorkItemCount ?? 0;
      const latestWorkItemId = row.latestWorkItemId ?? 'null';
      const statusCode = row.statusCode ?? 'null';
      const docUpdatedAt = row.docUpdatedAt ?? 'null';

      return `${latestAuditId}_au:${maxAuditUpdatedAt}_wi:${openWorkItemCount}_${latestWorkItemId}_sc:${statusCode}_du:${docUpdatedAt}`;
    })().finally(() => {
      this.latestAuditInflight.delete(normalizedId);
    });

    this.latestAuditInflight.set(normalizedId, pending);
    return pending;
  }

  private async assertCanViewDetailCached(userId: string, documentId: string, latestAuditId: string | number | null): Promise<boolean> {
    const normalizedUserId = String(userId || '').trim();
    const normalizedDocumentId = String(documentId || '').trim();
    const cacheKey = `incoming:permission:${normalizedUserId}:${normalizedDocumentId}`;
    return this.getDocumentScopedCacheWithAuditCheck(
      this.detailPermissionCache,
      cacheKey,
      this.DETAIL_CACHE_TTL,
      normalizedDocumentId,
      latestAuditId,
      async () => {
        await this.runtime.repo.assertCanViewDetail(normalizedUserId, normalizedDocumentId, 'IncommingDocument');
        return true;
      },
    );
  }

  private async getIncomingAuditCached(documentId: string, latestAuditId: string | number | null): Promise<any[]> {
    const normalizedDocumentId = String(documentId || '').trim();
    const cacheKey = `incoming:audit:${normalizedDocumentId}`;
    return this.getDocumentScopedCacheWithAuditCheck(
      this.detailAuditCache,
      cacheKey,
      this.DETAIL_CACHE_TTL,
      normalizedDocumentId,
      latestAuditId,
      () => this.runtime.repo.getAuditLite(normalizedDocumentId),
    );
  }

  private async getIncomingDocCached(documentId: string, latestAuditId: string | number | null): Promise<any> {
    const normalizedDocumentId = String(documentId || '').trim();
    const cacheKey = `incoming:doc:${normalizedDocumentId}`;
    return this.getDocumentScopedCacheWithAuditCheck(
      this.detailDocCache,
      cacheKey,
      this.DETAIL_CACHE_TTL,
      normalizedDocumentId,
      latestAuditId,
      () => this.runtime.ensureDoc(normalizedDocumentId),
    );
  }

  private async getIncomingUserCached(userId: string): Promise<any> {
    const normalizedUserId = String(userId || '').trim();
    const cacheKey = `incoming:user:${normalizedUserId}`;
    return this.runWithSharedInflight(`documents:${cacheKey}`, async () => {
      const cached = await this.getSharedCache<any>(this.detailUserCache, cacheKey, this.DETAIL_CACHE_TTL);
      if (cached !== null) return cached;
      const user = await this.sqlsvRepo.getUserById(normalizedUserId);
      await this.setSharedCache(this.detailUserCache, cacheKey, user, this.DETAIL_CACHE_TTL);
      return user;
    });
  }

  private async getIncomingAliasesCached(): Promise<any> {
    const cacheKey = 'incoming:aliases';
    return this.runWithSharedInflight(`documents:${cacheKey}`, async () => {
      const cached = await this.getSharedCache<any>(this.detailAliasesCache, cacheKey, this.DETAIL_CACHE_TTL);
      if (cached !== null) return cached;
      const aliases = await this.runtime.repo.buildSelectFieldsNew('Incomming', 'incomming_documents');
      await this.setSharedCache(this.detailAliasesCache, cacheKey, aliases, this.DETAIL_CACHE_TTL);
      return aliases;
    });
  }

  private async getIncomingUserRoleCached(userId: string, bpmnVersion: string): Promise<any> {
    const cacheKey = `incoming:user-role:${String(userId || '').trim()}:${String(bpmnVersion || '').trim()}`;
    return this.runWithSharedInflight(`documents:${cacheKey}`, async () => {
      const cached = await this.getSharedCache<any>(this.detailUserRoleCache, cacheKey, this.DETAIL_CACHE_TTL);
      if (cached !== null) return cached;
      const role = await this.runtime.repo.getUserRole(userId, bpmnVersion);
      await this.setSharedCache(this.detailUserRoleCache, cacheKey, role, this.DETAIL_CACHE_TTL);
      return role;
    });
  }

  private async getIncomingCompletedCached(documentId: string, latestAuditId: string | number | null): Promise<boolean> {
    const normalizedDocumentId = String(documentId || '').trim();
    const cacheKey = `incoming:completed:${normalizedDocumentId}`;
    return this.getDocumentScopedCacheWithAuditCheck(
      this.detailCompletionCache,
      cacheKey,
      this.DETAIL_CACHE_TTL,
      normalizedDocumentId,
      latestAuditId,
      () => this.runtime.repo.isIncomingDocumentCompleted(normalizedDocumentId),
    );
  }

  private async getIncomingDeadlineCached(documentId: string, userId: string, latestAuditId: string | number | null): Promise<Date | null> {
    const normalizedDocumentId = String(documentId || '').trim();
    const normalizedUserId = String(userId || '').trim();
    const cacheKey = `incoming:deadline:${normalizedDocumentId}:${normalizedUserId}`;
    const isoDeadline = await this.getDocumentScopedCacheWithAuditCheck(
      this.detailDeadlineCache,
      cacheKey,
      this.DETAIL_CACHE_TTL,
      normalizedDocumentId,
      latestAuditId,
      async () => {
        const deadline = await this.runtime.repo.getAssignmentDeadline(normalizedDocumentId, normalizedUserId);
        return deadline ? deadline.toISOString() : null;
      },
    );
    return isoDeadline ? new Date(isoDeadline) : null;
  }

  private async getIncomingMappedDocCached(
    documentId: string,
    latestAuditId: string | number | null,
    doc: any,
    aliases: Record<string, string>,
    isAuthority?: string,
  ): Promise<any> {
    const normalizedDocumentId = String(documentId || '').trim();
    const cacheKey = `incoming:mapped-doc:${normalizedDocumentId}:${String(isAuthority || '').trim()}`;
    return this.getDocumentScopedCacheWithAuditCheck(
      this.detailMappedDocCache,
      cacheKey,
      this.DETAIL_CACHE_TTL,
      normalizedDocumentId,
      latestAuditId,
      async () => {
        const mapped = await this.runtime.repo.mapDocKeysForDetailV1(
          [doc],
          aliases,
          isAuthority,
          { skipFiles: true },
        );
        return Array.isArray(mapped) ? mapped[0] : mapped;
      },
    );
  }

  private async getIncomingViewerAssignmentsCached(
    documentId: string,
    userId: string,
    latestAuditId: string | number | null,
  ): Promise<any[]> {
    const normalizedDocumentId = String(documentId || '').trim();
    const normalizedUserId = String(userId || '').trim();
    const cacheKey = `incoming:viewer-assignments:${normalizedDocumentId}:${normalizedUserId}`;
    return this.getDocumentScopedCacheWithAuditCheck(
      this.detailViewerAssignmentsCache,
      cacheKey,
      this.DETAIL_CACHE_TTL,
      normalizedDocumentId,
      latestAuditId,
      async () => {
        const pool = await this.getPool();
        const result = await pool.request()
          .input('docId', normalizedDocumentId)
          .input('uId', normalizedUserId)
          .query(`
            SELECT role_process, stage_status
            FROM dbo.incomming_assignment
            WHERE document_id = @docId AND receiver = @uId
          `);
        return result.recordset || [];
      },
    );
  }

  private async getIncomingAdditionalProcessingCached(
    documentId: string,
    userId: string,
    latestAuditId: string | number | null,
    audit: any[],
  ): Promise<boolean> {
    const normalizedDocumentId = String(documentId || '').trim();
    const normalizedUserId = String(userId || '').trim();
    const cacheKey = `incoming:additional-processing:${normalizedDocumentId}:${normalizedUserId}`;
    return this.getDocumentScopedCacheWithAuditCheck(
      this.detailAdditionalProcessingCache,
      cacheKey,
      this.DETAIL_CACHE_TTL,
      normalizedDocumentId,
      latestAuditId,
      () => this.runtime.repo.canAdditionalProcessingDocument(audit, normalizedUserId),
    );
  }

  private buildIncomingDetailInflightKey(
    documentId: string,
    userId: string,
    roles: string[],
    isAuthority?: string,
    latestAuditId?: number | null,
  ): string {
    const normalizedRoles = [...new Set((roles || []).filter(Boolean))].sort().join(',');
    return [
      'incoming:detail',
      String(documentId || '').trim(),
      String(userId || '').trim(),
      normalizedRoles,
      String(isAuthority || '').trim(),
      latestAuditId == null ? 'null' : String(latestAuditId),
    ].join('::');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1 — REFACTORED PUBLIC METHODS
  // ══════════════════════════════════════════════════════════════════════════

  // ─── 1.1  assign-book ────────────────────────────────────────────────────

  async assignBookToDocuments(
    documentIds: string | string[],
    bookDocumentId: string,
    userId?: string,
  ): Promise<{ statusCode: number; message: string }> {
    const start = Date.now();
    const normalizedDocumentIds = Array.isArray(documentIds)
      ? documentIds.filter(Boolean)
      : documentIds
        ? [documentIds]
        : [];

    try {
      await this.runtime.repo.assignBookToDocuments(documentIds, bookDocumentId);

      if (userId && normalizedDocumentIds.length > 0) {
        await this.sendAssignBookNotifications(normalizedDocumentIds, bookDocumentId, userId);
      } else {
        this.logger.warn(
          `[assign-book][notify] skipped reason=${!userId ? 'missing_actor' : 'empty_docs'} bookId=${bookDocumentId}`,
        );
      }

      return { statusCode: HttpStatus.OK, message: 'Gán sổ cho văn bản thành công.' };
    } catch (error) {
      throw this.mapAssignBookError(error);
    }
  }

  private mapAssignBookError(error: unknown): HttpException {
    if (!(error instanceof Error)) {
      return new HttpException('Không thể gán sổ cho văn bản. Vui lòng thử lại.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    if (error.message === 'INVALID_INPUT') {
      return new HttpException('Dữ liệu nhận được không hợp lệ.', HttpStatus.BAD_REQUEST);
    }
    if (error.message === 'BOOK_NOT_FOUND') {
      return new HttpException('Không tìm thấy sổ văn bản.', HttpStatus.NOT_FOUND);
    }
    if (error.message.startsWith('PARTIAL_ASSIGN')) {
      const [, , skippedCount] = error.message.split(':');
      const msg = skippedCount === '1'
        ? 'Không thể gán sổ vì đã tồn tại văn bản được gán sổ.'
        : `Không thể gán sổ vì có ${skippedCount} văn bản đã được gán sổ.`;
      return new HttpException(msg, HttpStatus.CONFLICT);
    }
    return new HttpException('Không thể gán sổ cho văn bản. Vui lòng thử lại.', HttpStatus.INTERNAL_SERVER_ERROR);
  }

  // ─── 1.1b  Helper: lấy thông tin văn bản cho log ─────────────────────────
  async getDocumentInfoForLog(documentIds: string[]): Promise<string> {
    if (!documentIds?.length) return '';
    try {
      const pool = await this.getPool();
      const request = pool.request();
      documentIds.forEach((id, i) => request.input(`id${i}`, id));
      const placeholders = documentIds.map((_, i) => `@id${i}`).join(',');

      const result = await request.query(`
        SELECT document_id, to_book_code, abstract_note, 'den' AS source FROM incomming_documents WHERE document_id IN (${placeholders})
        UNION ALL
        SELECT document_id, COALESCE(text_symbols, to_book_text_symbols) AS to_book_code, abstract_note, 'di' AS source FROM outgoing_documents WHERE document_id IN (${placeholders})
      `);

      const rows = result.recordset || [];
      if (!rows.length) return documentIds.join(', ');

      return rows.map((r: any) => {
        const id = r.document_id || '';
        const note = r.abstract_note ? r.abstract_note.substring(0, 50) : '';
        if (r.source === 'di') {
          const code = r.to_book_code || 'Chưa có số';
          return `Số ký hiệu: ${code}, Trích yếu: ${note}, ID: ${id}`;
        } else {
          const code = r.to_book_code || 'Chưa có số';
          return `Số VB: ${code}, Trích yếu: ${note}, ID: ${id}`;
        }
      }).join('; ');
    } catch (err) {
      this.logger.error('Lỗi getDocumentInfoForLog', err);
      return documentIds.join(', ');
    }
  }

  private async getDocumentDetails(
    documentIds: string[],
  ): Promise<Map<string, { source: 'incoming' | 'outgoing'; toBookCode: string; abstractNote: string }>> {
    if (!documentIds?.length) return new Map();

    const pool = await this.getPool();
    const request = pool.request();
    documentIds.forEach((id, i) => request.input(`id${i}`, id));
    const placeholders = documentIds.map((_, i) => `@id${i}`).join(',');

    const result = await request.query(`
      SELECT document_id, to_book_code, abstract_note, 'incoming' AS source
      FROM incomming_documents
      WHERE document_id IN (${placeholders})
      UNION ALL
      SELECT document_id, COALESCE(text_symbols, to_book_text_symbols) AS to_book_code, abstract_note,
             'outgoing' AS source
      FROM outgoing_documents
      WHERE document_id IN (${placeholders})
    `);

    const rows = result.recordset || [];
    const map = new Map<string, { source: 'incoming' | 'outgoing'; toBookCode: string; abstractNote: string }>();
    for (const row of rows) {
      const documentId = String(row.document_id || '');
      if (!documentId) continue;
      const source = row.source === 'outgoing' ? 'outgoing' : 'incoming';
      map.set(documentId, {
        source,
        toBookCode: row.to_book_code || '',
        abstractNote: row.abstract_note || '',
      });
    }
    return map;
  }

  private async getCreatorsAssignedToUnitForBookSave(
    documentIds: string[],
    actorUnitId: string,
  ): Promise<Map<string, string[]>> {
    if (!documentIds?.length || !actorUnitId) return new Map();

    const pool = await this.getPool();
    const request = pool.request();
    request.input('actorUnitId', actorUnitId);
    documentIds.forEach((id, i) => request.input(`id${i}`, id));
    const placeholders = documentIds.map((_, i) => `@id${i}`).join(',');

    const result = await request.query(`
      WITH document_creators AS (
        SELECT
          creator_candidates.document_id,
          creator_candidates.creator_id
        FROM (
          SELECT
            a.document_id,
            LTRIM(RTRIM(COALESCE(a.created_by, a.user_id))) AS creator_id,
            ROW_NUMBER() OVER (
              PARTITION BY a.document_id
              ORDER BY
                CASE WHEN a.action_code = 'CREATE' THEN 0 ELSE 1 END,
                a.id ASC
            ) AS rn
          FROM audit a
          WHERE a.document_id IN (${placeholders})
            AND (a.type_document = 'IncommingDocument' OR a.type_document = 'OutGoingDocument')
            AND COALESCE(a.created_by, a.user_id) IS NOT NULL
            AND LTRIM(RTRIM(COALESCE(a.created_by, a.user_id))) <> ''
        ) creator_candidates
        WHERE creator_candidates.rn = 1
      ),
      matched_assignments AS (
        SELECT
          c.document_id,
          c.creator_id,
          ROW_NUMBER() OVER (
            PARTITION BY c.document_id
            ORDER BY a.id DESC
          ) AS rn
        FROM document_creators c
        INNER JOIN audit a
          ON a.document_id = c.document_id
         AND LTRIM(RTRIM(a.created_by)) = c.creator_id
         AND LTRIM(RTRIM(COALESCE(a.receiver_unit, ''))) = @actorUnitId
         AND (a.receiver IS NULL OR LTRIM(RTRIM(COALESCE(a.receiver, ''))) = '')
      )
      SELECT document_id, creator_id
      FROM matched_assignments
      WHERE rn = 1
    `);

    const map = new Map<string, string[]>();
    const rows = result.recordset || [];
    for (const row of rows) {
      const docId = String(row.document_id || '');
      const creatorId = String(row.creator_id || '').trim();
      if (!docId || !creatorId) continue;
      map.set(docId, [creatorId]);
    }
    return map;
  }

  private async getBookCode(bookDocumentId: string): Promise<string> {
    try {
      const pool = await this.getPool();
      const request = pool.request();
      request.input('bookId', bookDocumentId);
      const result = await request.query(`
        SELECT to_book_code FROM book_documents WHERE book_document_id = @bookId
      `);
      const row = result.recordset[0];
      return row?.to_book_code || bookDocumentId;
    } catch (err) {
      this.logger.error(`[assign-book] Failed to get book code for ${bookDocumentId}`, err);
      return bookDocumentId;
    }
  }

  private async sendAssignBookNotifications(
    documentIds: string[],
    bookDocumentId: string,
    actorId: string,
  ) {
    try {

      const bookCode = await this.getBookCode(bookDocumentId);
      const docDetailsMap = await this.getDocumentDetails(documentIds);
      const actor = await this.sqlsvRepo.getUserById(actorId).catch(() => null);
      const actorName = actor?.name || actor?.username || (actor as any)?.fullName || 'Hệ thống';

      // Lấy organization unit của actor
      let actorUnitId: string | null = null;
      if (actor?.parent?.id) {
        actorUnitId = actor.parent.id;
      } else {
        // Fallback: query trực tiếp lấy parent từ users table
        try {
          const pool = await this.getPool();
          const req = pool.request();
          req.input('userId', actorId);
          const res = await req.query('SELECT parent FROM users WHERE id = @userId');
          actorUnitId = res.recordset[0]?.parent || null;
        } catch (e) {
          this.logger.warn(`[assign-book] Failed to fetch actor unit for ${actorId}`, e);
        }
      }

      const creatorMap = await this.getCreatorsAssignedToUnitForBookSave(documentIds, actorUnitId || '');


      // Log chi tiết creator cho từng document
      for (const [docId, creatorIds] of creatorMap.entries()) {
        const creatorDetails = await Promise.all(
          creatorIds.map(async (creatorId) => {
            const user = await this.sqlsvRepo.getUserById(creatorId).catch(() => null);
            const name = user?.name || user?.username || (user as any)?.fullName || creatorId;
            return `${creatorId}:${name}`;
          })
        );
        const docDetail = docDetailsMap.get(docId);
        const toBookCode = docDetail?.toBookCode || 'N/A';
      }

      const notificationPromises: Promise<any>[] = [];
      let skippedNoDetails = 0;
      let skippedNoCreator = 0;
      let skippedInvalidRecipient = 0;
      // let skippedSelfRecipient = 0;  // XÓA
      let queuedRecipients = 0;
      let queuedBatches = 0;

      for (const docId of documentIds) {
        const details = docDetailsMap.get(docId);
        if (!details) {
          skippedNoDetails++;
          this.logger.warn(`[assign-book][notify][skip] reason=no_details docId=${docId}`);
          continue;
        }

        const recipientIds = creatorMap.get(docId) || [];
        if (!recipientIds.length) {
          skippedNoCreator++;
          this.logger.warn(`[assign-book][notify][skip] reason=no_creator_match_unit docId=${docId} actorId=${actorId} actorUnitId=${actorUnitId || 'none'}`);
          continue;
        }

        const { source, toBookCode, abstractNote } = details;

        const docLink = source === 'outgoing'
          ? `/outgoing-documents/${docId}`
          : `/incomming-documents/${docId}`;
        const title = `Văn bản ${toBookCode || docId} bạn tạo đã được ${actorName} lưu sổ ${bookCode}.`;

        const validRecipientIds = [...new Set(
          recipientIds.map((id) => String(id || '').trim()),
        )].filter((recipientId) => {
          if (!recipientId) {
            skippedInvalidRecipient++;
            this.logger.warn(`[assign-book][notify][skip] reason=invalid_recipient docId=${docId}`);
            return false;
          }
          // XÓA ĐOẠN KIỂM TRA self
          return true;
        });

        if (!validRecipientIds.length) {
          continue;
        }


        queuedRecipients += validRecipientIds.length;
        queuedBatches++;
        notificationPromises.push(
          this.notificationService.createBookAssignedForRecipients({
            recipientIds: validRecipientIds,
            senderId: actorId,
            title: `${title}: “${abstractNote}”`,
            content: `Văn bản ${toBookCode || docId} đã được ${actorName} lưu sổ ${bookCode}.`,
            recordId: docId,
            link: docLink,
            time: new Date(),
            status: 1,
          }).catch((err) => {
            this.logger.error(`❌ Notification failed for assign-book, docId=${docId}`, err);
          }),
        );
      }

      await Promise.all(notificationPromises);
    } catch (err) {
      this.logger.error('[assign-book] Failed to send notifications', err);
    }
  }

  // ─── 1.2  star-change ────────────────────────────────────────────────────

  async starChange(
    documentIds: string[],
    starObj: Record<string, string[]>,
    isStar: boolean,
    userId: string,
  ): Promise<{ statusCode: number; message: string }> {
    const start = Date.now();
    try {
      await this.runtime.repo.starChange(documentIds, starObj, isStar, userId);
      return { statusCode: 200, message: 'Cập nhật sao thành công.' };
    } catch (err) {
      this.logger.error('[starChange] ERROR', err);
      throw new Error('Cập nhật đánh dấu sao thất bại');
    }
  }

  async getAuthorIdIfAuthorized(userId: string): Promise<string | null> {
    return this.runtime.repo.getAuthorIdIfAuthorized(userId);
  }

  async getUserOrgId(userId: string): Promise<string | null> {
    try {
      const userInfo = await this.sqlsvRepo.getUserById(userId);
      return userInfo?.parent?.id || null;
    } catch (e) {
      this.logger.error(`Error getting user org id for user ${userId}`, e);
      return null;
    }
  }

  // ─── 1.3  export-body ────────────────────────────────────────────────────

  async exportBody(
    documentId: string,
    userId: string,
    typeDocument: string,
  ): Promise<Record<string, any>> {
    const start = Date.now();

    if (!documentId || !userId) {
      throw new BadRequestException('Thiếu documentId hoặc userId');
    }

    // Fetch document + files in one step
    const doc = await this.fetchDocumentWithFiles(documentId, typeDocument);

    // Status code must be set before mapping so the mapper can use it
    doc.statusCode = await this.runtime.repo.getStatusCode(documentId);

    const aliases = this.getExportAliases(typeDocument);
    const result = await this.runtime.repo.mapSingleDocumentWithAliases(doc, aliases);

    const comments = await this.enrichCommentsForExport(documentId, doc.bpmnVersion);
    const finalResult = await this.finalizeExportResult(doc, result, comments, userId);

    return this.toSnakeCase(finalResult);
  }

  private async fetchDocumentWithFiles(documentId: string, typeDocument: string): Promise<any> {
    const isOutgoing = typeDocument === 'OutGoingDocument';

    const doc = isOutgoing
      ? await this.runtime.repo.getOutgoingDocument(documentId)
      : await this.runtime.repo.getDocument(documentId);

    if (!doc) throw new NotFoundException('Không tìm thấy văn bản');

    const filesMap = isOutgoing
      ? await this.runtime.repo.getFilesByOutgoingDocumentIds([documentId])
      : await this.runtime.repo.getFilesByDocumentIds([documentId]);

    const rawFiles = filesMap[doc.documentId] ?? [];
    const uniqueFilesMap = new Map();
    for (const f of rawFiles) {
      const fileId = f.fileId || f.id;
      if (fileId && !uniqueFilesMap.has(fileId)) {
        uniqueFilesMap.set(fileId, f);
      }
    }
    doc.files = uniqueFilesMap.size > 0 ? Array.from(uniqueFilesMap.values()) : rawFiles;
    return doc;
  }

  private getExportAliases(typeDocument: string): Record<string, string> {
    return typeDocument === 'OutGoingDocument'
      ? this.getOutgoingExportAliases()
      : this.getIncomingExportAliases();
  }

  private getOutgoingExportAliases(): Record<string, string> {
    return {
      statusCode: 'statusCode', abstractNote: 'abstractNote', senderUnit: 'senderUnit',
      drafter: 'drafter', documentType: 'documentType', documentField: 'documentField',
      reportSigner: 'reportSigner', releaseDate: 'releaseDate', files: 'files',
      toBookTextSymbols: 'toBookTextSymbols', signType: 'signType', bookDocumentId: 'bookDocumentId',
      toBook: 'toBook', privateLevel: 'privateLevel', reportDocumentSymbol: 'reportDocumentSymbol',
      viewers: 'viewers', deadlineReply: 'deadlineReply', recipientIds: 'recipientIds',
      internalReceivingUnit: 'internalReceivingUnit', replyIncommingDoc: 'replyIncommingDoc',
      draftSigner: 'draftSigner', status: 'status', codeCommanders: 'codeCommanders',
      commanders: 'commanders', currentNote: 'currentNote', releaseNo: 'releaseNo',
      textSymbols: 'textSymbols', docWorkFiles: 'docWorkFiles', docProposal: 'docProposal',
      docDraft: 'docDraft', docAttachments: 'docAttachments', docRecall: 'docRecall',
      docReplacement: 'docReplacement', docAnswer: 'docAnswer',
      externalReceivingUnit: 'externalReceivingUnit', internalReceivingDept: 'internalReceivingDept',
      processor: 'processor', createdAt: 'createdAt', updatedAt: 'updatedAt',
      knowReceivers: 'knowReceivers',
    };
  }

  private getIncomingExportAliases(): Record<string, string> {
    return {
      statusCode: 'statusCode', abstractNote: 'abstractNote', toBook: 'toBook',
      bookDocumentId: 'bookDocumentId', documentDate: 'documentDate', senderUnit: 'senderUnit',
      toBookCode: 'toBookCode', receiveMethod: 'receiveMethod', receiverUnit: 'receiverUnit',
      receiveDate: 'receiveDate', toBookDate: 'toBookDate', deadline: 'deadline',
      secondBook: 'secondBook', privateLevel: 'privateLevel', urgencyLevel: 'urgencyLevel',
      documentType: 'documentType', documentField: 'documentField', signer: 'signer',
      createdAt: 'createdAt', updatedAt: 'updatedAt', resolutionDeadline: 'resolutionDeadline',
      copyCount: 'copyCount', pageCount: 'pageCount', parentDoc: 'parentDoc',
      viewGroup: 'viewGroup', copyToInternal: 'copyToInternal',
    };
  }

  private async enrichCommentsForExport(documentId: string, bpmnVersion?: string): Promise<any[]> {
    const rawComments = await this.runtime.repo.findAllCommentsFlat(documentId);
    const comments: any[] = Array.isArray(rawComments) ? rawComments : [];
    if (!comments.length) return [];

    const uniqueUserIds = [...new Set(comments.map(c => c.userId).filter(Boolean))] as string[];
    const rolesMap = await this.buildUserRolesMap(uniqueUserIds, bpmnVersion);
    return comments.map((c, i) => this.formatExportComment(c, i, rolesMap));
  }

  private async buildUserRolesMap(userIds: string[], bpmnVersion?: string): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    await Promise.all(
      userIds.map(async uid => {
        const roles = await this.runtime.repo.getUserRoleWithName(uid, bpmnVersion);
        const text = roles?.userRoles?.length ? roles.userRoles.map((r: any) => r.name).join(', ') : '';
        map.set(uid, text);
      }),
    );
    return map;
  }

  private formatExportComment(comment: any, index: number, rolesMap: Map<string, string>): any {
    // const roleText = comment.userId ? rolesMap.get(comment.userId) ?? '' : '';
    const userName = comment.name ?? '';
    // const name = roleText ? `Ý kiến của ${userName} - ${roleText}` : `Ý kiến của ${userName}`;
    const name = `Ý kiến của ${userName}`;
    const content = comment.content
      ? comment.content.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
      : '';
    return { index: index + 1, name, content };
  }

  private async finalizeExportResult(
    doc: any,
    result: any,
    comments: any[],
    userId: string,
  ): Promise<any> {
    // "Đã phát hành" → keep existing drafter, else use creation date
    result.drafter = result.statusCode === 'Đã phát hành'
      ? (result.drafter ?? '')
      : (doc.createdAt ? normalizeDateValueDDMMYYYY(doc.createdAt) : '');

    result.signType = (doc.signType ?? true) ? 'Ký số' : 'Ký tay';
    result.comments = comments;

    // Export timestamp in UTC+7
    const exportedAt = new Date(Date.now() + 7 * 60 * 60 * 1000);
    result.exportedAt = normalizeDateValueHHmmDDMMYYYY(exportedAt);
    result.exportedBy = await this.runtime.repo.getNameOfUser(userId);
    return result;
  }

  // ─── get-list-export-excel ──────────────────────────────────────────
  // 3. Standalone functions
  toCamelCaseStatic(str: string): string {
    if (!str || !HAS_DELIMITER_RE.test(str)) return str;
    return str.replace(CAMEL_DELIMITER_RE, (_, c) => c.toUpperCase());
  }

  formatDateToDDMMYYYYStatic(date: Date): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}/${date.getFullYear()}`;
  }

  cleanHtmlString(value: any): string {
    if (value == null) return '';
    let strValue = '';
    if (typeof value === 'object' && !(value instanceof Date)) {
      strValue = value.title ?? value.name ?? value.code ?? value.fileName ?? '';
    } else if (typeof value === 'string') {
      strValue = value;
    } else {
      strValue = String(value);
    }

    strValue = strValue.trim();
    if (!strValue.includes('<')) {
      return strValue;
    }

    const labelMatch = strValue.match(/<[a-zA-Z0-9]+\s+[^>]*class=["']unit-task-label["'][^>]*>([\s\S]*?)<\/[a-zA-Z0-9]+>/i);
    if (labelMatch) {
      strValue = labelMatch[1];
    } else {
      if (strValue.includes('unit-task-tooltip')) {
        strValue = strValue.replace(/<[a-zA-Z0-9]+\s+[^>]*class=["']unit-task-tooltip["'][^>]*>([\s\S]*?)<\/[a-zA-Z0-9]+>/gi, '');
      }
    }

    return strValue.replace(HTML_TAG_REGEX, '').trim();
  }

  formatDateValueStatic(value: any, format?: string): string {
    if (value === null || value === undefined || value === '') return '';

    if (value instanceof Date) {
      if (isNaN(value.getTime())) return '';

      const base = this.formatDateToDDMMYYYYStatic(value);

      if (format === 'DD/MM/YYYY HH:mm') {
        const hh = String(value.getHours()).padStart(2, '0');
        const mn = String(value.getMinutes()).padStart(2, '0');
        return `${base} ${hh}:${mn}`;
      }

      return base;
    }

    return this.cleanHtmlString(value);
  }

  formatArrayValueStatic(arr: any[]): string {
    return arr
      .map(v => {
        if (v == null) return '';
        return typeof v === 'object'
          ? (v.title ?? v.name ?? v.code ?? v.fileName ?? '')
          : v;
      })
      .filter(Boolean)
      .join(', ');
  }

  extractNestedValueStatic(item: any, key: string): any {
    return key.split('.').reduce((obj: any, k: string) => {
      if (obj == null || typeof obj !== 'object') return undefined;
      if (obj[k] !== undefined) return obj[k];
      const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      return obj[camel];
    }, item);
  }

  async getFileExportList(
    queryParams: Record<string, string>,
    userId: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const start = Date.now();
    const { processFn, exportType, ...cleanParams } = queryParams as any;

    if (!processFn) throw new Error('processFn is required');

    // Đảm bảo lấy toàn bộ dữ liệu từ trang đầu tiên khi xuất file
    const cleanParamsCopy = {
      ...cleanParams,
      page: '1',
      limit: '1000000',
    };

    // ⚡ Parallel: fetch column config + list data simultaneously
    const [{ columns, nameOfList }, listResult] = await Promise.all([
      this.getColumnsByProcessFn(processFn, userId),
      this.getListByProcessFn(cleanParamsCopy, userId, processFn),
    ]);

    const dataToExport = listResult?.data?.length ? listResult.data : [];

    if (!dataToExport.length) {
      throw new BadRequestException({
        message: 'Không có dữ liệu để xuất file',
        isWarning: true,
      });
    }

    const excelColumns = [{ header: 'STT', key: 'stt', width: 6 }, ...columns];

    const exported = await this.export(dataToExport, processFn, exportType === 'pdf' ? 'pdf' : 'excel', userId, { columns: excelColumns, nameOfList });

    return exported;
  }

  async export(
    data: any[],
    processFn: string,
    type: 'excel' | 'pdf',
    userId: string,
    prefetched?: { columns: any[]; nameOfList: string },
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const start = Date.now();

    const result = type === 'pdf'
      ? await this.exportPdf(data || [], processFn, userId, prefetched)
      : await this.exportExcel(data || [], processFn, userId, prefetched);

    return result;
  }

  async exportPdf(
    data: any[],
    processFn: string,
    userId: string,
    prefetched?: { columns: any[]; nameOfList: string },
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const start = Date.now();

    const { columns: excelColumns, nameOfList } = prefetched
      ?? await this.buildExcelColumns(processFn, userId);

    // ⚡ Pre-compile resolvers once, reuse for all rows
    const compiled = this.compileColumns(excelColumns);
    const { rows } = this.transformRows(data, compiled);


    const buffer = await DocumentsPdfBuilder.build({
      nameOfList,
      columns: excelColumns as PdfColumnDef[],
      rows,
      fontPath: this.configService.get<string>('PDF_FONT_PATH'),
    });


    return { buffer, filename: `${nameOfList}.pdf`, contentType: 'application/pdf' };
  }

  async exportExcel(
    data: any[],
    processFn: string,
    userId: string,
    prefetched?: { columns: any[]; nameOfList: string },
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const start = Date.now();

    const { columns: excelColumns, nameOfList } = prefetched
      ?? await this.buildExcelColumns(processFn, userId);

    // ⚡ Pre-compile resolvers + transform all rows in one pass
    const compiled = this.compileColumns(excelColumns);
    const { rows, widthAccumulators } = this.transformRows(data, compiled, excelColumns);


    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Danh sách');
    sheet.columns = excelColumns;

    const lastColumnLetter = sheet.getColumn(sheet.columnCount).letter;
    this.applyExcelTitleSection(sheet, nameOfList, lastColumnLetter);
    sheet.addRows(rows);

    // ⚡ Single-pass styling — replaces 4 separate eachRow loops
    const headerRowIndex = 3;
    this.applyAllExcelStyles(sheet, headerRowIndex, widthAccumulators ?? []);
    this.applyExcelPrintSetup(sheet, lastColumnLetter, headerRowIndex);

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    return {
      buffer,
      filename: `${nameOfList}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  async getListByProcessFn(
    queryParams: Record<string, string>,
    _userId: string,
    processFn?: string,
    options?: { countOnly?: string },
  ): Promise<any> {
    const start = Date.now();
    const { page = 1, limit = 9999, sort = '-createdAt' } = queryParams;
    const { countOnly = 'false' } = options ?? {};
    const empty = { data: [], total: 0, page, limit };

    if (!processFn) return empty;

    // 1. Resolve feature → API URL
    const parsedApi = await this.resolveFeatureApiUrl(processFn);
    if (!parsedApi?.service) return { data: [], total: 0, page: 1, limit: 20 };

    const { service, action, apiKey, query } = parsedApi;

    // 2. Resolve handler config
    const handler = this.resolveHandlerConfig(service, action, apiKey);
    if (!handler) return empty;

    // 3. Resolve userId (with authority delegation)
    const author = await this.runtime.repo.getAuthorIdIfAuthorized(_userId);
    const userId = author && query.authority === 'true' ? author : _userId;

    // 4. Normalise filters (avoid mutating caller's object)
    const rawParams = this.normalizeFilterParams(queryParams);
    const effectiveLimit = '9999';

    // 5. Build DTOs
    const dtos = this.buildRequestDtos(rawParams, userId, query, effectiveLimit, processFn, countOnly, page, sort);

    // 6. Get service instance
    const serviceInstance = this.getServiceInstance(service);
    if (!serviceInstance) return empty;

    // 7. Invoke and normalise
    const response = await this.invokeServiceMethod(serviceInstance, handler, dtos, userId, author, rawParams, sort, processFn);
    const normalized = this.normalizeListResponse(response, page, limit);

    return normalized;
  }

  private async resolveFeatureApiUrl(processFn: string): Promise<ParsedApiUrl | null> {
    try {
      const feature = await this.featureManagementRepo.findOne({ where: { code: processFn } });

      if (feature?.apiUrl) return this.parseApiUrl(feature.apiUrl);

      const fallback = this.DEFAULT_PROCESS_FN_MAPPINGS[processFn];
      if (fallback) return this.parseApiUrl(fallback);

      this.logger.warn(`[resolveFeatureApiUrl] No mapping for processFn: ${processFn}`);
      return null;
    } catch (e) {
      this.logger.warn('[resolveFeatureApiUrl] FeatureManagement lookup failed', e);
      return null;
    }
  }

  private async resolveFeatureApiUrlChildren(processFn: string): Promise<ParsedApiUrl | null> {
    try {
      const feature = await this.featureManagementRepo.findOne({ where: { code: processFn } });

      // Ư u tiên apiUrlChildren, fallback về apiUrl
      if (feature?.apiUrlChildren) return this.parseApiUrl(feature.apiUrlChildren);
      if (feature?.apiUrl) return this.parseApiUrl(feature.apiUrl);

      const fallback = this.DEFAULT_PROCESS_FN_MAPPINGS[processFn];
      if (fallback) return this.parseApiUrl(fallback);

      this.logger.warn(`[resolveFeatureApiUrlChildren] No mapping for processFn: ${processFn}`);
      return null;
    } catch (e) {
      this.logger.warn('[resolveFeatureApiUrlChildren] FeatureManagement lookup failed', e);
      return null;
    }
  }

  private resolveHandlerConfig(
    service: string,
    action: 'list' | 'search',
    apiKey: string | null,
  ): ListHandler | null {
    const handlers = this.getListHandlers();
    const serviceHandlers = handlers[service];
    if (!serviceHandlers) return null;

    const actionHandlers = serviceHandlers[action];
    if (!actionHandlers) return null;

    return (apiKey ? actionHandlers[apiKey] : null) ?? actionHandlers._default ?? null;
  }

  private normalizeFilterParams(queryParams: Record<string, string>): Record<string, any> {
    const params: Record<string, any> = { ...queryParams };
    if (params.userFilters && !params.filter) {
      params.filter = params.userFilters;
    }
    delete params.userFilters;
    return params;
  }

  private buildRequestDtos(
    rawParams: Record<string, any>,
    userId: string,
    query: Record<string, string>,
    effectiveLimit: string,
    processFn: string,
    countOnly: string,
    page: any,
    sort: any,
  ): RequestDtos {
    const pageStr = page?.toString() ?? '1';

    const dto: ListDocumentsDto = {
      userId,
      processFn,
      type: query.type || '',
      page: pageStr,
      limit: effectiveLimit,
      filter: rawParams.filter,
      isExport: 'true',
      countOnly,
    };

    const dtoMeeting: ListMeetingExportDto = {
      userId,
      processFn,
      type: query.type,
      workstate: query.workstate || '',
      page: pageStr,
      limit: effectiveLimit,
      filter: rawParams.filter,
      isExport: 'true',
      countOnly,
    };

    const dtoTask: ListTaskDto = {
      typeTask: rawParams.typeTask || query.typeTask,
      page: Number(page) || 1,
      limit: Number(effectiveLimit),
      filter: rawParams.filter,
      isExport: 'true',
      countOnly,
    };

    return { dto, dtoMeeting, dtoTask };
  }

  private getServiceInstance(service: string): any {
    const map: Record<string, any> = {
      'incoming': this.incomingService,
      'outgoing-documents': this.outgoingService,
      'tasks': this.taskService,
      'meeting-rooms': this.meetingRoomService,
      'amenities': this.amenitiesService,
      'meetings': this.meetingService,
      'meeting-schedule': this.meetingScheduleService,
      'travel-work-schedules': this.travelWorkScheduleService,
      'leadership-duty-schedules': this.leadershipDutyScheduleService,
      'project': this.projectService,
      'news': this.buildNewsServiceProxy(),
      'topic': this.topicService,
      'album-images': this.albumImagesService,
      'videos': this.videosService,
      'process-template': this.processTemplateService,
      'authority': this,
      'destroy-records': this.destroyRecordsService,
      'record-access': this.recordExploitationService,
      'archive-records': this.archiveRecordService,
      'passports': this.passportsService,
      'passport-requests': this.passportRequestsService,
      'passport-incoming-delegations': this.passportIncomingDelegationService,
      'feedback-suggestions': this.feedbackSuggestionsService,
      'list-car': this.listCarsService,
      'list-driver': this.listDriversService,
      'vehicle-registration': this.vehicleRegistrationService,
      'users': this.usersService,
      'book-documents': this.bookDocumentsService,
    };

    if (!map[service]) this.logger.warn(`[getServiceInstance] Service not found: ${service}`);
    return map[service] ?? null;
  }

  private buildNewsServiceProxy(): Record<string, Function> {
    return {
      getNewsDrafts: this.newsWorkflowService.getNewsDrafts.bind(this.newsWorkflowService),
      getNewsPendingApproval: this.newsWorkflowService.getNewsPendingApproval.bind(this.newsWorkflowService),
      getNewsPublished: this.newsWorkflowService.getNewsPublished.bind(this.newsWorkflowService),
      getNewsReturned: this.newsWorkflowService.getNewsReturned.bind(this.newsWorkflowService),
      getNewsCancelled: this.newsWorkflowService.getNewsCancelled.bind(this.newsWorkflowService),
      getNewsRecalled: this.newsWorkflowService.getNewsRecalled.bind(this.newsWorkflowService),
      getNewsWaitingMyApproval: this.newsWorkflowService.getNewsWaitingMyApproval.bind(this.newsWorkflowService),
      getAllPublishedNews: this.newsWorkflowService.getAllPublishedNews.bind(this.newsWorkflowService),
      getNewsRecalledByUser: this.newsWorkflowService.getNewsRecalledByUser.bind(this.newsWorkflowService),
      getLatestNews: this.newsService.getLatestNews.bind(this.newsService),
      getMostViewedNews: this.newsService.getMostViewedNews.bind(this.newsService),
      getFavoriteNews: this.newsService.getFavoriteNews.bind(this.newsService),
      findAll: this.newsService.findAll.bind(this.newsService),

    };
  }

  private async invokeServiceMethod(
    serviceInstance: any,
    handler: ListHandler,
    dtos: RequestDtos,
    userId: string,
    author: string | null,
    rawParams: Record<string, any>,
    sort: any,
    processFn: string,
  ): Promise<any> {
    const { method, typeHandle } = handler;
    const { dto, dtoMeeting, dtoTask } = dtos;

    const fn = serviceInstance[method];
    if (typeof fn !== 'function') {
      this.logger.warn(`[invokeServiceMethod] Method not found: ${method}`);
      return null;
    }

    try {
      switch (typeHandle) {
        case 'dto':
          return await fn.call(serviceInstance, dto, userId, author);

        case 'dtoMeeting':
          return await fn.call(serviceInstance, dtoMeeting, userId, author);

        case 'object':
          return await fn.call(serviceInstance, {
            page: dto.page,
            limit: dto.limit,
            userId,
            filter: rawParams.filter,
            sort,
            processFn,
            isExport: 'true',
            countOnly: dto.countOnly,
          }, userId);

        case 'legacy':
          return await fn.call(serviceInstance, userId, dto);

        case 'dtoWithReq':
          return await fn.call(serviceInstance, dto, null, userId);

        case 'dtoTask':
          return await fn.call(serviceInstance, dtoTask, userId);

        case 'book-documents': {
          const parsedApi = await this.resolveFeatureApiUrl(processFn);
          const defaultQuery = parsedApi?.query || {};
          const mergedQuery = {
            ...defaultQuery,
            ...rawParams,
            page: dto.page,
            limit: dto.limit,
            isExport: dto.isExport,
          };
          return await fn.call(serviceInstance, mergedQuery, userId);
        }

        default:
          this.logger.error(`[invokeServiceMethod] Unknown typeHandle for ${method}`);
          return null;
      }
    } catch (error: any) {
      this.logger.error(`[invokeServiceMethod] ${processFn} (${method}) failed: ${error?.message}`);
      return null;
    }
  }

  private normalizeListResponse(
    response: any,
    page: any,
    limit: any,
  ): { data: any[]; total: number; page: number; limit: number } {
    const items = response?.items ?? response?.data ?? [];
    const total = response?.total ?? response?.count ?? items.length ?? 0;
    return { data: items, total, page: Number(page), limit: Number(limit) };
  }

  async getColumnsByProcessFn(
    processFn: string,
    userId: string,
  ): Promise<{ columns: any[]; nameOfList: string }> {
    const start = Date.now();
    try {
      const [tableConfigColumn, featureManagementColumn] = await Promise.all([
        this.tableConfigRepo.findOne({
          where: { module: processFn, owner: userId },
        }),

        this.featureManagementRepo
          .createQueryBuilder('f')
          .addSelect(['f.valueField', 'f.fields'])
          .where('f.code = :code', { code: processFn })
          .getOne(),
      ]);

      if (!featureManagementColumn) {
        throw new BadRequestException(`Không tìm thấy cấu hình cột cho processFn Feature Management: (${processFn})`);
      }

      const nameOfList = this.resolveExportName(featureManagementColumn.name);
      const fields = this.resolveExportFields(tableConfigColumn, featureManagementColumn, processFn);
      const columns = this.buildExcelColumnDefs(fields, processFn);

      return { columns, nameOfList };
    } catch (error) {
      this.logger.error(`[getColumnsByProcessFn] processFn=${processFn}`, error);
      throw new BadRequestException(`Không thể lấy cấu hình cột cho processFn: ${processFn}`);
    }
  }

  private compileColumns(columns: any[]): CompiledColumn[] {
    return columns.map(col => {
      const key = col.key as string;

      if (key === 'stt') {
        return { key, resolver: (_, idx) => idx + 1 };
      }

      if (col.type === 'date') {
        return {
          key,
          resolver: (item: Record<string, any>) => {
            const v = this.extractNestedValueStatic(item, key);
            return v == null ? '' : this.formatDateValueStatic(v, col.format);
          },
        };
      }

      // Pre-evaluate header check — avoids String.includes in hot loop
      const headerIncludesNgayDang = (col.header ?? '').includes('ngày đăng');
      const isPublishedDate = key === 'publishedDate';

      return {
        key,
        resolver: (item: Record<string, any>) => {
          // Special authorityPeriod bypass
          if (item.authorityPeriod && (key === 'authorityPeriod' || key === 'authority_period')) {
            return item.authorityPeriod;
          }

          let value = this.extractNestedValueStatic(item, key);

          if (key === 'progress' || key === 'progressView' || key === 'progressVal' || key === 'progress_view') {
            return this.formatProgressExport(item, value);
          }

          if (value == null && headerIncludesNgayDang && item.createdAt) {
            const d = new Date(item.createdAt);
            return isNaN(d.getTime()) ? '' : this.formatDateToDDMMYYYYStatic(d);
          }

          if (value == null && isPublishedDate) {
            value = item.publishedDate ?? item.createdAt ?? null;
          }

          if (value == null) return '';
          if (Array.isArray(value)) return this.formatArrayValueStatic(value);
          return this.cleanHtmlString(value);
        },
      };
    });
  }

  private formatProgressExport(item: Record<string, any>, value: any): string {
    // Sử dụng item.progress thay vì value phòng trường hợp key là progressView nhưng cần hiển thị % của item.progress
    const p = item.progress !== undefined ? item.progress : value;
    let progressVal = 0;
    if (p !== null && p !== undefined) {
      const num = parseInt(String(p), 10);
      progressVal = isNaN(num) ? 0 : num;
    }

    const parseSafeDate = (dateVal: any) => {
      if (!dateVal) return null;
      const match = String(dateVal).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) {
        const [, d, m, y] = match;
        return new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T00:00:00`);
      }
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? null : d;
    };

    const end = parseSafeDate(item.endDate) || parseSafeDate(item.endDateNotHTML);
    let deadlineLabel = '';

    if (end) {
      const now = new Date();
      const isOverdue = end.getTime() < now.getTime();
      const t1 = isOverdue ? end : now;
      const t2 = isOverdue ? now : end;

      const diffMs = t2.getTime() - t1.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffMonths = (t2.getFullYear() - t1.getFullYear()) * 12 + (t2.getMonth() - t1.getMonth());
      let actualDiffMonths = diffMonths;
      if (t2.getDate() < t1.getDate()) {
        actualDiffMonths--;
      }
      if (actualDiffMonths < 0) actualDiffMonths = 0;
      const diffYears = Math.floor(actualDiffMonths / 12);

      const prefix = isOverdue ? "Quá hạn" : "Còn";

      if (diffHours < 24) {
        deadlineLabel = `${prefix} ${diffHours} giờ`;
      } else if (diffDays < 30) {
        deadlineLabel = `${prefix} ${diffDays} ngày`;
      } else if (actualDiffMonths < 12) {
        deadlineLabel = `${prefix} ${actualDiffMonths} tháng`;
      } else {
        const remMonths = actualDiffMonths % 12;
        const monthStr = remMonths > 0 ? ` ${remMonths} tháng` : "";
        deadlineLabel = `${prefix} ${diffYears} năm${monthStr}`;
      }
    } else if (item.progressView) {
      const text = String(item.progressView).replace(/<[^>]*>/g, "").trim();
      const parts = text.split("-");
      if (parts.length > 1) {
        deadlineLabel = parts[1].trim();
      } else {
        deadlineLabel = text;
      }
    } else {
      deadlineLabel = item.deadlineLabel || "";
    }

    if (deadlineLabel) {
      const endDateStr = item.endDate ? this.formatDateValueStatic(item.endDate, 'DD/MM/YYYY') : '';
      return `${progressVal}%\nKết thúc: ${endDateStr}( ${deadlineLabel})`;
    }
    return `${progressVal}%`;
  }

  private transformRows(
    data: any[],
    compiled: CompiledColumn[],
    columns?: any[],
  ): { rows: Record<string, any>[]; widthAccumulators: WidthAccumulator[] } {
    // Build width accumulators from header lengths
    const widthAccumulators: WidthAccumulator[] = (columns ?? []).map(col => ({
      key: col.key,
      maxLen: (col.header ?? '').length,
      isAuto: col.width === 1 && col.key !== 'abstractNote',
      fixedPx: col.key === 'abstractNote' && col.width === 1 ? 50 : col.width !== 1 ? col.width : undefined,
    }));

    const accMap = new Map<string, WidthAccumulator>(
      widthAccumulators.map(a => [a.key, a]),
    );

    if (!data.length) return { rows: [], widthAccumulators };

    // Build key-normalization map ONCE from first non-null row
    const sample = data.find(r => r && typeof r === 'object') ?? {};
    const keyMap = this.buildKeyNormalizationMap(sample);

    const tStart = Date.now();
    const rows: Record<string, any>[] = new Array(data.length);

    for (let i = 0; i < data.length; i++) {
      const raw = data[i];
      if (!raw || typeof raw !== 'object') { rows[i] = {}; continue; }

      // Normalize using pre-built map (O(k) per row, not O(k²))
      const item = this.applyKeyMap(raw, keyMap);

      if (item.status_code_name) item.status_code = item.status_code_name;

      const row: Record<string, any> = {};
      for (const { key, resolver } of compiled) {
        const val = resolver(item, i);
        row[key] = val;

        // Track widths in same pass — no separate eachCell scan needed
        const acc = accMap.get(key);
        if (acc?.isAuto && val != null) {
          const len = String(val).length;
          if (len > acc.maxLen) acc.maxLen = len;
        }
      }

      rows[i] = row;
    }

    return { rows, widthAccumulators };
  }

  private buildKeyNormalizationMap(sample: Record<string, any>): Map<string, string> {
    const map = new Map<string, string>();
    for (const key of Object.keys(sample)) {
      map.set(key, this.toCamelCaseStatic(key));
    }
    return map;
  }

  private applyKeyMap(
    raw: Record<string, any>,
    keyMap: Map<string, string>,
  ): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [rawKey, camelKey] of keyMap) {
      if (rawKey in raw && result[camelKey] === undefined) {
        result[camelKey] = raw[rawKey];
      }
    }
    // Pass through keys not in map (added mid-dataset)
    for (const key of Object.keys(raw)) {
      const camel = keyMap.get(key) ?? this.toCamelCaseStatic(key);
      if (result[camel] === undefined) result[camel] = raw[key];
    }
    return result;
  }

  private applyAllExcelStyles(
    sheet: ExcelJS.Worksheet,
    headerRowIndex: number,
    widthAccumulators: WidthAccumulator[],
  ): void {
    const MAX_WIDTH = 30;
    const MIN_WIDTH = 5;

    sheet.eachRow((row, rowNumber) => {
      const isHeader = rowNumber === headerRowIndex;
      const isData = rowNumber > headerRowIndex;

      // ── Font ─────────────────────────────────────────────────────────────
      row.font = {
        name: 'Times New Roman',
        size: isHeader ? 12 : 11,
        bold: isHeader,
      };

      // ── Row-level alignment ───────────────────────────────────────────────
      if (isHeader) {
        row.height = 28;
        row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
      }

      // ── Per-cell ─────────────────────────────────────────────────────────
      row.eachCell({ includeEmpty: true }, cell => {
        // Border
        cell.border = {
          top: { style: isHeader ? 'medium' : 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };

        // Header fill
        if (isHeader) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFEFEFEF' },
          };
        }

        // Data wrap
        if (isData) {
          cell.alignment = { ...cell.alignment, wrapText: true, vertical: 'top' };
        }
      });
    });

    // ── STT column center ────────────────────────────────────────────────────
    sheet.getColumn('stt').alignment = { horizontal: 'center', vertical: 'middle' };

    // ── Apply pre-computed widths (no eachCell scan needed) ──────────────────
    for (const acc of widthAccumulators) {
      const col = sheet.getColumn(acc.key);
      if (!col) continue;

      if (acc.fixedPx !== undefined) {
        col.width = acc.fixedPx; // fixed or abstractNote special case
      } else if (acc.isAuto) {
        col.width = Math.min(Math.max(acc.maxLen + 2, MIN_WIDTH), MAX_WIDTH);
      }
      // else: keep configured width from sheet.columns setup
    }
  }

  private async buildExcelColumns(
    processFn: string,
    userId: string,
  ): Promise<{ columns: any[]; nameOfList: string }> {
    const { columns, nameOfList } = await this.getColumnsByProcessFn(processFn, userId);
    return {
      columns: [{ header: 'STT', key: 'stt', width: 6 }, ...columns],
      nameOfList,
    };
  }

  private applyExcelTitleSection(
    sheet: ExcelJS.Worksheet,
    nameOfList: string,
    lastCol: string,
  ): void {
    sheet.insertRow(1, [`DANH SÁCH ${nameOfList.toUpperCase()}`]);
    sheet.mergeCells(`A1:${lastCol}1`);
    const title = sheet.getRow(1);
    title.font = { bold: true, size: 14, name: 'Times New Roman' };
    title.alignment = { horizontal: 'center', vertical: 'middle' };
    title.height = 34;

    sheet.insertRow(2, [`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`]);
    sheet.mergeCells(`A2:${lastCol}2`);
    const dateRow = sheet.getRow(2);
    dateRow.font = { italic: true, size: 11, name: 'Times New Roman' };
    dateRow.alignment = { horizontal: 'right', vertical: 'middle' };
    dateRow.height = 22;
  }

  private applyExcelPrintSetup(
    sheet: ExcelJS.Worksheet,
    lastCol: string,
    headerRowIndex: number,
  ): void {
    sheet.pageSetup = {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      printTitlesRow: `${headerRowIndex}:${headerRowIndex}`,
    };
    sheet.pageSetup.printArea = `A1:${lastCol}${sheet.rowCount}`;
    sheet.headerFooter.oddFooter = '&LNgày in: &D&RTrang &P / &N';
  }

  private toPdfFilename(xlsxFilename: string): string {
    return xlsxFilename.endsWith('.xlsx')
      ? xlsxFilename.replace(/\.xlsx$/, '.pdf')
      : `${xlsxFilename}.pdf`;
  }

  async convertExcelToPdf(
    excel: { buffer: Buffer; filename: string },
    options?: { applyWatermark?: boolean; watermarkText?: string; printedBy?: string },
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const ext = excel.filename.includes('.') ? excel.filename.split('.').pop() : 'xlsx';
    const tempPath = `${os.tmpdir()}/temp_v2_${Math.random().toString(36).slice(2, 9)}.${ext}`;

    // Không dùng ExcelJS nữa vì nó gây lỗi load với các file lạ/cũ.
    // Thay vào đó, ta truyền thẳng file gốc sang server Java (Aspose)
    // kèm tham số ?landscape=true để server Java tự làm phần pageSetup!
    fs.writeFileSync(tempPath, excel.buffer);

    const formData = new FormData();
    formData.append('file', fs.createReadStream(tempPath), excel.filename);

    let responseData: Buffer;
    try {
      const response = await axios.post(
        `${process.env.APP_CONVERT_URL}/file-to-pdf?landscape=true`,
        formData,
        {
          headers: formData.getHeaders(),
          responseType: 'arraybuffer',
          maxBodyLength: Infinity,
          timeout: 45000,
        },
      );
      responseData = Buffer.from(response.data);
    } catch (err: any) {
      let errorBody = '';
      if (err.response && err.response.data) {
        errorBody = Buffer.isBuffer(err.response.data)
          ? err.response.data.toString('utf8')
          : typeof err.response.data === 'object'
            ? JSON.stringify(err.response.data)
            : String(err.response.data);
      }
      this.logger.error(`[convertExcelToPdf] Failed: ${err.message}. responseStatus=${err.response?.status ?? 'no-response'} responseBodySize=${errorBody.length}`);
      throw new InternalServerErrorException(
        `[v2] Không thể chuyển đổi file sang PDF. Lỗi: ${err.message}. Chi tiết server: ${errorBody}`,
      );
    } finally {
      try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
    }

    const outputBuffer = options?.applyWatermark
      ? await this.addSimpleWatermarkToPdf(responseData, options)
      : responseData;

    return {
      buffer: outputBuffer,
      filename: this.toPdfFilename(excel.filename),
      contentType: 'application/pdf',
    };
  }

  private formatPrintTime(date: Date): string {
    const two = (n: number) => String(n).padStart(2, '0');
    return `${two(date.getDate())}/${two(date.getMonth() + 1)}/${date.getFullYear()} ${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`;
  }

  private async addSimpleWatermarkToPdf(
    pdfBuffer: Buffer,
    options?: { watermarkText?: string; printedBy?: string },
  ): Promise<Buffer> {
    if (!this.isPdfBuffer(pdfBuffer)) {
      const preview = pdfBuffer?.subarray?.(0, 80)?.toString('utf8') || '';
      this.logger.error(`[addSimpleWatermarkToPdf] Invalid PDF buffer. head="${preview}"`);
      throw new BadRequestException('Dữ liệu trả về không phải PDF hợp lệ nên không thể chèn watermark');
    }
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    const printedBy = (options?.printedBy || '').trim();
    const printAt = this.formatPrintTime(new Date());
    const line1 = (options?.watermarkText || '').trim() || `Nguoi in: ${printedBy || 'He thong'}`;
    const line2 = `Ngay in: ${printAt}`;

    for (const page of pdfDoc.getPages()) {
      const { width, height } = page.getSize();
      const centerX = width / 2;
      const centerY = height / 2;

      const line1W = font.widthOfTextAtSize(line1, 14);
      const line2W = font.widthOfTextAtSize(line2, 14);

      page.drawText(line1, {
        x: centerX - line1W / 2,
        y: centerY + 10,
        size: 14,
        font,
        color: rgb(0.55, 0.55, 0.55),
        opacity: 0.6,
      });

      page.drawText(line2, {
        x: centerX - line2W / 2,
        y: centerY - 10,
        size: 14,
        font,
        color: rgb(0.55, 0.55, 0.55),
        opacity: 0.6,
      });
    }

    return Buffer.from(await pdfDoc.save());
  }

  private isPdfBuffer(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 5) return false;
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  }

  private resolveExportName(featureName?: string): string {
    return (featureName?.trim() ?? '').replace(/\s+(GD|TP|CB|VT|VTC|VTP|C|XL)\s*$/i, '').trim();
  }

  private resolveExportFields(
    tableConfigColumn: any,
    featureManagementColumn: any,
    processFn: string,
  ): any[] {
    if (tableConfigColumn?.columns?.length) return tableConfigColumn.columns;

    const raw = featureManagementColumn.valueField;
    const parsed = typeof raw === 'string' ? this.safeParseJson(raw, processFn) : raw;
    const fields = parsed?.field ?? [];

    if (!fields.length) throw new Error(`Không có cấu hình cột cho processFn: ${processFn}`);
    return fields;
  }

  private safeParseJson(value: string, context: string): any {
    try {
      return JSON.parse(value);
    } catch {
      throw new BadRequestException(`Giá trị valueField không hợp lệ cho processFn: ${context}`);
    }
  }

  private buildExcelColumnDefs(fields: any[], processFn: string): any[] {
    const columns = fields
      .filter(f => f.isShow !== false)
      .map(f => ({
        key: f.key || f.name,
        header: f.label,
        type: f.type,
        valueInput: f.valueInput,
        format: f.format,
        width: f.width ? Math.max(5, Math.round(parseInt(f.width as any, 10) / 6)) : 1,
      }))
      // Deduplicate by key — keep first occurrence only
      .filter((col, idx, arr) => arr.findIndex(c => c.key === col.key) === idx);

    if (!columns.length) {
      throw new BadRequestException(`Tất cả cột đều bị ẩn, không thể export (${processFn})`);
    }
    return columns;
  }

  private toSnakeCase(obj: any): any {
    if (Array.isArray(obj)) return obj.map(item => this.toSnakeCase(item));
    if (obj && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [
          k.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`),
          this.toSnakeCase(v),
        ]),
      );
    }
    return obj;
  }

  private parseApiUrl(apiUrl?: string): ParsedApiUrl {
    if (!apiUrl) return { service: null, action: 'list', apiKey: null, query: {} };

    const [path, queryString] = apiUrl.split('?');
    const segments = path.split('/').filter(Boolean);
    const service = segments[0] ?? null;
    const second = segments[1];
    const third = segments[2];

    let action: 'list' | 'search' = 'list';
    let apiKey: string | null = null;

    if (second === 'search') {
      action = 'search';
    } else if (second === 'list') {
      action = 'list';
      apiKey = third ?? null;
    } else if (second === 'my-list') {
      action = 'list';
      apiKey = third ? `${second}/${third}` : null;
    } else {
      action = 'list';
      apiKey = second ?? null;
    }

    const query: Record<string, string> = {};
    if (queryString) {
      new URLSearchParams(queryString).forEach((v, k) => { query[k] = v; });
    }

    return { service, action, apiKey, query };
  }

  private getListHandlers(): Record<string, { list: Record<string, ListHandler>; search: Record<string, ListHandler> }> {
    return {
      'book-documents': {
        list: {
          _default: { typeHandle: 'book-documents', method: 'findAll' },
        },
        search: { _default: { typeHandle: 'book-documents', method: 'findAll' } },
      },
      'outgoing-documents': {
        list: {
          'pending-feedbacks': { typeHandle: 'legacy', method: 'getPendingFeedbacks' },
          'given-feedbacks': { typeHandle: 'legacy', method: 'getGivenFeedbacks' },
          'my-sent-feedbacks': { typeHandle: 'legacy', method: 'getMySentFeedbacks' },
          'my-complete-feedbacks': { typeHandle: 'legacy', method: 'getMyCompletedFeedbacks' },
          'my-receive-feedbacks': { typeHandle: 'legacy', method: 'getMyReceivedFeedbackRequests' },
          'list-evict': { typeHandle: 'legacy', method: 'listEvict' },
          'signer-process': { typeHandle: 'dto', method: 'listSignerProcessDynamic' },
          'process': { typeHandle: 'dto', method: 'listProcessDocumentsDynamic' },
          'promulgate': { typeHandle: 'dto', method: 'listPromulgateDocumentsDynamic' },
          'recipient-to-know': { typeHandle: 'dto', method: 'listViewDocumentsDynamic' },
          'report-outgoing-by-time': { typeHandle: 'dto', method: 'reportOutgoingByTime' },
          'statistics-by-signer': { typeHandle: 'dto', method: 'statisticsBySigner' },
          'statistic-process-sign': { typeHandle: 'dto', method: 'getStatisticReportOfSenderUnitService' },
          'interoperability-status': { typeHandle: 'dto', method: 'getInteroperabilityStatus' },
          _default: { typeHandle: 'dto', method: 'listDocumentsDynamic' },
        },
        search: { _default: { typeHandle: 'object', method: 'outgoingRecipients' } },
      },
      'incoming': {
        list: {
          'main-process': { typeHandle: 'dto', method: 'listDocumentsMainProcessDynamic' },
          'receive': { typeHandle: 'dto', method: 'listDocumentsReceiveDynamic' },
          'for-task': { typeHandle: 'dto', method: 'listDocumentsForTask' },
          'implementation-coordination': { typeHandle: 'dto', method: 'listDocumentsImplementationDynamic' },
          'recipient-to-know': { typeHandle: 'dto', method: 'listDocumentsViewerDynamic' },
          'reply': { typeHandle: 'dto', method: 'listDocumentsReplyDynamic' },
          'overdue': { typeHandle: 'dto', method: 'listDocumentsDeadline' },
          'directive': { typeHandle: 'dto', method: 'listDocumentsDirective' },
          'statistic-report-sender-unit': { typeHandle: 'dto', method: 'getStatisticReportOfSenderUnit' },
          'statistic-report': { typeHandle: 'dto', method: 'getStatisticReport' },
          'statistics-by-time': { typeHandle: 'dto', method: 'statisticsByTime' },
          _default: { typeHandle: 'dto', method: 'listDocumentsDynamic' },
        },
        search: { _default: { typeHandle: 'object', method: 'incomingRecipients' } },
      },

      'meetings': {
        list: {
          'company': { typeHandle: 'dto', method: 'listMeetingCompany' },
          'prepare': { typeHandle: 'dto', method: 'listPrepareMeetingSchedule' },
          'approval': { typeHandle: 'dto', method: 'listApprovalSchedule' },
          'process': { typeHandle: 'dto', method: 'listProcessSchedule' },
          'unit': { typeHandle: 'dtoMeeting', method: 'listMeetingUnit' },
          'user': { typeHandle: 'dtoMeeting', method: 'listMeetingPerson' },
          'meeting-rooms-stats': { typeHandle: 'dto', method: 'listMeetingRoomsStats' },
          'meeting-in-meeting-rooms-stats': { typeHandle: 'dto', method: 'listMeetingInMeeetingRoomsStats' },
          'meeting-by-time': { typeHandle: 'dto', method: 'statisticMeetingsByTime' },
          'meeting-attendance-report': { typeHandle: 'dto', method: 'listMeetingAttendanceReport' },
          'conclusions-from-meeting': { typeHandle: 'dto', method: 'listConclusionsFromKMeeting' },
          'seat-assignment': { typeHandle: 'dto', method: 'seatAssignmentList' },
          _default: { typeHandle: 'dto', method: 'listMeetingPerson' },
        },
        search: { _default: { typeHandle: 'dtoMeeting', method: 'listMeetingPerson' } },
      },

      'meeting-schedule': {
        list: {
          'commanders': { typeHandle: 'dto', method: 'getCommandersByFlow' },
          'organization-units': { typeHandle: 'dto', method: 'getOrganizationUnitsByFlowV2' },
          'users': { typeHandle: 'dto', method: 'getUsersByFlow' },
          _default: { typeHandle: 'dto', method: 'getCommandersByFlow' },
        },
        search: { _default: { typeHandle: 'dto', method: 'getCommandersByFlow' } },
      },

      'amenities': {
        list: { _default: { typeHandle: 'dto', method: 'list' } },
        search: { _default: { typeHandle: 'dto', method: 'list' } },
      },

      'list-car': {
        list: { _default: { typeHandle: 'dtoWithReq', method: 'findAll' } },
        search: { _default: { typeHandle: 'dtoWithReq', method: 'findAll' } },
      },

      'list-driver': {
        list: { _default: { typeHandle: 'dtoWithReq', method: 'findAll' } },
        search: { _default: { typeHandle: 'dtoWithReq', method: 'findAll' } },
      },

      'meeting-rooms': {
        list: { _default: { typeHandle: 'dto', method: 'list' } },
        search: { _default: { typeHandle: 'dto', method: 'list' } },
      },

      'tasks': {
        list: {
          'form-doc': { typeHandle: 'dtoTask', method: 'findAllFormDoc' },
          'form-meeting': { typeHandle: 'dtoTask', method: 'findAllMeeting' },
          'recurring': { typeHandle: 'dtoTask', method: 'findAllRecurringConfigs' },
          _default: { typeHandle: 'dtoTask', method: 'findAll' },
        },
        search: { _default: { typeHandle: 'dto', method: 'findAll' } },
      },

      'news': {
        list: {
          'my-list/drafts': { typeHandle: 'dto', method: 'getNewsDrafts' },
          'my-list/pending': { typeHandle: 'dto', method: 'getNewsPendingApproval' },
          'my-list/published': { typeHandle: 'dto', method: 'getNewsPublished' },
          'my-list/returned': { typeHandle: 'dto', method: 'getNewsReturned' },
          'my-list/cancelled': { typeHandle: 'dto', method: 'getNewsCancelled' },
          'my-list/recalled': { typeHandle: 'dto', method: 'getNewsRecalled' },
          'my-list/recalled-by-user': { typeHandle: 'dto', method: 'getNewsRecalledByUser' },
          'my-list/waiting-approval': { typeHandle: 'dto', method: 'getNewsWaitingMyApproval' },
          'public-published': { typeHandle: 'dto', method: 'getAllPublishedNews' },
          'latest': { typeHandle: 'dto', method: 'getLatestNews' },
          'most-viewed': { typeHandle: 'dto', method: 'getMostViewedNews' },
          'favorites': { typeHandle: 'dto', method: 'getFavoriteNews' },
          _default: { typeHandle: 'dto', method: 'getNewsPublished' },
        },
        search: { _default: { typeHandle: 'dto', method: 'findAll' } },
      },

      'process-template': {
        list: { _default: { typeHandle: 'object', method: 'findAll' } },
        search: { _default: { typeHandle: 'object', method: 'findAll' } },
      },

      'project': {
        list: { _default: { typeHandle: 'object', method: 'findAll' } },
        search: { _default: { typeHandle: 'object', method: 'findAll' } },
      },

      'topic': {
        list: { _default: { typeHandle: 'legacy', method: 'findAll' } },
        search: { _default: { typeHandle: 'legacy', method: 'findAll' } },
      },

      'album-images': {
        list: { _default: { typeHandle: 'dto', method: 'findWithFilter' } },
        search: { _default: { typeHandle: 'dto', method: 'findWithFilter' } },
      },

      'videos': {
        list: { _default: { typeHandle: 'dto', method: 'findWithFilter' } },
        search: { _default: { typeHandle: 'dto', method: 'findWithFilter' } },
      },

      'leadership-duty-schedules': {
        list: { _default: { typeHandle: 'dto', method: 'list' } },
        search: { _default: { typeHandle: 'dto', method: 'list' } },
      },

      'travel-work-schedules': {
        list: { _default: { typeHandle: 'dto', method: 'list' } },
        search: { _default: { typeHandle: 'dto', method: 'list' } },
      },

      'authority': {
        list: { _default: { typeHandle: 'dto', method: 'listAuthorityDocuments' } },
        search: { _default: { typeHandle: 'dto', method: 'listAuthorityDocuments' } },
      },

      'destroy-records': {
        list: {
          'record-exploitation-requests': { typeHandle: 'dto', method: 'listRecordExploitationRequests' },
          'leader-destroy-records': { typeHandle: 'dto', method: 'listLeaderRecordExploitationRequests' },
          'comander-destroy-records': { typeHandle: 'dto', method: 'listComanderRecordExploitationRequests' },
          _default: { typeHandle: 'dto', method: 'findAll' },
        },
        search: { _default: { typeHandle: 'dto', method: 'findAll' } },
      },

      'record-access': {
        list: {
          'record-exploitation-requests': { typeHandle: 'dto', method: 'listRecordExploitationRequests' },
          'leader-record-exploitation': { typeHandle: 'dto', method: 'listLeaderRecordExploitationRequests' },
          'comander-record-exploitation': { typeHandle: 'dto', method: 'listComanderRecordExploitationRequests' },
          'processor-record-exploitation': { typeHandle: 'dto', method: 'listProcessRecordExploitationRequests' },
          _default: { typeHandle: 'dto', method: 'listRecordExploitationRequests' },
        },
        search: { _default: { typeHandle: 'dto', method: 'listRecordExploitationRequests' } },
      },

      'vehicle-registration': {
        list: {
          'list-registration': { typeHandle: 'dto', method: 'listVehiclesRegistration' },
          'list-assignment': { typeHandle: 'dto', method: 'listVehiclesRegistrationAssignment' },
          'list-driver-assignment': { typeHandle: 'dto', method: 'listVehiclesRegistrationDriver' },
          'statistics-vehicle-registration-requests': { typeHandle: 'dto', method: 'statisticsVehicleRegistrationRequests' },
          'vehicle-statistics-report': { typeHandle: 'dto', method: 'vehicleUsageStatisticsReport' },
          'vehicle-registration-statistics-department': { typeHandle: 'dto', method: 'vehicleRegistrationStatisticsByDepartment' },
          'vehicle-most-dispatched-report': { typeHandle: 'dto', method: 'vehicleMostDispatchedReport' },
          'vehicle-borrow-return-history-report': { typeHandle: 'dto', method: 'vehicleBorrowReturnHistoryReport' },
          _default: { typeHandle: 'dto', method: 'listVehiclesRegistrationAssignment' },
        },
        search: { _default: { typeHandle: 'dto', method: 'listVehiclesRegistrationAssignment' } },
      },

      'archive-records': {
        list: {
          'report-borrow-return-record': { typeHandle: 'dto', method: 'reportBorrowReturnRecord' },
          'report-archive-records-expiring': { typeHandle: 'dto', method: 'reportArchiveRecordsExpiring' },
          'report-archive-records-department': { typeHandle: 'dto', method: 'reportArchiveRecordsByDepartment' },
          'report-statistics-retention-reriod': { typeHandle: 'dto', method: 'reportStatisticsByRetentionPeriod' },
          'report-archive-access-statistics': { typeHandle: 'dto', method: 'reportArchiveAccessStatistics' },
          _default: { typeHandle: 'dto', method: 'listArchivedRecords' }
        },
        search: { _default: { typeHandle: 'dto', method: 'listArchivedRecords' } },
      },

      'passports': {
        list: { _default: { typeHandle: 'dto', method: 'findAll' } },
        search: { _default: { typeHandle: 'dto', method: 'findAll' } },
      },

      'passport-requests': {
        list: {
          'approval': { typeHandle: 'dto', method: 'findAllForApproval' },
          'wait-commander': { typeHandle: 'dto', method: 'findAllWaitCommander' },
          'wait-receive': { typeHandle: 'dto', method: 'findAllWaitReceive' },
          'in-use': { typeHandle: 'dto', method: 'findAllInUse' },
          'completed': { typeHandle: 'dto', method: 'findAllCompleted' },
          'rejected': { typeHandle: 'dto', method: 'findAllRejected' },
          'cancelled': { typeHandle: 'dto', method: 'findAllCancelled' },
          _default: { typeHandle: 'dto', method: 'findAll' },
        },
        search: { _default: { typeHandle: 'dto', method: 'findAll' } },
      },

      'passport-incoming-delegations': {
        list: { _default: { typeHandle: 'object', method: 'findAll' } },
        search: { _default: { typeHandle: 'object', method: 'findAll' } },
      },

      'feedback-suggestions': {
        list: {
          'cho-dieu-phoi': { typeHandle: 'dto', method: 'exportWaitingDispatch' },
          'cho-xu-ly': { typeHandle: 'dto', method: 'exportWaitingProcess' },
          'dang-xu-ly': { typeHandle: 'dto', method: 'exportProcessing' },
          'hoan-thanh': { typeHandle: 'dto', method: 'exportCompleted' },
          'tu-choi': { typeHandle: 'dto', method: 'exportRejected' },
          _default: { typeHandle: 'dto', method: 'exportAll' },
        },
        search: { _default: { typeHandle: 'dto', method: 'exportAll' } },
      },
      'users': {
        list: {
          'all': { typeHandle: 'dto', method: 'findAllUser' },
          _default: { typeHandle: 'dto', method: 'findAllUser' },
        },
        search: { _default: { typeHandle: 'dto', method: 'findAllUser' } },
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 4 — OTHER METHODS (unchanged behaviour)
  // ══════════════════════════════════════════════════════════════════════════

  private async getPool(): Promise<sql.ConnectionPool> {
    if (this.pool && this.pool.connected) return this.pool;
    this.pool = await getMssqlPool(this.configService);
    if (!this.pool.connected) throw new Error('MSSQL pool not connected');
    return this.pool;
  }

  async mainProcess(query: ListDocumentsDto, userId: string) {
    if (!userId) throw new BadRequestException('Vui lòng cung cấp userId');
    const bpmnXML = await this.runtime.repo.getBpmnFile();
    const { type, page, limit, filter, sort, processFn } = query;
    const result = await this.runtime.repo.listDocumentsMainProcessDynamic({ type, page, limit, userId, tab: 'processor', bpmnXML, filter, sort, processFn });
    return { ...result, page, limit };
  }

  async receive(query: ListDocumentsDto, userId: string) {
    if (!userId) throw new BadRequestException('Vui lòng cung cấp userId');
    const bpmnXML = await this.runtime.repo.getBpmnFile();
    const { type, page, limit, filter, sort, processFn } = query;
    const result = await this.runtime.repo.listDocumentsReceiveDynamic({ type, page, limit, userId, bpmnXML, filter, sort, processFn });
    return { ...result, page: Number(page), limit: Number(limit) };
  }

  async implementation(query: ListDocumentsDto, userId: string) {
    if (!userId) throw new BadRequestException('Vui lòng cung cấp userId');
    const bpmnXML = await this.runtime.repo.getBpmnFile();
    const { type, page, limit, filter, sort, processFn } = query;
    const result = await this.runtime.repo.listDocumentsImplementationDynamic({ type, page, limit, userId, tab: 'supporter', bpmnXML, filter, sort, processFn });
    return { ...result, page, limit };
  }

  async viewer(query: ListDocumentsDto, userId: string) {
    if (!userId) throw new BadRequestException('Vui lòng cung cấp userId');
    const bpmnXML = await this.runtime.repo.getBpmnFile();
    const { type, page, limit, filter, sort, processFn } = query;
    const result = await this.runtime.repo.listDocumentsViewerDynamic({ type, page, limit, userId, tab: 'viewer', bpmnXML, filter, sort, processFn });
    return { ...result, page, limit };
  }

  async reply(query: ListDocumentsNoTypeDto, userId: string) {
    if (!userId) throw new BadRequestException('Vui lòng cung cấp userId');
    const bpmnXML = await this.runtime.repo.getBpmnFile();
    const { page, limit, filter, sort, processFn } = query;
    const result = await this.runtime.repo.listDocumentsReplyDynamic({ page, limit, userId, bpmnXML, filter, sort, processFn });
    return { ...result, page, limit };
  }

  async signerProcess(query: ListDocumentsDto, userId: string) {
    if (!userId) throw new BadRequestException('Vui lòng cung cấp userId');
    const bpmnXML = await this.runtime.repo.getBpmnFile();
    const { type, page, limit, filter, sort, processFn } = query;
    const result = await this.runtime.repo.listOutgoingDocumentsSignerProcessDynamic({ type, page, limit, userId, bpmnXML, filter, sort, processFn });
    return { ...result, page, limit };
  }

  async outgoingviewer(query: ListDocumentsDto, userId: string) {
    if (!userId) throw new BadRequestException('Vui lòng cung cấp userId');
    const bpmnXML = await this.runtime.repo.getBpmnFile();
    const { type, page, limit, filter, sort, processFn } = query;
    const result = await this.runtime.repo.listOutgoingDocumentsViewerDynamic({ type, page, limit, userId, tab: 'viewer', bpmnXML, filter, sort, processFn });
    return { ...result, page, limit };
  }

  async outgoingPromulgateDocuments(query: ListDocumentsDto, userId: string) {
    if (!userId) throw new BadRequestException('Vui lòng cung cấp userId');
    const bpmnXML = await this.runtime.repo.getBpmnFile();
    const { type, page, limit, filter, sort, processFn } = query;
    const result = await this.runtime.repo.listOutgoingDocumentsPromulgateDynamic({ type, page, limit, userId, tab: 'promulgate', bpmnXML, filter, sort, processFn });
    return { ...result, page, limit };
  }

  async outgoingProcessDocuments(query: ListDocumentsDto, userId: string) {
    if (!userId) throw new BadRequestException('Vui lòng cung cấp userId');
    const bpmnXML = await this.runtime.repo.getBpmnFile();
    const { type, page, limit, filter, sort, processFn } = query;
    const result = await this.runtime.repo.listOutgoingDocumentsProcessDynamic({ type, page, limit, userId, tab: 'processor', bpmnXML, filter, sort, processFn });
    return { ...result, page, limit };
  }

  async getDetails(documentId: string, userId: string, roles: string[], bpmn?: string, isAuthority?: string) {
    if (!userId) throw new BadRequestException('Vui lòng cung cấp userId');
    const perfStartedAt = Date.now();
    const perfMarks: Array<{ stage: string; ms: number }> = [];
    const markPerf = (stage: string, startedAt: number) => {
      if (!ENABLE_DOCUMENT_DETAIL_PERF_LOGS) return;
      perfMarks.push({ stage, ms: Date.now() - startedAt });
    };

    const latestAuditStartedAt = Date.now();
    const latestAuditId = await this.getLatestAuditIdInflight(documentId);
    markPerf('getLatestAuditIdInflight', latestAuditStartedAt);

    const preloadStartedAt = Date.now();
    const [doc, audit, user, aliases] = await Promise.all([
      this.getIncomingDocCached(documentId, latestAuditId),
      this.getIncomingAuditCached(documentId, latestAuditId),
      this.getIncomingUserCached(userId),
      this.getIncomingAliasesCached(),
    ]);
    markPerf('parallel:getIncomingDoc|getIncomingAudit|getIncomingUser|getIncomingAliases', preloadStartedAt);

    const permissionStartedAt = Date.now();
    await this.assertCanViewDetailCached(userId, documentId, latestAuditId);
    markPerf('assertCanViewDetailCached', permissionStartedAt);

    const detailDepsStartedAt = Date.now();
    const [userRole, isCompletedDoc, userDeadline, mappedDoc, viewerAssignments, canAdditionalProcessing] = await Promise.all([
      this.getIncomingUserRoleCached(userId, doc?.bpmnVersion),
      this.getIncomingCompletedCached(documentId, latestAuditId),
      this.getIncomingDeadlineCached(documentId, userId, latestAuditId),
      this.getIncomingMappedDocCached(documentId, latestAuditId, doc, aliases?.aliases || aliases || {}, isAuthority),
      this.getIncomingViewerAssignmentsCached(documentId, userId, latestAuditId),
      this.getIncomingAdditionalProcessingCached(documentId, userId, latestAuditId, audit),
    ]);
    markPerf('parallel:userRole|completed|deadline|mappedDoc|viewerAssignments|canAdditionalProcessing', detailDepsStartedAt);

    const runtimeStartedAt = Date.now();
    const result = await this.runtime.getDetails({
      bpmn,
      documentId,
      userContext: { userId, roles },
      isAuthority,
      prefetchedIncomingDoc: doc,
      prefetchedIncomingAudit: audit,
      prefetchedIncomingUser: user,
      prefetchedIncomingAliases: aliases,
      prefetchedIncomingUserRole: userRole,
      prefetchedIncomingCanView: true,
      prefetchedIncomingCompleted: isCompletedDoc,
      prefetchedIncomingDeadline: userDeadline,
      prefetchedIncomingMappedDoc: mappedDoc,
      prefetchedIncomingViewerAssignments: viewerAssignments,
      prefetchedIncomingLatestAuditId: latestAuditId,
      prefetchedIncomingCanAdditionalProcessing: canAdditionalProcessing,
    });
    markPerf('runtime.getDetails', runtimeStartedAt);

    if (ENABLE_DOCUMENT_DETAIL_PERF_LOGS) {
      this.logger.log(
        `[DocumentsDetailPerf] doc=${documentId} user=${userId} total=${Date.now() - perfStartedAt}ms stages=${perfMarks
          .map((item) => `${item.stage}:${item.ms}ms`)
          .join(' | ')}`,
      );
    }

    return result;
  }

  // ==================== Phase 1: Bảng ánh xạ actionCode → nhãn ====================
  private readonly HISTORY_ACTION_MAP: Record<string, string> = {
    'KY_NHAY': 'Ký nháy',
    'DA_KY_NHAY': 'Ký nháy',
    'CHO_KY_NHAY': 'Ký nháy',
    'KY_THE_THUC': 'Ký thể thức',
    'KY_NHAY_THE_THUC': 'Ký nháy thể thức',
    'DA_KY_THE_THUC': 'Ký thể thức',
    'CHO_KY_THE_THUC': 'Ký thể thức',
    'KY_NHAY_NOI_DUNG': 'Ký nháy nội dung',
    'DA_KY_NOI_DUNG': 'Ký nội dung',
    'CHO_KY_NOI_DUNG': 'Ký nội dung',
    'KY_CHINH_THUC': 'Ký chính thức',
    'DA_KY_CHINH_THUC': 'Ký chính thức',
    'DA_KY_CHINH_THUC_1': 'Ký chính thức',
    'DA_KY_CHINH_THUC_2': 'Ký chính thức',
    'DA_KY_CHINH_THUC_3': 'Ký chính thức',
    'CHO_KY_CHINH_THUC': 'Ký chính thức',
    'CHO_KY_CHINH_THUC_1': 'Ký chính thức',
    'CHO_KY_CHINH_THUC_2': 'Ký chính thức',
    'CHO_KY_CHINH_THUC_3': 'Ký chính thức',
    'KY_BAN_HANH': 'Ký ban hành',
    'DA_KY_BAN_HANH': 'Ký ban hành',
    'CHO_KY_BAN_HANH': 'Ký ban hành',
    'TRINH_KY': 'Trình ký',
    'TRINH_DUYET': 'Trình duyệt',
    'TRINH_KIEM_TRA_TT': 'Trình kiểm tra thể thức',
    'XAC_NHAN': 'Xác nhận',
    'CHO_XAC_NHAN': 'Xác nhận',
    'THAM_DINH': 'Thẩm định',
    'CHO_THAM_DINH': 'Thẩm định',
    'PHE_DUYET': 'Phê duyệt',
    'CHO_PHE_DUYET': 'Phê duyệt',
    'BAN_HANH': 'Ban hành',
    'DA_BAN_HANH': 'Ban hành',
    'CHO_BAN_HANH': 'Ban hành',
    'DONG_DAU': 'Đóng dấu',
    'DA_DONG_DAU': 'Đóng dấu',
    'CHO_DONG_DAU': 'Đóng dấu',
    'CHO_KY_DONG_DAU': 'Đóng dấu',
    'TRA_LAI': 'Trả lại',
    'RETURN': 'Trả lại',
    'THU_HOI': 'Thu hồi',
    'RECALL': 'Thu hồi',
    'TU_CHOI': 'Từ chối',
    'LUAN_CHUYEN': 'Luân chuyển văn bản',
    'LUAN_CHUYEN_VAN_BAN_DI': 'Luân chuyển văn bản',
    'HOAN_THANH_LUAN_CHUYEN': 'Hoàn thành luân chuyển',
    'CREATE': 'Soạn thảo',
    'SOAN_THAO': 'Soạn thảo',
    'TAO_MOI': 'Khởi tạo văn bản',
    'GUI_VAN_BAN': 'Gửi văn bản',
    'CHUYEN_XU_LY': 'Chuyển xử lý',
    'Y_KIEN': 'Cho ý kiến',
  };

  // Helper: Chuyển đổi ngày tháng (kể cả chuỗi đã format DD/MM/YYYY HH:mm) thành timestamp để sắp xếp đúng
  private parseDateToTimestamp(dateVal: any): number {
    if (!dateVal) return 0;
    if (typeof dateVal === 'number') return dateVal;
    if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? 0 : dateVal.getTime();
    if (typeof dateVal === 'string') {
      const trimmed = dateVal.trim();
      const direct = new Date(trimmed).getTime();
      if (!isNaN(direct)) return direct;

      // Xử lý chuỗi định dạng "DD/MM/YYYY HH:mm:ss" hoặc "DD/MM/YYYY HH:mm"
      const parts = trimmed.split(/[\s/:]+/);
      if (parts.length >= 5) {
        const [day, month, year, hour, minute, second = '0'] = parts;
        const parsed = new Date(
          Number(year),
          Number(month) - 1,
          Number(day),
          Number(hour),
          Number(minute),
          Number(second),
        ).getTime();
        if (!isNaN(parsed)) return parsed;
      }
    }
    return 0;
  }

  // ==================== Phase 2: Phát hiện trả lại / thu hồi ====================
  private isHistoryReturnAudit(audit: any): boolean {
    const actionCode = String(audit?.actionCode || '').toUpperCase().trim();
    const action = String(audit?.action || '').trim().toUpperCase();
    if (action === 'XỬ LÝ CHÍNH' || action === 'XU LY CHINH') return false;

    // Nếu hành động cụ thể của bản ghi là Trình ký, Soạn thảo, Chuyển xử lý... thì KHÔNG coi là Trả lại,
    // tránh trường hợp văn bản đang ở luồng trả lại (stageStatus = TRA_LAI) khiến bước trình ký lại bị gán nhầm thành Trả lại.
    const nonReturnActions = ['TRINH_KY', 'TRINH_LD', 'SOAN_THAO', 'CREATE', 'TAO_MOI', 'GUI_VAN_BAN', 'CHUYEN_XU_LY', 'KY_SO', 'BAN_HANH'];
    if (
      nonReturnActions.includes(actionCode) ||
      action === 'TRÌNH KÝ' ||
      action === 'TRINH KY' ||
      action === 'SOẠN THẢO' ||
      action === 'CHUYỂN XỬ LÝ' ||
      action === 'GỬI VĂN BẢN'
    ) {
      return false;
    }

    return (
      actionCode === 'TRA_LAI' ||
      actionCode === 'RETURN' ||
      actionCode.startsWith('TRA_LAI_') ||
      action === 'TRẢ LẠI' ||
      action === 'TRA_LAI'
    );
  }

  private isHistoryRecallAudit(audit: any): boolean {
    const actionCode = String(audit?.actionCode || '').toUpperCase().trim();
    const action = String(audit?.action || '').trim().toUpperCase();
    if (action === 'XỬ LÝ CHÍNH' || action === 'XU LY CHINH') return false;

    const nonRecallActions = ['TRINH_KY', 'TRINH_LD', 'SOAN_THAO', 'CREATE', 'TAO_MOI', 'GUI_VAN_BAN', 'CHUYEN_XU_LY', 'KY_SO', 'BAN_HANH'];
    if (
      nonRecallActions.includes(actionCode) ||
      action === 'TRÌNH KÝ' ||
      action === 'TRINH KY' ||
      action === 'SOẠN THẢO' ||
      action === 'CHUYỂN XỬ LÝ' ||
      action === 'GỬI VĂN BẢN' ||
      action === 'TRẢ LẠI'
    ) {
      return false;
    }

    return (
      actionCode === 'THU_HOI' ||
      actionCode === 'RECALL' ||
      actionCode === 'TU_CHOI' ||
      action === 'THU HỒI' ||
      action === 'THU_HOI' ||
      action === 'TỪ CHỐI'
    );
  }

  // ==================== Phase 3: Xác định nhãn hành động (KY_SO check role) ====================
  private resolveHistoryActionLabel(audit: any): string {
    const code = String(audit?.actionCode || '').toUpperCase().trim();
    const role = String(audit?.roleCode || audit?.role || audit?.receiver?.roleGroupSource || '').toUpperCase().trim();
    const rawAction = String(audit?.action || '').trim();

    // KY_SO: phân biệt theo role
    if (code === 'KY_SO') {
      if (role.includes('NGUOI_KY_BAN_HANH') || role.includes('KY_BAN_HANH')) return 'Ký ban hành';
      if (role.includes('KY_THE_THUC') || role.includes('NGUOI_KY_THE_THUC')) return 'Ký thể thức';
      if (role.includes('KY_NOI_DUNG') || role.includes('NGUOI_KY_NOI_DUNG')) return 'Ký nội dung';
      if (role.includes('KY_NHAY') || role.includes('NGUOI_KY_NHAY')) return 'Ký nháy';
      return 'Ký số';
    }

    // Trả lại / Thu hồi ưu tiên detect trước
    if (this.isHistoryReturnAudit(audit)) return 'Trả lại';
    if (this.isHistoryRecallAudit(audit)) return 'Thu hồi';

    if (code && this.HISTORY_ACTION_MAP[code]) return this.HISTORY_ACTION_MAP[code];

    // Fallback: sử dụng rawAction nếu có
    if (rawAction && rawAction !== '-' && rawAction.length > 1) return rawAction;

    return code || 'Thực hiện thao tác';
  }

  // ==================== Phase 4: Build 1 step từ 1 audit ====================
  private buildHistoryStep(audit: any, index: number) {
    const actionLabel = this.resolveHistoryActionLabel(audit);

    // Xác định statusCode
    let statusCode = 'completed';
    let stageStatusLabel = 'Đã xử lý';
    let returnReason: string | null = null;

    if (this.isHistoryReturnAudit(audit)) {
      statusCode = 'returned';
      stageStatusLabel = 'Trả lại';
      returnReason = audit.note || audit.reason || null;
    } else if (this.isHistoryRecallAudit(audit)) {
      statusCode = 'rejected';
      stageStatusLabel = 'Thu hồi';
      // returnReason = audit.note || audit.reason || null;
    }

    // Build history child (giữ cấu trúc tương thích FE)
    const historyItem = {
      ...audit,
      action: actionLabel,
      stageStatus: stageStatusLabel,
      completed: true,
    };

    return {
      stepId: `step-${audit._id || audit.id || index}`,
      nodeId: audit.fromNodeId || audit.toNodeId || `audit-${audit._id || audit.id || index}`,
      stepOrder: index + 1,
      stepName: actionLabel,
      stepNote: null,
      actionName: actionLabel,
      action: actionLabel,
      curWorkItem: false,
      completed: true,
      statusCode,
      returnReason,
      history: [historyItem],
    };
  }

  private groupHistoryAudits(audits: any[]): any[] {
    if (!Array.isArray(audits) || audits.length <= 1) return audits || [];

    const grouped: any[] = [];

    for (const item of audits) {
      if (!item) continue;
      const actorId = String(item.createdBy?._id || item.createdBy?.name || item.userId || item.createdBy || '').trim();
      const actionKey = String(item.action || item.actionCode || '').trim();
      const timeMs = this.parseDateToTimestamp(item.processedDate || item.createdAt || item.updatedAt);

      const existing = grouped.find((g) => {
        const gActorId = String(g.createdBy?._id || g.createdBy?.name || g.userId || g.createdBy || '').trim();
        const gActionKey = String(g.action || g.actionCode || '').trim();
        const gTimeMs = this.parseDateToTimestamp(g.processedDate || g.createdAt || g.updatedAt);

        const isSameActor = actorId === gActorId;
        const isSameAction = actionKey === gActionKey
          || (this.isHistoryRecallAudit(item) && this.isHistoryRecallAudit(g))
          || (this.isHistoryReturnAudit(item) && this.isHistoryReturnAudit(g));
        const isCloseTime = Math.abs(timeMs - gTimeMs) <= 5000;

        // Tách biệt các nhóm khác nhau:
        // Nếu cả 2 đều là dạng group (có chứa receiver._id đại diện cho ID nhóm)
        // mà ID nhóm khác nhau thì KHÔNG gộp chung, để tách ra thành các nhóm riêng biệt.
        const isGroupItem = item.receiver && item.receiver._id && item.childs !== undefined;
        const isGroupG = g.receiver && g.receiver._id && g.childs !== undefined;
        let isSameReceiverGroup = true;
        if (isGroupItem && isGroupG && String(item.receiver._id) !== String(g.receiver._id)) {
          isSameReceiverGroup = false;
        }

        return isSameActor && isSameAction && isCloseTime && isSameReceiverGroup;
      });

      if (existing) {
        const existingNameStr = typeof existing.receiver === 'object' ? (existing.receiver?.name || '') : String(existing.receiver || '');
        const newNameStr = typeof item.receiver === 'object' ? (item.receiver?.name || '') : String(item.receiver || '');

        const existingNames = existingNameStr.split(',').map((s: string) => s.trim()).filter(Boolean);
        const newNames = newNameStr.split(',').map((s: string) => s.trim()).filter(Boolean);

        for (const name of newNames) {
          if (name && name !== '-' && !existingNames.includes(name)) {
            existingNames.push(name);
          }
        }

        const combinedReceiverName = existingNames.length > 0 ? existingNames.join(', ') : '-';
        if (typeof existing.receiver === 'object' && existing.receiver !== null) {
          existing.receiver.name = combinedReceiverName;
        } else {
          existing.receiver = { _id: null, name: combinedReceiverName };
        }

        if (item.note && typeof existing.note === 'string' && !existing.note.includes(item.note)) {
          existing.note = existing.note ? `${existing.note}; ${item.note}` : item.note;
        }

        // Tích hợp childs khi gộp các history (để không mất user của các nhóm khi merge)
        // (Giải quyết lỗi hiển thị thiếu người dùng trong cùng nhóm hoặc các nhóm bị gộp)
        if (Array.isArray(item.childs) && item.childs.length > 0) {
          if (!Array.isArray(existing.childs)) {
            existing.childs = [];
          }
          for (const newChild of item.childs) {
            const isDuplicate = existing.childs.some((c: any) => c.receiver?._id === newChild.receiver?._id);
            if (!isDuplicate) {
              existing.childs.push(newChild);
            }
          }
        }
      } else {
        const newItem = {
          ...item,
          receiver: typeof item.receiver === 'object' && item.receiver !== null
            ? { ...item.receiver }
            : { _id: null, name: item.receiver || '-' },
        };
        if (!newItem.receiver.name) newItem.receiver.name = '-';
        grouped.push(newItem);
      }
    }

    return grouped;
  }

  // ==================== Main: Lịch sử luân chuyển văn bản ====================
  async getDocumentHistory(documentId: string) {
    if (!documentId) throw new BadRequestException('Vui lòng cung cấp documentId');

    try {
      // 1. Ưu tiên lấy lịch sử từ outgoing_document_state (Văn bản đi bất biến)
      const rawStateHistory = await (this.runtime.repo as any).getOutgoingDocumentStateHistory(documentId).catch(() => []);
      const filteredStateHistory = Array.isArray(rawStateHistory)
        ? rawStateHistory.filter((item: any) => String(item.actionCode || item.action_code || '').trim().toUpperCase() !== 'CREATE')
        : [];
      // Dữ liệu cũ có thể còn SOAN_THAO của draft đã bị xóa rồi
      // tạo lại cùng documentId. SOAN_THAO ở đây là sự kiện khởi tạo,
      // không phải mỗi lần lưu, nên chỉ giữ bản ghi mới nhất.
      const latestDraftState = filteredStateHistory
        .filter((item: any) => String(item.actionCode || item.action_code || '').trim().toUpperCase() === 'SOAN_THAO')
        .sort((a: any, b: any) => {
          const timeDiff = this.parseDateToTimestamp(b.processedDate || b.createdAt)
            - this.parseDateToTimestamp(a.processedDate || a.createdAt);
          return timeDiff || Number(b._id || b.id || 0) - Number(a._id || a.id || 0);
        })[0];
      const stateHistory = filteredStateHistory.filter((item: any) => {
        const code = String(item.actionCode || item.action_code || '').trim().toUpperCase();
        return code !== 'SOAN_THAO' || item === latestDraftState;
      });

      if (Array.isArray(stateHistory) && stateHistory.length > 0) {
        const sortedState = [...stateHistory].sort((a, b) => {
          const timeA = this.parseDateToTimestamp(a.processedDate || a.createdAt);
          const timeB = this.parseDateToTimestamp(b.processedDate || b.createdAt);
          if (timeA !== timeB) return timeA - timeB;
          return Number(a._id || a.id || 0) - Number(b._id || b.id || 0);
        });

        const groupedState = this.groupHistoryAudits(sortedState);
        const steps = groupedState.map((audit, index) => this.buildHistoryStep(audit, index));
        const history = [{
          group: documentId,
          createdByName: groupedState[0]?.createdBy?.name || '-',
          createdAt: groupedState[0]?.createdAt,
          childs: groupedState,
        }];
        return { steps, history };
      }

      // 2. Fallback sang dữ liệu audit đã nhóm từ DB (cho Văn bản đến hoặc dữ liệu cũ)
      const history = await this.runtime.repo.getAuditGrouped(documentId);
      const groupedHistory = Array.isArray(history) ? history : [];
      const flatAudit = groupedHistory.flatMap((g) => (Array.isArray(g.childs) ? g.childs : []));

      // Sắp xếp theo thời gian thực sự thao tác (processedDate/updatedAt) trước createdAt
      const sortedAudit = [...flatAudit].sort((a, b) => {
        const timeA = this.parseDateToTimestamp(a.processedDate || a.updatedAt || a.createdAt);
        const timeB = this.parseDateToTimestamp(b.processedDate || b.updatedAt || b.createdAt);
        if (timeA !== timeB) return timeA - timeB;
        return (Number(a._id || a.id || 0)) - (Number(b._id || b.id || 0));
      });

      const steps = sortedAudit.map((audit, index) => this.buildHistoryStep(audit, index));

      return { steps, history: groupedHistory };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Lỗi khi lấy lịch sử luân chuyển văn bản (documentId: ${documentId}): ${error?.message || error}`, error?.stack);
      throw new InternalServerErrorException('Có lỗi xảy ra khi lấy lịch sử luân chuyển văn bản');
    }
  }

  private async getDocumentSteps(documentId: string) {
    try {
      let bpmnVersion = 'VAN_BAN_DI';
      const doc =
        (await this.runtime.repo.getOutgoingDocument(documentId).catch(() => null)) ||
        (await this.runtime.repo.getIncomingDocument(documentId).catch(() => null));

      if (doc?.bpmn_version || doc?.bpmnVersion) {
        bpmnVersion = doc.bpmn_version || doc.bpmnVersion;
      } else {
        const wis = await this.runtime.repo.getWorkItemsByDocumentId(documentId).catch(() => []);
        if (wis && wis.length > 0 && wis[0].bpmn_version) {
          bpmnVersion = wis[0].bpmn_version;
        }
      }

      const bpmnXML = await this.runtime.repo.getBpmnFile(bpmnVersion);
      if (!bpmnXML) {
        return [];
      }

      const { indexes } = await this.runtime.getModelFromXml(bpmnXML);
      if (!indexes || !indexes.nodes) {
        return [];
      }

      const getCamundaProperty = (node: any, propName: string): string | undefined => {
        const values = node?.extensionElements?.values;
        if (!Array.isArray(values)) return;
        for (const ext of values) {
          if (ext.$type === 'camunda:properties') {
            for (const prop of ext.$children || []) {
              if (prop.$type === 'camunda:property' && prop.name === propName) {
                return prop.value;
              }
            }
          }
        }
        return;
      };

      let docIsStamp: string | undefined = undefined;
      if (doc) {
        docIsStamp = (doc.isStamp === true || doc.isStamp === 'true' || doc.reqSignFormatDraft === true || doc.reqSignFormatDraft === 'true' || doc.is_stamp === true || doc.is_stamp === 'true')
          ? 'true'
          : 'false';
      }

      const groupedMap = new Map<number, Array<{ id: string; order: number; node: any }>>();
      for (const [id, node] of indexes.nodes) {
        const main = getCamundaProperty(node, 'main');
        const order = Number(main);
        if (Number.isNaN(order)) continue;

        const nodeIsStamp = getCamundaProperty(node, 'isStamp');
        if (docIsStamp !== undefined && nodeIsStamp !== undefined && nodeIsStamp !== docIsStamp) {
          continue;
        }

        const list = groupedMap.get(order) || [];
        list.push({ id, order, node });
        groupedMap.set(order, list);
      }

      if (groupedMap.size === 0) {
        return [];
      }

      const sortedOrders = Array.from(groupedMap.keys()).sort((a, b) => a - b);

      const actionNameMap: Record<string, string> = {
        TAO_MOI: 'Tạo dự thảo văn bản',
        SOAN_THAO: 'Tạo dự thảo văn bản',
        KIEM_TRA_THE_THUC: 'Kiểm tra thể thức',
        TRINH_KIEM_TRA_TT: 'Kiểm tra thể thức',
        KY_NHAY: 'Ký nháy văn bản',
        PHE_DUYET: 'Phê duyệt văn bản',
        TRINH_KY: 'Phê duyệt văn bản',
        DUYET: 'Phê duyệt văn bản',
        BAN_HANH: 'Ban hành văn bản',
        KY_BAN_HANH: 'Ban hành văn bản',
        PHAT_HANH: 'Phát hành văn bản',
        DA_BAN_HANH: 'Phát hành văn bản',
      };

      return sortedOrders.map((order, idx) => {
        const items = groupedMap.get(order)!;
        const nonGatewayItem = items.find((i) => {
          const t = String(i.node?.$type || '').toLowerCase();
          return !t.includes('gateway') && !String(i.id).startsWith('Gateway_');
        });

        const namedItem =
          nonGatewayItem ||
          items.find((i) => i.node.name && i.node.name.trim() !== '' && !i.node.name.toLowerCase().startsWith('gateway')) ||
          items.find((i) => i.node.name && i.node.name.trim() !== '') ||
          items[0];

        const { id, node } = namedItem;

        const rawAction =
          getCamundaProperty(node, 'signerRequired') ||
          getCamundaProperty(node, 'processRequired') ||
          getCamundaProperty(node, 'action') ||
          '';

        const stepOrder = idx + 1;
        let stepName = node.name || (stepOrder === 1 ? 'Soạn thảo' : `Bước ${stepOrder}`);
        let actionName =
          actionNameMap[rawAction.toUpperCase()] ||
          actionNameMap[stepName.toUpperCase()] ||
          node.name ||
          rawAction ||
          'Thao tác';

        if (actionName === 'signStamp' || rawAction === 'signStamp') {
          actionName = 'Phát hành văn bản';
          if (stepName === `Bước ${stepOrder}` || stepName.startsWith('Gateway')) {
            stepName = 'Phát hành';
          }
        }

        return {
          stepId: id || `step-${stepOrder}`,
          stepOrder: stepOrder,
          stepName,
          stepNote: stepOrder === 1 ? '(Khởi tạo)' : null,
          actionName,
          action: rawAction || null,
        };
      });
    } catch (error) {
      console.error('Error in getDocumentSteps:', error);
      return [];
    }
  }

  async totalCounts(userId: string): Promise<ServiceTotal> {
    if (!userId) throw new BadRequestException('Vui lòng cung cấp userId');
    try {
      return await this.getCountsPendingTotal(userId);
    } catch {
      throw new InternalServerErrorException('Không thể lấy số lượng chưa xử lý');
    }
  }

  async deleteDocument(documentIds: string[], isAdmin: boolean = false) {
    try {
      return await this.runtime.repo.deleteDocument(documentIds, isAdmin);
    } catch (error) {
      console.error('Error deleting document' + documentIds, error);
      throw new Error(error.message || 'Không thể xóa văn bản trong luồng');
    }
  }

  async deleteOutgoingDocument(documentIds: string[], isAdmin: boolean = false) {
    try {
      return await this.runtime.repo.deleteOutgoingDocument(documentIds, isAdmin);
    } catch (error) {
      console.error('Error deleting document' + documentIds, error);
      throw new Error('Không thể xóa văn bản. Vui lòng thử lại.');
    }
  }

  async listIncommingDocumentInternal(documentIds: string[]) {
    try {
      return await this.runtime.repo.listIncommingDocumentInternal(documentIds);
    } catch (error) {
      console.error('Error listing incomming document internal' + documentIds, error);
      throw new Error('Không thể lấy danh sách văn bản. Vui lòng thử lại.');
    }
  }
  // Minhnq làm phần này
  /**
   * Lấy toàn bộ audit của văn bản để check quyền thu hồi
   * @param documentId - ID văn bản
   */
  async getAuditForRecall(documentId: string): Promise<any[]> {
    try {
      const dbName = this.configService.get<string>('SQLSERVER_DATABASE');
      const pool = await getMssqlPool(this.configService);
      const result = await pool.request()
        .input('documentId', sql.VarChar, documentId)
        .query(`
          SELECT 
            id,
            document_id,
            receiver,
            receiver_unit,
            created_by AS createdBy,
            action,
            action_code AS actionCode,
            stage_status AS stageStatus,
            curStatusCode,
            created_at AS createdAt,
            updated_at AS updatedAt,
            type_document,
            processed_by
          FROM ${dbName}.dbo.audit
          WHERE document_id = @documentId
          ORDER BY id ASC
        `);
      return result.recordset || [];
    } catch (error) {
      console.error(`[getAuditForRecall] ERROR:`, error?.message || error);
      return [];
    }
  }



  /**
   * Lấy toàn bộ audit của văn bản để check quyền thu hồi
   * @param documentId - ID văn bản
   */


  async recallWorkItem(payload: any, user: any) {
    let { userId } = user;
    if (!userId) userId = user;
    return this.runtime.recallWorkItem(payload, userId);
  }

  async recallWorkItemOutgoing(outgoingDocId: string, user: any, incommingDocIds?: string[], note?: string) {
    let { userId } = user;
    if (!userId) userId = user;
    return this.runtime.recallWorkItemOutgoing(outgoingDocId, userId, incommingDocIds || [''], note || '');
  }

  async recallIncommingDocument(
    outgoingDocId: string,
    user: any,
    options: {
      receiveUnits?: string[];
      processors?: string[];
      knowReceivers?: string[];
      incommingDocIds?: string[];
      note?: string;
    },
  ) {
    // Robustly extract userId from user parameter (support string userId, {userId}, or {id})
    let userId: string;
    if (typeof user === 'string') {
      userId = user;
    } else if (user?.userId) {
      userId = user.userId;
    } else if (user?.id) {
      userId = user.id;
    } else {
      throw new BadRequestException('Không thể xác định người dùng thực hiện thu hồi');
    }

    const payload = {
      receiveUnits: options?.receiveUnits || [],
      processors: options?.processors || [],
      knowReceivers: options?.knowReceivers || [],
      incommingDocIds: options?.incommingDocIds || [],
      note: options?.note || '',
    };


    const result = await this.runtime.repo.recallOutgoingAdditionalReceivers(outgoingDocId, userId, payload);


    // Gửi thông báo chuông và email khi thu hồi thành công
    if (result?.success) {
      try {
        const outgoingDoc = await this.runtime.repo.getOutgoingDocument(outgoingDocId);
        const docNumber = outgoingDoc?.toBook || outgoingDoc?.to_book || '';
        const docTitle = outgoingDoc?.abstractNote || outgoingDoc?.abstract_note || '';

        // 1. Thu hồi đối với đơn vị nhận (nhận bản sao văn bản đến)
        if (result.incommingDocIds && result.incommingDocIds.length > 0) {
          const uniqueIncomingDocIds: string[] = [...new Set<string>((result.incommingDocIds || []).map(String))];
          const senderId = 'SYSTEM';
          const content = `Văn bản đi số ${docNumber} đã được thu hồi.`;
          this.outgoingService.dispatchRecallNotificationsForReceivingUnits(
            uniqueIncomingDocIds,
            senderId,
            content,
            docTitle,
            outgoingDocId,
          );
        }

        // 2. Thu hồi đối với cá nhân nhận để biết (knowReceivers)
        if (result.knowReceivers && result.knowReceivers.length > 0) {
          const recalledUserIds = result.knowReceivers;

          // Gửi thông báo chuông
          await Promise.all(
            recalledUserIds.map((recipientId: string) =>
              this.notificationService.create({
                recipientId,
                senderId: userId,
                content: `Văn bản đi số ${docNumber} đã được thu hồi đối với đồng chí.`,
                recordId: outgoingDocId,
                link: `/outgoing-documents/${outgoingDocId}`,
                key: 'VIEW_OUTCOMING_DOC',
                type: 'OUTGOING_DOC_RECALLED',
                time: new Date(),
                status: 1,
              }).catch((e) => this.logger.error(`Error sending recall notification to user ${recipientId}: ${e?.message || e}`))
            )
          );

          // Gửi email thông báo
          const users = await this.sqlsvRepo.getUsersByIds(recalledUserIds);
          const usersWithEmail = (users || []).filter((u: any) => !!u?.emailUser);
          if (usersWithEmail.length > 0) {
            await Promise.all(
              usersWithEmail.map((u: any) =>
                this.outgoingService.sendRecallEmail(
                  String(u.emailUser),
                  `Văn bản đi số ${docNumber} đã được thu hồi đối với đồng chí.`,
                  new Date()
                ).catch((e) => this.logger.error(`Error sending recall email to ${u.emailUser}: ${e?.message || e}`))
              )
            );
          }
        }
      } catch (notifyError) {
        this.logger.error(
          `[recall][notify] ❌ Failed to send notifications for outgoingDocId=${outgoingDocId}`,
          notifyError,
        );
      }
    } else {
      this.logger.warn(
        `[recall][notify] Skip notifications - result.success=${result?.success}`,
      );
    }

    return result;
  }

  async getStatistics(userId: string, startDate?: string, endDate?: string) {
    if (!userId) throw new BadRequestException('Vui lòng cung cấp userId');
    return this.runtime.repo.getDepartmentalStats(userId, startDate, endDate);
  }

  async getCountsSummary(_userId: string, codesToFetch: string[]): Promise<Record<string, number>> {
    if (!codesToFetch?.length) return {};

    const results: Record<string, number> = {};
    let authorId: string | null = null;
    let receiverUnit: string | null = null;

    try {
      authorId = await this.runtime.repo.getAuthorIdIfAuthorized(_userId);
      const user = await this.userRepository.findOne({
        where: { id: _userId },
        select: ['id', 'parent'],
        relations: ['parent'],
      });
      receiverUnit = user?.parent?.id || null;
    } catch (err) {
      console.warn('[WARN] Failed to fetch authorId/receiverUnit', err);
    }

    const handlers = this.getCountHandlersDynamic();

    const promises = codesToFetch.map(async code => {
      const isAuthorized = /uq$/i.test(code);
      const baseCode = isAuthorized ? code.slice(0, -2) : code;
      const handlerConfig = handlers[baseCode];

      if (!handlerConfig) {
        // console.warn(`[COUNT SKIP] No handler for code ${baseCode}`);
        return { code, value: 0 };
      }

      const { handler, params } = handlerConfig;
      const userId = authorId && isAuthorized ? authorId : _userId;

      try {
        const safeHandler = handler({ userId, receiverUnit, processFn: baseCode, ...params }).catch((err: any) => {
          console.error(`[COUNT ERROR] ${code}:`, err?.message || err);
          return { total: 0 };
        });

        const rs = await Promise.race([
          safeHandler,
          new Promise(resolve => setTimeout(() => { console.error(`[COUNT TIMEOUT] ${baseCode}`); resolve({ total: 0 }); }, 10000)),
        ]);
        return { code, value: Number((rs as any)?.total ?? rs ?? 0) };
      } catch (err: any) {
        console.error(`[COUNT ERROR] ${code}:`, err?.message || err);
        return { code, value: 0 };
      }
    });

    const allResults = await Promise.all(promises);
    allResults.forEach(({ code, value }) => { results[code] = value; });
    return results;
  }

  private getCountHandlersDynamic(): Record<string, { handler: CountHandler; params?: any }> {
    return {
      tiepnhanVT: { handler: args => this.countService.countDocumentsReceiveDynamic(args), params: { type: 'waiting' } },
      tiepnhanVT_submited: { handler: args => this.countService.countDocumentsReceiveDynamic(args), params: { type: 'submited' } },
      tatCaTiepNhan: {
        handler: async (args) => {
          const [waiting, submited] = await Promise.all([
            this.countService.countDocumentsReceiveDynamic({ ...args, type: 'waiting' }),
            this.countService.countDocumentsReceiveDynamic({ ...args, type: 'submited' }),
          ]);
          return { total: (waiting?.total ?? 0) + (submited?.total ?? 0) };
        },
      },
      phoihopTP: { handler: args => this.countService.countDocumentsImplementationDynamic(args), params: { type: 'waiting', tab: 'supporter' } },
      phoihopVT: { handler: args => this.countService.countDocumentsImplementationDynamic(args), params: { type: 'waiting', tab: 'supporter' } },
      phoihopVT_processed: { handler: args => this.countService.countDocumentsImplementationDynamic(args), params: { type: 'processed', tab: 'supporter' } },
      xulyChinhVT_waiting: { handler: args => this.countService.countDocumentsMainProcessDynamic(args), params: { type: 'deadline', tab: 'processor' } },
      phanCongXuLy: { handler: args => this.countService.countDocumentsMainProcessDynamic(args), params: { type: 'deadline' } },
      daPhanCongXuLy: { handler: args => this.countService.countDocumentsMainProcessDynamic(args), params: { type: 'processed', tab: 'processor' } },
      xulychinhtpsl: { handler: args => this.countService.countDocumentsMainProcessDynamic(args), params: { type: 'deadline', tab: 'processor' } },
      xulyChinhVT_processed: { handler: args => this.countService.countDocumentsMainProcessDynamic(args), params: { type: 'processed', tab: 'processor' } },
      xulyChinhVT_urgent: { handler: args => this.countService.countDocumentsMainProcessDynamic(args), params: { type: 'urgent', tab: 'processor' } },
      xulyChinhVT_deadline: { handler: args => this.countService.countDocumentsMainProcessDynamic(args), params: { type: 'deadline', tab: 'processor' } },
      nhanDeBietVT_waiting: { handler: args => this.countService.countDocumentsViewerDynamic(args), params: { type: 'waiting', tab: 'viewer' } },
      nhanDeBietVT_processed: { handler: args => this.countService.countDocumentsViewerDynamic(args), params: { type: 'processed', tab: 'viewer' } },
      phucDapVT: { handler: args => this.countService.countDocumentsReplyDynamic(args), params: {} },
      trinhKyVB_draft: { handler: args => this.countService.countOutgoingDocumentsSignerProcessDynamic(args), params: { type: 'draft' } },
      trinhKyVB_signed: { handler: args => this.countService.countOutgoingDocumentsSignerProcessDynamic(args), params: { type: 'signed' } },
      DuThaoCB: { handler: args => this.countService.countOutgoingDocumentsSignerProcessDynamic(args), params: { type: 'draft' } },
      xulyVB_waiting: { handler: args => this.countService.countOutgoingDocumentsProcessDynamic(args), params: { type: 'waiting', tab: 'processor' } },
      xulyVB_processed: { handler: args => this.countService.countOutgoingDocumentsProcessDynamic(args), params: { type: 'processed', tab: 'processor' } },
      xulyVB_published: { handler: args => this.countService.countOutgoingDocumentsProcessDynamic(args), params: { type: 'published', tab: 'processor' } },
      banHanhVB_waiting: { handler: args => this.countService.countOutgoingDocumentsPromulgateDynamic(args), params: { type: 'waiting' } },
      ChoBanHanhVTC: { handler: args => this.countService.countOutgoingDocumentsPromulgateDynamic(args), params: { type: 'waiting' } },
      banHanhVB_processed: { handler: args => this.countService.countOutgoingDocumentsPromulgateDynamic(args), params: { type: 'processed' } },
      nhanDeBietVB_waiting: { handler: args => this.countService.countOutgoingDocumentsViewerDynamic(args), params: { type: 'waiting' } },
      nhanDeBietVB_processed: { handler: args => this.countService.countOutgoingDocumentsViewerDynamic(args), params: { type: 'processed' } },
      nhandebietPGD2: { handler: args => this.countService.countDocumentsViewerDynamic(args), params: { type: 'waiting', tab: 'viewer' } },
      xulychinhGD: { handler: args => this.countService.countDocumentsMainProcessDynamic(args), params: { type: 'deadline', tab: 'processor' } },
      ChoXuLyTP: { handler: args => this.countService.countOutgoingDocumentsProcessDynamic(args), params: { type: 'waiting', tab: 'processor' } },
      xulychinhCB: { handler: args => this.countService.countDocumentsMainProcessDynamic(args), params: { type: 'deadline', tab: 'processor' } },
      daxlCB: { handler: args => this.countService.countDocumentsMainProcessDynamic(args), params: { type: 'processed', tab: 'processor' } },
      hoanthanhCB: { handler: args => this.countService.countDocumentsMainProcessDynamic(args), params: { type: 'completed', tab: 'processor' } },
      dshtgd: { handler: args => this.countService.countDocumentsMainProcessDynamic(args), params: { type: 'completed', tab: 'processor' } },
      chidaoGD: { handler: args => this.countService.countDocumentsMainProcessDynamic(args), params: { type: 'deadline', tab: 'processor' } },
    };
  }

  async getCountsSummaryFromProcessFns(userId: string): Promise<Record<string, CountResultItem>> {
    const timeoutMs = 5000;

    const processRoleInfo = await this.usersService.findProcessRoleInfoById(userId);
    const processFns: string[] = processRoleInfo?.roles ?? [];
    if (!processFns.length) return {};

    const countableFeatures = await this.featureManagementRepo.find({ where: { status: 1 }, select: ['code', 'apiUrl', 'apiUrlChildren'] });
    if (!countableFeatures.length) return {};

    const featureMap = new Map<string, { apiUrl?: string; apiUrlChildren?: string }>();
    for (const f of countableFeatures) {
      if (f.code) featureMap.set(f.code, { apiUrl: f.apiUrl, apiUrlChildren: f.apiUrlChildren });
    }

    const allowedFeatures = processFns
      .map(code => ({ code, meta: featureMap.get(code) }))
      .filter((item): item is { code: string; meta: { apiUrl?: string; apiUrlChildren?: string } } => Boolean(item.meta));

    if (!allowedFeatures.length) return {};

    const cacheKey = `${userId}:${allowedFeatures.map(f => f.code).sort().join(',')}`;
    const cached = this.countAllCacheTotal.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) return cached.data;

    const withTimeout = <T>(promise: Promise<T>, ms: number, context: string): Promise<T | null> =>
      Promise.race([
        promise.catch((err: any) => { console.error(`[COUNT ERROR] ${context}`, err?.message || err); return null; }),
        new Promise<null>(resolve => setTimeout(() => { console.error(`[COUNT TIMEOUT] ${context}`); resolve(null); }, ms)),
      ]);

    const results: Record<string, CountResultItem> = {};

    await Promise.all(allowedFeatures.map(async ({ code, meta }) => {
      try {
        const rs = await withTimeout(
          this.getListByProcessFn({ page: '1', limit: '1' }, userId, code, { countOnly: 'true' }),
          timeoutMs, code,
        );
        results[code] = { count: Number(rs?.total ?? 0), apiUrl: meta.apiUrl, apiUrlChildren: meta.apiUrlChildren };
      } catch (err: any) {
        console.error(`[COUNT ERROR] ${code}`, err?.message || err);
        results[code] = { count: 0, apiUrl: meta.apiUrl, apiUrlChildren: meta.apiUrlChildren };
      }
    }));

    this.countAllCacheTotal.set(cacheKey, { data: results, timestamp: Date.now() });
    return results;
  }

  async getCountsPendingTotal(userId: string): Promise<ServiceTotal> {
    const timeoutMs = 5000;
    const processRoleInfo = await this.usersService.findProcessRoleInfoById(userId);
    const processFns: string[] = processRoleInfo?.roles ?? [];

    if (!processFns.length) return { incomingTotalCount: 0, outgoingTotalCount: 0, taskTotalCount: 0 };

    const features = await this.featureManagementRepo.find({
      where: { status: 1, code: In(processFns) },
      select: ['code', 'apiUrl', 'apiUrlChildren'],
    });

    if (!features.length) return { incomingTotalCount: 0, outgoingTotalCount: 0, taskTotalCount: 0 };

    const PENDING_TYPES = new Set(['waiting', 'deadline', 'draft']);
    const pendingFeatures = features.filter(f => {
      if (!f.apiUrl && !f.apiUrlChildren) return false;
      const { query } = this.parseApiUrl(f.apiUrl || f.apiUrlChildren!);
      return query.type && PENDING_TYPES.has(query.type);
    });

    if (!pendingFeatures.length) return { incomingTotalCount: 0, outgoingTotalCount: 0, taskTotalCount: 0 };

    const cacheKey = `${userId}:pending-total:${pendingFeatures.map(f => f.code).sort().join(',')}`;
    const cached = this.countCacheTotal.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) return cached.data;

    const withTimeout = <T>(promise: Promise<T>, ms: number, context: string): Promise<T | null> =>
      Promise.race([
        promise.catch((err: any) => { console.error(`[COUNT ERROR][PENDING TOTAL] ${context}`, err?.message || err); return null; }),
        new Promise<null>(resolve => setTimeout(() => { console.error(`[COUNT TIMEOUT][PENDING TOTAL] ${context}`); resolve(null); }, ms)),
      ]);

    const total: ServiceTotal = { incomingTotalCount: 0, outgoingTotalCount: 0, taskTotalCount: 0 };

    await Promise.all(pendingFeatures.map(async f => {
      try {
        const rs = await withTimeout(
          this.getListByProcessFn({ page: '1', limit: '1' }, userId, f.code, { countOnly: 'true' }),
          timeoutMs, f.code,
        );
        const count = Number(rs?.total ?? 0);
        const { service } = this.parseApiUrl(f.apiUrl || f.apiUrlChildren!);

        if (service?.startsWith('incoming')) total.incomingTotalCount += count;
        else if (service?.startsWith('outgoing-documents')) total.outgoingTotalCount += count;
        else if (service === 'tasks') total.taskTotalCount += count;
      } catch (err: any) {
        console.error(`[COUNT ERROR][PENDING TOTAL] ${f.code}`, err?.message || err);
      }
    }));

    this.countCacheTotal.set(cacheKey, { data: total, timestamp: Date.now() });
    return total;
  }

  async listAuthorityDocuments(dto: any, userId?: string, _authorId?: string): Promise<{ items: any[]; total: number }> {
    const page = Number(dto.page) || 1;
    const limit = dto.isExport === 'true' ? 99999 : (Number(dto.limit) || 25);

    const result = await this.authorityProcessService.listAuthorityProcessesDynamic({
      pageNumber: page,
      pageSize: limit,
      search: dto.search,
      filter: dto,
      sort: dto.sort || '-createdAt',
      processFn: dto.processFn || 'DanhSachUyQuyen',
      userId: userId || '',
      isExport: dto.isExport,
    });

    return {
      items: result?.data ?? result?.items ?? [],
      total: result?.total ?? 0,
    };
  }

  async getAllByText(userId: string, searchText?: string, take?: number) {
    if (!userId) throw new BadRequestException('Vui lòng cung cấp userId');
    const pool = await this.getPool();
    const request = pool.request();

    const arrCol: ColumnConfig[] = [{ abstract_note: 'string' }];
    const arrColSo: ColumnConfig[] = [{ name: 'string' }];

    let where = '', params = {};
    let whereSo = '', paramsSo = {};

    if (searchText) {
      ({ where, params } = this.buildWhere(arrCol, searchText, { paramPrefix: 'doc' }));
      ({ where: whereSo, params: paramsSo } = this.buildWhere(arrColSo, searchText, { paramPrefix: 'book' }));
    }

    const arrRole = await this.findProcessRoleInfoById(userId);
    const arrMenu = await this.findAllMenu();

    let resultRole: string[] = [];
    if (arrRole?.roles?.length && arrMenu?.data?.length) {
      const codeSet = new Set(arrMenu.data.map(item => item.code));
      resultRole = arrRole.roles.filter(item => codeSet.has(item));
    }

    let sqlSo = '';
    if (resultRole.includes('SoVBden')) {
      sqlSo = `
        UNION ALL
        SELECT CAST(book_document_id AS VARCHAR(255)) AS document_id, name, 'BOOK_DOCUMENT_DETAILS' AS key_screen, created_at
        FROM book_documents WHERE type_document = 'IncommingDocument' AND status = 1 AND created_at >= DATEADD(month, -1, GETDATE()) ${whereSo}

        UNION ALL
        SELECT CAST(book_document_id AS VARCHAR(255)) AS document_id, name, 'BOOK_DOCUMENT_DETAILS_OUT' AS key_screen, created_at
        FROM book_documents WHERE type_document = 'OutGoingDocument' AND status = 1 AND created_at >= DATEADD(month, -1, GETDATE()) ${whereSo}
      `;
    }

    const rowsSql = `
      SELECT TOP ${take}
        t.document_id, t.name, t.key_screen, COUNT(*) OVER() AS total
      FROM (
        SELECT CAST(i.document_id AS VARCHAR(255)) AS document_id, i.abstract_note AS name, 'VIEW_INCOMING_DOC' AS key_screen, i.created_at
        FROM incomming_documents i
        INNER JOIN audit a ON i.document_id = TRY_CAST(a.document_id AS NVARCHAR(64))
        WHERE i.status = 1 AND a.user_id = '${userId}'
        AND i.receive_date >= DATEADD(month, -1, GETDATE())
        AND (a.roleProcess IN ('processor', 'viewer', 'supporter')) ${where}

        UNION ALL
        SELECT CAST(o.document_id AS VARCHAR(255)) AS document_id, o.abstract_note AS name, 'VIEW_OUTCOMING_DOC' AS key_screen, o.created_at
        FROM outgoing_documents o
        INNER JOIN audit a ON o.document_id = TRY_CAST(a.document_id AS NVARCHAR(64))
        WHERE o.status = 1 AND a.user_id = '${userId}'
        AND o.created_at >= DATEADD(month, -1, GETDATE())
        AND (a.roleProcess IN ('processor', 'viewer', 'supporter')) ${where}

        ${sqlSo}
      ) t
      ORDER BY t.created_at DESC
    `;

    Object.entries({ ...params, ...paramsSo }).forEach(([k, v]) => { request.input(k, v); });
    const result = await request.query(rowsSql);
    const recordset = result?.recordset ?? [];

    return {
      total: recordset.length,
      data: recordset.map(({ total: _, ...rest }) => rest),
    };
  }

  async findProcessRoleInfoById(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'username', 'emailUser', 'rolesByProcess'],
    });

    if (!user) throw new BadRequestException('User không tồn tại');

    const rolesByProcess = Array.isArray(user.rolesByProcess) ? user.rolesByProcess : [];
    const permSet = new Set<string>();
    const roleCodeSet = new Set<string>();

    if (rolesByProcess.length) {
      const processKeys = [...new Set(rolesByProcess.map(p => p.processKey).filter(Boolean))];
      const roleFeatures = await this.roleFeatureRepository.find({
        where: { processKey: In(processKeys) },
        select: ['processKey', 'roles'],
      });

      for (const proc of rolesByProcess) {
        const rf = roleFeatures.find((r: any) => r.processKey === proc.processKey);
        if (!rf) continue;
        for (const roleObject of proc.roles || []) {
          const roleCode = roleObject.roleCode;
          const role = (rf as any).roles?.find((r: any) => r.roleCode === roleCode);
          roleCodeSet.add(roleCode);
          if (!role) continue;
          for (const perm of role.permissions || []) { permSet.add(perm); }
        }
      }
    }

    return { roles: Array.from(permSet), roleCodes: Array.from(roleCodeSet) };
  }

  async findAllMenu() {
    const data = await this.menuRepo
      .createQueryBuilder('m')
      .select(['m._id AS _id', 'm.function AS code'])
      .where('m.status = :status', { status: STATUS.ACTIVED })
      .getRawMany();
    return { data };
  }

  private getCountHandlers() {
    return {
      tiepnhanVT: { repo: 'listDocumentsReceiveDynamic', params: { type: 'waiting', processFn: 'tiepnhanVT' } },
      tracuuVT: { repo: 'listDocumentsReceiveDynamic', params: { type: 'submited', processFn: 'tracuuVT' } },
      xulychinhGD: { repo: 'listDocumentsMainProcessDynamic', params: { type: 'deadline', processFn: 'xulychinhGD', tab: 'processor' } },
      daxlGd: { repo: 'listDocumentsMainProcessDynamic', params: { type: 'processed', processFn: 'daxlGd', tab: 'processor' } },
      chohoanthanhTP: { repo: 'listDocumentsMainProcessDynamic', params: { type: 'incompleted', processFn: 'chohoanthanhTP', tab: 'processor' } },
      hoanthanhGD: { repo: 'listDocumentsMainProcessDynamic', params: { type: 'completed', processFn: 'hoanthanhGD', tab: 'processor' } },
      phoihopTP: { repo: 'listDocumentsImplementationDynamic', params: { type: 'waiting', processFn: 'phoihopTP', tab: 'supporter' } },
      phoihopdaxuly: { repo: 'listDocumentsImplementationDynamic', params: { type: 'processed', processFn: 'phoihopdaxuly', tab: 'supporter' } },
      phoihopCHTTP: { repo: 'listDocumentsImplementationDynamic', params: { type: 'incompleted', processFn: 'phoihopCHTTP', tab: 'supporter' } },
      phoihophoanthanhTP: { repo: 'listDocumentsImplementationDynamic', params: { type: 'completed', processFn: 'phoihophoanthanhTP', tab: 'supporter' } },
      ChuaXuLyTP: { repo: 'listDocumentsViewerDynamic', params: { type: 'waiting', processFn: 'ChuaXuLyTP', tab: 'viewer' } },
      nhandebietdaxem: { repo: 'listDocumentsViewerDynamic', params: { type: 'processed', processFn: 'nhandebietdaxem', tab: 'viewer' } },
      DaXulyNDB: { repo: 'listOutgoingDocumentsViewerDynamic', params: { type: 'processed', processFn: 'DaXulyNDB', tab: 'viewer' } },
      ChoBanHanhVTP: { repo: 'listOutgoingDocumentsPromulgateDynamic', params: { type: 'waiting', processFn: 'ChoBanHanhVTP' } },
      ChoBanHanhVTC: { repo: 'listOutgoingDocumentsPromulgateDynamic', params: { type: 'waiting', processFn: 'ChoBanHanhVTC' } },
      DaBanhanhC: { repo: 'listOutgoingDocumentsPromulgateDynamic', params: { type: 'processed', processFn: 'DaBanhanhC' } },
      ChoXuLyTP: { repo: 'listOutgoingDocumentsProcessDynamic', params: { type: 'waiting', processFn: 'ChoXuLyTP' } },
      DaXulyprocessed: { repo: 'listOutgoingDocumentsProcessDynamic', params: { type: 'processed', processFn: 'ChoXuLyTP' } },
      daXuLyTP: { repo: 'listOutgoingDocumentsProcessDynamic', params: { type: 'processed', processFn: 'daXuLyTP' } },
      vbdiDaBanHanhTP: { repo: 'listOutgoingDocumentsProcessDynamic', params: { type: 'published', processFn: 'vbdiDaBanHanhTP' } },
      ChoChoXinYKien: { repo: 'getMyPendingFeedbackRequests', params: { type: 'pending', processFn: 'ChoChoXinYKien' } },
      DaChoYKien: { repo: 'getGivenFeedbacks', params: { type: 'given', processFn: 'DaChoYKien' } },
      DaChuyenChoYKien: { repo: 'listOutgoingDocumentsFeedbackDynamic', params: { type: 'my-receive', processFn: 'DaChuyenChoYKien' } },
      XinYKien: { repo: 'getMySentFeedbacks', params: { type: 'my-sent', processFn: 'XinYKien' } },
      daBanHanhCB: { repo: 'listOutgoingDocumentsSignerProcessDynamic', params: { type: 'published', processFn: 'daBanHanhCB', tab: 'signer' } },
      daTrinhKyCB: { repo: 'listOutgoingDocumentsSignerProcessDynamic', params: { type: 'signed', processFn: 'daTrinhKyCB', tab: 'signer' } },
      daTrinhKyCB2: { repo: 'listOutgoingDocumentsSignerProcessDynamic', params: { type: 'signed', processFn: 'daTrinhKyCB', tab: 'signer' } },
      ChobanHanhTP: { repo: 'listOutgoingDocumentsSignerProcessDynamic', params: { type: 'pending_publication', processFn: 'ChobanHanhTP', tab: 'signer' } },
      DuThaoCB: { repo: 'listOutgoingDocumentsSignerProcessDynamic', params: { type: 'draft', processFn: 'DuThaoCB', tab: 'signer' } },
    };
  }

  private buildWhere(
    cols: ColumnConfig[],
    searchValue?: string,
    options?: { paramPrefix?: string; tableAlias?: string },
  ): { where: string; params: Record<string, any> } {
    if (!searchValue) return { where: '', params: {} };

    const conditions: string[] = [];
    const params: Record<string, any> = {};
    const prefix = options?.paramPrefix ?? 'p';
    const alias = options?.tableAlias ? `${options.tableAlias}.` : '';

    cols.forEach((col, index) => {
      const [field, type] = Object.entries(col)[0];
      const param = `${prefix}${index}`;
      if (type === 'string') {
        conditions.push(`REPLACE(${alias}${field}, N'đ', N'd') COLLATE Vietnamese_CI_AI LIKE @${param}`);
        params[param] = `%${searchValue}%`;
      }
    });

    return {
      where: conditions.length ? `AND (${conditions.join(' OR ')})` : '',
      params,
    };
  }

  async getPendingCount(userId: string): Promise<{
    incomingCount: number;
    outgoingCount: number;
    total: number;
    detail: Record<string, number>;
  }> {
    const emptyResult = { incomingCount: 0, outgoingCount: 0, total: 0, detail: {} };

    // 1. Lấy danh sách processFn mà user được phân quyền
    const processRoleInfo = await this.usersService.findProcessRoleInfoById(userId);
    const processFns: string[] = processRoleInfo?.roles ?? [];
    if (!processFns.length) return emptyResult;

    // 2. Lấy feature_management active cho các mã user có quyền (kèm apiUrl để phân loại)
    const features = await this.featureManagementRepo.find({
      where: { status: 1, code: In(processFns) },
      select: ['code', 'apiUrl', 'apiUrlChildren'],
    });
    if (!features.length) return emptyResult;

    // 3. Lọc chỉ các feature thuộc trạng thái "cần xử lý" (pending) dựa trên apiUrl
    const PENDING_TYPES = new Set(['waiting', 'deadline', 'draft', 'urgent', 'pending']);
    const pendingFeatures = features.filter(f => {
      if (!f.apiUrl && !f.apiUrlChildren) return false;
      const { query } = this.parseApiUrl(f.apiUrl || f.apiUrlChildren!);
      return query.type && PENDING_TYPES.has(query.type);
    });
    if (!pendingFeatures.length) return emptyResult;

    // 4. Phân nhóm incoming / outgoing dựa trên apiUrl.service
    const incomingCodes: string[] = [];
    const outgoingCodes: string[] = [];
    for (const f of pendingFeatures) {
      const { service } = this.parseApiUrl(f.apiUrl || f.apiUrlChildren!);
      if (service?.startsWith('incoming')) {
        incomingCodes.push(f.code);
      } else if (service?.startsWith('outgoing')) {
        outgoingCodes.push(f.code);
      }
    }

    const codesToFetch = [...incomingCodes, ...outgoingCodes];
    if (!codesToFetch.length) return emptyResult;

    // 5. Gọi count song song qua handler nhanh
    const counts = await this.getCountsSummary(userId, codesToFetch);

    let incomingCount = 0;
    incomingCodes.forEach(code => { incomingCount += counts[code] ?? 0; });

    let outgoingCount = 0;
    outgoingCodes.forEach(code => { outgoingCount += counts[code] ?? 0; });

    return {
      incomingCount,
      outgoingCount,
      total: incomingCount + outgoingCount,
      detail: counts,
    };
  }
}
