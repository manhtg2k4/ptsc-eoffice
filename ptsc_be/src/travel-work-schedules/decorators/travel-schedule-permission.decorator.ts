import { SetMetadata } from '@nestjs/common';

/**
 * Các hành động quyền cho TravelWorkSchedule
 */
export enum TravelSchedulePermissionAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  PROCESS = 'process', // tương tự workflow
  VIEW = 'view',
  MANAGE = 'manage', // quyền feature
}

/**
 * Key metadata dùng trong guard
 */
export const TRAVEL_SCHEDULE_PERMISSION_KEY = 'travel_schedule_permission';

/**
 * Decorator gán quyền cho handler/class
 * @param action - TravelSchedulePermissionAction
 */
export const RequireTravelSchedulePermission = (action: TravelSchedulePermissionAction) =>
  SetMetadata(TRAVEL_SCHEDULE_PERMISSION_KEY, action);

/**
 * Feature code key để check quyền theo chức năng
 */
export const TRAVEL_SCHEDULE_FEATURE_CODE_KEY = 'travel_schedule_feature_code';

/**
 * Decorator gán feature code cho handler/class
 * @param code - Mã chức năng
 */
export const SetTravelScheduleFeatureCode = (code: string) =>
  SetMetadata(TRAVEL_SCHEDULE_FEATURE_CODE_KEY, code);