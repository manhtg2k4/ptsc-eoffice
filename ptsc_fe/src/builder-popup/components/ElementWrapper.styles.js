import { styled } from "@mui/material/styles";
import { Box, IconButton, MenuItem } from "@mui/material";
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';

export const WrapperDiv = styled("div", {
  shouldForwardProp: (prop) => prop !== "disabledBorder",
})(({ theme, disabledBorder }) => ({
  border: disabledBorder ? "none" : `1px dashed ${theme.palette.divider}`,
  padding: theme.spacing(1),
  marginBottom: theme.spacing(1.25),
  backgroundColor: theme.palette.grey[50],
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

export const ActionsBox = styled(Box)({});

export const ConfigIconButton = styled(IconButton)({});

export const DeleteMenuItem = styled(MenuItem)({});

export const MenuItemContentBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const ExtraChildBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
}));

export const ExtraMoreVertIcon = styled(MoreVertIcon)(() => ({
  fontSize: "small"
}));

export const ExtraDeleteIcon = styled(DeleteIcon)(() => ({
  color: "error",
  fontSize: "small"
}));