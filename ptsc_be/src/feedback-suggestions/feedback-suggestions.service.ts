import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, Logger
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, Not, Brackets } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as dayjs from 'dayjs';

import { FeedbackSuggestionEntity } from './entities/feedback-suggestion.entity';
import { FeedbackHistoryEntity } from './entities/feedback-history.entity';
import { UserEntity } from '../users/entities/user.entity';
import { OrganizationUnitEntity } from '../organization-unit/organization-unit_sql/organization-unit.entity';
import { WorkItemEntity } from '../work-items/entities/work-item.entity';
import { Audit } from '../database/schema-sql/audit.entity';
import { NotificationService } from '../notifycation/notification.service';
import { FeatureManagementService } from '../feature-management/feature-management.service';
import { MSSQL_REPO } from '../database/database.provider';
import { MSSQLRepository } from '../database/sqlRepo.mssql';
import { SQLSVRepository } from '../database/sqlsvRepo';
import BpmnEngineService from '../bpmn/bpmn-engine.service';
import { RuntimeDbService } from '../bpmn/runtime-dbmssql.service';
import { getAllNodeExtensionProperties } from '../utils/util';
import { GroupUserService } from '../group-users/group-users.service';
import { FilesRepository } from '../files-managerment/repositories/files.repository';

import { CreateFeedbackSuggestionDto } from './dto/create-feedback-suggestion.dto';
import { UpdateFeedbackSuggestionDto } from './dto/update-feedback-suggestion.dto';
import { ListFeedbackSuggestionDto } from './dto/list-feedback-suggestion.dto';
import { DispatchFeedbackDto } from './dto/dispatch-feedback.dto';
import { RejectFeedbackDto } from './dto/reject-feedback.dto';
import { CompleteFeedbackDto } from './dto/complete-feedback.dto';
import { RatingFeedbackDto } from './dto/rating-feedback.dto';
import { ReUpdateFeedbackDto } from './dto/reupdate-feedback.dto';

/** Trạng thái xử lý phản ánh (số) */
export const FEEDBACK_STATUS = {
  WAITING_DISPATCH: 1,  // Chờ điều phối
  WAITING_PROCESS: 2,  // Chờ xử lý
  PROCESSING: 3,  // Đang xử lý
  COMPLETED: 4,  // Hoàn thành
  REJECTED: 5,  // Từ chối
};

/** Map số processStatus → nhãn tiếng Việt */
export const PROCESS_STATUS_LABEL: Record<number, string> = {
  1: 'Chờ điều phối',
  2: 'Chờ xử lý',
  3: 'Đang xử lý',
  4: 'Hoàn thành',
  5: 'Chờ điều phối',
};

/** Map mã priority (code) → nhãn hiển thị tiếng Việt */
export const PRIORITY_MAP: Record<string, string> = {
  normal: 'Bình thường',
  urgent: 'Khẩn cấp',
  binhthuong: 'Bình thường',
  khancap: 'Khẩn cấp',
};

/** Map mã priority (code) → nhãn hiển thị tiếng Việt cho màn CHI TIẾT */
export const PRIORITY_MAP_DETAIL: Record<string, string> = {
  normal: 'Bình thường - Hạn xử lý 7 ngày',
  urgent: 'Khẩn cấp - Hạn xử lý 1 ngày',
  binhthuong: 'Bình thường - Hạn xử lý 7 ngày',
  khancap: 'Khẩn cấp - Hạn xử lý 1 ngày',
};

/** Tên hành động ghi lịch sử */
const ACTION = {
  CREATE: 'Tạo phản ánh',
  DISPATCH: 'Điều phối phản ánh',
  REDISPATCH: 'Điều phối lại phản ánh',
  REJECT_DISPATCH: 'Từ chối điều phối',
  ACCEPT: 'Tiếp nhận xử lý',
  REJECT_UNIT: 'Yêu cầu điều phối lại',
  COMPLETE: 'Hoàn tất xử lý phản ánh',
  RESUBMIT: 'Gửi lại yêu cầu',
  REUPDATE: 'Chỉnh sửa lại phản ánh',
  REJECT_FEEDBACK: 'Từ chối phản ánh kiến nghị',
};

/** Map mã loại phản ánh (value từ CRMSource LOAIPHANANH) → nhãn hiển thị */
export const FEEDBACK_TYPE_MAP: Record<string, string> = {
  '1': 'Thủ tục hành chính nội bộ',
  '2': 'Chính sách chế độ',
  '3': 'Cơ sở vật chất',
  '4': 'Môi trường làm việc',
  '5': 'Đồng nghiệp lãnh đạo',
  '6': 'Kiến nghị cải tiến quy trình',
  '7': 'Khác',
};

@Injectable()
export class FeedbackSuggestionsService {
  private readonly logger = new Logger(FeedbackSuggestionsService.name);
  private readonly typeDocument = 'FeedbackSuggestion';

  private roleProcessCache: Record<string, { ids: string[]; timestamp: number }> = {};
  private userRoleCache: Record<string, { role: string; rolesByProcess: any[]; timestamp: number }> = {};

  private toComparableId(columnExpr: string): string {
    // Compare ID columns as string to support both UUID and non-UUID user identifiers safely.
    return `CONVERT(VARCHAR(36), ${columnExpr})`;
  }

  private async getUserFromCacheOrDb(userId: string): Promise<{ role: string; rolesByProcess: any[] } | null> {
    const now = Date.now();
    const cached = this.userRoleCache[userId];
    if (cached && (now - cached.timestamp < 60 * 1000)) { // 1-minute cache
      return cached;
    }
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'role', 'rolesByProcess'],
    });
    if (!user) return null;
    const res = {
      role: user.role || '',
      rolesByProcess: Array.isArray(user.rolesByProcess) ? user.rolesByProcess : [],
    };
    this.userRoleCache[userId] = { ...res, timestamp: now };
    return this.userRoleCache[userId];
  }

  constructor(
    @InjectRepository(FeedbackSuggestionEntity, 'mssqlConnection')
    private readonly feedbackRepo: Repository<FeedbackSuggestionEntity>,
    @InjectRepository(FeedbackHistoryEntity, 'mssqlConnection')
    private readonly historyRepo: Repository<FeedbackHistoryEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(OrganizationUnitEntity, 'mssqlConnection')
    private readonly organizationUnitRepo: Repository<OrganizationUnitEntity>,
    @InjectRepository(WorkItemEntity, 'mssqlConnection')
    private readonly workItemRepo: Repository<WorkItemEntity>,
    @InjectRepository(Audit, 'mssqlConnection')
    private readonly auditRepo: Repository<Audit>,
    private readonly notificationService: NotificationService,
    private readonly featureManagementService: FeatureManagementService,
    @Inject(MSSQL_REPO) private readonly sqlRepo: MSSQLRepository,
    private readonly sqlsvRepo: SQLSVRepository,
    private readonly bpmnEngine: BpmnEngineService,
    private readonly runtimeDbService: RuntimeDbService,
    private readonly groupUserService: GroupUserService,
    private readonly filesRepository: FilesRepository,
  ) { }

  /** Map processStatus (số) → HTML badge giống module công việc */
  private mapProcessStatusToHtml(processStatus: number | null | undefined, isProcessor = false): string {
    switch (Number(processStatus)) {
      case 1:
        return `<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#FEF9C2;color:#FFA600;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #AEB5BE;">Chờ điều phối</div>`;
      case 2:
        return `<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#FFE8CC;color:#C05600;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #AEB5BE;">Chờ xử lý</div>`;
      case 3:
        return `<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#ACCBFF;color:#002089;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #AEB5BE;">Đang xử lý</div>`;
      case 4:
        return `<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#D0FFDE;color:#007222;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #AEB5BE;">Đã xử lý</div>`;
      case 5:
        // if (isProcessor) {
        //   return `<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#FEF9C2;color:#FFA600;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #AEB5BE;">Chờ điều phối</div>`;
        // } else {
        return `<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#FFDCD9;color:#F44336;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #c73535ff;">Từ chối</div>`;
      // }
      default:
        return `<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#E0E0E0;color:#555;font-weight:700;font-size:14px;border-radius:15px;">Không xác định</div>`;
    }
  }

  /** Map mã priority sang nhãn + thêm processStatusLabel + processStatusUi */
  private mapPriority(item: any, isDetail = false, isCoordinator = false, isProcessor = false): any {
    if (!item) return item;

    const label = item.status === 3
      ? 'Đã huỷ'
      : (Number(item.processStatus) === 5
        ? (isCoordinator ? 'Chờ điều phối' : 'Từ chối')
        : (PROCESS_STATUS_LABEL[item.processStatus] ?? null));

    const result = {
      ...item,
      types: FEEDBACK_TYPE_MAP[item.types] ?? item.types,
      priority: (isDetail ? PRIORITY_MAP_DETAIL : PRIORITY_MAP)[item.priority] ?? item.priority,
      processStatusLabel: label,
      processStatus: item.status === 3
        ? `<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#FFDCD9;color:#F44336;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #c73535ff;">Đã huỷ</div>`
        : this.mapProcessStatusToHtml(item.processStatus, isProcessor),
      createdByName: item.createdByName || item.createdBy?.name || null,
      creatorUnitName: item.creatorUnitName || item.createdBy?.parent?.name || item.createdBy?.organizationName || null,
      deadlineHighlight: null,
    };

    if (item.deadline && dayjs(item.deadline).isValid()) {
      const deadline = dayjs(item.deadline);
      let now = dayjs();
      const isCompleted = Number(item.processStatus) === 4; // Hoàn thành
      const isCancelled = item.status === 3; // Đã hủy
      const deadlineStr = deadline.format('HH:mm DD/MM/YYYY');

      if (isCompleted && item.histories && Array.isArray(item.histories)) {
        const completeHistory = item.histories.find((h: FeedbackHistoryEntity) => h?.action === 'Hoàn tất xử lý phản ánh');
        if (completeHistory) {
          now = dayjs(completeHistory?.performedAt);
        }
      }

      result.deadline = deadlineStr; // Luôn trả về text thuần
      result.deadlineHighlight = `<span style="color:#000000;font-weight:400;">${deadlineStr}</span>`;

      if (!isCompleted && !isCancelled) {
        const diffHours = deadline.diff(now, 'hour');
        let statusText = '';
        let color = '';
        let remainingLabel = '';
        let daysCount = 0;

        if (deadline.isBefore(now)) {
          // Quá hạn -> Đỏ
          statusText = 'Quá hạn';
          color = '#F44336';
          remainingLabel = 'Quá hạn';
          daysCount = Math.abs(deadline.diff(now, 'day'));
          result.deadlineHighlight = `<span style="color:#F44336;font-weight:700;">${deadlineStr} (Quá hạn ${daysCount} ngày)</span>`;
        } else if (diffHours <= 24) {
          // Sắp tới hạn (1 ngày) -> Vàng
          result.deadlineHighlight = `<span style="color:#FFC107;font-weight:700;">${deadlineStr}</span>`;
          statusText = 'Sắp hết hạn';
          color = '#FFC107';
          remainingLabel = 'Số ngày còn lại';
          daysCount = Math.max(1, Math.ceil(deadline.diff(now, 'day', true)));
        }

        // Trả về trường deadlineUi cho API danh sách (!isDetail)
        if (statusText && !isDetail) {
          result.deadline = `
            <div class="unit-task-wrapper">
              <span 
                class="unit-task-label"
                style="color:${color}; font-weight:500; font-size:15px; cursor:pointer;"
              >
                ${deadlineStr}
              </span>

              <div class="unit-task-tooltip">
                <div>Tinh trạng: <span style="color:${color}; font-weight:700;">${statusText}</span></div>
                <div>Hạn xử lý: ${deadlineStr}</div>
                <div>${remainingLabel}: ${daysCount} ngày</div>
              </div>
            </div>
          `;
        }
      }
    } else {
      result.deadline = null;
    }

    return result;
  }

  // ──────────────────────────────────────────────
  // SLA HELPERS
  // ──────────────────────────────────────────────

  /**
   * Tính deadline theo mức độ ưu tiên (tính cả T7, CN):
   *  - 'khancap'   : +24 giờ (lịch thực)
   *  - 'binhthuong': +7 ngày (lịch thực)
   */
  private calcSlaDeadline(priority: string): Date {
    const now = new Date();
    const d = new Date(now);
    if (priority === 'urgent') {
      d.setHours(d.getHours() + 24); // +24 giờ
    } else {
      // normal: +7 ngày
      d.setDate(d.getDate() + 7);
    }
    return d;
  }


  // ──────────────────────────────────────────────
  // CRUD CƠ BẢN
  // ──────────────────────────────────────────────

  /** Tạo phản ánh mới — đi vào luồng BPMN (giống News) */
  async create(dto: CreateFeedbackSuggestionDto, userId: string) {
    try {
      // ===== 1. Lấy thông tin người dùng + đơn vị =====
      const user: any = await this.sqlsvRepo.getUserById(userId);
      const unitId = user?.parent?.id;
      if (!unitId) {
        throw new BadRequestException('Người dùng không thuộc đơn vị nào');
      }

      // ===== 2. Tìm luồng BPMN cho đơn vị + loại văn bản =====
      const flowConfig = await this.sqlsvRepo.getFlowByUnit(String(unitId), 'FeedbackSuggestion');
      if (!flowConfig) {
        throw new BadRequestException('Đơn vị chưa được thiết lập luồng xử lý phản ánh kiến nghị');
      }

      // ===== 3. Load BPMN XML & parse =====
      const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig.id);
      if (!bpmnXML) {
        throw new BadRequestException('Không tìm thấy file BPMN');
      }

      const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);

      // ===== 4. Tìm StartEvent → node kế tiếp =====
      const startEvent = Array.from(indexes.nodes.values()).find(
        (node: any) => node.$type === 'bpmn:StartEvent',
      ) as any;

      if (!startEvent) {
        throw new BadRequestException('Không tìm thấy StartEvent trong BPMN');
      }

      const flow = startEvent.outgoing?.[0];
      if (!flow) {
        throw new BadRequestException('StartEvent không có outgoing flow');
      }

      const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);
      if (!nextNode) {
        throw new BadRequestException('Không tìm thấy interactive node sau StartEvent');
      }

      const nodeId = nextNode.id;
      const role = indexes.laneMap.get(nodeId);
      const statusCode = getAllNodeExtensionProperties(nextNode)?.statusCode ?? 'DRAFT';

      // ===== 5. Tạo bản ghi phản ánh =====
      const code = await this.generateCode();
      const feedback = this.feedbackRepo.create({
        ...dto,
        id: uuidv4(),
        code,
        createdById: userId,
        status: 1,
        processStatus: FEEDBACK_STATUS.WAITING_DISPATCH,
        // deadline: this.calcSlaDeadline(dto.priority || 'normal'), // SLA tự động theo priority
      });
      const saved = await this.feedbackRepo.save(feedback);


      // ===== 6. Tạo Work Item (assign cho người thuộc role kế tiếp) =====
      const nextRoleUserIds = role
        ? await this.groupUserService.getUserIdsByRoleDynamic(flowConfig.id, role)
        : [];
      // Loại bỏ người tạo ra khỏi danh sách người xử lý kế tiếp (nếu có - theo yêu cầu user)
      const filteredNextRoleUserIds = nextRoleUserIds.filter(uid => String(uid) !== String(userId));
      const assignees = filteredNextRoleUserIds.length > 0 ? filteredNextRoleUserIds : [userId];

      const workItemId = `wi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      // [Tối ưu] Promise.all thay vì await tuần tự trong vòng for
      await Promise.all(assignees.map((assigneeId) => {
        const wiId = assignees.length > 1
          ? `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
          : workItemId;
        return Promise.all([
          this.sqlRepo.addWorkItem(
            saved.id,
            {
              id: wiId,
              nodeId,
              assigneeUserId: assigneeId,
              role,
              nodeType: nextNode.$type,
            },
            undefined,
            flowConfig.id,
          ),
          this.sqlRepo.addAudit(saved.id, {
            user_id: userId,
            display_name: user?.name || null,
            role,
            action_code: 'CREATE',
            from_node_id: null,
            to_node_id: nodeId,
            created_by: userId,
            receiver: assigneeId,
            stage_status: 'CHUA_XU_LY',
            curStatusCode: statusCode,
            typeDocument: this.typeDocument,
            action: 'Tạo phản ánh',
            details: 'Tạo phản ánh kiến nghị',
          }),
        ]);
      }));

      // ===== 7. Tạo Audit =====


      // ===== 8. Lịch sử + thông báo =====
      await this.addHistory(saved.id, ACTION.CREATE, userId, 'CBCNV tạo mới phản ánh kiến nghị');
      await this.notifyAdmins(userId, saved.id, saved.title, saved.code);

      return saved;
    } catch (error) {
      this.logger.error(`Lỗi tạo phản ánh: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || 'Lỗi khi tạo phản ánh kiến nghị');
    }
  }

  /**
   * Bộ lọc tìm kiếm cho Phản ánh - Góp ý (Giống News module nhưng linh hoạt hơn qua filter[])
   */
  private async applyFeedbackSearchFilters(
    qb: any,
    filters: ListFeedbackSuggestionDto
  ) {
    const {
      q, search, keyword, orFields, types, priority, processStatus,
      unitId, processorId, createdById, createdByUnitId,
      startDate, endDate, deadlineStart, deadlineEnd, filter: filterParam,
    } = filters;

    // 1. TỔNG QUÁT: q, search, keyword
    const globalSearch = q || search || keyword;
    if (globalSearch) {
      qb.andWhere(new Brackets(sqb => {
        sqb.where('LOWER(f.title) LIKE LOWER(:q)', { q: `%${globalSearch}%` })
          .orWhere('LOWER(f.content) LIKE LOWER(:q)', { q: `%${globalSearch}%` })
          .orWhere('f.code LIKE :q', { q: `%${globalSearch}%` });
      }));
    }

    // 1.1 Tìm kiếm cụ thể theo name (title) HOẶC code
    const { name: searchName, code: searchCode } = filters;
    if (searchName || searchCode) {
      qb.andWhere(new Brackets(sqb => {
        if (searchName) {
          sqb.where('LOWER(f.title) LIKE LOWER(:searchName)', { searchName: `%${searchName}%` });
        }
        if (searchCode) {
          if (searchName) {
            sqb.orWhere('f.code LIKE :searchCode', { searchCode: `%${searchCode}%` });
          } else {
            sqb.where('f.code LIKE :searchCode', { searchCode: `%${searchCode}%` });
          }
        }
      }));
    }

    // 2. HỖN HỢP OR: orFields
    if (orFields && typeof orFields === 'object' && Object.keys(orFields).length > 0) {
      qb.andWhere(new Brackets(sqb => {
        Object.keys(orFields).forEach((key, idx) => {
          const value = orFields[key];
          if (!value) return;
          const paramName = `orParam_${idx}`;
          const condition = (key === 'title' || key === 'content')
            ? `LOWER(f.${key}) LIKE LOWER(:${paramName})`
            : `f.${key} = :${paramName}`;

          if (idx === 0) {
            sqb.where(condition, { [paramName]: key === 'title' || key === 'content' ? `%${value}%` : value });
          } else {
            sqb.orWhere(condition, { [paramName]: key === 'title' || key === 'content' ? `%${value}%` : value });
          }
        });
      }));
    }

    // 3. Filter từng trường cụ thể (Nếu gửi top-level parameters)
    if (types) qb.andWhere('f.types = :types', { types });
    if (priority) qb.andWhere('f.priority = :priority', { priority });
    if (processStatus) qb.andWhere('f.process_status = :processStatus', { processStatus });
    if (createdById) qb.andWhere(`${this.toComparableId('f.created_by_id')} = :createdById`, { createdById });

    if (createdByUnitId) {
      // Lọc theo đơn vị của người tạo (Sử dụng subquery để tránh lỗi join metadata)
      const userSubQuery = qb.subQuery()
        .select('u.id')
        .from(UserEntity, 'u')
        .where('u.parent = :cbUnitId', { cbUnitId: createdByUnitId })
        .getQuery();
      qb.andWhere(`f.created_by_id IN ${userSubQuery}`, { cbUnitId: createdByUnitId });
    }

    if (unitId) {
      const resolvedUnitIds = await this.resolveIdsByName(unitId, 'unit');
      if (resolvedUnitIds.length > 0) {
        qb.andWhere('f.unit_id IN (:...topUnitIds)', { topUnitIds: resolvedUnitIds });
      } else {
        qb.andWhere(`${this.toComparableId('f.unit_id')} = :topUnitId`, { topUnitId: unitId });
      }
    }

    if (processorId) {
      const resolvedProcIds = await this.resolveIdsByName(processorId, 'processor');
      if (resolvedProcIds.length > 0) {
        qb.andWhere('f.processor_id IN (:...topProcIds)', { topProcIds: resolvedProcIds });
      } else {
        qb.andWhere(`${this.toComparableId('f.processor_id')} = :topProcessorId`, { topProcessorId: processorId });
      }
    }

    if (startDate || endDate) {
      if (startDate && endDate) {
        qb.andWhere('f.created_at >= :topStartDate', { topStartDate: new Date(startDate) });
        const end = new Date(endDate); end.setHours(23, 59, 59, 999);
        qb.andWhere('f.created_at <= :topEndDate', { topEndDate: end });
      } else if (startDate) {
        const start = new Date(startDate); start.setHours(0, 0, 0, 0);
        const end = new Date(startDate); end.setHours(23, 59, 59, 999);
        qb.andWhere('f.created_at BETWEEN :s_date AND :e_date', { s_date: start, e_date: end });
      } else if (endDate) {
        const start = new Date(endDate); start.setHours(0, 0, 0, 0);
        const end = new Date(endDate); end.setHours(23, 59, 59, 999);
        qb.andWhere('f.created_at BETWEEN :s_date AND :e_date', { s_date: start, e_date: end });
      }
    }

    if (deadlineStart || deadlineEnd) {
      if (deadlineStart && deadlineEnd) {
        qb.andWhere('f.deadline >= :topDlStart', { topDlStart: new Date(deadlineStart) });
        const dlEnd = new Date(deadlineEnd); dlEnd.setHours(23, 59, 59, 999);
        qb.andWhere('f.deadline <= :topDlEnd', { topDlEnd: dlEnd });
      } else if (deadlineStart) {
        const start = new Date(deadlineStart); start.setHours(0, 0, 0, 0);
        const end = new Date(deadlineStart); end.setHours(23, 59, 59, 999);
        qb.andWhere('f.deadline BETWEEN :sd_date AND :ed_date', { sd_date: start, ed_date: end });
      } else if (deadlineEnd) {
        const start = new Date(deadlineEnd); start.setHours(0, 0, 0, 0);
        const end = new Date(deadlineEnd); end.setHours(23, 59, 59, 999);
        qb.andWhere('f.deadline BETWEEN :sd_date AND :ed_date', { sd_date: start, ed_date: end });
      }
    }

    // 4. Dynamic Filter (params.filter) - HỖ TRỢ filter[key]=value
    let filter = filterParam;
    if (typeof filter === 'string') {
      try { filter = JSON.parse(filter); } catch { /* ignore */ }
    }
    if (filter && typeof filter === 'object' && !Array.isArray(filter)) {
      const filterKeys = Object.keys(filter);

      // Kiểm tra xem có đồng thời cả title và code trong filter không để xử lý OR
      const filterTitle = filter['title'];
      const filterCode = filter['code'];

      if (filterTitle && filterCode) {
        qb.andWhere(new Brackets(sqb => {
          sqb.where('LOWER(f.title) LIKE LOWER(:fTitleOr)', { fTitleOr: `%${filterTitle}%` })
            .orWhere('LOWER(f.code) LIKE LOWER(:fCodeOr)', { fCodeOr: `%${filterCode}%` });
        }));
        // Xóa để không bị overlap ở vòng lặp sau
        delete filter['title'];
        delete filter['code'];
      }

      for (let idx = 0; idx < filterKeys.length; idx++) {
        const key = filterKeys[idx];
        const value = filter[key];
        if (value === undefined || value === null || value === '') continue;
        const pName = `fparam_${idx}`;

        // Các trường hợp logic đặc thù trong filter[]
        if (key === 'title') {
          qb.andWhere('LOWER(f.title) LIKE LOWER(:fTitle)', { fTitle: `%${value}%` });
        } else if (key === 'code') {
          qb.andWhere('f.code LIKE :fCode', { fCode: `%${value}%` });
        } else if (key === 'priority') {
          let priorityValue = value;
          if (value === true || value === 'true') priorityValue = 'normal';
          else if (value === false || value === 'false') priorityValue = 'urgent';
          qb.andWhere('f.priority = :fPriority', { fPriority: priorityValue });
        } else if (key === 'deadline' && typeof value === 'object') {
          const { startDate: dStart, endDate: dEnd } = value;
          if (dStart && dEnd) {
            qb.andWhere('f.deadline >= :fDlSr', { fDlSr: new Date(dStart) });
            const end = new Date(dEnd); end.setHours(23, 59, 59, 999);
            qb.andWhere('f.deadline <= :fDlEr', { fDlEr: end });
          } else if (dStart) {
            const start = new Date(dStart); start.setHours(0, 0, 0, 0);
            const end = new Date(dStart); end.setHours(23, 59, 59, 999);
            qb.andWhere('f.deadline BETWEEN :dStartS AND :dStartE', { dStartS: start, dStartE: end });
          } else if (dEnd) {
            const start = new Date(dEnd); start.setHours(0, 0, 0, 0);
            const end = new Date(dEnd); end.setHours(23, 59, 59, 999);
            qb.andWhere('f.deadline BETWEEN :dEndS AND :dEndE', { dEndS: start, dEndE: end });
          }
        } else if ((key === 'createdAt' || key === 'created_at') && typeof value === 'object') {
          const { startDate: cStart, endDate: cEnd } = value;
          if (cStart && cEnd) {
            qb.andWhere('f.created_at >= :fCrSr', { fCrSr: new Date(cStart) });
            const end = new Date(cEnd); end.setHours(23, 59, 59, 999);
            qb.andWhere('f.created_at <= :fCrEr', { fCrEr: end });
          } else if (cStart) {
            const start = new Date(cStart); start.setHours(0, 0, 0, 0);
            const end = new Date(cStart); end.setHours(23, 59, 59, 999);
            qb.andWhere('f.created_at BETWEEN :cStartS AND :cStartE', { cStartS: start, cStartE: end });
          } else if (cEnd) {
            const start = new Date(cEnd); start.setHours(0, 0, 0, 0);
            const end = new Date(cEnd); end.setHours(23, 59, 59, 999);
            qb.andWhere('f.created_at BETWEEN :cEndS AND :cEndE', { cEndS: start, cEndE: end });
          }
        } else if (key.endsWith('__like')) {
          const field = key.replace('__like', '');
          qb.andWhere(`f.${field} LIKE :${pName}`, { [pName]: `%${value}%` });
        } else if (key === 'createdByUnitId') {
          const userSubQuery = qb.subQuery()
            .select('u.id')
            .from(UserEntity, 'u')
            .where('u.parent = :fCbUnitId', { fCbUnitId: value })
            .getQuery();
          qb.andWhere(`f.created_by_id IN ${userSubQuery}`, { fCbUnitId: value });
        } else if (key === 'unitId' || key === 'processorId' || key === 'unitName' || key === 'processorName') {
          const type = (key === 'unitId' || key === 'unitName') ? 'unit' : 'processor';
          const resolvedIds = await this.resolveIdsByName(value, type);
          const dbField = (key === 'unitId' || key === 'unitName') ? 'unit_id' : 'processor_id';
          if (resolvedIds.length > 0) {
            qb.andWhere(`f.${dbField} IN (:...ids_${idx})`, { [`ids_${idx}`]: resolvedIds });
          } else {
            qb.andWhere(`${this.toComparableId(`f.${dbField}`)} = :${pName}`, { [pName]: value });
          }
        } else if (typeof value !== 'object') {
          // Tự động map camelCase sang snake_case cho các trường phổ biến
          let dbKey = key;
          if (key === 'processStatus') dbKey = 'process_status';
          if (key === 'createdById') dbKey = 'created_by_id';
          if (key === 'processorName' || key === 'processorId') dbKey = 'processor_id';
          if (key === 'unitName' || key === 'unitId') dbKey = 'unit_id';

          if (dbKey === 'created_by_id' || dbKey === 'unit_id' || dbKey === 'processor_id' || dbKey === 'id') {
            qb.andWhere(`${this.toComparableId(`f.${dbKey}`)} = :${pName}`, { [pName]: value });
          } else {
            qb.andWhere(`f.${dbKey} = :${pName}`, { [pName]: value });
          }
        }
      }
    }
  }

  /**
   * Phân giải tên (Đơn vị hoặc Người dùng) thành danh sách ID để tìm kiếm
   */
  private async resolveIdsByName(name: string, type: 'unit' | 'processor'): Promise<string[]> {
    if (!name || typeof name !== 'string') return [];

    // Nếu là UUID/ObjectId (hex 24 ký tự) - có khả năng là ID sẵn rồi, nhưng vẫn tìm theo name lỡ trùng
    const ids: string[] = [];

    try {
      if (type === 'unit') {
        const units = await this.organizationUnitRepo.find({
          where: [
            { name: Like(`%${name}%`), status: 1 },
            { id: name, status: 1 }
          ],
          select: ['id']
        });
        ids.push(...units.map(u => u.id));
      }

      // Tìm user cho cả fallback unitId và processorId
      const users = await this.userRepo.find({
        where: [
          { name: Like(`%${name}%`), status: 1 },
          { username: Like(`%${name}%`), status: 1 },
          { id: name, status: 1 }
        ],
        select: ['id']
      });
      ids.push(...users.map(u => u.id));
    } catch (e) {
      this.logger.error(`resolveIdsByName error: ${e.message}`);
    }

    return [...new Set(ids)];
  }

  // ──────────────────────────────────────────────
  // CÁC HÀM EXPORT HỖ TRỢ DATA-EXPORT SERVICE
  // ──────────────────────────────────────────────
  private async getExportUserRole(userId: string): Promise<string | undefined> {
    if (!userId) return undefined;
    // [Tối ưu] Chỉ lấy cột cần thiết thay vì SELECT *
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'role', 'rolesByProcess'],
    });
    if (!user) return undefined;
    // Ưu tiên cột role, nếu không có thì check rolesByProcess

    const hasBPCT = Array.isArray(user.rolesByProcess) &&
      user.rolesByProcess.some(p =>
        Array.isArray(p.roles) && p.roles.some(r => r.roleCode === 'BO_PHAN_CHUYEN_TRACH')
      );
    return hasBPCT ? 'BO_PHAN_CHUYEN_TRACH' : undefined;
  }

  async exportAll(dto: ListFeedbackSuggestionDto, userId: string) {
    const role = await this.getExportUserRole(userId);
    return this.findAll(dto, userId, role);
  }

  async exportWaitingDispatch(dto: ListFeedbackSuggestionDto, userId: string) {
    const role = await this.getExportUserRole(userId);
    return this.findAll({ ...dto, actionCodes: ['CREATE', 'RESUBMIT', 'REJECT_UNIT_TO_DISPATCHER'] }, userId, role);
  }

  async findMyFeedbacks(params: ListFeedbackSuggestionDto, userId: string) {
    return this.findAll({ ...params, createdById: userId }, userId);
  }

  async exportWaitingProcess(dto: ListFeedbackSuggestionDto, userId: string) {
    const role = await this.getExportUserRole(userId);
    return this.findAll({ ...dto, actionCodes: ['DISPATCH', 'REDISPATCH'] }, userId, role);
  }

  async exportProcessing(dto: ListFeedbackSuggestionDto, userId: string) {
    const role = await this.getExportUserRole(userId);
    return this.findAll({ ...dto, actionCodes: ['ACCEPT'] }, userId, role);
  }

  async exportCompleted(dto: ListFeedbackSuggestionDto, userId: string) {
    const role = await this.getExportUserRole(userId);
    return this.findAll({ ...dto, actionCodes: ['COMPLETE'] }, userId, role);
  }

  async exportRejected(dto: ListFeedbackSuggestionDto, userId: string) {
    const role = await this.getExportUserRole(userId);
    return this.findAll({ ...dto, actionCodes: ['REJECT_DISPATCH', 'REJECT_UNIT_TO_CREATOR'] }, userId, role);
  }

  async findAll(params: ListFeedbackSuggestionDto, userId?: string, userRole?: string) {
    // this.logger.warn(`DEBUG: Entering findAll logic for user ${userId}, role ${userRole}, params: ${JSON.stringify(params)}`);
    try {
      const {
        page = 1, limit = 10, sortBy = 'createdAt', order = 'DESC', processFn,
      } = params;

      const qb = this.feedbackRepo.createQueryBuilder('f');

      // Ẩn bản ghi đã xóa
      qb.andWhere('f.status != :deletedStatus', { deletedStatus: 3 });

      // 1. Phân quyền: ADMIN hoặc Bộ phận chuyên trách thấy tất cả
      const isCoordinator = await this.checkIsCoordinator(userId, userRole);
      const isProcessor = await this.checkIsProcessor(userId, userRole);
      const bpctIds = userId ? await this.getUsersByRoleByProcess('BO_PHAN_CHUYEN_TRACH') : [];
      const isAdmin = isCoordinator;

      // 2. Lọc theo liên quan (nếu không phải ADMIN): người tạo, người xử lý, hoặc người được giao WorkItem
      if (!isAdmin && userId) {
        qb.andWhere(new Brackets(sqb => {
          sqb.where(`${this.toComparableId('f.created_by_id')} = :relatedUserId`, { relatedUserId: userId })
            .orWhere(`${this.toComparableId('f.processor_id')} = :relatedUserId`, { relatedUserId: userId });

          // Subquery để tìm các feedback mà user này đang có WorkItem (đang được giao xử lý)
          const wiSubQuery = this.workItemRepo.createQueryBuilder('wi')
          // .select('CONVERT(VARCHAR(36), wi.document_id)')
          // .where(`${this.toComparableId('wi.assignee_user_id')} = :relatedUserId`)
            .select('wi.document_id')
            .where('wi.assignee_user_id = :relatedUserId')
            .getQuery();

          sqb.orWhere(`${this.toComparableId('f.id')} IN (${wiSubQuery})`, { relatedUserId: userId });
        }));
      }

      // 3. Khởi chạy đếm trạng thái song song với việc lấy dữ liệu
      const statusCountsPromise = this.getStatusCounts(userId, userRole, bpctIds);

      // Áp dụng bộ lọc tìm kiếm
      await this.applyFeedbackSearchFilters(qb, params);

      // 3. Lọc theo trạng thái (processStatus) dựa trên actionCodes truyền vào
      if (params.actionCodes && params.actionCodes.length > 0) {
        const statusMap: Record<string, number[]> = {
          'CREATE': [FEEDBACK_STATUS.WAITING_DISPATCH],
          'RESUBMIT': [FEEDBACK_STATUS.WAITING_DISPATCH],
          'REJECT_UNIT_TO_DISPATCHER': [FEEDBACK_STATUS.WAITING_DISPATCH],
          'REUPDATE': [FEEDBACK_STATUS.WAITING_DISPATCH],
          'DISPATCH': [FEEDBACK_STATUS.WAITING_PROCESS],
          'REDISPATCH': [FEEDBACK_STATUS.WAITING_PROCESS],
          'ACCEPT': [FEEDBACK_STATUS.PROCESSING],
          'COMPLETE': [FEEDBACK_STATUS.COMPLETED],
          'REJECT_DISPATCH': [FEEDBACK_STATUS.REJECTED],
          'REJECT_UNIT_TO_CREATOR': [FEEDBACK_STATUS.REJECTED],
        };

        const targetStatuses = new Set<number>();
        params.actionCodes.forEach(code => {
          if (statusMap[code]) {
            statusMap[code].forEach(s => targetStatuses.add(s));
          }
        });

        if (targetStatuses.size > 0) {
          qb.andWhere('f.process_status IN (:...targetStatuses)', { targetStatuses: Array.from(targetStatuses) });
        }
      }

      // (Các filter nâng cao qua params.filter đã được handle trong applyFeedbackSearchFilters)

      /** Standard processFn: Fetch criteria from FeatureManagement */
      if (processFn) {
        const fm = await this.featureManagementService.findByCode(processFn);
        if (fm?.criteria && Array.isArray(fm.criteria)) {
          fm.criteria.forEach((crit: any, idx: number) => {
            const { name, operator, value } = crit;
            if (value === undefined || value === null || value === '') return;
            const paramName = `fmcrit_${idx}`;
            const field = `f.${name}`;
            switch (operator) {
              case 'eq': qb.andWhere(`${field} = :${paramName}`, { [paramName]: value }); break;
              case 'neq': qb.andWhere(`${field} != :${paramName}`, { [paramName]: value }); break;
              case 'in': qb.andWhere(`${field} IN (:...${paramName})`, { [paramName]: Array.isArray(value) ? value : [value] }); break;
              case 'like': qb.andWhere(`${field} LIKE :${paramName}`, { [paramName]: `%${value}%` }); break;
            }
          });
        }
      }

      // Special case: processFn=dspakndvxl
      // Users with role DON_VI_XY_LY only see records they are processing.
      // Skip this filter when viewing own feedbacks (createdById === userId).
      if (userId && params.createdById !== userId) {
        try {
          const isDonViXuLy = await this.checkIsProcessor(userId, userRole);

          if (isDonViXuLy) {
            qb.andWhere(`${this.toComparableId('f.processor_id')} = :dspakndvxlProcessorId`, {
              dspakndvxlProcessorId: userId,
            });
          }
        } catch (e) {
          this.logger.error(`findAll role check DON_VI_XY_LY failed: ${e.message}`);
        }
      }

      // Sort
      const allowedSortFields: Record<string, string> = {
        id: 'f.id',
        code: 'f.code',
        types: 'f.types',
        priority: 'f.priority',
        title: 'f.title',
        content: 'f.content',
        status: 'f.status',
        processStatus: 'f.process_status',
        unitId: 'f.unit_id',
        processorId: 'f.processor_id',
        deadline: 'f.deadline',
        createdById: 'f.created_by_id',
        createdAt: 'f.created_at',
        updatedAt: 'f.updated_at',
      };

      let sortApplied = false;
      if (params.sort) {
        let sortObj = params.sort;
        if (typeof sortObj === 'string') {
          try { sortObj = JSON.parse(sortObj); } catch (e) { /* ignore */ }
        }
        if (typeof sortObj === 'object' && !Array.isArray(sortObj)) {
          Object.keys(sortObj).forEach((key, idx) => {
            const dbField = allowedSortFields[key] || `f.${key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)}`;
            const direction = (String(sortObj[key]) === '-1') ? 'DESC' : 'ASC';
            if (idx === 0) qb.orderBy(dbField, direction);
            else qb.addOrderBy(dbField, direction);
            sortApplied = true;
          });
        }
      }

      if (!sortApplied) {
        const sortField = allowedSortFields[sortBy] || 'f.created_at';
        const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';
        qb.orderBy(sortField, sortOrder);
      }

      const [debugSql, debugParams] = qb.getQueryAndParameters();

      const [data, total] = await qb
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      if (total === 0) {
        const statusCounts = await statusCountsPromise;
        return { data: [], total: 0, page: +page, limit: +limit, totalPages: 0, statusCounts };
      }

      // [Tối ưu] Gộp 3 batch query user riêng thành 1 lần gọi duy nhất
      // const [mergedData, statusCounts] = await Promise.all([
      //   this.mapAllNames(data),
      //   statusCountsPromise
      // ]);
      const mergedData = await this.mapAllNames(data);

      const finalData = mergedData.map(item => this.mapPriority(item, false, isCoordinator, isProcessor));


      return {
        data: finalData,
        total,
        page: +page,
        limit: +limit,
        totalPages: Math.ceil(total / limit),
        // statusCounts
      };
    } catch (error) {
      if ((error as any)?.query || (error as any)?.parameters) {
        this.logger.error(`[findAll][FAILED_SQL] query and parameters redacted`);
      }
      this.logger.error(`findAll error: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || 'Lỗi khi lấy danh sách phản ánh');
    }
  }

  /**
   * Lấy danh sách phản ánh đã huỷ (status = 3) của người tạo
   */
  async findCancelled(params: ListFeedbackSuggestionDto, userId: string) {
    try {
      const {
        page = 1, limit = 10, sortBy = 'updatedAt', order = 'DESC',
      } = params;

      const qb = this.feedbackRepo.createQueryBuilder('f');

      // Chỉ lấy bản ghi đã huỷ (status = 3)
      qb.where('f.status = :deletedStatus', { deletedStatus: 3 });

      // Chỉ lấy của người tạo
      qb.andWhere(`${this.toComparableId('f.created_by_id')} = :userId`, { userId });

      // Áp dụng bộ lọc tìm kiếm (tiêu đề, mã, ngày tạo...)
      await this.applyFeedbackSearchFilters(qb, params);

      // Sort
      const allowedSortFields: Record<string, string> = {
        id: 'f.id',
        code: 'f.code',
        title: 'f.title',
        createdAt: 'f.created_at',
        updatedAt: 'f.updated_at',
      };

      const sortField = allowedSortFields[sortBy] || 'f.updated_at';
      const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';
      qb.orderBy(sortField, sortOrder);

      const [data, total] = await qb
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      const isCoordinator = await this.checkIsCoordinator(userId);
      const isProcessor = await this.checkIsProcessor(userId);
      const mergedData = await this.mapAllNames(data);
      const finalData = mergedData.map(item => this.mapPriority(item, false, isCoordinator, isProcessor));

      return {
        data: finalData,
        total,
        page: +page,
        limit: +limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`findCancelled error: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || 'Lỗi khi lấy danh sách phản ánh đã huỷ');
    }
  }

  /**
   * [Tối ưu] Gộp mapUnitNames + mapProcessorNames + mapCreatorDetail thành 1 hàm duy nhất
   * Trước: 3 batch query riêng đến bảng user (processor, creator, unit fallback)
   * Sau: 2 query song song (1 orgUnit + 1 user với tất cả IDs cần thiết)
   * Dùng cho findAll() — findOne() vẫn dùng từng mapper riêng do data structure khác
   */
  private async mapAllNames(data: any[]): Promise<any[]> {
    if (!data || data.length === 0) return [];

    // Thu thập tất cả IDs cần resolve
    const unitIds = [...new Set(data.map(i => i.unitId).filter(Boolean))] as string[];
    const processorIds = [...new Set(data.map(i => i.processorId).filter(Boolean))] as string[];
    const creatorIds = [...new Set(data.map(i => i.createdById).filter(Boolean))] as string[];

    // Tất cả user IDs cần tra cứu (processor + creator)
    const allUserIds = [...new Set([...processorIds, ...creatorIds])] as string[];

    let orgUnits: any[] = [];
    let usersAsUnits: any[] = [];
    let allUsers: any[] = [];

    try {
      // Query song song: orgUnit và user (1 query user thay vì 3)
      const [orgUnitResult, allUserResult] = await Promise.all([
        unitIds.length > 0
          ? this.organizationUnitRepo.find({
            where: { id: In(unitIds), status: 1 },
            select: ['id', 'name'],
          })
          : Promise.resolve([]),
        allUserIds.length > 0
          ? this.userRepo.find({
            where: { id: In(allUserIds) },
            relations: ['parent'],
            select: { id: true, name: true, username: true, organizationName: true },
          })
          : Promise.resolve([]),
      ]);
      orgUnits = orgUnitResult;
      allUsers = allUserResult;

      // Fallback: nếu có unitId không tìm thấy trong orgUnit và chưa có trong allUsers
      const foundOrgIds = new Set(orgUnits.map(o => String(o.id)));
      const missingUnitIds = unitIds.filter(id => !foundOrgIds.has(String(id)) && !allUserIds.includes(id));
      if (missingUnitIds.length > 0) {
        usersAsUnits = await this.userRepo.find({
          where: { id: In(missingUnitIds), status: 1 },
          select: ['id', 'name', 'username'],
        });
      }
    } catch (e) {
      this.logger.error('mapAllNames error', e);
    }

    // Xây dựng Maps để tra cứu O(1)
    const orgMap = new Map(orgUnits.map(o => [String(o.id), o.name]));
    const userAsUnitMap = new Map(usersAsUnits.map(u => [String(u.id), u.name || u.username]));
    const userMap = new Map(allUsers.map(u => [String(u.id), u]));

    return data.map(item => {
      const result = { ...item };

      // unitName
      if (item.unitId) {
        const unitName = orgMap.get(String(item.unitId))
          || userAsUnitMap.get(String(item.unitId))
          || userMap.get(String(item.unitId))?.name
          || item.unitId;
        result.unitName = unitName;
        result.organizationName = unitName;
      }

      // processorName
      if (item.processorId) {
        const u = userMap.get(String(item.processorId));
        const name = u?.name || u?.username || item.processorId;
        result.processorName = name;
        result.userName = name;
      }

      // createdByName + creatorUnitName
      if (item.createdById) {
        const creator = userMap.get(String(item.createdById));
        if (creator) {
          result.createdByName = creator.name || null;
          result.creatorUnitName = (creator as any).parent?.name || creator.organizationName || null;
        }
      }

      return result;
    });
  }

  /** Map tên đơn vị cho feedback (Giữ lại cho findOne compatibility) */
  private async mapUnitNames(data: any[]): Promise<any[]> {

    if (!data || data.length === 0) return [];

    // Lấy danh sách ID đơn vị duy nhất
    const unitIds = [...new Set(data.map(item => item.unitId).filter(id => id))];
    if (unitIds.length === 0) return data;

    let orgUnits: any[] = [];
    let usersAsUnits: any[] = [];

    try {
      // 1. Tìm trong bảng phòng ban (mặc định)
      orgUnits = await this.organizationUnitRepo.find({
        where: { id: In(unitIds as string[]), status: 1 },
        select: ['id', 'name'],
      });

      const foundOrgIds = new Set(orgUnits.map(org => String(org.id)));
      const missingIds = unitIds.filter(id => !foundOrgIds.has(String(id)));

      // 2. Nếu có ID không thấy trong phòng ban, tìm trong bảng User (dự phòng)
      if (missingIds.length > 0) {
        usersAsUnits = await this.userRepo.find({
          where: { id: In(missingIds as string[]), status: 1 },
          select: ['id', 'name', 'username'],
        });
      }
    } catch (e) {
      this.logger.error('Lỗi khi map tên đơn vị', e);
    }

    const orgMap = new Map(orgUnits.map(org => [String(org.id), org.name]));
    const userAsUnitMap = new Map(usersAsUnits.map(u => [String(u.id), u.name || u.username]));

    return data.map(item => {
      const mappedItem = { ...item };
      if (item.unitId) {
        // Gán tên đơn vị
        const unitName = orgMap.get(String(item.unitId)) || userAsUnitMap.get(String(item.unitId)) || item.unitId;
        mappedItem.unitName = unitName; // Thêm trường unitName thay vì ghi đè unitId để tránh lỗi logic
        mappedItem.organizationName = unitName;
      }
      return mappedItem;
    });
  }

  /** Map tên người xử lý cho feedback */
  private async mapProcessorNames(data: any[]): Promise<any[]> {
    if (!data || data.length === 0) return [];

    const processorIds = [...new Set(data.map(item => item.processorId).filter(id => id))];
    if (processorIds.length === 0) return data;

    let users: any[] = [];
    try {
      users = await this.userRepo.find({
        where: { id: In(processorIds as string[]), status: 1 },
        select: ['id', 'name', 'username'],
      });
    } catch (e) {
      this.logger.error('Lỗi khi map tên người xử lý', e);
    }

    const userMap = new Map(users.map(u => [String(u.id), u.name || u.username]));

    return data.map(item => {
      const mappedItem = { ...item };
      if (item.processorId) {
        const procName = userMap.get(String(item.processorId)) || item.processorId;
        mappedItem.processorName = procName; // Thêm trường processorName
        mappedItem.userName = procName;
      }
      return mappedItem;
    });
  }

  /** Map chi tiết người tạo (Tên + Phòng ban) */
  private async mapCreatorDetail(data: any[]): Promise<any[]> {
    if (!data || data.length === 0) return [];

    const creatorIds = [...new Set(data.map(item => item.createdById).filter(id => id))];
    if (creatorIds.length === 0) return data;

    let users: any[] = [];
    try {
      users = await this.userRepo.find({
        where: { id: In(creatorIds as string[]) },
        relations: ['parent'],
        select: {
          id: true,
          name: true,
          organizationName: true,
        }
      });
    } catch (e) {
      this.logger.error('Lỗi khi map chi tiết người tạo', e);
    }

    const userMap = new Map(users.map(u => [String(u.id), u]));

    return data.map(item => {
      const mappedItem = { ...item };
      const creator = userMap.get(String(item.createdById));
      if (creator) {
        mappedItem.createdByName = creator.name || null;
        mappedItem.creatorUnitName = creator.parent?.name || creator.organizationName || null;
      }
      return mappedItem;
    });
  }

  /** Xem chi tiết + lịch sử + available actions */
  async findOne(id: string, userId?: string) {
    const feedback = await this.feedbackRepo.findOne({
      where: { id },
      relations: ['createdBy', 'createdBy.parent'],
    });
    if (!feedback) throw new NotFoundException('Không tìm thấy phản ánh kiến nghị');
    if (userId) await this.assertCanAccessFeedback(feedback, userId);

    // Lấy lịch sử kèm thông tin người thực hiện + đơn vị
    const historyRecords = await this.historyRepo
      .createQueryBuilder('h')
      .leftJoinAndSelect('h.performer', 'p')
      .leftJoinAndSelect('p.parent', 'pp')
      .where('h.feedback_id = :id', { id })
      .orderBy('h.performed_at', 'DESC')
      .getMany();

    const histories = historyRecords.map(h => {
      const p = h.performer;
      if (p) {
        const unitName = p.parent?.name || p.organizationName || '';
        // Format: username - unitName
        const formattedUsername = `${p.username}${unitName ? ` - ${unitName}` : ''}`;

        // Return a clean performer object to avoid leaking sensitive data
        h.performer = {
          id: p.id,
          name: p.name,
          username: formattedUsername,
          organizationName: unitName,
        } as any;
      }
      return {
        ...h,
        isShowNote: (h.action === ACTION.REJECT_DISPATCH || h.action === ACTION.REJECT_UNIT || h.action === ACTION.REJECT_FEEDBACK) && !!h.note && h.note.trim() !== '',
        isShowDispatchNote: (h.action === ACTION.REDISPATCH || h.action === ACTION.DISPATCH) && !!h.note && h.note.trim() !== '',
      };
    });

    // ===== Compute available actions (BPMN) =====
    let availableActions: any[] = [];
    let flags: Record<string, boolean> = {};
    let perItems: any[] = [];

    let latestAuditAction: string | null = null;
    if (userId) {
      try {
        // Lấy audit gần nhất để kiểm tra trạng thái nghiệp vụ
        const lastAudit = await this.auditRepo.findOne({
          where: { documentId: id },
          order: { createdAt: 'DESC' },
          select: ['actionCode']
        });
        latestAuditAction = lastAudit?.actionCode ?? null;

        // 1. Lấy open work items
        // [Tối ưu] Chỉ lấy cột cần thiết thay vì SELECT *
        const openWorkItems = await this.workItemRepo.find({
          where: { documentId: id, state: 'open' },
          select: ['id', 'nodeId', 'role', 'assigneeUserId', 'state', 'bpmnVersion', 'nodeType'],
        });

        if (openWorkItems.length > 0) {
          const bpmnVersion = openWorkItems[0].bpmnVersion;
          const bpmnXML = bpmnVersion ? await this.sqlRepo.getBpmnFile(bpmnVersion) : null;

          if (bpmnXML) {
            // 2. Parse BPMN + lấy audit
            const { process, indexes } = await this.getModelFromXml(bpmnXML);
            const audit = await this.auditRepo.find({
              where: { documentId: id },
              order: { createdAt: 'DESC' },
            });

            // 3. Compute từng workItem
            for (const wi of openWorkItems) {
              const res = await this.bpmnEngine.computeAvailableActions({
                process,
                indexes,
                currentNodeId: wi.nodeId || '',
                workItem: wi,
                document: feedback,
                userId,
                userRoles: [],
                getUsersByRole: (role) => this.sqlsvRepo.getUsersByRoleMongoDB(role),
                audit: audit as any[],
              });

              perItems.push({
                workItem: {
                  id: wi.id,
                  nodeId: wi.nodeId,
                  role: wi.role,
                  assigneeUserId: wi.assigneeUserId,
                  state: wi.state,
                },
                node: res.node && {
                  id: res.node.id,
                  name: res.node.name,
                  type: res.node.$type,
                },
                availableActions: res.availableActions || [],
                flags: res.flags || {},
              });
            }

            // 4. Chọn summary — ưu tiên item có canExecute
            const first = perItems.find((x) =>
              x.availableActions?.some((a: any) => a.canExecute),
            );
            const summary = first || perItems[0] || { availableActions: [], flags: {} };

            availableActions = summary.availableActions;
            flags = summary.flags;
          }
        }
      } catch (error) {
        this.logger.error(`findOne computeAvailableActions error: ${error.message}`, error.stack);
      }
    }

    // ===== Thêm cờ nghiệp vụ thủ công =====
    // canRedispatch: BPCT có thể "Điều phối lại" khi feedback đang chờ điều phối VÀ đã từng bị từ chối
    // const hasRejectionHistory = histories.length > 0 &&
    //   (histories[0].action === ACTION.REJECT_DISPATCH || histories[0].action === ACTION.REJECT_UNIT);
    // flags['canRedispatch'] = (feedback.processStatus === FEEDBACK_STATUS.WAITING_DISPATCH || feedback.processStatus === FEEDBACK_STATUS.REJECTED) && hasRejectionHistory;

    // canEdit: người tạo được chỉnh sửa thông tin khi status là Từ chối hoặc Chờ điều phối
    flags['canEdit'] = [FEEDBACK_STATUS.WAITING_DISPATCH].includes(feedback.processStatus) && feedback.status != 3;

    // canEditDispatch: BPCT được chỉnh sửa điều phối khi status là Chờ xử lý
    flags['canEditDispatch'] = feedback.processStatus === FEEDBACK_STATUS.WAITING_PROCESS;

    // ===== Bổ sung các cờ hiển thị theo processStatus (Theo yêu cầu spreadsheet) =====
    const s = feedback.processStatus;
    // 1. Thông tin xử lý (canInfoHandle) - Codes: 1 -> Status: 2, 3, 4
    flags['canInfoHandle'] = [FEEDBACK_STATUS.WAITING_PROCESS, FEEDBACK_STATUS.PROCESSING, FEEDBACK_STATUS.COMPLETED, FEEDBACK_STATUS.REJECTED].includes(s);

    // [Bổ sung] Nếu hành động gần nhất là Từ chối điều phối và là người tạo thì ẩn Thông tin xử lý
    if (latestAuditAction === 'REJECT_DISPATCH' && feedback.createdById === userId) {
      flags['canInfoHandle'] = false;
    }

    // 2. Kết quả xử lý (canResultHandle) - Codes: 2 -> Status: 4
    flags['canResultHandle'] = s === FEEDBACK_STATUS.COMPLETED;
    // 3. File minh chứng kết quả (canFileResult) - Codes: 3 -> Status: 4
    flags['canFileResult'] = s === FEEDBACK_STATUS.COMPLETED;
    // 4. Thông tin người tạo (canInfoPeopleCreate) - Codes: 4 -> Status: 1, 2, 3, 5
    flags['canInfoPeopleCreate'] = [FEEDBACK_STATUS.WAITING_DISPATCH, FEEDBACK_STATUS.WAITING_PROCESS, FEEDBACK_STATUS.PROCESSING, FEEDBACK_STATUS.REJECTED, FEEDBACK_STATUS.COMPLETED].includes(s);
    // Nếu là nhóm động người tạo phản ánh và trạng thái từ chối thì ẩn cái này đi
    // if (s === FEEDBACK_STATUS.REJECTED && feedback.createdById === userId) {
    //   flags['canInfoHandle'] = false;
    // }
    // 5. Điều phối xử lý phản ánh (canCoordinatedHandle) - Codes: 5 -> Status: 5
    flags['canCoordinatedHandle'] = s === FEEDBACK_STATUS.REJECTED;
    // 6. Đánh giá phản ánh (canReview) - Status: 4 và chưa đánh giá
    flags['canReview'] = s === FEEDBACK_STATUS.COMPLETED && feedback.rating === null;
    // 7. Huỷ phản ánh (canCancel) - Status: 1
    flags['canCancel'] = s === FEEDBACK_STATUS.WAITING_DISPATCH && feedback.status != 3;
    // 8. Xem đánh giá phản ánh (canViewReview) - Status: 4
    flags['canViewReview'] = s === FEEDBACK_STATUS.COMPLETED && feedback.rating !== null;
    // 9. Kiểm tra quá hạn
    flags['isOverdue'] = !!feedback.deadline &&
      new Date(feedback.deadline) < new Date() &&
      feedback.processStatus !== FEEDBACK_STATUS.COMPLETED;

    const result = {
      ...feedback,
      deadline: feedback.deadline,
      histories,
      availableActions,
      flags,
      perItems,
      files: await this.filesRepository.getFilesByObjectAndStatus('feedback_suggestions', id),
      resultFiles: await this.filesRepository.getFilesByObjectAndStatus('feedback_suggestions_result', id),
    };

    // [Tối ưu] Chạy song song thay vì tuần tự
    const [mappedUnit, mappedProc] = await Promise.all([
      this.mapUnitNames([result]),
      this.mapProcessorNames([result]),
    ]);
    const merged = {
      ...mappedUnit[0],
      processorName: mappedProc[0]?.processorName,
      userName: mappedProc[0]?.userName,
    };
    const isCoordinator = await this.checkIsCoordinator(userId);
    const isProcessor = await this.checkIsProcessor(userId);
    return this.mapPriority(merged, true, isCoordinator, isProcessor);
  }

  /**
   * Cập nhật thông tin phản ánh — chỉ được sửa 1 lần, chỉ sửa title/content/files
   */
  async update(id: string, dto: UpdateFeedbackSuggestionDto, userId: string) {
    const feedback = await this.feedbackRepo.findOne({ where: { id } });
    if (!feedback) throw new NotFoundException('Không tìm thấy phản ánh kiến nghị');

    // Chỉ người tạo mới được sửa
    if (feedback.createdById !== userId) {
      throw new ForbiddenException('Chỉ người tạo phản ánh mới có thể chỉnh sửa');
    }

    // Chỉ được sửa 1 lần
    if (feedback.isEdited && dto?.status !== '3') {
      throw new BadRequestException('Phản ánh kiến nghị này đã được chỉnh sửa, không thể sửa thêm lần nữa');
    }

    // Chỉ cho phép chỉnh sửa khi đang ở trạng thái Chờ điều phối
    if (feedback.processStatus !== FEEDBACK_STATUS.WAITING_DISPATCH && feedback.processStatus !== FEEDBACK_STATUS.REJECTED) {
      throw new BadRequestException('Chỉ có thể chỉnh sửa khi phản ánh đang ở trạng thái Chờ điều phối hoặc từ chối');
    }

    // Kiểm tra số lượng file (max 10)
    if (dto.files && dto.files.length > 10) {
      throw new BadRequestException('Không được đính kèm quá 10 file minh chứng');
    }

    // Chỉ cập nhật các trường được phép
    feedback.title = dto.title!;
    if (dto?.status) feedback.status = Number(dto?.status);
    feedback.content = dto.content!;
    if (dto.files !== undefined) feedback.files = dto.files;
    feedback.isEdited = true;
    feedback.editedAt = new Date();

    await this.feedbackRepo.save(feedback);
    await this.addHistory(id, dto?.status !== '3' ? 'Cập nhật thông tin phản ánh' : 'Huỷ phản ánh', userId, dto?.status !== '3' ? 'Chỉnh sửa thông tin phản ánh kiến nghị' : 'Huỷ phản ánh kiến nghị');

    return {
      ...(await this.findOne(id, userId)),
      message: dto?.status !== '3' ? 'Chỉnh sửa thông tin phản ánh thành công' : 'Huỷ phản ánh thành công',
    };
  }


  /** Xóa mềm hàng loạt (status = 3) */
  async remove(ids: string[], userId: string) {
    if (!ids || ids.length === 0)
      throw new BadRequestException('Danh sách ids không được để trống');

    const feedbacks = await this.feedbackRepo.find({ where: { id: In(ids) } });
    if (feedbacks.length === 0)
      throw new NotFoundException('Không tìm thấy bản ghi nào');

    // Kiểm tra quyền và trạng thái
    for (const f of feedbacks) {
      if (f.createdById !== userId) {
        throw new ForbiddenException(`Bạn không có quyền xóa phản ánh kiến nghị "${f.title}"`);
      }
      if (f.processStatus !== FEEDBACK_STATUS.WAITING_DISPATCH) {
        throw new BadRequestException(`Phản ánh kiến nghị "${f.title}" đã được điều phối, không thể xóa`);
      }
    }

    for (const f of feedbacks) f.status = 3;
    await this.feedbackRepo.save(feedbacks);

    return {
      success: true,
      message: `Đã xóa ${feedbacks.length}/${ids.length} phản ánh kiến nghị`,
      deleted: feedbacks.length,
    };
  }

  // ──────────────────────────────────────────────
  // CÁC HÀNH ĐỘNG NGHIỆP VỤ
  // ──────────────────────────────────────────────

  /**
   * [Tối ưu] Trích xuất logic tính deadline dùng chung cho dispatch/reDispatch/reUpdate
   * Thay vì lặp lại 3 lần cùng đoạn code giống nhau
   */
  private resolveDeadline(dto: DispatchFeedbackDto): Date | null {
    if (dto.adjustDeadlineDays) {
      const d = new Date();
      d.setDate(d.getDate() + dto.adjustDeadlineDays);
      return d;
    }
    if (dto.deadline) {
      const d = new Date(dto.deadline);
      // Nếu chỉ có ngày (không có giờ), gán giờ hiện tại vào để tránh 00:00
      if (dto.deadline.length <= 10) {
        const now = new Date();
        d.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      }
      return d;
    }
    return null;
  }


  async dispatch(id: string, dto: DispatchFeedbackDto, userId: string) {
    const feedback = await this.getAndValidateStatus(id, [FEEDBACK_STATUS.WAITING_DISPATCH, FEEDBACK_STATUS.REJECTED]);
    const user: any = await this.sqlsvRepo.getUserById(userId);

    // ===== Auto-resolve từ BPMN để xác định nhóm người dùng được phép xử lý tiếp theo =====
    const openWi = await this.workItemRepo.findOne({ where: { documentId: id, state: 'open' } });
    let autoAssignees: string[] = [];
    if (openWi?.bpmnVersion && openWi?.nodeId) {
      const bpmnXML = await this.sqlRepo.getBpmnFile(openWi.bpmnVersion);
      if (bpmnXML) {
        const { indexes } = await this.getModelFromXml(bpmnXML);
        const currentNode = indexes.nodes.get(openWi.nodeId);
        const flow = currentNode?.outgoing?.[0];
        if (flow) {
          const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);
          if (nextNode) {
            const nextRole = indexes.laneMap.get(nextNode.id);
            if (nextRole) {
              autoAssignees = await this.groupUserService.getUserIdsByRoleDynamic(openWi.bpmnVersion, nextRole);
            }
          }
        }
      }
    }
    // Kiểm tra processorId có trong nhóm điều phối không
    if (dto.processorId && !autoAssignees.includes(dto.processorId)) {
      throw new BadRequestException('Người xử lý được chọn không thuộc nhóm điều phối có thẩm quyền');
    }

    // Ưu tiên FE truyền vào; nếu không thì auto-resolve từ BPMN
    const resolvedProcessorId = dto.processorId || (autoAssignees.length === 1 ? autoAssignees[0] : null);
    const resolvedUnitId = dto.unitId || autoAssignees[0] || null;

    // Tính hạn xử lý: ưu tiên adjustDeadlineDays → deadline → null
    // [Tối ưu] Dùng resolveDeadline() thay vì code inline trùng lặp
    const resolvedDeadline = this.resolveDeadline(dto);

    feedback.unitId = resolvedUnitId;
    feedback.processorId = resolvedProcessorId;
    feedback.deadline = resolvedDeadline;
    feedback.note = dto.note || feedback.note;
    feedback.processStatus = FEEDBACK_STATUS.WAITING_PROCESS;
    await this.feedbackRepo.save(feedback);

    // ===== Workflow: chứa node =====
    const actionCode = dto.isRedispatch ? 'REDISPATCH' : 'DISPATCH';
    const actionLabel = dto.isRedispatch ? ACTION.REDISPATCH : ACTION.DISPATCH;
    await this.moveToNextNode(id, userId, user?.name, actionCode, actionLabel, resolvedProcessorId || resolvedUnitId || undefined);

    await this.addHistory(id, actionLabel, userId, feedback?.note || '');

    // Thông báo: ưu tiên người FE chọn, fallback sang tất cả BPMN role users
    const recipients = dto.processorId
      ? [dto.processorId]
      : dto.unitId
        ? [dto.unitId]
        : autoAssignees;

    if (recipients.length) {
      const formattedDeadline = feedback.deadline ? dayjs(feedback.deadline).format('DD/MM/YYYY') : 'Không xác định';
      const targetId = (resolvedProcessorId || resolvedUnitId) as string;
      const processor = targetId ? await this.userRepo.findOne({ where: { id: targetId }, select: ['id', 'name', 'username'] }) : null;
      const processorName = processor?.name || processor?.username || 'Chưa xác định';

      // [Tối ưu] Promise.all thay vì await tuần tự trong vòng for
      await Promise.all(recipients.map(rId => {
        const isSelf = rId === resolvedProcessorId || rId === resolvedUnitId;
        return this.notificationService.createForRecipients({
          recipientIds: [rId],
          senderId: userId,
          content: isSelf
            ? `Phản ánh kiến nghị "${feedback.title}" được phân công cho bạn. Hạn xử lý: ${formattedDeadline}`
            : `Phản ánh kiến nghị "${feedback.title}" được phân công cho ${processorName}. Hạn xử lý: ${formattedDeadline}`,
          key: 'VIEW_FEEDBACK',
          recordId: id,
        });
      }));
    }
    return this.findOne(id);
  }


  /** Bước 2c: BPCT điều phối lại sau khi đơn vị từ chối → Chờ xử lý */
  async reDispatch(id: string, dto: DispatchFeedbackDto, userId: string) {
    // Cho phép điều phối lại khi đang từ chối (5) hoặc chờ điều phối (1)
    const feedback = await this.getAndValidateStatus(id, [FEEDBACK_STATUS.REJECTED, FEEDBACK_STATUS.WAITING_DISPATCH]);
    const user: any = await this.sqlsvRepo.getUserById(userId);

    // ===== Lấy nhóm người dùng có thẩm quyền xử lý tiếp theo từ BPMN =====
    const openWi = await this.workItemRepo.findOne({ where: { documentId: id, state: 'open' } });
    let autoAssignees: string[] = [];
    if (openWi?.bpmnVersion && openWi?.nodeId) {
      const bpmnXML = await this.sqlRepo.getBpmnFile(openWi.bpmnVersion);
      if (bpmnXML) {
        const { indexes } = await this.getModelFromXml(bpmnXML);
        const currentNode = indexes.nodes.get(openWi.nodeId);
        const flow = currentNode?.outgoing?.[0];
        if (flow) {
          const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);
          if (nextNode) {
            const nextRole = indexes.laneMap.get(nextNode.id);
            if (nextRole) {
              autoAssignees = await this.groupUserService.getUserIdsByRoleDynamic(openWi.bpmnVersion, nextRole);
            }
          }
        }
      }
    }

    // Kiểm tra processorId có trong nhóm điều phối không
    if (dto.processorId && !autoAssignees.includes(dto.processorId)) {
      throw new BadRequestException('Người xử lý được chọn không thuộc nhóm điều phối có thẩm quyền');
    }

    // Tính hạn xử lý
    // [Tối ưu] Dùng resolveDeadline() thay vì code inline trùng lặp
    const resolvedDeadline = this.resolveDeadline(dto);

    feedback.unitId = dto.unitId || null;
    feedback.processorId = dto.processorId || null;
    feedback.deadline = resolvedDeadline;
    feedback.note = dto.note || feedback.note;
    feedback.overdueReason = null; // xoá lý do từ chối cũ
    feedback.processStatus = FEEDBACK_STATUS.WAITING_PROCESS;
    await this.feedbackRepo.save(feedback);

    // ===== Workflow: chuyển node REDISPATCH =====
    await this.moveToNextNode(id, userId, user?.name, 'REDISPATCH', ACTION.REDISPATCH, dto.processorId || dto.unitId || undefined);

    await this.addHistory(id, ACTION.REDISPATCH, userId, feedback?.note || '');

    // Thông báo đơn vị mới
    const recipients = [dto.processorId, dto.unitId].filter(Boolean) as string[];
    if (recipients.length) {
      const formattedDeadline = feedback.deadline ? dayjs(feedback.deadline).format('DD/MM/YYYY') : 'Không xác định';
      const targetId = (dto.processorId || dto.unitId) as string;
      const processor = targetId ? await this.userRepo.findOne({ where: { id: targetId }, select: ['id', 'name', 'username'] }) : null;
      const processorName = processor?.name || processor?.username || 'Chưa xác định';

      // [Tối ưu] Promise.all thay vì await tuần tự trong vòng for
      await Promise.all(recipients.map(rId => {
        const isSelf = rId === targetId;
        return this.notificationService.createForRecipients({
          recipientIds: [rId],
          senderId: userId,
          content: isSelf
            ? `Phản ánh kiến nghị "${feedback.title}" được phân công cho bạn. Hạn xử lý: ${formattedDeadline}`
            : `Phản ánh kiến nghị "${feedback.title}" được phân công cho ${processorName}. Hạn xử lý: ${formattedDeadline}`,
          key: 'VIEW_FEEDBACK',
          recordId: id,
        });
      }));
    }
    return this.findOne(id);
  }

  async reUpdate(id: string, dto: ReUpdateFeedbackDto, userId: string) {
    // Cho phép điều phối lại khi đang từ chối (5)
    const feedback = await this.getAndValidateStatus(id, [FEEDBACK_STATUS.REJECTED]);
    if (feedback.createdById !== userId) {
      throw new ForbiddenException('Chỉ người tạo phản ánh mới có thể cập nhật lại');
    }
    const user: any = await this.sqlsvRepo.getUserById(userId);

    // ===== Lấy nhóm người dùng có thẩm quyền xử lý tiếp theo từ BPMN =====
    const openWi = await this.workItemRepo.findOne({ where: { documentId: id, state: 'open' } });
    let autoAssignees: string[] = [];
    if (openWi?.bpmnVersion && openWi?.nodeId) {
      const bpmnXML = await this.sqlRepo.getBpmnFile(openWi.bpmnVersion);
      if (bpmnXML) {
        const { indexes } = await this.getModelFromXml(bpmnXML);
        const currentNode = indexes.nodes.get(openWi.nodeId);
        const flow = currentNode?.outgoing?.[0];
        if (flow) {
          const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);
          if (nextNode) {
            const nextRole = indexes.laneMap.get(nextNode.id);
            if (nextRole) {
              autoAssignees = await this.groupUserService.getUserIdsByRoleDynamic(openWi.bpmnVersion, nextRole);
            }
          }
        }
      }
    }

    // Kiểm tra processorId có trong nhóm điều phối không
    if (dto.processorId && !autoAssignees.includes(dto.processorId)) {
      throw new BadRequestException('Người xử lý được chọn không thuộc nhóm điều phối có thẩm quyền');
    }

    // Tính hạn xử lý
    // [Tối ưu] Dùng resolveDeadline() thay vì code inline trùng lặp
    const resolvedDeadline = this.resolveDeadline(dto);

    feedback.unitId = dto.unitId || null;
    feedback.processorId = dto.processorId || null;
    feedback.deadline = resolvedDeadline;
    feedback.note = dto.note || feedback.note;
    feedback.overdueReason = null; // xoá lý do từ chối cũ

    // Cập nhật dữ liệu mới từ FE gửi lên
    if (dto.title) feedback.title = dto.title;
    if (dto.content) feedback.content = dto.content;
    if (dto.files !== undefined) feedback.files = dto.files;
    if (dto.types) feedback.types = dto.types;
    if (dto.priority) feedback.priority = dto.priority;

    feedback.processStatus = FEEDBACK_STATUS.WAITING_DISPATCH;
    await this.feedbackRepo.save(feedback);

    // ===== Workflow: chuyển node REDISPATCH =====
    await this.moveToNextNode(id, userId, user?.name, 'REUPDATE', ACTION.REUPDATE, dto.processorId || dto.unitId || undefined);

    await this.addHistory(id, ACTION.REUPDATE, userId, feedback?.note || '');

    // Thông báo đơn vị mới
    const recipients = [dto.processorId, dto.unitId].filter(Boolean) as string[];
    if (recipients.length) {
      const formattedDeadline = feedback.deadline ? dayjs(feedback.deadline).format('DD/MM/YYYY') : 'Không xác định';
      const targetId = (dto.processorId || dto.unitId) as string;
      const processor = targetId ? await this.userRepo.findOne({ where: { id: targetId }, select: ['id', 'name', 'username'] }) : null;
      const processorName = processor?.name || processor?.username || 'Chưa xác định';

      // [Tối ưu] Promise.all thay vì await tuần tự trong vòng for
      await Promise.all(recipients.map(rId => {
        const isSelf = rId === targetId;
        return this.notificationService.createForRecipients({
          recipientIds: [rId],
          senderId: userId,
          content: isSelf
            ? `Phản ánh kiến nghị "${feedback.title}" được phân công cho bạn. Hạn xử lý: ${formattedDeadline}`
            : `Phản ánh kiến nghị "${feedback.title}" được phân công cho ${processorName}. Hạn xử lý: ${formattedDeadline}`,
          key: 'VIEW_FEEDBACK',
          recordId: id,
        });
      }));
    }
    return this.findOne(id);
  }


  /** Bước 2b: BPCT từ chối điều phối → Từ chối */
  async rejectDispatch(id: string, dto: RejectFeedbackDto, userId: string) {
    // Cho phép từ chối khi đang chờ điều phối (1) hoặc đã bị từ chối trước nhưng gửi lại (5)
    const feedback = await this.getAndValidateStatus(id, [FEEDBACK_STATUS.WAITING_DISPATCH, FEEDBACK_STATUS.REJECTED]);
    const user: any = await this.sqlsvRepo.getUserById(userId);

    feedback.processStatus = FEEDBACK_STATUS.REJECTED;
    feedback.overdueReason = dto.overdueReason;
    await this.feedbackRepo.save(feedback);

    // ===== Workflow: chuyển node (từ chối điều phối) =====
    await this.moveToNextNode(id, userId, user?.name, 'REJECT_DISPATCH', ACTION.REJECT_DISPATCH, feedback.createdById ?? undefined);

    await this.addHistory(id, ACTION.REJECT_DISPATCH, userId, dto.overdueReason);

    // Thông báo người tạo
    if (feedback.createdById) {
      await this.notificationService.createForRecipients({
        recipientIds: [feedback.createdById],
        senderId: userId,
        content: `Phản ánh kiến nghị "${feedback.title}" cần phân công xử lý. Lý do: ${dto.overdueReason}`,
        key: 'VIEW_FEEDBACK',
        recordId: id,
      });
    }
    return this.findOne(id);
  }

  /** Bước 3: Đơn vị tiếp nhận xử lý → Đang xử lý */
  async accept(id: string, userId: string) {
    const feedback = await this.getAndValidateStatus(id, [FEEDBACK_STATUS.WAITING_PROCESS]);
    const user: any = await this.sqlsvRepo.getUserById(userId);

    feedback.processStatus = FEEDBACK_STATUS.PROCESSING;
    await this.feedbackRepo.save(feedback);

    // ===== Workflow: chuyển node =====
    await this.moveToNextNode(id, userId, user?.name, 'ACCEPT', ACTION.ACCEPT, userId);

    await this.addHistory(id, ACTION.ACCEPT, userId, feedback?.note || '');

    // Thông báo người phản ánh và Bộ phận chuyên trách
    const acceptRecipients: string[] = [];
    if (feedback.createdById) acceptRecipients.push(feedback.createdById);
    const bpctIds = await this.getUsersByRoleByProcess('BO_PHAN_CHUYEN_TRACH');
    bpctIds.forEach(id => { if (!acceptRecipients.includes(id)) acceptRecipients.push(id); });
    if (acceptRecipients.length) {
      const formattedDeadline = feedback.deadline ? dayjs(feedback.deadline).format('DD/MM/YYYY') : 'Không xác định';
      const processorName = user?.name || user?.username || 'Chưa xác định';

      for (const rId of acceptRecipients) {
        const isSelf = rId === userId;
        await this.notificationService.createForRecipients({
          recipientIds: [rId],
          senderId: userId,
          content: `Phản ánh đã được tiếp nhận xử lý.\nPhản ánh kiến nghị “${feedback.title}” được phân công cho ${isSelf ? 'bạn' : processorName}. Hạn xử lý: ${formattedDeadline}`,
          key: 'VIEW_FEEDBACK',
          recordId: id,
        });
      }
    }

    return this.findOne(id);
  }

  /** Bước 3b: Đơn vị từ chối xử lý → Từ chối */
  async rejectUnit(id: string, dto: RejectFeedbackDto, userId: string) {
    const feedback = await this.getAndValidateStatus(id, [FEEDBACK_STATUS.WAITING_PROCESS, FEEDBACK_STATUS.PROCESSING]);
    const user: any = await this.sqlsvRepo.getUserById(userId);

    // feedback.processStatus = dto.returnTo === 'dispatcher' ? FEEDBACK_STATUS.WAITING_DISPATCH : FEEDBACK_STATUS.REJECTED;
    feedback.processStatus = FEEDBACK_STATUS.REJECTED;
    feedback.overdueReason = dto.overdueReason;
    // feedback.unitId = null;
    // feedback.processorId = null;
    // feedback.deadline = null;
    await this.feedbackRepo.save(feedback);

    // ===== Workflow: 2 bước qua BPMN =====
    // Bước 1: từ "Tiếp nhận xử lý" → gateway (REJECT_UNIT) → node "Từ chối kèm lý do"
    await this.moveToNextNode(id, userId, user?.name, 'REJECT_UNIT', ACTION.REJECT_UNIT);

    // Bước 2: từ "Từ chối kèm lý do" → gateway → nhánh đúng theo returnTo
    // returnTo='creator'    → BPMN flow actionGroup='REJECT_UNIT_TO_CREATOR'
    // returnTo='dispatcher' → BPMN flow actionGroup='REJECT_UNIT_TO_DISPATCHER'
    const rejectActionCode = dto.returnTo === 'dispatcher'
      ? 'REJECT_UNIT_TO_DISPATCHER'
      : 'REJECT_UNIT_TO_CREATOR';

    const receiverUserId = dto.returnTo === 'dispatcher' ? undefined : (feedback.createdById ?? undefined);
    const historyAction = dto.returnTo === 'creator' ? 'Từ chối phản ánh kiến nghị' : ACTION.REJECT_UNIT;

    await this.moveToNextNode(id, userId, user?.name, rejectActionCode, historyAction, receiverUserId);

    await this.addHistory(id, historyAction, userId, dto.overdueReason);

    if (dto.returnTo === 'dispatcher') {
      // Trả về Bộ phận chuyên trách để điều phối lại
      const adminIds = await this.getUsersByRoleByProcess('BO_PHAN_CHUYEN_TRACH');
      if (adminIds.length) {
        await this.notificationService.createForRecipients({
          recipientIds: adminIds,
          senderId: userId,
          content: `Phản ánh kiến nghị "${feedback.title}" cần phân công xử lý. Lý do: ${dto.overdueReason}`,
          key: 'VIEW_FEEDBACK',
          recordId: id,
        });
      }
    } else {
      // Trả về người tạo để chỉnh sửa lại
      if (feedback.createdById) {
        await this.notificationService.createForRecipients({
          recipientIds: [feedback.createdById],
          senderId: userId,
          content: `Phản ánh kiến nghị "${feedback.title}" bị từ chối xử lý. Lý do: ${dto.overdueReason}\nVui lòng chỉnh sửa và gửi lại.`,
          key: 'VIEW_FEEDBACK',
          recordId: id,
        });
      }
    }
    return this.findOne(id);
  }

  /** Bước 5: Đơn vị hoàn thành xử lý */
  async complete(id: string, dto: CompleteFeedbackDto, userId: string) {
    const feedback = await this.getAndValidateStatus(id, [FEEDBACK_STATUS.PROCESSING]);
    const user: any = await this.sqlsvRepo.getUserById(userId);

    feedback.processStatus = FEEDBACK_STATUS.COMPLETED;
    feedback.result = dto.result;
    if (dto.overdueReason) feedback.overdueReason = dto.overdueReason;
    if (dto.note) feedback.note = dto.note;
    if (dto.resultFiles) (feedback as any).resultFiles = dto.resultFiles;
    await this.feedbackRepo.save(feedback);

    // ===== Workflow: chuyển node (hoàn thành) =====
    await this.moveToNextNode(id, userId, user?.name, 'COMPLETE', ACTION.COMPLETE, feedback.createdById ?? undefined);

    await this.addHistory(id, ACTION.COMPLETE, userId, dto.result);

    // Thông báo người tạo
    if (feedback.createdById) {
      await this.notificationService.createForRecipients({
        recipientIds: [feedback.createdById],
        senderId: userId,
        content: `Phản ánh kiến nghị "${feedback.title}" đã được xử lý hoàn thành.\nKết quả: ${dto.result}`,
        key: 'VIEW_FEEDBACK',
        recordId: id,
      });
    }
    return this.findOne(id);
  }

  /** Gửi lại sau khi bị từ chối (Người phản ánh) */
  async resubmit(id: string, updateDto: Partial<CreateFeedbackSuggestionDto>, userId: string) {
    const feedback = await this.getAndValidateStatus(id, [FEEDBACK_STATUS.REJECTED]);
    if (feedback.createdById !== userId) {
      throw new ForbiddenException('Chỉ người tạo phản ánh mới có thể cập nhật lại');
    }
    const user: any = await this.sqlsvRepo.getUserById(userId);

    // Chỉ người tạo được gửi lại
    if (feedback.createdById !== userId) {
      throw new ForbiddenException('Chỉ người tạo phản ánh mới có thể gửi lại');
    }

    // Cho phép cập nhật nội dung khi gửi lại
    if (updateDto.types) feedback.types = updateDto.types;
    if (updateDto.title) feedback.title = updateDto.title;
    if (updateDto.content) feedback.content = updateDto.content;
    if (updateDto.files) feedback.files = updateDto.files;

    // Reset về trạng thái ban đầu
    feedback.processStatus = FEEDBACK_STATUS.WAITING_DISPATCH;
    feedback.unitId = null;
    feedback.processorId = null;
    feedback.deadline = null;
    feedback.result = null;
    feedback.overdueReason = null;
    feedback.note = null;
    await this.feedbackRepo.save(feedback);

    // ===== Workflow: chuyển sang node tiếp theo (BPCT - Tiếp nhận điều phối) =====
    await this.moveToNextNode(id, userId, user?.name, 'RESUBMIT', ACTION.RESUBMIT);

    await this.addHistory(id, ACTION.RESUBMIT, userId, 'Gửi lại phản ánh sau khi bị từ chối');

    // Thông báo BPCT
    await this.notifyAdmins(userId, id, feedback.title, feedback.code);
    return this.findOne(id);
  }

  /** Đánh giá chất lượng xử lý (Người phản ánh) */
  async rating(id: string, dto: RatingFeedbackDto, userId: string) {
    const feedback = await this.feedbackRepo.findOne({ where: { id } });
    if (!feedback) throw new NotFoundException('Không tìm thấy phản ánh kiến nghị');
    if (feedback.createdById !== userId) {
      throw new ForbiddenException('Chỉ người tạo phản ánh mới có thể đánh giá');
    }
    if (feedback.processStatus !== FEEDBACK_STATUS.COMPLETED) {
      throw new BadRequestException('Chỉ có thể đánh giá khi phản ánh đã hoàn thành');
    }
    if (feedback.rating !== null) {
      throw new BadRequestException('Phản ánh này đã được đánh giá trước đó');
    }
    feedback.rating = dto.score;
    feedback.ratingComment = dto.ratingComment || null;
    feedback.satisfactionLevel = dto.satisfactionLevel || null;
    await this.feedbackRepo.save(feedback);
    await this.addHistory(id, `Đánh giá ${dto.score}/5 sao`, userId, dto.ratingComment || '');
    const ratingRecipients: string[] = [];
    if (feedback.processorId) ratingRecipients.push(feedback.processorId);
    const bpctIds = await this.getUsersByRoleByProcess('BO_PHAN_CHUYEN_TRACH');
    bpctIds.forEach(bpctId => { if (!ratingRecipients.includes(bpctId)) ratingRecipients.push(bpctId); });
    if (ratingRecipients.length) {
      await Promise.all(ratingRecipients.map(rId =>
        this.notificationService.createForRecipients({
          recipientIds: [rId],
          senderId: userId,
          content: `Người tạo đã đánh giá kết quả xử lý phản ánh [Mã ${feedback.code}]`,
          key: 'VIEW_FEEDBACK',
          recordId: id,
        })
      ));
    }
    return { success: true, score: dto.score };
  }

  // ──────────────────────────────────────────────
  // THỐNG KÊ & XUẤT DỮ LIỆU
  // ──────────────────────────────────────────────

  /** Thống kê tổng hợp */
  async getStats(startDate?: string, endDate?: string, userId?: string) {
    if (userId) {
      const role = await this.getExportUserRole(userId);
      const isAdmin = role === 'BO_PHAN_CHUYEN_TRACH' || role === 'ADMIN';
      if (!isAdmin) {
        throw new ForbiddenException('Bạn không có quyền xem thống kê tổng hợp');
      }
    }
    const qb = this.feedbackRepo.createQueryBuilder('f');
    if (startDate) qb.andWhere('f.created_at >= :s', { s: new Date(startDate) });
    if (endDate) {
      const e = new Date(endDate); e.setHours(23, 59, 59, 999);
      qb.andWhere('f.created_at <= :e', { e });
    }

    const totalCount = await qb.getCount();

    const byStatus = await this.feedbackRepo
      .createQueryBuilder('f')
      .select('f.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('f.status')
      .getRawMany();

    const byType = await this.feedbackRepo
      .createQueryBuilder('f')
      .select('f.types', 'types')
      .addSelect('COUNT(*)', 'count')
      .groupBy('f.types')
      .getRawMany();

    const byUnit = await this.feedbackRepo
      .createQueryBuilder('f')
      .select('f.unit_id', 'unitId')
      .addSelect('COUNT(*)', 'count')
      .where('f.unit_id IS NOT NULL')
      .groupBy('f.unit_id')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return { totalCount, byStatus, byType, byUnit };
  }

  /** Xuất Excel (trả raw data, Controller xử lý workbook) */
  async exportData(params: ListFeedbackSuggestionDto, userId?: string, userRole?: string) {
    const result = await this.findAll(
      { ...params, page: 1, limit: 5000 },
      userId, userRole
    );
    return result.data;
  }

  // ──────────────────────────────────────────────
  // HELPER METHODS
  // ──────────────────────────────────────────────

  /** Lấy phản ánh và kiểm tra trạng thái hợp lệ */
  private async getAndValidateStatus(id: string, allowedStatuses: number[]): Promise<FeedbackSuggestionEntity> {
    const feedback = await this.feedbackRepo.findOne({ where: { id } });
    if (!feedback) throw new NotFoundException('Không tìm thấy phản ánh kiến nghị');
    if (!allowedStatuses.includes(feedback.processStatus)) {
      throw new BadRequestException(
        `Không thể thực hiện hành động này. Trạng thái hiện tại: "${feedback.processStatus}". Trạng thái cần thiết: "${allowedStatuses.join(' hoặc ')}"`
      );
    }
    return feedback;
  }

  /** Ghi lịch sử hành động */
  private async addHistory(feedbackId: string, action: string, performerId: string, note: string) {
    await this.historyRepo.save(
      this.historyRepo.create({ id: uuidv4(), feedbackId, action, performerId, note })
    );
  }

  private async assertCanAccessFeedback(feedback: FeedbackSuggestionEntity, userId: string) {
    const role = await this.getExportUserRole(userId);
    const isAdmin = role === 'BO_PHAN_CHUYEN_TRACH' || role === 'ADMIN';
    if (isAdmin) return;

    if (feedback.createdById === userId || feedback.processorId === userId) {
      return;
    }

    const user: any = await this.sqlsvRepo.getUserById(userId);
    const userUnitId = user?.parent?.id;
    if (userUnitId && feedback.unitId && String(userUnitId) === String(feedback.unitId)) {
      return;
    }

    throw new ForbiddenException('Bạn không có quyền xem phản ánh này');
  }

  /** Thông báo đến BO_PHAN_CHUYEN_TRACH (BPCT) */
  private async notifyAdmins(senderId: string, recordId: string, title: string, code: string) {
    try {
      const adminIds = await this.getUsersByRoleByProcess('BO_PHAN_CHUYEN_TRACH');
      if (!adminIds.length) return;
      await this.notificationService.createForRecipients({
        recipientIds: adminIds,
        senderId,
        content: `Có phản ánh mới "${title}" (${code}) cần điều phối xử lý.`,
        key: 'VIEW_FEEDBACK',
        recordId,
      });
    } catch (e) {
      this.logger.error('notifyAdmins error', e);
    }
  }

  /**
   * Tìm user IDs có roleCode trong rolesByProcess
   * Tối ưu bằng raw SQL OPENJSON để lọc trực tiếp tại DB
   */
  private async getUsersByRoleByProcess(roleCode: string): Promise<string[]> {
    const now = Date.now();
    const cached = this.roleProcessCache[roleCode];
    if (cached && (now - cached.timestamp < 5 * 60 * 1000)) { // 5-minute cache
      return cached.ids;
    }
    try {
      const sql = `
        SELECT DISTINCT u.id
        FROM users u
        CROSS APPLY OPENJSON(CASE WHEN ISJSON(u.roles_by_process) > 0 THEN u.roles_by_process ELSE '[]' END) AS p
        CROSS APPLY OPENJSON(JSON_QUERY(p.value, '$.roles')) AS r
        WHERE JSON_VALUE(r.value, '$.roleCode') = @0
          AND u.status = 1
      `;
      const result = await this.userRepo.query(sql, [roleCode]);
      const ids = result.map((r: any) => r.id || r.ID);
      this.roleProcessCache[roleCode] = { ids, timestamp: now };
      return ids;
    } catch (e) {
      this.logger.error(`getUsersByRoleByProcess error: ${e.message}`);
      // Fallback nếu SQL lỗi (JSON format không chuẩn...)
      const allUsers = await this.userRepo.find({
        where: { status: 1 },
        select: ['id', 'rolesByProcess'],
      });
      const ids = allUsers
        .filter(u =>
          Array.isArray(u.rolesByProcess) &&
          u.rolesByProcess.some(p =>
            Array.isArray(p.roles) && p.roles.some(r => r.roleCode === roleCode)
          )
        )
        .map(u => u.id);
      this.roleProcessCache[roleCode] = { ids, timestamp: now };
      return ids;
    }
  }

  // ──────────────────────────────────────────────
  // BPMN WORKFLOW HELPERS (giống News module)
  // ──────────────────────────────────────────────

  /** Đóng tất cả work item đang open cho document */
  private async closeOpenWorkItems(documentId: string, state: 'completed' | 'cancelled') {
    const openItems = await this.workItemRepo.find({
      where: { documentId, state: 'open' },
    });
    for (const wi of openItems) {
      wi.state = state;
      await this.workItemRepo.save(wi);
    }
  }

  /** Parse BPMN XML string → indexes (giống News) */
  private async getModelFromXml(xmlContent: string) {
    const { process } = await this.bpmnEngine.loadBpmnFromString(xmlContent);
    const indexes = this.bpmnEngine.buildIndexes(process);
    return { process, indexes };
  }

  /**
   * Chuyển sang node tiếp theo trong BPMN
   * Pattern: đóng WI cũ → tìm next node → tạo WI mới + audit
   */
  private async moveToNextNode(
    documentId: string,
    userId: string,
    displayName: string,
    actionCode: string,
    actionLabel: string,
    receiverUserId?: string,
  ) {
    try {
      // 1. Lấy work item hiện tại
      const openWi = await this.workItemRepo.findOne({
        where: { documentId, state: 'open' },
      });
      if (!openWi) {
        this.logger.warn(`moveToNextNode: không tìm thấy open workItem cho ${documentId}`);
        return;
      }

      const currentNodeId = openWi.nodeId;
      if (!currentNodeId) {
        this.logger.warn(`moveToNextNode: workItem không có nodeId cho ${documentId}`);
        return;
      }
      const currentRole = openWi.role;
      const bpmnVersion = openWi.bpmnVersion;

      // 2. Load BPMN XML
      const bpmnXML = await this.sqlRepo.getBpmnFile(bpmnVersion || '');
      if (!bpmnXML) {
        this.logger.warn(`moveToNextNode: không tìm thấy BPMN file cho version ${bpmnVersion}`);
        return;
      }

      const { indexes } = await this.getModelFromXml(bpmnXML);
      const currentNode = indexes.nodes.get(currentNodeId);
      if (!currentNode) {
        this.logger.warn(`moveToNextNode: không tìm thấy node ${currentNodeId} trong BPMN`);
        return;
      }

      // 3. Tìm outgoing flow phù hợp theo actionGroup/actionCode trên extension properties
      const outgoingFlows = currentNode.outgoing || [];
      if (outgoingFlows.length === 0) {
        this.logger.warn(`moveToNextNode: node ${currentNodeId} không có outgoing flow`);
        return;
      }

      // Nếu chỉ có 1 flow thì lấy luôn, không cần match
      let flow = outgoingFlows[0];
      if (outgoingFlows.length > 1) {
        // Tìm flow có actionGroup hoặc actionCode khớp với actionCode đang thực hiện
        const matched = outgoingFlows.find((f: any) => {
          const extProps = this.bpmnEngine.getFlowExtensionProperties(f);
          return (
            extProps.actionGroup === actionCode ||
            extProps.actionCode === actionCode
          );
        });
        if (matched) {
          flow = matched;
        } else {
          this.logger.warn(`moveToNextNode: không tìm thấy flow khớp actionCode="${actionCode}", fallback về flow đầu tiên`);
        }
      }
      const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);

      // 4. Đóng work item cũ
      await this.closeOpenWorkItems(documentId, 'completed');

      if (!nextNode) {
        // End node → chỉ ghi audit
        await this.addAuditRecord(documentId, {
          userId, displayName, role: currentRole,
          actionCode, fromNodeId: currentNodeId, toNodeId: null,
          createdBy: userId, receiver: receiverUserId || userId,
          stageStatus: 'DA_XU_LY', curStatusCode: actionCode,
          typeDocument: this.typeDocument, action: actionLabel,
        });
        return;
      }

      // 5. Xác định người nhận (assignees)
      const nextNodeId = nextNode.id;
      const nextRole = indexes.laneMap.get(nextNodeId);
      const nextStatusCode = getAllNodeExtensionProperties(nextNode)?.statusCode ?? actionCode;

      let assignees: string[] = [];
      if (receiverUserId) {
        // Nếu đã định danh người nhận cụ thể (từ FE), thì chỉ gửi cho người đó
        assignees = [receiverUserId];
      } else if (nextRole && bpmnVersion) {
        // Nếu không có người nhận cụ thể, lấy toàn bộ danh sách từ BPMN role
        assignees = await this.groupUserService.getUserIdsByRoleDynamic(bpmnVersion, nextRole);
      }

      // Fallback cuối cùng nếu vẫn trống
      if (assignees.length === 0) {
        assignees = [userId];
      }

      // 6. Tạo work item cho từng user trong role kế tiếp
      for (const assigneeId of assignees) {
        const newWiId = `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await this.workItemRepo.save({
          id: newWiId,
          documentId,
          nodeId: nextNodeId,
          role: nextRole || currentRole,
          assigneeUserId: assigneeId,
          nodeType: nextNode.$type,
          state: 'open',
          createdAt: new Date(),
          bpmnVersion,
        });

        // Ghi audit cho từng người nhận
        await this.addAuditRecord(documentId, {
          userId, displayName, role: currentRole,
          actionCode, fromNodeId: currentNodeId, toNodeId: nextNodeId,
          createdBy: userId, receiver: assigneeId,
          stageStatus: 'CHUA_XU_LY', curStatusCode: nextStatusCode,
          typeDocument: this.typeDocument, action: actionLabel,
        });

      }
    } catch (error) {
      this.logger.error(`moveToNextNode error: ${error.message}`, error.stack);
      // Không throw — workflow fail không nên chặn business logic
    }
  }

  /**
   * Đóng work item + ghi audit khi kết thúc luồng (reject, complete)
   * Không tạo work item mới vì luồng dừng lại
   */
  private async closeAndAudit(
    documentId: string,
    userId: string,
    displayName: string,
    actionCode: string,
    actionLabel: string,
    receiverUserId?: string,
    stageStatus = 'DA_XU_LY',
  ) {
    try {
      const openWi = await this.workItemRepo.findOne({
        where: { documentId, state: 'open' },
      });

      const currentNodeId = openWi?.nodeId || null;
      const currentRole = openWi?.role || null;

      // Đóng tất cả work items
      await this.closeOpenWorkItems(documentId, 'completed');

      // Ghi audit
      await this.addAuditRecord(documentId, {
        userId, displayName, role: currentRole,
        actionCode, fromNodeId: currentNodeId, toNodeId: null,
        createdBy: userId, receiver: receiverUserId || userId,
        stageStatus, curStatusCode: actionCode,
        typeDocument: this.typeDocument, action: actionLabel,
      });
    } catch (error) {
      this.logger.error(`closeAndAudit error: ${error.message}`, error.stack);
    }
  }

  /**
   * Gửi lại (resubmit) → tạo lại work item ở node đầu tiên
   * Load BPMN từ feedback.bpmnVersion, tìm StartEvent → next node
   */
  private async reenterWorkflow(documentId: string, userId: string, displayName: string) {
    try {
      // Tìm bpmnVersion từ work item cũ hoặc feedback entity
      const feedback = await this.feedbackRepo.findOne({ where: { id: documentId } });
      const bpmnVersion = (feedback as any)?.bpmnVersion;
      if (!bpmnVersion) {
        this.logger.warn(`reenterWorkflow: không có bpmnVersion cho ${documentId}`);
        return;
      }

      const bpmnXML = await this.sqlRepo.getBpmnFile(bpmnVersion);
      if (!bpmnXML) return;

      const { indexes } = await this.getModelFromXml(bpmnXML);

      // Tìm StartEvent → next interactive node
      const startEvent = Array.from(indexes.nodes.values()).find(
        (node: any) => node.$type === 'bpmn:StartEvent',
      ) as any;
      if (!startEvent?.outgoing?.[0]) return;

      const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
        startEvent.outgoing[0], indexes,
      );
      if (!nextNode) return;

      const nodeId = nextNode.id;
      const role = indexes.laneMap.get(nodeId);
      const statusCode = getAllNodeExtensionProperties(nextNode)?.statusCode ?? 'DRAFT';

      // Đóng work item cũ (nếu còn)
      await this.closeOpenWorkItems(documentId, 'cancelled');

      // Tìm users theo role của node đầu tiên
      const nextRoleUserIds = role
        ? await this.groupUserService.getUserIdsByRoleDynamic(bpmnVersion, role)
        : [];
      const assignees = nextRoleUserIds.length > 0 ? nextRoleUserIds : [userId];

      // Tạo work item cho từng user trong role
      for (const assigneeId of assignees) {
        const wiId = `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await this.workItemRepo.save({
          id: wiId,
          documentId,
          nodeId,
          role,
          assigneeUserId: assigneeId,
          nodeType: nextNode.$type,
          state: 'open',
          createdAt: new Date(),
          bpmnVersion,
        });

        // Ghi audit cho từng người nhận
        await this.addAuditRecord(documentId, {
          userId, displayName, role,
          actionCode: 'RESUBMIT', fromNodeId: null, toNodeId: nodeId,
          createdBy: userId, receiver: assigneeId,
          stageStatus: 'CHUA_XU_LY', curStatusCode: statusCode,
          typeDocument: this.typeDocument, action: ACTION.RESUBMIT,
        });

      }
    } catch (error) {
      this.logger.error(`reenterWorkflow error: ${error.message}`, error.stack);
    }
  }

  /** Ghi audit record (giống News.addAudit) */
  private async addAuditRecord(documentId: string, payload: Partial<Audit>) {
    const detailsValue = payload.details && typeof payload.details !== 'string'
      ? JSON.stringify(payload.details)
      : (payload.details as any);

    await this.auditRepo.save({
      documentId,
      userId: payload.userId ?? null,
      displayName: payload.displayName ?? null,
      role: payload.role ?? null,
      actionCode: payload.actionCode ?? null,
      fromNodeId: payload.fromNodeId ?? null,
      toNodeId: payload.toNodeId ?? null,
      details: detailsValue ?? null,
      createdBy: payload.createdBy ?? null,
      receiver: payload.receiver ?? null,
      roleProcess: payload.roleProcess ?? payload.role ?? null,
      action: payload.action ?? null,
      stageStatus: payload.stageStatus ?? null,
      curStatusCode: payload.curStatusCode ?? null,
      typeDocument: payload.typeDocument ?? this.typeDocument,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /** Badge đếm theo trạng thái */
  private async getStatusCounts(userId?: string, userRole?: string, cachedBpctIds?: string[]) {
    const qb = this.feedbackRepo.createQueryBuilder('f')
      .select('f.processStatus', 'processStatus')
      .addSelect('COUNT(*)', 'count')
      .where('f.status != :deletedStatus', { deletedStatus: 3 })
      .groupBy('f.process_status');

    const bpctIds = cachedBpctIds ?? (userId ? await this.getUsersByRoleByProcess('BO_PHAN_CHUYEN_TRACH') : []);
    const isAdmin = userRole === 'BO_PHAN_CHUYEN_TRACH' || userRole === 'ADMIN'
      || (!!userId && bpctIds.includes(userId));
    if (!isAdmin && userId) {
      qb.andWhere(
        new Brackets(sqb => {
          sqb.where(`${this.toComparableId('f.created_by_id')} = :userId`, { userId })
            .orWhere(`${this.toComparableId('f.unit_id')} = :userId`, { userId });
        })
      );
    }

    const rows = await qb.getRawMany();
    const result: Record<string, number> = {};
    for (const r of rows) result[r.processStatus] = Number(r.count);
    return result;
  }

  /**
   * Đếm số lượng phản ánh đang xử lý của danh sách userIds (tối ưu hóa tối đa bằng cách đếm trực tiếp trên DB với tối đa 3 queries)
   * @param userIds Danh sách ID người dùng cần đếm
   * @returns Map dạng Record<userId, số lượng phản ánh đang xử lý>
   */
  async countProcessingFeedbacksByUserIds(userIds: string[]): Promise<Record<string, number>> {
    if (!userIds || userIds.length === 0) {
      return {};
    }

    const result: Record<string, number> = {};
    for (const uId of userIds) {
      result[uId] = 0;
    }

    try {
      // 1. Gom tất cả thông tin user trong 1 lần truy vấn
      const users = await this.userRepo.find({
        where: { id: In(userIds) },
        select: ['id', 'role', 'rolesByProcess']
      });
      const userMap = new Map<string, any>(users.map(u => [String(u.id).toLowerCase(), u]));

      // 2. Gom danh sách coordinator và cấu hình feature management một lần duy nhất
      const [bpctIds, fm] = await Promise.all([
        this.getUsersByRoleByProcess('BO_PHAN_CHUYEN_TRACH'),
        this.featureManagementService.findByCode('dsdxlqtbpct')
      ]);

      // Helper inline để check quyền coordinator
      const checkIsCoordinator = (user: any): boolean => {
        if (!user) return false;
        const userId = user.id;
        const userRole = user.role;
        if (userRole === 'BO_PHAN_CHUYEN_TRACH' || userRole === 'ADMIN') return true;
        if (userId && bpctIds.includes(userId)) return true;

        const hasBPCT = Array.isArray(user.rolesByProcess) &&
          user.rolesByProcess.some(p =>
            Array.isArray(p.roles) && p.roles.some(r => r.roleCode === 'BO_PHAN_CHUYEN_TRACH')
          );
        if (hasBPCT) return true;
        return false;
      };

      // Helper inline để check quyền processor
      const checkIsProcessor = (user: any): boolean => {
        if (!user) return false;
        const userRole = user.role;
        if (userRole === 'DON_VI_XU_LY' || userRole === 'DON_VI_XY_LY') return true;

        const hasProcessor = Array.isArray(user.rolesByProcess) &&
          user.rolesByProcess.some(p =>
            Array.isArray(p.roles) && p.roles.some(r => r.roleCode === 'DON_VI_XU_LY' || r.roleCode === 'DON_VI_XY_LY')
          );
        if (hasProcessor) return true;
        return false;
      };

      // Helper inline để áp dụng filter criteria
      const applyCriteria = (qb: any) => {
        if (fm?.criteria && Array.isArray(fm.criteria)) {
          fm.criteria.forEach((crit: any, idx: number) => {
            const { name, operator, value } = crit;
            if (value === undefined || value === null || value === '') return;
            const paramName = `fmcrit_${idx}`;
            const field = `f.${name}`;
            switch (operator) {
              case 'eq': qb.andWhere(`${field} = :${paramName}`, { [paramName]: value }); break;
              case 'neq': qb.andWhere(`${field} != :${paramName}`, { [paramName]: value }); break;
              case 'in': qb.andWhere(`${field} IN (:...${paramName})`, { [paramName]: Array.isArray(value) ? value : [value] }); break;
              case 'like': qb.andWhere(`${field} LIKE :${paramName}`, { [paramName]: `%${value}%` }); break;
            }
          });
        }
      };

      // 3. Phân loại nhóm users in-memory
      const coordinators: string[] = [];
      const processors: string[] = [];
      const regulars: string[] = [];

      for (const uId of userIds) {
        const lowerUId = String(uId).toLowerCase();
        const user = userMap.get(lowerUId) || null;
        const isCoordinator = checkIsCoordinator(user);
        const isProcessor = checkIsProcessor(user);

        if (isCoordinator) {
          coordinators.push(uId);
        } else if (isProcessor) {
          processors.push(uId);
        } else {
          regulars.push(uId);
        }
      }

      // 4. Nhóm 1: Nhóm Coordinator (Admin/Điều phối viên) - Đếm tổng số lượng (Global Count)
      if (coordinators.length > 0) {
        const qbGlobal = this.feedbackRepo.createQueryBuilder('f')
          .where('f.status != :deletedStatus', { deletedStatus: 3 })
          .andWhere('f.process_status = :targetStatus', { targetStatus: FEEDBACK_STATUS.PROCESSING });

        applyCriteria(qbGlobal);
        const globalCount = await qbGlobal.getCount();
        for (const uId of coordinators) {
          result[uId] = globalCount;
        }
      }

      // 5. Nhóm 2: Nhóm đơn vị xử lý (Processor) - Đếm các feedback được giao trực tiếp cho họ (processor_id)
      if (processors.length > 0) {
        const qbProc = this.feedbackRepo.createQueryBuilder('f')
          .select(`CONVERT(VARCHAR(36), f.processor_id)`, 'userId')
          .addSelect('COUNT(*)', 'cnt')
          .where('f.status != :deletedStatus', { deletedStatus: 3 })
          .andWhere('f.process_status = :targetStatus', { targetStatus: FEEDBACK_STATUS.PROCESSING })
          .andWhere(`CONVERT(VARCHAR(36), f.processor_id) IN (:...processors)`, { processors })
          .groupBy(`CONVERT(VARCHAR(36), f.processor_id)`);

        applyCriteria(qbProc);
        const procRows = await qbProc.getRawMany();
        for (const r of procRows) {
          const uId = String(r.userId || r.USERID || '').toLowerCase();
          result[uId] = Number(r.cnt || r.CNT || 0);
        }
      }

      // 6. Nhóm 3: Nhóm người dùng thường (Regular) - Đếm qua creator, processor hoặc assignee của work_items
      if (regulars.length > 0) {
        const len = regulars.length;
        const placeholders1 = regulars.map((_, i) => `@${i}`).join(', ');
        const placeholders2 = regulars.map((_, i) => `@${i + len}`).join(', ');
        const placeholders3 = regulars.map((_, i) => `@${i + len * 2}`).join(', ');

        const paramsList: any[] = [...regulars, ...regulars, ...regulars];

        let fmSql = '';
        let paramIdx = len * 3;
        if (fm?.criteria && Array.isArray(fm.criteria)) {
          fm.criteria.forEach((crit: any) => {
            const { name, operator, value } = crit;
            if (value === undefined || value === null || value === '') return;

            const columnName = name.replace(/[A-Z]/g, (letter: string) => `_${letter.toLowerCase()}`);
            const placeholder = `@${paramIdx++}`;

            if (operator === 'eq') {
              fmSql += ` AND f.${columnName} = ${placeholder}`;
              paramsList.push(value);
            } else if (operator === 'neq') {
              fmSql += ` AND f.${columnName} != ${placeholder}`;
              paramsList.push(value);
            } else if (operator === 'in') {
              const vals = Array.isArray(value) ? value : [value];
              const inPlaceholders = vals.map((_, vi) => `@${paramIdx++}`).join(', ');
              fmSql += ` AND f.${columnName} IN (${inPlaceholders})`;
              paramsList.push(...vals);
            } else if (operator === 'like') {
              fmSql += ` AND f.${columnName} LIKE ${placeholder}`;
              paramsList.push(`%${value}%`);
            }
          });
        }

        const sql = `
          SELECT U.userId, COUNT(DISTINCT f.id) AS cnt
          FROM (
              SELECT id AS feedbackId, CONVERT(VARCHAR(36), created_by_id) AS userId 
              FROM feedback_suggestions 
              WHERE created_by_id IN (${placeholders1})
              UNION
              SELECT id AS feedbackId, CONVERT(VARCHAR(36), processor_id) AS userId 
              FROM feedback_suggestions 
              WHERE processor_id IN (${placeholders2})
              UNION
              SELECT CONVERT(VARCHAR(36), document_id) AS feedbackId, CONVERT(VARCHAR(36), assignee_user_id) AS userId 
              FROM work_items 
              WHERE assignee_user_id IN (${placeholders3})
          ) U
          INNER JOIN feedback_suggestions f ON CONVERT(VARCHAR(36), f.id) = U.feedbackId
          WHERE f.status != 3 AND f.process_status = 3
            ${fmSql}
          GROUP BY U.userId
        `;

        const rows = await this.feedbackRepo.query(sql, paramsList);
        for (const r of rows) {
          const uId = String(r.userId || r.USERID || '').toLowerCase();
          result[uId] = Number(r.cnt || r.CNT || 0);
        }
      }
    } catch (error) {
      this.logger.error(`countProcessingFeedbacksByUserIds error: ${error.message}`, error.stack);
    }

    return result;
  }

  private async checkIsCoordinator(userId?: string, userRole?: string): Promise<boolean> {
    if (!userId) return false;
    if (userRole === 'BO_PHAN_CHUYEN_TRACH' || userRole === 'ADMIN') return true;

    try {
      const user = await this.getUserFromCacheOrDb(userId);
      if (!user) return false;
      if (user.role === 'BO_PHAN_CHUYEN_TRACH' || user.role === 'ADMIN') return true;

      const hasBPCT = Array.isArray(user.rolesByProcess) &&
        user.rolesByProcess.some(p =>
          Array.isArray(p.roles) && p.roles.some(r => r.roleCode === 'BO_PHAN_CHUYEN_TRACH')
        );
      if (hasBPCT) return true;
    } catch (e) {
      this.logger.error(`checkIsCoordinator error: ${e.message}`);
    }
    return false;
  }

  private async checkIsProcessor(userId?: string, userRole?: string): Promise<boolean> {
    if (!userId) return false;
    if (userRole === 'DON_VI_XU_LY' || userRole === 'DON_VI_XY_LY') return true;

    try {
      const user = await this.getUserFromCacheOrDb(userId);
      if (!user) return false;
      if (user.role === 'DON_VI_XU_LY' || user.role === 'DON_VI_XY_LY') return true;

      const hasProcessor = Array.isArray(user.rolesByProcess) &&
        user.rolesByProcess.some(p =>
          Array.isArray(p.roles) && p.roles.some(r => r.roleCode === 'DON_VI_XU_LY' || r.roleCode === 'DON_VI_XY_LY')
        );
      if (hasProcessor) return true;
    } catch (e) {
      this.logger.error(`checkIsProcessor error: ${e.message}`);
    }
    return false;
  }

  /** Sinh mã YC-YYYYMMDD-XXX */
  private async generateCode(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `YC-${dateStr}-`;
    const last = await this.feedbackRepo.findOne({
      where: { code: Like(`${prefix}%`) },
      order: { code: 'DESC' },
    });
    let next = 1;
    if (last?.code) {
      const n = parseInt(last.code.replace(prefix, ''), 10);
      if (!isNaN(n)) next = n + 1;
    }
    return `${prefix}${next.toString().padStart(3, '0')}`;
  }
}

