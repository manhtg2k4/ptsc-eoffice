import { SetMetadata } from '@nestjs/common';

export enum RecordCatalogPermissionAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  MANAGE = 'manage',
}

export const RECORD_CATALOG_PERMISSION_KEY = 'record_catalog_permission';
export const RECORD_CATALOG_FEATURE_CODE_KEY = 'record_catalog_feature_code';

export function RequireRecordCatalogPermission(
  action: RecordCatalogPermissionAction,
  featureCode: string = 'dmhs',
) {
  return (target: any, key?: string | symbol, descriptor?: any) => {
    if (descriptor) {
      SetMetadata(RECORD_CATALOG_PERMISSION_KEY, action)(target, key!, descriptor);
      SetMetadata(RECORD_CATALOG_FEATURE_CODE_KEY, featureCode)(target, key!, descriptor);
    } else {
      SetMetadata(RECORD_CATALOG_PERMISSION_KEY, action)(target);
      SetMetadata(RECORD_CATALOG_FEATURE_CODE_KEY, featureCode)(target);
    }
  };
}
