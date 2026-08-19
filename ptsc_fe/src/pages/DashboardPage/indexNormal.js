import React, { useCallback, useEffect } from "react";
import EmployeeDashboard from "./layoutNormal";
import { useDispatch, useSelector } from "react-redux";
import {
	getConfigDashboard,
	patchConfigDashboard,
	getDataDashboardNormalEvents,
	getDataDashboardNormalMeetings,
	getDataDashboardNormalNews,
	getDataDashboardNormalProjects,
	getDataDashboardNormalQuickActions,
	getDataDashboardNormalStats,
	getDataDashboardNormalTaskOverview,
} from "@redux/slices/DashboardPage/DashboardPageSlice";
import { safeDispatch } from "@utils/reduxHelper";
import { useToast } from "@components/common/ToastProvider";

const normalizeTaskOverview = (taskOverview) => {
	const safeTaskOverview =
		taskOverview && typeof taskOverview === "object" ? taskOverview : {};

	return {
		...safeTaskOverview,
		performance:
			safeTaskOverview.performance &&
				typeof safeTaskOverview.performance === "object"
				? safeTaskOverview.performance
				: {},
		sourceChart:
			safeTaskOverview.sourceChart &&
				typeof safeTaskOverview.sourceChart === "object"
				? safeTaskOverview.sourceChart
				: {},
		roleChart:
			safeTaskOverview.roleChart &&
				typeof safeTaskOverview.roleChart === "object"
				? safeTaskOverview.roleChart
				: {},
	};
};

const normalizeProjects = (projects) => {
	if (!projects || typeof projects !== "object" || Array.isArray(projects)) {
		return {
			summary: {},
			list: [],
		};
	}

	return {
		...projects,
		summary:
			projects.summary && typeof projects.summary === "object"
				? projects.summary
				: {},
		list: Array.isArray(projects.list) ? projects.list : [],
	};
};

const DashboardPageUser = () => {
	const dispatch = useDispatch();
	const toast = useToast();
	const {
		dataDashboardNormalStats,
		dataDashboardNormalTaskOverview,
		dataDashboardNormalProjects,
		dataDashboardNormalQuickActions,
		dataDashboardNormalMeetings,
		dataDashboardNormalEvents,
		dataDashboardNormalNews,
		dataDashboardConfig,
		loading,
	} = useSelector((state) => state.dashboardPage);

	const fetchData = useCallback(async () => {
		await dispatch(getConfigDashboard())
		await Promise.all([
			safeDispatch(dispatch, getDataDashboardNormalStats()),
			safeDispatch(dispatch, getDataDashboardNormalTaskOverview()),
			safeDispatch(dispatch, getDataDashboardNormalProjects()),
		]);
		await Promise.all([
			safeDispatch(dispatch, getDataDashboardNormalQuickActions()),
			safeDispatch(dispatch, getDataDashboardNormalMeetings()),
			safeDispatch(dispatch, getDataDashboardNormalEvents()),
			safeDispatch(dispatch, getDataDashboardNormalNews()),
		]);
	}, [dispatch]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const dashboardDataNormalized = {
		stats: Array.isArray(dataDashboardNormalStats)
			? dataDashboardNormalStats
			: [],
		taskOverview: normalizeTaskOverview(dataDashboardNormalTaskOverview),
		projects: normalizeProjects(dataDashboardNormalProjects),
		quickActions: dataDashboardNormalQuickActions && typeof dataDashboardNormalQuickActions === "object"
			? dataDashboardNormalQuickActions
			: {},
		meetings: Array.isArray(dataDashboardNormalMeetings)
			? dataDashboardNormalMeetings
			: [],
		events: Array.isArray(dataDashboardNormalEvents)
			? dataDashboardNormalEvents
			: [],
		news: Array.isArray(dataDashboardNormalNews) ? dataDashboardNormalNews : [],
	};

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
		<EmployeeDashboard
			data={dashboardDataNormalized}
			initialLayout={dataDashboardConfig || {}}
			onLayoutChange={handleLayoutChange}
			loading={loading}
		/>
	);
};

// DashboardPage.propTypes = {}

export default DashboardPageUser;
