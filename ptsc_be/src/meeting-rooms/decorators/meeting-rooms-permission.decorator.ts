import { SetMetadata } from '@nestjs/common';

export enum MeetingRoomsPermissionAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  PROCESS = 'process',
  MANAGE = 'manage',
}

export const MEETING_ROOMS_PERMISSION_KEY = 'meeting_rooms_permission';

export const MEETING_ROOMS_FEATURE_CODE_KEY = 'meeting_rooms_feature_code';

export function RequireMeetingRoomsPermission(
  action: MeetingRoomsPermissionAction,
  featureCode?: string,
) {
  return (target: any, key?: string | symbol, descriptor?: any) => {
    if (descriptor) {
      SetMetadata(MEETING_ROOMS_PERMISSION_KEY, action)(
        target,
        key!,
        descriptor,
      );

      if (featureCode) {
        SetMetadata(MEETING_ROOMS_FEATURE_CODE_KEY, featureCode)(
          target,
          key!,
          descriptor,
        );
      }
    } else {
      SetMetadata(MEETING_ROOMS_PERMISSION_KEY, action)(target);

      if (featureCode) {
        SetMetadata(MEETING_ROOMS_FEATURE_CODE_KEY, featureCode)(
          target,
        );
      }
    }
  };
}