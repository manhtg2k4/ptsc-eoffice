import { useNavigate } from "react-router-dom";
import { useCallback } from "react";
import { useSelector } from "react-redux";
import { linkToBookACar, linkToBookACarManagement, linkToBookACarTp, linkToDhvb, linkToFeedBack, linkToFeedbackGd, linkToFeedbackTp, linkToMeetings } from "@/variable";

export const useNavigateTo = () => {
	const navigate = useNavigate();
	return useCallback((path, options) => {
		if (typeof path === "string" && (path.startsWith("http://") || path.startsWith("https://"))) {
			window.open(path, "_blank", "noopener,noreferrer");
		} else if (path) {
			navigate(path, options);
		}
	}, [navigate]);
};

export const useNavigateToArr = () => {
	const navigate = useNavigate();
	const { sideBarMenu } = useSelector((state) => state.menu);

	const normalize = (path = "") =>
		String(path)
			.trim()
			.replace(/^\/+/, "")
			.replace(/\/+$/, "")
			.toLowerCase();

	return useCallback(
		(paths, options) => {
			const pathList = Array.isArray(paths)
				? paths
				: [paths];

			const menuPaths =
				sideBarMenu
					?.map((item) => normalize(item?.function?.path))
					?.filter(Boolean) || [];

			const matchedPath = pathList.find((path) =>
				menuPaths.includes(normalize(path))
			);

			if (!matchedPath) {
				return false;
			}

			if (
				typeof matchedPath === "string" &&
				(matchedPath.startsWith("http://") ||
					matchedPath.startsWith("https://"))
			) {
				window.open(
					matchedPath,
					"_blank",
					"noopener,noreferrer"
				);
			} else {
				navigate(matchedPath, options);
			}

			return true;
		},
		[navigate, sideBarMenu]
	);
};

export const useMenuPermission = () => {
	const { sideBarMenu } = useSelector((state) => state.menu);

	const normalize = (path = "") =>
		String(path)
			.trim()
			.replace(/^\/+/, "")
			.replace(/\/+$/, "")
			.toLowerCase();

	const checkPermission = (targetPaths = [], options = {}) => {
		const { exact = true, matchAll = false } = options;

		const paths = Array.isArray(targetPaths)
			? targetPaths
			: [targetPaths];

		const normalizedPaths = paths.map(normalize);

		const menuPaths =
			sideBarMenu
				?.map((menu) => normalize(menu?.function?.path))
				?.filter(Boolean) || [];

		return matchAll
			? normalizedPaths.every((targetPath) =>
				menuPaths.some((menuPath) =>
					exact
						? menuPath === targetPath
						: targetPath.includes(menuPath)
				)
			)
			: normalizedPaths.some((targetPath) =>
				menuPaths.some((menuPath) =>
					exact
						? menuPath === targetPath
						: targetPath.includes(menuPath)
				)
			);
	};

	return { checkPermission };
};

export const arrPathBookCar = [
	linkToBookACar,
	linkToBookACarManagement,
	linkToBookACarTp,
	"/theDriverHasAccepted",
	"/reportVehicleBorrowReturnHistory",
	"/reportMostDispatchedVehicles",
	"/reportVehicleRegistrationByDepartment",
	"/reportVehicleUsageByVehicle",
	"/statisticsVehicleRegistrationRequests",
	"/vehicleRegistrationReports",
	"/WaitingForDriverConfirmation",
	"/LogisticsRoomCanceled",
	"/RefuseTheLogisticsDepartment",
	"/logisticsRoomCompleted",
	"/InTheLogisticsProcess",
	"/LogisticsDepartmentAssignment",
	"/LogisticsDepartmentCoordinator",
	"/requestCancelled",
	"/requestDenied",
	"/requestCompleted",
	"/inProgress",
	"/assigned",
	"/waitingCoordination",
	"/ListDrivers",
]

export const arrPathFeedBack = [
	linkToFeedBack,
	linkToFeedbackTp,
	linkToFeedbackGd,
	"/list-cancle-me",
	"/list-refuse-me",
	"/list-processed-me",
	"/dangXuLyPACT",
	"/choXuLyPACT",
	"/choDieuPhoiPACT",
	"/list-cancle",
	"/list-refuse",
	"/listProcessed",
	"/list-processing",
	"/listWaitingProcessing",
	"/listWaitingDispatch",
	"/list-recommendations",
	"/list-refuse",
	"/list-processed",
	"/listProcessing",
	"/listWaitingProcessing",
	"/list-recommendation",
	"/list-waiting-dispatch",
	"/listRefuse",
	"/list-processed",
	"/listProcessing",
	"/listWaitingProcessing",
	"/listWaitingDispatch",
]

export const arrPathMeeting = [
	linkToMeetings,
	"/meetingCalendarUserDirector",
	"/companyCalendarDirector",
	"/PersonalCalendarAll",
	"/meetingScheduleCancelled",
	"/MeetingScheduleAnnounced",
	"/draftMeeting_schedule",
	"/leadershipSchedule",
	"/departmentMeetingSchedule",
	"/scheduleCanceled",
	"/personal_calendar_authorization",
	"/personalParticipationNotSchedule",
	"/personalParticipationSchedule",
	"/meetingCalendarUsers",
	"/meetings/seat-assignment?type=processing",
	"/meetings/user?page=1&limit=25&workstate=waiting",
	"/meetingCalendar/units",
	"/meetingRelation",
	"/seatAssignments",
	"/noLocationAssigned",
	"/meetings",
	"/meetings/process?type=processing",
	"/roomUsageSchedule",
	"/notApproveds",
	"/notApproved",
	"/calendarRefused",
	"/schedulePendingApproval",
	"/calendarApproved",
	"/scheduleAwaitinApproval",
	"/calendarNeedsProcessing",
	"/prepareMeetingSchedule",
	"/meetingCalendarUnit",
	"/meetingCalendarUser",
]

export const arrPathDHVB = [
	//Văn bản đến
	linkToDhvb,
  "/authorization-management",
  "/PHDAXULYYY",
  "/PHCHOXULYPP",
  "/watting-completeRanagerRoom",
  "/daxulycuavanthuphong",
  "/daxulyLPVTPTPB",
  "/xulychinhTPPTP",
  "/receive-documents-room",
  "/main-processing-manager-room",
  "/complete-manager-room",
  "/get-to-know-vice president-room",
  "/getToKnowVb",
  "/officeDocumentCoordination",
  "/incomingDocumentProcessingAuth",
  "/processedHeadOfPreliminaryDepartmentAuth",
  "/mainProcessingHeadOfPreliminaryDepartmentAuth",
  "/listUnfinishedCbAuth",
  "/completeManagerCbAuth",
  "/processedsCbAuth",
  "/mainProcessingManagerCBAuth",
  "/completeManagerAuth",
  "/waitForCompletionAuth",
  "/processedsAuth",
  "/mainProcessingManagerAuth",
  "/analysisToolAuth",
  "/waitSignAuth",
  "/assignProcessingAuth",
  "/receiveDocumentsAuth",
  "/unfinishedAuth",
  "/coordinateCompleteDepartmenAuth",
  "/combinationProcessedAuth",
  "/combinationAuth",
  "/getToKnowWhatYouSawAuth",
  "/GetToKnowTheAuthorizedDirector",
  "/CompletTheAuthorizationDirective",
  "/confirmationOfAuthorizationCompletion",
  "/authorizationProcessed",
  "/authorizationDirection",
  "/list-unfinished",
  "/unfinished",
  "/completeManager",
  "/processeds",
  "/get-to-know-vb",
  "/office-document-coordination",
  "/incoming-document-processing",
  "/analysisTool",
  "/waitSign",
  "/waitForCompletion",
  "/notCompleteProcessing",
  "/notCompleteProcessingSupport",
  "/notCompleteProcessing",
  "/completedInstructions",
  "/InstructionsPendingCompletion",
  "/processedsCd",
  "/directorDirection",
  "/assignProcessing",
  "/forwardedForComments",
  "/WaitForComments",
  "/feedbackHasBeenGiven",
  "/gaveComments",
  "/askedForAdvice",
  "/completeManager",
  "/getToKnowVicePresident",
  "/combinationDxl",
  "/authorizationManagements",
  "/waitForCompletion",
  "/coordinateCompleteDepartmen",
  "/coordinationNotcompletedDepartment",
  "/complete",
  "/combination",
  "/documentBook",
  "/documentBookArrives",
  "/getToKnowWhatYouSaw",
  "/coordinatedProcessing",
  "/processeds",
  "/processedHeadOfPreliminaryDepartment",
  "/mainProcessingHeadOfPreliminaryDepartment",
  "/receiveDocuments",
  "/mainProcessingManager",

	//Văn bản đi
	"/PendingProcessingDepartmentHeadN",
  "/IssuedCPHVB",
  "/WaitingForIssuanceDepartmentClerkPhvb",
  "/processedGdKttt",
  "/PendingProcessingDepartmentHeadKttt",
  "/statistics/bySigner",
  "/outgoingDocumentsReportOutgoingByTime",
  "/stampedDocComplete",
  "/stampedDoc",
  "/DUTHAOALL",
  "/DaTrinhKyAll",
  "/signedOfficers",
  "/processedGd",
  "/draftForSignatureOfficersAuthority",
  "/PendingProcessingDepartmentHeadAuthority",
  "/WaitingForIssuanceDepartmentCerkAuthority",
  "/unprocessedDepartmentHeadAuthority",
  "/processedAuthority",
  "/AskForOpinionsTpAuthority",
  "/AskForOpinionsAuthority",
  "/AskForOpinionsVicePresidentAuthority",
  "/giveYourOpinionAuthority",
  "/SignedOfficersAuthority",
  "/ProcessedDepartmentHeadAuthority",
  "/OutgoingDocumentsIssuedTPAuthority",
  "/IssuedOfficersAuthority",
  "/WaitingForIssuanceHeadOfDepartmentAuthority",
  "/IssuedCAuthority",
  "/RedirectedForFeedbackAuthority",
  "/WaitingForIssuanceOfficeAuthority",
  "/WaitingForIssuanceOffice",
  "/RedirectedForFeedback",
  "/IssuedC",
  "/WaitingForIssuanceHeadOfDepartment",
  "/IssuedOfficers",
  "/OutgoingDocumentsIssuedTP",
  "/giveYourOpinion",
  "/AskForOpinionsVicePresident",
  "/AskForOpinions",
  "/AskForOpinionsTp",
  "/processed",
  "/unprocessedDepartmentHead",
  "/WaitingForIssuanceDepartmentClerk",
  "/PendingProcessingDepartmentHead",
  "/draftForSignatureOfficers",
];