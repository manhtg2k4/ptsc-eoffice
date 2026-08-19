import { SetMetadata } from '@nestjs/common';

export enum LeadershipDutySchedulesPermissionAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  PROCESS = 'process',
  MANAGE = 'manage',
}

export const LEADERSHIP_DUTY_SCHEDULES_PERMISSION_KEY =
  'leadership_duty_schedules_permission';

export const LEADERSHIP_DUTY_SCHEDULES_FEATURE_CODE_KEY =
  'leadership_duty_schedules_feature_code';

export function RequireLeadershipDutySchedulesPermission(
  action: LeadershipDutySchedulesPermissionAction,
  featureCode?: string,
) {
  return (target: any, key?: string | symbol, descriptor?: any) => {
    if (descriptor) {
      SetMetadata(LEADERSHIP_DUTY_SCHEDULES_PERMISSION_KEY, action)(
        target,
        key!,
        descriptor,
      );

      if (featureCode) {
        SetMetadata(LEADERSHIP_DUTY_SCHEDULES_FEATURE_CODE_KEY, featureCode)(
          target,
          key!,
          descriptor,
        );
      }
    } else {
      SetMetadata(LEADERSHIP_DUTY_SCHEDULES_PERMISSION_KEY, action)(target);

      if (featureCode) {
        SetMetadata(LEADERSHIP_DUTY_SCHEDULES_FEATURE_CODE_KEY, featureCode)(
          target,
        );
      }
    }
  };
}