import { SetMetadata } from '@nestjs/common';

export enum DataExportPermissionAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  PROCESS = 'process',
  MANAGE = 'manage',
}

export const DATA_EXPORT_PERMISSION_KEY = 'data_export_permission';
export const DATA_EXPORT_FEATURE_CODE_KEY = 'data_export_feature_code';

export function RequireDataExportPermission(
  action: DataExportPermissionAction,
  featureCode?: string,
) {
  return (target: any, key?: string | symbol, descriptor?: any) => {
    if (descriptor) {
      SetMetadata(DATA_EXPORT_PERMISSION_KEY, action)(target, key!, descriptor);
      if (featureCode) {
        SetMetadata(DATA_EXPORT_FEATURE_CODE_KEY, featureCode)(target, key!, descriptor);
      }
    } else {
      SetMetadata(DATA_EXPORT_PERMISSION_KEY, action)(target);
      if (featureCode) {
        SetMetadata(DATA_EXPORT_FEATURE_CODE_KEY, featureCode)(target);
      }
    }
  };
}
