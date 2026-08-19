import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from 'src/users/users.service';
import { SQLSVRepository } from 'src/database/sqlsvRepo';

@Injectable()
export class LeadersPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly usersService: UsersService,
    private readonly sqlsvRepo: SQLSVRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user || request.effectiveUser;
    const userId = user?.userId || request.userId;


    if (!userId) {
      throw new ForbiddenException('Người dùng chưa đăng nhập');
    }

    try {
      // Get the process key for TravelWorkSchedule flow
      const processKey = await this.getDefaultFlowId(userId);

      if (!processKey) {
        return true;
      }

      // Check if user has flow info (workflow configuration)
      const flowInfo = await this.usersService.getUserFlowInfo(userId, processKey);

      if (flowInfo) {
        return true;
      }

      // Check if user has a role with any permissions for this process
      const roleInfo = await this.sqlsvRepo.getUserRole(userId, processKey);

      if (roleInfo && roleInfo.permissions && Array.isArray(roleInfo.permissions) && roleInfo.permissions.length > 0) {
        return true;
      }

      throw new ForbiddenException('Bạn không có quyền xem danh sách lãnh đạo. Cần có quyền truy cập ít nhất một trong "Lịch trực ban lãnh đạo" hoặc "Lịch công tác".');
    } catch (error) {
      console.error('[LeadersPermissionGuard] Error during permission check:', error);
      throw new ForbiddenException('Lỗi khi kiểm tra quyền truy cập');
    }
  }

  private async getDefaultFlowId(userId: string): Promise<string | undefined> {
    try {
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
    } catch (error) {
      console.error('[LeadersPermissionGuard] Error in getDefaultFlowId:', error);
      return 'LICH_TRUC_BAN_LANH_DAO';
    }
  }
}
