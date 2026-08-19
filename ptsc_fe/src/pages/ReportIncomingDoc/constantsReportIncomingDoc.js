import { APP_DHVB_BASE } from "@EnvironmentFile/constants/urlConfig";
 



export const listTableSelectOptions = [
  {
    label: "Thống kê văn bản đến theo thời gian",
    value: "incomingDocumentStatsByTime", api: `${APP_DHVB_BASE}/incoming/list/statistics-by-time`, processFn: 'tkcvtheotrangthai'
  },
  {
    label: "Thống kê tiến độ xử lý văn bản đến", 
    value: "incomingDocumentProcessingStats", api: `${APP_DHVB_BASE}/incoming/list/statistic-report`, processFn: 'tkhieusuatcanhan'
  },
  {
    label: "Danh sách văn bản đến quá hạn",
    value: "overdueIncomingDocuments", api: `${APP_DHVB_BASE}/incoming/list/overdue`, processFn: 'tkcvquahan'
  },
  {
    label: "Thống kê văn bản theo đơn vị gửi",
    value: "documentsBySendingUnitStats", api: `${APP_DHVB_BASE}/incoming/list/statistic-report-sender-unit`, processFn: 'tkcvlaplai'
  },
  {
    label: "Chỉ đạo của ban lãnh đạo theo văn bản đến", 
    value: "incomingDocumentDirective", api: `${APP_DHVB_BASE}/incoming/list/directive`, processFn: 'tkcvtheonguon'
  },
  

];

