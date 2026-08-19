import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BannerPermissionService } from '../banner-permission.service';
import {
  BANNER_PERMISSION_KEY,
  BANNER_FEATURE_CODE_KEY,
  BannerPermissionAction,
} from '../decorators/banner-permission.decorator';

@Injectable()
export class BannerPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly permissionService: BannerPermissionService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action =
      this.reflector.getAllAndOverride<BannerPermissionAction>(
        BANNER_PERMISSION_KEY,
        [context.getHandler(), context.getClass()],
      );

    const featureCode = this.reflector.getAllAndOverride<string>(
      BANNER_FEATURE_CODE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!action) return true;

    const request = context.switchToHttp().getRequest();

    const userId = 
      request.authorizedUser || 
      request.originalUser || 
      request.user?.userId || 
      request.userId;

    if (!userId) {
      throw new ForbiddenException('Người dùng chưa đăng nhập');
    }

    const params = request.params || {};
    const body = request.body || {};
    const query = request.query || {};

    const bannerId =
      params.id ||
      body.bannerId ||
      body.id ||
      query.id;

    const flowId = body.flowConfig || query.flowConfig || body.flowId || query.flowId;

    switch (action) {
      case BannerPermissionAction.CREATE:
        return this.permissionService.checkCreate(userId, flowId);

      case BannerPermissionAction.UPDATE:
        return this.permissionService.checkUpdate(userId, bannerId, flowId);

      case BannerPermissionAction.DELETE:
        return this.permissionService.checkDelete(userId, bannerId, flowId);

      case BannerPermissionAction.VIEW:
        return this.permissionService.checkView(userId, bannerId, flowId);

      case BannerPermissionAction.MANAGE:
        return this.permissionService.checkFeatureAccess(userId, featureCode || 'MANAGE', flowId);

      default:
        return true;
    }
  }
}
