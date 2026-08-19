import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import DragHandleIcon from "@mui/icons-material/DragHandle";
import { DashboardContainer, DashboardRoot } from "@styles/DashboardPage.styles";
import {
	DraggableWrapper,
	GhostContainer,
	HandleNode,
	MediumGridTwo,
	MediumKpiGrid,
	MediumMainStack,
	StyledDragHandleIcon,
} from "@styles/DashboardPageMedium.styles";
import LeadApprovalCard from "./components/LeadApprovalCard";
import LeadDocumentCard from "./components/LeadDocumentCard";
import LeadEmployeeStatusCard from "./components/LeadEmployeeStatusCard";
import LeadHeatmapProjectsCard from "./components/LeadHeatmapProjectsCard";
import LeadInternalNewsCard from "./components/LeadInternalNewsCard";
import LeadUpcomingEventsCard from "./components/LeadUpcomingEventsCard";
import LeadUtilityRequestsCard from "./components/LeadUtilityRequestsCard";
import LeadWeeklyMeetingsCard from "./components/LeadWeeklyMeetingsCard";
import StatCard from "./components/StatCard";
import StatCardDetailDialog from "./components/StatCardDetailDialog";
import DashboardGreetingBanner from "./components/DashboardGreetingBanner";
import { arrPathBookCar, arrPathDHVB, arrPathFeedBack, arrPathMeeting, useMenuPermission, useNavigateTo, useNavigateToArr } from "./ultilDashboard";
import { getComponentByKey } from "@builder-table/components/componentRegistry";
import { openDetailDialog } from "@components/GlobalDialogPortal";
import { ROUTES } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/routes";
import { useToast } from "@components/common/ToastProvider";
import {
	linkToCompanyWidePersonnel,
	linkToPassportTp,
	linkToNews,
	linkToTasks,
	linkToIncomingDocTp,
	linkToOutgoingDocTp,
} from "@/variable";
// import { linkToBookACar } from "@/variable";

// Card label map for the ghost clone shown while dragging
const BLOCK_LABELS = {
	employeeStatus: "👥 Tình trạng nhân viên",
	approvals: "⏳ Phê duyệt đang chờ",
	documents: "📑 Điều hành văn bản",
	heatmap: "🔥 Heatmap & Dự án",
	meetings: "📅 Lịch họp tuần này",
	events: "🗓️ Sự kiện sắp diễn ra",
	utilityRequests: "🛠️ Yêu cầu tiện ích",
	news: "📰 Tin tức nội bộ",
};

// Lightweight ghost card rendered during drag (avoids repainting heavy cards)
const DragGhost = ({ provided, label }) => (
	<GhostContainer
		ref={provided.innerRef}
		{...provided.draggableProps}
		{...provided.dragHandleProps}
		dndStyle={provided.draggableProps.style}
	>
		<StyledDragHandleIcon />
		{label}
	</GhostContainer>
);

DragGhost.displayName = "DragGhost";

DragGhost.propTypes = {
	provided: PropTypes.object.isRequired,
	label: PropTypes.string.isRequired,
};

const DEFAULT_LAYOUT = {
	statOrder: [],
	row0: ["employeeStatus", "approvals"],
	row1: ["documents", "heatmap"],
	row2: ["meetings", "events"],
	row3: ["utilityRequests", "news"],
};

const mapToInternalLayout = (externalLayout) => {
	if (!externalLayout || typeof externalLayout !== 'object' || Object.keys(externalLayout).length === 0) {
		return DEFAULT_LAYOUT;
	}

	const columnLeft = Array.isArray(externalLayout.columnLeft) ? externalLayout.columnLeft : [];
	const columnRight = Array.isArray(externalLayout.columnRight) ? externalLayout.columnRight : [];
	const allBlocks = [...columnLeft, ...columnRight];

	if (allBlocks.length === 0) {
		return {
			...DEFAULT_LAYOUT,
			statOrder: Array.isArray(externalLayout.statOrder) && externalLayout.statOrder.length > 0
				? externalLayout.statOrder
				: DEFAULT_LAYOUT.statOrder
		};
	}

	return {
		statOrder: Array.isArray(externalLayout.statOrder) ? externalLayout.statOrder : [],
		row0: allBlocks.slice(0, 2),
		row1: allBlocks.slice(2, 4),
		row2: allBlocks.slice(4, 6),
		row3: allBlocks.slice(6)
	};
};

const mapToExternalLayout = (internalLayout) => {
	return {
		columnLeft: internalLayout.row0 || [],
		columnRight: [...(internalLayout.row1 || []), ...(internalLayout.row2 || []), ...(internalLayout.row3 || [])],
		statOrder: internalLayout.statOrder || []
	};
};

const BlockItem = React.memo(({ id, dragHandleProps, data, listPropsObj, actions, functions }) => {
	const dragHandleNode = (
		<HandleNode {...dragHandleProps}>
			<DragHandleIcon />
		</HandleNode>
	);

	switch (id) {
		case "employeeStatus":
			return <LeadEmployeeStatusCard data={data.employeeStatus} onActionClick={functions?.handleViewAllEmployeeStatus} dragHandleNode={dragHandleNode} />;
		case "approvals":
			return (
				<div id="approvals-section">
					<LeadApprovalCard data={data.approvals} listProps={listPropsObj} onLoadMore={functions.onLoadMoreApprovals} onActionClick={actions?.onApprovalViewAll} onItemClick={functions.createItemClickHandler} dragHandleNode={dragHandleNode} />
				</div>
			);
		case "documents":
			return <LeadDocumentCard data={data.documents} onActionClick={functions.handleViewAllDocument} onItemClick={functions.createItemClickHandler} dragHandleNode={dragHandleNode} />;
		case "heatmap":
			return <LeadHeatmapProjectsCard heatmap={data.heatmap} projects={data.projects} onItemClick={functions.createItemClickHandler} dragHandleNode={dragHandleNode} />;
		case "meetings":
			return <LeadWeeklyMeetingsCard data={data.meetings} onActionClick={functions.handleViewAllMeetings} onItemClick={functions.createItemClickHandler} dragHandleNode={dragHandleNode} />;
		case "events":
			return <LeadUpcomingEventsCard data={data.upcomingEvents} onActionClick={functions.handleViewAllEvents} onItemClick={functions.createItemClickHandler} dragHandleNode={dragHandleNode} />;
		case "utilityRequests":
			return <LeadUtilityRequestsCard data={data.utilityRequests} onItemClick={functions.createItemClickHandler} dragHandleNode={dragHandleNode} />;
		case "news":
			return <LeadInternalNewsCard data={data.news} onActionClick={functions.handleViewAllNews} onItemClick={functions.createItemClickHandler} dragHandleNode={dragHandleNode} />;
		default:
			return null;
	}
}, (prevProps, nextProps) => {
	if (prevProps.id !== nextProps.id) return false;
	if (prevProps.dragHandleProps !== nextProps.dragHandleProps) return false;

	const id = prevProps.id;
	if (id === "employeeStatus" && prevProps.data.employeeStatus !== nextProps.data.employeeStatus) return false;
	if (id === "approvals" && (prevProps.data.approvals !== nextProps.data.approvals || prevProps.listPropsObj !== nextProps.listPropsObj)) return false;
	if (id === "documents" && prevProps.data.documents !== nextProps.data.documents) return false;
	if (id === "heatmap" && (prevProps.data.heatmap !== nextProps.data.heatmap || prevProps.data.projects !== nextProps.data.projects)) return false;
	if (id === "meetings" && prevProps.data.meetings !== nextProps.data.meetings) return false;
	if (id === "events" && prevProps.data.upcomingEvents !== nextProps.data.upcomingEvents) return false;
	if (id === "utilityRequests" && prevProps.data.utilityRequests !== nextProps.data.utilityRequests) return false;
	if (id === "news" && prevProps.data.news !== nextProps.data.news) return false;

	return true;
});
BlockItem.displayName = "BlockItem";

const LeadDashboard = ({
	data = {},
	initialLayout,
	onLayoutChange,
	onLoadMoreApprovals
}) => {
	const navigateTo = useNavigateTo();
	const navigateToArr = useNavigateToArr();
	const toast = useToast();
	const { checkPermission } = useMenuPermission();

	const [selectedStatBlock, setSelectedStatBlock] = useState(null);
	const [statDetailJobDialogOpen, setStatDetailJobDialogOpen] = useState(false);

	const handleStatBlockClick = useCallback((blockInfo, parentStat) => {
		if (parentStat.id === 'tasks-room' || parentStat.id === 'documents-month') {
			setSelectedStatBlock({ ...blockInfo, parentCard: parentStat });
			setStatDetailJobDialogOpen(true);
		} else if (parentStat.id === 'approvals-waiting') {
			const element = document.getElementById('approvals-section');
			if (element) {
				element.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		} else if (parentStat.id === 'team-performance') {
			const arrPathReports = ["/statisticsAndReports", "/statistics-reports", "/gantt", "/statistics/job"];
			const month = new Date().getMonth() + 1;
			const year = new Date().getFullYear();
			navigateToArr(arrPathReports, {
				state: {
					selectedTable: 'columnsPerformanceJobPerson',
					reportType: 'personal',
					month,
					year,
					autoGenerate: true
				}
			});
		}
	}, [navigateToArr]);

	const handleCloseStatDetailDialog = useCallback(() => {
		setStatDetailJobDialogOpen(false);
		setSelectedStatBlock(null);
	}, []);

	const stats = useMemo(() => Array.isArray(data?.stats) ? data.stats : [], [data?.stats]);
	// const alerts = useMemo(() => Array.isArray(data?.alerts) ? data.alerts : [], [data?.alerts]);
	const employeeStatus = data?.employeeStatus && typeof data.employeeStatus === "object" ? data.employeeStatus : {};
	const approvals = data?.approvals && typeof data.approvals === "object" ? data.approvals : {};
	const approvalsList = React.useMemo(() => (Array.isArray(data?.approvalsList) ? data?.approvalsList : []), [data?.approvalsList]);
	const listPropsObj = React.useMemo(() => ({
		list: approvalsList,
		page: data?.approvalsListPage,
		lowestPage: data?.approvalsListLowestPage,
		highestPage: data?.approvalsListHighestPage,
		loadedPages: data?.approvalsListLoadedPages,
		hasMore: data?.approvalsListHasMore,
		hasMoreUp: data?.approvalsListHasMoreUp,
		loading: data?.approvalsListLoading
	}), [
		approvalsList, data?.approvalsListPage, data?.approvalsListLowestPage,
		data?.approvalsListHighestPage, data?.approvalsListLoadedPages,
		data?.approvalsListHasMore, data?.approvalsListHasMoreUp, data?.approvalsListLoading
	]);
	const documents = data?.documents && typeof data.documents === "object" ? data.documents : {};
	const heatmap = data?.heatmap && typeof data.heatmap === "object" ? data.heatmap : {};
	const projects = useMemo(() => Array.isArray(data?.projects) ? data.projects : [], [data?.projects]);
	const meetings = data?.meetings && typeof data.meetings === "object" ? data.meetings : {};
	const upcomingEvents = data?.upcomingEvents && typeof data.upcomingEvents === "object" ? data.upcomingEvents : {};
	const utilityRequests = data?.utilityRequests && typeof data.utilityRequests === "object" ? data.utilityRequests : {};
	const news = data?.news && typeof data.news === "object" ? data.news : {};

	// const handleViewBookACar = useCallback(() => {
	// 	navigateToArr(linkToBookACarTp);
	// }, [navigateToArr]);

	const handleViewBookACar = useCallback(() => {
		if (!checkPermission(arrPathBookCar)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(arrPathBookCar);
	}, [checkPermission, navigateToArr, toast]);

	const handleViewPassport = useCallback(() => {
		if (!checkPermission(linkToPassportTp)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(linkToPassportTp);
	}, [checkPermission, navigateToArr, toast]);

	const handleViewFeedback = useCallback(() => {
		if (!checkPermission(arrPathFeedBack)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(arrPathFeedBack);
	}, [checkPermission, navigateToArr, toast]);

	const handleViewAllEvents = useCallback(() => {
		if (!checkPermission(linkToNews)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateTo(ROUTES.CALENDAR);
	}, [checkPermission, navigateTo, toast]);

	const handleViewAllNews = useCallback(() => {
		if (!checkPermission(linkToNews)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(linkToNews);
	}, [checkPermission, navigateToArr, toast]);

	const handleViewAllMeetings = useCallback(() => {
		if (!checkPermission(arrPathMeeting)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(arrPathMeeting, { state: { defaultTab: 2 } });
	}, [checkPermission, navigateToArr, toast]);

	const handleViewAllEmployeeStatus = useCallback(() => {
		if (!checkPermission(linkToCompanyWidePersonnel)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(`${linkToCompanyWidePersonnel}`);
	}, [checkPermission, navigateToArr, toast]);

	const handleViewAllDocument = useCallback(() => {
		if (!checkPermission(arrPathDHVB)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(arrPathDHVB);
	}, [checkPermission, navigateToArr, toast]);

	const handleViewAllTasks = useCallback(() => {
		if (!checkPermission(linkToTasks)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(linkToTasks);
	}, [checkPermission, navigateToArr, toast]);

	const handleViewIncomingDoc = useCallback(() => {
		if (!checkPermission(linkToIncomingDocTp)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(linkToIncomingDocTp);
	}, [checkPermission, navigateToArr, toast]);

	const handleViewOutgoingDoc = useCallback(() => {
		if (!checkPermission(linkToOutgoingDocTp)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(linkToOutgoingDocTp);
	}, [checkPermission, navigateToArr, toast]);

	const handleViewPersonalCalendar = useCallback(() => {
		if (!checkPermission(arrPathMeeting)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(arrPathMeeting, { state: { defaultTab: 2 } });
	}, [navigateToArr, checkPermission, toast]);

	const handleItemClick = useCallback((type, item) => {
		let key = item?.key;
		logger.log("key", key)
		logger.log("type", type)
		if (type === "utilityRequests") {
			switch (key) {
				case "VIEW_BOOK_A_CAR":
					handleViewBookACar();
					return;
				case "VIEW_PASSPORT":
					handleViewPassport();
					return;
				case "VIEW_FEEDBACK":
					handleViewFeedback();
					return;
				case "VIEW_TASK_MANAGEMENT":
					handleViewAllTasks();
					return;
				case "VIEW_INCOMING_DOCUMENTS":
					handleViewIncomingDoc();
					return;
				case "VIEW_OUTGOING_DOCUMENTS":
					handleViewOutgoingDoc();
					return;
				case "VIEW_PERSONAL_CALENDAR":
					handleViewPersonalCalendar();
					return;
				default:
					break;
			}
		}

		if (!key) {
			switch (type) {
				case "employeeStatus": key = "VIEW_EMPLOYEE_STATUS"; break;
				case "approvals": key = "VIEW_APPROVALS"; break;
				case "documents": key = "VIEW_DOCUMENTS"; break;
				case "heatmap": key = "VIEW_HEATMAP"; break;
				case "meetings": key = "VIEW_MEETINGS"; break;
				case "events": key = "VIEW_EVENTS"; break;
				case "utilityRequests": key = "VIEW_UTILITY_REQUESTS"; break;
				case "news": key = "VIEW_NEWS"; break;
				default: break;
			}
		}

		const recordId = item?.recordId || item?.newsId || item?.id || item?._id;
		if (key && recordId) {
			if (key === "NEWS_DETAIL") {
				navigateTo(ROUTES.newsDetail(recordId));
				return;
			}

			const componentInfo = getComponentByKey(key);
			if (componentInfo) {
				openDetailDialog(componentInfo, recordId);
			}
		}
	},
		[
			navigateTo,
			handleViewBookACar,
			handleViewPassport,
			handleViewFeedback,
			handleViewAllTasks,
			handleViewIncomingDoc,
			handleViewOutgoingDoc,
			handleViewPersonalCalendar
		]);

	const createItemClickHandler = useCallback(
		(type, item) => () => {
			logger.log("itemmmm", item)
			handleItemClick(type, item);
		},
		[handleItemClick]
	);

	const [layout, setLayout] = useState(() => mapToInternalLayout(initialLayout));
	const isFirstRender = useRef(true);
	const dragHappened = useRef(false);

	useEffect(() => {
		if (initialLayout) setLayout(mapToInternalLayout(initialLayout));
	}, [initialLayout]);

	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}
		const timer = setTimeout(() => {
			const outputLayout = mapToExternalLayout(layout);
			if (typeof logger !== "undefined") {
				logger.log(">>> DỮ LIỆU LAYOUT MEDIUM CUỐI CÙNG (GỬI LÊN API):", outputLayout);
			}
			if (dragHappened.current && typeof onLayoutChange === "function") {
				onLayoutChange(outputLayout);
			}
		}, 1000);
		return () => clearTimeout(timer);
	}, [layout, onLayoutChange]);

	useEffect(() => {
		if (layout.statOrder?.length === 0 && stats.length > 0) {
			setLayout(prev => ({ ...prev, statOrder: stats.map(s => s.id) }));
		}
	}, [stats, layout.statOrder?.length]);

	const onDragEnd = useCallback((result) => {
		const { source, destination, draggableId } = result;
		if (!destination) return;
		if (source.droppableId === destination.droppableId && source.index === destination.index) return;

		dragHappened.current = true;

		if (source.droppableId === "stats" && destination.droppableId === "stats") {
			const newOrder = Array.from(layout.statOrder || []);
			const [moved] = newOrder.splice(source.index, 1);
			newOrder.splice(destination.index, 0, moved);
			setLayout(prev => ({ ...prev, statOrder: newOrder }));
			return;
		}

		const rowKeys = ["row0", "row1", "row2", "row3"];
		if (!rowKeys.includes(source.droppableId) || !rowKeys.includes(destination.droppableId)) return;

		const srcRow = Array.from(layout[source.droppableId] || []);

		if (source.droppableId === destination.droppableId) {
			srcRow.splice(source.index, 1);
			srcRow.splice(destination.index, 0, draggableId);
			setLayout(prev => ({ ...prev, [source.droppableId]: srcRow }));
		} else {
			const dstRow = Array.from(layout[destination.droppableId] || []);
			const replacedId = dstRow[destination.index];
			const srcIdx = srcRow.indexOf(draggableId);
			srcRow[srcIdx] = replacedId;
			dstRow[destination.index] = draggableId;
			setLayout(prev => ({
				...prev,
				[source.droppableId]: srcRow,
				[destination.droppableId]: dstRow,
			}));
		}
	}, [layout]);



	const orderedStats = useMemo(() => {
		const validOrdered = layout.statOrder?.length > 0
			? layout.statOrder.map(id => stats.find(s => s.id === id)).filter(Boolean)
			: [];

		if (validOrdered.length === 0) {
			return stats;
		}

		const missingStats = stats.filter(s => !layout.statOrder.includes(s.id));
		return [...validOrdered, ...missingStats];
	}, [layout.statOrder, stats]);

	// renderClone for block Droppables: shows a lightweight ghost while dragging
	const renderBlockClone = useCallback((provided, _snapshot, rubric) => {
		const id = rubric.draggableId;
		return <DragGhost provided={provided} label={BLOCK_LABELS[id] || id} />;
	}, []);
	return (
		<DashboardRoot>
			{/* <LeadAlertBar
				alerts={alerts}
				actionText={data?.alertActionText}
				onActionClick={data?.actions?.onApprovalViewAll}
			/> */}
			<DashboardContainer>
				<DragDropContext onDragEnd={onDragEnd}>
					<MediumMainStack>
						<DashboardGreetingBanner
							alertCount={approvals?.pending ?? 0}
							alertSubText={data?.alertSubText || ""}
							onAlertClick={data?.actions?.onApprovalViewAll}
						/>

						{/* ── Stats row ── */}
						<Droppable droppableId="stats" direction="horizontal" type="STAT">
							{(provided) => (
								<MediumKpiGrid ref={provided.innerRef} {...provided.droppableProps}>
									{orderedStats.map((item, index) => (
										<Draggable key={item.id} draggableId={`stat-${item.id}`} index={index}>
											{(provided, snapshot) => (
												<div
													ref={provided.innerRef}
													{...provided.draggableProps}
													style={{
														...provided.draggableProps.style,
														height: snapshot.isDragging ? "auto" : "100%",
														minWidth: 0
													}}
												>
													<StatCard
														data={item}
														variant="medium"
														onStatBlockClick={handleStatBlockClick}
														dragHandleNode={
															<HandleNode {...provided.dragHandleProps} title="Kéo & Thả">
																<DragHandleIcon />
															</HandleNode>
														}
													/>
												</div>
											)}
										</Draggable>
									))}
									{provided.placeholder}
								</MediumKpiGrid>
							)}
						</Droppable>

						{/* ── Row 0: 2 columns ── */}
						<Droppable droppableId="row0" direction="horizontal" type="BLOCK" renderClone={renderBlockClone}>
							{(provided) => (
								<MediumGridTwo ref={provided.innerRef} {...provided.droppableProps}>
									{(layout.row0 || []).map((id, index) => (
										<Draggable key={id} draggableId={id} index={index}>
											{(provided, snapshot) => (
												<DraggableWrapper
													ref={provided.innerRef}
													{...provided.draggableProps}
													snapshot={snapshot}
													dndStyle={provided.draggableProps.style}
												>
													<BlockItem
														id={id}
														dragHandleProps={provided.dragHandleProps}
														data={{
															employeeStatus, approvals, documents, heatmap, projects,
															meetings, upcomingEvents, utilityRequests, news
														}}
														listPropsObj={listPropsObj}
														actions={data?.actions}
														functions={{
															onLoadMoreApprovals,
															createItemClickHandler,
															handleViewAllDocument,
															handleViewAllMeetings,
															handleViewAllEvents,
															handleViewAllNews,
															handleViewAllEmployeeStatus
														}}
													/>
												</DraggableWrapper>
											)}
										</Draggable>
									))}
									{provided.placeholder}
								</MediumGridTwo>
							)}
						</Droppable>

						{/* ── Row 1: 2 columns ── */}
						<Droppable droppableId="row1" direction="horizontal" type="BLOCK" renderClone={renderBlockClone}>
							{(provided) => (
								<MediumGridTwo ref={provided.innerRef} {...provided.droppableProps}>
									{(layout.row1 || []).map((id, index) => (
										<Draggable key={id} draggableId={id} index={index}>
											{(provided, snapshot) => (
												<div
													ref={provided.innerRef}
													{...provided.draggableProps}
													style={{
														...provided.draggableProps.style,
														opacity: snapshot.isDragging ? 0 : 1,
														height: snapshot.isDragging ? "auto" : "100%",
													}}
												>
													<BlockItem
														id={id}
														dragHandleProps={provided.dragHandleProps}
														data={{
															employeeStatus, approvals, documents, heatmap, projects,
															meetings, upcomingEvents, utilityRequests, news
														}}
														listPropsObj={listPropsObj}
														actions={data?.actions}
														functions={{
															onLoadMoreApprovals,
															createItemClickHandler,
															handleViewAllDocument,
															handleViewAllMeetings,
															handleViewAllEvents,
															handleViewAllNews,
															handleViewAllEmployeeStatus
														}}
													/>
												</div>
											)}
										</Draggable>
									))}
									{provided.placeholder}
								</MediumGridTwo>
							)}
						</Droppable>

						{/* ── Row 2: 2 columns ── */}
						<Droppable droppableId="row2" direction="horizontal" type="BLOCK" renderClone={renderBlockClone}>
							{(provided) => (
								<MediumGridTwo ref={provided.innerRef} {...provided.droppableProps}>
									{(layout.row2 || []).map((id, index) => (
										<Draggable key={id} draggableId={id} index={index}>
											{(provided, snapshot) => (
												<div
													ref={provided.innerRef}
													{...provided.draggableProps}
													style={{
														...provided.draggableProps.style,
														opacity: snapshot.isDragging ? 0 : 1,
														height: snapshot.isDragging ? "auto" : "100%",
													}}
												>
													<BlockItem
														id={id}
														dragHandleProps={provided.dragHandleProps}
														data={{
															employeeStatus, approvals, documents, heatmap, projects,
															meetings, upcomingEvents, utilityRequests, news
														}}
														listPropsObj={listPropsObj}
														actions={data?.actions}
														functions={{
															onLoadMoreApprovals,
															createItemClickHandler,
															handleViewAllDocument,
															handleViewAllMeetings,
															handleViewAllEvents,
															handleViewAllNews,
															handleViewAllEmployeeStatus
														}}
													/>
												</div>
											)}
										</Draggable>
									))}
									{provided.placeholder}
								</MediumGridTwo>
							)}
						</Droppable>

						{/* ── Row 3: 2 columns ── */}
						<Droppable droppableId="row3" direction="horizontal" type="BLOCK" renderClone={renderBlockClone}>
							{(provided) => (
								<MediumGridTwo ref={provided.innerRef} {...provided.droppableProps}>
									{(layout.row3 || []).map((id, index) => (
										<Draggable key={id} draggableId={id} index={index}>
											{(provided, snapshot) => (
												<div
													ref={provided.innerRef}
													{...provided.draggableProps}
													style={{
														...provided.draggableProps.style,
														opacity: snapshot.isDragging ? 0 : 1,
														height: snapshot.isDragging ? "auto" : "100%",
													}}
												>
													<BlockItem
														id={id}
														dragHandleProps={provided.dragHandleProps}
														data={{
															employeeStatus, approvals, documents, heatmap, projects,
															meetings, upcomingEvents, utilityRequests, news
														}}
														listPropsObj={listPropsObj}
														actions={data?.actions}
														functions={{
															onLoadMoreApprovals,
															createItemClickHandler,
															handleViewAllDocument,
															handleViewAllMeetings,
															handleViewAllEvents,
															handleViewAllNews,
															handleViewAllEmployeeStatus
														}}
													/>
												</div>
											)}
										</Draggable>
									))}
									{provided.placeholder}
								</MediumGridTwo>
							)}
						</Droppable>

					</MediumMainStack>
				</DragDropContext>
			</DashboardContainer>

			{statDetailJobDialogOpen && (
				<StatCardDetailDialog
					open={statDetailJobDialogOpen}
					onClose={handleCloseStatDetailDialog}
					statBlock={selectedStatBlock}
					isMedium
				/>
			)}
		</DashboardRoot>
	);
};

LeadDashboard.propTypes = {
	data: PropTypes.object,
	initialLayout: PropTypes.object,
	onLayoutChange: PropTypes.func,
	onLoadMoreApprovals: PropTypes.func,
};

export default React.memo(LeadDashboard);