import { styled } from "@mui/material/styles";
import { Box, Typography, IconButton, Popover } from "@mui/material";
import { CheckCircle, Close } from "@mui/icons-material";

// Container for the entire component
export const TabsContainer = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(1),
}));

// Wrapper for the tabs and action buttons
export const TabsActionsWrapper = styled(Box)({
  display: "flex",
  alignItems: "center",
});

// Wrapper for the label inside a tab
export const TabLabelContainer = styled(Box)({
  display: "flex",
  alignItems: "center",
});

// Typography for the tab label text
export const TabLabelText = styled(Typography)(({ theme }) => ({
  marginLeft: theme.spacing(1),
}));

// Close button inside the tab label
export const TabCloseButton = styled(IconButton)(({ theme }) => ({
  marginLeft: theme.spacing(1),
}));

// Action buttons next to the tabs
export const ActionButton = styled(IconButton)(({ theme }) => ({
  marginRight: theme.spacing(1),
}));

// Popover for configuration
export const ConfigPopover = styled(Popover)({});

// Content inside the configuration popover
export const PopoverContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  minWidth: 250,
}));

// Icon inside the tab label
export const StyledCheckCircleIcon = styled(CheckCircle)({
  fontSize: 20,
});

export const StyledClose = styled(Close)({
  fontSize: "small",
});
