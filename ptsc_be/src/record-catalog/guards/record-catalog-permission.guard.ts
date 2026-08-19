import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RecordCatalogPermissionService } from '../record-catalog-permission.service';
import {
  RECORD_CATALOG_PERMISSION_KEY,
  RECORD_CATALOG_FEATURE_CODE_KEY,
  RecordCatalogPermissionAction,
} from '../decorators/record-catalog-permission.decorator';

@Injectable()
export class RecordCatalogPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly permissionService: RecordCatalogPermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<RecordCatalogPermissionAction>(
      RECORD_CATALOG_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    const featureCode = this.reflector.getAllAndOverride<string>(
      RECORD_CATALOG_FEATURE_CODE_KEY,
      [context.getHandler(), context.getClass()],
    ) || 'dmhs';

    if (!action) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user || request.effectiveUser;
    const userId = user?.userId || request.userId;

    if (!userId) {
      throw new ForbiddenException('Người dùng chưa đăng nhập');
    }

    return this.permissionService.checkPermission(userId, action, featureCode);
  }
}
