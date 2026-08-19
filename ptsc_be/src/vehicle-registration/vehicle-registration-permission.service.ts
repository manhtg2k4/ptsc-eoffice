import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleRegistrationEntity, VehicleState } from './entities/vehicle-registration.entity';
import { VehicleRegistrationAssignmentEntity } from './entities/vehicle-registration-assignments.entity';
import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { UsersService } from 'src/users/users.service';
import { RuntimeDbService } from 'src/bpmn/runtime-dbmssql.service';
import { VehicleRegistrationService } from './vehicle-registration.service';
import { POSITION_LEVEL } from 'src/variables/CONST_STATUS';

@Injectable()
export class VehicleRegistrationPermissionService {
  constructor(
    @InjectRepository(VehicleRegistrationEntity, 'mssqlConnection')
    private readonly vehicleRegistrationRepo: Repository<VehicleRegistrationEntity>,
    @InjectRepository(VehicleRegistrationAssignmentEntity, 'mssqlConnection')
    private readonly assignmentRepo: Repository<VehicleRegistrationAssignmentEntity>,
    private readonly sqlsvRepo: SQLSVRepository,
    private readonly sqlRepo: MSSQLRepository,
    private readonly runtimeDbService: RuntimeDbService,
    private readonly vehicleRegistrationService: VehicleRegistrationService,
    private readonly userService: UsersService,
  ) {}

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

  /**
   * Kiểm tra quyền tạo meeting
   */
  async checkCreate(userId: string, flowConfig: string): Promise<boolean> {
    if (await this.isAdmin(userId)) return true;
    // if (!flowConfig) return true;

    // 1. Lấy BPMN XML
    const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig);
    if (!bpmnXML) {
      throw new ForbiddenException('Không tìm thấy cấu hình quy trình');
    }

    const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);

    // 2. Lấy role user trong process
    const userProcessRoles =
      await this.userService.findProcessRoleInfoByIdActionStart(
        userId,
        flowConfig,
      );

    let userRoleCodes: string[] = userProcessRoles.roleCodes || [];

    // 3. Lấy role từ lane
    const lanes = Object.values(indexes.lanes || {});
    const laneRoleCodes: string[] = lanes
      .map((l: any) => l.role)
      .filter((r): r is string => !!r);

    // 4. Lấy role từ group
    const groupUserRoles = await this.vehicleRegistrationService.findUsersByRoleCodes(
      laneRoleCodes,
      flowConfig,
    );

    const rolesFromGroup = groupUserRoles
      .filter(u => u.userId === userId)
      .map(u => u.roleCode);

    userRoleCodes = [...new Set([...userRoleCodes, ...rolesFromGroup])];

    if (!userRoleCodes.length) {
      throw new ForbiddenException('Bạn không có quyền tạo cuộc họp này');
    }

    // 5. Check có startEvent match role không
    const canStart = Array.from(indexes.nodes.values())
      .filter((n: any) => n.$type === 'bpmn:StartEvent')
      .some((n: any) => {
        const laneRoleCode = indexes.laneMap.get(n.id);
        return laneRoleCode && userRoleCodes.includes(laneRoleCode);
      });

    if (!canStart) {
      throw new ForbiddenException('Bạn không có quyền tạo cuộc họp này');
    }

    return true;
  }


  /**
   * Kiểm tra quyền cập nhật yêu cầu
   */
  async checkUpdate(userId: string, registrationId: string): Promise<boolean> {
    if (await this.isAdmin(userId)) return true;
    const item = await this.getRegistration(registrationId);
    
    // 1. Cho phép người tạo sửa khi còn ở bước chờ
    if (item.createdBy === userId) return true;

    // 2. Kiểm tra quyền EDIT từ quy trình động
    if (item.bpmnVersion) {
      const flowInfo  = await this.userService.getUserFlowInfo(userId,item.bpmnVersion)
      if (flowInfo) return true;
      const roleInfo = await this.sqlsvRepo.getUserRole(userId, item.bpmnVersion);
      if (roleInfo?.permissions?.includes('EDIT')) return true;
    }

    throw new ForbiddenException('Bạn không có quyền chỉnh sửa yêu cầu này');
  }

  /**
   * Kiểm tra quyền xóa yêu cầu
   */
  async checkDelete(userId: string, registrationId: string | string[]): Promise<boolean> {
    if (await this.isAdmin(userId)) return true;
    const ids = Array.isArray(registrationId) ? registrationId : [registrationId];
    for (const id of ids) {
      if (!id) continue;
      const item = await this.getRegistration(id);
      
      // Chỉ người tạo + trạng thái chưa hoàn thành mới được xóa
      const allowedStates = [VehicleState.CHO_DIEU_PHOI, VehicleState.TU_CHOI, VehicleState.DA_HUY];
      // 1. Cho phép người tạo xóa
      if (item.createdBy !== userId || !allowedStates.includes(item.vehicleState)) {
        throw new ForbiddenException(`Bạn không có quyền xóa yêu cầu này. Yêu cầu ${item?.requestCode || item?.name || id} phải là người tạo hoặc admin và ở trạng thái hợp lệ`);
      }
    }
    return true;
  }

  /**
   * Kiểm tra quyền xem chi tiết yêu cầu
   */
  async checkView(userId: string, registrationId: string): Promise<boolean> {
    const item = await this.getRegistration(registrationId);
    
    
    // 1. fallback nếu không có meeting hoặc không có bpmnVersion
    let flowId = item?.bpmnVersion;

    if (!flowId) {
      flowId = await this.getDefaultFlowId(userId);
    }

    if (!flowId) {
      throw new ForbiddenException('Không xác định được quy trình để kiểm tra quyền');
    }

    // 2. creator luôn được xem
    if (item?.createdBy === userId) return true;

    // 3. check flow membership
    const flowInfo = await this.userService.getUserFlowInfo(userId, flowId);
    if (flowInfo) return true;

    const roleInfo = await this.sqlsvRepo.getUserRole(userId, flowId);
    if (roleInfo) return true;

    // 4. audit fallback
    const hasAudit = await this.hasAuditAccess(userId, registrationId);
    if (hasAudit) return true;

    // 5. check driver được phân công trong bảng vehicle_registration_assignments
    const hasAssignment = await this.assignmentRepo.exist({
      where: {
        registrationId,
        driverId: userId,
      },
    });
    if (hasAssignment) return true;

    // Fallback: check coordinationInformation nếu có
    let coordinationList: any[] = [];
    if (item?.coordinationInformation) {
      try {
        coordinationList = typeof item.coordinationInformation === 'string'
          ? JSON.parse(item.coordinationInformation)
          : item.coordinationInformation;
      } catch {
        coordinationList = [];
      }
    }
    const driverIds = coordinationList.map((c: any) => c.driverId).filter(Boolean);
    if (driverIds.includes(userId)) return true;

    throw new ForbiddenException('Bạn không có quyền xem chi tiết yêu cầu này');
  }
  
  private async hasAuditAccess(userId: string, registrationId: string): Promise<boolean> {
    return this.sqlRepo.checkAuditAccess(
      registrationId,
      userId,
    );
  }

  /**
   * Kiểm tra quyền thực hiện hành động trạng thái (BPMN actions)
   */
  async checkProcess(userId: string, registrationId: string): Promise<boolean> {
    const item = await this.getRegistration(registrationId);
    
    // Nếu trong tiến trình, chỉ cho phép Đội trưởng, Đội phó, hoặc tài xế được điều phối
    if (item.vehicleState === VehicleState.TRONG_TIEN_TRINH) {
      if (item.bpmnVersion) {
        const roleInfo = await this.sqlsvRepo.getUserRole(userId, item.bpmnVersion);
        if (roleInfo && ['PHONG_HAU_CAN_DOI_XE', 'PHONG_HAU_CAN_DOI_XE_PHO', 'PHO_DOI_TRUONG_PHONG_HAU_CAN_XE'].includes(roleInfo.roleCode)) {
          return true;
        }
      }
      let coordinationList: any[] = [];
      if (item.coordinationInformation) {
        try {
          coordinationList = JSON.parse(item.coordinationInformation);
        } catch {
          coordinationList = [];
        }
      }
      const driverIds = coordinationList.map((c: any) => c.driverId).filter(Boolean);
      if (driverIds.includes(userId)) {
        return true;
      }
      throw new ForbiddenException('Chỉ đội trưởng, đội phó hoặc tài xế của chuyến xe mới được hoàn thành yêu cầu');
    }

    // 1. Kiểm tra xem có workItem nào đang chờ User xử lý không
    const openWorkItems = await this.sqlRepo.listOpenWorkItems(registrationId);
    
    // Nếu user được chỉ định cụ thể (assignee)
    if (openWorkItems.some(wi => wi.assigneeUserId === userId)) return true;

    // Nếu user có role tương ứng và chưa có người nhận cụ thể
    if (item.bpmnVersion) {
      const roleInfo = await this.sqlsvRepo.getUserRole(userId, item.bpmnVersion);
      if (roleInfo) {
        if (openWorkItems.some(wi => wi.role === roleInfo.roleCode && (!wi.assigneeUserId || wi.assigneeUserId === ''))) {
          return true;
        }
      }
    }

    throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này tại bước quy trình này');
  }

  /**
   * Kiểm tra quyền xem danh sách xe / tài xế (check nhanh).
   * Bất kỳ user nào thuộc luồng đặt xe (VehicleRegistration) đều có thể xem.
   */
  async checkListAccess(userId: string): Promise<boolean> {
    const processKey = await this.getDefaultFlowId(userId);
    if (!processKey) return true;

    // Kiểm tra user có nằm trong luồng đặt xe không (qua flow membership hoặc role)
    const flowInfo = await this.userService.isUserInFlowQuick(userId, processKey);
    if (flowInfo) return true;

    const roleInfo = await this.sqlsvRepo.getUserRole(userId, processKey);
    if (roleInfo) return true;

    throw new ForbiddenException('Bạn không có quyền xem danh sách này');
  }

  /**
   * Kiểm tra quyền truy cập mã chức năng (Feature Code) dựa trên ma trận phân quyền trong quy trình
   */
  async checkFeatureAccess(userId: string, featureCode: string): Promise<boolean> {
    const processKey = await this.getDefaultFlowId(userId);
    if (!processKey) {
      return true; 
    }
    const flowInfo = await this.userService.getUserFlowInfo(userId, processKey);
    if (flowInfo) return true;

    const roleInfo = await this.sqlsvRepo.getUserRole(userId, processKey);
    if (roleInfo) return true;

    const permissions = await this.sqlsvRepo.getUserPermissions(userId, processKey);
    if (permissions.includes(featureCode)) {
      return true;
    }

    throw new ForbiddenException(`Vai trò của bạn chưa được cấp quyền sử dụng chức năng này`);
  }

  private async getDefaultFlowId(userId: string): Promise<string | undefined> {
    const user = await this.sqlsvRepo.getUserById(userId);
    const flow = await this.sqlsvRepo.getFlowByUnit(user?.parent?.id, 'VehicleRegistration');
    if (!flow?.id) {
      return 'QUY_TRINH_DANG_KY_XE';
    } else {
      return flow.id;
    }
  }

  private async getRegistration(id: string): Promise<VehicleRegistrationEntity> {
    const item = await this.vehicleRegistrationRepo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Không tìm thấy yêu cầu đăng ký xe với ID: ${id}`);
    }
    return item;
  }
}
