import { Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class BookDocumentPermissionService {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Kiểm tra user có quyền thao tác với sổ văn bản theo type_document
   * @param userId - ID của user
   * @param typeDocument - 'IncommingDocument' (sổ văn bản đến) hoặc 'OutGoingDocument' (sổ văn bản đi)
   * @returns {Promise<{allowed: boolean, message?: string}>}
   */
  /**
   * Lấy danh sách type_document mà user được phép xem
   * @param userId - ID của user
   * @returns string[] - ['IncommingDocument'], ['OutGoingDocument'], ['IncommingDocument', 'OutGoingDocument'], hoặc []
   */
  async getViewableTypes(userId: string): Promise<string[]> {
    try {
      const roleInfo = await this.usersService.findProcessRoleInfoById(userId);

      if (!roleInfo) {
        return [];
      }

      const roles = roleInfo.roles || [];

      // Super Admin - xem tất cả
      if (roleInfo.isSuperAdmin) {
        return ['IncommingDocument', 'OutGoingDocument'];
      }

      const hasSoVBden = roles.includes('SoVBden');
      const hasSoVBDi = roles.includes('SoVBDi');

      const viewableTypes: string[] = [];

      if (hasSoVBden) {
        viewableTypes.push('IncommingDocument');
      }

      if (hasSoVBDi) {
        viewableTypes.push('OutGoingDocument');
      }

      return viewableTypes;
    } catch (error) {
      return [];
    }
  }

  async checkPermission(userId: string, typeDocument: string): Promise<{allowed: boolean, message?: string}> {
    try {
      // 1. Lấy thông tin vai trò của user
      const roleInfo = await this.usersService.findProcessRoleInfoById(userId);

      if (!roleInfo) {
        return { allowed: false, message: 'Không thể lấy thông tin vai trò của người dùng' };
      }

      const roles = roleInfo.roles || [];

      // 2. Kiểm tra Super Admin - luôn có quyền
      if (roleInfo.isSuperAdmin) {
        return { allowed: true };
      }

      // 3. Kiểm tra quyền theo type_document
      const isIncoming = typeDocument === 'IncommingDocument';
      const isOutgoing = typeDocument === 'OutGoingDocument';

      const hasSoVBden = roles.includes('SoVBden');
      const hasSoVBDi = roles.includes('SoVBDi');

      // 4. Quy tắc:
      // - SoVBden → được thao tác với sổ văn bản đến (IncommingDocument)
      // - SoVBDi → được thao tác với sổ văn bản đi (OutGoingDocument)
      // - Cả hai → được cả hai
      // - Không có → từ chối

      if (isIncoming && hasSoVBden) {
        return { allowed: true };
      }

      if (isOutgoing && hasSoVBDi) {
        return { allowed: true };
      }

      // Nếu đến đây nhưng có cả hai quyền (phòng thường có cả hai)
      if (hasSoVBden && hasSoVBDi) {
        return { allowed: true };
      }

      // 5. Không có quyền
      const requiredRole = isIncoming ? 'SoVBden' : 'SoVBDi';
      const hasAnyPermission = hasSoVBden || hasSoVBDi;

      if (hasAnyPermission) {
        // User có quyền nhưng không đúng loại
        return {
          allowed: false,
          message: `Bạn không có quyền thao tác với sổ văn bản ${isIncoming ? 'đến' : 'đi'}. Cần vai trò: ${requiredRole}`
        };
      }

      // User không có quyền nào
      return {
        allowed: false,
        message: `Bạn không có quyền thao tác với sổ văn bản. Cần vai trò: SoVBden (sổ văn bản đến) hoặc SoVBDi (sổ văn bản đi)`
      };

    } catch (error) {
      return {
        allowed: false,
        message: error.message || 'Lỗi khi kiểm tra quyền'
      };
    }
  }

  /**
   * Kiểm tra user có bất kỳ quyền nào với sổ văn bản không (SoVBden hoặc SoVBDi)
   * @param userId - ID của user
   * @returns Promise<boolean> - true nếu có ít nhất 1 quyền
   */
  async checkAnyBookDocumentPermission(userId: string): Promise<boolean> {
    try {
      const roleInfo = await this.usersService.findProcessRoleInfoById(userId);

      if (!roleInfo) {
        return false;
      }

      // Super Admin - luôn có quyền
      if (roleInfo.isSuperAdmin) {
        return true;
      }

      const roles = roleInfo.roles || [];
      const hasSoVBden = roles.includes('SoVBden');
      const hasSoVBDi = roles.includes('SoVBDi');

      return hasSoVBden || hasSoVBDi;
    } catch (error) {
      return false;
    }
  }
}