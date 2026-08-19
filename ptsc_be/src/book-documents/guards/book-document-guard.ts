import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BookDocumentPermissionService } from '../book-document-permission.service';
import { BOOK_DOCUMENT_PERMISSION_KEY } from '../decorators/book-document-permission.decorator';
import { BookDocumentsService } from '../book-documents.service';

/**
 * Guard thống nhất để kiểm tra quyền sổ văn bản
 * Hỗ trợ: create, update, list, export (văn bản đến/văn bản đi)
 */
@Injectable()
export class BookDocumentGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly permissionService: BookDocumentPermissionService,
    private readonly bookDocumentService: BookDocumentsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiresPermission = this.reflector.getAllAndOverride<boolean>(
      BOOK_DOCUMENT_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiresPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('Người dùng chưa đăng nhập');
    }

    const method = request.method?.toUpperCase();
    const path = request.path || '';

    // Xác định type_document dựa trên route và method
    const typeDocument = await this.determineTypeDocument(method, path, userId, request);

    // List API: cho phép xem cả 2 loại nếu có quyền
    if (path.includes('/list') || path.includes('/listv2')) {
      return this.validateListPermission(userId, request);
    }

    // Export API: kiểm tra quyền theo loại văn bản
    if (path.includes('/export')) {
      if (!typeDocument) {
        throw new BadRequestException('Không xác định được loại văn bản');
      }
      return this.validateExportPermission(userId, typeDocument);
    }

    // Create/Update/Delete API: kiểm tra quyền theo type_document
    if (method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE') {
      // DELETE: lấy type_document từ body hoặc kiểm tra quyền chung
      if (method === 'DELETE') {
        // Với DELETE, kiểm tra user có quyền SoVBden hoặc SoVBDi
        const hasAnyPermission = await this.permissionService.checkAnyBookDocumentPermission(userId);
        if (!hasAnyPermission) {
          throw new ForbiddenException('Bạn không có quyền xóa sổ văn bản. Cần vai trò: SoVBden (sổ văn bản đến) hoặc SoVBDi (sổ văn bản đi)');
        }
        return true;
      }

      if (!typeDocument) {
        throw new BadRequestException('Thiếu type_document trong request');
      }
      return this.validateOperationPermission(userId, typeDocument);
    }

    return true;
  }

  /**
   * Xác định type_document dựa trên method và route
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async determineTypeDocument(method: string, path: string, userId: string, request: any): Promise<string | undefined> {
    // Từ route param - export/incomming/outgoing
    if (path.includes('/incomming-documents')) {
      return 'IncommingDocument';
    }
    if (path.includes('/outgoing_documents')) {
      return 'OutGoingDocument';
    }
    if (path.includes('/document-number-reservations')) {
      return 'OutGoingDocument';
    }

    // Tạo mới: lấy từ body
    if (method === 'POST') {
      return request.body?.type_document;
    }

    // Cập nhật: lấy từ body nếu có, nếu không thì lấy từ DB
    if (method === 'PATCH' || method === 'PUT') {
      const id = request.params?.id;
      if (id) {
        try {
          // Kiểm tra quyền xem document trước (creator hoặc manager)
          const hasAccess = await this.bookDocumentService.checkBookDocumentAccess(userId, Number(id));
          if (!hasAccess) {
            throw new ForbiddenException('Bạn không có quyền xem tài liệu này');
          }

          // Lấy document với skipViewPermissionCheck=true (chỉ cần type_document)
          const bookDoc = await this.bookDocumentService.findOne(userId, Number(id), true);
          return bookDoc?.type_document;
        } catch (error) {
          // Re-throw Forbidden errors, return undefined for other errors
          if (error instanceof ForbiddenException) {
            throw error;
          }
          return undefined;
        }
      }
    }

    return undefined;
  }

  /**
   * Kiểm tra quyền cho API danh sách
   * User cần có ít nhất 1 trong 2 quyền: SoVBden hoặc SoVBDi
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async validateListPermission(userId: string, request: any): Promise<boolean> {
    // Không áp dụng phân quyền cho API danh sách, bất kỳ người dùng nào đã đăng nhập đều có thể truy cập
    request.userPermission = {
      canViewIncoming: true,
      canViewOutgoing: true,
    };

    return true;
  }

  /**
   * Kiểm tra quyền cho API export
   */
  private async validateExportPermission(userId: string, typeDocument: string): Promise<boolean> {
    const result = await this.permissionService.checkPermission(userId, typeDocument);

    if (!result.allowed) {
      throw new ForbiddenException(result.message || 'Bạn không có quyền xuất file loại văn bản này');
    }

    return true;
  }

  /**
   * Kiểm tra quyền cho create/update operations
   */
  private async validateOperationPermission(userId: string, typeDocument: string): Promise<boolean> {
    const result = await this.permissionService.checkPermission(userId, typeDocument);

    if (!result.allowed) {
      throw new ForbiddenException(result.message || 'Bạn không có quyền thực hiện thao tác này');
    }

    return true;
  }
}