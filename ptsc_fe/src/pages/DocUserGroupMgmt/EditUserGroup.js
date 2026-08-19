import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import withSharedComponents from "@components/WrapperComponent";
import { Checkbox, CircularProgress, FormControlLabel, Grid, Tooltip, FormHelperText } from '@mui/material';
import { PersonAddOutlined } from '@mui/icons-material';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { defaultValueDocUserGroupMgmt, docUserGroupMgmtSchema, toUserIds } from './constantsDocUserGroupMgmt';
import { API_GROUP_USERS_IN_DOCUMENT } from '@EnvironmentFile/constants/urlConfig';
import api from '@services/api';
import { detailUserGroup, updateUserGroup } from '@redux/slices/DocUserGroupMgmt/DocUserGroupMgmtSlice';
import { useDispatch } from 'react-redux';
import { useToast } from '@components/common/ToastProvider';
import { StyledLoadingPopupSignDigital } from '@styles/UploadFile/UploadFile.style';
import CustomTable from "@components/CustomTable/CustomTable";
import CustomButton from "@components/CustomButton";
import AddManagerGroupUserDialog from "@pages/AdministrationSystem/GroupUser/components/AddManagerGroupUserDialog";
import { columnsUser, filtersUser } from "@pages/AdministrationSystem/DetailGroupUser/constantsDistrict";
import { StyledBox, StyledButtonUser, StyledTabContentBox, FlexColumnGrow, StyledFormCard, StyledCardHeader, StyledCardTitle, StyledPaper, StyledCheckboxBox } from "@styles/DetailGroupUser.styles";
import { styled } from '@mui/material/styles';
import { GroupOutlined } from '@mui/icons-material';
import { FormFieldLayoutContext } from "@components/CustomInput/FormFieldLayoutContext";

const StyledFormHelperText = styled(FormHelperText)(({ theme }) => ({
	marginBottom: theme.spacing(1),
	marginLeft: theme.spacing(1)
}));

const TABS = [
	{ key: "thongTinNhom", label: "Thông tin nhóm người dùng" },
	{ key: "danhSach", label: "Danh sách người dùng" },
];

const EditUserGroup = (props) => {
	const {
		open,
		onClose,
		onSuccess,
		sharedComponents,
		title,
		setReloadData
	} = props;

	const {
		BaseSwipper,
		InputComponents,
		CustomTabsWithBadge
	} = sharedComponents;

	const dispatch = useDispatch();
	const toast = useToast();

	const {
		control,
		handleSubmit,
		formState: { errors },
		reset,
		watch,
		setValue,
		getValues,
	} = useForm({
		resolver: yupResolver(docUserGroupMgmtSchema),
		defaultValues: defaultValueDocUserGroupMgmt,
		mode: "onChange",
	});

	const [loading, setLoading] = useState(false);
	const [activeTab, setActiveTab] = useState(0);
	const [openAddUser, setOpenAddUser] = useState(false);
	const [tempSelectedUsers, setTempSelectedUsers] = useState([]);

	const userIdValues = watch("userId");

	useEffect(() => {
		const fetchDetailGroup = async () => {
			try {
				setLoading(true);
				const res = await dispatch(detailUserGroup(props?.id)).unwrap();
				reset(res);
			} catch (error) {
				const messageError = error.response?.data?.message || error.message || "Lỗi khi lấy chi tiết nhóm người dùng!";
				toast(messageError, "error");
			} finally {
				setLoading(false);
			}
		}

		if (open) {
			setActiveTab(0);
			if (props?.id) {
				fetchDetailGroup();
			}
		}
	}, [open, props?.id, dispatch, reset, toast]);

	const fetchDataFromApi = useCallback(
		async ({ page, limit, query, code, sort }) => {
			if (!page || !limit) return { data: [], total: 0 };
			if (!props?.id) return { data: [], total: 0 };

			try {
				let params = { page, limit };
				if (query && query !== "") {
					if (code && code.length > 0) {
						code.forEach(c => {
							params[c] = query;
						});
					} else {
						params.query = query;
					}
				}
				if (sort) params.sort = sort;

				const response = await api.post(`${API_GROUP_USERS_IN_DOCUMENT}/users/by-ids`, { groupId: props?.id }, { params });
				let resData = response?.data?.data || response?.data || [];
				
				const currentIds = toUserIds(userIdValues || []);
				
				// 1. Remove users deleted locally
				resData = resData.filter(u => currentIds.includes(u._id || u.id));
				
				// 2. Add users added locally (from tempSelectedUsers)
				const existingServerIds = resData.map(u => u._id || u.id);
				const tempUsersToAdd = tempSelectedUsers.filter(u => 
					currentIds.includes(u._id || u.id) && !existingServerIds.includes(u._id || u.id)
				);
				
				// If page is 1, we prepend the temp users
				if (page === 1) {
					resData = [...tempUsersToAdd, ...resData];
				}
				
				const formattedData = resData.map(user => ({
					...user,
					userGroup: Array.isArray(user.GroupUser) ? user.GroupUser.map(g => g.name).join(", ") : "",
				}));

				return {
					data: formattedData,
					total: (response?.data?.total || response?.total || resData.length || 0) + tempUsersToAdd.length,
				};
			} catch (error) {
				const errorMessage = error?.response?.data?.message || error?.message || "Lỗi khi lấy dữ liệu người dùng!";
				toast(errorMessage, "warning");
				return { data: [], total: 0 };
			}
		},
		[userIdValues, toast, tempSelectedUsers, props?.id]
	);

	const handleSave = useCallback(async (data) => {
		const payload = {
			...data,
			userId: toUserIds(data?.userId),
		};

		try {
			setLoading(true);
			await dispatch(updateUserGroup({ id: props?.id, body: payload })).unwrap();
			toast("Cập nhật nhóm người dùng thành công!", "success");
			if (onSuccess) onSuccess();
			if (setReloadData) setReloadData(new Date());
			onClose();
			reset();
		} catch (error) {
			const messageError = error.response?.data?.message || error.message || "Lỗi khi cập nhật nhóm người dùng!";
			logger.error("Lỗi khi cập nhật nhóm người dùng:", error);
			toast(messageError, "error");
		} finally {
			setLoading(false);
		}
	}, [onSuccess, toast, dispatch, onClose, props?.id, reset, setReloadData]);

	const handleInvalid = useCallback((errors) => {
		const errorKeys = Object.keys(errors);
		if (errorKeys.length > 0) {
			const errorMessages = errorKeys.map(key => errors[key]?.message).filter(Boolean);
			const message = errorMessages.length > 0 
				? `Thiếu thông tin: ${errorMessages.join(", ")}`
				: "Vui lòng kiểm tra lại các trường thông tin bắt buộc!";
			toast(message, "error");
		}
	}, [toast]);

	const handleChangeTab = (event, newValue) => {
		setActiveTab(newValue);
	};

	const handleOpenAddUser = useCallback(() => {
		setOpenAddUser(true);
	}, []);

	const handleCloseAddUser = useCallback(() => {
		setOpenAddUser(false);
	}, []);

	const handleAddUserToGroup = useCallback((selectedUserIds, fullSelectedUsers = []) => {
		setValue("userId", selectedUserIds, { shouldValidate: true, shouldDirty: true });
		
		const userObjects = fullSelectedUsers.filter(u => typeof u === "object" && (u._id || u.id));
		setTempSelectedUsers(prev => {
			const map = new Map(prev.map(u => [u._id || u.id, u]));
			userObjects.forEach(u => map.set(u._id || u.id, u));
			return Array.from(map.values());
		});
		
		handleCloseAddUser();
	}, [setValue, handleCloseAddUser]);

	const handleRemoveUserFromGroup = useCallback((idsToRemove) => {
		const currentUsers = getValues("userId") || [];
		const currentIds = toUserIds(currentUsers);
		const filtered = currentIds.filter(id => !idsToRemove.includes(id));
		setValue("userId", filtered, { shouldValidate: true, shouldDirty: true });
	}, [getValues, setValue]);

	const renderMoreActions = useCallback(() => (
		<Tooltip title="Thêm người dùng vào nhóm">
			<StyledButtonUser variant="outlined" onClick={handleOpenAddUser}>
				<PersonAddOutlined />
			</StyledButtonUser>
		</Tooltip>
	), [handleOpenAddUser]);

	// Prepare data for CustomTable based on selected userIds

	return (
		<BaseSwipper
			title={title || "Cập nhật nhóm người dùng"}
			open={open}
			onClose={onClose}
			onSave={handleSubmit(handleSave, handleInvalid)}
			isLoading={loading}
			nonePadding
			noneOverflow
			moreActions={
				<CustomButton
					onClick={handleSubmit(handleSave, handleInvalid)}
					disabled={loading}
					variant="contained"
				>
					Lưu
				</CustomButton>
			}
		>
			<FormFieldLayoutContext.Provider value={{ inputLabelLayout: "stacked" }}>
				<StyledPaper elevation={0} square>
					<CustomTabsWithBadge
						tabs={TABS}
						value={activeTab}
						onChange={handleChangeTab}
						styledPaddingLeft={2}
					/>
					<StyledTabContentBox>
						{activeTab === 0 && (
							<StyledBox p={2}>
								<StyledFormCard>
									<StyledCardHeader>
										<GroupOutlined />
										<StyledCardTitle>THÔNG TIN KHÁC</StyledCardTitle>
									</StyledCardHeader>
									<Grid container spacing={3}>
										<Grid item xs={12} md={6}>
											<Controller
												name="code"
												control={control}
												render={({ field }) => (
													<InputComponents
														label="MÃ NHÓM"
														placeholder="Nhập mã nhóm..."
												{...field}
														{...field}
														required
														error={!!errors.code}
														helperText={errors.code?.message}
													/>
												)}
											/>
										</Grid>
										<Grid item xs={12} md={6}>
											<Controller
												name="name"
												control={control}
												render={({ field }) => (
													<InputComponents
														label="TÊN NHÓM NGƯỜI DÙNG"
														placeholder="Nhập tên nhóm..."
														{...field}
														required
														error={!!errors.name}
														helperText={errors.name?.message}
													/>
												)}
											/>
										</Grid>
										<Grid item xs={12} md={6}>
											<Controller
												name="order"
												control={control}
												render={({ field }) => (
													<InputComponents
														label="Thứ tự hiển thị"
														placeholder="Nhập số thứ tự..."
														{...field}
														type="number"
														required
														error={!!errors.order}
														helperText={errors.order?.message}
													/>
												)}
											/>
										</Grid>
										<Grid item xs={12} md={6}>
											<StyledCheckboxBox>
												{/* <Controller
													name="isDefault"
													control={control}
													render={({ field }) => {
														const handleDefaultChange = (e) => field.onChange(e.target.checked);
														return (
															<FormControlLabel
																control={
																	<Checkbox
																		checked={!!field.value}
																		onChange={handleDefaultChange}
																	/>
																}
																label="Mặc định"
															/>
														);
													}}
												/> */}
												<Controller
													name="isDefaultIncoming"
													control={control}
													render={({ field }) => {
														const handleDefaultChange = (e) => field.onChange(e.target.checked);
														return (
															<FormControlLabel
																control={
																	<Checkbox
																		checked={!!field.value}
																		onChange={handleDefaultChange}
																	/>
																}
																label="Hiển thị nhóm xem văn bản đến"
															/>
														);
													}}
												/>
											</StyledCheckboxBox>
										</Grid>
									</Grid>
								</StyledFormCard>
							</StyledBox>
						)}
						{activeTab === 1 && (
							<FlexColumnGrow>
								{errors.userId && (
									<StyledFormHelperText error>
										{errors.userId.message}
									</StyledFormHelperText>
								)}
								<CustomTable
									filterPopupAlignLeft
									styledMaxHeight={225}
									codeModule="AddUserGroup_ListUser"
									fetchData={fetchDataFromApi}
									disableSynchronize
									disableMore
									disableAdd={false}
									filter={filtersUser}
									columns={columnsUser}
									reload={userIdValues}
									onAdd={handleOpenAddUser}
									moreActions={renderMoreActions}
									onDelete={handleRemoveUserFromGroup}
									disableEdit
									disableDetail
									uiPreset="unitModern"
									actionIconSize="medium"
									useModernActionColors
									encodeHtml
								/>
								<AddManagerGroupUserDialog
									open={openAddUser}
									onClose={handleCloseAddUser}
									onSave={handleAddUserToGroup}
									selectedUserIds={userIdValues || []}
								/>
							</FlexColumnGrow>
						)}
					</StyledTabContentBox>
				</StyledPaper>
			</FormFieldLayoutContext.Provider>
			{loading && (
				<StyledLoadingPopupSignDigital>
					<CircularProgress />
				</StyledLoadingPopupSignDigital>
			)}
		</BaseSwipper>
	)
}

EditUserGroup.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	onSuccess: PropTypes.func,
	title: PropTypes.string,
	setReloadData: PropTypes.func,
	sharedComponents: PropTypes.object,
}

export default withSharedComponents(EditUserGroup)