import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class DocumentFollowPermissionService {
  async checkCreate(userId: string, documentId?: string): Promise<boolean> {
    if (!documentId) {
      throw new BadRequestException('Thiếu documentId để kiểm tra quyền tạo');
    }

    return true;
  }

  async checkUpdate(userId: string, documentId: string): Promise<boolean> {
    if (!documentId) {
      throw new BadRequestException('Thiếu documentId để kiểm tra quyền cập nhật');
    }

    return true;
  }

  async checkDelete(userId: string, documentId: string): Promise<boolean> {
    if (!documentId) {
      throw new BadRequestException('Thiếu documentId để kiểm tra quyền xóa');
    }

    return true;
  }

  async checkView(userId: string, documentId: string): Promise<boolean> {
    if (!documentId) {
      throw new BadRequestException('Thiếu documentId để kiểm tra quyền xem');
    }

    return true;
  }

  async checkProcess(userId: string, documentId: string): Promise<boolean> {
    if (!documentId) {
      throw new BadRequestException('Thiếu documentId để kiểm tra quyền xử lý');
    }

    return true;
  }

  async checkFeatureAccess(userId: string, featureCode?: string): Promise<boolean> {
    if (!featureCode) {
      return true;
    }

    throw new ForbiddenException('Bạn không có quyền truy cập chức năng này');
  }
}
