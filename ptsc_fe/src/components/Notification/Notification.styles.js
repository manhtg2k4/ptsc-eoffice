import { styled } from "@mui/material/styles";
import { Box, Typography, Badge, Button, Link, Drawer, IconButton, Divider } from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SettingsIcon from "@mui/icons-material/Settings";

// Style cho Drawer (thay thế PaperProps sx)
export const StyledDrawer = styled(Drawer)(({ theme }) => ({
  "& .MuiPaper-root": {
    width: 500,
    height: "calc(100vh - 70px)",
    top: "63px",
    borderRadius: "0px",
    display: "flex",
    flexDirection: "column",
    boxShadow: "none",
    border: "none",
    borderLeft: `1px solid ${theme.palette.divider}`,
    zIndex: 1200,
    [theme.breakpoints.down('sm')]: {
      width: '90vw',
    }
  }
}));

// Style cho header của popover
export const NotificationHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: theme.spacing(3, 3, 2, 3),
}));

export const HeaderTitleContainer = styled(Box)(() => ({
  display: "flex",
  flexDirection: "column",
  gap: "4px",
}));

export const HeaderSubtitle = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: "14px",
}));

export const CloseIconButton = styled(IconButton)(({ theme }) => ({
  marginTop: theme.spacing(-0.5),
  marginRight: theme.spacing(-0.5),
}));

export const CloseIconStyled = styled(CloseIcon)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontSize: "20px",
}));

// Style cho Badge để sử dụng màu error từ theme
export const NotificationBadge = styled(Badge)(({ theme }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
  },
}));

// Style cho icon thông báo trên thanh Navbar
export const StyledNotificationsIcon = styled(NotificationsIcon)(({ theme }) => ({
   color: theme.palette.common.white,
}));

export const BoxBT = styled(Box)(({ theme }) => ({
    display: "flex",
    gap: theme.spacing(1.5),
    padding: theme.spacing(1.5, 3),
}));

// Style cho tiêu đề "Thông báo"
export const HeaderTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  fontSize: "22px",
  color: theme.palette.text.primary,
}));

// Style cho container chứa danh sách thông báo (với thanh cuộn)
export const NotificationListContainer = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  overflowY: "auto",
  padding: theme.spacing(0, 3),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1.5),
  "&::-webkit-scrollbar": {
    width: "4px",
  },
  "&::-webkit-scrollbar-track": {
    backgroundColor: "transparent",
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: theme.palette.grey[300],
    borderRadius: "10px",
  },
  "&::-webkit-scrollbar-thumb:hover": {
    backgroundColor: theme.palette.grey[400],
  },
}));

// Style cho mỗi item trong danh sách thông báo
export const NotificationItem = styled(Box, {
  shouldForwardProp: (prop) => !["$isNew", "$isRead", "$type"].includes(prop),
})(({ theme, $isRead, $type }) => {
  const isDark = theme.palette.mode === "dark";

  const getBgColor = () => {
    if (isDark) return "transparent";
    if (!$isRead) {
      if ($type === "document") return "#fff1f1"; // Reddish for documents/urgent
      if ($type === "calendar") return "#fffbeb"; // Yellowish for meetings
      return "#f7faff";
    }
    return "transparent";
  };

  const getBorderColor = () => {
    if (isDark) return "rgba(255,255,255,0.1)";
    if (!$isRead) {
      if ($type === "document") return "#fee2e2";
      if ($type === "calendar") return "#fef3c7";
      return "#e2e8f0";
    }
    return "#f1f5f9";
  };

  return {
    display: "flex",
    gap: theme.spacing(2),
    position: "relative",
    padding: theme.spacing(2),
    cursor: "pointer",
    borderRadius: "16px",
    border: `1px solid ${getBorderColor()}`,
    transition: "all 0.2s ease",
    backgroundColor: getBgColor(),

    "&:hover": {
      backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f8fafc",
      transform: "translateY(-1px)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    },
  };
});

export const UnreadStatusDot = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$type",
})(({ theme, $type }) => ({
  position: 'absolute',
  top: theme.spacing(2.5),
  right: theme.spacing(2.5),
  width: 10,
  height: 10,
  borderRadius: '50%',
  backgroundColor: $type === 'calendar' ? '#fbbf24' : '#ef4444', // Yellow for calendar, Red for others
}));

export const NotificationIconWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$type",
})(({ theme, $type }) => ({
  width: 48,
  height: 48,
  borderRadius: '12px',
  backgroundColor: $type === 'default' ? '#f1f5f9' : theme.palette.primary.main,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  color: $type === 'default' ? theme.palette.text.secondary : 'white',
}));

export const NotificationItemIcon = styled('img')(() => ({
  width: 40,
  height: 40,
  objectFit: 'contain',
}));

export const NotificationContentWrapper = styled(Box)(({ theme }) => ({
  flex: 1,
  paddingRight: theme.spacing(3),
}));

// Style cho tiêu đề của mỗi mục thông báo
export const NotificationTitle = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "$isRead",
})(({ theme }) => ({
  fontWeight: 600,
  lineHeight: 1.4,
  fontSize: "15px",
  color: theme.palette.primary.dark,
  marginBottom: theme.spacing(0.5),
  wordBreak: "break-word",
}));

export const TabButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== "$isActive",
})(({ theme, $isActive }) => ({
  flex: 1,
  textTransform: "none",
  fontWeight: 600,
  fontSize: "15px",
  borderRadius: "12px",
  padding: theme.spacing(1, 2),
  transition: "all 0.2s ease",
  ...($isActive
    ? {
        backgroundColor: theme.palette.primary.main,
        color: "white",
        boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
        "&:hover": {
          backgroundColor: theme.palette.primary.dark,
        },
      }
    : {
        color: theme.palette.text.secondary,
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        "&:hover": {
          backgroundColor: theme.palette.action.hover,
          borderColor: theme.palette.grey[400],
        },
      }),
}));

export const MarkAllAsReadContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(0.5, 3, 1.5, 3),
  display: "flex",
  alignItems: "center",
}));

export const MarkAllAsReadButton = styled(Button)(({ theme }) => ({
  textTransform: "none",
  fontSize: "14px",
  fontWeight: 600,
  color: theme.palette.primary.main,
  padding: 0,
  "&:hover": {
    backgroundColor: "transparent",
    textDecoration: "underline",
  },
  "& .MuiButton-startIcon": {
    marginRight: "6px",
    "& svg": {
      fontSize: "18px",
    },
  },
}));

export const EmptyStateBox = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  padding: theme.spacing(6, 3),
  gap: theme.spacing(2),
  textAlign: "center",
}));

export const EndListMessageContainer = styled(EmptyStateBox)(({ theme }) => ({
  padding: theme.spacing(3, 3),
  opacity: 0.7,
}));

export const EmptyStateText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: "15px",
  fontWeight: 500,
  lineHeight: 1.6,
}));

export const EmptyStateIcon = styled(InfoOutlinedIcon)(({ theme }) => ({
  fontSize: "48px",
  color: theme.palette.grey[300],
}));

export const EndListIcon = styled(EmptyStateIcon)(() => ({
  fontSize: "32px",
}));

// Style cho nội dung text của thông báo
export const NotificationContent = styled(Typography)(({ theme }) => ({
  lineHeight: 1.5,
  fontSize: "14px",
  color: theme.palette.text.secondary,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  wordBreak: "break-word",
}));

// Style cho container chứa icon thời gian và text thời gian
export const TimeContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  marginTop: theme.spacing(1),
}));

export const StyledAccessTimeIcon = styled(AccessTimeIcon)(({ theme }) => ({
  fontSize: 16,
  color: theme.palette.text.disabled,
}));

// Style cho text thời gian
export const TimeText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.disabled,
  fontSize: "12px",
  fontWeight: 600,
  textTransform: "uppercase",
}));

export const StyledDivider = styled(Divider)(() => ({
  opacity: 0.5,
}));

// Style cho footer của popover
export const NotificationFooter = styled(Box)(({ theme }) => ({
  display: "flex",
  padding: theme.spacing(2, 3),
  gap: theme.spacing(2),
  backgroundColor: theme.palette.background.default,
}));

export const FooterButton = styled(Button)(({ theme }) => ({
  flex: 1,
  textTransform: "none",
  fontWeight: 600,
  fontSize: "14px",
  borderRadius: "12px",
  padding: theme.spacing(1, 2),
  "&.MuiButton-text": {
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc',
    color: theme.palette.text.secondary,
    "&:hover": {
      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
    },
    "& .MuiButton-startIcon": {
      color: theme.palette.text.secondary,
    },
  },
}));

export const StyledSettingsIcon = styled(SettingsIcon)(() => ({
  fontSize: "20px",
}));

export const FooterLink = styled(Link)(() => ({
  // kept for backward compatibility if needed, but using FooterButton now
}));
