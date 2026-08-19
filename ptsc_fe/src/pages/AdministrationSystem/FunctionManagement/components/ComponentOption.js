import { lazy } from "react";
import GanttExample from "@components/CustomGantt/GanttExample";
import CustomTableBorderCalendarTree from "@components/CustomTableBorder/CustomTableBorderCalendarTree";
// import KanbanDemo from "@pages/DemoKanban";
import Driver from "@components/Driver";
import Configuration from "@pages/Configuration";
import KanbanPage from "@pages/DemoKanban";
import NewsStatistics from "@pages/NewsStatistics";
import RecordCategory from "@pages/LookUpRecords";
import MeetingScheduleStatistics from "@pages/MeetingScheduleStatistics";
import ReportIncomingDoc from "@pages/ReportIncomingDoc";
import LeadershipSchedule from "@pages/LeadershipSchedule";
import LeadershipScheduleList from "@pages/LeadershipScheduleList";
import ReportOutGoingDoc from "@pages/ReportOutGoingDoc";
import DocumentArchiveSearch from "@pages/DocumentArchiveSearch";
import EmployeeInformation from "@pages/EmployeeInformation/EmployeeInformation";
import LeadershipScheduleV2 from "@pages/LeadershipScheduleV2";
const StatisticsAndReports = lazy(() => import("@pages/StatisticsAndReports"));
import ReportNews from "@pages/ReportPages/ReportNews";
import ReportReflects from "@pages/ReportPages/ReportReflects";
import ReportPassportRequest from "@pages/ReportPages/ReportPassportRequest";
import RecordManagementStatistics from "@pages/RecordManagementStatistics";
import VehicleRegistrationReport from "@pages/VehicleRegistration/VehicleRegistrationReport";
import ListPersonalTaskDelegation from "@pages/PersonalTaskDelegation";
import CategoryManagement from "@pages/ProfileListManagement";
import DocumentStatisticsSearchOutGoing from "@components/DocumentStatisticsSearchOutGoing";
import DocumentStatisticsSearchIncoming from "@components/DocumentStatisticsSearchIncoming";
const DepartmentDelegation = lazy(() => import("@pages/DepartmentDelegation"));
const DashboardPageUser = lazy(() => import("@pages/DashboardPage/indexNormal"));
const DashboardPageLead = lazy(() => import("@pages/DashboardPage/indexMedium"));
const DashboardPageBoss = lazy(() => import("@pages/DashboardPage/indexPremium"));
const CmsModule = lazy(() => import("./CmsModule/App"));


export const COMPONENT_OPTIONS = {
  SHARED_DOCUMENT_LIBRARY: {
    component: Driver,
    title: "Thư viện tài liệu dùng chung",
    dialogKey: "add",
    defaultProps: {},
  },
   CATEGORY_MANAGEMENT: {
    component: CategoryManagement,
    title: "Quản lý danh mục",
    dialogKey: "add",
    defaultProps: {},
  },

  ARCHIVES_LIBRARY: {
    component: RecordCategory,
    title: "Thư viện hồ sơ lưu trữ",
    dialogKey: "add",
    defaultProps: {},
  },
  GANTT_VIEW: {
    component: GanttExample,
    title: "Gantt",
    dialogKey: "ganttView",
    defaultProps: {},
  },
  KANBAN_VIEW: {
    component: KanbanPage,
    // component: KanbanDemo,
    title: "Kanban",
    dialogKey: "kanbanView",
    defaultProps: {},
  },
  CALENDAR_VIEW: {
    component: CustomTableBorderCalendarTree,
    title: "Calendar",
    dialogKey: "calendarView",
    defaultProps: {},
  },
  ADD_CONFIGURATION: {
    component: Configuration,
    title: "Cấu hình",
    dialogKey: "addConfiguration",
    defaultProps: {},
    hidePageTitle: true,
  },
  NEWS_STATISTICS: {
    component: NewsStatistics,
    title: "Thống kê danh sách",
    dialogKey: "newsStatistics",
    defaultProps: {},
    hidePageTitle: true,
  },
  MEETING_SCHEDULE_STATISTICS: {
    component: MeetingScheduleStatistics,
    title: "Thống kê lịch họp",
    dialogKey: "meetingScheduleStatistics",
    defaultProps: {},
    hidePageTitle: true,
  },
  INCOMING_DOC_REPORT: {
    component: ReportIncomingDoc,
    title: "Báo cáo văn bản đến",
    dialogKey: "incomingDocReport",
    defaultProps: {},
    hidePageTitle: true,
  },
  _OUTGOING_DOC_REPORT: {
    component: ReportOutGoingDoc,
    title: "Báo cáo văn bản đi",
    dialogKey: "outgoingDocReport",
    defaultProps: {},
    hidePageTitle: true,
  },
  LEADERSHIP_SCHEDULE: {
    component: LeadershipSchedule,
    title: "Lịch trực chỉ huy",
    dialogKey: "leadershipSchedule",
    defaultProps: {},
    hidePageTitle: true,
  },
  LEADERSHIP_SCHEDULE_LIST: {
    component: LeadershipScheduleList,
    title: "Lịch trực chỉ huy (danh sách)",
    dialogKey: "leadershipScheduleList",
    defaultProps: {},
    hidePageTitle: true,
  },
  DOCUMENT_ARCHIVE_SEARCH: {
    component: DocumentArchiveSearch,
    title: "Tra cứu hồ sơ, tài liệu lưu trữ",
    dialogKey: "documentArchiveSearch",
    defaultProps: {},
    hidePageTitle: true,
  },
  ASYNC_HRM: {
    component: EmployeeInformation,
    title: "Danh sách nhân viên",
    dialogKey: "employeeInformation",
    defaultProps: {
      setReloadData: () => { },
    },
    hidePageTitle: true,
  },
  LEADERSHIP_SCHEDULE_V2: {
    component: LeadershipScheduleV2,
    title: "Lịch trực ban lãnh đạo",
    dialogKey: "leadershipScheduleV2",
    defaultProps: {},
    hidePageTitle: true,
  },
  STATISTICS_AND_REPORTS: {
    component: StatisticsAndReports,
    title: "Báo cáo QL công việc",
    dialogKey: "statisticsAndReports",
    defaultProps: {},
    hidePageTitle: true,
  },
  DASHBOARD_PAGE_USER: {
    component: DashboardPageUser,
    title: "DashboardUser",
    dialogKey: "DashboardPageUser",
    defaultProps: {},
    hidePageTitle: true,
  },
  DASHBOARD_PAGE_LEAD: {
    component: DashboardPageLead,
    title: "DashboardPageLead",
    dialogKey: "DashboardPageLead",
    defaultProps: {},
    hidePageTitle: true,
  },
  DASHBOARD_PAGE_BOSS: {
    component: DashboardPageBoss,
    title: "DashboardPageBoss",
    dialogKey: "DashboardPageBoss",
    defaultProps: {},
    hidePageTitle: true,
  },
  REPORT_NEWS: {
    component: ReportNews,
    title: "Báo cáo tin tức",
    dialogKey: "reportNews",
    defaultProps: {},
    hidePageTitle: true,
  },
  RECOMMENDATIONS_PAGE: {
    component: ReportReflects,
    title: "Báo cáo phản ánh kiến nghị",
    dialogKey: "recommendationsPage",
    defaultProps: {},
    hidePageTitle: true,
  },
  REPORT_PASSPORT_REQUEST: {
    component: ReportPassportRequest,
    title: "Báo cáo đề nghị cấp hộ chiếu",
    dialogKey: "reportPassportRequest",
    defaultProps: {},
    hidePageTitle: true,
  },
  RECORD_MANAGEMENT_STATISTICS: {
    component: RecordManagementStatistics,
    title: "Báo cáo thống kê hồ sơ lưu trữ",
    dialogKey: "recordManagementStatistics",
    defaultProps: {},
    hidePageTitle: true,
  },
  VEHICLE_REGISTRATION_REPORT: {
    component: VehicleRegistrationReport,
    title: "Báo cáo đăng ký xe",
    dialogKey: "vehicleRegistrationReport",
    defaultProps: {},
    hidePageTitle: true,
  },
  EMPLOYEE_INFORMATION: {
    component: EmployeeInformation,
    title: "Danh sách nhân viên",
    dialogKey: "employeeInformation",
    defaultProps: {
      setReloadData: () => { },
    },
    // hidePageTitle: true,
  },
  LIST_PERSONAL_TASK_DELEGATION: {
    component: ListPersonalTaskDelegation,
    title: "Danh sách ủy quyền công việc",
    dialogKey: "listPersonalTaskDelegation",
    defaultProps: {
      setReloadData: () => { },
    },
   },
   DEPARTMENT_DELEGATION: {
    component: DepartmentDelegation,
    title: "Quản lý ủy quyền nhận đầu công việc",
    dialogKey: "departmentDelegation",
    defaultProps: {
      setReloadData: () => { },
    },
   },
   CMS_SYSTEM: {
    component: CmsModule,
    title: "Hệ thống CMS",
    dialogKey: "cmsSystem",
    defaultProps: {},
    hidePageTitle: true,
	},
	OUTGOING_SEARCH: {
    component: DocumentStatisticsSearchOutGoing,
    title: "Tra cứu thống kê vb đi",
    dialogKey: "outgoingSearch",
    defaultProps: {
      setReloadData: () => {},
    },
   },
	INCOMING_SEARCH: {
    component: DocumentStatisticsSearchIncoming,
    title: "Tra cứu thống kê vb đến",
    dialogKey: "incomingSearch",
    defaultProps: {
      setReloadData: () => {},
    },
   },
};
