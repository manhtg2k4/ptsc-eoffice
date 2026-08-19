import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * RecordScopeAccessService - Kiểm tra quyền truy cập bản ghi
 * 
 * Nguyên tắc đơn giản: Bản ghi ở danh sách nào của người nào thì người đó có quyền xem.
 * 
 * Logic: Dùng CHUNG một query duy nhất kiểm tra bản ghi có thuộc BẤT KỲ danh sách nào
 * của user không (draft, pending, published, returned, cancelled, recalled, waiting approval).
 * Nếu có → cho phép. Nếu không → chặn.
 * 
 * Tối ưu: 
 * - 1 query duy nhất thay vì nhiều subquery phức tạp
 * - Không parse BPMN XML
 * - Không join bảng work_items hay audit nhiều lần
 */
@Injectable()
export class RecordScopeAccessService {
  private readonly logger = new Logger(RecordScopeAccessService.name);

  constructor(
    @InjectDataSource('mssqlConnection')
    private readonly dataSource: DataSource,
  ) { }

  /**
   * Kiểm tra user có quyền xem bản ghi không
   * Logic: Bản ghi ở danh sách nào của ai thì người đó được xem
   */
  async canAccessRecord(params: {
    moduleName: string;
    documentId: string;
    userId: string;
  }): Promise<boolean> {
    const { moduleName, documentId, userId } = params;

    if (moduleName === 'News') {
      return this.canAccessNewsRecord(documentId, userId);
    }

    if (moduleName === 'PassportRequest' || moduleName === 'Passport') {
      return this.canAccessPassportRecord(documentId, userId);
    }

    // Module khác: mặc định cho phép (guard BPMN đã check quyền hành động)
    return true;
  }

  /**
   * News: Bản ghi thuộc danh sách nào của user thì user được xem
   * 
   * Danh sách mà user có thể thấy bản ghi:
   * 1. Draft: authorId = userId AND status = 2
   * 2. Pending (đã submit): authorId = userId AND có audit SUBMIT
   * 3. Published (đã duyệt): có audit DUYET (ai cũng thấy tin đã xuất bản)
   * 4. Returned (trả lại): authorId = userId AND có audit TRA_LAI
   * 5. Cancelled (đã hủy): authorId = userId AND có audit HUY_TIN
   * 6. Recalled (thu hồi): có audit RECALL (liên quan đến user)
   * 7. Waiting approval: user là receiver của audit SUBMIT gần nhất
   */
  private async canAccessNewsRecord(documentId: string, userId: string): Promise<boolean> {
    try {
      // 1 query duy nhất: kiểm tra bản ghi có xuất hiện trong BẤT KỲ danh sách nào của user
      const sql = `
        SELECT TOP 1 1 AS ok FROM (
          -- 1. Tôi là tác giả (draft, pending, returned, cancelled)
          SELECT 1 AS ok FROM news WITH (NOLOCK)
          WHERE CAST(id AS VARCHAR(50)) = @0 AND authorId = @1

          UNION ALL

          -- 2. Tin đã xuất bản (tất cả user đều thấy)
          SELECT 1 AS ok FROM audit WITH (NOLOCK)
          WHERE document_id = @0 AND action_code = 'DUYET' AND type_document = 'NEWS'

          UNION ALL

          -- 3. Tôi là người nhận duyệt (waiting approval)
          SELECT 1 AS ok FROM audit WITH (NOLOCK)
          WHERE document_id = @0 AND receiver = @1 AND type_document = 'NEWS'
            AND action_code IN ('SUBMIT', 'DUYET', 'TRA_LAI')

          UNION ALL

          -- 4. Tôi đã từng xử lý bản ghi này
          SELECT 1 AS ok FROM audit WITH (NOLOCK)
          WHERE document_id = @0 AND type_document = 'NEWS'
            AND (user_id = @1 OR created_by = @1 OR processed_by = @1 OR acting_as = @1)
        ) t
      `;

      const result = await this.dataSource.query(sql, [String(documentId), String(userId)]);
      return Array.isArray(result) && result.length > 0;
    } catch (error) {
      this.logger.warn(`[RecordScope] News check error: ${error.message}`);
      return false;
    }
  }

  /**
   * Passport: Bản ghi thuộc danh sách nào của user thì user được xem
   */
  private async canAccessPassportRecord(documentId: string, userId: string): Promise<boolean> {
    try {
      const sql = `
        SELECT TOP 1 1 AS ok FROM (
          -- 1. Người tạo / người yêu cầu / người mượn
          SELECT 1 AS ok FROM passport_borrow_requests WITH (NOLOCK)
          WHERE id = @0 AND (created_by = @1 OR requester_id = @1 OR name_passport_request = @1)

          UNION ALL

          -- 2. Được ủy quyền trong đoàn
          SELECT 1 AS ok FROM passport_delegation_items WITH (NOLOCK)
          WHERE request_id = @0 AND user_id = @1

          UNION ALL

          -- 3. Đã từng tham gia xử lý (audit)
          SELECT 1 AS ok FROM audit WITH (NOLOCK)
          WHERE document_id = @0
            AND (user_id = @1 OR created_by = @1 OR receiver = @1 OR processed_by = @1 OR acting_as = @1)

          UNION ALL

          -- 4. Có work item liên quan
          SELECT 1 AS ok FROM work_items WITH (NOLOCK)
          WHERE document_id = @0 AND assignee_user_id = @1
        ) t
      `;

      const result = await this.dataSource.query(sql, [String(documentId), String(userId)]);
      return Array.isArray(result) && result.length > 0;
    } catch (error) {
      this.logger.warn(`[RecordScope] Passport check error: ${error.message}`);
      return false;
    }
  }
}
