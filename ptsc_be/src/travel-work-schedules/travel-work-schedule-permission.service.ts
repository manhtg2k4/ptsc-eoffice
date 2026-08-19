import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { UsersService } from 'src/users/users.service';
import { TravelWorkScheduleEntity } from './entity/travel-work-schedules.entity';

@Injectable()
export class TravelWorkSchedulePermissionService {
  constructor(
    @InjectRepository(TravelWorkScheduleEntity, 'mssqlConnection')
    private readonly scheduleRepo: Repository<TravelWorkScheduleEntity>,
    private readonly sqlsvRepo: SQLSVRepository,
    private readonly sqlRepo: MSSQLRepository,
    private readonly userService: UsersService,
  ) {}

  /** Kiểm tra quyền tạo lịch công tác */
  async checkCreate(userId: string, flowConfig?: string): Promise<boolean> {
    const processKey = flowConfig || (await this.getDefaultFlowId(userId));
    if (!processKey) return true;

    const flowInfo = await this.userService.getUserFlowInfo(userId, processKey);
    if (flowInfo) return true;

    const roleInfo = await this.sqlsvRepo.getUserRole(userId, processKey);
    if (roleInfo) return true;

    throw new ForbiddenException('Bạn không có quyền tạo lịch công tác này');
  }

  /** Kiểm tra quyền cập nhật lịch công tác */
  async checkUpdate(userId: string, scheduleId: string): Promise<boolean> {
    await this.ensureScheduleExists(scheduleId);

    const processKey = await this.getDefaultFlowId(userId);
    if (processKey) {
      const flowInfo = await this.userService.getUserFlowInfo(userId, processKey);
      if (flowInfo) return true;

      const roleInfo = await this.sqlsvRepo.getUserRole(userId, processKey);
      if (roleInfo?.permissions?.includes('EDIT')) return true;
    }

    throw new ForbiddenException('Bạn không có quyền chỉnh sửa lịch công tác này');
  }

  /** Kiểm tra quyền xóa lịch công tác */
  async checkDelete(userId: string, scheduleId: string): Promise<boolean> {
    const item = await this.ensureScheduleExists(scheduleId);

    // Người tạo được xóa
    if (item.createdBy === userId) return true;

    const processKey = await this.getDefaultFlowId(userId);
    if (processKey) {
      const flowInfo = await this.userService.getUserFlowInfo(userId, processKey);
      if (flowInfo) return true;

      const roleInfo = await this.sqlsvRepo.getUserRole(userId, processKey);
      if (roleInfo?.permissions?.includes('DELETE')) return true;
    }

    throw new ForbiddenException('Bạn không có quyền xóa lịch công tác này');
  }

  /** Kiểm tra quyền xem lịch công tác */
  async checkView(userId: string, scheduleId: string): Promise<boolean> {
    const item = await this.ensureScheduleExists(scheduleId);

    if (item.createdBy === userId) return true;

    const processKey = await this.getDefaultFlowId(userId);
    if (processKey) {
      const flowInfo = await this.userService.getUserFlowInfo(userId, processKey);
      if (flowInfo) return true;

      const roleInfo = await this.sqlsvRepo.getUserRole(userId, processKey);
      if (roleInfo) return true;
    }

    throw new ForbiddenException('Bạn không có quyền xem lịch công tác này');
  }

  /** Kiểm tra quyền xử lý workflow lịch công tác */
  async checkProcess(userId: string, scheduleId: string): Promise<boolean> {
    const item = await this.ensureScheduleExists(scheduleId);
    const openWorkItems = await this.sqlRepo.listOpenWorkItems(scheduleId);

    if (openWorkItems.some(wi => wi.assigneeUserId === userId)) return true;

    const processKey = await this.getDefaultFlowId(userId);
    if (processKey) {
      const roleInfo = await this.sqlsvRepo.getUserRole(userId, processKey);
      if (roleInfo) {
        if (
          openWorkItems.some(
            wi =>
              wi.role === roleInfo.roleCode &&
              (!wi.assigneeUserId || wi.assigneeUserId === ''),
          )
        ) {
          return true;
        }
      }
    }

    throw new ForbiddenException('Bạn không có quyền xử lý lịch công tác này tại bước hiện tại');
  }

  /** Kiểm tra quyền theo feature */
  async checkFeatureAccess(userId: string, featureCode: string): Promise<boolean> {
    const processKey = await this.getDefaultFlowId(userId);
    if (!processKey) return true;

    const flowInfo = await this.userService.getUserFlowInfo(userId, processKey);
    if (flowInfo) return true;

    const roleInfo = await this.sqlsvRepo.getUserRole(userId, processKey);
    if (!roleInfo) throw new ForbiddenException('Bạn không có quyền truy cập chức năng này');

    const permissions = roleInfo.permissions || [];
    if (permissions.includes(featureCode)) return true;

    throw new ForbiddenException('Vai trò của bạn chưa được cấp quyền sử dụng chức năng này');
  }

  /** Lấy processKey mặc định theo user (thay 'ArchiveRecord' bằng 'LICH_TRUC_BAN_LANH_DAO') */
  private async getDefaultFlowId(userId: string): Promise<string | undefined> {
    const user = await this.sqlsvRepo.getUserById(userId);
    const flow = await this.sqlsvRepo.getFlowByUnit(
      user?.parent?.id,
      'TravelWorkSchedule',
    );
    if(!flow?.id) {
      return 'LICH_TRUC_BAN_LANH_DAO';
    } else {
      return flow.id;
    }
  }

  /** Đảm bảo lịch công tác tồn tại */
  private async ensureScheduleExists(id: string): Promise<TravelWorkScheduleEntity> {
    const item = await this.scheduleRepo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Không tìm thấy lịch công tác với ID: ${id}`);
    }
    return item;
  }
}