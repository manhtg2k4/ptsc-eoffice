import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DocumentFollowPermissionService } from '../document-follow-permission.service';
import {
  DOCUMENT_FOLLOW_FEATURE_CODE_KEY,
  DOCUMENT_FOLLOW_PERMISSION_KEY,
  DocumentFollowPermissionAction,
} from '../decorators/document-follow-permission.decorator';

@Injectable()
export class DocumentFollowPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly permissionService: DocumentFollowPermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<DocumentFollowPermissionAction>(
      DOCUMENT_FOLLOW_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    const featureCode = this.reflector.getAllAndOverride<string>(
      DOCUMENT_FOLLOW_FEATURE_CODE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!action) return true;

    const request = context.switchToHttp().getRequest();
    const userId =
      request.authorizedUser ||
      request.originalUser ||
      request.user?.userId ||
      request.userId;

    const params = request.params || {};
    const body = request.body || {};
    const query = request.query || {};

    const documentId =
      params.id ||
      body.documentId ||
      body.id ||
      query.id;

    switch (action) {
      case DocumentFollowPermissionAction.CREATE:
        return this.permissionService.checkCreate(userId, documentId);

      case DocumentFollowPermissionAction.UPDATE:
        if (!documentId) {
          return this.permissionService.checkFeatureAccess(userId, featureCode);
        }
        return this.permissionService.checkUpdate(userId, documentId);

      case DocumentFollowPermissionAction.DELETE:
        if (!documentId) {
          return this.permissionService.checkFeatureAccess(userId, featureCode);
        }
        return this.permissionService.checkDelete(userId, documentId);

      case DocumentFollowPermissionAction.VIEW:
        if (!documentId) {
          return this.permissionService.checkFeatureAccess(userId, featureCode);
        }
        return this.permissionService.checkView(userId, documentId);

      case DocumentFollowPermissionAction.PROCESS:
        if (!documentId) {
          throw new BadRequestException('Thiếu documentId');
        }
        return this.permissionService.checkProcess(userId, documentId);

      case DocumentFollowPermissionAction.MANAGE:
        return this.permissionService.checkFeatureAccess(userId, featureCode);

      default:
        return true;
    }
  }
}
