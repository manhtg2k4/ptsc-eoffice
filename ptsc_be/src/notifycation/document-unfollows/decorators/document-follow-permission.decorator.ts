import { SetMetadata } from '@nestjs/common';

export enum DocumentFollowPermissionAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  PROCESS = 'process',
  MANAGE = 'manage',
}

export const DOCUMENT_FOLLOW_PERMISSION_KEY = 'document_follow_permission';
export const DOCUMENT_FOLLOW_FEATURE_CODE_KEY = 'document_follow_feature_code';

export function RequireDocumentFollowPermission(
  action: DocumentFollowPermissionAction,
  featureCode?: string,
) {
  return (target: any, key?: string | symbol, descriptor?: any) => {
    if (descriptor) {
      SetMetadata(DOCUMENT_FOLLOW_PERMISSION_KEY, action)(target, key!, descriptor);
      if (featureCode) {
        SetMetadata(DOCUMENT_FOLLOW_FEATURE_CODE_KEY, featureCode)(target, key!, descriptor);
      }
    } else {
      SetMetadata(DOCUMENT_FOLLOW_PERMISSION_KEY, action)(target);
      if (featureCode) {
        SetMetadata(DOCUMENT_FOLLOW_FEATURE_CODE_KEY, featureCode)(target);
      }
    }
  };
}
