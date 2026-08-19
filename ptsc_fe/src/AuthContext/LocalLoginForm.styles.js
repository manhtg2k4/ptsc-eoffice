import { Box, TextField, Button, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export const FormContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  width: "100%",
}));

export const StyledTextField = styled(TextField)(({ theme }) => ({
  // Handle autofill styles
  "& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus":
    {
      WebkitBoxShadow: `0 0 0 100px ${theme.palette.background.paper} inset !important`,
      WebkitTextFillColor: `${theme.palette.text.primary} !important`,
      caretColor: theme.palette.text.primary,
      transition: "background-color 9999s ease-in-out 0s !important",
      backgroundClip: "content-box !important",
    },
  // Border styles
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.text.secondary,
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.primary.main,
  },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.primary.main,
  },
}));

export const SubmitButton = styled(Button)(() => ({
  // Các style chung cho nút submit
}));

export const ErrorTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.error.main,
  variant: "body2",
}));
