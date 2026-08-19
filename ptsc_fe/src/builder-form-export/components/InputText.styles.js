import { styled } from "@mui/material/styles";
import { Stack, IconButton, Typography } from "@mui/material";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import SettingsIcon from "@mui/icons-material/Settings";

export const FieldActionsStack = styled(Stack)({
  flexDirection: "row",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
});

export const ActionButtonsStack = styled(Stack)({
  flexDirection: "row",
  spacing: 1,
});

export const ConfigIconButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== "isopen",
})(({ isopen }) => ({
  transition: "transform 0.3s ease",
  transform: isopen ? "rotate(30deg)" : "rotate(0deg)",
}));

export const ActionInputStack = styled(Stack)({
  direction: "row",
  alignItems: "center",
  justifyContent :"space-between"
});

export const ActionInputTypography = styled(Typography)({
  fontWeight: "bold"
});

export const ActionInputTypographyFiel = styled(Typography)({
  fontWeight: 500
});

export const ActionInputSwapHorizIcon = styled(SwapHorizIcon)({
  fontSize: "small"
});

export const ActionInputSettingsIcon = styled(SettingsIcon)({
  fontSize: "small"
})