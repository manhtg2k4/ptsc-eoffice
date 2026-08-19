import React, { useCallback, useEffect, useState } from "react";
import {
	Typography,
	Box,
	Paper,
	Divider,
	CircularProgress,
	Table,
	TableHead,
	TableBody,
	TableRow,
	TableCell,
	Checkbox,
	Button,
	TableContainer,
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import { API_GET_LIST_FUNCTIONMANAGEMANT, ROLE_FEATURE, API_ADD_FIELD_BPMN } from "@EnvironmentFile/constants/urlConfig";
import { useToast } from "@components/common/ToastProvider";
import DialogAddUser from "./DialogAddUser";
import api from "@services/api";
import withSharedComponents from "@components/WrapperComponent";
import { useDispatch } from "react-redux";
import { getListRoleDetail } from "@redux/slices/PermissionSlice/PermissionSlice";

const StyledPaper = styled(Paper)(({ theme, viewMode }) => ({
	padding: viewMode ? 'none' : theme.spacing(3),
	borderRadius: viewMode ? 'none' : "12px",
	boxShadow: viewMode ? 'none' : theme.shadows[2],
	display: 'flex',
	flexDirection: 'column',
	height: '100%',
	maxHeight: 'calc(100vh - 350px)', // Giới hạn chiều cao của toàn bộ component
}));

const TitleTypography = styled(Typography)(({ theme }) => ({
	fontWeight: 'bold',
	color: theme.palette.primary.main,
	marginBottom: theme.spacing(1),
}));

const StyledDivider = styled(Divider)(({ theme }) => ({
	marginBottom: theme.spacing(2),
}));

const LoadingContainer = styled(Box)(({ theme }) => ({
	display: 'flex',
	justifyContent: 'center',
	paddingTop: theme.spacing(4),
	paddingBottom: theme.spacing(4),
}));

const EmptyDataTypography = styled(Typography)(({ theme }) => ({
	color: theme.palette.text.secondary,
	fontStyle: 'italic',
	textAlign: 'center',
	paddingTop: theme.spacing(2),
	paddingBottom: theme.spacing(2),
}));

const HeaderTableCell = styled(TableCell)(({ theme }) => ({
	fontWeight: 'bold',
	backgroundColor: theme.components?.MuiTableHead?.styleOverrides?.root?.backgroundColor || theme.palette.background.paper,
	minWidth: '200px', // Tăng chiều rộng cột đầu tiên (Tên chức năng)
	position: 'sticky',
	left: 0,
	zIndex: 3,
	borderRight: `1px solid ${theme.palette.divider}`,
}));

// Style cho Header của Vai trò (Cột)
const RoleHeaderCell = styled(TableCell)(({ theme }) => ({
	textAlign: 'center',
	backgroundColor: theme.components?.MuiTableHead?.styleOverrides?.root?.backgroundColor || theme.palette.background.paper,
	minWidth: '120px',
}));

const RoleHeaderContent = styled(Box)({
	display: 'flex',
	flexDirection: 'column',
	alignItems: 'center',
	gap: '4px',
});

const RoleNameTitle = styled(Typography, {
	shouldForwardProp: (prop) => prop !== 'viewMode',
})(({ theme, viewMode }) => ({
	fontWeight: 600,
	fontSize: '0.875rem',
	cursor: viewMode ? 'default' : 'pointer',
	'&:hover': {
		color: viewMode ? 'inherit' : theme.palette.primary.main,
		textDecoration: viewMode ? 'none' : 'underline'
	}
}));

const FooterContainer = styled(Box)(({ theme }) => ({
	marginTop: theme.spacing(2),
	display: 'flex',
	justifyContent: 'flex-end',
	backgroundColor: theme.palette.background.paper,
	paddingTop: theme.spacing(2),
	borderTop: `1px solid ${theme.palette.divider}`,
	flexShrink: 0, // Đảm bảo footer không bị co lại
}));

const SaveButton = styled(Button)(({ theme }) => ({
	backgroundColor: `${theme.palette.primary.main} !important`,
	color: `${theme.palette.primary.contrastText} !important`,
	'&:hover': {
		backgroundColor: `${theme.palette.primary.dark} !important`,
	},
}));

const FeatureNameCell = styled(TableCell)(({ theme }) => ({
	fontWeight: 500,
	position: 'sticky',
	left: 0,
	backgroundColor: theme.palette.background.paper,
	zIndex: 1,
	borderRight: `1px solid ${theme.palette.divider}`,
}));

const CheckboxCell = styled(TableCell)({
	textAlign: 'center',
});

const ResponsiveTableContainer = styled(TableContainer)(({ theme }) => ({
	flex: 1, // Để bảng chiếm hết không gian còn lại
	maxHeight: 'calc(100vh - 580px)',
	overflow: 'auto',
	[theme.breakpoints.down(768)]: {
		'&::-webkit-scrollbar': {
			display: 'none',
		},
		scrollbarWidth: 'none',
		'-ms-overflow-style': 'none',
	}
}));


const Roles = ({ processId, applyInspection, processSelect, viewMode = false }) => {
	const [features, setFeatures] = useState([]);
	const [roles, setRoles] = useState([]);
	const [loading, setLoading] = useState(true);
	const [openDialogSetUser, setOpenDialogSetUser] = useState(null);
	const dispatch = useDispatch();
	useTheme();

	const toast = useToast();

	// Hàm thêm users vào role
	const handleAddUsersToRole = useCallback((roleCode, userArr) => {
		setRoles((prevRoles) =>
			prevRoles.map((role) =>
				role.roleCode === roleCode
					? { ...role, users: userArr }
					: role
			)
		);
		setOpenDialogSetUser(null);
	}, [setRoles]);

	// Lấy roles
	useEffect(() => {
		const getRoles = async () => {
			try {
				const res = typeof applyInspection === "function" ? await applyInspection() : [];
				let roles = [];

				if (res && res.length > 0) {
					roles = [...res];
				}

				const { data } = await api.get(`${ROLE_FEATURE}/process/${processId}`);

				let apiRoles = [];
				if (data?.roles && Array.isArray(data.roles)) {
					apiRoles = data.roles;
				}

				const combinedRoles = [...roles, ...apiRoles];
				const uniqueRoles = Array.from(
					new Map(combinedRoles.map((role) => [role.roleCode, role])).values()
				);

				const normalizedRoles = uniqueRoles.map((r) => ({
					...r,
					permissions: r.permissions || [],
				}));

				setRoles(normalizedRoles);
			} catch (error) {
				setRoles([]);
			}
		};
		getRoles();
	}, [processId, applyInspection]);

	// Lấy danh sách features
	useEffect(() => {
		const fetchListFeature = async () => {
			try {
				let targetProcessSelect = processSelect;
				const isMongoId = (val) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);

				if (!targetProcessSelect || isMongoId(targetProcessSelect)) {
					const { data: processData } = await api.get(`${API_ADD_FIELD_BPMN}/${processId}`);
					if (processData && processData.processSelect) {
						targetProcessSelect = processData.processSelect;
					}
				}

				const { data: res } = await api.get(`${API_GET_LIST_FUNCTIONMANAGEMANT}`, {
					params: {
						processID: targetProcessSelect?.trim() ? targetProcessSelect : processId,
						featureType: "list,automatic,custom",
						limit: 1000,
					}
				});
				const allFunctions = res.data.data || [];
				const availableFeatures = allFunctions.filter(fn => !fn.authorizedFunction);
				setFeatures(availableFeatures);
			} catch (error) {
				logger.error(error);
			} finally {
				setLoading(false);
			}
		};
		fetchListFeature();
	}, [processSelect, processId]);

	// Update permission cho một cell cụ thể
	const handleChange = useCallback((roleIndex, featureCode) => {
		setRoles((prev) =>
			prev.map((role, idx) => {
				if (idx !== roleIndex) return role;
				const hasPermission = role.permissions?.includes(featureCode);
				return {
					...role,
					permissions: hasPermission
						? role.permissions.filter((p) => p !== featureCode)
						: [...(role.permissions || []), featureCode],
				};
			})
		);
	}, [setRoles]);

	// Check/Uncheck ALL features cho một ROLE cụ thể (Xử lý cột)
	const handleToggleRoleAllFeatures = useCallback((roleIndex) => {
		// Lấy danh sách tất cả code của feature hiện tại
		const allFeatureCodes = features.map(f => f.code);

		setRoles((prev) => {
			const currentRole = prev[roleIndex];
			// Kiểm tra xem role này đã có full quyền của danh sách features hiện tại chưa
			const hasAll = allFeatureCodes.every(code => currentRole.permissions?.includes(code));

			return prev.map((role, idx) => {
				if (idx !== roleIndex) return role;
				return {
					...role,
					permissions: hasAll
						? role.permissions.filter(p => !allFeatureCodes.includes(p)) // Bỏ tất cả feature trong list này
						: Array.from(new Set([...(role.permissions || []), ...allFeatureCodes])) // Thêm tất cả
				};
			});
		});
	}, [features, setRoles]);

	const handleSave = async () => {
		const dataPayload = {
			processKey: processId,
			roles: roles.map(item => ({
				...item,
				users: item.users.map(u => u._id || u.id)
			}))
		};

		try {
			const { data: checkRes } = await api.get(`${ROLE_FEATURE}/process/${processId}`);

			if (checkRes) {
				await api.patch(`${ROLE_FEATURE}/${processId}`, dataPayload);
				dispatch(getListRoleDetail());
				toast("Cập nhật thành công", "success");
			} else {
				await api.post(`${ROLE_FEATURE}`, dataPayload);
				toast("Thêm mới thành công", "success");
			}
		} catch (error) {
			logger.log("❌ Lỗi khi lưu:", error);
			toast("Có lỗi xảy ra khi lưu", "error");
		}
	};

	// Handlers UI
	const handleToggleRoleClick = useCallback((roleIndex) => () => {
		handleToggleRoleAllFeatures(roleIndex);
	}, [handleToggleRoleAllFeatures]);

	const handleRoleClick = useCallback((role) => () => {
		setOpenDialogSetUser(role);
	}, []);

	const handlePermissionChange = useCallback((roleIndex, featureCode) => () => {
		handleChange(roleIndex, featureCode);
	}, [handleChange]);

	const handleCloseDialogSetUser = useCallback(() => setOpenDialogSetUser(null), []);

	const handleAddUsers = useCallback((userArr) => {
		if (openDialogSetUser) handleAddUsersToRole(openDialogSetUser.roleCode, userArr);
	}, [openDialogSetUser, handleAddUsersToRole]);

	logger.log("roles", roles)
	logger.log("features", features)

	return (
		<StyledPaper viewMode={viewMode}>
			{!viewMode && (
				<>
					<TitleTypography variant="h5" gutterBottom>
						Quản lý phân quyền
					</TitleTypography>
					<StyledDivider />
				</>
			)}

			{loading ? (
				<LoadingContainer>
					<CircularProgress />
				</LoadingContainer>
			) : roles.length === 0 || features.length === 0 ? (
				<EmptyDataTypography>
					Không có dữ liệu.
				</EmptyDataTypography>
			) : (
				<ResponsiveTableContainer>
					<Table size="small" stickyHeader>
						<TableHead>
							<TableRow>
								{/* Ô góc trên cùng bên trái: Tiêu đề cho Hàng (Chức năng) */}
								<HeaderTableCell>
									Chức năng / Vai trò
								</HeaderTableCell>

								{/* Render Các Cột là Vai trò (Roles) */}
								{roles.map((role, roleIndex) => {
									// Kiểm tra xem role này có đủ tất cả feature không để đánh dấu checkbox header
									const allChecked = features.every((f) => role.permissions?.includes(f.code));
									const someChecked = features.some((f) => role.permissions?.includes(f.code));

									return (
										<RoleHeaderCell key={role.roleCode || roleIndex}>
											<RoleHeaderContent>
												{/* Click vào tên Role để mở dialog thêm user */}
												<RoleNameTitle onClick={viewMode ? undefined : handleRoleClick(role)} viewMode={viewMode}>
													{role.name}
												</RoleNameTitle>
												<Checkbox
													size="small"
													checked={allChecked}
													indeterminate={!allChecked && someChecked}
													onChange={handleToggleRoleClick(roleIndex)}
													disabled={viewMode}
												/>
											</RoleHeaderContent>
										</RoleHeaderCell>
									);
								})}
							</TableRow>
						</TableHead>
						<TableBody>
							{/* Render Các Hàng là Chức năng (Features) */}
							{features.map((f) => (
								<TableRow key={f.code} hover>
									{/* Tên chức năng */}
									<FeatureNameCell>
										{f.name}
									</FeatureNameCell>

									{/* Các checkbox tương ứng với từng Role */}
									{roles.map((role, roleIndex) => (
										<CheckboxCell key={`${role.roleCode}-${f.code}`}>
											<Checkbox
												checked={role.permissions?.includes(f.code)}
												onChange={handlePermissionChange(roleIndex, f.code)}
												size="small"
												disabled={viewMode}
											/>
										</CheckboxCell>
									))}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</ResponsiveTableContainer>
			)}

			{!viewMode && (
				<FooterContainer>
					<SaveButton
						onClick={handleSave}
						disabled={roles.length === 0 || features.length === 0}
					>
						Lưu thay đổi
					</SaveButton>
				</FooterContainer>
			)}

			{openDialogSetUser && (
				<DialogAddUser
					data={openDialogSetUser}
					open={Boolean(openDialogSetUser)}
					handleClose={handleCloseDialogSetUser}
					onClose={handleCloseDialogSetUser}
					roles={roles}
					onAddUsers={handleAddUsers}
				/>)
			}
		</StyledPaper>
	);
};

export default withSharedComponents(Roles);