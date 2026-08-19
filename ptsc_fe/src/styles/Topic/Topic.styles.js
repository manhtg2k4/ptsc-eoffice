import { styled } from '@mui/material/styles';
import { Box, FormControlLabel } from '@mui/material';
import { SkyFormLabel } from '@styles/SkyStyles';

export const FormContainer = styled(Box)(() => ({
  //   padding: theme.spacing(2, 0)
}));

export const FormSection = styled(Box)(({ theme }) => ({
  //   marginBottom: theme.spacing(3),
  padding: theme.spacing(2.5),
  //   backgroundColor: theme.palette.background.default,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius
}));

export const SectionTitle = styled('h3')(({ theme }) => ({
  margin: theme.spacing(0, 0, 2.5, 0),
  fontSize: theme.typography.h6.fontSize,
  fontWeight: theme.typography.h6.fontWeight,
  color: theme.palette.text.primary
}));

export const FormRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(2.5)
}));

export const FormRowAlignStart = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(2.5),
  alignItems: 'flex-start'
}));

export const FormField = styled(Box)({
  flex: 1
});

export const StyledFormLabel = styled(SkyFormLabel)(({ theme }) => ({
  fontSize: '13px',
  fontWeight: 600,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(0.25),
  marginTop: theme.spacing(-0.25),
  '&.Mui-focused': {
    color: theme.palette.primary.main
  },
  "&.Mui-disabled": {
    backgroundColor:
      theme.components?.MuiOutlinedInput?.styleOverrides?.root?.[
        "&.Mui-disabled"
      ]?.backgroundColor ||
      (theme.palette.mode === "dark" ? "#334155" : "#F5F7FA"),

    color:
      theme.components?.MuiOutlinedInput?.styleOverrides?.input?.[
        "&.Mui-disabled"
      ]?.color ||
      (theme.palette.mode === "dark" ? "#94a3b8" : "#757575") ||
      theme.palette.text.disabled,
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: theme.palette.divider,
    },
  },
}));

export const FormFieldHalf = styled(Box)(({ theme }) => ({
  flex: '0 0 calc(50% - ' + theme.spacing(1) + ')'
}));

export const StyledFormControlLabel = styled(FormControlLabel)(({ theme }) => ({
  marginRight: theme.spacing(5)
}));
