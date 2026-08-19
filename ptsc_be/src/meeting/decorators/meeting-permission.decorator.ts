import { SetMetadata } from '@nestjs/common';

export enum MeetingPermissionAction {
  CREATE = 'create',
  UPDATE = 'update',
  UPDATE_PARTICIPANT = 'update_participant',
  DELETE = 'delete',
  VIEW = 'view',
  PROCESS = 'process',
  MANAGE = 'manage', // Dùng cho các danh mục (phòng họp, người tham gia...)
}

export const MEETING_PERMISSION_KEY = 'meeting_permission';
export const MEETING_FEATURE_CODE_KEY = 'meeting_feature_code';

export function RequireMeetingPermission(
  action: MeetingPermissionAction,
  featureCode?: string,
) {
  return (target: any, key?: string | symbol, descriptor?: any) => {
    if (descriptor) {
      // Method decorator
      SetMetadata(MEETING_PERMISSION_KEY, action)(target, key!, descriptor);
      if (featureCode) {
        SetMetadata(MEETING_FEATURE_CODE_KEY, featureCode)(target, key!, descriptor);
      }
    } else {
      // Class decorator
      SetMetadata(MEETING_PERMISSION_KEY, action)(target);
      if (featureCode) {
        SetMetadata(MEETING_FEATURE_CODE_KEY, featureCode)(target);
      }
    }
  };
}