import { SetMetadata } from '@nestjs/common';

export enum AlbumImagesPermissionAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  MANAGE = 'manage',
}

export const ALBUM_IMAGES_PERMISSION_KEY = 'album_images_permission';
export const ALBUM_IMAGES_FEATURE_CODE_KEY = 'album_images_feature_code';

export function RequireAlbumImagesPermission(
  action: AlbumImagesPermissionAction,
  featureCode?: string,
) {
  return (target: any, key?: string | symbol, descriptor?: any) => {
    if (descriptor) {
      // Method decorator
      SetMetadata(ALBUM_IMAGES_PERMISSION_KEY, action)(target, key!, descriptor);
      if (featureCode) {
        SetMetadata(ALBUM_IMAGES_FEATURE_CODE_KEY, featureCode)(target, key!, descriptor);
      }
    } else {
      // Class decorator
      SetMetadata(ALBUM_IMAGES_PERMISSION_KEY, action)(target);
      if (featureCode) {
        SetMetadata(ALBUM_IMAGES_FEATURE_CODE_KEY, featureCode)(target);
      }
    }
  };
}
