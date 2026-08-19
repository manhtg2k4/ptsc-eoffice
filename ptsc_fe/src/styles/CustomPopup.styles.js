import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogTitle,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";

export const StyledDialog = styled(Dialog, {
  shouldForwardProp: (prop) => prop !== "dialogSize",
})(({ theme, dialogSize }) => ({
  "& .MuiDialog-paper": {
    width: "100%",
    // Áp dụng maxWidth dựa trên breakpoint của theme
    maxWidth:
      theme.breakpoints.values[dialogSize] || theme.breakpoints.values.lg,
  },
}));

export const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  fontWeight: theme.typography.h6.fontWeight,
  fontSize: theme.typography.h6.fontSize,
  padding: theme.spacing(2),
}));

export const StyledDialogActions = styled(DialogActions)(({ theme }) => ({
  padding: theme.spacing(1, 3, 2, 3),
  gap: theme.spacing(1),
}));

export const CancelButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.error.main,
  color: theme.palette.error.contrastText,
  "&:hover": {
    backgroundColor: theme.palette.error.dark,
  },
}));

export const SaveButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== "colorType",
})(({ theme, colorType }) => ({
  backgroundColor:
    colorType === "error"
      ? theme.palette.error.main
      : theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  "&:hover": {
    backgroundColor:
      colorType === "error"
        ? theme.palette.error.dark
        : theme.palette.primary.dark,
  },
}));

export const CountText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontWeight: theme.typography.h6.fontWeight || 600,
  margin: 0, // loại margin mặc định
}));

// Tiêu đề nhỏ
export const SubTitle = styled(Typography)(({ theme }) => ({
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(1),
  fontWeight: theme.typography.subtitle1.fontWeight,
  fontSize: theme.typography.subtitle1.fontSize,
  color: theme.palette.text.secondary,
}));

export const ContentWrapper = styled(Box)(({ theme }) => ({
  padding: theme.spacing(0, 3, 2, 3), // tương đương padding: "0 24px 16px 24px"
}));
