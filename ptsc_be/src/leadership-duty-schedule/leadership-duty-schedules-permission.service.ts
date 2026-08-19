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
import { LeadershipDutySchedule } from './entity/leadership-duty-schedule.entity';

@Injectable()
export class LeadershipDutySchedulesPermissionService {
  constructor(
    @InjectRepository(LeadershipDutySchedule, 'mssqlConnection')
    private readonly repo: Repository<LeadershipDutySchedule>,
    private readonly sqlsvRepo: SQLSVRepository,
    private readonly userService: UsersService,
    private readonly sqlRepo: MSSQLRepository,
  ) {}

  async checkCreate(userId: string, flowConfig?: string): Promise<boolean> {
    const processKey = flowConfig || (await this.getDefaultFlowId(userId));
    if (!processKey) return true;

    const flowInfo = await this.userService.getUserFlowInfo(userId, processKey);
    if (flowInfo) return true;

    const roleInfo = await this.sqlsvRepo.getUserRole(userId, processKey);
    if (roleInfo) return true;

    throw new ForbiddenException('Bạn không có quyền tạo tiện ích này');
}

/** Kiểm tra quyền cập nhật amenities */
async checkUpdate(userId: string, id: string): Promise<boolean> {
    await this.getRecord(id);

    const processKey = await this.getDefaultFlowId(userId);
    if (processKey) {
        const flowInfo = await this.userService.getUserFlowInfo(userId, processKey);
        if (flowInfo) return true;

        const roleInfo = await this.sqlsvRepo.getUserRole(userId, processKey);
        if (roleInfo?.permissions?.includes('EDIT')) return true;
    }

    throw new ForbiddenException('Bạn không có quyền chỉnh sửa tiện ích này');
}

/** Kiểm tra quyền xóa amenities */
async checkDelete(userId: string, id: string): Promise<boolean> {
    await this.getRecord(id);

    const processKey = await this.getDefaultFlowId(userId);
    if (processKey) {
        const flowInfo = await this.userService.getUserFlowInfo(userId, processKey);
        if (flowInfo) return true;

        const roleInfo = await this.sqlsvRepo.getUserRole(userId, processKey);
        if (roleInfo?.permissions?.includes('DELETE')) return true;
    }

    throw new ForbiddenException('Bạn không có quyền xóa tiện ích này');
}

/** Kiểm tra quyền xem amenities */
async checkView(userId: string, id: string): Promise<boolean> {
    await this.getRecord(id);

    const processKey = await this.getDefaultFlowId(userId);
    if (processKey) {
        const flowInfo = await this.userService.getUserFlowInfo(userId, processKey);
        if (flowInfo) return true;

        const roleInfo = await this.sqlsvRepo.getUserRole(userId, processKey);
        if (roleInfo) return true;
    }

    throw new ForbiddenException('Bạn không có quyền xem tiện ích này');
}

/** Kiểm tra quyền xử lý workflow */
async checkProcess(userId: string, id: string): Promise<boolean> {
    await this.getRecord(id);
    const openWorkItems = await this.sqlRepo.listOpenWorkItems(id);

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

    throw new ForbiddenException('Bạn không có quyền xử lý tiện ích này tại bước hiện tại');
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

    throw new ForbiddenException('Vai trò của bạn chưa được cấp quyền chức năng này');
}

  private async getDefaultFlowId(userId: string): Promise<string | undefined> {
    const user = await this.sqlsvRepo.getUserById(userId);

    const flow = await this.sqlsvRepo.getFlowByUnit(
      user?.parent?.id,
      'TravelWorkSchedule',
    );
    if (!flow?.id) {
      return 'LICH_TRUC_BAN_LANH_DAO';
    } else {
      return flow.id;
    }
  }

  private async getRecord(id: string): Promise<LeadershipDutySchedule> {
    const item = await this.repo.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException('Không tìm thấy lịch công tác lãnh đạo');
    }

    return item;
  }
}