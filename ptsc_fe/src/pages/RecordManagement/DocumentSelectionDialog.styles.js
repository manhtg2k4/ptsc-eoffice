import React from "react";
import { Button, Dialog as MuiDialog, Grid, IconButton, Box, DialogContent as MuiDialogContent, Typography, Popover, Link } from "@mui/material";
import { styled } from "@mui/material/styles";
import { InsertDriveFile as FileIcon } from "@mui/icons-material";
import { SkyBox } from "@styles/SkyStyles";

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

export const StyledDialog = styled(DialogBase)(() => ({}));

export const TableContainer = styled(Box)(() => ({
  flexGrow: 1,
  overflowX: 'auto',  // Cho phép cuộn ngang
  overflowY: 'auto',  // Cho phép cuộn dọc
  maxHeight: 'calc(100vh - 400px)', // Điều chỉnh chiều cao tối đa nếu cần
  
  // Tùy chỉnh scrollbar cho đẹp hơn (optional)
  '&::-webkit-scrollbar': {
    width: '8px',
    height: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#f1f1f1',
    borderRadius: '10px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#888',
    borderRadius: '10px',
    '&:hover': {
      background: '#555',
    },
  },
}));

export const StyledDialogContent = styled(MuiDialogContent)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
	padding: `${theme.spacing(2)} !important`, 
	height: '70vh'
}));

export const FixedSection = styled(Box)({
  flexShrink: 0,
  position: 'relative',
  zIndex: 1200,
});

export const PaginationSection = styled(Box)(({ theme }) => ({
  flexShrink: 0,
  paddingTop: theme.spacing(1),
}));

export const FixedTypography = styled(Typography)({
  color: '#999'
});

export const FixedDropdown = styled(Box)({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: '6px',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: '#f5f5f5',
  }
});

export const FixedFileIcon = styled(FileIcon)({
  color: '#1976d2',
  fontSize: 20,
});

export const FixedTypographyColor = styled(Typography)({
  color: '#1976d2',
  fontWeight: 500,
  fontSize: '14px',
});

export const FixedPopover = styled(Popover)({
  pointerEvents: 'none',
  '& .MuiPopover-paper': {
    marginTop: '4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    minWidth: '200px',
    maxWidth: '400px',
    pointerEvents: 'auto',
  },
});

export const FixedDropdownBox = styled(Box)({
  padding: '8px 0',
  maxHeight: '300px',
  overflow: 'auto',
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#f1f1f1',
    borderRadius: '10px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#888',
    borderRadius: '10px',
    '&:hover': {
      background: '#555',
    },
  },
});

export const FixedLink = styled(Link)({
  display: 'block',
  textAlign: 'left',
  padding: '10px 16px',
  width: '100%',
  textDecoration: 'none',
  color: '#333',
  border: 'none',
  background: 'transparent',
  borderRadius: '0',
  fontSize: '14px',
  transition: 'all 0.15s ease',
  cursor: 'pointer',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  '&:hover': {
    backgroundColor: '#f0f7ff',
    color: '#1976d2',
  },
});

export const SearchContainer = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  position: 'relative',
  gap: '8px',
}));

export const FilterBoxTitleWrapper = styled(Box)(() => ({
  borderBottom: '1px solid #eee',
  paddingBottom: '10px',
  marginBottom: '15px'
}));

export const FilterTitleText = styled(Box)(() => ({
  fontWeight: 700,
  fontSize: '18px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
}));

export const FilterDateLabel = styled(Typography)(() => ({
  fontWeight: 600,
  marginBottom: '4px',
  fontSize: '14px',
}));

export const ResetButton = styled(IconButton)(({theme}) => ({
  marginRight: 'auto',
  borderRadius: '8px',
  color: theme.palette.text.secondary,
  border: '1px solid #ddd',
  fontSize: '14px',
  fontWeight: "600",
  padding: '6px 16px',
  '&:hover': {
    backgroundColor: '#f5f5f5',
  }
}));

export const CancelButtonLink = styled(Button)(({ theme }) => ({
  textTransform: "none",
  color: theme.palette.text.secondary,
  border: '1px solid #ddd',
  borderRadius: '8px',
  padding: '6px 16px',
  minWidth: '80px',
  "&:hover": { 
    backgroundColor: theme.palette.action.hover 
  },
}));

export const ApplyFilterButton = styled(Button)(({ theme }) => ({
  textTransform: "none",
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.white || "#fff",
  borderRadius: '8px',
  padding: '6px 16px',
  minWidth: '100px',
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export const DateRangeGrid = styled(Grid)(() => ({
  alignItems: 'center',
  padding: '0 5px',
}));

export const CenteredSeparator = styled(Grid)(() => ({
  textAlign: 'center',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
}));

export const FilterActionWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: theme.spacing(1),
  paddingTop: theme.spacing(1.5),
  marginTop: '20px',
}));

export const FixedTypographyDate = styled(Typography)({
  fontWeight: 'bold'
});

export const FilterBox = styled(SkyBox)(({ theme }) => ({
  position: "absolute",
  top: "27px",
  left: "-127px",
  display: "flex",
  flexDirection: "column",
  background: theme.palette.background.paper,
  boxShadow: "rgba(0, 0, 0, 0.1) 0px 4px 10px",
  borderRadius: 5,
  padding: 10,
  zIndex: 1001,
  minWidth: "380px", // ✅ Cố định chiều rộng tối thiểu
  maxWidth: "90vw",
  maxHeight: "500px", // ✅ Giới hạn chiều cao
  overflowY: "auto", // ✅ Thêm scroll khi quá nhiều item
  "& .MuiFormControlLabel-root": {
    whiteSpace: "nowrap", // ⭐ Không cho xuống dòng
    margin: 0,
  },
  [theme.breakpoints.down("sm")]: {
    left: 0,
    minWidth: "300px",
  },
}));
