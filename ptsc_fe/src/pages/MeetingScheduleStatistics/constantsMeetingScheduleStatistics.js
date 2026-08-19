import { 
  API_MEETING_STATISTICS_BY_TIME,
  API_MEETING_ROOM_USAGE_FREQUENCY,
  API_MEETING_STATISTICS_BY_DEPARTMENT,
  API_MEETING_ATTENDANCE_STATISTICS,
  API_MEETING_FOLLOWUP_TASK_STATISTICS
} from "@EnvironmentFile/constants/urlConfig";

export const REPORT_TYPES = [
  {
    label: "Thống kê cuộc họp theo thời gian",
    value: "thongkecuochoptheotg",
    api: API_MEETING_STATISTICS_BY_TIME
  },
  {
    label: "Thông kê tần suất sử dụng phòng họp",
    value: "tktansuatsudungphong",
    api: API_MEETING_ROOM_USAGE_FREQUENCY
  },
  {
    label: "Thống kê danh sách cuộc họp theo phòng ban",
    value: "tkcuochoptheopongban",
    api: API_MEETING_STATISTICS_BY_DEPARTMENT
  },
  {
    label: "Thống kê tham dự cuộc họp",
    value: "thongkethamducuochop",
    api: API_MEETING_ATTENDANCE_STATISTICS
  },
  {
    label: "Thống kê theo dõi công việc tạo từ kết luận cuộc họp",
    value: "thongkeketluancuochop",
    api: API_MEETING_FOLLOWUP_TASK_STATISTICS
  },
];
