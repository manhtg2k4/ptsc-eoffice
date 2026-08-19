import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DestroyRecordPermissionService } from '../destroy-record-permission.service';
import {
  DESTROY_RECORD_PERMISSION_KEY,
  DESTROY_RECORD_FEATURE_CODE_KEY,
  DestroyRecordPermissionAction,
} from '../decorators/destroy-record-permission.decorators';

@Injectable()
export class DestroyRecordPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly permissionService: DestroyRecordPermissionService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action =
      this.reflector.getAllAndOverride<DestroyRecordPermissionAction>(
        DESTROY_RECORD_PERMISSION_KEY,
        [context.getHandler(), context.getClass()],
      );

    const featureCode = this.reflector.getAllAndOverride<string>(
      DESTROY_RECORD_FEATURE_CODE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!action) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user || request.effectiveUser;
    const userId = user?.userId || request.userId;

    if (!userId) {
      throw new ForbiddenException('Người dùng chưa đăng nhập');
    }

    // FIX: tránh undefined khi GET
    const params = request.params || {};
    const body = request.body || {};
    const query = request.query || {};

    const recordId =
      params.id ||
      body.destroyRecordId ||
      body.id ||
      query.id ||
      body.ids;

    switch (action) {
      case DestroyRecordPermissionAction.CREATE:
        return this.permissionService.checkCreate(
          userId,
          body.flowConfig || query.flowConfig,
        );

      case DestroyRecordPermissionAction.UPDATE:
        return this.permissionService.checkUpdate(userId, recordId);

      case DestroyRecordPermissionAction.DELETE:
        return this.permissionService.checkDelete(userId, recordId);

      case DestroyRecordPermissionAction.VIEW:
        return this.permissionService.checkView(userId, recordId);

      case DestroyRecordPermissionAction.PROCESS:
        return this.permissionService.checkProcess(userId, recordId);

      case DestroyRecordPermissionAction.MANAGE:
        return this.permissionService.checkFeatureAccess(userId, featureCode);

      default:
        return true;
    }
  }
}