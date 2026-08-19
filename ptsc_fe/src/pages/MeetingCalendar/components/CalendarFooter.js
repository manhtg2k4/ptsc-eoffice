import React from 'react';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const statusColors = [
  { label: 'Dự kiến', color: '#E3F2FD', border: '#42A5F5' },
  { label: 'Chuẩn bị', color: '#BBDEFB', border: '#1E88E5' },
  { label: 'Đang họp', color: '#C8E6C9', border: '#2E7D32' },
  { label: 'Kết thúc', color: '#B2DFDB', border: '#00897B' },
  { label: 'Bổ sung', color: '#FFE0B2', border: '#FB8C00' },
  { label: 'Hủy', color: '#FFCDD2', border: '#E53935' }
];

const FooterContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: theme.spacing(2),
  paddingTop: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
}));

const NoteSection = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
});

const LegendSection = styled(Box)({
  maxWidth: 320,
  minWidth: 220, // Increased width to accommodate 3 columns comfortably
});

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  marginBottom: theme.spacing(1),
  fontSize: '1.1rem', // Slightly larger as in image
}));

const StatusList = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
}));

const StatusItem = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  width: '46%', // ~3 columns
});

const ColorBox = styled(Box)(({ $mainColor, $sideColor }) => ({
  width: 32,
  height: 20,
  borderRadius: 4,
  backgroundColor: $mainColor,
  marginRight: 12,
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: $sideColor,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  }
}));

export default function CalendarFooter() {
  return (
    <FooterContainer>
      {/* LEFT - Ghi chú */}
      <NoteSection>
        <SectionTitle>
          Ghi chú:
        </SectionTitle>
        <Typography variant="body2">
          Lãnh đạo đi công tác địa điểm thời gian
        </Typography>
        <Typography variant="body2">
          Lãnh đạo đi công tác địa điểm thời gian
        </Typography>
        <Typography variant="body2">
          Lãnh đạo đi công tác địa điểm thời gian
        </Typography>
        <Typography variant="body2">
          Lãnh đạo đi công tác địa điểm thời gian
        </Typography>
      </NoteSection>

      {/* RIGHT - Legend màu */}
      <LegendSection>
        <SectionTitle>
          Màu trạng thái lịch :
        </SectionTitle>

        <StatusList>
          {statusColors.map((item, index) => 
            item.spacer ? (
              <StatusItem key={`spacer-${index}`} />
            ) : (
              <StatusItem key={item.label}>
                <ColorBox $mainColor={item.color} $sideColor={item.border} />
                <Typography variant="body2">
                  {item.label}
                </Typography>
              </StatusItem>
            )
          )}
        </StatusList>
      </LegendSection>
    </FooterContainer>
  );
}
