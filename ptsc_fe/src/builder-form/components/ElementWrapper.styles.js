import { styled } from "@mui/material/styles";
import { Box, IconButton, MenuItem } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export const WrapperDiv = styled("div", {
  shouldForwardProp: (prop) => prop !== "disabledBorder",
})(({ theme, disabledBorder }) => ({
  border: disabledBorder ? "none" : `1px dashed ${theme.palette.divider}`,
  padding: theme.spacing(1),
  marginBottom: theme.spacing(1.25),
  backgroundColor: theme.palette.background.paper,
  position: "relative",
  cursor: "grab",
}));

export const ContentBox = styled(Box)({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
});

export const ChildWrapperBox = styled(Box)({
  flex: 1,
});

export const ActionsBox = styled(Box)({
  // No specific styles needed here for now, but good to have for future changes
});

export const ConfigIconButton = styled(IconButton)({
  // No specific styles needed here for now, but good to have for future changes
});

export const DeleteMenuItem = styled(MenuItem)({
  // No specific styles needed here for now, but good to have for future changes
});

export const MenuItemContentBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const ExtraChildBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
}));

export const ExtraDeleteIcon = styled(DeleteIcon)(({ theme }) => ({
  color: theme.palette.error.main,
  fontSize: "small"
}));

export const ExtraMoreVertIcon = styled(MoreVertIcon)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: "small"
}));