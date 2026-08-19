import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CircularProgress, Grid, Typography } from "@mui/material";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { useToast } from "@components/common/ToastProvider";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { FileViewerDialog } from "@components/CustomDialog";
import { useDispatch } from "react-redux";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";
import UploadFile from "@components/UploadFile";
import { apiUploadFile } from "@services/FileUpload/fileUpload";
import { StyledBoxContainerContent } from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import {
	defaultValuePassportListPage,
	passportListPageSchema,
} from "./constantsPassportListPage";
import { API_GET_PASSPORT_EMPLOYEES } from "@EnvironmentFile/constants/urlConfig";
import {
	detailPassPortListPage,
	updatePassPortListPage,
} from "@redux/slices/PassportManagement/PassportManagementSlice";
import {
	SecondaryTypography,
	StatusWrapper,
	TitleBox,
} from "@pages/RecommendationsPage/components/RecommendationsForm.styles";
import { StyledLoadingPopupSignDigital } from "@styles/UploadFile/UploadFile.style";
import DOMPurify from "dompurify";
import withFormWrapper from "@components/common/FormWrapper";
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";
import { StyledSectionTitle, StyledTitleWithToggle } from "@styles/RecordDestruction/RecordDestruction.styles";
import { FileIconSvg } from "@assets/icons/FileIconSvg";
const EditPassportList = (props) => {
	const {
		open,
		onClose,
		onSuccess,
		sharedComponents,
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

	const InputComponents = useMemo(() => {
		return withFormWrapper(BaseInput, "input");
	}, [BaseInput]);

	const DatePicker = useMemo(() => {
		return withFormWrapper(BaseDatePicker, "date");
	}, [BaseDatePicker]);

	const AsyncAutoComplete = useMemo(() => {
		const Wrapped = withFormWrapper(BaseAsyncAutoComplete, "asyncSelect");
		const Component = (props) => <Wrapped {...props} />;
		Component.displayName = "AsyncAutoComplete";
		return Component;
	}, [BaseAsyncAutoComplete]);

	const CustomAutoCompleteSearch = useMemo(() => {
		const Wrapped = withFormWrapper(BaseCustomAutoCompleteSearch, "asyncSelect");
		const Component = (props) => <Wrapped {...props} />;
		Component.displayName = "CustomAutoCompleteSearch";
		return Component;
	}, [BaseCustomAutoCompleteSearch]);

	const toast = useToast();
	const dispatch = useDispatch();
	const [isLoading, setIsLoading] = useState(false);
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
	const [statusPassport, setStatusPassport] = useState(null);
	const [dataSelectedEmployee, setDataSelectedEmployee] = useState(null);
	const {
		control,
		handleSubmit,
		formState: { errors },
		setValue,
		// getValues,
		reset,
	} = useForm({
		resolver: yupResolver(passportListPageSchema),
		defaultValues: defaultValuePassportListPage,
		mode: "onChange",
	});

	useEffect(() => {
		if (!open) {
			return;
		}
		const getDataDetail = async () => {
			try {
				const res = await dispatch(detailPassPortListPage(props?.id)).unwrap();

				// Transform eofficeAccount để match với AsyncAutoComplete format
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
					rank: res?.rank?.title || "",
					unitName: res?.unitName?.title || "",
					departmentName: res?.departmentName?.title || "",
					divisionName: res?.divisionName?.title || "",
					positionTitle: res?.positionTitle?.title || "",
				});
				setStatusPassport(res?.usageStatus);
			} catch (error) {
				logger.log("Lỗi khi lấy chi tiết hộ chiếu:", error);
				const errorMessage =
					error?.response?.data?.message ||
					error?.message ||
					"Có lỗi xảy ra khi lấy chi tiết hộ chiếu!";
				toast(errorMessage, "error");
			}
		};
		getDataDetail();
	}, [dispatch, props.id, reset, toast, open]);

	const handleCloseConfirmDelete = useCallback(() => {
		setConfirmDelete({ open: false, onConfirm: null, title: "", content: "" });
	}, []);

	const handleCloseFileViewer = useCallback(() => {
		if (viewingFile.url) {
			URL.revokeObjectURL(viewingFile.url);
		}
		setViewingFile({ open: false, url: null, name: "", type: null });
	}, [viewingFile.url]);

	const handleDateChange = useCallback(
		(field) => (newDate) => {
			field.onChange(newDate ? dayjs(newDate).toISOString() : null);
		},
		[]
	);

	const handleClose = useCallback(async () => {
		reset(defaultValuePassportListPage);
		onClose();
	}, [onClose, reset]);

	const handleSave = useCallback(
		async (data) => {
			try {
				setIsLoading(true);
				if (!props?.id) {
					throw new Error("Không tìm thấy ID hộ chiếu để cập nhật");
				}

				const body = {
					...data,
					eofficeAccount: data.eofficeAccount
						? String(data?.eofficeAccount?.id)
						: null,
					rank: dataSelectedEmployee?.idArmyRank?.id || null,
					unitName: dataSelectedEmployee?.organization?.id || null,
					departmentName: dataSelectedEmployee?.organization?.id || null,
					divisionName: dataSelectedEmployee?.organization?.id || null,
					positionTitle: dataSelectedEmployee?.jobId?.id || null,
				};
				// Kiểm tra nếu có file mới được upload
				const extractFiles = (value) => {
					if (!value) return [];

					const filesArray = Array.isArray(value) ? value : [value];

					return filesArray
						.map((fileObj) => {
							// Check và return File instance thực sự
							if (fileObj?.originFileObj instanceof File)
								return fileObj.originFileObj;
							if (fileObj?.file instanceof File) return fileObj.file;
							if (fileObj?.rawFile instanceof File) return fileObj.rawFile;
							if (fileObj instanceof File) return fileObj;
							return null;
						})
						.filter((file) => file !== null);
				};

				const scanFiles = extractFiles(data.scanFile);
				if (scanFiles.length > 0) {
					const fileIds = [];
					const BATCH_SIZE = 10;

					for (let i = 0; i < scanFiles.length; i += BATCH_SIZE) {
						const batch = scanFiles.slice(i, i + BATCH_SIZE);

						const uploadResults = await Promise.allSettled(
							batch.map((file) => apiUploadFile(file, "scanFile", props.id))
						);

						uploadResults.forEach((result) => {
							if (result.status === "fulfilled") {
								const uploadResult = result.value;
								const fileId =
									uploadResult?.data?._id ||
									uploadResult?.data?.id ||
									uploadResult?._id ||
									uploadResult?.id ||
									null;

								if (fileId) {
									fileIds.push(fileId);
								}
							}
						});
					}

					if (fileIds.length > 0) {
						body.scanFile = fileIds;
					}
				}

				// Cập nhật thông tin hộ chiếu
				await dispatch(
					updatePassPortListPage({
						id: props.id,
						payload: body,
					})
				).unwrap();
				toast("Cập nhật hộ chiếu thành công!", "success");
				reset(defaultValuePassportListPage);
				if (onSuccess) onSuccess();
				onClose();
			} catch (error) {
				logger.log("Lỗi khi cập nhật hộ chiếu:", error);
				const messageError =
					error?.response?.data?.message ||
					error.message ||
					"Cập nhật hộ chiếu thất bại!";
				toast(messageError, "error");
			} finally {
				setIsLoading(false);
			}
		},
		[
			reset,
			onClose,
			onSuccess,
			toast,
			dispatch,
			props?.id,
			dataSelectedEmployee,
		]
	);

	const handleChangeEofficeAccount = useCallback(
		(value) => {
			// logger.log("Selected eOffice account:", value);
			setValue("eofficeAccount", value);
			if (value) {
				// Auto-fill các trường thông tin từ dữ liệu nhân viên
				setValue("fullName", value.nameVn || "");
				setValue("email", value.email || "");
				setValue("birthday", value.dateOfBirth || null);
				setValue("gender", value.gender || "");
				setValue("identificationCard", value.idNumber || "");
				setValue("phoneNumber", value.phoneNumber || "");
				setValue("passportNumber", value.passportNumber || "");
				setValue("issuePlace", value.passportPlace || "");
				setValue("address", value.perAddress || "");
				setValue("rank", dataSelectedEmployee?.idArmyRank?.nameVn || ""); //Cấp bậc
				setValue("unitName", dataSelectedEmployee?.organization?.nameVn || ""); //Đơn vị
				setValue(
					"departmentName",
					dataSelectedEmployee?.organization?.nameVn || ""
				); //Phòng
				setValue(
					"divisionName",
					dataSelectedEmployee?.organization?.nameVn || ""
				); //Ban
				setValue("positionTitle", dataSelectedEmployee?.jobId?.nameVn || ""); //Chức danh
			} else {
				// Reset các trường khi xóa lựa chọn
				setValue("positionTitle", null);
				setValue("rank", null);
				setValue("unitName", null);
				setValue("departmentName", null);
				setValue("divisionName", null);
			}
		},
		[setValue, dataSelectedEmployee]
	);

	return (
		<BaseSwipper
			title={title || "Cập nhật hộ chiếu"}
			open={open}
			onClose={handleClose}
			onSave={handleSubmit(handleSave)}
			type="update"
			hideBackdrop
			footer={
				<>
					<FlexGrowBox />
					<FooterActions>
						<ButtonOutline
							onClick={handleSubmit(handleSave)}
							disabled={isLoading}
							variant="outlined"
						>
							Lưu
						</ButtonOutline>
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
									onChange={handleChangeEofficeAccount}
									returnObject
									error={!!errors.eofficeAccount}
									helperText={errors.eofficeAccount?.message}
									size="small"
									required
									unsetFontWeight
									isMulti={false}
									disabled
									dataSelectedOptions={setDataSelectedEmployee}
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
									error={!!errors.fullName}
									helperText={errors.fullName?.message}
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
									error={!!errors.email}
									helperText={errors.email?.message}
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
									error={!!errors.positionTitle}
									helperText={errors.positionTitle?.message}
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
									onChange={handleDateChange(field)}
									error={!!errors.birthday}
									helperText={errors.birthday?.message}
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
									error={!!errors.gender}
									helperText={errors.gender?.message}
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
									error={!!errors.identificationCard}
									helperText={errors.identificationCard?.message}
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
									error={!!errors.phoneNumber}
									helperText={errors.phoneNumber?.message}
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
									error={!!errors.rank}
									helperText={errors.rank?.message}
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
									error={!!errors.unitName}
									helperText={errors.unitName?.message}
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
									error={!!errors.departmentName}
									helperText={errors.departmentName?.message}
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
									error={!!errors.nationality}
									helperText={errors.nationality?.message}
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
									error={!!errors.address}
									helperText={errors.address?.message}
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
									error={!!errors.passportNumber}
									helperText={errors.passportNumber?.message}
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
									error={!!errors.passportType}
									helperText={errors.passportType?.message}
									unsetFontWeight
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
									onChange={handleDateChange(field)}
									required
									error={!!errors.issueDate}
									helperText={errors.issueDate?.message}
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
									onChange={handleDateChange(field)}
									required
									error={!!errors.expiryDate}
									helperText={errors.expiryDate?.message}
									minDate={dayjs()}
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
									error={!!errors.issuePlace}
									helperText={errors.issuePlace?.message}
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
									error={!!errors.placeOfBirth}
									helperText={errors.placeOfBirth?.message}
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
									error={!!errors.countriesVisited}
									helperText={errors.countriesVisited?.message}
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
									error={!!errors.note}
									helperText={errors.note?.message}
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
								// manualUpload
								objectId={props?.id}
								objectType="scanPassport"
								id="scanFile-upload"
								editFile
								// required
								error={!!fieldState.error}
								helperText={fieldState.error?.message}
								noneBorder
							/>
						)}
					/>
				</Grid>
			</StyledBoxContainerContent>
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
				onSave={confirmDelete.onConfirm}
				title={confirmDelete.title}
				type="delete"
				disableSave={false}
			>
				<Typography>{confirmDelete.content}</Typography>
			</CustomDialog>
		</BaseSwipper>
	);
};

EditPassportList.propTypes = {
	open: PropTypes.bool.required,
	onClose: PropTypes.func.required,
	onSuccess: PropTypes.func,
	id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	isLoading: PropTypes.bool,
	sharedComponents: PropTypes.object,
	mode: PropTypes.string,
	title: PropTypes.string,
	documentType: PropTypes.number,
	incomingCreate: PropTypes.bool,
};

export default withSharedComponents(EditPassportList);
