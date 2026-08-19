import { SetMetadata } from '@nestjs/common';

export enum AuthConfigPermissionAction {
  VIEW = 'view',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

export const AUTH_CONFIG_PERMISSION_KEY = 'auth_config_permission';
export const RequireAuthConfigPermission = (action: AuthConfigPermissionAction) =>
  SetMetadata(AUTH_CONFIG_PERMISSION_KEY, action);
