import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AlbumImagesPermissionService } from '../album-images-permission.service';
import {
  ALBUM_IMAGES_PERMISSION_KEY,
  ALBUM_IMAGES_FEATURE_CODE_KEY,
  AlbumImagesPermissionAction,
} from '../decorators/album-images-permission.decorator';

@Injectable()
export class AlbumImagesPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly permissionService: AlbumImagesPermissionService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action =
      this.reflector.getAllAndOverride<AlbumImagesPermissionAction>(
        ALBUM_IMAGES_PERMISSION_KEY,
        [context.getHandler(), context.getClass()],
      );

    const featureCode = this.reflector.getAllAndOverride<string>(
      ALBUM_IMAGES_FEATURE_CODE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!action) return true;

    const request = context.switchToHttp().getRequest();

    // Đồng bộ cách lấy userId với ArchiveRecord (sử dụng authorizedUser từ AuthorityGuard nếu có)
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

    const albumId =
      params.id ||
      body.albumId ||
      body.id ||
      query.id;

    // Lấy flowId từ request
    const flowId = body.flowConfig || query.flowConfig || body.flowId || query.flowId;

    switch (action) {
      case AlbumImagesPermissionAction.CREATE:
        return this.permissionService.checkCreate(userId, flowId);

      case AlbumImagesPermissionAction.UPDATE:
        return this.permissionService.checkUpdate(userId, albumId, flowId);

      case AlbumImagesPermissionAction.DELETE:
        return this.permissionService.checkDelete(userId, albumId, flowId);

      case AlbumImagesPermissionAction.VIEW:
        return this.permissionService.checkView(userId, albumId, flowId);

      case AlbumImagesPermissionAction.MANAGE:
        return this.permissionService.checkFeatureAccess(userId, featureCode || 'MANAGE', flowId);

      default:
        return true;
    }
  }
}
