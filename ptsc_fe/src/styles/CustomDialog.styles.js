// src/components/CustomDialog.styles.js
import { styled } from "@mui/material/styles";
import {
  Dialog,
  DialogTitle,
  DialogActions,
  Button,
  DialogContent,
} from "@mui/material";
import { PageTitle } from "./ThemeConfig.styles";

// CustomDialog.styles.js
const dialogSizeMap = {
  xs: 444,
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1536,
};

export const StyledDialog = styled(Dialog, {
  shouldForwardProp: (prop) => prop !== "dialogSize" && prop !== "$height",
})(({ theme, dialogSize, isheight }) => ({
  "--dialog-height": isheight || "auto",

  "& .MuiPaper-root": {
    borderRadius: theme.shape.borderRadius,
    width: "100%",
    maxWidth: dialogSizeMap[dialogSize] ?? dialogSizeMap["sm"],

    // Chỉ set height cố định KHI có $height, còn lại để auto
    height: isheight ? "var(--dialog-height)" : "auto",
    maxHeight: "90vh", // ← Giới hạn tối đa 90% màn hình
    display: "flex",
    flexDirection: "column",
  },
}));

export const StyledDialogTitle = styled(DialogTitle, {
  shouldForwardProp: (prop) => prop !== "titleAlign",
})(({ theme, titleAlign, textTransformTitle }) => ({
  fontSize: "1.2rem",
  fontWeight: "bold",
  textAlign: titleAlign || "center", // Mặc định căn giữa
  color: theme.palette.primary.main, // Màu chữ xanh blue
  backgroundColor: theme.palette.mode === "dark" ? theme.palette.background.default : "#f0f4f8", // Màu nền thanh tiêu đề
  borderBottom: `1px solid ${theme.palette.divider}`,
  padding: "16px 24px",
  position: "relative", // Để định vị nút close
	textTransform: textTransformTitle || 'none',
}));

export const CloseIconButton = styled(Button)(({theme}) => ({
  position: "absolute",
  right: 8,
  top: 8,
  minWidth: "auto",
  padding: 8,
  color: "#4b84c5",
  "&:hover": {
    backgroundColor: theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
  },
}));

export const StyledDialogTitleViewFile = styled(DialogTitle, {
shouldForwardProp: (prop) => prop !== "titleAlign",
})(({ theme, titleAlign }) => ({
  fontSize: "1.2rem",
  fontWeight: "bold",
  textAlign: titleAlign || "center", // Mặc định căn giữa
  color: "#ffffff", // Màu chữ trắng
  backgroundColor: theme.palette.dialog?.headerBackground, // Màu nền xanh đậm (primary)
  borderBottom: `1px solid ${theme.palette.divider}`,
  padding: "16px 24px",
  position: "relative", // Để định vị nút close
}));

export const CloseIconButtonViewFile = styled(Button)(() => ({
  position: "absolute",
  right: 8,
  top: 8,
  minWidth: "auto",
  padding: 8,
  color: "#ffffff", // Đổi sang màu trắng để nổi trên nền xanh
  "&:hover": {
    backgroundColor: "rgba(255, 255, 255, 0.1)", // Hiệu ứng hover nhẹ trên nền xanh
  },
}));

export const StyledDialogContent = styled(DialogContent)(({ unsetPaddingTop }) => ({
  height: "var(--dialog-content-height, auto)", // Sử dụng biến CSS
  overflowY: "auto",
  paddingTop: unsetPaddingTop ? "unset" : "20px !important",
}));

export const DeleteButton = styled(Button)(({ theme }) => ({
  variant: "contained",
  backgroundColor: theme.palette.primary.main,
  color: "#ffffff",
  "&:hover": { backgroundColor: theme.palette.primary.dark },
}));

export const StyledDialogActions = styled(DialogActions)(({ theme }) => ({
  padding: theme.spacing(2), // Sử dụng spacing từ theme
  display: "flex",
  justifyContent: "end !important",
}));

// export const CancelButton = styled(Button)(({ theme }) => ({
//   marginRight: theme.spacing(1),
//   backgroundColor: "#ffffff",
//   color: theme.palette.error.main,
//   border: `1px solid ${theme.palette.error.main}`,
//   textTransform: "uppercase",
//   fontWeight: "bold",
//   // "&:hover": {
//   //   backgroundColor: theme.palette.error.dark,
//   //   border: `1px solid ${theme.palette.error.dark}`,
//   // },
// }));
export const CancelButton = styled(Button)(({ theme, notUppercase }) => ({
  marginRight: theme.spacing(1),
  backgroundColor: theme.palette.error.main,
  color: theme.palette.error.contrastText,
  textTransform: notUppercase ? "none" : "uppercase",
  fontWeight: notUppercase ? "normal" : "bold",
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
  color: "#ffffff",
  textTransform: "uppercase",
  fontWeight: "bold",
  "&:hover": {
    backgroundColor:
      colorType === "error"
        ? theme.palette.error.dark
        : theme.palette.primary.dark,
  },
  "&.Mui-disabled": {
      backgroundColor: theme.palette.action.disabledBackground,
      color: theme.palette.action.disabled,
   },
  "& .MuiSvgIcon-root": {
    color: "inherit",
  },
}));

// Styled Dialog cho LoadingDialog - không có box-shadow
export const StyledLoadingDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiPaper-root": {
    borderRadius: theme.shape.borderRadius,
    boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },
}));

export const StyledContentPopupViewed = styled(PageTitle)(() => ({
	textAlign: "center"
}));