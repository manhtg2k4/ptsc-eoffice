import React from 'react';
import { Dialog, DialogContent, DialogTitle, Typography, Box, useMediaQuery, styled } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

// Styled Dialog with backdrop blur
const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiBackdrop-root': {
    backdropFilter: 'blur(8px)',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  '& .MuiPaper-root': {
    margin: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.spacing(1),
    minWidth: '300px',
    maxWidth: '600px',
    width: '90%',
  },
}));

// Styled Dialog Title với màu warning
const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  backgroundColor: theme.palette.warning.light,
  color: theme.palette.warning.contrastText,
}));

// Styled Dialog Content
const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  marginTop: theme.spacing(2),
  textAlign: 'center',
}));

// Wrapper Box cho content
const ContentBox = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(2),
}));

// Text phụ
const SecondaryText = styled(Typography)(({ theme }) => ({
  marginTop: theme.spacing(1),
  color: theme.palette.text.secondary,
}));

/**
 * Component hiển thị thông báo giao diện không hỗ trợ cho màn hình nhỏ hơn 1440px
 */
function UnsupportedViewDialog() {
  // Kiểm tra màn hình nhỏ hơn 1440px
  const isSmallScreen = useMediaQuery('(max-width:1350px)');

  return (
    <StyledDialog
      open={isSmallScreen}
      disableEscapeKeyDown
      aria-labelledby="unsupported-view-dialog-title"
    >
      <StyledDialogTitle>
        <WarningAmberIcon />
        <Typography variant="h6" component="span">
          Thông báo
        </Typography>
      </StyledDialogTitle>
      <StyledDialogContent>
        <ContentBox>
          <Typography variant="body1" gutterBottom>
            Giao diện hiện không hỗ trợ trên thiết bị di động
          </Typography>
          <SecondaryText variant="body2">
            Vui lòng sử dụng máy tính bảng hoặc máy tính để xem nội dung này
          </SecondaryText>
        </ContentBox>
      </StyledDialogContent>
    </StyledDialog>
  );
}

export default UnsupportedViewDialog;

