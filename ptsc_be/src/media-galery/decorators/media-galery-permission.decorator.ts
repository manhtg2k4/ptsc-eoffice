import { SetMetadata } from '@nestjs/common';

export enum MediaGaleryPermissionAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  MANAGE = 'manage',
}

export const MEDIA_GALERY_PERMISSION_KEY = 'media_galery_permission';
export const MEDIA_GALERY_FEATURE_CODE_KEY = 'media_galery_feature_code';

export function RequireMediaGaleryPermission(
  action: MediaGaleryPermissionAction,
  featureCode?: string,
) {
  return (target: any, key?: string | symbol, descriptor?: any) => {
    if (descriptor) {
      // Method decorator
      SetMetadata(MEDIA_GALERY_PERMISSION_KEY, action)(target, key!, descriptor);
      if (featureCode) {
        SetMetadata(MEDIA_GALERY_FEATURE_CODE_KEY, featureCode)(target, key!, descriptor);
      }
    } else {
      // Class decorator
      SetMetadata(MEDIA_GALERY_PERMISSION_KEY, action)(target);
      if (featureCode) {
        SetMetadata(MEDIA_GALERY_FEATURE_CODE_KEY, featureCode)(target);
      }
    }
  };
}
