import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeedbackPermissionService } from '../feedback-permission.service';
import { FEEDBACK_PERMISSION_KEY, FeedbackPermissionAction } from '../decorators/feedback-permission.decorator';

@Injectable()
export class FeedbackPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly feedbackPermissionService: FeedbackPermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<FeedbackPermissionAction>(
      FEEDBACK_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!action) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const userId = user?.userId;

    if (!userId) {
      throw new ForbiddenException('Người dùng chưa đăng nhập');
    }

    const { params, body, query } = request;
    const id = params.id || body.id || query.id;

    switch (action) {
      case FeedbackPermissionAction.CREATE:
        return this.feedbackPermissionService.checkCreate(userId);

      case FeedbackPermissionAction.UPDATE:
        if (!id) throw new BadRequestException('Thiếu ID phản ánh để kiểm tra quyền');
        return this.feedbackPermissionService.checkUpdate(userId, String(id));

      case FeedbackPermissionAction.DELETE: {
        const deleteIds = body.ids || params.id || query.ids || (params.id ? [params.id] : []);
        if (!deleteIds || (Array.isArray(deleteIds) && deleteIds.length === 0)) {
          return true;
        }
        const idList = Array.isArray(deleteIds) ? deleteIds : [deleteIds];
        for (const deleteId of idList) {
          await this.feedbackPermissionService.checkDelete(userId, String(deleteId));
        }
        return true;
      }

      case FeedbackPermissionAction.DISPATCH:
        return this.feedbackPermissionService.checkDispatch(userId);

      case FeedbackPermissionAction.ACCEPT:
        if (!id) throw new BadRequestException('Thiếu ID phản ánh để tiếp nhận');
        return this.feedbackPermissionService.checkAccept(userId, String(id));

      case FeedbackPermissionAction.COMPLETE:
        if (!id) throw new BadRequestException('Thiếu ID phản ánh để hoàn thành');
        return this.feedbackPermissionService.checkComplete(userId, String(id));

      case FeedbackPermissionAction.RATING:
        if (!id) throw new BadRequestException('Thiếu ID phản ánh để đánh giá');
        return this.feedbackPermissionService.checkRating(userId, String(id));

      case FeedbackPermissionAction.REJECT:
        if (!id) throw new BadRequestException('Thiếu ID phản ánh để từ chối');
        if (String(request.route?.path || '').includes('reject-unit')) {
          return this.feedbackPermissionService.checkRejectUnit(userId, String(id));
        }
        return this.feedbackPermissionService.checkRejectDispatch(userId, String(id));

      default:
        return true;
    }
  }
}
