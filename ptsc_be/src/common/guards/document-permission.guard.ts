import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { POSITION_LEVEL } from 'src/variables/CONST_STATUS';
import { UsersService } from 'src/users/users.service';
import { ModuleRef } from '@nestjs/core';
import { MeetingPermissionService } from 'src/meeting/meeting-permission.service';
import { checkAdminPermission } from 'src/common/guards/admin-check.helper';
import { getMssqlPool } from 'src/database/mssql.pool';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';

@Injectable()
export class DocumentPermissionGuard implements CanActivate {
  private readonly logger = new Logger(DocumentPermissionGuard.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly moduleRef: ModuleRef,
    private readonly configService: ConfigService,
  ) { }

  private async hasOutgoingSyncPermission(documentId: string, userId: string): Promise<boolean> {
    if (!documentId || !userId) return false;
    try {
      const pool = await getMssqlPool(this.configService);
      const result = await pool.request()
        .input('documentId', sql.NVarChar(100), String(documentId))
        .input('userId', sql.NVarChar(100), String(userId))
        .query(`
          SELECT TOP 1 1 AS hasPermission
          FROM document_permissions_outgoing WITH (NOLOCK)
          WHERE target_document_id = @documentId
            AND (
              target_user_id = @userId
              OR CONVERT(NVARCHAR(100), source_personal_profile_id) = @userId
            )
        `);
      return Array.isArray(result.recordset) && result.recordset.length > 0;
    } catch (error) {
      this.logger.warn(
        `[DocumentPermissionGuard] Failed to check document_permissions_outgoing for doc=${documentId}, user=${userId}: ${error?.message || error}`,
      );
      return false;
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Lấy userId từ request
    const user = request.user || request.effectiveUser;
    const userId = user?.userId || request.userId;

    // Lấy ID văn bản từ params, body, hoặc query
    const documentId =
      request.params?.id ||
      request.body?.id ||
      request.query?.id ||
      request.params?.documentId ||
      request.body?.documentId ||
      request.query?.documentId ||
      request.params?.object_id ||
      request.body?.object_id ||
      request.query?.object_id ||
      request.params?.docId ||
      request.body?.docId ||
      request.query?.docId ||
      request.params?.incomingId ||
      request.body?.incomingId ||
      request.query?.incomingId;



    if (!userId) {
      throw new UnauthorizedException(
        'Người dùng chưa đăng nhập hoặc phiên làm việc hết hạn',
      );
    }

    const isAdmin = await checkAdminPermission(userId).catch(() => false);
    if (isAdmin) {
      return true;
    }


    if (!documentId) {
      throw new ForbiddenException(
        'Không tìm thấy ID để kiểm tra quyền',
      );
    }



    try {
      const objectType =
        request.params?.object_type ||
        request.body?.object_type ||
        request.query?.object_type ||
        request.params?.type ||
        request.body?.type ||
        request.query?.type;

      let hasAccess = false;
      if (objectType === 'meeting') {
        const meetingPermissionService = this.moduleRef.get(MeetingPermissionService, { strict: false });
        hasAccess = await meetingPermissionService.checkView(userId, documentId);
      } else if (objectType === 'scanPassport') {
        hasAccess = await this.checkPassportEntityPermission(documentId, userId);
      } else if (objectType === 'passportFile' || objectType === 'ppResultTripFile') {
        hasAccess = await this.checkPassportRequestEntityPermission(documentId, userId);
      } else if (objectType === 'delegation') {
        hasAccess = await this.checkAuthorityDocumentEntityPermission(documentId, userId);
      } else {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(documentId)) {
          const checkMeetingSql = `SELECT TOP 1 1 as isMeeting FROM meetings WITH (NOLOCK) WHERE id = @0`;
          const meetingResult = await this.usersService.userRepository.query(checkMeetingSql, [documentId]).catch(() => []);
          if (Array.isArray(meetingResult) && meetingResult.length > 0) {
            const meetingPermissionService = this.moduleRef.get(MeetingPermissionService, { strict: false });
            hasAccess = await meetingPermissionService.checkView(userId, documentId);
          } else {
            hasAccess = await this.usersService.checkDocumentPermission(documentId, userId);
          }
        } else {
          hasAccess = await this.usersService.checkDocumentPermission(documentId, userId);
        }
      }

      if (!hasAccess) {
        hasAccess = await this.usersService.hasOutgoingNextStageNotificationAccess(documentId, userId);
      }

      if (!hasAccess) {
        hasAccess = await this.hasOutgoingSyncPermission(String(documentId), String(userId));
      }

      // this.logger.log(
      //   `[DocumentPermissionGuard] userId=${userId}, documentId=${documentId}, objectType=${objectType || 'document'}, hasAccess=${hasAccess}`,
      // );

      if (hasAccess) {
        return true;
      }

      console.warn(`[DocumentPermissionGuard] ❌ User ${userId} denied access to document ${documentId}`);
      throw new ForbiddenException('Bạn không có quyền xem thông tin này.');
    } catch (error) {
      console.log('error', error)
      if (error instanceof ForbiddenException) throw error;

      console.error('[DocumentPermissionGuard] Error:', error);
      throw new ForbiddenException('Bạn không có quyền xem thông tin này.');
    }
  }

  /**
   * Kiểm tra quyền truy cập đối với Yêu cầu mượn hộ chiếu (PassportRequest)
   * 
   * Luồng kiểm tra bao gồm:
   * 1. Kiểm tra Admin: Nếu người dùng có chức danh Admin, tự động cho phép truy cập (Bypass).
   * 2. Kiểm tra Luồng (Flow): Nếu người dùng có vai trò tham gia trong luồng quy trình 'PassportRequest' (kiểm tra nhanh qua BPMN Lanes), cho phép truy cập.
   * 3. Kiểm tra Dữ liệu (Database): Thực hiện truy vấn SQL Server để xác định xem người dùng có liên quan trực tiếp đến bản ghi này hay không:
   *    - Là người tạo, người yêu cầu, hoặc người đứng tên trong yêu cầu mượn.
   *    - Là người được ủy quyền xử lý chi tiết (trong bảng passport_delegation_items).
   *    - Có trong lịch sử xử lý tài liệu (bảng audit) với tư cách là người gửi, người nhận, người xử lý...
   *    - Có công việc liên quan (bảng work_items) chưa xử lý hoặc đã được giao.
   */
  async checkPassportRequestEntityPermission(requestId: string, userId: string): Promise<boolean> {
    if (!requestId || !userId) return false;

    // 1. Kiểm tra tài khoản Admin để cho phép truy cập trực tiếp
    const userDetail = await this.usersService.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'position', 'role'],
    });
    if (userDetail) {
      const isAdmin =
        (userDetail.position && POSITION_LEVEL[userDetail.position] === POSITION_LEVEL.Admin);
      if (isAdmin) return true;
    }

    // 2. Kiểm tra xem người dùng có nằm trong luồng xử lý PassportRequest hay không
    const inFlow = await this.usersService.isUserInFlowQuick(userId, 'PassportRequest');
    if (inFlow) return true;

    // 3. Truy vấn cơ sở dữ liệu để kiểm tra quyền sở hữu hoặc sự tham gia trực tiếp
    try {
      // Lấy danh sách nhóm của user
      const groupRows = await this.usersService.userRepository.query(
        `SELECT group_user_id FROM user_group_users WITH (NOLOCK) WHERE user_id = @0`,
        [userId],
      ).catch(() => []);
      const userGroupIds = groupRows.map((r: any) => String(r.group_user_id || '').trim()).filter(Boolean);

      // Lấy danh sách vai trò quy trình (PassportRequest/QT_MTHC) của user
      const userRows = await this.usersService.userRepository.query(
        `SELECT roles_by_process AS rolesByProcess FROM users WITH (NOLOCK) WHERE id = @0`,
        [userId],
      ).catch(() => []);
      const rolesByProcessStr = userRows[0]?.rolesByProcess;
      const userRoles: string[] = [];
      if (rolesByProcessStr) {
        try {
          const rbp = typeof rolesByProcessStr === 'string' ? JSON.parse(rolesByProcessStr) : rolesByProcessStr;
          if (Array.isArray(rbp)) {
            rbp.forEach((p: any) => {
              if (p.processKey === 'PassportRequest' || p.processKey === 'QT_MTHC') {
                (p.roles || []).forEach((r: any) => {
                  if (r.roleCode) userRoles.push(r.roleCode);
                });
              }
            });
          }
        } catch (e) {
          this.logger.warn(`Failed to parse rolesByProcess for user ${userId}: ${e.message}`);
        }
      }

      // Xây dựng điều kiện group cho audit và work_items
      const userGroupIdsSql = userGroupIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',');
      const groupAuditCond = userGroupIds.length > 0
        ? ` OR receiver IN (${userGroupIdsSql}) OR group_ IN (${userGroupIdsSql})`
        : '';
      const groupWorkItemCond = userGroupIds.length > 0
        ? ` OR assignee_user_id IN (${userGroupIdsSql})`
        : '';

      // Xây dựng điều kiện role cho work_items (chỉ khi assignee_user_id là null)
      const userRolesSql = userRoles.map(r => `N'${r.replace(/'/g, "''")}'`).join(',');
      const roleWorkItemCond = userRoles.length > 0
        ? ` OR (assignee_user_id IS NULL AND role IN (${userRolesSql}))`
        : '';

      const sql = `
        SELECT TOP 1 1 AS ok FROM (
          SELECT 1 AS ok FROM passport_borrow_requests WITH (NOLOCK)
          WHERE id = @0 AND (created_by = @1 OR requester_id = @1 OR name_passport_request = @1)

          UNION ALL

          SELECT 1 AS ok FROM passport_delegation_items WITH (NOLOCK)
          WHERE request_id = @0 AND user_id = @1

          UNION ALL

          SELECT 1 AS ok FROM audit WITH (NOLOCK)
          WHERE document_id = @0 AND type_document = 'PassportRequest'
            AND (user_id = @1 OR created_by = @1 OR receiver = @1 OR processed_by = @1 OR acting_as = @1${groupAuditCond})

          UNION ALL

          SELECT 1 AS ok FROM work_items WITH (NOLOCK)
          WHERE document_id = @0 AND (assignee_user_id = @1${groupWorkItemCond}${roleWorkItemCond})
        ) t
      `;

      const result = await this.usersService.userRepository.query(sql, [requestId, userId]);
      return Array.isArray(result) && result.length > 0;
    } catch (error) {
      this.logger.error(`Error in checkPassportRequestEntityPermission for user ${userId} and request ${requestId}:`, error);
      return false;
    }
  }

  /**
   * Kiểm tra quyền truy cập đối với thực thể Hộ chiếu (Passport)
   * 
   * Luồng kiểm tra bao gồm:
   * 1. Kiểm tra Admin: Nếu người dùng có chức danh Admin, tự động cho phép truy cập (Bypass).
   * 2. Kiểm tra Luồng (Flow): Nếu người dùng có vai trò tham gia trong luồng Quản lý Hộ chiếu 'QT_MTHC', cho phép truy cập.
   * 3. Kiểm tra Dữ liệu (Database): Thực hiện truy vấn SQL Server để xác định xem người dùng có liên quan trực tiếp đến hộ chiếu này hay không:
   *    - Là chủ sở hữu hộ chiếu (trùng tài khoản eOffice hoặc mã nhân viên).
   *    - Có liên quan đến bất kỳ yêu cầu mượn hộ chiếu nào (đang hoạt động) sử dụng hộ chiếu này. Cụ thể, người dùng có thể là người tạo/yêu cầu/ủy quyền của yêu cầu mượn đó, hoặc là người có lịch sử xử lý (audit/work_items) liên quan đến yêu cầu mượn hộ chiếu này.
   */
  async checkPassportEntityPermission(passportId: string, userId: string): Promise<boolean> {
    if (!passportId || !userId) return false;

    // 1. Kiểm tra tài khoản Admin để cho phép truy cập trực tiếp
    const userDetail = await this.usersService.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'position', 'role'],
    });
    if (userDetail) {
      const isAdmin = (userDetail.position && POSITION_LEVEL[userDetail.position] === POSITION_LEVEL.Admin);
      if (isAdmin) return true;
    }

    // 2. Kiểm tra xem người dùng có nằm trong luồng xử lý quản lý hộ chiếu (QT_MTHC) hay không
    const inFlow = await this.usersService.isUserInFlowQuick(userId, 'QT_MTHC');
    if (inFlow) return true;

    // 3. Truy vấn cơ sở dữ liệu để kiểm tra quyền sở hữu hộ chiếu hoặc mối liên hệ qua các yêu cầu mượn liên quan
    try {
      // Lấy danh sách nhóm của user
      const groupRows = await this.usersService.userRepository.query(
        `SELECT group_user_id FROM user_group_users WITH (NOLOCK) WHERE user_id = @0`,
        [userId],
      ).catch(() => []);
      const userGroupIds = groupRows.map((r: any) => String(r.group_user_id || '').trim()).filter(Boolean);

      // Lấy danh sách vai trò quy trình (PassportRequest/QT_MTHC) của user
      const userRows = await this.usersService.userRepository.query(
        `SELECT roles_by_process AS rolesByProcess FROM users WITH (NOLOCK) WHERE id = @0`,
        [userId],
      ).catch(() => []);
      const rolesByProcessStr = userRows[0]?.rolesByProcess;
      const userRoles: string[] = [];
      if (rolesByProcessStr) {
        try {
          const rbp = typeof rolesByProcessStr === 'string' ? JSON.parse(rolesByProcessStr) : rolesByProcessStr;
          if (Array.isArray(rbp)) {
            rbp.forEach((p: any) => {
              if (p.processKey === 'PassportRequest' || p.processKey === 'QT_MTHC') {
                (p.roles || []).forEach((r: any) => {
                  if (r.roleCode) userRoles.push(r.roleCode);
                });
              }
            });
          }
        } catch (e) {
          this.logger.warn(`Failed to parse rolesByProcess for user ${userId}: ${e.message}`);
        }
      }

      // Xây dựng điều kiện group cho audit và work_items
      const userGroupIdsSql = userGroupIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',');
      const groupAuditCond = userGroupIds.length > 0
        ? ` OR receiver IN (${userGroupIdsSql}) OR group_ IN (${userGroupIdsSql})`
        : '';
      const groupWorkItemCond = userGroupIds.length > 0
        ? ` OR assignee_user_id IN (${userGroupIdsSql})`
        : '';

      // Xây dựng điều kiện role cho work_items (chỉ khi assignee_user_id là null)
      const userRolesSql = userRoles.map(r => `N'${r.replace(/'/g, "''")}'`).join(',');
      const roleWorkItemCond = userRoles.length > 0
        ? ` OR (assignee_user_id IS NULL AND role IN (${userRolesSql}))`
        : '';

      const sql = `
        SELECT TOP 1 1 AS ok FROM (
          SELECT 1 AS ok FROM passports WITH (NOLOCK)
          WHERE id = @0 AND (eoffice_account = @1 OR user_id = @1)

          UNION ALL

          SELECT 1 AS ok FROM passport_borrow_requests r WITH (NOLOCK)
          LEFT JOIN passport_delegation_items di WITH (NOLOCK) ON di.request_id = r.id
          WHERE r.is_deleted = 0 
            AND (r.passport_id = @0 OR di.passport_id = @0)
            AND (
              r.created_by = @1
              OR r.requester_id = @1
              OR r.name_passport_request = @1
              OR di.user_id = @1
              OR r.id IN (SELECT CAST(document_id AS nvarchar(50)) FROM audit WITH (NOLOCK) WHERE type_document = 'PassportRequest' AND (user_id = @1 OR created_by = @1 OR receiver = @1 OR processed_by = @1 OR acting_as = @1${groupAuditCond}))
              OR r.id IN (SELECT CAST(document_id AS nvarchar(50)) FROM work_items WITH (NOLOCK) WHERE assignee_user_id = @1${groupWorkItemCond}${roleWorkItemCond})
            )
        ) t
      `;

      const result = await this.usersService.userRepository.query(sql, [passportId, userId]);
      return Array.isArray(result) && result.length > 0;
    } catch (error) {
      this.logger.error(`Error in checkPassportEntityPermission for user ${userId} and passport ${passportId}:`, error);
      return false;
    }
  }

  /**
   * Kiểm tra quyền truy cập đối với Văn bản ủy quyền (Delegation)
   * 
   * Người dùng có quyền xem nếu:
   * 1. Là người ủy quyền (author).
   * 2. Là người được ủy quyền (authorized) và thời gian hiện tại nằm trong khoảng [start_date, end_date].
   */
  async checkAuthorityDocumentEntityPermission(delegationId: string, userId: string): Promise<boolean> {
    if (!delegationId || !userId) return false;

    // Truy vấn cơ sở dữ liệu để kiểm tra quyền hạn của userId
    const sql = `
      SELECT TOP 1 1 AS ok 
      FROM authority_documents WITH (NOLOCK)
      WHERE id = @0 
        AND (
          author = @1
          OR (
            authorized = @1
            AND (start_date IS NULL OR GETDATE() >= start_date)
            AND (end_date IS NULL OR GETDATE() <= end_date)
          )
        )
    `;
    try {
      const result = await this.usersService.userRepository.query(sql, [delegationId, userId]);
      return Array.isArray(result) && result.length > 0;
    } catch (error) {
      this.logger.error(`Error in checkAuthorityDocumentEntityPermission for user ${userId} and delegation ${delegationId}:`, error);
      return false;
    }
  }
}
