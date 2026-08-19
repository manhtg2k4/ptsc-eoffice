import React, { useRef } from 'react';
import { styled } from '@mui/material/styles';
import { Box, Grid, DialogContent, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { Controller, useController } from 'react-hook-form';
import withSharedComponents from '@components/WrapperComponent';
import { ReactCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';
import 'react-image-crop/dist/ReactCrop.css';

import { USAGE_STATUS_OPTIONS, USAGE_STATUS } from '@pages/MeetingRoom/constant';
import { SkyBox, SkyGrid, SkyTypography } from '@styles/SkyStyles';
import { CustomDialog } from '@components/CustomDialog';
import { FormLabel } from '@styles/BaseSwiper/BaseSwiper.style';
import { IconRequied } from '@styles/UploadFile/UploadFile.style';
// import { SectionHeader, SectionHeaderIcon } from '@styles/ThemeConfig.styles';

export const EQUIPMENT_OPTIONS = [
	{ value: 'projector', label: 'Máy chiếu' },
	{ value: 'TV', label: 'Tivi' },
	{ value: 'whiteboard', label: 'Bảng trắng' },
	{ value: 'sound_system', label: 'Hệ thống âm thanh' },
	{ value: 'micro', label: 'Micro' },
];

const SectionContainer = styled(SkyBox)(({ theme }) => ({
	backgroundColor: 'transparent',
	padding: theme.spacing(2),
	border: 'none',
	borderRadius: 0,
	position: 'relative',
}));

const HeaderRow = styled(SkyBox)(({ theme }) => ({
	display: 'grid',
	gridTemplateColumns: 'minmax(0, 7fr) minmax(280px, 5fr)',
	alignItems: 'center',
	columnGap: theme.spacing(3),
	marginBottom: theme.spacing(2),
}));

const HeaderLeft = styled(SkyBox)(() => ({
	display: 'flex',
	alignItems: 'center',
	gap: 8,
	minWidth: 0,
}));

const SectionTitle = styled(SkyTypography)(({ theme }) => ({
	fontWeight: 700,
	fontSize: '0.95rem',
	textTransform: 'uppercase',
	letterSpacing: '0.02em',
	color: theme.palette.text.primary,
}));

const ColumnsGrid = styled(SkyGrid)(({ theme }) => ({
	alignItems: 'stretch',
	[theme.breakpoints.down('md')]: {
		rowGap: theme.spacing(3),
	},
}));

const LeftColumn = styled(SkyBox)(() => ({
	display: 'flex',
	flexDirection: 'column',
	height: '100%',
}));

const RightColumn = styled(Box)(({ theme }) => ({
	display: 'flex',
	flexDirection: 'column',
	gap: theme.spacing(2),
	height: '100%',
}));

const RightColumnTitle = styled(SkyTypography)(({ theme }) => ({
	fontWeight: 700,
	fontSize: '20px',
	textTransform: 'uppercase',
	letterSpacing: '0.02em',
	color: theme.palette.text.primary,
	display: 'flex',
	alignItems: 'center',
	justifySelf: 'start',
}));

const ImageContainer = styled(Box)(() => ({
	minHeight: '170px',
}));

const ImageUploadBox = styled(SkyBox)(({ theme }) => ({
	border: `1px dashed ${theme.palette.divider}`,
	borderRadius: theme.shape.borderRadius,
	minHeight: '170px',
	position: 'relative',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	overflow: 'hidden',
	backgroundColor: theme.palette.background.paper,
	padding: theme.spacing(2),
	[theme.breakpoints.down('md')]: {
		minHeight: '150px',
	},
}));

const PreviewImage = styled(AuthImage)({
	width: '100%',
	height: '100%',
	objectFit: 'cover',
	position: 'absolute',
	inset: 0,
	zIndex: 0,
});

const ImageHint = styled(SkyBox)(({ theme }) => ({
	display: 'flex',
	flexDirection: 'column',
	alignItems: 'center',
	justifyContent: 'center',
	gap: theme.spacing(0.75),
	textAlign: 'center',
	color: theme.palette.text.secondary,
	zIndex: 1,
}));

const UploadIcon = styled(FileUploadOutlinedIcon)(({ theme }) => ({
	fontSize: 34,
	color: theme.palette.text.secondary,
}));

const SecondaryText = styled(SkyTypography)(({ theme }) => ({
	color: theme.palette.text.secondary,
}));

const PrimaryText = styled(SkyTypography)(({ theme }) => ({
	color: theme.palette.primary.main,
}));

const ActionButtons = styled(SkyBox)(({ theme }) => ({
	position: 'absolute',
	right: theme.spacing(2),
	bottom: theme.spacing(2),
	zIndex: 2,
	display: 'flex',
	gap: theme.spacing(1),
}));

const FormFieldsBox = styled(SkyBox)(({ theme }) => ({
	display: 'flex',
	flexDirection: 'column',
	gap: theme.spacing(1.5),
	marginTop: 2,
}));

const FormFieldRow = styled(SkyBox)(({ theme }) => ({
	display: 'flex',
	alignItems: 'center',
	gap: theme.spacing(1.5),
	[theme.breakpoints.down('sm')]: {
		flexDirection: 'column',
		alignItems: 'stretch',
		gap: theme.spacing(0.75),
	},
}));

const FieldLabel = styled(FormLabel)(({ theme }) => ({
	flex: '0 0 140px',
	marginBottom: 0,
	whiteSpace: 'nowrap',
	[theme.breakpoints.down('sm')]: {
		flex: '1 1 auto',
		whiteSpace: 'normal',
	},
}));

const FieldControl = styled(SkyBox)(() => ({
	flex: '1 1 auto',
	minWidth: 0,
}));

const EquipmentSection = styled(SkyBox)(({ theme }) => ({
	marginTop: theme.spacing(2),
}));

const InputsGrid = styled(Grid)(() => ({
	alignItems: 'stretch',
	marginBottom: 12
}));

const EquipmentActionItemAlign = styled(SkyGrid)(() => ({
	display: 'flex',
	alignItems: 'flex-end',
}));

const EquipmentCard = styled(SkyBox)(({ theme }) => ({
	backgroundColor: theme.palette.background.paper,
	borderRadius: theme.shape.borderRadius,
	border: `1px solid ${theme.palette.divider}`,
	overflow: 'hidden',
	display: 'flex',
	flexDirection: 'column',
	height: '100%',
	maxHeight: '500px',
}));

const EquipmentTableHeader = styled(SkyBox)(({ theme }) => ({
	display: 'grid',
	gridTemplateColumns: '1fr 90px 70px',
	gap: theme.spacing(1),
	padding: theme.spacing(1, 2),
	borderBottom: `1px solid ${theme.palette.divider}`,
	backgroundColor: theme.palette.background.paper,
	fontSize: '0.75rem',
	fontWeight: 600,
	color: theme.palette.text.secondary,
}));

const EquipmentList = styled(SkyBox)(({ theme }) => ({
	flex: 1,
	overflowY: 'auto',
	'&::-webkit-scrollbar': {
		width: '6px',
	},
	'&::-webkit-scrollbar-thumb': {
		backgroundColor: theme.palette.mode === 'dark'
			? 'rgba(255,255,255,0.2)'
			: 'rgba(0,0,0,0.15)',
		borderRadius: '999px',
	},
}));

const EquipmentRow = styled(SkyBox)(({ theme }) => ({
	display: 'grid',
	gridTemplateColumns: '1fr 90px 70px',
	gap: theme.spacing(1),
	alignItems: 'center',
	padding: theme.spacing(1.2, 2),
	'&:nth-of-type(odd)': {
		backgroundColor: theme.palette.action.hover,
	},
}));

const EquipmentFooter = styled(SkyBox)(({ theme }) => ({
	padding: theme.spacing(1.5, 2),
	borderTop: `1px solid ${theme.palette.divider}`,
	textAlign: 'right',
}));

const EmptyText = styled(SkyTypography)(({ theme }) => ({
	padding: theme.spacing(2),
	color: theme.palette.text.secondary,
	textAlign: 'center',
}));

const DeleteButton = styled(IconButton)(({ theme }) => ({
	color: theme.palette.text.secondary,
	padding: 4,
}));

const DeleteIconSmall = styled(DeleteIcon)(({ theme }) => ({
	fontSize: '1rem',
	color: theme.palette.text.secondary,
}));

const EquipmentListRow = React.memo(function EquipmentListRow({
	item,
	index,
	amenityOptions,
	onRemoveEquipment,
}) {
	const matched = amenityOptions.find((opt) => opt.value === item.name);
	const displayName = matched ? matched.label : item.name;

	const handleRemove = React.useCallback(() => {
		if (onRemoveEquipment) {
			onRemoveEquipment(index);
		}
	}, [index, onRemoveEquipment]);

	return (
		<EquipmentRow>
			<SkyTypography variant="body2" noWrap title={displayName}>
				{displayName || 'Thiết bị chưa chọn'}
			</SkyTypography>
			<SkyTypography variant="body2">
				{item.quantity}
			</SkyTypography>
			<DeleteButton size="small" onClick={handleRemove}>
				<DeleteIconSmall />
			</DeleteButton>
		</EquipmentRow>
	);
});

const CropContainer = styled(SkyBox)({
	display: 'flex',
	justifyContent: 'center',
	backgroundColor: '#333',
	padding: '16px',
});

const CropImg = styled('img')({
	transform: 'scale(1) rotate(0deg)',
	maxHeight: '60vh',
});

function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
	return centerCrop(
		makeAspectCrop(
			{
				unit: '%',
				width: 90,
			},
			aspect,
			mediaWidth,
			mediaHeight,
		),
		mediaWidth,
		mediaHeight,
	);
}

const StatusInput = ({ control, InputComponents, stageOptions, onShowWarning, errors, isEditMode, onValidateAvailability }) => {
	const { field } = useController({ name: 'stage', control });

	const effectiveOptions = React.useMemo(() => {
		const optionsMap = new Map();

		USAGE_STATUS_OPTIONS.forEach((opt) => {
			const id = Number(opt.id);
			if (!Number.isNaN(id)) {
				optionsMap.set(id, { ...opt, id, name: opt.name });
			}
		});

		if (stageOptions && stageOptions.length > 0) {
			stageOptions.forEach((opt) => {
				const rawId = opt.id ?? opt.value ?? opt.key;
				const id = Number(rawId);
				if (!Number.isNaN(id)) {
					const name = opt.name || opt.label || opt.title || opt.text || String(rawId);
					optionsMap.set(id, { ...opt, id, name });
				}
			});
		}

		return Array.from(optionsMap.values());
	}, [stageOptions]);

	const handleChange = React.useCallback(async (e) => {
		let newValue = e.target ? e.target.value : e;
		if (newValue !== null && newValue !== undefined && newValue !== '') {
			newValue = Number(newValue);
		}

		if (isEditMode) {
			if (newValue === USAGE_STATUS.MAINTENANCE && onValidateAvailability) {
				const canChange = await onValidateAvailability();
				if (!canChange) {
					if (onShowWarning) onShowWarning();
					return;
				}
			}

			if (newValue !== USAGE_STATUS.AVAILABLE && newValue !== USAGE_STATUS.MAINTENANCE) {
				return;
			}
		}

		field.onChange(newValue);
	}, [field, isEditMode, onShowWarning, onValidateAvailability]);

	return (
		<InputComponents
			{...field}
			select
			required
			fullWidth
			options={effectiveOptions}
			customLabel="name"
			customValue="id"
			error={!!errors.stage}
			helperText={errors.stage?.message}
			size="normal"
			onChange={handleChange}
		/>
	);
};

const RoomInfoSection = ({
	sharedComponents,
	control,
	errors,
	layoutImagePreview,
	onImageChange,
	onImageRemove,
	amenityOptions = EQUIPMENT_OPTIONS,
	onAddEquipment,
	stageOptions,
	currentStage,
	onShowWarning,
	isEditMode = false,
	onValidateAvailability,
	fields = [],
	onRemoveEquipment,
}) => {
	const { InputComponents, Button } = sharedComponents;
	const fileInputRef = useRef(null);

	const [selectedAmenity, setSelectedAmenity] = React.useState('');
	const [quantity, setQuantity] = React.useState(1);
	const [imgSrc, setImgSrc] = React.useState('');
	const [crop, setCrop] = React.useState();
	const [completedCrop, setCompletedCrop] = React.useState();
	const [openCropDialog, setOpenCropDialog] = React.useState(false);
	const imgRef = React.useRef(null);
	const aspect = 16 / 9;

	const handleUploadClick = React.useCallback(() => {
		if (fileInputRef.current) {
			fileInputRef.current.value = null;
			fileInputRef.current.click();
		}
	}, []);

	const handleFileChange = React.useCallback((event) => {
		if (event.target.files && event.target.files.length > 0) {
			const file = event.target.files[0];
			setCrop(undefined);
			const reader = new FileReader();
			reader.addEventListener('load', () => {
				setImgSrc(reader.result?.toString() || '');
				setOpenCropDialog(true);
			});
			reader.readAsDataURL(file);
		}
	}, []);

	const onImageLoad = React.useCallback((e) => {
		if (aspect) {
			const width = e.currentTarget.width;
			const height = e.currentTarget.height;
			setCrop(centerAspectCrop(width, height, aspect));
		}
	}, [aspect]);

	const handleCropChange = React.useCallback((_, percentCrop) => {
		setCrop(percentCrop);
	}, []);

	const handleCropComplete = React.useCallback((c) => {
		setCompletedCrop(c);
	}, []);

	const handleSaveCrop = React.useCallback(async () => {
		if (completedCrop && imgRef.current) {
			const image = imgRef.current;
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			if (!ctx) return;

			const scaleX = image.naturalWidth / image.width;
			const scaleY = image.naturalHeight / image.height;
			const pixelRatio = window.devicePixelRatio;

			canvas.width = Math.floor(completedCrop.width * scaleX * pixelRatio);
			canvas.height = Math.floor(completedCrop.height * scaleY * pixelRatio);

			ctx.scale(pixelRatio, pixelRatio);
			ctx.imageSmoothingQuality = 'high';

			const cropX = completedCrop.x * scaleX;
			const cropY = completedCrop.y * scaleY;
			const cropWidth = completedCrop.width * scaleX;
			const cropHeight = completedCrop.height * scaleY;

			ctx.drawImage(
				image,
				cropX,
				cropY,
				cropWidth,
				cropHeight,
				0,
				0,
				completedCrop.width * scaleX,
				completedCrop.height * scaleY,
			);

			canvas.toBlob((blob) => {
				if (!blob) return;
				const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
				if (onImageChange) {
					onImageChange(file);
				}
				setOpenCropDialog(false);
			}, 'image/jpeg');
		} else {
			setOpenCropDialog(false);
		}
	}, [completedCrop, onImageChange]);

	const handleCloseCrop = React.useCallback(() => {
		setOpenCropDialog(false);
		setImgSrc('');
	}, []);

	const handleAmenityChange = React.useCallback((value) => {
		setSelectedAmenity(value);
	}, []);

	const handleQuantityChange = React.useCallback((e) => {
		const val = e.target.value;
		if (val === '') {
			setQuantity('');
			return;
		}
		const numVal = parseInt(val, 10);
		if (!Number.isNaN(numVal)) {
			if (numVal > 1000) {
				setQuantity(1000);
			} else if (numVal >= 1) {
				setQuantity(numVal);
			}
		}
	}, []);

	const handleQuantityKeyDown = React.useCallback((e) => {
		if (e.key === '-' || e.key === 'e') {
			e.preventDefault();
		}
	}, []);

	const handleAddClick = React.useCallback(() => {
		if (!selectedAmenity) return;
		const qty = Number(quantity);
		if (Number.isNaN(qty) || qty < 1) return;

		if (onAddEquipment) {
			onAddEquipment({
				id: Date.now().toString(),
				name: selectedAmenity,
				quantity: qty,
			});
		}

		setSelectedAmenity('');
		setQuantity(1);
	}, [selectedAmenity, quantity, onAddEquipment]);

	const totalQuantity = React.useMemo(() => {
		return (fields || []).reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);
	}, [fields]);

	return (
		<SectionContainer>
			<HeaderRow>
				<HeaderLeft>
					{/* <SectionHeaderIcon /> */}
					<SectionTitle variant="h6" noWrap>THÔNG TIN PHÒNG HỌP</SectionTitle>
				</HeaderLeft>
				<RightColumnTitle>TIỆN ÍCH PHÒNG</RightColumnTitle>
			</HeaderRow>

			<ColumnsGrid container spacing={3}>
				<SkyGrid item xs={12} md={7}>
					<LeftColumn>
						<ImageContainer>
							<input
								type="file"
								accept="image/*"
								hidden
								ref={fileInputRef}
								onChange={handleFileChange}
							/>
							<ImageUploadBox>
								{layoutImagePreview ? (
									<>
										<PreviewImage src={layoutImagePreview} alt="Preview" />
										<ActionButtons>
											<Button variant="primary" startIcon={<FileUploadOutlinedIcon />} onClick={handleUploadClick}>
												Thay ảnh
											</Button>
											<Button variant="error" onClick={onImageRemove}>
												Xóa
											</Button>
										</ActionButtons>
									</>
								) : (
									<ImageHint>
										<UploadIcon />
										<SecondaryText variant="body2">
											Kéo thả hoặc nhấp để tải hình ảnh
										</SecondaryText>
										<SecondaryText variant="caption">
											WEBP, PNG, JPG, GIF (tối đa 5MB)
										</SecondaryText>
										<Button variant="primary" startIcon={<FileUploadOutlinedIcon />} onClick={handleUploadClick}>
											Chọn ảnh
										</Button>
									</ImageHint>
								)}
							</ImageUploadBox>
						</ImageContainer>

						<EquipmentSection>
							<InputsGrid container spacing={2}>
								<SkyGrid item xs={12} sm={5}>
									<FormLabel>TÊN THIẾT BỊ</FormLabel>
									<InputComponents
										select
										fullWidth
										options={amenityOptions}
										customLabel="label"
										customValue="value"
										value={selectedAmenity}
										onChange={handleAmenityChange}
										size="normal"
									/>
								</SkyGrid>

								<SkyGrid item xs={6} sm={4}>
									<FormLabel>SỐ LƯỢNG</FormLabel>
									<InputComponents
										type="number"
										fullWidth
										value={quantity}
										onChange={handleQuantityChange}
										onKeyDown={handleQuantityKeyDown}
										inputProps={{ min: 1, max: 1000 }}
										size="normal"
									/>
								</SkyGrid>

								<EquipmentActionItemAlign item xs={6} sm={3}>
									<Button
										variant="primary"
										fullWidth
										onClick={handleAddClick}
										startIcon={<SwapHorizIcon />}
										disabled={!selectedAmenity}
									>
										+ THÊM
									</Button>
								</EquipmentActionItemAlign>
							</InputsGrid>
						</EquipmentSection>

						<FormFieldsBox >
							<FormFieldRow>
								<FieldLabel>TÊN PHÒNG HỌP<IconRequied component="span">*</IconRequied></FieldLabel>
								<FieldControl>
									<Controller
										name="roomName"
										control={control}
										render={({ field }) => (
											<InputComponents
												{...field}
												required
												fullWidth
												error={!!errors.roomName}
												helperText={errors.roomName?.message}
												size="normal"
											/>
										)}
									/>
								</FieldControl>
							</FormFieldRow>

							<FormFieldRow>
								<FieldLabel>ĐỊA ĐIỂM<IconRequied component="span">*</IconRequied></FieldLabel>
								<FieldControl>
									<Controller
										name="location"
										control={control}
										render={({ field }) => (
											<InputComponents
												{...field}
												required
												fullWidth
												error={!!errors.location}
												helperText={errors.location?.message}
												size="normal"
											/>
										)}
									/>
								</FieldControl>
							</FormFieldRow>

							<FormFieldRow>
								<FieldLabel>SỨC CHỨA<IconRequied component="span">*</IconRequied></FieldLabel>
								<FieldControl>
									<Controller
										name="capacity"
										control={control}
										render={({ field }) => (
											<InputComponents
												{...field}
												required
												type="number"
												fullWidth
												error={!!errors.capacity}
												helperText={errors.capacity?.message}
												size="normal"
											/>
										)}
									/>
								</FieldControl>
							</FormFieldRow>

							<FormFieldRow>
								<FieldLabel>TRẠNG THÁI<IconRequied component="span">*</IconRequied></FieldLabel>
								<FieldControl>
									<StatusInput
										control={control}
										InputComponents={InputComponents}
										stageOptions={stageOptions}
										currentStage={currentStage}
										onShowWarning={onShowWarning}
										errors={errors}
										isEditMode={isEditMode}
										onValidateAvailability={onValidateAvailability}
									/>
								</FieldControl>
							</FormFieldRow>
							<FormFieldRow>
								<FieldLabel>SẮP XẾP<IconRequied component="span">*</IconRequied></FieldLabel>
								<FieldControl>
									<Controller
										name="order"
										control={control}
										render={({ field }) => (
											<InputComponents
												{...field}
												required
												type="number"
												fullWidth
												error={!!errors.order}
												helperText={errors.order?.message}
												size="normal"
											/>
										)}
									/>
								</FieldControl>
							</FormFieldRow>
						</FormFieldsBox>
					</LeftColumn>
				</SkyGrid>

				<SkyGrid item xs={12} md={5}>
					<RightColumn>
						<EquipmentCard>
							<EquipmentTableHeader>
								<div>Tên thiết bị</div>
								<div>Số lượng</div>
								<div>Hành động</div>
							</EquipmentTableHeader>
														<EquipmentList>
								{Array.isArray(fields) && fields.length > 0 ? (
									fields.map((item, index) => (
										<EquipmentListRow
											key={item.id || index}
											item={item}
											index={index}
											amenityOptions={amenityOptions}
											onRemoveEquipment={onRemoveEquipment}
										/>
									))
								) : (
									<EmptyText variant="body2">Chưa có thiết bị nào</EmptyText>
								)}
							</EquipmentList>
							<EquipmentFooter>
								<PrimaryText variant="body2">
									Tổng: {totalQuantity} thiết bị
								</PrimaryText>
							</EquipmentFooter>
						</EquipmentCard>
					</RightColumn>
				</SkyGrid>
			</ColumnsGrid>

			<CustomDialog
				onClose={handleCloseCrop}
				open={openCropDialog}
				title="Cắt ảnh"
				fullWidth
				onSave={handleSaveCrop}
			>
				<DialogContent>
					<CropContainer>
						{!!imgSrc && (
							<ReactCrop
								crop={crop}
								onChange={handleCropChange}
								onComplete={handleCropComplete}
								aspect={aspect}
							>
								<CropImg
									ref={imgRef}
									alt="Crop me"
									src={imgSrc}
									onLoad={onImageLoad}
								/>
							</ReactCrop>
						)}
					</CropContainer>
				</DialogContent>
			</CustomDialog>
		</SectionContainer>
	);
};

export default withSharedComponents(RoomInfoSection);

