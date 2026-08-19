import React, { useCallback, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import withSharedComponents from "@components/WrapperComponent";
import { Checkbox, CircularProgress, FormControlLabel, Grid, Tooltip, FormHelperText } from '@mui/material';
import { PersonAddOutlined } from '@mui/icons-material';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { defaultValueDocUserGroupMgmt, docUserGroupMgmtSchema, toUserIds } from './constantsDocUserGroupMgmt';
import { API_GROUP_USERS_IN_DOCUMENT } from '@EnvironmentFile/constants/urlConfig';
import api from '@services/api';
import { useDispatch } from 'react-redux';
import { useToast } from '@components/common/ToastProvider';
import { addUserGroup } from '@redux/slices/DocUserGroupMgmt/DocUserGroupMgmtSlice';
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

const AddUserGroup = (props) => {
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

	const dispatch = useDispatch();
	const toast = useToast();

	const [loading, setLoading] = useState(false);
	const [activeTab, setActiveTab] = useState(0);
	const [openAddUser, setOpenAddUser] = useState(false);

	const userIdValues = watch("userId");

	useEffect(() => {
		if (open) {
			setActiveTab(0);
		}
	}, [open]);

	const fetchDataFromApi = useCallback(
		async ({ page, limit, query, code, sort }) => {
			if (!page || !limit) return { data: [], total: 0 };
			
			const selectedIds = toUserIds(userIdValues || []);
			if (!selectedIds.length) return { data: [], total: 0 };

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

				const response = await api.post(`${API_GROUP_USERS_IN_DOCUMENT}/users/by-ids`, { userIds: selectedIds }, { params });
				const resData = response?.data?.data || response?.data || [];
				
				const formattedData = resData.map(user => ({
					...user,
					userGroup: Array.isArray(user.GroupUser) ? user.GroupUser.map(g => g.name).join(", ") : "",
				}));

				return {
					data: formattedData,
					total: response?.data?.total || response?.total || formattedData.length || 0,
				};
			} catch (error) {
				const errorMessage = error?.response?.data?.message || error?.message || "Lỗi khi lấy dữ liệu người dùng!";
				toast(errorMessage, "warning");
				return { data: [], total: 0 };
			}
		},
		[userIdValues, toast]
	);

	const handleClose = useCallback(() => {
		onClose();
		reset();
	}, [onClose, reset]);

	const handleSave = useCallback(async (data) => {
		try {
			setLoading(true);
			const payload = {
				...data,
				userId: toUserIds(data.userId),
			};
			await dispatch(addUserGroup(payload)).unwrap();
			toast("Thêm nhóm người dùng thành công!", "success");
			if (onSuccess) onSuccess();
			if (setReloadData) setReloadData(new Date());
			handleClose();
		} catch (error) {
			const messageError = error.response?.data?.message || error.message || "Lỗi khi thêm nhóm người dùng!";
			toast(messageError, "error");
		} finally {
			setLoading(false);
		}
	}, [onSuccess, toast, dispatch, handleClose, setReloadData]);

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

	const handleAddUserToGroup = useCallback((selectedUserIds) => {
		setValue("userId", selectedUserIds, { shouldValidate: true, shouldDirty: true });
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
			title={title || "Thêm mới nhóm người dùng"}
			open={open}
			onClose={handleClose}
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

AddUserGroup.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	onSuccess: PropTypes.func,
	title: PropTypes.string,
	setReloadData: PropTypes.func,
	sharedComponents: PropTypes.object,
}

export default withSharedComponents(AddUserGroup)