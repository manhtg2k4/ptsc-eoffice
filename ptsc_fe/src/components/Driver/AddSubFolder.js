import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Grid, Box, Typography, IconButton, Popover, Chip, FormHelperText } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useForm, Controller, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import PropTypes from "prop-types";
import withSharedComponents from "@components/WrapperComponent";
import { useToast } from "@components/common/ToastProvider";
import axiosInstance from "@utils/axiosInstance";
import { HelpOutline as HelpOutlineIcon, Clear as ClearIcon } from "@mui/icons-material";
import { FlexGrowBox } from "@styles/BaseSwiper/BaseSwiper.style";
import { API_ARCHIVE_FOLDER, API_MANAGEMENT_FODER, API_GET_LIST_UNIT } from "@EnvironmentFile/constants/urlConfig";
import SelectUnitsDialog from "./SelectUnitsDialog";
import SelectIndividualsDialog from "./SelectIndividualsDialog";
import { IconRequied } from "@styles/UploadFile/UploadFile.style";

const FormLabel = styled(Typography)(({ theme }) => ({
	fontSize: "14px",
	fontWeight: 600,
	color: theme.palette.text.primary,
	marginBottom: theme.spacing(0.5),
	display: "flex",
	alignItems: "center",
	textTransform: "uppercase",
}));

const HelpIconButton = styled(IconButton)(({ theme }) => ({
	padding: theme.spacing(0.2),
}));

const StyledHelpOutlineIcon = styled(HelpOutlineIcon)({
	fontSize: '1.1rem',
});

const PopoverContainer = styled(Box)(({ theme }) => ({
	padding: theme.spacing(2),
	maxWidth: 300,
}));

const PopoverTitle = styled(Typography)(({ theme }) => ({
	fontWeight: 'bold',
	marginBottom: theme.spacing(1),
}));

const StyledList = styled('ul')({
	margin: 0,
	paddingLeft: '20px',
	listStyleType: 'disc',
});

const SelectButton = styled(IconButton)(() => ({
	backgroundColor: '#1976d2',
	color: 'white',
	borderRadius: '4px',
	padding: '6px 16px',
	height: '40px',
	minWidth: '80px',
	fontSize: '14px',
	fontWeight: 'bold',
	marginTop: 0,
	'&:hover': {
		backgroundColor: '#1565c0',
	},
	'& span': {
		color: 'white',
	}
}));

const FieldContainer = styled(Box)(({ theme }) => ({
	display: 'flex',
	flexDirection: 'column',
	gap: theme.spacing(0.5),
	width: '100%',
}));

const InputRow = styled(Box)({
	display: 'flex',
	alignItems: 'flex-start',
	gap: '8px',
	width: '100%',
	flexWrap: 'nowrap',
});

const RelativeContainer = styled(Box)({
	flex: 1,
	minWidth: 0,
	position: 'relative',
});

const ChipContainer = styled(Box)(({ theme }) => ({
	display: "flex",
	flexWrap: "wrap",
	gap: theme.spacing(0.5),
	flex: 1,
}));

const ChipInputContainer = styled("div", {
	shouldForwardProp: (prop) => prop !== "error",
})(({ theme, error }) => ({
	position: "relative",
	padding: "8px 14px",
	borderRadius: "4px",
	border: `1px solid ${error ? theme.palette.error.main : theme.palette.divider}`,
	minHeight: "40px",
	display: "flex",
	alignItems: "center",
	width: "100%",
	boxSizing: "border-box",
	cursor: "pointer",
	backgroundColor: theme.palette.background.paper,
	"&:hover": {
		borderColor: error ? theme.palette.error.main : theme.palette.text.primary,
	},
}));

const PlaceholderTypography = styled(Typography)(({ theme }) => ({
	color: theme.palette.text.secondary,
	fontSize: "14px",
}));

const CustomChip = styled(Chip)(({ theme }) => ({
	height: "24px",
	backgroundColor: theme.palette.action.hover,
	color: theme.palette.text.primary,
	border: `1px solid ${theme.palette.divider}`,
	fontSize: "12px",
}));

const ClearAllButton = styled(IconButton)(({ theme }) => ({
	padding: theme.spacing(0.5),
	color: theme.palette.text.secondary,
	"&:hover": {
		color: theme.palette.text.primary,
	},
}));

const StyledFormHelperText = styled(FormHelperText)(({ theme }) => ({
	marginLeft: theme.spacing(1.5),
}));

const StyledGridContainer = styled(Grid)(({ theme }) => ({
	marginTop: theme.spacing(1),
}));

const schema = yup.object().shape({
	name: yup.string().required("Vui lòng nhập tên thư mục").max(260, "Tên thư mục không được vượt quá 260 ký tự"),
	viewPermissions: yup.array().min(1, "Vui lòng chọn phòng ban xem"),
	editPermissions: yup.array().min(1, "Vui lòng chọn người có quyền chỉnh sửa"),
	editOrganizationUnit: yup.object().nullable().required("Vui lòng chọn phòng ban"),
});

const PermissionChip = ({ unit, onRemove }) => {
	const handleRemoveClick = useCallback((e) => {
		onRemove(e, unit.id || unit._id);
	}, [onRemove, unit]);

	return (
		<CustomChip
			label={unit.name || unit.title}
			onDelete={handleRemoveClick}
			size="small"
		/>
	);
};

PermissionChip.propTypes = {
	unit: PropTypes.object.isRequired,
	onRemove: PropTypes.func.isRequired,
};

const StyledClearIcon = styled(ClearIcon)({});

StyledClearIcon.defaultProps = {
	fontSize: 'small',
};

const AddSubFolder = ({
	open,
	onClose,
	onSuccess,
	isLoading,
	parentId,
	sharedComponents,
}) => {
	const toast = useToast();
	const { Dialog, InputComponents, AsyncAutoComplete } = sharedComponents;
	const [helpAnchorEl, setHelpAnchorEl] = useState(null);
	const [isSelectViewUnitsOpen, setIsSelectViewUnitsOpen] = useState(false);
	const [isSelectEditUnitsOpen, setIsSelectEditUnitsOpen] = useState(false);

	const handleHelpClick = useCallback((event) => {
		event.stopPropagation();
		setHelpAnchorEl(event.currentTarget);
	}, []);

	const handleHelpClose = useCallback(() => {
		setHelpAnchorEl(null);
	}, []);

	const isHelpOpen = useMemo(() => Boolean(helpAnchorEl), [helpAnchorEl]);
	const helpPopoverId = useMemo(() => isHelpOpen ? 'edit-permission-help-popover-sub' : undefined, [isHelpOpen]);

	const {
		control,
		handleSubmit,
		reset,
		setValue,
		getValues,
		formState: { errors },
	} = useForm({
		resolver: yupResolver(schema),
		defaultValues: {
			name: "",
			viewPermissions: [],
			editPermissions: [],
			editOrganizationUnit: null,
		},
	});

	const editOrganizationUnitValue = useWatch({ control, name: "editOrganizationUnit" });
	const documentFieldValue = useWatch({ control, name: "viewPermissions" }) || [];
	const bookManagerValue = useWatch({ control, name: "editPermissions" }) || [];

	const prevUnitIdRef = useRef(null);

	useEffect(() => {
		if (open) {
			reset({
				name: "",
				viewPermissions: [],
				editPermissions: [],
				editOrganizationUnit: null,
			});
			prevUnitIdRef.current = null;

			if (parentId) {
				axiosInstance.get(`${API_MANAGEMENT_FODER}/${parentId}`)
					.then((res) => {
						const parentData = res?.data?.data ? res.data.data : (res?.data || res);
						if (parentData) {
							if (parentData.editOrganizationUnit) {
								setValue("editOrganizationUnit", parentData.editOrganizationUnit);
								prevUnitIdRef.current = parentData.editOrganizationUnit?.id || parentData.editOrganizationUnit?._id;
							}
							if (parentData.viewPermissions || parentData.viewUserPermissions) {
								const initialView = [
									...(parentData.viewPermissions || []).map(u => ({ ...u, types: u.types || "company" })),
									...(parentData.viewUserPermissions || []).map(u => ({ ...u, types: "user" }))
								];
								setValue("viewPermissions", initialView);
							}
							if (Array.isArray(parentData.editPermissions) && parentData.editPermissions.length > 0) {
								setValue("editPermissions", parentData.editPermissions);
							}
						}
					})
					.catch(() => {
						// Fallback silently if parent folder details fail to load
					});
			}
		} else {
			reset({
				name: "",
				viewPermissions: [],
				editPermissions: [],
				editOrganizationUnit: null,
			});
			prevUnitIdRef.current = null;
		}
	}, [open, parentId, reset, setValue]);

	useEffect(() => {
		if (open && editOrganizationUnitValue) {
			const currentId = editOrganizationUnitValue?.id || editOrganizationUnitValue?._id;
			if (prevUnitIdRef.current && currentId !== prevUnitIdRef.current) {
				setValue("editPermissions", [], { shouldValidate: true });
			}
			prevUnitIdRef.current = currentId;
		}
	}, [editOrganizationUnitValue, open, setValue]);

	const handleSave = handleSubmit(async (data) => {
		const viewUnits = (data.viewPermissions || []).filter(u => u.types !== "user").map(u => u.id || u._id);
		const viewUsers = (data.viewPermissions || []).filter(u => u.types === "user").map(u => u.id || u._id);

		const payload = {
			name: data.name,
			type: "folder",
			parentId: parentId ? Number(parentId) : null,
			viewPermissions: viewUnits,
			viewUserPermissions: viewUsers,
			editPermissions: (data.editPermissions || []).map(u => u.id || u._id),
			editOrganizationUnit: data.editOrganizationUnit?.id || data.editOrganizationUnit?._id || data.editOrganizationUnit,
		};

		try {
			const response = await axiosInstance.post(API_ARCHIVE_FOLDER, payload);
			toast("Thêm mới thư mục con thành công!", "success");
			onSuccess(response.data || data);
		} catch (error) {
			toast(error.response?.data?.message || "Có lỗi xảy ra khi thêm mới", "error");
		}
	});

	const handleOpenViewUnits = useCallback(() => {
		setIsSelectViewUnitsOpen(true);
	}, []);

	const handleCloseViewUnits = useCallback(() => {
		setIsSelectViewUnitsOpen(false);
	}, []);

	const handleOpenEditUnits = useCallback(() => {
		setIsSelectEditUnitsOpen(true);
	}, []);

	const handleCloseEditUnits = useCallback(() => {
		setIsSelectEditUnitsOpen(false);
	}, []);

	const handleSaveViewUnits = useCallback((selectedUnits) => {
		setValue("viewPermissions", selectedUnits, { shouldValidate: true });
	}, [setValue]);

	const handleSaveEditUnits = useCallback((selectedUnits) => {
		setValue("editPermissions", selectedUnits, { shouldValidate: true });
	}, [setValue]);

	const handleRemoveViewUnit = useCallback((e, unitId) => {
		e.stopPropagation();
		const currentUnits = getValues("viewPermissions") || [];
		const updatedUnits = currentUnits.filter(u => (u.id || u._id) !== unitId);
		setValue("viewPermissions", updatedUnits, { shouldValidate: true });
	}, [getValues, setValue]);

	const handleRemoveEditUnit = useCallback((e, unitId) => {
		e.stopPropagation();
		const currentUnits = getValues("editPermissions") || [];
		const updatedUnits = currentUnits.filter(u => (u.id || u._id) !== unitId);
		setValue("editPermissions", updatedUnits, { shouldValidate: true });
	}, [getValues, setValue]);

	const handleClearViewUnits = useCallback((e) => {
		e.stopPropagation();
		setValue("viewPermissions", [], { shouldValidate: true });
	}, [setValue]);

	const handleClearEditUnits = useCallback((e) => {
		e.stopPropagation();
		setValue("editPermissions", [], { shouldValidate: true });
	}, [setValue]);

	return (
		<Dialog
			title="Tạo thư mục con"
			open={open}
			onClose={onClose}
			onSave={handleSave}
			type="add"
			isLoading={isLoading}
			size="sm"
			titleButton="Xác nhận"
			cancelButtonText="Huỷ"
		>
			<StyledGridContainer container spacing={2}>
				<Grid item xs={12}>
					<FormLabel>
						Tên thư mục<IconRequied component="span">*</IconRequied>
					</FormLabel>
					<Controller
						name="name"
						control={control}
						render={({ field }) => (
							<InputComponents
								placeholder="Nhập tên thư mục..."
								{...field}
								error={!!errors.name}
								helperText={errors.name?.message}
								required
								fullWidth
							/>
						)}
					/>
				</Grid>

				<Grid item xs={12}>
					<FormLabel>
						Tên phòng ban <IconRequied component="span">*</IconRequied>
					</FormLabel>
					<Controller
						name="editOrganizationUnit"
						control={control}
						render={({ field }) => (
							<FlexGrowBox>
								<AsyncAutoComplete
									fullWidth
									placeholder="Tìm kiếm đơn vị..."
									url={API_GET_LIST_UNIT}
									method="GET"
									queryParam="name"
									optionLabel="name"
									optionValue="id"
									{...field}
									returnObject
									error={!!errors.editOrganizationUnit}
									helperText={errors.editOrganizationUnit?.message}
									size="small"
									required
									limitTags={3}
								/>
							</FlexGrowBox>
						)}
					/>
				</Grid>

				<Grid item xs={12}>
					<FieldContainer>
						<FormLabel>
							Phân quyền xem <IconRequied component="span">*</IconRequied>
						</FormLabel>
						<InputRow>
							<RelativeContainer>
								<ChipInputContainer
									error={!!errors.viewPermissions}
									onClick={handleOpenViewUnits}
								>
									{documentFieldValue.length > 0 ? (
										<>
											<ChipContainer>
												{documentFieldValue.map((unit) => (
													<PermissionChip
														key={unit.id || unit._id}
														unit={unit}
														onRemove={handleRemoveViewUnit}
													/>
												))}
											</ChipContainer>
											<ClearAllButton size="small" onClick={handleClearViewUnits}>
												<StyledClearIcon />
											</ClearAllButton>
										</>
									) : (
										<PlaceholderTypography>
											Chọn phòng ban có quyền xem
										</PlaceholderTypography>
									)}
								</ChipInputContainer>
								{errors.viewPermissions && (
									<StyledFormHelperText error>
										{errors.viewPermissions.message}
									</StyledFormHelperText>
								)}
							</RelativeContainer>
							<SelectButton onClick={handleOpenViewUnits}>
								CHỌN
							</SelectButton>
						</InputRow>
					</FieldContainer>
				</Grid>

				<Grid item xs={12}>
					<FieldContainer>
						<FormLabel>
							Phân quyền chỉnh sửa <IconRequied component="span">*</IconRequied>
							<HelpIconButton onClick={handleHelpClick}>
								<StyledHelpOutlineIcon />
							</HelpIconButton>
						</FormLabel>
						<InputRow>
							<RelativeContainer>
								<ChipInputContainer
									error={!!errors.editPermissions}
									onClick={handleOpenEditUnits}
								>
									{bookManagerValue.length > 0 ? (
										<>
											<ChipContainer>
												{bookManagerValue.map((unit) => (
													<PermissionChip
														key={unit.id || unit._id}
														unit={unit}
														onRemove={handleRemoveEditUnit}
													/>
												))}
											</ChipContainer>
											<ClearAllButton size="small" onClick={handleClearEditUnits}>
												<StyledClearIcon />
											</ClearAllButton>
										</>
									) : (
										<PlaceholderTypography>
											Chọn phòng ban có quyền chỉnh sửa
										</PlaceholderTypography>
									)}
								</ChipInputContainer>
								{errors.editPermissions && (
									<StyledFormHelperText error>
										{errors.editPermissions.message}
									</StyledFormHelperText>
								)}
							</RelativeContainer>
							<SelectButton onClick={handleOpenEditUnits}>
								CHỌN
							</SelectButton>
						</InputRow>
					</FieldContainer>
				</Grid>

				<SelectUnitsDialog
					open={isSelectViewUnitsOpen}
					onClose={handleCloseViewUnits}
					onSave={handleSaveViewUnits}
					title="CHỌN PHÒNG BAN CÓ QUYỀN XEM THƯ MỤC"
					roleLabel="Quyền xem"
					initialSelected={documentFieldValue}
				/>

				<SelectIndividualsDialog
					open={isSelectEditUnitsOpen}
					onClose={handleCloseEditUnits}
					onSave={handleSaveEditUnits}
					title="CHỌN NGƯỜI CÓ QUYỀN CHỈNH SỬA THƯ MỤC"
					roleLabel="Quyền chỉnh sửa"
					initialSelected={bookManagerValue}
					filterUnitId={editOrganizationUnitValue?.id || editOrganizationUnitValue?._id}
				/>

				<Popover
					id={helpPopoverId}
					open={isHelpOpen}
					anchorEl={helpAnchorEl}
					onClose={handleHelpClose}
					anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
					transformOrigin={{ vertical: 'top', horizontal: 'left' }}
				>
					<PopoverContainer>
						<PopoverTitle variant="subtitle2">Quyền chỉnh sửa bao gồm :</PopoverTitle>
						<StyledList>
							<li><Typography variant="body2">Tải tệp lên</Typography></li>
							<li><Typography variant="body2">Đổi tên thư mục</Typography></li>
							<li><Typography variant="body2">Xoá tệp trong thư mục</Typography></li>
							<li><Typography variant="body2">Tạo thư mục con</Typography></li>
							<li><Typography variant="body2">Sắp xếp thư mục/ tệp</Typography></li>
						</StyledList>
					</PopoverContainer>
				</Popover>
			</StyledGridContainer>
		</Dialog>
	);
};

AddSubFolder.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	onSuccess: PropTypes.func.isRequired,
	parentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
	isLoading: PropTypes.bool,
	sharedComponents: PropTypes.object.isRequired,
};

export default withSharedComponents(AddSubFolder);
