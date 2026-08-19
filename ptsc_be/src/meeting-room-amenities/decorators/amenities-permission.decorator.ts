import { SetMetadata } from '@nestjs/common';

export enum AmenitiesPermissionAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  PROCESS = 'process',
  MANAGE = 'manage', // Dùng cho các danh mục tiện ích
}

export const AMENITIES_PERMISSION_KEY = 'amenities_permission';
export const AMENITIES_FEATURE_CODE_KEY = 'amenities_feature_code';

export function RequireAmenitiesPermission(
  action: AmenitiesPermissionAction,
  featureCode?: string,
) {
  return (target: any, key?: string | symbol, descriptor?: any) => {
    if (descriptor) {
      // Method decorator
      SetMetadata(AMENITIES_PERMISSION_KEY, action)(target, key!, descriptor);
      if (featureCode) {
        SetMetadata(AMENITIES_FEATURE_CODE_KEY, featureCode)(target, key!, descriptor);
      }
    } else {
      // Class decorator
      SetMetadata(AMENITIES_PERMISSION_KEY, action)(target);
      if (featureCode) {
        SetMetadata(AMENITIES_FEATURE_CODE_KEY, featureCode)(target);
      }
    }
  };
}