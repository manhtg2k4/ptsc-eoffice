const actionToStatus = {
    TIEP_NHAN: 1,
    TRINH_TPSL: 2,
    TRINH_TP: 2,
    TRINH_GIAM_DOC: 3,
    HOAN_THANH_VAN_BAN: 3.5,
    TRINH_LD: 4,
    HOAN_THANH: 4.5,
    CHUYEN_XU_LY: 5,
};


const documentKeyMap = {
    document_id: 'documentId',
    status_code: 'statusCode',
    book_document_id: 'bookDocumentId',
    name: 'name',
    abstract_note: 'abstractNote',
    to_book: 'toBook',
    sender_unit: 'senderUnit',
    receiver_unit: 'receiverUnit',
    document_date: 'documentDate',
    receive_date: 'receiveDate',
    to_book_date: 'toBookDate',
    deadline: 'deadline',
    second_book: 'secondBook',
    receive_method: 'receiveMethod',
    private_level: 'privateLevel',
    urgency_level: 'urgencyLevel',
    document_type: 'documentType',
    type_document: 'typeDocument',
    document_field: 'documentField',
    signer: 'signer',
    manager_book: 'managerBook',
    to_book_code: 'toBookCode',
    count: 'count',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
    active: 'active'
};

const stageStatusDoc = {
    /** Chưa xử lý - Mới được phân công, chưa ai động vào phần hscv */
    TU_CHOI_PHE_DUYET: 'TU_CHOI_PHE_DUYET',
    THUC_HIEN: 'THUC_HIEN',
    TU_CHOI: 'TU_CHOI',
    DONG_Y_DIEU_CHINH: 'DONG_Y_DIEU_CHINH',

    /** Chưa xử lý - Mới được phân công, chưa ai động vào phần hscv */
    DIEU_CHINH: 'DIEU_CHINH',
    PHE_DUYET_DIEU_CHINH: 'PHE_DUYET_DIEU_CHINH',

    /** Chưa xử lý - Mới được phân công, chưa ai động vào phần hscv */
    GUI_PHE_DUYET: 'GUI_PHE_DUYET',
    GUI_DIEU_CHINH: 'GUI_DIEU_CHINH',

    /** Chưa xử lý - Mới được phân công, chưa ai động vào */
    CHUA_XU_LY: 'CHUA_XU_LY',
    /** Đã xử lý - Cán bộ đã thực hiện thao tác (gửi lên, trình ký, bổ sung...) */
    DA_XU_LY: 'DA_XU_LY',
    /** Đã phân công - Cán bộ đã thực hiện thao tác (gửi lên, trình ký, bổ sung...) sau khi được chỉ đạo từ lãnh đạo */
    DA_PHAN_CONG: 'DA_PHAN_CONG',
    /** Trả lại - Lãnh đạo trả hồ sơ về cho bước trước để bổ sung/sửa chữa */
    TRA_LAI: 'TRA_LAI',
    /** Đã xem - Người được phân công đã mở hồ sơ (thường dùng cho lãnh đạo xem để biết) */
    DA_XEM: 'DA_XEM',

    /** Hoàn thành - Stage này đã kết thúc thành công (không cần làm gì thêm) */
    HOAN_THANH: 'HOAN_THANH',
    /** Hoàn thành văn bản - Dùng cho stage soạn thảo văn bản cuối cùng */
    HOAN_THANH_VAN_BAN: 'HOAN_THANH_VAN_BAN',

    /** Hoàn thành văn bản tờ trình - Cán bộ trình ký đã hoàn thành việc soạn tờ trình */
    HT_VBTT: 'HT_VBTT',
    /** Đồng ý văn bản dự thảo - Lãnh đạo (Trưởng phòng/P. Giám đốc/Giám đốc) đã phê duyệt tờ trình */
    DONG_Y_VBDT: 'DONG_Y_VBDT',
    DONG_Y_DU_THAO: 'DONG_Y_DU_THAO',
    /** Đã ban hành - Văn thư đã hoàn tất ký số + đóng dấu + phát hành văn bản chính thức */
    DA_BAN_HANH: 'DA_BAN_HANH',
    /** Ban hành tờ trình - Văn thư phòng ban hành tờ trình (khác với ban hành văn bản chính thức) */
    BAN_HANH_TO_TRINH: 'BAN_HANH_TO_TRINH',
    /** Ban hành dự thảo - Văn thư cục ban hành văn bản dự thảo (chưa phải bản chính thức) */
    BAN_HANH_DU_THAO: 'BAN_HANH_DU_THAO',
    /** Thu hồi văn bản đã xử lý */
    THU_HOI: 'THU_HOI',
    DE_NGHI_BH: 'DE_NGHI_BH',
    DA_CHO_SO: 'DA_CHO_SO',

    DONG_Y_PHE_DUYET: 'DONG_Y_PHE_DUYET',
    DANG_XU_LY: 'DANG_XU_LY',

    /** Đang chờ ký của văn bản đi*/
    CHO_KY_NOI_DUNG: 'CHO_KY_NOI_DUNG',
    CHO_KY_THE_THUC: 'CHO_KY_THE_THUC',
    CHO_KY_BAN_HANH: 'CHO_KY_BAN_HANH',
    CHO_KY_PHE_DUYET: 'CHO_KY_PHE_DUYET',
    CHO_KY_NHAY: 'CHO_KY_NHAY',
    CHO_KY_CHINH_THUC: 'CHO_KY_CHINH_THUC',
    CHO_KY_CHINH_THUC_1: 'CHO_KY_CHINH_THUC_1',
    CHO_KY_CHINH_THUC_2: 'CHO_KY_CHINH_THUC_2',
    CHO_KY_CHINH_THUC_3: 'CHO_KY_CHINH_THUC_3',
    CHO_XAC_NHAN: 'CHO_XAC_NHAN',
    CHO_THAM_DINH: 'CHO_THAM_DINH',
    CHO_TOI_LUOT: 'CHO_TOI_LUOT',
    CHO_KY_DONG_DAU: 'CHO_KY_DONG_DAU',

    /**Đang chờ ký sao y của băn bản đến */
    DANG_CHO_KY: 'DANG_CHO_KY',

    KY_SO: 'KY_SO',
    CHO_SO: 'CHO_SO',
    DONG_DAU: 'DONG_DAU',
    KY_PHAT_HANH: 'KY_PHAT_HANH',

    CHO_DONG_DAU: 'CHO_DONG_DAU',
    DA_DONG_DAU: 'DA_DONG_DAU',

    /** Chưa hoàn thành - Dùng cho các task phối hợp bị quá hạn khi xử lý chính kết thúc */
    CHUA_HOAN_THANH: 'CHUA_HOAN_THANH',

    HOAN_THANH_GD: 'HOAN_THANH_GD',
    DA_KY_BAN_HANH: 'DA_KY_BAN_HANH',
    DA_KY_NHAY: 'DA_KY_NHAY',
    DA_KY_NOI_DUNG: 'DA_KY_NOI_DUNG',
    DA_KY_THE_THUC: 'DA_KY_THE_THUC',
    DA_KY_PHE_DUYET: 'DA_KY_PHE_DUYET',
    DA_KY_CHINH_THUC_1: 'DA_KY_CHINH_THUC_1',
    DA_KY_CHINH_THUC_2: 'DA_KY_CHINH_THUC_2',
    DA_KY_CHINH_THUC_3: 'DA_KY_CHINH_THUC_3',
    HOAN_THANH_LUAN_CHUYEN: 'HOAN_THANH_LUAN_CHUYEN',
}
const stageStatusMapV2: Record<string, string> = {
    TRA_LAI: 'Trả lại',
    DA_XU_LY: 'Đã xử lý',
    CHUA_XU_LY: 'Chưa xử lý',
    DANG_XU_LY: 'Đang xử lý',
    TU_CHOI: 'Từ chối văn bản',
    TU_CHOI_VAN_BAN: 'Từ chối văn bản',
    HOAN_THANH: 'Hoàn thành xử lý',
    CHUA_HOAN_THANH: 'Chưa hoàn thành xử lý',
    HOAN_THANH_VAN_BAN: 'Hoàn thành văn bản',
    DA_XEM: 'Đã xem',
    THU_HOI: 'Đã thu hồi',
    DE_NGHI_BH: 'Chờ ban hành',
    DONG_Y_VBDT: 'Hoàn thành VBDT',
    CHO_SO: 'Cho số',
    DA_CHO_SO: 'Cho số',
    DA_BAN_HANH: 'Ban hành',
    BAN_HANH_DU_THAO: 'Ban hành dự thảo',
    DANG_CHO_KY: 'Đang chờ ký',
    DA_PHAN_CONG: 'Đã xử lý',
    DA_KY_NOI_DUNG: 'Đã xử lý',
    DA_KY_THE_THUC: 'Đã xử lý',
    DA_KY_BAN_HANH: 'Đã xử lý',
    DA_KY_NHAY: 'Đã xử lý',
    DA_KY_CHINH_THUC_1: 'Đã xử lý',
    DA_KY_CHINH_THUC_2: 'Đã xử lý',
    DA_KY_CHINH_THUC_3: 'Đã xử lý',
    DA_KY_PHE_DUYET: 'Đã ký phê duyệt',
    DA_DONG_DAU: 'Đã đóng dấu',
    CHO_KY_BAN_HANH: 'Chờ ký ban hành',
    CHO_KY_PHE_DUYET: 'Chờ ký phê duyệt',
    CHO_KY_NHAY: 'Chờ ký nháy',
    CHO_KY_CHINH_THUC: 'Chờ ký chính thức',
    CHO_XAC_NHAN: 'Chờ xác nhận',
    CHO_THAM_DINH: 'Chờ thẩm định',
    CHO_TOI_LUOT: 'Chờ tới lượt',
    CHO_KY_DONG_DAU: 'Chờ đóng dấu',
};
const typeAction = {
    createFileCopy: 'createFileCopy',
    signContentDraft: 'signContentDraft',
}
const stageStatus = {
    1: 'TRINH_KY',
    4: 'HT_VBTT',
    9: 'HT_VBTT',

}
const SignRoles = {
    DRAFT: 'reportSigner',
    DRAFT_2: 'officerSigner1',
    DRAFT_3: 'officerSigner2',
    DRAFT_4: 'officerSigner3',
    PROPOSAL: 'proposal',
}
// src/bpmn/bpmn.constants.ts
export const BPMN_ENGINE_SERVICE = 'BPMN_ENGINE_SERVICE';
const GROUP_CODES = {
    TRUONG_PHONG: 'truongphong',
    PHO_TRUONG_PHONG: 'photruongphong',
    VAN_THU: 'vanthutct',
    VAN_THU_PHONG: 'vtphong',
    TONG_GIAM_DOC: 'tonggd',
    PHO_GIAM_DOC: 'phogdtongcty',
    CANBO: 'canboct',
    THU_KY: 'thuky',
    TRUONG_BAN: 'truongban',
};
const DOCTYPE = {
    TaskManyLevelUnit: 'TaskManyLevelUnit',
};


const stageStatusArchire = {
    CHUA_XU_LY: 'CHUA_XU_LY',
    DA_XU_LY: 'DA_XU_LY',
    LANH_DAO_DONG_Y: 'LANH_DAO_DONG_Y',
    CHI_HUY_PHONG_DONG_Y: 'CHI_HUY_PHONG_DONG_Y',
    LANH_DAO_TU_CHOI: 'LANH_DAO_TU_CHOI',
    CHI_HUY_PHONG_TU_CHOI: 'CHI_HUY_PHONG_TU_CHOI',
    HOAN_THANH: 'HOAN_THANH',
    DANG_XU_LY: 'DANG_XU_LY',
    VT_HOAN_THANH_HSKT: 'VT_HOAN_THANH_HSKT'
}


const stageStatusVehicle = {
    CHUA_XU_LY: 'CHUA_XU_LY',
    DA_XU_LY: 'DA_XU_LY',
    PHONG_DOI_HAU_CAN_NGUOI_DIEU_PHOI: 'PHONG_DOI_HAU_CAN_NGUOI_DIEU_PHOI',
    PHO_PHONG_DOI_HAU_CAN_NGUOI_DIEU_PHOI: 'PHO_PHONG_DOI_HAU_CAN_NGUOI_DIEU_PHOI',
    TAI_XE_TIEP_NHAN: 'TAI_XE_TIEP_NHAN',
    HOAN_THANH: 'HOAN_THANH',
    TU_CHOI: 'TU_CHOI',
    DA_HUY: 'DA_HUY',
}
const USER_PERMISSION_ASSIGNMENT = {
    JSON: 1, // JSON
    RBAC: 2, //RBAC
    JSON_RBAC: 3, //Cả 1 và 2
    USING: 2, // Đang sử dụng
}

const CACHE_DASHBOARD = true;

export { actionToStatus, documentKeyMap, stageStatusDoc, stageStatus, SignRoles, stageStatusMapV2, GROUP_CODES, DOCTYPE, typeAction, stageStatusArchire, stageStatusVehicle, USER_PERMISSION_ASSIGNMENT, CACHE_DASHBOARD };
