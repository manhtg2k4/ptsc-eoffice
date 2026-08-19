import { styled } from "@mui/material/styles";
import { Box, Typography, IconButton, Popover } from "@mui/material";
import { CheckCircle, Close } from "@mui/icons-material";

export const TabsActionsWrapper = styled(Box)({
  display: "flex",
  alignItems: "center",
});

export const TabLabelContainer = styled(Box)({
  display: "flex",
  alignItems: "center",
});

export const TabLabelText = styled(Typography)(({ theme }) => ({
  marginLeft: theme.spacing(1),
}));

export const TabCloseButton = styled(IconButton)(({ theme }) => ({
  marginLeft: theme.spacing(1),
}));

export const ActionButton = styled(IconButton)(({ theme }) => ({
  marginRight: theme.spacing(1),
}));

export const ConfigPopover = styled(Popover)({});

export const PopoverContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  minWidth: 250,
}));

export const PopoverActions = styled(Box)({
  textAlign: "right",
});

export const StyledCheckCircleIcon = styled(CheckCircle)({
  fontSize: 20,
});

export const StyledCheckClose = styled(Close)({
  fontSize: "small" 
});