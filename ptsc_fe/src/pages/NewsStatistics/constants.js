import { API_REPORT_NEWS } from "@EnvironmentFile/constants/urlConfig";


export const REPORT_OPTIONS = [
    { label: "Thống kê tin tức theo thời gian", value: "columnStatisticsOverTime", api: `${API_REPORT_NEWS}/time`, processFn: 'tk_tin_tuc_thoi_gian' },
    { label: "Thống kê tin tức theo chủ đề", value: "columnStatisticsByTopic", api: `${API_REPORT_NEWS}/topic`, processFn: 'tk_tin_tuc_chu_de' },
    { label: "Top tin tức được xem nhiều nhất", value: "columnMostViewedNews", api: `${API_REPORT_NEWS}/top-viewed`, processFn: 'tk_tin_tuc_top_view' },
    { label: "Theo dõi quy trình duyệt tin", value: "columnBrowsingProcess", api: `${API_REPORT_NEWS}/workflow`, processFn: 'tk_tin_tuc_quy_trinh' },
    { label: "Thống kê hoạt động đăng tin theo phòng ban", value: "columnStatisticsByDepartment", api: `${API_REPORT_NEWS}/department`, processFn: 'tk_tin_tuc_phong_ban' }
];
