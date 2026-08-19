import { Box, Typography, Button, RadioGroup, FormControlLabel } from '@mui/material';
import { styled } from '@mui/system';

export const StyledTitleBox = styled(Box)(() => ({
  backgroundColor: '#0061B0',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  padding: '12px 24px',
  borderTopLeftRadius: 4,
  borderTopRightRadius: 4,
}));

export const StyledTitleTypography = styled(Typography)(() => ({
  fontSize: '18px',
  fontWeight: 'bold',
}));

export const StyledContentBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
}));

export const StyledRadioGroup = styled(RadioGroup)(({ theme }) => ({
  flexDirection: 'row',
  gap: theme.spacing(10),
  justifyContent: 'flex-start',
  marginBottom: theme.spacing(1),
  marginLeft: theme.spacing(4),
}));

export const StyledFormControlLabel = styled(FormControlLabel)(() => ({
  '& .MuiTypography-root': {
    fontSize: '14px',
    fontWeight: 400,
  },
}));

export const StyledFormRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  alignItems: 'flex-start',
}));

export const StyledLabelContainer = styled(Box)({
  minWidth: '120px',
  display: 'flex',
  alignItems: 'flex-start',
  paddingTop: '8px',
});

export const StyledLabel = styled(Typography)({
  fontWeight: 400,
  fontSize: '14px',
});

export const StyledInputContainer = styled(Box)({
  flex: 1,
});

export const StyledFooterBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: theme.spacing(2),
  padding: theme.spacing(2, 3),
}));

export const ConfirmButton = styled(Button)(() => ({
  backgroundColor: '#0061B0',
  color: '#fff',
  textTransform: 'none',
  padding: '6px 20px',
  fontSize: '16px',
  fontWeight: 600,
  '&:hover': {
    backgroundColor: '#0052A3',
  },
}));

export const CloseButton = styled(Button)(() => ({
  backgroundColor: '#FF0000',
  color: '#fff',
  textTransform: 'none',
  padding: '6px 20px',
  fontSize: '16px',
  fontWeight: 600,
  '&:hover': {
    backgroundColor: '#CC0000',
  },
}));
