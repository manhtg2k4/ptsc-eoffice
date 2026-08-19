import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskEntity } from './entity/task.entity';
import { TaskUserEntity } from './entity/task-user.entity';
import { TaskUserRole } from './entity/task.constants';
import { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class TaskPermissionService {
  constructor(
    @InjectRepository(TaskEntity, 'mssqlConnection')
    private readonly taskRepo: Repository<TaskEntity>,
    @InjectRepository(TaskUserEntity, 'mssqlConnection')
    private readonly taskUserRepo: Repository<TaskUserEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepo: Repository<UserEntity>,
  ) { }

  /**
   * Kiểm tra quyền tạo công việc
   */
  async checkCreate(userId: string, dto: any): Promise<boolean> {
    // Logic: Mọi người dùng đều có thể tạo công việc (hoặc theo cấu hình hệ thống)
    // Có thể thêm kiểm tra nếu cần giới hạn người tạo
    return true;
  }

  /**
   * Kiểm tra quyền cập nhật công việc
   */
  async checkUpdate(userId: string, taskId: number): Promise<boolean> {
    const task = await this.getTaskWithUsers(taskId);

    // 1. Người tạo có quyền sửa
    if (task.createdById === userId) return true;

    // 2. Kiểm tra nếu người dùng là "người liên quan" (có trong task-users)
    const userRole = await this.getUserTaskRole(userId, task);
    if (userRole) return true; // Cho phép tất cả người liên quan (Assigner, Director, Supporter, Viewer) cập nhật theo yêu cầu người dùng

    // 3. Kiểm tra nếu công việc thuộc dự án và người dùng có quyền quản lý dự án
    let projectId = task.projectId;
    if (!projectId && task.parent) {
      const parentTask = await this.taskRepo.findOne({
        where: { id: Number(task.parent) },
        select: ['projectId'],
      });
      projectId = parentTask?.projectId || null;
    }
    if (projectId) {
      const isProjManager = await this.isProjectManager(userId, projectId);
      if (isProjManager) return true;
    }

    throw new ForbiddenException('Bạn không có quyền chỉnh sửa công việc này');
  }

  /**
   * Kiểm tra quyền xóa công việc
   */
  async checkDelete(userId: string, taskId: number): Promise<boolean> {
    const task = await this.getTaskWithUsers(taskId);

    // Chỉ người tạo hoặc người giao mới được xóa
    if (task.createdById === userId) return true;

    const isAssigner = task.taskUsers.some(
      (tu) => tu.processId === userId && tu.role === TaskUserRole.ASSIGNER,
    );
    if (isAssigner) return true;

    throw new ForbiddenException('Bạn không có quyền xóa công việc này');
  }

  /**
   * Kiểm tra quyền gửi phê duyệt
   */
  async checkSendApproval(userId: string, taskId: number): Promise<boolean> {
    const task = await this.getTaskWithUsers(taskId);

    //Người chủ trì có quyền gửi phê duyệt
    const hasRole = task.taskUsers.some(
      (tu) => tu.processId === userId && [TaskUserRole.DIRECTOR].includes(tu.role as TaskUserRole),
    );

    if (!hasRole) {
      throw new ForbiddenException('Bạn không có quyền gửi phê duyệt công việc này');
    }

    // Kiểm tra trạng thái: Không thể gửi phê duyệt nếu đã hoàn thành hoặc đang chờ phê duyệt
    if (['Hoàn thành', 'Chờ phê duyệt'].includes(task.processStatus || '')) {
      throw new BadRequestException(`Không thể gửi phê duyệt khi công việc đang ở trạng thái: ${task.processStatus}`);
    }

    return true;
  }

  /**
   * Kiểm tra quyền gửi điều chỉnh
   */
  async checkSendAdjust(userId: string, taskId: number): Promise<boolean> {
    const task = await this.getTaskWithUsers(taskId);

    // Thường là người phê duyệt hoặc cấp quản lý gửi yêu cầu điều chỉnh
    // Logic này tùy thuộc vào quy trình BPMN, ở đây tạm xác định người giao/chủ trì hoặc người tạo
    const hasRole = task.createdById === userId || task.taskUsers.some(
      (tu) => tu.processId === userId && [TaskUserRole.ASSIGNER, TaskUserRole.DIRECTOR].includes(tu.role as TaskUserRole),
    );

    if (!hasRole) {
      throw new ForbiddenException('Bạn không có quyền gửi yêu cầu điều chỉnh công việc này');
    }

    return true;
  }

  /**
   * Kiểm tra quyền phê duyệt công việc
   */
  async checkApprove(userId: string, taskId: number): Promise<boolean> {
    const task = await this.getTaskWithUsers(taskId);

    // Người giao (Assigner) hoặc Người chủ trì (Director) có quyền phê duyệt/từ chối
    const isAssigner = task.taskUsers.some(
      (tu) => tu.processId === userId && tu.role === TaskUserRole.ASSIGNER,
    );
    const isDirector = task.taskUsers.some(
      (tu) => tu.processId === userId && tu.role === TaskUserRole.DIRECTOR,
    );

    if (isAssigner || isDirector) return true;

    // Có thể thêm kiểm tra người phê duyệt cụ thể từ BPMN TaskUser
    throw new ForbiddenException('Bạn không có quyền phê duyệt công việc này');
  }

  /**
   * Kiểm tra quyền xem chi tiết công việc
   */
  async checkView(userId: string, taskId: number): Promise<boolean> {
    const task = await this.getTaskWithUsers(taskId);

    // 1. Người tạo có quyền xem
    if (task.createdById === userId) return true;

    // 2. Kiểm tra vai trò trực tiếp hoặc qua phòng ban
    const userRole = await this.getUserTaskRole(userId, task);
    if (userRole) return true;

    // 3. Fallback theo cây công việc (giống hành vi danh sách viewers=true):
    // nếu user có tham gia ở task cha/con cùng cây thì vẫn cho xem chi tiết
    const hasTreeAccess = await this.hasAccessInTaskTree(userId, taskId);
    if (hasTreeAccess) return true;

    // 4. Đồng bộ với tiêu chí list: nếu user có quyền qua vai trò quản lý đơn vị
    // (assigner/director/supporter/viewer trong cây đơn vị quản lý) thì cũng cho xem detail.
    const hasManagerScopeAccess = await this.hasManagerScopeAccess(userId, taskId);
    if (hasManagerScopeAccess) return true;

    // 5. Kiểm tra quyền truy cập qua Dự án (nếu công việc thuộc dự án)
    let projectId = task.projectId;
    if (!projectId && task.parent) {
      const parentTask = await this.taskRepo.findOne({
        where: { id: Number(task.parent) },
        select: ['projectId'],
      });
      projectId = parentTask?.projectId || null;
    }
    if (projectId) {
      const hasProjAccess = await this.hasProjectAccess(userId, projectId);
      if (hasProjAccess) return true;
    }

    throw new ForbiddenException('Bạn không có quyền xem chi tiết công việc này');
  }

  private async hasAccessInTaskTree(userId: string, taskId: number): Promise<boolean> {
    const rows = await this.taskRepo.query(
      `
      ;WITH RecursiveDescendants AS (
        SELECT id, parent FROM task WHERE id = @0
        UNION ALL
        SELECT t.id, t.parent
        FROM task t
        INNER JOIN RecursiveDescendants rd ON t.parent = rd.id
      ),
      RecursiveAncestors AS (
        SELECT id, parent FROM task WHERE id = @0
        UNION ALL
        SELECT t.id, t.parent
        FROM task t
        INNER JOIN RecursiveAncestors ra ON t.id = ra.parent
      ),
      RelatedTasks AS (
        SELECT id FROM RecursiveDescendants
        UNION
        SELECT id FROM RecursiveAncestors
      )
      SELECT TOP 1 1 AS allow
      FROM task_users tu
      INNER JOIN RelatedTasks rt ON rt.id = tu.task_id
      WHERE LOWER(tu.process_id) = LOWER(@1)
        AND tu.role IN ('viewer', 'assigner', 'director', 'supporter')
      `,
      [taskId, userId],
    );

    return Array.isArray(rows) && rows.length > 0;
  }

  private async hasManagerScopeAccess(userId: string, taskId: number): Promise<boolean> {
    const rows = await this.taskRepo.query(
      `
      SELECT TOP 1 1 AS allow
      FROM task t
      WHERE t.id = @0
        AND EXISTS (
          SELECT 1
          FROM users uSelf
          WHERE LOWER(uSelf.id) = LOWER(@1)
            AND EXISTS (
              SELECT 1
              FROM users uAssignee
              INNER JOIN task_users tuAssignee ON tuAssignee.process_id = uAssignee.id
              WHERE tuAssignee.task_id = t.id
                AND tuAssignee.role IN ('assigner','director','supporter','viewer')
                AND (
                  LOWER(uAssignee.parent) = LOWER(uSelf.parent)
                  OR LOWER(uAssignee.id) = LOWER(uSelf.id)
                )
            )
        )
      `,
      [taskId, userId],
    );

    return Array.isArray(rows) && rows.length > 0;
  }

  /**
   * Lấy vai trò của user trong task (trực tiếp hoặc qua phòng ban)
   */
  private async getUserTaskRole(userId: string, task: TaskEntity): Promise<string | null> {
    const normalizedUserId = String(userId || '').trim().toLowerCase();
    const currentUser = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'username'],
      relations: ['parent'],
    });
    const normalizedUsername = String(currentUser?.username || '').trim().toLowerCase();

    // 1. Check trực tiếp theo processId (không ép type = 1 vì dữ liệu cũ có thể null/khác)
    const directUser = task.taskUsers.find(
      (tu) => {
        const pid = String(tu.processId || '').trim().toLowerCase();
        return pid === normalizedUserId || (!!normalizedUsername && pid === normalizedUsername);
      },
    );
    if (directUser) return directUser.role;

    // 2. Check qua phòng ban (type = 2)
    if (currentUser?.parent?.id) {
      const deptId = String(currentUser.parent?.id || '').trim().toLowerCase();
      const deptUser = task.taskUsers.find(
        (tu) =>
          String(tu.processId || '').trim().toLowerCase() === deptId &&
          tu.type === 2,
      );
      if (deptUser) return deptUser.role;
    }

    return null;
  }

  private async getTaskWithUsers(taskId: number): Promise<TaskEntity> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['taskUsers'],
    });

    if (!task) {
      throw new NotFoundException(`Không tìm thấy công việc với ID: ${taskId}`);
    }

    return task;
  }

  /**
   * Kiểm tra người dùng có quyền truy cập dự án hay không (Creator, Manager, Member, Viewer)
   */
  private async hasProjectAccess(userId: string, projectId: number): Promise<boolean> {
    if (!projectId || !userId) return false;

    const currentUser = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'username'],
    });
    const username = currentUser?.username || userId;

    const rows = await this.taskRepo.query(
      `
      SELECT TOP 1 1 AS allow
      FROM projects p
      WHERE p.id = @0 AND (
        LOWER(p.createdBy) = LOWER(@1) OR LOWER(p.createdBy) = LOWER(@2)
        OR CHARINDEX(LOWER(@1), LOWER(ISNULL(p.managerId, ''))) > 0
        OR CHARINDEX(LOWER(@2), LOWER(ISNULL(p.managerId, ''))) > 0
        OR CHARINDEX(LOWER(@1), LOWER(ISNULL(p.members, ''))) > 0
        OR CHARINDEX(LOWER(@2), LOWER(ISNULL(p.members, ''))) > 0
        OR CHARINDEX(LOWER(@1), LOWER(ISNULL(p.viewers, ''))) > 0
        OR CHARINDEX(LOWER(@2), LOWER(ISNULL(p.viewers, ''))) > 0
      )
      UNION ALL
      SELECT TOP 1 1 AS allow
      FROM project_members pm
      WHERE pm.project_id = @0 AND (
        LOWER(pm.user_id) = LOWER(@1) OR LOWER(pm.user_id) = LOWER(@2)
      )
      `,
      [projectId, userId, username],
    );

    return Array.isArray(rows) && rows.length > 0;
  }

  /**
   * Kiểm tra người dùng có phải là Quản lý dự án hay không
   */
  private async isProjectManager(userId: string, projectId: number): Promise<boolean> {
    if (!projectId || !userId) return false;

    const currentUser = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'username'],
    });
    const username = currentUser?.username || userId;

    const rows = await this.taskRepo.query(
      `
      SELECT TOP 1 1 AS allow
      FROM projects p
      WHERE p.id = @0 AND (
        LOWER(p.createdBy) = LOWER(@1) OR LOWER(p.createdBy) = LOWER(@2)
        OR CHARINDEX(LOWER(@1), LOWER(ISNULL(p.managerId, ''))) > 0
        OR CHARINDEX(LOWER(@2), LOWER(ISNULL(p.managerId, ''))) > 0
      )
      UNION ALL
      SELECT TOP 1 1 AS allow
      FROM project_members pm
      WHERE pm.project_id = @0
        AND LOWER(pm.role) = 'manager'
        AND (LOWER(pm.user_id) = LOWER(@1) OR LOWER(pm.user_id) = LOWER(@2))
      `,
      [projectId, userId, username],
    );

    return Array.isArray(rows) && rows.length > 0;
  }
}
