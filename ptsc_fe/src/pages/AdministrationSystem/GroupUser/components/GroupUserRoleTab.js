import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
	Box,
	Grid,
	RadioGroup,
	FormControlLabel,
	Radio,
	FormControl,
	styled,

	useTheme,
	useMediaQuery,
	Accordion,

	AccordionDetails,
	Tooltip,
	IconButton,
} from "@mui/material";
import {  RemoveRedEyeOutlined } from "@mui/icons-material";
import CustomInput from "@components/CustomInput/CustomInput";
import { useForm } from "react-hook-form";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import {
	getListRole,
	getListRoleFeature,
	updateRoleFeature,
} from "@redux/slices/managementUsersSlice";
import CustomTable from "@components/CustomTable/CustomTable";
import { useToast } from "@components/common/ToastProvider";
import { getDataDetailroles } from "@redux/slices/AdministrationSystem/rolesSlice";
import ViewTemplateDialog from "@pages/AdministrationSystem/RoleManagement/components/ViewTemplateDialog";
import DeleteTemplateDialog from "./DeleteTemplateDialog";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import Roles from "@pages/BPMN/Component/Roles";
import {
	updateGroupUser,
	getDataDetailGroupUsers,
} from "@redux/slices/AdministrationSystem/groupUserSlice";
import { ScrollTableContainer } from "@styles/Common.styles";

// Styled Components
const FormCard = styled(Box)(() => ({
	backgroundColor: "#ffffff",
	borderRadius: "12px",
	padding: '20px',
	boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.04)",
	border: "1px solid #e2e8f0",
	marginBottom: 0,
	width: "100%",
	height: "100%",
	display: "flex",
	flexDirection: "column",
	minHeight: 0,
	boxSizing: "border-box",
}));


const RoleTypeFormControl = styled(FormControl)(({ theme }) => ({
	border: "none",
	[theme.breakpoints.down("md")]: {
		marginLeft: 0,
	},
}));

const ResponsiveRadioGroup = styled(RadioGroup)(() => ({
	display: "flex",
	flexDirection: "row",
	alignItems: "center",
	gap: "16px",
}));

const FixedRoleLabel = styled(FormControlLabel)(({ theme }) => ({
	marginRight: theme.spacing(3),
}));

const TableWrapper = styled(ScrollTableContainer)(({ theme }) => ({
	flex: 1,
	display: "flex",
	flexDirection: "column",
	overflow: "visible",
	height: "100%",
	minHeight: 0,
	"& .MuiTable-root": {
		minWidth: 4500,
		"& .MuiTableCell-root": {
			whiteSpace: "nowrap",
			padding: "0px 10px",
			fontSize: theme.typography.pxToRem(13),
			height: theme.layout?.dynamicTable?.rowHeight || "55px",
			"tbody tr:hover &": {
				backgroundColor: `${theme.palette.action.hover} !important`,
			},
		},
	},
	"& .MuiTableContainer-root": {
		maxWidth: "100%",
	},
}));

const MoreSearchContainer = styled(Box)({
	width: "300px",
});

const StyledAccordion = styled(Accordion)(({ theme }) => ({
	boxShadow: "none",
	border: "1px solid #e0e0e0",
	borderRadius: "8px !important",
	marginBottom: theme.spacing(2),
	width: "100%",
	"&:before": {
		display: "none",
	},
	"&.Mui-expanded": {
		margin: `0 0 ${theme.spacing(2)} 0`,
	},
}));

const StyledAccordionDetails = styled(AccordionDetails)(({ theme }) => ({
	padding: theme.spacing(2),
	borderTop: "1px solid #e0e0e0",
}));



const PrimaryIconButton = styled(IconButton)(({ theme }) => ({
	color: theme.palette.primary.main,
}));


// Configuration Constants
const permissionLabels = {
	add: "Thêm mới",
	edit: "Chỉnh sửa",
	view: "Xem",
	delete: "Xoá",
};

const ClickableCell = ({ processKey, label, customStyle, onClick }) => {
	const handleClick = useCallback(() => {
		onClick(processKey);
	}, [processKey, onClick]);

	return (
		<span style={customStyle} onClick={handleClick}>
			{label}
		</span>
	);
};

const filtersStatic = [
	{ name: "Mã vai trò", code: "code" },
	{ name: "Tên vai trò", code: "name" },
];

const filtersDynamic = [
	{ name: "Mã Quy trình", code: "processKey" },
	{ name: "Tên Quy trình", code: "processKeyName" },
];

const GroupUserRoleTab = ({
	isView = false,
	roleType,
	setRoleType,
	selectedFixedRole,
	setSelectedFixedRole,
	selectedDynamicRole,
	setSelectedDynamicRole,
	detailGroupUsers,
	groupId,
	onDynamicDataLoaded,
}) => {
	// logger.log("detailGroupUsers", detailGroupUsers)
	const dispatch = useDispatch();
	const toast = useToast();
	const theme = useTheme();
	const isSmall = useMediaQuery(theme.breakpoints.down("md"));
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

	const { sideBarMenu } = useSelector((state) => state.menu);
	const { listRoleFeature } = useSelector((state) => state.users);

	// Local States
	const [refreshTrigger, setRefreshTrigger] = useState(0);
	const [selectedFunction, setSelectedFunction] = useState("");
	const [menuList, setMenuList] = useState([]);
	const [isViewRoleDialogOpen, setIsViewRoleDialogOpen] = useState(false);
	const { control: viewControl, reset: viewReset } = useForm();
	const [openDialogs, setOpenDialogs] = useState({ delete: false });

	// States for deleting role in detail view mode
	const [roleToDelete, setRoleToDelete] = useState(null);
	const [selectedRoleIds, setSelectedRoleIds] = useState([]);

	// State cho Dialog xem phân quyền quy trình
	const [selectedProcessKey, setSelectedProcessKey] = useState(null);
	const [isProcessRolesDialogOpen, setIsProcessRolesDialogOpen] = useState(false);

	const handleOpenProcessRolesDialog = useCallback((processKey) => {
		logger.log("processKey", processKey)
		if (processKey) {
			setSelectedProcessKey(processKey);
			setIsProcessRolesDialogOpen(true);
		}
	}, []);

	const handleCloseProcessRolesDialog = useCallback(() => {
		setIsProcessRolesDialogOpen(false);
		setSelectedProcessKey(null);
	}, []);

	useEffect(() => {
		setMenuList(sideBarMenu || []);
	}, [sideBarMenu]);

	const handleRoleTypeChange = useCallback((e) => {
		setRoleType(e.target.value);
	}, [setRoleType]);

	const handleSelectedFunctionChange = useCallback((newValue) => {
		setSelectedFunction(newValue);
	}, []);

	// API logic for selecting roles (Add/Edit mode)
	const fetchDataFromApi = useCallback(
		async ({ page, limit, query, code, sort }) => {
			if (!page || !limit) {
				return { data: [], total: 0 };
			}
			try {
				const params = { page, limit };
				if (selectedFunction) {
					params["roles.functionName"] = selectedFunction;
				}
				if (query && code && code.length > 0) {
					if (Array.isArray(code)) {
						code.forEach((field) => { params[field] = query; });
					} else {
						params[code] = query;
					}
				}
				if (sort) params.sort = sort;

				const response = await dispatch(getListRole(params)).unwrap();
				return {
					data: response.data || [],
					total: response.total || response.length || 0,
				};
			} catch (error) {
				toast("Lỗi hệ thống", "warning");
				return { data: [], total: 0 };
			}
		},
		[dispatch, toast, selectedFunction]
	);

	const fetchDataFromApiDong = useCallback(
		async ({ page, limit, query, code, sort }) => {
			if (!page || !limit) {
				return { data: [], total: 0 };
			}
			try {
				const params = { page, limit, sort };
				if (query && code && code.length > 0) {
					if (Array.isArray(code)) {
						code.forEach((field) => { params[field] = query; });
					} else {
						params[code] = query;
					}
				}
				const response = await dispatch(getListRoleFeature(params)).unwrap();
				const rawData = response.data || response || [];

				const flattenedData = [];
				rawData.forEach((item) => {
					if (item.roles && item.roles.length > 0) {
						item.roles.forEach((role, index) => {
							flattenedData.push({
								_id: `${item._id}_${role.roleCode || index}`,
								processKey: item.processKey,
								processKeyName: item.processKeyName,
								name: role.name,
								roleCode: role.roleCode,
								originalId: item._id,
								roleId: role._id,
							});
						});
					} else {
						flattenedData.push({
							_id: `${item._id}_no_role`,
							processKey: item.processKey,
							processKeyName: item.processKeyName,
							name: "(Chưa có vai trò)",
							roleCode: "",
							originalId: item._id,
							roleId: null,
						});
					}
				});

				if (onDynamicDataLoaded) {
					onDynamicDataLoaded(flattenedData);
				}

				return {
					data: flattenedData,
					total: response.total || response.length || flattenedData.length,
				};
			} catch (error) {
				toast("Lỗi hệ thống", "warning");
				return { data: [], total: 0 };
			}
		},
		[dispatch, toast, onDynamicDataLoaded]
	);

	// API logic for showing assigned roles (Detail view mode)
	const fetchDataRolesFromApi = useCallback(
		async ({ page, limit, query, code, sort }) => {
			if (!page || !limit) {
				return { data: [], total: 0 };
			}
			try {
				const selectedRoles = detailGroupUsers?.roles || [];
				if (selectedRoles.length === 0) {
					return { data: [], total: 0 };
				}

				if (roleType === "fixed") {
					let allRolesParams = { page: 1, limit: 1000, sort };
					if (query && code && code.length > 0) {
						if (Array.isArray(code)) {
							code.forEach((field) => { allRolesParams[field] = query; });
						} else {
							allRolesParams[code] = query;
						}
					}
					if (selectedFunction) {
						allRolesParams["roles.functionName"] = selectedFunction;
					}

					const response = await dispatch(getListRole(allRolesParams)).unwrap();
					const allRoles = response.data || [];
					const filteredRoles = allRoles.filter((role) =>
						selectedRoles.includes(role._id || role.id)
					);

					const startIndex = (page - 1) * limit;
					const endIndex = startIndex + limit;
					return {
						data: filteredRoles.slice(startIndex, endIndex),
						total: filteredRoles.length,
					};
				} else {
					const response = await dispatch(
						getListRoleFeature({ page: 1, limit: 1000, sort })
					).unwrap();
					const rawData = response.data || response || [];
					const flattenedData = rawData.flatMap((item) =>
						(item.roles || []).map((role) => ({
							...role,
							id: `${role.id}_${item.name}`,
							_id: `${item._id}_${role.name}`,
							processKey: item.processKey,
							processKeyName: item.processKeyName,
							originalId: item._id || item.id,
							roleId: role._id || role.id,
						}))
					);

					let filteredData = flattenedData.filter((item) =>
						selectedRoles.includes(item._id || item.id)
					);

					if (query && code && code.length > 0) {
						filteredData = filteredData.filter((item) => {
							const searchFields = Array.isArray(code) ? code : [code];
							return searchFields.some((field) =>
								item[field]?.toString().toLowerCase().includes(query.toLowerCase())
							);
						});
					}

					const startIndex = (page - 1) * limit;
					const endIndex = startIndex + limit;
					// logger.log("filteredData", filteredData)
					return {
						data: filteredData.slice(startIndex, endIndex),
						total: filteredData.length,
					};
				}
			} catch (error) {
				logger.error("Lỗi khi lấy roles:", error);
				toast("Lỗi khi lấy dữ liệu vai trò!", "warning");
				return { data: [], total: 0 };
			}
		},
		[dispatch, toast, roleType, detailGroupUsers?.roles, selectedFunction]
	);

	const handleViewRole = useCallback(async (roleId) => {
		try {
			const result = await dispatch(getDataDetailroles(roleId)).unwrap();
			if (result.data) {
				viewReset(result.data);
				setIsViewRoleDialogOpen(true);
			} else {
				toast("Không tìm thấy dữ liệu chi tiết vai trò", "warning");
			}
		} catch (error) {
			logger.error("Error fetching role details:", error);
			toast("Lỗi khi tải chi tiết vai trò", "error");
		}
	}, [dispatch, viewReset, toast]);

	const handleCloseViewRoleDialog = useCallback(() => {
		setIsViewRoleDialogOpen(false);
	}, []);

	// Role Deletion in View Mode (Detail view page)
	const handleDeleteRoleByIds = useCallback((ids) => {
		setSelectedRoleIds(ids);
		setRoleToDelete(null);
		setOpenDialogs((prev) => ({ ...prev, delete: true }));
	}, []);

	const handleDeleteRoleByRow = useCallback((row) => {
		setSelectedRoleIds([]);
		setRoleToDelete(row);
		setOpenDialogs((prev) => ({ ...prev, delete: true }));
	}, []);

	const handleCloseDeleteDialog = useCallback(() => {
		setOpenDialogs((prev) => ({ ...prev, delete: false }));
		setRoleToDelete(null);
		setSelectedRoleIds([]);
	}, []);

	const handleConfirmDelete = async () => {
		if (isView) {
			let idsToDelete;
			let successMessage = "";

			if (roleToDelete) {
				idsToDelete = [roleToDelete._id];
				successMessage = "Xóa vai trò khỏi nhóm thành công!";
			} else if (selectedRoleIds && selectedRoleIds.length > 0) {
				idsToDelete = selectedRoleIds;
				successMessage = `Đã xóa ${selectedRoleIds.length} vai trò khỏi nhóm thành công!`;
			} else {
				toast("Không có vai trò nào được chọn để xóa.", "warning");
				return;
			}

			try {
				const currentRoles = detailGroupUsers?.roles || [];
				const updatedRoles = currentRoles.filter(
					(roleId) => !idsToDelete.includes(roleId)
				);

				const payload = { roles: updatedRoles };
				await dispatch(updateGroupUser({ groupId: groupId, payload })).unwrap();

				toast(successMessage, "success");
				handleCloseDeleteDialog();
				setRefreshTrigger((prev) => prev + 1);
				dispatch(getDataDetailGroupUsers(groupId));
			} catch (error) {
				toast("Lỗi khi xóa vai trò khỏi nhóm!", "error");
			}
		} else {
			const allRoleFeatures = listRoleFeature?.data || [];
			if (allRoleFeatures.length === 0) {
				toast("Không có dữ liệu vai trò động để thực hiện xóa.", "error");
				return;
			}

			let updatePromises = [];
			let successMessage = "";

			if (roleToDelete) {
				const { processKey, roleId } = roleToDelete;
				const roleFeatureDoc = allRoleFeatures.find(
					(rf) => rf.processKey === processKey
				);
				if (!roleFeatureDoc) {
					toast("Không tìm thấy quy trình để xóa vai trò.", "error");
					return;
				}
				const updatedRoles = roleFeatureDoc.roles.filter(
					(role) => role._id !== roleId
				);
				updatePromises.push(
					dispatch(
						updateRoleFeature({ processKey, updateData: { roles: updatedRoles } })
					).unwrap()
				);
				successMessage = "Xóa vai trò động thành công!";
			} else if (selectedRoleIds && selectedRoleIds.length > 0) {
				const rolesGroupedByProcess = selectedRoleIds.reduce((acc, compositeId) => {
					const docId = compositeId.substring(0, compositeId.lastIndexOf("_"));
					const roleId = compositeId.substring(compositeId.lastIndexOf("_") + 1);
					const roleFeatureDoc = allRoleFeatures.find((doc) => doc._id === docId);
					if (roleFeatureDoc) {
						const processKey = roleFeatureDoc.processKey;
						if (!acc[processKey]) {
							acc[processKey] = {
								doc: roleFeatureDoc,
								roleIdsToDelete: new Set(),
							};
						}
						acc[processKey].roleIdsToDelete.add(roleId);
					}
					return acc;
				}, {});

				updatePromises = Object.entries(rolesGroupedByProcess).map(
					([processKey, { doc, roleIdsToDelete }]) => {
						const updatedRoles = doc.roles.filter(
							(role) => !roleIdsToDelete.has(role._id)
						);
						return dispatch(
							updateRoleFeature({
								processKey,
								updateData: { roles: updatedRoles },
							})
						).unwrap();
					}
				);
				successMessage = `Đã xóa ${selectedRoleIds.length} vai trò động thành công!`;
			} else {
				return;
			}

			try {
				await Promise.all(updatePromises);
				toast(successMessage, "success");
				handleCloseDeleteDialog();
				if (setSelectedDynamicRole) {
					setSelectedDynamicRole([]);
				}
				setRefreshTrigger((prev) => prev + 1);
				dispatch(getListRoleFeature());
			} catch (error) {
				toast("Lỗi khi xóa vai trò động.", "error");
			}
		}
	};

	// Column configurations for select mode (Add/Edit)
	const handleViewRoleClick = useCallback((row) => (e) => {
		e.stopPropagation();
		handleViewRole(row._id || row.id);
	}, [handleViewRole]);

	const columnsStaticWithAction = useMemo(() => [
		{ name: "Mã vai trò", row: "code", width: "100px",
			accessor: (row) => (
				<ClickableCell 
					processKey={row.processKey} 
					label={row.code} 
					customStyle={{ cursor: "pointer" }} 
					onClick={handleOpenProcessRolesDialog}
				/>
			)
		 },
		{ name: "Tên vai trò", row: "name", width: "300px",
			accessor: (row) => (
				<ClickableCell 
					processKey={row.processKey} 
					label={row.name} 
					customStyle={{ cursor: "pointer" }} 
					onClick={handleOpenProcessRolesDialog}
				/>
			)
		 },
		{
			name: "Tên chức năng",
			row: "roles.functionName",
			// accessor: (row) => row?.roles?.[0]?.functionName?.name || "",
			width: "300px",
			accessor: (row) => (
				<ClickableCell 
					processKey={row.processKey} 
					label={row?.roles?.[0]?.functionName?.name || ""} 
					customStyle={{ cursor: "pointer" }} 
					onClick={handleOpenProcessRolesDialog}
				/>
			)
		},
		{
			name: "Hành động",
			width: "100px",
			accessor: (row) => (
				<Tooltip title="Xem chi tiết vai trò">
					<PrimaryIconButton onClick={handleViewRoleClick(row)}>
						<RemoveRedEyeOutlined />
					</PrimaryIconButton>
				</Tooltip>
			),
		},
	], [handleOpenProcessRolesDialog, handleViewRoleClick]);

	const columnsRoleViewLocal = useMemo(() => [
		{ name: "Mã vai trò", row: "code", width: "150px" },
		{ name: "Tên vai trò", row: "name", width: "300px" },
		{
			name: "Tên chức năng",
			row: "functionNameDisplay",
			width: "300px",
			accessor: (row) =>
				Array.isArray(row.roles)
					? row.roles.map((r) => r.functionName?.name).filter(Boolean).join(", ")
					: "",
		},
		{
			name: "Quyền",
			row: "permissionsDisplay",
			width: "300px",
			accessor: (row) =>
				Array.isArray(row.roles) &&
					row.roles.length > 0 &&
					Array.isArray(row.roles[0].permissions)
					? row.roles[0].permissions.map((p) => permissionLabels[p] || p).join(", ")
					: "",
		},
	], []);

	const columnsDynamicViewLocal = useMemo(() => [
		{ 
			name: "Quy trình", 
			row: "processKey", 
			width: "150px",
			accessor: (row) => (
				<ClickableCell 
					processKey={row.processKey} 
					label={row.processKey} 
					customStyle={{ cursor: "pointer" }} 
					onClick={handleOpenProcessRolesDialog}
				/>
			)
		},
		{ 
			name: "Tên vai trò", 
			row: "name", 
			width: "300px",
			accessor: (row) => (
				<ClickableCell 
					processKey={row.processKey} 
					label={row.name} 
					customStyle={{ cursor: "pointer" }} 
					onClick={handleOpenProcessRolesDialog}
				/>
			)
		},
		{ 
			name: "Tên chức năng", 
			row: "processKeyName", 
			width: "300px",
			accessor: (row) => (
				<ClickableCell 
					processKey={row.processKey} 
					label={row.processKeyName || row.processKey} 
					customStyle={{ cursor: "pointer" }} 
					onClick={handleOpenProcessRolesDialog}
				/>
			)
		},
		{
			name: "Quyền",
			row: "roles",
			width: "400px",
			accessor: (row) =>
				Array.isArray(row.permissions)
					? row.permissions.map((p) => permissionLabels[p] || p).join(", ")
					: "N/A",
		},
	], [handleOpenProcessRolesDialog]);


	const tableContent = useMemo(() => (
		<TableWrapper isSmall={isSmall}>
			{roleType === "fixed" ? (
				<CustomTable
					codeModule={isView ? "UserGroupRoleDetails_FixedRole" : "FixedRole"}
					key={isView ? "fixed-view" : "add-fixed-roles"}
					disableSynchronize
					hideBulkDeleteButton
					fetchData={isView ? fetchDataRolesFromApi : fetchDataFromApi}
					disableMore
					filter={filtersStatic}
					columns={isView ? columnsRoleViewLocal : columnsStaticWithAction}
					disableAdd
					disableDelete={!isView}
					disableDeletePQ
					disableEdit
					disableCheckbox={isView}
					onView={isView ? undefined : handleViewRole}
					onDelete={isView ? handleDeleteRoleByIds : undefined}
					onRowDelete={isView ? handleDeleteRoleByRow : undefined}
					refreshTrigger={refreshTrigger}
					selection={isView ? (detailGroupUsers?.roles || []) : selectedFixedRole}
					onSelectionChange={isView ? undefined : setSelectedFixedRole}
					customMaxHeight={100}
					moreSearch={() => (
						<MoreSearchContainer>
							<CustomInput
								select
								size="small"
								label="Tên chức năng"
								placeholder="Chọn chức năng"
								options={menuList}
								value={selectedFunction}
								onChange={handleSelectedFunctionChange}
								customLabel="name"
								customValue="_id"
								hasAll
								transparentBackground={!isView}
							/>
						</MoreSearchContainer>
					)}
					uiPreset="unitModern"
					actionIconSize="medium"
					useModernActionColors
					rowsPerPageOptions={isView ? [25, 50, 100, 500] : [25, 50, 100]}
					lockRowsPerPageOptions={isView}
					filterPopupAlignLeft
					// fillHeight
					styledMaxHeight={isView ? 300 : 330}
					encodeHtml
				/>
			) : (
				<CustomTable
					codeModule={isView ? "UserGroupRoleDetails_DynamicRole" : "DynamicRole"}
					key={isView ? `dynamic-view-${refreshTrigger}` : "add-dynamic-roles"}
					disableSynchronize
					hideBulkDeleteButton
					fetchData={isView ? fetchDataRolesFromApi : fetchDataFromApiDong}
					disableMore
					filter={filtersDynamic}
					columns={columnsDynamicViewLocal}
					// columns={isView ? columnsDynamicViewLocal : undefined}
					disableAdd
					disableDetail
					disableDeletePQ
					disableEdit
					disableCheckbox={isView}
					onDelete={handleDeleteRoleByIds}
					onRowDelete={handleDeleteRoleByRow}
					refreshTrigger={refreshTrigger}
					selection={isView ? (detailGroupUsers?.roles || []) : selectedDynamicRole}
					selectionReturns={isView ? undefined : "object"}
					onSelectionChange={isView ? undefined : setSelectedDynamicRole}
					uiPreset="unitModern"
					actionIconSize="medium"
					useModernActionColors
					rowsPerPageOptions={isView ? [25, 50, 100, 500] : [25, 50, 100]}
					lockRowsPerPageOptions={isView}
					encodeHtml
					filterPopupAlignLeft
					styledMaxHeight={isView ? 300 : 330}
				/>
			)}
		</TableWrapper>
	), [
		isSmall,
		roleType,
		isView,
		fetchDataRolesFromApi,
		fetchDataFromApi,
		columnsRoleViewLocal,
		columnsStaticWithAction,
		handleViewRole,
		handleDeleteRoleByIds,
		handleDeleteRoleByRow,
		refreshTrigger,
		detailGroupUsers?.roles,
		selectedFixedRole,
		setSelectedFixedRole,
		menuList,
		selectedFunction,
		handleSelectedFunctionChange,
		fetchDataFromApiDong,
		columnsDynamicViewLocal,
		selectedDynamicRole,
		setSelectedDynamicRole,
	]);

	return (
		<>
			{isMobile ? (
				<StyledAccordion expanded>

					<StyledAccordionDetails>
						<Grid container spacing={2}>
							{/* Only show radio selection if not in view mode */}
							{!isView && (
								<Grid item xs={12}>
									<span style={{ fontSize: "0.875rem", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "8px" }}>
										CHỌN VAI TRÒ
									</span>
									<RoleTypeFormControl component="fieldset">
										<ResponsiveRadioGroup value={roleType} onChange={handleRoleTypeChange}>
											<FixedRoleLabel value="fixed" control={<Radio size="small" />} label="Vai trò cố định" />
											<FormControlLabel value="dynamic" control={<Radio size="small" />} label="Vai trò động" />
										</ResponsiveRadioGroup>
									</RoleTypeFormControl>
								</Grid>
							)}
							<Grid item xs={12}>
								{tableContent}
							</Grid>
						</Grid>
					</StyledAccordionDetails>
				</StyledAccordion>
			) : (
				<FormCard>

					<div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
						{!isView && (
							<div style={{  display: "flex", alignItems: "center", gap: "16px" }}>
								<span style={{ fontSize: "0.875rem", fontWeight: "bold", color: "#475569" }}>
									CHỌN VAI TRÒ
								</span>
								<RoleTypeFormControl component="fieldset">
									<ResponsiveRadioGroup value={roleType} onChange={handleRoleTypeChange}>
										<FixedRoleLabel value="fixed" control={<Radio size="small" />} label="Vai trò cố định" />
										<FormControlLabel value="dynamic" control={<Radio size="small" />} label="Vai trò động" />
									</ResponsiveRadioGroup>
								</RoleTypeFormControl>
							</div>
						)}
						<div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
							{tableContent}
						</div>
					</div>
				</FormCard>
			)}

			{isViewRoleDialogOpen && (
				<ViewTemplateDialog
					open={isViewRoleDialogOpen}
					onClose={handleCloseViewRoleDialog}
					control={viewControl}
				/>
			)}

			{isProcessRolesDialogOpen && (
				<CustomDialog
					title="Chi tiết phân quyền quy trình"
					open={isProcessRolesDialogOpen}
					onClose={handleCloseProcessRolesDialog}
					type="view"
					size="lg"
					disableSave
				>
					<Roles 
						processId={selectedProcessKey} 
						processSelect={selectedProcessKey} 
						viewMode
					/>
				</CustomDialog>
			)}

			<DeleteTemplateDialog
				open={openDialogs.delete}
				onClose={handleCloseDeleteDialog}
				onSave={handleConfirmDelete}
			/>
		</>
	);
};

GroupUserRoleTab.propTypes = {
	isView: PropTypes.bool,
	roleType: PropTypes.string.isRequired,
	setRoleType: PropTypes.func.isRequired,
	selectedFixedRole: PropTypes.array,
	setSelectedFixedRole: PropTypes.func,
	selectedDynamicRole: PropTypes.array,
	setSelectedDynamicRole: PropTypes.func,
	detailGroupUsers: PropTypes.object,
	groupId: PropTypes.string,
	onDynamicDataLoaded: PropTypes.func,
};

GroupUserRoleTab.defaultProps = {
	isView: false,
	selectedFixedRole: [],
	selectedDynamicRole: [],
	detailGroupUsers: {},
};

export default GroupUserRoleTab;
