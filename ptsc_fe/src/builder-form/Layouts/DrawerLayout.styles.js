import { styled } from "@mui/material/styles";
import {
  Box,
  TextField,
  Typography,
  // IconButton,
  Stack,
  Grid,
} from "@mui/material";

// ConfigCollapse styles
export const ConfigCollapseContainer = styled(Stack)(({ theme }) => ({
  flexDirection: "row",
  alignItems: "start",
  justifyContent: "space-between",
  marginBottom: theme.spacing(1),
  padding: 0,
}));

// DrawerLayout styles
export const MainContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const SizeConfigContainer = styled(Box)(({ theme }) => ({
  paddingBottom: theme.spacing(2),
  marginBottom: theme.spacing(1),
  display: "flex",
  gap: theme.spacing(2),
  flexWrap: "wrap",
  alignItems: "center",
}));

export const SizeConfigItem = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
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

export const ChildrenGridContainer = styled(Grid)({
  transition: "background-color 0.2s",
});

export const ChildConfigContainer = styled(Box)({});

export const ChildConfigItem = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  marginTop: theme.spacing(0.5),
}));

export const ChildGridItem = styled(Grid, {
  shouldForwardProp: (prop) => prop !== "isDraggingOver" && prop !== "mode",
})(({ theme, isDraggingOver, mode }) => ({
  minHeight: 50,
  cursor: mode === "builder" ? "grab" : "default",
  transition: "background-color 0.2s",
  border: isDraggingOver ? `2px dashed ${theme.palette.primary.main}` : "none",
  paddingRight: theme.spacing(2),
}));

export const EmptyDropZoneGrid = styled(Grid)({});

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
  paddingRight: theme.spacing(2),
}));

export const SizeTypography = styled(Typography)(() => ({
  fontWeight: "bold"
}));