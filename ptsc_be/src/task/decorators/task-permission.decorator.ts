import { SetMetadata } from '@nestjs/common';

export enum TaskPermissionAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  SEND_APPROVAL = 'send_approval',
  SEND_ADJUST = 'send_adjust',
  APPROVE = 'approve',
  VIEW = 'view',
}

export const TASK_PERMISSION_KEY = 'task_permission';
export const RequireTaskPermission = (action: TaskPermissionAction) =>
  SetMetadata(TASK_PERMISSION_KEY, action);
