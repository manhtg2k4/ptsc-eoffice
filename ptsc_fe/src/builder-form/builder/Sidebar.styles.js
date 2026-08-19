import { styled } from "@mui/material/styles";
import { Box, Typography, Stack } from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";

// Container chính cho Sidebar
export const SidebarContainer = styled(Box)(({ theme }) => ({
  background: theme.palette.background.default,
  margin: theme.spacing(0, 2),
  height: "85vh",
  overflow: "auto",
  border: `1px solid ${theme.palette.divider}`,
}));

// Wrapper cho Autocomplete
export const AutocompleteWrapper = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
}));

// Wrapper cho nội dung của mỗi TabPanel
export const TabPanelContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
}));

// Item có thể kéo thả
export const DraggableItem = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  background: theme.palette.background.paper,
  marginBottom: theme.spacing(1.5),
  padding: theme.spacing(1),
  cursor: "grab",
  "&:hover": {
    background: theme.palette.action.hover,
  },
}));

// Nội dung bên trong DraggableItem
export const DragItemContent = styled(Stack)({
  flexDirection: "row",
  alignItems: "center",
  spacing: 1,
});

// Icon kéo thả
export const StyledDragIndicator = styled(DragIndicatorIcon)({
  fontSize: "small",
  color: "inherit",
});

// Tên của component
export const ComponentName = styled(Typography)(() => ({
  variant: "body2",
  fontWeight: 500,
  color: "inherit",
}));
