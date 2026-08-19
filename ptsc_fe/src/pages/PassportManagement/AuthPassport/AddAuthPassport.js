import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
	deletePassportPermission,
	postPassportPermissionDraft,
	updatePassportPermission,
} from "@redux/slices/PassportManagement/PassportManagementSlice";
import { FileViewerDialog } from "@components/CustomDialog";
import CusTomTableFreeStyle from "@components/CustomTable/CusTomTableFreeStyle";
import {
	AddMemberButton,
	DeleteMemberButton,
	MemberTableActions,
	MemberTableHeader,
	ScopeConfigWarningText,
	SmallDeleteIcon,
	// StyledHeaderSectionContent,
	// StyledRequiredIcon,
	StyledRequiredText,
	TableWrapperPassport,
} from "@styles/PassportManagement.styles";
import { IconRequied, StyledLoadingPopupSignDigital } from "@styles/UploadFile/UploadFile.style";
import { authPassportSchema, defaultValueAuthPassport } from "./constantsAuthPassport";
import { FormLabel } from "@styles/BaseSwiper/BaseSwiper.style";

const AddAuthPassport = (props) => {
	const {
		open,
		onClose,
		onSuccess,
		sharedComponents,
		title, // Nhận title từ props
	} = props;
	const {
		BaseSwipper,
		InputComponents,
		ButtonOutline,
		AsyncAutoComplete,
		CustomAutoCompleteSearch,
	} = sharedComponents;

	const toast = useToast();
	const dispatch = useDispatch();
	const [isLoading, setIsLoading] = useState(false);
	const draftPermissionIdRef = useRef(null);
	const isSavedRef = useRef(false);
	const createEmptyMember = useCallback(() => ({
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
	}), []);

	const {
		control,
		handleSubmit,
		formState: { errors },
		setValue,
		setError,
		clearErrors,
		watch,
		reset,
	} = useForm({
		resolver: yupResolver(authPassportSchema),
		defaultValues: defaultValueAuthPassport,
		mode: "onChange",
	});

	// Watch passportBorrowScope và authPersonsPassport để build dynamic URL
	const passportBorrowScope = watch("passportBorrowScope");
	const authPersonsPassport = watch("authPersonsPassport");
	const passportBorrowScopeValue = useMemo(() => {
		if (typeof passportBorrowScope === "object") {
			return passportBorrowScope?.value || "";
		}
		return passportBorrowScope || "";
	}, [passportBorrowScope]);
	const isByPermissionList = passportBorrowScopeValue === "byPermissionList";
	const showScopeConfigMessage = Boolean(passportBorrowScopeValue) && !isByPermissionList;

	useEffect(() => {
		if (!open) return;
		const dataDraft = async () => {
			try {
				setIsLoading(true);
				isSavedRef.current = false;
				draftPermissionIdRef.current = null;
				const body = {}
				const res = await dispatch(postPassportPermissionDraft(body)).unwrap();
				logger.log("Draft data:", res);
				draftPermissionIdRef.current = res?.id || res?._id || null;
				reset({ ...res });
			} catch (error) {
				const messageError =
					error?.response?.data?.message ||
					error.message ||
					"Lấy dữ liệu tạm thất bại!";
				toast(messageError, "error");
				reset(defaultValueAuthPassport);
				onClose();
			} finally {
				setIsLoading(false);
			}
		};
		dataDraft();
	}, [dispatch, open, reset, onClose, toast]);


	const [viewingFile, setViewingFile] = useState({
		open: false,
		url: null,
		name: "",
		type: null,
	});

	// ============ MEMBER TABLE LOGIC ============
	const [memberList, setMemberList] = useState([createEmptyMember()]);

	const handleClose = useCallback(async () => {
		const draftPermissionId = draftPermissionIdRef.current;

		if (!isSavedRef.current && draftPermissionId) {
			try {
				await dispatch(deletePassportPermission({
					ids: [draftPermissionId]
				})).unwrap();
			} catch (error) {
				const messageError =
					error?.response?.data?.message ||
					error.message ||
					"Xóa dự thảo quyền mượn hộ chiếu thất bại!";
				toast(messageError, "error");
			}
		}

		draftPermissionIdRef.current = null;
		isSavedRef.current = false;
		reset(defaultValueAuthPassport);
		// setSelectedEmployeeDetails(null);
		onClose();
	}, [dispatch, onClose, reset, toast]);

	const getEntityId = useCallback((entity) => {
		if (!entity) return null;
		return entity.id || entity._id || entity.value || null;
	}, []);

	const getMemberUniqueKey = useCallback((member) => {
		if (!member) return null;
		// Chỉ dùng eofficeAccount để xác định trùng thành viên
		const account = member?.eofficeAccount || member?.employeeEofficeAccount;
		if (account && String(account).trim()) {
			return String(account).trim().toLowerCase();
		}

		return null;
	}, []);

	const handleSave = useCallback(async (data) => {
		try {
			const scopeValue = typeof data?.passportBorrowScope === "object"
				? data?.passportBorrowScope?.value
				: data?.passportBorrowScope;
			const validOfficerList = Array.isArray(data?.officerList)
				? data.officerList.filter((item) => !!item?.userId)
				: [];

			if (scopeValue === "byPermissionList" && validOfficerList.length === 0) {
				setError("officerList", {
					type: "manual",
					message: "Vui lòng chọn ít nhất 1 cán bộ trong danh sách cán bộ",
				});
				toast("Vui lòng chọn ít nhất 1 cán bộ trong danh sách cán bộ", "error");
				return;
			}

			clearErrors("officerList");
			setIsLoading(true);
			logger.log("data", data)
			const body = {
				...data,
				authPersonsPassport: typeof data?.authPersonsPassport === "object"
					? data?.authPersonsPassport?.id || data?.authPersonsPassport?._id || null
					: data?.authPersonsPassport,
				passportBorrowScope: typeof data?.passportBorrowScope === "object"
					? data?.passportBorrowScope?.value : data?.passportBorrowScope,
			}
			await dispatch(updatePassportPermission({
				id: draftPermissionIdRef.current,
				body: body,
			})).unwrap();
			isSavedRef.current = true;
			toast("Thêm mới quyền mượn hộ chiếu thành công!", "success");
			reset(defaultValueAuthPassport);
			onSuccess?.();
			onClose();
		} catch (error) {
			const messageError =
				error?.response?.data?.message ||
				error.message ||
				"Thêm mới quyền mượn hộ chiếu thất bại!";
			toast(messageError, "error");
		} finally {
			setIsLoading(false);
		}
	}, [clearErrors, dispatch, onClose, onSuccess, reset, setError, toast]);

	const handleSaveInvalid = useCallback(() => {
		if (!isByPermissionList) return;

		const hasValidOfficer = memberList.some(
			(item) => !!item?.employeeEofficeAccount || !!item?.employee?.id || !!item?.employee?._id
		);

		if (!hasValidOfficer) {
			setError("officerList", {
				type: "manual",
				message: "Vui lòng chọn ít nhất 1 cán bộ trong danh sách cán bộ",
			});
			toast("Vui lòng chọn ít nhất 1 cán bộ trong danh sách cán bộ", "error");
		}
	}, [isByPermissionList, memberList, setError, toast]);

	const handleCloseFileViewer = useCallback(() => {
		if (viewingFile.url) {
			URL.revokeObjectURL(viewingFile.url);
		}
		setViewingFile({ open: false, url: null, name: "", type: null });
	}, [viewingFile.url]);

	const handleAddMember = useCallback(() => {
		if (!isByPermissionList) return;
		setMemberList((prev) => [
			...prev,
			createEmptyMember(),
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
	}, [createEmptyMember, isByPermissionList]);

	const MemberSelectCell = memo(({ row, onSelect, memberListUrl, disabled }) => {
		const handleChange = useCallback(
			(val) => {
				// logger.log("Selected member:", val);
				onSelect(val, row._id || row.id);
			},
			[onSelect, row._id, row.id]
		);

		return (
			<AsyncAutoComplete
				fullWidth
				placeholder="Nhập tên thành viên"
				url={memberListUrl}
				queryParam="name"
				optionLabel="name"
				optionValue="id"
				value={row.employee}
				onChange={handleChange}
				returnObject
				size="small"
				unsetFontWeight
				disabled={disabled}
			/>
		);
	});
	MemberSelectCell.displayName = "MemberSelectCell";

	const DeleteCell = React.memo(({ rowId, onRemove }) => {
		const handleClick = useCallback(() => {
			onRemove(rowId);
		}, [onRemove, rowId]);

		return (
			<DeleteMemberButton size="small" onClick={handleClick}>
				<SmallDeleteIcon />
			</DeleteMemberButton>
		);
	});
	DeleteCell.displayName = "DeleteCell";

	const handleRemoveMember = useCallback((memberId) => {
		setMemberList((prev) => prev.filter((m) => (m._id || m.id) !== memberId));
	}, []);

	const handleMemberSelect = useCallback(
		async (value, memberId) => {
			if (!value) {
				setMemberList((prev) =>
					prev.map((m) => {
						if ((m._id || m.id) !== memberId) return m;
						return {
							...m,
							employee: null,
							employeeEofficeAccount: "",
							passport: null,
							hoTen: "",
							chucVu: "",
							donVi: "",
						};
					})
				);
				return;
			}

			// Kiểm tra thành viên đã tồn tại trong danh sách
			const selectedMemberKey = getMemberUniqueKey(value);
			if (selectedMemberKey) {
				const isDuplicate = memberList.some(
					(m) =>
						m._id !== memberId &&
						getMemberUniqueKey(m.employee) === selectedMemberKey
				);
				if (isDuplicate) {
					toast(
						"Thành viên này đã được chọn trong danh sách cán bộ!",
						"error"
					);
					return;
				}
			}

			// Lấy eofficeAccount trực tiếp từ borrowers API (giống AddMyRequest)
			const borrowerEofficeAccount = value?.eofficeAccount || "";

			// Auto-fill passport từ dữ liệu borrowers (giống AddMyRequest)
			const passportAutoValue = value?.passportId
				? {
					id: value.passportId,
					passportId: value.passportId,
					passportNumber: value?.passportNumber || "",
					passportType: value?.passportType || "",
					expiryDate: value?.expiryDate || null,
				}
				: null;

			// Set dữ liệu cơ bản từ borrowers response trước
			setMemberList((prev) =>
				prev.map((m) => {
					if ((m._id || m.id) !== memberId) return m;
					logger.log("prev", prev);
					logger.log("value", value);
					return {
						...m,
						employee: value,
						employeeEofficeAccount:
							borrowerEofficeAccount || value?.id || value?._id || "",
						passport: passportAutoValue,
						hoTen:
							value?.nameVn || value?.name || value?.fullName || "",
						chucVu: value?.position || "",
						donVi: value?.unit || "",
					};
				})
			);
		},
		[memberList, toast, getMemberUniqueKey]
	);

	const totalMembers = memberList.filter((m) => m.hoTen).length;

	// Build URL cho danh sách cán bộ với filter theo parent nếu passportBorrowScope = "sameUnit"
	const buildMemberListUrl = useCallback(() => {
		let url = `${API_GET_LIST_USERS}/all`;
		if (passportBorrowScopeValue === "sameUnit" && authPersonsPassport?.parent) {
			url += `?parent=${authPersonsPassport.parent}`;
		} else {
			logger.log("Building member list URL without filter:", url);
		}
		return url;
	}, [passportBorrowScopeValue, authPersonsPassport]);

	useEffect(() => {
		if (isByPermissionList) return;
		setMemberList([createEmptyMember()]);
	}, [isByPermissionList, createEmptyMember]);

	const handlePassportBorrowScopeChange = useCallback((value) => {
		setValue("passportBorrowScope", value, {
			shouldDirty: true,
			shouldTouch: true,
			shouldValidate: true,	
		});
	}, [setValue]);

	const handleAuthPersonsPassportChange = useCallback((value) => {
		setValue("authPersonsPassport", value, {
			shouldDirty: true,
			shouldTouch: true,
			shouldValidate: true,	
		});
	}, [setValue]);

	useEffect(() => {
		const mappedOrganizations = memberList.map((item) => {
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
				renderCell: ({ row }) => (
					<MemberSelectCell
						row={row}
						onSelect={handleMemberSelect}
						memberListUrl={buildMemberListUrl()}
						disabled={!isByPermissionList}
					/>
				),
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
			{
				name: "",
				title: "",
				width: "50px",
				alignCenter: true,
				renderCell: ({ row }) => (
					isByPermissionList ? (
						<DeleteCell rowId={row._id || row.id} onRemove={handleRemoveMember} />
					) : null
				),
			},
		],
		[handleMemberSelect, handleRemoveMember, buildMemberListUrl, isByPermissionList]
	);

	return (
		<BaseSwipper
			title={title || "Thêm mới yêu cầu"}
			open={open}
			onClose={handleClose}
			onSave={handleSubmit(handleSave, handleSaveInvalid)}
			type="add"
			hideBackdrop
			moreActions={
				<>
					<ButtonOutline
						onClick={handleSubmit(handleSave, handleSaveInvalid)}
						disabled={isLoading}
						variant="outlined"
					>
						Lưu
					</ButtonOutline>
				</>
			}
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
									Người được cấp quyền <IconRequied component="span">*</IconRequied>
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
											// onChange={field.onChange}
											onChange={handleAuthPersonsPassportChange}
											size="small"
											unsetFontWeight
											required
											error={!!errors.authPersonsPassport}
											helperText={errors.authPersonsPassport?.message}
										/>
									)}
								/>
							</Grid>
							<Grid item xs={12}>
								<FormLabel>
									Phạm vi mượn hộ chiếu <IconRequied component="span">*</IconRequied>
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
											onChange={handlePassportBorrowScopeChange}
											required
											error={!!errors.passportBorrowScope}
											helperText={errors.passportBorrowScope?.message}
											unsetFontWeight
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
										{/* <StyledHeaderSectionContent variant="h6" noWrap>
											DANH SÁCH CÁN BỘ
										</StyledHeaderSectionContent> */}
										<StyledHeaderContent variant="h6" noWrap isView>
											Danh sách cán bộ
										</StyledHeaderContent>
										<MemberTableActions>
											<Typography variant="body2">
												Tổng số cán bộ: <strong>{totalMembers}</strong>
											</Typography>
												{isByPermissionList && (
													<Tooltip title="Thêm cán bộ">
														<AddMemberButton
															onClick={handleAddMember}
															size="small"
														>
															<Add />
														</AddMemberButton>
													</Tooltip>
												)}
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
										{showScopeConfigMessage && (
											<ScopeConfigWarningText>
												* Danh sách cán bộ đã được tự động cấu hình theo phạm vi của người được phân quyền.
											</ScopeConfigWarningText>
										)}
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

AddAuthPassport.propTypes = {
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

export default withSharedComponents(AddAuthPassport);
