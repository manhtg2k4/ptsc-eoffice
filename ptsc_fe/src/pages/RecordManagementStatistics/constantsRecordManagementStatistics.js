import { 
  API_REPORT_ARCHIVE_RECORDS_BY_DEPARTMENT,
  API_REPORT_BORROW_RETURN_RECORD,
  API_LIST_ARCHIVE_RECORDS_EXPIRING,
  API_REPORT_ARCHIVE_RECORDS_BY_ACCESS_COUNT,
  API_REPORT_ARCHIVE_RECORDS_BY_RETENTION_PERIOD
} from "@EnvironmentFile/constants/urlConfig";

// Danh sách loại báo cáo
export const REPORT_TYPES = [
  {
    label: "Báo cáo danh mục hồ sơ lưu trữ theo phòng ban/ đơn vị",
    value: "RecordByDepartment",
    api: API_REPORT_ARCHIVE_RECORDS_BY_DEPARTMENT
  },
  {
    label: "Thống kê lượng truy cập hồ sơ",
    value: "RecordAccessStats",
    api: API_REPORT_ARCHIVE_RECORDS_BY_ACCESS_COUNT
  },
  {
    label: "Danh sách hồ sơ sắp hết hạn bảo quản",
    value: "RecordExpiringSoon",
    api: API_LIST_ARCHIVE_RECORDS_EXPIRING
  },
  {
    label: "Thống kê số lượng theo hạn bảo quản",
    value: "RecordByRetentionPeriod",
    api: API_REPORT_ARCHIVE_RECORDS_BY_RETENTION_PERIOD
  },
  {
    label: "Nhật ký khai thác hồ sơ",
    value: "RecordExploitationLog",
    api: API_REPORT_BORROW_RETURN_RECORD
  },
];

