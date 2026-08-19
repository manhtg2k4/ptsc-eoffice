import React, { useCallback, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import withSharedComponents from "@components/WrapperComponent";
import { CircularProgress, Grid, Typography } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { API_CUSTOM_SENDER_UNITS } from '@EnvironmentFile/constants/urlConfig';
import { useDispatch } from 'react-redux';
import { useToast } from '@components/common/ToastProvider';
import { getCustomSenderUnitDetail, updateCustomSenderUnit } from '@redux/slices/DocSendingUnitMgmt/DocSendingUnitMgmtSlice';
import { StyledLoadingPopupSignDigital } from '@styles/UploadFile/UploadFile.style';
import { docSendingUnitSchema, defaultValueDocSendingUnit } from './constants';
import { styled } from '@mui/material/styles';

const LabelTypography = styled(Typography)(({ theme }) => ({
	marginBottom: theme.spacing(0.5),
	fontWeight: 500,
	display: 'block'
}));

const RequiredMark = styled('span')({
	color: 'red'
});

const EditSendingUnit = (props) => {
	const {
		open,
		onClose,
		onSuccess,
		sharedComponents,
		title,
		setReloadData
	} = props;

	const {
		Dialog,
		InputComponents,
		AsyncAutoComplete,
	} = sharedComponents;

	const dispatch = useDispatch();
	const toast = useToast();

	const {
		control,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm({
		resolver: yupResolver(docSendingUnitSchema),
		defaultValues: defaultValueDocSendingUnit,
		mode: "onChange",
	});

	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const fetchDataDetail = async () => {
			if (!open || !props?.id) return;
			try {
				setLoading(true);
				const res = await dispatch(getCustomSenderUnitDetail({
					id: props?.id,
					source: props?.source
				})).unwrap();
				reset({
					name: res?.name || "",
					code: res?.code || "",
					parentId: res?.parentId || null,
				});
			} catch (error) {
				const messageError = typeof error === 'string'
					? error
					: error?.message || "Lỗi khi lấy chi tiết đơn vị gửi!";
				toast(messageError, "error");
			} finally {
				setLoading(false);
			}
		}
		fetchDataDetail()
	}, [open, dispatch, reset, toast, props?.id, props?.source])

	const handleClose = useCallback(() => {
		onClose();
		reset();
	}, [onClose, reset]);

	const handleSave = useCallback(async (data) => {
		try {
			setLoading(true);
			const payload = {
				name: data.name,
				code: data.code,
				parentId: data.parentId || null,
				isSenderUnit: true
			};
			await dispatch(updateCustomSenderUnit({ id: props?.id, updatedData: payload })).unwrap();
			toast("Cập nhật đơn vị gửi thành công!", "success");
			if (onSuccess) {
				onSuccess();
			}
			if (setReloadData) {
				setReloadData(new Date());
			}
			handleClose();
		} catch (error) {
			const messageError = typeof error === 'string'
				? error
				: error?.message || "Lỗi khi cập nhật đơn vị gửi!";
			toast(messageError, "error");
		} finally {
			setLoading(false);
		}
	}, [onSuccess, toast, dispatch, handleClose, props?.id, setReloadData]);

	return (
		<Dialog
			title={title || "CẬP NHẬT ĐƠN VỊ GỬI"}
			open={open}
			onClose={handleClose}
			onSave={handleSubmit(handleSave)}
			isLoading={loading}
			size="md"
			titleButton="Lưu"
			cancelButtonText="Đóng"
		>
			<Grid container spacing={2} mt={2}>
				<Grid item xs={12}>
					<Controller
						name="name"
						control={control}
						render={({ field }) => (
							<>
								<LabelTypography variant="body2">Tên đơn vị <RequiredMark>*</RequiredMark></LabelTypography>
								<InputComponents
									placeholder="Nhập tên đơn vị..."
									{...field}
									error={!!errors.name}
									helperText={errors.name?.message}
								/>
							</>
						)}
					/>
				</Grid>
				<Grid item xs={12}>
					<Controller
						name="code"
						control={control}
						render={({ field }) => (
							<>
								<LabelTypography variant="body2">Mã đơn vị <RequiredMark>*</RequiredMark></LabelTypography>
								<InputComponents
									placeholder="Nhập mã đơn vị..."
									{...field}
									error={!!errors.code}
									helperText={errors.code?.message}
								/>
							</>
						)}
					/>
				</Grid>
				<Grid item xs={12}>
					<Controller
						name="parentId"
						control={control}
						render={({ field }) => (
							<>
								<LabelTypography variant="body2">Đơn vị cha</LabelTypography>
								<AsyncAutoComplete
									fullWidth
									placeholder="Chọn đơn vị cha..."
									url={`${API_CUSTOM_SENDER_UNITS}/all`}
									queryParam="name"
									optionLabel="name"
									optionValue="_id"
									value={field.value}
									onChange={field.onChange}
									error={!!errors.parentId}
									helperText={errors.parentId?.message}
									size="small"
									unsetFontWeight
									returnObject={false}
								/>
							</>
						)}
					/>
				</Grid>
			</Grid>
			{loading && (
				<StyledLoadingPopupSignDigital>
					<CircularProgress />
				</StyledLoadingPopupSignDigital>
			)}
		</Dialog>
	)
}

EditSendingUnit.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	onSuccess: PropTypes.func,
	title: PropTypes.string,
	id: PropTypes.string,
	source: PropTypes.oneOf(['custom', 'organization']),
	setReloadData: PropTypes.func,
}

export default withSharedComponents(EditSendingUnit)