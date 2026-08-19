import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DestroyRecordEntity } from './destroy-records.entity';
import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { UsersService } from 'src/users/users.service';
import { RuntimeDbService } from 'src/bpmn/runtime-dbmssql.service';
import { POSITION_LEVEL } from 'src/variables/CONST_STATUS';

@Injectable()
export class DestroyRecordPermissionService {
  constructor(
    @InjectRepository(DestroyRecordEntity, 'mssqlConnection')
    private readonly destroyRecordRepo: Repository<DestroyRecordEntity>,
    private readonly sqlsvRepo: SQLSVRepository,
    private readonly sqlRepo: MSSQLRepository,
    private readonly userService: UsersService,
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

  private async hasAuditAccess(userId: string, documentId: string): Promise<boolean> {
    return this.sqlRepo.checkAuditAccess(documentId, userId);
  }

  private async isUserInProcess(userId: string, processKey: string): Promise<boolean> {
    if (!userId || !processKey) return false;

    const row = await this.destroyRecordRepo.manager.createQueryBuilder()
      .select('1')
      .from('roles_process', 'rp')
      .innerJoin('roles_process_groups', 'rpg', 'rpg.role_id = rp.id')
      .innerJoin('user_group_users', 'ugu', 'ugu.group_user_id = rpg.group_id')
      .innerJoin('users', 'u', 'u.id = ugu.user_id AND u.status = 1')
      .where('rp.is_active = 1')
      .andWhere('rp.process_key = :processKey', { processKey })
      .andWhere('ugu.user_id = :userId', { userId })
      .getRawOne();

    return !!row;
  }

  private async findUserRolesByUserId(
    userId: string,
    roleCodes: string[],
    processKey?: string,
  ): Promise<string[]> {
    if (!roleCodes?.length) return [];

    const qb = this.destroyRecordRepo.manager.createQueryBuilder()
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
    return rawResults.map((r: any) => r.roleCode);
  }

  /** Kiểm tra quyền tạo yêu cầu tiêu hủy */
  async checkCreate(userId: string, flowConfig: string): Promise<boolean> {
    if (await this.isAdmin(userId)) return true;
    if (!flowConfig) flowConfig = await this.getDefaultFlowId(userId) || '';
    if (!flowConfig) return false;

    // 1. Lấy BPMN XML
    const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig);
    if (!bpmnXML) {
      return false;
    }

    const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);

    // 2. Lấy các role có thể bắt đầu quy trình (từ StartEvent)
    const startEventRoleCodes: string[] = Array.from(indexes.nodes.values())
      .filter((n: any) => n.$type === 'bpmn:StartEvent')
      .map((n: any) => indexes.laneMap.get(n.id))
      .filter((r): r is string => !!r);

    if (!startEventRoleCodes.length) {
      throw new ForbiddenException('Quy trình chưa được cấu hình điểm bắt đầu hợp lệ');
    }

    // 3. Kiểm tra user có ít nhất một trong các role này không qua phân quyền kiểu mới
    const laneRoleCodes: string[] = (Object.values(indexes.lanes || {}) as any[])
      .map(l => l.role)
      .filter((r): r is string => !!r);

    const userRoleCodes = await this.findUserRolesByUserId(userId, laneRoleCodes, flowConfig);

    if (!userRoleCodes.length) {
      throw new ForbiddenException('Bạn không có quyền tạo yêu cầu tiêu hủy này');
    }

    const canStart = startEventRoleCodes.some(role => userRoleCodes.includes(role));
    if (!canStart) {
      throw new ForbiddenException('Bạn không có quyền tạo yêu cầu tiêu hủy này (Vai trò của bạn không nằm trong Lane khởi tạo)');
    }

    return true;
  }

  /** Kiểm tra quyền cập nhật yêu cầu tiêu hủy */
  async checkUpdate(userId: string, destroyRecordId: string): Promise<boolean> {
    if (await this.isAdmin(userId)) return true;
    const processKey = await this.getDefaultFlowId(userId);
    if (!processKey) throw new ForbiddenException('Bạn chưa được phân quyền cho chức năng này');
    
    const hasPerm = await this.isUserInProcess(userId, processKey);
    if (hasPerm) {
      const item = await this.getDestroyRecord(destroyRecordId);
      if (item.createdBy === userId) return true;
    }

    throw new ForbiddenException('Bạn không có quyền chỉnh sửa yêu cầu tiêu hủy này');
  }

  /** Kiểm tra quyền xóa yêu cầu tiêu hủy */
  async checkDelete(userId: string, destroyRecordId: string | string[]): Promise<boolean> {
    if (await this.isAdmin(userId)) return true;
    const processKey = await this.getDefaultFlowId(userId);
    if (!processKey) throw new ForbiddenException('Bạn chưa được phân quyền cho chức năng này');
    
    const hasPerm = await this.isUserInProcess(userId, processKey);
    if (hasPerm) {
      const ids = Array.isArray(destroyRecordId) ? destroyRecordId : [destroyRecordId];
      for (const id of ids) {
        if (!id) continue;
        const item = await this.getDestroyRecord(id);
        if (item.createdBy !== userId) {
          throw new ForbiddenException(`Bạn không có quyền xóa yêu cầu tiêu hủy này. Yêu cầu ${item?.destroyBatchCode || item?.destroyBatchName || id} phải là người tạo hoặc admin`);
        }
      }
      return true;
    }

    throw new ForbiddenException('Bạn không có quyền xóa yêu cầu tiêu hủy này');
  }

  /** Kiểm tra quyền xem chi tiết yêu cầu */
  async checkView(userId: string, destroyRecordId: string): Promise<boolean> {
    const processKey = await this.getDefaultFlowId(userId);
    if (!processKey) throw new ForbiddenException('Bạn chưa được phân quyền cho chức năng này');
    
    const hasPerm = await this.isUserInProcess(userId, processKey);
    if (hasPerm) return true;

    const item = await this.getDestroyRecord(destroyRecordId);
    if (item.createdBy === userId) return true;

    const hasAudit = await this.hasAuditAccess(userId, destroyRecordId);
    if (hasAudit) return true;

    throw new ForbiddenException('Bạn không có quyền xem chi tiết yêu cầu tiêu hủy này');
  }

  /** Kiểm tra quyền thực hiện thao tác workflow */
  async checkProcess(userId: string, destroyRecordId: string): Promise<boolean> {
    const processKey = await this.getDefaultFlowId(userId);
    if (!processKey) throw new ForbiddenException('Bạn chưa được phân quyền cho chức năng này');
    
    const hasPerm = await this.isUserInProcess(userId, processKey);
    if (hasPerm) {
      const item = await this.getDestroyRecord(destroyRecordId);
      const openWorkItems = await this.sqlRepo.listOpenWorkItems(destroyRecordId);

      if (openWorkItems.some(wi => wi.assigneeUserId === userId)) return true;

      if (item.bpmnVersion) {
        const roleInfo = await this.sqlsvRepo.getUserRole(userId, item.bpmnVersion);
        if (roleInfo) {
          if (openWorkItems.some(
            wi => wi.role === roleInfo.roleCode && (!wi.assigneeUserId || wi.assigneeUserId === ''),
          )) return true;
        }
      }

      if (item.createdBy === userId && item.statusCode && ['0', '4', '6', '7'].includes(item.statusCode)) return true;

      const hasAudit = await this.hasAuditAccess(userId, destroyRecordId);
      if (hasAudit) return true;
    }

    throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này tại bước quy trình này');
  }

  /** Kiểm tra quyền truy cập mã chức năng (Feature Code) */
  async checkFeatureAccess(userId: string, featureCode: string): Promise<boolean> {
    const processKey = await this.getDefaultFlowId(userId);
    if (!processKey) return true;

    // Chỉ dùng phân quyền kiểu mới
    const roleInfo = await this.sqlsvRepo.getUserRole(userId, processKey);
    if (roleInfo && roleInfo.permissions && roleInfo.permissions.includes(featureCode)) {
      return true;
    }

    throw new ForbiddenException('Vai trò của bạn chưa được cấp quyền sử dụng chức năng này');
  }

  private async getDefaultFlowId(userId: string): Promise<string | undefined> {
    const user = await this.sqlsvRepo.getUserById(userId);
    const flow = await this.sqlsvRepo.getFlowByUnit(user?.parent?.id, 'DestructionProcess');
    return flow?.id;
  }

  private async getDestroyRecord(id: string): Promise<DestroyRecordEntity> {
    const item = await this.destroyRecordRepo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Không tìm thấy yêu cầu tiêu hủy với ID: ${id}`);
    }
    return item;
  }
}