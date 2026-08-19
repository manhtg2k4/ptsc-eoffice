import React, { useState } from 'react'
import PropTypes from 'prop-types'
import withSharedComponents from '@components/WrapperComponent';
import { Box, Grid, Tooltip, styled } from '@mui/material';
import { Controller } from 'react-hook-form';
import { Add } from '@mui/icons-material';
import { StyledButton } from '@styles/CustomTable.styles';
import { FormContainer } from '@styles/FormList.styles';
import { ButtonContainer, ScanIcon, SectionGrid, SectionTitle, UploadIcon } from '@pages/TextAway/Tab/SigningSubmissionTab/componentStyle/AddDialog.style';

const InputWithButtonContainer = styled(Box)(({ theme }) => ({
	display: 'flex',
	alignItems: 'flex-start',
	gap: theme.spacing(1),
}));

const GeneralInformation = ({ control, errors, sharedComponents }) => {
	const { Input, DatePicker, Dialog } = sharedComponents;
	const [openDialog, setOpenDialog] = useState(false);
	const handleOpenDialog = () => {
		setOpenDialog(true);
	};
	const handleCloseDialog = () => {
		setOpenDialog(false);
	};

	return (
		<FormContainer>
			<Grid container spacing={2}>
				<Grid item xs={12} sm={6} md={3}>
					<Controller
						name="draftingUnit"
						control={control}
						render={({ field }) => (
							<Input
								select
								label="Số Vb đến"
								placeholder="Nhập dữ liệu..."
								{...field}
								error={!!errors.draftingUnit}
								helperText={errors.draftingUnit?.message}
							//   required
							/>
						)}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Controller
						name="drafter"
						control={control}
						render={({ field }) => (
							<Input
								select
								label="Số văn bản"
								placeholder="Nhập dữ liệu..."
								{...field}
								error={!!errors.drafter}
								helperText={errors.drafter?.message}
								required
							/>
						)}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<InputWithButtonContainer>
						<Controller
							name="documentType"
							control={control}
							render={({ field }) => (
								<Input
									select
									fullWidth
									label="Đơn vị gửi"
									placeholder="Nhập dữ liệu..."
									{...field}
									error={!!errors.documentType}
									helperText={errors.documentType?.message}
								//   required
								/>
							)}
						/>
						<StyledButton variant="contained" onClick={handleOpenDialog}>
							<Tooltip title="Thêm mới đơn vị gửi">
								<Add />
							</Tooltip>
						</StyledButton>
					</InputWithButtonContainer>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Controller
						name="urgency"
						control={control}
						render={({ field }) => (
							<Input
								select
								label="Đơn vị nhận"
								placeholder="Nhập dữ liệu..."
								{...field}
								error={!!errors.urgency}
								helperText={errors.urgency?.message}
							//   required
							/>
						)}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Controller
						name="securityLevel"
						control={control}
						render={({ field }) => (
							<Input
								select
								label="Số đến"
								placeholder="Nhập dữ liệu..."
								{...field}
								error={!!errors.securityLevel}
								helperText={errors.securityLevel?.message}
								required
							/>
						)}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Controller
						name="replyDeadline"
						control={control}
						render={({ field }) => (
							<DatePicker
								label="Ngày VB"
								value={field.value || null}
								onChange={field.onChange}
								error={!!errors.replyDeadline}
								helperText={errors.replyDeadline?.message}
							//   required
							/>
						)}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Controller
						name="replyDeadline"
						control={control}
						render={({ field }) => (
							<DatePicker
								label="Ngày nhận văn bản"
								value={field.value || null}
								onChange={field.onChange}
								error={!!errors.replyDeadline}
								helperText={errors.replyDeadline?.message}
							//   required
							/>
						)}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Controller
						name="replyDeadline"
						control={control}
						render={({ field }) => (
							<DatePicker
								label="Ngày vào sổ"
								value={field.value || null}
								onChange={field.onChange}
								error={!!errors.replyDeadline}
								helperText={errors.replyDeadline?.message}
							//   required
							/>
						)}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Controller
						name="replyDeadline"
						control={control}
						render={({ field }) => (
							<DatePicker
								label="Hạn trả lời"
								value={field.value || null}
								onChange={field.onChange}
								error={!!errors.replyDeadline}
								helperText={errors.replyDeadline?.message}
							//   required
							/>
						)}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Controller
						name="draftingUnit"
						control={control}
						render={({ field }) => (
							<Input
								label="Số phụ"
								placeholder="Nhập dữ liệu..."
								{...field}
								error={!!errors.draftingUnit}
								helperText={errors.draftingUnit?.message}
							//   required
							/>
						)}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Controller
						name="drafter"
						control={control}
						render={({ field }) => (
							<Input
								select
								label="Phương thức nhận"
								placeholder="Nhập dữ liệu..."
								{...field}
								error={!!errors.drafter}
								helperText={errors.drafter?.message}
							//   required
							/>
						)}
					/>
				</Grid>

				<Grid item xs={12} sm={6} md={3}>
					<Controller
						name="documentType"
						control={control}
						render={({ field }) => (
							<Input
								select
								label="Độ mật"
								placeholder="Nhập dữ liệu..."
								{...field}
								error={!!errors.documentType}
								helperText={errors.documentType?.message}
							//   required
							/>
						)}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Controller
						name="urgency"
						control={control}
						render={({ field }) => (
							<Input
								select
								label="Độ khẩn"
								placeholder="Nhập dữ liệu..."
								{...field}
								error={!!errors.urgency}
								helperText={errors.urgency?.message}
								required
							/>
						)}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Controller
						name="securityLevel"
						control={control}
						render={({ field }) => (
							<Input
								select
								label="Loại văn bản"
								placeholder="Nhập dữ liệu..."
								{...field}
								error={!!errors.securityLevel}
								helperText={errors.securityLevel?.message}
								required
							/>
						)}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Controller
						name="securityLevel"
						control={control}
						render={({ field }) => (
							<Input
								select
								label="Lĩnh vực"
								placeholder="Nhập dữ liệu..."
								{...field}
								error={!!errors.securityLevel}
								helperText={errors.securityLevel?.message}
							//   required
							/>
						)}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Controller
						name="securityLevel"
						control={control}
						render={({ field }) => (
							<Input
								label="Người ký"
								placeholder="Nhập dữ liệu..."
								{...field}
								error={!!errors.securityLevel}
								helperText={errors.securityLevel?.message}
							//   required
							/>
						)}
					/>
				</Grid>
				<Grid item xs={12} sm={12}>
					<Controller
						name="securityLevel"
						control={control}
						render={({ field }) => (
							<Input
								label="Trích yếu"
								placeholder="Nhập dữ liệu..."
								{...field}
								error={!!errors.securityLevel}
								helperText={errors.securityLevel?.message}
								multiline								
								required
							/>
						)}
					/>
				</Grid>
			</Grid>

			 <SectionGrid item xs={12}>
				<SectionTitle>VĂN BẢN ĐÍNH KÈM</SectionTitle>
				<ButtonContainer>
				  <Tooltip title="Tải lên">
					<UploadIcon />
				  </Tooltip>
				  <Tooltip title="Quét văn bản">
					<ScanIcon />
				  </Tooltip>
				</ButtonContainer>
			  </SectionGrid>
			<Dialog
				open={openDialog}
				onClose={handleCloseDialog}
				title="Thêm mới đơn vị gửi"
				type="add"
			>
				<Grid container spacing={2}>
					<Grid item xs={12} sm={12}>
						<Controller
							name="urgency"
							control={control}
							render={({ field }) => (
								<Input
									label="Mã đơn vị gửi"
									placeholder="Nhập dữ liệu..."
									{...field}
									error={!!errors.urgency}
									helperText={errors.urgency?.message}
								//   required
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={12}>
						<Controller
							name="urgency"
							control={control}
							render={({ field }) => (
								<Input
									label="Tên đơn vị gửi"
									placeholder="Nhập dữ liệu..."
									{...field}
									error={!!errors.urgency}
									helperText={errors.urgency?.message}
								//   required
								/>
							)}
						/>
					</Grid>
				</Grid>
			</Dialog>
		</FormContainer>
	)
}

GeneralInformation.propTypes = {
	sharedComponents: PropTypes.object.isRequired,
}

export default withSharedComponents(GeneralInformation) 