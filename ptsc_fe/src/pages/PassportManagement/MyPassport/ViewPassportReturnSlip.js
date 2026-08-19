import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CircularProgress, Grid } from "@mui/material";
import { useToast } from "@components/common/ToastProvider";
import { useForm, Controller } from "react-hook-form";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";
import CusTomTableFreeStyle from "@components/CustomTable/CusTomTableFreeStyle";
import {
	StyledBoxContainerContent,
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import { API_GET_PASSPORT_EMPLOYEES } from "@EnvironmentFile/constants/urlConfig";
import { StyledLoadingPopupSignDigital } from "@styles/UploadFile/UploadFile.style";
import withFormWrapper from "@components/common/FormWrapper";
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";
import { StyledSectionTitle, StyledTitleWithToggle } from "@styles/RecordDestruction/RecordDestruction.styles";
import { FileIconSvg } from "@assets/icons/FileIconSvg";
import { defaultValueReturnPassportSlip } from "@pages/PassportManagement/PassportListPage/constantsPassportListPage";
import {
	TableCardContainer,
	TableCardTitle,
	TableWrapperPassport,
} from "@styles/PassportManagement.styles";
import VoucherPassportReturnSlip from "./VoucherPassportReturnSlip";
import EditPassportReturnSlip from "./EditPassportReturnSlip";
import RejectReturnSlipDialog from "./component/RejectReturnSlipDialog";
import ViewHandoverMinutes from "@pages/PassportManagement/RequestListPage/components/ViewHandoverMinutes";
import { cancelReturnPassportSlip, receiveReturnPassportSlip, rejectReturnPassportSlip, viewPassportsReturnSlip } from "@redux/slices/PassportManagement/PassportManagementSlice";
import { useDispatch, useSelector } from "react-redux";
import { SecondaryTypography, StatusWrapper, TitleBox } from "@pages/RecommendationsPage/components/RecommendationsForm.styles";
import DOMPurify from "dompurify";


const ViewPassportReturnSlip = (props) => {
	const {
		open,
		onClose,
		sharedComponents,
		title,
		id,
		isView,
		setReloadData,
	} = props;
	const {
		BaseSwipper,
		InputComponents: BaseInput,
		DatePicker: BaseDatePicker,
		ButtonOutline,
		AsyncAutoComplete: BaseAsyncAutoComplete,
	} = sharedComponents;

	const dispatch = useDispatch();
	const { dataDetailPassportsReturnSlip } = useSelector((state) => state.passportManagement);
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

	const toast = useToast();
	const [isLoading, setIsLoading] = useState(false);

	// Danh sách hộ chiếu trả lại cán bộ
	const [passportListReturn, setPassportListReturn] = useState([]);

	const {
		control,
		reset,
	} = useForm({
		defaultValues: defaultValueReturnPassportSlip,
		mode: "onChange",
	});

	const [openVoucherReturnSlip, setOpenVoucherReturnSlip] = useState(false);
	const [openEditReturnSlip, setOpenEditReturnSlip] = useState(false);
	const [openViewMinutes, setOpenViewMinutes] = useState(false);
	const [openRejectDialog, setOpenRejectDialog] = useState(false);
	const [voucherId, setVoucherId] = useState(null);
	const [refreshKey, setRefreshKey] = useState(0);

	// Load dữ liệu chi tiết khi mở modal/drawer hoặc sau khi cập nhật
	useEffect(() => {
		if (!open || !id) return;

		const fetchDetailData = async () => {
			setIsLoading(true);
			try {
				const res = await dispatch(viewPassportsReturnSlip(id)).unwrap();
				const detailData = res?.data?.data || res?.data || res;

				if (detailData) {
					setVoucherId(detailData?.voucher?.id || null);
					const formattedAccount = detailData.eofficeAccountInfo
						? {
							...detailData.eofficeAccountInfo,
							name: detailData.eofficeAccountInfo.nameVn || detailData.eofficeAccountInfo.name,
						}
						: typeof detailData.eofficeAccount === "object" && detailData.eofficeAccount !== null
							? {
								...detailData.eofficeAccount,
								name: detailData.eofficeAccount.nameVn || detailData.eofficeAccount.name,
							}
							: detailData.eofficeAccount
								? { id: detailData.eofficeAccount, name: detailData.fullName || detailData.email, nameVn: detailData.fullName }
								: null;

					const selectedReturnPassports = Array.isArray(detailData.passportListReturn) && detailData.passportListReturn.length > 0
						? detailData.passportListReturn
						: Array.isArray(detailData.items)
							? detailData.items
							: [];

					reset({
						...defaultValueReturnPassportSlip,
						eofficeAccount: formattedAccount,
						fullName: detailData.fullName || detailData.eofficeAccountInfo?.nameVn || "",
						email: detailData.email || detailData.eofficeAccountInfo?.email || "",
						positionTitle: detailData.positionTitle || "",
						birthday: detailData.birthday || null,
						gender: detailData.gender || "",
						identificationCard: detailData.identificationCard && detailData.identificationCard !== "NULL" ? detailData.identificationCard : "",
						phoneNumber: detailData.phoneNumber && detailData.phoneNumber !== "NULL" ? detailData.phoneNumber : "",
						rank: detailData.rank || "",
						unitName: detailData.unitName || "",
						departmentName: detailData.departmentName || "",
						divisionName: detailData.divisionName || "",
						address: detailData.address || "",
						nationality: detailData.nationality || "Việt Nam",
						countriesVisited: detailData.countriesVisited || "",
						note: detailData.note || "",
						passportListReturn: selectedReturnPassports,
					});
					setPassportListReturn(selectedReturnPassports);
				}
			} catch (error) {
				logger.log("Lỗi khi lấy chi tiết phiếu trả hộ chiếu:", error);
				const messageError =
					error?.response?.data?.message ||
					error.message ||
					"Không thể lấy chi tiết phiếu trả hộ chiếu!";
				toast(messageError, "error");
			} finally {
				setIsLoading(false);
			}
		};

		fetchDetailData();
	}, [dispatch, open, id, reset, toast, refreshKey]);

	// Cấu hình cột hiển thị danh sách hộ chiếu trả lại
	const passportColumns = useMemo(
		() => [
			{
				name: "passportNumber",
				title: "Số hộ chiếu",
				width: "180px",
				renderCell: ({ row }) => row?.passportNumber || "-",
			},
			{
				name: "passportType",
				title: "Loại hộ chiếu",
				width: "180px",
				renderCell: ({ row }) => {
					if (typeof row?.passportType === "object") {
						return row?.passportType?.title || row?.passportType?.name || "-";
					}
					return row?.passportType || row?.passportTypeName || "-";
				},
			},
			{
				name: "issueDate",
				title: "Ngày cấp",
				width: "150px",
				renderCell: ({ row }) => (row?.issueDate ? dayjs(row.issueDate).format("DD/MM/YYYY") : "-"),
			},
			{
				name: "expiryDate",
				title: "Ngày hết hiệu lực",
				width: "150px",
				renderCell: ({ row }) => (row?.expiryDate ? dayjs(row.expiryDate).format("DD/MM/YYYY") : "-"),
			},
		],
		[]
	);

	const handleClose = useCallback(() => {
		reset(defaultValueReturnPassportSlip);
		setPassportListReturn([]);
		onClose();
	}, [onClose, reset]);

	const handleOpenVoucherReturnSlip = useCallback(() => {
		setOpenVoucherReturnSlip(true);
	}, []);

	const handleCloseVoucherReturnSlip = useCallback((result) => {
		setOpenVoucherReturnSlip(false);
		if (result && result.signed) {
			setRefreshKey((prev) => prev + 1);
			if (setReloadData) {
				setReloadData((prev) => prev + 1);
			}
		}
	}, [setReloadData]);

	const handleOpenViewMinutes = useCallback(() => {
		setOpenViewMinutes(true);
	}, []);

	const handleCloseViewMinutes = useCallback(() => {
		setOpenViewMinutes(false);
	}, []);

	const handleOpenEditReturnSlip = useCallback(() => {
		setOpenEditReturnSlip(true);
	}, []);

	const handleCloseEditReturnSlip = useCallback(() => {
		setOpenEditReturnSlip(false);
	}, []);

	const handleSuccessEditReturnSlip = useCallback(() => {
		setOpenEditReturnSlip(false);
		setRefreshKey((prev) => prev + 1);
		if (setReloadData) {
			setReloadData((prev) => prev + 1);
		}
	}, [setReloadData]);

	const handleOpenRejectDialog = useCallback(() => {
		setOpenRejectDialog(true);
	}, []);

	const handleCloseRejectDialog = useCallback(() => {
		setOpenRejectDialog(false);
	}, []);

	const handleReceiveReturnPassportSlip = useCallback(async () => {
		try {
			setIsLoading(true);
			await dispatch(receiveReturnPassportSlip(id)).unwrap();
			toast("Tiếp nhận hoàn trả hộ chiếu thành công!", "success");
			setRefreshKey((prev) => prev + 1);
			if (setReloadData) {
				setReloadData((prev) => prev + 1);
			}
		} catch (error) {
			const errorMessage =
				error?.response?.data?.message ||
				error.message ||
				"Không thể tiếp nhận hoàn trả hộ chiếu!";
			toast(errorMessage, "error");
		} finally {
			setIsLoading(false);
		}
	}, [dispatch, id, setReloadData, toast]);

	const handleCancelReturnSlip = useCallback(async () => {
		try {
			setIsLoading(true);
			await dispatch(cancelReturnPassportSlip(id)).unwrap();
			toast("Hủy phiếu hoàn trả hộ chiếu thành công!", "success");
			setRefreshKey((prev) => prev + 1);
			if (setReloadData) {
				setReloadData((prev) => prev + 1);
			}
		} catch (error) {
			const errorMessage =
				error?.response?.data?.message ||
				error.message ||
				"Không thể tiếp nhận hoàn trả hộ chiếu!";
			toast(errorMessage, "error");
		} finally {
			setIsLoading(false);
		}
	}, [dispatch, id, setReloadData, toast]);

	const handleRejectReturnPassportSlip = useCallback(async (data) => {
		try {
			setIsLoading(true);
			await dispatch(rejectReturnPassportSlip({ id, body: { reason: data?.reason } })).unwrap();
			toast("Trả lại phiếu hoàn trả hộ chiếu thành công!", "success");
			setRefreshKey((prev) => prev + 1);
			if (setReloadData) {
				setReloadData((prev) => prev + 1);
			}
			handleCloseRejectDialog();
		} catch (error) {
			const errorMessage =
				error?.response?.data?.message ||
				error.message ||
				"Không thể trả lại phiếu hoàn trả hộ chiếu!";
			toast(errorMessage, "error");
		} finally {
			setIsLoading(false);
		}
	}, [dispatch, id, setReloadData, toast, handleCloseRejectDialog]);

	const buttonCreateVoucherReturnPassportSlip = useMemo(() => {
		return dataDetailPassportsReturnSlip?.availableActions?.find((action) => action.actionGroup === "TAO_BIEN_BAN");
	}, [dataDetailPassportsReturnSlip]);

	const buttonCancelReturnPassportSlip = useMemo(() => {
		return dataDetailPassportsReturnSlip?.availableActions?.find((action) => action.actionGroup === "HUY_PHIEU");
	}, [dataDetailPassportsReturnSlip]);

	const buttonReceiveReturnPassportSlip = useMemo(() => {
		return dataDetailPassportsReturnSlip?.availableActions?.find((action) => action.actionGroup === "TIEP_NHAN");
	}, [dataDetailPassportsReturnSlip]);

	const buttonRejectReturnPassportSlip = useMemo(() => {
		return dataDetailPassportsReturnSlip?.availableActions?.find((action) => action.actionGroup === "TRA_LAI");
	}, [dataDetailPassportsReturnSlip]);

	return (
		<>
			<BaseSwipper
				title={title || "Chi tiết phiếu trả hộ chiếu"}
				open={open}
				onClose={handleClose}
				type="view"
				hideBackdrop
				footer={
					<>
						<FlexGrowBox />
						<FooterActions>
							{!voucherId && (
								<ButtonOutline
									onClick={handleOpenEditReturnSlip}
									variant="outlined"
								>
									Chỉnh sửa
								</ButtonOutline>
							)}
							{buttonReceiveReturnPassportSlip && (
								<ButtonOutline
									onClick={handleReceiveReturnPassportSlip}
									variant="outlined"
								>
									{buttonReceiveReturnPassportSlip?.label || "Tiếp nhận"}
								</ButtonOutline>
							)}
							{voucherId && (
								<ButtonOutline
									onClick={handleOpenViewMinutes}
									variant="outlined"
								>
									Xem biên bản
								</ButtonOutline>
							)}
							{buttonCreateVoucherReturnPassportSlip && (
								<ButtonOutline
									onClick={handleOpenVoucherReturnSlip}
									variant="outlined"
								>
									{buttonCreateVoucherReturnPassportSlip?.label || "Tạo biên bản"}
								</ButtonOutline>
							)}
							{buttonCancelReturnPassportSlip && (
								<ButtonOutline
									onClick={handleCancelReturnSlip}
									variant="error"
								>
									{buttonCancelReturnPassportSlip?.label || "Hủy phiếu"}
								</ButtonOutline>
							)}
							{buttonRejectReturnPassportSlip && (
								<ButtonOutline
									onClick={handleOpenRejectDialog}
									variant="error"
								>
									{buttonRejectReturnPassportSlip?.label || "Trả lại"}
								</ButtonOutline>
							)}
						</FooterActions>
					</>
				}
				isLoading={isLoading}
			>
				{isLoading && (
					<StyledLoadingPopupSignDigital>
						<CircularProgress />
					</StyledLoadingPopupSignDigital>
				)}
				<StyledBoxContainerContent styledMarginTop>
					<TitleBox>
						<StyledTitleWithToggle>
							<FileIconSvg />
							<StyledSectionTitle variant="h6" noWrap>
								THÔNG TIN NGƯỜI
							</StyledSectionTitle>
						</StyledTitleWithToggle>
						<StatusWrapper>
							<SecondaryTypography variant="body2">
								Trạng thái:
							</SecondaryTypography>
							<div
								dangerouslySetInnerHTML={{
									__html: DOMPurify.sanitize(`<p>${dataDetailPassportsReturnSlip?.processStatus || ""}</p>`),
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
										placeholder="Tài khoản eoffice..."
										url={API_GET_PASSPORT_EMPLOYEES}
										queryParam="nameVn"
										optionLabel="nameVn"
										optionValue="id"
										value={field.value}
										returnObject
										size="small"
										disabled
										unsetFontWeight
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
										placeholder="Họ và tên..."
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
										placeholder="Email..."
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
										placeholder="Chức danh..."
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
										placeholder="Giới tính..."
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
										placeholder="Số CMND/CCCD..."
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
										placeholder="Số điện thoại..."
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
										placeholder="Cấp bậc..."
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
										placeholder="Đơn vị..."
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
										placeholder="Phòng..."
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
										placeholder="Quốc tịch..."
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
										placeholder="Địa chỉ..."
										{...field}
										disabled
									/>
								)}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={6}>
							<Controller
								name="countriesVisited"
								control={control}
								render={({ field }) => (
									<InputComponents
										label="Các nước đã đi"
										placeholder="Các nước đã đi..."
										{...field}
										disabled
									/>
								)}
							/>
						</Grid>
					</Grid>
				</StyledBoxContainerContent>

				{/* Section Bảng danh sách hộ chiếu trả lại */}
				<StyledBoxContainerContent styledMarginTop>
					<TableCardContainer variant="outlined">
						<TableCardTitle variant="h6">
							Danh sách hộ chiếu trả lại cán bộ
						</TableCardTitle>
						<TableWrapperPassport>
							<CusTomTableFreeStyle
								data={passportListReturn}
								columns={passportColumns}
								onlyTable
								noneTitle
								disableAct
								disableCheckbox
								autoHeight
							/>
						</TableWrapperPassport>
					</TableCardContainer>
				</StyledBoxContainerContent>
			</BaseSwipper>
			<VoucherPassportReturnSlip
				open={openVoucherReturnSlip}
				onClose={handleCloseVoucherReturnSlip}
				title={title || "Chi tiết phiếu trả hộ chiếu"}
				id={id}
			/>
			<EditPassportReturnSlip
				open={openEditReturnSlip}
				onClose={handleCloseEditReturnSlip}
				onSuccess={handleSuccessEditReturnSlip}
				title="Cập nhật phiếu trả hộ chiếu"
				id={id}
				setReloadData={setReloadData}
			/>
			{openViewMinutes && voucherId && (
				<ViewHandoverMinutes
					open={openViewMinutes}
					onClose={handleCloseViewMinutes}
					sharedComponents={sharedComponents}
					id={voucherId}
				/>
			)}
			<RejectReturnSlipDialog
				open={openRejectDialog}
				onClose={handleCloseRejectDialog}
				onSubmit={handleRejectReturnPassportSlip}
				isLoading={isLoading}
				titleButton={buttonRejectReturnPassportSlip?.label || "Trả lại"}
			/>
		</>
	);
};

ViewPassportReturnSlip.propTypes = {
	open: PropTypes.bool,
	onClose: PropTypes.func,
	sharedComponents: PropTypes.object,
	title: PropTypes.string,
	id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	isView: PropTypes.bool,
	setReloadData: PropTypes.func,
};

export default withSharedComponents(ViewPassportReturnSlip);
