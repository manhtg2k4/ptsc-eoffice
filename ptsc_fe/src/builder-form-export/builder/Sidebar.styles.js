import { styled } from "@mui/material/styles";
import { Box, Typography } from "@mui/material";
import CustomAutocomplete from "@components/DynamicForm/CustomAutocomplete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";

export const SidebarContainer = styled(Box)(({ theme }) => ({
  background: theme.palette.background.default,
  margin: theme.spacing(0, 2),
  height: "90vh",
  overflow: "auto",
  border: `1px solid ${theme.palette.divider}`,
}));

export const AutocompleteContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
}));

export const StyledCustomAutocomplete = styled(CustomAutocomplete)(
  ({ theme }) => ({
    marginBottom: theme.spacing(2),
  })
);

export const StyledTabPanel = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
}));

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

export const DraggableItemContent = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 1,
});

export const DraggableItemLabel = styled(Typography)({
  fontWeight: 500,
});

export const DraggableDragIndicatorIcon = styled(DragIndicatorIcon)({
  fontSize: "small",
});
