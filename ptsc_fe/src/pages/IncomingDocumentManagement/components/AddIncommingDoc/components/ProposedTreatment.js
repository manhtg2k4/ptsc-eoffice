import React from 'react'
import PropTypes from 'prop-types'
import withSharedComponents from '@components/WrapperComponent';
import { Grid, Typography } from '@mui/material';
import { Controller } from 'react-hook-form';

const ProposedTreatment = ({ control, errors, sharedComponents }) => {
	const { Input } = sharedComponents;
	return (
		<React.Fragment>
			<Grid container spacing={2}>
				<Grid item xs={12} sm={12} mt={2}>
					<Typography>Chuyển xử lý</Typography>
				</Grid>
				<Grid item xs={12} sm={6}>
					<Controller
						name="draftingUnit"
						control={control}
						render={({ field }) => (
							<Input
								select
								label="Phòng ban"
								placeholder="Nhập dữ liệu..."
								{...field}
								error={!!errors?.draftingUnit}
								helperText={errors?.draftingUnit?.message}
								disabled
							/>
						)}
					/>
				</Grid>
				<Grid item xs={12} sm={6}>
					<Controller
						name="drafter"
						control={control}
						render={({ field }) => (
							<Input
								select
								label="Cá nhân"
								placeholder="Nhập dữ liệu..."
								{...field}
								error={!!errors?.drafter}
								helperText={errors?.drafter?.message}
								disabled
							/>
						)}
					/>
				</Grid>
			</Grid>
			<Grid container spacing={2}>
				<Grid item xs={12} sm={12} mt={4}>
					<Typography>Chỉ đạo/Xử lý chính</Typography>
				</Grid>
				<Grid item xs={12} sm={6}>
					<Controller
						name="draftingUnit"
						control={control}
						render={({ field }) => (
							<Input
								select
								label="Cá nhân chỉ đạo"
								placeholder="Nhập dữ liệu..."
								{...field}
								error={!!errors?.draftingUnit}
								helperText={errors?.draftingUnit?.message}
								disabled
							/>
						)}
					/>
				</Grid>
				<Grid item xs={12} sm={6}>
					<Controller
						name="drafter"
						control={control}
						render={({ field }) => (
							<Input
								select
								label="Xin ý kiến"
								placeholder="Nhập dữ liệu..."
								{...field}
								error={!!errors?.drafter}
								helperText={errors?.drafter?.message}
								disabled
							/>
						)}
					/>
				</Grid>
			</Grid>
			<Grid container spacing={2}>
				<Grid item xs={12} sm={12} mt={4}>
					<Typography>Phối hợp xử lý</Typography>
				</Grid>
				<Grid item xs={12} sm={6}>
					<Controller
						name="draftingUnit"
						control={control}
						render={({ field }) => (
							<Input
								select
								label="Phòng ban"
								placeholder="Nhập dữ liệu..."
								{...field}
								error={!!errors?.draftingUnit}
								helperText={errors?.draftingUnit?.message}
								disabled
							/>
						)}
					/>
				</Grid>
				<Grid item xs={12} sm={6}>
					<Controller
						name="drafter"
						control={control}
						render={({ field }) => (
							<Input
								select
								label="Cá nhân"
								placeholder="Nhập dữ liệu..."
								{...field}
								error={!!errors?.drafter}
								helperText={errors?.drafter?.message}
								disabled
							/>
						)}
					/>
				</Grid>
			</Grid>
			<Grid container spacing={2}>
				<Grid item xs={12} sm={12} mt={4}>
					<Typography>Nhận để biết</Typography>
				</Grid>
				<Grid item xs={12} sm={6}>
					<Controller
						name="draftingUnit"
						control={control}
						render={({ field }) => (
							<Input
								select
								label="Phòng ban"
								placeholder="Nhập dữ liệu..."
								{...field}
								error={!!errors?.draftingUnit}
								helperText={errors?.draftingUnit?.message}
								disabled
							/>
						)}
					/>
				</Grid>
				<Grid item xs={12} sm={6}>
					<Controller
						name="drafter"
						control={control}
						render={({ field }) => (
							<Input
								select
								label="Cá nhân"
								placeholder="Nhập dữ liệu..."
								{...field}
								error={!!errors?.drafter}
								helperText={errors?.drafter?.message}
								disabled
							/>
						)}
					/>
				</Grid>
			</Grid>
		</React.Fragment>
	)
}

ProposedTreatment.propTypes = {
	sharedComponents: PropTypes.object.isRequired,
}

export default withSharedComponents(ProposedTreatment) 