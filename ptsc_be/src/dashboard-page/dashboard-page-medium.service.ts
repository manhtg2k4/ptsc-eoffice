import { Injectable, Logger } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { SafeCron } from 'src/database/safe-cron.decorator';
import { FEEDBACK_STATUS } from 'src/feedback-suggestions/feedback-suggestions.service';
import { MeetingService } from 'src/meeting/meeting.service';
import { Audit } from '../database/schema-sql/audit.entity';
import { WorkItemEntity } from '../work-items/entities/work-item.entity';
import { BpmnEngineService, BpmnDefinitions, BpmnProcess, BpmnIndexes } from '../bpmn/bpmn-engine.service';
import { UsersService } from '../users/users.service';
import { SQLSVRepository, UserInfo } from '../database/sqlsvRepo';
import { RuntimeDbService } from '../bpmn/runtime-dbmssql.service';
import { TaskService, RED_FLAG_SVG, WHITE_FLAG_SVG } from 'src/task/task.service';
import { buildProgressView } from 'src/task/progress.util';
import { mapActionIncomingToLabel, mapActionToLabel } from 'src/documents/helpers/build.filter';
import { DashboardPageCacheService } from './dashboard-page-cache.service';

@Injectable()
export class DashboardPageMediumService {
	private readonly logger = new Logger(DashboardPageMediumService.name);

	private userCache = new Map<string, string>(); // userId → userName
	private departmentCache = new Map<string, string>(); // departmentId → departmentName
	private userDepartmentCache = new Map<string, string>(); // userId → departmentId
	private userDepartmentNameCache = new Map<string, string>(); // userId → departmentName
	private dbname: string; // db name
	constructor(
		private readonly configService: ConfigService,
		@InjectDataSource('mssqlConnection') private readonly dataSource: DataSource,
		private readonly meetingService: MeetingService,
		@InjectRepository(Audit, 'mssqlConnection')
		private readonly auditRepo: Repository<Audit>,
		@InjectRepository(WorkItemEntity, 'mssqlConnection')
		private readonly workItemRepo: Repository<WorkItemEntity>,
		private readonly bpmnEngine: BpmnEngineService,
		private readonly runtimeDbService: RuntimeDbService,
		private readonly sqlsvRepo: SQLSVRepository,
		private readonly userService: UsersService,
		private readonly taskService: TaskService,
		private readonly cacheService: DashboardPageCacheService,
	) { }
	private getDatabaseName(): string {
		const dbName = this.configService.get<string>('SQLSERVER_DATABASE');
		if (!dbName) throw new Error('SQLSERVER_DATABASE not defined in .env');
		return dbName + '.dbo';
	}
	async onModuleInit() {
		this.dbname = this.getDatabaseName();
		await this.loadCrmSourceData();
	}
	@SafeCron('0 */5 * * * *')
	handleRefreshCache() {
		this.loadCrmSourceData();
	}
	private async loadCrmSourceData() {
		try {
			const rows = await this.dataSource.query(`
        SELECT 
          u.id,
          u.name,
          u.parent AS departmentId,
          d.name AS departmentName
        FROM ${this.dbname}.users u
        LEFT JOIN ${this.dbname}.organization_units d 
          ON u.parent = d.id
        WHERE u.status = 1
      `);

			// clear cache
			this.userCache.clear();
			this.departmentCache.clear();
			this.userDepartmentCache.clear();
			this.userDepartmentNameCache.clear();

			for (const row of rows) {
				// user
				this.userCache.set(row.id, row.name);

				// departmentId
				if (row.departmentId) {
					this.userDepartmentCache.set(row.id, row.departmentId);
				}

				// department name
				if (row.departmentId && row.departmentName) {
					this.departmentCache.set(row.departmentId, row.departmentName);
					this.userDepartmentNameCache.set(row.id, row.departmentName);
				}
			}

		} catch (error) {
			this.logger.error('Error loading CRM source data', error);
		}
	}

	getUserName(userId: string): string | undefined {
		return this.userCache.get(userId);
	}

	getDepartmentIdByUserId(userId: string): string | undefined {
		return this.userDepartmentCache.get(userId);
	}

	getDepartmentNameByUserId(userId: string): string | undefined {
		return this.userDepartmentNameCache.get(userId);
	}

	async getCachedData<T>(
		cacheKey: string,
		fetchDbFn: () => Promise<T>,
		jobName: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		jobData: any = {},
		softTtl = 300,
	): Promise<T> {
		return this.cacheService.getCachedData(cacheKey, fetchDbFn, jobName, jobData, softTtl);
	}

	async getStatsMedium(userId: string) {
		return this.getCachedData(
			`dash:medium:stats:${userId}`,
			() => this.getStatsMediumFromDb(userId),
			'refresh-medium-stats',
			{ userId },
		);
	}

	async getStatsMediumFromDb(userId) {
		let departmentId = this.getDepartmentIdByUserId(userId);

		if (!departmentId) {
			// fallback query trực tiếp
			const rs = await this.dataSource.query(`
        SELECT parent as departmentId
        FROM ${this.dbname}.users
        WHERE id = @0
      `, [userId]);

			departmentId = rs?.[0]?.departmentId;
		}
		const [taskStats, approvalStats, documentStats] = await Promise.all([
			// ================= TASK STATS =================
			this.dataSource.query(`
      DECLARE @deptId NVARCHAR(100) = @0;

      WITH users_of_dept AS (
          SELECT id
          FROM ${this.dbname}.users
          WHERE parent = @deptId
      ),
      task_of_dept AS (
          SELECT DISTINCT t.*
          FROM ${this.dbname}.task t
          JOIN ${this.dbname}.task_users tu 
              ON tu.task_id = t.id
          WHERE tu.process_id IN (SELECT id FROM users_of_dept)
      )
      SELECT 
        -- KPI tháng này
        SUM(CASE  
              WHEN t.process_status = '4' 
              AND t.update_at <= t.end_date  
              AND MONTH(t.end_date) = MONTH(GETDATE()) 
              AND YEAR(t.end_date) = YEAR(GETDATE()) 
            THEN 1 ELSE 0 END) AS done_on_time,

        SUM(CASE  
              WHEN MONTH(t.end_date) = MONTH(GETDATE()) 
              AND YEAR(t.end_date) = YEAR(GETDATE()) 
            THEN 1 ELSE 0 END) AS total_task,

        -- KPI tháng trước
        SUM(CASE  
              WHEN t.process_status = '4' 
              AND t.update_at <= t.end_date 
              AND MONTH(t.end_date) = MONTH(DATEADD(MONTH,-1,GETDATE())) 
              AND YEAR(t.end_date) = YEAR(DATEADD(MONTH,-1,GETDATE())) 
            THEN 1 ELSE 0 END) AS done_last_month,

        SUM(CASE  
              WHEN MONTH(t.end_date) = MONTH(DATEADD(MONTH,-1,GETDATE()))  
              AND YEAR(t.end_date) = YEAR(DATEADD(MONTH,-1,GETDATE())) 
            THEN 1 ELSE 0 END) AS total_last_month,

        -- Tổng đúng hạn
        SUM(CASE  
              WHEN t.process_status = '4' 
              AND t.update_at <= t.end_date 
            THEN 1 ELSE 0 END) AS on_time,

        -- Quá hạn (chuẩn)
        SUM(CASE 
              WHEN t.end_date < GETDATE() 
              AND t.process_status NOT IN ('4','8')
            THEN 1 ELSE 0 END) AS delayed,

        -- Đang làm
        SUM(CASE 
              WHEN t.process_status = '2'
            THEN 1 ELSE 0 END) AS doing,

        -- Hoàn thành
        SUM(CASE 
              WHEN t.process_status = '4'
            THEN 1 ELSE 0 END) AS done

      FROM task_of_dept t
    `, [departmentId]),

			// ================= APPROVAL STATS =================
			// Old Query:
			// this.dataSource.query(`
			//   DECLARE @deptId NVARCHAR(100) = @0;
			//   WITH users_of_dept AS ( ... )
			//   ...
			// `, [departmentId]),
			// Aligned Query:
			this.dataSource.query(`
        DECLARE @deptId NVARCHAR(100) = @0;

        WITH users_of_dept AS (
            SELECT id
            FROM ${this.dbname}.users
            WHERE parent = @deptId
        ),

        -- ===== Latest audit theo từng người nhận =====
        latest_audit AS (
            SELECT 
                a.document_id, 
                a.receiver, 
                a.stage_status, 
                a.created_at,
                a.type_document,
                ROW_NUMBER() OVER (
                    PARTITION BY a.document_id, a.receiver 
                    ORDER BY a.created_at DESC, a.id DESC
                ) AS rn
            FROM ${this.dbname}.audit a WITH (NOLOCK)
            WHERE a.receiver IN (SELECT id FROM users_of_dept)
        ),

        -- ===== Văn bản chờ duyệt =====
        pending_docs AS (
            SELECT *
            FROM latest_audit
            WHERE rn = 1
              AND stage_status IN ('CHUA_XU_LY','DANG_XU_LY')
              AND type_document IN ('IncommingDocument', 'IncomingDocument', 'OutgoingDocument')
        ),

        -- ===== Task chờ duyệt =====
        pending_tasks AS (
            SELECT DISTINCT t.id, t.created_at
            FROM ${this.dbname}.task t
            JOIN ${this.dbname}.task_users tu 
                ON tu.task_id = t.id
            WHERE t.process_status = '3'
              AND tu.process_id IN (SELECT id FROM users_of_dept)
        ),

        -- ===== Passport chờ duyệt =====
        pending_passports AS (
            SELECT p.created_at
            FROM ${this.dbname}.passport_borrow_requests p WITH (NOLOCK)
            INNER JOIN ${this.dbname}.work_items wi WITH (NOLOCK)
                ON wi.document_id = CAST(p.id AS NVARCHAR(100))
                AND wi.state = 'open'
            WHERE p.status = 'PENDING'
              AND p.is_deleted = 0
              AND wi.assignee_user_id IN (SELECT id FROM users_of_dept)
        ),

        -- ===== Vehicle registrations chờ phê duyệt =====
        pending_vehicles AS (
            SELECT v.request_submitted_at AS created_at
            FROM ${this.dbname}.vehicle_registrations v WITH (NOLOCK)
            INNER JOIN ${this.dbname}.work_items wi WITH (NOLOCK)
                ON wi.document_id = CAST(v.id AS NVARCHAR(100))
                AND wi.state = 'open'
            WHERE v.vehicle_state = 'CHO_DIEU_PHOI'
              AND wi.assignee_user_id IN (SELECT id FROM users_of_dept)
        ),

        -- ===== Gộp tất cả =====
        all_pending AS (
            SELECT created_at FROM pending_docs
            UNION ALL
            SELECT created_at FROM pending_tasks
            UNION ALL
            SELECT created_at FROM pending_passports
            UNION ALL
            SELECT created_at FROM pending_vehicles
        )

        SELECT
            (SELECT COUNT(*) FROM all_pending) AS total_pending,          -- Tổng chờ duyệt
            ROUND((
                SELECT AVG(DATEDIFF(DAY, created_at, GETDATE()) * 1.0)
                FROM all_pending
            ), 1) AS avg_days,
            (SELECT COUNT(*) FROM pending_docs) AS doc_count,             -- Số văn bản
            (SELECT COUNT(*) FROM pending_tasks) AS task_count,           -- Số task
            (SELECT COUNT(*) FROM pending_passports) AS passport_count,   -- Số hộ chiếu
            (SELECT COUNT(*) FROM pending_vehicles) AS vehicle_count     -- Số đặt xe
      `, [departmentId]),
			this.dataSource.query(`
      DECLARE @deptId NVARCHAR(100) = @0;

      WITH users_of_dept AS (
          SELECT id
          FROM ${this.dbname}.users
          WHERE parent = @deptId
      ),

      -- Lấy audit cuối cùng của mỗi document trong tháng
      docs AS (
          SELECT 
              a.document_id,
              a.stage_status,
              a.deadline,
              a.created_at,
              ROW_NUMBER() OVER (
                  PARTITION BY a.document_id 
                  ORDER BY a.created_at DESC, a.id DESC
              ) AS rn
          FROM ${this.dbname}.audit a WITH (NOLOCK)
          WHERE a.receiver IN (SELECT id FROM users_of_dept)
            AND a.created_at >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
            AND a.created_at < DATEADD(MONTH, 1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
      )

      SELECT
        -- Tổng document = tổng 3 loại
        SUM(CASE WHEN stage_status = 'DA_XU_LY' THEN 1 ELSE 0 END
            + CASE WHEN stage_status IN ('CHUA_XU_LY','DANG_XU_LY') 
                  AND (deadline IS NULL OR deadline >= GETDATE()) THEN 1 ELSE 0 END
            + CASE WHEN stage_status <> 'DA_XU_LY' 
                  AND deadline < GETDATE() THEN 1 ELSE 0 END
        ) AS total_doc,
        
        SUM(CASE WHEN stage_status = 'DA_XU_LY' THEN 1 ELSE 0 END) AS doc_done,
        SUM(CASE WHEN stage_status IN ('CHUA_XU_LY','DANG_XU_LY') 
                AND (deadline IS NULL OR deadline >= GETDATE()) THEN 1 ELSE 0 END) AS doc_pending,
        SUM(CASE WHEN stage_status <> 'DA_XU_LY' 
                AND deadline < GETDATE() THEN 1 ELSE 0 END) AS doc_overdue
      FROM docs
      WHERE rn = 1;
      `, [departmentId])
		]);

		const r = taskStats[0];
		const a = approvalStats[0];
		const d = documentStats[0] || {};

		const perfThisMonth = r.total_task ? Math.round((r.done_on_time / r.total_task) * 100) : 0;
		const perfLastMonth = r.total_last_month ? Math.round((r.done_last_month / r.total_last_month) * 100) : 0;
		const diff = perfThisMonth - perfLastMonth;

		let trend = { type: 'neutral', text: 'Đạt mục tiêu' };
		if (diff > 0) trend = { type: 'up', text: `${diff}% trên mục tiêu` };
		if (diff < 0) trend = { type: 'down', text: `${Math.abs(diff)}% dưới mục tiêu` };

		return [
			{
				id: 'team-performance',
				color: '#BCDDFE',
				colorLabel: "#2364B0",
				variantIcon: '⏳',
				value: String(perfThisMonth),
				suffix: '%',
				title: 'Hiệu suất đội nhóm',
				subText: 'Mục tiêu 85%',
				trend,
				footerStats: [
					{ id: 'on-time', color: 'green', text: `${r.on_time} đúng hạn` },
					{ id: 'delayed', color: 'red', text: `${r.delayed} chậm tiến độ` },
				],
			},
			{
				id: 'approvals-waiting',
				color: '#DCBCFE',
				colorLabel: "#BF82FF",
				variantIcon: '👥',
				value: String(a.total_pending || 0),
				title: 'Chờ phê duyệt',
				subText: `TB ${a.avg_days || 0} yêu cầu/ngày`,
				chips: [
					{ id: 'doc', label: `${a.doc_count || 0} Văn bản`, color: 'default' },
					{ id: 'task', label: `${a.task_count || 0} Công việc`, color: 'orange' },
					{ id: 'car', label: `${a.vehicle_count || 0} Đặt xe`, color: 'navy' },
					{ id: 'passport', label: `${a.passport_count || 0} Hộ chiếu`, color: 'yellow' },
				],
			},
			{
				id: 'tasks-room',
				color: '#FEBCD6',
				colorLabel: "#FF75AB",
				variantIcon: '📋',
				value: String(r.total_task || 0),
				title: 'Công việc phòng',
				subText: `Đang làm ${r.doing || 0}`,
				chips: [
					{ id: 'doing', label: `${r.doing || 0} Đang làm`, color: 'default' },
					{ id: 'overdue', label: `${r.delayed || 0} Quá hạn`, color: 'orange' },
					{ id: 'done', label: `${r.done || 0} Hoàn thành`, color: 'green' },
				],
			},
			{
				id: 'documents-month',
				color: '#FEBCBD',
				colorLabel: "#FF7779",
				variantIcon: '📄',
				value: String(d.total_doc || 0),
				title: 'Văn bản tháng này',
				subText: `Đã xử lý ${d.total_doc ? Math.round((d.doc_done / d.total_doc) * 100) : 0}%`,
				chips: [
					{ id: 'doc-overdue', label: `${d.doc_overdue || 0} Quá hạn`, color: 'red' },
					{ id: 'doc-pending', label: `${d.doc_pending || 0} Chờ duyệt`, color: 'orange' },
					{ id: 'doc-done', label: `${d.doc_done || 0} Đã xong`, color: 'green' },
				],
			}
		];
	}

	async getMediumTasksRoomList(userId: string, queryParams: any) {
		let departmentId = this.getDepartmentIdByUserId(userId);

		if (!departmentId) {
			const rs = await this.dataSource.query(`
        SELECT parent as departmentId
        FROM ${this.dbname}.users
        WHERE id = @0
      `, [userId]);
			departmentId = rs?.[0]?.departmentId;
		}

		const filter = (queryParams?.filter || queryParams?.type || 'today').toString().toLowerCase();
		const pageNum = Number(queryParams?.page) || 1;
		const limitNum = Number(queryParams?.limit) || 10;
		const offset = (pageNum - 1) * limitNum;
		const keyword = queryParams?.name ? `%${queryParams.name}%` : null;

		let filterCondition = '';
		if (filter === 'doing') {
			filterCondition = `AND t.process_status = '2'`;
		} else if (filter === 'overdue' || filter === 'delayed' || filter === 'late') {
			filterCondition = `AND t.end_date < GETDATE() AND t.process_status NOT IN ('4','8')`;
		} else if (filter === 'done') {
			filterCondition = `AND t.process_status = '4'`;
		} else if (filter === 'pending') {
			filterCondition = `AND t.process_status NOT IN ('4','8')`;
		} else if (filter === 'total' || filter === 'month') {
			filterCondition = `AND MONTH(t.end_date) = MONTH(GETDATE()) AND YEAR(t.end_date) = YEAR(GETDATE())`;
		} else {
			// Mặc định hoặc filter='today' / 'day': Công việc trên/trong ngày
			filterCondition = `AND (CAST(t.created_at AS DATE) = CAST(GETDATE() AS DATE) OR CAST(t.end_date AS DATE) = CAST(GETDATE() AS DATE))`;
		}

		let searchCondition = '';
		if (keyword) {
			searchCondition = `AND (t.name LIKE @1 OR t.code LIKE @1)`;
		}

		const countSql = `
      DECLARE @deptId NVARCHAR(100) = @0;

      WITH users_of_dept AS (
          SELECT id
          FROM ${this.dbname}.users
          WHERE parent = @deptId
      ),
      task_of_dept AS (
          SELECT DISTINCT t.*
          FROM ${this.dbname}.task t
          JOIN ${this.dbname}.task_users tu 
              ON tu.task_id = t.id
          WHERE tu.process_id IN (SELECT id FROM users_of_dept)
      )
      SELECT COUNT(*) AS total
      FROM task_of_dept t
      WHERE 1=1 ${filterCondition} ${searchCondition}
    `;

		const dataSql = `
      DECLARE @deptId NVARCHAR(100) = @0;

      WITH users_of_dept AS (
          SELECT id
          FROM ${this.dbname}.users
          WHERE parent = @deptId
      ),
      task_of_dept AS (
          SELECT DISTINCT t.*
          FROM ${this.dbname}.task t
          JOIN ${this.dbname}.task_users tu 
              ON tu.task_id = t.id
          WHERE tu.process_id IN (SELECT id FROM users_of_dept)
      )
      SELECT t.*
      FROM task_of_dept t
      WHERE 1=1 ${filterCondition} ${searchCondition}
      ORDER BY t.created_at DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limitNum} ROWS ONLY
    `;

		const queryArgs = keyword ? [departmentId, keyword] : [departmentId];
		const [countRs, tasks] = await Promise.all([
			this.dataSource.query(countSql, queryArgs),
			this.dataSource.query(dataSql, queryArgs),
		]);

		const total = countRs?.[0]?.total ? Number(countRs[0].total) : 0;
		let data: any[] = [];

		if (tasks && tasks.length > 0) {
			const taskIds = tasks.map((t: any) => t.id);
			const placeholders = taskIds.map((_, i) => `@${i}`).join(',');

			const usersRows = await this.dataSource.query(`
        SELECT 
          tu.id, tu.task_id, tu.process_id, tu.process_name, tu.role, tu.type,
          u.id AS user_id, u.name AS user_name, u.avatar AS user_avatar,
          u.parent AS user_parent_id, dept.name AS department_name
        FROM ${this.dbname}.task_users tu WITH (NOLOCK)
        LEFT JOIN ${this.dbname}.users u WITH (NOLOCK) ON u.id = tu.process_id
        LEFT JOIN ${this.dbname}.users dept WITH (NOLOCK) ON dept.id = u.parent
        WHERE tu.task_id IN (${placeholders})
      `, taskIds);

			const creatorIds = Array.from(new Set(tasks.map((t: any) => t.created_by).concat(tasks.map((t: any) => t.updated_by)).filter(Boolean)));
			let userMap = new Map<string, any>();
			if (creatorIds.length > 0) {
				const uPlaceholders = creatorIds.map((_, i) => `@${i}`).join(',');
				const uRows = await this.dataSource.query(`
          SELECT id, name FROM ${this.dbname}.users WHERE id IN (${uPlaceholders})
        `, creatorIds);
				for (const u of uRows) {
					userMap.set(String(u.id), u);
				}
			}

			const usersMap = new Map<string, any[]>();
			for (const u of usersRows) {
				const tid = String(u.task_id);
				let list = usersMap.get(tid);
				if (!list) {
					list = [];
					usersMap.set(tid, list);
				}
				list.push(u);
			}

			const statusMap: Record<string, string> = {
				'1': 'Công việc mới',
				'2': 'Đang thực hiện',
				'3': 'Chờ phê duyệt',
				'4': 'Hoàn thành',
				'5': 'Từ chối phê duyệt',
				'6': 'Điều chỉnh',
				'7': 'Từ chối điều chỉnh',
				'8': 'Huỷ',
				'9': 'Điều chỉnh'
			};

			const typeTaskVn: Record<string, string> = {
				general: 'Công việc chung',
				document: 'Công việc từ văn bản',
				meeting: 'Công việc từ cuộc họp',
				project: 'Công việc từ dự án',
			};

			const formatDate = (d: any) => {
				if (!d) return null;
				const date = new Date(d);
				const day = String(date.getDate()).padStart(2, '0');
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const year = date.getFullYear();
				return `${day}/${month}/${year}`;
			};

			const formatDateTime = (d: any) => {
				if (!d) return null;
				const date = new Date(d);
				const day = String(date.getDate()).padStart(2, '0');
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const year = date.getFullYear();
				const hours = String(date.getHours()).padStart(2, '0');
				const minutes = String(date.getMinutes()).padStart(2, '0');
				return `${day}/${month}/${year} ${hours}:${minutes}`;
			};

			data = tasks.map((task: any) => {
				const tuList = usersMap.get(String(task.id)) || [];

				const taskUsersFormatted = tuList.map((x: any) => ({
					id: x.id,
					user: {
						id: x.user_id || x.process_id,
						name: x.user_name || x.process_name,
						parent: x.user_parent_id ? {
							id: x.user_parent_id,
							name: x.department_name || '',
						} : null,
					},
					organizationUnit: null,
					processId: x.process_id,
					processName: x.process_name || x.user_name,
					role: x.role,
					type: x.type || 1,
				}));

				const assigners = tuList.filter((x: any) => x.role === 'assigner').map((x: any) => ({
					processId: x.process_id,
					name: `${x.process_name || x.user_name || ''}${x.department_name ? ' - ' + x.department_name : ''}`,
					type: x.type || 1,
				}));

				const directors = tuList.filter((x: any) => x.role === 'director').map((x: any) => ({
					processId: x.process_id,
					name: `${x.process_name || x.user_name || ''}${x.department_name ? ' - ' + x.department_name : ''}`,
					type: x.type || 1,
				}));

				const supporters = tuList.filter((x: any) => x.role === 'supporter').map((x: any) => ({
					processId: x.process_id,
					name: `${x.process_name || x.user_name || ''}${x.department_name ? ' - ' + x.department_name : ''}`,
					type: x.type || 1,
				}));

				const viewers = tuList.filter((x: any) => x.role === 'viewer').map((x: any) => ({
					processId: x.process_id,
					name: `${x.process_name || x.user_name || ''}${x.department_name ? ' - ' + x.department_name : ''}`,
					type: x.type || 1,
				}));

				const assignerStr = tuList.filter((x: any) => x.role === 'assigner').map((x: any) => x.process_name || x.user_name).join(', ');
				const directorStr = tuList.filter((x: any) => x.role === 'director').map((x: any) => x.process_name || x.user_name).join(', ');
				const supporterStr = tuList.filter((x: any) => x.role === 'supporter').map((x: any) => x.process_name || x.user_name).join(', ');
				const viewerStr = tuList.filter((x: any) => x.role === 'viewer').map((x: any) => x.process_name || x.user_name).join(', ');

				const creator = userMap.get(String(task.created_by));
				const updater = userMap.get(String(task.updated_by));

				const typeTaskKey = task.type_task || 'general';
				const typeTaskText = typeTaskVn[typeTaskKey] || 'Công việc chung';

				const progressVal = Number(task.progress || 0);

				const firstDirectorDep = tuList.find((x: any) => x.role === 'director' && x.department_name)?.department_name || null;

				const progressObj = buildProgressView({
					progress: task.progress,
					processStatus: task.process_status,
					endDate: task.end_date,
					updatedAt: task.updated_at,
					slowReason: task.slow_reason,
				} as any);

				const flagSvg = task.priority === 'Gấp' ? RED_FLAG_SVG : WHITE_FLAG_SVG;
				const processStatusUi = this.taskService.mapProcessStatusToHtml(String(task.process_status)) || '';

				return {
					id: task.id,
					name: task.name,
					code: task.code,
					startDate: task.start_date ? formatDate(task.start_date) : null,
					endDate: task.end_date ? formatDate(task.end_date) : null,
					priority: task.priority || 'Bình thường',
					typeTask: typeTaskKey,
					templateId: task.template_id || null,
					reminderTime: task.reminder_time || '1_day',
					note: task.note || '',
					progress: String(progressVal),
					createdBy: creator ? {
						id: creator.id,
						name: creator.name,
						email: null,
					} : null,
					updatedBy: updater ? {
						id: updater.id,
						name: updater.name,
					} : null,
					updatedAt: task.updated_at ? formatDateTime(task.updated_at) : null,
					createdAt: task.created_at ? formatDateTime(task.created_at) : null,
					taskUsers: taskUsersFormatted,
					parent: task.parent || null,
					processStatus: String(task.process_status || '1'),
					projectId: task.project_id || null,
					project: null,
					dependentTaskId: task.dependent_task_id || null,
					isApprovalRequired: task.is_approval_required !== false,
					assigners,
					directors,
					supporters,
					viewers,
					flags: {
						hideDelete: false,
						hideAdd: true,
						isAssignWork: false,
						isAssigner: false,
						hasChildren: false,
					},
					slowReason: task.slow_reason || null,
					flag: flagSvg,
					assigner: assignerStr,
					director: directorStr,
					supporter: supporterStr,
					viewer: viewerStr,
					typeTaskText,
					templateName: null,
					processName: null,
					processStatusUi,
					progressView: progressObj.html,
					progressColor: progressObj.color,
					isDeadlineExceeded: progressObj.isDeadlineExceeded,
					startDateTooltip: null,
					endDateTooltip: null,
					startDateNotHTML: task.start_date ? formatDate(task.start_date) : null,
					endDateNotHTML: task.end_date ? formatDate(task.end_date) : null,
					startDateISO: task.start_date ? new Date(task.start_date).toISOString() : null,
					endDateISO: task.end_date ? new Date(task.end_date).toISOString() : null,
					projectStartDate: null,
					projectEndDate: null,
					deadlineStartParent: null,
					deadlineEndParent: null,
					parentDirector: firstDirectorDep || 'Phòng Chính trị',
				};
			});
		}

		return {
			data,
			total,
			page: pageNum,
			limit: limitNum,
			totalPages: Math.ceil(total / limitNum) || 0,
		};
	}

	async getMediumAlerts(userId: string) {
		return this.getCachedData(
			`dash:medium:alerts:${userId}`,
			() => this.getMediumAlertsFromDb(userId),
			'refresh-medium-alerts',
			{ userId },
		);
	}

	async getMediumAlertsFromDb(userId: string) {
		let departmentId = this.getDepartmentIdByUserId(userId);

		if (!departmentId) {
			const rs = await this.dataSource.query(`
        SELECT parent as departmentId
        FROM ${this.dbname}.users
        WHERE id = @0
      `, [userId]);
			departmentId = rs?.[0]?.departmentId;
		}

		// =======================
		// 1. SỐ YÊU CẦU PHÊ DUYỆT (GỘP)
		// =======================
		const pendingRs = await this.dataSource.query(`
      DECLARE @userId NVARCHAR(100) = @0;

      SELECT COUNT(*) total FROM (

        -- Work items
        SELECT CAST(id AS NVARCHAR(100)) id
        FROM ${this.dbname}.work_items
        WHERE state = 'open'
          AND assignee_user_id = @userId

        UNION ALL

        -- Task
        SELECT CAST(id AS NVARCHAR(100))
        FROM ${this.dbname}.task
        WHERE approval_status = 0
          AND created_by = @userId

        UNION ALL

        -- Vehicle (uniqueidentifier)
        SELECT CAST(id AS NVARCHAR(100))
        FROM ${this.dbname}.vehicle_registrations
        WHERE status = 1
          AND created_by = @userId

        UNION ALL

        -- Passport
        SELECT CAST(id AS NVARCHAR(100))
        FROM ${this.dbname}.passport_borrow_requests
        WHERE status = N'Chờ phê duyệt'
          AND requester_id = @userId

      ) x
    `, [userId]);

		const pendingCount = pendingRs?.[0]?.total || 0;

		// =======================
		// 2. VĂN BẢN QUÁ HẠN
		// =======================
		const overdueRs = await this.dataSource.query(`
      DECLARE @deptId NVARCHAR(100) = @0;

      SELECT 
        SUM(CASE WHEN type = 'IN' THEN 1 ELSE 0 END) incoming,
        SUM(CASE WHEN type = 'OUT' THEN 1 ELSE 0 END) outgoing
      FROM (
          SELECT 'IN' type
          FROM ${this.dbname}.incomming_documents
          WHERE receiver_unit = @deptId
            AND deadline < GETDATE()
            AND status != 0

          UNION ALL

          SELECT 'OUT' type
          FROM ${this.dbname}.outgoing_documents
          WHERE sender_unit = @deptId
            AND deadline_reply < GETDATE()
            AND status != 0
      ) x
    `, [departmentId]);

		const incoming = overdueRs?.[0]?.incoming || 0;
		const outgoing = overdueRs?.[0]?.outgoing || 0;
		const totalOverdue = incoming + outgoing;

		// =======================
		// 3. NHÂN VIÊN CHẬM TIẾN ĐỘ
		// =======================
		const slowUsersRs = await this.dataSource.query(`
      DECLARE @deptId NVARCHAR(100) = @0;

      SELECT DISTINCT 
        u.name,
        t.name AS taskName
      FROM ${this.dbname}.task t
      JOIN ${this.dbname}.task_users tu ON tu.task_id = t.id
      JOIN ${this.dbname}.users u ON u.id = tu.process_id
      WHERE u.parent = @deptId
        AND t.end_date < GETDATE()
        AND t.process_status NOT IN ('4','5')
    `, [departmentId]);

		// remove duplicate user
		const uniqueUsersMap = new Map<string, string>(); // name -> task
		for (const row of slowUsersRs) {
			if (!uniqueUsersMap.has(row.name)) {
				uniqueUsersMap.set(row.name, row.taskName);
			}
		}

		const slowUsers = Array.from(uniqueUsersMap.entries());

		// =======================
		// BUILD ALERT JSON
		// =======================
		const alerts: any[] = [];

		// Alert 1
		if (pendingCount > 0) {
			alerts.push({
				id: 'alert-1',
				text: `${pendingCount} yêu cầu phê duyệt`,
				emphasis: true,
				suffix: 'đang chờ xử lý',
			});
		}

		// Alert 2
		if (totalOverdue > 0) {
			alerts.push({
				id: 'alert-2',
				text: `${totalOverdue} văn bản`,
				emphasis: true,
				suffix: 'quá hạn cần xem ngay',
				// nếu muốn hiển thị chi tiết:
				// detail: `${incoming} đến + ${outgoing} đi`
			});
		}

		// Alert 3
		if (slowUsers.length > 0) {
			const names = slowUsers.map(([name]) => name);

			// giới hạn hiển thị đẹp
			let displayNames = '';
			if (names.length <= 3) {
				displayNames = names.join(', ');
			} else {
				displayNames = `${names.slice(0, 3).join(', ')} và ${names.length - 3} người khác`;
			}

			const taskName = slowUsers[0]?.[1] || '';

			alerts.push({
				id: 'alert-3',
				text: `${displayNames} đang`,
				emphasis: false,
				suffix: `chậm tiến độ công việc ${taskName}`,
				suffixEmphasis: true,
			});
		}

		return alerts;
	}
	async getMediumEmployeeStatus(userId: string) {
		return this.getCachedData(
			`dash:medium:employeeStatus:${userId}`,
			() => this.getMediumEmployeeStatusFromDb(userId),
			'refresh-medium-employee-status',
			{ userId },
		);
	}

	async getMediumEmployeeStatusFromDb(userId: string) {
		// 1. Lấy tất cả task của phòng
		const tasks: any[] = await this.dataSource.query(`
      DECLARE @userId NVARCHAR(100) = @0;
      DECLARE @deptId NVARCHAR(100);
      SELECT @deptId = parent FROM ${this.dbname}.users WHERE id = @userId;

      WITH users_of_dept AS (
        SELECT id, name
        FROM ${this.dbname}.users
        WHERE parent = @deptId
      ),
      task_of_dept AS (
        SELECT DISTINCT t.*, tu.process_id, tu.process_name, tu.role
        FROM ${this.dbname}.task t
        JOIN ${this.dbname}.task_users tu ON tu.task_id = t.id
        WHERE tu.process_id IN (SELECT id FROM users_of_dept)
      )
      SELECT * FROM task_of_dept
    `, [userId]);

		// 2. Lấy thống kê VB
		const documentStats = await this.dataSource.query(`
      DECLARE @userId NVARCHAR(100) = @0;
      DECLARE @deptId NVARCHAR(100);
      SELECT @deptId = parent FROM ${this.dbname}.users WHERE id = @userId;

      WITH users_of_dept AS (
        SELECT id
        FROM ${this.dbname}.users
        WHERE parent = @deptId
      ),
      docs AS (
        SELECT 
          a.document_id,
          a.stage_status,
          a.deadline,
          a.created_at,
          ROW_NUMBER() OVER (
            PARTITION BY a.document_id 
            ORDER BY a.created_at DESC, a.id DESC
          ) AS rn
        FROM ${this.dbname}.audit a WITH (NOLOCK)
        WHERE a.receiver IN (SELECT id FROM users_of_dept)
          AND a.created_at >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
          AND a.created_at < DATEADD(MONTH, 1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
      )
      SELECT
        SUM(CASE WHEN stage_status = 'DA_XU_LY' THEN 1 ELSE 0 END
            + CASE WHEN stage_status IN ('CHUA_XU_LY','DANG_XU_LY') 
                  AND (deadline IS NULL OR deadline >= GETDATE()) THEN 1 ELSE 0 END
            + CASE WHEN stage_status <> 'DA_XU_LY' 
                  AND deadline < GETDATE() THEN 1 ELSE 0 END
        ) AS total_doc,
        SUM(CASE WHEN stage_status = 'DA_XU_LY' THEN 1 ELSE 0 END) AS doc_done,
        SUM(CASE WHEN stage_status IN ('CHUA_XU_LY','DANG_XU_LY') 
                AND (deadline IS NULL OR deadline >= GETDATE()) THEN 1 ELSE 0 END) AS doc_pending,
        SUM(CASE WHEN stage_status <> 'DA_XU_LY' 
                AND deadline < GETDATE() THEN 1 ELSE 0 END) AS doc_overdue
      FROM docs
      WHERE rn = 1;
    `, [userId]);

		const tabs = [
			{ id: 'chiso', label: 'CHỈ SỐ PHÒNG' },
			{ id: 'dang', label: 'ĐANG THỰC HIỆN', badge: { value: 0, color: '#2364B0', bgColor: "#2196F31A" } },
			{ id: 'sap', label: 'SẮP ĐẾN HẠN', badge: { value: 0, color: '#FF990A', bgColor: "#FF990A1A" } },
			{ id: 'cham', label: 'CHẬM TIẾN ĐỘ', badge: { value: 0, color: '#EF5350', bgColor: "#EF53501A" } },
		];
		const doingTab = tabs[1] as any;
		const upcomingTab = tabs[2] as any;
		const lateTab = tabs[3] as any;

		const activeRows: any[] = [];
		const upcomingRows: any[] = [];
		const delayedRows: any[] = [];
		const resourceMap: Record<string, { name: string; totalDoneOnTime: number; totalTasks: number }> = {};

		let totalTasks = 0;
		let completedTasks = 0;
		let onTimeTasks = 0;

		const now = new Date();
		const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase();
		const avatarColors = ['blue', 'cyan', 'purple', 'pink', 'emerald', 'amber'];

		tasks.forEach((task, idx) => {
			const progress = Number(task.progress);
			const endDate = new Date(task.end_date);
			const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

			if (task.process_status === '8' || Number(task.process_status) === 8) return;

			totalTasks++;
			if (progress === 100) completedTasks++;
			if (progress === 100 && diffDays >= 0) onTimeTasks++;

			const uid = task.process_id || 'unknown';
			if (!resourceMap[uid]) resourceMap[uid] = { name: task.process_name || 'Unknown', totalDoneOnTime: 0, totalTasks: 0 };
			if (progress === 100 && diffDays >= 0) resourceMap[uid].totalDoneOnTime++;
			resourceMap[uid].totalTasks++;

			const progressColor = progress >= 90 ? 'green' : progress >= 75 ? 'teal' : 'orange';

			if (progress < 100) {
				const row = {
					id: `task-${task.id}`,
					initials: getInitials(task.process_name || 'Unknown'),
					avatarColor: avatarColors[idx % avatarColors.length],
					name: task.process_name || 'Unknown',
					role: task.role || 'N/A',
					task: task.name,
					progress,
					progressColor,
					statusText: '',
					statusType: '',
				};

				if (diffDays < 0) {
					row.statusText = `Chậm ${Math.abs(diffDays)} ngày`;
					row.statusType = 'late';
					delayedRows.push(row);
					lateTab.badge.value++;
				} else if (diffDays <= 7) {
					row.statusText = `Còn ${diffDays} ngày`;
					row.statusType = 'warn';
					upcomingRows.push(row);
					upcomingTab.badge.value++;
				} else {
					row.statusText = 'Đang xử lý';
					row.statusType = 'ok';
					activeRows.push(row);
					doingTab.badge.value++;
				}
			}
		});

		const totalBadge = doingTab.badge.value + upcomingTab.badge.value + lateTab.badge.value;

		const stackedBar = {
			title: 'CÔNG VIỆC THEO TRẠNG THÁI',
			segments: [
				{ id: 'doing', label: 'Đang thực hiện', value: doingTab.badge.value, width: totalBadge ? +((doingTab.badge.value / totalBadge) * 100).toFixed(1) : 0, color: '#2364B0' },
				{ id: 'near-deadline', label: 'Sắp đến hạn', value: upcomingTab.badge.value, width: totalBadge ? +((upcomingTab.badge.value / totalBadge) * 100).toFixed(1) : 0, color: '#FFA60080' },
				{ id: 'late', label: 'Chậm tiến độ', value: lateTab.badge.value, width: totalBadge ? +((lateTab.badge.value / totalBadge) * 100).toFixed(1) : 0, color: '#EF535080' },
			],
		};

		const resourceRows = Object.entries(resourceMap)
			.map(([id, r]) => {
				const percent = r.totalTasks ? Math.round((r.totalDoneOnTime / r.totalTasks) * 100) : 0;
				return { id, name: r.name, percent, color: percent >= 90 ? 'green' : percent >= 75 ? 'teal' : 'orange' };
			})
			.sort((a, b) => b.percent - a.percent);

		const d = documentStats?.[0] || {};
		const docPercent = d.total_doc ? Math.round((d.doc_done / d.total_doc) * 100) : 0;

		const bigStats = [
			{ id: 'on-time', value: totalTasks ? `${Math.round((onTimeTasks / totalTasks) * 100)}%` : '0%', color: '#2364B0', label: 'HOÀN THÀNH ĐÚNG HẠN', subLabel: 'Mục tiêu 85%' },
			{ id: 'done', value: `${completedTasks}`, color: '#F3CA79', label: 'CÔNG VIỆC XONG', subLabel: `/ ${totalTasks} tổng` },
			{ id: 'docs', value: `${docPercent}%`, color: '#EBA0A1', label: 'VĂN BẢN XỬ LÝ', subLabel: `${d.doc_done || 0} / ${d.total_doc || 0}` },
		];

		return {
			tabs,
			stackedBar,
			bigStats,
			resourceTitle: 'PHÂN BỔ NGUỒN LỰC',
			resourceRows,
			activeRows,
			upcomingRows,
			delayedRows,
		};
	}

	private async computeMediumFilteredList(userId: string) {
		// CHẠY SONG SONG QUERY LẤY ROLES CỦA USER NGAY TỪ ĐẦU ĐỂ TỐI ƯU
		const userGroupsPromise = this.dataSource.query(`
			SELECT gu.code
			FROM ${this.dbname}.user_group_users ugu
			JOIN ${this.dbname}.group_users gu ON gu.id = ugu.group_user_id
			WHERE ugu.user_id = @0 AND gu.status = 1
		`, [userId]);

		let departmentId = this.getDepartmentIdByUserId(userId);

		if (!departmentId) {
			const rs = await this.dataSource.query(`
				SELECT parent as departmentId
				FROM ${this.dbname}.users
				WHERE id = @0
      `, [userId]);
			departmentId = rs?.[0]?.departmentId;
		}
		// =======================
		// 1. LẤY TOÀN BỘ YÊU CẦU TRONG PHÒNG
		// =======================
		// Old query:
		// const rows = await this.dataSource.query(` ... `);
		// Aligned query matching getStatsMediumFromDb:
		const rows = await this.dataSource.query(`
			DECLARE @deptId NVARCHAR(100) = @0;

			WITH users_of_dept AS (
				SELECT id, name
				FROM ${this.dbname}.users
				WHERE parent = @deptId
			),

			latest_audit AS (
				SELECT 
					document_id,
					receiver,
					stage_status,
					created_at,
					created_by,
					deadline,
					type_document,
					ROW_NUMBER() OVER (
						PARTITION BY document_id, receiver 
						ORDER BY created_at DESC, id DESC
					) AS rn
				FROM ${this.dbname}.audit WITH (NOLOCK)
				WHERE receiver IN (SELECT id FROM users_of_dept)
			),

		docs AS (
			SELECT 
				CAST(a.document_id AS NVARCHAR(100)) AS id,
				u.name AS sender,
				a.created_at,
				a.deadline,

				CASE 
					WHEN inc.document_id IS NOT NULL AND outg.document_id IS NULL THEN inc.abstract_note
					WHEN outg.document_id IS NOT NULL AND inc.document_id IS NULL THEN outg.abstract_note
					ELSE N'Văn bản'
				END AS title,

				CASE 
					WHEN inc.document_id IS NOT NULL AND outg.document_id IS NULL THEN N'📥'
					WHEN outg.document_id IS NOT NULL AND inc.document_id IS NULL THEN N'📄'
					ELSE N'📄'
				END AS icon,

				CASE 
					WHEN inc.document_id IS NOT NULL AND outg.document_id IS NULL THEN N'Văn bản đến'
					WHEN outg.document_id IS NOT NULL AND inc.document_id IS NULL THEN N'Văn bản đi'
					ELSE N'Văn bản'
				END AS type,

				a.receiver,

				CASE 
					WHEN inc.document_id IS NOT NULL AND outg.document_id IS NULL THEN 'VIEW_INCOMING_DOC'
					WHEN outg.document_id IS NOT NULL AND inc.document_id IS NULL THEN 'VIEW_OUTCOMING_DOC'
					ELSE 'VIEW_DOC'
				END AS [key]

			FROM latest_audit a
			LEFT JOIN users_of_dept u ON u.id = a.created_by
			LEFT JOIN ${this.dbname}.incomming_documents inc 
				ON inc.document_id = a.document_id
			LEFT JOIN ${this.dbname}.outgoing_documents outg 
				ON outg.document_id = a.document_id
			WHERE a.rn = 1
			  AND a.stage_status IN ('CHUA_XU_LY','DANG_XU_LY')
			  AND a.type_document IN ('IncommingDocument', 'IncomingDocument', 'OutgoingDocument')
		),

			tasks AS (
				SELECT 
					CAST(t.id AS NVARCHAR(100)) AS id,
					u.name AS sender,
					t.created_at,
					t.end_date AS deadline,
					t.name AS title,
					N'🖥️' AS icon,
					N'Công việc' AS type,
					tu.process_id AS receiver,
					'VIEW_TASK' AS [key]
				FROM ${this.dbname}.task t WITH (NOLOCK)
				JOIN ${this.dbname}.task_users tu WITH (NOLOCK) 
					ON tu.task_id = t.id
				LEFT JOIN ${this.dbname}.users u WITH (NOLOCK)
					ON u.id = t.created_by
				WHERE t.status = 1
				  AND t.process_status = '3'
				  AND tu.process_id IN (SELECT id FROM users_of_dept)
			),
			passports AS (
				SELECT 
				CAST(p.id AS NVARCHAR(100)) AS id,
				u.name AS sender,
				p.created_at,
				DATEADD(DAY, 3, p.created_at) AS deadline,
				p.request_code AS title,
				N'🛂' AS icon,
				N'Hộ chiếu' AS type,
				wi.assignee_user_id AS receiver,
				'VIEW_REQUEST_LIST' AS [key]
				FROM ${this.dbname}.passport_borrow_requests p
				LEFT JOIN users_of_dept u ON u.id = p.requester_id
				LEFT JOIN ${this.dbname}.work_items wi 
					ON wi.document_id = CAST(p.id AS NVARCHAR(100))
					AND wi.state = 'open'
				WHERE p.status = 'PENDING'
				AND p.is_deleted = 0
				AND wi.assignee_user_id IN (SELECT id FROM users_of_dept)
			),
			vehicles AS (
				SELECT 
				CAST(v.id AS NVARCHAR(100)) AS id,
				u.name AS sender,
				v.request_submitted_at AS created_at,
				DATEADD(DAY, 1, v.request_submitted_at) AS deadline,
				v.request_code AS title,
				N'🚗' AS icon,
				N'Đặt xe' AS type,
				wi.assignee_user_id AS receiver,
				'VIEW_VEHICLE_REGISTRATION' AS [key]
				FROM ${this.dbname}.vehicle_registrations v
				LEFT JOIN users_of_dept u ON u.id = v.created_by
				LEFT JOIN ${this.dbname}.work_items wi 
					ON wi.document_id = CAST(v.id AS NVARCHAR(100))
					AND wi.state = 'open'
				WHERE v.vehicle_state = 'CHO_DIEU_PHOI'
				AND wi.assignee_user_id IN (SELECT id FROM users_of_dept)
			)

			SELECT * FROM docs
			UNION ALL SELECT * FROM tasks
			UNION ALL SELECT * FROM vehicles
			UNION ALL SELECT * FROM passports
		`, [departmentId]);

		// =======================
		// 2. CHỜ DUYỆT CỦA TRƯỞNG PHÒNG
		// =======================
		const pendingRows = rows.filter((r: Record<string, unknown>) => r.receiver === userId);

		// =======================
		// 1.5 LẤY KẾT QUẢ ROLES & TÍNH TVP
		// =======================
		const userGroups = await userGroupsPromise;
		const userRoleCodes = userGroups.map((g: Record<string, unknown>) => g.code);

		// Lọc ra id để query
		const pendingDocIdsRaw = Array.from(new Set(pendingRows.map(r => String(r.id)))).filter(Boolean);
		let workItems: Record<string, unknown>[] = [];
		let auditHistory: Record<string, unknown>[] = [];

		if (pendingDocIdsRaw.length > 0) {
			let insertStatementsWorkItem = 'DECLARE @ids TABLE (id VARCHAR(64) PRIMARY KEY);\n';
			let insertStatementsAudit = 'DECLARE @ids TABLE (id NVARCHAR(64) PRIMARY KEY);\n';

			const chunkSize = 1000;
			for (let i = 0; i < pendingDocIdsRaw.length; i += chunkSize) {
				const chunk = pendingDocIdsRaw.slice(i, i + chunkSize);
				const tvpValues = chunk.map((id: string | number) => `('${String(id).replace(/'/g, "''")}')`).join(',');
				insertStatementsWorkItem += `INSERT INTO @ids VALUES ${tvpValues};\n`;
				insertStatementsAudit += `INSERT INTO @ids VALUES ${tvpValues};\n`;
			}

			[workItems, auditHistory] = await Promise.all([
				this.dataSource.query(`
					${insertStatementsWorkItem}

					SELECT
						wi.id,
						wi.document_id      AS documentId,
						wi.bpmn_version     AS bpmnVersion,
						wi.assignee_user_id AS assigneeUserId,
						wi.role,
						wi.node_id          AS nodeId,
						wi.state
					FROM @ids t
					INNER LOOP JOIN ${this.dbname}.work_items wi ON wi.document_id = t.id
					WHERE wi.state IN ('OPEN', 'ASSIGNED', 'open', 'Assigned')
				`),
				this.dataSource.query(`
					${insertStatementsAudit}

					SELECT
						a.id,
						a.document_id    AS documentId,
						a.role,
						a.user_id        AS userId,
						a.display_name   AS displayName,
						a.receiver,
						a.roleProcess,
						a.to_node_id     AS toNodeId,
						a.type_document  AS typeDocument,
						a.created_at     AS createdAt
					FROM @ids t
					INNER LOOP JOIN ${this.dbname}.audit a ON a.document_id = t.id
				`),
			]);

			auditHistory.sort((a, b) => new Date(b.createdAt as string | number | Date).getTime() - new Date(a.createdAt as string | number | Date).getTime());
		}

		const workItemsMap: Record<string, Record<string, unknown>[]> = {};
		workItems.forEach(wi => {
			if (wi.documentId && wi.bpmnVersion) {
				if (!workItemsMap[String(wi.documentId)]) workItemsMap[String(wi.documentId)] = [];
				workItemsMap[String(wi.documentId)].push(wi);
			}
		});

		const auditMap: Record<string, Record<string, unknown>[]> = {};
		auditHistory.forEach(a => {
			if (a.documentId) {
				if (!auditMap[String(a.documentId)]) auditMap[String(a.documentId)] = [];
				auditMap[String(a.documentId)].push(a);
			}
		});

		// =======================
		// 3. KPI + BREAKDOWN
		// =======================
		const now = new Date();
		let inTime = 0;
		let near = 0;
		let over = 0;

		const breakdownMap: Record<string, { id: string; icon: string; label: string; value: number; color: string }> = {
			'Văn bản': { id: 'docs', icon: '📄', label: 'Văn bản', value: 0, color: '#2364B0' },
			'Công việc': { id: 'it', icon: '🖥️', label: 'Công việc', value: 0, color: '#2364B0' },
			'Đặt xe': { id: 'car', icon: '🚗', label: 'Đặt xe', value: 0, color: '#2364B0' },
			'Hộ chiếu': { id: 'passport', icon: '🛂', label: 'Hộ chiếu', value: 0, color: '#2364B0' },
		};

		// Tính toán số liệu thống kê chung cho tất cả các task thuộc department
		rows.forEach(r => {
			const deadline = r.deadline ? new Date(r.deadline) : null;

			let diff = 999;
			if (deadline) {
				diff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
			}

			if (diff < 0) over++;
			else if (diff <= 3) near++;
			else inTime++;

			let typeKey = r.type;
			if (typeKey?.includes('Văn bản')) typeKey = 'Văn bản';
			if (breakdownMap[typeKey]) breakdownMap[typeKey].value++;
		});

		const total = rows.length;
		const safeTotal = total || 1;

		const summary = [
			{ id: 'in-time', label: 'Trong hạn', value: inTime, percent: Math.round((inTime / safeTotal) * 100), color: 'green' },
			{ id: 'near', label: 'Sắp đến hạn', value: near, percent: Math.round((near / safeTotal) * 100), color: 'orange' },
			{ id: 'over', label: 'Quá hạn', value: over, percent: Math.round((over / safeTotal) * 100), color: 'red' },
		];

		const breakdown = Object.values(breakdownMap).map((b) => ({
			id: b.id,
			icon: b.icon,
			label: b.label,
			value: b.value,
			percent: Math.round((b.value / safeTotal) * 100),
			color: b.color,
		}));

		// =======================
		// 4. LIST DATA (TỐI ƯU: Chỉ tính toán BPMN Actions nặng nề cho các rows thuộc về User hiện tại)
		// =======================
		const bpmnModelCache: Record<string, Promise<{ definitions: BpmnDefinitions; process: BpmnProcess; indexes: BpmnIndexes }>> = {};
		const roleUsersCache: Record<string, Promise<UserInfo[]>> = {};

		const list = await Promise.all(pendingRows.map(async (r: Record<string, unknown>) => {
			const created = new Date(r.created_at as string | number | Date);
			const deadline = r.deadline ? new Date(r.deadline as string | number | Date) : null;

			let diff = 999;
			if (deadline) {
				diff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
			}

			let deadlineColor = 'green';
			if (diff < 0) deadlineColor = 'red';
			else if (diff <= 3) deadlineColor = 'orange';

			const isOverdue = diff < 0;

			let approveLabel = 'Phê duyệt';
			if (r.type === 'Văn bản' || (typeof r.type === 'string' && r.type.includes('Văn bản'))) approveLabel = 'Ký duyệt';
			if (r.type === 'Đặt xe') approveLabel = 'Chấp nhận';

			const openWIs = r.id ? (workItemsMap[String(r.id)] || []) : [];
			const openWorkItem = openWIs.find(wi => wi.assigneeUserId === userId || userRoleCodes.includes(wi.role));

			const availableActions: Record<string, unknown>[] = [];
			let flags: Record<string, unknown> = {};

			if (openWorkItem && r.id) {
				try {
					const version = String(openWorkItem.bpmnVersion || '');
					if (version && !bpmnModelCache[version]) {
						bpmnModelCache[version] = (async () => {
							const xml = await this.runtimeDbService.getBpmnFileorRelate(version);
							const model = await this.bpmnEngine.loadBpmnFromString(xml);
							const indexes = this.bpmnEngine.buildIndexes(model.process);
							return { ...model, indexes };
						})();
					}

					const modelData = await bpmnModelCache[version];

					if (version && modelData) {
						let docTypeForBpmn = 'IncommingDocument';
						const typeStr = String(r.type || '').toLowerCase();
						if (typeStr.includes('công việc')) docTypeForBpmn = 'Task';
						else if (typeStr.includes('hộ chiếu')) docTypeForBpmn = 'PassportBorrowRequest';
						else if (typeStr.includes('đặt xe')) docTypeForBpmn = 'VehicleRegistration';
						else if (r.key === 'VIEW_OUTCOMING_DOC') docTypeForBpmn = 'OutGoingDocument';

						const res = await this.bpmnEngine.computeAvailableActions({
							process: modelData.process,
							indexes: modelData.indexes,
							currentNodeId: String(openWorkItem.nodeId || ''),
							workItem: openWorkItem as Record<string, unknown>,
							document: { id: r.id, typeDocument: docTypeForBpmn },
							userId: userId,
							getUsersByRole: async (role) => {
								if (!roleUsersCache[role]) {
									roleUsersCache[role] = this.sqlsvRepo.getUsersByRoleMongoDB(role);
								}
								return roleUsersCache[role];
							},
							audit: (auditMap[String(r.id)] || []).map((a: Record<string, unknown>) => ({
								...a,
								role: a.role as string | undefined,
								userId: a.userId as string | undefined,
								displayName: a.displayName as string | undefined,
								receiver: a.receiver as string | undefined,
								roleProcess: a.roleProcess as string | undefined,
								toNodeId: a.toNodeId as string | undefined,
								typeDocument: a.typeDocument as string | undefined,
							})),
						});
						res.availableActions.forEach((act: Record<string, unknown>) => availableActions.push(act));
						flags = res.flags;
					}
				} catch (e) {
					this.logger.error(`Lỗi tính toán BPMN Actions cho ${r.id}: ${e.message}`);
				}
			}

			return {
				id: r.id,
				passportRequestId: r.id,
				documentId: r.id,
				recordId: r.id,
				isIncomming: String(r.type || '').toLowerCase().includes('incomingdocument') || String(r.type || '').includes('đến'),
				documentType: r.type,
				key: r.key,
				typeIcon: r.icon,
				sender: r.sender || 'N/A',
				sentAt: created.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
				title: r.title,
				approveLabel,
				overdue: isOverdue,
				overdueText: isOverdue ? `Quá hạn ${Math.abs(diff)} ngày` : '',
				deadlineColor,
				diff,
				sortTime: created.getTime(),
				openWorkItem: openWorkItem || null,
				availableActions,
				flags,
			};
		}));

		list.sort((a, b) => {
			if (a.diff < 0 && b.diff >= 0) return -1;
			if (a.diff >= 0 && b.diff < 0) return 1;
			if (a.diff <= 3 && b.diff > 3) return -1;
			if (a.diff > 3 && b.diff <= 3) return 1;
			return a.sortTime - b.sortTime;
		});

		const filteredList = list.filter(item => item.availableActions.length > 0);

		return {
			total,
			pending: filteredList.length,
			summary,
			breakdownTitle: 'PHÂN LOẠI YÊU CẦU',
			breakdown,
			filteredList,
		};
	}

	async getMediumApprovalsOverview(userId: string) {
		return this.getCachedData(
			`dash:medium:approvals:${userId}`,
			() => this.getMediumApprovalsOverviewFromDb(userId),
			'refresh-medium-approvals',
			{ userId },
		);
	}

	async getMediumApprovalsOverviewFromDb(userId: string) {
		const result = await this.computeMediumFilteredList(userId);
		return {
			total: result.total,
			pending: result.filteredList.length,
			summary: result.summary,
			breakdownTitle: result.breakdownTitle,
			breakdown: result.breakdown,
			list: [],
		};
	}

	async getMediumApprovalsList(
		userId: string,
		page: number = 1,
		limit: number = 5,
	) {
		const offset = (page - 1) * limit;

		// =====================================================
		// 1. Lấy phòng ban của user
		// =====================================================
		let departmentId = this.getDepartmentIdByUserId(userId);

		if (!departmentId) {
			const rs = await this.dataSource.query(
				`
				SELECT parent AS departmentId
				FROM ${this.dbname}.users
				WHERE id = @0
				`,
				[userId],
			);
			departmentId = rs?.[0]?.departmentId;
		}

		// =====================================================
		// 2. Load dashboard
		// =====================================================
			// Old Query:
			// const dashboardSql = ` ... `;
			// Aligned Query:
			const dashboardSql = `
			DECLARE @deptId NVARCHAR(100) = @0;
			DECLARE @userId NVARCHAR(100) = @1;

			WITH users_of_dept AS (
				SELECT id, name
				FROM ${this.dbname}.users
				WHERE parent = @deptId
			),

			latest_audit AS (
				SELECT
					document_id,
					created_by,
					receiver,
					deadline,
					created_at,
					stage_status,
					type_document,
					ROW_NUMBER() OVER (
						PARTITION BY document_id, receiver
						ORDER BY created_at DESC, id DESC
					) rn
				FROM ${this.dbname}.audit WITH (NOLOCK)
				WHERE receiver = @userId
			),

			docs AS (
				SELECT
					CAST(a.document_id AS NVARCHAR(100)) AS id,
					u.name AS sender,
					a.created_at,
					a.deadline,

					CASE
						WHEN inc.document_id IS NOT NULL
							AND outg.document_id IS NULL
						THEN inc.abstract_note
						WHEN outg.document_id IS NOT NULL
							AND inc.document_id IS NULL
						THEN outg.abstract_note
						ELSE N'Văn bản'
					END AS title,

					CASE
						WHEN inc.document_id IS NOT NULL
							AND outg.document_id IS NULL
						THEN N'📥'
						ELSE N'📄'
					END AS icon,

					CASE
						WHEN inc.document_id IS NOT NULL
							AND outg.document_id IS NULL
						THEN N'Văn bản đến'
						WHEN outg.document_id IS NOT NULL
							AND inc.document_id IS NULL
						THEN N'Văn bản đi'
						ELSE N'Văn bản'
					END AS type,

					a.receiver,

					CASE
						WHEN inc.document_id IS NOT NULL
							AND outg.document_id IS NULL
						THEN 'VIEW_INCOMING_DOC'
						WHEN outg.document_id IS NOT NULL
							AND inc.document_id IS NULL
						THEN 'VIEW_OUTCOMING_DOC'
						ELSE 'VIEW_DOC'
					END AS [key]

				FROM latest_audit a

				LEFT JOIN users_of_dept u
					ON u.id = a.created_by

				LEFT JOIN incomming_documents inc
					ON inc.document_id = a.document_id

				LEFT JOIN outgoing_documents outg
					ON outg.document_id = a.document_id

				WHERE a.rn = 1
				  AND a.stage_status IN ('CHUA_XU_LY','DANG_XU_LY')
				  AND a.type_document IN ('IncommingDocument', 'IncomingDocument', 'OutgoingDocument')
			),

			tasks AS (
				SELECT
					CAST(t.id AS NVARCHAR(100)) AS id,
					u.name AS sender,
					t.created_at,
					t.end_date AS deadline,
					t.name AS title,
					N'🖥️' AS icon,
					N'Công việc' AS type,
					tu.process_id AS receiver,
					'VIEW_TASK' AS [key]
				FROM task t WITH (NOLOCK)
				JOIN task_users tu WITH (NOLOCK)
					ON tu.task_id = t.id
				LEFT JOIN users u WITH (NOLOCK)
					ON u.id = t.created_by
				WHERE t.status = 1
				  AND t.process_status = '3'
				  AND tu.process_id = @userId
			),

			passports AS (
				SELECT
					CAST(p.id AS NVARCHAR(100)) AS id,
					u.name AS sender,
					p.created_at,
					DATEADD(DAY,3,p.created_at) AS deadline,
					p.request_code AS title,
					N'🛂' AS icon,
					N'Hộ chiếu' AS type,
					wi.assignee_user_id AS receiver,
					'VIEW_REQUEST_LIST' AS [key]

				FROM passport_borrow_requests p

				INNER JOIN work_items wi
					ON wi.document_id = CAST(p.id AS NVARCHAR(100))
				AND wi.state = 'open'
				AND wi.assignee_user_id = @userId

				LEFT JOIN users_of_dept u
					ON u.id = p.requester_id

				WHERE p.status='PENDING'
				AND p.is_deleted=0
			),

			vehicles AS (
				SELECT
					CAST(v.id AS NVARCHAR(100)) AS id,
					u.name AS sender,
					v.request_submitted_at AS created_at,
					DATEADD(DAY,1,v.request_submitted_at) AS deadline,
					v.request_code AS title,
					N'🚗' AS icon,
					N'Đặt xe' AS type,
					wi.assignee_user_id AS receiver,
					'VIEW_VEHICLE_REGISTRATION' AS [key]

				FROM vehicle_registrations v

				INNER JOIN work_items wi
					ON wi.document_id = CAST(v.id AS NVARCHAR(100))
				AND wi.state='open'
				AND wi.assignee_user_id=@userId

				LEFT JOIN users_of_dept u
					ON u.id = v.created_by

				WHERE v.vehicle_state='CHO_DIEU_PHOI'
			)

			SELECT *
			FROM (
				SELECT * FROM docs
				UNION ALL
				SELECT * FROM tasks
				UNION ALL
				SELECT * FROM passports
				UNION ALL
				SELECT * FROM vehicles
			) x
			ORDER BY 
				COALESCE(deadline, CAST('9999-12-31' AS DATETIME)) ASC,
				created_at ASC;
		`;

		const [pendingRows, userGroups] = await Promise.all([
			this.dataSource.query(dashboardSql, [departmentId, userId]),
			this.dataSource.query(
				`
				SELECT gu.code
				FROM ${this.dbname}.user_group_users ugu
				JOIN ${this.dbname}.group_users gu
					ON gu.id = ugu.group_user_id
				WHERE ugu.user_id = @0
				AND gu.status = 1
				`,
				[userId],
			),
		]);
		const userRoleCodes = userGroups.map((g: Record<string, unknown>) => g.code);

		// =====================================================
		// 3. Tính deadline diff & sort
		// =====================================================
		const now = new Date();

		pendingRows.forEach((r: Record<string, unknown>) => {
			const deadline = r.deadline ? new Date(String(r.deadline)) : null;
			const diff = deadline
				? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
				: 999;
			r._diff = diff;
			r._sortTime = new Date(r.created_at as string | number | Date).getTime();
		});




		// =====================================================
		// 4. Cache BPMN getUsersByRole (Local per request)
		// =====================================================
		const roleUsersCache: Record<string, Promise<UserInfo[]>> = {};
		const getUsersByRoleCached = async (role: string) => {
			if (!roleUsersCache[role]) {
				roleUsersCache[role] =
					this.sqlsvRepo.getUsersByRoleMongoDB(role);
			}
			return roleUsersCache[role];
		};

		// =====================================================
		// 5. Batch SQL dùng TVP thay IN(...) — KEY OPTIMIZATION
		// =====================================================
		const allDocIds = [
			...new Set(pendingRows.map((r: Record<string, unknown>) => String(r.id))),
		].filter(Boolean);

		let allWorkItems: Record<string, unknown>[] = [];
		let allAuditHistory: Record<string, unknown>[] = [];

		if (allDocIds.length > 0) {
			let insertStatementsWorkItem = 'DECLARE @ids TABLE (id VARCHAR(64) PRIMARY KEY);\n';
			let insertStatementsAudit = 'DECLARE @ids TABLE (id NVARCHAR(64) PRIMARY KEY);\n';

			const chunkSize = 1000;
			for (let i = 0; i < allDocIds.length; i += chunkSize) {
				const chunk = allDocIds.slice(i, i + chunkSize);
				const tvpValues = chunk.map((id: string | number) => `('${String(id).replace(/'/g, "''")}')`).join(',');
				insertStatementsWorkItem += `INSERT INTO @ids VALUES ${tvpValues};\n`;
				insertStatementsAudit += `INSERT INTO @ids VALUES ${tvpValues};\n`;
			}

			try {
				[allWorkItems, allAuditHistory] = await Promise.all([
					this.dataSource.query(`
						${insertStatementsWorkItem}

						SELECT
							wi.id,
							wi.document_id      AS documentId,
							wi.bpmn_version     AS bpmnVersion,
							wi.assignee_user_id AS assigneeUserId,
							wi.role,
							wi.node_id          AS nodeId,
							wi.state
						FROM @ids t
						INNER LOOP JOIN work_items wi ON wi.document_id = t.id
						WHERE wi.state IN ('OPEN', 'ASSIGNED', 'open', 'Assigned')
					`),
					this.dataSource.query(`
						${insertStatementsAudit}

						SELECT
							a.id,
							a.document_id    AS documentId,
							a.role,
							a.user_id        AS userId,
							a.display_name   AS displayName,
							a.receiver,
							a.roleProcess,
							a.to_node_id     AS toNodeId,
							a.type_document  AS typeDocument,
							a.created_at     AS createdAt
						FROM @ids t
						INNER LOOP JOIN audit a ON a.document_id = t.id
					`),
				]);
			} catch (err) {
				this.logger.error(`Lỗi lấy dữ liệu WorkItems / Audit: ${err.message}`);
			}
		}

		// =====================================================
		// 6. Build lookup maps
		// =====================================================
		const workItemsMap: Record<string, Record<string, unknown>[]> = {};
		allWorkItems.forEach((wi) => {
			if (wi.documentId && wi.bpmnVersion) {
				if (!workItemsMap[String(wi.documentId)]) {
					workItemsMap[String(wi.documentId)] = [];
				}
				workItemsMap[String(wi.documentId)].push(wi);
			}
		});

		const auditMap: Record<string, Record<string, unknown>[]> = {};
		allAuditHistory.forEach((a) => {
			if (a.documentId) {
				if (!auditMap[String(a.documentId)]) {
					auditMap[String(a.documentId)] = [];
				}
				auditMap[String(a.documentId)].push(a);
			}
		});

		// Sort audit desc theo createdAt
		Object.values(auditMap).forEach((arr) => {
			arr.sort(
				(a, b) =>
					new Date(b.createdAt as string | number | Date).getTime() - new Date(a.createdAt as string | number | Date).getTime(),
			);
		});

		// =====================================================
		// 7. Filter candidates có openWorkItem
		// =====================================================
		const candidates = pendingRows
			.map((r: Record<string, unknown>) => ({
				r,
				openWorkItem: (workItemsMap[String(r.id)] || []).find(
					(wi: Record<string, unknown>) =>
						wi.assigneeUserId === userId ||
						userRoleCodes.includes(String(wi.role)),
				),
			}))
			.filter((c: Record<string, unknown>) => !!c.openWorkItem || String((c.r as Record<string, unknown>)?.type || '').toLowerCase().includes('công việc'));

		// =====================================================
		// 8 & 9. Tính BPMN actions song song và Phân trang chuẩn xác
		// =====================================================
		const bpmnModelCache: Record<string, Promise<{ definitions: BpmnDefinitions; process: BpmnProcess; indexes: BpmnIndexes }>> = {};

		const validResults: Record<string, unknown>[] = [];
		const CHUNK_SIZE = 20; // Xử lý từng batch 20 để tránh nghẽn I/O
		let processedCount = 0;

		for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
			const chunk = candidates.slice(i, i + CHUNK_SIZE);

			const chunkResults = await Promise.all(
				chunk.map(async ({ r, openWorkItem }) => {
					let approveLabel = 'Phê duyệt';
					const typeStr = String(r.type || '').toLowerCase();
					if (typeStr.includes('văn bản')) approveLabel = 'Ký duyệt';
					if (typeStr.includes('đặt xe')) approveLabel = 'Chấp nhận';

					const availableActions: Record<string, unknown>[] = [];
					let flags: Record<string, unknown> = {};

					const isTask = typeStr.includes('công việc');
					let taskData: Record<string, unknown> | null = null;

					if (isTask) {
						taskData = await this.taskService.findOneApprove(Number(r.id), userId) as Record<string, unknown>;
					}

					if (openWorkItem && r.id && !isTask) {
						try {
							const version = String(openWorkItem.bpmnVersion || '');

							if (version && !bpmnModelCache[version]) {
								bpmnModelCache[version] = (async () => {
									const xml =
										await this.runtimeDbService.getBpmnFileorRelate(version);
									const model =
										await this.bpmnEngine.loadBpmnFromString(xml);
									const indexes = this.bpmnEngine.buildIndexes(
										model.process,
									);
									return { ...model, indexes };
								})();
							}

							const modelData = version
								? await bpmnModelCache[version]
								: null;

							if (version && modelData) {
								let docTypeForBpmn = 'IncommingDocument';
								if (typeStr.includes('công việc'))
									docTypeForBpmn = 'Task';
								else if (typeStr.includes('hộ chiếu'))
									docTypeForBpmn = 'PassportBorrowRequest';
								else if (typeStr.includes('đặt xe'))
									docTypeForBpmn = 'VehicleRegistration';
								else if (r.key === 'VIEW_OUTCOMING_DOC')
									docTypeForBpmn = 'OutGoingDocument';

								const res =
									await this.bpmnEngine.computeAvailableActions({
										process: modelData.process,
										indexes: modelData.indexes,
										currentNodeId: String(openWorkItem.nodeId || ''),
										workItem: openWorkItem as Record<string, unknown>,
										document: {
											id: String(r.id),
											typeDocument: docTypeForBpmn,
										},
										userId,
										getUsersByRole: getUsersByRoleCached,
										audit: (auditMap[String(r.id)] || []).map(
											(a: Record<string, unknown>) => ({
												...a,
												role: a.role as string | undefined,
												userId: a.userId as string | undefined,
												displayName: a.displayName as string | undefined,
												receiver: a.receiver as string | undefined,
												roleProcess: a.roleProcess as string | undefined,
												toNodeId: a.toNodeId as string | undefined,
												typeDocument: a.typeDocument as string | undefined,
											}),
										),
									});

								res.availableActions.forEach((act: Record<string, unknown>) =>
									availableActions.push(act),
								);
								flags = res.flags;
							}
						} catch (e) {
							this.logger.error(
								`Lỗi tính toán BPMN Actions cho ${r.id}: ${e.message}`,
							);
						}
					}

					return {
						r,
						approveLabel,
						openWorkItem,
						availableActions: isTask ? (taskData?.availableActions as Record<string, unknown>[] || []) : availableActions,
						flags: isTask ? (taskData?.flags as Record<string, unknown> || {}) : flags
					};
				}),
			);

			// Lọc các bản ghi hợp lệ
			const validChunk = chunkResults.filter(
				(res) => res.availableActions.length > 0 || String((res.r as Record<string, unknown>)?.type || '').toLowerCase().includes('công việc'),
			);

			validResults.push(...validChunk);
			processedCount += chunk.length;

			// NẾU ĐÃ GOM ĐỦ bản ghi cho trang hiện tại -> DỪNG LẠI SỚM ĐỂ TỐI ƯU
			if (validResults.length >= offset + limit) {
				break;
			}
		}

		const paginatedSlice = validResults.slice(offset, offset + limit);
		const hasMore = (processedCount < candidates.length) || (validResults.length > offset + limit);

		const paginatedList = paginatedSlice.map(
			({ r, approveLabel, openWorkItem, availableActions, flags }: {
				r: Record<string, unknown>;
				approveLabel: string;
				openWorkItem: Record<string, unknown> | null;
				availableActions: Record<string, unknown>[];
				flags: Record<string, unknown>;
			}) => ({
				id: r.id,
				passportRequestId: r.id,
				documentId: r.id,
				recordId: r.id,
				isIncomming:
					String(r.type || '').toLowerCase().includes('incomingdocument') ||
					String(r.type || '').includes('đến'),
				documentType: r.type,
				key: r.key,
				typeIcon: r.icon,
				sender: r.sender || 'N/A',
				sentAt: new Date(r.created_at as string | number | Date).toLocaleDateString('vi-VN', {
					day: '2-digit',
					month: '2-digit',
				}),
				title: r.title,
				approveLabel,
				overdue: (r._diff as number) < 0,
				overdueText:
					(r._diff as number) < 0 ? `Quá hạn ${Math.abs(r._diff as number)} ngày` : '',
				deadlineColor:
					(r._diff as number) < 0 ? 'red' : (r._diff as number) <= 3 ? 'orange' : 'green',
				diff: r._diff,
				sortTime: r._sortTime,
				openWorkItem: openWorkItem || null,
				availableActions,
				flags,
			}),
		);

		return {
			total: offset + paginatedList.length + (hasMore ? 1 : 0),
			page,
			limit,
			list: paginatedList,
		};
	}



	async getMediumDocumentsList(userId: string, queryParams: any) {
		let departmentId = this.getDepartmentIdByUserId(userId);
		if (!departmentId) {
			const rs = await this.dataSource.query(`
        SELECT parent as departmentId
        FROM ${this.dbname}.users
        WHERE id = @0
      `, [userId]);
			departmentId = rs?.[0]?.departmentId;
		}

		const filter = (queryParams?.filter || queryParams?.type || 'documents-month').toString().toLowerCase();
		const pageNum = Number(queryParams?.page) || 1;
		const limitNum = Number(queryParams?.limit) || 10;
		const offset = (pageNum - 1) * limitNum;
		const keyword = queryParams?.name || queryParams?.keyword || queryParams?.code ? `%${queryParams.name || queryParams.keyword || queryParams.code}%` : null;

		let filterCondition = '';
		if (filter === 'doc-done' || filter === 'done' || filter === 'processed') {
			filterCondition = `AND d.stage_status = 'DA_XU_LY'`;
		} else if (filter === 'doc-pending' || filter === 'pending') {
			filterCondition = `AND d.stage_status IN ('CHUA_XU_LY','DANG_XU_LY') AND (d.deadline IS NULL OR d.deadline >= GETDATE())`;
		} else if (filter === 'doc-overdue' || filter === 'overdue' || filter === 'late' || filter === 'doc-late') {
			filterCondition = `AND d.stage_status <> 'DA_XU_LY' AND d.deadline < GETDATE()`;
		} else {
			filterCondition = `AND (
				d.stage_status = 'DA_XU_LY'
				OR (d.stage_status IN ('CHUA_XU_LY','DANG_XU_LY') AND (d.deadline IS NULL OR d.deadline >= GETDATE()))
				OR (d.stage_status <> 'DA_XU_LY' AND d.deadline < GETDATE())
			)`;
		}

		let searchClause = '';
		if (keyword) {
			searchClause = `AND (d.abstract_note LIKE @1 OR d.to_book_code LIKE @1 OR d.text_symbols LIKE @1 OR CAST(d.document_id AS VARCHAR(50)) LIKE @1)`;
		}

		const baseSql = `
      DECLARE @deptId NVARCHAR(100) = @0;

      WITH users_of_dept AS (
          SELECT id
          FROM ${this.dbname}.users
          WHERE parent = @deptId
      ),
      docs AS (
          SELECT 
              a.document_id,
              a.type_document,
              a.stage_status,
              a.action_code,
              a.deadline,
              a.created_at,
              a.receiver,
              a.created_by,
              ROW_NUMBER() OVER (
                  PARTITION BY a.document_id 
                  ORDER BY a.created_at DESC, a.id DESC
              ) AS rn
          FROM ${this.dbname}.audit a WITH (NOLOCK)
          WHERE a.receiver IN (SELECT id FROM users_of_dept)
            AND a.created_at >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
            AND a.created_at < DATEADD(MONTH, 1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
      ),
      filtered_docs AS (
          SELECT 
              d.document_id AS id,
              d.document_id AS document_id,
              inc.to_book_code AS to_book_code,
              outg.text_symbols AS text_symbols,
              COALESCE(inc.abstract_note, outg.abstract_note, '') AS abstract_note,
              COALESCE(inc.document_date, outg.document_date) AS document_date,
              d.deadline AS deadline,
              d.created_at AS created_at,
              COALESCE(inc.signer, outg.report_signer) AS signer,
              d.stage_status AS status_code,
              d.type_document AS type_document,
              CASE 
                  WHEN d.type_document = 'OutGoingDocument' THEN 'outgoing'
                  ELSE 'incoming' 
              END AS docType,
              CASE 
                  WHEN d.type_document = 'OutGoingDocument' THEN N'Văn bản đi'
                  ELSE N'Văn bản đến' 
              END AS docTypeText,
              CASE 
                  WHEN d.stage_status = 'DA_XU_LY' THEN N'Đã xử lý'
                  ELSE N'Chưa xử lý'
              END AS processStatusText
          FROM docs d
          OUTER APPLY (
              SELECT TOP 1 to_book_code, abstract_note, document_date, signer
              FROM ${this.dbname}.incomming_documents WITH (NOLOCK)
              WHERE document_id = d.document_id
          ) inc
          OUTER APPLY (
              SELECT TOP 1 text_symbols, abstract_note, document_date, report_signer
              FROM ${this.dbname}.outgoing_documents WITH (NOLOCK)
              WHERE document_id = d.document_id
          ) outg
          WHERE d.rn = 1 ${filterCondition}
      )
    `;

		const countSql = `${baseSql} SELECT COUNT(*) AS total FROM filtered_docs d WHERE 1=1 ${searchClause}`;
		const dataSql = `${baseSql} SELECT * FROM filtered_docs d WHERE 1=1 ${searchClause} ORDER BY d.created_at DESC OFFSET ${offset} ROWS FETCH NEXT ${limitNum} ROWS ONLY`;

		const queryArgs = keyword ? [departmentId, keyword] : [departmentId];
		const [countRs, docs] = await Promise.all([
			this.dataSource.query(countSql, queryArgs),
			this.dataSource.query(dataSql, queryArgs),
		]);

		const total = countRs?.[0]?.total ? Number(countRs[0].total) : 0;

		const formatDate = (d: any) => {
			if (!d) return null;
			const date = new Date(d);
			const day = String(date.getDate()).padStart(2, '0');
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const year = date.getFullYear();
			return `${day}/${month}/${year}`;
		};

		const formatDateTime = (d: any) => {
			if (!d) return null;
			const date = new Date(d);
			const day = String(date.getDate()).padStart(2, '0');
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const year = date.getFullYear();
			const hours = String(date.getHours()).padStart(2, '0');
			const minutes = String(date.getMinutes()).padStart(2, '0');
			return `${day}/${month}/${year} ${hours}:${minutes}`;
		};

		const mappedData = (docs || []).map((row: any) => {
			let formattedStatus = 'Chưa xử lý';
			if (row.docType === 'incoming') {
				let actionCode = row.status_code;
				if (row.processStatusText === 'Đã xử lý') {
					actionCode = 'HOAN_THANH_VAN_BAN';
				} else if (!actionCode) {
					actionCode = 'CHUA_XU_LY';
				}
				formattedStatus = mapActionIncomingToLabel(String(actionCode));
			} else {
				let stageStatus = row.status_code;
				if (row.processStatusText === 'Đã xử lý') {
					stageStatus = 'BAN_HANH';
				} else if (!stageStatus) {
					stageStatus = 'CHUA_XU_LY';
				}
				formattedStatus = mapActionToLabel(String(stageStatus));
			}

			return {
				id: row.id,
				documentId: row.document_id,
				docType: row.docType,
				docTypeText: row.docTypeText,
				toBookCode: row.to_book_code || null,
				textSymbols: row.text_symbols || null,
				abstractNote: row.abstract_note || '',
				documentDate: row.document_date ? formatDate(row.document_date) : null,
				deadline: row.deadline ? formatDate(row.deadline) : null,
				createdAt: row.created_at ? formatDateTime(row.created_at) : null,
				signer: row.signer || null,
				statusCode: formattedStatus,
				status_code: formattedStatus,
				processStatusText: row.processStatusText,
				status: formattedStatus,
			};
		});

		return {
			data: mappedData,
			total,
			page: pageNum,
			limit: limitNum,
			totalPages: Math.ceil(total / limitNum) || 0,
		};
	}

	async getMediumDocuments(userId: string) {
		return this.getCachedData(
			`dash:medium:documents:${userId}`,
			() => this.getMediumDocumentsFromDb(userId),
			'refresh-medium-documents',
			{ userId },
		);
	}

	async getMediumDocumentsFromDb(userId: string) {
		// 1️⃣ Lấy departmentId
		let departmentId = this.getDepartmentIdByUserId(userId);
		if (!departmentId) {
			const rs = await this.dataSource.query(`
        SELECT parent as departmentId
        FROM ${this.dbname}.users
        WHERE id = @0
      `, [userId]);
			departmentId = rs?.[0]?.departmentId;
		}

		// 2️⃣ Lấy danh sách người trong phòng
		const usersOfDept = await this.dataSource.query(`
      SELECT id, name
      FROM ${this.dbname}.users
      WHERE parent = @0
    `, [departmentId]);
		const userIds = Array.from(new Set([userId, ...usersOfDept.map(u => u.id)]));
		if (!userIds.length) return { incoming: [], outgoing: [] };
		const inList = userIds.map(id => `'${id}'`).join(',');

		// 3️⃣ Lấy audit mới nhất của incoming và outgoing bằng CTE tối ưu (chỉ partition trên các documents liên quan đến user và ở trạng thái chưa xử lý/đang xử lý)
		const [incomingAudits, outgoingAudits] = await Promise.all([
			this.dataSource.query(`
        WITH doc_ids AS (
          SELECT DISTINCT a.document_id
          FROM ${this.dbname}.audit a WITH (NOLOCK)
          INNER JOIN ${this.dbname}.incomming_documents doc WITH (NOLOCK) ON a.document_id = doc.document_id
          WHERE a.receiver IN (${inList}) OR a.created_by IN (${inList})
        ),
        latest_audit AS (
          SELECT a.*, ROW_NUMBER() OVER(PARTITION BY a.document_id ORDER BY a.created_at DESC, a.id DESC) AS rn
          FROM ${this.dbname}.audit a WITH (NOLOCK)
          INNER JOIN doc_ids d ON a.document_id = d.document_id
          WHERE a.stage_status IN ('CHUA_XU_LY','DANG_XU_LY')
        )
        SELECT TOP 10
          a.*,
          u.name AS sender_name,
          r.name AS receiver_name,
          doc.urgency_level,
          doc.abstract_note,
          doc.deadline
        FROM latest_audit a
        INNER JOIN ${this.dbname}.incomming_documents doc WITH (NOLOCK) ON doc.document_id = a.document_id
        LEFT JOIN ${this.dbname}.users u WITH (NOLOCK) ON u.id = a.created_by
        LEFT JOIN ${this.dbname}.users r WITH (NOLOCK) ON r.id = a.receiver
        WHERE a.rn = 1
          AND (a.receiver IN (${inList}) OR a.created_by IN (${inList}))
        ORDER BY a.created_at DESC
      `),
			this.dataSource.query(`
        WITH doc_ids AS (
          SELECT DISTINCT a.document_id
          FROM ${this.dbname}.audit a WITH (NOLOCK)
          INNER JOIN ${this.dbname}.outgoing_documents doc WITH (NOLOCK) ON a.document_id = doc.document_id
          WHERE a.receiver IN (${inList}) OR a.created_by IN (${inList})
        ),
        latest_audit AS (
          SELECT a.*, ROW_NUMBER() OVER(PARTITION BY a.document_id ORDER BY a.created_at DESC, a.id DESC) AS rn
          FROM ${this.dbname}.audit a WITH (NOLOCK)
          INNER JOIN doc_ids d ON a.document_id = d.document_id
          WHERE a.stage_status IN ('CHUA_XU_LY','DANG_XU_LY')
        )
        SELECT TOP 10
          a.*,
          u.name AS sender_name,
          r.name AS receiver_name,
          doc.urgency_level,
          doc.status_code,
          doc.abstract_note,
          doc.deadline_reply
        FROM latest_audit a
        INNER JOIN ${this.dbname}.outgoing_documents doc WITH (NOLOCK) ON doc.document_id = a.document_id
        LEFT JOIN ${this.dbname}.users u WITH (NOLOCK) ON u.id = a.created_by
        LEFT JOIN ${this.dbname}.users r WITH (NOLOCK) ON r.id = a.receiver
        WHERE a.rn = 1
          AND (a.receiver IN (${inList}) OR a.created_by IN (${inList}))
        ORDER BY a.created_at DESC
      `)
		]);

		// 3.5️⃣ Lấy Role Codes của User hiện tại để tính actions
		const userGroups = await this.dataSource.query(`
      SELECT gu.code
      FROM ${this.dbname}.user_group_users ugu
      JOIN ${this.dbname}.group_users gu ON gu.id = ugu.group_user_id
      WHERE ugu.user_id = @0 AND gu.status = 1
    `, [userId]);
		const userRoleCodes = userGroups.map(g => g.code);

		const docIdsRaw = Array.from(new Set([
			...incomingAudits.map(a => String(a.document_id)),
			...outgoingAudits.map(a => String(a.document_id))
		])).filter(Boolean);

		// Fetch toàn bộ audit history cho các documents được hiển thị
		const auditMap: Record<string, any[]> = {};
		if (docIdsRaw.length > 0) {
			const inDocIds = docIdsRaw.map(id => `'${id}'`).join(',');
			const auditList = await this.dataSource.query(`
        SELECT 
          id,
          document_id AS documentId,
          time,
          user_id AS userId,
          display_name AS displayName,
          role,
          action_code AS actionCode,
          from_node_id AS fromNodeId,
          to_node_id AS toNodeId,
          origin_id AS originId,
          created_by AS createdBy,
          receiver,
          receiver_unit AS receiverUnit,
          group_ AS groupField,
          roleProcess,
          action,
          deadline,
          stage_status AS stageStatus,
          created_at AS createdAt,
          updated_at AS updatedAt,
          details,
          processed_by AS processedBy,
          acting_as AS actingAs,
          type_document AS typeDocument
        FROM ${this.dbname}.audit WITH (NOLOCK)
        WHERE document_id IN (${inDocIds})
        ORDER BY time ASC, created_at ASC
      `);

			auditList.forEach(ad => {
				const docId = ad.documentId;
				if (docId) {
					if (!auditMap[docId]) auditMap[docId] = [];
					auditMap[docId].push(ad);
				}
			});
		}

		const workItems = docIdsRaw.length > 0 ? await this.workItemRepo.find({
			where: { documentId: In(docIdsRaw), state: In(['OPEN', 'ASSIGNED']) },
		}) : [];

		const workItemsMap: Record<string, WorkItemEntity[]> = {};
		workItems.forEach(wi => {
			if (wi.documentId && wi.bpmnVersion) {
				if (!workItemsMap[wi.documentId]) workItemsMap[wi.documentId] = [];
				workItemsMap[wi.documentId].push(wi);
			}
		});

		const bpmnModelCache: Record<string, { definitions: BpmnDefinitions; process: BpmnProcess; indexes: any }> = {};
		const activeVersions: string[] = Array.from(new Set(workItems.map(wi => wi.bpmnVersion).filter((v): v is string => !!v)));
		await Promise.all(activeVersions.map(async (version) => {
			try {
				const xml = await this.runtimeDbService.getBpmnFile(version!);
				const model = await this.bpmnEngine.loadBpmnFromString(xml);
				const indexes = this.bpmnEngine.buildIndexes(model.process);
				bpmnModelCache[version!] = { ...model, indexes };
			} catch (e) {
				this.logger.error(`Error loading BPMN model ${version}: ${e.message}`);
			}
		}));

		// 6️⃣ Lấy mức độ khẩn từ CRM
		const crmResult = await this.dataSource.query(`
      SELECT s.code, d.title AS label, d.value
      FROM ${this.dbname}.crm_sources s
      LEFT JOIN crm_source_data d ON s.id = d.source_id
      WHERE s.status = 1 AND s.code IN ('S20')
    `);

		// Chuẩn hóa nhãn sang in hoa để khớp color map
		const urgencyMap: Record<string, string> = {};
		crmResult.forEach(c => {
			urgencyMap[c.value.toUpperCase()] = (c.label || 'Thường').toUpperCase();
		});

		const urgencyColorMap: Record<string, string> = {
			'THƯỜNG': 'normal',
			'KHẨN': 'red',
			'HỎA TỐC': 'orange-solid',
			'THƯỢNG KHẨN': 'red-solid'
		};

		// Helper để lấy nhãn + màu
		function getUrgencyInfo(level?: string) {
			const label = level ? (urgencyMap[level.toUpperCase()] || 'THƯỜNG') : 'THƯỜNG';
			const color = urgencyColorMap[label] || 'normal';
			return { label, color };
		}

		// 7️⃣ Format thời gian
		function formatTime(dateStr: string | Date): string {
			if (!dateStr) return '';
			const d = new Date(dateStr);
			const now = new Date();
			const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
			if (diffMins < 60) return `${diffMins}p`;
			if (d.toDateString() === now.toDateString()) return 'Hôm nay';
			return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
		}

		function getFormattedTime(dateStr: string | Date) {
			if (!dateStr) return null;
			const d = new Date(dateStr);
			const now = new Date();
			if (d.toDateString() === now.toDateString()) {
				return {
					day: 'Hôm nay',
					month: '',
				};
			}
			return {
				day: d.getDate(),
				month: `Tháng ${d.getMonth() + 1}`,
			};
		}

		// 8️⃣ Tách incoming / outgoing và tính Action
		const incoming = await Promise.all(incomingAudits
			.map(async (a, i) => {
				const { label: urgencyLabel, color: urgencyColor } = getUrgencyInfo(a.urgency_level);
				const deadlineText = a.deadline ? ` · Deadline: ${formatTime(a.deadline)}` : '';
				const openWIs = a.document_id ? (workItemsMap[a.document_id] || []) : [];
				const isSaoY = openWIs.some(wi => {
					if (!wi.nodeId) return false;
					if (['Activity_0cdw8az', 'Activity_0uli3ft'].includes(wi.nodeId)) return true;
					const version = wi.bpmnVersion || '';
					const modelData = bpmnModelCache[version];
					if (modelData && modelData.indexes?.nodes) {
						const node = modelData.indexes.nodes.get(wi.nodeId);
						if (node?.extensionElements?.values) {
							for (const ext of node.extensionElements.values) {
								if (ext.$type === 'camunda:properties' && ext.values) {
									if (ext.values.some((p: any) => p.name === 'isSaoY' && p.value === 'true')) {
										return true;
									}
								}
							}
						}
					}
					return false;
				});
				const statusLabel = this.mapIncomingStatus(a.action_code || '', isSaoY);

				// --- TÍNH BIỂU TƯỢNG HÀNH ĐỘNG ---
				const availableActions: any[] = [];
				let flags: any = {};
				const activeWI = openWIs.find(wi =>
					wi.assigneeUserId === userId ||
					wi.assigneeUserId === departmentId ||
					userRoleCodes.includes(wi.role)
				);

				if (activeWI && a.document_id) {
					try {
						const version = activeWI.bpmnVersion || '';
						if (!bpmnModelCache[version]) {
							const xml = await this.runtimeDbService.getBpmnFile(version);
							const model = await this.bpmnEngine.loadBpmnFromString(xml);
							const indexes = this.bpmnEngine.buildIndexes(model.process);
							bpmnModelCache[version] = { ...model, indexes };
						}
						const modelData = bpmnModelCache[version];
						if (modelData) {
							const res = await this.bpmnEngine.computeAvailableActions({
								process: modelData.process,
								indexes: modelData.indexes,
								currentNodeId: activeWI.nodeId || '',
								workItem: activeWI as any,
								document: { id: a.document_id, typeDocument: 'IncommingDocument' },
								userId,
								userRoles: userRoleCodes,
								getUsersByRole: (r: string) => this.sqlsvRepo.getUsersByRoleMongoDB(r),
								audit: (auditMap[a.document_id] || []).map((ad: any) => ({
									...ad,
									role: ad.role ?? undefined,
									userId: ad.userId ?? undefined,
									displayName: ad.displayName ?? undefined,
									receiver: ad.receiver ?? undefined,
									roleProcess: ad.roleProcess ?? undefined,
									toNodeId: ad.toNodeId ?? undefined,
									typeDocument: ad.typeDocument || 'IncommingDocument',
								})),
								userParent: departmentId,
								documentId: a.document_id,
							});
							res.availableActions.forEach((act: any) => availableActions.push(act));
							flags = res.flags;
						}
					} catch (e) {
						this.logger.error(`Lỗi tính actions VB Đến ${a.document_id}: ${e.message}`);
					}
				}

				return {
					id: `in-${i + 1}`,
					key: 'VIEW_INCOMING_DOC',
					recordId: a.document_id,
					time: getFormattedTime(a.created_at),
					title: a.abstract_note || `Văn bản #${a.document_id}`,
					from: `Từ: ${a.sender_name || 'N/A'}${deadlineText} · Trạng thái: ${statusLabel}`,
					tags: [{ id: `urgent-${i + 1}`, label: urgencyLabel, color: urgencyColor }],
					certify: ['TAO_SAO_Y', 'CHO_KY_THE_THUC'].includes((a.action_code || '').toUpperCase()),
					availableActions,
					flags,
					openWorkItem: activeWI || null,
				};
			}));

		const outgoing = await Promise.all(outgoingAudits
			.map(async (a, i) => {
				const { label: urgencyLabel, color: urgencyColor } = getUrgencyInfo(a.urgency_level);
				const deadlineText = a.deadline_reply ? ` · Deadline: ${formatTime(a.deadline_reply)}` : '';
				const statusLabel = this.mapOutgoingStatus(a.action_code);

				// --- TÍNH BIỂU TƯỢNG HÀNH ĐỘNG ---
				const availableActions: any[] = [];
				let flags: any = {};
				const openWIs = a.document_id ? (workItemsMap[a.document_id] || []) : [];
				const activeWI = openWIs.find(wi =>
					wi.assigneeUserId === userId ||
					wi.assigneeUserId === departmentId ||
					userRoleCodes.includes(wi.role)
				);

				if (activeWI && a.document_id) {
					try {
						const version = activeWI.bpmnVersion || '';
						if (!bpmnModelCache[version]) {
							const xml = await this.runtimeDbService.getBpmnFile(version);
							const model = await this.bpmnEngine.loadBpmnFromString(xml);
							const indexes = this.bpmnEngine.buildIndexes(model.process);
							bpmnModelCache[version] = { ...model, indexes };
						}
						const modelData = bpmnModelCache[version];
						if (modelData) {
							const res = await this.bpmnEngine.computeAvailableActions({
								process: modelData.process,
								indexes: modelData.indexes,
								currentNodeId: activeWI.nodeId || '',
								workItem: activeWI as any,
								document: { id: a.document_id, typeDocument: 'OutGoingDocument' },
								userId,
								userRoles: userRoleCodes,
								getUsersByRole: (r: string) => this.sqlsvRepo.getUsersByRoleMongoDB(r),
								audit: (auditMap[a.document_id] || []).map((ad: any) => ({
									...ad,
									role: ad.role ?? undefined,
									userId: ad.userId ?? undefined,
									displayName: ad.displayName ?? undefined,
									receiver: ad.receiver ?? undefined,
									roleProcess: ad.roleProcess ?? undefined,
									toNodeId: ad.toNodeId ?? undefined,
									typeDocument: ad.typeDocument || 'OutGoingDocument',
								})),
								userParent: departmentId,
								documentId: a.document_id,
							});
							res.availableActions.forEach((act: any) => availableActions.push(act));
							flags = res.flags;
						}
					} catch (e) {
						this.logger.error(`Lỗi tính actions VB Đi ${a.document_id}: ${e.message}`);
					}
				}

				return {
					id: `out-${i + 1}`,
					key: 'VIEW_OUTCOMING_DOC',
					recordId: a.document_id,
					time: getFormattedTime(a.created_at),
					title: a.abstract_note || `Văn bản #${a.document_id}`,
					from: `Gửi: ${a.receiver_name || 'N/A'}${deadlineText} · Trạng thái: ${statusLabel}`,
					tags: [{ id: `urgent-${i + 1}`, label: urgencyLabel, color: urgencyColor }],
					availableActions,
					flags,
					openWorkItem: activeWI || null,
				};
			}));

		return { incoming, outgoing };
	}

	// Hàm map trạng thái cho văn bản đến
	mapIncomingStatus(code?: string, isSaoY?: boolean): string {
		if (!code) return 'Không xác định';
		const key = code.toUpperCase();

		switch (key) {
			case 'HOAN_THANH_VAN_BAN':
				return 'Văn bản đã xử lý';
			case 'CREATE':
				return 'Văn bản tạo mới';
			case 'TRA_LAI':
				return 'Văn bản trả lại';
			case 'THU_HOI':
				return 'Văn bản thu hồi';
			case 'TAO_SAO_Y':
				return 'Văn bản đang xử lý';
			case 'TRINH_KY':
				return isSaoY ? 'Chờ ký sao y' : 'Văn bản đang chờ ký';
			default:
				return 'Văn bản đang xử lý';
		}
	}

	// Hàm map trạng thái cho văn bản đi
	mapOutgoingStatus(code?: string): string {
		if (!code) return 'Không xác định';
		const key = code.toUpperCase();

		switch (key) {
			case 'BAN_HANH':
			case 'DA_BAN_HANH':
				return 'Đã phát hành';
			case 'HOAN_THANH':
				return 'Văn bản đã xử lý';
			case 'CREATE':
				return 'Dự thảo';
			case 'TRA_LAI':
				return 'Trả lại';
			case 'THU_HOI':
				return 'Văn bản thu hồi';
			case 'KY_NHAY_NOI_DUNG':
			case 'CHO_KY_NOI_DUNG':
				return 'Chờ ký nội dung';
			case 'KY_NHAY_THE_THUC':
			case 'CHO_KY_THE_THUC':
				return 'Chờ ký thể thức';
			case 'CHO_KY_BAN_HANH':
				return 'Chờ ký phê duyệt';
			case 'KY_NHAY':
			case 'CHO_KY_NHAY':
			case 'DA_KY_NHAY':
				return 'Chờ ký nháy';
			case 'CHO_KY_CHINH_THUC':
				return 'Chờ ký chính thức';
			case 'KIEM_TRA_THE_THUC':
			case 'TRINH_KIEM_TRA_TT':
				return 'Chờ kiểm tra';
			case 'CAN_CHO_SO':
			case 'DA_CHO_SO':
			case 'DE_NGHI_BH':
			case 'DONG_Y_VBDT':
			case 'CHO_SO':
			case 'DONG_DAU':
			case 'KY_SO':
			case 'KY_PHAT_HANH':
				return 'Chờ phát hành';
			case 'CHO_DONG_DAU':
				return 'Chờ đóng dấu';
			case 'DA_DONG_DAU':
				return 'Đã đóng dấu';
			default:
				return 'Văn bản đang xử lý';
		}
	}

	async getMediumHeatmap(userId: string) {
		return this.getCachedData(
			`dash:medium:heatmap:${userId}`,
			() => this.getMediumHeatmapFromDb(userId),
			'refresh-medium-heatmap',
			{ userId },
		);
	}

	async getMediumHeatmapFromDb(userId: string) {
		let departmentId = this.getDepartmentIdByUserId(userId);

		if (!departmentId) {
			const rs = await this.dataSource.query(`
        SELECT parent as departmentId
        FROM ${this.dbname}.users
        WHERE id = @0
      `, [userId]);

			departmentId = rs?.[0]?.departmentId;
		}

		const rows = await this.dataSource.query(`
      SET DATEFIRST 1; -- Monday = 1

      DECLARE @deptId NVARCHAR(100) = @0;

      -- ===== USERS =====
      WITH users_of_dept AS (
          SELECT id
          FROM ${this.dbname}.users
          WHERE parent = @deptId
      ),

      -- ===== TASK =====
      task_of_dept AS (
          SELECT DISTINCT t.*
          FROM ${this.dbname}.task t
          JOIN ${this.dbname}.task_users tu 
              ON tu.task_id = t.id
          WHERE tu.process_id IN (SELECT id FROM users_of_dept)
      ),

      -- ===== 28 ngày gần nhất =====
      dates AS (
          SELECT TOP 28 
              CAST(DATEADD(DAY, -ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) + 1, GETDATE()) AS DATE) AS d
          FROM master..spt_values
      ),

      -- ===== tất cả T2 → CN =====
      all_days AS (
          SELECT 
              d,
              DATEPART(WEEKDAY, d) AS weekday,
              DATEDIFF(WEEK, d, GETDATE()) AS week_index
          FROM dates
      ),

      -- ===== workload =====
      stats AS (
          SELECT 
              w.week_index,
              w.weekday,

              COUNT(CASE 
                  WHEN t.process_status = '4' 
                  AND CAST(t.update_at AS DATE) = w.d
                  THEN 1 END) * 1.0
              /
              NULLIF(COUNT(CASE 
                  WHEN CAST(t.end_date AS DATE) = w.d
                  THEN 1 END), 0) * 100 AS workload

          FROM all_days w
          LEFT JOIN task_of_dept t
              ON CAST(t.end_date AS DATE) = w.d
              OR CAST(t.update_at AS DATE) = w.d

          GROUP BY w.week_index, w.weekday
      )

      SELECT 
          week_index,
          weekday, -- 1 → 7 (T2 → CN)
          ISNULL(ROUND(workload, 0), 0) AS workload
      FROM stats
      ORDER BY week_index DESC, weekday;
    `, [departmentId]);

		// ===== build matrix 4 x 7 =====
		const weekMap: Record<number, number[]> = {};

		rows.forEach((r: any) => {
			const w = r.week_index;
			const d = r.weekday; // 1–7

			if (!weekMap[w]) {
				weekMap[w] = [0, 0, 0, 0, 0, 0, 0];
			}

			weekMap[w][d - 1] = r.workload;
		});

		// lấy 4 tuần gần nhất
		const values = Object.keys(weekMap)
			.map(Number)
			.sort((a, b) => a - b) // tuần cũ → mới
			.slice(0, 4)
			.map((k) => weekMap[k]);
		const heatmapWeeks = values.map((_, index) => `Tuần ${index + 1}`);

		return {
			days: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
			heatmapWeeks,
			values,
		};
	}

	async getMediumProjects(userId: string) {
		return this.getCachedData(
			`dash:medium:projects:${userId}`,
			() => this.getMediumProjectsFromDb(userId),
			'refresh-medium-projects',
			{ userId },
		);
	}

	async getMediumProjectsFromDb(userId: string) {
		let departmentId = this.getDepartmentIdByUserId(userId);

		if (!departmentId) {
			const rs = await this.dataSource.query(`
        SELECT parent as departmentId
        FROM ${this.dbname}.users
        WHERE id = @0
      `, [userId]);

			departmentId = rs?.[0]?.departmentId;
		}

		const rows = await this.dataSource.query(`
      DECLARE @deptId NVARCHAR(100) = @0;

      WITH users_of_dept AS (
          SELECT id
          FROM ${this.dbname}.users
          WHERE parent = @deptId
      ),
      tasks_of_dept AS (
          SELECT DISTINCT t.*
          FROM ${this.dbname}.task t
          JOIN ${this.dbname}.task_users tu 
              ON tu.task_id = t.id
          WHERE tu.process_id IN (SELECT id FROM users_of_dept)
      ),
      projects AS (
          SELECT *
          FROM tasks_of_dept
          WHERE type_task = 'project'
      ),
      project_stats AS (
          SELECT 
              p.id,
              p.name,
              p.start_date,
              p.end_date,
              p.process_status,
              AVG(CAST(t.progress AS FLOAT)) AS progress,
              COUNT(DISTINCT tu.process_id) AS total_members
          FROM projects p
          LEFT JOIN tasks_of_dept t 
              ON t.project_id = p.project_id
          LEFT JOIN ${this.dbname}.task_users tu
              ON tu.task_id = t.id
          GROUP BY 
              p.id, p.name, p.start_date, p.end_date, p.process_status
      )
      SELECT *
      FROM project_stats
      ORDER BY start_date DESC
    `, [departmentId]);

		const today = new Date();

		return rows.map((p: any) => {
			const start = p.start_date ? new Date(p.start_date) : null;
			const end = p.end_date ? new Date(p.end_date) : null;
			const progress = Math.round(p.progress || 0);

			// Tính expected progress
			let expected = 0;
			if (start && end && end > start) {
				const total = end.getTime() - start.getTime();
				const done = today.getTime() - start.getTime();
				expected = Math.min(100, Math.max(0, (done / total) * 100));
			}

			// Xác định trạng thái + màu chữ
			let statusType = 'ok';
			let statusText = 'Đang thực hiện';
			let progressColor = 'teal'; // mặc định cho Đang thực hiện

			if (p.process_status === '4') {
				statusType = 'done';
				statusText = 'Hoàn thành';
				progressColor = 'green';
			} else if (end && end < today) {
				statusType = 'late';
				statusText = 'Quá hạn';
				progressColor = 'red';
			} else if (progress >= expected) {
				statusType = 'ok';
				statusText = 'Đang thực hiện';
				progressColor = 'teal';
			} else {
				statusType = 'risk';
				statusText = 'Chậm tiến độ';
				progressColor = 'orange';
			}

			return {
				id: p.id,
				key: 'VIEW_PROJECT',
				recordId: p.id,
				name: p.name,
				statusType,
				statusText,
				dateRange: `📅 ${start ? start.toLocaleDateString('vi-VN') : '--'} – ${end ? end.toLocaleDateString('vi-VN') : '--'}`,
				membersText: `👤 ${p.total_members || 0} người`,
				memberHighlight: '',
				progress,
				progressColor,
			};
		});
	}

	async getMediumMeetings(userId: string) {
		return this.getCachedData(
			`dash:medium:meetings:${userId}`,
			() => this.getMediumMeetingsFromDb(userId),
			'refresh-medium-meetings',
			{ userId },
		);
	}

	async getMediumMeetingsFromDb(userId: string) {
		const now = new Date();
		const startOfWeek = new Date(now);
		startOfWeek.setDate(now.getDate() - now.getDay() + 1);
		startOfWeek.setHours(0, 0, 0, 0);

		const endOfWeek = new Date(startOfWeek);
		endOfWeek.setDate(startOfWeek.getDate() + 6);
		endOfWeek.setHours(23, 59, 59, 999);

		const meetings = await this.dataSource.query(`
      SELECT m.id AS meetingId,
            m.title,
            m.meeting_date,
            m.meeting_time,
            m.room_ids,
            m.meeting_mode,
            mu.id AS meetingUnitId,
            mp.participant_role,
            mp.participant_state
      FROM ${this.dbname}.meetings m
      INNER JOIN ${this.dbname}.meeting_units mu
        ON mu.meeting_id = m.id
      INNER JOIN ${this.dbname}.meeting_participants mp
        ON mp.meeting_unit_id = mu.id
      WHERE (mp.user_id = @0 OR mp.delegated_to_user_id = @0)
        AND m.status = '1'
        AND (m.is_template = 0 OR m.is_template IS NULL)
        AND EXISTS (
          SELECT 1
          FROM ${this.dbname}.audit a WITH (NOLOCK)
          WHERE a.type_document = 'MEETING'
            AND a.document_id = TRY_CONVERT(NVARCHAR(64), m.id)
            AND a.stage_status IN ('DONG_Y_PHE_DUYET', 'BI_HUY')
        )
        AND m.meeting_date BETWEEN @1 AND @2
      ORDER BY m.meeting_date ASC, m.meeting_time ASC
    `, [userId, startOfWeek.toISOString().slice(0, 10), endOfWeek.toISOString().slice(0, 10)]);

		let actionsByMeetingId = new Map<
			string,
			{
				availableActions: any[];
				flags: Record<string, any>;
				workItem?: any;
				openWorkItem?: any;
			}
		>();
		try {
			actionsByMeetingId =
				await this.meetingService.getAvailableActionsForDashboardMeetings(
					Array.from(new Set(meetings.map((m: any) => String(m.meetingId)))),
					userId,
				);
		} catch (error) {
			this.logger.warn(
				'Khong tinh duoc availableActions cho dashboard medium meetings: ' +
				error.message,
			);
		}

		const roomIds = Array.from(new Set(
			meetings
				.flatMap(m => m.room_ids?.split(',') || [])
				.filter(Boolean)
		));

		let roomsMap: Record<string, string> = {};
		if (roomIds.length) {
			const rooms = await this.dataSource.query(`
        SELECT id, name
        FROM ${this.dbname}.meeting_rooms
        WHERE id IN (SELECT value FROM OPENJSON(@0))
      `, [JSON.stringify(roomIds)]);

			roomsMap = rooms.reduce((acc, r) => {
				acc[r.id] = r.name;
				return acc;
			}, {} as Record<string, string>);
		}

		const meetingIds = Array.from(new Set(meetings.map(m => String(m.meetingId))));
		const participantsCountMap: Record<string, number> = {};
		if (meetingIds.length) {
			const participants = await this.dataSource.query(`
        SELECT meeting_id, COUNT(*) AS total
        FROM ${this.dbname}.meeting_participants mp
        INNER JOIN ${this.dbname}.meeting_units mu
          ON mu.id = mp.meeting_unit_id
        WHERE mu.meeting_id IN (SELECT value FROM OPENJSON(@0))
        GROUP BY mu.meeting_id
      `, [JSON.stringify(meetingIds)]);

			participants.forEach((p: any) => {
				participantsCountMap[p.meeting_id] = Number(p.total);
			});
		}

		const grouped: Record<string, any> = {};
		const dayNames = ['CHỦ NHẬT', 'THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU', 'THỨ BẢY'];

		meetings.forEach(m => {
			const meetingDate = new Date(m.meeting_date);
			const dayKey = meetingDate.toISOString().slice(0, 10);
			const isToday = meetingDate.toDateString() === now.toDateString();

			if (!grouped[dayKey]) {
				const separator = isToday
					? `HÔM NAY, ${meetingDate.getDate().toString().padStart(2, '0')}/${(meetingDate.getMonth() + 1).toString().padStart(2, '0')}`
					: `${dayNames[meetingDate.getDay()]}, ${meetingDate.getDate().toString().padStart(2, '0')}/${(meetingDate.getMonth() + 1).toString().padStart(2, '0')}`;
				grouped[dayKey] = { id: dayKey, separator, items: [] };
			}

			const time = m.meeting_time?.split('-')[0] || '';

			let actionType: string | undefined;
			let actionLabel: string | undefined;
			let secondaryActionLabel: string | undefined;

			if (m.participant_state === 'RECEIVED') {
				actionType = 'respond';
				actionLabel = 'Xác nhận';
				secondaryActionLabel = 'Từ chối';
			} else if (['CONFIRMED', 'DONE', 'PROCESSING'].includes(m.participant_state)) {
				actionType = 'join';
				actionLabel = 'Tham gia';
			}

			const locations = (m.room_ids?.split(',') || [])
				.map(id => roomsMap[id])
				.filter(Boolean);
			const locationDisplay = locations.length
				? '📍 ' + locations.join(', ')
				: m.meeting_mode === 'ONLINE' ? 'Online' : '🏢 Hội trường';

			const totalPeople = participantsCountMap[m.meetingId] || 0;

			let roleLabel = 'Tham gia';
			if (m.participant_role === 'CHAIRMAN') roleLabel = 'Chủ trì';
			else if (m.participant_role === 'SECRETARY') roleLabel = 'Thư ký';
			const item: any = {
				id: m.meetingId,
				key: 'VIEW_MEETING_ROOM',
				recordId: m.meetingId,
				time,
				dayLabel: isToday ? 'Hôm nay' : `${meetingDate.getDate().toString().padStart(2, '0')}/${(meetingDate.getMonth() + 1).toString().padStart(2, '0')}`,
				title: m.title,
				blockColor: ['CONFIRMED', 'DONE', 'PROCESSING'].includes(m.participant_state) ? '#2364B0' : '#DDE0E4',
				meta: `${locationDisplay} · ⏱ ${m.meeting_time || ''} · 👥 ${totalPeople} người · ${roleLabel || ''}`,
				availableActions:
					actionsByMeetingId.get(String(m.meetingId))?.availableActions || [],
				flags: actionsByMeetingId.get(String(m.meetingId))?.flags || {},
				workItem: actionsByMeetingId.get(String(m.meetingId))?.workItem || null,
				openWorkItem: actionsByMeetingId.get(String(m.meetingId))?.openWorkItem || null,
				status: m.participant_state,
			};

			if (actionType) item.actionType = actionType;
			if (actionLabel) item.actionLabel = actionLabel;
			if (secondaryActionLabel) item.secondaryActionLabel = secondaryActionLabel;

			grouped[dayKey].items.push(item);
		});

		return Object.values(grouped);
	}

	async getMediumUpcomingEvents() {
		return this.getCachedData(
			'dash:medium:upcomingEvents',
			() => this.getMediumUpcomingEventsFromDb(),
			'refresh-medium-upcoming-events',
		);
	}

	async getMediumUpcomingEventsFromDb() {
		const events = await this.dataSource.query(`
      SELECT TOP 10 *
      FROM news_calendar
      WHERE startTime >= GETDATE() AND status = 1
      ORDER BY startTime ASC
    `);

		return events.map((e: any, idx: number) => {
			const start = new Date(e.startTime);
			const end = e.endTime ? new Date(e.endTime) : null;

			const day = start.getDate().toString().padStart(2, '0');
			const month = `THG ${start.getMonth() + 1}`.toUpperCase();
			const time = end
				? `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')} – ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`
				: `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;

			return {
				id: `ev-${idx + 1}`,
				day,
				month,
				color: this.getEventColor(e.type),
				title: e.title,
				time,
				location: e.location || '',
			};
		});
	}

	/** Gán màu theo loại sự kiện */
	private getEventColor(type?: string): string {
		if (!type) return 'gray';
		const key = type.toLowerCase();
		if (key.includes('hội nghị')) return 'red';
		if (key.includes('workshop')) return 'teal';
		if (key.includes('đào tạo')) return 'orange';
		return 'blue';
	}

	async getMediumUtilityRequests(userId: string) {
		return this.getCachedData(
			`dash:medium:utilityRequests:${userId}`,
			() => this.getMediumUtilityRequestsFromDb(userId),
			'refresh-medium-utility-requests',
			{ userId },
		);
	}

	async getMediumUtilityRequestsFromDb(userId: string) {
		let departmentId = this.getDepartmentIdByUserId(userId);

		if (!departmentId) {
			const rs = await this.dataSource.query(`
        SELECT parent as departmentId
        FROM ${this.dbname}.users
        WHERE id = @0
      `, [userId]);
			departmentId = rs?.[0]?.departmentId;
		}

		const dbDate = `MONTH(created_at) = MONTH(GETDATE()) AND YEAR(created_at) = YEAR(GETDATE())`;

		// =======================
		// 1. LẤY HỘ CHIẾU
		// =======================
		const passportQuery = `
      SELECT 
        SUM(CASE WHEN is_deleted = 0 AND status IN ('PENDING', 'WAIT_APPROVE') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN is_deleted = 0 AND ${dbDate} THEN 1 ELSE 0 END) as total_month,
        SUM(CASE WHEN is_deleted = 0 AND ${dbDate} AND status IN ('WAIT_SIGN', 'WAIT_RECEIVE', 'COMPLETED', 'APPROVED') THEN 1 ELSE 0 END) as approved_month
      FROM ${this.dbname}.passport_borrow_requests
      WHERE created_by IN (SELECT id FROM ${this.dbname}.users WHERE parent = @0)
    `;
		const passportStats = (await this.dataSource.query(passportQuery, [departmentId]))?.[0] || {};

		// =======================
		// 2. LẤY ĐẶT XE
		// =======================
		const vehicleQuery = `
      SELECT 
        SUM(CASE WHEN vehicle_state = 'CHO_DIEU_PHOI' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN ${dbDate} THEN 1 ELSE 0 END) as total_month,
        SUM(CASE WHEN ${dbDate} AND vehicle_state IN ('DA_PHAN_CONG', 'TRONG_TIEN_TRINH', 'HOAN_THANH') THEN 1 ELSE 0 END) as approved_month
      FROM ${this.dbname}.vehicle_registrations
      WHERE department IN (@0)
    `;
		const vehicleStats = (await this.dataSource.query(vehicleQuery, [departmentId]))?.[0] || {};

		// =======================
		// 3. Phản ánh (Feedback)
		// =======================
		const feedbackStatusMap: Record<string, number[]> = {
			'CREATE': [FEEDBACK_STATUS.WAITING_DISPATCH],
			'RESUBMIT': [FEEDBACK_STATUS.WAITING_DISPATCH],
			'REJECT_UNIT_TO_DISPATCHER': [FEEDBACK_STATUS.WAITING_DISPATCH],
			'DISPATCH': [FEEDBACK_STATUS.WAITING_PROCESS],
			'REDISPATCH': [FEEDBACK_STATUS.WAITING_PROCESS],
			'ACCEPT': [FEEDBACK_STATUS.PROCESSING],
			'COMPLETE': [FEEDBACK_STATUS.COMPLETED],
			'REJECT_DISPATCH': [FEEDBACK_STATUS.REJECTED],
			'REJECT_UNIT_TO_CREATOR': [FEEDBACK_STATUS.REJECTED],
		};

		// --- Card: chờ điều phối
		const dispatchStatuses = [
			...feedbackStatusMap['CREATE'],
			...feedbackStatusMap['RESUBMIT'],
			...feedbackStatusMap['REJECT_UNIT_TO_DISPATCHER'],
		];

		// Tạo placeholders cho từng status
		const dispatchPlaceholders = dispatchStatuses.map((_, i) => `@${i}`).join(',');

		// Thêm departmentId vào cuối mảng params
		const feedbackCardParams = [...dispatchStatuses, departmentId];

		const feedbackCardQuery = `
      SELECT COUNT(*) as pending
      FROM ${this.dbname}.feedback_suggestions
      WHERE process_status IN (${dispatchPlaceholders})
        AND unit_id IN (SELECT id FROM ${this.dbname}.users WHERE parent = @${dispatchStatuses.length})
    `;

		const feedbackCard = (await this.dataSource.query(feedbackCardQuery, feedbackCardParams))?.[0] || {};

		// --- Thống kê tháng: chờ xử lý
		const processStatuses = [
			...feedbackStatusMap['DISPATCH'],
			...feedbackStatusMap['REDISPATCH'],
		];

		const processPlaceholders = processStatuses.map((_, i) => `@${i}`).join(',');
		const feedbackStatsParams = [...processStatuses, departmentId];

		const feedbackStatsQuery = `
      SELECT 
        SUM(CASE WHEN ${dbDate} THEN 1 ELSE 0 END) as total_month,
        SUM(CASE WHEN ${dbDate} AND process_status IN (${processPlaceholders}) THEN 1 ELSE 0 END) as done_month
      FROM ${this.dbname}.feedback_suggestions
      WHERE unit_id IN (SELECT id FROM ${this.dbname}.users WHERE parent = @${processStatuses.length})
    `;

		const feedbackStats = (await this.dataSource.query(feedbackStatsQuery, feedbackStatsParams))?.[0] || {};

		// =======================
		// 4. Build JSON UI
		// =======================
		return {
			actions: {
				quickOperation: [
					{
						id: 'task-management',
						label: 'Quản lý công việc',
						icon: 'task',
						color: '#2364B0',
						key: 'VIEW_TASK_MANAGEMENT',
					},
					{
						id: 'incoming-documents',
						label: 'Văn bản đến',
						icon: 'inbox',
						color: '#2364B0',
						key: 'VIEW_INCOMING_DOCUMENTS',
					},
					{
						id: 'outgoing-documents',
						label: 'Văn bản đi',
						icon: 'send',
						color: '#2364B0',
						key: 'VIEW_OUTGOING_DOCUMENTS',
					},
					{
						id: 'personal-calendar',
						label: 'Lịch họp',
						icon: 'calendar',
						color: '#2364B0',
						key: 'VIEW_PERSONAL_CALENDAR',
					},
				],
				pinnedWidgets: [
					// {
					// 	id: 'contacts',
					// 	label: 'Danh bạ',
					// 	icon: 'contacts',
					// 	color: '#2364B0',
					// 	key: 'VIEW_CONTACTS',
					// },
					{
						id: 'car',
						icon: 'car',
						color: '#2364B0',
						label: 'Đăng ký xe',
						key: 'VIEW_BOOK_A_CAR',
						badge: {
							value: vehicleStats.pending || 0,
							color: (vehicleStats.pending || 0) > 0 ? 'orange' : 'green',
						},
					},
					{
						id: 'passport',
						color: '#2364B0',
						icon: 'passport',
						label: 'Hộ chiếu',
						key: 'VIEW_PASSPORT',
						badge: {
							value: passportStats.pending || 0,
							color: (passportStats.pending || 0) > 0 ? 'orange' : 'green',
						},
					},
					{
						id: 'feedback',
						icon: 'feedback',
						color: '#2364B0',
						label: 'Phản ánh',
						key: 'VIEW_FEEDBACK',
						badge: {
							value: feedbackCard.pending || 0,
							color: (feedbackCard.pending || 0) > 0 ? 'orange' : 'green',
						},
					},
				]
			}
			,
			statsTitle: 'THỐNG KÊ THÁNG NÀY',
			stats: [
				{
					id: 'car-stat',
					label: 'Tổng yêu cầu / Đã duyệt',
					values: [
						{ text: `${vehicleStats.total_month || 0}`, color: 'navy' },
						{ text: `${vehicleStats.approved_month || 0}`, color: 'green' },
					],
				},
				{
					id: 'passport-stat',
					label: 'Tổng yêu cầu / Đã làm',
					values: [
						{ text: `${passportStats.total_month || 0}`, color: 'navy' },
						{ text: `${passportStats.approved_month || 0}`, color: 'teal' },
					],
				},
				{
					id: 'feedback-stat',
					label: 'Đã giải quyết / Đang chờ',
					values: [
						{ text: `${feedbackStats.done_month || 0}`, color: 'orange' },
						{ text: `${feedbackStats.total_month || 0 - feedbackStats.done_month || 0}`, color: 'red' },
					],
				},
			],
		};
	}

	async getMediumNews() {
		return this.getCachedData(
			'dash:medium:news',
			() => this.getMediumNewsFromDb(),
			'refresh-medium-news',
		);
	}

	async getMediumNewsFromDb() {
		const newsList: any[] = await this.dataSource.query(`
      SELECT TOP 10
        n.id AS news_id,
        n.title AS news_title,
        n.thumbnail AS news_thumbnail,
        (
          SELECT TOP 1 fr.file_id
          FROM ${this.dbname}.file_relations fr WITH (NOLOCK)
          INNER JOIN ${this.dbname}.files f WITH (NOLOCK) ON fr.file_id = f.id
          WHERE fr.object_id = CAST(n.id AS VARCHAR(50))
            AND fr.object_type = 'news'
            AND fr.status = 1
            AND f.status = 1
          ORDER BY fr.created_at DESC
        ) AS thumbnail_id,
        n.publishedAt AS news_publishedAt,
        n.viewCount AS news_viewCount,
        n.topic AS news_topic
      FROM ${this.dbname}.news n
      WHERE EXISTS (
        SELECT 1 FROM ${this.dbname}.audit a
        WHERE a.document_id = CAST(n.id AS VARCHAR(50))
          AND a.action_code = 'DUYET'
          AND a.type_document = 'NEWS'
      )
      AND NOT EXISTS (
        SELECT 1 FROM ${this.dbname}.audit a
        WHERE a.document_id = CAST(n.id AS VARCHAR(50))
          AND a.action_code = 'RECALL'
          AND a.type_document = 'NEWS'
      )
      ORDER BY n.publishedAt DESC
    `);

		const result = await Promise.all(
			newsList.map(async (news) => {
				// Lấy số lượt like
				const [likes] = await this.dataSource.query(
					`SELECT COUNT(1) AS totalLikes 
          FROM ${this.dbname}.news_like 
          WHERE objectId = @0 AND type='NEWS' AND isLike=1`,
					[news.news_id]
				);
				// Lấy số comment
				const [comments] = await this.dataSource.query(
					`SELECT COUNT(1) AS totalComments 
          FROM ${this.dbname}.news_comment 
          WHERE newsId = @0`,
					[news.news_id]
				);

				const dateObj = new Date(news.news_publishedAt);
				const day = String(dateObj.getDate()).padStart(2, '0');
				const month = String(dateObj.getMonth() + 1).padStart(2, '0');

				// chọn icon theo topic
				let icon = '📰';
				if (news.news_topic?.includes('D50519B0')) icon = '🏆';
				else if (news.news_topic?.includes('8051405F')) icon = '🎁';

				const thumbnailVal = news.thumbnail_id || news.news_thumbnail;
				let imageUrl: string | null = null;
				if (thumbnailVal) {
					if (String(thumbnailVal).startsWith('http') || String(thumbnailVal).startsWith('/') || String(thumbnailVal).includes('.')) {
						imageUrl = thumbnailVal;
					} else {
						imageUrl = `/files/view/${thumbnailVal}`;
					}
				}

				return {
					id: news.news_id,
					// key: 'VIEW_NEWS_DXB',
					key: 'NEWS_DETAIL',
					recordId: news.news_id,
					icon,
					title: news.news_title,
					reactions: [
						`❤️ ${likes?.totalLikes || 0}`,
						`👁 ${news.news_viewCount || 0}`,
						`💬 ${comments?.totalComments || 0}`
					],
					date: `${day}/${month}`,
					image: imageUrl,
					thumbnail: imageUrl,
				};
			})
		);

		return result;
	}

	/**
	 * API mới: Đếm số lượng Văn bản đến, Văn bản đi, Công việc QLCV
	 * Theo yêu cầu nghiệp vụ:
	 *
	 * Văn bản đến:
	 * - Lãnh đạo: Chờ chỉ đạo + Chờ xử lý (phối hợp) + Nhận để biết
	 * - Khác: Chờ xử lý + Phối hợp + Nhận để biết (menu xử lý)
	 *
	 * Văn bản đi:
	 * - Tài khoản Văn thư: Chờ phát hành + Chờ đóng dấu + Chờ kiểm tra thể thức
	 * - Khác: Tổng các văn bản chờ xử lý
	 *
	 * QLCV (Công việc chung + Công việc từ văn bản + Công việc từ cuộc họp + Công việc từ dự án):
	 * - Người chủ trì/Người phối hợp của cv cha/con đang ở trạng thái:
	 *   CV mới / Đang thực hiện / Chờ phê duyệt / Điều chỉnh
	 */
	async getDocumentTaskCount(userId: string, authorId?: string, authority?: string): Promise<{
		incomingDocuments: {
			totalWaiting: number;
			waitingDirective: number;
			waitingProcessLeader: number;
			coordinationLeader: number;
			receiveToKnowLeader: number;
			waitingProcessOther: number;
			coordinationOther: number;
			receiveToKnowOther: number;
		};
		outgoingDocuments: {
			totalWaiting: number;
			waitingPublish: number;
			waitingStamp: number;
			waitingFormatCheck: number;
		};
		tasks: {
			commonTasks: number;
			taskFromDocument: number;
			taskFromMeeting: number;
			taskFromProject: number;
		};
	}> {
		try {
			// Override userId nếu có authority mode
			const effectiveUserId = authority === 'true' && authorId ? authorId : userId;

			// Lấy thông tin user để xác định vai trò
			const userInfo = await this.dataSource.query(`
				SELECT u.id, u.parent AS departmentId, gu.code AS groupCode
				FROM ${this.dbname}.users u
				LEFT JOIN ${this.dbname}.user_group_users ugu ON ugu.user_id = u.id
				LEFT JOIN ${this.dbname}.group_users gu ON gu.id = ugu.group_user_id
				WHERE u.id = @0
			`, [effectiveUserId]);

			const departmentId = userInfo?.[0]?.departmentId || null;
			const groupCode = userInfo?.[0]?.groupCode || '';

			// Kiểm tra xem có phải Lãnh đạo không
			const isLeader = ['tonggd', 'phogdtongcty'].includes(groupCode);

			// Kiểm tra xem có phải Văn thư không
			const isVanThu = ['vanthutct', 'vtphong'].includes(groupCode);

			// ========================
			// 1. ĐẾM VĂN BẢN ĐẾN
			// ========================
			let incomingCounts = {
				totalWaiting: 0,
				waitingDirective: 0,
				waitingProcessLeader: 0,
				coordinationLeader: 0,
				receiveToKnowLeader: 0,
				waitingProcessOther: 0,
				coordinationOther: 0,
				receiveToKnowOther: 0,
			};

			// Query đếm văn bản đến - Tài khoản thường
			const incomingQuery = `
				SELECT
					-- Tổng chờ xử lý (processor - CHUA_XU_LY)
					SUM(CASE WHEN ia.role_process = 'processor' AND ia.stage_status = 'CHUA_XU_LY' THEN 1 ELSE 0 END) AS waitingProcess,

					-- Phối hợp (supporter - CHUA_XU_LY)
					SUM(CASE WHEN ia.role_process = 'supporter' AND ia.stage_status = 'CHUA_XU_LY' THEN 1 ELSE 0 END) AS coordination,

					-- Nhận để biết (viewer - CHUA_XU_LY)
					SUM(CASE WHEN ia.role_process = 'viewer' AND ia.stage_status = 'CHUA_XU_LY' THEN 1 ELSE 0 END) AS receiveToKnow
				FROM ${this.dbname}.incomming_documents idoc WITH (NOLOCK)
				INNER JOIN ${this.dbname}.incomming_assignment ia WITH (NOLOCK)
					ON ia.document_id = idoc.document_id
				WHERE idoc.status = 1
					AND ia.receiver = @0
			`;

			const incomingResult = await this.dataSource.query(incomingQuery, [effectiveUserId]);
			if (incomingResult?.[0]) {
				incomingCounts.waitingProcessOther = Number(incomingResult[0].waitingProcess || 0);
				incomingCounts.coordinationOther = Number(incomingResult[0].coordination || 0);
				incomingCounts.receiveToKnowOther = Number(incomingResult[0].receiveToKnow || 0);
				incomingCounts.totalWaiting = incomingCounts.waitingProcessOther +
					incomingCounts.coordinationOther + incomingCounts.receiveToKnowOther;
			}

			// Query đếm văn bản đến - Lãnh đạo (chờ chỉ đạo)
			if (isLeader) {
				const leaderIncomingQuery = `
					-- Chờ chỉ đạo: Lãnh đạo có assignment với role 'processor' và stage_status = 'CHUA_XU_LY'
					-- hoặc Lãnh đạo là người nhận trong audit với stage_status liên quan
					SELECT
						SUM(CASE WHEN ia.role_process = 'processor' AND ia.stage_status = 'CHUA_XU_LY' THEN 1 ELSE 0 END) AS waitingDirective,
						SUM(CASE WHEN ia.role_process = 'supporter' AND ia.stage_status = 'CHUA_XU_LY' THEN 1 ELSE 0 END) AS coordinationLeader,
						SUM(CASE WHEN ia.role_process = 'viewer' AND ia.stage_status = 'CHUA_XU_LY' THEN 1 ELSE 0 END) AS receiveToKnowLeader
					FROM ${this.dbname}.incomming_documents idoc WITH (NOLOCK)
					INNER JOIN ${this.dbname}.incomming_assignment ia WITH (NOLOCK)
						ON ia.document_id = idoc.document_id
					WHERE idoc.status = 1
						AND ia.receiver = @0
				`;

				const leaderResult = await this.dataSource.query(leaderIncomingQuery, [effectiveUserId]);
				if (leaderResult?.[0]) {
					incomingCounts.waitingDirective = Number(leaderResult[0].waitingDirective || 0);
					incomingCounts.waitingProcessLeader = incomingCounts.waitingDirective; // Cùng điều kiện
					incomingCounts.coordinationLeader = Number(leaderResult[0].coordinationLeader || 0);
					incomingCounts.receiveToKnowLeader = Number(leaderResult[0].receiveToKnowLeader || 0);
				}
			}

			// ========================
			// 2. ĐẾM VĂN BẢN ĐI
			// ========================
			let outgoingCounts = {
				totalWaiting: 0,
				waitingPublish: 0,
				waitingStamp: 0,
				waitingFormatCheck: 0,
			};

			if (isVanThu) {
				// Văn thư: đếm theo các trạng thái riêng
				const vanThuQuery = `
					SELECT
						-- Chờ phát hành: status_code = 'DE_NGHI_BH' hoặc stage liên quan
						SUM(CASE WHEN oda.action_code = 'DE_NGHI_BH' OR oda.stage_status = 'DE_NGHI_BH' THEN 1 ELSE 0 END) AS waitingPublish,

						-- Chờ đóng dấu: stage_status = 'CHO_DONG_DAU'
						SUM(CASE WHEN oda.stage_status = 'CHO_DONG_DAU' THEN 1 ELSE 0 END) AS waitingStamp,

						-- Chờ kiểm tra thể thức: status_code = '1' và chưa qua các bước trên
						SUM(CASE WHEN oda.stage_status = 'CHUA_XU_LY' AND oda.action_code NOT IN ('DE_NGHI_BH', 'CHO_DONG_DAU') THEN 1 ELSE 0 END) AS waitingFormatCheck
					FROM ${this.dbname}.outgoing_documents odoc WITH (NOLOCK)
					LEFT JOIN ${this.dbname}.audit oda WITH (NOLOCK)
						ON oda.document_id = odoc.document_id
						AND oda.id = (
							SELECT TOP 1 a2.id
							FROM ${this.dbname}.audit a2
							WHERE a2.document_id = odoc.document_id
							ORDER BY a2.id DESC
						)
					WHERE odoc.status = 1
						AND (oda.receiver = @0 OR odoc.drafter = @0)
				`;

				const vanThuResult = await this.dataSource.query(vanThuQuery, [effectiveUserId]);
				if (vanThuResult?.[0]) {
					outgoingCounts.waitingPublish = Number(vanThuResult[0].waitingPublish || 0);
					outgoingCounts.waitingStamp = Number(vanThuResult[0].waitingStamp || 0);
					outgoingCounts.waitingFormatCheck = Number(vanThuResult[0].waitingFormatCheck || 0);
					outgoingCounts.totalWaiting = outgoingCounts.waitingPublish +
						outgoingCounts.waitingStamp + outgoingCounts.waitingFormatCheck;
				}
			} else {
				// Tài khoản khác: đếm tất cả chờ xử lý
				const otherUserQuery = `
					SELECT COUNT(DISTINCT odoc.document_id) AS totalWaiting
					FROM ${this.dbname}.outgoing_documents odoc WITH (NOLOCK)
					INNER JOIN ${this.dbname}.audit oda WITH (NOLOCK)
						ON oda.document_id = odoc.document_id
						AND oda.id = (
							SELECT TOP 1 a2.id
							FROM ${this.dbname}.audit a2
							WHERE a2.document_id = odoc.document_id
							ORDER BY a2.id DESC
						)
					WHERE odoc.status = 1
						AND oda.receiver = @0
						AND oda.stage_status IN ('CHUA_XU_LY', 'CHO_KY_NOI_DUNG', 'CHO_KY_THE_THUC',
							'CHO_KY_BAN_HANH', 'CHO_KY_NHAY', 'CHO_KY_CHINH_THUC',
							'CHO_XAC_NHAN', 'CHO_THAM_DINH', 'CHO_DONG_DAU', 'DE_NGHI_BH')
				`;

				const otherResult = await this.dataSource.query(otherUserQuery, [effectiveUserId]);
				outgoingCounts.totalWaiting = Number(otherResult?.[0]?.totalWaiting || 0);
			}

			// ========================
			// 3. ĐẾM CÔNG VIỆC QLCV
			// ========================
			let taskCounts = {
				commonTasks: 0,
				taskFromDocument: 0,
				taskFromMeeting: 0,
				taskFromProject: 0,
			};

			// Trạng thái công việc cần đếm: Mới / Đang thực hiện / Chờ phê duyệt / Điều chỉnh
			// process_status: '1'=Mới, '2'=Đang xử lý, '3'=Chờ phê duyệt, '5'=Điều chỉnh
			const taskStatusCondition = `t.process_status IN ('1', '2', '3', '5')`;
			const activeStatusCondition = `t.status = 1`;

			// Query đếm công việc - Người chủ trì (director)
			const taskQuery = `
				-- Công việc chung: type_task KHÔNG phải là 'document', 'meeting', 'project'
				SELECT
					SUM(CASE WHEN tu.role = 'director' AND t.type_task NOT IN ('document', 'meeting', 'project') THEN 1 ELSE 0 END) AS commonTasks,
					SUM(CASE WHEN tu.role IN ('director', 'supporter') AND t.type_task = 'document' THEN 1 ELSE 0 END) AS taskFromDocument,
					SUM(CASE WHEN tu.role IN ('director', 'supporter') AND t.type_task = 'meeting' THEN 1 ELSE 0 END) AS taskFromMeeting,
					SUM(CASE WHEN tu.role IN ('director', 'supporter') AND t.type_task = 'project' THEN 1 ELSE 0 END) AS taskFromProject
				FROM ${this.dbname}.task t WITH (NOLOCK)
				INNER JOIN ${this.dbname}.task_users tu WITH (NOLOCK)
					ON tu.task_id = t.id
				WHERE ${activeStatusCondition}
					AND ${taskStatusCondition}
					AND tu.process_id = @0
			`;

			const taskResult = await this.dataSource.query(taskQuery, [effectiveUserId]);
			if (taskResult?.[0]) {
				taskCounts.commonTasks = Number(taskResult[0].commonTasks || 0);
				taskCounts.taskFromDocument = Number(taskResult[0].taskFromDocument || 0);
				taskCounts.taskFromMeeting = Number(taskResult[0].taskFromMeeting || 0);
				taskCounts.taskFromProject = Number(taskResult[0].taskFromProject || 0);
			}

			// Ngoài ra, đếm thêm công việc CON của user là CHỦ TRÌ hoặc PHỐI HỢP
			// (công việc con có trạng thái đang xử lý)
			const childTaskQuery = `
				SELECT
					COUNT(DISTINCT child.id) AS childTaskCount
				FROM ${this.dbname}.task t WITH (NOLOCK)
				INNER JOIN ${this.dbname}.task_users tu_parent WITH (NOLOCK)
					ON tu_parent.task_id = t.id AND tu_parent.process_id = @0
				INNER JOIN ${this.dbname}.task child WITH (NOLOCK)
					ON child.parent = t.id
				INNER JOIN ${this.dbname}.task_users tu_child WITH (NOLOCK)
					ON tu_child.task_id = child.id
				WHERE child.${activeStatusCondition.replace('t.', 'child.')}
					AND child.${taskStatusCondition.replace('t.', 'child.')}
					AND tu_child.role IN ('director', 'supporter')
					AND tu_child.process_id = @0
			`;

			const childResult = await this.dataSource.query(childTaskQuery, [effectiveUserId]);
			const childCount = Number(childResult?.[0]?.childTaskCount || 0);

			// Cộng thêm công việc con vào các loại tương ứng
			taskCounts.commonTasks += childCount;

			return {
				incomingDocuments: incomingCounts,
				outgoingDocuments: outgoingCounts,
				tasks: taskCounts,
			};
		} catch (error) {
			this.logger.error('Error in getDocumentTaskCount:', error);
			return {
				incomingDocuments: {
					totalWaiting: 0,
					waitingDirective: 0,
					waitingProcessLeader: 0,
					coordinationLeader: 0,
					receiveToKnowLeader: 0,
					waitingProcessOther: 0,
					coordinationOther: 0,
					receiveToKnowOther: 0,
				},
				outgoingDocuments: {
					totalWaiting: 0,
					waitingPublish: 0,
					waitingStamp: 0,
					waitingFormatCheck: 0,
				},
				tasks: {
					commonTasks: 0,
					taskFromDocument: 0,
					taskFromMeeting: 0,
					taskFromProject: 0,
				},
			};
		}
	}
}
