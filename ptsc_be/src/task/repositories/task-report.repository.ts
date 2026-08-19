import { Injectable } from '@nestjs/common';
import { DataSource, Repository, SelectQueryBuilder, Brackets } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { TaskEntity } from '../entity/task.entity';
import { TaskRecurringConfigEntity } from '../entity/task-recurring-config.entity';
import * as moment from 'moment';

@Injectable()
export class TaskReportRepository extends Repository<TaskEntity> {
  constructor(
    @InjectDataSource('mssqlConnection')
    private readonly dataSource: DataSource,
  ) {
    super(TaskEntity, dataSource.createEntityManager());
  }

  /**
   * Truy vấn danh sách công việc cá nhân cho Báo cáo 4.1
   */
  async findPersonalTasks(filters: any) {
    const { userId, deptId, fromDate, toDate, status, priority, page = 1, limit = 25, sort } = filters;

    const qb = this.createQueryBuilder('task')
      .leftJoinAndSelect('task.taskUsers', 'taskUsers')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('taskUsers.user', 'user')
      .where('task.status = 1')
      .andWhere("task.typeTask != 'project'");

    if (userId) {
      qb.andWhere(qb => {
        const subQuery = qb.subQuery()
          .select('tu.taskId')
          .from('task_users', 'tu')
          .where('tu.processId = :userId')
          .getQuery();
        return 'task.id IN ' + subQuery;
      }).setParameter('userId', userId);
    } else if (deptId) {
      qb.andWhere(qb => {
        const subQuery = qb.subQuery()
          .select('tu.taskId')
          .from('task_users', 'tu')
          .innerJoin('users', 'u', 'tu.processId = u.id')
          .where('u.parent = :deptId')
          .getQuery();

        return 'task.id IN ' + subQuery;
      }).setParameter('deptId', deptId);
    }

    // Lọc theo khoảng thời gian: 
    // - fromDate: lọc theo Ngày tạo (created_at)
    // - toDate: lọc theo Hạn hoàn thành (end_date)
    if (fromDate) {
      qb.andWhere('CAST(task.created_at AS DATE) >= CAST(:fromDate AS DATE)', { fromDate });
    }
    if (toDate) {
      qb.andWhere('CAST(COALESCE(task.end_date, task.created_at) AS DATE) <= CAST(:toDate AS DATE)', { toDate });
    }

    if (filters.overdue === true || filters.overdue === 'true' || filters.overdue === 1 || filters.overdue === '1') {
      qb.andWhere('task.endDate IS NOT NULL AND task.endDate < GETDATE() AND task.processStatus != :completedStatusOverdue', { completedStatusOverdue: '4' });
    }

    if (status) {
      const statusArr = Array.isArray(status) ? status.map(s => String(s)) : [String(status)];
      const hasStatus9 = statusArr.includes('9');
      const normalStatuses = statusArr.filter(s => s !== '9');

      if (hasStatus9 && normalStatuses.length > 0) {
        qb.andWhere(
          '(task.processStatus IN (:...normalStatuses) OR (task.endDate IS NOT NULL AND task.endDate < GETDATE() AND task.processStatus != \'4\') OR task.processStatus = \'9\')',
          { normalStatuses }
        );
      } else if (hasStatus9) {
        qb.andWhere(
          '(task.endDate IS NOT NULL AND task.endDate < GETDATE() AND task.processStatus != \'4\' OR task.processStatus = \'9\')'
        );
      } else if (normalStatuses.length > 0) {
        qb.andWhere('task.processStatus IN (:...statuses)', { statuses: normalStatuses });
      }
    }

    if (priority) {
      qb.andWhere('task.priority = :priority', { priority });
    }

    if (filters.assignerId) {
      const assignerIds = Array.isArray(filters.assignerId) ? filters.assignerId : [filters.assignerId];
      if (assignerIds.length > 0) {
        qb.andWhere(qb => {
          const subQuery = qb.subQuery()
            .select('tu.taskId')
            .from('task_users', 'tu')
            .where("tu.role = 'assigner'")
            .andWhere('tu.processId IN (:...assignerIds)')
            .getQuery();
          return 'task.id IN ' + subQuery;
        }).setParameter('assignerIds', assignerIds);
      }
    }

    if (filters.directorId) {
      let rawDirectorIds = filters.directorId;
      if (typeof rawDirectorIds === 'string') {
        try {
          rawDirectorIds = JSON.parse(rawDirectorIds);
        } catch (e) {
          // keep as string
        }
      }
      const rawArr = Array.isArray(rawDirectorIds)
        ? rawDirectorIds
        : typeof rawDirectorIds === 'object' && rawDirectorIds !== null
          ? Object.values(rawDirectorIds)
          : [rawDirectorIds];

      const directorIds = rawArr
        .map(id => (typeof id === 'object' && id !== null ? (id.id || id.value || String(id)) : String(id)))
        .filter(id => id !== undefined && id !== null && String(id).trim() !== '' && String(id) !== '[object Object]');

      if (directorIds.length > 0) {
        qb.andWhere(qb => {
          const subQuery = qb.subQuery()
            .select('tu.taskId')
            .from('task_users', 'tu')
            .where("tu.role = 'director'")
            .andWhere('tu.processId IN (:...directorIds)')
            .getQuery();
          return 'task.id IN ' + subQuery;
        }).setParameter('directorIds', directorIds);
      }
    }

    // Xử lý sort
    if (sort && Object.keys(sort).length > 0) {
      const fieldMapping = {
        tieuDe: 'task.name',
        ngayTao: 'task.createdAt',
        hanHoanThanh: 'task.endDate',
        trangThai: 'task.processStatus',
        uuTien: 'task.priority',
        tienDo: 'task.progress',
      };
      Object.entries(sort).forEach(([field, direction]) => {
        const dbField = fieldMapping[field];
        if (dbField) {
          qb.addOrderBy(dbField, direction === 1 ? 'ASC' : 'DESC');
        }
      });
    } else {
      qb.orderBy('task.createdAt', 'DESC');
    }

    return qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  /**
   * Thống kê hiệu suất theo tháng cho Báo cáo 4.2
   */
  async countPerformanceStats(filters: any) {
    const { user, deptId, month, year, source, directorId, assignerId, sort, limit = 10, fromDate, toDate } = filters;
    const userId = null;

    // Build ORDER BY clause
    let orderBy = 'Total DESC';
    if (sort && Object.keys(sort).length > 0) {
      const fieldMapping = {
        tongCV: 'Total',
        hoanThanh: 'Completed',
        dungHan: 'OnTime',
        treHan: 'Overdue',
        dangLam: 'InProgress',
      };
      const sortParts = Object.entries(sort)
        .map(([field, direction]) => {
          const dbField = fieldMapping[field];
          if (!dbField) return null;
          const dir = direction === 1 ? 'ASC' : 'DESC';
          return dbField + ' ' + dir;
        })
        .filter(Boolean);
      if (sortParts.length > 0) {
        orderBy = sortParts.join(', ');
      }
    }

    const query = `
      SELECT TOP(${limit})
        tu.process_name as PerformerName,
        tu.process_name as DirectorNames,
        COUNT(DISTINCT t.id) as Total,
        COUNT(DISTINCT CASE WHEN t.process_status = '4' THEN t.id END) as Completed,
        COUNT(DISTINCT CASE WHEN t.process_status = '4' AND t.update_at <= t.end_date THEN t.id END) as OnTime,
        COUNT(DISTINCT CASE WHEN t.process_status = '4' AND t.update_at > t.end_date THEN t.id END) as Overdue,
        COUNT(DISTINCT CASE WHEN t.process_status = '2' THEN t.id END) as InProgress
      FROM task t
      INNER JOIN task_users tu ON t.id = tu.task_id AND LOWER(tu.role) = 'director'
      INNER JOIN users u ON tu.process_id = u.id
      WHERE t.status = 1 AND t.type_task != 'project'
      ${userId ? "AND tu.process_id = @0" : ""}
      ${deptId ? "AND u.parent = @5" : ""}
      ${month ? "AND MONTH(t.created_at) = @1" : ""}
      ${year ? "AND YEAR(t.created_at) = @2" : ""}
      ${source ? "AND t.type_task = @3" : ""}
      ${directorId ? "AND t.id IN (SELECT task_id FROM task_users WHERE LOWER(role) = 'director' AND process_id = @4)" : ""}
      ${assignerId ? "AND t.id IN (SELECT task_id FROM task_users WHERE LOWER(role) = 'assigner' AND process_id IN (SELECT value FROM STRING_SPLIT(@8, ',')))" : ""}
      ${fromDate ? "AND t.created_at >= @6" : ""}
      ${toDate ? "AND t.created_at <= @7" : ""}
      GROUP BY tu.process_id, tu.process_name
      ORDER BY ${orderBy}
    `;

    const params = [
      userId ?? null, 
      month ?? null, 
      year ?? null, 
      source ?? null, 
      Array.isArray(directorId) ? directorId[0] ?? null : directorId ?? null, 
      deptId ?? null,
      fromDate ? new Date(fromDate) : null,
      toDate ? new Date(toDate + 'T23:59:59.999Z') : null,
      Array.isArray(assignerId) ? assignerId.join(',') : assignerId ?? null
    ];
    return this.dataSource.query(query, params);
  }

  /**
   * Truy vấn công việc quá hạn cho Báo cáo 4.3
   */
  async findOverdueTasks(filters: any) {
    const { userId, deptId, source, page = 1, limit = 25, overdueDaysFrom, sort } = filters;
    const now = new Date();

    const qb = this.createQueryBuilder('task')
      .leftJoinAndSelect('task.taskUsers', 'taskUsers')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .where('task.endDate < :now', { now })
      .andWhere("task.processStatus != '4'")
      .andWhere('task.status = 1')
      .andWhere("task.typeTask != 'project'");

    if (userId) {
      qb.andWhere(qb => {
        const subQuery = qb.subQuery()
          .select('tu.taskId')
          .from('task_users', 'tu')
          .where('tu.processId = :userId')
          .getQuery();
        return 'task.id IN ' + subQuery;
      }).setParameter('userId', userId);
    } else if (deptId) {
      qb.andWhere(qb => {
        const subQuery = qb.subQuery()
          .select('tu.taskId')
          .from('task_users', 'tu')
          .innerJoin('users', 'u', 'tu.processId = u.id')
          .where('u.parent = :deptId')
          .getQuery();
        return 'task.id IN ' + subQuery;
      }).setParameter('deptId', deptId);
    }

    if (source) {
      qb.andWhere('task.typeTask = :source', { source });
    }

    if (filters.directorId) {
      const directorIds = Array.isArray(filters.directorId) ? filters.directorId : [filters.directorId];
      if (directorIds.length > 0) {
        qb.andWhere(qb => {
          const subQuery = qb.subQuery()
            .select('tu.taskId')
            .from('task_users', 'tu')
            .where("tu.role = 'director'")
            .andWhere('tu.processId IN (:...directorIds)')
            .getQuery();
          return 'task.id IN ' + subQuery;
        }).setParameter('directorIds', directorIds);
      }
    }

    if (filters.assignerId) {
      const assignerIds = Array.isArray(filters.assignerId) ? filters.assignerId : [filters.assignerId];
      if (assignerIds.length > 0) {
        qb.andWhere(qb => {
          const subQuery = qb.subQuery()
            .select('tu.taskId')
            .from('task_users', 'tu')
            .where("tu.role = 'assigner'")
            .andWhere('tu.processId IN (:...assignerIds)')
            .getQuery();
          return 'task.id IN ' + subQuery;
        }).setParameter('assignerIds', assignerIds);
      }
    }

    if (overdueDaysFrom !== undefined && overdueDaysFrom !== null) {
      const soNgayQuaNum = Number(overdueDaysFrom);
      if (soNgayQuaNum === 1) {
        qb.andWhere('DATEDIFF(day, task.endDate, :now) < 7');
      } else if (soNgayQuaNum === 5) {
        qb.andWhere('DATEDIFF(day, task.endDate, :now) < 30');
      } else if (soNgayQuaNum === 2) {
        qb.andWhere('DATEDIFF(day, task.endDate, :now) < 90');
      } else if (soNgayQuaNum === 3) {
        qb.andWhere('DATEDIFF(day, task.endDate, :now) < 365');
      } else if (soNgayQuaNum === 4) {
        qb.andWhere('DATEDIFF(day, task.endDate, :now) >= 365');
      }
    }

    // Xử lý sort
    if (sort && Object.keys(sort).length > 0) {
      const fieldMapping = {
        tieuDe: 'task.name',
        nguonGiao: 'createdBy.name',
        hanHT: 'task.endDate',
        soNgayQua: 'DATEDIFF(day, task.endDate, GETDATE())',
        tienDo: 'task.progress',
      };
      Object.entries(sort).forEach(([field, direction]) => {
        const dbField = fieldMapping[field];
        if (dbField) {
          qb.addOrderBy(dbField, direction === 1 ? 'ASC' : 'DESC');
        }
      });
    } else {
      qb.orderBy('task.createdAt', 'DESC');
    }

    return qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  /**
   * Lấy lý do chậm từ document_comments
   */
  async findSlowReasons(taskIds: number[]) {
    if (!taskIds.length) return [];

    const query = `
      SELECT document_id, content
      FROM (
         SELECT document_id, content, ROW_NUMBER() OVER (PARTITION BY document_id ORDER BY created_at DESC) as rn
         FROM document_comments
         WHERE type = 'slowReason' AND document_id IN (${taskIds.map(id => `'${id}'`).join(',')})
      ) t
      WHERE rn = 1
    `;
    return this.dataSource.query(query);
  }

  /**
   * Truy vấn cấu hình lặp lại cho Báo cáo 4.4
   */
  async findRecurringConfigs(filters: any) {
    const { userId, deptId, cycleType, status, directorId, page = 1, limit = 25, sort } = filters;

    const qb = this.dataSource.getRepository(TaskRecurringConfigEntity).createQueryBuilder('config')
      .leftJoinAndSelect('config.createdBy', 'createdBy');

    if (directorId) {
      const dIds = Array.isArray(directorId) ? directorId : [directorId];
      qb.where(new Brackets(dqb => {
        dIds.forEach((id, idx) => {
          dqb.orWhere(`config.taskData LIKE :pattern${idx}`, { [`pattern${idx}`]: `%"processId":"${id}"%` });
        });
        dqb.orWhere('config.createdById IN (:...dIds)', { dIds });
      }));
    } else if (userId) {
      // Default to logged-in user context
      qb.where(new Brackets(innerQb => {
        innerQb.where('config.createdById = :userId', { userId })
          .orWhere('config.taskData LIKE :userPattern', { userPattern: `%${userId}%` });
      }));
    } else if (deptId) {
      // Filter by department
      qb.innerJoin('users', 'u', 'config.createdById = u.id')
        .where('u.parent = :deptId', { deptId });
    }

    if (filters.assignerId) {
      const assignerIds = Array.isArray(filters.assignerId) ? filters.assignerId : [filters.assignerId];
      if (assignerIds.length > 0) {
        qb.andWhere(new Brackets(dqb => {
          assignerIds.forEach((id, idx) => {
            dqb.orWhere(`config.taskData LIKE :aPattern${idx}`, { [`aPattern${idx}`]: `%"processId":"${id}"%` });
          });
          dqb.orWhere('config.createdById IN (:...assignerIds)', { assignerIds });
        }));
      }
    }

    if (cycleType) {
      if (Array.isArray(cycleType) && cycleType.length > 0) {
        qb.andWhere('config.repetitiveTask IN (:...cycleTypes)', { cycleTypes: cycleType });
      } else if (!Array.isArray(cycleType)) {
        qb.andWhere('config.repetitiveTask = :cycleType', { cycleType });
      }
    }
    if (status !== undefined && status !== null && status !== '') {
      if (Array.isArray(status) && status.length > 0) {
        const statuses = status.map(s => Number(s)).filter(s => !isNaN(s));
        if (statuses.length > 0) {
          qb.andWhere('config.status IN (:...statuses)', { statuses });
        }
      } else if (!Array.isArray(status)) {
        const sNum = Number(status);
        if (!isNaN(sNum)) {
          qb.andWhere('config.status = :status', { status: sNum });
        }
      }
    }

    // Xử lý sort
    if (sort && Object.keys(sort).length > 0) {
      const fieldMapping = {
        tieuDe: 'config.name',
        chuKy: 'config.repetitiveTask',
        lanThucHienGanNhat: 'config.lastExecutedAt',
        trangThai: 'config.status',
      };
      Object.entries(sort).forEach(([field, direction]) => {
        const dbField = fieldMapping[field];
        if (dbField) {
          qb.addOrderBy(dbField, direction === 1 ? 'ASC' : 'DESC');
        }
      });
    } else {
      qb.orderBy('config.createdAt', 'DESC');
    }

    return qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  /**
   * Thống kê khối lượng công việc theo nguồn (Báo cáo 4.5) - Dạng danh sách công việc cha
   */
  async findWorkloadBySourceTasks(filters: any) {
    const { userId, deptId, fromDate, toDate, directorId, source, page = 1, limit = 25, sort } = filters;

    // Build ORDER BY clause
    let orderBy = 'Total DESC, t.type_task ASC';
    if (sort && Object.keys(sort).length > 0) {
      const fieldMapping = {
        nguonGiaoViec: 't.type_task',
        soCVDuocGiao: 'Total',
        hoanThanh: 'Completed',
        dungHan: 'OnTime',
        treHan: 'Overdue',
        tgXuLyTB: 'AvgProcessingTime',
      };
      const sortParts = Object.entries(sort)
        .map(([field, direction]) => {
          const dbField = fieldMapping[field];
          return dbField ? `${dbField} ${direction === 1 ? 'ASC' : 'DESC'}` : null;
        })
        .filter(Boolean);
      if (sortParts.length > 0) {
        orderBy = sortParts.join(', ');
      }
    }

    // Use a CTE or subqueries to get subtask stats per parent
    const query = `
      SELECT 
          t.type_task as Source,
          d.DirectorNames,
          COUNT(t.id) as Total,
          SUM(CASE WHEN t.process_status = '4' THEN 1 ELSE 0 END) as Completed,
          SUM(CASE WHEN t.process_status = '4' AND t.update_at <= t.end_date THEN 1 ELSE 0 END) as OnTime,
          SUM(CASE WHEN t.process_status = '4' AND t.update_at > t.end_date THEN 1 ELSE 0 END) as Overdue,
          AVG(CASE WHEN t.process_status = '4' THEN CAST(DATEDIFF(HOUR, t.created_at, t.update_at) AS FLOAT)/24.0 ELSE NULL END) as AvgProcessingTime,
          COUNT(*) OVER() as TotalCount
      FROM task t
      LEFT JOIN (
          SELECT tu.task_id, STRING_AGG(CAST(tu.process_name AS NVARCHAR(MAX)), ', ') as DirectorNames
          FROM task_users tu
          WHERE LOWER(tu.role) = 'director'
          GROUP BY tu.task_id
      ) d ON t.id = d.task_id
      WHERE t.status = 1 AND t.parent IS NULL
        ${source ? "AND t.type_task IN (SELECT value FROM STRING_SPLIT(@0, ','))" : ""}
        ${directorId ? "AND t.id IN (SELECT task_id FROM task_users WHERE LOWER(role) = 'director' AND process_id IN (SELECT value FROM STRING_SPLIT(@1, ',')))" : ""}
        ${deptId ? "AND t.id IN (SELECT tu.task_id FROM task_users tu INNER JOIN users u ON tu.process_id = u.id WHERE u.parent = @2)" : ""}
        ${fromDate ? "AND t.created_at <= @4 AND (t.end_date IS NULL OR t.end_date >= @3)" : ""}
        ${toDate && !fromDate ? "AND t.created_at <= @4" : ""}
        ${fromDate && !toDate ? "AND t.created_at <= GETDATE() AND (t.end_date IS NULL OR t.end_date >= @3)" : ""}
      GROUP BY t.type_task, d.DirectorNames
      ORDER BY ${orderBy}
      OFFSET @5 ROWS FETCH NEXT @6 ROWS ONLY
    `;

    // Parsing inputs to CSV for STRING_SPLIT
    const sourceStr = Array.isArray(source) ? source.join(',') : source;
    const directorStr = Array.isArray(directorId) ? directorId.join(',') : (directorId || null);

    const fDate = fromDate ? moment(fromDate).startOf('day').toDate() : null;
    const tDate = toDate ? moment(toDate).endOf('day').toDate() : (fromDate ? moment().endOf('day').toDate() : null);

    const p = Number(page) || 1;
    const l = Number(limit) || 25;

    const params = [
      sourceStr ?? null,
      directorStr ?? null,
      deptId ?? null,
      fDate,
      tDate,
      (p - 1) * l,
      l
    ];

    const rows = await this.dataSource.query(query, params);
    const total = rows.length > 0 ? rows[0].TotalCount : 0;
    return { data: rows, total };
  }

  /**
   * Trích xuất titles từ CRM sources (DOUUTIEN, CDCV, ...)
   */
  async mapCrmTitlesBatch(
    tasks: TaskEntity[],
    codes: string[] = ['DOUUTIEN'],
  ): Promise<Record<number, Record<string, string>>> {
    if (!tasks.length) return {};

    const mappingConfigs = [
      { code: 'DOUUTIEN', keyInTask: 'priority', keyInResult: 'priority' },
    ].filter(cfg => codes.includes(cfg.code));

    // 1. Thu thập unique values theo từng code
    const uniqueValuesByCode: Record<string, Set<string>> = {};
    mappingConfigs.forEach(cfg => uniqueValuesByCode[cfg.code] = new Set());

    tasks.forEach(task => {
      mappingConfigs.forEach(cfg => {
        const val = task[cfg.keyInTask];
        if (val !== null && val !== undefined && String(val).trim() !== '') {
          uniqueValuesByCode[cfg.code].add(String(val));
        }
      });
    });

    // 2. Query mỗi code 1 lần bằng IN
    const allConditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 0;

    mappingConfigs.forEach(cfg => {
      const values = Array.from(uniqueValuesByCode[cfg.code]);
      if (values.length > 0) {
        allConditions.push(`(cs.code = @${paramIdx} AND csd.value IN (${values.map((_, i) => `@${paramIdx + 1 + i}`).join(',')}))`);
        params.push(cfg.code, ...values);
        paramIdx += 1 + values.length;
      }
    });

    if (!allConditions.length) return {};

    const query = `
      SELECT cs.code, csd.value, csd.title
      FROM crm_sources cs
      JOIN crm_source_data csd ON cs.id = csd.source_id
      WHERE ${allConditions.join(' OR ')}
    `;

    const rows = await this.dataSource.query(query, params);

    // 3. Xây dựng Map tra cứu nhanh: code -> value -> title
    const titleLookup: Record<string, Record<string, string>> = {};
    rows.forEach((row: any) => {
      if (!titleLookup[row.code]) titleLookup[row.code] = {};
      titleLookup[row.code][row.value] = row.title;
    });

    // 4. Map ngược lại cho từng task
    const result: Record<number, Record<string, string>> = {};
    tasks.forEach(task => {
      const taskResult: Record<string, string> = {};
      mappingConfigs.forEach(cfg => {
        const val = task[cfg.keyInTask];
        if (val !== null && val !== undefined) {
          const title = titleLookup[cfg.code]?.[String(val)];
          if (title) {
            taskResult[cfg.keyInResult] = title;
          }
        }
      });
      result[task.id] = taskResult;
    });

    return result;
  }

  async getCRMTitleMap(code: string): Promise<Record<string, string>> {
    const query = `
      SELECT csd.value, csd.title
      FROM crm_sources cs
      JOIN crm_source_data csd ON cs.id = csd.source_id
      WHERE cs.code = @0
    `;
    const rows = await this.dataSource.query(query, [code]);
    const map = {};
    rows.forEach(row => {
      map[row.value] = row.title;
    });
    return map;
  }

  async resolveNames(ids: string[]): Promise<Record<string, string>> {
    if (!ids.length) return {};

    // Filter out duplicates and empty values
    const uniqueIds = Array.from(new Set(ids.filter(id => id && id.trim() !== '')));
    if (!uniqueIds.length) return {};

    // Query both tables. Since IDs are likely unique across system, we can merge.
    const userQuery = `SELECT id, name FROM users WHERE id IN (${uniqueIds.map((_, i) => `@${i}`).join(',')})`;
    const unitQuery = `SELECT id, name FROM organization_units WHERE id IN (${uniqueIds.map((_, i) => `@${i}`).join(',')})`;

    const [userRows, unitRows] = await Promise.all([
      this.dataSource.query(userQuery, uniqueIds),
      this.dataSource.query(unitQuery, uniqueIds),
    ]);

    const map = {};
    userRows.forEach(row => { map[row.id] = row.name; });
    unitRows.forEach(row => { map[row.id] = row.name; });
    return map;
  }

  /**
   * Truy vấn danh sách công việc theo chủ đề cho Báo cáo /task-report/topic-task-list
   */
  async findTopicTaskListTasks(filters: any) {
    const { userId, deptId, fromDate, toDate, status, topic, directorId, page = 1, limit = 25, sort } = filters;

    const qb = this.createQueryBuilder('task')
      .leftJoinAndSelect('task.taskUsers', 'taskUsers')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('taskUsers.user', 'user')
      .where('task.status = 1');

    if (userId) {
      qb.andWhere(qb => {
        const subQuery = qb.subQuery()
          .select('tu.taskId')
          .from('task_users', 'tu')
          .where('tu.processId = :userId')
          .getQuery();
        return 'task.id IN ' + subQuery;
      }).setParameter('userId', userId);
    } else if (deptId) {
      qb.andWhere(qb => {
        const subQuery = qb.subQuery()
          .select('tu.taskId')
          .from('task_users', 'tu')
          .innerJoin('users', 'u', 'tu.processId = u.id')
          .where('u.parent = :deptId')
          .getQuery();
        return 'task.id IN ' + subQuery;
      }).setParameter('deptId', deptId);
    }

    if (fromDate) {
      qb.andWhere('CAST(task.created_at AS DATE) >= CAST(:fromDate AS DATE)', { fromDate });
    }
    if (toDate) {
      qb.andWhere('CAST(COALESCE(task.end_date, task.created_at) AS DATE) <= CAST(:toDate AS DATE)', { toDate });
    }
    if (status) {
      if (Array.isArray(status)) {
        qb.andWhere('task.processStatus IN (:...status)', { status });
      } else {
        qb.andWhere('task.processStatus = :status', { status });
      }
    }
    if (topic) {
      if (Array.isArray(topic)) {
        qb.andWhere('task.topic IN (:...topic)', { topic });
      } else {
        qb.andWhere('task.topic LIKE :topic', { topic: `%${topic}%` });
      }
    }
    if (directorId) {
      qb.andWhere(qb => {
        const subQuery = qb.subQuery()
          .select('tu.taskId')
          .from('task_users', 'tu')
          .where("tu.role = 'director'");

        if (Array.isArray(directorId)) {
          subQuery.andWhere('tu.processId IN (:...directorId)');
        } else {
          subQuery.andWhere('tu.processId = :directorId');
        }

        return 'task.id IN ' + subQuery.getQuery();
      }).setParameter('directorId', directorId);
    }

    if (filters.assignerId) {
      const assignerIds = Array.isArray(filters.assignerId)
        ? filters.assignerId.filter(id => id !== undefined && id !== null && String(id).trim() !== '')
        : [filters.assignerId];

      if (assignerIds.length > 0) {
        qb.andWhere(qb => {
          const subQuery = qb.subQuery()
            .select('tu2.taskId')
            .from('task_users', 'tu2')
            .where("tu2.role = 'assigner'")
            .andWhere('tu2.processId IN (:...assignerIds)')
            .getQuery();
          return 'task.id IN ' + subQuery;
        }).setParameter('assignerIds', assignerIds);
      }
    }

    // Xử lý sort
    if (sort && Object.keys(sort).length > 0) {
      const fieldMapping = {
        tieuDe: 'task.name',
        chuDe: 'task.topic',
        ngayTao: 'task.createdAt',
        hanHoanThanh: 'task.endDate',
        trangThai: 'task.processStatus',
        tienDo: 'task.progress',
      };
      Object.entries(sort).forEach(([field, direction]) => {
        const dbField = fieldMapping[field];
        if (dbField) {
          qb.addOrderBy(dbField, direction === 1 ? 'ASC' : 'DESC');
        }
      });
    } else {
      qb.orderBy('task.name', 'ASC');
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }
  /**
   * Thống kê hiệu suất tổng hợp theo phòng ban (dành cho Lãnh đạo)
   * Điều kiện: công việc cha (parentId IS NULL) + người chủ trì (role='director')
   */
  async countDepartmentPerformance(filters: any) {
    const { deptId, month, year, fromDate, toDate, assignerId, sort } = filters;

    // Build ORDER BY clause
    let orderBy = 'Total DESC';
    if (sort && Object.keys(sort).length > 0) {
      const fieldMapping = {
        phongBan: 'ou.name',
        tongCV: 'Total',
        hoanThanh: 'Completed',
        dungHan: 'OnTime',
        treHan: 'Overdue',
        dangLam: 'InProgress',
      };
      const sortParts = Object.entries(sort)
        .map(([field, direction]) => {
          const dbField = fieldMapping[field];
          if (!dbField) return null;
          const dir = direction === 1 ? 'ASC' : 'DESC';
          return dbField + ' ' + dir;
        })
        .filter(Boolean);
      if (sortParts.length > 0) {
        orderBy = sortParts.join(', ');
      }
    }

    const query = `
      SELECT 
        ou.name AS DeptName,
        ou.id AS DeptId,
        COUNT(DISTINCT t.id) AS Total,
        COUNT(DISTINCT CASE WHEN t.process_status = '4' THEN t.id END) AS Completed,
        COUNT(DISTINCT CASE WHEN t.process_status = '4' AND t.update_at <= t.end_date THEN t.id END) AS OnTime,
        COUNT(DISTINCT CASE WHEN t.process_status = '4' AND t.update_at > t.end_date THEN t.id END) AS Overdue,
        COUNT(DISTINCT CASE WHEN t.process_status = '2' THEN t.id END) AS InProgress
      FROM task t
      INNER JOIN task_users tu ON tu.task_id = t.id AND LOWER(tu.role) = 'director'
      INNER JOIN users u ON u.id = tu.process_id
      INNER JOIN organization_units ou ON ou.id = u.parent
      WHERE t.status = 1
        AND t.type_task != 'project'
        AND t.parent IS NULL
        ${deptId ? "AND ou.id IN (SELECT value FROM STRING_SPLIT(@0, ','))" : ""}
        ${month ? "AND MONTH(t.created_at) = @1" : ""}
        ${year ? "AND YEAR(t.created_at) = @2" : ""}
        ${fromDate ? "AND t.created_at >= @3" : ""}
        ${toDate ? "AND t.created_at <= @4" : ""}
        ${assignerId ? "AND t.id IN (SELECT task_id FROM task_users WHERE LOWER(role) = 'assigner' AND process_id IN (SELECT value FROM STRING_SPLIT(@5, ',')))" : ""}
      GROUP BY ou.id, ou.name
      ORDER BY ${orderBy}
    `;

    const cleanDeptId = Array.isArray(deptId) ? deptId.join(',') : deptId;

    const params: any[] = [
      cleanDeptId ?? null,
      month ?? null,
      year ?? null,
      fromDate ? moment(fromDate).startOf('day').toDate() : null,
      toDate ? moment(toDate).endOf('day').toDate() : null,
      Array.isArray(assignerId) ? assignerId.join(',') : assignerId ?? null
    ];

    return this.dataSource.query(query, params);
  }

  /**
   * Danh sách công việc chi tiết của 1 phòng ban
   * Điều kiện: công việc cha + người chủ trì thuộc phòng ban đó
   */
  async findDepartmentTaskDetail(filters: {
    deptId: string;
    month?: number;
    year?: number;
    fromDate?: string;
    toDate?: string;
    status?: string | string[];
    page?: number;
    limit?: number;
    name?: string;
    overdue?: any;
    directorId?: string | string[];
    assignerId?: string | string[];
    processStatus?: string | string[];
    typeTask?: any;
    startDateFrom?: string;
    startDateTo?: string;
    endDateFrom?: string;
    endDateTo?: string;
    sort?: Record<string, 1 | -1>;
  }) {
    const {
      deptId, month, year, fromDate, toDate, status,
      page = 1, limit = 25,
      name, overdue, directorId, assignerId, processStatus, typeTask,
      startDateFrom, startDateTo, endDateFrom, endDateTo,
      sort
    } = filters;

    const deptIds = (Array.isArray(deptId) ? deptId : String(deptId).split(','))
      .map(v => String(v).trim().replace(/^"+|"+$/g, ''))
      .filter(Boolean);
    const statusValues = processStatus ?? status;
    const statuses = Array.isArray(statusValues)
      ? statusValues.filter(item => item !== undefined && item !== null && String(item).trim() !== '')
      : (statusValues !== undefined && statusValues !== null && String(statusValues).trim() !== '' ? String(statusValues).trim() : undefined);
    const directorIds = Array.isArray(directorId)
      ? directorId.filter(id => id !== undefined && id !== null && String(id).trim() !== '')
      : (directorId !== undefined && directorId !== null && String(directorId).trim() !== '' ? [directorId] : []);

    const qb = this.createQueryBuilder('task')
      .distinct(true)
      .leftJoinAndSelect('task.taskUsers', 'taskUsers')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .innerJoin('task_users', 'tu', "tu.task_id = task.id AND LOWER(tu.role) = 'director'")
      .innerJoin('users', 'u', 'u.id = tu.process_id')
      .where('task.status = 1')
      .andWhere("task.typeTask != 'project'")
      .andWhere('task.parent IS NULL')
      .andWhere('u.parent IN (:...deptIds)', { deptIds });

    if (month) qb.andWhere('MONTH(task.createdAt) = :month', { month });
    if (year) qb.andWhere('YEAR(task.createdAt) = :year', { year });

    // CreatedAt range
    if (fromDate) qb.andWhere('task.createdAt >= :fromDate', { fromDate: moment(fromDate).startOf('day').toDate() });
    if (toDate) qb.andWhere('task.createdAt <= :toDate', { toDate: moment(toDate).endOf('day').toDate() });

    // Status filter (supports both single and multi-select)
    if (Array.isArray(statuses) && statuses.length > 0) {
      qb.andWhere('task.processStatus IN (:...statuses)', { statuses });
    } else if (typeof statuses === 'string' && statuses) {
      qb.andWhere('task.processStatus = :status', { status: statuses });
    }

    // Overdue filter
    if (overdue === true || overdue === 'true') {
      qb.andWhere('task.endDate < GETDATE()')
        .andWhere("task.processStatus != '4'");
    }

    // DirectorId (nguoiChuTri) filter
    if (directorIds.length > 0) {
      qb.andWhere('tu.processId IN (:...dIds)', { dIds: directorIds });
    }

    // AssignerId (nguoiGiaoViec) filter
    if (assignerId) {
      const assignerIds = Array.isArray(assignerId) ? assignerId : [assignerId];
      if (assignerIds.length > 0) {
        qb.andWhere(qb => {
          const subQuery = qb.subQuery()
            .select('tu2.taskId')
            .from('task_users', 'tu2')
            .where("tu2.role = 'assigner'")
            .andWhere('tu2.processId IN (:...assignerIds)')
            .getQuery();
          return 'task.id IN ' + subQuery;
        }).setParameter('assignerIds', assignerIds);
      }
    }

    // TypeTask (nguonCongViec) filter
    if (typeTask) {
      if (Array.isArray(typeTask)) {
        qb.andWhere('task.typeTask IN (:...types)', { types: typeTask });
      } else {
        qb.andWhere('task.typeTask = :typeTask', { typeTask });
      }
    }

    // Name search
    if (name) {
      qb.andWhere('task.name COLLATE Latin1_General_CI_AI LIKE :nameSearch', { nameSearch: `%${name}%` });
    }

    // StartDate range
    if (startDateFrom) qb.andWhere('task.startDate >= :startDateFrom', { startDateFrom: moment(startDateFrom).startOf('day').toDate() });
    if (startDateTo) qb.andWhere('task.startDate <= :startDateTo', { startDateTo: moment(startDateTo).endOf('day').toDate() });

    // EndDate range
    if (endDateFrom) qb.andWhere('task.endDate >= :endDateFrom', { endDateFrom: moment(endDateFrom).startOf('day').toDate() });
    if (endDateTo) qb.andWhere('task.endDate <= :endDateTo', { endDateTo: moment(endDateTo).endOf('day').toDate() });

    // Xử lý sort
    if (sort && Object.keys(sort).length > 0) {
      const fieldMapping = {
        tieuDe: 'task.name',
        nguoiChuTri: 'tu.process_name',
        ngayBatDau: 'task.startDate',
        ngayTao: 'task.createdAt',
        hanKetThuc: 'task.endDate',
        trangThai: 'task.processStatus',
        tienDo: 'task.progress',
      };
      Object.entries(sort).forEach(([field, direction]) => {
        const dbField = fieldMapping[field];
        if (dbField) {
          qb.addOrderBy(dbField, direction === 1 ? 'ASC' : 'DESC');
        }
      });
    } else {
      qb.orderBy('task.createdAt', 'DESC');
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }
  /**
   * Truy vấn danh sách công việc có thời gian xử lý lâu nhất
   * Sắp xếp theo số ngày xử lý từ lâu nhất đến gần nhất
   */
  async findLongestProcessingTimeTasks(filters: {
    userId?: string;
    deptId?: string;
    fromDate?: string;
    toDate?: string;
    endDateFrom?: string;
    endDateTo?: string;
    status?: string | string[];
    priority?: string;
    directorId?: string | string[];
    assignerId?: string | string[];
    minProcessingDays?: number;
    page?: number;
    limit?: number;
    sort?: Record<string, 1 | -1>;
  }) {
    const {
      userId,
      deptId,
      fromDate,
      toDate,
      endDateFrom,
      endDateTo,
      status,
      priority,
      directorId,
      minProcessingDays,
      page = 1,
      limit = 25,
      sort,
    } = filters;

    const qb = this.createQueryBuilder('task')
      .leftJoinAndSelect('task.taskUsers', 'taskUsers')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('taskUsers.user', 'user')
      .where('task.status = 1')
      .andWhere("task.typeTask != 'project'");

    if (userId) {
      qb.andWhere(qb => {
        const subQuery = qb.subQuery()
          .select('tu.taskId')
          .from('task_users', 'tu')
          .where('tu.processId = :userId')
          .getQuery();
        return 'task.id IN ' + subQuery;
      }).setParameter('userId', userId);
    } else if (deptId) {
      qb.andWhere(qb => {
        const subQuery = qb.subQuery()
          .select('tu.taskId')
          .from('task_users', 'tu')
          .innerJoin('users', 'u', 'tu.processId = u.id')
          .where('u.parent = :deptId')
          .getQuery();
        return 'task.id IN ' + subQuery;
      }).setParameter('deptId', deptId);
    }
    // Lọc theo ngày bắt đầu (ngayBatDau): từ ngày - đến ngày
    // Dùng startDate, fallback created_at nếu startDate null.
    if (fromDate || toDate) {
      if (fromDate) {
        qb.andWhere('COALESCE(task.startDate, task.created_at) >= :fromDate', {
          fromDate: moment(fromDate).startOf('day').toDate(),
        });
      }
      if (toDate) {
        qb.andWhere('COALESCE(task.startDate, task.created_at) <= :toDate', {
          toDate: moment(toDate).endOf('day').toDate(),
        });
      }
    }

    // Lọc theo hạn hoàn thành (hanHoanThanh): từ ngày - đến ngày
    if (endDateFrom) {
      qb.andWhere('task.endDate >= :endDateFrom', {
        endDateFrom: moment(endDateFrom).startOf('day').toDate(),
      });
    }
    if (endDateTo) {
      qb.andWhere('task.endDate <= :endDateTo', {
        endDateTo: moment(endDateTo).endOf('day').toDate(),
      });
    }

    if (status) {
      if (Array.isArray(status) && status.length > 0) {
        qb.andWhere('task.processStatus IN (:...statuses)', { statuses: status });
      } else if (!Array.isArray(status)) {
        qb.andWhere('task.processStatus = :status', { status });
      }
    }

    if (priority) {
      qb.andWhere('task.priority = :priority', { priority });
    }

    if (directorId) {
      const directorIds = Array.isArray(directorId)
        ? directorId.filter(id => id !== undefined && id !== null && String(id).trim() !== '')
        : [directorId];

      if (directorIds.length > 0) {
        qb.andWhere(qb => {
          const subQuery = qb.subQuery()
            .select('tu.taskId')
            .from('task_users', 'tu')
            .where("tu.role = 'director'")
            .andWhere('tu.processId IN (:...directorIds)')
            .getQuery();
          return 'task.id IN ' + subQuery;
        }).setParameter('directorIds', directorIds);
      }
    }

    if (filters.assignerId) {
      const assignerIds = Array.isArray(filters.assignerId)
        ? filters.assignerId.filter(id => id !== undefined && id !== null && String(id).trim() !== '')
        : [filters.assignerId];

      if (assignerIds.length > 0) {
        qb.andWhere(qb => {
          const subQuery = qb.subQuery()
            .select('tu2.taskId')
            .from('task_users', 'tu2')
            .where("tu2.role = 'assigner'")
            .andWhere('tu2.processId IN (:...assignerIds)')
            .getQuery();
          return 'task.id IN ' + subQuery;
        }).setParameter('assignerIds', assignerIds);
      }
    }

    if (minProcessingDays !== undefined && minProcessingDays !== null) {
      qb.andWhere(
        `DATEDIFF(DAY, COALESCE(task.startDate, task.created_at), COALESCE(task.endDate, task.update_at, GETDATE())) >= :minProcessingDays`,
        { minProcessingDays }
      );
    }

    // Sắp xếp theo thời gian xử lý từ lâu nhất đến gần nhất
    // Thời gian xử lý = DATEDIFF(DAY, startDate hoặc created_at, COALESCE(end_date, GETDATE()))
    const qbWithSelect = qb.addSelect(`DATEDIFF(DAY, COALESCE(task.startDate, task.created_at), COALESCE(task.endDate, task.update_at, GETDATE()))`, 'processing_days');

    // Xử lý sort tùy chỉnh
    if (sort && Object.keys(sort).length > 0) {
      // Mapping tên trường frontend sang database field
      const fieldMapping: Record<string, string> = {
        'nguoiChuTri': 'directors.process_name', // Cần join để sort
        'nguoiTao': 'creator.name', // Cần join để sort
        'ngayTao': 'task.created_at',
        'hanHoanThanh': 'task.endDate',
        'trangThai': 'task.processStatus',
        'uuTien': 'task.priority',
        'tienDo': 'task.progress',
        'thoiGianXuLy': 'processing_days'
      };

      // Thêm joins cần thiết cho sort
      if (Object.keys(sort).some(field => field === 'nguoiChuTri')) {
        qbWithSelect.leftJoin(
          qb => qb.select('tu2.task_id')
            .addSelect('STRING_AGG(u2.name, \', \')', 'process_name')
            .from('task_users', 'tu2')
            .leftJoin('users', 'u2', 'tu2.process_id = u2.id')
            .where("tu2.role = 'director'")
            .groupBy('tu2.task_id'),
          'directors',
          'directors.task_id = task.id'
        );
      }

      if (Object.keys(sort).some(field => field === 'nguoiTao')) {
        qbWithSelect.leftJoin('users', 'creator', 'creator.id = task.createdById');
      }

      // Áp dụng sort
      Object.entries(sort).forEach(([field, direction], index) => {
        const dbField = fieldMapping[field];
        if (dbField) {
          const orderDirection = direction === 1 ? 'ASC' : 'DESC';
          if (index === 0) {
            qbWithSelect.orderBy(dbField, orderDirection);
          } else {
            qbWithSelect.addOrderBy(dbField, orderDirection);
          }
        }
      });
    } else {
      // Sort mặc định: thời gian xử lý lâu nhất trước
      qbWithSelect
        .orderBy('processing_days', 'DESC')
        .addOrderBy('task.createdAt', 'DESC');
    }

    const [data, total] = await qbWithSelect
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  /**
   * Truy vấn danh sách công việc cho Báo cáo Thống kê công việc của phòng
   */
  async findDeptWorkStatsTasks(filters: {
    deptIds?: string[];
    assignerIds?: string[];
    fromDate?: string;
    toDate?: string;
    startDateFrom?: string;
    startDateTo?: string;
    endDateFrom?: string;
    endDateTo?: string;
    sources?: string[];
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const {
      deptIds,
      assignerIds,
      fromDate,
      toDate,
      startDateFrom,
      startDateTo,
      endDateFrom,
      endDateTo,
      sources,
      page = 1,
      limit = 25,
      search,
    } = filters;

    const qb = this.createQueryBuilder('task')
      .distinct(true)
      .leftJoinAndSelect('task.taskUsers', 'taskUsers')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('taskUsers.user', 'user')
      .leftJoinAndSelect('user.parent', 'userParent')
      .leftJoinAndSelect('taskUsers.organizationUnit', 'orgUnit')
      .where('task.status = 1')
      .andWhere('(task.parent IS NULL OR task.parent = 0)')
      .andWhere("task.type_task != 'project'");

    // Lọc theo danh sách Phòng ban (Chủ trì OR Phối hợp)
    if (deptIds && deptIds.length > 0) {
      qb.andWhere(qb => {
        const subQuery = qb.subQuery()
          .select('tu_dept.taskId')
          .from('task_users', 'tu_dept')
          .leftJoin('users', 'u_dept', 'u_dept.id = tu_dept.processId')
          .where("tu_dept.role IN ('director', 'supporter')")
          .andWhere(
            '((tu_dept.type = 2 AND tu_dept.processId IN (:...deptIds)) OR (tu_dept.type = 1 AND u_dept.parent IN (:...deptIds)) OR (u_dept.parent IN (:...deptIds)))'
          )
          .getQuery();
        return 'task.id IN ' + subQuery;
      }).setParameter('deptIds', deptIds);
    }

    // Lọc theo người giao (Ban Lãnh Đạo)
    if (assignerIds && assignerIds.length > 0) {
      qb.andWhere(qb => {
        const subQuery = qb.subQuery()
          .select('tu_ass.taskId')
          .from('task_users', 'tu_ass')
          .where("tu_ass.role = 'assigner'")
          .andWhere('tu_ass.processId IN (:...assignerIds)')
          .getQuery();
        return '(task.created_by IN (:...assignerIds) OR task.id IN ' + subQuery + ')';
      }).setParameter('assignerIds', assignerIds);
    }

    // Lọc theo Ngày bắt đầu (startDate)
    if (startDateFrom && startDateTo) {
      qb.andWhere('CAST(COALESCE(task.start_date, task.created_at) AS DATE) >= CAST(:startDateFrom AS DATE)', { startDateFrom })
        .andWhere('CAST(COALESCE(task.start_date, task.created_at) AS DATE) <= CAST(:startDateTo AS DATE)', { startDateTo });
    } else if (startDateFrom) {
      qb.andWhere('CAST(COALESCE(task.start_date, task.created_at) AS DATE) >= CAST(:startDateFrom AS DATE)', { startDateFrom });
    } else if (startDateTo) {
      qb.andWhere('CAST(COALESCE(task.start_date, task.created_at) AS DATE) <= CAST(:startDateTo AS DATE)', { startDateTo });
    }

    // Lọc theo Ngày kết thúc (endDate / hạn cuối)
    if (endDateFrom && endDateTo) {
      qb.andWhere('CAST(COALESCE(task.end_date, task.start_date, task.created_at) AS DATE) >= CAST(:endDateFrom AS DATE)', { endDateFrom })
        .andWhere('CAST(COALESCE(task.end_date, task.start_date, task.created_at) AS DATE) <= CAST(:endDateTo AS DATE)', { endDateTo });
    } else if (endDateFrom) {
      qb.andWhere('CAST(COALESCE(task.end_date, task.start_date, task.created_at) AS DATE) >= CAST(:endDateFrom AS DATE)', { endDateFrom });
    } else if (endDateTo) {
      qb.andWhere('CAST(COALESCE(task.end_date, task.start_date, task.created_at) AS DATE) <= CAST(:endDateTo AS DATE)', { endDateTo });
    }

    // Fallback: Lọc theo khoảng thời gian thực hiện giao nhau (fromDate / toDate cũ)
    if (!startDateFrom && !startDateTo && !endDateFrom && !endDateTo) {
      if (fromDate && toDate) {
        qb.andWhere('CAST(COALESCE(task.start_date, task.created_at) AS DATE) <= CAST(:toDate AS DATE)', { toDate })
          .andWhere('CAST(COALESCE(task.end_date, task.start_date, task.created_at) AS DATE) >= CAST(:fromDate AS DATE)', { fromDate });
      } else if (fromDate) {
        qb.andWhere('CAST(COALESCE(task.end_date, task.start_date, task.created_at) AS DATE) >= CAST(:fromDate AS DATE)', { fromDate })
          .andWhere('CAST(COALESCE(task.start_date, task.created_at) AS DATE) <= CAST(GETDATE() AS DATE)');
      } else if (toDate) {
        qb.andWhere('CAST(COALESCE(task.end_date, task.start_date, task.created_at) AS DATE) <= CAST(:toDate AS DATE)', { toDate });
      }
    }

    // Lọc theo nguồn công việc
    if (sources && sources.length > 0) {
      qb.andWhere(new Brackets(qbSource => {
        sources.forEach((src, idx) => {
          const s = String(src).trim();
          if (['general', 'TaskGeneral', 'general_task', 'chung'].includes(s)) {
            qbSource.orWhere(`(task.type_task IN ('general', 'TaskGeneral') OR (task.doc_id IS NULL AND task.meeting_id IS NULL AND task.meeting_conclusion_id IS NULL))`);
          } else if (['document', 'form_doc', 'TaskFormDoc', 'doc', 'van_ban'].includes(s)) {
            qbSource.orWhere(`(task.type_task IN ('form_doc', 'TaskFormDoc', 'document') OR task.doc_id IS NOT NULL)`);
          } else if (['meeting', 'form_meeting', 'TaskFormMeeting', 'cuoc_hop'].includes(s)) {
            qbSource.orWhere(`(task.type_task IN ('form_meeting', 'TaskFormMeeting', 'meeting') OR task.meeting_id IS NOT NULL OR task.meeting_conclusion_id IS NOT NULL)`);
          } else {
            qbSource.orWhere(`task.type_task = :src_${idx}`, { [`src_${idx}`]: s });
          }
        });
      }));
    }

    // Tìm kiếm theo tên
    if (search && search.trim() !== '') {
      qb.andWhere('task.name LIKE :search', { search: `%${search.trim()}%` });
    }

    qb.orderBy('task.createdAt', 'DESC');

    // Clone query builder để tính thống kê biểu đồ cho toàn bộ kết quả lọc
    const qbStats = qb.clone();

    const [tasks, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Tính toán số liệu thống kê biểu đồ Trạng thái nhiệm vụ trên tất cả bản ghi khớp bộ lọc
    const allMatchingTasks = await qbStats.select(['task.id', 'task.processStatus', 'task.endDate', 'task.createdAt']).getMany();
    
    let completedCount = 0;
    let inProgressCount = 0;
    let overdueCount = 0;
    let pendingCount = 0;

    allMatchingTasks.forEach(t => {
      const isOverdue = t.endDate && moment(t.endDate).isBefore(moment(), 'day') && String(t.processStatus) !== '4';
      const ps = isOverdue ? '9' : (String(t.processStatus || '1').trim() || '1');

      if (ps === '4') {
        completedCount++;
      } else if (['3', '5', '6'].includes(ps)) {
        pendingCount++;
      } else if (ps === '9') {
        overdueCount++;
      } else {
        inProgressCount++;
      }
    });

    const grandTotal = allMatchingTasks.length;

    const chartStats = {
      total: grandTotal,
      completed: {
        count: completedCount,
        percent: grandTotal > 0 ? Math.round((completedCount / grandTotal) * 100) : 0,
      },
      inProgress: {
        count: inProgressCount,
        percent: grandTotal > 0 ? Math.round((inProgressCount / grandTotal) * 100) : 0,
      },
      overdue: {
        count: overdueCount,
        percent: grandTotal > 0 ? Math.round((overdueCount / grandTotal) * 100) : 0,
      },
      pending: {
        count: pendingCount,
        percent: grandTotal > 0 ? Math.round((pendingCount / grandTotal) * 100) : 0,
      },
    };

    return { tasks, total, chartStats };
  }

  /**
   * Tính số ngày xử lý của một công việc
   */
  calculateProcessingDays(task: any): number {
    const startDate = moment(task.createdAt);
    const endDate = moment(task.endDate || task.update_at || new Date());
    return endDate.diff(startDate, 'days');
  }
}
