import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TravelWorkSchedulePermissionService } from '../travel-work-schedule-permission.service';
import {
  TRAVEL_SCHEDULE_FEATURE_CODE_KEY,
  TRAVEL_SCHEDULE_PERMISSION_KEY,
  TravelSchedulePermissionAction,
} from '../decorators/travel-schedule-permission.decorator';

@Injectable()
export class TravelWorkSchedulePermissionGuard implements CanActivate {
  /**
   * Constructor
   * @param reflector - Reflector instance
   * @param permissionService - TravelWorkSchedulePermissionService instance
   */
  constructor(
    private reflector: Reflector,
    private readonly permissionService: TravelWorkSchedulePermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<TravelSchedulePermissionAction>(
      TRAVEL_SCHEDULE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    const featureCode = this.reflector.getAllAndOverride<string>(
      TRAVEL_SCHEDULE_FEATURE_CODE_KEY,
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

    const scheduleId = params.id || body.scheduleId || body.id || query.id;

    switch (action) {
      case TravelSchedulePermissionAction.CREATE:
        return this.permissionService.checkCreate(userId, body.flowConfig);

      case TravelSchedulePermissionAction.UPDATE:
        if (!scheduleId) {
          return this.permissionService.checkFeatureAccess(userId, featureCode);
        }
        return this.permissionService.checkUpdate(userId, scheduleId);

      case TravelSchedulePermissionAction.DELETE:
        if (!scheduleId) {
          return this.permissionService.checkFeatureAccess(userId, featureCode);
        }
        return this.permissionService.checkDelete(userId, scheduleId);

      case TravelSchedulePermissionAction.VIEW:
        if (!scheduleId) {
          return this.permissionService.checkFeatureAccess(userId, featureCode);
        }
        return this.permissionService.checkView(userId, scheduleId);

      case TravelSchedulePermissionAction.PROCESS:
        if (!scheduleId) {
          throw new BadRequestException('Thiếu scheduleId');
        }
        return this.permissionService.checkProcess(userId, scheduleId);

      case TravelSchedulePermissionAction.MANAGE:
        return this.permissionService.checkFeatureAccess(userId, featureCode);

      default:
        return true;
    }
  }
}