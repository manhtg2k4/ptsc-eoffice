import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from 'src/users/users.service';
import { isSuperAdminByKeycloakId } from 'src/utils/super-admin.util';
import { STATIC_PERMISSION_KEY, StaticPermissionRequirement } from '../decorators/static-permission.decorator';

@Injectable()
export class StaticPermissionGuard implements CanActivate {
  constructor(
    private readonly usersService: UsersService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request?.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('Người dùng chưa đăng nhập');
    }

    // Super Admin bypass
    if (isSuperAdminByKeycloakId(userId)) {
      return true;
    }

    // Skip permission check for driver selection (TAIXEXE group users list)
    if (request.params?.groupCode === 'TAIXEXE') {
      return true;
    }

    const requirements = this.reflector.getAllAndOverride<StaticPermissionRequirement[]>(
      STATIC_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    const roleInfo = await this.usersService.findProcessRoleInfoById(userId);
    const staticPermissions = roleInfo?.staticPermissions || [];

    // 1. Nếu không có decorator @RequireStaticPermission, cho phép tất cả người dùng đã đăng nhập
    if (!requirements) {
      return true;
    }

    // 2. Nếu có decorator nhưng để trống @RequireStaticPermission(), yêu cầu ít nhất một quyền hệ thống bất kỳ
    if (requirements.length === 0) {
      if (staticPermissions.length > 0) return true;
      throw new ForbiddenException('Bạn không có quyền truy cập. Yêu cầu ít nhất một quyền hệ thống.');
    }

    // Kiểm tra xem user có thỏa mãn TẤT CẢ các yêu cầu (AND logic)
    const allRequirementsMet = requirements.every(req => {
      return staticPermissions.some((sp: any) => {
        // Nếu user có quyền ADMIN thì được phép làm tất cả mọi thứ
        if (sp.code === 'ADMIN') return true;

        const matchesCode = sp.code === req.code;
        const matchesAction = !req.action || (sp.permissions && sp.permissions.includes(req.action));
        return matchesCode && matchesAction;
      });
    });

    if (allRequirementsMet) {
      return true;
    }

    throw new ForbiddenException('Bạn không có quyền thực hiện hành động này. Yêu cầu đủ các quyền: ' + requirements.map(r => r.code).join(', '));
  }
}
