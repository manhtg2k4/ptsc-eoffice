import { API_REPORT_REFLECT } from "@EnvironmentFile/constants/urlConfig";

export const REPORT_OPTIONS = [
    { 
        label: "Danh sách phản ánh kiến nghị theo thời gian", 
        value: "columnSuggestionsOverTime", 
        api: `${API_REPORT_REFLECT}/list-by-time`, 
        processFn: 'tk_phan_anh_thoi_gian' 
    },
    { 
        label: "Thống kê phản ánh theo loại", 
        value: "columnReflectByType", 
        api: `${API_REPORT_REFLECT}/statistics-by-type`, 
        processFn: 'tk_phan_anh_loai' 
    },
    { 
        label: "Danh sách phản ánh quá hạn xử lý", 
        value: "columnOverdueFeedback", 
        api: `${API_REPORT_REFLECT}/overdue-list`, 
        processFn: 'tk_phan_anh_qua_han' 
    },
    { 
        label: "Thống kê phản ánh theo đơn vị xử lý", 
        value: "columnFeedbackUnit", 
        api: `${API_REPORT_REFLECT}/statistics-by-unit`, 
        processFn: 'tk_phan_anh_don_vi' 
    },
    { 
        label: "Đánh giá mức độ hài lòng", 
        value: "columnAssessingSatisfaction", 
        api: `${API_REPORT_REFLECT}/satisfaction-evaluation`, 
        processFn: 'tk_phan_anh_hai_long' 
    }
];
