import React, { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import withSharedComponents from "@components/WrapperComponent";
import { Checkbox, FormControlLabel, Grid, CircularProgress } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { defaultValueDocUserGroupMgmt } from './constantsDocUserGroupMgmt';
import { API_GROUP_USERS_IN_DOCUMENT } from '@EnvironmentFile/constants/urlConfig';
import api from '@services/api';
import { detailUserGroup } from '@redux/slices/DocUserGroupMgmt/DocUserGroupMgmtSlice';
import { useDispatch } from 'react-redux';
import { useToast } from '@components/common/ToastProvider';
import { StyledLoadingPopupSignDigital } from '@styles/UploadFile/UploadFile.style';
import CustomTable from "@components/CustomTable/CustomTable";
import { columnsUser, filtersUser } from "@pages/AdministrationSystem/DetailGroupUser/constantsDistrict";
import { StyledBox, StyledTabContentBox, FlexColumnGrow, StyledFormCard, StyledCardHeader, StyledCardTitle, StyledPaper, StyledCheckboxBox } from "@styles/DetailGroupUser.styles";
import { GroupOutlined } from '@mui/icons-material';
import { FormFieldLayoutContext } from "@components/CustomInput/FormFieldLayoutContext";



const TABS = [
	{ key: "thongTinNhom", label: "Thông tin nhóm người dùng" },
	{ key: "danhSach", label: "Danh sách người dùng" },
];

const ViewUserGroup = (props) => {
	const {
		open,
		onClose,
		sharedComponents,
		title,
	} = props;

	const {
		BaseSwipper,
		InputComponents,
		CustomTabsWithBadge
	} = sharedComponents;

	const dispatch = useDispatch();
	const toast = useToast();

	const [loading, setLoading] = useState(false);
	const [activeTab, setActiveTab] = useState(0);
	const {
		control,
		reset,
		watch,
	} = useForm({
		defaultValues: defaultValueDocUserGroupMgmt,
	});

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

	const handleChangeTab = (event, newValue) => {
		setActiveTab(newValue);
	};

	return (
		<BaseSwipper
			title={title || "Xem chi tiết nhóm người dùng"}
			open={open}
			onClose={onClose}
			isLoading={loading}
			disableSave
			nonePadding
			noneOverflow
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
												required
												disabled
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
												disabled
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
														disabled
													/>
												)}
											/>
										</Grid>
										<Grid item xs={12} md={6}>
											<StyledCheckboxBox>
												{/* <Controller
													name="isDefault"
													control={control}
													render={({ field }) => (
														<FormControlLabel
															control={
																<Checkbox
																	checked={!!field.value}
																	disabled
																/>
															}
															label="Mặc định"
														/>
													)}
												/> */}
												<Controller
													name="isDefaultIncoming"
													control={control}
													render={({ field }) => (
														<FormControlLabel
															control={
																<Checkbox
																	checked={!!field.value}
																	disabled
																/>
															}
															label="Hiển thị nhóm xem văn bản đến"
														/>
													)}
												/>
											</StyledCheckboxBox>
										</Grid>
									</Grid>
								</StyledFormCard>
							</StyledBox>
						)}
					{activeTab === 1 && (
						<FlexColumnGrow>
							<CustomTable
								filterPopupAlignLeft
								styledMaxHeight={225}
								codeModule="AddUserGroup_ListUser"
								fetchData={fetchDataFromApi}
								disableSynchronize
								disableMore
								disableAdd
								filter={filtersUser}
								columns={columnsUser}
								reload={userIdValues}
								disableEdit
								disableDetail
								uiPreset="unitModern"
								actionIconSize="medium"
								useModernActionColors
								encodeHtml
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

ViewUserGroup.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	onSuccess: PropTypes.func,
	title: PropTypes.string,
	sharedComponents: PropTypes.object,
}

export default withSharedComponents(ViewUserGroup)