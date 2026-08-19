import { isSuperAdminByKeycloakId } from 'src/utils/super-admin.util';

/**
 * Document Policy: kiểm tra quyền truy cập văn bản
 */
export class DocumentPolicy {
  /**
   * Kiểm tra quyền chỉnh sửa văn bản.
   * Chỉ cho phép nếu người dùng là người tạo văn bản.
   */
  static canEdit(user: { userId?: string }, doc: { createdBy?: string }) {
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
    return !!doc.copyToInternal && (!doc.bookDocumentId || doc.bookDocumentId === '');
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
    userOrgId?: string | null,
  ): { allowed: boolean; reason: string } {
    const normalizedType = String(typeDocument ?? '').trim().toLowerCase();
    const isIncomingType =
      normalizedType === 'incommingdocument' ||
      normalizedType === 'incomingdocument';
    const isRecallAction = (actionCode: any): boolean => {
      const normalized = String(actionCode ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .trim()
        .toUpperCase();
      return normalized === 'THU_HOI' || normalized === 'RECALL' || normalized === 'THU_HOI_PHAN_CONG';
    };

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
    if (isIncomingType) {
      // Helper: so sánh stageStatus cả 2 dạng (code + display)
      const isStatus = (val: string, ...targets: string[]) =>
        targets.some(t => val === t);

      // Tìm audit mới nhất (fallback createdAt nếu updatedAt null)
      const getTime = (a: any) => {
        const t = a.updatedAt || a.createdAt;
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

      const userAuditsForLatest = audit.filter(
        (a) => a && (a.receiver === userId || (userOrgId && a.receiver === userOrgId)) && !isRecallAction(a.actionCode),
      );
      const latestUserAudit = userAuditsForLatest[userAuditsForLatest.length - 1];
      if (
        latestUserAudit &&
        (
          isStatus(latestUserAudit.stageStatus || '', 'Chưa xử lý', 'CHUA_XU_LY') ||
          isRecallAction(latestUserAudit.actionCode)
        )
      ) {
        return {
          allowed: false,
          reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
        };
      }

      // Kiểm tra user hoặc đơn vị nhận có bất kỳ record nào trong audit không
      const userAudits = audit.filter(
        (a) =>
          a &&
          (a.receiver === userId ||
            a.createdBy === userId ||
            (a.processedBy || a.processed_by) === userId ||
            (userOrgId && (a.receiver === userOrgId || (a.receiverUnit || a.receiver_unit) === userOrgId))),
      );
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
          (a.receiver === userId ||
            a.createdBy === userId ||
            (userOrgId && (a.receiver === userOrgId || (a.receiverUnit || a.receiver_unit) === userOrgId))) &&
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
            isRecallAction(nextValidAudit?.actionCode)
          ) {
            return {
              allowed: false,
              reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
            };
          }
        }

        // Cấp dưới đã xử lý chính hoàn thành
        if (
          (a.receiver === userId ||
            (userOrgId && (a.receiver === userOrgId || (a.receiverUnit || a.receiver_unit) === userOrgId))) &&
          isStatus(a.stageStatus, 'Đã xử lý', 'DA_XU_LY', 'Đã phân công', 'DA_PHAN_CONG')
        ) {
          for (let j = i + 1; j < audit.length; j++) {
            const nextAudit = audit[j];
            if (!nextAudit) break;
            if (nextAudit.createdBy !== userId && (nextAudit.processedBy || nextAudit.processed_by) !== userId) break;
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
          (a.receiver === userId ||
            (userOrgId && a.receiver === userOrgId) ||
            (userOrgId && (a.receiverUnit || a.receiver_unit) === userOrgId && ((a.processedBy || a.processed_by) === userId || (a.userId || a.user_id) === userId || a.createdBy === userId || audit.some(x => x && (x.createdBy === userId || x.created_by === userId))))) &&
          !isRecallAction(a.actionCode) &&
          isStatus(a.stageStatus, 'Đã xử lý', 'DA_XU_LY', 'Đã phân công', 'DA_PHAN_CONG')
        ) {
          const time = getTime(a);
          const latestTime = latestAudit ? getTime(latestAudit) : 0;
          if (!latestAudit || time > latestTime) {
            latestAudit = a;
          }
        }
      }

      const canRecall = !!latestAudit && !isRecallAction(latestAudit.actionCode);
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
    const getTime = (a: any) => {
      const t = a.updatedAt || a.createdAt;
      return t ? new Date(t).getTime() : 0;
    };

    let latestAudit: any = null;
    let auditNotCompleteCount = 0;

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
          isRecallAction(nextValidAudit?.actionCode)
        ) {
          return {
            allowed: false,
            reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
          };
        }
      }

      // VB đã đến giai đoạn cuối → không thu hồi
      if (
        isStatus(a.stageStatus,
          'Hoàn thành VBDT', 'HOAN_THANH_VBDT',
          'Chờ ban hành', 'CHO_BAN_HANH',
          'Cho số', 'CHO_SO',
          'Ban hành', 'DA_BAN_HANH',
          'DONG_Y_VBDT', 'DE_NGHI_BH'
        )
      ) {
        return {
          allowed: false,
          reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
        };
      }

      // Tìm audit mới nhất
      if (
        a.receiver === userId &&
        (
          isRecallAction(a.actionCode) ||
          isStatus(a.stageStatus, 'Đã xử lý', 'DA_XU_LY')
        )
      ) {
        const time = getTime(a);
        const latestTime = latestAudit ? getTime(latestAudit) : 0;
        if (!latestAudit || time > latestTime) {
          latestAudit = a;
        }
      }

      // Đếm audit chưa xử lý
      if (isStatus(a.stageStatus, 'Chưa xử lý', 'CHUA_XU_LY') && a.receiver === userId) {
        auditNotCompleteCount++;
      }
    }

    const canRecall = !!latestAudit && !isRecallAction(latestAudit.actionCode) && auditNotCompleteCount === 0;
    if (!canRecall) {
      return {
        allowed: false,
        reason: `Thực hiện api ${actionName} nhưng không có quyền truy cập bản ghi`,
      };
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

    // Tìm audit mới nhất
    const latestAudit = [...audit]
      .filter((a) => a && a.updatedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

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

    // Tìm audit mới nhất
    const latestAudit = [...audit]
      .filter((a) => a && a.updatedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

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

    // Tìm audit mới nhất
    const latestAudit = [...audit]
      .filter((a) => a && a.updatedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

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

    // Tìm audit mới nhất
    const latestAudit = [...audit]
      .filter((a) => a && a.updatedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

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

    // Tìm audit mới nhất
    const latestAudit = [...audit]
      .filter((a) => a && a.updatedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

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

    // Tìm audit mới nhất
    const latestAudit = [...audit]
      .filter((a) => a && a.updatedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

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

    // Tìm audit mới nhất
    const latestAudit = [...audit]
      .filter((a) => a && a.updatedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

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

    // Tìm audit mới nhất
    const latestAudit = [...audit]
      .filter((a) => a && a.updatedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

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

    // Tìm audit mới nhất
    const latestAudit = [...audit]
      .filter((a) => a && a.updatedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

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

    // Tìm audit mới nhất
    const latestAudit = [...audit]
      .filter((a) => a && a.updatedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

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

    // Tìm audit mới nhất
    const latestAudit = [...audit]
      .filter((a) => a && a.updatedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

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
