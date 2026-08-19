import ViewApproveDetail from "@pages/ApprovePage/components/ViewApproveDetail";
import AddSendingUnit from "@pages/DocSendingUnitMgmt/AddSendingUnit";
import EditSendingUnit from "@pages/DocSendingUnitMgmt/EditSendingUnit";
import ViewSendingUnit from "@pages/DocSendingUnitMgmt/ViewSendingUnit";
import ImportPage from "@pages/ImportPage";
import { lazy } from "react";
import TaskDetailPanelProject from "@components/TaskDetailPanel/TaskDetailPanelProject";
import TaskDetailPanel from "@components/TaskDetailPanel/TaskDetailPanel";
import RecordDestructionEdit from "@pages/RecordDestruction/RecordDestructionEdit";
import ImportExcel from "@components/ImportExcel";

const RequestSent = lazy(() => import("@pages/ApprovalWork/components/RequestSent"));
const AddEquipmentDialog = lazy(() => import("@pages/EquipmentManagement/components/AddEquipmentDialog"));
const DeleteEquipmentConfirmation = lazy(() => import("@pages/EquipmentManagement/components/DeleteEquipmentConfirmation"));
const EditEquipmentDialog = lazy(() => import("@pages/EquipmentManagement/components/EditEquipmentDialog"));
const ViewEquipmentDialog = lazy(() => import("@pages/EquipmentManagement/components/ViewEquipmentDialog"));
const HistoryApprove = lazy(() => import("@pages/HistoryApprove"));
const CreateLeaderDutySchedule = lazy(() => import("@pages/LeadershipDutyScheduleCalendar/pages/CreateLeaderDutySchedule"));
const DeleteLeaderDutySchedule = lazy(() => import("@pages/LeadershipDutyScheduleCalendar/pages/DeleteLeaderDutySchedule"));
const UpdateLeaderDutySchedule = lazy(() => import("@pages/LeadershipDutyScheduleCalendar/pages/UpdateLeaderDutySchedule"));
const ViewLeaderDutySchedule = lazy(() => import("@pages/LeadershipDutyScheduleCalendar/pages/ViewLeaderDutySchedule"));
const AddMediaImage = lazy(() => import("@pages/MediaPage/MediaImage/AddMediaImage"));
const UpdateMediaImage = lazy(() => import("@pages/MediaPage/MediaImage/UpdateMediaImage"));
const ViewMediaImage = lazy(() => import("@pages/MediaPage/MediaImage/ViewMediaImage"));
const AddMediaVideo = lazy(() => import("@pages/MediaPage/MediaVideo/AddMediaVideo"));
const UpdateMediaVideo = lazy(() => import("@pages/MediaPage/MediaVideo/UpdateMediaVideo"));
const ViewMediaVideo = lazy(() => import("@pages/MediaPage/MediaVideo/ViewMediaVideo"));
const DeletePopupMeetingRoom = lazy(() => import("@pages/MeetingRoom/DeletePopupMeetingRoom"));
const ApproveNewsDialog = lazy(() => import("@pages/NewsPage/components/ApproveNewsDialog"));
const CancelNewsDialog = lazy(() => import("@pages/NewsPage/components/CancelNewsDialog"));
const RecallNewsDialog = lazy(() => import("@pages/NewsPage/components/RecallNewsDialog"));
const ReturnNewsDialog = lazy(() => import("@pages/NewsPage/components/ReturnNewsDialog"));
const SubmitNewsDialog = lazy(() => import("@pages/NewsPage/components/SubmitNewsDialog"));
const ViewNewReacts = lazy(() => import("@pages/NewsPage/components/ViewNewReacts"));
const ViewNewsCancelled = lazy(() => import("@pages/NewsPage/components/ViewNewsCancelled"));
const ViewNewsCD = lazy(() => import("@pages/NewsPage/components/ViewNewsCD"));
const ViewNewsDXB = lazy(() => import("@pages/NewsPage/components/ViewNewsDXB"));
const ViewNewsXB = lazy(() => import("@pages/NewsPage/components/ViewNewsXB"));
const AddProject = lazy(() => import("@pages/ProjectManager/components/AddProject"));
const ViewsProject = lazy(() => import("@pages/ProjectManager/components/ViewsProject"));
const TemplateSample = lazy(() => import("@pages/TemplateSample"));
const ApplyProcessDialog = lazy(() => import("@pages/Topic/components/ApplyProcessDialog"));
const RemoveProcessDialog = lazy(() => import("@pages/Topic/components/RemoveProcessDialog"));
const CreateTravelWorkSchedules = lazy(() => import("@pages/TravelWorkSchedules/pages/CreateTravelWorkSchedules"));
const UpdateTravelWorkSchedules = lazy(() => import("@pages/TravelWorkSchedules/pages/UpdateTravelWorkSchedules"));
const ViewTravelWorkSchedules = lazy(() => import("@pages/TravelWorkSchedules/pages/ViewTravelWorkSchedules"));
const AddRepetitiveWork = lazy(() => import("@pages/WorkManagement/components/RepetitiveWork/AddRepetitiveWork"));
const ViewRepetitiveWork = lazy(() => import("@pages/WorkManagement/components/RepetitiveWork/ViewRepetitiveWork"));
const UpdateJobDialog = lazy(() => import("@pages/WorkManagement/components/UpdateJobDialog"));
const UpdateJobToMeeting = lazy(() => import("@pages/WorkManagement/components/UpdateJobToMeeting"));
const AddYearCategory = lazy(() => import("@pages/CategoryManagement/components/AddYearCategory"));
const FolderDetail = lazy(() => import("@pages/CategoryManagement/components/FolderDetail"));
const UpdateJobToDocumentDialog = lazy(() => import("@pages/WorkManagement/components/UpdateJobToDocumentDialog"));
const UpdateTemplateSample = lazy(() => import("@pages/TemplateSample/UpdateTemplateSample"));
const AddRecommendations = lazy(() => import("@pages/RecommendationsPage/components/AddRecommendations"));
const EditRecommendations = lazy(() => import("@pages/RecommendationsPage/components/EditRecommendations"));
const ViewsRecommendations = lazy(() => import("@pages/RecommendationsPage/components/ViewsRecommendations"));
const AddPassportList = lazy(() => import("@pages/PassportManagement/PassportListPage/AddPassportList"));
const EditPassportList = lazy(() => import("@pages/PassportManagement/PassportListPage/EditPassportList"));
const ViewPassportList = lazy(() => import("@pages/PassportManagement/PassportListPage/ViewPassportList"));
const AddPassportReturnSlip = lazy(() => import("@pages/PassportManagement/MyPassport/AddPassportReturnSlip"));
const EditPassportReturnSlip = lazy(() => import("@pages/PassportManagement/MyPassport/EditPassportReturnSlip"));
const ViewPassportReturnSlip = lazy(() => import("@pages/PassportManagement/MyPassport/ViewPassportReturnSlip"));
const ViewsRecommendationsBPCT = lazy(() => import("@pages/RecommendationsPage/components/ViewsRecommendationsBPCT"));
const AddJobChild = lazy(() => import("@pages/WorkManagement/components/AddJobChild"));
const AddDocumentBook = lazy(() => import("@pages/IncomingDocumentManagement/components/AddDocumentBook"));
const BookDocumentDetails = lazy(() => import("@pages/BookDocument/BookDocumentDetails"));
const AddIncommingDoc = lazy(() => import("@pages/IncomingDocumentManagement/components/AddIncommingDoc"));
const EditDocumentBook = lazy(() => import("@pages/IncomingDocumentManagement/components/EditDocumentBook"));
const UpdateIncommingDoc = lazy(() => import("@pages/IncomingDocumentManagement/components/UpdateIncommingDoc"));
const ViewIncommingDoc = lazy(() => import("@pages/IncomingDocumentManagement/components/ViewIncommingDoc"));
const AddDialog = lazy(() => import("@pages/TextAway/Tab/SigningSubmissionTab/AddDialog"));
const EditDialog = lazy(() => import("@pages/TextAway/Tab/SigningSubmissionTab/EditDialog"));
const EditDocumentBookOut = lazy(() => import("@pages/IncomingDocumentManagement/components/EditDocumentBookOut"));
const ViewDialog = lazy(() => import("@pages/TextAway/Tab/SigningSubmissionTab/ViewDialog"));
const AuthorizationManagements = lazy(() => import("@pages/AuthorizationManagement/components/AuthorizationManagements"));
const EditAuthorization = lazy(() => import("@pages/AuthorizationManagement/components/EditAuthorization"));
const ViewAuthorization = lazy(() => import("@pages/AuthorizationManagement/components/ViewAuthorization"));
const RecallIncomingTextDialog = lazy(() => import("@pages/IncomingDocumentManagement/components/RecallIncomingTextDialog"));
const AddArchiveStorage = lazy(() => import("@pages/ArchivePage/components/AddArchiveStorage"));
const ViewArchiveStorage = lazy(() => import("@pages/ArchivePage/components/ViewArchiveStorage"));
const CreateRecordExploitation = lazy(() => import("@pages/RecordExploitation/CreateRecordExploitation"));
const EditRecordExploitation = lazy(() => import("@pages/RecordExploitation/EditRecordExploitation"));
const ViewRecordExploitation = lazy(() => import("@pages/RecordExploitation/ViewRecordExploitation"));
const SubmitApprovalModal = lazy(() => import("@pages/RecordExploitation/components/SubmitApprovalModal"));
const AddNewJob = lazy(() => import("@pages/WorkManagement/components/AddNewJob"));
const ViewJob = lazy(() => import("@pages/WorkManagement/components/ViewJob"));
const AddRecordDestruction = lazy(() => import("@pages/RecordDestruction/AddRecordDestruction"));
const AddRecordManagement = lazy(() => import("@pages/RecordManagement/AddRecordManagement"));
const EditRecordManagement = lazy(() => import("@pages/RecordManagement/EditRecordManagement"));
const RecordDestruction = lazy(() => import("@pages/RecordDestruction/RecordDestruction"));
const EditArchiveStorage = lazy(() => import("@pages/ArchivePage/components/EditArchiveStorage"));
const ViewRecordManagement = lazy(() => import("@pages/RecordManagement/ViewRecordManagement"));
const OpenRecordManagement = lazy(() => import("@pages/RecordManagement/OpenRecordManagement"));
const ApprovalDetails = lazy(() => import("@pages/ApprovalWork/components/ApprovalDetails"));
const ApprovalRequestHistory = lazy(() => import("@pages/ApprovalWork/components/ApprovalRequestHistory"));
const AddNews = lazy(() => import("@pages/NewsPage/components/AddNews"));
const EditNews = lazy(() => import("@pages/NewsPage/components/EditNews"));
const ViewNews = lazy(() => import("@pages/NewsPage/components/ViewNews"));
const CreateMeetingSchedule = lazy(() => import("@pages/MeetingCalendar/components/CreateMeetingSchedule"));
const AddTopic = lazy(() => import("@pages/Topic/AddTopic"));
const EditTopic = lazy(() => import("@pages/Topic/EditTopic"));
const ViewTopic = lazy(() => import("@pages/Topic/ViewTopic"));
const AddMeetingRoom = lazy(() => import("@pages/MeetingRoom/AddMeetingRoom"));
const EditMeetingRoom = lazy(() => import("@pages/MeetingRoom/EditMeetingRoom"));
const RefuseIncomingTextDialog = lazy(() => import("@pages/IncomingDocumentManagement/components/RefuseIncomingTextDialog"));
const ViewMeetingSchedule = lazy(() => import("@pages/MeetingCalendar/components/ViewMeetingSchedule"));
const ViewRecall = lazy(() => import("@pages/RecallPage/components/ViewRecall"));
const ViewApprove = lazy(() => import("@pages/ApprovePage/components/ViewApprove"));
const AddJobToDocument = lazy(() => import("@pages/WorkManagement/components/AddJobToDocument"));
const ViewJobToDocument = lazy(() => import("@pages/WorkManagement/components/ViewJobToDocument"));
const UpdateMeetingSchedule = lazy(() => import("@pages/MeetingCalendar/components/UpdateMeetingSchedule"));
const ViewProcessingSchedule = lazy(() => import("@pages/MeetingCalendar/components/ViewProcessingSchedule"));
const ViewMeetingRoom = lazy(() => import("@pages/MeetingRoom/ViewMeetingRoom"));
const JobProfileSearchDialog = lazy(() => import("@pages/TextAway/Tab/SigningSubmissionTab/JobProfileSearchDialog"));
const ExtendProcessingTimePopup = lazy(() => import("@pages/IncomingDocumentManagement/components/ExtendProcessingTimePopup"));
const AddJobToMeeting = lazy(() => import("@pages/WorkManagement/components/AddJobToMeeting"));
const ViewJobToMeeting = lazy(() => import("@pages/WorkManagement/components/ViewJobToMeeting"));
const RecallMeetingDialog = lazy(() => import("@pages/MeetingCalendar/components/RecallMeetingDialog"));
const CancelMeetingDialog = lazy(() => import("@pages/MeetingCalendar/components/CancelMeetingDialog"));
const SubmitMeetingDialog = lazy(() => import("@pages/MeetingCalendar/components/SubmitMeetingDialog"));
const AddNewRequest = lazy(() => import("@pages/VehicleRegistration/components/AddNewRequest"));
const UpdateNewRequest = lazy(() => import("@pages/VehicleRegistration/components/UpdateNewRequest"));
const ViewRequest = lazy(() => import("@pages/VehicleRegistration/components/ViewRequest"));
const AddNewCar = lazy(() => import("@pages/VehicleRegistration/components/AddNewCar"));
const UpdateCar = lazy(() => import("@pages/VehicleRegistration/components/UpdateCar"));
const ViewCar = lazy(() => import("@pages/VehicleRegistration/components/ViewCar"));
const CoordinateRequests = lazy(() => import("@pages/VehicleRegistration/components/CoordinateRequests"));
const ViewRequestCoordination = lazy(() => import("@pages/VehicleRegistration/components/CoordinateRequests"));
const RejectDiaLog = lazy(() => import("@pages/VehicleRegistration/components/RejectDiaLog"));
const ConfirmRemindTheDriverDialog = lazy(() => import("@pages/VehicleRegistration/components/ConfirmRemindTheDriverDialog"));
const PauseRepetivePopup = lazy(() => import("@pages/WorkManagement/components/RepetitiveWork/PauseRepetivePopup"));
const ContinueRepetiviWork = lazy(() => import("@pages/WorkManagement/components/RepetitiveWork/ContinueRepetiviWork"));
const FinalRepetinviWork = lazy(() => import("@pages/WorkManagement/components/RepetitiveWork/FinalRepetinviWork"));
const AddDrivers = lazy(() => import("@pages/VehicleRegistration/components/AddDrivers"));
const UpdateDrivers = lazy(() => import("@pages/VehicleRegistration/components/UpdateDrivers"));
const ViewDrivers = lazy(() => import("@pages/VehicleRegistration/components/ViewDrivers"));
const EditRequest = lazy(() => import("@pages/PassportManagement/RequestListPage/EditRequest"));
const ViewPassportRequest = lazy(() => import("@pages/PassportManagement/RequestListPage/ViewPassportRequest"));
const AddRequest = lazy(() => import("@pages/PassportManagement/RequestListPage/AddRequest"));
const AddIncomingDelegations = lazy(() => import("@pages/PassportManagement/IncomingDelegations/AddIncomingDelegations"));
const EditIncomingDelegations = lazy(() => import("@pages/PassportManagement/IncomingDelegations/EditIncomingDelegations"));
const ViewIncomingDelegations = lazy(() => import("@pages/PassportManagement/IncomingDelegations/ViewIncomingDelegations"));
const RequestApprovalDialog = lazy(() => import("@pages/PassportManagement/RequestListPage/components/RequestApprovalDialog"));
const OfficialHandoverDocument = lazy(() => import("@pages/PassportManagement/RequestListPage/components/OfficialHandoverDocument"));
const TransferProcess = lazy(() => import("@components/TransferProcess/indexCXLV2"));
const AddAuthPassport = lazy(() => import("@pages/PassportManagement/AuthPassport/AddAuthPassport"));
const EditAuthPassport = lazy(() => import("@pages/PassportManagement/AuthPassport/EditAuthPassport"));
const ViewAuthPassport = lazy(() => import("@pages/PassportManagement/AuthPassport/ViewAuthPassport"));
const AddUserGroup = lazy(() => import("@pages/DocUserGroupMgmt/AddUserGroup"));
const EditUserGroup = lazy(() => import("@pages/DocUserGroupMgmt/EditUserGroup"));
const ViewUserGroup = lazy(() => import("@pages/DocUserGroupMgmt/ViewUserGroup"));
const ViewJobProject = lazy(() => import("@pages/WorkManagement/components/ViewJobProject"));

// const AddMediaImage = lazy(() => import("@pages/MediaPage/MediaImage/AddMediaImage"));
// import DeleteDialog from "@pages/IncomingDocumentManagement/components/DeleteDialog";

const AddDocCategoryMgmt = lazy(() => import("@pages/DocCategoryMgmt/AddDocCategoryMgmt"));
const EditDocCategoryMgmt = lazy(() => import("@pages/DocCategoryMgmt/EditDocCategoryMgmt"));
const ViewDocCategoryMgmt = lazy(() => import("@pages/DocCategoryMgmt/ViewDocCategoryMgmt"));
const AddEditReservationModal = lazy(() => import("@components/DocumentNumberReservation/AddEditReservationModal"));
const ListReservationModal = lazy(() => import("@components/DocumentNumberReservation/ListReservationModal"));
const StatCardDetailDialog = lazy(() => import("@pages/DashboardPage/components/StatCardDetailDialog"));
const NewsDetailView = lazy(() => import("@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/NewsDetailView"));


/**
 * componentRegistry:
 * - key: Tên định danh duy nhất cho component.
 * - component: Component React sẽ được render.
 * - title: Tiêu đề cho dialog/drawer.
 * - dialogKey: Một key để quản lý trạng thái đóng/mở của dialog (ví dụ: 'add', 'edit').
 * - defaultProps: Các props mặc định sẽ được truyền cho component.
 */
export const globalComponentRegistry = {
	TRANSFER_PROCESS: {
		component: TransferProcess,
		title: "Chuyển xử lý",
		dialogKey: "TransferProcess",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	ADD_INCOMING_DOC: {
		component: AddIncommingDoc,
		title: "Thêm mới văn bản đến",
		dialogKey: "add",
		defaultProps: {},
	},
	EDIT_INCOMING_DOC: {
		component: UpdateIncommingDoc,
		title: "Cập nhật văn bản đến",
		dialogKey: "edit",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	VIEW_INCOMING_DOC: {
		component: ViewIncommingDoc,
		title: "Xem chi tiết văn bản đến",
		dialogKey: "view",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	RELATED_WORK_PROFILE: {
		component: JobProfileSearchDialog,
		title: "Hồ sơ công việc liên quan",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
		},
	},
	REJECT_THE_TEXT: {
		component: RefuseIncomingTextDialog,
		title: "Từ chối văn bản",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
		},
	},
	EXTEND_PROCESSING_TIME: {
		component: ExtendProcessingTimePopup,
		title: "Đặt hạn xử lý",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
		},
	},
	RECALL_INCOMING_DOC: {
		component: RecallIncomingTextDialog,
		title: "Xác nhận thu hồi văn bản đến",
		dialogKey: "recallIncomingDoc",
		defaultProps: {},
	},
	REJECT_INCOMING_DOC: {
		component: RefuseIncomingTextDialog,
		title: "Xác nhận từ chối văn bản đến",
		dialogKey: "recallIncomingDoc",
		defaultProps: {},
	},
	// DELETE_INCOMING_DOC: {
	// 	component: DeleteDialog,
	// 	title: "Xác nhận xóa văn bản",
	// 	dialogKey: "delete",
	// 	defaultProps: {
	// 		type: "delete",
	// 	},
	// },
	ADD_OUTCOMING_DOC: {
		component: AddDialog,
		title: "Thêm mới dự thảo văn bản trình ký",
		dialogKey: "addSigningSubmission",
		defaultProps: {
			documentType: "1", // 1 cho trình ký
			dataDetail: {},
			incomingCreate: true,

		},
	},
	ADD_OUTCOMING_DOC_ROOT: {
		component: AddDialog,
		// component: AddPassportList,
		title: "Thêm mới dự thảo văn bản trình ký",
		dialogKey: "addSigningSubmissionRoot",
		defaultProps: {
			documentType: "1", // 1 cho trình ký
			dataDetail: {},
		},
	},
	EDIT_OUTCOMING_DOC: {
		component: EditDialog,
		title: "Chỉnh sửa văn bản dự thảo",
		dialogKey: "editSigningSubmission",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	ADD_INCOMING_DOC_BOOK: {
		component: AddDocumentBook,
		title: "Thêm mới Sổ văn bản đến",
		dialogKey: "addDocumentBook",
		defaultProps: {},
	},
	VIEW_OUTCOMING_DOC: {
		component: ViewDialog,
		title: "Xem chi tiết dự thảo văn bản",
		dialogKey: "viewSigningSubmission",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	VIEW_OUTCOMING_DOC_DI: {
		component: ViewDialog,
		title: "Xem chi tiết dự thảo văn bản VB đi",
		dialogKey: "viewSigningSubmission",
		defaultProps: {
			setReloadData: () => { },
			documentType: "success"
		},
	},
	EDIT_INCOMING_DOC_BOOK: {
		component: EditDocumentBook,
		title: "Chỉnh sửa Sổ văn bản đến",
		dialogKey: "editDocumentBook",
		defaultProps: {},
	},
	BOOK_DOCUMENT_DETAILS: { // Thêm entry mới
		component: BookDocumentDetails,
		title: "Thông tin chi tiết sổ văn bản",
		dialogKey: "bookDocumentDetails",
		defaultProps: {
			documentId: null, // Đảm bảo prop luôn tồn tại
		},
	},
	EDIT_OUTCOMING_DOC_BOOK: {
		component: EditDocumentBookOut,
		title: "Chỉnh sửa Sổ văn bản đi",
		dialogKey: "editDocumentBookOut",
		defaultProps: {},
	},
	ADD_OUTCOMING_DOC_BOOK: {
		component: AddDocumentBook,
		title: "Thêm mới sổ văn bản đi ",
		dialogKey: "addDocumentBookOut",
		defaultProps: {},
	},
	ADD_OUTCOMING_PROMULGATE_VTC: {
		component: AddDialog,
		title: "Thêm mới phát hành",
		dialogKey: "addPromulgate",
		defaultProps: {
			documentType: "9", // 9 cho ban hành
			title: "Thêm mới phát hành",
			isVanThuCuc: true, // Chỉ truyền props này nếu là Luồng văn thư ban hành
			isStamp : 'false',
			isPendingPublishOrStamp : true,
		},

	},
	ADD_OUTCOMING_PROMULGATE_DONG_DAU: {
		component: AddDialog,
		title: "Thêm mới đóng dấu",
		dialogKey: "addPromulgate",
		defaultProps: {
			documentType: "9", // 9 cho ban hành
			title: "Thêm mới đóng dấu",
			isVanThuCuc: true,
			isStamp : 'true', // Chỉ truyền props này nếu là Luồng văn thư ban hành
			isPendingPublishOrStamp : true,
		},

	},
	ADD_OUTCOMING_PROMULGATE_PHONG: {
		component: AddDialog,
		title: "Thêm mới văn bản ban hành văn thư phòng",
		dialogKey: "addPromulgate",
		defaultProps: {
			documentType: "4", // 4 cho ban hành
			title: "Thêm mới văn bản ban hành văn thư phòng",
		},

	},
	EDIT_OUTCOMING_PROMULGATE_DOC: {
		component: EditDialog,
		title: "Chỉnh sửa phát hành",
		dialogKey: "editPromulgate",
		defaultProps: {
			title: "Chỉnh sửa phát hành",
			isVanThuCuc: true, // Chỉ truyền props này nếu là Luồng văn thư ban hành
			isPendingPublishOrStamp : true,
		},
	},
	VIEW_OUTCOMING_PROMULGATE_DOC: {
		component: ViewDialog,
		title: "Xem chi tiết phát hành",
		dialogKey: "viewPromulgate",
		defaultProps: {
			isVanThuCuc: true, // Chỉ truyền props này nếu là Luồng văn thư ban hành
			isPendingPublishOrStamp : true,
		},
	},
	ADD_AUTHORIZATION: {
		component: AuthorizationManagements,
		title: "Thêm mới ủy quyền",
		dialogKey: "addAuthorization",
		defaultProps: {},
	},
	BOOK_DOCUMENT_DETAILS_OUT: { // Thêm entry mới
		component: BookDocumentDetails,
		title: "Thông tin chi tiết sổ văn bản đi",
		dialogKey: "bookDocumentDetailsOut",
		defaultProps: {
			documentId: null,
		}
	},
	EDIT_AUTHORIZATION: {
		component: EditAuthorization,
		title: "Chỉnh sửa ủy quyền",
		dialogKey: "editAuthorization",
		defaultProps: {},
	},
	VIEW_AUTHORIZATION: {
		component: ViewAuthorization,
		title: "Xem chi tiết ủy quyền",
		dialogKey: "viewAuthorization",
		defaultProps: {},
	},
	ADD_JOB: {
		component: AddNewJob,
		title: "Thêm mới công việc chung",
		dialogKey: "addNewJob",
		defaultProps: {},
	},
	VIEW_TASK: {
		component: ViewJob,
		title: "Xem chi tiết công việc chung",
		dialogKey: "viewJobs",
		defaultProps: {
			isViewMode: true,
		},
	},
	ADD_ARCHIVE_STORAGE: {
		component: AddArchiveStorage,
		title: "Tạo mới đợt lưu trữ",
		dialogKey: "addArchiveStorage",
		defaultProps: {},
	},
	ADD_RECORD_EXPLOITATION: {
		component: CreateRecordExploitation,
		title: "Tạo mới yêu cầu khai thác hồ sơ",
		dialogKey: "addRecordExploitation",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	EDIT_RECORD_EXPLOITATION: {
		component: EditRecordExploitation,
		title: "Chỉnh sửa yêu cầu khai thác hồ sơ",
		dialogKey: "editRecordExploitation",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	VIEW_RECORD_EXPLOITATION: {
		component: ViewRecordExploitation,
		title: "Xem chi tiết yêu cầu khai thác hồ sơ",
		dialogKey: "viewRecordExploitation",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	SUBMIT_RECORD_EXPLOITATION: {
		component: SubmitApprovalModal,
		title: "Trình phê duyệt yêu cầu khai thác hồ sơ",
		dialogKey: "SubmitApprovalModal",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
		},
	},
	VIEW_ARCHIVE_STORAGE: {
		component: ViewArchiveStorage,
		title: "Xem chi tiết đợt lưu trữ",
		dialogKey: "viewArchiveStorage",
		defaultProps: {},
	},
	EDIT_ARCHIVE_STORAGE: {
		component: EditArchiveStorage,
		title: "Chỉnh sửa đợt lưu trữ",
		dialogKey: "editArchiveStorage",
		defaultProps: {},
	},
	ADD_RECORD_DESTRUCTION: {
		component: AddRecordDestruction,
		title: "Tạo mới đợt tiêu huỷ hồ sơ",
		dialogKey: "addRecordDestruction",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	ADD_RECORD_MANAGEMENT: {
		component: AddRecordManagement,
		title: "Thêm mới hồ sơ",
		dialogKey: "addRecordManagement",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	EDIT_RECORD_MANAGEMENT: {
		component: EditRecordManagement,
		title: "Chỉnh sửa hồ sơ",
		dialogKey: "editRecordManagement",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	VIEW_RECORD_MANAGEMENT: {
		component: ViewRecordManagement,
		title: "Chi tiết hồ sơ",
		dialogKey: "viewRecordManagement",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	OPEN_RECORD_MANAGEMENT: {
		component: OpenRecordManagement,
		title: "Mở hồ sơ",
		dialogKey: "openRecordManagement",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	VIEW_RECORD_DESTRUCTION: {
		component: RecordDestruction,
		title: "Chi tiết đợt tiêu huỷ hồ sơ",
		dialogKey: "viewRecordDestruction",
		defaultProps: {
			setReloadData: () => { },
		},

	},
	VIEW_APPROVAL_REQUEST: {
		component: ApprovalDetails,
		title: "Xem chi tiết yêu cầu phê duyệt",
		dialogKey: "viewApprovalRequest",
		defaultProps: {},
	},
	VIEW_APPROVAL_REQUEST_HISTORY: {
		component: ApprovalRequestHistory,
		title: "Lịch sử yêu cầu phê duyệt",
		dialogKey: "viewApprovalRequestHistory",
		defaultProps: {},
	},
	ADD_NEWS: {
		// component: AddMediaImage,
		component: AddNews,
		title: "Soạn tin",
		dialogKey: "addNews",
		defaultProps: {},
	},
	EDIT_NEWS: {
		component: EditNews,
		title: "Chỉnh sửa tin tức",
		dialogKey: "editNews",
		defaultProps: {},
	},
	VIEW_NEWS: {
		component: ViewNews,
		title: "Chi tiết tin tức",
		dialogKey: "viewNews",
		defaultProps: {},
	},
	NEWS_DETAIL_VIEW: {
		component: NewsDetailView,
		title: "Chi tiết tin tức CMS",
		dialogKey: "newsDetailView",
		defaultProps: {},
	},
	CREATE_MEETING_SCHEDULE: {
		component: CreateMeetingSchedule,
		title: "Tạo lịch họp",
		dialogKey: "CreateMeetingSchedule",
		defaultProps: {},
	},
	ADD_TOPIC: {
		component: AddTopic,
		title: "Thêm mới chủ đề",
		dialogKey: "addTopic",
		type: 'popup', // để type pop để Khi chọn Chọn kiểu hiển thị Popup thì render các component là Popup
		defaultProps: {
			setReloadData: () => { },
		},
	},
	EDIT_TOPIC: {
		component: EditTopic,
		title: "Chỉnh sửa chủ đề",
		dialogKey: "editTopic",
		type: 'popup', // để type pop để Khi chọn Chọn kiểu hiển thị Popup thì render các component là Popup
		defaultProps: {
			setReloadData: () => { },
		},
	},
	VIEW_TOPIC: {
		component: ViewTopic,
		title: "Xem chi tiết chủ đề",
		dialogKey: "viewTopic",
		type: 'popup', // để type pop để Khi chọn Chọn kiểu hiển thị Popup thì render các component là Popup
		defaultProps: {
			setReloadData: () => { },
		},
	},
	ADD_MEETING_ROOM: {
		component: AddMeetingRoom,
		title: "Thêm mới phòng họp",
		dialogKey: "addMeetingRoom",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	EDIT_MEETING_ROOM: {
		component: EditMeetingRoom,
		title: "Chỉnh sửa phòng họp",
		dialogKey: "editMeetingRoom",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	VIEW_DETAIL_MEETING_ROOM: {
		component: ViewMeetingRoom,
		title: "Chi tiết phòng họp",
		dialogKey: "viewDetailMeetingRoom",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	ADD_JOB_SUB: {
		component: AddJobChild,
		title: "Thêm mới công việc con công việc",
		dialogKey: "addJobSub",
		defaultProps: {
			setReloadData: () => { },
			dataDetail: {},
			type:'addJobChild'
		},
	},
	VIEW_RECALL: {
		component: ViewRecall,
		title: "Chi tiết tin thu hồi",
		dialogKey: "viewRecall",
		defaultProps: {},
	},
	VIEW_APPROVE: {
		component: ViewApprove,
		title: "Chi tiết tin phê duyệt",
		dialogKey: "viewApprove",
		defaultProps: {},
	},
	VIEW_APPROVE_DETAIL:{
		component: ViewApproveDetail,
		title: "Chi tiết tin đã phê duyệt",
		dialogKey: "viewApproveDetail",
		defaultProps: {},
	},
	VIEW_MEETING_ROOM: {
		component: ViewMeetingSchedule,
		title: "Chi tiết lịch họp",
		dialogKey: "viewMeetingRoom",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	VIEW_PROCESSING_SCHEDULE:
	{
		component: ViewProcessingSchedule,
		title: "Chi tiết lịch họp văn thư",
		dialogKey: "ViewProcessingSchedule",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	UPDATE_MEETING_ROOM: {
		component: UpdateMeetingSchedule,
		title: "Chỉnh sửa lịch họp",
		dialogKey: "updateMeetingRoom",
		defaultProps: {
			setReloadData: () => { },
		},
	},

	ADD_JOB_TO_DOCUMENT: {
		component: AddJobToDocument,
		title: "Thêm mới công việc từ văn bản",
		dialogKey: "addJobToDocument",
		defaultProps: {
			setReloadData: () => { },
			dataDetail: {},
		},
	},
	VIEW_JOB_TO_DOCUMENT: {
		component: ViewJobToDocument,
		title: "Chi tiết công việc từ văn bản",
		dialogKey: "viewJobToDocument",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	VIEW_NEWS_XB: {
		component: ViewNewsXB,
		title: "Chi tiết tin tức tab Xuất bản",
		dialogKey: "viewNewsXB",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	DIALOG_SUBMIT: {
		component: SubmitNewsDialog,
		title: "Dialog gửi duyệt tin tức",
		dialogKey: "dialogSubmit",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
		},
	},
	DIALOG_APPROVE: {
		component: ApproveNewsDialog,
		title: "Dialog duyệt tin tức",
		dialogKey: "dialogApprove",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
		},
	},
	DIALOG_RETURN: {
		component: ReturnNewsDialog,
		title: "Dialog trả lại tin tức",
		dialogKey: "dialogReturn",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
		},
	},
	DIALOG_CANCEL: {
		component: CancelNewsDialog,
		title: "Dialog hủy tin tức",
		dialogKey: "dialogCancel",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
		},
	},
	DIALOG_RECALL: {
		component: RecallNewsDialog,
		title: "Dialog thu hồi tin tức",
		dialogKey: "dialogRecall",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
		},
	},
	DIALOG_RECALL_MEETING: {
		component: RecallMeetingDialog,
		title: "Dialog thu hồi lịch họp",
		dialogKey: "dialogRecallMeeting",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
		},
	},
	DIALOG_CANCEL_MEETING: {
		component: CancelMeetingDialog,
		title: "Dialog hủy lịch họp",
		dialogKey: "dialogCancelMeeting",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
		},
	},
	DIALOG_SUBMIT_MEETING: {
		component: SubmitMeetingDialog,
		title: "Dialog trình duyệt lịch họp",
		dialogKey: "dialogSubmitMeeting",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
		},
	},

	ADD_EQUIPMENTDIALOG: {
		component: AddEquipmentDialog,
		title: "Thêm mới thiết bị",
		dialogKey: "addEquipmentDialog",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
		},
	},
	EDIT_EQUIPMENTDIALOG: {
		component: EditEquipmentDialog,
		title: "Cập nhật thiết bị",
		dialogKey: "editEquipmentDialog",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
		},
	},
	DELETE_EQUIPMENTDIALOG: {
		component: DeleteEquipmentConfirmation,
		title: "Xóa thiết bị",
		dialogKey: "deleteEquipmentDialog",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
		},
	},
	VIEW_EQUIPMENTDIALOG: {
		component: ViewEquipmentDialog,
		title: "Chi tiết thiết bị",
		dialogKey: "viewEquipmentDialog",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
		},
	},
	VIEW_NEWS_CANCELLED: {
		component: ViewNewsCancelled,
		title: "Chi tiết tin tức hủy tin",
		dialogKey: "viewNewsCancelled",
		defaultProps: {},
	},
	VIEW_NEWS_REJECT: {
		component: ViewNewReacts,
		title: "Chi tiết tin tức trả lại",
		dialogKey: "viewNewsReject",
		defaultProps: {},
	},
	ADD_MEDIA_IMAGE: {
		component: AddMediaImage,
		title: "Thêm ảnh",
		dialogKey: "addMediaImage",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	EDIT_MEDIA_IMAGE: {
		component: UpdateMediaImage,
		title: "Chỉnh sửa ảnh",
		dialogKey: "editMediaImage",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	VIEW_MEDIA_IMAGE: {
		component: ViewMediaImage,
		title: "Chi tiết ảnh",
		dialogKey: "viewMediaImage",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	ADD_MEDIA_VIDEO: {
		component: AddMediaVideo,
		title: "THÊM MỚI VIDEO",
		dialogKey: "addMediaVideo",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	EDIT_MEDIA_VIDEO: {
		component: UpdateMediaVideo,
		title: "Chỉnh sửa video",
		dialogKey: "editMediaVideo",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	VIEW_MEDIA_VIDEO: {
		component: ViewMediaVideo,
		title: "Chi tiết video",
		dialogKey: "viewMediaVideo",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	EDIT_REMOVE_PROCESS: {
		component: RemoveProcessDialog,
		title: "Bỏ áp dụng quy trình",
		dialogKey: "editRemoveProcessDialog",
		type: 'popup',
	},
	ADD_JOD_TO_MEETING: {
		component: AddJobToMeeting,
		title: "Thêm mới công việc từ cuộc họp",
		dialogKey: "addJobToMeeting",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	EDIT_APPROVE_PROCESS: {
		component: ApplyProcessDialog,
		title: "Áp dụng quy trình",
		dialogKey: "editApproveProcessDialog",
		type: 'popup',
	},
	VIEW_JOB_TO_MEETING: {
		component: ViewJobToMeeting,
		title: "Chi tiết công việc từ cuộc họp",
		dialogKey: "viewJobToMeeting",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	VIEW_NEWS_DXB:
	{
		component: ViewNewsDXB,
		title: "Chi tiết tin tức tab Xuất bản",
		dialogKey: "viewNewsDXB",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	VIEW_NEWS_CD:
	{
		component: ViewNewsCD,
		title: "Chi tiết tin tức tab Chờ duyệt",
		dialogKey: "viewNewsCD",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	DELETE_MEETING_ROOM:
	{
		component: DeletePopupMeetingRoom,
		title: "Xóa phòng họp",
		dialogKey: "deleteMeetingRoom",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
		},
	},
	CREATE_LEADER_DUTY_SCHEDULE:
	{
		component: CreateLeaderDutySchedule,
		title: "Thêm mới trực ban lãnh đạo",
		dialogKey: "createLeaderDutySchedule",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	UPDATE_LEADER_DUTY_SCHEDULE:
	{
		component: UpdateLeaderDutySchedule,
		title: "Chỉnh sửa trực ban lãnh đạo",
		dialogKey: "updateLeaderDutySchedule",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	VIEW_LEADER_DUTY_SCHEDULE:
	{
		component: ViewLeaderDutySchedule,
		title: "Xem trực ban lãnh đạo",
		dialogKey: "viewLeaderDutySchedule",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	ADD_YEAR_CATEGORY: {
		component: AddYearCategory,
		title: "Thêm danh mục năm",
		dialogKey: "addYearCategory",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
		},
	},
	DELETE_LEADER_DUTY_SCHEDULE:
	{
		component: DeleteLeaderDutySchedule,
		title: "Xóa trực ban lãnh đạo",
		dialogKey: "deleteLeaderDutySchedule",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
		},
	},
	ADD_PROJECT:
	{
		component: AddProject,
		title: "Thêm mới dự án",
		dialogKey: "addProject",
	},
	CREATE_TRAVEL_WORK_SCHEDULE:
	{
		component: CreateTravelWorkSchedules,
		title: "Thêm mới lịch công tác",
		dialogKey: "createTravelWorkSchedule",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	// UPDATE_PROJECT:
	// {
	// 	component: UpdateProject,
	// 	title: "Chỉnh sửa dự án",
	// 	dialogKey: "updateProject",
	// 	defaultProps: {
	// 		setReloadData: () => { },
	// 	},
	// },
	VIEW_PROJECT:
	{
		component: ViewsProject,
		title: "Xem dự án",
		dialogKey: "viewProject",
	},
	UPDATE_TRAVEL_WORK_SCHEDULE:
	{
		component: UpdateTravelWorkSchedules,
		title: "Chỉnh sửa lịch công tác",
		dialogKey: "updateTravelWorkSchedule",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	VIEW_TRAVEL_WORK_SCHEDULE:
	{
		component: ViewTravelWorkSchedules,
		title: "Xem lịch công tác",
		dialogKey: "viewTravelWorkSchedule",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	HISTORY_APPROVE:
	{
		component: HistoryApprove,
		title: "Lịch sử hành động phê duyệt",
		dialogKey: "historyApprove",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	TEMPLATE_SAMPLE:
	{
		component: TemplateSample,
		title: "Thêm mới quy trình mẫu",
		dialogKey: "templateSample",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	ADD_REPETITIVE_WORK:
	{
		component: AddRepetitiveWork,
		title: "Thêm mới công việc lặp lại",
		dialogKey: "addRepetitiveWork",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	VIEW_REPETITIVE_WORK:
	{
		component: ViewRepetitiveWork,
		title: "Xem công việc lặp lại",
		dialogKey: "viewRepetitiveWork",
		defaultProps: {
			setReloadData: () => { },
		},
	},

	ASSIGN_WORK_JOB_GENERAL:
	{
		component: UpdateJobDialog,
		title: "Thông tin người tham gia công việc chung",
		dialogKey: "assignWorkJobGeneral",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
			type: 'participants'
		},
	},
	FOLDER_DETAIL: {
		component: FolderDetail,
		title: "Chi tiết danh mục hồ sơ",
		dialogKey: "folderDetail",
		// type: 'popup',
		defaultProps: {
			yearData: {},
		},
	},
	ASSIGN_WORK_JOB_MEETING:
	{
		component: UpdateJobToMeeting,
		title: "Thông tin người tham gia công việc từ cuộc họp",
		dialogKey: "assignWorkJobMeeting",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
			type: 'participants',
			titlePopup: 'Thông tin người tham gia'
		},
	},
	VIEW_RECORD_MANAGEMENTS: {
		component: ViewRecordManagement,
		title: "Xem chi tiết hồ sơ",
		dialogKey: "viewRecordManagement",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	ASSIGN_WORK_JOB_DOCUMENT:
	{
		component: UpdateJobToDocumentDialog,
		title: "Thông tin người tham gia công việc từ văn bản",
		dialogKey: "assignWorkJobDocument",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
			type: 'participants',
			 
		},
	},

	VIEW_REQUEST_SENT:
	{
		component: RequestSent,
		title: "Chi tiết yêu cầu phê duyệt đã gửi",
		dialogKey: "viewRequestSent",
		defaultProps: {
			setReloadData: () => { },
		},
	},

	UPDATE_TEMPLATE_JOB:
	{
		component: UpdateTemplateSample,
		title: "Cập nhật quy trình mẫu",
		dialogKey: "updateTemplateJob",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	ADD_NEW_REQUEST:
	{
		component: AddNewRequest,
		title: "Thêm mới yêu cầu",
		dialogKey: "AddNewRequest",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	UPDATE_NEW_REQUEST:
	{
		component: UpdateNewRequest,
		title: "Chỉnh sửa yêu cầu đăng ký xe",
		dialogKey: "UpdateNewRequest",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	VIEW_NEW_REQUEST:
	{
		component: ViewRequest,
		title: "Chi tiết yêu cầu đăng ký xe",
		dialogKey: "ViewRequest",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	ADD_NEW_CAR:
	{
		component: AddNewCar,
		title: "Thêm mới xe",
		dialogKey: "AddNewCar",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	UPDATE_CAR:
	{
		component: UpdateCar,
		title: "Chỉnh sửa thông tin xe",
		dialogKey: "UpdateCar",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	VIEW_CAR:
	{
		component: ViewCar,
		title: "Chi tiết xe",
		dialogKey: "ViewCar",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	VIEW_COORDINATION:
	{
		component: CoordinateRequests,
		title: "Điều phối yêu cầu đăng ký xe",
		dialogKey: "CoordinateRequests",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	REMIND_THE_DRIVER:
	{
		component: ConfirmRemindTheDriverDialog,
		title: "Nhắc nhở tài xế",
		dialogKey: "ConfirmRemindTheDriverDialog",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
		},
	},
	REJECT_REQUEST_VEHICLE:
	{
		component: RejectDiaLog,
		title: "Từ chối yêu cầu đăng ký xe",
		dialogKey: "RejectDiaLog",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
		},
	},
	VIEW_REQUEST_COORDINATION:
	{
		component: ViewRequestCoordination,
		title: "Điều phối lại yêu cầu đăng ký xe",
		dialogKey: "ViewRequestCoordination",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	ADD_DRIVERS:
	{
		component: AddDrivers,
		title: "Thêm mới tài xế",
		dialogKey: "AddDrivers",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	UPDATE_DRIVERS:
	{
		component: UpdateDrivers,
		title: "Chỉnh sửa tài xế",
		dialogKey: "UpdateDrivers",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	VIEW_DRIVERS:
	{
		component: ViewDrivers,
		title: "Chi tiết tài xế",
		dialogKey: "ViewDrivers",
		defaultProps: {
			setReloadData: () => { },
		},
	},

	ADD_NEW_RECOMMENDATION:
	{
		component: AddRecommendations,
		title: "Thêm mới kiến nghị",
		dialogKey: "AddNewRecommendation",
		defaultProps: {
			setReloadData: () => { },
		},
	},

	EDIT_RECOMMENDATION:
	{
		component: EditRecommendations,
		title: "Chỉnh sửa kiến nghị",
		dialogKey: "EditRecommendation",
		defaultProps: {
			setReloadData: () => { },
		},
	},

	VIEW_RECOMMENDATION:
	{
		component: ViewsRecommendations,
		title: "Xem kiến nghị",
		dialogKey: "ViewRecommendation",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	VIEW_FEEDBACK :
	{
		component: ViewsRecommendationsBPCT,
		title: "Xem kiến nghị BPCT",
		dialogKey: "VIEW_FEEDBACK",
		defaultProps: {
			setReloadData: () => { },
		},
	},
	PAUSE_WORK_REPETITIVE:
	{
		component: PauseRepetivePopup,
		title: "Tạm dừng công việc lặp lại",
		type: 'popup',
		dialogKey: "PauseWorkRepetitive",
		defaultProps: {
			setReloadData: () => { },
			dataDetail: {}
		},
	},
	CONTINUE_WORK_REPETITIVE:
	{
		component: ContinueRepetiviWork,
		title: "Tiếp tục công việc lặp lại",
		type: 'popup',
		dialogKey: "ContinueWorkRepetitive",
		defaultProps: {
			setReloadData: () => { },
			dataDetail: {}
		},
	},
	FINAL_WORK_REPETITIVE:
	{
		component: FinalRepetinviWork,
		title: "Kết thúc công việc lặp lại",
		dialogKey: "FinalWorkRepetitive",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
			dataDetail: {}
		},
	},
	ADD_JOB_CHILD_DOCUMENT: {
		component: AddNewJob,
		title: "Thêm mới công việc con công việc văn bản",
		dialogKey: "addJobChild",
		defaultProps: {
			setReloadData: () => { },
			dataDetail: {},
			type: 'jobToDocument'
		},
	},
	ADD_JOB_CHILD_MEETING: {
		component: AddNewJob,
		title: "Thêm mới công việc con công việc phòng họp",
		dialogKey: "addJobChild",
		defaultProps: {
			setReloadData: () => { },
			dataDetail: {},
			type: 'jobToMeeting'
		},
	},
	ADD_PASSPORT_LIST: {
		component: AddPassportList,
		title: "Thêm mới hộ chiếu",
		dialogKey: "addPassportList",
		defaultProps: {
			setReloadData: () => { },
			dataDetail: {},
			type: 'passportList'
		},
	},
	EDIT_PASSPORT_LIST: {
		component: EditPassportList,
		title: "Chỉnh sửa hộ chiếu",
		dialogKey: "editPassportList",
		defaultProps: {
			setReloadData: () => { },
			dataDetail: {},
			type: 'passportList'
		},
	},
	VIEW_PASSPORT_LIST: {
		component: ViewPassportList,
		title: "Chi tiết hộ chiếu",
		dialogKey: "viewPassportList",
		defaultProps: {
			setReloadData: () => { },
			dataDetail: {},
			type: 'passportList'
		},
	},
	ADD_REQUEST_LIST: {
		component: AddRequest,
		title: "Loại thêm mới yêu cầu",
		dialogKey: "addRequestList",
		defaultProps: {
			setReloadData: () => { },
			dataDetail: {},
			type: 'requestList'
		},
	},
	EDIT_REQUEST_LIST: {
		component: EditRequest,
		title: "Chỉnh sửa yêu cầu",
		dialogKey: "editRequestList",
		defaultProps: {
			setReloadData: () => { },
			dataDetail: {},
			type: 'requestList'
		},
	},
	VIEW_REQUEST_LIST: {
		component: ViewPassportRequest,
		title: "Chi tiết yêu cầu",
		dialogKey: "viewRequestList",
		defaultProps: {
			setReloadData: () => { },
			dataDetail: {},
			type: 'requestList'
		},
	},
	ADD_INCOMING_DELEGATIONS: {
		component: AddIncomingDelegations,
		title: "Thêm mới đoàn vào",
		dialogKey: "addIncomingDelegations",
		defaultProps: {
			setReloadData: () => {},
			dataDetail: {},
			type: "incomingDelegations"
		},
	},
	EDIT_INCOMING_DELEGATIONS: {
		component: EditIncomingDelegations,
		title: "Cập nhật đoàn vào",
		dialogKey: "editIncomingDelegations",
		defaultProps: {
			setReloadData: () => {},
			dataDetail: {},
			type: "incomingDelegations"
		},
	},
	VIEW_INCOMING_DELEGATIONS: {
		component: ViewIncomingDelegations,
		title: "Chi tiết đoàn vào",
		dialogKey: "viewIncomingDelegations",
		defaultProps: {
			setReloadData: () => {},
			dataDetail: {},
			type: "incomingDelegations"
		},
	},
	ADD_PASSPORT_RETURN_SLIP: {
		component: AddPassportReturnSlip,
		title: "Thêm mới phiếu trả hộ chiếu",
		dialogKey: "addPassportReturnSlip",
		defaultProps: {
			setReloadData: () => { },
			dataDetail: {},
			type: 'passportReturnSlip'
		},
	},
	EDIT_PASSPORT_RETURN_SLIP: {
		component: EditPassportReturnSlip,
		title: "Chỉnh sửa phiếu trả hộ chiếu",
		dialogKey: "editPassportReturnSlip",
		defaultProps: {
			setReloadData: () => { },
			dataDetail: {},
			type: 'passportReturnSlip'
		},
	},
	VIEW_PASSPORT_RETURN_SLIP: {
		component: ViewPassportReturnSlip,
		title: "Chi tiết phiếu trả hộ chiếu",
		dialogKey: "viewPassportReturnSlip",
		defaultProps: {
			setReloadData: () => { },
			dataDetail: {},
			type: 'passportReturnSlip',
			isView: true
		},
	},
	APPROVE_REQUEST: {
		component: RequestApprovalDialog,
		title: "Phê duyệt yêu cầu",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
			actionsKeyType: "approve"
		},
	},
	REJECT_REQUEST: {
		component: RequestApprovalDialog,
		title: "Từ chối yêu cầu",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
			actionsKeyType: "reject"
		},
	},
	TRANSFER_PROCESSING_REQUEST: {
		component: RequestApprovalDialog,
		title: "Chuyển xử lý yêu cầu",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
			actionsKeyType: "transferProcessing"
		},
	},
	REJECT_OFFICE_COMMANDER_REQUEST: {
		component: RequestApprovalDialog,
		title: "Từ chối yêu cầu của chỉ huy văn phòng",
		type: 'popup',
		defaultProps: {
			setReloadData: () => {},
			actionsKeyType: "rejectOfficeCommanderRequest"
		},
	},
	RECEPTION_REQUEST: {
		component: RequestApprovalDialog,
		title: "Tiếp nhận yêu cầu",
		type: 'popup',
		defaultProps: {
			setReloadData: () => {},
			actionsKeyType: "receiveRequest",
			setOpenOfficialHandoverDoc: () => {},
		},
	},
	REJECT_SPECIAL_DEPT_REQUEST: {
		component: RequestApprovalDialog,
		title: "Từ chối yêu cầu của BPCT",
		type: 'popup',
		defaultProps: {
			setReloadData: () => {},
			actionsKeyType: "rejectSpecialDeptReq"
		},
	},
	CREATE_OFFICIAL_HANDOVER: {
		component: OfficialHandoverDocument,
		title: "Tạo biên bản bàn giao",
		type: 'popup',
		defaultProps: {
			onSuccess: () => {},
		},
	},
	ADD_AUTH_PASSPORT: {
		component: AddAuthPassport,
		title: "Thêm mới phân quyền",
		dialogKey: "addAuthPassport",
		defaultProps: {
			setReloadData: () => { },
			dataDetail: {},
			type: 'authPassport'
		},
	},
	EDIT_AUTH_PASSPORT: {
		component: EditAuthPassport,
		title: "Chỉnh sửa phân quyền",
		dialogKey: "editAuthPassport",
		defaultProps: {
			setReloadData: () => { },
			dataDetail: {},
			type: 'authPassport'
		},
	},
	VIEW_AUTH_PASSPORT: {
		component: ViewAuthPassport,
		title: "Xem chi tiết phân quyền",
		dialogKey: "viewAuthPassport",
		defaultProps: {
			setReloadData: () => { },
			dataDetail: {},
			type: 'authPassport'
		},
	},
	VIEW_JOB_PROJECT: {
		component: ViewJobProject,
		title: "Chi tiết công việc thuộc dự án",
		dialogKey: "viewJobProject",
		defaultProps: {
			setReloadData: () => { },
			dataDetail: {},
			 
		},
	},
	ADD_USER_GROUP: {
		component: AddUserGroup,
		title: "Thêm mới nhóm người dùng",
		type: 'popup',
		defaultProps: {
			setReloadData: () => {},
			onSuccess: () => {},
			dataDetail: {},
			type: 'authPassport'
		},
	},
	EDIT_USER_GROUP: {
		component: EditUserGroup,
		title: "Chỉnh sửa nhóm người dùng",
		type: 'popup',
		defaultProps: {
			setReloadData: () => {},
			onSuccess: () => {},
			dataDetail: {},
			type: 'authPassport'
		},
	},
	VIEW_USER_GROUP: {
		component: ViewUserGroup,
		title: "Xem chi tiết nhóm người dùng",
		type: 'popup',
		defaultProps: {
			setReloadData: () => {},
			onSuccess: () => {},
			dataDetail: {},
			type: 'authPassport'
		},
	},
	ADD_DOC_CATEGORY_MGMT: {
		component: AddDocCategoryMgmt,
		title: "Thêm mới danh mục",
		dialogKey: "addDocCategoryMgmt",
		defaultProps: {
			setReloadData: () => {},
			dataDetail: {},
			type: 'docCategoryMgmt'
		},
	},
	EDIT_DOC_CATEGORY_MGMT: {
		component: EditDocCategoryMgmt,
		title: "Chỉnh sửa danh mục",
		dialogKey: "editDocCategoryMgmt",
		defaultProps: {
			setReloadData: () => {},
			dataDetail: {},
			type: 'docCategoryMgmt'
		},
	},
	VIEW_DOC_CATEGORY_MGMT: {
		component: ViewDocCategoryMgmt,
		title: "Xem chi tiết danh mục",
		dialogKey: "viewDocCategoryMgmt",
		defaultProps: {
			setReloadData: () => {},
			dataDetail: {},
			type: 'docCategoryMgmt'
		},
	},
	ADD_SENDING_UNIT: {
		component: AddSendingUnit,
		title: "Thêm mới đơn vị gửi",
		type: 'popup',
		defaultProps: {
			setReloadData: () => {},
			onSuccess: () => {},
			dataDetail: {},
			type: 'sendingUnit'
		},
	},
	EDIT_SENDING_UNIT: {
		component: EditSendingUnit,
		title: "Chỉnh sửa đơn vị gửi",
		type: 'popup',
		defaultProps: {
			setReloadData: () => {},
			onSuccess: () => {},
			dataDetail: {},
			type: 'sendingUnit'
		},
	},
	VIEW_SENDING_UNIT: {
		component: ViewSendingUnit,
		title: "Xem chi tiết đơn vị gửi",
		type: 'popup',
		defaultProps: {
			setReloadData: () => {},
			// onSuccess: () => {},
			dataDetail: {},
			type: 'sendingUnit'
		},
	},
	IMPORT_FILE: {
		component: ImportPage,
		title: "Nhập file import",
		 dialogKey: "importFile",
		defaultProps: {
			setReloadData: () => {},
		},
	},
	IMPORT_TRAVEL_WORK_SCHEDULE_EXCEL: {
		component: ImportExcel,
		title: "Nhập lịch công tác từ Excel",
		 dialogKey: "importTravelWorkScheduleExcel",
		defaultProps: {
			endpoint: "/api/travel-work-schedules/import",
			templateKey: "IMPORT_TRAVEL_WORK_TEMPLATE",
			setReloadData: () => {},
		},
	},
	TASK_DETAIL_PANEL_PROJECT: {
		component: TaskDetailPanelProject,
		title: "Chi tiết dự án",
		dialogKey: "TaskDetailPanelProject",
		defaultProps: {
			setReloadData: () => {},
		},
	},
	TASK_DETAIL_PANEL: {
		component: TaskDetailPanel,
		title: "Xem chi tiết nhanh của công việc",
		dialogKey: "TaskDetailPanel",
		defaultProps: {
			setReloadData: () => {},
		},
	},
	EDIT_RECORD_DESTRUCTION: {
		component: RecordDestructionEdit,
		title: "Chỉnh sửa đợt tiêu huỷ hồ sơ",
		dialogKey: "editRecordDestruction",
		defaultProps: {
			setReloadData: () => { },
		},

	},
	ADD_RESERVATION_MODAL: {
		component: AddEditReservationModal,
		title: "Thêm mới giữ số văn bản",
		dialogKey: "addReservationModal",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
		},

	},
	EDIT_RESERVATION_MODAL: {
		component: AddEditReservationModal,
		title: "Chỉnh sửa giữ số văn bản",
		dialogKey: "editReservationModal",
		type: 'popup',
		defaultProps: {
			setReloadData: () => { },
		},

	},
	LIST_RESERVATION_MODAL: {
		component: ListReservationModal,
		title: "Danh sách giữ số văn bản",
		type: 'popup',
		dialogKey: "listReservationModal",
		defaultProps: {
			setReloadData: () => { },
		},

	},
	STAT_CARD_DETAIL_DIALOG: {
		component: StatCardDetailDialog,
		title: "Chi tiết thống kê",
		type: 'popup',
		dialogKey: "statCardDetailDialog",
		defaultProps: {
			setReloadData: () => { },
		},
	},
}
export const getComponentByKey = (key) => {
	return globalComponentRegistry[key];
};
