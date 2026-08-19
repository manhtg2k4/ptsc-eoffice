import { SetMetadata } from '@nestjs/common';

export enum VehicleRegistrationPermissionAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  PROCESS = 'process',
  MANAGE = 'manage',      // Dùng cho các danh mục dựa trên Feature Code
  LIST_ACCESS = 'list_access', // Xem danh sách xe / tài xế (check nhanh, chỉ cần trong luồng đặt xe)
}

export const VEHICLE_REGISTRATION_PERMISSION_KEY = 'vehicle_registration_permission';
export const VEHICLE_REGISTRATION_FEATURE_CODE_KEY = 'vehicle_registration_feature_code';

export function RequireVehiclePermission(
  action: VehicleRegistrationPermissionAction,
  featureCode?: string,
) {
  return (target: any, key?: string | symbol, descriptor?: any) => {
    if (descriptor) {
      // Method decorator
      SetMetadata(VEHICLE_REGISTRATION_PERMISSION_KEY, action)(target, key!, descriptor);
      if (featureCode) {
        SetMetadata(VEHICLE_REGISTRATION_FEATURE_CODE_KEY, featureCode)(target, key!, descriptor);
      }
    } else {
      // Class decorator
      SetMetadata(VEHICLE_REGISTRATION_PERMISSION_KEY, action)(target);
      if (featureCode) {
        SetMetadata(VEHICLE_REGISTRATION_FEATURE_CODE_KEY, featureCode)(target);
      }
    }
  };
}
