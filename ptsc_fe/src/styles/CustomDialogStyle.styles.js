// src/components/CustomDialog.styles.js
import { styled } from "@mui/material/styles";
import {
  Dialog,
  DialogTitle,
  DialogActions,
  Button,
  DialogContent,
} from "@mui/material";

// CustomDialog.styles.js
// export const StyledDialog = styled(Dialog, {
//   shouldForwardProp: (prop) => prop !== "dialogSize" && prop !== "dialogHeight",
// })(({ theme, dialogSize, dialogHeight }) => ({
//  "--dialog-height": dialogHeight || "auto",

//   "& .MuiPaper-root": {
//     borderRadius: theme.shape.borderRadius,
//     width: "100%",
//     maxWidth: theme.breakpoints.values[dialogSize] || "sm",

//     // Chỉ set height cố định KHI có $height, còn lại để auto
//     height: dialogHeight  ? "var(--dialog-height)" : "auto",
//     maxHeight: "90vh", // ← Giới hạn tối đa 90% màn hình
//     display: "flex",
//     flexDirection: "column",
//   },
// }));
export const StyledDialog = styled(Dialog, {
  shouldForwardProp: (prop) => prop !== "dialogSize" && prop !== "dialogHeight",
})(({ theme, dialogSize, dialogHeight }) => ({
  "& .MuiPaper-root": {
    borderRadius: theme.shape.borderRadius,
    width: "100%",
    maxWidth: theme.breakpoints.values[dialogSize] || "sm",

    // Chỉ set height khi có dialogHeight
    height: dialogHeight || "auto",
    minHeight: dialogHeight ? "620px" : "auto", // thêm minHeight để nội dung ít vẫn giữ form đẹp
    maxHeight: "90vh",
    
    display: "flex",
    flexDirection: "column",
    
    // QUAN TRỌNG: cho phép Popper của Autocomplete "tràn" ra ngoài
    overflow: "visible !important",
  },
}));

export const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  fontSize: theme.typography.h6.fontSize,
  fontWeight: theme.typography.h6.fontWeight,
  // Logic chọn màu chữ: Luôn ưu tiên cấu hình, nếu không có thì mặc định là màu trắng.
  color: theme.palette.dialog?.headerColor || "#ffffff",

  // Logic chọn màu nền:
  // 1. Ưu tiên màu đã cấu hình.
  // 2. Nếu không có:
  //    - Chế độ tối: Dùng màu nền giấy (background.paper).
  //    - Chế độ sáng: Dùng màu chính (primary.main).
  backgroundColor:
    theme.palette.dialog?.headerBackground ||
    (theme.palette.mode === "dark"
      ? theme.palette.background.paper
      : theme.palette.primary.main),
  borderBottom: `1px solid ${theme.palette.divider}`, // Sử dụng màu divider từ theme
}));

// export const StyledDialogContent = styled(DialogContent)(() => ({
//   height: "var(--dialog-content-height, auto)", // Sử dụng biến CSS
//   overflowY: "auto",
//   paddingTop: "20px !important",
// }));
export const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  flex: "1 1 auto",           // Chiếm hết phần còn lại sau Title + Actions
  minHeight: 0,               // Cho phép co lại khi nội dung ít
  overflowY: "auto",
  padding: theme.spacing(3),
  paddingTop: "20px !important",

  // Đảm bảo Popper của Autocomplete không bị cắt
  "& .MuiAutocomplete-popper": {
    zIndex: theme.zIndex.modal + 1,
  },
}));

export const DeleteButton = styled(Button)(({ theme }) => ({
  variant: "contained",
  backgroundColor: theme.palette.error.main,
  color: "#ffffff",
  "&:hover": { backgroundColor: theme.palette.error.dark },
}));

export const StyledDialogActions = styled(DialogActions)(({ theme }) => ({
  padding: theme.spacing(2), // Sử dụng spacing từ theme
  display: "flex",
  justifyContent: "center !important",
}));

export const CancelButton = styled(Button)(({ theme }) => ({
  mr: 1,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export const SaveButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== "colorType",
})(({ theme, colorType }) => ({
  backgroundColor:
    colorType === "error"
      ? theme.palette.error.main
      : theme.palette.primary.main,
  color: "#ffffff", // Luôn là màu trắng
  "&:hover": {
    backgroundColor:
      colorType === "error"
        ? theme.palette.error.dark
        : theme.palette.primary.dark,
  },
}));
