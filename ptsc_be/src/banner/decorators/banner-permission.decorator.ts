import { SetMetadata } from '@nestjs/common';

export enum BannerPermissionAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  MANAGE = 'manage',
}

export const BANNER_PERMISSION_KEY = 'banner_permission';
export const BANNER_FEATURE_CODE_KEY = 'banner_feature_code';

export function RequireBannerPermission(
  action: BannerPermissionAction,
  featureCode?: string,
) {
  return (target: any, key?: string | symbol, descriptor?: any) => {
    if (descriptor) {
      // Method decorator
      SetMetadata(BANNER_PERMISSION_KEY, action)(target, key!, descriptor);
      if (featureCode) {
        SetMetadata(BANNER_FEATURE_CODE_KEY, featureCode)(target, key!, descriptor);
      }
    } else {
      // Class decorator
      SetMetadata(BANNER_PERMISSION_KEY, action)(target);
      if (featureCode) {
        SetMetadata(BANNER_FEATURE_CODE_KEY, featureCode)(target);
      }
    }
  };
}
