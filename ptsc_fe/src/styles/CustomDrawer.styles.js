import {
  Box,
  Button,
  IconButton,
  SwipeableDrawer,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";

export const StyledDrawer = styled(SwipeableDrawer)(({ theme }) => ({
  "& .MuiDrawer-paper": {
    width: `calc(100% - ${theme.layout.mainNavWidth})`,
    height: "100%",
    padding: 0,
  },
}));

export const DrawerContainer = styled(Box)({
  display: "flex",
  flexDirection: "column",
  height: "100%",
});

export const DrawerHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: theme.spacing(1.5),
  // ✅ Sửa lỗi: Sử dụng màu nền và màu chữ từ cấu hình dialog của theme
  backgroundColor:
    theme.palette.dialog?.headerBackground ||
    (theme.palette.mode === "dark"
      ? theme.palette.background.paper
      : theme.palette.primary.main),
  color:
    theme.palette.dialog?.headerColor || theme.palette.primary.contrastText,
  marginBottom: theme.spacing(1),
  minHeight: theme.layout.drawerHeaderHeight,
}));

export const HeaderLeftContainer = styled(Box)({
  display: "flex",
  alignItems: "center",
});

export const CloseButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.dialog?.headerColor || theme.palette.primary.contrastText,
  marginRight: theme.spacing(1),
  padding: "5px", // Tương đương size="small"
}));

export const DrawerTitle = styled(Typography)(({ theme }) => ({
  flex: 1,
  textAlign: "center",
  margin: 0,
  fontWeight: theme.typography.drawerTitle?.fontWeight || 600, // Sử dụng optional chaining và giá trị mặc định
  fontSize: theme.typography.drawerTitle?.fontSize || "1.25rem", // Sử dụng optional chaining và giá trị mặc định
}));

export const ActionsContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1),
}));

export const ActionButton = styled(Button)(({ theme }) => ({
  borderColor: theme.palette.dialog?.headerColor || theme.palette.primary.contrastText,
  color: theme.palette.dialog?.headerColor || theme.palette.primary.contrastText,
  textTransform: "none",
  padding: "3px 9px", // Tương đương size="small"
  borderWidth: "1px",
  borderStyle: "solid",
  "&:hover": {
    borderColor: theme.palette.dialog?.headerColor || theme.palette.primary.contrastText,
    backgroundColor: theme.palette.action.hoverDrawerButton,
  },
}));
