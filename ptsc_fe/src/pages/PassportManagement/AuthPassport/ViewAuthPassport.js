import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	CircularProgress,
	Grid,
	Tooltip,
	Typography,
} from "@mui/material";
import { Add } from "@mui/icons-material";
import { useToast } from "@components/common/ToastProvider";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useDispatch } from "react-redux";
import PropTypes from "prop-types";
import withSharedComponents from "@components/WrapperComponent";
import { StyledBoxContainerContent, StyledHeaderContent } from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import {
	API_GET_LIST_USERS,
} from "@EnvironmentFile/constants/urlConfig";
import {
	getDetailPassportPermission,
} from "@redux/slices/PassportManagement/PassportManagementSlice";
import { FileViewerDialog } from "@components/CustomDialog";
import CusTomTableFreeStyle from "@components/CustomTable/CusTomTableFreeStyle";
import {
	AddMemberButton,
	MemberTableActions,
	MemberTableHeader,
	// StyledHeaderSectionContent,
	StyledRequiredText,
	TableWrapperPassport,
} from "@styles/PassportManagement.styles";
import { StyledLoadingPopupSignDigital } from "@styles/UploadFile/UploadFile.style";
import { authPassportSchema, defaultValueAuthPassport } from "./constantsAuthPassport";
import { FormLabel } from "@styles/BaseSwiper/BaseSwiper.style";

const ViewAuthPassport = (props) => {
	const {
		open,
		onClose,
		sharedComponents,
		title, // Nhận title từ props
	} = props;
	const {
		BaseSwipper,
		InputComponents,
		AsyncAutoComplete,
		CustomAutoCompleteSearch,
	} = sharedComponents;

	const toast = useToast();
	const dispatch = useDispatch();
	const [isLoading, setIsLoading] = useState(false);

	const {
		control,
		formState: { errors },
		setValue,
		// setError,
		clearErrors,
		reset,
	} = useForm({
		resolver: yupResolver(authPassportSchema),
		defaultValues: defaultValueAuthPassport,
		mode: "onChange",
	});

	useEffect(() => {
		if (!open) return;
		const dataDetail = async () => {
			try {
				setIsLoading(true);
				const res = await dispatch(getDetailPassportPermission(props?.id)).unwrap();
				const officers = Array.isArray(res?.officerList)
					? res.officerList
					: [];

				if (officers.length > 0) {
					setMemberList(
						officers.map((item, index) => {
							const userId = item?.userId || null;
							const fullName = item?.fullName || "";

							return {
								_id: userId || `officer_${index}_${Date.now()}`,
								employee: userId
									? {
										id: userId,
										_id: userId,
										name: fullName,
										nameVn: fullName,
										eofficeAccount: userId,
									}
									: null,
								employeeEofficeAccount: userId || "",
								passport: null,
								passportType: "",
								hoTen: fullName,
								soHoChieu: "",
								chucVu: item?.position || "",
								capBac: "",
								donVi: item?.unit || "",
								loaiCB: "",
								ngayHetHan: "",
							};
						})
					);
				} else {
					setMemberList([]);
				}
				reset({ ...res });
			} catch (error) {
				const messageError =
					error?.response?.data?.message ||
					error.message ||
					"Lấy dữ liệu chi tiết quyền mượn hộ chiếu thất bại!";
				toast(messageError, "error");
				reset(defaultValueAuthPassport);
				onClose();
			} finally {
				setIsLoading(false);
			}
		};
		dataDetail();
	}, [dispatch, open, reset, onClose, toast, props?.id]);


	const [viewingFile, setViewingFile] = useState({
		open: false,
		url: null,
		name: "",
		type: null,
	});

	// ============ MEMBER TABLE LOGIC ============
	const [memberList, setMemberList] = useState([
		{
			_id: `new_${Date.now()}`,
			employee: null,
			employeeEofficeAccount: "",
			passport: null,
			passportType: "",
			hoTen: "",
			soHoChieu: "",
			chucVu: "",
			capBac: "",
			donVi: "",
			loaiCB: "",
			ngayHetHan: "",
		},
	]);

	const handleClose = useCallback(async () => {
		reset(defaultValueAuthPassport);
		onClose();
	}, [onClose, reset]);

	const getEntityId = useCallback((entity) => {
		if (!entity) return null;
		return entity.id || entity._id || entity.value || null;
	}, []);

	const handleCloseFileViewer = useCallback(() => {
		if (viewingFile.url) {
			URL.revokeObjectURL(viewingFile.url);
		}
		setViewingFile({ open: false, url: null, name: "", type: null });
	}, [viewingFile.url]);

	const handleAddMember = useCallback(() => {
		setMemberList((prev) => [
			...prev,
			{
				_id: `new_${Date.now()}`,
				employee: null,
				employeeEofficeAccount: "",
				passport: null,
				passportType: "",
				hoTen: "",
				soHoChieu: "",
				chucVu: "",
				capBac: "",
				donVi: "",
				loaiCB: "",
				ngayHetHan: "",
			},
		]);

		// Scroll xuống cuối sau khi thêm dòng mới
		setTimeout(() => {
			const container = document.querySelector(".MuiTableContainer-root");
			if (container) {
				container.scrollTo({
					top: container.scrollHeight,
					behavior: "smooth",
				});
			}
		}, 100);
	}, []);

	const MemberSelectCell = React.memo(({ row }) => {
		return (
			<Typography variant="body2">
				{row?.hoTen || row?.employee?.name || row?.employee?.nameVn || ""}
			</Typography>
		);
	});
	MemberSelectCell.displayName = "MemberSelectCell";

	const totalMembers = memberList.filter((m) => m.hoTen).length;

	useEffect(() => {
		const mappedOrganizations = memberList.map((item) => {
			logger.log("Mapping member item:", item);
			const employee = item?.employee || {};
			return {
				userId:
					item.employeeEofficeAccount ||
					employee?.eofficeAccount ||
					employee?.id ||
					employee?._id ||
					undefined,
				fullName:
					item.hoTen || employee?.nameVn || employee?.name || employee?.fullName || "",
				passportId: getEntityId(item.passport) || undefined,
				position: item.chucVu || undefined,
				unit: item.donVi || undefined,
			};
		});

		setValue("officerList", mappedOrganizations, {
			shouldDirty: true,
			shouldTouch: true,
		});

		const hasValidOrganizations = memberList.some(
			(item) =>
				!!item?.employee ||
				!!item?.employeeEofficeAccount ||
				(typeof item?.hoTen === "string" && item.hoTen.trim() !== "")
		);

		if (hasValidOrganizations) {
			clearErrors("officerList");
		}
	}, [memberList, setValue, getEntityId, clearErrors]);

	const memberColumns = useMemo(
		() => [
			{
				name: "hoTen",
				title: "Họ tên",
				width: "200px",
				renderCell: ({ row }) => <MemberSelectCell row={row} />,
			},
			{
				name: "chucVu",
				title: "Chức vụ",
				width: "150px",
			},
			{
				name: "donVi",
				title: "Đơn vị",
				width: "150px",
			},
		],
		[]
	);

	return (
		<BaseSwipper
			title={title || "Chi tiết phân quyền hộ chiếu"}
			open={open}
			onClose={handleClose}
			onSave={undefined}
			type="add"
			hideBackdrop
			moreActions={null}
			isLoading={isLoading}
		>
			<Grid container spacing={2} mt={2}>
				<Grid item xs={12} md={6} sm={6}>
					<StyledBoxContainerContent styledMarginTop>
						<StyledHeaderContent variant="h6" noWrap isView>
							Thông tin phân quyền
						</StyledHeaderContent>
						<Grid item container spacing={2} mt={1} xs={12}>
							<Grid item xs={12}>
								<FormLabel>
									Mã quyền hộ chiếu
								</FormLabel>
								<Controller
									name="code"
									control={control}
									render={({ field }) => (
										<InputComponents
											// label="Mã quyền hộ chiếu"
											placeholder="Nhập dữ liệu..."
											{...field}
											error={!!errors.code}
											helperText={errors.code?.message}
											disabled
										/>
									)}
								/>
							</Grid>
							<Grid item xs={12}>
								<FormLabel>
									Người được cấp quyền
								</FormLabel>
								<Controller
									name="authPersonsPassport"
									control={control}
									render={({ field }) => (
										<AsyncAutoComplete
											fullWidth
											// label="Người được cấp quyền"
											placeholder="Nhập tên thành viên"
											url={`${API_GET_LIST_USERS}/all`}
											queryParam="name"
											optionLabel="name"
											optionValue="id"
											value={field.value}
											onChange={field.onChange}
											size="small"
											unsetFontWeight
											required
											error={!!errors.authPersonsPassport}
											helperText={errors.authPersonsPassport?.message}
											disabled
										/>
									)}
								/>
							</Grid>
							<Grid item xs={12}>
								<FormLabel>
									Phạm vi mượn hộ chiếu
								</FormLabel>
								<Controller
									name="passportBorrowScope"
									control={control}
									render={({ field }) => (
										<CustomAutoCompleteSearch
											select
											code="passportBorrowScope"
											// label="Phạm vi mượn hộ chiếu"
											placeholder="Nhập dữ liệu..."
											customLabel="title"
											customValue="value"
											{...field}
											required
											error={!!errors.passportBorrowScope}
											helperText={errors.passportBorrowScope?.message}
											unsetFontWeight
											disabled
										/>
									)}
								/>
							</Grid>
						</Grid>
					</StyledBoxContainerContent>
				</Grid>
				<Grid item xs={12} md={6} sm={6}>
					<StyledBoxContainerContent styledMarginTop>
						<Controller
							name="officerList"
							control={control}
							defaultValue={[]}
							render={() => (
								<>
									<MemberTableHeader>
										<StyledHeaderContent variant="h6" noWrap isView>
											Danh sách cán bộ
										</StyledHeaderContent>
										<MemberTableActions>
											<Typography variant="body2">
												Tổng số cán bộ: <strong>{totalMembers}</strong>
											</Typography>
											<Tooltip title="Thêm cán bộ">
												<AddMemberButton
													onClick={handleAddMember}
													size="small"
													disabled
												>
													<Add />
												</AddMemberButton>
											</Tooltip>
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
									{!!errors?.officerList?.message && (
										<StyledRequiredText>
											{errors.officerList.message}
										</StyledRequiredText>
									)}
								</>
							)}
						/>
					</StyledBoxContainerContent>
				</Grid>
			</Grid>
			{isLoading && (
				<StyledLoadingPopupSignDigital>
					<CircularProgress />
				</StyledLoadingPopupSignDigital>
			)}
			<FileViewerDialog
				open={viewingFile.open}
				onClose={handleCloseFileViewer}
				fileUrl={viewingFile.url}
				fileName={viewingFile.name}
				fileType={viewingFile.type}
				title={`Xem file: ${viewingFile.name}`}
			/>
		</BaseSwipper>
	);
};

ViewAuthPassport.propTypes = {
	open: PropTypes.bool.required,
	onClose: PropTypes.func.required,
	onSuccess: PropTypes.func,
	isLoading: PropTypes.bool,
	sharedComponents: PropTypes.object,
	mode: PropTypes.string,
	title: PropTypes.string,
	documentType: PropTypes.number,
	incomingCreate: PropTypes.bool,
	isActionMenu: PropTypes.bool,
};

export default withSharedComponents(ViewAuthPassport);
