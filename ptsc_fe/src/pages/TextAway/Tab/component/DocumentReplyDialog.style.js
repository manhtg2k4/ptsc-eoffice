import React from "react";
import {
  Button,
  Dialog as MuiDialog,
  Grid,
  IconButton,
  Box,
  DialogContent as MuiDialogContent,
  Typography,
  Popover,
  Link,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { InsertDriveFile as FileIcon } from "@mui/icons-material";

export const CloseButton = styled(IconButton)(({ theme }) => ({
  position: "absolute",
  right: 8,
  top: 8,
  color: theme.palette.grey[500],
}));

export const SearchFormGrid = styled(Grid)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const SaveButton = styled(Button)(() => ({}));
SaveButton.defaultProps = {
  variant: "contained",
  color: "primary",
};

export const CloseDialogButton = styled(Button)(() => ({}));
CloseDialogButton.defaultProps = {
  variant: "outlined",
  color: "primary",
};

const DialogBase = (props) => <MuiDialog {...props} />;
DialogBase.defaultProps = {
  fullWidth: true,
  maxWidth: "lg",
};

export const StyledDialog = styled(DialogBase)(() => ({
  "& .MuiDialog-paper": {
    maxHeight: "85vh",
    overflow: "hidden !important",
    borderRadius: "8px",
    boxShadow: "0 18px 48px rgba(15, 23, 42, 0.16)",
  },
  "& .MuiDialogTitle-root": {
    display: "none",
  },
}));

export const TableContainer = styled(Box)(() => ({
  flex: 1,
  minHeight: 0,
  width: "100%",
  overflow: "auto",
  display: "block",
  position: "relative",
  "& > div": {
    minWidth: "fit-content",
    minHeight: "100%",
  },
  "&::-webkit-scrollbar": {
    width: "12px",
    height: "12px",
    display: "block !important",
  },
  "&::-webkit-scrollbar-track": {
    background: "transparent",
    borderRadius: "10px",
  },
  "&::-webkit-scrollbar-thumb": {
    background: "#ccc",
    borderRadius: "10px",
    border: "2px solid transparent",
    backgroundClip: "padding-box",
    "&:hover": {
      background: "#999",
      backgroundClip: "padding-box",
    },
  },
}));

export const StyledDialogContent = styled(MuiDialogContent)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  padding: `${theme.spacing(2, 2.5, 2.5)} !important`,
  overflow: "hidden !important",
  height: "75vh",
  maxHeight: "75vh",
  "& > *": { minHeight: 0 },
}));

export const DialogHeaderBar = styled(Box)(({ theme }) => ({
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "56px",
  padding: theme.spacing(0, 6),
  backgroundColor: "#eef3f7",
}));

export const DialogHeaderTitle = styled(Typography)(({ theme }) => ({
  fontSize: 20,
  lineHeight: "28px",
  fontWeight: 700,
  textTransform: "uppercase",
  color: theme.palette.primary.main,
  textAlign: "center",
}));

export const DialogHeaderCloseButton = styled(IconButton)(({ theme }) => ({
  position: "absolute",
  right: theme.spacing(1),
  top: "50%",
  transform: "translateY(-50%)",
  color: "#98a2b3",
}));

export const FixedSection = styled(Box)({
  flexShrink: 0,
});

export const PaginationSection = styled(Box)(({ theme }) => ({
  flexShrink: 0,
  paddingTop: theme.spacing(1),
}));

export const FixedTypography = styled(Typography)({
  color: "#999",
});

export const FixedDropdown = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  cursor: "pointer",
  padding: "4px 8px",
  borderRadius: "6px",
  transition: "all 0.2s ease",
  "&:hover": {
    backgroundColor: "#f5f5f5",
  },
});

export const FixedFileIcon = styled(FileIcon)({
  color: "#1976d2",
  fontSize: 20,
});

export const FixedTypographyColor = styled(Typography)({
  color: "#1976d2",
  fontWeight: 500,
  fontSize: "14px",
});

export const FixedPopover = styled(Popover)({
  pointerEvents: "none",
  "& .MuiPopover-paper": {
    marginTop: "4px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    minWidth: "200px",
    maxWidth: "400px",
    pointerEvents: "auto",
  },
});

export const FixedDropdownBox = styled(Box)({
  padding: "8px 0",
  maxHeight: "300px",
  overflow: "auto",
  "&::-webkit-scrollbar": {
    width: "8px",
    height: "8px",
  },
  "&::-webkit-scrollbar-track": {
    background: "transparent",
    borderRadius: "10px",
  },
  "&::-webkit-scrollbar-thumb": {
    background: "#ccc",
    borderRadius: "10px",
    border: "1px solid transparent",
    backgroundClip: "padding-box",
    "&:hover": {
      background: "#999",
    },
  },
});

export const FixedLink = styled(Link)({
  display: "block",
  textAlign: "left",
  padding: "10px 16px",
  width: "100%",
  textDecoration: "none",
  color: "#333",
  border: "none",
  background: "transparent",
  borderRadius: "0",
  fontSize: "14px",
  transition: "all 0.15s ease",
  cursor: "pointer",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  "&:hover": {
    backgroundColor: "#f0f7ff",
    color: "#1976d2",
  },
});

export const FixedTypographyDate = styled(Typography)({
  fontWeight: "bold",
});
