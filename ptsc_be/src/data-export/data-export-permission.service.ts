import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';

@Injectable()
export class DataExportPermissionService {
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

  async checkView(
    userId: string,
    documentId?: string,
    featureCode?: string,
  ): Promise<boolean> {
    if (documentId) {
      return true;
    }

    if (featureCode) {
      return this.checkFeatureAccess(userId, featureCode);
    }

    throw new BadRequestException(
      'Thiếu documentId hoặc processFn/viewConfigCode để kiểm tra quyền xem',
    );
  }

  async checkProcess(userId: string, documentId: string): Promise<boolean> {
    if (!documentId) {
      throw new BadRequestException('Thiếu documentId để kiểm tra quyền xử lý');
    }

    return true;
  }

  async checkFeatureAccess(userId: string, featureCode?: string): Promise<boolean> {
    if (!featureCode) {
      throw new BadRequestException('Thiếu processFn hoặc viewConfigCode để kiểm tra quyền');
    }

    return true;
  }
}
