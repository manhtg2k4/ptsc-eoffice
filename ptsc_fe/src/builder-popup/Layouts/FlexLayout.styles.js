import { styled } from "@mui/material/styles";
import { Box, TextField, Typography, FormControl } from "@mui/material";

// Main container for the layout
export const LayoutContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

// Container for builder mode controls
export const ControlsContainer = styled(Box)(({ theme }) => ({
  paddingBottom: theme.spacing(2),
  marginBottom: theme.spacing(2),
  display: "flex",
  gap: theme.spacing(2),
  flexWrap: "wrap",
}));

// FormControl for select inputs
export const StyledFormControl = styled(FormControl)({
  minWidth: 120,
});

// Container for the gap control
export const GapControlContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const GapLabel = styled(Typography)({
  fontWeight: "bold",
});

export const GapInput = styled(TextField)({
  "& .MuiInputBase-input": {
    width: 60,
  },
});

// Main container for droppable children
export const ChildrenContainer = styled(Box)(({ theme, isflexDirection, isjustifyContent, isalignItems, isgap}) => ({
  display: "flex",
  flexWrap: "wrap",
  minHeight: 80,
  padding: theme.spacing(1),
  transition: "background-color 0.2s",
  flexDirection: isflexDirection,
  justifyContent: isjustifyContent,
  alignItems: isalignItems,
  gap: isgap,
}));

// Wrapper for each child item
export const ChildItemWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isDraggingOver" && prop !== "flex",
})(({ theme, isDraggingOver, isflex }) => ({
  flex: isflex || "0 1 auto",
  minHeight: 50,
  minWidth: 100,
  position: "relative",
  cursor: "grab",
  transition: "all 0.2s",
  border: isDraggingOver ? `2px dashed ${theme.palette.primary.main}` : "none",
  outline: "none",
}));

// Placeholder for when there are no children
export const EmptyDropZone = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isDraggingOver",
})(({ theme, isDraggingOver }) => ({
  textAlign: "center",
  color: theme.palette.text.disabled,
  width: "100%",
  minHeight: 80,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border:
    isDraggingOver === null ? `2px dashed ${theme.palette.primary.main}` : "none",
}));