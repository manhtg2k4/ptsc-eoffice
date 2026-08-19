import { styled } from "@mui/material/styles";
import {
  Dialog,
  DialogTitle,
  DialogActions,
  Button,
  DialogContent,
  Box,
} from "@mui/material";

export const StyledDialog = styled(Dialog, {
  shouldForwardProp: (prop) => prop !== "dialogSize" && prop !== "isheight",
})(({ theme, dialogSize, isheight }) => ({
  "--dialog-height": isheight || "auto",
  "& .MuiPaper-root": {
    borderRadius: theme.shape.borderRadius,
    width: "100%",
    maxWidth: theme.breakpoints.values[dialogSize] || "sm",
    height: isheight ? "var(--dialog-height)" : "auto",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
  },
}));

export const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  fontSize: theme.typography.h6.fontSize,
  fontWeight: theme.typography.h6.fontWeight,
  color: theme.palette.mode === "dark" 
    ? "#ffffff" 
    : theme.palette.text.primary,
  backgroundColor: theme.palette.mode === "dark"
    ? theme.palette.background.paper
    : "#ffffff",
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

// ✅ THÊM MỚI: Container cho title với icon
export const TitleWithIcon = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  
  "& .title-icon": {
    display: "flex",
    alignItems: "center",
    fontSize: "20px",
    color: theme.palette.primary.main, // ← THÊM: Màu primary cho icon
  },
}));

export const StyledDialogContent = styled(DialogContent)(() => ({
  height: "var(--dialog-content-height, auto)",
  overflowY: "auto",
  paddingTop: "20px !important",
}));

export const StyledDialogActions = styled(DialogActions)(({ theme }) => ({
  padding: theme.spacing(2),
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderTop: `1px solid ${theme.palette.divider}`,
}));

export const ResetButton = styled(Button)(({ theme }) => ({
  variant: "outlined",
  color: theme.palette.text.primary,
  borderColor: theme.palette.divider,
  backgroundColor: "transparent",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
    borderColor: theme.palette.text.secondary,
  },
}));

export const CancelButton = styled(Button)(({ theme }) => ({
  variant: "outlined",
  color: theme.palette.text.primary,
  borderColor: theme.palette.divider,
  backgroundColor: "transparent",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
    borderColor: theme.palette.text.secondary,
  },
}));

export const SaveButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== "colorType",
})(({ theme, colorType }) => ({
  variant: "contained",
  backgroundColor:
    colorType === "error"
      ? theme.palette.error.main
      : theme.palette.primary.main,
  color: "#ffffff",
  "&:hover": {
    backgroundColor:
      colorType === "error"
        ? theme.palette.error.dark
        : theme.palette.primary.dark,
  },
}));

export const DeleteButton = styled(Button)(({ theme }) => ({
  variant: "contained",
  backgroundColor: theme.palette.error.main,
  color: "#ffffff",
  "&:hover": { backgroundColor: theme.palette.error.dark },
}));

export const StyledLoadingDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiPaper-root": {
    borderRadius: theme.shape.borderRadius,
    boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },
}));
