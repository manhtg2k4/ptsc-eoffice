import React, { memo, useCallback, useEffect, useMemo, useState, useRef } from "react";
import PropTypes from "prop-types";
import { SwapHoriz, Group } from "@mui/icons-material";
import { useMediaQuery, useTheme, Drawer } from "@mui/material";
import { styled } from "@mui/material/styles";

import { useDispatch, useSelector } from "react-redux";
import {
	fetchOrganizationUnits,
} from "@redux/slices/Directive/Directive";
import { updateIncomingDocument } from "@redux/slices/configSlice";
import { removeVietnameseTones } from "@utils/Common/Common";
import { flattenUnits } from "@utils/utils";
import ListUnitsUserSubmitProposal from "./ListUnitsUserSubmitProposal";
import { useForm } from "react-hook-form";
import withSharedComponents from "@components/WrapperComponent";
import RenderTableTreeSubmitProposal from "./RenderTableTreeSubmitProposal";
import { API_PROCCESS_DOCUMENT } from "@EnvironmentFile/constants/ulrConfigNew";
import { API_GET_LIST_USERS } from "@EnvironmentFile/constants/urlConfig";

import dayjs from "dayjs";
import axiosInstance from "@utils/axiosInstance";
import { getSideBarMenu } from "@redux/slices/ManagerMenu/managementMenuSlice";
import { SkyBox, SkyTypography, SkyIconButton } from "@styles/SkyStyles";

const PremiumDrawer = styled(Drawer, {
	shouldForwardProp: (prop) => prop !== "isContained" && prop !== "inline",
})(({ theme, isContained, inline }) => ({
	...(isContained && {
		position: "absolute",
		inset: 0,
	}),
	...(inline && {
		position: "relative",
		width: "100%",
		height: "100%",
	}),
	"& .MuiBackdrop-root": {
		...(isContained && {
			position: "absolute",
			inset: 0,
			backgroundColor: "transparent",
		}),
	},
	"& .MuiDrawer-paper": {
		width: isContained ? "calc(100% - 34.5%)" : "1100px",
		maxWidth: "100%",
		height: "100%",
		backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#fff",
		borderLeft: "none",
		boxShadow: isContained ? "none" : "-10px 0 25px -5px rgba(0,0,0,0.1), -10px 0 10px -5px rgba(0,0,0,0.04)",
		display: "flex",
		flexDirection: "column",
		overflow: "hidden",
		...(isContained && {
			position: "absolute",
			top: 0,
			right: 0,
			bottom: 0,
			height: "100%",
		}),
		...(inline && {
			position: "relative",
			width: "100%",
			height: "100%",
			boxShadow: "none",
			border: "none",
			borderLeft: `1px solid ${theme.palette.divider}`,
			borderTopRightRadius: "8px",
			borderBottomRightRadius: "8px",
		}),
	},
}));

const PanelHeaderWrapper = styled(SkyBox)(({ theme }) => ({
	padding: "16px 24px",
	backgroundColor: theme.palette.mode === "dark" ? theme.palette.background.paper : "#fff",
	borderBottom: `1px solid ${theme.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "#f1f5f9"}`,
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	zIndex: 10,
	minHeight: "64px",
}));

const PanelContent = styled(SkyBox)(({ theme }) => ({
	flex: 1,
	minHeight: 0,
	display: "flex",
	flexDirection: "row",
	backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#fff",
	padding: "0",
	gap: "16px",
	overflowY: "auto",
	position: "relative",
	[theme.breakpoints.down("xl")]: {
		flexDirection: "column",
		gap: "16px",
		paddingBottom: "24px",
	},
}));

const StyledLeftPanel = styled(SkyBox, {
	shouldForwardProp: (prop) => prop !== "show",
})(({ theme, show }) => ({
	flex: 1,
	display: "flex",
	flexDirection: "column",
	backgroundColor: theme.palette.mode === "dark" ? "rgba(30, 41, 59, 0.8)" : "#fff",
	borderRadius: "8px",
	boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.05)",
	border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#e2e8f0"}`,
	overflow: "hidden",
	[theme.breakpoints.down("xl")]: {
		width: "100%",
		height: "auto",
		maxHeight: "calc(100dvh - 100px)",
		minHeight: 0,
		flex: "none",
	},
	[theme.breakpoints.down("sm")]: {
		display: show ? "flex" : "none",
	},
}));

const StyledRightPanel = styled(SkyBox, {
	shouldForwardProp: (prop) => prop !== "show",
})(({ theme, show }) => ({
	width: "500px",
	display: "flex",
	flexDirection: "column",
	backgroundColor: theme.palette.mode === "dark" ? "rgba(30, 41, 59, 0.8)" : "#fff",
	borderRadius: "8px",
	boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.05)",
	border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#e2e8f0"}`,
	overflow: "hidden",
	[theme.breakpoints.down("xl")]: {
		width: "100%",
		height: "auto",
		maxHeight: "calc(100dvh - 100px)",
		minHeight: 0,
		flex: "none",
	},
	[theme.breakpoints.down("sm")]: {
		display: show ? "flex" : "none",
	},
}));

const PanelBody = styled(SkyBox, {
	shouldForwardProp: (prop) => prop !== "$noPadding",
})(({ theme, $noPadding }) => ({
	flex: 1,
	minHeight: 0,
	padding: $noPadding ? "0" : "16px 16px",

	[theme.breakpoints.down("md")]: {
		padding: $noPadding ? "0" : "12px 16px",
	},
	overflowY: "auto",
	display: "flex",
	flexDirection: "column",
	gap: "16px",
	"&::-webkit-scrollbar": {
		width: "6px",
	},
	"&::-webkit-scrollbar-thumb": {
		backgroundColor: "rgba(0,0,0,0.1)",
		borderRadius: "10px",
	},
}));

const SearchWrapper = styled(SkyBox)(() => ({
	marginBottom: "16px",
	flexShrink: 0,
}));

const TreeWrapper = styled(SkyBox)({
	flex: "0 1 auto",
	maxHeight: "45%",
	minHeight: "50px",
	overflowY: "auto",
	overflowX: "hidden",
	"&::-webkit-scrollbar": {
		width: "4px",
	},
	"&::-webkit-scrollbar-thumb": {
		backgroundColor: "rgba(0,0,0,0.05)",
		borderRadius: "10px",
	},
});

const SuggestTreeWrapper = styled(TreeWrapper)({
	maxHeight: "none",
	minHeight: 0,
	flex: 1,
});

const StyledHeaderIcon = styled(Group)(({ theme }) => ({
	color: theme.palette.primary.main,
}));

const StyledHeaderTitle = styled(SkyTypography)(({ theme }) => ({
	fontWeight: 700,
	color: theme.palette.text.primary,
	fontSize: "1.1rem",
}));

const StyledMobileToggle = styled(SkyIconButton)(({ theme }) => ({
	marginLeft: theme.spacing(1),
}));

const StyledSuggestLabel = styled(SkyTypography)(({ theme }) => ({
	marginBottom: "8px",
	fontWeight: 700,
	color: theme.palette.text.secondary,
	textTransform: "uppercase",
	fontSize: "11px",
	flexShrink: 0,
}));

const PanelHeaderTitleGroup = styled(SkyBox)(({ theme }) => ({
	display: "flex",
	alignItems: "center",
	gap: theme.spacing(1.5),
}));

const SuggestionSectionWrapper = styled(SkyBox)(({ theme }) => ({
	marginTop: theme.spacing(3),
	display: "flex",
	flexDirection: "column",
	flex: 1,
	minHeight: "150px",
}));

const LoadingContent = styled(SkyBox)({
	padding: "20px",
});

/**
 * DialogDirective
 * Props của DialogDirective:
 * @param {boolean} [open=true] - Mở/đóng dialog
 * @param {string} [label="Chuyển xử lý"] - Tiêu đề dialog
 * @param {function} [onClose] - Callback khi đóng dialog
 * @param {function} [onCloseAppBar] - Callback khi đóng app bar (nếu có)
 * @param {function} [onCloseDialog] - Callback khi đóng dialog từ nội dung
 * @param {string} [docId] - ID của văn bản cần chuyển xử lý
 * @param {Array} [selectedFullRows] - Danh sách các row được chọn (nếu docId không có)
 * @param {Object} [dataDetail] - Thông tin chi tiết văn bản
 * @param {function} [onSubmit] - Callback khi submit form
 * @param {boolean}  [isCXL =true] Chuyển đề xuất
 * @param {boolean}  [isDXXL =true] Chuyển đề xuất
 *
 * Internal State:
 * - search, searchKDV: search text
 * - assignments: lưu trữ các phân công (chiDao, phoi, nhanDeBiet)
 * - loadingTransfer: trạng thái loading khi gửi dữ liệu
 *
 * @example
 * <DialogDirective
 *   open={true}
 *   label="Chuyển xử lý"
 *   sharedComponents={sharedComponents}
 *   docId="123456"
 *   onClose={() => setOpen(false)}
 * />
 */

const SubmitProposal = (props) => {
	const {
		open = false,
		label = "Chuyển xử lý",
		delay = 1000,
		sharedComponents,
		onClose = () => { },
		onCloseAppBar = () => { },
		onCloseDialog = () => { },
		docId,
		selectedFullRows,
		dataDetail,
		actionCode,
		targetRole,
		setReloadData = () => { },
		// subActionType,
		// actionsCodeSubTab,
		codeAvailableActions,
		canTransferRooms,
		canTransferRoomProcessor,
		canTransferRoomSupporter,
		canTransferRoomViewer,
		canSetProcessor,
		canSetSupporter,
		canSetViewer,
		isUpdate,
		isView,
		getFormDataForUpdate,
		viewAndSupport,
		canTransferOption,
		canProcessSupport,
		docIds: docIdsProp,
		panelContainerRef,
		// typeSe,
		chiDao,
		actionsBySub,
		isNhanDeBiet: isNhanDeBietProp,
		// availableActionsType,
		inline = false,
		maxDepthLevel,
	} = props;
	const isNhanDeBiet = isNhanDeBietProp;

	const canTransferRoom = canTransferRooms || canTransferRoomProcessor || canTransferRoomSupporter || canTransferRoomViewer;
	const fallbackContainer =
		typeof document !== "undefined"
			? document.getElementById("incoming-list-overlay-root")
			: null;
	const drawerContainer = panelContainerRef?.current || fallbackContainer || null;
	const isContainedDrawer = Boolean(drawerContainer);
	// logger.log("canTransferRoom", canTransferRoom);
	const { Input, toast, DatePicker, Button, LoadingDialog } = sharedComponents;

	const { dataUser: userProfile } = useSelector((state) => state.auth || {});
	const dispatch = useDispatch();
	const {
		organizationUnits = [],
		loading,
	} = useSelector((state) => state.user);

	const [usersData, setUsersData] = useState([]);
	const [loadingUsers, setLoadingUsers] = useState(false);

	const isMounted = useRef(true);
	useEffect(() => {
		isMounted.current = true;
		return () => {
			isMounted.current = false;
		};
	}, []);

	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [searchKDV] = useState(null);

	useEffect(() => {
		const handler = setTimeout(() => {
			if (search.trim().length >= 2 || search.trim().length === 0) {
				setDebouncedSearch(search);
			}
		}, delay);
		return () => clearTimeout(handler);
	}, [search, delay]);
	const [assignments, setAssignments] = useState({});
	const [loadingTranfer, setLoadingTransfers] = useState(false);
	const [deadlineError, setDeadlineError] = useState(false); // Track lỗi DatePicker
	const [showRightPanel, setShowRightPanel] = useState(false);
	const authority = dataDetail?.document?.isAuthority || dataDetail?.isAuthority;
	const theme = useTheme();
	const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("sm"));

	const userId = userProfile?._id || userProfile?.id; // lấy người dùng
	const author = userProfile?.author;
	const parentId = userProfile?.parent?._id;
	const checkTransfer = usersData.find((item) => item.transfer === false);


	const flagsProcess = useMemo(() => ({
		canSetProcessor,
		canSetSupporter,
		canSetViewer,
		canTransferOption,
	}), [canSetProcessor, canSetSupporter, canSetViewer, canTransferOption]);

	const { control, handleSubmit, reset, watch, setError, clearErrors, formState: { errors } } = useForm({
		shouldUnregister: false,
		defaultValues: {
			note: "",
			deadline: "",
			deadlineChiDao: null,
			deadlinePhoi: null,
			deadlineNhanDeBiet: null,
		},
	});

	const deadlineChiDao = watch("deadlineChiDao");
	const deadlinePhoi = watch("deadlinePhoi");

	useEffect(() => {
		if (deadlineChiDao && deadlinePhoi) {
			if (dayjs(deadlineChiDao).isBefore(dayjs(deadlinePhoi), 'day')) {
				setError("deadlineChiDao", {
					type: "manual",
					message: "Hạn xử lý chính không được trước hạn phối hợp"
				});
			} else {
				clearErrors("deadlineChiDao");
			}
		}
	}, [deadlineChiDao, deadlinePhoi, setError, clearErrors]);
	const workItems =
		dataDetail?.workItem

	// Lấy documentId từ nhiều nguồn: props docId, chi tiết (document.documentId), hoặc danh sách (documentId)
	const docIds = useMemo(() => {
		return (
			docIdsProp ||
			docId ||
			dataDetail?.document?.documentId ||
			dataDetail?.documentId ||
			(Array.isArray(selectedFullRows)
				? selectedFullRows.map((row) => row.id)
				: [])
		);
	}, [docIdsProp, docId, dataDetail, selectedFullRows]);



	const fetchData = useCallback(async () => {
		try {
			setLoadingUsers(true);
			setUsersData([]); // Clear previous data
			const bodyUser = {
				processKey: dataDetail?.document?.bpmnVersion || dataDetail?.bpmnVersion,
				documentId: Array.isArray(docIds) ? docIds[0] : docIds,
				userId,
				roles: targetRole,
				documentType:
					dataDetail?.document?.isIncomming || dataDetail?.isIncomming
						? "incomingdocument"
						: null,
				actionCode: actionCode,
				workitem: workItems?.nodeId,
			};
			const isAuthority = dataDetail?.document?.isAuthority;
			const params = isAuthority
				? { isAuthority: true }
				: undefined;

			// Fetch organization units from redux
			const fetchUnitsPromise = dispatch(fetchOrganizationUnits({ body: bodyUser, params }));

			// Fetch users list manually with auto-pagination
			const limit = 1000;
			const initialParams = { ...params, limit, page: 1 };
			const firstPageRes = await axiosInstance.post(
				`${API_GET_LIST_USERS}/get-users-suggestion-handling`,
				bodyUser,
				{ params: initialParams }
			);

			let currentUsersData = [];

			if (Array.isArray(firstPageRes) && firstPageRes.length > 0) {
				currentUsersData = JSON.parse(JSON.stringify(firstPageRes));
				if (isMounted.current) {
					setUsersData(currentUsersData); // Update state with Page 1 immediately
				}

				const transferTrueItem = currentUsersData.find(item => item.transfer === true);
				const transferFalseItem = currentUsersData.find(item => item.transfer === false);

				const total1 = transferTrueItem?.total || 0;
				const total2 = transferFalseItem?.total || 0;
				const maxTotal = Math.max(total1, total2);

				// Tải ngầm tuần tự các trang tiếp theo
				if (maxTotal > 1 * limit) {
					(async () => {
						try {
							let currentPage = 1;
							let hasMore = true;

							while (hasMore) {
								const nextPage = currentPage + 1;
								const nextParams = { ...params, limit, page: nextPage };
								const pageRes = await axiosInstance.post(
									`${API_GET_LIST_USERS}/get-users-suggestion-handling`,
									bodyUser,
									{ params: nextParams }
								);

								if (Array.isArray(pageRes) && pageRes.length > 0) {
									const nextPageTrueItem = pageRes.find(item => item.transfer === true);
									const nextPageFalseItem = pageRes.find(item => item.transfer === false);

									const nextPageTotal1 = nextPageTrueItem?.total || 0;
									const nextPageTotal2 = nextPageFalseItem?.total || 0;
									const maxNextTotal = Math.max(nextPageTotal1, nextPageTotal2);

									// Điều kiện dừng: Khi total của trang đó nhỏ hơn hoặc bằng (page * limit)
									if (maxNextTotal <= nextPage * limit) {
										hasMore = false;
									}

									if (isMounted.current) {
										setUsersData(prevData => {
											if (!Array.isArray(prevData) || prevData.length === 0) return prevData;

											const updatedData = JSON.parse(JSON.stringify(prevData));
											const prevTrueItem = updatedData.find(item => item.transfer === true);
											const prevFalseItem = updatedData.find(item => item.transfer === false);

											if (nextPageTrueItem && nextPageTrueItem.user && prevTrueItem) {
												prevTrueItem.user = [...prevTrueItem.user, ...nextPageTrueItem.user];
											}
											if (nextPageFalseItem && nextPageFalseItem.user && prevFalseItem) {
												prevFalseItem.user = [...prevFalseItem.user, ...nextPageFalseItem.user];
											}
											return updatedData;
										});
									}

									currentPage = nextPage;
								} else {
									hasMore = false;
								}
							}
						} catch (bgError) {
							logger.error("Lỗi khi tải ngầm danh sách người dùng các trang tiếp theo:", bgError);
						}
					})();
				}
			}

			await fetchUnitsPromise;
		} catch (error) {
			toast("Lỗi khi load dữ liệu", "error");
		} finally {
			if (isMounted.current) {
				setLoadingUsers(false);
			}
		}
	}, [docIds, dispatch, targetRole, dataDetail, actionCode, toast, workItems, userId]);

	useEffect(() => {
		// Chỉ fetch data khi dialog mở
		if (open) {
			fetchData();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, fetchData]);


	// Tự động lấy subActionCode  Khi chuyển tùy chọn 
	// const subActionCode = useMemo(() => {
	// 	// Tìm trong availableActions của dataDetail
	// 	const actions = dataDetail?.availableActions || dataDetail?.document?.availableActions || [];
	// 	logger.log('actions', actions)
	// 	for (const action of actions) {
	// 		const subAction = action?.subActions?.find((sub) => sub.canTransferRoom === true);
	// 		if (subAction) {
	// 			return subAction.code;
	// 		}
	// 		logger.log('subAction', subAction)
	// 	}
	// 	return null;
	// 	}, [dataDetail]);

	const suggestTarget = useMemo(() => {
		return usersData?.find((item) => item.transfer === false) || null;
	}, [usersData]);

	const subActionCodeMap = useMemo(() => {
		const subActions = suggestTarget?.subActions || [];

		const findCode = (candidates = []) => {
			const found = subActions.find((item) =>
				candidates.includes(item?.actionCode)
			);
			return found?.actionCode || null;
		};

		return {
			chiDao: findCode(["XU_LY_CHINH"]),
			phoi: findCode(["PHOI_HOP"]),
			nhanDeBiet: findCode(["NHAN_DE_BIET"]),
		};
	}, [suggestTarget]);

	// Lấy actionCode từ actions trong subActions có viewAndSupport === false
	const actionCodeFromActions = useMemo(() => {
		const actions = dataDetail?.availableActions || dataDetail?.document?.availableActions || [];
		for (const action of actions) {
			for (const subAction of action?.subActions || []) {
				// Tìm subAction có viewAndSupport === false
				if (subAction?.viewAndSupport === false && subAction?.actions && Array.isArray(subAction?.actions) && subAction?.actions.length > 0) {
					// Lấy code từ action đầu tiên
					return subAction?.actions[0].code;
				}
			}
		}
		return null;
	}, [dataDetail]);


	// const toCamelKey = (str) =>
	// 	str.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());

	// const actionCodeMap = useMemo(() => {
	// 	const codes = Array.isArray(actionsCodeSubTab)
	// 		? actionsCodeSubTab
	// 		: (actionsCodeSubTab || "").split(",").filter(Boolean);
	// 	return codes.reduce((acc, code) => {
	// 		const key = toCamelKey(code);
	// 		acc[key] = code;
	// 		return acc;
	// 	}, {});
	// }, [actionsCodeSubTab]);


	const fetchDataUpdate = useCallback(async () => {
		try {
			// Lấy body data từ UpdateIncommingDoc nếu có
			if ((isUpdate || isView) && getFormDataForUpdate) {
				const result = getFormDataForUpdate();
				const { body: updateBody, hasChanged } = result;

				if (hasChanged) {
					try {
						await dispatch(updateIncomingDocument(updateBody)).unwrap();
					} catch (error) {
						logger.error('Lỗi khi update văn bản:', error);
						throw error;
					}
				} else {
					logger.log('Không có thay đổi, bỏ qua việc update văn bản');
				}
			}
		} catch (error) {
			logger.error('Lỗi trong fetchDataUpdate:', error);
			toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
			throw error;
		}
	}, [isUpdate, isView, getFormDataForUpdate, dispatch, toast]);


	const onSubmit = useCallback(
		async (data) => {
			setLoadingTransfers(true);

			try {
				// Bước 1: Kiểm tra và update văn bản nếu cần (từ UpdateIncommingDoc)
				// Nếu có isUpdate HOẶC data thay đổi => call updateIncomingDocument trước
				await fetchDataUpdate();

				const trueCount = Object.values(flagsProcess).filter(Boolean).length;
				const list = Object.values(assignments || []);
				// const chiDao = {
				// 	users: list
				// 		.filter((a) => a.chiDao && a.unitType === "user")
				// 		.map((a) => a.id),
				// 	organizationUnits: list
				// 		.filter((a) => a.chiDao && a.unitType === "company")
				// 		.map((a) => a.id),
				// };

				// const buildSubAssignment = (type) => {
				// 	const users = list
				// 		.filter((a) => a[type] && a.unitType === "user")
				// 		.map((a) => a.id);

				// 	const organizationUnits = list
				// 		.filter((a) => a[type] && a.unitType === "company")
				// 		.map((a) => a.id);

				// 	if (users.length === 0 && organizationUnits.length === 0) return null;

				// 	return {
				// 		subActionCode: subActionCodeMap[type] || null,
				// 		users,
				// 		organizationUnits,
				// 	};
				// };

				// const newAssignments = [
				// 	buildSubAssignment("chiDao"),
				// 	buildSubAssignment("phoi"),
				// 	buildSubAssignment("nhanDeBiet"),
				// ].filter(Boolean);

				const mainChiDao = {
					users: list
						.filter((a) => a.source === "main" && a.chiDao && a.unitType === "user")
						.map((a) => a.id),
					organizationUnits: list
						.filter((a) => a.source === "main" && a.chiDao && a.unitType === "company")
						.map((a) => a.id),
				};

				const mapItemWithDeadline = (a, type) => {
					const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1);
					const specificDeadlineKey = `deadline${typeCapitalized}_${a.unitType}_${a.id}`;
					const specificDeadline = data[specificDeadlineKey];
					if (specificDeadline) {
						const formattedDeadline = dayjs(specificDeadline).isValid()
							? dayjs(specificDeadline).toISOString()
							: specificDeadline;
						if (a.unitType === "user") {
							return { userId: a.id, deadline: formattedDeadline };
						} else {
							return { organizationId: a.id, deadline: formattedDeadline };
						}
					}
					return a.id;
				};

				const getSingleItemDeadline = () => {
					for (const a of list) {
						const types = ["chiDao", "phoi", "nhanDeBiet"];
						for (const type of types) {
							if (a[type]) {
								const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1);
								const key = `deadline${typeCapitalized}_${a.unitType}_${a.id}`;
								if (data[key]) {
									return dayjs(data[key]).isValid() ? dayjs(data[key]).toISOString() : data[key];
								}
							}
						}
					}
					const fallback = data.deadlineChiDao || data.deadlinePhoi || data.deadlineNhanDeBiet || data.deadline;
					if (fallback) {
						return dayjs(fallback).isValid() ? dayjs(fallback).toISOString() : fallback;
					}
					return null;
				};

				const singleDeadline = getSingleItemDeadline();

				const buildSuggestSubAssignment = (type, deadline) => {
					const users = list
						.filter((a) => a.source === "suggest" && a[type] && a.unitType === "user")
						.map((a) => mapItemWithDeadline(a, type));

					const organizationUnits = list
						.filter((a) => a.source === "suggest" && a[type] && a.unitType === "company")
						.map((a) => mapItemWithDeadline(a, type));

					if (users.length === 0 && organizationUnits.length === 0) return null;

					const deadlineWithTime = deadline
						? (dayjs(deadline).isValid() ? dayjs(deadline).toISOString() : deadline)
						: null;

					return {
						subActionCode: subActionCodeMap[type] || null,
						users,
						organizationUnits,
						...(deadlineWithTime ? { deadline: deadlineWithTime } : {}),
					};
				};

				const suggesteHandling = [
					buildSuggestSubAssignment("chiDao", data.deadlineChiDao),
					buildSuggestSubAssignment("phoi", data.deadlinePhoi),
					buildSuggestSubAssignment("nhanDeBiet", data.deadlineNhanDeBiet),
				].filter(Boolean);

				const baseBody = {
					note: data.note,
					userId,
					isAuthority: authority,
					roles: targetRole,
					actionCode
				};

				const specificBody =
					trueCount >= 2
						? {
							// assignments: newAssignments,
							assignments: suggesteHandling,
							actionCode: codeAvailableActions,
						}
						: canTransferRooms === true
							? {
								assignments: [
									{
										subActionCode: subActionCodeMap.chiDao,
										users: list
											.filter((a) => a.chiDao && a.unitType === "user")
											.map((a) => mapItemWithDeadline(a, "chiDao")),
										organizationUnits: list
											.filter((a) => a.chiDao && a.unitType === "company")
											.map((a) => mapItemWithDeadline(a, "chiDao")),
									},
								],
								actionCode: subActionCodeMap.chiDao,
							}
							: {
								assignToUserId: mainChiDao.users.length > 0 ? mainChiDao.users[0] : null,
								actionCode: viewAndSupport === false ? actionCodeFromActions : actionCode,
								...(suggesteHandling.length > 0 && { suggesteHandling }),
								...(singleDeadline ? { deadline: singleDeadline } : {})
							};

				const currentWorkItem = workItems || (Array.isArray(selectedFullRows) && selectedFullRows.length > 0 ? selectedFullRows[0].workItem : null);
				const matchingWorkItem = currentWorkItem &&
					(currentWorkItem.assigneeUserId === userId ||
						currentWorkItem.assigneeUserId === parentId ||
						currentWorkItem.author === author)
					? currentWorkItem
					: null;

				const idWorkItem = matchingWorkItem?.id;
				const idDocument = Array.isArray(docIds) ? docIds[0] : docIds;
				// const endpoint = `${API_PROCCESS_DOCUMENT}/${idDocument}/${idWorkItem}/${apiAction}`;
				const endpoint = `${API_PROCCESS_DOCUMENT}/${idDocument}/${idWorkItem}/completeSuggesteHandling`;

				const body = {
					...baseBody,
					...specificBody,
					documentId: idDocument,
					docIds: Array.isArray(docIds) ? docIds : [idDocument]
				};
				const isAuthorityDoc = dataDetail?.document?.isAuthority;
				const params = trueCount >= 2 && isAuthorityDoc
					? { isAuthority: true }
					: undefined;

				const res = await axiosInstance.post(endpoint, body, { params });
				if (res) {
					reset();
					setAssignments({});
					onCloseDialog();
					onCloseAppBar();
					onClose();
					setSearch("");
					dispatch(getSideBarMenu());
					setReloadData(new Date() * 1);
					toast("Chuyển xử lý thành công", "success");
				}

			} catch (error) {
				toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
			} finally {
				setLoadingTransfers(false);
			}
		},
		[
			flagsProcess,
			docIds,
			assignments,
			codeAvailableActions,
			userId,
			actionCode,
			toast,
			parentId,
			authority,
			canTransferRooms,
			viewAndSupport,
			actionCodeFromActions,
			workItems,
			selectedFullRows,
			subActionCodeMap,
			// subActionType,
			author,
			targetRole,
			fetchDataUpdate,
			dataDetail?.document?.isAuthority,
			dispatch,
			onClose,
			onCloseDialog,
			onCloseAppBar,
			setReloadData,
			reset,
		]
	);

	const getAbbreviatedRoomName = (roomName) => {
		if (!roomName) return '';
		let name = roomName.trim();
		if (name.toLowerCase().startsWith('phòng ')) {
			name = name.substring(6).trim();
		}
		const words = name.split(/\s+/).filter(w => w.length > 0);
		const abbr = words.map(w => w.charAt(0).toUpperCase()).join('');
		return `P.${abbr}`;
	};

	const buildUnitTree = useCallback((units, parentId = null, parentName = null, isParentPhong = false) => {
		const safeUnits = Array.isArray(units) ? units : [];

		return safeUnits
			?.filter((u) => u.parent === parentId)
			.map((u) => {
				let finalName = u.name || '';
				const isCurrentPhong = u.type === 'Phong' || finalName.toLowerCase().startsWith('phòng ');

				if (isParentPhong && finalName.toLowerCase().startsWith('ban ')) {
					const abbr = getAbbreviatedRoomName(parentName);
					finalName = `${finalName} - ${abbr}`;
				}

				return {
					...u,
					name: finalName,
					child: buildUnitTree(safeUnits, u._id, u.name, isCurrentPhong),
					types: "company",
				};
			});
	}, []);

	const { mainUsers, suggestUsers } = useMemo(() => {
		if (!Array.isArray(usersData)) return { mainUsers: [], suggestUsers: [] };

		// Nếu dữ liệu có cấu trúc { transfer, user: [] }
		if (usersData.length > 0 && Object.prototype.hasOwnProperty.call(usersData[0], 'transfer')) {
			const main = usersData.find(u => u.transfer === true)?.user || [];
			const suggest = usersData.find(u => u.transfer === false)?.user || [];
			return { mainUsers: main, suggestUsers: suggest };
		}

		// Trường hợp dự phòng nếu dữ liệu đã được flatten sẵn hoặc cấu trúc khác
		return { mainUsers: usersData, suggestUsers: [] };
	}, [usersData]);

	const dataMergeUserAndUnit = useMemo(() => {
		if (!mainUsers || !organizationUnits) return [];
		const organizationTree = buildUnitTree(organizationUnits || []);
		const searchUnits = removeVietnameseTones(debouncedSearch || "");

		const filterUnits = (units, kdvId) => {
			for (const unit of units) {
				if (unit._id === kdvId || unit.id === kdvId) return [unit];
				if (unit.child && unit.child.length > 0) {
					const found = filterUnits(unit.child, kdvId);
					if (found.length > 0) return found;
				}
			}
			return [];
		};

		const processUnits = (units, currentUsers, forceInclude = false) => {
			return units.flatMap((unit) => {
				const matchedUsers = currentUsers?.filter(
					(user) => user?.parent === (unit?._id ?? unit?.id)
				);

				let userNodes = matchedUsers.map((user) => ({
					...user,
					types: "user",
				}));

				const unitMatched =
					debouncedSearch &&
					((unit.name &&
						removeVietnameseTones(unit.name)
							.toLowerCase()
							.includes(searchUnits)) ||
						(unit.codeND &&
							removeVietnameseTones(unit.codeND)
								.toLowerCase()
								.includes(searchUnits)) ||
						(unit.userName && unit.userName.toLowerCase() === searchUnits) ||
						(unit.username && unit.username.toLowerCase() === searchUnits));

				const shouldKeepAllChildren = forceInclude || unitMatched;
				// Giải thích comment: Bỏ `|| unitMatched` để không tự động lấy toàn bộ nhân viên con khi phòng ban cha khớp.
				// const shouldKeepAllChildren = forceInclude;

				if (debouncedSearch && !shouldKeepAllChildren) {
					userNodes = userNodes.filter(
						(user) =>
							(user.name &&
								removeVietnameseTones(user.name)
									.toLowerCase()
									.includes(searchUnits)) ||
							(user.codeND &&
								removeVietnameseTones(user.codeND)
									.toLowerCase()
									.includes(searchUnits)) ||
							(user.userName && user.userName.toLowerCase() === searchUnits) ||
							(user.username && user.username.toLowerCase() === searchUnits)
					);
				}

				const childUnits = Array.isArray(unit.child) ? unit.child : [];
				const childProcessed = processUnits(childUnits, currentUsers, shouldKeepAllChildren);

				// Đơn vị được giữ lại nếu:
				const hasRelevantData =
					!debouncedSearch ||
					shouldKeepAllChildren ||
					unitMatched || // Thêm unitMatched vào đây để bản thân unit khớp thì vẫn được hiển thị
					userNodes.length > 0 ||
					childProcessed.length > 0;

				if (!hasRelevantData) return [];

				// Kiểm tra xem unit có user nào không
				const hasUsers =
					userNodes.length > 0 ||
					childProcessed.some((child) => {
						return child?.child?.some((item) => item.types === "user") || child?.types === "user";
					});

				// Nếu canTransferRoom = false và không có user nào, ẩn phòng ban
				if (!canTransferRoom && !hasUsers) return [];

				if (debouncedSearch) {
					if (!unitMatched && !forceInclude) {
						return [...userNodes, ...childProcessed];
					}
				}

				return [{
					...unit,
					child: [...userNodes, ...childProcessed],
				}];
			});
		};

		// searchKDV c th là string (ID) hoặc object v:i _id/id
		const kdvId = typeof searchKDV === 'string'
			? searchKDV
			: (searchKDV?._id || searchKDV?.id);
		const rootUnits = kdvId
			? filterUnits(organizationTree, kdvId)
			: organizationTree;
		const tree = processUnits(rootUnits, mainUsers);

		// Bỏ node gốc (ROOT), hiển thị trực tiếp cấp PHÒNG
		let nodesToProcess = tree;
		if (
			!debouncedSearch &&
			tree.length === 1 &&
			tree[0]?.types === "company" &&
			Array.isArray(tree[0]?.child) &&
			tree[0].child.length > 0
		) {
			nodesToProcess = tree[0].child;
		}
		return nodesToProcess;
	}, [organizationUnits, mainUsers, debouncedSearch, searchKDV, buildUnitTree, canTransferRoom]);

	// logger.log("suggestUsers", suggestUsers)
	const dataMergeUserAndUnitSuggest = useMemo(() => {
		if (!suggestUsers || suggestUsers.length === 0 || !organizationUnits) return [];
		const organizationTree = buildUnitTree(organizationUnits || []);
		const searchUnits = removeVietnameseTones(debouncedSearch || "");

		const filterUnits = (units, kdvId) => {
			for (const unit of units) {
				if (unit._id === kdvId || unit.id === kdvId) return [unit];
				if (unit.child && unit.child.length > 0) {
					const found = filterUnits(unit.child, kdvId);
					if (found.length > 0) return found;
				}
			}
			return [];
		};

		const processUnits = (units, currentUsers, forceInclude = false) => {
			return units.flatMap((unit) => {
				const matchedUsers = currentUsers?.filter(
					(user) => user?.parent === (unit?._id ?? unit?.id)
				);

				let userNodes = matchedUsers.map((user) => ({
					...user,
					types: "user",
				}));

				const unitMatched =
					debouncedSearch &&
					((unit.name &&
						removeVietnameseTones(unit.name)
							.toLowerCase()
							.includes(searchUnits)) ||
						(unit.codeND &&
							removeVietnameseTones(unit.codeND)
								.toLowerCase()
								.includes(searchUnits)) ||
						(unit.userName && unit.userName.toLowerCase() === searchUnits) ||
						(unit.username && unit.username.toLowerCase() === searchUnits));

				const shouldKeepAllChildren = forceInclude || unitMatched;

				if (debouncedSearch && !shouldKeepAllChildren) {
					userNodes = userNodes.filter(
						(user) =>
							(user.name &&
								removeVietnameseTones(user.name)
									.toLowerCase()
									.includes(searchUnits)) ||
							(user.codeND &&
								removeVietnameseTones(user.codeND)
									.toLowerCase()
									.includes(searchUnits)) ||
							(user.userName && user.userName.toLowerCase() === searchUnits) ||
							(user.username && user.username.toLowerCase() === searchUnits)
					);
				}

				const childUnits = Array.isArray(unit.child) ? unit.child : [];
				const childProcessed = processUnits(childUnits, currentUsers, shouldKeepAllChildren);

				// Đơn vị được giữ lại nếu:
				const hasRelevantData =
					!debouncedSearch ||
					shouldKeepAllChildren ||
					userNodes.length > 0 ||
					childProcessed.length > 0;

				if (!hasRelevantData) return [];

				if (debouncedSearch) {
					if (!unitMatched && !forceInclude) {
						return [...userNodes, ...childProcessed];
					}
				}

				return [{
					...unit,
					child: [...userNodes, ...childProcessed],
				}];
			});
		};

		const kdvId = typeof searchKDV === 'string'
			? searchKDV
			: (searchKDV?._id || searchKDV?.id);
		const rootUnits = kdvId
			? filterUnits(organizationTree, kdvId)
			: organizationTree;
		const tree = processUnits(rootUnits, suggestUsers);

		// Bỏ node gốc (ROOT), hiển thị trực tiếp cấp PHÒNG
		let nodesToProcess = tree;
		if (
			!debouncedSearch &&
			tree.length === 1 &&
			tree[0]?.types === "company" &&
			Array.isArray(tree[0]?.child) &&
			tree[0].child.length > 0
		) {
			nodesToProcess = tree[0].child;
		}

		const searchUnitsLower = removeVietnameseTones(debouncedSearch || "").toLowerCase();

		const isBanLanhDao = (node) => {
			return node?.code === "BLDBD" || (node?.name && removeVietnameseTones(node.name).toLowerCase().includes("ban lanh dao"));
		};

		const isFunctionalDepartment = (node) => {
			if (node?.code === "CTM") return true;
			const nodeName = node?.name || '';
			const nodeNameNoTones = removeVietnameseTones(nodeName).toLowerCase();
			return nodeNameNoTones.includes("phong chuc nang") && nodeNameNoTones.includes("truc thuoc");
		};

		const processNodes = (nodes) => {
			let result = [];
			nodes.forEach(node => {
				if (isFunctionalDepartment(node)) {
					// Chỉ ẩn "Phòng chức năng", đẩy các con của nó ra ngoài ngay tại vị trí hiện tại
					if (Array.isArray(node.child)) {
						node.child.forEach(c => {
							let processedChild = { ...c, isPhanCong: true };
							if (Array.isArray(processedChild.child)) {
								processedChild.child = processNodes(processedChild.child);
							}
							result.push(processedChild);
						});
					}
				} else if (isBanLanhDao(node)) {
					let childUsers = [];
					let childUnits = [];

					if (Array.isArray(node.child)) {
						node.child.forEach(childNode => {
							if (childNode.types === "user") {
								childUsers.push(childNode);
							} else {
								childUnits.push(childNode);
							}
						});
					}

					// Giữ lại Ban Lãnh Đạo với người dùng là con của nó
					const processedChildUsers = processNodes(childUsers);
					const isMatched = debouncedSearch && (
						(node.name && removeVietnameseTones(node.name).toLowerCase().includes(searchUnitsLower)) ||
						(node.codeND && removeVietnameseTones(node.codeND).toLowerCase().includes(searchUnitsLower))
					);
					if (!debouncedSearch || processedChildUsers.length > 0 || isMatched) {
						let newNode = { ...node, isPhanCong: true, child: processedChildUsers };
						result.push(newNode);
					}

					// Lôi các đơn vị phòng ban khác ra ngoài và đặt ngang hàng Ban Lãnh Đạo
					childUnits.forEach(childNode => {
						if (isFunctionalDepartment(childNode)) {
							if (Array.isArray(childNode.child)) {
								childNode.child.forEach(c => {
									let processedChild = { ...c, isPhanCong: true };
									if (Array.isArray(processedChild.child)) {
										processedChild.child = processNodes(processedChild.child);
									}
									result.push(processedChild);
								});
							}
						} else {
							let processedChild = { ...childNode, isPhanCong: true };
							if (Array.isArray(processedChild.child)) {
								processedChild.child = processNodes(processedChild.child);
							}
							result.push(processedChild);
						}
					});
				} else {
					// Giữ nguyên toàn bộ cấu trúc gốc cho các node khác
					let newNode = { ...node, isPhanCong: true };
					if (Array.isArray(newNode.child)) {
						newNode.child = processNodes(newNode.child);
					}
					result.push(newNode);
				}
			});
			return result;
		};

		return processNodes(nodesToProcess);
	}, [organizationUnits, suggestUsers, debouncedSearch, searchKDV, buildUnitTree]);

	// console.log("dataMergeUserAndUnit", dataMergeUserAndUnit);

	// Tự động chọn chiDao khi chỉ có một người dùng trong kết quả
	// CHỈ tự động chọn khi chưa có assignment nào được chọn trước đó
	// KHÔNG tự động chọn khi canTransferRoom = true (cho phép chọn nhiều người)
	useEffect(() => {
		// Nếu canTransferRoom = true, không tự động chọn để user tự chọn nhiều người
		if (canTransferRoom) {
			return;
		}

		// Nếu đã có assignment nào được chọn, KHÔNG reset
		const hasExistingAssignments = Object.keys(assignments || {}).length > 0;
		if (hasExistingAssignments) {
			return;
		}

		if (!dataMergeUserAndUnit || dataMergeUserAndUnit.length === 0) {
			return;
		}

		// Lấy tất cả các user trong kết quả
		const getAllUsers = (units) => {
			let allUsers = [];
			units.forEach((unit) => {
				if (unit.child && Array.isArray(unit.child)) {
					unit.child.forEach((child) => {
						if (child.types === "user") {
							allUsers.push(child);
						} else if (child.child) {
							allUsers = allUsers.concat(getAllUsers([child]));
						}
					});
				}
			});
			return allUsers;
		};

		const allUsers = getAllUsers(dataMergeUserAndUnit);

		// Nếu chỉ có một người dùng trong kết quả Vì chưa có assignment nào
		if (allUsers.length === 1) {
			const user = allUsers[0];
			const userId = user._id || user.id;
			const key = getAssignmentKey(userId);

			setAssignments({
				[key]: {
					id: userId,
					key,
					name: user.name || "",
					code: user.code || "",
					unitType: "user",
					chiDao: true,
					phoi: false,
					nhanDeBiet: false,
				},
			});
		}
		// KHÔNG reset assignments khi có nhiều user - giữ nguyên lựa chọn cũ
	}, [dataMergeUserAndUnit, canTransferRoom, assignments]);

	// const getAssignmentKey = (unitId) => `${unitId}`;
	const getAssignmentKey = (unitId, source = "main") => `${source}__${unitId}`;

	const getUnitName = useCallback(
		(unitId) => {
			const unit = flattenUnits(dataMergeUserAndUnit).find(
				(u) => (u._id || u.id) === unitId
			);
			return unit ? unit.name : "";
		},
		[dataMergeUserAndUnit]
	);

	const removeAssignment = (key) => {
		setAssignments((prev) => {
			const newState = { ...prev };
			delete newState[key];
			return newState;
		});
	};

	const getAssignmentRole = useCallback((assignment) => {
		if (assignment.chiDao) {
			if (assignment.source === "main") return "Xin ý kiến";

			// Khối suggest: Phân biệt Lãnh đạo (Chỉ đạo) và Xử lý chính
			// const isLeader = mainUsers.some(u => (u._id || u.id) === assignment.id);
			// return isLeader ? "Chỉ đạo" : "Xử lý chính";
			return "Xử lý chính";
		}
		if (assignment.phoi) return "Phối hợp";
		if (assignment.nhanDeBiet) return "Nhận để biết";
		return "";
	}, []);

	const rolePriority = useMemo(() => {
		return {
			"Xin ý kiến": 1,
			"Chỉ đạo": 2,
			"Xử lý chính": 3,
			"Phối hợp": 4,
			"Nhận để biết": 5,
		};
	}, []);

	const getRoleColor = (role) => {
		switch (role) {
			case "Xin ý kiến":
			case "Chỉ đạo":
				return "#D9366D";
			case "Xử lý chính":
				return "#1460d7";
			case "Phối hợp":
				return "#d7af14";
			case "Nhận để biết":
				return "#C93EB1";
			default:
				return "default";
		}
	};

	const handleCheckboxChange = useCallback(
		(unitId, type, unitType, item, source = "main") => {
			const key = getAssignmentKey(unitId, source);

			setAssignments((prev) => {
				const prevAssignment = prev?.[key] || {};
				const isCurrentlyChecked = prevAssignment[type] ?? false;

				if (isCurrentlyChecked) {
					const updated = { ...prev };
					const current = updated[key];
					if (current) {
						current[type] = false;
						if (!current.chiDao && !current.phoi && !current.nhanDeBiet) {
							delete updated[key];
						}
					}
					return updated;
				}

				// Ràng buộc: Nếu chọn ở khối suggest, kiểm tra xem đã chọn ở khối main chưa
				if (source === "suggest") {
					if (item?.type === "Ban") {
						return prev;
					}
					const mainKey = getAssignmentKey(unitId, "main");
					if (prev?.[mainKey]) {
						toast("Người dùng này đã được chọn ở khối Xin ý kiến", "warning");
						return prev;
					}
				}

				const updatedAssignments = { ...prev };

				if (type === "chiDao") {
					if (source === "main") {
						// khối trên: chỉ cho 1 người xin ý kiến chính
						Object.keys(updatedAssignments).forEach((k) => {
							const a = updatedAssignments[k];
							if (a?.source === "main" && a?.chiDao && k !== key) {
								if (a.phoi || a.nhanDeBiet) {
									updatedAssignments[k] = { ...a, chiDao: false };
								} else {
									delete updatedAssignments[k];
								}
							}
						});
					}

					if (source === "suggest") {
						// khối dưới: chỉ cho 1 người chỉ đạo đề xuất nếu không phải multi-select
						const actions = dataDetail?.availableActions || dataDetail?.document?.availableActions || [];
						const currentAction = actions.find((action) => action.code === actionCode);
						const isMultiSelect = currentAction?.selectionMode === "multi";

						if (!isMultiSelect) {
							Object.keys(updatedAssignments).forEach((k) => {
								const a = updatedAssignments[k];
								if (a?.source === "suggest" && a?.chiDao && k !== key) {
									if (a.phoi || a.nhanDeBiet) {
										updatedAssignments[k] = { ...a, chiDao: false };
									} else {
										delete updatedAssignments[k];
									}
								}
							});
						}
					}

					updatedAssignments[key] = {
						id: unitId,
						key,
						source,
						name: item?.name ?? prevAssignment.name ?? getUnitName(unitId),
						code: item?.code ?? prevAssignment.code,
						unitType:
							unitType ??
							prevAssignment.unitType ??
							(item?.types === "user" || item?.type === "user" ? "user" : "company"),
						chiDao: true,
						phoi: false,
						nhanDeBiet: false,
					};
				} else if (type === "phoi") {
					updatedAssignments[key] = {
						id: unitId,
						key,
						source,
						name: item?.name ?? prevAssignment.name ?? getUnitName(unitId),
						code: item?.code ?? prevAssignment.code,
						unitType:
							unitType ??
							prevAssignment.unitType ??
							(item?.types === "user" || item?.type === "user" ? "user" : "company"),
						chiDao: false,
						phoi: true,
						nhanDeBiet: false,
					};
				} else if (type === "nhanDeBiet") {
					updatedAssignments[key] = {
						id: unitId,
						key,
						source,
						name: item?.name ?? prevAssignment.name ?? getUnitName(unitId),
						code: item?.code ?? prevAssignment.code,
						unitType:
							unitType ??
							prevAssignment.unitType ??
							(item?.types === "user" || item?.type === "user" ? "user" : "company"),
						chiDao: false,
						phoi: false,
						nhanDeBiet: true,
					};
				}

				return updatedAssignments;
			});
		},
		[getUnitName, toast, dataDetail, actionCode]
	);

	// const isChecked = useCallback(
	// 	(item, type) => {
	// 		const itemId = item._id || item.id;
	// 		if (!itemId) return false;

	// 		// Ch�0 check tr�c ti�p item nếu nó c� trong assignments
	// 		// KH�NG t� �ng check ph�ng ban cha khi child ��c chọn
	// 		const assignment = assignments?.[itemId];
	// 		return assignment?.[type] === true;
	// 	},
	// 	[assignments]
	// );

	const isChecked = useCallback(
		(item, type, source = "main") => {
			const itemId = item._id || item.id;
			if (!itemId) return false;

			const assignment = assignments?.[getAssignmentKey(itemId, source)];
			return assignment?.[type] === true;
		},
		[assignments]
	);

	const assignedList = useMemo(() => {
		const entries = Object.entries(assignments || {});

		return entries
			.map(([key, assignment]) => {
				const role = getAssignmentRole(assignment);
				return {
					...assignment,
					key,
					role,
				};
			})
			.filter((item) => item.chiDao || item.phoi || item.nhanDeBiet)
			.sort((a, b) => {
				const roleA = rolePriority[a.role] ?? Number.MAX_SAFE_INTEGER;
				const roleB = rolePriority[b.role] ?? Number.MAX_SAFE_INTEGER;
				if (roleA !== roleB) return roleA - roleB;
				return (a.name || "").localeCompare(b.name || "");
			});
	}, [assignments, rolePriority, getAssignmentRole]);
	// logger.log('assignedList',assignedList)
	const selectedMainUserIds = useMemo(() => {
		return Object.values(assignments || {})
			.filter(a => a.source === "main")
			.map(a => a.id);
	}, [assignments]);

	const handleTogglePanel = () => {
		setShowRightPanel((prev) => !prev);
	};

	// const handleCheckAll = (key) => {
	// 	const allUnits = flattenUnits(dataMergeUserAndUnit).filter(
	// 		(unit) => unit.level > 0
	// 	);

	// 	// N�u là chiDao (xử lý ch�nh)
	// 	if (key === "chiDao") {
	// 		if (allUnits.length === 0) {
	// 			setAssignments({});
	// 			return;
	// 		}

	// 		// chiDao ch�0 cho ph�p chọn duy nhất 1 (chọn item �ầu tiên)
	// 		const firstUnit = allUnits[0];
	// 		const firstId = firstUnit._id || firstUnit.id;
	// 		const firstKey = getAssignmentKey(firstId);

	// 		setAssignments({
	// 			[firstKey]: {
	// 				id: firstId,
	// 				key: firstKey,
	// 				name: firstUnit.name || "",
	// 				code: firstUnit.code || "",
	// 				unitType: firstUnit.types === "user" ? "user" : "company",
	// 				chiDao: true,
	// 				phoi: false,
	// 				nhanDeBiet: false,
	// 			},
	// 		});
	// 		return;
	// 	}

	// 	// Ph�i hợp và Nh�n � bi�t: c� th� chọn nhiều item
	// 	const allAssignments = allUnits.map((unit) => [
	// 		unit._id || unit.id,
	// 		{
	// 			id: unit._id || unit.id || "",
	// 			key: getAssignmentKey(unit._id || unit.id),
	// 			name: unit.name || "",
	// 			code: unit.code || "",
	// 			unitType: unit.types === "user" ? "user" : "company",
	// 			chiDao: false,
	// 			phoi: false,
	// 			nhanDeBiet: false,
	// 			position: unit.position || "",
	// 		},
	// 	]);

	// 	// Đảm bảo m�i item ch�0 c� 1 loại ��c chọn
	// 	const result = allAssignments.map(([id, assignment]) => [
	// 		id,
	// 		{
	// 			...assignment,
	// 			// Ch�0 set loại ��c chọn = true, các loại khác = false
	// 			chiDao: key === "chiDao",
	// 			phoi: key === "phoi",
	// 			nhanDeBiet: key === "nhanDeBiet",
	// 		},
	// 	]);

	// 	setAssignments(Object.fromEntries(result));
	// };

	// const handleCheckAllSuggest = (key) => {
	// 	const allUnits = flattenUnits(dataMergeUserAndUnitSuggest).filter(
	// 		(unit) => unit.level > 0
	// 	);

	// 	if (key === "chiDao") {
	// 		if (allUnits.length === 0) return;
	// 		const firstUnit = allUnits[0];
	// 		const firstId = firstUnit._id || firstUnit.id;
	// 		const firstKey = getAssignmentKey(firstId);
	// 		setAssignments((prev) => ({
	// 			...prev,
	// 			[firstKey]: {
	// 				id: firstId,
	// 				key: firstKey,
	// 				name: firstUnit.name || "",
	// 				code: firstUnit.code || "",
	// 				unitType: firstUnit.types === "user" ? "user" : "company",
	// 				chiDao: true,
	// 				phoi: false,
	// 				nhanDeBiet: false,
	// 			},
	// 		}));
	// 		return;
	// 	}

	// 	const newEntries = Object.fromEntries(
	// 		allUnits.map((unit) => {
	// 			const id = unit._id || unit.id;
	// 			return [
	// 				id,
	// 				{
	// 					id,
	// 					key: getAssignmentKey(id),
	// 					name: unit.name || "",
	// 					code: unit.code || "",
	// 					unitType: unit.types === "user" ? "user" : "company",
	// 					position: unit.position || "",
	// 					chiDao: key === "chiDao",
	// 					phoi: key === "phoi",
	// 					nhanDeBiet: key === "nhanDeBiet",
	// 				},
	// 			];
	// 		})
	// 	);

	// 	setAssignments((prev) => ({ ...prev, ...newEntries }));
	// };

	const checkIfAncestorSelected = useCallback((item, source) => {
		let currentParent = item.parent || item.parentId;
		while (currentParent) {
			const key = getAssignmentKey(currentParent, source);
			const assignment = assignments?.[key];
			if (assignment && (assignment.chiDao || assignment.phoi || assignment.nhanDeBiet)) {
				return true;
			}
			const parentUnit = organizationUnits?.find(u => (u._id || u.id) === currentParent);
			if (parentUnit) {
				currentParent = parentUnit.parent || parentUnit.parentId;
			} else {
				break;
			}
		}
		return false;
	}, [assignments, organizationUnits]);

	const checkIfAncestorSelectedMain = useCallback((item) => checkIfAncestorSelected(item, "main"), [checkIfAncestorSelected]);
	const checkIfAncestorSelectedSuggest = useCallback((item) => checkIfAncestorSelected(item, "suggest"), [checkIfAncestorSelected]);

	const handleCheckAll = (key) => {
		const allUnits = flattenUnits(dataMergeUserAndUnit).filter(
			(unit) => unit.level > 0
		);

		if (key === "chiDao") {
			if (allUnits.length === 0) {
				setAssignments({});
				return;
			}

			const firstUnit = allUnits[0];
			const firstId = firstUnit._id || firstUnit.id;
			const firstKey = getAssignmentKey(firstId, "main");

			setAssignments((prev) => {
				const next = { ...prev };

				Object.keys(next).forEach((k) => {
					if (next[k]?.source === "main" && next[k]?.chiDao) {
						delete next[k];
					}
				});

				next[firstKey] = {
					id: firstId,
					key: firstKey,
					source: "main",
					name: firstUnit.name || "",
					code: firstUnit.code || "",
					unitType: firstUnit.types === "user" ? "user" : "company",
					chiDao: true,
					phoi: false,
					nhanDeBiet: false,
				};

				return next;
			});
			return;
		}

		const allAssignments = allUnits.map((unit) => [
			getAssignmentKey(unit._id || unit.id, "main"),
			{
				id: unit._id || unit.id || "",
				key: getAssignmentKey(unit._id || unit.id, "main"),
				source: "main",
				name: unit.name || "",
				code: unit.code || "",
				unitType: unit.types === "user" ? "user" : "company",
				chiDao: false,
				phoi: false,
				nhanDeBiet: false,
				position: unit.position || "",
			},
		]);

		const result = allAssignments.map(([id, assignment]) => [
			id,
			{
				...assignment,
				chiDao: key === "chiDao",
				phoi: key === "phoi",
				nhanDeBiet: key === "nhanDeBiet",
			},
		]);

		setAssignments((prev) => ({ ...prev, ...Object.fromEntries(result) }));
	};

	const handleCheckAllSuggest = (key) => {
		const allUnits = flattenUnits(dataMergeUserAndUnitSuggest).filter(
			(unit) => unit.level > 0 && unit.type !== "Ban"
		);

		if (key === "chiDao") {
			if (allUnits.length === 0) return;
			const firstUnit = allUnits[0];
			const firstId = firstUnit._id || firstUnit.id;
			const firstKey = getAssignmentKey(firstId, "suggest");

			setAssignments((prev) => ({
				...prev,
				[firstKey]: {
					id: firstId,
					key: firstKey,
					source: "suggest",
					name: firstUnit.name || "",
					code: firstUnit.code || "",
					unitType: firstUnit.types === "user" ? "user" : "company",
					chiDao: true,
					phoi: false,
					nhanDeBiet: false,
				},
			}));
			return;
		}

		const newEntries = Object.fromEntries(
			allUnits.map((unit) => {
				const id = unit._id || unit.id;
				return [
					getAssignmentKey(id, "suggest"),
					{
						id,
						key: getAssignmentKey(id, "suggest"),
						source: "suggest",
						name: unit.name || "",
						code: unit.code || "",
						unitType: unit.types === "user" ? "user" : "company",
						position: unit.position || "",
						chiDao: key === "chiDao",
						phoi: key === "phoi",
						nhanDeBiet: key === "nhanDeBiet",
					},
				];
			})
		);

		setAssignments((prev) => ({ ...prev, ...newEntries }));
	};

	const handleCancelCheckAll = useCallback((type) => {
		setAssignments((prev) => {
			if (!type) {
				return {};
			}

			// Ch�0 xóa các assignment c� type ��c ch�0 ��9nh, giữ lại các assignment khác
			const updatedAssignments = {};
			Object.entries(prev || {}).forEach(([key, assignment]) => {
				// N�u assignment c� type n�y, ki�m tra xem c� type khác không
				if (assignment[type]) {
					// Tạo assignment m�:i không có� type n�y
					const newAssignment = {
						...assignment,
						[type]: false,
					};

					// Chỉ giữ lại nếu còn ít nhất một type khác (chiDao, phoi, hoặc nhanDeBiet)
					if (
						newAssignment.chiDao ||
						(type !== "phoi" && newAssignment.phoi) ||
						(type !== "nhanDeBiet" && newAssignment.nhanDeBiet)
					) {
						updatedAssignments[key] = newAssignment;
					}
					// N�u không cóòn type n�o thì không thêm vào (xóa assignment)
				} else {
					// Giữ nguyên assignment không có� type n�y
					updatedAssignments[key] = assignment;
				}
			});

			return updatedAssignments;
		});
	}, []);

	const handleSearch = (e) => {
		setSearch(e.target.value);
	};

	const handleClose = () => {
		onCloseDialog();
		setAssignments({});
		setSearch("");
		reset();
	};

	const handleCheckAllOfUnit = useCallback((unit, type) => {
		// Kh�ng t� �ng l�y con �Ồ check h�ng lo�t nữa
		const allChildUnits = [];

		setAssignments((prev) => {
			const updatedAssignments = { ...prev };
			const isChecking = !isChecked(unit, type);

			// N�u là chiDao (X� l� ch�nh), ch�0 d�ng ��c nếu canSelectMultiple hoặc tương �ương
			// Nhưng thường thì Nh�n � bi�t và Ph�i hợp m�:i d�ng chọn h�ng lo�t

			allChildUnits.forEach(u => {
				const uId = u._id || u.id;
				const uKey = getAssignmentKey(uId);

				if (isChecking) {
					// Ch�p nh�n chọn cả người d�ng và các ph�ng ban trung gian �Ồ hi�n th� �ng b�
					updatedAssignments[uKey] = {
						id: uId,
						key: uKey,
						name: u.name || "",
						code: u.code || "",
						unitType: u.types === "user" ? "user" : "company",
						parentId: u.parentId || u.parent,
						chiDao: type === "chiDao",
						phoi: type === "phoi",
						nhanDeBiet: type === "nhanDeBiet",
					};
				} else {
					// Bỏ chọn: ch�0 bϏ chọn loại �ang xét c�a con
					if (updatedAssignments[uKey]) {
						updatedAssignments[uKey][type] = false;
						if (!updatedAssignments[uKey].chiDao && !updatedAssignments[uKey].phoi && !updatedAssignments[uKey].nhanDeBiet) {
							delete updatedAssignments[uKey];
						}
					}
				}
			});

			// C�p nh�t tr�ng th�i cho ch�nh n�
			const unitId = unit._id || unit.id;
			const unitKey = getAssignmentKey(unitId);
			if (isChecking) {
				updatedAssignments[unitKey] = {
					id: unitId,
					key: unitKey,
					name: unit.name || "",
					code: unit.code || "",
					unitType: "company",
					parentId: unit.parentId || unit.parent,
					chiDao: type === "chiDao",
					phoi: type === "phoi",
					nhanDeBiet: type === "nhanDeBiet",
				};
			} else {
				if (updatedAssignments[unitKey]) {
					updatedAssignments[unitKey][type] = false;
					if (!updatedAssignments[unitKey].chiDao && !updatedAssignments[unitKey].phoi && !updatedAssignments[unitKey].nhanDeBiet) {
						delete updatedAssignments[unitKey];
					}
				}
			}

			return updatedAssignments;
		});
	}, [isChecked]);

	const handleCheckboxChangeMain = useCallback(
		(unitId, type, unitType, item) => {
			handleCheckboxChange(unitId, type, unitType, item, "main");
		},
		[handleCheckboxChange]
	);

	const handleCheckboxChangeSuggest = useCallback(
		(unitId, type, unitType, item) => {
			handleCheckboxChange(unitId, type, unitType, item, "suggest");
		},
		[handleCheckboxChange]
	);

	const isCheckedMain = useCallback(
		(item, type) => isChecked(item, type, "main"),
		[isChecked]
	);

	const isCheckedSuggest = useCallback(
		(item, type) => isChecked(item, type, "suggest"),
		[isChecked]
	);

	return (
		<>
			<PremiumDrawer
				anchor="right"
				open={open}
				onClose={onClose}
				transitionDuration={400}
				container={inline ? undefined : (drawerContainer || undefined)}
				isContained={isContainedDrawer || inline}
				inline={inline}
				hideBackdrop={inline}
				variant={inline ? "persistent" : "temporary"}
				ModalProps={{
					keepMounted: true,
					disableScrollLock: true,
					disableAutoFocus: isContainedDrawer || inline,
					disableEnforceFocus: isContainedDrawer || inline,
					disableRestoreFocus: isContainedDrawer || inline,
				}}
			>
				<PanelContent>
					<StyledLeftPanel show={!showRightPanel}>
						<PanelHeaderWrapper>
							<PanelHeaderTitleGroup>
								<StyledHeaderIcon />
								<StyledHeaderTitle variant="h6">
									{label}
								</StyledHeaderTitle>
							</PanelHeaderTitleGroup>
							{isMobileOrTablet && (
								<StyledMobileToggle onClick={handleTogglePanel} size="small">
									<SwapHoriz />
								</StyledMobileToggle>
							)}
						</PanelHeaderWrapper>
						<PanelBody>
							<SearchWrapper>
								<Input
									size="small"
									fullWidth
									placeholder="Tìm kiếm đơn vị, cá nhân..."
									onChange={handleSearch}
									value={search}
									autoFocus
								/>
							</SearchWrapper>

							<TreeWrapper>
								<RenderTableTreeSubmitProposal
									isMobileOrTablet={isMobileOrTablet}
									data={dataMergeUserAndUnit}
									canTransferRoom={canTransferRoom}
									isChecked={isCheckedMain}
									handleCheckboxChange={handleCheckboxChangeMain}
									assignments={assignments}
									checkIfAncestorSelected={checkIfAncestorSelectedMain}
									onCheckAll={handleCheckAll}
									onCancelCheckAll={handleCancelCheckAll}
									canSetViewer={flagsProcess.canSetViewer}
									canSetSupporter={flagsProcess.canSetSupporter || canProcessSupport}
									canSetProcessor={flagsProcess.canSetProcessor && !canProcessSupport}
									canTransferRooms
									canTransferOption={flagsProcess?.canTransferOption}
									secType
									checkTransfer={checkTransfer?.transfer}
									control={control}
									DatePicker={DatePicker}
									errors={errors}
									setDeadlineError={setDeadlineError}
									titleMain={"Xin ý kiến"}
									maxDepthLevel={maxDepthLevel}
									open={open}
									autoExpandTree
								/>
							</TreeWrapper>

							{dataMergeUserAndUnitSuggest && dataMergeUserAndUnitSuggest.length > 0 && (
								<SuggestionSectionWrapper>
									<StyledSuggestLabel variant="subtitle2">
										Gợi ý danh sách đơn vị/cá nhân
									</StyledSuggestLabel>
									<SuggestTreeWrapper>
										<RenderTableTreeSubmitProposal
											isMobileOrTablet={isMobileOrTablet}
											data={dataMergeUserAndUnitSuggest}
											canTransferRoom={canTransferRoom}
											isChecked={isCheckedSuggest}
											handleCheckboxChange={handleCheckboxChangeSuggest}
											assignments={assignments}
											checkIfAncestorSelected={checkIfAncestorSelectedSuggest}
											onCheckAll={handleCheckAllSuggest}
											onCancelCheckAll={handleCancelCheckAll}
											canTransferRooms={canTransferRooms || canTransferRoom}
											canTransferOption={false}
											hideCheckboxes={false}
											checkTransfer={checkTransfer?.transfer}
											chiDao={chiDao}
											actionsBySub={actionsBySub}
											label={label}
											isNhanDeBiet={isNhanDeBiet}
											onCheckAllChild={handleCheckAllOfUnit}
											control={control}
											DatePicker={DatePicker}
											errors={errors}
											setDeadlineError={setDeadlineError}
											canSetViewer
											canSetSupporter
											canSetProcessor
											titleMain={"Xử lý chính"}
											disabledUserIds={selectedMainUserIds}
											maxDepthLevel={maxDepthLevel}
											open={open}
											isSuggest
										/>
									</SuggestTreeWrapper>
								</SuggestionSectionWrapper>
							)}
						</PanelBody>
					</StyledLeftPanel>

					<StyledRightPanel show={showRightPanel || !isMobileOrTablet}>
						<PanelHeaderWrapper>
							<PanelHeaderTitleGroup>
								<StyledHeaderIcon />
								<StyledHeaderTitle variant="h6">
									Danh sách đã chọn tham gia
								</StyledHeaderTitle>
							</PanelHeaderTitleGroup>
							{isMobileOrTablet && (
								<StyledMobileToggle onClick={handleTogglePanel} size="small">
									<SwapHoriz />
								</StyledMobileToggle>
							)}
						</PanelHeaderWrapper>
						<PanelBody $noPadding>
							<ListUnitsUserSubmitProposal
								assignedList={assignedList}
								removeAssignment={removeAssignment}
								Input={Input}
								Button={Button}
								onCloseDialog={handleClose}
								getRoleColor={getRoleColor}
								handleSubmit={handleSubmit(onSubmit)}
								control={control}
								deadlineError={deadlineError}
								isSuggestion
								enableInlineFooter
							/>
						</PanelBody>
					</StyledRightPanel>
				</PanelContent>
			</PremiumDrawer>

			<LoadingDialog open={loading || loadingTranfer || loadingUsers}>
				<LoadingContent>
					Đang tải dữ liệu, vui lòng chờ trong giây lát...
				</LoadingContent>
			</LoadingDialog>
		</>
	);
};

SubmitProposal.propTypes = {
	sharedComponents: PropTypes.object,
	open: PropTypes.bool,
	label: PropTypes.string,
	onClose: PropTypes.func,
	onCloseAppBar: PropTypes.func,
	onCloseDialog: PropTypes.func,
	docId: PropTypes.string,
	selectedFullRows: PropTypes.array,
	dataDetail: PropTypes.object,
	onSubmit: PropTypes.func,
	isCXL: PropTypes.bool,
	isDXXL: PropTypes.bool,
	panelContainerRef: PropTypes.shape({
		current: PropTypes.instanceOf(typeof Element !== "undefined" ? Element : Object),
	}),
};

SubmitProposal.displayName = "SubmitProposal";

export default memo(withSharedComponents(SubmitProposal));