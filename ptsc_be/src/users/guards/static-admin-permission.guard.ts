import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { isSuperAdminByKeycloakId } from 'src/utils/super-admin.util';

function checkIsAdmin(staticPermissions: any[]): boolean {
  if (!staticPermissions || !Array.isArray(staticPermissions)) {
    return false;
  }
  return staticPermissions.some((permission) => permission.code === 'ADMIN');
}

@Injectable()
export class StaticAdminPermissionGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request?.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('Người dùng chưa đăng nhập');
    }

    // Super Admin bypass - Super Admin có quyền làm mọi thứ
    if (isSuperAdminByKeycloakId(userId)) {
      return true;
    }

    const targetUserId =
      request?.params?.id ||
      request?.params?.userId ||
      request?.body?.userId ||
      request?.body?.id;

    // Lấy HTTP method từ request
    const method = request?.method?.toUpperCase();
    const url = request?.url || '';

    // Kiểm tra các hành động nhạy cảm cần thêm quyền hạn
    const isBlockAction = url.includes('/block') || url.includes('/unBlock');
    const isDeleteAction = method === 'DELETE' && targetUserId;

    // 1. Ngăn tự thao tác trên chính mình (block/unblock/delete)
    if (targetUserId && targetUserId === userId) {
      if (isBlockAction) {
        throw new ForbiddenException('Không thể block/unblock tài khoản của chính bạn');
      }
      if (isDeleteAction) {
        throw new ForbiddenException('Không thể xóa tài khoản của chính bạn');
      }
    }

    // 2. Ngăn admin thường thao tác trên Super Admin
    if (targetUserId && isSuperAdminByKeycloakId(targetUserId)) {
      throw new ForbiddenException('Không thể thao tác trên tài khoản Super Admin');
    }

    // 3. Kiểm tra quyền admin cho các thao tác quản lý người dùng
    // Chỉ admin (role code = ADMIN) hoặc được phân quyền admin mới được phép
    if (isBlockAction || isDeleteAction || method === 'POST' || method === 'PATCH' || method === 'PUT') {
      const roleInfo = await this.usersService.findProcessRoleInfoById(userId);

      // Kiểm tra 2 điều kiện:
      // 1. User có role ADMIN chính thức
      // 2. HOẶC user được phân quyền admin qua static permissions
      const isAdminRole = roleInfo?.roleCodes?.includes('ADMIN');
      const hasAdminPermission = checkIsAdmin(roleInfo?.staticPermissions);

      if (!isAdminRole && !hasAdminPermission) {
        throw new ForbiddenException(
          'Bạn không có quyền thao tác. Chỉ admin hoặc người được phân quyền admin mới được phép.',
        );
      }
    }

    return true;
  }
}

