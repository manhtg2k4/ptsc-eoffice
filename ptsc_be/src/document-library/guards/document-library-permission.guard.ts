import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { DocumentLibraryService } from '../document-library.service';

@Injectable()
export class DocumentLibraryPermissionGuard implements CanActivate {
  constructor(private readonly service: DocumentLibraryService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;

    if (!userId) {
      throw new ForbiddenException('Người dùng chưa đăng nhập');
    }

    const hasPermission = await this.service.checkPermission(userId);
    if (hasPermission) {
      return true;
    }

    const canAction = await this.service.checkActionPermission(userId, request);
    if (!canAction) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    }

    return true;
  }
}
