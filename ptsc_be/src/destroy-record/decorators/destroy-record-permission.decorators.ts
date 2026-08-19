import { SetMetadata } from '@nestjs/common';

export enum DestroyRecordPermissionAction {
  CREATE = 'create',      // Tạo yêu cầu tiêu hủy
  APPROVE = 'approve',    // Phê duyệt tiêu hủy
  UPDATE = 'update',
  REJECT = 'reject',      // Từ chối tiêu hủy
  VIEW = 'view',          // Xem yêu cầu
  PROCESS = 'process',    // Xử lý workflow
  DELETE = 'delete',      // Xóa yêu cầu tiêu hủy
  MANAGE = 'manage',      // Quản lý danh mục liên quan
}

export const DESTROY_RECORD_PERMISSION_KEY = 'destroy_record_permission';
export const DESTROY_RECORD_FEATURE_CODE_KEY = 'destroy_record_feature_code';

export function RequireDestroyRecordPermission(
  action: DestroyRecordPermissionAction,
  featureCode?: string,
) {
  return (target: any, key?: string | symbol, descriptor?: any) => {
    if (descriptor) {
      // Method decorator
      SetMetadata(DESTROY_RECORD_PERMISSION_KEY, action)(
        target,
        key!,
        descriptor,
      );

      if (featureCode) {
        SetMetadata(DESTROY_RECORD_FEATURE_CODE_KEY, featureCode)(
          target,
          key!,
          descriptor,
        );
      }
    } else {
      // Class decorator
      SetMetadata(DESTROY_RECORD_PERMISSION_KEY, action)(target);

      if (featureCode) {
        SetMetadata(DESTROY_RECORD_FEATURE_CODE_KEY, featureCode)(target);
      }
    }
  };
}