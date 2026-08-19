import { NotificationType, NotificationKey } from 'src/notifycation/notification.enum';
import { BadRequestException, ConflictException, ForbiddenException, forwardRef, Inject, Injectable, InternalServerErrorException, Logger, NotFoundException, } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, DeepPartial, In, IsNull, QueryRunner, Repository } from 'typeorm';
import { AssigningSeatStatus, MeetingEntity, ParticipantType } from './entities/meeting.entity';
import { MeetingUnitEntity } from './entities/meeting-unit.entity';
import { AssignmentType, DelegationState, MeetingParticipantEntity, ParticipantState, UserType } from './entities/meeting-participant.entity';
import { MeetingTaskEntity } from './entities/meeting-task.entity';
import { MeetingRecurrenceEntity, RecurrenceType } from './entities/meeting-recurrence.entity';
import { CreateMeetingDto, DelegateMeetingPayload, ParticipantDto, TaskDto, UnitDto, UpdateMeetingDto } from './dto/meeting.dto';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import * as dayjs from 'dayjs';
import { OnlineMeetingEntity } from './entities/online-meeting.entity';
import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { RuntimeDbService } from 'src/bpmn/runtime-dbmssql.service';
import BpmnEngineService from 'src/bpmn/bpmn-engine.service';
import { getAllNodeExtensionProperties } from 'src/utils/util';
import { FeatureManagementEntity, StatusFeature, } from 'src/feature-management/feature-management.entity';
import { UsersService } from 'src/users/users.service';
import { FilesManagementService } from 'src/files-managerment/files-management-mssql.service';
import { ConfigurationService } from 'src/view-config/configuration.service';
import { ConfigService } from '@nestjs/config';
import { getMssqlPool } from 'src/database/mssql.pool';
import * as sql from 'mssql';
import {
  buildMeetingCriteriaHelper,
  calculateMeetingDuration,
  getMeetingStartTime,
  mapActionToLabelForSource,
  mapActionToLabel,
  mapActionToLabelMeetingHistory,
  normalizeDateValueDDMMYYYY,
  parseMeetingTime,
  parseSortMeeting,
  mapActionToStatusStyle,
  buildDocumentStatus,
  formatDateVN,
  formatMeetingDuration,
  mapActionToLabelExport,
  buildMeetingCustomSortColumns,
  isParticipantOwner,
  isOverlap,
  normalizeDateValueHHmmDDMMYYYY,
} from './helper/build.meeting.filter';
import { UserEntity } from 'src/users/entities/user.entity';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { MeetingRoomEntity } from 'src/meeting-rooms/entities/meeting-rooms.entity';
import { stageStatusDoc } from 'src/variable/CONST_STATUS';
import { MeetingUnitSeatEntity } from './entities/meeting-unit-seats.entity';
import { ReplaceRoomParticipantsDto, GetMeetingParticipantsQueryDto, ReplaceRoomParticipantsAllRoomDto } from './dto/meeting-participants.dto';
import * as utc from 'dayjs/plugin/utc';
import * as weekOfYear from 'dayjs/plugin/weekOfYear';
import * as timezone from 'dayjs/plugin/timezone';
import * as isoWeek from 'dayjs/plugin/isoWeek';
import { Node, ResolvedContext, FilterCriteria, WhereResult, PaginatedIdsResult, UnitState, WorkState, RoomConflict, DataScope, MeetingChangeSet, UserUnitCache, NOT_CONFIRMED_STATES } from './helper/meeting.types';
import { MeetingFile, MeetingConclusionRaw, MeetingTask, RelatedMeeting, ConclusionItem, MeetingConclusionDetailResponse, MeetingTaskRaw, RelatedMeetingRaw, } from './dto/meeting-conclusion.dto';
import { MeetingRelationResponseDto } from './dto/meeting-relation.dto';
import { MeetingConclusionDto, MeetingConclusionWithTasksDto, } from './dto/meeting-conclusions.dto';
import { ASSIGNING_SEAT_STATUS, ATTENDANCE_STATE, buildMeetingComment, buildRecurrence, calculateParticipantSummaryByState, calculateUnitConfirmSummary, calculateUnitParticipantConfirm, getMeetingActionIcon, ICON_ACCEPTED, ICON_ASSIGNED, ICON_DELEGATED, ICON_DOC, ICON_DOC_DONE, ICON_PENDING, ICON_REJECTED, isConfirmedState, isNotConfirmedState, MEETING_PARTICIPANT_STATE, MEETING_STATE, MEETING_UNIT_STATE, MeetingMapper } from './helper/meeting.mapper';
import { STATUS } from 'src/variables/CONST_STATUS';
import { CreateAudioTranscriptDto, UpdateTranscriptTextDto } from './dto/audio-transcript.dto';
import { CommentsService } from 'src/comments/comments.service';
import { UpdateMeetingProcessingStateDto } from 'src/meeting/dto/meeting.update.dto';
import { MeetingRoomRepository } from 'src/meeting-rooms/meeting-rooms.repository';
import { ServiceTaskExecutorService } from 'src/service-task/service-task-executor.service';
import { MeetingGuest } from './entities/meeting-guest.entity';
import { NotificationService } from 'src/notifycation/notification.service';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { listConclusionsFromKMeetingDto, listMeetingAttendanceReportDto, ListMeetingByTimeDto, ListMeetingRoomsStatsDto } from './dto/meeting-rooms-stats.dto';
import { ListDocumentsOverDueDto } from 'src/documents/dto/list-documents.dto';
import { MailService } from 'src/mail';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { parseSortRecordExploitationRequestssV2 } from 'src/record-exploitation/validators/helper-record-exploitation';
import { TaskEntity } from 'src/task/entity/task.entity';
import { TravelWorkScheduleEntity } from 'src/travel-work-schedules/entity/travel-work-schedules.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { BackgroundGoogleCalendarSyncService } from './background-google-calendar-sync.service';
import { GoogleCalendarEventInput } from './google-calendar-service';
import { MeetingStatusCronService } from './cron/meeting.main.cron';

dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);
dayjs.extend(utc);
dayjs.extend(timezone);
@Injectable()
export class MeetingService {
  private readonly logger = new Logger(MeetingService.name);
  private pool: sql.ConnectionPool | null = null;
  private dbname: string;
  private processKey: string;
  private meetingTypeCache = new Map<string, string>();
  private leaderUserIdSet = new Set<string>();
  private ruleCache = new Map<string, any>()
  private typeDocument: string;

  private bpmnProcessCache = new Map<string, { process: any; indexes: any; xml?: string; timestamp: number }>();

  constructor(
    private readonly configService: ConfigService,
    private readonly bpmnEngine: BpmnEngineService,
    private readonly sqlRepo: MSSQLRepository,
    private readonly sqlsvRepo: SQLSVRepository,
    private readonly runtimeDbService: RuntimeDbService,
    private readonly meetingMapper: MeetingMapper,
    private readonly serviceTaskExecutor: ServiceTaskExecutorService,
    private readonly notificationService: NotificationService,
    private readonly userService: UsersService,
    private readonly fileService: FilesManagementService,
    private readonly configurationService: ConfigurationService,
    private readonly commentService: CommentsService,
    private readonly meetingRoomRepository: MeetingRoomRepository,
    private readonly mailService: MailService,
    private readonly systemLogService: SystemLogServiceSql,

    @InjectDataSource('mssqlConnection')
    private readonly dataSource: DataSource,
    @InjectRepository(MeetingEntity, 'mssqlConnection')
    private readonly meetingRepo: Repository<MeetingEntity>,
    @InjectRepository(MeetingUnitEntity, 'mssqlConnection')
    private readonly meetingUnitRepo: Repository<MeetingUnitEntity>,
    @InjectRepository(MeetingParticipantEntity, 'mssqlConnection')
    private readonly participantRepo: Repository<MeetingParticipantEntity>,
    @InjectRepository(MeetingTaskEntity, 'mssqlConnection')
    private readonly taskRepo: Repository<MeetingTaskEntity>,
    @InjectRepository(MeetingGuest, 'mssqlConnection')
    private readonly meetingGuestRepo: Repository<MeetingGuest>,
    @InjectRepository(MeetingRecurrenceEntity, 'mssqlConnection')
    private readonly recurrenceRepo: Repository<MeetingRecurrenceEntity>,
    @InjectRepository(MeetingUnitSeatEntity, 'mssqlConnection')
    private readonly meetingUnitSeatRepo: Repository<MeetingUnitSeatEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(MeetingRoomEntity, 'mssqlConnection')
    private readonly meetingRoomRepo: Repository<MeetingRoomEntity>,
    @InjectRepository(MeetingParticipantEntity, 'mssqlConnection')
    private readonly meetingParticipantRepo: Repository<MeetingParticipantEntity>,
    @InjectRepository(OrganizationUnitEntity, 'mssqlConnection')
    private readonly orgUnitRepo: Repository<OrganizationUnitEntity>,
    @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
    private readonly featureManagementRepo: Repository<FeatureManagementEntity>,
    @InjectRepository(GroupUserEntity, 'mssqlConnection')
    private readonly groupUserRepo: Repository<GroupUserEntity>,
    @InjectRepository(TaskEntity, 'mssqlConnection')
    private readonly taskEntityRepo: Repository<TaskEntity>,
    @InjectRepository(TravelWorkScheduleEntity, 'mssqlConnection')
    private readonly travelWorkScheduleRepo: Repository<TravelWorkScheduleEntity>,

    @InjectRepository(RoleFeatureEntity, 'mssqlConnection')
    private readonly roleFeaturesRepo: Repository<RoleFeatureEntity>,

    private readonly backgroundGoogleCalendarSyncService: BackgroundGoogleCalendarSyncService,
    @Inject(forwardRef(() => MeetingStatusCronService))
    private readonly meetingStatusCronService: MeetingStatusCronService,
  ) { }

  private getDatabaseName(): string {
    const dbName = this.configService.get<string>('SQLSERVER_DATABASE');
    if (!dbName) throw new Error('SQLSERVER_DATABASE not defined in .env');
    return dbName + '.dbo';
  }

  async onModuleInit() {
    this.dbname = this.getDatabaseName();

    this.typeDocument = 'Meeting';
    await this.loadStaticCache();
    setInterval(() => {
      this.loadStaticCache();
    }, 30 * 60 * 1000);
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

  private async loadStaticCache() {
    try {
      const pool = await this.getPool();

      const [
        crmRes,
        leaderUsers,
      ] = await Promise.all([
        pool.query(`
          SELECT s.code, d.value, d.title
          FROM ${this.dbname}.crm_sources s
          JOIN crm_source_data d ON s.id = d.source_id
          WHERE s.status = 1 
          AND s.code IN('LOAILICHHOP','LQH','DOUUTIENLH','LICHDINHKY','HINHTHUCHOP')
        `),

        this.getUsersByGroupCode('BANLANHDAO'),
      ]);
      // Xóa cache BPMN
      this.bpmnProcessCache.clear();

      // meeting type cache
      this.meetingTypeCache.clear();
      crmRes.recordset.forEach((r: any) => {
        const key = r.code === 'LICHDINHKY'
          ? String(r.value).toUpperCase().trim()   // chỉ recurrenceType đổi sang HOA
          : String(r.value).trim();                // còn lại giữ nguyên

        this.meetingTypeCache.set(key, r.title.trim());
      });

      // leader cache
      this.leaderUserIdSet = new Set(leaderUsers);

      const latestMeeting = await this.meetingRepo
        .createQueryBuilder('m')
        .select('m.bpmn_version', 'bpmnVersion')
        .orderBy('m.created_at', 'DESC')
        .limit(1)
        .getRawOne();
      if (!latestMeeting) {
        this.logger.warn('Không tìm thấy cuộc họp nào để cập nhật processKey');
        return;
      }

      this.processKey = latestMeeting.bpmnVersion;

    } catch (error) {
      console.error('Load cache error:', error);
    }
  }
  public async getBpmnModelCached(version: string) {
    const TTL = 15 * 60 * 1000; // 15 phút
    const now = Date.now();
    const cached = this.bpmnProcessCache.get(version);

    if (cached && (now - cached.timestamp < TTL)) {
      return cached;
    }

    const xml = await this.sqlRepo.getBpmnFile(version);
    const model = await this.runtimeDbService.getModelFromXml(xml);
    const cachedItem = { ...model, xml, timestamp: now };

    this.bpmnProcessCache.set(version, cachedItem);

    return cachedItem;
  }

  private logAsync(
    req: any,
    userId: string,
    details: string,
    status: 'SUCCESS' | 'ERROR'
  ) {
    const method = req?.method || 'UNKNOWN';
    const logData = {
      action: method,
      details,
      method: method,
      status,
      type: process.env.CLIENT_LOG || 'DHVBTC',
      subType: process.env.CLIENT_LOG || 'DHVBTC',
      userInfo: req?.user?.userId || userId || '',
      ipAddress:
        req?.headers['x-forwarded-for'] ||
        req?.socket?.remoteAddress ||
        req?.ip ||
        'Unknown',
      timestamp: new Date().toISOString(),
    };

    setImmediate(() => {
      this.systemLogService.createLogFromSystem(logData).catch(err => {
        this.logger.error('Log error:', err);
      });
    });
  }

  async getUsersInFlow(
    processKey: string,
    roleCode: string | string[]
  ): Promise<{ userIds: string[]; total: number }> {
    try {
      // 1. Lấy role_feature
      const docs = await this.roleFeaturesRepo
        .createQueryBuilder('rf')
        .select(['rf.roles'])
        .where('rf.processKey = :processKey', { processKey })
        .getMany();

      // 2. Normalize roleCode
      const roleCodes = Array.isArray(roleCode) ? roleCode : [roleCode];

      // 3. Gom userIds
      const userIdsSet = new Set<string>();

      for (const doc of docs) {
        let roles: any[] = [];

        if (doc.roles) {
          try {
            roles = typeof doc.roles === 'string'
              ? JSON.parse(doc.roles)
              : doc.roles;
          } catch (e) {
            console.error('Parse roles error:', e);
            continue;
          }
        }

        for (const role of roles) {
          if (!role?.users?.length) continue;

          if (roleCodes.includes(role.roleCode)) {
            role.users.forEach((id: string) => {
              if (id) userIdsSet.add(id);
            });
          }
        }
      }

      // 4. Lấy từ GroupUser (roles_dynamic)
      const groupUsers = await this.findUsersByRoleCodes(roleCodes, processKey);
      groupUsers.forEach(u => {
        if (u.userId) userIdsSet.add(u.userId);
      });

      const userIds = Array.from(userIdsSet);

      return {
        userIds,
        total: userIds.length,
      };
    } catch (e) {
      console.error('Error in getUsersInFlow:', e);
      return { userIds: [], total: 0 };
    }
  }

  public async getModelFromXml(xmlContent: string, cacheKey?: string) {
    const { process } = await this.bpmnEngine.loadBpmnFromString(xmlContent);
    const indexes = this.bpmnEngine.buildIndexes(process);
    return { process, indexes, path: cacheKey || 'inline-xml' };
  }

  async searchMeetings(
    keyword?: string,
  ): Promise<{
    success: boolean;
    data: { id: string; title: string }[];
  }> {
    const pool = await this.getPool();

    let whereClause = '';
    const request = pool.request();

    if (keyword && keyword.trim() !== '') {
      whereClause = `
        WHERE m.title COLLATE Latin1_General_CI_AI
              LIKE '%' + @keyword + '%'
      `;
      request.input('keyword', keyword.trim());
    }

    const sql = `
      SELECT
        m.id,
        m.title as name
      FROM ${this.dbname}.meetings m
      ${whereClause}
      ORDER BY m.created_at DESC
    `;

    const result = await request.query(sql);

    return {
      success: true,
      data: result.recordset || [],
    };
  }

  // Tìm người dùng theo roleCode để gửi notification
  // ✅ MỚI: Dùng bảng roles_process thay vì parse JSON roles_dynamic
  async findUsersByRoleCodes(
    roleCodes: string[],
    processKey?: string,
    userId?: string,
  ): Promise<{ userId: string; roleCode: string }[]> {
    if (!roleCodes?.length) return [];

    // this.logger.log(`[findUsersByRoleCodes] Called with roleCodes=${JSON.stringify(roleCodes)}, processKey=${processKey}, userId=${userId}`);

    const qb = this.groupUserRepo.manager.createQueryBuilder()
      .select('ugu.user_id', 'userId')
      .addSelect('rp.role_code', 'roleCode')
      .from('roles_process', 'rp')
      .innerJoin('roles_process_groups', 'rpg', 'rpg.role_id = rp.id')
      .innerJoin('user_group_users', 'ugu', 'ugu.group_user_id = rpg.group_id')
      .innerJoin('users', 'u', 'u.id = ugu.user_id AND u.status = 1')
      .where('rp.is_active = 1')
      .andWhere('rp.role_code IN (:...roleCodes)', { roleCodes });

    if (processKey) {
      qb.andWhere('rp.process_key = :processKey', { processKey });
    }

    if (userId) {
      qb.andWhere('ugu.user_id = :userId', { userId });
    }

    const rawResults = await qb.getRawMany();
    // this.logger.log(`[findUsersByRoleCodes] Found ${rawResults.length} users matching roleCodes`);
    return rawResults.map(r => ({
      userId: r.userId,
      roleCode: r.roleCode,
    }));
  }

  async cloneMeetingFromSource(
    sourceId: string,
    meetingDate: string,
    rootParentId: string, // template gốc
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const source = await queryRunner.manager.findOne(MeetingEntity, {
        where: { id: sourceId },
        relations: [
          'onlineMeeting',
          'units',
          'units.participants',
          'units.seats',
          'guests',
        ],
      });

      if (!source) {
        throw new BadRequestException('Source meeting not found');
      }

      // =========================
      // 1. CREATE INSTANCE
      // =========================

      const meeting = queryRunner.manager.create(MeetingEntity, {
        title: source.title,
        meetingType: source.meetingType,
        priority: source.priority,
        meetingDate,
        meetingTime: source.meetingTime,
        meetingMode: source.meetingMode,
        roomIds: source.roomIds,
        status: source.status,
        statusCode: source.statusCode,
        bpmnVersion: source.bpmnVersion,
        isCompany: source.isCompany,
        content: source.content,
        chairmanId: source.chairmanId,
        secretaryId: source.secretaryId,
        directCommand: source.directCommand,
        timezone: source.timezone,
        organizationalUnit: source.organizationalUnit,
        createdBy: source.createdBy,
        isAssigningSeat: source.isAssigningSeat,
        chairmanType: source.chairmanType,
        secretaryType: source.secretaryType,
        stageStatus: source.stageStatus,
        assignedSeatBy: source.assignedSeatBy,
        isOverrideInstance: source.isOverrideInstance,
        attendanceLocked: source.attendanceLocked,
        needConfirmation: source.needConfirmation,

        meetingState: MEETING_STATE.DU_KIEN,

        isTemplate: false,

        // QUAN TRỌNG
        parentId: rootParentId,
        recurrenceGroupId:
          source.recurrenceGroupId ?? rootParentId,
      });

      await queryRunner.manager.save(meeting);

      // =========================
      // 2. ONLINE
      // =========================

      if (source.onlineMeeting) {
        await queryRunner.manager.save(
          queryRunner.manager.create(OnlineMeetingEntity, {
            platform: source.onlineMeeting.platform,
            meetingLink: source.onlineMeeting.meetingLink,
            meetingId: source.onlineMeeting.meetingId,
            passcode: source.onlineMeeting.passcode,
            meeting,
          }),
        );
      }

      // =========================
      // 3. UNITS + PARTICIPANTS
      // =========================

      const unitMap = new Map<string, string>();
      const participantMap = new Map<string, string>();

      for (const u of source.units ?? []) {
        const isRoomSelected = u.isRoomSelected === true;
        const unit = await queryRunner.manager.save(
          queryRunner.manager.create(MeetingUnitEntity, {
            meeting,
            unitId: u.unitId,
            seatNumber: u.seatNumber,
            roomId: u.roomId,
            unitState: isRoomSelected ? 'RECEIVED' : 'PENDING',
            acceptJoin: false,
            assignParticipants: false,
            seatParticipants: false,
            prepareDocuments: false,
            processby: null,
            isRoomSelected: u.isRoomSelected,
          }),
        );

        unitMap.set(u.id, unit.id);

        for (const s of u.seats ?? []) {
          await queryRunner.manager.save(
            queryRunner.manager.create(MeetingUnitSeatEntity, {
              unit,
              roomId: s.roomId,
              seatNumber: s.seatNumber,
            }),
          );
        }

        for (const p of u.participants ?? []) {
          const participant = await queryRunner.manager.save(
            queryRunner.manager.create(MeetingParticipantEntity, {
              userId: p.userId,
              seatNumber: p.seatNumber,
              roomId: p.roomId,
              unit,
              participantRole: p.participantRole,
              participantState: source.needConfirmation === false ? ParticipantState.CONFIRMED : ParticipantState.RECEIVED,
              delegatedToUserId: null,
              delegatedFromUserId: null,
              delegatedAt: null,
              attendanceState: 'RECEIVED',
              attendanceAt: null,
              notCheck: false,
              assignmentType: AssignmentType.INITIAL,
              acceptJoin: source.needConfirmation === false ? true : false,
              prepareDocuments: false,
              delegationState: DelegationState.NONE,
              rejectReason: undefined,
              unitId: p.unitId,
              userType: p.userType,
            }),
          );

          participantMap.set(p.id, participant.id);
        }
      }

      // =========================
      // 4. GUESTS
      // =========================

      for (const g of source.guests ?? []) {
        await queryRunner.manager.save(
          queryRunner.manager.create(MeetingGuest, {
            meeting,
            guestName: g.guestName,
            guestTitle: g.guestTitle,
            seatNumber: g.seatNumber,
            roomId: g.roomId,
          }),
        );
      }

      // =========================
      // 5. TASKS
      // =========================

      const tasks = await queryRunner.manager.find(MeetingTaskEntity, {
        where: { meetingId: source.id },
      });

      const dayDiff = dayjs(meetingDate).diff(dayjs(source.meetingDate), 'day');

      for (const t of tasks) {
        let newAttachableId = t.attachableId;

        if (t.attachableType === 'UNIT') {
          const mapped = unitMap.get(t.attachableId);
          if (!mapped) throw new Error(`UNIT not found`);
          newAttachableId = mapped;
        }

        if (t.attachableType === 'PARTICIPANT') {
          const mapped = participantMap.get(t.attachableId);
          if (!mapped) throw new Error(`PARTICIPANT not found`);
          newAttachableId = mapped;
        }

        const newDeadline = t.deadline
          ? dayjs(t.deadline).add(dayDiff, 'day').toDate()
          : dayjs(meetingDate).toDate();

        await queryRunner.manager.save(
          queryRunner.manager.create(MeetingTaskEntity, {
            content: t.content,
            documentName: t.documentName,
            deadline: newDeadline,
            attachableType: t.attachableType,
            attachableRole: t.attachableRole,
            attachableId: newAttachableId,
            meetingId: meeting.id,
            isDocumentPrepared: false,
          }),
        );
      }

      await queryRunner.commitTransaction();
      return meeting;

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async generateFirstRecurringInstance(templateId: string, bypassApprovedCheck = false): Promise<void> {
    try {
      const template = await this.meetingRepo.findOne({
        where: {
          id: templateId,
          isTemplate: true,
          parentId: IsNull(),
          isCancelled: false,
        },
        relations: ['recurrence'],
      });

      if (!template) return;

      const recurrence = template.recurrence;
      if (!recurrence || recurrence.type === RecurrenceType.KHONG) return;

      // Check if already has active instances
      const activeInstance = await this.meetingRepo.findOne({
        where: {
          parentId: template.id,
          status: In(['1', '0', '2', '4']),
        },
      });

      if (activeInstance) return;

      if (!bypassApprovedCheck) {
        const approved = await this.isMeetingApproved(template.id);
        if (!approved) return;
      }

      const firstDate = typeof template.meetingDate === 'string'
        ? template.meetingDate
        : dayjs(template.meetingDate).format('YYYY-MM-DD');

      if (
        recurrence.endDate &&
        dayjs(firstDate).isAfter(dayjs(recurrence.endDate))
      ) {
        return;
      }

      const instance = await this.cloneMeetingFromSource(
        template.id,
        firstDate,
        template.id,
      );

      await this.meetingRepo.save(instance);
      await this.cloneAudit(template.id, instance.id);
      await this.autoConfirmMeeting(instance.id, { addedTasks: true });

      // this.logger.log(`Successfully generated first instance ${instance.id} for template ${template.id} on approval`);
    } catch (e) {
      this.logger.error(`Failed to generate first recurring instance for template ${templateId}`, e);
    }
  }

  async getMeetingValidateUnitAndUserIds(meetingId: string) {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
      relations: ['units', 'units.participants'],
    });

    if (!meeting) {
      throw new Error('Không tìm thấy cuộc họp');
    }

    const unitIds = new Set<string>();
    const userIds = new Set<string>();

    let chairman: { unitId: string; userId: string } | null = null;
    let secretary: { unitId: string; userId: string } | null = null;

    const addParticipantTarget = (
      participant: {
        userId?: string | null;
        unitId?: string | null;
        userType?: string | null;
      } | null | undefined,
      fallbackType: ParticipantType = ParticipantType.USER,
    ) => {
      if (!participant) {
        return;
      }

      const isUnitParticipant =
        fallbackType === ParticipantType.UNIT ||
        participant.userType === UserType.UNIT ||
        participant.userId === ParticipantType.UNIT;

      if (isUnitParticipant) {
        if (participant.unitId) {
          unitIds.add(participant.unitId);
        }
        return;
      }

      if (participant.userId) {
        userIds.add(participant.userId);
      }
    };

    for (const unit of meeting.units ?? []) {
      const participants = unit.participants ?? [];

      if (unit.unitId === 'CHAIRMAN_UNIT') {
        const p = participants.find((p) => p.userId);
        if (p) {
          chairman = {
            unitId: unit.unitId,
            userId:
              p.userId === ParticipantType.UNIT
                ? p.unitId || p.userId
                : p.userId,
          };

          addParticipantTarget(p, meeting.chairmanType);
        }
        continue;
      }

      if (unit.unitId === 'SECRETARY_UNIT') {
        const p = participants.find((p) => p.userId);
        if (p) {
          secretary = {
            unitId: unit.unitId,
            userId:
              p.userId === ParticipantType.UNIT
                ? p.unitId || p.userId
                : p.userId,
          };

          addParticipantTarget(p, meeting.secretaryType);
        }
        continue;
      }

      for (const p of participants) {
        addParticipantTarget(p);
      }

      if (unit.isRoomSelected && unit.unitId) {
        unitIds.add(unit.unitId);
      }
    }

    if (meeting.chairmanType === ParticipantType.UNIT && meeting.chairmanId) {
      unitIds.add(meeting.chairmanId);
    }

    if (meeting.secretaryType === ParticipantType.UNIT && meeting.secretaryId) {
      unitIds.add(meeting.secretaryId);
    }

    return {
      meetingId,
      unitIds: [...unitIds],
      userIds: [...userIds],
      chairman,
      secretary,
    };
  }

  async getMeetingInfo(meetingId: string) {
    return await this.meetingRepo.findOne({
      where: { id: meetingId },
    });
  }

  async getFirstAuditByMeetingId(meetingId: string) {
    const pool = await this.getPool();

    const result = await pool
      .request()
      .input('meetingId', meetingId)
      .query(`
        SELECT TOP 1 *
        FROM ${this.dbname}.audit
        WHERE document_id = @meetingId
        ORDER BY time ASC
      `);

    return result.recordset?.[0] ?? null;
  }

  // Check trùng phòng
  async checkRoomConflict(
    meetingDate: string,
    meetingTime: string,
    roomIds: string[],
    excludeMeetingId?: string,
  ): Promise<RoomConflict[]> {
    if (!roomIds?.length) return [];

    const { start, end } = parseMeetingTime(meetingTime);

    // end là Date object → format sang HH:mm
    const eh = end.getHours();
    const em = end.getMinutes();
    const totalMin = eh * 60 + em + 30;
    const endWithBuffer = [
      String(Math.floor(totalMin / 60) % 24).padStart(2, '0'),
      String(totalMin % 60).padStart(2, '0'),
    ].join(':');

    // start tương tự nếu cũng là Date
    const startStr = [
      String(start.getHours()).padStart(2, '0'),
      String(start.getMinutes()).padStart(2, '0'),
    ].join(':');

    const startISO = `${meetingDate}T${startStr}:00.000Z`;
    const endISO = `${meetingDate}T${endWithBuffer}:00.000Z`;

    const roomConditions = roomIds.map((_, index) => {
      return `(m.room_ids = :roomId_${index} 
        OR m.room_ids LIKE :roomIdStart_${index} 
        OR m.room_ids LIKE :roomIdMiddle_${index} 
        OR m.room_ids LIKE :roomIdEnd_${index})`;
    }).join(' OR ');

    const parameters: any = { startISO, endISO };
    roomIds.forEach((id, index) => {
      parameters[`roomId_${index}`] = id;
      parameters[`roomIdStart_${index}`] = `${id},%`;
      parameters[`roomIdMiddle_${index}`] = `%,${id},%`;
      parameters[`roomIdEnd_${index}`] = `%,${id}`;
    });

    const rows = await this.meetingRepo
      .createQueryBuilder('m')
      .innerJoin(
        'meeting_rooms',
        'r',
        `r.id IN (SELECT value FROM STRING_SPLIT(m.room_ids, ',')) AND r.id IN (:...roomIds)`,
        { roomIds }
      )
      .andWhere('m.status != :deletedStatus', { deletedStatus: '3' })
      .andWhere('m.meeting_state NOT IN (:...excludedStates)', { excludedStates: ['HUY', 'TU_CHOI', 'DA_HUY'], })
      .andWhere(`NOT EXISTS (
          SELECT 1
          FROM (
            SELECT TOP 1 a.action_code
            FROM ${this.dbname}.audit a WITH (NOLOCK)
            WHERE a.document_id = m.id_str
              AND a.type_document = 'Meeting'
            ORDER BY a.created_at DESC, a.id DESC
          ) latest_audit
          WHERE latest_audit.action_code = 'TU_CHOI_LICH'
        )`
      )
      .andWhere(
        `
        CAST(CONCAT(m.meeting_date, ' ', SUBSTRING(m.meeting_time, 1, 5)) AS DATETIME) < CAST(:endISO AS DATETIME)
        AND
        CAST(CONCAT(m.meeting_date, ' ', SUBSTRING(m.meeting_time, 7, 5)) AS DATETIME) > CAST(:startISO AS DATETIME)
        `,
        { startISO, endISO },
      )
      .andWhere(
        `(${roomConditions})`,
        parameters
      )
      .andWhere(excludeMeetingId ? 'm.id != :excludeMeetingId' : '1=1', {
        excludeMeetingId,
      })
      .select([
        'r.id AS roomId',
        'r.name AS roomName',
        'm.id AS meetingId',
        'm.meeting_time AS meetingTime',
        'm.meeting_date AS meetingDate',
      ])
      .getRawMany();

    const map = new Map<string, RoomConflict>();

    for (const r of rows) {
      if (!map.has(r.roomId)) {
        map.set(r.roomId, {
          roomId: r.roomId,
          roomName: r.roomName,
          meetingTime: r.meetingTime,
          meetingDate: r.meetingDate,
          meetingId: r.meetingId,
        });
      }
    }

    return Array.from(map.values());
  }

  // Lấy danh sách lịch họp tương lai của phòng
  async getFutureRoomSchedules(
    roomIds: string[],
    excludeMeetingId?: string,
  ): Promise<any[]> {
    if (!roomIds?.length) return [];

    const nowVN = dayjs().utcOffset(7);
    const currentDateStr = nowVN.format('YYYY-MM-DD');
    const currentTimeStr = nowVN.format('HH:mm');

    const roomConditions = roomIds.map((_, index) => {
      return `(m.room_ids = :roomId_${index} 
        OR m.room_ids LIKE :roomIdStart_${index} 
        OR m.room_ids LIKE :roomIdMiddle_${index} 
        OR m.room_ids LIKE :roomIdEnd_${index})`;
    }).join(' OR ');

    const parameters: any = { currentDateStr, currentTimeStr };
    roomIds.forEach((id, index) => {
      parameters[`roomId_${index}`] = id;
      parameters[`roomIdStart_${index}`] = `${id},%`;
      parameters[`roomIdMiddle_${index}`] = `%,${id},%`;
      parameters[`roomIdEnd_${index}`] = `%,${id}`;
    });

    const rows = await this.meetingRepo
      .createQueryBuilder('m')
      .innerJoin(
        'meeting_rooms',
        'r',
        `r.id IN (SELECT value FROM STRING_SPLIT(m.room_ids, ',')) AND r.id IN (:...roomIds)`,
        { roomIds }
      )
      .andWhere('m.status != :deletedStatus', { deletedStatus: '3' })
      .andWhere('m.meeting_state NOT IN (:...excludedStates)', { excludedStates: ['HUY', 'TU_CHOI', 'DA_HUY'], })
      .andWhere(`NOT EXISTS (
          SELECT 1
          FROM (
            SELECT TOP 1 a.action_code
            FROM ${this.dbname}.audit a WITH (NOLOCK)
            WHERE a.document_id = m.id_str
              AND a.type_document = 'Meeting'
            ORDER BY a.created_at DESC, a.id DESC
          ) latest_audit
          WHERE latest_audit.action_code = 'TU_CHOI_LICH'
        )`
      )
      .andWhere(
        `(m.meeting_date > :currentDateStr OR (m.meeting_date = :currentDateStr AND SUBSTRING(m.meeting_time, 7, 5) >= :currentTimeStr))`,
        { currentDateStr, currentTimeStr }
      )
      .andWhere(
        `(${roomConditions})`,
        parameters
      )
      .andWhere(excludeMeetingId ? 'm.id != :excludeMeetingId' : '1=1', {
        excludeMeetingId,
      })
      .select([
        'r.id AS roomId',
        'r.name AS roomName',
        'm.id AS meetingId',
        'm.meeting_time AS meetingTime',
        'm.meeting_date AS meetingDate',
      ])
      .getRawMany();

    return rows.map((r) => ({
      roomId: r.roomId,
      roomName: r.roomName,
      meetingId: r.meetingId,
      meetingDate: r.meetingDate,
      meetingTime: r.meetingTime,
    }));
  }

  // Check trùng ghế
  async checkSeatConflict(
    meetingDate: string,
    meetingTime: string,
    seats: { roomId: string; seatNumber: string }[],
    excludeMeetingId?: string,
  ) {
    if (!seats?.length) return [];

    const { start, end } = parseMeetingTime(meetingTime);

    const conditions = seats
      .map(
        (s, i) => `(mus.room_id = :room${i} AND mus.seat_number = :seat${i})`,
      )
      .join(' OR ');

    const params = seats.reduce((acc, s, i) => {
      acc[`room${i}`] = s.roomId;
      acc[`seat${i}`] = s.seatNumber;
      return acc;
    }, {} as any);

    const qb = this.meetingRepo
      .createQueryBuilder('m')
      .innerJoin('meeting_units', 'mu', 'mu.meeting_id = m.id')
      .innerJoin('meeting_unit_seats', 'mus', 'mus.meeting_unit_id = mu.id')
      .where('m.meetingDate = :meetingDate', { meetingDate })
      .andWhere('m.status != :deletedStatus', { deletedStatus: '3' })
      .andWhere(`(${conditions})`)
      .andWhere(
        `SUBSTRING(m.meetingTime, 1, 5) < :end AND SUBSTRING(m.meetingTime, 7, 5) > :start`,
        { start, end },
      )
      .setParameters(params);

    if (excludeMeetingId) {
      qb.andWhere('m.id != :excludeMeetingId', { excludeMeetingId });
    }

    return qb.getRawMany(); // Trả về danh sách các ghế bị trùng
  }

  // Check trùng người
  async checkUserConflict(
    meetingDate: string,
    meetingTime: string,
    userIds: string[],
    excludeMeetingId?: string,
  ) {
    if (!userIds?.length) return [];

    const time = parseMeetingTime(meetingTime);
    const start = dayjs(time.start).format('HH:mm');
    const end = dayjs(time.end).format('HH:mm');

    // 🚀 chạy song song
    const [rows, travelRows] = await Promise.all([
      this.meetingRepo
        .createQueryBuilder('m')
        .innerJoin('meeting_units', 'mu', 'mu.meeting_id = m.id')
        .innerJoin(
          'meeting_participants',
          'mp',
          'mp.meeting_unit_id = mu.id'
        )
        .innerJoin('users', 'u', 'u.id = CASE WHEN mp.delegated_to_user_id IN (:...userIds) THEN mp.delegated_to_user_id ELSE mp.user_id END', { userIds })
        .where('m.meeting_date = :meetingDate', { meetingDate })
        .andWhere('m.status != :deletedStatus', { deletedStatus: '3' })
        .andWhere('m.meeting_state NOT IN (:...excludedStates)', { excludedStates: ['HUY', 'TU_CHOI', 'DA_HUY'], })
        .andWhere('(mp.participant_state IS NULL OR mp.participant_state NOT IN (:...notParticipateStates))', { notParticipateStates: [ParticipantState.NOT_PARTICIPATE, 'REJECTED'] })
        .andWhere(new Brackets(qb => {
          qb.where('(mp.user_id IN (:...userIds) AND mp.delegated_to_user_id IS NULL)', { userIds })
            .orWhere('mp.delegated_to_user_id IN (:...userIds)', { userIds });
        }))
        .andWhere(`NOT EXISTS (
          SELECT 1
          FROM (
            SELECT TOP 1 a.action_code
            FROM ${this.dbname}.audit a WITH (NOLOCK)
            WHERE a.document_id = m.id_str
              AND a.type_document = 'Meeting'
            ORDER BY a.created_at DESC, a.id DESC
          ) latest_audit
          WHERE latest_audit.action_code = 'TU_CHOI_LICH'
        )`)
        .andWhere(
          `
          CAST(SUBSTRING(m.meeting_time, 1, 5) AS time) < CAST(:end AS time)
          AND
          CAST(SUBSTRING(m.meeting_time, 7, 5) AS time) > CAST(:start AS time)
          `,
          { start, end },
        )
        .andWhere(excludeMeetingId ? 'm.id != :excludeMeetingId' : '1=1', {
          excludeMeetingId,
        })
        .select([
          'u.id AS userId',
          'u.name AS userName',
          'u.position AS position',
          'm.id AS meetingId',
          'm.title AS meetingName',
          'm.meeting_time AS meetingTime',
          'm.meeting_date AS meetingDate',
        ])
        .getRawMany(),

      this.checkTravelWorkConflict(meetingDate, start, end, userIds),
    ]);

    // ===== load user cho TRAVEL =====
    const travelUserIds = [...new Set(travelRows.map(r => r.userId))];

    let userMap = new Map<string, any>();

    if (travelUserIds.length) {
      const users = await this.userRepo.find({
        where: { id: In(travelUserIds) },
        select: ['id', 'name', 'position'],
      });

      userMap = new Map(users.map(u => [u.id, u]));
    }

    // ===== GỘP =====
    const map = new Map<
      string,
      {
        userId: string;
        userName: string;
        position?: string;
        meetingTime: string;
        meetingDate: string;
        meetingId: string;
        meetingName?: string;
        type: string;
      }
    >();

    for (const r of rows) {
      if (!map.has(r.userId)) {
        map.set(r.userId, {
          userId: r.userId,
          userName: r.userName,
          position: r.position,
          meetingTime: r.meetingTime,
          meetingDate: r.meetingDate,
          meetingId: r.meetingId,
          meetingName: r.meetingName,
          type: 'MEETING',
        });
      }
    }

    for (const r of travelRows) {
      if (!map.has(r.userId)) {
        const u = userMap.get(r.userId);
        map.set(r.userId, {
          userId: r.userId,
          userName: u?.name || '',
          position: u?.position || '',
          meetingTime: '',
          meetingDate: meetingDate,
          meetingId: '',
          meetingName: '',
          type: 'TRAVEL',
        });
      }
    }

    return Array.from(map.values());
  }
  // Check trùng lịch công tác 
  private async checkTravelWorkConflict(
    meetingDate: string,
    start: string,
    end: string,
    userIds: string[],
  ) {
    const travels = await this.travelWorkScheduleRepo
      .createQueryBuilder('t')
      .select([
        't.leader AS leader',
        't.schedule_type AS schedule_type',
        't.calendar_format AS calendar_format',
        't.work_date AS work_date',
        't.from_date AS from_date',
        't.to_date AS to_date',
        't.schedules AS schedules',
        't.morning_location AS morning_location',
        't.afternoon_location AS afternoon_location',
      ])
      .where('t.leader IN (:...userIds)', { userIds })
      .andWhere('t.status != 3')
      .andWhere(`
        (
          (t.schedule_type = 'singleDay' AND CONVERT(date, t.work_date) = :meetingDate)
          OR
          (t.schedule_type = 'multiDay'
            AND (
              (t.from_date IS NOT NULL AND t.to_date IS NOT NULL
                AND CONVERT(date, t.from_date) <= :meetingDate
                AND CONVERT(date, t.to_date) >= :meetingDate
              )
              OR
              (t.schedules IS NOT NULL)
            )
          )
        )
      `, { meetingDate })
      .getRawMany();

    const conflicts = new Map<string, { userId: string; type: string }>();

    for (const t of travels) {
      let isConflict = false;

      // ===== SINGLE DAY =====
      if (t.schedule_type === 'singleDay') {
        let tStart = '01:00';
        let tEnd = '24:00';

        if (t.calendar_format === 'session') {
          const hasMorning = !!t.morning_location;
          const hasAfternoon = !!t.afternoon_location;

          if (hasMorning && !hasAfternoon) {
            tStart = '01:00';
            tEnd = '12:00';
          } else if (!hasMorning && hasAfternoon) {
            tStart = '13:00';
            tEnd = '24:00';
          }
        }

        if (isOverlap(start, end, tStart, tEnd)) {
          isConflict = true;
        }
      }

      // ===== MULTI DAY =====
      if (t.schedule_type === 'multiDay') {
        let matched = false;

        // Ưu tiên schedules JSON
        if (t.schedules) {
          try {
            const schedules = JSON.parse(t.schedules);

            for (const s of schedules) {
              const sStart = dayjs(s.startDate).format('YYYY-MM-DD');
              const sEnd = dayjs(s.endDate).format('YYYY-MM-DD');

              if (meetingDate >= sStart && meetingDate <= sEnd) {
                matched = true;
                break;
              }
            }
          } catch { }
        } else {
          const fromDate = dayjs(t.from_date).utc().format('YYYY-MM-DD');
          const toDate = dayjs(t.to_date).utc().format('YYYY-MM-DD');

          if (meetingDate >= fromDate && meetingDate <= toDate) {
            matched = true;
          }
        }

        if (matched) {
          if (isOverlap(start, end, '01:00', '24:00')) {
            isConflict = true;
          }
        }
      }

      if (isConflict && !conflicts.has(t.leader)) {
        conflicts.set(t.leader, {
          userId: t.leader,
          type: 'TRAVEL',
        });
      }
    }

    return Array.from(conflicts.values());
  }
  // Check recurrence
  async checkRecurrenceConflict(
    dates: string[],
    meetingTime: string,
    roomIds: string[],
  ) {
    const conflicts: { date: string; conflicts: any[] }[] = [];

    for (const date of dates) {
      const result = await this.checkRoomConflict(date, meetingTime, roomIds);

      if (result.length) {
        conflicts.push({ date, conflicts: result });
      }
    }

    return conflicts;
  }

  private async sendMeetingEmail(
    email: string,
    meeting: MeetingEntity,
    role: string,
  ) {
    try {
      const subject = `[Lịch họp] ${meeting.title}`;

      const html = `
        <p>Kính gửi,</p>

        <p>Bạn được phân công <b>${role}</b> trong cuộc họp:</p>

        <p>
        <b>Tiêu đề:</b> ${meeting.title} <br/>
        <b>Thời gian:</b> ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)} <br/>
        </p>

        <p>Vui lòng truy cập hệ thống để xem chi tiết.</p>

        <p>Trân trọng,<br/>Hệ thống quản lý công việc</p>
      `;

      await this.mailService.sendMail({
        to: email,
        subject,
        html,
      });

    } catch (err) {
      this.logger.error(`Send meeting email failed: ${err.message}`);
    }
  }
  private async getUserNameById(userId: string): Promise<string> {
    if (!userId) return '';

    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'name'],
    });

    return user?.name || '';
  }
  async create(
    dto: CreateMeetingDto,
    userContext: {
      originalUserId: string;
      effectiveUserId: string;
    },
    req?: any
  ) {
    const detail = `Tạo mới cuộc họp: ${dto.title}`;
    const originalUserId = userContext.originalUserId;

    let validationResult: any;
    try {
      validationResult = await this.validateAndResolveBPMNForCreate(dto, originalUserId);
    } catch (err) {
      this.logger.error(`[SERVICE.CREATE] validateAndResolveBPMNForCreate ERROR: ${err?.message}`);

      return {
        success: false,
        message: err?.message || 'Đã xảy ra lỗi khi tạo cuộc họp',
      };
    }

    const { bpmnXML, indexes, nextNode, role, statusCode, userOrgUnit, user } = validationResult;
    const nameOriginalUser = user?.name || '';

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { recurrence, tasks, units, chairman, secretary, secretaries, onlineMeeting: onlineMeetingDto, roomIds: dtoRoomIds, chairmanId, secretaryId, guests, ...meetingData } = dto;
      const isOnline = (dto.meetingMode || 'OFFLINE').toUpperCase() === 'ONLINE';
      meetingData.bpmnVersion = dto.flowConfig;
      meetingData.statusCode = statusCode;
      meetingData.createdBy = originalUserId;
      const isRecurring = recurrence && recurrence.type !== RecurrenceType.KHONG;

      const firstSec = (secretaries && secretaries.length > 0) ? secretaries[0] : secretary;
      const meetingPayload = {
        ...meetingData,
        needConfirmation: dto.needConfirmation ?? true,
        location: (dto.meetingMode || '').toUpperCase() === 'OUTSIDETHECOMPANY' ? dto.location || null : null,
        roomIds: dtoRoomIds && dtoRoomIds.length > 0 ? dtoRoomIds.join(',') : null,
        chairmanId: chairman?.userId || chairmanId || null,
        secretaryId: firstSec?.userId || secretaryId || null,
        organizationalUnit: userOrgUnit?.id,
        meetingState: MEETING_STATE.DU_KIEN,
        isTemplate: isRecurring ?? false,
        isAssigningSeat: isOnline ? AssigningSeatStatus.ASSIGNED : AssigningSeatStatus.NOT_ASSIGN,
        parentId: null,
        secretaryType: firstSec?.secretaryType || ParticipantType.USER,
        chairmanType: chairman?.chairmanType || ParticipantType.USER,
      };

      const meeting = queryRunner.manager.create(MeetingEntity, meetingPayload as DeepPartial<MeetingEntity>);
      await queryRunner.manager.save(meeting);

      if (onlineMeetingDto) {
        const onlineMeeting = queryRunner.manager.create(OnlineMeetingEntity, {
          ...onlineMeetingDto,
          meeting,
        });
        await queryRunner.manager.save(onlineMeeting);
        meeting.onlineMeeting = onlineMeeting;
      }

      await this.saveMeetingRecurrence(queryRunner, dto, meeting);

      if (guests?.length) {
        const guestEntities = guests.map((guest) => queryRunner.manager.create(MeetingGuest, {
          meeting: meeting ?? undefined,
          guestName: guest.guestName,
          guestTitle: guest.guestTitle ?? undefined,
          roomId: guest.roomId ?? undefined,
          seatNumber: guest.seatNumber ?? undefined,
        }));
        await queryRunner.manager.save(guestEntities);
      }

      if (tasks?.length) {
        await queryRunner.manager.save(
          tasks.map((t) => queryRunner.manager.create(MeetingTaskEntity, {
            ...t,
            attachableType: 'MEETING',
            attachableId: meeting.id,
            meetingId: meeting.id,
          }))
        );
      }

      await this.saveChairmanData(queryRunner, meeting, chairman);
      await this.saveSecretariesData(queryRunner, meeting, secretary, secretaries);
      await this.saveUnitsAndParticipants(queryRunner, meeting, units, chairman, secretary, secretaries);

      await queryRunner.commitTransaction();

      setImmediate(() => {
        const typeAudit = getAllNodeExtensionProperties(nextNode)?.typeAudit || 'TRINH_DUYET';
        const isPublished = true; // Gửi thông báo cho văn thư ngay khi tạo mới
        if (dto.actionCode === 'CONG_BO_LICH_QL_PHONG') {
          this.sendMeetingNotificationsAsync(meeting, units, chairman, secretary, originalUserId, isPublished, secretaries).catch(err => {
            this.logger.error('sendMeetingNotificationsAsync background error:', err);
          });
        }
        this.handleBPMNAfterCreation(meeting, nextNode, bpmnXML, indexes, originalUserId, nameOriginalUser, role, statusCode, dto.flowConfig!, isOnline).catch(err => {
          this.logger.error('handleBPMNAfterCreation background error:', err);
        });
        if (isRecurring && typeAudit === 'PHE_DUYET') {
          this.generateFirstRecurringInstance(meeting.id, true).catch(err => {
            this.logger.error('generateFirstRecurringInstance background error:', err);
          });
        }
      });
      this.logAsync(req, originalUserId, detail, 'SUCCESS');
      return { success: true, data: meeting };
    } catch (err) {
      this.logger.error(err?.message);
      this.logAsync(req, originalUserId, detail, 'SUCCESS');
      await queryRunner.rollbackTransaction();
      return {
        success: false,
        message: err?.message || 'Đã xảy ra lỗi khi tạo cuộc họp',
      };
    } finally {
      await queryRunner.release();
    }
  }

  private async validateAndResolveBPMNForCreate(dto: CreateMeetingDto, originalUserId: string) {
    // this.logger.log(`[VALIDATE_BPMN] START - originalUserId=${originalUserId}`);
    if (!originalUserId) {
      throw new BadRequestException('Không xác định được người dùng');
    }

    const { flowConfig, actionCode, workItem } = dto;
    // this.logger.log(`[VALIDATE_BPMN] flowConfig=${flowConfig}, actionCode=${actionCode}, hasWorkItem=${!!workItem}`);
    if (!flowConfig) {
      throw new BadRequestException('Không tìm thấy luồng cho người dùng');
    }

    if (!actionCode) {
      throw new BadRequestException('actionCode is required');
    }

    const bpmnModel = await this.getBpmnModelCached(flowConfig);

    const [user, userOrgUnit, userProcessRoles] = await Promise.all([
      this.sqlsvRepo.getUserById(originalUserId),
      this.orgUnitRepo
        .createQueryBuilder('orgUnit')
        .leftJoin('orgUnit.users', 'user')
        .where('user.id = :userId', { userId: originalUserId })
        .select(['orgUnit.id']) // Select ít nhất có thể
        .getOne(),
      this.userService.findProcessRoleInfoByIdActionStart(originalUserId, flowConfig, bpmnModel.indexes)
    ]);
    // this.logger.log(`[VALIDATE_BPMN] Promise.all done - hasUser=${!!user}, hasOrgUnit=${!!userOrgUnit}, hasBpmnXML=${!!bpmnModel?.xml}, roleCodes=${JSON.stringify(userProcessRoles?.roleCodes)}`);

    if (!user?.parent?.id) {
      throw new BadRequestException('Người dùng không có parent');
    }

    if (!bpmnModel?.xml) {
      throw new BadRequestException('Không tìm thấy file BPMN');
    }

    const bpmnXML = bpmnModel.xml;

    const userRoleCodes: string[] = userProcessRoles?.roleCodes || [];

    if (!userRoleCodes.length) {
      throw new BadRequestException('Người dùng không có role trong flow');
    }

    const { indexes } = bpmnModel;

    const wi = workItem;
    if (!wi) {
      throw new BadRequestException('WorkItem not found or already completed');
    }

    const node = indexes.nodes.get(wi.nodeId);
    if (!node) {
      throw new BadRequestException('Current BPMN node not found');
    }

    let outs = indexes.outgoingBySource.get(node.id) || [];

    for (const f of outs) {
      const target = f.targetRef;
      if (target && (target.$type === 'bpmn:ExclusiveGateway' || target.$type === 'bpmn:InclusiveGateway')) {
        outs = indexes.outgoingBySource.get(target.id) || [];
        break;
      }
    }

    const flow = outs.find((f: any) => {
      const ext = getAllNodeExtensionProperties(f);
      return (
        (ext?.actionCode && ext.actionCode.toUpperCase() === actionCode) ||
        (f.name && f.name.toUpperCase() === actionCode) ||
        f.id === actionCode
      );
    });

    if (!flow) {
      throw new BadRequestException(`No outgoing flow matches actionCode ${actionCode}`);
    }

    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);
    if (!nextNode) {
      throw new BadRequestException('No next interactive node found');
    }
    const role = indexes.laneMap.get(nextNode.id);
    this.logger.log(`[DEBUG_BPMN] validateAndResolveBPMNForCreate: actionCode=${actionCode}, nextNodeId=${nextNode.id}, nextNodeType=${nextNode.$type}, role=${role}`);
    const nextNodeRole = indexes.laneMap.get(nextNode.id);
    const hasPermission = userRoleCodes.includes(nextNodeRole);

    if (!hasPermission) {
      throw new BadRequestException('Bạn không có quyền tạo lịch họp');
    }

    const statusCode = getAllNodeExtensionProperties(nextNode)?.statusCode;

    return { bpmnXML, indexes, nextNode, role, statusCode, userOrgUnit, user };
  }

  private async saveMeetingRecurrence(queryRunner: QueryRunner, dto: CreateMeetingDto, meeting: MeetingEntity) {
    const { recurrence } = dto;
    if (!recurrence || recurrence.type === RecurrenceType.KHONG) return;

    const meetingDate = dayjs(dto.meetingDate);
    if (!meetingDate.isValid()) {
      throw new BadRequestException('meetingDate không hợp lệ');
    }
    const today = dayjs().format('YYYY-MM-DD');

    let endDate: string | null = null;
    let dayOfMonth: string | null = null;
    let dayOfYear: string | null = null;

    if (recurrence.type === RecurrenceType.NGAY) {
      if (!recurrence.endDate) {
        throw new BadRequestException('NGAY phải có endDate');
      }
      endDate = recurrence.endDate;
    }

    if (recurrence.type === RecurrenceType.TUAN) {
      if (!recurrence.daysOfWeek) {
        throw new BadRequestException('TUAN phải có daysOfWeek');
      }
      endDate = recurrence.endDate ?? null;
    }

    if (recurrence.type === RecurrenceType.THANG) {
      if (!recurrence.endMonth) {
        throw new BadRequestException('THANG phải có endMonth');
      }
      const day = meetingDate.date();
      dayOfMonth = String(day);
      const endMonth = dayjs(`${recurrence.endMonth}-01`);
      const finalDay = day > endMonth.daysInMonth() ? endMonth.daysInMonth() : day;
      endDate = endMonth.date(finalDay).format('YYYY-MM-DD');
    }

    if (recurrence.type === RecurrenceType.NAM) {
      if (!recurrence.endYear) {
        throw new BadRequestException('NAM phải có endYear');
      }
      dayOfYear = meetingDate.format('MM-DD');
      const [monthStr, dayStr] = dayOfYear.split('-');
      const month = Number(monthStr);
      const day = Number(dayStr);
      const endYear = dayjs(`${recurrence.endYear}-01-01`);
      let finalDate = endYear.month(month - 1).date(day);
      if (day > finalDate.daysInMonth()) {
        finalDate = finalDate.date(finalDate.daysInMonth());
      }
      endDate = finalDate.format('YYYY-MM-DD');
    }

    if (recurrence.type === RecurrenceType.TUY_CHINH) {
      if (!recurrence.intervalValue) {
        throw new BadRequestException('TUY_CHINH phải có intervalValue');
      }
      endDate = recurrence.endDate ?? null;
    }

    const recurrenceEntity = queryRunner.manager.create(MeetingRecurrenceEntity, {
      type: recurrence.type as RecurrenceType,
      startDate: recurrence.startDate ?? today,
      endDate,
      daysOfWeek: recurrence.type === RecurrenceType.TUAN ? recurrence.daysOfWeek?.toUpperCase() ?? null : null,
      dayOfMonth,
      dayOfYear,
      intervalValue: recurrence.type === RecurrenceType.TUY_CHINH ? recurrence.intervalValue ?? null : null,
    });

    recurrenceEntity.meeting = meeting;
    await queryRunner.manager.save(recurrenceEntity);
    meeting.recurrenceGroupId = recurrenceEntity.id;
    await queryRunner.manager.save(meeting);
  }

  private async saveChairmanData(queryRunner: QueryRunner, meeting: MeetingEntity, chairman: any) {
    if (!chairman?.userId) return;

    const chairmanUnit = queryRunner.manager.create(MeetingUnitEntity, {
      meeting,
      unitId: 'CHAIRMAN_UNIT',
      seatNumber: chairman.seatNumber ?? null,
      roomId: chairman.roomId ?? null,
    });
    await queryRunner.manager.save(chairmanUnit);

    const chairmanParticipant = queryRunner.manager.create(MeetingParticipantEntity, {
      userId: chairman.userId,
      seatNumber: chairman.seatNumber ?? null,
      roomId: chairman.roomId ?? null,
      unit: chairmanUnit,
      participantRole: 'CHAIRMAN',
      participantState: ParticipantState.CONFIRMED,
      acceptJoin: true,
    });
    await queryRunner.manager.save(chairmanParticipant);

    if (chairman.tasks?.length) {
      await queryRunner.manager.save(
        chairman.tasks.map((t: any) => queryRunner.manager.create(MeetingTaskEntity, {
          ...t,
          attachableType: 'PARTICIPANT',
          attachableId: chairmanParticipant.id,
          meetingId: meeting.id,
        }))
      );
    }
  }

  private async saveSecretariesData(queryRunner: QueryRunner, meeting: MeetingEntity, secretary: any, secretaries?: any[]) {
    const list = (secretaries && secretaries.length > 0) ? secretaries : (secretary?.userId ? [secretary] : []);
    if (list.length === 0) return;

    const firstSec = list[0];
    const secretaryUnit = queryRunner.manager.create(MeetingUnitEntity, {
      meeting,
      unitId: 'SECRETARY_UNIT',
      seatNumber: firstSec.seatNumber ?? null,
      roomId: firstSec.roomId ?? null,
      unitState: firstSec.secretaryType === ParticipantType.UNIT ? 'RECEIVED' : 'PENDING'
    });
    await queryRunner.manager.save(secretaryUnit);

    for (const sec of list) {
      const secretaryType = sec.secretaryType || ParticipantType.USER;
      const secretaryParticipant = queryRunner.manager.create(MeetingParticipantEntity, {
        userId: secretaryType === ParticipantType.USER ? sec.userId : ParticipantType.UNIT,
        unitId: secretaryType === ParticipantType.UNIT ? sec.userId : null,
        seatNumber: sec.seatNumber ?? null,
        roomId: sec.roomId ?? null,
        unit: secretaryUnit,
        participantRole: 'SECRETARY',
        userType: secretaryType === ParticipantType.UNIT ? UserType.UNIT : UserType.USER,
        participantState: meeting.needConfirmation === false ? ParticipantState.CONFIRMED : ParticipantState.PENDING,
        acceptJoin: meeting.needConfirmation === false ? true : false,
      });
      await queryRunner.manager.save(secretaryParticipant);

      if (sec.tasks?.length) {
        await queryRunner.manager.save(
          sec.tasks.map((t: any) => queryRunner.manager.create(MeetingTaskEntity, {
            ...t,
            attachableType: 'PARTICIPANT',
            attachableId: secretaryParticipant.id,
            meetingId: meeting.id,
          }))
        );
      }
    }
  }

  private async saveUnitsAndParticipants(
    queryRunner: QueryRunner,
    meeting: MeetingEntity,
    units: any[] | undefined,
    chairman: any,
    secretary: any,
    secretaries?: any[]
  ) {
    if (!units?.length) return;

    // 🚀 Optimize: Bulk insert units to avoid N+1 queries in loops
    const unitEntities = units.map(u => queryRunner.manager.create(MeetingUnitEntity, {
      isRoomSelected: u.isRoomSelected,
      unitId: u.unitId,
      unitState: u.isRoomSelected ? 'RECEIVED' : 'PENDING',
      meeting,
    }));
    await queryRunner.manager.save(unitEntities);

    const seatEntities: MeetingUnitSeatEntity[] = [];
    const unitTaskEntities: MeetingTaskEntity[] = [];
    const participantEntities: MeetingParticipantEntity[] = [];
    const participantTaskInputs: { tasks: any[]; participantEntity: MeetingParticipantEntity }[] = [];

    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      const unit = unitEntities[i];

      for (const sp of u.sittingPosition ?? []) {
        for (const seat of sp.seatNumber ?? []) {
          seatEntities.push(
            queryRunner.manager.create(MeetingUnitSeatEntity, {
              roomId: sp.roomId,
              seatNumber: seat,
              unit,
            })
          );
        }
      }

      if (u.tasks?.length) {
        for (const t of u.tasks) {
          unitTaskEntities.push(
            queryRunner.manager.create(MeetingTaskEntity, {
              ...t,
              attachableType: 'UNIT',
              attachableId: unit.id,
              meetingId: meeting.id,
            })
          );
        }
      }

      for (const p of u.participants ?? []) {
        const isSec = (secretaries && secretaries.length > 0)
          ? secretaries.some(s => s.userId === p.userId)
          : p.userId === secretary?.userId;
        if (p.userId === chairman?.userId || isSec) {
          continue;
        }

        const participantEntity = queryRunner.manager.create(MeetingParticipantEntity, {
          userId: p.userId,
          seatNumber: p.seatNumber,
          roomId: p.roomId,
          unit,
          participantState: meeting.needConfirmation === false ? ParticipantState.CONFIRMED : ParticipantState.PENDING,
          acceptJoin: meeting.needConfirmation === false ? true : false,
        });

        participantEntities.push(participantEntity);

        if (p.tasks?.length) {
          participantTaskInputs.push({
            tasks: p.tasks,
            participantEntity,
          });
        }
      }
    }

    // 🚀 Save all related entities in batches instead of one by one
    if (seatEntities.length) {
      await queryRunner.manager.insert(MeetingUnitSeatEntity, seatEntities);
    }

    if (unitTaskEntities.length) {
      await queryRunner.manager.insert(MeetingTaskEntity, unitTaskEntities);
    }

    if (participantEntities.length) {
      await queryRunner.manager.save(participantEntities);
    }

    const participantTaskEntities: MeetingTaskEntity[] = [];
    for (const input of participantTaskInputs) {
      for (const t of input.tasks) {
        participantTaskEntities.push(
          queryRunner.manager.create(MeetingTaskEntity, {
            ...t,
            attachableType: 'PARTICIPANT',
            attachableId: input.participantEntity.id,
            meetingId: meeting.id,
          })
        );
      }
    }

    if (participantTaskEntities.length) {
      await queryRunner.manager.insert(MeetingTaskEntity, participantTaskEntities);
    }
  }

  private async sendMeetingApprovalNotificationsAsync(meeting: MeetingEntity, processKey: string, roleCode: string, originalUserId: string) {
    if (!roleCode) return;
    try {
      const approverIds = await this.sqlRepo.getUsersByGroupCode(processKey, roleCode);
      if (approverIds && approverIds.length > 0) {
        await this.notificationService.createForRecipients({
          recipientIds: approverIds,
          senderId: originalUserId,
          type: NotificationType.MEETING_APPROVAL_REQUESTED.value,
          content: `Bạn có cuộc họp yêu cầu phê duyệt "${meeting.title}`,
          recordId: meeting.id,
          link: `/meetings/${meeting.id}?listparammeeting=APPROVER_MEETING`,
          key: NotificationKey.VIEW_MEETING_ROOM,
          time: new Date(),
          status: 0,
        });
      }
    } catch (err) {
      this.logger.error('sendMeetingApprovalNotificationsAsync error:', err);
    }
  }

  private isWarning24hRunning = false;

  async send24hMeetingWarnings() {
    if (this.isWarning24hRunning) {
      return;
    }
    this.isWarning24hRunning = true;
    try {
      //this.logger.log('[send24hMeetingWarnings] Start scanning meetings for 24h warning...');
      const now = dayjs().tz('Asia/Ho_Chi_Minh');
      const tomorrow = now.add(2, 'day').format('YYYY-MM-DD');
      const today = now.format('YYYY-MM-DD');

      const meetings = await this.meetingRepo
        .createQueryBuilder('m')
        .setLock('dirty_read')
        .where('m.isTemplate = :isTemplate', { isTemplate: false })
        .andWhere('m.isCancelled = :isCancelled', { isCancelled: false })
        .andWhere('(m.status = :status OR m.status IS NULL)', { status: '1' })
        .andWhere('(m.warning24hSent = :warningSent OR m.warning24hSent IS NULL)', { warningSent: false })
        .andWhere('m.stageStatus = :stageStatus', { stageStatus: 'DONG_Y_PHE_DUYET' })
        .andWhere('m.meetingState IN (:...states)', {
          states: [MEETING_STATE.DU_KIEN, MEETING_STATE.DIEU_CHINH, MEETING_STATE.CHUAN_BI]
        })
        .andWhere('m.meetingDate BETWEEN :today AND :tomorrow', { today, tomorrow })
        .getMany();

      //this.logger.log(`[send24hMeetingWarnings] Found ${meetings.length} meeting candidates starting in next 48h.`);

      for (const meeting of meetings) {
        const tz = meeting.timezone || 'Asia/Ho_Chi_Minh';
        const startTime = getMeetingStartTime(meeting.meetingDate, meeting.meetingTime, tz);
        const diffMinutes = startTime.diff(dayjs().tz(tz), 'minute');

        //this.logger.log(`[send24hMeetingWarnings] Checking meeting: ID=${meeting.id}, Title="${meeting.title}", StartTime=${startTime.format('YYYY-MM-DD HH:mm:ss')}, DiffMinutes=${diffMinutes}`);

        if (diffMinutes > 0 && diffMinutes <= 1440) {
          // Atomic update trên DB để khóa bản ghi: Chỉ server nào update thành công (affected > 0) mới được xử lý cuộc họp này
          const updateResult = await this.meetingRepo
            .createQueryBuilder()
            .update(MeetingEntity)
            .set({ warning24hSent: true })
            .where('id = :id', { id: meeting.id })
            .andWhere('(warning24hSent = :warningSent OR warning24hSent IS NULL)', { warningSent: false })
            .execute();

          if (!updateResult.affected) {
            // Server khác đã chiếm quyền xử lý cuộc họp này trước
            continue;
          }

          const allParticipants = await this.meetingParticipantRepo
            .createQueryBuilder('p')
            .setLock('dirty_read')
            .leftJoinAndSelect('p.unit', 'unit')
            .where('unit.meetingId = :meetingId', { meetingId: meeting.id })
            .andWhere('(p.participantState IS NULL OR p.participantState IN (:...unconfirmedStates))', {
              unconfirmedStates: ['PENDING', 'RECEIVED']
            })
            .getMany();

          const uniqueParticipantUserIds = Array.from(
            new Set(allParticipants.map(p => p.userId).filter(id => id && id !== 'UNIT'))
          );

          if (uniqueParticipantUserIds.length === 0) {
            continue;
          }

          const users = await this.userRepo.find({
            where: { id: In(uniqueParticipantUserIds) },
            select: ['id', 'name', 'emailUser']
          });
          const userMap = new Map(users.map(u => [u.id, u]));

          for (const userId of uniqueParticipantUserIds) {
            const u = userMap.get(userId);
            try {
              await this.notificationService.createForRecipients({
                recipientIds: [userId],
                senderId: 'system',
                type: NotificationType.MEETING_PUBLISHED.value,
                content: `Bạn chưa xác nhận tham gia cuộc họp "${meeting.title}".Vui lòng xác nhận trước thời gian diễn ra cuộc họp.`,
                recordId: meeting.id,
                link: `/meetings/${meeting.id}?listparammeeting=PARTICIPANT_MEETING`,
                key: NotificationKey.VIEW_MEETING_ROOM,
                time: new Date(),
                status: 0,
              });
            } catch (err) {
              this.logger.error(`Failed to send 24h warning system notification to participant ${userId}`, err);
            }

            if (u && u.emailUser) {
              try {
                await this.mailService.sendMail({
                  to: u.emailUser,
                  subject: '[Lịch họp] Nhắc xác nhận tham gia cuộc họp',
                  html: `
                    <p>Kính gửi Anh/Chị,</p>
                    <p>Anh/Chị đã được mời tham gia cuộc họp <b>${meeting.title}</b> sẽ diễn ra sau 24 giờ.</p>
                    <p>Hiện Anh/Chị chưa xác nhận tham gia cuộc họp.</p>
                    <p>Vui lòng truy cập hệ thống và xác nhận tham gia trước thời gian diễn ra cuộc họp.</p>
                    <p>Trân trọng.</p>
                  `,
                });
              } catch (err) {
                this.logger.error(`Failed to send 24h warning mail to participant ${u.emailUser}`, err);
              }
            }
          }

          if (meeting.createdBy) {
            const creatorUser = await this.userRepo.findOne({
              where: { id: meeting.createdBy },
              select: ['id', 'name', 'emailUser']
            });

            const unconfirmedNames = uniqueParticipantUserIds.map(id => {
              const u = userMap.get(id);
              return u ? u.name : id;
            });
            const unconfirmedNamesStr = unconfirmedNames.map(name => `${name}`).join(', ');

            try {
              await this.notificationService.createForRecipients({
                recipientIds: [meeting.createdBy],
                senderId: 'system',
                type: NotificationType.MEETING_PUBLISHED.value,
                content: `Cuộc họp "${meeting.title}" còn thành viên chưa xác nhận tham gia.Danh sách chưa xác nhận: ${unconfirmedNamesStr}`,
                recordId: meeting.id,
                link: `/meetings/${meeting.id}?listparammeeting=PREPARE_MEETING`,
                key: NotificationKey.VIEW_MEETING_ROOM,
                time: new Date(),
                status: 0,
              });
            } catch (err) {
              this.logger.error(`Failed to send 24h warning system notification to creator ${meeting.createdBy}`, err);
            }

            if (creatorUser && creatorUser.emailUser) {
              try {
                await this.mailService.sendMail({
                  to: creatorUser.emailUser,
                  subject: '[Lịch họp] Còn thành viên chưa xác nhận tham gia cuộc họp',
                  html: `
                    <p>Kính gửi Anh/Chị,</p>
                    <p>Cuộc họp <b>${meeting.title}</b> sẽ diễn ra sau 24 giờ.</p>
                    <p>Hiện tại vẫn còn các thành viên chưa xác nhận tham gia:</p>
                    <p>${unconfirmedNames.join('<br/>')}</p>
                    <p>Vui lòng theo dõi và nhắc các thành viên xác nhận để đảm bảo cuộc họp diễn ra đúng kế hoạch.</p>
                    <p>Trân trọng.</p>
                  `,
                });
              } catch (err) {
                this.logger.error(`Failed to send 24h warning mail to creator ${creatorUser.emailUser}`, err);
              }
            }
          }

          this.logger.log(`[send24hMeetingWarnings] Successfully sent 24h warnings and saved status for meeting: ID=${meeting.id}`);
        }
      }
      //this.logger.log('[send24hMeetingWarnings] Finished scanning meetings.');
    } catch (err) {
      this.logger.error('Error in send24hMeetingWarnings', err);
    } finally {
      this.isWarning24hRunning = false;
    }
  }

  public async sendMeetingNotificationsByIdAsync(meetingId: string, originalUserId: string) {
    try {
      const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } });
      if (!meeting) {
        this.logger.error(`sendMeetingNotificationsByIdAsync error: Meeting not found for id ${meetingId}`);
        return;
      }

      const units = await this.meetingUnitRepo.find({
        where: { meeting: { id: meetingId } },
        relations: ['participants']
      });

      const chairman = await this.participantRepo.findOne({
        where: {
          unit: { meeting: { id: meetingId } },
          participantRole: 'CHAIRMAN'
        }
      });

      const secretary = await this.participantRepo.findOne({
        where: {
          unit: { meeting: { id: meetingId } },
          participantRole: 'SECRETARY'
        }
      });

      const isPublished = true;
      await this.sendMeetingNotificationsAsync(meeting, units, chairman, secretary, originalUserId, isPublished);
    } catch (err) {
      this.logger.error('sendMeetingNotificationsByIdAsync error:', err);
    }
  }

  private async sendMeetingNotificationsAsync(meeting: MeetingEntity, units: any[] | undefined, chairman: any, secretary: any, originalUserId: string, isPublished = true, secretaries?: any[]) {
    const getUnitId = (participant: any, typeField?: string) => {
      if (!participant) return null;
      if (participant[typeField || 'secretaryType'] === 'UNIT' || participant[typeField || 'chairmanType'] === 'UNIT') {
        return participant.userId;
      }
      if (participant.userType === 'UNIT' || participant.userId === 'UNIT') {
        return participant.unitId;
      }
      return null;
    };

    const chairmanUnitId = getUnitId(chairman, 'chairmanType');
    const secretaryUnitId = getUnitId(secretary, 'secretaryType');

    if (chairman?.userId && !chairmanUnitId) {
      try {
        const chairmanUser = await this.sqlsvRepo.getUserById(chairman.userId);
        if (chairmanUser?.emailUser) {
          await this.sendMeetingEmail(chairmanUser.emailUser, meeting, 'CHỦ TRÌ').catch(err =>
            this.logger.error(`Send chairman email to ${chairmanUser.emailUser} error:`, err)
          );
        }
      } catch (err) {
        this.logger.error('Error fetching chairman user for email:', err);
      }
      try {
        await this.notificationService.createForRecipients({
          recipientIds: [chairman.userId],
          senderId: originalUserId,
          type: NotificationType.MEETING_INVITATION.value,
          content: `Bạn được phân công CHỦ TRÌ cuộc họp "${meeting.title}" lúc ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)}`,
          recordId: meeting.id,
          link: `/meetings/${meeting.id}?listparammeeting=PARTICIPANT_MEETING`,
          key: NotificationKey.VIEW_MEETING_ROOM,
          time: new Date(),
          status: 0,
        });
      } catch (err) {
        this.logger.error('Error creating notification for chairman:', err);
      }
    }

    const secretaryList = (secretaries && secretaries.length > 0) ? secretaries : (secretary?.userId ? [secretary] : []);
    const secretaryUserIds = secretaryList
      .filter(s => getUnitId(s, 'secretaryType') === null)
      .map(s => s.userId)
      .filter(Boolean);

    if (secretaryUserIds.length) {
      try {
        const users = await this.userRepo.find({
          where: { id: In(secretaryUserIds) },
          select: ['id', 'emailUser'],
        });
        for (const user of users) {
          if (user?.emailUser) {
            this.sendMeetingEmail(user.emailUser, meeting, 'THƯ KÝ').catch(err =>
              this.logger.error(`Send secretary email to ${user.emailUser} error:`, err)
            );
          }
        }
      } catch (err) {
        this.logger.error('Error fetching secretary users for email:', err);
      }
      try {
        await this.notificationService.createForRecipients({
          recipientIds: secretaryUserIds,
          senderId: originalUserId,
          type: NotificationType.MEETING_INVITATION.value,
          content: `Bạn được phân công THƯ KÝ cuộc họp "${meeting.title}" lúc ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)}`,
          recordId: meeting.id,
          link: `/meetings/${meeting.id}?listparammeeting=PARTICIPANT_MEETING`,
          key: NotificationKey.VIEW_MEETING_ROOM,
          time: new Date(),
          status: 0,
        });
      } catch (err) {
        this.logger.error('Error creating notification for secretary:', err);
      }
    }

    const selectedClerkUnitIds = (units ?? [])
      .filter(u => u.isRoomSelected === true)
      .map(u => u.unitId)
      .filter(Boolean);

    if (chairmanUnitId && !selectedClerkUnitIds.includes(chairmanUnitId)) {
      selectedClerkUnitIds.push(chairmanUnitId);
    }
    if (secretaryUnitId && !selectedClerkUnitIds.includes(secretaryUnitId)) {
      selectedClerkUnitIds.push(secretaryUnitId);
    }

    if (isPublished && selectedClerkUnitIds.length) {
      try {
        const processKey = meeting.bpmnVersion || 'QUY_TRINH_LICH_HOP';
        const bpmnModel = await this.getBpmnModelCached(processKey);
        const lanes = bpmnModel?.indexes?.lanes || [];
        const unitLane = lanes.find(l => l.properties?.isClerk === 'true');
        const roleCode = unitLane?.role || 'DON_VI_THAM_GIA';
        const roleName = unitLane?.name || 'ĐƠN VỊ THAM GIA';

        const clerks = await this.userRepo.createQueryBuilder('user')
          .select(['user.id', 'user.emailUser', 'parentRelation.id'])
          .leftJoin('user.parent', 'parentRelation')
          .leftJoin('roles_process_users', 'rpu', 'rpu.user_id = user.id')
          .leftJoin('user_group_users', 'ugu', 'ugu.user_id = user.id')
          .leftJoin('roles_process_groups', 'rpg', 'rpg.group_id = ugu.group_user_id')
          .leftJoin('roles_process', 'rp', 'rp.id = rpu.role_id OR rp.id = rpg.role_id')
          .where('user.status = 1')
          .andWhere('rp.is_active = 1')
          .andWhere('rp.role_code = :roleCode', { roleCode })
          .andWhere('rp.process_key = :processKey', { processKey })
          .andWhere('parentRelation.id IN (:...selectedClerkUnitIds)', { selectedClerkUnitIds })
          .getMany();

        const notifyClerks = async (targetClerks: typeof clerks, roleLabel: string, contentMessage: string, listparammeeting = 'PROCESS_MEETING') => {
          const targetClerkIds = targetClerks
            .map(c => c.id)
            .filter(id => id !== chairman?.userId && id !== secretary?.userId);

          if (!targetClerkIds.length) return;

          try {
            const emailClerks = targetClerks.filter(c => targetClerkIds.includes(c.id) && !!c.emailUser);
            const emailPromises = emailClerks.map(user =>
              this.sendMeetingEmail(user.emailUser!, meeting, roleLabel).catch(err =>
                this.logger.error(`Send clerk email (${roleLabel}) to ${user.emailUser} error:`, err)
              )
            );
            Promise.all(emailPromises);
          } catch (err) {
            this.logger.error(`Error sending clerk emails (${roleLabel}):`, err);
          }

          try {
            await this.notificationService.createForRecipients({
              recipientIds: targetClerkIds,
              senderId: originalUserId,
              type: NotificationType.MEETING_INVITATION.value,
              content: contentMessage,
              recordId: meeting.id,
              link: `/meetings/${meeting.id}?listparammeeting=${listparammeeting}`,
              key: listparammeeting === 'PROCESS_MEETING'
                ? NotificationKey.VIEW_PROCESSING_SCHEDULE
                : NotificationKey.VIEW_MEETING_ROOM,
              time: new Date(),
              status: 0,
            });
          } catch (err) {
            this.logger.error(`Error creating notifications for clerks (${roleLabel}):`, err);
          }
        };

        const participantUnitIds = (units ?? [])
          .filter(u => u.isRoomSelected === true)
          .map(u => u.unitId)
          .filter(Boolean);

        const chairmanClerks = clerks.filter(c => c.parent?.id && c.parent.id === chairmanUnitId && !participantUnitIds.includes(c.parent.id));
        const secretaryClerks = clerks.filter(c => c.parent?.id && c.parent.id === secretaryUnitId && !participantUnitIds.includes(c.parent.id));
        const participantClerks = clerks.filter(c => c.parent?.id && participantUnitIds.includes(c.parent.id));

        await notifyClerks(
          chairmanClerks,
          'CHỦ TRÌ',
          `Đơn vị của bạn được phân công CHỦ TRÌ cuộc họp "${meeting.title}" lúc ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)}`,
          'PROCESS_MEETING'
        );

        await notifyClerks(
          secretaryClerks,
          'THƯ KÝ',
          `Đơn vị của bạn được phân công làm THƯ KÝ cuộc họp "${meeting.title}" lúc ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)}`,
          'PROCESS_MEETING'
        );

        await notifyClerks(
          participantClerks,
          roleName.toUpperCase(),
          `Đơn vị của bạn được phân công tham gia cuộc họp "${meeting.title}" lúc ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)}`,
          'PROCESS_MEETING'
        );
      } catch (err) {
        this.logger.error('Error fetching clerks for meeting notifications:', err);
      }
    }

    const participantSet = new Set<string>();
    for (const u of units ?? []) {
      for (const p of u.participants ?? []) {
        if (p.userId && p.userId !== chairman?.userId && p.userId !== secretary?.userId) {
          participantSet.add(p.userId);
        }
      }
    }

    const participantIds = Array.from(participantSet);
    if (participantIds.length) {
      try {
        const users = await this.userRepo.find({
          where: { id: In(participantIds) },
          select: ['id', 'emailUser'],
        });
        const emailUsers = users.filter(user => !!user?.emailUser);
        const concurrencyLimit = 5;
        for (let i = 0; i < emailUsers.length; i += concurrencyLimit) {
          const chunk = emailUsers.slice(i, i + concurrencyLimit);
          await Promise.all(
            chunk.map(user =>
              this.sendMeetingEmail(user.emailUser!, meeting, 'THÀNH VIÊN').catch(err =>
                this.logger.error(`Send email to ${user.emailUser} error:`, err)
              )
            )
          );
        }
      } catch (err) {
        this.logger.error('Error sending participant emails:', err);
      }
      try {
        await this.notificationService.createForRecipients({
          recipientIds: participantIds,
          senderId: originalUserId,
          type: NotificationType.MEETING_INVITATION.value,
          content: `Mời họp "${meeting.title}" lúc ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)}`,
          recordId: meeting.id,
          link: `/meetings/${meeting.id}?listparammeeting=PARTICIPANT_MEETING`,
          key: NotificationKey.VIEW_MEETING_ROOM,
          time: new Date(),
          status: 0,
        });
      } catch (err) {
        this.logger.error('Error creating notifications for participants:', err);
      }
    }
  }

  private async handleBPMNAfterCreation(meeting: MeetingEntity, nextNode: any, bpmnXML: string, indexes: any, originalUserId: string, nameOriginalUser: string, role: string, statusCode: string, flowConfig: string, isOnline: boolean) {
    if (nextNode.$type === 'bpmn:ServiceTask') {
      let receiveNodeId: string | null = null;
      let cancelNodeId: string | null = null;

      const result = await this.serviceTaskExecutor.executeIfServiceTask({
        nodeId: nextNode.id,
        bpmnXml: bpmnXML,
        variables: {
          meetingId: meeting.id,
          nodeId: nextNode.id,
          indexes,
        },
      });

      if (!result?.nextNodes?.length) {
        throw new BadRequestException(`ServiceTask ${nextNode.id} không trả về nextNodes`);
      }

      receiveNodeId = result.receiveNodeId;
      cancelNodeId = result.cancelNodeId;

      const typeAudit = getAllNodeExtensionProperties(nextNode)?.typeAudit || 'TRINH_DUYET';
      if (typeAudit === 'PHE_DUYET') {
        this.sqlRepo.updateMeetingStageStatus(meeting.id, 'DONG_Y_PHE_DUYET').catch(err => this.logger.error('updateMeetingStageStatus background error:', err));
        this.sqlRepo.addAudit(meeting.id, {
          user_id: originalUserId,
          display_name: nameOriginalUser || originalUserId,
          role: role,
          action_code: 'CREATE',
          from_node_id: nextNode.id,
          to_node_id: nextNode.id,
          roleProcess: 'CONG_BO',
          action: 'Đã công bố cuộc họp',
          created_by: originalUserId,
          receiver: null,
          receiver_unit: null,
          stage_status: 'DONG_Y_PHE_DUYET',
          origin_id: null,
          created_at: new Date(),
          updated_at: new Date(),
          curStatusCode: statusCode,
          typeDocument: this.typeDocument,
          processed_by: originalUserId,
          acting_as: originalUserId,
        }).catch(err => this.logger.error('addAudit background error:', err));
        this.sqlRepo.createComment({
          documentId: meeting.id,
          userId: originalUserId,
          userName: nameOriginalUser || originalUserId,
          content: buildMeetingComment('PHE_DUYET'),
        }).catch(err => this.logger.error('createComment background error:', err));
      }
      if (typeAudit === 'TRINH_DUYET') {
        this.sqlRepo.addAudit(meeting.id, {
          user_id: originalUserId,
          display_name: nameOriginalUser || originalUserId,
          role: role,
          action_code: 'CREATE',
          from_node_id: nextNode.id,
          to_node_id: result?.nextNodes?.id,
          roleProcess: 'TRINH_DUYET',
          action: 'Tạo mới cuộc họp',
          created_by: originalUserId,
          receiver: originalUserId,
          receiver_unit: null,
          stage_status: 'DA_XU_LY',
          details: null,
          origin_id: null,
          created_at: new Date(),
          updated_at: new Date(),
          curStatusCode: statusCode,
          typeDocument: this.typeDocument
        })
          .then(() => {
            return this.sqlRepo.addAudit(meeting.id, {
              user_id: originalUserId,
              display_name: nameOriginalUser || originalUserId,
              role: role,
              action_code: 'TRINH_DUYET',
              from_node_id: nextNode.id,
              to_node_id: result?.nextNodes?.id,
              roleProcess: 'TRINH_DUYET',
              action: 'Đã trình duyệt cuộc họp',
              created_by: originalUserId,
              receiver: 'BAN_QUAN_LY_PHONG',
              receiver_unit: null,
              details: null,
              stage_status: 'CHUA_XU_LY',
              origin_id: null,
              created_at: new Date(),
              updated_at: new Date(),
              curStatusCode: statusCode,
              typeDocument: this.typeDocument
            });
          })
          .catch((err) => {
            this.logger.error('addAudit background error:', err);
          });
        this.sqlRepo.createComment({
          documentId: meeting.id,
          userId: originalUserId,
          userName: nameOriginalUser || originalUserId,
          content: buildMeetingComment('TRINH_DUYET'),
        }).catch(err => this.logger.error('createComment background error:', err));
      }

      // this.logger.log(`[DEBUG_BPMN] result.nextNodes count = ${result?.nextNodes?.length || 0}: ${JSON.stringify(result?.nextNodes)}`);
      for (const branch of result.nextNodes) {
        // this.logger.log(`[DEBUG_BPMN] Processing branch: nodeId=${branch.nodeId}, type=${branch.type}, assignType=${branch.extensions?.assignType}`);
        if (branch.type !== 'bpmn:UserTask' && branch.type !== 'bpmn:ExclusiveGateway') {
          continue;
        }
        const assignType = branch.extensions?.assignType;
        if (!assignType) {
          throw new BadRequestException(`UserTask ${branch.nodeId} thiếu assignType`);
        }
        if (assignType === 'USER' || assignType === 'PROCESS' || assignType === 'CHAIRMAN') {
          let usersToAssign = [...(branch.users || [])];

          if (receiveNodeId && cancelNodeId && branch.nodeId === receiveNodeId && meeting.chairmanId) {
            usersToAssign = usersToAssign.filter(uid => uid !== meeting.chairmanId);
            await this.sqlRepo.addWorkItem(
              meeting.id,
              {
                id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                nodeId: cancelNodeId,
                role: branch.role,
                assigneeUserId: meeting.chairmanId,
                nodeType: 'bpmn:UserTask',
              },
              undefined,
              flowConfig,
            );
          }
          const wis = usersToAssign.map((assigneeUserId) => ({
            id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            nodeId: branch.nodeId,
            assigneeUserId,
            role: branch.role,
            nodeType: branch.node_type || branch.type,
          }));
          if (wis.length) {
            await this.sqlRepo.addManyWorkItems(meeting.id, wis, undefined, flowConfig);
            if (assignType === 'USER' && meeting.needConfirmation !== false) {
              await Promise.all(
                usersToAssign.map((assigneeUserId) =>
                  this.sqlRepo.updateParticipantStateByUserTx(
                    meeting.id,
                    assigneeUserId,
                    MEETING_PARTICIPANT_STATE.RECEIVED,
                    undefined,
                    branch.nodeId,
                    branch.role,
                  )
                )
              );
            }
          }
        }

        if (assignType === 'UNIT') {
          const wis = (branch.units || []).map((unitId) => ({
            id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            nodeId: branch.nodeId,
            assigneeUserId: unitId,
            role: branch.role,
            nodeType: branch.node_type || branch.type,
          }));
          if (wis.length) {
            await this.sqlRepo.addManyWorkItems(meeting.id, wis, undefined, flowConfig);
            await Promise.all(
              (branch.units || []).map((unitId) =>
                this.sqlRepo.updateMeetingUnitStateByUnitTx(meeting.id, unitId, MEETING_UNIT_STATE.RECEIVED)
              )
            );
          }
        }

        if (assignType === 'SEAT' && !isOnline) {
          await this.sqlRepo.addWorkItem(
            meeting.id,
            {
              id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              nodeId: branch.nodeId,
              assigneeUserId: originalUserId,
              role: branch.role,
              nodeType: 'bpmn:UserTask',
            },
            undefined,
            flowConfig,
          );
          await this.sqlRepo.updateMeetingAssigningSeatTx(meeting.id, ASSIGNING_SEAT_STATUS.RECEIVED);
        }

        if (assignType === 'BAN_QUAN_LY_PHONG') {
          // this.logger.log(`[DEBUG_BPMN] Entered BAN_QUAN_LY_PHONG block for branch.nodeId=${branch.nodeId}`);
          const targetRole = indexes.laneMap.get(branch.nodeId);
          // this.logger.log(`[DEBUG_BPMN] targetRole=${targetRole}`);
          if (!targetRole) {
            throw new BadRequestException('Target role not found for next node');
          }

          const { userIds: laneUserIds } = await this.getUsersInFlow(meeting.bpmnVersion, targetRole);
          const roleUsers = await this.findUsersByRoleCodes([targetRole]);
          const roleUserIds = roleUsers.map(u => u.userId);
          let allUserIds = [...new Set([...roleUserIds, ...laneUserIds])];
          // this.logger.log(`[DEBUG_BPMN] laneUserIds count=${laneUserIds?.length || 0}, roleUserIds count=${roleUserIds?.length || 0}, allUserIds count=${allUserIds?.length || 0}: ${JSON.stringify(allUserIds)}`);

          if (allUserIds.length > 1000) {
            this.logger.warn(`[handleBPMNAfterCreation] Role ${targetRole} has too many users (${allUserIds.length}). Limiting to first 1000 to prevent RAM overflow.`);
            allUserIds = allUserIds.slice(0, 1000);
          }

          const wis = (allUserIds || []).map((userId) => ({
            id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            nodeId: branch.nodeId,
            assigneeUserId: userId,
            role: branch.role,
            nodeType: branch.node_type || branch.type,
          }));
          if (wis.length) {
            await this.sqlRepo.addManyWorkItems(meeting.id, wis, undefined, flowConfig);
          }
          await this.sqlRepo.updateMeetingStateTx(meeting.id, MEETING_STATE.DU_KIEN);

          this.notificationService.createForRecipients({
            recipientIds: allUserIds,
            senderId: originalUserId,
            type: NotificationType.MEETING_APPROVAL_REQUESTED.value,
            content: `Bạn có cuộc họp yêu cầu phê duyệt "${meeting.title}" lúc ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)}`,
            recordId: meeting.id,
            link: `/meetings/${meeting.id}?listparammeeting=APPROVER_MEETING`,
            key: NotificationKey.VIEW_MEETING_ROOM,
            time: new Date(),
            status: 0,
          });
        }

        if (assignType === 'NGUOI_SOAN_THAO') {
          await this.sqlRepo.updateAuditNodes(meeting.id, originalUserId, branch.nodeId);
        }
      }
    } else {
      const workItem = {
        id: `wi_${Date.now()}`,
        nodeId: nextNode.id,
        role,
        assigneeUserId: originalUserId,
        nodeType: nextNode.$type,
      };

      await this.sqlRepo.addWorkItem(meeting.id, workItem);
      await this.sqlRepo.addAudit(meeting.id, {
        userId: originalUserId,
        role,
        actionCode: 'CREATE',
        fromNodeId: nextNode.id,
        toNodeId: nextNode.id,
        created_by: originalUserId,
        receiver: originalUserId || null,
        receiver_unit: null,
        roleProcess: 'processor',
        action: 'Tạo mới cuộc họp',
        deadline: null,
        details: null,
        stage_status: 'CHUA_XU_LY',
        curStatusCode: statusCode,
        typeDocument: this.typeDocument,
      });

      await this.sqlRepo.createComment({
        documentId: meeting.id,
        userId: originalUserId,
        userName: nameOriginalUser || originalUserId,
        content: 'Tạo mới cuộc họp',
      });
    }
  }

  // private async getCreatedMeetingWithTasks(meetingId: string) {
  //   const createdMeeting = await this.meetingRepo.findOne({
  //     where: { id: meetingId },
  //     relations: ['onlineMeeting', 'recurrence', 'units', 'units.participants', 'guests'],
  //   });

  //   if (!createdMeeting) {
  //     throw new Error('Meeting not found after creation');
  //   }

  //   const allTasks = await this.taskRepo.find({
  //     where: { meetingId: meetingId },
  //   });

  //   (createdMeeting as any).tasks = allTasks.filter((t) => t.attachableType === 'MEETING');

  //   // Group tasks by attachableId for O(1) lookups inside the loop
  //   const tasksByAttachableId = new Map<string, MeetingTaskEntity[]>();
  //   for (const t of allTasks) {
  //     if (t.attachableId) {
  //       if (!tasksByAttachableId.has(t.attachableId)) {
  //         tasksByAttachableId.set(t.attachableId, []);
  //       }
  //       tasksByAttachableId.get(t.attachableId)!.push(t);
  //     }
  //   }

  //   for (const unit of createdMeeting.units ?? []) {
  //     (unit as any).tasks = tasksByAttachableId.get(unit.id) || [];
  //     for (const p of unit.participants ?? []) {
  //       (p as any).tasks = tasksByAttachableId.get(p.id) || [];
  //     }
  //   }
  //   return createdMeeting;
  // }



  private mapTasksToDtoV2(tasks: MeetingTaskEntity[]) {
    return tasks.map((task) => ({
      id: task.id ?? '',
      content: task.content ?? '',
      documentName: task.documentName ?? '',
      deadline: task.deadline,
      attachableRole: task.attachableRole ?? '', // ✅ Add this
      attachableType: task.attachableType ?? '',
    }));
  }

  private calculateMeetingStatusStatistics(params: {
    allParticipants: any[];
    units: any[];
    allTasks: any[];
    taskStats: { total: number; completed: number };
    isOnline: boolean;
    isCompany: boolean;
    needConfirmation?: boolean;
  }): { overallStatus: any; details: any[] } {
    const { allParticipants, units, allTasks, taskStats, isOnline, isCompany, needConfirmation } = params;
    // console.log(allParticipants);
    // Lọc tất cả những người không từ chối tham gia
    const participantsFiltered = allParticipants.filter(p => p.participantState !== 'NOT_PARTICIPATE');

    const validUnits = units.filter(
      u => u.unitId !== 'CHAIRMAN_UNIT' && u.unitId !== 'SECRETARY_UNIT' && u.isRoomSelected === true
    );
    const hasChairman = participantsFiltered.some(p => p.participantRole === 'CHAIRMAN');
    const hasSecretary = participantsFiltered.some(p => p.participantRole === 'SECRETARY');
    const normalParticipants = participantsFiltered.filter(
      p => p.participantRole !== 'CHAIRMAN' && p.participantRole !== 'SECRETARY'
    );
    const hasAnyParticipant = normalParticipants.length > 0 || validUnits.length > 0;

    const totalAssignedComponents = [hasChairman, hasSecretary, hasAnyParticipant].filter(Boolean).length;
    let participantText = '';
    let participantStatus: 'SUCCESS' | 'WARNING' = 'SUCCESS';

    if (totalAssignedComponents === 0) {
      participantText = 'Chưa gán thành phần tham gia';
      participantStatus = 'WARNING';
    } else if (totalAssignedComponents < 3) {
      participantText = 'Chưa gán đủ thành phần tham gia';
      participantStatus = 'WARNING';
    } else {
      participantText = 'Đã gán thành phần tham dự';
      participantStatus = 'SUCCESS';
    }

    const participantsForConfirm = participantsFiltered.filter(
      p => p.assignmentType !== 'REPLACED'
    );

    const confirmedParticipants = participantsForConfirm.filter((p) => {
      // Ủy quyền → auto tính
      if (p.assignmentType === 'DELEGATED') return true;

      // Người được assign ban đầu → phải confirm
      if (p.assignmentType === 'INITIAL') {
        return p.acceptJoin === true &&
          !NOT_CONFIRMED_STATES.has(p.participantState ?? 'RECEIVED');
      }

      return false;
    }).length;

    const assignedParticipants = normalParticipants.filter(p => p.roomId != null && p.seatNumber != null).length;

    const assignedUnits = validUnits.filter(u => u.assignParticipants === true);

    const totalDocuments = allTasks.length;
    const preparedDocuments = allTasks.filter(t => t.isDocumentPrepared === true).length;

    const totalTasks = Number(taskStats.total) || 0;
    const completedTasks = Number(taskStats.completed) || 0;

    const detailsReady: any[] = [];

    // Gán thành phần tham dự luôn hiển thị
    detailsReady.push({
      label: participantText,
      status: participantStatus
    });

    if (validUnits.length > 0) {
      detailsReady.push({
        label: 'Đơn vị gán người tham gia',
        current: assignedUnits.length,
        total: validUnits.length
      });
    }

    if (normalParticipants.length > 0) {
      if (needConfirmation !== false) {
        detailsReady.push({
          label: 'Cá nhân xác nhận tham gia',
          current: confirmedParticipants,
          total: participantsForConfirm.length
        });
      }

      if (isCompany && !isOnline && normalParticipants.length > 0) {
        detailsReady.push({
          label: 'Gán vị trí ngồi',
          current: assignedParticipants,
          total: normalParticipants.length
        });
      }
    }

    if (totalDocuments > 0) {
      detailsReady.push({ label: 'Tài liệu', current: preparedDocuments, total: totalDocuments });
    }

    if (totalTasks > 0) {
      detailsReady.push({ label: 'Công việc', current: completedTasks, total: totalTasks });
    }

    const finalDetails = detailsReady.map(item => {
      if ('status' in item) return item; // giữ nguyên status custom cho "Gán thành phần tham dự"
      return {
        ...item,
        status: item.current >= item.total ? 'SUCCESS' : 'WARNING',
      };
    });

    const issuesCount = finalDetails.filter(d => d.status !== 'SUCCESS').length;

    // Chỉ dựa vào số vấn đề còn tồn tại, bỏ phần kiểm tra thành phần thiếu
    const overallText = issuesCount > 0
      ? `Chưa sẵn sàng họp — còn ${issuesCount} vấn đề cần xử lý`
      : 'Cuộc họp đã sẵn sàng';

    const overallStatus = {
      text: overallText,
      type: issuesCount > 0 ? 'WARNING' : 'SUCCESS',
      issuesCount,
    };

    return { overallStatus, details: finalDetails };
  }
  async getDetail(
    id: string,
    userId: string,
    listparammeeting?: string,
    req?: any
  ): Promise<{ success: boolean; message?: string; data?: any }> {
    const details = `Truy cập chi tiết cuộc họp, ID cuộc họp: ${id}`;
    try {
      let isProcessList = false;
      let isApproverList = false;
      let isPrepareList = false;
      let isSeatAssignmentList = false;
      let isNoActionList = false;
      let isNoActionPrepare = false;
      let isNoActionApprove = false;
      let isParticipantMeeting = false;

      if (listparammeeting === 'APPROVER_MEETING') isApproverList = true; // chi tiết để ban quản lý phòng phê duyệt 
      if (listparammeeting === 'PROCESS_MEETING') isProcessList = true; // chi tiết cho văn thư xử lý lịch
      if (listparammeeting === 'PREPARE_MEETING') isPrepareList = true; // chi tiết cho người soạn lịch
      if (listparammeeting === 'SEAT_ASSIGNMENT_MEETING') isSeatAssignmentList = true; // chi tiết cho ban quản lý phòng gán vị trị chỗ ngồi
      if (listparammeeting === 'NO_ACTION') isNoActionList = true; // chi tiết ở các màn lịch tổng công ty không cần trả ra actionAvailable
      if (listparammeeting === 'NO_ACTION_PREPARE') isNoActionPrepare = true; // chi tiết cho người soạn lịch màn không cần trả ra actionAvailable
      if (listparammeeting === 'NO_ACTION_APPROVER') isNoActionApprove = true; // chi tiết cho ban quản lý phòng khong cần trả ra actionAvailable
      if (listparammeeting === 'PARTICIPANT_MEETING') isParticipantMeeting = true; // chi tiết cho người tham gia
      const meeting = await this.meetingRepo.findOne({
        where: { id },
        relations: ['onlineMeeting', 'recurrence', 'units', 'units.participants', 'guests',],
      });

      if (!meeting) {
        return { success: false, message: 'Không tìm thấy cuộc họp' };
      }

      if (!meeting.recurrence) {
        if (meeting.recurrenceGroupId) {
          meeting.recurrence = await this.recurrenceRepo.findOne({
            where: { id: meeting.recurrenceGroupId },
          }) ?? undefined;
        } else if (meeting.parentId) {
          meeting.recurrence = await this.recurrenceRepo.findOne({
            where: { meeting: { id: meeting.parentId } },
          }) ?? undefined;
        }
      }

      const [userRoleRes, userRes, taskStats, rooms, allTasks, unitSeats] = await Promise.all([
        this.userService.getUserRole(userId, meeting.bpmnVersion || 'QUY_TRINH_LICH_HOP'),
        this.userRepo.findOne({
          where: { id: userId },
          relations: ['parent'],
          select: ['id'],
        }),
        this.taskEntityRepo.createQueryBuilder('t')
          .select([
            'COUNT(*) as total',
            `SUM(CASE WHEN t.processStatus = '4' THEN 1 ELSE 0 END) as completed`,
          ])
          .where('t.meetingId = :meetingId', { meetingId: id })
          .andWhere('t.status = 1').andWhere('t.meeting_conclusion_id IS NULL')
          .getRawOne(),
        // Rooms
        (async () => {
          const roomIdsArray = meeting.roomIds?.split(',').filter(Boolean) || [];
          if (!roomIdsArray.length) return [];
          // Họp ngoài công ty: roomIds chứa tên địa điểm, không phải ID phòng
          if (meeting.meetingMode === 'OUTSIDETHECOMPANY') {
            return roomIdsArray.map((name) => ({ id: name, name, totalSeating: 0, capacity: 0 }));
          }
          return this.meetingRoomRepo.find({
            where: { id: In(roomIdsArray) },
            relations: ['layoutItems'],
          });
        })(),

        // All tasks
        this.taskRepo.find({
          where: { meetingId: id },
          order: { createdAt: 'ASC' },
        }),

        // Unit seats
        this.meetingUnitSeatRepo.find({
          where: { unit: { meeting: { id: meeting.id } } },
          relations: ['unit'],
        }),
      ]);

      const participantCounts: Record<string, number> = {}
      const userIdSet = new Set<string>()
      const allParticipants: any[] = []

      let chairmanParticipant: any = null
      let secretaryParticipant: any = null
      let myParticipant: any = null

      for (const unit of meeting.units ?? []) {
        for (const p of unit.participants ?? []) {

          allParticipants.push(p)

          if (p.roomId && p.seatNumber) {
            participantCounts[p.roomId] = (participantCounts[p.roomId] ?? 0) + 1
          }

          if (p.userId) userIdSet.add(p.userId)
          if (p.delegatedToUserId) userIdSet.add(p.delegatedToUserId)
          if (p.delegatedFromUserId) userIdSet.add(p.delegatedFromUserId)

          // ===== Lưu chairman / secretary =====
          if (!chairmanParticipant && p.participantRole === 'CHAIRMAN') {
            chairmanParticipant = p
          }

          if (!secretaryParticipant && p.participantRole === 'SECRETARY') {
            secretaryParticipant = p
          }

        }
      }

      // ===== Ưu tiên delegate trước =====
      myParticipant = allParticipants.find(p =>
        p.delegatedToUserId === userId &&
        (p.delegationState === DelegationState.ACCEPTED || p.delegationState === 'ACCEPTED' || p.assignmentType === AssignmentType.DELEGATED || p.assignmentType === 'DELEGATED')
      );

      // ===== Nếu không có mới nhận user trực tiếp =====
      if (!myParticipant) {
        myParticipant = allParticipants.find(p => p.userId === userId);
      }

      if (meeting.chairmanId) userIdSet.add(meeting.chairmanId);
      if (meeting.secretaryId) userIdSet.add(meeting.secretaryId);

      // ===== FALLBACK nếu chưa có =====
      if (!myParticipant) {
        if (chairmanParticipant?.userId === userId) {
          myParticipant = chairmanParticipant
        } else if (secretaryParticipant?.userId === userId) {
          myParticipant = secretaryParticipant
        }
      }

      // --- Chuẩn bị dữ liệu phụ trợ ---
      const roomIdsArray = meeting.roomIds ? meeting.roomIds.split(',').filter(Boolean) : [];

      const taskMap = new Map<string, any[]>();
      let totalDocuments = 0;
      let preparedDocuments = 0;

      for (const t of allTasks) {
        const key = `${t.attachableType}_${t.attachableId}`;
        if (!taskMap.has(key)) taskMap.set(key, []);
        taskMap.get(key)!.push(t);

        totalDocuments++;
        if (t.isDocumentPrepared) {
          preparedDocuments++;
        }
      }
      const unpreparedDocuments = totalDocuments - preparedDocuments;

      // Fetch guests for the meeting
      const allGuests = meeting.guests ?? [];

      // Users map (bao gồm cả chairman & secretary từ participants)
      const unitSeatMap = new Map<string, { roomId: string; seatNumber: string[] }[]>();

      for (const us of unitSeats) {
        if (!unitSeatMap.has(us.unit.id)) {
          unitSeatMap.set(us.unit.id, []);
        }

        const list = unitSeatMap.get(us.unit.id)!;
        let room = list.find((r) => r.roomId === us.roomId);

        if (!room) {
          room = { roomId: us.roomId, seatNumber: [] };
          list.push(room);
        }

        room.seatNumber.push(us.seatNumber);
      }
      // Kiểm tra phòng có đủ chô cho người tham gia không 
      const totalParticipantsCount = allParticipants.length;
      const totalGuestsCount = allGuests.length;

      const totalSeats = rooms.reduce((sum, r) => {
        return sum + (r.totalSeating || r.capacity || 0);
      }, 0);

      const totalPeople = totalParticipantsCount + totalGuestsCount;

      const isEnoughSeat = totalPeople <= totalSeats;
      // Tasks cấp meeting
      const meetingTasks = taskMap.get(`MEETING_${meeting.id}`) ?? [];

      const roomMap = rooms.reduce((map, r) => { map[r.id] = r; return map; }, {} as Record<string, any>,);

      const userIds = [...userIdSet];

      const userMap: Record<string, string> = {};
      const userUnitMap: Record<string, { unitId: string | null; unitName: string | null; position: string }> = {};

      const userInfoMap = await this.getUsersInfo(userIds);

      for (const id of userIds) {
        const u = userInfoMap.get(id);

        userMap[id] = u?.name || id;

        userUnitMap[id] = {
          unitId: u?.unitId ?? null,
          unitName: u?.unitName ?? null,
          position: u?.position ?? '',
        };
      }

      // Collect unit IDs for bulk fetch
      const unitIdsToFetch = (meeting.units ?? [])
        .map(u => u.unitId)
        .filter(id => id && id !== 'CHAIRMAN_UNIT' && id !== 'SECRETARY_UNIT');

      if (meeting.chairmanType === ParticipantType.UNIT && meeting.chairmanId) {
        unitIdsToFetch.push(meeting.chairmanId);
      }
      if (meeting.secretaryType === ParticipantType.UNIT && meeting.secretaryId) {
        unitIdsToFetch.push(meeting.secretaryId);
      }

      const fetchedOrgUnits = await this.getOrgUnitsInfo(unitIdsToFetch);
      const orgUnitMap: Record<string, any> = {};
      for (const [id, org] of fetchedOrgUnits) {
        orgUnitMap[id] = org;
      }

      const userContext = {
        userId,
        roles: userRoleRes?.roles || [],
        receiverUnit: userRes?.parent?.id ?? null,
      };

      const participantSummary = {
        ...calculateParticipantSummaryByState(allParticipants),
        totalGuests: totalGuestsCount,
        totalPeople: allParticipants.length + totalGuestsCount,
      };

      // 2. Fallback sang unit ảo (nếu còn dùng)
      if (!chairmanParticipant) {
        const chairmanUnit = meeting.units?.find(
          (u) => u.unitId === 'CHAIRMAN_UNIT',
        );
        chairmanParticipant = chairmanUnit?.participants?.[0] || null;
      }

      const secretaryUnit = meeting.units?.find(
        (u) => u.unitId === 'SECRETARY_UNIT',
      );
      const secretaryParticipants = secretaryUnit?.participants ?? [];

      const chairmanDetail = await this.buildParticipantDetail(chairmanParticipant, meeting.chairmanId, userMap, userUnitMap, taskMap, meeting.chairmanType, orgUnitMap);

      const secretariesDetails = await Promise.all(
        secretaryParticipants.map(async (sp) => {
          const detail = await this.buildParticipantDetail(
            sp,
            sp.userType === UserType.UNIT ? sp.unitId : sp.userId,
            userMap,
            userUnitMap,
            taskMap,
            sp.userType === UserType.UNIT ? ParticipantType.UNIT : ParticipantType.USER,
            orgUnitMap
          );
          return detail[0] || null;
        })
      ).then(res => res.filter(Boolean));

      const secretaryDetail = secretariesDetails;

      const isChairman = isParticipantOwner(chairmanParticipant, userId) || meeting.chairmanId === userId || chairmanParticipant?.userId === userId;
      const isSecretary = secretaryParticipants.some(sp => isParticipantOwner(sp, userId)) || meeting.secretaryId === userId || secretaryParticipant?.userId === userId;
      const isParticipant = !!myParticipant; // Người dùng có phải người tham gia

      const myParticipantIds = allParticipants.filter(p =>
        p.userId === userId ||
        (p.delegatedToUserId === userId && p.delegationState === 'ACCEPTED')
      ).map(p => p.id);

      const hasDocumentUser = myParticipantIds.some(pid =>
        (taskMap.get(`PARTICIPANT_${pid}`)?.length ?? 0) > 0
      );
      // Kiểm tra có phải là người được văn thư gán không
      const isReplacedParticipant = myParticipant?.assignmentType === AssignmentType.REPLACED;
      // Người được gán từ đầu
      const isInitialParticipant = myParticipant?.assignmentType === AssignmentType.INITIAL;
      // Người được ủy quyền
      const isDelegatedParticipant =
        myParticipant?.delegatedToUserId === userId &&
        (myParticipant?.delegationState === DelegationState.ACCEPTED ||
          myParticipant?.delegationState === ('ACCEPTED' as any) ||
          myParticipant?.participantState === ParticipantState.DELEGATED ||
          myParticipant?.participantState === ('DELEGATED' as any) ||
          myParticipant?.assignmentType === AssignmentType.DELEGATED ||
          myParticipant?.assignmentType === ('DELEGATED' as any));
      // Kiểm tra là người tạo 
      const isCreatedByMe = meeting.createdBy === userId;
      const isDelegating =
        myParticipant?.assignmentType === 'DELEGATED' &&
        myParticipant?.userId === userId &&
        !!myParticipant?.delegatedToUserId &&
        myParticipant?.delegationState === 'ACCEPTED';
      const attendanceStatus = {
        isParticipant,
        isAttended: !!myParticipant?.attendanceAt,
        attendanceAt: myParticipant?.attendanceAt || null,
      };

      let peopleInRoom: any = null;
      const myUnit = meeting.units?.find((u) => {
        if (!u.unitId) return false;

        const org = orgUnitMap[u.unitId];
        if (!org) return false;

        return (
          u.unitId === userContext.receiverUnit ||
          org.parentId === userContext.receiverUnit
        );
      }) || null;

      const hasDocumentUnit = !!myUnit && (taskMap.get(`UNIT_${myUnit.id}`)?.length ?? 0) > 0;
      if (myUnit) {

        const isUnitConfirmed = isConfirmedState(myUnit.unitState);
        peopleInRoom = {
          id: myUnit.id,
          unitId: myUnit.unitId,
          unitName: orgUnitMap[myUnit.unitId]?.name || null,
          isUnitConfirmed,
          tasks: this.mapTasksToDtoV2(
            taskMap.get(`UNIT_${myUnit.id}`) ?? []
          ),
          members: (myUnit.participants ?? []).map((p) => {
            return {
              id: p.id,
              userId: p.userId,
              userName: userMap[p.userId] || p.userId,

              // riêng từng người
              roomId: p.roomId,
              roomName: p.roomId ? roomMap[p.roomId]?.name || null : null,
              seatNumber: p.seatNumber,

              participantState: p.participantState,
              isConfirmed: isConfirmedState(p.participantState),
              isNotConfirmed: isNotConfirmedState(p.participantState),
              isNotParticipant: p.participantState === ParticipantState.NOT_PARTICIPATE,
              isAssigned: p.roomId != null && p.seatNumber != null,

              tasks: this.mapTasksToDtoV2(
                taskMap.get(`PARTICIPANT_${p.id}`) ?? []
              ),
            }
          }),
        };
      }

      // Tasks của đơn vị trong phòng
      const unitRoomTasksMap: Record<string, TaskDto[]> = {};

      await Promise.all(
        (meeting.units ?? [])
          .filter(u => u.unitId !== 'CHAIRMAN_UNIT' && u.unitId !== 'SECRETARY_UNIT')
          .map(async unit => {
            const rawUnitTasks = taskMap.get(`UNIT_${unit.id}`) ?? [];

            unitRoomTasksMap[unit.unitId] =
              await this.mapTasksToDto(rawUnitTasks, userId, true);
          })
      );
      const isCancelled = meeting.meetingState === MEETING_STATE.DA_HUY;
      const isOnline = meeting.meetingMode === 'ONLINE';
      const isCompany = meeting.isCompany === true;
      const unitConfirmSummary = calculateUnitConfirmSummary(meeting.units);
      const meetingTypeTitle = this.meetingTypeCache.get(meeting.meetingType) || meeting.meetingType;
      const priorityTitle = this.meetingTypeCache.get(meeting.priority) || meeting.priority;
      const recurrenceType = meeting.recurrence?.type;
      const recurrenceTypeTitle = recurrenceType ? this.meetingTypeCache.get(recurrenceType) : recurrenceType;
      const meetingStatusStatistics = this.calculateMeetingStatusStatistics({
        allParticipants,
        units: meeting.units ?? [],
        allTasks,
        taskStats,
        isOnline,
        isCompany,
        needConfirmation: meeting.needConfirmation,
      });
      const isRejectUser = myParticipant && myParticipant.participantState === MEETING_PARTICIPANT_STATE.NOT_PARTICIPATE;
      if (isRejectUser) {
        isNoActionList = true;
      }
      if (isNoActionList) {
        isProcessList = false;
        isApproverList = false;
        isPrepareList = false;
        isSeatAssignmentList = false;
        isNoActionPrepare = false;
        isNoActionApprove = false;
      }
      const hasSecretaryUnitParticipant = meeting.units?.some(
        (u) =>
          u.unitId === 'SECRETARY_UNIT' &&
          (u.participants ?? []).some((p) => {
            const isUnitSecretary =
              p.participantRole === 'SECRETARY' &&
              (
                p.userType === UserType.UNIT ||
                meeting.secretaryType === ParticipantType.UNIT
              );

            if (!isUnitSecretary) {
              return false;
            }

            return (
              p.unitId === userContext.receiverUnit ||
              meeting.secretaryId === userContext.receiverUnit
            );
          }),
      ) ?? false;

      const hasMyUnitInMeeting = meeting.units?.some(
        (u) =>
          u.unitId === userContext.receiverUnit &&
          u.isRoomSelected === true &&
          u.unitId !== 'CHAIRMAN_UNIT' &&
          u.unitId !== 'SECRETARY_UNIT',
      ) ?? false;

      let assignOnlyRoom = false;
      let assignOnlySecretary = false;
      let assignRoomAndSecretary = false;

      assignOnlyRoom = hasMyUnitInMeeting && !hasSecretaryUnitParticipant;
      assignOnlySecretary =
        hasSecretaryUnitParticipant && !hasMyUnitInMeeting;
      assignRoomAndSecretary =
        hasMyUnitInMeeting && hasSecretaryUnitParticipant;

      // Xác định phòng ban thực tế của Chủ trì & Thư ký
      const chairmanUserId = chairmanDetail[0]?.userId || meeting.chairmanId;
      let chairmanActualUnitId: string | null = null;
      let chairmanActualUnitName: string | null = null;
      if (chairmanUserId) {
        if (meeting.chairmanType === ParticipantType.UNIT) {
          chairmanActualUnitId = chairmanUserId;
          chairmanActualUnitName = orgUnitMap[chairmanUserId]?.name || null;
        } else {
          chairmanActualUnitId = userUnitMap[chairmanUserId]?.unitId ?? null;
          chairmanActualUnitName = userUnitMap[chairmanUserId]?.unitName ?? null;
        }
      }

      const secretaryUserId = secretaryDetail[0]?.userId || meeting.secretaryId;
      let secretaryActualUnitId: string | null = null;
      let secretaryActualUnitName: string | null = null;
      if (secretaryUserId) {
        if (meeting.secretaryType === ParticipantType.UNIT) {
          secretaryActualUnitId = secretaryUserId;
          secretaryActualUnitName = orgUnitMap[secretaryUserId]?.name || null;
        } else {
          secretaryActualUnitId = userUnitMap[secretaryUserId]?.unitId ?? null;
          secretaryActualUnitName = userUnitMap[secretaryUserId]?.unitName ?? null;
        }
      }

      const mapUnit = (unit: any, isNew: boolean, overrideUnitId?: string | null, overrideUnitName?: string | null, additionalUnits: any[] = []) => {
        const orgUnit = overrideUnitId ? null : orgUnitMap[unit.unitId];
        const isUnitConfirmed = isConfirmedState(unit.unitState);
        const unitParticipants = isNew ? [] : (unit.participants ?? []);
        const { total, confirmed } = calculateUnitParticipantConfirm(unitParticipants);

        const unitTasks = taskMap.get(`UNIT_${unit.id}`) ?? [];
        const participantTasks = (unit.participants ?? []).flatMap(p => taskMap.get(`PARTICIPANT_${p.id}`) ?? []);
        const mergedTasks = [...unitTasks, ...participantTasks];

        for (const addUnit of additionalUnits) {
          const addUnitTasks = taskMap.get(`UNIT_${addUnit.id}`) ?? [];
          const addPartTasks = (addUnit.participants ?? []).flatMap(p => taskMap.get(`PARTICIPANT_${p.id}`) ?? []);
          mergedTasks.push(...addUnitTasks, ...addPartTasks);
        }

        return {
          id: unit.id,
          unitId: overrideUnitId || unit.unitId,
          unitName: overrideUnitName || orgUnit?.name || null,
          unitState: unit.unitState,
          isUnitConfirmed,
          participantConfirmSummary: {
            confirmed,
            total,
          },
          isRoomSelected: isNew ? false : unit.isRoomSelected,
          sittingPosition: unitSeatMap.get(unit.id) || [],
          tasks: this.mapTasksToDtoV2(mergedTasks),
          participants: unitParticipants.map((participant) => {
            const isDelegated = participant.assignmentType === 'DELEGATED' && participant.delegatedToUserId && participant.delegationState === 'ACCEPTED';
            const displayUserId: string = isDelegated && participant.delegatedToUserId ? participant.delegatedToUserId : participant.userId;
            const delegateFromPosition = isDelegated && participant.delegatedFromUserId ? userUnitMap[participant.delegatedFromUserId]?.position || '' : null;
            return {
              id: participant.id,
              userId: displayUserId,
              userName: userMap[displayUserId] || displayUserId,
              seatNumber: participant.seatNumber,
              receiverUnitId: userUnitMap[participant.userId]?.unitId ?? null,
              receiverUnitName: userUnitMap[participant.userId]?.unitName ?? null,
              roomId: participant.roomId,
              attendanceAt: participant.attendanceAt,
              isConfirmed: isConfirmedState(participant.participantState),
              isNotConfirmed: isNotConfirmedState(participant.participantState),
              isNotParticipant: participant.participantState === ParticipantState.NOT_PARTICIPATE,
              participantState: participant.participantState,
              isAssigned: participant.roomId != null && participant.seatNumber != null,
              room: participant.roomId ? { ...roomMap[participant.roomId], count: participantCounts[participant.roomId] || 0, } : null,
              originalUserId: participant.userId,
              originalUserName: userMap[participant.userId],
              delegateFromPosition,
              isDelegated: isDelegated,
              tasks: this.mapTasksToDtoV2(
                taskMap.get(`PARTICIPANT_${participant.id}`) ?? []
              ),
              delegateInfo: isDelegated ? userMap[participant.userId] : null
            };
          }),
        };
      };

      const meetingDetail = {
        id: meeting.id,
        title: meeting.title,
        location: meeting.location,
        content: meeting.content,
        meetingDate: meeting.meetingDate,
        meetingTime: meeting.meetingTime,
        meetingMode: meeting.meetingMode,
        isCompany: meeting.isCompany,
        needConfirmation: meeting.needConfirmation,
        guests: allGuests,
        status: meeting.status,
        statusCode: meeting.statusCode,
        bpmnVersion: meeting.bpmnVersion,
        meetingType: meetingTypeTitle,
        priority: priorityTitle,
        directCommand: meeting.directCommand,
        chairmanId: chairmanDetail[0]?.userId || null,
        secretaryId: secretaryDetail[0]?.userId || null,
        onlineMeeting: meeting.onlineMeeting || null,
        meetingState: meeting.meetingState,
        attendanceLocked: meeting.attendanceLocked,
        meetingStartTime: meeting.startedAt,
        isAssigningSeat: meeting.isAssigningSeat,
        meetingEndTime: meeting.endedAt,
        meetingStatusStatistics: {},
        seatStatistics: {
          totalParticipants: totalParticipantsCount,
          totalGuests: totalGuestsCount,
          totalPeople: totalPeople,
          totalSeats: totalSeats,
          isEnoughSeat: !isEnoughSeat
        },
        assignOnlyRoom,
        assignOnlySecretary,
        assignRoomAndSecretary,
        isRejectUser,
        isInsufficient: !isEnoughSeat,
        recurrence: buildRecurrence(
          meeting.recurrence,
          recurrenceTypeTitle
        ),
        roomIds: roomIdsArray.map((roomId) => ({
          ...roomMap[roomId],
          count: participantCounts[roomId] || 0,
          hasAssigned: (participantCounts[roomId] || 0) > 0,
        })),

        createdAt: normalizeDateValueHHmmDDMMYYYY(meeting.createdAt),
        updatedAt: normalizeDateValueHHmmDDMMYYYY(meeting.updatedAt),

        tasks: this.mapTasksToDtoV2(meetingTasks),

        // Chairman & Secretary lấy từ participant của unit ảo
        chairman: chairmanDetail,
        secretary: secretaryDetail,
        secretaries: secretariesDetails,

        // Units (hiển thị đầy đủ phòng ban chuẩn và danh sách thành viên, không bao gồm chủ trì/thư ký)
        units: (() => {
          const realUnits = (meeting.units ?? []).filter((u) => u.unitId !== 'CHAIRMAN_UNIT' && u.unitId !== 'SECRETARY_UNIT');
          return realUnits.map((unit) => mapUnit(unit, false));
        })(),

        // unitDocument (hiển thị phòng ban của cả chủ trì và thư ký để lấy ra tất cả task, chỉ trả về phòng và task)
        unitDocument: (() => {
          const realUnits = (meeting.units ?? []).filter((u) => u.unitId !== 'CHAIRMAN_UNIT' && u.unitId !== 'SECRETARY_UNIT');
          const chairmanUnit = meeting.units?.find((u) => u.unitId === 'CHAIRMAN_UNIT');
          const secretaryUnit = meeting.units?.find((u) => u.unitId === 'SECRETARY_UNIT');

          let isChairmanMerged = false;
          let isSecretaryMerged = false;

          const mapUnitDoc = (unit: any, isNew: boolean, overrideUnitId?: string | null, overrideUnitName?: string | null, additionalUnits: any[] = []) => {
            const orgUnit = overrideUnitId ? null : orgUnitMap[unit.unitId];
            const unitTasks = taskMap.get(`UNIT_${unit.id}`) ?? [];
            const participantTasks = (unit.participants ?? []).flatMap(p => taskMap.get(`PARTICIPANT_${p.id}`) ?? []);
            const mergedTasks = [...unitTasks, ...participantTasks];

            for (const addUnit of additionalUnits) {
              const addUnitTasks = taskMap.get(`UNIT_${addUnit.id}`) ?? [];
              const addPartTasks = (addUnit.participants ?? []).flatMap(p => taskMap.get(`PARTICIPANT_${p.id}`) ?? []);
              mergedTasks.push(...addUnitTasks, ...addPartTasks);
            }

            return {
              id: unit.id,
              unitId: overrideUnitId || unit.unitId,
              unitName: overrideUnitName || orgUnit?.name || null,
              tasks: this.mapTasksToDtoV2(mergedTasks),
            };
          };

          const mapped = realUnits.map((unit) => {
            const additionalUnits: any[] = [];
            if (chairmanActualUnitId && unit.unitId === chairmanActualUnitId && chairmanUnit) {
              additionalUnits.push(chairmanUnit);
              isChairmanMerged = true;
            }
            if (secretaryActualUnitId && unit.unitId === secretaryActualUnitId && secretaryUnit) {
              additionalUnits.push(secretaryUnit);
              isSecretaryMerged = true;
            }
            return mapUnitDoc(unit, false, undefined, undefined, additionalUnits);
          });

          if (!isChairmanMerged && chairmanUnit && chairmanActualUnitId) {
            mapped.push(mapUnitDoc(chairmanUnit, true, chairmanActualUnitId, chairmanActualUnitName));
          }

          if (!isSecretaryMerged && secretaryUnit && secretaryActualUnitId) {
            mapped.push(mapUnitDoc(secretaryUnit, true, secretaryActualUnitId, secretaryActualUnitName));
          }

          return mapped;
        })(),
        // Cuộc họp bị hủy hay không
        // Cuộc họp bị hủy hay không
        isCancelled,

        isShowButtonCreateWork: false,
        isProcessList: isProcessList,
        isApproverList: isApproverList,
        isPrepareList: isPrepareList,
        isSeatAssignmentList: isSeatAssignmentList,
        // Người tạo
        createdBy: meeting.createdBy,
        // Người trong cùng đơn vị
        peopleInRoom,
        // Tasks của các đơn vị  
        unitRoomTasksMap,

        // Quyền chuẩn bị tài liệu & tham gia cuộc họp của phòng
        acceptJoin: myUnit?.acceptJoin === true, // Xác nhận tham gia cuộc họp
        assignParticipants: myUnit?.assignParticipants === true, // Đơn vị đã phân công người tham gia
        prepareDocuments: myUnit?.prepareDocuments === true, // Chuẩn bị tài liệu
        hasDocumentUnit,

        // Quyền chuẩn bị tài liệu & tham gia cuộc họp của người
        acceptJoinuUser: isConfirmedState(myParticipant?.participantState) || false, // Xác nhận tham gia cuộc họp
        prepareDocumentUser: myParticipant?.prepareDocuments === true, // Chuẩn bị tài liệu
        hasDocumentUser: isDelegating ? false : hasDocumentUser,
        documentMeetingSummary: {
          total: totalDocuments,
          prepared: preparedDocuments,
          unprepared: unpreparedDocuments,
        },
        // Thời gian cuộc họp
        meetingTimezone: meeting.timezone, // Timezone
        meetingDuration: null as any, // Thời gian của cuộc họp
        meetingStateLabel: null as any, // Trạn thái cuộc họp
        canAccessMeetingTabs: false,  // Trước 30 ph các tab xuất hiện
        isMeetingApproved: false, // Cuộc họp đã được phê duyệt chưa
        isStartEarly: false,
        isEarlyStart: false,
        // Phân quyền
        isChairman: false, // Màn của người chủ trì
        isSecretary: false, // Màn của thư ký
        isParticipant: false, // Màn của người tham gia
        isPersonalApprove: false, // Người duyệt cá nhân
        isParticipantInCurrentUnit: false, // Người tham gia được văn thư gán
        proceesMeeting: false, // Là văn thư xử lý
        isCreatedByMe: false, // Là người tạo
        isSeatAssignment: false,
        isCompanyUnitDetail: false,
        attendanceStatus, // Trạng thái điểm danh

        isDelegating: isDelegating, // Người hiện tại có ủy quyền không
        delegatedToUserId: isDelegating ? myParticipant?.delegatedToUserId : null, // Người hiện tại ủy quyền cho ai
        delegatedToUserName: isDelegating // tên của người được ủy quyền 
          ? userMap[myParticipant?.delegatedToUserId]
          : null,

        participantSummary, // Tổng số người tham gia
        unitConfirmSummary, // Tổng số phòng tham gia 
      };
      // const unitState = await this.getUnitState(meeting.id, userId); // Trạng thái của phòng tham gia văn thư
      const isMeetingApproved = await this.isMeetingApproved(meeting.id); // Kiểm tra xem cuộc họp được phê duyệt chưa
      const isMeetingRejected = await this.isMeetingRejected(meeting.id); // Kiểm tra xem cuộc họp bị từ chối phê duyệt chưa
      const isRoomRejected = await this.isRoomRejected(meeting.id); // Kiểm tra xem phòng họp bị từ chối chưa
      // Nếu cuộc họp đã được phê duyệt
      if (isMeetingApproved) {
        if (!isDelegating) {
          meetingDetail.meetingStatusStatistics = meetingStatusStatistics;
        }
        meetingDetail.isMeetingApproved = true;
        // Người tham gia được thư gán
        if (isReplacedParticipant) {
          meetingDetail.isParticipantInCurrentUnit = true;
        }
        // Văn thư đơn vị 
        if (isProcessList) {
          meetingDetail.proceesMeeting = true;
        }
        // Người phê duyệt
        if (isApproverList) {
          meetingDetail.isPersonalApprove = true;
        }
        // Người tạo cuộc họp
        if (isPrepareList) {
          meetingDetail.isCreatedByMe = isCreatedByMe;
        }
        // Người được gán từ đầu, người được thay thế hoặc người được ủy quyền
        if (isInitialParticipant || isReplacedParticipant || isDelegatedParticipant) {
          meetingDetail.isParticipant = true;
        }
        // Là người chủ trì thư ký
        if (isChairman) meetingDetail.isChairman = true;
        if (isSecretary) meetingDetail.isSecretary = true;

        // Người gán chỗ ngồi 
        if (isSeatAssignmentList) {
          meetingDetail.isSeatAssignment = true;
        }
      }
      // Chưa phê duyệt
      else {
        // Văn thư đơn vị 
        if (isProcessList) {
          meetingDetail.proceesMeeting = true;
        }
        // Người phê duyệt
        if (isApproverList) {
          meetingDetail.isPersonalApprove = true;
        }
        // Người tạo cuộc họp
        if (isPrepareList) {
          meetingDetail.isCreatedByMe = isCreatedByMe;
        }
      }
      const isDuKien = meeting.meetingState === MEETING_STATE.DU_KIEN;
      const meetingDuration = calculateMeetingDuration({
        meetingDate: meeting.meetingDate,
        meetingTime: meeting.meetingTime,
        startedAt: meeting.startedAt,
        endedAt: meeting.endedAt,
        meetingState: Object.values(MEETING_STATE).includes(
          meeting.meetingState as MEETING_STATE,
        )
          ? (meeting.meetingState as MEETING_STATE)
          : undefined,
      });

      meetingDetail.meetingDuration = meetingDuration;
      meetingDetail.meetingState = meetingDuration.state;
      meetingDetail.meetingStateLabel = meetingDuration.stateLabel;
      const isConfirmed = isConfirmedState(myParticipant?.participantState);

      const tz = meeting.timezone || 'Asia/Ho_Chi_Minh';

      const now = dayjs().tz(tz);

      const meetingStart = getMeetingStartTime(
        meeting.meetingDate,
        meeting.meetingTime,
        tz,
      );

      // vào mốc trước 30 phút hoặc nếu cuộc họp đã bắt đầu sớm (DANG_HOP / startedAt)
      let canAccessMeetingTabs = meeting.meetingMode === 'OUTSIDETHECOMPANY'
        ? false
        : isConfirmed && (
          // Cho phép hiển thị nếu trạng thái cuộc họp hợp lệ và (đã ở trạng thái DANG_HOP / startedAt hoặc thời gian hiện tại >= 30 phút trước giờ bắt đầu cuộc họp)
          !(meeting.meetingState === MEETING_STATE.DA_HUY || meeting.meetingState === MEETING_STATE.DU_KIEN) &&
          (meeting.meetingState === MEETING_STATE.DANG_HOP || !!meeting.startedAt || now.isAfter(meetingStart.subtract(30, 'minute')))
        );

      if ((isChairman || isSecretary) && isConfirmed) {
        canAccessMeetingTabs = true;
      }

      meetingDetail.canAccessMeetingTabs = canAccessMeetingTabs;

      const isStartEarly = now.isBefore(meetingStart.subtract(30, 'minute'));
      meetingDetail.isStartEarly = isStartEarly;
      meetingDetail.isEarlyStart = isStartEarly;


      let bpmnActorId: string;

      if (isProcessList) {
        if (!userContext.receiverUnit) {
          throw new Error('User chưa có phòng ban');
        }
        bpmnActorId = userContext.receiverUnit;
      } else {
        bpmnActorId = userContext.userId;
      }

      const { process, indexes } = await this.getBpmnModelCached(meeting.bpmnVersion);
      const [openWorkItems, isFollow] = await Promise.all([
        this.sqlRepo.listOpenWorkItems(meeting.id),
        this.sqlRepo.checkFollow(userContext.userId, meeting.id)
      ]);
      // Nút tạo công việc
      meetingDetail.isShowButtonCreateWork = (isMeetingApproved && meeting.meetingState === MEETING_STATE.DU_KIEN &&
        ['CONFIRMED', 'DONE', 'PROCESSING'].includes(myParticipant?.participantState ?? '') &&
        (isChairman || isSecretary)) || ((isCreatedByMe) && isMeetingApproved && meeting.meetingState === MEETING_STATE.DU_KIEN);
      // hasPersonalApproved là nguòi phê duyệt
      const roleCache = new Map();
      let sortedWorkItems = [...openWorkItems];
      const inFlowDetail = listparammeeting === 'APPROVER_MEETING' && userContext.roles?.includes('BAN_QUAN_LY_PHONG_HOP') && await this.isUserInFlow(userContext.userId, meeting.bpmnVersion || 'QUY_TRINH_LICH_HOP');
      if (listparammeeting === 'APPROVER_MEETING' && inFlowDetail && !isMeetingApproved) {
        const rules = await this.getRules(meeting.bpmnVersion || 'QUY_TRINH_LICH_HOP');
        const approverNodeId = rules?.['APPROVER_MEETING']?.id || 'Event_1et5lvd';
        const approverRole = rules?.['APPROVER_MEETING']?.role || 'BAN_QUAN_LY_PHONG_HOP';
        if (!sortedWorkItems.some(wi => wi.nodeId === approverNodeId)) {
          sortedWorkItems.push({
            id: `wi_virtual_${meeting.id}`,
            documentId: meeting.id,
            assigneeUserId: userId,
            nodeId: approverNodeId,
            nodeType: null,
            role: approverRole,
            state: 'open',
          } as any);
        }
      }
      if (isParticipantMeeting) {
        sortedWorkItems = sortedWorkItems.filter((wi) => wi.role === 'NGUOI_THAM_GIA');
      } else if (isProcessList) {
        const processWis = sortedWorkItems.filter(
          (wi) =>
            wi.assigneeUserId === bpmnActorId ||
            wi.assigneeUserId === userContext.receiverUnit ||
            wi.assigneeUserId === userContext.userId ||
            ((wi.role === 'DON_VI_THAM_GIA' || wi.role === 'VAN_THU') &&
              (!wi.assigneeUserId ||
                wi.assigneeUserId === bpmnActorId ||
                wi.assigneeUserId === userContext.receiverUnit ||
                wi.assigneeUserId === userContext.userId)),
        );
        if (processWis.length > 0) {
          sortedWorkItems = processWis;
        }
      }

      // Ưu tiên đưa workItem được giao cho user/đơn vị hiện tại lên đầu
      sortedWorkItems.sort((a, b) => {
        const aIsMine =
          a.assigneeUserId === bpmnActorId ||
          a.assigneeUserId === userContext.receiverUnit ||
          a.assigneeUserId === userContext.userId;
        const bIsMine =
          b.assigneeUserId === bpmnActorId ||
          b.assigneeUserId === userContext.receiverUnit ||
          b.assigneeUserId === userContext.userId;
        if (aIsMine && !bIsMine) return -1;
        if (!aIsMine && bIsMine) return 1;
        return 0;
      });

      // ===== XỬ LÝ KHÔNG HIỂN THỊ NÚT HỦY THAM GIA KHI CUỘC HỌP ĐÃ BẮT ĐẦU =====
      // 1. Kiểm tra cuộc họp đã ở trạng thái DANG_HOP hoặc đã có mốc thời gian bắt đầu (startedAt)
      const isMeetingStarted = meeting.meetingState === MEETING_STATE.DANG_HOP || meeting.meetingState === 'DANG_HOP' || !!meeting.startedAt;
      let cancelNodeIds = new Set<string>();

      if (isMeetingStarted) {
        // 2. Phân tích động sơ đồ BPMN thông qua resolveAutoConfirmUserNodes để lấy các node 'concurrentNodes' (nút Hủy tham gia)
        const resolvedAutoConfirm = await this.resolveAutoConfirmUserNodes(meeting.id, meeting.bpmnVersion || 'QUY_TRINH_LICH_HOP');
        if (resolvedAutoConfirm?.concurrentNodes?.length) {
          cancelNodeIds = new Set(
            resolvedAutoConfirm.concurrentNodes.map((n: any) => n?.id).filter(Boolean),
          );
        }
        // 3. Lọc bỏ các workItem thuộc các node Hủy tham gia khi cuộc họp đã bắt đầu
        if (cancelNodeIds.size > 0) {
          sortedWorkItems = sortedWorkItems.filter(
            wi => !cancelNodeIds.has(wi.nodeId) && (wi as any).actionCode !== 'HUY_THAM_GIA',
          );
        }
      }

      const perItems = await Promise.all(
        sortedWorkItems.map(async (wi) => {
          const res = await this.bpmnEngine.computeAvailableActions({
            process,
            indexes,
            currentNodeId: wi.nodeId,
            workItem: wi,
            document: meeting,
            userId: bpmnActorId,
            userRoles: userContext.roles,
            priorityRole: isParticipantMeeting ? 'NGUOI_THAM_GIA' : undefined,
            skipRedisRead: true,
            getUsersByRole: async (role) => {
              if (!roleCache.has(role)) {
                roleCache.set(role, await this.sqlsvRepo.getUsersByRoleMongoDB(role));
              }
              return roleCache.get(role);
            }
          });

          return {
            workItem: wi,
            node: res.node,
            availableActions: res.availableActions,
            flags: res.flags,
          };
        }),
      );

      const first = perItems.find((x) =>
        x.availableActions.some((a: any) => a.canExecute),
      );

      const summary = first ||
        perItems[0] || { workItem: null, availableActions: [], flags: {} };

      const summaryFlags = perItems.reduce(
        (acc, x) => ({ ...acc, ...x.flags }),
        {},
      );

      let finalAvailableActions: any[] = [];
      const seenActions = new Set<string>();
      for (const item of perItems) {
        if (item.availableActions) {
          for (const act of item.availableActions) {
            const key = `${act.code || ''}_${act.flowId || ''}`;
            if (!seenActions.has(key)) {
              seenActions.add(key);
              finalAvailableActions.push(act);
            }
          }
        }
      }

      // 4. Lọc bỏ hành động 'Hủy tham gia' ra khỏi danh sách finalAvailableActions nếu cuộc họp đã bắt đầu
      if (isMeetingStarted) {
        finalAvailableActions = finalAvailableActions.filter(act => {
          const actionCode = (act.actionCode || act.code || act.type || '').toUpperCase();
          const nodeId = act.nodeId || act.currentNodeId;
          if (actionCode === 'HUY_THAM_GIA' || (nodeId && cancelNodeIds.has(nodeId))) {
            return false;
          }
          return true;
        });
      }
      const isRecurringMeeting = !!meeting.recurrence?.type && meeting.recurrence.type !== RecurrenceType.KHONG;

      const isCancel = meeting.meetingState === MEETING_STATE.DA_HUY; // Lịch đã bị hủy
      // Ở tab soạn thảo và lịch được phê duyệt
      if (isPrepareList && isMeetingApproved && !isCancel && isDuKien) {
        // Nếu nó là người tham gia thì không cho hiển thị các Action ở tab này 
        finalAvailableActions = [];
        if (meeting.meetingState !== MEETING_STATE.KET_THUC) {
          finalAvailableActions.push(this.buildCancelAction(isRecurringMeeting))
        }
      } else if (isCreatedByMe && isMeetingApproved && !isCancel && isDuKien && !isProcessList) {
        if (!finalAvailableActions.some((a: any) => a.actionCode === 'CANCEL_MEETING')) {
          finalAvailableActions.push(this.buildCancelAction(isRecurringMeeting));
        }
      }
      if (isPrepareList && isCreatedByMe) {
        if (
          isRoomRejected ||
          (
            isMeetingApproved && (
              isMeetingRejected ||
              meeting.meetingState === MEETING_STATE.DU_KIEN ||
              meeting.meetingState === MEETING_STATE.DA_HUY
            )
          )
        ) {
          finalAvailableActions.push(this.buildEditAction(isRecurringMeeting))
        }
      }
      const canJoin = await this.isMeetingParticipantInState(
        id,
        userId,
        ['CHAIRMAN', 'SECRETARY'],
        'CONFIRMED',
      );
      // nếu thư ký hoặc chủ trì xác nhận tham gia thì hiển thị 
      if (canJoin && (isChairman || isSecretary) && isDuKien) {
        finalAvailableActions.push(this.buildCancelAction(isRecurringMeeting))
      }

      if (isNoActionList || isNoActionApprove) {
        finalAvailableActions = [];
        meetingDetail.isMeetingApproved = false;
        meetingDetail.isCancelled = false;

        meetingDetail.isShowButtonCreateWork = false;
        meetingDetail.isProcessList = false;
        meetingDetail.isApproverList = false;
        meetingDetail.isPrepareList = false;
        meetingDetail.isSeatAssignmentList = false;
        // Quyền chuẩn bị tài liệu & tham gia cuộc họp của phòng
        meetingDetail.acceptJoin = false; // Xác nhận tham gia cuộc họp
        meetingDetail.assignParticipants = false; // Đơn vị đã phân công người tham gia
        meetingDetail.prepareDocuments = false; // Chuẩn bị tài liệu
        meetingDetail.hasDocumentUnit = false;

        // Quyền chuẩn bị tài liệu & tham gia cuộc họp của người
        meetingDetail.acceptJoinuUser = false; // Xác nhận tham gia cuộc họp
        meetingDetail.prepareDocumentUser = false; // Chuẩn bị tài liệu
        meetingDetail.hasDocumentUser = false;
        meetingDetail.isCompanyUnitDetail = true;

        meetingDetail.isChairman = false; // Màn của người chủ trì
        meetingDetail.isSecretary = false; // Màn của thư ký
        meetingDetail.isParticipant = false; // Màn của người tham gia
        meetingDetail.isPersonalApprove = false; // Người duyệt cá nhân
        meetingDetail.isParticipantInCurrentUnit = false; // Người tham gia được văn thư gán
        meetingDetail.proceesMeeting = false; // Là văn thư xử lý
        meetingDetail.isCreatedByMe = false; // Là người tạo
        meetingDetail.isSeatAssignment = false;

        meetingDetail.isDelegating = false; // Người hiện tại có ủy quyền không
      }
      if (isNoActionPrepare) {
        finalAvailableActions = [];
        meetingDetail.isParticipant = false; // Màn của người tham gia
        meetingDetail.isCreatedByMe = true; // Là người tạo
        meetingDetail.meetingStatusStatistics = {};
      }
      // Hiển thị chi tiết của tab đã công bố
      if ((isNoActionApprove || isPrepareList) && isCreatedByMe && isMeetingApproved && !isCancel) {
        finalAvailableActions = [];
        if (meeting.meetingState !== MEETING_STATE.KET_THUC) {
          finalAvailableActions.push(this.buildEditAction(isRecurringMeeting));
          finalAvailableActions.push(this.buildCancelAction(isRecurringMeeting));
        }
        meetingDetail.isCreatedByMe = true; // Là người tạo

      }
      const rules = await this.getRules(meeting.bpmnVersion || 'QUY_TRINH_LICH_HOP');
      const approverRole = rules?.['APPROVER_MEETING']?.role || 'BAN_QUAN_LY_PHONG_HOP';
      const isApprover = userContext.roles?.includes(approverRole);
      if (isNoActionApprove && isMeetingApproved && !isCancel && isApprover && !isCreatedByMe) {
        finalAvailableActions = [];
        if (meeting.meetingState !== MEETING_STATE.KET_THUC) {
          finalAvailableActions.push(this.buildCancelAction(isRecurringMeeting));
        }
      }
      // Quyết định nút duyệt ủy quyền
      let isApproverForDelegation = false;
      if (meeting.createdBy === userId) {
        isApproverForDelegation = true;
      } else if (meeting.secretaryType === ParticipantType.USER && meeting.secretaryId === userId) {
        isApproverForDelegation = true;
      } else if (meeting.secretaryType === ParticipantType.UNIT && meeting.secretaryId) {
        if (isProcessList && userContext.receiverUnit === meeting.secretaryId) {
          isApproverForDelegation = true;
        }
      }

      if (isApproverForDelegation && (meeting.pendingDelegationCount || 0) > 0) {
        finalAvailableActions.push({
          actionCode: 'APPROVE_DELEGATE',
          actionName: `Ủy quyền (${meeting.pendingDelegationCount})`,
          canExecute: true,
          type: "approve_delegate",
        });
      }

      this.logAsync(req, userId, details, 'SUCCESS');

      return {
        success: true,
        data: {
          meeting: {
            ...meetingDetail,
            isFollow,
          },
          workItem: summary.workItem,
          nodeId: summary.workItem?.nodeId || null,
          role: summary.workItem?.role || null,
          availableActions: finalAvailableActions,
          flags: summaryFlags
        },
      };
    } catch (err) {
      this.logAsync(req, userId, details, 'ERROR');
      this.logger.error('Error in getDetail:', err);
      return {
        success: false,
        message: err?.message || 'Lấy chi tiết cuộc họp thất bại',
      };
    }
  }

  private async getUsersInfo(userIds: string[]) {
    if (!userIds?.length) return new Map<string, {
      name: string;
      position: string;
      unitId: string | null;
      unitName: string | null;
    }>();

    const users = await this.userRepo.find({
      where: { id: In(userIds) },
      select: ['id', 'name', 'position'],
      relations: ['parent'],
    });

    const map = new Map<string, {
      name: string;
      position: string;
      unitId: string | null;
      unitName: string | null;
    }>();

    for (const u of users) {
      map.set(u.id, {
        name: u.name,
        position: u.position ?? '',
        unitId: u.parent?.id ?? null,
        unitName: u.parent?.name ?? null,
      });
    }

    return map;
  }

  private async getOrgUnitsInfo(unitIds: string[]) {
    if (!unitIds?.length) return new Map<string, OrganizationUnitEntity>();

    const units = await this.orgUnitRepo.findBy({ id: In(unitIds) });
    const map = new Map<string, OrganizationUnitEntity>();
    for (const u of units) {
      map.set(u.id, u);
    }
    return map;
  }

  private async getUserReceiverUnit(userId: string): Promise<string> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['parent'],
      select: ['id'],
    });
    return user?.parent?.id ?? '';
  }

  private async getOrgUnitNameById(unitId: string): Promise<string> {
    if (!unitId) return '';
    const unit = await this.orgUnitRepo.findOne({ where: { id: unitId }, select: ['name'] });
    return unit?.name || unitId;
  }

  private async buildParticipantDetail(
    participant: any,
    fallbackUserId: string | null,
    userMap: Record<string, string>,
    userUnitMap: Record<string, any>,
    taskMap: Map<string, any[]>,
    type?: string,
    orgUnitMap: Record<string, any> = {}
  ) {
    if (participant) {
      const isDelegated =
        participant.assignmentType === 'DELEGATED' &&
        participant.delegatedToUserId &&
        participant.delegationState === 'ACCEPTED';

      // Chọn userId hiển thị
      let displayUserId = isDelegated ? participant.delegatedToUserId : participant.userId;

      // Nếu là UNIT, ưu tiên unitId
      if (displayUserId === ParticipantType.UNIT) {
        displayUserId = participant.unitId || participant.userId;
      }

      // Lấy tên user
      let userName: string;
      if (type === ParticipantType.UNIT) {
        // Nếu là UNIT thì lấy tên từ unitId
        userName = orgUnitMap[displayUserId]?.name || userMap[displayUserId] || displayUserId;
      } else {
        userName = userMap[displayUserId] || orgUnitMap[displayUserId]?.name || displayUserId;
      }

      // Lấy tên unit người nhận
      const receiverUnitId = userUnitMap[participant.userId]?.unitId ?? null;
      const receiverUnitName = type === ParticipantType.UNIT ? (orgUnitMap[displayUserId]?.name || userMap[displayUserId]) : userMap[displayUserId];

      return [
        {
          id: participant.id,
          userId: displayUserId,
          userName,
          receiverUnitId,
          receiverUnitName,
          seatNumber: participant.seatNumber ?? null,
          roomId: participant.roomId ?? null,
          tasks: this.mapTasksToDtoV2(taskMap.get(`PARTICIPANT_${participant.id}`) ?? []),
          isNotParticipant: participant.participantState === ParticipantState.NOT_PARTICIPATE,
          position: userUnitMap[displayUserId]?.position || '',
          isDelegated,
          delegateFromPosition: isDelegated ? userUnitMap[participant.delegatedFromUserId]?.position || '' : null,
          isConfirmed: isConfirmedState(participant.participantState),
          isNotConfirmed: isNotConfirmedState(participant.participantState),
          delegateInfo: isDelegated ? userMap[participant.delegatedFromUserId] ?? participant.delegatedFromUserId : null,
          type: type === ParticipantType.UNIT ? ParticipantType.UNIT : ParticipantType.USER ?? ParticipantType.USER,
        },
      ];
    }

    if (fallbackUserId) {
      return [
        {
          userId: fallbackUserId,
          userName: userMap[fallbackUserId] || fallbackUserId,
          seatNumber: null,
          roomId: null,
          tasks: [],
          type: ParticipantType.USER,
        },
      ];
    }

    return [];
  }

  private buildCancelAction(isRecurringMeeting: boolean) {
    if (isRecurringMeeting) {
      return {
        code: 'HUY_LICH_LAP',
        type: 'cancel_recurring_meeting',
        label: 'Hủy lịch',
        canExecute: true,
      };
    }

    return {
      code: 'HUY_LICH',
      type: 'cancel_meeting',
      label: 'Hủy lịch',
      canExecute: true,
    };
  }

  private buildEditAction(isRecurringMeeting: boolean) {
    if (isRecurringMeeting) {
      return {
        code: 'SUA_LICH_LAP',
        type: 'edit_recurring_meeting',
        label: 'Chỉnh sửa',
        canExecute: true,
      };
    }

    return {
      code: 'SUA_LICH_HOP',
      type: 'edit_meeting',
      label: 'Chỉnh sửa',
      canExecute: true,
    };
  }
  // Kiểm tra 1 người trong 1 cuộc họp đang ở trạng thái nào
  async isMeetingParticipantInState(
    meetingId: string,
    userId: string,
    roles: string[],        // ['CHAIRMAN', 'SECRETARY']
    expectedState: string,  // 'RECEIVED'
  ): Promise<boolean> {
    const pool = await this.getPool();

    const roleParams = roles.map((_, i) => `@role${i}`).join(',');

    const sql = `
      SELECT TOP 1 mp.id
      FROM ${this.dbname}.meeting_participants mp
      INNER JOIN ${this.dbname}.meeting_units mu
        ON mp.meeting_unit_id = mu.id
      WHERE mu.meeting_id = @meetingId
        AND mp.user_id = @userId
        AND mp.participant_role IN (${roleParams})
        AND mp.attendance_state = @expectedState
    `;

    const request = pool.request()
      .input('meetingId', meetingId)
      .input('userId', userId)
      .input('expectedState', expectedState);

    roles.forEach((role, i) => {
      request.input(`role${i}`, role);
    });

    const result = await request.query(sql);

    return result.recordset.length > 0;
  }


  // Kiểm tra đơn vị đã ở trạng thái mong muốn hay chưa (ví dụ RECEIVED)
  async isMeetingUnitInState(
    meetingId: string,
    unitId: string,
    expectedState: string,
  ): Promise<boolean> {
    const pool = await this.getPool();

    const sql = `
      SELECT TOP 1 id
      FROM ${this.dbname}.meeting_units
      WHERE meeting_id = @meetingId
        AND unit_id = @unitId
        AND unit_state IN( @expectedState)
    `;

    const result = await pool
      .request()
      .input('meetingId', meetingId)
      .input('unitId', unitId)
      .input('expectedState', expectedState)
      .query(sql);

    // Có record ⇒ trạng thái đúng ⇒ cho phép vào phòng / meeting
    return result.recordset.length > 0;
  }

  // Kiểm tra người dùng có ở trạng thái mong muốn trong meeting hay không
  async isUserInMeetingState(
    meetingId: string,
    unitId: string,
    userId: string,
    expectedState: string,
  ): Promise<boolean> {
    const pool = await this.getPool();

    const sql = `
      SELECT TOP 1 p.id
      FROM ${this.dbname}.meeting_participants p
      JOIN ${this.dbname}.meeting_units u
        ON p.meeting_unit_id = u.id
      WHERE u.meeting_id = @meetingId
        AND u.unit_id = @unitId
        AND p.user_id = @userId
        AND p.participant_state IN( @expectedState)
    `;

    const result = await pool
      .request()
      .input('meetingId', meetingId)
      .input('unitId', unitId)
      .input('userId', userId)
      .input('expectedState', expectedState)
      .query(sql);

    return result.recordset.length > 0;
  }

  // Kiểm tra lịch họp là chưa được phê duyệt
  async isMeetingNotApproved(
    meetingId: string
  ): Promise<boolean> {
    const pool = await this.getPool();

    const sql = `
      SELECT TOP 1 id
      FROM ${this.dbname}.audit
      WHERE document_id = @meetingId
        AND stage_status = 'CHUA_XU_LY'
        AND receiver = 'BAN_QUAN_LY_PHONG'
      ORDER BY created_at DESC
    `;

    const result = await pool
      .request()
      .input('meetingId', meetingId)
      .query(sql);

    // Nếu CÒN audit chờ duyệt → CHƯA được phê duyệt
    return result.recordset.length > 0;
  }

  // async isMeetingNotApproved(
  //   meetingId: string
  // ): Promise<boolean> {

  //   const audit = await this.getMeetingAuditCached(meetingId);

  //   return audit.pendingReceiver === 'BAN_QUAN_LY_PHONG';
  // }
  private async sendMeetingUpdateEmail(
    email: string,
    meeting: MeetingEntity,
    role: string,
  ) {
    try {
      const subject = `[Cập nhật lịch họp] ${meeting.title}`;

      const html = `
        <p>Kính gửi,</p>

        <p>Cuộc họp sau vừa được cập nhật:</p>

        <p>
          <b>Tiêu đề:</b> ${meeting.title}<br/>
          <b>Thời gian:</b> ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)}
        </p>

        <p>Vai trò của bạn: <b>${role}</b></p>

        <p>Vui lòng truy cập hệ thống để xem chi tiết.</p>

        <p>Trân trọng,<br/>Hệ thống quản lý công việc</p>
      `;

      await this.mailService.sendMail({
        to: email,
        subject,
        html,
      });
    } catch (err) {
      this.logger.error(`Send meeting update email failed: ${err.message}`);
    }
  }

  // Lấy các node để lấy config
  private async getRules(version?: string) {

    if (!version) return null

    if (this.ruleCache.has(version))
      return this.ruleCache.get(version)

    const xml = await this.sqlRepo.getBpmnFile(version)

    const { indexes } = await this.runtimeDbService.getModelFromXml(xml)

    const rules = {}

    for (const node of indexes.nodes.values()) {

      if (!node.$type?.includes('Event')) continue

      const ext = getAllNodeExtensionProperties(node)

      if (!ext?.actionCode) continue

      const after = Number(ext.afterTime || 0)
      const noticeTime = Number(ext.noticeTime || 0)
      const roleNode = indexes.laneMap.get(node.id);
      rules[ext.actionCode] = {
        id: node.id,
        role: roleNode,
        node,
        after,
        notice: noticeTime
      }

    }

    this.ruleCache.set(version, rules)

    return rules

  }

  /**
   * Phân tích động luồng BPMN từ nút quy tắc AUTO_COMFIRM_USER để xác định các node tiếp theo
   * mà không cần fix cứng ID của các nút (ví dụ: Xử lý lịch, Hủy tham gia, Event kết thúc).
   */
  async resolveAutoConfirmUserNodes(meetingId: string, bpmnVersion: string) {
    // 1. Lấy thông tin quy tắc từ tệp BPMN
    const rules = await this.getRules(bpmnVersion);
    const userRule = rules?.['AUTO_COMFIRM_USER'];
    if (!userRule) return null;

    // 2. Lấy cấu trúc indexes của sơ đồ BPMN
    const xml = await this.sqlRepo.getBpmnFile(bpmnVersion);
    const { indexes } = await this.runtimeDbService.getModelFromXml(xml);

    const baseNode = userRule.node;
    const outs = indexes.outgoingBySource.get(baseNode.id) || [];

    let gatewayNode: any = null;
    let nextFlows = outs;

    // 3. Nếu nút quy tắc trỏ thẳng tới một Gateway (ví dụ: Gateway_03igtan), chuyển sang duyệt các luồng đi ra từ Gateway đó
    for (const f of outs) {
      const target = f.targetRef;
      if (target && (target.$type === 'bpmn:ExclusiveGateway' || target.$type === 'bpmn:InclusiveGateway' || target.$type === 'bpmn:Gateway')) {
        gatewayNode = target;
        nextFlows = indexes.outgoingBySource.get(target.id) || [];
        break;
      }
    }

    let hasTaskNode: any = null;
    let noTaskNode: any = null;
    const concurrentNodes: any[] = [];

    // 4. Duyệt các luồng đi tiếp để tìm nút xử lý có task (hastask), không task (notask) và luồng chạy song song (isConcurrent)
    for (const flow of nextFlows) {
      let condExpr = flow.conditionExpression?.body?.trim() || '';
      if (condExpr.startsWith('{') && condExpr.endsWith('}')) {
        condExpr = condExpr.slice(1, -1);
      }
      const condStr = condExpr.toLowerCase().replace(/\s+/g, '');
      const { node: resolvedNode } = this.bpmnEngine.nextNodeByFlow(flow, indexes);
      if (!resolvedNode) continue;

      if (condStr.includes('hastask')) {
        hasTaskNode = resolvedNode;
      } else if (condStr.includes('notask')) {
        noTaskNode = resolvedNode;
      }

      // Kiểm tra luồng chạy song song, ví dụ: nút Hủy tham gia được kích hoạt đồng thời
      const ext = getAllNodeExtensionProperties(flow);
      if (ext?.flagsButton?.includes('isConcurrent: true')) {
        concurrentNodes.push(resolvedNode);
      }
    }

    return {
      hasTaskNode,
      noTaskNode,
      concurrentNodes,
      indexes
    };
  }

  private resolveConditionalNextNode(
    indexes: any,
    node: any,
    condition: 'hastask' | 'notask',
  ) {
    const outs = indexes.outgoingBySource.get(node.id) || [];

    for (const f of outs) {
      let flows = [f];
      const target = f.targetRef;

      if (
        target &&
        (target.$type === 'bpmn:ExclusiveGateway' ||
          target.$type === 'bpmn:InclusiveGateway')
      ) {
        flows = indexes.outgoingBySource.get(target.id) || [];
      }

      for (const flow of flows) {
        let cond = flow.conditionExpression?.body?.trim() || '';
        if (cond.startsWith('{') && cond.endsWith('}')) {
          cond = cond.slice(1, -1);
        }

        const condStr = cond.toLowerCase().replace(/\s+/g, '');
        if (!condStr.includes(condition)) continue;

        const { node: nextNode } = this.bpmnEngine.nextNodeByFlow(flow, indexes);
        if (nextNode) return nextNode;
      }
    }

    throw new BadRequestException(`Không tìm thấy nhánh ${condition}`);
  }

  private async syncApprovedSecretaryWorkItem(
    meetingId: string,
    previousSecretaryUserId: string | null,
  ) {
    const isMeetingApproved = await this.isMeetingApproved(meetingId);
    if (!isMeetingApproved) return;

    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
      relations: ['units', 'units.participants'],
    });

    if (!meeting?.bpmnVersion) return;

    const secretaryUnit = meeting.units?.find(
      unit => unit.unitId === 'SECRETARY_UNIT',
    );
    const secretaryParticipant = secretaryUnit?.participants?.find(
      participant => participant.participantRole === 'SECRETARY',
    );

    const nextSecretaryUserId =
      secretaryParticipant?.userId &&
        secretaryParticipant.userId !== UserType.UNIT
        ? secretaryParticipant.userId
        : null;

    const secretaryUserIdsToClear = Array.from(
      new Set(
        [previousSecretaryUserId].filter(
          (userId): userId is string =>
            typeof userId === 'string' &&
            userId.length > 0 &&
            userId !== UserType.UNIT &&
            userId !== nextSecretaryUserId,
        ),
      ),
    );

    let nextNode: any = null;

    if (nextSecretaryUserId) {
      const rules = await this.getRules(meeting.bpmnVersion);
      const userDelegationRule = rules?.['AUTO_COMFIRM_USER'];

      if (!userDelegationRule) {
        throw new BadRequestException(
          'Không tìm thấy cấu hình AUTO_COMFIRM_USER cho cuộc họp',
        );
      }

      const xml = await this.sqlRepo.getBpmnFile(meeting.bpmnVersion);
      const { indexes } = await this.runtimeDbService.getModelFromXml(xml);

      const hasSecretaryTask = secretaryParticipant
        ? (await this.taskRepo.count({
          where: {
            meetingId,
            attachableType: 'PARTICIPANT',
            attachableId: secretaryParticipant.id,
          },
        })) > 0
        : false;

      nextNode = this.resolveConditionalNextNode(
        indexes,
        userDelegationRule.node,
        hasSecretaryTask ? 'hastask' : 'notask',
      );

      const tx = await this.sqlRepo.begin();

      try {
        const workItems = await this.sqlRepo.getOpenWorkItemsByMeeting(
          meetingId,
          tx,
        );

        for (const assigneeId of secretaryUserIdsToClear) {
          await this.sqlRepo.removeWorkItemByAssignee(
            meetingId,
            assigneeId,
            undefined,
            tx,
          );
        }

        const existingSecretaryWorkItem = workItems.find(
          workItem =>
            workItem.assignee_user_id === nextSecretaryUserId &&
            workItem.state === 'open',
        );

        if (existingSecretaryWorkItem) {
          if (existingSecretaryWorkItem.node_id !== nextNode.id) {
            await this.sqlRepo.updateWorkItemNode(
              existingSecretaryWorkItem.id,
              nextNode.id,
              tx,
            );
          }
        } else {
          await this.sqlRepo.addWorkItem(
            meetingId,
            {
              id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              nodeId: nextNode.id,
              role: indexes.laneMap.get(nextNode.id),
              assigneeUserId: nextSecretaryUserId,
              nodeType: nextNode.$type,
            },
            tx,
            meeting.bpmnVersion,
          );
        }

        await this.sqlRepo.commit(tx);
      } catch (error) {
        await this.sqlRepo.rollback(tx);
        throw error;
      }

      return;
    }

    if (!secretaryUserIdsToClear.length) return;

    const tx = await this.sqlRepo.begin();

    try {
      for (const assigneeId of secretaryUserIdsToClear) {
        await this.sqlRepo.removeWorkItemByAssignee(
          meetingId,
          assigneeId,
          undefined,
          tx,
        );
      }

      await this.sqlRepo.commit(tx);
    } catch (error) {
      await this.sqlRepo.rollback(tx);
      throw error;
    }
  }

  private async syncApprovedChairmanWorkItem(
    meetingId: string,
    previousChairmanUserId: string | null,
  ) {
    this.logger.log(`[syncChairman] START meetingId=${meetingId}, prevChairman=${previousChairmanUserId}`);

    const isMeetingApproved = await this.isMeetingApproved(meetingId);
    this.logger.log(`[syncChairman] isMeetingApproved=${isMeetingApproved}`);
    if (!isMeetingApproved) return;

    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
      relations: ['units', 'units.participants'],
    });

    if (!meeting?.bpmnVersion) {
      this.logger.log(`[syncChairman] No bpmnVersion, returning`);
      return;
    }

    const nextChairmanUserId = meeting.chairmanId;
    this.logger.log(`[syncChairman] nextChairmanUserId=${nextChairmanUserId}, bpmnVersion=${meeting.bpmnVersion}`);

    const chairmanUserIdsToClear = Array.from(
      new Set(
        [previousChairmanUserId].filter(
          (userId): userId is string =>
            typeof userId === 'string' &&
            userId.length > 0 &&
            userId !== UserType.UNIT &&
            userId !== nextChairmanUserId,
        ),
      ),
    );
    this.logger.log(`[syncChairman] chairmanUserIdsToClear=${JSON.stringify(chairmanUserIdsToClear)}`);

    const xml = await this.sqlRepo.getBpmnFile(meeting.bpmnVersion);
    const { indexes } = await this.runtimeDbService.getModelFromXml(xml);

    let receiveNodeId: string | null = null;
    let cancelNodeId: string | null = null;

    for (const flows of indexes.outgoingBySource.values()) {
      for (const flow of flows) {
        const ext = getAllNodeExtensionProperties(flow);
        if (ext?.flagsButton?.includes('isConcurrent: true')) {
          if (flow.targetRef?.id) {
            cancelNodeId = flow.targetRef.id;
            const cancelOuts = indexes.outgoingBySource.get(cancelNodeId) || [];
            if (cancelOuts[0]?.targetRef?.id) {
              receiveNodeId = cancelOuts[0].targetRef.id;
            }
          }
          break;
        }
      }
      if (cancelNodeId) break;
    }

    this.logger.log(`[syncChairman] cancelNodeId=${cancelNodeId}, receiveNodeId=${receiveNodeId}`);

    const tx = await this.sqlRepo.begin();

    try {
      // 1. Clear old chairman's work items
      for (const assigneeId of chairmanUserIdsToClear) {
        this.logger.log(`[syncChairman] Removing old chairman work items for ${assigneeId}`);
        await this.sqlRepo.removeWorkItemByAssignee(
          meetingId,
          assigneeId,
          undefined,
          tx,
        );
      }

      // 2. Create new work item for the new chairman at cancelNodeId if it is resolved
      if (nextChairmanUserId && cancelNodeId) {
        const workItems = await this.sqlRepo.getOpenWorkItemsByMeeting(
          meetingId,
          tx,
        );
        this.logger.log(`[syncChairman] Open work items count=${workItems.length}`);

        const existingChairmanWorkItem = workItems.find(
          workItem =>
            workItem.assignee_user_id === nextChairmanUserId &&
            workItem.node_id === cancelNodeId &&
            workItem.state === 'open',
        );

        this.logger.log(`[syncChairman] existingChairmanWorkItem=${existingChairmanWorkItem ? 'found' : 'NOT found'}`);

        if (!existingChairmanWorkItem) {
          const role = indexes.laneMap.get(cancelNodeId);
          this.logger.log(`[syncChairman] Creating work item: cancelNodeId=${cancelNodeId}, role=${role}, assignee=${nextChairmanUserId}`);
          await this.sqlRepo.addWorkItem(
            meetingId,
            {
              id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              nodeId: cancelNodeId,
              role: role,
              assigneeUserId: nextChairmanUserId,
              nodeType: 'bpmn:UserTask',
            },
            tx,
            meeting.bpmnVersion,
          );
          this.logger.log(`[syncChairman] Work item CREATED successfully`);
        }
      } else {
        this.logger.log(`[syncChairman] SKIP creating work item: nextChairmanUserId=${nextChairmanUserId}, cancelNodeId=${cancelNodeId}`);
      }

      // 3. Remove Chairman from the receiveNodeId (Tiếp nhận) if they are in there
      if (nextChairmanUserId && receiveNodeId) {
        this.logger.log(`[syncChairman] Removing chairman from receiveNodeId=${receiveNodeId}`);
        await this.sqlRepo.removeWorkItemByAssignee(
          meetingId,
          nextChairmanUserId,
          receiveNodeId,
          tx,
        );
      }

      await this.sqlRepo.commit(tx);
      this.logger.log(`[syncChairman] DONE successfully`);
    } catch (error) {
      this.logger.error(`[syncChairman] ERROR: ${error.message}`);
      await this.sqlRepo.rollback(tx);
      throw error;
    }
  }

  private async notifyUnitConfirmRoleUsers(
    meeting: MeetingEntity,
    unitIds: string[],
    roleCode?: string | null,
  ) {
    const normalizedRoleCode =
      typeof roleCode === 'string' && roleCode.trim().length > 0
        ? roleCode.trim()
        : '';

    const uniqueUnitIds = Array.from(
      new Set(unitIds.filter((unitId) => typeof unitId === 'string' && unitId.length > 0)),
    );

    if (
      !meeting.createdBy ||
      !meeting.bpmnVersion ||
      !normalizedRoleCode ||
      !uniqueUnitIds.length
    ) {
      return;
    }

    const [{ userIds: laneUserIds }, roleUsers] = await Promise.all([
      this.getUsersInFlow(meeting.bpmnVersion, normalizedRoleCode),
      this.userService.findUsersByRoleCodes(
        [normalizedRoleCode],
        meeting.bpmnVersion,
      ),
    ]);

    const candidateUserIds = Array.from(
      new Set([
        ...laneUserIds,
        ...roleUsers.map((user) => user.userId),
      ].filter((userId) => typeof userId === 'string' && userId.length > 0)),
    );

    if (!candidateUserIds.length) {
      return;
    }

    const users = await this.userRepo.find({
      where: {
        id: In(candidateUserIds),
        status: STATUS.ACTIVED,
        parent: { id: In(uniqueUnitIds) }
      },
      select: ['id']
    });

    const recipientIds = users.map((user) => user.id);

    if (!recipientIds.length) {
      return;
    }

    this.notificationService.createForRecipients({
      recipientIds,
      senderId: meeting.createdBy,
      type: NotificationType.MEETING_PUBLISHED.value,
      content: `Phòng ban của bạn có cuộc họp "${meeting.title}" lúc ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)}. Vui lòng kiểm tra thông tin cuộc họp.`,
      recordId: meeting.id,
      link: `/meetings/${meeting.id}?listparammeeting=PROCESS_MEETING`,
      key: NotificationKey.VIEW_PROCESSING_SCHEDULE,
      time: new Date(),
      status: 0,
    });
  }


  /**
   * Update a meeting
   * @param id the meeting id
   * @param dto the update data
   * @param userId the user id who is making the update
   * @param req the express request object
   * @returns a promise that resolves to an object with a success property and optionally a message or data property
   */
  async update(
    id: string,
    dto: UpdateMeetingDto,
    userId: string,
    req?: any
  ): Promise<{ success: boolean; message?: string; data?: any }> {

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const details = `Cập nhật cuộc họp, ID cuộc họp: ${id}`;

    try {
      /** ================= BEFORE ================= */
      const oldMeeting = await this.getMeetingForUpdate(queryRunner, id);
      const oldMeetingCompare = {
        title: oldMeeting.title,
        meetingDate: oldMeeting.meetingDate,
        meetingTime: oldMeeting.meetingTime,
        meetingMode: oldMeeting.meetingMode,
      };
      const oldSnapshot = JSON.parse(JSON.stringify(oldMeeting));
      const oldRoomIds = (oldMeeting.roomIds || '').split(',').filter(Boolean);
      const wasApproved = await this.isMeetingApproved(id);
      const oldTaskLinks = await queryRunner.manager.find(
        MeetingTaskEntity,
        {
          where: { meetingId: id },
          select: ['id', 'attachableType', 'attachableId'],
        },
      );

      const isSystemUnit = (unitId?: string | null): boolean =>
        unitId === 'CHAIRMAN_UNIT' || unitId === 'SECRETARY_UNIT';

      const extractParticipants = (m: any): Set<string> => {
        const set = new Set<string>();
        for (const u of m.units || []) {
          for (const p of u.participants || []) {
            if (p.userId) set.add(p.userId);
          }
        }
        return set;
      };

      const buildParticipantSnapshot = (m: any) => {
        const participants = new Map<
          string,
          { id: string; userId: string; unitRowId: string; unitId: string }
        >();
        const userUnits = new Map<string, Set<string>>();

        for (const unit of m.units || []) {
          if (!unit?.id || !unit?.unitId) {
            continue;
          }

          for (const participant of unit.participants || []) {
            if (!participant?.id || !participant?.userId) continue;

            participants.set(participant.id, {
              id: participant.id,
              userId: participant.userId,
              unitRowId: unit.id,
              unitId: unit.unitId,
            });

            const currentUnits =
              userUnits.get(participant.userId) ?? new Set<string>();
            currentUnits.add(unit.unitId);
            userUnits.set(participant.userId, currentUnits);
          }
        }

        return { participants, userUnits };
      };

      const buildUnitSnapshot = (m: any) => {
        const units = new Map<
          string,
          {
            id: string;
            unitId: string;
            isRoomSelected: boolean;
            participantUserIds: string[];
          }
        >();

        for (const unit of m.units || []) {
          if (!unit?.id || !unit?.unitId || isSystemUnit(unit.unitId)) {
            continue;
          }

          const participantUserIds = Array.from(
            new Set<string>(
              (unit.participants || [])
                .map((participant) => participant?.userId)
                .filter(
                  (userId): userId is string =>
                    typeof userId === 'string' && userId.length > 0,
                ),
            ),
          ).sort();

          units.set(unit.id, {
            id: unit.id,
            unitId: unit.unitId,
            isRoomSelected: unit.isRoomSelected === true,
            participantUserIds,
          });
        }

        return units;
      };

      const sameSet = (left: Set<string>, right: Set<string>) =>
        left.size === right.size && [...left].every((item) => right.has(item));

      const oldParticipants = extractParticipants(oldSnapshot);
      const oldParticipantSnapshot = buildParticipantSnapshot(oldSnapshot);
      const oldUnitSnapshot = buildUnitSnapshot(oldSnapshot);

      /** ================= UPDATE ================= */
      const {
        recurrence,
        tasks,
        units,
        chairman,
        secretary,
        secretaries,
        onlineMeeting,
        guests,
        roomIds,
        isCompany,
        isToday,
        ...basicData
      } = dto;

      const changeSet: MeetingChangeSet = {
        addedUnits: [],
        updatedUnits: [],
        removedUnits: [],

        addedParticipants: [],
        updatedParticipants: [],
        removedParticipants: [],

        addedTasks: [],
        updatedTasks: [],
        removedTasks: [],
      };

      await this.updateBasicInfo(
        queryRunner,
        oldMeeting,
        basicData,
        roomIds,
        isCompany,
        isToday
      );
      await this.updateOnlineMeeting(queryRunner, oldMeeting, onlineMeeting);
      await this.updateRecurrence(queryRunner, oldMeeting, recurrence);

      await this.updateMeetingTasks(queryRunner, oldMeeting, tasks);

      await this.updateGuests(queryRunner, oldMeeting, guests);
      await this.updateChairman(queryRunner, oldMeeting, chairman, userId, changeSet);
      await this.updateSecretaries(queryRunner, oldMeeting, secretary, secretaries, userId, changeSet);
      await this.updateUnits(queryRunner, oldMeeting, units, changeSet);
      await this.ensureChairmanUnitConsistency(
        queryRunner,
        oldMeeting,
        chairman,
        changeSet,
      );

      /** ================= AFTER ================= */
      const newMeeting = await this.getMeetingForUpdate(queryRunner, id);
      const newParticipants = extractParticipants(newMeeting);
      const newParticipantSnapshot = buildParticipantSnapshot(newMeeting);
      const newUnitSnapshot = buildUnitSnapshot(newMeeting);

      const added = [...newParticipants].filter(x => !oldParticipants.has(x));
      const removed = [...oldParticipants].filter(x => !newParticipants.has(x));
      const unchangedParticipants = [...newParticipants].filter((x) =>
        oldParticipants.has(x),
      );
      const hasChangedParticipant = added.length > 0 || removed.length > 0;
      const removedParticipantIds = [...oldParticipantSnapshot.participants.keys()]
        .filter(participantId => !newParticipantSnapshot.participants.has(participantId));
      const addedParticipantIds = [...newParticipantSnapshot.participants.keys()]
        .filter(participantId => !oldParticipantSnapshot.participants.has(participantId));
      const reassignedParticipantIds = [...newParticipantSnapshot.participants.entries()]
        .filter(([participantId, participant]) => {
          const oldParticipant = oldParticipantSnapshot.participants.get(participantId);
          return !!oldParticipant && oldParticipant.userId !== participant.userId;
        })
        .map(([participantId]) => participantId);

      const unitChangedUsers = new Set<string>();
      for (const userId of new Set([
        ...oldParticipantSnapshot.userUnits.keys(),
        ...newParticipantSnapshot.userUnits.keys(),
      ])) {
        const oldUnits = oldParticipantSnapshot.userUnits.get(userId);
        const newUnits = newParticipantSnapshot.userUnits.get(userId);

        if (!oldUnits || !newUnits) {
          continue;
        }

        if (!sameSet(oldUnits, newUnits)) {
          unitChangedUsers.add(userId);
        }
      }

      const affectedCurrentParticipantIds = new Set<string>([
        ...addedParticipantIds,
        ...reassignedParticipantIds,
      ]);

      const addedUnitRowIds = [...newUnitSnapshot.keys()]
        .filter(unitRowId => !oldUnitSnapshot.has(unitRowId));
      const removedUnitRowIds = [...oldUnitSnapshot.keys()]
        .filter(unitRowId => !newUnitSnapshot.has(unitRowId));
      const updatedUnitRowIds = [...newUnitSnapshot.entries()]
        .filter(([unitRowId, unit]) => {
          const oldUnit = oldUnitSnapshot.get(unitRowId);

          if (!oldUnit) {
            return false;
          }

          return (
            oldUnit.unitId !== unit.unitId ||
            oldUnit.isRoomSelected !== unit.isRoomSelected ||
            oldUnit.participantUserIds.join('|') !== unit.participantUserIds.join('|')
          );
        })
        .map(([unitRowId]) => unitRowId);
      const structurallyChangedUnitRowIds = [...newUnitSnapshot.entries()]
        .filter(([unitRowId, unit]) => {
          const oldUnit = oldUnitSnapshot.get(unitRowId);

          if (!oldUnit) {
            return false;
          }

          return (
            oldUnit.unitId !== unit.unitId ||
            oldUnit.isRoomSelected !== unit.isRoomSelected
          );
        })
        .map(([unitRowId]) => unitRowId);
      const structurallyChangedUnitRowIdSet = new Set(
        structurallyChangedUnitRowIds,
      );

      const affectedCurrentUnitRowIds = new Set<string>([
        ...addedUnitRowIds,
        ...updatedUnitRowIds,
      ]);

      for (const [participantId, participant] of newParticipantSnapshot.participants.entries()) {
        if (structurallyChangedUnitRowIdSet.has(participant.unitRowId)) {
          affectedCurrentParticipantIds.add(participantId);
        }
      }

      const affectedUnitAssigneeIds = new Set<string>();
      for (const unitRowId of addedUnitRowIds) {
        const unit = newUnitSnapshot.get(unitRowId);
        if (unit?.unitId) affectedUnitAssigneeIds.add(unit.unitId);
      }
      for (const unitRowId of removedUnitRowIds) {
        const unit = oldUnitSnapshot.get(unitRowId);
        if (unit?.unitId) affectedUnitAssigneeIds.add(unit.unitId);
      }
      for (const unitRowId of updatedUnitRowIds) {
        const oldUnit = oldUnitSnapshot.get(unitRowId);
        const newUnit = newUnitSnapshot.get(unitRowId);
        if (oldUnit?.unitId) affectedUnitAssigneeIds.add(oldUnit.unitId);
        if (newUnit?.unitId) affectedUnitAssigneeIds.add(newUnit.unitId);
      }

      const currentParticipantTaskIds = affectedCurrentParticipantIds.size
        ? (
          await queryRunner.manager.find(MeetingTaskEntity, {
            where: {
              meetingId: id,
              attachableType: 'PARTICIPANT',
              attachableId: In(Array.from(affectedCurrentParticipantIds)),
            },
            select: ['id'],
          })
        ).map(task => task.id)
        : [];

      const currentUnitTaskIds = affectedCurrentUnitRowIds.size
        ? (
          await queryRunner.manager.find(MeetingTaskEntity, {
            where: {
              meetingId: id,
              attachableType: 'UNIT',
              attachableId: In(Array.from(affectedCurrentUnitRowIds)),
            },
            select: ['id'],
          })
        ).map(task => task.id)
        : [];

      const affectedParticipantTaskOwners = new Set<string>([
        ...removedParticipantIds,
        ...Array.from(affectedCurrentParticipantIds),
        ...reassignedParticipantIds,
      ]);
      const affectedUnitTaskOwners = new Set<string>([
        ...removedUnitRowIds,
        ...Array.from(affectedCurrentUnitRowIds),
      ]);

      const archivedTaskIds = [
        ...currentParticipantTaskIds,
        ...currentUnitTaskIds,
        ...oldTaskLinks
          .filter(task =>
            task.attachableType === 'PARTICIPANT' &&
            affectedParticipantTaskOwners.has(task.attachableId),
          )
          .map(task => task.id),
        ...oldTaskLinks
          .filter(task =>
            task.attachableType === 'UNIT' &&
            affectedUnitTaskOwners.has(task.attachableId),
          )
          .map(task => task.id),
      ];

      const affectedAssigneeIds = new Set<string>([
        ...added,
        ...removed,
        ...unitChangedUsers,
        ...Array.from(affectedUnitAssigneeIds),
      ]);

      const shouldResetApprovedArtifacts =
        wasApproved &&
        (
          affectedCurrentParticipantIds.size > 0 ||
          removedParticipantIds.length > 0 ||
          affectedCurrentUnitRowIds.size > 0 ||
          removedUnitRowIds.length > 0 ||
          unitChangedUsers.size > 0
        );
      const shouldNotifyApprovedCleanup =
        wasApproved &&
        (
          removedParticipantIds.length > 0 ||
          removedUnitRowIds.length > 0 ||
          reassignedParticipantIds.length > 0 ||
          updatedUnitRowIds.length > 0 ||
          unitChangedUsers.size > 0
        );

      if (shouldResetApprovedArtifacts) {
        await this.softDeleteMeetingTaskFiles(queryRunner, archivedTaskIds);

        if (currentParticipantTaskIds.length) {
          await queryRunner.manager
            .createQueryBuilder()
            .update(MeetingTaskEntity)
            .set({ isDocumentPrepared: false })
            .whereInIds(currentParticipantTaskIds)
            .execute();
        }

        if (currentUnitTaskIds.length) {
          await queryRunner.manager
            .createQueryBuilder()
            .update(MeetingTaskEntity)
            .set({ isDocumentPrepared: false })
            .whereInIds(currentUnitTaskIds)
            .execute();
        }

        await this.resetApprovedMeetingParticipants(
          queryRunner,
          Array.from(affectedCurrentParticipantIds),
        );
        await this.resetApprovedMeetingUnits(
          queryRunner,
          Array.from(affectedCurrentUnitRowIds),
        );
        await this.clearMeetingWorkItemsByAssignees(
          queryRunner,
          id,
          Array.from(affectedAssigneeIds),
        );
      }

      /** ================= ROOM DIFF ================= */
      const newRoomIds = (newMeeting.roomIds || '').split(',').filter(Boolean);
      const addedRooms = newRoomIds.filter(r => !oldRoomIds.includes(r));
      const removedRooms = oldRoomIds.filter(r => !newRoomIds.includes(r));

      if (added.length > 0) {
        await queryRunner.manager.update(MeetingEntity, id, { warning24hSent: false });
      }

      // ===== XỬ LÝ CHUYỂN ĐỔI: TỪ CẦN XÁC NHẬN (TRUE) SANG KHÔNG CẦN XÁC NHẬN (FALSE) =====
      const needConfirmationChangedToFalse = oldMeeting.needConfirmation === true && newMeeting.needConfirmation === false;
      if (needConfirmationChangedToFalse) {
        // Bước 1. Tự động xác nhận tham gia (CONFIRMED) cho toàn bộ người tham gia thường
        await queryRunner.manager
          .createQueryBuilder()
          .update(MeetingParticipantEntity)
          .set({
            participantState: ParticipantState.CONFIRMED,
            acceptJoin: true,
          })
          .where('meeting_unit_id IN (SELECT id FROM meeting_units WHERE meeting_id = :meetingId)', { meetingId: id })
          .andWhere('participant_role IS NULL OR participant_role != :chairmanRole', { chairmanRole: 'CHAIRMAN' })
          .execute();

        // Bước 2. Lấy danh sách những người tham gia có nhiệm vụ (task/tài liệu cần xử lý) dưới Transaction
        const participantIds = newMeeting.units
          .filter(u => u.unitId !== 'CHAIRMAN_UNIT' && u.unitId !== 'SECRETARY_UNIT')
          .flatMap(u => (u.participants || []).map(p => p.id));

        let userIdsWithTasks: string[] = [];
        if (participantIds.length > 0) {
          const participantTasks = await queryRunner.manager.find(MeetingTaskEntity, {
            where: {
              meetingId: id,
              attachableType: 'PARTICIPANT',
              attachableId: In(participantIds),
            },
          });
          const taskOwnerIds = new Set(participantTasks.map(t => t.attachableId));
          userIdsWithTasks = newMeeting.units
            .flatMap(u => u.participants || [])
            .filter(p => taskOwnerIds.has(p.id))
            .map(p => p.userId);
        }

        // Bước 3. Xóa bỏ các WorkItem yêu cầu xác nhận họp ("Tiếp nhận" - Activity_1kmmgo3) đang mở
        await queryRunner.manager
          .createQueryBuilder()
          .delete()
          .from('work_items')
          .where('document_id = :meetingId', { meetingId: id })
          .andWhere('node_id = :nodeId', { nodeId: 'Activity_1kmmgo3' })
          .execute();

        // Bước 4. Phân phối WorkItem tính toán động từ BPMN
        const resolved = await this.resolveAutoConfirmUserNodes(id, newMeeting.bpmnVersion);
        if (resolved) {
          const { hasTaskNode, concurrentNodes, indexes: resolvedIndexes } = resolved;
          const newWis: any[] = [];

          // Lấy tất cả người tham gia thường (trừ chủ trì và thư ký)
          const allUserIds = [...newParticipants].filter(
            uid => uid !== newMeeting.chairmanId && uid !== newMeeting.secretaryId
          );

          // 4.1 Thêm WorkItem Hủy tham gia (nút hủy) cho TẤT CẢ người tham gia
          allUserIds.forEach(userId => {
            concurrentNodes.forEach((concurrentNode, idx) => {
              if (concurrentNode) {
                newWis.push({
                  id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_2_${idx}`,
                  nodeId: concurrentNode.id,
                  assigneeUserId: userId,
                  role: resolvedIndexes.laneMap.get(concurrentNode.id) || 'NGUOI_THAM_GIA',
                  nodeType: concurrentNode.$type,
                  actionCode: 'HUY_THAM_GIA',
                });
              }
            });
          });

          // 4.2 Thêm WorkItem Xử lý lịch chỉ cho người CÓ nhiệm vụ
          userIdsWithTasks.forEach(userId => {
            if (hasTaskNode) {
              newWis.push({
                id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_1`,
                nodeId: hasTaskNode.id,
                assigneeUserId: userId,
                role: resolvedIndexes.laneMap.get(hasTaskNode.id) || 'NGUOI_THAM_GIA',
                nodeType: hasTaskNode.$type,
              });
            }
          });

          if (newWis.length > 0) {
            await this.sqlRepo.addManyWorkItems(id, newWis, undefined, newMeeting.bpmnVersion);
          }
        }
      }

      await queryRunner.commitTransaction();

      this.logger.log(`[update] wasApproved=${wasApproved}, oldChairmanId=${oldSnapshot.chairmanId}, newChairmanId=${newMeeting.chairmanId}`);
      if (wasApproved && oldSnapshot.chairmanId !== newMeeting.chairmanId) {
        try {
          this.logger.log(`[update] Calling syncApprovedChairmanWorkItem...`);
          await this.syncApprovedChairmanWorkItem(id, oldSnapshot.chairmanId);
        } catch (err) {
          this.logger.error(
            `Sync chairman work item after update failed: ${err.message}`,
          );
        }
      }

      // this.calendarService.pushSync(id);

      /** ================= NOTIFICATION ================= */
      const meetingTimeText = `${newMeeting.meetingDate} ${newMeeting.meetingTime}`;

      // Case 1: lịch đã approved nhưng chưa có participant
      if (wasApproved && oldParticipants.size === 0 && newParticipants.size > 0) {
        this.notificationService.createForRecipients({
          recipientIds: [...newParticipants],
          senderId: userId,
          type: NotificationType.MEETING_INVITATION.value,
          content: `Bạn được mời tham gia cuộc họp "${newMeeting.title}" vào ${meetingTimeText}. Vui lòng kiểm tra thông tin.`,
          recordId: id,
          link: `/meetings/${id}?listparammeeting=PARTICIPANT_MEETING`,
          key: NotificationKey.VIEW_MEETING_ROOM,
          time: new Date(),
          status: 0,
        });
      }
      // Case 2: đã có participant → có thay đổi
      else if (wasApproved && hasChangedParticipant) {
        // Người bị remove
        if (removed.length) {
          this.notificationService.createForRecipients({
            recipientIds: removed,
            senderId: userId,
            type: NotificationType.MEETING_REMOVED.value,
            content: `Thành phần tham gia cuộc họp "${newMeeting.title}" vào ${meetingTimeText} đã được điều chỉnh. Bạn không còn thuộc danh sách tham dự. Vui lòng cập nhật thông tin.`,
            recordId: id,
            link: `/meetings/${id}?listparammeeting=PARTICIPANT_MEETING`,
            key: NotificationKey.VIEW_MEETING_ROOM,
            time: new Date(),
            status: 0,
          });
        }
        // Người được thêm
        if (added.length) {
          this.notificationService.createForRecipients({
            recipientIds: added,
            senderId: userId,
            type: NotificationType.MEETING_INVITATION.value,
            content: `Bạn được bổ sung vào cuộc họp "${newMeeting.title}" vào ${meetingTimeText} và được giao chuẩn bị tài liệu. Vui lòng kiểm tra thông tin.`,
            recordId: id,
            link: `/meetings/${id}?listparammeeting=PARTICIPANT_MEETING`,
            key: NotificationKey.VIEW_MEETING_ROOM,
            time: new Date(),
            status: 0,
          });
        }
      }

      if (wasApproved && unchangedParticipants.length) {
        this.notificationService.createForRecipients({
          recipientIds: unchangedParticipants,
          senderId: userId,
          type: NotificationType.MEETING_INFO_CHANGED.value,
          content: `Thông tin cuộc họp "${newMeeting.title}" vào ${meetingTimeText} đã được điều chỉnh. Vui lòng kiểm tra cập nhật mới nhất.`,
          recordId: id,
          link: `/meetings/${id}?listparammeeting=PARTICIPANT_MEETING`,
          key: NotificationKey.VIEW_MEETING_ROOM,
          time: new Date(),
          status: 0,
        });
      }

      if (wasApproved) {
        try {
          const getUnitId = (participant: any, typeField?: string) => {
            if (!participant) return null;
            if (participant[typeField || 'secretaryType'] === 'UNIT' || participant[typeField || 'chairmanType'] === 'UNIT') {
              return participant.userId;
            }
            if (participant.userType === 'UNIT' || participant.userId === 'UNIT') {
              return participant.unitId;
            }
            return null;
          };

          const newChairmanUnitId = getUnitId(chairman, 'chairmanType');
          const newSecretaryUnitId = getUnitId(secretary, 'secretaryType');

          const currentClerkUnitIds = (units ?? [])
            .filter(u => u.isRoomSelected === true)
            .map(u => u.unitId)
            .filter(Boolean);

          if (newChairmanUnitId && !currentClerkUnitIds.includes(newChairmanUnitId)) {
            currentClerkUnitIds.push(newChairmanUnitId);
          }
          if (newSecretaryUnitId && !currentClerkUnitIds.includes(newSecretaryUnitId)) {
            currentClerkUnitIds.push(newSecretaryUnitId);
          }

          if (currentClerkUnitIds.length) {
            const processKey = newMeeting.bpmnVersion || 'QUY_TRINH_LICH_HOP';
            const bpmnModel = await this.getBpmnModelCached(processKey);
            const lanes = bpmnModel?.indexes?.lanes || [];
            const unitLane = lanes.find(l => l.properties?.isClerk === 'true');
            const roleCode = unitLane?.role || 'DON_VI_THAM_GIA';
            const roleName = unitLane?.name || 'ĐƠN VỊ THAM GIA';

            const clerks = await this.userRepo.createQueryBuilder('user')
              .select(['user.id', 'user.emailUser', 'parentRelation.id'])
              .leftJoin('user.parent', 'parentRelation')
              .leftJoin('roles_process_users', 'rpu', 'rpu.user_id = user.id')
              .leftJoin('user_group_users', 'ugu', 'ugu.user_id = user.id')
              .leftJoin('roles_process_groups', 'rpg', 'rpg.group_id = ugu.group_user_id')
              .leftJoin('roles_process', 'rp', 'rp.id = rpu.role_id OR rp.id = rpg.role_id')
              .where('user.status = 1')
              .andWhere('rp.is_active = 1')
              .andWhere('rp.role_code = :roleCode', { roleCode })
              .andWhere('rp.process_key = :processKey', { processKey })
              .andWhere('parentRelation.id IN (:...currentClerkUnitIds)', { currentClerkUnitIds })
              .getMany();

            const notifyClerks = async (targetClerks: typeof clerks, roleLabel: string, contentMessage: string, listparammeeting = 'PROCESS_MEETING') => {
              const targetClerkIds = targetClerks
                .map(c => c.id)
                .filter(cId => cId !== chairman?.userId && cId !== secretary?.userId);

              if (!targetClerkIds.length) return;

              try {
                await this.notificationService.createForRecipients({
                  recipientIds: targetClerkIds,
                  senderId: userId,
                  type: NotificationType.MEETING_INVITATION.value,
                  content: contentMessage,
                  recordId: id,
                  link: `/meetings/${id}?listparammeeting=${listparammeeting}`,
                  key: listparammeeting === 'PROCESS_MEETING'
                    ? NotificationKey.VIEW_PROCESSING_SCHEDULE
                    : NotificationKey.VIEW_MEETING_ROOM,
                  time: new Date(),
                  status: 0,
                });
              } catch (err) {
                this.logger.error(`Error creating notifications for clerks (${roleLabel}) in update:`, err);
              }
            };

            const chairmanClerks = clerks.filter(c => c.parent?.id && c.parent.id === newChairmanUnitId && !currentClerkUnitIds.includes(c.parent.id));
            const secretaryClerks = clerks.filter(c => c.parent?.id && c.parent.id === newSecretaryUnitId && !currentClerkUnitIds.includes(c.parent.id));
            const participantClerks = clerks.filter(c => c.parent?.id && currentClerkUnitIds.includes(c.parent.id));

            const isBasicInfoChanged = oldMeetingCompare.title !== newMeeting.title ||
              oldMeetingCompare.meetingDate !== newMeeting.meetingDate ||
              oldMeetingCompare.meetingTime !== newMeeting.meetingTime ||
              oldMeetingCompare.meetingMode !== newMeeting.meetingMode;

            if (isBasicInfoChanged) {
              await notifyClerks(
                clerks,
                'INFO_CHANGED',
                `Thông tin cuộc họp "${newMeeting.title}" vào ${meetingTimeText} đã được điều chỉnh. Vui lòng kiểm tra cập nhật mới nhất.`,
                'PROCESS_MEETING'
              );
            } else {
              await notifyClerks(
                chairmanClerks,
                'CHỦ TRÌ',
                `Đơn vị của bạn được phân công CHỦ TRÌ cuộc họp "${newMeeting.title}" lúc ${newMeeting.meetingTime} ngày ${formatDateVN(newMeeting.meetingDate)}`,
                'PROCESS_MEETING'
              );

              await notifyClerks(
                secretaryClerks,
                'THƯ KÝ',
                `Đơn vị của bạn được phân công làm THƯ KÝ cuộc họp "${newMeeting.title}" lúc ${newMeeting.meetingTime} ngày ${formatDateVN(newMeeting.meetingDate)}`,
                'PROCESS_MEETING'
              );

              await notifyClerks(
                participantClerks,
                roleName.toUpperCase(),
                `Đơn vị của bạn được phân công tham gia cuộc họp "${newMeeting.title}" lúc ${newMeeting.meetingTime} ngày ${formatDateVN(newMeeting.meetingDate)}`,
                'PROCESS_MEETING'
              );
            }
          }
        } catch (err) {
          this.logger.error('Error sending clerk notifications in update:', err);
        }
      }

      // if (shouldNotifyApprovedCleanup) {
      //   const formattedMeetingTime = `${newMeeting.meetingTime} ngày ${formatDateVN(newMeeting.meetingDate)}`;
      //   this.notificationService.createForRecipients({
      //     recipientIds: [userId],
      //     senderId: userId,
      //     content: `Cuộc họp "${newMeeting.title}" vào ${formattedMeetingTime} đã thay đổi thành phần tham gia. Hệ thống đã xóa thông tin phân công, trạng thái xử lý và tài liệu upload chuẩn bị trước đó để cập nhật lại.`,
      //     recordId: id,
      //     link: `/meetings/${id}`,
      //     key: 'VIEW_MEETING_ROOM',
      //     time: new Date(),
      //     status: 0,
      //   });
      // }

      /** ================= COMMENT ================= */
      await this.sqlRepo.createComment({
        documentId: id,
        userId,
        userName: await this.getUserNameById(userId) || userId,
        content: shouldNotifyApprovedCleanup
          ? 'Đã thay đổi thành phần tham gia.'
          : 'Đã thay đổi thông tin lịch họp',
      });

      const isMeetingApproved = await this.isMeetingApproved(id);
      if (isMeetingApproved) {
        await this.autoConfirmMeeting(id, {
          addedTasks: changeSet.addedTasks.length > 0,
          removedTasks: changeSet.removedTasks.length > 0,
          addedTaskEntities: changeSet.addedTasks,
          removedTaskEntities: changeSet.removedTasks,
        });
      }

      // ===== QUEUE GOOGLE CALENDAR SYNC (NON-BLOCKING) =====
      // Get confirmed participants and queue them for sync/update/delete based on changes
      try {
        const confirmedParticipants = await this.meetingParticipantRepo
          .createQueryBuilder('p')
          .leftJoinAndSelect('p.unit', 'unit')
          .where('p.participantState IN (:...states)', {
            states: ['CONFIRMED', 'DONE']
          })
          .andWhere('unit.meetingId = :meetingId', { meetingId: id })
          .getMany();

        // Check if meeting details changed (title, date, time)
        const meetingDetailsChanged =
          oldMeetingCompare.title !== newMeeting.title ||
          oldMeetingCompare.meetingDate !== newMeeting.meetingDate ||
          oldMeetingCompare.meetingTime !== newMeeting.meetingTime ||
          oldMeetingCompare.meetingMode !== newMeeting.meetingMode;

        // If meeting details changed and there are confirmed participants, queue them for update
        if (meetingDetailsChanged && confirmedParticipants.length > 0) {
          const startTimeStr =
            newMeeting.meetingTime?.split('-')[0] || '09:00';
          const endTimeStr =
            newMeeting.meetingTime?.split('-')[1] || '10:00';

          let meetingDateStr: string;

          if (typeof newMeeting.meetingDate === 'string') {
            // nếu đã là YYYY-MM-DD thì dùng luôn
            if (newMeeting.meetingDate.includes('-')) {
              meetingDateStr = newMeeting.meetingDate;
            } else {
              // fallback DD/MM/YYYY
              const [day, month, year] = newMeeting.meetingDate.split('/');
              meetingDateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          } else {
            // ⚠️ KHÔNG dùng toISOString
            const d = new Date(newMeeting.meetingDate);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            meetingDateStr = `${year}-${month}-${day}`;
          }

          // ✅ giữ timezone +07:00
          const startDateTime = `${meetingDateStr}T${startTimeStr}:00+07:00`;
          const endDateTime = `${meetingDateStr}T${endTimeStr}:00+07:00`;

          const eventInput: GoogleCalendarEventInput = {
            title: newMeeting.title,
            description: newMeeting.content,
            startTime: startDateTime,
            endTime: endDateTime,
            reminders: [
              {
                method: 'email',
                minutes: 60,
              },
            ],
          };

          // Queue từng user
          for (const participant of confirmedParticipants) {
            this.backgroundGoogleCalendarSyncService.queueParticipantSync(
              participant.id,
              id,
              eventInput,
            );
          }
        }

        // Queue removed participants for deletion from Google Calendar
        // IMPORTANT: Pass old participant data before they are deleted from DB
        if (removedParticipantIds.length > 0) {
          for (const participantId of removedParticipantIds) {
            // Find the old participant data that was captured before update
            const oldParticipant = oldSnapshot.units
              ?.flatMap((u: any) => u.participants || [])
              ?.find((p: any) => p.id === participantId);

            if (oldParticipant) {
              this.backgroundGoogleCalendarSyncService.queueParticipantDeletion(
                participantId,
                id,
                {
                  id: oldParticipant.id,
                  googleCalendarEventId: oldParticipant.googleCalendarEventId || null,
                  googleCalendarHidden: oldParticipant.googleCalendarHidden || false,
                  googleEmail: oldParticipant.googleEmail || null,
                  userId: oldParticipant.userId,
                },
              );
            } else {
              // Fallback: queue without data (will try to fetch from DB)
              this.logger.warn(
                `[QUEUE] Participant ${participantId} not found in oldSnapshot, queueing without data`,
              );
              this.backgroundGoogleCalendarSyncService.queueParticipantDeletion(
                participantId,
                id,
              );
            }
          }
        }

        // Queue added participants for sync to Google Calendar (only if meeting is approved and has details)
        if (addedParticipantIds.length > 0 && isMeetingApproved) {
          const startTimeStr =
            newMeeting.meetingTime?.split('-')[0] || '09:00';
          const endTimeStr =
            newMeeting.meetingTime?.split('-')[1] || '10:00';

          let meetingDateStr: string;

          if (typeof newMeeting.meetingDate === 'string') {
            // nếu đã là YYYY-MM-DD thì dùng luôn
            if (newMeeting.meetingDate.includes('-')) {
              meetingDateStr = newMeeting.meetingDate;
            } else {
              // fallback DD/MM/YYYY
              const [day, month, year] = newMeeting.meetingDate.split('/');
              meetingDateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          } else {
            // ⚠️ KHÔNG dùng toISOString
            const d = new Date(newMeeting.meetingDate);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            meetingDateStr = `${year}-${month}-${day}`;
          }

          // ✅ giữ timezone +07:00
          const startDateTime = `${meetingDateStr}T${startTimeStr}:00+07:00`;
          const endDateTime = `${meetingDateStr}T${endTimeStr}:00+07:00`;

          const eventInput: GoogleCalendarEventInput = {
            title: newMeeting.title,
            description: newMeeting.content,
            startTime: startDateTime,
            endTime: endDateTime,
            reminders: [
              {
                method: 'email',
                minutes: 60,
              },
            ],
          };

          const newlyAddedParticipants = await this.meetingParticipantRepo
            .createQueryBuilder('p')
            .leftJoinAndSelect('p.unit', 'unit')
            .where('p.id IN (:...ids)', { ids: addedParticipantIds })
            .andWhere('p.participantState = :state', { state: 'CONFIRMED' })
            .andWhere('unit.meetingId = :meetingId', { meetingId: id })
            .getMany();

          for (const participant of newlyAddedParticipants) {
            this.backgroundGoogleCalendarSyncService.queueParticipantSync(
              participant.id,
              id,
              eventInput,
            );
          }
        }
      } catch (error) {
        this.logger.error('Error queuing Google Calendar sync after meeting update:', error);
        // Don't throw - Google Calendar sync is non-blocking, so log and continue
      }

      this.logAsync(req, userId, details, 'SUCCESS');

      // Reset cache sau khi cập nhật meeting thành công
      // this.resetAllMeetingCaches();

      return {
        success: true,
        data: {
          participants: { added, removed },
          rooms: { added: addedRooms, removed: removedRooms },
        },
      };

    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error in update meeting:', err);
      this.logAsync(req, userId, details, 'ERROR');

      return {
        success: false,
        message: err instanceof Error ? err.message : 'Cập nhật cuộc họp thất bại',
      };
    } finally {
      await queryRunner.release();
      // this.calendarService.pushSync(id);
    }
  }


  /**
   * Tự động xác nhận cuộc họp
   * 
   * @param {string} meetingId - ID của cuộc họp
   * @param {object} taskChanges - Các thay đổi về tài liệu (addedTasks, removedTasks)
   * 
   * @returns {Promise<object>} - Trả về một đối tượng chứa kết quả tự động xác nhận cuộc họp
   * 
   * @throws {BadRequestException} - Lỗi không hợp lệ
   */
  async autoConfirmMeeting(
    meetingId: string,
    taskChanges?: {
      addedTasks?: boolean;
      removedTasks?: boolean;
      addedTaskEntities?: MeetingTaskEntity[];
      removedTaskEntities?: MeetingTaskEntity[];
    },
  ) {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
      relations: [
        'onlineMeeting',
        'recurrence',
        'units',
        'units.participants',
        'guests',
      ],
    });

    if (!meeting) {
      return { success: false, message: 'Không tìm thấy cuộc họp' };
    }

    if (meeting.needConfirmation !== false && (meeting.needConfirmation as any) !== 0) {
      this.logger.log(`[autoConfirmMeeting] Cuộc họp ID=${meetingId} ("${meeting.title}") có needConfirmation = ${meeting.needConfirmation} -> BỎ QUA không thực hiện tự động xác nhận.`);
      return { success: true, message: 'Cuộc họp cần xác nhận thủ công, bỏ qua autoConfirmMeeting.' };
    }

    const rules = await this.getRules(meeting.bpmnVersion);
    if (!rules) return;

    const bpmnModel = await this.getBpmnModelCached(meeting.bpmnVersion);
    const xml = bpmnModel.xml;
    const { indexes } = bpmnModel;

    const { participants, allSelectedUnitIds, unitsWithState, summary } = await this.sqlRepo.getParticipantsAndSelectedUnitsWithTask(meetingId);
    // console.log('[INFO] Meeting participants:', participants);
    // console.log('[INFO] Meeting allSelectedUnitIds:', allSelectedUnitIds);
    // console.log('[INFO] Meeting summary:', summary);
    // console.log('[INFO] Meeting summary.received :', summary.received);
    // console.log('[INFO] Meeting summary.confirmed :', summary.confirmed);
    // console.log('[INFO] Meeting summary.delegatedState :', summary.delegatedState);
    // console.log('[INFO] Meeting summary.notParticipate :', summary.notParticipate);
    // console.log('[INFO] Meeting summary.processing :', summary.processing);
    // console.log('[INFO] Meeting summary.done :', summary.done);
    // console.log('[INFO] Meeting summary.assignment :', summary.assignment);

    const workItems = await this.sqlRepo.getOpenWorkItemsByMeeting(meetingId);

    const usersWithTask = participants.filter(p => p.hasTask);
    const usersWithoutTask = participants.filter(p => !p.hasTask);

    const userDelegationRule = rules['AUTO_COMFIRM_USER'];
    const unitRuleComfirm = rules['COMFIRM_UNIT'];
    const afterRuleEdit = rules['AFTER_EDIT_MEETING'];

    const userResolvedNodes: Record<string, any> = {};

    if (userDelegationRule) {
      const nextNodeHasTask = this.resolveConditionalNextNode(
        indexes,
        userDelegationRule.node,
        'hastask',
      );

      usersWithTask.forEach(u => {
        if (u.delegatedToUserId) {
          userResolvedNodes[u.delegatedToUserId] = nextNodeHasTask;
        }
        if (u.assignmentType === 'REPLACED') {
          userResolvedNodes[u.userId] = nextNodeHasTask;
        }
        if (
          u.assignmentType === 'INITIAL' &&
          [
            MEETING_PARTICIPANT_STATE.CONFIRMED,
            MEETING_PARTICIPANT_STATE.PROCESSING,
            MEETING_PARTICIPANT_STATE.DONE,
          ].includes(u.participantState)
        ) {
          userResolvedNodes[u.userId] = nextNodeHasTask;
        }
      });

      const nextNodeNoTask = this.resolveConditionalNextNode(
        indexes,
        userDelegationRule.node,
        'notask',
      );

      usersWithoutTask.forEach(u => {
        if (u.delegatedToUserId) {
          userResolvedNodes[u.delegatedToUserId] = nextNodeNoTask;
        }
        if (u.assignmentType === 'REPLACED') {
          userResolvedNodes[u.userId] = nextNodeNoTask;
        }
        if (
          u.assignmentType === 'INITIAL' &&
          [
            MEETING_PARTICIPANT_STATE.CONFIRMED,
            MEETING_PARTICIPANT_STATE.PROCESSING,
            MEETING_PARTICIPANT_STATE.DONE,
          ].includes(u.participantState)
        ) {
          userResolvedNodes[u.userId] = nextNodeNoTask;
        }
      });
    }

    // =========================
    // ===== UNIT ============
    // =========================
    const unitResolvedNodes: Record<string, any> = {};

    if (unitRuleComfirm && allSelectedUnitIds.length) {
      const outs = indexes.outgoingBySource.get(unitRuleComfirm.node.id) || [];

      for (const f of outs) {
        const { node } = this.bpmnEngine.nextNodeByFlow(f, indexes);
        if (node) {
          // Filter only units with unit_state = RECEIVED
          const receivedUnits = allSelectedUnitIds.filter(unitId => {
            const unitInfo = unitsWithState?.find(u => u.unitId === unitId);
            return unitInfo?.unitState === 'RECEIVED';
          });

          receivedUnits.forEach(u => {
            unitResolvedNodes[u] = node;
          });
          break;
        }
      }
    }

    // =========================
    // ===== SERVICE TASK ======
    // =========================
    let serviceBranches: any[] = [];
    let serviceParticipants: any = null;

    if (afterRuleEdit && summary.received?.length) {
      const outs = indexes.outgoingBySource.get(afterRuleEdit.node.id) || [];

      for (const f of outs) {
        const { node: serviceNode } = this.bpmnEngine.nextNodeByFlow(f, indexes);
        if (!serviceNode) continue;

        const result = await this.serviceTaskExecutor.executeIfServiceTask({
          nodeId: serviceNode.id,
          bpmnXml: xml || '',
          variables: { meetingId, nodeId: serviceNode.id, indexes },
        });

        if (!result?.nextNodes?.length) {
          throw new BadRequestException('ServiceTask không trả về nextNodes');
        }

        serviceBranches = result.nextNodes;
        serviceParticipants = result.participants;
      }
    }

    // =========================
    // ===== MAP USER ==========
    // =========================
    const userNextNodeMap = new Map<string, any[]>();

    for (const branch of serviceBranches) {
      if (branch.extensions?.assignType !== 'USER' && branch.extensions?.assignType !== 'PROCESS') continue;

      const users = new Set<string>();

      // từ branch
      (branch.users || []).forEach(u => users.add(u));

      // từ participants
      if (serviceParticipants) {
        if (
          serviceParticipants.chairman?.userId &&
          serviceParticipants.chairman.userId !== ParticipantType.UNIT
        ) {
          users.add(serviceParticipants.chairman.userId);
        }
        if (
          serviceParticipants.secretary?.userId &&
          serviceParticipants.secretary.userId !== ParticipantType.UNIT
        ) {
          users.add(serviceParticipants.secretary.userId);
        }
      }

      for (const userId of users) {
        if (!userNextNodeMap.has(userId)) {
          userNextNodeMap.set(userId, []);
        }

        userNextNodeMap.get(userId)!.push(branch);
      }
    }

    // =========================
    // ===== TRANSACTION =======
    // =========================
    const tx = await this.sqlRepo.begin();

    try {
      // ===== UNIT =====
      for (const unitId of allSelectedUnitIds) {
        const nextNode = unitResolvedNodes[unitId];
        if (!nextNode) continue;

        const existingWi = workItems.find(
          wi => wi.assignee_user_id === unitId
        );

        if (existingWi) {
          if (existingWi.node_id !== nextNode.id) {
            await this.sqlRepo.updateWorkItemNode(
              existingWi.id,
              nextNode.id,
              tx
            );
          }
        } else {
          await this.sqlRepo.addWorkItem(
            meetingId,
            {
              id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              nodeId: nextNode.id,
              role: indexes.laneMap.get(nextNode.id),
              assigneeUserId: unitId,
              nodeType: nextNode.$type,
            },
            tx,
            meeting.bpmnVersion
          );
        }
      }

      // ===== RECEIVED USER (SERVICE) =====
      const processed = new Set<string>();
      const receivedUserIds = (summary.received || []).map(u => u.userId);
      for (const userId of receivedUserIds) {
        const branches = userNextNodeMap.get(userId);
        if (!branches?.length) continue;

        for (const branch of branches) {
          const key = `${userId}_${branch.nodeId}`;
          if (processed.has(key)) continue;
          processed.add(key);

          const existingExact = workItems.find(
            wi =>
              wi.assignee_user_id === userId &&
              wi.node_id === branch.nodeId &&
              wi.role === branch.role
          );

          if (existingExact) continue;

          const existingWi = workItems.find(
            wi => wi.assignee_user_id === userId && wi.role === branch.role
          );

          if (existingWi) {
            await this.sqlRepo.updateWorkItemNode(
              existingWi.id,
              branch.nodeId,
              tx
            );
          } else {
            await this.sqlRepo.addWorkItem(
              meetingId,
              {
                id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                nodeId: branch.nodeId,
                role: branch.role,
                assigneeUserId: userId,
                nodeType: branch.type,
              },
              tx,
              meeting.bpmnVersion
            );
          }
        }
      }

      // ===== DELEGATE & CONFIRMED USERS =====
      for (const u of participants) {
        // Chỉ tự động cập nhật trạng thái người dùng thành CONFIRMED khi cuộc họp cấu hình KHÔNG cần xác nhận (needConfirmation = false).
        // Nếu needConfirmation = true (hoặc undefined/null), giữ nguyên trạng thái RECEIVED/PENDING để người dùng tự xác nhận tham gia.
        if (meeting.needConfirmation === false && (u.delegatedToUserId || u.assignmentType === 'REPLACED')) {
          await this.sqlRepo.updateParticipantStateByUserTx(
            meetingId,
            u.userId,
            MEETING_PARTICIPANT_STATE.CONFIRMED,
            tx,
          );
        }

        // Handle delegated user
        const delegateeId = u.delegatedToUserId;
        if (delegateeId) {
          const nextNode = userResolvedNodes[delegateeId];
          if (nextNode) {
            const targetRole = indexes.laneMap.get(nextNode.id);
            const existingWi = workItems.find(
              wi => wi.assignee_user_id === delegateeId && wi.role === targetRole
            );

            if (existingWi) {
              if (existingWi.node_id !== nextNode.id) {
                await this.sqlRepo.updateWorkItemNode(
                  existingWi.id,
                  nextNode.id,
                  tx
                );
              }
            } else {
              await this.sqlRepo.addWorkItem(
                meetingId,
                {
                  id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  nodeId: nextNode.id,
                  role: indexes.laneMap.get(nextNode.id),
                  assigneeUserId: delegateeId,
                  nodeType: nextNode.$type,
                },
                tx,
                meeting.bpmnVersion
              );
            }
          }
        }

        // Handle REPLACED or INITIAL (already confirmed) user
        if (
          u.assignmentType === 'REPLACED' ||
          (u.assignmentType === 'INITIAL' &&
            [
              MEETING_PARTICIPANT_STATE.CONFIRMED,
              MEETING_PARTICIPANT_STATE.PROCESSING,
              MEETING_PARTICIPANT_STATE.DONE,
            ].includes(u.participantState))
        ) {
          const nextNode = userResolvedNodes[u.userId];
          if (nextNode) {
            const targetRole = indexes.laneMap.get(nextNode.id);
            const existingWi = workItems.find(
              wi => wi.assignee_user_id === u.userId && wi.role === targetRole
            );

            if (existingWi) {
              if (existingWi.node_id !== nextNode.id) {
                await this.sqlRepo.updateWorkItemNode(
                  existingWi.id,
                  nextNode.id,
                  tx
                );
              }
            } else {
              await this.sqlRepo.addWorkItem(
                meetingId,
                {
                  id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  nodeId: nextNode.id,
                  role: indexes.laneMap.get(nextNode.id),
                  assigneeUserId: u.userId,
                  nodeType: nextNode.$type,
                },
                tx,
                meeting.bpmnVersion
              );
            }
          }
        }
      }

      await this.sqlRepo.commit(tx);

      if (unitRuleComfirm?.role && allSelectedUnitIds.length) {
        try {
          await this.notifyUnitConfirmRoleUsers(
            meeting,
            allSelectedUnitIds,
            unitRuleComfirm.role,
          );
        } catch (notifyErr) {
          this.logger.error(
            `Notify unit confirm role users failed for meeting ${meeting.id}: ${notifyErr.message}`,
          );
        }
      }

      // ===== TASK CHANGE NOTIFICATIONS =====
      if (taskChanges && (taskChanges.addedTasks || taskChanges.removedTasks)) {
        try {
          const participantRepo = this.dataSource.getRepository(MeetingParticipantEntity);
          const unitRepo = this.dataSource.getRepository(MeetingUnitEntity);

          const getClerksForUnits = async (unitIds: string[]): Promise<string[]> => {
            if (!unitIds || unitIds.length === 0) return [];
            try {
              const processKey = meeting.bpmnVersion || 'QUY_TRINH_LICH_HOP';
              const bpmnModel = await this.getBpmnModelCached(processKey);
              const lanes = bpmnModel?.indexes?.lanes || [];
              const unitLane = lanes.find(l => l.properties?.isClerk === 'true');
              const roleCode = unitLane?.role || 'DON_VI_THAM_GIA';

              const clerks = await this.userRepo.createQueryBuilder('user')
                .select(['user.id', 'parentRelation.id'])
                .leftJoin('user.parent', 'parentRelation')
                .leftJoin('roles_process_users', 'rpu', 'rpu.user_id = user.id')
                .leftJoin('user_group_users', 'ugu', 'ugu.user_id = user.id')
                .leftJoin('roles_process_groups', 'rpg', 'rpg.group_id = ugu.group_user_id')
                .leftJoin('roles_process', 'rp', 'rp.id = rpu.role_id OR rp.id = rpg.role_id')
                .where('user.status = 1')
                .andWhere('rp.is_active = 1')
                .andWhere('rp.role_code = :roleCode', { roleCode })
                .andWhere('rp.process_key = :processKey', { processKey })
                .andWhere('parentRelation.id IN (:...unitIds)', { unitIds })
                .getMany();

              return clerks.map(c => c.id).filter(Boolean);
            } catch (err) {
              this.logger.error(`Error resolving clerks for units: ${err.message}`);
              return [];
            }
          };

          const addedUserIds = new Set<string>();
          const addedUnitIds = new Set<string>();

          if (taskChanges.addedTaskEntities && taskChanges.addedTaskEntities.length > 0) {
            for (const task of taskChanges.addedTaskEntities) {
              if (task.attachableType === 'PARTICIPANT') {
                const participant = await participantRepo.findOne({
                  where: { id: task.attachableId },
                  select: ['userId', 'unitId'],
                });
                if (participant) {
                  if (participant.userId === 'UNIT' && participant.unitId) {
                    addedUnitIds.add(participant.unitId);
                  } else if (participant.userId && participant.userId !== 'UNIT') {
                    addedUserIds.add(participant.userId);
                  }
                }
              } else if (task.attachableType === 'UNIT') {
                const meetingUnit = await unitRepo.findOne({
                  where: { id: task.attachableId },
                  select: ['unitId'],
                });
                if (meetingUnit && meetingUnit.unitId) {
                  addedUnitIds.add(meetingUnit.unitId);
                }
              }
            }
          }

          const addedTaskRecipientIds = new Set<string>([...addedUserIds]);
          if (addedUnitIds.size > 0) {
            const clerkIds = await getClerksForUnits(Array.from(addedUnitIds));
            clerkIds.forEach(id => addedTaskRecipientIds.add(id));
          }

          if (taskChanges.addedTasks && addedTaskRecipientIds.size === 0) {
            usersWithTask.forEach(u => {
              if (u.userId) addedTaskRecipientIds.add(u.userId);
            });
            allSelectedUnitIds.forEach(unitId => {
              if (unitId && unitId !== ParticipantType.UNIT) {
                addedTaskRecipientIds.add(unitId);
              }
            });
          }

          const removedUserIds = new Set<string>();
          const removedUnitIds = new Set<string>();

          if (taskChanges.removedTaskEntities && taskChanges.removedTaskEntities.length > 0) {
            for (const task of taskChanges.removedTaskEntities) {
              if (task.attachableType === 'PARTICIPANT') {
                const participant = await participantRepo.findOne({
                  where: { id: task.attachableId },
                  select: ['userId', 'unitId'],
                });
                if (participant) {
                  if (participant.userId === 'UNIT' && participant.unitId) {
                    removedUnitIds.add(participant.unitId);
                  } else if (participant.userId && participant.userId !== 'UNIT') {
                    removedUserIds.add(participant.userId);
                  }
                }
              } else if (task.attachableType === 'UNIT') {
                const meetingUnit = await unitRepo.findOne({
                  where: { id: task.attachableId },
                  select: ['unitId'],
                });
                if (meetingUnit && meetingUnit.unitId) {
                  removedUnitIds.add(meetingUnit.unitId);
                }
              }
            }
          }

          const removedTaskRecipientIds = new Set<string>([...removedUserIds]);
          if (removedUnitIds.size > 0) {
            const clerkIds = await getClerksForUnits(Array.from(removedUnitIds));
            clerkIds.forEach(id => removedTaskRecipientIds.add(id));
          }

          if (taskChanges.removedTasks && removedTaskRecipientIds.size === 0) {
            usersWithTask.forEach(u => {
              if (u.userId) removedTaskRecipientIds.add(u.userId);
            });
            allSelectedUnitIds.forEach(unitId => {
              if (unitId && unitId !== ParticipantType.UNIT) {
                removedTaskRecipientIds.add(unitId);
              }
            });
          }

          if (addedTaskRecipientIds.size > 0) {
            const hasSpecificEntities = taskChanges.addedTaskEntities && taskChanges.addedTaskEntities.length > 0;
            const addedNotificationMessage = hasSpecificEntities
              ? `Bạn có một công việc chuẩn bị tài liệu cho cuộc họp "${meeting.title}" vào ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)}. Vui lòng kiểm tra và thực hiện.`
              : `Cuộc họp "${meeting.title}" vào ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)} đã được thêm tài liệu chuẩn bị. Vui lòng kiểm tra và chuẩn bị tài liệu cần thiết.`;

            this.notificationService.createForRecipients({
              recipientIds: Array.from(addedTaskRecipientIds),
              senderId: meeting.createdBy || 'SYSTEM',
              type: NotificationType.MEETING_DOC_UNLOADED_REMINDER.value,
              content: addedNotificationMessage,
              recordId: meetingId,
              link: `/meetings/${meetingId}?listparammeeting=PARTICIPANT_MEETING`,
              key: NotificationKey.VIEW_MEETING_ROOM,
              time: new Date(),
              status: 0,
            });
          }

          if (removedTaskRecipientIds.size > 0) {
            const removedNotificationMessage = `Cuộc họp "${meeting.title}" vào ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)} đã xóa một số tài liệu. Vui lòng kiểm tra lại danh sách tài liệu cần chuẩn bị.`;

            this.notificationService.createForRecipients({
              recipientIds: Array.from(removedTaskRecipientIds),
              senderId: meeting.createdBy || 'SYSTEM',
              type: NotificationType.MEETING_DOC_UNLOADED_REMINDER.value,
              content: removedNotificationMessage,
              recordId: meetingId,
              link: `/meetings/${meetingId}?listparammeeting=PARTICIPANT_MEETING`,
              key: NotificationKey.VIEW_MEETING_ROOM,
              time: new Date(),
              status: 0,
            });
          }
        } catch (notifyErr) {
          this.logger.error(
            `Notify task changes failed for meeting ${meetingId}: ${notifyErr.message}`,
          );
        }
      }

    } catch (err) {
      await this.sqlRepo.rollback(tx);
      throw err;
    }
  }

  private diffById<T extends { id?: string }>(
    oldItems: T[],
    newItems: T[],
  ): {
    added: T[];
    updated: { before: T; after: T }[];
    removed: T[];
  } {
    const oldMap = new Map<string | undefined, T>(
      oldItems.map(i => [i.id, i]),
    );

    const added: T[] = [];
    const updated: { before: T; after: T }[] = [];
    const removed: T[] = [];

    for (const item of newItems) {
      if (!item.id) {
        added.push(item);
        continue;
      }

      const existing = oldMap.get(item.id);

      if (existing) {
        updated.push({ before: existing, after: item });
        oldMap.delete(item.id);
      } else {
        added.push(item);
      }
    }

    removed.push(...oldMap.values());

    return { added, updated, removed };
  }
  private async getMeetingForUpdate(
    queryRunner: QueryRunner,
    id: string,
  ) {
    const meeting = await queryRunner.manager.findOne(MeetingEntity, {
      where: { id },
      relations: [
        'recurrence',
        'units',
        'units.participants',
        'onlineMeeting',
        'guests',
      ],
    });

    if (!meeting) {
      throw new Error('Không tìm thấy cuộc họp');
    }

    return meeting;
  }

  private async ensureChairmanUnitConsistency(
    queryRunner: QueryRunner,
    meeting: MeetingEntity,
    chairmanDto: any,
    changeSet?: MeetingChangeSet,
  ) {
    const chairmanId = chairmanDto?.userId ?? null;

    if (!chairmanId) {
      return;
    }

    const chairmanType = chairmanDto?.chairmanType || ParticipantType.USER;
    const nextRoomId = chairmanDto?.roomId ?? null;
    const nextSeatNumber = chairmanDto?.seatNumber ?? null;

    const unitRepo = queryRunner.manager.getRepository(MeetingUnitEntity);
    const participantRepo =
      queryRunner.manager.getRepository(MeetingParticipantEntity);

    let chairmanUnit = await unitRepo.findOne({
      where: { meetingId: meeting.id, unitId: 'CHAIRMAN_UNIT' },
      relations: ['participants'],
    });

    if (!chairmanUnit) {
      chairmanUnit = await unitRepo.save(
        unitRepo.create({
          meetingId: meeting.id,
          unitId: 'CHAIRMAN_UNIT',
          roomId: nextRoomId,
          seatNumber: nextSeatNumber,
        }),
      );
      changeSet?.addedUnits.push(chairmanUnit);
    } else if (
      chairmanUnit.roomId !== nextRoomId ||
      chairmanUnit.seatNumber !== nextSeatNumber
    ) {
      chairmanUnit.roomId = nextRoomId;
      chairmanUnit.seatNumber = nextSeatNumber;
      chairmanUnit = await unitRepo.save(chairmanUnit);
      changeSet?.updatedUnits.push(chairmanUnit);
    }

    const expectedUserType =
      chairmanType === ParticipantType.UNIT ? UserType.UNIT : UserType.USER;
    const expectedUserId =
      chairmanType === ParticipantType.UNIT
        ? ParticipantType.UNIT
        : chairmanId;
    const expectedUnitId =
      chairmanType === ParticipantType.UNIT ? chairmanId : null;

    const chairmanParticipants = (chairmanUnit.participants ?? []).filter(
      (participant) => participant.participantRole === 'CHAIRMAN',
    );

    let participant = chairmanParticipants[0] ?? null;

    for (const staleParticipant of chairmanParticipants.slice(1)) {
      await participantRepo.remove(staleParticipant);
      changeSet?.removedParticipants.push(staleParticipant);
    }

    if (!participant) {
      participant = await participantRepo.save(
        participantRepo.create({
          meetingUnitId: chairmanUnit.id,
          participantRole: 'CHAIRMAN',
          userId: expectedUserId,
          unitId: expectedUnitId,
          userType: expectedUserType,
          seatNumber: nextSeatNumber,
          roomId: nextRoomId,
        }),
      );
      changeSet?.addedParticipants.push(participant);
      return;
    }

    const hasChanged =
      participant.userId !== expectedUserId ||
      participant.unitId !== expectedUnitId ||
      participant.userType !== expectedUserType ||
      participant.seatNumber !== nextSeatNumber ||
      participant.roomId !== nextRoomId;

    if (!hasChanged) {
      return;
    }

    participant.userId = expectedUserId;
    participant.unitId = expectedUnitId;
    participant.userType = expectedUserType;
    participant.seatNumber = nextSeatNumber;
    participant.roomId = nextRoomId;

    participant = await participantRepo.save(participant);
    changeSet?.updatedParticipants.push(participant);
  }

  private async softDeleteMeetingTaskFiles(
    queryRunner: QueryRunner,
    taskIds: string[],
  ) {
    const uniqueTaskIds = Array.from(new Set(taskIds.filter(Boolean)));

    for (const taskId of uniqueTaskIds) {
      await queryRunner.manager.query(
        `
          UPDATE ${this.dbname}.file_relations
          SET status = 3
          WHERE object_type = 'MeetingTask'
            AND object_id = @0
            AND status <> 3
        `,
        [taskId],
      );
    }
  }

  private async resetApprovedMeetingParticipants(
    queryRunner: QueryRunner,
    participantIds: string[],
  ) {
    const uniqueParticipantIds = Array.from(
      new Set(participantIds.filter(Boolean)),
    );

    if (!uniqueParticipantIds.length) {
      return;
    }

    await queryRunner.manager
      .createQueryBuilder()
      .update(MeetingParticipantEntity)
      .set({
        acceptJoin: false,
        prepareDocuments: false,
        participantState: ParticipantState.RECEIVED,
        attendanceState: 'RECEIVED',
        attendanceAt: null,
        notCheck: false,
        assignmentType: AssignmentType.INITIAL,
        delegatedToUserId: null,
        delegatedFromUserId: null,
        delegatedAt: null,
        delegationState: DelegationState.NONE,
        rejectReason: null,
      })
      .whereInIds(uniqueParticipantIds)
      .andWhere('participant_state IN (:...states)', {
        states: [ParticipantState.RECEIVED, ParticipantState.PENDING],
      })
      .execute();
  }

  private async resetApprovedMeetingUnits(
    queryRunner: QueryRunner,
    unitIds: string[],
  ) {
    const uniqueUnitIds = Array.from(new Set(unitIds.filter(Boolean)));

    if (!uniqueUnitIds.length) {
      return;
    }

    // Lấy danh sách các unit để biết is_room_selected của từng cái
    const units = await queryRunner.manager.find(MeetingUnitEntity, {
      where: { id: In(uniqueUnitIds) },
      select: ['id', 'isRoomSelected'],
    });

    // Phân nhóm: is_room_selected=true → RECEIVED, false → PENDING
    const receivedIds = units
      .filter(u => u.isRoomSelected === true)
      .map(u => u.id);
    const pendingIds = units
      .filter(u => u.isRoomSelected !== true)
      .map(u => u.id);

    if (receivedIds.length) {
      await queryRunner.manager
        .createQueryBuilder()
        .update(MeetingUnitEntity)
        .set({
          acceptJoin: false,
          assignParticipants: false,
          prepareDocuments: false,
          processby: null,
          unitState: MEETING_UNIT_STATE.RECEIVED,
        })
        .whereInIds(receivedIds)
        .andWhere('unit_state IN (:...states)', {
          states: [MEETING_UNIT_STATE.RECEIVED, MEETING_UNIT_STATE.PENDING],
        })
        .execute();
    }

    if (pendingIds.length) {
      await queryRunner.manager
        .createQueryBuilder()
        .update(MeetingUnitEntity)
        .set({
          acceptJoin: false,
          assignParticipants: false,
          prepareDocuments: false,
          processby: null,
          unitState: MEETING_UNIT_STATE.PENDING,
        })
        .whereInIds(pendingIds)
        .andWhere('unit_state IN (:...states)', {
          states: [MEETING_UNIT_STATE.RECEIVED, MEETING_UNIT_STATE.PENDING],
        })
        .execute();
    }
  }

  private async clearMeetingWorkItemsByAssignees(
    queryRunner: QueryRunner,
    meetingId: string,
    assigneeIds: string[],
  ) {
    const uniqueAssigneeIds = Array.from(new Set(assigneeIds.filter(Boolean)));

    for (const assigneeId of uniqueAssigneeIds) {
      await queryRunner.manager.query(
        `
          DELETE FROM ${this.dbname}.work_items
          WHERE document_id = @0
            AND assignee_user_id = @1
            AND state = 'open'
        `,
        [meetingId, assigneeId],
      );
    }
  }

  private async updateBasicInfo(
    queryRunner: QueryRunner,
    meeting: MeetingEntity,
    basicData: any,
    roomIds?: string[],
    isCompany?: boolean,
    isToday?: boolean,
  ) {
    if (isToday === true) {
      meeting.isOverrideInstance = true;
    }

    if (roomIds !== undefined) {
      meeting.roomIds = roomIds.length ? roomIds.join(',') : '';
    }

    if (isCompany !== undefined) {
      meeting.isCompany = isCompany;
    }

    Object.assign(meeting, basicData);
    const finalMode = (meeting.meetingMode || '').toUpperCase();
    if (finalMode !== 'OUTSIDETHECOMPANY') {
      meeting.location = null;
    }

    await queryRunner.manager.save(meeting);
  }
  private async updateOnlineMeeting(
    queryRunner: QueryRunner,
    meeting: MeetingEntity,
    onlineMeetingDto?: any,
  ) {
    if (onlineMeetingDto === undefined) return;

    if (!onlineMeetingDto && meeting.onlineMeeting) {
      await queryRunner.manager.remove(meeting.onlineMeeting);
      meeting.onlineMeeting = undefined;
      return;
    }

    if (onlineMeetingDto) {
      if (!meeting.onlineMeeting) {
        meeting.onlineMeeting = queryRunner.manager.create(
          OnlineMeetingEntity,
          onlineMeetingDto,
        );
      } else {
        Object.assign(meeting.onlineMeeting, onlineMeetingDto);
      }

      await queryRunner.manager.save(meeting.onlineMeeting);
    }
  }

  private async updateRecurrence(
    queryRunner: QueryRunner,
    meeting: MeetingEntity,
    recurrenceDto?: any,
  ) {
    if (recurrenceDto === undefined) return;

    if (!recurrenceDto || recurrenceDto.type === RecurrenceType.KHONG) {
      if (meeting.recurrence) {
        await queryRunner.manager.remove(meeting.recurrence);
        meeting.recurrence = undefined;
      }
      return;
    }

    const meetingDate = dayjs(meeting.meetingDate);
    const data = this.buildRecurrenceData(meetingDate, recurrenceDto);

    if (!meeting.recurrence) {
      const entity = queryRunner.manager.create(MeetingRecurrenceEntity, {
        ...data,
        meeting: { id: meeting.id },
      });

      meeting.recurrence = await queryRunner.manager.save(entity);
    } else {
      Object.assign(meeting.recurrence, data);
      meeting.recurrence = await queryRunner.manager.save(
        meeting.recurrence,
      );
    }
  }

  private async updateMeetingTasks(
    queryRunner: QueryRunner,
    meeting: MeetingEntity,
    tasksDto?: any[],
  ) {
    if (!tasksDto) return;

    const meetingTasks = tasksDto.filter(
      t => t.attachableType === 'MEETING'
    );

    const oldTasks = await queryRunner.manager.find(MeetingTaskEntity, {
      where: {
        meetingId: meeting.id,
        attachableType: 'MEETING',
      },
    });

    const { added, updated, removed } = this.diffById(oldTasks, meetingTasks);

    // DELETE
    if (removed.length) {
      await queryRunner.manager.delete(MeetingTaskEntity, {
        id: In(removed.map(r => r.id)),
      });
    }

    // UPDATE
    const updatedEntities = updated.map(u => {
      Object.assign(u.before, u.after);
      return u.before;
    });

    if (updatedEntities.length) {
      await queryRunner.manager.save(MeetingTaskEntity, updatedEntities);
    }

    // ADD
    if (added.length) {
      await queryRunner.manager.insert(
        MeetingTaskEntity,
        added.map(a => ({
          ...a,
          meetingId: meeting.id,
          attachableType: 'MEETING',
          attachableId: meeting.id,
        }))
      );
    }
  }
  private async syncTasksSafe(
    taskRepo: Repository<MeetingTaskEntity>,
    meetingId: string,
    attachableType: 'UNIT' | 'PARTICIPANT',
    attachableId: string,
    tasksDto: TaskDto[],
    changeSet?: MeetingChangeSet,
  ) {
    const oldTasks = await taskRepo.find({
      where: { meetingId, attachableType, attachableId },
    });

    const oldTaskMap = new Map(oldTasks.map(t => [t.id, t]));

    const dtoTasksWithId = tasksDto.filter(t => t.id);
    const dtoIdSet = new Set(dtoTasksWithId.map(t => t.id));

    /* ================= DELETE (SAFE) ================= */

    // Delete old tasks that are not in the new DTO
    // This handles both cases:
    // 1. Empty array: delete all old tasks
    // 2. Array with tasks: delete only those not in the new DTO
    const removedTasksList = oldTasks.filter(t => !dtoIdSet.has(t.id));
    const removeIds = removedTasksList.map(t => t.id);

    if (removeIds.length) {
      await taskRepo.delete({ id: In(removeIds) });
      if (changeSet) {
        changeSet.removedTasks.push(...removedTasksList);
      }
    }

    /* ================= ADD / UPDATE ================= */

    for (const dto of tasksDto) {
      const existing = dto.id ? oldTaskMap.get(dto.id) : undefined;

      // ADD
      if (!existing) {
        const saved = await taskRepo.save(
          taskRepo.create({
            meetingId,
            attachableType,
            attachableId,
            attachableRole: dto.attachableRole ?? null,
            content: dto.content,
            documentName: dto.documentName,
            deadline: new Date(dto.deadline),
          }),
        );

        changeSet?.addedTasks.push(saved);
        continue;
      }

      // UPDATE
      const newDeadline = new Date(dto.deadline).getTime();
      const oldDeadline = existing.deadline?.getTime?.() ?? 0;

      const hasChanged =
        existing.content !== dto.content ||
        existing.documentName !== dto.documentName ||
        existing.attachableRole !== (dto.attachableRole ?? null) ||
        oldDeadline !== newDeadline;

      if (hasChanged) {
        existing.content = dto.content;
        existing.documentName = dto.documentName;
        existing.deadline = new Date(dto.deadline);
        existing.attachableRole = dto.attachableRole ?? null;

        const saved = await taskRepo.save(existing);
        changeSet?.updatedTasks.push(saved);
      }
    }
  }
  private async updateUnits(
    queryRunner: QueryRunner,
    meeting: MeetingEntity,
    unitsDto?: UnitDto[],
    changeSet?: MeetingChangeSet,
  ) {
    if (unitsDto === undefined) return;

    const manager = queryRunner.manager;
    const systemUnitIds = new Set(['CHAIRMAN_UNIT', 'SECRETARY_UNIT']);

    const unitRepo = manager.getRepository(MeetingUnitEntity);
    const participantRepo = manager.getRepository(MeetingParticipantEntity);
    const taskRepo = manager.getRepository(MeetingTaskEntity);

    const oldUnits = (await unitRepo.find({
      where: { meetingId: meeting.id },
      relations: ['participants'],
    })).filter(u => !systemUnitIds.has(u.unitId));

    const normalizedUnitsDto = unitsDto.filter(
      unitDto => !systemUnitIds.has(unitDto.unitId),
    );
    const oldUnitById = new Map(oldUnits.map(u => [u.id, u]));
    const oldUnitByUnitId = new Map(oldUnits.map(u => [u.unitId, u]));
    const matchedOldUnitIds = new Set<string>();

    /* ================= REMOVE UNIT ================= */

    for (const unitDto of normalizedUnitsDto) {
      const matchedUnit =
        (unitDto.id ? oldUnitById.get(unitDto.id) : undefined) ??
        oldUnitByUnitId.get(unitDto.unitId);

      if (matchedUnit) {
        matchedOldUnitIds.add(matchedUnit.id);
      }
    }

    const unitsToRemove = oldUnits.filter((u) => !matchedOldUnitIds.has(u.id));
    if (unitsToRemove.length) {
      const unitIdsToRemove = unitsToRemove.map((u) => u.id);
      const allParticipantIdsToRemove = unitsToRemove.flatMap((u) =>
        (u.participants || []).map((p) => p.id),
      );

      // Bulk delete seats
      await manager.query(
        `
          DELETE FROM ${this.dbname}.meeting_unit_seats
          WHERE meeting_unit_id IN (${unitIdsToRemove.map((id) => `'${id}'`).join(',')})
        `,
      );

      // Bulk delete unit tasks
      await taskRepo.delete({
        meetingId: meeting.id,
        attachableType: 'UNIT',
        attachableId: In(unitIdsToRemove),
      });

      if (allParticipantIdsToRemove.length) {
        // Bulk delete participant tasks
        await taskRepo.delete({
          meetingId: meeting.id,
          attachableType: 'PARTICIPANT',
          attachableId: In(allParticipantIdsToRemove),
        });

        // Bulk delete participants
        await participantRepo.delete({
          id: In(allParticipantIdsToRemove),
        });
      }

      // Bulk delete units
      await unitRepo.delete({ id: In(unitIdsToRemove) });
      if (changeSet) {
        changeSet.removedUnits.push(...unitsToRemove);
      }
    }

    /* ================= ADD / UPDATE UNIT ================= */

    const unitsToSave: MeetingUnitEntity[] = [];
    const unitDtoMap = new Map<MeetingUnitEntity, UnitDto>();

    for (const unitDto of normalizedUnitsDto) {
      const existing =
        (unitDto.id ? oldUnitById.get(unitDto.id) : undefined) ??
        oldUnitByUnitId.get(unitDto.unitId);

      if (!existing) {
        const newUnit = unitRepo.create({
          meetingId: meeting.id,
          unitId: unitDto.unitId,
          isRoomSelected: unitDto.isRoomSelected,
          // Đặt unitState ngược theo isRoomSelected ngay khi tạo mới
          unitState: unitDto.isRoomSelected
            ? MEETING_UNIT_STATE.RECEIVED
            : MEETING_UNIT_STATE.PENDING,
        });
        unitsToSave.push(newUnit);
        unitDtoMap.set(newUnit, unitDto);
        changeSet?.addedUnits.push(newUnit);
      } else {
        const hasChanged =
          existing.unitId !== unitDto.unitId ||
          existing.isRoomSelected !== unitDto.isRoomSelected;

        if (hasChanged) {
          existing.unitId = unitDto.unitId;
          existing.isRoomSelected = unitDto.isRoomSelected;
          // Đồng bộ unitState theo isRoomSelected khi có thay đổi
          existing.unitState = unitDto.isRoomSelected
            ? MEETING_UNIT_STATE.RECEIVED
            : MEETING_UNIT_STATE.PENDING;
          unitsToSave.push(existing);
          changeSet?.updatedUnits.push(existing);
        }
        unitDtoMap.set(existing, unitDto);
      }
    }

    if (unitsToSave.length) {
      const savedUnits = await unitRepo.save(unitsToSave);
      // Update our lookup maps with newly saved units
      for (const s of savedUnits) {
        if (s.id) oldUnitById.set(s.id, s);
        if (s.unitId) oldUnitByUnitId.set(s.unitId, s);
      }
    }

    for (const unitDto of normalizedUnitsDto) {
      const unit =
        (unitDto.id ? oldUnitById.get(unitDto.id) : undefined) ??
        oldUnitByUnitId.get(unitDto.unitId);

      if (!unit) continue;

      /* ================= UNIT TASKS ================= */

      if (unitDto.tasks !== undefined) {
        await this.syncTasksSafe(
          taskRepo,
          meeting.id,
          'UNIT',
          unit.id,
          unitDto.tasks,
          changeSet,
        );
      }

      /* ================= UNIT SEATS ================= */

      if (unitDto.sittingPosition !== undefined) {
        await manager.query(
          `
            DELETE FROM ${this.dbname}.meeting_unit_seats
            WHERE meeting_unit_id = @0
          `,
          [unit.id],
        );

        const seatEntities: MeetingUnitSeatEntity[] = [];

        for (const position of unitDto.sittingPosition ?? []) {
          for (const seatNumber of position.seatNumber ?? []) {
            seatEntities.push(
              manager.create(MeetingUnitSeatEntity, {
                roomId: position.roomId,
                seatNumber,
                unit,
              }),
            );
          }
        }

        if (seatEntities.length) {
          await manager.save(seatEntities);
        }
      }

      /* ================= PARTICIPANTS ================= */

      if (unitDto.participants === undefined) continue;

      const oldParticipants: MeetingParticipantEntity[] = unit.participants || [];
      const oldParticipantMap = new Map<string, MeetingParticipantEntity>(
        oldParticipants.map(p => [p.id, p]),
      );
      const matchedParticipantIds = new Set<string>();

      const resolvedParticipants: { dto: ParticipantDto; participant?: MeetingParticipantEntity }[] = unitDto.participants.map((pDto) => {
        let participant =
          pDto.id ? oldParticipantMap.get(pDto.id) : undefined;

        if (!participant) {
          participant = oldParticipants.find(
            p => (p.userId === pDto.userId || (p.delegatedToUserId === pDto.userId && p.delegationState === 'ACCEPTED')) && !matchedParticipantIds.has(p.id),
          );
        }

        if (participant) {
          matchedParticipantIds.add(participant.id);
        }

        return { dto: pDto, participant };
      });

      // REMOVE PARTICIPANTS (Bulk)
      const participantsToRemove = oldParticipants.filter(
        (p) => !matchedParticipantIds.has(p.id),
      );
      if (participantsToRemove.length) {
        const pIdsToRemove = participantsToRemove.map((p) => p.id);
        await taskRepo.delete({
          meetingId: meeting.id,
          attachableType: 'PARTICIPANT',
          attachableId: In(pIdsToRemove),
        });

        await participantRepo.remove(participantsToRemove);
        if (changeSet) {
          changeSet.removedParticipants.push(...participantsToRemove);
        }
      }

      // ADD / UPDATE PARTICIPANTS (Bulk)
      const participantsToSave: MeetingParticipantEntity[] = [];
      const addedPs: MeetingParticipantEntity[] = [];
      const updatedPs: MeetingParticipantEntity[] = [];

      for (const { dto: pDto, participant: resolvedParticipant } of resolvedParticipants) {
        if (!resolvedParticipant) {
          const newP = participantRepo.create({
            meetingUnitId: unit.id,
            userId: pDto.userId,
            seatNumber: pDto.seatNumber ?? null,
            roomId: pDto.roomId ?? null,
            assignmentType: AssignmentType.INITIAL,
            participantState: meeting.needConfirmation === false ? ParticipantState.CONFIRMED : ParticipantState.RECEIVED,
            acceptJoin: meeting.needConfirmation === false ? true : false,
          });
          participantsToSave.push(newP);
          addedPs.push(newP);
        } else {
          const isDelegate = resolvedParticipant.delegatedToUserId === pDto.userId && resolvedParticipant.delegationState === 'ACCEPTED';
          const hasUserIdChanged = resolvedParticipant.userId !== pDto.userId && !isDelegate;

          const hasChanged =
            hasUserIdChanged ||
            resolvedParticipant.seatNumber !== (pDto.seatNumber ?? null) ||
            resolvedParticipant.roomId !== (pDto.roomId ?? null);

          if (hasChanged) {
            if (hasUserIdChanged) {
              resolvedParticipant.userId = pDto.userId;
            }
            resolvedParticipant.seatNumber = pDto.seatNumber ?? null;
            resolvedParticipant.roomId = pDto.roomId ?? null;
            participantsToSave.push(resolvedParticipant);
            updatedPs.push(resolvedParticipant);
          }
        }
      }

      if (participantsToSave.length) {
        await participantRepo.save(participantsToSave);
        if (changeSet) {
          if (addedPs.length) changeSet.addedParticipants.push(...addedPs);
          if (updatedPs.length) changeSet.updatedParticipants.push(...updatedPs);
        }
      }

      // Refresh participant references in resolvedParticipants after save to get IDs
      for (const item of resolvedParticipants) {
        if (!item.participant) {
          item.participant = participantsToSave.find(p => p.userId === item.dto.userId && p.meetingUnitId === unit.id);
        }
      }

      for (const { dto: pDto, participant } of resolvedParticipants) {
        if (!participant) continue;

        /* ================= PARTICIPANT TASKS ================= */

        if (pDto.tasks !== undefined) {
          await this.syncTasksSafe(
            taskRepo,
            meeting.id,
            'PARTICIPANT',
            participant.id,
            pDto.tasks,
            changeSet,
          );
        }
      }
    }
  }

  private async updateGuests(
    queryRunner: QueryRunner,
    meeting: MeetingEntity,
    guestsDto?: any[],
  ) {
    if (guestsDto === undefined) return;

    const guestRepo = queryRunner.manager.getRepository(MeetingGuest);

    const oldGuests = await guestRepo.find({
      where: { meeting: { id: meeting.id } },
    });

    const { added, updated, removed } = this.diffById(oldGuests, guestsDto);

    const removedIds = removed
      .map((guest) => guest.id)
      .filter((id): id is string => !!id);

    if (removedIds.length) {
      await guestRepo.delete({ id: In(removedIds) });
    }

    const changedUpdates = updated.filter((u) => {
      const afterKeys = Object.keys(u.after || {}).filter((k) => k !== 'id');
      return afterKeys.some((key) => (u.before as any)[key] !== (u.after as any)[key]);
    });

    for (const u of changedUpdates) {
      Object.assign(u.before, u.after);
    }
    if (changedUpdates.length) await guestRepo.save(changedUpdates.map((u) => u.before));

    if (added.length) {
      const entities = added.map((a) =>
        guestRepo.create({
          ...(a as DeepPartial<MeetingGuest>),
          meeting,
        } as DeepPartial<MeetingGuest>),
      );
      await guestRepo.save(entities);
    }
  }

  private buildRecurrenceData(
    meetingDate: dayjs.Dayjs,
    recurrenceDto: any,
  ): DeepPartial<MeetingRecurrenceEntity> {
    const today = dayjs().format('YYYY-MM-DD');

    let endDate: string | null = null;
    let dayOfMonth: string | null = null;
    let dayOfYear: string | null = null;

    // ===== NGAY =====
    if (recurrenceDto.type === RecurrenceType.NGAY) {
      if (!recurrenceDto.endDate) {
        throw new BadRequestException('NGAY phải có endDate');
      }
      endDate = recurrenceDto.endDate;
    }

    // ===== TUAN =====
    if (recurrenceDto.type === RecurrenceType.TUAN) {
      if (!recurrenceDto.daysOfWeek) {
        throw new BadRequestException('TUAN phải có daysOfWeek');
      }
      endDate = recurrenceDto.endDate ?? null;
    }

    // ===== THANG =====
    if (recurrenceDto.type === RecurrenceType.THANG) {
      if (!recurrenceDto.endMonth) {
        throw new BadRequestException('THANG phải có endMonth');
      }

      const day = meetingDate.date();
      dayOfMonth = String(day);

      const endMonth = dayjs(`${recurrenceDto.endMonth}-01`);

      const finalDay =
        day > endMonth.daysInMonth()
          ? endMonth.daysInMonth()
          : day;

      endDate = endMonth.date(finalDay).format('YYYY-MM-DD');
    }

    // ===== NAM =====
    if (recurrenceDto.type === RecurrenceType.NAM) {
      if (!recurrenceDto.endYear) {
        throw new BadRequestException('NAM phải có endYear');
      }

      dayOfYear = meetingDate.format('MM-DD');

      const [monthStr, dayStr] = dayOfYear.split('-');
      const month = Number(monthStr);
      const day = Number(dayStr);

      const endYear = dayjs(`${recurrenceDto.endYear}-01-01`);

      let finalDate = endYear.month(month - 1).date(day);

      if (day > finalDate.daysInMonth()) {
        finalDate = finalDate.date(finalDate.daysInMonth());
      }

      endDate = finalDate.format('YYYY-MM-DD');
    }

    // ===== TUY_CHINH =====
    if (recurrenceDto.type === RecurrenceType.TUY_CHINH) {
      if (!recurrenceDto.intervalValue) {
        throw new BadRequestException('TUY_CHINH phải có intervalValue');
      }
      endDate = recurrenceDto.endDate ?? null;
    }

    const data: DeepPartial<MeetingRecurrenceEntity> = {
      type: recurrenceDto.type,
      startDate: recurrenceDto.startDate ?? today,
      endDate,

      daysOfWeek:
        recurrenceDto.type === RecurrenceType.TUAN
          ? recurrenceDto.daysOfWeek?.toUpperCase() ?? null
          : null,

      dayOfMonth,
      dayOfYear,

      intervalValue:
        recurrenceDto.type === RecurrenceType.TUY_CHINH
          ? recurrenceDto.intervalValue ?? null
          : null,
    };

    if (data.endDate && dayjs(data.endDate).isBefore(data.startDate!)) {
      throw new BadRequestException('endDate phải sau startDate');
    }

    return data;
  }

  private async sendMeetingRoleEmail(
    email: string,
    meeting: MeetingEntity,
    role: 'CHỦ TRÌ' | 'THƯ KÝ',
  ) {
    try {
      const subject = `[Phân công cuộc họp] ${meeting.title}`;

      const html = `
        <p>Kính gửi,</p>

        <p>Bạn vừa được phân công <b>${role}</b> cho cuộc họp:</p>

        <p>
          <b>Tiêu đề:</b> ${meeting.title}<br/>
          <b>Thời gian:</b> ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)}
        </p>

        <p>Vui lòng truy cập hệ thống để xem chi tiết.</p>

        <p>Trân trọng,<br/>Hệ thống quản lý cuộc họp</p>
      `;

      await this.mailService.sendMail({
        to: email,
        subject,
        html,
      });
    } catch (err) {
      this.logger.error(`Send meeting role email failed: ${err.message}`);
    }
  }
  /**
   * Cập nhật người chủ trì cuộc họp
   * @param {QueryRunner} queryRunner - Query runner cho transaction
   * @param {MeetingEntity} meeting - Cuộc họp cần cập nhật
   * @param {any} chairmanDto - Dữ liệu người chủ trì mới
   * @param {string} userId - ID người dùng hiện tại
   * @param {MeetingChangeSet} [changeSet] - Dữ liệu thay đổi của cuộc họp
   * @returns {Promise<void>}
   */
  private async updateChairman(
    queryRunner: QueryRunner,
    meeting: MeetingEntity,
    chairmanDto: any,
    userId: string,
    changeSet?: MeetingChangeSet,
  ) {
    if (chairmanDto === undefined) return;

    const meetingRepo = queryRunner.manager.getRepository(MeetingEntity);
    const oldChairmanId = meeting.chairmanId;
    const newChairmanId = chairmanDto?.userId ?? null;
    const chairmanType = chairmanDto?.chairmanType || ParticipantType.USER;
    const nextRoomId = chairmanDto?.roomId ?? null;
    const nextSeatNumber = chairmanDto?.seatNumber ?? null;
    const shouldNotify = oldChairmanId !== newChairmanId;

    // 🔥 KHÔNG đổi user → không làm gì

    const unitRepo = queryRunner.manager.getRepository(MeetingUnitEntity);
    const participantRepo =
      queryRunner.manager.getRepository(MeetingParticipantEntity);
    const taskRepo =
      queryRunner.manager.getRepository(MeetingTaskEntity);

    let chairmanUnit = await unitRepo.findOne({
      where: { meetingId: meeting.id, unitId: 'CHAIRMAN_UNIT' },
      relations: ['participants'],
    });

    /* ================= REMOVE CASE ================= */

    if (!newChairmanId) {
      if (
        oldChairmanId !== newChairmanId ||
        meeting.chairmanType !== ParticipantType.USER
      ) {
        await meetingRepo.update(meeting.id, {
          chairmanId: newChairmanId,
          chairmanType: ParticipantType.USER,
        });
        meeting.chairmanId = newChairmanId;
        meeting.chairmanType = ParticipantType.USER;
      }

      if (chairmanUnit) {
        const participants = chairmanUnit.participants ?? [];
        const participantIds = participants.map((p) => p.id);

        if (participantIds.length) {
          await taskRepo.delete({
            meetingId: meeting.id,
            attachableType: 'PARTICIPANT',
            attachableId: In(participantIds),
          });

          await participantRepo.remove(participants);
          if (changeSet) {
            changeSet.removedParticipants.push(...participants);
          }
        }

        await unitRepo.remove(chairmanUnit);
        changeSet?.removedUnits.push(chairmanUnit);
      }
      return;
    }

    if (
      oldChairmanId !== newChairmanId ||
      meeting.chairmanType !== chairmanType
    ) {
      await meetingRepo.update(meeting.id, {
        chairmanId: newChairmanId,
        chairmanType,
      });
      meeting.chairmanId = newChairmanId;
      meeting.chairmanType = chairmanType;
    }

    /* ================= CREATE / REPLACE ================= */

    if (!chairmanUnit) {
      chairmanUnit = await unitRepo.save(
        unitRepo.create({
          meetingId: meeting.id,
          unitId: 'CHAIRMAN_UNIT',
          roomId: nextRoomId,
          seatNumber: nextSeatNumber,
        }),
      );

      changeSet?.addedUnits.push(chairmanUnit);
    } else if (
      chairmanUnit.roomId !== nextRoomId ||
      chairmanUnit.seatNumber !== nextSeatNumber
    ) {
      chairmanUnit.roomId = nextRoomId;
      chairmanUnit.seatNumber = nextSeatNumber;
      chairmanUnit = await unitRepo.save(chairmanUnit);
      changeSet?.updatedUnits.push(chairmanUnit);
    }

    const chairmanParticipants = (chairmanUnit.participants ?? []).filter(
      (p) => p.participantRole === 'CHAIRMAN',
    );
    const staleParticipants = (chairmanUnit.participants ?? []).filter(
      (p) => p.participantRole !== 'CHAIRMAN',
    );

    const staleEntities = [
      ...staleParticipants,
      ...chairmanParticipants.slice(1),
    ];
    const staleIds = staleEntities.map((p) => p.id);

    if (staleIds.length) {
      await taskRepo.delete({
        meetingId: meeting.id,
        attachableType: 'PARTICIPANT',
        attachableId: In(staleIds),
      });

      await participantRepo.remove(staleEntities);
      if (changeSet) {
        changeSet.removedParticipants.push(...staleEntities);
      }
    }

    let participant = chairmanParticipants[0];
    const expectedUserType =
      chairmanType === ParticipantType.UNIT ? UserType.UNIT : UserType.USER;
    const expectedUserId =
      chairmanType === ParticipantType.UNIT
        ? ParticipantType.UNIT
        : newChairmanId;
    const expectedUnitId =
      chairmanType === ParticipantType.UNIT ? newChairmanId : null;

    if (!participant) {
      participant = await participantRepo.save(
        participantRepo.create({
          meetingUnitId: chairmanUnit.id,
          participantRole: 'CHAIRMAN',
          userId: expectedUserId,
          unitId: expectedUnitId,
          userType: expectedUserType,
          seatNumber: nextSeatNumber,
          roomId: nextRoomId,
          participantState: ParticipantState.CONFIRMED,
          acceptJoin: true,
        }),
      );

      changeSet?.addedParticipants.push(participant);
    } else if (
      participant.userId !== expectedUserId ||
      participant.unitId !== expectedUnitId ||
      participant.userType !== expectedUserType ||
      participant.seatNumber !== nextSeatNumber ||
      participant.roomId !== nextRoomId ||
      participant.participantState !== ParticipantState.CONFIRMED ||
      participant.acceptJoin !== true
    ) {
      participant.userId = expectedUserId;
      participant.unitId = expectedUnitId;
      participant.userType = expectedUserType;
      participant.seatNumber = nextSeatNumber;
      participant.roomId = nextRoomId;
      participant.participantState = ParticipantState.CONFIRMED;
      participant.acceptJoin = true;
      participant = await participantRepo.save(participant);
      changeSet?.updatedParticipants.push(participant);
    }

    if (chairmanDto.tasks !== undefined) {
      const oldTasks = await taskRepo.find({
        where: {
          meetingId: meeting.id,
          attachableType: 'PARTICIPANT',
          attachableId: participant.id,
        },
      });

      if (oldTasks.length) {
        await taskRepo.delete({
          meetingId: meeting.id,
          attachableType: 'PARTICIPANT',
          attachableId: participant.id,
        });
        if (changeSet) {
          changeSet.removedTasks.push(...oldTasks);
        }
      }

      const tasksToCreate = (chairmanDto.tasks ?? []).map((dto: any) =>
        taskRepo.create({
          meetingId: meeting.id,
          content: dto.content,
          documentName: dto.documentName ?? null,
          deadline: dto.deadline ?? null,
          attachableType: 'PARTICIPANT',
          attachableId: participant.id,
          attachableRole: dto.attachableRole ?? 'CHAIRMAN',
        }),
      );

      if (tasksToCreate.length) {
        const savedTasks = await taskRepo.save(tasksToCreate);
        if (changeSet) {
          changeSet.addedTasks.push(...savedTasks);
        }
      }
    }

    /* ================= NOTIFICATION ================= */

    if (shouldNotify) {
      this.notificationService.createForRecipients({
        recipientIds: [newChairmanId],
        senderId: userId,
        type: NotificationType.MEETING_INFO_CHANGED.value,
        content: `Cuộc họp "${meeting.title}" vừa được điều chỉnh. Bạn được phân công là CHỦ TRÌ cuộc họp.`,
        recordId: meeting.id,
        link: `/meetings/${meeting.id}?listparammeeting=PARTICIPANT_MEETING`,
        key: NotificationKey.VIEW_MEETING_ROOM,
        time: new Date(),
        status: 0,
      });
    }
    /* ================= EMAIL ================= */

    if (!shouldNotify) {
      return;
    }

    try {
      const chairmanUser = await this.sqlsvRepo.getUserById(newChairmanId);

      if (chairmanUser?.emailUser && newChairmanId !== userId) {
        await this.sendMeetingRoleEmail(
          chairmanUser.emailUser,
          meeting,
          'CHỦ TRÌ',
        );
      }
    } catch (err) {
      this.logger.error(`Send chairman email failed: ${err.message}`);
    }
  }


  /**
   * Cập nhật danh sách thư kí cuộc họp
   */
  private async updateSecretaries(
    queryRunner: QueryRunner,
    meeting: MeetingEntity,
    secretaryDto: any,
    secretariesDto: any[] | undefined,
    userId: string,
    changeSet?: MeetingChangeSet,
  ) {
    const listDto = (secretariesDto && secretariesDto.length > 0) ? secretariesDto : (secretaryDto?.userId ? [secretaryDto] : []);

    const meetingRepo = queryRunner.manager.getRepository(MeetingEntity);
    const unitRepo = queryRunner.manager.getRepository(MeetingUnitEntity);
    const participantRepo = queryRunner.manager.getRepository(MeetingParticipantEntity);
    const taskRepo = queryRunner.manager.getRepository(MeetingTaskEntity);

    let unit = await unitRepo.findOne({
      where: {
        meetingId: meeting.id,
        unitId: 'SECRETARY_UNIT',
      },
      relations: ['participants'],
    });

    if (listDto.length === 0) {
      // Xoá tất cả thư ký
      if (meeting.secretaryId) {
        await meetingRepo.update(meeting.id, {
          secretaryId: null,
          secretaryType: ParticipantType.USER,
        });
        meeting.secretaryId = null;
        meeting.secretaryType = ParticipantType.USER;
      }

      if (unit) {
        const participants = unit.participants ?? [];
        const participantIds = participants.map((p) => p.id);

        if (participantIds.length) {
          await taskRepo.delete({
            meetingId: meeting.id,
            attachableType: 'PARTICIPANT',
            attachableId: In(participantIds),
          });

          await participantRepo.remove(participants);
          if (changeSet) {
            changeSet.removedParticipants.push(...participants);
          }
        }

        await unitRepo.remove(unit);
        changeSet?.removedUnits.push(unit);
      }
      return;
    }

    // Cập nhật cuộc họp theo thư ký đầu tiên để giữ tương thích ngược
    const firstSec = listDto[0];
    const newSecretaryId = firstSec.userId ?? null;
    const secretaryType = firstSec.secretaryType || ParticipantType.USER;
    const nextRoomId = firstSec.roomId ?? null;
    const nextSeatNumber = firstSec.seatNumber ?? null;
    const nextUnitState = secretaryType === ParticipantType.UNIT ? 'RECEIVED' : 'PENDING';

    const oldSecretaryId = meeting.secretaryId;
    if (
      oldSecretaryId !== newSecretaryId ||
      meeting.secretaryType !== secretaryType
    ) {
      await meetingRepo.update(meeting.id, {
        secretaryId: newSecretaryId,
        secretaryType,
      });
      meeting.secretaryId = newSecretaryId;
      meeting.secretaryType = secretaryType;
    }

    /* ================= CREATE / UPDATE UNIT ================= */
    if (!unit) {
      unit = await unitRepo.save(
        unitRepo.create({
          meetingId: meeting.id,
          unitId: 'SECRETARY_UNIT',
          roomId: nextRoomId,
          seatNumber: nextSeatNumber,
          unitState: nextUnitState,
        }),
      );
      changeSet?.addedUnits.push(unit);
    } else if (
      unit.roomId !== nextRoomId ||
      unit.seatNumber !== nextSeatNumber ||
      unit.unitState !== nextUnitState
    ) {
      unit.roomId = nextRoomId;
      unit.seatNumber = nextSeatNumber;
      unit.unitState = nextUnitState;
      unit = await unitRepo.save(unit);
      changeSet?.updatedUnits.push(unit);
    }

    /* ================= CLEAN OLD PARTICIPANTS AND RE-CREATE/UPDATE ALL ================= */
    const existingParticipants = unit.participants ?? [];
    const existingMap = new Map<string, MeetingParticipantEntity>();
    for (const ep of existingParticipants) {
      const key = ep.userType === UserType.UNIT ? ep.unitId : ep.userId;
      if (key) {
        existingMap.set(key, ep);
      }
    }

    const currentKeys = new Set(listDto.map(d => d.userId));

    // Xoá các thư ký cũ không còn được chọn
    const toRemove: MeetingParticipantEntity[] = [];
    for (const ep of existingParticipants) {
      const key = ep.userType === UserType.UNIT ? ep.unitId : ep.userId;
      if (!key || !currentKeys.has(key)) {
        toRemove.push(ep);
      }
    }

    if (toRemove.length) {
      const toRemoveIds = toRemove.map(p => p.id);
      await taskRepo.delete({
        meetingId: meeting.id,
        attachableType: 'PARTICIPANT',
        attachableId: In(toRemoveIds),
      });
      await participantRepo.remove(toRemove);
      if (changeSet) {
        changeSet.removedParticipants.push(...toRemove);
      }
    }

    // Thêm hoặc cập nhật thư ký
    for (const secDto of listDto) {
      const secType = secDto.secretaryType || ParticipantType.USER;
      const expectedUserType = secType === ParticipantType.UNIT ? UserType.UNIT : UserType.USER;
      const key = secDto.userId;

      let participant = existingMap.get(key) || null;

      if (!participant) {
        participant = await participantRepo.save(
          participantRepo.create({
            meetingUnitId: unit.id,
            participantRole: 'SECRETARY',
            userId: secType === ParticipantType.USER ? secDto.userId : ParticipantType.UNIT,
            unitId: secType === ParticipantType.UNIT ? secDto.userId : null,
            userType: expectedUserType,
            seatNumber: secDto.seatNumber ?? null,
            roomId: secDto.roomId ?? null,
          }),
        );
        changeSet?.addedParticipants.push(participant);
      } else {
        if (
          participant.seatNumber !== (secDto.seatNumber ?? null) ||
          participant.roomId !== (secDto.roomId ?? null)
        ) {
          participant.seatNumber = secDto.seatNumber ?? null;
          participant.roomId = secDto.roomId ?? null;
          participant = await participantRepo.save(participant);
          changeSet?.updatedParticipants.push(participant);
        }
      }

      // Xử lý task
      if (secDto.tasks !== undefined) {
        const oldTasks = await taskRepo.find({
          where: {
            meetingId: meeting.id,
            attachableType: 'PARTICIPANT',
            attachableId: participant.id,
          },
        });

        if (oldTasks.length) {
          await taskRepo.delete({
            meetingId: meeting.id,
            attachableType: 'PARTICIPANT',
            attachableId: participant.id,
          });
          if (changeSet) {
            changeSet.removedTasks.push(...oldTasks);
          }
        }

        const tasksToCreate = (secDto.tasks ?? []).map((t: any) =>
          taskRepo.create({
            meetingId: meeting.id,
            content: t.content,
            documentName: t.documentName ?? null,
            deadline: t.deadline ?? null,
            attachableType: 'PARTICIPANT',
            attachableId: participant.id,
            attachableRole: t.attachableRole ?? 'SECRETARY',
          }),
        );

        if (tasksToCreate.length) {
          const savedTasks = await taskRepo.save(tasksToCreate);
          if (changeSet) {
            changeSet.addedTasks.push(...savedTasks);
          }
        }
      }

      // Thông báo cho các thư ký mới được thêm
      const isNew = !existingMap.has(key);
      if (isNew && secType === ParticipantType.USER) {
        this.notificationService.createForRecipients({
          recipientIds: [secDto.userId],
          senderId: userId,
          type: NotificationType.MEETING_INFO_CHANGED.value,
          content: `Cuộc họp "${meeting.title}" vừa được điều chỉnh. Bạn được phân công THƯ KÝ cuộc họp.`,
          recordId: meeting.id,
          link: `/meetings/${meeting.id}?listparammeeting=PARTICIPANT_MEETING`,
          key: NotificationKey.VIEW_MEETING_ROOM,
          time: new Date(),
          status: 0,
        });

        try {
          const secretaryUser = await this.sqlsvRepo.getUserById(secDto.userId);
          if (secretaryUser?.emailUser && secDto.userId !== userId) {
            await this.sendMeetingRoleEmail(
              secretaryUser.emailUser,
              meeting,
              'THƯ KÝ',
            );
          }
        } catch (err) {
          this.logger.error(`Send secretary email failed: ${err.message}`);
        }
      }
    }
  }
  async updateForRecuring(
    id: string,
    dto: UpdateMeetingDto,
    userId: string,
    req?: any
  ): Promise<{ success: boolean; message?: string; data?: any }> {
    const changeSet: MeetingChangeSet = {
      addedUnits: [],
      updatedUnits: [],
      removedUnits: [],

      addedParticipants: [],
      updatedParticipants: [],
      removedParticipants: [],

      addedTasks: [],
      updatedTasks: [],
      removedTasks: [],
    };
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const details = `Cập nhật cuộc họp định kỳ, ID cuộc họp: ${id}`;
    try {
      // ===== CAPTURE OLD STATE FOR GOOGLE CALENDAR SYNC =====
      const oldMeeting = await this.getMeetingForUpdate(queryRunner, id);
      const oldSnapshot = JSON.parse(JSON.stringify(oldMeeting));

      const buildParticipantSnapshot = (m: any) => {
        const participants = new Map<
          string,
          { id: string; userId: string; unitRowId: string; unitId: string }
        >();
        const userUnits = new Map<string, Set<string>>();

        for (const unit of m.units || []) {
          if (!unit?.id || !unit?.unitId) {
            continue;
          }

          for (const participant of unit.participants || []) {
            if (!participant?.id || !participant?.userId) continue;

            participants.set(participant.id, {
              id: participant.id,
              userId: participant.userId,
              unitRowId: unit.id,
              unitId: unit.unitId,
            });

            const currentUnits =
              userUnits.get(participant.userId) ?? new Set<string>();
            currentUnits.add(unit.unitId);
            userUnits.set(participant.userId, currentUnits);
          }
        }

        return { participants, userUnits };
      };

      const oldParticipantSnapshot = buildParticipantSnapshot(oldMeeting);

      const meeting = await this.getMeetingForUpdate(queryRunner, id);

      const {
        recurrence,
        tasks,
        units,
        chairman,
        secretary,
        secretaries,
        onlineMeeting,
        guests,
        roomIds,
        isCompany,
        isToday,
        ...basicData
      } = dto;

      await this.updateBasicInfo(
        queryRunner,
        meeting,
        basicData,
        roomIds,
        isCompany,
        isToday,
      );

      await this.updateOnlineMeeting(queryRunner, meeting, onlineMeeting);

      await this.updateRecurrence(queryRunner, meeting, recurrence);

      await this.updateMeetingTasks(queryRunner, meeting, tasks);

      await this.updateGuests(queryRunner, meeting, guests);

      await this.updateChairman(queryRunner, meeting, chairman, userId, changeSet);

      await this.updateSecretaries(queryRunner, meeting, secretary, secretaries, userId, changeSet);
      await this.updateUnits(queryRunner, meeting, units, changeSet);
      await this.ensureChairmanUnitConsistency(
        queryRunner,
        meeting,
        chairman,
        changeSet,
      );

      if (changeSet.addedParticipants.length > 0) {
        await queryRunner.manager.update(MeetingEntity, id, { warning24hSent: false });
      }

      await queryRunner.commitTransaction();

      const wasApproved = await this.isMeetingApproved(id);
      if (wasApproved) {
        await this.autoConfirmMeeting(id, {
          addedTasks: changeSet.addedTasks.length > 0,
          removedTasks: changeSet.removedTasks.length > 0,
          addedTaskEntities: changeSet.addedTasks,
          removedTaskEntities: changeSet.removedTasks,
        });
      }
      const newMeetingForSync = await this.getMeetingForUpdate(queryRunner, id);
      if (wasApproved && oldSnapshot.chairmanId !== newMeetingForSync.chairmanId) {
        try {
          await this.syncApprovedChairmanWorkItem(id, oldSnapshot.chairmanId);
        } catch (err) {
          this.logger.error(
            `Sync chairman work item after recurring update failed: ${err.message}`,
          );
        }
      }

      // ===== QUEUE GOOGLE CALENDAR SYNC (NON-BLOCKING) =====
      // Get confirmed participants and queue them for sync/update/delete based on changes
      try {
        const newMeeting = await this.getMeetingForUpdate(queryRunner, id);
        const newParticipantSnapshot = buildParticipantSnapshot(newMeeting);

        const confirmedParticipants = await this.meetingParticipantRepo
          .createQueryBuilder('p')
          .leftJoinAndSelect('p.unit', 'unit')
          .where('p.participantState = :state', { state: 'CONFIRMED' })
          .andWhere('unit.meetingId = :meetingId', { meetingId: id })
          .getMany();

        // Check if meeting details changed (title, date, time)
        const meetingDetailsChanged =
          oldMeeting.title !== newMeeting.title ||
          oldMeeting.meetingDate !== newMeeting.meetingDate ||
          oldMeeting.meetingTime !== newMeeting.meetingTime ||
          oldMeeting.meetingMode !== newMeeting.meetingMode;

        // If meeting details changed and there are confirmed participants, queue them for update
        if (meetingDetailsChanged && confirmedParticipants.length > 0) {
          const startTimeStr =
            newMeeting.meetingTime?.split('-')[0] || '09:00';
          const endTimeStr =
            newMeeting.meetingTime?.split('-')[1] || '10:00';

          let meetingDateStr: string;

          if (typeof newMeeting.meetingDate === 'string') {
            // nếu đã là YYYY-MM-DD thì dùng luôn
            if (newMeeting.meetingDate.includes('-')) {
              meetingDateStr = newMeeting.meetingDate;
            } else {
              // fallback DD/MM/YYYY
              const [day, month, year] = newMeeting.meetingDate.split('/');
              meetingDateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          } else {
            // ❌ KHÔNG dùng toISOString
            const d = new Date(newMeeting.meetingDate);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            meetingDateStr = `${year}-${month}-${day}`;
          }

          // ✅ luôn có timezone +07:00
          const startDateTime = `${meetingDateStr}T${startTimeStr}:00+07:00`;
          const endDateTime = `${meetingDateStr}T${endTimeStr}:00+07:00`;

          // 🔍 log để debug

          const eventInput: GoogleCalendarEventInput = {
            title: newMeeting.title,
            description: newMeeting.content,
            startTime: startDateTime,
            endTime: endDateTime,
            reminders: [
              {
                method: 'email',
                minutes: 60,
              },
            ],
          };

          for (const participant of confirmedParticipants) {
            this.backgroundGoogleCalendarSyncService.queueParticipantSync(
              participant.id,
              id,
              eventInput,
            );
          }
        }

        // Queue removed participants for deletion from Google Calendar
        // IMPORTANT: Pass old participant data before they are deleted from DB
        const removedParticipantIds = [...oldParticipantSnapshot.participants.keys()]
          .filter(participantId => !newParticipantSnapshot.participants.has(participantId));

        if (removedParticipantIds.length > 0) {
          for (const participantId of removedParticipantIds) {
            // Find the old participant data that was captured before update
            const oldParticipant = oldSnapshot.units
              ?.flatMap((u: any) => u.participants || [])
              ?.find((p: any) => p.id === participantId);

            if (oldParticipant) {
              this.backgroundGoogleCalendarSyncService.queueParticipantDeletion(
                participantId,
                id,
                {
                  id: oldParticipant.id,
                  googleCalendarEventId: oldParticipant.googleCalendarEventId || null,
                  googleCalendarHidden: oldParticipant.googleCalendarHidden || false,
                  googleEmail: oldParticipant.googleEmail || null,
                  userId: oldParticipant.userId,
                },
              );
            } else {
              // Fallback: queue without data (will try to fetch from DB)
              this.logger.warn(
                `[QUEUE] Participant ${participantId} not found in oldSnapshot, queueing without data`,
              );
              this.backgroundGoogleCalendarSyncService.queueParticipantDeletion(
                participantId,
                id,
              );
            }
          }
        }

        // Queue added participants for sync to Google Calendar (only if meeting is approved)
        const isMeetingApproved = await this.isMeetingApproved(id);
        const addedParticipantIds = [...newParticipantSnapshot.participants.keys()]
          .filter(participantId => !oldParticipantSnapshot.participants.has(participantId));
        if (addedParticipantIds.length > 0 && isMeetingApproved) {
          const startTimeStr =
            newMeeting.meetingTime?.split('-')[0] || '09:00';
          const endTimeStr =
            newMeeting.meetingTime?.split('-')[1] || '10:00';

          let meetingDateStr: string;

          if (typeof newMeeting.meetingDate === 'string') {
            // nếu đã là YYYY-MM-DD thì dùng luôn
            if (newMeeting.meetingDate.includes('-')) {
              meetingDateStr = newMeeting.meetingDate;
            } else {
              // fallback DD/MM/YYYY
              const [day, month, year] = newMeeting.meetingDate.split('/');
              meetingDateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          } else {
            // ❌ KHÔNG dùng toISOString (tránh lệch ngày)
            const d = new Date(newMeeting.meetingDate);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            meetingDateStr = `${year}-${month}-${day}`;
          }

          // ✅ giữ timezone +07:00
          const startDateTime = `${meetingDateStr}T${startTimeStr}:00+07:00`;
          const endDateTime = `${meetingDateStr}T${endTimeStr}:00+07:00`;

          const eventInput: GoogleCalendarEventInput = {
            title: newMeeting.title,
            description: newMeeting.content,
            startTime: startDateTime,
            endTime: endDateTime,
            reminders: [
              {
                method: 'email',
                minutes: 60,
              },
            ],
          };

          const newlyAddedParticipants = await this.meetingParticipantRepo
            .createQueryBuilder('p')
            .leftJoinAndSelect('p.unit', 'unit')
            .where('p.id IN (:...ids)', { ids: addedParticipantIds })
            .andWhere('p.participantState = :state', { state: 'CONFIRMED' })
            .andWhere('unit.meetingId = :meetingId', { meetingId: id })
            .getMany();

          for (const participant of newlyAddedParticipants) {
            this.backgroundGoogleCalendarSyncService.queueParticipantSync(
              participant.id,
              id,
              eventInput,
            );
          }
        }
      } catch (error) {
        this.logger.error('Error queuing Google Calendar sync for recurring meeting update:', error);
        // Don't throw - Google Calendar sync is non-blocking, so log and continue
      }

      /* ================= BUILD RESULT FROM CHANGESET ================= */

      // 1️⃣ Danh sách user bị ảnh hưởng
      const affectedUserIds = new Set<string>();

      [
        ...changeSet.addedParticipants,
        ...changeSet.updatedParticipants,
      ].forEach((p) => {
        if (p.userId) affectedUserIds.add(p.userId);
      });

      // 2️⃣ Map participantId -> userId
      const participantUserMap = new Map<string, string>();

      [
        ...changeSet.addedParticipants,
        ...changeSet.updatedParticipants,
      ].forEach((p) => {
        if (p.userId) {
          participantUserMap.set(p.id, p.userId);
        }
      });

      // 3️⃣ Gom task theo từng user
      const tasksByUser: Record<string, MeetingTaskEntity[]> = {};

      [
        ...changeSet.addedTasks,
        ...changeSet.updatedTasks,
      ].forEach((task) => {
        if (task.attachableType !== 'PARTICIPANT') return;

        const userId = participantUserMap.get(task.attachableId);
        if (!userId) return;

        if (!tasksByUser[userId]) {
          tasksByUser[userId] = [];
        }

        tasksByUser[userId].push(task);
      });

      /* ================= RETURN ================= */
      const detail = await this.getDetail(id, userId);

      const addedUnitIds = changeSet.addedUnits.map(u => u.id);
      const addedParticipantIds = changeSet.addedParticipants.map(p => p.id);
      const addedTaskIds = changeSet.addedTasks.map(t => t.id);
      this.logAsync(req, userId, details, 'SUCCESS');

      return {
        success: true,
        data: {
          meeting: detail, // giữ detail riêng

          unitIds: addedUnitIds,
          participantIds: addedParticipantIds,
          taskIds: addedTaskIds,

          changes: {
            units: {
              added: changeSet.addedUnits,
              updated: changeSet.updatedUnits,
            },
            participants: {
              added: changeSet.addedParticipants,
              updated: changeSet.updatedParticipants,
            },
            tasks: {
              added: changeSet.addedTasks,
              updated: changeSet.updatedTasks,
              groupedByUser: tasksByUser,
            },
            affectedUserIds: Array.from(affectedUserIds),
          },
        },
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error in update meeting:', err);

      this.logAsync(req, userId, details, 'ERROR');
      return {
        success: false,
        message:
          err instanceof Error ? err.message : 'Cập nhật cuộc họp thất bại',
      };
    } finally {
      await queryRunner.release();
    }
  }

  async replaceRoomParticipants(
    meetingId: string,
    roomId: string,
    dto: ReplaceRoomParticipantsDto,
    effectiveUserId: string,
    req?: any
  ): Promise<{ success: boolean; message?: string; data?: any }> {
    const pool = await this.getPool();

    const details = `Cập nhật sơ đồ chỗ ngồi cho phòng họp, ID cuộc họp: ${meetingId}, ID phòng họp: ${roomId}`;
    // 1. Resolve meeting_unit_id
    const unitRs = await pool
      .request()
      .input('meetingId', sql.VarChar, meetingId)
      .input('userId', sql.VarChar, effectiveUserId)
      .query(`
        SELECT mu.id AS meeting_unit_id
        FROM ${this.dbname}.meeting_units mu
        WHERE mu.meeting_id = @meetingId
          AND mu.unit_id = (
            SELECT parent
            FROM ${this.dbname}.users
            WHERE id = @userId
          );
      `);

    const meetingUnitId = unitRs.recordset?.[0]?.meeting_unit_id;
    if (!meetingUnitId) {
      return { success: false, message: 'Không xác định được meeting unit' };
    }

    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      for (const p of dto.participants) {
        // 1️⃣ UPDATE → gán lại
        const updateResult = await new sql.Request(tx)
          .input('meetingUnitId', sql.UniqueIdentifier, meetingUnitId)
          .input('userId', sql.NVarChar, p.userId)
          .input('roomId', sql.NVarChar, roomId)
          .input('seatNumber', sql.NVarChar, p.seatNumber ?? null)
          .input('participantRole', sql.VarChar, p.participantRole ?? null)
          .query(`
            UPDATE ${this.dbname}.meeting_participants
            SET
              room_id = @roomId,
              seat_number = @seatNumber,
              participant_role = @participantRole,
              assignment_type = 'REPLACED'
            WHERE meeting_unit_id = @meetingUnitId
              AND user_id = @userId;
          `);

        // 2️⃣ INSERT → gán từ đầu
        if (updateResult.rowsAffected[0] === 0) {
          await new sql.Request(tx)
            .input('meetingUnitId', sql.UniqueIdentifier, meetingUnitId)
            .input('userId', sql.NVarChar, p.userId)
            .input('roomId', sql.NVarChar, roomId)
            .input('seatNumber', sql.NVarChar, p.seatNumber ?? null)
            .input('participantRole', sql.VarChar, p.participantRole ?? null)
            .query(`
              INSERT INTO ${this.dbname}.meeting_participants (
                meeting_unit_id,
                user_id,
                room_id,
                seat_number,
                participant_role,
                participant_state,
                attendance_state,
                assignment_type
              )
              VALUES (
                @meetingUnitId,
                @userId,
                @roomId,
                @seatNumber,
                @participantRole,
                'PENDING',
                'RECEIVED',
                'INITIAL'
              );
            `);
        }
      }

      await tx.commit();
      this.logAsync(req, effectiveUserId, details, 'SUCCESS');

      return {
        success: true,
        message: 'Cập nhật sơ đồ chỗ ngồi thành công',
        data: {
          meetingUnitId,
          roomId,
          totalParticipants: dto.participants.length,
        },
      };
    } catch (err) {
      this.logAsync(req, effectiveUserId, details, 'ERROR');
      await tx.rollback();
      this.logger.error('[replaceRoomParticipants]', err);
      throw new InternalServerErrorException({
        message: 'Cập nhật sơ đồ chỗ ngồi thất bại',
      });
    }
  }

  async checkUnassignedSeats(meetingId: string) {
    const pool = await this.getPool();

    const participantsRs = await pool.request()
      .input('meetingId', sql.UniqueIdentifier, meetingId)
      .query(`
        SELECT 
          mp.user_id AS userId,
          mu.unit_id AS unitId,
          mp.room_id AS roomId,
          mp.seat_number AS seatNumber
        FROM ${this.dbname}.meeting_participants mp
        JOIN ${this.dbname}.meeting_units mu 
          ON mu.id = mp.meeting_unit_id
        WHERE mu.meeting_id = @meetingId
          AND (mp.room_id IS NULL OR mp.seat_number IS NULL)
      `);

    const guestsRs = await pool.request()
      .input('meetingId', sql.UniqueIdentifier, meetingId)
      .query(`
        SELECT 
          mg.id AS guestId,
          mg.guest_name AS guestName,
          mg.room_id AS roomId,
          mg.seat_number AS seatNumber
        FROM ${this.dbname}.meeting_guests mg
        WHERE mg.meeting_id = @meetingId
          AND (mg.room_id IS NULL OR mg.seat_number IS NULL)
      `);

    // 3. Check meeting units (phòng chưa gán ai)
    const emptyRoomsRs = await pool.request()
      .input('meetingId', sql.UniqueIdentifier, meetingId)
      .query(`
        SELECT 
          id AS unitId,
          room_id AS roomId
        FROM ${this.dbname}.meeting_units
        WHERE meeting_id = @meetingId
          AND unit_id NOT IN ('CHAIRMAN_UNIT', 'SECRETARY_UNIT')
          AND assign_participants = 0
      `);

    const unassignedParticipants = participantsRs.recordset;
    const unassignedGuests = guestsRs.recordset;
    const emptyRooms = emptyRoomsRs.recordset;

    const allAssigned =
      unassignedParticipants.length === 0 &&
      unassignedGuests.length === 0 &&
      emptyRooms.length === 0;

    return {
      success: true,
      allAssigned,
      data: {
        participants: unassignedParticipants,
        guests: unassignedGuests,
      },
    };
  }

  async replaceRoomParticipantsAllRoom(
    meetingId: string,
    dto: ReplaceRoomParticipantsAllRoomDto,
    originalUserId: string,
    req?: any
  ): Promise<{ success: boolean; message?: string; data?: any, result?: any }> {
    const pool = await this.getPool();
    const { action, roomIds } = dto;

    const details = `Cập nhật sơ đồ chỗ ngồi cho phòng họp, ID cuộc họp: ${meetingId}`;
    // 1. Resolve meeting_unit_id dựa trên meetingId
    const unitRs = await pool
      .request()
      .input('meetingId', sql.VarChar, meetingId)
      .query(`
        SELECT mu.id AS meeting_unit_id
        FROM ${this.dbname}.meeting_units mu
        WHERE mu.meeting_id = @meetingId;
      `);

    const meetingUnitIds = unitRs.recordset.map(rs => rs.meeting_unit_id);
    if (!meetingUnitIds || meetingUnitIds.length === 0) {
      return { success: false, message: 'Không xác định được meeting unit' };
    }

    const tx = new sql.Transaction(pool);
    await tx.begin();

    let committed = false;
    try {
      let roomIdsStr: string | null = null;
      if (Array.isArray(roomIds) && roomIds.length > 0) {
        const uniqueRoomIds = [...new Set(roomIds.filter(Boolean))];
        roomIdsStr = uniqueRoomIds.join(',');
        await new sql.Request(tx)
          .input('meetingId', sql.UniqueIdentifier, meetingId)
          .input('roomIds', sql.VarChar, roomIdsStr)
          .input('originalUserId', sql.NVarChar, originalUserId)
          .query(`
            UPDATE ${this.dbname}.meetings
            SET 
              room_ids = @roomIds,
              assigned_seat_by = @originalUserId,
              updated_at = SYSDATETIME()
            WHERE id = @meetingId
        `);
      }

      // Lặp qua danh sách người tham gia và khách mời để cập nhật hoặc thêm mới
      for (const p of dto.participants) {
        const { userId, guestId, seatNumber, roomId, guestName, guestTitle } = p;

        // Nếu là người tham gia (có userId)
        if (userId) {
          for (const meetingUnitId of meetingUnitIds) {
            await new sql.Request(tx)
              .input('meetingUnitId', sql.UniqueIdentifier, meetingUnitId)
              .input('userId', sql.NVarChar, userId)
              .input('roomId', sql.NVarChar, roomId)
              .input('seatNumber', sql.NVarChar, seatNumber ?? null)
              .query(`
                UPDATE ${this.dbname}.meeting_participants
                SET
                  room_id = @roomId,
                  seat_number = @seatNumber
                WHERE meeting_unit_id = @meetingUnitId
                  AND user_id = @userId;
              `);
          }
        }

        // Nếu là khách mời (có guestId)
        if (guestId) {
          const updateRs = await new sql.Request(tx)
            .input('meetingId', sql.UniqueIdentifier, meetingId)
            .input('guestId', sql.NVarChar, guestId)
            .input('roomId', sql.NVarChar, roomId)
            .input('seatNumber', sql.NVarChar, seatNumber ?? null)
            .query(`
              UPDATE ${this.dbname}.meeting_guests
              SET room_id = @roomId,
                  seat_number = @seatNumber,
                  updated_at = SYSDATETIME()
              WHERE meeting_id = @meetingId
                AND id = @guestId
            `);

          if (updateRs.rowsAffected[0] === 0) {
            if (!guestName) {
              throw new BadRequestException(
                `Thiếu guestName để tạo mới guest ${guestId}`
              );
            }

            await new sql.Request(tx)
              .input('meetingId', sql.UniqueIdentifier, meetingId)
              .input('guestId', sql.NVarChar, guestId)
              .input('guestName', sql.NVarChar, guestName)
              .input('guestTitle', sql.NVarChar, guestTitle ?? null)
              .input('roomId', sql.NVarChar, roomId)
              .input('seatNumber', sql.NVarChar, seatNumber ?? null)
              .query(`
                INSERT INTO ${this.dbname}.meeting_guests (
                  meeting_id,
                  id,
                  guest_name,
                  guest_title,
                  room_id,
                  seat_number,
                  created_at,
                  updated_at
                )
                VALUES (
                  @meetingId,
                  @guestId,
                  @guestName,
                  @guestTitle,
                  @roomId,
                  @seatNumber,
                  SYSDATETIME(),
                  SYSDATETIME()
                )
              `);
          }
        }
      }

      // Commit giao dịch sau khi đã cập nhật tất cả dữ liệu
      await tx.commit();

      // Truy vấn lại tất cả người tham gia và khách mời sau khi đã cập nhật
      const participantsResult = await pool
        .request()
        .input('meetingUnitIds', sql.NVarChar, meetingUnitIds.join(',')) // Chuyển mảng thành chuỗi
        .query(`
          SELECT 
            mp.user_id AS userId, 
            mp.seat_number AS seatNumber, 
            mp.room_id AS roomId 
          FROM ${this.dbname}.meeting_participants mp
          WHERE mp.meeting_unit_id IN (@meetingUnitIds);
        `);

      const guestsResult = await pool
        .request()
        .input('meetingUnitIds', sql.NVarChar, meetingUnitIds.join(',')) // Chuyển mảng thành chuỗi
        .query(`
          SELECT 
            mg.id AS guestId, 
            mg.seat_number AS seatNumber, 
            mg.room_id AS roomId 
          FROM ${this.dbname}.meeting_guests mg
          WHERE mg.meeting_id IN (@meetingUnitIds);
        `);

      // Tạo danh sách kết quả đầy đủ cho người tham gia và khách mời
      const participants = participantsResult.recordset.map(p => ({
        userId: p.userId,
        seatNumber: p.seatNumber,
        roomId: p.roomId,
      }));

      const guests = guestsResult.recordset.map(g => ({
        guestId: g.guestId,
        seatNumber: g.seatNumber,
        roomId: g.roomId,
      }));

      const allParticipants = [...participants, ...guests];

      // Kiểm tra cuộc họp tồn tại
      const meeting = await this.meetingRepo.findOne({
        where: { id: meetingId },
      });

      if (!meeting) {
        throw new BadRequestException('Cuộc họp không tồn tại.');
      }
      // Lấy node tiếp theo cập nhật cho người ủy quyền 
      const bpmnXML = await this.sqlRepo.getBpmnFile(meeting.bpmnVersion);
      // Create node cho người được ủy quyền để xử lý lịch
      if (!action) {
        throw new BadRequestException('Không có action')
      }
      const { actionCode, workItem } = action;
      committed = true;
      const result = await this.runtimeDbService.checkSeatAssignment({ bpmnXML, meetingId, workItemId: workItem.id, actionCode, assigneeUserId: workItem.assigneeUserId, bpmnVersion: meeting.bpmnVersion, originalUserId })
      this.logAsync(req, originalUserId, details, 'SUCCESS');

      return {
        success: true,
        message: 'Cập nhật sơ đồ chỗ ngồi thành công',
        data: {
          meetingUnitIds,
          totalParticipants: allParticipants.length,
          participants: allParticipants, // Thêm thông tin người tham gia và khách mời
        },
        result
      };
    } catch (err) {
      // Rollback giao dịch nếu có lỗi
      this.logAsync(req, originalUserId, details, 'ERROR');
      if (!committed) {
        await tx.rollback();
      }
      this.logger.error('[replaceRoomParticipantsAllRoom]', err);
      throw new InternalServerErrorException({
        message: 'Cập nhật sơ đồ chỗ ngồi thất bại',
      });
    }
  }

  // Cập nhật trạng thái xử lý của đơn vị trong cuộc họp
  async checkPrepareUser(
    dto: UpdateMeetingProcessingStateDto,
    context: { originalUserId: string; effectiveUserId?: string },
  ) {
    const {
      meetingId,
      workItem,
      actionCode,
    } = dto;
    const userId = context.originalUserId;
    const meeting = await this.sqlRepo.getMeeting(meetingId);
    const bpmnXML = await this.sqlRepo.getBpmnFile(meeting.bpmnVersion);

    if (!workItem) {
      throw new BadRequestException('Không có workItem');
    }
    if (!workItem.id) {
      throw new BadRequestException('Không có workItem id');
    }

    let workItemId = workItem.id;
    try {
      const openWorkItems = await this.sqlRepo.listOpenWorkItems(meetingId);
      const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);

      const isFlowMatchingAction = (nodeId: string | undefined, code: string): boolean => {
        if (!nodeId) return false;
        const currentNode = indexes.nodes.get(nodeId);
        if (!currentNode) return false;
        let outs = indexes.outgoingBySource.get(currentNode.id) || [];
        for (const f of outs) {
          const target = f.targetRef;
          if (
            target &&
            (target.$type === 'bpmn:ExclusiveGateway' ||
              target.$type === 'bpmn:InclusiveGateway')
          ) {
            outs = indexes.outgoingBySource.get(target.id) || [];
            break;
          }
        }
        return outs.some((f: any) => {
          const ext = getAllNodeExtensionProperties(f);
          return (
            (ext?.actionCode && ext.actionCode.toUpperCase() === code.toUpperCase()) ||
            (f.name && f.name.toUpperCase() === code.toUpperCase()) ||
            f.id === code
          );
        });
      };

      const currentMatches = isFlowMatchingAction(workItem.nodeId, actionCode);
      if (!currentMatches) {
        const correctWi = openWorkItems.find(wi => {
          const sameUser = wi.assigneeUserId === userId || wi.assigneeUserId === workItem.assigneeUserId || wi.role === workItem.role;
          return sameUser && isFlowMatchingAction(wi.nodeId, actionCode);
        });
        if (correctWi) {
          workItemId = correctWi.id;
        }
      }
    } catch (err) {
      // Fallback silently to the passed workItem.id if any error occurs during resolution
    }

    await this.runtimeDbService.userProccessMeeting({
      bpmnXML,
      meetingId,
      workItemId,
      actionCode,
      userId,
      bpmnVersion: meeting.bpmnVersion,
    });

    return await this.getDetail(meeting.id, userId);
  }



  // Lịch cá nhân
  async listMeetingPerson(
    query: CreateMeetingDto,
    userId: string,
    authorId?: string,
    req?: any
  ) {
    const { filter, processFn, authority, type, page = 1, limit = 20, workstate, sort, substate, isExport } = query;
    if (authority === 'true' && authorId) userId = authorId;

    const [pool, userRoleRes] = await Promise.all([
      this.getPool(),
      this.userService.getUserRole(userId, this.processKey),
    ]);
    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }
    const leaderUserIds = Array.from(this.leaderUserIdSet);

    const userContext = { userId, roles: userRoleRes.roles };

    const ALLOWED_TYPES = ['day', 'week', 'month'] as const;
    const ALLOWED_WORKSTATES = ['waiting', 'comfirmed', 'notpaticipate', 'delegated', 'all'] as const;
    const ALLOWED_SUBSTATE = ['all', 'notprepare', 'completed'] as const;

    if (type && !ALLOWED_TYPES.includes(type as any)) {
      throw new BadRequestException('Type không hợp lệ, chỉ cho phép: day, week, month');
    }

    if (workstate && !ALLOWED_WORKSTATES.includes(workstate as any)) {
      throw new BadRequestException('Workstate không hợp lệ, chỉ cho phép: waiting, comfirmed, notpaticipate, delegated, all');
    }

    if (substate && !ALLOWED_SUBSTATE.includes(substate as any)) {
      throw new BadRequestException('subState không hợp lệ, chỉ cho phép: all, notprepare, completed');
    }

    const WORKSTATE_MAP: Record<WorkState, string[]> = {
      waiting: ['RECEIVED'],
      comfirmed: ['PROCESSING', 'CONFIRMED', 'DELEGATED', 'DONE'],
      notpaticipate: ['NOT_PARTICIPATE'],
      delegated: ['DELEGATED'],
      all: [],
    };

    const TAB_MAP: Record<string, string> = {
      waiting: 'Chờ xác nhận',
      comfirmed: 'Tham gia',
      notpaticipate: 'Không tham gia',
      delegated: 'Ủy quyền',
      all: 'Tất cả',
    };

    const tab = workstate ? TAB_MAP[workstate as keyof typeof TAB_MAP] : 'Tất cả';

    const details = `Truy cập Danh sách xem lịch cá nhân (${tab}), trang: ${page}, limit: ${limit}`;

    const criteria = this.buildCriteria(filter);

    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, from } = buildMeetingCriteriaHelper([...featureCriteria, ...criteria], 'meetings', featureManagement);

    const whereBase: string[] = [
      `${from}.status = '1'`,
      // Chỉ hiển thị instance thực tế, không hiển thị bản template (lịch gốc lặp)
      `(${from}.is_template = 0 OR ${from}.is_template IS NULL)`,
      ...((workstate && workstate !== 'all') ? [`(${from}.meeting_state != 'DA_HUY' OR ${from}.meeting_state IS NULL)`] : []),
      (!workstate || workstate === 'all')
        ? `${from}.stage_status IN ('DONG_Y_PHE_DUYET', 'BI_HUY')`
        : `${from}.stage_status = 'DONG_Y_PHE_DUYET'`,
      `EXISTS (
        SELECT 1
        FROM meeting_units mu WITH (NOLOCK)
        JOIN meeting_participants mp WITH (NOLOCK) ON mp.meeting_unit_id = mu.id
        WHERE mu.meeting_id = ${from}.id
          AND (
            mp.user_id = @userId
            OR (mp.delegated_to_user_id = @userId AND mp.delegation_state = 'ACCEPTED')
          )
      )`,
    ];

    if (filterFeature) whereBase.push(filterFeature);

    if (type === 'day' && filter?.currentDate) {
      whereBase.push(
        `${from}.meeting_date >= @startDate AND ${from}.meeting_date < DATEADD(day,1,@startDate)`,
      );
    }

    if (type === 'week' && filter?.currentWeek) {
      whereBase.push(`${from}.meeting_date BETWEEN @startDate AND @endDate`);
    }

    if (type === 'month' && filter?.currentMonth) {
      whereBase.push(
        `${from}.meeting_date >= @startDate AND ${from}.meeting_date < DATEADD(month,1,@startDate)`,
      );
    }

    const whereList = [...whereBase];

    if (workstate === 'delegated') {
      // TAB ĐÃ ỦY QUYỀN (tôi giao cho người khác)
      whereList.push(`
        EXISTS (
          SELECT 1
          FROM meeting_units mu
          JOIN meeting_participants mp ON mp.meeting_unit_id = mu.id
          WHERE mu.meeting_id = ${from}.id
            AND mp.user_id = @userId
            AND mp.delegated_to_user_id IS NOT NULL
            AND mp.delegation_state IN ('ACCEPTED', 'PENDING','DELEGATED')
        )
      `);
    } else if (workstate && workstate !== 'all') {
      const states = WORKSTATE_MAP[workstate as WorkState];

      // waiting / confirmed / notparticipate
      whereList.push(`
        EXISTS (
          SELECT 1
          FROM meeting_units mu
          JOIN meeting_participants mp ON mp.meeting_unit_id = mu.id
          WHERE mu.meeting_id = ${from}.id
            AND (
              -- user thường (không giao ai)
              (mp.user_id = @userId AND mp.delegated_to_user_id IS NULL AND mp.participant_state IN (${states.map(s => `'${s}'`).join(',')}))
              ${workstate === 'comfirmed' ? `
              OR
              -- user được giao
              (mp.delegated_to_user_id = @userId AND mp.delegation_state = 'ACCEPTED')
              ` : ''}
            )
        )
      `);
    }
    if (substate && substate === 'notprepare') {
      whereList.push(`
        EXISTS (
          SELECT 1
          FROM meeting_units mu
          JOIN meeting_participants mp ON mp.meeting_unit_id = mu.id
          WHERE mu.meeting_id = ${from}.id
            AND ${workstate === 'delegated'
          ? `
                  mp.user_id = @userId
                  AND mp.delegated_to_user_id IS NOT NULL
                `
          : `
                  (
                    (mp.user_id = @userId AND mp.delegated_to_user_id IS NULL)
                    OR
                    (mp.delegated_to_user_id = @userId AND mp.delegation_state = 'ACCEPTED')
                  )
                `
        }
            AND (
              mp.prepare_documents = 0
              OR EXISTS (
                SELECT 1
                FROM meeting_tasks mt
                WHERE mt.attachable_id = mp.id
                  AND mt.attachable_type = 'PARTICIPANT'
                  AND (mt.is_document_prepared = 0 OR mt.is_document_prepared IS NULL)
              )
            )
        )
      `);
    }

    if (substate && substate === 'completed') {
      whereList.push(`
        NOT EXISTS (
          SELECT 1
          FROM meeting_units mu
          JOIN meeting_participants mp ON mp.meeting_unit_id = mu.id
          WHERE mu.meeting_id = ${from}.id
            AND ${workstate === 'delegated'
          ? `
                  mp.user_id = @userId
                  AND mp.delegated_to_user_id IS NOT NULL
                `
          : `
                  (
                    (mp.user_id = @userId AND mp.delegated_to_user_id IS NULL)
                    OR
                    (mp.delegated_to_user_id = @userId AND mp.delegation_state = 'ACCEPTED')
                  )
                `
        }
            AND (
              mp.prepare_documents = 0
              OR EXISTS (
                SELECT 1
                FROM meeting_tasks mt
                WHERE mt.attachable_id = mp.id
                  AND mt.attachable_type = 'PARTICIPANT'
                  AND (mt.is_document_prepared = 0 OR mt.is_document_prepared IS NULL)
              )
            )
        )
      `);
    }

    const { dbKeys: meetingFields, aliases, allFilterFields } = await this.configurationService.buildFilterFieldsMeetings(from, [], processFn);
    const aliasFields = [
      'unitGuest',
      'seatAssignment',
      'leaderState',
      'participatingComponents',
      'documentPrepared',
      'participationRole',
      'delegatedFromUser',
      'meetingDuration',
    ];

    aliasFields.forEach((f) => {
      const snake = f.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allFilterFields.includes(f) || allFilterFields.includes(snake)) {
        aliases[f] = f;
      }
    });
    const customSortColumns = buildMeetingCustomSortColumns(from, leaderUserIds);
    const orderBy = ' ORDER BY ' + parseSortMeeting(sort, aliases, from, customSortColumns);

    const whereListClause = whereList.length ? `WHERE ${whereList.join(' AND ')}` : '';

    let limitNum = Math.min(+limit || 20, 100);
    const pageNum = Math.max(+page || 1, 1);
    if (isExport === 'true' || (type && ['day', 'week', 'month'].includes(type))) {
      limitNum = 9999;
    }
    const offsetNum = (pageNum - 1) * limitNum;

    const totalSql = ` SELECT COUNT(DISTINCT ${from}.id) AS total FROM ${this.dbname}.${from} WITH (NOLOCK) ${whereListClause} `;

    const idsSql = ` SELECT ${from}.id FROM ${this.dbname}.${from} WITH (NOLOCK) ${whereListClause} ${orderBy} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY `;
    const request = pool.request()
      .input('userId', userId)
      .input('offset', offsetNum)
      .input('limit', limitNum);

    if (filter?.currentDate) request.input('startDate', filter.currentDate);
    if (filter?.currentWeek) {
      request.input('startDate', filter.currentWeek.startDate);
      request.input('endDate', filter.currentWeek.endDate);
    }
    if (filter?.currentMonth) {
      request.input('startDate', `${filter.currentMonth}-01`);
    }

    const [totalRes, idsRes] = await Promise.all([
      request.query(totalSql),
      request.query(idsSql),
    ]);

    const total = totalRes.recordset[0]?.total ?? 0;
    const meetingIds = idsRes.recordset.map(r => r.id);
    const meetingChecklistMap: Record<string, any> = {};
    const idsList = meetingIds.map(id => `'${id}'`).join(',');
    const participantSql = `
      SELECT 
        mu.meeting_id, mp.id AS participant_id, mp.user_id, mp.participant_role, mp.participant_state, 
        mp.delegated_to_user_id, mp.delegation_state, mp.accept_join, mp.prepare_documents, 
        mt.id AS task_id, mt.content, mt.document_name, mt.deadline, mt.is_document_prepared, mp.delegated_from_user_id
      FROM meeting_units mu WITH (NOLOCK)
      JOIN meeting_participants mp WITH (NOLOCK) ON mp.meeting_unit_id = mu.id
      LEFT JOIN meeting_tasks mt WITH (NOLOCK) ON mt.attachable_type = 'PARTICIPANT' AND mt.attachable_id = mp.id
      WHERE mu.meeting_id IN (${idsList}) AND (mp.user_id = @userId OR (mp.delegated_to_user_id = @userId AND mp.delegation_state = 'ACCEPTED'))
    `;

    if (!meetingIds.length) {
      return {
        success: true,
        items: [],
        total: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
      };
    }

    const selectFields = [...meetingFields];
    if (!selectFields.some(f => f.includes('meeting_type') || f.includes('meetingType'))) {
      selectFields.push(`${from}.meeting_type`);
    }
    if (!selectFields.some(f => f.includes('meeting_mode') || f.includes('meetingMode'))) {
      selectFields.push(`${from}.meeting_mode`);
    }
    if (!selectFields.some(f => f.includes('priority'))) {
      selectFields.push(`${from}.priority`);
    }

    const detailsSql = `
      SELECT
        ${selectFields.join(',\n')}
      FROM ${this.dbname}.${from}
      WHERE ${from}.id IN (${idsList}) ${orderBy}
    `;

    try {
      const detailsRequest = pool.request().input('userId', userId);

      const detailsRes = await detailsRequest.query(detailsSql);
      const participantsRes = await pool.request().input('userId', userId).query(participantSql);
      // Build checklist map

      participantsRes.recordset.forEach(p => {
        // chỉ quan tâm participant tương ứng với userId hiện tại (hoặc được ủy quyền)
        const isCurrentUser = p.user_id === userId || p.delegated_to_user_id === userId;
        if (!isCurrentUser) return;

        if (!meetingChecklistMap[p.meeting_id]) {
          meetingChecklistMap[p.meeting_id] = {
            participantState: p.participant_state,
            acceptJoin: p.accept_join,
            delegation: p.delegated_to_user_id ? true : false,
            userId: p.user_id, // người tạo ban đầu / ủy quyền
            delegatedToUserId: p.delegated_to_user_id, // người được ủy quyền
            totalDocuments: 0,
            preparedDocuments: 0,
          };
        }

        // tính tổng task/document
        if (p.task_id) {
          meetingChecklistMap[p.meeting_id].totalDocuments += 1;
          if (p.is_document_prepared) {
            meetingChecklistMap[p.meeting_id].preparedDocuments += 1;
          }
        }
      });
      let items: any[];
      if (type && ['day', 'week', 'month'].includes(type)) {
        items = await this.mapDocKeyMeetingCalendar(
          detailsRes.recordset,
          aliases,
          authority,
          userContext,
          'PARTICIPANT_MEETING',
        );
      } else {
        items = await this.mapDocKeyMeeting(
          detailsRes.recordset,
          aliases,
          authority,
          userContext,
          'PARTICIPANT_MEETING',
          undefined,
          isExport,
        );
      }

      // Gán icon cho từng meeting
      items = items.map(item => {
        const checklist = meetingChecklistMap[item.id] || {};
        let actionIcon = '';
        let documentIcon = '';
        let actionIconMobile = '';
        let documentIconMobile = '';

        const isCancelled = item.meetingStateCode === 'DA_HUY' || item.meetingState === 'DA_HUY' || item.meeting_state === 'DA_HUY';

        if (!isCancelled) {
          // ===== ICON THAM GIA DỰA VÀO WORKSTATE & ỦY QUYỀN =====
          if (workstate === 'delegated' || (checklist.delegation && checklist.userId === userId)) {
            // Tab Ủy quyền (tôi giao cho người khác)
            actionIcon = ICON_DELEGATED;
            actionIconMobile = 'DELEGATED';
          } else if (checklist.delegation && checklist.delegatedToUserId === userId) {
            // Người được ủy quyền
            actionIcon = ICON_ACCEPTED;
            actionIconMobile = 'ACCEPTED';
          } else {
            // Trường hợp bình thường, dựa vào participantState
            switch (checklist.participantState) {
              case 'DELEGATED':
                actionIcon = ICON_DELEGATED;
                actionIconMobile = 'DELEGATED';
                break;
              case 'NOT_PARTICIPATE':
                actionIcon = ICON_REJECTED;
                actionIconMobile = 'REJECTED';
                break;
              case 'PROCESSING':
              case 'CONFIRMED':
              case 'DONE':
                actionIcon = ICON_ACCEPTED;
                actionIconMobile = 'ACCEPTED';
                break;
              case 'ASSIGNED':
                actionIcon = ICON_ASSIGNED;
                actionIconMobile = 'ASSIGNED';
                break;
              case 'RECEIVED':
              default:
                actionIcon = ICON_PENDING;
                actionIconMobile = 'PENDING';
            }
          }

          // ===== ICON DOCUMENT =====
          if (checklist.totalDocuments > 0 && !(checklist.userId === userId && checklist.delegatedToUserId)) {
            if (checklist.preparedDocuments === checklist.totalDocuments) {
              documentIcon = ICON_DOC_DONE;
              documentIconMobile = 'ACCEPTED';
            } else {
              documentIcon = ICON_DOC;
              documentIconMobile = 'PENDING';
            }
          }
        }

        item.iconMeeting = actionIcon;
        item.iconMeetingSecond = documentIcon;
        item.iconMeetingMobile = actionIconMobile;
        item.iconMeetingSecondMobile = documentIconMobile;

        return item;
      });
      this.logAsync(req, userId, details, 'SUCCESS');

      return {
        success: true,
        items,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };

    } catch (error) {
      this.logAsync(req, userId, details, 'ERROR');
      this.logger.error('[replaceRoomParticipantsAllRoom]', error);
      throw new InternalServerErrorException({
        message: 'Truy cập danh sách lịch cá nhân thất bại',
      });
    }
  }

  // ─────────────────────────────────────────────
  // PHASE 1: Resolve authority + parallel fetch context
  // ─────────────────────────────────────────────
  private async resolveContext(
    userId: string,
    authorId: string | undefined,
    authority: string | undefined,
    processFn?: string,
  ): Promise<ResolvedContext> {
    const t0 = Date.now();

    const resolvedUserId = authority === 'true' && authorId ? authorId : userId;

    const [pool, userRoleRes, featureManagement] = await Promise.all([
      this.getPool(),
      this.userService.getUserRole(resolvedUserId),
      this.featureManagementRepo.findOne({
        where: { code: processFn, status: 1, statusFeature: StatusFeature.ACTIVE },
      }),
    ]);


    return {
      pool,
      userContext: { userId: resolvedUserId, roles: userRoleRes.roles },
      featureManagement,
    };
  }

  // ─────────────────────────────────────────────
  // PHASE 2: Build filter criteria từ query.filter object
  // ─────────────────────────────────────────────
  private buildFilterCriteria(filter: Record<string, any> | undefined): FilterCriteria[] {
    const t0 = Date.now();

    if (!filter || typeof filter !== 'object') return [];

    const criteria: FilterCriteria[] = [];

    Object.entries(filter).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;

      const snakeKey = this.camelToSnake(key);

      if (typeof value === 'object' && !Array.isArray(value)) {
        const val = value as { startDate?: string; endDate?: string; value?: string };

        if (val.startDate && val.endDate) {
          criteria.push({ name: snakeKey, operator: 'between', value: [String(val.startDate), String(val.endDate)] });
        } else if (val.startDate) {
          criteria.push({ name: snakeKey, operator: 'gte', value: String(val.startDate) });
        } else if (val.endDate) {
          criteria.push({ name: snakeKey, operator: 'lte', value: String(val.endDate) });
        } else if (val.value !== undefined && val.value !== null) {
          criteria.push({ name: snakeKey, operator: 'like', value: String(val.value) });
        }
      } else {
        const operator = typeof value === 'string' ? 'like' : 'eq';
        criteria.push({ name: snakeKey, operator, value: String(value) });
      }
    });

    return criteria;
  }

  // ─────────────────────────────────────────────
  // PHASE 3: Build WHERE clause + JOIN + type filter
  // ─────────────────────────────────────────────
  private buildWhereResult(
    filter: Record<string, any> | undefined,
    criteria: FilterCriteria[],
    featureManagement: any,
    userId: string,
    type?: string,
  ): WhereResult {
    const t0 = Date.now();

    const featureCriteria: FilterCriteria[] = featureManagement?.criteria ?? [];
    const { sql: filterFeature, joins: filterJoins, from } = buildMeetingCriteriaHelper(
      [...featureCriteria, ...criteria],
      'meetings',
      featureManagement,
    );

    const where: string[] = [
      `(${from}.status = '1')`,
      // Chỉ hiển thị instance thực tế, không hiển thị bản template (lịch gốc lặp)
      `(${from}.is_template = 0 OR ${from}.is_template IS NULL)`,
      // User visibility: only meetings where the current user is CHAIRMAN or SECRETARY
      `(
        ${from}.chairman_id = '${userId}'
        OR ${from}.secretary_id = '${userId}'
        OR EXISTS (
          SELECT 1 FROM meeting_units mu
          INNER JOIN meeting_participants mp ON mp.meeting_unit_id = mu.id
          WHERE mu.meeting_id = ${from}.id
          AND mp.user_id = '${userId}'
          AND mp.participant_role IN ('CHAIRMAN', 'SECRETARY')
        )
      )`,
    ];

    if (filterFeature) where.push(`(${filterFeature})`);

    // Type-based date filter
    if (type === 'day' && filter?.currentDate) {
      where.push(
        `${from}.meeting_date >= '${filter.currentDate}' AND ${from}.meeting_date < DATEADD(day, 1, '${filter.currentDate}')`,
      );
    } else if (type === 'week' && filter?.currentWeek) {
      const { startDate, endDate } = filter.currentWeek;
      where.push(`${from}.meeting_date >= '${startDate}' AND ${from}.meeting_date <= '${endDate}'`);
    } else if (type === 'month' && filter?.currentMonth) {
      const [year, month] = String(filter.currentMonth).split('-');
      where.push(
        `${from}.meeting_date >= '${year}-${month}-01' AND ${from}.meeting_date < DATEADD(month, 1, '${year}-${month}-01')`,
      );
    }

    const whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';


    return { whereClause, filterJoins: filterJoins || '', from };
  }

  // ─────────────────────────────────────────────
  // PHASE 4: Fetch total + paginated IDs (parallel)
  // ─────────────────────────────────────────────
  private async fetchPaginatedIds(
    pool: any,
    from: string,
    whereClause: string,
    filterJoins: string,
    page: number,
    limit: number,
    sort: Record<string, string | number> | undefined,
  ): Promise<PaginatedIdsResult> {
    const t0 = Date.now();

    const limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;
    const orderBy = this.buildOrderByClause(sort, from);

    const totalSql = `
      SELECT COUNT(*) AS total
      FROM ${this.dbname}.${from}
      ${filterJoins}
      ${whereClause}
    `;

    const idsSql = `
      SELECT ${from}.id
      FROM ${this.dbname}.${from}
      ${filterJoins}
      ${whereClause}
      ORDER BY ${orderBy}
      OFFSET ${offsetNum} ROWS FETCH NEXT ${limitNum} ROWS ONLY
    `;

    let totalResult: any, idsResult: any;
    try {
      [totalResult, idsResult] = await Promise.all([
        pool.request().query(totalSql),
        pool.request().query(idsSql),
      ]);
    } catch (e) {
      this.logger.error('[PHASE-4] fetchPaginatedIds error:', e);
      throw new InternalServerErrorException('Lỗi truy vấn lịch họp cá nhân');
    }

    const total: number = totalResult.recordset[0]?.total ?? 0;
    const meetingIds: string[] = idsResult.recordset.map((row: any) => row.id);


    return { total, meetingIds };
  }

  // ─────────────────────────────────────────────
  // PHASE 5: Resolve select fields + aliases (độc lập với phase 4 → parallel)
  // ─────────────────────────────────────────────
  private async resolveSelectFields(
    from: string,
    processFn?: string,
  ): Promise<{ meetingFields: string[]; aliases: Record<string, string> }> {
    const t0 = Date.now();

    const { dbKeys: meetingFields, aliases, allFilterFields } =
      await this.configurationService.buildFilterFieldsMeetings(from, [], processFn);

    const ALIAS_CAMEL_FIELDS = [
      'unitGuest', 'seatAssignment', 'leaderState',
      'participatingComponents', 'documentPrepared',
      'participationRole', 'delegatedFromUser', 'meetingDuration',
    ];

    ALIAS_CAMEL_FIELDS.forEach((camelField) => {
      const snakeField = this.camelToSnake(camelField);
      if (allFilterFields.includes(camelField) || allFilterFields.includes(snakeField)) {
        // Key trong aliases giữ camelCase (FE đọc), value là chính nó để map
        aliases[camelField] = camelField;
      }
    });

    return { meetingFields, aliases };
  }

  // ─────────────────────────────────────────────
  // PHASE 6: Fetch meeting detail rows by IDs
  // ─────────────────────────────────────────────
  private async fetchMeetingDetails(
    pool: any,
    from: string,
    meetingIds: string[],
    meetingFields: string[],
  ): Promise<any[]> {

    if (!meetingIds?.length) return [];

    const t0 = Date.now();

    const idsList = meetingIds.map((id) => `'${id}'`).join(',');

    const orderByCase = meetingIds
      .map((id, index) => `WHEN '${id}' THEN ${index}`)
      .join('\n');

    const detailsSql = `
      SELECT
        ${meetingFields.join(',\n')},
        (SELECT mp.user_id, mp.seat_number, mu.room_id
          FROM meeting_participants mp
          INNER JOIN meeting_units mu ON mp.meeting_unit_id = mu.id
          WHERE mu.meeting_id = ${from}.id
          FOR JSON PATH) AS participants_json,
        (SELECT meeting_link
          FROM online_meetings om
          WHERE om.id = ${from}.online_meeting_id
          FOR JSON PATH) AS online_meeting_json,
        (SELECT receiver, receiver_unit, stage_status, roleProcess, role, action, deadline, details
          FROM ${this.dbname}.audit a
          WHERE a.document_id = ${from}.id_str
          FOR JSON PATH) AS audit_json,
        (
          SELECT '[' + STRING_AGG(
            '{"id":"' + CAST(mc.id AS varchar(50)) + '","content":"'
            + STRING_ESCAPE(mc.content, 'json') + '"}',
            ','
          ) + ']'
          FROM meeting_conclusions mc
          WHERE mc.meeting_id = ${from}.id AND mc.status = 1
        ) AS conclusion_content
      FROM ${this.dbname}.${from}
      WHERE ${from}.id IN (${idsList})
      ORDER BY CASE ${from}.id
        ${orderByCase}
      END
    `;

    let detailsResult: any;
    try {
      detailsResult = await pool.request().query(detailsSql);
    } catch (e) {
      this.logger.error('[PHASE-6] fetchMeetingDetails error:', e);
      throw new InternalServerErrorException('Lỗi truy vấn chi tiết lịch họp cá nhân');
    }


    return detailsResult.recordset;
  }

  // ─────────────────────────────────────────────
  // PHASE 7: Parse conclusions + attach flags lên meeting item
  // ─────────────────────────────────────────────
  private processConclusionsFromItems(items: any[]): Map<string, any[]> {
    const t0 = Date.now();

    const conclusionsByMeetingId = new Map<string, any[]>();

    for (const item of items) {
      let raw: { id: string; content: string }[] = [];
      try {
        const parsed = JSON.parse(item.conclusion_content);
        raw = Array.isArray(parsed) ? parsed : [];
      } catch {
        raw = [];
      }

      const meetingId: string = item.id;
      const meetingName: string = item.title;
      const meetingDate: string = normalizeDateValueDDMMYYYY(item.meeting_date);
      const state = item.meeting_state;
      let hideCheckbox = false;

      hideCheckbox = state !== 'DU_KIEN';

      const conclusions = raw.map((c, index) => ({
        id: c.id,
        content: c.content,
        type: 'conclusion',
        parent: meetingId,
        path: `${meetingId}/${c.id}`,
        title: `Kết luận ${index + 1}: ${c.content}`,
        meetingId,
        meetingName: meetingName || '',
        meetingDate: meetingDate || '',
        flags: { hideCheckbox: false },
      }));

      conclusionsByMeetingId.set(meetingId, conclusions);

      // Gắn flag hideCheckbox lên meeting item
      if (!item.flags || typeof item.flags !== 'object') item.flags = {};
      item.flags.hideCheckbox = hideCheckbox;
      delete item.conclusion_content;
    }

    return conclusionsByMeetingId;
  }

  // ─────────────────────────────────────────────
  // PHASE 8: Map meetings + flatten + merge conclusions
  // ─────────────────────────────────────────────
  private async mapAndMergeResults(
    items: any[],
    aliases: Record<string, string>,
    authority: string | undefined,
    userContext: { userId: string; roles: string[] },
    conclusionsByMeetingId: Map<string, any[]>,
  ): Promise<any[]> {
    const t0 = Date.now();

    const mappedMeetings = await this.mapDocKeyMeetingSource(items, aliases, authority, userContext);

    const flatConclusions: any[] = [];
    for (const arr of conclusionsByMeetingId.values()) {
      flatConclusions.push(...arr);
    }

    const merged = [...mappedMeetings, ...flatConclusions];
    return merged;
  }
  buildOrderByClause(
    sort: Record<string, string | number> | undefined | null,
    tableAlias: string,
    defaultSort?: string,
  ): string {
    const fallback = defaultSort ?? `${tableAlias}.meeting_date ASC, ${tableAlias}.meeting_time ASC`;

    if (!sort || typeof sort !== 'object' || Array.isArray(sort)) {
      return fallback;
    }

    const FIELD_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/; // whitelist field name

    const parts: string[] = Object.entries(sort)
      .filter(([field, dir]) => {
        if (!FIELD_PATTERN.test(field)) return false;
        const d = Number(dir);
        return d === 1 || d === -1;
      })
      .map(([field, dir]) => {
        const snakeField = this.camelToSnake(field);
        const direction = Number(dir) === -1 ? 'DESC' : 'ASC';
        return `${tableAlias}.${snakeField} ${direction}`;
      });

    return parts.length > 0 ? parts.join(', ') : fallback;
  }
  camelToSnake(str: string): string {
    if (!str || typeof str !== 'string') return str;
    return str
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
      .replace(/([a-z\d])([A-Z])/g, '$1_$2')
      .toLowerCase();
  }

  async listMeetingForTask(
    query: CreateMeetingDto,
    userId: string,
    authorId?: string,
  ) {
    const tTotal = Date.now();
    const { filter, processFn, authority, type, page = 1, limit = 20, sort } = query;

    // Guard: type validation trước khi làm bất cứ điều gì
    const ALLOWED_TYPES = ['day', 'week', 'month'] as const;
    if (type && !ALLOWED_TYPES.includes(type as any)) {
      throw new BadRequestException({ message: 'Type không hợp lệ', allowedTypes: ALLOWED_TYPES });
    }

    // ── Phase 1: context
    const { pool, userContext, featureManagement } = await this.resolveContext(
      userId, authorId, authority, processFn,
    );

    // Mặc định khoảng thời gian 2 tháng nếu không truyền ngày lọc
    let finalFilter = filter;
    if (typeof finalFilter === 'string') {
      try {
        finalFilter = JSON.parse(finalFilter);
      } catch {
        finalFilter = {};
      }
    }
    finalFilter = finalFilter && typeof finalFilter === 'object' ? { ...finalFilter } : {};

    const hasMeetingDate = finalFilter.meetingDate || finalFilter.meeting_date;
    if (!hasMeetingDate) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const formatDate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const r = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${r}`;
      };

      finalFilter.meetingDate = {
        startDate: formatDate(start),
        endDate: formatDate(end)
      };
    }

    // ── Phase 2: criteria
    const criteria = this.buildFilterCriteria(finalFilter);

    // ── Phase 3: WHERE
    let { whereClause, filterJoins, from } = this.buildWhereResult(
      finalFilter, criteria, featureManagement, userContext.userId, type,
    );

    // Exclude canceled meetings from task list
    whereClause = `${whereClause} AND ${from}.meeting_state NOT IN ('HUY', 'DA_HUY')`;

    // Only include meetings where current user is confirmed/processing/etc. (not NOT_PARTICIPATE or RECEIVED)
    whereClause = `${whereClause} AND EXISTS (
      SELECT 1
      FROM meeting_units mu
      JOIN meeting_participants mp ON mp.meeting_unit_id = mu.id
      WHERE mu.meeting_id = ${from}.id
        AND (
          mp.user_id = '${userContext.userId}'
          OR mp.delegated_to_user_id = '${userContext.userId}'
        )
        AND mp.participant_state NOT IN ('NOT_PARTICIPATE', 'RECEIVED')
    )`;

    // ── Phase 4 + 5 PARALLEL: IDs/total đồng thời với resolve fields
    const limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);

    const [{ total, meetingIds }, { meetingFields, aliases }] = await Promise.all([
      this.fetchPaginatedIds(pool, from, whereClause, filterJoins, pageNum, limitNum, sort),
      this.resolveSelectFields(from, processFn),
    ]);

    if (!meetingIds.length) {
      return { success: true, items: [], message: 'Không có dữ liệu', total: 0, page: pageNum, limit: limitNum, totalPages: 0 };
    }

    // ── Phase 6: details
    const items = await this.fetchMeetingDetails(pool, from, meetingIds, meetingFields);

    // ── Phase 7: conclusions
    const conclusionsByMeetingId = this.processConclusionsFromItems(items);

    // ── Phase 8: map + merge
    const mergedItems = await this.mapAndMergeResults(
      items, aliases, authority, userContext, conclusionsByMeetingId,
    );


    return {
      success: true,
      items: mergedItems,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async findRootUnit(unitId: string): Promise<string> {
    try {
      const pool = await this.getPool();
      const result = await pool.request()
        .input('unitId', unitId)
        .query(`
          SELECT mpath
          FROM ${this.dbname}.organization_units WITH (NOLOCK)
          WHERE id = @unitId AND status = 1
        `);

      const mpath = result.recordset[0]?.mpath;
      if (mpath) {
        const parts = mpath.split('/');
        return parts[0] || unitId;
      }
      return unitId;
    } catch (error) {
      this.logger.error(`[findRootUnit] Error for unitId=${unitId}:`, error);
      throw error;
    }
  }

  async getAllChildUnits(rootId: string): Promise<string[]> {
    try {
      const pool = await this.getPool();

      const sql = `
        SELECT id
        FROM ${this.dbname}.organization_units WITH (NOLOCK)
        WHERE (mpath = @rootId OR mpath LIKE @rootId + '/%') AND status = 1
      `;

      const result = await pool.request()
        .input('rootId', rootId)
        .query(sql);

      return result.recordset.map(r => r.id);
    } catch (error) {
      this.logger.error(`[getAllChildUnits] Error for rootId=${rootId}:`, error);
      throw error;
    }
  }
  async listMeetingUnit(
    query: CreateMeetingDto,
    userId: string,
    authorId?: string,
    req?: any,
  ) {
    const t0 = Date.now();
    const { filter, processFn, authority, type, page = 1, limit = 20, workstate, sort, isExport } = query;

    if (authority === 'true' && authorId) userId = authorId;

    const [pool, userRoleRes] = await Promise.all([
      this.getPool(),
      this.userService.getUserRole(userId, this.processKey),
    ]);
    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }
    const { roles } = userRoleRes;
    const receiverUnit = await this.getUserReceiverUnit(userId);
    const userContext = { userId, roles, receiverUnit };

    let siblingUnitIds: string[] = [];

    const t1 = Date.now();
    this.logger.log(`[PERF][listMeetingUnit] Step 1 Init & UserRole: ${t1 - t0}ms`);

    if (workstate === 'allunit' && receiverUnit) {
      const rootUnitId = await this.findRootUnit(receiverUnit);
      siblingUnitIds = await this.getAllChildUnits(rootUnitId);
    }

    const t2 = Date.now();
    this.logger.log(`[PERF][listMeetingUnit] Step 2 Tree Units (workstate=${workstate}): ${t2 - t1}ms | childUnitsCount=${siblingUnitIds.length}`);

    const ALLOWED_TYPES = ['day', 'week', 'month'] as const;
    if (type && !ALLOWED_TYPES.includes(type as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: ALLOWED_TYPES,
      });
    }
    const ALLOWED_WORKSTATES = ['unit', 'allunit'] as const;

    if (workstate && !ALLOWED_WORKSTATES.includes(workstate as any)) {
      throw new BadRequestException('Workstate không hợp lệ');
    }

    const criteria = this.buildCriteria(filter);

    const featureCriteria = featureManagement?.criteria ?? [];

    const leaderUserIds = Array.from(this.leaderUserIdSet);
    const { sql: filterFeature, from } = buildMeetingCriteriaHelper([...featureCriteria, ...criteria], 'meetings', featureManagement, leaderUserIds);

    const where: string[] = [
      `${from}.status = '1'`,
      // Chỉ hiển thị instance thực tế, không hiển thị bản template (lịch gốc lặp)
      `(${from}.is_template = 0 OR ${from}.is_template IS NULL)`,

      `(
        ${from}.meeting_state = 'DA_HUY'
        OR ${from}.stage_status = 'DONG_Y_PHE_DUYET'
      )`,

      `${from}.is_company = 0`
    ];

    // Lọc theo phòng ban
    if (workstate === 'unit' && receiverUnit) {
      where.push(`${from}.organizational_unit = '${receiverUnit}' `)
    }

    if (workstate === 'allunit' && siblingUnitIds.length) {
      const unitList = siblingUnitIds.map(id => `'${id}'`).join(',');
      where.push(`${from}.organizational_unit IN (${unitList})`)
    }

    if (filterFeature) where.push(`(${filterFeature})`);

    if (type === 'day' && filter?.currentDate) {
      where.push(
        `${from}.meeting_date >= '${filter.currentDate}' AND ${from}.meeting_date < DATEADD(day, 1, '${filter.currentDate}')`,
      );
    } else if (type === 'week' && filter?.currentWeek) {
      const { startDate, endDate } = filter.currentWeek;
      where.push(
        `${from}.meeting_date >= '${startDate}' AND ${from}.meeting_date <= '${endDate}'`,
      );
    } else if (type === 'month' && filter?.currentMonth) {
      const [year, month] = String(filter.currentMonth).split('-');
      where.push(
        `${from}.meeting_date >= '${year}-${month}-01' AND ${from}.meeting_date < DATEADD(month, 1, '${year}-${month}-01')`,
      );
    }

    const { dbKeys: meetingFields, aliases, allFilterFields } = await this.configurationService.buildFilterFieldsMeetings(from, [], processFn);
    const aliasFields = [
      'unitGuest',
      'seatAssignment',
      'leaderState',
      'participatingComponents',
      'documentPrepared',
      'participationRole',
      'delegatedFromUser',
      'meetingDuration',
    ];

    aliasFields.forEach((f) => {
      const snake = f.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allFilterFields.includes(f) || allFilterFields.includes(snake)) {
        aliases[f] = f;
      }
    });

    const customSortColumns = buildMeetingCustomSortColumns(from, leaderUserIds);
    const orderBy = ' ORDER BY ' + parseSortMeeting(sort, aliases, from, customSortColumns);
    const whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';

    let limitNum = Math.min(Number(limit) || 20, 100);
    if (type === 'day' || type === 'week' || type === 'month') {
      limitNum = 9999;
    }
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;

    // Lấy total
    const totalSql = `SELECT COUNT_BIG(1) AS total FROM ${this.dbname}.${from} ${whereClause} `;
    const idsSql = ` SELECT id FROM ${this.dbname}.${from} ${whereClause} ${orderBy} OFFSET ${offsetNum} ROWS FETCH NEXT ${limitNum} ROWS ONLY `;

    const t3 = Date.now();
    let totalResult, idsResult;
    try {
      [totalResult, idsResult] = await Promise.all([
        pool.request().query(totalSql),
        pool.request().query(idsSql),
      ]);
    } catch (e) {
      this.logger.error('[listMeetingUnit] Query execution failed. TOTAL SQL: ' + totalSql + ' | IDS SQL: ' + idsSql, e);
      throw new InternalServerErrorException('Lỗi truy vấn lịch phòng ban');
    }

    const t4 = Date.now();
    this.logger.log(`[PERF][listMeetingUnit] Step 3 Query totalSql & idsSql: ${t4 - t3}ms`);

    const total = totalResult.recordset[0]?.total ?? 0;
    const meetingIds = idsResult.recordset.map((row) => row.id);
    if (!meetingIds.length)
      return {
        success: true,
        items: [],
        message: 'Không có dữ liệu',
        total: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
      };

    const idsList = meetingIds.map((id) => `'${id}'`).join(',');

    const selectFields = [...meetingFields];
    if (!selectFields.some(f => f.includes('meeting_type') || f.includes('meetingType'))) {
      selectFields.push(`${from}.meeting_type`);
    }
    if (!selectFields.some(f => f.includes('meeting_mode') || f.includes('meetingMode'))) {
      selectFields.push(`${from}.meeting_mode`);
    }
    if (!selectFields.some(f => f.includes('priority'))) {
      selectFields.push(`${from}.priority`);
    }

    const detailsSql = `
      SELECT
        ${selectFields.join(',\n')},

        (SELECT mp.user_id, mp.seat_number, mu.room_id
          FROM meeting_participants mp WITH (NOLOCK)
          INNER JOIN meeting_units mu WITH (NOLOCK) ON mp.meeting_unit_id = mu.id
          WHERE mu.meeting_id = ${from}.id
          FOR JSON PATH
        ) AS participants_json,

        (SELECT om.meeting_link
          FROM online_meetings om WITH (NOLOCK)
          WHERE om.id = ${from}.online_meeting_id
          FOR JSON PATH
        ) AS online_meeting_json

      FROM ${this.dbname}.${from}
      WHERE ${from}.id IN (${idsList}) ${orderBy}
    `;

    const tab = workstate === 'allunit' ? 'Toàn bộ phòng ban' : 'Phòng ban'
    const details = `Truy cập Danh sách xem lịch đơn vị ${tab}, trang: ${page}, limit: ${limit}`;
    let detailsResult;
    try {
      const t5 = Date.now();
      detailsResult = await pool.request().query(detailsSql);
      const t6 = Date.now();
      this.logger.log(`[PERF][listMeetingUnit] Step 4 Query detailsSql (${detailsResult.recordset?.length || 0} items): ${t6 - t5}ms`);

      const items = detailsResult.recordset;

      const isParticipant = 'NO_ACTION';
      let detailedItemsMapped;
      const t7 = Date.now();
      if (type === 'day' || type === 'week' || type === 'month') {
        detailedItemsMapped = await this.mapDocKeyMeetingCalendar(
          items,
          aliases,
          authority,
          userContext,
          isParticipant,
        );
      } else {
        detailedItemsMapped = await this.mapDocKeyMeeting(
          items,
          aliases,
          authority,
          userContext,
          isParticipant,
          undefined,
          isExport
        );
      }
      const t8 = Date.now();
      this.logger.log(`[PERF][listMeetingUnit] Step 5 Mapping Data: ${t8 - t7}ms | TOTAL API TIME: ${t8 - t0}ms`);

      this.logAsync(req, userId, details, 'SUCCESS');
      return {
        success: true,
        items: detailedItemsMapped,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };
    } catch (e) {
      this.logAsync(req, userId, details, 'ERROR');
      this.logger.error(e);
      throw new InternalServerErrorException(
        'Lỗi truy vấn chi tiết lịch phòng ban',
      );
    }
  }

  // Lịch công ty
  async listMeetingCompany(
    query: CreateMeetingDto,
    userId: string,
    authorId?: string,
    req?: any
  ) {
    const { filter, processFn, authority, type, page = 1, limit = 20, sort, isExport } = query;

    const details = `Truy cập danh sách các cuộc họp của công ty, trang: ${page}, limit: ${limit}`;
    if (authority === 'true' && authorId) userId = authorId;

    const [pool, userRoleRes] = await Promise.all([
      this.getPool(),
      this.userService.getUserRole(userId, this.processKey),
    ]);
    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    const { roles } = userRoleRes;
    const receiverUnit = await this.getUserReceiverUnit(userId);
    const userContext = { userId, roles, receiverUnit };
    const leaderUserIds = Array.from(this.leaderUserIdSet);

    const ALLOWED_TYPES = ['day', 'week', 'month'] as const;
    if (type && !ALLOWED_TYPES.includes(type as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: ALLOWED_TYPES,
      });
    }

    const criteria = this.buildCriteria(filter);

    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, joins: filterJoins, from } = buildMeetingCriteriaHelper([...featureCriteria, ...criteria], 'meetings', featureManagement);

    const where: string[] = [];

    where.push(`(
      ${from}.meeting_state = 'DA_HUY'
      OR EXISTS (
        SELECT 1
        FROM ${this.dbname}.audit a WITH (NOLOCK)
        WHERE a.document_id = ${from}.id_str
          AND a.type_document = '${this.typeDocument}'
          AND a.stage_status = 'DONG_Y_PHE_DUYET'
      )
    )`);

    where.push(`(${from}.status = '1')`);
    // Là lịch tổng công ty
    where.push(`(${from}.is_company = 1)`);
    // Chỉ hiển thị instance thực tế, không hiển thị bản template (lịch gốc lặp)
    where.push(`(${from}.is_template = 0 OR ${from}.is_template IS NULL)`);
    if (filterFeature) where.push(`(${filterFeature})`);

    if (type === 'day' && filter?.currentDate) {
      where.push(
        `${from}.meeting_date >= '${filter.currentDate}' AND ${from}.meeting_date < DATEADD(day, 1, '${filter.currentDate}')`,
      );
    } else if (type === 'week' && filter?.currentWeek) {
      const { startDate, endDate } = filter.currentWeek;
      where.push(
        `${from}.meeting_date >= '${startDate}' AND ${from}.meeting_date <= '${endDate}'`,
      );
    } else if (type === 'month' && filter?.currentMonth) {
      const [year, month] = String(filter.currentMonth).split('-');
      where.push(
        `${from}.meeting_date >= '${year}-${month}-01' AND ${from}.meeting_date < DATEADD(month, 1, '${year}-${month}-01')`,
      );
    }

    // Xử lý filter từ filterJoins (nếu có filter trên bảng liên kết) qua EXISTS
    if (filterJoins) {
      // Giả sử filterJoins chứa các join cần cho filter, chuyển sang EXISTS
      // Ví dụ: Nếu có filter trên meeting_participants, audit, etc., thêm EXISTS tương ứng
      // Cần điều chỉnh buildMeetingCriteriaHelper để tách filter không cần join
    }

    const whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';

    let limitNum = Math.min(Number(limit) || 20, 100);
    if (type === 'day' || type === 'week' || type === 'month') {
      limitNum = 9999;
    }
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;

    const { dbKeys: meetingFields, aliases, allFilterFields } = await this.configurationService.buildFilterFieldsMeetings(from, [], processFn);
    const aliasFields = [
      'unitGuest',
      'seatAssignment',
      'leaderState',
      'participatingComponents',
      'documentPrepared',
      'participationRole',
      'delegatedFromUser',
      'meetingDuration',
    ];

    aliasFields.forEach((f) => {
      const snake = f.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allFilterFields.includes(f) || allFilterFields.includes(snake)) {
        aliases[f] = f;
      }
    });
    const customSortColumns = buildMeetingCustomSortColumns(from, leaderUserIds);
    const orderBy = ' ORDER BY ' + parseSortMeeting(sort, aliases, from, customSortColumns);
    const totalSql = ` SELECT COUNT(*) AS total FROM ${this.dbname}.${from} ${whereClause} `;

    const idsSql = ` SELECT id FROM ${this.dbname}.${from} ${whereClause} ${orderBy} OFFSET ${offsetNum} ROWS FETCH NEXT ${limitNum} ROWS ONLY `;

    // this.logger.debug('[MEETING COMPANY] TOTAL SQL:', totalSql);
    // this.logger.debug('[MEETING COMPANY] IDS SQL:', idsSql);

    let totalResult, idsResult;
    try {
      [totalResult, idsResult] = await Promise.all([
        pool.request().query(totalSql),
        pool.request().query(idsSql),
      ]);
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi truy vấn lịch công ty');
    }

    const total = totalResult.recordset[0]?.total ?? 0;
    const meetingIds = idsResult.recordset.map((row) => row.id);
    if (!meetingIds.length) {
      this.logAsync(req, userId, details, 'SUCCESS');
      return {
        success: true,
        items: [],
        message: 'Không có dữ liệu',
        total: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
      };
    }

    const idsList = meetingIds.map((id) => `'${id}'`).join(',');

    // Step 2: Lấy chi tiết với subquery JSON cho bảng 1-N
    const selectFields = [...meetingFields];
    if (!selectFields.some(f => f.includes('meeting_type') || f.includes('meetingType'))) {
      selectFields.push(`${from}.meeting_type`);
    }
    if (!selectFields.some(f => f.includes('meeting_mode') || f.includes('meetingMode'))) {
      selectFields.push(`${from}.meeting_mode`);
    }
    if (!selectFields.some(f => f.includes('priority'))) {
      selectFields.push(`${from}.priority`);
    }

    const detailsSql = `
      SELECT 
        ${selectFields.join(',\n')},
        ( SELECT TOP 1 u.name FROM users u WHERE u.id = ${from}.created_by ) AS createdBy,
        ( SELECT TOP 1 ou.name FROM users u INNER JOIN organization_units ou ON ou.id = u.parent
          WHERE u.id = ${from}.created_by
        ) AS createdByOrg,
        (SELECT mp.user_id, mp.seat_number, mu.room_id
        FROM meeting_participants mp
        INNER JOIN meeting_units mu ON mp.meeting_unit_id = mu.id
        WHERE mu.meeting_id = ${from}.id
        FOR JSON PATH) AS participants_json,
        (SELECT om.meeting_link
        FROM online_meetings om
        WHERE om.id = ${from}.online_meeting_id
        FOR JSON PATH) AS online_meeting_json,
        (SELECT a.receiver, a.receiver_unit, a.stage_status, a.roleProcess, a.role, a.action, a.deadline, a.details
        FROM ${this.dbname}.audit a
        WHERE a.document_id = ${from}.id_str
        FOR JSON PATH) AS audit_json
      FROM ${this.dbname}.${from}
      WHERE ${from}.id IN (${idsList}) ${orderBy}
    `;

    // this.logger.debug('[MEETING COMPANY] DETAILS SQL:', detailsSql);

    let detailsResult;
    try {
      detailsResult = await pool.request().query(detailsSql);

      const items = detailsResult.recordset;

      const isParticipant = 'NO_ACTION';
      let detailedItemsMapped;
      if (type === 'day' || type === 'week' || type === 'month') {
        detailedItemsMapped = await this.mapDocKeyMeetingCalendar(
          items,
          aliases,
          authority,
          userContext,
          isParticipant,
        );
      } else {
        detailedItemsMapped = await this.mapDocKeyMeeting(
          items,
          aliases,
          authority,
          userContext,
          isParticipant,
          undefined,
          isExport
        );
      }
      this.logAsync(req, userId, details, 'SUCCESS');

      return {
        success: true,
        items: detailedItemsMapped,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };
    } catch (e) {
      this.logAsync(req, userId, details, 'ERROR');
      this.logger.error(e);
      throw new InternalServerErrorException(
        'Lỗi truy vấn chi tiết lịch công ty',
      );
    }

  }

  async listPrepareMeetingSchedule(
    query: CreateMeetingDto,
    userId: string,
    authorId?: string,
    req?: any
  ) {
    const { type, page = 1, limit = 20, filter, sort, processFn, authority, isExport } = query;

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const [pool, userRoleRes, featureManagement, receiverUnit] = await Promise.all([
      this.getPool(),
      this.userService.getUserRole(userId, this.processKey),
      processFn ? this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      }) : Promise.resolve(null),
      this.getUserReceiverUnit(userId),
    ]);

    const { roles } = userRoleRes;
    const userContext = { userId, roles, receiverUnit };
    const leaderUserIds = Array.from(this.leaderUserIdSet);

    const criteria = this.buildCriteria(filter);

    const featureCriteria = featureManagement?.criteria ?? [];
    const { sql: filterFeature, joins: filterJoins, from, } = buildMeetingCriteriaHelper([...featureCriteria, ...criteria], 'meetings', featureManagement,);

    const MEETING_TYPES = ['daft', 'waiting', 'agree', 'refuse', 'cancel'] as const;
    if (!type || !MEETING_TYPES.includes(type as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: MEETING_TYPES,
      });
    }

    const isDaft = type === 'daft';
    const isWaiting = type === 'waiting';
    const isAgree = type === 'agree';
    const isProcessed = type === 'refuse';
    const isCancel = type === 'cancel';

    const where: string[] = [];
    where.push(`${from}.status = '1'`);
    // Chỉ hiển thị instance thực tế, không hiển thị bản template (lịch gốc lặp) đã được duyệt và đã sinh phiên thực tế (để tránh trùng lặp khi cron sinh ra instance)
    where.push(`(${from}.is_template = 0 OR ${from}.is_template IS NULL OR (${from}.stage_status != 'DONG_Y_PHE_DUYET' OR ${from}.stage_status IS NULL) OR NOT EXISTS (SELECT 1 FROM ${this.dbname}.${from} child WITH (NOLOCK) WHERE child.parent_id = ${from}.id AND child.status = '1'))`);
    where.push(`${from}.meeting_state <> 'DA_HUY'`);

    let joinClause = filterJoins || '';

    if (isDaft) {
      joinClause += `
        OUTER APPLY (
          SELECT TOP 1
            a.stage_status,
            a.receiver,
            a.user_id,
            a.created_by
          FROM ${this.dbname}.audit a WITH (NOLOCK)
          WHERE a.document_id = ${from}.id_str
            AND (
              a.receiver = '${userId}'
              OR a.user_id = '${userId}'
            ) 
            AND a.created_by = '${userId}'
            AND a.roleProcess = 'processor'
          ORDER BY a.created_at DESC, a.id DESC
        ) last_audit
      `;

      // WHERE cho daft
      where.push(`last_audit.stage_status = '${stageStatusDoc.CHUA_XU_LY}'`);
    }

    if (isWaiting) {
      where.push(`
        ${from}.stage_status IS NULL
        AND ${from}.created_by = '${userId}'
      `);
    }

    if (isAgree) {
      where.push(`
        ${from}.stage_status = '${stageStatusDoc.DONG_Y_PHE_DUYET}'
        AND ${from}.created_by = '${userId}'
      `);
    }

    if (isProcessed) {
      where.push(`
        ${from}.stage_status = '${stageStatusDoc.TU_CHOI_PHE_DUYET}'
        AND ${from}.created_by = '${userId}'
      `);
    }

    if (isCancel) {
      where.length = 0;
      where.push(`${from}.status = '1'`);
      where.push(`${from}.meeting_state = 'DA_HUY'`);
      where.push(`
        ${from}.created_by = '${userId}'
      `);
    }

    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const whereClause = ' WHERE ' + where.join(' AND ');

    const limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;

    const { dbKeys, aliases, allFilterFields } = await this.configurationService.buildFilterFieldsMeetings(from, [], processFn);
    const aliasFields = [
      'unitGuest',
      'seatAssignment',
      'leaderState',
      'participatingComponents',
      'documentPrepared',
      'participationRole',
      'delegatedFromUser',
      'meetingDuration',
    ];

    aliasFields.forEach((f) => {
      const snake = f.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allFilterFields.includes(f) || allFilterFields.includes(snake)) {
        aliases[f] = f;
      }
    });
    const selectFields = dbKeys.join(', ');
    const customSortColumns = buildMeetingCustomSortColumns(from, leaderUserIds);
    const orderBy = ' ORDER BY ' + parseSortMeeting(sort, aliases, from, customSortColumns);

    const totalSql = `  SELECT COUNT(*) AS total FROM ${this.dbname}.${from} WITH (NOLOCK) ${joinClause} ${whereClause} `;

    const rowsSql = ` SELECT ${selectFields} FROM ${this.dbname}.${from} WITH (NOLOCK) ${joinClause} ${whereClause} ${orderBy} OFFSET ${offsetNum} ROWS FETCH NEXT ${limitNum} ROWS ONLY `;

    // this.logger.debug('[MEETING PREPARE] TOTAL SQL:', totalSql);
    // this.logger.debug('[MEETING PREPARE] ROWS SQL:', rowsSql);

    const TAB_MAP = {
      draft: 'Dự thảo',
      waiting: 'Chờ phê duyệt',
      agree: 'Đã phê duyệt',
      refuse: 'Từ chối',
      cancel: 'Đã huỷ',
    } as const;
    const typeKey = (type || '').toLowerCase() as keyof typeof TAB_MAP;
    const tabName = TAB_MAP[typeKey] || 'Tất cả';
    const details = `Truy cập danh sách tạo lịch (${tabName}), trang: ${page}, limit: ${limit}`;
    let totalResult, rowsResult;

    try {
      const totalRequest = pool.request().input('userId', userId);
      const rowsRequest = pool.request().input('userId', userId);

      [totalResult, rowsResult] = await Promise.all([
        totalRequest.query(totalSql),
        rowsRequest.query(rowsSql),
      ]);

      const total = totalResult.recordset[0]?.total ?? 0;
      const items = rowsResult.recordset;

      if (!items.length) { return { success: true, items: [], message: 'Không có dữ liệu', total: 0, page: pageNum, limit: limitNum, totalPages: 0, }; }

      const isParticipant = isCancel ? 'NO_ACTION_PREPARE' : 'PREPARE_MEETING';

      const bpmnVersions: string[] = Array.from(
        new Set(items.map((i) => i.bpmn_version as string).filter(Boolean))
      );

      const bpmnModels = await Promise.all(
        bpmnVersions.map(async (version) => {
          const model = await this.getBpmnModelCached(version);
          return { version, model };
        })
      );

      const bpmnEngineMap = new Map();
      bpmnModels.forEach(({ version, model }) => {
        if (model) {
          bpmnEngineMap.set(version, {
            process: model.process,
            indexes: model.indexes,
            userParent: receiverUnit,
          });
        }
      });

      const [itemsMapAction, detailItems] = await Promise.all([
        this.mapAvailableActionsBatch(
          items,
          userContext,
          bpmnEngineMap,
          isParticipant,
        ),
        this.mapDocKeyMeeting(items, aliases, authority, userContext, isParticipant, undefined, isExport)
      ]);

      detailItems.forEach((mapped, i) => {
        const actionItem = itemsMapAction[i];
        if (actionItem) {
          const isNotEdit = mapped.isNotEdit;
          const isNotCancel = mapped.isNotCancel;
          delete mapped.isNotEdit;
          delete mapped.isNotCancel;

          mapped.workItem = actionItem.workItem ? { ...actionItem.workItem } : null;
          if (mapped.workItem && mapped.workItem.documentId) {
            delete mapped.workItem.documentId;
          }

          mapped.availableActions = actionItem.availableActions;
          mapped.flags = actionItem.flags || {};

          if (actionItem.flags?.hideCheckbox !== undefined) {
            mapped.flags.hideCheckbox = actionItem.flags.hideCheckbox || items[i].meeting_state !== 'DU_KIEN';
          }

          if (isNotEdit !== undefined) mapped.isNotEdit = isNotEdit;
          if (isNotCancel !== undefined) mapped.isNotCancel = isNotCancel;
        }
      });

      this.logAsync(req, userId, details, 'SUCCESS');
      return {
        success: true,
        items: detailItems,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };
    } catch (e) {
      this.logAsync(req, userId, details, 'ERROR');
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi truy vấn dữ liệu lịch họp');
    }
  }

  async getMeetingMeta(meetingId: string, userId: string) {
    const pool = await this.getPool();

    const rs = await pool.request()
      .input('meetingId', meetingId)
      .input('userId', userId)
      .input('type', this.typeDocument)
      .query(`
        SELECT 
          isApproved = CASE WHEN EXISTS (
            SELECT 1 FROM audit WITH (NOLOCK)
            WHERE document_id = @meetingId
              AND type_document = @type
              AND stage_status = 'DONG_Y_PHE_DUYET'
          ) THEN 1 ELSE 0 END,

          canJoin = CASE WHEN EXISTS (
            SELECT 1
            FROM meeting_participants mp
            JOIN meeting_units mu ON mp.meeting_unit_id = mu.id
            WHERE mu.meeting_id = @meetingId
              AND mp.user_id = @userId
              AND mp.participant_role IN ('CHAIRMAN','SECRETARY')
              AND mp.attendance_state = 'CONFIRMED'
          ) THEN 1 ELSE 0 END
      `);

    return {
      isApproved: rs.recordset[0]?.isApproved === 1,
      canJoin: rs.recordset[0]?.canJoin === 1,
    };
  }
  private async getMeetingMetaBatch(
    meetingIds: string[],
    userId: string,
  ) {
    const pool = await this.getPool();

    const idsParam = meetingIds.map((_, i) => `@id${i}`).join(',');

    const request = pool.request().input('userId', userId);

    meetingIds.forEach((id, i) => {
      request.input(`id${i}`, id);
    });

    const rs = await request.query(`
      SELECT 
        m.id,
        m.created_by,
        m.meeting_state,

        CASE WHEN EXISTS (
          SELECT 1 FROM ${this.dbname}.audit a WITH (NOLOCK)
          WHERE a.document_id = m.id_str
            AND a.stage_status = 'DONG_Y_PHE_DUYET'
        ) THEN 1 ELSE 0 END AS isApproved,

        CASE WHEN EXISTS (
          SELECT 1 FROM ${this.dbname}.audit a WITH (NOLOCK)
          WHERE a.document_id = m.id_str
            AND a.stage_status IN ('BI_HUY', 'TU_CHOI_PHE_DUYET')
        ) THEN 1 ELSE 0 END AS isMeetingRejected,

        CASE WHEN (
          SELECT TOP 1 
            CASE WHEN r.stage_status = 'TU_CHOI_PHE_DUYET' OR r.action_code = 'TU_CHOI_LICH' THEN 1 ELSE 0 END
          FROM ${this.dbname}.audit r WITH (NOLOCK)
          WHERE r.document_id = m.id_str
            AND (r.receiver = 'BAN_QUAN_LY_PHONG' OR r.action_code = 'TU_CHOI_LICH')
          ORDER BY r.created_at DESC, r.id DESC
        ) = 1 THEN 1 ELSE 0 END AS isRoomRejected,

        CASE WHEN EXISTS (
          SELECT 1
          FROM ${this.dbname}.meeting_participants mp WITH (NOLOCK)
          INNER JOIN ${this.dbname}.meeting_units mu WITH (NOLOCK)
            ON mp.meeting_unit_id = mu.id
          WHERE mu.meeting_id = m.id
            AND mp.user_id = @userId
            AND mp.participant_role IN ('CHAIRMAN','SECRETARY')
            AND mp.attendance_state = 'CONFIRMED'
        ) THEN 1 ELSE 0 END AS canJoin

      FROM ${this.dbname}.meetings m
      WHERE m.id IN (${idsParam})
    `);

    const map = new Map();

    rs.recordset.forEach(r => {
      map.set(r.id, {
        meetingState: r.meeting_state,
        createdBy: r.created_by,
        isApproved: !!r.isApproved,
        isMeetingRejected: !!r.isMeetingRejected,
        isRoomRejected: !!r.isRoomRejected,
        canJoin: !!r.canJoin,
      });
    });

    return map;
  }
  private async getWorkItemsBatch(meetingIds: string[]) {
    const map = new Map<string, any[]>();

    const list = await this.sqlRepo.listOpenWorkItemsByIds(meetingIds);

    for (const wi of list) {
      if (!map.has(wi.documentId)) {
        map.set(wi.documentId, []);
      }
      map.get(wi.documentId)!.push(wi);
    }

    return map;
  }
  private async isUserInFlow(userId: string, processKey: string): Promise<boolean> {
    const quick = await this.userService.isUserInFlowQuick(userId, processKey);
    if (quick) return true;
    const role = await this.sqlsvRepo.getUserRole(userId, processKey);
    return !!role;
  }

  private async mapAvailableActionsBatch(
    items: any[],
    userContext,
    bpmnEngineMap,
    listparammeeting?: string,
  ) {
    const roleCache = new Map<string, any[]>();
    const meetingIds = items.map(i => i.id);

    const [metaMap, workItemMap] = await Promise.all([
      this.getMeetingMetaBatch(meetingIds, userContext.userId),
      this.getWorkItemsBatch(meetingIds),
    ]);

    const getUsersByRole = async (role: string) => {
      let users = roleCache.get(role);
      if (!users) {
        users = (await this.sqlsvRepo.getUsersByRoleMongoDB(role)).slice(0, 50);
        roleCache.set(role, users);
      }
      return users;
    };

    return Promise.all(
      items.map(async (item) => {
        const meta = metaMap.get(item.id);
        const openWorkItems = workItemMap.get(item.id) ?? [];
        const inFlow = listparammeeting === 'APPROVER_MEETING' && userContext.roles?.includes('BAN_QUAN_LY_PHONG_HOP') && await this.isUserInFlow(userContext.userId, item.bpmn_version || 'QUY_TRINH_LICH_HOP');

        if (!meta || (openWorkItems.length === 0 && listparammeeting !== 'NO_ACTION_APPROVER' && !inFlow)) {
          return {
            ...item,
            workItem: null,
            availableActions: [],
            flags: {},
          };
        }

        const engine = item.bpmn_version
          ? bpmnEngineMap.get(item.bpmn_version)
          : null;

        if (!engine?.process && listparammeeting !== 'NO_ACTION_APPROVER' && !inFlow) {
          return {
            ...item,
            workItem: null,
            availableActions: [],
            flags: {},
          };
        }

        const isDuKien = meta.meetingState === 'DU_KIEN';
        const isCreatedByMe = meta.createdBy === userContext.userId;
        const isRecurring = !!item.recurrence_type;

        const rules = await this.getRules(item.bpmn_version || 'QUY_TRINH_LICH_HOP');
        const approverRole = rules?.['APPROVER_MEETING']?.role || 'BAN_QUAN_LY_PHONG_HOP';
        const isApprover = userContext.roles?.includes(approverRole);

        const sortedWorkItems = [...openWorkItems];
        if (listparammeeting === 'APPROVER_MEETING' && inFlow && !meta.isApproved) {
          const approverNodeId = rules?.['APPROVER_MEETING']?.id || 'Event_1et5lvd';
          if (!sortedWorkItems.some(wi => wi.nodeId === approverNodeId)) {
            sortedWorkItems.push({
              id: `wi_virtual_${item.id}`,
              documentId: item.id,
              assigneeUserId: userContext.userId,
              nodeId: approverNodeId,
              nodeType: null,
              role: approverRole,
              state: 'open',
            } as any);
          }
        }
        const isParticipantMeeting = listparammeeting === 'PARTICIPANT_MEETING';
        if (isParticipantMeeting) {
          sortedWorkItems.sort((a, b) => {
            const aIsParticipant = a.role === 'NGUOI_THAM_GIA';
            const bIsParticipant = b.role === 'NGUOI_THAM_GIA';
            if (aIsParticipant && !bIsParticipant) return -1;
            if (!aIsParticipant && bIsParticipant) return 1;
            return 0;
          });
        }

        // 🚀 chạy song song tất cả workItems
        let results: any[] = [];
        if (engine?.process && engine?.indexes) {
          results = await Promise.all(
            sortedWorkItems.map((wi) =>
              this.bpmnEngine.computeAvailableActions({
                process: engine.process,
                indexes: engine.indexes,
                currentNodeId: wi.nodeId,
                workItem: wi,
                document: item,
                userId: userContext.userId,
                userRoles: userContext.roles,
                priorityRole: isParticipantMeeting ? 'NGUOI_THAM_GIA' : undefined,
                getUsersByRole,
              })
            )
          );
        }

        let summary: any = null;
        const flags: any = {};

        for (let i = 0; i < results.length; i++) {
          const r = results[i];

          // merge flags (nhanh hơn spread)
          if (r.flags) {
            for (const k in r.flags) {
              flags[k] = r.flags[k];
            }
          }

          const hasExecutable = r.availableActions?.some((a: any) => a.canExecute);
          const currentHasExecutable = summary?.availableActions?.some((a: any) => a.canExecute);

          const shouldUpdate = !summary ||
            (hasExecutable && (
              !currentHasExecutable ||
              (isParticipantMeeting && sortedWorkItems[i].role === 'NGUOI_THAM_GIA' && summary.workItem?.role !== 'NGUOI_THAM_GIA')
            ));

          if (shouldUpdate) {
            summary = {
              workItem: sortedWorkItems[i],
              availableActions: r.availableActions,
            };
          }
        }

        let actions = summary?.availableActions ?? [];

        // ===== business logic =====
        if (listparammeeting === 'PREPARE_MEETING' && meta.isApproved && isDuKien) {
          actions = [this.buildCancelAction(isRecurring)];
        }

        if (listparammeeting === 'PREPARE_MEETING' && isCreatedByMe) {
          if (
            meta.isRoomRejected ||
            (
              meta.isApproved && (
                meta.isMeetingRejected ||
                meta.meetingState === 'DU_KIEN' ||
                meta.meetingState === 'DA_HUY'
              )
            )
          ) {
            actions.push(this.buildEditAction(isRecurring));
          }
        }

        if (meta.canJoin && isDuKien) {
          actions.push(this.buildCancelAction(isRecurring));
        }

        if (listparammeeting === 'NO_ACTION') {
          actions = [];
        }

        if (listparammeeting === 'NO_ACTION_APPROVER') {
          actions = [];
          if (isCreatedByMe && meta.meetingState !== 'DA_HUY') {
            actions.push(this.buildEditAction(isRecurring));
          }
          if (meta.isApproved && isDuKien && meta.meetingState !== 'DA_HUY' && isApprover && !isCreatedByMe) {
            if (meta.meetingState !== 'KET_THUC') {
              actions.push(this.buildCancelAction(isRecurring));
            }
          }
        }

        if (meta.isMeetingRejected) {
          actions = [];
        }



        return {
          ...item,
          workItem: summary?.workItem ?? null,
          nodeId: summary?.workItem?.nodeId ?? null,
          role: summary?.workItem?.role ?? null,
          availableActions: actions,
          flags,
        };
      })
    );
  }
  private async mapAvailableActionsForMeeting(
    item: any,
    userContext: {
      userId: string;
      roles: string[];
      receiverUnit?: string | null;
    },
    bpmnEngineMap: Map<string, { process: any; indexes: any }>,
    opts: any,
    listparammeeting?: string,
    roleCache: Map<string, any[]> = new Map(),
  ) {
    // ✅ nhẹ
    const meeting = await this.meetingRepo.findOne({
      where: { id: item.id },
      select: ['id', 'createdBy', 'meetingState'],
    });

    if (!meeting) {
      return { ...item, workItem: null, availableActions: [], flags: {} };
    }

    const isDuKien = meeting.meetingState === 'DU_KIEN';
    const isCreatedByMe = meeting.createdBy === userContext.userId;
    const isRecurring = !!item.recurrence_type;

    const engine = item.bpmn_version
      ? bpmnEngineMap.get(item.bpmn_version)
      : null;

    const inFlow = listparammeeting === 'APPROVER_MEETING' && userContext.roles?.includes('BAN_QUAN_LY_PHONG_HOP') && await this.isUserInFlow(userContext.userId, item.bpmn_version || 'QUY_TRINH_LICH_HOP');

    if ((!engine?.process || !engine?.indexes) && listparammeeting !== 'NO_ACTION_APPROVER' && !inFlow) {
      return { ...item, workItem: null, availableActions: [], flags: {} };
    }

    const actorId = opts.isHandlerMeeting
      ? userContext.receiverUnit
      : userContext.userId;

    if (!actorId) {
      return { ...item, workItem: null, availableActions: [], flags: {} };
    }

    const [openWorkItems, meta] = await Promise.all([
      this.sqlRepo.listOpenWorkItems(item.id),
      this.getMeetingMeta(item.id, userContext.userId),
    ]);

    if (!openWorkItems?.length && listparammeeting !== 'NO_ACTION_APPROVER' && !inFlow) {
      return { ...item, workItem: null, availableActions: [], flags: {} };
    }

    const sortedWorkItems = [...openWorkItems];
    if (listparammeeting === 'APPROVER_MEETING' && inFlow && !meta?.isApproved) {
      const rules = await this.getRules(item.bpmn_version || 'QUY_TRINH_LICH_HOP');
      const approverNodeId = rules?.['APPROVER_MEETING']?.id || 'Event_1et5lvd';
      const approverRole = rules?.['APPROVER_MEETING']?.role || 'BAN_QUAN_LY_PHONG_HOP';
      if (!sortedWorkItems.some(wi => wi.nodeId === approverNodeId)) {
        sortedWorkItems.push({
          id: `wi_virtual_${item.id}`,
          documentId: item.id,
          assigneeUserId: userContext.userId,
          nodeId: approverNodeId,
          nodeType: null,
          role: approverRole,
          state: 'open',
        } as any);
      }
    }
    const isParticipantMeeting = listparammeeting === 'PARTICIPANT_MEETING';
    if (isParticipantMeeting) {
      sortedWorkItems.sort((a, b) => {
        const aIsParticipant = a.role === 'NGUOI_THAM_GIA';
        const bIsParticipant = b.role === 'NGUOI_THAM_GIA';
        if (aIsParticipant && !bIsParticipant) return -1;
        if (!aIsParticipant && bIsParticipant) return 1;
        return 0;
      });
    }

    const getUsersByRole = async (role: string) => {
      if (!roleCache.has(role)) {
        const users = await this.sqlsvRepo.getUsersByRoleMongoDB(role);
        roleCache.set(role, users.slice(0, 50));
      }
      return roleCache.get(role)!;
    };

    let summary: any = null;
    const flags: any = {};

    if (engine?.process && engine?.indexes) {
      for (const wi of sortedWorkItems) {
        const r = await this.bpmnEngine.computeAvailableActions({
          process: engine.process,
          indexes: engine.indexes,
          currentNodeId: wi.nodeId,
          workItem: wi,
          document: item,
          userId: actorId,
          userRoles: userContext.roles,
          priorityRole: isParticipantMeeting ? 'NGUOI_THAM_GIA' : undefined,
          getUsersByRole,
        });

        Object.assign(flags, r.flags);

        const hasExecutable = r.availableActions?.some((a: any) => a.canExecute);
        const currentHasExecutable = summary?.availableActions?.some((a: any) => a.canExecute);

        const shouldUpdate = !summary ||
          (hasExecutable && (
            !currentHasExecutable ||
            (isParticipantMeeting && wi.role === 'NGUOI_THAM_GIA' && summary.workItem?.role !== 'NGUOI_THAM_GIA')
          ));

        if (shouldUpdate) {
          summary = {
            workItem: wi,
            availableActions: r.availableActions,
          };
        }
      }
    }

    let actions = summary?.availableActions ?? [];

    const isCancel = meeting.meetingState === 'DA_HUY';
    const isPrepareList = listparammeeting === 'PREPARE_MEETING';
    const isNoActionList = listparammeeting === 'NO_ACTION';

    if (isPrepareList && meta.isApproved && !isCancel && isDuKien) {
      actions = [this.buildCancelAction(isRecurring)];
    }

    if (
      isPrepareList &&
      isCreatedByMe &&
      ['DU_KIEN', 'DA_HUY'].includes(meeting.meetingState)
    ) {
      actions.push(this.buildEditAction(isRecurring));
    }

    if (meta.canJoin && isDuKien) {
      actions.push(this.buildCancelAction(isRecurring));
    }

    if (isNoActionList) actions = [];

    if (listparammeeting === 'NO_ACTION_APPROVER') {
      actions = [];
      if (isCreatedByMe && meeting.meetingState !== 'DA_HUY') {
        actions.push(this.buildEditAction(isRecurring));
      }
    }



    return {
      ...item,
      workItem: summary?.workItem ?? null,
      nodeId: summary?.workItem?.nodeId ?? null,
      role: summary?.workItem?.role ?? null,
      availableActions: actions,
      flags,
    };
  }

  async getAvailableActionsForDashboardMeetings(
    meetingIds: string[],
    userId: string,
  ): Promise<
    Map<
      string,
      {
        availableActions: any[];
        flags: Record<string, any>;
        workItem: any;
        openWorkItem: any;
      }
    >
  > {
    const result = new Map<
      string,
      {
        availableActions: any[];
        flags: Record<string, any>;
        workItem: any;
        openWorkItem: any;
      }
    >();
    const uniqueMeetingIds = Array.from(
      new Set((meetingIds || []).filter((id): id is string => !!id)),
    );

    if (!uniqueMeetingIds.length) {
      return result;
    }

    const [{ roles }, meetings] = await Promise.all([
      this.userService.getUserRole(userId, this.processKey),
      this.meetingRepo.find({
        where: { id: In(uniqueMeetingIds) },
      }),
    ]);

    const receiverUnit = await this.getUserReceiverUnit(userId);
    const userContext = { userId, roles, receiverUnit };

    const mappedItems = await Promise.all(
      meetings.map(async (meeting) => {
        if (!meeting.bpmnVersion) {
          return { id: meeting.id, availableActions: [], flags: {}, workItem: null, openWorkItem: null };
        }

        const model = await this.getBpmnModelCached(meeting.bpmnVersion);
        if (!model?.process || !model?.indexes) {
          return { id: meeting.id, availableActions: [], flags: {}, workItem: null, openWorkItem: null };
        }

        const openWorkItems = await this.sqlRepo.listOpenWorkItems(meeting.id);
        if (!openWorkItems?.length) {
          return { id: meeting.id, availableActions: [], flags: {}, workItem: null, openWorkItem: null };
        }

        const roleCache = new Map<string, any[]>();
        const perItems = await Promise.all(
          openWorkItems.map(async (wi) => {
            const res = await this.bpmnEngine.computeAvailableActions({
              process: model.process,
              indexes: model.indexes,
              currentNodeId: wi.nodeId,
              workItem: wi,
              document: meeting,
              userId: userContext.userId,
              userRoles: userContext.roles,
              getUsersByRole: async (role: string) => {
                if (!roleCache.has(role)) {
                  roleCache.set(role, await this.sqlsvRepo.getUsersByRoleMongoDB(role));
                }
                return roleCache.get(role) ?? [];
              },
              userParent: userContext.receiverUnit ?? undefined,
              documentId: meeting.id,
            });

            return {
              workItem: wi,
              availableActions: res.availableActions || [],
              flags: res.flags || {},
            };
          }),
        );

        const summary =
          perItems.find((x) =>
            x.availableActions.some((a: any) => a.canExecute),
          ) || perItems[0];

        return {
          id: meeting.id,
          availableActions: summary?.availableActions || [],
          flags: summary?.flags || {},
          workItem: summary?.workItem || null,
          openWorkItem: summary?.workItem || null,
        };
      }),
    );

    mappedItems.forEach((item: any) => {
      result.set(item.id, {
        availableActions: item.availableActions || [],
        flags: item.flags || {},
        workItem: item.workItem || null,
        openWorkItem: item.openWorkItem || null,
      });
    });

    uniqueMeetingIds.forEach((meetingId) => {
      if (!result.has(meetingId)) {
        result.set(meetingId, { availableActions: [], flags: {}, workItem: null, openWorkItem: null });
      }
    });

    return result;
  }
  async listApprovalSchedule(
    query: CreateMeetingDto,
    userId: string,
    authorId?: string,
    req?: any
  ) {
    const { type, page = 1, limit = 20, filter, sort, processFn, authority, isExport } = query;

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const [pool, userRoleRes] = await Promise.all([
      this.getPool(),
      this.userService.getUserRole(userId, this.processKey),
    ]);

    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    const { roles } = userRoleRes;
    const receiverUnit = await this.getUserReceiverUnit(userId);
    const userContext = { userId, roles, receiverUnit };
    const leaderUserIds = Array.from(this.leaderUserIdSet);

    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];
    const { sql: filterFeature, joins: filterJoins, from } = buildMeetingCriteriaHelper([...featureCriteria, ...criteria], 'meetings', featureManagement, leaderUserIds);

    // ===== validate =====
    const MEETING_TYPES = ['waiting', 'agree', 'refuse', 'agree-me'] as const;
    if (!type || !MEETING_TYPES.includes(type as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: MEETING_TYPES,
      });
    }

    const isWaiting = type === 'waiting';
    const isAgree = type === 'agree';
    const isAgreeMe = type === 'agree-me';
    const isProcessed = type === 'refuse';

    const where: string[] = [];
    where.push(`${from}.status = '1'`);
    // Chỉ hiển thị instance thực tế, không hiển thị bản template (lịch gốc lặp) đã được duyệt và đã sinh phiên thực tế (để tránh trùng lặp khi cron sinh ra instance)
    where.push(`(${from}.is_template = 0 OR ${from}.is_template IS NULL OR (${from}.stage_status != 'DONG_Y_PHE_DUYET' OR ${from}.stage_status IS NULL) OR NOT EXISTS (SELECT 1 FROM ${this.dbname}.${from} child WITH (NOLOCK) WHERE child.parent_id = ${from}.id AND child.status = '1'))`);

    const joinClause = filterJoins || '';

    if (isWaiting) {
      where.push(`
        ${from}.stage_status IS NULL
      `);
    }

    if (isAgree) {
      where.push(`
        ${from}.stage_status = '${stageStatusDoc.DONG_Y_PHE_DUYET}'
      `);

      where.push(`${from}.created_by != '${userId}'`);
      where.push(`${from}.meeting_state != 'DA_HUY'`);
    }
    if (isAgreeMe) {
      where.push(`
        ${from}.stage_status = '${stageStatusDoc.DONG_Y_PHE_DUYET}'
      `);
      where.push(`${from}.created_by = '${userId}'`);
      where.push(`${from}.meeting_state != 'DA_HUY'`);
    }

    if (isProcessed) {
      where.push(`
        ${from}.stage_status = '${stageStatusDoc.TU_CHOI_PHE_DUYET}'
      `);
    }

    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const whereClause = ' WHERE ' + where.join(' AND ');

    const limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;

    const { dbKeys, aliases, allFilterFields } = await this.configurationService.buildFilterFieldsMeetings(from, [], processFn);
    const aliasFields = [
      'unitGuest',
      'seatAssignment',
      'leaderState',
      'participatingComponents',
      'documentPrepared',
      'participationRole',
      'delegatedFromUser',
      'meetingDuration',
    ];

    aliasFields.forEach((f) => {
      const snake = f.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allFilterFields.includes(f) || allFilterFields.includes(snake)) {
        aliases[f] = f;
      }
    });
    const selectFields = dbKeys.join(', ');
    const customSortColumns = buildMeetingCustomSortColumns(from, leaderUserIds);
    const orderBy = ' ORDER BY ' + parseSortMeeting(sort, aliases, from, customSortColumns);

    const totalSql = ` SELECT COUNT(DISTINCT ${from}.id) AS total FROM ${this.dbname}.${from} ${joinClause} ${whereClause} `;

    const rowsSql = `
      SELECT ${selectFields}
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
      ${orderBy}
      OFFSET ${offsetNum} ROWS FETCH NEXT ${limitNum} ROWS ONLY
    `;

    // this.logger.debug('[MEETING PREPARE] TOTAL SQL:', totalSql);

    const TAB_MAP: Record<string, string> = {
      waiting: 'Chờ phê duyệt',
      agree: 'Đã phê duyệt',
      refuse: 'Không phê duyệt',
    };

    const tab = type && type in TAB_MAP ? TAB_MAP[type as keyof typeof TAB_MAP] : 'Tất cả';

    const details = `Truy cập Danh sách phê duyệt lịch họp (${tab}), trang: ${page || 1}, limit: ${limit || 50}`;
    let totalResult, rowsResult;

    try {
      const totalRequest = pool.request()
        .input('userId', userId);

      const rowsRequest = pool.request()
        .input('userId', userId);

      [totalResult, rowsResult] = await Promise.all([
        totalRequest.query(totalSql),
        rowsRequest.query(rowsSql),
      ]);

      const total = totalResult.recordset[0]?.total ?? 0;
      const items = rowsResult.recordset;

      if (!items.length) { return { success: true, items: [], message: 'Không có dữ liệu', total: 0, page: pageNum, limit: limitNum, totalPages: 0, }; }

      // ===== ACTION =====
      let isParticipant = isAgree ? 'NO_ACTION_APPROVER' : 'APPROVER_MEETING';
      if (isAgreeMe) isParticipant = 'NO_ACTION_APPROVER';

      const bpmnVersion = items[0]?.bpmn_version;
      let process = null;
      let indexes = null;

      if (bpmnVersion) {
        const model = await this.getBpmnModelCached(bpmnVersion);
        if (model) {
          process = model.process;
          indexes = model.indexes;
        }
      }

      const bpmnEngineMap = new Map([
        [bpmnVersion, { process, indexes }],
      ]);

      // 🚀 batch (tối ưu memory + DB)
      const itemsMapAction = await this.mapAvailableActionsBatch(
        items,
        userContext,
        bpmnEngineMap,
        isParticipant
      );
      const detailItems = await this.mapDocKeyMeeting(itemsMapAction, aliases, authority, userContext, isParticipant, undefined, isExport);
      this.logAsync(req, userId, details, 'SUCCESS');

      return {
        success: true,
        items: detailItems,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };

    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi truy vấn dữ liệu lịch họp');
    }
  }

  // Cần xử lý
  async listProcessSchedule(
    query: CreateMeetingDto,
    userId: string,
    authorId?: string,
    req?: any
  ) {
    const { type, page = 1, limit = 20, filter, sort, processFn, authority, isExport } = query;
    if (!this.dbname) {
      this.dbname = this.getDatabaseName();
    }
    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const [pool, userRoleRes] = await Promise.all([
      this.getPool(),
      this.userService.getUserRole(userId, this.processKey),
    ]);
    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    const { roles } = userRoleRes;
    const receiverUnit = await this.getUserReceiverUnit(userId);
    const userContext = { userId, roles, receiverUnit };
    const leaderUserIds = Array.from(this.leaderUserIdSet);

    if (!receiverUnit) {
      throw new BadRequestException('User chưa thuộc đơn vị');
    }

    const criteria = this.buildCriteria(filter);

    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, joins: filterJoins, from } = buildMeetingCriteriaHelper([...featureCriteria, ...criteria], 'meetings', featureManagement);

    const MEETING_TYPES = ['waiting', 'processing', 'processed'] as const;
    if (!type || !MEETING_TYPES.includes(type as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: MEETING_TYPES,
      });
    }

    const isWaiting = type === 'waiting';
    const isProcessing = type === 'processing';
    const isProcessed = type === 'processed';

    const where: string[] = [];
    where.push(`${from}.status = '1'`);
    // Chỉ hiển thị instance thực tế, không hiển thị bản template (lịch gốc lặp)
    where.push(`(${from}.is_template = 0 OR ${from}.is_template IS NULL)`);

    let joinClause = filterJoins || '';

    joinClause += `
      INNER JOIN ${this.dbname}.meeting_units mu
        ON mu.meeting_id = ${from}.id
        AND (
          mu.unit_id = '${receiverUnit}'
          OR (
            mu.unit_id = 'SECRETARY_UNIT'
            AND ${from}.secretary_type = '${ParticipantType.UNIT}'
            AND ${from}.secretary_id = '${receiverUnit}'
            AND NOT EXISTS (
              SELECT 1
              FROM ${this.dbname}.meeting_units mu2
              WHERE mu2.meeting_id = ${from}.id
                AND mu2.unit_id = '${receiverUnit}'
            )
          )
        )
    `;

    if (isWaiting) {
      where.push(`mu.unit_state = '${MEETING_UNIT_STATE.RECEIVED}'`);
    }

    if (isProcessing) {
      where.push(`mu.unit_state IN ('${MEETING_UNIT_STATE.PROCESSING}', '${MEETING_UNIT_STATE.CONFIRMED}')`);
    }

    if (isProcessed) {
      where.push(
        `mu.unit_state IN ('${MEETING_UNIT_STATE.DONE}', '${MEETING_UNIT_STATE.COMPLETED}')`,
      );
    }

    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const whereClause = ' WHERE ' + where.join(' AND ');

    const limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;

    const { dbKeys, aliases, allFilterFields } = await this.configurationService.buildFilterFieldsMeetings(from, [], processFn);
    const aliasFields = [
      'unitGuest',
      'seatAssignment',
      'leaderState',
      'participatingComponents',
      'documentPrepared',
      'participationRole',
      'delegatedFromUser',
      'meetingDuration',
    ];

    aliasFields.forEach((f) => {
      const snake = f.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allFilterFields.includes(f) || allFilterFields.includes(snake)) {
        aliases[f] = f;
      }
    });
    const selectFields = dbKeys.join(', ');
    const customSortColumns = buildMeetingCustomSortColumns(from, leaderUserIds);
    const orderBy = ' ORDER BY ' + parseSortMeeting(sort, aliases, from, customSortColumns);

    const totalSql = ` SELECT COUNT(DISTINCT ${from}.id) AS total FROM ${this.dbname}.${from} ${joinClause} ${whereClause} `;

    const rowsSql = ` SELECT ${selectFields} FROM ${this.dbname}.${from} ${joinClause} ${whereClause} ${orderBy} OFFSET ${offsetNum} ROWS FETCH NEXT ${limitNum} ROWS ONLY `;

    // this.logger.debug('[MEETING PROCESS] TOTAL SQL:', totalSql);
    // this.logger.debug('[MEETING PROCESS] ROWS SQL:', rowsSql);

    const TAB_MAP = {
      waiting: 'Chờ xử lý',
      processing: 'Đang xử lý',
      processed: 'Đã xử lý',
    } as const;

    const tab = type && type in TAB_MAP ? TAB_MAP[type as keyof typeof TAB_MAP] : 'Tất cả';
    const details = `Truy cập Lịch cần xử lý (Văn thư đơn vị - ${tab}), trang: ${page}, limit: ${limit}`;

    let totalResult, rowsResult;

    try {
      const totalRequest = pool.request()
        .input('userId', userId);

      const rowsRequest = pool.request()
        .input('userId', userId);

      [totalResult, rowsResult] = await Promise.all([
        totalRequest.query(totalSql),
        rowsRequest.query(rowsSql),
      ]);

      const total = totalResult.recordset[0]?.total ?? 0;
      const items = rowsResult.recordset;

      if (!items.length) { return { success: true, items: [], message: 'Không có dữ liệu', total: 0, page: pageNum, limit: limitNum, totalPages: 0, }; }

      const isParticipant = 'PROCESS_MEETING';

      const bpmnVersion = items[0]?.bpmn_version;
      let process = null;
      let indexes = null;

      if (bpmnVersion) {
        const model = await this.getBpmnModelCached(bpmnVersion);
        if (model) {
          process = model.process;
          indexes = model.indexes;
        }
      }

      const bpmnEngineMap = new Map([
        [bpmnVersion, { process, indexes, userParent: receiverUnit, }],
      ]);

      const itemsMapAction = await this.mapAvailableActionsBatch(
        items,
        userContext,
        bpmnEngineMap,
        isParticipant
      );
      const detailItems = await this.mapDocKeyMeeting(itemsMapAction, aliases, authority, userContext, isParticipant, undefined, isExport);
      this.logAsync(req, userId, details, 'SUCCESS');

      return {
        success: true,
        items: detailItems,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };
    } catch (e) {
      this.logAsync(req, userId, details, 'ERROR');
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi truy vấn dữ liệu lịch họp');
    }
  }

  async seatAssignmentList(
    query: CreateMeetingDto,
    userId: string,
    authorId?: string,
    req?: any
  ) {
    const { type, page = 1, limit = 20, filter, sort, processFn, authority, isExport } = query;

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const [pool, userRoleRes] = await Promise.all([
      this.getPool(),
      this.userService.getUserRole(userId, this.processKey),
    ]);
    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    const { roles } = userRoleRes;
    const receiverUnit = await this.getUserReceiverUnit(userId);
    const userContext = { userId, roles, receiverUnit };
    const leaderUserIds = Array.from(this.leaderUserIdSet);

    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];
    const { sql: filterFeature, joins: filterJoins, from } = buildMeetingCriteriaHelper([...featureCriteria, ...criteria], 'meetings', featureManagement, leaderUserIds);

    const MEETING_TYPES = ['waiting', 'processing', 'complete'] as const;
    if (!type || !MEETING_TYPES.includes(type as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: MEETING_TYPES,
      });
    }

    const where: string[] = [];
    where.push(`${from}.status = '1'`);
    // Chỉ hiển thị instance thực tế, không hiển thị bản template (lịch gốc lặp)
    where.push(`(${from}.is_template = 0 OR ${from}.is_template IS NULL)`);

    if (type === 'waiting') {
      where.push(`${from}.assigned_seat_by IS NULL`);
      where.push(`${from}.is_assigning_seat = '${ASSIGNING_SEAT_STATUS.RECEIVED}'`);
    }

    if (type === 'processing') {
      where.push(`${from}.assigned_seat_by IS NOT NULL`);
      where.push(`${from}.is_assigning_seat = '${ASSIGNING_SEAT_STATUS.ASSIGNING}'`);
    }

    if (type === 'complete') {
      where.push(`${from}.is_assigning_seat = '${ASSIGNING_SEAT_STATUS.ASSIGNED}'`);
    }

    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }
    const joinClause = filterJoins || '';
    where.push(`is_company = 1`);
    where.push(`meeting_mode != 'ONLINE'`);
    const whereClause = ' WHERE ' + where.join(' AND ');

    const limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;

    const { dbKeys, aliases, allFilterFields } = await this.configurationService.buildFilterFieldsMeetings(from, [], processFn);
    const aliasFields = [
      'unitGuest',
      'seatAssignment',
      'leaderState',
      'participatingComponents',
      'documentPrepared',
      'participationRole',
      'delegatedFromUser',
      'meetingDuration',
    ];

    aliasFields.forEach((f) => {
      const snake = f.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allFilterFields.includes(f) || allFilterFields.includes(snake)) {
        aliases[f] = f;
      }
    });
    const selectFields = dbKeys.join(', ');
    const customSortColumns = buildMeetingCustomSortColumns(from, leaderUserIds);
    const orderBy = ' ORDER BY ' + parseSortMeeting(sort, aliases, from, customSortColumns);

    const totalSql = ` SELECT COUNT(DISTINCT ${from}.id) AS total FROM ${this.dbname}.${from} ${joinClause} ${whereClause} `;
    const rowsSql = `
      SELECT ${selectFields}
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
      ${orderBy}
      OFFSET ${offsetNum} ROWS FETCH NEXT ${limitNum} ROWS ONLY
    `;

    // this.logger.debug('[MEETING PROCESS] TOTAL SQL:', totalSql);
    // this.logger.debug('[MEETING PROCESS] ROWS SQL:', rowsSql);

    const TAB_MAP = {
      waiting: 'Chờ xử lý',
      processing: 'Đang xử lý',
      complete: 'Hoàn thành xử lý',
    } as const;

    const tab = type && type in TAB_MAP ? TAB_MAP[type as keyof typeof TAB_MAP] : 'Tất cả';

    const details = `Truy cập Danh sách Lịch họp cần gán vị trí (${tab}), trang: ${page}, limit: ${limit}`;


    let totalResult, rowsResult;

    try {
      const totalRequest = pool.request()
        .input('userId', userId);

      const rowsRequest = pool.request()
        .input('userId', userId);

      [totalResult, rowsResult] = await Promise.all([
        totalRequest.query(totalSql),
        rowsRequest.query(rowsSql),
      ]);

      const total = totalResult.recordset[0]?.total ?? 0;
      const items = rowsResult.recordset;

      if (!items.length) {
        return {
          success: true,
          items: [],
          message: 'Không có dữ liệu',
          total: 0,
          page: pageNum,
          limit: limitNum,
          totalPages: 0,
        };
      }

      const isParticipant = 'SEAT_ASSIGNMENT_MEETING';

      const bpmnVersion = items[0]?.bpmn_version;
      let process = null;
      let indexes = null;

      if (bpmnVersion) {
        const model = await this.getBpmnModelCached(bpmnVersion);
        if (model) {
          process = model.process;
          indexes = model.indexes;
        }
      }

      const bpmnEngineMap = new Map([
        [bpmnVersion, { process, indexes, userParent: receiverUnit, }],
      ]);

      // const itemsMapAction = await this.mapAvailableActionsBatch(
      //   items,
      //   userContext,
      //   bpmnEngineMap,
      //   isParticipant
      // );
      const detailItems = await this.mapDocKeyMeeting(items, aliases, authority, userContext, isParticipant, undefined, isExport);
      this.logAsync(req, userId, details, 'SUCCESS');

      return {
        success: true,
        items: detailItems,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };
    } catch (e) {
      this.logAsync(req, userId, details, 'ERROR');
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi truy vấn dữ liệu lịch họp');
    }

  }

  async getUsersByGroupCode(code: string): Promise<string[]> {
    const group = await this.groupUserRepo.findOne({
      where: { code, status: 1 },
    });

    if (!group) return [];

    return group.userId ?? [];
  }

  // Danh sách lịch trực ban lãnh đạo
  async rosterForLeadersList(
    query: CreateMeetingDto,
    userId: string,
    authorId?: string,
    req?: any
  ) {
    const { type = 'list', page = 1, limit = 20, filter, authority, year, month, selectweek, } = query;
    const details = `Truy cập Danh sách xem lịch ban lãnh đạo, trang: ${page}, limit: ${limit}`;
    try {
      const t0 = Date.now();

      // ── Validate ──────────────────────────────────────────────────────────────
      if (!['grid', 'list'].includes(type)) {
        throw new BadRequestException({ message: 'Type không hợp lệ', allowedTypes: ['grid', 'list'] });
      }
      if (authority === 'true' && authorId) userId = authorId;

      const limitNum = Math.min(Number(limit) || 20, 100);
      const pageNum = Math.max(Number(page) || 1, 1);
      const offsetNum = (pageNum - 1) * limitNum;

      // ── Init: pool + feature config + user roles (song song) ───────────────────
      const [pool, featureManagement, userRoleRes] = await Promise.all([
        this.getPool(),
        this.featureManagementRepo.findOne({
          where: { code: query.processFn, status: 1, statusFeature: StatusFeature.ACTIVE },
        }),
        this.userService.getUserRole(userId, this.processKey || 'QUY_TRINH_LICH_HOP'),
      ]);

      const isMeetingRoomManager = userRoleRes?.roles?.includes('BAN_QUAN_LY_PHONG_HOP') || false;

      // ── leaderUserIds từ group code (dùng chung grid + list) ──────────────────
      const featureCriteriaRaw = featureManagement?.criteria ?? [];
      const groupCode = featureCriteriaRaw.find((c) => c.name === 'code' && c.value)?.value ?? 'BANLANHDAO';
      const leaderUserIds: string[] = await this.getUsersByGroupCode(groupCode);
      const leaderUserIdSet = new Set(
        leaderUserIds.map((id) => String(id ?? '').trim()).filter(Boolean),
      );


      // =========================================================================
      //  GRID PATH
      // =========================================================================
      if (type === 'grid') {

        const mapPosition = (pos: string | null | undefined): string => {
          if (!pos) return '';
          const MAP: Record<string, string> = {
            Admin: 'Quản trị hệ thống',
            Vanthu: 'Văn thư',
            Giamdoc: 'Giám đốc',
            Phogiamdoc: 'Phó giám đốc',
            Truongphong: 'Trưởng phòng',
            Photruongphong: 'Phó trưởng phòng',
            Canbo: 'Cán bộ',
          };
          return MAP[String(pos)] ?? '';
        }

        const mapDayOfWeekVi = (day: string | null | undefined): string => {
          const map: Record<string, string> = {
            monday: 'Thứ Hai',
            tuesday: 'Thứ Ba',
            wednesday: 'Thứ Tư',
            thursday: 'Thứ Năm',
            friday: 'Thứ Sáu',
            saturday: 'Thứ Bảy',
            sunday: 'Chủ Nhật',
          };
          if (!day) return '';
          return map[String(day).toLowerCase()] ?? String(day);
        };

        const parseParticipantList = (raw: string | null | undefined): string[] => {
          if (!raw) return [];
          return String(raw)
            .split(';')
            .map((s) => s.trim())
            .filter(Boolean);
        };

        const parseParticipantIds = (raw: string | null | undefined): string[] => {
          if (!raw) return [];
          return String(raw)
            .split(';')
            .map((s) => s.trim())
            .filter(Boolean);
        };
        const resolveDutyLeaderTitle = (raw: string | null | undefined): string | null => {
          if (!raw) return null;
          const normalizedRaw = String(raw).trim();
          if (!normalizedRaw) return null;
          const mapped = mapPosition(normalizedRaw);
          return mapped || normalizedRaw;
        };

        // ── 1. Tính khoảng tuần ISO ───────────────────────────────────────────
        let weekStart: dayjs.Dayjs | null = null;
        let weekEnd: dayjs.Dayjs | null = null;

        if (year && selectweek) {
          weekStart = dayjs(`${Number(year)}-01-04`).tz('Asia/Ho_Chi_Minh')
            .startOf('isoWeek').add(Number(selectweek) - 1, 'week');
          weekEnd = weekStart.endOf('isoWeek');
        }

        // ── 2. Query duty schedule + meetings + travels song song ─────────────
        const tDQ = Date.now();

        const dutySql = (selectweek && year) ? `
          SELECT CONVERT(varchar(10), ldd.duty_date, 23) AS duty_date, ldd.day_of_week, ldd.leader_id
          FROM   ${this.dbname}.leadership_duty_schedules lds
          JOIN   ${this.dbname}.leadership_duty_details   ldd
                ON  ldd.schedule_id = lds.id AND ldd.status = 1
          WHERE  lds.week = ${Number(selectweek)}
            AND  lds.[year] = ${Number(year)}
            AND  lds.status = 1
          ORDER BY ldd.duty_date ASC
        ` : null;

        const meetingWhere: string[] = [`m.status = '1'`, `m.stage_status = '${stageStatusDoc.DONG_Y_PHE_DUYET}'`];
        if (leaderUserIds.length) {
          const leaderIdsSql = leaderUserIds.map((id) => `'${id}'`).join(',');
          meetingWhere.push(`(m.chairman_id IN (${leaderIdsSql}) OR mp.user_id IN (${leaderIdsSql}))`);
        } else {
          meetingWhere.push(`1 = 0`);
        }
        if (weekStart && weekEnd) {
          meetingWhere.push(
            `m.meeting_date >= '${weekStart.format('YYYY-MM-DD')}'`,
            `m.meeting_date <= '${weekEnd.format('YYYY-MM-DD')}'`,
          );
        }

        const meetingSql = (leaderUserIds.length && weekStart && weekEnd) ? `
          SELECT DISTINCT
            m.id,
            m.meeting_state,
            m.meeting_date,
            CONVERT(varchar(10), m.meeting_date, 23) AS meeting_date_key,
            m.meeting_time, m.timezone,
            m.title, m.content, m.room_ids, m.chairman_id,
            ISNULL(u_chair.name, m.chairman_id) AS chairman_name,
            ISNULL(u_chair.position, m.chairman_id) AS position,
            (
              SELECT STRING_AGG(ISNULL(u2.name, mu2.unit_id), '; ')
                FROM   ${this.dbname}.meeting_units mu2
                LEFT JOIN ${this.dbname}.organization_units u2 ON u2.id = mu2.unit_id
                WHERE  mu2.meeting_id = m.id
                  AND  mu2.unit_id NOT IN ('CHAIRMAN_UNIT', 'SECRETARY_UNIT')
            ) AS participating_names,
            (
              SELECT STRING_AGG(CAST(mp2.user_id AS nvarchar(255)), '; ')
              FROM   ${this.dbname}.meeting_units mu2
              JOIN   ${this.dbname}.meeting_participants mp2 ON mp2.meeting_unit_id = mu2.id
              WHERE  mu2.meeting_id = m.id
                AND  LTRIM(RTRIM(ISNULL(mp2.user_id, ''))) <> ''
                AND  UPPER(LTRIM(RTRIM(ISNULL(mp2.user_id, '')))) <> 'UNIT'
            ) AS participant_user_ids
          FROM   ${this.dbname}.meetings m
          LEFT JOIN ${this.dbname}.meeting_units        mu ON mu.meeting_id      = m.id
          LEFT JOIN ${this.dbname}.meeting_participants mp ON mp.meeting_unit_id = mu.id
          LEFT JOIN ${this.dbname}.users u_chair         ON u_chair.id        = m.chairman_id
          WHERE (${meetingWhere.join(' AND ')})
            AND (m.meeting_state IS NULL OR UPPER(LTRIM(RTRIM(m.meeting_state))) <> 'DA_HUY')
        ` : null;

        const travelSql = (weekStart && weekEnd && leaderUserIds.length) ? `
          SELECT
            tws.id, tws.leader,
            ISNULL(u.name, tws.leader) AS leader_name,
            ISNULL(u.position, tws.leader) AS position,
            tws.schedule_type, tws.calendar_format,
            tws.work_date,
            CONVERT(varchar(10), tws.work_date, 23) AS work_date_key,
            tws.from_date,
            CONVERT(varchar(10), tws.from_date, 23) AS from_date_key,
            tws.to_date,
            CONVERT(varchar(10), tws.to_date, 23) AS to_date_key,
            tws.location, tws.content,
            tws.morning_location, tws.morning_content,
            tws.afternoon_location, tws.afternoon_content
          FROM   ${this.dbname}.travel_work_schedules tws
          LEFT JOIN ${this.dbname}.users u ON u.id = tws.leader
          WHERE  tws.status = '1'
            AND  tws.leader IN (${leaderUserIds.map((id) => `'${id}'`).join(',')})
            AND  (
              (tws.schedule_type = 'singleDay'
                AND tws.work_date >= '${weekStart!.format('YYYY-MM-DD')}'
                AND tws.work_date <= '${weekEnd!.format('YYYY-MM-DD')}')
              OR
              (tws.schedule_type = 'multiDay'
                AND tws.from_date <= '${weekEnd!.format('YYYY-MM-DD')}'
                AND tws.to_date   >= '${weekStart!.format('YYYY-MM-DD')}')
            )
        ` : null;

        const [dutyResult, meetingResult, travelResult] = await Promise.all([
          dutySql ? pool.request().query(dutySql) : Promise.resolve({ recordset: [] }),
          meetingSql ? pool.request().query(meetingSql) : Promise.resolve({ recordset: [] }),
          travelSql ? pool.request().query(travelSql) : Promise.resolve({ recordset: [] }),
        ]);


        // ── 3. Build duty map: dow → leader_id ───────────────────────────────
        const dutyLeaderByDate: Record<string, string> = {};
        const dutyLeaderByDowIso: Record<number, string> = {};
        const dutyLeaderByDowLegacyConverted: Record<number, string> = {};

        // Sắp xếp leader theo thứ tự trực trong tuần
        const dutyOrderIds: string[] = [];
        for (const row of dutyResult.recordset) {
          const dutyDate = String(row.duty_date ?? '').slice(0, 10).trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(dutyDate)) {
            dutyLeaderByDate[dutyDate] = row.leader_id;
          }

          if (row.leader_id && !dutyOrderIds.includes(row.leader_id)) {
            dutyOrderIds.push(row.leader_id);
          }

          const dayRaw = Number(row.day_of_week);
          if (Number.isFinite(dayRaw) && dayRaw >= 1 && dayRaw <= 7 && row.leader_id) {
            dutyLeaderByDowIso[dayRaw] = row.leader_id;
            const isoDow = dayRaw === 1 ? 7 : dayRaw - 1;
            dutyLeaderByDowLegacyConverted[isoDow] = row.leader_id;
          }
        }

        // Tạo danh sách leader đầy đủ, ưu tiên theo lịch trực
        const allSortedLeaderIds = [...dutyOrderIds];
        for (const id of leaderUserIds) {
          if (id && !allSortedLeaderIds.includes(id)) {
            allSortedLeaderIds.push(id);
          }
        }

        const leaderOrderMap = new Map<string, number>();
        allSortedLeaderIds.forEach((id, index) => leaderOrderMap.set(id, index));

        // ── 4. Fetch user info cho duty leaders ──────────────────────────────
        const allIdsToFetch = [...new Set([...dutyOrderIds, ...leaderUserIds])].filter(Boolean);
        const dutyUserMap: Record<string, { name: string, id: string, position?: string }> = {};
        const idMap: Record<string, string> = {}; // Maps any identifier (id or username) to the UUID

        if (allIdsToFetch.length) {
          const userRs = await pool.request().query(`
            SELECT id, name, position, username
            FROM   ${this.dbname}.users
            WHERE  id       IN (${allIdsToFetch.map((id) => `'${id}'`).join(',')})
               OR  username IN (${allIdsToFetch.map((id) => `'${id}'`).join(',')})
          `);
          userRs.recordset.forEach((u: any) => {
            const userObj = { id: u.id, name: u.name, position: u.position };
            dutyUserMap[u.id] = userObj;
            idMap[u.id] = u.id;
            if (u.username) idMap[u.username] = u.id;
          });
        }

        // Đảm bảo các map duty leader đều lưu UUID
        const normalizeMap = (map: Record<any, string>) => {
          for (const key in map) {
            const rawId = map[key];
            if (idMap[rawId]) map[key] = idMap[rawId];
          }
        };
        normalizeMap(dutyLeaderByDate);
        normalizeMap(dutyLeaderByDowIso);
        normalizeMap(dutyLeaderByDowLegacyConverted);

        // ── 5. Batch fetch room names ─────────────────────────────────────────
        const tRoom = Date.now();
        const allRoomIds = new Set<string>();

        for (const row of meetingResult.recordset) {
          if (!row.room_ids) continue;
          try {
            const ids: string[] = Array.isArray(row.room_ids) ? row.room_ids : JSON.parse(row.room_ids);
            ids.forEach((id) => id && allRoomIds.add(String(id).trim()));
          } catch {
            String(row.room_ids).split(',').forEach((id) => id.trim() && allRoomIds.add(id.trim()));
          }
        }

        let roomNameMap: Record<string, string> = {};
        if (allRoomIds.size) {
          const roomRs = await pool.request().query(`
            SELECT id, name FROM ${this.dbname}.meeting_rooms
            WHERE id IN (${[...allRoomIds].map((id) => `'${id}'`).join(',')})
          `);
          roomNameMap = Object.fromEntries(roomRs.recordset.map((r: any) => [String(r.id), r.name]));
        }


        // Helper: room_ids → tên phòng, nối bởi ' ; '
        const resolveRooms = (raw: any): string => {
          if (!raw) return '';
          let ids: string[] = [];
          try { ids = Array.isArray(raw) ? raw : JSON.parse(raw); }
          catch { ids = String(raw).split(',').map((s) => s.trim()); }
          return ids.map((id) => roomNameMap[String(id).trim()] ?? id).filter(Boolean).join(' ; ');
        };

        // ── 6. Build 7-day skeleton ───────────────────────────────────────────
        type DaySlot = {
          date: string; dayOfWeek: string; dow: number;
          userId: string | null; userName: string | null; userTitle: string | null;
          rows: any[]; travelRows: any[];
        };
        const grouped: Record<string, DaySlot> = {};

        if (weekStart && weekEnd) {
          let cursor = weekStart;
          while (cursor.isBefore(weekEnd) || cursor.isSame(weekEnd, 'day')) {
            const dateStr = cursor.format('YYYY-MM-DD');
            const dow = cursor.isoWeekday();
            const leaderId =
              dutyLeaderByDate[dateStr] ??
              dutyLeaderByDowLegacyConverted[dow] ??
              dutyLeaderByDowIso[dow] ??
              null;
            const info = leaderId ? dutyUserMap[leaderId] : null;
            const name = leaderId ? (info?.name?.trim() || leaderId) : null;
            const title = leaderId ? resolveDutyLeaderTitle(info?.position) : null;

            grouped[dateStr] = {
              date: dateStr, dayOfWeek: cursor.format('dddd'), dow,
              userId: leaderId,
              userName: leaderId ? name : null,
              userTitle: leaderId ? title : null,
              rows: [], travelRows: [],
            };
            cursor = cursor.add(1, 'day');
          }
        }

        // ── 7. Distribute meeting rows ────────────────────────────────────────
        for (const row of meetingResult.recordset) {
          const dateStr = String(row.meeting_date_key ?? '').slice(0, 10);
          const slot = grouped[dateStr];
          if (slot) slot.rows.push(row);
        }

        // ── 8. Distribute travel rows ─────────────────────────────────────────
        for (const row of travelResult.recordset) {
          if (row.schedule_type === 'singleDay') {
            const dateStr = String(row.work_date_key ?? '').slice(0, 10);
            const slot = grouped[dateStr];
            if (slot) slot.travelRows.push(row);

          } else if (row.schedule_type === 'multiDay') {
            const rowStart = dayjs(String(row.from_date_key ?? '').slice(0, 10));
            const rowEnd = dayjs(String(row.to_date_key ?? '').slice(0, 10));
            const rangeStart = rowStart.isAfter(weekStart!) ? rowStart : weekStart!;
            const rangeEnd = rowEnd.isBefore(weekEnd!) ? rowEnd : weekEnd!;

            let cursor = rangeStart;
            while (cursor.isBefore(rangeEnd) || cursor.isSame(rangeEnd, 'day')) {
              const slot = grouped[cursor.format('YYYY-MM-DD')];
              if (slot) slot.travelRows.push(row);
              cursor = cursor.add(1, 'day');
            }
          }
        }

        // ── 9. Map → unified data[], sort by time ─────────────────────────────
        const fallbackCandidateDays = Object.values(grouped).filter((s) => !s.userId).length;
        let fallbackDaysWithData = 0;
        let fallbackRows = 0;

        const itemsArray = Object.values(grouped)
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((slot) => {
            const isAssignedDay = Boolean(slot.userId);

            const meetings = slot.rows
              .filter((m: any) => {
                const chairmanId = (m?.chairman_id ?? '').toString().trim();
                const participantUserIds = parseParticipantIds(m?.participant_user_ids);
                return leaderUserIdSet.has(chairmanId) || participantUserIds.some((id) => leaderUserIdSet.has(id));
              })
              .map((m: any) => {
                const posLabel = mapPosition(m.position);
                const time =
                  m?.meeting_time && typeof m.meeting_time === 'string'
                    ? m.meeting_time.split('-')[0].trim()
                    : null;
                const chairmanName = m.chairman_name ?? m.chairman_id ?? null;
                const chairmanTitle = posLabel || null;
                const participantRaw = m.participating_names ?? null;
                const participantList = parseParticipantList(participantRaw);
                return {
                  id: isMeetingRoomManager ? m.id : undefined,
                  meetingId: isMeetingRoomManager ? m.id : undefined,
                  meetingStateCode: m.meeting_state ?? null,
                  meetingState: mapActionToLabel(m.meeting_state) ?? null,
                  type: 'meeting',
                  time: time,
                  timeDisplay: time,
                  title: m.title ?? null,
                  content: m.content ?? null,
                  leader: m.chairman_name
                    ? (posLabel ? `${m.chairman_name} - ${posLabel}` : m.chairman_name)
                    : m.chairman_id ?? null,
                  chairman: chairmanName ? {
                    id: m.chairman_id ?? undefined,
                    name: chairmanName,
                    title: chairmanTitle ?? undefined,
                  } : null,
                  location: resolveRooms(m.room_ids),
                  participant: participantRaw,
                  participantList,
                };
              });

            const travels: any[] = [];
            for (const t of slot.travelRows) {
              const travelLeaderId = String(t.leader ?? '').trim();
              const shouldKeepTravel = leaderUserIdSet.has(travelLeaderId);
              if (!shouldKeepTravel) {
                continue;
              }
              if (t.schedule_type === 'multiDay') continue;

              const posLabel = mapPosition(t.position);
              const base = {
                id: t.id,
                type: 'travel',
                leader: t.leader_name
                  ? (posLabel ? `${t.leader_name} - ${posLabel}` : t.leader_name)
                  : t.leader ?? null,
                chairman: (t.leader_name || t.leader) ? {
                  id: t.leader ?? undefined,
                  name: t.leader_name ?? t.leader,
                  title: posLabel || undefined,
                } : null,
                participant: null,
                participantList: [] as string[],
              };

              if (t.calendar_format === 'fullDay') {
                const location = t.location ?? null;
                const content = t.content ?? null;

                if (location || content) {
                  travels.push({
                    ...base,
                    time: '06:00',
                    timeDisplay: '06:00',
                    title: content,
                    location,
                    content,
                  });
                }

              } else if (t.calendar_format === 'session') {
                const morningLocation = t.morning_location ?? null;
                const morningContent = t.morning_content ?? null;

                if (morningLocation || morningContent) {
                  travels.push({
                    ...base,
                    time: '06:00',
                    timeDisplay: '06:00',
                    title: morningContent,
                    location: morningLocation,
                    content: morningContent,
                  });
                }

                const afternoonLocation = t.afternoon_location ?? null;
                const afternoonContent = t.afternoon_content ?? null;

                if (afternoonLocation || afternoonContent) {
                  travels.push({
                    ...base,
                    time: '13:00',
                    timeDisplay: '13:00',
                    title: afternoonContent,
                    location: afternoonLocation,
                    content: afternoonContent,
                  });
                }
              }
            }

            const data = [...meetings, ...travels].sort((a, b) => {
              const timeA = (a.time ?? '').split(' - ')[0].trim();
              const timeB = (b.time ?? '').split(' - ')[0].trim();

              if (timeA !== timeB) {
                return timeA.localeCompare(timeB);
              }

              const orderA = leaderOrderMap.get(a.chairman?.id) ?? 999;
              const orderB = leaderOrderMap.get(b.chairman?.id) ?? 999;

              return orderA - orderB;
            });
            if (!isAssignedDay && data.length > 0) {
              fallbackDaysWithData += 1;
              fallbackRows += data.length;
            }

            return {
              date: slot.date,
              dayOfWeek: slot.dayOfWeek,
              dayOfWeekVi: mapDayOfWeekVi(slot.dayOfWeek),
              userId: slot.userId,
              userName: slot.userName,
              leaderPosition: slot.userTitle ?? null,
              dutyLeader: slot.userId
                ? { id: slot.userId, name: slot.userName, title: slot.userTitle ?? undefined, avatarUrl: undefined }
                : null,
              isAssigned: Boolean(slot.userId),
              data,
            };
          });
        if (fallbackCandidateDays > 0) {
        }

        const totalMeetings = itemsArray.reduce((sum, slot) => {
          if (!slot || !Array.isArray(slot.data)) return sum;
          return sum + slot.data.length;
        }, 0);

        return {
          success: true,
          items: itemsArray,
          total: totalMeetings,
          page: pageNum, limit: limitNum,
          totalPages: Math.ceil(itemsArray.length / limitNum),
          weekStart: weekStart?.format('YYYY-MM-DD') ?? null,
          weekEnd: weekEnd?.format('YYYY-MM-DD') ?? null,
          leaders: allSortedLeaderIds.map(id => {
            const u = dutyUserMap[id];
            return {
              id: id,
              name: u?.name || id,
              position: u?.position || '',
              positionLabel: mapPosition(u?.position)
            };
          })
        };
      }

      // =========================================================================
      //  LIST PATH
      // =========================================================================

      // ── 1. Query meeting rows ─────────────────────────────────────────────────
      const tList = Date.now();

      const listWhere: string[] = [`m.status = '1'`, `m.stage_status = '${stageStatusDoc.DONG_Y_PHE_DUYET}'`];
      if (leaderUserIds.length) {
        listWhere.push(`mp.user_id IN (${leaderUserIds.map((id) => `'${id}'`).join(',')})`);
      }

      const listResult = await pool.request().query(`
        SELECT DISTINCT m.id, m.meeting_date, m.updated_at
        FROM   ${this.dbname}.meetings m
        JOIN   ${this.dbname}.meeting_units        mu ON mu.meeting_id      = m.id
        JOIN   ${this.dbname}.meeting_participants mp ON mp.meeting_unit_id = mu.id
        WHERE  ${listWhere.join(' AND ')}
      `);


      // ── 2. Build tuần skeleton theo year / month ──────────────────────────────
      const weeks: Record<string, any> = {};
      const toWeekKey = (d: dayjs.Dayjs) => `${d.isoWeekYear()}-W${d.isoWeek()}`;

      if (year) {
        const y = Number(year);

        if (!month) {
          // Skeleton cả năm
          let cursor = dayjs(`${y}-01-01`).startOf('isoWeek');
          const end = dayjs(`${y}-12-31`).endOf('isoWeek');
          while (cursor.isBefore(end) || cursor.isSame(end, 'isoWeek')) {
            const key = toWeekKey(cursor);
            if (!weeks[key]) weeks[key] = {
              meetingWeek: `Tuần ${cursor.isoWeek()}`, meetingYear: cursor.isoWeekYear(),
              meetingFrom: cursor.startOf('isoWeek').format('YYYY-MM-DD'),
              meetingTo: cursor.endOf('isoWeek').format('YYYY-MM-DD'),
              meetingUpdate: null, meetingTimeUpdate: null, count: 0, ids: [],
            };
            cursor = cursor.add(1, 'week');
          }

        } else {
          // Skeleton theo tháng
          const m = Number(month);
          let cursor = dayjs(`${y}-${m}-01`).startOf('isoWeek');
          const end = dayjs(`${y}-${m}-01`).endOf('month').endOf('isoWeek');
          while (cursor.isBefore(end) || cursor.isSame(end, 'isoWeek')) {
            const key = toWeekKey(cursor);
            if (!weeks[key]) weeks[key] = {
              meetingWeek: `Tuần ${cursor.isoWeek()}`, meetingYear: cursor.isoWeekYear(),
              meetingFrom: cursor.startOf('isoWeek').format('YYYY-MM-DD'),
              meetingTo: cursor.endOf('isoWeek').format('YYYY-MM-DD'),
              meetingUpdate: null, meetingTimeUpdate: null, count: 0, ids: [], id: 0,
            };
            cursor = cursor.add(1, 'week');
          }
        }
      }

      // ── 3. Fill data vào skeleton ─────────────────────────────────────────────
      for (const r of listResult.recordset) {
        const d = dayjs(r.meeting_date);
        if (year && d.year() !== Number(year)) continue;
        if (month && d.month() + 1 !== Number(month)) continue;

        const key = toWeekKey(d);
        const updated = dayjs(r.updated_at);

        if (!weeks[key]) {
          weeks[key] = {
            meetingWeek: `Tuần ${d.isoWeek()}`, meetingYear: d.isoWeekYear(),
            meetingFrom: d.startOf('isoWeek').format('YYYY-MM-DD'),
            meetingTo: d.endOf('isoWeek').format('YYYY-MM-DD'),
            meetingUpdate: null, meetingTimeUpdate: null, count: 0, ids: [], id: 0,
          };
        }

        weeks[key].count++;
        weeks[key].ids.push(r.id);

        if (!weeks[key].meetingUpdate || updated.isAfter(weeks[key].meetingUpdate)) {
          weeks[key].meetingUpdate = updated.format('YYYY-MM-DD');
          weeks[key].meetingTimeUpdate = updated.format('HH:mm:ss');
        }
      }

      // ── 4. Sort + index + paginate ────────────────────────────────────────────
      const allWeeks = Object.values(weeks).sort(
        (a: any, b: any) => dayjs(b.meetingFrom).valueOf() - dayjs(a.meetingFrom).valueOf(),
      );
      allWeeks.forEach((w: any, i) => { w.id = i + 1; });

      this.logAsync(req, userId, details, 'SUCCESS');

      return {
        success: true,
        items: allWeeks.slice(offsetNum, offsetNum + limitNum),
        total: allWeeks.length,
        page: pageNum, limit: limitNum,
        totalPages: Math.ceil(allWeeks.length / limitNum),
      };


    } catch (error) {
      this.logger.error(error);
      this.logAsync(req, userId, details, 'ERROR');
      throw new InternalServerErrorException('Lỗi truy vấn dữ liệu lịch họp');

    }
  }

  async mapDocKeyMeeting(
    docs: any[],
    aliases: Record<string, string> = {},
    authority?: string,
    userContext?: { userId?: string; roles?: string[]; receiverUnit?: string },
    isParticipant?: string,
    type?: string,
    isExport?: string,
  ): Promise<any[]> {
    if (!Array.isArray(docs) || !docs.length) return [];
    const pool = await this.getPool();
    const allChairmanIds: string[] = [];
    const allSecretaryIds: string[] = [];
    const allOrgUnitIds: string[] = [];
    const allUserIds = new Set<string>();
    this.processKey = docs[0]?.bpmn_version || docs[0]?.bpmnVersion
    // Collect IDs
    for (const item of docs) {
      if (item.chairman_id) allUserIds.add(item.chairman_id);
      if (item.secretary_id) allUserIds.add(item.secretary_id);
      if (item.created_by) allUserIds.add(item.created_by);

      if (item.organizational_unit) {
        allOrgUnitIds.push(item.organizational_unit);
      }
    }
    const uniqueRoomIds = [
      ...new Set(
        docs.flatMap(d => (d.room_ids ? d.room_ids.split(',') : []))
      ),
    ];

    // Lấy danh sách user lãnh đạo
    const leaderUserIdSet = this.leaderUserIdSet;
    const uniqueMeetingIds = docs.map((d) => `'${d.id}'`).join(',');
    // Fetch users and rooms
    const [meetingUnits, meetingGuests, documents, delegations, rooms] =
      await Promise.all([
        pool.query(`
        SELECT meeting_id, room_id, assign_participants, unit_id, accept_join, prepare_documents, is_room_selected
        FROM ${this.dbname}.meeting_units
        WHERE meeting_id IN (${uniqueMeetingIds})
      `),

        pool.query(`
        SELECT meeting_id, COUNT(*) AS guest_count
        FROM ${this.dbname}.meeting_guests
        WHERE meeting_id IN (${uniqueMeetingIds})
        GROUP BY meeting_id
      `),

        pool.query(`
        SELECT 
          mt.meeting_id,
          mt.attachable_type,
          mt.attachable_id,
          MAX(CASE WHEN mt.attachable_type='PARTICIPANT' THEN mp.user_id END) AS participantId,
          MAX(CASE WHEN mt.attachable_type='UNIT' THEN mu.unit_id END) AS unitId,
          COUNT(*) AS total_documents,
          SUM(CASE WHEN mt.is_document_prepared = 1 THEN 1 ELSE 0 END) AS prepared_documents
        FROM ${this.dbname}.meeting_tasks mt
        LEFT JOIN ${this.dbname}.meeting_participants mp
          ON mt.attachable_type='PARTICIPANT' AND mp.id = mt.attachable_id
        LEFT JOIN ${this.dbname}.meeting_units mu
          ON mt.attachable_type='UNIT' AND mu.id = mt.attachable_id
        WHERE mt.meeting_id IN (${uniqueMeetingIds})
        GROUP BY mt.meeting_id, mt.attachable_type, mt.attachable_id
      `),

        pool.query(`
        SELECT 
          mu.meeting_id,
          mp.user_id,
          mp.delegated_to_user_id,
          mp.delegated_from_user_id
        FROM ${this.dbname}.meeting_participants mp
        INNER JOIN ${this.dbname}.meeting_units mu
          ON mp.meeting_unit_id = mu.id
        WHERE mu.meeting_id IN (${uniqueMeetingIds})
      `),

        uniqueRoomIds.length
          ? this.meetingRoomRepo.find({
            where: { id: In(uniqueRoomIds) },
            select: ['id', 'name'],
          })
          : Promise.resolve([]),
      ]);

    const roomMap = new Map(rooms.map(r => [r.id, r.name]));

    const meetingUnitsMap = meetingUnits.recordset.reduce(
      (map: Record<string, any>, unit: any) => {
        if (!map[unit.meeting_id]) {
          map[unit.meeting_id] = [];
        }
        map[unit.meeting_id].push(unit);
        return map;
      },
      {},
    );

    const guestCountMap = meetingGuests.recordset.reduce(
      (map: Record<string, number>, guest: any) => {
        map[guest.meeting_id] = guest.guest_count;
        return map;
      },
      {},
    );

    const meetingTypeMap = this.meetingTypeCache;

    // Collect unit IDs from meetingUnits
    meetingUnits.recordset.forEach(u => {
      if (u.unit_id) allOrgUnitIds.push(u.unit_id);
    });

    const delegatedUserIds = new Set<string>();

    delegations.recordset.forEach((r: any) => {
      if (r.delegated_to_user_id) delegatedUserIds.add(r.delegated_to_user_id);
      if (r.delegated_from_user_id) delegatedUserIds.add(r.delegated_from_user_id);

      if (r.user_id) allUserIds.add(r.user_id);
      if (r.delegated_to_user_id) allUserIds.add(r.delegated_to_user_id);
      if (r.delegated_from_user_id) allUserIds.add(r.delegated_from_user_id);
    });

    const [organizationUnitMap, users] = await Promise.all([
      this.getOrgUnitsInfo(allOrgUnitIds),
      this.userRepo.find({
        where: { id: In([...allUserIds]) },
        select: ['id', 'name'],
      }),
    ]);

    const documentPreparedMap = documents.recordset.reduce((map, doc) => {
      let key: string;

      if (doc.attachable_type === 'PARTICIPANT') {
        key = `${doc.meeting_id}_PARTICIPANT_${doc.participantId}`;
      } else {
        key = `${doc.meeting_id}_UNIT_${doc.unitId}`;
      }

      map[key] = {
        totalDocuments: doc.total_documents ?? 0,
        preparedDocuments: doc.prepared_documents ?? 0,
      };

      return map;
    }, {} as Record<string, any>);

    const userMap = new Map<string, string>();
    users.forEach(u => userMap.set(u.id, u.name));

    // Map meetingId -> Set<userId> tham gia
    const meetingParticipantMap: Record<string, Set<string>> = {};

    delegations.recordset.forEach((r: any) => {
      if (!meetingParticipantMap[r.meeting_id]) {
        meetingParticipantMap[r.meeting_id] = new Set<string>();
      }
      if (r.user_id) {
        meetingParticipantMap[r.meeting_id].add(r.user_id);
      }
    });

    const SYSTEM_FIELDS = ['workItem', 'availableActions', 'flags'];

    // Hàm chuyển đổi từ camelCase sang snake_case
    const camelToSnake = (str: string): string => {
      return str.replace(/([A-Z])/g, (_, c) => `_${c.toLowerCase()}`);
    };

    const SYSTEM_UNITS = ['CHAIRMAN_UNIT', 'SECRETARY_UNIT'];
    // Map documents
    const mappedDocs = docs.map((item) => {
      const mapped: Record<string, any> = {};
      const units = meetingUnitsMap[item.id] || [];

      const actualUnits = units.filter(u => {
        const org = organizationUnitMap.get(u.unit_id);
        return (
          u.unit_id &&
          !SYSTEM_UNITS.includes(u.unit_id) &&
          org?.parentId
        );
      });

      const realUnits = actualUnits.filter(u =>
        u.is_room_selected === true || u.is_room_selected === 1 || u.isRoomSelected === true || u.isRoomSelected === 1
      );

      const guestCount = guestCountMap[item.id] || 0;
      const unitOfUser = units.filter((unit) => unit.unit_id === userContext?.receiverUnit);

      if (unitOfUser.length === 0) {
        mapped.unitTask = '-';
      } else {
        const unit = unitOfUser[0];

        const confirmDone = !!unit.accept_join;
        const assignDone = !!unit.assign_participants;
        const docDone = !!unit.prepare_documents;

        // kiểm tra có tài liệu hay không
        const unitKey = `${item.id}_UNIT_${userContext?.receiverUnit}`;
        const unitDocuments = documentPreparedMap[unitKey] || { totalDocuments: 0, preparedDocuments: 0 };
        const hasDocuments = unitDocuments.totalDocuments > 0;

        const totalTasks = hasDocuments ? 3 : 2;

        const completedTasks =
          (confirmDone ? 1 : 0) +
          (assignDone ? 1 : 0) +
          (hasDocuments && docDone ? 1 : 0);

        let color = '#0062AD';
        let text = `${completedTasks}/${totalTasks} việc`;

        if (completedTasks === totalTasks) {
          color = '#008236';
          text = 'Hoàn thành';
        } else if (completedTasks === 0) {
          color = '#0062AD';
          text = `${totalTasks}`;
        } else {
          color = '#FFC04C';
        }

        const icon = (ok: boolean) =>
          ok
            ? `<span style="color:#008236">✔</span>`
            : `<span style="color:#D32F2F">!</span>`;

        if (isExport === 'true') {
          mapped.unitTask = text;
        } else {
          mapped.unitTask = `
            <div class="unit-task-wrapper">
              <span 
                class="unit-task-label"
                style="color:${color}; font-weight:500; font-size:15px; cursor:pointer;"
              >
                ${text}
              </span>

              <div class="unit-task-tooltip">
                <div>${icon(confirmDone)} Xác nhận tham gia</div>
                <div>${icon(assignDone)} Gán người tham dự</div>
                ${hasDocuments ? `<div>${icon(docDone)} Chuẩn bị tài liệu</div>` : ''}
              </div>
            </div>
          `;
        }
      }

      // Map theo aliases
      for (const [sourceKey, targetKey] of Object.entries(aliases)) {
        const camelKey = sourceKey; // alias camelCase
        const snakeKey = camelToSnake(camelKey); // alias snake_case

        // Kiểm tra xem item có chứa key này với camelCase hoặc snake_case không
        if (item[camelKey] !== undefined && item[camelKey] !== null && item[camelKey] !== '') {
          mapped[targetKey] = item[camelKey];
        } else if (item[snakeKey] !== undefined && item[snakeKey] !== null && item[snakeKey] !== '') {
          mapped[targetKey] = item[snakeKey];
        } else {
          mapped[targetKey] = '-';
        }
      }

      // Map phòng ban
      if (item.organizational_unit) {
        mapped.organizationalUnit = organizationUnitMap.get(item.organizational_unit)?.name || '-';
      }

      // Meeting Type
      const meetingTypeSourceKey = Object.keys(aliases).find(
        (k) => aliases[k] === 'meetingType',
      );
      if (meetingTypeSourceKey && item[meetingTypeSourceKey]) {
        const value = item[meetingTypeSourceKey];
        mapped.meetingType = meetingTypeMap.get(value) || value;
      }
      // Gán người tham gia
      const seatAssignmentKeyAlias = Object.keys(aliases).find(
        (k) => aliases[k] === 'seatAssignment',
      );
      // Lãnh đạo tham gia
      const leaderStateKeyAlias = Object.keys(aliases).find(
        (k) => aliases[k] === 'leaderState',
      );
      // Thu thập user tham gia meeting hiện tại
      const participantIds = new Set<string>();

      if (item.chairman_id) participantIds.add(item.chairman_id);
      if (item.secretary_id) participantIds.add(item.secretary_id);

      const meetingParticipants = meetingParticipantMap[item.id];
      if (meetingParticipants) {
        meetingParticipants.forEach((id) => participantIds.add(id));
      }

      // Kiểm tra có lãnh đạo tham gia không
      const hasLeader = [...participantIds].some(id => leaderUserIdSet.has(id));

      // Đơn vị tham gia
      const unitGuestKeyAlias = Object.keys(aliases).find(
        (k) => aliases[k] === 'unitGuest',
      );
      // Độ ưu tiên
      const priorityKeyAlias = Object.keys(aliases).find(
        (k) => aliases[k] === 'priority',
      );
      // Loại lịch
      const isCompanyKeyAlias = Object.keys(aliases).find(
        (k) => aliases[k] === 'isCompany',
      );

      // Vai trò tham gia 
      const participationRoleKeyAlias = Object.keys(aliases).find(
        (k) => aliases[k] === 'participationRole',
      );

      if (seatAssignmentKeyAlias) {

        const totalUnits = realUnits.length;
        const assignedUnits = realUnits.filter(u => u.assign_participants).length;

        const color =
          totalUnits > 0 && assignedUnits === totalUnits
            ? '#2E7D32'
            : assignedUnits > 0
              ? '#FFC04C'
              : '#0062AD';

        const icon = (ok: boolean) =>
          ok
            ? `<span style="color:#008236">✔</span>`
            : `<span style="color:#D32F2F">!</span>`;

        const unitList = realUnits.map(u => {
          const name = organizationUnitMap.get(u.unit_id)?.name || '-';
          return `<div>${icon(!!u.assign_participants)} ${name}</div>`;
        });

        let text = '';
        if (actualUnits.length === 0) {
          text = 'Chưa gán thành phần tham gia';
        } else if (realUnits.length === 0) {
          text = 'Không có đơn vị tham gia cuộc họp';
        } else {
          text = `${assignedUnits}/${totalUnits} đơn vị đã gán`;
        }

        if (isExport === 'true') {
          mapped.seatAssignment = text;
        } else {
          mapped.seatAssignment = `
            <div class="unit-task-wrapper">
              <span
                class="unit-task-label"
                style="color:${color}; font-weight:600; font-size:15px; cursor:pointer;"
              >
                ${text}
              </span>

              <div class="unit-task-tooltip">
                ${unitList.join('')}
              </div>
            </div>
          `;
        }
      }
      // Thành phần tham gia
      const unitNames = realUnits.map(u => organizationUnitMap.get(u.unit_id)?.name).filter(name => name && name.trim() !== '');

      const text = `${unitNames.length} phòng ban`;

      if (isExport === 'true') {
        // Export Excel/PDF → trả ra đầy đủ tên
        mapped.participatingComponents = text;
      } else {
        // UI → tooltip
        mapped.participatingComponents = `
          <div class="unit-task-wrapper">
            <span 
              class="unit-task-label"
              style="color:#0062AD; font-weight:500; font-size:15px; cursor:pointer;"
            >
              ${text}
            </span>

            <div class="unit-task-tooltip">
              ${unitNames.map(name => `<div>${name}</div>`).join('')}
            </div>
          </div>
        `;
      }
      // Thành phần tham gia cho lịch lãnh đạo
      mapped.participatingComponentsLeader = Array.isArray(realUnits)
        ? realUnits.filter((u) => u && String(u).trim()).join('; ')
        : null;
      // Tài liệu cần chuẩn bị
      const unitKey = `${item.id}_UNIT_${userContext?.receiverUnit}`;
      const unitDocuments = documentPreparedMap[unitKey] || { totalDocuments: 0, preparedDocuments: 0 };
      const participantKey = `${item.id}_PARTICIPANT_${userContext?.userId}`;
      let participantDocuments = documentPreparedMap[participantKey];
      if (!participantDocuments) {
        // fallback: cộng tất cả participant trong meeting
        participantDocuments = Object.entries(documentPreparedMap)
          .filter(([key]) => key.startsWith(`${item.id}_PARTICIPANT_`))
          .reduce(
            (acc, [, val]: any) => {
              acc.totalDocuments += val.totalDocuments || 0;
              acc.preparedDocuments += val.preparedDocuments || 0;
              return acc;
            },
            { totalDocuments: 0, preparedDocuments: 0 }
          );
      }
      // Của phòng ban
      const unitStatus = buildDocumentStatus(unitDocuments.preparedDocuments, unitDocuments.totalDocuments,);
      mapped.unitColor = unitStatus.color;
      mapped.documentPreparedUnit = ` <span style="color:${unitStatus.color}; font-weight:500; font-size:15px"> ${unitStatus.text} </span> `;

      // Của người tham gia
      const participantStatus = buildDocumentStatus(participantDocuments.preparedDocuments, participantDocuments.totalDocuments,);
      mapped.documentPreparedColor = participantStatus.color;
      mapped.documentPrepared = ` <span style="color:${participantStatus.color}; font-weight:500; font-size:15px"> ${participantStatus.text} </span> `;

      // Map đơn vị tham gia
      if (unitGuestKeyAlias) {
        if (realUnits.length === 0 && guestCount === 0) {
          mapped.unitGuest = '-';
        } else {
          mapped.unitGuest = realUnits.length > 0 ? `${realUnits.length} đơn vị` : '';
          mapped.unitGuest += guestCount > 0 ? `, ${guestCount} khách mời` : '';
        }
      }
      // Map lãnh đạo tham gia
      if (leaderStateKeyAlias) {
        const value = hasLeader ? 'Có' : 'Không';
        mapped.leaderState = value;
      }

      // Map độ ưu tiên
      if (priorityKeyAlias) {
        const value = item[priorityKeyAlias];

        if (value) {
          mapped.priority = meetingTypeMap.get(value) || value;
        } else {
          mapped.priority = '-';
        }
      }
      // Map loại cuộc họp
      const meetingModeSourceKey = Object.keys(aliases).find(
        (k) => aliases[k] === 'meetingMode'
      );

      // Map hình thức họp
      if (meetingModeSourceKey && item[meetingModeSourceKey]) {
        mapped.meetingMode = meetingTypeMap.get(item[meetingModeSourceKey]) || item[meetingModeSourceKey] || '-';
      } else {
        mapped['meetingMode'] = '-';  // Gán mặc định nếu không có giá trị meeting_mode
      }
      // Map loại lịch
      if (isCompanyKeyAlias && item[isCompanyKeyAlias] !== undefined) {
        const isCompany = item[isCompanyKeyAlias];
        mapped.isCompany = isCompany;
        if (isCompany) {
          mapped.isCompany = 'Tổng công ty';  // Hoặc giá trị phù hợp cho lịch tổng công ty
        } else {
          mapped.isCompany = 'Phòng ban';    // Hoặc giá trị phù hợp cho lịch phòng ban
        }
      }

      // Chairman & Secretary
      const chairmanKeyAlias = Object.keys(aliases).find(
        (k) => aliases[k] === 'chairmanId',
      );
      const secretaryKeyAlias = Object.keys(aliases).find(
        (k) => aliases[k] === 'secretaryId',
      );
      if (chairmanKeyAlias) mapped['chairmanId'] = userMap.get(item[chairmanKeyAlias]) || '-';;
      if (secretaryKeyAlias) mapped['secretaryId'] = userMap.get(item[secretaryKeyAlias]) || '-';

      // Vai trò tham gia
      if (participationRoleKeyAlias && userContext?.userId) {
        const userId = userContext.userId;

        if (item.chairman_id === userId) {
          mapped.participationRole = 'Chủ trì';
        } else if (item.secretary_id === userId) {
          mapped.participationRole = 'Thư ký';
        } else {
          mapped.participationRole = 'Tham gia';
        }
      }
      // Map ủy quyền
      if (userContext?.userId) {
        const delegation = delegations.recordset.find(
          (d: any) =>
            d.meeting_id === item.id &&
            (d.user_id === userContext.userId ||
              d.delegated_from_user_id === userContext.userId)
        );

        if (delegation?.user_id === userContext.userId && delegation.delegated_to_user_id) {
          mapped.delegatedFromUser =
            userMap.get(delegation.delegated_to_user_id) || '-';
        }
        else if (delegation?.delegated_from_user_id === userContext.userId) {
          mapped.delegatedFromUser =
            userMap.get(delegation.user_id) || '-';
        }
        else {
          mapped.delegatedFromUser = '-';
        }
      }

      // Meeting Date
      const meetingDateKey = Object.keys(aliases).find(
        (k) => aliases[k] === 'meetingDate',
      );
      if (meetingDateKey && item[meetingDateKey] !== undefined) {
        mapped['meetingDate'] = normalizeDateValueDDMMYYYY(
          item[meetingDateKey],
        );
      }

      // Room mapping
      const currentMode = (item.meetingMode || item.meeting_mode || '').toString().toUpperCase();
      if (currentMode === 'OUTSIDETHECOMPANY') {
        const loc = item.location || item.meetings_location || '';
        mapped['roomIds'] = loc ? [loc] : [];
      } else if (item.room_ids) {
        const roomIds = item.room_ids.split(',');
        mapped['roomIds'] = roomIds.map((rid) => roomMap.get(rid) || rid);
      }

      const meetingTimeValue = item.meeting_time || item[Object.keys(aliases).find(k => aliases[k] === 'meetingTime')!];
      mapped.meetingDuration = meetingTimeValue ? formatMeetingDuration(meetingTimeValue) : '-';

      // Latest action_code theo document_id
      if (isExport === 'true') {
        mapped['meetingState'] = mapActionToLabelExport(item.meeting_state) || '-';
      } else {
        mapped['meetingState'] = mapActionToLabel(item.meeting_state) || '-';
      }
      mapped['meetingStateCode'] = item.meeting_state;
      mapped['statusCodeObj'] = mapActionToStatusStyle(item.meeting_state) || '-';
      mapped['createdBy'] = userMap.get(item.created_by) || '-';
      mapped['createdByOrg'] = item.createdByOrg || '-';
      mapped['type'] = 'meeting';
      mapped['content'] = item.content;
      if (isParticipant) {
        mapped.listparammeeting = isParticipant;
      }
      if (item.flags?.hideCheckbox !== undefined) {
        if (!mapped.flags || typeof mapped.flags !== 'object') {
          mapped.flags = {};
        }

        mapped.flags.hideCheckbox =
          item.flags.hideCheckbox || item.meeting_state !== 'DU_KIEN';
      }
      if (item.conclusion !== undefined) {
        mapped.conclusion = item.conclusion;
      }

      SYSTEM_FIELDS.forEach((key) => {
        if (item[key] !== undefined) {
          mapped[key] = item[key];
        }
      });

      const statusCode = (item.status_code || item.statusCode || '1').toString();
      const canEdit = ['1', '5', '7'].includes(statusCode);
      const canDelete = statusCode === '1';
      mapped.isNotEdit = !canEdit;
      mapped.isNotDelete = !canDelete;

      if ((item.meetingState && item.meetingState === MEETING_STATE.KET_THUC) || (item.meeting_state && item.meeting_state === MEETING_STATE.KET_THUC)) {
        mapped.isNotEdit = true;
        mapped.isNotCancel = true;
      }
      return mapped;
    });

    return mappedDocs;
  }

  async mapDocKeyMeetingCalendar(
    docs: any[],
    aliases: Record<string, string> = {},
    authority?: string,
    userContext?: { userId?: string; roles?: string[]; receiverUnit?: string },
    isParticipant?: string,
  ): Promise<any[]> {
    if (!Array.isArray(docs) || !docs.length) return [];
    const pool = await this.getPool();
    const allUserIds = new Set<string>();
    this.processKey = docs[0]?.bpmn_version || docs[0]?.bpmnVersion;

    for (const item of docs) {
      if (item.chairman_id) allUserIds.add(item.chairman_id);
      if (item.secretary_id) allUserIds.add(item.secretary_id);
      if (item.created_by) allUserIds.add(item.created_by);
    }
    const uniqueRoomIds = [
      ...new Set(
        docs.flatMap(d => (d.room_ids ? d.room_ids.split(',') : []))
      ),
    ];
    const uniqueMeetingIds = docs.map((d) => `'${d.id}'`).join(',');

    const [delegations, meetingUnits, rooms] = await Promise.all([
      pool.query(`
        SELECT 
          mu.meeting_id,
          mp.user_id,
          mp.delegated_to_user_id,
          mp.delegated_from_user_id
        FROM ${this.dbname}.meeting_participants mp WITH (NOLOCK)
        INNER JOIN ${this.dbname}.meeting_units mu WITH (NOLOCK)
          ON mp.meeting_unit_id = mu.id
        WHERE mu.meeting_id IN (${uniqueMeetingIds})
      `),
      pool.query(`
        SELECT 
          mu.meeting_id,
          mu.unit_id,
          mu.is_room_selected,
          ou.name AS unit_name
        FROM ${this.dbname}.meeting_units mu WITH (NOLOCK)
        LEFT JOIN ${this.dbname}.organization_units ou WITH (NOLOCK) ON ou.id = mu.unit_id
        WHERE mu.meeting_id IN (${uniqueMeetingIds})
          AND mu.unit_id NOT IN ('CHAIRMAN_UNIT', 'SECRETARY_UNIT')
          AND ou.parentId IS NOT NULL
      `),
      uniqueRoomIds.length
        ? this.meetingRoomRepo.find({
          where: { id: In(uniqueRoomIds) },
          select: ['id', 'name'],
        })
        : Promise.resolve([]),
    ]);

    const roomMap = new Map(rooms.map(r => [r.id, r.name]));
    const meetingTypeMap = this.meetingTypeCache;
    const leaderUserIdSet = this.leaderUserIdSet;

    delegations.recordset.forEach((r: any) => {
      if (r.user_id) allUserIds.add(r.user_id);
      if (r.delegated_to_user_id) allUserIds.add(r.delegated_to_user_id);
      if (r.delegated_from_user_id) allUserIds.add(r.delegated_from_user_id);
    });

    const meetingUnitsMap = meetingUnits.recordset.reduce(
      (map: Record<string, any[]>, unit: any) => {
        if (!map[unit.meeting_id]) {
          map[unit.meeting_id] = [];
        }
        map[unit.meeting_id].push(unit);
        return map;
      },
      {},
    );

    const users = await this.userRepo.find({
      where: { id: In([...allUserIds]) },
      select: ['id', 'name'],
    });

    const userMap = new Map<string, string>();
    users.forEach(u => userMap.set(u.id, u.name));

    const SYSTEM_FIELDS = ['workItem', 'availableActions', 'flags'];
    const camelToSnake = (str: string): string => {
      return str.replace(/([A-Z])/g, (_, c) => `_${c.toLowerCase()}`);
    };

    const mappedDocs = docs.map((item) => {
      const mapped: Record<string, any> = {};
      mapped.unitTask = '-';

      // Map theo aliases
      for (const [sourceKey, targetKey] of Object.entries(aliases)) {
        const camelKey = sourceKey;
        const snakeKey = camelToSnake(camelKey);

        if (item[camelKey] !== undefined && item[camelKey] !== null && item[camelKey] !== '') {
          mapped[targetKey] = item[camelKey];
        } else if (item[snakeKey] !== undefined && item[snakeKey] !== null && item[snakeKey] !== '') {
          mapped[targetKey] = item[snakeKey];
        } else {
          mapped[targetKey] = '-';
        }
      }

      if (item.organizational_unit) {
        mapped.organizationalUnit = '-';
      }

      const meetingTypeValue = item.meeting_type || item.meetingType;
      if (meetingTypeValue) {
        mapped.meetingType = meetingTypeMap.get(meetingTypeValue) || meetingTypeValue;
      } else {
        mapped.meetingType = '-';
      }

      // Đơn vị tham gia & Lịch lãnh đạo
      const units = meetingUnitsMap[item.id] || [];
      const realUnits = units.filter(u =>
        u.is_room_selected === true || u.is_room_selected === 1
      );
      const unitNames = realUnits.map(u => u.unit_name).filter(name => name && name.trim() !== '');
      const text = `${unitNames.length} phòng ban`;

      mapped.seatAssignment = '-';
      mapped.participatingComponents = `
        <div class="unit-task-wrapper">
          <span 
            class="unit-task-label"
            style="color:#0062AD; font-weight:500; font-size:15px; cursor:pointer;"
          >
            ${text}
          </span>

          <div class="unit-task-tooltip">
            ${unitNames.map(name => `<div>${name}</div>`).join('')}
          </div>
        </div>
      `;
      mapped.participatingComponentsLeader = unitNames.join('; ');
      mapped.unitColor = '-';
      mapped.documentPreparedUnit = '-';
      mapped.documentPreparedColor = '-';
      mapped.documentPrepared = '-';
      mapped.unitGuest = '-';

      // Lãnh đạo tham gia
      const participantIds = new Set<string>();
      if (item.chairman_id) participantIds.add(item.chairman_id);
      if (item.secretary_id) participantIds.add(item.secretary_id);

      const meetingParticipants = delegations.recordset.filter((d: any) => d.meeting_id === item.id);
      meetingParticipants.forEach((p: any) => {
        if (p.user_id) participantIds.add(p.user_id);
        if (p.delegated_to_user_id) participantIds.add(p.delegated_to_user_id);
      });

      const hasLeader = [...participantIds].some(id => leaderUserIdSet.has(id));
      mapped.leaderState = hasLeader ? 'Có' : 'Không';

      const priorityValue = item.priority;
      mapped.priority = priorityValue ? (meetingTypeMap.get(priorityValue) || priorityValue) : '-';

      const meetingModeValue = item.meeting_mode || item.meetingMode;
      if (meetingModeValue) {
        mapped.meetingMode = meetingTypeMap.get(meetingModeValue) || meetingModeValue || '-';
      } else {
        mapped.meetingMode = '-';
      }

      const isCompanyKeyAlias = Object.keys(aliases).find(
        (k) => aliases[k] === 'isCompany',
      );
      if (isCompanyKeyAlias && item[isCompanyKeyAlias] !== undefined) {
        const isCompany = item[isCompanyKeyAlias];
        mapped.isCompany = isCompany ? 'Tổng công ty' : 'Phòng ban';
      }

      const chairmanKeyAlias = Object.keys(aliases).find(
        (k) => aliases[k] === 'chairmanId',
      );
      const secretaryKeyAlias = Object.keys(aliases).find(
        (k) => aliases[k] === 'secretaryId',
      );
      if (chairmanKeyAlias) mapped.chairmanId = userMap.get(item[chairmanKeyAlias]) || '-';
      if (secretaryKeyAlias) mapped.secretaryId = userMap.get(item[secretaryKeyAlias]) || '-';

      const participationRoleKeyAlias = Object.keys(aliases).find(
        (k) => aliases[k] === 'participationRole',
      );
      if (participationRoleKeyAlias && userContext?.userId) {
        const userId = userContext.userId;
        if (item.chairman_id === userId) {
          mapped.participationRole = 'Chủ trì';
        } else if (item.secretary_id === userId) {
          mapped.participationRole = 'Thư ký';
        } else {
          mapped.participationRole = 'Tham gia';
        }
      }

      if (userContext?.userId) {
        const delegation = delegations.recordset.find(
          (d: any) =>
            d.meeting_id === item.id &&
            (d.user_id === userContext.userId ||
              d.delegated_from_user_id === userContext.userId)
        );
        if (delegation?.user_id === userContext.userId && delegation.delegated_to_user_id) {
          mapped.delegatedFromUser = userMap.get(delegation.delegated_to_user_id) || '-';
        } else if (delegation?.delegated_from_user_id === userContext.userId) {
          mapped.delegatedFromUser = userMap.get(delegation.user_id) || '-';
        } else {
          mapped.delegatedFromUser = '-';
        }
      }

      const meetingDateKey = Object.keys(aliases).find(
        (k) => aliases[k] === 'meetingDate',
      );
      if (meetingDateKey && item[meetingDateKey] !== undefined) {
        mapped.meetingDate = normalizeDateValueDDMMYYYY(item[meetingDateKey]);
      }

      const currentMode = (item.meetingMode || item.meeting_mode || '').toString().toUpperCase();
      if (currentMode === 'OUTSIDETHECOMPANY') {
        const loc = item.location || item.meetings_location || '';
        mapped.roomIds = loc ? [loc] : [];
      } else if (item.room_ids) {
        const roomIds = item.room_ids.split(',');
        mapped.roomIds = roomIds.map((rid) => roomMap.get(rid) || rid);
      }

      const meetingTimeValue = item.meeting_time || item[Object.keys(aliases).find(k => aliases[k] === 'meetingTime')!];
      mapped.meetingDuration = meetingTimeValue ? formatMeetingDuration(meetingTimeValue) : '-';

      mapped.meetingState = mapActionToLabel(item.meeting_state) || '-';
      mapped.meetingStateCode = item.meeting_state;
      mapped.statusCodeObj = mapActionToStatusStyle(item.meeting_state) || '-';
      mapped.createdBy = userMap.get(item.created_by) || '-';
      mapped.createdByOrg = item.createdByOrg || '-';
      mapped.type = 'meeting';
      mapped.content = item.content;
      if (isParticipant) {
        mapped.listparammeeting = isParticipant;
      }
      if (item.flags?.hideCheckbox !== undefined) {
        if (!mapped.flags || typeof mapped.flags !== 'object') {
          mapped.flags = {};
        }
        mapped.flags.hideCheckbox = item.flags.hideCheckbox || item.meeting_state !== 'DU_KIEN';
      }
      if (item.conclusion !== undefined) {
        mapped.conclusion = item.conclusion;
      }

      SYSTEM_FIELDS.forEach((key) => {
        if (item[key] !== undefined) {
          mapped[key] = item[key];
        }
      });

      const statusCode = (item.status_code || item.statusCode || '1').toString();
      const canEdit = ['1', '5', '7'].includes(statusCode);
      const canDelete = statusCode === '1';
      mapped.isNotEdit = !canEdit;
      mapped.isNotDelete = !canDelete;

      if ((item.meetingState && item.meetingState === MEETING_STATE.KET_THUC) || (item.meeting_state && item.meeting_state === MEETING_STATE.KET_THUC)) {
        mapped.isNotEdit = true;
        mapped.isNotCancel = true;
      }
      return mapped;
    });

    return mappedDocs;
  }

  async mapDocKeyMeetingSource(
    docs: any[],
    aliases: Record<string, string> = {},
    authority?: string,
    userContext?: { userId?: string; roles?: string[]; receiverUnit?: string },
    isParticipant?: string,
    type?: string,
    isExport?: string,
  ): Promise<any[]> {
    if (!Array.isArray(docs) || !docs.length) return [];
    const pool = await this.getPool();
    const allRoomIds: string[] = [];
    const allChairmanIds: string[] = [];
    const allSecretaryIds: string[] = [];
    const allOrgUnitIds: string[] = [];
    const allUserIds = new Set<string>();
    this.processKey = docs[0]?.bpmn_version || docs[0]?.bpmnVersion
    // Collect IDs
    for (const item of docs) {
      if (item.chairman_id) allUserIds.add(item.chairman_id);
      if (item.secretary_id) allUserIds.add(item.secretary_id);
      if (item.created_by) allUserIds.add(item.created_by);

      if (item.organizational_unit) {
        allOrgUnitIds.push(item.organizational_unit);
      }
    }
    const uniqueRoomIds = [
      ...new Set(
        docs.flatMap(d => (d.room_ids ? d.room_ids.split(',') : []))
      ),
    ];

    // Lấy danh sách user lãnh đạo
    const leaderUserIdSet = this.leaderUserIdSet;
    const uniqueMeetingIds = docs.map((d) => `'${d.id}'`).join(',');
    // Fetch users and rooms
    const [meetingUnits, meetingGuests, documents, delegations, rooms] =
      await Promise.all([
        pool.query(`
        SELECT meeting_id, room_id, assign_participants, unit_id, accept_join, prepare_documents, is_room_selected
        FROM ${this.dbname}.meeting_units
        WHERE meeting_id IN (${uniqueMeetingIds})
      `),

        pool.query(`
        SELECT meeting_id, COUNT(*) AS guest_count
        FROM ${this.dbname}.meeting_guests
        WHERE meeting_id IN (${uniqueMeetingIds})
        GROUP BY meeting_id
      `),

        pool.query(`
        SELECT 
          mt.meeting_id,
          mt.attachable_type,
          mt.attachable_id,
          MAX(CASE WHEN mt.attachable_type='PARTICIPANT' THEN mp.user_id END) AS participantId,
          MAX(CASE WHEN mt.attachable_type='UNIT' THEN mu.unit_id END) AS unitId,
          COUNT(*) AS total_documents,
          SUM(CASE WHEN mt.is_document_prepared = 1 THEN 1 ELSE 0 END) AS prepared_documents
        FROM ${this.dbname}.meeting_tasks mt
        LEFT JOIN ${this.dbname}.meeting_participants mp
          ON mt.attachable_type='PARTICIPANT' AND mp.id = mt.attachable_id
        LEFT JOIN ${this.dbname}.meeting_units mu
          ON mt.attachable_type='UNIT' AND mu.id = mt.attachable_id
        WHERE mt.meeting_id IN (${uniqueMeetingIds})
        GROUP BY mt.meeting_id, mt.attachable_type, mt.attachable_id
      `),

        pool.query(`
        SELECT 
          mu.meeting_id,
          mp.user_id,
          mp.delegated_to_user_id,
          mp.delegated_from_user_id
        FROM ${this.dbname}.meeting_participants mp
        INNER JOIN ${this.dbname}.meeting_units mu
          ON mp.meeting_unit_id = mu.id
        WHERE mu.meeting_id IN (${uniqueMeetingIds})
      `),

        uniqueRoomIds.length
          ? this.meetingRoomRepo.find({
            where: { id: In(uniqueRoomIds) },
            select: ['id', 'name'],
          })
          : Promise.resolve([]),
      ]);

    const roomMap = new Map(rooms.map(r => [r.id, r.name]));

    const meetingUnitsMap = meetingUnits.recordset.reduce(
      (map: Record<string, any>, unit: any) => {
        if (!map[unit.meeting_id]) {
          map[unit.meeting_id] = [];
        }
        map[unit.meeting_id].push(unit);
        return map;
      },
      {},
    );

    const guestCountMap = meetingGuests.recordset.reduce(
      (map: Record<string, number>, guest: any) => {
        map[guest.meeting_id] = guest.guest_count;
        return map;
      },
      {},
    );

    const meetingTypeMap = this.meetingTypeCache;

    // Collect unit IDs from meetingUnits
    meetingUnits.recordset.forEach(u => {
      if (u.unit_id) allOrgUnitIds.push(u.unit_id);
    });
    const organizationUnitMap = await this.getOrgUnitsInfo(allOrgUnitIds);

    const documentPreparedMap = documents.recordset.reduce((map, doc) => {
      let key: string;

      if (doc.attachable_type === 'PARTICIPANT') {
        key = `${doc.meeting_id}_PARTICIPANT_${doc.participantId}`;
      } else {
        key = `${doc.meeting_id}_UNIT_${doc.unitId}`;
      }

      map[key] = {
        totalDocuments: doc.total_documents ?? 0,
        preparedDocuments: doc.prepared_documents ?? 0,
      };

      return map;
    }, {} as Record<string, any>);

    const delegatedUserIds = new Set<string>();

    delegations.recordset.forEach((r: any) => {
      if (r.delegated_to_user_id) delegatedUserIds.add(r.delegated_to_user_id);
      if (r.delegated_from_user_id) delegatedUserIds.add(r.delegated_from_user_id);
    });

    // Map meetingId -> Set<userId> tham gia
    const meetingParticipantMap: Record<string, Set<string>> = {};

    delegations.recordset.forEach((r: any) => {
      if (!meetingParticipantMap[r.meeting_id]) {
        meetingParticipantMap[r.meeting_id] = new Set<string>();
      }
      if (r.user_id) {
        meetingParticipantMap[r.meeting_id].add(r.user_id);
      }
      if (r.user_id) allUserIds.add(r.user_id);
      if (r.delegated_to_user_id) allUserIds.add(r.delegated_to_user_id);
      if (r.delegated_from_user_id) allUserIds.add(r.delegated_from_user_id);
    });
    const users = await this.userRepo.find({
      where: { id: In([...allUserIds]) },
      select: ['id', 'name'],
    });

    const userMap = new Map<string, string>();
    users.forEach(u => userMap.set(u.id, u.name));
    const SYSTEM_FIELDS = ['workItem', 'availableActions', 'flags'];

    // Hàm chuyển đổi từ camelCase sang snake_case
    const camelToSnake = (str: string): string => {
      return str.replace(/([A-Z])/g, (_, c) => `_${c.toLowerCase()}`);
    };

    const SYSTEM_UNITS = ['CHAIRMAN_UNIT', 'SECRETARY_UNIT'];
    // Map documents
    const mappedDocs = docs.map((item) => {
      const mapped: Record<string, any> = {};
      const units = meetingUnitsMap[item.id] || [];

      const actualUnits = units.filter(u => {
        const org = organizationUnitMap.get(u.unit_id);
        return (
          u.unit_id &&
          !SYSTEM_UNITS.includes(u.unit_id) &&
          org?.parentId
        );
      });

      const realUnits = actualUnits.filter(u =>
        u.is_room_selected === true || u.is_room_selected === 1 || u.isRoomSelected === true || u.isRoomSelected === 1
      );

      const guestCount = guestCountMap[item.id] || 0;
      const unitOfUser = units.filter((unit) => unit.unit_id === userContext?.receiverUnit);

      if (unitOfUser.length === 0) {
        mapped.unitTask = '-';
      } else {
        const unit = unitOfUser[0];

        const confirmDone = !!unit.accept_join;
        const assignDone = !!unit.assign_participants;
        const docDone = !!unit.prepare_documents;

        // kiểm tra có tài liệu hay không
        const unitKey = `${item.id}_UNIT_${userContext?.receiverUnit}`;
        const unitDocuments = documentPreparedMap[unitKey] || { totalDocuments: 0, preparedDocuments: 0 };
        const hasDocuments = unitDocuments.totalDocuments > 0;

        const totalTasks = hasDocuments ? 3 : 2;

        const completedTasks =
          (confirmDone ? 1 : 0) +
          (assignDone ? 1 : 0) +
          (hasDocuments && docDone ? 1 : 0);

        let color = '#0062AD';
        let text = `${completedTasks}/${totalTasks} việc`;

        if (completedTasks === totalTasks) {
          color = '#008236';
          text = 'Hoàn thành';
        } else if (completedTasks === 0) {
          color = '#0062AD';
          text = `${totalTasks}`;
        } else {
          color = '#FFC04C';
        }

        const icon = (ok: boolean) =>
          ok
            ? `<span style="color:#008236">✔</span>`
            : `<span style="color:#D32F2F">!</span>`;

        if (isExport === 'true') {
          mapped.unitTask = text;
        } else {
          mapped.unitTask = `
            <div class="unit-task-wrapper">
              <span 
                class="unit-task-label"
                style="color:${color}; font-weight:500; font-size:15px; cursor:pointer;"
              >
                ${text}
              </span>

              <div class="unit-task-tooltip">
                <div>${icon(confirmDone)} Xác nhận tham gia</div>
                <div>${icon(assignDone)} Gán người tham dự</div>
                ${hasDocuments ? `<div>${icon(docDone)} Chuẩn bị tài liệu</div>` : ''}
              </div>
            </div>
          `;
        }
      }

      // Map theo aliases
      for (const [sourceKey, targetKey] of Object.entries(aliases)) {
        const camelKey = sourceKey; // alias camelCase
        const snakeKey = camelToSnake(camelKey); // alias snake_case

        // Kiểm tra xem item có chứa key này với camelCase hoặc snake_case không
        if (item[camelKey] !== undefined && item[camelKey] !== null && item[camelKey] !== '') {
          mapped[targetKey] = item[camelKey];
        } else if (item[snakeKey] !== undefined && item[snakeKey] !== null && item[snakeKey] !== '') {
          mapped[targetKey] = item[snakeKey];
        } else {
          mapped[targetKey] = '-';
        }
      }

      // Map phòng ban
      if (item.organizational_unit) {
        mapped.organizationalUnit = organizationUnitMap.get(item.organizational_unit)?.name || '-';
      }

      // Meeting Type
      const meetingTypeSourceKey = Object.keys(aliases).find(
        (k) => aliases[k] === 'meetingType',
      );
      if (meetingTypeSourceKey && item[meetingTypeSourceKey]) {
        const value = item[meetingTypeSourceKey];
        mapped.meetingType = meetingTypeMap.get(value) || value;
      }
      // Gán người tham gia
      const seatAssignmentKeyAlias = Object.keys(aliases).find(
        (k) => aliases[k] === 'seatAssignment',
      );
      // Lãnh đạo tham gia
      const leaderStateKeyAlias = Object.keys(aliases).find(
        (k) => aliases[k] === 'leaderState',
      );
      // Thu thập user tham gia meeting hiện tại
      const participantIds = new Set<string>();

      if (item.chairman_id) participantIds.add(item.chairman_id);
      if (item.secretary_id) participantIds.add(item.secretary_id);

      const meetingParticipants = meetingParticipantMap[item.id];
      if (meetingParticipants) {
        meetingParticipants.forEach((id) => participantIds.add(id));
      }

      // Kiểm tra có lãnh đạo tham gia không
      const hasLeader = [...participantIds].some(id => leaderUserIdSet.has(id));

      // Đơn vị tham gia
      const unitGuestKeyAlias = Object.keys(aliases).find(
        (k) => aliases[k] === 'unitGuest',
      );
      // Độ ưu tiên
      const priorityKeyAlias = Object.keys(aliases).find(
        (k) => aliases[k] === 'priority',
      );
      // Loại lịch
      const isCompanyKeyAlias = Object.keys(aliases).find(
        (k) => aliases[k] === 'isCompany',
      );

      // Vai trò tham gia 
      const participationRoleKeyAlias = Object.keys(aliases).find(
        (k) => aliases[k] === 'participationRole',
      );

      if (seatAssignmentKeyAlias) {

        const totalUnits = realUnits.length;
        const assignedUnits = realUnits.filter(u => u.assign_participants).length;

        const color =
          totalUnits > 0 && assignedUnits === totalUnits
            ? '#2E7D32'
            : assignedUnits > 0
              ? '#FFC04C'
              : '#0062AD';

        const icon = (ok: boolean) =>
          ok
            ? `<span style="color:#008236">✔</span>`
            : `<span style="color:#D32F2F">!</span>`;

        const unitList = realUnits.map(u => {
          const name = organizationUnitMap.get(u.unit_id)?.name || '-';
          return `<div>${icon(!!u.assign_participants)} ${name}</div>`;
        });

        let text = '';
        if (actualUnits.length === 0) {
          text = 'Chưa gán thành phần tham gia';
        } else if (realUnits.length === 0) {
          text = 'Không có đơn vị tham gia cuộc họp';
        } else {
          text = `${assignedUnits}/${totalUnits} đơn vị đã gán`;
        }

        if (isExport === 'true') {
          mapped.seatAssignment = text;
        } else {
          mapped.seatAssignment = `
            <div class="unit-task-wrapper">
              <span
                class="unit-task-label"
                style="color:${color}; font-weight:600; font-size:15px; cursor:pointer;"
              >
                ${text}
              </span>

              <div class="unit-task-tooltip">
                ${unitList.join('')}
              </div>
            </div>
          `;
        }
      }
      // Thành phần tham gia
      const unitNames = realUnits.map(u => organizationUnitMap.get(u.unit_id)?.name).filter(name => name && name.trim() !== '');

      const text = `${unitNames.length} phòng ban`;

      if (isExport === 'true') {
        // Export Excel/PDF → trả ra đầy đủ tên
        mapped.participatingComponents = text;
      } else {
        // UI → tooltip
        mapped.participatingComponents = `
          <div class="unit-task-wrapper">
            <span 
              class="unit-task-label"
              style="color:#0062AD; font-weight:500; font-size:15px; cursor:pointer;"
            >
              ${text}
            </span>

            <div class="unit-task-tooltip">
              ${unitNames.map(name => `<div>${name}</div>`).join('')}
            </div>
          </div>
        `;
      }
      // Thành phần tham gia cho lịch lãnh đạo
      mapped.participatingComponentsLeader = Array.isArray(realUnits)
        ? realUnits.filter((u) => u && String(u).trim()).join('; ')
        : null;
      // Tài liệu cần chuẩn bị
      const unitKey = `${item.id}_UNIT_${userContext?.receiverUnit}`;
      const unitDocuments = documentPreparedMap[unitKey] || { totalDocuments: 0, preparedDocuments: 0 };
      const participantKey = `${item.id}_PARTICIPANT_${userContext?.userId}`;
      let participantDocuments = documentPreparedMap[participantKey];
      if (!participantDocuments) {
        // fallback: cộng tất cả participant trong meeting
        participantDocuments = Object.entries(documentPreparedMap)
          .filter(([key]) => key.startsWith(`${item.id}_PARTICIPANT_`))
          .reduce(
            (acc, [, val]: any) => {
              acc.totalDocuments += val.totalDocuments || 0;
              acc.preparedDocuments += val.preparedDocuments || 0;
              return acc;
            },
            { totalDocuments: 0, preparedDocuments: 0 }
          );
      }
      // Của phòng ban
      const unitStatus = buildDocumentStatus(unitDocuments.preparedDocuments, unitDocuments.totalDocuments,);
      mapped.unitColor = unitStatus.color;
      mapped.documentPreparedUnit = ` <span style="color:${unitStatus.color}; font-weight:500; font-size:15px"> ${unitStatus.text} </span> `;

      // Của người tham gia
      const participantStatus = buildDocumentStatus(participantDocuments.preparedDocuments, participantDocuments.totalDocuments,);
      mapped.documentPreparedColor = participantStatus.color;
      mapped.documentPrepared = ` <span style="color:${participantStatus.color}; font-weight:500; font-size:15px"> ${participantStatus.text} </span> `;

      // Map đơn vị tham gia
      if (unitGuestKeyAlias) {
        if (realUnits.length === 0 && guestCount === 0) {
          mapped.unitGuest = '-';
        } else {
          mapped.unitGuest = realUnits.length > 0 ? `${realUnits.length} đơn vị` : '';
          mapped.unitGuest += guestCount > 0 ? `, ${guestCount} khách mời` : '';
        }
      }
      // Map lãnh đạo tham gia
      if (leaderStateKeyAlias) {
        const value = hasLeader ? 'Có' : 'Không';
        mapped.leaderState = value;
      }

      // Map độ ưu tiên
      if (priorityKeyAlias) {
        const value = item[priorityKeyAlias];

        if (value) {
          mapped.priority = meetingTypeMap.get(value) || value;
        } else {
          mapped.priority = '-';
        }
      }
      // Map loại cuộc họp
      const meetingModeSourceKey = Object.keys(aliases).find(
        (k) => aliases[k] === 'meetingMode'
      );

      // Map hình thức họp
      if (meetingModeSourceKey && item[meetingModeSourceKey]) {
        mapped.meetingMode = meetingTypeMap.get(item[meetingModeSourceKey]) || item[meetingModeSourceKey] || '-';
      } else {
        mapped['meetingMode'] = '-';  // Gán mặc định nếu không có giá trị meeting_mode
      }
      // Map loại lịch
      if (isCompanyKeyAlias && item[isCompanyKeyAlias] !== undefined) {
        const isCompany = item[isCompanyKeyAlias];
        mapped.isCompany = isCompany;
        if (isCompany) {
          mapped.isCompany = 'Tổng công ty';  // Hoặc giá trị phù hợp cho lịch tổng công ty
        } else {
          mapped.isCompany = 'Phòng ban';    // Hoặc giá trị phù hợp cho lịch phòng ban
        }
      }

      // Chairman & Secretary
      const chairmanKeyAlias = Object.keys(aliases).find(
        (k) => aliases[k] === 'chairmanId',
      );
      const secretaryKeyAlias = Object.keys(aliases).find(
        (k) => aliases[k] === 'secretaryId',
      );
      if (chairmanKeyAlias) mapped['chairmanId'] = userMap.get(item[chairmanKeyAlias]) || '-';;
      if (secretaryKeyAlias) mapped['secretaryId'] = userMap.get(item[secretaryKeyAlias]) || '-';

      // Vai trò tham gia
      if (participationRoleKeyAlias && userContext?.userId) {
        const userId = userContext.userId;

        if (item.chairman_id === userId) {
          mapped.participationRole = 'Chủ trì';
        } else if (item.secretary_id === userId) {
          mapped.participationRole = 'Thư ký';
        } else {
          mapped.participationRole = 'Tham gia';
        }
      }
      // Map ủy quyền
      if (userContext?.userId) {
        const delegation = delegations.recordset.find(
          (d: any) =>
            d.meeting_id === item.id &&
            (d.user_id === userContext.userId ||
              d.delegated_from_user_id === userContext.userId)
        );

        if (delegation?.user_id === userContext.userId && delegation.delegated_to_user_id) {
          mapped.delegatedFromUser =
            userMap.get(delegation.delegated_to_user_id) || '-';
        }
        else if (delegation?.delegated_from_user_id === userContext.userId) {
          mapped.delegatedFromUser =
            userMap.get(delegation.user_id) || '-';
        }
        else {
          mapped.delegatedFromUser = '-';
        }
      }

      // Meeting Date
      const meetingDateKey = Object.keys(aliases).find(
        (k) => aliases[k] === 'meetingDate',
      );
      if (meetingDateKey && item[meetingDateKey] !== undefined) {
        mapped['meetingDate'] = normalizeDateValueDDMMYYYY(
          item[meetingDateKey],
        );
      }

      // Room mapping
      const currentMode = (item.meetingMode || item.meeting_mode || '').toString().toUpperCase();
      if (currentMode === 'OUTSIDETHECOMPANY') {
        const loc = item.location || item.meetings_location || '';
        mapped['roomIds'] = loc ? [loc] : [];
      } else if (item.room_ids) {
        const roomIds = item.room_ids.split(',');
        mapped['roomIds'] = roomIds.map((rid) => roomMap.get(rid) || rid);
      }

      const meetingTimeValue = item.meeting_time || item[Object.keys(aliases).find(k => aliases[k] === 'meetingTime')!];
      mapped.meetingDuration = meetingTimeValue ? formatMeetingDuration(meetingTimeValue) : '-';

      // Latest action_code theo document_id
      if (isExport === 'true') {
        mapped['meetingState'] = mapActionToLabelExport(item.meeting_state) || '-';
      } else {
        mapped['meetingState'] = mapActionToLabelForSource(item.meeting_state) || '-';
      }
      mapped['statusCodeObj'] = mapActionToStatusStyle(item.meeting_state) || '-';
      mapped['createdBy'] = userMap.get(item.created_by) || '-';
      mapped['createdByOrg'] = item.createdByOrg || '-';
      mapped['type'] = 'meeting';
      mapped['content'] = item.content;
      if (isParticipant) {
        mapped.listparammeeting = isParticipant;
      }
      if (item.flags?.hideCheckbox !== undefined) {
        if (!mapped.flags || typeof mapped.flags !== 'object') {
          mapped.flags = {};
        }

        mapped.flags.hideCheckbox =
          item.flags.hideCheckbox || item.meeting_state !== 'DU_KIEN';
      }
      if (item.conclusion !== undefined) {
        mapped.conclusion = item.conclusion;
      }

      SYSTEM_FIELDS.forEach((key) => {
        if (item[key] !== undefined) {
          mapped[key] = item[key];
        }
      });
      if ((item.meetingState && item.meetingState === MEETING_STATE.KET_THUC) || (item.meeting_state && item.meeting_state === MEETING_STATE.KET_THUC)) {
        mapped.isNotEdit = true;
        mapped.isNotCancel = true;
      }
      return mapped;
    });

    return mappedDocs;
  }

  async mapDocKeyMeetingHistory(
    docs: any[],
    aliases: Record<string, string> = {},
    authority?: string,
    userContext?: { userId?: string; roles?: string[]; unit?: string },
    type?: string,
    isExport?: string,
  ): Promise<any[]> {
    if (!Array.isArray(docs) || !docs.length) return [];

    // ── 1. Extract alias keys một lần duy nhất ──────────────────────────────
    const chairmanAliasKey = Object.keys(aliases).find(k => aliases[k] === 'chairmanId');
    const secretaryAliasKey = Object.keys(aliases).find(k => aliases[k] === 'secretaryId');
    const meetingDateAliasKey = Object.keys(aliases).find(k => aliases[k] === 'meetingDate');

    // ── 2. Gom ID cần fetch (dùng Set để tự dedup) ──────────────────────────
    const roomIdSet = new Set<string>();
    const userIdSet = new Set<string>();

    for (const item of docs) {
      if (item.created_by_parent) roomIdSet.add(item.created_by_parent);
      item.room_ids?.split(',').forEach((rid: string) => rid && roomIdSet.add(rid));
      if (chairmanAliasKey && item[chairmanAliasKey]) userIdSet.add(item[chairmanAliasKey]);
      if (secretaryAliasKey && item[secretaryAliasKey]) userIdSet.add(item[secretaryAliasKey]);
    }

    // ── 3. Batch fetch song song ─────────────────────────────────────────────

    const [users, rooms, pool] = await Promise.all([
      userIdSet.size ? this.userRepo.findBy({ id: In([...userIdSet]) }) : Promise.resolve([]),
      roomIdSet.size ? this.meetingRoomRepo.findBy({ id: In([...roomIdSet]) }) : Promise.resolve([]),
      this.getPool(),
    ]);

    // ── 4. Build lookup maps ─────────────────────────────────────────────────
    const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));
    const roomMap = Object.fromEntries(rooms.map(r => [r.id, r.name]));

    // ── 5. Map từng document ─────────────────────────────────────────────────
    return docs.map((item) => {
      const mapped: Record<string, any> = {};

      // 5a. Ánh xạ toàn bộ aliases
      for (const [src, dst] of Object.entries(aliases)) {
        if (item[src] !== undefined) mapped[dst] = item[src];
      }

      // 5b. Resolve tên chairman / secretary (ghi đè ID bằng tên)
      if (chairmanAliasKey) mapped['chairmanId'] = userMap[item[chairmanAliasKey]] ?? 'Chưa xác định';
      if (secretaryAliasKey) mapped['secretaryId'] = userMap[item[secretaryAliasKey]] ?? 'Chưa xác định';

      // 5c. Chuẩn hoá ngày họp
      if (meetingDateAliasKey && item[meetingDateAliasKey] !== undefined) {
        mapped['meetingDate'] = normalizeDateValueDDMMYYYY(item[meetingDateAliasKey]);
      }

      // 5d. Resolve phòng tạo (createdBy)
      mapped['createdBy'] = item.created_by_parent
        ? { id: item.created_by_parent, name: roomMap[item.created_by_parent] ?? null }
        : null;

      // 5e. Resolve danh sách phòng họp
      if (item.room_ids) {
        mapped['roomIds'] = item.room_ids
          .split(',')
          .filter(Boolean)
          .map((rid: string) => roomMap[rid] ?? rid);
      }

      // 5f. Trạng thái cuộc họp theo action mới nhất
      mapped['meetingState'] = mapActionToLabelMeetingHistory(item.meeting_state) || '-';

      return mapped;
    });
  }

  async getTasksByUser(
    meetingId: string,
    userId: string,
    type: 'meeting' | 'unit' | 'user' | 'all' = 'all',
  ) {
    // 1️⃣ Lấy participant của user trong meeting
    const participant = await this.participantRepo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.unit', 'u')
      .innerJoin('u.meeting', 'm')
      .where('p.userId = :userId', { userId })
      .andWhere('m.id = :meetingId', { meetingId })
      .getOne();

    if (!participant) return [];

    const participantId = participant.id;
    const meetingUnitId = participant.unit?.id;
    const meetingUnitCode = participant.unit?.unitId;

    // 2️⃣ Lấy tất cả task của cuộc họp
    const allTasks = await this.taskRepo.find({
      where: { meetingId },
      order: { deadline: 'ASC' },
    });

    // 3️⃣ Nếu type = 'unit', lấy unit dựa vào userContext (receiverUnit)
    let receiverUnitId: string | null = null;
    if (type === 'unit') {
      const [userRoleRes, userRes] = await Promise.all([
        this.userService.getUserRole(userId), // lấy roles nếu cần
        this.userRepo.findOne({
          where: { id: userId },
          relations: ['parent'], // parent là đơn vị
          select: ['id'],
        }),
      ]);

      receiverUnitId = userRes?.parent?.id ?? null;
    }

    // 4️⃣ Lọc task theo type
    const filteredTasks = allTasks.filter((t) => {
      switch (type) {
        case 'all':
          if (t.attachableType === 'MEETING') return true;
          if (
            t.attachableType === 'PARTICIPANT' &&
            t.attachableId === participantId
          )
            return true;
          if (
            t.attachableType === 'UNIT' &&
            meetingUnitId &&
            meetingUnitCode &&
            !['CHAIRMAN_UNIT', 'SECRETARY_UNIT'].includes(meetingUnitCode) &&
            t.attachableId === meetingUnitId
          )
            return true;
          return false;

        case 'meeting':
          return t.attachableType === 'MEETING';

        case 'user':
          return (
            t.attachableType === 'PARTICIPANT' &&
            t.attachableId === participantId
          );

        case 'unit':
          return (
            t.attachableType === 'UNIT' && t.attachableId === receiverUnitId
          );

        default:
          return false;
      }
    });

    // 5️⃣ Map về DTO
    return filteredTasks.map((t) => ({
      id: t.id,
      content: t.content ?? '',
      documentName: t.documentName ?? '',
      deadline: t.deadline,
      attachableType: t.attachableType,
      attachableRole: t.attachableRole ?? '',
      createdAt: t.createdAt,
    }));
  }

  // Lịch sử các cuộc họp của phòng ban
  async listMeetingUnitHistory(
    query: CreateMeetingDto,
    userId: string,
    authorId?: string,
    req?: any
  ) {
    const {
      roomId,
      filter,
      processFn,
      authority,
      type,
      page = 1,
      limit = 20,
    } = query;

    // ====== Authority check ======
    if (authority === 'true' && authorId) userId = authorId;

    // ====== Validation ======
    if (!roomId?.length) {
      throw new BadRequestException('roomId không được rỗng');
    }

    const [pool, userRoleRes, featureManagement, userRes] = await Promise.all([
      this.getPool(),
      this.userService.getUserRole(userId),
      this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      }),
      this.userRepo.findOne({
        where: { id: userId },
        relations: ['parent'],
        select: ['id'],
      }),
    ]);

    const { roles } = userRoleRes;
    const receiverUnit = userRes?.parent?.id ?? '';
    const userContext = { userId, roles, receiverUnit };

    const ALLOWED_TYPES = ['day', 'week', 'month'] as const;
    if (type && !ALLOWED_TYPES.includes(type as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: ALLOWED_TYPES,
      });
    }

    // ====== Build filter criteria ======
    const criteria: Array<{
      name: string;
      operator: string;
      value: string | string[];
    }> = [];
    if (filter && typeof filter === 'object') {
      Object.entries(filter).forEach(([key, value]) => {
        if (!value) return;
        if (typeof value === 'object') {
          const val = value as {
            startDate?: string;
            endDate?: string;
            value?: string;
          };
          if (val.startDate && val.endDate)
            criteria.push({
              name: key,
              operator: 'between',
              value: [String(val.startDate), String(val.endDate)],
            });
          else if (val.startDate)
            criteria.push({
              name: key,
              operator: 'gte',
              value: String(val.startDate),
            });
          else if (val.endDate)
            criteria.push({
              name: key,
              operator: 'lte',
              value: String(val.endDate),
            });
          else if (val.value !== undefined && val.value !== null)
            criteria.push({
              name: key,
              operator: 'like',
              value: String(val.value),
            });
        } else {
          const operator = typeof value === 'string' ? 'like' : 'eq';
          criteria.push({ name: key, operator, value: String(value) });
        }
      });
    }

    const featureCriteria = featureManagement?.criteria ?? [];
    const { sql: filterFeature, from } = buildMeetingCriteriaHelper(
      [...featureCriteria, ...criteria],
      'meetings',
      featureManagement,
    );

    // ====== Step 1: Lọc + phân trang (chỉ lấy id) ======
    const where: string[] = [`(${from}.status = '1')`];

    // THAY ĐỔI CHÍNH: Lọc theo room_id
    const sanitizedRoomId = String(roomId).replace(/'/g, "''");
    where.push(`(
      ${from}.room_ids = '${sanitizedRoomId}'
      OR ${from}.room_ids LIKE '${sanitizedRoomId},%'
      OR ${from}.room_ids LIKE '%,${sanitizedRoomId},%'
      OR ${from}.room_ids LIKE '%,${sanitizedRoomId}'
    )`);

    if (filterFeature) where.push(`(${filterFeature})`);

    if (type === 'day' && filter?.currentDate) {
      where.push(
        `${from}.meeting_date >= '${filter.currentDate}' AND ${from}.meeting_date < DATEADD(day, 1, '${filter.currentDate}')`,
      );
    } else if (type === 'week' && filter?.currentWeek) {
      const { startDate, endDate } = filter.currentWeek;
      where.push(
        `${from}.meeting_date >= '${startDate}' AND ${from}.meeting_date <= '${endDate}'`,
      );
    } else if (type === 'month' && filter?.currentMonth) {
      const [year, month] = String(filter.currentMonth).split('-');
      where.push(
        `${from}.meeting_date >= '${year}-${month}-01' AND ${from}.meeting_date < DATEADD(month, 1, '${year}-${month}-01')`,
      );
    }

    const whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';

    const limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;

    const totalSql = `SELECT COUNT(*) AS total FROM ${this.dbname}.${from} ${whereClause} AND ${from}.status = '1' `;
    const idsSql = `
      SELECT id FROM ${this.dbname}.${from}
      ${whereClause} AND ${from}.status = '1'
      ORDER BY ${from}.meeting_date DESC, ${from}.meeting_time DESC
      OFFSET ${offsetNum} ROWS FETCH NEXT ${limitNum} ROWS ONLY
    `;

    let totalResult, idsResult;
    try {
      [totalResult, idsResult] = await Promise.all([
        pool.request().query(totalSql),
        pool.request().query(idsSql),
      ]);
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException(
        'Lỗi truy vấn lịch họp theo phòng',
      );
    }

    const total = totalResult.recordset[0]?.total ?? 0;
    const meetingIds = idsResult.recordset.map((row) => row.id);
    if (!meetingIds.length)
      return {
        success: true,
        items: [],
        message: 'Không có dữ liệu',
        total: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
      };

    const idsList = meetingIds.map((id) => `'${id}'`).join(',');

    const { dbKeys: meetingFields, aliases, allFilterFields } = await this.configurationService.buildFilterFieldsMeetings(from, [], processFn);
    const aliasFields = [
      'unitGuest',
      'seatAssignment',
      'leaderState',
      'participatingComponents',
      'documentPrepared',
      'participationRole',
      'delegatedFromUser',
      'meetingDuration',
    ];

    aliasFields.forEach((f) => {
      const snake = f.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allFilterFields.includes(f) || allFilterFields.includes(snake)) {
        aliases[f] = f;
      }
    });
    const detailsSql = `
      SELECT
        ${meetingFields.join(',\n')},
        (SELECT u.parent
        FROM ${this.dbname}.users u
        WHERE u.id = ${from}.created_by) AS created_by_parent,
        (SELECT mp.user_id, mp.seat_number, mu.room_id
        FROM meeting_participants mp
        INNER JOIN meeting_units mu ON mp.meeting_unit_id = mu.id
        WHERE mu.meeting_id = ${from}.id
        FOR JSON PATH) AS participants_json,
        (SELECT om.meeting_link
        FROM online_meetings om
        WHERE om.id = ${from}.online_meeting_id
        FOR JSON PATH) AS online_meeting_json,
        (SELECT a.receiver, a.receiver_unit, a.stage_status, a.roleProcess, a.role, a.action, a.deadline, a.details
        FROM ${this.dbname}.audit a
        WHERE a.document_id = ${from}.id_str
        FOR JSON PATH) AS audit_json
      FROM ${this.dbname}.${from}
      WHERE ${from}.id IN (${idsList})
    `;

    const details = `Truy cập Danh sách lịch sử dụng phòng, trang: ${page}, limit: ${limit}`;
    let detailsResult;
    try {
      detailsResult = await pool.request().query(detailsSql);

      const items = detailsResult.recordset;

      const detailedItemsMapped = await this.mapDocKeyMeetingHistory(
        items,
        aliases,
        authority,
        userContext,
      );
      this.logAsync(req, userId, details, 'SUCCESS');

      return {
        success: true,
        items: detailedItemsMapped,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };
    } catch (e) {
      this.logAsync(req, userId, details, 'ERROR');
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi truy vấn chi tiết lịch họp');
    }

  }

  async unitConfirmJoinMeeting(
    meetingId: string,
    userId: string,
    authorId?: string,
    workItemId?: string,
    payload?: any,
    authority = false,
  ) {
    const meeting = await this.sqlRepo.getMeeting(meetingId);
    const bpmnXML = await this.sqlRepo.getBpmnFile(meeting.bpmnVersion);
    const userRes = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['parent'], // parent là đơn vị
      select: ['id'],
    });
    const receiverUnit = userRes?.parent?.id ?? undefined;
    let result;
    if (workItemId) {
      result = await this.runtimeDbService.processMeetingWorkItem({
        bpmnXML,
        meetingId,
        workItemId,
        payload: payload || {},
        userId,
        author: authority && authorId ? authorId : userId,
        bpmnVersion: meeting.bpmnVersion,
        receiverUnit,
      });
    }
    if (result) {
      // this.calendarService.pushSync(meetingId);
    }

    return result
      ? this.getDetail(meetingId, userId, 'PROCESS_MEETING')
      : { success: false, message: 'Lỗi, Xác nhận tham gia không thành công' };
  }

  async userCancelJoinMeeting(
    meetingId: string,
    userId: string,
    authorId?: string,
    workItemId?: string,
    payload?: any,
    authority = false,
  ) {
    const meeting = await this.sqlRepo.getMeeting(meetingId);
    const bpmnXML = await this.sqlRepo.getBpmnFile(meeting.bpmnVersion);

    if (payload?.actionCode) {
      const targetAssignee = authority && authorId ? authorId : userId;
      const workItems = await this.sqlRepo.getWorkItemsByDocumentId(meetingId);
      const openWis = workItems.filter(
        wi => wi.assigneeUserId === targetAssignee && wi.state === 'open'
      );

      const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);
      const actionCodeUpper = payload.actionCode.toUpperCase();

      const matchedWi = openWis.find(wi => {
        if (wi.actionCode && wi.actionCode.toUpperCase() === actionCodeUpper) {
          return true;
        }
        const node = indexes.nodes.get(wi.nodeId);
        if (node) {
          let outs = indexes.outgoingBySource.get(node.id) || [];
          for (const f of outs) {
            const target = f.targetRef;
            if (
              target &&
              (target.$type === 'bpmn:ExclusiveGateway' ||
                target.$type === 'bpmn:InclusiveGateway' ||
                target.$type === 'bpmn:Gateway')
            ) {
              outs = indexes.outgoingBySource.get(target.id) || [];
              break;
            }
          }
          const hasMatchingFlow = outs.some((f: any) => {
            const ext = getAllNodeExtensionProperties(f);
            return (
              (ext?.actionCode && ext.actionCode.toUpperCase() === actionCodeUpper) ||
              (f.name && f.name.toUpperCase() === actionCodeUpper) ||
              f.id === actionCodeUpper
            );
          });
          if (hasMatchingFlow) {
            return true;
          }
        }
        return false;
      });

      if (matchedWi?.id) {
        workItemId = matchedWi.id;
      }
    }

    if (!workItemId) {
      throw new BadRequestException('workItemId is required');
    }

    const result = await this.runtimeDbService.processMeetingWorkItem({
      bpmnXML,
      meetingId,
      workItemId,
      payload: payload || {},
      userId,
      author: authority && authorId ? authorId : userId,
      bpmnVersion: meeting.bpmnVersion,
    });

    return result
      ? this.getDetail(meetingId, userId)
      : { success: false, message: 'Lỗi, Hủy tham gia không thành công' };
  }

  async userConfirmJoinMeeting(
    meetingId: string,
    userId: string,
    authorId?: string,
    workItemId?: string,
    payload?: any,
    authority = false,
  ) {
    const meeting = await this.sqlRepo.getMeeting(meetingId);
    const bpmnXML = await this.sqlRepo.getBpmnFileorRelate(meeting.bpmnVersion);

    if (!workItemId) {
      throw new BadRequestException('workItemId is required');
    }

    const result = await this.runtimeDbService.processMeetingWorkItem({
      bpmnXML,
      meetingId,
      workItemId,
      payload: payload || {},
      userId,
      author: authority && authorId ? authorId : userId,
      bpmnVersion: meeting.bpmnVersion,
    });

    if (result) {
      // ===== GOOGLE CALENDAR SYNC =====
      try {
        const participant = await this.meetingParticipantRepo.findOne({
          where: {
            userId,
            unit: {
              meetingId,
            },
          },
          relations: ['unit'],
        });

        if (participant) {
          if (!meeting.meetingDate) {
            this.logger.warn(
              `Cannot sync: Meeting ${meetingId} has no meetingDate`,
            );
            return;
          }

          const startTimeStr =
            meeting.meetingTime?.split('-')[0] || '09:00';
          const endTimeStr =
            meeting.meetingTime?.split('-')[1] || '10:00';

          let meetingDateStr: string;

          if (typeof meeting.meetingDate === 'string') {
            // nếu đã là YYYY-MM-DD thì dùng luôn
            if (meeting.meetingDate.includes('-')) {
              meetingDateStr = meeting.meetingDate;
            } else {
              // fallback nếu lỡ có DD/MM/YYYY
              const [day, month, year] = meeting.meetingDate.split('/');
              meetingDateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          } else {
            // ⚠️ KHÔNG dùng toISOString → lệch timezone
            const d = new Date(meeting.meetingDate);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            meetingDateStr = `${year}-${month}-${day}`;
          }

          // ✅ giữ nguyên timezone +07:00
          const startDateTime = `${meetingDateStr}T${startTimeStr}:00+07:00`;
          const endDateTime = `${meetingDateStr}T${endTimeStr}:00+07:00`;

          const eventInput: GoogleCalendarEventInput = {
            title: meeting.title,
            description: meeting.content,
            startTime: startDateTime,
            endTime: endDateTime,
          };

          this.backgroundGoogleCalendarSyncService.queueParticipantSync(
            participant.id,
            meetingId,
            eventInput,
          );
        }
      } catch (error) {
        this.logger.error(
          'Error queuing Google Calendar sync after user confirmation:',
          error,
        );
      }

      return this.getDetail(meetingId, userId);
    }

    return { success: false, message: 'Xác nhận tham gia cá nhân thất bại' };
  }

  // Phòng hoàn thành xử lý
  async unitFinishMeeting(
    meetingId: string,
    userId: string,
    authorId?: string,
    workItemId?: string,
    payload?: any,
    authority = false,
  ) {
    const meeting = await this.sqlRepo.getMeeting(meetingId);
    const bpmnXML = await this.sqlRepo.getBpmnFile(meeting.bpmnVersion);
    const userRes = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['parent'], // parent là đơn vị
      select: ['id'],
    });
    const receiverUnit = userRes?.parent?.id ?? undefined;
    let result;
    if (workItemId) {
      result = await this.runtimeDbService.finishMeetingWorkItem({
        bpmnXML,
        meetingId,
        workItemId,
        payload: payload || {},
        userId,
        author: authority && authorId ? authorId : userId,
        bpmnVersion: meeting.bpmnVersion,
        receiverUnit,
      });
    }
    return result
      ? this.getDetail(meetingId, userId)
      : { success: false, message: 'Lỗi, Xác nhận tham gia không thành công' };
  }

  // Người tham gia hoàn thành xử lý
  async userFinishMeeting(
    meetingId: string,
    userId: string,
    authorId?: string,
    workItemId?: string,
    payload?: any,
    authority = false,
  ) {
    const meeting = await this.sqlRepo.getMeeting(meetingId);
    const bpmnXML = await this.sqlRepo.getBpmnFile(meeting.bpmnVersion);

    if (!workItemId) {
      throw new BadRequestException('workItemId is required');
    }

    const result = await this.runtimeDbService.finishMeetingWorkItem({
      bpmnXML,
      meetingId,
      workItemId,
      payload: payload || {},
      userId,
      author: authority && authorId ? authorId : userId,
      bpmnVersion: meeting.bpmnVersion,
      // KHÔNG TRUYỀN receiverUnit → isPersonal = true
    });

    return result
      ? this.getDetail(meetingId, userId)
      : { success: false, message: 'Xác nhận tham gia cá nhân thất bại' };
  }


  //  Xác nhận xử lý
  async updateUnitStateToProcessing(meetingId: string, userId: string) {
    const pool = await this.getPool();

    await pool
      .request()
      .input('meetingId', sql.UniqueIdentifier, meetingId)
      .input('userId', sql.VarChar, userId).query(`
        UPDATE ${this.dbname}.meeting_units
        SET unit_state = 'PROCESSING',
        accept_join = 1
        WHERE meeting_id = @meetingId
          AND unit_id = (
            SELECT parent FROM ${this.dbname}.users WHERE id = @userId
          )
          AND unit_state = 'CONFIRMED';
      `);
  }

  // Chuyển trạng thái thành đang gán chỗ
  async assignmentToProcessing({
    meetingId,
    userId,
  }: {
    meetingId: string;
    userId: string;
  }) {
    try {
      // 1. Update trạng thái gán chỗ
      await this.meetingRepo.update(
        { id: meetingId },
        { isAssigningSeat: AssigningSeatStatus.ASSIGNING },
      );

      // 2. Trả detail
      return await this.getDetail(
        meetingId,
        userId,
        'SEAT_ASSIGNMENT_MEETING',
      );
    } catch (err) {
      this.logger.error('Error in assignmentToProcessing:', err);
      return {
        success: false,
        message: err?.message || 'Đã xảy ra lỗi',
      };
    }
  }



  // Xác nhận xử lý của cá nhân
  async updateParticipantStateToProcessing(
    meetingId: string,
    userId: string,
  ) {
    const pool = await this.getPool();

    // 1. Lấy tất cả meeting_unit_id của meetingId
    const unitsResult = await pool.request()
      .input('meetingId', meetingId)
      .query(`
        SELECT id
        FROM ${this.dbname}.meeting_units WITH (NOLOCK)
        WHERE meeting_id = @meetingId
      `);

    const meetingUnitIds = unitsResult.recordset
      .map(r => r.id)
      .filter(Boolean);

    if (meetingUnitIds.length === 0) return;

    // 2. Cập nhật trực tiếp không dùng join
    const reqUpdate = pool.request();
    reqUpdate.input('userId', userId);

    meetingUnitIds.forEach((val, idx) => {
      reqUpdate.input(`mu_id_${idx}`, val);
    });
    const muInClause = meetingUnitIds.map((_, idx) => `@mu_id_${idx}`).join(',');

    await reqUpdate.query(`
      UPDATE ${this.dbname}.meeting_participants WITH (ROWLOCK)
      SET participant_state = 'PROCESSING'
      WHERE meeting_unit_id IN (${muInClause})
        AND user_id = @userId
        AND participant_state = 'CONFIRMED'
    `);
  }
  // Thu hôi 
  async userRecallMeeting({
    meetingId,
    userId,
    author,
    payload,
    req
  }: {
    meetingId: string;
    userId: string;
    author?: string;
    payload?: any;
    req?: any;
  }) {

    const details = `Thu hồi cuộc họp, ID cuộc họp: ${meetingId}`;
    try {
      const meeting = await this.sqlRepo.getMeeting(meetingId);
      const bpmnXML = await this.sqlRepo.getBpmnFile(meeting.bpmnVersion);

      if (!meeting) {
        throw new BadRequestException('Không tìm thấy cuộc họp');
      }

      const result = await this.runtimeDbService.recallMeeting({
        bpmnXML,
        meetingId,
        payload: payload || {},
        userId,
        author: author || userId,
        bpmnVersion: meeting.bpmnVersion,
      });
      this.logAsync(req, userId, details, 'SUCCESS');

      this.backgroundGoogleCalendarSyncService.queueMeetingCancellation(meetingId);

      return result
        ? this.getDetail(meetingId, userId)
        : {
          success: false,
          message: 'Thu hồi cuộc họp thất bại',
        };
    } catch (error) {
      this.logAsync(req, userId, details, 'ERROR');
      this.logger.error(error);
      throw new InternalServerErrorException('Lỗi truy vấn dữ liệu lịch họp');
    }
  }



  // Lấy trạng thái các phòng tham gia cuộc họp
  async getMeetingUnitStates(meetingId: string) {
    const pool = await this.getPool();

    const result = await pool
      .request()
      .input('meetingId', sql.UniqueIdentifier, meetingId).query(`
        SELECT
          mu.unit_id,
          mu.unit_state,
          mu.seat_number,
          mu.room_id
        FROM ${this.dbname}.meeting_units mu
        WHERE mu.meeting_id = @meetingId;
      `);

    return result.recordset;
  }

  async getUnitState(
    meetingId: string,
    userId: string,
  ): Promise<UnitState | null> {
    const pool = await this.getPool();

    const rs = await pool
      .request()
      .input('meetingId', sql.UniqueIdentifier, meetingId)
      .input('userId', userId).query(`
        SELECT mu.unit_state
        FROM ${this.dbname}.meeting_units mu
        JOIN ${this.dbname}.users u
          ON u.parent = mu.unit_id
        WHERE mu.meeting_id = @meetingId
          AND u.id = @userId
      `);

    return rs.recordset[0]?.unit_state ?? null;
  }

  // async isMeetingApproved(documentId: string): Promise<boolean> {
  //   const pool = await this.getPool();

  //   const rs = await pool
  //     .request()
  //     .input('documentId', documentId)
  //     .query(`
  //       SELECT 1
  //       WHERE EXISTS (
  //         SELECT 1
  //         FROM ${this.dbname}.audit WITH (NOLOCK)
  //         WHERE document_id = @documentId
  //           AND stage_status = 'DONG_Y_PHE_DUYET'
  //       )
  //     `);

  //   return rs.recordset.length > 0;
  // }
  async isMeetingApproved(meetingId: string): Promise<boolean> {
    const pool = await this.getPool();

    const rs = await pool.request()
      .input('meetingId', meetingId)
      .query(`
        SELECT stage_status
        FROM ${this.dbname}.meetings WITH (NOLOCK)
        WHERE id = @meetingId
      `);

    return rs.recordset[0]?.stage_status === 'DONG_Y_PHE_DUYET';
  }
  async isMeetingRejected(meetingId: string): Promise<boolean> {
    const pool = await this.getPool();

    const rs = await pool.request()
      .input('meetingId', meetingId)
      .query(`
        SELECT stage_status
        FROM ${this.dbname}.meetings WITH (NOLOCK)
        WHERE id = @meetingId
      `);

    return rs.recordset[0]?.stage_status === 'BI_HUY' || rs.recordset[0]?.stage_status === 'TU_CHOI_PHE_DUYET';
  }
  async isRoomRejected(meetingId: string): Promise<boolean> {
    const pool = await this.getPool();

    const rs = await pool.request()
      .input('meetingId', meetingId)
      .query(`
        SELECT TOP 1 stage_status, action_code
        FROM ${this.dbname}.audit WITH (NOLOCK)
        WHERE document_id = @meetingId
          AND (receiver = 'BAN_QUAN_LY_PHONG' OR action_code = 'TU_CHOI_LICH')
        ORDER BY created_at DESC, id DESC
      `);

    const topAudit = rs.recordset[0];
    return topAudit?.stage_status === 'TU_CHOI_PHE_DUYET' || topAudit?.action_code === 'TU_CHOI_LICH';
  }
  // Check xem có phải người phê duyệt hay không
  async isMeetingApprovedByUser(
    meetingId: string,
    userId: string,
  ): Promise<boolean> {
    const pool = await this.getPool();

    const rs = await pool
      .request()
      .input('meetingId', meetingId)
      .input('userId', userId)
      .query(`
        SELECT TOP 1 1
        FROM ${this.dbname}.audit WITH (NOLOCK)
        WHERE document_id = @meetingId
          AND stage_status IN( 'DONG_Y_PHE_DUYET', 'TU_CHOI_PHE_DUYET' )
          AND processed_by = @userId
      `);

    return rs.recordset.length > 0;
  }

  // async isMeetingApprovedByUser(
  //   meetingId: string,
  //   userId: string,
  // ): Promise<boolean> {

  //   const audit = await this.getMeetingAuditCached(meetingId);

  //   return audit.processedUsers.has(userId);
  // }

  async getUserParticipantMeeting(
    query: GetMeetingParticipantsQueryDto,
    meetingId: string,
  ) {
    // ===== 1. Validation & parse query =====
    if (!meetingId) {
      throw new BadRequestException('meetingId là bắt buộc');
    }

    const includeDelegated = query.includeDelegated === 'true';
    const rawFilter = query.filter ?? {};

    const allowedFilterKeys = ['name', 'orgUnitId', 'attendanceState', 'notCheck'];
    const invalidKeys = Object.keys(rawFilter).filter(
      (k) => !allowedFilterKeys.includes(k),
    );
    if (invalidKeys.length > 0) {
      throw new BadRequestException(
        `Filter không hợp lệ: ${invalidKeys.join(', ')}`,
      );
    }

    const pool = await this.getPool();
    const request = pool.request();

    // ===== 2. Build filter SQL =====
    let filterSql = '';

    if (rawFilter.name) {
      filterSql += ` AND u_final.name LIKE @name `;
      request.input('name', `%${rawFilter.name}%`);
    }

    if (rawFilter.orgUnitId) {
      filterSql += ` AND ou_final.name LIKE @orgUnitName `;
      request.input('orgUnitName', `%${rawFilter.orgUnitId}%`);
    }

    if (rawFilter.notCheck !== undefined) {
      filterSql += ` AND pd.notCheck = @notCheck `;
      request.input('notCheck', rawFilter.notCheck);
    }

    if (rawFilter.attendanceState) {
      switch (rawFilter.attendanceState) {
        case 'RECEIVED':
          filterSql += `
            AND pd.notCheck = 0
            AND pd.attendanceState = 'RECEIVED'
          `;
          break;

        case 'CHECKED':
          filterSql += `
            AND pd.attendanceState = 'CHECKED'
          `;
          break;

        case 'NOT_CHECKED':
          filterSql += `
            AND pd.attendanceState = 'NOT_CHECKED'
          `;
          break;

        case 'NO_REQUIRED':
          filterSql += `
            AND pd.attendanceState = 'NOT_REQUIRED'
          `;
          break;
      }
    }

    // ===== 3. SQL chính (ĐÃ SỬA LOGIC ỦY QUYỀN) =====
    const sql = `
      WITH participant_data AS (
        SELECT DISTINCT

          -- User cuối cùng (gốc hoặc được ủy quyền)
          CASE 
            WHEN mp.assignment_type = 'DELEGATED'
              AND mp.delegated_to_user_id IS NOT NULL
              AND mp.delegation_state = 'ACCEPTED'
            THEN mp.delegated_to_user_id
            ELSE mp.user_id
          END AS finalUserId,

          -- Thông tin gốc
          mp.user_id AS originalUserId,
          mp.delegated_to_user_id AS delegatedToUserId,
          mp.assignment_type AS assignmentType,
          mp.delegation_state AS delegationState,

          mp.id AS participantId,
          CAST(mp.not_check AS bit) AS notCheck,
          mp.attendance_state AS attendanceState

        FROM ${this.dbname}.meeting_participants mp
        INNER JOIN ${this.dbname}.meeting_units mu
          ON mp.meeting_unit_id = mu.id
        WHERE mu.meeting_id = @meetingId
          AND (mp.participant_role IS NULL OR mp.participant_role <> 'CHAIRMAN')
          AND mp.participant_state IN ('PENDING', 'RECEIVED', 'CONFIRMED', 'PROCESSING', 'DONE')
      )

      SELECT
        pd.*,

        -- 🔥 User cuối cùng
        u_final.name AS userName,
        u_final.parent AS orgUnitId,
        ou_final.name AS orgUnitName,

        -- 🔥 Phòng user gốc
        u_original.parent AS originalOrgUnitId,
        ou_original.name AS originalOrgUnitName,

        COUNT(1) OVER() AS totalParticipants,
        SUM(CASE WHEN pd.notCheck = 1 THEN 1 ELSE 0 END) OVER() AS notCheckCount,
        SUM(CASE WHEN pd.attendanceState = 'CHECKED' THEN 1 ELSE 0 END) OVER() AS presentCount,
        SUM(CASE WHEN pd.attendanceState = 'RECEIVED' THEN 1 ELSE 0 END) OVER() AS notCheckedInCount,
        SUM(CASE WHEN pd.attendanceState = 'NOT_CHECKED' THEN 1 ELSE 0 END) OVER() AS absentCount

      FROM participant_data pd

      LEFT JOIN ${this.dbname}.users u_final
        ON u_final.id = pd.finalUserId

      LEFT JOIN ${this.dbname}.organization_units ou_final
        ON ou_final.id = u_final.parent

      LEFT JOIN ${this.dbname}.users u_original
        ON u_original.id = pd.originalUserId

      LEFT JOIN ${this.dbname}.organization_units ou_original
        ON ou_original.id = u_original.parent

      WHERE 1=1
      ${filterSql};
    `;

    request.input('meetingId', meetingId);
    request.input('includeDelegated', includeDelegated ? 1 : 0);

    // ===== 4. Query DB =====
    const result = await request.query(sql);
    const rows = result?.recordset ?? [];

    if (rows.length === 0) {
      return {
        totalParticipants: 0,
        notCheckCount: 0,
        presentCount: 0,
        absentCount: 0,
        notCheckedInCount: 0,
        participants: [],
      };
    }

    const {
      totalParticipants,
      notCheckCount,
      presentCount,
      absentCount,
      notCheckedInCount,
    } = rows[0];

    // ===== 5. Map result =====
    const participants = await Promise.all(
      rows.map(async (row) => {
        const role = await this.sqlRepo.getUserRole(row.finalUserId);

        const isDelegated =
          row.assignmentType === 'DELEGATED' &&
          row.delegatedToUserId &&
          row.delegationState === 'ACCEPTED';

        return {
          participantId: row.participantId,

          orgUnit: row.orgUnitId
            ? {
              id: row.orgUnitId,
              name: row.orgUnitName,
            }
            : null,
          user: {
            isDelegated,

            id: row.finalUserId,
            name: row.userName,


            idOriginal: row.originalUserId,
            nameOriginal: await this.getUserNameById(row.originalUserId) || row.originalUserId, // nếu bạn có select
            orgUnitOriginal: row.originalOrgUnitId
              ? {
                id: row.originalOrgUnitId,
                name: row.originalOrgUnitName,
              }
              : null,
          },

          participantRole: role?.roles,
          notCheck: Boolean(row.notCheck),
          attendanceState: this.meetingMapper.mapAttendanceState(
            row.attendanceState,
          ),
        };
      }),
    );

    // ===== 6. Return =====
    return {
      totalParticipants,
      notCheckCount,
      presentCount,
      absentCount,
      notCheckedInCount,
      participants,
    };
  }

  async softDeleteMeetings(ids: string[], originalUserId: string, req?: any) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('ids không được để trống');
    }
    const details = `Xóa các cuộc họp với list ID ${ids}`;
    try {
      // 1️⃣ Kiểm tra meeting có thể xóa hay không
      const placeholders = ids.map((_, i) => `@id${i}`).join(', ');
      const pool = await this.getPool();
      const checkRequest = pool.request();
      ids.forEach((id, i) =>
        checkRequest.input(`id${i}`, sql.UniqueIdentifier, id),
      );

      const checkSql = `
        SELECT id
        FROM meetings
        WHERE id IN (${placeholders})
          AND status != '${STATUS.DELETED}'
      `;

      const checkResult: sql.IResult<any> = await checkRequest.query(checkSql);
      const validIds = checkResult.recordset.map((r) => r.id);

      if (validIds.length !== ids.length) {
        const invalidIds = ids.filter((id) => !validIds.includes(id));
        throw new BadRequestException(
          `Không thể xóa các lịch họp sau (đã bị xóa hoặc không tồn tại): ${invalidIds.join(', ')}`,
        );
      }

      // 2️⃣ Soft delete meeting
      const updateRequest = pool.request();
      ids.forEach((id, i) =>
        updateRequest.input(`id${i}`, sql.UniqueIdentifier, id),
      );

      const updateSql = `
        UPDATE meetings
        SET status = '${STATUS.DELETED}',
            updated_at = SYSDATETIME()
        WHERE id IN (${placeholders})
          AND status != '${STATUS.DELETED}'
      `;

      const updateResult: sql.IResult<any> =
        await updateRequest.query(updateSql);

      // 3️⃣ TODO: Xử lý bảng con
      // await this.deleteMeetingRelations(validIds);
      // await this.deleteMeetingParticipants(validIds);
      // await this.deleteMeetingAgendas(validIds);

      // 4️⃣ Google Calendar Sync Deletion
      for (const id of validIds) {
        try {
          this.backgroundGoogleCalendarSyncService.queueMeetingCancellation(id);
        } catch (err) {
          this.logger.error(`Queue calendar deletion failed for meeting ${id}: ${err.message}`);
        }
      }

      this.logAsync(req, originalUserId, details, 'SUCCESS');

      return {
        message: 'Xóa meeting thành công',
        affectedRows: updateResult.rowsAffected[0],
      };
    } catch (error) {
      this.logAsync(req, originalUserId, details, 'ERROR');
      console.error('Lỗi khi xóa meeting:', error);
      throw new InternalServerErrorException('Không thể xóa lịch họp');
    }
  }

  // Tab kết luận
  async getMeetingConclusionTabDetail(params: {
    meetingId: string;
  }): Promise<MeetingConclusionDetailResponse> {
    const { meetingId } = params;

    if (!meetingId) {
      throw new BadRequestException('meetingId là bắt buộc');
    }

    const pool = await this.getPool();
    const request = pool.request();
    request.input('meetingId', meetingId);

    // ====== Load dữ liệu ======

    // Files
    const filesSql = `
      SELECT 
        f.id,
        f.file_name,
        f.storage_type,
        f.file_path,
        fr.object_type
      FROM ${this.dbname}.file_relations fr
      INNER JOIN ${this.dbname}.files f ON fr.file_id = f.id
      WHERE fr.object_type = 'ConclusionMeeting' 
        AND fr.object_id = @meetingId
        AND fr.status = 1
      ORDER BY f.created_at DESC
    `;

    const filesResult = await request.query<MeetingFile>(filesSql);
    const files: MeetingFile[] = filesResult?.recordset ?? [];

    // Conclusions
    const recordsSql = `
      SELECT
        r.id,
        r.meeting_id AS meetingId,
        r.content,
        r.created_by AS createdBy,
        r.created_at AS createdAt
      FROM ${this.dbname}.meeting_conclusions r
      WHERE r.meeting_id = @meetingId
        AND r.status = 1
      ORDER BY r.created_at ASC
    `;

    const recordsResult = await request.query<MeetingConclusionRaw>(recordsSql);
    const conclusions: MeetingConclusionRaw[] = recordsResult?.recordset ?? [];

    // Tasks
    let tasks: MeetingTaskRaw[] = [];

    if (conclusions.length > 0) {
      const conclusionIds = conclusions.map((r) => r.id);

      const taskRequest = pool.request();
      taskRequest.input('meetingId', meetingId);

      const tasksSql = `
        SELECT 
          t.id,
          t.name        AS title,
          t.note        AS description,
          t.status,
          t.priority,
          t.created_by  AS assigneeId,
          t.created_at  AS createdAt,
          t.update_at   AS updatedAt,
          t.meeting_conclusion_id AS conclusionId
        FROM ${this.dbname}.task t
        WHERE t.meeting_id = @meetingId
          AND t.meeting_conclusion_id IN (${conclusionIds.join(',')})
          AND t.status IS NOT NULL
        ORDER BY t.created_at ASC
      `;

      const tasksResult = await taskRequest.query<MeetingTaskRaw>(tasksSql);
      tasks = tasksResult?.recordset ?? [];
    }

    // Related meetings
    const relatedMeetingsSql = `
      SELECT DISTINCT
        m.id,
        m.title,
        m.meeting_type AS meetingType,
        m.meeting_date AS meetingDate,
        m.meeting_time AS meetingTime,
        m.status,
        m.status_code AS statusCode,
        m.created_at AS createdAt,
        mr.relation_type AS relationType
      FROM ${this.dbname}.meeting_relations mr
      INNER JOIN ${this.dbname}.meetings m 
        ON (mr.related_meeting_id = m.id OR mr.meeting_id = m.id)
      WHERE (mr.meeting_id = @meetingId OR mr.related_meeting_id = @meetingId)
        AND m.id != @meetingId
      ORDER BY m.meeting_date DESC, m.created_at DESC
    `;

    const relatedMeetingsResult = await request.query<RelatedMeetingRaw>(
      relatedMeetingsSql,
    );
    const relatedMeetings: RelatedMeetingRaw[] =
      relatedMeetingsResult?.recordset ?? [];

    // ====== Thu thập userIds và fetch users (tránh N+1) ======
    const allUserIds = new Set<string>();

    conclusions.forEach((c) => {
      if (c.createdBy) allUserIds.add(c.createdBy);
    });

    tasks.forEach((t) => {
      if (t.assigneeId) allUserIds.add(t.assigneeId);
    });

    let userMap: Record<string, string> = {};

    if (allUserIds.size > 0) {
      const userIds = Array.from(allUserIds)
        .map((id) => `'${id}'`)
        .join(',');

      const usersSql = `
        SELECT id, name 
        FROM ${this.dbname}.users
        WHERE id IN (${userIds})
      `;

      const usersResult = await pool.request().query(usersSql);
      userMap = usersResult.recordset.reduce(
        (map, user) => {
          map[user.id] = user.name;
          return map;
        },
        {} as Record<string, string>,
      );
    }

    // ====== Map tasks vào conclusions ======
    const taskMap = new Map<number, MeetingTask[]>();

    for (const task of tasks) {
      if (!taskMap.has(task.conclusionId)) {
        taskMap.set(task.conclusionId, []);
      }

      const { conclusionId, assigneeId, createdAt, updatedAt, ...rest } = task;

      taskMap.get(task.conclusionId)!.push({
        ...rest,
        assignee: assigneeId
          ? {
            id: assigneeId,
            name: userMap[assigneeId] || null,
          }
          : null,
        createdAt: normalizeDateValueDDMMYYYY(createdAt),
        updatedAt: updatedAt ? normalizeDateValueDDMMYYYY(updatedAt) : null,
      });
    }

    // ====== Map conclusions ======
    const conclusionItems: ConclusionItem[] = conclusions.map((r) => ({
      id: r.id,
      meetingId: r.meetingId,
      content: r.content,
      createdBy: r.createdBy
        ? {
          id: r.createdBy,
          name: userMap[r.createdBy] || null,
        }
        : null,
      createdAt: normalizeDateValueDDMMYYYY(r.createdAt),
      tasks: taskMap.get(r.id) ?? [],
    }));

    // ====== Map related meetings ======
    const MEETING_TYPE_LABEL: Record<string, string> = {
      COMPANY: 'Tổng công ty',
      UNIT: 'Phòng ban',
      USER: 'Cá nhân',
    };

    const mappedRelatedMeetings: RelatedMeeting[] = relatedMeetings.map((m) => ({
      id: m.id,
      title: m.title,
      meetingType: MEETING_TYPE_LABEL[m.meetingType] ?? m.meetingType,
      meetingDate: normalizeDateValueDDMMYYYY(m.meetingDate),
      meetingTime: m.meetingTime,
      status: m.status,
      statusCode: m.statusCode,
      createdAt: normalizeDateValueDDMMYYYY(m.createdAt),
      relationType: m.relationType,
    }));

    return {
      files,
      conclusionItems,
      relatedMeetings: mappedRelatedMeetings,
    };
  }

  async addMeetingRelations(params: {
    meetingId: string;
    relatedMeetingIds: string[];
  }): Promise<{
    added: number;
    skipped: number;
    relations: MeetingRelationResponseDto[];
  }> {
    const { meetingId, relatedMeetingIds } = params;

    // 1. Validation
    if (!meetingId) {
      throw new BadRequestException('meetingId là bắt buộc');
    }

    if (!relatedMeetingIds || relatedMeetingIds.length === 0) {
      throw new BadRequestException(
        'relatedMeetingIds phải có ít nhất 1 phần tử',
      );
    }

    // 2. Init DB
    const pool = await this.getPool();

    // 3. Kiểm tra meeting tồn tại
    const checkMeetingRequest = pool.request();
    checkMeetingRequest.input('meetingId', meetingId);

    const checkMeetingSql = `
      SELECT id FROM ${this.dbname}.meetings 
      WHERE id = @meetingId
    `;

    const checkResult = await checkMeetingRequest.query(checkMeetingSql);

    if (!checkResult.recordset || checkResult.recordset.length === 0) {
      throw new NotFoundException(
        `Không tìm thấy cuộc họp với ID: ${meetingId}`,
      );
    }

    // 4. Kiểm tra các related meetings có tồn tại không
    const checkRelatedRequest = pool.request();

    const checkRelatedSql = `
      SELECT id FROM ${this.dbname}.meetings 
      WHERE id IN ('${relatedMeetingIds.join("','")}')
    `;

    const checkRelatedResult = await checkRelatedRequest.query(checkRelatedSql);
    const existingRelatedIds = checkRelatedResult.recordset.map((r) => r.id);

    // Lọc ra các ID không tồn tại
    const invalidIds = relatedMeetingIds.filter(
      (id) => !existingRelatedIds.includes(id),
    );

    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Các cuộc họp sau không tồn tại: ${invalidIds.join(', ')}`,
      );
    }

    // 5. Lấy các relations đã tồn tại (để skip duplicate)
    const checkExistingRequest = pool.request();
    checkExistingRequest.input('meetingId', meetingId);

    const checkExistingSql = `
      SELECT related_meeting_id 
      FROM ${this.dbname}.meeting_relations
      WHERE meeting_id = @meetingId
        AND related_meeting_id IN ('${relatedMeetingIds.join("','")}')
    `;

    const existingResult = await checkExistingRequest.query(checkExistingSql);
    const existingRelationIds = existingResult.recordset.map(
      (r) => r.related_meeting_id,
    );

    // Lọc ra các ID cần insert (chưa có relation)
    const idsToInsert = relatedMeetingIds.filter(
      (id) => !existingRelationIds.includes(id),
    );

    let insertedRelations: MeetingRelationResponseDto[] = [];
    let addedCount = 0;

    // 6. Insert relations mới
    if (idsToInsert.length > 0) {
      const insertRequest = pool.request();
      insertRequest.input('meetingId', meetingId);

      // Build VALUES clause
      const values = idsToInsert
        .map((relatedId) => `(@meetingId, '${relatedId}', 'reference')`)
        .join(',');

      const insertSql = `
        INSERT INTO ${this.dbname}.meeting_relations 
          (meeting_id, related_meeting_id, relation_type)
        OUTPUT 
          INSERTED.id,
          INSERTED.meeting_id,
          INSERTED.related_meeting_id,
          INSERTED.relation_type,
          INSERTED.created_at
        VALUES ${values}
      `;

      const insertResult = await insertRequest.query(insertSql);
      insertedRelations = insertResult.recordset.map((r) => ({
        id: r.id,
        meetingId: r.meeting_id,
        relatedMeetingId: r.related_meeting_id,
        relationType: r.relation_type,
        createdAt: r.created_at,
      }));

      addedCount = insertedRelations.length;
    }

    // 7. Return result
    return {
      added: addedCount,
      skipped: existingRelationIds.length,
      relations: insertedRelations,
    };
  }

  async removeMeetingRelations(params: {
    meetingId: string;
    relatedMeetingIds: string[];
  }): Promise<{ deleted: number }> {
    const { meetingId, relatedMeetingIds } = params;

    const pool = await this.getPool();
    const request = pool.request();
    request.input('meetingId', meetingId);

    const deleteSql = `
      DELETE FROM ${this.dbname}.meeting_relations
      WHERE meeting_id = @meetingId
        AND related_meeting_id IN ('${relatedMeetingIds.join("','")}')
    `;

    const result = await request.query(deleteSql);

    return {
      deleted: result.rowsAffected[0] || 0,
    };
  }

  /**
   * 1. Tạo meeting conclusion mới
   */
  async createMeetingConclusion(params: {
    meetingId: string;
    conclusions: Array<{
      content: string;
      createdBy?: string;
    }>;
  }): Promise<MeetingConclusionDto[]> {
    const { meetingId, conclusions } = params;

    // 1. Validation
    if (!meetingId) {
      throw new BadRequestException('meetingId là bắt buộc');
    }

    if (!conclusions || conclusions.length === 0) {
      throw new BadRequestException(
        'conclusions phải là mảng và có ít nhất 1 phần tử',
      );
    }

    conclusions.forEach((r, index) => {
      if (!r.content) {
        throw new BadRequestException(`conclusions[${index}].content là bắt buộc`);
      }
    });

    // 2. Init DB
    const pool = await this.getPool();
    const transaction = pool.transaction();

    await transaction.begin();

    try {
      // 3. Check meeting tồn tại
      const checkRequest = transaction.request();
      checkRequest.input('meetingId', meetingId);

      const checkSql = `
        SELECT id FROM ${this.dbname}.meetings 
        WHERE id = @meetingId
      `;

      const checkResult = await checkRequest.query(checkSql);
      if (checkResult.recordset.length === 0) {
        throw new NotFoundException(
          `Không tìm thấy cuộc họp với ID: ${meetingId}`,
        );
      }

      // 4. Build bulk insert
      const valuesSql: string[] = [];
      conclusions.forEach((_, index) => {
        valuesSql.push(`(@meetingId, @content${index}, @createdBy${index}, 1)`);
      });

      const insertRequest = transaction.request();
      insertRequest.input('meetingId', meetingId);

      conclusions.forEach((r, index) => {
        insertRequest.input(`content${index}`, r.content);
        insertRequest.input(`createdBy${index}`, r.createdBy || null);
      });

      const insertSql = `
        INSERT INTO ${this.dbname}.meeting_conclusions
          (meeting_id, content, created_by, status)
        OUTPUT
          INSERTED.id,
          INSERTED.meeting_id,
          INSERTED.content,
          INSERTED.created_by,
          INSERTED.created_at,
          INSERTED.updated_at,
          INSERTED.status
        VALUES ${valuesSql.join(',')}
      `;

      const result = await insertRequest.query(insertSql);

      await transaction.commit();

      return result.recordset.map((r) => ({
        id: r.id,
        meetingId: r.meeting_id,
        content: r.content,
        createdBy: r.created_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        status: r.status,
      }));
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * 2. Lấy danh sách conclusions theo meetingId
   */
  async getMeetingConclusions(params: {
    meetingId: string;
  }): Promise<MeetingConclusionDto[]> {
    const { meetingId } = params;

    if (!meetingId) {
      throw new BadRequestException('meetingId là bắt buộc');
    }

    const pool = await this.getPool();
    const request = pool.request();
    request.input('meetingId', meetingId);

    const sql = `
      SELECT
        r.id,
        r.meeting_id AS meetingId,
        r.content,
        r.created_by AS createdBy,
        r.created_at AS createdAt,
        r.updated_at AS updatedAt,
        r.status
      FROM ${this.dbname}.meeting_conclusions r
      WHERE r.meeting_id = @meetingId
        AND r.status = 1
      ORDER BY r.created_at ASC
    `;

    const result = await request.query(sql);

    return result.recordset.map((r) => ({
      id: r.id,
      meetingId: r.meetingId,
      content: r.content,
      createdBy: r.createdBy,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      status: r.status,
    }));
  }

  /**
   * 3. Lấy chi tiết 1 conclusion (có tasks)
   */
  async getMeetingConclusionDetail(params: {
    conclusionId: number;
    meetingId: string;
  }): Promise<MeetingConclusionWithTasksDto> {
    const { conclusionId, meetingId } = params;

    if (!conclusionId) {
      throw new BadRequestException('conclusionId là bắt buộc');
    }

    const pool = await this.getPool();

    // Lấy conclusion info
    const recordRequest = pool.request();
    recordRequest.input('conclusionId', conclusionId);

    const recordSql = `
      SELECT
        r.id,
        r.meeting_id AS meetingId,
        r.content,
        r.created_by AS createdBy,
        r.created_at AS createdAt,
        r.updated_at AS updatedAt,
        r.status
      FROM ${this.dbname}.meeting_conclusions r
      WHERE r.id = @conclusionId
        AND r.status = 1
    `;

    const recordResult = await recordRequest.query(recordSql);

    if (!recordResult.recordset || recordResult.recordset.length === 0) {
      throw new NotFoundException(`Không tìm thấy conclusion với ID: ${conclusionId}`);
    }

    const conclusion = recordResult.recordset[0];

    // Lấy tasks
    // Lấy tasks theo conclusion
    const taskRequest = pool.request();
    taskRequest.input('meetingId', meetingId);
    taskRequest.input('conclusionId', conclusionId);

    const taskSql = `
      SELECT 
        t.id,
        t.name        AS title,
        t.note        AS description,
        t.status,
        t.priority,
        t.created_by  AS assigneeId,
        t.created_at  AS createdAt,
        t.update_at   AS updatedAt
      FROM ${this.dbname}.task t
      WHERE t.meeting_id = @meetingId
        AND t.meeting_conclusion_id = @conclusionId
        AND t.status IS NOT NULL
      ORDER BY t.created_at ASC
    `;

    const taskResult = await taskRequest.query(taskSql);

    return {
      id: conclusion.id,
      meetingId: conclusion.meetingId,
      content: conclusion.content,
      createdBy: conclusion.createdBy,
      createdAt: conclusion.createdAt,
      updatedAt: conclusion.updatedAt,
      status: conclusion.status,
      tasks: taskResult.recordset.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assigneeId: t.assigneeId,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    };
  }

  async updateMeetingConclusionsAndRelations(params: {
    meetingId: string;
    conclusions: Array<{
      id: number;          // FE luôn gửi
      content: string;
      createdBy?: string;
    }>;
    relatedMeetingIds: string[];
  }): Promise<{
    updatedConclusions: MeetingConclusionDto[];
    relations: {
      added: number;
      removed: number;
      skipped: number;
      relations: MeetingRelationResponseDto[];
    };
  }> {
    const { meetingId, conclusions, relatedMeetingIds } = params;

    if (!meetingId) throw new BadRequestException('meetingId là bắt buộc');
    if (!Array.isArray(conclusions) || conclusions.length === 0)
      throw new BadRequestException('conclusions không hợp lệ');

    const uniqueRelatedIds = [...new Set(relatedMeetingIds ?? [])];

    const pool = await this.getPool();
    const tx = pool.transaction();
    await tx.begin();

    try {
      /** ================= CHECK MEETING ================= */
      const meetingCheck = await tx.request()
        .input('meetingId', meetingId)
        .query(`SELECT 1 FROM ${this.dbname}.meetings WHERE id = @meetingId`);

      if (!meetingCheck.recordset.length)
        throw new NotFoundException(`Meeting ${meetingId} không tồn tại`);

      /** ================= UPSERT CONCLUSIONS ================= */
      const updatedConclusions: MeetingConclusionDto[] = [];

      for (const c of conclusions) {
        if (!c.id) throw new BadRequestException('conclusion.id là bắt buộc');
        if (!c.content) throw new BadRequestException('conclusion.content là bắt buộc');

        // Kiểm tra existence trong DB
        const existing = await tx.request()
          .input('id', c.id)
          .input('meetingId', meetingId)
          .query(`
            SELECT id FROM ${this.dbname}.meeting_conclusions
            WHERE id = @id AND meeting_id = @meetingId
          `);

        // ===== UPDATE nếu tồn tại =====
        if (existing.recordset.length) {
          const updateRes = await tx.request()
            .input('id', c.id)
            .input('meetingId', meetingId)
            .input('content', c.content)
            .query(`
              UPDATE ${this.dbname}.meeting_conclusions
              SET content = @content,
                  updated_at = GETDATE()
              OUTPUT INSERTED.*
              WHERE id = @id AND meeting_id = @meetingId
            `);

          const r = updateRes.recordset[0];
          updatedConclusions.push(this.mapConclusion(r));
          continue;
        }

        // ===== INSERT nếu chưa tồn tại =====
        const insertRes = await tx.request()
          .input('meetingId', meetingId)
          .input('content', c.content)
          .input('createdBy', c.createdBy ?? null)
          .query(`
            INSERT INTO ${this.dbname}.meeting_conclusions
              (meeting_id, content, created_by, created_at, updated_at, status)
            OUTPUT INSERTED.*
            VALUES (@meetingId, @content, @createdBy, GETDATE(), GETDATE(), 1)
          `);

        const r = insertRes.recordset[0];
        updatedConclusions.push(this.mapConclusion(r));
      }

      /** ================= VALIDATE RELATED MEETINGS ================= */
      if (uniqueRelatedIds.length) {
        const req = tx.request();
        uniqueRelatedIds.forEach((id, i) => req.input(`rid${i}`, id));
        const inSql = uniqueRelatedIds.map((_, i) => `@rid${i}`).join(',');

        const exists = await req.query(`
          SELECT id FROM ${this.dbname}.meetings WHERE id IN (${inSql})
        `);

        const existingIds = new Set(exists.recordset.map(r => r.id));
        const invalid = uniqueRelatedIds.filter(id => !existingIds.has(id));

        if (invalid.length)
          throw new BadRequestException(`Meeting không tồn tại: ${invalid.join(', ')}`);
      }

      /** ================= SYNC RELATIONS ================= */
      let addedRelations: MeetingRelationResponseDto[] = [];

      if (uniqueRelatedIds.length) {
        const req = tx.request();
        req.input('meetingId', meetingId);
        uniqueRelatedIds.forEach((id, i) => req.input(`rid${i}`, id));

        const valuesSql = uniqueRelatedIds.map((_, i) => `(@meetingId, @rid${i}, 'reference')`).join(',');

        const insertRes = await req.query(`
          INSERT INTO ${this.dbname}.meeting_relations (meeting_id, related_meeting_id, relation_type)
          OUTPUT INSERTED.*
          SELECT v.meeting_id, v.related_meeting_id, v.relation_type
          FROM (VALUES ${valuesSql}) v(meeting_id, related_meeting_id, relation_type)
          WHERE NOT EXISTS (
            SELECT 1 FROM ${this.dbname}.meeting_relations mr
            WHERE mr.meeting_id = v.meeting_id
              AND mr.related_meeting_id = v.related_meeting_id
          )
        `);

        addedRelations = insertRes.recordset.map(this.mapRelation);
      }

      let removed = 0;
      {
        const req = tx.request().input('meetingId', meetingId);

        if (uniqueRelatedIds.length) {
          uniqueRelatedIds.forEach((id, i) => req.input(`keep${i}`, id));
        }

        const notInSql = uniqueRelatedIds.length
          ? `AND related_meeting_id NOT IN (${uniqueRelatedIds.map((_, i) => `@keep${i}`).join(',')})`
          : '';

        const delRes = await req.query(`
          DELETE FROM ${this.dbname}.meeting_relations
          WHERE meeting_id = @meetingId
          ${notInSql}
        `);

        removed = delRes.rowsAffected[0] || 0;
      }

      await tx.commit();

      return {
        updatedConclusions,
        relations: {
          added: addedRelations.length,
          removed,
          skipped: uniqueRelatedIds.length - addedRelations.length,
          relations: addedRelations,
        },
      };

    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  mapConclusion(r: any): MeetingConclusionDto {
    return {
      id: r.id,
      meetingId: r.meeting_id,
      content: r.content,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      status: r.status,
    };
  }

  mapRelation(r: any): MeetingRelationResponseDto {
    return {
      id: r.id,
      meetingId: r.meeting_id,
      relatedMeetingId: r.related_meeting_id,
      relationType: r.relation_type,
      createdAt: r.created_at,
    };
  }


  /**
   * 4. Cập nhật meeting conclusion
   */
  async updateMeetingConclusion(params: {
    conclusionId: number;
    content?: string;
    status?: number;
  }): Promise<MeetingConclusionDto> {
    const { conclusionId, content, status } = params;

    if (!conclusionId) {
      throw new BadRequestException('conclusionId là bắt buộc');
    }

    const pool = await this.getPool();

    // Kiểm tra conclusion tồn tại
    const checkRequest = pool.request();
    checkRequest.input('conclusionId', conclusionId);

    const checkSql = `
      SELECT id FROM ${this.dbname}.meeting_conclusions 
      WHERE id = @conclusionId AND status = 1
    `;

    const checkResult = await checkRequest.query(checkSql);

    if (!checkResult.recordset || checkResult.recordset.length === 0) {
      throw new NotFoundException(`Không tìm thấy conclusion với ID: ${conclusionId}`);
    }

    // Build dynamic UPDATE
    const updateFields: string[] = [];
    const updateRequest = pool.request();
    updateRequest.input('conclusionId', conclusionId);

    if (content !== undefined) {
      updateFields.push('content = @content');
      updateRequest.input('content', content);
    }

    if (status !== undefined) {
      updateFields.push('status = @status');
      updateRequest.input('status', status);
    }

    updateFields.push('updated_at = GETDATE()');

    if (updateFields.length === 1) {
      throw new BadRequestException('Không có trường nào để cập nhật');
    }

    const updateSql = `
      UPDATE ${this.dbname}.meeting_conclusions
      SET ${updateFields.join(', ')}
      OUTPUT 
        INSERTED.id,
        INSERTED.meeting_id,
        INSERTED.content,
        INSERTED.created_by,
        INSERTED.created_at,
        INSERTED.updated_at,
        INSERTED.status
      WHERE id = @conclusionId
    `;

    const result = await updateRequest.query(updateSql);
    const conclusion = result.recordset[0];

    return {
      id: conclusion.id,
      meetingId: conclusion.meeting_id,
      content: conclusion.content,
      createdBy: conclusion.created_by,
      createdAt: conclusion.created_at,
      updatedAt: conclusion.updated_at,
      status: conclusion.status,
    };
  }

  /**
   * 5. Xóa meeting conclusion (soft delete)
   */
  async deleteMeetingConclusion(params: {
    conclusionId: number;
  }): Promise<{ deleted: number }> {
    const { conclusionId } = params;

    if (!conclusionId) {
      throw new BadRequestException('conclusionId là bắt buộc');
    }

    const pool = await this.getPool();
    const request = pool.request();
    request.input('conclusionId', conclusionId);

    // Soft delete: set status = 3
    const deleteSql = `
      UPDATE ${this.dbname}.meeting_conclusions
      SET status = 3, updated_at = GETDATE()
      WHERE id = @conclusionId AND status = 1
    `;

    const result = await request.query(deleteSql);

    if (result.rowsAffected[0] === 0) {
      throw new NotFoundException(`Không tìm thấy conclusion với ID: ${conclusionId}`);
    }

    return {
      deleted: result.rowsAffected[0],
    };
  }

  async createMeetingWithConclusionsAndRelations(params: {
    meetingId: string;
    conclusions: Array<{
      content: string;
      createdBy?: string;
    }>;
    relatedMeetingIds?: string[];
  }): Promise<{
    conclusions: MeetingConclusionDto[];
    relations: {
      added: number;
      skipped: number;
      relations: MeetingRelationResponseDto[];
    };
  }> {
    const { meetingId, conclusions, relatedMeetingIds = [] } = params;

    /**
     * 1. Validation – API boundary
     */
    if (!meetingId) {
      throw new BadRequestException('meetingId là bắt buộc');
    }

    if (!conclusions || conclusions.length === 0) {
      throw new BadRequestException('conclusions phải có ít nhất 1 phần tử');
    }

    conclusions.forEach((r, i) => {
      if (!r.content) {
        throw new BadRequestException(`conclusions[${i}].content là bắt buộc`);
      }
    });

    /**
     * 2. Init transaction
     */
    const pool = await this.getPool();
    const tx = pool.transaction();
    await tx.begin();

    try {
      /**
       * 3. Check meeting tồn tại
       */
      const checkMeetingReq = tx.request();
      checkMeetingReq.input('meetingId', meetingId);

      const checkMeetingSql = `
        SELECT id 
        FROM ${this.dbname}.meetings 
        WHERE id = @meetingId
      `;

      const meetingResult = await checkMeetingReq.query(checkMeetingSql);
      if (meetingResult.recordset.length === 0) {
        throw new NotFoundException(
          `Không tìm thấy cuộc họp với ID: ${meetingId}`,
        );
      }

      /**
       * 4. Insert meeting_conclusions (bulk)
       */
      const recordValues: string[] = [];
      const recordReq = tx.request();
      recordReq.input('meetingId', meetingId);

      conclusions.forEach((r, i) => {
        recordValues.push(`(@meetingId, @content${i}, @createdBy${i}, 1)`);
        recordReq.input(`content${i}`, r.content);
        recordReq.input(`createdBy${i}`, r.createdBy || null);
      });

      const insertConclusionSql = `
        INSERT INTO ${this.dbname}.meeting_conclusions
          (meeting_id, content, created_by, status)
        OUTPUT
          INSERTED.id,
          INSERTED.meeting_id,
          INSERTED.content,
          INSERTED.created_by,
          INSERTED.created_at,
          INSERTED.updated_at,
          INSERTED.status
        VALUES ${recordValues.join(',')}
      `;

      const recordResult = await recordReq.query(insertConclusionSql);

      const insertedConclusions: MeetingConclusionDto[] = recordResult.recordset.map(
        (r) => ({
          id: r.id,
          meetingId: r.meeting_id,
          content: r.content,
          createdBy: r.created_by,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          status: r.status,
        }),
      );

      /**
       * 5. Handle relations (optional)
       */
      let added = 0;
      let skipped = 0;
      let insertedRelations: MeetingRelationResponseDto[] = [];

      if (relatedMeetingIds.length > 0) {
        /**
         * 5.1 Check related meetings tồn tại
         */
        const checkRelatedReq = tx.request();
        const relatedListSql = relatedMeetingIds
          .map((id) => `'${id}'`)
          .join(',');

        const checkRelatedSql = `
          SELECT id 
          FROM ${this.dbname}.meetings
          WHERE id IN (${relatedListSql})
        `;

        const relatedResult = await checkRelatedReq.query(checkRelatedSql);
        const existingRelatedIds = relatedResult.recordset.map((r) => r.id);

        const invalidIds = relatedMeetingIds.filter(
          (id) => !existingRelatedIds.includes(id),
        );

        if (invalidIds.length > 0) {
          throw new BadRequestException(
            `Các cuộc họp sau không tồn tại: ${invalidIds.join(', ')}`,
          );
        }

        /**
         * 5.2 Check existing relations
         */
        const checkExistingReq = tx.request();
        checkExistingReq.input('meetingId', meetingId);

        const checkExistingSql = `
          SELECT related_meeting_id
          FROM ${this.dbname}.meeting_relations
          WHERE meeting_id = @meetingId
            AND related_meeting_id IN (${relatedListSql})
        `;

        const existingResult = await checkExistingReq.query(checkExistingSql);
        const existingRelationIds = existingResult.recordset.map(
          (r) => r.related_meeting_id,
        );

        skipped = existingRelationIds.length;

        const idsToInsert = relatedMeetingIds.filter(
          (id) => !existingRelationIds.includes(id),
        );

        /**
         * 5.3 Insert new relations
         */
        if (idsToInsert.length > 0) {
          const insertRelationReq = tx.request();
          insertRelationReq.input('meetingId', meetingId);

          const valuesSql = idsToInsert
            .map((id) => `(@meetingId, '${id}', 'reference')`)
            .join(',');

          const insertRelationSql = `
            INSERT INTO ${this.dbname}.meeting_relations
              (meeting_id, related_meeting_id, relation_type)
            OUTPUT
              INSERTED.id,
              INSERTED.meeting_id,
              INSERTED.related_meeting_id,
              INSERTED.relation_type,
              INSERTED.created_at
            VALUES ${valuesSql}
          `;

          const relationResult =
            await insertRelationReq.query(insertRelationSql);

          insertedRelations = relationResult.recordset.map((r) => ({
            id: r.id,
            meetingId: r.meeting_id,
            relatedMeetingId: r.related_meeting_id,
            relationType: r.relation_type,
            createdAt: r.created_at,
          }));

          added = insertedRelations.length;
        }
      }

      /**
       * 6. Commit
       */
      await tx.commit();

      return {
        conclusions: insertedConclusions,
        relations: {
          added,
          skipped,
          relations: insertedRelations,
        },
      };
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  }

  async finishedMeetingsForLinking(
    query: CreateMeetingDto,
    userId: string,
    authorId?: string,
  ) {
    const {
      filter: rawFilter,
      processFn,
      authority,
      type,
      page = 1,
      limit = 20,
      meetingId,
    } = query;

    if (!meetingId) {
      throw new BadRequestException('meetingId là bắt buộc');
    }
    const filter =
      rawFilter && typeof rawFilter === 'object'
        ? Object.fromEntries(
          Object.entries(rawFilter).map(([k, v]) => {
            if (k === 'meetingTitle') return ['title', v];
            if (k === 'organizerUnitName') return ['organizational_unit', v];
            if (k === 'participantUnitNames' || k === 'participantUnitName') return ['participatingComponents', v];
            return [k, v];
          }),
        )
        : rawFilter;
    // ====== Authority check ======
    if (authority === 'true' && authorId) userId = authorId;

    const [pool, userRoleRes, featureManagement] = await Promise.all([
      this.getPool(),
      this.userService.getUserRole(userId),
      this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      }),
    ]);

    const { roles } = userRoleRes;
    const userContext = { userId, roles };

    const ALLOWED_TYPES = ['day', 'week', 'month'] as const;
    if (type && !ALLOWED_TYPES.includes(type as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: ALLOWED_TYPES,
      });
    }

    // ====== Build filter criteria ======
    const criteria: Array<{
      name: string;
      operator: string;
      value: string | string[];
    }> = [];
    if (filter && typeof filter === 'object') {
      Object.entries(filter).forEach(([key, value]) => {
        if (!value) return;
        if (typeof value === 'object') {
          const val = value as {
            startDate?: string;
            endDate?: string;
            value?: string;
          };
          if (val.startDate && val.endDate)
            criteria.push({
              name: key,
              operator: 'between',
              value: [String(val.startDate), String(val.endDate)],
            });
          else if (val.startDate)
            criteria.push({
              name: key,
              operator: 'gte',
              value: String(val.startDate),
            });
          else if (val.endDate)
            criteria.push({
              name: key,
              operator: 'lte',
              value: String(val.endDate),
            });
          else if (val.value !== undefined && val.value !== null)
            criteria.push({
              name: key,
              operator: 'like',
              value: String(val.value),
            });
        } else {
          const operator = typeof value === 'string' ? 'like' : 'eq';
          criteria.push({ name: key, operator, value: String(value) });
        }
      });
    }

    const featureCriteria = featureManagement?.criteria ?? [];
    const { sql: filterFeature, from } = buildMeetingCriteriaHelper(
      [...featureCriteria, ...criteria],
      'meetings',
      featureManagement,
    );

    // ====== Step 1: Lọc + phân trang (chỉ lấy id) ======
    const where: string[] = [`(${from}.status = '1')`];

    // Chỉ lấy cuộc họp đã kết thúc
    where.push(`${from}.meeting_state = 'KET_THUC'`);

    // Cuộc họp hiện tại
    const meetingContextSql = ` SELECT is_company  FROM ${this.dbname}.${from} WHERE id = '${meetingId}' `;
    const meetingContextRes = await pool.request().query(meetingContextSql);
    const isCompanyMeeting = !!meetingContextRes.recordset[0]?.is_company;

    const userUnitSql = ` SELECT parent FROM users WHERE id = '${userId}' `;
    const userUnitRes = await pool.request().query(userUnitSql);
    const userUnit = userUnitRes.recordset[0]?.parent;
    if (!userUnit) {
      throw new BadRequestException('Không xác định được phòng ban của user');
    }
    // Cuộc họp của Tổng công ty thì lấy hết, ngược lại thì lọc theo phòng ban
    if (isCompanyMeeting) {
      where.push(`${from}.is_company = 1`);
    } else {
      where.push(`${from}.is_company = 0`);
      where.push(`${from}.organizational_unit = '${userUnit}'`);
    }

    if (filterFeature) where.push(`(${filterFeature})`);

    if (type === 'day' && filter?.currentDate) {
      where.push(
        `${from}.meeting_date >= '${filter.currentDate}' AND ${from}.meeting_date < DATEADD(day, 1, '${filter.currentDate}')`,
      );
    } else if (type === 'week' && filter?.currentWeek) {
      const { startDate, endDate } = filter.currentWeek;
      where.push(
        `${from}.meeting_date >= '${startDate}' AND ${from}.meeting_date <= '${endDate}'`,
      );
    } else if (type === 'month' && filter?.currentMonth) {
      const [year, month] = String(filter.currentMonth).split('-');
      where.push(
        `${from}.meeting_date >= '${year}-${month}-01' AND ${from}.meeting_date < DATEADD(month, 1, '${year}-${month}-01')`,
      );
    }

    const whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';

    const limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;

    // Lấy total
    const totalSql = `SELECT COUNT(*) AS total FROM ${this.dbname}.${from} ${whereClause} AND ${from}.status = '1' `;
    const idsSql = `
      SELECT id FROM ${this.dbname}.${from}
      ${whereClause} AND ${from}.status = '1'
      ORDER BY ${from}.meeting_date, ${from}.meeting_time
      OFFSET ${offsetNum} ROWS FETCH NEXT ${limitNum} ROWS ONLY
    `;

    let totalResult, idsResult;
    try {
      [totalResult, idsResult] = await Promise.all([
        pool.request().query(totalSql),
        pool.request().query(idsSql),
      ]);
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException(
        'Lỗi truy vấn cuộc họp đã kết thúc',
      );
    }

    const total = totalResult.recordset[0]?.total ?? 0;
    const meetingIds = idsResult.recordset.map((row) => row.id);
    if (!meetingIds.length)
      return {
        success: true,
        items: [],
        message: 'Không có dữ liệu',
        total: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
      };

    const idsList = meetingIds.map((id) => `'${id}'`).join(',');

    const detailsSql = `
      SELECT
        ${from}.id,
        ${from}.title AS meetingTitle,
        ${from}.meeting_type AS meetingType,
        (
          SELECT COUNT(*)
          FROM ${this.dbname}.meeting_conclusions
          WHERE meeting_id = ${from}.id AND status = 1
        ) AS conclusionCount,
        (
          SELECT STRING_AGG(CAST(content AS NVARCHAR(MAX)), '|||')
          FROM ${this.dbname}.meeting_conclusions
          WHERE meeting_id = ${from}.id AND status = 1
        ) AS conclusionContents,
        ${from}.meeting_date AS meetingDate,
        ${from}.meeting_time AS meetingTime,
        (
          SELECT STRING_AGG(u.name, ', ')
          FROM ${this.dbname}.meeting_units mu
          INNER JOIN ${this.dbname}.organization_units u ON u.id = mu.unit_id
          WHERE mu.meeting_id = ${from}.id
        ) AS meetingUnitParticipants,
        (
          SELECT TOP 1 u.name
          FROM ${this.dbname}.organization_units u
          WHERE u.id = ${from}.organizational_unit
        ) AS meetingUnitCreate,
        ${from}.is_company AS isCompany

      FROM ${this.dbname}.${from}
      WHERE ${from}.id IN (${idsList})
    `;

    let detailsResult;
    try {
      detailsResult = await pool.request().query(detailsSql);
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException(
        'Lỗi truy vấn chi tiết lịch họp liên kết chi tiết',
      );
    }

    const items = detailsResult.recordset;
    // const MEETING_TYPE_LABEL: Record<MeetingType, string> = {
    //   COMPANY: 'Tổng công ty',
    //   UNIT: 'Phòng ban',
    //   USER: 'Cá nhân',
    // };

    return {
      success: true,
      items: items.map((item) => {
        const count = item.conclusionCount || 0;
        const contents = item.conclusionContents ? item.conclusionContents.split('|||') : [];

        let conclusionHtml = '-';
        if (count > 0) {
          const tooltipContent = contents
            .map((c, i) => `<div style="margin-bottom: 4px;">${i + 1}. ${c}</div>`)
            .join('');

          conclusionHtml = `
            <div class="unit-task-wrapper">
              <span 
                class="unit-task-label"
                style="color:#008236; font-weight:500; font-size:14px; cursor:pointer;"
              >
                ${count} kết luận
              </span>

              <div class="unit-task-tooltip">
                ${tooltipContent}
              </div>
            </div>
          `;
        }

        return {
          ...item,
          conclusion: conclusionHtml,
          isCompany: !!item.isCompany,
          meetingType: this.meetingTypeCache.get(item.meetingType) ?? item.meetingType,
          meetingDate: normalizeDateValueDDMMYYYY(item.meetingDate)
        };
      }),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  // Tab ghi âm
  // POST /audio-transcripts
  async createAudioTranscript(
    createDto: CreateAudioTranscriptDto,
    userId: string,
  ) {
    const { meetingId, durationSeconds, transcriptText } = createDto;
    const pool = await this.getPool();

    // Check duplicate transcript
    const checkDuplicateSql = `
      SELECT id 
      FROM ${this.dbname}.audio_transcripts 
      WHERE meeting_id = @meetingId AND status = 1
    `;

    let duplicateResult;
    try {
      duplicateResult = await pool
        .request()
        .input('meetingId', meetingId)
        .query(checkDuplicateSql);
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi kiểm tra transcript');
    }

    if (duplicateResult.recordset.length) {
      // Update transcript
      const updateSql = `
        UPDATE ${this.dbname}.audio_transcripts
        SET 
          duration_seconds = @durationSeconds,
          transcript_text = @transcriptText,
          updated_at = GETDATE()
        OUTPUT INSERTED.id, INSERTED.meeting_id, INSERTED.duration_seconds
        WHERE meeting_id = @meetingId AND status = 1
      `;

      let updateResult;
      try {
        updateResult = await pool
          .request()
          .input('meetingId', meetingId)
          .input('durationSeconds', durationSeconds || null)
          .input('transcriptText', transcriptText || null)
          .query(updateSql);
      } catch (e) {
        this.logger.error(e);
        throw new InternalServerErrorException('Lỗi cập nhật transcript');
      }

      const updated = updateResult.recordset[0];
      return {
        success: true,
        message: 'Cập nhật transcript thành công',
        data: {
          id: updated.id,
          meetingId: updated.meeting_id,
          durationSeconds: updated.duration_seconds,
        },
      };
    }

    // Insert transcript
    const insertSql = `
      INSERT INTO ${this.dbname}.audio_transcripts 
        (meeting_id, duration_seconds, transcript_text, status, created_at, updated_at)
      OUTPUT INSERTED.id, INSERTED.meeting_id, INSERTED.duration_seconds
      VALUES (@meetingId, @durationSeconds, @transcriptText, 1, GETDATE(), GETDATE())
    `;

    let insertResult;
    try {
      insertResult = await pool
        .request()
        .input('meetingId', meetingId)
        .input('durationSeconds', durationSeconds || null)
        .input('transcriptText', transcriptText || null)
        .query(insertSql);
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi tạo transcript');
    }

    const inserted = insertResult.recordset[0];

    return {
      success: true,
      message: 'Tạo transcript thành công',
      data: {
        id: inserted.id,
        meetingId: inserted.meeting_Id,
        durationSeconds: inserted.duration_seconds,
      },
    };
  }

  // PATCH /audio-transcripts/:id/text
  async updateTranscriptText(
    id: string,
    updateDto: UpdateTranscriptTextDto,
    userId: string,
  ) {
    const { transcriptText } = updateDto;
    const pool = await this.getPool();

    // Check transcript tồn tại
    const checkSql = `
      SELECT id 
      FROM ${this.dbname}.audio_transcripts 
      WHERE id = @id AND status = 1
    `;

    let checkResult;
    try {
      checkResult = await pool
        .request()
        .input('id', id)
        .query(checkSql);
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi kiểm tra transcript');
    }

    if (!checkResult.recordset.length) {
      return {
        success: true,
        data: null,
      };
    }

    // Update
    const updateSql = `
      UPDATE ${this.dbname}.audio_transcripts 
      SET transcript_text = @transcriptText, 
          updated_at = GETDATE()
      WHERE id = @id AND status = 1
    `;

    try {
      await pool
        .request()
        .input('id', id)
        .input('transcriptText', transcriptText)
        .query(updateSql);
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi cập nhật transcript');
    }

    return {
      success: true,
      message: 'Cập nhật transcript thành công',
    };
  }

  // DELETE /audio-transcripts/:id
  async deleteTranscript(id: string, userId: string) {
    const pool = await this.getPool();

    // Check transcript tồn tại
    const checkSql = `
      SELECT id 
      FROM ${this.dbname}.audio_transcripts 
      WHERE id = @id AND status = 1
    `;

    let checkResult;
    try {
      checkResult = await pool
        .request()
        .input('id', id)
        .query(checkSql);
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi kiểm tra transcript');
    }

    if (!checkResult.recordset.length) {
      return {
        success: true,
        message: 'Không có gì để xoá',
      };
    }

    // Soft delete
    const deleteSql = `
      UPDATE ${this.dbname}.audio_transcripts 
      SET status = 0, 
          updated_at = GETDATE()
      WHERE id = @id
    `;

    try {
      await pool
        .request()
        .input('id', id)
        .query(deleteSql);
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi xóa transcript');
    }

    return {
      success: true,
      message: 'Xóa transcript thành công',
    };
  }

  // GET /audio-transcripts/:meetingId
  async getTranscriptByMeetingId(meetingId: string, userId: string) {
    const pool = await this.getPool();

    const sql = `
      SELECT 
        id,
        duration_seconds,
        transcript_text,
        created_at,
        updated_at
      FROM ${this.dbname}.audio_transcripts
      WHERE meeting_id = @meetingId AND status = 1
    `;

    let result;
    try {
      result = await pool
        .request()
        .input('meetingId', meetingId)
        .query(sql);
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi truy vấn transcript');
    }

    if (!result.recordset.length) {
      return {
        success: true,
        data: null,
      };
    }

    const row = result.recordset[0];

    return {
      success: true,
      data: {
        transcriptId: row.id,
        meetingId: row.meetingId,
        durationSeconds: row.duration_seconds,
        transcriptText: row.transcript_text,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    };
  }

  async getTranscriptForExport(queryParams: any, userId: string) {
    const { recordId } = queryParams;
    const transcript = await this.getTranscriptByMeetingId(recordId, userId);
    return {
      data: transcript?.data ? [transcript.data] : [],
      total: transcript?.data ? 1 : 0,
    };
  }

  // GET /meetings/:meetingId/audio-files
  async getMeetingAudioFiles(meetingId: string, userId: string) {
    const pool = await this.getPool();

    const sql = `
      SELECT 
        f.id,
        f.file_name,
        f.file_path,
        f.file_size,
        f.mime_type,
        f.created_at,
        at.id AS transcript_id,
        at.duration_seconds,
        at.transcript_text
      FROM ${this.dbname}.file_relations fr
      INNER JOIN ${this.dbname}.files f ON fr.file_id = f.id
      LEFT JOIN ${this.dbname}.audio_transcripts at 
        ON f.id = at.file_id AND at.status = 1
      WHERE fr.object_type = 'audioMeeting'
        AND fr.object_id = @meetingId
        AND f.status = 1
        AND f.mime_type LIKE 'audio/%'
      ORDER BY f.created_at DESC
    `;

    let result;
    try {
      result = await pool
        .request()
        .input('meetingId', meetingId)
        .query(sql);
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi truy vấn audio files');
    }

    const items = result.recordset.map((row) => ({
      id: row.id,
      fileName: row.file_name,
      filePath: row.file_path,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      createdAt: row.created_at,
      transcript: row.transcript_id
        ? {
          id: row.transcript_id,
          duration: row.duration_seconds,
          text: row.transcript_text,
        }
        : null,
    }));

    return {
      success: true,
      total: items.length,
      items,
    };
  }

  // Get task by unit 
  async getUnitTasksOfUserInMeeting(
    meetingId: string,
    userId: string,
    includeComments = false,
  ): Promise<TaskDto[]> {

    const [meeting, userRes] = await Promise.all([
      this.meetingRepo.findOne({
        where: { id: meetingId },
        relations: ['units'],
      }),
      this.userRepo.findOne({
        where: { id: userId },
        relations: ['parent'],
        select: ['id'],
      }),
    ]);

    if (!meeting || !meeting.units?.length) {
      this.logger.warn(`Meeting not found or no units | ${meetingId}`);
      return [];
    }

    const receiverUnit = userRes?.parent?.id;

    if (!receiverUnit) {
      this.logger.warn(`User ${userId} has no parent unit`);
      return [];
    }

    // ✅ Lấy meeting_unit theo PHÒNG BAN USER
    const currentMeetingUnit = meeting.units.find(
      (unit) => unit.unitId === receiverUnit,
    );

    if (!currentMeetingUnit) {
      this.logger.warn(
        `Unit ${receiverUnit} not found in meeting ${meetingId}`,
      );
      return [];
    }

    // this.logger.debug(
    //   `Current meeting unit | meetingUnitId=${currentMeetingUnit.id}, unitId=${receiverUnit}`,
    // );

    // ✅ Lấy task cấp PHÒNG
    const unitTasks = await this.taskRepo.find({
      where: {
        meetingId,
        attachableType: 'UNIT',
        attachableId: currentMeetingUnit.id,
      },
      order: { createdAt: 'ASC' },
    });

    return this.mapTasksToDto(unitTasks, userId, includeComments);
  }



  // Get task by user
  async getParticipantTasksInMeeting(
    meetingId: string,
    userId: string,
    includeComments = false,
  ): Promise<TaskDto[]> {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
      relations: ['units', 'units.participants'],
    });

    if (!meeting || !meeting.units?.length) {
      return [];
    }

    const participants = meeting.units
      .flatMap((u) => u.participants ?? [])
      .filter(
        (p) =>
          p.userId === userId ||
          (p.assignmentType === 'DELEGATED' &&
            p.delegatedToUserId === userId &&
            p.delegationState === 'ACCEPTED')
      );

    if (!participants.length) {
      return [];
    }

    const participantIds = participants.map((p) => p.id);
    const participantTasks = await this.taskRepo.find({
      where: {
        meetingId,
        attachableType: 'PARTICIPANT',
        attachableId: In(participantIds),

      },
      order: { createdAt: 'ASC' },
    });

    return this.mapTasksToDto(participantTasks, userId, includeComments);
  }

  // Lấy chi tiết task theo ID
  private async mapTasksToDto(
    tasks: MeetingTaskEntity[],
    userId?: string,
    includeComments = false,
  ): Promise<TaskDto[]> {
    if (!tasks.length) return [];

    /* ===================== COMMENTS ===================== */
    const commentMap: Record<string, any[]> = {};

    if (includeComments && userId) {
      const commentPromises = tasks.map(async (task) => {
        const res =
          await this.commentService.findAllByMeetingTaskId(task.id, userId);

        const comments = res?.data ?? [];

        return {
          taskId: task.id,
          comments: comments.map((c) => ({
            id: c.id,
            content: c.content,
            createdBy: c.createdBy,
            createdAt: c.createdAt.toISOString(),
            isLiked: !!c.isLiked,
          })),
        };
      });

      const results = await Promise.all(commentPromises);

      results.forEach((r) => {
        commentMap[r.taskId] = r.comments;
      });
    }

    /* ===================== FILES (CHỈ KHI includeComments = false) ===================== */
    let filesMap: Record<string, any[]> = {};

    if (!includeComments) {
      const taskIds = tasks.map((t) => t.id);

      filesMap =
        await this.fileService.getFilesByOutgoingDocumentIds(
          taskIds
        );
    }

    /* ===================== MAP DTO ===================== */
    return tasks.map((task) => ({
      id: task.id,
      content: task.content ?? '',
      documentName: task.documentName ?? '',
      deadline: task.deadline
        ? task.deadline.toISOString().split('T')[0]
        : '1970-01-01',
      attachableRole: task.attachableRole ?? '',
      attachableType: task.attachableType ?? '',
      files: includeComments ? filesMap[task.id] ?? [] : undefined,
      comments: includeComments ? commentMap[task.id] ?? [] : undefined,
    }));
  }

  // Xác nhận tham dự cuộc họp (điểm danh)
  async confirmMyAttendance(
    meetingId: string,
    userId: string,
  ) {
    const participant = await this.participantRepo.findOne({
      where: [
        {
          userId,
          unit: {
            meeting: { id: meetingId },
          },
        },
        {
          delegatedToUserId: userId,
          participantState: ParticipantState.DELEGATED,
          unit: {
            meeting: { id: meetingId },
          },
        },
      ],
      relations: ['unit', 'unit.meeting'],
    });

    if (!participant) {
      throw new ForbiddenException('Bạn không thuộc cuộc họp');
    }

    if (!participant.unit || !participant.unit.meeting) {
      throw new InternalServerErrorException(
        'Dữ liệu tham gia cuộc họp không hợp lệ',
      );
    }

    const meeting = participant.unit.meeting;

    // Check khóa điểm danh
    if (meeting.attendanceLocked === true) {
      throw new ConflictException('Cuộc họp đã khóa điểm danh');
    }

    // Không cần điểm danh
    if (participant.notCheck === true) {
      throw new ForbiddenException('Không cần điểm danh');
    }

    // Đã điểm danh rồi → idempotent
    if (participant.attendanceState === 'CHECKED') {
      return {
        success: true,
        participantId: participant.id,
        attendanceState: participant.attendanceState,
      };
    }

    participant.attendanceState = 'CHECKED';
    participant.attendanceAt = new Date();

    await this.participantRepo.save(participant);

    return {
      success: true,
      participantId: participant.id,
      attendanceState: participant.attendanceState,
      attendanceAt: participant.attendanceAt
    };
  }

  // Đánh dấu không cần điểm danh (notCheck) cho nhiều người tham gia
  async setNotCheckBulk(
    meetingId: string,
    userId: string,
    participantIds: string[],
    notCheck: boolean,
  ) {
    if (!participantIds || participantIds.length === 0) {
      throw new BadRequestException('Danh sách người tham gia trống');
    }

    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
      select: ['id', 'chairmanId', 'secretaryId'],
    });

    if (!meeting) {
      throw new NotFoundException('Không tìm thấy cuộc họp');
    }

    const { isChairman, isSecretary } = await this.checkIsChairmanOrSecretary(meetingId, userId);
    if (!isChairman && !isSecretary) {
      throw new ForbiddenException('Không có quyền thao tác');
    }

    await this.dataSource.transaction(async (manager) => {
      const participants = await manager.find(
        MeetingParticipantEntity,
        {
          where: {
            id: In(participantIds),
            unit: {
              meeting: { id: meetingId },
            },
          },
          relations: ['unit'],
        },
      );

      if (participants.length === 0) {
        throw new NotFoundException(
          'Không tìm thấy người tham gia hợp lệ',
        );
      }

      for (const p of participants) {
        p.notCheck = notCheck;

        if (notCheck === true) {
          p.attendanceState = 'NOT_REQUIRED';
        } else {
          p.attendanceState = p.attendanceAt ? 'CHECKED' : 'RECEIVED';
        }

        await manager.save(MeetingParticipantEntity, p);
      }
    });

    return {
      success: true,
      notCheck,
      participantIds,
    };
  }

  // Khóa/mở khóa điểm danh cuộc họp
  async setAttendanceLock(
    meetingId: string,
    userId: string,
  ) {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
      select: ['id', 'chairmanId', 'secretaryId', 'attendanceLocked'],
    });

    if (!meeting) {
      throw new NotFoundException('Không tìm thấy cuộc họp');
    }

    const { isChairman, isSecretary } = await this.checkIsChairmanOrSecretary(meetingId, userId);
    if (!isChairman && !isSecretary) {
      throw new ForbiddenException('Không có quyền');
    }

    // Thay đổi giá trị của attendanceLocked
    meeting.attendanceLocked = !meeting.attendanceLocked;
    meeting.updatedAt = new Date();

    await this.meetingRepo.save(meeting);

    return {
      success: true,
      attendanceLocked: meeting.attendanceLocked,
    };
  }

  // Cập nhật trạng thái xử lý của đơn vị trong cuộc họp
  async updateMeetingUnitProcessingState(
    dto: UpdateMeetingProcessingStateDto,
    context: { originalUserId: string; effectiveUserId?: string },
  ) {
    const {
      meetingId,
      workItem,
      actionCode,
      unitId
    } = dto;
    const userId = context.originalUserId
    const meeting = await this.sqlRepo.getMeeting(meetingId);
    const bpmnXML = await this.sqlRepo.getBpmnFile(meeting.bpmnVersion);
    const userRes = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['parent'], // parent là đơn vị
      select: ['id'],
    });
    const receiverUnit = userRes?.parent?.id ?? unitId;
    let result;
    if (!workItem) {
      throw new BadRequestException('Không có workItem')
    }
    if (workItem.id) {
      result = await this.runtimeDbService.unitProccessMeeting({
        bpmnXML,
        meetingId,
        workItemId: workItem.id,
        actionCode,
        userId,
        bpmnVersion: meeting.bpmnVersion,
        receiverUnit,
      });
    }
    if (result.success === true) {
      return await this.getDetail(meeting.id, userId, 'PROCESS_MEETING');
    } else {
      return {

      }
    }
  }
  // Xây dựng mảng tiêu chí lọc từ object filter
  private buildCriteria(filter: any): Array<{ name: string; operator: string; value: string | string[] }> {
    const criteria: Array<{ name: string; operator: string; value: string | string[] }> = [];
    if (filter && typeof filter === 'object') {
      Object.entries(filter).forEach(([key, value]) => {
        if (!value) return;
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
  // Cập nhật trạng thái cuộc họp
  async updateMeetingState(
    meetingId: string,
    meetingState: MEETING_STATE,
  ): Promise<void> {
    await this.meetingRepo.update(
      { id: meetingId },
      { meetingState },
    );
  }
  private sendMeetingStartEmail(
    email: string,
    meeting: MeetingEntity,
  ): void {
    const subject = `[Cuộc họp bắt đầu] ${meeting.title}`;

    const html = `
      <p>Kính gửi,</p>

      <p>Cuộc họp <b>${meeting.title}</b> đã bắt đầu.</p>

      <p>
        <b>Thời gian bắt đầu:</b> ${meeting.startedAt?.toLocaleString('vi-VN')}
      </p>

      <p>Vui lòng truy cập hệ thống để tham gia cuộc họp.</p>

      <p>Trân trọng,<br/>Hệ thống quản lý cuộc họp</p>
    `;

    void this.mailService.sendMail({
      to: email,
      subject,
      html,
    }).catch((err) => {
      this.logger.error(
        `Send meeting start email failed: ${err.message}`,
        err.stack,
      );
    });
  }
  private async checkIsChairmanOrSecretary(meetingId: string, userId: string): Promise<{ isChairman: boolean; isSecretary: boolean }> {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
      select: ['id', 'chairmanId', 'secretaryId']
    });

    if (!meeting) {
      return { isChairman: false, isSecretary: false };
    }

    const participants = await this.participantRepo.find({
      where: [
        {
          unit: { meeting: { id: meetingId } },
          participantRole: 'CHAIRMAN'
        },
        {
          unit: { meeting: { id: meetingId } },
          participantRole: 'SECRETARY'
        },
        {
          unit: { meeting: { id: meetingId }, unitId: 'CHAIRMAN_UNIT' }
        },
        {
          unit: { meeting: { id: meetingId }, unitId: 'SECRETARY_UNIT' }
        }
      ],
      relations: ['unit', 'unit.meeting']
    });

    const user = await this.sqlsvRepo.getUserById(userId);
    const userUnitId = user?.parent?.id || null;

    const isChairman = meeting.chairmanId === userId || participants.some(p =>
      (p.participantRole === 'CHAIRMAN' || p.unit?.unitId === 'CHAIRMAN_UNIT') &&
      (p.userId === userId || (p.delegatedToUserId === userId && p.delegationState === DelegationState.ACCEPTED))
    );

    const isSecretary = meeting.secretaryId === userId ||
      (userUnitId && meeting.secretaryType === ParticipantType.UNIT && meeting.secretaryId === userUnitId) ||
      participants.some(p =>
        (p.participantRole === 'SECRETARY' || p.unit?.unitId === 'SECRETARY_UNIT') &&
        (
          p.userId === userId ||
          (p.delegatedToUserId === userId && p.delegationState === DelegationState.ACCEPTED) ||
          (p.userType === UserType.UNIT && p.unitId === userUnitId)
        )
      );

    return { isChairman, isSecretary };
  }

  /**
   * Bắt đầu cuộc họp
   * @param meetingId Id của cuộc họp
   * @param userId Id của người dùng
   * @param req Request object
   * @returns {meetingState: string, startedAt: Date} - Trạng thái cuộc họp và thời điểm bắt đầu
   * @throws NotFoundException - Không tìm thấy cuộc họp
   * @throws ForbiddenException - Không có quyền bắt đầu cuộc họp
   * @throws BadRequestException - Cuộc họp đã kết thúc hoặc không ở trạng thái có thể bắt đầu
   */
  async checkEarlyStart(meetingId: string, userId: string) {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
      relations: ['units', 'units.participants']
    });
    if (!meeting) {
      throw new NotFoundException('Không tìm thấy cuộc họp');
    }

    const tz = meeting.timezone || 'Asia/Ho_Chi_Minh';
    const now = dayjs().tz(tz);
    const meetingStart = getMeetingStartTime(
      meeting.meetingDate,
      meeting.meetingTime,
      tz,
    );
    const isEarly = now.isBefore(meetingStart.subtract(30, 'minute'));

    const roomIdsArray = meeting.roomIds ? meeting.roomIds.split(',').filter(Boolean) : [];

    // Check if any room is currently in use (stage = 4)
    let isRoomInUse = false;
    if (roomIdsArray.length > 0) {
      const rooms = await this.meetingRoomRepo.find({
        where: { id: In(roomIdsArray) },
        select: ['id', 'stage']
      });
      isRoomInUse = rooms.some(r => r.stage === 4);
    }

    if (!isEarly) {
      return {
        isEarly: false,
        roomConflicts: [],
        userConflicts: [],
      };
    }

    // Check room conflicts
    const roomConflicts = await this.checkRoomConflict(
      meeting.meetingDate,
      meeting.meetingTime,
      roomIdsArray,
      meeting.id,
    );

    const mappedRoomConflicts = roomConflicts.map(rc => ({
      ...rc,
      roomStatus: 'Đang được sử dụng',
      isRoomInUse: true,
      roomInUse: true,
    }));

    // Get all user IDs in this meeting to check their schedule conflicts
    const userIdsSet = new Set<string>();
    const rejectedUserIdsSet = new Set<string>();

    for (const unit of meeting.units ?? []) {
      for (const p of unit.participants ?? []) {
        const isNotParticipating =
          p.participantState === ParticipantState.NOT_PARTICIPATE ||
          (p.participantState as any) === 'NOT_PARTICIPATE' ||
          (p.participantState as any) === 'REJECTED';

        if (isNotParticipating) {
          if (p.userId && p.userId !== 'UNIT') {
            rejectedUserIdsSet.add(p.userId);
          }
          if (p.delegatedToUserId) {
            rejectedUserIdsSet.add(p.delegatedToUserId);
          }
        } else {
          const isDelegated =
            (p.delegatedToUserId && p.delegatedToUserId !== 'UNIT') &&
            (
              p.participantState === ParticipantState.DELEGATED ||
              (p.participantState as any) === 'DELEGATED' ||
              p.delegationState === DelegationState.ACCEPTED ||
              (p.delegationState as any) === 'ACCEPTED' ||
              p.assignmentType === AssignmentType.DELEGATED ||
              (p.assignmentType as any) === 'DELEGATED'
            );

          if (isDelegated) {
            // Đã ủy quyền: người được ủy quyền mới là người đi họp, người ủy quyền bị loại ra
            if (p.userId && p.userId !== 'UNIT') {
              rejectedUserIdsSet.add(p.userId);
            }
            userIdsSet.add(p.delegatedToUserId!);
          } else {
            if (p.userId && p.userId !== 'UNIT') {
              userIdsSet.add(p.userId);
            }
            if (p.delegatedToUserId) {
              userIdsSet.add(p.delegatedToUserId);
            }
          }
        }
      }
    }

    if (meeting.chairmanId && !rejectedUserIdsSet.has(meeting.chairmanId)) {
      userIdsSet.add(meeting.chairmanId);
    }
    if (meeting.secretaryId && !rejectedUserIdsSet.has(meeting.secretaryId)) {
      userIdsSet.add(meeting.secretaryId);
    }

    for (const rejectedId of rejectedUserIdsSet) {
      userIdsSet.delete(rejectedId);
    }

    const userConflicts = await this.checkUserConflict(
      meeting.meetingDate,
      meeting.meetingTime,
      Array.from(userIdsSet),
      meeting.id,
    );

    return {
      isEarly: true,
      roomConflicts: mappedRoomConflicts,
      userConflicts,
    };
  }

  async startMeeting(meetingId: string, userId: string, reason?: string, req?: any) {

    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId }
    });
    if (!meeting) {
      throw new NotFoundException('Không tìm thấy cuộc họp');
    }
    const details = `Bắt đầu cuộc họp: ${meeting.title}`;

    const { isChairman, isSecretary } = await this.checkIsChairmanOrSecretary(meetingId, userId);
    if (!isChairman && !isSecretary) {
      throw new ForbiddenException('Không có quyền bắt đầu cuộc họp');
    }

    if (meeting.meetingState === 'KET_THUC') {
      throw new BadRequestException('Cuộc họp đã kết thúc');
    }

    // // Chỉ cho phép bắt đầu khi DRAFT
    // if (meeting.meetingState !== 'CHUAN_BI') {
    //   throw new BadRequestException(
    //     'Cuộc họp không ở trạng thái có thể bắt đầu',
    //   );
    // }

    const tz = meeting.timezone || 'Asia/Ho_Chi_Minh';
    const now = dayjs().tz(tz);
    const meetingStart = getMeetingStartTime(
      meeting.meetingDate,
      meeting.meetingTime,
      tz,
    );
    const isEarly = now.isBefore(meetingStart.subtract(30, 'minute'));

    if (isEarly && (!reason || !reason.trim())) {
      throw new BadRequestException('Bắt đầu cuộc họp sớm yêu cầu nhập lý do.');
    }

    meeting.meetingState = 'DANG_HOP';

    // set thời điểm bắt đầu chỉ 1 lần
    if (!meeting.startedAt) {
      meeting.startedAt = new Date();
    }

    meeting.updatedAt = new Date();
    await this.meetingRepo.save(meeting);
    // await this.meetingRoomRepository.updateStatusMeetingRoom(
    //   meeting.id,
    //   MEETING_TIME_STATUS.DANG_HOP,
    // );

    // Lấy danh sách người tham gia cuộc họp từ bảng meeting_participants
    const participants = await this.dataSource
      .getRepository(MeetingParticipantEntity)
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.unit', 'mu')
      .where('mu.meeting_id = :meetingId', { meetingId })
      .getMany();

    if (!participants || participants.length === 0) {
      throw new NotFoundException('Không tìm thấy người tham gia cuộc họp');
    }

    // Xử lý lọc danh sách người nhận thông báo:
    // 1. Không gửi cho người từ chối tham gia (NOT_PARTICIPATE)
    // 2. Gửi cho người được ủy quyền (delegatedToUserId) nếu cuộc họp được ủy quyền thành công
    // 3. Không gửi cho chính người click bắt đầu cuộc họp (userId)
    const recipientSet = new Set<string>();

    participants.forEach(p => {
      // Bỏ qua người từ chối tham gia cuộc họp
      if (
        p.participantState === ParticipantState.NOT_PARTICIPATE ||
        p.participantState === ('NOT_PARTICIPATE' as any)
      ) {
        return;
      }

      // Nếu có ủy quyền tham gia họp
      if (
        p.delegatedToUserId &&
        (p.delegationState === DelegationState.ACCEPTED ||
          p.delegationState === ('ACCEPTED' as any) ||
          p.participantState === ParticipantState.DELEGATED ||
          p.participantState === ('DELEGATED' as any) ||
          p.assignmentType === AssignmentType.DELEGATED ||
          p.assignmentType === ('DELEGATED' as any))
      ) {
        recipientSet.add(p.delegatedToUserId);
      } else if (p.userId) {
        // Người tham gia trực tiếp
        recipientSet.add(p.userId);
      }
    });

    // Bỏ qua người click bắt đầu cuộc họp
    recipientSet.delete(userId);

    const participantIds = Array.from(recipientSet);

    // Gửi thông báo cho tất cả người tham gia cuộc họp (đã lọc)
    if (participantIds.length > 0) {
      this.notificationService.createForRecipients({
        recipientIds: participantIds,
        senderId: userId, // Người gửi thông báo, có thể là chủ tịch hoặc thư ký
        type: NotificationType.MEETING_REMINDER_SOON.value,
        title: `Cuộc họp "${meeting.title}" đã bắt đầu`,
        content: `Cuộc họp "${meeting.title}" đã bắt đầu. Vui lòng tham gia ngay.`,
        recordId: meetingId,
        link: `/meetings/${meetingId}?listparammeeting=PARTICIPANT_MEETING`,
        key: NotificationKey.VIEW_MEETING_ROOM,
        time: new Date(),
        status: 0,  // Trạng thái chưa đọc
      });
    }
    /* ================= SEND EMAIL ================= */

    await this.sqlRepo.createComment({
      documentId: meeting.id,
      userId: userId,
      userName: await this.getUserNameById(userId) || userId,
      content: isEarly ? `Bắt đầu cuộc họp sớm. Lý do: ${reason}` : 'Bắt đầu cuộc họp',
    });
    try {
      const uniqueUserIds = [...new Set(participantIds)];

      uniqueUserIds.forEach(async (participantId) => {
        if (participantId === userId) return;

        try {
          const user = await this.sqlsvRepo.getUserById(participantId);

          if (user?.emailUser) {
            this.sendMeetingStartEmail(user.emailUser, meeting); // ✅ không await
          }
        } catch (err) {
          this.logger.error(`Send meeting start email failed: ${err}`);
        }
      });
    } catch (err) {
      this.logAsync(req, userId, details, 'ERROR');
      this.logger.error(`Send meeting start emails failed: ${err}`);
    }

    this.logAsync(req, userId, details, 'SUCCESS');
    return {
      meetingState: meeting.meetingState,
      startedAt: meeting.startedAt,
    };
  }

  /**
   * Gửi email thông báo cuộc họp đã kết thúc
   * @param {string} email - Địa chỉ email của người nhận
   * @param {MeetingEntity} meeting - Cuộc họp đã kết thúc
   */
  private sendMeetingEndEmail(
    email: string,
    meeting: MeetingEntity,
  ): void {
    const subject = `[Cuộc họp kết thúc] ${meeting.title}`;

    const html = `
      <p>Kính gửi,</p>

      <p>Cuộc họp <b>${meeting.title}</b> đã kết thúc.</p>

      <p>
        <b>Thời gian bắt đầu:</b> ${meeting.startedAt?.toLocaleString('vi-VN')}
      </p>

      <p>
        <b>Thời gian kết thúc:</b> ${meeting.endedAt?.toLocaleString('vi-VN')}
      </p>

      <p>Vui lòng truy cập hệ thống để xem lại nội dung cuộc họp.</p>

      <p>Trân trọng,<br/>Hệ thống quản lý cuộc họp</p>
    `;

    void this.mailService.sendMail({
      to: email,
      subject,
      html,
    }).catch((err) => {
      this.logger.error(
        `Send meeting end email failed: ${err.message}`,
        err.stack,
      );
    });
  }
  /**
   * Kết thúc cuộc họp
   * @param {string} meetingId - Id của cuộc họp
   * @param {string} userId - Id của người dùng đang thực hiện yêu cầu
   * @param {any} req - Yêu cầu HTTP
   * @throws {NotFoundException} Nếu không tìm thấy cuộc họp
   * @throws {ForbiddenException} Nếu người dùng không có quyền kết thúc cuộc họp
   * @throws {BadRequestException} Nếu cuộc họp không có thể kết thúc
   * @returns {Promise<{meetingState: string, endedAt: Date}>} Trạng thái và thời điểm kết thúc cuộc họp
   */
  async endMeeting(meetingId: string, userId: string, req?: any) {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId }
    });

    if (!meeting) {
      throw new NotFoundException('Không tìm thấy cuộc họp');
    }

    const details = `Kết thúc cuộc họp: ${meeting.title}`;

    const { isChairman, isSecretary } = await this.checkIsChairmanOrSecretary(meetingId, userId);
    if (!isChairman && !isSecretary) {
      throw new ForbiddenException('Không có quyền kết thúc cuộc họp');
    }

    if (meeting.meetingState !== 'DANG_HOP') {
      throw new BadRequestException(
        'Chỉ được kết thúc khi cuộc họp đang diễn ra',
      );
    }

    meeting.meetingState = 'KET_THUC';
    meeting.endedAt = new Date();
    meeting.attendanceLocked = true;
    meeting.updatedAt = new Date();

    await this.meetingRepo.save(meeting);

    // Xóa toàn bộ workitem của cuộc họp
    await this.deleteWorkItemsByDocumentIds([meetingId]);

    // ===== Lấy participants =====
    const participants = await this.dataSource
      .getRepository(MeetingParticipantEntity)
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.unit', 'mu')
      .where('mu.meeting_id = :meetingId', { meetingId })
      .getMany();

    if (!participants || participants.length === 0) {
      throw new NotFoundException('Không tìm thấy người tham gia cuộc họp');
    }

    const participantIds = participants.map(p => p.userId);

    // ===== Notification =====
    if (participantIds.length > 0) {
      this.notificationService.createForRecipients({
        recipientIds: participantIds,
        senderId: userId,
        type: NotificationType.MEETING_INFO_CHANGED.value,
        content: `Cuộc họp "${meeting.title}" đã kết thúc.`,
        recordId: meetingId,
        link: `/meetings/${meetingId}?listparammeeting=PARTICIPANT_MEETING`,
        key: NotificationKey.VIEW_MEETING_ROOM,
        time: new Date(),
        status: 0,
      });
    }

    // ===== Update attendance =====
    try {
      const subQuery = this.meetingParticipantRepo
        .createQueryBuilder()
        .subQuery()
        .select('mu.id')
        .from('meeting_units', 'mu')
        .where('mu.meeting_id = :meetingId')
        .getQuery();

      await this.meetingParticipantRepo
        .createQueryBuilder()
        .update(MeetingParticipantEntity)
        .set({
          attendanceState: ATTENDANCE_STATE.NOT_CHECKED,
        })
        .where(`meeting_unit_id IN ${subQuery}`)
        .andWhere(
          `(attendance_state = :received OR attendance_state IS NULL)`,
        )
        .setParameters({
          meetingId: meeting.id,
          received: ATTENDANCE_STATE.RECEIVED,
        })
        .execute();
    } catch (error) {
      this.logger.error(
        `[END_MEETING] Update attendance failed meetingId=${meeting.id}`,
        error,
      );
      this.logAsync(req, userId, details, 'ERROR');
      throw error;
    }

    // ===== Comment =====
    await this.sqlRepo.createComment({
      documentId: meeting.id,
      userId: userId,
      userName: await this.getUserNameById(userId) || userId,
      content: 'Kết thúc cuộc họp',
    });

    // ===== SEND EMAIL (NON-BLOCK) =====
    try {
      const uniqueUserIds = [...new Set(participantIds)];

      uniqueUserIds.forEach(async (participantId) => {
        if (participantId === userId) return;

        try {
          const user = await this.sqlsvRepo.getUserById(participantId);

          if (user?.emailUser) {
            this.sendMeetingEndEmail(user.emailUser, meeting); // 🚀 không await
          }
        } catch (err) {
          this.logger.error(`Send meeting end email failed: ${err}`, err.stack);
        }
      });
    } catch (err) {
      this.logAsync(req, userId, details, 'ERROR');
      this.logger.error(`Send meeting end emails failed: ${err}`);
    }

    if (meeting.parentId) {
      this.meetingStatusCronService.handleNextRecurringInstance(meeting).catch((err) => {
        this.logger.error(`[END_MEETING] Failed to generate next recurring instance: ${err.message}`, err.stack);
      });
    }

    this.logAsync(req, userId, details, 'SUCCESS');

    return {
      meetingState: meeting.meetingState,
      endedAt: meeting.endedAt,
    };
  }


  private async sendMeetingParticipantEmail(
    email: string,
    meeting: MeetingEntity,
  ) {
    try {
      const subject = `[Phân công tham gia cuộc họp] ${meeting.title}`;

      const html = `
        <p>Kính gửi,</p>

        <p>Bạn vừa được phân công tham gia cuộc họp:</p>

        <p>
          <b>Tiêu đề:</b> ${meeting.title}<br/>
          <b>Thời gian:</b> ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)}
        </p>

        <p>Vui lòng truy cập hệ thống để xem chi tiết.</p>

        <p>Trân trọng,<br/>Hệ thống quản lý cuộc họp</p>
      `;

      await this.mailService.sendMail({
        to: email,
        subject,
        html,
      });
    } catch (err) {
      this.logger.error(`Send participant email failed: ${err.message}`);
    }
  }
  /**
   * Đồng bộ danh sách người tham gia cuộc họp
   * @param meetingId - ID của cuộc họp
   * @param meetingUnitId - ID của đơn vị tham gia cuộc họp
   * @param unitId - ID của đơn vị
   * @param members - Danh sách người tham gia
   * @param originalUserId - ID của người thực hiện đồng bộ
   * @param secretary - ID của thư ký
   * @param req - Request object
   * @returns Object with success, message and data
   */
  async syncMeetingParticipants(
    meetingId: string,
    meetingUnitId: string,
    unitId: string,
    members: { userId: string }[],
    originalUserId: string,
    secretary?: string,
    req?: any
  ) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    const details = `Thêm người tham gia, ID cuộc họp: ${meetingId}`;

    try {
      type CalendarRemovedParticipant = {
        id: string;
        userId: string;
        googleCalendarEventId: string | null;
        googleCalendarHidden: boolean;
        googleEmail: string | null;
      };

      const normalizedMembers = Array.isArray(members)
        ? Array.from(
          new Map(
            members
              .filter(
                (member): member is { userId: string } =>
                  typeof member?.userId === 'string' &&
                  member.userId.trim().length > 0,
              )
              .map((member) => {
                const normalizedUserId = member.userId.trim();
                return [normalizedUserId, { userId: normalizedUserId }] as const;
              }),
          ).values(),
        )
        : [];
      const normalizedMeetingUnitId =
        typeof meetingUnitId === 'string' && meetingUnitId.trim().length > 0
          ? meetingUnitId.trim()
          : '';
      const normalizedUnitId =
        typeof unitId === 'string' && unitId.trim().length > 0
          ? unitId.trim()
          : '';
      const shouldSyncMembers =
        Array.isArray(members) &&
        (!!normalizedMeetingUnitId || !!normalizedUnitId);
      const shouldSyncSecretary = secretary !== undefined;
      const normalizedSecretary = typeof secretary === 'string' ? secretary.trim() : '';
      const removedParticipants = new Map<string, CalendarRemovedParticipant>();
      const participantIdsToSync = new Set<string>();

      const addRemovedParticipant = (
        participant?: Partial<MeetingParticipantEntity> | null,
      ) => {
        if (!participant?.id || !participant.userId) {
          return;
        }

        removedParticipants.set(participant.id, {
          id: participant.id,
          userId: participant.userId,
          googleCalendarEventId: participant.googleCalendarEventId || null,
          googleCalendarHidden: participant.googleCalendarHidden || false,
          googleEmail: participant.googleEmail || null,
        });
      };

      const resetParticipantGoogleSyncState = (
        participant: MeetingParticipantEntity,
      ) => {
        participant.googleEmail = null;
        participant.googleCalendarEventId = null;
        participant.googleCalendarSynced = false;
        participant.googleCalendarSyncStatus = 'PENDING';
        participant.googleCalendarSyncError = null;
        participant.googleCalendarSyncAt = null;
        participant.googleCalendarHidden = false;
      };

      if (!shouldSyncMembers && !shouldSyncSecretary) {
        throw new BadRequestException('Không có dữ liệu để cập nhật');
      }

      // 1. Lấy thông tin cuộc họp
      const meeting = await qr.manager
        .createQueryBuilder(MeetingEntity, 'm')
        .where('m.id = :meetingId', { meetingId })
        .getOne();

      if (!meeting) throw new Error('Không tìm thấy cuộc họp');

      const isMeetingApproved = await this.isMeetingApproved(meetingId);

      let meetingUnit: MeetingUnitEntity | null = null;
      if (shouldSyncMembers) {
        if (!normalizedMeetingUnitId && !normalizedUnitId) {
          throw new BadRequestException(
            'Thiếu thông tin đơn vị để đồng bộ người tham gia',
          );
        }

        if (normalizedMeetingUnitId) {
          meetingUnit = await qr.manager
            .createQueryBuilder(MeetingUnitEntity, 'mu')
            .where('mu.id = :meetingUnitId', {
              meetingUnitId: normalizedMeetingUnitId,
            })
            .andWhere('mu.meeting_id = :meetingId', { meetingId })
            .getOne();
        }

        if (!meetingUnit && normalizedUnitId) {
          meetingUnit = await qr.manager
            .createQueryBuilder(MeetingUnitEntity, 'mu')
            .where('mu.meeting_id = :meetingId', { meetingId })
            .andWhere('mu.unit_id = :unitId', { unitId: normalizedUnitId })
            .getOne();
        }

        if (!meetingUnit) {
          throw new Error('Không tìm thấy đơn vị tham gia cuộc họp');
        }
      }

      let deleteIds: string[] = [];
      let toAdd: { userId: string }[] = [];
      let addedUserIds: string[] = [];

      if (meetingUnit) {
        // 2. Current participants
        const currentParticipants = await qr.manager
          .createQueryBuilder()
          .select([
            'p.id',
            'p.userId',
            'p.userType',
            'p.participantRole',
            'p.googleCalendarEventId',
            'p.googleCalendarSynced',
            'p.googleCalendarHidden',
            'p.googleEmail',
            'p.assignmentType',
          ])
          .from(MeetingParticipantEntity, 'p')
          .where('p.meeting_unit_id = :meetingUnitId', {
            meetingUnitId: meetingUnit.id,
          })
          .getMany();

        const currentMemberParticipants = currentParticipants.filter(
          (participant) => participant.participantRole !== 'SECRETARY',
        );
        const currentUserIds = new Set(
          currentMemberParticipants.map((participant) => participant.userId),
        );
        const incomingUserIds = new Set(
          normalizedMembers.map((member) => member.userId),
        );

        /* currentMemberParticipants
        .filter(
          (participant) =>
            !incomingUserIds.has(participant.userId) &&
            participant.participantRole !== 'SECRETARY', // luôn filter luôn ở đây
        )
        .forEach((participant) => { addRemovedParticipant(participant); /*
          id: p.id, // ✅ QUAN TRỌNG
          userId: p.userId,
          googleCalendarEventId: p.googleCalendarEventId || null,
          googleCalendarHidden: p.googleCalendarHidden || false,
          googleEmail: p.googleEmail || null,
        */

        // 3. Delete removed members
        deleteIds = currentMemberParticipants
          .filter((participant) => !incomingUserIds.has(participant.userId) && participant.assignmentType !== AssignmentType.INITIAL && participant.assignmentType !== AssignmentType.DELEGATED)
          .map((participant) => {
            addRemovedParticipant(participant);
            return participant.id;
          });

        if (deleteIds.length) {
          await qr.manager
            .createQueryBuilder()
            .delete()
            .from(MeetingParticipantEntity)
            .whereInIds(deleteIds)
            .execute();
        }

        for (const participant of currentMemberParticipants) {
          if (
            incomingUserIds.has(participant.userId) &&
            (
              !participant.googleCalendarEventId ||
              participant.googleCalendarSynced !== true ||
              participant.googleCalendarHidden
            )
          ) {
            participantIdsToSync.add(participant.id);
          }
        }

        if (normalizedMembers.length > 0) {
          await qr.manager
            .createQueryBuilder()
            .update(MeetingParticipantEntity)
            .set({
              participantState: ParticipantState.CONFIRMED,
              acceptJoin: true,
            })
            .where('meeting_unit_id = :meetingUnitId', {
              meetingUnitId: meetingUnit.id,
            })
            .andWhere('userId IN (:...userIds)', {
              userIds: normalizedMembers.map((member) => member.userId),
            })
            .execute();
        }

        // 4. Insert new members
        toAdd = normalizedMembers.filter(
          (member) => !currentUserIds.has(member.userId),
        );
        addedUserIds = toAdd.map((member) => member.userId);

        if (toAdd.length) {
          await qr.manager
            .createQueryBuilder()
            .insert()
            .into(MeetingParticipantEntity)
            .values(
              toAdd.map((member) => ({
                userId: member.userId,
                participantState: ParticipantState.CONFIRMED,
                attendanceState: 'RECEIVED',
                assignmentType: AssignmentType.REPLACED,
                acceptJoin: true,
                prepareDocuments: true,
                unit: { id: meetingUnit.id },
              })),
            )
            .execute();
        }
      }

      let secretaryMeetingUnit: MeetingUnitEntity | null = null;
      let secretaryParticipant: MeetingParticipantEntity | null = null;
      let secretaryChanged = false;
      let secretaryNeedsCalendarSync = false;
      let previousSecretaryUserId: string | null = null;
      let oldSecretaryParticipant: any = null;
      // 5. Update secretary nếu có
      if (shouldSyncSecretary) {
        const shouldKeepExistingUnitSecretary =
          meeting.secretaryType === ParticipantType.UNIT;

        secretaryMeetingUnit = await qr.manager
          .createQueryBuilder(MeetingUnitEntity, 'mu')
          .where('mu.meeting_id = :meetingId', { meetingId })
          .andWhere('mu.unit_id = :unitId', { unitId: 'SECRETARY_UNIT' })
          .getOne();

        if (
          !secretaryMeetingUnit &&
          !normalizedSecretary &&
          !shouldKeepExistingUnitSecretary
        ) {
          await qr.manager
            .createQueryBuilder()
            .update(MeetingEntity)
            .set({
              secretaryId: null,
              secretaryType: ParticipantType.USER,
            })
            .where('id = :meetingId', { meetingId })
            .execute();
        }

        if (
          !secretaryMeetingUnit &&
          (normalizedSecretary || shouldKeepExistingUnitSecretary)
        ) {
          secretaryMeetingUnit = await qr.manager.save(
            qr.manager.create(MeetingUnitEntity, {
              meetingId,
              unitId: 'SECRETARY_UNIT',
            }),
          );
        }
        if (secretaryMeetingUnit) {
          oldSecretaryParticipant = await qr.manager
            .createQueryBuilder(MeetingParticipantEntity, 'p')
            .where('p.meeting_unit_id = :meetingUnitId', {
              meetingUnitId: secretaryMeetingUnit.id,
            })
            .andWhere('p.participant_role = :role', { role: 'SECRETARY' })
            .getOne();
        }

        if (secretaryMeetingUnit) {
          secretaryParticipant = await qr.manager
            .createQueryBuilder(MeetingParticipantEntity, 'p')
            .where('p.meeting_unit_id = :meetingUnitId', {
              meetingUnitId: secretaryMeetingUnit.id,
            })
            .andWhere('p.participant_role = :role', { role: 'SECRETARY' })
            .getOne();

          previousSecretaryUserId =
            secretaryParticipant?.userId ?? previousSecretaryUserId;

          const shouldKeepUnitSecretary =
            meeting.secretaryType === ParticipantType.UNIT ||
            secretaryParticipant?.userType === UserType.UNIT;
          const secretaryUnitId =
            shouldKeepUnitSecretary
              ? secretaryParticipant?.unitId ||
              (meeting.secretaryType === ParticipantType.UNIT
                ? meeting.secretaryId
                : null)
              : null;

          if (!normalizedSecretary) {
            if (shouldKeepUnitSecretary && secretaryUnitId) {
              if (!secretaryParticipant) {
                secretaryParticipant = await qr.manager.save(
                  qr.manager.create(MeetingParticipantEntity, {
                    meetingUnitId: secretaryMeetingUnit.id,
                    participantRole: 'SECRETARY',
                    userId: ParticipantType.UNIT,
                    userType: UserType.UNIT,
                    unitId: secretaryUnitId,
                    participantState: ParticipantState.RECEIVED,
                    attendanceState: 'RECEIVED',
                    assignmentType: AssignmentType.INITIAL,
                    acceptJoin: false,
                    prepareDocuments: false,
                    delegationState: DelegationState.NONE,
                    delegatedToUserId: null,
                    delegatedFromUserId: null,
                    delegatedAt: null,
                    rejectReason: undefined,
                  }),
                );
                secretaryChanged = true;
              } else if (
                secretaryParticipant.userId !== ParticipantType.UNIT ||
                secretaryParticipant.userType !== UserType.UNIT ||
                secretaryParticipant.unitId !== secretaryUnitId ||
                secretaryParticipant.participantState !==
                ParticipantState.RECEIVED ||
                secretaryParticipant.attendanceState !== 'RECEIVED' ||
                secretaryParticipant.assignmentType !== AssignmentType.INITIAL ||
                secretaryParticipant.acceptJoin !== false ||
                secretaryParticipant.prepareDocuments !== false ||
                secretaryParticipant.delegationState !==
                DelegationState.NONE ||
                secretaryParticipant.delegatedToUserId !== null ||
                secretaryParticipant.delegatedFromUserId !== null ||
                secretaryParticipant.delegatedAt !== null ||
                secretaryParticipant.rejectReason !== undefined &&
                secretaryParticipant.rejectReason !== ''
              ) {
                addRemovedParticipant(oldSecretaryParticipant || secretaryParticipant);
                secretaryParticipant.userId = ParticipantType.UNIT;
                secretaryParticipant.userType = UserType.UNIT;
                secretaryParticipant.unitId = secretaryUnitId;
                secretaryParticipant.participantState =
                  ParticipantState.RECEIVED;
                secretaryParticipant.attendanceState = 'RECEIVED';
                secretaryParticipant.assignmentType = AssignmentType.INITIAL;
                secretaryParticipant.acceptJoin = false;
                secretaryParticipant.prepareDocuments = false;
                secretaryParticipant.delegationState = DelegationState.NONE;
                secretaryParticipant.delegatedToUserId = null;
                secretaryParticipant.delegatedFromUserId = null;
                secretaryParticipant.delegatedAt = null;
                secretaryParticipant.rejectReason = '';
                resetParticipantGoogleSyncState(secretaryParticipant);
                secretaryParticipant = await qr.manager.save(
                  secretaryParticipant,
                );
                secretaryChanged = true;
              }

              await qr.manager
                .createQueryBuilder()
                .update(MeetingEntity)
                .set({
                  secretaryId: secretaryUnitId,
                  secretaryType: ParticipantType.UNIT,
                })
                .where('id = :meetingId', { meetingId })
                .execute();
            } else {
              if (secretaryParticipant) {
                addRemovedParticipant(oldSecretaryParticipant || secretaryParticipant);
                await qr.manager
                  .createQueryBuilder()
                  .delete()
                  .from(MeetingParticipantEntity)
                  .where('id = :id', { id: secretaryParticipant.id })
                  .execute();
                secretaryParticipant = null;
                secretaryChanged = true;
              }

              await qr.manager
                .createQueryBuilder()
                .update(MeetingEntity)
                .set({
                  secretaryId: null,
                  secretaryType: ParticipantType.USER,
                })
                .where('id = :meetingId', { meetingId })
                .execute();
            }
          } else if (!secretaryParticipant) {
            secretaryParticipant = await qr.manager.save(
              qr.manager.create(MeetingParticipantEntity, {
                meetingUnitId: secretaryMeetingUnit.id,
                participantRole: 'SECRETARY',
                userId: normalizedSecretary,
                userType: shouldKeepUnitSecretary
                  ? UserType.UNIT
                  : UserType.USER,
                unitId: shouldKeepUnitSecretary ? secretaryUnitId : null,
                participantState: ParticipantState.CONFIRMED,
                attendanceState: 'RECEIVED',
                assignmentType: AssignmentType.REPLACED,
                acceptJoin: true,
                prepareDocuments: true,
              }),
            );
            secretaryChanged = true;
            secretaryNeedsCalendarSync =
              secretaryParticipant.userId !== ParticipantType.UNIT;
          } else if (
            secretaryParticipant.userId !== normalizedSecretary ||
            secretaryParticipant.userType !==
            (shouldKeepUnitSecretary ? UserType.UNIT : UserType.USER) ||
            secretaryParticipant.unitId !==
            (shouldKeepUnitSecretary ? secretaryUnitId : null)
          ) {
            addRemovedParticipant(oldSecretaryParticipant || secretaryParticipant);
            secretaryParticipant.userId = normalizedSecretary;
            secretaryParticipant.userType = shouldKeepUnitSecretary
              ? UserType.UNIT
              : UserType.USER;
            secretaryParticipant.unitId = shouldKeepUnitSecretary
              ? secretaryUnitId
              : null;
            secretaryParticipant.participantState = ParticipantState.CONFIRMED;
            secretaryParticipant.attendanceState = 'RECEIVED';
            secretaryParticipant.assignmentType = AssignmentType.REPLACED;
            secretaryParticipant.acceptJoin = true;
            secretaryParticipant.prepareDocuments = true;
            resetParticipantGoogleSyncState(secretaryParticipant);
            secretaryParticipant = await qr.manager.save(secretaryParticipant);
            secretaryChanged = true;
            secretaryNeedsCalendarSync =
              secretaryParticipant.userId !== ParticipantType.UNIT;
          } else {
            if (
              secretaryParticipant.participantState !== ParticipantState.CONFIRMED ||
              secretaryParticipant.acceptJoin !== true
            ) {
              secretaryParticipant.participantState = ParticipantState.CONFIRMED;
              secretaryParticipant.acceptJoin = true;
              secretaryParticipant = await qr.manager.save(secretaryParticipant);
            }

            if (
              !secretaryParticipant.googleCalendarEventId ||
              secretaryParticipant.googleCalendarSynced !== true ||
              secretaryParticipant.googleCalendarHidden
            ) {
              secretaryNeedsCalendarSync =
                secretaryParticipant.userId !== ParticipantType.UNIT;
            }
          }

          await qr.manager
            .createQueryBuilder()
            .update(MeetingEntity)
            .set({
              secretaryId: shouldKeepUnitSecretary
                ? secretaryUnitId
                : normalizedSecretary || null,
              secretaryType: shouldKeepUnitSecretary
                ? ParticipantType.UNIT
                : ParticipantType.USER,
            })
            .where('id = :meetingId', { meetingId })
            .execute();
        }
      }

      // 6. Update meeting_unit
      if (meetingUnit && (deleteIds.length || toAdd.length || shouldSyncSecretary)) {
        await qr.manager
          .createQueryBuilder()
          .update(MeetingUnitEntity)
          .set({
            acceptJoin: true,
            assignParticipants: true,
          })
          .where('id = :meetingUnitId', { meetingUnitId: meetingUnit.id })
          .execute();
      }

      await qr.commitTransaction();
      // ===== QUEUE GOOGLE CALENDAR DELETE =====
      try {
        const removedParticipantsForCalendar = Array.from(
          removedParticipants.values(),
        );

        if (removedParticipantsForCalendar.length > 0) {
          for (const p of removedParticipantsForCalendar) {
            if (!p.googleCalendarEventId) {
              this.logger.warn(
                `[GCAL DELETE] Skip participant ${p.id} - missing eventId`,
              );
              continue;
            }

            this.backgroundGoogleCalendarSyncService.queueParticipantDeletion(
              p.id,
              meetingId,
              {
                id: p.id,
                googleCalendarEventId: p.googleCalendarEventId,
                googleCalendarHidden: p.googleCalendarHidden || false,
                googleEmail: p.googleEmail || null,
                userId: p.userId,
              },
            );
          }

        }
      } catch (err) {
        this.logger.error(
          `Queue calendar deletion failed: ${err.message}`,
        );
      }
      if (secretaryChanged) {
        try {
          await this.syncApprovedSecretaryWorkItem(
            meetingId,
            previousSecretaryUserId,
          );
        } catch (err) {
          this.logger.error(
            `Sync secretary work item after participant sync failed: ${err.message}`,
          );
        }
      }

      // 7. Query lại dữ liệu sau khi sync
      const syncedParticipants = meetingUnit
        ? await this.dataSource
          .getRepository(MeetingParticipantEntity)
          .createQueryBuilder('p')
          .select([
            'p.id',
            'p.userId',
            'p.participantState',
            'p.attendanceState',
            'p.assignmentType',
          ])
          .where('p.meeting_unit_id = :meetingUnitId', {
            meetingUnitId: meetingUnit.id,
          })
          .orderBy('p.userId', 'ASC')
          .getMany()
        : [];

      const syncedSecretary = secretaryMeetingUnit
        ? await this.dataSource
          .getRepository(MeetingParticipantEntity)
          .createQueryBuilder('p')
          .select([
            'p.id',
            'p.userId',
            'p.participantRole',
            'p.participantState',
            'p.attendanceState',
          ])
          .where('p.meeting_unit_id = :meetingUnitId', {
            meetingUnitId: secretaryMeetingUnit.id,
          })
          .andWhere('p.participant_role = :role', { role: 'SECRETARY' })
          .getOne()
        : null;

      const participantsForCalendarSync = syncedParticipants.filter(
        (participant) =>
          participantIdsToSync.has(participant.id) ||
          addedUserIds.includes(participant.userId),
      );
      const notifyRecipientIds = new Set<string>(
        syncedParticipants
          .map((participant) => participant.userId)
          .filter(Boolean),
      );
      if (meeting && isMeetingApproved) {
        const startTimeStr =
          meeting.meetingTime?.split('-')[0] || '09:00';
        const endTimeStr =
          meeting.meetingTime?.split('-')[1] || '10:00';

        let meetingDateStr: string;

        if (typeof meeting.meetingDate === 'string') {
          // nếu đã là YYYY-MM-DD thì dùng luôn
          if (meeting.meetingDate.includes('-')) {
            meetingDateStr = meeting.meetingDate;
          } else {
            // fallback DD/MM/YYYY
            const [day, month, year] = meeting.meetingDate.split('/');
            meetingDateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        } else {
          // ❌ KHÔNG dùng toISOString (tránh lệch ngày)
          const d = new Date(meeting.meetingDate);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          meetingDateStr = `${year}-${month}-${day}`;
        }

        const startDateTime = `${meetingDateStr}T${startTimeStr}:00+07:00`;
        const endDateTime = `${meetingDateStr}T${endTimeStr}:00+07:00`;

        const eventInput: GoogleCalendarEventInput = {
          title: meeting.title,
          description: meeting.content,
          startTime: startDateTime,
          endTime: endDateTime,
          reminders: [
            {
              method: 'email',
              minutes: 60,
            },
          ],
        };

        // Queue synced participants
        for (const participant of participantsForCalendarSync) {
          this.backgroundGoogleCalendarSyncService.queueParticipantSync(
            participant.id,
            meetingId,
            eventInput,
          );
        }

        // Also queue secretary if they exist
        if (
          syncedSecretary &&
          secretaryNeedsCalendarSync &&
          syncedSecretary.userId !== ParticipantType.UNIT
        ) {
          this.backgroundGoogleCalendarSyncService.queueParticipantSync(
            syncedSecretary.id,
            meetingId,
            eventInput,
          );
        }

      }
      const participantIds = Array.from(notifyRecipientIds);

      if (participantIds.length > 0 && originalUserId) {
        this.notificationService.createForRecipients({
          recipientIds: participantIds,
          senderId: originalUserId,
          type: NotificationType.MEETING_INVITATION.value,
          content: `Bạn đã được phân công tham gia cuộc họp "${meeting.title}" lúc ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)}. Vui lòng kiểm tra chi tiết cuộc họp.`,
          recordId: meetingId,
          link: `/meetings/${meetingId}?listparammeeting=PARTICIPANT_MEETING`,
          key: NotificationKey.VIEW_MEETING_ROOM,
          time: new Date(),
          status: 0,
        });

        if (addedUserIds.length) {
          try {
            await Promise.all(
              addedUserIds.map(async uid => {
                if (uid === originalUserId) return;
                const user = await this.sqlsvRepo.getUserById(uid);
                if (user?.emailUser) {
                  await this.sendMeetingParticipantEmail(user.emailUser, meeting);
                }
              }),
            );
          } catch (err) {
            this.logger.error(`Send meeting participant emails failed: ${err.message}`);
          }
        }
      }

      if (
        secretaryChanged &&
        syncedSecretary?.userId &&
        syncedSecretary.userId !== UserType.UNIT &&
        syncedSecretary.userId !== originalUserId
      ) {
        this.notificationService.createForRecipients({
          recipientIds: [syncedSecretary.userId],
          senderId: originalUserId,
          type: NotificationType.MEETING_INVITATION.value,
          content: `Bạn được phân công THƯ KÝ cuộc họp "${meeting.title}" lúc ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)}. Vui lòng kiểm tra chi tiết cuộc họp.`,
          recordId: meetingId,
          link: `/meetings/${meetingId}?listparammeeting=PARTICIPANT_MEETING`,
          key: NotificationKey.VIEW_MEETING_ROOM,
          time: new Date(),
          status: 0,
        });

        try {
          const user = await this.sqlsvRepo.getUserById(syncedSecretary.userId);
          if (user?.emailUser) {
            await this.sendMeetingRoleEmail(
              user.emailUser,
              meeting,
              'THƯ KÝ',
            );
          }
        } catch (err) {
          this.logger.error(`Send secretary email failed: ${err.message}`);
        }
      }

      this.logAsync(req, originalUserId, details, 'SUCCESS');

      // Reset cache khi đã sync thành công
      // this.resetMeetingCache(meetingId);

      return {
        success: true,
        message: 'Đồng bộ danh sách người tham gia thành công',
        data: {
          meetingUnitId: meetingUnit?.id ?? null,
          unitId: (meetingUnit?.unitId ?? normalizedUnitId) || null,
          participants: syncedParticipants,
          secretary: syncedSecretary,
        },
      };
    } catch (err) {
      await qr.rollbackTransaction();
      this.logAsync(req, originalUserId, details, 'ERROR');
      throw err;
    } finally {
      await qr.release();
    }
  }

  private async sendMeetingCancelEmail(
    email: string,
    meeting: MeetingEntity,
    note?: string,
  ) {
    try {
      const subject = `[Hủy cuộc họp] ${meeting.title}`;

      const html = `
        <p>Kính gửi,</p>

        <p>Cuộc họp sau đã bị <b>HỦY</b>:</p>

        <p>
          <b>Tiêu đề:</b> ${meeting.title}<br/>
          <b>Thời gian:</b> ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)}
        </p>

        ${note ? `<p><b>Lý do hủy:</b> ${note}</p>` : ''}

        <p>Vui lòng kiểm tra lại lịch làm việc.</p>

        <p>Trân trọng,<br/>Hệ thống quản lý cuộc họp</p>
      `;

      await this.mailService.sendMail({
        to: email,
        subject,
        html,
      });
    } catch (err) {
      this.logger.error(`Send cancel meeting email failed: ${err.message}`);
    }
  }
  async cancelMeeting(meetingId: string, userId: string, note: string, req?: any) {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
      relations: ['units', 'units.participants'],
    });

    if (!meeting) {
      return { success: false, message: 'Không tìm thấy cuộc họp' };
    }

    const details = `Hủy cuộc họp: ${meeting.title}`;
    const bpmnVersion = meeting.bpmnVersion || 'QUY_TRINH_LICH_HOP';

    // ===== Permission =====
    const participants = meeting.units?.flatMap(u => u.participants ?? []) ?? [];

    const isCreator = meeting.createdBy === userId;
    const isChairman = meeting.chairmanId === userId || meeting.units?.some(u =>
      u.participants?.some(p =>
        (p.participantRole === 'CHAIRMAN' || u.unitId === 'CHAIRMAN_UNIT') &&
        (p.userId === userId || (p.delegatedToUserId === userId && p.delegationState === DelegationState.ACCEPTED))
      )
    );
    const isSecretary = meeting.secretaryId === userId || meeting.units?.some(u =>
      u.participants?.some(p =>
        (p.participantRole === 'SECRETARY' || u.unitId === 'SECRETARY_UNIT') &&
        (p.userId === userId || (p.delegatedToUserId === userId && p.delegationState === DelegationState.ACCEPTED))
      )
    );
    const isAprover = this.isMeetingApprovedByUser(meeting.id, userId);

    if (!isCreator && !isChairman && !isSecretary && !isAprover) {
      return { success: false, message: 'Không có quyền hủy cuộc họp' };
    }

    // ===== BPMN =====
    const bpmnXML = await this.sqlRepo.getBpmnFile(bpmnVersion);
    const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);

    const cancelNode = this.findCancelEventNode(indexes);
    if (!cancelNode) {
      throw new BadRequestException('Luồng BPMN không hỗ trợ HỦY');
    }

    let outs = indexes.outgoingBySource.get(cancelNode.id) || [];

    for (const f of outs) {
      const target = f.targetRef;
      if (
        target &&
        (target.$type === 'bpmn:ExclusiveGateway' ||
          target.$type === 'bpmn:InclusiveGateway')
      ) {
        outs = indexes.outgoingBySource.get(target.id) || [];
        break;
      }
    }

    const firstFlow = outs[0];
    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
      firstFlow,
      indexes,
    );

    if (nextNode.$type === 'bpmn:ServiceTask') {
      const result = await this.serviceTaskExecutor.executeIfServiceTask({
        nodeId: nextNode.id,
        bpmnXml: bpmnXML,
        variables: {
          meetingId: meeting.id,
          nodeId: nextNode.id,
          indexes,
          bpmnVersion,
        },
      });

      if (!result?.nextNodes?.length) {
        throw new BadRequestException(
          `ServiceTask ${nextNode.id} không trả về nextNodes`,
        );
      }

      const nextNodeId = result.nextNodes[0].nodeId;
      const resolvedNextNode = indexes.nodes.get(nextNodeId);

      if (!resolvedNextNode) {
        throw new BadRequestException(`Không tìm thấy node ${nextNodeId}`);
      }

      const targetRole = indexes.laneMap.get(resolvedNextNode.id);
      if (!targetRole) {
        throw new BadRequestException(`Không tìm thấy role`);
      }

      await this.sqlRepo.removeAllWorkItems(meetingId);

      // await this.sqlRepo.addWorkItem(
      //   meetingId,
      //   {
      //     id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      //     nodeId: resolvedNextNode.id,
      //     role: targetRole,
      //     assigneeUserId: meeting.createdBy,
      //     nodeType: resolvedNextNode.$type,
      //   },
      //   undefined,
      //   bpmnVersion,
      // );

      await this.cancelApprovedAudit(meeting.id, userId);
    }


    // ===== Update meeting =====
    meeting.cancelledBy = userId;
    meeting.cancelledAt = new Date();
    meeting.cancelledReason = note;
    meeting.meetingState = 'DA_HUY';
    meeting.updatedAt = new Date();
    meeting.stageStatus = null;

    await this.meetingRepo.save(meeting);

    // ===== Recipients =====
    const recipientSet = new Set<string>();

    participants.forEach(p => {
      if (p.userId) recipientSet.add(p.userId);
    });

    if (meeting.createdBy) {
      recipientSet.add(meeting.createdBy);
    }

    recipientSet.delete(userId);
    const recipientIds = Array.from(recipientSet);

    // ===== Notification =====
    if (recipientIds.length) {
      this.notificationService.createForRecipients({
        recipientIds,
        senderId: userId,
        type: NotificationType.MEETING_INFO_CHANGED.value,
        content: `Cuộc họp "${meeting.title}" lúc ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)} đã bị HỦY`,
        recordId: meeting.id,
        link: `/meetings/${meeting.id}?listparammeeting=NO_ACTION`,
        key: NotificationKey.VIEW_MEETING_ROOM,
        time: new Date(),
        status: 0,
      });

      // ===== EMAIL (OPTIMIZED) =====
      try {
        const emails = await this.sqlsvRepo.getEmailsByUserIds(recipientIds);

        emails.forEach((email) => {
          this.sendMeetingCancelEmail(email, meeting, note); // 🚀 fire-and-forget
        });
      } catch (err) {
        this.logger.error(
          `Send cancel emails failed: ${err}`,
          err,
        );
        this.logAsync(req, userId, details, 'ERROR');
      }
    }

    // ===== Comment =====
    await this.sqlRepo.createComment({
      documentId: meeting.id,
      userId: userId,
      userName: await this.getUserNameById(userId) || userId,
      content: 'Hủy cuộc họp',
    });

    this.logAsync(req, userId, details, 'SUCCESS');

    this.backgroundGoogleCalendarSyncService.queueMeetingCancellation(meeting.id);

    return { success: true, message: 'Hủy cuộc họp thành công' };
  }

  // Hủy lịch lặp
  async cancelRecuringMeeting(
    meetingId: string,
    userId: string,
    note: string,
    isToday?: boolean,
    isNextDay?: boolean,
    req?: any,
  ) {
    const details = `Hủy cuộc họp định kỳ, ID cuộc họp: ${meetingId}`;
    try {
      const meeting = await this.meetingRepo.findOne({
        where: { id: meetingId },
        relations: ['units', 'units.participants', 'recurrence'],
      });

      if (!meeting) {
        return { success: false, message: 'Không tìm thấy cuộc họp' };
      }

      const participants = meeting.units?.flatMap(u => u.participants ?? []) ?? [];

      const isCreator = meeting.createdBy === userId;
      const isChairman = meeting.chairmanId === userId || meeting.units?.some(u =>
        u.participants?.some(p =>
          (p.participantRole === 'CHAIRMAN' || u.unitId === 'CHAIRMAN_UNIT') &&
          (p.userId === userId || (p.delegatedToUserId === userId && p.delegationState === DelegationState.ACCEPTED))
        )
      );
      const isSecretary = meeting.secretaryId === userId || meeting.units?.some(u =>
        u.participants?.some(p =>
          (p.participantRole === 'SECRETARY' || u.unitId === 'SECRETARY_UNIT') &&
          (p.userId === userId || (p.delegatedToUserId === userId && p.delegationState === DelegationState.ACCEPTED))
        )
      );

      const isAprover = await this.isMeetingApprovedByUser(meeting.id, userId);

      if (!isCreator && !isChairman && !isSecretary && !isAprover) {
        return { success: false, message: 'Không có quyền hủy cuộc họp' };
      }

      const today = dayjs().format('YYYY-MM-DD');

      // ==============================
      // CASE 1: HỦY CHỈ HÔM NAY
      // ==============================
      if (isToday) {
        const instance = await this.meetingRepo.findOne({
          where: {
            parentId: meeting.parentId ?? meeting.id,
            meetingDate: today,
          },
        });

        if (!instance) {
          return { success: false, message: 'Không có lịch hôm nay' };
        }

        instance.isCancelled = true;
        instance.meetingState = 'DA_HUY';
        instance.cancelledBy = userId;
        instance.cancelledAt = new Date();
        instance.cancelledReason = note;

        await this.meetingRepo.save(instance);

        await this.sqlRepo.createComment({
          documentId: meeting.id,
          userId: userId,
          userName: await this.getUserNameById(userId) || userId,
          content: 'Hủy cuộc họp',
        });

        // ===== Notification & EMAIL (CASE 1) =====
        const recipientSet = new Set<string>();
        participants.forEach(p => {
          if (p.userId) recipientSet.add(p.userId);
        });
        if (meeting.createdBy) {
          recipientSet.add(meeting.createdBy);
        }
        recipientSet.delete(userId);
        const recipientIds = Array.from(recipientSet);

        if (recipientIds.length) {
          this.notificationService.createForRecipients({
            recipientIds,
            senderId: userId,
            type: NotificationType.MEETING_STATUS_CHANGED.value,
            content: `Cuộc họp "${instance.title}" lúc ${instance.meetingTime} ngày ${formatDateVN(instance.meetingDate)} đã bị HỦY`,
            recordId: instance.id,
            link: `/meetings/${instance.id}`,
            key: NotificationKey.VIEW_MEETING_ROOM,
            time: new Date(),
            status: 0,
          });

          try {
            const emails = await this.sqlsvRepo.getEmailsByUserIds(recipientIds);
            emails.forEach((email) => {
              this.sendMeetingCancelEmail(email, instance, note);
            });
          } catch (err) {
            this.logger.error(
              `Send cancel emails failed: ${err}`,
              err,
            );
            this.logAsync(req, userId, details, 'ERROR');
          }
        }

        this.logAsync(req, userId, details, 'SUCCESS');

        this.backgroundGoogleCalendarSyncService.queueMeetingCancellation(instance.id);

        return { success: true, message: 'Đã hủy lịch hôm nay' };
      }

      // ==============================
      // CASE 2: HỦY TỪ HÔM NAY TRỞ ĐI
      // ==============================
      if (isNextDay) {
        const rootId = meeting.parentId ?? meeting.id;

        await this.meetingRepo
          .createQueryBuilder()
          .update()
          .set({
            isCancelled: true,
            meetingState: 'DA_HUY',
            cancelledBy: userId,
            cancelledAt: new Date(),
            cancelledReason: note,
          })
          .where('parentId = :rootId', { rootId })
          .andWhere('meetingDate >= :today', { today })
          .execute();

        // stop generate future
        if (meeting.recurrence) {
          meeting.recurrence.endDate = today;
          await this.recurrenceRepo.save(meeting.recurrence);
        }

        await this.sqlRepo.createComment({
          documentId: meeting.id,
          userId: userId,
          userName: await this.getUserNameById(userId) || userId,
          content: 'Hủy cuộc họp',
        });

        // ===== Notification & EMAIL (CASE 2) =====
        const recipientSet = new Set<string>();
        participants.forEach(p => {
          if (p.userId) recipientSet.add(p.userId);
        });
        if (meeting.createdBy) {
          recipientSet.add(meeting.createdBy);
        }
        recipientSet.delete(userId);
        const recipientIds = Array.from(recipientSet);

        if (recipientIds.length) {
          this.notificationService.createForRecipients({
            recipientIds,
            senderId: userId,
            type: NotificationType.MEETING_STATUS_CHANGED.value,
            content: `Cuộc họp "${meeting.title}" từ hôm nay trở đi đã bị HỦY`,
            recordId: meeting.id,
            link: `/meetings/${meeting.id}?listparammeeting=NO_ACTION`,
            key: NotificationKey.VIEW_MEETING_ROOM,
            time: new Date(),
            status: 0,
          });

          try {
            const emails = await this.sqlsvRepo.getEmailsByUserIds(recipientIds);
            emails.forEach((email) => {
              this.sendMeetingCancelEmail(email, meeting, note);
            });
          } catch (err) {
            this.logger.error(
              `Send cancel emails failed: ${err}`,
              err,
            );
            this.logAsync(req, userId, details, 'ERROR');
          }
        }

        this.logAsync(req, userId, details, 'SUCCESS');

        this.backgroundGoogleCalendarSyncService.queueMeetingCancellation(meeting.id);

        return { success: true, message: 'Đã hủy từ hôm nay trở đi' };
      }

      // ==============================
      // CASE 3: HỦY TOÀN BỘ (TEMPLATE)
      // ==============================
      meeting.isCancelled = true;
      meeting.meetingState = 'DA_HUY';
      meeting.cancelledBy = userId;
      meeting.cancelledAt = new Date();
      meeting.cancelledReason = note;

      await this.meetingRepo.save(meeting);

      await this.meetingRepo.update(
        { parentId: meeting.id },
        {
          isCancelled: true,
          meetingState: 'DA_HUY',
        },
      );

      await this.sqlRepo.createComment({
        documentId: meeting.id,
        userId: userId,
        userName: await this.getUserNameById(userId) || userId,
        content: 'Hủy lịch lặp các cuộc họp',
      });

      // ===== Notification & EMAIL (CASE 3) =====
      const recipientSet = new Set<string>();
      participants.forEach(p => {
        if (p.userId) recipientSet.add(p.userId);
      });
      if (meeting.createdBy) {
        recipientSet.add(meeting.createdBy);
      }
      recipientSet.delete(userId);
      const recipientIds = Array.from(recipientSet);

      if (recipientIds.length) {
        this.notificationService.createForRecipients({
          recipientIds,
          senderId: userId,
          type: NotificationType.MEETING_STATUS_CHANGED.value,
          title: 'Thông báo hủy lịch họp',
          content: `Lịch lặp cuộc họp "${meeting.title}" đã bị HỦY hoàn toàn`,
          recordId: meeting.id,
          link: `/meetings/${meeting.id}?listparammeeting=NO_ACTION`,
          key: NotificationKey.VIEW_MEETING_ROOM,
          time: new Date(),
          status: 0,
        });

        try {
          const emails = await this.sqlsvRepo.getEmailsByUserIds(recipientIds);
          emails.forEach((email) => {
            this.sendMeetingCancelEmail(email, meeting, note);
          });
        } catch (err) {
          this.logger.error(
            `Send cancel emails failed: ${err}`,
            err,
          );
          this.logAsync(req, userId, details, 'ERROR');
        }
      }

      this.logAsync(req, userId, details, 'SUCCESS');

      this.backgroundGoogleCalendarSyncService.queueMeetingCancellation(meeting.id);

      return { success: true, message: 'Hủy toàn bộ lịch lặp thành công' };
    } catch (error) {
      this.logger.error(`Send cancel meeting emails failed: ${error.message}`);
      this.logAsync(req, userId, details, 'ERROR');
    }
  }

  async cancelApprovedAudit(
    meetingId: string,
    userId: string,
  ): Promise<void> {
    const pool = await this.getPool();

    await pool
      .request()
      .input('meetingId', sql.VarChar, meetingId)
      .input('userId', sql.VarChar, userId)
      .query(`
        UPDATE audit
        SET
          stage_status = N'BI_HUY',
          curStatusCode = '0',
          processed_by = @userId,
          updated_at = GETDATE()
        WHERE document_id = @meetingId
          AND type_document = '${this.typeDocument}'
          AND stage_status = N'DONG_Y_PHE_DUYET'
      `);
  }



  private findCancelEventNode(indexes: any) {
    for (const node of indexes.nodes.values()) {

      // 1. Chỉ cần là Event (Throw / Start / End)
      if (!node.$type || !node.$type.includes('Event')) continue;

      // 2. Phải có outgoing → THROW
      if (!node.outgoing || node.outgoing.length === 0) continue;

      // 3. actionCode
      const ext = getAllNodeExtensionProperties(node);
      if (ext.actionCode === 'CANCEL_MEETING') {
        return node;
      }
    }
    return null;
  }


  // Lấy action của node 
  async getNextAction({
    meetingId,
    userId,
    authorId,
    workItemId,
    payload,
    authority = false,
  }: {
    meetingId: string;
    userId: string;
    authorId?: string;
    workItemId?: string;
    payload?: any;
    authority?: boolean;
  }): Promise<any> {
    try {
      // Lấy thông tin cuộc họp từ database
      const meeting = await this.sqlRepo.getMeeting(meetingId);
      if (!meeting) {
        return { success: false, message: 'Không tìm thấy cuộc họp' };
      }

      const bpmnXML = await this.sqlRepo.getBpmnFile(meeting.bpmnVersion);
      const { process, indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);

      // Kiểm tra và xác định assigneeUserId
      const assigneeUserId = authority && authorId ? authorId : userId;
      if (!assigneeUserId) {
        return { success: false, message: 'User ID không hợp lệ' };
      }

      let result;
      let nextNode: Node | null = null;

      // Kiểm tra nếu có workItemId, gọi hàm lấy node tiếp theo
      if (workItemId) {
        const actionCode = payload?.actionCode?.toUpperCase();
        if (!actionCode) {
          return { success: false, message: 'Action code không hợp lệ trong payload' };
        }

        // Gọi hàm getNextNode từ runtimeDbService để lấy node tiếp theo
        result = await this.runtimeDbService.getNextNode({
          bpmnXML,
          meetingId,
          workItemId,
          assigneeUserId,
          actionCode,
        });

        // Lưu thông tin nextNode từ kết quả trả về
        nextNode = result?.nextNode;
        if (!nextNode) {
          return { success: false, message: 'Không tìm thấy node tiếp theo' };
        }
      }
      if (!nextNode) {
        return { success: false, message: 'Không tìm thấy node tiếp theo' };
      }

      // Tạo một openWorkItems mới từ nextNode
      // Sử dụng Optional Chaining để tránh lỗi khi nextNode là null hoặc undefined
      const openWorkItems = [
        {
          id: `wi_${new Date().getTime()}`, // ID duy nhất cho work item, ví dụ từ timestamp
          documentId: meetingId, // ID tài liệu cuộc họp
          nodeId: nextNode?.id, // Node ID của nextNode, dùng optional chaining
          role: nextNode.targetRole, // Vai trò giả định, bạn có thể thay đổi nếu cần
          assigneeUserId: assigneeUserId, // Gán assignee là người dùng hiện tại
          nodeType: nextNode?.$type, // Kiểu node nếu cần thiết, dùng optional chaining
          state: 'open', // Trạng thái work item
          created_at: new Date().toISOString(), // Thời gian tạo work item
          bpmn_version: meeting.bpmnVersion, // Phiên bản BPMN của cuộc họp
        },
      ];


      // Lấy các thông tin về người dùng và vai trò
      const poolPromise = this.getPool();
      const [pool, userRoleRes, userRes, audit] = await Promise.all([
        poolPromise,
        this.userService.getUserRole(userId),
        this.userRepo.findOne({
          where: { id: userId },
          relations: ['parent'],
          select: ['id'],
        }),
        this.sqlRepo.getAudit(meeting.id),
      ]);

      // Kiểm tra lại thông tin người dùng
      if (!userRoleRes || !userRes) {
        return { success: false, message: 'Không tìm thấy thông tin người dùng' };
      }

      const userContext = {
        userId,
        roles: userRoleRes?.roles || [],
        receiverUnit: userRes?.parent?.id ?? null,
      };

      // Duyệt qua các work item mới tạo và tính toán hành động có sẵn
      const perItems: any[] = [];
      for (const wi of openWorkItems) {
        const res = await this.bpmnEngine.computeAvailableActions({
          process,
          indexes,
          currentNodeId: wi.nodeId,
          workItem: wi,
          document: meeting,
          userId: assigneeUserId, // Sử dụng assigneeUserId
          userRoles: userContext.roles,
          getUsersByRole: (role) => this.sqlsvRepo.getUsersByRoleMongoDB(role),
          audit,
        });

        perItems.push({
          workItem: wi,
          node: res.node,
          availableActions: res.availableActions,
          flags: res.flags,
        });
      }

      // Tìm action đầu tiên có thể thực hiện
      const first = perItems.find((x) =>
        x.availableActions.some((a: any) => a.canExecute),
      );

      // Nếu không tìm thấy, dùng phần tử đầu tiên
      const summary = first || perItems[0] || { workItem: null, availableActions: [], flags: {} };

      // Kết hợp các flags từ tất cả các work item
      const summaryFlags = perItems.reduce((acc, x) => ({ ...acc, ...x.flags }), {});

      // Trả về kết quả cuối cùng với nextNode và các work item đã tạo
      return {
        success: true,
        workItem: summary.workItem,
        availableActions: summary.availableActions,
        flags: summaryFlags,
        nextNode, // Thêm nextNode vào kết quả trả về
        openWorkItems, // Trả về openWorkItems đã tạo
      };
    } catch (err) {
      this.logger.error('Error in getNextAction:', err);
      return {
        success: false,
        message: err?.message || 'Đã xảy ra lỗi khi lấy hành động tiếp theo',
      };
    }
  }

  private async sendMeetingDelegationEmail(
    email: string,
    meeting: MeetingEntity,
    delegatorName?: string,
  ) {
    try {
      const subject = `[Ủy quyền tham gia cuộc họp] ${meeting.title}`;

      const html = `
        <p>Kính gửi,</p>

        <p>Bạn vừa được <b>${delegatorName ?? 'một người dùng'}</b> ủy quyền tham gia cuộc họp:</p>

        <p>
          <b>Tiêu đề:</b> ${meeting.title}<br/>
          <b>Thời gian:</b> ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)}
        </p>

        <p>Vui lòng truy cập hệ thống để xem chi tiết và tham gia cuộc họp.</p>

        <p>Trân trọng,<br/>Hệ thống quản lý cuộc họp</p>
      `;

      await this.mailService.sendMail({
        to: email,
        subject,
        html,
      });
    } catch (err) {
      this.logger.error(`Send delegation email failed: ${err.message}`);
    }
  }
  // Ủy quyền họp
  async delegateMeeting(
    payload: DelegateMeetingPayload,
    originalUserId: string,
    req?: any
  ) {
    const { meetingId, actionCode, userId, workItem } = payload
    const details = `Ủy quyền cuộc họp, ID cuộc họp: ${meetingId}`;

    try {
      // Kiểm tra cuộc họp tồn tại
      const meeting = await this.meetingRepo.findOne({
        where: { id: meetingId },
      });

      if (!meeting) {
        throw new BadRequestException('Cuộc họp không tồn tại.');
      }

      // Check conflict for the delegatee
      const userConflicts = await this.checkUserConflict(
        meeting.meetingDate,
        meeting.meetingTime,
        [userId],
        meetingId
      );

      if (userConflicts.length > 0) {
        const conflict = userConflicts[0];
        throw new BadRequestException(`Cán bộ ${conflict.userName} đã có lịch họp khác (${conflict.meetingTime}) vào ngày ${formatDateVN(conflict.meetingDate)}.`);
      }

      // Check if the delegatee is already in the meeting participant list
      if (meeting.chairmanId === userId || meeting.secretaryId === userId) {
        throw new BadRequestException('Người được ủy quyền đã có tên trong danh sách tham gia cuộc họp này.');
      }

      const isAlreadyInMeeting = await this.participantRepo
        .createQueryBuilder('p')
        .innerJoin('meeting_units', 'mu', 'mu.id = p.meeting_unit_id')
        .where('mu.meeting_id = :meetingId', { meetingId })
        .andWhere(new Brackets(qb => {
          qb.where('p.user_id = :userId', { userId })
            .orWhere('p.delegated_to_user_id = :userId', { userId });
        }))
        .getOne();

      if (isAlreadyInMeeting) {
        throw new BadRequestException('Người được ủy quyền đã có tên trong danh sách tham gia cuộc họp này.');
      }

      // 1. Lấy thông tin người dùng (người được ủy quyền)
      const userRes = await this.userRepo.findOne({
        where: { id: originalUserId },
        relations: ['parent'],
        select: ['id'],
      });

      const receiverUnit = userRes?.parent?.id ?? '';

      // Kiểm tra unitId hợp lệ
      const unitIds = ['SECRETARY_UNIT', 'CHAIRMAN_UNIT'];
      if (receiverUnit) {
        unitIds.push(receiverUnit);
      }

      const meetingUnits = await this.meetingUnitRepo.find({
        where: {
          meetingId: meetingId,
          unitId: In(unitIds),
        },
      });

      if (meetingUnits.length === 0) {
        throw new BadRequestException('Không tìm thấy đơn vị cuộc họp thích hợp.');
      }

      let participantUpdated = false;

      for (const meetingUnit of meetingUnits) {
        const participant = await this.participantRepo.findOne({
          where: {
            meetingUnitId: meetingUnit.id,
            userId: originalUserId,
          },
        });

        if (!participant) {
          continue;
        }

        if (participant.delegatedToUserId !== null) {
          throw new BadRequestException('Người tham gia này đã được ủy quyền cho người khác.');
        }

        // Cập nhật thông tin ủy quyền chờ duyệt
        participant.delegatedToUserId = userId;
        participant.delegatedFromUserId = originalUserId;
        participant.delegatedAt = new Date();

        participant.participantState = ParticipantState.PENDING;
        participant.assignmentType = AssignmentType.DELEGATED;
        participant.attendanceState = 'RECEIVED';
        participant.delegationState = DelegationState.PENDING;

        // Nếu participant chưa có nodeId (ví dụ dữ liệu cũ), lưu fallback nodeId từ workItem hoặc Activity_1kmmgo3
        if (!participant.nodeId) {
          participant.nodeId = (workItem as any)?.nodeId || 'Activity_1kmmgo3';
        }
        if (!participant.bpmnRole) {
          participant.bpmnRole = (workItem as any)?.role || 'NGUOI_THAM_GIA';
        }

        await this.participantRepo.save(participant);
        participantUpdated = true;
      }

      if (!participantUpdated) {
        throw new BadRequestException('Không tìm thấy thông tin người tham gia hợp lệ để ủy quyền.');
      }

      // Xóa WorkItem của người ủy quyền ban đầu (để họ "vẫn next" - không hiển thị công việc này nữa)
      await this.sqlRepo.removeWorkItemByAssignee(meetingId, originalUserId);

      // Cập nhật lại số lượng pendingDelegationCount trong bảng meetings
      const pendingCount = await this.participantRepo
        .createQueryBuilder('p')
        .innerJoin('meeting_units', 'mu', 'mu.id = p.meeting_unit_id')
        .where('mu.meeting_id = :meetingId', { meetingId })
        .andWhere('p.delegation_state = :state', { state: DelegationState.PENDING })
        .getCount();

      await this.meetingRepo.update(meetingId, { pendingDelegationCount: pendingCount });

      // Gửi thông báo phê duyệt cho người tạo và thư ký
      const approverIds: string[] = [];
      if (meeting.createdBy) {
        approverIds.push(meeting.createdBy);
      }
      if (meeting.secretaryId) {
        if (meeting.secretaryType === ParticipantType.USER) {
          approverIds.push(meeting.secretaryId);
        } else if (meeting.secretaryType === ParticipantType.UNIT) {
          const clerks = await this.getSecretaryClerks(meeting.secretaryId);
          approverIds.push(...clerks);
        }
      }

      // Lọc trùng và loại bỏ chính người gửi yêu cầu
      const uniqueApprovers = Array.from(new Set(approverIds)).filter(id => id !== originalUserId);

      if (uniqueApprovers.length > 0) {
        const delegator = await this.sqlsvRepo.getUserById(originalUserId);
        const delegatedUser = await this.sqlsvRepo.getUserById(userId);

        this.notificationService.createForRecipients({
          recipientIds: uniqueApprovers,
          senderId: originalUserId,
          type: NotificationType.MEETING_PARTICIPANT_AUTHORIZED.value,
          title: 'Yêu cầu phê duyệt ủy quyền họp',
          content: `Người tham gia ${delegator?.name || ''} yêu cầu ủy quyền cho ${delegatedUser?.name || ''} tham gia cuộc họp "${meeting.title}"`,
          recordId: meeting.id,
          link: `/meetings/${meeting.id}?openDelegates=true&listparammeeting=APPROVER_MEETING`,
          key: NotificationKey.VIEW_MEETING_ROOM,
          time: new Date(),
          status: 0,
        });
      }

      this.logAsync(req, userId, details, 'SUCCESS');
      return { success: true, message: 'Gửi yêu cầu ủy quyền thành công, đang chờ phê duyệt.' };
    } catch (err) {
      this.logAsync(req, userId, details, 'ERROR');
      throw new BadRequestException(err?.message || 'Đã xảy ra lỗi khi thực hiện ủy quyền.');
    }
  }


  async userRejectJoin(meetingId: string, originalUserId: string, reason?: string, req?: any) {
    const details = `Người dùng không tham gia cuộc họp, ID cuộc họp: ${meetingId}`;
    try {
      const meeting = await this.meetingRepo.findOne({
        where: { id: meetingId },
      });

      if (!meeting) {
        throw new BadRequestException('Cuộc họp không tồn tại');
      }

      if (!originalUserId) {
        throw new BadRequestException('Người dùng không hợp lệ');
      }

      // Lấy tất cả meeting_unit của meeting
      const meetingUnits = await this.meetingUnitRepo.find({
        where: { meetingId },
        select: ['id'],
      });

      if (!meetingUnits.length) {
        throw new BadRequestException('Không có đơn vị tham gia');
      }

      const meetingUnitIds = meetingUnits.map(u => u.id);

      // 🔥 JOIN unit để lấy unit_id
      const participants = await this.participantRepo.find({
        where: {
          meetingUnitId: In(meetingUnitIds),
          userId: originalUserId,
        },
        relations: ['unit'], // 👈 QUAN TRỌNG
      });

      if (!participants.length) {
        return {
          success: false,
          message: 'Bạn không nằm trong danh sách tham gia',
        };
      }

      // ===== UPDATE STATE =====
      for (const p of participants) {
        p.participantState = ParticipantState.NOT_PARTICIPATE;
        p.acceptJoin = false;
        p.rejectReason = reason;
      }

      await this.participantRepo.save(participants);
      await this.sqlRepo.removeWorkItemByAssignee(
        meetingId,
        originalUserId,
      );

      // ===== XÁC ĐỊNH VAI TRÒ =====
      const getRoleName = (p: any) => {
        // Ưu tiên participant_role
        if (p.participantRole === 'CHAIRMAN') return 'Chủ trì';
        if (p.participantRole === 'SECRETARY') return 'Thư ký';

        // fallback unit
        const unitId = p.unit?.unitId;
        if (unitId === 'CHAIRMAN_UNIT') return 'Chủ trì';
        if (unitId === 'SECRETARY_UNIT') return 'Thư ký';

        return 'Người tham gia';
      };

      const roles = participants.map(p => getRoleName(p));

      const vaitro = roles.includes('Chủ trì')
        ? 'Chủ trì'
        : roles.includes('Thư ký')
          ? 'Thư ký'
          : 'Người tham gia';

      // ===== NOTIFICATION =====
      const userIdReturn = await this.sqlRepo.getUserRejectMeeting(
        meetingId,
        'REJECT',
      );

      const recipientIds = userIdReturn ? [userIdReturn] : [];

      const nameOriginalUser = await this.getUserNameById(originalUserId);
      this.notificationService.createForRecipients({
        recipientIds,
        senderId: originalUserId,
        type: NotificationType.MEETING_INFO_CHANGED.value,
        title: 'Thông báo từ chối tham gia cuộc họp',
        content: `${vaitro} cuộc họp ${nameOriginalUser} của cuộc họp "${meeting.title}" đã từ chối tham gia cuộc họp lý do "${reason}". Vui lòng cập nhật lại ${vaitro} tham gia cuộc họp`,
        recordId: meeting.id,
        link: `/meetings/${meeting.id}?listparammeeting=PREPARE_MEETING`,
        key: NotificationKey.VIEW_MEETING_ROOM,
        time: new Date(),
        status: 0,
      });

      this.logAsync(req, originalUserId, details, 'SUCCESS');

      return {
        success: true,
        message: 'Đã từ chối tham gia cuộc họp',
      };
    } catch (err) {
      this.logAsync(req, originalUserId, details, 'ERROR');
      throw new BadRequestException(
        err?.message || 'Lỗi khi từ chối tham gia',
      );
    }
  }


  async checkDocumentsCount(unitId?: string, participantId?: string): Promise<any> {
    try {
      let unitDocumentsCount = 0;
      let participantDocumentsCount = 0;

      // Trường hợp chỉ có unitId
      if (unitId) {
        unitDocumentsCount = await this.dataSource
          .getRepository(MeetingTaskEntity)
          .createQueryBuilder('mt')
          .where('mt.attachable_type = :attachableType', { attachableType: 'UNIT' })
          .andWhere('mt.attachable_id = :unitId', { unitId })
          .getCount();
      }

      // Trường hợp chỉ có participantId
      if (participantId) {
        participantDocumentsCount = await this.dataSource
          .getRepository(MeetingTaskEntity)
          .createQueryBuilder('mt')
          .where('mt.attachable_type = :attachableType', { attachableType: 'PARTICIPANT' })
          .andWhere('mt.attachable_id = :participantId', { participantId })
          .getCount();
      }

      // Trường hợp không có unitId và participantId (lấy tổng tài liệu của cả UNIT và PARTICIPANT)
      if (!unitId && !participantId) {
        const unitTotal = await this.dataSource
          .getRepository(MeetingTaskEntity)
          .createQueryBuilder('mt')
          .where('mt.attachable_type = :attachableType', { attachableType: 'UNIT' })
          .getCount();

        const participantTotal = await this.dataSource
          .getRepository(MeetingTaskEntity)
          .createQueryBuilder('mt')
          .where('mt.attachable_type = :attachableType', { attachableType: 'PARTICIPANT' })
          .getCount();

        return {
          success: true,
          message: 'Đếm tài liệu thành công',
          data: {
            unitDocumentsCount: unitTotal,
            participantDocumentsCount: participantTotal,
          },
        };
      }

      // Nếu có cả unitId và participantId
      return {
        success: true,
        message: 'Đếm tài liệu thành công',
        data: {
          unitDocumentsCount,
          participantDocumentsCount,
        },
      };
    } catch (error) {
      this.logger.error('Lỗi khi đếm tài liệu:', error);
      throw new Error('Đếm tài liệu không thành công');
    }
  }

  async isUnitDocumentsPrepared(meetingId: string, unitId: string): Promise<boolean> {
    const meetingUnit = await this.meetingUnitRepo.findOne({
      where: { meetingId, unitId },
      select: ['id'],
    });

    if (!meetingUnit) return true; // không có unit → coi như OK

    const notPreparedCount = await this.taskRepo.count({
      where: {
        meetingId,
        attachableType: 'UNIT',
        attachableId: meetingUnit.id,
        isDocumentPrepared: false,
      },
    });

    return notPreparedCount === 0;
  }

  async isUserDocumentsPrepared(
    meetingId: string,
    userId: string,
  ): Promise<boolean> {
    const count = await this.taskRepo
      .createQueryBuilder('task')
      .innerJoin(
        'meeting_participants',
        'mp',
        `
          task.attachableType = 'PARTICIPANT'
          AND task.attachableId = mp.id
        `,
      )
      .where('task.meetingId = :meetingId', { meetingId })
      .andWhere('mp.userId = :userId', { userId })
      .andWhere('ISNULL(task.isDocumentPrepared, 0) = 0')
      .getCount();

    return count === 0;
  }


  async isUserDocumentsPreparedAllRooms(
    meetingId: string,
    userId: string,
  ): Promise<boolean> {
    // 1. Lấy tất cả participant của user trong meeting
    const participants = await this.meetingParticipantRepo.find({
      where: {
        userId,
        unit: { meetingId },
      },
      relations: ['unit'],
      select: ['id'],
    });

    if (participants.length === 0) return true;

    const participantIds = participants.map(p => p.id);

    // 2. Đếm task chưa chuẩn bị của tất cả participant
    const notPreparedCount = await this.taskRepo
      .createQueryBuilder('task')
      .where('task.meetingId = :meetingId', { meetingId })
      .andWhere('task.attachableType = :type', { type: 'PARTICIPANT' })
      .andWhere('task.attachableId IN (:...ids)', { ids: participantIds })
      .andWhere('task.isDocumentPrepared = :prepared', { prepared: false })
      .getCount();

    return notPreparedCount === 0;
  }
  // kiểm tra xem có ai chưa được gán chỗ không
  async hasUnitParticipantsWithoutSeat(
    meetingId: string,
    unitId: string,
  ): Promise<boolean> {
    const count = await this.meetingParticipantRepo
      .createQueryBuilder('p')
      .innerJoin('p.unit', 'u')
      .where('u.meetingId = :meetingId', { meetingId })
      .andWhere('u.unitId = :unitId', { unitId })
      .andWhere('(p.seatNumber IS NULL OR p.seatNumber = \'\')')
      .getCount();

    return count > 0;
  }

  // Kiểm tra trong 1 phòng có người chưa 
  async hasParticipantsInUnit(
    meetingId: string,
    unitId: string,
  ): Promise<boolean> {
    const count = await this.meetingParticipantRepo
      .createQueryBuilder('p')
      .innerJoin('p.unit', 'u')
      .where('u.meetingId = :meetingId', { meetingId })
      .andWhere('u.unitId = :unitId', { unitId })
      .getCount();

    return count > 0;
  }

  async hasSecretaryInUnit(
    meetingId: string,
    unitId: string,
  ): Promise<boolean> {
    const count = await this.meetingParticipantRepo
      .createQueryBuilder('p')
      .innerJoin('p.unit', 'u')
      .where('u.meetingId = :meetingId', { meetingId })
      .andWhere('u.unitId = :unitId', { unitId })
      .andWhere('p.participantRole = :role', { role: 'SECRETARY' })
      .getCount();

    return count > 0;
  }

  async isUnitAssignmentComplete(
    meetingId: string,
    unitId: string,
  ): Promise<{
    hasSecretary: boolean;
    hasParticipants: boolean;
    isComplete: boolean;
  }> {
    const hasSecretary = await this.hasSecretaryInUnit(meetingId, unitId);
    const hasParticipants = await this.hasParticipantsInUnit(meetingId, unitId);

    return {
      hasSecretary,
      hasParticipants,
      isComplete: hasSecretary && hasParticipants,
    };
  }

  private resolveUnitAssignmentType(
    needsSecretaryAssignment: boolean,
    needsParticipantAssignment: boolean,
  ): 'SECRETARY_ONLY' | 'PARTICIPANT_ONLY' | 'BOTH' | 'NONE' {
    if (needsSecretaryAssignment && needsParticipantAssignment) {
      return 'BOTH';
    }

    if (needsSecretaryAssignment) {
      return 'SECRETARY_ONLY';
    }

    if (needsParticipantAssignment) {
      return 'PARTICIPANT_ONLY';
    }

    return 'NONE';
  }

  async getUnitAssignmentCompletionStatus(
    meetingId: string,
    unitId: string,
  ): Promise<{
    hasSecretaryRole: boolean;
    hasParticipantRole: boolean;
    needsSecretaryAssignment: boolean;
    needsParticipantAssignment: boolean;
    assignmentType: 'SECRETARY_ONLY' | 'PARTICIPANT_ONLY' | 'BOTH' | 'NONE';
    isCompleteSecretary: boolean;
    isCompleteParticipant: boolean;
    isSecretaryComplete: boolean;
    isParticipantComplete: boolean;
    isComplete: boolean;
  }> {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
      select: ['id', 'secretaryId', 'secretaryType'],
    });

    if (!meeting) {
      throw new NotFoundException('Không tìm thấy cuộc họp');
    }

    const meetingUnit = await this.meetingUnitRepo.findOne({
      where: { meetingId, unitId },
      select: ['id', 'meetingId', 'unitId', 'isRoomSelected'],
    });

    const needsSecretaryAssignment =
      meeting.secretaryType === ParticipantType.UNIT &&
      meeting.secretaryId === unitId;

    const needsParticipantAssignment =
      !!meetingUnit &&
      meetingUnit.unitId !== 'CHAIRMAN_UNIT' &&
      meetingUnit.unitId !== 'SECRETARY_UNIT' &&
      meetingUnit.isRoomSelected === true;

    const assignmentType = this.resolveUnitAssignmentType(
      needsSecretaryAssignment,
      needsParticipantAssignment,
    );

    const [isCompleteSecretary, isCompleteParticipant] = await Promise.all([
      needsSecretaryAssignment
        ? this.meetingParticipantRepo
          .createQueryBuilder('p')
          .innerJoin('p.unit', 'u')
          .where('u.meetingId = :meetingId', { meetingId })
          .andWhere('u.unitId = :secretaryUnitId', {
            secretaryUnitId: 'SECRETARY_UNIT',
          })
          .andWhere('p.participantRole = :role', { role: 'SECRETARY' })
          .andWhere('p.unitId = :unitId', { unitId })
          .andWhere(`LTRIM(RTRIM(ISNULL(p.userId, ''))) <> ''`)
          .andWhere('p.userId != :placeholder', {
            placeholder: ParticipantType.UNIT,
          })
          .getCount()
          .then((count) => count > 0)
        : Promise.resolve(false),
      needsParticipantAssignment
        ? this.meetingParticipantRepo
          .createQueryBuilder('p')
          .innerJoin('p.unit', 'u')
          .where('u.meetingId = :meetingId', { meetingId })
          .andWhere('u.unitId = :unitId', { unitId })
          .andWhere(
            '(p.participantRole IS NULL OR p.participantRole != :role)',
            { role: 'SECRETARY' },
          )
          .andWhere(`LTRIM(RTRIM(ISNULL(p.userId, ''))) <> ''`)
          .getCount()
          .then((count) => count > 0)
        : Promise.resolve(false),
    ]);

    let isComplete = false;
    if (assignmentType === 'BOTH') {
      isComplete = isCompleteSecretary && isCompleteParticipant;
    } else if (assignmentType === 'SECRETARY_ONLY') {
      isComplete = isCompleteSecretary;
    } else if (assignmentType === 'PARTICIPANT_ONLY') {
      isComplete = isCompleteParticipant;
    }

    return {
      hasSecretaryRole: needsSecretaryAssignment,
      hasParticipantRole: needsParticipantAssignment,
      needsSecretaryAssignment,
      needsParticipantAssignment,
      assignmentType,
      isCompleteSecretary,
      isCompleteParticipant,
      isSecretaryComplete: isCompleteSecretary,
      isParticipantComplete: isCompleteParticipant,
      isComplete,
    };
  }

  // Get start node
  async findUserRolesByUserId(
    userId: string,
    roleCodes: string[],
    processKey?: string
  ): Promise<string[]> {
    if (!roleCodes?.length) return [];

    const qb = this.groupUserRepo.manager.createQueryBuilder()
      .select('DISTINCT rp.role_code', 'roleCode')
      .from('roles_process', 'rp')
      .innerJoin('roles_process_groups', 'rpg', 'rpg.role_id = rp.id')
      .innerJoin('user_group_users', 'ugu', 'ugu.group_user_id = rpg.group_id')
      .innerJoin('users', 'u', 'u.id = ugu.user_id AND u.status = 1')
      .where('rp.is_active = 1')
      .andWhere('ugu.user_id = :userId', { userId })
      .andWhere('rp.role_code IN (:...roleCodes)', { roleCodes });

    if (processKey) {
      qb.andWhere('rp.process_key = :processKey', { processKey });
    }

    const rawResults = await qb.getRawMany();
    return rawResults.map(r => r.roleCode);
  }
  async getActionAvailableByUser(userId: string, roleCache?: Map<string, any>) {
    // 1️⃣ Initialize cache & fetch user/flow info
    const cache = roleCache || new Map();

    const userKey = `__user_${userId}`;
    let user = cache.get(userKey);
    if (!user) {
      user = await this.sqlsvRepo.getUserById(userId);
      if (user) cache.set(userKey, user);
    }
    if (!user?.parent?.id) return [];

    const unitId = String(user.parent.id);
    const flowKey = `__flow_${unitId}`;
    let flow = cache.get(flowKey);
    if (!flow) {
      flow = await this.sqlsvRepo.getFlowByUnit(unitId, 'ScheduleProcess');
      if (flow) cache.set(flowKey, flow);
    }
    if (!flow?.id) return [];

    this.processKey = flow.id;

    // 2️⃣ Get BPMN model (already optimized with internal cache)
    const model = await this.getBpmnModelCached(flow.id);
    if (!model) return [];
    const { process, indexes } = model;

    // 3️⃣ Resolve roles for THIS user (Optimized: fetch specific instead of all)
    const userRolesKey = `__user_roles_${flow.id}_${userId}`;
    let userRoleCodes: string[] = cache.get(userRolesKey);

    if (!userRoleCodes) {
      const laneRoleCodes: string[] = Object.values(indexes.lanes || {})
        .map((l: any) => l.role)
        .filter((r): r is string => !!r);

      if (!laneRoleCodes.length) return [];

      // Fetch direct roles and group roles in parallel, specific to this user
      const [roleFeature, userGroupRoles] = await Promise.all([
        this.roleFeaturesRepo.findOne({
          where: { processKey: flow.id },
          select: ['roles'],
        }),
        this.findUsersByRoleCodes(laneRoleCodes, flow.id, userId),
      ]);

      const matchedRoles = new Set<string>();

      // Check group roles (already filtered by userId in DB)
      for (const gu of userGroupRoles) {
        matchedRoles.add(gu.roleCode);
      }

      // Check direct roles (parsed from JSON)
      let roles: any[] = [];
      if (roleFeature?.roles) {
        try {
          roles = typeof roleFeature.roles === 'string' ? JSON.parse(roleFeature.roles) : roleFeature.roles;
        } catch { }
      }
      for (const r of roles) {
        if (r?.roleCode && laneRoleCodes.includes(r.roleCode) && Array.isArray(r.users) && r.users.includes(userId)) {
          matchedRoles.add(r.roleCode);
        }
      }

      userRoleCodes = Array.from(matchedRoles);
      cache.set(userRolesKey, userRoleCodes);
    }

    if (!userRoleCodes.length) return [];

    // 4️⃣ Find Start Node matching user roles
    const matchedStart = Array.from(indexes.nodes.values()).find((n: any) => {
      if (n.$type !== 'bpmn:StartEvent') return false;
      const role = indexes.laneMap.get(n.id);
      return role && userRoleCodes.includes(role);
    });

    if (!matchedStart) return [];
    const laneRoleCode = indexes.laneMap.get((matchedStart as any).id);

    // Resolve the first interactive node after start event
    let startNode: any = null;
    for (const f of (matchedStart as any).outgoing || []) {
      const r = this.bpmnEngine.nextInteractiveFromFlow(f, indexes);
      if (r?.node) {
        startNode = r.node;
        break;
      }
    }

    if (!startNode) return [];

    const workItem = {
      id: 'preview',
      nodeId: startNode.id,
      assigneeUserId: userId,
      role: laneRoleCode,
      nodeType: startNode.$type,
    };

    // 5️⃣ Compute available actions with cached role-user lookups
    const res = await this.bpmnEngine.computeAvailableActions({
      process,
      indexes,
      currentNodeId: startNode.id,
      workItem,
      document: null,
      userId,
      userRoles: userRoleCodes,
      getUsersByRole: async (r: string) => {
        const key = `__role_users_${r}`;
        if (!cache.has(key)) {
          cache.set(key, await this.sqlsvRepo.getUsersByRoleMongoDB(r));
        }
        return cache.get(key);
      },
      audit: [],
    });

    return {
      availableActions: res.availableActions,
      flowConfig: flow,
      workItem,
    };
  }

  async getUnitAssignmentStatus(
    meetingId: string,
    unitId: string,
  ): Promise<{
    hasSecretaryRole: boolean;
    hasParticipantRole: boolean;
    assignmentType: 'SECRETARY_ONLY' | 'PARTICIPANT_ONLY' | 'BOTH' | 'NONE';
    isComplete: boolean;
  }> {
    // Kiểm tra xem phòng có được gán vai trò thư ký không
    // Thư ký được gán khi: phòng này có participant với role SECRETARY
    const secretaryCount = await this.meetingParticipantRepo
      .createQueryBuilder('p')
      .innerJoin('p.unit', 'u')
      .where('u.meetingId = :meetingId', { meetingId })
      .andWhere('u.unitId = :unitId', { unitId })
      .andWhere('p.participantRole = :role', { role: 'SECRETARY' })
      .getCount();

    // Kiểm tra xem phòng có được gán vai trò người tham gia không
    // Người tham gia được gán khi: có meeting_unit record với unit_id = unitId
    const participantCount = await this.meetingParticipantRepo
      .createQueryBuilder('p')
      .innerJoin('p.unit', 'u')
      .where('u.meetingId = :meetingId', { meetingId })
      .andWhere('u.unitId = :unitId', { unitId })
      .andWhere('p.participantRole != :role', { role: 'SECRETARY' })
      .getCount();

    const hasSecretaryRole = secretaryCount > 0;
    const hasParticipantRole = participantCount > 0;

    let assignmentType: 'SECRETARY_ONLY' | 'PARTICIPANT_ONLY' | 'BOTH' | 'NONE';
    if (hasSecretaryRole && hasParticipantRole) {
      assignmentType = 'BOTH';
    } else if (hasSecretaryRole) {
      assignmentType = 'SECRETARY_ONLY';
    } else if (hasParticipantRole) {
      assignmentType = 'PARTICIPANT_ONLY';
    } else {
      assignmentType = 'NONE';
    }

    return {
      hasSecretaryRole,
      hasParticipantRole,
      assignmentType,
      isComplete: assignmentType !== 'NONE',
    };
  }

  async isSecretaryAssignmentComplete(
    meetingId: string,
    unitId: string,
  ): Promise<boolean> {
    const count = await this.meetingParticipantRepo
      .createQueryBuilder('p')
      .innerJoin('p.unit', 'u')
      .where('u.meetingId = :meetingId', { meetingId })
      .andWhere('u.unitId = :unitId', { unitId })
      .andWhere('p.participantRole = :role', { role: 'SECRETARY' })
      .getCount();

    return count > 0;
  }

  async isParticipantAssignmentComplete(
    meetingId: string,
    unitId: string,
  ): Promise<boolean> {
    const count = await this.meetingParticipantRepo
      .createQueryBuilder('p')
      .innerJoin('p.unit', 'u')
      .where('u.meetingId = :meetingId', { meetingId })
      .andWhere('u.unitId = :unitId', { unitId })
      .andWhere('p.participantRole != :role', { role: 'SECRETARY' })
      .getCount();

    return count > 0;
  }

  async isAssignmentComplete(
    meetingId: string,
    unitId: string,
  ): Promise<{
    isSecretaryComplete: boolean;
    isParticipantComplete: boolean;
    isComplete: boolean;
    assignmentType: 'SECRETARY_ONLY' | 'PARTICIPANT_ONLY' | 'BOTH' | 'NONE';
  }> {
    const [isSecretaryComplete, isParticipantComplete] = await Promise.all([
      this.isSecretaryAssignmentComplete(meetingId, unitId),
      this.isParticipantAssignmentComplete(meetingId, unitId),
    ]);

    let assignmentType: 'SECRETARY_ONLY' | 'PARTICIPANT_ONLY' | 'BOTH' | 'NONE';
    if (isSecretaryComplete && isParticipantComplete) {
      assignmentType = 'BOTH';
    } else if (isSecretaryComplete) {
      assignmentType = 'SECRETARY_ONLY';
    } else if (isParticipantComplete) {
      assignmentType = 'PARTICIPANT_ONLY';
    } else {
      assignmentType = 'NONE';
    }

    return {
      isSecretaryComplete,
      isParticipantComplete,
      isComplete: assignmentType !== 'NONE',
      assignmentType,
    };
  }


  async updateMeetingUnitFlags(
    meetingId: string,
    unitId: string,
    payload: {
      acceptJoin?: boolean;
      assignParticipants?: boolean;
      prepareDocuments?: boolean;
      processBy?: string;
    },
  ): Promise<boolean> {
    if (!meetingId || !unitId) return false;

    const updateData: Partial<MeetingUnitEntity> = {};

    if (payload.acceptJoin !== undefined) {
      updateData.acceptJoin = payload.acceptJoin;
    }

    if (payload.assignParticipants !== undefined) {
      updateData.assignParticipants = payload.assignParticipants;
    }

    if (payload.prepareDocuments !== undefined) {
      updateData.prepareDocuments = payload.prepareDocuments;
    }

    if (payload.processBy !== undefined) {
      updateData.processby = payload.processBy;
    }

    if (Object.keys(updateData).length === 0) {
      return false; // không có gì để update
    }

    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
      select: ['id', 'secretaryId', 'secretaryType'],
    });

    const targetUnitIds = new Set<string>([unitId]);

    if (
      meeting?.secretaryType === ParticipantType.UNIT &&
      meeting.secretaryId === unitId
    ) {
      targetUnitIds.add('SECRETARY_UNIT');
    }

    const result = await this.meetingUnitRepo
      .createQueryBuilder()
      .update(MeetingUnitEntity)
      .set(updateData)
      .where('meeting_id = :meetingId', { meetingId })
      .andWhere('unit_id IN (:...unitIds)', {
        unitIds: [...targetUnitIds],
      })
      .execute();

    // Reset cache khi cập nhật flags thành công
    // if ((result.affected ?? 0) > 0) {
    //   this.resetMeetingCache(meetingId);
    // }

    return (result.affected ?? 0) > 0;
  }

  async updateParticipantPrepareDocumentsByUser(
    meetingId: string,
    userId: string,
    prepareDocuments: boolean,
  ): Promise<boolean> {
    if (!meetingId || !userId) return false;

    const result = await this.meetingParticipantRepo
      .createQueryBuilder()
      .update()
      .set({
        prepareDocuments,
      })
      .where('user_id = :userId', { userId })
      .andWhere(`
        meeting_unit_id IN (
          SELECT mu.id
          FROM meeting_units mu
          WHERE mu.meeting_id = :meetingId
        )
      `)
      .setParameters({ meetingId })
      .execute();

    return (result.affected ?? 0) > 0;
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
  async listMeetingRoomsStats(
    query: ListMeetingRoomsStatsDto,
    userId: string,
    req?: any
  ) {
    const isExport = query.isExport === 'true';

    /** ================= PAGINATION ================= */
    const page = Math.max(Number(query.page) || 1, 1);
    let limit = Math.min(Number(query.limit) || 20, 100);
    if (isExport) limit = 9999;
    const offset = (page - 1) * limit;

    const details = `Truy cập báo cáo: Tần suất sử dụng phòng họp, trang: ${page}, limit: ${limit}`;
    const pool = await this.getPool();

    /** ================= PARSE FILTER DATE ================= */
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    let daysInPeriod = 30;

    if (query.filter?.month && query.filter?.year) {
      const monthNum = parseInt(query.filter.month, 10);
      const yearNum = parseInt(query.filter.year, 10);
      if (monthNum >= 1 && monthNum <= 12 && yearNum > 0) {
        startDate = new Date(yearNum, monthNum - 1, 1);
        endDate = new Date(yearNum, monthNum, 1);
        daysInPeriod = new Date(yearNum, monthNum, 0).getDate();
      }
    } else if (query.filter?.year) {
      const yearNum = parseInt(query.filter.year, 10);
      if (yearNum > 0) {
        startDate = new Date(yearNum, 0, 1);
        endDate = new Date(yearNum + 1, 0, 1);
        const isLeapYear = (yearNum % 4 === 0 && yearNum % 100 !== 0) || (yearNum % 400 === 0);
        daysInPeriod = isLeapYear ? 366 : 365;
      }
    }

    /** ================= BASE CONDITIONS ================= */
    const baseConditions: string[] = [`mr.status = 1`];
    if (query.filter?.name) {
      const name = Array.isArray(query.filter.name)
        ? query.filter.name
        : [query.filter.name];

      const roomFilterParts: string[] = [];

      for (const id of name) {
        const value = String(id).replace(/'/g, "''");

        roomFilterParts.push(`
          (
            mr.id = '${value}'
          )
        `);
      }

      if (roomFilterParts.length) {
        baseConditions.push(`(${roomFilterParts.join(' OR ')})`);
      }
    }

    /** ================= WHERE FOR MEETINGS ================= */
    const meetingWhereParts: string[] = [`m.status = 1`];

    meetingWhereParts.push(`
    (
      m.room_ids = CAST(mr.id AS VARCHAR)
      OR m.room_ids LIKE CAST(mr.id AS VARCHAR) + ',%'
      OR m.room_ids LIKE '%,' + CAST(mr.id AS VARCHAR)
      OR m.room_ids LIKE '%,' + CAST(mr.id AS VARCHAR) + ',%'
    )
    `);
    if (startDate) meetingWhereParts.push(`m.meeting_date >= @startDate`);
    if (endDate) meetingWhereParts.push(`m.meeting_date < @endDate`);
    const meetingWhereClause = `WHERE ${meetingWhereParts.join(' AND ')}`;

    /** ================= BASE FROM ================= */
    const baseFrom = `
      FROM meeting_rooms mr
      OUTER APPLY (
        SELECT 
          COUNT(*) AS meeting_count,
          SUM(
            CASE 
              WHEN m.meeting_time IS NOT NULL AND m.meeting_time LIKE '%-%'
              THEN DATEDIFF(
                MINUTE,
                CAST(LEFT(m.meeting_time, CHARINDEX('-', m.meeting_time) - 1) AS TIME),
                CAST(SUBSTRING(m.meeting_time, CHARINDEX('-', m.meeting_time) + 1, LEN(m.meeting_time)) AS TIME)
              )
              ELSE 0
            END
          ) AS total_minutes
        FROM meetings m
        ${meetingWhereClause}
      ) stats
    `;

    /** ================= BUILD REQUEST ================= */
    const buildRequest = () => {
      const r = pool.request();
      if (startDate) r.input('startDate', startDate);
      if (endDate) r.input('endDate', endDate);
      if (query.filter?.name) r.input('name', query.filter.name);
      return r;
    };

    /** ================= COUNT ================= */
    const countSql = `SELECT COUNT(DISTINCT mr.id) AS total ${baseFrom} WHERE ${baseConditions.join(' AND ')}`;
    if (query.countOnly === 'true') {
      const rs = await buildRequest().query(countSql);
      return { total: rs.recordset[0]?.total || 0 };
    }

    /** ================= SORT ================= */
    const aliases = {
      name: 'mr.name',
      capacity: 'mr.capacity',
      meetingCount: 'stats.meeting_count',
      totalHours: 'stats.total_minutes',
      usageRate: 'usage_rate', // sẽ tính trong SELECT
      avgMeetingsPerDay: 'avg_meetings_per_day', // sẽ tính trong SELECT
    };

    const computedColumns = {
      meetingCount: 'ISNULL(stats.meeting_count, 0)',
      totalHours: 'ISNULL(stats.total_minutes, 0)/60',
      usageRate: '(ISNULL(stats.meeting_count, 0) * 1.0)', // tính trong SQL hoặc JS
      avgMeetingsPerDay: `(ISNULL(stats.meeting_count, 0)/${daysInPeriod})`
    };

    const safeSort: Record<string, any> = {};
    try {
      const sortObj = typeof query.sort === 'string' ? JSON.parse(query.sort) : query.sort;
      if (sortObj && typeof sortObj === 'object') {
        for (const key in sortObj) {
          if (aliases[key]) safeSort[key] = sortObj[key];
        }
      }
    } catch { }

    const orderBy = 'ORDER BY ' +
      parseSortRecordExploitationRequestssV2(
        Object.keys(safeSort).length ? safeSort : { name: 'ASC' },
        aliases,
        '',
        computedColumns,
        'mr.name ASC'
      );

    /** ================= DATA ================= */
    const dataSql = `
      SELECT
        mr.id,
        mr.name,
        mr.capacity,
        ISNULL(stats.meeting_count, 0) AS meeting_count,
        ISNULL(stats.total_minutes, 0) AS total_minutes
      ${baseFrom}
      WHERE ${baseConditions.join(' AND ')}
      ${orderBy}
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `;

    try {
      const [countRs, rowsRs] = await Promise.all([
        buildRequest().query(countSql),
        buildRequest().query(dataSql),
      ]);

      const totalMeetings = rowsRs.recordset.reduce(
        (sum, r) => sum + (r.meeting_count || 0),
        0
      );

      const data = rowsRs.recordset.map((r) => {
        const totalHours = Math.round((r.total_minutes / 60) * 100) / 100;
        const avgMeetingsPerDay = daysInPeriod > 0 ? Math.round((r.meeting_count / daysInPeriod) * 100) / 100 : 0;
        const usageRate = totalMeetings > 0 ? Math.round((r.meeting_count / totalMeetings) * 10000) / 100 : 0;

        return {
          name: r.name,
          capacity: r.capacity,
          meetingCount: r.meeting_count,
          totalHours,
          usageRate: `${usageRate}%`,
          avgMeetingsPerDay
        };
      });

      this.logAsync(req, userId, details, 'SUCCESS');
      return {
        page,
        limit,
        total: countRs.recordset[0]?.total || 0,
        data
      };
    } catch (error) {
      this.logAsync(req, userId, details, 'ERROR');
      console.error(error);
    }
  }
  async listMeetingInMeeetingRoomsStats(
    query: ListDocumentsOverDueDto,
    userId: string,
    req?: any
  ) {
    const isExport = query.isExport === 'true';

    /** ================= PAGINATION ================= */
    const page = Math.max(Number(query.page) || 1, 1);
    let limit = Math.min(Number(query.limit) || 20, 100);
    if (isExport) limit = 9999;
    const offset = (page - 1) * limit;

    const details = `Truy cập danh sách: Thống kê danh sách cuộc họp theo phòng ban, trang: ${page}, limit: ${limit}`;
    const pool = await this.getPool();

    /** ================= FILTER DATE ================= */
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (query.filter?.startDate) startDate = new Date(query.filter.startDate);
    if (query.filter?.endDate) endDate = new Date(query.filter.endDate);

    const whereClause = `
      WHERE m.status = 1
        AND mu.unit_id NOT IN ('CHAIRMAN_UNIT', 'SECRETARY_UNIT')
        ${query.filter?.name ? 'AND mu.unit_id = @name' : ''}
        ${startDate ? 'AND m.meeting_date >= @startDate' : ''}
        ${endDate ? 'AND m.meeting_date < @endDate' : ''}
    `;

    /** ================= BUILD REQUEST ================= */
    const buildRequest = () => {
      const r = pool.request();
      if (startDate) r.input('startDate', startDate);
      if (endDate) r.input('endDate', endDate);
      if (query.filter?.name) {
        r.input('name', query.filter.name);
      }
      return r;
    };

    /** ================= COUNT ================= */
    const countSql = `
      SELECT COUNT(DISTINCT mu.unit_id) AS total
      FROM meeting_units mu
      JOIN meetings m ON m.id = mu.meeting_id
      ${whereClause}
    `;
    if (query.countOnly === 'true') {
      const rs = await buildRequest().query(countSql);
      return { total: rs.recordset[0]?.total || 0 };
    }

    /** ================= SORT ================= */
    const aliases = {
      name: 'name',
      meetingCount: 'meeting_count',
      internalMeetingCount: 'internal_count',
      interDepartmentMeetingCount: 'interdepartment_count',
      partnerMeetingCount: 'partner_count',
      totalHours: 'total_minutes',
      avgDurationPerMeeting: 'avg_duration'
    };

    const computedColumns = {
      meetingCount: 'COUNT(*)',
      internalMeetingCount: "SUM(CASE WHEN m.meeting_type IN ('NB','COMPANY','UNIT') THEN 1 ELSE 0 END)",
      interDepartmentMeetingCount: "SUM(CASE WHEN m.meeting_type = 'LPB' THEN 1 ELSE 0 END)",
      partnerMeetingCount: "SUM(CASE WHEN m.meeting_type = 'DT' THEN 1 ELSE 0 END)",
      totalHours: `SUM(
        CASE 
          WHEN m.meeting_time IS NOT NULL AND m.meeting_time LIKE '%-%'
          THEN DATEDIFF(
            MINUTE,
            CAST(LEFT(m.meeting_time, CHARINDEX('-', m.meeting_time) - 1) AS TIME),
            CAST(SUBSTRING(m.meeting_time, CHARINDEX('-', m.meeting_time) + 1, LEN(m.meeting_time)) AS TIME)
          )
          ELSE 0
        END
      )`,
      avgDurationPerMeeting: `SUM(
        CASE 
          WHEN m.meeting_time IS NOT NULL AND m.meeting_time LIKE '%-%'
          THEN DATEDIFF(
            MINUTE,
            CAST(LEFT(m.meeting_time, CHARINDEX('-', m.meeting_time) - 1) AS TIME),
            CAST(SUBSTRING(m.meeting_time, CHARINDEX('-', m.meeting_time) + 1, LEN(m.meeting_time)) AS TIME)
          )
          ELSE 0
        END
      )/COUNT(*)`
    };

    const safeSort: Record<string, any> = {};
    try {
      const sortObj = typeof query.sort === 'string' ? JSON.parse(query.sort) : query.sort;
      if (sortObj && typeof sortObj === 'object') {
        for (const key in sortObj) {
          if (aliases[key]) safeSort[key] = sortObj[key];
        }
      }
    } catch { }

    const orderBy = 'ORDER BY ' +
      parseSortRecordExploitationRequestssV2(
        Object.keys(safeSort).length ? safeSort : { name: 'ASC' },
        aliases,
        '',
        computedColumns,
        'mu.name ASC'
      );

    /** ================= DATA ================= */
    const dataSql = `
      SELECT
        mu.unit_id AS name,
        COUNT(*) AS meeting_count,
        SUM(CASE WHEN m.meeting_type IN ('NB','COMPANY','UNIT') THEN 1 ELSE 0 END) AS internal_count,
        SUM(CASE WHEN m.meeting_type = 'LPB' THEN 1 ELSE 0 END) AS interdepartment_count,
        SUM(CASE WHEN m.meeting_type = 'DT' THEN 1 ELSE 0 END) AS partner_count,
        SUM(
          CASE 
            WHEN m.meeting_time IS NOT NULL AND m.meeting_time LIKE '%-%'
            THEN DATEDIFF(
              MINUTE,
              CAST(LEFT(m.meeting_time, CHARINDEX('-', m.meeting_time) - 1) AS TIME),
              CAST(SUBSTRING(m.meeting_time, CHARINDEX('-', m.meeting_time) + 1, LEN(m.meeting_time)) AS TIME)
            )
            ELSE 0
          END
        ) AS total_minutes
      FROM meeting_units mu
      JOIN meetings m ON m.id = mu.meeting_id
      ${whereClause}
      GROUP BY mu.unit_id
      ${orderBy}
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `;
    try {
      const [countRs, rowsRs] = await Promise.all([
        buildRequest().query(countSql),
        buildRequest().query(dataSql),
      ]);

      /** ================= MAP RESULT ================= */
      const data = await Promise.all(
        rowsRs.recordset.map(async (r) => {
          const totalHours = Math.round((r.total_minutes / 60) * 100) / 100;
          const avgDurationPerMeeting =
            r.meeting_count > 0 ? Math.round((totalHours / r.meeting_count) * 100) / 100 : 0;

          return {
            name: await this.getOrgUnitNameById(r.name),
            meetingCount: r.meeting_count,
            internalMeetingCount: r.internal_count,
            interDepartmentMeetingCount: r.interdepartment_count,
            partnerMeetingCount: r.partner_count,
            totalHours,
            avgDurationPerMeeting
          };
        })
      );

      this.logAsync(req, userId, details, 'SUCCESS');
      return {
        page,
        limit,
        total: countRs.recordset[0]?.total || 0,
        data
      };
    } catch (e) {
      console.error(e);
      this.logAsync(req, userId, details, 'ERROR');
      throw e;
    }
  }

  async statisticMeetingsByTime(
    query: ListMeetingByTimeDto,
    userId: string,
    req?: any
  ) {
    const isExport = query.isExport === 'true' || query.isExport === true as any;
    const page = Math.max(Number(query.page) || 1, 1);
    let limit = Math.min(Number(query.limit) || 200, 200);
    if (isExport) limit = 9999;
    const offset = (page - 1) * limit;

    const details = `Truy cập Danh sách cuộc họp theo thời gian, trang: ${page}, limit: ${limit}`;
    const pool = await this.getPool();

    /** ================= DATE ================= */

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (query.filter?.meetingDate?.startDate) {
      startDate = new Date(query.filter.meetingDate.startDate);
    }

    if (query.filter?.meetingDate?.endDate) {
      endDate = new Date(query.filter.meetingDate.endDate);
    }

    /** ================= WHERE ================= */

    const filters: string[] = [`m.status = 1`];

    if (startDate) filters.push(`m.meeting_date >= @startDate`);
    if (endDate) filters.push(`m.meeting_date <= @endDate`);

    if (query.filter?.chairmanId) {
      filters.push(`m.chairman_id = @chairman_id`);
    }
    if (query.filter?.roomIds) {
      const roomIds = Array.isArray(query.filter.roomIds)
        ? query.filter.roomIds
        : [query.filter.roomIds];

      const subParts: string[] = [];

      for (const id of roomIds) {
        const value = String(id).replace(/'/g, "''");

        subParts.push(`
          (
            m.room_ids = '${value}'
            OR m.room_ids LIKE '${value},%'
            OR m.room_ids LIKE '%,${value}'
            OR m.room_ids LIKE '%,${value},%'
          )
        `);
      }

      if (subParts.length) {
        filters.push(`(${subParts.join(' OR ')})`);
      }
    }
    if (query.filter?.organizationalUnit) {
      filters.push(`m.organizational_unit = @organizationalUnit`);
    }

    if (query.filter?.meetingState) {
      filters.push(`m.meeting_state = @meetingState`);
    }

    const whereClause = `WHERE ${filters.join(' AND ')}`;

    /** ================= COMPUTED ================= */

    const durationExpr = `
      CASE 
        WHEN m.meeting_time IS NOT NULL AND m.meeting_time LIKE '%-%'
        THEN DATEDIFF(
          MINUTE,
          CAST(LEFT(m.meeting_time, CHARINDEX('-', m.meeting_time) - 1) AS TIME),
          CAST(SUBSTRING(m.meeting_time, CHARINDEX('-', m.meeting_time) + 1, LEN(m.meeting_time)) AS TIME)
        )
        ELSE 0
      END
    `;

    const participantCountExpr = `
      (
        SELECT COUNT(DISTINCT mp.id)
        FROM meeting_units mu
        LEFT JOIN meeting_participants mp ON mp.meeting_unit_id = mu.id
        WHERE mu.meeting_id = m.id
      )
    `;

    const guestCountExpr = `
      (
        SELECT COUNT(DISTINCT mg.id)
        FROM meeting_guests mg
        WHERE mg.meeting_id = m.id
      )
    `;

    const baseSql = `
      FROM meetings m
      ${whereClause}
    `;

    /** ================= REQUEST ================= */

    const buildRequest = () => {
      const r = pool.request();

      if (startDate) r.input('startDate', startDate);
      if (endDate) r.input('endDate', endDate);

      if (query.filter?.chairmanId)
        r.input('chairman_id', query.filter.chairmanId);

      if (query.filter?.organizationalUnit)
        r.input('organizationalUnit', query.filter.organizationalUnit);

      if (query.filter?.meetingState)
        r.input('meetingState', query.filter.meetingState);

      return r;
    };

    /** ================= SORT ================= */

    const aliases = {
      id: 'id',
      title: 'title',
      meetingDate: 'meeting_date',
      meetingTime: 'meeting_time',
      chairmanId: 'chairman_id',
      meetingState: 'meeting_state',
      roomIds: 'room_ids',
      organizationalUnit: 'organizational_unit',
      durationMinutes: 'duration_minutes',
      participantCount: 'participant_count',
      guestCount: 'guest_count',
      totalPeople: 'total_people'
    };

    const customColumns = {
      id: `m.id`,
      title: `m.title`,
      meetingDate: `m.meeting_date`,
      meetingTime: `m.meeting_time`,
      chairmanId: `m.chairman_id`,
      meetingState: `m.meeting_state`,
      roomIds: `m.room_ids`,
      organizationalUnit: `m.organizational_unit`,

      durationMinutes: durationExpr,
      participantCount: participantCountExpr,
      guestCount: guestCountExpr,
      totalPeople: `(${participantCountExpr} + ${guestCountExpr})`
    };

    const allowedFields = new Set(Object.keys(aliases));
    const safeSort: Record<string, any> = {};

    try {
      const sortObj = typeof query.sort === 'string'
        ? JSON.parse(query.sort)
        : query.sort;

      if (sortObj && typeof sortObj === 'object') {
        for (const key in sortObj) {
          if (allowedFields.has(key)) {
            safeSort[key] = sortObj[key];
          }
        }
      }
    } catch { }

    const orderBy =
      ' ORDER BY ' +
      parseSortRecordExploitationRequestssV2(
        Object.keys(safeSort).length ? safeSort : undefined,
        aliases,
        '',
        customColumns,
        `${durationExpr} DESC` // default
      );

    /** ================= SQL ================= */

    const countSql = `
      SELECT COUNT(DISTINCT m.id) AS total
      ${baseSql}
    `;

    const dataSql = `
      SELECT 
        m.id,
        m.title,
        m.meeting_date,
        m.meeting_time,
        m.chairman_id,
        m.meeting_state,
        m.room_ids,
        m.organizational_unit,
        ${durationExpr} AS duration_minutes,
        ${participantCountExpr} AS participant_count,
        ${guestCountExpr} AS guest_count,
        (${participantCountExpr} + ${guestCountExpr}) AS total_people
      ${baseSql}
      ${orderBy}
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `;
    try {

      const [countRs, rowsRs] = await Promise.all([
        buildRequest().query(countSql),
        buildRequest().query(dataSql),
      ]);

      /** MAP BASIC */
      const rawDocs = rowsRs.recordset.map((r) => ({
        id: r.id,
        title: r.title,
        meeting_date: r.meeting_date,
        meeting_time: r.meeting_time,
        chairman_id: r.chairman_id,
        meeting_state: r.meeting_state,
        room_ids: r.room_ids,
        organizational_unit: r.organizational_unit,
      }));

      /** MAP DOC KEY IN CHUNKS TO AVOID MSSQL 2100 PARAMS LIMIT */
      const mapped: any[] = [];
      const chunkSize = 200;
      for (let i = 0; i < rawDocs.length; i += chunkSize) {
        const chunk = rawDocs.slice(i, i + chunkSize);
        const chunkMapped = await this.mapDocKeyMeeting(
          chunk,
          {
            id: 'id',
            title: 'title',
            meeting_date: 'meetingDate',
            meeting_time: 'meetingTime',
            chairman_id: 'chairmanId',
            meeting_state: 'meetingState',
            room_ids: 'roomIds',
            organizational_unit: 'organizationalUnit',
          },
          undefined,
          { userId, roles: [], receiverUnit: undefined },
          undefined,
          'STATISTIC',
          query.isExport,
        );
        mapped.push(...chunkMapped);
      }

      /** MERGE EXTRA */
      const extraMap = new Map(
        rowsRs.recordset.map((r) => [r.id, r])
      );

      const finalData = mapped.map((doc) => {
        const extra = extraMap.get(doc.id);
        const minutes = extra?.duration_minutes || 0;

        return {
          ...doc,
          durationMinutes: minutes,
          durationHours: Math.round((minutes / 60) * 100) / 100,
          participantCount: extra?.participant_count || 0,
          guestCount: extra?.guest_count || 0,
          totalPeople: extra?.total_people || 0,
        };
      });

      this.logAsync(req, userId, details, 'SUCCESS');

      return {
        page,
        limit,
        total: countRs.recordset[0]?.total || 0,
        data: finalData,
      };

    } catch (error) {

      this.logAsync(req, userId, details, 'ERROR');
      console.error(error);
    }
  }

  async listMeetingAttendanceReport(
    query: listMeetingAttendanceReportDto,
    userId: string,
    req?: any
  ) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Number(query.limit) || 200, 200);
    const offset = (page - 1) * limit;

    const details = `Truy cập Danh sách báo cáo thống kê tham dự cuộc họp, trang: ${page}, limit: ${limit}`;
    const pool = await this.getPool();

    /** ================= FILTER ================= */
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    let meetingOrgUnit: string | null = null;
    let assignee: string | null = null;

    if (query.filter?.meetingDate?.startDate) startDate = new Date(query.filter.meetingDate.startDate);
    if (query.filter?.meetingDate?.endDate) endDate = new Date(query.filter.meetingDate.endDate);
    if (query.filter?.organizationUnit) meetingOrgUnit = query.filter.organizationUnit;
    if (query.filter?.assignee) assignee = query.filter.assignee;

    const filters: string[] = [`m.status = '1'`];

    if (startDate) filters.push(`m.meeting_date >= @startDate`);
    if (endDate) filters.push(`m.meeting_date <= @endDate`);

    if (meetingOrgUnit) {
      filters.push(`
        LTRIM(RTRIM(mou.id)) =
        LTRIM(RTRIM(@meetingOrgUnit))
      `);
    }
    if (assignee) {
      filters.push(`mp.user_id = @assignee`);
    }

    const whereClause = `WHERE ${filters.join(' AND ')}`;

    const buildReq = () => {
      const r = pool.request();
      if (startDate) r.input('startDate', startDate);
      if (endDate) r.input('endDate', endDate);
      if (meetingOrgUnit) r.input('meetingOrgUnit', meetingOrgUnit);
      if (assignee) r.input('assignee', assignee);
      return r;
    };

    /** ================= COMPUTED COLUMNS ================= */
    const invitedCountExpr = `COUNT(DISTINCT m.id)`;
    const presentCountExpr = `
      SUM(CASE WHEN mp.participant_state IN ('PROCESSING','CONFIRMED','DELEGATED') THEN 1 ELSE 0 END)
    `;
    const absentCountExpr = `
      SUM(CASE WHEN mp.participant_state IN ('NOT_PARTICIPATE','PENDING','RECEIVED') THEN 1 ELSE 0 END)
    `;

    /** ================= SORT ================= */
    const aliases = {
      fullName: 'full_name',
      organizationUnit: 'organization_unit',
      invitedCount: 'invited_count',
      presentCount: 'present_count',
      absentCount: 'absent_count',
      attendanceRate: 'attendance_rate'
    };

    const customColumns = {
      fullName: `ISNULL(u.FullName, u.name)`,
      organizationUnit: `mou.name`,
      invitedCount: invitedCountExpr,
      presentCount: presentCountExpr,
      absentCount: absentCountExpr,
      attendanceRate: `CASE WHEN ${invitedCountExpr} > 0 THEN ROUND(${presentCountExpr}*100.0/${invitedCountExpr},0) ELSE 0 END`
    };

    const allowedFields = new Set(Object.keys(aliases));
    const safeSort: Record<string, any> = {};

    try {
      const sortObj = typeof query.sort === 'string' ? JSON.parse(query.sort) : query.sort;
      if (sortObj && typeof sortObj === 'object') {
        for (const key in sortObj) {
          if (allowedFields.has(key)) safeSort[key] = sortObj[key];
        }
      }
    } catch { }

    const orderBy = 'ORDER BY ' +
      parseSortRecordExploitationRequestssV2(
        Object.keys(safeSort).length ? safeSort : undefined,
        aliases,
        '',
        customColumns,
        `${invitedCountExpr} DESC` // default
      );

    /** ================= SQL ================= */
    const countSql = `
      SELECT COUNT(DISTINCT mp.user_id) AS total
      FROM meeting_participants mp
      JOIN meeting_units mu ON mu.id = mp.meeting_unit_id
      JOIN meetings m ON m.id = mu.meeting_id
      LEFT JOIN users u ON u.id = mp.user_id
      LEFT JOIN organization_units mou ON mou.id = m.organizational_unit
      ${whereClause}
    `;

    const dataSql = `
      SELECT
        u.id AS user_id,
        ISNULL(u.FullName, u.name) AS full_name,
        mou.name AS organization_unit,
        ${invitedCountExpr} AS invited_count,
        ${presentCountExpr} AS present_count,
        ${absentCountExpr} AS absent_count
      FROM meeting_participants mp
      JOIN meeting_units mu ON mu.id = mp.meeting_unit_id
      JOIN meetings m ON m.id = mu.meeting_id
      LEFT JOIN users u ON u.id = mp.user_id
      LEFT JOIN organization_units mou ON mou.id = m.organizational_unit
      ${whereClause}
      GROUP BY u.id, ISNULL(u.FullName, u.name), mou.name
      ${orderBy}
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `;
    try {
      const [countRs, rowsRs] = await Promise.all([
        buildReq().query(countSql),
        buildReq().query(dataSql)
      ]);

      const data = rowsRs.recordset.map((r, index) => {
        const invited = r.invited_count || 0;
        const present = r.present_count || 0;
        const absent = r.absent_count || 0;

        return {
          stt: offset + index + 1,
          userId: r.user_id,
          fullName: r.full_name,
          organizationUnit: r.organization_unit || '-',
          invitedCount: invited,
          presentCount: present,
          absentCount: absent,
          attendanceRate: `${invited > 0 ? Math.round((present / invited) * 100) : 0}%`
        };
      });

      this.logAsync(req, userId, details, 'SUCCESS');

      return {
        page,
        limit,
        total: countRs.recordset[0]?.total || 0,
        data
      };

    } catch (error) {
      this.logAsync(req, userId, details, 'ERROR');
      console.error(error);
    }
  }

  async listConclusionsFromKMeeting(
    query: listConclusionsFromKMeetingDto,
    userId: string,
    req?: any
  ) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Number(query.limit) || 200, 200);
    const offset = (page - 1) * limit;
    const { isExport } = query;

    const details = `Truy cập Danh sách báo cáo theo dõi kết luận cuộc họp, trang: ${page}, limit: ${limit}`;
    const pool = await this.getPool();

    /** ================= FILTER ================= */
    const filters: string[] = [`m.is_cancelled = 0`];

    if (query.filter?.processStatus) filters.push(`t.process_status = @processStatus`);
    if (query.filter?.meetingDate?.startDate) filters.push(`m.meeting_date >= @startDate`);
    if (query.filter?.meetingDate?.endDate) filters.push(`m.meeting_date <= @endDate`);

    if (query.filter?.meetingId) filters.push(`m.id = @meetingId`);

    if (query.filter?.title) {
      filters.push(`(
        m.title LIKE '%' + @title + '%'
        OR m.id = @title
      )`);
    }

    if (query.filter?.assignee_user) filters.push(`tu.process_id = @assignee_user`);
    if (query.filter?.status) filters.push(`t.process_status = @status`);

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    /** ================= BUILD REQUEST ================= */
    const buildReq = () => {
      const r = pool.request();
      if (query.filter?.processStatus) r.input('processStatus', query.filter.processStatus);
      if (query.filter?.meetingDate?.startDate) r.input('startDate', query.filter.meetingDate.startDate);
      if (query.filter?.meetingDate?.endDate) r.input('endDate', query.filter.meetingDate.endDate);
      if (query.filter?.meetingId) r.input('meetingId', query.filter.meetingId);
      if (query.filter?.title) r.input('title', query.filter.title);
      if (query.filter?.assignee_user) r.input('assignee_user', query.filter.assignee_user);
      if (query.filter?.status) r.input('status', query.filter.status);
      return r;
    };

    /** ================= COUNT ================= */
    const countSql = `
      SELECT COUNT(DISTINCT t.id) AS total
      FROM meetings m
      JOIN meeting_conclusions mc ON mc.meeting_id = m.id
      JOIN task t ON t.meeting_conclusion_id = mc.id
      LEFT JOIN task_users tu ON tu.task_id = t.id
      ${whereClause}
    `;

    /** ================= SORTING ================= */
    const aliases = {
      meetingDate: 'meeting_date',
      title: 'title',
      conclusion: 'conclusion_content',
      taskName: 'task_name',
      assignee: 'director_name',
      deadline: 'end_date',
      status: 'process_status',
      progress: 'progress',
      completedTime: 'update_at',
      overdue: 'overdue_days'
    };

    const customColumns = {
      meetingDate: 'm.meeting_date',
      title: 'm.title',
      conclusion: 'mc.content',
      taskName: 't.name',

      assignee: `
        STRING_AGG(
          CASE 
            WHEN tu.role = 'director' AND u.name IS NOT NULL
            THEN 
              CASE 
                WHEN u.position IS NOT NULL 
                  THEN u.name + ' - ' + u.position
                ELSE u.name
              END
          END, ', '
        )
      `,

      deadline: 't.end_date',
      status: 't.process_status',
      progress: 't.progress',
      completedTime: 't.update_at',

      overdue: `
        CASE 
          WHEN t.process_status = 'DONE' AND t.update_at > t.end_date 
            THEN DATEDIFF(DAY, t.end_date, t.update_at)
          WHEN t.process_status != 'DONE' AND GETDATE() > t.end_date
            THEN DATEDIFF(DAY, t.end_date, GETDATE())
          ELSE 0
        END
      `
    };

    const allowedFields = new Set(Object.keys(aliases));
    const safeSort: Record<string, any> = {};

    try {
      const sortObj = typeof query.sort === 'string' ? JSON.parse(query.sort) : query.sort;
      if (sortObj && typeof sortObj === 'object') {
        for (const key in sortObj) {
          if (allowedFields.has(key)) safeSort[key] = sortObj[key];
        }
      }
    } catch { }

    const orderBy = 'ORDER BY ' +
      parseSortRecordExploitationRequestssV2(
        Object.keys(safeSort).length ? safeSort : undefined,
        aliases,
        '',
        customColumns,
        'm.meeting_date DESC' // default
      );

    /** ================= DATA ================= */
    const dataSql = `
      SELECT
        t.id,
        m.title,
        m.meeting_date,
        mc.content AS conclusion_content,
        t.name AS task_name,

        -- ✅ DIRECTOR (match TS)
        STRING_AGG(
          CASE 
            WHEN tu.role = 'director' AND u.name IS NOT NULL
            THEN 
              CASE 
                WHEN u.position IS NOT NULL 
                  THEN u.name + ' - ' + u.position
                ELSE u.name
              END
          END, ', '
        ) AS director_name,

        -- ✅ ĐƠN VỊ (FIX CHUẨN)
        STRING_AGG(
          CASE 
            WHEN tu.role = 'director' AND ou.name IS NOT NULL
            THEN ou.name
          END, ', '
        ) AS director_dep,

        t.progress,
        t.start_date,
        t.end_date,
        t.update_at,

        -- ✅ OVERDUE
        CASE 
          WHEN t.process_status = 'DONE' AND t.update_at > t.end_date 
            THEN DATEDIFF(DAY, t.end_date, t.update_at)
          WHEN t.process_status != 'DONE' AND GETDATE() > t.end_date
            THEN DATEDIFF(DAY, t.end_date, GETDATE())
          ELSE 0
        END AS overdue_days,

        t.process_status

      FROM meetings m
      JOIN meeting_conclusions mc ON mc.meeting_id = m.id
      JOIN task t ON t.meeting_conclusion_id = mc.id
      LEFT JOIN task_users tu ON tu.task_id = t.id
      LEFT JOIN users u ON u.id = tu.process_id AND u.status = 1
      LEFT JOIN organization_units ou ON ou.id = tu.process_id AND ou.status = 1

      ${whereClause}

      GROUP BY 
        t.id, m.title, m.meeting_date, mc.content, 
        t.name, t.progress, t.start_date, 
        t.end_date, t.update_at, t.process_status

      ${orderBy}
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `;
    try {
      const [countRs, rowsRs] = await Promise.all([
        buildReq().query(countSql),
        buildReq().query(dataSql),
      ]);

      const data = rowsRs.recordset.map((r, index) => ({
        stt: offset + index + 1,

        title: r.title ?? '-',
        meetingDate: this.formatDate(r.meeting_date),
        conclusion: r.conclusion_content ?? '-',
        taskName: r.task_name ?? '-',

        assignee: r.director_name ?? '-',
        directorDep: r.director_dep ?? '-',

        progress: `${r.progress ?? 0}%`,

        deadline: this.formatDate(r.end_date),

        completedTime:
          r.process_status === '4'
            ? this.formatDate(r.update_at)
            : '-',

        overdue:
          r.overdue_days > 0
            ? `${r.overdue_days} ngày`
            : '-',

        status:
          isExport === 'true'
            ? this.mapProcessStatus(r.process_status)
            : this.mapProcessStatusToHtml(r.process_status),
      }));

      this.logAsync(req, userId, details, 'SUCCESS');

      return {
        page,
        limit,
        total: countRs.recordset[0]?.total || 0,
        data
      };

    } catch (error) {
      this.logAsync(req, userId, details, 'ERROR');
      console.error(error);
      throw error;
    }
  }
  private formatDate(date: any) {
    if (!date) return '-';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  private mapProcessStatus(status?: string): string | null {
    const map: Record<string, string> = {
      1: 'Công việc mới',
      2: 'Đang thực hiện',
      3: 'Chờ phê duyệt',
      4: 'Hoàn thành',
      5: 'Từ chối phê duyệt',
      6: 'Chờ điều chỉnh',
      7: 'Từ chối điều chỉnh',
      8: 'Huỷ',
    };

    return status ? (map[status] ?? status) : '-';
  }

  private mapProcessStatusToHtml(status?: string): string | null {
    const label = this.mapProcessStatus(status);
    if (!label) return null;

    return this.mapProcessStatusCodeToHtml(label);
  }

  private mapProcessStatusCodeToHtml(status: string): string {
    const s =
      typeof status === 'string' ? status.trim() : String(status ?? '').trim();

    switch (s) {
      case 'Công việc mới':
        return `<div style="
        display:flex;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        align-items:center;
        justify-content:center;
        width:100%;
        height:30px;
        padding:0 16px;
        background:#E0E0E0;
        color:#555555;
        font-weight:700;
        font-size:14px;
        border-radius:15px;
        border: 1px solid #AEB5BE;
      ">Công việc mới</div>`.trim();

      case 'Hoàn thành':
        return `<div style="
        display:flex;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        align-items:center;
        justify-content:center;
        width:100%;
        height:30px;
        padding:0 16px;
        background:#D0FFDE;
        color:#007222;
        font-weight:700;
        font-size:14px;
        border-radius:15px;
        border: 1px solid #ADECC0;
      ">Hoàn thành</div>`.trim();

      case 'Đã huỷ':
        return `<div style="
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
        border: 1px solid #c73535ff;
      ">Đã huỷ</div>`.trim();
      case 'Huỷ':
        return `<div style="
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
        border: 1px solid #c73535ff;
      ">Huỷ</div>`.trim();
      // case 'Từ chối phê duyệt':
      //   return `<div style="
      //   display:flex;
      //   overflow: hidden;
      //   text-overflow: ellipsis;
      //   white-space: nowrap;
      //   align-items:center;
      //   justify-content:center;
      //   width:100%;
      //   height:30px;
      //   padding:0 16px;
      //   background:#FFDCD9;
      //   color:#F44336;
      //   font-weight:700;
      //   font-size:14px;
      //   border-radius:15px;
      //   border: 1px solid #c73535ff;
      // ">Huỷ</div>`.trim();

      case 'Chờ phê duyệt':
        return `<div style="
        display:flex;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        align-items:center;
        justify-content:center;
        width:100%;
        height:30px;
        padding:0 16px;
        background:#FEF9C2;
        color:#FFA600;
        font-weight:700;
        font-size:14px;
        border-radius:15px;
        border: 1px solid #AEB5BE;
      ">Chờ phê duyệt</div>`.trim();

      case 'Điều chỉnh':
        return `<div style="
        display:flex;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        align-items:center;
        justify-content:center;
        width:100%;
        height:30px;
        padding:0 16px;
        background:#FEF9C2;
        color:#FFA600;
        font-weight:700;
        font-size:14px;
        border-radius:15px;
        border: 1px solid #AEB5BE;
      ">Điều chỉnh</div>`.trim();

      case 'Đang thực hiện':
        return `<div style="
        display:flex;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        align-items:center;
        justify-content:center;
        width:100%;
        height:30px;
        padding:0 16px;
        background:#DBEAFE;
        color:#0062AD;
        font-weight:700;
        font-size:14px;
        border-radius:15px;
        border: 1px solid #AEB5BE;
      ">Đang thực hiện</div>`.trim();

      default:
        return `<div style="
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
      ">${s || 'Không xác định'}</div>`.trim();
    }
  }

  async cloneAudit(originalDocId: string, newDocId: string) {
    const pool = await this.getPool();

    await pool.request()
      .input('o', originalDocId)
      .input('n', newDocId)
      .query(`
        INSERT INTO ${this.dbname}.audit (
          document_id, time, user_id, display_name, role,
          action_code, from_node_id, to_node_id,
          details, origin_id, created_by,
          receiver, receiver_unit, group_,
          roleProcess, action, deadline,
          stage_status, curStatusCode,
          created_at, updated_at,
          type_document, processed_by, acting_as
        )
        SELECT
          @n, time, user_id, display_name, role,
          action_code, from_node_id, to_node_id,
          details, origin_id, created_by,
          receiver, receiver_unit, group_,
          roleProcess, action, deadline,
          stage_status, curStatusCode,
          created_at, updated_at,
          type_document, processed_by, acting_as
        FROM ${this.dbname}.audit
        WHERE document_id = @o
      `);
  }
  public async deleteAuditByDocumentIds(ids: string[]) {
    if (!ids.length) return;

    const pool = await this.getPool();

    await pool.request()
      .input('ids', ids.join(','))
      .query(`
        DELETE FROM ${this.dbname}.audit
        WHERE document_id IN (
          SELECT value FROM STRING_SPLIT(@ids, ',')
        )
          AND type_document = '${this.typeDocument}'
      `);
  }
  async cloneWorkItems(originalDocId: string, newDocId: string) {
    const pool = await this.getPool();

    await pool.request()
      .input('o', originalDocId)
      .input('n', newDocId)
      .query(`
        INSERT INTO ${this.dbname}.work_items (
          id,
          document_id,
          node_id,
          role,
          assignee_user_id,
          node_type,
          state,
          created_at,
          bpmn_version
        )
        SELECT
          NEWID(),              -- tạo id mới
          @n,                   -- document mới
          node_id,
          role,
          assignee_user_id,
          node_type,
          state,                -- hoặc 'OPEN' nếu muốn reset
          GETDATE(),            -- thời điểm tạo mới
          bpmn_version
        FROM ${this.dbname}.work_items
        WHERE document_id = @o
      `);
  }
  public async deleteWorkItemsByDocumentIds(ids: string[]) {
    if (!ids.length) return;

    const pool = await this.getPool();

    await pool.request()
      .input('ids', ids.join(','))
      .query(`
        DELETE FROM ${this.dbname}.work_items
        WHERE document_id IN (
          SELECT value FROM STRING_SPLIT(@ids, ',')
        )
      `);
  }

  async countMeetingPersonDynamic(
    query: CreateMeetingDto,
    userId: string,
    authorId?: string,
  ): Promise<{ total: number }> {
    const { filter, processFn, authority, type, workstate, substate } = query;

    if (authority === 'true' && authorId) userId = authorId;

    const pool = await this.getPool();

    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    // ===== VALIDATE =====
    const ALLOWED_TYPES = ['day', 'week', 'month'] as const;
    const ALLOWED_WORKSTATES = ['waiting', 'comfirmed', 'notpaticipate', 'delegated'] as const;
    const ALLOWED_SUBSTATE = ['all', 'notprepare', 'completed'] as const;

    if (type && !ALLOWED_TYPES.includes(type as any)) {
      throw new BadRequestException('Type không hợp lệ');
    }

    if (workstate && !ALLOWED_WORKSTATES.includes(workstate as any)) {
      throw new BadRequestException('Workstate không hợp lệ');
    }

    if (substate && !ALLOWED_SUBSTATE.includes(substate as any)) {
      throw new BadRequestException('Substate không hợp lệ');
    }

    const WORKSTATE_MAP: Record<string, string[]> = {
      waiting: ['RECEIVED'],
      comfirmed: ['PROCESSING', 'CONFIRMED', 'DELEGATED', 'DONE'],
      notpaticipate: ['NOT_PARTICIPATE'],
      delegated: ['DELEGATED'],
    };

    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, from } = buildMeetingCriteriaHelper(
      [...featureCriteria, ...criteria],
      'meetings',
      featureManagement,
    );

    // ===== WHERE BASE =====
    const whereList: string[] = [
      `${from}.status = '1'`,
      `(${from}.meeting_state = 'DA_HUY'
        OR EXISTS (
          SELECT 1 FROM ${this.dbname}.audit a
          WHERE a.document_id = ${from}.id_str
            AND a.stage_status = 'DONG_Y_PHE_DUYET'
        ))`,
      `EXISTS (
        SELECT 1
        FROM meeting_units mu
        JOIN meeting_participants mp ON mp.meeting_unit_id = mu.id
        WHERE mu.meeting_id = ${from}.id
          AND (
            mp.user_id = @userId
            OR (mp.delegated_to_user_id = @userId AND mp.delegation_state = 'ACCEPTED')
          )
      )`,
    ];

    if (filterFeature) whereList.push(filterFeature);

    // ===== TYPE FILTER =====
    if (type === 'day' && filter?.currentDate) {
      whereList.push(
        `${from}.meeting_date >= @startDate AND ${from}.meeting_date < DATEADD(day,1,@startDate)`
      );
    }

    if (type === 'week' && filter?.currentWeek) {
      whereList.push(`${from}.meeting_date BETWEEN @startDate AND @endDate`);
    }

    if (type === 'month' && filter?.currentMonth) {
      whereList.push(
        `${from}.meeting_date >= @startDate AND ${from}.meeting_date < DATEADD(month,1,@startDate)`
      );
    }

    // ===== WORKSTATE =====
    if (workstate === 'delegated') {
      whereList.push(`
        EXISTS (
          SELECT 1
          FROM meeting_units mu
          JOIN meeting_participants mp ON mp.meeting_unit_id = mu.id
          WHERE mu.meeting_id = ${from}.id
            AND mp.user_id = @userId
            AND mp.delegated_to_user_id IS NOT NULL
            AND mp.delegation_state IN ('ACCEPTED', 'PENDING')
        )
      `);
    } else if (workstate) {
      const states = WORKSTATE_MAP[workstate];

      whereList.push(`
        EXISTS (
          SELECT 1
          FROM meeting_units mu
          JOIN meeting_participants mp ON mp.meeting_unit_id = mu.id
          WHERE mu.meeting_id = ${from}.id
            AND (
              (mp.user_id = @userId AND mp.delegated_to_user_id IS NULL AND mp.participant_state IN (${states.map(s => `'${s}'`).join(',')}))
              ${workstate === 'comfirmed' ? `
              OR
              (mp.delegated_to_user_id = @userId AND mp.delegation_state = 'ACCEPTED')
              ` : ''}
            )
        )
      `);
    }

    // ===== SUBSTATE =====
    if (substate === 'notprepare') {
      whereList.push(`
        EXISTS (
          SELECT 1
          FROM meeting_units mu
          JOIN meeting_participants mp ON mp.meeting_unit_id = mu.id
          WHERE mu.meeting_id = ${from}.id
            AND (
              (mp.user_id = @userId AND mp.delegated_to_user_id IS NULL)
              OR
              (mp.delegated_to_user_id = @userId AND mp.delegation_state = 'ACCEPTED')
            )
            AND (
              mp.prepare_documents = 0
              OR EXISTS (
                SELECT 1
                FROM meeting_tasks mt
                WHERE mt.attachable_id = mp.id
                  AND mt.attachable_type = 'PARTICIPANT'
                  AND (mt.is_document_prepared = 0 OR mt.is_document_prepared IS NULL)
              )
            )
        )
      `);
    }

    if (substate === 'completed') {
      whereList.push(`
        NOT EXISTS (
          SELECT 1
          FROM meeting_units mu
          JOIN meeting_participants mp ON mp.meeting_unit_id = mu.id
          WHERE mu.meeting_id = ${from}.id
            AND (
              (mp.user_id = @userId AND mp.delegated_to_user_id IS NULL)
              OR
              (mp.delegated_to_user_id = @userId AND mp.delegation_state = 'ACCEPTED')
            )
            AND (
              mp.prepare_documents = 0
              OR EXISTS (
                SELECT 1
                FROM meeting_tasks mt
                WHERE mt.attachable_id = mp.id
                  AND mt.attachable_type = 'PARTICIPANT'
                  AND (mt.is_document_prepared = 0 OR mt.is_document_prepared IS NULL)
              )
            )
        )
      `);
    }

    const whereClause = whereList.length ? `WHERE ${whereList.join(' AND ')}` : '';

    const totalSql = `
      SELECT COUNT(DISTINCT ${from}.id) AS total
      FROM ${this.dbname}.${from}
      ${whereClause}
    `;

    // ===== EXECUTE =====
    const request = pool.request().input('userId', userId);

    if (filter?.currentDate) request.input('startDate', filter.currentDate);

    if (filter?.currentWeek) {
      request.input('startDate', filter.currentWeek.startDate);
      request.input('endDate', filter.currentWeek.endDate);
    }

    if (filter?.currentMonth) {
      request.input('startDate', `${filter.currentMonth}-01`);
    }


    try {
      const res = await request.query(totalSql);
      const total = res.recordset[0]?.total ?? 0;


      return { total };
    } catch (err) {
      console.error('[COUNT ERROR]', err);
      throw err;
    }
  }
  // Đếm lịch phòng ban
  async countMeetingUnitDynamic(
    query: CreateMeetingDto,
    userId: string,
    authorId?: string,
  ): Promise<{ total: number }> {
    const { filter, processFn, authority, type, workstate } = query;

    if (authority === 'true' && authorId) userId = authorId;

    const pool = await this.getPool();

    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    const receiverUnit = await this.getUserReceiverUnit(userId);

    // ===== LẤY sibling units =====
    let siblingUnitIds: string[] = [];

    if (receiverUnit) {
      const currentUnit = await this.orgUnitRepo.findOne({
        where: { id: receiverUnit, status: 1 },
        select: ['id', 'parentId'],
      });

      if (currentUnit?.parentId) {
        const siblingUnits = await this.orgUnitRepo.find({
          where: {
            parentId: currentUnit.parentId,
            status: 1,
          },
          select: ['id'],
        });

        siblingUnitIds = siblingUnits.map(u => u.id);
      } else {
        siblingUnitIds = [receiverUnit];
      }
    }

    // ===== VALIDATE =====
    const ALLOWED_TYPES = ['day', 'week', 'month'] as const;
    if (type && !ALLOWED_TYPES.includes(type as any)) {
      throw new BadRequestException('Type không hợp lệ');
    }

    const ALLOWED_WORKSTATES = ['unit', 'allunit'] as const;
    if (workstate && !ALLOWED_WORKSTATES.includes(workstate as any)) {
      throw new BadRequestException('Workstate không hợp lệ');
    }

    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const leaderUserIds = Array.from(this.leaderUserIdSet);

    const { sql: filterFeature, from } = buildMeetingCriteriaHelper(
      [...featureCriteria, ...criteria],
      'meetings',
      featureManagement,
      leaderUserIds,
    );

    // ===== WHERE =====
    const where: string[] = [
      `${from}.status = '1'`,
      `(${from}.meeting_state = 'DA_HUY'
        OR EXISTS (
          SELECT 1 FROM ${this.dbname}.audit a
          WHERE a.document_id = ${from}.id_str
            AND a.stage_status = 'DONG_Y_PHE_DUYET'
        ))`,
    ];

    // ===== WORKSTATE =====
    if (workstate === 'unit' && receiverUnit) {
      where.push(`
        EXISTS (
          SELECT 1 FROM meeting_units mu
          WHERE mu.meeting_id = ${from}.id
            AND mu.unit_id = '${receiverUnit}'
        )
      `);
    }

    if (workstate === 'allunit' && siblingUnitIds.length) {
      const unitList = siblingUnitIds.map(id => `'${id}'`).join(',');

      where.push(`
        EXISTS (
          SELECT 1 FROM meeting_units mu
          WHERE mu.meeting_id = ${from}.id
            AND mu.unit_id IN (${unitList})
        )
      `);
    }

    // ===== FEATURE FILTER =====
    if (filterFeature) where.push(`(${filterFeature})`);

    // ===== TYPE FILTER =====
    if (type === 'day' && filter?.currentDate) {
      where.push(
        `${from}.meeting_date >= '${filter.currentDate}' 
        AND ${from}.meeting_date < DATEADD(day, 1, '${filter.currentDate}')`
      );
    }

    if (type === 'week' && filter?.currentWeek) {
      const { startDate, endDate } = filter.currentWeek;
      where.push(
        `${from}.meeting_date >= '${startDate}' 
        AND ${from}.meeting_date <= '${endDate}'`
      );
    }

    if (type === 'month' && filter?.currentMonth) {
      const [year, month] = String(filter.currentMonth).split('-');
      where.push(
        `${from}.meeting_date >= '${year}-${month}-01' 
        AND ${from}.meeting_date < DATEADD(month, 1, '${year}-${month}-01')`
      );
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const totalSql = `
      SELECT COUNT(DISTINCT ${from}.id) AS total
      FROM ${this.dbname}.${from}
      ${whereClause}
    `;


    try {
      const res = await pool.request().query(totalSql);
      const total = res.recordset[0]?.total ?? 0;


      return { total };
    } catch (err) {
      console.error('[COUNT ERROR]', err);
      throw err;
    }
  }

  // Đếm lịch tổng công ty 
  async countMeetingCompanyDynamic(
    query: CreateMeetingDto,
    userId: string,
    authorId?: string,
  ): Promise<{ total: number }> {
    const { filter, processFn, authority, type } = query;

    if (authority === 'true' && authorId) userId = authorId;

    const pool = await this.getPool();

    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    // ===== VALIDATE =====
    const ALLOWED_TYPES = ['day', 'week', 'month'] as const;
    if (type && !ALLOWED_TYPES.includes(type as any)) {
      throw new BadRequestException('Type không hợp lệ');
    }

    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, from } = buildMeetingCriteriaHelper(
      [...featureCriteria, ...criteria],
      'meetings',
      featureManagement,
    );

    // ===== WHERE =====
    const where: string[] = [
      `${from}.status = '1'`,
      `(${from}.meeting_state = 'DA_HUY'
        OR EXISTS (
          SELECT 1 FROM ${this.dbname}.audit a
          WHERE a.document_id = ${from}.id_str
            AND a.stage_status = 'DONG_Y_PHE_DUYET'
        ))`,
      `${from}.is_company = 1`,
    ];

    // feature filter
    if (filterFeature) where.push(`(${filterFeature})`);

    // ===== TYPE FILTER =====
    if (type === 'day' && filter?.currentDate) {
      where.push(
        `${from}.meeting_date >= '${filter.currentDate}' 
        AND ${from}.meeting_date < DATEADD(day, 1, '${filter.currentDate}')`
      );
    }

    if (type === 'week' && filter?.currentWeek) {
      const { startDate, endDate } = filter.currentWeek;
      where.push(
        `${from}.meeting_date >= '${startDate}' 
        AND ${from}.meeting_date <= '${endDate}'`
      );
    }

    if (type === 'month' && filter?.currentMonth) {
      const [year, month] = String(filter.currentMonth).split('-');
      where.push(
        `${from}.meeting_date >= '${year}-${month}-01' 
        AND ${from}.meeting_date < DATEADD(month, 1, '${year}-${month}-01')`
      );
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const totalSql = `
      SELECT COUNT(DISTINCT ${from}.id) AS total
      FROM ${this.dbname}.${from}
      ${whereClause}
    `;


    try {
      const res = await pool.request().query(totalSql);
      const total = res.recordset[0]?.total ?? 0;


      return { total };
    } catch (err) {
      console.error('[COUNT ERROR]', err);
      throw err;
    }
  }

  // Đếm soạn lịch họp
  async countPrepareMeetingScheduleDynamic(
    query: CreateMeetingDto,
    userId: string,
    authorId?: string,
  ): Promise<{ total: number }> {
    const { type, filter, processFn, authority } = query;

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const pool = await this.getPool();

    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, joins: filterJoins, from } =
      buildMeetingCriteriaHelper(
        [...featureCriteria, ...criteria],
        'meetings',
        featureManagement,
      );

    // ===== VALIDATE TYPE =====
    const MEETING_TYPES = ['daft', 'waiting', 'agree', 'refuse', 'cancel'] as const;

    if (!type || !MEETING_TYPES.includes(type as any)) {
      throw new BadRequestException('Type không hợp lệ');
    }

    const isDaft = type === 'daft';
    const isWaiting = type === 'waiting';
    const isAgree = type === 'agree';
    const isRefuse = type === 'refuse';
    const isCancel = type === 'cancel';

    // ===== BASE =====
    let where: string[] = [
      `${from}.status = '1'`,
      `${from}.meeting_state <> 'DA_HUY'`,
    ];

    let joinClause = filterJoins || '';

    // ===== DRAFT =====
    if (isDaft) {
      joinClause += `
        OUTER APPLY (
          SELECT TOP 1
            a.stage_status,
            a.receiver,
            a.user_id,
            a.created_by
          FROM ${this.dbname}.audit a WITH (NOLOCK)
          WHERE a.document_id = ${from}.id_str
            AND (
              a.receiver = '${userId}'
              OR a.user_id = '${userId}'
              OR a.receiver = 'SYSTEM_MIGRATION'
              OR a.user_id = 'SYSTEM_MIGRATION'
            )
            AND a.created_by IN ('${userId}','SYSTEM_MIGRATION')
            AND a.roleProcess = 'processor'
          ORDER BY a.created_at DESC, a.id DESC
        ) last_audit
      `;

      where.push(`last_audit.stage_status = '${stageStatusDoc.CHUA_XU_LY}'`);
    }

    // ===== WAITING =====
    if (isWaiting) {
      joinClause += `
        OUTER APPLY (
          SELECT TOP 1
            a.stage_status,
            a.receiver,
            a.created_by
          FROM ${this.dbname}.audit a WITH (NOLOCK)
          WHERE a.document_id = ${from}.id_str
          ORDER BY a.created_at DESC, a.id DESC
        ) waiting_audit
      `;

      where.push(`waiting_audit.created_by = '${userId}'`);
      where.push(`waiting_audit.receiver = 'BAN_QUAN_LY_PHONG'`);
      where.push(`waiting_audit.stage_status = 'CHUA_XU_LY'`);
    }

    // ===== AGREE =====
    if (isAgree) {
      where.push(`
        EXISTS (
          SELECT 1
          FROM ${this.dbname}.audit a
          WHERE a.document_id = ${from}.id_str
            AND a.stage_status = '${stageStatusDoc.DONG_Y_PHE_DUYET}'
            AND (
              a.receiver = '${userId}'
              OR a.user_id = '${userId}'
              OR a.created_by = '${userId}'
              OR a.created_by = 'SYSTEM_MIGRATION'
            )
        )
      `);
    }

    // ===== REFUSE =====
    if (isRefuse) {
      joinClause += `
        OUTER APPLY (
          SELECT TOP 1
            a.action_code,
            a.receiver
          FROM ${this.dbname}.audit a WITH (NOLOCK)
          WHERE a.type_document = '${this.typeDocument}'
            AND a.document_id = ${from}.id_str
          ORDER BY a.created_at DESC, a.id DESC
        ) refuse_audit
      `;

      where.push(`refuse_audit.action_code = 'TU_CHOI_LICH'`);

      where.push(`
        EXISTS (
          SELECT 1
          FROM ${this.dbname}.audit a0
          WHERE a0.document_id = ${from}.id_str
            AND a0.action_code = 'CREATE'
            AND (a0.created_by = '${userId}' OR a0.created_by = 'SYSTEM_MIGRATION')
        )
      `);

      where.push(`
        NOT EXISTS (
          SELECT 1
          FROM ${this.dbname}.audit a2
          WHERE a2.document_id = ${from}.id_str
            AND a2.action_code IN ('DONG_Y_LICH', 'DONG_Y_PHE_DUYET')
        )
      `);
    }

    // ===== CANCEL =====
    if (isCancel) {
      where = [];
      where.push(`${from}.status = '1'`);
      where.push(`${from}.meeting_state = 'DA_HUY'`);
      where.push(`
        (
          ${from}.created_by = '${userId}'
          OR ${from}.created_by = 'SYSTEM_MIGRATION'
          OR EXISTS (
            SELECT 1
            FROM ${this.dbname}.audit a
            WHERE a.document_id = ${from}.id_str
              AND (
                a.created_by = '${userId}'
                OR a.user_id = '${userId}'
                OR a.receiver = '${userId}'
              )
          )
        )
      `);
    }

    // ===== FEATURE FILTER =====
    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const totalSql = `
      SELECT COUNT(DISTINCT ${from}.id) AS total
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
    `;


    try {
      const res = await pool.request().query(totalSql);
      const total = res.recordset[0]?.total ?? 0;


      return { total };
    } catch (err) {
      console.error('[COUNT ERROR]', err);
      throw err;
    }
  }

  // Đếm lịch phê duyệt 
  async countApprovalScheduleDynamic(
    query: CreateMeetingDto,
    userId: string,
    authorId?: string,
  ): Promise<{ total: number }> {
    const { type, filter, processFn, authority } = query;

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const pool = await this.getPool();

    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const leaderUserIds = Array.from(this.leaderUserIdSet);

    const { sql: filterFeature, joins: filterJoins, from } =
      buildMeetingCriteriaHelper(
        [...featureCriteria, ...criteria],
        'meetings',
        featureManagement,
        leaderUserIds,
      );

    // ===== VALIDATE =====
    const MEETING_TYPES = ['waiting', 'agree', 'refuse'] as const;

    if (!type || !MEETING_TYPES.includes(type as any)) {
      throw new BadRequestException('Type không hợp lệ');
    }

    const isWaiting = type === 'waiting';
    const isAgree = type === 'agree';
    const isRefuse = type === 'refuse';

    // ===== BASE =====
    const where: string[] = [`${from}.status = '1'`];

    let joinClause = filterJoins || '';

    // ===== OUTER APPLY (LUÔN CÓ) =====
    joinClause += `
      OUTER APPLY (
        SELECT TOP 1
          a.stage_status,
          a.receiver,
          a.processed_by
        FROM ${this.dbname}.audit a WITH (NOLOCK)
        WHERE a.type_document = '${this.typeDocument}'
          AND a.document_id = ${from}.id_str
          AND (
            a.receiver = 'BAN_QUAN_LY_PHONG'
            OR a.receiver = '${userId}'
            OR a.processed_by = '${userId}'
            OR a.receiver = 'SYSTEM_MIGRATION'
            OR a.processed_by = 'SYSTEM_MIGRATION'
          )
        ORDER BY a.created_at DESC, a.id DESC
      ) last_audit
    `;

    // ===== WAITING =====
    if (isWaiting) {
      where.push(`
        last_audit.stage_status = '${stageStatusDoc.CHUA_XU_LY}'
        AND (
          last_audit.receiver = 'BAN_QUAN_LY_PHONG'
          OR last_audit.receiver = '${userId}'
          OR last_audit.receiver = 'SYSTEM_MIGRATION'
        )
      `);
    }

    // ===== AGREE =====
    if (isAgree) {
      where.push(`
        EXISTS (
          SELECT 1
          FROM ${this.dbname}.audit a1
          WHERE a1.document_id = ${from}.id_str
            AND a1.stage_status = '${stageStatusDoc.DONG_Y_PHE_DUYET}'
        )
        AND EXISTS (
          SELECT 1
          FROM ${this.dbname}.audit a2
          WHERE a2.document_id = ${from}.id_str
            AND (
              a2.receiver = '${userId}'
              OR a2.processed_by = '${userId}'
              OR a2.acting_as = '${userId}'
              OR a2.created_by = '${userId}'
              OR a2.created_by = 'SYSTEM_MIGRATION'
            )
        )
      `);
    }

    // ===== REFUSE =====
    if (isRefuse) {
      where.push(`
        last_audit.stage_status = '${stageStatusDoc.TU_CHOI_PHE_DUYET}'
        AND (
          last_audit.receiver = '${userId}'
          OR last_audit.processed_by = '${userId}'
          OR last_audit.receiver = 'SYSTEM_MIGRATION'
        )
      `);
    }

    // ===== FEATURE FILTER =====
    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const totalSql = `
      SELECT COUNT(DISTINCT ${from}.id) AS total
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
    `;


    try {
      const res = await pool.request().query(totalSql);
      const total = res.recordset[0]?.total ?? 0;


      return { total };
    } catch (err) {
      console.error('[COUNT ERROR]', err);
      throw err;
    }
  }
  // Đếm lịch cần xử lý
  async countProcessScheduleDynamic(
    query: CreateMeetingDto,
    userId: string,
    authorId?: string,
  ): Promise<{ total: number }> {
    const { type, filter, processFn, authority } = query;

    if (!this.dbname) {
      this.dbname = this.getDatabaseName();
    }

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const pool = await this.getPool();

    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    const receiverUnit = await this.getUserReceiverUnit(userId);

    if (!receiverUnit) {
      throw new BadRequestException('User chưa thuộc đơn vị');
    }

    // ===== VALIDATE =====
    const MEETING_TYPES = ['waiting', 'processing', 'processed'] as const;

    if (!type || !MEETING_TYPES.includes(type as any)) {
      throw new BadRequestException('Type không hợp lệ');
    }

    const isWaiting = type === 'waiting';
    const isProcessing = type === 'processing';
    const isProcessed = type === 'processed';

    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, joins: filterJoins, from } =
      buildMeetingCriteriaHelper(
        [...featureCriteria, ...criteria],
        'meetings',
        featureManagement,
      );

    // ===== WHERE =====
    const where: string[] = [
      `${from}.status = '1'`,
      `(${from}.is_template = 0 OR ${from}.is_template IS NULL)`
    ];

    let joinClause = filterJoins || '';

    // ===== JOIN meeting_units =====
    joinClause += `
      INNER JOIN ${this.dbname}.meeting_units mu
        ON mu.meeting_id = ${from}.id
        AND (
          mu.unit_id = '${receiverUnit}'
          OR (
            mu.unit_id = 'SECRETARY_UNIT'
            AND ${from}.secretary_type = '${ParticipantType.UNIT}'
            AND ${from}.secretary_id = '${receiverUnit}'
            AND NOT EXISTS (
              SELECT 1
              FROM ${this.dbname}.meeting_units mu2
              WHERE mu2.meeting_id = ${from}.id
                AND mu2.unit_id = '${receiverUnit}'
            )
          )
        )
    `;

    // ===== TYPE FILTER =====
    if (isWaiting) {
      where.push(`mu.unit_state = '${MEETING_UNIT_STATE.RECEIVED}'`);
    }

    if (isProcessing) {
      where.push(`
        mu.unit_state IN (
          '${MEETING_UNIT_STATE.PROCESSING}',
          '${MEETING_UNIT_STATE.CONFIRMED}'
        )
      `);
    }

    if (isProcessed) {
      where.push(`
        mu.unit_state IN (
          '${MEETING_UNIT_STATE.DONE}',
          '${MEETING_UNIT_STATE.COMPLETED}'
        )
      `);
    }

    // ===== FEATURE FILTER =====
    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const totalSql = `
      SELECT COUNT(DISTINCT ${from}.id) AS total
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
    `;


    try {
      const res = await pool.request().query(totalSql);
      const total = res.recordset[0]?.total ?? 0;


      return { total };
    } catch (err) {
      console.error('[COUNT ERROR]', err);
      throw err;
    }
  }
  // Đếm gán vị trí chỗ ngồi 
  async countSeatAssignmentDynamic(
    query: CreateMeetingDto,
    userId: string,
    authorId?: string,
  ): Promise<{ total: number }> {
    const { type, filter, processFn, authority } = query;

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const pool = await this.getPool();

    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    // ===== VALIDATE =====
    const MEETING_TYPES = ['waiting', 'processing', 'complete'] as const;

    if (!type || !MEETING_TYPES.includes(type as any)) {
      throw new BadRequestException('Type không hợp lệ');
    }

    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const leaderUserIds = Array.from(this.leaderUserIdSet);

    const { sql: filterFeature, joins: filterJoins, from } =
      buildMeetingCriteriaHelper(
        [...featureCriteria, ...criteria],
        'meetings',
        featureManagement,
        leaderUserIds,
      );

    // ===== WHERE =====
    const where: string[] = [`${from}.status = '1'`];

    // ===== TYPE FILTER =====
    if (type === 'waiting') {
      where.push(`${from}.is_assigning_seat = '${ASSIGNING_SEAT_STATUS.RECEIVED}'`);
    }

    if (type === 'processing') {
      where.push(`${from}.is_assigning_seat = '${ASSIGNING_SEAT_STATUS.ASSIGNING}'`);
    }

    if (type === 'complete') {
      where.push(`${from}.is_assigning_seat = '${ASSIGNING_SEAT_STATUS.ASSIGNED}'`);
    }

    // ===== FIXED FILTER =====
    where.push(`${from}.is_company = 1`);
    where.push(`${from}.meeting_mode != 'ONLINE'`);

    // ===== FEATURE FILTER =====
    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const joinClause = filterJoins || '';
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const totalSql = `
      SELECT COUNT(DISTINCT ${from}.id) AS total
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
    `;


    try {
      const res = await pool.request().query(totalSql);
      const total = res.recordset[0]?.total ?? 0;


      return { total };
    } catch (err) {
      console.error('[COUNT ERROR]', err);
      throw err;
    }
  }

  private async getSecretaryClerks(unitId: string): Promise<string[]> {
    try {
      const configs = await this.dataSource.query(
        `SELECT user_id FROM task_assignment_configs WHERE unit_id = @0`,
        [unitId]
      );
      if (configs && configs.length > 0) {
        return configs.map(c => c.user_id);
      }

      const clerks = await this.userRepo.createQueryBuilder('u')
        .innerJoin('u.groupUsers', 'g')
        .where('u.parent = :unitId', { unitId })
        .andWhere('u.status = 1')
        .andWhere('g.code IN (:...codes)', { codes: ['vanthutct', 'vtphong'] })
        .select('u.id')
        .getMany();

      return clerks.map(c => c.id);
    } catch (error) {
      this.logger.error(`Lỗi khi lấy danh sách văn thư cho phòng ban ${unitId}: ${error.message}`);
      return [];
    }
  }

  async approveOrRejectDelegation(
    meetingId: string,
    participantIds: string[],
    action: 'APPROVE' | 'REJECT',
    userId: string,
    req?: any
  ): Promise<{ success: boolean; message: string }> {
    const details = `${action === 'APPROVE' ? 'Phê duyệt' : 'Từ chối'} yêu cầu ủy quyền cuộc họp, ID cuộc họp: ${meetingId}`;
    try {
      const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } });
      if (!meeting) {
        throw new BadRequestException('Cuộc họp không tồn tại.');
      }

      for (const pId of participantIds) {
        const participant = await this.participantRepo.findOne({
          where: { id: pId },
        });

        if (!participant || participant.delegationState !== DelegationState.PENDING) {
          continue;
        }

        const originalUserId = participant.delegatedFromUserId;
        const delegatedToUserId = participant.delegatedToUserId;

        if (!originalUserId || !delegatedToUserId) {
          continue;
        }

        if (action === 'APPROVE') {
          // 1. Phê duyệt ủy quyền
          participant.delegationState = DelegationState.ACCEPTED;
          participant.participantState = ParticipantState.DELEGATED;

          // Kiểm tra xem người tham gia ban đầu có được giao nhiệm vụ chuẩn bị tài liệu (có task tương ứng) hay không
          const hasTasks = await this.taskRepo.count({
            where: {
              attachableId: participant.id,
              attachableType: 'PARTICIPANT'
            }
          });
          participant.prepareDocuments = hasTasks > 0;

          await this.participantRepo.save(participant);

          // 2. Tạo / Chuyển WorkItem BPMN cho người được ủy quyền
          const bpmnXML = await this.sqlRepo.getBpmnFile(meeting.bpmnVersion);
          const workItems = await this.sqlRepo.getWorkItemsByDocumentId(meetingId);
          const origWorkItem = workItems.find(wi => wi.assigneeUserId === originalUserId);

          const targetNodeId = participant.nodeId || origWorkItem?.nodeId || 'Activity_1kmmgo3';
          const targetBpmnRole = participant.bpmnRole || origWorkItem?.role || 'NGUOI_THAM_GIA';

          // Cập nhật lại participant nếu trước đó chưa có nodeId / bpmnRole
          if (!participant.nodeId || !participant.bpmnRole) {
            participant.nodeId = targetNodeId;
            participant.bpmnRole = targetBpmnRole;
            await this.participantRepo.save(participant);
          }

          const mockWorkItem = {
            nodeId: targetNodeId,
            role: targetBpmnRole,
          };

          try {
            await this.runtimeDbService.createWorkItemDelegated({
              meetingId,
              actionCode: 'DELEGATED',
              assigneeUserId: delegatedToUserId,
              bpmnXML,
              workItem: mockWorkItem,
              orignId: originalUserId,
            });
          } catch (err) {
            // Nếu quy trình BPMN tại node hiện tại không có luồng chuyển DELEGATED,
            // thực hiện thay thế người xử lý (WorkItem) từ originalUserId sang delegatedToUserId
            await this.sqlRepo.removeWorkItemByAssignee(meetingId, originalUserId);
            const workItemId = `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            await this.sqlRepo.addWorkItem(meetingId, {
              id: workItemId,
              nodeId: targetNodeId,
              role: targetBpmnRole,
              assigneeUserId: delegatedToUserId,
              nodeType: origWorkItem?.nodeType || 'bpmn:UserTask',
            }, undefined, meeting.bpmnVersion);
          }

          // 3. Gửi thông báo cho người được ủy quyền và người ủy quyền
          await this.notificationService.createForRecipients({
            recipientIds: [delegatedToUserId],
            senderId: userId,
            type: NotificationType.MEETING_PARTICIPANT_AUTHORIZED.value,
            title: 'Thông báo ủy quyền họp',
            content: `Bạn được ủy quyền tham gia cuộc họp "${meeting.title}" lúc ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)}`,
            recordId: meeting.id,
            link: `/meetings/${meeting.id}?listparammeeting=PARTICIPANT_MEETING`,
            key: NotificationKey.VIEW_MEETING_ROOM,
            time: new Date(),
            status: 0,
          });

          await this.notificationService.createForRecipients({
            recipientIds: [originalUserId],
            senderId: userId,
            type: NotificationType.MEETING_PARTICIPANT_AUTHORIZED.value,
            title: 'Yêu cầu ủy quyền đã được phê duyệt',
            content: `Yêu cầu ủy quyền tham gia cuộc họp "${meeting.title}" của bạn đã được phê duyệt.`,
            recordId: meeting.id,
            link: `/meetings/${meeting.id}?listparammeeting=PARTICIPANT_MEETING`,
            key: NotificationKey.VIEW_MEETING_ROOM,
            time: new Date(),
            status: 0,
          });

          // 4. Gửi email
          try {
            const delegatedUser = await this.sqlsvRepo.getUserById(delegatedToUserId);
            const delegator = await this.sqlsvRepo.getUserById(originalUserId);
            if (delegatedUser?.emailUser) {
              await this.sendMeetingDelegationEmail(
                delegatedUser.emailUser,
                meeting,
                delegator?.name,
              );
            }
          } catch (err) {
            this.logger.error(`Send delegation meeting email failed: ${err.message}`);
          }

        } else if (action === 'REJECT') {
          // 1. Từ chối ủy quyền
          participant.delegationState = DelegationState.REJECTED;
          participant.delegatedToUserId = null;
          participant.delegatedFromUserId = null;
          participant.delegatedAt = null;
          participant.assignmentType = AssignmentType.INITIAL;
          participant.participantState = ParticipantState.PENDING;

          await this.participantRepo.save(participant);

          // 2. Tạo lại WorkItem cũ tại node cũ cho người ủy quyền ban đầu
          const targetNodeId = participant.nodeId || 'Activity_1kmmgo3';
          const targetBpmnRole = participant.bpmnRole || 'NGUOI_THAM_GIA';
          const workItemId = `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          await this.sqlRepo.addWorkItem(meetingId, {
            id: workItemId,
            nodeId: targetNodeId,
            role: targetBpmnRole,
            assigneeUserId: originalUserId,
            nodeType: 'bpmn:UserTask',
          }, undefined, meeting.bpmnVersion);

          // 3. Gửi thông báo từ chối cho người ủy quyền ban đầu
          await this.notificationService.createForRecipients({
            recipientIds: [originalUserId],
            senderId: userId,
            type: NotificationType.MEETING_PARTICIPANT_AUTHORIZED.value,
            title: 'Yêu cầu ủy quyền bị từ chối',
            content: `Yêu cầu ủy quyền tham gia cuộc họp "${meeting.title}" của bạn đã bị từ chối.`,
            recordId: meeting.id,
            link: `/meetings/${meeting.id}?listparammeeting=PARTICIPANT_MEETING`,
            key: NotificationKey.VIEW_MEETING_ROOM,
            time: new Date(),
            status: 0,
          });
        }
      }

      // Cập nhật lại số lượng pendingDelegationCount trong bảng meetings
      const pendingCount = await this.participantRepo
        .createQueryBuilder('p')
        .innerJoin('meeting_units', 'mu', 'mu.id = p.meeting_unit_id')
        .where('mu.meeting_id = :meetingId', { meetingId })
        .andWhere('p.delegation_state = :state', { state: DelegationState.PENDING })
        .getCount();

      await this.meetingRepo.update(meetingId, { pendingDelegationCount: pendingCount });

      this.logAsync(req, userId, details, 'SUCCESS');
      return { success: true, message: 'Xử lý yêu cầu ủy quyền hoàn tất.' };
    } catch (err) {
      this.logAsync(req, userId, details, 'ERROR');
      throw new BadRequestException(err?.message || 'Đã xảy ra lỗi khi phê duyệt/từ chối ủy quyền.');
    }
  }

  async getPendingDelegations(meetingId: string): Promise<{ success: boolean; data: any[] }> {
    try {
      const list = await this.participantRepo
        .createQueryBuilder('p')
        .innerJoin('meeting_units', 'mu', 'mu.id = p.meeting_unit_id')
        .where('mu.meeting_id = :meetingId', { meetingId })
        .andWhere('p.delegation_state = :state', { state: DelegationState.PENDING })
        .getMany();

      const userIds = list.map(p => p.userId).concat(
        list.map(p => p.delegatedToUserId).filter(Boolean) as string[]
      );
      const userMap = await this.getUsersInfo(userIds);

      const data = list.map(p => {
        const delegator = userMap.get(p.userId);
        const assignee = p.delegatedToUserId ? userMap.get(p.delegatedToUserId) : null;
        return {
          id: p.id,
          userId: p.userId,
          userName: delegator?.name || p.userId,
          position: delegator?.position || '',
          unitName: delegator?.unitName || '',
          delegatedToUserId: p.delegatedToUserId,
          delegatedToUserName: assignee?.name || p.delegatedToUserId,
          delegatedToPosition: assignee?.position || '',
          delegatedToUnitName: assignee?.unitName || '',
          delegatedAt: p.delegatedAt,
          nodeId: p.nodeId,
          bpmnRole: p.bpmnRole,
        };
      });

      return { success: true, data };
    } catch (err) {
      this.logger.error(`Error in getPendingDelegations: ${err.message}`);
      throw new BadRequestException('Lấy danh sách yêu cầu ủy quyền thất bại.');
    }
  }

  async hasChairmanTasks(meetingId: string): Promise<boolean> {
    try {
      const chairmanUnit = await this.meetingUnitRepo.findOne({
        where: { meetingId, unitId: 'CHAIRMAN_UNIT' }
      });
      if (!chairmanUnit) return false;

      const chairmanParticipant = await this.participantRepo.findOne({
        where: { meetingUnitId: chairmanUnit.id, participantRole: 'CHAIRMAN' }
      });
      if (!chairmanParticipant) return false;

      const taskCount = await this.taskRepo.count({
        where: { meetingId, attachableType: 'PARTICIPANT', attachableId: chairmanParticipant.id }
      });
      return taskCount > 0;
    } catch (err) {
      this.logger.error(`Error in hasChairmanTasks: ${err.message}`);
      return false;
    }
  }

  async getChairmanAndSecretaries(meetingId: string): Promise<{ chairmanId: string | null; secretaryIds: string[] }> {
    try {
      const participants = await this.participantRepo.find({
        where: {
          unit: { meeting: { id: meetingId } }
        },
        relations: ['unit']
      });

      const chairman = participants.find(p => p.participantRole === 'CHAIRMAN');
      const secretaries = participants.filter(p => p.participantRole === 'SECRETARY');

      return {
        chairmanId: chairman?.userId || null,
        secretaryIds: secretaries.map(s => s.userId).filter(Boolean)
      };
    } catch (err) {
      this.logger.error(`Error in getChairmanAndSecretaries: ${err.message}`);
      return { chairmanId: null, secretaryIds: [] };
    }
  }

}
