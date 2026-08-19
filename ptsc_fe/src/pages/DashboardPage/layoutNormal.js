import React, { useState, useEffect, useRef, useCallback } from "react";
import { Grid, Stack } from "@mui/material";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

import {
	DashboardRoot,
	DashboardContainer,
	StyleGridDashboard,
	ProjectListScrollArea,
	QuickActionsScrollArea,
	MeetingsScrollArea,
	EventsScrollArea,
	NewsScrollArea,
	NormalStatGridItem,
	NormalDragHandleWrapper,
	DragHandleIcon,
	DroppableContainer,
	QuickActionGrid,
	QuickActionGroupTitle,
} from "@styles/DashboardPage.styles";

import { getComponentByKey } from "@builder-table/components/componentRegistry";
import { openDetailDialog } from "@components/GlobalDialogPortal";

import SectionCard from "./components/SectionCard";
import StatCard from "./components/StatCard";
import StatCardDetailDialog from "./components/StatCardDetailDialog";
import PerformanceSection from "./components/PerformanceSection";
import DoughnutChartCard from "./components/DoughnutChartCard";
import ProjectSummary from "./components/ProjectSummary";
import ProjectItem from "./components/ProjectItem";
import QuickActionItem from "./components/QuickActionItem";
import MeetingItem from "./components/MeetingItem";
import EventItem from "./components/EventItem";
import NewsItem from "./components/NewsItem";
import PropTypes from "prop-types";
import {
	linkToNews,
	linkToProjects,
	linkToTasks,
	linkToPassportCb,
	linkToIncomingDocCb,
	linkToOutgoingDocCb
} from "@/variable";
import { arrPathBookCar, arrPathFeedBack, arrPathMeeting, useMenuPermission, useNavigateTo, useNavigateToArr } from "./ultilDashboard";
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import NewspaperOutlinedIcon from '@mui/icons-material/NewspaperOutlined';
import StarOutlinedIcon from '@mui/icons-material/StarOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import NoDataDashboard from "./components/NoDataDashboard";
import DashboardGreetingBanner from "./components/DashboardGreetingBanner";
import { ROUTES } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/routes";
import { useToast } from "@components/common/ToastProvider";

const defaultLayout = {
	columnLeft: ["taskOverview", "projects"],
	columnRight: ["quickActions", "meetings", "events", "news"],
	statOrder: []
};

const LEFT_SECTION_HEIGHT = {
	xs: "auto",
	md: "calc((2 * 16.5rem) + 24px)",
};

const RIGHT_SECTION_HEIGHT = {
	...LEFT_SECTION_HEIGHT,
};

const EmployeeDashboard = ({ data, initialLayout, onLayoutChange }) => {
	const navigateTo = useNavigateTo();
	const navigateToArr = useNavigateToArr();
	const toast = useToast();
	const { checkPermission } = useMenuPermission();
	const stats = Array.isArray(data?.stats) ? data.stats : [];
	const pendingApprovalCount = data?.pendingApprovalCount ?? 0;
	const pendingApprovalSubText = data?.pendingApprovalSubText || "";
	const taskOverview =
		data?.taskOverview && typeof data.taskOverview === "object"
			? data.taskOverview
			: {};
	const sourceChart =
		taskOverview.sourceChart && typeof taskOverview.sourceChart === "object"
			? taskOverview.sourceChart
			: {};
	const roleChart =
		taskOverview.roleChart && typeof taskOverview.roleChart === "object"
			? taskOverview.roleChart
			: {};
	const projects =
		data?.projects && typeof data.projects === "object" ? data.projects : {};
	const projectList = Array.isArray(projects.list) ? projects.list : [];
	const quickActions = data?.quickActions && typeof data.quickActions === "object"
		? data.quickActions
		: {};
	const quickOperationList = Array.isArray(quickActions?.quickOperation)
		? quickActions.quickOperation
		: [];
	const pinnedWidgetList = Array.isArray(quickActions?.pinnedWidgets)
		? quickActions.pinnedWidgets
		: [];
	const meetings = Array.isArray(data?.meetings) ? data.meetings : [];
	const events = Array.isArray(data?.events) ? data.events : [];
	const news = Array.isArray(data?.news) ? data.news : [];

	const [selectedStatBlock, setSelectedStatBlock] = useState(null);
	const [statDetailJobDialogOpen, setStatDetailJobDialogOpen] = useState(false);

	const handleStatBlockClick = useCallback((blockInfo, parentStat) => {
		logger.log("handleStatBlockClick", blockInfo, parentStat);
		if (
			parentStat.id === 'tasks-overview' ||
			parentStat.id === 'outgoing-documents' ||
			parentStat.id === 'incoming-documents'
		) {
			setSelectedStatBlock({ ...blockInfo, parentCard: parentStat });
			setStatDetailJobDialogOpen(true);
		}
	}, []);

	const handleCloseStatDetailDialog = useCallback(() => {
		setStatDetailJobDialogOpen(false);
		setSelectedStatBlock(null);
	}, []);

	const handleViewAllTasks = useCallback(() => {
		if (typeof data?.actions?.onViewAllTasks === "function") {
			data.actions.onViewAllTasks();
		}
		navigateToArr(linkToTasks);
	}, [navigateToArr, data.actions]);

	const handleViewAllMeetings = useCallback(() => {
		if (!checkPermission(arrPathMeeting)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(arrPathMeeting, { state: { defaultTab: 2 } });
	}, [checkPermission, navigateToArr, toast]);

	const handleViewAllProjects = useCallback(() => {
		if (typeof data?.actions?.onViewAllProjects === "function") {
			data.actions.onViewAllProjects();
		}
		navigateToArr(linkToProjects);
	}, [navigateToArr, data.actions]);

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

	const handleViewIncomingDoc = useCallback(() => {
		if (!checkPermission(linkToIncomingDocCb)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(linkToIncomingDocCb);
	}, [checkPermission, navigateToArr, toast]);

	const handleViewOutgoingDoc = useCallback(() => {
		if (!checkPermission(linkToOutgoingDocCb)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(linkToOutgoingDocCb);
	}, [checkPermission, navigateToArr, toast]);

	const handleViewPersonalCalendar = useCallback(() => {
		if (!checkPermission(arrPathMeeting)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(arrPathMeeting, { state: { defaultTab: 2 } });
	}, [checkPermission, navigateToArr, toast]);

	const handleViewBookACar = useCallback(() => {
		if (!checkPermission(arrPathBookCar)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(arrPathBookCar);
	}, [checkPermission, navigateToArr, toast]);

	const handleViewPassport = useCallback(() => {
		if (!checkPermission(linkToPassportCb)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(linkToPassportCb);
	}, [checkPermission, navigateToArr, toast]);

	const handleViewFeedback = useCallback(() => {
		if (!checkPermission(arrPathFeedBack)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(arrPathFeedBack);
	}, [checkPermission, navigateToArr, toast]);

	const handleItemClick = useCallback((type, item) => {
		logger.log("type", type)
		logger.log("item", item)
		let key = item?.key;
		logger.log("key", key)
		if (type === "quickActions") {
			switch (key) {
				case "VIEW_TASK_MANAGEMENT":
					handleViewAllTasks();
					return;
				case "VIEW_BOOK_A_CAR":
					handleViewBookACar();
					return;
				case "VIEW_PASSPORT":
					handleViewPassport();
					return;
				case "VIEW_FEEDBACK":
					handleViewFeedback();
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
				case "news": key = "VIEW_NEWS"; break;
				case "meetings": key = "VIEW_MEETING_ROOM"; break;
				case "tasks": key = "VIEW_TASK"; break;
				case "projects": key = "VIEW_PROJECT"; break;
				case "events": key = "VIEW_EVENT"; break;
				default: break;
			}
		}

		const recordId = item?.recordId || item?.newsId || item?.id || item?._id;
		if (key && recordId) {
			if (key === "VIEW_NEWS") {
				navigateTo(ROUTES.newsDetail(recordId));
				return;
			}
			const componentInfo = getComponentByKey(key);
			logger.log("componentInfo", componentInfo)
			if (componentInfo) {
				openDetailDialog(componentInfo, recordId);
			}
		}
	},
		[
			navigateTo,
			handleViewFeedback,
			handleViewPassport,
			handleViewBookACar,
			handleViewAllTasks,
			handleViewPersonalCalendar,
			handleViewOutgoingDoc,
			handleViewIncomingDoc
		]);

	const createItemClickHandler = useCallback(
		(type, item) => () => {
			handleItemClick(type, item);
		},
		[handleItemClick]
	);

	const [layout, setLayout] = useState(() => {
		if (!initialLayout || typeof initialLayout !== 'object' || Object.keys(initialLayout).length === 0) {
			return defaultLayout;
		}
		return {
			columnLeft: (Array.isArray(initialLayout.columnLeft) && initialLayout.columnLeft.length > 0) ? initialLayout.columnLeft : defaultLayout.columnLeft,
			columnRight: (Array.isArray(initialLayout.columnRight) && initialLayout.columnRight.length > 0) ? initialLayout.columnRight : defaultLayout.columnRight,
			statOrder: Array.isArray(initialLayout.statOrder) ? initialLayout.statOrder : defaultLayout.statOrder,
		};
	});
	const isFirstRender = useRef(true);
	const dragHappened = useRef(false);

	useEffect(() => {
		if (initialLayout && typeof initialLayout === 'object' && Object.keys(initialLayout).length > 0) {
			setLayout({
				columnLeft: (Array.isArray(initialLayout.columnLeft) && initialLayout.columnLeft.length > 0) ? initialLayout.columnLeft : defaultLayout.columnLeft,
				columnRight: (Array.isArray(initialLayout.columnRight) && initialLayout.columnRight.length > 0) ? initialLayout.columnRight : defaultLayout.columnRight,
				statOrder: Array.isArray(initialLayout.statOrder) ? initialLayout.statOrder : defaultLayout.statOrder,
			});
		}
	}, [initialLayout]);

	// Debounced effect to call API and log change
	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}

		const timer = setTimeout(() => {
			// ĐÂY LÀ ĐẦU RA CUỐI CÙNG
			if (typeof logger !== "undefined") {
				logger.log(">>> DỮ LIỆU LAYOUT CUỐI CÙNG (GỬI LÊN API):", layout);
			}

			if (dragHappened.current && typeof onLayoutChange === "function") {
				onLayoutChange(layout);
			}
		}, 1000); // Đợi 1 giây sau khi ngừng thao tác mới call API

		return () => clearTimeout(timer);
	}, [layout, onLayoutChange]);

	useEffect(() => {
		if (layout.statOrder?.length === 0 && Array.isArray(data?.stats) && data.stats.length > 0) {
			setLayout(prev => ({
				...prev,
				statOrder: data.stats.map(s => s.id)
			}));
		}
	}, [data?.stats, layout.statOrder?.length]);

	const onDragEnd = (result) => {
		const { source, destination } = result;

		if (!destination) {
			return;
		}

		if (
			source.droppableId === destination.droppableId &&
			source.index === destination.index
		) {
			return;
		}

		dragHappened.current = true;

		if (source.droppableId === "stats" && destination.droppableId === "stats") {
			const newStatOrder = Array.from(layout.statOrder || []);
			const [moved] = newStatOrder.splice(source.index, 1);
			newStatOrder.splice(destination.index, 0, moved);

			setLayout({ ...layout, statOrder: newStatOrder });
			return;
		}

		if (source.droppableId === "stats" || destination.droppableId === "stats") {
			return;
		}

		const startColumn = [...layout[source.droppableId]];
		const finishColumn = [...layout[destination.droppableId]];

		if (source.droppableId === destination.droppableId) {
			startColumn.splice(source.index, 1);
			startColumn.splice(destination.index, 0, result.draggableId);

			const newLayout = {
				...layout,
				[source.droppableId]: startColumn,
			};

			setLayout(newLayout);
			return;
		}

		// Move between columns
		startColumn.splice(source.index, 1);
		finishColumn.splice(destination.index, 0, result.draggableId);

		const newLayout = {
			...layout,
			[source.droppableId]: startColumn,
			[destination.droppableId]: finishColumn,
		};

		setLayout(newLayout);
	};

	const renderBlock = (id, dragHandleNode) => {
		switch (id) {
			case "taskOverview": {
				const isEmpty =
					!taskOverview?.performance &&
					!sourceChart?.chartData?.length &&
					!roleChart?.chartData?.length;
				return (
					<SectionCard
						title="Tổng quan công việc"
						icon="task"
						dragHandleNode={dragHandleNode}
						actionText="Xem tất cả"
						onActionClick={handleViewAllTasks}
						wrapperHeight={LEFT_SECTION_HEIGHT}
						contentLayout={{
							display: "flex",
							flexDirection: "column",
							height: "100%",
						}}
						bodyLayout={{
							display: "flex",
							flexDirection: "column",
							flex: 1,
							minHeight: 0,
						}}
					>
						{isEmpty ? (
							<NoDataDashboard
								icon={AssignmentOutlinedIcon}
								title="Chưa có công việc nào"
								description="Bạn hiện không có công việc nào được giao trong tuần này"
							/>
						) : (
							<>
								<PerformanceSection data={taskOverview.performance} />
								<Grid container spacing={2.5}>
									<Grid item xs={12} sm={6}>
										<DoughnutChartCard
											title={sourceChart.title}
											badge={sourceChart.badge}
											chartData={sourceChart.chartData}
										/>
									</Grid>
									<Grid item xs={12} sm={6}>
										<DoughnutChartCard
											title={roleChart.title}
											badge={roleChart.badge}
											chartData={roleChart.chartData}
										/>
									</Grid>
								</Grid>
							</>
						)}
					</SectionCard>
				);
			}
			case "projects": {
				const isEmpty = projectList?.length === 0;
				return (
					<SectionCard
						title="Dự án đang tham gia"
						icon="project"
						dragHandleNode={dragHandleNode}
						actionText="Xem tất cả"
						onActionClick={handleViewAllProjects}
						wrapperHeight={LEFT_SECTION_HEIGHT}
						contentLayout={{
							display: "flex",
							flexDirection: "column",
							height: "100%",
						}}
						bodyLayout={{
							display: "flex",
							flexDirection: "column",
							flex: 1,
							minHeight: 0,
						}}
					>
						{isEmpty ? (
							<NoDataDashboard
								icon={AccountTreeOutlinedIcon}
								title="Chưa có dự án nào"
								description="Bạn hiện đang không có dự án nào đang tham gia"
							/>
						) : (
							<>
								<ProjectSummary data={projects.summary} />
								<ProjectListScrollArea fillHeight disableMaxHeight>
									<Stack spacing={1.5}>
										{projectList.map((item) => (
											<ProjectItem key={item.id} data={item} onClick={createItemClickHandler("projects", item)} />
										))}
									</Stack>
								</ProjectListScrollArea>
							</>
						)}
					</SectionCard>
				);
			}
			case "quickActions":
				return (
					<SectionCard
						// title="Thao tác nhanh"
						customTitle={
							<QuickActionGroupTitle nonePdBt>Thao tác nhanh</QuickActionGroupTitle>
						}
						// icon="warning"
						sizeTitle={14}
						dragHandleNode={dragHandleNode}
						wrapperHeight={RIGHT_SECTION_HEIGHT}
						wrapperBgMode
						contentLayout={{
							display: "flex",
							flexDirection: "column",
							height: "100%",
						}}
						bodyLayout={{ flex: 1, minHeight: 0 }}
					>
						<QuickActionsScrollArea fillHeight disableMaxHeight>
							<Stack spacing={2.5}>
								{quickOperationList.length > 0 && (
									<Stack spacing={0.8}>
										{/* <QuickActionGroupTitle>Thao tác nhanh</QuickActionGroupTitle> */}
										<QuickActionGrid stylePbottom={2.5}>
											{quickOperationList.map((item) => (
												<QuickActionItem key={item.id} data={item} onClick={createItemClickHandler("quickActions", item)} />
											))}
										</QuickActionGrid>
									</Stack>
								)}

								{pinnedWidgetList.length > 0 && (
									<Stack spacing={0.8}>
										<QuickActionGroupTitle>Tiện ích đã ghim</QuickActionGroupTitle>
										<QuickActionGrid>
											{pinnedWidgetList.map((item) => (
												<QuickActionItem key={item.id} data={item} onClick={createItemClickHandler("quickActions", item)} />
											))}
										</QuickActionGrid>
									</Stack>
								)}
							</Stack>
						</QuickActionsScrollArea>
					</SectionCard>
				);
			case "meetings": {
				const isEmpty = meetings.length === 0;
				return (
					<SectionCard
						title="Lịch họp sắp tới"
						icon="calendar"
						dragHandleNode={dragHandleNode}
						actionText="Xem tất cả"
						onActionClick={handleViewAllMeetings}
						styleHeader={15}
						wrapperHeight={RIGHT_SECTION_HEIGHT}
						contentLayout={{
							display: "flex",
							flexDirection: "column",
							height: "100%",
						}}
						bodyLayout={{ flex: 1, minHeight: 0 }}
					>
						{isEmpty ? (
							<NoDataDashboard
								icon={EventAvailableOutlinedIcon}
								title="Không có lịch nào"
								description="Tuần này  bạn chưa có lịch họp nào được lên kết hoạch"
							/>
						) : (
							<MeetingsScrollArea fillHeight disableMaxHeight>
								<Stack spacing={1.25}>
									{meetings.map((item) => (
										<MeetingItem key={item.id} data={item} onClick={createItemClickHandler("meetings", item)} />
									))}
								</Stack>
							</MeetingsScrollArea>
						)}
					</SectionCard>
				);
			}
			case "events": {
				const isEmpty = events.length === 0;
				return (
					<SectionCard
						title="Sự kiện sắp diễn ra"
						icon="event"
						dragHandleNode={dragHandleNode}
						actionText="Xem tất cả"
						onActionClick={handleViewAllEvents}
						wrapperHeight={RIGHT_SECTION_HEIGHT}
						contentLayout={{
							display: "flex",
							flexDirection: "column",
							height: "100%",
						}}
						bodyLayout={{ flex: 1, minHeight: 0 }}
					>
						{isEmpty ? (
							<NoDataDashboard
								icon={StarOutlinedIcon}
								title="Không có sự kiện nào"
								description="Tuần này bạn chưa có sự kiện nào sắp diễn ra"
							/>
						) : (
							<EventsScrollArea fillHeight disableMaxHeight>
								<Stack spacing={1.5}>
									{events.map((item) => (
										<EventItem key={item.id} data={item} onClick={createItemClickHandler("events", item)} />
									))}
								</Stack>
							</EventsScrollArea>
						)}
					</SectionCard>
				);
			}

			case "news": {
				const isEmpty = news.length === 0;
				return (
					<SectionCard
						title="Tin tức nội bộ"
						icon="news"
						dragHandleNode={dragHandleNode}
						actionText="Xem tất cả"
						onActionClick={handleViewAllNews}
						wrapperHeight={RIGHT_SECTION_HEIGHT}
						contentLayout={{
							display: "flex",
							flexDirection: "column",
							height: "100%",
						}}
						bodyLayout={{ flex: 1, minHeight: 0 }}
					>
						{isEmpty ? (
							<NoDataDashboard
								icon={NewspaperOutlinedIcon}
								title="Không có tin tức nào"
								description="Không có tin tức nội bộ nào được đăng tải"
							/>
						) : (
							<NewsScrollArea fillHeight disableMaxHeight>
								<Stack spacing={1.75}>
									{news.map((item) => (
										<NewsItem key={item.id} data={item} onClick={createItemClickHandler("news", item)} />
									))}
								</Stack>
							</NewsScrollArea>
						)}
					</SectionCard>
				);
			}
			default:
				return null;
		}
	};

	return (
		<DashboardRoot>
			<DashboardContainer>
				<div style={{ marginBottom: 24 }}>
					<DashboardGreetingBanner
						alertCount={pendingApprovalCount}
						alertSubText={pendingApprovalSubText}
						onAlertClick={handleViewAllTasks}
					/>
				</div>
				<DragDropContext onDragEnd={onDragEnd}>
					<Droppable droppableId="stats" direction="horizontal" type="STAT">
						{(provided) => (
							<StyleGridDashboard
								ref={provided.innerRef}
								{...provided.droppableProps}
								mb={3}
							>
								{(layout.statOrder?.length > 0 ? layout.statOrder.map(id => stats.find(s => s.id === id)) : stats).filter(Boolean).map((item, index) => (
									<Draggable key={item.id} draggableId={`stat-${item.id}`} index={index}>
										{(provided, snapshot) => (
											<NormalStatGridItem
												ref={provided.innerRef}
												{...provided.draggableProps}
												snapshot={snapshot}
												dndStyle={provided.draggableProps.style}
											>
												<StatCard
													data={item}
													onStatBlockClick={handleStatBlockClick}
													dragHandleNode={
														<NormalDragHandleWrapper
															{...provided.dragHandleProps}
															title="Kéo & Thả"
														>
															<DragHandleIcon />
														</NormalDragHandleWrapper>
													}
												/>
											</NormalStatGridItem>
										)}
									</Draggable>
								))}
								{provided.placeholder}
							</StyleGridDashboard>
						)}
					</Droppable>

					<Grid container spacing={3}>
						<Grid item xs={12} md={6}>
							<Droppable droppableId="columnLeft" type="BLOCK">
								{(provided) => (
									<DroppableContainer
										spacing={3}
										ref={provided.innerRef}
										{...provided.droppableProps}
									>
										{layout.columnLeft.map((id, index) => (
											<Draggable key={id} draggableId={id} index={index}>
												{(provided) => (
													<div
														ref={provided.innerRef}
														{...provided.draggableProps}
													>
														{renderBlock(id,
															<NormalDragHandleWrapper
																{...provided.dragHandleProps}
																title="Kéo & Thả để di chuyển"
															>
																<DragHandleIcon />
															</NormalDragHandleWrapper>
														)}
													</div>
												)}
											</Draggable>
										))}
										{provided.placeholder}
									</DroppableContainer>
								)}
							</Droppable>
						</Grid>

						<Grid item xs={12} md={6}>
							<Droppable droppableId="columnRight" type="BLOCK">
								{(provided) => (
									<DroppableContainer
										spacing={3}
										ref={provided.innerRef}
										{...provided.droppableProps}
									>
										{layout.columnRight.map((id, index) => (
											<Draggable key={id} draggableId={id} index={index}>
												{(provided) => (
													<div
														ref={provided.innerRef}
														{...provided.draggableProps}
													>
														{renderBlock(id,
															<NormalDragHandleWrapper
																{...provided.dragHandleProps}
																title="Kéo & Thả để di chuyển"
															>
																<DragHandleIcon />
															</NormalDragHandleWrapper>
														)}
													</div>
												)}
											</Draggable>
										))}
										{provided.placeholder}
									</DroppableContainer>
								)}
							</Droppable>
						</Grid>
					</Grid>
				</DragDropContext>

				{statDetailJobDialogOpen && (
					<StatCardDetailDialog
						open={statDetailJobDialogOpen}
						onClose={handleCloseStatDetailDialog}
						statBlock={selectedStatBlock}
						isNormal
					/>
				)}

			</DashboardContainer>
		</DashboardRoot>
	);
};

EmployeeDashboard.propTypes = {
	data: PropTypes.object,
	initialLayout: PropTypes.object,
	onLayoutChange: PropTypes.func,
};
export default EmployeeDashboard;
