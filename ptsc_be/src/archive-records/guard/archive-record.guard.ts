import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ArchiveRecordPermissionService } from '../archive-record-permission.service';
import {
  ARCHIVE_RECORD_PERMISSION_KEY,
  ARCHIVE_RECORD_FEATURE_CODE_KEY,
  ArchiveRecordPermissionAction,
} from '../decorators/archive-record-permission.decorator';

@Injectable()
export class ArchiveRecordPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly permissionService: ArchiveRecordPermissionService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action =
      this.reflector.getAllAndOverride<ArchiveRecordPermissionAction>(
        ARCHIVE_RECORD_PERMISSION_KEY,
        [context.getHandler(), context.getClass()],
      );

    const featureCode = this.reflector.getAllAndOverride<string>(
      ARCHIVE_RECORD_FEATURE_CODE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!action) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const authorizedUser = request.authorizedUser;
    const originalUser = request.originalUser;
    const userId = authorizedUser || originalUser || user?.userId || request.userId;

    if (!userId) {
      throw new ForbiddenException('Người dùng chưa đăng nhập');
    }

    // FIX: tránh undefined
    const params = request.params || {};
    const body = request.body || {};
    const query = request.query || {};

    const recordId =
      params.id ||
      body.archiveRecordId ||
      body.id ||
      query.id ||
      body.ids;

    switch (action) {
      case ArchiveRecordPermissionAction.CREATE:
        return this.permissionService.checkCreate(
          userId,
          body.flowConfig || query.flowConfig,
        );

      case ArchiveRecordPermissionAction.UPDATE:
        return this.permissionService.checkUpdate(userId, recordId);

      case ArchiveRecordPermissionAction.DELETE:
        // nếu module này không cần check từng record → chỉ check feature
        return this.permissionService.checkDelete(userId, recordId);

      case ArchiveRecordPermissionAction.VIEW:
        return this.permissionService.checkView(userId, recordId);

      case ArchiveRecordPermissionAction.VIEW_FOLDER:
        return this.permissionService.checkViewFolder(userId);

      case ArchiveRecordPermissionAction.PROCESS:
        if (!recordId) {
          return this.permissionService.checkFeatureAccess(userId, featureCode);
        }
        return this.permissionService.checkProcess(userId, recordId);

      case ArchiveRecordPermissionAction.MANAGE:
        return this.permissionService.checkFeatureAccess(userId, featureCode);

      default:
        return true;
    }
  }
}