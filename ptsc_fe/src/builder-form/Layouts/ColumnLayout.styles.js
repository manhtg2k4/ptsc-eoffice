import { styled } from "@mui/material/styles";
import { Box, TextField, Typography } from "@mui/material";

// Main container inside Accordion
export const MainContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

// Builder mode: size configuration section
export const SizeConfigContainer = styled(Box)(({ theme }) => ({
  paddingBottom: theme.spacing(2),
  marginBottom: theme.spacing(1),
  display: "flex",
  gap: theme.spacing(2),
  alignItems: "center",
}));

export const SizeConfigItem = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const SizeLabel = styled(Typography)({
  fontWeight: "bold",
});

export const SizeInput = styled(TextField)({
  "& .MuiInputBase-input": {
    width: 60,
  },
});

// Container for droppable children
export const ChildrenContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  transition: "background-color 0.2s",
  minHeight: 80,
  padding: theme.spacing(2),
}));

// Wrapper for each child item
export const ChildItemWrapper = styled(Box, {
  shouldForwardProp: (prop) =>
    prop !== "isDraggingOver" && prop !== "width" && prop !== "maxWidth",
})(({ theme, isDraggingOver, width, maxWidth, mode }) => ({
  minHeight: 50,
  cursor: mode === "builder" ? "grab" : "default",
  transition: "background-color 0.2s",
  border: isDraggingOver ? `2px dashed ${theme.palette.primary.main}` : "none",
  width: width || "100%",
  maxWidth: maxWidth || "100%",
}));

// Placeholder for when there are no children
export const EmptyDropZone = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isDraggingOver",
})(({ theme, isDraggingOver }) => ({
  textAlign: "center",
  color: theme.palette.text.disabled,
  minHeight: 80,
  border:
    isDraggingOver === null
      ? `2px dashed ${theme.palette.primary.main}`
      : "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
}));