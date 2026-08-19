import React, { memo, useState, useCallback } from "react";
import {
	Box, Grid, Typography, Paper, Button, useMediaQuery,
	// useTheme
} from "@mui/material";

import { styled } from "@mui/material/styles";
import {
	WarningAmber,
	FilterAltOutlined,
	// DescriptionOutlined,
	// ScheduleOutlined,
	// TaskAltOutlined,
	// ErrorOutline,
} from "@mui/icons-material";
import {
	WarningContainer,
	WarningIconBox,
	WarningTitle,
	WarningMessage,
	WarningSecondaryMessage,
} from "@styles/DocumentStatisticsSearch/DocumentStatisticsSearch.styled";
import Input from "@components/CustomInput/CustomInputBase";
import { API_GET_PROCESS_OUTGOING_DOCUMENT, API_USERS_ALL, APP_BASE } from "@EnvironmentFile/constants/urlConfig";
import { useSelector, useDispatch } from "react-redux";
import CustomTable, { getDefaultDateRange } from "@components/CustomTable/CustomTable";
import CustomDateRangePicker from "@components/CustomInput/CustomDateRangePicker";
import { searchOutGoingDocuments } from "@redux/slices/OutGoingDoc/OutGoingDocSlice";
import CustomAsyncAutoComplete from "@components/CustomAsyncAutoComplete";
import dayjs from "dayjs";
import ViewDialog from "@pages/TextAway/Tab/SigningSubmissionTab/ViewDialog";
import CustomAutoCompleteSearch from "@components/CustomAutoCompleteSearch";
import { TABLE_COLUMNS } from "./constant";
import api from "@services/api";
import { useToast } from "@components/common/ToastProvider";
import CustomDialog from "@components/CustomDialog/CustomDialog";


// const OverviewStatsGrid = styled(Box)(({ theme }) => ({
// 	display: "grid",
// 	gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
// 	gap: "12px",
// 	marginBottom: "24px",
// 	[theme.breakpoints.down("md")]: {
// 		gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
// 	},
// }));

// const OverviewStatCard = styled(Box)(({ theme }) => ({
// 	backgroundColor: theme.palette.mode === "light" ? "#f8fafc" : theme.palette.background.paper,
// 	border: `1px solid ${theme.palette.mode === "light" ? "#e2e8f0" : theme.palette.divider}`,
// 	borderRadius: "12px",
// 	padding: "12px 16px",
// 	minHeight: "102px",
// 	display: "flex",
// 	flexDirection: "column",
// 	justifyContent: "space-between",
// }));

// const OverviewStatHeader = styled(Box)(() => ({
// 	display: "flex",
// 	alignItems: "center",
// 	justifyContent: "space-between",
// 	marginBottom: "4px",
// }));

// const OverviewStatLabel = styled(Typography)(() => ({
// 	fontWeight: 600,
// 	textTransform: "uppercase",
// 	letterSpacing: "0.4px",
// 	color: "#6b7280",
// 	fontSize: "11px",
// }));

// const OverviewStatIconWrap = styled(Box, {
// 	shouldForwardProp: (prop) => prop !== "iconcolor",
// })(({ iconcolor }) => ({
// 	width: "28px",
// 	height: "28px",
// 	borderRadius: "8px",
// 	display: "inline-flex",
// 	alignItems: "center",
// 	justifyContent: "center",
// 	backgroundColor: "#e8f0fe",
// 	color: iconcolor || "#2563eb",
// 	"& .MuiSvgIcon-root": {
// 		fontSize: "16px",
// 	},
// }));

// const OverviewStatValue = styled(Typography, {
// 	shouldForwardProp: (prop) => prop !== "valuecolor",
// })(({ valuecolor }) => ({
// 	fontSize: "1.75rem",
// 	fontWeight: 700,
// 	lineHeight: 1.2,
// 	color: valuecolor || "#0f172a",
// }));

// const OverviewStatSubText = styled(Typography)(() => ({
// 	color: "#9ca3af",
// 	fontWeight: 500,
// 	marginTop: "2px",
// 	fontSize: "12px",
// }));

const FilterCard = styled(Paper)(({ theme }) => ({
	padding: "20px",
	[theme.breakpoints.down("md")]: {
		padding: "16px",
	},
	[theme.breakpoints.down("sm")]: {
		padding: "12px",
	},
	borderRadius: "10px",
	border: `1px solid ${theme.palette.divider}`,
	marginBottom: "16px",
	backgroundColor: theme.palette.background.paper,
}));

const FilterHead = styled(Box)(() => ({
	display: "flex",
	alignItems: "center",
	gap: "8px",
	marginBottom: "16px",
}));

const FilterHeadIcon = styled(FilterAltOutlined)(({ theme }) => ({
	fontSize: "20px",
	color: theme.palette.primary.main,
}));

const FilterTitleText = styled(Typography)(({ theme }) => ({
	fontWeight: 700,
	color: theme.palette.text.primary,
	fontSize: "15px",
}));

const FilterActions = styled(Box)(({ theme, isCompact }) => ({
	display: "flex",
	justifyContent: isCompact ? 'flex-start' : "flex-end",
	alignItems: "flex-end",
	gap: "8px",
	height: "100%",
	[theme.breakpoints.down("md")]: {
		justifyContent: "flex-start",
		marginTop: "8px",
	},
}));

const SearchActionButton = styled(Button)(() => ({
	minWidth: "120px",
	height: "40px",
	textTransform: "none",
	fontWeight: 600,
	whiteSpace: "nowrap",
}));


const ClearActionButton = styled(Button)(() => ({
	color: '#2364B0',
	textTransform: "none",
	fontWeight: 500,
	fontSize: "14px",
	height: "40px",
	minWidth: "105px",
	padding: "0 16px",
	whiteSpace: "nowrap",
}));

const StyledTableCard = styled(Paper)(({ theme }) => ({
	borderRadius: "10px",
	border: `1px solid ${theme.palette.divider}`,
	overflowX: "auto",
	maxWidth: "100%",
	backgroundColor: theme.palette.background.paper,
}));

const RootSurface = styled(Paper)(({ theme }) => ({
	backgroundColor: theme.palette.background.default,
}));

const WarningText = styled(Typography)(() => ({
	padding: "8px 0",
}));






// const kpiCards = [
// 	{
// 		title: "Tổng văn bản đi",
// 		value: "1,284",
// 		subText: "+12% so với tháng trước",
// 		icon: DescriptionOutlined,
// 		valueColor: "#0f172a",
// 		iconColor: "#2563eb",
// 	},
// 	{
// 		title: "Đang xử lý",
// 		value: "86",
// 		subText: "24 văn bản khẩn",
// 		icon: ScheduleOutlined,
// 		valueColor: "#1d4ed8",
// 		iconColor: "#1d4ed8",
// 	},
// 	{
// 		title: "Đã hoàn thành",
// 		value: "1,142",
// 		subText: "Tỷ lệ 89% đúng hạn",
// 		icon: TaskAltOutlined,
// 		valueColor: "#059669",
// 		iconColor: "#2563eb",
// 	},
// 	{
// 		title: "Quá hạn",
// 		value: "56",
// 		subText: "Cần xử lý ngay",
// 		icon: ErrorOutline,
// 		valueColor: "#ef4444",
// 		iconColor: "#2563eb",
// ];

function DocumentStatisticsSearchOutGoing() {
	// const theme = useTheme();
	// const isSmallCard = useMediaQuery(theme.breakpoints.down(768));
	const dispatch = useDispatch();
	const toast = useToast();
	const [isAdminUser, setIsAdminUser] = useState(false);
	const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
	const [isDeleted, setIsDeleted] = useState(false);
	const { loading } = useSelector((state) => state.outGoingDoc);

	const [searchText, setSearchText] = useState("");
	const [drafter, setDrafter] = useState(null);
	const [reportSigner, setReportSigner] = useState("");
	const [urgency, setUrgency] = useState(null);
	const [releaseDateRange, setReleaseDateRange] = useState({ startDate: null, endDate: null });
	const [createdAtRange, setCreatedAtRange] = useState(() => {
		const range = getDefaultDateRange({ field: "created_at", type: "current_month" });
		return { startDate: range.startDate, endDate: range.endDate };
	});
	const [senderUnit, setSenderUnit] = useState(null);
	const [receiverUnit, setReceiverUnit] = useState(null);
	const [documentType, setDocumentType] = useState(null);
	const [processType, setProcessType] = useState(null);
	const [searchTrigger, setSearchTrigger] = useState(0);
	const isCompact = useMediaQuery("(max-width:1200px)");
	const [viewDialog, setViewDialog] = useState({ open: false, data: null });
	const [appliedFilters, setAppliedFilters] = useState(() => {
		const range = getDefaultDateRange({ field: "created_at", type: "current_month" });
		return {
			searchText: "",
			drafter: null,
			reportSigner: null,
			urgency: null,
			releaseDateStart: null,
			releaseDateEnd: null,
			createdAtStart: range.startDate,
			createdAtEnd: range.endDate,
			documentType: null,
			senderUnit: null,
			receiverUnit: null,
			processType: null,
			isDeleted: false,
		};
	});

	const handleIsDeletedSelectChange = useCallback((val) => {
		setIsDeleted(val === "true");
	}, []);




	const isMobileScreen = useMediaQuery("(max-width:600px)");

	const handleDeleteClick = useCallback((row) => {
		const docId = row?.documentId || row?.document_id || row?.id || row?._id;
		if (docId) {
			setDeleteDialog({ open: true, id: docId });
		}
	}, []);

	const handleCancelDelete = useCallback(() => {
		setDeleteDialog({ open: false, id: null });
	}, []);

	const handleConfirmDelete = useCallback(async () => {
		if (!deleteDialog.id) return;
		try {
			const deleteUrl = `${APP_BASE}/api/documents/delete-outgoing-document`;
			await api.delete(deleteUrl, { data: { ids: [deleteDialog.id] } });
			toast("Xóa văn bản thành công!", "success");
			setDeleteDialog({ open: false, id: null });
			setSearchTrigger((prev) => prev + 1);
		} catch (error) {
			toast(error?.response?.data?.message || "Có lỗi xảy ra khi xóa văn bản.", "error");
			setDeleteDialog({ open: false, id: null });
		}
	}, [deleteDialog.id, toast]);

	const handleOpenViewDialog = useCallback((id, row) => {
		const target = (row && typeof row === "object") ? row : ((id && typeof id === "object") ? id : null);
		const docId =
			target?.documentId ||
			target?.document_id ||
			target?._id ||
			target?.id ||
			(typeof id === "string" ? id : (typeof row === "string" ? row : null));
		if (!docId) return;
		setViewDialog({ open: true, data: docId });
	}, []);

	const handleCloseViewDialog = useCallback(() => {

		setViewDialog({ open: false, data: null });
	}, []);

	const getOptionValue = useCallback((value) => {
		if (!value) return null;
		if (typeof value === "object") {
			return value._id || value.value || value.id || null;
		}
		return value; 
	}, []);

	// API fetch function for CustomTable
	const handleFetchData = useCallback(
		async (params) => {
			const searchParams = {
				...params,
				page: params.page || 1,
				limit: params.limit || 10,
			};

			const formatDate = (val) => val ? dayjs(val).format("YYYY-MM-DD") : null;

			// Add search keyword if available
			if (appliedFilters.searchText?.trim()) {
				searchParams["filter[abstract_note]"] = appliedFilters.searchText.trim();
				searchParams["filter[document_code]"] = appliedFilters.searchText.trim();
			}

			const drafterValue =
				typeof appliedFilters.drafter === "string"
					? appliedFilters.drafter.trim()
					: getOptionValue(appliedFilters.drafter);

			const reportSignerValue =
				typeof appliedFilters.reportSigner === "string"
					? appliedFilters.reportSigner.trim()
					: getOptionValue(appliedFilters.reportSigner);

			if (drafterValue) {
				searchParams["filter[drafter]"] = drafterValue;
			}

			if (reportSignerValue) {
				searchParams["filter[report_signer]"] = reportSignerValue;
			}

			if (appliedFilters.urgency) {
				searchParams["filter[urgency_level]"] = getOptionValue(appliedFilters.urgency);
			}

			if (appliedFilters.releaseDateStart) {
				searchParams["filter[release_date][startDate]"] = formatDate(appliedFilters.releaseDateStart);
			} else {
				delete searchParams["filter[release_date][startDate]"];
			}
			if (appliedFilters.releaseDateEnd) {
				searchParams["filter[release_date][endDate]"] = formatDate(appliedFilters.releaseDateEnd);
			} else {
				delete searchParams["filter[release_date][endDate]"];
			}

			if (appliedFilters.createdAtStart) {
				searchParams["filter[created_at][startDate]"] = formatDate(appliedFilters.createdAtStart);
			} else {
				delete searchParams["filter[created_at][startDate]"];
			}
			if (appliedFilters.createdAtEnd) {
				searchParams["filter[created_at][endDate]"] = formatDate(appliedFilters.createdAtEnd);
			} else {
				delete searchParams["filter[created_at][endDate]"];
			}

			if (appliedFilters.documentType) {
				searchParams["filter[document_type]"] = getOptionValue(appliedFilters.documentType);
			}

			if (appliedFilters.processType) {
				searchParams["filter[type_of_process]"] = getOptionValue(appliedFilters.processType);
			}

			if (appliedFilters.senderUnit) {
				searchParams["filter[sender_unit]"] = getOptionValue(appliedFilters.senderUnit);
			}

			if (appliedFilters.receiverUnit) {
				searchParams["filter[receiver_unit]"] = getOptionValue(appliedFilters.receiverUnit);
			}

			if (appliedFilters.isDeleted) {
				searchParams["filter[isDeleted]"] = "true";
			}

			// Dispatch Redux action
			const result = await dispatch(searchOutGoingDocuments(searchParams)).unwrap();

			if (result) {
				setIsAdminUser(result.isAdmin === true);
				return { data: result?.items || [], total: result?.total || 0 };
			}
			return { data: [], total: 0 };

		},
		[
			dispatch,
			appliedFilters,
			getOptionValue,
		]
	);

	const handleApplySearch = useCallback(() => {
		setAppliedFilters({
			searchText,
			drafter,
			reportSigner,
			urgency,
			releaseDateStart: releaseDateRange.startDate,
			releaseDateEnd: releaseDateRange.endDate,
			createdAtStart: createdAtRange.startDate,
			createdAtEnd: createdAtRange.endDate,
			documentType,
			senderUnit,
			receiverUnit,
			processType,
			isDeleted,
		});
		setSearchTrigger((prev) => prev + 1);
	}, [
		searchText,
		drafter,
		reportSigner,
		urgency,
		releaseDateRange,
		createdAtRange,
		documentType,
		senderUnit,
		receiverUnit,
		processType,
		isDeleted,
	]);


	const handleSearchTextChange = useCallback((e) => {
		setSearchText(e.target.value);
	}, []);

	// const handleDrafterChange = useCallback((e) => {
	// 	setDrafter(e.target.value);
	// }, []);

	// const handleReportSignerChange = useCallback((e) => {
	// 	setReportSigner(e.target.value);
	// }, []);

	const handleReleaseDateRangeChange = useCallback((rangeValue) => {
		setReleaseDateRange({
			startDate: rangeValue?.[0] || null,
			endDate: rangeValue?.[1] || null,
		});
	}, []);

	const handleCreatedAtRangeChange = useCallback((rangeValue) => {
		setCreatedAtRange({
			startDate: rangeValue?.[0] || null,
			endDate: rangeValue?.[1] || null,
		});
	}, []);

	const handleResetFilter = useCallback(() => {
		const range = getDefaultDateRange({ field: "created_at", type: "current_month" });
		setSearchText("");
		setDrafter(null);
		setReportSigner("");
		setUrgency(null);
		setReleaseDateRange({ startDate: null, endDate: null });
		setCreatedAtRange({ startDate: range.startDate, endDate: range.endDate });
		setDocumentType(null);
		setSenderUnit(null);
		setReceiverUnit(null);
		setProcessType(null);
		setIsDeleted(false);
		setAppliedFilters({
			searchText: "",
			drafter: null,
			reportSigner: null,
			urgency: null,
			releaseDateStart: null,
			releaseDateEnd: null,
			createdAtStart: range.startDate,
			createdAtEnd: range.endDate,
			documentType: null,
			senderUnit: null,
			receiverUnit: null,
			processType: null,
			isDeleted: false,
		});
		setSearchTrigger((prev) => prev + 1);
	}, []);

	return (
		<>
			{isMobileScreen ? (
				<WarningContainer>
					<WarningIconBox>
						<WarningAmber />
					</WarningIconBox>
					<WarningTitle variant="h5">Thông báo</WarningTitle>
					<WarningMessage variant="body1">
						Giao diện hiện không hỗ trợ trên thiết bị di động
					</WarningMessage>
					<WarningSecondaryMessage variant="body2">
						Vui lòng sử dụng máy tính hoặc máy tính bảng để xem nội dung này
					</WarningSecondaryMessage>
				</WarningContainer>
			) : (
				<RootSurface>
					<FilterCard elevation={0}>
						<FilterHead>
							<FilterHeadIcon />
							<FilterTitleText>Bộ lọc tìm kiếm nâng cao</FilterTitleText>
						</FilterHead>

						<Grid container spacing={1.5}>
							<Grid item xs={12} sm={6} md={3}>
								<Input
									placeholder="Tìm số hiệu, trích yếu..."
									value={searchText}
									onChange={handleSearchTextChange}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<CustomAsyncAutoComplete
									fullWidth
									label="Đơn vị soạn thảo"
									url={`${APP_BASE}/api/organization-units`}
									queryParam="name"
									optionLabel="name"
									optionValue="_id"
									limit={20}
									placeholder="Chọn đơn vị"
									value={senderUnit}
									onChange={setSenderUnit}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<CustomAsyncAutoComplete
									fullWidth
									label="Người soạn thảo"
									url={`${API_USERS_ALL}`}
									queryParam="name"
									optionLabel="name"
									optionValue="id"
									limit={20}
									placeholder="Chọn người soạn thảo"
									value={drafter}
									onChange={setDrafter}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<CustomAutoCompleteSearch
									select
									code="S19"
									value={documentType}
									label="Loại văn bản"
									placeholder="Chọn loại văn bản"
									customLabel="title"
									customValue="value"
									unsetFontWeight
									onChange={setDocumentType}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<CustomAutoCompleteSearch
									select
									code="S20"
									value={urgency}
									label="Độ khẩn"
									placeholder="Chọn độ khẩn"
									customLabel="title"
									customValue="value"
									unsetFontWeight
									onChange={setUrgency}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<CustomAsyncAutoComplete
									fullWidth
									label="Người ký phát hành"
									url={`${API_USERS_ALL}`}
									queryParam="name"
									optionLabel="name"
									optionValue="id"
									limit={20}
									placeholder="Chọn người ký phát hành"
									value={reportSigner}
									onChange={setReportSigner}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<CustomAsyncAutoComplete
									fullWidth
									label="Đơn vị nhận nội bộ"
									url={`${APP_BASE}/api/organization-units`}
									queryParam="name"
									optionLabel="name"
									optionValue="_id"
									limit={20}
									placeholder="Chọn đơn vị"
									value={receiverUnit}
									onChange={setReceiverUnit}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<CustomDateRangePicker
									label="Ngày soạn thảo"
									start={createdAtRange.startDate}
									end={createdAtRange.endDate}
									onChange={handleCreatedAtRangeChange}
									styledMaxWidth="100%"
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<CustomDateRangePicker
									label="Ngày ban hành"
									start={releaseDateRange.startDate}
									end={releaseDateRange.endDate}
									onChange={handleReleaseDateRangeChange}
									styledMaxWidth="100%"
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<CustomAsyncAutoComplete
									fullWidth
									label="Loại quy trình"
									url={`${API_GET_PROCESS_OUTGOING_DOCUMENT}`}
									queryParam="name"
									optionLabel="name"
									optionValue="id"
									limit={20}
									placeholder="Chọn loại quy trình"
									value={processType}
									onChange={setProcessType}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								{isAdminUser && (
									<CustomAutoCompleteSearch
										select
										value={isDeleted ? "true" : "false"}
										label="Trạng thái văn bản"
										placeholder="Chọn trạng thái"
										options={[
											{ title: "Văn bản hiện hành", value: "false" },
											{ title: "Văn bản đã xóa", value: "true" },
										]}
										customLabel="title"
										customValue="value"
										unsetFontWeight
										onChange={handleIsDeletedSelectChange}
									/>
								)}
							</Grid>


							<Grid item xs={12} sm={6} md={isCompact ? 4 : 3}>
								<FilterActions isCompact={isCompact}>
									<SearchActionButton
										variant="contained"
										disabled={loading}
										onClick={handleApplySearch}
									>
										{loading ? "Đang tìm kiếm..." : "Tìm kiếm"}
									</SearchActionButton>

									<ClearActionButton
										variant="outlined"
										onClick={handleResetFilter}
									>
										Xóa lọc
									</ClearActionButton>
								</FilterActions>
							</Grid>
						</Grid>
					</FilterCard>

					<StyledTableCard elevation={0}>
						<CustomTable
							fetchData={handleFetchData}
							refreshTrigger={searchTrigger}
							columns={TABLE_COLUMNS}
							codeModule='TABLE_COLUMNS_STATIC_OUTGOING_DOCUMENT_V2'
							type="custom"
							onlyTable
							paginationProps
							isMaxHeight
							fixedHeight
							disableSynchronize
							disableAdd
							disableEdit
							disableDelete={!isAdminUser}
							disableFilter
							onView={handleOpenViewDialog}
							onRowDelete={handleDeleteClick}
							isSettingColumn

							customMaxHeight={514}
							defaultDateFilter={{
								field: "created_at",
								type: "current_month"
							}}
						/>
					</StyledTableCard>

					{viewDialog.open && (
						<ViewDialog
							open={viewDialog.open}
							onClose={handleCloseViewDialog}
							documentId={
								typeof viewDialog?.data === "string"
									? viewDialog.data
									: (viewDialog?.data?.documentId ||
									   viewDialog?.data?.document_id ||
									   viewDialog?.data?._id ||
									   viewDialog?.data?.id)
							}
						/>
					)}

					{deleteDialog.open && (
						<CustomDialog
							open={deleteDialog.open}
							title="Xác nhận xóa"
							onClose={handleCancelDelete}
							onSave={handleConfirmDelete}
							saveButtonText="Xác nhận"
							cancelButtonText="Hủy"
							type="delete"
							size="xs"
						>
							<WarningText>
								Bạn có chắc chắn muốn xóa bản ghi này không?
							</WarningText>
						</CustomDialog>
					)}


					{/* <FooterActions>
						<CloseButton variant="contained" startIcon={<Close />}>
							Đóng
						</CloseButton>
					</FooterActions> */}
				</RootSurface>
			)}
		</>
	);
}

DocumentStatisticsSearchOutGoing.displayName = "DocumentStatisticsSearchOutGoing";

export default memo(DocumentStatisticsSearchOutGoing);
