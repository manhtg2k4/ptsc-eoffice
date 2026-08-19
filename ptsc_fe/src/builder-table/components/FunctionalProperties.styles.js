import { styled } from "@mui/material/styles";
import { Box, Typography, IconButton, Popover, Tabs, Tab } from "@mui/material";
import { CheckCircle, Close } from "@mui/icons-material";

export const TabsActionsWrapper = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  // borderBottom: "1px solid #E5E7EB",
  // paddingBottom: "4px",
  borderTopLeftRadius: "20px",
  borderTopRightRadius: "20px",
  borderBottomLeftRadius: "0px",
  borderBottomRightRadius: "0px",
  boxShadow: "none",
  backgroundColor: theme.palette.mode === "dark" ? theme.palette.background.default : "#F3F4F6",
  padding: "6px 8px 0px 8px",
  height: "50px",
  width: "fit-content",
  border: `1px solid ${theme.palette.divider}`,

}));

export const TabsContainer = styled(Box)({
  display: "flex",
  alignItems: "center",
  width: "100%",
});

export const StyledTabs = styled(Tabs)(() => ({
  minHeight: "36px",
  backgroundColor: "transparent",
  flex: 1,

  "& .MuiTabs-indicator": {
    display: "none",
  },

  "& .MuiTabs-flexContainer": {
    gap: "4px",
  },

  "& .MuiTabs-scroller": {
    overflow: "auto !important",
  },
}));

export const StyledTab = styled(Tab)(({ isActive, theme }) => ({
  minHeight: "32px",
  minWidth: "auto",
  padding: "6px 20px",
  borderRadius: "20px",
  textTransform: "none",
  fontSize: "14px",
  fontWeight: "bold",
  lineHeight: "20px",

  backgroundColor: isActive ? theme.palette.mode === "dark" ? theme.palette.background.default : "#FFFFFF" : "transparent",
  color: theme.palette.mode === "dark" ? theme.palette.text.primary : "#16191D",
  opacity: isActive ? 1 : 0.65,
  boxShadow: isActive ? "0px 1px 2px rgba(0, 0, 0, 0.1)" : "none",

  border: "none",

  transition: "all 0.2s ease",

  "&.Mui-selected": {
    color: theme.palette.mode === "dark" ? theme.palette.text.primary : "#16191D",
    backgroundColor: "#FFFFFF",
    opacity: 1,
  },
}));

export const TabLabelContainer = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "6px",
  // minWidth: "80px",
});

export const TabLabelText = styled(Typography)({
  fontSize: "14px",
  fontWeight: "bold",
  whiteSpace: "nowrap",
  textTransform: "none",
  lineHeight: "20px",
});

export const TabCloseButton = styled(IconButton)({
  padding: "2px",
  color: "inherit",
  marginLeft: "4px",

  "&:hover": {
    backgroundColor: "rgba(0, 0, 0, 0.04)",
  },
});

export const ActionButton = styled(IconButton)(() => ({
  padding: "6px",
  color: "#6B7280",
  minWidth: "32px",
  minHeight: "32px",

  "&:hover": {
    backgroundColor: "#F3F4F6",
    color: "#111827",
  },

  "& svg": {
    fontSize: "20px",
  },
}));

export const ConfigPopover = styled(Popover)({});

export const PopoverContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  minWidth: 280,
}));

export const PopoverActions = styled(Box)({
  display: "flex",
  justifyContent: "flex-end",
  gap: "8px",
  marginTop: "8px",
});

export const StyledCheckCircleIcon = styled(CheckCircle)({
  fontSize: 20,
});

export const StyledCheckClose = styled(Close)({
  fontSize: 14,
});

export const StyledBox = styled(Box)({
  marginRight: 8, display: "flex", alignItems: "center"
});

export const StyledTypography = styled(Typography)({
  marginTop: 16,
  marginBottom: 8,
});

export const StyledBoxFl = styled(Box)({
  marginBottom: 16, display: "flex", gap: 1
});