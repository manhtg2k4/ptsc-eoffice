import { styled } from "@mui/material/styles";
import { Box, Paper, Typography, Avatar, Tabs, Tab } from "@mui/material";

export const PageContainer = styled(Box)(({ theme }) => ({
  padding: "20px 30px",
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.default : "#F3F7FA",
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
}));

export const HeaderContainer = styled(Box)(() => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "2px",
  marginBottom: "12px",
  flexShrink: 0,
}));

export const BackButton = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  cursor: "pointer",
  color: theme.palette.mode === 'dark' ? theme.palette.text.secondary : "#6B7280",
  fontSize: "13px",
  fontWeight: 700,
  textTransform: "uppercase",
  transition: "all 0.2s ease",
  marginBottom: "4px",
  "&:hover": {
    color: theme.palette.primary.main,
  },
  "& svg": {
    fontSize: "18px",
  }
}));

export const NotificationList = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
}));

export const NotificationItem = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$isNew",
})(({ theme, $isNew }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  cursor: "pointer",
  transition: "background-color 0.3s",
  backgroundColor: $isNew ? theme.palette.action.hover : "transparent",
  "&:not(:last-child)": {
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  "&:hover": {
    backgroundColor: theme.palette.action.selected,
  },
}));

export const NotificationAvatar = styled(Avatar)(({ theme }) => ({
  marginRight: theme.spacing(2),
  backgroundColor: theme.palette.primary.light,
}));

export const NotificationContent = styled(Box)({
  flexGrow: 1,
});

export const TimeText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
}));

export const TabsContainer = styled(Box)({
  display: "flex",
  alignItems: "center",
  marginBottom: '16px',
  marginTop: '0px',
  flexShrink: 0,
});

export const StyledTabs = styled(Tabs)(() => ({
  minHeight: "44px",
  backgroundColor: "transparent",

  "& .MuiTabs-indicator": {
    display: "none",
  },

  "& .MuiTabs-scroller": {
    overflow: "visible",
  },

  "& .MuiTabs-flexContainer": {
    gap: "12px",
    overflow: "visible",
  },
}));

export const StyledTab = styled(Tab, {
  shouldForwardProp: (prop) => prop !== "isActive",
})(({ theme, isActive }) => ({
  minHeight: "40px",
  padding: "6px 20px",
  borderRadius: "10px",
  textTransform: "uppercase",
  position: "relative",
  overflow: "visible",

  fontSize: "13px",
  fontWeight: 700,

  backgroundColor: isActive
    ? theme.palette.primary.main
    : (theme.palette.mode === 'dark' ? theme.palette.background.paper : "#FFFFFF"),

  color: isActive 
    ? "#FFFFFF" 
    : (theme.palette.mode === 'dark' ? theme.palette.text.primary : "#374151"),

  border: "none",

  boxShadow: isActive
    ? "0 4px 10px rgba(29, 97, 173, 0.15)"
    : "0 1px 3px rgba(0, 0, 0, 0.05)",

  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  minWidth: "unset",

  "&:hover": {
    backgroundColor: isActive
      ? theme.palette.primary.dark
      : (theme.palette.mode === 'dark' ? theme.palette.action.hover : "#F9FAFB"),
    transform: "translateY(-1px)",
  },

  "&.Mui-selected": {
    color: isActive ? "#FFFFFF" : (theme.palette.mode === 'dark' ? theme.palette.text.primary : "#374151"),
  },
}));

export const TabLabelContainer = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  width: "auto",
});

export const CountBadge = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isActive" && prop !== "isVisible",
})(({ theme, isActive, isVisible }) => ({
  display: isVisible ? "flex" : "none",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "24px",
  height: "20px",
  padding: "0 6px",
  borderRadius: "10px",
  backgroundColor: isActive
    ? "rgba(255, 255, 255, 0.2)"
    : (theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.08)" : "#F3F4F6"),
  color: isActive 
    ? "#fff" 
    : (theme.palette.mode === 'dark' ? theme.palette.text.secondary : "#6B7280"),
  fontSize: "10px",
  fontWeight: 700,
  flexShrink: 0,
  transition: "all 0.2s ease",
}));

export const TableContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  "& .MuiTableHead-root .MuiTableCell-root": {
    backgroundColor: theme.palette.mode === 'dark' ? "#1F2937 !important" : "#F9FAFB !important",
    fontWeight: 700,
    color: theme.palette.mode === 'dark' ? theme.palette.text.primary : "#374151",
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  "& .MuiTableBody-root .MuiTableCell-root": {
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper + " !important" : "#fff !important",
    color: theme.palette.text.primary,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  "& .MuiTableBody-root .MuiTableRow-root:hover .MuiTableCell-root": {
    backgroundColor: theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.08) !important" : "#F3F4F6 !important",
  },
  "& .MuiTableBody-root [data-unread='true'] .MuiTableCell-root": {
    backgroundColor: theme.palette.mode === 'dark' ? "#303642 !important" : "rgb(235, 243, 255) !important",
  },
  "& .MuiTableBody-root [data-unread='true']:hover .MuiTableCell-root": {
    backgroundColor: theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.12) !important" : "#DCE9FF !important",
  },
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : "transparent",
  "& > div": {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    "& *": {
      "&::-webkit-scrollbar": {
        width: "6px",
        height: "6px",
      },
      "&::-webkit-scrollbar-thumb": {
        backgroundColor: "rgba(0, 0, 0, 0.05)",
        borderRadius: "10px",
        transition: "background-color 0.3s ease",
      },
      "&::-webkit-scrollbar-thumb:hover": {
        backgroundColor: "rgba(0, 0, 0, 0.15)",
      },
      "&::-webkit-scrollbar-track": {
        backgroundColor: "transparent",
      },
    }
  }
}));