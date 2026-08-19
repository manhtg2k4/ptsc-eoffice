import { SetMetadata } from '@nestjs/common';
import { ProjectRolePermissionEntity } from '../entities/project-permission.entity';

export const PROJECT_PERMISSION_KEY = 'project_permission';

/**
 * Decorator để yêu cầu quyền cụ thể cho một endpoint dự án
 * @param permission - Tên trường quyền trong ProjectRolePermissionEntity (ví dụ: 'createTask')
 */
export const RequireProjectPermission = (permission: keyof ProjectRolePermissionEntity) =>
    SetMetadata(PROJECT_PERMISSION_KEY, permission);
