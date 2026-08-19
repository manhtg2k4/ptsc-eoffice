import { Injectable, NotFoundException, Inject, InternalServerErrorException, BadRequestException, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as sql from 'mssql';
import * as moment from 'moment';
import { Repository, Brackets, In, DataSource } from 'typeorm';
import { DestroyRecordEntity } from './destroy-records.entity';
import { CreateDestroyRecordDto, UpdateDestroyRecordDto } from './destroy-records.dto';
import { ArchivesEntity } from 'src/archives-management/entities/archives.entity';
import { WorkItemsService } from 'src/work-items/work-items.service';
import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { getAllNodeExtensionProperties } from '../utils/util';
import { ProcessWorkItemDto } from 'src/work-items/dto/process-work-item.dto';
import { FeatureManagementService } from 'src/feature-management/feature-management.service';
import { ConfigService } from '@nestjs/config';
import BpmnEngineService from 'src/bpmn/bpmn-engine.service';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { RuntimeDbService } from 'src/bpmn/runtime-dbmssql.service';
import { NotificationService } from 'src/notifycation/notification.service';
import { UsersService } from 'src/users/users.service';
import { ConfigurationService } from 'src/view-config/configuration.service';
import { ArchiveRecord } from 'src/archive-records/entities/archive-record.entity';
import { ArchiveRecordItem } from 'src/archive-records/entities/archive-record-item.entity';
import { FilesManagementService } from 'src/files-managerment/files-management-mssql.service';
import { FeatureManagementEntity, StatusFeature } from 'src/feature-management/feature-management.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { Audit } from 'src/database/schema-sql/audit.entity';
import { getMssqlPool } from 'src/database/mssql.pool';
import { MSSQL_REPO } from 'src/database/database.provider';
import { buildRecordExploitationRequestssCriteriaHelper, parseSortRecordExploitationRequestss } from 'src/record-exploitation/validators/helper-record-exploitation';
import { stageStatusArchire } from 'src/variable/CONST_STATUS';
import { DESTROY_COMMANDER_STATUS_LABELS, DESTROY_LEADER_STATUS_LABELS, DESTROY_REASON_MAP, DESTROY_STATUS_LABELS } from './destroy-records.constants';
import { NotificationType } from 'src/notifycation/notification.enum';

export interface SearchQueryParams {
  page?: string | number;
  limit?: string | number;
  search?: string;
  sort?: string | Record<string, string | number>;
  sortOrder?: string;
  status?: string;
  name?: string;
  processFn?: string;
  filter?: string | Record<string, string | number | boolean>;
  type?: string;
}

export interface WorkflowPayload extends Partial<ProcessWorkItemDto> {
  [key: string]: any;
}

export enum DestroyRecordStatus {
  DRAFT = '0',
  WAITING_VAN_THU = '1',
  WAITING_LEADER = '2',
  WAITING_DESTRUCTION = '3',
  REJECTED = '4',
  COMPLETED = '5',
  UNIT_REJECTED = '6',
  LEADER_REJECTED = '7',
}

@Injectable()
export class DestroyRecordsService {
  private readonly logger = new Logger(DestroyRecordsService.name);
  private pool: sql.ConnectionPool | null = null;
  private dbname: string;
  private typeDocument: string;
  constructor(
    private readonly configService: ConfigService,
    private readonly bpmnEngine: BpmnEngineService,
    @Inject(MSSQL_REPO) private readonly sqlRepo: MSSQLRepository,
    private readonly sqlsvRepo: SQLSVRepository,
    private readonly runtimeDbService: RuntimeDbService,
    private readonly notificationService: NotificationService,
    private readonly userService: UsersService,
    private readonly fileService: FilesManagementService,
    private readonly configurationService: ConfigurationService,
    @Inject('BPMN_RUNTIME') private readonly runtime: any,

    @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
    private readonly featureManagementRepo: Repository<FeatureManagementEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userrepo: Repository<UserEntity>,
    @InjectRepository(Audit, 'mssqlConnection')
    private readonly auditRepo: Repository<Audit>,
    @InjectDataSource('mssqlConnection')
    private readonly dataSource: DataSource,

    @InjectRepository(DestroyRecordEntity, 'mssqlConnection')
    private readonly destroyRecordRepo: Repository<DestroyRecordEntity>,
    @InjectRepository(ArchivesEntity, 'mssqlConnection')
    private readonly archivesRepo: Repository<ArchivesEntity>,
    @InjectRepository(ArchiveRecord, 'mssqlConnection')
    private readonly archiveRecordRepo: Repository<ArchiveRecord>,
    @InjectRepository(ArchiveRecordItem, 'mssqlConnection')
    private readonly archiveRecordItemRepo: Repository<ArchiveRecordItem>,
    private readonly workItemsService: WorkItemsService,
    private readonly featureManagementService: FeatureManagementService,
  ) { }
  private getDatabaseName(): string {
    const dbName = this.configService.get<string>('SQLSERVER_DATABASE');
    if (!dbName) throw new Error('SQLSERVER_DATABASE not defined in .env');
    return dbName + '.dbo';
  }

  onModuleInit() {
    this.dbname = this.getDatabaseName();
    this.typeDocument = 'DestructionProcess'
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
  async create(data: UpdateDestroyRecordDto, originalUserId: string) {
    if (data.profileIds && Array.isArray(data.profileIds)) {
      data.totalDestroyedRecords = data.profileIds.length;
    }

    if (data.destroyBatchCode) {
      const existed = await this.destroyRecordRepo.findOne({
        where: { destroyBatchCode: data.destroyBatchCode },
      });

      if (existed) {
        throw new BadRequestException(
          `Mã đợt tiêu hủy "${data.destroyBatchCode}" đã tồn tại`,
        );
      }
    }
    const { flowConfig, workItem, actionCode, assigneeUserId } = data;
    if (!flowConfig) {
      throw new BadRequestException('Không tìm thấy luồng cho người dùng');
    }

    if (!actionCode) {
      throw new BadRequestException('actionCode is required');
    }

    const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig);

    const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);
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
      if (
        target &&
        (target.$type === 'bpmn:ExclusiveGateway' ||
          target.$type === 'bpmn:InclusiveGateway')
      ) {
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
      throw new BadRequestException(
        `No outgoing flow matches actionCode ${actionCode}`,
      );
    }

    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
      flow,
      indexes,
    );

    if (!nextNode) {
      throw new BadRequestException('No next interactive node found');
    }

    const roleme = indexes.laneMap.get(workItem.nodeId);
    const hasRoleDirect = await this.userService.checkDirectRoleInFlow(originalUserId, flowConfig, [roleme]);
    const hasRoleGroup = await this.userService.checkUserInFlow(originalUserId, flowConfig, [roleme]);
    if (!hasRoleDirect && !hasRoleGroup) {
      throw new BadRequestException('Bạn không có quyền tạo đợt tiêu hủy hồ sơ');
    }

    const entity = this.destroyRecordRepo.create({
      ...data,
      bpmnVersion: flowConfig,
      createdBy: originalUserId,
      status: assigneeUserId ? DestroyRecordStatus.WAITING_VAN_THU : (data.status || DestroyRecordStatus.DRAFT),
    });
    const savedRecord = await this.destroyRecordRepo.save(entity);

    const statusCode = getAllNodeExtensionProperties(nextNode)?.statusCode;

    // ===== WORK ITEM =====
    const roleRecive = indexes.laneMap.get(nextNode.id);

    await this.sqlRepo.addWorkItem(
      savedRecord.id,
      {
        id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        nodeId: nextNode.id,
        assigneeUserId: assigneeUserId ?? originalUserId,
        role: roleRecive,
        nodeType: nextNode.$type,
      },
      undefined,
      flowConfig,
    );

    // ===== AUDIT =====
    const typeAudit = getAllNodeExtensionProperties(nextNode)?.typeAudit || 'DAFT';

    const baseAudit = {
      user_id: originalUserId,
      display_name: null,
      role: wi.role,
      action_code: actionCode,
      from_node_id: wi.nodeId,
      to_node_id: nextNode.id,
      receiver_unit: null,
      group_: null,
      roleProcess: 'processor',
      created_by: originalUserId,
      origin_id: wi.id,
      deadline: null,
      created_at: new Date(),
      updated_at: new Date(),
      curStatusCode: statusCode,
      typeDocument: this.typeDocument,
    };

    if (typeAudit === 'DAFT') {
      await this.sqlRepo.addAudit(savedRecord.id, {
        ...baseAudit,
        receiver: originalUserId,
        action: 'Tạo đợt tiêu hủy hồ sơ',
        details: 'Tạo đợt tiêu hủy hồ sơ',
        stage_status: stageStatusArchire.CHUA_XU_LY,
      });
    }

    if (typeAudit === 'LEADER') {
      await this.sqlRepo.addAudit(savedRecord.id, {
        ...baseAudit,
        receiver: originalUserId,
        action: 'Tạo đợt tiêu hủy hồ sơ',
        details: 'Tạo đợt tiêu hủy hồ sơ',
        stage_status: stageStatusArchire.DA_XU_LY,
      });

      await this.sqlRepo.addAudit(savedRecord.id, {
        ...baseAudit,
        receiver: assigneeUserId ?? originalUserId,
        action:
          typeAudit === 'LEADER'
            ? 'Trình chánh văn phòng'
            : 'Trình ban lãnh đạo',
        stage_status: stageStatusArchire.CHUA_XU_LY,
        details: 'Trình phê duyệt',
      });
    }

    if (statusCode) {
      await this.sqlRepo.updateDestroyStatusCode(savedRecord.id, statusCode);
    }
    // await this.sqlRepo.updateDestroyActionCode(savedRecord.id, actionCode);

    // Gửi thông báo cho người nhận khi trình luôn
    if (assigneeUserId) {
      await this.notificationService.createForRecipients({
        recipientIds: [assigneeUserId],
        senderId: originalUserId,
        content: `Đồng chí có yêu cầu tiêu hủy hồ sơ: "${savedRecord.destroyBatchName}" cần xử lý`,
        recordId: savedRecord.id,
        link: `/destroy-records/${savedRecord.id}`,
        key: 'VIEW_RECORD_DESTRUCTION',
        time: new Date(),
        status: 0,
        type: NotificationType.ARCHIVE_RECORD_PROCESS_ASSIGNEE.value
      });
      console.log('[DEBUG] Đã gửi thông báo cho assigneeUserId:', assigneeUserId);
    } else {
      console.log('[DEBUG] Không có assigneeUserId, không gửi thông báo');
    }

    if (data.profileIds && data.profileIds.length > 0) {
      const archiveIds = data.profileIds.map((id) => Number(id)).filter((id) => !isNaN(id));

      if (archiveIds.length > 0) {
        await this.archivesRepo.update(
          { id: In(archiveIds) },
          { destroyBatchCode: savedRecord.destroyBatchCode },
        );
      }
    }

    return savedRecord;
  }

  async findAll(queryParams: SearchQueryParams, userId: string) {
    const {
      page = 1,
      limit = 25,
      search,
      sort: sortParam,
      sortOrder: sortOrderParam,
      filter: filterParam,
      processFn,
      type,
    } = queryParams;

    const skip = (Number(page) - 1) * Number(limit);
    let sort = sortParam || 'createdAt';
    let sortOrder: 'ASC' | 'DESC' =
      sortOrderParam?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    if (sort && typeof sort === 'object' && !Array.isArray(sort)) {
      const keys = Object.keys(sort);
      if (keys.length > 0) {
        const sortKey = keys[0];
        const value = sort[sortKey];
        sort = sortKey;
        sortOrder = String(value) === '1' || String(value).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      }
    }

    const query = this.destroyRecordRepo.createQueryBuilder('record');

    if (search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('record.destroyBatchCode LIKE :search', {
            search: `%${search}%`,
          }).orWhere('record.destroyBatchName LIKE :search', {
            search: `%${search}%`,
          });
        }),
      );
    }

    let filter = filterParam;
    if (typeof filter === 'string') {
      try {
        filter = JSON.parse(filter);
      } catch {
        // Ignored
      }
    }

    if (filter && typeof filter === 'object') {
      const keys = Object.keys(filter);
      if (keys.length > 0) {
        query.andWhere(
          new Brackets((qb) => {
            keys.forEach((key, index) => {
              const paramName = `filter_${index}`;
              if (index === 0) {
                qb.where(`record.${key} LIKE :${paramName}`, {
                  [paramName]: `%${filter[key]}%`,
                });
              } else {
                qb.orWhere(`record.${key} LIKE :${paramName}`, {
                  [paramName]: `%${filter[key]}%`,
                });
              }
            });
          }),
        );
      }
    }

    // --- LOGIC LỌC TỪ FEATURE MANAGEMENT (MÀN HÌNH) ---
    // Giống RecordExploitationService: Lấy cấu hình lọc từ DB
    if (processFn) {
      const featureManagement = await this.featureManagementService.findByCode(processFn);
      const featureCriteria = featureManagement?.criteria || [];

      if (Array.isArray(featureCriteria) && featureCriteria.length > 0) {
        const criteriaQuery = new Brackets((qb) => {
          featureCriteria.forEach((crit: any, index: number) => {
            const { name, operator, value } = crit;
            const paramName = `feat_${index}`;
            const field = `record.${name}`;

            const check = (condition: string, params?: any) => {
              // Logic AND/OR có thể tùy chỉnh, ở đây dùng andWhere cho tất cả criteria
              qb.andWhere(condition, params);
            };

            switch (operator) {
              case 'eq':
                check(`${field} = :${paramName}`, { [paramName]: value });
                break;
              case 'in':
                check(`${field} IN (:...${paramName})`, { [paramName]: Array.isArray(value) ? value : [value] });
                break;
              case 'like':
                check(`${field} LIKE :${paramName}`, { [paramName]: `%${value}%` });
                break;
              case 'neq':
                check(`${field} != :${paramName}`, { [paramName]: value });
                break;
            }
          });
        });
        query.andWhere(criteriaQuery);
      }
    }

    // --- LOGIC LỌC THEO TYPE (TABS) DỰA TRÊN AUDIT ---
    // Mô phỏng logic OUTER APPLY (SELECT TOP 1 ...) từ RecordExploitationService
    if (type) {
      const t = type.toLowerCase();

      if (['daft', 'waiting', 'pending', 'refuse', 'refure', 'complete'].includes(t)) {
        // Tab Cần xử lý / Chờ duyệt: Check trạng thái CHUA_XU_LY và receiver = userId
        // Hoặc status = '0' (Draft) nếu chưa có audit (tuỳ logic hệ thống, ở đây ưu tiên Audit như RES)
        // Tuy nhiên, logic RES cho 'daft' cũng check audit. Nếu record mới tạo status=0 chưa có audit sẽ không hiện?
        // DestroyRecords tạo mới có status=0. Submit mới tạo audit.
        // Nên ta kết hợp: (status = 0 AND createdBy = userId) OR (Audit check)

        query.andWhere(new Brackets((qb) => {
          // Logic Audit: stage_status = 'CHUA_XU_LY' và receiver = userId
          qb.where(`(
             SELECT TOP 1 a.stage_status
             FROM audit a WHERE a.document_id = CAST(record.id AS NVARCHAR(64)) ORDER BY a.created_at DESC, a.id DESC
           ) = 'CHUA_XU_LY' AND (
             SELECT TOP 1 a.receiver
             FROM audit a WHERE a.document_id = CAST(record.id AS NVARCHAR(64)) ORDER BY a.created_at DESC, a.id DESC
           ) = :userId`, { userId });

          // Logic bổ sung cho DestroyRecords: Nếu là tab Draft/Pending mà chưa có audit (status=0) thì check createdBy
          if (t === 'daft' || t === 'all') {
            qb.orWhere(`(record.status = '0' AND record.createdBy = :userId)`, { userId });
          }
        }));
      } else if (['processed', 'processing'].includes(t)) {
        // Tab Đã xử lý: Check trạng thái DA_XU_LY
        query.andWhere(`(
          SELECT TOP 1 a.stage_status
          FROM audit a WHERE a.document_id = CAST(record.id AS NVARCHAR(64)) ORDER BY a.created_at DESC, a.id DESC
        ) = 'DA_XU_LY'`);
      }
    }

    // Logic cũ cho status (backward compatibility nếu không dùng type/processFn)
    if (!processFn && !type && queryParams.status) {
      if (queryParams.status === 'PENDING') {
        query.andWhere('record.status IN (:...statuses)', {
          statuses: [
            DestroyRecordStatus.WAITING_VAN_THU,
            DestroyRecordStatus.WAITING_LEADER,
            DestroyRecordStatus.WAITING_DESTRUCTION,
          ],
        });
      } else if (queryParams.status === 'WAITING_OFFICE') {
        query.andWhere('record.status = :status', { status: DestroyRecordStatus.WAITING_VAN_THU });
      } else {
        query.andWhere('record.status = :status', {
          status: queryParams.status,
        });
      }
    }

    // Filter Only Mine
    if (userId && (queryParams as any).onlyMine) {
      query.andWhere('record.createdBy = :userId', { userId });
    }

    query.orderBy(`record.${sort}`, sortOrder as any);
    query.skip(skip).take(Number(limit));

    const [data, total] = await query.getManyAndCount();
    const totalPages = Math.ceil(total / Number(limit));

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages,
    };
  }

  /**
   * Xem chi tiết đợt tiêu hủy và lấy thông tin quy trình (flags, buttons)
   * @param id ID đợt tiêu hủy
   * @param userId ID người dùng đang xem (để check quyền xử lý)
   */
  async findOne(id: string, userId?: string) {
    const record = await this.destroyRecordRepo.findOne({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException(
        `Không tìm thấy bản ghi với ID: ${id}`,
      );
    }

    if (!userId) {
      return {
        ...record,
        workItem: null,
        availableActions: [],
        flags: {},
      };
    }

    try {
      // ===== 1. Load BPMN theo version của record =====
      const bpmnXML = await this.sqlRepo.getBpmnFile(
        record.bpmnVersion,
      );

      if (!bpmnXML) {
        return {
          ...record,
          workItem: null,
          availableActions: [],
          flags: {},
        };
      }

      const { process, indexes } =
        await this.runtimeDbService.getModelFromXml(
          bpmnXML,
        );

      // ===== 2. Lấy audit + open work items =====
      const [audit, openWorkItems] = await Promise.all([
        this.sqlRepo.getAudit(record.id),
        this.sqlRepo.listOpenWorkItems(record.id),
      ]);

      const perItems: any[] = [];

      // ===== 3. Compute từng workItem =====
      for (const wi of openWorkItems) {
        const user = await this.userrepo.findOne({ where: { id: userId } });
        const userRoles = (user?.rolesByProcess || [])
          .flatMap((p) => (p.roles || []).map((r) => r.roleCode))
          .concat(user?.codeND ? [user.codeND] : []);

        const res =
          await this.bpmnEngine.computeAvailableActions({
            process,
            indexes,
            currentNodeId: wi.nodeId,
            workItem: wi,
            document: record,
            userId,
            userRoles: userRoles || [],
            getUsersByRole: (role) =>
              this.sqlsvRepo.getUsersByRoleMongoDB(role),
            audit,
          });

        perItems.push({
          workItem: wi,
          node: res.node,
          availableActions: res.availableActions,
          flags: res.flags,
        });
      }

      // ===== 4. Chọn summary giống hàm chuẩn =====
      const first = perItems.find((x) =>
        x.availableActions?.some(
          (a: any) => a.canExecute,
        ),
      );

      const summary =
        first ||
        perItems[0] || {
          workItem: null,
          availableActions: [],
          flags: {},
        };

      const summaryFlags = perItems.reduce(
        (acc, x) => ({ ...acc, ...x.flags }),
        {},
      ) as any;

      // Hỗ trợ status 0, 6, 7 (Chưa trình, Đã trả lại) cho người tạo (vt)
      if (['0', '6', '7'].includes(record.statusCode ?? '') && record.createdBy === userId) {
        summaryFlags.canProcess = true;
        // Nếu không có action nào từ engine, thêm action trình mặc định
        if (!summary.availableActions || summary.availableActions.length === 0) {
          summary.availableActions = [
            {
              code: 'VT_TAOMOIVATRINH_TIEUHUY_HOSO',
              label: 'Trình phê duyệt',
              canExecute: true,
              type: 'transfer'
            }
          ];
        }
      }

      const userIds = [...new Set((audit || []).map((a) => a.userId).filter(Boolean))];
      const users = await this.userrepo.find({
        where: { id: In(userIds) },
        select: ['id', 'name'],
      });
      const userMap = new Map(users.map((u) => [u.id, u.name]));

      return {
        ...record,
        workItem: summary.workItem,
        availableActions: summary.availableActions,
        flags: summaryFlags,
        audit: (audit || []).map(a => ({
          ...a,
          displayName: userMap.get(a.userId) || a.displayName || 'Người dùng hệ thống',
          timeLabel: a.time ? moment(a.time).format('HH:mm DD/MM/YYYY') : moment(a.createdAt).format('HH:mm DD/MM/YYYY'),
        })).reverse(),
      };
    } catch (error) {
      console.error(
        'Lỗi workflow destroyRecord:',
        error,
      );

      return {
        ...record,
        workItem: null,
        availableActions: [],
        flags: {},
      };
    }
  }

  /**
   * Lấy người trình phê duyệt (Dựa trên actionCode và workItem hiện tại)
   */
  async getUserInFlowSubmit(dto: UpdateDestroyRecordDto) {
    const { flowConfig, workItem, actionCode } = dto;

    const processKey = flowConfig || 'thhs';
    const repo = (this.runtime as any).repo || (this.runtime as any).mysqlRepo;
    const bpmnXML = await repo.getBpmnFile(processKey);

    const { indexes } = await this.runtime.getModelFromXml(bpmnXML);
    const wi = workItem;

    if (!wi || !wi.nodeId) {
      throw new BadRequestException('WorkItem không hợp lệ hoặc đã hoàn thành');
    }

    if (!actionCode) {
      throw new BadRequestException('actionCode là bắt buộc');
    }

    const node = indexes.nodes.get(wi.nodeId);
    if (!node) {
      throw new BadRequestException('BPMN Node hiện tại không tồn tại');
    }

    let outs = indexes.outgoingBySource.get(node.id) || [];

    // Handle gateway trung gian (nếu có)
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

    // Match flow theo actionCode
    const flow = outs.find((f: any) => {
      const ext = getAllNodeExtensionProperties(f);
      return (
        (ext?.actionCode && ext.actionCode.toUpperCase() === actionCode.toUpperCase()) ||
        (f.name && f.name.toUpperCase() === actionCode.toUpperCase()) ||
        f.id === actionCode
      );
    });

    if (!flow) {
      throw new BadRequestException(`Không tìm thấy luồng xử lý cho hành động: ${actionCode}`);
    }

    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);

    if (!nextNode) {
      throw new BadRequestException('Không tìm thấy bước xử lý tiếp theo');
    }

    const targetRole = indexes.laneMap.get(nextNode.id) || 'USER';

    // Lấy danh sách user theo role từ bảng role_feature (theo processKey)
    const { usersWithType } = await this.sqlsvRepo.getUsersInFlow(processKey, targetRole);

    return {
      success: true,
      data: usersWithType || [],
      targetRole,
    };
  }

  /**
   * Lấy danh sách người dùng trong luồng để trình/chuyển xử lý
   */
  async getUsersInFlow(
    userId: string,
    payload: WorkflowPayload,
    limit = 500,
    page = 1,
    name?: string,
  ) {
    const { roles, processKey } = payload;

    // 1. Xác định processKey (mặc định là 'thhs' cho tiêu hủy)
    const processKeyFinal = processKey || 'thhs';

    // 2. Lấy danh sách roles
    const roleList = roles?.split(',').filter(Boolean) || [];

    // 3. Gọi repository để lấy users trong flow
    // Sử dụng sqlsvRepo để lấy danh sách người dùng vì hàm này được định nghĩa ở đó
    const { usersWithType } = await this.sqlsvRepo.getUsersInFlowv2(
      processKeyFinal,
      roleList,
      limit * page + 100, // Lấy dư ra để filter tên cho chuẩn
      1,
      userId,
    );

    let allUsers = usersWithType || [];

    // 4. Filter theo tên nếu có (sử dụng util có sẵn)
    if (name && name.trim()) {
      const { filterUsersByName } = await import('src/utils/util');
      allUsers = filterUsersByName(allUsers, name);
    }

    // 5. Map tên người được ủy quyền (nếu có)
    if (allUsers && allUsers.length > 0) {
      for (const u of allUsers) {
        const userAny = u as any;
        const userIdInFlow = userAny._id || userAny.id;
        try {
          const authorizedId = await this.runtime.repo.getAuthorizedIdIfAuthor(userIdInFlow);
          if (authorizedId) {
            const authorizedName = await this.runtime.repo.getNameOfUser(authorizedId);
            if (authorizedName) {
              u.name = `${authorizedName} (Được ${u.name} ủy quyền)`;
            }
          }
        } catch {
          // Bỏ qua lỗi nếu không lấy được thông tin ủy quyền
        }
      }
    }

    // 6. Phân trang
    const total = allUsers.length;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      data: allUsers.slice(start, end),
      total,
      limit,
      page,
    };
  }

  async submitleadersMiningRecords(
    id: string,
    dto: UpdateDestroyRecordDto,
    originalUserId: string,
    author: boolean,
  ) {
    const { workItem, actionCode, assigneeUserId, deadline, noteDetail } = dto;
    const record = await this.destroyRecordRepo.findOne({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException({
        success: false,
        message: 'Không tìm thấy đợt tiêu hủy',
      });
    }
    if (!workItem?.id) {
      throw new BadRequestException('WorkItem is required');
    }

    if (!actionCode) {
      throw new BadRequestException('actionCode is required');
    }

    // 2. Load BPMN
    const bpmnXML = await this.sqlRepo.getBpmnFile(record.bpmnVersion);
    if (!bpmnXML) {
      throw new BadRequestException('Không tìm thấy BPMN');
    }

    const { indexes } =
      await this.runtimeDbService.getModelFromXml(bpmnXML);

    // 3. Lấy workItem hiện tại
    const wi = await this.sqlRepo.getWorkItem(record.id, workItem.id);

    if (!wi) {
      throw new BadRequestException(
        'WorkItem not found or already completed',
      );
    }

    // 4. Node hiện tại
    const currentNode = indexes.nodes.get(wi.nodeId);
    if (!currentNode) {
      throw new BadRequestException(
        'Current BPMN node not found',
      );
    }

    // 5. Tìm outgoing flow theo actionCode
    const outs =
      indexes.outgoingBySource.get(currentNode.id) || [];

    const flow = outs.find((f: any) => {
      const ext = getAllNodeExtensionProperties(f);
      return (
        (ext?.actionCode &&
          ext.actionCode.toUpperCase() === actionCode.toUpperCase()) ||
        (f.name &&
          f.name.toUpperCase() === actionCode.toUpperCase()) ||
        f.id === actionCode
      );
    });

    if (!flow) {
      throw new BadRequestException(
        `No outgoing flow matches actionCode ${actionCode}`,
      );
    }

    // 6. Resolve next interactive node (KHÔNG xử lý gateway thủ công nữa)
    const { node: nextNode } =
      this.bpmnEngine.nextInteractiveFromFlow(
        flow,
        indexes,
      );

    if (!nextNode) {
      throw new BadRequestException(
        'No next interactive node found',
      );
    }

    // 7. Resolve role & status
    const targetRole = indexes.laneMap.get(nextNode.id);
    if (!targetRole) {
      throw new BadRequestException(
        'Target role not found for next node',
      );
    }

    const attributes =
      getAllNodeExtensionProperties(nextNode) || {};

    const statusCode = attributes.statusCode || undefined;
    const statusName =
      attributes.statusName || 'Trình phê duyệt';

    const effectiveUserId = author || originalUserId;
    const effectiveDisplayName = 'Người tiêu hủy';

    // 8. Transaction
    const tx = await this.sqlRepo.begin();

    try {
      // Remove current workItem
      await this.sqlRepo.removeWorkItem(
        record.id,
        wi.id,
        tx,
      );

      // Add next workItem
      await this.sqlRepo.addWorkItem(
        record.id,
        {
          id: `wi_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 8)}`,
          nodeId: nextNode.id,
          role: targetRole,
          assigneeUserId: assigneeUserId,
          nodeType: nextNode.$type,
        },
        tx,
        record.bpmnVersion,
      );

      // Update stage audit
      await this.sqlRepo.updateStageStatusAudit(
        record.id,
        {
          receiver: effectiveUserId,
          stage_status: stageStatusArchire.DA_XU_LY,
        },
        tx,
      );

      // Add audit
      await this.sqlRepo.addAudit(
        record.id,
        {
          user_id: effectiveUserId,
          display_name: effectiveDisplayName,
          role: wi.role,
          action_code: actionCode,
          from_node_id: wi.nodeId,
          to_node_id: nextNode.id,
          receiver: assigneeUserId,
          receiver_unit: null,
          group_: null,
          roleProcess: 'processor',
          action: statusName,
          created_by: effectiveUserId,
          stage_status: stageStatusArchire.CHUA_XU_LY,
          origin_id: wi.id,
          deadline: deadline || null,
          created_at: new Date(),
          updated_at: new Date(),
          details: noteDetail ?? 'Trình phê duyệt',
          curStatusCode: statusCode,
          typeDocument: this.typeDocument,
        },
        tx,
      );

      // Update status
      if (statusCode) {
        await this.sqlRepo.updateDestroyStatusCode(
          record.id,
          statusCode,
          tx,
        );
      }

      await this.sqlRepo.commit(tx);
    } catch (error) {
      await this.sqlRepo.rollback(tx);
      throw error;
    }

    // Cập nhật trạng thái bản ghi sang 1 (Chờ phê duyệt) - thực hiện sau khi transaction đã commit
    await this.destroyRecordRepo.update(id, { status: DestroyRecordStatus.WAITING_VAN_THU });

    if (assigneeUserId) {
      await this.notificationService.createForRecipients({
        recipientIds: [assigneeUserId],
        senderId: originalUserId,
        content: `Đồng chí có yêu cầu tiêu hủy hồ sơ: "${record.destroyBatchName}" cần xử lý`,
        recordId: record.id,
        link: `/destroy-records/${record.id}`,
        type: NotificationType.ARCHIVE_RECORD_PROCESS_ASSIGNEE.value,
        key: 'VIEW_RECORD_DESTRUCTION',
        time: new Date(),
        status: 0,
      });
    }

    return {
      status: true,
      message: 'Trình lãnh đạo thành công',
    };
  }

  async submitcommanderMiningRecords(
    id: string,
    dto: UpdateDestroyRecordDto,
    originalUserId: string,
    author: boolean,
  ) {
    const { workItem, actionCode, assigneeUserId, deadline, noteDetail } = dto;
    const record = await this.destroyRecordRepo.findOne({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException({
        success: false,
        message: 'Không tìm thấy đợt tiêu hủy',
      });
    }
    if (!workItem?.id) {
      throw new BadRequestException('WorkItem is required');
    }

    if (!actionCode) {
      throw new BadRequestException('actionCode is required');
    }

    // 2. Load BPMN
    const bpmnXML = await this.sqlRepo.getBpmnFile(record.bpmnVersion);
    if (!bpmnXML) {
      throw new BadRequestException('Không tìm thấy BPMN');
    }

    const { indexes } =
      await this.runtimeDbService.getModelFromXml(bpmnXML);

    // 3. Lấy workItem hiện tại
    const wi = await this.sqlRepo.getWorkItem(record.id, workItem.id);

    if (!wi) {
      throw new BadRequestException(
        'WorkItem not found or already completed',
      );
    }

    // 4. Node hiện tại
    const currentNode = indexes.nodes.get(wi.nodeId);
    if (!currentNode) {
      throw new BadRequestException(
        'Current BPMN node not found',
      );
    }

    // 5. Tìm outgoing flow theo actionCode
    const outs =
      indexes.outgoingBySource.get(currentNode.id) || [];

    const flow = outs.find((f: any) => {
      const ext = getAllNodeExtensionProperties(f);
      return (
        (ext?.actionCode &&
          ext.actionCode.toUpperCase() === actionCode.toUpperCase()) ||
        (f.name &&
          f.name.toUpperCase() === actionCode.toUpperCase()) ||
        f.id === actionCode
      );
    });

    if (!flow) {
      throw new BadRequestException(
        `No outgoing flow matches actionCode ${actionCode}`,
      );
    }

    // 6. Resolve next interactive node
    const { node: nextNode } =
      this.bpmnEngine.nextInteractiveFromFlow(
        flow,
        indexes,
      );

    if (!nextNode) {
      throw new BadRequestException(
        'No next interactive node found',
      );
    }

    // 7. Resolve role & status
    const targetRole = indexes.laneMap.get(nextNode.id);
    if (!targetRole) {
      throw new BadRequestException(
        'Target role not found for next node',
      );
    }

    const attributes =
      getAllNodeExtensionProperties(nextNode) || {};

    const statusCode = attributes.statusCode || undefined;
    const statusName =
      attributes.statusName || 'Trình phê duyệt';

    const effectiveUserId = author || originalUserId;
    const effectiveDisplayName = 'Chánh văn phòng';

    // 8. Transaction
    const tx = await this.sqlRepo.begin();

    try {
      // Remove current workItem
      await this.sqlRepo.removeWorkItem(
        record.id,
        wi.id,
        tx,
      );

      // Add next workItem
      await this.sqlRepo.addWorkItem(
        record.id,
        {
          id: `wi_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 8)}`,
          nodeId: nextNode.id,
          role: targetRole,
          assigneeUserId: assigneeUserId,
          nodeType: nextNode.$type,
        },
        tx,
        record.bpmnVersion,
      );

      // Update stage audit
      await this.sqlRepo.updateStageStatusAudit(
        record.id,
        {
          receiver: effectiveUserId,
          stage_status: stageStatusArchire.DA_XU_LY,
        },
        tx,
      );

      // Add audit
      await this.sqlRepo.addAudit(
        record.id,
        {
          user_id: effectiveUserId,
          display_name: effectiveDisplayName,
          role: wi.role,
          action_code: actionCode,
          from_node_id: wi.nodeId,
          to_node_id: nextNode.id,
          receiver: assigneeUserId,
          receiver_unit: null,
          group_: null,
          roleProcess: 'processor',
          action: statusName,
          created_by: effectiveUserId,
          stage_status: stageStatusArchire.CHUA_XU_LY,
          origin_id: wi.id,
          deadline: deadline || null,
          created_at: new Date(),
          updated_at: new Date(),
          details: noteDetail ?? 'Trình lãnh đạo phê duyệt',
          curStatusCode: statusCode,
          typeDocument: this.typeDocument,
        },
        tx,
      );

      // Update status
      if (statusCode) {
        await this.sqlRepo.updateDestroyStatusCode(
          record.id,
          statusCode,
          tx,
        );
      }

      await this.sqlRepo.commit(tx);
    } catch (error) {
      await this.sqlRepo.rollback(tx);
      throw error;
    }

    // Cập nhật trạng thái bản ghi sang 2 (Chờ lãnh đạo phê duyệt)
    await this.destroyRecordRepo.update(id, { status: DestroyRecordStatus.WAITING_LEADER });

    if (assigneeUserId) {
      await this.notificationService.createForRecipients({
        recipientIds: [assigneeUserId],
        senderId: originalUserId,
        content: `Đồng chí có yêu cầu tiêu hủy hồ sơ: "${record.destroyBatchName}" cần xử lý`,
        recordId: record.id,
        link: `/destroy-records/${record.id}`,
        key: 'VIEW_RECORD_DESTRUCTION',
        type: NotificationType.ARCHIVE_RECORD_PROCESS_ASSIGNEE.value,
        time: new Date(),
        status: 0,
      });
    }

    return {
      status: true,
      message: 'Trình lãnh đạo thành công',
    };
  }

  async submitLeaderApproveMiningRecords(
    id: string,
    dto: UpdateDestroyRecordDto,
    originalUserId: string,
    author: boolean,
  ) {
    const { workItem, actionCode, assigneeUserId, deadline, noteDetail } = dto;
    const record = await this.destroyRecordRepo.findOne({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException({
        success: false,
        message: 'Không tìm thấy đợt tiêu hủy',
      });
    }

    let workItemId = workItem?.id;
    // Xử lý trường hợp workItem.id là một object
    if (typeof workItemId === 'object' && workItemId !== null) {
      workItemId = (workItemId as any).id;
    }

    if (!workItemId) {
      throw new BadRequestException('WorkItem is required');
    }

    if (!actionCode) {
      throw new BadRequestException('actionCode is required');
    }

    // 2. Load BPMN
    const bpmnXML = await this.sqlRepo.getBpmnFile(record.bpmnVersion);
    if (!bpmnXML) {
      throw new BadRequestException('Không tìm thấy BPMN');
    }

    const { indexes } =
      await this.runtimeDbService.getModelFromXml(bpmnXML);

    // 3. Lấy workItem hiện tại
    const wi = await this.sqlRepo.getWorkItem(record.id, workItemId);

    if (!wi) {
      throw new BadRequestException(
        'WorkItem not found or already completed',
      );
    }

    // 4. Node hiện tại
    const currentNode = indexes.nodes.get(wi.nodeId);
    if (!currentNode) {
      throw new BadRequestException(
        'Current BPMN node not found',
      );
    }

    // 5. Tìm outgoing flow theo actionCode
    const outs =
      indexes.outgoingBySource.get(currentNode.id) || [];

    const flow = outs.find((f: any) => {
      const ext = getAllNodeExtensionProperties(f);
      return (
        (ext?.actionCode &&
          ext.actionCode.toUpperCase() === actionCode.toUpperCase()) ||
        (f.name &&
          f.name.toUpperCase() === actionCode.toUpperCase()) ||
        f.id === actionCode
      );
    });

    if (!flow) {
      throw new BadRequestException(
        `No outgoing flow matches actionCode ${actionCode}`,
      );
    }

    // 6. Resolve next interactive node
    const { node: nextNode } =
      this.bpmnEngine.nextInteractiveFromFlow(
        flow,
        indexes,
      );

    if (!nextNode) {
      throw new BadRequestException(
        'No next interactive node found',
      );
    }

    // 7. Resolve role & status
    const targetRole = indexes.laneMap.get(nextNode.id);
    if (!targetRole) {
      throw new BadRequestException(
        'Target role not found for next node',
      );
    }

    const attributes =
      getAllNodeExtensionProperties(nextNode) || {};

    const statusCode = attributes.statusCode || undefined;
    const statusName =
      attributes.statusName || 'Phê duyệt';

    const effectiveUserId = author || originalUserId;
    const effectiveDisplayName = 'Lãnh đạo đơn vị';

    // 8. Transaction
    const tx = await this.sqlRepo.begin();

    try {
      // Remove current workItem
      await this.sqlRepo.removeWorkItem(
        record.id,
        wi.id,
        tx,
      );

      // Add next workItem
      await this.sqlRepo.addWorkItem(
        record.id,
        {
          id: `wi_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 8)}`,
          nodeId: nextNode.id,
          role: targetRole,
          assigneeUserId: assigneeUserId,
          nodeType: nextNode.$type,
        },
        tx,
        record.bpmnVersion,
      );

      // Update stage audit
      await this.sqlRepo.updateStageStatusAudit(
        record.id,
        {
          receiver: effectiveUserId,
          stage_status: stageStatusArchire.DA_XU_LY,
        },
        tx,
      );

      // Add audit
      await this.sqlRepo.addAudit(
        record.id,
        {
          user_id: effectiveUserId,
          display_name: effectiveDisplayName,
          role: wi.role,
          action_code: actionCode,
          from_node_id: wi.nodeId,
          to_node_id: nextNode.id,
          receiver: assigneeUserId,
          receiver_unit: null,
          group_: null,
          roleProcess: 'processor',
          action: statusName,
          created_by: effectiveUserId,
          stage_status: stageStatusArchire.CHUA_XU_LY,
          origin_id: wi.id,
          deadline: deadline || null,
          created_at: new Date(),
          updated_at: new Date(),
          details: noteDetail ?? 'Lãnh đạo phê duyệt',
          curStatusCode: statusCode,
          typeDocument: this.typeDocument,
        },
        tx,
      );

      // Update status
      if (statusCode) {
        await this.sqlRepo.updateDestroyStatusCode(
          record.id,
          statusCode,
          tx,
        );
      }

      await this.sqlRepo.commit(tx);
    } catch (error) {
      await this.sqlRepo.rollback(tx);
      throw error;
    }

    // Cập nhật trạng thái bản ghi sang 3 (Đã phê duyệt - Chờ tiêu hủy)
    await this.destroyRecordRepo.update(id, { status: DestroyRecordStatus.WAITING_DESTRUCTION, statusCode: '3' });

     if (assigneeUserId) {
      await this.notificationService.createForRecipients({
        recipientIds: [assigneeUserId],
        senderId: originalUserId,
        content: `Đã phê duyệt đợt tiêu hủy hồ sơ: "${record.destroyBatchName}". Vui lòng thực hiện tiêu hủy.`,
        recordId: record.id,
        link: `/destroy-records/${record.id}`,
        key: 'VIEW_RECORD_DESTRUCTION',
        type: NotificationType.ARCHIVE_RECORD_PROCESS_ASSIGNEE.value,
        time: new Date(),
        status: 0,
      });
    }

    return {
      status: true,
      message: 'Phê duyệt thành công',
    };
  }
  /**
   * Helper: Đọc Extension Properties từ một node trong BPMN
   */
  private getAllNodeExtensionProperties(node: any): Record<string, any> {
    const result: Record<string, any> = {};
    if (!node) return result;
    try {
      // 1. Quét extensionElements (hỗ trợ cả values và $children)
      const extensionElements = node.extensionElements;
      if (extensionElements) {
        const extValues = extensionElements.values || extensionElements.$children || [];
        for (const ext of extValues) {
          // Kiểm tra type không phân biệt hoa thường (camunda:Properties hoặc camunda:properties)
          const type = (ext.$type || '').toLowerCase();
          if (type.includes('properties')) {
            const props = ext.values || ext.$children || [];
            for (const p of props) {
              if (p && p.name) {
                result[p.name] = p.value;
              }
            }
          }
        }
      }
      // 2. Fallback: Nếu có actionCode trực tiếp trong $attrs (một số engine moddle parse thẳng)
      if (node.$attrs) {
        for (const key in node.$attrs) {
          const lowerKey = key.toLowerCase();
          if (lowerKey.includes('actioncode')) result.actionCode = node.$attrs[key];
          if (lowerKey.includes('actionlabel')) result.actionLabel = node.$attrs[key];
        }
      }
    } catch (e) {
      this.logger.error('Error parsing extension properties', e);
    }
    return result;
  }

  async update(id: string, data: UpdateDestroyRecordDto) {
    const record = await this.findOne(id);
    const oldBatchCode = record.destroyBatchCode;

    // Tự động tính lại tổng số hồ sơ nếu có gửi profileIds
    if (data.profileIds && Array.isArray(data.profileIds)) {
      data.totalDestroyedRecords = data.profileIds.length;
    }

    // Loại bỏ status và statusCode khỏi dữ liệu cập nhật để giữ nguyên trạng thái cũ
    // Tránh việc giao diện gửi ngược lại chuỗi HTML vào DB
    delete (data as any).status;
    delete (data as any).statusCode;

    this.destroyRecordRepo.merge(record, data);
    const savedRecord = await this.destroyRecordRepo.save(record);

    // Comment lại đoạn code gây lỗi DB để hệ thống hoạt động bình thường
    /*
    if (data.profileIds && Array.isArray(data.profileIds)) {
      await this.archivesRepo.update(
        { destroyBatchCode: oldBatchCode },
        { destroyBatchCode: null },
      );

      const archiveIds = data.profileIds
        .map((id) => Number(id))
        .filter((id) => !isNaN(id));

      if (archiveIds.length > 0) {
        await this.archivesRepo.update(
          { id: In(archiveIds) },
          { destroyBatchCode: savedRecord.destroyBatchCode },
        );
      }
    } else if (data.destroyBatchCode && data.destroyBatchCode !== oldBatchCode) {
      await this.archivesRepo.update(
        { destroyBatchCode: oldBatchCode },
        { destroyBatchCode: savedRecord.destroyBatchCode },
      );
    }
    */

    return savedRecord;
  }

  async remove(id: string) {
    const record = await this.destroyRecordRepo.findOneBy({ id });
    if (!record) {
      throw new NotFoundException(`Không tìm thấy bản ghi với ID: ${id}`);
    }

    if (record.status !== DestroyRecordStatus.DRAFT) {
      throw new BadRequestException('Chỉ được xóa bản ghi ở trạng thái Chưa trình');
    }

    // Gỡ lô tiêu hủy khỏi các hồ sơ liên quan trước khi xóa
    if (record.profileIds && record.profileIds.length > 0) {
      const archiveIds = record.profileIds.map((pid) => Number(pid)).filter((pid) => !isNaN(pid));
      if (archiveIds.length > 0) {
        await this.archivesRepo.update({ id: In(archiveIds) }, { destroyBatchCode: null });
      }
    }

    return await this.destroyRecordRepo.remove(record);
  }

  async removeMany(ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('Danh sách ID trống');
    }

    const records = await this.destroyRecordRepo.find({
      where: { id: In(ids) },
    });

    if (!records || records.length === 0) {
      throw new NotFoundException('Không tìm thấy bản ghi nào để xóa');
    }

    // Lọc ra các bản ghi có thể xóa (chỉ status '0' - Chưa trình)
    const validRecords = records.filter((r) => r.status === DestroyRecordStatus.DRAFT);

    if (validRecords.length === 0) {
      throw new BadRequestException(
        `Chỉ được xóa bản ghi ở trạng thái Chưa trình`,
      );
    }

    // Gỡ lô tiêu hủy khỏi các hồ sơ liên quan trước khi xóa
    for (const record of validRecords) {
      if (record.profileIds && record.profileIds.length > 0) {
        const archiveIds = record.profileIds.map((pid) => Number(pid)).filter((pid) => !isNaN(pid));
        if (archiveIds.length > 0) {
          await this.archivesRepo.update({ id: In(archiveIds) }, { destroyBatchCode: null });
        }
      }
    }

    await this.destroyRecordRepo.remove(validRecords);
    return {
      success: true,
      message: `Đã xóa thành công ${validRecords.length} bản ghi chưa trình.`,
      deletedCount: validRecords.length,
    };
  }
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

  // Lấy các nút để hiển thị
  async getActionAvailableByUser(userId: string, roleCache?: Map<string, any>) {
    const cache = roleCache || new Map();

    // 1️⃣ Lấy user
    const userKey = `__user_${userId}`;
    let user = cache.get(userKey);
    if (!user) {
      user = await this.sqlsvRepo.getUserById(userId);
      if (user) cache.set(userKey, user);
    }
    if (!user?.parent?.id) return [];

    // 2️⃣ Lấy flow
    const unitId = String(user.parent.id);
    const flowKey = `__flow_${unitId}`;
    let flow = cache.get(flowKey);
    if (!flow) {
      flow = await this.sqlsvRepo.getFlowByUnit(unitId, 'DestructionProcess');
      if (flow) cache.set(flowKey, flow);
    }
    if (!flow?.id) return [];

    // 3️⃣ Get BPMN model
    const bpmnKey = `__bpmn_${flow.id}`;
    let model = cache.get(bpmnKey);
    if (!model) {
      const bpmnXML = await this.sqlRepo.getBpmnFile(flow.id);
      if (!bpmnXML) return [];
      model = await this.runtimeDbService.getModelFromXml(bpmnXML);
      cache.set(bpmnKey, model);
    }
    const { process, indexes } = model;

    // 4️⃣ Resolve role
    const roleKey = `__role_${flow.id}_${userId}`;
    let role = cache.get(roleKey);
    if (role === undefined) {
      role = await this.sqlsvRepo.getMeInFlow(userId, flow.id);
      cache.set(roleKey, role);
    }
    if (!role) return [];

    // 5️⃣ Find Start Node
    const startEvent = Array.from(indexes.nodes.values())
      .filter((n: any) => n.$type === 'bpmn:StartEvent')
      .find((n: any) => indexes.laneMap.get(n.id) === role) as any;

    if (!startEvent?.outgoing?.length) return [];

    let startNode: any;
    for (const f of startEvent.outgoing) {
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
      role,
      nodeType: startNode.$type,
    };

    // 6️⃣ Compute available actions
    const userRolesKey = `__user_roles_${userId}`;
    let userRoles = cache.get(userRolesKey);
    if (!userRoles) {
      userRoles = (await this.userService.getUserRole(userId))?.roles || [];
      cache.set(userRolesKey, userRoles);
    }

    const res = await this.bpmnEngine.computeAvailableActions({
      process,
      indexes,
      currentNodeId: startNode.id,
      workItem,
      document: null,
      userId,
      userRoles,
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

  // async submit(id: string, userId: string, originalUser: string, payload: any = {}) {
  //   const record = await this.findOne(id, userId);
  //   if (!record) throw new NotFoundException('Không tìm thấy đợt tiêu hủy');

  //   const workItemId = record.workflowContext?.workItemId;
  //   let result;

  //   if (workItemId) {
  //     // Nếu đã có WorkItem (Draft), thực hiện chuyển xử lý (simpleNext manual)
  //     result = await this.manualWorkflowNext(id, workItemId, payload, userId, originalUser);
  //   } else {
  //     // Trường hợp dự phòng nếu chưa có WorkItem
  //     const processKey = record.bpmnVersion || 'thhs';
  //     const bpmnXML = await this.sqlRepo.getBpmnFile(processKey);
  //     result = await this.runtimeDbService.startProcess({
  //       bpmnXML,
  //       processKey,
  //       businessKey: id,
  //       variables: {
  //         destroyBatchCode: record.destroyBatchCode,
  //         totalRecords: record.totalDestroyedRecords,
  //         nextUserId: payload.nextUserId || payload.assigneeUserId,
  //         ...payload,
  //       },
  //       userId,
  //       originalUser,
  //       typeDocument: 'destroy_records',
  //     });
  //   }

  //   // Cập nhật trạng thái đợt tiêu hủy dựa trên kết quả workflow
  //   if (result.role === 'LANH_DAO' || payload.actionCode === 'CHP_PHE_DUYET_HHS') {
  //     record.status = '2'; // 2: Chờ Ban lãnh đạo phê duyệt
  //   } else {
  //     record.status = '1'; // 1: Chờ văn phòng phê duyệt (Văn thư)
  //   }
  //   await this.destroyRecordRepo.save(record);

  //   return result;
  // }

  /**
   * Hàm chuyên biệt xử lý phê duyệt đợt tiêu hủy (Approve/Forward)
   */
  async approveNext(id: string, workItemId: string, payload: WorkflowPayload, userId: string, originalUser: string, targetStatus = 'CHUA_XU_LY') {
    const { actionCode } = payload;
    const actionCodeUpper = actionCode?.toUpperCase();

    // 1. Thực hiện chuyển bước workflow (tìm người trong luồng & tạo WorkItem)
    const result = await this.manualWorkflowNext(id, workItemId, payload, userId, originalUser, false, targetStatus);

    // 2. Cập nhật trạng thái hiển thị của bản ghi tùy theo cấp phê duyệt
    if (actionCodeUpper === 'CHP_PHE_DUYET_HHS') {
      await this.destroyRecordRepo.update(id, { status: DestroyRecordStatus.WAITING_LEADER });
    } else if (actionCodeUpper === 'BLD_PHE_DUYET_HHS') {
      await this.destroyRecordRepo.update(id, { status: DestroyRecordStatus.WAITING_DESTRUCTION });
    }

    return result;
  }

  /**
   * Phê duyệt đợt tiêu hủy từ cấp Ban lãnh đạo (Leader Approve)
   */
  async leaderApproveNext(id: string, workItemId: string, payload: WorkflowPayload, userId: string, originalUser: string) {
    // 1. Thực hiện phê duyệt và chuyển bước với trạng thái 'PHE_DUYET' để người khai thác thấy ở tab Approved
    const result = await this.approveNext(id, workItemId, payload, userId, originalUser, 'PHE_DUYET');

    // 2. Đảm bảo trạng thái được chuyển sang 'Chờ thực hiện tiêu hủy' (3)
    // Trường hợp actionCode không khớp với mã cứng, ta vẫn chủ động ép trạng thái nếu là BLD phê duyệt
    const record = await this.destroyRecordRepo.findOneBy({ id });
    if (record && record.status !== DestroyRecordStatus.WAITING_DESTRUCTION) {
      await this.destroyRecordRepo.update(id, {
        status: DestroyRecordStatus.WAITING_DESTRUCTION,
        statusCode: '3'
      });
    }

    return result;
  }

  async simpleNext(id: string, workItemId: string, payload: WorkflowPayload, userId: string, originalUser: string) {
    const actionCode = payload.actionCode?.toUpperCase();

    // Nhận diện hành động trả lại/từ chối
    const isReject = actionCode?.includes('TU_CHOI') || actionCode?.includes('TRA_LAI');

    if (isReject) {
      return this.rejectNext(id, workItemId, payload, userId, originalUser);
    }

    // Mặc định các hành động khác coi như là phê duyệt/tiến tới
    return this.approveNext(id, workItemId, payload, userId, originalUser);
  }

  /**
   * Trả lại đợt tiêu hủy từ cấp Ban lãnh đạo (Leader Reject)
   */
  async leaderRejectNext(id: string, workItemId: string, payload: WorkflowPayload, userId: string, originalUser: string) {
    // Gọi logic trả lại chung
    const result = await this.rejectNext(id, workItemId, payload, userId, originalUser);

    // Đảm bảo trạng thái luôn được cập nhật về LEADER_REJECTED (7)
    await this.destroyRecordRepo.update(id, {
      status: DestroyRecordStatus.LEADER_REJECTED,
      statusCode: '7',
    });

    return result;
  }

  /**
   * Hàm chuyên biệt xử lý trả lại đợt tiêu hủy (Reject/Return)
   * Tương tự logic leaderRejectMiningRecords bên RecordExploitation
   */
  async rejectNext(id: string, workItemId: string, payload: WorkflowPayload, userId: string, originalUser: string) {
    const { actionCode, noteDetail } = payload;

    // 1. Lấy thông tin đợt tiêu hủy
    const record = await this.destroyRecordRepo.findOneBy({ id });
    if (!record) throw new NotFoundException('Không tìm thấy đợt tiêu hủy');

    // 2. Lấy WorkItem hiện tại
    const wi = await this.sqlRepo.getWorkItem(id, workItemId);
    if (!wi) throw new BadRequestException('WorkItem không tồn tại hoặc đã hoàn thành');

    // 3. Load BPMN và tìm luồng trả lại
    const bpmnXML = await this.sqlRepo.getBpmnFile(record.bpmnVersion || 'thhs');
    const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);
    const node = indexes.nodes.get(wi.nodeId);
    if (!node) throw new BadRequestException('BPMN node không tồn tại');

    const outs = indexes.outgoingBySource.get(node.id) || [];

    const findFlowMatch = (flowList: any[]) => {
      return flowList.find((f: any) => {
        const ext = this.getAllNodeExtensionProperties(f);
        const directCode = f.actionCode || f.$attrs?.actionCode || f.ext?.actionCode;
        const targetCode = (ext?.actionCode || directCode || '').toUpperCase();
        const targetName = (f.name || f.$attrs?.name || '').toUpperCase();
        const targetId = (f.id || '').toUpperCase();
        const searchCode = (actionCode || '').toUpperCase();
        return targetCode === searchCode || targetName === searchCode || targetId === searchCode;
      });
    };

    // Bước 1: Thử tìm luồng trực tiếp từ node hiện tại (đây là cách submitleadersMiningRecords làm)
    let flow = findFlowMatch(outs);

    // Bước 2: Nếu chưa thấy, thử tìm qua các Gateway trung gian (đây là cách leaderRejectMiningRecords làm)
    if (!flow && node.$type !== 'bpmn:ExclusiveGateway' && node.$type !== 'bpmn:InclusiveGateway') {
      for (const f of outs) {
        const target = f.targetRef;
        if (target && (target.$type === 'bpmn:ExclusiveGateway' || target.$type === 'bpmn:InclusiveGateway')) {
          const gatewayOuts = indexes.outgoingBySource.get(target.id) || [];
          flow = findFlowMatch(gatewayOuts);
          if (flow) break;
        }
      }
    }

    // Nếu vẫn không tìm thấy chính xác, thử tìm fallback theo từ khóa "TU_CHOI/TRA_LAI"
    if (!flow) {
      const fallbackSearch = (flowList: any[]) => {
        return flowList.find((f: any) => {
          const name = (f.name || f.$attrs?.name || '').toUpperCase();
          const ext = this.getAllNodeExtensionProperties(f);
          const extCode = (ext?.actionCode || '').toUpperCase();
          const directCode = (f.actionCode || f.$attrs?.actionCode || f.ext?.actionCode || '').toUpperCase();
          return name.includes('TRA_LAI') || name.includes('TU_CHOI') ||
            extCode.includes('TRA_LAI') || extCode.includes('TU_CHOI') ||
            directCode.includes('TRA_LAI') || directCode.includes('TU_CHOI');
        });
      };

      flow = fallbackSearch(outs);
      if (!flow && node.$type !== 'bpmn:ExclusiveGateway' && node.$type !== 'bpmn:InclusiveGateway') {
        for (const f of outs) {
          const target = f.targetRef;
          if (target && (target.$type === 'bpmn:ExclusiveGateway' || target.$type === 'bpmn:InclusiveGateway')) {
            const gatewayOuts = indexes.outgoingBySource.get(target.id) || [];
            flow = fallbackSearch(gatewayOuts);
            if (flow) break;
          }
        }
      }
    }

    if (!flow) {
      // Log danh sách các luồng hợp lệ đang có tại node này để debug chính xác
      const available = outs.map(f => {
        const e = this.getAllNodeExtensionProperties(f);
        return `{id: ${f.id}, name: ${f.name}, actionCode: ${e.actionCode || 'null'}}`;
      });
      this.logger.error(`Không tìm thấy luồng. Tại node ${wi.nodeId} có các luồng đi ra: ${available.join(', ')}`);
      throw new BadRequestException(`Không tìm thấy luồng trả lại cho hành động: ${actionCode}`);
    }

    // 4. Xác định node tiếp theo
    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);
    if (!nextNode) throw new BadRequestException('Không tìm thấy node tiếp theo');

    const targetRole = indexes.laneMap.get(nextNode.id);
    const extFlow = this.getAllNodeExtensionProperties(flow);

    // 5. Transaction
    const tx = await this.sqlRepo.begin();
    try {
      // 5.1 Remove current workItem
      const removed = await this.sqlRepo.removeWorkItem(id, wi.id, tx);
      if (removed !== 1) {
        throw new BadRequestException('Work item đã được xử lý bởi người dùng khác');
      }

      // 5.2 Tìm người tạo để trả về
      let creatorId = await this.sqlRepo.findCreatorId(id, tx);
      if (!creatorId) {
        creatorId = record.createdBy; // Fallback về người tạo bản ghi
      }

      // 5.3 Tạo WorkItem mới cho người tạo
      const nextWiId = `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await this.sqlRepo.addWorkItem(id, {
        id: nextWiId,
        nodeId: nextNode.id,
        role: targetRole || 'vt', // Mặc định về văn thư nếu không xác định được role
        assigneeUserId: creatorId,
        nodeType: nextNode.$type,
      }, tx, record.bpmnVersion || 'thhs');

      // 5.4 Cập nhật Stage Status (Đã từ chối)
      await this.sqlRepo.updateStageStatusAudit(id, {
        receiver: userId,
        stage_status: stageStatusArchire.LANH_DAO_TU_CHOI,
        processed_by: userId,
      }, tx);

      // 5.5 Ghi Audit mới cho bước trả về
      await this.sqlRepo.addAudit(id, {
        user_id: userId,
        display_name: null,
        role: wi.role,
        action_code: actionCode,
        from_node_id: wi.nodeId,
        to_node_id: nextNode.id,
        receiver: creatorId,
        action: extFlow.statusName || 'Trả lại (Từ chối)',
        created_by: userId,
        stage_status: 'TU_CHOI',
        origin_id: nextWiId,
        deadline: null,
        created_at: new Date(),
        updated_at: new Date(),
        details: { note: noteDetail || 'Trả về người tạo' },
        curStatusCode: DestroyRecordStatus.UNIT_REJECTED,
        typeDocument: this.typeDocument,
      }, tx);

      // 5.6 Cập nhật trạng thái đợt tiêu hủy
      await this.sqlRepo.updateDestroyStatusCode(id, DestroyRecordStatus.UNIT_REJECTED, tx);
      await this.sqlRepo.updateMiningState(id, actionCode || '', tx);

      await this.sqlRepo.commit(tx);

      // Cập nhật trạng thái vào bảng chính để hiển thị trên UI
      await this.destroyRecordRepo.update(id, {
        status: DestroyRecordStatus.UNIT_REJECTED,
        statusCode: (extFlow.statusCode || '6').toString()
      });

      if (creatorId) {
        await this.notificationService.createForRecipients({
          recipientIds: [creatorId],
          senderId: userId,
          content: `Yêu cầu tiêu hủy hồ sơ: "${record.destroyBatchName}" bị từ chối`,
          recordId: record.id,
          link: `/destroy-records/${record.id}`,
          key: 'VIEW_RECORD_DESTRUCTION',
          type: NotificationType.ARCHIVE_RECORD_RETURNED.value,
          time: new Date(),
          status: 0,
        });
      }
      return {
        success: true,
        message: 'Trả lại đợt tiêu hủy thành công',
        workItemId: nextWiId,
      };
    } catch (e) {
      await this.sqlRepo.rollback(tx);
      throw e;
    }
  }

  /**
   * Văn thư thực hiện tiêu hủy hồ sơ (Clerical Execute)
   * Đây là bước cuối cùng để hoàn thành quy trình
   */
  async clericalExecuteDestruction(id: string, workItemId: string, payload: WorkflowPayload, userId: string, originalUser: string) {
    const { actionCode } = payload;

    // 1. Lấy thông tin đợt tiêu hủy (Dùng findOne để lấy đầy đủ profileIds)
    const record = await this.destroyRecordRepo.findOneBy({ id });
    if (!record) throw new NotFoundException('Không tìm thấy đợt tiêu hủy');

    // 2. Kết thúc workflow (chuyển tới EndEvent)
    const result = await this.manualWorkflowNext(id, workItemId, payload, userId, originalUser, true, 'HOAN_THANH');

    // 3. Thực hiện tiêu hủy các hồ sơ lưu trữ liên quan
    if (record.profileIds && record.profileIds.length > 0) {
      const profileIds = record.profileIds;
      const archiveIds = profileIds.filter(pid => !isNaN(Number(pid))).map(pid => Number(pid));
      const archiveRecordIds = profileIds.filter(pid => isNaN(Number(pid)));

      if (archiveIds.length > 0) {
        await this.archivesRepo.update(
          { id: In(archiveIds) },
          {
            status: 0, // 0: Đã tiêu hủy/xóa
            archivesStatus: 'Đã tiêu hủy',
            archivesNote: `Đã tiêu hủy theo đợt ${record.destroyBatchCode} bởi ${userId}`
          }
        );
      }

      if (archiveRecordIds.length > 0) {
        // 1. Soft delete tất cả tài liệu (items) trong các hồ sơ này
        await this.archiveRecordItemRepo.update(
          { archiveRecordId: In(archiveRecordIds) },
          { status: 0 }
        );

        // 2. Chuyển trạng thái hồ sơ thành 'Đã tiêu hủy' (3) nhưng hồ sơ sẽ trống vì items đã bị soft delete
        await this.archiveRecordRepo.update(
          { id: In(archiveRecordIds) },
          {
            recordState: 3, // 3: Đã tiêu hủy
            notes: `Đã tiêu hủy toàn bộ tài liệu theo đợt ${record.destroyBatchCode} bởi ${userId}`
          }
        );
      }
    }

    // 4. Cập nhật trạng thái đợt tiêu hủy thành Hoàn thành (5)
    await this.destroyRecordRepo.update(id, {
      status: DestroyRecordStatus.COMPLETED,
      statusCode: '5'
    });

    // Cập nhật mining state nếu có actionCode
    if (actionCode) {
      await this.sqlRepo.updateMiningState(id, actionCode, undefined);
    }

    return result;
  }

  async executeDestruction(id: string, workItemId: string, payload: WorkflowPayload, userId: string, originalUser: string) {
    const record = await this.findOne(id, userId);
    if (!record) throw new NotFoundException('Không tìm thấy đợt tiêu hủy');

    // Thực hiện chuyển xử lý workflow trước
    const result = await this.manualWorkflowNext(id, workItemId, payload, userId, originalUser, true);

    // Thực hiện xóa/cập nhật hồ sơ thực tế
    if (record.profileIds && record.profileIds.length > 0) {
      const profileIds = record.profileIds;
      const archiveIds = profileIds.filter(pid => !isNaN(Number(pid))).map(pid => Number(pid));
      const archiveRecordIds = profileIds.filter(pid => isNaN(Number(pid)));

      if (archiveIds.length > 0) {
        await this.archivesRepo.update(
          { id: In(archiveIds) },
          {
            status: 0, // 0: đã xóa/tiêu hủy
            archivesStatus: 'Đã tiêu hủy',
            archivesNote: `Đã tiêu hủy theo đợt ${record.destroyBatchCode} bởi ${userId}`
          }
        );
      }

      if (archiveRecordIds.length > 0) {
        // Soft delete tất cả tài liệu (items) trong các hồ sơ này
        await this.archiveRecordItemRepo.update(
          { archiveRecordId: In(archiveRecordIds) },
          { status: 0 }
        );

        await this.archiveRecordRepo.update(
          { id: In(archiveRecordIds) },
          {
            recordState: 3, // 3: Đã tiêu hủy
            notes: `Đã tiêu hủy toàn bộ tài liệu theo đợt ${record.destroyBatchCode} bởi ${userId}`
          }
        );
      }
    }

    // Cập nhật trạng thái cuối cùng
    record.status = '5'; // 5: Hoàn thành
    await this.destroyRecordRepo.save(record);

    return result;
  }

  /**
   * Helper xử lý chuyển bước workflow thủ công (Manual Workflow Transition)
   * Tương tự logic bên Record Exploitation để đảm bảo Audit log và Receiver chính xác
   */
  private async manualWorkflowNext(
    id: string,
    workItemId: string,
    payload: any,
    userId: string,
    originalUser: string,
    isComplete = false,
    nextStageStatus?: string,
  ) {
    const { actionCode, assigneeUserId, noteDetail, deadline } = payload;

    // 1. Lấy thông tin bản ghi và BPMN
    const record = await this.destroyRecordRepo.findOneBy({ id });
    if (!record) throw new NotFoundException('Không tìm thấy đợt tiêu hủy');
    const processKey = 'thhs';
    const bpmnXML = await this.sqlRepo.getBpmnFile(processKey);
    const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);

    // 2. Lấy WorkItem hiện tại
    const wi = await this.sqlRepo.getWorkItem(id, workItemId);
    if (!wi) throw new BadRequestException('WorkItem không tồn tại hoặc đã hoàn thành');

    const node = indexes.nodes.get(wi.nodeId);
    if (!node) throw new BadRequestException('BPMN Node không tồn tại');

    const findFlowMatch = (flowList: any[]) => {
      return flowList.find((f: any) => {
        const ext = this.getAllNodeExtensionProperties(f);
        const directCode = f.actionCode || f.$attrs?.actionCode || f.ext?.actionCode;
        const targetCode = (ext?.actionCode || directCode || '').toUpperCase();
        const targetName = (f.name || f.$attrs?.name || '').toUpperCase();
        const targetId = (f.id || '').toUpperCase();
        const searchCode = (actionCode || '').toUpperCase();
        return targetCode === searchCode || targetName === searchCode || targetId === searchCode;
      });
    };

    // 3. Tìm luồng đi (Flow)
    const outs = indexes.outgoingBySource.get(node.id) || [];

    // Bước 1: Thử tìm luồng trực tiếp từ node hiện tại
    let flow = findFlowMatch(outs);

    // Bước 2: Nếu chưa thấy, thử tìm qua các Gateway trung gian
    if (!flow) {
      for (const f of outs) {
        const target = f.targetRef;
        if (target && (target.$type === 'bpmn:ExclusiveGateway' || target.$type === 'bpmn:InclusiveGateway')) {
          const gatewayOuts = indexes.outgoingBySource.get(target.id) || [];
          flow = findFlowMatch(gatewayOuts);
          if (flow) break;
        }
      }
    }

    if (!flow && !isComplete) {
      this.logger.error(`Không tìm thấy luồng cho actionCode: ${actionCode} tại node: ${wi.nodeId}`);
      throw new BadRequestException(`Không tìm thấy luồng cho hành động: ${actionCode}`);
    }

    // 4. Xác định node tiếp theo
    let nextNode: any;
    let targetRole = '';
    if (isComplete) {
      // Nếu là bước cuối (EndEvent)
      nextNode = Array.from(indexes.nodes.values()).find((n: any) => n.$type === 'bpmn:EndEvent');
      targetRole = 'DONE';
    } else {
      const nextRes = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);
      nextNode = nextRes.node;
      targetRole = indexes.laneMap.get(nextNode.id) || 'vt';
    }

    // 4.1 Giải quyết danh sách người nhận (nếu không có assigneeUserId)
    let finalAssignees: string[] = [];
    if (assigneeUserId) {
      finalAssignees = [assigneeUserId];
    } else if (!isComplete && targetRole) {
      const listUsers = await this.sqlsvRepo.getUsersInFlow(
        record.bpmnVersion || 'thhs',
        targetRole,
        100,
        1,
        userId,
      );
      const matchedUsers = listUsers.usersWithType || [];
      finalAssignees = matchedUsers.map((u: any) => u._id.toString());
    }

    if (!isComplete && finalAssignees.length === 0) {
      throw new BadRequestException(`Không tìm thấy người dùng phù hợp cho vai trò: ${targetRole}`);
    }

    const tx = await this.sqlRepo.begin();
    try {
      // 5. Kết thúc WorkItem hiện tại
      await this.sqlRepo.removeWorkItem(id, wi.id, tx);

      // 6. Tạo WorkItem mới cho tất cả người nhận
      let lastNextWiId: string | null = null;
      if (!isComplete && nextNode) {
        for (const receiverId of finalAssignees) {
          const nextWiId = `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          lastNextWiId = nextWiId;
          await this.sqlRepo.addWorkItem(id, {
            id: nextWiId,
            nodeId: nextNode.id,
            role: targetRole,
            assigneeUserId: receiverId,
            nodeType: nextNode.$type,
          }, tx, record.bpmnVersion || 'thhs');
        }
      }

      // 7. Cập nhật Audit Log cho bước vừa xong
      await this.sqlRepo.updateStageStatusAudit(id, {
        receiver: userId,
        stage_status: 'DA_XU_LY',
      }, tx);

      // 8. Thêm Audit Log cho bước tiếp theo
      const extFlow = this.getAllNodeExtensionProperties(flow || {});
      await this.sqlRepo.addAudit(id, {
        user_id: userId,
        display_name: null,
        role: wi.role,
        action_code: actionCode || 'COMPLETE',
        from_node_id: wi.nodeId,
        to_node_id: nextNode?.id || 'END',
        receiver: isComplete ? null : (finalAssignees[0] || userId),
        action: extFlow.statusName || (isComplete ? 'Hoàn thành' : 'Phê duyệt'),
        created_by: userId,
        stage_status: nextStageStatus || (isComplete ? 'HOAN_THANH' : 'CHUA_XU_LY'),
        origin_id: lastNextWiId || wi.id,
        deadline: deadline || null,
        created_at: new Date(),
        updated_at: new Date(),
        details: { note: noteDetail || '' },
        curStatusCode: extFlow.statusCode || record.status,
        typeDocument: this.typeDocument || 'DestructionProcess',
      }, tx);

      // 8.1 Cập nhật mã trạng thái nghiệp vụ nếu có
      if (extFlow.statusCode) {
        await this.sqlRepo.updateDestroyStatusCode(id, extFlow.statusCode, tx);
        await this.sqlRepo.updateMiningState(id, actionCode, tx);
      }
      const creator = await this.sqlRepo.findCreatorId(record.id, tx);
      await this.sqlRepo.commit(tx);

      if (!isComplete && finalAssignees.length) {
        await this.notificationService.createForRecipients({
          recipientIds: finalAssignees,
          senderId: userId,
          content: `Đồng chí có yêu cầu tiêu hủy hồ sơ: "${record.destroyBatchName}" cần xử lý`,
          recordId: record.id,
          link: `/destroy-records/${record.id}`,
          key: 'VIEW_RECORD_DESTRUCTION',
          type: NotificationType.ARCHIVE_RECORD_PROCESS_ASSIGNEE.value,
          time: new Date(),
          status: 0,
        });
      }
      if (isComplete && creator) {
        await this.notificationService.createForRecipients({
          recipientIds: [creator],
          senderId: userId,
          content: `Yêu cầu tiêu hủy hồ sơ: "${record.destroyBatchName}" đã hoàn thành`,
          recordId: record.id,
          link: `/destroy-records/${record.id}`,
          key: 'VIEW_RECORD_DESTRUCTION',
          type: NotificationType.ARCHIVE_RECORD_COMPLETE.value,
          time: new Date(),
          status: 0,
        });
      }

      
      return {
        success: true,
        workItemId: lastNextWiId,
        role: targetRole,
        nextNodeId: nextNode?.id,
      };
    } catch (e) {
      await this.sqlRepo.rollback(tx);
      throw e;
    }
  }
  // Danh sách yêu cầu tiêu hủy hồ sơ - Người yêu cầu
  async listRecordExploitationRequests(
    query: UpdateDestroyRecordDto,
    userId: string,
    authorId?: string,
  ) {
    const {
      type,
      page = 1,
      limit = 20,
      filter,
      sort,
      processFn,
      authority,
      isExport,
    } = query;

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const [pool, featureManagement] = await Promise.all([
      this.getPool(),
      this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      }),
    ]);

    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const {
      sql: filterFeature,
      joins: filterJoins,
      from,
    } = buildRecordExploitationRequestssCriteriaHelper(
      [...featureCriteria, ...criteria],
      'destroy_records',
      featureManagement,
    );

    const TYPES = ['all', 'daft', 'draft', 'waiting', 'refuse', 'approved', 'complete', 'refure'];

    if (!type || !TYPES.includes(type)) {
      throw new BadRequestException('Type không hợp lệ');
    }

    const where: string[] = [];
    let joinClause = filterJoins || '';

    if (type !== 'daft' && type !== 'draft') {
      joinClause += `
        LEFT JOIN (
          SELECT DISTINCT document_id
          FROM ${this.dbname}.audit WITH (NOLOCK)
          WHERE type_document IN ('DestructionProcess', 'destroy_records', 'DestroyRecord')
            AND (receiver = @userId OR processed_by = @userId)
        ) related_audit ON related_audit.document_id = CAST(${from}.id AS NVARCHAR(64))
      `;
    }

    const relatedCondition = `
      (
        ${from}.created_by = @userId
        OR related_audit.document_id IS NOT NULL
      )
    `;

    if (type === 'all') {
      where.push(relatedCondition);
    } else if (type === 'daft' || type === 'draft') {
      where.push(`(${from}.status = '0' AND ${from}.created_by = @userId)`);
    } else if (type === 'waiting') {
      where.push(`${relatedCondition} AND ${from}.status IN ('1', '2')`);
    } else if (type === 'refuse' || type === 'refure') {
      where.push(`${relatedCondition} AND ${from}.status IN ('4', '6', '7')`);
    } else if (type === 'approved') {
      where.push(`${relatedCondition} AND ${from}.status = '3'`);
    } else if (type === 'complete') {
      where.push(`${relatedCondition} AND ${from}.status = '5'`);
    }

    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const whereClause = where.length ? ` WHERE ${where.join(' AND ')}` : '';

    const limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;

    const { dbKeys, aliases } =
      await this.configurationService.buildFilterFieldsRecordExploitationRequests(
        from,
        [],
        processFn,
      );

    const selectFields = dbKeys.join(', ');
    const orderBy =
      ' ORDER BY ' +
      parseSortRecordExploitationRequestss(sort, aliases, from, {});

    const totalSql = `
      SELECT COUNT(*) AS total
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
    `;

    const rowsSql = `
      SELECT ${selectFields}
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
      ${orderBy}
      OFFSET ${offsetNum} ROWS FETCH NEXT ${limitNum} ROWS ONLY
    `;
    const userRoleRes = await this.userService.getUserRole(userId);
    const roles: string[] = userRoleRes?.roles || [];

    try {
      const totalRequest = pool.request().input('userId', userId);
      const rowsRequest = pool.request().input('userId', userId);

      const [totalResult, rowsResult] = await Promise.all([
        totalRequest.query(totalSql),
        rowsRequest.query(rowsSql),
      ]);

      const total = totalResult.recordset[0]?.total ?? 0;
      const items = rowsResult.recordset;

      const dataMapped = await this.mapDocKeyArchiveRecord(
        items,
        aliases,
        isExport,
        'creator',
      );

      await this.attachDestroyWorkflowFields(items, dataMapped, userId, roles);

      // --- LẤY DANH SÁCH VAI TRÒ CỦA USER ĐỂ DÙNG TRONG ENGINE (Chỉ query DB 1 lần) ---
      const user = await this.userrepo.findOne({ where: { id: userId } });
      const userRoles = (user?.rolesByProcess || [])
        .flatMap((p) => (p.roles || []).map((r) => r.roleCode))
        .concat(user?.codeND ? [user.codeND] : []);

      // Cache cấu trúc BPMN XML để tối ưu tốc độ xử lý khi lặp
      const bpmnCache = new Map<string, any>();

      // --- DUYỆT VÀ TÍNH TOÁN WORKFLOW CHO TỪNG BẢN GHI TRONG DANH SÁCH ---
      const finalItems = await Promise.all(
        (dataMapped || []).map(async (item, index) => {
          const rawItem = items[index];
          const rawStatus = rawItem?.status ? String(rawItem.status).trim() : '';
          const isNotEdit = !['0', '4', '6', '7'].includes(rawStatus);

          let workItem = null;
          let availableActions = [];
          let flags: any = {};

          const bpmnVersion = item.bpmnVersion || 'thhs';
          const itemId = item.id || item._id;

          try {
            // Lấy BPMN Model từ cache hoặc DB
            let bpmnModel = bpmnCache.get(bpmnVersion);
            if (!bpmnModel) {
              const bpmnXML = await this.sqlRepo.getBpmnFile(bpmnVersion);
              if (bpmnXML) {
                bpmnModel = await this.runtimeDbService.getModelFromXml(bpmnXML);
                bpmnCache.set(bpmnVersion, bpmnModel);
              }
            }

            if (bpmnModel && itemId) {
              const { process, indexes } = bpmnModel;

              // Lấy audit và các open work items của bản ghi hiện tại
              const [audit, openWorkItems] = await Promise.all([
                this.sqlRepo.getAudit(itemId),
                this.sqlRepo.listOpenWorkItems(itemId),
              ]);

              const perItems: any[] = [];

              for (const wi of openWorkItems) {
                const res = await this.bpmnEngine.computeAvailableActions({
                  process,
                  indexes,
                  currentNodeId: wi.nodeId,
                  workItem: wi,
                  document: item,
                  userId,
                  userRoles: userRoles || [],
                  getUsersByRole: (role) =>
                    this.sqlsvRepo.getUsersByRoleMongoDB(role),
                  audit,
                });

                perItems.push({
                  workItem: wi,
                  node: res.node,
                  availableActions: res.availableActions,
                  flags: res.flags,
                });
              }

              const first = perItems.find((x) =>
                x.availableActions?.some((a: any) => a.canExecute),
              );

              const summary = first || perItems[0] || {
                workItem: null,
                availableActions: [],
                flags: {},
              };

              const summaryFlags = perItems.reduce(
                (acc, x) => ({ ...acc, ...x.flags }),
                {},
              ) as any;

              // Hỗ trợ bổ sung trạng thái chưa trình/trả lại cho người tạo
              if (['0', '6', '7'].includes(rawStatus) && item.createdBy === userId) {
                summaryFlags.canProcess = true;
                if (!summary.availableActions || summary.availableActions.length === 0) {
                  summary.availableActions = [
                    {
                      code: 'VT_TAOMOIVATRINH_TIEUHUY_HOSO',
                      label: 'Trình phê duyệt',
                      canExecute: true,
                      type: 'transfer',
                    },
                  ];
                }
              }

              workItem = summary.workItem;
              availableActions = summary.availableActions;
              flags = summaryFlags;
            }
          } catch (err) {
            this.logger.error(`Lỗi xử lý workflow cho bản ghi ID ${itemId}:`, err);
          }

          return {
            ...item,
            isNotEdit,
            workItem,
            availableActions,
            flags,
          };
        }),
      );

      return {
        success: true,
        items: finalItems,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException(
        'Lỗi truy vấn dữ liệu khai thác hồ sơ',
      );
    }
  }

  // Danh sách yêu cầu tiêu hủy hồ sơ - Lãnh đạo đơn vị
  async listLeaderRecordExploitationRequests(
    query: UpdateDestroyRecordDto,
    userId: string,
    authorId?: string,
  ) {
    const {
      type,
      page = 1,
      limit = 20,
      filter,
      sort,
      processFn,
      authority,
      isExport,
    } = query;

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const [pool, userRoleRes, featureManagement, userRes] =
      await Promise.all([
        this.getPool(),
        this.userService.getUserRole(userId),
        this.featureManagementRepo.findOne({
          where: {
            code: processFn,
            status: 1,
            statusFeature: StatusFeature.ACTIVE,
          },
        }),
        this.userrepo.findOne({
          where: { id: userId },
          relations: ['parent'],
          select: ['id'],
        }),
      ]);

    const { roles } = userRoleRes;
    const receiverUnit = userRes?.parent?.id ?? '';
    const userContext = { userId, roles, receiverUnit };

    const criteria = this.buildCriteria(filter);

    const {
      sql: filterFeature,
      joins: filterJoins,
      from,
    } = buildRecordExploitationRequestssCriteriaHelper(
      criteria,
      'destroy_records',
      featureManagement,
    );

    const TYPES = ['all', 'pending', 'approved', 'processed', 'refuse', 'refure'] as const;

    if (!type || !TYPES.includes(type as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: TYPES,
      });
    }

    const where: string[] = [];

    let joinClause = filterJoins || '';

    if (type === 'pending') {
      joinClause += `
        INNER JOIN (
          SELECT a.document_id
          FROM (
            SELECT 
              document_id,
              stage_status,
              receiver,
              ROW_NUMBER() OVER (PARTITION BY document_id ORDER BY created_at DESC, id DESC) as rn
            FROM ${this.dbname}.audit WITH (NOLOCK)
            WHERE type_document IN ('DestructionProcess', 'destroy_records', 'DestroyRecord')
          ) a
          WHERE a.rn = 1 
            AND a.receiver = @userId 
            AND a.stage_status = 'CHUA_XU_LY'
        ) last_audit ON last_audit.document_id = CAST(${from}.id AS NVARCHAR(64))
      `;
      where.push(`${from}.status IN ('1', '2')`);
    } else if (type === 'approved') {
      joinClause += `
        INNER JOIN (
          SELECT DISTINCT document_id
          FROM ${this.dbname}.audit WITH (NOLOCK)
          WHERE type_document IN ('DestructionProcess', 'destroy_records', 'DestroyRecord')
            AND receiver = @userId
            AND stage_status = 'DA_XU_LY'
        ) processed_docs ON processed_docs.document_id = CAST(${from}.id AS NVARCHAR(64))
      `;
      where.push(`${from}.status = '3'`);
    } else if (type === 'processed') {
      joinClause += `
        INNER JOIN (
          SELECT DISTINCT document_id
          FROM ${this.dbname}.audit WITH (NOLOCK)
          WHERE type_document IN ('DestructionProcess', 'destroy_records', 'DestroyRecord')
            AND receiver = @userId
            AND stage_status = 'DA_XU_LY'
        ) processed_docs ON processed_docs.document_id = CAST(${from}.id AS NVARCHAR(64))
      `;
      where.push(`${from}.status = '5'`);
    } else if (type === 'refuse' || type === 'refure') {
      joinClause += `
        INNER JOIN (
          SELECT DISTINCT document_id
          FROM ${this.dbname}.audit WITH (NOLOCK)
          WHERE type_document IN ('DestructionProcess', 'destroy_records', 'DestroyRecord')
            AND receiver = @userId
        ) processed_docs ON processed_docs.document_id = CAST(${from}.id AS NVARCHAR(64))
      `;
      where.push(`${from}.status IN ('4', '6', '7')`);
    } else if (type === 'all') {
      joinClause += `
        INNER JOIN (
          SELECT DISTINCT document_id
          FROM ${this.dbname}.audit a WITH (NOLOCK)
          WHERE a.type_document IN ('DestructionProcess', 'destroy_records', 'DestroyRecord')
            AND (
              a.receiver = @userId
              OR a.processed_by = @userId
              OR a.user_id = @userId
              OR a.created_by = @userId
            )
        ) relevant_docs ON relevant_docs.document_id = CAST(${from}.id AS NVARCHAR(64))
      `;
    }

    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';

    const limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;

    const { dbKeys, aliases } =
      await this.configurationService.buildFilterFieldsRecordExploitationRequests(
        from,
        [],
        processFn,
      );

    const selectFields = dbKeys.join(', ');
    const orderBy =
      ' ORDER BY ' +
      parseSortRecordExploitationRequestss(sort, aliases, from, {});

    const totalSql = `
        SELECT COUNT(*) AS total
        FROM ${this.dbname}.${from}
        ${joinClause}
        ${whereClause}
      `;

    const rowsSql = `
        SELECT ${selectFields}
        FROM ${this.dbname}.${from}
        ${joinClause}
        ${whereClause}
        ${orderBy}
        OFFSET ${offsetNum} ROWS FETCH NEXT ${limitNum} ROWS ONLY
      `;


    let totalResult, rowsResult;

    try {
      const totalRequest = pool.request().input('userId', userId);
      const rowsRequest = pool.request().input('userId', userId);

      [totalResult, rowsResult] = await Promise.all([
        totalRequest.query(totalSql),
        rowsRequest.query(rowsSql),
      ]);
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException(
        'Lỗi truy vấn dữ liệu khai thác hồ sơ',
      );
    }

    const total = totalResult.recordset[0]?.total ?? 0;
    const items = rowsResult.recordset;
    const dataMapped = await this.mapDocKeyArchiveRecord(items, aliases, isExport, 'leader');

    // --- LẤY DANH SÁCH VAI TRÒ CỦA USER ĐỂ DÙNG TRONG ENGINE ---
    const user = await this.userrepo.findOne({ where: { id: userId } });
    const userRoles = (user?.rolesByProcess || [])
      .flatMap((p) => (p.roles || []).map((r) => r.roleCode))
      .concat(user?.codeND ? [user.codeND] : []);

    const bpmnModelPromises = new Map<string, Promise<any | null>>();
    const documentIds = (dataMapped || [])
      .map((item) => String(item.id || item._id || '').trim())
      .filter(Boolean);
    const [auditByDocumentId, openWorkItems] = await Promise.all([
      this.sqlRepo.getAuditByDocumentIds(documentIds),
      this.sqlRepo.listOpenWorkItemsByIds(documentIds),
    ]);
    const openWorkItemsByDocumentId = new Map<string, any[]>();

    for (const workItem of openWorkItems || []) {
      const key = String(workItem.documentId || '').trim();
      if (!key) continue;
      const current = openWorkItemsByDocumentId.get(key) || [];
      current.push(workItem);
      openWorkItemsByDocumentId.set(key, current);
    }

    const finalItems = await Promise.all(
      (dataMapped || []).map(async (item, index) => {
        const rawItem = items[index];
        const rawStatus = rawItem?.status ? String(rawItem.status).trim() : '';
        const isNotEdit = !['0', '4', '6', '7'].includes(rawStatus);

        let workItem = null;
        let availableActions = [];
        let flags: any = {};

        const bpmnVersion = item.bpmnVersion || 'thhs';
        const itemId = item.id || item._id;

        try {
          let bpmnModelPromise = bpmnModelPromises.get(bpmnVersion);
          if (!bpmnModelPromise) {
            bpmnModelPromise = (async () => {
              const bpmnXML = await this.sqlRepo.getBpmnFile(bpmnVersion);
              if (!bpmnXML) return null;
              return this.runtimeDbService.getModelFromXml(bpmnXML);
            })();
            bpmnModelPromises.set(bpmnVersion, bpmnModelPromise);
          }

          const bpmnModel = await bpmnModelPromise;

          if (bpmnModel && itemId) {
            const { process, indexes } = bpmnModel;
            const docKey = String(itemId).trim();
            const audit = auditByDocumentId[docKey] || [];
            const openWorkItems = openWorkItemsByDocumentId.get(docKey) || [];

            const perItems: any[] = [];

            for (const wi of openWorkItems) {
              const res = await this.bpmnEngine.computeAvailableActions({
                process,
                indexes,
                currentNodeId: wi.nodeId,
                workItem: wi,
                document: item,
                userId,
                userRoles: userRoles || [],
                getUsersByRole: (role) =>
                  this.sqlsvRepo.getUsersByRoleMongoDB(role),
                audit,
              });

              perItems.push({
                workItem: wi,
                node: res.node,
                availableActions: res.availableActions,
                flags: res.flags,
              });
            }

            const first = perItems.find((x) =>
              x.availableActions?.some((a: any) => a.canExecute),
            );

            const summary = first || perItems[0] || {
              workItem: null,
              availableActions: [],
              flags: {},
            };

            const summaryFlags = perItems.reduce(
              (acc, x) => ({ ...acc, ...x.flags }),
              {},
            ) as any;

            if (['0', '6', '7'].includes(rawStatus) && item.createdBy === userId) {
              summaryFlags.canProcess = true;
              if (!summary.availableActions || summary.availableActions.length === 0) {
                summary.availableActions = [
                  {
                    code: 'VT_TAOMOIVATRINH_TIEUHUY_HOSO',
                    label: 'Trình phê duyệt',
                    canExecute: true,
                    type: 'transfer',
                  },
                ];
              }
            }

            workItem = summary.workItem;
            availableActions = summary.availableActions;
            flags = summaryFlags;
          }
        } catch (err) {
          this.logger.error(`Lỗi xử lý workflow cho bản ghi ID ${itemId}:`, err);
        }

        return {
          ...item,
          isNotEdit,
          workItem,
          availableActions,
          flags,
        };
      }),
    );

    return {
      success: true,
      items: finalItems,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  // Danh sách yêu cầu tiêu hủy hồ sơ - Chánh văn phòng
  async listComanderRecordExploitationRequests(
    query: UpdateDestroyRecordDto,
    userId: string,
    authorId?: string,
  ) {
    const {
      type,
      page = 1,
      limit = 20,
      filter,
      sort,
      processFn,
      authority,
      isExport,
    } = query;

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const [pool, userRoleRes, featureManagement, userRes] =
      await Promise.all([
        this.getPool(),
        this.userService.getUserRole(userId),
        this.featureManagementRepo.findOne({
          where: {
            code: processFn,
            status: 1,
            statusFeature: StatusFeature.ACTIVE,
          },
        }),
        this.userrepo.findOne({
          where: { id: userId },
          relations: ['parent'],
          select: ['id'],
        }),
      ]);

    const { roles } = userRoleRes;
    const receiverUnit = userRes?.parent?.id ?? '';
    const userContext = { userId, roles, receiverUnit };

    const criteria = this.buildCriteria(filter);
    const {
      sql: filterFeature,
      joins: filterJoins,
      from,
    } = buildRecordExploitationRequestssCriteriaHelper(
      criteria,
      'destroy_records',
      featureManagement,
    );

    const TYPES = ['all', 'pending', 'processed', 'approved', 'refuse', 'refure'] as const;

    if (!type || !TYPES.includes(type as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: TYPES,
      });
    }

    const where: string[] = [];

    let joinClause = filterJoins || '';

    if (type === 'pending') {
      joinClause += `
        INNER JOIN (
          SELECT a.document_id
          FROM (
            SELECT 
              document_id,
              stage_status,
              receiver,
              ROW_NUMBER() OVER (PARTITION BY document_id ORDER BY created_at DESC, id DESC) as rn
            FROM ${this.dbname}.audit WITH (NOLOCK)
            WHERE type_document IN ('DestructionProcess', 'destroy_records', 'DestroyRecord')
          ) a
          WHERE a.rn = 1 
            AND a.receiver = @userId 
            AND a.stage_status = 'CHUA_XU_LY'
        ) last_audit ON last_audit.document_id = CAST(${from}.id AS NVARCHAR(64))
      `;
      where.push(`${from}.status IN ('1', '2')`);
    } else if (type === 'processed') {
      joinClause += `
        INNER JOIN (
          SELECT DISTINCT document_id
          FROM ${this.dbname}.audit WITH (NOLOCK)
          WHERE type_document IN ('DestructionProcess', 'destroy_records', 'DestroyRecord')
            AND receiver = @userId
            AND stage_status = 'DA_XU_LY'
        ) processed_docs ON processed_docs.document_id = CAST(${from}.id AS NVARCHAR(64))
      `;
      where.push(`${from}.status IN ('2', '3', '4', '5', '6', '7')`);
    } else if (type === 'approved') {
      joinClause += `
        INNER JOIN (
          SELECT DISTINCT document_id
          FROM ${this.dbname}.audit WITH (NOLOCK)
          WHERE type_document IN ('DestructionProcess', 'destroy_records', 'DestroyRecord')
            AND receiver = @userId
            AND stage_status = 'DA_XU_LY'
        ) processed_docs ON processed_docs.document_id = CAST(${from}.id AS NVARCHAR(64))
      `;
      where.push(`${from}.status IN ('2', '3', '5')`);
    } else if (type === 'refuse' || type === 'refure') {
      joinClause += `
        INNER JOIN (
          SELECT DISTINCT document_id
          FROM ${this.dbname}.audit WITH (NOLOCK)
          WHERE type_document IN ('DestructionProcess', 'destroy_records', 'DestroyRecord')
            AND receiver = @userId
        ) processed_docs ON processed_docs.document_id = CAST(${from}.id AS NVARCHAR(64))
      `;
      where.push(`${from}.status IN ('4', '6', '7')`);
    } else if (type === 'all') {
      joinClause += `
        INNER JOIN (
          SELECT DISTINCT document_id
          FROM ${this.dbname}.audit a WITH (NOLOCK)
          WHERE a.type_document IN ('DestructionProcess', 'destroy_records', 'DestroyRecord')
            AND (
              a.receiver = @userId
              OR a.processed_by = @userId
              OR a.user_id = @userId
              OR a.created_by = @userId
            )
        ) relevant_docs ON relevant_docs.document_id = CAST(${from}.id AS NVARCHAR(64))
      `;
    }

    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';

    const limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;

    const { dbKeys, aliases } =
      await this.configurationService.buildFilterFieldsRecordExploitationRequests(
        from,
        [],
        processFn,
      );

    const selectFields = dbKeys.join(', ');
    const orderBy =
      ' ORDER BY ' +
      parseSortRecordExploitationRequestss(sort, aliases, from, {});

    const totalSql = `
        SELECT COUNT(*) AS total
        FROM ${this.dbname}.${from}
        ${joinClause}
        ${whereClause}
      `;

    const rowsSql = `
        SELECT ${selectFields}
        FROM ${this.dbname}.${from}
        ${joinClause}
        ${whereClause}
        ${orderBy}
        OFFSET ${offsetNum} ROWS FETCH NEXT ${limitNum} ROWS ONLY
      `;


    let totalResult, rowsResult;

    try {
      const totalRequest = pool.request().input('userId', userId);
      const rowsRequest = pool.request().input('userId', userId);

      [totalResult, rowsResult] = await Promise.all([
        totalRequest.query(totalSql),
        rowsRequest.query(rowsSql),
      ]);
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException(
        'Lỗi truy vấn dữ liệu khai thác hồ sơ',
      );
    }

    const total = totalResult.recordset[0]?.total ?? 0;
    const items = rowsResult.recordset;
    const dataMapped = await this.mapDocKeyArchiveRecord(items, aliases, isExport, 'commander');

    // --- LẤY DANH SÁCH VAI TRÒ CỦA USER ĐỂ DÙNG TRONG ENGINE ---
    const user = await this.userrepo.findOne({ where: { id: userId } });
    const userRoles = (user?.rolesByProcess || [])
      .flatMap((p) => (p.roles || []).map((r) => r.roleCode))
      .concat(user?.codeND ? [user.codeND] : []);

    const bpmnCache = new Map<string, any>();

    const finalItems = await Promise.all(
      (dataMapped || []).map(async (item, index) => {
        const rawItem = items[index];
        const rawStatus = rawItem?.status ? String(rawItem.status).trim() : '';
        const isNotEdit = !['0', '4', '6', '7'].includes(rawStatus);

        let workItem = null;
        let availableActions = [];
        let flags: any = {};

        const bpmnVersion = item.bpmnVersion || 'thhs';
        const itemId = item.id || item._id;

        try {
          let bpmnModel = bpmnCache.get(bpmnVersion);
          if (!bpmnModel) {
            const bpmnXML = await this.sqlRepo.getBpmnFile(bpmnVersion);
            if (bpmnXML) {
              bpmnModel = await this.runtimeDbService.getModelFromXml(bpmnXML);
              bpmnCache.set(bpmnVersion, bpmnModel);
            }
          }

          if (bpmnModel && itemId) {
            const { process, indexes } = bpmnModel;

            const [audit, openWorkItems] = await Promise.all([
              this.sqlRepo.getAudit(itemId),
              this.sqlRepo.listOpenWorkItems(itemId),
            ]);

            const perItems: any[] = [];

            for (const wi of openWorkItems) {
              const res = await this.bpmnEngine.computeAvailableActions({
                process,
                indexes,
                currentNodeId: wi.nodeId,
                workItem: wi,
                document: item,
                userId,
                userRoles: userRoles || [],
                getUsersByRole: (role) =>
                  this.sqlsvRepo.getUsersByRoleMongoDB(role),
                audit,
              });

              perItems.push({
                workItem: wi,
                node: res.node,
                availableActions: res.availableActions,
                flags: res.flags,
              });
            }

            const first = perItems.find((x) =>
              x.availableActions?.some((a: any) => a.canExecute),
            );

            const summary = first || perItems[0] || {
              workItem: null,
              availableActions: [],
              flags: {},
            };

            const summaryFlags = perItems.reduce(
              (acc, x) => ({ ...acc, ...x.flags }),
              {},
            ) as any;

            if (['0', '6', '7'].includes(rawStatus) && item.createdBy === userId) {
              summaryFlags.canProcess = true;
              if (!summary.availableActions || summary.availableActions.length === 0) {
                summary.availableActions = [
                  {
                    code: 'VT_TAOMOIVATRINH_TIEUHUY_HOSO',
                    label: 'Trình phê duyệt',
                    canExecute: true,
                    type: 'transfer',
                  },
                ];
              }
            }

            workItem = summary.workItem;
            availableActions = summary.availableActions;
            flags = summaryFlags;
          }
        } catch (err) {
          this.logger.error(`Lỗi xử lý workflow cho bản ghi ID ${itemId}:`, err);
        }

        return {
          ...item,
          isNotEdit,
          workItem,
          availableActions,
          flags,
        };
      }),
    );

    return {
      success: true,
      items: finalItems,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async mapDocKeyArchiveRecord(
    docs: any[],
    aliases: Record<string, string> = {},
    isExport?: string,
    role: 'creator' | 'leader' | 'commander' = 'creator',
  ): Promise<any[]> {
    if (!Array.isArray(docs) || !docs.length) return [];

    const camelToSnake = (str: string): string =>
      str.replace(/([A-Z])/g, (_, c) => `_${c.toLowerCase()}`);

    const getVal = (obj: any, key: string) => {
      const snake = camelToSnake(key);
      return obj[key] ?? obj[snake];
    };

    const mappedDocs = docs.map((item) => {
      const mapped: Record<string, any> = {};

      // Map các trường từ aliases
      for (const [sourceKey, targetKey] of Object.entries(aliases)) {
        const val = getVal(item, sourceKey);
        mapped[targetKey] = val ?? null;
      }

      const status = (item.status || '0').toString();
      const reasonCode = item.destroy_reason || item.destroyReason;
      const createdAt = item.created_at || item.createdAt;

      mapped['id'] = item.id;
      mapped['destroyBatchCode'] = item.destroy_batch_code || item.destroyBatchCode;
      mapped['destroyBatchName'] = item.destroy_batch_name || item.destroyBatchName;

      if (isExport && isExport !== 'false') {
        let statusLabelMap = DESTROY_STATUS_LABELS;
        if (role === 'leader') statusLabelMap = DESTROY_LEADER_STATUS_LABELS;
        if (role === 'commander') statusLabelMap = DESTROY_COMMANDER_STATUS_LABELS;

        mapped['status'] = statusLabelMap[status] || status;
        mapped['destroyReason'] = DESTROY_REASON_MAP[reasonCode] || reasonCode;
        mapped['createdAt'] = createdAt ? moment(createdAt).format('DD/MM/YYYY') : null;
      } else {
        mapped['status'] = status;
        mapped['destroyReason'] = DESTROY_REASON_MAP[reasonCode] || reasonCode;
        mapped['createdAt'] = createdAt;
      }

      mapped['totalDestroyedRecords'] = item.total_destroyed_records || item.totalDestroyedRecords;
      mapped['createdBy'] = item.created_by || item.createdBy;
      mapped['title'] = item.title;

      // Parse profileIds
      let profileIds = item.profile_ids || item.profileIds;
      if (typeof profileIds === 'string') {
        try {
          profileIds = JSON.parse(profileIds);
        } catch {
          profileIds = [];
        }
      }
      mapped['profileIds'] = profileIds;

      const statusCode = (item.status_code || item.statusCode || item.status || '0').toString();
      const canEdit = ['0', '4', '6', '7'].includes(statusCode);
      const canDelete = statusCode === '0';
      mapped.isNotEdit = !canEdit;
      mapped.isNotDelete = !canDelete;

      return mapped;
    });

    return mappedDocs;
  }

  /**
   * Attach workflow fields (workItem, availableActions, flags) vào danh sách items đã map.
   * Tương tự attachWorkflowFields trong RecordExploitationService.
   */
  private async attachDestroyWorkflowFields(
    items: any[],
    mappedItems: any[],
    originalUserId: string,
    roles: string[],
  ) {
    const camelToSnake = (str: string): string =>
      str.replace(/([A-Z])/g, (_, c) => `_${c.toLowerCase()}`);

    const getVal = (obj: any, key: string) => {
      const snake = camelToSnake(key);
      return obj[key] ?? obj[snake];
    };

    const ids: string[] = [];
    const bpmnVersionsSet = new Set<string>();

    for (const item of items) {
      if (!item) continue;
      const id = getVal(item, 'id');
      if (id) ids.push(String(id));

      const v = getVal(item, 'bpmnVersion') || getVal(item, 'bpmn_version');
      if (typeof v === 'string' && v.trim().length > 0 && v.toUpperCase() !== 'NULL') {
        bpmnVersionsSet.add(v);
      }
    }

    const allOpenWorkItems = ids.length
      ? await this.sqlRepo.listOpenWorkItemsByIds(ids)
      : [];

    const openWorkItemsMap = new Map<string, any[]>();
    for (const wi of allOpenWorkItems) {
      const docId = wi.documentId;
      let list = openWorkItemsMap.get(docId);
      if (!list) {
        list = [];
        openWorkItemsMap.set(docId, list);
      }
      list.push(wi);
    }

    const bpmnVersions = [...bpmnVersionsSet];

    const bpmnEngineMap = new Map<string, { process: any; indexes: any }>(
      await Promise.all(
        bpmnVersions.map(
          async (v: string): Promise<[string, { process: any; indexes: any }]> => {
            try {
              const bpmnXML = await this.sqlRepo.getBpmnFile(v);
              const model = await this.runtimeDbService.getModelFromXml(bpmnXML);
              return [v, { process: model.process, indexes: model.indexes }];
            } catch {
              return [v, { process: null, indexes: null }];
            }
          },
        ),
      ),
    );

    const rolesCache = new Map<string, Promise<any>>();
    const cachedGetUsersByRole = (role: string) => {
      if (rolesCache.has(role)) return rolesCache.get(role)!;
      const promise = this.sqlsvRepo.getUsersByRoleMongoDB(role);
      rolesCache.set(role, promise);
      return promise;
    };

    const promises = items.map(async (item, i) => {
      const mapped = mappedItems[i];
      if (!item || !mapped) return;

      const docId = String(getVal(item, 'id'));
      const openWorkItems = openWorkItemsMap.get(docId) || [];
      const bpmnVersion = getVal(item, 'bpmnVersion') || getVal(item, 'bpmn_version');
      const bpmnEngineInfo = bpmnVersion ? bpmnEngineMap.get(bpmnVersion) : null;
      const process = bpmnEngineInfo?.process;
      const indexes = bpmnEngineInfo?.indexes;

      let perItems: any[] = [];
      const audit: any[] = [];

      if (process && indexes && openWorkItems.length) {
        perItems = await Promise.all(
          openWorkItems.map(async (wi) => {
            const res = await this.bpmnEngine.computeAvailableActions({
              process,
              indexes,
              currentNodeId: wi.nodeId,
              workItem: wi,
              document: item,
              userId: originalUserId,
              userRoles: roles,
              getUsersByRole: cachedGetUsersByRole,
              audit,
            });

            return {
              workItem: wi,
              node: res.node,
              availableActions: res.availableActions,
              flags: res.flags,
            };
          }),
        );
      }

      const first = perItems.find((x) =>
        x.availableActions?.some((a: any) => a.canExecute),
      );

      const summary =
        first ||
        perItems[0] || { workItem: null, availableActions: [], flags: {}, node: null };

      const summaryFlags = perItems.reduce(
        (acc, x) => ({ ...acc, ...x.flags }),
        {},
      );

      // Hỗ trợ status 0, 6, 7 cho người tạo
      const statusVal = (getVal(item, 'status') ?? '').toString();
      const createdBy = getVal(item, 'createdBy') || getVal(item, 'created_by');
      if (['0', '6', '7'].includes(statusVal) && createdBy === originalUserId) {
        (summaryFlags as any).canProcess = true;
        if (!summary.availableActions || summary.availableActions.length === 0) {
          summary.availableActions = [
            {
              code: 'VT_TAOMOIVATRINH_TIEUHUY_HOSO',
              label: 'Trình phê duyệt',
              canExecute: true,
              type: 'transfer',
            },
          ];
        }
      }

      mapped.workItem = summary.workItem;
      mapped.node = summary.node;
      mapped.availableActions = summary.availableActions || [];
      mapped.flags = summaryFlags;
    });

    await Promise.all(promises);
  }
}
