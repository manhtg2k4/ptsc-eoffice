import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	CircularProgress,
	Grid,
	Tooltip,
	Typography,
} from "@mui/material";
import { Add, FileUpload } from "@mui/icons-material";
import { useToast } from "@components/common/ToastProvider";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useDispatch } from "react-redux";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";
import ImportExcel from "@components/ImportExcel";

import { StyledBoxContainerContent } from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import {
	API_PASSPORT,
	API_PASSPORT_REQUEST,
	// API_PASSPORT_REQUEST,
	// API_USERS_ALL,
} from "@EnvironmentFile/constants/urlConfig";
import {
	addIncomingDelegations,
	updateIncomingDelegations,
	viewIncomingDelegations,
} from "@redux/slices/PassportManagement/PassportManagementSlice";
// eslint-disable-next-line no-restricted-imports
import CusTomTableFreeStyle from "@components/CustomTable/CusTomTableFreeStyle";
import {
	AddMemberButton,
	DeleteMemberButton,
	MemberTableActions,
	MemberTableHeader,
	SmallDeleteIcon,
	StyledRequiredIcon,
	StyledRequiredText,
	TableWrapperPassport,
} from "@styles/PassportManagement.styles";
import { StyledLoadingPopupSignDigital } from "@styles/UploadFile/UploadFile.style";
import withFormWrapper from "@components/common/FormWrapper";
import { StyledSectionTitle, StyledTitleWithToggle } from "@styles/RecordDestruction/RecordDestruction.styles";
import { FileIconSvg } from "@assets/icons/FileIconSvg";
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";
import { defaultValueIncomingDelegations, incomingDelegationsSchema } from "./constantsIncomingDelegations";

// ─── Component ngoài để đảm bảo identity ổn định ────────────────────────────
// Không đặt bên trong AddIncomingDelegations để tránh React unmount/remount
// mỗi khi component cha re-render.
const MemberNameInputCell = React.memo(({ defaultValue, rowId, onChange, InputComponent }) => {
	const [localValue, setLocalValue] = useState(defaultValue || "");
	const debounceTimerRef = useRef(null);

	// Đồng bộ nếu giá trị ngoài thay đổi (ví dụ: reset form)
	const prevDefaultRef = useRef(defaultValue);
	if (prevDefaultRef.current !== defaultValue && document.activeElement?.tagName !== "INPUT") {
		prevDefaultRef.current = defaultValue;
		setLocalValue(defaultValue || "");
	}

	const handleChange = (e) => {
		const val = e.target.value;
		setLocalValue(val);
		clearTimeout(debounceTimerRef.current);
		debounceTimerRef.current = setTimeout(() => {
			onChange(val, rowId);
		}, 150);
	};

	// Cleanup debounce khi unmount
	useEffect(() => {
		return () => clearTimeout(debounceTimerRef.current);
	}, []);

	const Input = InputComponent;

	return (
		<Input
			fullWidth
			placeholder="Nhập họ tên..."
			value={localValue}
			onChange={handleChange}
			size="small"
			inputProps={{ maxLength: 200 }}
		/>
	);
});
MemberNameInputCell.displayName = "MemberNameInputCell";

const DELEGATION_MEMBER_IMPORT_COLUMNS = [
	{ label: "Họ và tên", name: "hoTen", required: true, aliases: ["họ và tên *", "họ tên", "họ và tên", "họ tên *"] },
	{ label: "Vai trò/Chức vụ", name: "vaiTro", required: false, aliases: ["vai trò", "chức vụ", "chức danh", "vai trò/chức vụ"] },
	{ label: "Quốc tịch", name: "nationality", required: false, aliases: ["quốc tịch", "quốc tịch *"] },
	{ label: "Số CCCD/Hộ chiếu", name: "identityCard", required: false, aliases: ["số cccd/hộ chiếu", "số hộ chiếu", "số cccd", "cmnd/cccd", "số giấy tờ"] },
];

const AddIncomingDelegations = (props) => {
	const {
		open,
		onClose,
		onSuccess,
		sharedComponents,
		mode = "add",
		id,
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

	const toast = useToast();
	const dispatch = useDispatch();
	const [isLoading, setIsLoading] = useState(false);
	const isEditMode = mode === "edit";
	const isReadOnly = mode === "view";
	const handleNoop = useCallback(() => { }, []);
	const defaultTitleByMode = isReadOnly
		? "Chi tiết đoàn vào"
		: isEditMode
			? "Cập nhật đoàn vào"
			: "Thêm mới đoàn vào";

	const InputComponents = useMemo(() => {
		const Wrapped = withFormWrapper(BaseInput, "input");
		const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : isReadOnly} />;
		Component.displayName = "InputComponents";
		return Component;

	}, [BaseInput, isReadOnly]);

	const AsyncAutoComplete = useMemo(() => {
		const Wrapped = withFormWrapper(BaseAsyncAutoComplete, "asyncSelect");
		const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : isReadOnly} />;
		Component.displayName = "AsyncAutoComplete";
		return Component;
	}, [BaseAsyncAutoComplete, isReadOnly]);

	const CustomAutoCompleteSearch = useMemo(() => {
		const Wrapped = withFormWrapper(BaseCustomAutoCompleteSearch, "asyncSelect");
		const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : isReadOnly} />;
		Component.displayName = "CustomAutoCompleteSearch";
		return Component;
	}, [BaseCustomAutoCompleteSearch, isReadOnly]);

	const DatePicker = useMemo(() => {
		const Wrapped = withFormWrapper(BaseDatePicker, "date");
		const Component = (props) => (
			<Wrapped
				{...props}
				isView={props.isView !== undefined ? props.isView : isReadOnly}
			/>
		);
		Component.displayName = "DatePicker";
		return Component;
	}, [BaseDatePicker, isReadOnly]);

	const createEmptyMember = useCallback(() => ({
		_id: `new_${Date.now()}`,
		hoTen: "",
		vaiTro: "",
		nationality: null,
		identityCard: "",
	}), []);
	// const [selectedEmployeeDetails, setSelectedEmployeeDetails] = useState(null);
	const {
		control,
		handleSubmit,
		formState: { errors },
		setValue,
		setError,
		clearErrors,
		trigger,
		watch,
		reset,
	} = useForm({
		resolver: yupResolver(incomingDelegationsSchema),
		defaultValues: defaultValueIncomingDelegations,
		mode: "onChange",
	});

	const incomingDate = watch("incomingDate");
	const originType = watch("originType");

	const originTypeValue =
		typeof originType === "object"
			? originType?.value || originType?.id || originType?.code
			: originType;
	const isInternalOrigin = originTypeValue === "TRONG_NUOC";
	const isExternalOrigin = originTypeValue === "NUOC_NGOAI";

	useEffect(() => {
		if (isInternalOrigin) {
			setValue("nationality", null, { shouldDirty: true });
			clearErrors("nationality");
		}
	}, [isInternalOrigin, setValue, clearErrors]);

	const handleDateChange = useCallback(
		(field, fieldName) => (newDate) => {
			field.onChange(newDate ? dayjs(newDate).toISOString() : null);

			if (fieldName === "incomingDate") {
				setTimeout(() => trigger("outgoingDate"), 0);
			}
			if (fieldName === "outgoingDate") {
				setTimeout(() => trigger("incomingDate"), 0);
			}
		},
		[trigger]
	);

	// ============ MEMBER TABLE LOGIC ============
	const [memberList, setMemberList] = useState([createEmptyMember()]);
	const memberListRef = useRef(memberList);
	memberListRef.current = memberList;
	const [openImportDialog, setOpenImportDialog] = useState(false);

	const handleOpenImportDialog = useCallback(() => {
		setOpenImportDialog(true);
	}, []);

	const handleCloseImportDialog = useCallback(() => {
		setOpenImportDialog(false);
	}, []);

	const handleImportMembersSuccess = useCallback(
		(importedRows) => {
			if (!Array.isArray(importedRows) || importedRows.length === 0) return;

			const formattedNewMembers = importedRows.map((row, idx) => ({
				_id: `import_${Date.now()}_${idx}`,
				hoTen: row.hoTen || "",
				vaiTro: row.vaiTro || "",
				nationality: row.nationality || null,
				identityCard: row.identityCard || "",
			}));

			setMemberList((prevList) => {
				const hasOnlyOneEmpty =
					prevList.length === 1 &&
					!prevList[0].hoTen &&
					!prevList[0].vaiTro &&
					!prevList[0].identityCard;
				const nextList = hasOnlyOneEmpty
					? formattedNewMembers
					: [...prevList, ...formattedNewMembers];

				setValue("listOfReceptionMembers", nextList, {
					shouldDirty: true,
					shouldValidate: true,
				});
				setValue("numberOfMembers", nextList.length, {
					shouldDirty: true,
					shouldValidate: true,
				});
				clearErrors("listOfReceptionMembers");
				return nextList;
			});
		},
		[clearErrors, setValue]
	);

	const handleClose = useCallback(async () => {
		reset(defaultValueIncomingDelegations);
		setMemberList([createEmptyMember()]);
		// setSelectedEmployeeDetails(null);
		onClose();
	}, [createEmptyMember, onClose, reset]);

	const normalizeIncomingDelegationDetail = useCallback(
		(data = {}) => {
			const members = Array.isArray(data?.listOfReceptionMembers)
				? data.listOfReceptionMembers.map((m, idx) => ({
					_id: m.id || m._id || `member_${idx}_${Date.now()}`,
					hoTen: m.fullName || m.name || "",
					vaiTro: m.role || "",
					nationality: m.nationality || null,
					identityCard: m.identityCard || m.idCardNo || m.passportNo || "",
				}))
				: [];

			return {
				formValues: {
					nameDelegation: data.nameDelegation || "",
					delegationLeader: data.delegationLeader || null,
					position: data.position || "",
					numberOfMembers: data.numberOfMembers ?? "",
					receivedGifts: data.receivedGifts || "",
					incomingDate: data.incomingDate ? dayjs(data.incomingDate).toISOString() : "",
					outgoingDate: data.outgoingDate ? dayjs(data.outgoingDate).toISOString() : "",
					partnerGifts: data.partnerGifts || "",
					meetingContent: data.meetingContent || "",
					note: data.note || "",
					listOfReceptionMembers: members,
					nationality: data.nationality || null,
					originType: data.originType || null,
				},
				members,
			};
		},
		[]
	);

	useEffect(() => {
		if (!open || !id || (!isEditMode && !isReadOnly)) return;

		const fetchIncomingDelegationDetail = async () => {
			try {
				setIsLoading(true);
				const res = await dispatch(viewIncomingDelegations(id)).unwrap();
				const normalizedData = normalizeIncomingDelegationDetail(res || {});
				reset(normalizedData.formValues);
				setMemberList(
					normalizedData.members.length > 0
						? normalizedData.members
						: [createEmptyMember()]
				);
				clearErrors("listOfReceptionMembers");
			} catch (error) {
				const messageError =
					error?.response?.data?.message ||
					error?.message ||
					"Lấy chi tiết đoàn vào thất bại!";
				toast(messageError, "error");
			} finally {
				setIsLoading(false);
			}
		};

		fetchIncomingDelegationDetail();
	}, [
		open,
		id,
		isEditMode,
		isReadOnly,
		dispatch,
		normalizeIncomingDelegationDetail,
		reset,
		createEmptyMember,
		clearErrors,
		toast,
	]);

	const handleSave = useCallback(
		async (data) => {
			if (isReadOnly) return;

			const currentMembers = memberListRef.current || [];

			const delegationLeaderId =
				typeof data.delegationLeader === "object" && data.delegationLeader
					? data.delegationLeader?.userId ||
					data.delegationLeader?.id ||
					data.delegationLeader?.value
					: data.delegationLeader;

			const mainNationalityVal =
				typeof data.nationality === "object" && data.nationality
					? data.nationality?.value ||
					data.nationality?.ivalued ||
					data.nationality?.id
					: data.nationality;

			const originTypeVal =
				typeof data.originType === "object" && data.originType
					? data.originType?.value ||
					data.originType?.ivalued ||
					data.originType?.id ||
					data.originType?.code
					: data.originType;

			const filterListOfOrganizations = currentMembers
				.filter((item) => item?.hoTen?.trim())
				.map((item) => {
					const nationalityVal =
						typeof item?.nationality === "object" && item?.nationality
							? item.nationality?.value ||
							item.nationality?.ivalued ||
							item.nationality?.id
							: item?.nationality;

					return {
						fullName: item.hoTen.trim(),
						role: item.vaiTro || undefined,
						nationality: nationalityVal || undefined,
						identityCard: item.identityCard?.trim() || undefined,
					};
				});

			if (filterListOfOrganizations.length === 0) {
				setError("listOfReceptionMembers", {
					type: "manual",
					message: "Danh sách thành viên đoàn vào là bắt buộc, vui lòng thêm ít nhất 1 thành viên.",
				});
				toast(
					"Danh sách thành viên đoàn vào là bắt buộc, vui lòng thêm ít nhất 1 thành viên!",
					"warning"
				);
				return;
			}

			clearErrors("listOfReceptionMembers");

			try {
				setIsLoading(true);
				logger.log("Form Data:", data);

				const body = {
					...data,
					delegationLeader: delegationLeaderId || undefined,
					nationality: mainNationalityVal || undefined,
					originType: originTypeVal || undefined,
					numberOfMembers: Number(data.numberOfMembers),
					listOfReceptionMembers: filterListOfOrganizations, //Danh sách thành viên tiếp đón
				};
				logger.log("Request Body:", body);
				if (isEditMode) {
					await dispatch(updateIncomingDelegations({ id, body })).unwrap();
					toast("Cập nhật đoàn vào thành công!", "success");
				} else {
					await dispatch(addIncomingDelegations(body)).unwrap();
					toast("Thêm mới đoàn vào thành công!", "success");
				}
				reset(defaultValueIncomingDelegations);
				setMemberList([createEmptyMember()]);
				onSuccess?.();
				onClose();
			} catch (error) {
				logger.log("Lỗi khi lưu đoàn vào:", error);
				const messageError =
					error?.response?.data?.message ||
					error.message ||
					(isEditMode ? "Cập nhật đoàn vào thất bại!" : "Thêm mới đoàn vào thất bại!");
				toast(messageError, "error");
			} finally {
				setIsLoading(false);
			}
		},
		[
			isReadOnly,
			isEditMode,
			id,
			reset,
			onClose,
			onSuccess,
			toast,
			dispatch,
			createEmptyMember,
			setError,
			clearErrors,
		]
	);

	const handleAddMember = useCallback(() => {
		if (isReadOnly) return;
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
	}, [createEmptyMember, isReadOnly]);



	const RoleSelectCell = React.memo(({ row, onSelect }) => {
		const handleChange = useCallback(
			(val) => {
				onSelect(val, row._id || row.id);
			},
			[onSelect, row._id, row.id]
		);

		return (
			<CustomAutoCompleteSearch
				select
				code="roleIncomingDelegations"
				placeholder="Chọn vai trò..."
				customLabel="title"
				customValue="value"
				value={row.vaiTro}
				onChange={handleChange}
				unsetFontWeight
			/>
		);
	});
	RoleSelectCell.displayName = "RoleSelectCell";

	const NationalitySelectCell = React.memo(({ row, onSelect }) => {
		const handleChange = useCallback(
			(val) => {
				onSelect(val, row._id || row.id);
			},
			[onSelect, row._id, row.id]
		);

		return (
			<CustomAutoCompleteSearch
				select
				code="COUNTRY"
				placeholder="Chọn quốc tịch..."
				optionLabel="title"
				optionValue="value"
				value={row.nationality}
				onChange={handleChange}
				unsetFontWeight
			/>
		);
	});
	NationalitySelectCell.displayName = "NationalitySelectCell";

	const IdentityCardInputCell = React.memo(({ row, onChange }) => {
		const handleChange = useCallback(
			(e) => {
				onChange(e.target.value, row._id || row.id);
			},
			[onChange, row._id, row.id]
		);

		return (
			<InputComponents
				fullWidth
				placeholder="Nhập CCCD/Số hộ chiếu..."
				value={row.identityCard || ""}
				onChange={handleChange}
				size="small"
			/>
		);
	});
	IdentityCardInputCell.displayName = "IdentityCardInputCell";

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
		if (isReadOnly) return;
		setMemberList((prev) => prev.filter((m) => m._id !== memberId));
	}, [isReadOnly]);

	const handleMemberNameChange = useCallback(
		(value, memberId) => {
			if (isReadOnly) return;
			setMemberList((prev) => {
				const updated = prev.map((m) => {
					if (m._id !== memberId) return m;
					return { ...m, hoTen: value || "" };
				});
				if (updated.some((item) => item?.hoTen?.trim())) {
					clearErrors("listOfReceptionMembers");
				}
				return updated;
			});
		},
		[isReadOnly, clearErrors]
	);

	const handleRoleSelect = useCallback((value, memberId) => {
		if (isReadOnly) return;
		setMemberList((prev) =>
			prev.map((m) => {
				if (m._id !== memberId) return m;
				return { ...m, vaiTro: value || "" };
			})
		);
	}, [isReadOnly]);

	const handleMemberNationalityChange = useCallback((value, memberId) => {
		if (isReadOnly) return;
		setMemberList((prev) =>
			prev.map((m) => {
				if (m._id !== memberId) return m;
				return { ...m, nationality: value };
			})
		);
	}, [isReadOnly]);

	const handleMemberIdentityCardChange = useCallback((value, memberId) => {
		if (isReadOnly) return;
		setMemberList((prev) =>
			prev.map((m) => {
				if (m._id !== memberId) return m;
				return { ...m, identityCard: value || "" };
			})
		);
	}, [isReadOnly]);

	const totalMembers = memberList.filter((m) => m.hoTen?.trim()).length;

	const memberColumns = useMemo(() => {
		if (isReadOnly) {
			return [
				{
					name: "hoTen",
					title: "Họ tên",
					width: "200px",
				},
				{
					name: "vaiTro",
					title: "Vai trò",
					width: "180px",
					renderCell: ({ row }) => (
						<CustomAutoCompleteSearch
							select
							code="roleIncomingDelegations"
							customLabel="title"
							customValue="value"
							value={row.vaiTro}
							onChange={handleNoop}
							disabled
							unsetFontWeight
						/>
					),
				},
				{
					name: "nationality",
					title: "Quốc tịch",
					width: "180px",
					renderCell: ({ row }) => (
						<CustomAutoCompleteSearch
							select
							code="COUNTRY"
							optionLabel="title"
							optionValue="value"
							value={row.nationality}
							onChange={handleNoop}
							disabled
							unsetFontWeight
						/>
					),
				},
				{
					name: "identityCard",
					title: "CCCD / Số hộ chiếu",
					width: "200px",
				},
			];
		}

		return [
			{
				name: "hoTen",
				title: "Họ tên",
				width: "200px",
				renderCell: ({ row }) => (
					<MemberNameInputCell
						defaultValue={row.hoTen}
						rowId={row._id || row.id}
						onChange={handleMemberNameChange}
						InputComponent={InputComponents}
					/>
				),
			},
			{
				name: "vaiTro",
				title: "Vai trò",
				width: "180px",
				renderCell: ({ row }) => (
					<RoleSelectCell row={row} onSelect={handleRoleSelect} />
				),
			},
			{
				name: "nationality",
				title: "Quốc tịch",
				width: "180px",
				renderCell: ({ row }) => (
					<NationalitySelectCell row={row} onSelect={handleMemberNationalityChange} />
				),
			},
			{
				name: "identityCard",
				title: "CCCD / Số hộ chiếu",
				width: "200px",
				renderCell: ({ row }) => (
					<IdentityCardInputCell row={row} onChange={handleMemberIdentityCardChange} />
				),
			},
			{
				name: "",
				title: "",
				width: "50px",
				alignCenter: true,
				renderCell: ({ row }) => (
					<DeleteCell rowId={row._id} onRemove={handleRemoveMember} />
				),
			},
		];
	}, [
		isReadOnly,
		InputComponents,
		handleMemberNameChange,
		handleRoleSelect,
		handleMemberNationalityChange,
		handleMemberIdentityCardChange,
		handleRemoveMember,
		handleNoop,
	]);

	const handleChangeDelegationLeader = useCallback(
		(value) => {
			// logger.log("Selected handleChangeDelegationLeader:", value);
			setValue("delegationLeader", value);
			trigger("delegationLeader");
			if (value) {
				// Auto-fill các trường thông tin từ dữ liệu nhân viên
				setValue("position", value.position || "");
			} else {
				// Reset các trường khi xóa lựa chọn
				setValue("position", null);
			}
		},
		[setValue, trigger]
	);

	const handleDestinationChange = useCallback(
		(val) => {
			setValue("nationality", val, { shouldDirty: true, shouldValidate: true });
		},
		[setValue]
	);

	return (
		<BaseSwipper
			title={title || defaultTitleByMode}
			open={open}
			onClose={handleClose}
			onSave={isReadOnly ? undefined : handleSubmit(handleSave)}
			type={isReadOnly ? "view" : isEditMode ? "edit" : "add"}
			hideBackdrop
			footer={!isReadOnly ? (
				<>
					<FlexGrowBox />
					<FooterActions>
						<ButtonOutline
							onClick={handleSubmit(handleSave)}
							disabled={isLoading}
							variant="outlined"
						>
							{isEditMode ? "Cập nhật" : "Lưu"}
						</ButtonOutline>
					</FooterActions>
				</>
			) : null}
			isLoading={isLoading}
		>
			<StyledBoxContainerContent styledMarginTop>
				<StyledTitleWithToggle>
					<FileIconSvg />
					<StyledSectionTitle variant="h6" noWrap>
						THÔNG TIN ĐOÀN VÀO
					</StyledSectionTitle>
				</StyledTitleWithToggle>
				<Grid container spacing={2} mt={2}>
					<Grid item xs={12}>
						<Controller
							name="nameDelegation"
							control={control}
							render={({ field }) => (
								<InputComponents
									label="Tên đoàn"
									placeholder="Nhập dữ liệu..."
									{...field}
									disabled={isReadOnly}
									error={!!errors.nameDelegation}
									helperText={errors.nameDelegation?.message}
									required={!isReadOnly}
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} md={6}>
						<Controller
							name="receivedGifts"
							control={control}
							render={({ field }) => (
								<InputComponents
									label="Quà tặng của đối tác"
									placeholder="Nhập dữ liệu..."
									{...field}
									disabled={isReadOnly}
									error={!!errors.receivedGifts}
									helperText={errors.receivedGifts?.message}
									multiline
									rows={isReadOnly ? 5 : 3}
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} md={6}>
						<Grid container spacing={1}>
							<Grid item xs={12} sm={6}>
								<Controller
									name="incomingDate"
									control={control}
									render={({ field }) => (
										<DatePicker
											label="Ngày đến"
											value={field.value ? dayjs(field.value) : null}
											onChange={handleDateChange(field, "incomingDate")}
											error={!!errors.incomingDate}
											helperText={errors.incomingDate?.message}
											disabled={isReadOnly}
											required={!isReadOnly}
										/>
									)}
								/>
							</Grid>
							<Grid item xs={12} sm={6}>
								<Controller
									name="outgoingDate"
									control={control}
									render={({ field }) => (
										<DatePicker
											label="Ngày về"
											value={field.value ? dayjs(field.value) : null}
											onChange={handleDateChange(field, "outgoingDate")}
											minDate={incomingDate ? dayjs(incomingDate) : undefined}
											error={!!errors.outgoingDate}
											helperText={errors.outgoingDate?.message}
											disabled={isReadOnly}
											required={!isReadOnly}
										/>
									)}
								/>
							</Grid>
							<Grid item xs={12} md={!isExternalOrigin ? 12 : 6} sm={6}>
								<Controller
									name="originType"
									control={control}
									render={({ field }) => (
										<CustomAutoCompleteSearch
											select
											code="originType"
											label="Đến từ"
											placeholder="Nhập dữ liệu..."
											customLabel="title"
											customValue="value"
											{...field}
											error={!!errors.originType}
											helperText={errors.originType?.message}
											unsetFontWeight
											disabled={isReadOnly}
											required={!isReadOnly}
										/>
									)}
								/>
							</Grid>
							{isExternalOrigin && (
								<Grid item xs={12} sm={6}>
									<Controller
										name="nationality"
										control={control}
										render={({ field }) => (
											<AsyncAutoComplete
												fullWidth
												label="Quốc tịch"
												placeholder="Tìm kiếm quốc tịch..."
												url={`${API_PASSPORT}/countries`}
												queryParam="title"
												optionLabel="title"
												optionValue="ivalued"
												value={field.value || []}
												onChange={handleDestinationChange}
												error={!!errors.nationality}
												helperText={errors.nationality?.message}
												size="small"
												unsetFontWeight
											/>
										)}
									/>
								</Grid>
							)}
						</Grid>
					</Grid>
					<Grid item xs={12} sm={6} md={12}>
						<Controller
							name="meetingContent"
							control={control}
							render={({ field }) => (
								<InputComponents
									label="Nội dung buổi làm việc"
									placeholder="Nhập nội dung buổi làm việc..."
									{...field}
									disabled={isReadOnly}
									error={!!errors.meetingContent}
									helperText={errors.meetingContent?.message}
									multiline
									rows={2}
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={6}>
						<Controller
							name="delegationLeader"
							control={control}
							render={({ field }) => (
								<AsyncAutoComplete
									fullWidth
									label="Trưởng đoàn tiếp đón"
									placeholder="Tìm kiếm trưởng đoàn..."
									url={`${API_PASSPORT_REQUEST}/delegation-leaders`}
									queryParam="nameVn"
									optionLabel="nameVn"
									optionValue="id"
									value={field.value}
									onChange={handleChangeDelegationLeader}
									error={!!errors.delegationLeader}
									helperText={errors.delegationLeader?.message}
									size="small"
									required={!isReadOnly}
									unsetFontWeight
									disabled={isReadOnly}
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} md={6} sm={6}>
						<Controller
							name="position"
							control={control}
							render={({ field }) => (
								<InputComponents
									label="Chức vụ"
									placeholder="Nhập dữ liệu..."
									{...field}
									error={!!errors.position}
									helperText={errors.position?.message}
									disabled
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12}>
						<Controller
							name="partnerGifts"
							control={control}
							render={({ field }) => (
								<InputComponents
									label="Quà tặng phía TCT"
									placeholder="Nhập quà tặng phía TCT..."
									{...field}
									disabled={isReadOnly}
									error={!!errors.partnerGifts}
									helperText={errors.partnerGifts?.message}
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
									placeholder="Nhập ghi chú..."
									{...field}
									disabled={isReadOnly}
									error={!!errors.note}
									helperText={errors.note?.message}
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
					<Controller
						name="listOfReceptionMembers"
						control={control}
						defaultValue={[]}
						render={() => (
							<>
								<MemberTableHeader>
									<StyledTitleWithToggle>
										<FileIconSvg />
										<StyledSectionTitle variant="h6" noWrap>
											THÀNH VIÊN ĐOÀN VÀO {!isReadOnly && <StyledRequiredIcon>*</StyledRequiredIcon>}
										</StyledSectionTitle>
									</StyledTitleWithToggle>
									<MemberTableActions>
										<Typography variant="body2">
											Tổng số thành viên: <strong>{totalMembers}</strong>
										</Typography>
										{!isReadOnly && (
											<>
												<Tooltip title="Import danh sách từ Excel">
													<ButtonOutline
														size="small"
														onClick={handleOpenImportDialog}
														startIcon={<FileUpload size="small" />}
													>
														Import Excel
													</ButtonOutline>
												</Tooltip>
												<Tooltip title="Thêm thành viên">
													<AddMemberButton
														onClick={handleAddMember}
														size="small"
													>
														<Add />
													</AddMemberButton>
												</Tooltip>
											</>
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
								{!isReadOnly && !!errors?.listOfReceptionMembers?.message && (
									<StyledRequiredText>
										{errors.listOfReceptionMembers.message}
									</StyledRequiredText>
								)}
							</>
						)}
					/>
				</Grid>
			</StyledBoxContainerContent>
			{isLoading && (
				<StyledLoadingPopupSignDigital>
					<CircularProgress />
				</StyledLoadingPopupSignDigital>
			)}
			{openImportDialog && (
				<ImportExcel
					open={openImportDialog}
					onClose={handleCloseImportDialog}
					templateKey="template_import_doanvao"
					customColumns={DELEGATION_MEMBER_IMPORT_COLUMNS}
					isClientSide
					onImportSuccess={handleImportMembersSuccess}
					title="Import danh sách thành viên đoàn vào"
				/>
			)}
		</BaseSwipper>
	);
};

AddIncomingDelegations.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	onSuccess: PropTypes.func,
	id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	isLoading: PropTypes.bool,
	sharedComponents: PropTypes.object,
	mode: PropTypes.oneOf(["add", "edit", "view"]),
	title: PropTypes.string,
	documentType: PropTypes.number,
	incomingCreate: PropTypes.bool,
	isActionMenu: PropTypes.bool,
};

export default withSharedComponents(AddIncomingDelegations);
