import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MeetingService } from 'src/meeting/meeting.service';
import { TaskService, RED_FLAG_SVG, WHITE_FLAG_SVG } from 'src/task/task.service';
import { buildProgressView } from 'src/task/progress.util';
import { mapActionIncomingToLabel, mapActionToLabel } from 'src/documents/helpers/build.filter';
import { DashboardPageCacheService } from './dashboard-page-cache.service';

@Injectable()
export class DashboardPageNormalService {
	private readonly logger = new Logger(DashboardPageNormalService.name);

	// TODO: Chuyển sang config service hoặc bảng system_settings để admin cấu hình
	private readonly TARGET_COMPLETION_RATE = 85;

	constructor(
		@InjectDataSource('mssqlConnection') private readonly dataSource: DataSource,
		private readonly meetingService: MeetingService,
		private readonly cacheService: DashboardPageCacheService,
		private readonly taskService: TaskService,
	) { }

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

	// ─── 1. STATS – 4 THẺ KPI ──────────────────────────────────────────────────
	//
	// Trả về mảng 4 thẻ KPI cho nhân viên:
	//   Văn bản đến · Văn bản đi · Lịch họp tuần này · Công việc
	//
	// Shape khớp 100% với dataDashboardNormalStats (dashboard-normal.ts)
	//
	// @param userId  ID nhân viên hiện tại, lấy từ JWT / session guard
	// ─────────────────────────────────────────────────────────────────────────────
	async getStatsNormal(userId: string) {
		return this.getCachedData(
			`dash:normal:stats:${userId}`,
			() => this.getStatsNormalFromDb(userId),
			'refresh-normal-stats',
			{ userId },
		);
	}

	async getStatsNormalFromDb(userId: string) {
		try {
			const { parent: receiverUnit, position } = await this.getUserInfo(userId);
			const normalized = this.normalizePosition(position);
			const isVanThu = normalized === 'vanthu';
			// --- CARD 1: VĂN BẢN ĐẾN ---
			// la_doc : audit mới nhất của document  → check stage_status (flow đã kết thúc chưa)
			// la_user: audit mới nhất của USER trên document → check user còn đang giữ không
			const p1Overdue = this.dataSource.query(
				`SELECT
          COUNT(DISTINCT CASE WHEN
            (MONTH(id_doc.created_at) = MONTH(GETDATE()) AND YEAR(id_doc.created_at) = YEAR(GETDATE()))
            OR (MONTH(la_user.updated_at) = MONTH(GETDATE()) AND YEAR(la_user.updated_at) = YEAR(GETDATE()))
          THEN id_doc.document_id END) AS overdue_cur,

          COUNT(DISTINCT CASE WHEN
            (MONTH(id_doc.created_at) = MONTH(DATEADD(month,-1,GETDATE())) AND YEAR(id_doc.created_at) = YEAR(DATEADD(month,-1,GETDATE())))
            OR (MONTH(la_user.updated_at) = MONTH(DATEADD(month,-1,GETDATE())) AND YEAR(la_user.updated_at) = YEAR(DATEADD(month,-1,GETDATE())))
          THEN id_doc.document_id END) AS overdue_prev

        FROM incomming_documents id_doc WITH (NOLOCK)
        CROSS APPLY (
          SELECT TOP 1 a.stage_status
          FROM audit a WITH (NOLOCK)
          WHERE a.document_id = id_doc.document_id
          ORDER BY a.id DESC
        ) la_doc
        OUTER APPLY (
          SELECT TOP 1 a.receiver, a.updated_at, a.deadline, a.stage_status
          FROM audit a WITH (NOLOCK)
          WHERE a.document_id = id_doc.document_id
            AND a.receiver = @0
          ORDER BY a.id DESC
        ) la_user
        WHERE la_user.receiver IS NOT NULL
          AND id_doc.status != 3
          AND la_doc.stage_status != 'HOAN_THANH_VAN_BAN'
          AND COALESCE(la_user.deadline, id_doc.deadline, id_doc.resolution_deadline) < GETDATE()`,
				[userId],
			);

			// Chờ xử lý: la_user.stage_status IN ('CHUA_XU_LY', 'THU_HOI')
			const p1Pending = this.dataSource.query(
				`SELECT
          COUNT(DISTINCT CASE WHEN
            MONTH(id_doc.created_at) = MONTH(GETDATE())
            AND YEAR(id_doc.created_at) = YEAR(GETDATE())
          THEN id_doc.document_id END) AS pending_cur,

          COUNT(DISTINCT CASE WHEN
            MONTH(id_doc.created_at) = MONTH(DATEADD(month,-1,GETDATE()))
            AND YEAR(id_doc.created_at) = YEAR(DATEADD(month,-1,GETDATE()))
          THEN id_doc.document_id END) AS pending_prev

        FROM incomming_documents id_doc WITH (NOLOCK)
        LEFT JOIN incomming_current_state af WITH (NOLOCK)
          ON af.document_id = id_doc.document_id
        INNER JOIN incomming_assignment au WITH (NOLOCK)
          ON au.document_id  = id_doc.document_id
          AND au.receiver    = @0
          AND au.stage_status = 'CHUA_XU_LY'
        WHERE id_doc.status = 1`,
				[userId],
			);

			// Đang xử lý: la_user.stage_status = 'DANG_XU_LY'
			const p1InProgress = this.dataSource.query(
				`SELECT
          COUNT(DISTINCT CASE WHEN
            (MONTH(id_doc.created_at) = MONTH(GETDATE()) AND YEAR(id_doc.created_at) = YEAR(GETDATE()))
            OR (MONTH(la_user.updated_at) = MONTH(GETDATE()) AND YEAR(la_user.updated_at) = YEAR(GETDATE()))
          THEN id_doc.document_id END) AS in_progress_cur,

          COUNT(DISTINCT CASE WHEN
            (MONTH(id_doc.created_at) = MONTH(DATEADD(month,-1,GETDATE())) AND YEAR(id_doc.created_at) = YEAR(DATEADD(month,-1,GETDATE())))
            OR (MONTH(la_user.updated_at) = MONTH(DATEADD(month,-1,GETDATE())) AND YEAR(la_user.updated_at) = YEAR(DATEADD(month,-1,GETDATE())))
          THEN id_doc.document_id END) AS in_progress_prev

        FROM incomming_documents id_doc WITH (NOLOCK)
        CROSS APPLY (
          SELECT TOP 1 a.stage_status
          FROM audit a WITH (NOLOCK)
          WHERE a.document_id = id_doc.document_id
          ORDER BY a.id DESC
        ) la_doc
        OUTER APPLY (
          SELECT TOP 1 a.receiver, a.updated_at, a.deadline, a.stage_status
          FROM audit a WITH (NOLOCK)
          WHERE a.document_id = id_doc.document_id
            AND a.receiver = @0
          ORDER BY a.id DESC
        ) la_user
        WHERE la_user.receiver IS NOT NULL
          AND id_doc.status != 3
          AND la_doc.stage_status != 'HOAN_THANH_VAN_BAN'
          AND la_user.stage_status = 'DANG_XU_LY'`,
				[userId],
			);

			// --- CARD 2: VĂN BẢN ĐI ---
			// p2Overdue : overdue thuần — la_user đang giữ document, deadline đã qua
			// p2Draft   : dự thảo — audit ưu tiên CHUA_XU_LY của user/unit, last_audit cũng CHUA_XU_LY
			// p2Pending : chờ duyệt — la_user đã DA_XU_LY, audit ngay sau đó created_by=user != CHUA_XU_LY

			const p2Overdue = this.dataSource.query(
				`SELECT
          COUNT(DISTINCT CASE WHEN
            (MONTH(od.created_at) = MONTH(GETDATE()) AND YEAR(od.created_at) = YEAR(GETDATE()))
            OR (MONTH(la_user.updated_at) = MONTH(GETDATE()) AND YEAR(la_user.updated_at) = YEAR(GETDATE()))
          THEN od.document_id END) AS overdue_cur,

          COUNT(DISTINCT CASE WHEN
            (MONTH(od.created_at) = MONTH(DATEADD(month,-1,GETDATE())) AND YEAR(od.created_at) = YEAR(DATEADD(month,-1,GETDATE())))
            OR (MONTH(la_user.updated_at) = MONTH(DATEADD(month,-1,GETDATE())) AND YEAR(la_user.updated_at) = YEAR(DATEADD(month,-1,GETDATE())))
          THEN od.document_id END) AS overdue_prev

        FROM outgoing_documents od WITH (NOLOCK)
        CROSS APPLY (
          SELECT TOP 1 a.receiver, a.updated_at, a.deadline
          FROM audit a WITH (NOLOCK)
          WHERE a.document_id = od.document_id
            AND a.receiver = @0
          ORDER BY a.id DESC
        ) la_user
        CROSS APPLY (
          SELECT TOP 1 a.stage_status
          FROM audit a WITH (NOLOCK)
          WHERE a.document_id = od.document_id
          ORDER BY a.id DESC
        ) la_doc
        WHERE od.status = 1
          AND la_doc.stage_status NOT IN ('BAN_HANH_DU_THAO', 'DA_BAN_HANH')
          AND COALESCE(la_user.deadline, od.deadline_reply) < GETDATE()
          AND NULLIF(LTRIM(RTRIM(CONVERT(NVARCHAR(MAX), od.abstract_note))), '') IS NOT NULL
          AND UPPER(LTRIM(RTRIM(CONVERT(NVARCHAR(MAX), od.abstract_note)))) <> 'NULL'`,
				[userId],
			);

			const p2Draft = this.dataSource.query(
				`SELECT
          COUNT(DISTINCT CASE WHEN
            (MONTH(od.created_at) = MONTH(GETDATE()) AND YEAR(od.created_at) = YEAR(GETDATE()))
            OR (MONTH(audit_user.updated_at) = MONTH(GETDATE()) AND YEAR(audit_user.updated_at) = YEAR(GETDATE()))
          THEN od.document_id END) AS draft_cur,

          COUNT(DISTINCT CASE WHEN
            (MONTH(od.created_at) = MONTH(DATEADD(month,-1,GETDATE())) AND YEAR(od.created_at) = YEAR(DATEADD(month,-1,GETDATE())))
            OR (MONTH(audit_user.updated_at) = MONTH(DATEADD(month,-1,GETDATE())) AND YEAR(audit_user.updated_at) = YEAR(DATEADD(month,-1,GETDATE())))
          THEN od.document_id END) AS draft_prev

        FROM outgoing_documents od WITH (NOLOCK)
        CROSS APPLY (
          SELECT TOP 1
            a.receiver, a.receiver_unit, a.stage_status,
            a.action_code, a.created_by, a.updated_at
          FROM audit a WITH (NOLOCK)
          WHERE a.document_id = od.document_id
            AND (
              a.receiver      = @0
              OR a.created_by = @0
              OR a.receiver   = @1
              OR a.receiver_unit = @1
            )
          ORDER BY
            CASE WHEN a.stage_status = 'CHUA_XU_LY' THEN 1 ELSE 99 END,
            a.id DESC
        ) audit_user
        WHERE od.status = 1
          AND od.status_code = '1'
          AND audit_user.stage_status = 'CHUA_XU_LY'
          AND NULLIF(LTRIM(RTRIM(CONVERT(NVARCHAR(MAX), od.abstract_note))), '') IS NOT NULL
          AND UPPER(LTRIM(RTRIM(CONVERT(NVARCHAR(MAX), od.abstract_note)))) <> 'NULL'`,
				[userId, receiverUnit],
			);

			// Chọn đúng query pending theo position: vanthu → p2PendingVanThu, còn lại → p2Pending
			const p2PendingQuery = isVanThu
				? this.dataSource.query(
					`SELECT
             COUNT(DISTINCT CASE WHEN
               (MONTH(od.created_at) = MONTH(GETDATE()) AND YEAR(od.created_at) = YEAR(GETDATE()))
               OR (MONTH(latest_oa.updated_at) = MONTH(GETDATE()) AND YEAR(latest_oa.updated_at) = YEAR(GETDATE()))
             THEN combined.document_id END) AS pending_cur,

             COUNT(DISTINCT CASE WHEN
               (MONTH(od.created_at) = MONTH(DATEADD(month,-1,GETDATE())) AND YEAR(od.created_at) = YEAR(DATEADD(month,-1,GETDATE())))
               OR (MONTH(latest_oa.updated_at) = MONTH(DATEADD(month,-1,GETDATE())) AND YEAR(latest_oa.updated_at) = YEAR(DATEADD(month,-1,GETDATE())))
             THEN combined.document_id END) AS pending_prev

           FROM (
             -- Tab 1: ChoBanHanh
             SELECT od1.document_id
             FROM outgoing_documents od1 WITH (NOLOCK)
             INNER JOIN outgoing_current_state ocs1 WITH (NOLOCK)
               ON ocs1.document_id = od1.document_id
             LEFT JOIN outgoing_assignment oa1 WITH (NOLOCK)
               ON oa1.document_id = od1.document_id
               AND (
                 oa1.receiver      = @0
                 OR oa1.receiver      = @1
                 OR oa1.receiver_unit = @1
                 OR oa1.receiver      = 'CAN_CHO_SO'
               )
             WHERE od1.status_code IN ('15','16','9')
               AND oa1.document_id IS NOT NULL
               AND (
                 ocs1.current_stage_status = 'HT_VBTT'
                 OR ocs1.current_stage_status = 'BAN_HANH_TO_TRINH'
                 OR (
                   ocs1.current_stage_status = 'CHUA_XU_LY'
                   AND ocs1.current_action_code IN ('KY_SO','CHO_SO','DONG_DAU','KY_PHAT_HANH')
                 )
                 OR ocs1.current_stage_status = 'CAN_CHO_SO'
               )
               AND ocs1.has_ban_hanh = 0
               AND od1.status = 1

             UNION

             -- Tab 2: ChoXuLy
             SELECT od2.document_id
             FROM outgoing_documents od2 WITH (NOLOCK)
             INNER JOIN outgoing_current_state ocs2 WITH (NOLOCK)
               ON ocs2.document_id = od2.document_id
             LEFT JOIN outgoing_assignment oa2 WITH (NOLOCK)
               ON oa2.document_id = od2.document_id
               AND (
                 oa2.receiver      = @0
                 OR oa2.receiver      = @1
                 OR oa2.receiver_unit = @1
               )
             WHERE od2.status_code IN ('2','3','4','5','6','14')
               AND oa2.stage_status IN (
                 'HT_VBTT','CHUA_XU_LY',
                 'CHO_KY_NOI_DUNG','CHO_KY_THE_THUC','CHO_KY_BAN_HANH','CHO_KY_NHAY','CHO_KY_CHINH_THUC'
               )
                               AND oa2.document_id IS NOT NULL
                AND ocs2.has_ban_hanh = 0

               AND NOT EXISTS (
                 SELECT 1 FROM outgoing_assignment oa_c WITH (NOLOCK)
                 WHERE oa_c.document_id = od2.document_id
                   AND oa_c.receiver   = @0
                   AND oa_c.is_creator = 1
               )
               AND od2.status = 1

             UNION

             -- Tab 3: VanBanDongDau
             SELECT od3.document_id
             FROM outgoing_documents od3 WITH (NOLOCK)
             INNER JOIN outgoing_current_state ocs3 WITH (NOLOCK)
               ON ocs3.document_id = od3.document_id
             LEFT JOIN outgoing_assignment oa3 WITH (NOLOCK)
               ON oa3.document_id = od3.document_id
               AND (
                 oa3.receiver      = @0
                 OR oa3.receiver      = @1
                 OR oa3.receiver_unit = @1
               )
             WHERE od3.status_code = '100'
               AND oa3.stage_status IN ('CHUA_XU_LY','CHO_DONG_DAU')
                               AND oa3.document_id IS NOT NULL
                AND ocs3.has_ban_hanh = 0

               AND NOT EXISTS (
                 SELECT 1 FROM outgoing_assignment oa_c WITH (NOLOCK)
                 WHERE oa_c.document_id = od3.document_id
                   AND oa_c.receiver   = @0
                   AND oa_c.is_creator = 1
               )
               AND od3.status = 1
           ) combined
           INNER JOIN outgoing_documents od WITH (NOLOCK)
             ON od.document_id = combined.document_id
           OUTER APPLY (
             SELECT TOP 1 oa_upd.updated_at
             FROM outgoing_assignment oa_upd WITH (NOLOCK)
             WHERE oa_upd.document_id = combined.document_id
               AND (
                 oa_upd.receiver      = @0
                 OR oa_upd.receiver      = @1
                 OR oa_upd.receiver_unit = @1
               )
             ORDER BY oa_upd.updated_at DESC
           ) latest_oa`,
					[userId, receiverUnit],
				)
				: this.dataSource.query(
					`SELECT
             COUNT(DISTINCT CASE WHEN
               (MONTH(od.created_at) = MONTH(GETDATE()) AND YEAR(od.created_at) = YEAR(GETDATE()))
               OR (MONTH(oa.updated_at) = MONTH(GETDATE()) AND YEAR(oa.updated_at) = YEAR(GETDATE()))
             THEN od.document_id END) AS pending_cur,

             COUNT(DISTINCT CASE WHEN
               (MONTH(od.created_at) = MONTH(DATEADD(month,-1,GETDATE())) AND YEAR(od.created_at) = YEAR(DATEADD(month,-1,GETDATE())))
               OR (MONTH(oa.updated_at) = MONTH(DATEADD(month,-1,GETDATE())) AND YEAR(oa.updated_at) = YEAR(DATEADD(month,-1,GETDATE())))
             THEN od.document_id END) AS pending_prev

           FROM outgoing_documents od WITH (NOLOCK)
           INNER JOIN outgoing_current_state ocs WITH (NOLOCK)
             ON ocs.document_id = od.document_id
           LEFT JOIN outgoing_assignment oa WITH (NOLOCK)
             ON oa.document_id = od.document_id
             AND (
               oa.receiver      = @0
               OR oa.receiver      = @1
               OR oa.receiver_unit = @1
             )
           WHERE od.status_code IN ('2','3','4','5','6','14')
             AND oa.stage_status IN (
               'HT_VBTT', 'CHUA_XU_LY',
               'CHO_KY_NOI_DUNG', 'CHO_KY_THE_THUC', 'CHO_KY_BAN_HANH', 'CHO_KY_NHAY', 'CHO_KY_CHINH_THUC'
             )
                           AND oa.document_id IS NOT NULL
              AND ocs.has_ban_hanh = 0

             AND NOT EXISTS (
               SELECT 1
               FROM outgoing_assignment oa_c WITH (NOLOCK)
               WHERE oa_c.document_id = od.document_id
                 AND oa_c.receiver   = @0
                 AND oa_c.is_creator = 1
             )
             AND od.status = 1`,
					[userId, receiverUnit],
				);

			// --- CARD 3: LỊCH HỌP TUẦN NÀY ---
			// meetings → meeting_units → meeting_participants (mp.user_id = userId)
			// meeting_date: date type, meeting_state != 'DA_HUY'
			// participant_state: RECEIVED=chưa xác nhận, CONFIRMED=đã xác nhận, NOT_PARTICIPATE=từ chối
			const p3 = this.dataSource.query(
				`SELECT
          COUNT(DISTINCT CASE WHEN
            DATEPART(iso_week, m.meeting_date) = DATEPART(iso_week, GETDATE())
            AND YEAR(m.meeting_date) = YEAR(GETDATE())
          THEN m.id END) AS cur_week_total,

          COUNT(DISTINCT CASE WHEN
            DATEPART(iso_week, m.meeting_date) = DATEPART(iso_week, DATEADD(week,-1,GETDATE()))
            AND YEAR(m.meeting_date) = YEAR(DATEADD(week,-1,GETDATE()))
          THEN m.id END) AS prev_week_total,

          COUNT(DISTINCT CASE WHEN
            CAST(m.meeting_date AS DATE) = CAST(GETDATE() AS DATE)
          THEN m.id END) AS today_count,

          COUNT(DISTINCT CASE WHEN
            mp.participant_state = 'RECEIVED'
            AND DATEPART(iso_week, m.meeting_date) = DATEPART(iso_week, GETDATE())
            AND YEAR(m.meeting_date) = YEAR(GETDATE())
          THEN m.id END) AS pending_confirm,

          COUNT(DISTINCT CASE WHEN
            mp.participant_state = 'CONFIRMED'
            AND DATEPART(iso_week, m.meeting_date) = DATEPART(iso_week, GETDATE())
            AND YEAR(m.meeting_date) = YEAR(GETDATE())
          THEN m.id END) AS confirmed,

          COUNT(DISTINCT CASE WHEN
            mp.participant_state = 'NOT_PARTICIPATE'
            AND DATEPART(iso_week, m.meeting_date) = DATEPART(iso_week, GETDATE())
            AND YEAR(m.meeting_date) = YEAR(GETDATE())
          THEN m.id END) AS declined

          FROM meetings m WITH (NOLOCK)
          INNER JOIN meeting_units mu WITH (NOLOCK) ON mu.meeting_id = m.id
          INNER JOIN meeting_participants mp WITH (NOLOCK) ON mp.meeting_unit_id = mu.id
          WHERE mp.user_id = @0
            AND m.meeting_state != 'DA_HUY' AND m.status != '3'
            AND (
              (DATEPART(iso_week, m.meeting_date) = DATEPART(iso_week, GETDATE()) AND YEAR(m.meeting_date) = YEAR(GETDATE()))
              OR
              (DATEPART(iso_week, m.meeting_date) = DATEPART(iso_week, DATEADD(week,-1,GETDATE())) AND YEAR(m.meeting_date) = YEAR(DATEADD(week,-1,GETDATE())))
            )
            AND EXISTS (
              SELECT 1 FROM audit a
              WHERE a.document_id = CAST(m.id AS NVARCHAR(64))
                AND a.stage_status = 'DONG_Y_PHE_DUYET'
            )`,
				[userId],
			);

			// --- CARD 4: CÔNG VIỆC ---
			// Phạm vi mở rộng: task_users.process_id = userId (mọi type/role)
			//                   HOẶC created_by = userId / updated_by = userId
			// Loại trừ: task.status = 3 (đã xóa mềm) và process_status = '8' (hủy)
			// Giao thoa tháng: start_date hoặc end_date nằm trong tháng đang xét
			const p4 = this.dataSource.query(
				`SELECT
          -- cur_total: chưa hoàn thành/hủy, giao thoa tháng này → tính trend
          COUNT(DISTINCT CASE WHEN
            t.process_status NOT IN ('4', '8')
            AND (
              (MONTH(t.start_date) = MONTH(GETDATE()) AND YEAR(t.start_date) = YEAR(GETDATE()))
              OR (MONTH(t.end_date)   = MONTH(GETDATE()) AND YEAR(t.end_date)   = YEAR(GETDATE()))
            )
          THEN t.id END) AS cur_total,

          -- prev_total: chưa hoàn thành/hủy, giao thoa tháng trước
          COUNT(DISTINCT CASE WHEN
            t.process_status NOT IN ('4', '8')
            AND (
              (MONTH(t.start_date) = MONTH(DATEADD(month,-1,GETDATE())) AND YEAR(t.start_date) = YEAR(DATEADD(month,-1,GETDATE())))
              OR (MONTH(t.end_date)   = MONTH(DATEADD(month,-1,GETDATE())) AND YEAR(t.end_date)   = YEAR(DATEADD(month,-1,GETDATE())))
            )
          THEN t.id END) AS prev_total,

          -- completed_this_month: đã hoàn thành, giao thoa tháng này
          COUNT(DISTINCT CASE WHEN
            t.process_status = '4'
            AND (
              (MONTH(t.start_date) = MONTH(GETDATE()) AND YEAR(t.start_date) = YEAR(GETDATE()))
              OR (MONTH(t.end_date)   = MONTH(GETDATE()) AND YEAR(t.end_date)   = YEAR(GETDATE()))
            )
          THEN t.id END) AS completed_this_month,

          -- in_progress: đang thực hiện, giao thoa tháng này
          COUNT(DISTINCT CASE WHEN
            t.process_status = '2'
            AND (
              (MONTH(t.start_date) = MONTH(GETDATE()) AND YEAR(t.start_date) = YEAR(GETDATE()))
              OR (MONTH(t.end_date)   = MONTH(GETDATE()) AND YEAR(t.end_date)   = YEAR(GETDATE()))
            )
          THEN t.id END) AS in_progress,

          -- overdue: chưa hoàn thành/hủy, end_date đã qua, giao thoa tháng này
          COUNT(DISTINCT CASE WHEN
            t.process_status NOT IN ('4', '8')
            AND t.end_date < GETDATE()
            AND (
              (MONTH(t.start_date) = MONTH(GETDATE()) AND YEAR(t.start_date) = YEAR(GETDATE()))
              OR (MONTH(t.end_date)   = MONTH(GETDATE()) AND YEAR(t.end_date)   = YEAR(GETDATE()))
            )
          THEN t.id END) AS overdue,

          -- pending_approval: chờ phê duyệt, giao thoa tháng này
          COUNT(DISTINCT CASE WHEN
            t.process_status NOT IN ('4', '8', '2')
            AND (
              (MONTH(t.start_date) = MONTH(GETDATE()) AND YEAR(t.start_date) = YEAR(GETDATE()))
              OR (MONTH(t.end_date)   = MONTH(GETDATE()) AND YEAR(t.end_date)   = YEAR(GETDATE()))
            )
          THEN t.id END) AS pending_approval

        FROM task t WITH (NOLOCK)
        WHERE t.status != 3
          AND t.process_status != '8'
          AND (
            EXISTS (
              SELECT 1 FROM task_users tu WITH (NOLOCK)
              WHERE tu.task_id = t.id
                AND tu.process_id = @0
            )
            OR t.created_by = @0
            OR t.updated_by = @0
          )`,
				[userId],
			);

			const [res1Overdue, res1Pending, res1InProgress, res2Overdue, res2Draft, res2Pending, res3, res4] =
				await Promise.all([p1Overdue, p1Pending, p1InProgress, p2Overdue, p2Draft, p2PendingQuery, p3, p4]);

			// ── Build Card 1 ──
			const ovRow1 = res1Overdue[0] ?? {};
			const pendingRow1 = res1Pending[0] ?? {};
			const inProgRow1 = res1InProgress[0] ?? {};

			const incOverdue = Number(ovRow1.overdue_cur || 0);
			const incPending = Number(pendingRow1.pending_cur || 0);
			const incInProgress = Number(inProgRow1.in_progress_cur || 0);

			// cur_total = pending + in_progress (không query riêng, tránh drift)
			const incCurTotal = incPending + incInProgress;
			const incPrevTotal =
				Number(pendingRow1.pending_prev || 0) +
				Number(inProgRow1.in_progress_prev || 0);

			const card1: Record<string, any> = {
				id: 'incoming-documents',
				label: 'Văn bản đến',
				icon: 'inbox',
				color: '#BCDDFE',
				colorValue: '#2364B0',
				value: incCurTotal,
				trend: this.calcTrend(incCurTotal, incPrevTotal),
				details: [
					{ label: 'Chờ xử lý', value: incPending, color: 'orange' },
					{ label: 'Chờ hoàn thành', value: incInProgress, color: 'blue' },
					{ label: 'Quá hạn', value: incOverdue, color: 'red' },
				],
			};

			if (incOverdue >= 1) {
				card1.insight = {
					type: 'danger',
					text: `${incOverdue} văn bản quá hạn cần xử lý gấp!`,
				};
			}

			// ── Build Card 2 ──
			const ovRow = res2Overdue[0] ?? {};
			const draftRow = res2Draft[0] ?? {};
			const pendingRow = res2Pending[0] ?? {};

			const outOverdue = Number(ovRow.overdue_cur || 0);
			const outDraft = Number(draftRow.draft_cur || 0);
			const outPendingApproval = Number(pendingRow.pending_cur || 0);

			// cur/prev = draft + pending (SRS 2.2: tổng VBĐ chưa kết thúc quy trình)
			const outCurTotal = outDraft + outPendingApproval;
			const outPrevTotal = Number(draftRow.draft_prev || 0) + Number(pendingRow.pending_prev || 0);

			const card2: Record<string, any> = {
				id: 'outgoing-documents',
				label: 'Văn bản đi',
				icon: 'send',
				color: '#DCBCFE',
				colorValue: '#BF82FF',
				value: outCurTotal,
				trend: this.calcTrend(outCurTotal, outPrevTotal),
				details: [
					{ label: 'Dự thảo', value: outDraft, color: 'gray' },
					{ label: 'Chờ duyệt', value: outPendingApproval, color: 'orange' },
					{ label: 'Quá hạn', value: outOverdue, color: 'red' },
				],
			};
			// Chỉ render alert khi có văn bản chờ phê duyệt (SRS 2.2)
			if (outPendingApproval >= 1) {
				card2.insight = {
					type: 'warning',
					text: `${outPendingApproval} văn bản đang chờ lãnh đạo phê duyệt`,
				};
			}
			// ── Build Card 3 ──
			const c3 = res3[0] ?? {};
			const weekTotal = Number(c3.cur_week_total || 0);
			const prevWeekTotal = Number(c3.prev_week_total || 0);
			const todayCount = Number(c3.today_count || 0);
			const pendingConfirm = Number(c3.pending_confirm || 0);
			const confirmedCount = Number(c3.confirmed || 0);
			const declinedCount = Number(c3.declined || 0);

			const card3: Record<string, any> = {
				id: 'weekly-meetings',
				label: 'Lịch họp tuần này',
				icon: 'calendar',
				color: '#FEBCD6',
				colorValue: '#FF75AB',
				value: weekTotal,
				trend: this.calcTrend(weekTotal, prevWeekTotal),
				details: [
					{ label: 'Hôm nay', value: todayCount, color: 'blue' },
					{ label: 'Đã xác nhận', value: confirmedCount, color: 'green' },
					{ label: 'Từ chối', value: declinedCount, color: 'red' },
				],
			};
			// Chỉ render info box khi có ít nhất 1 cuộc họp hôm nay hoặc 1 cuộc chưa xác nhận (SRS 2.3)
			if (todayCount >= 1 || pendingConfirm >= 1) {
				const confirmText = pendingConfirm > 0 ? `, ${pendingConfirm} cuộc cần xác nhận` : '';
				card3.insight = {
					type: 'info',
					text: `${todayCount} cuộc họp hôm nay${confirmText}`,
				};
			}

			// ── Build Card 4 ──
			const c4 = res4[0] ?? {};
			// cur_total    = giao thoa tháng này  → tính trend
			// prev_total   = giao thoa tháng trước → tính trend
			const taskCurMonth = Number(c4.cur_total || 0);
			const taskPrevMonth = Number(c4.prev_total || 0);
			const taskCompletedThisMonth = Number(c4.completed_this_month || 0);
			const taskInProgress = Number(c4.in_progress || 0);
			const taskOverdue = Number(c4.overdue || 0);
			const taskPendingApproval = Number(c4.pending_approval || 0);

			const card4: Record<string, any> = {
				id: 'tasks-overview',
				label: 'Công việc',
				icon: 'task',
				color: '#FEBCBD',
				colorValue: '#FF7779',
				value: taskCurMonth,
				trend: this.calcTrend(taskCurMonth, taskPrevMonth),
				details: [
					{ label: 'Đang thực hiện', value: taskInProgress, color: 'blue' },
					{ label: 'Quá hạn', value: taskOverdue, color: 'red' },
					{ label: 'Chờ phê duyệt', value: taskPendingApproval, color: 'orange' },
				],
			};
			// Chỉ render info box khi đã có ít nhất 1 công việc hoàn thành (SRS 2.4)
			if (taskCompletedThisMonth >= 1) {
				card4.insight = {
					type: 'success',
					text: `Đã hoàn thành ${taskCompletedThisMonth} CV tháng này`,
				};
			}

			return [card1, card2, card3, card4];
		} catch (error) {
			this.logger.error('Lỗi khi lấy Stats Normal Dashboard: ' + error.message, error.stack);
			return [];
		}
	}

	// ─── 2. TỔNG QUAN CÔNG VIỆC ────────────────────────────────────────────────
	//
	// Trả về: performance (progress bar) + sourceChart + roleChart
	// Shape khớp 100% với dataDashboardTaskOverview (dashboard-normal.ts)
	//
	// @param userId  ID nhân viên hiện tại
	// ─────────────────────────────────────────────────────────────────────────────
	async getNormalTaskOverview(userId: string) {
		return this.getCachedData(
			`dash:normal:taskOverview:${userId}`,
			() => this.getNormalTaskOverviewFromDb(userId),
			'refresh-normal-task-overview',
			{ userId },
		);
	}

	async getNormalTaskOverviewFromDb(userId: string) {
		try {
			// Query 1: Tỷ lệ hoàn thành đúng hạn tháng này (SRS 3.1)
			// total        = COUNT tất cả task tháng này (mọi trạng thái) của user
			// done_on_time = COUNT task process_status='4' AND update_at <= end_date, tháng này
			// Phạm vi user đồng nhất với p4: task_users (mọi type/role) OR created_by OR updated_by
			// Window tháng: giao thoa start_date hoặc end_date trong tháng hiện tại
			const qPerf = this.dataSource.query(
				`SELECT
          COUNT(DISTINCT t.id) AS total,
          COUNT(DISTINCT CASE WHEN
            t.process_status = '4'
            AND t.update_at <= t.end_date
          THEN t.id END)       AS done_on_time
         FROM task t WITH (NOLOCK)
         WHERE t.status != 3 AND t.process_status != '8'
           AND (
             EXISTS (
               SELECT 1 FROM task_users tu WITH (NOLOCK)
               WHERE tu.task_id = t.id AND tu.process_id = @0
             )
             OR t.created_by = @0
             OR t.updated_by = @0
           )
           AND (
             (MONTH(t.start_date) = MONTH(GETDATE()) AND YEAR(t.start_date) = YEAR(GETDATE()))
             OR (MONTH(t.end_date)   = MONTH(GETDATE()) AND YEAR(t.end_date)   = YEAR(GETDATE()))
           )`,
				[userId],
			);

			// Query 2: Phân bổ theo nguồn (SRS 3.2)
			// Nguồn xác định theo cột thực tế của bảng task:
			//   Văn bản  : doc_id IS NOT NULL AND doc_id != ''
			//              (task phát sinh từ incomming_documents, tương đương type_task='FORM_DOC')
			//   Cuộc họp : meeting_id IS NOT NULL AND meeting_id != ''
			//              (task phát sinh từ meetings)
			//   Chung    : cả doc_id và meeting_id đều NULL / rỗng
			//
			// Phạm vi user: đồng nhất với p4 (task_users mọi role OR created_by OR updated_by)
			// unitId lấy từ users.parent của userId → dùng cho clerk permission (đồng nhất findAllFormDoc)
			// Window tháng: giao thoa start_date hoặc end_date trong tháng hiện tại
			const qSource = this.dataSource.query(
				`SELECT
          COUNT(DISTINCT CASE WHEN
            t.doc_id IS NOT NULL AND t.doc_id != ''
          THEN t.id END)                                    AS doc_count,
 
          COUNT(DISTINCT CASE WHEN
            (t.doc_id IS NULL OR t.doc_id = '')
            AND t.meeting_id IS NOT NULL AND t.meeting_id != ''
          THEN t.id END)                                    AS meeting_count,
 
          COUNT(DISTINCT CASE WHEN
            (t.doc_id IS NULL OR t.doc_id = '')
            AND (t.meeting_id IS NULL OR t.meeting_id = '')
          THEN t.id END)                                    AS general_count,
 
          COUNT(DISTINCT t.id)                              AS grand_total
 
         FROM task t WITH (NOLOCK)
         WHERE t.status != 3
           AND t.process_status != '8'
           AND (
             EXISTS (
               SELECT 1 FROM task_users tu WITH (NOLOCK)
               WHERE tu.task_id = t.id
                 AND (
                   tu.process_id = @0
                   OR (
                     tu.process_id = (
                       SELECT TOP 1 u.parent
                       FROM users u WITH (NOLOCK)
                       WHERE u.id = @0
                     )
                     AND tu.type = 2
                     AND EXISTS (
                       SELECT 1 FROM user_group_users ugu WITH (NOLOCK)
                       INNER JOIN group_users gu WITH (NOLOCK) ON gu.id = ugu.group_user_id
                       WHERE ugu.user_id = @0
                         AND gu.code = 'VAN_THU'
                         AND gu.status = 1
                     )
                   )
                 )
             )
             OR t.created_by = @0
             OR t.updated_by = @0
           )
           AND (
             (MONTH(t.start_date) = MONTH(GETDATE()) AND YEAR(t.start_date) = YEAR(GETDATE()))
             OR (MONTH(t.end_date)   = MONTH(GETDATE()) AND YEAR(t.end_date)   = YEAR(GETDATE()))
           )`,
				[userId],
			);

			// Query 3: Phân bổ theo vai trò (SRS 3.3)
			// Chủ trì     : task_users.role = 'director'
			// Phối hợp    : task_users.role IN ('assigner', 'supporter')
			// Xem để biết : task_users.role = 'viewer'
			// grand_total : COUNT DISTINCT task.id (không phải row task_users)
			// Window tháng: giao thoa start_date hoặc end_date trong tháng hiện tại
			const qRole = this.dataSource.query(
				`SELECT
          COUNT(DISTINCT CASE WHEN tu.role = 'director'
          THEN t.id END)                                          AS chu_tri,

          COUNT(DISTINCT CASE WHEN tu.role IN ('supporter')
          THEN t.id END)                                          AS phoi_hop,

          COUNT(DISTINCT CASE WHEN tu.role = 'viewer'
          THEN t.id END)                                          AS xem_de_biet,

          COUNT(DISTINCT t.id)                                    AS grand_total

         FROM task t WITH (NOLOCK)
         JOIN task_users tu WITH (NOLOCK) ON tu.task_id = t.id
         WHERE tu.process_id = @0
           AND t.status != 3
           AND t.process_status != '8'
           AND (
             (MONTH(t.start_date) = MONTH(GETDATE()) AND YEAR(t.start_date) = YEAR(GETDATE()))
             OR (MONTH(t.end_date)   = MONTH(GETDATE()) AND YEAR(t.end_date)   = YEAR(GETDATE()))
           )`,
				[userId],
			);

			const [perfRes, sourceRes, roleRes] = await Promise.all([qPerf, qSource, qRole]);

			// ── Performance ──
			const perf = perfRes[0] ?? {};
			const total = Number(perf.total || 0);
			const doneOnTime = Number(perf.done_on_time || 0);
			const actualPct = total > 0 ? Math.round((doneOnTime / total) * 100) : 0;
			const delta = this.TARGET_COMPLETION_RATE - actualPct;
			// Xanh ngọc khi đạt/vượt mục tiêu, cam khi chưa đạt (SRS 3.1)
			const barColor = actualPct >= this.TARGET_COMPLETION_RATE ? '#2364B0 ' : '#E67E22';

			// ── Source chart ──
			const src = sourceRes[0] ?? {};
			const srcGrand = Number(src.grand_total || 0);
			const docCount = Number(src.doc_count || 0);
			const meetCount = Number(src.meeting_count || 0);
			const genCount = Number(src.general_count || 0);
			const docPct = srcGrand > 0 ? Math.round((docCount / srcGrand) * 100) : 0;
			const meetPct = srcGrand > 0 ? Math.round((meetCount / srcGrand) * 100) : 0;
			const genPct = srcGrand > 0 ? Math.round((genCount / srcGrand) * 100) : 0;

			// Badge: hiển thị segment chiếm tỷ lệ cao nhất (SRS 3.2)
			const srcBadgeEntries: [string, number][] = [
				['Văn bản chiếm', docPct],
				['Cuộc họp chiếm', meetPct],
				['Chung chiếm', genPct],
			];
			const topSource = srcBadgeEntries.reduce((a, b) => (b[1] >= a[1] ? b : a));

			// ── Role chart ──
			const role = roleRes[0] ?? {};
			const roleGrand = Number(role.grand_total || 0);
			const chuTriCount = Number(role.chu_tri || 0);
			const phoiHopCount = Number(role.phoi_hop || 0);
			const xemDeCount = Number(role.xem_de_biet || 0);
			const chuTriPct = roleGrand > 0 ? Math.round((chuTriCount / roleGrand) * 100) : 0;
			const phoiHopPct = roleGrand > 0 ? Math.round((phoiHopCount / roleGrand) * 100) : 0;
			const xemDePct = roleGrand > 0 ? Math.round((xemDeCount / roleGrand) * 100) : 0;

			// Badge: hiển thị vai trò chiếm tỷ lệ cao nhất (SRS 3.3)
			const roleBadgeEntries: [string, number, number][] = [
				['Chủ trì', chuTriPct, chuTriCount],
				['Phối hợp', phoiHopPct, phoiHopCount],
				['Xem để biết', xemDePct, xemDeCount],
			];
			const topRole = roleBadgeEntries.reduce((a, b) => (b[1] >= a[1] ? b : a));

			return {
				performance: {
					title: 'Tỷ lệ hoàn thành tháng này',
					value: `${actualPct}%`,
					percent: actualPct,
					// Màu thanh: xanh ngọc ≥ target, cam < target; nền xám nhạt (SRS 3.1)
					barColor,
					bgColor: '#E0E0E0',
					leftLabel: `Mục tiêu: ${this.TARGET_COMPLETION_RATE}%`,
					// Ẩn "Còn thiếu" khi đạt hoặc vượt mục tiêu (SRS 3.1)
					rightLabel: delta > 0 ? `Còn thiếu: ${delta}%` : '',
				},
				sourceChart: {
					title: 'Phân bố theo nguồn',
					badge: {
						// Segment chiếm tỷ lệ cao nhất — tính động (SRS 3.2)
						text: `${topSource[0]} ${topSource[1]}%`,
						type: 'warning',
					},
					chartData: {
						labels: ['Văn bản', 'Cuộc họp', 'Chung'],
						values: [docPct, meetPct, genPct],
						colors: ['#2364B0', '#FFB74D', '#3ABF94'],
					},
				},
				roleChart: {
					title: 'Phân bố theo vai trò',
					badge: {
						// Segment chiếm tỷ lệ cao nhất — tính động (SRS 3.3)
						text: `${topRole[0]} ${topRole[1]}%`,
						type: 'success',
					},
					chartData: {
						labels: ['Chủ trì', 'Phối hợp', 'Xem để biết'],
						values: [chuTriPct, phoiHopPct, xemDePct],
						// counts dùng cho tooltip: "{Tên vai trò}: {n} việc ({%})" (SRS 3.3)
						counts: [chuTriCount, phoiHopCount, xemDeCount],
						colors: ['#8464BF', '#17A2B8', '#585E65'],
					},
				},
			};
		} catch (error) {
			this.logger.error('Lỗi khi lấy Task Overview Normal Dashboard: ' + error.message, error.stack);
			return {
				performance: {
					title: 'Tỷ lệ hoàn thành đúng hạn tháng này',
					value: '0%',
					percent: 0,
					barColor: '#E67E22',
					bgColor: '#E0E0E0',
					leftLabel: `Mục tiêu: ${this.TARGET_COMPLETION_RATE}%`,
					rightLabel: `Còn thiếu: ${this.TARGET_COMPLETION_RATE}%`,
				},
				sourceChart: {
					title: 'Phân bố theo nguồn',
					badge: { text: '', type: '' },
					chartData: { labels: [], values: [], colors: [] },
				},
				roleChart: {
					title: 'Phân bố theo vai trò',
					badge: { text: '', type: '' },
					chartData: { labels: [], values: [], colors: [] },
				},
			};
		}
	}

	// ─── 3. DỰ ÁN ĐANG THAM GIA ────────────────────────────────────────────────
	//
	// Trả về: summary (4 chỉ số) + list (danh sách dự án)
	// Shape khớp 100% với dataDashboardNormalProjects (dashboard-normal.ts)
	//
	// @param userId  ID nhân viên hiện tại
	// ─────────────────────────────────────────────────────────────────────────────
	async getNormalProjects(userId: string) {
		return this.getCachedData(
			`dash:normal:projects:${userId}`,
			() => this.getNormalProjectsFromDb(userId),
			'refresh-normal-projects',
			{ userId },
		);
	}

	async getNormalProjectsFromDb(userId: string) {
		try {
			const now = new Date();

			// Query 1: 4 chỉ số tóm tắt (SRS 4.1)
			// Dự án      : project_members.user_id = userId, status != CLOSED
			// Chậm tiến  : tính động theo công thức 4.3 → xử lý ở JS sau khi lấy list
			//              (subquery SQL chỉ đếm dự án có end_date đã qua và chưa COMPLETED làm fallback)
			// Việc cần làm: task chưa hoàn thành, phạm vi p4 (task_users OR created_by OR updated_by)
			// Deadline tuần này: end_date trong [TODAY, TODAY+7], phạm vi p4
			const qSummary = this.dataSource.query(
				`SELECT
          -- Tổng dự án đang tham gia (status != CLOSED = projectStatus != '4')
          (SELECT COUNT(DISTINCT p.id)
           FROM projects p WITH (NOLOCK)
           LEFT JOIN project_members pm WITH (NOLOCK) ON pm.project_id = p.id
           WHERE (pm.user_id = @0)
             AND p.status = 1
             AND p.projectStatus != '4')                                      AS total_projects,

          -- Việc cần làm: task chưa hoàn thành, có project_id, phạm vi p4
          (SELECT COUNT(DISTINCT t.id)
           FROM task t WITH (NOLOCK)
           WHERE t.status != 3
             AND t.process_status NOT IN ('4', '8')
             AND t.project_id IS NOT NULL
             AND EXISTS (
               SELECT 1
               FROM projects p WITH (NOLOCK)
               WHERE p.id = t.project_id
                 AND p.status = 1
                 AND p.projectStatus != '4'
             )
             AND (
               EXISTS (
                 SELECT 1 FROM task_users tu WITH (NOLOCK)
                 WHERE tu.task_id = t.id AND tu.process_id = @0
               )
               OR t.created_by = @0
               OR t.updated_by = @0
             ))                                                                AS todo_tasks,

          -- Deadline tuần này: end_date trong [TODAY, TODAY+7], phạm vi p4
          (SELECT COUNT(DISTINCT t.id)
           FROM task t WITH (NOLOCK)
           WHERE t.status != 3
             AND t.process_status NOT IN ('4', '8')
             AND t.project_id IS NOT NULL
             AND EXISTS (
               SELECT 1
               FROM projects p WITH (NOLOCK)
               WHERE p.id = t.project_id
                 AND p.status = 1
                 AND p.projectStatus != '4'
             )
             AND CAST(t.end_date AS DATE)
               BETWEEN CAST(GETDATE() AS DATE)
               AND CAST(DATEADD(day, 7, GETDATE()) AS DATE)
             AND (
               EXISTS (
                 SELECT 1 FROM task_users tu WITH (NOLOCK)
                 WHERE tu.task_id = t.id AND tu.process_id = @0
               )
               OR t.created_by = @0
               OR t.updated_by = @0
             ))                                                                AS deadline_this_week`,
				[userId],
			);

			// Query 2: Danh sách dự án + tiến độ tính từ tasks (SRS 4.2 + 4.3)
			// progress = COUNT(tasks COMPLETED) / COUNT(all tasks) × 100 (SRS 4.3)
			// pending_tasks: phạm vi p4 (task_users OR created_by OR updated_by)
			// role lấy từ project_members.role của userId (ưu tiên), fallback owner
			const qList = this.dataSource.query(
				`SELECT TOP 10
          p.id,
          p.name,
          p.startDate                                                          AS startDate,
          p.endDate                                                            AS endDate,
          p.projectStatus,

          -- Vai trò: lấy từ project_members.role
          pm.role                                                               AS user_role,

          -- Tiến độ tính từ tasks thuộc dự án (SRS 4.3)
          (SELECT
             CASE
               WHEN COUNT(t_sub.id) = 0 THEN 0
               ELSE CAST(COUNT(CASE WHEN t_sub.process_status = '4' THEN 1 END) * 100.0 / COUNT(t_sub.id) AS INT)
             END
           FROM task t_sub WITH (NOLOCK)
           WHERE t_sub.project_id = p.id AND t_sub.status != 3
          )                                                                     AS completion_rate,

          -- Số việc chưa hoàn thành của user trong dự án này (phạm vi p4)
          (SELECT COUNT(DISTINCT t2.id)
           FROM task t2 WITH (NOLOCK)
           WHERE t2.project_id = p.id
             AND t2.status != 3
             AND t2.process_status NOT IN ('4', '8')
             AND (
               EXISTS (
                 SELECT 1 FROM task_users tu2 WITH (NOLOCK)
                 WHERE tu2.task_id = t2.id AND tu2.process_id = @0
               )
               OR t2.created_by = @0
               OR t2.updated_by = @0
             ))                                                                 AS pending_tasks

         FROM projects p WITH (NOLOCK)
         INNER JOIN project_members pm WITH (NOLOCK)
           ON pm.project_id = p.id AND pm.user_id = @0
         WHERE p.status = 1
           AND p.projectStatus != '4'
         ORDER BY p.endDate ASC`,
				[userId],
			);

			const [summaryRes, listRes] = await Promise.all([qSummary, qList]);

			const s = summaryRes[0] ?? {};

			// ── Role map (SRS 4.2) ──
			const roleMap: Record<string, string> = {
				owner: 'Chủ trì',
				manager: 'Chủ trì',
				member: 'Phối hợp',
				coordinator: 'Phối hợp',
				observer: 'Xem để biết',
				viewer: 'Xem để biết',
			};

			// ── Đếm chậm tiến độ từ list (tính động theo SRS 4.3) ──
			let delayedCount = 0;

			const list = listRes.map((row: any) => {
				const endDate = row.endDate ? new Date(row.endDate) : null;
				const startDate = row.startDate ? new Date(row.startDate) : null;
				const completionRate = Number(row.completion_rate || 0);
				const pendingTaskCount = Number(row.pending_tasks || 0);

				// ── Tính planned_rate (SRS 4.3) ──
				// planned_rate = (NOW - start_date) / (end_date - start_date) × 100
				let plannedRate = 0;
				if (startDate && endDate) {
					const totalMs = endDate.getTime() - startDate.getTime();
					const passedMs = now.getTime() - startDate.getTime();
					if (totalMs > 0) {
						plannedRate = Math.min((passedMs / totalMs) * 100, 100);
					}
				}

				// ── Xác định trạng thái (SRS 4.3) ──
				// Ưu tiên: Quá hạn → Chậm tiến độ → Cần chú ý → Đúng tiến độ
				let statusText = 'Đúng tiến độ';
				let statusColor = 'green';

				if (endDate && endDate < now && row.projectStatus !== '2') {
					statusText = 'Quá hạn';
					statusColor = 'danger';
				} else if (completionRate < plannedRate - 10) {
					statusText = 'Chậm tiến độ';
					statusColor = 'warning';
					delayedCount++;
				} else if (completionRate < plannedRate && plannedRate - completionRate <= 10) {
					statusText = 'Cần chú ý';
					statusColor = 'yellow';
				}

				// ── Deadline display (SRS 4.2) ──
				let deadlineDisplay = '';
				if (endDate) {
					if (endDate < now) {
						deadlineDisplay = 'Quá hạn';
					} else {
						const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / 86_400_000);
						deadlineDisplay = daysLeft <= 30
							? `Còn ${daysLeft} ngày`
							: this.formatDate(endDate);
					}
				}

				return {
					id: row.id,
					key: 'VIEW_PROJECT',
					recordId: row.id,
					name: row.name || 'Chưa đặt tên',
					role: roleMap[row.user_role?.toLowerCase()] ?? 'Phối hợp',
					tasks: `${pendingTaskCount} việc`,
					deadline: deadlineDisplay,
					statusText,
					statusColor,
					progress: completionRate,
				};
			});

			return {
				summary: [
					{ value: Number(s.total_projects || 0), label: 'Dự án', color: '#0F172A', textColor: '#94A3B8' },
					{ value: delayedCount, label: 'Chậm tiến độ', color: '#2364B0', textColor: '#94A3B8' },
					{ value: Number(s.todo_tasks || 0), label: 'Việc cần làm', color: '#EF5350', textColor: '#94A3B8' },
					{ value: Number(s.deadline_this_week || 0), label: 'Deadline tuần này', color: '#896BC6', textColor: '#94A3B8' },
				],
				list,
			};
		} catch (error) {
			this.logger.error('Lỗi khi lấy Projects Normal Dashboard: ' + error.message, error.stack);
			return {
				summary: [
					{ value: 0, label: 'Dự án', color: 'blue' },
					{ value: 0, label: 'Chậm tiến độ', color: 'red' },
					{ value: 0, label: 'Việc cần làm', color: 'blue' },
					{ value: 0, label: 'Deadline tuần này', color: 'green' },
				],
				list: [],
			};
		}
	}
	// ─── 4. QUICK ACTIONS ──────────────────────────────────────────────────────
	//
	// Trả về danh sách tiện ích nhanh kèm số badge pending (nếu có)
	// Shape khớp 100% với dataDashboardNormalQuickActions (dashboard-normal.ts)
	//
	// @param userId  ID nhân viên hiện tại
	// ─────────────────────────────────────────────────────────────────────────────
	async getNormalQuickActions(userId: string) {
		return this.getCachedData(
			`dash:normal:quickActions:${userId}`,
			() => this.getNormalQuickActionsFromDb(userId),
			'refresh-normal-quick-actions',
			{ userId },
		);
	}

	async getNormalQuickActionsFromDb(userId: string) {
		try {
			// vehicle_registrations: created_by = userId, vehicle_state = 'CHO_DIEU_PHOI'
			const qCar = this.dataSource.query(
				`SELECT COUNT(1) AS total FROM vehicle_registrations WITH (NOLOCK)
        WHERE created_by = @0 AND vehicle_state = 'CHO_DIEU_PHOI'`,
				[userId],
			);

			// passports: created_by = userId, is_deleted = 0
			// Badge = số hộ chiếu đang được quản lý (không có trạng thái PENDING, đếm tổng active)
			const qPassport = this.dataSource.query(
				`SELECT COUNT(1) AS total FROM passports WITH (NOLOCK)
        WHERE created_by = @0 AND is_deleted = 0`,
				[userId],
			);

			// feedback_requests: employee_id = userId
			const qFeedback = this.dataSource.query(
				`SELECT COUNT(1) AS total FROM feedback_requests WITH (NOLOCK)
        WHERE employee_id = @0`,
				[userId],
			);

			const [carRes, passportRes, feedbackRes] = await Promise.all([qCar, qPassport, qFeedback]);

			const carPending = Number(carRes[0]?.total || 0);
			const passportPending = Number(passportRes[0]?.total || 0);
			const feedbackPending = Number(feedbackRes[0]?.total || 0);

			return ({
				quickOperation: [
					{
						id: 'task-management',
						label: 'Quản lý công việc',
						icon: 'task',
						color: '#2364B0',
						key: 'VIEW_TASK_MANAGEMENT',
						...(carPending > 0 && { badge: { value: carPending, color: '#D9534F' } }),
					},
					{
						id: 'incoming-documents',
						label: 'Văn bản đến',
						icon: 'inbox',
						color: '#2364B0',
						key: 'VIEW_INCOMING_DOCUMENTS',
						...(passportPending > 0 && { badge: { value: passportPending, color: '#D9534F' } }),
					},
					{
						id: 'outgoing-documents',
						label: 'Văn bản đi',
						icon: 'send',
						color: '#2364B0',
						key: 'VIEW_OUTGOING_DOCUMENTS',
						...(feedbackPending > 0 && { badge: { value: feedbackPending, color: '#D9534F' } }),
					},
					{
						id: 'personal-calendar',
						label: 'Lịch họp',
						icon: 'calendar',
						color: '#2364B0',
						key: 'VIEW_PERSONAL_CALENDAR',
						...(feedbackPending > 0 && { badge: { value: feedbackPending, color: '#D9534F' } }),
					},
				],
				pinnedWidgets: [
					// {
					// 	id: 'contacts',
					// 	label: 'Danh bạ',
					// 	icon: 'contacts',
					// 	color: '#2364B0',
					// 	key: 'VIEW_CONTACTS',
					// 	...(carPending > 0 && { badge: { value: carPending, color: '#D9534F' } }),
					// },
					{
						id: 'quick-car-booking',
						label: 'Đặt xe',
						icon: 'car',
						color: '#2364B0',
						key: 'VIEW_BOOK_A_CAR',
						...(carPending > 0 && { badge: { value: carPending, color: '#D9534F' } }),
					},
					{
						id: 'quick-passport',
						label: 'Hộ chiếu',
						icon: 'passport',
						color: '#2364B0',
						key: 'VIEW_PASSPORT',
						...(passportPending > 0 && { badge: { value: passportPending, color: '#D9534F' } }),
					},
					{
						id: 'quick-feedback',
						label: 'Phản ánh, kiến nghị',
						icon: 'feedback',
						color: '#2364B0',
						key: 'VIEW_FEEDBACK',
						...(feedbackPending > 0 && { badge: { value: feedbackPending, color: '#D9534F' } }),
					},
				]
			})
		} catch (error) {
			this.logger.error('Lỗi khi lấy Quick Actions Normal Dashboard: ' + error.message, error.stack);
			return [
				{ id: 'quick-car-booking', label: 'Đăng ký xe', icon: 'car', color: '#2364B0', key: 'VIEW_BOOK_A_CAR' },
				{ id: 'quick-passport', label: 'Hộ chiếu', icon: 'passport', color: '#2364B0', key: 'VIEW_PASSPORT' },
				{ id: 'quick-feedback', label: 'Phản ánh', icon: 'feedback', color: '#2364B0', key: 'VIEW_FEEDBACK' },
			];
		}
	}

	// ─── 5. LỊCH HỌP SẮP TỚI ──────────────────────────────────────────────────
	//
	// Trả về tối đa 5 cuộc họp trong 7 ngày tới mà user tham gia
	// Shape khớp 100% với dataDashboardNormalMeetings (dashboard-normal.ts)
	//
	// @param userId  ID nhân viên hiện tại
	// ─────────────────────────────────────────────────────────────────────────────
	async getNormalMeetings(userId: string) {
		return this.getCachedData(
			`dash:normal:meetings:${userId}`,
			() => this.getNormalMeetingsFromDb(userId),
			'refresh-normal-meetings',
			{ userId },
		);
	}

	async getNormalMeetingsFromDb(userId: string) {
		try {
			// meeting_date: DATE type lưu dạng '2026-03-24'
			// meeting_time: string '16:00-17:00' → parse start/end từ JS
			// Lọc: meeting_date >= TODAY AND meeting_date <= TODAY+7, meeting_state != 'DA_HUY'
			// User tham gia: meetings → meeting_units → meeting_participants (mp.user_id = userId)
			// participant_state: RECEIVED=chưa xác nhận, CONFIRMED=đã xác nhận, NOT_PARTICIPATE=từ chối
			const rawMeetings = await this.dataSource.query(
				`SELECT TOP 5
          m.id,
          m.title,
          m.meeting_date,
          m.meeting_time,
          m.meeting_mode,
          m.room_ids,
          m.online_meeting_id,
          mp.participant_state
         FROM meetings m WITH (NOLOCK)
         INNER JOIN meeting_units mu WITH (NOLOCK) ON mu.meeting_id = m.id
         INNER JOIN meeting_participants mp WITH (NOLOCK) ON mp.meeting_unit_id = mu.id
         WHERE (mp.user_id = @0 OR mp.delegated_to_user_id = @0)
           AND m.status = '1'
           AND (m.is_template = 0 OR m.is_template IS NULL)
           AND EXISTS (
              SELECT 1 FROM audit a WITH (NOLOCK)
              WHERE a.type_document = 'MEETING'
                AND a.document_id = TRY_CONVERT(NVARCHAR(64), m.id)
                AND a.stage_status IN ('DONG_Y_PHE_DUYET', 'BI_HUY')
            )
           AND CAST(m.meeting_date AS DATE) >= CAST(GETDATE() AS DATE)
           AND CAST(m.meeting_date AS DATE) <= CAST(DATEADD(day, 7, GETDATE()) AS DATE)
         ORDER BY m.meeting_date ASC, m.meeting_time ASC`,
				[userId],
			);

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
						rawMeetings.map((row: any) => String(row.id)),
						userId,
					);
			} catch (error) {
				this.logger.warn(
					'Khong tinh duoc availableActions cho dashboard normal meetings: ' +
					error.message,
				);
			}

			const now = new Date();
			const todayStr = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'

			return rawMeetings.map((row: any) => {
				// ── Parse meeting_time: '16:00-17:00' → startStr='16:00', endStr='17:00' ──
				const timeParts = String(row.meeting_time || '').split('-');
				const startStr = timeParts[0]?.trim() || '00:00'; // '16:00'
				const endStr = timeParts[1]?.trim() || '';      // '17:00'

				// ── Tính urgent: họp hôm nay + bắt đầu trong vòng 30 phút ──
				const meetingDateStr = row.meeting_date
					? new Date(row.meeting_date).toISOString().slice(0, 10)
					: '';
				const isToday = meetingDateStr === todayStr;

				let minutesLeft: number | null = null;
				if (isToday && startStr) {
					const [h, m] = startStr.split(':').map(Number);
					const startMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m).getTime();
					minutesLeft = Math.floor((startMs - now.getTime()) / 60_000);
				}

				const isUrgent = isToday && minutesLeft !== null && minutesLeft >= 0 && minutesLeft <= 30;

				// ── Phân loại type + timeColor ──
				let meetingType: 'urgent' | 'confirmed' | 'pending' = 'pending';
				let timeColor = '#DDE0E4';
				let badge: string | undefined;

				if (isUrgent) {
					meetingType = 'urgent';
					timeColor = 'blue';
					badge = minutesLeft === 0 ? 'Đang diễn ra' : `Còn ${minutesLeft} phút`;
				} else if (row.participant_state === 'CONFIRMED') {
					meetingType = 'confirmed';
					timeColor = '#2364B0';
				}

				// ── Meta: ngày (nếu không phải hôm nay) → platform/phòng → thời lượng ──
				const meta: Array<{ icon: string; text: string }> = [];

				if (!isToday && meetingDateStr) {
					const d = new Date(row.meeting_date);
					meta.push({ icon: 'calendar', text: this.formatDate(d) });
				}

				// Online: meeting_mode = 'ONLINE' hoặc có online_meeting_id
				const isOnline = row.meeting_mode === 'ONLINE' || !!row.online_meeting_id;
				if (isOnline) {
					meta.push({ icon: 'video', text: 'Teams' });
				} else if (row.room_ids) {
					meta.push({ icon: 'location', text: row.room_ids });
				}

				// Duration từ startStr và endStr
				if (startStr && endStr) {
					const [sh, sm] = startStr.split(':').map(Number);
					const [eh, em] = endStr.split(':').map(Number);
					const durationMin = (eh * 60 + em) - (sh * 60 + sm);
					if (durationMin > 0) {
						meta.push({ icon: 'clock', text: this.formatDuration(durationMin) });
					}
				}

				const result: Record<string, any> = {
					id: row.id,
					key: 'VIEW_MEETING_ROOM',
					recordId: row.id,
					type: meetingType,
					time: startStr,
					timeColor,
					title: row.title || 'Chưa có tiêu đề',
					meta,
					availableActions:
						actionsByMeetingId.get(String(row.id))?.availableActions || [],
					flags: actionsByMeetingId.get(String(row.id))?.flags || {},
					workItem: actionsByMeetingId.get(String(row.id))?.workItem || null,
					openWorkItem: actionsByMeetingId.get(String(row.id))?.openWorkItem || null,
				};
				if (badge) result.badge = badge;

				return result;
			});
		} catch (error) {
			this.logger.error('Lỗi khi lấy Meetings Normal Dashboard: ' + error.message, error.stack);
			return [];
		}
	}

	// ─── 6. SỰ KIỆN SẮP DIỄN RA ────────────────────────────────────────────────
	//
	// Sự kiện toàn công ty (không filter theo userId), 30 ngày tới, tối đa 10 mục
	// Bảng: news_calendar, startTime/endTime là datetime2
	// Shape khớp 100% với dataDashboardNormalEvents (dashboard-normal.ts)
	// ─────────────────────────────────────────────────────────────────────────────
	async getNormalEvents() {
		return this.getCachedData(
			'dash:normal:events',
			() => this.getNormalEventsFromDb(),
			'refresh-normal-events',
		);
	}

	async getNormalEventsFromDb() {
		try {
			const rawEvents = await this.dataSource.query(`
        SELECT TOP 10
          nc.id,
          nc.title,
          nc.startTime,
          nc.endTime,
          nc.location
        FROM news_calendar nc WITH (NOLOCK)
        WHERE nc.status = 1
          AND nc.startTime >= GETDATE()
          AND nc.startTime <= DATEADD(day, 30, GETDATE())
        ORDER BY nc.startTime ASC
      `);

			// const colorPalette = ['green', 'purple', 'orange', 'blue', 'red'];

			return rawEvents.map((row: any, index: number) => {
				const startTime = row.startTime ? new Date(row.startTime) : null;
				const endTime = row.endTime ? new Date(row.endTime) : null;

				const dayStr = startTime ? String(startTime.getDate()).padStart(2, '0') : '--';
				const monthStr = startTime ? `Tháng ${startTime.getMonth() + 1}` : '--';

				// Format: "HH:mm - HH:mm • Địa điểm" (SRS 7)
				let description = '';
				if (startTime && endTime) {
					description = `${this.formatTime(startTime)} - ${this.formatTime(endTime)}`;
				} else if (startTime) {
					description = this.formatTime(startTime);
				}
				if (row.location) {
					description += description ? ` • ${row.location}` : row.location;
				}

				return {
					id: row.id,
					key: 'VIEW_EVENT',
					recordId: row.id,
					day: dayStr,
					month: monthStr,
					title: row.title || 'Sự kiện nội bộ',
					description,
					// color: colorPalette[index % colorPalette.length],
					color: "#2364B0"
				};
			});
		} catch (error) {
			this.logger.error('Lỗi khi lấy Events Normal Dashboard: ' + error.message, error.stack);
			return [];
		}
	}

	// ─── 7. TIN TỨC NỘI BỘ ─────────────────────────────────────────────────────
	//
	// Tin tức toàn công ty, mới nhất lên đầu, tối đa 10 mục
	// like_count   → COUNT từ news_like WHERE isLike = 1
	// comment_count → COUNT từ news_comment
	// viewCount    → có sẵn trên news
	// Shape khớp 100% với dataDashboardNormalNews (dashboard-normal.ts)
	// ─────────────────────────────────────────────────────────────────────────────
	async getNormalNews() {
		return this.getCachedData(
			'dash:normal:news',
			() => this.getNormalNewsFromDb(),
			'refresh-normal-news',
		);
	}

	async getNormalNewsFromDb() {
		try {
			const rawNews = await this.dataSource.query(`
        SELECT TOP 10
          n.id,
          n.title,
          n.publishedAt,
          n.viewCount,
          n.topic,
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
          (
            SELECT COUNT(1)
            FROM news_like nl WITH (NOLOCK)
            WHERE nl.objectId = n.id
              AND nl.[type] = 'NEWS'
              AND nl.isLike = 1
          ) AS like_count,
          (
            SELECT COUNT(1)
            FROM news_comment nc WITH (NOLOCK)
            WHERE nc.newsId = n.id
          ) AS comment_count
        FROM news n WITH (NOLOCK)
        WHERE n.status = 1
          AND n.publishedAt <= GETDATE()
        ORDER BY n.publishedAt DESC
      `);

			const colorPalette = ['blue', 'green', 'orange', 'purple', 'red'];

			return rawNews.map((row: any, index: number) => {
				const publishedAt = row.publishedAt ? new Date(row.publishedAt) : null;
				const likeCount = Number(row.like_count || 0);
				const commentCount = Number(row.comment_count || 0);
				const viewCount = Number(row.viewCount || 0);
				const imageUrl = row.thumbnail_id ? `/files/view/${row.thumbnail_id}` : null;

				return {
					id: row.id,
					key: 'VIEW_NEWS',
					recordId: row.id,
					emoji: this.mapNewsEmoji(row.topic),
					title: row.title || '',
					date: publishedAt ? this.formatDate(publishedAt) : '',
					views: `${viewCount.toLocaleString('en-US')} lượt xem`,
					likes: `${likeCount.toLocaleString('en-US')} lượt thích`,
					comments: `${commentCount.toLocaleString('en-US')} bình luận`,
					color: colorPalette[index % colorPalette.length],
					image: imageUrl,
					thumbnail: imageUrl,
				};
			});
		} catch (error) {
			this.logger.error('Lỗi khi lấy News Normal Dashboard: ' + error.message, error.stack);
			return [];
		}
	}

	// ─── PRIVATE HELPERS ────────────────────────────────────────────────────────

	private async getUserRoles(
		userId: string,
		processKey: string = 'PHOIHOP_NHANDEBIET',
	): Promise<string[]> {
		if (!userId) return [''];

		const rawRow = await this.dataSource.query(
			`SELECT TOP 1 roles FROM role_feature WITH (NOLOCK)
      WHERE process_key = @0`,
			[processKey],
		);

		if (!rawRow?.[0]?.roles) return [''];

		let rolesArray: any[] = [];
		try {
			rolesArray = JSON.parse(rawRow[0].roles);
		} catch {
			return [''];
		}

		if (!Array.isArray(rolesArray)) return [''];

		const roleCodes = rolesArray
			.filter((r) =>
				Array.isArray(r?.users) &&
				r.users.some((u: any) => {
					try { return String(u) === String(userId); } catch { return false; }
				}),
			)
			.map((r) => r.roleCode)
			.filter(Boolean);

		return roleCodes.length ? roleCodes : [''];
	}

	private async getUserParent(userId: string): Promise<string> {
		return (await this.getUserInfo(userId)).parent;
	}

	/** Lấy parent (đơn vị cha) và position của user trong 1 query duy nhất */
	private async getUserInfo(
		userId: string,
	): Promise<{ parent: string; position: string }> {
		const empty = { parent: '', position: '' };
		try {
			if (!userId || typeof userId !== 'string') return empty;

			const rawRow = await this.dataSource.query(
				`SELECT TOP 1 parent, position
         FROM users WITH (NOLOCK)
         WHERE id = @0`,
				[userId],
			);

			const row = rawRow?.[0];
			return {
				parent: row?.parent ? String(row.parent) : '',
				position: row?.position ? String(row.position) : '',
			};
		} catch (error) {
			this.logger.error(`getUserInfo error: ${error.message}`, error.stack);
			return empty;
		}
	}

	private normalizePosition(value?: string): string {
		if (!value || typeof value !== 'string') return '';

		return value
			.trim()
			.toLowerCase()
			.normalize('NFD')                    // tách dấu
			.replace(/[\u0300-\u036f]/g, '')     // bỏ dấu
			.replace(/[\s_]+/g, '');             // bỏ space + _
	}

	private calcTrend(
		current: number,
		previous: number,
	): { type: 'up' | 'down' | 'neutral'; value: string } {
		if (previous <= 0) return { type: 'neutral', value: '0%' };
		const pct = Math.round(((current - previous) / previous) * 100);
		if (pct > 0) return { type: 'up', value: `${pct}%` };
		if (pct < 0) return { type: 'down', value: `${Math.abs(pct)}%` };
		return { type: 'neutral', value: '0%' };
	}

	private formatTime(date: Date): string {
		return (
			String(date.getHours()).padStart(2, '0') +
			':' +
			String(date.getMinutes()).padStart(2, '0')
		);
	}

	private formatDate(date: Date): string {
		return (
			String(date.getDate()).padStart(2, '0') +
			'/' +
			String(date.getMonth() + 1).padStart(2, '0')
		);
	}

	private formatDuration(minutes: number): string {
		if (minutes >= 60) {
			const h = Math.floor(minutes / 60);
			const m = minutes % 60;
			return m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`;
		}
		return `${minutes} phút`;
	}

	// ─── POPUP APIS FOR CANBO DASHBOARD ─────────────────────────────────────────
	async getNormalIncomingDocumentsList(userId: string, queryParams: any) {
		const filter = (queryParams?.filter || queryParams?.type || 'incoming-documents').toString().toLowerCase();
		const pageNum = Number(queryParams?.page) || 1;
		const limitNum = Number(queryParams?.limit) || 10;
		const offset = (pageNum - 1) * limitNum;
		const keyword = queryParams?.name || queryParams?.keyword || queryParams?.code ? `%${queryParams.name || queryParams.keyword || queryParams.code}%` : null;

		let filterCondition = '';
		if (filter === 'incoming-pending' || filter === 'pending' || filter === 'pendding') {
			filterCondition = `AND au_pending.document_id IS NOT NULL AND d.status = 1 AND MONTH(d.created_at) = MONTH(GETDATE()) AND YEAR(d.created_at) = YEAR(GETDATE())`;
		} else if (filter === 'incoming-in-progress' || filter === 'in-progress' || filter === 'processing') {
			filterCondition = `AND d.status != 3 AND la_doc.stage_status != 'HOAN_THANH_VAN_BAN' AND la_user.stage_status = 'DANG_XU_LY' AND ((MONTH(d.created_at) = MONTH(GETDATE()) AND YEAR(d.created_at) = YEAR(GETDATE())) OR (MONTH(la_user.updated_at) = MONTH(GETDATE()) AND YEAR(la_user.updated_at) = YEAR(GETDATE())))`;
		} else if (filter === 'incoming-overdue' || filter === 'overdue' || filter === 'late' || filter === 'danger' || filter === 'insight' || filter === 'urgent') {
			filterCondition = `AND d.status != 3 AND la_doc.stage_status != 'HOAN_THANH_VAN_BAN' AND COALESCE(la_user.deadline, d.deadline, d.resolution_deadline) < GETDATE() AND ((MONTH(d.created_at) = MONTH(GETDATE()) AND YEAR(d.created_at) = YEAR(GETDATE())) OR (MONTH(la_user.updated_at) = MONTH(GETDATE()) AND YEAR(la_user.updated_at) = YEAR(GETDATE())))`;
		} else {
			// Click Thẻ "Văn bản đến": incCurTotal = incPending (Chờ xử lý) + incInProgress (Chờ hoàn thành) = 12
			filterCondition = `AND (
				(au_pending.document_id IS NOT NULL AND d.status = 1 AND MONTH(d.created_at) = MONTH(GETDATE()) AND YEAR(d.created_at) = YEAR(GETDATE()))
				OR
				(d.status != 3 AND la_doc.stage_status != 'HOAN_THANH_VAN_BAN' AND la_user.stage_status = 'DANG_XU_LY' AND ((MONTH(d.created_at) = MONTH(GETDATE()) AND YEAR(d.created_at) = YEAR(GETDATE())) OR (MONTH(la_user.updated_at) = MONTH(GETDATE()) AND YEAR(la_user.updated_at) = YEAR(GETDATE()))))
			)`;
		}

		let searchClause = '';
		if (keyword) {
			searchClause = `AND (d.abstract_note LIKE @1 OR d.to_book_code LIKE @1 OR CAST(d.document_id AS VARCHAR(50)) LIKE @1)`;
		}

		const baseSql = `
			FROM incomming_documents d WITH (NOLOCK)
			CROSS APPLY (
				SELECT TOP 1 a.stage_status
				FROM audit a WITH (NOLOCK)
				WHERE a.document_id = d.document_id
				ORDER BY a.id DESC
			) la_doc
			OUTER APPLY (
				SELECT TOP 1 a.receiver, a.updated_at, a.deadline, a.stage_status
				FROM audit a WITH (NOLOCK)
				WHERE a.document_id = d.document_id
				  AND a.receiver = @0
				ORDER BY a.id DESC
			) la_user
			LEFT JOIN incomming_assignment au_pending WITH (NOLOCK)
				ON au_pending.document_id = d.document_id
				AND au_pending.receiver = @0
				AND au_pending.stage_status = 'CHUA_XU_LY'
			WHERE la_user.receiver IS NOT NULL ${filterCondition}
		`;

		const countSql = `SELECT COUNT(DISTINCT d.document_id) AS total ${baseSql} ${searchClause}`;
		const dataSql = `
			SELECT DISTINCT
				d.document_id AS id,
				d.document_id AS document_id,
				d.to_book_code AS to_book_code,
				d.abstract_note AS abstract_note,
				d.document_date AS document_date,
				COALESCE(la_user.deadline, d.deadline, d.resolution_deadline) AS deadline,
				d.created_at AS created_at,
				d.signer AS signer,
				la_user.stage_status AS status_code,
				'incoming' AS docType,
				N'Văn bản đến' AS docTypeText,
				CASE 
					WHEN la_doc.stage_status = 'HOAN_THANH_VAN_BAN' THEN N'Đã xử lý'
					ELSE N'Chưa xử lý'
				END AS processStatusText
			${baseSql} ${searchClause}
			ORDER BY d.created_at DESC
			OFFSET ${offset} ROWS FETCH NEXT ${limitNum} ROWS ONLY
		`;

		const queryArgs = keyword ? [userId, keyword] : [userId];
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
			let actionCode = row.status_code;
			if (row.processStatusText === 'Đã xử lý') {
				actionCode = 'HOAN_THANH_VAN_BAN';
			} else if (!actionCode) {
				actionCode = 'CHUA_XU_LY';
			}
			const formattedStatus = mapActionIncomingToLabel(String(actionCode));

			return {
				id: row.id,
				documentId: row.document_id,
				docType: 'incoming',
				docTypeText: 'Văn bản đến',
				toBookCode: row.to_book_code || null,
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

	async getNormalOutgoingDocumentsList(userId: string, queryParams: any) {
		const { parent: receiverUnit, position } = await this.getUserInfo(userId);
		const normalized = this.normalizePosition(position);
		const isVanThu = normalized === 'vanthu';

		const filter = (queryParams?.filter || queryParams?.type || 'outgoing-documents').toString().toLowerCase();
		const pageNum = Number(queryParams?.page) || 1;
		const limitNum = Number(queryParams?.limit) || 10;
		const offset = (pageNum - 1) * limitNum;
		const keyword = queryParams?.name || queryParams?.keyword || queryParams?.code ? `%${queryParams.name || queryParams.keyword || queryParams.code}%` : null;

		let vanThuPendingJoin = '';
		if (isVanThu && (filter === 'outgoing-pending' || filter === 'pending' || filter === 'pendding' || filter === 'awaiting-approval' || filter === 'approval' || filter === 'cho-ky-phe-duyet')) {
			vanThuPendingJoin = `
				INNER JOIN (
					SELECT od1.document_id FROM outgoing_documents od1 WITH (NOLOCK)
					INNER JOIN outgoing_current_state ocs1 WITH (NOLOCK) ON ocs1.document_id = od1.document_id
					LEFT JOIN outgoing_assignment oa1 WITH (NOLOCK) ON oa1.document_id = od1.document_id AND (oa1.receiver = @0 OR oa1.receiver = @1 OR oa1.receiver_unit = @1 OR oa1.receiver = 'CAN_CHO_SO')
					WHERE od1.status_code IN ('15','16','9') AND oa1.document_id IS NOT NULL AND (ocs1.current_stage_status = 'HT_VBTT' OR ocs1.current_stage_status = 'BAN_HANH_TO_TRINH' OR (ocs1.current_stage_status = 'CHUA_XU_LY' AND ocs1.current_action_code IN ('KY_SO','CHO_SO','DONG_DAU','KY_PHAT_HANH')) OR ocs1.current_stage_status = 'CAN_CHO_SO') AND ocs1.has_ban_hanh = 0 AND od1.status = 1
					UNION
					SELECT od2.document_id FROM outgoing_documents od2 WITH (NOLOCK)
					INNER JOIN outgoing_current_state ocs2 WITH (NOLOCK) ON ocs2.document_id = od2.document_id
					LEFT JOIN outgoing_assignment oa2 WITH (NOLOCK) ON oa2.document_id = od2.document_id AND (oa2.receiver = @0 OR oa2.receiver = @1 OR oa2.receiver_unit = @1)
					WHERE od2.status_code IN ('2','3','4','5','6','14') AND oa2.stage_status IN ('HT_VBTT','CHUA_XU_LY','CHO_KY_NOI_DUNG','CHO_KY_THE_THUC','CHO_KY_BAN_HANH','CHO_KY_NHAY','CHO_KY_CHINH_THUC') AND oa2.document_id IS NOT NULL AND ocs2.has_ban_hanh = 0 AND NOT EXISTS (SELECT 1 FROM outgoing_assignment oa_c WITH (NOLOCK) WHERE oa_c.document_id = od2.document_id AND oa_c.receiver = @0 AND oa_c.is_creator = 1) AND od2.status = 1
					UNION
					SELECT od3.document_id FROM outgoing_documents od3 WITH (NOLOCK)
					INNER JOIN outgoing_current_state ocs3 WITH (NOLOCK) ON ocs3.document_id = od3.document_id
					LEFT JOIN outgoing_assignment oa3 WITH (NOLOCK) ON oa3.document_id = od3.document_id AND (oa3.receiver = @0 OR oa3.receiver = @1 OR oa3.receiver_unit = @1)
					WHERE od3.status_code = '100' AND oa3.stage_status IN ('CHUA_XU_LY','CHO_DONG_DAU') AND oa3.document_id IS NOT NULL AND ocs3.has_ban_hanh = 0 AND NOT EXISTS (SELECT 1 FROM outgoing_assignment oa_c WITH (NOLOCK) WHERE oa_c.document_id = od3.document_id AND oa_c.receiver = @0 AND oa_c.is_creator = 1) AND od3.status = 1
				) vt_pending ON vt_pending.document_id = od.document_id
			`;
		}

		let filterCondition = '';
		if (filter === 'outgoing-draft' || filter === 'draft' || filter === 'du-thao') {
			filterCondition = `AND od.status_code = '1' AND audit_user.stage_status = 'CHUA_XU_LY' AND ((MONTH(od.created_at) = MONTH(GETDATE()) AND YEAR(od.created_at) = YEAR(GETDATE())) OR (MONTH(audit_user.updated_at) = MONTH(GETDATE()) AND YEAR(audit_user.updated_at) = YEAR(GETDATE())))`;
		} else if (filter === 'outgoing-pending' || filter === 'pending' || filter === 'pendding' || filter === 'awaiting-approval' || filter === 'approval' || filter === 'cho-ky-phe-duyet') {
			if (isVanThu) {
				filterCondition = `AND ((MONTH(od.created_at) = MONTH(GETDATE()) AND YEAR(od.created_at) = YEAR(GETDATE())) OR (MONTH(la_user.updated_at) = MONTH(GETDATE()) AND YEAR(la_user.updated_at) = YEAR(GETDATE())))`;
			} else {
				filterCondition = `AND od.status_code IN ('2','3','4','5','6','14') AND oa.stage_status IN ('HT_VBTT', 'CHUA_XU_LY', 'CHO_KY_NOI_DUNG', 'CHO_KY_THE_THUC', 'CHO_KY_BAN_HANH', 'CHO_KY_NHAY', 'CHO_KY_CHINH_THUC') AND oa.document_id IS NOT NULL AND ocs.has_ban_hanh = 0 AND NOT EXISTS (SELECT 1 FROM outgoing_assignment oa_c WITH (NOLOCK) WHERE oa_c.document_id = od.document_id AND oa_c.receiver = @0 AND oa_c.is_creator = 1) AND ((MONTH(od.created_at) = MONTH(GETDATE()) AND YEAR(od.created_at) = YEAR(GETDATE())) OR (MONTH(oa.updated_at) = MONTH(GETDATE()) AND YEAR(oa.updated_at) = YEAR(GETDATE())))`;
			}
		} else if (filter === 'outgoing-overdue' || filter === 'overdue' || filter === 'late' || filter === 'qua-han') {
			filterCondition = `AND la_user.receiver IS NOT NULL AND la_doc.stage_status NOT IN ('BAN_HANH_DU_THAO', 'DA_BAN_HANH') AND COALESCE(la_user.deadline, od.deadline_reply) < GETDATE() AND ((MONTH(od.created_at) = MONTH(GETDATE()) AND YEAR(od.created_at) = YEAR(GETDATE())) OR (MONTH(la_user.updated_at) = MONTH(GETDATE()) AND YEAR(la_user.updated_at) = YEAR(GETDATE())))`;
		} else {
			// Click Thẻ "Văn bản đi": outCurTotal = outDraft (Dự thảo = 16) + outPending (Chờ duyệt = 0) = 16
			filterCondition = `AND (
				(od.status_code = '1' AND audit_user.stage_status = 'CHUA_XU_LY' AND ((MONTH(od.created_at) = MONTH(GETDATE()) AND YEAR(od.created_at) = YEAR(GETDATE())) OR (MONTH(audit_user.updated_at) = MONTH(GETDATE()) AND YEAR(audit_user.updated_at) = YEAR(GETDATE()))))
				OR
				(od.status_code IN ('2','3','4','5','6','14') AND oa.stage_status IN ('HT_VBTT', 'CHUA_XU_LY', 'CHO_KY_NOI_DUNG', 'CHO_KY_THE_THUC', 'CHO_KY_BAN_HANH', 'CHO_KY_NHAY', 'CHO_KY_CHINH_THUC') AND oa.document_id IS NOT NULL AND ocs.has_ban_hanh = 0 AND NOT EXISTS (SELECT 1 FROM outgoing_assignment oa_c WITH (NOLOCK) WHERE oa_c.document_id = od.document_id AND oa_c.receiver = @0 AND oa_c.is_creator = 1) AND ((MONTH(od.created_at) = MONTH(GETDATE()) AND YEAR(od.created_at) = YEAR(GETDATE())) OR (MONTH(oa.updated_at) = MONTH(GETDATE()) AND YEAR(oa.updated_at) = YEAR(GETDATE()))))
			)`;
		}

		let searchClause = '';
		if (keyword) {
			searchClause = `AND (od.abstract_note LIKE @2 OR od.text_symbols LIKE @2 OR CAST(od.document_id AS VARCHAR(50)) LIKE @2)`;
		}

		const baseSql = `
			FROM outgoing_documents od WITH (NOLOCK)
			${vanThuPendingJoin}
			LEFT JOIN outgoing_current_state ocs WITH (NOLOCK)
				ON ocs.document_id = od.document_id
			LEFT JOIN outgoing_assignment oa WITH (NOLOCK)
				ON oa.document_id = od.document_id
				AND (
					oa.receiver      = @0
					OR oa.receiver      = @1
					OR oa.receiver_unit = @1
				)
			CROSS APPLY (
				SELECT TOP 1 a.stage_status
				FROM audit a WITH (NOLOCK)
				WHERE a.document_id = od.document_id
				ORDER BY a.id DESC
			) la_doc
			OUTER APPLY (
				SELECT TOP 1 a.receiver, a.updated_at, a.deadline
				FROM audit a WITH (NOLOCK)
				WHERE a.document_id = od.document_id
				  AND a.receiver = @0
				ORDER BY a.id DESC
			) la_user
			OUTER APPLY (
				SELECT TOP 1 a.stage_status, a.created_by, a.updated_at
				FROM audit a WITH (NOLOCK)
				WHERE a.document_id = od.document_id
				  AND (a.receiver = @0 OR a.created_by = @0 OR a.receiver = @1 OR a.receiver_unit = @1)
				ORDER BY CASE WHEN a.stage_status = 'CHUA_XU_LY' THEN 1 ELSE 99 END, a.id DESC
			) audit_user
			WHERE od.status = 1
			  AND NULLIF(LTRIM(RTRIM(CONVERT(NVARCHAR(MAX), od.abstract_note))), '') IS NOT NULL
			  AND UPPER(LTRIM(RTRIM(CONVERT(NVARCHAR(MAX), od.abstract_note)))) <> 'NULL'
			  ${filterCondition}
		`;

		const countSql = `SELECT COUNT(DISTINCT od.document_id) AS total ${baseSql} ${searchClause}`;
		const dataSql = `
			SELECT DISTINCT
				od.document_id AS id,
				od.document_id AS document_id,
				od.text_symbols AS text_symbols,
				od.abstract_note AS abstract_note,
				od.document_date AS document_date,
				COALESCE(la_user.deadline, od.deadline_reply) AS deadline,
				od.created_at AS created_at,
				od.report_signer AS signer,
				od.status_code AS status_code,
				'outgoing' AS docType,
				N'Văn bản đi' AS docTypeText,
				CASE 
					WHEN la_doc.stage_status IN ('BAN_HANH_DU_THAO', 'DA_BAN_HANH') THEN N'Đã xử lý'
					ELSE N'Chưa xử lý'
				END AS processStatusText
			${baseSql} ${searchClause}
			ORDER BY od.created_at DESC
			OFFSET ${offset} ROWS FETCH NEXT ${limitNum} ROWS ONLY
		`;

		const queryArgs = keyword ? [userId, receiverUnit, keyword] : [userId, receiverUnit];
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
			let stageStatus = row.status_code;
			if (row.processStatusText === 'Đã xử lý') {
				stageStatus = 'BAN_HANH';
			} else if (!stageStatus) {
				stageStatus = 'CHUA_XU_LY';
			}
			const formattedStatus = mapActionToLabel(String(stageStatus));

			return {
				id: row.id,
				documentId: row.document_id,
				docType: 'outgoing',
				docTypeText: 'Văn bản đi',
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

	async getNormalTasksList(userId: string, queryParams: any) {
		const filter = (queryParams?.filter || queryParams?.type || 'tasks-overview').toString().toLowerCase();
		const pageNum = Number(queryParams?.page) || 1;
		const limitNum = Number(queryParams?.limit) || 10;
		const offset = (pageNum - 1) * limitNum;
		const keyword = queryParams?.name || queryParams?.keyword || queryParams?.code ? `%${queryParams.name || queryParams.keyword || queryParams.code}%` : null;

		let filterCondition = '';
		if (filter === 'doing' || filter === 'in-progress') {
			filterCondition = `AND t.process_status = '2' AND ((MONTH(t.start_date) = MONTH(GETDATE()) AND YEAR(t.start_date) = YEAR(GETDATE())) OR (MONTH(t.end_date) = MONTH(GETDATE()) AND YEAR(t.end_date) = YEAR(GETDATE())))`;
		} else if (filter === 'overdue' || filter === 'delayed' || filter === 'late') {
			filterCondition = `AND t.process_status NOT IN ('4', '8') AND t.end_date < GETDATE() AND ((MONTH(t.start_date) = MONTH(GETDATE()) AND YEAR(t.start_date) = YEAR(GETDATE())) OR (MONTH(t.end_date) = MONTH(GETDATE()) AND YEAR(t.end_date) = YEAR(GETDATE())))`;
		} else if (filter === 'pending-approval' || filter === 'pending' || filter === 'awaiting-approval') {
			filterCondition = `AND t.process_status NOT IN ('4', '8', '2') AND ((MONTH(t.start_date) = MONTH(GETDATE()) AND YEAR(t.start_date) = YEAR(GETDATE())) OR (MONTH(t.end_date) = MONTH(GETDATE()) AND YEAR(t.end_date) = YEAR(GETDATE())))`;
		} else if (filter === 'done' || filter === 'completed') {
			filterCondition = `AND t.process_status = '4' AND ((MONTH(t.start_date) = MONTH(GETDATE()) AND YEAR(t.start_date) = YEAR(GETDATE())) OR (MONTH(t.end_date) = MONTH(GETDATE()) AND YEAR(t.end_date) = YEAR(GETDATE())))`;
		} else {
			filterCondition = `AND t.process_status NOT IN ('4', '8') AND ((MONTH(t.start_date) = MONTH(GETDATE()) AND YEAR(t.start_date) = YEAR(GETDATE())) OR (MONTH(t.end_date) = MONTH(GETDATE()) AND YEAR(t.end_date) = YEAR(GETDATE())))`;
		}

		let searchClause = '';
		if (keyword) {
			searchClause = `AND (t.name LIKE @1 OR t.code LIKE @1)`;
		}

		const baseSql = `
			FROM task t WITH (NOLOCK)
			WHERE t.status != 3
			  AND t.process_status != '8'
			  AND (
				EXISTS (
				  SELECT 1 FROM task_users tu WITH (NOLOCK)
				  WHERE tu.task_id = t.id AND tu.process_id = @0
				)
				OR t.created_by = @0
				OR t.updated_by = @0
			  )
			  ${filterCondition}
		`;

		const countSql = `SELECT COUNT(DISTINCT t.id) AS total ${baseSql} ${searchClause}`;
		const dataSql = `
			SELECT DISTINCT
				t.id AS id,
				t.name AS name,
				t.code AS code,
				t.start_date AS start_date,
				t.end_date AS end_date,
				t.priority AS priority,
				t.type_task AS type_task,
				t.template_id AS template_id,
				t.reminder_time AS reminder_time,
				t.note AS note,
				t.progress AS progress,
				t.created_by AS created_by,
				t.updated_by AS updated_by,
				t.created_at AS created_at,
				t.update_at AS updated_at,
				t.parent AS parent,
				t.process_status AS process_status,
				t.project_id AS project_id,
				t.dependent_task_id AS dependent_task_id,
				t.is_approval_required AS is_approval_required,
				NULL AS slow_reason
			${baseSql} ${searchClause}
			ORDER BY t.created_at DESC
			OFFSET ${offset} ROWS FETCH NEXT ${limitNum} ROWS ONLY
		`;

		const queryArgs = keyword ? [userId, keyword] : [userId];
		const [countRs, tasks] = await Promise.all([
			this.dataSource.query(countSql, queryArgs),
			this.dataSource.query(dataSql, queryArgs),
		]);

		const total = countRs?.[0]?.total ? Number(countRs[0].total) : 0;

		if (!tasks || !tasks.length) {
			return { data: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 };
		}

		const taskIds = tasks.map((t: any) => t.id);
		const taskUsersRaw = await this.dataSource.query(`
			SELECT tu.id, tu.task_id, tu.process_id, tu.role, tu.type, u.name as user_name, u.parent as user_parent_id, dep.name as department_name
			FROM task_users tu WITH (NOLOCK)
			LEFT JOIN users u WITH (NOLOCK) ON u.id = tu.process_id
			LEFT JOIN users dep WITH (NOLOCK) ON dep.id = u.parent
			WHERE tu.task_id IN (${taskIds.join(',')})
		`);

		const usersMap = new Map<string, any[]>();
		for (const u of taskUsersRaw) {
			const tid = String(u.task_id);
			if (!usersMap.has(tid)) usersMap.set(tid, []);
			usersMap.get(tid)?.push(u);
		}

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

		const typeTaskVn: Record<string, string> = {
			general: 'Công việc chung',
			project: 'Dự án',
		};

		const mappedData = tasks.map((task: any) => {
			const tuList = usersMap.get(String(task.id)) || [];

			const taskUsersFormatted = tuList.map((x: any) => ({
				id: x.id,
				user: {
					id: x.user_id || x.process_id,
					name: x.user_name || x.process_name,
					parent: x.user_parent_id ? { id: x.user_parent_id, name: x.department_name || '' } : null,
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

			const typeTaskKey = task.type_task || 'general';
			const typeTaskText = typeTaskVn[typeTaskKey] || 'Công việc chung';
			const progressVal = Number(task.progress || 0);

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
				processStatusUi,
				progressView: progressObj.html,
				progressColor: progressObj.color,
				isDeadlineExceeded: progressObj.isDeadlineExceeded,
				startDateNotHTML: task.start_date ? formatDate(task.start_date) : null,
				endDateNotHTML: task.end_date ? formatDate(task.end_date) : null,
				startDateISO: task.start_date ? new Date(task.start_date).toISOString() : null,
				endDateISO: task.end_date ? new Date(task.end_date).toISOString() : null,
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

	private mapNewsEmoji(category: string): string {
		const map: Record<string, string> = {
			award: '🏆',
			benefit: '🎁',
			technology: '🚀',
			event: '🎉',
			announcement: '📢',
			policy: '📋',
			achievement: '🌟',
		};
		return map[String(category || '').toLowerCase()] ?? '📰';
	}
}
