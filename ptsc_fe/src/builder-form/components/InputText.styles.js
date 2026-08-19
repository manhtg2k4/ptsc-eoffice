import { styled } from "@mui/material/styles";
import {
  Box,
  Stack,
  IconButton,
  FormControl,
  Select,
  Button,
  Typography,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";

// ConfigDisplayConstraint styles
export const ConfigConstraintBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: "flex",
  gap: theme.spacing(2),
  alignItems: "center",
  flexWrap: "wrap",
}));

export const ConstraintFormControl = styled(FormControl)(() => ({
  minWidth: 180,
}));

export const ConstraintInput = styled("input")(({ theme }) => ({
  width: "100%",
  padding: "8.5px 14px",
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  fontSize: 16,
}));

// ConfigCollapse styles
export const ConfigCollapseContainer = styled(Stack)({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 1,
});

// ConfigCheckbox and ConfigRadio styles
export const ConfigBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
}));

export const DirectionBox = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2),
}));

export const DirectionSelect = styled(Select)({
  width: 140,
  height: 30,
});

export const AddOptionBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "flex-end",
  gap: theme.spacing(2),
  marginBottom: theme.spacing(2),
}));

export const AddOptionButton = styled(Button)(() => ({
  height: 40,
}));

export const OptionsListBox = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const OptionItem = styled(Stack)(({ theme }) => ({
  flexDirection: "row",
  alignItems: "center",
  spacing: theme.spacing(2),
  marginBottom: theme.spacing(1),
}));

export const OptionLabel = styled("span")({
  color: "#888",
});

export const OptionTypography = styled(Typography)({
  minWidth: 180,
});

export const DeleteOptionButton = styled(Button)(() => ({
  minWidth: 60,
  color: "error"
}));

// InputText component styles
export const FieldSelectorBox = styled(Box)({
  marginBottom: "10px",
});

export const FieldActionsStack = styled(Stack)({
  flexDirection: "row",
  display: "flex",
  justifyContent: "end",
  alignItems: "center",
});

export const ConfigIconButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== "isopen",
})(({ isopen }) => ({
  transition: "transform 0.3s ease",
  transform: isopen ? "rotate(30deg)" : "rotate(0deg)",
}));

export const FieldTypography = styled(Typography)({
  fontWeight: "bold"
});

export const FieldTypographyCH = styled(Typography)({
  fontWeight: 500,  
  minWidth: 110
});

export const FieldSwapHorizIcon = styled(SwapHorizIcon)({
  fontSize: "small"
});

export const FieldSettingsIcon = styled(SettingsIcon)({
  fontSize: "small"
});