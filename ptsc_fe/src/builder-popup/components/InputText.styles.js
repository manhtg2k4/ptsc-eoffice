import { styled } from "@mui/material/styles";
import {
  Box,
  Stack,
  Typography,
  IconButton,
  Grid2,
  Select,
  Button,
} from "@mui/material";
// import CustomInput from "@components/CustomInput/CustomInput";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import SettingsIcon from "@mui/icons-material/Settings";


// For ConfigCollapse
export const ConfigCollapseContainer = styled(Stack)({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 1,
});

// For ConfigCheckbox
export const ConfigBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2, 0),
}));

export const DirectionBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2),
  marginBottom: theme.spacing(2),
}));

export const DirectionSelect = styled(Select)({
  minWidth: 120,
});

export const AddOptionBox = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1),
  alignItems: "center",
  marginBottom: theme.spacing(2),
}));

export const AddOptionButton = styled(Button)({});

export const OptionsListBox = styled(Box)({
  maxHeight: 200,
  overflowY: "auto",
});

export const OptionItem = styled(Stack)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  justifyContent: "space-between",
  alignItems: "center"
}));

export const OptionTypography = styled(Typography)({});

export const OptionLabel = styled("span")(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: "0.9em",
}));

export const DeleteOptionButton = styled(Button)({
  color: "error"
});

// For InputText
export const FieldSelectorBox = styled(Box)({});

export const FieldActionsStack = styled(Stack)({
  flexDirection: "row",
  display: "flex",
  justifyContent: "end",
  alignItems: "center",
});

export const ActionButtonsStack = styled(Stack)({
  flexDirection: "row",
});

export const ConfigIconButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== "isopen",
})(({ isopen }) => ({
  transition: "transform 0.3s ease",
  transform: isopen ? "rotate(30deg)" : "rotate(0deg)",
}));

// For ConfigCustomAutoComplete
export const ConfigGrid = styled(Grid2)(({ theme }) => ({
  padding: theme.spacing(2, 0),
}));

export const SaveButtonGrid = styled(Grid2)({});

// For ConfigDatePicker
export const DatePickerConfigGrid = styled(Grid2)(({ theme }) => ({
  padding: theme.spacing(2, 0),
}));

export const SaveConfigButtonGrid = styled(Grid2)({});

// For ConfigInputText
export const InputTextConfigGrid = styled(Grid2)(({ theme }) => ({
  paddingBottom: theme.spacing(2),
}));

export const SaveButtonTypography = styled(Typography)({
  fontWeight: "bold"
});

export const SaveButtonSwapHorizIcon = styled(SwapHorizIcon)({
  fontSize: "small"
});

export const SaveButtonSettingsIcon = styled(SettingsIcon)({
  fontSize: "small"
});