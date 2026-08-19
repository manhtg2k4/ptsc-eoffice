import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { VehicleRegistrationPermissionService } from '../vehicle-registration-permission.service';
import {
  VEHICLE_REGISTRATION_PERMISSION_KEY,
  VEHICLE_REGISTRATION_FEATURE_CODE_KEY,
  VehicleRegistrationPermissionAction,
} from '../decorators/vehicle-registration-permission.decorator';
import { isSuperAdminByKeycloakId } from 'src/utils/super-admin.util';

@Injectable()
export class VehicleRegistrationPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly permissionService: VehicleRegistrationPermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action =
      this.reflector.getAllAndOverride<VehicleRegistrationPermissionAction>(
        VEHICLE_REGISTRATION_PERMISSION_KEY,
        [context.getHandler(), context.getClass()],
      );

    const featureCodeFromMetadata = this.reflector.getAllAndOverride<string>(
      VEHICLE_REGISTRATION_FEATURE_CODE_KEY,
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

    if (isSuperAdminByKeycloakId(userId)) return true;

    // FIX: tránh undefined
    const params = request.params || {};
    const body = request.body || {};
    const query = request.query || {};

    const registrationId = params.id || body.registrationId || body.id || query.id || body.ids;
    
    // Nếu không có featureCode từ decorator, lấy từ query/body (ví dụ processFn)
    const finalFeatureCode = featureCodeFromMetadata || query.processFn || body.processFn;

    switch (action) {
      case VehicleRegistrationPermissionAction.CREATE:
        return this.permissionService.checkCreate(
          userId,
          body.flowConfig || query.flowConfig,
        );

      case VehicleRegistrationPermissionAction.UPDATE:
        if (!registrationId) {
          return this.permissionService.checkFeatureAccess(userId, finalFeatureCode);
        }
        return this.permissionService.checkUpdate(userId, registrationId);

      case VehicleRegistrationPermissionAction.DELETE:
        if (!registrationId) {
          return this.permissionService.checkFeatureAccess(userId, finalFeatureCode);
        }
        return this.permissionService.checkDelete(userId, registrationId);

      case VehicleRegistrationPermissionAction.VIEW:
        if (!registrationId) {
          return this.permissionService.checkFeatureAccess(userId, finalFeatureCode);
        }
        return this.permissionService.checkView(userId, registrationId);

      case VehicleRegistrationPermissionAction.PROCESS:
        if (!registrationId) {
          return this.permissionService.checkFeatureAccess(userId, finalFeatureCode);
        }
        return this.permissionService.checkProcess(userId, registrationId);

      case VehicleRegistrationPermissionAction.MANAGE:
        return this.permissionService.checkFeatureAccess(userId, finalFeatureCode);

      case VehicleRegistrationPermissionAction.LIST_ACCESS:
        return this.permissionService.checkListAccess(userId);

      default:
        return true;
    }
  }
}
