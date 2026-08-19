import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { Repository } from 'typeorm';
import { POSITION_LEVEL } from '../../variables/CONST_STATUS';
import { isSuperAdminByKeycloakId } from 'src/utils/super-admin.util';
import { UsersService } from 'src/users/users.service';

function checkIsAdmin(staticPermissions: any[]): boolean {
    if (!staticPermissions || !Array.isArray(staticPermissions)) {
        return false;
    }
    return staticPermissions.some((permission) => permission.code === 'ADMIN');
}

@Injectable()
export class AdminGuard implements CanActivate {
    private readonly logger = new Logger(AdminGuard.name);

    constructor(
        @InjectRepository(UserEntity, 'mssqlConnection')
        private readonly userRepo: Repository<UserEntity>,
        private readonly usersService: UsersService,
    ) { }

    private isUserSyncRequest(request: any): boolean {
        const url = request?.originalUrl || request?.url || '';
        return typeof url === 'string' && url.includes('/user-sync/');
    }

    private logUserSyncAdminFailure(request: any, reason: string, details?: Record<string, any>) {
        if (!this.isUserSyncRequest(request)) return;

        this.logger.warn(
            `[UserSyncAdminGuard] ${reason} method=${request?.method || ''} url=${request?.originalUrl || request?.url || ''} user=${request?.user?.userId || request?.user?.user || 'unknown'} details=${JSON.stringify(details || {})}`,
        );
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user; // { userId: ... } or { user: ... }

        if (!user || (!user.userId && !user.user)) {
            this.logUserSyncAdminFailure(request, 'admin guard missing request user');
            throw new UnauthorizedException('Người dùng chưa đăng nhập');
        }

        const userId = user.userId || user.user;

        // 1. Super Admin bypass (so sánh cả userId lẫn keycloakUserId)
        if (isSuperAdminByKeycloakId(userId)) {
            return true;
        }

        // Tìm user trong DB để check keycloakUserId
        const userData = await this.userRepo.findOne({
            where: { id: userId },
            select: ['id', 'position', 'role', 'keycloakUserId'],
        });

        if (!userData) {
            this.logUserSyncAdminFailure(request, 'admin guard user not found', { userId });
            throw new UnauthorizedException('Không tìm thấy thông tin người dùng');
        }

        // Check keycloakUserId với SUPER_ADMIN
        if (userData.keycloakUserId && isSuperAdminByKeycloakId(userData.keycloakUserId)) {
            return true;
        }

        // 2. Check qua staticPermissions (role có code = 'ADMIN')
        try {
            const roleInfo = await this.usersService.findProcessRoleInfoById(userId);
            if (roleInfo?.isSuperAdmin) {
                return true;
            }
            if (checkIsAdmin(roleInfo?.staticPermissions)) {
                return true;
            }
        } catch (error) {
            this.logUserSyncAdminFailure(request, 'admin role lookup failed', {
                userId,
                error: error?.message || String(error),
            });
            // Nếu lỗi khi lấy roleInfo, tiếp tục kiểm tra fallback bên dưới
            console.error(error);
        }

        // 3. Fallback: Check by Position Level (Admin = 0)
        if (userData.position && POSITION_LEVEL[userData.position] === POSITION_LEVEL.Admin) {
            return true;
        }

        // 4. Fallback: Check by Role string
        if (userData.role) {
            const roleLower = userData.role.toLowerCase();
            if (roleLower.includes('admin') || roleLower.includes('quản trị') || roleLower.includes('administrator')) {
                return true;
            }
        }

        this.logUserSyncAdminFailure(request, 'admin permission denied', {
            userId,
            position: userData.position || '',
            role: userData.role || '',
            keycloakUserId: userData.keycloakUserId || '',
        });
        throw new ForbiddenException('Bạn không có quyền truy cập (Yêu cầu quyền Admin)');
    }
}
