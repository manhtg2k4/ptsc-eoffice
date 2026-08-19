import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthConfigPermissionService } from '../auth-config-permission.service';
import { AUTH_CONFIG_PERMISSION_KEY, AuthConfigPermissionAction } from '../decorators/auth-config-permission.decorator';

@Injectable()
export class AuthConfigPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly authConfigPermissionService: AuthConfigPermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<AuthConfigPermissionAction>(
      AUTH_CONFIG_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Nếu không có decorator, mặc định cho phép (hoặc bạn có thể chọn chặn tất cả)
    if (!action) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const userId = user?.userId;

    if (!userId) {
      throw new ForbiddenException('Người dùng chưa đăng nhập');
    }

    return this.authConfigPermissionService.checkPermission(userId, action);
  }
}
