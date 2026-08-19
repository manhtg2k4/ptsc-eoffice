import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TaskDocumentLinkEntity } from './entities/task-document-link.entity';
import { TaskEntity } from 'src/task/entity/task.entity';
import { TaskPermissionService } from 'src/task/task-permission.service';

export enum TaskDocumentLinkAction {
  VIEW = 'view',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

@Injectable()
export class TaskDocumentLinkPermissionService {
  constructor(
    @InjectRepository(TaskDocumentLinkEntity, 'mssqlConnection')
    private readonly linkRepo: Repository<TaskDocumentLinkEntity>,
    @InjectRepository(TaskEntity, 'mssqlConnection')
    private readonly taskRepo: Repository<TaskEntity>,
    @Inject(forwardRef(() => TaskPermissionService))
    private readonly taskPermissionService: TaskPermissionService,
  ) {}

  async checkPermission(
    userId: string,
    action: TaskDocumentLinkAction,
    options: { taskId?: string; linkId?: number; linkIds?: number[] },
  ): Promise<boolean> {
    if (options.linkId && action !== TaskDocumentLinkAction.CREATE) {
      const link = await this.linkRepo.findOne({ where: { id: options.linkId } });
      if (!link) throw new NotFoundException(`Khong tim thay link tai lieu ID ${options.linkId}`);
      if (link.createdById !== userId) {
        throw new ForbiddenException('Ban chi duoc thao tac voi link tai lieu do chinh ban tao.');
      }
    }

    if (
      options.linkIds &&
      options.linkIds.length > 0 &&
      action === TaskDocumentLinkAction.DELETE
    ) {
      const links = await this.linkRepo.findBy({ id: In(options.linkIds) });
      if (links.length !== options.linkIds.length) {
        throw new NotFoundException('Co link tai lieu khong ton tai trong danh sach xoa.');
      }
      const unauthorized = links.find((link) => link.createdById !== userId);
      if (unauthorized) {
        throw new ForbiddenException('Ban chi duoc xoa cac link tai lieu do chinh ban tao.');
      }
    }

    let taskIdStr = options.taskId;
    
    // 1. Lấy taskId nếu chỉ có linkId
    if (!taskIdStr && options.linkId) {
      const link = await this.linkRepo.findOne({ where: { id: options.linkId } });
      if (!link) throw new NotFoundException(`Không tìm thấy link tài liệu ID ${options.linkId}`);
      taskIdStr = link.taskId;
    }

    if (!taskIdStr && options.linkIds && options.linkIds.length > 0) {
      const link = await this.linkRepo.findOne({ where: { id: options.linkIds[0] } });
      if (link) taskIdStr = link.taskId;
    }

    if (!taskIdStr) return true;

    const numericTaskId = Number(taskIdStr);
    if (isNaN(numericTaskId)) return true; // Không phải số (có thể là UUID của đối tượng khác), cho qua

    // 2. Tìm thông tin Công việc
    const task = await this.taskRepo.findOne({
      where: { id: numericTaskId },
    });

    if (!task) return true;

    // 3. Kiểm tra quyền trên Công việc
    try {
      if (action === TaskDocumentLinkAction.VIEW) {
        await this.taskPermissionService.checkView(userId, task.id);
      } else {
        await this.taskPermissionService.checkUpdate(userId, task.id);
      }
    } catch (error) {
      throw new ForbiddenException(`Bạn không có quyền truy cập công việc liên quan: ${error.message}`);
    }

    // 4. Kiểm tra quyền trên Dự án (nếu công việc thuộc dự án)
    if (task.projectId) {
      const hasProjectAccess = await this.checkProjectAccess(userId, task.projectId);
      if (!hasProjectAccess) {
        throw new ForbiddenException('Bạn không có quyền truy cập vào dự án chứa công việc này.');
      }
    }

    return true;
  }

  private async checkProjectAccess(userId: string, projectId: number): Promise<boolean> {
    if (!projectId || !userId) return false;
    const query = `
      SELECT TOP 1 1 as allow FROM projects p WHERE p.id = @0 AND p.createdBy = @1
      UNION ALL
      SELECT TOP 1 1 as allow FROM project_members pm WHERE pm.project_id = @0 AND pm.user_id = @1
      UNION ALL
      SELECT TOP 1 1 as allow FROM task_users tu
      INNER JOIN task t ON tu.task_id = t.id
      WHERE t.project_id = @0 AND tu.process_id = @1
    `;
    const result = await this.taskRepo.query(query, [projectId, userId]);
    return result && result.length > 0;
  }
}
