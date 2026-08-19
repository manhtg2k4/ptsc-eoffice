import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProjectService } from '../project.service';
import { PROJECT_PERMISSION_KEY } from '../decorators/project-permission.decorator';
import { ProjectRolePermissionEntity } from '../entities/project-permission.entity';

@Injectable()
export class ProjectPermissionGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private projectService: ProjectService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermission = this.reflector.getAllAndOverride<keyof ProjectRolePermissionEntity>(
            PROJECT_PERMISSION_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredPermission) {
            return true;
        }

        const PERMISSION_NAMES: Record<string, string> = {
            updateStatus: 'Cập nhật trạng thái',
            updateGeneralInfo: 'Cập nhật thông tin chung',
            updateParticipants: 'Cập nhật thành viên',
            uploadFiles: 'Tải lên tệp tin',
            comment: 'Bình luận',
            inputDelayReason: 'Nhập lý do chậm trễ',
            viewAnalysis: 'Xem phân tích/thống kê',
            setPermissions: 'Thiết lập quyền hạn',
        };

        const permissionLabel = PERMISSION_NAMES[requiredPermission] || requiredPermission;

        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const body = request.body;
        const params = request.params;

        // Lấy projectId từ params hoặc body
        const projectId = params.id || params.projectId || body.projectId;

        if (!projectId) {
            return true; // Nếu không có projectId, cho phép pass qua (có thể check thêm ở service)
        }

        if (!user || !user.userId) {
            throw new ForbiddenException('Bạn cần đăng nhập để thực hiện hành động này');
        }

        const hasPermission = await this.projectService.hasPermission(
            user.userId,
            +projectId,
            requiredPermission,
        );

        if (!hasPermission) {
            throw new ForbiddenException(
                `Bạn không có quyền [${permissionLabel}] trong dự án này`,
            );
        }

        return true;
    }
}
