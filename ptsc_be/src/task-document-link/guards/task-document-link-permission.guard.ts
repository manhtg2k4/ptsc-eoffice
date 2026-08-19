import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  TaskDocumentLinkPermissionService,
  TaskDocumentLinkAction,
} from '../task-document-link-permission.service';
import { TASK_DOCUMENT_LINK_PERMISSION_KEY } from '../decorators/task-document-link-permission.decorator';

@Injectable()
export class TaskDocumentLinkPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly permissionService: TaskDocumentLinkPermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<TaskDocumentLinkAction>(
      TASK_DOCUMENT_LINK_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!action) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId || request.user?.user || request.user?.sub || request.user?.id;

    if (!userId) {
      throw new ForbiddenException('Bạn cần đăng nhập để thực hiện hành động này.');
    }

    const params = request.params || {};
    const body = request.body || {};
    const query = request.query || {};

    const taskId = query.taskId || body.taskId || params.taskId;
    const linkId = params.id ? Number(params.id) : undefined;
    const linkIds = body.ids;

    return await this.permissionService.checkPermission(userId, action, {
      taskId,
      linkId,
      linkIds,
    });
  }
}
