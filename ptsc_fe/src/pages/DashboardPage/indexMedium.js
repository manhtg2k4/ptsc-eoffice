import React, { useCallback, useEffect } from "react";
import LeadDashboard from "./layoutMedium";
// import dashboardMediumData from "./dashboardMediumData";
import { useDispatch, useSelector } from "react-redux";
import { safeDispatch } from "@utils/reduxHelper";
import {
	getConfigDashboard,
	patchConfigDashboard,
	getDataDashboardMediumAlerts,
	getDataDashboardMediumApprovals,
	getDataDashboardMediumApprovalsList,
	getDataDashboardMediumDocuments,
	getDataDashboardMediumEmployeeStatus,
	getDataDashboardMediumHeatmap,
	getDataDashboardMediumMeetings,
	getDataDashboardMediumNews,
	getDataDashboardMediumProjects,
	getDataDashboardMediumStats,
	getDataDashboardMediumUpcomingEvents,
	getDataDashboardMediumUtilityRequests,
} from "@redux/slices/DashboardPage/DashboardPageSlice";
import { useToast } from "@components/common/ToastProvider";

const DashboardPageLead = () => {
	const dispatch = useDispatch();
	const toast = useToast();
	const {
		dataDashboardMediumAlerts,
		dataDashboardMediumStats,
		dataDashboardMediumEmployeeStatus,
		dataDashboardMediumApprovals,
		dataDashboardMediumApprovalsList,
		approvalsMediumListPage,
		approvalsMediumListLowestPage,
		approvalsMediumListHighestPage,
		approvalsMediumListLoadedPages,
		approvalsMediumListHasMore,
		approvalsMediumListHasMoreUp,
		approvalsMediumListLoading,
		dataDashboardMediumDocuments,
		dataDashboardMediumHeatmap,
		dataDashboardMediumProjects,
		dataDashboardMediumMeetings,
		dataDashboardMediumUpcomingEvents,
		dataDashboardMediumUtilityRequests,
		dataDashboardMediumNews,
		dataDashboardConfig,
	} = useSelector((state) => state.dashboardPage);

	const fetchData = useCallback(async () => {
		await dispatch(getConfigDashboard());
		// Nhóm 1
		await Promise.all([
			safeDispatch(dispatch, getDataDashboardMediumAlerts()),
			safeDispatch(dispatch, getDataDashboardMediumStats()),
			safeDispatch(dispatch, getDataDashboardMediumEmployeeStatus()),
			safeDispatch(dispatch, getDataDashboardMediumApprovals()),
			safeDispatch(dispatch, getDataDashboardMediumProjects()),
		]);
		
		// Nhóm 2
		await Promise.all([
			safeDispatch(dispatch, getDataDashboardMediumDocuments()),
			safeDispatch(dispatch, getDataDashboardMediumHeatmap()),
			safeDispatch(dispatch, getDataDashboardMediumMeetings()),
			safeDispatch(dispatch, getDataDashboardMediumUpcomingEvents()),
			safeDispatch(dispatch, getDataDashboardMediumUtilityRequests()),
			safeDispatch(dispatch, getDataDashboardMediumNews()),
		]);
	}, [dispatch]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const handleLoadMoreApprovals = useCallback(async (page, direction = "down") => {
		if (approvalsMediumListLoading) return;

		let targetPage = page;
		if (!targetPage) {
			if (direction === "down" && approvalsMediumListHasMore) {
				targetPage = approvalsMediumListHighestPage + 1;
			} else if (direction === "up" && approvalsMediumListHasMoreUp) {
				targetPage = approvalsMediumListLowestPage - 1;
			} else {
				return;
			}
		}

		if (targetPage < 1) return;
		if (approvalsMediumListLoadedPages.includes(targetPage)) return;

		try {
			await dispatch(getDataDashboardMediumApprovalsList({ page: targetPage, limit: 8, direction })).unwrap();
		} catch (error) {
			logger.log("Lỗi khi tải thêm danh sách chờ phê duyệt Medium:", error);
		}
	}, [
		dispatch,
		approvalsMediumListLoading,
		approvalsMediumListHasMore,
		approvalsMediumListHasMoreUp,
		approvalsMediumListHighestPage,
		approvalsMediumListLowestPage,
		approvalsMediumListLoadedPages
	]);



	// const handleLayoutChange = useCallback((newLayout) => {
	// 	dispatch(patchConfigDashboard(newLayout));
	// }, [dispatch]);

	const handleLayoutChange = useCallback(async (newLayout) => {
		try {
			await dispatch(patchConfigDashboard(newLayout)).unwrap();
			toast("Cập nhật cấu hình Dashboard thành công!", "success");
		} catch (error) {
			const messageError =
				error?.response?.data?.message ||
				error.message ||
				"Cập nhật cấu hình Dashboard thất bại!";
			toast(messageError, "error");
			logger.log("Cập nhật cấu hình Dashboard thất bại!:", error);
		}
	}, [dispatch, toast]);

	const dashboardData = React.useMemo(() => ({
		alerts: dataDashboardMediumAlerts,
		stats: dataDashboardMediumStats,
		employeeStatus: dataDashboardMediumEmployeeStatus,
		approvals: dataDashboardMediumApprovals,
		approvalsList: dataDashboardMediumApprovalsList,
		approvalsListPage: approvalsMediumListPage,
		approvalsListLowestPage: approvalsMediumListLowestPage,
		approvalsListHighestPage: approvalsMediumListHighestPage,
		approvalsListLoadedPages: approvalsMediumListLoadedPages,
		approvalsListHasMore: approvalsMediumListHasMore,
		approvalsListHasMoreUp: approvalsMediumListHasMoreUp,
		approvalsListLoading: approvalsMediumListLoading,
		documents: dataDashboardMediumDocuments,
		heatmap: dataDashboardMediumHeatmap,
		projects: dataDashboardMediumProjects,
		meetings: dataDashboardMediumMeetings,
		upcomingEvents: dataDashboardMediumUpcomingEvents,
		utilityRequests: dataDashboardMediumUtilityRequests,
		news: dataDashboardMediumNews,
	}), [
		dataDashboardMediumAlerts,
		dataDashboardMediumStats,
		dataDashboardMediumEmployeeStatus,
		dataDashboardMediumApprovals,
		dataDashboardMediumApprovalsList,
		approvalsMediumListPage,
		approvalsMediumListLowestPage,
		approvalsMediumListHighestPage,
		approvalsMediumListLoadedPages,
		approvalsMediumListHasMore,
		approvalsMediumListHasMoreUp,
		approvalsMediumListLoading,
		dataDashboardMediumDocuments,
		dataDashboardMediumHeatmap,
		dataDashboardMediumProjects,
		dataDashboardMediumMeetings,
		dataDashboardMediumUpcomingEvents,
		dataDashboardMediumUtilityRequests,
		dataDashboardMediumNews,
	]);

	return (
		<LeadDashboard
			data={dashboardData}
			initialLayout={dataDashboardConfig || {}}
			onLayoutChange={handleLayoutChange}
			onLoadMoreApprovals={handleLoadMoreApprovals}
		/>
	);
};

// DashboardPage.propTypes = {}

export default DashboardPageLead;
