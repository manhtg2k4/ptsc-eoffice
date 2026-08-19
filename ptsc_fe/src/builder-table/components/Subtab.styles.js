import { styled } from "@mui/material/styles";
import { Box, Typography, IconButton, Popover, Tabs, Tab } from "@mui/material";
import { CheckCircle, Close } from "@mui/icons-material";

export const TabsActionsWrapper = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: "12px",
});

export const TabsContainer = styled(Box)({
  display: "flex",
  alignItems: "center",
  marginTop: "0px"
});

export const StyledTabs = styled(Tabs)(() => ({
  minHeight: "38px",
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
  minHeight: "24px",
  padding: "8px 28px",
  borderRadius: "10px",
  textTransform: "uppercase",
  position: "relative",
  overflow: "visible",

  fontSize: "16px",
  fontWeight: 700,

  backgroundColor: isActive
    ? theme.palette.primary.main || "#005BAC"
    : "#FFFFFF",

  color: isActive ? "#FFFFFF" : "#111827",

  border: isActive
    ? "1px solid transparent"
    : "1px solid #D1D5DB",

  boxShadow: isActive
    ? "0 2px 6px rgba(0, 91, 172, 0.25)"
    : "none",

  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",

  "&:hover": {
    backgroundColor: isActive
      ? theme.palette.primary.dark || "#004A8F"
      : "#F9FAFB",
  },

  "&.Mui-selected": {
    color: "#FFFFFF",
  },
}));

export const TabLabelContainer = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  width: "auto",
  position: "relative",
  paddingRight: "2px",
});

export const TabLabelText = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "hasCount",
})(({ hasCount }) => ({
  fontSize: "13px",
  fontWeight: 700,
  whiteSpace: "nowrap",
  textTransform: "uppercase",
  marginLeft: hasCount ? '-10px' : 0,
  marginRight: '10px'
}));

export const TabCloseButton = styled(IconButton)({
  padding: "4px",
  color: "inherit",
});

export const ActionButton = styled(IconButton)(({ theme }) => ({
  padding: "8px",
  color: theme.palette.primary.main || "#005BAC",

  "&:hover": {
    backgroundColor: "rgba(0, 91, 172, 0.08)",
  },
}));


export const ConfigPopover = styled(Popover)({});

export const PopoverContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  minWidth: 260,
}));

export const PopoverActions = styled(Box)({
  textAlign: "right",
});


export const StyledCheckCircleIcon = styled(CheckCircle)({
  fontSize: 20,
});

export const StyledCheckClose = styled(Close)({
  fontSize: 16,
});
