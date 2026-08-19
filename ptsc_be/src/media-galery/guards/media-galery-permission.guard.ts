import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MediaGaleryPermissionService } from '../media-galery-permission.service';
import {
  MEDIA_GALERY_PERMISSION_KEY,
  MEDIA_GALERY_FEATURE_CODE_KEY,
  MediaGaleryPermissionAction,
} from '../decorators/media-galery-permission.decorator';

@Injectable()
export class MediaGaleryPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly permissionService: MediaGaleryPermissionService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action =
      this.reflector.getAllAndOverride<MediaGaleryPermissionAction>(
        MEDIA_GALERY_PERMISSION_KEY,
        [context.getHandler(), context.getClass()],
      );

    const featureCode = this.reflector.getAllAndOverride<string>(
      MEDIA_GALERY_FEATURE_CODE_KEY,
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

    const mediaId =
      params.id ||
      body.mediaId ||
      body.id ||
      query.id;

    const flowId = body.flowConfig || query.flowConfig || body.flowId || query.flowId;

    switch (action) {
      case MediaGaleryPermissionAction.CREATE:
        return this.permissionService.checkCreate(userId, flowId);

      case MediaGaleryPermissionAction.UPDATE:
        return this.permissionService.checkUpdate(userId, mediaId, flowId);

      case MediaGaleryPermissionAction.DELETE:
        return this.permissionService.checkDelete(userId, mediaId, flowId);

      case MediaGaleryPermissionAction.VIEW:
        return this.permissionService.checkView(userId, mediaId, flowId);

      case MediaGaleryPermissionAction.MANAGE:
        return this.permissionService.checkFeatureAccess(userId, featureCode || 'MANAGE', flowId);

      default:
        return true;
    }
  }
}
