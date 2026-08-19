import React from 'react';
import { styled, useTheme } from '@mui/material/styles';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import GroupsIcon from '@mui/icons-material/Groups';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { SkyBox, SkyTypography } from '@styles/SkyStyles';
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';

const SectionCard = styled(SkyBox)(({ theme }) => ({
	backgroundColor: theme.palette.background.paper,
	borderRadius: '4px',
	padding: "0 16px",
	border: 'none',
	boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
	display: 'flex',
	flexDirection: 'column',
	gap: theme.spacing(1.75),
}));

const SectionTitle = styled(SkyTypography)(({ theme }) => ({
	fontSize: '0.95rem',
	fontWeight: 700,
	color: theme.palette.text.primary,
	textTransform: 'uppercase',
	letterSpacing: '0.02em',
}));

const HeroImageBox = styled(SkyBox)(({ theme }) => ({
	width: '100%',
	aspectRatio: '16 / 9',
	minHeight: '220px',
	borderRadius: '4px',
	overflow: 'hidden',
	border: `1px solid ${theme.palette.divider}`,
	backgroundColor: theme.palette.action.hover,
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
}));

const StyledImage = styled(AuthImage)({
	width: '100%',
	height: '100%',
	objectFit: 'cover',
});

const DetailList = styled(SkyBox)(({ theme }) => ({
	display: 'flex',
	flexDirection: 'column',
	gap: theme.spacing(1.25),
}));

const InfoRow = styled(SkyBox)(({ theme }) => ({
	display: 'grid',
	gridTemplateColumns: '150px minmax(0, 1fr)',
	alignItems: 'start',
	gap: theme.spacing(1.5),
	[theme.breakpoints.down('sm')]: {
		gridTemplateColumns: '1fr',
		gap: theme.spacing(0.5),
	},
}));

const InfoLabel = styled(SkyTypography)(({ theme }) => ({
	fontSize: '0.8rem',
	color: theme.palette.text.secondary,
	textTransform: 'uppercase',
	letterSpacing: '0.02em',
	fontWeight: 600,
}));

const InfoValue = styled(SkyTypography)(({ theme }) => ({
	fontSize: '0.92rem',
	color: theme.palette.text.primary,
	fontWeight: 500,
	lineHeight: 1.5,
	wordBreak: 'break-word',
}));

const ValueRow = styled(SkyBox)(({ theme }) => ({
	display: 'flex',
	alignItems: 'center',
	gap: theme.spacing(1),
	minWidth: 0,
}));

const IconWrapper = styled(SkyBox)(({ theme }) => ({
	display: 'flex',
	alignItems: 'center',
	color: theme.palette.text.secondary,
	flexShrink: 0,
}));

const LocationIconStyled = styled(LocationOnIcon)({
	fontSize: '1.15rem',
});

const GroupsIconStyled = styled(GroupsIcon)({
	fontSize: '1.15rem',
});

const StatusDot = styled(FiberManualRecordIcon)(({ dotcolor }) => ({
	fontSize: '1rem',
	color: dotcolor || '#e0e0e0',
}));

const PlaceholderText = styled(SkyTypography)(({ theme }) => ({
	color: theme.palette.text.secondary,
	fontSize: '0.85rem',
}));

const RoomInfoSectionForView = ({ data, hideTitle = false }) => {
	const theme = useTheme();

	const getStatusInfo = (stage, currentTheme) => {
		const statusId = Number(stage);

		switch (statusId) {
			case 1:
				return { label: 'Sẵn sàng sử dụng', color: '#2e7d32' };
			case 2:
				return { label: 'Bảo trì', color: '#d32f2f' };
			default:
				return { label: 'Chưa xác định', color: currentTheme.palette.text.disabled };
		}
	};

	const statusInfo = getStatusInfo(data?.stage, theme);

	return (
		<SectionCard>
			{!hideTitle && <SectionTitle>Thông tin phòng họp</SectionTitle>}

			<HeroImageBox>
				{data?.image ? (
					<StyledImage src={data.image} alt="Room Preview" />
				) : (
					<PlaceholderText>Không có hình ảnh</PlaceholderText>
				)}
			</HeroImageBox>

			<DetailList>
				<InfoRow>
					<InfoLabel>Tên phòng họp</InfoLabel>
					<InfoValue>{data?.roomName || 'PHÒNG HỘI NGHỊ MỚI'}</InfoValue>
				</InfoRow>

				<InfoRow>
					<InfoLabel>Địa điểm</InfoLabel>
					<ValueRow>
						<IconWrapper>
							<LocationIconStyled />
						</IconWrapper>
						<InfoValue>{data?.location || 'Chưa xác định'}</InfoValue>
					</ValueRow>
				</InfoRow>

				<InfoRow>
					<InfoLabel>Sức chứa</InfoLabel>
					<ValueRow>
						<IconWrapper>
							<GroupsIconStyled />
						</IconWrapper>
						<InfoValue>{data?.capacity || 0}</InfoValue>
					</ValueRow>
				</InfoRow>

				<InfoRow>
					<InfoLabel>Sắp xếp</InfoLabel>
					<ValueRow>
						<InfoValue>{data?.order ?? 1}</InfoValue>
					</ValueRow>
				</InfoRow>

				<InfoRow>
					<InfoLabel>Trạng thái</InfoLabel>
					<ValueRow>
						<StatusDot dotcolor={statusInfo.color} />
						<InfoValue>{statusInfo.label}</InfoValue>
					</ValueRow>
				</InfoRow>
			</DetailList>
		</SectionCard>
	);
};

export default RoomInfoSectionForView;
