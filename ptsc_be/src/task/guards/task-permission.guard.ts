import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TaskPermissionService } from '../task-permission.service';
import { TASK_PERMISSION_KEY, TaskPermissionAction } from '../decorators/task-permission.decorator';

@Injectable()
export class TaskPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly taskPermissionService: TaskPermissionService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<TaskPermissionAction>(
      TASK_PERMISSION_KEY,
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

    switch (action) {
      case TaskPermissionAction.CREATE:
        return this.taskPermissionService.checkCreate(userId, body);

      case TaskPermissionAction.UPDATE:
        const updateIds = body.taskIds || body.ids || params.id || body.id || body.taskId || query.id;
        if (!updateIds || (Array.isArray(updateIds) && updateIds.length === 0)) {
          throw new BadRequestException('Thiếu ID công việc để kiểm tra quyền');
        }
        const updateIdList = Array.isArray(updateIds) ? updateIds : [updateIds];
        for (const id of updateIdList) {
          await this.taskPermissionService.checkUpdate(userId, Number(id));
        }
        return true;

      case TaskPermissionAction.DELETE:
        const deleteIds = body.ids || params.id || query.ids || (params.id ? [params.id] : []);
        if (!deleteIds || (Array.isArray(deleteIds) && deleteIds.length === 0)) {
          return true;
        }
        const idList = Array.isArray(deleteIds) ? deleteIds : [deleteIds];
        for (const id of idList) {
          await this.taskPermissionService.checkDelete(userId, Number(id));
        }
        return true;

      case TaskPermissionAction.SEND_APPROVAL:
      case TaskPermissionAction.SEND_ADJUST:
      case TaskPermissionAction.APPROVE:
        const operationId = body.taskId || body.id || params.id || query.taskId || query.id;
        if (!operationId) throw new BadRequestException('Thiếu ID công việc để thực hiện hành động');

        if (action === TaskPermissionAction.SEND_APPROVAL) {
          return this.taskPermissionService.checkSendApproval(userId, Number(operationId));
        } else if (action === TaskPermissionAction.SEND_ADJUST) {
          return this.taskPermissionService.checkSendAdjust(userId, Number(operationId));
        } else {
          return this.taskPermissionService.checkApprove(userId, Number(operationId));
        }

      case TaskPermissionAction.VIEW:
        const viewId = params.id || query.id || body.id || params.taskId || query.taskId;
        if (!viewId) return true; // Can't check without ID, allow basic access (listing endpoints usually have their own logic)
        return this.taskPermissionService.checkView(userId, Number(viewId));

      default:
        return true;
    }
  }
}
