import { API_REPORT_PASSPORT } from "@EnvironmentFile/constants/urlConfig";

export const REPORT_OPTIONS = [
    { 
        label: "Danh sách hộ chiếu đang quản lý", 
        value: "PASSPORT_MANAGED_LIST", 
        api: `${API_REPORT_PASSPORT}/managed`, 
        processFn: 'ds_ho_chieu_quan_ly' 
    },
    { 
        label: "Lịch sử mượn trả hộ chiếu", 
        value: "PASSPORT_BORROW_RETURN_HISTORY", 
        api: `${API_REPORT_PASSPORT}/history`, 
        processFn: 'ls_muon_tra_ho_chieu' 
    },
    { 
        label: "Thống kê hộ chiếu theo phòng ban", 
        value: "PASSPORT_STAT_BY_DEPARTMENT", 
        api: `${API_REPORT_PASSPORT}/dept-stats`, 
        processFn: 'tk_ho_chieu_phong_ban' 
    },
    { 
        label: "Thống kê chuyến công tác nước ngoài", 
        value: "PASSPORT_TRIP_STAT_BY_DEPARTMENT", 
        api: `${API_REPORT_PASSPORT}/business-trips`, 
        processFn: 'tk_cong_tac_nuoc_ngoai' 
    }
];
