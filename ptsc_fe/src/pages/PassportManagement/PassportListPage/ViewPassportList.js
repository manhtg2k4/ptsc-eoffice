import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CircularProgress, Grid, Typography } from "@mui/material";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { useToast } from "@components/common/ToastProvider";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { FileViewerDialog } from "@components/CustomDialog";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";
import UploadFile from "@components/UploadFile";
import { StyledBoxContainerContent } from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import {
	defaultValuePassportListPage,
	passportListPageSchema,
} from "./constantsPassportListPage";
import { API_GET_PASSPORT_EMPLOYEES } from "@EnvironmentFile/constants/urlConfig";
import {
	deletePassPortListPage,
	detailPassPortListPage,
	getDataHistoryPassport,
	remindExpiryPassports,
} from "@redux/slices/PassportManagement/PassportManagementSlice";
import EditPassportList from "./EditPassportList";
import AddMyRequest from "@pages/PassportManagement/RequestListPage/components/AddMyRequest";
import {
	MarginBox,
	ReasonText,
	SecondaryTypography,
	StatusWrapper,
	TimelineItem,
	TimelineText,
	TimelineTitle,
	TimelineWrapper,
	TitleBox,
} from "@pages/RecommendationsPage/components/RecommendationsForm.styles";
import { HistoryCardPassport } from "@styles/PassportManagement.styles";
import DOMPurify from "dompurify";
import withFormWrapper from "@components/common/FormWrapper";
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";
import { StyledSectionTitle, StyledTitleWithToggle } from "@styles/RecordDestruction/RecordDestruction.styles";
import { FileIconSvg } from "@assets/icons/FileIconSvg";
import { StyledLoadingPopupSignDigital } from "@styles/UploadFile/UploadFile.style";

const ViewPassportList = (props) => {
	const {
		open,
		onClose,
		sharedComponents,
		onSuccess,
		setReloadData,
		// mode = "add",
		title, // Nhận title từ props
	} = props;
	const {
		BaseSwipper,
		InputComponents: BaseInput,
		DatePicker: BaseDatePicker,
		ButtonOutline,
		AsyncAutoComplete: BaseAsyncAutoComplete,
		CustomAutoCompleteSearch: BaseCustomAutoCompleteSearch,
	} = sharedComponents;

	const isView = true;
	const InputComponents = useMemo(() => {
		const Wrapped = withFormWrapper(BaseInput, "input");
		const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : isView} />;
		Component.displayName = "InputComponents";
		return Component;
	}, [BaseInput, isView]);

	const DatePicker = useMemo(() => {
		const Wrapped = withFormWrapper(BaseDatePicker, "date");
		const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : isView} />;
		Component.displayName = "DatePicker";
		return Component;
	}, [BaseDatePicker, isView]);

	const AsyncAutoComplete = useMemo(() => {
		const Wrapped = withFormWrapper(BaseAsyncAutoComplete, "asyncSelect");
		const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : isView} />;
		Component.displayName = "AsyncAutoComplete";
		return Component;
	}, [BaseAsyncAutoComplete, isView]);

	const CustomAutoCompleteSearch = useMemo(() => {
		const Wrapped = withFormWrapper(BaseCustomAutoCompleteSearch, "asyncSelect");
		const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : isView} />;
		Component.displayName = "CustomAutoCompleteSearch";
		return Component;
	}, [BaseCustomAutoCompleteSearch, isView]);

	const toast = useToast();
	const dispatch = useDispatch();
	const { dataDetailPassport, dataHistoryPassport } = useSelector(
		(state) => state.passportManagement
	);
	// logger.log("dataDetailPassport", dataDetailPassport)
	// logger.log("dataHistoryPassport", dataHistoryPassport);
	const [passportNumber, setPassportNumber] = useState(null);
	const [statusPassport, setStatusPassport] = useState(null);
	const [viewingFile, setViewingFile] = useState({
		open: false,
		url: null,
		name: "",
		type: null,
	});

	const [confirmDelete, setConfirmDelete] = useState({
		open: false,
		onConfirm: null,
		title: "",
		content: "",
	});

	const [editPassportList, setEditPassportList] = useState({
		open: false,
		passportId: null,
	});
	const [openAddMyRequest, setOpenAddMyRequest] = useState(false);
	const [initialPassportData, setInitialPassportData] = useState(null);
	const [isReloadingDetail, setIsReloadingDetail] = useState(false);
	const { control, reset, watch } = useForm({
		resolver: yupResolver(passportListPageSchema),
		defaultValues: defaultValuePassportListPage,
		mode: "onChange",
	});

	const expiryDateValue = watch("expiryDate");

	const shouldShowRemindButton = useMemo(() => {
		if (!expiryDateValue) return false;
		const today = dayjs().startOf("day");
		const expDate = dayjs(expiryDateValue).startOf("day");
		if (!expDate.isValid()) return false;

		// 1. Ngày hiện tại đã quá so với ngày hết hạn (đã hết hạn)
		const isExpired = today.isAfter(expDate);

		// 2. Thời gian từ ngày hiện tại tới ngày hết hạn <= 6 tháng (sắp hết hạn trong vòng 6 tháng)
		const diffMonths = expDate.diff(today, "month", true);
		const isWithin6Months = diffMonths <= 6;

		return isExpired || isWithin6Months;
	}, [expiryDateValue]);

	useEffect(() => {
		if (!open) {
			return;
		}
		const getDataDetail = async () => {
			try {
				const id = props?.id || props?.documentId;
				// const res = await dispatch(detailPassPortListPage(id)).unwrap();
				const [res] = await Promise.all([
					dispatch(detailPassPortListPage(id)).unwrap(),
					dispatch(getDataHistoryPassport(id)).unwrap(),
				]);
				// logger.log("Chi tiết hộ chiếu:", res);
				const eofficeAccountData = res.eofficeAccount
					? {
						id: res.eofficeAccount.value,
						nameVn: res.eofficeAccount.title,
						...res.eofficeAccount,
					}
					: null;
				reset({
					...res,
					eofficeAccount: eofficeAccountData,
					rank: res?.positionTitle?.title || "",
					unitName: res?.unitName?.title || "",
					departmentName: res?.departmentName?.title || "",
					divisionName: res?.divisionName?.title || "",
					positionTitle: res?.positionTitle?.title || "",
				});
				setPassportNumber(res.passportNumber);
				setStatusPassport(res.usageStatus);
			} catch (error) {
				const errorMessage =
					error?.response?.data?.message ||
					error?.message ||
					"Có lỗi xảy ra khi lấy chi tiết hộ chiếu!";
				toast(errorMessage, "error");
				logger.log("Lỗi khi lấy chi tiết hộ chiếu:", error);
			}
		};
		getDataDetail();
	}, [dispatch, props.id, props.documentId, reset, toast, open]);

	const handleDeleteClick = useCallback(() => {
		setConfirmDelete({
			open: true,
			onConfirm: null,
			title: "Thông báo",
			content: `Bạn có chắc muốn xóa hộ chiếu ${passportNumber} này không?`,
		});
	}, [passportNumber]);

	const handleCloseConfirmDelete = useCallback(() => {
		setConfirmDelete({ open: false, onConfirm: null, title: "", content: "" });
	}, []);

	const handleCloseFileViewer = useCallback(() => {
		if (viewingFile.url) {
			URL.revokeObjectURL(viewingFile.url);
		}
		setViewingFile({ open: false, url: null, name: "", type: null });
	}, [viewingFile.url]);

	const handleClose = useCallback(async () => {
		reset(defaultValuePassportListPage);
		onClose();
	}, [onClose, reset]);

	const handleSwitchToEditMode = useCallback(() => {
		setEditPassportList({ open: true, passportId: props?.id });
	}, [props.id]);

	const handleCloseEditPassportList = useCallback(() => {
		setEditPassportList({ open: false, passportId: null });
	}, []);

	const handleEditSuccess = useCallback(async () => {
		// Đóng Edit dialog
		setEditPassportList({ open: false, passportId: null });
		// Reload data detail
		setIsReloadingDetail(true);
		try {
			const res = await dispatch(detailPassPortListPage(props?.id)).unwrap();
			reset({
				...res,
				eofficeAccount: res.eofficeAccount?.value,
			});
			setPassportNumber(res?.passportNumber);
			setStatusPassport(res?.usageStatus);
		} catch (error) {
			const errorMessage =
				error?.response?.data?.message ||
				error?.message ||
				"Có lỗi xảy ra khi reload chi tiết hộ chiếu!";
			toast(errorMessage, "error");
			logger.log("Lỗi khi reload chi tiết hộ chiếu:", error);
		} finally {
			setIsReloadingDetail(false);
		}
	}, [dispatch, props?.id, reset, toast]);

	const handleConfirmDelete = useCallback(async () => {
		try {
			const body = {
				ids: [props?.id],
			};
			await dispatch(deletePassPortListPage(body)).unwrap();
			toast("Xóa hộ chiếu thành công!", "success");
			onSuccess?.();
			setReloadData?.((prev) => !prev);
			onClose();
		} catch (error) {
			const errorMessage =
				error?.response?.data?.message ||
				error?.message ||
				"Xóa hộ chiếu thất bại!";
			toast(errorMessage, "error");

			logger.log("Lỗi khi xóa hộ chiếu:", error);
		}
	}, [dispatch, props?.id, onClose, onSuccess, setReloadData, toast]);

	const handleRemindExpiry = useCallback(async () => {
		setIsReloadingDetail(true)
		try {
			await dispatch(remindExpiryPassports(props?.id)).unwrap();
			toast("Nhắc nhở hộ chiếu sắp hết hạn thành công!", "success");
		} catch (error) {
			const errorMessage =
				error?.response?.data?.message ||
				error?.message ||
				"Nhắc nhở hộ chiếu sắp hết hạn thất bại!";
			toast(errorMessage, "error");
			logger.log("Lỗi khi nhắc nhở hộ chiếu sắp hết hạn:", error);
		} finally {
			setIsReloadingDetail(false);
		}
	}, [dispatch, props?.id, toast])

	const handleOpenAddMyRequest = useCallback(() => {
		const values = watch();
		setInitialPassportData(
			values?.passportNumber
				? {
						id: props?.id || props?.documentId,
						passportNumber: values.passportNumber,
						passportType: values.passportType,
				  }
				: null
		);
		setOpenAddMyRequest(true);
	}, [watch, props?.id, props?.documentId]);

	const handleCloseAddMyRequest = useCallback(() => {
		setOpenAddMyRequest(false);
		setInitialPassportData(null);
	}, []);
	
	const showButtonAdminPassport = useMemo(
		() => dataDetailPassport?.isAdminPassport,
		[dataDetailPassport?.isAdminPassport]
	);

	return (
		<>
		<BaseSwipper
			title={title || "Chi tiết hộ chiếu"}
			open={open}
			onClose={handleClose}
			// onSave={handleSubmit(handleSave)}
			type="update"
			hideBackdrop
			footer={
				<>
					<FlexGrowBox />
					<FooterActions>
						{statusPassport?.value === "STORING" && (
							<ButtonOutline
								onClick={handleOpenAddMyRequest}
								disabled={isReloadingDetail}
								variant="outlined"
							>
								Tạo yêu cầu mượn hộ chiếu
							</ButtonOutline>
						)}
						{showButtonAdminPassport && shouldShowRemindButton && (
							<ButtonOutline
								onClick={handleRemindExpiry}
								disabled={isReloadingDetail}
								variant="outlined"
							>
								Nhắc nhở
							</ButtonOutline>
						)}
						{showButtonAdminPassport && (
							<ButtonOutline
								onClick={handleSwitchToEditMode}
								disabled={isReloadingDetail}
								variant="outlined"
							>
								Chỉnh sửa
							</ButtonOutline>
						)}
						{showButtonAdminPassport && (
							<ButtonOutline
								variant="error"
								onClick={handleDeleteClick}
								notUppercase
							>
								Xóa
							</ButtonOutline>
						)}
					</FooterActions>
				</>
			}
		>
			<Grid container spacing={2}>
				<Grid item xs={12} md={9}>
					<StyledBoxContainerContent styledMarginTop>
						<TitleBox>
							<StyledTitleWithToggle>
								<FileIconSvg />
								<StyledSectionTitle variant="h6" noWrap>
									THÔNG TIN HỘ CHIẾU
								</StyledSectionTitle>
							</StyledTitleWithToggle>
							<StatusWrapper>
								<SecondaryTypography variant="body2">
									Trạng thái:
								</SecondaryTypography>
								<div
									dangerouslySetInnerHTML={{
										__html: DOMPurify.sanitize(`<p>${statusPassport?.title || statusPassport || ""}</p>`),
									}}
								/>
							</StatusWrapper>
						</TitleBox>
						<Grid container spacing={2} mt={2}>
							<Grid item xs={12} sm={6} md={3}>
								<Controller
									name="eofficeAccount"
									control={control}
									render={({ field }) => (
										<AsyncAutoComplete
											fullWidth
											label="Tài khoản eoffice"
											placeholder="Tìm kiếm tài khoản eoffice..."
											url={API_GET_PASSPORT_EMPLOYEES}
											queryParam="nameVn"
											optionLabel="nameVn"
											optionValue="id"
											value={field.value}
											returnObject
											size="small"
											required
											unsetFontWeight
											disabled
										/>
									)}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Controller
									name="fullName"
									control={control}
									render={({ field }) => (
										<InputComponents
											label="Họ và tên"
											placeholder="Nhập dữ liệu..."
											{...field}
											disabled
										/>
									)}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Controller
									name="email"
									control={control}
									render={({ field }) => (
										<InputComponents
											label="Email"
											placeholder="Nhập dữ liệu..."
											{...field}
											disabled
										/>
									)}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Controller
									name="positionTitle"
									control={control}
									render={({ field }) => (
										<InputComponents
											label="Chức danh"
											placeholder="Nhập dữ liệu..."
											{...field}
											disabled
										/>
									)}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Controller
									name="birthday"
									control={control}
									render={({ field }) => (
										<DatePicker
											label="Ngày sinh"
											value={field.value ? dayjs(field.value) : null}
											minDate={dayjs()}
											disabled
										/>
									)}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Controller
									name="gender"
									control={control}
									render={({ field }) => (
										<InputComponents
											label="Giới tính"
											placeholder="Nhập dữ liệu..."
											{...field}
											disabled
										/>
									)}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Controller
									name="identificationCard"
									control={control}
									render={({ field }) => (
										<InputComponents
											label="Số CMND/CCCD"
											placeholder="Nhập dữ liệu..."
											{...field}
											disabled
										/>
									)}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Controller
									name="phoneNumber"
									control={control}
									render={({ field }) => (
										<InputComponents
											label="Số điện thoại"
											placeholder="Nhập dữ liệu..."
											{...field}
											disabled
										/>
									)}
								/>
							</Grid>

							<Grid item xs={12} sm={6} md={3}>
								<Controller
									name="rank"
									control={control}
									render={({ field }) => (
										<InputComponents
											label="Cấp bậc"
											placeholder="Nhập dữ liệu..."
											{...field}
											disabled
										/>
									)}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Controller
									name="unitName"
									control={control}
									render={({ field }) => (
										<InputComponents
											label="Đơn vị"
											placeholder="Nhập dữ liệu..."
											{...field}
											disabled
										/>
									)}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Controller
									name="departmentName"
									control={control}
									render={({ field }) => (
										<InputComponents
											label="Phòng"
											placeholder="Nhập dữ liệu..."
											{...field}
											disabled
										/>
									)}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Controller
									name="nationality"
									control={control}
									render={({ field }) => (
										<InputComponents
											label="Quốc tịch"
											placeholder="Nhập dữ liệu..."
											{...field}
											disabled
										/>
									)}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={6}>
								<Controller
									name="address"
									control={control}
									render={({ field }) => (
										<InputComponents
											label="Địa chỉ"
											placeholder="Nhập dữ liệu..."
											{...field}
											disabled
										/>
									)}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={6}>
								<Controller
									name="passportNumber"
									control={control}
									render={({ field }) => (
										<InputComponents
											label="Số hộ chiếu"
											placeholder="Nhập dữ liệu..."
											{...field}
											required
											disabled
										/>
									)}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={6}>
								<Controller
									name="passportType"
									control={control}
									render={({ field }) => (
										<CustomAutoCompleteSearch
											select
											code="passPortType"
											label="Loại hộ chiếu"
											placeholder="Nhập dữ liệu..."
											customLabel="title"
											customValue="value"
											{...field}
											required
											unsetFontWeight
											disabled
										/>
									)}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Controller
									name="issueDate"
									control={control}
									render={({ field }) => (
										<DatePicker
											label="Ngày cấp"
											value={field.value ? dayjs(field.value) : null}
											required
											disabled
										/>
									)}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Controller
									name="expiryDate"
									control={control}
									render={({ field }) => (
										<DatePicker
											label="Ngày hết hạn"
											value={field.value ? dayjs(field.value) : null}
											required
											minDate={dayjs()}
											disabled
										/>
									)}
								/>
							</Grid>
							<Grid item xs={6}>
								<Controller
									name="issuePlace"
									control={control}
									render={({ field }) => (
										<InputComponents
											label="Nơi cấp"
											placeholder="Nhập dữ liệu..."
											{...field}
											disabled
										/>
									)}
								/>
							</Grid>
							<Grid item xs={6}>
								<Controller
									name="placeOfBirth"
									control={control}
									render={({ field }) => (
										<InputComponents
											label="Nơi sinh"
											placeholder="Nhập dữ liệu..."
											{...field}
											disabled
										/>
									)}
								/>
							</Grid>
							<Grid item xs={12}>
								<Controller
									name="countriesVisited"
									control={control}
									render={({ field }) => (
										<InputComponents
											label="Các nước đã đi"
											placeholder="Nhập dữ liệu..."
											{...field}
											disabled
										/>
									)}
								/>
							</Grid>
							<Grid item xs={12}>
								<Controller
									name="note"
									control={control}
									render={({ field }) => (
										<InputComponents
											label="Ghi chú"
											multiline
											rows={3}
											placeholder="Nhập ghi chú..."
											{...field}
											disabled
										/>
									)}
								/>
							</Grid>
						</Grid>
					</StyledBoxContainerContent>

					{/* File */}
					<StyledBoxContainerContent styledMarginTop>
						<Grid item xs={12}>
							<Controller
								name="scanFile"
								control={control}
								defaultValue={[]}
								render={({ field, fieldState }) => (
									<UploadFile
										{...field}
										customLabel={
											<StyledTitleWithToggle>
												<FileIconSvg />
												<StyledSectionTitle variant="h6" noWrap>
													HÌNH ẢNH HỘ CHIẾU
												</StyledSectionTitle>
											</StyledTitleWithToggle>
										}
										objectId={props?.id}
										objectType="scanPassport"
										id="scanFile-upload"
										editFile
										isView
										hiddenUploadAndScan
										error={!!fieldState.error}
										helperText={fieldState.error?.message}
										noneBorder
									/>
								)}
							/>
						</Grid>
					</StyledBoxContainerContent>
				</Grid>
				<Grid item xs={12} md={3}>
					<HistoryCardPassport styledMarginTop>
						<TimelineTitle variant="subtitle2">LỊCH SỬ SỬ DỤNG HỘ CHIẾU</TimelineTitle>
						<TimelineWrapper>
							{(dataHistoryPassport || []).map((history) => (
								<TimelineItem key={history.id}>
									<TimelineText variant="body2">
										{history.action || ""}
									</TimelineText>
									<MarginBox>
										<ReasonText variant="caption">
											<strong>
												{history.performerName}-{history.performerDepartment}
											</strong>
										</ReasonText>
									</MarginBox>
									<MarginBox>
										<ReasonText variant="caption">
											Thời gian: {history.performedTime}
										</ReasonText>
									</MarginBox>
									<MarginBox>
										<ReasonText variant="caption">
											Người phê duyệt: {history.approver}
										</ReasonText>
									</MarginBox>
									<MarginBox>
										<ReasonText variant="caption">
											<div
												dangerouslySetInnerHTML={{
													__html: DOMPurify.sanitize(`<p>${history?.statusPassport || ""}</p>`),
												}}
											/>
										</ReasonText>
									</MarginBox>
								</TimelineItem>
							))}
							{!dataHistoryPassport?.length && (
								<TimelineItem>
									<TimelineText variant="body2">
										Chưa có lịch sử trạng thái
									</TimelineText>
								</TimelineItem>
							)}
						</TimelineWrapper>
					</HistoryCardPassport>
				</Grid>
			</Grid>
			<FileViewerDialog
				open={viewingFile.open}
				onClose={handleCloseFileViewer}
				fileUrl={viewingFile.url}
				fileName={viewingFile.name}
				fileType={viewingFile.type}
				title={`Xem file: ${viewingFile.name}`}
			/>

			<CustomDialog
				open={confirmDelete.open}
				onClose={handleCloseConfirmDelete}
				onSave={handleConfirmDelete}
				titleButton="Xác nhận"
				title={confirmDelete.title}
				type="delete"
				disableSave={false}
				size="sm"
			>
				<Typography>{confirmDelete.content}</Typography>
			</CustomDialog>

			<EditPassportList
				open={editPassportList.open}
				onClose={handleCloseEditPassportList}
				onSuccess={handleEditSuccess}
				id={editPassportList?.passportId}
			/>
			{isReloadingDetail && (
				<StyledLoadingPopupSignDigital>
					<CircularProgress />
				</StyledLoadingPopupSignDigital>
			)}
		</BaseSwipper>
		<AddMyRequest
			open={openAddMyRequest}
			onClose={handleCloseAddMyRequest}
			title="Tạo yêu cầu mượn hộ chiếu"
			initialPassportData={initialPassportData}
		/>
		</>
	);
};

ViewPassportList.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	onEdit: PropTypes.func,
	onSuccess: PropTypes.func,
	isLoading: PropTypes.bool,
	sharedComponents: PropTypes.object,
	mode: PropTypes.string,
	title: PropTypes.string,
	documentType: PropTypes.number,
	incomingCreate: PropTypes.bool,
	setReloadData: PropTypes.func,
};

export default withSharedComponents(ViewPassportList);
