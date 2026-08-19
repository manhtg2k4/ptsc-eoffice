import { SetMetadata } from '@nestjs/common';

export enum ArchiveRecordPermissionAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  VIEW_FOLDER = 'view_folder',
  PROCESS = 'process',
  MANAGE = 'manage',
}

export const ARCHIVE_RECORD_PERMISSION_KEY = 'archive_record_permission';
export const ARCHIVE_RECORD_FEATURE_CODE_KEY = 'archive_record_feature_code';

export function RequireArchiveRecordPermission(
  action: ArchiveRecordPermissionAction,
  featureCode?: string,
) {
  return (target: any, key?: string | symbol, descriptor?: any) => {
    if (descriptor) {
      // Method decorator
      SetMetadata(ARCHIVE_RECORD_PERMISSION_KEY, action)(target, key!, descriptor);
      if (featureCode) {
        SetMetadata(ARCHIVE_RECORD_FEATURE_CODE_KEY, featureCode)(target, key!, descriptor);
      }
    } else {
      // Class decorator
      SetMetadata(ARCHIVE_RECORD_PERMISSION_KEY, action)(target);
      if (featureCode) {
        SetMetadata(ARCHIVE_RECORD_FEATURE_CODE_KEY, featureCode)(target);
      }
    }
  };
}