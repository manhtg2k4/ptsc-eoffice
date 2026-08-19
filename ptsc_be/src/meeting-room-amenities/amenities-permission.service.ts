import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AmenitiesEntity } from './entities/amenities.entity';
import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AmenitiesPermissionService {
  constructor(
    @InjectRepository(AmenitiesEntity, 'mssqlConnection')
    private readonly amenitiesRepo: Repository<AmenitiesEntity>,
    private readonly sqlsvRepo: SQLSVRepository,
    private readonly sqlRepo: MSSQLRepository,
    private readonly userService: UsersService,
  ) {}

  /** Kiểm tra quyền tạo amenities */
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
  async checkUpdate(userId: string, amenitiesId: string): Promise<boolean> {
    await this.ensureAmenitiesExists(amenitiesId);

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
  async checkDelete(userId: string, amenitiesId: string): Promise<boolean> {
    await this.ensureAmenitiesExists(amenitiesId);

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
  async checkView(userId: string, amenitiesId: string): Promise<boolean> {
    await this.ensureAmenitiesExists(amenitiesId);

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
  async checkProcess(userId: string, amenitiesId: string): Promise<boolean> {
    await this.ensureAmenitiesExists(amenitiesId);
    const openWorkItems = await this.sqlRepo.listOpenWorkItems(amenitiesId);

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

  /** Lấy processKey mặc định theo user */
  private async getDefaultFlowId(userId: string): Promise<string | undefined> {
    const user = await this.sqlsvRepo.getUserById(userId);
    const flow = await this.sqlsvRepo.getFlowByUnit(user?.parent?.id, 'TaskMetting');

    if (!flow?.id) {
        return 'QUY_TRINH_PHONG_HOP';
    } else {
        return flow.id;
    }
  }

  /** Đảm bảo amenities tồn tại */
  private async ensureAmenitiesExists(id: string): Promise<void> {
    const item = await this.amenitiesRepo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Không tìm thấy tiện ích với ID: ${id}`);
    }
  }
}