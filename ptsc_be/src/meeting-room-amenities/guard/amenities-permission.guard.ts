import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AmenitiesPermissionService } from '../amenities-permission.service';
import { AMENITIES_FEATURE_CODE_KEY, AMENITIES_PERMISSION_KEY, AmenitiesPermissionAction } from '../decorators/amenities-permission.decorator';

@Injectable()
export class AmenitiesPermissionGuard implements CanActivate {
/**
 * Constructor
 * @param reflector - Reflector instance
 * @param permissionService - AmenitiesPermissionService instance
 */
  constructor(
    private reflector: Reflector,
    private readonly permissionService: AmenitiesPermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<AmenitiesPermissionAction>(
      AMENITIES_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    const featureCode = this.reflector.getAllAndOverride<string>(
      AMENITIES_FEATURE_CODE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!action) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user || request.effectiveUser;
    const userId = user?.userId || request.userId;

    if (!userId) {
      throw new ForbiddenException('Người dùng chưa đăng nhập');
    }

    const { params = {}, body = {}, query = {} } = request;

    const amenitiesId = params.id || body.amenitiesId || body.id || query.id;

    switch (action) {
      case AmenitiesPermissionAction.CREATE:
        return this.permissionService.checkCreate(userId, body.flowConfig);

      case AmenitiesPermissionAction.UPDATE:
        if (!amenitiesId) {
          return this.permissionService.checkFeatureAccess(userId, featureCode);
        }
        return this.permissionService.checkUpdate(userId, amenitiesId);

      case AmenitiesPermissionAction.DELETE:
        if (!amenitiesId) {
          return this.permissionService.checkFeatureAccess(userId, featureCode);
        }
        return this.permissionService.checkDelete(userId, amenitiesId);

      case AmenitiesPermissionAction.VIEW:
        if (!amenitiesId) {
          return this.permissionService.checkFeatureAccess(userId, featureCode);
        }
        return this.permissionService.checkView(userId, amenitiesId);

      case AmenitiesPermissionAction.PROCESS:
        if (!amenitiesId) {
          throw new BadRequestException('Thiếu amenitiesId');
        }
        return this.permissionService.checkProcess(userId, amenitiesId);

      case AmenitiesPermissionAction.MANAGE:
        return this.permissionService.checkFeatureAccess(userId, featureCode);

      default:
        return true;
    }
  }
}