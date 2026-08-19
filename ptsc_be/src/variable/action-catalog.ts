// src/bpmn/action-catalog.ts

export default {

    actions: {
        TRINH_LD: { type: 'transfer', selectionMode: 'single', label: 'TRÌNH LÃNH ĐẠO' },
        TRINH_TPSL: { type: 'transfer', selectionMode: 'single', label: 'TRÌNH TRƯỞNG PHÒNG SƠ LOẠI', getLable: true },
        TRINH_TP: { type: 'transfer', selectionMode: 'single', label: 'TRÌNH TRƯỞNG PHÒNG', getLable: true },
        TRINH_GIAM_DOC: { type: 'transfer', selectionMode: 'single', label: 'TRÌNH GIÁM ĐỐC', getLable: true },
        CHUYEN_XU_LY: { type: 'transfer', selectionMode: 'single', label: 'CHUYỂN XỬ LÝ', getLable: true },
        HOAN_THANH: { type: 'complete', selectionMode: 'single', label: 'HOÀN THÀNH XỬ LÝ', getLable: true },
        HOAN_THANH_XU_LY: { type: 'complete', selectionMode: 'single', label: 'HOÀN THÀNH XỬ LÝ', getLable: true },
        HOAN_THANH_VAN_BAN: { type: 'completeDoc', selectionMode: 'single', label: 'HOÀN THÀNH VĂN BẢN', getLable: true },
        YES: { type: 'transfer', selectionMode: 'single', label: 'ĐỒNG Ý', },
        NO: { type: 'return', selectionMode: 'single', label: 'TRẢ LẠI', },
        TRA_LAI: { type: 'return', selectionMode: 'single', label: 'TRẢ LẠI', order: 3, getLable: true },
        PHAN_CONG: { type: 'transfer', selectionMode: 'multi', label: 'PHÂN CÔNG ĐA NHÁNH' },
        XU_LY_CHINH: { type: 'transfer', selectionMode: 'multi', label: 'Chỉ đạo/Xử lý chính', constraints: { min: 1 } },
        PHOI_HOP: { type: 'transfer', selectionMode: 'multi', label: 'Phối hợp', constraints: { min: 0 } },
        NHAN_DE_BIET: { type: 'transfer', selectionMode: 'multi', label: 'Nhận để biết', constraints: { min: 0 } },
        HOAN_THANH_PHOI_HOP: { type: 'completeSupport', selectionMode: 'single', label: 'HOÀN THÀNH PHỐI HỢP', getLable: true },
        DA_XEM: { type: 'viewed', selectionMode: 'single', label: 'ĐÃ XEM', getLable: true },
        CHUYEN_PHOI_HOP: { type: 'transferSupport', selectionMode: 'single', label: 'CHUYỂN PHỐI HỢP', getLable: true },
        TRINH_KY: { type: 'signingSubmission', selectionMode: 'single', label: 'TRÌNH KÝ', getLable: true },
        TRINH_LANH_DAO: { type: 'signingSubmission', selectionMode: 'single', label: 'TRÌNH KÝ', getLable: true },
        TRINH_KIEM_TRA_TT: { type: 'signingSubmission', selectionMode: 'single', label: 'TRÌNH DUYỆT', getLable: true },

        TRINH: { type: 'signingSubmission', selectionMode: 'single', label: 'TRÌNH KÝ' },
        XIN_Y_KIEN: { type: 'feedback', selectionMode: 'single', label: 'XIN Ý KIẾN', getLable: true },
        // NGUOI_KY_NOI_DUNG: { type: 'feedback', selectionMode: 'single', label: 'Người ký nội dung' },
        // NGUOI_KY_THE_THUC: { type: 'feedback', selectionMode: 'single', label: 'Người ký thể thức' },
        CHUYEN_CHO_Y_KIEN: { type: 'transferFeedback', selectionMode: 'single', label: 'CHUYỂN CHO Ý KIẾN' },
        CHUYEN_CHO_PTP: { type: 'transferFeedback', selectionMode: 'single', label: 'Phó trưởng phòng', getLable: true },
        CHUYEN_CHO_CB: { type: 'transferFeedback', selectionMode: 'single', label: 'Cán bộ', getLable: true },
        CHUYEN_CHO_PGD: { type: 'transferFeedback', selectionMode: 'single', label: 'Phó giám đốc', getLable: true },
        CHUYEN_CHO_TP: { type: 'transferFeedback', selectionMode: 'single', label: 'Trưởng phòng', getLable: true },
        DONG_Y_DU_THAO: { type: 'approve', selectionMode: 'single', label: 'ĐỒNG Ý DỰ THẢO', getLable: true },
        HT_VBTT: { type: 'completeProposal', selectionMode: 'single', label: 'HOÀN THÀNH VBTT', getLable: true },
        BAN_HANH: { type: 'issueProposal', selectionMode: 'single', label: 'PHÁT HÀNH', getLable: true },
        DE_NGHI_BAN_HANH: { type: 'suggestPromulgate', selectionMode: 'single', label: 'ĐỀ NGHỊ BAN HÀNH', getLable: true },
        THU_HOI: { type: 'recall', selectionMode: 'single', label: 'Thu hồi', getLable: true },
        CHUYEN_TUY_CHON: { type: 'transfer', scType: 'CHUYEN_TUY_CHON', selectionMode: 'multi', label: 'CHUYỂN TÙY CHỌN', getLable: true },
        VAN_BAN_DANG_XU_LY: { type: 'transfer', selectionMode: 'single', label: 'Văn bản đang xử lý' },
        KY_NHAY_NOI_DUNG: { type: 'signContentDraft', selectionMode: 'single', label: 'Ký nháy nội dung', getLable: true },
        KY_NHAY_THE_THUC: { type: 'signFormatDraft', selectionMode: 'single', label: 'Ký nháy thể thức', getLable: true },
        KY_SO: { type: 'digitalSign', selectionMode: 'single', label: 'Ký số', getLable: true },

        // Các biến không dùng nhưng trước đó đã dùng. Dùng để map danh sách cũ 
        CREATE: { type: 'transfer', selectionMode: 'single', label: 'Văn bản tạo mới' },
        CHO_SO: { type: 'transfer', selectionMode: 'single', label: 'Chờ cho số' },
        DA_CHO_SO: { type: 'transfer', selectionMode: 'single', label: 'Đã cho số' },
        TRA_LAI_VT: { type: 'return', selectionMode: 'single', label: 'Trả lại văn thư' },
        TRA_LAI_TPSL: { type: 'return', selectionMode: 'single', label: 'Trả lại trưởng phòng sơ loại' },
        CHUYEN_PTP: { type: 'transfer', selectionMode: 'single', label: 'Chuyển phó trưởng phòng' },
        CHUYEN_TP: { type: 'transfer', selectionMode: 'single', label: 'Chuyển trưởng phòng' },
        CHO__Y_KIEN: { type: 'transferFeedback', selectionMode: 'single', label: 'Cho ý kiến' },
        CHUYEN_TRUONG_PHONG: { type: 'transfer', selectionMode: 'single', label: 'Chuyển trưởng phòng' },


        DONG_Y_PHE_DUYET: { type: 'agreetask', selectionMode: 'single', label: 'Phê duyệt', getLable: true },
        TU_CHOI_PHE_DUYET: { type: 'rejecttask', selectionMode: 'single', label: 'Từ chối', getLable: true },
        PHE_DUYET: { type: 'approvetask', selectionMode: 'single', label: 'Phê duyệt', getLable: true },
        GUI_PHE_DUYET: { type: 'approvetaskformdoc', selectionMode: 'single', label: 'Trình Phê duyệt', getLable: true },
        GUI_DIEU_CHINH: { type: 'taskformdoc', selectionMode: 'single', label: 'Phản hồi', getLable: true },
        DONG_Y_DIEU_CHINH: { type: 'approvetask', selectionMode: 'single', label: 'Phê duyệt', getLable: true },
        THUC_HIEN: { type: 'taskformdoc', selectionMode: 'single', label: 'Thực hiện', getLable: true },
        DIEU_CHINH: { type: 'updatetasks', selectionMode: 'single', label: 'Điều chỉnh', getLable: true },
        PHE_DUYET_DIEU_CHINH: { type: 'updatetasks', selectionMode: 'single', label: 'Điều chỉnh', getLable: true },
        NGUOI_PHOI_HOP: { type: 'combination', selectionMode: 'single', label: '', getLable: true },


        TRINH_VAN_BAN: { type: 'signingSubmission', selectionMode: 'single', label: 'TRÌNH VĂN BẢN' },
        GIAO_VIEC: { type: 'updatetask', selectionMode: 'single', label: 'Xác nhận điều chỉnh', getLable: true },
        XAC_NHAN_DIEU_CHINH: { type: 'updatetask', selectionMode: 'single', label: 'Xác nhận điều chỉnh', getLable: true },
        XAC_NHAN_DIEU_CHINH_DOC: { type: 'updatetaskformdoc', selectionMode: 'single', label: 'Xác nhận điều chỉnh', getLable: true },
        TU_CHOI: { type: 'rejecttask', selectionMode: 'single', label: 'Từ chối', getLable: true },
        DONG_Y: { type: 'approvetask', selectionMode: 'single', label: 'Đồng ý', getLable: true },

        //tin tức
        TRINH_DUYET: { type: 'submitnews', selectionMode: 'single', label: 'Trình duyệt', getLable: true },
        LUU_NHAP: { type: 'savenews', selectionMode: 'single', label: 'Lưu nháp', getLable: true },
        DUYET: { type: 'approvenews', selectionMode: 'single', label: 'Duyệt tin', getLable: true },
        TRA_LAI_TIN: { type: 'rejectnews', selectionMode: 'single', label: 'Trả lại tin', getLable: true },
        HUY_TIN: { type: 'cancelnews', selectionMode: 'single', label: 'Hủy tin', getLable: true },

        // Lịch
        TRINH_LICH: { type: 'transfer_meeting', selectionMode: 'single', label: 'Trình duyệt', getLable: true },
        PHE_DUYET_LICH: { type: 'agree_meeting', selectionMode: 'single', label: 'Phê duyệt', getLable: true },
        TU_CHOI_LICH: { type: 'reject_meeting', selectionMode: 'single', label: 'Từ chối', getLable: true },
        XAC_NHAN_THAM_GIA_LICH: { type: 'confirm_join_meeting', selectionMode: 'single', label: 'Xác nhận tham gia', getLable: true },
        XU_LY_LICH: { type: 'process_meeting', selectionMode: 'single', label: 'Xử lý lịch', getLable: true },
        THAM_GIA_LICH: { type: 'confirm_join', selectionMode: 'single', label: 'Xác nhận tham gia', getLable: true },
        // KHONG_THAM_GIA_LICH: { type: 'reject_join', selectionMode: 'single', label: 'Không tham gia', getLable: true },
        UY_QUYEN_LICH: { type: 'delegate_join', selectionMode: 'single', label: 'Ủy quyền', getLable: true },
        XU_LY_LICH_CA_NHAN: { type: 'process_meeting_user', selectionMode: 'single', label: 'Xử lý lịch', getLable: true },
        CAP_NHAT_LICH: { type: 'update_meeting', selectionMode: 'single', label: 'Cập nhật lịch', getLable: true },
        GAN_CHO_NGOI_LICH: { type: 'seat_assigment', selectionMode: 'single', label: 'Xử lý lịch', getLable: true },
        CAP_NHAT_XU_LY_LICH: { type: 'update_proceesed', selectionMode: 'single', label: 'Cập nhật xử lý', getLable: true },
    },

    getOrder(code?: string): number {
        if (!code) return 999;
        const catalogAction = (this.actions as any)[code.toUpperCase()];
        if (catalogAction && catalogAction.order !== undefined) {
            return catalogAction.order * 10;
        }
        return 50;
    },
    isReturn(code?: string): boolean {
        if (!code) return false;
        const c = code.toUpperCase();
        return c === 'NO' || c.startsWith('TRA_LAI');
    },
    isChuyenTuyChon(code?: string): boolean {
        if (!code) return false;
        const c = code.toUpperCase();
        return c === 'CHUYEN_TUY_CHON';
    },

    inclusiveSubActionFor(flowName?: string): 'XU_LY_CHINH' | 'PHOI_HOP' | 'NHAN_DE_BIET' | null {
        if (!flowName) return null;
        const up = flowName.toUpperCase();
        if (up.includes('XU_LY_CHINH')) return 'XU_LY_CHINH';
        if (up.includes('PHOI_HOP')) return 'PHOI_HOP';
        if (up.includes('NHAN_DE_BIET')) return 'NHAN_DE_BIET';
        return null;
    },
} as const;
