import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import DragHandleIcon from "@mui/icons-material/DragHandle";

import { DashboardContainer, DashboardRoot } from "@styles/DashboardPage.styles";
import {
	DraggableWrapper,
	GhostContainer,
	HandleNode,
	PremiumGridThree,
	PremiumGridTwo,
	PremiumKpiGrid,
	PremiumMainStack,
} from "@styles/DashboardPagePremium.styles";

import PremiumApprovalCard from "./components/PremiumApprovalCard";
import PremiumDepartmentPerformanceCard from "./components/PremiumDepartmentPerformanceCard";
import PremiumDepartmentTasksCard from "./components/PremiumDepartmentTasksCard";
import PremiumDocumentsCard from "./components/PremiumDocumentsCard";
import PremiumEventsCard from "./components/PremiumEventsCard";
import PremiumHrCard from "./components/PremiumHrCard";
import PremiumMeetingsCard from "./components/PremiumMeetingsCard";
import PremiumNewsCard from "./components/PremiumNewsCard";
import PremiumUtilityRequestsCard from "./components/PremiumUtilityRequestsCard";
import PremiumWorkloadProjectsCard from "./components/PremiumWorkloadProjectsCard";
import StatCard from "./components/StatCard";
import StatCardDetailDialog from "./components/StatCardDetailDialog";
import DashboardGreetingBanner from "./components/DashboardGreetingBanner";
import { arrPathBookCar, arrPathFeedBack, arrPathMeeting, useMenuPermission, useNavigateTo, useNavigateToArr } from "./ultilDashboard";
import { ROUTES } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/routes";
import { getComponentByKey } from "@builder-table/components/componentRegistry";
import { openDetailDialog } from "@components/GlobalDialogPortal";
import {
	linkToCompanyWidePersonnel,
	linkToDepartmentPerformance,
	// linkToEvents,
	linkToIncomingDocGd,
	linkToNews,
	linkToOutgoingDocGd,
	linkToPassport,
	linkToTasks
} from "@/variable";
import { useToast } from "@components/common/ToastProvider";

const BLOCK_LABELS = {
	departmentPerformance: "Hiệu suất phòng ban",
	workloadProjects: "Workload & Dự án",
	approvals: "Phê duyệt cấp TGĐ",
	documents: "Điều hành văn bản",
	departmentTasks: "Công việc theo phòng ban",
	hrOverview: "Nhân sự toàn Công ty",
	meetings: "Lịch họp & Sự kiện",
	utilityRequests: "Yêu cầu tiện ích",
	news: "Tin tức nội bộ",
	events: "Sự kiện sắp tới",
};

const DragGhost = ({ provided, label }) => (
	<GhostContainer
		ref={provided.innerRef}
		{...provided.draggableProps}
		{...provided.dragHandleProps}
		dndStyle={provided.draggableProps.style}
	>
		<DragHandleIcon />
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
	row0: ["departmentPerformance", "workloadProjects"],
	row1: ["approvals", "documents"],
	row2: ["departmentTasks", "hrOverview", "meetings"],
	row3: ["utilityRequests", "news", "events"],
};

// ─── Main component ──────────────────────────────────────────────────────────

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
		row2: allBlocks.slice(4, 7),
		row3: allBlocks.slice(7),
	};
};

const mapToExternalLayout = (internalLayout) => ({
	columnLeft: internalLayout.row0 || [],
	columnRight: [
		...(internalLayout.row1 || []),
		...(internalLayout.row2 || []),
		...(internalLayout.row3 || []),
	],
	statOrder: internalLayout.statOrder || [],
});

const BlockWrapper = React.memo(({
	id, dragHandleProps, data, listProps, onLoadMoreApprovals,
	onItemClick, onItemClickPerf, onActionClick
}) => {
	const dragHandleNode = (
		<HandleNode {...dragHandleProps}>
			<DragHandleIcon />
		</HandleNode>
	);
	switch (id) {
		case "departmentPerformance":
			return <PremiumDepartmentPerformanceCard data={data} onItemClick={onItemClickPerf} dragHandleNode={dragHandleNode} />;
		case "workloadProjects":
			return <PremiumWorkloadProjectsCard data={data} onItemClick={onItemClick} dragHandleNode={dragHandleNode} />;
		case "approvals":
			return (
				<div id="ceo-approvals-section">
					<PremiumApprovalCard data={data} listProps={listProps} onLoadMore={onLoadMoreApprovals} onItemClick={onItemClick} dragHandleNode={dragHandleNode} />
				</div>
			);
		case "documents":
			return <PremiumDocumentsCard data={data} onItemClick={onItemClick} dragHandleNode={dragHandleNode} />;
		case "departmentTasks":
			return <PremiumDepartmentTasksCard data={data} onItemClick={onItemClick} dragHandleNode={dragHandleNode} />;
		case "hrOverview":
			return <PremiumHrCard data={data} onActionClick={onActionClick} onItemClick={onItemClick} dragHandleNode={dragHandleNode} />;
		case "meetings":
			return <PremiumMeetingsCard data={data} onActionClick={onActionClick} onItemClick={onItemClick} dragHandleNode={dragHandleNode} />;
		case "utilityRequests":
			return <PremiumUtilityRequestsCard data={data} onItemClick={onItemClick} dragHandleNode={dragHandleNode} />;
		case "news":
			return <PremiumNewsCard data={data} onActionClick={onActionClick} onItemClick={onItemClick} dragHandleNode={dragHandleNode} />;
		case "events":
			return <PremiumEventsCard data={data} onActionClick={onActionClick} onItemClick={onItemClick} dragHandleNode={dragHandleNode} />;
		default:
			return null;
	}
}, (prev, next) => {
	return (
		prev.id === next.id &&
		prev.data === next.data &&
		prev.listProps === next.listProps &&
		prev.onItemClick === next.onItemClick &&
		prev.onItemClickPerf === next.onItemClickPerf &&
		prev.onActionClick === next.onActionClick &&
		prev.onLoadMoreApprovals === next.onLoadMoreApprovals
	);
});
BlockWrapper.displayName = "BlockWrapper";

const BossDashboard = ({ data = {}, initialLayout, onLayoutChange, onLoadMoreApprovals }) => {
	const navigateToArr = useNavigateToArr();
	const navigateTo = useNavigateTo();
	const toast = useToast();
	const { checkPermission } = useMenuPermission();
	const safeData = data && typeof data === "object" ? data : {};
	const alerts = useMemo(() => (Array.isArray(safeData.alerts) ? safeData.alerts : []), [safeData.alerts]);
	const stats = useMemo(() => (Array.isArray(safeData.stats) ? safeData.stats : []), [safeData.stats]);
	const statItems = useMemo(
		() => stats.filter((item) => !Object.prototype.hasOwnProperty.call(item || {}, "isBanner")),
		[stats]
	);
	const actions = useMemo(() => (safeData.actions && typeof safeData.actions === "object" ? safeData.actions : {}), [safeData.actions]);

	const departmentPerformance = useMemo(
		() => (safeData.departmentPerformance && typeof safeData.departmentPerformance === "object" ? safeData.departmentPerformance : {}),
		[safeData.departmentPerformance]
	);
	const workloadProjects = useMemo(
		() => (safeData.workloadProjects && typeof safeData.workloadProjects === "object" ? safeData.workloadProjects : {}),
		[safeData.workloadProjects]
	);
	const approvals = useMemo(
		() => (safeData.approvals && typeof safeData.approvals === "object" ? safeData.approvals : {}),
		[safeData.approvals]
	);
	const approvalsList = useMemo(
		() => (Array.isArray(safeData.approvalsList) ? safeData.approvalsList : []),
		[safeData.approvalsList]
	);
	const documents = useMemo(
		() => (safeData.documents && typeof safeData.documents === "object" ? safeData.documents : {}),
		[safeData.documents]
	);
	const departmentTasks = useMemo(() => (Array.isArray(safeData.departmentTasks) ? safeData.departmentTasks : []), [safeData.departmentTasks]);
	const hrOverview = useMemo(
		() => (safeData.hrOverview && typeof safeData.hrOverview === "object" && safeData.hrOverview) || (safeData.hrStats && typeof safeData.hrStats === "object" && safeData.hrStats) || {},
		[safeData.hrOverview, safeData.hrStats]
	);
	const meetings = useMemo(() => (Array.isArray(safeData.meetings) ? safeData.meetings : []), [safeData.meetings]);
	const utilityRequests = useMemo(
		() => (safeData.utilityRequests && typeof safeData.utilityRequests === "object" && safeData.utilityRequests) || (safeData.utilities && typeof safeData.utilities === "object" && safeData.utilities) || {},
		[safeData.utilityRequests, safeData.utilities]
	);
	const news = useMemo(() => (Array.isArray(safeData.news) ? safeData.news : []), [safeData.news]);
	const events = useMemo(() => (Array.isArray(safeData.events) ? safeData.events : []), [safeData.events]);

	const [layout, setLayout] = useState(() => mapToInternalLayout(initialLayout));
	const isFirstRender = useRef(true);
	const dragHappened = useRef(false);

	const [selectedStatBlock, setSelectedStatBlock] = useState(null);
	const [statDetailJobDialogOpen, setStatDetailJobDialogOpen] = useState(false);

	const handleStatBlockClick = useCallback((blockInfo, parentStat) => {
		if (parentStat?.id === "company-tasks" || parentStat?.id === "company-documents") {
			setSelectedStatBlock({ ...blockInfo, parentCard: parentStat });
			setStatDetailJobDialogOpen(true);
		} else if (parentStat?.id === "ceo-approvals") {
			const element = document.getElementById("ceo-approvals-section");
			if (element) {
				element.scrollIntoView({ behavior: "smooth", block: "start" });
			}
		} else if (parentStat?.id === "total-employees") {
			navigateTo(linkToCompanyWidePersonnel);
		}
	}, [navigateTo]);

	const handleCloseStatDetailDialog = useCallback(() => {
		setStatDetailJobDialogOpen(false);
		setSelectedStatBlock(null);
	}, []);

	const performanceSummary = safeData.performanceSummary && typeof safeData.performanceSummary === "object" ? safeData.performanceSummary : {};

	const bannerStat = useMemo(
		() => stats.find((item) => item && typeof item === "object" && item.isBanner === true),
		[stats]
	);

	const extractPercentValue = useCallback((input) => {
		if (typeof input === "number" && Number.isFinite(input)) return input;
		if (typeof input !== "string") return undefined;
		const match = input.match(/-?\d+(?:[.,]\d+)?/);
		if (!match) return undefined;
		const parsed = Number.parseFloat(match[0].replace(",", "."));
		return Number.isFinite(parsed) ? parsed : undefined;
	}, []);

	const bannerTargetTag = useMemo(() => {
		if (!Array.isArray(bannerStat?.premiumTags)) return undefined;
		return (
			bannerStat.premiumTags.find((tag) => /muc tieu|mục tiêu/i.test(tag?.label || "")) ||
			bannerStat.premiumTags.find((tag) => tag?.type === "neutral")
		);
	}, [bannerStat]);

	const bannerTrendTag = useMemo(() => {
		if (!Array.isArray(bannerStat?.premiumTags)) return undefined;
		return bannerStat.premiumTags.find((tag) => tag?.type === "up" || tag?.type === "down") || bannerStat.premiumTags[0];
	}, [bannerStat]);

	const bannerCompletedPct = useMemo(
		() => extractPercentValue(bannerStat?.value),
		[bannerStat, extractPercentValue]
	);

	const bannerGoalPct = useMemo(
		() => extractPercentValue(bannerTargetTag?.label),
		[bannerTargetTag, extractPercentValue]
	);

	const bannerTrend = useMemo(() => {
		const trendValue = extractPercentValue(bannerTrendTag?.label);
		if (trendValue === undefined) return undefined;
		if (bannerTrendTag?.type === "down") return -Math.abs(trendValue);
		if (bannerTrendTag?.type === "up") return Math.abs(trendValue);
		if (/▼|-/.test(bannerTrendTag?.label || "")) return -Math.abs(trendValue);
		return Math.abs(trendValue);
	}, [bannerTrendTag, extractPercentValue]);

	const bannerTrendLabel = useMemo(() => {
		const rawLabel = bannerTrendTag?.label;
		if (typeof rawLabel !== "string") return undefined;
		const cleaned = rawLabel
			.replace(/[▲▼]/g, "")
			.replace(/-?\d+(?:[.,]\d+)?\s*%?/g, "")
			.trim();
		return cleaned || undefined;
	}, [bannerTrendTag]);

	useEffect(() => {
		if (initialLayout) setLayout(mapToInternalLayout(initialLayout));
	}, [initialLayout]);

	useEffect(() => {
		if (isFirstRender.current) { isFirstRender.current = false; return; }
		const timer = setTimeout(() => {
			const outputLayout = mapToExternalLayout(layout);
			// if (typeof logger !== "undefined") {
			// 	logger.log(">>> DỮ LIỆU LAYOUT PREMIUM CUỐI CÙNG (GỬI LÊN API):", outputLayout);
			// }
			if (dragHappened.current && typeof onLayoutChange === "function") onLayoutChange(outputLayout);
		}, 1000);
		return () => clearTimeout(timer);
	}, [layout, onLayoutChange]);

	useEffect(() => {
		const validStatIds = statItems.map((s) => s.id);
		setLayout((prev) => {
			const currentOrder = Array.isArray(prev.statOrder) ? prev.statOrder : [];
			const trimmedOrder = currentOrder.filter((id) => validStatIds.includes(id));
			const missingIds = validStatIds.filter((id) => !trimmedOrder.includes(id));
			const nextOrder = [...trimmedOrder, ...missingIds];

			const isSameLength = currentOrder.length === nextOrder.length;
			const isSameOrder = isSameLength && currentOrder.every((id, idx) => id === nextOrder[idx]);
			if (isSameOrder) return prev;

			return { ...prev, statOrder: nextOrder };
		});
	}, [statItems]);

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

	const handleViewBookACar = useCallback(() => {
		if (!checkPermission(arrPathBookCar)) {
		// if (!checkPermission(linkToBookACarManagement)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(arrPathBookCar);
		// navigateToArr(linkToBookACarManagement);
	}, [navigateToArr, toast, checkPermission]);

	const handleViewPassport = useCallback(() => {
		if (!checkPermission(linkToPassport)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(linkToPassport);
	}, [navigateToArr, toast, checkPermission]);

	const handleViewFeedback = useCallback(() => {
		if (!checkPermission(arrPathFeedBack)) {
		// if (!checkPermission(linkToFeedbackGd)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(arrPathFeedBack);
		// navigateToArr(linkToFeedbackGd);
	}, [navigateToArr, toast, checkPermission]);

	const handleViewAllMeetings = useCallback(() => {
		if (!checkPermission(arrPathMeeting)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(arrPathMeeting, { state: {  defaultTab: 1 } });
	}, [navigateToArr, checkPermission, toast]);

	const handleViewAllEvents = useCallback(() => {
		if (!checkPermission(linkToNews)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateTo(ROUTES.CALENDAR);
	}, [navigateTo, checkPermission, toast]);

	const handleViewAllNews = useCallback(() => {
		if (!checkPermission(linkToNews)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(linkToNews);
	}, [navigateToArr, checkPermission, toast]);

	const handleViewAllUser = useCallback(() => {
		if (!checkPermission(linkToCompanyWidePersonnel)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(`${linkToCompanyWidePersonnel}`);
	}, [navigateToArr, toast, checkPermission]);

	const handleViewAllTasks = useCallback(() => {
		if (!checkPermission(linkToTasks)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(linkToTasks);
	}, [navigateToArr, toast, checkPermission]);

	const handleViewIncomingDoc = useCallback(() => {
		if (!checkPermission(linkToIncomingDocGd)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(linkToIncomingDocGd);
	}, [navigateToArr, toast, checkPermission]);

	const handleViewOutgoingDoc = useCallback(() => {
		if (!checkPermission(linkToOutgoingDocGd)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(linkToOutgoingDocGd);
	}, [navigateToArr, toast, checkPermission]);

	const handleViewPersonalCalendar = useCallback(() => {
		if (!checkPermission(arrPathMeeting)) {
			toast("Bạn không có quyền truy cập chức năng này", "warning");
			return;
		}
		navigateToArr(arrPathMeeting, { state: {  defaultTab: 1 } });
	}, [navigateToArr, toast, checkPermission]);

	const handleItemClick = useCallback((type, item) => {
		let key = item.key;
		// logger.log("key", key)
		// logger.log("type", type)
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
				case "departmentPerformance": key = "VIEW_DEPARTMENT_PERFORMANCE"; break;
				case "workloadProjects": key = "VIEW_WORKLOAD_PROJECTS"; break;
				case "approvals": key = "VIEW_APPROVALS"; break;
				case "documents": key = "VIEW_DOCUMENTS"; break;
				case "departmentTasks": key = "VIEW_DEPARTMENT_TASKS"; break;
				case "hrOverview": key = "VIEW_HR_OVERVIEW"; break;
				case "meetings": key = "VIEW_MEETINGS"; break;
				case "utilityRequests": key = "VIEW_UTILITY_REQUESTS"; break;
				case "news": key = "VIEW_NEWS"; break;
				default: break;
			}
		}

		const recordId = item.recordId || item.id;
		if (key && recordId) {
			if (key === "VIEW_NEWS") {
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

	const createItemClickDepartmentPerformance = useCallback(
		(type, item) => () => {
			// logger.log("itemmmm-2", item)
			const departmentId = item?._id || item?.deptId || item?.departmentId || item?.id;
			if (!departmentId) {
				return;
			}
			const params = new URLSearchParams({
				departmentId,
			});
			navigateToArr(`${linkToDepartmentPerformance}?${params.toString()}`);
		},
		[navigateToArr]
	);

	const listPropsObj = useMemo(() => ({
		list: approvalsList,
		page: safeData.approvalsListPage,
		lowestPage: safeData.approvalsListLowestPage,
		highestPage: safeData.approvalsListHighestPage,
		loadedPages: safeData.approvalsListLoadedPages,
		hasMore: safeData.approvalsListHasMore,
		hasMoreUp: safeData.approvalsListHasMoreUp,
		loading: safeData.approvalsListLoading
	}), [
		approvalsList, safeData.approvalsListPage, safeData.approvalsListLowestPage,
		safeData.approvalsListHighestPage, safeData.approvalsListLoadedPages,
		safeData.approvalsListHasMore, safeData.approvalsListHasMoreUp, safeData.approvalsListLoading
	]);

	const renderBlock = useCallback((id, dragHandleProps) => {
		let blockData = {};
		let onActionClick = undefined;
		switch (id) {
			case "departmentPerformance": blockData = departmentPerformance; break;
			case "workloadProjects": blockData = workloadProjects; break;
			case "approvals": blockData = approvals; break;
			case "documents": blockData = documents; break;
			case "departmentTasks": blockData = departmentTasks; break;
			case "hrOverview": blockData = hrOverview; onActionClick = handleViewAllUser; break;
			case "meetings": blockData = meetings; onActionClick = handleViewAllMeetings; break;
			case "utilityRequests": blockData = utilityRequests; break;
			case "news": blockData = news; onActionClick = handleViewAllNews; break;
			case "events": blockData = events; onActionClick = handleViewAllEvents; break;
			default: break;
		}

		return (
			<BlockWrapper
				id={id}
				dragHandleProps={dragHandleProps}
				data={blockData}
				listProps={id === "approvals" ? listPropsObj : undefined}
				onLoadMoreApprovals={id === "approvals" ? onLoadMoreApprovals : undefined}
				onItemClick={createItemClickHandler}
				onItemClickPerf={createItemClickDepartmentPerformance}
				onActionClick={onActionClick}
			/>
		);
	}, [
		approvals, documents, departmentPerformance, workloadProjects,
		departmentTasks, hrOverview, meetings, utilityRequests, news, events,
		createItemClickHandler, createItemClickDepartmentPerformance,
		handleViewAllUser, handleViewAllMeetings, handleViewAllNews, handleViewAllEvents,
		listPropsObj, onLoadMoreApprovals
	]);

	const orderedStats = layout.statOrder?.length > 0
		? layout.statOrder.map(id => statItems.find(s => s.id === id)).filter(Boolean)
		: statItems;

	const renderBlockClone = useCallback((provided, _snapshot, rubric) => {
		const id = rubric.draggableId;
		return <DragGhost provided={provided} label={BLOCK_LABELS[id] || id} />;
	}, []);

	return (
		<DashboardRoot>
			<DashboardContainer>
				<div style={{ marginBottom: 24 }}>
					<DashboardGreetingBanner
						alerts={alerts}
						alertCount={alerts?.length || 0}
						alertSubText={data?.alertSubText || ""}
						onAlertClick={actions?.onApprovalViewAll}
						showBossPanel
						bossPerformanceLabel={bannerStat?.label || performanceSummary?.label || "Hiệu suất công việc - Toàn CT"}
						bossCompletedPct={bannerCompletedPct ?? performanceSummary?.completedPct}
						bossGoalPct={bannerGoalPct ?? performanceSummary?.goalPct}
						bossTrend={bannerTrend ?? performanceSummary?.trend}
						bossTrendLabel={bannerTrendLabel || performanceSummary?.trendLabel}
					/>
				</div>
				<DragDropContext onDragEnd={onDragEnd}>
					<PremiumMainStack>
						{/* <PremiumAlertBar alerts={alerts} /> */}

						{/* ── Stats row ── */}
						<Droppable droppableId="stats" direction="horizontal" type="STAT">
							{(provided) => (
								<PremiumKpiGrid columnsCount={orderedStats.length} ref={provided.innerRef} {...provided.droppableProps}>
									{orderedStats.map((item, index) => (
										<Draggable key={item.id} draggableId={`stat-${item.id}`} index={index}>
											{(provided) => (
												<div ref={provided.innerRef} {...provided.draggableProps} style={{ ...provided.draggableProps.style, minWidth: 0 }}>
													<StatCard
														data={item}
														variant="premium"
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
								</PremiumKpiGrid>
							)}
						</Droppable>

						{/* ── Row 0: 2 columns ── */}
						<Droppable droppableId="row0" direction="horizontal" type="BLOCK" renderClone={renderBlockClone}>
							{(provided) => (
								<PremiumGridTwo ref={provided.innerRef} {...provided.droppableProps}>
									{(layout.row0 || []).map((id, index) => (
										<Draggable key={id} draggableId={id} index={index}>
											{(provided, snapshot) => (
												<DraggableWrapper ref={provided.innerRef} {...provided.draggableProps} snapshot={snapshot} dndStyle={provided.draggableProps.style}>
													{renderBlock(id, provided.dragHandleProps)}
												</DraggableWrapper>
											)}
										</Draggable>
									))}
									{provided.placeholder}
								</PremiumGridTwo>
							)}
						</Droppable>

						{/* ── Row 1: 2 columns ── */}
						<Droppable droppableId="row1" direction="horizontal" type="BLOCK" renderClone={renderBlockClone}>
							{(provided) => (
								<PremiumGridTwo ref={provided.innerRef} {...provided.droppableProps}>
									{(layout.row1 || []).map((id, index) => (
										<Draggable key={id} draggableId={id} index={index}>
											{(provided, snapshot) => (
												<DraggableWrapper ref={provided.innerRef} {...provided.draggableProps} snapshot={snapshot} dndStyle={provided.draggableProps.style}>
													{renderBlock(id, provided.dragHandleProps)}
												</DraggableWrapper>
											)}
										</Draggable>
									))}
									{provided.placeholder}
								</PremiumGridTwo>
							)}
						</Droppable>

						{/* ── Row 2: 3 columns ── */}
						<Droppable droppableId="row2" direction="horizontal" type="BLOCK" renderClone={renderBlockClone}>
							{(provided) => (
								<PremiumGridThree ref={provided.innerRef} {...provided.droppableProps}>
									{(layout.row2 || []).map((id, index) => (
										<Draggable key={id} draggableId={id} index={index}>
											{(provided, snapshot) => (
												<DraggableWrapper ref={provided.innerRef} {...provided.draggableProps} snapshot={snapshot} dndStyle={provided.draggableProps.style}>
													{renderBlock(id, provided.dragHandleProps)}
												</DraggableWrapper>
											)}
										</Draggable>
									))}
									{provided.placeholder}
								</PremiumGridThree>
							)}
						</Droppable>

						{/* ── Row 3: 3 columns ── */}
						<Droppable droppableId="row3" direction="horizontal" type="BLOCK" renderClone={renderBlockClone}>
							{(provided) => (
								<PremiumGridThree ref={provided.innerRef} {...provided.droppableProps}>
									{(layout.row3 || []).map((id, index) => (
										<Draggable key={id} draggableId={id} index={index}>
											{(provided, snapshot) => (
												<DraggableWrapper ref={provided.innerRef} {...provided.draggableProps} snapshot={snapshot} dndStyle={provided.draggableProps.style}>
													{renderBlock(id, provided.dragHandleProps)}
												</DraggableWrapper>
											)}
										</Draggable>
									))}
									{provided.placeholder}
								</PremiumGridThree>
							)}
						</Droppable>

					</PremiumMainStack>
				</DragDropContext>
			</DashboardContainer>

			{statDetailJobDialogOpen && (
				<StatCardDetailDialog
					open={statDetailJobDialogOpen}
					onClose={handleCloseStatDetailDialog}
					statBlock={selectedStatBlock}
				/>
			)}
		</DashboardRoot>
	);
};

BossDashboard.propTypes = {
	data: PropTypes.object,
	initialLayout: PropTypes.object,
	onLayoutChange: PropTypes.func,
	onLoadMoreApprovals: PropTypes.func,
};

export default BossDashboard;
