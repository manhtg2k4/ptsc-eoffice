import { Inject, Injectable, Logger } from '@nestjs/common';
import * as moment from 'moment';
import { DataSource, Repository, SelectQueryBuilder, Brackets } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { TaskEntity } from '../entity/task.entity';
import { ListTaskDto, TaskTab } from '../dto/list-task.dto';
import { TASK_TYPE } from '../dto/create-task.dto';
import { GROUP_CODES, stageStatusDoc } from 'src/variable/CONST_STATUS';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { MSSQL_REPO } from 'src/database/database.provider';
import { TaskAssignmentConfigEntity } from '../entity/task-assignment-config.entity';
export class TaskAdvancedFilterDto {
  name?: string;
  typeRequest?: string;
  source?: string;
  approveStatus?: string;
  senderId?: string;
  sentFrom?: string;
  sentTo?: string;
  approvedFrom?: string;
  approvedTo?: string;
  myAssign?: string;
}

@Injectable()
export class TaskRepository extends Repository<TaskEntity> {
  private readonly logger = new Logger(TaskRepository.name);
  constructor(
    @InjectDataSource('mssqlConnection')
    private readonly dataSource: DataSource,
    @Inject(MSSQL_REPO) private readonly repo: MSSQLRepository,
  ) {
    super(TaskEntity, dataSource.createEntityManager());
  }

  private applyTabFilter(
    qb: SelectQueryBuilder<TaskEntity>,
    tab?: TaskTab,
    hasParentFilter = false,
    typeTask?: string,
    visibleChildIds: number[] | { query: string, params: any } = [],
  ) {
    // Chỉ áp dụng tab filter cho loại task 'general', bỏ qua cho project, form_doc, v.v.
    if (typeTask && typeTask !== 'general') return;
    switch (tab) {
      case TaskTab.REPEAT:
        qb.andWhere('task.repetitiveTask = :repeat', { repeat: 'co' });
        break;
      case TaskTab.DOCUMENT:
        qb.andWhere('task.bpmnId IS NOT NULL');
        break;
      case TaskTab.MEETING:
        qb.andWhere('task.parent IS NOT NULL');
        break;
      case TaskTab.GENERAL:
      default:
        qb.andWhere(
          new Brackets((generalQb) => {
            generalQb
              .where('task.repetitiveTask = :repeat', { repeat: 'khong' })
              .orWhere('task.repetitiveTask IS NULL')
              .orWhere("task.repetitiveTask = ''");
          }),
        ).andWhere('task.bpmnId IS NULL');
        if (!hasParentFilter) {
          qb.andWhere(
            new Brackets((parentQb) => {
              parentQb.where('task.parent IS NULL');
              if (visibleChildIds) {
                if (Array.isArray(visibleChildIds) && visibleChildIds.length > 0) {
                  if (visibleChildIds.length <= 2000) {
                    parentQb.orWhere('task.id IN (:...visibleChildIds)', { visibleChildIds });
                  } else {
                    parentQb.orWhere(
                      `task.id IN (
                        SELECT CAST(value AS BIGINT)
                        FROM OPENJSON(:visibleChildIdsJson)
                      )`,
                      { visibleChildIdsJson: JSON.stringify(visibleChildIds) },
                    );
                  }
                } else if (!Array.isArray(visibleChildIds) && visibleChildIds.query) {
                  parentQb.orWhere(visibleChildIds.query, visibleChildIds.params);
                }
              }
            }),
          );
        }
        break;
    }
  }

  // ===== LOGIC CŨ - SỬ DỤNG WORKITEM VÀ AUDIT =====
  // async getFlowTaskIds(userId: string): Promise<number[]> {
  //   const wiRows = await this.dataSource
  //     .createQueryBuilder()
  //     .select('DISTINCT TRY_CAST(document_id AS BIGINT)', 'taskId')
  //     .from('work_items', 'wi')
  //     .where('assignee_user_id = :userId', { userId })
  //     .andWhere('TRY_CAST(document_id AS BIGINT) IS NOT NULL')
  //     .getRawMany();

  //   const assignerRows = await this.dataSource
  //     .createQueryBuilder()
  //     .select('DISTINCT task_id', 'taskId')
  //     .from('task_users', 'tu')
  //     .where('process_id = :userId', { userId })
  //     .andWhere("role = 'assigner'")
  //     .getRawMany();

  //   const wiIds = wiRows.map((r: any) => Number(r.taskId));
  //   const assignerIds = assignerRows.map((r: any) => Number(r.taskId));
  //   return [...new Set([...wiIds, ...assignerIds])];
  // }

  /**
   * Lấy danh sách task IDs mà user có quyền xem
   * - Tasks mà user là director (người chủ trì)
   * - Tasks mà user là assigner (người thực hiện)
   * - Tasks mà user là supporter (người hỗ trợ)
   * - Tasks mà user là viewer (người xem)
   * - Tasks được giao cho đơn vị (type=2) nếu user là Văn thư (VAN_THU)
   * - Tasks được giao cho đơn vị (type=2) của người uỷ quyền cho user này
   */
  private buildUserTaskIdsSubquery(userId: string, unitId?: string, isClerk?: boolean, delegatedConfigs?: TaskAssignmentConfigEntity[]) {
    let subquery = `EXISTS (
      SELECT 1 FROM task_users tu_res
      WHERE tu_res.task_id = task.id
        AND LOWER(tu_res.process_id) = LOWER(:resUserId)
    )`;
    const params: any = { resUserId: userId };

    if (unitId && isClerk) {
      subquery += ` OR EXISTS (
        SELECT 1 FROM task_users tu_res
        WHERE tu_res.task_id = task.id
          AND tu_res.process_id = :resUnitId AND tu_res.type = 2
          AND NOT EXISTS (
            SELECT 1 FROM task_assignment_configs tac 
            WHERE tac.unit_id = :resUnitId AND tac.status = 1
          )
      )`;
      params.resUnitId = unitId;
    }

    if (delegatedConfigs && delegatedConfigs.length > 0) {
      delegatedConfigs.forEach((config, idx) => {
        const dUnitIdParam = 'dUnitId' + idx;
        const dStartParam = 'dStart' + idx;
        const dEndParam = 'dEnd' + idx;

        if (config.status === 2) {
          subquery += ` OR EXISTS (
            SELECT 1 FROM task_users tu_res
            WHERE tu_res.task_id = task.id
              AND tu_res.process_id = :${dUnitIdParam} AND tu_res.type = 2
              AND task.created_at >= :${dStartParam}
              AND task.created_at <= :${dEndParam}
          )`;
          params[dEndParam] = config.updatedAt;
        } else {
          subquery += ` OR EXISTS (
            SELECT 1 FROM task_users tu_res
            WHERE tu_res.task_id = task.id
              AND tu_res.process_id = :${dUnitIdParam} AND tu_res.type = 2
              AND task.created_at >= :${dStartParam}
          )`;
        }
        params[dUnitIdParam] = config.unitId;
        params[dStartParam] = config.createdAt;
      });
    }

    return { query: `(${subquery})`, params };
  }

  async getTaskIdsByUserRole(
    userId: string,
    unitId?: string,
    isClerk?: boolean,
    delegatedConfigs?: TaskAssignmentConfigEntity[],
    typeTask?: string,
    status?: number | number[],
  ): Promise<number[]> {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('DISTINCT tu.task_id', 'taskId')
      .from('task_users', 'tu')
      .innerJoin(TaskEntity, 'task', 'task.id = tu.task_id')
      .where(
        new Brackets((q) => {
          q.where('tu.process_id = :userId', { userId });
          if (unitId && isClerk) {
            q.orWhere(`(tu.process_id = :unitId AND tu.type = 2 AND NOT EXISTS (
              SELECT 1 FROM task_assignment_configs tac 
              WHERE tac.unit_id = :unitId AND tac.status = 1
            ))`, { unitId });
          }
          // Nếu user được uỷ quyền, cũng xem được task giao cho đơn vị của người uỷ quyền
          // Chỉ xem được các task tạo trong khoảng thời gian được uỷ quyền
          if (delegatedConfigs && delegatedConfigs.length > 0) {
            delegatedConfigs.forEach((config, idx) => {
              const dUnitIdParam = `dUnitId${idx}`;
              const dStartParam = `dStart${idx}`;
              const dEndParam = `dEnd${idx}`;

              let condition = `(tu.process_id = :${dUnitIdParam} AND tu.type = 2 AND task.created_at >= :${dStartParam})`;
              const params: any = {
                [dUnitIdParam]: config.unitId,
                [dStartParam]: config.createdAt,
              };

              if (config.status === 2) {
                condition += ` AND task.created_at <= :${dEndParam}`;
                params[dEndParam] = config.updatedAt;
              }

              q.orWhere(condition, params);
            });
          }
        }),
      );

    if (typeTask) {
      qb.andWhere('task.typeTask = :typeTask', { typeTask });
    }

    if (status !== undefined && status !== null) {
      if (Array.isArray(status)) {
        qb.andWhere('task.status IN (:...statuses)', { statuses: status });
      } else {
        qb.andWhere('task.status = :status', { status });
      }
    }

    const taskUserRows = await qb.getRawMany();

    return taskUserRows.map((r: any) => Number(r.taskId));
  }

  async findAllTasks(
    queryParams: ListTaskDto,
    userId?: string,
    unitId?: string,
    isClerk?: boolean,
    delegatedConfigs?: TaskAssignmentConfigEntity[],
  ) {
    const ctx = await this.repo_findAllTasks_getContext(
      queryParams,
      userId,
      unitId,
      isClerk,
      delegatedConfigs,
    );

    const pageNum = Number(queryParams.page) || 1;
    const limitNum = Number(queryParams.limit) || 10;

    const idQb = this.createQueryBuilder('task').select('task.id', 'id');
    this.repo_findAllTasks_applyFilters(idQb, queryParams, userId, ctx, false);
    this.repo_findAllTasks_applySort(idQb, queryParams);

    const countQb = this.createQueryBuilder('task');
    this.repo_findAllTasks_applyFilters(countQb, queryParams, userId, ctx, true);

    const isKanban = queryParams.viewMode === 'kanban';
    const disableHierarchy = isKanban;

    return this.repo_findAllTasks_execute(
      idQb,
      countQb,
      pageNum,
      limitNum,
      userId,
      queryParams.status,
      queryParams.typeTask,
      disableHierarchy,
    );
  }

  async findAllTasksForDashboard(
    queryParams: ListTaskDto,
    userId?: string,
    unitId?: string,
    isClerk?: boolean,
    delegatedConfigs?: TaskAssignmentConfigEntity[],
    type?: string,
  ) {
    const ctx = await this.repo_findAllTasks_getContext(
      queryParams,
      userId,
      unitId,
      isClerk,
      delegatedConfigs,
    );

    const pageNum = Number(queryParams.page) || 1;
    const limitNum = Number(queryParams.limit) || 10;

    const idQb = this.createQueryBuilder('task').select('task.id', 'id');
    this.repo_findAllTasks_applyFilters(idQb, queryParams, undefined, ctx, false);

    // Apply dashboard stats filters
    idQb.andWhere(
      new Brackets((qb) => {
        qb.where('(MONTH(task.end_date) = MONTH(GETDATE()) AND YEAR(task.end_date) = YEAR(GETDATE()))')
          .orWhere('(MONTH(task.created_at) = MONTH(GETDATE()) AND YEAR(task.created_at) = YEAR(GETDATE()))');
      })
    );

    if (type === 'done') {
      idQb.andWhere("task.process_status = '4'");
    } else if (type === 'late') {
      idQb.andWhere("task.end_date < GETDATE() AND task.process_status != '4'");
    }

    this.repo_findAllTasks_applySort(idQb, queryParams);

    const countQb = this.createQueryBuilder('task');
    this.repo_findAllTasks_applyFilters(countQb, queryParams, undefined, ctx, true);

    // Apply dashboard stats filters
    countQb.andWhere(
      new Brackets((qb) => {
        qb.where('(MONTH(task.end_date) = MONTH(GETDATE()) AND YEAR(task.end_date) = YEAR(GETDATE()))')
          .orWhere('(MONTH(task.created_at) = MONTH(GETDATE()) AND YEAR(task.created_at) = YEAR(GETDATE()))');
      })
    );

    if (type === 'done') {
      countQb.andWhere("task.process_status = '4'");
    } else if (type === 'late') {
      countQb.andWhere("task.end_date < GETDATE() AND task.process_status != '4'");
    }

    const isKanban = queryParams.viewMode === 'kanban';
    const disableHierarchy = isKanban;

    return this.repo_findAllTasks_execute(
      idQb,
      countQb,
      pageNum,
      limitNum,
      undefined,
      queryParams.status,
      queryParams.typeTask,
      disableHierarchy,
    );
  }


  private async repo_findAllTasks_getContext(
    queryParams: ListTaskDto,
    userId?: string,
    unitId?: string,
    isClerk?: boolean,
    delegatedConfigs?: TaskAssignmentConfigEntity[],
  ) {
    const { tab, typeTask, filter } = queryParams;
    const { projectId, viewers } = filter || {};
    const includeTree =
      (queryParams as any)?.includeTree === true ||
      (queryParams as any)?.includeTree === 'true';
    const isGeneralRootList = (!tab || tab === TaskTab.GENERAL) && !queryParams?.filter?.parent;

    const isViewerFilter = viewers === true || viewers === 'true';
    const isProjectDirectScope =
      (typeTask === TASK_TYPE.PROJECT || typeTask === 'project') &&
      !!projectId;

    let userTaskIdsSubquery: any = null;
    let isManager = false;
    let managedUnitIds: string[] = [];
    let hasProjectAccess = false;
    let shouldResolveUserTaskIds = false;

    if (userId && !isProjectDirectScope) {
      shouldResolveUserTaskIds =
        !!includeTree ||
        !!isClerk ||
        !!(delegatedConfigs && delegatedConfigs.length > 0) ||
        isGeneralRootList;

      if (shouldResolveUserTaskIds) {
        userTaskIdsSubquery = this.buildUserTaskIdsSubquery(userId, unitId, isClerk, delegatedConfigs);
      }

      hasProjectAccess = false;
      if (projectId) {
        const checkProjectAccess = await this.dataSource.createQueryBuilder()
          .select('pm.id')
          .from('project_members', 'pm')
          .where('pm.project_id = :pid', { pid: Number(projectId) })
          .andWhere('pm.user_id = :uid', { uid: userId })
          .getRawOne();
        hasProjectAccess = !!checkProjectAccess;
      }

      const userGroups = await this.dataSource.query(`
        SELECT gu.code, gu.id
        FROM group_users gu
        INNER JOIN user_group_users ugu ON ugu.group_user_id = gu.id
        WHERE ugu.user_id = @0
      `, [userId]);
      const groupCodes = userGroups.map(g => g.code);

      const isDeptHead = groupCodes.includes(GROUP_CODES.TRUONG_PHONG) || groupCodes.includes(GROUP_CODES.PHO_TRUONG_PHONG);
      const isDivHead = groupCodes.includes(GROUP_CODES.TRUONG_BAN);
      isManager = isDeptHead || isDivHead;

      if (isManager) {
        const baseUnitIds: string[] = [];
        if ((isDeptHead || isDivHead) && unitId) {
          baseUnitIds.push(unitId);
        }
        managedUnitIds = baseUnitIds;
      }
    }

    return {
      isViewerFilter,
      isProjectDirectScope,
      userTaskIdsSubquery,
      isManager,
      managedUnitIds,
      hasProjectAccess,
      shouldResolveUserTaskIds,
    };
  }

  private repo_findAllTasks_applyFilters(
    qb: SelectQueryBuilder<TaskEntity>,
    queryParams: ListTaskDto,
    userId: string | undefined,
    ctx: any,
    isCount: boolean,
  ) {
    const { status, tab, typeTask, filter } = queryParams;
    const {
      name,
      director,
      priority,
      topic,
      processStatus,
      start_date_from,
      end_date_from,
      code,
      overdueWork,
      myJob,
      projectId,
      parent,
      timeType,
      myAssign,
      myDirector,
      mySupporter,
    } = filter || {};

    const {
      isViewerFilter,
      isProjectDirectScope,
      userTaskIdsSubquery,
      isManager,
      managedUnitIds,
      hasProjectAccess,
      shouldResolveUserTaskIds,
    } = ctx;

    // Filter by timeType (Tuần, Tháng, Quý)
    if (timeType) {
      let tStart: moment.Moment | null = null;
      let tEnd: moment.Moment | null = null;
      const now = moment();

      const timeLower = timeType.trim().toLowerCase();
      if (timeLower === 'week' || timeLower === 'tuần') {
        tStart = now.clone().startOf('isoWeek');
        tEnd = now.clone().endOf('isoWeek');
      } else if (timeLower === 'month' || timeLower === 'tháng') {
        tStart = now.clone().startOf('month');
        tEnd = now.clone().endOf('month');
      } else if (timeLower === 'quarter' || timeLower === 'quý') {
        tStart = now.clone().startOf('quarter');
        tEnd = now.clone().endOf('quarter');
      }

      if (tStart && tEnd) {
        qb.andWhere('task.startDate >= :tStartTime AND task.startDate <= :tEndTime', {
          tStartTime: tStart.toDate(),
          tEndTime: tEnd.toDate(),
        });
      }
    }

    // Filter by name OR code
    if (isCount) {
      if (name) {
        qb.andWhere('task.name COLLATE Latin1_General_CI_AI LIKE :name', {
          name: `%${name}%`,
        });
      }
    } else {
      if (name || code) {
        qb.andWhere(
          new Brackets((innerQb) => {
            if (name) {
              innerQb.orWhere('task.name COLLATE Latin1_General_CI_AI LIKE :name', {
                name: `%${name}%`,
              });
            }
            if (code) {
              innerQb.orWhere('task.code COLLATE Latin1_General_CI_AI LIKE :code', {
                code: `%${code}%`,
              });
            }
          }),
        );
      }
    }

    // Filter by repeatTask (Tuần, Tháng, Quý)
    if (filter?.repeatTask) {
      const repeatTask = filter.repeatTask;
      let tStart: moment.Moment | null = null;
      let tEnd: moment.Moment | null = null;
      const now = moment();

      if (repeatTask === 'tuan') {
        tStart = now.clone().startOf('isoWeek');
        tEnd = now.clone().endOf('isoWeek');
      } else if (repeatTask === 'thang') {
        tStart = now.clone().startOf('month');
        tEnd = now.clone().endOf('month');
      } else if (repeatTask === 'quy') {
        tStart = now.clone().startOf('quarter');
        tEnd = now.clone().endOf('quarter');
      }

      if (tStart && tEnd) {
        qb.andWhere('task.startDate >= :rStartTime AND task.startDate <= :rEndTime', {
          rStartTime: tStart.toDate(),
          rEndTime: tEnd.toDate(),
        });
      }
    }

    // Filter by priority
    if (priority) {
      if (!isCount && priority === 'binhthuong') {
        qb.andWhere(
          new Brackets((innerQb) => {
            innerQb.where('task.priority = :priority', { priority })
              .orWhere('task.priority IS NULL')
              .orWhere("task.priority = ''");
          }),
        );
      } else {
        qb.andWhere('task.priority = :priority', { priority });
      }
    }

    // Filter by topic
    if (topic) {
      if (Array.isArray(topic)) {
        qb.andWhere('task.topic IN (:...topics)', { topics: topic });
      } else {
        qb.andWhere('task.topic = :topic', { topic });
      }
    }

    // Filter by processStatus
    if (processStatus) {
      if (Array.isArray(processStatus)) {
        qb.andWhere('task.processStatus IN (:...processStatuses)', {
          processStatuses: processStatus,
        });
      } else {
        qb.andWhere('task.processStatus = :processStatus', {
          processStatus,
        });
      }
    }

    // Filter by start date range (Chuyển đổi từ GMT+7 sang UTC để query DB)
    if (start_date_from) {
      if (start_date_from.startDate) {
        const startUtc = moment.tz(start_date_from.startDate, 'YYYY-MM-DD', 'Asia/Ho_Chi_Minh').startOf('day').utc().format('YYYY-MM-DD HH:mm:ss.SSS');
        qb.andWhere('task.startDate >= :startDateFrom', {
          startDateFrom: startUtc,
        });
      }
      if (start_date_from.endDate) {
        const endUtc = moment.tz(start_date_from.endDate, 'YYYY-MM-DD', 'Asia/Ho_Chi_Minh').endOf('day').utc().format('YYYY-MM-DD HH:mm:ss.SSS');
        qb.andWhere('task.startDate <= :startDateTo', {
          startDateTo: endUtc,
        });
      }
    }

    // Filter by end date range (Chuyển đổi từ GMT+7 sang UTC để query DB)
    if (end_date_from) {
      if (end_date_from.startDate) {
        const startUtc = moment.tz(end_date_from.startDate, 'YYYY-MM-DD', 'Asia/Ho_Chi_Minh').startOf('day').utc().format('YYYY-MM-DD HH:mm:ss.SSS');
        qb.andWhere('task.endDate >= :endDateFrom', {
          endDateFrom: startUtc,
        });
      }
      if (end_date_from.endDate) {
        const endUtc = moment.tz(end_date_from.endDate, 'YYYY-MM-DD', 'Asia/Ho_Chi_Minh').endOf('day').utc().format('YYYY-MM-DD HH:mm:ss.SSS');
        qb.andWhere('task.endDate <= :endDateTo', {
          endDateTo: endUtc,
        });
      }
    }

    // Filter by overdue work
    if (overdueWork === true || overdueWork === 'true') {
      const now = new Date().toISOString().split('T')[0];
      qb.andWhere('task.endDate < :now', { now });
      qb.andWhere('task.processStatus != :completed', { completed: '4' });
    }

    // Filter by director
    if (director) {
      let directorIds: string[] = [];
      if (Array.isArray(director)) {
        directorIds = director.map(d => typeof d === 'object' ? d.processId : d).filter(Boolean);
      } else if (typeof director === 'string') {
        directorIds = director.split(',').map(s => s.trim()).filter(Boolean);
      } else if (typeof director === 'object' && director.processId) {
        directorIds = [director.processId];
      }

      if (directorIds.length > 0) {
        qb.andWhere(
          " EXISTS (SELECT 1 FROM task_users tu_director WHERE tu_director.task_id = task.id AND tu_director.role IN ('director', 'supporter') AND tu_director.process_id IN (:...directorProcessIds)) ",
          { directorProcessIds: directorIds },
        );
      }
    }

    // Filter by myAssign, myDirector, mySupporter (OR condition)
    const isMyAssign = myAssign === true || myAssign === 'true';
    const isMyDirector = myDirector === true || myDirector === 'true';
    const isMySupporter = mySupporter === true || mySupporter === 'true';

    if (userId && (isMyAssign || isMyDirector || isMySupporter)) {
      const roles: string[] = [];
      if (isMyAssign) roles.push('assigner');
      if (isMyDirector) roles.push('director');
      if (isMySupporter) roles.push('supporter');

      qb.andWhere(
        " EXISTS (SELECT 1 FROM task_users tu_myRoles WHERE tu_myRoles.task_id = task.id AND LOWER(tu_myRoles.process_id) = LOWER(:myRolesUserId) AND tu_myRoles.role IN (:...myRoles)) ",
        { myRolesUserId: userId, myRoles: roles }
      );
    }

    // Filter by myJob
    if (myJob === true || myJob === 'true') {
      if (userId) {
        qb.andWhere(
          " EXISTS (SELECT 1 FROM task_users tu_myjob WHERE tu_myjob.task_id = task.id AND LOWER(tu_myjob.process_id) = LOWER(:myJobUserId) AND tu_myjob.role IN ('director', 'supporter')) ",
          { myJobUserId: userId },
        );
      }
    }

    // Visibility / Permissions logic
    if (userId && !isProjectDirectScope) {
      qb.andWhere(
        new Brackets((innerQb) => {
          if (isViewerFilter) {
            const viewerParamName = isCount ? 'countViewerUserId' : 'viewerUserId';
            innerQb.where(
              `EXISTS (
                SELECT 1
                FROM task_users tu_viewer
                WHERE tu_viewer.task_id = task.id
                  AND LOWER(tu_viewer.process_id) = LOWER(:${viewerParamName})
                  AND tu_viewer.role = 'viewer'
              )`,
              { [viewerParamName]: userId },
            );
            innerQb.andWhere(`NOT EXISTS (
              SELECT 1
              FROM task_users tu_a
              INNER JOIN task_users tu_d ON tu_d.task_id = tu_a.task_id
              WHERE tu_a.task_id = task.id
                AND tu_a.role = 'assigner'
                AND tu_d.role = 'director'
                AND LOWER(tu_a.process_id) = LOWER(tu_d.process_id)
            )`);

            const assignerManagerCodeParam = isCount ? 'countViewerAssignerManagerCode' : 'viewerAssignerManagerCode';
            const directorDeputyCodeParam = isCount ? 'countViewerDirectorDeputyCode' : 'viewerDirectorDeputyCode';
            innerQb.andWhere(`NOT EXISTS (
              SELECT 1
              FROM task_users tu_a
              INNER JOIN task_users tu_d ON tu_d.task_id = tu_a.task_id
              INNER JOIN users u_a ON u_a.id = tu_a.process_id
              INNER JOIN users u_d ON u_d.id = tu_d.process_id
              INNER JOIN user_group_users ugu_a ON ugu_a.user_id = tu_a.process_id
              INNER JOIN group_users gu_a ON gu_a.id = ugu_a.group_user_id
              INNER JOIN user_group_users ugu_d ON ugu_d.user_id = tu_d.process_id
              INNER JOIN group_users gu_d ON gu_d.id = ugu_d.group_user_id
              WHERE tu_a.task_id = task.id
                AND tu_a.role = 'assigner'
                AND tu_d.role = 'director'
                AND gu_a.code = :${assignerManagerCodeParam}
                AND gu_d.code = :${directorDeputyCodeParam}
                AND ISNULL(u_a.parent, '') = ISNULL(u_d.parent, '')
            )`, {
              [assignerManagerCodeParam]: GROUP_CODES.TRUONG_PHONG,
              [directorDeputyCodeParam]: GROUP_CODES.PHO_TRUONG_PHONG,
            });

            const assignerManagerCodeParam2 = isCount ? 'countViewerAssignerManagerCode2' : 'viewerAssignerManagerCode2';
            const directorStaffCodeParam = isCount ? 'countViewerDirectorStaffCode' : 'viewerDirectorStaffCode';
            innerQb.andWhere(`NOT EXISTS (
              SELECT 1
              FROM task_users tu_a
              INNER JOIN task_users tu_d ON tu_d.task_id = tu_a.task_id
              INNER JOIN users u_a ON u_a.id = tu_a.process_id
              INNER JOIN users u_d ON u_d.id = tu_d.process_id
              INNER JOIN user_group_users ugu_a ON ugu_a.user_id = tu_a.process_id
              INNER JOIN group_users gu_a ON gu_a.id = ugu_a.group_user_id
              INNER JOIN user_group_users ugu_d ON ugu_d.user_id = tu_d.process_id
              INNER JOIN group_users gu_d ON gu_d.id = ugu_d.group_user_id
              WHERE tu_a.task_id = task.id
                AND tu_a.role = 'assigner'
                AND tu_d.role = 'director'
                AND gu_a.code = :${assignerManagerCodeParam2}
                AND gu_d.code = :${directorStaffCodeParam}
                AND ISNULL(u_a.parent, '') = ISNULL(u_d.parent, '')
            )`, {
              [assignerManagerCodeParam2]: GROUP_CODES.TRUONG_PHONG,
              [directorStaffCodeParam]: GROUP_CODES.CANBO,
            });

            if (isManager && managedUnitIds.length > 0) {
              const staffOnlyCodeParam = isCount ? 'countViewerDirectorStaffOnlyCode' : 'viewerDirectorStaffOnlyCode';
              innerQb.orWhere(new Brackets((mgr) => {
                mgr.where(`EXISTS (
                    SELECT 1
                    FROM task_users tu_assigner
                    INNER JOIN user_group_users ugu ON ugu.user_id = tu_assigner.process_id
                    INNER JOIN group_users gu ON gu.id = ugu.group_user_id
                    WHERE tu_assigner.task_id = task.id
                      AND tu_assigner.role = 'assigner'
                      AND gu.code IN ('tonggd', 'phodgtongcty')
                      AND NOT EXISTS (
                        SELECT 1
                        FROM user_group_users ugu_mgr
                        INNER JOIN group_users gu_mgr ON gu_mgr.id = ugu_mgr.group_user_id
                        WHERE ugu_mgr.user_id = tu_assigner.process_id
                          AND gu_mgr.code IN ('truongphong', 'photruongphong')
                      )
                  )`)
                  .andWhere(`EXISTS (
                    SELECT 1
                    FROM task_users tu_assigner_cmp
                    INNER JOIN task_users tu_director_cmp
                      ON tu_director_cmp.task_id = tu_assigner_cmp.task_id
                    WHERE tu_assigner_cmp.task_id = task.id
                      AND tu_assigner_cmp.role = 'assigner'
                      AND tu_director_cmp.role = 'director'
                      AND LOWER(tu_assigner_cmp.process_id) <> LOWER(tu_director_cmp.process_id)
                  )`)
                  .andWhere(`EXISTS (
                    SELECT 1
                    FROM task_users tu_director
                    INNER JOIN users u_director ON u_director.id = tu_director.process_id
                    INNER JOIN user_group_users ugu_dir ON ugu_dir.user_id = tu_director.process_id
                    INNER JOIN group_users gu_dir ON gu_dir.id = ugu_dir.group_user_id
                    WHERE tu_director.task_id = task.id
                      AND tu_director.role = 'director'
                      AND u_director.parent IN (:...managedUnitIds)
                      AND gu_dir.code = :${staffOnlyCodeParam}
                      AND NOT EXISTS (
                        SELECT 1
                        FROM user_group_users ugu_dir_mgr
                        INNER JOIN group_users gu_dir_mgr ON gu_dir_mgr.id = ugu_dir_mgr.group_user_id
                        WHERE ugu_dir_mgr.user_id = tu_director.process_id
                          AND gu_dir_mgr.code IN ('truongphong', 'photruongphong')
                      )
                  )`, { managedUnitIds, [staffOnlyCodeParam]: GROUP_CODES.CANBO });
              }));
            }
          } else {
            innerQb.where('task.createdById = :userId', { userId });
            if (hasProjectAccess) {
              const projIdParam = isCount ? 'countProjId' : 'currentProjId';
              innerQb.orWhere(`task.projectId = :${projIdParam}`, { [projIdParam]: Number(projectId) });
            } else {
              if (!shouldResolveUserTaskIds) {
                const selfUserIdParam = isCount ? 'countSelfUserId' : 'selfUserId';
                innerQb.orWhere(
                  `EXISTS (
                    SELECT 1
                    FROM task_users tu_self
                    WHERE tu_self.task_id = task.id
                      AND LOWER(tu_self.process_id) = LOWER(:${selfUserIdParam})
                  )`,
                  { [selfUserIdParam]: userId },
                );
              } else if (userTaskIdsSubquery) {
                innerQb.orWhere(userTaskIdsSubquery.query, userTaskIdsSubquery.params);
              }
            }
          }

          if (!isViewerFilter && isManager && managedUnitIds.length > 0) {
            innerQb.orWhere(new Brackets(vis => {
              vis.where(new Brackets(inner => {
                inner.where('task.isConfidential = :isConfidentialFalse', { isConfidentialFalse: false })
                  .orWhere('task.isConfidential IS NULL');
              }))
                .andWhere(`EXISTS (
                    SELECT 1 FROM task_users tu_assignee
                    INNER JOIN users u_assignee ON u_assignee.id = tu_assignee.process_id
                    WHERE tu_assignee.task_id = task.id
                    AND tu_assignee.role IN ('director', 'supporter')
                    AND u_assignee.parent IN (:...managedUnitIds)
                 )`, { managedUnitIds });
              if (isViewerFilter) {
                const managerViewerUserIdParam = isCount ? 'countManagerViewerUserId' : 'managerViewerUserId';
                vis.andWhere(`NOT EXISTS (
                    SELECT 1 FROM task_users tu_self_role
                    WHERE tu_self_role.task_id = task.id
                    AND LOWER(tu_self_role.process_id) = LOWER(:${managerViewerUserIdParam})
                )`, { [managerViewerUserIdParam]: userId });
              }
            }));
          }
        }),
      );
    }

    // Keep count query consistent with idQb parent/projectId logic
    if (parent && projectId) {
      qb.andWhere(
        new Brackets((q) => {
          q.where('task.parent = :parentId', { parentId: Number(parent) })
            .orWhere('task.projectId = :projectId', { projectId: Number(projectId) });
        }),
      );
    } else {
      if (parent) {
        qb.andWhere('task.parent = :parentId', { parentId: Number(parent) });
      }
      if (projectId) {
        qb.andWhere('task.projectId = :projectId', { projectId: Number(projectId) });
      }
    }

    if (status) {
      if (Array.isArray(status)) {
        qb.andWhere('task.status IN (:...statuses)', { statuses: status });
      } else {
        qb.andWhere('task.status = :status', { status });
      }
    } else {
      qb.andWhere('task.status = 1');
    }

    qb.andWhere('task.typeTask = :typeTask', {
      typeTask: typeTask ?? TASK_TYPE.GENERAL,
    });

    const isKanban = queryParams.viewMode === 'kanban';

    if (isCount) {
      this.applyTabFilter(qb, tab, !!parent || isKanban, typeTask, []);
    } else {
      this.applyTabFilter(
        qb,
        tab,
        !!parent || isKanban,
        typeTask,
        userTaskIdsSubquery || [],
      );
    }
  }

  private repo_findAllTasks_applySort(
    idQb: SelectQueryBuilder<TaskEntity>,
    queryParams: ListTaskDto,
  ) {
    const { sort } = queryParams;
    const SORTABLE_FIELDS = [
      'name',
      'progress',
      'processStatus',
      'createdAt',
      'updatedAt',
      'startDate',
      'endDate',
    ];
    const SORT_FIELD_MAP: Record<string, string> = {
      name: 'task.name',
      progress: 'task.progress',
      processStatus: 'task.processStatus',
      createdAt: 'task.createdAt',
      updatedAt: 'task.updatedAt',
      startDate: 'task.startDate',
      endDate: 'task.endDate',
    };

    let hasValidSort = false;
    if (sort && typeof sort === 'object') {
      let isFirst = true;
      Object.entries(sort).forEach(([field, direction]) => {
        if (!SORTABLE_FIELDS.includes(field)) return;
        if (field === 'progress') {
          idQb.addSelect('CAST(task.progress AS INT)', 'progress_num');
          if (isFirst) {
            idQb.orderBy('progress_num', Number(direction) === -1 ? 'DESC' : 'ASC');
            isFirst = false;
          } else {
            idQb.addOrderBy('progress_num', Number(direction) === -1 ? 'DESC' : 'ASC');
          }
          hasValidSort = true;
          return;
        }
        const column = SORT_FIELD_MAP[field];
        if (column) {
          const orderDirection = Number(direction) === -1 ? 'DESC' : 'ASC';
          if (field === 'startDate') {
            idQb.addSelect('CASE WHEN task.startDate IS NULL THEN 1 ELSE 0 END', 'isStartDateNull');
            if (isFirst) {
              idQb.orderBy('isStartDateNull', 'ASC');
              isFirst = false;
            } else {
              idQb.addOrderBy('isStartDateNull', 'ASC');
            }
            idQb.addOrderBy(column, orderDirection);
          } else if (field === 'endDate') {
            idQb.addSelect('CASE WHEN task.endDate IS NULL THEN 1 ELSE 0 END', 'isEndDateNull');
            if (isFirst) {
              idQb.orderBy('isEndDateNull', 'ASC');
              isFirst = false;
            } else {
              idQb.addOrderBy('isEndDateNull', 'ASC');
            }
            idQb.addOrderBy(column, orderDirection);
          } else {
            if (isFirst) {
              idQb.orderBy(column, orderDirection);
              isFirst = false;
            } else {
              idQb.addOrderBy(column, orderDirection);
            }
          }
          hasValidSort = true;
        }
      });
    }

    if (!hasValidSort) {
      if (queryParams.isSortStart === 'true' || queryParams.isSortStart === true) {
        idQb
          .addSelect('CASE WHEN task.startDate IS NULL THEN 1 ELSE 0 END', 'isStartDateNull')
          .orderBy('isStartDateNull', 'ASC')
          .addOrderBy('task.startDate', 'ASC')
          .addOrderBy('task.updatedAt', 'DESC');
      } else {
        idQb.orderBy('task.updatedAt', 'DESC');
      }
    }
  }

  private async repo_findAllTasks_execute(
    idQb: SelectQueryBuilder<TaskEntity>,
    countQb: SelectQueryBuilder<TaskEntity>,
    pageNum: number,
    limitNum: number,
    userId?: string,
    status?: any,
    typeTask?: string,
    disableHierarchy?: boolean,
  ) {
    const idRows = await idQb.getRawMany();
    const matchedIds = Array.from(
      new Set(
        idRows
          .map((r) => Number(r.id))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    );

    if (!matchedIds.length) {
      return { data: [], total: 0 };
    }

    let rootIds = [...matchedIds];
    if (matchedIds.length > 0 && !disableHierarchy) {
      rootIds = await this.getRootTaskIdsByTaskIds(matchedIds);
      rootIds.sort((a, b) => b - a);
    }

    const uniqueSortedIds = Array.from(new Set(rootIds));
    const total = uniqueSortedIds.length;

    const offset = (pageNum - 1) * limitNum;
    let taskIds = uniqueSortedIds.slice(offset, offset + limitNum);

    if (taskIds.length > 0 && !disableHierarchy) {
      taskIds = await this.getAllRelatedTaskIds(taskIds);
    }

    if (!taskIds.length) {
      return { data: [], total: 0 };
    }

    const dataQb = this.createQueryBuilder('task')
      .leftJoin('task.taskUsers', 'taskUsers')
      .leftJoin('taskUsers.user', 'user')
      .leftJoin('user.parent', 'userParent')
      .leftJoin('taskUsers.organizationUnit', 'org')
      .leftJoin('task.project', 'project')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.updatedBy', 'updatedBy')
      .andWhere(status ? (Array.isArray(status) ? 'task.status IN (:...statuses)' : 'task.status = :status') : 'task.status = 1', {
        status,
        statuses: status,
      })
      .andWhere('task.typeTask = :typeTask', {
        typeTask: typeTask ?? TASK_TYPE.GENERAL,
      })
      .select([
        'task.id',
        'task.name',
        'task.startDate',
        'task.endDate',
        'task.parent',
        'task.code',
        'task.note',
        'task.processStatus',
        'task.progress',
        'task.priority',
        'task.projectId',
        'task.dependentTaskId',
        'task.isApprovalRequired',
        'task.topic',
        'task.typeTask',
        'task.templateId',
        'task.createdAt',
        'task.updatedAt',
        'task.reminderTime',
        'taskUsers.id',
        'taskUsers.role',
        'taskUsers.processId',
        'taskUsers.processName',
        'taskUsers.type',
        'user.id',
        'user.name',
        'userParent.id',
        'userParent.name',
        'org.id',
        'org.name',
        'project.id',
        'project.startDate',
        'project.endDate',
        'project.projectStatus',
        'createdBy.id',
        'createdBy.name',
        'createdBy.emailUser',
        'updatedBy.id',
        'updatedBy.name',
      ])
      .orderBy('task.id', 'DESC');

    if (taskIds.length > 1800) {
      dataQb.where(
        `task.id IN (
          SELECT CAST(value AS BIGINT)
          FROM OPENJSON(:taskIdsJson)
        )`,
        { taskIdsJson: JSON.stringify(taskIds) },
      );
    } else {
      dataQb.where('task.id IN (:...taskIds)', { taskIds });
    }

    const data = await dataQb.getMany();

    const slowReasonMap: Record<string, string> = {};
    if (data.length > 0) {
      try {
        const ids = data.map((t) => t.id);
        const query = `
          SELECT document_id, content
          FROM (
             SELECT document_id, content, ROW_NUMBER() OVER (PARTITION BY document_id ORDER BY created_at DESC) as rn
             FROM document_comments
             WHERE type = 'slowReason' AND document_id IN (${ids.map(id => `'${id}'`).join(',')})
          ) t
          WHERE rn = 1
        `;
        const reasons = await this.query(query);
        reasons.forEach((r: any) => {
          slowReasonMap[r.document_id] = r.content;
        });
      } catch (e) {
        console.error('Error fetching slow reasons', e);
      }
    }

    const mappedData = data.map(task => ({
      ...task,
      ...(() => {
        const result = { assigners: [], directors: [], supporters: [], viewers: [] };
        for (const tu of task.taskUsers ?? []) {
          let formattedName = tu.processName || tu.user?.name || '';
          if (tu.user?.parent?.name) {
            formattedName = `${formattedName} - ${tu.user.parent.name}`;
          }
          const item = {
            processId: tu.processId,
            name: formattedName,
            type: tu.type,
          };
          if (result[`${tu.role}s`]) {
            result[`${tu.role}s`].push(item);
          }
        }
        return result;
      })(),
      flags: {
        hideDelete: (
          !!userId &&
          (task.createdBy?.id === userId ||
            (task.taskUsers &&
              task.taskUsers.some(
                (taskUser) =>
                  taskUser.processId === userId && taskUser.role === 'assigner',
              ))) &&
          task.processStatus === '1'
        ),
        hideAdd:
          [3, 4].includes(Number(task.project?.projectStatus)) ? false :
            task.endDate && new Date() > new Date(task.endDate) && task.processStatus !== '4' ? false :
            (!['4', '8', '3'].includes(task.processStatus) ||
              (!!userId &&
                task.taskUsers &&
                task.taskUsers.some(
                  (tu) => tu.processId === userId && tu.role === 'viewer',
                ))),
        isAssignWork:
          !!userId &&
          (task.createdBy?.id === userId ||
            (task.taskUsers &&
              task.taskUsers.some(
                (taskUser) =>
                  taskUser.processId === userId && taskUser.role === 'assigner',
              ))) &&
          ['1', '2', '6'].includes(task.processStatus),
      },
      slowReason: slowReasonMap[task.id] || null,
    }));

    return { data: mappedData, total };
  }

  /**
   * Lấy tất cả task ID liên quan (cha, ông..., con, cháu...) từ danh sách task ID gốc
   * Sử dụng Recursive CTE để tối ưu truy vấn
   */
  public async getAllRelatedTaskIds(rootIds: number[]): Promise<number[]> {
    if (!rootIds.length) return [];

    const rootIdsString = rootIds.join(',');

    try {
      const query = `
      WITH RecursiveDescendants AS (
        SELECT id, parent
        FROM task
        WHERE id IN (${rootIdsString})
        UNION ALL
        SELECT t.id, t.parent
        FROM task t
        INNER JOIN RecursiveDescendants rd ON t.parent = rd.id
      ),
      RecursiveAncestors AS (
        SELECT id, parent
        FROM task
        WHERE id IN (${rootIdsString})
        UNION ALL
        SELECT t.id, t.parent
        FROM task t
        INNER JOIN RecursiveAncestors ra ON t.id = ra.parent
      )
      SELECT DISTINCT id FROM RecursiveDescendants
      UNION
      SELECT DISTINCT id FROM RecursiveAncestors
    `;

      const result = await this.dataSource.query(query);
      return result.map((r: any) => r.id);
    } catch (e) {
      console.error('Lỗi lấy gia phả task:', e);
      // Fallback: trả về chính rootIds nếu lỗi
      return rootIds;
    }
  }

  public async getAllRelatedTaskIdsSearchName(rootIds: number[], name: string): Promise<number[]> {
    if (!rootIds.length) return [];

    const rootIdsString = rootIds.join(',');
    let queryName = '';
    if (name) {
      queryName = `AND t.name COLLATE Latin1_General_CI_AI LIKE N'%${name}%'`
    }
    try {
      const query = `
      WITH RecursiveDescendants AS (
        SELECT id, parent
        FROM task
        WHERE id IN (${rootIdsString})
        UNION ALL
        SELECT t.id, t.parent
        FROM task t
        INNER JOIN RecursiveDescendants rd ON t.parent = rd.id
        ${queryName}
      ),
      RecursiveAncestors AS (
        SELECT id, parent
        FROM task
        WHERE id IN (${rootIdsString})
        UNION ALL
        SELECT t.id, t.parent
        FROM task t
        INNER JOIN RecursiveAncestors ra ON t.id = ra.parent
      )
      SELECT DISTINCT id FROM RecursiveDescendants
      UNION
      SELECT DISTINCT id FROM RecursiveAncestors
    `;

      const result = await this.dataSource.query(query);
      return result.map((r: any) => r.id);
    } catch (e) {
      console.error('Lỗi lấy gia phả task:', e);
      // Fallback: trả về chính rootIds nếu lỗi
      return rootIds;
    }
  }

  private async getRootTaskIdsByTaskIds(taskIds: number[]): Promise<number[]> {
    if (!taskIds || taskIds.length === 0) return [];

    try {
      const rows = await this.dataSource.query(
        `
          WITH RecursiveAncestors AS (
            SELECT id, parent
            FROM task
            WHERE id IN (
              SELECT CAST(value AS BIGINT)
              FROM OPENJSON(@0)
            )
            UNION ALL
            SELECT t.id, t.parent
            FROM task t
            INNER JOIN RecursiveAncestors ra ON ra.parent = t.id
          )
          SELECT DISTINCT id
          FROM RecursiveAncestors
          WHERE parent IS NULL OR parent = 0
        `,
        [JSON.stringify(taskIds)],
      );

      return rows.map((r: any) => Number(r.id)).filter((id) => Number.isFinite(id) && id > 0);
    } catch (e) {
      return [];
    }
  }

  private buildCteSqlAndParams(
    userId: string,
    unitId: string | undefined,
    isClerk: boolean | undefined,
    delegatedConfigs: TaskAssignmentConfigEntity[] | undefined,
    isViewerOnly: boolean,
    startIndex: number,
    typeTask: string,
  ) {
    const cteParams: any[] = [];
    let currentIndex = startIndex;

    const addParam = (val: any) => {
      cteParams.push(val);
      return `@${currentIndex++}`;
    };

    const userIdParam = addParam(userId);
    const typeTaskParam = addParam(typeTask);
    let whereConditions = `tu.process_id = ${userIdParam}`;
    if (isViewerOnly) {
      whereConditions += ` AND tu.role = 'viewer'`;
    }

    if (!isViewerOnly) {
      if (unitId && isClerk) {
        const unitIdParam = addParam(unitId);
        whereConditions += ` OR (tu.process_id = ${unitIdParam} AND tu.type = 2 AND NOT EXISTS (
          SELECT 1 FROM task_assignment_configs tac 
          WHERE tac.unit_id = ${unitIdParam} AND tac.status = 1
        ))`;
      }

      if (delegatedConfigs && delegatedConfigs.length > 0) {
        delegatedConfigs.forEach((config) => {
          const dUnitIdParam = addParam(config.unitId);
          const dStartParam = addParam(config.createdAt);

          if (config.status === 2) {
            const dEndParam = addParam(config.updatedAt);
            whereConditions += ` OR (tu.process_id = ${dUnitIdParam} AND tu.type = 2 AND t.created_at >= ${dStartParam} AND t.created_at <= ${dEndParam})`;
          } else {
            whereConditions += ` OR (tu.process_id = ${dUnitIdParam} AND tu.type = 2 AND t.created_at >= ${dStartParam})`;
          }
        });
      }
    }

    const cteSql = `
      WITH UserTasks AS (
        SELECT DISTINCT tu.task_id
        FROM task_users tu
        INNER JOIN task t ON t.id = tu.task_id
        WHERE (${whereConditions})
          AND t.status = 1
          AND t.type_task = ${typeTaskParam}
      ),
      RecursiveAncestors AS (
        SELECT t.id, t.parent
        FROM task t
        WHERE t.id IN (SELECT task_id FROM UserTasks)
        UNION ALL
        SELECT t.id, t.parent
        FROM task t
        INNER JOIN RecursiveAncestors ra ON ra.parent = t.id
        WHERE t.status = 1
          AND t.type_task = ${typeTaskParam}
      ),
      VisibleRootTaskIds AS (
        SELECT DISTINCT id
        FROM RecursiveAncestors
        WHERE parent IS NULL OR parent = 0
      )
    `;

    return { cteSql, cteParams };
  }

  async findAllFormDoc(
    queryParams: ListTaskDto,
    userId?: string,
    isSelectFormDoc = false,
    unitId?: string,
    isClerk?: boolean,
    delegatedConfigs?: TaskAssignmentConfigEntity[],
  ) {
    const {
      page = 1,
      limit = 10,
      status,
      tab,
      typeTask,
      filter,
      sort,
    } = queryParams;

    const isKanban = queryParams.viewMode === 'kanban';
    const disableHierarchy = isKanban;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    const qb = this.createQueryBuilder('task');
    const {
      name,
      director,
      priority,
      topic,
      process_status,
      start_date_from,
      end_date_from,
      myJob,
      code,
      overdueWork,
      toBook,
      sumary,
      repeatTask,
      myAssign,
      myDirector,
      mySupporter,
      viewers,
    } = filter || {};
    const isViewerFilter = viewers === true || viewers === 'true';

    // Filter by repeatTask (Tuần, Tháng, Quý)
    if (repeatTask) {
      let tStart: moment.Moment | null = null;
      let tEnd: moment.Moment | null = null;
      const now = moment();

      if (repeatTask === 'tuan') {
        tStart = now.clone().startOf('isoWeek');
        tEnd = now.clone().endOf('isoWeek');
      } else if (repeatTask === 'thang') {
        tStart = now.clone().startOf('month');
        tEnd = now.clone().endOf('month');
      } else if (repeatTask === 'quy') {
        tStart = now.clone().startOf('quarter');
        tEnd = now.clone().endOf('quarter');
      }

      if (tStart && tEnd) {
        qb.andWhere('task.startDate >= :rStartTime AND task.startDate <= :rEndTime', {
          rStartTime: tStart.toDate(),
          rEndTime: tEnd.toDate(),
        });
      }
    }

    // const select = ['document_id'];
    // const audits = await this.repo.getAuditByCondition(
    //   {
    //     receiver: userId,
    //     typeDocument: 'IncommingDocument',
    //   },
    //   {
    //     createdBy: userId,
    //   }, select)
    // const uniqueAudits = [
    //   ...new Map(audits.map(a => [String(a.document_id), a])).values()
    // ];
    // const auditDocIds = uniqueAudits.map(a => String(a.document_id));
    // if (auditDocIds.length) {
    //   qb.andWhere(
    //     new Brackets((subQb) => {
    //       subQb.where('task.doc_id IN (:...auditDocIds)', { auditDocIds });
    //       // Hoặc thêm điều kiện OR khác nếu cần
    //     })
    //   );
    // }

    if (name || code || toBook) {
      qb.andWhere(
        new Brackets((qb) => {
          if (name) {
            qb.orWhere('task.name COLLATE Latin1_General_CI_AI LIKE :name', {
              name: `%${name}%`,
            });
          }
          if (code) {
            qb.orWhere('task.code COLLATE Latin1_General_CI_AI LIKE :code', {
              code: `%${code}%`,
            });
          }
          if (toBook) {
            qb.orWhere(
              `EXISTS (
               SELECT 1
               FROM incomming_documents idoc
               WHERE idoc.to_book LIKE :toBook
                 AND CAST(idoc.document_id AS NVARCHAR(50)) IN (SELECT value FROM STRING_SPLIT(task.doc_id, ','))
             )`,
              { toBook: `%${toBook}%` },
            );
          }
        }),
      );
    }



    if (priority) {
      if (priority === 'binhthuong') {
        qb.andWhere(
          new Brackets((qb) => {
            qb.where('task.priority = :priority', { priority })
              .orWhere('task.priority IS NULL')
              .orWhere("task.priority = ''");
          }),
        );
      } else {
        qb.andWhere('task.priority = :priority', { priority });
      }
    }

    // Filter by overdue work (công việc quá hạn)
    if (overdueWork === true || overdueWork === 'true') {
      qb.andWhere('task.endDate < GETDATE()');
      qb.andWhere('task.processStatus != :completed', { completed: '4' });
    }

    if (sumary) {
      const sumaryArray = Array.isArray(sumary) ? sumary : [sumary];
      if (sumaryArray.length > 0) {
        qb.andWhere('task.doc_id IN (:...sumaryArray)', { sumaryArray });
      }
    }

    // Filter by director (người tham gia - director/supporter roles)
    if (director) {
      let directorIds: string[] = [];
      if (Array.isArray(director)) {
        directorIds = director.map(d => typeof d === 'object' ? d.processId : d).filter(Boolean);
      } else if (typeof director === 'string') {
        directorIds = director.split(',').map(s => s.trim()).filter(Boolean);
      } else if (typeof director === 'object' && director.processId) {
        directorIds = [director.processId];
      }

      if (directorIds.length > 0) {
        qb.andWhere(
          " EXISTS (SELECT 1 FROM task_users tu_director WHERE tu_director.task_id = task.id AND tu_director.role IN ('director', 'supporter') AND tu_director.process_id IN (:...directorProcessIds)) ",
          { directorProcessIds: directorIds },
        );
      }
    }

    // Filter by myAssign, myDirector, mySupporter (OR condition)
    const isMyAssign = myAssign === true || myAssign === 'true';
    const isMyDirector = myDirector === true || myDirector === 'true';
    const isMySupporter = mySupporter === true || mySupporter === 'true';

    if (userId && (isMyAssign || isMyDirector || isMySupporter)) {
      const roles: string[] = [];
      if (isMyAssign) roles.push('assigner');
      if (isMyDirector) roles.push('director');
      if (isMySupporter) roles.push('supporter');

      qb.andWhere(
        " EXISTS (SELECT 1 FROM task_users tu_myRoles WHERE tu_myRoles.task_id = task.id AND LOWER(tu_myRoles.process_id) = LOWER(:myRolesUserId) AND tu_myRoles.role IN (:...myRoles)) ",
        { myRolesUserId: userId, myRoles: roles }
      );
    }

    // Filter by myJob - tasks user participates (director/supporter)
    if (myJob === true || myJob === 'true') {
      if (userId) {
        qb.andWhere(
          " EXISTS (SELECT 1 FROM task_users tu_myjob WHERE tu_myjob.task_id = task.id AND LOWER(tu_myjob.process_id) = LOWER(:myJobUserId) AND tu_myjob.role IN ('director', 'supporter')) ",
          { myJobUserId: userId },
        );
      }
    }


    // Filter by priority (độ ưu tiên)
    if (priority) {
      qb.andWhere('task.priority = :priority', { priority });
    }

    if (process_status) {
      if (Array.isArray(process_status)) {
        qb.andWhere('task.processStatus IN (:...processStatuses)', {
          processStatuses: process_status,
        });
      } else {
        qb.andWhere('task.processStatus = :processStatus', {
          processStatus: process_status,
        });
      }
    }

    // if (process_status && Array.isArray(process_status) && process_status.length > 0) {
    //   qb.andWhere('task.processStatus IN (:...processStatuses)', {
    //     processStatuses: process_status,
    //   });
    // }

    if (start_date_from) {
      const from = start_date_from.startDate;
      const to = start_date_from.endDate || start_date_from.startDate;

      if (from) {
        qb.andWhere('task.startDate >= :startDateFrom', {
          startDateFrom: from,
        });
      }
      if (to) {
        qb.andWhere('task.startDate <= :startDateTo', {
          startDateTo: `${to} 23:59:59`,
        });
      }
    }

    if (end_date_from) {
      const from = end_date_from.startDate;
      const to = end_date_from.endDate || end_date_from.startDate;

      if (from) {
        qb.andWhere('task.endDate >= :endDateFrom', {
          endDateFrom: from,
        });
      }
      if (to) {
        qb.andWhere('task.endDate <= :endDateTo', {
          endDateTo: `${to} 23:59:59`,
        });
      }
    }
    if (status) {
      if (Array.isArray(status)) {
        qb.andWhere('task.status IN (:...statuses)', { statuses: status });
      } else {
        qb.andWhere('task.status = :status', { status });
      }
    } else {
      qb.andWhere('task.status = 1');
    }
    const resolvedTypeTask =
      typeTask ??
      ((queryParams as any)?.processFn === 'cvtchpb'
        ? TASK_TYPE.FORM_MEETING
        : TASK_TYPE.FORM_DOC);

    qb.andWhere('task.typeTask = :typeTask', {
      typeTask: resolvedTypeTask,
    });

    // viewers=true: loại các công việc yêu cầu phê duyệt
    if (isViewerFilter) {
      qb.andWhere('(task.isApprovalRequired = :approvalFalse OR task.isApprovalRequired IS NULL)', {
        approvalFalse: false,
      });
    }

    if (isSelectFormDoc) {
      qb.andWhere('task.doc_id IS NULL');
    }

    let useVisibleRootSubquery = false;
    if (userId) {
      // [New] Logic Visibility for Managers (Dept Head / Div Head)
      const userGroups = await this.dataSource.query(`
        SELECT gu.code, gu.id
        FROM group_users gu
        INNER JOIN user_group_users ugu ON ugu.group_user_id = gu.id
        WHERE ugu.user_id = @0
      `, [userId]);
      const groupCodes = userGroups.map(g => g.code);
      const groupIds = userGroups.map(g => g.id);

      const isDeptHead = groupCodes.includes(GROUP_CODES.TRUONG_PHONG) || groupCodes.includes(GROUP_CODES.PHO_TRUONG_PHONG);
      const isDivHead = groupCodes.includes(GROUP_CODES.TRUONG_BAN);
      const isManager = isDeptHead || isDivHead;

      let managedUnitIds: string[] = [];
      if (isManager) {
        const baseUnitIds: string[] = [];
        if ((isDeptHead || isDivHead) && unitId) {
          baseUnitIds.push(unitId);
        }

        managedUnitIds = baseUnitIds;
      }

      const userTaskIdsSubquery = userId
        ? this.buildUserTaskIdsSubquery(userId, unitId, isClerk, delegatedConfigs)
        : null;

      useVisibleRootSubquery = !isSelectFormDoc;

      // Apply Permissions (CreatedBy OR ParticipatedBy OR ManagedBy)
      qb.andWhere(
        new Brackets((perm) => {
          if (isViewerFilter) {
            perm.where(
              `EXISTS (
                SELECT 1
                FROM task_users tu_viewer
                WHERE tu_viewer.task_id = task.id
                  AND tu_viewer.process_id = :viewerUserId
                  AND tu_viewer.role = 'viewer'
              )`,
              { viewerUserId: userId },
            );
            perm.andWhere(`NOT EXISTS (
              SELECT 1
              FROM task_users tu_assigner_same
              INNER JOIN task_users tu_director_same
                ON tu_director_same.task_id = tu_assigner_same.task_id
              WHERE tu_assigner_same.task_id = task.id
                AND tu_assigner_same.role = 'assigner'
                AND tu_director_same.role = 'director'
                AND tu_assigner_same.process_id = tu_director_same.process_id
            )`);
            if (isManager && managedUnitIds.length > 0) {
              perm.orWhere(new Brackets((mgr) => {
                mgr.orWhere(new Brackets((leaderToStaffViewer) => {
                  leaderToStaffViewer
                    .where(new Brackets((inner) => {
                      inner.where('task.isConfidential = :isConfidentialFalseViewer', { isConfidentialFalseViewer: false })
                        .orWhere('task.isConfidential IS NULL');
                    }))
                    .andWhere(`EXISTS (
                      SELECT 1
                      FROM task_users tu_assigner
                      INNER JOIN user_group_users ugu ON ugu.user_id = tu_assigner.process_id
                      INNER JOIN group_users gu ON gu.id = ugu.group_user_id
                      WHERE tu_assigner.task_id = task.id
                        AND tu_assigner.role = 'assigner'
                        AND gu.code IN ('tonggd', 'phogdtongcty')
                  )`)
                    .andWhere(`EXISTS (
                      SELECT 1
                      FROM task_users tu_director
                      LEFT JOIN users u_director ON u_director.id = tu_director.process_id
                      LEFT JOIN user_group_users ugu_dir ON ugu_dir.user_id = tu_director.process_id
                      LEFT JOIN group_users gu_dir ON gu_dir.id = ugu_dir.group_user_id
                      WHERE tu_director.task_id = task.id
                        AND tu_director.role = 'director'
                        AND (
                          (
                            u_director.parent IN (
                              SELECT LTRIM(RTRIM(value))
                              FROM STRING_SPLIT(:managedUnitIdsCsv2, ',')
                            )
                            AND gu_dir.code = 'canboct'
                          )
                          OR (
                            tu_director.type = 2
                            AND tu_director.process_id IN (
                              SELECT LTRIM(RTRIM(value))
                              FROM STRING_SPLIT(:managedUnitIdsCsv2, ',')
                            )
                          )
                        )
                  )`, {
                      managedUnitIdsCsv2: managedUnitIds.join(','),
                    });
                }));
              }));
            }
          } else {
            perm.where('task.createdById = :userId', { userId });

            if (isSelectFormDoc && userTaskIdsSubquery) {
              perm.orWhere(userTaskIdsSubquery.query, userTaskIdsSubquery.params);
            }
          }

          if (!isViewerFilter && useVisibleRootSubquery) {
            perm.orWhere('task.id IN (SELECT id FROM VisibleRootTaskIds)');
          }

          // [New] Hierarchy visibility
          if (!isViewerFilter && isManager && managedUnitIds.length > 0) {
            perm.orWhere(new Brackets(vis => {
              vis.where(new Brackets(inner => {
                inner.where('task.isConfidential = :isConfidentialFalse', { isConfidentialFalse: false })
                  .orWhere('task.isConfidential IS NULL');
              }))
                .andWhere(`EXISTS (
                    SELECT 1
                    FROM task_users tu_assigner
                    INNER JOIN user_group_users ugu ON ugu.user_id = tu_assigner.process_id
                    INNER JOIN group_users gu ON gu.id = ugu.group_user_id
                    WHERE tu_assigner.task_id = task.id
                      AND tu_assigner.role = 'assigner'
                      AND gu.code IN ('tonggd', 'phogdtongcty')
                )`)
                .andWhere(`EXISTS (
                    SELECT 1
                    FROM task_users tu_director
                    LEFT JOIN users u_director ON u_director.id = tu_director.process_id
                    LEFT JOIN user_group_users ugu_dir ON ugu_dir.user_id = tu_director.process_id
                    LEFT JOIN group_users gu_dir ON gu_dir.id = ugu_dir.group_user_id
                    WHERE tu_director.task_id = task.id
                      AND tu_director.role = 'director'
                      AND (
                        (
                          u_director.parent IN (
                            SELECT LTRIM(RTRIM(value))
                            FROM STRING_SPLIT(:managedUnitIdsCsv2, ',')
                          )
                          AND gu_dir.code = 'canboct'
                        )
                        OR (
                          tu_director.type = 2
                          AND tu_director.process_id IN (
                            SELECT LTRIM(RTRIM(value))
                            FROM STRING_SPLIT(:managedUnitIdsCsv2, ',')
                          )
                        )
                      )
                )`, {
                  managedUnitIdsCsv2: managedUnitIds.join(','),
                });
              if (isViewerFilter) {
                vis.andWhere(`NOT EXISTS (
                  SELECT 1 FROM task_users tu_self_role
                  WHERE tu_self_role.task_id = task.id
                  AND tu_self_role.process_id = :managerViewerUserId
              )`, { managerViewerUserId: userId });
              }
            }));
          }
        }),
      );

      // Apply specific filters (e.g. priority, processStatus) if they are in the query
      if (priority || process_status) {
        qb.andWhere(
          new Brackets((filters) => {
            if (priority) {
              filters.andWhere('task.priority = :priority', { priority });
            }
            if (process_status) {
              if (Array.isArray(process_status)) {
                filters.andWhere('task.processStatus IN (:...processStatuses)', {
                  processStatuses: process_status,
                });
              } else {
                filters.andWhere('task.processStatus = :processStatus', {
                  processStatus: process_status,
                });
              }
            }
          })
        );
      }
    }

    if (tab) {
      this.applyTabFilter(qb, tab);
    }


    // Sort logic
    const SORTABLE_FIELDS = [
      'name',
      'progress',
      'processStatus',
      'createdAt',
      'updatedAt',
      'startDate',
      'endDate',
    ];
    const SORT_FIELD_MAP: Record<string, string> = {
      name: 'task.name',
      progress: 'task.progress',
      processStatus: 'task.processStatus',
      createdAt: 'task.createdAt',
      updatedAt: 'task.updatedAt',
      startDate: 'task.startDate',
      endDate: 'task.endDate',
    };

    if (sort && typeof sort === 'object') {
      let hasValidSort = false;
      Object.entries(sort).forEach(([field, direction]) => {
        if (!SORTABLE_FIELDS.includes(field)) return;
        if (field === 'progress') {
          qb.addSelect('CAST(task.progress AS INT)', 'progress_num');
          qb.addOrderBy(
            'progress_num',
            Number(direction) === -1 ? 'DESC' : 'ASC',
          );
          hasValidSort = true;
          return;
        }
        const column = SORT_FIELD_MAP[field];
        if (column) {
          qb.addOrderBy(column, Number(direction) === -1 ? 'DESC' : 'ASC');
          hasValidSort = true;
        }
      });
      if (!hasValidSort) qb.addOrderBy('task.createdAt', 'DESC');
    } else {
      qb.addOrderBy('task.createdAt', 'DESC');
    }


    const currentYear = new Date().getFullYear();
    const defaultStart = `${currentYear}-01-01`;
    const defaultEnd = `${currentYear}-12-31`;

    const hasActiveFilter = !!(
      name ||
      code ||
      toBook ||
      priority ||
      topic ||
      process_status ||
      overdueWork ||
      repeatTask ||
      sumary ||
      (director && (Array.isArray(director) ? director.length > 0 : true)) ||
      (start_date_from && (start_date_from.startDate !== defaultStart || start_date_from.endDate !== defaultEnd)) ||
      end_date_from
    );

    let total = 0;
    let totalRoot = 0;
    let allIdRows: any[] = [];

    const tStart = Date.now();

    if (useVisibleRootSubquery) {
      if (!hasActiveFilter) {
        // 1. Get total count
        const tCountStart = Date.now();
        const countQb = qb.clone();
        countQb.expressionMap.orderBys = {};
        const [countSql, countParams] = countQb.getQueryAndParameters();
        const { cteSql: countCteSql, cteParams: countCteParams } = this.buildCteSqlAndParams(
          userId!, unitId, isClerk, delegatedConfigs, isViewerFilter, countParams.length, resolvedTypeTask
        );
        const combinedCountSql = `${countCteSql}\nSELECT COUNT(*) AS cnt FROM (${countSql}) AS temp_count`;
        const combinedCountParams = [...countParams, ...countCteParams];
        const countResult = await this.dataSource.query(combinedCountSql, combinedCountParams);
        total = countResult[0]?.cnt ? Number(countResult[0].cnt) : 0;
        totalRoot = total;
        const tCountEnd = Date.now();
        // // console.log(`[PERF] findAllFormDoc repo - Get total count took ${tCountEnd - tCountStart}ms`);

        // 2. Get total root count
        if (!isSelectFormDoc) {
          const tRootCountStart = Date.now();
          const rootCountQb = qb.clone();
          rootCountQb.expressionMap.orderBys = {};
          if (!isKanban) {
            rootCountQb.andWhere(new Brackets((rootQb) => { rootQb.where('task.parent IS NULL').orWhere('task.parent = 0'); }));
          }
          const [rootCountSql, rootCountParams] = rootCountQb.getQueryAndParameters();
          const { cteSql: rootCteSql, cteParams: rootCteParams } = this.buildCteSqlAndParams(
            userId!, unitId, isClerk, delegatedConfigs, isViewerFilter, rootCountParams.length, resolvedTypeTask
          );
          const combinedRootCountSql = `${rootCteSql}\nSELECT COUNT(*) AS cnt FROM (${rootCountSql}) AS temp_count`;
          const combinedRootCountParams = [...rootCountParams, ...rootCteParams];
          const rootCountResult = await this.dataSource.query(combinedRootCountSql, combinedRootCountParams);
          totalRoot = rootCountResult[0]?.cnt ? Number(rootCountResult[0].cnt) : 0;
          // // console.log(`[PERF] findAllFormDoc repo - Get total root count took ${Date.now() - tRootCountStart}ms`);
        }
      }

      // 3. Get all IDs on the current page
      const tPageStart = Date.now();
      const pageQb = qb.clone();
      if (!isSelectFormDoc && !hasActiveFilter && !isKanban) {
        pageQb.andWhere(new Brackets((rootQb) => { rootQb.where('task.parent IS NULL').orWhere('task.parent = 0'); }));
      }
      const [pageSql, pageParams] = pageQb
        .select('task.id', 'id')
        .distinct(true)
        .orderBy('task.id', 'DESC')
        .getQueryAndParameters();

      const { cteSql: pageCteSql, cteParams: pageCteParams } = this.buildCteSqlAndParams(
        userId!, unitId, isClerk, delegatedConfigs, isViewerFilter, pageParams.length, resolvedTypeTask
      );
      const combinedPageSql = `${pageCteSql}\n${pageSql}`;
      const combinedPageParams = [...pageParams, ...pageCteParams];
      allIdRows = await this.dataSource.query(combinedPageSql, combinedPageParams);
      // console.log(`[PERF] findAllFormDoc repo - Get all IDs took ${Date.now() - tPageStart}ms (found ${allIdRows.length} rows)`);
    } else {
      if (!hasActiveFilter) {
        const tNoCteStart = Date.now();
        total = await qb.getCount();
        totalRoot = total;
        if (!isSelectFormDoc && !isKanban) {
          const rootCountQb = qb.clone();
          rootCountQb.andWhere(new Brackets((rootQb) => { rootQb.where('task.parent IS NULL').orWhere('task.parent = 0'); }));
          totalRoot = await rootCountQb.getCount();
        }
      }

      const pageQb = qb.clone();
      if (!isSelectFormDoc && !hasActiveFilter && !isKanban) {
        pageQb.andWhere(new Brackets((rootQb) => { rootQb.where('task.parent IS NULL').orWhere('task.parent = 0'); }));
      }
      allIdRows = await pageQb
        .select('task.id', 'id')
        .distinct(true)
        .orderBy('task.id', 'DESC')
        .getRawMany();
      // console.log(`[PERF] findAllFormDoc repo - Get all IDs (No CTE) took ${Date.now() - tNoCteStart}ms (found ${allIdRows.length} rows)`);
    }

    const matchedIds = Array.from(
      new Set(
        allIdRows
          .map((r) => Number(r.id))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    );

    let rootIds = [...matchedIds];
    if (hasActiveFilter && matchedIds.length > 0 && !disableHierarchy) {
      // Find top-level root ancestors (parent IS NULL or parent = 0)
      const rootQuery = `
        WITH RecursiveAncestors AS (
          SELECT id, parent
          FROM task
          WHERE id IN (${matchedIds.join(',')})
          UNION ALL
          SELECT t.id, t.parent
          FROM task t
          INNER JOIN RecursiveAncestors ra ON ra.parent = t.id
          WHERE t.status = 1
        )
        SELECT DISTINCT id FROM RecursiveAncestors WHERE parent IS NULL OR parent = 0
      `;
      const rootRows = await this.dataSource.query(rootQuery);
      rootIds = rootRows.map((r: any) => Number(r.id)).filter((id: number) => id > 0);

      // Sort rootIds DESC to show newest first
      rootIds.sort((a, b) => b - a);

      total = rootIds.length;
      totalRoot = total;
    }

    const uniqueSortedIds = Array.from(new Set(rootIds));

    const offset = (pageNum - 1) * limitNum;
    const idRows = uniqueSortedIds
      .slice(offset, offset + limitNum)
      .map((id) => ({ id }));

    if (!idRows.length) return { data: [], total, totalRoot };

    let taskIds = Array.from(
      new Set(
        idRows
          .map((r) => Number(r.id))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ).slice(0, limitNum);

    if (taskIds.length > 0 && !isViewerFilter && !disableHierarchy) {
      const tGetRelatedStart = Date.now();
      taskIds = await this.getAllRelatedTaskIds(taskIds);
      // console.log(`[PERF] findAllFormDoc repo - getAllRelatedTaskIds took ${Date.now() - tGetRelatedStart}ms`);
    }
    if (!taskIds.length) return { data: [], total, totalRoot };

    // Fetch full data for the expanded task IDs
    const dataQb = this.createQueryBuilder('task')
      .leftJoin('task.taskUsers', 'taskUsers')
      .leftJoin('taskUsers.user', 'user')
      .leftJoin('user.parent', 'userParent')
      .leftJoin('taskUsers.organizationUnit', 'org')
      .leftJoin('task.project', 'project')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.updatedBy', 'updatedBy')
      .select([
        'task.id', 'task.name', 'task.code', 'task.note', 'task.docId', 'task.parent', 'task.isApprovalRequired',
        'task.progress', 'task.processStatus', 'task.priority', 'task.reminderTime',
        'task.dependentTaskId', 'task.startDate', 'task.endDate', 'task.typeTask', 'task.createdAt', 'task.updatedAt',
        'task.projectId',

        'createdBy.id', 'createdBy.name',
        'taskUsers.id', 'taskUsers.role', 'taskUsers.type', 'taskUsers.processId', 'taskUsers.processName',
        'user.id', 'user.name', 'userParent.id', 'userParent.name', 'org.id', 'org.name',
        'project.id', 'project.projectStatus',
      ])
      .orderBy('task.id', 'DESC');

    if (taskIds.length > 1800) {
      dataQb.where(
        `task.id IN (
          SELECT CAST(value AS BIGINT)
          FROM OPENJSON(:taskIdsJson)
        )`,
        { taskIdsJson: JSON.stringify(taskIds) },
      );
    } else {
      dataQb.where('task.id IN (:...taskIds)', { taskIds });
    }

    if (status) {
      if (Array.isArray(status)) {
        dataQb.andWhere('task.status IN (:...statuses)', { statuses: status });
      } else {
        dataQb.andWhere('task.status = :status', { status });
      }
    } else {
      dataQb.andWhere('task.status = 1');
    }

    const tDataStart = Date.now();
    const data = await dataQb.getMany();
    // console.log(`[PERF] findAllFormDoc repo - dataQb.getMany() took ${Date.now() - tDataStart}ms (found ${data.length} records)`);
    const normalizedData = data;

    const mappedData = normalizedData.map(task => ({
      ...task,
      flags: {
        // hideDelete = true → ẩn nút xóa
        // Người tạo hoặc Người giao có thể xóa khi công việc ở trạng thái Công việc mới (1)
        hideDelete: (
          !!userId &&
          (task.createdBy?.id === userId ||
            (task.taskUsers &&
              task.taskUsers.some(
                (taskUser) =>
                  taskUser.processId === userId && taskUser.role === 'assigner',
              ))) &&
          task.processStatus === '1'
        ),
        // hideDelete:
        //   !!userId &&
        //   (task.createdBy?.id === userId || (task.createdBy?.id === userId ||
        //     (task.taskUsers &&
        //       task.taskUsers.some(
        //         (taskUser) =>
        //           taskUser.processId === userId && taskUser.role === 'assigner',
        //       )))) &&
        //   task.processStatus === '1',
        // Người tạo hoặc Người giao có thể giao việc khi:
        // - Công việc mới (1), Điều chỉnh (6), Đang thực hiện (2)
        isAssignWork:
          !!userId &&
          (task.createdBy?.id === userId ||
            (task.taskUsers &&
              task.taskUsers.some(
                (taskUser) =>
                  taskUser.processId === userId && taskUser.role === 'assigner',
              ))) &&
          ['1', '2', '6'].includes(task.processStatus),
        hideAdd:
          [3, 4].includes(Number(task.project?.projectStatus)) ? false :
            task.endDate && new Date() > new Date(task.endDate) && task.processStatus !== '4' ? false :
            (!['4', '8', '3'].includes(task.processStatus) ||
              (!!userId &&
                task.taskUsers &&
                task.taskUsers.some(
                  (tu) => tu.processId === userId && tu.role === 'viewer',
                ))),
      },
      ...(() => {
        const result = { assigners: [], directors: [], supporters: [], viewers: [] };
        for (const tu of task.taskUsers ?? []) {
          let formattedName = tu.processName || tu.user?.name || '';
          if (tu.user?.parent?.name) {
            formattedName = `${formattedName} - ${tu.user.parent.name}`;
          }
          const item = {
            processId: tu.processId,
            name: formattedName,
            type: tu.type,
          };
          if (result[`${tu.role}s`]) {
            result[`${tu.role}s`].push(item);
          }
        }
        return result;
      })(),
    }));

    return { data: mappedData, total, totalRoot };
  }
  private parseDateToISO(dateStr?: string): string | null {
    if (!dateStr) return null;

    // dd/MM/yyyy
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/');
      if (!day || !month || !year) return null;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // yyyy-MM-dd
    if (dateStr.includes('-')) {
      const [year, month, day] = dateStr.split('-');
      if (!day || !month || !year) return null;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return null;
  }


  async countTask(userId?: string) {
    const baseQb = this.createQueryBuilder('task').where(
      'task.status = :status',
      { status: 1 },
    );

    if (userId) {
      const userTaskIds = await this.getTaskIdsByUserRole(userId, undefined, undefined, undefined, undefined, 1);
      baseQb.andWhere(
        new Brackets((qb) => {
          qb.where('task.createdById = :userId', { userId });
          if (userTaskIds.length) {
            if (userTaskIds.length > 1800) {
              qb.orWhere(
                `task.id IN (
                  SELECT CAST(value AS BIGINT)
                  FROM OPENJSON(:countTaskUserTaskIdsJson)
                )`,
                { countTaskUserTaskIdsJson: JSON.stringify(userTaskIds) },
              );
            } else {
              qb.orWhere('task.id IN (:...countTaskUserTaskIds)', { countTaskUserTaskIds: userTaskIds });
            }
          }
        }),
      );
    }

    const [generalTotal, recurringTotal, fromdocTotal, metttingTotal] =
      await Promise.all([
        baseQb
          .clone()
          .andWhere('task.typeTask = :type', { type: TASK_TYPE.GENERAL })
          .getCount(),
        baseQb
          .clone()
          .andWhere('task.typeTask = :type', { type: TASK_TYPE.RECURRING })
          .getCount(),
        baseQb
          .clone()
          .andWhere('task.typeTask = :type', { type: TASK_TYPE.FORM_DOC })
          .getCount(),
        baseQb
          .clone()
          .andWhere('task.typeTask = :type', { type: TASK_TYPE.FORM_MEETING })
          .getCount(),
      ]);

    return { generalTotal, recurringTotal, fromdocTotal, metttingTotal };
  }

  /**
   * Update task process status and optionally progress
   */
  async updateTaskProcessStatus(
    taskId: number,
    processStatus: string,
    progress?: string,
    tx?: any,
  ): Promise<void> {
    if (!tx) {
      throw new Error('Transaction is required for updateTaskProcessStatus');
    }

    const dbName = this.dataSource.options.database;
    const tableName = this.metadata.tableName;
    const request = tx.request();

    let query = `
      UPDATE ${dbName}.dbo.${tableName}
      SET process_status = @processStatus,
          update_at = GETDATE()
    `;

    if (progress !== undefined) {
      query += `, progress = @progress`;
    }

    query += ` WHERE id = @taskId`;

    request.input('taskId', taskId);
    request.input('processStatus', processStatus);

    if (progress !== undefined) {
      request.input('progress', progress);
    }

    await request.query(query);
  }

  /**
   * Get parent task ID for a given task
   */
  async getParentTaskId(taskId: number, tx?: any): Promise<number | null> {
    if (!tx) {
      throw new Error('Transaction is required for getParentTaskId');
    }

    const dbName = this.dataSource.options.database;
    const tableName = this.metadata.tableName;
    const request = tx.request();

    const result = await request
      .input('taskId', taskId)
      .query(`
        SELECT parent 
        FROM ${dbName}.dbo.${tableName}
        WHERE id = @taskId
      `);

    if (result.recordset && result.recordset.length > 0) {
      const parentId = result.recordset[0].parent;
      return parentId && parentId > 0 ? parentId : null;
    }

    return null;
  }

  /**
   * Get all child tasks progress for a parent task
   */
  async getChildrenProgress(parentId: number, tx?: any): Promise<string[]> {
    if (!tx) {
      throw new Error('Transaction is required for getChildrenProgress');
    }

    const dbName = this.dataSource.options.database;
    const tableName = this.metadata.tableName;
    const request = tx.request();

    const result = await request
      .input('parentId', parentId)
      .query(`
        SELECT progress 
        FROM ${dbName}.dbo.${tableName}
        WHERE parent = @parentId AND status = 1
      `);

    if (result.recordset && result.recordset.length > 0) {
      return result.recordset.map((row: any) => row.progress || '0');
    }

    return [];
  }

  /**
   * Update parent task progress based on children's progress
   */
  async updateParentProgress(parentId: number, tx?: any): Promise<number> {
    const childrenProgress = await this.getChildrenProgress(parentId, tx);

    if (childrenProgress.length === 0) {
      return 0;
    }

    let totalProgress = 0;
    let validCount = 0;

    for (const progressStr of childrenProgress) {
      const progressValue = parseFloat(progressStr);
      if (!isNaN(progressValue)) {
        totalProgress += progressValue;
        validCount++;
      }
    }

    const averageProgress = validCount > 0
      ? Math.round(totalProgress / validCount)
      : 0;

    if (!tx) {
      throw new Error('Transaction is required for updateParentProgress');
    }

    const dbName = this.dataSource.options.database;
    const tableName = this.metadata.tableName;
    const request = tx.request();

    await request
      .input('parentId', parentId)
      .input('averageProgress', averageProgress.toString())
      .query(`
        UPDATE ${dbName}.dbo.${tableName}
        SET progress = @averageProgress,
            update_at = GETDATE()
        WHERE id = @parentId
      `);

    return averageProgress;
  }

  applySorting(qb, sort) {
    const SORT_MAP = {
      name: 'task.name',
      typeTask: 'task.typeTask',
      dateSent: 'audit_date_sent',
      sender: 'audit_sender_name',
      typeRequest: 'audit_action_code',
      createdAt: 'task.createdAt',
    };

    let hasSort = false;

    if (sort) {
      for (const key in sort) {
        if (!SORT_MAP[key]) continue;

        qb.addOrderBy(
          SORT_MAP[key],
          Number(sort[key]) === 1 ? 'ASC' : 'DESC',
        );

        hasSort = true;
      }
    }

    if (!hasSort) {
      qb.orderBy('audit_date_sent', 'DESC');
    }
  }
  applyAuditSelectFields(qb: SelectQueryBuilder<TaskEntity>) {
    const taskTypes = `'TaskDocument', 'TaskMeeting', 'TaskMetting', 'TaskUser', 'TaskProjectUnit', 'TaskManyLevelUnit', 'TaskProjectCompany', 'TaskGeneral', 'TaskMultiPersional', 'TaskManyUnit', 'TaskProject'`;

    const latestAudit = `
    SELECT MAX(a2.id)
    FROM audit a2
    WHERE a2.document_id = CAST(task.id AS NVARCHAR(64))
      AND a2.type_document IN (${taskTypes})
  `;

    qb.addSelect(sub => sub
      .select('u.name')
      .from('audit', 'a')
      .innerJoin('users', 'u', 'u.id = a.user_id')
      .where('a.document_id = CAST(task.id AS NVARCHAR(64))')
      .andWhere(`a.type_document IN (${taskTypes})`)
      .andWhere(`a.id = (${latestAudit})`)
      , 'audit_sender_name');

    qb.addSelect(sub => sub
      .select('a.created_at')
      .from('audit', 'a')
      .where('a.document_id = CAST(task.id AS NVARCHAR(64))')
      .andWhere(`a.type_document IN (${taskTypes})`)
      .andWhere(`a.id = (${latestAudit})`)
      , 'audit_date_sent');

    qb.addSelect(sub => sub
      .select('a.action_code')
      .from('audit', 'a')
      .where('a.document_id = CAST(task.id AS NVARCHAR(64))')
      .andWhere(`a.type_document IN (${taskTypes})`)
      .andWhere(`a.id = (${latestAudit})`)
      , 'audit_action_code');

    qb.addSelect(sub => sub
      .select('TOP 1 a.action_code')
      .from('audit', 'a')
      .where('a.document_id = CAST(task.id AS NVARCHAR(64))')
      .andWhere(`a.type_document IN (${taskTypes})`)
      .andWhere(`a.action_code IN ('GUI_PHE_DUYET', 'DIEU_CHINH', 'GUI_DIEU_CHINH')`)
      .orderBy('a.created_at', 'DESC')
      , 'send_action_code');

    qb.addSelect(sub => sub
      .select('TOP 1 u.name')
      .from('audit', 'a')
      .innerJoin('users', 'u', 'u.id = a.created_by')
      .where('a.document_id = CAST(task.id AS NVARCHAR(64))')
      .andWhere(`a.type_document IN (${taskTypes})`)
      .andWhere(`a.action_code IN ('GUI_PHE_DUYET', 'DIEU_CHINH', 'GUI_DIEU_CHINH')`)
      .orderBy('a.created_at', 'DESC')
      , 'send_sender_name');

    qb.addSelect(sub => sub
      .select('TOP 1 u.name')
      .from('audit', 'a')
      .innerJoin('users', 'u', 'u.id = a.receiver')
      .where('a.document_id = CAST(task.id AS NVARCHAR(64))')
      .andWhere(`a.type_document IN (${taskTypes})`)
      .andWhere(`a.action_code IN ('GUI_PHE_DUYET', 'DIEU_CHINH', 'GUI_DIEU_CHINH')`)
      .orderBy('a.created_at', 'DESC')
      , 'send_receiver_name');

    qb.addSelect(sub => sub
      .select('u.name')
      .from('audit', 'a')
      .leftJoin('users', 'u', 'u.id = a.receiver')
      .where('a.document_id = CAST(task.id AS NVARCHAR(64))')
      .andWhere(`a.type_document IN (${taskTypes})`)
      .andWhere(`a.id = (${latestAudit})`)
      , 'audit_receiver_name');

    // qb.addSelect(sub => sub
    //   .select('a.note')
    //   .from('audit', 'a')
    //   .where('a.document_id = CAST(task.id AS NVARCHAR(64))')
    //   .andWhere(`a.id = (${latestAudit})`)
    //   , 'audit_note');

    qb.addSelect(sub => sub
      .select('a.details')
      .from('audit', 'a')
      .where('a.document_id = CAST(task.id AS NVARCHAR(64))')
      .andWhere(`a.type_document IN (${taskTypes})`)
      .andWhere(`a.id = (${latestAudit})`)
      , 'audit_details');
  }
  applyAdvancedFilters(qb: SelectQueryBuilder<TaskEntity>, filter: any) {
    if (filter.typeRequest && filter.typeRequest !== 'all') {
      let actionCodes: string[] = [];
      if (filter.typeRequest === 'PHE_DUYET_KET_QUA') {
        actionCodes = ['GUI_PHE_DUYET'];
      } else if (filter.typeRequest === 'DIEU_CHINH_THONG_TIN') {
        actionCodes = ['DIEU_CHINH', 'GUI_DIEU_CHINH'];
      } else {
        actionCodes = [filter.typeRequest];
      }

      qb.andWhere(
        `
        (
          SELECT TOP 1 a_req.action_code
          FROM audit a_req
          WHERE a_req.document_id = CAST(task.id AS NVARCHAR(64))
            AND a_req.action_code IN ('GUI_PHE_DUYET', 'DIEU_CHINH', 'GUI_DIEU_CHINH')
          ORDER BY a_req.created_at DESC
        ) IN (:...actionCodes)
        `,
        { actionCodes },
      );
    }

    if (filter.typeTask) {
      const types = [filter.typeTask];
      // Hỗ trợ cả key cũ và key mới để đảm bảo tìm thấy dữ liệu
      if (filter.typeTask === 'general') types.push('TaskGeneral');
      if (filter.typeTask === 'form_doc') types.push('TaskFormDoc');
      if (filter.typeTask === 'form_meeting') types.push('TaskFormMeeting');
      if (filter.typeTask === 'recurring') types.push('TaskRecurring');

      qb.andWhere('task.typeTask IN (:...types)', { types });
    }

    if (filter.senderId || filter.sender) {
      const sId = filter.senderId || filter.sender;
      qb.andWhere(`
      EXISTS (
        SELECT 1 FROM audit a
        WHERE a.document_id = CAST(task.id AS NVARCHAR(64))
        AND a.user_id = :sId
        AND a.action_code IN ('GUI_PHE_DUYET', 'DIEU_CHINH', 'GUI_DIEU_CHINH')
      )
    `, { sId });
    }

    if (filter.dateSent) {
      if (filter.dateSent.startDate) {
        qb.andWhere(`
        EXISTS (
          SELECT 1 FROM audit a
          WHERE a.document_id = CAST(task.id AS NVARCHAR(64))
          AND a.action_code IN ('GUI_PHE_DUYET', 'DIEU_CHINH', 'GUI_DIEU_CHINH')
          AND a.created_at >= :sentFrom
        )
      `, { sentFrom: new Date(filter.dateSent.startDate) });
      }
      if (filter.dateSent.endDate) {
        qb.andWhere(`
        EXISTS (
          SELECT 1 FROM audit a
          WHERE a.document_id = CAST(task.id AS NVARCHAR(64))
          AND a.action_code IN ('GUI_PHE_DUYET', 'DIEU_CHINH', 'GUI_DIEU_CHINH')
          AND a.created_at <= :sentTo
        )
      `, { sentTo: new Date(filter.dateSent.endDate + 'T23:59:59') });
      }
    }

    if (filter.processedDate) {
      if (filter.processedDate.startDate) {
        qb.andWhere(`
        EXISTS (
          SELECT 1 FROM audit a
          WHERE a.document_id = CAST(task.id AS NVARCHAR(64))
          AND a.action_code IN ('PHE_DUYET', 'DIEU_CHINH', 'TU_CHOI', 'TU_CHOI_PHE_DUYET', 'DONG_Y')
          AND a.created_at >= :procFrom
        )
      `, { procFrom: new Date(filter.processedDate.startDate) });
      }
      if (filter.processedDate.endDate) {
        qb.andWhere(`
        EXISTS (
          SELECT 1 FROM audit a
          WHERE a.document_id = CAST(task.id AS NVARCHAR(64))
          AND a.action_code IN ('PHE_DUYET', 'DIEU_CHINH', 'TU_CHOI', 'TU_CHOI_PHE_DUYET', 'DONG_Y')
          AND a.created_at <= :procTo
        )
      `, { procTo: new Date(filter.processedDate.endDate + 'T23:59:59') });
      }
    }

    if (filter.approveStatus || filter.approvalStatus) {
      const aStatus = filter.approveStatus || filter.approvalStatus;
      qb.andWhere(`
      EXISTS (
        SELECT 1 FROM audit a
        WHERE a.document_id = CAST(task.id AS NVARCHAR(64))
        AND a.action_code = :aStatus
      )
    `, { aStatus });
    }
  }
  buildApproveBaseQuery(params: ListTaskDto, userId: string) {
    const { status = 1, tab, type, filter = {} } = params;

    const qb = this.createQueryBuilder('task');

    qb.andWhere('task.status = :status', { status });

    if (filter.name) {
      qb.andWhere(
        'task.name COLLATE Latin1_General_CI_AI LIKE :name',
        { name: `%${filter.name}%` },
      );
    }

    if (tab) {
      this.applyTabFilter(qb, tab);
    }

    const taskTypes = `'TaskDocument', 'TaskMeeting', 'TaskMetting', 'TaskUser', 'TaskProjectUnit', 'TaskManyLevelUnit', 'TaskProjectCompany', 'TaskGeneral', 'TaskMultiPersional', 'TaskManyUnit', 'TaskProject'`;

    if (type === 'sent') {
      // For "sent" type: show tasks where user has EVER sent them (not just latest action)
      // This ensures tasks remain visible even after being approved/rejected
      qb.andWhere(
        `
      EXISTS (
        SELECT 1 FROM audit a
        WHERE a.document_id = CAST(task.id AS NVARCHAR(64))
        AND a.type_document IN (${taskTypes})
        AND a.action_code IN (:...actionCodes)
        AND a.created_by = :userId
      )
    `,
      );
    } else {
      // For "received" type: check only the latest audit record using NOT EXISTS (much faster than MAX(id))
      qb.andWhere(
        `
      EXISTS (
        SELECT 1 FROM audit a
        WHERE a.document_id = CAST(task.id AS NVARCHAR(64))
        AND a.type_document IN (${taskTypes})
        AND a.receiver = :userId
        AND a.action_code IN (:...actionCodes)
        AND NOT EXISTS (
          SELECT 1 FROM audit a3 
          WHERE a3.document_id = a.document_id 
            AND a3.type_document IN (${taskTypes})
            AND a3.id > a.id
        )
      )
    `,
      );
    }

    qb.setParameters({
      userId,
      actionCodes: [
        stageStatusDoc.GUI_PHE_DUYET,
        stageStatusDoc.GUI_DIEU_CHINH,
        stageStatusDoc.DIEU_CHINH,
      ],
    });

    this.applyAdvancedFilters(qb, filter);

    return qb;
  }

  async findSentTasksWithHistory(params: ListTaskDto, userId: string) {
    const page = Number(params.page || 1);
    const limit = Number(params.limit || 10);

    const qb = this.dataSource.createQueryBuilder()
      .select([
        't.id AS taskId',
        't.name AS taskName',
        't.code AS taskCode',
        't.status AS taskStatus',
        't.priority AS taskPriority',
        't.process_status AS taskProcessStatus',
        't.type_task AS taskTypeTask',
        't.end_date AS taskEndDate',
        't.progress AS taskProgress',
        'a.id AS auditId',
        'a.action_code AS auditActionCode',
        'a.created_at AS auditCreatedAt',
        // 'a.note AS auditNote', // Column note does not exist
        'a.details AS auditDetails',
        'sender.name AS auditSenderName',
        'receiver.name AS auditReceiverName',
        '(SELECT TOP 1 na.action_code FROM audit na WHERE na.document_id = a.document_id AND na.created_at > a.created_at ORDER BY na.created_at ASC) AS nextAuditActionCode',
        '(SELECT TOP 1 na.details FROM audit na WHERE na.document_id = a.document_id AND na.created_at > a.created_at ORDER BY na.created_at ASC) AS nextAuditDetails'
      ])
      .from('audit', 'a')
      .innerJoin('task', 't', 't.id = TRY_CAST(a.document_id AS BIGINT)')
      .leftJoin('users', 'sender', 'sender.id = a.created_by') // audit creator is sender
      .leftJoin('users', 'receiver', 'receiver.id = a.receiver')
      .where('a.created_by = :userId', { userId })
      .andWhere("a.action_code IN ('GUI_PHE_DUYET', 'DIEU_CHINH', 'GUI_DIEU_CHINH')");

    // Extract filters
    const {
      name,
      code,
      typeRequest,
      dateSent,
      senderId,
      sender,
      receiverId,
      receiver: receiverFilter,
      priority,
      processStatus,
      typeTask,
    } = params.filter || {};

    // Apply Filter Search Name/Code
    if (name || code) {
      qb.andWhere(
        new Brackets((sub) => {
          if (name) {
            sub.orWhere('t.name COLLATE Latin1_General_CI_AI LIKE :name', { name: `%${name}%` });
          }
          if (code) {
            sub.orWhere('t.code COLLATE Latin1_General_CI_AI LIKE :code', { code: `%${code}%` });
          }
        }),
      );
    }

    // Apply Type Request Filter
    if (typeRequest && typeRequest !== 'all') {
      let actionCodes: string[] = [];
      if (typeRequest === 'PHE_DUYET_KET_QUA') {
        actionCodes = ['GUI_PHE_DUYET'];
      } else if (typeRequest === 'DIEU_CHINH_THONG_TIN') {
        actionCodes = ['DIEU_CHINH', 'GUI_DIEU_CHINH'];
      } else {
        actionCodes = [typeRequest];
      }
      qb.andWhere('a.action_code IN (:...actionCodes)', { actionCodes });
    }

    // Apply Date Sent Filter
    if (dateSent) {
      if (dateSent.startDate) {
        qb.andWhere('a.created_at >= :sentFrom', { sentFrom: new Date(dateSent.startDate) });
      }
      if (dateSent.endDate) {
        qb.andWhere('a.created_at <= :sentTo', { sentTo: new Date(dateSent.endDate + 'T23:59:59') });
      }
    }

    // Apply Sender Filter (already filtered by userId, but allow sub-filtering)
    if (senderId || sender) {
      const sId = senderId || sender;
      qb.andWhere('a.created_by = :sId', { sId });
    }

    // Apply Receiver Filter
    if (receiverId || receiverFilter) {
      const rId = receiverId || receiverFilter;
      qb.andWhere('a.receiver = :rId', { rId });
    }

    // Apply Priority Filter
    if (priority) {
      if (priority === 'binhthuong') {
        qb.andWhere('(t.priority = :priority OR t.priority IS NULL OR t.priority = \'\')', { priority });
      } else {
        qb.andWhere('t.priority = :priority', { priority });
      }
    }

    // Apply Process Status Filter
    if (processStatus) {
      qb.andWhere('t.process_status = :processStatus', { processStatus });
    }

    // Apply Type Task Filter
    if (typeTask) {
      const types = [typeTask];
      if (typeTask === 'general') types.push('TaskGeneral');
      if (typeTask === 'form_doc') types.push('TaskFormDoc');
      if (typeTask === 'form_meeting') types.push('TaskFormMeeting');
      if (typeTask === 'recurring') types.push('TaskRecurring');
      qb.andWhere('t.type_task IN (:...types)', { types });
    }

    // Count total before pagination
    const total = await qb.getCount();

    // Sorting logic
    const SORT_MAP: Record<string, string> = {
      taskName: 't.name',
      taskCode: 't.code',
      dateSent: 'a.created_at',
      auditCreatedAt: 'a.created_at',
      sender: 'sender.name',
      receiver: 'receiver.name',
      typeRequest: 'a.action_code',
      priority: 't.priority',
    };

    let hasSort = false;
    if (params.sort && typeof params.sort === 'object') {
      Object.entries(params.sort).forEach(([field, direction]) => {
        const column = SORT_MAP[field];
        if (column) {
          qb.addOrderBy(column, Number(direction) === -1 ? 'DESC' : 'ASC');
          hasSort = true;
        }
      });
    }

    if (!hasSort) {
      qb.orderBy('a.created_at', 'DESC');
    }

    // Pagination
    qb.offset((page - 1) * limit)
      .limit(limit);

    const data = await qb.getRawMany();

    return { data, total };
  }

  async findApproveTasks(
    params: ListTaskDto,
    userId: string,
  ) {
    const page = Number(params.page || 1);
    const limit = Number(params.limit || 10);

    const baseQb = this.buildApproveBaseQuery(params, userId);

    // ===== count =====
    const total = await baseQb.clone().getCount();

    // ===== data =====
    const dataQb = baseQb.clone();

    this.applyAuditSelectFields(dataQb);
    this.applySorting(dataQb, params.sort);

    const { entities, raw } = await dataQb
      .skip((page - 1) * limit)
      .take(limit)
      .leftJoinAndSelect('task.taskUsers', 'taskUsers')
      .leftJoinAndSelect('taskUsers.user', 'tuUser')
      .leftJoinAndSelect('tuUser.parent', 'tuParent')
      .leftJoin('task.createdBy', 'createdBy')
      .leftJoin('task.updatedBy', 'updatedBy')
      .getRawAndEntities();

    return { entities, raw, total };
  }

  async findHistoryTasksWithAudit(params: ListTaskDto, userId: string) {
    const page = Number(params.page || 1);
    const limit = Number(params.limit || 10);
    const isSent = (params.type || (params as any).type) === 'sent';

    const taskTypes = `'TaskDocument', 'TaskMeeting', 'TaskMetting', 'TaskUser', 'TaskProjectUnit', 'TaskManyLevelUnit', 'TaskProjectCompany', 'TaskGeneral', 'TaskMultiPersional', 'TaskManyUnit', 'TaskProject'`;

    const qb = this.dataSource.createQueryBuilder()
      .select([
        't.id AS taskId',
        't.name AS taskName',
        't.code AS taskCode',
        't.status AS taskStatus',
        't.priority AS taskPriority',
        't.process_status AS taskProcessStatus',
        't.type_task AS taskTypeTask',
        't.end_date AS taskEndDate',
        't.progress AS taskProgress',
        'a.id AS auditId',
        'a.action_code AS auditActionCode',
        'a.created_at AS auditCreatedAt',
        'a.details AS auditDetails',
        'sender.name AS auditSenderName',
        'receiver.name AS auditReceiverName',
        `(SELECT TOP 1 na.action_code FROM audit na WHERE na.document_id = a.document_id AND na.type_document IN (${taskTypes}) AND na.created_at > a.created_at AND na.action_code NOT IN ('DA_XEM', 'DOWNLOAD', 'PRINT', 'GUI_PHE_DUYET', 'DIEU_CHINH', 'GUI_DIEU_CHINH', 'CREATE', 'TAO_CONG_VIEC') ORDER BY na.created_at ASC) AS nextAuditActionCode`,
        `(SELECT TOP 1 na.details FROM audit na WHERE na.document_id = a.document_id AND na.type_document IN (${taskTypes}) AND na.created_at > a.created_at AND na.action_code NOT IN ('DA_XEM', 'DOWNLOAD', 'PRINT', 'GUI_PHE_DUYET', 'DIEU_CHINH', 'GUI_DIEU_CHINH', 'CREATE', 'TAO_CONG_VIEC') ORDER BY na.created_at ASC) AS nextAuditDetails`,
        `(SELECT TOP 1 na.created_at FROM audit na WHERE na.document_id = a.document_id AND na.type_document IN (${taskTypes}) AND na.created_at > a.created_at AND na.action_code NOT IN ('DA_XEM', 'DOWNLOAD', 'PRINT', 'GUI_PHE_DUYET', 'DIEU_CHINH', 'GUI_DIEU_CHINH', 'CREATE', 'TAO_CONG_VIEC') ORDER BY na.created_at ASC) AS nextAuditCreatedAt`
      ])
      .from('audit', 'a')
      .innerJoin('task', 't', 'a.document_id = CAST(t.id AS NVARCHAR(64))')
      .leftJoin('users', 'sender', 'sender.id = a.user_id')
      .leftJoin('users', 'receiver', 'receiver.id = a.receiver')
      .where(`a.type_document IN (${taskTypes})`);

    if (isSent) {
      qb.andWhere('a.user_id = :userId', { userId })
        .andWhere("a.action_code IN ('GUI_PHE_DUYET', 'DIEU_CHINH', 'GUI_DIEU_CHINH')");
    } else {
      qb.andWhere('a.receiver = :userId', { userId })
        .andWhere("a.action_code IN ('GUI_PHE_DUYET', 'DIEU_CHINH', 'GUI_DIEU_CHINH')");
    }

    if (params.filter?.name) {
      qb.andWhere('t.name LIKE :name', { name: `%${params.filter.name}%` });
    }

    const total = await qb.getCount();

    qb.orderBy('a.created_at', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);

    const data = await qb.getRawMany();

    return { data, total };
  }

  async findAllMeetingTasks(
    queryParams: ListTaskDto,
    userId?: string,
    unitId?: string,
    isClerk?: boolean,
    delegatedConfigs?: TaskAssignmentConfigEntity[],
    isManager?: boolean,
    managedUnitIds?: string[],
  ) {
    const leaderGroupCodes = ['tonggd', 'phodgtongcty'];
    const managerGroupCodes = ['truongphong', 'photruongphong'];

    const { page = 1, limit = 10, status, tab, typeTask, filter, sort } = queryParams;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    const qb = this.createQueryBuilder('task');
    const {
      name,
      code,
      meetingTitle,
      priority,
      process_status,
      start_date_from,
      end_date_from,
      overdueWork,
      processStatus,
      director,
      endDate,
      startDate,
      myJob,
      supporter,
      assigner,
      meetingId: filterMeetingId,
      meetingConclusionId: filterMeetingConclusionId,
      titleMeeting,
      repeatTask,
      myAssign,
      myDirector,
      mySupporter,
      viewers,
    } = filter || {};
    const isViewerFilter = viewers === true || viewers === 'true';

    // Filter by repeatTask
    if (repeatTask) {
      let tStart: moment.Moment | null = null;
      let tEnd: moment.Moment | null = null;
      const now = moment();

      if (repeatTask === 'tuan') {
        tStart = now.clone().startOf('isoWeek');
        tEnd = now.clone().endOf('isoWeek');
      } else if (repeatTask === 'thang') {
        tStart = now.clone().startOf('month');
        tEnd = now.clone().endOf('month');
      } else if (repeatTask === 'quy') {
        tStart = now.clone().startOf('quarter');
        tEnd = now.clone().endOf('quarter');
      }

      if (tStart && tEnd) {
        qb.andWhere('task.startDate >= :rStartTime AND task.startDate <= :rEndTime', {
          rStartTime: tStart.toDate(),
          rEndTime: tEnd.toDate(),
        });
      }
    }

    // Filter by meeting title
    let meetingIdsFromTitle: string[] = [];
    if (meetingTitle) {
      const meetings = await this.dataSource
        .createQueryBuilder()
        .select(['id'])
        .from('meetings', 'm')
        .where('m.title COLLATE Latin1_General_CI_AI LIKE :title', {
          title: `%${meetingTitle}%`,
        })
        .getRawMany();

      meetingIdsFromTitle = meetings.map((m) => String(m.id));
    }

    // Filter by name/code
    if (name || code || meetingTitle) {
      qb.andWhere(
        new Brackets((qbName) => {
          if (name) {
            qbName.orWhere('task.name COLLATE Latin1_General_CI_AI LIKE :name', {
              name: `%${name}%`,
            });
          }
          if (code) {
            qbName.orWhere('task.code COLLATE Latin1_General_CI_AI LIKE :code', {
              code: `%${code}%`,
            });
          }
          if (meetingTitle && meetingIdsFromTitle.length > 0) {
            if (meetingIdsFromTitle.length > 1800) {
              qbName.orWhere(
                `task.meetingId IN (
                  SELECT CAST(value AS VARCHAR)
                  FROM OPENJSON(:meetingIdsFromTitleJson)
                )`,
                { meetingIdsFromTitleJson: JSON.stringify(meetingIdsFromTitle) }
              );
            } else {
              qbName.orWhere('task.meetingId IN (:...meetingIdsFromTitle)', {
                meetingIdsFromTitle,
              });
            }
          }
        }),
      );
    }

    // Filter by myAssign, myDirector, mySupporter (OR condition)
    const isMyAssign = myAssign === true || myAssign === 'true';
    const isMyDirector = myDirector === true || myDirector === 'true';
    const isMySupporter = mySupporter === true || mySupporter === 'true';

    if (userId && (isMyAssign || isMyDirector || isMySupporter)) {
      const roles: string[] = [];
      if (isMyAssign) roles.push('assigner');
      if (isMyDirector) roles.push('director');
      if (isMySupporter) roles.push('supporter');

      qb.andWhere(
        " EXISTS (SELECT 1 FROM task_users tu_myRoles WHERE tu_myRoles.task_id = task.id AND LOWER(tu_myRoles.process_id) = LOWER(:myRolesUserId) AND tu_myRoles.role IN (:...myRoles)) ",
        { myRolesUserId: userId, myRoles: roles }
      );
    }

    if (priority) {
      if (priority === 'binhthuong') {
        qb.andWhere(
          new Brackets((innerQb) => {
            innerQb.where('task.priority = :priority', { priority })
              .orWhere('task.priority IS NULL')
              .orWhere("task.priority = ''");
          }),
        );
      } else {
        qb.andWhere('task.priority = :priority', { priority });
      }
    }

    const meetingIdFilter = filterMeetingId || titleMeeting?.meetingId;
    const meetingConclusionIdFilter = filterMeetingConclusionId || titleMeeting?.meetingConclusionId;

    if (meetingIdFilter && meetingConclusionIdFilter) {
      const meetingIds = Array.isArray(meetingIdFilter) ? meetingIdFilter : [meetingIdFilter];
      const conclusionIds = Array.isArray(meetingConclusionIdFilter) ? meetingConclusionIdFilter : [meetingConclusionIdFilter];

      qb.andWhere(
        new Brackets((qbFilter) => {
          if (meetingIds.length > 0) {
            if (meetingIds.length > 1800) {
              qbFilter.orWhere(
                `task.meetingId IN (
                  SELECT CAST(value AS VARCHAR)
                  FROM OPENJSON(:meetingIdsJson)
                )`,
                { meetingIdsJson: JSON.stringify(meetingIds) }
              );
            } else {
              qbFilter.orWhere('task.meetingId IN (:...meetingIds)', { meetingIds });
            }
          }
          if (conclusionIds.length > 0) {
            if (conclusionIds.length > 1800) {
              qbFilter.orWhere(
                `task.meetingConclusionId IN (
                  SELECT CAST(value AS VARCHAR)
                  FROM OPENJSON(:conclusionIdsJson)
                )`,
                { conclusionIdsJson: JSON.stringify(conclusionIds) }
              );
            } else {
              qbFilter.orWhere('task.meetingConclusionId IN (:...conclusionIds)', { conclusionIds });
            }
          }
        }),
      );
    } else {
      if (meetingIdFilter) {
        const meetingIds = Array.isArray(meetingIdFilter) ? meetingIdFilter : [meetingIdFilter];
        if (meetingIds.length > 0) {
          if (meetingIds.length > 1800) {
            qb.andWhere(
              `task.meetingId IN (
                SELECT CAST(value AS VARCHAR)
                FROM OPENJSON(:meetingIdsJson)
              )`,
              { meetingIdsJson: JSON.stringify(meetingIds) }
            );
          } else {
            qb.andWhere('task.meetingId IN (:...meetingIds)', { meetingIds });
          }
        }
      }

      if (meetingConclusionIdFilter) {
        const conclusionIds = Array.isArray(meetingConclusionIdFilter) ? meetingConclusionIdFilter : [meetingConclusionIdFilter];
        if (conclusionIds.length > 0) {
          if (conclusionIds.length > 1800) {
            qb.andWhere(
              `task.meetingConclusionId IN (
                SELECT CAST(value AS VARCHAR)
                FROM OPENJSON(:conclusionIdsJson)
              )`,
              { conclusionIdsJson: JSON.stringify(conclusionIds) }
            );
          } else {
            qb.andWhere('task.meetingConclusionId IN (:...conclusionIds)', { conclusionIds });
          }
        }
      }
    }

    if (processStatus) {
      if (Array.isArray(processStatus)) {
        qb.andWhere('task.processStatus IN (:...processStatuses)', {
          processStatuses: processStatus,
        });
      } else {
        qb.andWhere('task.processStatus = :processStatus', {
          processStatus: processStatus,
        });
      }
    }
    if (process_status) {
      if (Array.isArray(process_status)) {
        qb.andWhere('task.processStatus IN (:...processStatuses)', {
          processStatuses: process_status,
        });
      } else {
        qb.andWhere('task.processStatus = :processStatus', {
          processStatus: process_status,
        });
      }
    }

    if (director) {
      let directorIds: string[] = [];
      if (Array.isArray(director)) {
        directorIds = director.map(d => typeof d === 'object' ? d.processId : d).filter(Boolean);
      } else if (typeof director === 'string') {
        directorIds = director.split(',').map(s => s.trim()).filter(Boolean);
      } else if (typeof director === 'object' && director.processId) {
        directorIds = [director.processId];
      }

      if (directorIds.length > 0) {
        qb.andWhere(
          `EXISTS (
            SELECT 1 FROM task_users tu_director
            WHERE tu_director.task_id = task.id
              AND tu_director.role IN ('director', 'supporter')
              AND tu_director.process_id IN (:...directorProcessIds)
          )`,
          { directorProcessIds: directorIds },
        );
      }
    }

    if (overdueWork === true || overdueWork === 'true') {
      const now = new Date().toISOString().split('T')[0];
      qb.andWhere('task.endDate < :now', { now });
      qb.andWhere('task.processStatus != :completed', { completed: '4' });
    }

    if (start_date_from) {
      if (start_date_from.startDate) {
        qb.andWhere('task.startDate >= :startDateFromStart', {
          startDateFromStart: start_date_from.startDate,
        });
      }
      if (start_date_from.endDate) {
        qb.andWhere('task.startDate <= :startDateFromEnd', {
          startDateFromEnd: start_date_from.endDate,
        });
      }
    }

    if (end_date_from) {
      if (end_date_from.startDate) {
        qb.andWhere('task.endDate >= :endDateFromStart', {
          endDateFromStart: `${end_date_from.startDate} 00:00:00`,
        });
      }
      if (end_date_from.endDate) {
        qb.andWhere('task.endDate <= :endDateFromEnd', {
          endDateFromEnd: `${end_date_from.endDate} 23:59:59`,
        });
      }
    }

    if (endDate) {
      if (endDate.startDate) {
        qb.andWhere('task.endDate >= :endDateStart', {
          endDateStart: `${endDate.startDate} 00:00:00`,
        });
      }
      if (endDate.endDate) {
        qb.andWhere('task.endDate <= :endDateEnd', {
          endDateEnd: `${endDate.endDate} 23:59:59`,
        });
      }
    }

    if (startDate) {
      if (startDate.startDate) {
        qb.andWhere('task.startDate >= :startDateStart', {
          startDateStart: `${startDate.startDate} 00:00:00`,
        });
      }
      if (startDate.endDate) {
        qb.andWhere('task.startDate <= :startDateEnd', {
          startDateEnd: `${startDate.endDate} 23:59:59`,
        });
      }
    }

    if (supporter) {
      qb.innerJoin(
        'task_users',
        'tu_supporter',
        "tu_supporter.task_id = task.id AND tu_supporter.role = 'supporter' AND tu_supporter.process_id = :supporterProcessId",
        { supporterProcessId: supporter },
      );
    }

    if (assigner) {
      qb.innerJoin(
        'task_users',
        'tu_assigner',
        "tu_assigner.task_id = task.id AND tu_assigner.role = 'assigner' AND tu_assigner.process_id = :assignerProcessId",
        { assignerProcessId: assigner },
      );
    }

    if (status) {
      if (Array.isArray(status)) {
        qb.andWhere('task.status IN (:...statuses)', { statuses: status });
      } else {
        qb.andWhere('task.status = :status', { status });
      }
    } else {
      qb.andWhere('task.status = 1');
    }

    if (typeTask) {
      qb.andWhere('task.typeTask = :typeTask', { typeTask });
    } else {
      qb.andWhere('task.typeTask = :typeTask', {
        typeTask: TASK_TYPE.FORM_MEETING,
      });
    }

    if (userId) {
      if (isViewerFilter) {
        qb.andWhere(new Brackets((viewerPerm) => {
          viewerPerm.where(
            `EXISTS (
              SELECT 1
              FROM task_users tu_viewer
              WHERE tu_viewer.task_id = task.id
                AND LOWER(tu_viewer.process_id) = LOWER(:viewerOnlyUserId)
                AND tu_viewer.role = 'viewer'
            )`,
            { viewerOnlyUserId: userId },
          );
          viewerPerm.andWhere(
            `NOT EXISTS (
              SELECT 1
              FROM task_users tu_a
              INNER JOIN user_group_users ugu_a ON ugu_a.user_id = tu_a.process_id
              INNER JOIN group_users gu_a ON gu_a.id = ugu_a.group_user_id
              WHERE tu_a.task_id = task.id
                AND tu_a.role = 'assigner'
                AND gu_a.code IN (:...viewerOnlyLeaderCodes)
            )`,
            { viewerOnlyLeaderCodes: leaderGroupCodes },
          );
          if (isManager && managedUnitIds && managedUnitIds.length > 0) {
            viewerPerm.orWhere(
              new Brackets((mgr) => {
                mgr
                  .where(
                    `EXISTS (
                      SELECT 1
                      FROM task_users tu_assigner
                      INNER JOIN user_group_users ugu ON ugu.user_id = tu_assigner.process_id
                      INNER JOIN group_users gu ON gu.id = ugu.group_user_id
                      WHERE tu_assigner.task_id = task.id
                        AND tu_assigner.role = 'assigner'
                        AND gu.code IN (:...leaderGroupCodes)
                        AND NOT EXISTS (
                          SELECT 1
                          FROM user_group_users ugu_mgr
                          INNER JOIN group_users gu_mgr ON gu_mgr.id = ugu_mgr.group_user_id
                          WHERE ugu_mgr.user_id = tu_assigner.process_id
                            AND gu_mgr.code IN (:...managerGroupCodes)
                        )
                    )`,
                    {
                      leaderGroupCodes: leaderGroupCodes,
                      managerGroupCodes: managerGroupCodes,
                    },
                  )
                  .andWhere(
                    `EXISTS (
                      SELECT 1
                      FROM task_users tu_director
                      INNER JOIN users u_director ON u_director.id = tu_director.process_id
                      INNER JOIN user_group_users ugu_dir ON ugu_dir.user_id = tu_director.process_id
                      INNER JOIN group_users gu_dir ON gu_dir.id = ugu_dir.group_user_id
                      WHERE tu_director.task_id = task.id
                        AND tu_director.role = 'director'
                        AND u_director.parent IN (:...managedUnitIds)
                        AND gu_dir.code = :viewerDirectorCanboCode
                        AND NOT EXISTS (
                          SELECT 1
                          FROM user_group_users ugu_dir_mgr
                          INNER JOIN group_users gu_dir_mgr ON gu_dir_mgr.id = ugu_dir_mgr.group_user_id
                          WHERE ugu_dir_mgr.user_id = tu_director.process_id
                            AND gu_dir_mgr.code IN (:...managerGroupCodes)
                        )
                    )`,
                    {
                      managedUnitIds,
                      managerGroupCodes: managerGroupCodes,
                      viewerDirectorCanboCode: GROUP_CODES.CANBO,
                    },
                  );
              }),
            );
          }
        }));
      } else if ((myAssign === true || myAssign === 'true') || 
                 (myDirector === true || myDirector === 'true') || 
                 (mySupporter === true || mySupporter === 'true')) {
        const roles: string[] = [];
        if (myAssign === true || myAssign === 'true') roles.push('assigner');
        if (myDirector === true || myDirector === 'true') roles.push('director');
        if (mySupporter === true || mySupporter === 'true') roles.push('supporter');
        
        qb.andWhere(
          "EXISTS (SELECT 1 FROM task_users tu_myRoles WHERE tu_myRoles.task_id = task.id AND LOWER(tu_myRoles.process_id) = LOWER(:myRolesUserId) AND tu_myRoles.role IN (:...myRoles))",
          { myRolesUserId: userId, myRoles: roles }
        );
      } else if (myJob === true || myJob === 'true') {
        qb.andWhere(
          "EXISTS (SELECT 1 FROM task_users tu_myJob WHERE tu_myJob.task_id = task.id AND LOWER(tu_myJob.process_id) = LOWER(:myJobUserId) AND tu_myJob.role IN ('director', 'supporter'))",
          { myJobUserId: userId },
        );
      } else {
        const userTaskIds = await this.getTaskIdsByUserRole(
          userId,
          unitId,
          isClerk,
          delegatedConfigs,
          typeTask ?? TASK_TYPE.FORM_MEETING,
          status ?? 1,
        );
        // console.log(`[PERF] findAllMeetingTasks - getTaskIdsByUserRole took ${Date.now() - tGetTaskIdsStart}ms (found ${userTaskIds.length} IDs)`);

        qb.andWhere(
          new Brackets((qb2) => {
            qb2.where('task.createdById = :userId', { userId });

            if (userTaskIds.length > 0) {
              if (userTaskIds.length > 1800) {
                qb2.orWhere(
                  `task.id IN (
                    SELECT CAST(value AS BIGINT)
                    FROM OPENJSON(:userTaskIdsJson)
                  )`,
                  { userTaskIdsJson: JSON.stringify(userTaskIds) },
                );
              } else {
                qb2.orWhere('task.id IN (:...userTaskIds)', { userTaskIds });
              }
            }

            if (isManager && managedUnitIds && managedUnitIds.length > 0) {
              qb2.orWhere(new Brackets(vis => {
                vis.where(new Brackets(inner => {
                  inner.where('task.isConfidential = :isConfidentialFalse', { isConfidentialFalse: false })
                    .orWhere('task.isConfidential IS NULL');
                }))
                  .andWhere(`EXISTS (
                      SELECT 1 FROM task_users tu_assignee
                      INNER JOIN users u_assignee ON u_assignee.id = tu_assignee.process_id
                      WHERE tu_assignee.task_id = task.id
                      AND tu_assignee.role IN ('director', 'supporter')
                      AND u_assignee.parent IN (:...managedUnitIds)
                   )`, { managedUnitIds });
              }));
            }
          }),
        );
      }
    }

    if (tab) {
      switch (tab) {
        case TaskTab.REPEAT:
          qb.andWhere('task.repetitiveTask = :repeat', { repeat: 'co' });
          break;
        case TaskTab.DOCUMENT:
          qb.andWhere('task.bpmnId IS NOT NULL');
          break;
        case TaskTab.MEETING:
          qb.andWhere('task.parent IS NOT NULL');
          break;
        case TaskTab.GENERAL:
        default:
          qb.andWhere('task.repetitiveTask = :repeat', { repeat: 'khong' })
            .andWhere('task.bpmnId IS NULL')
            .andWhere('task.parent IS NULL');
          break;
      }
    }

    /* ================= SORT DB ================= */
    const SORTABLE_FIELDS = [
      'name',
      'progress',
      'assigner',
      'director',
      'supporter',
      'viewer',
      'processStatus',
      'createdAt',
      'updatedAt',
      'startDate',
      'endDate',
    ];
    const SORT_FIELD_MAP: Record<string, string> = {
      name: 'task.name',
      progress: 'task.progress',
      processStatus: 'task.processStatus',
      createdAt: 'task.createdAt',
      updatedAt: 'task.updatedAt',
      startDate: 'task.startDate',
      endDate: 'task.endDate',
    };

    if (sort && typeof sort === 'object') {
      let hasValidSort = false;

      Object.entries(sort).forEach(([field, direction]) => {
        if (!SORTABLE_FIELDS.includes(field)) return;

        if (field === 'progress') {
          qb.addSelect('CAST(task.progress AS INT)', 'progress_num');
          qb.addOrderBy(
            'progress_num',
            Number(direction) === -1 ? 'DESC' : 'ASC',
          );
          hasValidSort = true;
          return;
        }

        const column = SORT_FIELD_MAP[field];
        if (!column) return;

        qb.addOrderBy(column, Number(direction) === -1 ? 'DESC' : 'ASC');
        hasValidSort = true;
      });

      if (!hasValidSort) {
        qb.addOrderBy('task.createdAt', 'DESC');
      }
    } else {
      qb.addOrderBy('task.createdAt', 'DESC');
    }

    /* ================= QUERY TARGET IDs ================= */
    const tQueryTargetIdsStart = Date.now();
    const idRows = await qb
      .select('task.id', 'id')
      .distinct(true)
      .orderBy('task.id', 'DESC')
      .getRawMany();

    const matchedIds = Array.from(
      new Set(
        idRows
          .map((r) => Number(r.id))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    );

    const isKanban = queryParams.viewMode === 'kanban';
   const disableHierarchy = isKanban;

    let rootIds = [...matchedIds];
    if (matchedIds.length > 0 && !disableHierarchy) {
      const rootQuery = `
        WITH RecursiveAncestors AS (
          SELECT id, parent
          FROM task
          WHERE id IN (${matchedIds.join(',')})
          UNION ALL
          SELECT t.id, t.parent
          FROM task t
          INNER JOIN RecursiveAncestors ra ON ra.parent = t.id
          WHERE t.status = 1
        )
        SELECT DISTINCT id FROM RecursiveAncestors WHERE parent IS NULL OR parent = 0
      `;
      const rootRows = await this.dataSource.query(rootQuery);
      rootIds = rootRows.map((r: any) => Number(r.id)).filter((id: number) => id > 0);
      rootIds.sort((a, b) => b - a);
    }

    const uniqueSortedIds = Array.from(new Set(rootIds));
    const totalCountVal = uniqueSortedIds.length;

    const offset = (pageNum - 1) * limitNum;
    let taskIds = uniqueSortedIds.slice(offset, offset + limitNum);

    if (taskIds.length > 0 && !disableHierarchy) {
      const tGetRelatedStart = Date.now();
      taskIds = await this.getAllRelatedTaskIds(taskIds);
    }

    if (!taskIds.length) {
      return { data: [], totalCount: 0 };
    }

    /* ================= QUERY FULL DATA ================= */
    const dataQuery = this.createQueryBuilder('task')
      .leftJoin('task.taskUsers', 'taskUsers')
      .leftJoin('taskUsers.user', 'user')
      .leftJoin('user.parent', 'userParent')
      .leftJoin('taskUsers.organizationUnit', 'org')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.updatedBy', 'updatedBy')
      .andWhere('task.typeTask = :meetingTypeTask', { meetingTypeTask: TASK_TYPE.FORM_MEETING })
      .select([
        'task.id',
        'task.name',
        'task.code',
        'task.note',
        'task.meetingId',
        'task.meetingConclusionId',
        'task.typeTaskMeeting',
        'task.progress',
        'task.priority',
        'task.processStatus',
        'task.dependentTaskId',
        'task.startDate',
        'task.endDate',
        'task.createdAt',
        'task.typeTask',
        'task.parent',
        'createdBy.id',
        'createdBy.name',
      ])
      .addSelect([
        'taskUsers.id',
        'taskUsers.role',
        'taskUsers.type',
        'taskUsers.processId',
        'taskUsers.processName',
        'user.id',
        'user.name',
        'org.id',
        'org.name',
      ]);

    // Safety guard against 2100 parameter limit on SQL Server
    if (taskIds.length > 1800) {
      dataQuery.andWhere(
        `task.id IN (
          SELECT CAST(value AS BIGINT)
          FROM OPENJSON(:taskIdsJson)
        )`,
        { taskIdsJson: JSON.stringify(taskIds) },
      );
    } else {
      dataQuery.andWhere('task.id IN (:...taskIds)', { taskIds });
    }

    if (userId && isViewerFilter) {
      dataQuery.andWhere(new Brackets((viewerPerm) => {
        viewerPerm.where(
          `EXISTS (
            SELECT 1
            FROM task_users tu_viewer
            WHERE tu_viewer.task_id = task.id
              AND LOWER(tu_viewer.process_id) = LOWER(:dqViewerUserId)
              AND tu_viewer.role = 'viewer'
          )`,
          { dqViewerUserId: userId },
        );
        viewerPerm.andWhere(
          `NOT EXISTS (
            SELECT 1
            FROM task_users tu_a
            INNER JOIN user_group_users ugu_a ON ugu_a.user_id = tu_a.process_id
            INNER JOIN group_users gu_a ON gu_a.id = ugu_a.group_user_id
            WHERE tu_a.task_id = task.id
              AND tu_a.role = 'assigner'
              AND gu_a.code IN (:...dqViewerOnlyLeaderCodes)
          )`,
          { dqViewerOnlyLeaderCodes: leaderGroupCodes },
        );
        if (isManager && managedUnitIds && managedUnitIds.length > 0) {
          viewerPerm.orWhere(new Brackets((mgr) => {
            mgr.where(
              `EXISTS (
                SELECT 1
                FROM task_users tu_assigner
                INNER JOIN user_group_users ugu ON ugu.user_id = tu_assigner.process_id
                INNER JOIN group_users gu ON gu.id = ugu.group_user_id
                WHERE tu_assigner.task_id = task.id
                  AND tu_assigner.role = 'assigner'
                  AND gu.code IN (:...dqLeaderGroupCodes)
                  AND NOT EXISTS (
                    SELECT 1
                    FROM user_group_users ugu_mgr
                    INNER JOIN group_users gu_mgr ON gu_mgr.id = ugu_mgr.group_user_id
                    WHERE ugu_mgr.user_id = tu_assigner.process_id
                      AND gu_mgr.code IN (:...dqManagerGroupCodes)
                  )
              )`,
              {
                dqLeaderGroupCodes: leaderGroupCodes,
                dqManagerGroupCodes: managerGroupCodes,
              },
            ).andWhere(
              `EXISTS (
                SELECT 1
                FROM task_users tu_director
                INNER JOIN users u_director ON u_director.id = tu_director.process_id
                INNER JOIN user_group_users ugu_dir ON ugu_dir.user_id = tu_director.process_id
                INNER JOIN group_users gu_dir ON gu_dir.id = ugu_dir.group_user_id
                WHERE tu_director.task_id = task.id
                  AND tu_director.role = 'director'
                  AND u_director.parent IN (:...dqManagedUnitIds)
                  AND gu_dir.code = :dqViewerDirectorCanboCode
                  AND NOT EXISTS (
                    SELECT 1
                    FROM user_group_users ugu_dir_mgr
                    INNER JOIN group_users gu_dir_mgr ON gu_dir_mgr.id = ugu_dir_mgr.group_user_id
                    WHERE ugu_dir_mgr.user_id = tu_director.process_id
                      AND gu_dir_mgr.code IN (:...dqManagerGroupCodes)
                  )
              )`,
              {
                dqManagedUnitIds: managedUnitIds,
                dqManagerGroupCodes: managerGroupCodes,
                dqViewerDirectorCanboCode: GROUP_CODES.CANBO,
              },
            );
          }));
        }
      }));
    }

    dataQuery.orderBy('task.createdAt', 'DESC');

    const tDataQueryStart = Date.now();
    const data = await dataQuery.getMany();
    // // console.log(`[PERF] findAllMeetingTasks - dataQuery.getMany() took ${Date.now() - tDataQueryStart}ms`);

    return { data, totalCount: totalCountVal };
  }
}


