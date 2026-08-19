import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { dataDashboardPremiumStats } from './data-fake/dashboard-premium';
import { DashboardPageCacheService } from './dashboard-page-cache.service';

import { Audit } from '../database/schema-sql/audit.entity';
import { WorkItemEntity } from '../work-items/entities/work-item.entity';
import { SQLSVRepository } from '../database/sqlsvRepo';
import { RuntimeDbService } from '../bpmn/runtime-dbmssql.service';
import { BpmnEngineService, BpmnDefinitions, BpmnProcess } from '../bpmn/bpmn-engine.service';
import { ParticipantState } from 'src/meeting/entities/meeting-participant.entity';
import { TaskService } from 'src/task/task.service';
import { ConfigurationService } from 'src/view-config/configuration.service';
import { mapActionIncomingToLabel, mapActionToLabel } from 'src/documents/helpers/build.filter';
import { stageStatusMapV2 } from 'src/variable/CONST_STATUS';


@Injectable()
export class DashboardPagePremiumService implements OnModuleInit {
	private readonly logger = new Logger(DashboardPagePremiumService.name);
	private dbname: string; // db name

	constructor(
		@InjectDataSource('mssqlConnection') private readonly dataSource: DataSource,
		@InjectRepository(Audit, 'mssqlConnection')
		private readonly auditRepo: Repository<Audit>,
		@InjectRepository(WorkItemEntity, 'mssqlConnection')
		private readonly workItemRepo: Repository<WorkItemEntity>,
		private readonly bpmnEngine: BpmnEngineService,
		private readonly runtimeDbService: RuntimeDbService,
		private readonly sqlsvRepo: SQLSVRepository,
		private readonly configService: ConfigService,
		private readonly taskService: TaskService,
		private readonly cacheService: DashboardPageCacheService,
		private readonly configurationService: ConfigurationService,
	) { }


	private getDatabaseName(): string {
		const dbName = this.configService.get<string>('SQLSERVER_DATABASE');
		if (!dbName) throw new Error('SQLSERVER_DATABASE not defined in .env');
		return dbName + '.dbo';
	}

	async onModuleInit() {
		this.dbname = this.getDatabaseName();
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


	async getStatsPremium(userId: string) {
		return this.getCachedData(
			`dash:premium:stats:${userId}`,
			() => this.getStatsPremiumFromDb(userId),
			'refresh-premium-stats',
			{ userId },
		);
	}

	async getStatsPremiumFromDb(userId: string) {
		try {
			const currentMonthStr = new Date().getMonth() + 1 < 10 ? `0${new Date().getMonth() + 1}` : `${new Date().getMonth() + 1}`;

			// --- CARD 1: PERFORMANCE ---
			const p1 = this.dataSource.query(`
        SELECT 
          (SELECT COUNT(1) FROM task WITH (NOLOCK) WHERE MONTH(end_date) = MONTH(GETDATE()) AND YEAR(end_date) = YEAR(GETDATE())) AS cur_total,
          (SELECT COUNT(1) FROM task WITH (NOLOCK) WHERE process_status = '4' AND update_at <= end_date AND MONTH(end_date) = MONTH(GETDATE()) AND YEAR(end_date) = YEAR(GETDATE())) AS cur_done,
          (SELECT COUNT(1) FROM task WITH (NOLOCK) WHERE MONTH(end_date) = MONTH(DATEADD(month, -1, GETDATE())) AND YEAR(end_date) = YEAR(DATEADD(month, -1, GETDATE()))) AS prev_total,
          (SELECT COUNT(1) FROM task WITH (NOLOCK) WHERE process_status = '4' AND update_at <= end_date AND MONTH(end_date) = MONTH(DATEADD(month, -1, GETDATE())) AND YEAR(end_date) = YEAR(DATEADD(month, -1, GETDATE()))) AS prev_done
      `);

			// --- CARD 2: CEO APPROVALS ---
			const p2 = this.dataSource.query(`
        WITH PendingList AS (
            SELECT ISNULL(ia.deadline, d.deadline) as deadline
            FROM incomming_documents d WITH (NOLOCK)
            JOIN incomming_assignment ia WITH (NOLOCK) ON ia.document_id = d.document_id
            WHERE d.status = 1 AND ia.stage_status = 'CHUA_XU_LY' AND ia.receiver = @0
              AND ia.receiver IN (SELECT ugu.user_id FROM user_group_users ugu WITH (NOLOCK) JOIN group_users gu WITH (NOLOCK) ON gu.id = ugu.group_user_id WHERE gu.code = 'tonggd')
            
            UNION ALL
            
            SELECT od.deadline_reply as deadline
            FROM outgoing_documents od WITH (NOLOCK)
            JOIN audit a_out WITH (NOLOCK) ON a_out.document_id = od.document_id
            WHERE od.status = 1 AND a_out.stage_status IN ('CHUA_XU_LY', 'TRA_LAI') AND a_out.receiver = @0
              AND a_out.receiver IN (SELECT ugu.user_id FROM user_group_users ugu WITH (NOLOCK) JOIN group_users gu WITH (NOLOCK) ON gu.id = ugu.group_user_id WHERE gu.code = 'tonggd')
            
            UNION ALL
            
            SELECT t.end_date as deadline
            FROM task t WITH (NOLOCK)
            JOIN audit a_task WITH (NOLOCK) ON a_task.document_id = CAST(t.id AS NVARCHAR(64))
            WHERE t.status = 1 
              AND a_task.id = (SELECT MAX(a2.id) FROM audit a2 WITH (NOLOCK) WHERE a2.document_id = CAST(t.id AS NVARCHAR(64)))
              AND a_task.action_code IN ('GUI_PHE_DUYET', 'GUI_DIEU_CHINH', 'DIEU_CHINH')
              AND a_task.receiver = @0
              AND a_task.receiver IN (SELECT ugu.user_id FROM user_group_users ugu WITH (NOLOCK) JOIN group_users gu WITH (NOLOCK) ON gu.id = ugu.group_user_id WHERE gu.code = 'tonggd')
        )
        SELECT 
          (SELECT COUNT(1) FROM PendingList) AS total_pending,
          (SELECT COUNT(1) FROM PendingList WHERE deadline < GETDATE()) AS total_late,
          (SELECT AVG(CAST(DATEDIFF(day, created_at, updated_at) AS FLOAT)) FROM audit WITH (NOLOCK) WHERE stage_status = 'DA_XU_LY' AND MONTH(updated_at) = MONTH(GETDATE()) AND YEAR(updated_at) = YEAR(GETDATE()) AND receiver = @0 AND receiver IN (SELECT ugu.user_id FROM user_group_users ugu JOIN group_users gu ON gu.id = ugu.group_user_id WHERE gu.code = 'tonggd')) AS avg_days
      `, [userId]);

			// --- CARD 3: TOTAL EMPLOYEES ---
			const p3 = this.dataSource.query(`
        SELECT 
          (SELECT COUNT(1) FROM users WITH (NOLOCK) WHERE status = 1) AS total_active,
          (SELECT COUNT(1) FROM users WITH (NOLOCK) WHERE status = 1 AND MONTH(created_at) = MONTH(GETDATE()) AND YEAR(created_at) = YEAR(GETDATE())) AS new_hires
      `);

			// --- CARD 4: COMPANY TASKS ---
			const p4 = this.dataSource.query(`
        SELECT 
          (SELECT COUNT(1) FROM task WITH (NOLOCK) WHERE (MONTH(end_date) = MONTH(GETDATE()) AND YEAR(end_date) = YEAR(GETDATE())) OR (MONTH(created_at) = MONTH(GETDATE()) AND YEAR(created_at) = YEAR(GETDATE()))) AS total_tasks,
          (SELECT COUNT(1) FROM task WITH (NOLOCK) WHERE process_status = '4' AND ((MONTH(end_date) = MONTH(GETDATE()) AND YEAR(end_date) = YEAR(GETDATE())) OR (MONTH(created_at) = MONTH(GETDATE()) AND YEAR(created_at) = YEAR(GETDATE())))) AS total_done,
          (SELECT COUNT(1) FROM task WITH (NOLOCK) WHERE end_date < GETDATE() AND process_status != '4' AND ((MONTH(end_date) = MONTH(GETDATE()) AND YEAR(end_date) = YEAR(GETDATE())) OR (MONTH(created_at) = MONTH(GETDATE()) AND YEAR(created_at) = YEAR(GETDATE())))) AS total_late
      `);

			// --- CARD 5: DOCUMENTS ---
			// Old query (Bug: counted status != 1 as done, and did not check audit status):
			// const p5 = this.dataSource.query(`
			//   SELECT 
			//     (SELECT COUNT(1) FROM incomming_documents WITH (NOLOCK) WHERE MONTH(created_at) = MONTH(GETDATE()) AND YEAR(created_at) = YEAR(GETDATE())) AS inc_total,
			//     (SELECT COUNT(1) FROM outgoing_documents WITH (NOLOCK) WHERE MONTH(created_at) = MONTH(GETDATE()) AND YEAR(created_at) = YEAR(GETDATE())) AS out_total,
			//     (SELECT COUNT(1) FROM incomming_documents WITH (NOLOCK) WHERE status != 1 AND MONTH(created_at) = MONTH(GETDATE()) AND YEAR(created_at) = YEAR(GETDATE())) AS inc_done,
			//     (SELECT COUNT(1) FROM outgoing_documents WITH (NOLOCK) WHERE status != 1 AND MONTH(created_at) = MONTH(GETDATE()) AND YEAR(created_at) = YEAR(GETDATE())) AS out_done,
			//     (SELECT COUNT(1) FROM incomming_documents WITH (NOLOCK) WHERE status = 1 AND deadline < GETDATE() AND MONTH(created_at) = MONTH(GETDATE()) AND YEAR(created_at) = YEAR(GETDATE())) AS inc_late,
			//     (SELECT COUNT(1) FROM outgoing_documents WITH (NOLOCK) WHERE status = 1 AND deadline_reply < GETDATE() AND MONTH(created_at) = MONTH(GETDATE()) AND YEAR(created_at) = YEAR(GETDATE())) AS out_late
			// `);
			// Optimized query checking the audit table (with partition filter on created_at):
			const p5 = this.dataSource.query(`
        SELECT 
          (SELECT COUNT(1) FROM incomming_documents WITH (NOLOCK) 
           WHERE status = 1 
             AND MONTH(created_at) = MONTH(GETDATE()) AND YEAR(created_at) = YEAR(GETDATE())) AS inc_total,
          (SELECT COUNT(1) FROM outgoing_documents WITH (NOLOCK) 
           WHERE status = 1 
             AND MONTH(created_at) = MONTH(GETDATE()) AND YEAR(created_at) = YEAR(GETDATE())) AS out_total,
          (SELECT COUNT(1) FROM incomming_documents d WITH (NOLOCK)
           WHERE d.status = 1 
             AND MONTH(d.created_at) = MONTH(GETDATE()) AND YEAR(d.created_at) = YEAR(GETDATE())
             AND EXISTS (
               SELECT 1 FROM audit a WITH (NOLOCK)
               WHERE a.document_id = d.document_id
                 AND a.type_document IN ('IncommingDocument', 'IncomingDocument')
                 AND a.stage_status IN ('HOAN_THANH_VAN_BAN', 'HOAN_THANH')
             )) AS inc_done,
          (SELECT COUNT(1) FROM outgoing_documents d WITH (NOLOCK)
           WHERE d.status = 1 
             AND MONTH(d.created_at) = MONTH(GETDATE()) AND YEAR(d.created_at) = YEAR(GETDATE())
             AND EXISTS (
               SELECT 1 FROM audit a WITH (NOLOCK)
               WHERE a.document_id = d.document_id
                 AND a.type_document = 'OutGoingDocument'
                 AND a.stage_status IN ('DA_BAN_HANH', 'DA_DONG_DAU')
             )) AS out_done,
          (SELECT COUNT(1) FROM incomming_documents d WITH (NOLOCK)
           WHERE d.status = 1 AND d.deadline < GETDATE()
             AND MONTH(d.created_at) = MONTH(GETDATE()) AND YEAR(d.created_at) = YEAR(GETDATE())
             AND NOT EXISTS (
               SELECT 1 FROM audit a WITH (NOLOCK)
               WHERE a.document_id = d.document_id
                 AND a.type_document = 'IncommingDocument'
                 AND a.stage_status IN ('HOAN_THANH_VAN_BAN', 'HOAN_THANH')
             )) AS inc_late,
          (SELECT COUNT(1) FROM outgoing_documents d WITH (NOLOCK)
           WHERE d.status = 1 AND d.deadline_reply < GETDATE()
             AND MONTH(d.created_at) = MONTH(GETDATE()) AND YEAR(d.created_at) = YEAR(GETDATE())
             AND NOT EXISTS (
               SELECT 1 FROM audit a WITH (NOLOCK)
               WHERE a.document_id = d.document_id
                 AND a.type_document = 'OutGoingDocument'
                 AND a.stage_status IN ('DA_BAN_HANH', 'DA_DONG_DAU')
             )) AS out_late
      `);

			const [res1, res2, res3, res4, res5] = await Promise.all([p1, p2, p3, p4, p5]);

			// CARD 1
			const c1 = res1[0] || {};
			const curTotal = Number(c1.cur_total || 0);
			const curDone = Number(c1.cur_done || 0);
			const prevTotal = Number(c1.prev_total || 0);
			const prevDone = Number(c1.prev_done || 0);
			const curPct = curTotal > 0 ? Math.round((curDone / curTotal) * 100) : 0;
			const prevPct = prevTotal > 0 ? Math.round((prevDone / prevTotal) * 100) : 0;
			const diff = curPct - prevPct;
			let diffStr = `— 0% so với tháng trước`;
			let diffType = 'neutral';
			if (diff > 0) { diffStr = `▲ ${diff}% so với tháng trước`; diffType = 'up'; }
			if (diff < 0) { diffStr = `▼ ${Math.abs(diff)}% so với tháng trước`; diffType = 'down'; }

			// CARD 2
			const c2 = res2[0] || {};
			const pendingApproval = Number(c2.total_pending || 0);
			const lateApproval = Number(c2.total_late || 0);
			const avgDays = Number(c2.avg_days || 0).toFixed(1);

			// CARD 3
			const c3 = res3[0] || {};
			const totalEmp = Number(c3.total_active || 0);
			const hires = Number(c3.new_hires || 0);

			// CARD 4
			const c4 = res4[0] || {};
			const tasksTotal = Number(c4.total_tasks || 0);
			const tasksDone = Number(c4.total_done || 0);
			const tasksLate = Number(c4.total_late || 0);

			// CARD 5
			const c5 = res5[0] || {};
			const docsTotal = Number(c5.inc_total || 0) + Number(c5.out_total || 0);
			const docsDone = Number(c5.inc_done || 0) + Number(c5.out_done || 0);
			const docsLate = Number(c5.inc_late || 0) + Number(c5.out_late || 0);
			const docsPct = docsTotal > 0 ? Math.round((docsDone / docsTotal) * 100) : 0;

			const data = [
				{
				  id: 'company-performance',
				  color: '#BCDDFE',
					colorLabel: "#2364B0",
				  variantIcon: '📊',
				  label: 'Hiệu suất công việc · Toàn CT',
				  value: `${curPct}%`,
				  premiumTags: [
				    { id: 'mom-up', label: diffStr, type: diffType },
				    { id: 'target', label: 'Mục tiêu: 85%', type: 'neutral' },
				  ],
					isBanner: true,
				},
				{
					id: 'ceo-approvals',
					color: '#BCDDFE',
					colorLabel: "#2364B0",
					variantIcon: '⏳',
					label: 'Phê duyệt chờ xử lý - Cấp TGĐ',
					value: `${pendingApproval}`,
					premiumTags: [
						{ id: 'overdue', label: `${lateApproval} quá hạn`, type: lateApproval > 0 ? 'down' : 'neutral' },
						{ id: 'avg', label: `TB ${avgDays} ngày/YC`, type: 'neutral' },
					],
				},
				{
					id: 'total-employees',
					color: '#DCBCFE',
					colorLabel: "#BF82FF",
					variantIcon: '👥',
					label: 'Tổng CBNV toàn hệ thống',
					value: totalEmp.toLocaleString('en-US'),
					premiumTags: [
						{ id: 'new-hires', label: `+${hires} tháng này`, type: 'up' }
					],
				},
				{
					id: 'company-tasks',
					color: '#FEBCD6',
					colorLabel: "#FF75AB",
					variantIcon: '📋',
					label: `Công việc toàn CT · Tháng ${currentMonthStr}`,
					value: `${tasksTotal}`,
					premiumTags: [
						{ id: 'done', label: `${tasksDone} hoàn thành`, type: 'up' },
						{ id: 'late', label: `${tasksLate} quá hạn`, type: tasksLate > 0 ? 'down' : 'neutral' },
					],
				},
				{
					id: 'company-documents',
					color: '#FEBCBD',
					colorLabel: "#FF7779",
					variantIcon: '📄',
					label: `Văn bản toàn CT · Tháng ${currentMonthStr}`,
					value: `${docsTotal}`,
					premiumTags: [
						{ id: 'processed', label: `Đã xử lý ${docsPct}%`, type: 'up' },
						{ id: 'doc-late', label: `${docsLate} quá hạn`, type: docsLate > 0 ? 'down' : 'neutral' },
					],
				},
			];

			return {
				success: true,
				data: data
			};
		} catch (error) {
			this.logger.error('Lỗi khi lấy thông báo Dashboard Premium: ' + error.message, error.stack);
			return {
				success: false,
				data: []
			};
		}
	}


	// Tạo màu ngẫu nhiên nhưng cố định cho từng mã Phòng ban (để avatar trông sinh động)
	private getColorForDepartment(code: string): string {
		const defaultColors = ['#1890ff', '#f5222d', '#fa8c16', '#52c41a', '#13c2c2', '#eb2f96', '#722ed1', '#a0d911'];
		if (!code) return defaultColors[0];
		let hash = 0;
		for (let i = 0; i < code.length; i++) {
			hash = code.charCodeAt(i) + ((hash << 5) - hash);
		}
		return defaultColors[Math.abs(hash) % defaultColors.length];
	}

	async getDepartmentPerformance() {
		return this.getCachedData(
			'dash:premium:departmentPerformance',
			() => this.getDepartmentPerformanceFromDb(),
			'refresh-premium-department-performance',
		);
	}

	async getDepartmentPerformanceFromDb() {
		try {
			// 1. Query RAW SQL để nhóm theo từng Department (Phòng ban của user được assign - director)
			// Theo logic dự án: task -> task_users (type=1, role='director') -> users -> organization_units 
			const rawData = await this.dataSource.query(`
        SELECT 
          ou.id as ouId, ou.name, ou.code, ou.leader as manager,
          COUNT(DISTINCT t.id) as total,
          COUNT(DISTINCT CASE WHEN t.process_status = '4' AND t.update_at <= t.end_date THEN t.id END) as done_on_time
        FROM task t WITH (NOLOCK)
        JOIN task_users tu WITH (NOLOCK) ON tu.task_id = t.id AND tu.role = 'director' AND tu.type = 1
        JOIN users u WITH (NOLOCK) ON u.id = tu.process_id
        JOIN organization_units ou WITH (NOLOCK) ON ou.id = u.parent
        WHERE MONTH(t.end_date) = MONTH(GETDATE()) AND YEAR(t.end_date) = YEAR(GETDATE())
        GROUP BY ou.id, ou.name, ou.code, ou.leader
      `);

			// 2. Chuyển đổi và định dạng theo yêu cầu giao diện (Cột 1 đến Cột 5)
			const formattedData = rawData.map(row => {
				const total = Number(row.total || 0);
				const done = Number(row.done_on_time || 0);
				const perf = total > 0 ? Math.round((done / total) * 100) : 0;

				let status = '';
				if (perf >= 85) {
					status = 'good';
				} else if (perf >= 75) {
					status = 'warn';
				} else {
					status = 'bad';
				}

				return {
					id: row?.ouId,
					name: row.name || 'Không xác định',
					head: row.manager || 'Chưa cập nhật',
					color: this.getColorForDepartment(row.code),
					done,
					total,
					perf,
					status
				};
			});

			// Sắp xếp hiệu suất giảm dần (Phòng làm tốt nhất lên đầu)
			formattedData.sort((a, b) => b.perf - a.perf);

			return {
				overviewLegend: [
					{ id: "good", label: "≥ 85%", color: "#2E7D32" },
					{ id: "warn", label: "75–84%", color: "#F57C00" },
					{ id: "bad", label: "< 75%", color: "#E53935" },
				],
				target: 85,
				departments: formattedData
			};
		} catch (error) {
			this.logger.error('Lỗi khi lấy dữ liệu hiệu suất phòng ban Dashboard Premium: ' + error.message, error.stack);
			return {
				overviewLegend: [],
				target: 85,
				departments: []
			};
		}
	}


	async getPremiumNotificationText(userId: string) {
		return this.getCachedData(
			`dash:premium:notificationsText:${userId}`,
			() => this.getPremiumNotificationTextFromDb(userId),
			'refresh-premium-notifications-text',
			{ userId },
		);
	}

	async getPremiumNotificationTextFromDb(userId: string) {
		try {
			// 1. Chỉ số 1: Phê duyệt chờ xử lý cấp TGĐ
			// 1. Chỉ số 1: Phê duyệt chờ xử lý cấp TGĐ
			// 1.1 Văn bản đến
			const incomingResult = await this.dataSource.query(`
				SELECT COUNT(1) AS total 
				FROM incomming_documents d WITH (NOLOCK)
				JOIN incomming_assignment ia WITH (NOLOCK) ON ia.document_id = d.document_id
				WHERE d.status = 1 
				  AND ia.stage_status = 'CHUA_XU_LY' 
				  AND ia.receiver = @0
				  AND ia.receiver IN (
					SELECT ugu.user_id 
					FROM user_group_users ugu WITH (NOLOCK)
					JOIN group_users gu WITH (NOLOCK) ON gu.id = ugu.group_user_id
					WHERE gu.code = 'tonggd'
				  )
			`, [userId]);

			// 1.2 Văn bản đi
			const outgoingResult = await this.dataSource.query(`
				SELECT COUNT(1) AS total 
				FROM outgoing_documents od WITH (NOLOCK)
				JOIN audit a_out WITH (NOLOCK) ON a_out.document_id = od.document_id
				WHERE od.status = 1 
				  AND a_out.stage_status IN ('CHUA_XU_LY', 'TRA_LAI')
				  AND a_out.receiver = @0
				  AND a_out.receiver IN (
					SELECT ugu.user_id 
					FROM user_group_users ugu WITH (NOLOCK)
					JOIN group_users gu WITH (NOLOCK) ON gu.id = ugu.group_user_id
					WHERE gu.code = 'tonggd'
				  )
			`, [userId]);

			// 1.3 Công việc
			const taskResult = await this.dataSource.query(`
				SELECT COUNT(1) AS total 
				FROM task t WITH (NOLOCK)
				JOIN audit a_task WITH (NOLOCK) ON a_task.document_id = CAST(t.id AS NVARCHAR(64))
				WHERE t.status = 1 
				  AND a_task.id = (
					  SELECT MAX(a2.id)
					  FROM audit a2 WITH (NOLOCK)
					  WHERE a2.document_id = CAST(t.id AS NVARCHAR(64))
				  )
				  AND a_task.action_code IN ('GUI_PHE_DUYET', 'GUI_DIEU_CHINH', 'DIEU_CHINH')
				  AND a_task.receiver = @0
				  AND a_task.receiver IN (
					SELECT ugu.user_id 
					FROM user_group_users ugu WITH (NOLOCK)
					JOIN group_users gu WITH (NOLOCK) ON gu.id = ugu.group_user_id
					WHERE gu.code = 'tonggd'
				  )
			`, [userId]);

			const totalIncoming = Number(incomingResult[0]?.total || 0);
			const totalOutgoing = Number(outgoingResult[0]?.total || 0);
			const totalTasks = Number(taskResult[0]?.total || 0);

			const totalApprovals = totalIncoming + totalOutgoing + totalTasks;
			const approvalTags: any[] = [];
			let approvalIndex = 1;

			if (totalIncoming > 0) {
				approvalTags.push({ id: `app-${approvalIndex++}`, label: `${totalIncoming} YC văn bản đến`, color: '#1677FF', type: 'incoming' });
			}
			if (totalOutgoing > 0) {
				approvalTags.push({ id: `app-${approvalIndex++}`, label: `${totalOutgoing} YC văn bản đi`, color: '#FADB14', type: 'outgoing' });
			}
			if (totalTasks > 0) {
				approvalTags.push({ id: `app-${approvalIndex++}`, label: `${totalTasks} YC công việc`, color: '#52C41A', type: 'task' });
			}

			// 2. Chỉ số 2: Văn bản thượng khẩn (Đến + Đi) -> deadline = ngày hôm nay
			const urgentIncoming = await this.dataSource.query(`
        SELECT COUNT(1) AS total FROM incomming_documents WITH (NOLOCK) 
        WHERE urgency_level IN ('f5d141fa-c646-4659-926d-bec6e7904811', 'thng-khn', N'Thượng khẩn', N'THƯỢNG KHẨN') 
          AND status = 1 
          AND CAST(deadline AS DATE) = CAST(GETDATE() AS DATE)
      `);

			const urgentOutgoing = await this.dataSource.query(`
        SELECT COUNT(1) AS total FROM outgoing_documents WITH (NOLOCK) 
        WHERE urgency_level IN ('f5d141fa-c646-4659-926d-bec6e7904811', 'thng-khn', N'Thượng khẩn', N'THƯỢNG KHẨN') 
          AND status = 1 
          AND CAST(deadline_reply AS DATE) = CAST(GETDATE() AS DATE)
      `);

			const inUrgent = Number(urgentIncoming[0]?.total || 0);
			const outUrgent = Number(urgentOutgoing[0]?.total || 0);
			const totalUrgent = inUrgent + outUrgent;
			const urgentTags: any[] = [];
			if (inUrgent > 0) urgentTags.push({ id: 'urg-1', label: `${inUrgent} VB Đến`, color: '#FA541C', type: 'incoming' });
			if (outUrgent > 0) urgentTags.push({ id: 'urg-2', label: `${outUrgent} VB Đi`, color: '#FF7A45', type: 'outgoing' });

			// 3. Chỉ số 3: Phòng ban chậm tiến độ
			const delayedProjects = await this.dataSource.query(`
        SELECT 
            ou.name AS departmentName, 
            COUNT(p.id) AS delayedCount
        FROM projects p WITH (NOLOCK)
        LEFT JOIN project_members pm WITH (NOLOCK) ON pm.project_id = p.id AND pm.role = 'manager'
        LEFT JOIN users u WITH (NOLOCK) ON u.id = pm.user_id
        LEFT JOIN organization_units ou WITH (NOLOCK) ON ou.id = u.parent
        WHERE p.endDate < GETDATE() 
            AND p.projectStatus <> '2' -- 2 = Hoàn thành
            AND p.status = 1           -- 1 = Đang tồn tại
        GROUP BY ou.name
        HAVING ou.name IS NOT NULL
        ORDER BY delayedCount DESC
      `);

			let totalDelayedDepts = 0;
			let totalDelayedProjectsCount = 0;
			const delayedTags: any[] = [];
			let delayedIndex = 1;

			for (const record of delayedProjects) {
				const cnt = Number(record.delayedCount || 0);
				if (cnt > 0) {
					totalDelayedDepts++;
					totalDelayedProjectsCount += cnt;
					delayedTags.push({
						id: `del-${delayedIndex++}`,
						label: `${record.departmentName} (Quá hạn ${cnt} DA)`,
						color: '#F5222D',
						type: 'urgent',
					});
				}
			}

			const data = [
				{
					id: 'approval-waiting',
					emphasis: totalApprovals > 0 ? `${totalApprovals} yêu cầu phê duyệt` : '0 yêu cầu phê duyệt',
					text: 'cấp TGĐ đang chờ xử lý',
				},
				{
					id: 'urgent-docs',
					emphasis: totalUrgent > 0 ? `${totalUrgent} văn bản thượng khẩn` : '0 văn bản thượng khẩn',
					text: 'cần ký duyệt hôm nay',
				},
				{
					id: 'critical-projects',
					emphasisFirst: false,
					text: totalDelayedDepts > 0
						? `${delayedTags.map(t => t.label).join(' và ')} đang`
						: '0 phòng ban đang',
					emphasis: 'chậm tiến độ',
					suffix: totalDelayedProjectsCount > 0 ? `${totalDelayedProjectsCount} dự án trọng điểm` : '0 dự án trọng điểm',
				}
			];

			return data;

		} catch (error) {
			this.logger.error('Lỗi khi lấy thông báo text Dashboard Premium: ' + error.message, error.stack);
			return [
				{
					id: 'approval-waiting',
					emphasis: 'Đang tải dữ liệu...',
					text: '',
				},
				{
					id: 'urgent-docs',
					emphasis: 'Đang tải dữ liệu...',
					text: '',
				},
				{
					id: 'critical-projects',
					emphasisFirst: false,
					text: '',
					emphasis: 'Đang tải dữ liệu...',
					suffix: '',
				}
			];
		}
	}


	// --- WORKLOAD & DỰ ÁN ---

	// Hàm sinh ra 20 ngày (Thứ 2 đến Thứ 6) của 4 tuần gần nhất
	private generateLast4WeeksDays(referenceDate: Date = new Date()) {
		const dates: any[] = [];
		const formattedDates: string[] = [];

		// 1. Lấy ngày Thứ Hai của tuần hiện tại
		const d = new Date(referenceDate);
		// JS getDay(): 0 = Sun, 1 = Mon...
		const day = d.getDay();
		const diff = d.getDate() - day + (day == 0 ? -6 : 1);
		d.setDate(diff); // Thứ 2 tuần hiện tại

		// 2. Lùi lại 3 tuần (cộng với tuần hiện tại là 4 tuần)
		d.setDate(d.getDate() - 21);

		for (let w = 0; w < 4; w++) {
			for (let dayOfWeek = 0; dayOfWeek < 5; dayOfWeek++) {
				const currentDate = new Date(d);
				currentDate.setDate(d.getDate() + (w * 7) + dayOfWeek);
				const yyyy = currentDate.getFullYear();
				const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
				const dd = String(currentDate.getDate()).padStart(2, '0');
				const dateStr = `${yyyy}-${mm}-${dd}`;

				dates.push({
					dateObj: currentDate,
					dateStr: dateStr,
					week: w,
					day: dayOfWeek
				});
				formattedDates.push(dateStr);
			}
		}
		return { dates, formattedDates };
	}

	async getWorkloadProjects() {
		return this.getCachedData(
			'dash:premium:workloadProjects',
			() => this.getWorkloadProjectsFromDb(),
			'refresh-premium-workload-projects',
		);
	}

	async getWorkloadProjectsFromDb() {
		try {
			const { dates, formattedDates } = this.generateLast4WeeksDays();
			// Format array to SQL IN clause: '2026-03-01','2026-03-02'
			const inClause = formattedDates.map(d => `'${d}'`).join(',');

			// 1. Lấy dữ liệu 20 ngày Workload (Tasks)
			const queryTasksTotal = this.dataSource.query(`
        SELECT CAST(end_date AS DATE) AS dateStr, COUNT(1) as total
        FROM task WITH (NOLOCK)
        WHERE CAST(end_date AS DATE) IN (${inClause})
        GROUP BY CAST(end_date AS DATE)
      `);

			const queryTasksDone = this.dataSource.query(`
        SELECT CAST(update_at AS DATE) AS dateStr, COUNT(1) as done
        FROM task WITH (NOLOCK)
        WHERE process_status = '4' AND CAST(update_at AS DATE) IN (${inClause})
        GROUP BY CAST(update_at AS DATE)
      `);

			// 2. Lấy dữ liệu danh sách Dự án
			const queryProjects = this.dataSource.query(`
        SELECT 
          p.id, p.code, p.name, p.status as recordStatus, p.projectStatus, 
          p.progress, p.startDate, p.endDate,
          (SELECT COUNT(1) FROM project_members pm WITH (NOLOCK) WHERE pm.project_id = p.id) as userCount
        FROM projects p WITH (NOLOCK)
        WHERE p.status = 1
      `);

			const [tasksTotalRaw, tasksDoneRaw, projectsRaw] = await Promise.all([
				queryTasksTotal, queryTasksDone, queryProjects
			]);

			// Chuyển array thành map tra cứu O(1)
			const tasksTotalMap = {};
			const tasksDoneMap = {};

			tasksTotalRaw.forEach(row => {
				// Date object -> string in GMT/local
				const dateKey = row.dateStr instanceof Date
					? row.dateStr.toISOString().split('T')[0]
					: (row.dateStr + '').split('T')[0];
				tasksTotalMap[dateKey] = Number(row.total || 0);
			});
			tasksDoneRaw.forEach(row => {
				const dateKey = row.dateStr instanceof Date
					? row.dateStr.toISOString().split('T')[0]
					: (row.dateStr + '').split('T')[0];
				tasksDoneMap[dateKey] = Number(row.done || 0);
			});

			// Ma trận Heatmap 4x5
			const heatmapValues = [
				[0, 0, 0, 0, 0],
				[0, 0, 0, 0, 0],
				[0, 0, 0, 0, 0],
				[0, 0, 0, 0, 0]
			];
			const weeklyTrend = [0, 0, 0, 0];
			const flatWorkloads: number[] = [];

			dates.forEach(d => {
				const str = d.dateStr;
				const total = tasksTotalMap[str] || 0;
				const done = tasksDoneMap[str] || 0;

				let workloadVal = 0;
				if (total > 0) {
					workloadVal = Math.round((done / total) * 100);
				} else if (done > 0 && total === 0) {
					// Nếu hôm đó xong nhiều hơn mức phải làm (deadline), workload = 100%
					workloadVal = 100;
				}

				// Giới hạn max là 100% để biểu đồ Heatmap không bị vỡ hoặc chỉ số bất thường
				if (workloadVal > 100) {
					workloadVal = 100;
				}

				heatmapValues[d.week][d.day] = workloadVal;
				weeklyTrend[d.week] += workloadVal;
				flatWorkloads.push(workloadVal);
			});

			// Tính logic trung bình, max, min
			for (let w = 0; w < 4; w++) {
				weeklyTrend[w] = Math.round(weeklyTrend[w] / 5);
			}

			const sumWorkload = flatWorkloads.reduce((a, b) => a + b, 0);
			const avgWorkload = Math.round(sumWorkload / 20);
			const minWorkload = Math.min(...flatWorkloads);
			const maxWorkload = Math.max(...flatWorkloads);

			// --- PROJECT SUMMARY ---
			let activeCount = 0;
			let lateCount = 0;
			let slowCount = 0;
			const now = new Date();

			const projects = projectsRaw.map(p => {
				const isActive = p.projectStatus === '3' || p.projectStatus === '1'; // Đang thực hiện hoặc chuẩn bị
				const isLate = p.endDate && new Date(p.endDate) < now && p.projectStatus !== '2';

				let statusTag = 'good';
				if (isLate) {
					statusTag = 'bad';
					lateCount++;
				} else if (isActive) {
					activeCount++;
					// Tính chậm tiến độ: Expected Progress vs Actual.
					// Cho đơn giản: Nếu đã vượt quá nửa thời gian mà progress < 30% thì chậm
					if (p.startDate && p.endDate) {
						const start = new Date(p.startDate);
						const end = new Date(p.endDate);
						const totalDuration = end.getTime() - start.getTime();
						const passedDuration = now.getTime() - start.getTime();
						if (totalDuration > 0 && passedDuration > 0 && p.progress !== undefined) {
							const expectedPct = (passedDuration / totalDuration) * 100;
							// Nếu bị tụt lùi so với mong đợi 20%, đánh là warn
							if (p.progress < expectedPct - 20) {
								statusTag = 'warn';
								slowCount++;
							}
						}
					}
				}

				const sDate = p.startDate ? new Date(p.startDate) : null;
				const eDate = p.endDate ? new Date(p.endDate) : null;
				// Format date string DD/MM - DD/MM
				const formatD = (d: Date | null) => d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` : 'N/A';
				const dateRangeStr = `${formatD(sDate)} – ${formatD(eDate)}`;

				// Fake color deterministically by ID
				const colors = ['#7B1FA2', '#0052CC', '#E53935', '#455A64', '#00897B', '#F57C00', '#AD1457'];
				const pColor = colors[Number(p.id || 0) % colors.length];

				return {
					id: p.code || String(p.id),
					recordId: p.id,
					key: 'VIEW_PROJECT',
					name: p.name,
					status: statusTag,
					date: dateRangeStr,
					people: `${p.userCount || 0} người`,
					pct: Number(p.progress || 0),
					color: pColor
				};
			});

			// Lọc ra các project nổi bật cho UI (vd: ưu tiên dự án đang action)
			const topProjects = projects.slice(0, 10); // Lấy 10 dự án đầu tiên hiển thị
			const totalProjects = projectsRaw.length;

			return {
				overviewStats: [
					{ id: "avg", value: `${avgWorkload}%`, label: "TB Workload", color: "#2364B0" },
					{ id: "highest", value: `${maxWorkload}%`, label: "Ngày cao nhất", color: "#FF73AA" },
					{ id: "lowest", value: `${minWorkload}%`, label: "Ngày thấp nhất", color: "#C085FF" },
				],
				heatmapTitle: "Heatmap 4 tuần qua (% theo ngày)",
				heatmapWeeks: ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"],
				heatmapDays: ["T2", "T3", "T4", "T5", "T6"],
				heatmapValues: heatmapValues,
				heatmapLegend: ["#2364B00D", "#2364B033", "#2364B066", "#2364B0CC"],
				trendTitle: "Xu hướng workload theo tuần",
				weeklyTrend: weeklyTrend,
				summary: [
					{ id: "total-projects", value: totalProjects, label: "Tổng dự án", color: "#5A6573" },
					{ id: "active-projects", value: activeCount, label: "Đang thực hiện", color: "#FF85E9" },
					{ id: "slow-projects", value: slowCount, label: "Chậm tiến độ", color: "#FFB973" },
					{ id: "late-projects", value: lateCount, label: "Quá hạn", color: "#EF5350" },
				],
				projects: topProjects
			};

		} catch (error) {
			this.logger.error('Lỗi khi lấy dữ liệu Workload Projects Dashboard Premium: ' + error.message, error.stack);
			return {
				overviewStats: [], heatmapValues: [], weeklyTrend: [], summary: [], projects: []
			};
		}
	}


	// --- PHÊ DUYỆT CẤP TGĐ ---
	/**
	 * Lấy cấu trúc dữ liệu Dashboard Phê duyệt cấp TGĐ (Mục 7)
	 * Chức năng:
	 * - Quét lịch sử Audit tìm các bản ghi chờ duyệt (CHUA_XU_LY) thuộc group 'tonggd'.
	 * - Tính tổng quan các KPI: Tổng, Trong hạn, Sắp đến hạn, Quá hạn.
	 * - Tính biểu đồ Stacked Bar phân bổ 3 List: Văn bản đến, đi, Công việc.
	 * - Tính thời gian xử lý trung bình theo DATEDIFF tháng hiện tại vs tháng trước.
	 * - Trả về Danh sách chi tiết các công việc kèm Icon và thời gian Overdue.
	 */
	async getCeoApprovals(userId: string) {
		return this.getCachedData(
			`dash:premium:ceoApprovals:${userId}`,
			() => this.getCeoApprovalsFromDb(userId),
			'refresh-premium-ceo-approvals',
			{ userId },
		);
	}

	async getCeoApprovalsFromDb(userId: string) {
		try {
			const now = new Date();

			const queryList = await this.dataSource.query(`
    WITH Combined AS (

    -- 1. Văn bản đến (Incoming)
    SELECT 
        CAST(ia.last_audit_id AS NVARCHAR(MAX)) as auditId,
        CAST(d.document_id AS NVARCHAR(MAX)) as document_id, 
        'IncomingDocument' as type_document, 
        d.created_at, 
        ISNULL(ia.deadline, d.deadline) as deadline,  -- ✅ ưu tiên deadline assignment
        u_inc.name as senderName, 
        ou_inc.name as senderDept, 
        d.abstract_note as details,
        ia.receiver, 
        'VIEW_INCOMING_DOC' as navigationKey, 
        CAST(ia.role_process AS NVARCHAR(MAX)) as actionName,
        NULL as formDocTaskName
    FROM incomming_documents d WITH (NOLOCK)
    JOIN incomming_assignment ia WITH (NOLOCK) 
        ON ia.document_id = d.document_id
    LEFT JOIN users u_inc WITH (NOLOCK) 
        ON u_inc.id = d.signer   -- ⚠️ signer là NVARCHAR, phải đúng id user
    LEFT JOIN organization_units ou_inc WITH (NOLOCK) 
        ON ou_inc.id = d.sender_unit
    WHERE d.status = 1 
      AND ia.stage_status = 'CHUA_XU_LY' 
      AND (
        ia.receiver = @0 
        AND ia.receiver IN (
            SELECT ugu.user_id 
            FROM user_group_users ugu WITH (NOLOCK)
            JOIN group_users gu WITH (NOLOCK) 
                ON gu.id = ugu.group_user_id 
            WHERE gu.code = 'tonggd'
        )
      )

    UNION ALL

    -- 2. Văn bản đi (Outgoing)
    SELECT 
        CAST(a_out.id AS NVARCHAR(MAX)) as auditId,
        CAST(od.document_id AS NVARCHAR(MAX)) as document_id, 
        'OutGoingDocument' as type_document, 
        od.created_at, 
        od.deadline_reply as deadline,
        u_out.name as senderName, 
        ou_out.name as senderDept, 
        od.abstract_note as details,
        a_out.receiver, 
        'VIEW_OUTCOMING_DOC' as navigationKey, 
        CAST(a_out.action_code AS NVARCHAR(MAX)) as actionName,
        NULL as formDocTaskName
    FROM outgoing_documents od WITH (NOLOCK)
    JOIN audit a_out WITH (NOLOCK) 
        ON a_out.document_id = od.document_id
    LEFT JOIN users u_out WITH (NOLOCK) 
        ON u_out.id = od.drafter
    LEFT JOIN organization_units ou_out WITH (NOLOCK) 
        ON ou_out.id = u_out.parent
    WHERE od.status = 1 
      AND a_out.stage_status IN ('CHUA_XU_LY', 'TRA_LAI')
      AND (
        a_out.receiver = @0 
        AND a_out.receiver IN (
            SELECT ugu.user_id 
            FROM user_group_users ugu WITH (NOLOCK)
            JOIN group_users gu WITH (NOLOCK) 
                ON gu.id = ugu.group_user_id 
            WHERE gu.code = 'tonggd'
        )
      )

    UNION ALL

    -- 3. Công việc (Task)
    SELECT 
        CAST(a_task.id AS NVARCHAR(MAX)) as auditId,
        CAST(t.id AS NVARCHAR(MAX)) as document_id, 
        'Task' as type_document, 
        t.created_at, 
        t.end_date as deadline,
        u_t.name as senderName, 
        ou_t.name as senderDept, 
        t.name as details,
        a_task.receiver, 
        'VIEW_TASK' as navigationKey, 
        N'Chờ xử lý' as actionName,
        t.name as formDocTaskName
    FROM task t WITH (NOLOCK)
    JOIN audit a_task WITH (NOLOCK) 
        ON a_task.document_id = CAST(t.id AS NVARCHAR(64))
    LEFT JOIN users u_t WITH (NOLOCK) 
        ON u_t.id = t.created_by
    LEFT JOIN organization_units ou_t WITH (NOLOCK) 
        ON ou_t.id = u_t.parent
    WHERE t.status = 1 
      AND a_task.id = (
          SELECT MAX(a2.id)
          FROM audit a2 WITH (NOLOCK)
          WHERE a2.document_id = CAST(t.id AS NVARCHAR(64))
      )
      AND a_task.action_code IN ('GUI_PHE_DUYET', 'GUI_DIEU_CHINH', 'DIEU_CHINH')
      AND a_task.receiver = @0
      AND a_task.receiver IN (
          SELECT ugu.user_id 
          FROM user_group_users ugu WITH (NOLOCK)
          JOIN group_users gu WITH (NOLOCK) 
              ON gu.id = ugu.group_user_id 
          WHERE gu.code = 'tonggd'
      )
)

SELECT *
FROM Combined
ORDER BY 
    COALESCE(deadline, CAST('9999-12-31' AS DATETIME)) ASC,
    created_at ASC;
`, [userId]);

			// Phần queryAvg giữ nguyên


			// Tính toán lại trung bình xử lý (Sử dụng audit cho cả 2 loại)
			const queryAvg = this.dataSource.query(`
WITH FilteredAudit AS (
    SELECT 
        a.created_at,
        a.updated_at,
        DATEDIFF(day, a.created_at, a.updated_at) AS diff_days,
        CASE 
            WHEN YEAR(a.updated_at) = YEAR(GETDATE()) 
             AND MONTH(a.updated_at) = MONTH(GETDATE())
            THEN 'current'
            WHEN YEAR(a.updated_at) = YEAR(DATEADD(month, -1, GETDATE())) 
             AND MONTH(a.updated_at) = MONTH(DATEADD(month, -1, GETDATE()))
            THEN 'prev'
        END AS period
    FROM audit a WITH (NOLOCK)
    WHERE a.stage_status = 'DA_XU_LY'
      AND (
        a.receiver = @0 
        OR a.receiver IN (
            SELECT ugu.user_id 
            FROM user_group_users ugu
            JOIN group_users gu 
                ON gu.id = ugu.group_user_id 
            WHERE gu.code = 'tonggd'
        )
      )
      AND a.updated_at >= DATEADD(month, -1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
)

SELECT 
    AVG(CASE WHEN period = 'current' THEN diff_days END) AS current_avg,
    AVG(CASE WHEN period = 'prev' THEN diff_days END) AS prev_avg
FROM FilteredAudit
`, [userId]);

			const [listRaw, avgRaw] = await Promise.all([queryList, queryAvg]);

			let inTime = 0, near = 0, late = 0;
			let incOk = 0, incSoon = 0, incLate = 0;
			let outOk = 0, outSoon = 0, outLate = 0;
			let taskOk = 0, taskSoon = 0, taskLate = 0;

			listRaw.forEach((row: any) => {
				let isLate = false;
				let isNear = false;
				let isOk = false;
				let diffDays = 0;

				if (row.deadline) {
					const dl = new Date(row.deadline);
					diffDays = Math.floor((dl.getTime() - now.getTime()) / 86400000);
					if (diffDays < 0) { isLate = true; late++; }
					else if (diffDays <= 7) { isNear = true; near++; }
					else { isOk = true; inTime++; }
				} else {
					isOk = true; inTime++;
				}

				const type = String(row.type_document || '');
				if (type.toLowerCase().includes('incomingdocument')) {
					if (isOk) incOk++; if (isNear) incSoon++; if (isLate) incLate++;
				} else if (type.toLowerCase().includes('outgoingdocument')) {
					if (isOk) outOk++; if (isNear) outSoon++; if (isLate) outLate++;
				} else if (type.toLowerCase().includes('task')) {
					if (isOk) taskOk++; if (isNear) taskSoon++; if (isLate) taskLate++;
				}
			});

			const totalItems = listRaw.length;
			const cAvg = avgRaw[0] || {};
			const curAvgVal = Number(cAvg.current_avg || 0).toFixed(1);
			const prevAvgVal = Number(cAvg.prev_avg || 0).toFixed(1);
			const diffAvg = (Number(curAvgVal) - Number(prevAvgVal)).toFixed(1);

			let changeStr = '— 0 ngày';
			if (Number(diffAvg) < 0) changeStr = `▼ ${Math.abs(Number(diffAvg))} ngày`;
			else if (Number(diffAvg) > 0) changeStr = `▲ ${Math.abs(Number(diffAvg))} ngày`;

			return {
				total: totalItems,
				summaryCards: [
					{ id: "total", value: totalItems, label: "Tổng yêu cầu", color: "#0F172A" },
					{ id: "in-time", value: inTime, label: "Trong hạn", color: "#2364B0" },
					{ id: "near", value: near, label: "Sắp đến hạn", color: "#FFA600" },
					{ id: "late", value: late, label: "Quá hạn", color: "#EF5350" },
				],
				stackedTitle: "Phân bổ theo danh mục & trạng thái",
				categories: [
					{ id: "incoming", label: "Văn bản đến", ok: incOk, soon: incSoon, late: incLate, total: incOk + incSoon + incLate },
					{ id: "outgoing", label: "Văn bản đi", ok: outOk, soon: outSoon, late: outLate, total: outOk + outSoon + outLate },
					{ id: "tasks", label: "Công việc", ok: taskOk, soon: taskSoon, late: taskLate, total: taskOk + taskSoon + taskLate },
				],
				avgProcessing: {
					value: curAvgVal,
					suffix: "ngày / yêu cầu",
					change: changeStr,
					changeLabel: "So với tháng trước",
				},
				list: [],
			};
		} catch (error) {
			this.logger.error('Lỗi khi lấy Phê duyệt cấp TGĐ Dashboard Premium: ' + error.message, error.stack);
			return {
				total: 0, summaryCards: [], categories: [], avgProcessing: {}, list: []
			};
		}
	}


	async getCeoApprovalsList(userId: string, page: number = 1, limit: number = 10) {
		try {
			const offset = (page - 1) * limit;
			const now = new Date();

			const queryTotal = await this.dataSource.query(`
					WITH Combined AS (
					SELECT 
						CAST(d.document_id AS NVARCHAR(MAX)) as document_id
					FROM incomming_documents d WITH (NOLOCK)
					JOIN incomming_assignment ia WITH (NOLOCK) 
						ON ia.document_id = d.document_id
					WHERE d.status = 1 
					AND ia.stage_status = 'CHUA_XU_LY' 
					AND (
						ia.receiver = @0 
						AND ia.receiver IN (
							SELECT ugu.user_id 
							FROM user_group_users ugu WITH (NOLOCK)
							JOIN group_users gu WITH (NOLOCK) 
								ON gu.id = ugu.group_user_id 
							WHERE gu.code = 'tonggd'
						)
					)
					UNION ALL
					SELECT 
						CAST(od.document_id AS NVARCHAR(MAX)) as document_id
					FROM outgoing_documents od WITH (NOLOCK)
					JOIN audit a_out WITH (NOLOCK) 
						ON a_out.document_id = od.document_id
					WHERE od.status = 1 
					AND a_out.stage_status IN ('CHUA_XU_LY', 'TRA_LAI')
					AND (
						a_out.receiver = @0 
						AND a_out.receiver IN (
							SELECT ugu.user_id 
							FROM user_group_users ugu WITH (NOLOCK)
							JOIN group_users gu WITH (NOLOCK) 
								ON gu.id = ugu.group_user_id 
							WHERE gu.code = 'tonggd'
						)
					)
					UNION ALL
					SELECT 
						CAST(t.id AS NVARCHAR(MAX)) as document_id
					FROM task t WITH (NOLOCK)
					JOIN audit a_task WITH (NOLOCK) 
						ON a_task.document_id = CAST(t.id AS NVARCHAR(64))
					WHERE t.status = 1 
					AND a_task.id = (
						SELECT MAX(a2.id)
						FROM audit a2 WITH (NOLOCK)
						WHERE a2.document_id = CAST(t.id AS NVARCHAR(64))
					)
					AND a_task.action_code IN ('GUI_PHE_DUYET', 'GUI_DIEU_CHINH', 'DIEU_CHINH')
					AND a_task.receiver = @0
					AND a_task.receiver IN (
						SELECT ugu.user_id 
						FROM user_group_users ugu WITH (NOLOCK)
						JOIN group_users gu WITH (NOLOCK) 
							ON gu.id = ugu.group_user_id 
						WHERE gu.code = 'tonggd'
					)
				)
				SELECT COUNT(1) as total FROM Combined;
			`, [userId]);

			const total = Number(queryTotal[0]?.total || 0);

			const queryList = await this.dataSource.query(`
					WITH Combined AS (
					SELECT 
						CAST(ia.last_audit_id AS NVARCHAR(MAX)) as auditId,
						CAST(d.document_id AS NVARCHAR(MAX)) as document_id, 
						'IncomingDocument' as type_document, 
						d.created_at, 
						ISNULL(ia.deadline, d.deadline) as deadline,
						u_inc.name as senderName, 
						ou_inc.name as senderDept, 
						d.abstract_note as details,
						ia.receiver, 
						'VIEW_INCOMING_DOC' as navigationKey, 
						CAST(ia.role_process AS NVARCHAR(MAX)) as actionName,
						NULL as formDocTaskName
					FROM incomming_documents d WITH (NOLOCK)
					JOIN incomming_assignment ia WITH (NOLOCK) 
						ON ia.document_id = d.document_id
					LEFT JOIN users u_inc WITH (NOLOCK) 
						ON u_inc.id = d.signer
					LEFT JOIN organization_units ou_inc WITH (NOLOCK) 
						ON ou_inc.id = d.sender_unit
					WHERE d.status = 1 
					AND ia.stage_status = 'CHUA_XU_LY' 
					AND (
						ia.receiver = @0 
						AND ia.receiver IN (
							SELECT ugu.user_id 
							FROM user_group_users ugu WITH (NOLOCK)
							JOIN group_users gu WITH (NOLOCK) 
								ON gu.id = ugu.group_user_id 
							WHERE gu.code = 'tonggd'
						)
					)
					UNION ALL
					SELECT 
						CAST(a_out.id AS NVARCHAR(MAX)) as auditId,
						CAST(od.document_id AS NVARCHAR(MAX)) as document_id, 
						'OutGoingDocument' as type_document, 
						od.created_at, 
						od.deadline_reply as deadline,
						u_out.name as senderName, 
						ou_out.name as senderDept, 
						od.abstract_note as details,
						a_out.receiver, 
						'VIEW_OUTCOMING_DOC' as navigationKey, 
						CAST(a_out.action_code AS NVARCHAR(MAX)) as actionName,
						NULL as formDocTaskName
					FROM outgoing_documents od WITH (NOLOCK)
					JOIN audit a_out WITH (NOLOCK) 
						ON a_out.document_id = od.document_id
					LEFT JOIN users u_out WITH (NOLOCK) 
						ON u_out.id = od.drafter
					LEFT JOIN organization_units ou_out WITH (NOLOCK) 
						ON ou_out.id = u_out.parent
					WHERE od.status = 1 
					AND a_out.stage_status IN ('CHUA_XU_LY', 'TRA_LAI')
					AND (
						a_out.receiver = @0 
						AND a_out.receiver IN (
							SELECT ugu.user_id 
							FROM user_group_users ugu WITH (NOLOCK)
							JOIN group_users gu WITH (NOLOCK) 
								ON gu.id = ugu.group_user_id 
							WHERE gu.code = 'tonggd'
						)
					)
					UNION ALL
					SELECT 
						CAST(a_task.id AS NVARCHAR(MAX)) as auditId,
						CAST(t.id AS NVARCHAR(MAX)) as document_id, 
						'Task' as type_document, 
						t.created_at, 
						t.end_date as deadline,
						u_t.name as senderName, 
						ou_t.name as senderDept, 
						t.name as details,
						a_task.receiver, 
						'VIEW_TASK' as navigationKey, 
						N'Chờ xử lý' as actionName,
						t.name as formDocTaskName
					FROM task t WITH (NOLOCK)
					JOIN audit a_task WITH (NOLOCK) 
						ON a_task.document_id = CAST(t.id AS NVARCHAR(64))
					LEFT JOIN users u_t WITH (NOLOCK) 
						ON u_t.id = t.created_by
					LEFT JOIN organization_units ou_t WITH (NOLOCK) 
						ON ou_t.id = u_t.parent
					WHERE t.status = 1 
					AND a_task.id = (
						SELECT MAX(a2.id)
						FROM audit a2 WITH (NOLOCK)
						WHERE a2.document_id = CAST(t.id AS NVARCHAR(64))
					)
					AND a_task.action_code IN ('GUI_PHE_DUYET', 'GUI_DIEU_CHINH', 'DIEU_CHINH')
					AND a_task.receiver = @0
					AND a_task.receiver IN (
						SELECT ugu.user_id 
						FROM user_group_users ugu WITH (NOLOCK)
						JOIN group_users gu WITH (NOLOCK) 
							ON gu.id = ugu.group_user_id 
						WHERE gu.code = 'tonggd'
					)
				)
				SELECT *
				FROM Combined
				ORDER BY 
					COALESCE(deadline, CAST('9999-12-31' AS DATETIME)) ASC,
					created_at ASC
				OFFSET @1 ROWS
				FETCH NEXT @2 ROWS ONLY;
			`, [userId, offset, limit]);

			const listRaw = queryList;
			const docIds: string[] = listRaw.map((r: any) => r.document_id);

			const workItems = docIds.length > 0 ? await this.workItemRepo.find({
				where: { documentId: In(docIds), state: In(['OPEN', 'ASSIGNED']) },
			}) : [];
			const workItemsMap: Record<string, WorkItemEntity[]> = {};
			workItems.forEach(wi => {
				if (wi.documentId) {
					if (!workItemsMap[wi.documentId]) workItemsMap[wi.documentId] = [];
					workItemsMap[wi.documentId].push(wi);
				}
			});

			const auditHistory = docIds.length > 0 ? await this.auditRepo.find({
				where: { documentId: In(docIds) },
				order: { createdAt: 'DESC' },
			}) : [];
			const auditMap: Record<string, Audit[]> = {};
			auditHistory.forEach(a => {
				if (a.documentId) {
					if (!auditMap[a.documentId]) auditMap[a.documentId] = [];
					auditMap[a.documentId].push(a);
				}
			});

			const bpmnModelCache: Record<string, { definitions: BpmnDefinitions; process: BpmnProcess; indexes: any }> = {};

			const items = await Promise.all(listRaw.map(async (row: any) => {
				let isLate = false;
				let diffDays = 0;

				if (row.deadline) {
					const dl = new Date(row.deadline);
					diffDays = Math.floor((dl.getTime() - now.getTime()) / 86400000);
					if (diffDays < 0) { isLate = true; }
				}

				const type = String(row.type_document || '');
				const dateStr = row.created_at ? `${String(row.created_at.getDate()).padStart(2, '0')}/${String(row.created_at.getMonth() + 1).padStart(2, '0')}` : '';
				const overdueStr = isLate ? `${Math.abs(diffDays)} ngày` : undefined;

				let iconStr = '⚡';
				let uiType = 'other';
				if (type.toLowerCase().includes('incomingdocument') || type.toLowerCase().includes('outgoingdocument') || type.toLowerCase().includes('document')) {
					iconStr = '📄'; uiType = 'doc';
				} else if (type.toLowerCase().includes('task')) {
					iconStr = '📋'; uiType = 'task';
				}
				let taskData: any = null;
				if(type.toLowerCase().includes('task')){
					taskData = await this.taskService.findOneApprove(row.document_id, userId);
				}
				const deptName = row.senderDept || 'Chưa rõ phòng ban';
				const senderName = row.senderName || 'Hệ thống';
				let descText = row.details || row.actionName || 'Yêu cầu chờ xử lý';
				if (row.formDocTaskName) descText = row.formDocTaskName;

				const navigationKey = row.navigationKey || 'VIEW_INCOMING_DOC';

				const availableActions: any[] = [];
				let flags: any = {};
				const openWIs = row.document_id ? (workItemsMap[row.document_id] || []) : [];
				const activeWI = openWIs.find(wi => wi.assigneeUserId === row.receiver || wi.role === 'tonggd');

				if (activeWI && row.document_id && uiType !== 'task') {
					try {
						const version = activeWI.bpmnVersion || '';
						if (!bpmnModelCache[version]) {
							const xml = await this.runtimeDbService.getBpmnFile(activeWI.bpmnVersion || '');
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
								document: { id: row.document_id, typeDocument: uiType === 'doc' ? (navigationKey === 'VIEW_OUTCOMING_DOC' ? 'OutGoingDocument' : 'IncommingDocument') : 'Task' },
								userId: userId,
								getUsersByRole: (role) => this.sqlsvRepo.getUsersByRoleMongoDB(role),
								audit: auditMap[row.document_id] as any[],
							});
							res.availableActions.forEach((act: any) => availableActions.push(act));
							flags = res.flags;
						}
					} catch (e) {
						this.logger.error(`Lỗi tính toán BPMN Actions cho ${row.document_id}: ${e.message}`);
					}
				}
				return {
					id: row.document_id,
					recordId: row.document_id,
					documentType: type,
					isIncomming: type.toLowerCase().includes('incomingdocument') ? true : false,
					key: navigationKey,
					type: uiType,
					icon: iconStr,
					from: `${deptName} · ${senderName}`,
					date: dateStr,
					overdue: overdueStr,
					desc: descText,
					availableActions: type.toLowerCase().includes('task') ? (taskData?.availableActions || []) : availableActions,
					flags: type.toLowerCase().includes('task') ? (taskData?.flags || {}) : flags,
					workItem: activeWI || null,
					openWorkItem: activeWI || null,
				};
			}));

			return {
				total: total,
				list: items,
				page: page,
				limit: limit
			};
		} catch (error) {
			this.logger.error('Lỗi khi lấy Phê duyệt cấp TGĐ Dashboard Premium List: ' + error.message, error.stack);
			return {
				total: 0, list: [], page, limit
			};
		}
	}

	// --- CÔNG VIỆC THEO PHÒNG BAN ---
	/**
	 * Lấy dữ liệu API thống kê 4 segment của Công việc giao trực tiếp cho Phòng ban chủ trì.
	 * Gồm: 
	 * - Xanh lá (Hoàn thành): process_status = 4
	 * - Đang làm (Xanh dương): process_status != 4 và hạn > 7 ngày hoặc không có hạn
	 * - Sắp hạn (Cam): process_status != 4 và hạn <= 7 ngày
	 * - Quá hạn (Đỏ): process_status != 4 và hạn < hôm nay
	 */
	async getPremiumDepartmentTasks() {
		return this.getCachedData(
			'dash:premium:departmentTasks',
			() => this.getPremiumDepartmentTasksFromDb(),
			'refresh-premium-department-tasks',
		);
	}

	async getPremiumDepartmentTasksFromDb() {
		try {
			// Logic query:
			// - Chỉ quét các task giao cho phòng ban (task_users type=2, role='director')
			// - Task đang process (khác 4) HOẶC Task bằng 4 nhưng hoàn thành trong tháng này.
			const query = `
        SELECT TOP 10
          ou.id as p_id,
          ou.name as p_name,
          SUM(CASE WHEN t.id IS NOT NULL AND t.process_status = '4' THEN 1 ELSE 0 END) as done,
          SUM(CASE WHEN t.id IS NOT NULL AND t.process_status != '4' AND (t.end_date > DATEADD(day, 7, GETDATE()) OR t.end_date IS NULL) THEN 1 ELSE 0 END) as doing,
          SUM(CASE WHEN t.id IS NOT NULL AND t.process_status != '4' AND t.end_date >= CAST(GETDATE() AS DATE) AND t.end_date <= DATEADD(day, 7, GETDATE()) THEN 1 ELSE 0 END) as soon,
          SUM(CASE WHEN t.id IS NOT NULL AND t.process_status != '4' AND t.end_date < CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) as late
        FROM organization_units ou WITH (NOLOCK)
        LEFT JOIN task_users tu WITH (NOLOCK) ON tu.process_id = CAST(ou.id as nvarchar) 
                                         AND tu.type = 2 
                                         AND tu.role = 'director'
        LEFT JOIN task t WITH (NOLOCK) ON t.id = tu.task_id
                                      AND (t.process_status != '4' OR (t.process_status = '4' AND MONTH(t.update_at) = MONTH(GETDATE()) AND YEAR(t.update_at) = YEAR(GETDATE())))
        WHERE ou.status = 1
          AND ou.parentId IS NOT NULL
          AND ou.type = N'Phòng'
        GROUP BY ou.id, ou.name
        ORDER BY COUNT(t.id) DESC, ou.name ASC
      `;

			const resultRaw = await this.dataSource.query(query);

			const formatDeptName = (fullName: string) => {
				if (!fullName) return '';
				const nameUpper = fullName.toUpperCase();
				if (nameUpper.includes('PHÒNG CNTT')) return 'CNTT';
				if (nameUpper.includes('KỸ THUẬT')) return 'Kỹ thuật';
				if (nameUpper.includes('HCNS') || nameUpper.includes('HÀNH CHÍNH NHÂN SỰ')) return 'HCNS';
				if (nameUpper.includes('BAN QUẢN LÝ DỰ ÁN')) return 'BQL DA';

				const shortName = fullName.replace(/^(Phòng|Ban|Văn phòng|Trung tâm)\s+/i, '').trim();
				return shortName.charAt(0).toUpperCase() + shortName.slice(1);
			};

			const departmentTasks = resultRaw.map(row => ({
				id: `dept-task-${row.p_id}`,
				name: row.p_name,
				done: Number(row.done || 0),
				doing: Number(row.doing || 0),
				soon: Number(row.soon || 0),
				late: Number(row.late || 0)
			}));

			return departmentTasks;
		} catch (error) {
			this.logger.error('Lỗi khi lấy getPremiumDepartmentTasks: ' + error.message, error.stack);
			return { departmentTasks: [] };
		}
	}


	// --- ĐIỀU HÀNH VĂN BẢN TOÀN CÔNG TY ---
	/**
	 * Lấy cấu trúc dữ liệu Dashboard Điều hành văn bản toàn công ty (Mục 8)
	 * Phục vụ Tab "Tổng quan", "Văn bản đến", "Văn bản đi".
	 * Gồm: Biểu đồ cột ghép 6 tháng in/out, KPI Tổng In/Out, 4 Card Phân loại mức khẩn VB đến.
	 * Danh sách 20 VB Đến và 20 VB Đi mới nhất.
	 */
	async getPremiumDocuments() {
		return this.getCachedData(
			'dash:premium:documents',
			() => this.getPremiumDocumentsFromDb(),
			'refresh-premium-documents',
		);
	}

	async getPremiumDocumentsFromDb() {
		try {
			const formatMonthLabel = (monthNo: number) => `T${monthNo}`;
			const formatTime = (dateInput: string | Date) => {
				if (!dateInput) return '';
				const d = new Date(dateInput);
				const now = new Date();
				if (d.toDateString() === now.toDateString()) {
					return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
				}
				return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
			};

			const normalizeUrgency = (level?: string) => {
				const raw = String(level || '').trim().toUpperCase();
				if (!raw) return { key: 'normal', label: 'THƯỜNG', tone: 'neutral' };

				if ([
					'F5D141FA-C646-4659-926D-BEC6E7904811',
					'THNG-KHN',
					'THƯỢNG KHẨN',
					'THUONG KHAN',
				].includes(raw)) {
					return { key: 'urgent', label: 'THƯỢNG KHẨN', tone: 'red' };
				}

				if (['HỎA TỐC', 'HOA TOC'].includes(raw)) {
					return { key: 'flash', label: 'HỎA TỐC', tone: 'blue' };
				}

				if (['KHẨN', 'KHAN'].includes(raw)) {
					return { key: 'expedite', label: 'KHẨN', tone: 'orange' };
				}

				return { key: 'normal', label: 'THƯỜNG', tone: 'neutral' };
			};

			const [
				monthlyIncomingRaw,
				monthlyOutgoingRaw,
				currentSummaryRaw,
				urgencyRaw,
				incomingRaw,
				outgoingRaw,
			] = await Promise.all([
				this.dataSource.query(`
          SELECT
            YEAR(created_at) AS y,
            MONTH(created_at) AS m,
            COUNT(1) AS total
          FROM incomming_documents WITH (NOLOCK)
          WHERE created_at >= DATEADD(month, -5, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
          GROUP BY YEAR(created_at), MONTH(created_at)
          ORDER BY y ASC, m ASC
        `),
				this.dataSource.query(`
          SELECT
            YEAR(created_at) AS y,
            MONTH(created_at) AS m,
            COUNT(1) AS total
          FROM outgoing_documents WITH (NOLOCK)
          WHERE created_at >= DATEADD(month, -5, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
          GROUP BY YEAR(created_at), MONTH(created_at)
          ORDER BY y ASC, m ASC
        `),
				this.dataSource.query(`
          SELECT
            (SELECT COUNT(1) FROM incomming_documents WITH (NOLOCK)
             WHERE MONTH(created_at) = MONTH(GETDATE()) AND YEAR(created_at) = YEAR(GETDATE())) AS incoming_total,
            (SELECT COUNT(1) FROM outgoing_documents WITH (NOLOCK)
             WHERE MONTH(created_at) = MONTH(GETDATE()) AND YEAR(created_at) = YEAR(GETDATE())) AS outgoing_total,
            (SELECT COUNT(1) FROM incomming_documents WITH (NOLOCK)
             WHERE status != 1 AND MONTH(created_at) = MONTH(GETDATE()) AND YEAR(created_at) = YEAR(GETDATE())) AS incoming_done,
            (SELECT COUNT(1) FROM outgoing_documents WITH (NOLOCK)
             WHERE status != 1 AND MONTH(created_at) = MONTH(GETDATE()) AND YEAR(created_at) = YEAR(GETDATE())) AS outgoing_done
        `),
				this.dataSource.query(`
          SELECT urgency_level, COUNT(1) AS total
          FROM incomming_documents WITH (NOLOCK)
          WHERE MONTH(created_at) = MONTH(GETDATE()) AND YEAR(created_at) = YEAR(GETDATE())
          GROUP BY urgency_level
        `),
				this.dataSource.query(`
          SELECT TOP 15
            d.document_id,
            d.created_at,
            d.abstract_note,
            d.urgency_level
          FROM incomming_documents d WITH (NOLOCK)
          ORDER BY d.created_at DESC
        `),
				this.dataSource.query(`
          SELECT TOP 20
            od.document_id,
            od.created_at,
            od.abstract_note,
            od.drafter,
            u.name AS drafter_name,
            od.status
          FROM outgoing_documents od WITH (NOLOCK)
          LEFT JOIN users u WITH (NOLOCK) ON u.id = od.drafter
          ORDER BY od.created_at DESC
        `),
			]);

			const monthCursor = new Date();
			monthCursor.setDate(1);
			monthCursor.setHours(0, 0, 0, 0);
			monthCursor.setMonth(monthCursor.getMonth() - 5);

			const monthBuckets = Array.from({ length: 6 }, (_, index) => {
				const d = new Date(monthCursor);
				d.setMonth(monthCursor.getMonth() + index);
				return {
					key: `${d.getFullYear()}-${d.getMonth() + 1}`,
					month: d.getMonth() + 1,
				};
			});

			const incomingMap = new Map<string, number>(
				monthlyIncomingRaw.map((item: any) => [`${item.y}-${item.m}`, Number(item.total || 0)]),
			);
			const outgoingMap = new Map<string, number>(
				monthlyOutgoingRaw.map((item: any) => [`${item.y}-${item.m}`, Number(item.total || 0)]),
			);

			const summary = currentSummaryRaw[0] || {};
			const incomingTotal = Number(summary.incoming_total || 0);
			const outgoingTotal = Number(summary.outgoing_total || 0);
			const processedTotal = Number(summary.incoming_done || 0) + Number(summary.outgoing_done || 0);
			const docsTotal = incomingTotal + outgoingTotal;
			const processedRate = docsTotal > 0 ? `${Math.round((processedTotal / docsTotal) * 100)}%` : '0%';

			const categoryAccumulator: Record<string, number> = {
				urgent: 0,
				expedite: 0,
				flash: 0,
				normal: 0,
			};

			urgencyRaw.forEach((item: any) => {
				const urgency = normalizeUrgency(item.urgency_level);
				categoryAccumulator[urgency.key] += Number(item.total || 0);
			});

			const now = new Date();
			const currentMonthTitle = `${String(now.getMonth() + 1).padStart(2, '0')}`;

			return {
				overview: {
					title: 'So sánh văn bản đến & đi (6 tháng gần nhất)',
					months: monthBuckets.map((item) => formatMonthLabel(item.month)),
					incoming: monthBuckets.map((item) => incomingMap.get(item.key) || 0),
					outgoing: monthBuckets.map((item) => outgoingMap.get(item.key) || 0),
					summaryCards: [
						{
							id: 'incoming-total',
							title: `Tổng VB đến tháng ${currentMonthTitle}`,
							value: incomingTotal,
							color: '#2364B0',
						},
						{
							id: 'outgoing-total',
							title: `Tổng VB đi tháng ${currentMonthTitle}`,
							value: outgoingTotal,
							color: '#C085FF',
						},
						{
							id: 'processed-rate',
							title: 'Tỷ lệ xử lý',
							value: processedRate,
							color: '#FF73AA',
						},
					],
					categoryTitle: `Phân loại văn bản tháng ${currentMonthTitle}`,
					categories: [
						{ id: 'urgent', label: 'Thượng khẩn', value: categoryAccumulator.urgent, color: '#EF5350', bgCl: "#EF53501A" },
						{ id: 'expedite', label: 'Khẩn', value: categoryAccumulator.expedite, color: '#FF85E9', bgCl: "#FF85E91A" },
						{ id: 'flash', label: 'Hỏa tốc', value: categoryAccumulator.flash, color: '#FFB973', bgCl: "#FFB9731A" },
						{ id: 'normal', label: 'Thường', value: categoryAccumulator.normal, color: '#5A6573', bgCl: "#5A65731A" },
					],
				},
				incoming: incomingRaw.map((doc: any) => {
					const urgency = normalizeUrgency(doc.urgency_level);
					return {
						id: `in-${doc.document_id}`,
						recordId: doc.document_id,
						key: 'VIEW_INCOMING_DOC',
						time: formatTime(doc.created_at),
						title: doc.abstract_note || `Văn bản #${doc.document_id}`,
						from: doc.sender_number || '',
						urgency: urgency.key,
						urgLabel: urgency.label,
					};
				}),
				outgoing: outgoingRaw.map((doc: any) => ({
					id: `out-${doc.document_id}`,
					key: 'VIEW_OUTCOMING_DOC',
					recordId: doc.document_id,
					time: formatTime(doc.created_at),
					title: doc.abstract_note || `Văn bản #${doc.document_id}`,
					from: `Gửi: ${doc.drafter_name || doc.drafter || ''}`,
					urgency: Number(doc.status || 0) === 1 ? 'pending' : 'done',
					urgLabel: Number(doc.status || 0) === 1 ? 'CHỜ DUYỆT' : 'ĐÃ XỬ LÝ',
				})),
			};
		} catch (error) {
			this.logger.error('Lỗi khi lấy Điều hành VB Dashboard Premium: ' + error.message, error.stack);
			return { documents: { overview: { months: [], incoming: [], outgoing: [], summaryCards: [], categories: [] }, incoming: [], outgoing: [] } };
		}
	}


	// --- YÊU CẦU TIỆN ÍCH ---
	async getPremiumUtilities() {
		return this.getCachedData(
			'dash:premium:utilities',
			() => this.getPremiumUtilitiesFromDb(),
			'refresh-premium-utilities',
		);
	}

	async getPremiumUtilitiesFromDb() {
		try {
			const dbDate = `MONTH(created_at) = MONTH(GETDATE()) AND YEAR(created_at) = YEAR(GETDATE())`;

			// 1. Đặt xe
			const carQuery = `
        SELECT 
          SUM(CASE WHEN status = 1 AND (vehicle_state = 'CHO_DIEU_PHOI' OR status_code IN ('CHUA_TRINH', 'DA_TRINH', 'PENDING')) THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 1 AND ${dbDate} THEN 1 ELSE 0 END) as total_month,
          SUM(CASE WHEN status = 1 AND ${dbDate} AND (vehicle_state IN ('DA_PHAN_CONG', 'TRONG_TIEN_TRINH', 'HOAN_THANH') OR status_code IN ('DA_DUYET', 'APPROVED')) THEN 1 ELSE 0 END) as approved_month
        FROM vehicle_registrations WITH (NOLOCK)
      `;

			// 2. Hộ chiếu
			const passportQuery = `
        SELECT 
          SUM(CASE WHEN is_deleted = 0 AND status IN ('PENDING', 'WAIT_APPROVE') THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN is_deleted = 0 AND ${dbDate} THEN 1 ELSE 0 END) as total_month,
          SUM(CASE WHEN is_deleted = 0 AND ${dbDate} AND status IN ('WAIT_SIGN', 'WAIT_RECEIVE', 'COMPLETED', 'APPROVED') THEN 1 ELSE 0 END) as approved_month
        FROM passport_borrow_requests WITH (NOLOCK)
      `;

			// 3. Phản ánh kiến nghị
			const feedbackQuery = `
        SELECT
          SUM(CASE WHEN status = 1 AND process_status IN (1, 2) THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 1 AND ${dbDate} THEN 1 ELSE 0 END) as total_month,
          SUM(CASE WHEN status = 1 AND ${dbDate} AND process_status = 4 THEN 1 ELSE 0 END) as approved_month
        FROM feedback_suggestions WITH (NOLOCK)
      `;

			const [carRes, passRes, fbRes] = await Promise.all([
				this.dataSource.query(carQuery),
				this.dataSource.query(passportQuery),
				this.dataSource.query(feedbackQuery)
			]);

			const c = carRes[0] || {};
			const p = passRes[0] || {};
			const f = fbRes[0] || {};

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
						{
							id: "car",
							key: "VIEW_BOOK_A_CAR",
							label: "Đăng ký xe",
							icon: 'car',
							color: '#2364B0',
							...(c.pending > 0 && { badge: { value: c.pending, color: '#D9534F' } }),
						},
						{
							id: "passport",
							key: "VIEW_PASSPORT",
							label: "Hộ chiếu",
							color: '#2364B0',
							icon: 'passport',
							...(p.pending > 0 && { badge: { value: p.pending, color: '#D9534F' } }),
						},
						{
							id: "feedback",
							key: "VIEW_FEEDBACK",
							label: "Phản ánh",
							icon: 'feedback',
							color: '#2364B0',
							...(f.pending > 0 && { badge: { value: f.pending, color: '#D9534F' } }),
						}
					],
				},
				statsTitle: "Thống kê tháng này",
				stats: [
					{
						id: "car-rate",
						key: 'VIEW_BOOK_A_CAR',
						label: "YC / Đã duyệt",
						value: `${Number(c.total_month || 0)}`,
						highlight: `${Number(c.approved_month || 0)}`
					},
					{
						id: "passport-rate",
						key: 'VIEW_PASSPORT',
						label: "YC / Đã làm",
						value: `${Number(p.total_month || 0)}`,
						highlight: `${Number(p.approved_month || 0)}`
					},
					{
						id: "feedback-rate",
						key: 'VIEW_FEEDBACK',
						label: "YC / Đã giải quyết",
						value: `${Number(f.total_month || 0)}`,
						highlight: `${Number(f.approved_month || 0)}`
					}
				]
			};
		} catch (error) {
			this.logger.error('Lỗi khi lấy Yêu cầu tiện ích: ' + error.message, error.stack);
			return { topCards: [], monthlyStats: [] };
		}
	}

	async getPremiumHRStats() {
		return this.getCachedData(
			'dash:premium:hrStats',
			() => this.getPremiumHRStatsFromDb(),
			'refresh-premium-hr-stats',
		);
	}

	async getPremiumHRStatsFromDb() {
		try {
			const kpiRes = await this.dataSource.query(`
        SELECT 
          (SELECT COUNT(1) FROM users WITH (NOLOCK) WHERE status = 1) AS total,
          (SELECT COUNT(1) FROM users WITH (NOLOCK) WHERE status = 1 AND MONTH(created_at) = MONTH(GETDATE()) AND YEAR(created_at) = YEAR(GETDATE())) AS new_hires,
          (SELECT COUNT(1) FROM users WITH (NOLOCK) WHERE status = 0 AND MONTH(updated_at) = MONTH(GETDATE()) AND YEAR(updated_at) = YEAR(GETDATE())) AS resigned
      `);

			const distRes = await this.dataSource.query(`
        SELECT 
          ou.name as name,
          COUNT(u.id) as count
        FROM organization_units ou WITH (NOLOCK)
        LEFT JOIN users u WITH (NOLOCK) ON u.parent = ou.id AND u.status = 1
        WHERE ou.status = 1
        GROUP BY ou.id, ou.name
        HAVING COUNT(u.id) > 0
        ORDER BY count DESC
      `);

			const total = Number(kpiRes[0]?.total || 0);
			const newHires = Number(kpiRes[0]?.new_hires || 0);
			const resigned = Number(kpiRes[0]?.resigned || 0);

			const slugify = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-');

			const departments = distRes.map((r: any) => ({
				id: slugify(r.name),
				name: r.name,
				count: Number(r.count),
			}));

			const currentMonth = new Date().getMonth() + 1;

			return {
				totalEmployees: total,
				stats: [
					{ id: "total", value: total.toLocaleString('en-US'), label: "Tổng CBNV", tone: "blue" },
					{ id: "new", value: String(newHires), label: `Tuyển mới T${currentMonth}`, tone: "green" },
					{ id: "resigned", value: String(resigned), label: `Nghỉ việc T${currentMonth}`, tone: "red" }
				],
				departments
			}
		} catch (error) {
			this.logger.error('Lỗi khi lấy getPremiumHRStats: ' + error.message, error.stack);
			return {
				hrOverview: {
					totalEmployees: 0,
					stats: [],
					departments: []
				}
			};
		}
	}

	async getPremiumMeetings(userId: string, limit: number = 5) {
		return this.getCachedData(
			`dash:premium:meetings:${userId}`,
			() => this.getPremiumMeetingsFromDb(userId, limit),
			'refresh-premium-meetings',
			{ userId, limit },
		);
	}

	async getPremiumMeetingsFromDb(userId: string, limit: number = 5) {
		try {
			const pad = (n: number) => n < 10 ? '0' + n : n;
			const getLocalDateString = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

			const currentDateTime = new Date();
			const currentDateTimeStr = `${getLocalDateString(currentDateTime)} ${pad(currentDateTime.getHours())}:${pad(currentDateTime.getMinutes())}:${pad(currentDateTime.getSeconds())}`;
			const dateStrToday = getLocalDateString(currentDateTime);

			// Tính toán startOfWeek và endOfWeek (Thứ 2 đến Chủ Nhật) theo local time
			const day = currentDateTime.getDay(); // 0: CN, 1: T2, ...
			const diffStart = currentDateTime.getDate() - day + (day === 0 ? -6 : 1);
			const startOfWeek = new Date(currentDateTime);
			startOfWeek.setDate(diffStart);

			const endOfWeek = new Date(startOfWeek);
			endOfWeek.setDate(startOfWeek.getDate() + 6);

			const startOfWeekStr = getLocalDateString(startOfWeek);
			const endOfWeekStr = getLocalDateString(endOfWeek);

			const rawMeetings = await this.dataSource.query(`
        SELECT DISTINCT
          m.id, m.title, m.meeting_date, m.meeting_time, m.meeting_mode, m.room_ids, m.started_at, m.ended_at,
          mp.participant_state,
          (SELECT COUNT(1) FROM ${this.dbname}.meeting_participants mp2 WITH (NOLOCK) JOIN ${this.dbname}.meeting_units mu2 WITH (NOLOCK) ON mp2.meeting_unit_id = mu2.id WHERE mu2.meeting_id = m.id) AS attendee_count,
          mr.name AS room_name
        FROM ${this.dbname}.meetings m WITH (NOLOCK)
        INNER JOIN ${this.dbname}.meeting_units mu WITH (NOLOCK) ON mu.meeting_id = m.id
        INNER JOIN ${this.dbname}.meeting_participants mp WITH (NOLOCK) ON mp.meeting_unit_id = mu.id
        LEFT JOIN ${this.dbname}.meeting_rooms mr WITH (NOLOCK) ON CAST(mr.id AS NVARCHAR(100)) = m.room_ids
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
          AND (
            m.meeting_date > CAST(@3 AS DATE)
            OR (
              m.meeting_date = CAST(@3 AS DATE)
              AND TRY_CAST(
                CAST(m.meeting_date AS VARCHAR(10)) + ' ' + 
                ISNULL(
                  NULLIF(
                    CASE 
                      WHEN CHARINDEX('-', m.meeting_time) > 0 
                      THEN LTRIM(RTRIM(SUBSTRING(m.meeting_time, CHARINDEX('-', m.meeting_time) + 1, LEN(m.meeting_time))))
                      ELSE LTRIM(RTRIM(m.meeting_time))
                    END,
                    ''
                  ),
                  '08:00'
                ) AS DATETIME
              ) >= @3
            )
          )
        ORDER BY m.meeting_date ASC, m.meeting_time ASC
        OFFSET 0 ROWS FETCH NEXT @4 ROWS ONLY
      `, [userId, startOfWeekStr, endOfWeekStr, currentDateTimeStr, limit]);

			const meetingIds = rawMeetings.map((m: any) => String(m.id));
			const [workItems, auditHistory] = await Promise.all([
				meetingIds.length > 0 ? this.workItemRepo.find({
					where: { documentId: In(meetingIds), state: In(['OPEN', 'ASSIGNED', 'open', 'Assigned']) },
				}) : Promise.resolve([]),
				meetingIds.length > 0 ? this.auditRepo.find({
					where: { documentId: In(meetingIds) },
					order: { createdAt: 'DESC' },
				}) : Promise.resolve([]),
			]);

			const workItemsMap: Record<string, WorkItemEntity[]> = {};
			workItems.forEach(wi => {
				if (wi.documentId) {
					if (!workItemsMap[wi.documentId]) workItemsMap[wi.documentId] = [];
					workItemsMap[wi.documentId].push(wi);
				}
			});

			const auditMap: Record<string, Audit[]> = {};
			auditHistory.forEach(a => {
				if (a.documentId) {
					if (!auditMap[a.documentId]) auditMap[a.documentId] = [];
					auditMap[a.documentId].push(a);
				}
			});

			const bpmnModelCache: Record<string, { definitions: BpmnDefinitions; process: BpmnProcess; indexes: any }> = {};
			const rolesCache: Record<string, any[]> = {};

			const meetings = await Promise.all(rawMeetings.map(async (m: any) => {
				let durationStr = "N/A";
				let startTimeStr = m.meeting_time || "08:00";
				let isLive = false;

				if (m.meeting_time && m.meeting_time.includes('-')) {
					const parts = m.meeting_time.split('-');
					startTimeStr = parts[0].trim();
					const endTimeStr = parts[1].trim();

					const [sh, sm] = startTimeStr.split(':').map(Number);
					const [eh, em] = endTimeStr.split(':').map(Number);

					if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
						const diffMins = (eh * 60 + em) - (sh * 60 + sm);
						const hours = Math.floor(diffMins / 60);
						const mins = diffMins % 60;
						if (diffMins > 0) {
							if (hours > 0) {
								const fraction = Math.round(mins / 6);
								durationStr = mins > 0 ? `${hours}.${fraction} giờ` : `${hours} giờ`;
							} else {
								durationStr = `${diffMins} phút`;
							}
						}

						// Live check (only if today)
						const meetingDateStr = m.meeting_date instanceof Date ? getLocalDateString(m.meeting_date) : String(m.meeting_date).substring(0, 10);
						if (meetingDateStr === dateStrToday) {
							const currentMinutes = currentDateTime.getHours() * 60 + currentDateTime.getMinutes();
							const startMinutes = sh * 60 + sm;
							const endMinutes = eh * 60 + em;
							isLive = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
						}
					}
				}

				// Date Label formatting
				const meetingDate = m.meeting_date instanceof Date ? m.meeting_date : new Date(m.meeting_date);
				let dateLabel = "N/A";
				if (!isNaN(meetingDate.getTime())) {
					const mDay = meetingDate.getDate();
					const mMonth = meetingDate.getMonth() + 1;

					if (meetingDate.toDateString() === currentDateTime.toDateString()) {
						dateLabel = "Hôm nay";
					} else {
						dateLabel = `${pad(mDay)}/${pad(mMonth)}`;
					}
				}

				const location = m.meeting_mode === 'ONLINE' ? '💻 Teams' : '🏢 ' + (m.room_name || 'Phòng họp');
				const countStr = Number(m.attendee_count || 0) > 0 ? ` · 👥 ${m.attendee_count} người` : "";

				// TÍNH TOÁN AVAILABLE ACTIONS
				const availableActions: any[] = [];
				let flags: any = {};
				const openWIs = m.id ? (workItemsMap[m.id] || []) : [];
				const openWorkItem = openWIs.find(wi => wi.assigneeUserId === userId);

				if (openWorkItem && m.id) {
					try {
						const version = openWorkItem.bpmnVersion || '';
						if (version) {
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
									currentNodeId: openWorkItem.nodeId || '',
									workItem: openWorkItem as any,
									document: { id: m.id, typeDocument: 'IncommingDocument' }, // Hoặc 'Meeting' nếu quy trình định vị khác
									userId: userId,
									getUsersByRole: async (role) => {
										if (!rolesCache[role]) {
											rolesCache[role] = await this.sqlsvRepo.getUsersByRoleMongoDB(role);
										}
										return rolesCache[role];
									},
									audit: (auditMap[m.id] || []).map((a: any) => ({
										...a,
										role: a.role ?? undefined,
										userId: a.userId ?? undefined,
										displayName: a.displayName ?? undefined,
										receiver: a.receiver ?? undefined,
										roleProcess: a.roleProcess ?? undefined,
										toNodeId: a.toNodeId ?? undefined,
										typeDocument: a.typeDocument ?? undefined,
									})),
								});
								res.availableActions.forEach((act: any) => availableActions.push(act));
								flags = res.flags;
							}
						}
					} catch (e) {
						this.logger.error(`Lỗi tính toán BPMN Actions cho cuộc họp ${m.id}: ${e.message}`);
					}
				}
				return {
					id: m.id,
					recordId: m.id,
					key: 'VIEW_MEETING_ROOM',
					time: startTimeStr,
					meetingDate: m.meeting_date,
					date: dateLabel,
					title: m.title,
					detail: `${location} · ⏱ ${durationStr}${countStr}`,
					live: isLive,
					type: "confirm",
					availableActions,
					flags,
					workItem: openWorkItem || null,
					participantState: m.participant_state,
					blockColor: [ParticipantState.CONFIRMED, ParticipantState.DONE, ParticipantState.PROCESSING]?.includes(m.participant_state) ? "#2364B0": "#DDE0E4"
				};
			}));

			const uniqueMeetings: any[] = [];
			const seenIds = new Set<string>();
			for (const item of meetings) {
				if (item.id) {
					const idStr = String(item.id);
					if (!seenIds.has(idStr)) {
						seenIds.add(idStr);
						uniqueMeetings.push(item);
					}
				} else {
					uniqueMeetings.push(item);
				}
			}

			return uniqueMeetings;

		} catch (error) {
			this.logger.error('Lỗi khi lấy getPremiumMeetings: ' + error.message, error.stack);
			return [];
		}
	}

	async getPremiumNews() {
		return this.getCachedData(
			'dash:premium:news',
			() => this.getPremiumNewsFromDb(),
			'refresh-premium-news',
		);
	}

	async getPremiumNewsFromDb() {
		try {
			const rawNews = await this.dataSource.query(`
        SELECT TOP 10
          n.id, n.title, n.publishedAt, n.viewCount,
          (
            SELECT TOP 1 fr.file_id
            FROM file_relations fr WITH (NOLOCK)
            INNER JOIN files f WITH (NOLOCK) ON fr.file_id = f.id
            WHERE fr.object_id = CAST(n.id AS VARCHAR(50))
              AND fr.object_type = 'news'
              AND fr.status = 1
              AND f.status = 1
            ORDER BY fr.created_at DESC
          ) AS thumbnail_id,
          (SELECT COUNT(1) FROM news_like nl WITH (NOLOCK) WHERE nl.objectId = n.id AND nl.type = 'NEWS' AND nl.isLike = 1) AS like_count,
          (SELECT COUNT(1) FROM news_comment nc WITH (NOLOCK) WHERE nc.newsId = n.id) AS comment_count
        FROM news n WITH (NOLOCK)
        WHERE n.status = 1 
        ORDER BY n.publishedAt DESC
      `);

			const defaultIcons = ["🚀", "🏆", "🎁", "📚", "🔒", "💡", "📢", "🌟"];

			const news = rawNews.map((n: any, index: number) => {
				const mDate = n.publishedAt ? new Date(n.publishedAt) : new Date();
				const day = mDate.getDate();
				const month = mDate.getMonth() + 1;
				const dateStr = `${day < 10 ? '0' + day : day}/${month < 10 ? '0' + month : month}`;

				const views = Number(n.viewCount || 0);
				const likes = Number(n.like_count || 0);
				const comments = Number(n.comment_count || 0);
				const imageUrl = n.thumbnail_id ? `/files/view/${n.thumbnail_id}` : null;

				return {
					id: `${n.id}`,
					recordId: n.id,
					key: 'VIEW_NEWS',
					icon: defaultIcons[index % defaultIcons.length],
					title: n.title,
					stats: `❤️ ${likes} · 👁 ${views.toLocaleString('en-US')} · 💬 ${comments}`,
					date: dateStr,
					image: imageUrl,
					thumbnail: imageUrl,
				};
			});

			return news;

		} catch (error) {
			this.logger.error('Lỗi khi lấy getPremiumNews: ' + error.message, error.stack);
			return { news: [] };
		}
	}

	async getPremiumEvents() {
		return this.getCachedData(
			'dash:premium:events',
			() => this.getPremiumEventsFromDb(),
			'refresh-premium-events',
		);
	}

	async getPremiumEventsFromDb() {
		try {
			const rawEvents = await this.dataSource.query(`
        SELECT TOP 5
          id, title, startTime, endTime, location
        FROM news_calendar WITH (NOLOCK)
        WHERE status = 1 AND startTime >= CAST(GETDATE() AS DATE)
        ORDER BY startTime ASC
      `);

			const events = rawEvents.map((e: any) => {
				const sDate = new Date(e.startTime);
				const eDate = e.endTime ? new Date(e.endTime) : null;

				const day = sDate.getDate();
				const month = sDate.getMonth() + 1;
				const dayStr = day < 10 ? `0${day}` : `${day}`;
				const monthStr = `THG ${month}`;

				const sHours = sDate.getHours();
				const sMins = sDate.getMinutes();
				const sTimeStr = `${sHours < 10 ? '0' + sHours : sHours}:${sMins < 10 ? '0' + sMins : sMins}`;

				let infoStr = `${sTimeStr}`;
				if (eDate) {
					const eHours = eDate.getHours();
					const eMins = eDate.getMinutes();
					const eTimeStr = `${eHours < 10 ? '0' + eHours : eHours}:${eMins < 10 ? '0' + eMins : eMins}`;
					infoStr = `${sTimeStr} – ${eTimeStr}`;
				}

				if (e.location) {
					infoStr += ` · ${e.location}`;
				}

				return {
					id: e.id,
					key: 'VIEW_EVENT',
					recordId: e.id,
					day: dayStr,
					month: monthStr,
					title: e.title,
					info: infoStr
				};
			});

			return events;

		} catch (error) {
			this.logger.error('Lỗi khi lấy getPremiumEvents: ' + error.message, error.stack);
			return { events: [] };
		}
	}

	async getCompanyTasks(userId: string, queryParams: any) {
		return this.taskService.getCompanyTasksForDashboard(queryParams, userId);
	}

	async getCompanyDocuments(userId: string, queryParams: any) {
		const type = queryParams.type || 'all';
		const page = Number(queryParams.page) || 1;
		const limit = Number(queryParams.limit) || 10;
		const offset = (page - 1) * limit;
		const processFn = queryParams.processFn;

		// 1. Build where conditions for both tables matching statistics card logic exactly
		let incomingWhere = `d.status = 1 AND MONTH(d.created_at) = MONTH(GETDATE()) AND YEAR(d.created_at) = YEAR(GETDATE())`;
		let outgoingWhere = `d.status = 1 AND MONTH(d.created_at) = MONTH(GETDATE()) AND YEAR(d.created_at) = YEAR(GETDATE())`;

		if (type === 'processed') {
			incomingWhere += ` AND EXISTS (
				SELECT 1 FROM audit a WITH (NOLOCK)
				WHERE a.document_id = d.document_id
				  AND a.type_document IN ('IncommingDocument', 'IncomingDocument')
				  AND a.stage_status IN ('HOAN_THANH_VAN_BAN', 'HOAN_THANH')
			)`;
			outgoingWhere += ` AND EXISTS (
				SELECT 1 FROM audit a WITH (NOLOCK)
				WHERE a.document_id = d.document_id
				  AND a.type_document = 'OutGoingDocument'
				  AND a.stage_status IN ('DA_BAN_HANH', 'DA_DONG_DAU')
			)`;
		} else if (type === 'late' || type === 'doc-late') {
			incomingWhere += ` AND d.deadline < GETDATE() AND NOT EXISTS (
				SELECT 1 FROM audit a WITH (NOLOCK)
				WHERE a.document_id = d.document_id
				  AND a.type_document = 'IncommingDocument'
				  AND a.stage_status IN ('HOAN_THANH_VAN_BAN', 'HOAN_THANH')
			)`;
			outgoingWhere += ` AND d.deadline_reply < GETDATE() AND NOT EXISTS (
				SELECT 1 FROM audit a WITH (NOLOCK)
				WHERE a.document_id = d.document_id
				  AND a.type_document = 'OutGoingDocument'
				  AND a.stage_status IN ('DA_BAN_HANH', 'DA_DONG_DAU')
			)`;
		}

		// 2. Build the unified CTE query (selecting original DB columns with NULL columns for UNION alignment)
		const baseQuery = `
			SELECT 
				d.document_id AS document_id,
				d.to_book_code AS to_book_code,
				NULL AS text_symbols,
				d.abstract_note AS abstract_note,
				d.document_date AS document_date,
				d.deadline AS deadline,
				NULL AS deadline_reply,
				d.created_at AS created_at,
				d.signer AS signer,
				NULL AS report_signer,
				( SELECT TOP 1 a.action_code FROM audit a WITH (NOLOCK) WHERE a.document_id = d.document_id AND a.type_document IN ('IncomingDocument', 'IncommingDocument') ORDER BY a.id DESC ) AS status_code,
				'incoming' AS docType,
				N'Văn bản đến' AS docTypeText,
				CASE WHEN EXISTS (
					SELECT 1 FROM audit a WITH (NOLOCK)
					WHERE a.document_id = d.document_id
					  AND a.type_document IN ('IncommingDocument', 'IncomingDocument')
					  AND a.stage_status IN ('HOAN_THANH_VAN_BAN', 'HOAN_THANH')
				) THEN N'Đã xử lý' ELSE N'Chưa xử lý' END AS processStatusText
			FROM incomming_documents d WITH (NOLOCK)
			WHERE ${incomingWhere}

			UNION ALL

			SELECT 
				d.document_id AS document_id,
				NULL AS to_book_code,
				d.text_symbols AS text_symbols,
				d.abstract_note AS abstract_note,
				d.document_date AS document_date,
				NULL AS deadline,
				d.deadline_reply AS deadline_reply,
				d.created_at AS created_at,
				NULL AS signer,
				d.report_signer AS report_signer,
				( SELECT TOP 1 a.stage_status FROM audit a WITH (NOLOCK) WHERE a.document_id = d.document_id AND a.type_document = 'OutGoingDocument' ORDER BY a.id DESC ) AS status_code,
				'outgoing' AS docType,
				N'Văn bản đi' AS docTypeText,
				CASE WHEN EXISTS (
					SELECT 1 FROM audit a WITH (NOLOCK)
					WHERE a.document_id = d.document_id
					  AND a.type_document = 'OutGoingDocument'
					  AND a.stage_status IN ('DA_BAN_HANH', 'DA_DONG_DAU')
				) THEN N'Đã xử lý' ELSE N'Chưa xử lý' END AS processStatusText
			FROM outgoing_documents d WITH (NOLOCK)
			WHERE ${outgoingWhere}
		`;

		// 3. Search filter by keyword
		const filterName = queryParams.filter?.name || queryParams.name;
		const filterCode = queryParams.filter?.code || queryParams.code;
		const keyword = filterName || filterCode;

		let finalQuery = `WITH CombinedDocs AS (${baseQuery}) SELECT * FROM CombinedDocs`;
		let countQuery = `WITH CombinedDocs AS (${baseQuery}) SELECT COUNT(1) AS total FROM CombinedDocs`;
		const bindParams: any[] = [];

		if (keyword) {
			const filterClause = ` WHERE abstract_note LIKE @0 OR to_book_code LIKE @0 OR text_symbols LIKE @0 OR CAST(document_id AS VARCHAR(20)) LIKE @0`;
			finalQuery += filterClause;
			countQuery += filterClause;
			bindParams.push(`%${keyword}%`);
		}

		// Pagination & sorting
		finalQuery += ` ORDER BY created_at DESC OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;

		const countRes = await this.dataSource.query(countQuery, bindParams);
		const total = Number(countRes[0]?.total || 0);

		const dataRes = await this.dataSource.query(finalQuery, bindParams);

		// 4. Map columns to configuration aliases using buildSelectFieldsNew
		const incomingConfig = await this.configurationService.buildSelectFieldsNew('incomming_documents', [], processFn);
		const outgoingConfig = await this.configurationService.buildSelectFieldsNew('outgoing_documents', [], processFn);

		const mappedItems = dataRes.map((row: any) => {
			const mappedRow: Record<string, any> = {};
			const aliases = row.docType === 'outgoing' ? outgoingConfig.aliases : incomingConfig.aliases;
			
			for (const [colName, val] of Object.entries(row)) {
				// Keep helper fields as-is
				if (colName === 'docType' || colName === 'docTypeText' || colName === 'processStatusText' || colName === 'status_code') {
					mappedRow[colName] = val;
					continue;
				}
				// Skip null columns that were generated for UNION alignment
				if (val === null && (colName === 'to_book_code' || colName === 'text_symbols' || colName === 'deadline' || colName === 'deadline_reply' || colName === 'signer' || colName === 'report_signer')) {
					continue;
				}
				const alias = aliases[colName] || colName;
				mappedRow[alias] = val;
			}

			// Format status/statusCode/status_code
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

			// Map to configuration alias keys
			const statusAlias = aliases['status'] || 'status';
			const statusCodeAlias = aliases['statusCode'] || aliases['status_code'] || 'statusCode';
			
			mappedRow[statusAlias] = formattedStatus;
			mappedRow[statusCodeAlias] = formattedStatus;
			mappedRow['status_code'] = formattedStatus;
			mappedRow['statusCode'] = formattedStatus;
			mappedRow['status'] = formattedStatus;

			return mappedRow;
		});

		return {
			success: true,
			data: mappedItems,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}
}

