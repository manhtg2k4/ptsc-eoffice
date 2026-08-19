import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MeetingRoomsPermissionService } from '../meeting-rooms-permission.service';
import {
  MEETING_ROOMS_PERMISSION_KEY,
  MEETING_ROOMS_FEATURE_CODE_KEY,
  MeetingRoomsPermissionAction,
} from '../decorators/meeting-rooms-permission.decorator';

@Injectable()
export class MeetingRoomsPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly permissionService: MeetingRoomsPermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action =
      this.reflector.getAllAndOverride<MeetingRoomsPermissionAction>(
        MEETING_ROOMS_PERMISSION_KEY,
        [context.getHandler(), context.getClass()],
      );

    const featureCode = this.reflector.getAllAndOverride<string>(
      MEETING_ROOMS_FEATURE_CODE_KEY,
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
      body.meetingRoomId ||
      body.id ||
      query.id;

    switch (action) {
      case MeetingRoomsPermissionAction.CREATE:
        return this.permissionService.checkCreate(
          userId,
          body.flowConfig || query.flowConfig,
        );

      case MeetingRoomsPermissionAction.UPDATE:
        if (!recordId) {
          return this.permissionService.checkFeatureAccess(userId, featureCode);
        }
        return this.permissionService.checkUpdate(userId, recordId);

      case MeetingRoomsPermissionAction.DELETE:
        if (!recordId) {
          return this.permissionService.checkFeatureAccess(userId, featureCode);
        }
        return this.permissionService.checkDelete(userId, recordId);

      case MeetingRoomsPermissionAction.VIEW:
        if (!recordId) {
          return this.permissionService.checkFeatureAccess(userId, featureCode);
        }
        return this.permissionService.checkView(userId, recordId);

      case MeetingRoomsPermissionAction.PROCESS:
        if (!recordId) {
          return this.permissionService.checkFeatureAccess(userId, featureCode);
        }
        return this.permissionService.checkProcess(userId, recordId);

      case MeetingRoomsPermissionAction.MANAGE:
        return this.permissionService.checkFeatureAccess(userId, featureCode);

      default:
        return true;
    }
  }
}