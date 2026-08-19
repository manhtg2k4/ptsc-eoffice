import { isSuperAdminByKeycloakId } from 'src/utils/super-admin.util';

// Helper: Get timestamp from audit record, supporting both snake_case and camelCase
const getAuditTimestamp = (a: any): number => {
  const t = a.updatedAt || a.updated_at || a.createdAt || a.created_at;
  if (!t) return 0;
  if (t instanceof Date) return t.getTime();
  if (typeof t === 'number') return t;
  if (typeof t === 'string') {
    const s = t.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const d = new Date(s);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    }
    const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    if (m) {
      const [_, dd, mm, yyyy] = m;
      const timePart = s.split(' ')[1] || '';
      let hh = 0, min = 0, ss = 0;
      const tm = timePart.match(/^(\d{1,2}):(\d{1,2}):?(\d{1,2})?/);
      if (tm) {
        hh = parseInt(tm[1], 10) || 0;
        min = parseInt(tm[2], 10) || 0;
        ss = parseInt(tm[3], 10) || 0;
      }
      const d = new Date(+yyyy, +mm - 1, +dd, hh, min, ss);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }
  return 0;
};

export class DocumentPolicy {
  /**
   * Kiểm tra quyền chỉnh sửa văn bản.
   * Chỉ cho phép nếu người dùng là người tạo văn bản.
   */
  static canEdit(user: { userId?: string }, doc: { createdBy?: string }) {
    return !!user?.userId && doc?.createdBy === user.userId;
  }

  /**
   * Kiểm tra quyền cập nhật/chỉnh sửa văn bản đi.
   * - Nếu văn bản đã phê duyệt (Approved) -> cấm hoàn toàn.
   * - Nếu là người trình ký (Creator/Drafter):
   *   + Nếu văn bản đã trình ký (Submitted) và chưa được thu hồi -> cấm chỉnh sửa.
   *   + Nếu là bản nháp hoặc đã được thu hồi -> cho phép chỉnh sửa.
   * - Nếu không phải người trình ký:
   *   + Phải là người xử lý hiện tại (có open work item được gán cho user/role/org) mới được phép chỉnh sửa.
   */
  static validateUpdatePermission(
    userId: string,
    doc: { drafter?: string; createdBy?: string },
    audit: any[],
    openWorkItems: any[],
    userRoles: string[] = [],
    userOrgId?: string | null,
  ): { allowed: boolean; reason: string } {
    if (!userId) {
      return { allowed: false, reason: 'Thiếu thông tin người dùng' };
    }

    // 1. Nếu là người xử lý hiện tại (có công việc đang mở) -> luôn cho phép chỉnh sửa
    const canProcess = openWorkItems.some(wi =>
      wi.assigneeUserId === userId ||
      (userOrgId && wi.assigneeUserId === userOrgId) ||
      (wi.role && userRoles && userRoles.includes(wi.role))
    );

    if (canProcess) {
      return { allowed: true, reason: 'OK' };
    }

    // 2. Nếu đã phê duyệt / ban hành / đóng dấu và không còn việc cần xử lý -> cấm chỉnh sửa
    const APPROVED_STATUSES = [
      'DONG_Y_VBDT', 'Hoàn thành VBDT', 'DONG_Y_DU_THAO', 'DONG_Y_PHE_DUYET',
      'DE_NGHI_BH', 'Chờ ban hành',
      'CHO_SO', 'Cho số', 'DA_CHO_SO',
      'DA_BAN_HANH', 'Ban hành',
      'DA_DONG_DAU', 'Đã đóng dấu',
      'CHO_DONG_DAU', 'Chờ đóng dấu',
      'HOAN_THANH_GD', 'DA_KY_BAN_HANH'
    ];

    const isApproved = audit.some(a =>
      a && (APPROVED_STATUSES.includes(a.stageStatus) || APPROVED_STATUSES.includes(a.actionCode))
    );

    if (isApproved) {
      return { allowed: false, reason: 'Văn bản đã được phê duyệt, không được phép chỉnh sửa.' };
    }

    const drafter = doc.drafter || doc.createdBy;
    const isDrafter = drafter === userId;

    if (isDrafter) {
      // Các action_code tương đương hành động nộp/trình ký văn bản
      const SUBMISSION_ACTION_CODES = [
        'TRINH_KY', 'TRINH_DUYET', 'SUBMIT', 'LUAN_CHUYEN_VAN_BAN_DI', 'TRINH_KIEM_TRA_TT'
      ];

      const isSubmitted = audit.some(a => a && SUBMISSION_ACTION_CODES.includes(a.actionCode));

      // Get sorted audits (newest first) - array is already sorted by id DESC from SQL
      const sortedAudits = [...audit].filter(a => a != null);

      // Find the latest SUBMISSION action to determine the "submitted period"
      const submissionAudits = sortedAudits.filter(a => SUBMISSION_ACTION_CODES.includes(a.actionCode));
      const latestSubmissionAudit = submissionAudits.length > 0 ? submissionAudits[0] : null;

      // Check if there's a THU_HOI action AFTER the latest submission
      // OR if the latest submission itself has stageStatus = THU_HOI (recalled immediately)
      let isCurrentlyRecalled = false;
      if (latestSubmissionAudit) {
        // Case 1: The latest submission itself is recalled (stageStatus = THU_HOI)
        if (latestSubmissionAudit.stageStatus === 'THU_HOI') {
          isCurrentlyRecalled = true;
        } else {
          // Case 2: Check for separate THU_HOI action after submission
          isCurrentlyRecalled = sortedAudits.some(a =>
            a && (a.actionCode === 'THU_HOI' || a.stageStatus === 'THU_HOI') &&
            Number(a.id) > Number(latestSubmissionAudit.id)
          );
        }
      } else {
        // If never submitted, check if the latest audit is THU_HOI
        const latestAudit = sortedAudits.length > 0 ? sortedAudits[0] : null;
        isCurrentlyRecalled = latestAudit?.actionCode === 'THU_HOI' || latestAudit?.stageStatus === 'THU_HOI';
      }

      // Kiểm tra xem có hành động TRẢ LẠI hoặc TỪ CHỐI sau lần trình ký gần nhất hay không
      let isCurrentlyReturnedOrRejected = false;
      if (latestSubmissionAudit) {
        isCurrentlyReturnedOrRejected = sortedAudits.some(a =>
          a && (
            a.actionCode === 'TRA_LAI' ||
            a.stageStatus === 'TRA_LAI' ||
            (typeof a.actionCode === 'string' && a.actionCode.startsWith('TRA_LAI')) ||
            (typeof a.stageStatus === 'string' && a.stageStatus.startsWith('TRA_LAI')) ||
            a.actionCode === 'TU_CHOI' ||
            a.stageStatus === 'TU_CHOI' ||
            a.actionCode === 'TU_CHOI_PHE_DUYET' ||
            a.stageStatus === 'TU_CHOI_PHE_DUYET'
          ) &&
          Number(a.id) > Number(latestSubmissionAudit.id)
        );
      }

      // Cập nhật lại điều kiện chặn:
      // Nếu đã trình ký, chưa thu hồi VÀ CHƯA bị trả lại/từ chối thì mới chặn chỉnh sửa.
      if (isSubmitted && !isCurrentlyRecalled && !isCurrentlyReturnedOrRejected) {
        return {
          allowed: false,
          reason: 'Văn bản đã trình ký và đang xử lý, người trình ký không được phép chỉnh sửa thông tin văn bản trừ khi văn bản được thu hồi.',
        };
      }
      return { allowed: true, reason: 'OK' };
    } else {
      // Nếu không phải người soạn thảo/trình ký, phải có công việc xử lý đang mở (open work item)
      const canProcess = openWorkItems.some(wi =>
        wi.assigneeUserId === userId ||
        (userOrgId && wi.assigneeUserId === userOrgId) ||
        (wi.role && userRoles && userRoles.includes(wi.role))
      );

      if (!canProcess) {
        return {
          allowed: false,
          reason: 'Bạn không có thẩm quyền chỉnh sửa văn bản này ở bước hiện tại.',
        };
      }
      return { allowed: true, reason: 'OK' };
    }
  }
  /**
   * Kiểm tra quyền xem chi tiết văn bản.
   * Cho phép nếu:
   * - user là người tạo văn bản,
   * - user tham gia audit (người nhận hoặc người tạo audit) của văn bản,
   * - user có work item đang xử lý văn bản.
   */
  static canViewDetail(
    user: { userId?: string },
    doc: { createdBy?: string } = {},
    activeWorkItems: Array<{ assigneeUserId?: string | null; role?: string }> = [],
    userRoles: string[] = [],
    userOrgId?: string | null,
    auditRows: Array<{ createdBy?: string; receiver?: string; receiver_unit?: string; receiverUnit?: string }> = [],
  ) {
    if (!user?.userId) {
      return { allowed: false, reason: 'Thiếu thông tin người dùng' };
    }

    if (doc?.createdBy === user.userId) {
      return { allowed: true, reason: 'Người dùng là người tạo văn bản' };
    }

    const isAuditParticipant = auditRows.some((audit) => {
      return (
        audit?.createdBy === user.userId ||
        audit?.receiver === user.userId ||
        (userOrgId && audit?.receiver_unit === userOrgId) ||
        (userOrgId && audit?.receiverUnit === userOrgId)
      );
    });

    if (isAuditParticipant) {
      return { allowed: true, reason: 'Người dùng tham gia xử lý/nhận văn bản qua audit' };
    }

    const hasWorkItem = activeWorkItems.some((workItem) => {
      const assigneeMatch =
        workItem.assigneeUserId === user.userId ||
        (userOrgId && workItem.assigneeUserId === userOrgId);
      const roleMatch = workItem.role && userRoles.includes(workItem.role);
      return assigneeMatch || roleMatch;
    });

    if (hasWorkItem) {
      return { allowed: true, reason: 'Người dùng có work item đang xử lý văn bản' };
    }

    return { allowed: false, reason: 'Người dùng không có quyền xem chi tiết văn bản' };
  }

  static canUpdateSignNumber(
    user: { userId?: string },
    auditRows: Array<{ createdBy?: string; receiver?: string; receiver_unit?: string; receiverUnit?: string }> = [],
  ) {
    if (!user?.userId) {
      return false;
    }

    return auditRows.some((audit) => {
      return (
        audit?.createdBy === user.userId ||
        audit?.receiver === user.userId ||
        audit?.receiver_unit === user.userId ||
        audit?.receiverUnit === user.userId
      );
    });
  }

  /**
   * Kiểm tra quyền xóa văn bản đi.
   * Chỉ cho phép nếu người dùng là người tạo văn bản.
   */
  static canDeleteOutgoingDocument(user: { userId?: string }, doc: { createdBy?: string }) {
    return !!user?.userId && doc?.createdBy === user.userId;
  }
  /**
   * Kiểm tra quyền xóa văn bản đến.
   * Chỉ cho phép nếu người dùng là người tạo văn bản.
   */
  static canDeleteIncommingDocument(user: { userId?: string }, doc: { createdBy?: string }) {
    return !!user?.userId && doc?.createdBy === user.userId;
  }
  /**
   * Kiểm tra điều kiện để từ chối tiếp nhận văn bản đến.
   * Dựa vào thông tin copy nội bộ và trạng thái vào sổ văn bản.
   */
  static canRejectIncommingDocument(
    doc: {
      copyToInternal?: string,
      bookDocumentId?: string
    }
  ) {
    if (
      (doc.copyToInternal || doc.copyToInternal !== '') &&
      (!doc.bookDocumentId || doc.bookDocumentId === '')
    ) {
      return false;
    } else {
      return true;
    }
  }

  /**
   * Kiểm tra user có quyền xử lý work item hay không
   * @param userName - Tên hiển thị của user (lấy từ DB)
   * @param userId - ID user đang thao tác
   * @param workItem - Work item cần kiểm tra (có assigneeUserId, state)
   * @param actionName - Tên chức năng (VD: 'chuyển xử lý văn bản', 'trả lại văn bản')
   * @param userOrgId - (Optional) ID đơn vị tổ chức của user, dùng khi assigneeUserId có thể là org unit ID
   */
  static validateWorkItemPermission(
    userName: string,
    userId: string,
    workItem: { assigneeUserId?: string | null; state?: string },
    actionName: string = 'chuyển xử lý văn bản',
    userOrgId?: string | null,
  ): { allowed: boolean; reason: string } {
    if (!workItem) {
      return { allowed: false, reason: 'Work item không tồn tại hoặc đã được xử lý' };
    }
    if (!userId) {
      return { allowed: false, reason: 'Thiếu thông tin người dùng' };
    }
    if (workItem.state && workItem.state !== 'open') {
      return { allowed: false, reason: `Work item đã ở trạng thái: ${workItem.state}` };
    }
    // Super Admin bypass
    if (isSuperAdminByKeycloakId(userId)) {
      return { allowed: true, reason: 'OK' };
    }
    // Check 1: assigneeUserId === userId (exact user match)
    if (workItem.assigneeUserId === userId) {
      return { allowed: true, reason: 'OK' };
    }
    // Check 2: assigneeUserId === userOrgId (org unit match - VB từ phát hành bổ sung)
    if (userOrgId && workItem.assigneeUserId === userOrgId) {
      return { allowed: true, reason: 'OK' };
    }
    const displayName = userName || userId;
    return {
      allowed: false,
      reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
    };
  }

  /**
   * Kiểm tra user có quyền thu hồi văn bản hay không
   * Logic copy từ canRecallDocument trong bpmn-engine.service.ts
   * @param audit - Toàn bộ mảng audit của văn bản
   * @param userId - ID user đang thao tác
   * @param typeDocument - 'IncommingDocument' | 'OutGoingDocument'
   * @param actionName - Tên chức năng (VD: 'thu hồi văn bản đến')
   */
  static validateRecallPermission(
    audit: any[],
    userId: string,
    typeDocument: string = 'OutGoingDocument',
    actionName: string = 'thu hồi văn bản',
  ): { allowed: boolean; reason: string } {
    if (!userId) {
      return { allowed: false, reason: 'Thiếu thông tin người dùng' };
    }
    if (!audit || audit.length === 0) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // ================= VB ĐẾN =================
    if (typeDocument === 'IncommingDocument') {
      // Helper: so sánh stageStatus cả 2 dạng (code + display)
      const isStatus = (val: string, ...targets: string[]) =>
        targets.some(t => val === t);

      // Use centralized timestamp helper that supports both snake_case and camelCase
      const getTime = getAuditTimestamp;

      // Kiểm tra user có bất kỳ record nào trong audit không
      const userAudits = audit.filter((a) => a && (a.receiver === userId || a.createdBy === userId));
      if (userAudits.length === 0) {
        return {
          allowed: false,
          reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
        };
      }

      let latestAudit: any = null;

      for (let i = audit.length - 1; i >= 0; i--) {
        const a = audit[i];
        if (!a) continue;

        // Trả lại liên tiếp
        if (
          (a.receiver === userId || a.createdBy === userId) &&
          isStatus(a.stageStatus, 'Trả lại', 'TRA_LAI')
        ) {
          let nextValidAudit: any = null;
          for (let k = i + 1; k < audit.length; k++) {
            const next = audit[k];
            if (!next) continue;
            if (isStatus(next.stageStatus, 'Trả lại', 'TRA_LAI')) continue;
            nextValidAudit = next;
            break;
          }
          if (
            isStatus(nextValidAudit?.stageStatus || '', 'Chưa xử lý', 'CHUA_XU_LY') ||
            nextValidAudit?.actionCode === 'THU_HOI'
          ) {
            return {
              allowed: false,
              reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
            };
          }
        }

        // Cấp dưới đã xử lý chính hoàn thành
        if (a.receiver === userId && isStatus(a.stageStatus, 'Đã xử lý', 'DA_XU_LY', 'Đã phân công', 'DA_PHAN_CONG')) {
          for (let j = i + 1; j < audit.length; j++) {
            const nextAudit = audit[j];
            if (!nextAudit) break;
            if (nextAudit.createdBy !== userId) break;
            if (nextAudit.action !== 'Xử lý chính' && nextAudit.action !== 'XU_LY_CHINH') continue;
            if (
              isStatus(nextAudit.stageStatus,
                'Hoàn thành văn bản', 'HOAN_THANH_VAN_BAN',
                'Hoàn thành xử lý', 'HOAN_THANH_XU_LY',
                'Hoàn thành', 'HOAN_THANH'
              )
            ) {
              return {
                allowed: false,
                reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
              };
            }
          }
        }

        // Lấy audit mới nhất
        if (
          a.receiver === userId &&
          (a.actionCode === 'THU_HOI' || isStatus(a.stageStatus, 'Đã xử lý', 'DA_XU_LY', 'Đã phân công', 'DA_PHAN_CONG'))
        ) {
          const time = getTime(a);
          const latestTime = latestAudit ? getTime(latestAudit) : 0;
          if (!latestAudit || time > latestTime) {
            latestAudit = a;
          }
        }
      }

      const canRecall = !!latestAudit && latestAudit.actionCode !== 'THU_HOI';
      if (!canRecall) {
        return {
          allowed: false,
          reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
        };
      }
      return { allowed: true, reason: 'OK' };
    }

    // ================= VB ĐI =================
    // Helper: so sánh stageStatus cả 2 dạng (code + display)
    const isStatus = (val: string, ...targets: string[]) =>
      targets.some(t => val === t);
    const getTime = getAuditTimestamp;
    // [MỚI] Danh sách action_code được phép thu hồi - chỉ cho phép thu hồi khi VB chưa ký
    // Nếu audit mới nhất của toàn bộ VB không thuộc danh sách này → không cho thu hồi
    const RECALLABLE_ACTION_CODES = ['TRINH_KY', 'TRINH_DUYET', 'LUAN_CHUYEN_VAN_BAN_DI', 'TRINH_KIEM_TRA_TT'];
    // Danh sách stageStatus chặn thu hồi (sau khi getAudit map sang Vietnamese display string)
    const BLOCKED_RECALL_STAGE_STATUSES = [
      'đã thu hồi', 'thu_hoi',
      'trả lại', 'tra_lai',
    ];
    const allAuditsSorted = [...audit].filter(a => a != null);
    if (allAuditsSorted.every(a => a.id !== undefined && a.id !== null)) {
      allAuditsSorted.sort((a, b) => Number(b.id) - Number(a.id));
    } else {
      allAuditsSorted.sort((a, b) => getAuditTimestamp(b) - getAuditTimestamp(a));
    }
    const globalLatestAudit = allAuditsSorted.length > 0 ? allAuditsSorted[0] : null;

    // Chặn thu hồi nếu:
    // 1. actionCode mới nhất không nằm trong danh sách cho phép
    // 2. stageStatus mới nhất là trạng thái đã thu hồi/trả lại
    const globalStageStatus = String(globalLatestAudit?.stageStatus || '').trim().toLowerCase();
    if (
      !globalLatestAudit ||
      !RECALLABLE_ACTION_CODES.includes(globalLatestAudit.actionCode) ||
      BLOCKED_RECALL_STAGE_STATUSES.includes(globalStageStatus)
    ) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    const sortedOutgoingAudit = [...audit]
      .filter((a) => a != null)
      .sort((a, b) => getAuditTimestamp(a) - getAuditTimestamp(b));

    const isProcessedStatus = (val: any) =>
      val === 'DA_XU_LY' || val === 'Đã xử lý';

    const isRecallEligibleStatus = (auditRow: any) =>
      auditRow?.actionCode === 'THU_HOI' ||
      auditRow?.actionCode === 'Thu hồi' ||
      isProcessedStatus(auditRow?.stageStatus);

    const isUnprocessedStatus = (val: any) =>
      val === 'CHUA_XU_LY' || val === 'Chưa xử lý';

    const isFinalBlockedStatus = (val: any) =>
      isStatus(val,
        'Hoàn thành VBDT', 'HOAN_THANH_VBDT',
        'Chờ ban hành', 'CHO_BAN_HANH',
        'Cho số', 'CHO_SO',
        'Ban hành', 'DA_BAN_HANH',
        'DONG_Y_VBDT', 'DE_NGHI_BH',
        'CHO_DONG_DAU', 'DA_DONG_DAU'
      );

    let latestProcessedIndex = -1;
    let latestProcessedAudit: any = null;

    for (let i = sortedOutgoingAudit.length - 1; i >= 0; i--) {
      const a = sortedOutgoingAudit[i];
      if (!a) continue;

      const isUserAudit = a.receiver === userId;
      const isUserSender = (a.userId === userId || a.createdBy === userId)
        && RECALLABLE_ACTION_CODES.includes(a.actionCode);

      if ((isUserAudit || isUserSender) && isRecallEligibleStatus(a)) {
        latestProcessedIndex = i;
        latestProcessedAudit = a;
        break;
      }

      if (isUserSender && isUnprocessedStatus(a.stageStatus)) {
        let hasBeenProcessedAfter = false;
        for (let j = i + 1; j < sortedOutgoingAudit.length; j++) {
          const next = sortedOutgoingAudit[j];
          if (!next) continue;
          if (isProcessedStatus(next.stageStatus) && next.receiver !== userId) {
            hasBeenProcessedAfter = true;
            break;
          }
          if (isFinalBlockedStatus(next.stageStatus)) {
            hasBeenProcessedAfter = true;
            break;
          }
          if (next.actionCode === 'KY_SO' || next.actionCode === 'KY_NHAY_NOI_DUNG') {
            hasBeenProcessedAfter = true;
            break;
          }
        }
        if (!hasBeenProcessedAfter) {
          latestProcessedIndex = i;
          latestProcessedAudit = a;
          break;
        }
      }
    }

    if (!latestProcessedAudit) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    for (let i = latestProcessedIndex + 1; i < sortedOutgoingAudit.length; i++) {
      const next = sortedOutgoingAudit[i];
      if (!next) continue;

      if (next.actionCode === 'Thu hồi' || next.actionCode === 'THU_HOI') {
        return {
          allowed: false,
          reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
        };
      }

      if (isFinalBlockedStatus(next.stageStatus)) {
        return {
          allowed: false,
          reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
        };
      }

      if (
        isProcessedStatus(next.stageStatus) &&
        next.receiver &&
        next.receiver !== userId &&
        next.toNodeId !== latestProcessedAudit.toNodeId
      ) {
        return {
          allowed: false,
          reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
        };
      }
    }

    return { allowed: true, reason: 'OK' };
  }

  /**
   * Kiểm tra quyền thu hồi đơn vị nhận nội bộ (VB đi sau ban hành)
   * Logic: VB phải đã ban hành + user phải là người thực hiện ban hành
   * @param audit - Toàn bộ mảng audit của văn bản
   * @param userId - ID user đang thao tác
   * @param actionName - Tên chức năng
   */
  static validateRecallInternalPermission(
    audit: any[],
    userId: string,
    actionName: string = 'thu hồi đơn vị nhận nội bộ',
  ): { allowed: boolean; reason: string } {
    if (!userId) {
      return { allowed: false, reason: 'Thiếu thông tin người dùng' };
    }
    if (!audit || audit.length === 0) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // Tìm audit có action_code BAN_HANH và receiver/createdBy là userId
    const banHanhAudit = audit.find(
      (a) =>
        a &&
        (a.actionCode === 'BAN_HANH' || a.stageStatus === 'DA_BAN_HANH') &&
        (a.receiver === userId || a.createdBy === userId),
    );

    if (!banHanhAudit) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    return { allowed: true, reason: 'OK' };
  }

  /**
   * Kiểm tra quyền trả lại văn bản
   * Chỉ người nhận hiện tại có thể trả lại
   * Không được trả lại nếu đã có hành động trả lại liên tiếp
   * Không được trả lại nếu ở giai đoạn cuối
   */
  static validateReturnPermission(
    audit: any[],
    userId: string,
    actionName: string = 'trả lại văn bản',
  ): { allowed: boolean; reason: string } {
    if (!userId) {
      return { allowed: false, reason: 'Thiếu thông tin người dùng' };
    }
    if (!audit || audit.length === 0) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // Tìm audit mới nhất (support both snake_case and camelCase timestamp fields)
    const latestAudit = [...audit]
      .filter((a) => a != null)
      .sort((a, b) => getAuditTimestamp(b) - getAuditTimestamp(a))[0];

    if (!latestAudit || latestAudit.receiver !== userId) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // Kiểm tra trạng thái cuối
    if (
      latestAudit.stageStatus === 'Hoàn thành VBDT' ||
      latestAudit.stageStatus === 'Chờ ban hành' ||
      latestAudit.stageStatus === 'Cho số' ||
      latestAudit.stageStatus === 'Ban hành' ||
      latestAudit.stageStatus === 'DONG_Y_VBDT' ||
      latestAudit.stageStatus === 'DE_NGHI_BH' ||
      latestAudit.stageStatus === 'CHO_SO' ||
      latestAudit.stageStatus === 'DA_BAN_HANH'
    ) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // Kiểm tra không có hành động 'Trả lại' liên tiếp
    let hasPreviousReturn = false;
    for (let i = audit.length - 1; i >= 0; i--) {
      const a = audit[i];
      if (!a) continue;
      if (a.stageStatus === 'Trả lại') {
        if (hasPreviousReturn) {
          return {
            allowed: false,
            reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
          };
        }
        hasPreviousReturn = true;
      } else if (hasPreviousReturn) {
        // Đã có trả lại, nhưng đã có hành động khác → OK
        break;
      }
    }

    return { allowed: true, reason: 'OK' };
  }

  /**
   * Kiểm tra quyền hoàn thành xử lý
   * Chỉ người xử lý chính hiện tại có thể hoàn thành xử lý
   * Không được hoàn thành nếu đã có hành động chuyển xử lý sau đó
   */
  static validateCompleteProcessingPermission(
    audit: any[],
    userId: string,
    actionName: string = 'hoàn thành xử lý',
  ): { allowed: boolean; reason: string } {
    if (!userId) {
      return { allowed: false, reason: 'Thiếu thông tin người dùng' };
    }
    if (!audit || audit.length === 0) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // Tìm audit mới nhất (support both snake_case and camelCase timestamp fields)
    const latestAudit = [...audit]
      .filter((a) => a != null)
      .sort((a, b) => getAuditTimestamp(b) - getAuditTimestamp(a))[0];

    if (!latestAudit || latestAudit.receiver !== userId) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // Kiểm tra trạng thái cuối
    if (
      latestAudit.stageStatus === 'Hoàn thành VBDT' ||
      latestAudit.stageStatus === 'Chờ ban hành' ||
      latestAudit.stageStatus === 'Cho số' ||
      latestAudit.stageStatus === 'Ban hành' ||
      latestAudit.stageStatus === 'DONG_Y_VBDT' ||
      latestAudit.stageStatus === 'DE_NGHI_BH' ||
      latestAudit.stageStatus === 'CHO_SO' ||
      latestAudit.stageStatus === 'DA_BAN_HANH'
    ) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // Kiểm tra không có hành động 'Chuyển xử lý' sau đó
    let foundCurrent = false;
    for (let i = audit.length - 1; i >= 0; i--) {
      const a = audit[i];
      if (!a) continue;
      if (a.receiver === userId && a.action === 'Xử lý chính') {
        foundCurrent = true;
      } else if (foundCurrent && a.action === 'Chuyển xử lý') {
        return {
          allowed: false,
          reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
        };
      }
    }

    return { allowed: true, reason: 'OK' };
  }

  /**
   * Kiểm tra quyền hoàn thành văn bản
   * Chỉ người xử lý chính có thể hoàn thành văn bản
   * Phải đã hoàn thành xử lý trước đó
   */
  static validateCompleteDocumentPermission(
    audit: any[],
    userId: string,
    actionName: string = 'hoàn thành văn bản',
  ): { allowed: boolean; reason: string } {
    if (!userId) {
      return { allowed: false, reason: 'Thiếu thông tin người dùng' };
    }
    if (!audit || audit.length === 0) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // Tìm audit mới nhất (support both snake_case and camelCase timestamp fields)
    const latestAudit = [...audit]
      .filter((a) => a != null)
      .sort((a, b) => getAuditTimestamp(b) - getAuditTimestamp(a))[0];

    if (!latestAudit || latestAudit.receiver !== userId) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // Kiểm tra trạng thái cuối
    if (
      latestAudit.stageStatus === 'Hoàn thành VBDT' ||
      latestAudit.stageStatus === 'Chờ ban hành' ||
      latestAudit.stageStatus === 'Cho số' ||
      latestAudit.stageStatus === 'Ban hành' ||
      latestAudit.stageStatus === 'DONG_Y_VBDT' ||
      latestAudit.stageStatus === 'DE_NGHI_BH' ||
      latestAudit.stageStatus === 'CHO_SO' ||
      latestAudit.stageStatus === 'DA_BAN_HANH'
    ) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // Kiểm tra đã có hành động 'Hoàn thành xử lý' trước đó
    let hasCompletedProcessing = false;
    for (let i = audit.length - 1; i >= 0; i--) {
      const a = audit[i];
      if (!a) continue;
      if (a.receiver === userId && a.stageStatus === 'Hoàn thành xử lý') {
        hasCompletedProcessing = true;
        break;
      }
    }

    if (!hasCompletedProcessing) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng chưa hoàn thành xử lý`,
      };
    }

    return { allowed: true, reason: 'OK' };
  }

  /**
   * Kiểm tra quyền đánh dấu hoàn thành
   * Chỉ người xử lý chính có thể đánh dấu hoàn thành
   */
  static validateCompletedPermission(
    audit: any[],
    userId: string,
    actionName: string = 'đánh dấu hoàn thành',
  ): { allowed: boolean; reason: string } {
    if (!userId) {
      return { allowed: false, reason: 'Thiếu thông tin người dùng' };
    }
    if (!audit || audit.length === 0) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // Tìm audit mới nhất (support both snake_case and camelCase timestamp fields)
    const latestAudit = [...audit]
      .filter((a) => a != null)
      .sort((a, b) => getAuditTimestamp(b) - getAuditTimestamp(a))[0];

    if (!latestAudit || latestAudit.receiver !== userId) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // Kiểm tra trạng thái cuối
    if (
      latestAudit.stageStatus === 'Hoàn thành VBDT' ||
      latestAudit.stageStatus === 'Chờ ban hành' ||
      latestAudit.stageStatus === 'Cho số' ||
      latestAudit.stageStatus === 'Ban hành' ||
      latestAudit.stageStatus === 'DONG_Y_VBDT' ||
      latestAudit.stageStatus === 'DE_NGHI_BH' ||
      latestAudit.stageStatus === 'CHO_SO' ||
      latestAudit.stageStatus === 'DA_BAN_HANH'
    ) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    return { allowed: true, reason: 'OK' };
  }

  /**
   * Kiểm tra quyền hoàn thành dự thảo
   * Chỉ người tạo dự thảo có thể hoàn thành
   */
  static validateCompleteDraftPermission(
    audit: any[],
    userId: string,
    actionName: string = 'hoàn thành dự thảo',
  ): { allowed: boolean; reason: string } {
    if (!userId) {
      return { allowed: false, reason: 'Thiếu thông tin người dùng' };
    }
    if (!audit || audit.length === 0) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // Tìm audit mới nhất (support both snake_case and camelCase timestamp fields)
    const latestAudit = [...audit]
      .filter((a) => a != null)
      .sort((a, b) => getAuditTimestamp(b) - getAuditTimestamp(a))[0];

    if (!latestAudit || latestAudit.createdBy !== userId) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // Kiểm tra đã có hành động xử lý nào chưa
    for (let i = audit.length - 1; i >= 0; i--) {
      const a = audit[i];
      if (!a) continue;
      if (a.action === 'Xử lý chính' || a.action === 'Chuyển xử lý') {
        return {
          allowed: false,
          reason: `Thực hiện api ${actionName} nhưng đã có hành động xử lý`,
        };
      }
    }

    return { allowed: true, reason: 'OK' };
  }

  /**
   * Kiểm tra quyền phân công xử lý
   * Chỉ người có quyền phân công (quản trị, trưởng phòng) mới được phân công
   */
  static validateAssignPermission(
    audit: any[],
    userId: string,
    newProcessorId: string,
    actionName: string = 'phân công xử lý',
  ): { allowed: boolean; reason: string } {
    if (!userId) {
      return { allowed: false, reason: 'Thiếu thông tin người dùng' };
    }
    if (!audit || audit.length === 0) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // Tìm audit mới nhất (support both snake_case and camelCase timestamp fields)
    const latestAudit = [...audit]
      .filter((a) => a != null)
      .sort((a, b) => getAuditTimestamp(b) - getAuditTimestamp(a))[0];

    // Kiểm tra trạng thái cuối
    if (
      latestAudit.stageStatus === 'Hoàn thành VBDT' ||
      latestAudit.stageStatus === 'Chờ ban hành' ||
      latestAudit.stageStatus === 'Cho số' ||
      latestAudit.stageStatus === 'Ban hành' ||
      latestAudit.stageStatus === 'DONG_Y_VBDT' ||
      latestAudit.stageStatus === 'DE_NGHI_BH' ||
      latestAudit.stageStatus === 'CHO_SO' ||
      latestAudit.stageStatus === 'DA_BAN_HANH'
    ) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // Chỉ người có quyền phân công mới được phép
    // Giả sử: người có quyền phân công là người có vai trò 'ADMIN' hoặc 'DEPARTMENT_HEAD'
    // (Trong thực tế cần gọi service để kiểm tra vai trò)
    // Vì không có service kiểm tra vai trò, nên tạm dùng logic: nếu userId là người tạo văn bản hoặc là người xử lý hiện tại thì cho phép
    if (
      latestAudit.createdBy !== userId &&
      latestAudit.receiver !== userId
    ) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền phân công`,
      };
    }

    // Kiểm tra người mới phân công có hợp lệ không
    if (!newProcessorId) {
      return {
        allowed: false,
        reason: 'Người được phân công không hợp lệ',
      };
    }

    return { allowed: true, reason: 'OK' };
  }

  /**
   * Kiểm tra quyền giao nhận để biết
   * Chỉ người có quyền phân công (quản trị, trưởng phòng) mới được giao nhận để biết
   */
  static validateAssignViewerPermission(
    audit: any[],
    userId: string,
    viewerId: string,
    actionName: string = 'giao nhận để biết',
  ): { allowed: boolean; reason: string } {
    if (!userId) {
      return { allowed: false, reason: 'Thiếu thông tin người dùng' };
    }
    if (!audit || audit.length === 0) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // Tìm audit mới nhất (support both snake_case and camelCase timestamp fields)
    const latestAudit = [...audit]
      .filter((a) => a != null)
      .sort((a, b) => getAuditTimestamp(b) - getAuditTimestamp(a))[0];

    // Kiểm tra trạng thái cuối
    if (
      latestAudit.stageStatus === 'Hoàn thành VBDT' ||
      latestAudit.stageStatus === 'Chờ ban hành' ||
      latestAudit.stageStatus === 'Cho số' ||
      latestAudit.stageStatus === 'Ban hành' ||
      latestAudit.stageStatus === 'DONG_Y_VBDT' ||
      latestAudit.stageStatus === 'DE_NGHI_BH' ||
      latestAudit.stageStatus === 'CHO_SO' ||
      latestAudit.stageStatus === 'DA_BAN_HANH'
    ) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // Chỉ người có quyền phân công mới được phép
    if (
      latestAudit.createdBy !== userId &&
      latestAudit.receiver !== userId
    ) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền giao nhận để biết`,
      };
    }

    // Kiểm tra người được giao có hợp lệ không
    if (!viewerId) {
      return {
        allowed: false,
        reason: 'Người được giao nhận để biết không hợp lệ',
      };
    }

    return { allowed: true, reason: 'OK' };
  }

  /**
   * Kiểm tra quyền phê duyệt
   * Chỉ người có thẩm quyền phê duyệt (phó phòng, trưởng phòng) mới được phê duyệt
   */
  static validateApprovePermission(
    audit: any[],
    userId: string,
    actionName: string = 'phê duyệt',
  ): { allowed: boolean; reason: string } {
    if (!userId) {
      return { allowed: false, reason: 'Thiếu thông tin người dùng' };
    }
    if (!audit || audit.length === 0) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // Tìm audit mới nhất (support both snake_case and camelCase timestamp fields)
    const latestAudit = [...audit]
      .filter((a) => a != null)
      .sort((a, b) => getAuditTimestamp(b) - getAuditTimestamp(a))[0];

    // Kiểm tra trạng thái cuối
    if (
      latestAudit.stageStatus === 'Hoàn thành VBDT' ||
      latestAudit.stageStatus === 'Chờ ban hành' ||
      latestAudit.stageStatus === 'Cho số' ||
      latestAudit.stageStatus === 'Ban hành' ||
      latestAudit.stageStatus === 'DONG_Y_VBDT' ||
      latestAudit.stageStatus === 'DE_NGHI_BH' ||
      latestAudit.stageStatus === 'CHO_SO' ||
      latestAudit.stageStatus === 'DA_BAN_HANH'
    ) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // Phải đã hoàn thành xử lý chính
    let hasCompletedProcessing = false;
    for (let i = audit.length - 1; i >= 0; i--) {
      const a = audit[i];
      if (!a) continue;
      if (a.stageStatus === 'Hoàn thành xử lý') {
        hasCompletedProcessing = true;
        break;
      }
    }

    if (!hasCompletedProcessing) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng chưa hoàn thành xử lý`,
      };
    }

    // Chỉ người có thẩm quyền phê duyệt mới được phép
    // Giả sử: người có thẩm quyền phê duyệt là người có vai trò 'DEPARTMENT_HEAD' hoặc 'ADMIN'
    if (
      latestAudit.createdBy !== userId &&
      latestAudit.receiver !== userId
    ) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền phê duyệt`,
      };
    }

    return { allowed: true, reason: 'OK' };
  }

  /**
   * Kiểm tra quyền ký văn bản
   * Chỉ người có thẩm quyền ký (giám đốc, phó giám đốc) mới được ký
   */
  static validateSignPermission(
    audit: any[],
    userId: string,
    actionName: string = 'ký văn bản',
  ): { allowed: boolean; reason: string } {
    if (!userId) {
      return { allowed: false, reason: 'Thiếu thông tin người dùng' };
    }
    if (!audit || audit.length === 0) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // Tìm audit mới nhất (support both snake_case and camelCase timestamp fields)
    const latestAudit = [...audit]
      .filter((a) => a != null)
      .sort((a, b) => getAuditTimestamp(b) - getAuditTimestamp(a))[0];

    // Kiểm tra trạng thái cuối
    if (
      latestAudit.stageStatus === 'Hoàn thành VBDT' ||
      latestAudit.stageStatus === 'Chờ ban hành' ||
      latestAudit.stageStatus === 'Cho số' ||
      latestAudit.stageStatus === 'Ban hành' ||
      latestAudit.stageStatus === 'DONG_Y_VBDT' ||
      latestAudit.stageStatus === 'DE_NGHI_BH' ||
      latestAudit.stageStatus === 'CHO_SO' ||
      latestAudit.stageStatus === 'DA_BAN_HANH'
    ) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // Phải đã được phê duyệt
    let hasApproved = false;
    for (let i = audit.length - 1; i >= 0; i--) {
      const a = audit[i];
      if (!a) continue;
      if (a.action === 'Phê duyệt') {
        hasApproved = true;
        break;
      }
    }

    if (!hasApproved) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng chưa được phê duyệt`,
      };
    }

    // Chỉ người có thẩm quyền ký mới được phép
    // Giả sử: người có thẩm quyền ký là người có vai trò 'DIRECTOR' hoặc 'DEPUTY_DIRECTOR'
    if (
      latestAudit.createdBy !== userId &&
      latestAudit.receiver !== userId
    ) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền ký văn bản`,
      };
    }

    return { allowed: true, reason: 'OK' };
  }

  /**
   * Kiểm tra quyền ban hành
   * Chỉ người có thẩm quyền ban hành (giám đốc) mới được ban hành
   */
  static validatePromulgatePermission(
    audit: any[],
    userId: string,
    actionName: string = 'ban hành',
  ): { allowed: boolean; reason: string } {
    if (!userId) {
      return { allowed: false, reason: 'Thiếu thông tin người dùng' };
    }
    if (!audit || audit.length === 0) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // Tìm audit mới nhất (support both snake_case and camelCase timestamp fields)
    const latestAudit = [...audit]
      .filter((a) => a != null)
      .sort((a, b) => getAuditTimestamp(b) - getAuditTimestamp(a))[0];

    // Kiểm tra trạng thái cuối
    if (
      latestAudit.stageStatus === 'Hoàn thành VBDT' ||
      latestAudit.stageStatus === 'Chờ ban hành' ||
      latestAudit.stageStatus === 'Cho số' ||
      latestAudit.stageStatus === 'Ban hành' ||
      latestAudit.stageStatus === 'DONG_Y_VBDT' ||
      latestAudit.stageStatus === 'DE_NGHI_BH' ||
      latestAudit.stageStatus === 'CHO_SO' ||
      latestAudit.stageStatus === 'DA_BAN_HANH'
    ) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // Phải đã được ký
    let hasSigned = false;
    for (let i = audit.length - 1; i >= 0; i--) {
      const a = audit[i];
      if (!a) continue;
      if (a.action === 'Ký văn bản' || a.actionCode === 'KY_VAN_BAN') {
        hasSigned = true;
        break;
      }
    }

    if (!hasSigned) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng chưa được ký`,
      };
    }

    // Chỉ người có thẩm quyền ban hành mới được phép
    // Giả sử: người có thẩm quyền ban hành là người có vai trò 'DIRECTOR'
    if (
      latestAudit.createdBy !== userId &&
      latestAudit.receiver !== userId
    ) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền ban hành`,
      };
    }

    return { allowed: true, reason: 'OK' };
  }

  /**
   * Kiểm tra quyền đề nghị ban hành
   * Chỉ người tạo hoặc trưởng phòng mới được đề nghị
   */
  static validateProposeReleasePermission(
    audit: any[],
    userId: string,
    actionName: string = 'đề nghị ban hành',
  ): { allowed: boolean; reason: string } {
    if (!userId) {
      return { allowed: false, reason: 'Thiếu thông tin người dùng' };
    }
    if (!audit || audit.length === 0) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // Tìm audit mới nhất (support both snake_case and camelCase timestamp fields)
    const latestAudit = [...audit]
      .filter((a) => a != null)
      .sort((a, b) => getAuditTimestamp(b) - getAuditTimestamp(a))[0];

    // Kiểm tra trạng thái cuối
    if (
      latestAudit.stageStatus === 'Hoàn thành VBDT' ||
      latestAudit.stageStatus === 'Chờ ban hành' ||
      latestAudit.stageStatus === 'Cho số' ||
      latestAudit.stageStatus === 'Ban hành' ||
      latestAudit.stageStatus === 'DONG_Y_VBDT' ||
      latestAudit.stageStatus === 'DE_NGHI_BH' ||
      latestAudit.stageStatus === 'CHO_SO' ||
      latestAudit.stageStatus === 'DA_BAN_HANH'
    ) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
    }

    // Chỉ người tạo hoặc trưởng phòng mới được phép
    if (
      latestAudit.createdBy !== userId &&
      latestAudit.receiver !== userId
    ) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền đề nghị ban hành`,
      };
    }

    return { allowed: true, reason: 'OK' };
  }
}
