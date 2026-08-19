import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MeetingPermissionService } from '../meeting-permission.service';
import {
  MEETING_PERMISSION_KEY,
  MEETING_FEATURE_CODE_KEY,
  MeetingPermissionAction,
} from '../decorators/meeting-permission.decorator';

@Injectable()
export class MeetingPermissionGuard implements CanActivate {
  private readonly logger = new Logger(MeetingPermissionGuard.name);
  constructor(
    private reflector: Reflector,
    private readonly permissionService: MeetingPermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<MeetingPermissionAction>(
      MEETING_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    const featureCode = this.reflector.getAllAndOverride<string>(
      MEETING_FEATURE_CODE_KEY,
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
    const meetingId = params.id || body.meetingId || body.id || query.id;

    switch (action) {
      case MeetingPermissionAction.CREATE:
        this.logger.log(`[1] GUARD CREATE userId=${userId} flowConfig=${body?.flowConfig}`);
        return this.permissionService.checkCreate(userId, body.flowConfig);

      case MeetingPermissionAction.UPDATE:
        if (!meetingId) {
          return this.permissionService.checkFeatureAccess(userId, featureCode);
        }
        return this.permissionService.checkUpdate(userId, meetingId);

      case MeetingPermissionAction.UPDATE_PARTICIPANT:
        if (!meetingId) {
          return this.permissionService.checkFeatureAccess(userId, featureCode);
        }
        return this.permissionService.checkView(userId, meetingId);

      case MeetingPermissionAction.DELETE:
        if (!meetingId) {
          return this.permissionService.checkFeatureAccess(userId, featureCode);
        }
        return this.permissionService.checkDelete(userId, meetingId);

      case MeetingPermissionAction.VIEW:
        if (!meetingId) {
          return this.permissionService.checkFeatureAccess(userId, featureCode);
        }
        return this.permissionService.checkView(userId, meetingId);

      case MeetingPermissionAction.PROCESS:
        if (!meetingId) {
          throw new BadRequestException('Thiếu meetingId');
        }
        return this.permissionService.checkProcess(userId, meetingId);

      case MeetingPermissionAction.MANAGE:
        return this.permissionService.checkFeatureAccess(userId, featureCode);

      default:
        return true;
    }
  }
}