import { styled } from "@mui/material/styles";
import {
  Box,
  IconButton,
  Popover,
} from "@mui/material";
import { StyledButton as BaseStyledButton } from "@styles/CustomTable.styles";
import SettingsIcon from '@mui/icons-material/Settings';

export const ActionContainer = styled(Box)({
  display: "flex",
  justifyContent: "flex-end",
});

export const ActionWrapper = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2),
}));

export const ButtonWrapper = styled(Box)({
  position: "relative",
  display: "inline-flex",
});

export const ActionButton = styled(BaseStyledButton)(({ theme }) => ({
  marginLeft: theme.spacing(1.5),
}));

export const ConfigIconButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== "isopen",
})(({ theme, isopen }) => ({
  position: "absolute",
  top: -15,
  right: -15,
  backgroundColor: "white",
  boxShadow: theme.shadows[1],
  transition: "transform 0.3s ease",
  transform: isopen ? "rotate(30deg)" : "rotate(0deg)",
  "&:hover": {
    backgroundColor: "#f0f0f0",
  },
}));

export const ConfigPopover = styled(Popover)({});

export const PopoverContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  minWidth: 200,
}));

export const PopoverSection = styled(Box)(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  gap: theme.spacing(1),
}));

export const ConfigSettingsIcon = styled(SettingsIcon)({
  fontSize: "5px" 
});
