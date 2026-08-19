import React, { useCallback, useMemo, useState } from "react";
import { CircularProgress, Grid, Typography } from "@mui/material";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { useToast } from "@components/common/ToastProvider";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { FileViewerDialog } from "@components/CustomDialog";
import { useDispatch } from "react-redux";
import PropTypes from "prop-types";
import dayjs from "dayjs";
// import VanBanThuHoiTable from "@pages/TextAway/Tab/component/Vanbanthuhoi";
import withSharedComponents from "@components/WrapperComponent";

import UploadFile from "@components/UploadFile";
import { apiUploadFile } from "@services/FileUpload/fileUpload";

import {
	StyledBoxContainerContent,
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import {
	defaultValuePassportListPage,
	passportListPageSchema,
} from "./constantsPassportListPage";
import { API_GET_PASSPORT_EMPLOYEES } from "@EnvironmentFile/constants/urlConfig";
import {
	addPassPortListPage,
	dataDetailEmployeePassPortListPage,
	updatePassPortListPage,
} from "@redux/slices/PassportManagement/PassportManagementSlice";
import { StyledLoadingPopupSignDigital } from "@styles/UploadFile/UploadFile.style";
import withFormWrapper from "@components/common/FormWrapper";
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";
import { StyledSectionTitle, StyledTitleWithToggle } from "@styles/RecordDestruction/RecordDestruction.styles";
import { FileIconSvg } from "@assets/icons/FileIconSvg";

const AddPassportList = (props) => {
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
	const [selectedEmployeeDetails, setSelectedEmployeeDetails] = useState(null);
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
		setSelectedEmployeeDetails(null);
		onClose();
	}, [onClose, reset]);

	const handleSave = useCallback(
		async (data) => {
			try {
				setIsLoading(true);
				logger.log("Form Data:", data);

				const body = {
					...data,
					eofficeAccount: data.eofficeAccount
						? String(data?.eofficeAccount?.id)
						: null,
					// Lưu id từ selectedEmployeeDetails thay vì nameVn từ form
					rank: selectedEmployeeDetails?.idArmyRank?.id || null,
					unitName: selectedEmployeeDetails?.organization?.id || null,
					departmentName: selectedEmployeeDetails?.organization?.id || null,
					divisionName: selectedEmployeeDetails?.organization?.id || null,
					positionTitle: selectedEmployeeDetails?.jobId?.id || null,
				};

				const createResult = await dispatch(addPassPortListPage(body)).unwrap();
				const passportId =
					createResult?.data?._id ||
					createResult?.data?.id ||
					createResult?._id ||
					createResult?.id ||
					null;

				if (!passportId) {
					throw new Error("Không lấy được ID hộ chiếu sau khi tạo");
				}

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
				logger.log("scanFiles extracted:", scanFiles);
				// if (scanFiles.length > 0) {
				//   const fileIds = [];
				//   for (const file of scanFiles) {
				//     const uploadResult = await apiUploadFile(
				//       file,
				//       "scanFile",
				//       passportId
				//     );
				//     const fileId =
				//       uploadResult?.data?._id ||
				//       uploadResult?.data?.id ||
				//       uploadResult?._id ||
				//       uploadResult?.id ||
				//       null;

				//     if (fileId) {
				//       fileIds.push(fileId);
				//     }
				//   }

				//   if (fileIds.length > 0) {
				//     await dispatch(
				//       updatePassPortListPage({
				//         id: passportId,
				//         payload: { scanFile: fileIds },
				//       })
				//     ).unwrap();
				//   }
				// }
				if (scanFiles.length > 0) {
					const fileIds = [];
					const BATCH_SIZE = 10;

					for (let i = 0; i < scanFiles.length; i += BATCH_SIZE) {
						const batch = scanFiles.slice(i, i + BATCH_SIZE);

						const uploadResults = await Promise.all(
							batch.map((file) => apiUploadFile(file, "scanFile", passportId))
						);

						uploadResults.forEach((uploadResult) => {
							const fileId =
								uploadResult?.data?._id ||
								uploadResult?.data?.id ||
								uploadResult?._id ||
								uploadResult?.id ||
								null;

							if (fileId) {
								fileIds.push(fileId);
							}
						});
					}

					if (fileIds.length > 0) {
						await dispatch(
							updatePassPortListPage({
								id: passportId,
								payload: { scanFile: fileIds },
							})
						).unwrap();
					}
				}

				toast("Thêm mới hộ chiếu thành công!", "success");
				reset(defaultValuePassportListPage);
				onSuccess?.();
				onClose();
			} catch (error) {
				logger.log("Lỗi khi thêm mới hộ chiếu:", error);
				const messageError =
					error?.response?.data?.message ||
					error.message ||
					"Thêm mới hộ chiếu thất bại!";
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
			selectedEmployeeDetails?.idArmyRank?.id,
			selectedEmployeeDetails?.jobId?.id,
			selectedEmployeeDetails?.organization?.id,
		]
	);

	const handleChangeEofficeAccount = useCallback(
		async (value) => {
			// logger.log("Selected eoffice account:", value);
			setValue("eofficeAccount", value);

			if (value) {
				setValue("fullName", value.nameVn || "");
				setValue("email", value.email || "");
				setValue("birthday", value.dateOfBirth || null);
				setValue("gender", value.gender || "");
				setValue("identificationCard", value.idNumber || "");
				setValue("phoneNumber", value.phoneNumber || "");
				setValue("passportNumber", value.passportNumber || "");
				setValue("issuePlace", value.passportPlace || "");
				setValue("address", value.perAddress || "");
				try {
					const res = await dispatch(
						dataDetailEmployeePassPortListPage(value.id)
					).unwrap();
					// Lưu toàn bộ object employee details để lấy id khi submit
					setSelectedEmployeeDetails(res);
					// Set form fields để hiển thị nameVn
					setValue("rank", res.idArmyRank?.nameVn || ""); //Cấp bậc
					setValue("unitName", res.organization?.nameVn || ""); //Đơn vị
					setValue("departmentName", res.organization?.nameVn || ""); //Phòng
					setValue("divisionName", res.organization?.nameVn || ""); //Ban
					setValue("positionTitle", res.jobId?.nameVn || ""); //Chức danh
				} catch (error) {
					logger.log("Lỗi khi lấy dữ liệu chi tiết tài khoản eOffice:", error);
				}
			} else {
				// Reset các trường khi xóa lựa chọn
				setSelectedEmployeeDetails(null);
				setValue("positionTitle", null);
				setValue("rank", null);
				setValue("unitName", null);
				setValue("departmentName", null);
				setValue("divisionName", null);
			}
		},
		[setValue, dispatch]
	);

	return (
		<BaseSwipper
			title={title || "Thêm mới hộ chiếu"}
			open={open}
			onClose={handleClose}
			onSave={handleSubmit(handleSave)}
			type="add"
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
				<StyledTitleWithToggle>
					<FileIconSvg />
					<StyledSectionTitle variant="h6" noWrap>
						THÔNG TIN HỘ CHIẾU
					</StyledSectionTitle>
				</StyledTitleWithToggle>
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
								// dataSelectedOptions={setDataSelectedEmpolyee}
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
								// label="SCAN ẢNH HỘ CHIẾU"
								customLabel={
									<StyledTitleWithToggle>
										<FileIconSvg />
										<StyledSectionTitle variant="h6" noWrap>
											HÌNH ẢNH HỘ CHIẾU
										</StyledSectionTitle>
									</StyledTitleWithToggle>
								}
								manualUpload
								// objectId={newDocumentId}
								objectType="scanPassport"
								id="scanFile-upload"
								editFile
								// required
								error={!!fieldState.error}
								helperText={fieldState.error?.message}
								noneBorder
								isActionMenu
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

AddPassportList.propTypes = {
	open: PropTypes.bool.required,
	onClose: PropTypes.func.required,
	onSuccess: PropTypes.func,
	isLoading: PropTypes.bool,
	sharedComponents: PropTypes.object,
	mode: PropTypes.string,
	title: PropTypes.string,
	documentType: PropTypes.number,
	incomingCreate: PropTypes.bool,
};

export default withSharedComponents(AddPassportList);
