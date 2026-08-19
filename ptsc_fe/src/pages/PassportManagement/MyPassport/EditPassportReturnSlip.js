import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { CircularProgress, Grid } from "@mui/material";
import { useToast } from "@components/common/ToastProvider";
import { useForm, Controller } from "react-hook-form";
// import { yupResolver } from "@hookform/resolvers/yup";
import { useDispatch } from "react-redux";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";
import CusTomTableFreeStyle from "@components/CustomTable/CusTomTableFreeStyle";
import {
	StyledBoxContainerContent,
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import { API_GET_PASSPORT_EMPLOYEES } from "@EnvironmentFile/constants/urlConfig";
import {
	dataDetailEmployeePassPortListPage,
	getDataListReturnPassports,
	updatePassportsReturnSlip,
	viewPassportsReturnSlip,
} from "@redux/slices/PassportManagement/PassportManagementSlice";
import { StyledLoadingPopupSignDigital } from "@styles/UploadFile/UploadFile.style";
import withFormWrapper from "@components/common/FormWrapper";
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";
import { StyledSectionTitle, StyledTitleWithToggle } from "@styles/RecordDestruction/RecordDestruction.styles";
import { FileIconSvg } from "@assets/icons/FileIconSvg";
import { defaultValueReturnPassportSlip } from "@pages/PassportManagement/PassportListPage/constantsPassportListPage";
import {
	StyledAddIcon,
	StyledDeleteIcon,
	// StyledRemovePassportButton,
	TableCardContainer,
	TableCardTitle,
	TableWrapperPassport,
} from "@styles/PassportManagement.styles";

const AddButtonCell = memo(({ row, onAdd, ButtonOutline }) => {
	const handleClick = useCallback(() => {
		onAdd(row);
	}, [row, onAdd]);

	return (
		<ButtonOutline
			onClick={handleClick}
			variant="outlined"
			startIcon={<StyledAddIcon />}
		>
			Thêm
		</ButtonOutline>
	);
});
AddButtonCell.displayName = "AddButtonCell";

const DeleteButtonCell = React.memo(({ row, onRemove, ButtonOutline }) => {
	const handleClick = useCallback(() => {
		onRemove(row);
	}, [row, onRemove]);

	return (
		<ButtonOutline
			size="small"
			onClick={handleClick}
			startIcon={<StyledDeleteIcon />}
			variant="error"
		>
			Xoá
		</ButtonOutline>
	);
});
DeleteButtonCell.displayName = "DeleteButtonCell";

const EditPassportReturnSlip = (props) => {
	const {
		open,
		onClose,
		onSuccess,
		sharedComponents,
		title,
		id,
		setReloadData
	} = props;
	const {
		BaseSwipper,
		InputComponents: BaseInput,
		DatePicker: BaseDatePicker,
		ButtonOutline,
		AsyncAutoComplete: BaseAsyncAutoComplete,
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

	const toast = useToast();
	const dispatch = useDispatch();
	const [isLoading, setIsLoading] = useState(false);
	const [isLoadingPassports, setIsLoadingPassports] = useState(false);

	// State cho 2 bảng hộ chiếu
	const [availablePassports, setAvailablePassports] = useState([]);
	const [selectedPassports, setSelectedPassports] = useState([]);
	const {
		control,
		handleSubmit,
		formState: { errors },
		setValue,
		reset,
	} = useForm({
		// resolver: yupResolver(passportListPageSchema),
		defaultValues: defaultValueReturnPassportSlip,
		mode: "onChange",
	});

	// Xử lý Thêm hộ chiếu từ bảng trái sang bảng phải
	const handleAddPassport = useCallback(
		(passportRow) => {
			if (!passportRow) return;
			const itemKey = passportRow._id || passportRow.id || passportRow.passportNumber;

			setAvailablePassports((prev) =>
				prev.filter((item) => (item._id || item.id || item.passportNumber) !== itemKey)
			);
			setSelectedPassports((prev) => {
				const nextSelected = [...prev, passportRow];
				setValue("passportListReturn", nextSelected, {
					shouldValidate: true,
					shouldDirty: true,
				});
				return nextSelected;
			});
		},
		[setValue]
	);

	// Xử lý Xóa hộ chiếu từ bảng phải chuyển lại bảng trái
	const handleRemovePassport = useCallback(
		(passportRow) => {
			if (!passportRow) return;
			const itemKey = passportRow._id || passportRow.id || passportRow.passportNumber;

			setSelectedPassports((prev) => {
				const nextSelected = prev.filter(
					(item) => (item._id || item.id || item.passportNumber) !== itemKey
				);
				setValue("passportListReturn", nextSelected, {
					shouldValidate: true,
					shouldDirty: true,
				});
				return nextSelected;
			});
			setAvailablePassports((prev) => [...prev, passportRow]);
		},
		[setValue]
	);

	// Cấu hình cột bảng bên trái (Danh sách hộ chiếu của user)
	const leftPassportColumns = useMemo(
		() => [
			{
				name: "passportNumber",
				title: "Số hộ chiếu",
				width: "150px",
				renderCell: ({ row }) => row?.passportNumber || "-",
			},
			{
				name: "passportType",
				title: "Loại hộ chiếu",
				width: "150px",
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
				width: "120px",
				renderCell: ({ row }) => (row?.issueDate ? dayjs(row.issueDate).format("DD/MM/YYYY") : "-"),
			},
			{
				name: "expiryDate",
				title: "Ngày hết hiệu lực",
				width: "140px",
				renderCell: ({ row }) => (row?.expiryDate ? dayjs(row.expiryDate).format("DD/MM/YYYY") : "-"),
			},
			{
				name: "action",
				title: "Hành động",
				width: "110px",
				alignCenter: true,
				renderCell: ({ row }) => (
					<AddButtonCell row={row} onAdd={handleAddPassport} ButtonOutline={ButtonOutline} />
				),
			},
		],
		[handleAddPassport, ButtonOutline]
	);

	// Cấu hình cột bảng bên phải (Danh sách hộ chiếu chọn trả)
	const rightPassportColumns = useMemo(
		() => [
			{
				name: "passportNumber",
				title: "Số hộ chiếu",
				width: "150px",
				renderCell: ({ row }) => row?.passportNumber || "-",
			},
			{
				name: "passportType",
				title: "Loại hộ chiếu",
				width: "150px",
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
				width: "120px",
				renderCell: ({ row }) => (row?.issueDate ? dayjs(row.issueDate).format("DD/MM/YYYY") : "-"),
			},
			{
				name: "expiryDate",
				title: "Ngày hết hiệu lực",
				width: "140px",
				renderCell: ({ row }) => (row?.expiryDate ? dayjs(row.expiryDate).format("DD/MM/YYYY") : "-"),
			},
			{
				name: "action",
				title: "Hành động",
				width: "110px",
				alignCenter: true,
				renderCell: ({ row }) => (
					<DeleteButtonCell row={row} onRemove={handleRemovePassport} ButtonOutline={ButtonOutline} />
				),
			},
		],
		[handleRemovePassport, ButtonOutline]
	);

	const handleDateChange = useCallback(
		(field) => (newDate) => {
			field.onChange(newDate ? dayjs(newDate).toISOString() : null);
		},
		[]
	);

	const handleClose = useCallback(async () => {
		reset(defaultValueReturnPassportSlip);
		setAvailablePassports([]);
		setSelectedPassports([]);
		onClose();
	}, [onClose, reset]);

	// Fetch dữ liệu chi tiết khi mở modal cập nhật
	useEffect(() => {
		if (!open) return;

		const fetchDetailData = async () => {
			if (!id) return;
			setIsLoading(true);
			try {
				const res = await dispatch(viewPassportsReturnSlip(id)).unwrap();
				const detailData = res?.data?.data || res?.data || res;

				if (detailData) {
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

					setSelectedPassports(selectedReturnPassports);

					const borrowerEofficeAccountId =
						formattedAccount?.id ||
						detailData.eofficeAccountInfo?.id ||
						(typeof detailData.eofficeAccount === "string" ? detailData.eofficeAccount : detailData.eofficeAccount?.id);

					if (borrowerEofficeAccountId) {
						setIsLoadingPassports(true);
						try {
							const passportRes = await dispatch(getDataListReturnPassports(borrowerEofficeAccountId)).unwrap();
							const userPassports = Array.isArray(passportRes?.data?.data)
								? passportRes.data.data
								: Array.isArray(passportRes?.data)
									? passportRes.data
									: Array.isArray(passportRes)
										? passportRes
										: [];

							const selectedKeys = new Set(
								selectedReturnPassports.map((item) => item.passportId || item.id || item.passportNumber)
							);
							const available = userPassports.filter(
								(item) => !selectedKeys.has(item.passportId || item.id || item.passportNumber)
							);
							setAvailablePassports(available);
						} catch (err) {
							const messageError =
								err?.response?.data?.message ||
								err.message ||
								"Không thể lấy danh sách hộ chiếu của cán bộ!";
							logger.log("Lỗi khi lấy danh sách hộ chiếu của user:", err);
							toast(messageError, "error");
						} finally {
							setIsLoadingPassports(false);
						}
					}
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
	}, [open, id, dispatch, reset, toast]);

	const handleSave = useCallback(
		async (formData) => {
			try {
				setIsLoading(true);
				const payload = {
					...formData,
					eofficeAccount: formData?.eofficeAccount?.id || formData?.eofficeAccount?.value || formData?.eofficeAccount,
					passportListReturn: selectedPassports,
				};

				await dispatch(updatePassportsReturnSlip({ id, payload })).unwrap();
				toast("Cập nhật phiếu trả hộ chiếu thành công!", "success");
				if (onSuccess) {
					onSuccess();
				}
				setReloadData((prev) => prev + 1)
				onClose();
			} catch (error) {
				logger.log("Lỗi khi cập nhật phiếu trả hộ chiếu:", error);
				const messageError =
					error?.response?.data?.message ||
					error.message ||
					"Cập nhật phiếu trả hộ chiếu thất bại!";
				toast(messageError, "error");
			} finally {
				setIsLoading(false);
			}
		},
		[id, dispatch, selectedPassports, toast, onSuccess, onClose, setReloadData]
	);

	const handleChangeEofficeAccount = useCallback(
		async (value) => {
			setValue("eofficeAccount", value);

			// 1. Reset toàn bộ dữ liệu của cả 2 bảng và passportListReturn trong form
			setAvailablePassports([]);
			setSelectedPassports([]);
			setValue("passportListReturn", [], { shouldValidate: true, shouldDirty: true });

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
					setValue("rank", res.idArmyRank?.nameVn || "");
					setValue("unitName", res.organization?.nameVn || "");
					setValue("departmentName", res.organization?.nameVn || "");
					setValue("divisionName", res.organization?.nameVn || "");
					setValue("positionTitle", res.jobId?.nameVn || "");
				} catch (error) {
					const messageError =
						error?.response?.data?.message ||
						error.message ||
						"Lấy dữ liệu chi tiết tài khoản eOffice thất bại!";
					toast(messageError, "error");
					logger.log("Lỗi khi lấy dữ liệu chi tiết tài khoản eOffice:", error);
				}

				// 2. Gọi API lấy danh sách hộ chiếu của user
				const borrowerEofficeAccount = value.id || value.value || value.eofficeAccount || value;
				if (borrowerEofficeAccount) {
					setIsLoadingPassports(true);
					try {
						const passportRes = await dispatch(getDataListReturnPassports(borrowerEofficeAccount)).unwrap();
						const passportList = Array.isArray(passportRes?.data?.data)
							? passportRes.data.data
							: Array.isArray(passportRes?.data)
								? passportRes.data
								: Array.isArray(passportRes)
									? passportRes
									: [];
						setAvailablePassports(passportList);
					} catch (err) {
						const messageError =
							err?.response?.data?.message ||
							err.message ||
							"Không thể lấy chi tiết phiếu trả hộ chiếu!";
						toast(messageError, "error");
						logger.log("Lỗi khi lấy danh sách hộ chiếu của user:", err);
					} finally {
						setIsLoadingPassports(false);
					}
				}
			} else {
				// Reset các trường khi xóa lựa chọn
				setValue("positionTitle", null);
				setValue("rank", null);
				setValue("unitName", null);
				setValue("departmentName", null);
				setValue("divisionName", null);
			}
		},
		[setValue, dispatch, toast]
	);

	return (
		<BaseSwipper
			title={title || "Cập nhật phiếu trả hộ chiếu"}
			open={open}
			onClose={handleClose}
			onSave={handleSubmit(handleSave)}
			type="edit"
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
							Cập nhật
						</ButtonOutline>
					</FooterActions>
				</>
			}
			isLoading={isLoading || isLoadingPassports}
		>
			{(isLoading || isLoadingPassports) && (
				<StyledLoadingPopupSignDigital>
					<CircularProgress />
				</StyledLoadingPopupSignDigital>
			)}
			<StyledBoxContainerContent styledMarginTop>
				<StyledTitleWithToggle>
					<FileIconSvg />
					<StyledSectionTitle variant="h6" noWrap>
						THÔNG TIN NGƯỜI
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
							name="countriesVisited"
							control={control}
							render={({ field }) => (
								<InputComponents
									label="Các nước đã đi"
									placeholder="Nhập số hộ chiếu duy nhất..."
									{...field}
									error={!!errors.countriesVisited}
									helperText={errors.countriesVisited?.message}
								/>
							)}
						/>
					</Grid>
				</Grid>
			</StyledBoxContainerContent>

			{/* Section chứa 2 bảng song song */}
			<StyledBoxContainerContent styledMarginTop>
				<Grid container spacing={2}>
					{/* Bảng bên trái: Danh sách hộ chiếu của user */}
					<Grid item xs={12} md={6}>
						<TableCardContainer variant="outlined">
							<TableCardTitle variant="h6">
								Danh sách hộ chiếu của cán bộ
							</TableCardTitle>
							<TableWrapperPassport>
								<CusTomTableFreeStyle
									data={availablePassports}
									columns={leftPassportColumns}
									onlyTable
									noneTitle
									disableAct
									disableCheckbox
									autoHeight
								/>
							</TableWrapperPassport>
						</TableCardContainer>
					</Grid>

					{/* Bảng bên phải: Danh sách hộ chiếu chọn để trả */}
					<Grid item xs={12} md={6}>
						<TableCardContainer variant="outlined">
							<TableCardTitle variant="h6">
								Danh sách hộ chiếu trả lại cán bộ
							</TableCardTitle>
							<TableWrapperPassport>
								<CusTomTableFreeStyle
									data={selectedPassports}
									columns={rightPassportColumns}
									onlyTable
									noneTitle
									disableAct
									disableCheckbox
									autoHeight
								/>
							</TableWrapperPassport>
						</TableCardContainer>
					</Grid>
				</Grid>
			</StyledBoxContainerContent>
		</BaseSwipper>
	);
};

EditPassportReturnSlip.propTypes = {
	open: PropTypes.bool,
	onClose: PropTypes.func,
	onSuccess: PropTypes.func,
	isLoading: PropTypes.bool,
	sharedComponents: PropTypes.object,
	mode: PropTypes.string,
	title: PropTypes.string,
	id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	data: PropTypes.object,
};

export default withSharedComponents(EditPassportReturnSlip);
