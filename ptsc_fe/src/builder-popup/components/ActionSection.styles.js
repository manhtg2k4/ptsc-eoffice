import { styled } from "@mui/material/styles";
import { Box, Popover, IconButton, Typography } from "@mui/material";
import SettingsIcon from '@mui/icons-material/Settings';

export const ActionContainer = styled(Box)({
  display: "flex",
  justifyContent: "flex-end",
});

export const ActionWrapper = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: ({ theme }) => theme.spacing(2),
});

export const ButtonWrapper = styled(Box)({
  position: "relative",
  display: "inline-flex",
});

export const ConfigIconButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== "isopen",
})(({ theme, isopen }) => ({
  position: "absolute",
  top: -15,
  right: -15,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[1],
  transition: "transform 0.3s ease",
  transform: isopen ? "rotate(30deg)" : "rotate(0deg)",
  "&:hover": {
    backgroundColor: theme.palette.grey[100],
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

export const PopoverSection = styled(Box)({
  display: "flex",
  flexWrap: "wrap",
  gap: ({ theme }) => theme.spacing(1),
});

export const StyledTypography = styled(Typography)({});
export const StyledActionSettingsIcon = styled(SettingsIcon)({
  fontSize: "5px"
});