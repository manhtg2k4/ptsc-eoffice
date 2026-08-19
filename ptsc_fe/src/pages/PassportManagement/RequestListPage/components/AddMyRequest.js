import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircularProgress, Grid } from "@mui/material";
import { useToast } from "@components/common/ToastProvider";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";

import {
	StyledBoxContainerContent,
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import { API_PASSPORT_REQUEST } from "@EnvironmentFile/constants/urlConfig";
import { addPassportRequest, getDataPassportToUser } from "@redux/slices/PassportManagement/PassportManagementSlice";
// eslint-disable-next-line no-restricted-imports
import {
	defaultValueRequestListPage,
	passportMyRequestSchema,
} from "../constantsRequestListPage";
import { StyledLoadingPopupSignDigital } from "@styles/UploadFile/UploadFile.style";
import UploadFile from "@components/UploadFile";
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";
import withFormWrapper from "@components/common/FormWrapper";
import { StyledSectionTitle, StyledTitleWithToggle } from "@styles/RecordDestruction/RecordDestruction.styles";
import { FileIconSvg } from "@assets/icons/FileIconSvg";

const AddMyRequest = (props) => {
	const {
		open,
		onClose,
		onSuccess,
		sharedComponents,
		// mode = "add",
		title, // Nhận title từ props
		initialPassportData, // Dữ liệu hộ chiếu ban đầu khi mở từ chi tiết hộ chiếu
	} = props;
	const {
		BaseSwipper,
		InputComponents: BaseInput,
		DatePicker: BaseDatePicker,
		ButtonOutline,
		AsyncAutoComplete: BaseAsyncAutoComplete,
		CustomAutoCompleteSearch: BaseCustomAutoCompleteSearch,
	} = sharedComponents;

	const toast = useToast();
	const dispatch = useDispatch();
	const [isLoading, setIsLoading] = useState(false);
	const [borrowerEofficeAccount, setBorrowerEofficeAccount] = useState("");
	const [selectedPassportId, setSelectedPassportId] = useState(null);
	// const [selectedEmployeeDetails, setSelectedEmployeeDetails] = useState(null);
	const { dataUser } = useSelector((state) => state.auth);
	const {
		control,
		handleSubmit,
		formState: { errors },
		setValue,
		trigger,
		watch,
		reset,
	} = useForm({
		resolver: yupResolver(passportMyRequestSchema),
		defaultValues: defaultValueRequestListPage,
		mode: "onChange",
	});

	const clientRequestIdRef = useRef(null);

	useEffect(() => {
		if (open) {
			if (!clientRequestIdRef.current) {
				clientRequestIdRef.current = crypto.randomUUID();
			}
		} else {
			clientRequestIdRef.current = null;
		}
	}, [open]);

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

	const borrowDate = watch("borrowDate");

	useEffect(() => {
		const fetchPassport = async () => {
			if (!(dataUser?.id ?? dataUser?._id)) {
				logger.warn("Không lấy được thông tin người dùng đang đăng nhập để load dữ liệu hộ chiếu");
				return;
			}
			try {
				setValue("namePassportRequest", {
					id: dataUser?.id ?? dataUser?._id,
					nameVn: dataUser?.name,
				});
				const userId = dataUser?.id ?? dataUser?._id;
				setBorrowerEofficeAccount(userId);
				const res = await dispatch(getDataPassportToUser(userId)).unwrap();
				const passport = res?.[0];
				if (passport) {
					setValue("passportNumber", passport);
					setValue("passportType", passport.passportType || "");
					setSelectedPassportId(passport?.id || passport);
				}
			} catch (err) {
				const messageError =
					err?.response?.data?.message ||
					err.message ||
					"Không thể tải thông tin hộ chiếu của bạn. Vui lòng chọn thủ công.";
				toast(messageError, "error");
				logger.log("Lỗi load passport khi khởi tạo:", err);
			}
		};

		fetchPassport();
	}, [dataUser, setValue, dispatch, toast]);

	// Pre-fill passport data when initialPassportData is provided (from ViewPassportList)
	useEffect(() => {
		if (!open || !initialPassportData) return;
		setValue("passportNumber", initialPassportData);
		setValue("passportType", initialPassportData.passportType || "");
		setSelectedPassportId(initialPassportData?.id || null);
		trigger("passportNumber");
	}, [open, initialPassportData, setValue, trigger]);

	const passportUrl = useMemo(() => {
		if (!borrowerEofficeAccount) {
			return `${API_PASSPORT_REQUEST}/passports`;
		}
		return `${API_PASSPORT_REQUEST}/users/${borrowerEofficeAccount}/passports`;
		// return `${API_PASSPORT_REQUEST}/passports?eofficeAccount=${encodeURIComponent(
		//   borrowerEofficeAccount
		// )}`;
	}, [borrowerEofficeAccount]);

	const leaderUrl = useMemo(() => {
		if (!borrowerEofficeAccount) {
			return `${API_PASSPORT_REQUEST}/leaders`;
		}
		return `${API_PASSPORT_REQUEST}/leaders?borrowerId=${borrowerEofficeAccount}`;
	}, [borrowerEofficeAccount]);

	const handleDateChange = useCallback(
		(field) => (newDate) => {
			field.onChange(newDate ? dayjs(newDate).toISOString() : null);
		},
		[]
	);

	const handleClose = useCallback(async () => {
		reset(defaultValueRequestListPage);
		// setSelectedEmployeeDetails(null);
		onClose();
	}, [onClose, reset]);

	const handleSave = useCallback(
		async (data) => {
			try {
				setIsLoading(true);
				logger.log("Form Data:", data);

				const body = {
					typeRequest: "user",
					namePassportRequest: data?.namePassportRequest?.eofficeAccount || data?.namePassportRequest?.id,
					leader: data.leader?.id,
					passportNumber:
						data.passportNumber?.passportNumber || data.passportNumber,
					borrowDate: data.borrowDate,
					returnDate: data.returnDate,
					tripContent: data.tripContent,
					passportType: data.passportType || "",
					clientRequestId: clientRequestIdRef.current,
				};
				logger.log("Request Body:", body);
				await dispatch(addPassportRequest(body)).unwrap();
				toast("Thêm mới yêu cầu mượn hộ chiếu thành công!", "success");
				clientRequestIdRef.current = crypto.randomUUID();
				reset(defaultValueRequestListPage);
				onSuccess?.();
				onClose();
			} catch (error) {
				logger.log("Lỗi khi thêm mới yêu cầu mượn hộ chiếu:", error);
				const messageError =
					error?.response?.data?.message ||
					error.message ||
					"Thêm mới yêu cầu mượn hộ chiếu thất bại!";
				toast(messageError, "error");
			} finally {
				setIsLoading(false);
			}
		},
		[reset, onClose, onSuccess, toast, dispatch]
	);

	const handleChangeNamePassportRequest = useCallback(
		async (value) => {
			setValue("namePassportRequest", value);
			trigger("namePassportRequest");

			setValue("leader", null);
			if (value) {
				const userId = value.id;
				setBorrowerEofficeAccount(userId);

				try {
					// 👉 gọi API passport theo user
					const res = await dispatch(getDataPassportToUser(userId)).unwrap();
					const passport = res?.[0]; // lấy cái đầu tiên

					if (passport) {
						// ✅ set thẳng object cho AutoComplete
						setValue("passportNumber", passport);
						setValue("passportType", passport.passportType || "");

						// ✅ Set passport id for UploadFile
						const passportId = passport?.id || passport;
						setSelectedPassportId(passportId);

						trigger("passportNumber");
					} else {
						setValue("passportNumber", null);
						setValue("passportType", null);
						setSelectedPassportId(null);
					}
				} catch (err) {
					logger.error("Lỗi load passport:", err);
					setSelectedPassportId(null);
				}
			} else {
				setBorrowerEofficeAccount("");
				setValue("passportNumber", null);
				setValue("passportType", null);
				setSelectedPassportId(null);
				setValue("leader", null);
			}
		},
		[setValue, trigger, dispatch]
	);

	// const handleChangeNamePassportRequest = useCallback(
	//   (value) => {
	//     logger.log("Selected namePassportRequest:", value);
	//     setValue("namePassportRequest", value);
	//     trigger("namePassportRequest");
	//     if (value) {
	//       setBorrowerEofficeAccount(value.id || "");
	//       // Auto-fill các trường thông tin từ dữ liệu nhân viên
	//       const passportAutoValue = value?.passportId
	//         // ? {
	//         //     id: value.passportId, // Sửa thành passportId thay vì id của người mượn
	//         //     passportId: value.passportId,
	//         //     passportNumber: value.passportNumber || "", // Mở khóa dòng này để Autocomplete có dữ liệu hiển thị text
	//         //   }
	//         // : null;
	//       setValue("passportNumber", passportAutoValue);
	//       setValue("passportType", value.passportType || "");
	//       trigger("passportNumber");
	//     } else {
	//       setBorrowerEofficeAccount("");
	//       // Reset các trường khi xóa lựa chọn
	//       setValue("passportNumber", null);
	//       setValue("passportType", null);
	//     }
	//   },
	//   [setValue, trigger]
	// );

	const handleChangePassportNumber = useCallback(
		(value) => {
			// logger.log("Selected passport number:", value);
			setValue("passportNumber", value);
			trigger("passportNumber");

			// Extract passport id and set it for UploadFile
			const passportId = value?.id || value;
			setSelectedPassportId(passportId);

			if (value) {
				// Auto-fill các trường thông tin từ dữ liệu nhân viên
				setValue("passportType", value.passportType || "");
			} else {
				// Reset các trường khi xóa lựa chọn
				setValue("passportType", null);
				setSelectedPassportId(null);
			}
		},
		[setValue, trigger]
	);

	return (
		<BaseSwipper
			title={title || "Thêm mới yêu cầu"}
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
							LƯU
						</ButtonOutline>
					</FooterActions>
				</>
			}
			isLoading={isLoading}
		>
			<StyledBoxContainerContent styledMarginTop>
				<StyledTitleWithToggle>
					<FileIconSvg />
					<StyledSectionTitle variant="h6" noWrap>
						THÔNG TIN YÊU CẦU MƯỢN HỘ CHIẾU CÁ NHÂN
					</StyledSectionTitle>
				</StyledTitleWithToggle>
				<Grid container spacing={2} mt={2}>
					<Grid item xs={12} md={6} sm={6}>
						<Controller
							name="namePassportRequest"
							control={control}
							render={({ field }) => (
								<AsyncAutoComplete
									fullWidth
									label="Người mượn"
									placeholder="Tìm kiếm người mượn..."
									url={`${API_PASSPORT_REQUEST}/users`}
									// url={`${API_PASSPORT_REQUEST}/borrowers`}
									queryParam="nameVn"
									optionLabel="nameVn"
									optionValue="id"
									value={field.value}
									onChange={handleChangeNamePassportRequest}
									// onChange={field.onChange}
									returnObject
									error={!!errors.namePassportRequest}
									helperText={errors.namePassportRequest?.message}
									size="small"
									required
									unsetFontWeight
								// dataSelectedOptions={setDataSelectedEmpolyee}
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={6}>
						<Controller
							name="leader"
							control={control}
							render={({ field }) => (
								<AsyncAutoComplete
									key={`leader-${borrowerEofficeAccount || "all"}`}
									fullWidth
									label="Lãnh đạo"
									placeholder="Tìm kiếm lãnh đạo..."
									url={leaderUrl}
									queryParam="nameVn"
									optionLabel="nameVn"
									optionValue="id"
									value={field.value}
									// onChange={handleChangeEofficeAccount}
									onChange={field.onChange}
									// returnObject
									error={!!errors.leader}
									helperText={errors.leader?.message}
									size="small"
									required
									unsetFontWeight
								// dataSelectedOptions={setDataSelectedEmpolyee}
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={6}>
						<Controller
							name="passportNumber"
							control={control}
							render={({ field }) => (
								<AsyncAutoComplete
									key={`passport-${borrowerEofficeAccount || "all"}`}
									fullWidth
									label="Số hộ chiếu"
									placeholder="Tìm kiếm số hộ chiếu..."
									url={passportUrl}
									loadOnMount
									queryParam="passportNumber"
									optionLabel="passportNumber"
									optionValue="id"
									value={field.value}
									onChange={handleChangePassportNumber}
									// onChange={field.onChange}
									// returnObject
									error={!!errors.passportNumber}
									helperText={errors.passportNumber?.message}
									size="small"
									required
									unsetFontWeight
									disabled={!!initialPassportData}
								// dataSelectedOptions={setDataSelectedEmpolyee}
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
									error={!!errors.passportType}
									helperText={errors.passportType?.message}
									unsetFontWeight
									disabled
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={6}>
						<Controller
							name="borrowDate"
							control={control}
							render={({ field }) => (
								<DatePicker
									label="Ngày dự kiến mượn"
									value={field.value ? dayjs(field.value) : null}
									onChange={handleDateChange(field)}
									required
									error={!!errors.borrowDate}
									helperText={errors.borrowDate?.message}
									minDate={dayjs()}
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={6}>
						<Controller
							name="returnDate"
							control={control}
							render={({ field }) => (
								<DatePicker
									label="Ngày dự kiến trả"
									value={field.value ? dayjs(field.value) : null}
									onChange={handleDateChange(field)}
									required
									error={!!errors.returnDate}
									helperText={errors.returnDate?.message}
									minDate={borrowDate ? dayjs(borrowDate) : dayjs()}
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12}>
						<Controller
							name="tripContent"
							control={control}
							render={({ field }) => (
								<InputComponents
									label="Lý do"
									placeholder="Nhập lý do..."
									{...field}
									error={!!errors.tripContent}
									helperText={errors.tripContent?.message}
									multiline
									rows={2}
								/>
							)}
						/>
					</Grid>
				</Grid>
			</StyledBoxContainerContent>
			<StyledBoxContainerContent styledMarginTop>
				<Grid item xs={12}>
					<UploadFile
						// label="HÌNH ẢNH HỘ CHIẾU"
						// manualUpload
						objectId={selectedPassportId}
						objectType="scanPassport"
						id="scanFile-upload"
						editFile
						// required
						noneBorder
						hiddenUploadAndScan
						isActionMenu
						isView
						// iconTitle={<FileIconSvg />}
						customLabel={
							<StyledTitleWithToggle>
								<FileIconSvg />
								<StyledSectionTitle variant="h6" noWrap>
									HÌNH ẢNH HỘ CHIẾU
								</StyledSectionTitle>
							</StyledTitleWithToggle>
						}
					/>
				</Grid>
			</StyledBoxContainerContent>
			{isLoading && (
				<StyledLoadingPopupSignDigital>
					<CircularProgress />
				</StyledLoadingPopupSignDigital>
			)}
		</BaseSwipper>
	);
};

AddMyRequest.propTypes = {
	open: PropTypes.bool.required,
	onClose: PropTypes.func.required,
	onSuccess: PropTypes.func,
	isLoading: PropTypes.bool,
	sharedComponents: PropTypes.object,
	mode: PropTypes.string,
	title: PropTypes.string,
	documentType: PropTypes.number,
	incomingCreate: PropTypes.bool,
	initialPassportData: PropTypes.object,
};

export default withSharedComponents(AddMyRequest);
