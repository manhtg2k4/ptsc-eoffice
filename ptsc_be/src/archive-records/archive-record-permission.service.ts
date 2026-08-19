import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { ArchiveRecord } from './entities/archive-record.entity';
import { UsersService } from 'src/users/users.service';
import { RuntimeDbService } from 'src/bpmn/runtime-dbmssql.service';
import { POSITION_LEVEL } from 'src/variables/CONST_STATUS';

@Injectable()
export class ArchiveRecordPermissionService {
  constructor(
    @InjectRepository(ArchiveRecord, 'mssqlConnection')
    private readonly archiveRecordRepo: Repository<ArchiveRecord>,
    private readonly sqlsvRepo: SQLSVRepository,
    private readonly userService: UsersService,
    private readonly sqlRepo: MSSQLRepository,
    private readonly runtimeDbService: RuntimeDbService,
  ) { }

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

  private async hasAuditAccess(userId: string, recordId: string): Promise<boolean> {
    return this.sqlRepo.checkAuditAccess(recordId, userId);
  }

  async checkCreate(userId: string, flowConfig: string): Promise<boolean> {
    if (await this.isAdmin(userId)) return true;
    const processKey = await this.getDefaultFlowId(userId);
    if (!processKey) throw new ForbiddenException('Bạn chưa được phân quyền cho chức năng này');

    // 1. Lấy BPMN XML
    const bpmnXML = await this.sqlRepo.getBpmnFile(processKey);
    if (!bpmnXML) {
      // Nếu không có BPMN, fallback về check quyền role feature
      const hasPerm = await this.userService.isUserInFlowQuick(userId, processKey);
      if (hasPerm) return true;
      throw new ForbiddenException('Bạn không có quyền tạo yêu cầu');
    }

    const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);

    // 2. Lấy các role có thể bắt đầu quy trình
    const startEventRoleCodes: string[] = Array.from(indexes.nodes.values())
      .filter((n: any) => n.$type === 'bpmn:StartEvent')
      .map((n: any) => indexes.laneMap.get(n.id))
      .filter((r): r is string => !!r);

    if (startEventRoleCodes.length > 0) {
      const hasDirect = await this.userService.checkDirectRoleInFlow(userId, processKey, startEventRoleCodes);
      if (hasDirect) return true;

      const hasGroup = await this.userService.checkUserInFlow(userId, processKey, startEventRoleCodes);
      if (hasGroup) return true;
    } else {
      // Nếu StartEvent không trong lane nào, check xem user có quyền chung trong flow không
      const hasPerm = await this.userService.isUserInFlowQuick(userId, processKey);
      if (hasPerm) return true;
    }

    throw new ForbiddenException('Bạn không có quyền tạo yêu cầu (Vai trò của bạn không được phép khởi tạo)');
  }

  async checkUpdate(userId: string, recordId: string): Promise<boolean> {
    if (await this.isAdmin(userId)) return true;
    const processKey = await this.getDefaultFlowId(userId);
    if (!processKey) throw new ForbiddenException('Bạn chưa được phân quyền cho chức năng này')
    let hasPerm = false;
    if (processKey) {
      hasPerm = await this.userService.isUserInFlowQuick(userId, processKey);
    }
    if (hasPerm) {
      const isVanThuTct = (await this.userService.checkDirectRoleInFlow(userId, processKey, ['HSLT_VANTHU_TCT'])) ||
        (await this.userService.checkUserInFlow(userId, processKey, ['HSLT_VANTHU_TCT']));
      if (isVanThuTct) return true;

      const item = await this.getRecord(recordId);
      if (item?.createdBy === userId) return true;
    }

    throw new ForbiddenException('Bạn không có quyền chỉnh sửa yêu cầu này');
  }

  async checkDelete(userId: string, recordId: string | string[]): Promise<boolean> {
    if (await this.isAdmin(userId)) return true;
    const processKey = await this.getDefaultFlowId(userId);
    if (!processKey) throw new ForbiddenException('Bạn chưa được phân quyền cho chức năng này')
    let hasPerm = false;
    if (processKey) {
      hasPerm = await this.userService.isUserInFlowQuick(userId, processKey);
    }
    if (hasPerm) {
      const isVanThuTct = (await this.userService.checkDirectRoleInFlow(userId, processKey, ['HSLT_VANTHU_TCT'])) ||
        (await this.userService.checkUserInFlow(userId, processKey, ['HSLT_VANTHU_TCT']));
      const ids = Array.isArray(recordId) ? recordId : [recordId];
      for (const id of ids) {
        if (!id) continue;
        const item = await this.getRecord(id);
        if (item?.createdBy !== userId && !isVanThuTct) {
          throw new ForbiddenException(`Bạn không có quyền xóa yêu cầu này. Yêu cầu ${item?.fileCode || item?.title || id} phải là văn thư tổng công ty hoặc admin`);
        }
      }
      return true;
    }

    throw new ForbiddenException('Bạn không có quyền xóa yêu cầu này');
  }

  async checkView(userId: string, recordId: string): Promise<boolean> {
    // 1. Check if user is the creator
    const record = await this.getRecord(recordId);
    if (record?.createdBy === userId) return true;

    // 2. Check quyền trong luồng Hồ sơ lưu trữ (Mặc định)
    const processKey = await this.getDefaultFlowId(userId);
    if (processKey) {
      const hasPerm = await this.userService.isUserInFlowQuick(userId, processKey);
      if (hasPerm) return true;
    }

    // 3. Check quyền trong luồng Khai thác hồ sơ
    const miningProcessKey = await this.getMiningFlowId(userId);
    if (miningProcessKey) {
      const hasPerm = await this.userService.isUserInFlowQuick(userId, miningProcessKey);
      if (hasPerm) return true;
    }

    // 4. Check quyền trong luồng Tiêu hủy hồ sơ
    const destructionProcessKey = await this.getDestructionFlowId(userId);
    if (destructionProcessKey) {
      const hasPerm = await this.userService.isUserInFlowQuick(userId, destructionProcessKey);
      if (hasPerm) return true;
    }

    // 5. Check if record is linked to an exploitation request that the user has access to
    const hasExploitationAccess = await this.sqlRepo.checkRecordInExploitation(recordId, userId);
    if (hasExploitationAccess) return true;

    // 6. Check if record is linked to a destruction request that the user has access to
    const hasDestructionAccess = await this.sqlRepo.checkRecordInDestruction(recordId, userId);
    if (hasDestructionAccess) return true;

    // 7. Check Audit Access (Đã từng xử lý hồ sơ này)
    const hasAudit = await this.hasAuditAccess(userId, recordId);
    if (hasAudit) return true;

    throw new ForbiddenException('Bạn không có quyền xem chi tiết hồ sơ này');
  }

  async checkViewFolder(userId: string): Promise<boolean> {
    // 1. Check quyền trong luồng Hồ sơ lưu trữ (Mặc định)
    const processKey = await this.getDefaultFlowId(userId);
    if (processKey) {
      const hasPerm = await this.userService.isUserInFlowQuick(userId, processKey);
      if (hasPerm) return true;
    }

    throw new ForbiddenException('Bạn không có quyền xem danh sách hồ sơ này');
  }


  async checkProcess(userId: string, recordId: string): Promise<boolean> {
    const processKey = await this.getDefaultFlowId(userId);
    if (!processKey) throw new ForbiddenException('Bạn chưa được phân quyền cho chức năng này')

    const flowInfo = await this.userService.getUserFlowInfo(userId, processKey);
    if (flowInfo) return true;

    const roleInfo = await this.sqlsvRepo.getUserRole(userId, processKey);
    if (roleInfo) return true;


    throw new ForbiddenException(
      'Bạn không có quyền thực hiện thao tác này tại bước quy trình này',
    );
  }

  async checkFeatureAccess(userId: string, featureCode: string): Promise<boolean> {
    // 1. Check Archive Process
    const processKey = await this.getDefaultFlowId(userId);
    if (processKey) {
      const hasPerm = await this.userService.isUserInFlowQuick(userId, processKey);
      if (hasPerm) return true;
    }

    // 2. Check Mining Process
    const miningProcessKey = await this.getMiningFlowId(userId);
    if (miningProcessKey) {
      const hasPerm = await this.userService.isUserInFlowQuick(userId, miningProcessKey);
      if (hasPerm) return true;
    }

    // 3. Check Destruction Process
    const destructionProcessKey = await this.getDestructionFlowId(userId);
    if (destructionProcessKey) {
      const hasPerm = await this.userService.isUserInFlowQuick(userId, destructionProcessKey);
      if (hasPerm) return true;
    }

    throw new ForbiddenException(
      `Vai trò của bạn chưa được cấp quyền sử dụng chức năng này`,
    );
  }

  private async getDefaultFlowId(userId: string): Promise<string | undefined> {
    const user = await this.sqlsvRepo.getUserById(userId);
    const flow = await this.sqlsvRepo.getFlowByUnit(
      user?.parent?.id,
      'ArchiveRecord',
    );

    if (!flow?.id) {
      return 'hosoluutru';
    } else {
      return flow.id;
    }
  }

  private async getMiningFlowId(userId: string): Promise<string | undefined> {
    const user = await this.sqlsvRepo.getUserById(userId);
    const flow = await this.sqlsvRepo.getFlowByUnit(
      user?.parent?.id,
      'MiningProcess',
    );

    return flow?.id || 'QUY_TRINH_KHAI_THAC_HO_SO';
  }

  private async getDestructionFlowId(userId: string): Promise<string | undefined> {
    const user = await this.sqlsvRepo.getUserById(userId);
    const flow = await this.sqlsvRepo.getFlowByUnit(
      user?.parent?.id,
      'DestructionProcess',
    );

    return flow?.id || 'DestructionProcess';
  }

  private async getRecord(id: string) {
    const item = await this.archiveRecordRepo.findOne({ where: { id } });
    if (!item) {
      return null;
    }
    return item;
  }
}