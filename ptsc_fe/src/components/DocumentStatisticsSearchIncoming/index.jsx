import React, { memo, useState, useCallback, useMemo } from "react";
import {
	Box, Grid, Typography, Paper, Button, useMediaQuery,
} from "@mui/material";

import { styled } from "@mui/material/styles";
import {
	WarningAmber,
} from "@mui/icons-material";
import {
	WarningContainer,
	WarningIconBox,
	WarningTitle,
	WarningMessage,
	WarningSecondaryMessage,
} from "@styles/DocumentStatisticsSearch/DocumentStatisticsSearch.styled";
import Input from "@components/CustomInput/CustomInputBase";
import { TABLE_COLUMNS } from "./constant";
import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";
import { useSelector, useDispatch } from "react-redux";
import CustomInput from "@components/CustomInput/CustomInput";
import CustomTable  from "@components/CustomTable/CustomTable";
import CustomDatePicker from "@components/CustomDatePicker";
import { searchIncomingDocuments } from "@redux/slices/IncomingDocument/IncommingDocSlice";
import CustomAsyncAutoComplete from "@components/CustomAsyncAutoComplete";
import dayjs from "dayjs";
import ViewIncommingDoc from "@pages/IncomingDocumentManagement/components/ViewIncommingDoc";
import withFormWrapper from "@components/common/FormWrapper";
import DateTimeRangePicker from "@components/CustomDateTimePicker/DateTimeRangePicker";
import api from "@services/api";
import { useToast } from "@components/common/ToastProvider";
import CustomDialog from "@components/CustomDialog/CustomDialog";

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

const FilterTitleText = styled(Typography)(({ theme }) => ({
	fontWeight: 700,
	color: theme.palette.text.primary,
	fontSize: "18px",
}));

const FilterActions = styled(Box)(({ theme }) => ({
	display: "flex",
	justifyContent: "flex-end",
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
	height: "44px",
	textTransform: "none",
	fontWeight: 500,
	fontSize: "14px",
	whiteSpace: "nowrap",
}));

const ClearActionButton = styled(Button)(() => ({
	color: '#2364B0',
	textTransform: "none",
	fontWeight: 500,
	fontSize: "14px",
	height: "44px",
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


const WarningText = styled(Typography)(() => ({
	padding: "8px 0",
}));







function DocumentStatisticsSearchIncoming() {
	const dispatch = useDispatch();
	const toast = useToast();
	const [isAdminUser, setIsAdminUser] = useState(false);
	const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
	const { crmSource } = useSelector((state) => state.config);

	const { loading } = useSelector((state) => state.incommingDoc);
	const sourceOptions = useMemo(() => crmSource || [], [crmSource]);

	const [searchText, setSearchText] = useState("");
	const [documentNumber, setDocumentNumber] = useState("");
	const [urgency, setUrgency] = useState(null);
	const [replyDeadlineStart, setReplyDeadlineStart] = useState(null);
	const [replyDeadlineEnd, setReplyDeadlineEnd] = useState(null);
	const [entryDate, setEntryDate] = useState(null);
	// ✅ Default: startDate = 1 năm trước, endDate = hôm nay
	const [receivedDate, setReceivedDate] = useState(() => ({
		startDate: dayjs().subtract(1, "month"),
		endDate: dayjs(),
	}));
	const [receivingMethod, setReceivingMethod] = useState(null);
	const [senderUnit, setSenderUnit] = useState(null);
	const [receiverUnit, setReceiverUnit] = useState(null);
	const [documentType, setDocumentType] = useState(null);

	const [isDeleted, setIsDeleted] = useState(false);
	const [searchTrigger, setSearchTrigger] = useState(0);
	const [viewDialog, setViewDialog] = useState({ open: false, data: null });

	const [appliedFilters, setAppliedFilters] = useState(() => {
		return {
			searchText: "",
			documentNumber: "",
			urgency: null,
			replyDeadlineStart: null,
			replyDeadlineEnd: null,
			entryDate: null,
			// ✅ appliedFilters cũng có default receivedDate
			receivedDate: {
				startDate: dayjs().subtract(1, "month"),
				endDate: dayjs(),
			},
			receivingMethod: null,
			senderUnit: null,
			receiverUnit: null,
			documentType: null,
			isDeleted: false,
		};
	});

	const handleIsDeletedSelectChange = useCallback((val) => {
		setIsDeleted(val === "true");
	}, []);


	const isMobileScreen = useMediaQuery("(max-width:600px)");

	const urgencyOptions = sourceOptions.find((item) => item.code === "S20")?.data || [];
	const documentTypeOptions = sourceOptions.find((item) => item.code === "S19")?.data || [];
	const receivingMethodOptions = sourceOptions.find((item) => item.code === "S27")?.data || [];

	const getOptionValue = useCallback((value) => {
		if (!value) return null;
		if (typeof value === "object") {
			return value._id || value.value || value.id || null;
		}
		return value;
	}, []);

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
			const deleteUrl = `${APP_BASE}/api/documents/update-status`;
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

	const handleFetchData = useCallback(
		async (params) => {
			const searchParams = {
				...params,
				page: params.page || 1,
				limit: params.limit || 10,
			};

			const formatDate = (val) => val ? dayjs(val).format("YYYY-MM-DD") : null;

			if (appliedFilters.searchText?.trim()) {
				searchParams["filter[abstractNote]"] = appliedFilters.searchText.trim();
			}

			if (appliedFilters.documentNumber?.trim()) {
				searchParams["filter[toBook]"] = appliedFilters.documentNumber.trim();
			}

			if (appliedFilters.urgency) {
				searchParams["filter[urgencyLevel]"] = getOptionValue(appliedFilters.urgency);
			}

			if (appliedFilters.replyDeadlineStart) {
				searchParams["filter[deadline][startDate]"] = formatDate(appliedFilters.replyDeadlineStart);
			} else {
				delete searchParams["filter[deadline][startDate]"];
			}
			if (appliedFilters.replyDeadlineEnd) {
				searchParams["filter[deadline][endDate]"] = formatDate(appliedFilters.replyDeadlineEnd);
			} else {
				delete searchParams["filter[deadline][endDate]"];
			}

			if (appliedFilters.entryDate) {
				searchParams["filter[toBookDate]"] = formatDate(appliedFilters.entryDate);
			}

			// ✅ Sửa: tách startDate / endDate từ receivedDate object
			if (appliedFilters.receivedDate?.startDate) {
				searchParams["filter[receiveDate][startDate]"] = formatDate(appliedFilters.receivedDate.startDate);
			} else {
				delete searchParams["filter[receiveDate][startDate]"];
			}
			if (appliedFilters.receivedDate?.endDate) {
				searchParams["filter[receiveDate][endDate]"] = formatDate(appliedFilters.receivedDate.endDate);
			} else {
				delete searchParams["filter[receiveDate][endDate]"];
			}

			if (appliedFilters.receivingMethod) {
				searchParams["filter[receiveMethod]"] = getOptionValue(appliedFilters.receivingMethod);
			}

			if (appliedFilters.senderUnit) {
				searchParams["filter[senderUnit]"] = getOptionValue(appliedFilters.senderUnit);
			}

			if (appliedFilters.receiverUnit) {
				searchParams["filter[receiverUnit]"] = getOptionValue(appliedFilters.receiverUnit);
			}

			if (appliedFilters.documentType) {
				searchParams["filter[documentType]"] = getOptionValue(appliedFilters.documentType);
			}
            
			if (appliedFilters.isDeleted) {
				searchParams["filter[isDeleted]"] = "true";
			}

			// Dispatch Redux action
			const result = await dispatch(searchIncomingDocuments(searchParams)).unwrap();

			if (result) {
				setIsAdminUser(result.isAdmin === true);
				return { data: result?.items || [], total: result?.total || 0 };
			}
			return { data: [], total: 0 };

		},
		[dispatch, appliedFilters, getOptionValue]
	);

	const handleApplySearch = useCallback(() => {
		setAppliedFilters({
			searchText,
			documentNumber,
			urgency,
			replyDeadlineStart,
			replyDeadlineEnd,
			entryDate,
			receivedDate,
			receivingMethod,
			senderUnit,
			receiverUnit,
			documentType,
			isDeleted,
		});
		setSearchTrigger((prev) => prev + 1);
	}, [
		searchText,
		documentNumber,
		urgency,
		replyDeadlineStart,
		replyDeadlineEnd,
		entryDate,
		receivedDate,
		receivingMethod,
		senderUnit,
		receiverUnit,
		documentType,
		isDeleted,
	]);


	const handleSearchTextChange = useCallback((e) => {
		setSearchText(e.target.value);
	}, []);

	const handleDocumentNumberChange = useCallback((e) => {
		setDocumentNumber(e.target.value);
	}, []);

	const handleDateRangeChange = useCallback(({ startDate, endDate }) => {
		setReplyDeadlineStart(startDate);
		setReplyDeadlineEnd(endDate);
	}, []);

	const handleResetFilter = useCallback(() => {
		const defaultReceivedDate = {
			startDate: dayjs().subtract(1, "year"),
			endDate: dayjs(),
		};
		setSearchText("");
		setDocumentNumber("");
		setUrgency(null);
		setReplyDeadlineStart(null);
		setReplyDeadlineEnd(null);
		setEntryDate(null);
		// ✅ Reset về default thay vì null
		setReceivedDate(defaultReceivedDate);
		setReceivingMethod(null);
		setSenderUnit(null);
		setReceiverUnit(null);
		setDocumentType(null);
		setIsDeleted(false);
		setAppliedFilters({
			searchText: "",
			documentNumber: "",
			urgency: null,
			replyDeadlineStart: null,
			replyDeadlineEnd: null,
			entryDate: null,
			// ✅ appliedFilters reset về default
			receivedDate: defaultReceivedDate,
			receivingMethod: null,
			senderUnit: null,
			receiverUnit: null,
			documentType: null,
			isDeleted: false,
		});
		setSearchTrigger((prev) => prev + 1);
	}, []);

	const handleReloadFromViewDialog = useCallback((updater) => {
		if (typeof updater === "function") {
			setSearchTrigger(updater);
			return;
		}
		setSearchTrigger((prev) => prev + 1);
	}, []);

	const WrapperInput = useMemo(() => {
		const Wrapped = withFormWrapper(Input, "input");
		const Component = (props) => <Wrapped {...props} />;
		Component.displayName = "WrapperInput";
		return Component;
	}, []);

	const WrapperCustomInput = useMemo(() => {
		const Wrapped = withFormWrapper(CustomInput, "input");
		const Component = (props) => <Wrapped {...props} />;
		Component.displayName = "WrapperCustomInput";
		return Component;
	}, []);

	const WrapperCustomDatePicker = useMemo(() => {
		const Wrapped = withFormWrapper(CustomDatePicker, "date");
		const Component = (props) => <Wrapped {...props} />;
		Component.displayName = "WrapperCustomDatePicker";
		return Component;
	}, []);

	const WrapperCustomAsyncAutoComplete = useMemo(() => {
		const Wrapped = withFormWrapper(CustomAsyncAutoComplete, "asyncSelect");
		const Component = (props) => <Wrapped {...props} />;
		Component.displayName = "WrapperCustomAsyncAutoComplete";
		return Component;
	}, []);

	const WrappedDateTimeRangePicker = useMemo(() => {
		const Wrapped = withFormWrapper(DateTimeRangePicker, "date");
		const Component = (props) => <Wrapped {...props} />;
		Component.displayName = "WrappedDateTimeRangePicker";
		return Component;
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
						Giao diện hiện không hỗ trợ trên thiết bị di động và màn hình máy tính bảng
					</WarningMessage>
					<WarningSecondaryMessage variant="body2">
						Vui lòng sử dụng máy tính để xem nội dung này
					</WarningSecondaryMessage>
				</WarningContainer>
			) : (
				<>
					<FilterCard elevation={0}>
						<FilterHead>
							<svg width="19" height="17" viewBox="0 0 19 17" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M17.4301 0.828125L0.830078 0.828125L7.47008 8.67992L7.47008 14.1081L10.7901 15.7681L10.7901 8.67992L17.4301 0.828125Z" stroke="#2364B0" strokeWidth="1.66" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
							<FilterTitleText>Bộ lọc tìm kiếm nâng cao</FilterTitleText>
						</FilterHead>

						<Grid container spacing={1.5}>
							{/* Hàng 1 */}
							<Grid item xs={12} sm={6} md={3}>
								<WrapperInput
									label="Từ khóa tìm kiếm"
									placeholder="Tìm số hiệu, trích yếu..."
									value={searchText}
									onChange={handleSearchTextChange}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<WrapperCustomInput
									select
									label="Độ khẩn"
									options={urgencyOptions}
									customLabel="title"
									customValue="value"
									placeholder="Chọn độ khẩn"
									value={urgency}
									onChange={setUrgency}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								{/* ✅ Đã bỏ comment value={receivedDate}, giờ hiển thị đúng default */}
								<WrappedDateTimeRangePicker
									label="Ngày VB"
									value={receivedDate}
									onChange={setReceivedDate}
									startLabel="Ngày VB (Từ)"
									endLabel="Ngày VB (Đến)"
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<WrapperInput
									label="Số văn bản"
									placeholder="Nhập số văn bản"
									value={documentNumber}
									onChange={handleDocumentNumberChange}
								/>
							</Grid>

							{/* Hàng 2 */}
							<Grid item xs={12} sm={6} md={3}>
								<WrapperCustomDatePicker
									label="Ngày vào sổ"
									value={entryDate}
									onChange={setEntryDate}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<WrappedDateTimeRangePicker
									label="Hạn trả lời"
									value={{
										startDate: replyDeadlineStart,
										endDate: replyDeadlineEnd,
									}}
									onChange={handleDateRangeChange}
									startLabel="Hạn trả lời (Từ)"
									endLabel="Hạn trả lời (Đến)"
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<WrapperCustomInput
									select
									label="Phương thức nhận"
									options={receivingMethodOptions}
									customLabel="title"
									customValue="value"
									placeholder="Chọn phương thức"
									value={receivingMethod}
									onChange={setReceivingMethod}
								/>
							</Grid>

							{/* Hàng 3 */}
							<Grid item xs={12} sm={6} md={3}>
								<WrapperCustomAsyncAutoComplete
									fullWidth
									label="Đơn vị gửi"
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
								<WrapperCustomAsyncAutoComplete
									fullWidth
									label="Đơn vị nhận"
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
								<WrapperCustomInput
									label="Loại văn bản"
									select
									value={documentType}
									onChange={setDocumentType}
									placeholder="Chọn loại văn bản"
									options={documentTypeOptions}
									customLabel="title"
									customValue="value"
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								{isAdminUser && (
									<WrapperCustomInput
										label="Trạng thái văn bản"
										select
										value={isDeleted ? "true" : "false"}
										onChange={handleIsDeletedSelectChange}
										placeholder="Chọn trạng thái"
										options={[
											{ title: "Văn bản hiện hành", value: "false" },
											{ title: "Văn bản đã xóa", value: "true" },
										]}
										customLabel="title"
										customValue="value"
									/>
								)}
							</Grid>

							<Grid item xs={12} sm={6} md={3}>
								<FilterActions>
									<SearchActionButton variant="contained" disabled={loading} onClick={handleApplySearch}>
										{loading ? "Đang tìm kiếm..." : "Tìm kiếm"}
									</SearchActionButton>
									<ClearActionButton variant="outlined" onClick={handleResetFilter}>
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
							customMaxHeight={575}
							defaultDateFilter={{
								field: "deadline",
								type: "quarter",
							}}
							styleTextAlignHeader="left"
						/>

					</StyledTableCard>

					{viewDialog.open && (
						<ViewIncommingDoc
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
							setReloadData={handleReloadFromViewDialog}
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
				</>
			)}
		</>
	);

}

DocumentStatisticsSearchIncoming.displayName = "DocumentStatisticsSearchIncoming";

export default memo(DocumentStatisticsSearchIncoming);