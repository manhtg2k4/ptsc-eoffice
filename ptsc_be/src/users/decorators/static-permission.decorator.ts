import { SetMetadata } from '@nestjs/common';

export interface StaticPermissionRequirement {
  code: string;
  action?: string;
}

export const STATIC_PERMISSION_KEY = 'static_permission_key';
export const RequireStaticPermission = (...requirements: StaticPermissionRequirement[]) => 
  SetMetadata(STATIC_PERMISSION_KEY, requirements);
