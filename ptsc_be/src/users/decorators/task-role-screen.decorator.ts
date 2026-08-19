import { SetMetadata } from '@nestjs/common';

export const SET_METADATA_KEY = 'taskRoleScreenPermission';

/**
 * Decorator để yêu cầu quyền truy cập màn hình cụ thể dựa trên role của user trong quy trình
 * User phải có ít nhất một trong các quyền màn hình được chỉ định
 *
 * @param screens - Danh sách mã màn hình cần kiểm tra (ví dụ: 'qlcvall', 'cvtcvbpb', 'cvtchpb', 'cvllpb')
 *
 * @example
 * @RequireTaskRoleScreen('qlcvall')
 * async getUsersByTaskRole() { ... }
 *
 * @example
 * @RequireTaskRoleScreen('cvtcvbpb', 'cvtchpb', 'cvllpb')
 * async getUsersByTaskRole() { ... }
 */
export const RequireTaskRoleScreen = (...screens: string[]) =>
  SetMetadata(SET_METADATA_KEY, screens);