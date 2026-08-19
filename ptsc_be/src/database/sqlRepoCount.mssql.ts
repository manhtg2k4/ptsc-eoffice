/**
 * sqlRepoCount.mssql.ts
 * Tách biệt tất cả các hàm COUNT từ MSSQLRepository.
 * Class này được inject vào DocumentsService / MenuManagerService
 * để gọi động qua this.count[fnName](args)
 */
import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getMssqlPool } from './mssql.pool';
import * as sql from 'mssql';
import { FeatureManagementEntity, StatusFeature } from 'src/feature-management/feature-management.entity';
import { GROUP_CODES, stageStatusArchire, stageStatusDoc, stageStatusVehicle } from '../variable/CONST_STATUS';
import { ConnectionPool } from 'mssql';
import { buildRecordExploitationRequestssCriteriaHelper } from 'src/record-exploitation/validators/helper-record-exploitation';
import { RecordExploitationEntity } from 'src/record-exploitation/entities/record-exploitation.entity';
import { MeetingEntity, ParticipantType } from 'src/meeting/entities/meeting.entity';
import { buildMeetingCriteriaHelper } from 'src/meeting/helper/build.meeting.filter';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { ASSIGNING_SEAT_STATUS, MEETING_UNIT_STATE } from 'src/meeting/helper/meeting.mapper';
import { VehicleState } from 'src/vehicle-registration/entities/vehicle-registration.entity';
import { buildVehicleRegistrationCriteriaHelper } from 'src/vehicle-registration/helper/vehicle-registration.helper';
import { buildArchiveRecordsCriteriaHelper } from 'src/archive-records/helper/builder.query';
import { buildDocumentCriteriaHelper, buildDocumentCriteriaReplyEvictHelper } from 'src/documents/helpers/build.filter';

type CriteriaItem = { name: string; operator: string; value: string | string[] };

@Injectable()
export class SqlRepoCountService {
  private readonly logger = new Logger(SqlRepoCountService.name);
  private pool: ConnectionPool;
  private dbname: string;
  private processKeyRecordExp: string = 'QUY_TRINH_KHAI_THAC_HO_SO';
  private processKeyMeeting: string;
  private processKeyVehicle: string;

  constructor(
    private readonly configService: ConfigService,

    @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
    private readonly featureManagementRepository: Repository<FeatureManagementEntity>,
    @InjectRepository(RecordExploitationEntity, 'mssqlConnection')
    private readonly recordRepo: Repository<RecordExploitationEntity>,
    @InjectRepository(MeetingEntity, 'mssqlConnection')
    private readonly meetingRepo: Repository<MeetingEntity>,
    @InjectRepository(OrganizationUnitEntity, 'mssqlConnection')
    private readonly orgUnitRepo: Repository<OrganizationUnitEntity>,
  ) { }

  // ─── Pool helper ────────────────────────────────────────────────
  private async getPool(): Promise<ConnectionPool> {
    if (this.pool?.connected) return this.pool;
    this.pool = await getMssqlPool(this.configService);
    if (!this.pool.connected) throw new Error('MSSQL pool not connected');
    return this.pool;
  }

  // Get dbName 
  private getDatabaseName(): string {
    const dbName = this.configService.get<string>('SQLSERVER_DATABASE');
    if (!dbName) throw new Error('SQLSERVER_DATABASE not defined in .env');
    return dbName + '.dbo';
  }

  async onModuleInit() {
    this.dbname = this.getDatabaseName();
    await this.updateProcessKeyWithLatestBpmnVersion()
    // reload 5 phút
    setInterval(() => {
      this.updateProcessKeyWithLatestBpmnVersion();
    }, 5 * 60 * 1000);
  }

  async updateProcessKeyWithLatestBpmnVersion() {
    try {
      // Lấy tất cả recordExp từ DB hoặc cache nếu bạn đã load
      const recordExp = await this.recordRepo.find({
        order: { createdAt: 'DESC' }, // sắp xếp mới nhất lên đầu
        take: 1, // chỉ lấy meeting mới nhất
        select: ['bpmnVersion', 'createdAt']
      });

      if (recordExp.length === 0) {
        this.logger.warn('Không tìm thấy cuộc họp nào để cập nhật processKey');
        return;
      }

      // Lấy meeting mới nhất
      const latestRecordEpx = recordExp[0];

      // Cập nhật processKey
      this.processKeyRecordExp = latestRecordEpx.bpmnVersion || 'QUY_TRINH_KHAI_THAC_HO_SO';

      const meetings = await this.meetingRepo.find({
        order: { createdAt: 'DESC' }, // sắp xếp mới nhất lên đầu
        take: 1, // chỉ lấy meeting mới nhất
        select: ['bpmnVersion', 'createdAt']
      });

      if (meetings.length === 0) {
        this.logger.warn('Không tìm thấy cuộc họp nào để cập nhật processKey');
        return;
      }

      // Lấy meeting mới nhất
      const latestMeeting = meetings[0];

      // Cập nhật processKey
      this.processKeyMeeting = latestMeeting.bpmnVersion;

    } catch (error) {
      this.logger.error('Lỗi khi cập nhật processKey từ bpmn_version', error);
    }
  }

  async findRootUnit(unitId: string): Promise<string> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('unitId', unitId)
      .query(`
        SELECT mpath
        FROM ${this.dbname}.organization_units WITH (NOLOCK)
        WHERE id = @unitId AND status = 1
      `);

    const mpath = result.recordset[0]?.mpath;
    if (mpath) {
      const parts = mpath.split('/');
      return parts[0] || unitId;
    }
    return unitId;
  }

  async getAllChildUnits(rootId: string): Promise<string[]> {
    const pool = await this.getPool();

    const sql = `
      SELECT id
      FROM ${this.dbname}.organization_units WITH (NOLOCK)
      WHERE (mpath = @rootId OR mpath LIKE @rootId + '/%') AND status = 1
    `;

    const result = await pool.request()
      .input('rootId', rootId)
      .query(sql);

    return result.recordset.map(r => r.id);
  }

  async getUsersByGroupCode(code: string): Promise<string[]> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('code', code)
      .query(`
        SELECT userId
        FROM ${this.dbname}.group_users WITH (NOLOCK)
        WHERE code = @code AND status = 1
      `);

    const rawVal = result.recordset[0]?.userId;
    if (!rawVal) return [];
    try {
      const parsed = JSON.parse(rawVal);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // ─── Build criteria helper (tối giản để không phụ thuộc MSSQLRepository) ─
  private buildCriteriaString(
    criteria: CriteriaItem[],
    _table: string,
    _feature?: any,
  ): { sql: string; joins: string } {
    if (!criteria?.length) return { sql: '', joins: '' };

    const groups: Record<string, string[]> = {};
    const validColumns = new Set([
      "document_id", "status_code", "created_at", "updated_at", "book_document_id",
      "abstract_note", "to_book", "sender_unit", "receiver_unit", "document_date",
      "receive_date", "to_book_date", "deadline", "second_book", "receive_method",
      "private_level", "urgency_level", "document_type", "document_field", "signer",
      "to_book_code", "fileids", "status", "isStar", "parent_doc",
      "type_process_doc", "bpmn_version", "drafter", "report_signer",
      "report_document_symbol", "to_book_text_symbols", "viewers",
      "deadline_reply", "recipient_ids", "release_no", "text_symbols"
    ]);

    for (const c of criteria) {
      if (!c.name || !c.value) continue;

      let fieldName = c.name;
      if (fieldName === 'document_code' || fieldName === 'documentCode') {
        // Với văn bản đi: document_code = release_no (số phát hành thực tế)
        // Với các bảng khác: document_code = document_id
        fieldName = (_table === 'outgoing_documents') ? 'release_no' : 'document_id';
      }
      const snakeField = this.toSnakeCase(fieldName);
      if (!validColumns.has(snakeField)) continue;

      const col = `${_table}.${snakeField}`;
      let part = '';

      if (c.operator === 'between' && Array.isArray(c.value) && c.value.length === 2) {
        part = `${col} BETWEEN '${c.value[0]}' AND '${c.value[1]}'`;
      } else if (c.operator === 'gte') {
        part = `${col} >= '${c.value}'`;
      } else if (c.operator === 'lte') {
        part = `${col} <= '${c.value}'`;
      } else if (c.operator === 'eq') {
        if (snakeField === 'status_code') {
          part = `${col} = CAST('${c.value}' AS VARCHAR(20))`;
        } else {
          part = `${col} = '${c.value}'`;
        }
      } else if (c.operator === 'neq') {
        if (c.value === null) {
          part = `${col} IS NOT NULL`;
        } else {
          part = `${col} != '${c.value}'`;
        }
      } else {
        part = `${col} LIKE '%${c.value}%'`;
      }

      if (!groups[snakeField]) groups[snakeField] = [];
      groups[snakeField].push(part);
    }

    const globalParts = Object.values(groups).map(groupParts => {
      if (groupParts.length > 1) return `(${groupParts.join(' OR ')})`;
      return groupParts[0];
    });

    return { sql: globalParts.join(' AND '), joins: '' };
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
      .toLowerCase();
  }

  private optimizeCountQuery(
    tableName: 'incomming_documents' | 'outgoing_documents',
    joinClause: string,
    whereClause: string,
  ): string {
    return `SELECT COUNT(DISTINCT ${tableName}.document_id) AS total FROM ${tableName} ${joinClause} ${whereClause}`;
  }

  // ─── Parse filter helper ─────────────────────────────────────────
  private buildCriteria(filter?: any): CriteriaItem[] {
    const criteria: CriteriaItem[] = [];
    if (!filter || typeof filter !== 'object') return criteria;
    Object.entries(filter).forEach(([key, value]) => {
      if (!value) return;
      if (typeof value === 'object') {
        const val = value as any;
        if (val.startDate && val.endDate)
          criteria.push({ name: key, operator: 'between', value: [String(val.startDate), String(val.endDate)] });
        else if (val.startDate)
          criteria.push({ name: key, operator: 'gte', value: String(val.startDate) });
        else if (val.endDate)
          criteria.push({ name: key, operator: 'lte', value: String(val.endDate) });
        else if (val.value !== undefined && val.value !== null)
          criteria.push({ name: key, operator: 'like', value: String(val.value) });
      } else {
        criteria.push({ name: key, operator: typeof value === 'string' ? 'like' : 'eq', value: String(value) });
      }
    });
    return criteria;
  }

  private async getListContext(userId: string, processFn: string | undefined, pool: sql.ConnectionPool) {
    const [featureManagement, userRes] = await Promise.all([
      processFn ? this.featureManagementRepository.findOne({
        where: { code: processFn, status: 1, statusFeature: StatusFeature.ACTIVE }
      }) : Promise.resolve(null),
      pool.request()
        .input('currentUserId', sql.NVarChar(100), userId)
        .query(`SELECT id, parent AS parentId FROM ${this.dbname}.users WHERE id = @currentUserId`)
    ]);

    const receiverUnit = userRes.recordset[0]?.parentId || null;
    const userContext = { userId, receiverUnit };

    return { userContext, featureManagement, receiverUnit };
  }

  // ════════════════════════════════════════════════════════════════
  // 1. Số đếm Xử lý chính (Văn bản đến)
  // ════════════════════════════════════════════════════════════════
  async countDocumentsMainProcessDynamic({
    type,
    userId,
    authorId,
    authority,
    room,
    processFn,
  }: {
    type?: string;
    userId: string;
    authorId?: string;
    authority?: string;
    room?: string;
    processFn: string;
  }): Promise<{ total: number }> {
    // ── Validate type ────────────────────────────────────────────────
    const USER_FLOW_TYPES = ['urgent', 'deadline', 'other', 'processed', 'notComplete', 'waitSign', 'notDone'] as const;
    const DOC_FLOW_TYPES = ['incompleted', 'completed'] as const;
    const ALLOWED_TYPES = [...USER_FLOW_TYPES, ...DOC_FLOW_TYPES];

    if (!type || !ALLOWED_TYPES.includes(type as any)) {
      return { total: 0 };
    }

    if (authority === 'true' && authorId) userId = authorId;

    const pool = await this.getPool();

    // ── Context (featureManagement + receiverUnit) ───────────────────
    const { featureManagement } = await this.getListContext(userId, processFn, pool);

    // ── Criteria (chỉ featureCriteria, không có filter FE) ──────────
    const featureCriteria = featureManagement?.criteria ?? [];
    const { sql: filterFeature, joins: filterJoins } = buildDocumentCriteriaHelper(
      featureCriteria,
      'incomming_documents',
      featureManagement,
    );

    // ── Constants ────────────────────────────────────────────────────
    const tab = 'processor';
    const urgencyValue = 'khn';

    const isUserFlow = USER_FLOW_TYPES.includes(type as any);
    const isDocFlow = DOC_FLOW_TYPES.includes(type as any);

    const isRoomFilter = room === 'true' ? 'ONLY_ROOM' : room === 'false' ? 'ONLY_PERSONAL' : 'ALL';
    const roomCondition =
      isRoomFilter === 'ONLY_ROOM'
        ? `(af.is_transfer_to_room = 1)`
        : isRoomFilter === 'ONLY_PERSONAL'
          ? `(af.is_transfer_to_room = 0 OR af.is_transfer_to_room IS NULL)`
          : '';

    // ── JOIN clause ──────────────────────────────────────────────────
    let joinClause = `
      LEFT JOIN ${this.dbname}.incomming_current_state af
        ON af.document_id = incomming_documents.document_id`;

    // Assignment type check from audit details
    joinClause += ` OUTER APPLY (
      SELECT TOP 1 assignment_type as assignmentType
      FROM ${this.dbname}.audit
      WHERE document_id = incomming_documents.document_id
        AND assignment_type IS NOT NULL
      ORDER BY id DESC
    ) ap`;

    if (isUserFlow) {
      joinClause += `
      INNER JOIN ${this.dbname}.incomming_assignment au
        ON au.document_id = incomming_documents.document_id
      AND au.receiver    = @currentUserId
      AND au.role_process = '${tab}'`;
    }

    if (isDocFlow) {
      joinClause += `
      INNER JOIN ${this.dbname}.incomming_current_state ad
        ON ad.document_id = incomming_documents.document_id`;
    }

    if (filterJoins) joinClause += ' ' + filterJoins;

    // ── WHERE conditions ─────────────────────────────────────────────
    const excludeCompletedDoc = `ISNULL(af.is_completed_doc, 0) = 0`;
    const latestActionExclusion = `(af.current_action_code IS NULL OR af.current_action_code NOT IN ('TAO_SAO_Y', 'TRINH_KY'))`;
    const conditionChuaXuLyAndThemXuLy = `
      (
        au.stage_status = '${stageStatusDoc.CHUA_XU_LY}'
        AND af.current_action_code = 'THEM_XU_LY'
      )
      `;

    const typeFilters: Record<string, string[]> = {
      urgent: [
        filterFeature ? `(${filterFeature})` : undefined,
        `incomming_documents.urgency_level IN ('${urgencyValue}')`,
        `(au.stage_status = '${stageStatusDoc.CHUA_XU_LY}')`,
        `ISNULL(af.is_completed_doc, 0) = 0`,
        roomCondition,
      ].filter((f): f is string => !!f),

      deadline: [
        filterFeature ? `(${filterFeature})` : undefined,
        `(au.stage_status = '${stageStatusDoc.CHUA_XU_LY}' 
        AND NOT ${conditionChuaXuLyAndThemXuLy})`,
        `ISNULL(af.is_completed_doc, 0) = 0`,
        roomCondition,
      ].filter((f): f is string => !!f),

      waitSign: [
        filterFeature ? `(${filterFeature})` : undefined,
        `(au.stage_status = '${stageStatusDoc.DANG_CHO_KY}' OR au.stage_status = '${stageStatusDoc.DA_XU_LY}')`,
        roomCondition,
      ].filter((f): f is string => !!f),

      other: [
        filterFeature ? `(${filterFeature})` : undefined,
        `(incomming_documents.urgency_level != '${urgencyValue}' OR incomming_documents.urgency_level IS NULL)`,
        `(incomming_documents.deadline IS NULL OR incomming_documents.deadline > DATEADD(day, 3, CAST(GETDATE() AS DATE)))`,
        `(au.stage_status = '${stageStatusDoc.CHUA_XU_LY}')`,
        `ISNULL(af.is_completed_doc, 0) = 0`,
        roomCondition,
      ].filter((f): f is string => !!f),

      processed: [
        filterFeature ? `(${filterFeature})` : undefined,
        excludeCompletedDoc,
        // isRoomFilter là string ('ALL'/'ONLY_ROOM'/'ONLY_PERSONAL'), dùng === 'ONLY_ROOM' thay vì truthy check
        // Bọc outer parentheses để latestActionExclusion (AND) áp dụng đúng, tránh SQL operator precedence sai
        isRoomFilter === 'ONLY_ROOM' ?
          `((au.stage_status = '${stageStatusDoc.HOAN_THANH}' 
                OR au.stage_status = '${stageStatusDoc.DA_XU_LY}' 
                OR au.stage_status = '${stageStatusDoc.DA_PHAN_CONG}')
                  OR ${conditionChuaXuLyAndThemXuLy})`
          : `( au.stage_status = '${stageStatusDoc.DA_XU_LY}' 
            OR au.stage_status = '${stageStatusDoc.DA_PHAN_CONG}'
            OR au.stage_status = '${stageStatusDoc.HOAN_THANH}' )`,
        // Loại trừ văn bản đang chờ ký (action_code = TAO_SAO_Y hoặc TRINH_KY) - phải nằm ở tab waitSign
        latestActionExclusion,
        // Văn thư phân công: hoàn thành cá nhân hoặc chuyển xử lý cho người khác và chuỗi xử lý đã hoàn tất thì biến mất khỏi tab processed đối với người nhận phân công, nhưng VẪN HIỂN THỊ đối với Văn thư (người phân công).
        `NOT (
          ISNULL(ap.assignmentType, '') = 'VAN_THU' 
          AND NOT EXISTS (
            SELECT 1 FROM ${this.dbname}.audit a_vt
            WHERE a_vt.document_id = incomming_documents.document_id
              AND (a_vt.user_id = @currentUserId OR a_vt.created_by = @currentUserId OR a_vt.acting_as = @currentUserId)
              AND a_vt.assignment_type = 'VAN_THU'
          )
          AND (
            au.stage_status = '${stageStatusDoc.HOAN_THANH}'
            OR
            (
              au.stage_status = '${stageStatusDoc.DA_XU_LY}'
              AND NOT EXISTS (
                SELECT 1 
                FROM ${this.dbname}.audit a 
                INNER JOIN ${this.dbname}.incomming_assignment ia 
                  ON ia.document_id = a.document_id AND ia.receiver = a.receiver
                WHERE a.document_id = incomming_documents.document_id 
                  AND (a.user_id = @currentUserId OR a.created_by = @currentUserId OR a.acting_as = @currentUserId)
                  AND ia.stage_status NOT IN ('DA_XU_LY', 'HOAN_THANH')
              )
            )
          )
        )`,
        // Trưởng phòng phân công: chỉ biến mất khỏi tab processed (để chuyển sang hoàn thành hoặc chờ xác nhận) khi CẢ người xử lý chính VÀ người phối hợp đều đã xử lý xong.
        // Chỉ áp dụng điều kiện này đối với chính Trưởng phòng (người đã tạo ra các giao việc cho người khác).
        `NOT (
          ISNULL(ap.assignmentType, '') = 'TRUONG_PHONG' 
          AND EXISTS (
            SELECT 1 FROM ${this.dbname}.audit a_tp
            WHERE a_tp.document_id = incomming_documents.document_id
              AND (a_tp.user_id = @currentUserId OR a_tp.created_by = @currentUserId OR a_tp.acting_as = @currentUserId)
              AND a_tp.assignment_type = 'TRUONG_PHONG'
          )
          AND NOT EXISTS (
            SELECT 1 FROM ${this.dbname}.incomming_assignment ia
            WHERE ia.document_id = incomming_documents.document_id
              AND ia.role_process = 'processor'
              AND ia.receiver <> @currentUserId
              AND ia.stage_status NOT IN ('DA_XU_LY', 'HOAN_THANH')
          )
          AND NOT EXISTS (
            SELECT 1 FROM ${this.dbname}.incomming_assignment ia
            WHERE ia.document_id = incomming_documents.document_id
              AND ia.role_process = 'supporter'
              AND ia.receiver <> @currentUserId
              AND ia.stage_status NOT IN ('DA_XU_LY', 'HOAN_THANH')
          )
        )`,
        roomCondition,
      ].filter((f): f is string => !!f),

      incompleted: [
        filterFeature ? `(${filterFeature})` : undefined,
        excludeCompletedDoc,
        `(ad.current_stage_status = '${stageStatusDoc.HOAN_THANH}' 
        OR ad.current_stage_status = '${stageStatusDoc.DA_PHAN_CONG}')`,
        `EXISTS (SELECT 1 FROM ${this.dbname}.incomming_assignment ia WHERE ia.document_id = incomming_documents.document_id AND ia.receiver = @currentUserId)`,
        roomCondition,
      ].filter((f): f is string => !!f),

      completed: [
        filterFeature ? `(${filterFeature})` : undefined,
        `(
          (
            ad.current_stage_status = '${stageStatusDoc.HOAN_THANH_VAN_BAN}'
            AND EXISTS (
              SELECT 1 FROM ${this.dbname}.incomming_assignment ia_chk
              WHERE ia_chk.document_id = incomming_documents.document_id
                AND ia_chk.receiver = @currentUserId
                AND ia_chk.role_process = 'processor'
                AND ia_chk.stage_status IN ('DA_XU_LY', 'HOAN_THANH')
            )
          )
          OR
          (ISNULL(ap.assignmentType, '') = 'VAN_THU' AND EXISTS (
            SELECT 1 FROM ${this.dbname}.incomming_assignment ia
            WHERE ia.document_id = incomming_documents.document_id
              AND ia.receiver = @currentUserId
              AND ia.role_process = 'processor'
              AND ia.stage_status IN ('DA_XU_LY', 'HOAN_THANH')
          ) AND (
            ad.current_stage_status = '${stageStatusDoc.HOAN_THANH_VAN_BAN}'
            OR
            NOT EXISTS (
              SELECT 1 
              FROM ${this.dbname}.audit a 
              INNER JOIN ${this.dbname}.incomming_assignment ia 
                ON ia.document_id = a.document_id AND ia.receiver = a.receiver
              WHERE a.document_id = incomming_documents.document_id 
                AND (a.user_id = @currentUserId OR a.created_by = @currentUserId OR a.acting_as = @currentUserId)
                AND ia.stage_status NOT IN ('DA_XU_LY', 'HOAN_THANH')
            )
          ))
          OR
          (ISNULL(ap.assignmentType, '') IN ('TRUONG_PHONG', 'TRINH_LANH_DAO') AND EXISTS (
            SELECT 1 FROM ${this.dbname}.incomming_assignment au
            WHERE au.document_id = incomming_documents.document_id
              AND au.receiver = @currentUserId
              AND au.role_process = 'processor'
              AND au.stage_status IN ('DA_XU_LY', 'HOAN_THANH')
          ) AND (
            -- Hoặc văn bản hoàn thành tổng thể
            ad.current_stage_status = '${stageStatusDoc.HOAN_THANH_VAN_BAN}'
            OR
            -- Hoặc người phân công (Trưởng phòng) đã hoàn thành / xác nhận
            EXISTS (
              SELECT 1 FROM ${this.dbname}.incomming_assignment ia_tp
              WHERE ia_tp.document_id = incomming_documents.document_id
                AND ia_tp.receiver <> @currentUserId -- Không phải là bản thân người xử lý chính
                AND ia_tp.receiver = (
                  -- Tìm Trưởng phòng (người phân công từ Văn thư)
                  SELECT TOP 1 a.receiver FROM ${this.dbname}.audit a
                  WHERE a.document_id = incomming_documents.document_id
                    AND a.action_code = 'CHUYEN_XU_LY_PHAN_CONG'
                    ORDER BY a.id DESC
                )
                AND ia_tp.stage_status = '${stageStatusDoc.HOAN_THANH}'
            )
          ))
        )`,
        `EXISTS (SELECT 1 FROM ${this.dbname}.incomming_assignment ia WHERE ia.document_id = incomming_documents.document_id AND ia.receiver = @currentUserId AND ia.role_process = 'processor')`,
        roomCondition,
      ].filter((f): f is string => !!f),

      notComplete: [
        filterFeature ? `(${filterFeature})` : undefined,
        `(au.stage_status = '${stageStatusDoc.CHUA_XU_LY}')`,
        `ISNULL(af.is_completed_doc, 0) = 1`,
        `au.deadline IS NOT NULL AND au.deadline < GETDATE()`,
        roomCondition,
      ].filter((f): f is string => !!f),

      notDone: [
        filterFeature ? `(${filterFeature})` : undefined,
        `(
          au.stage_status = '${stageStatusDoc.CHUA_HOAN_THANH}'
          OR (
            ISNULL(af.is_completed_doc, 0) = 1
            AND au.stage_status = '${stageStatusDoc.CHUA_XU_LY}'
          )
        )`,
        roomCondition,
      ].filter((f): f is string => !!f),
    };

    const where: string[] = typeFilters[type] ?? [];

    const whereClause = where.length
      ? ' WHERE ' + where.join(' AND ') + ' AND incomming_documents.status = 1'
      : ' WHERE incomming_documents.status = 1';

    // ── SQL ──────────────────────────────────────────────────────────
    const totalSql = `
      SELECT COUNT(*) AS total
      FROM ${this.dbname}.incomming_documents
      ${joinClause}
      ${whereClause}
    `;


    try {
      const request = pool.request();
      request.input('currentUserId', sql.NVarChar(100), userId);
      request.input('processFn', sql.NVarChar(255), String(processFn));

      const result = await request.query(totalSql);
      return { total: result.recordset[0]?.total ?? 0 };
    } catch (err: any) {
      this.logger.error(
        `[countDocumentsMainProcessDynamic] type=${type}, processFn=${processFn}, error=${err.message}`,
      );
      return { total: 0 };
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 2. Số đếm Tiếp nhận (Văn bản đến)
  // ════════════════════════════════════════════════════════════════
  async countDocumentsReceiveDynamic({
    type,
    userId,
    authorId,
    processFn,
    authority,
  }: {
    type: 'waiting' | 'submited';
    userId: string;
    authorId?: string;
    processFn: string;
    authority?: string;
  }): Promise<{ total: number }> {
    const ALLOWED_TYPES = ['waiting', 'submited'] as const;
    if (!type || !ALLOWED_TYPES.includes(type as any)) {
      return { total: 0 };
    }

    if (authority === 'true' && authorId) userId = authorId;

    const pool = await this.getPool();
    const where: string[] = [];

    const { featureManagement, receiverUnit } = await this.getListContext(userId, processFn, pool);

    const featureCriteria = featureManagement?.criteria ?? [];
    const { sql: filterFeature, joins: filterJoins } = buildDocumentCriteriaHelper(
      featureCriteria,
      'incomming_documents',
      featureManagement,
    );

    let joinClause = `
      LEFT JOIN ${this.dbname}.incomming_current_state af
        ON af.document_id = incomming_documents.document_id`;

    if (filterJoins) joinClause += ' ' + filterJoins;

    const receiverFilter = receiverUnit
      ? `(
          a.receiver = @currentUserId
          OR a.receiver = @receiverUnit
        )`
      : `(a.receiver = @currentUserId)`;

    const typeFilters: Record<typeof type, string[]> = {
      waiting: [
        filterFeature ? `(${filterFeature})` : undefined,
        `EXISTS (
          SELECT 1 FROM ${this.dbname}.incomming_assignment a
          WHERE a.document_id = incomming_documents.document_id
            AND a.stage_status = '${stageStatusDoc.CHUA_XU_LY}'
            AND (${receiverFilter})
            AND (a.role_process IS NULL OR a.role_process <> 'viewer')
        )`,
      ].filter((f): f is string => !!f),

      submited: [
        filterFeature ? `(${filterFeature})` : undefined,
        `(incomming_documents.status_code != '1')`,
        `EXISTS (
          SELECT 1 FROM ${this.dbname}.incomming_assignment a
          WHERE a.document_id = incomming_documents.document_id
            AND ( a.stage_status = '${stageStatusDoc.DA_XU_LY}' OR a.stage_status = '${stageStatusDoc.DA_PHAN_CONG}' )
            AND (${receiverFilter})
        )`,
        `(af.current_action_code IS NULL OR af.current_action_code NOT IN ('TAO_SAO_Y', 'TRINH_KY'))`,
      ].filter((f): f is string => !!f),
    };

    where.push(...typeFilters[type]);

    if (receiverUnit) {
      where.push(`(
        incomming_documents.receiver_unit = @receiverUnit
        OR (
          incomming_documents.parent_doc IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM ${this.dbname}.incomming_documents child
            WHERE child.parent_doc = incomming_documents.document_id
              AND child.receiver_unit = @receiverUnit
          )
        )
      )`);
    }

    let whereClause = where.length
      ? ' WHERE ' + where.join(' AND ') + ' AND incomming_documents.status = 1'
      : ' WHERE incomming_documents.status = 1';

    whereClause += ' AND abstract_note IS NOT NULL';

    const totalSql = `
      SELECT COUNT(*) AS total
      FROM ${this.dbname}.incomming_documents
      ${joinClause}
      ${whereClause}
    `;
    try {
      const request = pool.request();
      request.input('currentUserId', sql.NVarChar(100), userId);
      request.input('processFn', sql.NVarChar(255), String(processFn));
      if (receiverUnit) {
        request.input('receiverUnit', sql.NVarChar(100), String(receiverUnit));
      }

      const result = await request.query(totalSql);
      return { total: result.recordset[0]?.total ?? 0 };
    } catch (err: any) {
      this.logger.error(
        `[countDocumentsReceiveDynamic] type=${type}, processFn=${processFn}, error=${err.message}`,
      );
      return { total: 0 };
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 3. Số đếm Phối hợp (Văn bản đến)
  // ════════════════════════════════════════════════════════════════
  async countDocumentsImplementationDynamic({
    type,
    userId,
    receiverUnit,
    tab,
    processFn,
    room,
  }: {
    type?: 'waiting' | 'processed' | 'incompleted' | 'completed' | 'notComplete';
    userId: string;
    receiverUnit?: string | null;
    tab?: string;
    processFn: string;
    room?: string;
  }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const request = pool.request();

    request.input('currentUserId', userId);
    request.input('processFn', processFn);
    if (receiverUnit) request.input('receiverUnit', receiverUnit);

    const featureManagement = await this.featureManagementRepository.findOne({
      where: { code: processFn, status: 1 },
    });

    // Chỉ dùng feature criteria (hard filters)
    const featureCriteria = (featureManagement as any)?.criteria ?? [];
    const { sql: filterFeature, joins: filterJoins, filterCondition } = buildDocumentCriteriaHelper(
      featureCriteria,
      'incomming_documents',
      featureManagement,
    );

    const USER_FLOW_TYPES = ['waiting', 'processed', 'notComplete', 'notDone'] as const;
    const DOC_FLOW_TYPES = ['incompleted', 'completed'] as const;
    const isUserFlow = USER_FLOW_TYPES.includes(type as any);
    const isDocFlow = DOC_FLOW_TYPES.includes(type as any);

    const roleProcess = tab ?? 'supporter';

    let joinClause = ` LEFT JOIN ${this.dbname}.incomming_current_state af
      ON af.document_id = incomming_documents.document_id`;

    joinClause += ` OUTER APPLY (
      SELECT TOP 1 assignment_type as assignmentType
      FROM ${this.dbname}.audit
      WHERE document_id = incomming_documents.document_id
        AND assignment_type IS NOT NULL
      ORDER BY id DESC
    ) ap`;

    if (isUserFlow) {
      joinClause += ` INNER JOIN ${this.dbname}.incomming_assignment au
        ON au.document_id = incomming_documents.document_id
       AND au.receiver = @currentUserId
       AND au.role_process = '${roleProcess}'`;
    }

    if (isDocFlow) {
      joinClause += ` INNER JOIN ${this.dbname}.incomming_current_state ad
        ON ad.document_id = incomming_documents.document_id`;
    }

    if (filterJoins) {
      joinClause += ' ' + filterJoins;
    }

    const where: string[] = [];

    const isRoomFilter = room === 'true' ? 'ONLY_ROOM' : room === 'false' ? 'ONLY_PERSONAL' : 'ALL';
    const roomCondition = isRoomFilter === 'ONLY_ROOM'
      ? `(af.is_transfer_to_room = 1)`
      : isRoomFilter === 'ONLY_PERSONAL'
        ? `(af.is_transfer_to_room = 0 OR af.is_transfer_to_room IS NULL)`
        : '';

    const excludeCompletedDoc = `ISNULL(af.is_completed_doc, 0) = 0`;

    const typeFilters: Record<string, Array<string | undefined>> = {
      waiting: [
        filterFeature ? `(${filterFeature})` : undefined,
        `((au.stage_status = '${stageStatusDoc.CHUA_XU_LY}') OR (au.stage_status = '${stageStatusDoc.CHUA_HOAN_THANH}' AND au.deadline IS NOT NULL AND au.deadline >= GETDATE()))`,
        `ISNULL(af.is_completed_doc, 0) = 0`,
        roomCondition || undefined,
      ],
      processed: [
        filterCondition ? `(${filterCondition})` : undefined,
        `(au.stage_status = '${stageStatusDoc.DA_XU_LY}' OR au.stage_status = '${stageStatusDoc.HOAN_THANH}')`,
        excludeCompletedDoc,
        `NOT (
          ISNULL(ap.assignmentType, '') = 'VAN_THU' 
          AND (
            au.stage_status = '${stageStatusDoc.HOAN_THANH}'
            OR
            (
              au.stage_status = '${stageStatusDoc.DA_XU_LY}'
              AND NOT EXISTS (
                SELECT 1 
                FROM ${this.dbname}.audit a 
                INNER JOIN ${this.dbname}.incomming_assignment ia 
                  ON ia.document_id = a.document_id AND ia.receiver = a.receiver
                WHERE a.document_id = incomming_documents.document_id 
                  AND (a.user_id = @currentUserId OR a.created_by = @currentUserId OR a.acting_as = @currentUserId)
                  AND ia.stage_status NOT IN ('DA_XU_LY', 'HOAN_THANH')
              )
            )
          )
        )`,
        roomCondition || undefined,
      ],
      incompleted: [
        filterFeature ? `(${filterFeature})` : undefined,
        excludeCompletedDoc,
        `(ad.current_stage_status = '${stageStatusDoc.HOAN_THANH}')`,
        `EXISTS (SELECT 1 FROM ${this.dbname}.incomming_assignment ia WHERE ia.document_id = incomming_documents.document_id AND ia.receiver = @currentUserId AND ia.role_process = 'supporter')`,
        roomCondition || undefined,
      ],
      notDone: [
        filterFeature ? `(${filterFeature})` : undefined,
        `(
          au.stage_status = '${stageStatusDoc.CHUA_HOAN_THANH}'
          OR (
            ISNULL(af.is_completed_doc, 0) = 1
            AND au.stage_status = '${stageStatusDoc.CHUA_XU_LY}'
          )
        )`,
        roomCondition || undefined,
      ],
      completed: [
        filterFeature ? `(${filterFeature})` : undefined,
        `(
          (
            (ad.current_stage_status = '${stageStatusDoc.HOAN_THANH_VAN_BAN}' OR ad.current_stage_status = '${stageStatusDoc.HOAN_THANH}')
            AND EXISTS (
              SELECT 1 FROM ${this.dbname}.incomming_assignment ia_chk
              WHERE ia_chk.document_id = incomming_documents.document_id
                AND ia_chk.receiver = @currentUserId
                AND ia_chk.role_process = 'supporter'
                AND ia_chk.stage_status IN ('DA_XU_LY', 'HOAN_THANH')
            )
          )
          OR
          (
            ISNULL(ap.assignmentType, '') = 'VAN_THU' AND EXISTS (
              SELECT 1 FROM ${this.dbname}.incomming_assignment ia
              WHERE ia.document_id = incomming_documents.document_id
                AND ia.receiver = @currentUserId
                AND ia.role_process = 'supporter'
                AND ia.stage_status IN ('DA_XU_LY', 'HOAN_THANH')
            ) AND (
              ad.current_stage_status = '${stageStatusDoc.HOAN_THANH_VAN_BAN}'
              OR
              NOT EXISTS (
                SELECT 1 
                FROM ${this.dbname}.audit a 
                INNER JOIN ${this.dbname}.incomming_assignment ia 
                  ON ia.document_id = a.document_id AND ia.receiver = a.receiver
                WHERE a.document_id = incomming_documents.document_id 
                  AND (a.user_id = @currentUserId OR a.created_by = @currentUserId OR a.acting_as = @currentUserId)
                  AND ia.stage_status NOT IN ('DA_XU_LY', 'HOAN_THANH')
              )
            )
          )
          OR
          (
            ISNULL(ap.assignmentType, '') IN ('TRUONG_PHONG', 'TRINH_LANH_DAO') AND EXISTS (
              SELECT 1 FROM ${this.dbname}.incomming_assignment ia
              WHERE ia.document_id = incomming_documents.document_id
                AND ia.receiver = @currentUserId
                AND ia.role_process = 'supporter'
                AND ia.stage_status IN ('DA_XU_LY', 'HOAN_THANH', 'DA_PHAN_CONG')
            ) AND (
              ad.current_stage_status = '${stageStatusDoc.HOAN_THANH_VAN_BAN}'
              OR ad.is_completed_doc = 1
              OR
              EXISTS (
                SELECT 1 FROM ${this.dbname}.incomming_assignment ia_tp
                WHERE ia_tp.document_id = incomming_documents.document_id
                  AND ia_tp.receiver = (
                    SELECT TOP 1 a.receiver FROM ${this.dbname}.audit a
                    WHERE a.document_id = incomming_documents.document_id
                      AND a.action_code = 'CHUYEN_XU_LY_PHAN_CONG'
                    ORDER BY a.id DESC
                  )
                  AND ia_tp.stage_status = '${stageStatusDoc.HOAN_THANH}'
              )
            )
          )
        )`,
        `EXISTS (SELECT 1 FROM ${this.dbname}.incomming_assignment ia WHERE ia.document_id = incomming_documents.document_id AND ia.receiver = @currentUserId AND ia.role_process = 'supporter')`,
        roomCondition || undefined,
      ],
      notComplete: [
        filterFeature ? `(${filterFeature})` : undefined,
        `(au.stage_status = '${stageStatusDoc.CHUA_XU_LY}')`,
        `ISNULL(af.is_completed_doc, 0) = 1`,
        `au.deadline IS NOT NULL AND au.deadline < GETDATE()`,
        roomCondition || undefined,
      ],
    };

    if (type && typeFilters[type]) {
      const typeParts = typeFilters[type].filter((f): f is string => !!f);
      where.push(...typeParts);
    }

    const whereClause = where.length
      ? `WHERE ${where.join(' AND ')} AND incomming_documents.status = 1`
      : `WHERE incomming_documents.status = 1`;

    const countSql = `
    SELECT COUNT(DISTINCT incomming_documents.document_id) AS total
    FROM incomming_documents
    ${joinClause}
    ${whereClause}
    `;


    try {
      const result = await request.query(countSql);
      const total = result.recordset[0]?.total ?? 0;
      return { total };
    } catch (err: any) {
      console.error(`[SQL ERROR] countDocumentsImplementationDynamic:`, err.message);
      throw err;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 4. Số đếm Nhận để biết (Văn bản đến)
  // ════════════════════════════════════════════════════════════════
  async countDocumentsViewerDynamic({
    type,
    userId,
    authorId,
    authority,
    tab,
    processFn,
  }: {
    type?: string;
    userId: string;
    authorId?: string;
    authority?: string;
    tab?: string;
    filter?: any;
    processFn: string;
  }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const request = pool.request();
    const where: string[] = [];

    if (authority === 'true' && authorId) {
      userId = authorId;
    }
    request.input('currentUserId', userId);
    request.input('processFn', processFn);

    const featureManagement = await this.featureManagementRepository.findOne({
      where: { code: processFn, status: 1 },
    });

    // Chỉ dùng filter cứng từ processFn
    const featureCriteria = (featureManagement as any)?.criteria ?? [];
    const { sql: filterFeature, joins: filterJoins } = this.buildCriteriaString(
      featureCriteria,
      'incomming_documents',
      featureManagement,
    );

    const roleProcess = tab ?? 'viewer';

    let joinClause = `
      INNER JOIN ${this.dbname}.incomming_assignment audit
        ON audit.document_id = incomming_documents.document_id
       AND audit.role_process = '${roleProcess}'
       AND audit.receiver = @currentUserId `;

    if (filterJoins) {
      joinClause += ' ' + filterJoins;
    }

    const typeFilters: Record<string, string[]> = {
      waiting: [
        filterFeature ? `(${filterFeature})` : undefined,
        `( audit.stage_status = '${stageStatusDoc.CHUA_XU_LY}' )`,
      ].filter((f): f is string => !!f),

      processed: [
        filterFeature ? `(${filterFeature})` : undefined,
        `( audit.stage_status = '${stageStatusDoc.DA_XEM}' 
        OR audit.stage_status = '${stageStatusDoc.DA_XU_LY}' )`,
      ].filter((f): f is string => !!f),
    };

    if (type && typeFilters[type]) {
      where.push(...typeFilters[type]);
    }

    let whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';
    if (where.length) {
      whereClause += ` AND incomming_documents.status = 1`;
    } else {
      whereClause = ` WHERE incomming_documents.status = 1`;
    }

    const countSql = this.optimizeCountQuery('incomming_documents', joinClause, whereClause);

    try {
      const result = await request.query(countSql);
      return { total: result.recordset[0]?.total ?? 0 };
    } catch (err: any) {
      console.error(`[SQL ERROR] countDocumentsViewerDynamic:`, err.message);
      throw err;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 5. Số đếm Phúc đáp
  // ════════════════════════════════════════════════════════════════
  async countDocumentsReplyDynamic({
    userId,
    authorId,
    authority,
    filter,
    processFn,
  }: {
    userId: string;
    authorId?: string;
    authority?: string;
    filter?: any;
    processFn: string;
  }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const request = pool.request();
    const where: string[] = [];

    if (authority === 'true' && authorId) userId = authorId;

    request.input('currentUserId', userId);
    request.input('processFn', processFn);

    const featureManagement = await this.featureManagementRepository.findOne({
      where: { code: processFn, status: 1, statusFeature: StatusFeature.ACTIVE },
    });

    const userRes = await pool.request()
      .input('currentUserId', userId)
      .query(`SELECT parent AS parentId FROM ${this.dbname}.users WHERE id = @currentUserId`);
    const receiverUnit = userRes.recordset[0]?.parentId || null;
    if (receiverUnit) {
      request.input('receiverUnit', receiverUnit);
    }

    // Process hard filters exclusively
    const featureCriteria = (featureManagement as any)?.criteria ?? [];
    const { sql: filterFeature, joins: filterJoins } = buildDocumentCriteriaReplyEvictHelper(
      featureCriteria,
      'incomming_documents',
      featureManagement,
      ['abstractNote', 'toBook']
    );

    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    where.push(`
      EXISTS (
        SELECT 1
        FROM ${this.dbname}.audit a
        WHERE a.document_id = incomming_documents.document_id
          AND (
            a.user_id = @currentUserId
            OR a.created_by = @currentUserId
            OR a.receiver = @currentUserId
            ${receiverUnit ? `OR a.receiver_unit = @receiverUnit OR a.receiver = @receiverUnit` : ''}
          )
      )
    `);

    where.push(`incomming_documents.status = 1`);

    let joinClause = '';
    if (filter?.isStar === '1' || filter?.isStar === 'true' || filter?.isStar === true) {
      joinClause += ` INNER JOIN document_star ds ON ds.document_id = incomming_documents.document_id AND ds.user_id = @currentUserId AND ds.step = @processFn `;
    } else if (filter?.isStar === '0' || filter?.isStar === 'false' || filter?.isStar === false) {
      where.push(` NOT EXISTS ( SELECT 1 FROM document_star ds WHERE ds.document_id = incomming_documents.document_id AND ds.user_id = @currentUserId AND ds.step = @processFn ) `);
    }

    if (filterJoins) {
      joinClause += ' ' + filterJoins;
    }

    const whereClause = where.length ? ' WHERE ' + where.join(' AND ') : ' WHERE incomming_documents.status = 1';

    const countSql = this.optimizeCountQuery('incomming_documents', joinClause, whereClause);



    try {
      const result = await request.query(countSql);
      return { total: result.recordset[0]?.total ?? 0 };
    } catch (err: any) {
      console.error(`[SQL ERROR] countDocumentsReplyDynamic:`, err.message);
      throw err;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 6. Số đếm Trình ký (Văn bản đi)
  // ════════════════════════════════════════════════════════════════
  async countOutgoingDocumentsSignerProcessDynamic({
    type,
    userId,
    authorId,
    authority,
    filter,
    processFn,
  }: {
    type?: string;
    userId: string;
    authorId?: string;
    authority?: string;
    filter?: any;
    processFn: string;
  }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const request = pool.request();
    const where: string[] = [];

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    request.input('currentUserId', userId);
    request.input('processFn', processFn);

    const featureManagement = await this.featureManagementRepository.findOne({
      where: { code: processFn, status: 1, statusFeature: StatusFeature.ACTIVE },
    });

    const userRes = await pool.request()
      .input('currentUserId', userId)
      .query(`SELECT parent AS parentId FROM ${this.dbname}.users WHERE id = @currentUserId`);
    const receiverUnit = userRes.recordset[0]?.parentId || null;
    if (receiverUnit) {
      request.input('receiverUnit', receiverUnit);
    }

    // Combine feature hard filters and dynamic filters
    const criteria = this.buildCriteria(filter);
    const featureCriteria = (featureManagement as any)?.criteria ?? [];

    const dateKeysList = ['createdAt', 'created_at', 'documentDate', 'document_date', 'releaseDate', 'release_date', 'updatedAt', 'updated_at'];
    const hasDateFilter = [...featureCriteria, ...criteria].some(c => dateKeysList.includes(c.name));
    if (!hasDateFilter) {
      const currentYear = new Date().getFullYear();
      criteria.push({
        name: 'createdAt',
        operator: 'between',
        value: [`${currentYear}-01-01`, `${currentYear}-12-31`]
      });
    }

    const { sql: filterFeature, joins: filterJoins } = buildDocumentCriteriaHelper(
      [...featureCriteria, ...criteria],
      'outgoing_documents',
      featureManagement,
    );

    const safeType = type ?? 'draft';
    const auditOrderByByType: Record<string, string> = {
      draft: `CASE WHEN a.stage_status = '${stageStatusDoc.CHUA_XU_LY}' THEN 1 ELSE 99 END`,
      signed: `CASE WHEN a.stage_status = '${stageStatusDoc.DONG_Y_VBDT}' THEN 1 WHEN a.stage_status = '${stageStatusDoc.DA_XU_LY}' THEN 2 ELSE 99 END`,
      pending_publication: `CASE WHEN a.stage_status = '${stageStatusDoc.HT_VBTT}' THEN 1 ELSE 99 END`,
      published: `CASE WHEN a.stage_status = '${stageStatusDoc.DA_BAN_HANH}' THEN 1 ELSE 99 END`
    };

    const auditOrderBy = auditOrderByByType[safeType] ?? ` CASE WHEN a.id IS NOT NULL THEN 1 ELSE 99 END `;

    let joinClause = `
      CROSS APPLY (
        SELECT TOP 1 a.document_id, a.receiver, a.receiver_unit, a.stage_status, a.action_code, a.created_by
        FROM ${this.dbname}.audit a
        WHERE a.document_id = outgoing_documents.document_id
          AND (
            a.receiver = @currentUserId
            OR a.created_by = @currentUserId
            ${receiverUnit ? `OR a.receiver = @receiverUnit OR a.receiver_unit = @receiverUnit` : ''} 
          )
        ORDER BY
          ${auditOrderBy},
          a.id DESC
      ) audit
      CROSS APPLY (
        SELECT TOP 1
          a.stage_status,
          a.action_code
        FROM ${this.dbname}.audit a
        WHERE a.document_id = outgoing_documents.document_id
        ORDER BY a.id DESC
      ) last_audit`;

    const excludeSignedDoc = `
      NOT EXISTS (
        SELECT 1
        FROM ${this.dbname}.audit a_end
        WHERE a_end.document_id = outgoing_documents.document_id
          AND a_end.stage_status IN ( '${stageStatusDoc.DA_BAN_HANH}' )
      ) `;

    const excludePendingPublicationDoc = `
      NOT EXISTS (
        SELECT 1
        FROM ${this.dbname}.audit a_end
        WHERE a_end.document_id = outgoing_documents.document_id
          AND a_end.stage_status IN ( '${stageStatusDoc.DA_BAN_HANH}' )
      ) `;

    const creatorFilter = `
      (
        EXISTS (
          SELECT 1
          FROM ${this.dbname}.audit a_create
          WHERE a_create.document_id = outgoing_documents.document_id
            AND a_create.action_code IN ('CREATE', 'LUAN_CHUYEN_VAN_BAN_DI')
            AND (
              a_create.receiver = @currentUserId
              OR a_create.created_by = @currentUserId
              OR a_create.user_id = @currentUserId
            )
        )
        OR outgoing_documents.drafter = @currentUserId
      )
    `;

    if (filterJoins) {
      joinClause += ' ' + filterJoins;
    }

    // Văn bản có sao
    if (filter?.isStar === '1' || filter?.isStar === 'true' || filter?.isStar === true) {
      where.push(`EXISTS ( SELECT 1 FROM ${this.dbname}.document_star ds WHERE ds.document_id = outgoing_documents.document_id AND ds.user_id = @currentUserId AND ds.step = @processFn )`);
    } else if (filter?.isStar === '0' || filter?.isStar === 'false' || filter?.isStar === false) {
      where.push(`NOT EXISTS ( SELECT 1 FROM ${this.dbname}.document_star ds WHERE ds.document_id = outgoing_documents.document_id AND ds.user_id = @currentUserId AND ds.step = @processFn )`);
    }

    // Nếu có filter deadline_reply, chỉ lấy văn bản có deadline_reply NOT NULL
    const hasDeadlineReplyFilter = filter && typeof filter === 'object' && (
      Object.prototype.hasOwnProperty.call(filter, 'deadline_reply') ||
      Object.prototype.hasOwnProperty.call(filter, 'deadlineReply')
    );
    if (hasDeadlineReplyFilter) {
      where.push(` outgoing_documents.deadline_reply IS NOT NULL `);
    }

    // Luôn loại bỏ văn bản chưa có nội dung trích yếu (NULL, rỗng hoặc chuỗi 'null').
    where.push(` NULLIF(LTRIM(RTRIM(CONVERT(NVARCHAR(MAX), outgoing_documents.abstract_note))), '') IS NOT NULL `);
where.push(` UPPER(LTRIM(RTRIM(CONVERT(NVARCHAR(MAX), outgoing_documents.abstract_note)))) <> 'NULL' `);

    const pendingPubStatuses = [
      stageStatusDoc.HT_VBTT,
      stageStatusDoc.DE_NGHI_BH,
      stageStatusDoc.DONG_Y_VBDT,
      stageStatusDoc.BAN_HANH_TO_TRINH,
      stageStatusDoc.CHUA_XU_LY,
      'CAN_CHO_SO',
      stageStatusDoc.CHO_SO,
      stageStatusDoc.DA_CHO_SO,
      stageStatusDoc.KY_SO,
      stageStatusDoc.KY_PHAT_HANH,
      'CHO_PHAT_HANH',
      'CHO_BAN_HANH',
      'PENDING_PUBLICATION',
      'CHO_PHAT_HANH_VAN_BAN',
      'DONG_Y_DU_THAO',
      'DONG_Y_PHE_DUYET',
    ].filter(Boolean);
    const pendingPubInSql = pendingPubStatuses.map(s => `'${s}'`).join(',');

    const typeFilters: Record<string, string[]> = {
      // Old:
      // draft: [
      //   filterFeature ? `(${filterFeature})` : undefined,
      //   `( audit.stage_status = '${stageStatusDoc.CHUA_XU_LY}'
      //     OR (audit.stage_status = '${stageStatusDoc.TRA_LAI}' AND last_audit.action_code = '${stageStatusDoc.TRA_LAI}') )`,
      // ].filter((f): f is string => !!f),
      draft: [
        filterFeature ? `(${filterFeature})` : undefined,
        `outgoing_documents.drafter = @currentUserId`, // Chỉ hiển thị dự thảo của chính người soạn thảo
        `( (audit.stage_status = '${stageStatusDoc.CHUA_XU_LY}' AND (audit.receiver = @currentUserId ${receiverUnit ? `OR audit.receiver = @receiverUnit OR audit.receiver_unit = @receiverUnit` : ''}))
          OR (audit.stage_status = '${stageStatusDoc.TRA_LAI}' AND last_audit.action_code = '${stageStatusDoc.TRA_LAI}') )`,
      ].filter((f): f is string => !!f),
      signed: [
        filterFeature ? `(${filterFeature})` : undefined,
        `EXISTS (
          SELECT 1
          FROM ${this.dbname}.audit a1
          WHERE a1.document_id = outgoing_documents.document_id
            AND ISNULL(a1.action_code, '') <> 'CREATE'
            AND (a1.receiver = @currentUserId OR a1.processed_by = @currentUserId OR a1.created_by = @currentUserId OR a1.user_id = @currentUserId)
            AND (
              a1.stage_status IN ('${stageStatusDoc.DA_XU_LY}', '${stageStatusDoc.HOAN_THANH_LUAN_CHUYEN}', '${stageStatusDoc.TRA_LAI}', '${stageStatusDoc.DONG_Y_VBDT}', '${stageStatusDoc.HT_VBTT}', '${stageStatusDoc.DE_NGHI_BH}', 'CHO_DONG_DAU', 'DA_DONG_DAU')
              OR a1.action_code IN ('TRA_LAI', 'LUAN_CHUYEN_VAN_BAN_DI', 'DONG_Y_VBDT', 'DE_NGHI_BH', 'DONG_DAU', 'DA_DONG_DAU')
            )
        )`,
        excludeSignedDoc,
        creatorFilter,
      ].filter((f): f is string => !!f),

      pending_publication: [
        filterFeature ? `(${filterFeature})` : undefined,
        `(
          EXISTS (
            SELECT 1
            FROM ${this.dbname}.audit a
            WHERE a.document_id = outgoing_documents.document_id
              AND (
                a.created_by = @currentUserId
                OR a.receiver = @currentUserId
                OR a.user_id = @currentUserId
                ${receiverUnit ? `OR a.receiver_unit = @receiverUnit` : ''}
              )
          )
          OR outgoing_documents.drafter = @currentUserId
        )`,
        `EXISTS (
          SELECT 1
          FROM ${this.dbname}.audit a2
          WHERE a2.document_id = outgoing_documents.document_id
            AND (
              a2.stage_status IN (${pendingPubInSql})
              OR a2.action_code IN (${pendingPubInSql})
            )
        )`,
        excludePendingPublicationDoc,
        creatorFilter,
      ].filter((f): f is string => !!f),

      published: [
        filterFeature ? `(${filterFeature})` : undefined,
        `EXISTS (
          SELECT 1
          FROM ${this.dbname}.audit a
          WHERE a.document_id = outgoing_documents.document_id
            AND a.stage_status = '${stageStatusDoc.DA_BAN_HANH}'
        )`,
        `EXISTS (
          SELECT 1
          FROM ${this.dbname}.audit a2
          WHERE a2.document_id = outgoing_documents.document_id
            AND (
              a2.created_by = @currentUserId
              OR a2.receiver = @currentUserId
              ${receiverUnit ? `OR a2.receiver_unit = @receiverUnit` : ''}
            )
        )`,
        creatorFilter,
      ].filter((f): f is string => !!f),
    };

    if (type && typeFilters[type]) {
      where.push(...typeFilters[type]);
    }

    let whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';
    if (where.length) {
      whereClause += ` AND outgoing_documents.status = 1`;
    } else {
      whereClause = ` WHERE outgoing_documents.status = 1`;
    }

    const countSql = this.optimizeCountQuery('outgoing_documents', joinClause, whereClause);


    try {
      const result = await request.query(countSql);
      const total = result.recordset[0]?.total ?? 0;
      return { total };
    } catch (err: any) {
      console.error(`[SQL ERROR] countOutgoingDocumentsSignerProcessDynamic:`, err.message);
      throw err;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 7. Số đếm Nhận để biết (Văn bản đi)
  // ════════════════════════════════════════════════════════════════
  async countOutgoingDocumentsViewerDynamic({
    type,
    userId,
    authorId,
    authority,
    filter,
    processFn,
  }: {
    type?: string;
    userId: string;
    authorId?: string;
    authority?: string;
    filter?: any;
    processFn: string;
  }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const request = pool.request();
    const where: string[] = [];

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    request.input('currentUserId', userId);
    request.input('processFn', processFn);

    const [featureManagement, userRes, userGroupRes] = await Promise.all([
      this.featureManagementRepository.findOne({
        where: { code: processFn, status: 1, statusFeature: StatusFeature.ACTIVE },
      }),
      pool.request()
        .input('currentUserId', userId)
        .query(`SELECT parent AS parentId FROM ${this.dbname}.users WHERE id = @currentUserId`),
      pool.request()
        .input('userId', userId)
        .query(`SELECT group_user_id FROM ${this.dbname}.user_group_users WHERE user_id = @userId`),
    ]);

    const receiverUnit = userRes.recordset[0]?.parentId || null;
    if (receiverUnit) {
      request.input('receiverUnit', receiverUnit);
    }

    const userGroupIds: string[] = (userGroupRes.recordset || [])
      .map((r: any) => r?.group_user_id)
      .filter((id: any): id is string => typeof id === 'string' && id.trim().length > 0);

    const criteria = this.buildCriteria(filter);
    const featureCriteria = (featureManagement as any)?.criteria ?? [];
    const { sql: filterFeature, joins: filterJoins } = buildDocumentCriteriaHelper(
      [...featureCriteria, ...criteria],
      'outgoing_documents',
      featureManagement,
    );

    let joinClause = `
      INNER JOIN ${this.dbname}.outgoing_current_state ocs
        ON ocs.document_id = outgoing_documents.document_id`;

    const hasDeadlineReplyFilter = filter && typeof filter === 'object' && (
      Object.prototype.hasOwnProperty.call(filter, 'deadline_reply') ||
      Object.prototype.hasOwnProperty.call(filter, 'deadlineReply')
    );
    if (hasDeadlineReplyFilter) {
      where.push(`outgoing_documents.deadline_reply IS NOT NULL`);
    }

    if (filterJoins) {
      joinClause += ' ' + filterJoins;
    }

    const wrapSqlString = (v: any) => `'${String(v).replace(/'/g, "''")}'`;

    const groupViewerCondition: string | null = userGroupIds.length > 0
      ? `(
          ISJSON(outgoing_documents.document_viewer_groups) = 1
          AND EXISTS (
            SELECT 1
            FROM OPENJSON(outgoing_documents.document_viewer_groups)
            WHERE value IN (${userGroupIds.map(wrapSqlString).join(', ')})
          )
        )`
      : null;

    const isKnowToKnowMenu = processFn === 'ChuaXuLyTP';
    const publishedFilter = isKnowToKnowMenu
      ? `EXISTS (
          SELECT 1 FROM (
              SELECT TOP 1 stage_status 
              FROM ${this.dbname}.audit a_sub 
              WHERE a_sub.document_id = outgoing_documents.document_id 
                AND a_sub.type_document = 'OutgoingDocument'
              ORDER BY a_sub.id DESC
          ) latest 
          WHERE latest.stage_status IN ( 'DA_DONG_DAU', 'DA_BAN_HANH' ) 
        )`
      : `(ocs.has_ban_hanh = 1 OR ocs.has_da_xu_ly = 1)`;

    const wrappedUserId = wrapSqlString(userId);

    const buildWaitingVisibility = (): string => {
      const base = `(
        outgoing_documents.know_receivers LIKE '%${String(userId).replace(/'/g, "''")}%'
        AND ISJSON(outgoing_documents.know_receivers) = 1
        AND EXISTS (
          SELECT 1
          FROM OPENJSON(outgoing_documents.know_receivers)
          WHERE value = ${wrappedUserId}
        )
      )`;
      return groupViewerCondition ? `(${base} OR ${groupViewerCondition})` : base;
    };

    const buildProcessedVisibility = (): string => {
      const base = `(
        ISJSON(outgoing_documents.vieweds) = 1
        AND EXISTS (
          SELECT 1
          FROM OPENJSON(outgoing_documents.vieweds)
          WHERE value = ${wrappedUserId}
        )
      )`;
      return base;
    };

    const typeFilters: Record<string, string[]> = {
      waiting: [
        filterFeature?.trim() ? `(${filterFeature})` : null,
        publishedFilter,
        buildWaitingVisibility(),
      ].filter((f): f is string => !!f),

      processed: [
        filterFeature?.trim() ? `(${filterFeature})` : null,
        publishedFilter,
        buildProcessedVisibility(),
      ].filter((f): f is string => !!f),
    };

    if (type && typeFilters[type]) {
      where.push(...typeFilters[type]);
    }

    where.push(`outgoing_documents.status = 1`);
    const whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';

    const countSql = this.optimizeCountQuery('outgoing_documents', joinClause, whereClause);

    try {
      const result = await request.query(countSql);
      const total = result.recordset[0]?.total ?? 0;
      return { total };
    } catch (err: any) {
      console.error(`[SQL ERROR] countOutgoingDocumentsViewerDynamic:`, err.message);
      throw err;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 8. Số đếm Ban hành (Văn bản đi)
  // ════════════════════════════════════════════════════════════════
  async countOutgoingDocumentsPromulgateDynamic({
    type,
    userId,
    authorId,
    authority,
    processFn,
  }: {
    type?: string;
    userId: string;
    authorId?: string;
    authority?: string;
    processFn: string;
  }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const request = pool.request();
    const where: string[] = [];

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    request.input('currentUserId', userId);
    request.input('processFn', processFn);

    const featureManagement = await this.featureManagementRepository.findOne({
      where: { code: processFn, status: 1 },
    });

    const userRes = await pool.request()
      .input('currentUserId', userId)
      .query(`SELECT parent AS parentId FROM ${this.dbname}.users WHERE id = @currentUserId`);
    const receiverUnit = userRes.recordset[0]?.parentId || null;
    if (receiverUnit) {
      request.input('receiverUnit', receiverUnit);
    }

    // Only Process Features (Hard filters)
    const featureCriteria = (featureManagement as any)?.criteria ?? [];
    const { sql: filterFeature, joins: filterJoins } = this.buildCriteriaString(
      featureCriteria,
      'outgoing_documents',
      featureManagement,
    );

    let joinClause = `
      INNER JOIN ${this.dbname}.outgoing_current_state ocs
        ON ocs.document_id = outgoing_documents.document_id `;

    if (filterJoins) {
      joinClause += ' ' + filterJoins;
    }

    const canViewDetailFilter = `EXISTS (
      SELECT 1
      FROM ${this.dbname}.audit a_perm
      WHERE a_perm.document_id = outgoing_documents.document_id
        AND (
          a_perm.user_id = '${userId}'
          OR a_perm.created_by = '${userId}'
          OR a_perm.receiver = '${userId}'
          ${receiverUnit ? `OR a_perm.receiver = '${receiverUnit}' OR a_perm.receiver_unit = '${receiverUnit}'` : ''}
        )
    )`;

    const typeFilters: Record<string, string[]> = {
      waiting: [
        filterFeature ? `(${filterFeature})` : undefined,
        `EXISTS (
          SELECT 1 FROM ${this.dbname}.outgoing_assignment oa
          WHERE oa.document_id = outgoing_documents.document_id
            AND (
              oa.receiver = '${userId}'
              ${receiverUnit ? `OR oa.receiver = '${receiverUnit}' OR oa.receiver = 'CAN_CHO_SO' OR oa.receiver_unit = '${receiverUnit}'` : ''}
            )
        )`,
        canViewDetailFilter,
        `( ocs.current_stage_status = '${stageStatusDoc.HT_VBTT}'
        OR ocs.current_stage_status = '${stageStatusDoc.BAN_HANH_TO_TRINH}'
        OR (ocs.current_stage_status = '${stageStatusDoc.CHUA_XU_LY}' AND ocs.current_action_code IN ('${stageStatusDoc.KY_SO}', '${stageStatusDoc.CHO_SO}', '${stageStatusDoc.DONG_Y_VBDT}', '${stageStatusDoc.KY_PHAT_HANH}'))
        OR ocs.current_stage_status = 'CAN_CHO_SO'
        OR ocs.current_stage_status = '${stageStatusDoc.DA_DONG_DAU}'
        OR ocs.current_stage_status = '${stageStatusDoc.DA_CHO_SO}'
        OR ocs.current_stage_status = '${stageStatusDoc.DA_KY_BAN_HANH}'
        OR ocs.current_stage_status = '${stageStatusDoc.DA_KY_NHAY}'
        OR ocs.current_stage_status = '${stageStatusDoc.DA_KY_CHINH_THUC_1}'
        OR ocs.current_stage_status = '${stageStatusDoc.DA_KY_CHINH_THUC_2}'
        OR ocs.current_stage_status = '${stageStatusDoc.DA_KY_CHINH_THUC_3}' )`,
        `ocs.has_ban_hanh = 0`,
      ].filter((f): f is string => !!f),

      processed: [
        filterFeature ? `(${filterFeature})` : undefined,
        `ocs.current_stage_status = '${stageStatusDoc.DA_BAN_HANH}'`,
        canViewDetailFilter,
        `EXISTS (
          SELECT 1
          FROM ${this.dbname}.outgoing_assignment oa2
          WHERE oa2.document_id = outgoing_documents.document_id
            AND (
              oa2.receiver = '${userId}'
              ${receiverUnit ? `OR oa2.receiver_unit = '${receiverUnit}'` : ''}
            )
        )`,
      ].filter((f): f is string => !!f),
    };

    if (type && typeFilters[type]) {
      where.push(...typeFilters[type]);
    }

    let whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';
    if (where.length) {
      whereClause += ` AND outgoing_documents.status = 1`;
    } else {
      whereClause = ` WHERE outgoing_documents.status = 1`;
    }

    // const countSql = this.optimizeCountQuery('outgoing_documents', joinClause, whereClause);
    const countSql = `SELECT COUNT(*) AS total FROM ${this.dbname}.outgoing_documents ${joinClause}${whereClause}`;

    try {
      const result = await request.query(countSql);
      const total = result.recordset[0]?.total ?? 0;
      return { total };
    } catch (err: any) {
      console.error(`[SQL ERROR] countOutgoingDocumentsPromulgateDynamic:`, err.message);
      throw err;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 9. Số đếm Xử lý (Văn bản đi)
  // ════════════════════════════════════════════════════════════════
  async countOutgoingDocumentsProcessDynamic({
    type,
    userId,
    authorId,
    authority,
    filter,
    processFn,
  }: {
    type?: string;
    userId: string;
    authorId?: string;
    authority?: string;
    filter?: any;
    processFn: string;
  }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const request = pool.request();
    const where: string[] = [];

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    request.input('currentUserId', userId);
    request.input('processFn', processFn);

    const featureManagement = await this.featureManagementRepository.findOne({
      where: { code: processFn, status: 1 },
    });

    const userRes = await pool.request()
      .input('currentUserId', userId)
      .query(`SELECT parent AS parentId FROM ${this.dbname}.users WHERE id = @currentUserId`);
    const receiverUnit = userRes.recordset[0]?.parentId || null;
    if (receiverUnit) {
      request.input('receiverUnit', receiverUnit);
    }

    // Only Hard Filters
    const featureCriteria = (featureManagement as any)?.criteria ?? [];
    const { sql: filterFeature, joins: filterJoins } = this.buildCriteriaString(
      featureCriteria,
      'outgoing_documents',
      featureManagement,
    );

    let joinClause = `
      INNER JOIN ${this.dbname}.outgoing_current_state ocs
        ON ocs.document_id = CAST(outgoing_documents.document_id AS NVARCHAR(50))
      LEFT JOIN ${this.dbname}.outgoing_assignment oa
        ON oa.document_id = CAST(outgoing_documents.document_id AS NVARCHAR(50))
        AND (
          oa.receiver = @currentUserId
          ${receiverUnit ? `OR oa.receiver = @receiverUnit OR oa.receiver_unit = @receiverUnit` : ''}
        )
      LEFT JOIN ${this.dbname}.work_items wi
        ON wi.document_id = CAST(outgoing_documents.document_id AS NVARCHAR(50))
        AND (
          wi.assignee_user_id = @currentUserId
          ${receiverUnit ? `OR wi.assignee_user_id = @receiverUnit` : ''}
        )
        AND wi.state = 'open'`;

    const excludeProcessedDoc = `ocs.has_ban_hanh = 0`;

    const receiverNotCreatorFilter = `
        oa.document_id IS NOT NULL
        AND ISNULL(oa.is_creator, 0) = 0
      `;

    if (filterJoins) {
      joinClause += ' ' + filterJoins;
    }

    // Văn bản có sao
    if (filter?.isStar === '1' || filter?.isStar === 'true' || filter?.isStar === true) {
      where.push(`EXISTS ( SELECT 1 FROM ${this.dbname}.document_star ds WHERE ds.document_id = CAST(outgoing_documents.document_id AS NVARCHAR(50)) AND ds.user_id = @currentUserId AND ds.step = @processFn )`);
    } else if (filter?.isStar === '0' || filter?.isStar === 'false' || filter?.isStar === false) {
      where.push(`NOT EXISTS ( SELECT 1 FROM ${this.dbname}.document_star ds WHERE ds.document_id = CAST(outgoing_documents.document_id AS NVARCHAR(50)) AND ds.user_id = @currentUserId AND ds.step = @processFn )`);
    }

    const typeFilters: Record<string, string[]> = {
      waiting: [
        filterFeature ? `(${filterFeature})` : undefined,
        `(oa.last_audit_id = ocs.last_audit_id OR wi.id IS NOT NULL)`,
        `( oa.stage_status = '${stageStatusDoc.HT_VBTT}'
        OR oa.stage_status = '${stageStatusDoc.CHUA_XU_LY}'
        OR oa.stage_status = '${stageStatusDoc.CHO_KY_NOI_DUNG}'
        OR oa.stage_status = '${stageStatusDoc.CHO_KY_THE_THUC}'
        OR oa.stage_status = '${stageStatusDoc.CHO_KY_BAN_HANH}'
        OR oa.stage_status = '${stageStatusDoc.CHO_KY_NHAY}'
        OR oa.stage_status = '${stageStatusDoc.CHO_KY_CHINH_THUC}'
        OR oa.stage_status = '${stageStatusDoc.CHO_KY_CHINH_THUC_1}'
        OR oa.stage_status = '${stageStatusDoc.CHO_KY_CHINH_THUC_2}'
        OR oa.stage_status = '${stageStatusDoc.CHO_KY_CHINH_THUC_3}'
        OR oa.stage_status = '${stageStatusDoc.CHO_XAC_NHAN}'
        OR oa.stage_status = '${stageStatusDoc.CHO_THAM_DINH}'
        OR oa.stage_status = '${stageStatusDoc.CHO_KY_DONG_DAU}'
        OR oa.stage_status = '${stageStatusDoc.CHO_DONG_DAU}'
        OR oa.stage_status = '${stageStatusDoc.THU_HOI}'
        )`,
        receiverNotCreatorFilter,
        `NOT (
          outgoing_documents.drafter = @currentUserId
          AND (
            ocs.current_stage_status IN ('${stageStatusDoc.TRA_LAI}', '${stageStatusDoc.THU_HOI}')
            OR ocs.current_action_code IN ('${stageStatusDoc.TRA_LAI}', '${stageStatusDoc.THU_HOI}', 'RECALL')
            OR oa.stage_status IN ('${stageStatusDoc.TRA_LAI}', '${stageStatusDoc.THU_HOI}')
          )
        )`,
      ].filter((f): f is string => !!f),

      processed: [
        filterFeature ? `(${filterFeature})` : undefined,
        `( oa.stage_status = '${stageStatusDoc.DA_XU_LY}'
        OR oa.stage_status = '${stageStatusDoc.DONG_Y_VBDT}'
        OR oa.stage_status = '${stageStatusDoc.DA_DONG_DAU}'
        )`,
        excludeProcessedDoc,
        receiverNotCreatorFilter,
      ].filter((f): f is string => !!f),

      published: [
        filterFeature ? `(${filterFeature})` : undefined,
        `ocs.has_ban_hanh = 1`,
        `EXISTS (
          SELECT 1
          FROM ${this.dbname}.outgoing_assignment oa2
          WHERE oa2.document_id = outgoing_documents.document_id
            AND (
              oa2.receiver = @currentUserId
              ${receiverUnit ? `OR oa2.receiver_unit = @receiverUnit` : ''}
            )
        )`,
      ].filter((f): f is string => !!f),

      stampedDoc: [
        filterFeature ? `(${filterFeature})` : undefined,
        `( oa.stage_status = '${stageStatusDoc.CHUA_XU_LY}' OR oa.stage_status = '${stageStatusDoc.CHO_DONG_DAU}' )`,
        receiverNotCreatorFilter,
      ].filter((f): f is string => !!f),
    };

    if (type && typeFilters[type]) {
      where.push(...typeFilters[type]);
    }

    let whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';
    if (where.length) {
      whereClause += ` AND outgoing_documents.status = 1`;
    } else {
      whereClause = ` WHERE outgoing_documents.status = 1`;
    }

    const countSql = this.optimizeCountQuery('outgoing_documents', joinClause, whereClause);

    try {
      const result = await request.query(countSql);
      const total = result.recordset[0]?.total ?? 0;
      return { total };
    } catch (err: any) {
      console.error(`[SQL ERROR] countOutgoingDocumentsProcessDynamic:`, err.message);
      throw err;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 9.1. Số đếm Chờ cho ý kiến (Văn bản đi)
  // ════════════════════════════════════════════════════════════════
  async countChoXuLyTPKTTT({
    userId,
    authorId,
    authority,
    filter,
    processFn,
  }: {
    userId: string;
    authorId?: string;
    authority?: string;
    filter?: any;
    processFn?: string;
  }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const request = pool.request();
    const where: string[] = [];

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const effectiveProcessFn = processFn || 'ChoXuLyTPKTTT';

    request.input('currentUserId', userId);
    request.input('processFn', effectiveProcessFn);

    const featureManagement = await this.featureManagementRepository.findOne({
      where: { code: effectiveProcessFn, status: 1 },
    });

    const userRes = await pool.request()
      .input('currentUserId', userId)
      .query(`SELECT parent AS parentId FROM ${this.dbname}.users WHERE id = @currentUserId`);
    const receiverUnit = userRes.recordset[0]?.parentId || null;
    if (receiverUnit) {
      request.input('receiverUnit', receiverUnit);
    }

    const featureCriteria = (featureManagement as any)?.criteria ?? [];
    const { sql: filterFeature, joins: filterJoins } = this.buildCriteriaString(
      featureCriteria,
      'outgoing_documents',
      featureManagement,
    );

    let joinClause = `
      INNER JOIN ${this.dbname}.outgoing_current_state ocs
        ON ocs.document_id = outgoing_documents.document_id
      LEFT JOIN ${this.dbname}.outgoing_assignment oa
        ON oa.document_id = outgoing_documents.document_id
        AND (
          oa.receiver = @currentUserId
          ${receiverUnit ? `OR oa.receiver = @receiverUnit OR oa.receiver_unit = @receiverUnit` : ''}
        )
      LEFT JOIN ${this.dbname}.work_items wi
        ON wi.document_id = outgoing_documents.document_id
        AND (
          wi.assignee_user_id = @currentUserId
          ${receiverUnit ? `OR wi.assignee_user_id = @receiverUnit` : ''}
        )
        AND wi.state = 'open'`;

    if (filterJoins) {
      joinClause += ' ' + filterJoins;
    }

    if (filter?.isStar === '1' || filter?.isStar === 'true' || filter?.isStar === true) {
      where.push(`EXISTS ( SELECT 1 FROM ${this.dbname}.document_star ds WHERE ds.document_id = outgoing_documents.document_id AND ds.user_id = @currentUserId AND ds.step = @processFn )`);
    } else if (filter?.isStar === '0' || filter?.isStar === 'false' || filter?.isStar === false) {
      where.push(`NOT EXISTS ( SELECT 1 FROM ${this.dbname}.document_star ds WHERE ds.document_id = outgoing_documents.document_id AND ds.user_id = @currentUserId AND ds.step = @processFn )`);
    }

    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    where.push(`(oa.last_audit_id = ocs.last_audit_id OR wi.id IS NOT NULL)`);
    where.push(`(
      oa.stage_status = '${stageStatusDoc.HT_VBTT}'
      OR oa.stage_status = '${stageStatusDoc.CHUA_XU_LY}'
      OR oa.stage_status = '${stageStatusDoc.CHO_KY_NOI_DUNG}'
      OR oa.stage_status = '${stageStatusDoc.CHO_KY_THE_THUC}'
      OR oa.stage_status = '${stageStatusDoc.CHO_KY_BAN_HANH}'
      OR oa.stage_status = '${stageStatusDoc.CHO_KY_NHAY}'
      OR oa.stage_status = '${stageStatusDoc.CHO_KY_CHINH_THUC}'
      OR oa.stage_status = '${stageStatusDoc.CHO_KY_CHINH_THUC_1}'
      OR oa.stage_status = '${stageStatusDoc.CHO_KY_CHINH_THUC_2}'
      OR oa.stage_status = '${stageStatusDoc.CHO_KY_CHINH_THUC_3}'
      OR oa.stage_status = '${stageStatusDoc.CHO_XAC_NHAN}'
      OR oa.stage_status = '${stageStatusDoc.CHO_THAM_DINH}'
      OR oa.stage_status = '${stageStatusDoc.CHO_KY_DONG_DAU}'
      OR oa.stage_status = '${stageStatusDoc.CHO_DONG_DAU}'
      OR oa.stage_status = '${stageStatusDoc.THU_HOI}'
    )`);
    where.push(`oa.document_id IS NOT NULL`);
    where.push(`ISNULL(oa.is_creator, 0) = 0`);
    // Logic cũ:
    // where.push(`ocs.current_action_code = 'TRINH_KIEM_TRA_TT'`);
    // where.push(`ocs.current_stage_status = 'CHUA_XU_LY'`);
    // Logic mới:
    where.push(`(
      (ocs.current_action_code = 'TRINH_KIEM_TRA_TT' AND ocs.current_stage_status = 'CHUA_XU_LY')
      OR (ocs.current_action_code IN ('TRINH_KY', 'TRINH_DUYET', 'LUAN_CHUYEN_VAN_BAN_DI', 'TRINH_KIEM_TRA_TT') AND ocs.current_stage_status = 'THU_HOI')
    )`);

    const countSql = `
      SELECT COUNT(DISTINCT outgoing_documents.document_id) AS total
      FROM ${this.dbname}.outgoing_documents
      ${joinClause}
      WHERE ${where.join(' AND ')}
        AND outgoing_documents.status = 1
    `;

    try {
      const result = await request.query(countSql);
      const total = result.recordset[0]?.total ?? 0;
      return { total };
    } catch (err: any) {
      console.error(`[SQL ERROR] countChoXuLyTPKTTT:`, err.message);
      throw err;
    }
  }

  async countOutgoingPendingFeedbacks({
    userId,
    authorId,
    authority
  }: {
    userId: string;
    authorId?: string;
    authority?: string;
  }): Promise<{ total: number }> {
    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const pool = await this.getPool();
    const req = pool.request();
    req.input('userId', userId);

    const where: string[] = [
      `JSON_QUERY(fr.commanders) IS NOT NULL`,
      `EXISTS (
      SELECT 1 FROM OPENJSON(fr.commanders) WHERE [value] = @userId
    )`,
      `(
      fr.commanders_status IS NULL OR
      JSON_VALUE(fr.commanders_status, CONCAT('$."', @userId, '"')) IS NULL OR
      (
        JSON_VALUE(fr.commanders_status, CONCAT('$."', @userId, '"')) != 'given'
        AND JSON_VALUE(fr.commanders_status, CONCAT('$."', @userId, '"')) != 'transferred'
      )
    )`,
      `fr.document_type = 'outgoing'`,
    ];

    const whereClause = 'WHERE ' + where.join(' AND ');

    const countSql = `
    WITH CTE AS (
      SELECT ROW_NUMBER() OVER (
        PARTITION BY fr.document_id
        ORDER BY fr.created_at DESC
      ) AS rn
      FROM feedback_requests fr
      LEFT JOIN outgoing_documents od
        ON fr.document_type = 'outgoing'
        AND fr.document_id = od.document_id
      LEFT JOIN incomming_documents idoc
        ON fr.document_type = 'incoming'
        AND CAST(fr.document_id AS NVARCHAR(255)) = idoc.document_id
      ${whereClause}
    )
    SELECT COUNT(*) AS total FROM CTE WHERE rn = 1
  `;

    try {
      const result = await req.query(countSql);
      return { total: result.recordset[0]?.total || 0 };
    } catch (err: any) {
      this.logger.error(`countOutgoingPendingFeedbacks error: ${err.message}`);
      throw err;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 9.2. Số đếm Đã cho ý kiến (Văn bản đi)
  // ════════════════════════════════════════════════════════════════
  async countOutgoingGivenFeedbacks({
    userId,
    authorId,
    authority
  }: {
    userId: string;
    authorId?: string;
    authority?: string;
  }): Promise<{ total: number }> {
    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const pool = await this.getPool();
    const req = pool.request();
    req.input('userId', userId);

    const where: string[] = [
      `JSON_VALUE(fr.commanders_status, CONCAT('$."', @userId, '"')) = 'given'`,
      `JSON_QUERY(fr.commanders) IS NOT NULL`,
      `fr.document_type = 'outgoing'`,
    ];

    const whereClause = 'WHERE ' + where.join(' AND ');

    const countSql = `
    WITH CTE AS (
      SELECT ROW_NUMBER() OVER (
        PARTITION BY fr.document_id
        ORDER BY fr.created_at DESC
      ) AS rn
      FROM feedback_requests fr
      LEFT JOIN outgoing_documents od
        ON fr.document_type = 'outgoing'
        AND fr.document_id = od.document_id
      LEFT JOIN incomming_documents idoc
        ON fr.document_type = 'incoming'
        AND CAST(fr.document_id AS NVARCHAR(255)) = idoc.document_id
      ${whereClause}
    )
    SELECT COUNT(*) AS total FROM CTE WHERE rn = 1
  `;

    try {
      const result = await req.query(countSql);
      return { total: result.recordset[0]?.total || 0 };
    } catch (err: any) {
      this.logger.error(`countOutgoingGivenFeedbacks error: ${err.message}`);
      throw err;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 9.3. Số đếm Đã xin ý kiến (Văn bản đi)
  // ════════════════════════════════════════════════════════════════
  async countOutgoingSentFeedbacks({
    userId,
    authorId,
    authority,
    type,
  }: {
    userId: string;
    authorId?: string;
    authority?: string;
    type?: string;
  }): Promise<{ total: number }> {
    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const pool = await this.getPool();
    const req = pool.request();
    req.input('employeeId', userId);

    const where: string[] = [`fr.employee_id = @employeeId`];

    if (type && type !== 'all') {
      where.push(`fr.document_type = @type`);
      req.input('type', type);
    }

    const whereClause = 'WHERE ' + where.join(' AND ');

    const countSql = `
    SELECT COUNT(*) AS total
    FROM feedback_requests fr
    LEFT JOIN outgoing_documents od
      ON fr.document_type = 'outgoing'
      AND fr.document_id = od.document_id
    LEFT JOIN incomming_documents idoc
      ON fr.document_type = 'incoming'
      AND CAST(fr.document_id AS NVARCHAR) = idoc.document_id
    ${whereClause}
  `;

    try {
      const result = await req.query(countSql);
      return { total: result.recordset[0]?.total || 0 };
    } catch (err: any) {
      this.logger.error(`countOutgoingSentFeedbacks error: ${err.message}`);
      throw err;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 9.4. Số đếm Đã được cho ý kiến (Văn bản đi)
  // ════════════════════════════════════════════════════════════════
  async countOutgoingCompletedFeedbacks({
    userId,
    authorId,
    authority,
    type,
  }: {
    userId: string;
    authorId?: string;
    authority?: string;
    type?: string;
  }): Promise<{ total: number }> {
    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const pool = await this.getPool();
    const req = pool.request();
    req.input('employeeId', userId);

    const where: string[] = [
      `fr.employee_id = @employeeId`,
      `fr.commanders_status IS NOT NULL`,
      `ISJSON(fr.commanders_status) = 1`,
      `(SELECT COUNT(*) FROM OPENJSON(fr.commanders_status) AS jt WHERE jt.[value] != 'given') = 0`,
    ];

    if (type && type !== 'all') {
      where.push(`fr.document_type = @type`);
      req.input('type', type);
    } else {
      where.push(`fr.document_type = 'outgoing'`);
    }

    const whereClause = 'WHERE ' + where.join(' AND ');

    const countSql = `
    SELECT COUNT(*) AS total
    FROM feedback_requests fr
    LEFT JOIN outgoing_documents od
      ON fr.document_type = 'outgoing'
      AND fr.document_id = od.document_id
    LEFT JOIN incomming_documents idoc
      ON fr.document_type = 'incoming'
      AND CAST(fr.document_id AS NVARCHAR(50)) = CAST(idoc.document_id AS NVARCHAR(50))
    ${whereClause}
  `;

    try {
      const result = await req.query(countSql);
      return { total: result.recordset[0]?.total || 0 };
    } catch (err: any) {
      this.logger.error(`countOutgoingCompletedFeedbacks error: ${err.message}`);
      throw err;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 9.5. Số đếm Đã chuyển cho ý kiến (Văn bản đi)
  // ════════════════════════════════════════════════════════════════
  async countOutgoingReceivedFeedbackRequests({
    userId,
    authorId,
    authority,
    type,
  }: {
    userId: string;
    authorId?: string;
    authority?: string;
    type?: string;
  }): Promise<{ total: number }> {
    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const pool = await this.getPool();
    const req = pool.request();
    req.input('employeeId', userId);

    const where: string[] = [
      `EXISTS (
      SELECT 1 FROM OPENJSON(fr.commanders_status) js
      WHERE js.[key] = @employeeId
    )`,
      `(
      SELECT js.value FROM OPENJSON(fr.commanders_status) js
      WHERE js.[key] = @employeeId
    ) = 'transferred'`,
    ];

    if (type && type !== 'all') {
      where.push(`fr.document_type = @type`);
      req.input('type', type);
    }

    const whereClause = 'WHERE ' + where.join(' AND ');

    const countSql = `
    SELECT COUNT(*) AS total
    FROM feedback_requests fr
    LEFT JOIN outgoing_documents od
      ON fr.document_type = 'outgoing'
      AND fr.document_id = od.document_id
    LEFT JOIN incomming_documents idoc
      ON fr.document_type = 'incoming'
      AND CAST(fr.document_id AS VARCHAR) = idoc.document_id
    ${whereClause}
  `;

    try {
      const result = await req.query(countSql);
      return { total: result.recordset[0]?.total || 0 };
    } catch (err: any) {
      this.logger.error(`countOutgoingReceivedFeedbackRequests error: ${err.message}`);
      throw err;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 10. Số đếm Công việc (Task)
  // ════════════════════════════════════════════════════════════════
  async countTaskDynamic({
    userId,
    tab,
    typeTask,
    status,
    filter,
    unitId,
    receiverUnit,
    isClerk,
    delegatedUnitIds,
  }: {
    userId: string;
    tab?: string;
    typeTask?: string;
    status?: number;
    filter?: any;
    unitId?: string;
    receiverUnit?: string;
    isClerk?: boolean;
    delegatedUnitIds?: string[];
  }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const request = pool.request();
    const where: string[] = [];

    const finalUnitId = unitId || receiverUnit;

    request.input('userId', userId);
    request.input('status', status ?? 1);
    request.input('typeTask', typeTask ?? 'general');

    // ===== ROLE =====
    const rolesQuery = await pool.request()
      .input('uid', userId)
      .query(`
      SELECT gu.code
      FROM group_users gu
      INNER JOIN user_group_users ugu ON ugu.group_user_id = gu.id
      WHERE ugu.user_id = @uid AND gu.status = 1
    `);

    const groupCodes = rolesQuery.recordset.map(r => r.code);
    const isDeptHead = groupCodes.includes(GROUP_CODES.TRUONG_PHONG) || groupCodes.includes(GROUP_CODES.PHO_TRUONG_PHONG);
    const isDivHead = groupCodes.includes(GROUP_CODES.TRUONG_BAN);
    const isManager = isDeptHead || isDivHead;

    const isClerkInternal = groupCodes.includes(GROUP_CODES.VAN_THU);
    const effectiveIsClerk = isClerk || isClerkInternal;

    // ===== PROJECT ACCESS =====
    let hasProjectAccess = false;
    const projectId = filter?.projectId;

    if (projectId && userId) {
      const pmRes = await pool.request()
        .input('pid', Number(projectId))
        .input('uid', userId)
        .query(`
        SELECT TOP 1 tu.id
        FROM ${this.dbname}.task_users tu
        INNER JOIN ${this.dbname}.task t ON t.id = tu.task_id
        WHERE t.project_id = @pid AND LOWER(tu.process_id) = LOWER(@uid)
      `);
      hasProjectAccess = !!pmRes.recordset?.length;
    }

    if (projectId) request.input('projectId', Number(projectId));

    // ===== PERMISSION (Optimized: Combine into sub-queries instead of large IN) =====
    const permissionClauses: string[] = [
      "t.created_by = @userId",
    ];

    // User Task Access (Personal + Clerk + Delegation)
    let userAccessSql = `
      EXISTS (
        SELECT 1 FROM ${this.dbname}.task_users tu
        WHERE tu.task_id = t.id
        AND (
          tu.process_id = @userId
    `;

    if (effectiveIsClerk && finalUnitId) {
      request.input('unitIdPermission', finalUnitId);
      userAccessSql += `
          OR (tu.process_id = @unitIdPermission AND tu.type = 2 AND NOT EXISTS (
            SELECT 1 FROM ${this.dbname}.task_assignment_configs tac 
            WHERE tac.unit_id = @unitIdPermission AND tac.status = 1
          ))
      `;
    }

    // 🔹 Delegation check (ALWAYS enabled to ensure consistency between Count and List APIs)
    userAccessSql += `
          OR (
            tu.type = 2 
            AND EXISTS (
              SELECT 1 FROM ${this.dbname}.task_assignment_configs tac 
              WHERE tac.unit_id = tu.process_id 
              AND tac.user_id = @userId 
              AND tac.status IN (1, 2)
              AND t.created_at >= tac.created_at
              AND (tac.status = 1 OR t.created_at <= tac.updated_at)
            )
          )
    `;

    userAccessSql += ` ) )`;
    permissionClauses.push(userAccessSql);

    // project
    if (projectId && hasProjectAccess) {
      permissionClauses.push("t.project_id = @projectId");
    }

    // manager
    if (isManager && finalUnitId) {
      request.input('managedUnitId', finalUnitId);

      permissionClauses.push(`
      (
        (t.is_confidential = 0 OR t.is_confidential IS NULL)
        AND EXISTS (
          SELECT 1 FROM task_users tu_m
          INNER JOIN users u_m ON u_m.id = tu_m.process_id
          WHERE tu_m.task_id = t.id
          AND tu_m.role IN ('director', 'supporter')
          AND u_m.parent = @managedUnitId
        )
      )
    `);
    }

    where.push(`(${permissionClauses.join(' OR ')})`);

    // ===== TAB =====
    const isSpecialTask = typeTask && typeTask !== 'general' && typeTask !== 'TaskGeneral';

    if (!isSpecialTask) {
      // Allow counting child tasks that the current user participates in (assigner/viewer/etc),
      // matching list API behavior (root tasks + visible child tasks).
      let visibleChildSql = `EXISTS (
        SELECT 1 FROM ${this.dbname}.task_users tu_root
        WHERE tu_root.task_id = t.id
        AND (
          LOWER(tu_root.process_id) = LOWER(@userId)
      `;

      if (effectiveIsClerk && finalUnitId) {
        // unitIdPermission already set above when used in permissionClauses
        visibleChildSql += `
          OR (tu_root.process_id = @unitIdPermission AND tu_root.type = 2 AND NOT EXISTS (
            SELECT 1 FROM ${this.dbname}.task_assignment_configs tac 
            WHERE tac.unit_id = @unitIdPermission AND tac.status = 1
          ))
        `;
      }

      visibleChildSql += `
          OR (
            tu_root.type = 2 
            AND EXISTS (
              SELECT 1 FROM ${this.dbname}.task_assignment_configs tac 
              WHERE tac.unit_id = tu_root.process_id 
              AND tac.user_id = @userId 
              AND tac.status IN (1, 2)
              AND t.created_at >= tac.created_at
              AND (tac.status = 1 OR t.created_at <= tac.updated_at)
            )
          )
        )
      )`;

      if (tab === 'REPEAT') {
        where.push("t.repetitive_task = 'co'");
      } else if (tab === 'DOCUMENT') {
        where.push("t.bpmn_id IS NOT NULL");
      } else if (tab === 'MEETING') {
        where.push("t.parent IS NOT NULL");
      } else {
        where.push(`(
          (t.repetitive_task = 'khong' OR t.repetitive_task IS NULL OR t.repetitive_task = '')
          AND t.bpmn_id IS NULL
          AND (t.parent IS NULL OR ${visibleChildSql})
        )`);
      }
    }

    // ===== STATUS =====
    where.push("t.status = @status");
    where.push("t.type_task = @typeTask");

    // ===== FILTER =====
    if (filter) {
      if (filter.overdueWork === true || filter.overdueWork === 'true') {
        where.push("t.end_date < GETDATE()");
        where.push("t.process_status != '4'");
      }

      const isMyAssign = filter.myAssign === true || filter.myAssign === 'true';
      const isMyDirector = filter.myDirector === true || filter.myDirector === 'true';
      const isMySupporter = filter.mySupporter === true || filter.mySupporter === 'true';

      if (isMyAssign || isMyDirector || isMySupporter) {
        const roles: string[] = [];
        if (isMyAssign) roles.push("'assigner'");
        if (isMyDirector) roles.push("'director'");
        if (isMySupporter) roles.push("'supporter'");

        where.push(`
          EXISTS (
            SELECT 1 FROM task_users tu_myRoles
            WHERE tu_myRoles.task_id = t.id
            AND LOWER(tu_myRoles.process_id) = LOWER(@userId)
            AND tu_myRoles.role IN (${roles.join(', ')})
          )
        `);
      }

      if (filter.myJob === true || filter.myJob === 'true') {
        where.push(`
        EXISTS (
          SELECT 1 FROM task_users tu_j
          WHERE tu_j.task_id = t.id
          AND LOWER(tu_j.process_id) = LOWER(@userId)
          AND tu_j.role IN ('director', 'supporter')
        )
      `);
      }

      if (filter.director) {
        let directorIds: string[] = [];
        if (Array.isArray(filter.director)) {
          directorIds = filter.director.map((d: any) => typeof d === 'object' ? d.processId : d).filter(Boolean);
        } else if (typeof filter.director === 'string') {
          directorIds = filter.director.split(',').map((s: string) => s.trim()).filter(Boolean);
        } else if (typeof filter.director === 'object' && filter.director.processId) {
          directorIds = [filter.director.processId];
        }

        if (directorIds.length > 0) {
          const paramsList: string[] = [];
          directorIds.forEach((id, idx) => {
            const paramName = `directorParam${idx}`;
            request.input(paramName, id);
            paramsList.push(`@${paramName}`);
          });
          where.push(`
            EXISTS (
              SELECT 1 FROM task_users tu_dir
              WHERE tu_dir.task_id = t.id
              AND tu_dir.role IN ('director', 'supporter')
              AND tu_dir.process_id IN (${paramsList.join(', ')})
            )
          `);
        }
      }

      if (filter.name) {
        request.input('filterName', `%${filter.name}%`);
        where.push("(t.name LIKE @filterName OR t.code LIKE @filterName)");
      }

      if (filter.priority) {
        request.input('priority', filter.priority);
        if (filter.priority === 'binhthuong') {
          where.push("(t.priority = @priority OR t.priority IS NULL OR t.priority = '')");
        } else {
          where.push("t.priority = @priority");
        }
      }

      if (filter.topic) {
        request.input('topic', filter.topic);
        where.push("t.topic = @topic");
      }

      if (filter.processStatus) {
        request.input('pStatus', filter.processStatus);
        where.push("t.process_status = @pStatus");
      }

      if (projectId && !hasProjectAccess) {
        where.push("t.project_id = @projectId");
      }
    }

    const whereSql = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';
    const countSql = `SELECT COUNT(DISTINCT t.id) as total FROM task t ${whereSql}`;

    try {
      const result = await request.query(countSql);
      return { total: result.recordset[0]?.total ?? 0 };
    } catch (err: any) {
      console.error(`[SQL ERROR] countTaskDynamic:`, err.message);
      throw err;
    }
  }

  /**
   * Lấy danh sách task IDs mà user có quyền xem (quyền từ role trong task_users)
   */
  async getTaskIdsByUserRole(
    userId: string,
    unitId?: string,
    isClerk?: boolean,
    delegatedUnitIds?: string[],
  ): Promise<number[]> {
    const pool = await this.getPool();
    const request = pool.request();
    request.input('userId', userId);

    const whereClauses: string[] = ["tu.process_id = @userId"];

    if (unitId && isClerk) {
      request.input('unitId', unitId);
      whereClauses.push(`(tu.process_id = @unitId AND tu.type = 2 AND NOT EXISTS (
        SELECT 1 FROM ${this.dbname}.task_assignment_configs tac 
        WHERE tac.unit_id = @unitId AND tac.status = 1
      ))`);
    }

    if (delegatedUnitIds && delegatedUnitIds.length > 0) {
      whereClauses.push(`(
        tu.type = 2 
        AND EXISTS (
          SELECT 1 FROM ${this.dbname}.task_assignment_configs tac 
          WHERE tac.unit_id = tu.process_id 
          AND tac.user_id = @userId 
          AND tac.status IN (1, 2)
          AND t.created_at >= tac.created_at
          AND (tac.status = 1 OR t.created_at <= tac.updated_at)
        )
      )`);
    }

    const sql = `
      SELECT DISTINCT tu.task_id as id
      FROM ${this.dbname}.task_users tu
      INNER JOIN ${this.dbname}.task t ON t.id = tu.task_id
      WHERE (${whereClauses.join(' OR ')})
    `;

    try {
      const res = await request.query(sql);
      return res.recordset.map(r => Number(r.id));
    } catch (err: any) {
      this.logger.error('getTaskIdsByUserRole error: ' + err.message);
      return [];
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 11. Số đếm Tiếp nhận (simple – không dynamic filter)
  // ════════════════════════════════════════════════════════════════
  async countDocumentsReceive({
    type,
    userId,
  }: {
    type: 'waiting' | 'submited';
    userId: string;
  }): Promise<number> {
    const pool = await this.getPool();
    const where: string[] = [];

    const userRes = await pool.request().query(
      `SELECT parent AS parentId FROM users WHERE id = '${userId}'`,
    );
    const receiverUnit = userRes.recordset[0]?.parentId || null;

    if (type === 'waiting') {
      where.push(`EXISTS (SELECT 1 FROM audit a WHERE a.document_id = incomming_documents.document_id AND (a.receiver = '${userId}'${receiverUnit ? ` OR a.receiver = '${receiverUnit}' OR a.receiver_unit = '${receiverUnit}'` : ''}) AND a.stage_status = '${stageStatusDoc.CHUA_XU_LY}')`);
    }
    if (type === 'submited') {
      where.push(`EXISTS (SELECT 1 FROM audit a WHERE a.document_id = incomming_documents.document_id AND (a.receiver = '${userId}' OR a.processed_by = '${userId}') AND a.stage_status = '${stageStatusDoc.DA_XU_LY}')`);
    }

    where.push(`incomming_documents.status = 1`);
    const whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';

    const rs = await pool.request().query(`
      SELECT COUNT_BIG(1) AS total FROM incomming_documents ${whereClause}
    `);
    return Number(rs.recordset[0]?.total ?? 0);
  }

  /**
   * Đếm số lượng cấu hình công việc lặp lại của người dùng
   */
  async countTaskRecurringConfig({ userId }: { userId: string }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const rs = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT COUNT_BIG(1) AS total 
        FROM task_recurring_config 
        WHERE status = 1 AND created_by = @userId
      `);
    return { total: Number(rs.recordset[0]?.total ?? 0) };
  }

  /**
   * Đếm số lượng công việc từ cuộc họp
   */
  async countTaskMeeting(params: { userId: string;[key: string]: any }): Promise<{ total: number }> {
    return this.countTaskDynamic({ ...params, typeTask: 'form_meeting' });
  }

  /**
   * Đếm số lượng công việc từ văn bản
   */
  async countTaskDocument(params: { userId: string;[key: string]: any }): Promise<{ total: number }> {
    return this.countTaskDynamic({ ...params, typeTask: 'form_doc' });
  }

  /**
   * Đếm số lượng công việc đang chờ người dùng phê duyệt
   */
  async countTaskApprovePending({ userId }: { userId: string }): Promise<{ total: number }> {
    const pool = await this.getPool();
    // Logic: Lấy audit mới nhất của mỗi task. Nếu audit đó có actionCode trong danh sách và receiver là userId thì đếm.
    const query = `
      SELECT COUNT_BIG(DISTINCT TRY_CAST(a.document_id AS BIGINT)) AS total
      FROM audit a
      INNER JOIN task t ON t.id = TRY_CAST(a.document_id AS BIGINT)
      WHERE t.status = 1
      AND a.receiver = @userId
      AND a.type_document IN ('TaskDocument', 'TaskMeeting', 'TaskMetting', 'TaskUser', 'TaskProjectUnit', 'TaskManyLevelUnit', 'TaskProjectCompany', 'TaskGeneral', 'TaskMultiPersional', 'TaskManyUnit', 'TaskProject')
      AND a.action_code IN ('GUI_PHE_DUYET', 'DIEU_CHINH', 'GUI_DIEU_CHINH')
      AND NOT EXISTS (
        SELECT 1 FROM audit a2
        WHERE a2.document_id = a.document_id
          AND a2.type_document IN ('TaskDocument', 'TaskMeeting', 'TaskMetting', 'TaskUser', 'TaskProjectUnit', 'TaskManyLevelUnit', 'TaskProjectCompany', 'TaskGeneral', 'TaskMultiPersional', 'TaskManyUnit', 'TaskProject')
          AND a2.id > a.id
      )
    `;

    const rs = await pool.request()
      .input('userId', userId)
      .query(query);

    return { total: Number(rs.recordset[0]?.total ?? 0) };
  }

  /**
   * Đếm số lượng công việc người dùng đã gửi phê duyệt
   */
  async countTaskApproveSent({ userId }: { userId: string }): Promise<{ total: number }> {
    const pool = await this.getPool();

    // Logic: Đếm các task (status=1) có tồn tại bản ghi audit (GUI_PHE_DUYET, DIEU_CHINH, GUI_DIEU_CHINH) do userId tạo
    const query = `
      SELECT COUNT_BIG(DISTINCT TRY_CAST(a.document_id AS BIGINT)) AS total
      FROM audit a
      INNER JOIN task t ON t.id = TRY_CAST(a.document_id AS BIGINT)
      WHERE a.created_by = @userId
      AND a.type_document IN ('TaskDocument', 'TaskMeeting', 'TaskMetting', 'TaskUser', 'TaskProjectUnit', 'TaskManyLevelUnit', 'TaskProjectCompany', 'TaskGeneral', 'TaskMultiPersional', 'TaskManyUnit', 'TaskProject')
      AND a.action_code IN ('GUI_PHE_DUYET', 'DIEU_CHINH', 'GUI_DIEU_CHINH')
      AND t.status = 1
    `;

    const rs = await pool.request()
      .input('userId', userId)
      .query(query);

    return { total: Number(rs.recordset[0]?.total ?? 0) };
  }

  /**
   * Helper chung cho đếm Feedback
   */
  private async countFeedbackDynamic({ userId, isAdmin, role, processStatus, isMine }: { userId: string, isAdmin?: boolean, role?: string, processStatus?: number, isMine?: boolean }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const request = pool.request();
    request.input('userId', userId);

    let effectiveIsAdmin = isAdmin;
    let isProcessor = false;

    // Lấy thông tin user một lần duy nhất từ DB để xác định quyền hạn
    try {
      const userRes = await pool.request()
        .input('uid', userId)
        .query(`SELECT id, role, CAST(roles_by_process AS NVARCHAR(MAX)) AS rolesByProcess FROM users WHERE id = @uid AND status = 1`);
      const u = userRes.recordset[0];
      if (u) {
        // 1. Xác định effectiveIsAdmin
        if (effectiveIsAdmin === undefined) {
          if (u.role === 'ADMIN' || u.role === 'BO_PHAN_CHUYEN_TRACH' || role === 'ADMIN' || role === 'BO_PHAN_CHUYEN_TRACH') {
            effectiveIsAdmin = true;
          } else {
            const rolesByProcess = JSON.parse(u.rolesByProcess || '[]');
            effectiveIsAdmin = Array.isArray(rolesByProcess) && rolesByProcess.some(p =>
              Array.isArray(p.roles) && p.roles.some(r => r.roleCode === 'BO_PHAN_CHUYEN_TRACH')
            );
          }
        }

        // 2. Xác định isProcessor
        if (u.role === 'DON_VI_XU_LY' || u.role === 'DON_VI_XY_LY' || role === 'DON_VI_XU_LY' || role === 'DON_VI_XY_LY') {
          isProcessor = true;
        } else {
          const rolesByProcess = JSON.parse(u.rolesByProcess || '[]');
          isProcessor = Array.isArray(rolesByProcess) && rolesByProcess.some(p =>
            Array.isArray(p.roles) && p.roles.some(r => r.roleCode === 'DON_VI_XU_LY' || r.roleCode === 'DON_VI_XY_LY')
          );
        }
      }
    } catch (err) {
      console.error('[countFeedbackDynamic] Failed to get user roles:', err.message);
    }

    let query = `SELECT COUNT_BIG(1) AS total FROM feedback_suggestions f WHERE f.status != 3`;

    if (processStatus !== undefined) {
      request.input('pStatus', processStatus);
      query += ` AND f.process_status = @pStatus`;
    }

    if (isMine) {
      query += ` AND f.created_by_id = @userId`;
    } else
      // if (!effectiveIsAdmin) {
      if (isProcessor) {
        query += ` AND f.processor_id = @userId`;
      }
    // else if (effectiveIsAdmin) {
    //   // Logic phân quyền: người tạo, người xử lý, hoặc đơn vị xử lý
    //   query += ` AND (f.created_by_id = @userId OR f.processor_id = @userId OR EXISTS (
    //   SELECT 1 FROM users u WHERE u.id = @userId AND u.parent = f.unit_id
    // ))`;
    // }
    // }

    const rs = await request.query(query);
    return { total: Number(rs.recordset[0]?.total ?? 0) };
  }

  /**
   * Đếm số lượng phản ánh đã huỷ của người dùng (status = 3)
   */
  async countFeedbackCancelled({ userId, filter }: { userId: string, filter?: any }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const request = pool.request();
    request.input('userId', userId);

    let query = `SELECT COUNT_BIG(1) AS total FROM feedback_suggestions f WHERE f.status = 3 AND f.created_by_id = @userId`;

    // Nếu có filter theo title hoặc code (giống applyFeedbackSearchFilters)
    if (filter?.name) {
      request.input('filterName', `%${filter.name}%`);
      query += ` AND (f.title LIKE @filterName OR f.code LIKE @filterName)`;
    }

    try {
      const rs = await request.query(query);
      return { total: Number(rs.recordset[0]?.total ?? 0) };
    } catch (err: any) {
      this.logger.error(`[SQL ERROR] countFeedbackCancelled:`, err.message);
      throw err;
    }
  }

  /**
   * Đếm số lượng Sổ văn bản (Book Documents) dựa trên cấu hình API
   */
  async countBookDocuments({
    userId,
    type_document,
    processFn
  }: {
    userId: string;
    type_document?: string;
    processFn?: string;
  }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const request = pool.request();
    request.input('userId', userId);

    // Tự động map type_document từ processFn nếu DB không cấu hình params
    let finalTypeDocument = type_document;
    if (!finalTypeDocument && processFn) {
      if (processFn === 'SoVBden') {
        finalTypeDocument = 'IncommingDocument';
      } else if (processFn === 'SoVBDi') {
        finalTypeDocument = 'OutGoingDocument';
      }
    }

    // Logic đếm tương tự API danh sách: lấy các sổ không bị xóa (status = 1)
    // Người dùng chỉ đếm các sổ mà họ tạo (created_by) hoặc được phân quyền (manager_book)
    let query = `
      SELECT COUNT_BIG(1) AS total 
      FROM book_documents 
      WHERE status = 1 
      AND (
        created_by = @userId
        OR EXISTS (
          SELECT 1
          FROM STRING_SPLIT(manager_book, ',') s
          WHERE LTRIM(RTRIM(s.value)) = @userId
        )
      )
    `;

    // Nếu có type_document (ví dụ: IncommingDocument)
    if (finalTypeDocument) {
      request.input('type_document', finalTypeDocument);
      query += ` AND type_document = @type_document`;
    }

    try {
      const rs = await request.query(query);
      return { total: Number(rs.recordset[0]?.total ?? 0) };
    } catch (err: any) {
      this.logger.error(`[SQL ERROR] countBookDocuments:`, err.message);
      throw err;
    }
  }




  // ════════════════════════════════════════════════════════════════
  // Đếm Khai thác hồ sơ
  // ════════════════════════════════════════════════════════════════

  // COUNT - Danh sách yêu cầu khai thác hồ sơ
  async countRecordExploitationRequests({
    type,
    userId,
    filter,
    processFn,
    receiverUnit,
  }: {
    type: string;
    userId: string;
    filter?: any;
    processFn?: string;
    receiverUnit?: string;
  }): Promise<{ total: number }> {

    if (!this.dbname) {
      this.dbname = this.getDatabaseName();
    }

    const pool = await this.getPool();

    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepository.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, joins: filterJoins, from } =
      buildRecordExploitationRequestssCriteriaHelper(
        [...featureCriteria, ...criteria],
        'record_exploitation_requests',
        featureManagement
      );

    const TYPES = [
      'all',
      'daft',
      'waiting',
      'refuse',
      'processing',
      'complete',
    ] as const;

    if (!type || !TYPES.includes(type as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: TYPES,
      });
    }

    const MINING_STATE_MAP: Record<string, string[]> = {
      daft: ['TAO_MOI_HO_SO_KHAI_THAC'],

      waiting: [
        'TD_TRINH_DUYET_HSKT_LANH_DAO',
        'TRINH_DUYET_HSKT_LANH_DAO',
        'LD_PHE_DUYET_HSKT'
      ],

      refuse: [
        'CHP_TU_CHOI_HSKT',
        'LD_TU_CHOI_HSKT'
      ],

      processing: [
        'CHP_PHE_DUYET_HSKT',
        'DANG_XU_LY',
        'LANH_DAO_DONG_Y'
      ],

      complete: [
        'VT_HOAN_THANH_HSKT',
        'HOAN_THANH'
      ]
    };

    const where: string[] = [];

    // base
    where.push(`${from}.status = 1`);
    where.push(`(${from}.created_by = '${userId}' OR ${from}.department = '${receiverUnit}')`);

    // filter type
    if (type !== 'all') {
      const miningStates = MINING_STATE_MAP[type];

      if (!miningStates?.length) {
        throw new BadRequestException({
          message: 'Type không hợp lệ',
        });
      }

      const list = miningStates
        .map(v => `'${v.replace(/'/g, "''")}'`)
        .join(',');

      if (type === 'processing') {
        where.push(`(${from}.mining_state IN (${list}) OR (${from}.mining_state = 'CHI_HUY_PHONG_DONG_Y' AND ${from}.extraction_method = '2'))`);
      } else {
        where.push(`${from}.mining_state IN (${list})`);
      }
    }

    // filter feature
    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const joinClause = filterJoins || '';
    const whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';

    const countSql = `
      SELECT COUNT(*) AS total
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
    `;

    try {
      const result = await pool.request().query(countSql);
      const total = result.recordset[0]?.total ?? 0;

      return { total };
    } catch (err: any) {
      console.error(`[SQL ERROR] countRecordExploitationRequests:`, err.message);
      throw err;
    }
  }

  // COUNT - Danh sách yêu cầu khai thác hồ sơ (Lãnh đạo đơn vị)
  async countLeaderRecordExploitationRequests({
    type,
    userId,
    filter,
    processFn,
  }: {
    type: string;
    userId: string;
    filter?: any;
    processFn?: string;
  }): Promise<{ total: number }> {

    if (!this.dbname) {
      this.dbname = this.getDatabaseName();
    }

    const pool = await this.getPool();

    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepository.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, joins: filterJoins, from } =
      buildRecordExploitationRequestssCriteriaHelper(
        [...featureCriteria, ...criteria],
        'record_exploitation_requests',
        featureManagement
      );

    const TYPES = ['all', 'pending', 'refure', 'agree'] as const;

    if (!type || !TYPES.includes(type as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: TYPES,
      });
    }

    const where: string[] = [];

    // base
    where.push(`${from}.status = '1'`);

    let joinClause = filterJoins || '';

    // JOIN audit latest
    joinClause += `
      OUTER APPLY (
        SELECT TOP 1
          a.stage_status,
          a.receiver,
          a.processed_by
        FROM ${this.dbname}.audit a WITH (NOLOCK)
        WHERE a.document_id = CAST(${from}.id AS NVARCHAR(64))
        ORDER BY a.created_at DESC, a.id DESC
      ) last_audit
    `;

    // ===== TYPE FILTER =====

    if (type === 'all') {
      where.push(`
        EXISTS (
          SELECT 1
          FROM ${this.dbname}.audit a_exist WITH (NOLOCK)
          WHERE 
            a_exist.document_id = CAST(${from}.id AS NVARCHAR(64))
            AND (
              a_exist.receiver = @userId
              OR a_exist.processed_by = @userId
              OR a_exist.user_id = @userId
              OR a_exist.created_by = @userId
            )
        )
      `);
    }

    if (type === 'pending') {
      where.push(`last_audit.stage_status = '${stageStatusArchire.CHUA_XU_LY}'`);
      where.push(`last_audit.receiver = @userId`);
    }

    if (type === 'refure') {
      where.push(`
        ${from}.mining_state = 'LD_TU_CHOI_HSKT'
        AND last_audit.processed_by = @userId
      `);
    }

    if (type === 'agree') {
      where.push(`
        EXISTS (
          SELECT 1
          FROM ${this.dbname}.audit a_agree WITH (NOLOCK)
          WHERE 
            a_agree.document_id = CAST(${from}.id AS NVARCHAR(64))
            AND a_agree.stage_status = '${stageStatusArchire.LANH_DAO_DONG_Y}'
            AND (
              a_agree.processed_by = @userId
              OR a_agree.receiver = @userId
            )
        )
      `);
    }

    // filter feature
    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';

    const countSql = `
      SELECT COUNT(*) AS total
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
    `;

    try {
      const request = pool.request();
      request.input('userId', sql.NVarChar(100), userId);
      const result = await request.query(countSql);
      const total = result.recordset[0]?.total ?? 0;

      return { total };
    } catch (err: any) {
      console.error(`[SQL ERROR] countLeaderRecordExploitationRequests:`, err.message);
      throw err;
    }
  }

  // COUNT - Danh sách yêu cầu khai thác hồ sơ (Chánh văn phòng)
  async countComanderRecordExploitationRequests({
    type,
    userId,
    filter,
    processFn,
  }: {
    type: string;
    userId: string;
    filter?: any;
    processFn?: string;
  }): Promise<{ total: number }> {

    if (!this.dbname) {
      this.dbname = this.getDatabaseName();
    }

    const pool = await this.getPool();

    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepository.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, joins: filterJoins, from } =
      buildRecordExploitationRequestssCriteriaHelper(
        [...featureCriteria, ...criteria],
        'record_exploitation_requests',
        featureManagement
      );

    const TYPES = ['all', 'pending', 'refure', 'agree'] as const;

    if (!type || !TYPES.includes(type as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: TYPES,
      });
    }

    const where: string[] = [];

    // base
    where.push(`${from}.status = '1'`);

    let joinClause = filterJoins || '';

    // lấy audit mới nhất
    joinClause += `
      OUTER APPLY (
        SELECT TOP 1
          a.stage_status,
          a.receiver,
          a.processed_by
        FROM ${this.dbname}.audit a WITH (NOLOCK)
        WHERE a.document_id = CAST(${from}.id AS NVARCHAR(64))
        ORDER BY a.created_at DESC, a.id DESC
      ) last_audit
    `;

    // ===== TYPE FILTER =====

    if (type === 'all') {
      where.push(`
        EXISTS (
          SELECT 1
          FROM ${this.dbname}.audit a_exist WITH (NOLOCK)
          WHERE 
            a_exist.document_id = CAST(${from}.id AS NVARCHAR(64))
            AND (
              a_exist.receiver = @userId
              OR a_exist.processed_by = @userId
              OR a_exist.user_id = @userId
              OR a_exist.created_by = @userId
            )
        )
      `);
    }

    if (type === 'pending') {
      where.push(`last_audit.stage_status = '${stageStatusArchire.CHUA_XU_LY}'`);
      where.push(`last_audit.receiver = @userId`);
      where.push(`
        last_audit.stage_status NOT IN (
          '${stageStatusArchire.HOAN_THANH}',
          '${stageStatusArchire.DA_XU_LY}'
        )
      `);
    }

    if (type === 'refure') {
      where.push(`
        ${from}.mining_state = 'CHP_TU_CHOI_HSKT'
        AND last_audit.processed_by = @userId
      `);
    }

    if (type === 'agree') {
      where.push(`
        EXISTS (
          SELECT 1
          FROM ${this.dbname}.audit a_agree WITH (NOLOCK)
          WHERE 
            a_agree.document_id = CAST(${from}.id AS NVARCHAR(64))
            AND a_agree.stage_status IN ('${stageStatusArchire.CHI_HUY_PHONG_DONG_Y}', '${stageStatusArchire.DANG_XU_LY}')
            AND (
              a_agree.processed_by = @userId
              OR a_agree.receiver = @userId
            )
        )
      `);
    }

    // filter động
    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';

    const countSql = `
      SELECT COUNT(*) AS total
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
    `;

    try {
      const request = pool.request();
      request.input('userId', sql.NVarChar(100), userId);
      const result = await request.query(countSql);
      const total = result.recordset[0]?.total ?? 0;

      return { total };
    } catch (err: any) {
      console.error(`[SQL ERROR] countComanderRecordExploitationRequests:`, err.message);
      throw err;
    }
  }

  // COUNT - Danh sách yêu cầu khai thác hồ sơ (Văn thư)
  async countProcessRecordExploitationRequests({
    type,
    userId,
    filter,
    processFn,
  }: {
    type: string;
    userId: string;
    filter?: any;
    processFn?: string;
  }): Promise<{ total: number }> {

    if (!this.dbname) {
      this.dbname = this.getDatabaseName();
    }

    const pool = await this.getPool();

    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepository.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, joins: filterJoins, from } =
      buildRecordExploitationRequestssCriteriaHelper(
        [...featureCriteria, ...criteria],
        'record_exploitation_requests',
        featureManagement
      );

    const TYPES = ['all', 'pending', 'processed'] as const;

    if (!type || !TYPES.includes(type as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: TYPES,
      });
    }

    const where: string[] = [];
    where.push(`${from}.status = '1'`);

    let joinClause = filterJoins || '';

    // OUTER APPLY lấy audit mới nhất
    joinClause += `
      OUTER APPLY (
        SELECT TOP 1
          a.stage_status,
          a.receiver,
          a.processed_by
        FROM ${this.dbname}.audit a WITH (NOLOCK)
        WHERE a.document_id = CAST(${from}.id AS NVARCHAR(64))
        ORDER BY a.created_at DESC, a.id DESC
      ) last_audit
    `;

    // ===== TYPE FILTER =====
    if (type === 'all') {
      where.push(`
        (
          (last_audit.stage_status = '${stageStatusArchire.CHUA_XU_LY}'
          AND last_audit.receiver = @userId)
          OR
          (last_audit.stage_status = '${stageStatusArchire.HOAN_THANH}'
          AND EXISTS (
            SELECT 1
            FROM ${this.dbname}.audit a_exist WITH (NOLOCK)
            WHERE a_exist.document_id = CAST(${from}.id AS NVARCHAR(64))
            AND a_exist.stage_status = '${stageStatusArchire.HOAN_THANH}'
            AND a_exist.processed_by = @userId
          )
          )
        )
      `);
    }

    if (type === 'pending') {
      where.push(`last_audit.stage_status = '${stageStatusArchire.CHUA_XU_LY}'`);
      where.push(`last_audit.receiver = @userId`);
    }

    if (type === 'processed') {
      where.push(`
        last_audit.stage_status IN (
          '${stageStatusArchire.HOAN_THANH}',
          '${stageStatusArchire.DA_XU_LY}'
        )
      `);
      where.push(`
        EXISTS (
          SELECT 1
          FROM ${this.dbname}.audit a_exist WITH (NOLOCK)
          WHERE a_exist.document_id = CAST(${from}.id AS NVARCHAR(64))
          AND a_exist.processed_by = @userId
        )
      `);
    }

    // filter feature
    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';

    const countSql = `
      SELECT COUNT(*) AS total
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
    `;

    try {
      const request = pool.request();
      request.input('userId', sql.NVarChar(100), userId);
      const result = await request.query(countSql);
      const total = result.recordset[0]?.total ?? 0;
      return { total };
    } catch (err: any) {
      console.error(`[SQL ERROR] countProcessRecordExploitationRequests:`, err.message);
      throw err;
    }
  }

  // COUNT - Danh sách yêu cầu tiêu hủy hồ sơ
  async countRecordDestroyExploitationRequests({
    type,
    userId,
    filter,
    processFn,
    authority,
    authorId
  }: {
    type: string;
    userId: string;
    filter?: any;
    processFn?: string;
    receiverUnit?: string;
    authority?: boolean | string;
    authorId?: string;
  }): Promise<{ total: number }> {
    if ((authority === 'true' || authority === true) && authorId) {
      userId = authorId;
    }

    const pool = await this.getPool();

    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepository.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    // Build criteria
    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, joins: filterJoins, from } =
      buildRecordExploitationRequestssCriteriaHelper(
        [...featureCriteria, ...criteria],
        'destroy_records',
        featureManagement,
      );

    const TYPES = ['all', 'daft', 'draft', 'waiting', 'refuse', 'approved', 'complete', 'refure'];

    if (!type || !TYPES.includes(type)) {
      throw new BadRequestException('Type không hợp lệ');
    }

    const where: string[] = [];
    let joinClause = filterJoins || '';

    if (type !== 'daft' && type !== 'draft') {
      joinClause += `
        LEFT JOIN (
          SELECT DISTINCT document_id
          FROM ${this.dbname}.audit WITH (NOLOCK)
          WHERE type_document IN ('DestructionProcess', 'destroy_records', 'DestroyRecord')
            AND (receiver = @userId OR processed_by = @userId)
        ) related_audit ON related_audit.document_id = CAST(${from}.id AS NVARCHAR(64))
      `;
    }

    const relatedCondition = `
      (
        ${from}.created_by = @userId
        OR related_audit.document_id IS NOT NULL
      )
    `;

    // 🔥 Điều kiện theo type
    if (type === 'all') {
      where.push(relatedCondition);
    } else if (type === 'daft' || type === 'draft') {
      where.push(`(${from}.status = '0' AND ${from}.created_by = @userId)`);
    } else if (type === 'waiting') {
      where.push(`${relatedCondition} AND ${from}.status IN ('1', '2')`);
    } else if (type === 'refuse' || type === 'refure') {
      where.push(`${relatedCondition} AND ${from}.status IN ('4', '6', '7')`);
    } else if (type === 'approved') {
      where.push(`${relatedCondition} AND ${from}.status = '3'`);
    } else if (type === 'complete') {
      where.push(`${relatedCondition} AND ${from}.status = '5'`);
    }

    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const whereClause = where.length ? ` WHERE ${where.join(' AND ')}` : '';

    const totalSql = `
      SELECT COUNT(*) AS total
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
    `;

    try {
      const result = await pool.request().input('userId', userId).query(totalSql);
      const total = result.recordset[0]?.total ?? 0;
      return { total };
    } catch (err: any) {
      this.logger.error('[SQL ERROR] countRecordDestroyExploitationRequests:', err.message);
      throw new InternalServerErrorException('Lỗi truy vấn dữ liệu khai thác hồ sơ');
    }
  }

  // Danh sách yêu cầu tiêu hủy hồ sơ - Lãnh đạo đơn vị
  async countLeaderDestroyRecordExploitationRequests({
    type,
    userId,
    filter,
    processFn,
    authority,
    authorId
  }: {
    type: string;
    userId: string;
    filter?: any;
    processFn?: string;
    receiverUnit?: string;
    authority?: boolean | string;
    authorId?: string;
  }): Promise<{ total: number }> {
    if ((authority === 'true' || authority === true) && authorId) {
      userId = authorId;
    }

    const pool = await this.getPool();

    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepository.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    // Build criteria
    const criteria = this.buildCriteria(filter);

    const { sql: filterFeature, joins: filterJoins, from } =
      buildRecordExploitationRequestssCriteriaHelper(
        criteria,
        'destroy_records',
        featureManagement,
      );

    const TYPES = ['all', 'pending', 'approved', 'processed', 'refuse', 'refure'] as const;

    if (!type || !TYPES.includes(type as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: TYPES,
      });
    }

    const where: string[] = [];
    let joinClause = filterJoins || '';

    if (type === 'pending') {
      joinClause += `
        INNER JOIN (
          SELECT a.document_id
          FROM (
            SELECT 
              document_id,
              stage_status,
              receiver,
              ROW_NUMBER() OVER (PARTITION BY document_id ORDER BY created_at DESC, id DESC) as rn
            FROM ${this.dbname}.audit WITH (NOLOCK)
            WHERE type_document IN ('DestructionProcess', 'destroy_records', 'DestroyRecord')
          ) a
          WHERE a.rn = 1 
            AND a.receiver = @userId 
            AND a.stage_status = 'CHUA_XU_LY'
        ) last_audit ON last_audit.document_id = CAST(${from}.id AS NVARCHAR(64))
      `;
      where.push(`${from}.status IN ('1', '2')`);
    } else if (type === 'approved') {
      joinClause += `
        INNER JOIN (
          SELECT DISTINCT document_id
          FROM ${this.dbname}.audit WITH (NOLOCK)
          WHERE type_document IN ('DestructionProcess', 'destroy_records', 'DestroyRecord')
            AND receiver = @userId
            AND stage_status = 'DA_XU_LY'
        ) processed_docs ON processed_docs.document_id = CAST(${from}.id AS NVARCHAR(64))
      `;
      where.push(`${from}.status = '3'`);
    } else if (type === 'processed') {
      joinClause += `
        INNER JOIN (
          SELECT DISTINCT document_id
          FROM ${this.dbname}.audit WITH (NOLOCK)
          WHERE type_document IN ('DestructionProcess', 'destroy_records', 'DestroyRecord')
            AND receiver = @userId
            AND stage_status = 'DA_XU_LY'
        ) processed_docs ON processed_docs.document_id = CAST(${from}.id AS NVARCHAR(64))
      `;
      where.push(`${from}.status = '5'`);
    } else if (type === 'refuse' || type === 'refure') {
      joinClause += `
        INNER JOIN (
          SELECT DISTINCT document_id
          FROM ${this.dbname}.audit WITH (NOLOCK)
          WHERE type_document IN ('DestructionProcess', 'destroy_records', 'DestroyRecord')
            AND receiver = @userId
        ) processed_docs ON processed_docs.document_id = CAST(${from}.id AS NVARCHAR(64))
      `;
      where.push(`${from}.status IN ('4', '6', '7')`);
    } else if (type === 'all') {
      joinClause += `
        INNER JOIN (
          SELECT DISTINCT document_id
          FROM ${this.dbname}.audit a WITH (NOLOCK)
          WHERE a.type_document IN ('DestructionProcess', 'destroy_records', 'DestroyRecord')
            AND (
              a.receiver = @userId
              OR a.processed_by = @userId
              OR a.user_id = @userId
              OR a.created_by = @userId
            )
        ) relevant_docs ON relevant_docs.document_id = CAST(${from}.id AS NVARCHAR(64))
      `;
    }

    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const whereClause = where.length ? ` WHERE ${where.join(' AND ')}` : '';

    const totalSql = `
      SELECT COUNT(*) AS total
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
    `;

    try {
      const result = await pool.request().input('userId', userId).query(totalSql);
      const total = result.recordset[0]?.total ?? 0;
      return { total };
    } catch (err: any) {
      this.logger.error('[SQL ERROR] countLeaderDestroyRecordExploitationRequests:', err.message);
      throw new InternalServerErrorException('Lỗi truy vấn dữ liệu khai thác hồ sơ lãnh đạo');
    }
  }

  async countComanderDestroyRecordExploitationRequests({
    type,
    userId,
    filter,
    processFn,
    authority,
    authorId
  }: {
    type: string;
    userId: string;
    filter?: any;
    processFn?: string;
    receiverUnit?: string;
    authority?: boolean | string;
    authorId?: string;
  }): Promise<{ total: number }> {
    if ((authority === 'true' || authority === true) && authorId) {
      userId = authorId;
    }

    const pool = await this.getPool();

    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepository.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    // Build criteria
    const criteria = this.buildCriteria(filter);

    const { sql: filterFeature, joins: filterJoins, from } =
      buildRecordExploitationRequestssCriteriaHelper(
        criteria,
        'destroy_records',
        featureManagement,
      );

    const TYPES = ['all', 'pending', 'processed', 'approved', 'refuse', 'refure'] as const;

    if (!type || !TYPES.includes(type as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: TYPES,
      });
    }

    const where: string[] = [];
    let joinClause = filterJoins || '';

    if (type === 'pending') {
      joinClause += `
        INNER JOIN (
          SELECT a.document_id
          FROM (
            SELECT 
              document_id,
              stage_status,
              receiver,
              ROW_NUMBER() OVER (PARTITION BY document_id ORDER BY created_at DESC, id DESC) as rn
            FROM ${this.dbname}.audit WITH (NOLOCK)
            WHERE type_document IN ('DestructionProcess', 'destroy_records', 'DestroyRecord')
          ) a
          WHERE a.rn = 1 
            AND a.receiver = @userId 
            AND a.stage_status = 'CHUA_XU_LY'
        ) last_audit ON last_audit.document_id = CAST(${from}.id AS NVARCHAR(64))
      `;
      where.push(`${from}.status IN ('1', '2')`);
    } else if (type === 'processed') {
      joinClause += `
        INNER JOIN (
          SELECT DISTINCT document_id
          FROM ${this.dbname}.audit WITH (NOLOCK)
          WHERE type_document IN ('DestructionProcess', 'destroy_records', 'DestroyRecord')
            AND receiver = @userId
            AND stage_status = 'DA_XU_LY'
        ) processed_docs ON processed_docs.document_id = CAST(${from}.id AS NVARCHAR(64))
      `;
      where.push(`${from}.status IN ('2', '3', '4', '5', '6', '7')`);
    } else if (type === 'approved') {
      joinClause += `
        INNER JOIN (
          SELECT DISTINCT document_id
          FROM ${this.dbname}.audit WITH (NOLOCK)
          WHERE type_document IN ('DestructionProcess', 'destroy_records', 'DestroyRecord')
            AND receiver = @userId
            AND stage_status = 'DA_XU_LY'
        ) processed_docs ON processed_docs.document_id = CAST(${from}.id AS NVARCHAR(64))
      `;
      where.push(`${from}.status IN ('2', '3', '5')`);
    } else if (type === 'refuse' || type === 'refure') {
      joinClause += `
        INNER JOIN (
          SELECT DISTINCT document_id
          FROM ${this.dbname}.audit WITH (NOLOCK)
          WHERE type_document IN ('DestructionProcess', 'destroy_records', 'DestroyRecord')
            AND receiver = @userId
        ) processed_docs ON processed_docs.document_id = CAST(${from}.id AS NVARCHAR(64))
      `;
      where.push(`${from}.status IN ('4', '6', '7')`);
    } else if (type === 'all') {
      joinClause += `
        INNER JOIN (
          SELECT DISTINCT document_id
          FROM ${this.dbname}.audit a WITH (NOLOCK)
          WHERE a.type_document IN ('DestructionProcess', 'destroy_records', 'DestroyRecord')
            AND (
              a.receiver = @userId
              OR a.processed_by = @userId
              OR a.user_id = @userId
              OR a.created_by = @userId
            )
        ) relevant_docs ON relevant_docs.document_id = CAST(${from}.id AS NVARCHAR(64))
      `;
    }

    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const whereClause = where.length ? ` WHERE ${where.join(' AND ')}` : '';

    const totalSql = `
      SELECT COUNT(*) AS total
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
    `;

    try {
      const result = await pool.request().input('userId', userId).query(totalSql);
      const total = result.recordset[0]?.total ?? 0;
      return { total };
    } catch (err: any) {
      this.logger.error('[SQL ERROR] countComanderDestroyRecordExploitationRequests:', err.message);
      throw new InternalServerErrorException('Lỗi truy vấn dữ liệu khai thác hồ sơ Chánh văn phòng');
    }
  }


  // Đếm hồ sơ 
  async countArchivedRecords({
    type,
    filter,
    processFn,
  }: {
    type: string;
    filter?: any;
    processFn?: string;
  }): Promise<{ total: number }> {

    const pool = await this.getPool();

    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepository.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    // Build criteria
    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, joins: filterJoins, from } =
      buildArchiveRecordsCriteriaHelper(
        [...featureCriteria, ...criteria],
        'archive_records',
        featureManagement,
      );

    const TYPES = ['all', 'collecting', 'archived', 'destroyed'] as const;
    if (!type || !TYPES.includes(type as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: TYPES,
      });
    }

    const where: string[] = [];
    where.push(`${from}.status = 1 AND ${from}.record_state != 3`);

    if (type === 'collecting') where.push(`${from}.record_state = 1`);
    if (type === 'archived') where.push(`${from}.record_state = 2`);
    if (type === 'destroyed') where.push(`${from}.record_state = 3`);
    if (filterFeature) where.push(`(${filterFeature})`);

    const whereClause = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    const joinClause = filterJoins ? ` ${filterJoins} ` : '';

    const totalSql = `
      SELECT COUNT(DISTINCT ${from}.id) AS total
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
    `;

    try {
      const result = await pool.request().query(totalSql);
      const total = result.recordset[0]?.total ?? 0;
      return { total };
    } catch (err: any) {
      this.logger.error('[SQL ERROR] countArchivedRecords:', err.message);
      throw new InternalServerErrorException('Lỗi truy vấn hồ sơ lưu trữ');
    }
  }



  // ════════════════════════════════════════════════════════════════
  // Đếm lịch
  // ════════════════════════════════════════════════════════════════

  async countMeetingPersonDynamic({
    type,
    userId,
    filter,
    processFn,
    workstate,
    substate,
    authority,
    authorId
  }: {
    type: string;
    userId?: string;
    filter?: any
    processFn?: string
    workstate?: string
    substate?: string
    authority?: string
    authorId?: string
  }): Promise<{ total: number }> {

    if (authority === 'true' && authorId) userId = authorId;

    const pool = await this.getPool();

    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepository.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    // ===== VALIDATE =====
    const ALLOWED_TYPES = ['day', 'week', 'month'] as const;
    const ALLOWED_WORKSTATES = ['all', 'waiting', 'comfirmed', 'notpaticipate', 'delegated'] as const;
    const ALLOWED_SUBSTATE = ['all', 'notprepare', 'completed'] as const;

    if (type && !ALLOWED_TYPES.includes(type as any)) {
      throw new BadRequestException('Type không hợp lệ');
    }

    if (workstate && !ALLOWED_WORKSTATES.includes(workstate as any)) {
      throw new BadRequestException('Workstate không hợp lệ');
    }

    if (substate && !ALLOWED_SUBSTATE.includes(substate as any)) {
      throw new BadRequestException('Substate không hợp lệ');
    }

    const WORKSTATE_MAP: Record<string, string[]> = {
      waiting: ['RECEIVED'],
      comfirmed: ['PROCESSING', 'CONFIRMED', 'DELEGATED', 'DONE'],
      notpaticipate: ['NOT_PARTICIPATE'],
      delegated: ['DELEGATED'],
      all: [],
    };

    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, from } = buildMeetingCriteriaHelper(
      [...featureCriteria, ...criteria],
      'meetings',
      featureManagement,
    );

    // ===== WHERE BASE =====
    const whereList: string[] = [
      `${from}.status = '1'`,
      `(${from}.is_template = 0 OR ${from}.is_template IS NULL)`,
      ...((workstate && workstate !== 'all') ? [`(${from}.meeting_state != 'DA_HUY' OR ${from}.meeting_state IS NULL)`] : []),
      (!workstate || workstate === 'all')
        ? `${from}.stage_status IN ('DONG_Y_PHE_DUYET', 'BI_HUY')`
        : `${from}.stage_status = 'DONG_Y_PHE_DUYET'`,
      `EXISTS (
        SELECT 1
        FROM meeting_units mu WITH (NOLOCK)
        JOIN meeting_participants mp WITH (NOLOCK) ON mp.meeting_unit_id = mu.id
        WHERE mu.meeting_id = ${from}.id
          AND (
            mp.user_id = @userId
            OR mp.delegated_to_user_id = @userId
          )
      )`,
    ];

    if (filterFeature) whereList.push(filterFeature);

    // ===== TYPE FILTER =====
    if (type === 'day' && filter?.currentDate) {
      whereList.push(
        `${from}.meeting_date >= @startDate AND ${from}.meeting_date < DATEADD(day,1,@startDate)`
      );
    }

    if (type === 'week' && filter?.currentWeek) {
      whereList.push(`${from}.meeting_date BETWEEN @startDate AND @endDate`);
    }

    if (type === 'month' && filter?.currentMonth) {
      whereList.push(
        `${from}.meeting_date >= @startDate AND ${from}.meeting_date < DATEADD(month,1,@startDate)`
      );
    }

    // ===== WORKSTATE =====
    if (workstate === 'delegated') {
      whereList.push(`
        EXISTS (
          SELECT 1
          FROM meeting_units mu WITH (NOLOCK)
          JOIN meeting_participants mp WITH (NOLOCK) ON mp.meeting_unit_id = mu.id
          WHERE mu.meeting_id = ${from}.id
            AND mp.user_id = @userId
            AND mp.delegated_to_user_id IS NOT NULL
            AND mp.participant_state = 'DELEGATED'
        )
      `);
    } else if (workstate && workstate !== 'all') {
      const states = WORKSTATE_MAP[workstate];

      whereList.push(`
        EXISTS (
          SELECT 1
          FROM meeting_units mu WITH (NOLOCK)
          JOIN meeting_participants mp WITH (NOLOCK) ON mp.meeting_unit_id = mu.id
          WHERE mu.meeting_id = ${from}.id
            AND (
              (mp.user_id = @userId AND mp.delegated_to_user_id IS NULL)
              OR
              (mp.delegated_to_user_id = @userId AND mp.delegation_state = 'ACCEPTED')
            )
            AND mp.participant_state IN (${states.map(s => `'${s}'`).join(',')})
        )
      `);
    }

    // ===== SUBSTATE =====
    if (substate === 'notprepare') {
      whereList.push(`
        EXISTS (
          SELECT 1
          FROM meeting_units mu WITH (NOLOCK)
          JOIN meeting_participants mp WITH (NOLOCK) ON mp.meeting_unit_id = mu.id
          WHERE mu.meeting_id = ${from}.id
            AND ${workstate === 'delegated'
          ? `
                  mp.user_id = @userId
                  AND mp.delegated_to_user_id IS NOT NULL
                `
          : `
                  (
                    (mp.user_id = @userId AND mp.delegated_to_user_id IS NULL)
                    OR
                    (mp.delegated_to_user_id = @userId AND mp.delegation_state = 'ACCEPTED')
                  )
                `
        }
            AND (
              mp.prepare_documents = 0
              OR EXISTS (
                SELECT 1
                FROM meeting_tasks mt WITH (NOLOCK)
                WHERE mt.attachable_id = mp.id
                  AND mt.attachable_type = 'PARTICIPANT'
                  AND (mt.is_document_prepared = 0 OR mt.is_document_prepared IS NULL)
              )
            )
        )
      `);
    }

    if (substate === 'completed') {
      whereList.push(`
        NOT EXISTS (
          SELECT 1
          FROM meeting_units mu WITH (NOLOCK)
          JOIN meeting_participants mp WITH (NOLOCK) ON mp.meeting_unit_id = mu.id
          WHERE mu.meeting_id = ${from}.id
            AND ${workstate === 'delegated'
          ? `
                  mp.user_id = @userId
                  AND mp.delegated_to_user_id IS NOT NULL
                `
          : `
                  (
                    (mp.user_id = @userId AND mp.delegated_to_user_id IS NULL)
                    OR
                    (mp.delegated_to_user_id = @userId AND mp.delegation_state = 'ACCEPTED')
                  )
                `
        }
            AND (
              mp.prepare_documents = 0
              OR EXISTS (
                SELECT 1
                FROM meeting_tasks mt WITH (NOLOCK)
                WHERE mt.attachable_id = mp.id
                  AND mt.attachable_type = 'PARTICIPANT'
                  AND (mt.is_document_prepared = 0 OR mt.is_document_prepared IS NULL)
              )
            )
        )
      `);
    }

    const whereClause = whereList.length ? `WHERE ${whereList.join(' AND ')}` : '';

    const totalSql = `
      SELECT COUNT(DISTINCT ${from}.id) AS total
      FROM ${this.dbname}.${from} WITH (NOLOCK)
      ${whereClause}
    `;

    // ===== EXECUTE =====
    const request = pool.request().input('userId', userId);

    if (filter?.currentDate) request.input('startDate', filter.currentDate);

    if (filter?.currentWeek) {
      request.input('startDate', filter.currentWeek.startDate);
      request.input('endDate', filter.currentWeek.endDate);
    }

    if (filter?.currentMonth) {
      request.input('startDate', `${filter.currentMonth}-01`);
    }

    try {
      const res = await request.query(totalSql);
      const total = res.recordset[0]?.total ?? 0;

      return { total };
    } catch (err) {
      console.error('[COUNT ERROR]', err);
      throw err;
    }
  }

  // Đếm lịch phòng ban
  async countMeetingUnitDynamic({
    type,
    filter,
    processFn,
    workstate,
    receiverUnit,
  }: {
    type: string;
    userId?: string;
    filter?: any;
    processFn?: string;
    workstate?: string;
    receiverUnit?: string;
  }): Promise<{ total: number }> {

    const pool = await this.getPool();

    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepository.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    // ===== LẤY sibling units =====
    let siblingUnitIds: string[] = [];

    if (workstate === 'allunit' && receiverUnit) {
      const rootUnitId = await this.findRootUnit(receiverUnit);
      siblingUnitIds = await this.getAllChildUnits(rootUnitId);
    }

    // ===== VALIDATE =====
    const ALLOWED_TYPES = ['day', 'week', 'month'] as const;
    if (type && !ALLOWED_TYPES.includes(type as any)) {
      throw new BadRequestException('Type không hợp lệ');
    }

    const ALLOWED_WORKSTATES = ['unit', 'allunit'] as const;
    if (workstate && !ALLOWED_WORKSTATES.includes(workstate as any)) {
      throw new BadRequestException('Workstate không hợp lệ');
    }

    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const leaderUserIds = await this.getUsersByGroupCode('BANLANHDAO');

    const { sql: filterFeature, from } = buildMeetingCriteriaHelper(
      [...featureCriteria, ...criteria],
      'meetings',
      featureManagement,
      leaderUserIds
    );

    // ===== WHERE =====
    const where: string[] = [
      `${from}.status = '1'`,
      `(${from}.is_template = 0 OR ${from}.is_template IS NULL)`,
      `(
        ${from}.meeting_state = 'DA_HUY'
        OR ${from}.stage_status = 'DONG_Y_PHE_DUYET'
      )`,
      `${from}.is_company = 0`
    ];

    // ===== WORKSTATE =====
    if (workstate === 'unit' && receiverUnit) {
      where.push(`${from}.organizational_unit = '${receiverUnit}'`);
    }

    if (workstate === 'allunit' && siblingUnitIds.length) {
      const unitList = siblingUnitIds.map(id => `'${id}'`).join(',');
      where.push(`${from}.organizational_unit IN (${unitList})`);
    }

    // ===== FEATURE FILTER =====
    if (filterFeature) where.push(`(${filterFeature})`);

    // ===== TYPE FILTER =====
    if (type === 'day' && filter?.currentDate) {
      where.push(
        `${from}.meeting_date >= '${filter.currentDate}' 
        AND ${from}.meeting_date < DATEADD(day, 1, '${filter.currentDate}')`
      );
    }

    if (type === 'week' && filter?.currentWeek) {
      const { startDate, endDate } = filter.currentWeek;
      where.push(
        `${from}.meeting_date >= '${startDate}' 
        AND ${from}.meeting_date <= '${endDate}'`
      );
    }

    if (type === 'month' && filter?.currentMonth) {
      const [year, month] = String(filter.currentMonth).split('-');
      where.push(
        `${from}.meeting_date >= '${year}-${month}-01' 
        AND ${from}.meeting_date < DATEADD(month, 1, '${year}-${month}-01')`
      );
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const totalSql = `
      SELECT COUNT(DISTINCT ${from}.id) AS total
      FROM ${this.dbname}.${from} WITH (NOLOCK)
      ${whereClause}
    `;

    try {
      const res = await pool.request().query(totalSql);
      const total = res.recordset[0]?.total ?? 0;

      return { total };
    } catch (err) {
      console.error('[COUNT ERROR]', err);
      throw err;
    }
  }

  // Đếm lịch tổng công ty 
  async countMeetingCompanyDynamic({
    type,
    filter,
    processFn
  }: {
    type: string;
    filter?: any
    processFn?: string
  }): Promise<{ total: number }> {

    const pool = await this.getPool();

    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepository.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    // ===== VALIDATE =====
    const ALLOWED_TYPES = ['day', 'week', 'month'] as const;
    if (type && !ALLOWED_TYPES.includes(type as any)) {
      throw new BadRequestException('Type không hợp lệ');
    }

    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, from } = buildMeetingCriteriaHelper(
      [...featureCriteria, ...criteria],
      'meetings',
      featureManagement,
    );

    // ===== WHERE =====
    const where: string[] = [
      `(${from}.status = '1')`,
      `(${from}.is_template = 0 OR ${from}.is_template IS NULL)`,
      `(
        ${from}.meeting_state = 'DA_HUY'
        OR EXISTS (
          SELECT 1
          FROM ${this.dbname}.audit a WITH (NOLOCK)
          WHERE a.document_id = ${from}.id_str
            AND a.type_document = 'Meeting'
            AND a.stage_status = 'DONG_Y_PHE_DUYET'
        )
      )`,
      `(${from}.is_company = 1)`,
    ];

    // feature filter
    if (filterFeature) where.push(`(${filterFeature})`);

    // ===== TYPE FILTER =====
    if (type === 'day' && filter?.currentDate) {
      where.push(
        `${from}.meeting_date >= '${filter.currentDate}' 
        AND ${from}.meeting_date < DATEADD(day, 1, '${filter.currentDate}')`
      );
    }

    if (type === 'week' && filter?.currentWeek) {
      const { startDate, endDate } = filter.currentWeek;
      where.push(
        `${from}.meeting_date >= '${startDate}' 
        AND ${from}.meeting_date <= '${endDate}'`
      );
    }

    if (type === 'month' && filter?.currentMonth) {
      const [year, month] = String(filter.currentMonth).split('-');
      where.push(
        `${from}.meeting_date >= '${year}-${month}-01' 
        AND ${from}.meeting_date < DATEADD(month, 1, '${year}-${month}-01')`
      );
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const totalSql = `
      SELECT COUNT(DISTINCT ${from}.id) AS total
      FROM ${this.dbname}.${from} WITH (NOLOCK)
      ${whereClause}
    `;

    try {
      const res = await pool.request().query(totalSql);
      const total = res.recordset[0]?.total ?? 0;

      return { total };
    } catch (err) {
      console.error('[COUNT ERROR]', err);
      throw err;
    }
  }

  // Đếm soạn lịch họp
  async countPrepareMeetingScheduleDynamic({
    type,
    userId,
    filter,
    processFn,
    authority,
    authorId
  }: {
    type: string;
    userId?: string;
    filter?: any
    processFn?: string
    authority?: string
    authorId?: string
  }): Promise<{ total: number }> {

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const pool = await this.getPool();

    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepository.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, joins: filterJoins, from } =
      buildMeetingCriteriaHelper(
        [...featureCriteria, ...criteria],
        'meetings',
        featureManagement,
      );

    // ===== VALIDATE TYPE =====
    const MEETING_TYPES = ['daft', 'waiting', 'agree', 'refuse', 'cancel'] as const;

    if (!type || !MEETING_TYPES.includes(type as any)) {
      throw new BadRequestException('Type không hợp lệ');
    }

    const isDaft = type === 'daft';
    const isWaiting = type === 'waiting';
    const isAgree = type === 'agree';
    const isRefuse = type === 'refuse';
    const isCancel = type === 'cancel';

    // ===== BASE =====
    let where: string[] = [
      `${from}.status = '1'`,
      `(${from}.is_template = 0 OR ${from}.is_template IS NULL OR (${from}.stage_status != 'DONG_Y_PHE_DUYET' OR ${from}.stage_status IS NULL) OR NOT EXISTS (SELECT 1 FROM ${this.dbname}.${from} child WITH (NOLOCK) WHERE child.parent_id = ${from}.id AND child.status = '1'))`,
      `${from}.meeting_state <> 'DA_HUY'`,
    ];

    let joinClause = filterJoins || '';

    // ===== DRAFT =====
    if (isDaft) {
      joinClause += `
        OUTER APPLY (
          SELECT TOP 1
            a.stage_status,
            a.receiver,
            a.user_id,
            a.created_by
          FROM ${this.dbname}.audit a WITH (NOLOCK)
          WHERE a.document_id = ${from}.id_str
            AND (
              a.receiver = '${userId}'
              OR a.user_id = '${userId}'
            )
            AND a.created_by = '${userId}'
            AND a.roleProcess = 'processor'
          ORDER BY a.created_at DESC, a.id DESC
        ) last_audit
      `;

      where.push(`last_audit.stage_status = '${stageStatusDoc.CHUA_XU_LY}'`);
    }

    // ===== WAITING =====
    if (isWaiting) {
      where.push(`
        ${from}.stage_status IS NULL
        AND ${from}.created_by = '${userId}'
      `);
    }

    // ===== AGREE =====
    if (isAgree) {
      where.push(`
        ${from}.stage_status = '${stageStatusDoc.DONG_Y_PHE_DUYET}'
        AND ${from}.created_by = '${userId}'
      `);
    }

    // ===== REFUSE =====
    if (isRefuse) {
      where.push(`
        ${from}.stage_status = '${stageStatusDoc.TU_CHOI_PHE_DUYET}'
        AND ${from}.created_by = '${userId}'
      `);
    }

    // ===== CANCEL =====
    if (isCancel) {
      where = [];
      where.push(`${from}.status = '1'`);
      where.push(`${from}.meeting_state = 'DA_HUY'`);
      where.push(`
        ${from}.created_by = '${userId}'
      `);
    }

    // ===== FEATURE FILTER =====
    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const totalSql = `
      SELECT COUNT(DISTINCT ${from}.id) AS total
      FROM ${this.dbname}.${from} WITH (NOLOCK)
      ${joinClause}
      ${whereClause}
    `;

    try {
      const res = await pool.request().query(totalSql);
      const total = res.recordset[0]?.total ?? 0;

      return { total };
    } catch (err) {
      console.error('[COUNT ERROR]', err);
      throw err;
    }
  }

  // Đếm lịch phê duyệt 
  async countApprovalScheduleDynamic({
    type,
    userId,
    filter,
    processFn,
    authority,
    authorId
  }: {
    type: string;
    userId?: string;
    filter?: any
    processFn?: string
    authority?: string
    authorId?: string
  }): Promise<{ total: number }> {

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const pool = await this.getPool();

    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepository.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const leaderUserIds = await this.getUsersByGroupCode('BANLANHDAO');

    const { sql: filterFeature, joins: filterJoins, from } =
      buildMeetingCriteriaHelper(
        [...featureCriteria, ...criteria],
        'meetings',
        featureManagement,
        leaderUserIds
      );

    // ===== VALIDATE =====
    const MEETING_TYPES = ['waiting', 'agree', 'refuse', 'agree-me'] as const;

    if (!type || !MEETING_TYPES.includes(type as any)) {
      throw new BadRequestException('Type không hợp lệ');
    }

    const isWaiting = type === 'waiting';
    const isAgree = type === 'agree';
    const isAgreeMe = type === 'agree-me';
    const isRefuse = type === 'refuse';

    // ===== BASE =====
    const where: string[] = [
      `${from}.status = '1'`,
      `(${from}.is_template = 0 OR ${from}.is_template IS NULL OR (${from}.stage_status != 'DONG_Y_PHE_DUYET' OR ${from}.stage_status IS NULL) OR NOT EXISTS (SELECT 1 FROM ${this.dbname}.${from} child WITH (NOLOCK) WHERE child.parent_id = ${from}.id AND child.status = '1'))`,
    ];

    const joinClause = filterJoins || '';

    // ===== WAITING =====
    if (isWaiting) {
      where.push(`
        ${from}.stage_status IS NULL
      `);
    }

    // ===== AGREE =====
    if (isAgree) {
      where.push(`
        ${from}.stage_status = '${stageStatusDoc.DONG_Y_PHE_DUYET}'
      `);
      where.push(`${from}.created_by != '${userId}'`);
      where.push(`${from}.meeting_state != 'DA_HUY'`);
    }

    // ===== AGREE ME =====
    if (isAgreeMe) {
      where.push(`
        ${from}.stage_status = '${stageStatusDoc.DONG_Y_PHE_DUYET}'
      `);
      where.push(`${from}.created_by = '${userId}'`);
      where.push(`${from}.meeting_state != 'DA_HUY'`);
    }

    // ===== REFUSE =====
    if (isRefuse) {
      where.push(`
        ${from}.stage_status = '${stageStatusDoc.TU_CHOI_PHE_DUYET}'
      `);
    }

    // ===== FEATURE FILTER =====
    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const totalSql = `
      SELECT COUNT(DISTINCT ${from}.id) AS total
      FROM ${this.dbname}.${from} WITH (NOLOCK)
      ${joinClause}
      ${whereClause}
    `;

    try {
      const res = await pool.request().query(totalSql);
      const total = res.recordset[0]?.total ?? 0;

      return { total };
    } catch (err) {
      console.error('[COUNT ERROR]', err);
      throw err;
    }
  }
  // Đếm lịch cần xử lý
  async countProcessScheduleDynamic({
    type,
    filter,
    processFn,
    receiverUnit,
  }: {
    type: string;
    userId?: string;
    filter?: any;
    processFn?: string;
    authority?: string;
    authorId?: string;
    receiverUnit?: string;
  }): Promise<{ total: number }> {

    if (!this.dbname) {
      this.dbname = this.getDatabaseName();
    }

    const pool = await this.getPool();

    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepository.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }


    if (!receiverUnit) {
      throw new BadRequestException('User chưa thuộc đơn vị');
    }

    // ===== VALIDATE =====
    const MEETING_TYPES = ['waiting', 'processing', 'processed'] as const;

    if (!type || !MEETING_TYPES.includes(type as any)) {
      throw new BadRequestException('Type không hợp lệ');
    }

    const isWaiting = type === 'waiting';
    const isProcessing = type === 'processing';
    const isProcessed = type === 'processed';

    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, joins: filterJoins, from } =
      buildMeetingCriteriaHelper(
        [...featureCriteria, ...criteria],
        'meetings',
        featureManagement,
      );

    // ===== WHERE =====
    const where: string[] = [
      `${from}.status = '1'`,
      `(${from}.is_template = 0 OR ${from}.is_template IS NULL)`
    ];

    let joinClause = filterJoins || '';

    // ===== JOIN meeting_units =====
    joinClause += `
      INNER JOIN ${this.dbname}.meeting_units mu WITH (NOLOCK)
        ON mu.meeting_id = ${from}.id
        AND (
          mu.unit_id = '${receiverUnit}'
          OR (
            mu.unit_id = 'SECRETARY_UNIT'
            AND ${from}.secretary_type = '${ParticipantType.UNIT}'
            AND ${from}.secretary_id = '${receiverUnit}'
            AND NOT EXISTS (
              SELECT 1
              FROM ${this.dbname}.meeting_units mu2 WITH (NOLOCK)
              WHERE mu2.meeting_id = ${from}.id
                AND mu2.unit_id = '${receiverUnit}'
            )
          )
        )
    `;

    // ===== TYPE FILTER =====
    if (isWaiting) {
      where.push(`mu.unit_state = '${MEETING_UNIT_STATE.RECEIVED}'`);
    }

    if (isProcessing) {
      where.push(`
        mu.unit_state IN (
          '${MEETING_UNIT_STATE.PROCESSING}',
          '${MEETING_UNIT_STATE.CONFIRMED}'
        )
      `);
    }

    if (isProcessed) {
      where.push(`
        mu.unit_state IN (
          '${MEETING_UNIT_STATE.DONE}',
          '${MEETING_UNIT_STATE.COMPLETED}'
        )
      `);
    }

    // ===== FEATURE FILTER =====
    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const totalSql = `
      SELECT COUNT(DISTINCT ${from}.id) AS total
      FROM ${this.dbname}.${from} WITH (NOLOCK)
      ${joinClause}
      ${whereClause}
    `;

    try {
      const res = await pool.request().query(totalSql);
      const total = res.recordset[0]?.total ?? 0;

      return { total };
    } catch (err) {
      console.error('[COUNT ERROR]', err);
      throw err;
    }
  }
  // Đếm gán vị trí chỗ ngồi 
  async countSeatAssignmentDynamic({
    type,
    filter,
    processFn,
  }: {
    type: string;
    filter?: any;
    processFn?: string;
  }): Promise<{ total: number }> {
    const pool = await this.getPool();

    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepository.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    // ===== VALIDATE =====
    const MEETING_TYPES = ['waiting', 'processing', 'complete'] as const;

    if (!type || !MEETING_TYPES.includes(type as any)) {
      throw new BadRequestException('Type không hợp lệ');
    }

    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const leaderUserIds = await this.getUsersByGroupCode('BANLANHDAO');

    const { sql: filterFeature, joins: filterJoins, from } =
      buildMeetingCriteriaHelper(
        [...featureCriteria, ...criteria],
        'meetings',
        featureManagement,
        leaderUserIds
      );

    // ===== WHERE =====
    const where: string[] = [
      `${from}.status = '1'`,
      `(${from}.is_template = 0 OR ${from}.is_template IS NULL)`,
    ];

    // ===== TYPE FILTER =====
    if (type === 'waiting') {
      where.push(`${from}.assigned_seat_by IS NULL`);
      where.push(`${from}.is_assigning_seat = '${ASSIGNING_SEAT_STATUS.RECEIVED}'`);
    }

    if (type === 'processing') {
      where.push(`${from}.assigned_seat_by IS NOT NULL`);
      where.push(`${from}.is_assigning_seat = '${ASSIGNING_SEAT_STATUS.ASSIGNING}'`);
    }

    if (type === 'complete') {
      where.push(`${from}.is_assigning_seat = '${ASSIGNING_SEAT_STATUS.ASSIGNED}'`);
    }

    // ===== FIXED FILTER =====
    where.push(`${from}.is_company = 1`);
    where.push(`${from}.meeting_mode != 'ONLINE'`);

    // ===== FEATURE FILTER =====
    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const joinClause = filterJoins || '';
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const totalSql = `
      SELECT COUNT(DISTINCT ${from}.id) AS total
      FROM ${this.dbname}.${from} WITH (NOLOCK)
      ${joinClause}
      ${whereClause}
    `;

    try {
      const res = await pool.request().query(totalSql);
      const total = res.recordset[0]?.total ?? 0;

      return { total };
    } catch (err) {
      console.error('[COUNT ERROR]', err);
      throw err;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // COUNT - Danh sách yêu cầu đăng ký xe
  // ════════════════════════════════════════════════════════════════
  async countVehiclesRegistration({
    type = 'all',
    userId,
    filter,
    processFn,
    authority,
    authorId,
    effectiveUserId,
  }: {
    type?: string;
    userId: string;
    filter?: any;
    processFn?: string;
    receiverUnit?: string;
    authority?: boolean | string;
    authorId?: string;
    effectiveUserId?: string;
  }): Promise<{ total: number }> {
    const isAuthority = authority === true || authority === 'true';
    const effUserId = authorId || effectiveUserId;
    if (isAuthority && effUserId) {
      userId = effUserId;
    }

    const pool = await this.getPool();

    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepository.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    // Build criteria
    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];
    const { sql: filterFeature, joins: filterJoins, from } = buildVehicleRegistrationCriteriaHelper([...featureCriteria, ...criteria], 'vehicle_registrations', featureManagement);

    // Validate type
    const TYPES = ['all', 'processed', 'pending', 'processing', 'completed', 'rejected', 'cancel'] as const;
    const normalizedType = (type || 'all').toLowerCase();
    if (!TYPES.includes(normalizedType as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: TYPES,
      });
    }

    const isPending = normalizedType === 'pending';
    const isProcessed = normalizedType === 'processed';
    const isProcessing = normalizedType === 'processing';
    const isCompleted = normalizedType === 'completed';
    const isRejected = normalizedType === 'rejected';
    const isCancel = normalizedType === 'cancel';

    // Build WHERE
    const where: string[] = [];
    where.push(`${from}.status = '1'`);
    where.push(`${from}.created_by = '${userId}'`);

    if (isPending) {
      where.push(`${from}.vehicle_state = '${VehicleState.CHO_DIEU_PHOI}'`);
    }
    if (isProcessed) {
      where.push(`${from}.vehicle_state = '${VehicleState.DA_PHAN_CONG}'`);
    }
    if (isProcessing) {
      where.push(`${from}.vehicle_state = '${VehicleState.TRONG_TIEN_TRINH}'`);
    }
    if (isCompleted) {
      where.push(`${from}.vehicle_state = '${VehicleState.HOAN_THANH}'`);
    }
    if (isRejected) {
      where.push(`${from}.vehicle_state = '${VehicleState.TU_CHOI}'`);
    }
    if (isCancel) {
      where.push(`${from}.vehicle_state = '${VehicleState.DA_HUY}'`);
    }

    // Feature filter
    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const whereClause = ' WHERE ' + where.join(' AND ');
    const joinClause = filterJoins || '';

    const totalSql = `
      SELECT COUNT(*) AS total
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
    `;

    try {
      const result = await pool.request().query(totalSql);
      const total = result.recordset[0]?.total ?? 0;
      return { total };
    } catch (err: any) {
      console.error('[SQL ERROR] countVehiclesRegistration:', err.message);
      throw new InternalServerErrorException('Lỗi truy vấn dữ liệu đăng ký xe');
    }
  }

  // ════════════════════════════════════════════════════════════════
  // COUNT - Danh sách yêu cầu đăng ký xe - Assignment
  // ════════════════════════════════════════════════════════════════
  async countVehiclesRegistrationAssignment({
    type = 'all',
    userId,
    filter,
    processFn,
    authority,
    authorId,
    effectiveUserId,
  }: {
    type?: string;
    userId: string;
    filter?: any;
    processFn?: string;
    receiverUnit?: string;
    authority?: boolean | string;
    authorId?: string;
    effectiveUserId?: string;
  }): Promise<{ total: number }> {
    const isAuthority = authority === true || authority === 'true';
    const effUserId = authorId || effectiveUserId;
    if (isAuthority && effUserId) {
      userId = effUserId;
    }

    const pool = await this.getPool();

    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepository.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    // Build criteria
    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];
    const { sql: filterFeature, joins: filterJoins, from } =
      buildVehicleRegistrationCriteriaHelper([...featureCriteria, ...criteria], 'vehicle_registrations', featureManagement);

    // Validate type
    const TYPES = ['all', 'processed', 'pending', 'processing', 'completed', 'rejected', 'cancel'] as const;
    const normalizedType = (type || 'all').toLowerCase();
    if (!TYPES.includes(normalizedType as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: TYPES,
      });
    }

    const isPending = normalizedType === 'pending';
    const isProcessed = normalizedType === 'processed';
    const isProcessing = normalizedType === 'processing';
    const isCompleted = normalizedType === 'completed';
    const isRejected = normalizedType === 'rejected';
    const isCancel = normalizedType === 'cancel';

    // Build WHERE
    const where: string[] = [];
    where.push(`${from}.status = '1'`);
    where.push(`last_audit.receiver IS NOT NULL`);

    const joinClause = (filterJoins || '') + `
      OUTER APPLY (
        SELECT TOP 1
          a.stage_status,
          a.receiver,
          a.processed_by
        FROM ${this.dbname}.audit a WITH (NOLOCK)
        WHERE a.document_id = CAST(${from}.id AS NVARCHAR(64))
          AND a.type_document = 'VEHICLE_REGISTRATION'
          AND (
            a.receiver = '${userId}'
            OR a.receiver = '${stageStatusVehicle.PHONG_DOI_HAU_CAN_NGUOI_DIEU_PHOI}'
            OR a.processed_by = '${userId}'
            OR a.acting_as = '${userId}'
            OR a.created_by = '${userId}'
          )
        ORDER BY a.created_at DESC, a.id DESC
      ) last_audit
    `;

    if (isPending) {
      where.push(`${from}.vehicle_state = '${VehicleState.CHO_DIEU_PHOI}'`);
    }
    if (isProcessed) {
      where.push(`${from}.vehicle_state = '${VehicleState.DA_PHAN_CONG}'`);
    }
    if (isProcessing) {
      where.push(`${from}.vehicle_state = '${VehicleState.TRONG_TIEN_TRINH}'`);
    }
    if (isCompleted) {
      where.push(`${from}.vehicle_state = '${VehicleState.HOAN_THANH}'`);
    }
    if (isRejected) {
      where.push(`${from}.vehicle_state = '${VehicleState.TU_CHOI}'`);
    }
    if (isCancel) {
      where.push(`${from}.vehicle_state = '${VehicleState.DA_HUY}'`);
    }

    // Feature filter
    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const whereClause = ' WHERE ' + where.join(' AND ');

    const totalSql = `
      SELECT COUNT(*) AS total
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
    `;

    try {
      const result = await pool.request().query(totalSql);
      const total = result.recordset[0]?.total ?? 0;
      return { total };
    } catch (err: any) {
      console.error('[SQL ERROR] countVehiclesRegistrationAssignment:', err.message);
      throw new InternalServerErrorException('Lỗi truy vấn dữ liệu đăng ký xe - Assignment');
    }
  }

  async countVehiclesRegistrationDriver({
    type = 'all',
    userId,
    filter,
    processFn,
    authority,
    authorId,
    effectiveUserId,
  }: {
    type?: string;
    userId: string;
    filter?: any;
    processFn?: string;
    receiverUnit?: string;
    authority?: boolean | string;
    authorId?: string;
    effectiveUserId?: string;
  }): Promise<{ total: number }> {
    const isAuthority = authority === true || authority === 'true';
    const effUserId = authorId || effectiveUserId;
    if (isAuthority && effUserId) {
      userId = effUserId;
    }

    const pool = await this.getPool();

    let featureManagement;
    if (processFn) {
      featureManagement = await this.featureManagementRepository.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });
    }

    // Build criteria
    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, joins: filterJoins, from } =
      buildVehicleRegistrationCriteriaHelper(
        [...featureCriteria, ...criteria],
        'vehicle_registrations',
        featureManagement,
      );

    const TYPES = ['all', 'pending', 'processed', 'processing', 'completed'] as const;
    const normalizedType = (type || 'all').toLowerCase();
    if (!TYPES.includes(normalizedType as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: TYPES,
      });
    }

    const where: string[] = [];
    where.push(`${from}.status = 1`);

    /** join tách tài xế từ JSON */
    const joinDriver = `
      OUTER APPLY OPENJSON(${from}.coordination_information)
      WITH (
        carId NVARCHAR(50) '$.carId',
        driverId NVARCHAR(50) '$.driverId'
      ) coord
      LEFT JOIN ${this.dbname}.list_cars lc
        ON lc.id = coord.carId
    `;

    const joinClause = `
      ${joinDriver}
      ${filterJoins || ''}
    `;

    /** driver hiện tại */
    where.push(`COALESCE(coord.driverId, lc.manager) = @userId`);

    /** trạng thái theo type */
    if (normalizedType === 'processing') {
      where.push(`${from}.vehicle_state = '${VehicleState.TRONG_TIEN_TRINH}'`);
    }
    if (normalizedType === 'completed') {
      where.push(`${from}.vehicle_state = '${VehicleState.HOAN_THANH}'`);
    }
    if (normalizedType === 'pending') {
      where.push(`
        (
          ${from}.confirmed_driver_ids IS NULL
          OR NOT EXISTS (
            SELECT 1
            FROM OPENJSON(${from}.confirmed_driver_ids) c
            WHERE c.value = COALESCE(coord.driverId, lc.manager)
          )
        )
      `);
    }
    if (normalizedType === 'processed') {
      where.push(`
        EXISTS (
          SELECT 1
          FROM OPENJSON(${from}.confirmed_driver_ids) c
          WHERE c.value = COALESCE(coord.driverId, lc.manager)
        )
      `);
    }

    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const whereClause = ' WHERE ' + where.join(' AND ');

    const totalSql = `
      SELECT COUNT(DISTINCT ${from}.id) AS total
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
    `;

    try {
      const result = await pool.request().input('userId', userId).query(totalSql);
      const total = result.recordset[0]?.total ?? 0;
      return { total };
    } catch (err: any) {
      console.error('[SQL ERROR] countVehiclesRegistrationDriver:', err.message);
      throw new InternalServerErrorException('Lỗi truy vấn dữ liệu xe - Driver');
    }
  }








  //  // //
  async countFeedbackAll(params: { userId: string, role?: string, isAdmin?: boolean, isMine?: boolean }): Promise<{ total: number }> {
    return this.countFeedbackDynamic(params);
  }

  async countFeedbackWaitingDispatch(params: { userId: string, role?: string, isAdmin?: boolean, isMine?: boolean }): Promise<{ total: number }> {
    return this.countFeedbackDynamic({ ...params, processStatus: 1 });
  }

  async countFeedbackWaitingProcess(params: { userId: string, role?: string, isAdmin?: boolean, isMine?: boolean }): Promise<{ total: number }> {
    return this.countFeedbackDynamic({ ...params, processStatus: 2 });
  }

  async countFeedbackProcessing(params: { userId: string, role?: string, isAdmin?: boolean, isMine?: boolean }): Promise<{ total: number }> {
    return this.countFeedbackDynamic({ ...params, processStatus: 3 });
  }

  async countFeedbackCompleted(params: { userId: string, role?: string, isAdmin?: boolean, isMine?: boolean }): Promise<{ total: number }> {
    return this.countFeedbackDynamic({ ...params, processStatus: 4 });
  }

  async countFeedbackRejected(params: { userId: string, role?: string, isAdmin?: boolean, isMine?: boolean }): Promise<{ total: number }> {
    return this.countFeedbackDynamic({ ...params, processStatus: 5 });
  }

  async countMyFeedbackAll(params: { userId: string, role?: string, isAdmin?: boolean }): Promise<{ total: number }> {
    return this.countFeedbackDynamic({ ...params, isMine: true });
  }

  async countMyFeedbackWaitingDispatch(params: { userId: string, role?: string, isAdmin?: boolean }): Promise<{ total: number }> {
    return this.countFeedbackDynamic({ ...params, isMine: true, processStatus: 1 });
  }

  async countMyFeedbackWaitingProcess(params: { userId: string, role?: string, isAdmin?: boolean }): Promise<{ total: number }> {
    return this.countFeedbackDynamic({ ...params, isMine: true, processStatus: 2 });
  }

  async countMyFeedbackProcessing(params: { userId: string, role?: string, isAdmin?: boolean }): Promise<{ total: number }> {
    return this.countFeedbackDynamic({ ...params, isMine: true, processStatus: 3 });
  }

  async countMyFeedbackCompleted(params: { userId: string, role?: string, isAdmin?: boolean }): Promise<{ total: number }> {
    return this.countFeedbackDynamic({ ...params, isMine: true, processStatus: 4 });
  }

  async countMyFeedbackRejected(params: { userId: string, role?: string, isAdmin?: boolean }): Promise<{ total: number }> {
    return this.countFeedbackDynamic({ ...params, isMine: true, processStatus: 5 });
  }

  async countMyFeedbackCancelled(params: { userId: string, filter?: any }): Promise<{ total: number }> {
    return this.countFeedbackCancelled(params);
  }

  // ════════════════════════════════════════════════════════════════
  // Số đếm Mượn/Trả Hộ chiếu (Passport Requests)
  // ════════════════════════════════════════════════════════════════
  private async countPRDynamic({ status, userId }: { status?: string | string[] | null; userId: string }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const statusJson = status ? JSON.stringify(Array.isArray(status) ? status : [status]) : null;

    const userRes = await pool.request()
      .input('userId', userId)
      .query(`SELECT roles_by_process FROM users WITH (NOLOCK) WHERE id = @userId`);
    const rolesByProcessStr = userRes.recordset[0]?.roles_by_process;
    const userRoles: string[] = [];
    if (rolesByProcessStr) {
      try {
        const parsed = typeof rolesByProcessStr === 'string' ? JSON.parse(rolesByProcessStr) : rolesByProcessStr;
        parsed.forEach((rbp: any) => {
          if (rbp.processKey === 'PassportRequest') {
            (rbp.roles || []).forEach((r: any) => { if (r.roleCode) userRoles.push(r.roleCode); });
          }
        });
      } catch (e) { }
    }
    const userGroupRes = await pool.request()
      .input('userId', userId)
      .query(`SELECT group_user_id FROM ${this.dbname}.user_group_users WITH (NOLOCK) WHERE user_id = @userId`);
    const userGroupIds = (userGroupRes.recordset || [])
      .map((r: any) => String(r.group_user_id || '').trim())
      .filter(Boolean);
    const userGroupIdsSql = userGroupIds.map(id => `N'${id.replace(/'/g, "''")}'`).join(',');

    const userRolesCond = userRoles.length > 0
      ? `OR (wi.assignee_user_id IS NULL AND wi.role IN (${userRoles.map(r => `N'${r}'`).join(',')}))`
      : '';
    const userGroupsWorkItemCond = userGroupIds.length > 0
      ? `OR wi.assignee_user_id IN (${userGroupIdsSql})`
      : '';
    const userGroupsAuditCond = userGroupIds.length > 0
      ? `OR a.receiver IN (${userGroupIdsSql}) OR a.group_ IN (${userGroupIdsSql})`
      : '';

    const visibilityWhereSQL = `
      AND (
          r.created_by = @userId
          OR r.requester_id = @userId
          OR r.name_passport_request = @userId
          OR EXISTS (
              SELECT 1 FROM passport_delegation_items di WITH (NOLOCK)
              WHERE di.request_id = r.id AND di.user_id = @userId
          )
          OR EXISTS (
              SELECT 1 FROM work_items wi WITH (NOLOCK)
              WHERE wi.document_id = CAST(r.id AS varchar(64))
                AND wi.state = 'open'
                AND (wi.assignee_user_id = @userId ${userGroupsWorkItemCond})
                ${userRolesCond}
          )
          OR EXISTS (
              SELECT 1 FROM audit a WITH (NOLOCK)
              WHERE a.document_id = CAST(r.id AS nvarchar(64))
                AND a.type_document = 'PassportRequest'
                AND (a.user_id = @userId OR a.receiver = @userId ${userGroupsAuditCond})
          )
      )
    `;

    const query = `
      SELECT COUNT_BIG(1) AS total
      FROM passport_borrow_requests r WITH (NOLOCK)
      WHERE r.is_deleted = 0
      ${status ? `AND r.status IN (SELECT value FROM OPENJSON(@statusJson))` : ''}
      ${visibilityWhereSQL}
    `;

    const request = pool.request().input('userId', userId);
    if (statusJson) {
      request.input('statusJson', statusJson);
    }
    const rs = await request.query(query);

    return { total: Number(rs.recordset[0]?.total ?? 0) };
  }

  async countPRAllForApproval(params: { userId: string }): Promise<{ total: number }> {
    return this.countPRDynamic({ ...params, status: 'PENDING' });
  }

  async countPRWaitCommander(params: { userId: string }): Promise<{ total: number }> {
    return this.countPRDynamic({ ...params, status: 'WAIT_COMMANDER' });
  }

  async countPRWaitReceive(params: { userId: string }): Promise<{ total: number }> {
    return this.countPRDynamic({ ...params, status: ['WAIT_RECEIVE', 'WAIT_SIGN'] });
  }

  async countPRInUse(params: { userId: string }): Promise<{ total: number }> {
    return this.countPRDynamic({ ...params, status: 'IN_USE' });
  }

  async countPRCompleted(params: { userId: string }): Promise<{ total: number }> {
    return this.countPRDynamic({ ...params, status: 'COMPLETED' });
  }

  async countPRRejected(params: { userId: string }): Promise<{ total: number }> {
    return this.countPRDynamic({ ...params, status: 'REJECTED' });
  }

  async countPRCancelled(params: { userId: string }): Promise<{ total: number }> {
    return this.countPRDynamic({ ...params, status: 'CANCELLED' });
  }

  async countPRAll(params: { userId: string }): Promise<{ total: number }> {
    return this.countPRDynamic({ ...params, status: null });
  }

  // ════════════════════════════════════════════════════════════════
  // Số đếm Tin tức (News)
  // ════════════════════════════════════════════════════════════════

  /**
   * Đếm số lượng tin đang tạo (Nháp) của người dùng hiện tại
   */
  async countNewsDrafts({ userId }: { userId: string }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const rs = await pool.request()
      .input('userId', userId)
      .query(`SELECT COUNT_BIG(1) AS total FROM news WHERE authorId = @userId AND status = 2`);
    return { total: Number(rs.recordset[0]?.total ?? 0) };
  }

  /**
   * Đếm số lượng tin chờ duyệt (người dùng đã gửi đi duyệt)
   * Mirror chính xác logic của getNewsPendingApproval (news-workflow.service.ts):
   * - authorId = userId
   * - EXISTS audit với action_code = 'SUBMIT'
   * - Hành động gần nhất là 'SUBMIT'
   */
  async countNewsPendingApproval({ userId }: { userId: string }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const rs = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT COUNT_BIG(1) AS total FROM news n
        WHERE n.authorId = @userId
        AND EXISTS (
          SELECT 1 FROM audit a
          WHERE a.document_id = CAST(n.id AS VARCHAR(50))
            AND a.action_code = 'SUBMIT'
            AND a.type_document = 'NEWS'
        )
        AND 'SUBMIT' = (
          SELECT TOP 1 a2.action_code
          FROM audit a2
          WHERE a2.document_id = CAST(n.id AS VARCHAR(50))
            AND a2.type_document = 'NEWS'
          ORDER BY a2.created_at DESC, a2.id DESC
        )
      `);
    return { total: Number(rs.recordset[0]?.total ?? 0) };
  }

  /**
   * Đếm số lượng toàn bộ tin đã được xuất bản (đã duyệt, không bị thu hồi)
   */
  async countNewsPublished({ userId }: { userId: string }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const rs = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT COUNT_BIG(1) AS total FROM news n
        WHERE EXISTS ( SELECT 1 FROM audit a WHERE a.document_id = CAST(n.id AS VARCHAR(50)) AND a.action_code = 'DUYET' AND a.type_document = 'NEWS' )
        AND NOT EXISTS ( SELECT 1 FROM audit a WHERE a.document_id = CAST(n.id AS VARCHAR(50)) AND a.action_code = 'RECALL' AND a.type_document = 'NEWS' )
      `);
    return { total: Number(rs.recordset[0]?.total ?? 0) };
  }

  /**
   * Đếm số lượng tin đã xuất bản của tôi (Tôi là tác giả)
   * Mirror chính xác getNewsPublished với filter[isMyNews]=false (news-workflow.service.ts):
   * - isMyNews='false' → thêm điều kiện authorId = userId
   * - EXISTS audit action_code = 'DUYET'
   * - NOT EXISTS audit action_code = 'RECALL'
   */
  async countNewsMyPublished({ userId }: { userId: string }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const rs = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT COUNT_BIG(1) AS total FROM news n
        WHERE n.authorId = @userId
        AND EXISTS (
          SELECT 1 FROM audit a
          WHERE a.document_id = CAST(n.id AS VARCHAR(50))
            AND a.action_code = 'DUYET'
            AND a.type_document = 'NEWS'
        )
        AND NOT EXISTS (
          SELECT 1 FROM audit a
          WHERE a.document_id = CAST(n.id AS VARCHAR(50))
            AND a.action_code = 'RECALL'
            AND a.type_document = 'NEWS'
        )
      `);
    return { total: Number(rs.recordset[0]?.total ?? 0) };
  }

  /**
   * Đếm số lượng tin đã duyệt của tôi (Tôi là người duyệt dspdt)
   */
  async countNewsApprovedByMe({ userId }: { userId: string }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const rs = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT COUNT_BIG(1) AS total FROM news n
        WHERE EXISTS ( SELECT 1 FROM audit a WHERE a.document_id = CAST(n.id AS VARCHAR(50)) AND a.action_code = 'DUYET' AND a.type_document = 'NEWS' AND a.created_by = @userId)
        AND NOT EXISTS ( SELECT 1 FROM audit a WHERE a.document_id = CAST(n.id AS VARCHAR(50)) AND a.action_code = 'RECALL' AND a.type_document = 'NEWS' )
      `);
    return { total: Number(rs.recordset[0]?.total ?? 0) };
  }

  /**
   * Đếm số lượng tin của mình đã bị trả lại (chưa nộp lại)
   * Mirror chính xác getNewsReturned (news-workflow.service.ts):
   * - authorId = userId
   * - status NOT IN (3)
   * - CROSS APPLY tìm action_code gần nhất = 'TRA_LAI'
   */
  async countNewsReturned({ userId }: { userId: string }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const rs = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT COUNT_BIG(1) AS total
        FROM news n WITH (NOLOCK)
        CROSS APPLY (
          SELECT TOP 1 a.action_code
          FROM audit a WITH (NOLOCK)
          WHERE a.document_id = CAST(n.id AS NVARCHAR(64))
            AND a.type_document = 'NEWS'
          ORDER BY a.created_at DESC, a.id DESC
        ) latest_audit
        WHERE n.authorId = @userId
          AND n.status NOT IN (3)
          AND latest_audit.action_code = 'TRA_LAI'
      `);
    return { total: Number(rs.recordset[0]?.total ?? 0) };
  }

  /**
   * Đếm số lượng tin của mình đã bị hủy
   * Mirror chính xác getNewsCancelled (news-workflow.service.ts):
   * - authorId = userId
   * - EXISTS audit action_code = 'HUY_TIN'
   */
  async countNewsCancelled({ userId }: { userId: string }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const rs = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT COUNT_BIG(1) AS total FROM news n
        WHERE n.authorId = @userId
        AND EXISTS (
          SELECT 1 FROM audit a
          WHERE a.document_id = CAST(n.id AS VARCHAR(50))
            AND a.action_code = 'HUY_TIN'
            AND a.type_document = 'NEWS'
        )
      `);
    return { total: Number(rs.recordset[0]?.total ?? 0) };
  }

  /**
   * Đếm số lượng toàn bộ tin đã bị thu hồi
   */
  async countNewsRecalled({ userId }: { userId: string }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const rs = await pool.request()
      .query(`
        SELECT COUNT_BIG(1) AS total FROM news n
        WHERE EXISTS ( SELECT 1 FROM audit a WHERE a.document_id = CAST(n.id AS VARCHAR(50)) AND a.action_code = 'RECALL' AND a.type_document = 'NEWS' )
      `);
    return { total: Number(rs.recordset[0]?.total ?? 0) };
  }

  /**
   * Đếm số lượng tin của CỦA MÌNH đã bị thu hồi
   */
  async countNewsRecalledByUser({ userId }: { userId: string }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const rs = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT COUNT_BIG(1) AS total FROM news n
        WHERE n.authorId = @userId
        AND EXISTS ( SELECT 1 FROM audit a WHERE a.document_id = CAST(n.id AS VARCHAR(50)) AND a.action_code = 'RECALL' AND a.type_document = 'NEWS' )
      `);
    return { total: Number(rs.recordset[0]?.total ?? 0) };
  }

  /**
   * Đếm số lượng tin đang CHỜ MÌNH PHÊ DUYỆT (gửi đích danh cho mình)
   */
  async countNewsWaitingMyApproval({ userId }: { userId: string }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const rs = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT COUNT_BIG(1) AS total FROM news n
        WHERE CAST(n.id AS VARCHAR(50)) IN (
          SELECT document_id
          FROM (
            SELECT document_id, action_code, receiver, 
                   ROW_NUMBER() OVER (PARTITION BY document_id ORDER BY created_at DESC, id DESC) as rn
            FROM audit
            WHERE type_document = 'NEWS' 
              AND (receiver = @userId OR created_by = @userId) 
              AND action_code IN ('SUBMIT', 'DUYET', 'TRA_LAI')
          ) ranked
          WHERE rn = 1 AND action_code = 'SUBMIT' AND receiver = @userId
        )
        AND n.status = 1
        AND (n.rejectedAt IS NULL OR n.submittedAt > n.rejectedAt)
      `);
    return { total: Number(rs.recordset[0]?.total ?? 0) };
  }

  /**
   * Đếm số lượng yêu cầu hộ chiếu CỦA TÔI đang CHỜ PHÊ DUYỆT
   */
  async countMyPassportPending({ userId }: { userId: string }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const visibilityJoinSQL = `
        INNER JOIN (
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.created_by = @userId
            UNION
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.requester_id = @userId
            UNION
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.name_passport_request = @userId
            UNION
            SELECT CAST(request_id AS nvarchar(50)) as id FROM passport_delegation_items di WITH (NOLOCK) WHERE di.user_id = @userId
        ) AS visible ON r.id = visible.id
    `;
    const rs = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT COUNT_BIG(1) AS total 
        FROM passport_borrow_requests r WITH (NOLOCK)
        ${visibilityJoinSQL}
        WHERE r.is_deleted = 0 AND r.status = 'PENDING'
      `);
    return { total: Number(rs.recordset[0]?.total ?? 0) };
  }

  /**
   * Đếm số lượng yêu cầu hộ chiếu CỦA TÔI đang CHỜ CHỈ HUY
   */
  async countMyPassportWaitCommander({ userId }: { userId: string }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const visibilityJoinSQL = `
        INNER JOIN (
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.created_by = @userId
            UNION
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.requester_id = @userId
            UNION
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.name_passport_request = @userId
            UNION
            SELECT CAST(request_id AS nvarchar(50)) as id FROM passport_delegation_items di WITH (NOLOCK) WHERE di.user_id = @userId
        ) AS visible ON r.id = visible.id
    `;
    const rs = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT COUNT_BIG(1) AS total 
        FROM passport_borrow_requests r WITH (NOLOCK)
        ${visibilityJoinSQL}
        WHERE r.is_deleted = 0 AND r.status = 'WAIT_COMMANDER'
      `);
    return { total: Number(rs.recordset[0]?.total ?? 0) };
  }

  /**
   * Đếm số lượng yêu cầu hộ chiếu CỦA TÔI đang CHỜ TIẾP NHẬN
   */
  async countMyPassportWaitReceive({ userId }: { userId: string }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const visibilityJoinSQL = `
        INNER JOIN (
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.created_by = @userId
            UNION
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.requester_id = @userId
            UNION
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.name_passport_request = @userId
            UNION
            SELECT CAST(request_id AS nvarchar(50)) as id FROM passport_delegation_items di WITH (NOLOCK) WHERE di.user_id = @userId
        ) AS visible ON r.id = visible.id
    `;
    const rs = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT COUNT_BIG(1) AS total 
        FROM passport_borrow_requests r WITH (NOLOCK)
        ${visibilityJoinSQL}
        WHERE r.is_deleted = 0 AND r.status IN ('WAIT_RECEIVE', 'WAIT_SIGN')
      `);
    return { total: Number(rs.recordset[0]?.total ?? 0) };
  }

  /**
   * Đếm số lượng yêu cầu hộ chiếu CỦA TÔI ĐANG SỬ DỤNG
   */
  async countMyPassportInUse({ userId }: { userId: string }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const visibilityJoinSQL = `
        INNER JOIN (
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.created_by = @userId
            UNION
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.requester_id = @userId
            UNION
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.name_passport_request = @userId
            UNION
            SELECT CAST(request_id AS nvarchar(50)) as id FROM passport_delegation_items di WITH (NOLOCK) WHERE di.user_id = @userId
        ) AS visible ON r.id = visible.id
    `;
    const rs = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT COUNT_BIG(1) AS total 
        FROM passport_borrow_requests r WITH (NOLOCK)
        ${visibilityJoinSQL}
        WHERE r.is_deleted = 0 AND r.status = 'IN_USE'
      `);
    return { total: Number(rs.recordset[0]?.total ?? 0) };
  }

  /**
   * Đếm số lượng yêu cầu hộ chiếu CỦA TÔI đã HOÀN TẤT
   */
  async countMyPassportCompleted({ userId }: { userId: string }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const visibilityJoinSQL = `
        INNER JOIN (
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.created_by = @userId
            UNION
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.requester_id = @userId
            UNION
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.name_passport_request = @userId
            UNION
            SELECT CAST(request_id AS nvarchar(50)) as id FROM passport_delegation_items di WITH (NOLOCK) WHERE di.user_id = @userId
        ) AS visible ON r.id = visible.id
    `;
    const rs = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT COUNT_BIG(1) AS total 
        FROM passport_borrow_requests r WITH (NOLOCK)
        ${visibilityJoinSQL}
        WHERE r.is_deleted = 0 AND r.status = 'COMPLETED'
      `);
    return { total: Number(rs.recordset[0]?.total ?? 0) };
  }

  /**
   * Đếm số lượng yêu cầu hộ chiếu CỦA TÔI bị TỪ CHỐI
   */
  async countMyPassportRejected({ userId }: { userId: string }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const visibilityJoinSQL = `
        INNER JOIN (
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.created_by = @userId
            UNION
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.requester_id = @userId
            UNION
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.name_passport_request = @userId
            UNION
            SELECT CAST(request_id AS nvarchar(50)) as id FROM passport_delegation_items di WITH (NOLOCK) WHERE di.user_id = @userId
        ) AS visible ON r.id = visible.id
    `;
    const rs = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT COUNT_BIG(1) AS total 
        FROM passport_borrow_requests r WITH (NOLOCK)
        ${visibilityJoinSQL}
        WHERE r.is_deleted = 0 AND r.status = 'REJECTED'
      `);
    return { total: Number(rs.recordset[0]?.total ?? 0) };
  }

  /**
   * Đếm số lượng yêu cầu hộ chiếu CỦA TÔI đã HỦY
   */
  async countMyPassportCancelled({ userId }: { userId: string }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const visibilityJoinSQL = `
        INNER JOIN (
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.created_by = @userId
            UNION
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.requester_id = @userId
            UNION
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.name_passport_request = @userId
            UNION
            SELECT CAST(request_id AS nvarchar(50)) as id FROM passport_delegation_items di WITH (NOLOCK) WHERE di.user_id = @userId
        ) AS visible ON r.id = visible.id
    `;
    const rs = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT COUNT_BIG(1) AS total 
        FROM passport_borrow_requests r WITH (NOLOCK)
        ${visibilityJoinSQL}
        WHERE r.is_deleted = 0 AND r.status = 'CANCELLED'
      `);
    return { total: Number(rs.recordset[0]?.total ?? 0) };
  }

  /**
   * Đếm TẤT CẢ yêu cầu hộ chiếu CỦA TÔI — khớp với findAllMine
   */
  async countMyPassportAll({ userId }: { userId: string }): Promise<{ total: number }> {
    const pool = await this.getPool();
    const visibilityJoinSQL = `
        INNER JOIN (
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.created_by = @userId
            UNION
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.requester_id = @userId
            UNION
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.name_passport_request = @userId
            UNION
            SELECT CAST(request_id AS nvarchar(50)) as id FROM passport_delegation_items di WITH (NOLOCK) WHERE di.user_id = @userId
        ) AS visible ON r.id = visible.id
    `;
    const rs = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT COUNT_BIG(1) AS total
        FROM passport_borrow_requests r WITH (NOLOCK)
        ${visibilityJoinSQL}
        WHERE r.is_deleted = 0
      `);
    return { total: Number(rs.recordset[0]?.total ?? 0) };
  }

  /**
   * Tổng hợp các số đếm trạng thái CỦA TÔI (Mine) — khớp với findAllMine
   */
  async countPRStatusMine({ userId }: { userId: string }): Promise<Record<string, number>> {
    const pool = await this.getPool();
    const visibilityJoinSQL = `
        INNER JOIN (
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.created_by = @userId
            UNION
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.requester_id = @userId
            UNION
            SELECT id FROM passport_borrow_requests p WITH (NOLOCK) WHERE p.name_passport_request = @userId
            UNION
            SELECT CAST(request_id AS nvarchar(50)) as id FROM passport_delegation_items di WITH (NOLOCK) WHERE di.user_id = @userId
        ) AS visible ON r.id = visible.id
    `;
    const rs = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT r.status, COUNT_BIG(1) AS cnt
        FROM passport_borrow_requests r WITH (NOLOCK)
        ${visibilityJoinSQL}
        WHERE r.is_deleted = 0
        GROUP BY r.status
      `);

    const result: Record<string, number> = {};
    let totalAll = 0;
    for (const row of rs.recordset) {
      const count = Number(row.cnt ?? 0);
      result[row.status] = count;
      totalAll += count;
    }
    result['all'] = totalAll;
    result['total'] = totalAll;

    return result;
  }

  // ─── PASSPORT COUNT FUNCTIONS ──────────────────────────────────────────────

  /**
   * Helper đếm hộ chiếu theo usage_status và điều kiện lọc
   */
  private async getPassportCountByStatus(
    usageStatus?: 'STORING' | 'IN_USE' | null,
    params?: any,
  ): Promise<{ total: number }> {
    const pool = await this.getPool();
    const req = pool.request();
    let where = 'WHERE is_deleted = 0';

    if (usageStatus) {
      where += ` AND usage_status = '${usageStatus}'`;
    }

    const expiryStatus =
      params?.filter?.expiryStatus ||
      params?.rawFilter?.expiryStatus ||
      params?.expiryStatus;

    if (expiryStatus === 'qua_han') {
      where += ` AND expiry_date < CAST(GETDATE() AS DATE)`;
    } else if (expiryStatus === 'sap_het_han') {
      where += ` AND expiry_date >= CAST(GETDATE() AS DATE) AND expiry_date <= DATEADD(month, 6, CAST(GETDATE() AS DATE))`;
    } else if (expiryStatus === 'con_han') {
      where += ` AND expiry_date > DATEADD(month, 6, CAST(GETDATE() AS DATE))`;
    }

    if (params?.q) {
      req.input('q', `%${String(params.q).trim()}%`);
      where += ` AND (full_name LIKE @q OR passport_number LIKE @q OR eoffice_account LIKE @q OR identification_card LIKE @q OR phone_number LIKE @q)`;
    }

    const rs = await req.query(`
      SELECT COUNT_BIG(1) AS total
      FROM passports WITH (NOLOCK)
      ${where}
    `);

    return { total: Number(rs.recordset[0]?.total ?? 0) };
  }

  /**
   * 1. Đếm danh sách tất cả hộ chiếu (processFn = dshochieu)
   */
  async dshochieu(params?: any): Promise<{ total: number }> {
    return this.getPassportCountByStatus(null, params);
  }

  /**
   * 2. Đếm danh sách hộ chiếu đang lưu trữ (processFn = dsDangLuuTruHoChieu)
   */
  async dsDangLuuTruHoChieu(params?: any): Promise<{ total: number }> {
    return this.getPassportCountByStatus('STORING', params);
  }

  /**
   * 3. Đếm danh sách hộ chiếu đang sử dụng (processFn = dsHoChieuDangSuDung)
   */
  async dsHoChieuDangSuDung(params?: any): Promise<{ total: number }> {
    return this.getPassportCountByStatus('IN_USE', params);
  }
}
