import { styled } from "@mui/material/styles";
import { Box, TextField, Typography, Stack, Grid } from "@mui/material";
import { motion } from "framer-motion";

// ConfigCollapse styles
export const ConfigCollapseContainer = styled(Stack)({
  flexDirection: "row",
  alignItems: "start",
  justifyContent: "space-between",
  marginBottom: 1,
  padding: 0,
});

export const ConfigTitle = styled(Typography)({
  fontWeight: "bold",
});

// RowLayout styles
export const ChildrenGridContainer = styled(Grid)({
  transition: "background-color 0.2s",
});

// export const ChildGridItem = styled(Grid, {
//   shouldForwardProp: (prop) => prop !== "isDraggingOver" && prop !== "mode",
// })(({ theme, isDraggingOver, mode }) => ({
//   minHeight: 50,
//   cursor: mode === "builder" ? "grab" : "default",
//   transition: "background-color 0.2s",
//   border: isDraggingOver ? `2px dashed ${theme.palette.primary.main}` : "none",
// }));

export const ChildGridItem = styled(Grid, {
  shouldForwardProp: (prop) => prop !== "isDraggingOver" && prop !== "mode",
})(({ theme, isDraggingOver, mode }) => ({
  minHeight: 50,
  cursor: mode === "builder" ? "grab" : "default",
  border: isDraggingOver ? `2px dashed ${theme.palette.primary.main}` : "none",
  transition: theme.transitions.create(["background-color", "border"], {
    duration: theme.transitions.duration.standard,
  }),
}));

export const MotionGridItem = styled(motion.div)({});

export const ChildConfigContainer = styled(Box)({});

export const ChildConfigItem = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  marginTop: theme.spacing(0.5),
}));

export const SizeLabel = styled(Typography)(() => ({
  fontWeight: 500,
  minWidth: 110,
}));

export const SizeInput = styled(TextField)({
  "& .MuiInputBase-input": {
    width: 60,
  },
});

export const HelperText = styled(Typography)({
  color: "textSecondary"
});

export const EmptyDropZone = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isDraggingOver" && prop !== "mode",
})(({ theme, isDraggingOver, mode }) => ({
  textAlign: "center",
  color: theme.palette.text.disabled,
  minHeight: 80,
  border:
    isDraggingOver === null && mode === "builder"
      ? `2px dashed ${theme.palette.primary.main}`
      : "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  paddingRight: 2,
}));

export const SizeBox = styled(Box)(() => ({
  display: "flex", 
  alignItems: "center"
}));