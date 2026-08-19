import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Box,
	// Checkbox,
	// FormControlLabel,
	CircularProgress,
	Grid,
	Typography,
} from "@mui/material";
import { useToast } from "@components/common/ToastProvider";
import { useForm, Controller } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";

import { StyledBoxContainerContent, StyledHeaderContent } from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import {
	cancelPassportRequest,
	getDataDetailPassportRequest,
	getDataHistoryPassportRequest,
	updatePassportRequest,
} from "@redux/slices/PassportManagement/PassportManagementSlice";

import UploadFile from "@components/UploadFile";
import { FileViewerDialog } from "@components/CustomDialog";
import CusTomTableFreeStyle from "@components/CustomTable/CusTomTableFreeStyle";
import { apiUploadFile } from "@services/FileUpload/fileUpload";
import { defaultValueRequestListPage } from "./constantsRequestListPage";
import EditRequest from "./EditRequest";
import { CancelButton } from "@styles/CustomDialog.styles";
import {
	HistoryCardPassport,
	MemberTableActions,
	MemberTableHeader,
	StyledHeaderSectionContent,
	SubTextCancelReasonPassportRequest,
	TableWrapperPassport,
	TextCancelReasonPassportRequest,
	VoucherLabelText,
	VoucherLinkText,
	VoucherStatusText,
	VoucherSummaryCard,
	VoucherSummaryDeadline,
	VoucherSummaryDeadlineValue,
	VoucherSummaryHeader,
	VoucherSummaryTitle,
	VoucherValueText,
	ReturnHistoryContainer,
	ReturnHistoryHeader,
	ReturnHistoryItem,
	ReturnHistoryItemText,
	ReturnHistoryLink,
	ReturnHistorySummary,
	StyledDescription,
} from "@styles/PassportManagement.styles";
import RequestApprovalDialog from "./components/RequestApprovalDialog";
import OfficialHandoverDocument from "./components/OfficialHandoverDocument";
import SectionHeaderToggle from "@components/UploadFile/components/SectionHeaderToggle";
import {
	MarginBox,
	ReasonText,
	SecondaryTypography,
	StatusWrapper,
	TimelineDate,
	TimelineItem,
	TimelineText,
	// TimelineTitle,
	TimelineWrapper,
	TitleBox,
} from "@pages/RecommendationsPage/components/RecommendationsForm.styles";
import {
	// IconRequied,
	StyledLoadingPopupSignDigital
} from "@styles/UploadFile/UploadFile.style";
import ViewHandoverMinutes from "./components/ViewHandoverMinutes";
import CreateReturnVoucher from "./components/CreateReturnVoucher";
import DOMPurify from "dompurify";
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";
import { StyledSectionTitle, StyledTitleWithToggle } from "@styles/RecordDestruction/RecordDestruction.styles";
import { FileIconSvg } from "@assets/icons/FileIconSvg";
import withFormWrapper from "@components/common/FormWrapper";


const ViewPassportRequest = (props) => {
	const {
		open,
		onClose,
		sharedComponents,
		title,
		id,
		setReloadData,
		isActionMenu = true,
		passportRequestId,
	} = props;
	const {
		BaseSwipper,
		InputComponents: BaseInput,
		DatePicker: BaseDatePicker,
		CustomAutoCompleteSearch: BaseCustomAutoCompleteSearch,
		ButtonOutline,
		Dialog,
	} = sharedComponents;
	const toast = useToast();
	const dispatch = useDispatch();
	const { dataHistoryPassportRequest } = useSelector(
		(state) => state.passportManagement
	);
	const { dataUser } = useSelector((state) => state.auth);
	// logger.log("dataUser", dataUser);
	const [isLoading, setIsLoading] = useState(false);
	const [isOrganizational, setIsOrganizational] = useState(false);
	const [openDialogAction, setOpenDialogAction] = useState({
		open: false,
		actionType: null,
		title: "",
	});
	const [editPassportList, setEditPassportList] = useState({
		open: false,
		passportId: null,
	});

	const {
		control,
		watch,
		reset,
		handleSubmit,
		formState: { errors },
	} = useForm({
		defaultValues: defaultValueRequestListPage,
	});

	// Form riêng cho dialog hủy yêu cầu
	const {
		control: cancelControl,
		handleSubmit: handleCancelSubmit,
		reset: resetCancelForm,
		formState: { errors: cancelErrors },
	} = useForm({
		defaultValues: {
			cancelReason: "",
		},
		mode: "onChange",
	});

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

	const CustomAutoCompleteSearch = useMemo(() => {
		const Wrapped = withFormWrapper(BaseCustomAutoCompleteSearch, "asyncSelect");
		const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : isView} />;
		Component.displayName = "CustomAutoCompleteSearch";
		return Component;
	}, [BaseCustomAutoCompleteSearch, isView]);

	const departureDate = watch("departureDate");
	const arrivalDate = watch("arrivalDate");
	const destinationOtherValue = watch("destinationOther");
	// const passportBorrowDate = watch("passportBorrowDate");
	// const passportReturnDate = watch("passportReturnDate");

	const [viewingFile, setViewingFile] = useState({
		open: false,
		url: null,
		name: "",
		type: null,
	});
	const [dataDetail, setDataDetail] = useState(null);
	const { returnHistory } = dataDetail || {};
	// logger.log("dataDetail", dataDetail);
	// logger.log("returnHistory", returnHistory);
	// ============ REQUESTER INFO ============
	const [requesterInfo, setRequesterInfo] = useState(null);

	// ============ MEMBER TABLE STATE (organizational) ============
	const [memberList, setMemberList] = useState([]);
	const [isReloadingDetail, setIsReloadingDetail] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState({
		open: false,
		onConfirm: null,
		title: "",
		content: "",
	});
	const [openOfficialHandoverDoc, setOpenOfficialHandoverDoc] = useState(false);
	const [openCreateReturnVoucher, setOpenCreateReturnVoucher] = useState(false);
	const [openViewHandoverMinutes, setOpenViewHandoverMinutes] = useState(false);
	const [selectedMinutesId, setSelectedMinutesId] = useState(null);
	const [isOpen, setIsOpen] = useState({
		creatorInformation: false,
	});
	const [, setHandoverReturnMode] = useState("DETAIL");
	const [statusReturnDeadline, setStatusReturnDeadline] = useState(null);
	const [selectedPassportId, setSelectedPassportId] = useState(null);
	const requestId = id ?? passportRequestId;

	const reloadRequestDetail = useCallback(async () => {
		const [res] = await Promise.all([
			dispatch(getDataDetailPassportRequest(requestId)).unwrap(),
			dispatch(getDataHistoryPassportRequest(requestId)).unwrap(),
		]);

		const isOrganizationalType =
			res.typeRequest?.value === "organizational" ||
			res.typeRequest === "organizational";
		const departureDate = res.departureDate || null;
		const arrivalDate = res.arrivalDate || null;
		if (!isOrganizationalType) {
			const passportId =
				res?.passportNumber?.id ||
				res?.passportNumber?._id ||
				res?.passportId ||
				null;
			setSelectedPassportId(passportId);
		}
		reset({
			...defaultValueRequestListPage,
			...res,
			namePassportRequest: isOrganizationalType
				? res.namePassportRequest?.nameVn
				: res.namePassportRequest || "",
			passportBorrowDate: departureDate
				? dayjs(departureDate).subtract(5, "day").toISOString()
				: null,
			passportReturnDate: arrivalDate
				? dayjs(arrivalDate).add(5, "day").toISOString()
				: null,
		});
		setIsOrganizational(res.typeRequest?.value);
		setDataDetail(res);

		if (res.requesterInfo) {
			setRequesterInfo(res.requesterInfo);
		}

		if (
			res.typeRequest?.value === "organizational" &&
			Array.isArray(res.listOfOrganizations)
		) {
			const rebuiltMembers = res.listOfOrganizations.map((item, index) => ({
				_id: item._id || `view_${Date.now()}_${index}`,
				hoTen: item.fullName || "",
				soHoChieu: item.passportNumber || "",
				chucVu: item.position || "",
				capBac: item.rank || "",
				donVi: item.unit || "",
				loaiCB: item.cbType || "",
				ngayHetHan: item.expiryDate || "",
			}));
			setMemberList(rebuiltMembers);
		} else {
			setMemberList([]);
		}
	}, [dispatch, requestId, reset]);

	// ============ FETCH DETAIL DATA ============
	useEffect(() => {
		// if (!id || !passportRequestId || !open) return;
		const fetchDataDetail = async () => {
			try {
				setIsLoading(true);
				setSelectedPassportId(null);
				await reloadRequestDetail();
			} catch (error) {
				const messageError =
					error?.response?.data?.message ||
					error.message ||
					"Lỗi khi lấy chi tiết yêu cầu hộ chiếu!";
				toast(messageError, "error");
			} finally {
				setIsLoading(false);
			}
		};

		fetchDataDetail();
	}, [id, passportRequestId, open, toast, reloadRequestDetail]);
	// ============ CLOSE ============
	const handleClose = useCallback(() => {
		reset(defaultValueRequestListPage);
		setMemberList([]);
		setRequesterInfo(null);
		setOpenOfficialHandoverDoc(false);
		setOpenCreateReturnVoucher(false);
		onClose();
	}, [onClose, reset]);

	const handleCloseFileViewer = useCallback(() => {
		if (viewingFile.url) {
			URL.revokeObjectURL(viewingFile.url);
		}
		setViewingFile({ open: false, url: null, name: "", type: null });
	}, [viewingFile.url]);

	const handleOpenCreatorInformation = useCallback(() => {
		setIsOpen((prev) => ({
			...prev,
			creatorInformation: !prev.creatorInformation,
		}));
	}, []);

	const formatDisplayDate = useCallback((value) => {
		if (!value) return "";
		const parsedDate = dayjs(value);
		return parsedDate.isValid() ? parsedDate.format("DD/MM/YYYY") : "";
	}, []);

	const totalMembers = memberList.filter((m) => m.hoTen).length;
	const totalPassports = memberList.filter((m) => m.soHoChieu).length;

	const memberColumns = useMemo(
		() => [
			{ name: "hoTen", title: "Họ tên", width: "200px" },
			{ name: "soHoChieu", title: "Số hộ chiếu", width: "180px" },
			{ name: "chucVu", title: "Chức vụ", width: "150px" },
			{ name: "capBac", title: "Cấp bậc", width: "120px" },
			{ name: "donVi", title: "Đơn vị", width: "150px" },
			// { name: "loaiCB", title: "Loại CB", width: "100px" },
			{ name: "ngayHetHan", title: "Ngày hết hạn", width: "120px" },
		],
		[]
	);

	// Kiểm tra người đề nghị khác người mượn
	const namePassportRequestValue = watch("namePassportRequest");
	const isRequesterDifferent = useMemo(() => {
		if (!requesterInfo?.id || !namePassportRequestValue?.id) return false;
		return requesterInfo.id !== namePassportRequestValue.id;
	}, [requesterInfo, namePassportRequestValue]);

	const isCreator = useMemo(() => {
		const userId = dataUser?.id ?? dataUser?._id;
		const requesterId =
			dataDetail?.requesterInfo?.id ??
			dataDetail?.requesterInfo?._id ??
			requesterInfo?.id ??
			requesterInfo?._id ??
			dataDetail?.requesterId ??
			null;
		if (userId == null || requesterId == null) return false;

		return String(userId).trim() === String(requesterId).trim();
	}, [dataUser, dataDetail, requesterInfo]);

	// ============ RENDER: User Form ============
	const renderUserForm = () => (
		<>
			<StyledBoxContainerContent styledMarginTop>
				<TitleBox>
					<StyledTitleWithToggle>
						<FileIconSvg />
						<StyledSectionTitle variant="h6" noWrap>
							THÔNG TIN YÊU CẦU MƯỢN HỘ CHIẾU CÁ NHÂN
						</StyledSectionTitle>
					</StyledTitleWithToggle>
					<StatusWrapper>
						<SecondaryTypography variant="body2">
							Trạng thái:
						</SecondaryTypography>
						<div
							dangerouslySetInnerHTML={{
								__html: DOMPurify.sanitize(`<p>${dataDetail?.status?.title || ""}</p>`),
							}}
						/>
					</StatusWrapper>
				</TitleBox>
				<Grid container spacing={2} mt={2}>
					{isRequesterDifferent && (
						<>
							<Grid item xs={12} md={6} sm={6}>
								<InputComponents
									label="Người đề nghị"
									value={requesterInfo?.name || ""}
									disabled
								/>
							</Grid>
							<Grid item xs={12} md={6} sm={6}>
								<InputComponents
									label="Đơn vị"
									value={requesterInfo?.organizationName || ""}
									disabled
								/>
							</Grid>
							<Grid item xs={12}>
								<StyledDescription>
									Đề nghị thủ trưởng đơn vị cho phép tôi mượn hộ chiếu với thông tin như sau:
								</StyledDescription>
							</Grid>
						</>
					)}
					<Grid item xs={12} md={6} sm={6}>
						<Controller
							name="namePassportRequest"
							control={control}
							render={({ field }) => (
								<InputComponents
									label="Người mượn"
									value={field.value?.nameVn || ""}
									disabled
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={6}>
						<Controller
							name="leader"
							control={control}
							render={({ field }) => (
								<InputComponents
									label="Lãnh đạo"
									value={field.value?.nameVn || ""}
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
									value={field.value?.passportNumber || ""}
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
									placeholder=""
									customLabel="title"
									customValue="value"
									{...field}
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
									disabled
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
									disabled
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
									{...field}
									multiline
									rows={2}
									disabled
								/>
							)}
						/>
					</Grid>
				</Grid>
			</StyledBoxContainerContent>
			<StyledBoxContainerContent styledMarginTop>
				<Grid item xs={12}>
					<UploadFile
						// label="SCAN ẢNH HỘ CHIẾU"
						// manualUpload
						objectId={selectedPassportId}
						objectType="scanPassport"
						id="scanFile-upload"
						editFile
						// required
						noneBorder
						isActionMenu
						hiddenUploadAndScan
						isView
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
			{hasVoucherSummary && (
				<StyledBoxContainerContent styledMarginTop>
					<VoucherSummaryHeader>
						<StyledHeaderSectionContent variant="h6" noWrap>
							Tiếp nhận bàn giao - hoàn trả
						</StyledHeaderSectionContent>
						<VoucherSummaryDeadline variant="body2">
							Hạn hoàn trả:{" "}
							<VoucherSummaryDeadlineValue
								component="span"
								isColor={statusReturnDeadline}
							>
								{returnDeadlineDisplay}
							</VoucherSummaryDeadlineValue>
						</VoucherSummaryDeadline>
					</VoucherSummaryHeader>

					<Grid container spacing={2}>
						<Grid item xs={12} md={6}>
							<VoucherSummaryCard>
								<VoucherSummaryTitle variant="subtitle1">
									BÀN GIAO
								</VoucherSummaryTitle>
								<Grid container spacing={1}>
									<Grid item xs={4}>
										<VoucherLabelText variant="body2">
											Thời gian bàn giao:
										</VoucherLabelText>
									</Grid>
									<Grid item xs={8}>
										<VoucherValueText variant="body2">
											{formatVoucherTime(handoverVoucherData)}
										</VoucherValueText>
									</Grid>

									<Grid item xs={4}>
										<VoucherLabelText variant="body2">
											Người bàn giao:
										</VoucherLabelText>
									</Grid>
									<Grid item xs={8}>
										<VoucherValueText variant="body2">
											{handoverVoucherData?.performerName || "--"}
										</VoucherValueText>
									</Grid>

									<Grid item xs={4}>
										<VoucherLabelText variant="body2">
											Người mượn:
										</VoucherLabelText>
									</Grid>
									<Grid item xs={8}>
										<VoucherValueText variant="body2">
											{handoverVoucherData?.receiverName || "--"}
										</VoucherValueText>
									</Grid>

									<Grid item xs={4}>
										<VoucherLabelText variant="body2">
											Tình trạng ký số:
										</VoucherLabelText>
									</Grid>
									<Grid item xs={8}>
										<VoucherStatusText
											variant="body2"
											statusColor={
												getVoucherSignedStatus(handoverVoucherData).color
											}
										>
											{getVoucherSignedStatus(handoverVoucherData).icon}{" "}
											{getVoucherSignedStatus(handoverVoucherData).label}
										</VoucherStatusText>
									</Grid>

									<Grid item xs={4}>
										<VoucherLabelText variant="body2">
											Biên bản:
										</VoucherLabelText>
									</Grid>
									<Grid item xs={8}>
										<VoucherLinkText
											component="button"
											type="button"
											underline="hover"
											onClick={handleOpenHandoverVoucherMinutes}
										>
											{handoverVoucherData?.voucherCode || "Xem biên bản"}
										</VoucherLinkText>
									</Grid>
								</Grid>
							</VoucherSummaryCard>
						</Grid>

						<Grid item xs={12} md={6}>
							<VoucherSummaryCard>
								<VoucherSummaryTitle variant="subtitle1">
									HOÀN TRẢ
								</VoucherSummaryTitle>
								<Grid container spacing={1}>
									<Grid item xs={4}>
										<VoucherLabelText variant="body2">
											Thời gian hoàn trả:
										</VoucherLabelText>
									</Grid>
									<Grid item xs={8}>
										<VoucherValueText variant="body2">
											{formatVoucherTime(returnVoucherData)}
										</VoucherValueText>
									</Grid>

									<Grid item xs={4}>
										<VoucherLabelText variant="body2">
											Người trả:
										</VoucherLabelText>
									</Grid>
									<Grid item xs={8}>
										<VoucherValueText variant="body2">
											{returnVoucherData?.performerName || "--"}
										</VoucherValueText>
									</Grid>

									<Grid item xs={4}>
										<VoucherLabelText variant="body2">
											Người nhận lại:
										</VoucherLabelText>
									</Grid>
									<Grid item xs={8}>
										<VoucherValueText variant="body2">
											{returnVoucherData?.receiverName || "--"}
										</VoucherValueText>
									</Grid>

									<Grid item xs={4}>
										<VoucherLabelText variant="body2">
											Tình trạng ký số:
										</VoucherLabelText>
									</Grid>
									<Grid item xs={8}>
										<VoucherStatusText
											variant="body2"
											statusColor={returnVoucherData?.signStatusColor ?? getVoucherSignedStatus(
												returnVoucherData,
												!!returnHistory?.length
											).color ?? "default"}
										>
											{returnVoucherData?.signStatusIcon ?? getVoucherSignedStatus(
												returnVoucherData,
												!!returnHistory?.length
											).icon ?? "--"}{" "}
											{returnVoucherData?.signStatus ?? getVoucherSignedStatus(
												returnVoucherData,
												!!returnHistory?.length
											).label ?? "--"}
										</VoucherStatusText>
									</Grid>

									<Grid item xs={4}>
										<VoucherLabelText variant="body2">
											Biên bản:
										</VoucherLabelText>
									</Grid>
									<Grid item xs={8}>
										<VoucherLinkText
											component="button"
											type="button"
											underline="hover"
											onClick={handleOpenReturnVoucherMinutes}
										>
											{returnVoucherData?.voucherCode || "Xem biên bản"}
										</VoucherLinkText>
									</Grid>
								</Grid>
							</VoucherSummaryCard>
						</Grid>
					</Grid>
				</StyledBoxContainerContent>
			)}
			{!isCreator && (
				<StyledBoxContainerContent styledMarginTop>
					<SectionHeaderToggle
						customTitle={
							<StyledHeaderContent variant="h6" noWrap>
								THÔNG TIN NGƯỜI TẠO
							</StyledHeaderContent>
						}
						isOpen={isOpen.creatorInformation}
						dataSection={"creatorInformation"}
						onClick={handleOpenCreatorInformation}
					/>
					{isOpen.creatorInformation && (
						<Grid container spacing={2} mt={1}>
							<Grid item xs={12} sm={6} md={3}>
								<InputComponents
									label="Người tạo"
									value={dataDetail?.requesterInfo?.name || ""}
									disabled
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<InputComponents
									label="Chức vụ"
									value={dataDetail?.requesterInfo?.position || ""}
									disabled
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<InputComponents
									label="Phòng ban"
									value={dataDetail?.requesterInfo?.organizationName || ""}
									disabled
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<InputComponents
									label="Thời gian tạo"
									value={
										dataDetail?.createdAt
											? dayjs(dataDetail?.createdAt).format(
												"DD/MM/YYYY, HH:mm:ss"
											)
											: ""
									}
									disabled
								/>
							</Grid>
						</Grid>
					)}
				</StyledBoxContainerContent>
			)}
		</>
	);

	// ============ RENDER: Organizational Form ============
	const renderOrganizationalForm = ({ statusRequest }) => (
		<>
			<StyledBoxContainerContent styledMarginTop>
				<TitleBox>
					<StyledTitleWithToggle>
						<FileIconSvg />
						<StyledSectionTitle variant="h6" noWrap>
							THÔNG TIN YÊU CẦU MƯỢN HỘ CHIẾU ĐOÀN RA
						</StyledSectionTitle>
					</StyledTitleWithToggle>
					<StatusWrapper>
						<SecondaryTypography variant="body2">
							Trạng thái:
						</SecondaryTypography>
						<div
							dangerouslySetInnerHTML={{
								__html: DOMPurify.sanitize(`<p>${dataDetail?.status?.title || ""}</p>`),
							}}
						/>
					</StatusWrapper>
				</TitleBox>
				<Grid container spacing={2} mt={2}>
					<Grid item xs={12} md={4} sm={6}>
						<Controller
							name="namePassportRequest"
							control={control}
							render={({ field }) => (
								<InputComponents
									label="Tên đoàn"
									{...field}
									disabled
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={4}>
						<Controller
							name="delegationLeader"
							control={control}
							render={({ field }) => (
								<InputComponents
									label="Trưởng đoàn"
									value={field.value?.nameVn || ""}
									disabled
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} md={4} sm={6}>
						<Controller
							name="position"
							control={control}
							render={({ field }) => (
								<InputComponents
									label="Chức vụ"
									{...field}
									disabled
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={4}>
						<Controller
							name="destination"
							control={control}
							render={({ field }) => {
								let displayDestination = "";
								if (destinationOtherValue) {
									displayDestination = "Khác";
								} else if (Array.isArray(field.value)) {
									displayDestination = field.value
										.map((item) =>
											typeof item === "object"
												? item?.title || item?.name || item?.ivalued || item?.value
												: String(item)
										)
										.filter(Boolean)
										.join(", ");
								} else if (typeof field.value === "object") {
									displayDestination =
										field.value?.title ||
										field.value?.name ||
										field.value?.ivalued ||
										field.value?.value ||
										"";
								} else {
									displayDestination = field.value || "";
								}

								return (
									<InputComponents
										label="Nơi đến"
										value={displayDestination}
										disabled
									/>
								);
							}}
						/>
					</Grid>
					{!!destinationOtherValue && (
						<Grid item xs={12} sm={6} md={4}>
							<InputComponents
								label="Nơi đến (khác)"
								value={destinationOtherValue}
								disabled
							/>
						</Grid>
					)}
					<Grid item xs={12} sm={6} md={4}>
						<InputComponents
							label="Ngày đi"
							value={`${formatDisplayDate(departureDate) || "--"}`}
							disabled
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={4}>
						<InputComponents
							label="Ngày về"
							value={`${formatDisplayDate(arrivalDate) || "--"}`}
							disabled
						/>
					</Grid>
					{/* <Grid item xs={12} sm={6} md={4}>
						<InputComponents
							label="Ngày dự kiến mượn - trả"
							value={`${formatDisplayDate(passportBorrowDate) || "--"} - ${formatDisplayDate(passportReturnDate) || "--"}`}
							disabled
						/>
					</Grid> */}
					<Grid item xs={12} sm={6} md={8}>
						<Controller
							name="partner"
							control={control}
							render={({ field }) => (
								<InputComponents
									label="Đối tác"
									{...field}
									disabled
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={4}>
						<Controller
							name="typeOfFunding"
							control={control}
							render={({ field }) => (
								<CustomAutoCompleteSearch
									select
									code="typeOfFunding"
									label="Loại kinh phí"
									placeholder="Nhập dữ liệu..."
									customLabel="title"
									customValue="value"
									{...field}
									unsetFontWeight
									disabled
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={12}>
						<Controller
							name="partnerGifts"
							label="Quà tặng TCT"
							control={control}
							render={({ field }) => (
								<InputComponents
									label="Quà tặng TCT"
									placeholder="Nhập quà tặng TCT..."
									{...field}
									disabled
								/>
							)}
						/>
					</Grid>
					{(statusRequest === "IN_USE" || statusRequest === "COMPLETED") && (
						<Grid item xs={12} sm={6} md={12}>
							<Controller
								name="receivedGifts"
								control={control}
								render={({ field }) => (
									<InputComponents
										label="Quà tặng từ đối tác"
										placeholder="Nhập quà tặng từ đối tác..."
										{...field}
										error={!!errors.receivedGifts}
										helperText={errors.receivedGifts?.message}
										disabled={statusRequest === "COMPLETED"}
									/>
								)}
							/>
						</Grid>
					)}
					<Grid item xs={12}>
						<Controller
							name="tripContent"
							control={control}
							render={({ field }) => (
								<InputComponents
									label="Nội dung chuyến đi"
									{...field}
									multiline
									rows={2}
									disabled
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12}>
						<Controller
							name="decision"
							control={control}
							render={({ field }) => (
								<InputComponents
									label="Quyết định"
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
									{...field}
									disabled
								/>
							)}
						/>
					</Grid>
				</Grid>
			</StyledBoxContainerContent>
			<StyledBoxContainerContent styledMarginTop>
				<Grid item xs={12}>
					<Controller
						name="passportFile"
						control={control}
						defaultValue={[]}
						render={({ field }) => (
							<UploadFile
								{...field}
								customLabel={
									<StyledTitleWithToggle>
										<FileIconSvg />
										<StyledSectionTitle variant="h6" noWrap>
											TỆP ĐÍNH KÈM QUYẾT ĐỊNH ĐOÀN RA
										</StyledSectionTitle>
									</StyledTitleWithToggle>
								}
								objectId={id}
								objectType="passportFile"
								id="passportFile-view"
								isActionMenu={isActionMenu}
								noneBorder
								hiddenUploadAndScan
								canNotDeleteFile
							/>
						)}
					/>
				</Grid>
			</StyledBoxContainerContent>
			{(statusRequest === "IN_USE" || statusRequest === "COMPLETED") && (
				<StyledBoxContainerContent styledMarginTop>
					<Grid item xs={12}>
						<Controller
							name="ppResultTripFile"
							control={control}
							rules={{
								validate: (value) => {
									const files = Array.isArray(value)
										? value
										: value
											? [value]
											: [];
									return (
										files.length > 0 ||
										"Vui lòng tải lên file kết quả chuyến đi"
									);
								},
							}}
							defaultValue={[]}
							render={({ field, fieldState }) => (
								<UploadFile
									{...field}
									customLabel={
										<StyledTitleWithToggle>
											<FileIconSvg />
											<StyledSectionTitle variant="h6" noWrap>
												TỆP ĐÍNH KÈM KẾT QUẢ CHUYẾN ĐI
											</StyledSectionTitle>
										</StyledTitleWithToggle>
									}
									manualUpload
									objectType="ppResultTripFile"
									id="ppResultTripFile-upload"
									error={!!fieldState.error}
									helperText={fieldState.error?.message}
									noneBorder
									hiddenButtonScan
									hiddenUploadAndScan={statusRequest === "COMPLETED"}
									canNotDeleteFile={statusRequest === "COMPLETED"}
									isActionMenu={isActionMenu}
								/>
							)}
						/>
					</Grid>
				</StyledBoxContainerContent>
			)}
			<StyledBoxContainerContent styledMarginTop>
				<Grid item xs={12}>
					<MemberTableHeader>
						<StyledTitleWithToggle>
							<FileIconSvg />
							<StyledSectionTitle variant="h6" noWrap>
								DANH SÁCH ĐOÀN RA
							</StyledSectionTitle>
						</StyledTitleWithToggle>
						<MemberTableActions>
							<Typography variant="body2">
								Tổng số thành viên: <strong>{totalMembers}</strong>
							</Typography>
							<Typography variant="body2">
								Tổng số hộ chiếu: <strong>{totalPassports}</strong>
							</Typography>
						</MemberTableActions>
					</MemberTableHeader>
					<TableWrapperPassport>
						<CusTomTableFreeStyle
							data={memberList}
							columns={memberColumns}
							onlyTable
							noneTitle
							disableAct
							disableCheckbox
							autoHeight
						/>
					</TableWrapperPassport>
				</Grid>
			</StyledBoxContainerContent>
			{hasVoucherSummary && (
				<StyledBoxContainerContent styledMarginTop>
					<VoucherSummaryHeader>
						<StyledTitleWithToggle>
							<FileIconSvg />
							<StyledSectionTitle variant="h6" noWrap>
								TIẾP NHẬN BÀN GIAO - HOÀN TRẢ
							</StyledSectionTitle>
						</StyledTitleWithToggle>
						<VoucherSummaryDeadline variant="body2">
							Hạn hoàn trả:{" "}
							<VoucherSummaryDeadlineValue
								component="span"
								isColor={statusReturnDeadline}
							>
								{returnDeadlineDisplay}
							</VoucherSummaryDeadlineValue>
						</VoucherSummaryDeadline>
					</VoucherSummaryHeader>

					<Grid container spacing={2}>
						{/* Bàn giao */}
						<Grid item xs={12} md={6}>
							<VoucherSummaryCard>
								<VoucherSummaryTitle variant="subtitle1">
									BÀN GIAO
								</VoucherSummaryTitle>
								<Grid container spacing={1}>
									<Grid item xs={4}>
										<VoucherLabelText variant="body2">
											Thời gian bàn giao:
										</VoucherLabelText>
									</Grid>
									<Grid item xs={8}>
										<VoucherValueText variant="body2">
											{formatVoucherTime(handoverVoucherData)}
										</VoucherValueText>
									</Grid>

									<Grid item xs={4}>
										<VoucherLabelText variant="body2">
											Người bàn giao:
										</VoucherLabelText>
									</Grid>
									<Grid item xs={8}>
										<VoucherValueText variant="body2">
											{handoverVoucherData?.performerName || "--"}
										</VoucherValueText>
									</Grid>

									<Grid item xs={4}>
										<VoucherLabelText variant="body2">
											Người mượn:
										</VoucherLabelText>
									</Grid>
									<Grid item xs={8}>
										<VoucherValueText variant="body2">
											{handoverVoucherData?.receiverName || "--"}
										</VoucherValueText>
									</Grid>

									<Grid item xs={4}>
										<VoucherLabelText variant="body2">
											Tình trạng ký số:
										</VoucherLabelText>
									</Grid>
									<Grid item xs={8}>
										<VoucherStatusText
											variant="body2"
											statusColor={
												getVoucherSignedStatus(handoverVoucherData).color
											}
										>
											{getVoucherSignedStatus(handoverVoucherData).icon}{" "}
											{getVoucherSignedStatus(handoverVoucherData).label}
										</VoucherStatusText>
									</Grid>

									<Grid item xs={4}>
										<VoucherLabelText variant="body2">
											Biên bản:
										</VoucherLabelText>
									</Grid>
									<Grid item xs={8}>
										<VoucherLinkText
											component="button"
											type="button"
											underline="hover"
											onClick={handleOpenHandoverVoucherMinutes}
										>
											{handoverVoucherData?.voucherCode || "--"}
										</VoucherLinkText>
									</Grid>
								</Grid>
							</VoucherSummaryCard>
						</Grid>

						{/* Hoàn trả */}
						<Grid item xs={12} md={6}>
							<VoucherSummaryCard>
								<VoucherSummaryTitle variant="subtitle1">
									HOÀN TRẢ
								</VoucherSummaryTitle>
								<Grid container spacing={1}>
									<Grid item xs={4}>
										<VoucherLabelText variant="body2">
											Thời gian hoàn trả:
										</VoucherLabelText>
									</Grid>
									<Grid item xs={8}>
										<VoucherValueText variant="body2">
											{formatVoucherTime(returnVoucherData)}
										</VoucherValueText>
									</Grid>

									<Grid item xs={4}>
										<VoucherLabelText variant="body2">
											Người trả:
										</VoucherLabelText>
									</Grid>
									<Grid item xs={8}>
										<VoucherValueText variant="body2">
											{returnVoucherData?.performerName || "--"}
										</VoucherValueText>
									</Grid>

									<Grid item xs={4}>
										<VoucherLabelText variant="body2">
											Người nhận lại:
										</VoucherLabelText>
									</Grid>
									<Grid item xs={8}>
										<VoucherValueText variant="body2">
											{returnVoucherData?.receiverName || "--"}
										</VoucherValueText>
									</Grid>

									<Grid item xs={4}>
										<VoucherLabelText variant="body2">
											Tình trạng ký số:
										</VoucherLabelText>
									</Grid>
									<Grid item xs={8}>
										<VoucherStatusText
											variant="body2"
											statusColor={returnVoucherData?.signStatusColor ?? getVoucherSignedStatus(
												returnVoucherData,
												!!returnHistory?.length
											).color ?? "default"}
										>
											{returnVoucherData?.signStatusIcon ?? getVoucherSignedStatus(
												returnVoucherData,
												!!returnHistory?.length
											).icon ?? "--"}{" "}
											{returnVoucherData?.signStatus ?? getVoucherSignedStatus(
												returnVoucherData,
												!!returnHistory?.length
											).label ?? "--"}
										</VoucherStatusText>
									</Grid>
									{returnHistory?.length === 0 && (
										<>
											<Grid item xs={4}>
												<VoucherLabelText variant="body2">
													Biên bản:
												</VoucherLabelText>
											</Grid>
											<Grid item xs={8}>
												<VoucherLinkText
													component="button"
													type="button"
													underline="hover"
													onClick={handleOpenReturnVoucherMinutes}
												>
													{returnVoucherData?.voucherCode || "--"}
												</VoucherLinkText>
											</Grid>
										</>
									)}
									{returnHistory?.length > 0 && (
										<Grid item xs={12}>
											<ReturnHistoryContainer>
												<ReturnHistoryHeader>
													<VoucherSummaryTitle variant="subtitle1">
														LỊCH SỬ HOÀN TRẢ
													</VoucherSummaryTitle>
													<ReturnHistorySummary>
														Hoàn trả: {totalReturnHistory.returned}/
														{totalReturnHistory.total} hộ chiếu
													</ReturnHistorySummary>
												</ReturnHistoryHeader>

												{returnHistoryDisplay.map((historyItem) => (
													<ReturnHistoryItem key={historyItem.id}>
														<ReturnHistoryItemText>
															{historyItem.timeLabel ||
																(historyItem.time
																	? dayjs(historyItem.time).format(
																		"DD/MM/YYYY HH:mm"
																	)
																	: "--")}{" "}
															- Nhận {historyItem.returnCount}/
															{historyItem.totalCount} hộ chiếu
														</ReturnHistoryItemText>
														<ReturnHistoryLink
															component="button"
															type="button"
															underline="hover"
															data-voucher-id={historyItem.voucherId || ""}
															onClick={handleOpenReturnHistoryMinutes}
														>
															{historyItem.voucherCode}
														</ReturnHistoryLink>
													</ReturnHistoryItem>
												))}
											</ReturnHistoryContainer>
										</Grid>
									)}
								</Grid>
							</VoucherSummaryCard>
						</Grid>
					</Grid>
				</StyledBoxContainerContent>
			)}
			{!isCreator && (
				<StyledBoxContainerContent styledMarginTop>
					<SectionHeaderToggle
						customTitle={
							<StyledHeaderSectionContent variant="h6" noWrap>
								THÔNG TIN NGƯỜI TẠO
							</StyledHeaderSectionContent>
						}
						isOpen={isOpen.creatorInformation}
						dataSection={"creatorInformation"}
						onClick={handleOpenCreatorInformation}
					/>
					{isOpen.creatorInformation && (
						<Grid container spacing={2} mt={1}>
							<Grid item xs={12} sm={6} md={3}>
								<InputComponents
									label="Người tạo"
									value={dataDetail?.requesterInfo?.name || ""}
									disabled
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<InputComponents
									label="Chức vụ"
									value={dataDetail?.requesterInfo?.position || ""}
									disabled
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<InputComponents
									label="Phòng ban"
									value={dataDetail?.requesterInfo?.organizationName || ""}
									disabled
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<InputComponents
									label="Thời gian tạo"
									value={
										dataDetail?.createdAt
											? dayjs(dataDetail?.createdAt).format(
												"DD/MM/YYYY, HH:mm:ss"
											)
											: ""
									}
									disabled
								/>
							</Grid>
						</Grid>
					)}
				</StyledBoxContainerContent>
			)}
		</>
	);

	const handleSwitchToEditMode = useCallback(() => {
		setEditPassportList({ open: true, passportId: props?.id });
	}, [props.id]);

	const handleCloseEditPassportList = useCallback(() => {
		setEditPassportList({ open: false, passportId: null });
	}, []);

	const handleEditSuccess = useCallback(async () => {
		setEditPassportList({ open: false, passportId: null });
		setIsReloadingDetail(true);
		try {
			await reloadRequestDetail();
		} catch (error) {
			toast("Có lỗi xảy ra khi reload chi tiết yêu cầu!", "error");
			logger.log("Lỗi khi reload chi tiết yêu cầu:", error);
		} finally {
			setIsReloadingDetail(false);
		}
		setReloadData?.((prev) => !prev);
	}, [reloadRequestDetail, setReloadData, toast]);

	const handleOfficialHandoverSuccess = useCallback(async () => {
		try {
			setIsReloadingDetail(true);
			await reloadRequestDetail();
		} catch (error) {
			const errorMessage =
				error?.response?.data?.message ||
				error?.message ||
				"Làm mới chi tiết yêu cầu thất bại!";
			toast(errorMessage, "error");
		} finally {
			setIsReloadingDetail(false);
		}
		setReloadData?.((prev) => !prev);
	}, [reloadRequestDetail, setReloadData, toast]);

	const handleOpenDialogAction = useCallback((actionType) => {
		const titleByAction = {
			approve: "Phê duyệt yêu cầu",
			reject: "Từ chối yêu cầu",
			rejectOfficeCommanderRequest: "Từ chối yêu cầu",
			rejectSpecialDeptReq: "Từ chối yêu cầu",
			transferProcessing: "Chuyển xử lý yêu cầu",
			receiveRequest: "Tiếp nhận yêu cầu",
		};

		setOpenDialogAction({
			open: true,
			actionType,
			title: titleByAction[actionType] || "Xử lý yêu cầu",
		});
	}, []);

	const handleDeleteClick = useCallback(() => {
		setConfirmDelete({
			open: true,
			onConfirm: null,
			title: "Thông báo",
			content: `Đồng chí có chắc muốn hủy yêu cầu này không?`,
			// content: `Đồng chí có chắc muốn hủy yêu cầu ${id} này không?`,
			subContent: "Tác vụ này sẽ không thể hoàn tác",
		});
	}, []);

	const handleApproveClick = useCallback(() => {
		handleOpenDialogAction("approve");
	}, [handleOpenDialogAction]);

	const handleTransferProcessingClick = useCallback(() => {
		handleOpenDialogAction("transferProcessing");
	}, [handleOpenDialogAction]);

	const handleReceiveRequestClick = useCallback(() => {
		handleOpenDialogAction("receiveRequest");
	}, [handleOpenDialogAction]);

	//Từ chối yêu cầu của Chỉ huy đơn vị
	const handleRejectClick = useCallback(() => {
		handleOpenDialogAction("reject");
	}, [handleOpenDialogAction]);

	//Từ chối yêu cầu của Chỉ huy văn phòng
	const handleRejectOfficeCommanderRequestClick = useCallback(() => {
		handleOpenDialogAction("rejectOfficeCommanderRequest");
	}, [handleOpenDialogAction]);

	//Từ chối yêu cầu của Bộ phận chuyên trách
	const handleRejectSpecialDeptReqClick = useCallback(() => {
		handleOpenDialogAction("rejectSpecialDeptReq");
	}, [handleOpenDialogAction]);

	const handleCloseDialogAction = useCallback(() => {
		setOpenDialogAction({
			open: false,
			actionType: null,
			title: "",
		});
	}, []);

	const handleCloseConfirmDelete = useCallback(() => {
		setConfirmDelete({
			open: false,
			onConfirm: null,
			title: "",
			content: "",
			subContent: "",
		});
		resetCancelForm();
	}, [resetCancelForm]);

	const onSubmitCancelRequest = useCallback(
		async (data) => {
			try {
				const body = {
					cancelReason: data.cancelReason,
				};
				await dispatch(cancelPassportRequest({ id: id, body })).unwrap();
				toast("Hủy yêu cầu mượn hộ chiếu thành công!", "success");
				try {
					setIsReloadingDetail(true);
					await reloadRequestDetail();
				} catch (error) {
					logger.log("Làm mới chi tiết yêu cầu thất bại!", error);
				} finally {
					setIsReloadingDetail(false);
				}
				setReloadData?.((prev) => !prev);
				resetCancelForm();
				setConfirmDelete({
					open: false,
					onConfirm: null,
					title: "",
					content: "",
					subContent: "",
				});
			} catch (error) {
				const errorMessage =
					error?.response?.data?.message ||
					error?.message ||
					"Hủy yêu cầu mượn hộ chiếu thất bại!";
				toast(errorMessage, "error");
			}
		},
		[dispatch, setReloadData, toast, id, resetCancelForm, reloadRequestDetail]
	);

	const handleSave = useCallback(
		async (data) => {
			try {
				logger.log("Data", data);
				const resultTripFilesValue = data?.ppResultTripFile;
				const normalizedResultTripFiles = Array.isArray(resultTripFilesValue)
					? resultTripFilesValue
					: resultTripFilesValue
						? [resultTripFilesValue]
						: [];
				logger.log("normalizedResultTripFiles:", normalizedResultTripFiles);

				if (normalizedResultTripFiles.length === 0) {
					toast("Vui lòng tải lên file kết quả chuyến đi", "warning");
					return;
				}

				setIsLoading(true);

				await dispatch(
					updatePassportRequest({
						id: requestId,
						payload: {
							receivedGifts: data?.receivedGifts || "",
						},
					})
				).unwrap();

				const extractFiles = (value) => {
					if (!value) return [];
					const filesArray = Array.isArray(value) ? value : [value];
					return filesArray
						.map((fileObj) => {
							if (fileObj?.originFileObj instanceof File) return fileObj.originFileObj;
							if (fileObj?.file instanceof File) return fileObj.file;
							if (fileObj?.rawFile instanceof File) return fileObj.rawFile;
							if (fileObj instanceof File) return fileObj;
							return null;
						})
						.filter(Boolean);
				};

				const resultTripFiles = extractFiles(data?.ppResultTripFile);
				if (resultTripFiles.length > 0) {
					const uploadResults = await Promise.all(
						resultTripFiles.map((file) =>
							apiUploadFile(file, "ppResultTripFile", requestId)
						)
					);

					const fileIds = uploadResults
						.map((uploadResult) =>
							uploadResult?.data?._id ||
							uploadResult?.data?.id ||
							uploadResult?._id ||
							uploadResult?.id ||
							null
						)
						.filter(Boolean);

					if (fileIds.length > 0) {
						await dispatch(
							updatePassportRequest({
								id: requestId,
								payload: {
									ppResultTripFile: fileIds,
								},
							})
						).unwrap();
					}
				}

				await reloadRequestDetail();
				setReloadData?.((prev) => !prev);
				toast("Lưu kết quả chuyến đi thành công!", "success");
			} catch (error) {
				const errorMessage =
					error?.response?.data?.message ||
					error?.message ||
					"Lưu kết quả chuyến đi thất bại!";
				toast(errorMessage, "error");
			} finally {
				setIsLoading(false);
			}
		},
		[dispatch, reloadRequestDetail, requestId, setReloadData, toast]
	);

	const handleSaveInvalid = useCallback(
		(formErrors) => {
			if (formErrors?.ppResultTripFile) {
				toast("Vui lòng tải lên file kết quả chuyến đi", "warning");
			}
		},
		[toast]
	);

	const openHandover = useCallback((mode = "DETAIL") => {
		// logger.log("Mở biên bản bàn giao với mode:", mode);
		setHandoverReturnMode(mode);
		setOpenOfficialHandoverDoc(true);
	}, []);
	const handleRequestApprovalActionSuccess = useCallback(
		async (actionType) => {
			if (actionType === "receiveRequest") {
				openHandover("LIST");
				return;
			}

			try {
				setIsReloadingDetail(true);
				await reloadRequestDetail();
			} catch (error) {
				logger.log("Làm mới chi tiết yêu cầu thất bại!", error);
				toast("Làm mới chi tiết yêu cầu thất bại!", "error");
			} finally {
				setIsReloadingDetail(false);
			}
			setReloadData?.((prev) => !prev);
		},
		[openHandover, setReloadData, reloadRequestDetail, toast]
	);
	const handleOpenViewHandoverMinutes = useCallback(() => {
		setSelectedMinutesId(null);
		setOpenViewHandoverMinutes(true);
	}, []);

	const handleCloseViewHandoverMinutes = useCallback(() => {
		setOpenViewHandoverMinutes(false);
		setSelectedMinutesId(null);
	}, []);

	const handoverVoucherData = useMemo(() => dataDetail?.handoverVoucher || dataDetail?.handoverVoucherData || null, [dataDetail]);
	const returnVoucherData = useMemo(() => dataDetail?.returnVoucher || dataDetail?.returnVoucherData || null, [dataDetail]);
	const hasVoucherSummary = useMemo(() =>
		!!handoverVoucherData ||
		!!dataDetail?.handoverVoucherId ||
		!!dataDetail?.returnVoucherId, [handoverVoucherData, dataDetail])



	const returnDeadlineDisplay = useMemo(() => {
		if (!dataDetail?.returnDate) return "--";

		const deadline = dayjs(dataDetail.returnDate);
		if (!deadline.isValid()) return "--";

		const returnVoucherDate = returnVoucherData?.createdAt || returnVoucherData?.performerSignedAt || returnVoucherData?.updatedAt;

		let diffDays = 0;
		if (returnVoucherDate) {
			const actualReturn = dayjs(returnVoucherDate);
			if (actualReturn.isValid()) {
				diffDays = actualReturn.startOf("day").diff(deadline.startOf("day"), "day");
			}
		} else {
			diffDays = dayjs()
				.startOf("day")
				.diff(deadline.startOf("day"), "day");
		}

		const overtimeText = diffDays > 0 ? ` (Quá hạn ${diffDays} ngày)` : "";
		setStatusReturnDeadline(diffDays > 0);
		return `${deadline.format("DD/MM/YYYY")}${overtimeText}`;
	}, [dataDetail?.returnDate, returnVoucherData]);

	const safeNumber = useCallback((value) => {
		const parsedValue = Number(value);
		return Number.isFinite(parsedValue) && parsedValue >= 0
			? parsedValue
			: null;
	}, []);

	const returnHistoryDisplay = useMemo(() => {
		if (!Array.isArray(returnHistory)) {
			return [];
		}

		const fallbackTotalPassports =
			safeNumber(dataDetail?.totalPassports) || safeNumber(totalPassports) || 1;

		return returnHistory.map((historyItem, index) => {
			const titleText = historyItem?.title || "";
			const titleCountMatch = titleText.match(/(\d+)\s*\/\s*(\d+)/);
			const titleReturnedCount = titleCountMatch
				? safeNumber(titleCountMatch[1])
				: null;
			const titleTotalCount = titleCountMatch
				? safeNumber(titleCountMatch[2])
				: null;

			const returnCount =
				safeNumber(historyItem?.itemCount) ||
				safeNumber(historyItem?.returnCount) ||
				safeNumber(historyItem?.returnedPassportCount) ||
				safeNumber(historyItem?.receivedPassportCount) ||
				safeNumber(historyItem?.passportCount) ||
				safeNumber(historyItem?.quantity) ||
				titleReturnedCount ||
				0;

			const totalCount =
				safeNumber(historyItem?.totalPassports) ||
				safeNumber(historyItem?.totalPassportCount) ||
				safeNumber(historyItem?.totalCount) ||
				titleTotalCount ||
				fallbackTotalPassports;

			return {
				id: historyItem?.id || historyItem?._id || `return_history_${index}`,
				time:
					historyItem?.performedAt ||
					historyItem?.createdAt ||
					historyItem?.updatedAt ||
					null,
				timeLabel: historyItem?.createdAtFormat || null,
				returnCount,
				totalCount,
				voucherCode:
					historyItem?.voucherCode ||
					historyItem?.minutesCode ||
					historyItem?.fileName ||
					`bienbanlan${index + 1}.pdf`,
				voucherId:
					historyItem?.returnVoucherId ||
					historyItem?.voucherId ||
					historyItem?.minutesId ||
					historyItem?.id ||
					null,
			};
		});
	}, [dataDetail?.totalPassports, returnHistory, safeNumber, totalPassports]);

	const totalReturnHistory = useMemo(() => {
		if (!returnHistoryDisplay.length) {
			return {
				returned: 0,
				total:
					safeNumber(dataDetail?.totalPassports) ||
					safeNumber(totalPassports) ||
					1,
			};
		}

		const returned = returnHistoryDisplay.reduce(
			(accumulator, item) => accumulator + (item.returnCount || 0),
			0
		);

		const total =
			returnHistoryDisplay[returnHistoryDisplay.length - 1]?.totalCount ||
			safeNumber(dataDetail?.totalPassports) ||
			safeNumber(totalPassports) ||
			1;

		return { returned, total };
	}, [
		dataDetail?.totalPassports,
		returnHistoryDisplay,
		safeNumber,
		totalPassports,
	]);

	const getVoucherSignedStatus = useCallback(
		(voucher, hasReturnHistory = false) => {
			if (!voucher) {
				return { label: "--", color: "#6B7280", icon: "" };
			}

			const isSigned =
				voucher?.status === "SIGN_VOUCHER" ||
				(!!voucher?.performerSignedAt && !!voucher?.receiverSignedAt);

			if (isSigned) {
				if (hasReturnHistory) {
					return { label: "Đã ký - Chưa hoàn tất", color: "#F59E0B", icon: "" };
				}
				return { label: "Đã ký đủ", color: "#0D6EFD", icon: "☑" };
			}

			return { label: "Chờ ký", color: "#F59E0B", icon: "⌛" };
		},
		[]
	);

	const formatVoucherTime = useCallback((voucher) => {
		const timeValue =
			voucher?.createdAt || voucher?.performerSignedAt || voucher?.updatedAt;
		return timeValue ? dayjs(timeValue).format("DD/MM/YYYY H:mm") : "--";
	}, []);

	const handleOpenVoucherMinutes = useCallback((voucherId) => {
		if (!voucherId) return;
		setSelectedMinutesId(voucherId);
		setOpenViewHandoverMinutes(true);
	}, []);

	const handoverMinutesId =
		handoverVoucherData?.id || dataDetail?.handoverVoucherId || null;
	const returnMinutesId =
		returnVoucherData?.id || dataDetail?.returnVoucherId || null;

	const handleOpenReturnHistoryMinutes = useCallback(
		(event) => {
			const voucherId = event.currentTarget.getAttribute("data-voucher-id");
			handleOpenVoucherMinutes(voucherId || returnMinutesId);
		},
		[handleOpenVoucherMinutes, returnMinutesId]
	);

	const handleOpenHandoverVoucherMinutes = useCallback(() => {
		handleOpenVoucherMinutes(handoverMinutesId);
	}, [handleOpenVoucherMinutes, handoverMinutesId]);

	const handleOpenReturnVoucherMinutes = useCallback(() => {
		handleOpenVoucherMinutes(returnMinutesId);
	}, [handleOpenVoucherMinutes, returnMinutesId]);

	const handleOpenOfficialHandoverDoc = useCallback(() => {
		openHandover("DETAIL"); // đóng biên bản → quay lại chi tiết
	}, [openHandover]);

	const handleOpenCreateReturnVoucher = useCallback(() => {
		setOpenCreateReturnVoucher(true);
	}, []);

	const handleCloseOfficialHandoverDoc = useCallback(
		async (options = {}) => {
			setOpenOfficialHandoverDoc(false);

			// Ký thành công → luôn ở lại màn Chi tiết (đã reload qua onSuccess)
			if (options.signed) return;

			try {
				setIsReloadingDetail(true);
				await reloadRequestDetail();
			} catch (error) {
				logger.log("Làm mới chi tiết yêu cầu thất bại!", error);
				toast("Làm mới chi tiết yêu cầu thất bại!", "error");
			} finally {
				setIsReloadingDetail(false);
			}
			setReloadData?.((prev) => !prev);
		},
		[reloadRequestDetail, setReloadData, toast]
	);

	const handleCloseCreateReturnVoucher = useCallback(
		async (options = {}) => {
			setOpenCreateReturnVoucher(false);

			if (options.signed) {
				await handleOfficialHandoverSuccess();
			}
			// Luồng hoàn trả đang luôn mở từ màn chi tiết, nên chỉ đóng popup
		},
		[handleOfficialHandoverSuccess]
	);

	const isUpdateResultTrip = useMemo(() => {
		return dataDetail?.flags?.canUpdateResultTrip;
	}, [dataDetail]);

	const statusRequest = useMemo(() => {
		return dataDetail?.status?.value || "";
	}, [dataDetail?.status]);
	// ============ MAIN RETURN ============
	return (
		<>
			<BaseSwipper
				title={title || "Xem chi tiết yêu cầu"}
				open={open}
				onClose={handleClose}
				onSave={handleSubmit(handleSave, handleSaveInvalid)}
				type="view"
				hideBackdrop
				isLoading={isLoading}
				footer={
					<>
						<FlexGrowBox />
						<FooterActions>
							{dataDetail?.flags?.canUpdateRequestPassport && (
								<ButtonOutline
									onClick={handleSwitchToEditMode}
									disabled={isReloadingDetail}
									variant="outlined"
								>
									Chỉnh sửa
								</ButtonOutline>
							)}
							{dataDetail?.flags?.canDestroyRequestPassport && (
								<CancelButton variant="outlined" onClick={handleDeleteClick} notUppercase>
									Hủy yêu cầu
								</CancelButton>
							)}
							{dataDetail?.flags?.canApprovePassport && (
								<ButtonOutline
									onClick={handleApproveClick}
									disabled={isReloadingDetail}
									variant="outlined"
								>
									Phê duyệt
								</ButtonOutline>
							)}
							{dataDetail?.flags?.canTransferPassport && (
								<ButtonOutline
									onClick={handleTransferProcessingClick}
									disabled={isReloadingDetail}
									variant="outlined"
								>
									Chuyển xử lý
								</ButtonOutline>
							)}
							{dataDetail?.flags?.canReceptionPassport && (
								<ButtonOutline
									onClick={handleReceiveRequestClick}
									disabled={isReloadingDetail}
									variant="outlined"
								>
									Tiếp nhận
								</ButtonOutline>
							)}
							{(dataDetail?.flags?.canCreateHandoverPassport ||
								dataDetail?.flags?.canCreateHandoverVoucher) && (
									<ButtonOutline
										onClick={handleOpenOfficialHandoverDoc}
										disabled={isReloadingDetail}
										variant="outlined"
									>
										Tạo biên bản
									</ButtonOutline>
								)}
							{dataDetail?.flags?.canCreateReturnVoucher && (
								<ButtonOutline
									onClick={handleOpenCreateReturnVoucher}
									disabled={isReloadingDetail}
									variant="outlined"
								>
									Tạo biên bản hoàn trả
								</ButtonOutline>
							)}
							{dataDetail?.flags?.canViewMinutes && (
								<ButtonOutline
									onClick={handleOpenViewHandoverMinutes}
									disabled={isReloadingDetail}
									variant="outlined"
								>
									Xem biên bản
								</ButtonOutline>
							)}
							{dataDetail?.flags?.canRepeatPassport && (
								<ButtonOutline
									onClick={handleApproveClick}
									disabled={isReloadingDetail}
									variant="outlined"
								>
									Nhắc nhở
								</ButtonOutline>
							)}
							{/* Từ chối của Chỉ huy đơn vị */}
							{dataDetail?.flags?.canRefusePassportDV && (
								<CancelButton variant="outlined" onClick={handleRejectClick} notUppercase>
									Từ chối
								</CancelButton>
							)}
							{/* Từ chối của Chỉ huy văn phòng */}
							{dataDetail?.flags?.canRefusePassportVP && (
								<CancelButton
									variant="outlined"
									onClick={handleRejectOfficeCommanderRequestClick}
									notUppercase
								>
									Từ chối
								</CancelButton>
							)}
							{/* Từ chối của Bộ phận chuyên trách */}
							{dataDetail?.flags?.canRefusePassportBPCT && (
								<CancelButton
									variant="outlined"
									onClick={handleRejectSpecialDeptReqClick}
									notUppercase
								>
									Từ chối
								</CancelButton>
							)}
							{(isUpdateResultTrip && isOrganizational === "organizational") && (
								<ButtonOutline
									onClick={handleSubmit(handleSave, handleSaveInvalid)}
									disabled={isReloadingDetail}
									variant="outlined"
								>
									Cập nhật kết quả
								</ButtonOutline>
							)}
						</FooterActions>
					</>
				}
			>
				<Grid container spacing={2}>
					<Grid item xs={12} md={9}>
						{isOrganizational === "organizational"
							? renderOrganizationalForm({ statusRequest })
							: renderUserForm()}
					</Grid>
					<Grid item xs={12} md={3}>
						<HistoryCardPassport styledMarginTop>
							<StyledHeaderContent variant="subtitle2">LỊCH SỬ YÊU CẦU</StyledHeaderContent>
							{/* <TimelineTitle variant="subtitle2">LỊCH SỬ YÊU CẦU</TimelineTitle> */}
							<TimelineWrapper>
								{(dataHistoryPassportRequest || []).map((history) => (
									<TimelineItem key={history.id}>
										<TimelineText variant="body2">
											{history.action || ""}
										</TimelineText>
										{history.note && (
											<MarginBox>
												<ReasonText variant="caption">
													<strong>Lý do:</strong> {history.note}
												</ReasonText>
											</MarginBox>
										)}
										<MarginBox>
											<TimelineDate variant="caption">
												{dayjs(history.performedAt).format(
													"DD/MM/YYYY, HH:mm:ss"
												)}{" "}
												| {history.performerName || ""}
												{history.performerDepartment
													? ` - ${history.performerDepartment}`
													: ""}
											</TimelineDate>
										</MarginBox>
									</TimelineItem>
								))}
								{!dataHistoryPassportRequest?.length && (
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
				{isLoading && (
					<StyledLoadingPopupSignDigital>
						<CircularProgress />
					</StyledLoadingPopupSignDigital>
				)}
			</BaseSwipper>
			{isOrganizational === "organizational" && (
				<FileViewerDialog
					open={viewingFile.open}
					onClose={handleCloseFileViewer}
					fileUrl={viewingFile.url}
					fileName={viewingFile.name}
					fileType={viewingFile.type}
					title={`Xem file: ${viewingFile.name}`}
				/>
			)}
			<EditRequest
				open={editPassportList.open}
				onClose={handleCloseEditPassportList}
				onSuccess={handleEditSuccess}
				id={editPassportList?.passportId}
			/>

			<Dialog
				open={confirmDelete.open}
				onClose={handleCloseConfirmDelete}
				onSave={handleCancelSubmit(onSubmitCancelRequest)}
				titleButton="Đồng ý"
				title={confirmDelete.title}
				type="delete"
				disableSave={false}
				size="sm"
			>
				<Box>
					<TextCancelReasonPassportRequest>
						{confirmDelete.content}
					</TextCancelReasonPassportRequest>
					<SubTextCancelReasonPassportRequest>
						{confirmDelete.subContent}
					</SubTextCancelReasonPassportRequest>
					<Controller
						name="cancelReason"
						control={cancelControl}
						rules={{
							required: "Vui lòng nhập lý do hủy yêu cầu",
							validate: (value) =>
								value.trim() !== "" || "Vui lòng nhập lý do hủy yêu cầu",
						}}
						render={({ field }) => (
							<InputComponents
								{...field}
								label="Lý do"
								isView={false}
								multiline
								rows={3}
								placeholder="Nhập lý do hủy yêu cầu..."
								required
								error={!!cancelErrors.cancelReason}
								helperText={cancelErrors.cancelReason?.message || ""}
							/>
						)}
					/>
				</Box>
			</Dialog>
			<RequestApprovalDialog
				open={openDialogAction.open}
				onClose={handleCloseDialogAction}
				title={openDialogAction.title}
				actionsKeyType={openDialogAction.actionType}
				requestId={id}
				onActionSuccess={handleRequestApprovalActionSuccess}
				size="md"
				dataRequest={dataDetail}
				setOpenOfficialHandoverDoc={setOpenOfficialHandoverDoc}
				typePassportRequest={isOrganizational}
			/>
			{/* Màn Tạo biên bản bàn giao */}
			<OfficialHandoverDocument
				open={openOfficialHandoverDoc}
				data={dataDetail}
				onSuccess={handleOfficialHandoverSuccess}
				onClose={handleCloseOfficialHandoverDoc}
				title={"Tạo biên bản bàn giao"}
				id={id}
			/>
			{/* Màn chi tiết biên bản bàn giao */}
			<ViewHandoverMinutes
				open={openViewHandoverMinutes}
				onClose={handleCloseViewHandoverMinutes}
				sharedComponents={sharedComponents}
				id={
					selectedMinutesId ||
					(dataDetail?.returnVoucherId
						? dataDetail?.returnVoucherId
						: dataDetail?.handoverVoucherId)
				}
				onSuccess={handleOfficialHandoverSuccess}
				data={dataDetail}
			/>
			{/* Màn tạo biên bản hoàn trả */}
			<CreateReturnVoucher
				open={openCreateReturnVoucher}
				data={dataDetail}
				onClose={handleCloseCreateReturnVoucher}
				title="Tạo biên bản hoàn trả"
				id={dataDetail?.handoverVoucherId}
				requestId={id}
			/>
		</>
	);
};

ViewPassportRequest.propTypes = {
	incomingCreate: PropTypes.bool,
	isActionMenu: PropTypes.bool,
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	sharedComponents: PropTypes.object.isRequired,
	title: PropTypes.string,
	id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	isFromNotification: PropTypes.bool,
};

export default withSharedComponents(ViewPassportRequest);
