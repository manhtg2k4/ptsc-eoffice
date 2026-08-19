import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import withSharedComponents from "@components/WrapperComponent";
import { CircularProgress, Grid, Typography } from '@mui/material';
import { useDispatch } from 'react-redux';
import { useToast } from '@components/common/ToastProvider';
import { getCustomSenderUnitDetail } from '@redux/slices/DocSendingUnitMgmt/DocSendingUnitMgmtSlice';
import { StyledLoadingPopupSignDigital } from '@styles/UploadFile/UploadFile.style';
import { styled } from '@mui/material/styles';

const LabelTypography = styled(Typography)(({ theme }) => ({
	marginBottom: theme.spacing(0.5),
	fontWeight: 500,
	display: 'block'
}));

const ViewSendingUnit = (props) => {
	const {
		open,
		onClose,
		sharedComponents,
		title,
	} = props;

	const {
		Dialog,
		InputComponents,
	} = sharedComponents;

	const dispatch = useDispatch();
	const toast = useToast();

	const [loading, setLoading] = useState(false);
	const [detail, setDetail] = useState(null);

	useEffect(() => {
		const fetchDataDetail = async () => {
			if (!open || !props?.id) return;
			try {
				setLoading(true);
				const res = await dispatch(getCustomSenderUnitDetail({
					id: props?.id,
					source: props?.source
				})).unwrap();
				setDetail(res);
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
	}, [open, dispatch, toast, props?.id, props?.source])

	return (
		<Dialog
			title={title || "CHI TIẾT ĐƠN VỊ GỬI"}
			open={open}
			onClose={onClose}
			size="md"
			cancelButtonText="Đóng"
			disableSave
		>
			<Grid container spacing={2} mt={2}>
				<Grid item xs={12}>
					<LabelTypography variant="body2">Tên đơn vị</LabelTypography>
					<InputComponents
						value={detail?.name || ""}
						disabled
					/>
				</Grid>
				<Grid item xs={12}>
					<LabelTypography variant="body2">Mã đơn vị</LabelTypography>
					<InputComponents
						value={detail?.code || ""}
						disabled
					/>
				</Grid>
				{/* <Grid item xs={12}>
					<InputComponents
						label="Người tạo"
						value={detail?.createdByName || ""}
						disabled
					/>
				</Grid> */}
				<Grid item xs={12}>
					<LabelTypography variant="body2">Ngày tạo</LabelTypography>
					<InputComponents
						value={detail?.createdAt ? new Date(detail.createdAt).toLocaleDateString('vi-VN') : ""}
						disabled
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

ViewSendingUnit.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	title: PropTypes.string,
	id: PropTypes.string,
	source: PropTypes.oneOf(['custom', 'organization']),
}

export default withSharedComponents(ViewSendingUnit)