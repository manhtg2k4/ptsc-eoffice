import React, { useCallback } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { styled } from '@mui/material/styles';
import withSharedComponents from '@components/WrapperComponent';
import { SkyBox, SkyGrid, SkyTypography } from '@styles/SkyStyles';
import { FormLabel } from '@styles/BaseSwiper/BaseSwiper.style';
import { IconRequied } from '@styles/UploadFile/UploadFile.style';
import { StyledHeaderContent } from '@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles';
import LayoutDesignerCanvas from './LayoutDesignerCanvas';

// --- STYLED COMPONENTS ---
const SectionContainer = styled(SkyBox, {
	shouldForwardProp: (prop) => prop !== 'readOnly',
})(({ theme, readOnly }) => ({
	border: 'none',
	backgroundColor: 'transparent',
	padding: readOnly ? 0 : theme.spacing(2),
	borderRadius: 0,
	marginTop: readOnly ? 0 : theme.spacing(3),
	[theme.breakpoints.down('sm')]: {
		padding: readOnly ? 0 : theme.spacing(1.5),
	}
}));

const PreviewHeader = styled(SkyBox)(({ theme }) => ({
	display: 'flex',
	justifyContent: 'space-between',
	alignItems: 'center',
	padding: theme.spacing(2, 0),
	borderBottom: `1px solid ${theme.palette.divider}`,
	marginBottom: theme.spacing(2),
}));

const TotalSeatsLabel = styled(SkyTypography)(() => ({
	fontWeight: 'bold',
}));

const GridContainer = styled(SkyGrid)(({ theme }) => ({
	paddingBottom: theme.spacing(2),
	paddingLeft: 0,
	paddingRight: 0,
	paddingTop: 0,
}));

const GridItem = styled(SkyGrid)(() => ({}));

const RoomLayoutSection = ({
	sharedComponents,
	control,
	readOnly,
	data
}) => {
	const { InputComponents } = sharedComponents;

	// Watch layout grid settings dynamically
	const watchedValues = useWatch({
		control,
		name: ['layoutRows', 'layoutCols', 'layoutItems', 'capacity']
	});

	// Support defaults based on data or form state
	const rows = parseInt(watchedValues[0] || data?.layoutRows || 8, 10);
	const cols = parseInt(watchedValues[1] || data?.layoutCols || 10, 10);
	const items = watchedValues[2] || data?.layoutItems || [];
	const capacity = parseInt(watchedValues[3] || data?.capacity || 0, 10);
	const totalSeats = items.filter(item => item.itemType === 'CHAIR').length;

	const handleWheel = useCallback((e) => {
		e.target.blur();
	}, []);

	return (
		<SectionContainer readOnly={readOnly}>
			<PreviewHeader>
				{!readOnly && <StyledHeaderContent noWrap>Thiết kế sơ đồ phòng họp</StyledHeaderContent>}
				{readOnly && <StyledHeaderContent noWrap>{data?.name || 'Sơ đồ phòng họp'}</StyledHeaderContent>}
				<TotalSeatsLabel>
					Tổng số ghế: {totalSeats} chỗ ngồi
				</TotalSeatsLabel>
			</PreviewHeader>

			{!readOnly && (
				<GridContainer container spacing={3}>
					<GridItem item xs={12} sm={6}>
						<FormLabel>Số hàng của phòng<IconRequied component="span">*</IconRequied></FormLabel>
						<Controller
							name="layoutRows"
							control={control}
							rules={{ min: 1, max: 40 }}
							defaultValue={8}
							render={({ field }) => (
								<InputComponents
									{...field}
									type="number"
									fullWidth
									variant="outlined"
									InputProps={{ 
										inputProps: { min: 1, max: 40 },
										onWheel: handleWheel
									}}
								/>
							)}
						/>
					</GridItem>
					<GridItem item xs={12} sm={6}>
						<FormLabel>Số cột của phòng<IconRequied component="span">*</IconRequied></FormLabel>
						<Controller
							name="layoutCols"
							control={control}
							rules={{ min: 1, max: 40 }}
							defaultValue={10}
							render={({ field }) => (
								<InputComponents
									{...field}
									type="number"
									fullWidth
									variant="outlined"
									InputProps={{ 
										inputProps: { min: 1, max: 40 },
										onWheel: handleWheel
									}}
								/>
							)}
						/>
					</GridItem>
				</GridContainer>
			)}

			<div style={{ marginTop: '16px' }}>
				{readOnly ? (
					<LayoutDesignerCanvas
						layoutItems={items}
						layoutRows={rows}
						layoutCols={cols}
						capacity={capacity}
						readOnly
					/>
				) : (
					<Controller
						name="layoutItems"
						control={control}
						defaultValue={[]}
						render={({ field }) => (
							<LayoutDesignerCanvas
								layoutItems={field.value}
								onChange={field.onChange}
								layoutRows={rows}
								layoutCols={cols}
								capacity={capacity}
								readOnly={false}
							/>
						)}
					/>
				)}
			</div>
		</SectionContainer>
	);
};

export default withSharedComponents(RoomLayoutSection);
