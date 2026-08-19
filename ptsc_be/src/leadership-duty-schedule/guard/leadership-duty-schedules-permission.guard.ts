import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LeadershipDutySchedulesPermissionService } from '../leadership-duty-schedules-permission.service';
import {
  LEADERSHIP_DUTY_SCHEDULES_PERMISSION_KEY,
  LEADERSHIP_DUTY_SCHEDULES_FEATURE_CODE_KEY,
  LeadershipDutySchedulesPermissionAction,
} from '../decorators/leadership-duty-schedules-permission.decorator';

@Injectable()
export class LeadershipDutySchedulesPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly permissionService: LeadershipDutySchedulesPermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action =
      this.reflector.getAllAndOverride<LeadershipDutySchedulesPermissionAction>(
        LEADERSHIP_DUTY_SCHEDULES_PERMISSION_KEY,
        [context.getHandler(), context.getClass()],
      );

    const featureCode = this.reflector.getAllAndOverride<string>(
      LEADERSHIP_DUTY_SCHEDULES_FEATURE_CODE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!action) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user || request.effectiveUser;
    const userId = user?.userId || request.userId;

    if (!userId) {
      throw new ForbiddenException('Người dùng chưa đăng nhập');
    }

    const params = request.params || {};
    const body = request.body || {};
    const query = request.query || {};

    const recordId =
      params.id ||
      body.leadershipDutyScheduleId ||
      body.id ||
      query.id;

    switch (action) {
      case LeadershipDutySchedulesPermissionAction.CREATE:
        return this.permissionService.checkCreate(
          userId,
          body.flowConfig || query.flowConfig,
        );

      case LeadershipDutySchedulesPermissionAction.UPDATE:
        if (!recordId) {
          return this.permissionService.checkFeatureAccess(userId, featureCode);
        }
        return this.permissionService.checkUpdate(userId, recordId);

      case LeadershipDutySchedulesPermissionAction.DELETE:
        if (!recordId) {
          return this.permissionService.checkFeatureAccess(userId, featureCode);
        }
        return this.permissionService.checkDelete(userId, recordId);

      case LeadershipDutySchedulesPermissionAction.VIEW:
        if (!recordId) {
          return this.permissionService.checkFeatureAccess(userId, featureCode);
        }
        return this.permissionService.checkView(userId, recordId);

      case LeadershipDutySchedulesPermissionAction.PROCESS:
        if (!recordId) {
          return this.permissionService.checkFeatureAccess(userId, featureCode);
        }
        return this.permissionService.checkProcess(userId, recordId);

      case LeadershipDutySchedulesPermissionAction.MANAGE:
        return this.permissionService.checkFeatureAccess(userId, featureCode);

      default:
        return true;
    }
  }
}