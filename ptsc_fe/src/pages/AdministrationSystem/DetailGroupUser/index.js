import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useToast } from "@components/common/ToastProvider";
import {
	Tooltip,
	useMediaQuery,
	useTheme,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { useLocation } from "react-router-dom";
import CustomTable from "@components/CustomTable/CustomTable";

import {
	columns,
	columnsUser,
	filters,
	filtersUser,
	TABS,
} from "./constantsDistrict";
import {
	// addGroupUser,
	deleteUserbyGroup,
	getDataDetailGroupUsers,
	getDataListGroupUnit,
	getDataListUserByGroup,
	updateGroupUserOrganizationUnit,
	addOrganizationUnitToGroup,
	updateGroupUser,
} from "@redux/slices/AdministrationSystem/groupUserSlice";
import DeleteDialog from "./components/DeleteDialog";
import EditDialog from "./components/EditDialog";
import AddDialog from "./components/AddDialog";
import {
	addUsersToGroup,
	getDataListUnit,
	getListRoleFeature,
} from "@redux/slices/managementUsersSlice";
import AddManagerGroupUserDialog from "@pages/AdministrationSystem/GroupUser/components/AddManagerGroupUserDialog";
import { PersonAddOutlined } from "@mui/icons-material";
import ManagerUsers from "@pages/ManagerUsers";
import { StyledBox, StyledButtonUser, StyledPaper, StyledTabContentBox, FlexColumnGrow } from "@styles/DetailGroupUser.styles";

import withSharedComponents from "@components/WrapperComponent";
import GroupUserInformationTab from "@pages/AdministrationSystem/GroupUser/components/GroupUserInformationTab";
import GroupUserRoleTab from "@pages/AdministrationSystem/GroupUser/components/GroupUserRoleTab";
// import PermissionDetailTab from "./components/PermissionDetailTab";
import ActionPermissionDetailTab from "./components/ActionPermissionDetailTab";

const DetailGroupUser = ({ sharedComponents, open, onClose, id: propId }) => {
	const { CustomTabsWithBadge, BaseSwipper } = sharedComponents;
	const dispatch = useDispatch();
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down('md'));

	// States cho mobile collapsible sections
	const { detailGroupUsers, listGroupUnit } = useSelector(
		(state) => state.groupUsers
	);
	// const { listUnit, listRoleFeature } = useSelector((state) => state.users);
	const { listUnit } = useSelector((state) => state.users);
	const { sideBarMenu } = useSelector((state) => state.menu);
	const toast = useToast();
	const location = useLocation();
	const { id } = location.state || {};
	const [openDialogs, setOpenDialogs] = useState({
		view: false,
		edit: false,
		add: false,
		delete: false,
		deleteRole: false, // Thêm dialog xóa cho vai trò
	});
	const [isLoading, setIsLoading] = useState(false);
	const [viewUserId, setViewUserId] = useState(null);
	const [viewUserMode, setViewUserMode] = useState("view");
	const [selectedIds, setSelectedIds] = useState();

	const [typeDelete, setTypeDelete] = useState("");
	const [roleType, setRoleType] = useState("fixed");

	// States cho chức năng xóa vai trò động
	const [selectedRoleIds, setSelectedRoleIds] = useState([]);
	const [roleToDelete, setRoleToDelete] = useState(null);

	// Ưu tiên id từ prop (khi là dialog), sau đó mới lấy từ URL
	const idFromUrl = location.pathname.split("/").pop();
	const idUpdate = propId || idFromUrl;

	const [activeTab, setActiveTab] = useState( // eslint-disable-line
		() => Math.min(Number(sessionStorage.getItem("activeTab")) || 0, TABS.length - 1)
	);

	useEffect(() => {
		if (open && idUpdate) { // idUpdate is propId || idFromUrl
			dispatch(getDataDetailGroupUsers(idUpdate));
			dispatch(getDataListUnit({}));
			dispatch(getListRoleFeature()); // Thêm để load data cho vai trò động
		}
	}, [idUpdate, dispatch, open, propId, sideBarMenu]); // Add propId to dependencies

	useEffect(() => {
		if (detailGroupUsers?.roleType) {
			setRoleType(detailGroupUsers.roleType);
		}
	}, [detailGroupUsers]);

	const handleChange = (event, newValue) => {
		setActiveTab(newValue);
	};

	// const fetchDataRolesFromApi = useCallback(
	// 	async ({ page, limit, query, code, sort }) => {
	// 		if (!page || !limit) {
	// 			return { data: [], total: 0 };
	// 		}
	// 		// logger.log("roleType", roleType);
	// 		try {
	// 			const selectedRoles = detailGroupUsers?.roles || [];
	// 			// logger.log("Selected Roles", selectedRoles);

	// 			if (selectedRoles.length === 0) {
	// 				return { data: [], total: 0 };
	// 			}

	// 			if (roleType === "fixed") {
	// 				// logger.log("roleType === Cố định")
	// 				// Lấy tất cả vai trò trước
	// 				let allRolesParams = {
	// 					page: 1,
	// 					limit: 1000,
	// 					sort,
	// 				};

	// 				// Thêm điều kiện tìm kiếm nếu có
	// 				if (query && code && code.length > 0) {
	// 					if (Array.isArray(code)) {
	// 						code.forEach((field) => {
	// 							allRolesParams[field] = query;
	// 						});
	// 					} else {
	// 						allRolesParams[code] = query;
	// 					}
	// 				}

	// 				if (selectedFunction) {
	// 					allRolesParams["roles.functionName"] = selectedFunction;
	// 				}

	// 				const response = await dispatch(getListRole(allRolesParams)).unwrap();
	// 				// logger.log("Raw data cố định", response);
	// 				const allRoles = response.data || [];

	// 				const filteredRoles = allRoles.filter((role) =>
	// 					selectedRoles.includes(role._id || role.id)
	// 				);
	// 				// logger.log("Dữ liệu sau khi filter cố định", filteredRoles);
	// 				const startIndex = (page - 1) * limit;
	// 				const endIndex = startIndex + limit;
	// 				const paginatedData = filteredRoles.slice(startIndex, endIndex);
	// 				// logger.log("Data cố định", paginatedData)
	// 				return {
	// 					data: paginatedData,
	// 					total: filteredRoles.length,
	// 				};
	// 			} else {
	// 				// logger.log("roleType === Động")
	// 				// Xử lý tương tự cho vai trò động
	// 				const response = await dispatch(
	// 					getListRoleFeature({ page: 1, limit: 1000, sort })
	// 				).unwrap();
	// 				const rawData = response.data || response || [];
	// 				// logger.log("Raw data động", rawData);
	// 				const flattenedData = rawData.flatMap((item) =>
	// 					(item.roles || []).map((role) => ({
	// 						...role,
	// 						id: `${role.id}_${item.name}`,
	// 						_id: `${item._id}_${role.name}`,
	// 						// id: `${role.id}_${item.id}`,
	// 						// _id: `${item._id}_${role._id}`,
	// 						processKey: item.processKey,
	// 						processKeyName: item.processKeyName,
	// 						originalId: item._id || item.id, // ID gốc của role để xử lý xóa
	// 						roleId: role._id || role.id, // ID gốc của role để xử lý xóa
	// 					}))
	// 				);
	// 				// logger.log("Dữ liệu sau khi flatten động", flattenedData);
	// 				// Filter và search
	// 				let filteredData = flattenedData.filter((item) =>
	// 					selectedRoles.includes(item._id || item.id)
	// 				);
	// 				// logger.log("selectedRoles", selectedRoles);
	// 				// logger.log("Dữ liệu sau khi filter động", filteredData);

	// 				if (query && code && code.length > 0) {
	// 					filteredData = filteredData.filter((item) => {
	// 						const searchFields = Array.isArray(code) ? code : [code];
	// 						return searchFields.some((field) =>
	// 							item[field]
	// 								?.toString()
	// 								.toLowerCase()
	// 								.includes(query.toLowerCase())
	// 						);
	// 					});
	// 				}

	// 				// Phân trang thủ công
	// 				const startIndex = (page - 1) * limit;
	// 				const endIndex = startIndex + limit;
	// 				const paginatedData = filteredData.slice(startIndex, endIndex);
	// 				// logger.log("Data động", paginatedData)
	// 				return {
	// 					data: paginatedData,
	// 					total: filteredData.length,
	// 				};
	// 			}
	// 		} catch (error) {
	// 			const errorMessage = error?.response?.data?.message || error?.message || "Lỗi khi lấy dữ liệu vai trò!";
	// 			logger.error("Lỗi khi lấy roles:", error);
	// 			toast(errorMessage, "warning");
	// 			return { data: [], total: 0 };
	// 		}
	// 	},
	// 	[
	// 		dispatch,
	// 		toast,
	// 		roleType,
	// 		// refreshTrigger,
	// 		detailGroupUsers?.roles,
	// 		selectedFunction,
	// 	]
	// );

	const fetchDataFromApi = useCallback(
		async ({ page, limit, query, code, sort }) => {
			if (!page || !limit || !idUpdate) {
				return { data: [], total: 0 };
			}
			try {
				let params = { id: idUpdate, page, limit };
				if (query && query !== "") params.query = query;
				if (code && code.length > 0) params.code = code;
				if (sort) params.sort = sort;
				const response = await dispatch(
					getDataListUserByGroup(params)
				).unwrap();
				return {
					data: response.data || [],
					total: response.total || response.length || 0,
				};
			} catch (error) {
				const errorMessage = error?.response?.data?.message || error?.message || "Lỗi khi lấy dữ liệu người dùng!";
				toast(errorMessage, "warning");
				return { data: [], total: 0 };
			}
		},
		[dispatch, idUpdate, toast]
	);

	const fetchDataGroupFromApi = useCallback(
		async ({ page, limit, query, code, sort }) => {
			if (!page || !limit || !idUpdate) {
				return { data: [], total: 0 };
			}
			try {
				let params = { id: idUpdate, page, limit };
				if (query && query !== "") params.query = query;
				if (code && code.length > 0) params.code = code;
				if (sort) params.sort = sort;
				const response = await dispatch(getDataListGroupUnit(params)).unwrap();
				return {
					data: response.data || [],
					total: response.total || response.length || 0,
				};
			} catch (error) {
				const errorMessage = error?.response?.data?.message || error?.message || "Lỗi khi lấy dữ liệu nhóm!";
				toast(errorMessage, "warning");
				return { data: [], total: 0 };
			}
		},
		[dispatch, idUpdate, toast]
	);

	const handleCloseDialog = useCallback((dialogKey) => {
		setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
		// Reset states khi đóng dialog
		if (dialogKey === "deleteRole") {
			setRoleToDelete(null);
			setSelectedRoleIds([]);
		}
	}, [setOpenDialogs]);

	const handleDelete = useCallback(async () => {
		setIsLoading(true);
		if (!selectedIds?.length) {
			toast("Vui lòng chọn ít nhất một dòng để xóa!", "warning");
			return;
		}
		try {
			await Promise.all(
				selectedIds.map((userId) =>
					dispatch(
						deleteUserbyGroup({
							idGroup: idUpdate,
							idUser: userId,
							typeDelete: typeDelete,
						})
					).unwrap()
				)
			);
			handleCloseDialog("delete");
			setSelectedIds();
			toast(`Đã xóa ${selectedIds.length} bản ghi thành công!`, "success");
		} catch (error) {
			const errorMessage = error?.response?.data?.message || error?.message || "Đã xảy ra lỗi khi xóa!";
			logger.error("Lỗi khi xóa người dùng ra khỏi nhóm", error);
			toast(errorMessage, "error");
		} finally {
			setIsLoading(false);
		}
	}, [dispatch, handleCloseDialog, selectedIds, toast, typeDelete, idUpdate, setIsLoading]);

	const handleDeleteGroupRole = async () => {
		setIsLoading(true);
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
			setIsLoading(false);
			return;
		}

		try {
			const currentRoles = detailGroupUsers?.roles || [];
			const updatedRoles = currentRoles.filter(
				(roleId) => !idsToDelete.includes(roleId)
			);

			const payload = { roles: updatedRoles };
			await dispatch(updateGroupUser({ groupId: idUpdate, payload })).unwrap();

			toast(successMessage, "success");
			handleCloseDialog("deleteRole");
			dispatch(getDataDetailGroupUsers(idUpdate));
		} catch (error) {
			const errorMessage = error?.response?.data?.message || error?.message || "Lỗi khi xóa vai trò khỏi nhóm!";
			toast(errorMessage, "error");
		} finally {
			setIsLoading(false);
		}
	};

	const handleOpenDialog = useCallback(
		async (dialogKey, idsOrRecord = null) => {
			if (idsOrRecord) {
				if (dialogKey === "delete") {
					setSelectedIds(
						Array.isArray(idsOrRecord) ? idsOrRecord : [idsOrRecord]
					);
				} else if (dialogKey === "deleteRole") {
					if (Array.isArray(idsOrRecord)) {
						// Xóa hàng loạt
						setSelectedRoleIds(idsOrRecord);
						setRoleToDelete(null);
					} else {
						// Xóa đơn lẻ
						setRoleToDelete(idsOrRecord);
						setSelectedRoleIds([]);
					}
				}
			}
			setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
		},
		[setSelectedIds, setSelectedRoleIds, setRoleToDelete, setOpenDialogs]
	);


	// Sử dụng addOrganizationUnitToGroup cho AddDialog
	const handleSave = async (selectedNodes) => {
		setIsLoading(true);
		try {
			// Lấy các đơn vị được chọn mà chưa thuộc nhóm
			const selectedIds = Object.keys(selectedNodes).filter(
				(id) => selectedNodes[id]
			);
			const existedIds = listGroupUnit?.map((u) => u._id) || [];
			const idsToAdd = selectedIds.filter((id) => !existedIds.includes(id));

			if (openDialogs.add) {
				// Thêm từng đơn vị mới vào nhóm
				for (const orgId of idsToAdd) {
					await dispatch(
						addOrganizationUnitToGroup({ groupId: id, orgId })
					).unwrap();
				}
				toast("Thêm mới thành công", "success");
				handleCloseDialog("add");
			} else if (openDialogs.edit) {
				// Giữ nguyên logic cập nhật cho EditDialog
				const payload = { organizationUnitIds: selectedIds };
				await dispatch(
					updateGroupUserOrganizationUnit({ groupId: id, payload })
				).unwrap();
				toast("Cập nhật thành công", "success");
				handleCloseDialog("edit");
			}
		} catch (error) {
			const errorMessage = error?.response?.data?.message || error?.message || "Đã xảy ra lỗi khi cập nhật!";
			toast(errorMessage, "error");
		} finally {
			setIsLoading(false);
		}
	};

	const handleAddUserToGroup = async (userIds) => {
		setIsLoading(true);
		try {
			const response = await dispatch(
				addUsersToGroup({ groupId: idUpdate, userIds })
			).unwrap();
			// `response` is { success: true, data: { success: true, message: '...' } }
			if (response.success && response.data?.success) {
				toast("Thêm người dùng vào nhóm thành công!", "success");
				setOpenDialogs((prev) => ({ ...prev, addUser: false }));
				dispatch(getDataDetailGroupUsers(idUpdate)); // Tải lại chi tiết nhóm để cập nhật danh sách userIds/UserId
			} else {
				toast(
					response.data?.message || "Đã xảy ra lỗi không xác định!",
					"error"
				);
			}
		} catch (error) {
			// Ưu tiên hiển thị lỗi cụ thể từ mảng 'errors', sau đó đến 'message'
			let displayError = "Đã xảy ra lỗi khi thêm người dùng vào nhóm!";
			if (error) {
				if (Array.isArray(error.errors) && error.errors.length > 0) {
					displayError = error.errors.join("\n");
				} else if (typeof error.message === "string") {
					displayError = error.message;
				}
			}
			toast(displayError, "error");
		} finally {
			setIsLoading(false);
		}
	};

	// const handleRoleTypeChange = useCallback((e) => {
	// 	setRoleType(e.target.value);
	// }, []);

	// const handleDeleteRoleByIds = useCallback(
	// 	(ids) => {
	// 		handleOpenDialog("deleteRole", ids);
	// 	},
	// 	[handleOpenDialog] // include dependencies cần thiết
	// );

	// const handleDeleteRoleByRow = useCallback(
	// 	(row) => {
	// 		handleOpenDialog("deleteRole", row);
	// 	},
	// 	[handleOpenDialog]
	// );

	const handleOpenAddUserDialog = useCallback(() => {
		setOpenDialogs((prev) => ({ ...prev, addUser: true }));
	}, [setOpenDialogs]);

	const handleCloseViewUser = useCallback(() => {

		setViewUserId(null);
	}, []);

	// Xử lý edit
	const handleEdit = useCallback(
		(ids) => {
			const userId = typeof ids === "object" ? ids._id || ids.id : ids;
			setViewUserId(userId);
			setViewUserMode("update");
		},
		[]
	);

	// Xử lý view
	const handleView = useCallback(
		(ids) => {
			const userId = typeof ids === "object" ? ids._id || ids.id : ids;
			setViewUserId(userId);
			setViewUserMode("view");
		},
		[]
	);

	const handleCreateUser = useCallback(() => {
		setViewUserId("new"); // Dùng một giá trị đặc biệt hoặc chỉ cần set mode "add"
		setViewUserMode("add");
	}, []);

	const handleDeleteDetai = useCallback(
		(ids) => {
			handleOpenDialog("delete", ids);
			setTypeDelete("groupUser");
		},
		[handleOpenDialog, setTypeDelete] // thêm các dependency liên quan
	);

	const handleCloseAddUser = useCallback(() => {
		setOpenDialogs(prev => ({ ...prev, addUser: false }));
	}, [setOpenDialogs]);


	const handleAddTab = useCallback(() => {
		sessionStorage.setItem("activeTab", activeTab);
		handleOpenDialog("add");
	}, [activeTab, handleOpenDialog]);

	const handleEditTab = useCallback(() => {
		sessionStorage.setItem("activeTab", activeTab);
		handleOpenDialog("edit");
	}, [activeTab, handleOpenDialog]);

	const handleDeleteTab = useCallback((ids) => {
		setTypeDelete("groupUserUnit");
		handleOpenDialog("delete", ids);
	}, [handleOpenDialog]);

	const handleCloseDelete = useCallback(() => handleCloseDialog("delete"), [handleCloseDialog]);
	const handleCloseDeleteRole = useCallback(() => handleCloseDialog("deleteRole"), [handleCloseDialog]);
	const handleCloseAdd = useCallback(() => handleCloseDialog("add"), [handleCloseDialog]);
	const handleCloseEdit = useCallback(() => handleCloseDialog("edit"), [handleCloseDialog]);



	// Toggle handlers cho mobile accordion sections
	// const handleToggleInfoSection = useCallback(() => {
	// 	setInfoExpanded((prev) => !prev);
	// }, []);

	// const handleToggleRoleDetailSection = useCallback(() => {
	// 	setRoleDetailExpanded((prev) => !prev);
	// }, []);

	if (!open) return null;
	return (
		<BaseSwipper
			open={open}
			onClose={onClose}
			title={
				detailGroupUsers?.name
					? `Chi tiết nhóm người dùng - ${detailGroupUsers.name}`
					: "Chi tiết nhóm người dùng"
			}
			aria-labelledby="form-dialog-title"
			disableSave
			noneOverflow
			nonePadding
		// size="lg"
		>
			<LocalizationProvider dateAdapter={AdapterDateFns}>
				<StyledPaper elevation={0} square>
					<CustomTabsWithBadge
						tabs={TABS}
						value={activeTab}
						onChange={handleChange}
						styledPaddingLeft={isMobile ? 0 : 2}
					/>
					<StyledTabContentBox>
						{activeTab === 0 && (
							<StyledBox>
								<GroupUserInformationTab
									isView
									detailGroupUsers={detailGroupUsers}
								/>
							</StyledBox>
						)}
						{activeTab === 1 && (
							<FlexColumnGrow>
								<GroupUserRoleTab
									isView
									roleType={roleType}
									setRoleType={setRoleType}
									detailGroupUsers={detailGroupUsers}
									groupId={idUpdate}
								/>
							</FlexColumnGrow>
						)}
						{activeTab === 2 && (
							<FlexColumnGrow>
								<CustomTable
									fillHeight
									codeModule={"UserGroupRoleDetails_ListUser"}
									disableSynchronize
									fetchData={fetchDataFromApi}
									disableMore
									filter={filtersUser}
									columns={columnsUser}
									reload={isLoading}
									disableAdd={false}
									onAdd={handleOpenAddUserDialog}
									moreActions={() => (
										<Tooltip title="Tạo người dùng mới">
											<StyledButtonUser
												variant="outlined"
												onClick={handleCreateUser}
											>
												<PersonAddOutlined />
											</StyledButtonUser>
										</Tooltip>
									)}
									onDelete={handleDeleteDetai}
									onEdit={handleEdit}
									onView={handleView}
									uiPreset="unitModern"
									actionIconSize="medium"
									useModernActionColors
									rowsPerPageOptions={[25, 50, 100, 500]}
									lockRowsPerPageOptions
									encodeHtml
								/>
								<AddManagerGroupUserDialog
									open={openDialogs.addUser}
									onClose={handleCloseAddUser}
									onSave={handleAddUserToGroup}
									selectedUserIds={detailGroupUsers?.userId || detailGroupUsers?.userIds || detailGroupUsers?.UserId || []}
								/>
							</FlexColumnGrow>
						)}
						{/* {activeTab === 3 && (
							<PermissionDetailTab
								entityType="group"
								entityId={idUpdate}
								open={activeTab === 3 && open}
							/>
						)} */}
						{activeTab === 3 && (
							<ActionPermissionDetailTab
								entityType="group"
								entityId={idUpdate}
								open={activeTab === 3 && open}
							/>
						)}
						{activeTab === 5 && (
							<FlexColumnGrow>
								<CustomTable
									codeModule={"UserGroupRoleDetails_AttributeGroup"}
									disableSynchronize
									fetchData={fetchDataGroupFromApi}
									disableMore
									disableDetail
									disableEdit
									filter={filters}
									columns={columns}
									reload={isLoading}
									editGroupUnit
									onAdd={handleAddTab}
									onEdit={handleEditTab}
									onDelete={handleDeleteTab}
									sCheckTitle={false}
									uiPreset="unitModern"
									actionIconSize="medium"
									useModernActionColors
									rowsPerPageOptions={[25, 50, 100, 500]}
									lockRowsPerPageOptions
									encodeHtml
								/>
							</FlexColumnGrow>
						)}
					</StyledTabContentBox>
				</StyledPaper>
				<DeleteDialog
					open={openDialogs.delete}
					// onClose={() => handleCloseDialog("delete")}
					onClose={handleCloseDelete}
					onSave={handleDelete}
					selectedIds={selectedIds}
					isLoading={isLoading}
				/>

				{/* Dialog xóa vai trò động */}
				<DeleteDialog
					open={openDialogs.deleteRole}
					// onClose={() => handleCloseDialog("deleteRole")}
					onClose={handleCloseDeleteRole}
					onSave={handleDeleteGroupRole}
					selectedIds={roleToDelete ? [roleToDelete] : selectedRoleIds}
					isLoading={isLoading}
				/>

				<AddDialog
					open={openDialogs.add}
					// onClose={() => handleCloseDialog("add")}
					onClose={handleCloseAdd}
					isLoading={isLoading}
					onSave={handleSave}
					listUnit={listUnit}
					listGroupUnit={listGroupUnit}
				/>
				<EditDialog
					open={openDialogs.edit}
					// onClose={() => handleCloseDialog("edit")}
					onClose={handleCloseEdit}
					isLoading={isLoading}
					onSave={handleSave}
					listUnit={listUnit}
					listGroupUnit={listGroupUnit}
				/>

				{/* Drawer xem chi tiết người dùng lồng nhau */}
				<BaseSwipper
					open={!!viewUserId}
					onClose={handleCloseViewUser}
					title={viewUserMode === "add" ? "Thêm mới người dùng" : viewUserMode === "update" ? "Cập nhật người dùng" : "Chi tiết người dùng"}
					showCloseIcon
				>
					{viewUserId && (
						<ManagerUsers
							props={{
								id: viewUserId === "new" ? null : viewUserId,
								view: viewUserMode,
								onClose: handleCloseViewUser,
							}}
						/>
					)}
				</BaseSwipper>

			</LocalizationProvider>

		</BaseSwipper>
	);
};

export default withSharedComponents(DetailGroupUser);
