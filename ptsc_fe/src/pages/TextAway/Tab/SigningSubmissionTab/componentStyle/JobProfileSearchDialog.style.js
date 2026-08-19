import React from "react";
import { Button, Dialog as MuiDialog, Grid, IconButton, Box, DialogContent as MuiDialogContent, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

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

// Tạo một component trung gian để chứa các props mặc định
const DialogBase = (props) => <MuiDialog {...props} />;
DialogBase.defaultProps = {
  fullWidth: true,
  maxWidth: "lg",
};

export const StyledDialog = styled(DialogBase)(() => ({
  "& .MuiDialog-paper": {
    borderRadius: "8px",
    boxShadow: "0 18px 48px rgba(15, 23, 42, 0.16)",
  },
  "& .MuiDialogTitle-root": {
    display: "none",
  },
}));

export const TableContainer = styled(Box)({
  flexGrow: 1, // Cho phép container này lấp đầy không gian còn lại
  overflow: 'auto', // Chỉ cuộn container này
});

export const StyledDialogContent = styled(MuiDialogContent)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  padding: `${theme.spacing(2, 2.5, 2.5)} !important`,
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
  paddingTop: theme.spacing(2),
}));
