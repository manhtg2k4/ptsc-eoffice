import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupUserEntity } from '../group-users/entities/group-users.entity';
import { ROLES_KEY } from './decorator/roles.decorator';
import { PROCESS_KEY } from './decorator/process-key.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(GroupUserEntity, 'mssqlConnection')
    private readonly groupUserRepository: Repository<GroupUserEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const processKey = this.reflector.getAllAndOverride<string>(PROCESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu không yêu cầu role, cho phép qua
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const userId = user?.userId;

    if (!userId) {
      throw new ForbiddenException('Bạn cần đăng nhập để thực hiện hành động này');
    }

    try {
      const userGroups = await this.groupUserRepository
        .createQueryBuilder('gu')
        .innerJoin('user_group_users', 'ugu', 'gu.id = ugu.group_user_id')
        .where('ugu.user_id = :userId', { userId })
        .andWhere('gu.status = :status', { status: 1 })
        .select(['gu.roles_dynamic'])
        .getMany();

      const userRoles: string[] = [];
      for (const group of userGroups) {
        let rolesDynamic = group.roles_dynamic;
        if (typeof rolesDynamic === 'string') {
          try {
            rolesDynamic = JSON.parse(rolesDynamic);
          } catch (e) {
            rolesDynamic = [];
          }
        }
        if (Array.isArray(rolesDynamic)) {
          for (const r of rolesDynamic) {
            if (r.processKey === processKey && r.roleCode) {
              userRoles.push(r.roleCode);
            }
          }
        }
      }

      const hasRole = requiredRoles.some((role) => userRoles.includes(role));
      if (!hasRole) {
          throw new ForbiddenException(
            `Bạn không có quyền truy cập. Yêu cầu một trong các vai trò: [${requiredRoles.join(', ')}] trong quy trình [${processKey || 'N/A'}]`
          );
      }

      return true;
    } catch (e) {
      if (e instanceof ForbiddenException) throw e;
      throw new ForbiddenException('Lỗi kiểm tra quyền người dùng');
    }
  }
}
