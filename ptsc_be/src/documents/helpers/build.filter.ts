// Hàm chung tạo HTML từ status
function renderStatusHtml(status: string): string {
  const s = status?.trim();
  const styleBase = `
    display:flex;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    align-items:center;
    justify-content:center;
    width:100%;
    height:30px;
    padding:0 16px;
    font-weight:700;
    font-size:14px;
    border-radius:15px;
  `;

  switch (s) {
    case 'Trả lại':
      return `<div style="${styleBase} background:#FFDCD9;color:#F44336;border:1px solid #AEB5BE;">Trả lại</div>`;

    case 'Văn bản trả lại':
      return `<div style="${styleBase} background:#FFDCD9;color:#F44336;border:1px solid #AEB5BE;">Văn bản trả lại</div>`;

    case 'Dự thảo':
      return `<div style="${styleBase} background:#ACD0FF;color:#0062AD;">Dự thảo</div>`;

    case 'Văn bản đang xử lý':
      return `<div style="${styleBase} background:#ADECC0AB;color:#007222;">Đang xử lý</div>`;

    case 'Văn bản đã xử lý':
      return `<div style="${styleBase} background:  #adc3ecab;color:  #000872ff;">Đã hoàn thành</div>`;

    case 'Văn bản tạo mới':
      return `<div style="${styleBase} background:#FEF9C2;color:#FFA600;">Văn bản tạo mới</div>`;

    case 'Văn bản thu hồi':
      return `<div style="${styleBase} background:#FEF9C2;color:#FFA600;">Văn bản thu hồi</div>`;

    case 'Đã phát hành':
      return `<div style="${styleBase} background:#ADECC0AB;color:#007222;">Đã phát hành</div>`;

    case 'Chờ ký nội dung':
      return `<div style="${styleBase} background:#FEF9C2;color:#FFA600;">Chờ ký nội dung</div>`;

    case 'Chờ ký thể thức':
      return `<div style="${styleBase} background:#FEF9C2;color:#FFA600;">Chờ ký thể thức</div>`;

    case 'Chờ ký phê duyệt':
      return `<div style="${styleBase} background:#FEF9C2;color:#FFA600;">Chờ ký phê duyệt</div>`;
    case 'Chờ ký ban hành':
      return `<div style="${styleBase} background:#FEF9C2;color:#FFA600;">Chờ ký ban hành</div>`;
    case 'Chờ ký chính thức':
      return `<div style="${styleBase} background:#FEF9C2;color:#FFA600;">Chờ ký chính thức</div>`;

    case 'Chờ ký nháy':
      return `<div style="${styleBase} background:#FEF9C2;color:#FFA600;">Chờ ký nháy</div>`;

    case 'Chờ phát hành':
      return `<div style="${styleBase} background:#FEF9C2;color:#FFA600;">Chờ phát hành</div>`;
    case 'Chờ ký sao y':
      return `<div style="${styleBase} background:#FEF9C2;color:#FFA600;">Chờ ký sao y</div>`;
    case 'Đã ký phê duyệt':
      return `<div style="${styleBase} background:#FEF9C2;color:#FFA600;">Đã ký phê duyệt</div>`;

    case 'Văn bản đang chờ ký':
      return `<div style="${styleBase} background:#ACD0FF;color:#0062AD;">Văn bản đang chờ ký</div>`;
    case 'Chờ kiểm tra':
      return `<div style="${styleBase} background:#ACD0FF;color:#0062AD;">Văn bản chờ kiểm tra</div>`;
    case 'Chờ đóng dấu':
      return `<div style="${styleBase} background:#FEF9C2;color:#FFA600;">Chờ đóng dấu</div>`;
    case 'Chờ xác nhận':
      return `<div style="${styleBase} background:#FEF9C2;color:#FFA600;">Chờ xác nhận</div>`;
    case 'Chờ thẩm định':
      return `<div style="${styleBase} background:#FEF9C2;color:#FFA600;">Chờ thẩm định</div>`;
    case 'Đã đóng dấu':
      return `<div style="${styleBase} background:#D0FFDE;color:#007222;">Đã đóng dấu</div>`;
    case 'Đang xử lý':
      return `<div style="${styleBase} background:#D0FFDE;color:#007222;">Đang xử lý</div>`;
    case 'Hoàn thành':
      return `<div style="${styleBase} background:#D0FFDE;color:#007222;">Đã hoàn thành</div>`;
    case 'Đã thay thế':
      return `<div style="${styleBase} background:#F3E5F5;color:#7B1FA2;border:1px solid #BA68C8;">Đã thay thế</div>`;
    default:
      return `<div style="${styleBase} background:#fef9c2;color:#666;">${s || 'Không xác định'}</div>`;
  }
}

function renderStatusDirectionHtml(status: string): string {
  const s = status?.trim();

  const styleBase = `
    display:inline-flex;
    align-items:center;
    justify-content:center;
    min-width:120px;
    max-width:100%;
    height:28px;
    padding:0 14px;
    font-weight:600;
    font-size:13px;
    line-height:1;
    border-radius:999px;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    box-sizing:border-box;
  `;

  switch (s) {
    case 'Hoàn thành':
      return `<div style="${styleBase}
        background:#E6F4EA;
        color:#1E7E34;
        border:1px solid #B7E1C1;
      ">Hoàn thành</div>`;

    case 'Đang thực hiện':
      return `<div style="${styleBase}
        background:#E8F1FF;
        color:#1D4ED8;
        border:1px solid #BFDBFE;
      ">Đang thực hiện</div>`;

    default:
      return `<div style="${styleBase}
        background:#FFF4E5;
        color:#B45309;
        border:1px solid #FCD9BD;
      ">${s || 'Đang thực hiện'}</div>`;
  }
}

// Văn bản đi
export function mapActionToLabel(code?: string): string {
  if (!code) return renderStatusHtml('Không xác định');
  const key = code.toUpperCase();

  switch (key) {
    case 'BAN_HANH':
      return renderStatusHtml('Đã phát hành');

    case 'HOAN_THANH_LUAN_CHUYEN':
      return renderStatusHtml('Hoàn thành');

    case 'HOAN_THANH':
      return renderStatusHtml('Hoàn thành');

    case 'CREATE':
      return renderStatusHtml('Dự thảo');

    case 'TRA_LAI':
      return renderStatusHtml('Trả lại');

    case 'THU_HOI':
      return renderStatusHtml('Văn bản thu hồi');

    case 'KY_NHAY_NOI_DUNG':
    case 'CHO_KY_NOI_DUNG':
    case 'DA_KY_NOI_DUNG':
      return renderStatusHtml('Chờ ký nội dung');

    case 'CHO_KY_CHINH_THUC':
    case 'CHO_KY_CHINH_THUC_1':
    case 'KY_CHINH_THUC_1':
    case 'DA_KY_CHINH_THUC_1':
    case 'CHO_KY_CHINH_THUC_2':
    case 'KY_CHINH_THUC_2':
    case 'DA_KY_CHINH_THUC_2':
    case 'CHO_KY_CHINH_THUC_3':
    case 'KY_CHINH_THUC_3':
    case 'DA_KY_CHINH_THUC_3':
      return renderStatusHtml('Chờ ký chính thức');

    case 'CHO_KY_NHAY':
    case 'KY_NHAY':
    case 'DA_KY_NHAY':
      return renderStatusHtml('Chờ ký nháy');

    case 'KY_NHAY_THE_THUC':
    case 'CHO_KY_THE_THUC':
    case 'DA_KY_THE_THUC':
      return renderStatusHtml('Chờ ký thể thức');

    case 'CHO_KY_BAN_HANH':
    case 'DA_KY_BAN_HANH':
      return renderStatusHtml('Chờ ký ban hành');

    case 'CHO_KY_PHE_DUYET':
    case 'DA_KY_PHE_DUYET':
      return renderStatusHtml('Chờ ký phê duyệt');

    case 'KIEM_TRA_THE_THUC':
      return renderStatusHtml('Chờ kiểm tra');

    case 'CAN_CHO_SO':
    case 'DA_CHO_SO':
    case 'DE_NGHI_BH':
    case 'DONG_Y_VBDT':
    case 'CHO_SO':
    case 'DONG_DAU':
    case 'KY_SO':
    case 'KY_PHAT_HANH':
      return renderStatusHtml('Chờ phát hành');

    case 'TRINH_KIEM_TRA_TT':
      return renderStatusHtml('Chờ kiểm tra');
    case 'CHO_DONG_DAU':
      return renderStatusHtml('Chờ đóng dấu');
    case 'DA_DONG_DAU':
    case 'DA_DONG_DAU_HET_LUONG':
      return renderStatusHtml('Đã đóng dấu');
    case 'DA_KY_PHE_DUYET':
      return renderStatusHtml('Đã ký phê duyệt');

    case 'TRINH_DUYET':
    case 'CHO_XAC_NHAN':
    case 'LUAN_CHUYEN_VAN_BAN_DI':
      return renderStatusHtml('Chờ xác nhận');
    case 'CHO_THAM_DINH':
      return renderStatusHtml('Chờ thẩm định');

    case 'BI_THAY_THE':
      return renderStatusHtml('Đã thay thế');

    case 'CHUA_XU_LY':
      return renderStatusHtml('Văn bản đang xử lý');
    default:
      return renderStatusHtml('Văn bản đang xử lý');
  }
}

// Văn bản đến
export function mapActionIncomingToLabel(code?: string, isSaoY?: boolean): string {
  // console.log('code', code)
  if (!code) return renderStatusHtml('Không xác định');
  const key = code.toUpperCase();

  switch (key) {
    case 'HOAN_THANH_VAN_BAN':
      return renderStatusHtml('Văn bản đã xử lý');
    case 'THU_HOI':
      return renderStatusHtml('Văn bản thu hồi');
    case 'KIEM_TRA_THE_THUC':
      return renderStatusHtml('Chờ kiểm tra');
    case 'CREATE':
      return renderStatusHtml('Văn bản tạo mới');
    case 'CHUA_XU_LY':
    case 'PHAN_CONG':
    case 'CHUYEN_XU_LY_PHAN_CONG':
    case 'TAO_SAO_Y':
      return renderStatusHtml('Văn bản đang xử lý');
    case 'TRA_LAI':
      return renderStatusHtml('Văn bản trả lại');
    case 'TRINH_KY':
      return renderStatusHtml(isSaoY ? 'Chờ ký sao y' : 'Văn bản đang chờ ký');
    case 'CHO_KY_CHINH_THUC':
    case 'CHO_KY_CHINH_THUC_1':
    case 'KY_CHINH_THUC_1':
    case 'DA_KY_CHINH_THUC_1':
    case 'CHO_KY_CHINH_THUC_2':
    case 'KY_CHINH_THUC_2':
    case 'DA_KY_CHINH_THUC_2':
    case 'CHO_KY_CHINH_THUC_3':
    case 'KY_CHINH_THUC_3':
    case 'DA_KY_CHINH_THUC_3':
      return renderStatusHtml('Chờ ký chính thức');

    case 'CHO_KY_NHAY':
    case 'KY_NHAY':
    case 'DA_KY_NHAY':
      return renderStatusHtml('Chờ ký nháy');
    case 'CAN_CHO_SO':
    case 'DA_CHO_SO':
    case 'DE_NGHI_BH':
    case 'DONG_Y_VBDT':
    case 'CHO_SO':
      return renderStatusHtml('Chờ phát hành');
    // case 'DONG_DAU':
    //   return renderStatusHtml('Chờ đóng dấu');

    case 'CHO_XAC_NHAN':
      return renderStatusHtml('Chờ xác nhận');
    case 'CHO_THAM_DINH':
      return renderStatusHtml('Chờ thẩm định');

    default:
      return renderStatusHtml('Đang xử lý');
  }
}

export function buildStatusCodeFilterClause(
  statusCodes: string[],
  dbname: string,
  _listCategory?: 'receive' | 'main-process' | 'implementation-coordination' | 'recipient-to-know'
): string {
  if (!Array.isArray(statusCodes) || statusCodes.length === 0) return '';

  const conditions: string[] = [];

  const createCondition = `af.current_action_code = 'CREATE'`;
  const traLaiCondition = `af.current_action_code IN ('TRA_LAI', 'TU_CHOI', 'TU_CHOI_PHE_DUYET')`;
  const hoanThanhCondition = `(
    af.is_completed_doc = 1 
    OR af.current_stage_status IN ('HOAN_THANH', 'HOAN_THANH_VAN_BAN')
    OR af.current_action_code IN (
      'HOAN_THANH_VAN_BAN', 'HOAN_THANH', 'HOAN_THANH_GD', 
      'DONG_Y_VBDT', 'DONG_Y_DU_THAO', 'DA_BAN_HANH', 
      'BAN_HANH_TO_TRINH', 'BAN_HANH_DU_THAO', 'HOAN_THANH_LUAN_CHUYEN'
    )
  )`;
  const choKySaoYCondition = `(
    af.current_action_code IN ('TRINH_KY', 'DANG_CHO_KY')
    AND EXISTS (
      SELECT 1 FROM ${dbname}.dbo.work_items wi WITH (NOLOCK)
      WHERE wi.document_id = incomming_documents.document_id 
        AND wi.node_id IN ('Activity_0cdw8az', 'Activity_0uli3ft')
    )
  )`;

  for (const code of statusCodes) {
    if (!code) continue;
    const strCode = String(code).trim();

    if (strCode === 'TAO_MOI') {
      conditions.push(createCondition);
    } else if (strCode === 'VAN_BAN_TRA_LAI') {
      conditions.push(traLaiCondition);
    } else if (strCode === 'CHO_KY_SAO_Y') {
      conditions.push(choKySaoYCondition);
    } else if (strCode === 'DA_HOAN_THANH') {
      conditions.push(hoanThanhCondition);
    } else if (strCode === 'DANG_XU_LY') {
      // Đang xử lý = Tất cả văn bản KHÔNG PHẢI (Tạo mới, Đã hoàn thành, Trả lại, Chờ ký sao y)
      // Khớp 100% với nhánh default: return 'Văn bản đang xử lý' trong mapActionIncomingToLabel
      conditions.push(`(
        (af.current_action_code IS NULL OR af.current_action_code <> 'CREATE')
        AND ISNULL(af.is_completed_doc, 0) = 0
        AND (af.current_stage_status IS NULL OR af.current_stage_status NOT IN ('HOAN_THANH', 'HOAN_THANH_VAN_BAN'))
        AND (af.current_action_code IS NULL OR af.current_action_code NOT IN (
          'HOAN_THANH_VAN_BAN', 'HOAN_THANH', 'HOAN_THANH_GD', 'DA_BAN_HANH',
          'TRA_LAI', 'TU_CHOI', 'TU_CHOI_PHE_DUYET'
        ))
        AND NOT ${choKySaoYCondition}
      )`);
    } else {
      if (/^[A-Za-z0-9_]+$/.test(strCode)) {
        conditions.push(`af.current_action_code = '${strCode}'`);
      }
    }
  }

  return conditions.length > 0 ? `(${conditions.join(' OR ')})` : '';
}

export function mapStatusDirectionLabel(code?: string, isExport?: boolean): string {
  if (!isExport) {
    if (!code) return renderStatusDirectionHtml('Đang thực hiện');
    const key = code.toUpperCase();

    switch (key) {
      case 'HOAN_THANH_VAN_BAN':
      case 'HOAN_THANH':
        return renderStatusDirectionHtml('Hoàn thành');

      default:
        return renderStatusDirectionHtml('Đang thực hiện');
    }
  } else {
    if (!code) return 'Đang thực hiện';
    const key = code.toUpperCase();

    switch (key) {
      case 'HOAN_THANH_VAN_BAN':
      case 'HOAN_THANH':
        return 'Hoàn thành';

      default:
        return 'Đang thực hiện';
    }
  }
}

// ==== SORT helper: sort theo status_code (A-Z / Z-A) ====
export const sortByStatusCode = (data: any[], direction = 1) => {
  data.sort((a, b) => {
    const aVal = a.statusCodeText ?? '';
    const bVal = b.statusCodeText ?? '';

    return direction === 1
      ? aVal.localeCompare(bVal, 'vi', { sensitivity: 'base' })
      : bVal.localeCompare(aVal, 'vi', { sensitivity: 'base' });
  });
};

export function extractTextFromHtml(html: string): string {
  if (!html) return '-';

  return html
    .replace(/<[^>]+>/g, '')   // bỏ toàn bộ tag HTML
    .replace(/\s+/g, ' ')      // gom khoảng trắng
    .trim();
}


// Map chung cho cả văn bản đi và đến
export function mapActionToLabelCommon(code?: string, isSaoY?: boolean): string {
  if (!code) return 'Không xác định';

  const key = code.toUpperCase();

  switch (key) {
    // Văn bản đi
    case 'BAN_HANH':
      return 'Đã phát hành';
    case 'DA_BAN_HANH':
      return 'Đã phát hành';
    case 'HOAN_THANH':
      return 'Hoàn thành';
    case 'HOAN_THANH_LUAN_CHUYEN':
      return 'Hoàn thành';
    case 'CREATE':
      return 'Dự thảo';
    case 'CHUA_XU_LY':
      return 'Đang xử lý';
    case 'TRA_LAI':
      return 'Trả lại';

    case 'CHO_KY_CHINH_THUC':
    case 'CHO_KY_CHINH_THUC_1':
    case 'KY_CHINH_THUC_1':
    case 'DA_KY_CHINH_THUC_1':
    case 'CHO_KY_CHINH_THUC_2':
    case 'KY_CHINH_THUC_2':
    case 'DA_KY_CHINH_THUC_2':
    case 'CHO_KY_CHINH_THUC_3':
    case 'KY_CHINH_THUC_3':
    case 'DA_KY_CHINH_THUC_3':
      return 'Chờ ký chính thức';

    case 'CHO_KY_NHAY':
    case 'KY_NHAY':
    case 'DA_KY_NHAY':
      return 'Chờ ký nháy';

    // Văn bản đến
    case 'HOAN_THANH_VAN_BAN':
      return 'Đã hoàn thành';
    case 'THU_HOI':
      return 'Văn bản thu hồi';
    case 'KIEM_TRA_THE_THUC':
      return 'Chờ kiểm tra';
    case 'TRINH_KY':
      return isSaoY ? 'Chờ ký sao y' : 'Văn bản đang chờ ký';
    case 'TAO_SAO_Y':
      return 'Đang xử lý';
    case 'CAN_CHO_SO':
    case 'DA_CHO_SO':
    case 'DE_NGHI_BH':
    case 'DONG_Y_VBDT':
    case 'CHO_SO':
      return 'Chờ phát hành';
    case 'DONG_DAU':
      return isSaoY ? 'Chờ đóng dấu' : 'Chờ phát hành';
    case 'CHO_DONG_DAU':
      return 'Chờ đóng dấu';
    case 'DA_DONG_DAU':
    case 'DA_DONG_DAU_HET_LUONG':
      return 'Đã đóng dấu';
    case 'CHO_XAC_NHAN':
    case 'LUAN_CHUYEN_VAN_BAN_DI':
      return 'Chờ xác nhận';
    case 'CHO_THAM_DINH':
      return 'Chờ thẩm định';
    case 'BI_THAY_THE':
      return 'Đã thay thế';
    // Default
    default:
      return 'Đang xử lý';
  }
}

function escapeLike(str: string) {
  return str.replace(/([%_\\[\]])/g, '\\$1');
}

// Hàm build filter cho các danh sách văn bản đến đi 
export function buildDocumentCriteriaHelper(
  criteria: any[],
  tableName: string,
  featureManagement?: any,
  baseTable?: string
): {
  statusCondition: string;
  filterCondition: string;
  sql: string;
  joins?: string;
} {
  const documentsColumns = new Set<string>();

  const typeFilters: Record<string, string[]> = {
    incomming_documents: [
      "document_id", "status_code", "created_at", "updated_at", "book_document_id",
      "abstract_note", "to_book", "sender_unit", "receiver_unit", "document_date",
      "receive_date", "to_book_date", "deadline", "second_book", "receive_method",
      "private_level", "urgency_level", "document_type", "document_field", "signer",
      "to_book_code", "fileids", "status", "isStar", "parent_doc",
      "type_process_doc", "bpmn_version", "copy_to_internal",
      "resolution_deadline", "copy_count", "page_count", "view_group", "directive_comment",
    ],
    outgoing_documents: [
      "document_id", "status_code", "sender_unit", "drafter", "document_type",
      "urgency_level", "private_level", "document_field", "report_signer",
      "report_document_symbol", "to_book_text_symbols", "viewers",
      "deadline_reply", "abstract_note", "recipient_ids",
      "internal_receiving_unit", "reply_incomming_doc", "created_at", "updated_at",
      "draft_signer", "book_document_id", "status", "code_commanders", "commanders",
      "current_note", "to_book", "release_no", "release_date", "text_symbols",
      "doc_work_files", "doc_proposal", "doc_draft", "doc_attachments",
      "doc_recall", "doc_replacement", "doc_answer", "external_receiving_unit",
      "internal_receiving_dept", "processor", "files", "type_doc", "bpmn_version",
      "vieweds", "know_receivers", "type_of_process", "replaced_documents", "document_date", "document_viewer_groups"
    ],
    authority_documents: [
      "id", "author", "authorized", "stage", "status", "files", "created_at",
      "updated_at", "start_date", "end_date", "original_end_date", "filter"
    ],
    meeting_rooms: [
      "id", "name", "location", "stage", "status", "capacity",
      "created_at", "layout_blocks", "layout_seats", "layout_rows", "layout_type",
      "updated_at", "available_from", "image", "filter", "total_seating"
    ],
    amenities: [
      "id", "name", "note", "created_at", "updated_at", "mic"
    ],
    // Album images - Quản lý album ảnh
    album_images: [
      "id", "title", "description", "topic", "album_type", "albumType",
      "thumbnail_file_id", "images", "views", "shares", "status",
      "created_by", "createdBy", "created_by_name", "createdByName",
      "created_at", "createdAt", "updated_at", "updatedAt"
    ],
    // Videos - Quản lý video
    videos: [
      "id", "title", "description", "topic", "video_type", "videoType",
      "thumbnail_file_id", "video_file_id", "duration", "views", "shares", "likes", "status",
      "created_by", "createdBy", "created_by_name", "createdByName",
      "created_at", "createdAt", "updated_at", "updatedAt"
    ],
    lds: [
      "id", "title", "week", "month", "year", "schedule_date", "schedule_time", "status", "updated_at", "updatedAt", "from_date", "to_date"
    ],
    tws: [
      "id", "leader", "schedule_type", "calendar_format", "work_date", "from_date",
      "to_date", "location", "content", "morning_location", "morning_content",
      "afternoon_location", "afternoon_content", "status", "created_by", "created_at", "updated_at"
    ],
    passports: [
      "id", "eoffice_account", "full_name", "passport_number", "passport_type",
      "identification_card", "phone_number", "issue_date", "expiry_date",
      "usage_status", "unit_name", "department_name", "division_name",
      "rank", "position_title", "email", "address", "nationality",
      "created_at", "updated_at", "is_deleted"
    ],
    group_users: [
      "id", "name", "code", "type", "userId", 'user_id', "status", "order", "description",
      "permissionsId", "roleType", "permissions_id", "role_type", "roles", "roles_dynamic", "hrm_job_id", "createdAt", "updatedAt", "created_at", "updated_at"
    ],
  };
  const jsonStringFields = new Set([
    'recipient_ids',
    'viewers',
    'vieweds',
    'internal_receiving_unit',
    'external_receiving_unit',
    'internal_receiving_dept',
    'external_receiving_dept',
    'report_signer',
    'document_viewer_groups',
  ]);

  const defaultTable = tableName || "incomming_documents";
  const lookupTable = baseTable || defaultTable;
  typeFilters[lookupTable]?.forEach(c => documentsColumns.add(c));

  const fieldTableMap: Record<string, string> = {};
  const joinConditions: Record<string, string> = {
    toBookCode: `${defaultTable}.book_document_id = book_documents.book_document_id`,
    senderUnit: `${defaultTable}.sender_unit = organization_units.unit_id`,
    receiverUnit: `${defaultTable}.receiver_unit = organization_units.unit_id`,
  };

  const operatorMap: Record<string, string> = {
    eq: "=", neq: "!=", gt: ">", gteq: ">=", gte: ">=",
    lt: "<", lteq: "<=", lte: "<=",
    like: "LIKE", in: "IN", between: "BETWEEN",
    like_or_eq: "LIKE_OR_EQ"
  };

  const grouped = criteria.reduce((acc, c) => {
    (acc[c.name] ||= []).push(c);
    return acc;
  }, {} as Record<string, any[]>);

  const textFieldSet = new Set(
    featureManagement?.valueField?.field
      ?.filter((f: any) => f.type === "text")
      ?.map((f: any) => f.key)
  );

  const textSubParts: string[] = [];
  const otherParts: string[] = [];
  let joins = "";
  const joinedTables = new Set<string>();

  // Helper nội bộ để convert camelCase => snake_case
  const toSnakeCase = (str: string) =>
    str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

  const VN_CHARS = 'àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ';
  const VN_CHARS_ASCII = 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd';

  const removeAccents = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd');
  };

  const buildVnInsensitiveLike = (field: string, keyword: string) => {
    const clean = escapeLike(keyword.trim());
    if (!clean) return '';
    // CAST sang nvarchar(4000) trước để tránh lỗi SQL Server với nvarchar(MAX)
    // SQL Server không hỗ trợ COLLATE trực tiếp trên nvarchar(MAX) trong LIKE
    return `
      (
        CAST(${field} AS nvarchar(4000)) COLLATE Vietnamese_CI_AI LIKE N'%${clean}%' ESCAPE '\\'
        OR
        CAST(${field} AS nvarchar(4000)) LIKE N'%${clean}%' ESCAPE '\\'
        OR
        TRANSLATE(
          LOWER(CAST(${field} AS nvarchar(4000)) COLLATE Vietnamese_CI_AI),
          N'${VN_CHARS}',
          N'${VN_CHARS_ASCII}'
        ) LIKE N'%${removeAccents(clean.toLowerCase())}%' ESCAPE '\\'
      )
    `;
  };

  Object.entries(grouped).forEach(([origField, conditions]) => {
    let rawField = origField;
    if (origField === 'document_code' || origField === 'documentCode') {
      // Với văn bản đi: document_code = release_no (số phát hành thực tế)
      // Với các bảng khác: document_code = document_id
      rawField = (defaultTable === 'outgoing_documents') ? 'release_no' : 'document_id';
    }
    const targetTable = fieldTableMap[rawField] || defaultTable;
    const snakeField = toSnakeCase(rawField);

    if (!documentsColumns.has(snakeField) && !fieldTableMap[rawField]) return;

    const field = `${targetTable}.${snakeField}`;
    const subParts: string[] = [];

    if (fieldTableMap[rawField] && !joinedTables.has(fieldTableMap[rawField])) {
      const joinCondition =
        joinConditions[rawField] ??
        `${defaultTable}.${snakeField} = ${fieldTableMap[rawField]}.${snakeField}`;
      joins += ` LEFT JOIN ${fieldTableMap[rawField]} ON ${joinCondition}`;
      joinedTables.add(fieldTableMap[rawField]);
    }

    for (const c of conditions as any[]) {
      const op = operatorMap[c.operator];
      if (!op) continue;

      if (rawField === 'release_no' || rawField === 'releaseNo' || snakeField === 'release_no') {
        const safeVal = String(c.value).replace(/'/g, "''");

        const releaseNoField = `${targetTable}.release_no`;
        const toBookTextField = `${targetTable}.to_book_text_symbols`;

        subParts.push(`
          (
            ${releaseNoField} COLLATE Latin1_General_CI_AI LIKE N'%${safeVal}%'
            OR
            ${toBookTextField} COLLATE Latin1_General_CI_AI LIKE N'%${safeVal}%'
            OR
            ${releaseNoField} LIKE N'%${safeVal}%'
            OR
            ${toBookTextField} LIKE N'%${safeVal}%'
          )
        `);
        continue;
      }

      if (c.operator === "like_or_eq") {
        const safeVal = String(c.value).replace(/'/g, "''");
        subParts.push(`
          (
            ${field} LIKE N'%${safeVal}%'
            OR ${field} = N'${safeVal}'
          )
        `);
        continue;
      }

      if (c.operator === 'eq' &&
        rawField !== "toBookCode" &&
        rawField !== "status_code" &&
        rawField !== "statusCode" &&
        rawField !== "toBook" &&
        rawField !== "to_book") {
        const rawVal = c.value;
        if (
          rawVal !== null &&
          rawVal !== undefined &&
          typeof rawVal === 'string' &&
          rawVal.trim() !== '' &&
          Number.isNaN(Number(rawVal))
        ) {
          continue;
        }
        const safeVal = String(rawVal).replace(/'/g, "''");
        const eqField = (rawField === 'status_code' || rawField === 'statusCode') ? `CAST(${field} AS NVARCHAR(50))` : field;
        subParts.push(` ( ${eqField} = ${safeVal} ) `);
        continue;
      }

      // TEXT SEARCH (loại trừ status_code)
      if (
        typeof c.value === "string" &&
        rawField !== "toBookCode" &&
        rawField !== "status_code" &&
        rawField !== "statusCode" &&
        rawField !== "toBook" &&
        rawField !== "to_book" &&
        (textFieldSet.has(rawField) || snakeField === "abstract_note" || snakeField === "abstractNote")
      ) {
        const words = c.value.split(/\s+/).filter(Boolean);
        if (words.length) {
          subParts.push("(" + words.map(w => buildVnInsensitiveLike(field, w)).join(" AND ") + ")");
        }
        continue;
      }

      if (c.operator === "in") {
        const list = (Array.isArray(c.value) ? c.value : []).map(v => `'${v}'`).join(", ");
        const inField = (rawField === 'status_code' || rawField === 'statusCode') ? `CAST(${field} AS NVARCHAR(50))` : field;
        subParts.push(`${inField} IN (${list})`);
        continue;
      }

      if (c.operator === "between") {
        let [start, end] = c.value;
        // chuyển về dạng datetime đầy đủ nếu chỉ có date
        if (/^\d{4}-\d{2}-\d{2}$/.test(start)) start += " 00:00:00.000";
        if (/^\d{4}-\d{2}-\d{2}$/.test(end)) end += " 23:59:59.997";
        subParts.push(`${field} >= '${start}' AND ${field} <= '${end}'`);
        continue;
      }

      if (snakeField === 'resolution_deadline') {
        const val = String(c.value).trim().toUpperCase();
        if (['CON_HAN', 'SAP_HET_HAN', 'QUA_HAN', 'KHONG_CO_HAN'].includes(val)) {
          if (val === 'CON_HAN') {
            subParts.push(`(${field} >= DATEADD(day, 2, GETDATE()))`);
          } else if (val === 'SAP_HET_HAN') {
            subParts.push(`(${field} >= GETDATE() AND ${field} < DATEADD(day, 2, GETDATE()))`);
          } else if (val === 'QUA_HAN') {
            subParts.push(`(${field} < GETDATE())`);
          } else if (val === 'KHONG_CO_HAN') {
            subParts.push(`(${field} IS NULL)`);
          }
          continue;
        }
      }

      const isDateField = dateKeys.has(rawField) || dateKeys.has(snakeField) || snakeField.endsWith('_date') || snakeField === 'created_at' || snakeField === 'updated_at';
      if (isDateField) {
        if (c.operator === 'eq' && typeof c.value === 'string') {
          let start = c.value;
          let end = c.value;
          if (/^\d{4}-\d{2}-\d{2}$/.test(start)) {
            start += ' 00:00:00.000';
            end += ' 23:59:59.997';
          }
          subParts.push(`${field} >= '${start}' AND ${field} <= '${end}'`);
          continue;
        }
        if ((c.operator === 'gte' || c.operator === 'gt') && typeof c.value === 'string') {
          let val = c.value;
          if (/^\d{4}-\d{2}-\d{2}$/.test(val)) val += ' 00:00:00.000';
          subParts.push(`${field} ${op} '${val}'`);
          continue;
        }
        if ((c.operator === 'lte' || c.operator === 'lt') && typeof c.value === 'string') {
          let val = c.value;
          if (/^\d{4}-\d{2}-\d{2}$/.test(val)) val += ' 23:59:59.997';
          subParts.push(`${field} ${op} '${val}'`);
          continue;
        }
      }

      if (rawField === 'toBookCode' || rawField === 'to_book_code') {
        const val = String(c.value).replace(/[\\'%_]/g, '');
        subParts.push(`
          TRY_CAST(
            RIGHT(${field}, 
              CASE 
                WHEN CHARINDEX('/', REVERSE(${field})) > 0 
                THEN CHARINDEX('/', REVERSE(${field})) - 1 
                ELSE 0 
              END
            ) AS INT
          ) IS NOT NULL
          AND CAST(
            TRY_CAST(
              RIGHT(${field}, 
                CASE 
                  WHEN CHARINDEX('/', REVERSE(${field})) > 0 
                  THEN CHARINDEX('/', REVERSE(${field})) - 1 
                  ELSE 0 
                END
              ) AS INT
            ) AS VARCHAR(20)
          ) LIKE '%${val}%'
        `);
      }
      if (rawField === 'toBook' || rawField === 'to_book') {
        const val = String(c.value)
          .replace(/'/g, "''"); // escape ' để tránh lỗi SQL
        subParts.push(`${field} LIKE N'%${val}%'`);
      }

      if (rawField === 'documentType' || rawField === 'document_type' || snakeField === 'document_type') {
        const val = String(c.value).replace(/'/g, "''");
        subParts.push(`${field} = N'${val}'`);
        continue;
      }

      if (rawField === 'bookDocumentId' || rawField === 'book_document_id' || snakeField === 'book_document_id') {
        const val = String(c.value).replace(/'/g, "''");
        if (val.trim() && !isNaN(Number(val))) {
          subParts.push(`${field} = ${val}`);
        } else {
          subParts.push(`${field} = N'${val}'`);
        }
        continue;
      }




      if (c.operator === "eq" && ["status_code", "statusCode"].includes(rawField)) {
        subParts.push(`${field} = CAST('${c.value}' AS VARCHAR(20))`);
      }
      else if (jsonStringFields.has(snakeField)) {
        const safeVal = String(c.value).replace(/'/g, "''");

        subParts.push(`(
          (ISJSON(${field}) = 1
          AND EXISTS (
            SELECT 1
            FROM OPENJSON(${field})
            WHERE value LIKE N'%${safeVal}%'
          ))
          OR ${field} LIKE N'%${safeVal}%'
        )`);
      }
      else {
        if (op === 'LIKE') {
          subParts.push(`${field} ${op} N'%${String(c.value).replace(/'/g, "''")}%'`);
        } else {
          subParts.push(`${field} ${op} N'${String(c.value).replace(/'/g, "''")}'`);
        }
      }
    }

    if (subParts.length > 0) {
      const combined = subParts.join(' OR ');
      if (['status_code', 'statusCode', 'status'].includes(rawField)) {
        otherParts.unshift(`(${combined})`);
      } else if (
        textFieldSet.has(rawField) ||
        snakeField === "abstract_note" ||
        snakeField === "abstractNote" ||
        snakeField === "release_no" ||
        rawField === "releaseNo" ||
        rawField === "toBook" ||
        rawField === "to_book" ||
        rawField === "toBookCode" ||
        rawField === "to_book_code" ||
        (tableName === 'meeting_rooms' && ['name', 'capacity', 'total_seating', 'location'].includes(snakeField)) ||
        (tableName === 'amenities' && ['name', 'note'].includes(snakeField))
      ) {
        textSubParts.push(combined);
      } else {
        otherParts.push(`(${combined})`);
      }
    }
  });

  const textCondition = textSubParts.length ? `(${textSubParts.join(' OR ')})` : '';
  const statusCondition = otherParts.find(p => p.includes('status_code')) || '';
  const nonStatusParts = otherParts.filter(p => !p.includes('status_code'));
  const filterConditionParts = [...nonStatusParts];
  if (textCondition) filterConditionParts.push(textCondition);
  const filterCondition = filterConditionParts.join(' AND ');
  const sql = [statusCondition, filterCondition].filter(Boolean).join(' AND ');

  return { statusCondition, filterCondition, sql, joins };
}

// Hàm build filter tìm kiếm cho văn bản phúc đáp và thay thế
export function buildDocumentCriteriaReplyEvictHelper(
  criteria: any[],
  tableName: string,
  featureManagement?: any,
  orFields: string[] = []
): {
  statusCondition: string;
  filterCondition: string;
  sql: string;
  joins?: string;
} {
  const documentsColumns = new Set<string>();

  const typeFilters: Record<string, string[]> = {
    incomming_documents: [
      "document_id", "status_code", "created_at", "updated_at", "book_document_id",
      "abstract_note", "to_book", "sender_unit", "receiver_unit", "document_date",
      "receive_date", "to_book_date", "deadline", "second_book", "receive_method",
      "private_level", "urgency_level", "document_type", "document_field", "signer",
      "to_book_code", "fileids", "status", "isStar", "parent_doc",
      "type_process_doc", "bpmn_version", "copy_to_internal",
      "resolution_deadline", "copy_count", "page_count", "view_group", "directive_comment"
    ],
    outgoing_documents: [
      "document_id", "status_code", "sender_unit", "drafter", "document_type",
      "urgency_level", "private_level", "document_field", "report_signer",
      "report_document_symbol", "to_book_text_symbols", "viewers",
      "deadline_reply", "abstract_note", "recipient_ids",
      "internal_receiving_unit", "reply_incomming_doc", "created_at", "updated_at",
      "draft_signer", "book_document_id", "status", "code_commanders", "commanders",
      "current_note", "to_book", "release_no", "release_date", "text_symbols",
      "doc_work_files", "doc_proposal", "doc_draft", "doc_attachments",
      "doc_recall", "doc_replacement", "doc_answer", "external_receiving_unit",
      "internal_receiving_dept", "processor", "files", "type_doc", "bpmn_version",
      "vieweds", "document_date"
    ],
    authority_documents: [
      "id", "author", "authorized", "stage", "status", "files",
      "created_at", "updated_at", "start_date", "end_date", "original_end_date", "filter"
    ],
    // Album images - Quản lý album ảnh
    album_images: [
      "id", "title", "description", "topic", "album_type", "albumType",
      "thumbnail_file_id", "images", "views", "shares", "status",
      "created_by", "createdBy", "created_by_name", "createdByName",
      "created_at", "createdAt", "updated_at", "updatedAt"
    ],
    // Videos - Quản lý video
    videos: [
      "id", "title", "description", "topic", "video_type", "videoType",
      "thumbnail_file_id", "video_file_id", "duration", "views", "shares", "likes", "status",
      "created_by", "createdBy", "created_by_name", "createdByName",
      "created_at", "createdAt", "updated_at", "updatedAt"
    ],
    group_users: [
      "id", "name", "code", "type", "userId", 'user_id', "status", "order", "description",
      "permissionsId", "roleType", "permissions_id", "role_type", "roles", "roles_dynamic", "hrm_job_id", "createdAt", "updatedAt", "created_at", "updated_at"
    ],
  };

  const defaultTable = tableName || "incomming_documents";
  typeFilters[defaultTable]?.forEach(c => documentsColumns.add(c));

  const operatorMap: Record<string, string> = {
    eq: "=", neq: "!=", gt: ">", gte: ">=",
    lt: "<", lte: "<=", like: "LIKE", in: "IN", between: "BETWEEN"
  };

  const grouped = criteria.reduce((acc, c) => {
    (acc[c.name] ||= []).push(c);
    return acc;
  }, {} as Record<string, any[]>);

  const textFieldSet = new Set(
    featureManagement?.valueField?.field
      ?.filter((f: any) => f.type === "text")
      ?.map((f: any) => f.key)
  );

  const toSnakeCase = (str: string) =>
    str.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);

  const sanitize = (v: string) => v.replace(/'/g, "''").trim();

  const normalizeExpr = (expr: string) => `
    TRANSLATE(
      LOWER(${expr}),
      N'đáàảãạâấầẩẫậăắằẳẵặéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ',
      N'daaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyy'
    )
  `;

  const stripSpecialExpr = (expr: string) => `
    REPLACE(REPLACE(REPLACE(REPLACE(${expr}, '-', ''), '/', ''), '_', ''), '.', '')
  `;

  const buildVnInsensitiveLike = (field: string, keyword: string) => {
    const clean = sanitize(keyword);
    if (!clean) return '';
    return `(
      ${field} COLLATE Vietnamese_CI_AI LIKE N'%${clean}%'
      OR ${normalizeExpr(field)} LIKE ${normalizeExpr(`N'%${clean}%'`)}
      OR ${stripSpecialExpr(normalizeExpr(field))}
         LIKE ${stripSpecialExpr(normalizeExpr(`N'%${clean}%'`))}
    )`;
  };

  const andFieldConditions: string[] = [];
  const orFieldConditions: string[] = [];
  const otherParts: string[] = [];
  const textSubParts: string[] = [];

  Object.entries(grouped).forEach(([origField, conditions]) => {
    let rawField = origField;
    if (origField === 'document_code' || origField === 'documentCode') {
      rawField = 'document_id';
    }
    const snakeField = toSnakeCase(rawField);
    if (!documentsColumns.has(snakeField)) return;

    const field = `${defaultTable}.${snakeField}`;
    const subParts: string[] = [];

    for (const c of conditions as any[]) {
      const op = operatorMap[c.operator];
      if (!op) continue;

      /* ================= TEXT ĐẶC BIỆT ================= */
      if (
        typeof c.value === 'string' &&
        (orFields.includes(rawField) || textFieldSet.has(rawField) || snakeField === 'abstract_note')
      ) {
        const words = c.value.split(/\s+/).filter(Boolean);
        const expr = words.map(w => buildVnInsensitiveLike(field, w)).join(' AND ');
        if (expr) {
          if (textFieldSet.has(rawField)) textSubParts.push(`(${expr})`);
          else subParts.push(`(${expr})`);
        }
        continue;
      }

      /* ================= DATE / DATETIME ================= */
      if (snakeField.endsWith('_date') || snakeField === 'created_at' || snakeField === 'updated_at') {

        // BETWEEN
        if (c.operator === 'between' && Array.isArray(c.value)) {
          let [start, end] = c.value;
          if (start && !end) end = start;
          if (/^\d{4}-\d{2}-\d{2}$/.test(start)) start += ' 00:00:00.000';
          if (/^\d{4}-\d{2}-\d{2}$/.test(end)) end += ' 23:59:59.997';
          subParts.push(`${field} >= '${start}' AND ${field} <= '${end}'`);
          continue;
        }

        // EQ = 1 ngày
        if (c.operator === 'eq' && typeof c.value === 'string') {
          let start = c.value;
          let end = c.value;
          if (/^\d{4}-\d{2}-\d{2}$/.test(start)) {
            start += ' 00:00:00.000';
            end += ' 23:59:59.997';
          }
          subParts.push(`${field} >= '${start}' AND ${field} <= '${end}'`);
          continue;
        }

        // GTE / GT
        if ((c.operator === 'gte' || c.operator === 'gt') && typeof c.value === 'string') {
          let val = c.value;
          if (/^\d{4}-\d{2}-\d{2}$/.test(val)) val += ' 00:00:00.000';
          subParts.push(`${field} ${op} '${val}'`);
          continue;
        }

        // LTE / LT
        if ((c.operator === 'lte' || c.operator === 'lt') && typeof c.value === 'string') {
          let val = c.value;
          if (/^\d{4}-\d{2}-\d{2}$/.test(val)) val += ' 23:59:59.997';
          subParts.push(`${field} ${op} '${val}'`);
          continue;
        }
      }

      /* ================= FALLBACK (BẮT BUỘC) ================= */
      if (typeof c.value === 'string') {
        subParts.push(`${field} LIKE '%${sanitize(c.value)}%'`);
      } else {
        subParts.push(`${field} ${op} '${sanitize(String(c.value))}'`);
      }
    }

    if (subParts.length) {
      const combined = `(${subParts.join(' AND ')})`;
      if (['status_code', 'status'].includes(rawField)) otherParts.unshift(combined);
      else if (orFields.includes(rawField)) orFieldConditions.push(combined);
      else andFieldConditions.push(combined);
    }
  });

  const filterCondition = [
    ...andFieldConditions,
    orFieldConditions.length ? `(${orFieldConditions.join(' OR ')})` : '',
    textSubParts.length ? `(${textSubParts.join(' OR ')})` : ''
  ].filter(Boolean).join(' AND ');

  const statusCondition = otherParts[0] || '';
  const sql = [statusCondition, filterCondition].filter(Boolean).join(' AND ');

  return { statusCondition, filterCondition, sql };
}

// Format ngày DD-MM-YYYY
export function normalizeDateValueDDMMYYYY(
  val?: string | number | Date | null
): string {
  if (!val) return "-";

  let d: Date;

  if (val instanceof Date) {
    d = val;
  } else if (typeof val === "number") {
    d = new Date(val);
  } else if (typeof val === "string") {
    // 1. ISO string với T → giữ logic cũ
    if (/^\d{4}-\d{2}-\d{2}T/.test(val)) {
      d = new Date(val);
    }
    // 2. Chuỗi YYYY-MM-DD HH:mm:ss → thay space bằng T + "Z" để parse đúng UTC
    else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(val)) {
      d = new Date(val.replace(" ", "T") + "Z");
    }
    // 3. dd/mm/yyyy hoặc dd-mm-yyyy
    else {
      const m = val.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
      if (!m) return "-";
      let [, dd, mm, yyyy] = m;
      if (yyyy.length === 2) yyyy = +yyyy < 70 ? "20" + yyyy : "19" + yyyy;
      d = new Date(Date.UTC(+yyyy, +mm - 1, +dd));
    }
  } else {
    return "-";
  }

  if (isNaN(d.getTime())) return "-";

  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();

  return `${dd}/${mm}/${yyyy}`;
}

// Format ngày giờ HH:mm DD/MM/YYYY
export function normalizeDateValueHHmmDDMMYYYY(
  val?: string | number | Date | null
): string {
  if (!val) return "-";

  let d: Date;

  if (val instanceof Date) {
    d = val;
  } else if (typeof val === "number") {
    d = new Date(val);
  } else if (typeof val === "string") {
    // 1. ISO string
    if (/^\d{4}-\d{2}-\d{2}T/.test(val)) {
      d = new Date(val);
    }
    // 2. YYYY-MM-DD HH:mm:ss
    else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(val)) {
      d = new Date(val.replace(" ", "T") + "Z");
    }
    // 3. dd/mm/yyyy hoặc dd-mm-yyyy (không có giờ)
    else {
      const m = val.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
      if (!m) return "-";
      let [, dd, mm, yyyy] = m;
      if (yyyy.length === 2) yyyy = +yyyy < 70 ? "20" + yyyy : "19" + yyyy;
      d = new Date(Date.UTC(+yyyy, +mm - 1, +dd));
    }
  } else {
    return "-";
  }

  if (isNaN(d.getTime())) return "-";

  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();

  return `${hh}:${mi} ${dd}/${mm}/${yyyy}`;
}// Format ngày giờ DD/MM/YYYY HH:mm
export function normalizeDateValueDDMMYYYYHHmm(
  val?: string | number | Date | null
): string {
  if (!val) return "-";

  let d: Date;

  if (val instanceof Date) {
    d = val;
  } else if (typeof val === "number") {
    d = new Date(val);
  } else if (typeof val === "string") {
    // 1. ISO string
    if (/^\d{4}-\d{2}-\d{2}T/.test(val)) {
      d = new Date(val);
    }
    // 2. YYYY-MM-DD HH:mm:ss
    else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(val)) {
      d = new Date(val.replace(" ", "T") + "Z");
    }
    // 3. dd/mm/yyyy hoặc dd-mm-yyyy (không có giờ)
    else {
      const m = val.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
      if (!m) return "-";
      let [, dd, mm, yyyy] = m;
      if (yyyy.length === 2) yyyy = +yyyy < 70 ? "20" + yyyy : "19" + yyyy;
      d = new Date(Date.UTC(+yyyy, +mm - 1, +dd));
    }
  } else {
    return "-";
  }

  if (isNaN(d.getTime())) return "-";

  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();

  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

export const dateKeys = new Set([
  'created_at', 'updated_at', 'receive_date', 'deadline',
  'document_date', 'to_book_date', 'user_deadline', 'release_date', 'receiveDate',
  'createdAt', 'updatedAt', 'documentDate', 'toBookDate', 'userDeadline', 'releaseDate',
  'resolutionDeadline', 'resolution_deadline',
]);
/** Map các key từ db sang js object theo alias */
export function mapDocKeysOutgoing(
  doc: any,
  aliases: Record<string, string> = {}
): Record<string, any> {
  const result: any = {};
  for (const [dbKey, jsKey] of Object.entries(aliases)) {
    switch (dbKey) {
      default:
        if (doc[dbKey] !== undefined) {
          result[jsKey] = dateKeys.has(dbKey)
            ? normalizeDateValueDDMMYYYY(doc[dbKey])
            : doc[dbKey];
        } else {
          result[jsKey] = '-';
        }
    }
  }
  return result;
}
export function mapDocKeys(
  doc: any,
  aliases: Record<string, string> = {},
): Promise<any> {
  const result: any = {};
  for (const [dbKey, jsKey] of Object.entries(aliases)) {
    switch (dbKey) {
      case 'book_document_name':
        result[jsKey] = doc.book_document_id ?? '-';
        break;
      default:
        if (doc[dbKey] !== undefined) {
          result[jsKey] = dateKeys.has(dbKey)
            ? normalizeDateValueDDMMYYYY(doc[dbKey])
            : doc[dbKey];
        } else {
          result[jsKey] = '-';
        }
    }
  }
  return result;
}

//build sort
export function parseSort(
  sort: Record<string, any> | string | undefined,
  aliases: Record<string, string> = {},
  table: string = 'incomming_documents',
  customColumns: Record<string, string> = {},
): string {
  if (!sort) return `[${table}].[updated_at] DESC`;

  // Mapping mặc định files -> fileids
  if (table === 'incomming_documents') {
    aliases = { fileids: 'files', ...aliases };
  }

  const normalizeDir = (v: any): 'ASC' | 'DESC' => {
    if (v === 1 || v === '1' || v === 'asc' || v === 'ASC') return 'ASC';
    if (v === -1 || v === '-1' || v === 'desc' || v === 'DESC') return 'DESC';
    return 'DESC';
  };

  const orderBy: string[] = [];

  try {
    const sortObj: Record<string, any> =
      typeof sort === 'string' ? JSON.parse(sort) : sort;

    for (const key in sortObj) {
      if (!Object.prototype.hasOwnProperty.call(sortObj, key)) continue;

      const column =
        Object.keys(aliases).find(k => aliases[k] === key) || key;

      const dir = normalizeDir(sortObj[key]);

      // Xử lý đặc biệt toBookCode cho SQL Server
      if (column === 'toBookCode' || column === 'to_book_code') {
        orderBy.push(`
          TRY_CAST(
            REVERSE(
              LEFT(
                REVERSE([${table}].[${column}]),
                PATINDEX('%[^0-9]%', REVERSE([${table}].[${column}]) + 'X') - 1
              )
            ) AS INT
          ) ${dir}
        `);
        continue;
      }
      if (column === 'release_no' || column === 'releaseNo') {
        orderBy.push(`[${table}].[release_no] ${dir}`);
        orderBy.push(`[${table}].[to_book_text_symbols] ${dir}`);
        continue;
        continue;
      }

      // nếu là cột custom (JOIN / APPLY)
      if (customColumns[column]) {
        orderBy.push(`${customColumns[column]} ${dir}`);
        continue;
      }

      // Mặc định
      orderBy.push(`[${table}].[${column}] ${dir}`);
    }
  } catch {
    return `[${table}].[updated_at] DESC`;
  }

  return orderBy.length
    ? orderBy.join(', ')
    : `[${table}].[updated_at] DESC`;
}

function parseDeadline(deadline?: string | Date | null): Date | null {
  if (!deadline) return null;

  if (deadline instanceof Date) return deadline;

  // DD/MM/YYYY
  if (typeof deadline === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(deadline)) {
    const [d, m, y] = deadline.split('/').map(Number);
    return new Date(y, m - 1, d);
  }

  const parsed = new Date(deadline);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Map color dealine 
export function calcDeadlineColor(deadline?: string | Date | null): string | null {
  const d = parseDeadline(deadline);
  if (!d) return null;

  const now = new Date();
  // tính thời điểm kết thúc ngày deadline
  const endOfDeadline = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  // số ngày còn lại
  const diffDay = Math.ceil((endOfDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (now > endOfDeadline) return '#D60B0B'; // đỏ: đã hết ngày deadline  
  if (diffDay <= 1) return '#FFA600'; // vàng
  return '#0062AD';                   // xanh
}

export function normalizeStatisticsFilterObject(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw !== 'object') return {};

  const out: Record<string, any> = {};
  for (const [rawKey, rawVal] of Object.entries(raw)) {
    if (rawVal === undefined || rawVal === null || rawVal === '') continue;

    if (!String(rawKey).includes('[')) {
      out[rawKey] = rawVal;
      continue;
    }

    const parts = String(rawKey)
      .split('[')
      .map(p => p.replace(/\]$/g, ''))
      .filter(Boolean);
    if (!parts.length) continue;

    let cur: any = out;
    for (let i = 0; i < parts.length; i++) {
      const k = parts[i];
      const isLast = i === parts.length - 1;
      if (isLast) {
        cur[k] = rawVal;
      } else {
        if (!cur[k] || typeof cur[k] !== 'object') cur[k] = {};
        cur = cur[k];
      }
    }
  }
  return out;
}

export function parseStatisticsFilter(
  filter: any,
  aliases: Record<string, string> = {},
  tableAlias?: string
): string {
  if (!filter) return '';
  const normalized = typeof filter === 'object' ? normalizeStatisticsFilterObject(filter) : {};

  const conditions: string[] = [];

  for (const [key, value] of Object.entries(normalized)) {
    if (value === undefined || value === null || value === '') continue;

    const dbFieldBase = aliases[key] || key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    const dbField = tableAlias ? `${tableAlias}.${dbFieldBase}` : dbFieldBase;

    if (typeof value === 'object' && !Array.isArray(value)) {
      const v = value as { startDate?: string; endDate?: string };
      if (v.startDate) {
        conditions.push(`${dbField} >= '${v.startDate}'`);
      }
      if (v.endDate) {
        conditions.push(`${dbField} < DATEADD(DAY, 1, '${v.endDate}')`);
      }
    } else if (Array.isArray(value)) {
      if (value.length > 0) {
        const list = value
          .map((v) => `'${String(v).replace(/'/g, "''")}'`)
          .join(', ');
        conditions.push(`${dbField} IN (${list})`);
      }
    } else {
      const safeVal = String(value).replace(/'/g, "''");
      conditions.push(`${dbField} = '${safeVal}'`);
    }
  }

  return conditions.length ? conditions.join(' AND ') : '';
}

export function parseStatisticsSort(
  sort: any,
  aliases: Record<string, string> = {},
  tableAlias?: string
): string {
  if (!sort) return '';

  let sortObj = sort;
  if (typeof sort === 'string') {
    try {
      sortObj = JSON.parse(sort);
    } catch { }
  }

  if (typeof sortObj !== 'object') return '';

  const sortKeys: string[] = [];
  for (const [key, value] of Object.entries(sortObj)) {
    if (value === undefined || value === null || value === '') continue;

    const dbFieldBase = aliases[key] || key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    const dbField = tableAlias ? `${tableAlias}.${dbFieldBase}` : dbFieldBase;

    let dir = 'DESC';
    if (value === 1 || value === '1' || String(value).toUpperCase() === 'ASC') dir = 'ASC';
    if (value === -1 || value === '-1' || String(value).toUpperCase() === 'DESC') dir = 'DESC';

    sortKeys.push(`${dbField} ${dir}`);
  }

  return sortKeys.length ? `${sortKeys.join(', ')}` : '';
}

