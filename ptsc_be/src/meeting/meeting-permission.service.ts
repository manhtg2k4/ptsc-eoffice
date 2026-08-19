import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingEntity } from './entities/meeting.entity';
import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { UsersService } from 'src/users/users.service';
import { RuntimeDbService } from 'src/bpmn/runtime-dbmssql.service';
import { MeetingService } from './meeting.service';
import { UserEntity } from 'src/users/entities/user.entity';
import { POSITION_LEVEL } from 'src/variables/CONST_STATUS';

@Injectable()
export class MeetingPermissionService {
  private readonly logger = new Logger('MeetingPermissionService');

  constructor(
    @InjectRepository(MeetingEntity, 'mssqlConnection')
    private readonly meetingRepo: Repository<MeetingEntity>,
    private readonly sqlsvRepo: SQLSVRepository,
    private readonly sqlRepo: MSSQLRepository,
    private readonly userService: UsersService,
    private readonly runtimeDbService: RuntimeDbService,
    private readonly meetingService: MeetingService,

    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepo: Repository<UserEntity>,
  ) { }

  // ─── HELPER PRIVATE ──────────────────────────────────────────────────────────

  private async isAdmin(userId: string): Promise<boolean> {
    try {
      const user = await this.sqlsvRepo.getUserById(userId);
      if (!user) return false;

      // Check by Position Level
      if (user.position && POSITION_LEVEL[user.position] === POSITION_LEVEL.Admin) {
        return true;
      }

      // Check by Role string
      if (user.role) {
        const roleLower = user.role.toLowerCase();
        if (
          roleLower.includes('admin') ||
          roleLower.includes('quản trị') ||
          roleLower.includes('administrator')
        ) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private async getDefaultFlowId(userId: string): Promise<string> {
    const user = await this.sqlsvRepo.getUserById(userId);
    const flow = await this.sqlsvRepo.getFlowByUnit(user?.parent?.id, 'ScheduleProcess');
    return flow?.id || 'QUY_TRINH_LICH_HOP';
  }

  private async getMeeting(id: string): Promise<MeetingEntity> {
    const item = await this.meetingRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Không tìm thấy cuộc họp với ID: ${id}`);
    return item;
  }

  /**
   * Check nhanh: user có trong luồng lịch họp không.
   * Dùng isUserInFlowQuick (cache) trước, fallback getUserRole nếu cần.
   */
  private async isInFlow(userId: string, processKey: string): Promise<boolean> {
    const quick = await this.userService.isUserInFlowQuick(userId, processKey);
    if (quick) return true;
    const role = await this.sqlsvRepo.getUserRole(userId, processKey);
    return !!role;
  }

  // ─── PUBLIC CHECKS ───────────────────────────────────────────────────────────

  /**
   * Kiểm tra quyền tạo meeting.
   * Dùng BPMN StartEvent + lane role để xác định ai được phép khởi tạo.
   */
  async checkCreate(userId: string, flowConfig: string): Promise<boolean> {
    this.logger.log(`[2] isAdmin`);
    if (await this.isAdmin(userId)) return true;

    if (!flowConfig) flowConfig = await this.getDefaultFlowId(userId);
    if (!flowConfig) throw new ForbiddenException('Không xác định được quy trình');

    this.logger.log(`[3] getBpmnModelCached flow=${flowConfig}`);
    const bpmnModel = await this.meetingService.getBpmnModelCached(flowConfig);
    if (!bpmnModel?.xml) throw new ForbiddenException('Không tìm thấy cấu hình quy trình');
    const { indexes } = bpmnModel;

    this.logger.log(`[4] findProcessRoleInfo`);
    const userProcessRoles = await this.userService.findProcessRoleInfoByIdActionStart(userId, flowConfig, indexes);
    let userRoleCodes: string[] = userProcessRoles.roleCodes || [];

    // 3. Role từ group user
    const laneRoleCodes: string[] = (Object.values(indexes.lanes || {}) as any[])
      .map(l => l.role)
      .filter((r): r is string => !!r);

    this.logger.log(`[5] findUserRolesByUserId with userId=${userId}`);
    const rolesFromGroup = await this.meetingService.findUserRolesByUserId(userId, laneRoleCodes, flowConfig);

    userRoleCodes = [...new Set([...userRoleCodes, ...rolesFromGroup])];

    if (!userRoleCodes.length) {
      throw new ForbiddenException('Bạn không có quyền tạo cuộc họp này');
    }

    const canStart = Array.from(indexes.nodes.values())
      .filter((n: any) => n.$type === 'bpmn:StartEvent')
      .some((n: any) => {
        const laneRoleCode = indexes.laneMap.get(n.id);
        return laneRoleCode && userRoleCodes.includes(laneRoleCode);
      });

    if (!canStart) throw new ForbiddenException('Bạn không có quyền tạo cuộc họp này');

    this.logger.log(`[7] checkCreate PASS`);
    return true;
  }

  /**
   * Kiểm tra quyền cập nhật meeting.
   * Chỉ người tạo được sửa, và chỉ khi cuộc họp chưa diễn ra.
   */
  async checkUpdate(userId: string, meetingId: string): Promise<boolean> {
    if (await this.isAdmin(userId)) return true;
    const item = await this.getMeeting(meetingId);

    if (item.createdBy !== userId) {
      throw new ForbiddenException('Bạn không phải người tạo cuộc họp nên không thể chỉnh sửa');
    }

    const allowedStates = ['DU_KIEN', 'CHUAN_BI'];
    if (!allowedStates.includes(item.meetingState)) {
      throw new ForbiddenException('Cuộc họp đang diễn ra, bị hủy hoặc đã kết thúc, không thể chỉnh sửa');
    }

    return true;
  }

  /**
   * Kiểm tra quyền xóa meeting.
   * Chỉ người tạo được xóa, và chỉ khi cuộc họp chưa kết thúc.
   */
  async checkDelete(userId: string, meetingId: string): Promise<boolean> {
    if (await this.isAdmin(userId)) return true;
    const item = await this.getMeeting(meetingId);

    if (item.createdBy !== userId) {
      throw new ForbiddenException('Bạn không phải người tạo cuộc họp nên không thể xóa');
    }

    const allowedStates = ['DU_KIEN', 'CHUAN_BI', 'DA_HUY'];
    if (!allowedStates.includes(item.meetingState)) {
      throw new ForbiddenException('Cuộc họp đang diễn ra hoặc đã kết thúc, không thể xóa');
    }

    return true;
  }

  /**
   * Kiểm tra quyền xem chi tiết meeting.
   */
  async checkView(userId: string, meetingId: string): Promise<boolean> {
    const item = await this.getMeeting(meetingId).catch(() => null);

    // 1. Người tạo luôn được xem
    if (item?.createdBy === userId) return true;

    // 2. Xác định flowId từ meeting hoặc default
    const flowId = item?.bpmnVersion || (await this.getDefaultFlowId(userId));
    if (!flowId) throw new ForbiddenException('Không xác định được quy trình để kiểm tra quyền');

    // 3. Kiểm tra trong luồng (nhanh)
    if (await this.isInFlow(userId, flowId)) return true;

    // 4. Audit fallback (đã từng xử lý)
    const hasAudit = await this.sqlRepo.checkAuditAccess(meetingId, userId);
    if (hasAudit) return true;

    throw new ForbiddenException('Bạn không có quyền xem cuộc họp này');
  }

  /**
   * Kiểm tra quyền xử lý meeting theo BPMN workflow.
   */
  async checkProcess(userId: string, meetingId: string): Promise<boolean> {
    const item = await this.getMeeting(meetingId);
    const openWorkItems = await this.sqlRepo.listOpenWorkItems(meetingId);

    // 1. Được gán trực tiếp theo userId
    if (openWorkItems.some(wi => wi.assigneeUserId === userId)) return true;

    // 2. Được gán theo đơn vị (assigneeUnit)
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id'],
      relations: ['parent'],
    });
    const userUnit = user?.parent?.name ?? null;
    if (userUnit && openWorkItems.some(wi => wi.assigneeUnit && wi.assigneeUnit === userUnit)) {
      return true;
    }

    // 3. Theo role trong flow
    if (item.bpmnVersion) {
      if (await this.isInFlow(userId, item.bpmnVersion)) return true;
    }

    // 4. Audit fallback
    const hasAudit = await this.sqlRepo.checkAuditAccess(meetingId, userId);
    if (hasAudit) return true;

    throw new ForbiddenException('Bạn không có quyền xử lý cuộc họp này tại bước hiện tại');
  }

  /**
   * Xem danh sách cuộc họp (check nhanh).
   * Mọi user thuộc luồng lịch họp đều có thể xem.
   */
  async checkListAccess(userId: string): Promise<boolean> {
    const processKey = await this.getDefaultFlowId(userId);
    if (!processKey) return true;

    if (await this.isInFlow(userId, processKey)) return true;

    throw new ForbiddenException('Bạn không có quyền xem danh sách cuộc họp');
  }

  /**
   * Kiểm tra quyền theo feature code (ma trận phân quyền).
   */
  async checkFeatureAccess(userId: string, featureCode: string): Promise<boolean> {
    const processKey = await this.getDefaultFlowId(userId);
    if (!processKey) return true;

    if (await this.isInFlow(userId, processKey)) return true;

    const permissions = await this.sqlsvRepo.getUserPermissions(userId, processKey);
    if (permissions.includes(featureCode)) return true;

    throw new ForbiddenException('Vai trò của bạn chưa được cấp quyền sử dụng chức năng này');
  }
}