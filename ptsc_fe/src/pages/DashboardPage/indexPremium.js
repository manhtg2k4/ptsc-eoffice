import React, { useCallback, useEffect } from "react";
import BossDashboard from "./layoutPremium";
import { useDispatch, useSelector } from "react-redux";
import { safeDispatch } from "@utils/reduxHelper";
import {
	getConfigDashboard,
	patchConfigDashboard,
	getDataDashboardPremiumAlerts,
	getDataDashboardPremiumCeoApprovals,
	getDataDashboardPremiumCeoApprovalsList,
	getDataDashboardPremiumDepartmentPerformance,
	getDataDashboardPremiumDepartmentTasks,
	getDataDashboardPremiumDocuments,
	getDataDashboardPremiumEvents,
	getDataDashboardPremiumHrStats,
	getDataDashboardPremiumMeetings,
	getDataDashboardPremiumNews,
	getDataDashboardPremiumStats,
	getDataDashboardPremiumUtilities,
	getDataDashboardPremiumWorkloadProjects,
} from "@redux/slices/DashboardPage/DashboardPageSlice";
import { useToast } from "@components/common/ToastProvider";

const DashboardPageBoss = () => {
	const dispatch = useDispatch();
	const toast = useToast();
	const {
		dataDashboardPremiumAlerts,
		dataDashboardPremiumStats,
		dataDashboardPremiumDepartmentPerformance,
		dataDashboardPremiumWorkloadProjects,
		dataDashboardPremiumCeoApprovals,
		dataDashboardPremiumCeoApprovalsList,
		approvalsListPage,
		approvalsListLowestPage,
		approvalsListHighestPage,
		approvalsListLoadedPages,
		approvalsListHasMore,
		approvalsListHasMoreUp,
		approvalsListLoading,
		dataDashboardPremiumDocuments,
		dataDashboardPremiumDepartmentTasks,
		dataDashboardPremiumUtilities,
		dataDashboardPremiumHrStats,
		dataDashboardPremiumMeetings,
		dataDashboardPremiumNews,
		dataDashboardPremiumEvents,
		dataDashboardConfig,
	} = useSelector((state) => state.dashboardPage);

	const fetchData = useCallback(async () => {
		await dispatch(getConfigDashboard());
		await Promise.all([
			safeDispatch(dispatch, getDataDashboardPremiumAlerts()),
			safeDispatch(dispatch, getDataDashboardPremiumStats()),
			safeDispatch(dispatch, getDataDashboardPremiumDepartmentPerformance()),
			safeDispatch(dispatch, getDataDashboardPremiumWorkloadProjects()),
		]);
		await Promise.all([
			safeDispatch(dispatch, getDataDashboardPremiumCeoApprovals()),
			safeDispatch(dispatch, getDataDashboardPremiumDocuments()),
			safeDispatch(dispatch, getDataDashboardPremiumDepartmentTasks()),
			safeDispatch(dispatch, getDataDashboardPremiumUtilities()),
		]);
		await Promise.all([
			safeDispatch(dispatch, getDataDashboardPremiumHrStats()),
			safeDispatch(dispatch, getDataDashboardPremiumMeetings()),
			safeDispatch(dispatch, getDataDashboardPremiumNews()),
			safeDispatch(dispatch, getDataDashboardPremiumEvents()),
		]);
	}, [dispatch]);

	const handleLoadMoreApprovals = useCallback((page, direction = "down") => {
		safeDispatch(dispatch, getDataDashboardPremiumCeoApprovalsList({ page, limit: 8, direction }));
	}, [dispatch]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

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

	return (
		<BossDashboard
			data={{
				alerts: dataDashboardPremiumAlerts,
				stats: dataDashboardPremiumStats,
				departmentPerformance: dataDashboardPremiumDepartmentPerformance,
				workloadProjects: dataDashboardPremiumWorkloadProjects,
				approvals: dataDashboardPremiumCeoApprovals,
				approvalsList: dataDashboardPremiumCeoApprovalsList,
				approvalsListPage,
				approvalsListLowestPage,
				approvalsListHighestPage,
				approvalsListLoadedPages,
				approvalsListHasMore,
				approvalsListHasMoreUp,
				approvalsListLoading,
				documents: dataDashboardPremiumDocuments,
				departmentTasks: dataDashboardPremiumDepartmentTasks,
				utilities: dataDashboardPremiumUtilities,
				hrStats: dataDashboardPremiumHrStats,
				meetings: dataDashboardPremiumMeetings,
				news: dataDashboardPremiumNews,
				events: dataDashboardPremiumEvents,
			}}
			initialLayout={dataDashboardConfig || {}}
			onLayoutChange={handleLayoutChange}
			onLoadMoreApprovals={handleLoadMoreApprovals}
		/>
	);
};

// DashboardPage.propTypes = {}

export default DashboardPageBoss;
