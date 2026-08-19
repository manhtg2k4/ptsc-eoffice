import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataExportPermissionService } from '../data-export-permission.service';
import {
  DATA_EXPORT_FEATURE_CODE_KEY,
  DATA_EXPORT_PERMISSION_KEY,
  DataExportPermissionAction,
} from '../decorators/data-export-permission.decorator';

@Injectable()
export class DataExportPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly permissionService: DataExportPermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<DataExportPermissionAction>(
      DATA_EXPORT_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    const featureCode = this.reflector.getAllAndOverride<string>(
      DATA_EXPORT_FEATURE_CODE_KEY,
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
      query.documentId ||
      query.id;

    const requestFeatureCode =
      featureCode ||
      query.processFn ||
      query.viewConfigCode ||
      body.processFn ||
      body.viewConfigCode;

    switch (action) {
      case DataExportPermissionAction.CREATE:
        return this.permissionService.checkCreate(userId, documentId);

      case DataExportPermissionAction.UPDATE:
        if (!documentId) {
          return this.permissionService.checkFeatureAccess(userId, requestFeatureCode);
        }
        return this.permissionService.checkUpdate(userId, documentId);

      case DataExportPermissionAction.DELETE:
        if (!documentId) {
          return this.permissionService.checkFeatureAccess(userId, requestFeatureCode);
        }
        return this.permissionService.checkDelete(userId, documentId);

      case DataExportPermissionAction.VIEW:
        return this.permissionService.checkView(userId, documentId, requestFeatureCode);

      case DataExportPermissionAction.PROCESS:
        if (!documentId) {
          throw new BadRequestException('Thiếu documentId');
        }
        return this.permissionService.checkProcess(userId, documentId);

      case DataExportPermissionAction.MANAGE:
        return this.permissionService.checkFeatureAccess(userId, requestFeatureCode);

      default:
        return true;
    }
  }
}
