import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { checkIsAdmin } from 'src/utils/util';

@Injectable()
export class ChangePasswordGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request?.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('Người dùng chưa đăng nhập');
    }

    const targetUserId = request?.params?.id;

    // Case 1: User tự đổi mật khẩu của chính mình
    if (targetUserId && targetUserId === userId) {
      return true;
    }

    // Case 2: Admin hoặc user được phân quyền admin đổi mật khẩu cho user khác
    const roleInfo = await this.usersService.findProcessRoleInfoById(userId);
    const isAdminRole = roleInfo?.roleCodes?.includes('ADMIN');
    const hasAdminPermission = checkIsAdmin(roleInfo?.staticPermissions);

    if (isAdminRole || hasAdminPermission) {
      return true;
    }

    // Không có quyền
    throw new ForbiddenException(
      'Bạn không có quyền thay đổi mật khẩu. Chỉ admin hoặc người được phân quyền admin mới được phép.',
    );
  }
}