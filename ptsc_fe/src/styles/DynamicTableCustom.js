import { styled } from "@mui/material/styles";
import {
  TableRow,
  TableCell,
  Button,
  TextField,
  TableContainer,
  Table,
  Select,
  Box,
  MenuItem,
  FormControlLabel,
  // TableHead,
} from "@mui/material";

export const DynamicBox = styled(Box)(() => ({
  width: "100%",
  overflow: "hidden",
  // padding: 16,
  // border: "1px solid #ddd",
}));

export const DynamicTableContainer = styled(TableContainer)(() => ({
  maxHeight: "calc(100vh - 350px)",
  overflowY: "auto",
  overflowX: "auto", // Thêm cuộn ngang
  border: (theme) => `1px solid ${theme.palette.divider}`,
  borderRadius: 6,
}));

export const DynamicTable = styled(Table)(() => ({
  borderCollapse: "separate !important",
  minWidth: "800px", // Đặt chiều rộng tối thiểu để kích hoạt cuộn ngang
  width: "100%",
  tableLayout: "fixed",
}));

export const DynamicTableHead = styled("thead")(({ theme }) => {
  const headerBackground =
    theme.palette.table?.header ||
    theme.palette.action.hover ||
    theme.palette.background.paper;

  return {
    position: "sticky",
    height: "50px",
    width: "100%",
    top: 0,
    backgroundColor: `${headerBackground} !important`,
    zIndex: 1, // Giúp header nằm trên nội dung khi cuộn
    "& .MuiTableCell-head, & th": {
      backgroundColor: `${headerBackground} !important`,
      color: `${theme.palette.text.primary} !important`,
    },
    "& .MuiTableCell-head:last-child": {
      backgroundColor: `${headerBackground} !important`,
    },
  };
});
export const DynamicTableRow = styled(TableRow, {
  shouldForwardProp: (prop) => prop !== "inheritRowBackground",
})(({ theme, index, inheritRowBackground = false }) => ({
  backgroundColor: inheritRowBackground
    ? "inherit"
    : index % 2 === 0
    ? theme.palette.table?.rowEven ||
      (theme.palette.mode === "dark" ? "#0f172a" : "#f4f6f8")
    : theme.palette.table?.rowOdd ||
      (theme.palette.mode === "dark" ? "#2c3e50" : "#f9fafb"),
  borderBottom: `1px solid ${theme.palette.divider}`,
  "&.MuiTableRow-root": {
    textAlign: "center !important",
  },
}));

export const DynamicTableCellHead = styled(TableCell, {
  shouldForwardProp: (prop) => prop !== "showCellBorder",
})(({ theme, showCellBorder = false }) => ({
  // border: "0.1px solid #ddd",
  fontWeight: 500,
  textAlign: "left",
  "&.MuiTableCell-root": {
    padding: "10px 5px !important",
    textAlign: "center !important",
  },
  "&:last-child": {
    position: "sticky",
    right: 0,
    zIndex: 2,
    backgroundColor: "inherit", // Kế thừa màu nền từ hàng cha
    borderLeft: `1px solid ${theme.palette.divider}`,
  },
  borderRight: showCellBorder
    ? `1px solid ${theme.palette.divider}`
    : `0.2px solid ${theme.palette.divider}`,
  borderTop: showCellBorder ? `1px solid ${theme.palette.divider}` : undefined,
  borderBottom: showCellBorder ? `1px solid ${theme.palette.divider}` : undefined,
}));

export const DynamicTableCell = styled(TableCell, {
  shouldForwardProp: (prop) => prop !== "showCellBorder",
})(({ theme, showCellBorder = false }) => ({
  // border: "0.1px solid #ddd",
  fontWeight: 500,
  textAlign: "left",
  "&.MuiTableCell-root": {
    padding: "10px 5px !important",
    textAlign: "center !important",
  },
  "&:last-child": {
    position: "sticky",
    right: 0,
    zIndex: 2,
    backgroundColor: "inherit", // Kế thừa màu nền từ hàng cha
    borderLeft: `1px solid ${theme.palette.divider}`,
  },
  borderTop: showCellBorder ? `1px solid ${theme.palette.divider}` : undefined,
  borderRight: showCellBorder ? `1px solid ${theme.palette.divider}` : undefined,
  borderBottom: showCellBorder ? `1px solid ${theme.palette.divider}` : undefined,
}));

export const DynamicTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 4,
    "&.Mui-disabled": {
      backgroundColor:
        theme.components?.MuiOutlinedInput?.styleOverrides?.root?.[
          "&.Mui-disabled"
        ]?.backgroundColor,
    },
  },
  "& .MuiOutlinedInput-input.Mui-disabled": {
    color:
      theme.components?.MuiOutlinedInput?.styleOverrides?.input?.[
        "&.Mui-disabled"
      ]?.color,
    WebkitTextFillColor:
      theme.components?.MuiOutlinedInput?.styleOverrides?.input?.[
        "&.Mui-disabled"
      ]?.color,
  },
}));

export const DynamicMenuItem = styled(MenuItem)(({ theme, disabled }) => ({
  color: disabled ? theme.palette.text.disabled : theme.palette.text.primary,
  WebkitTextFillColor: disabled
    ? theme.palette.text.disabled
    : theme.palette.text.primary,

  "&.Mui-disabled": {
    color: theme.palette.text.disabled,
    WebkitTextFillColor: theme.palette.text.disabled,
  },
}));
export const DynamicSelect = styled(Select)(({ theme }) => ({
  "& .MuiSelect-select": {
    display: "flex",
    alignItems: "center",
  },

  "&.Mui-disabled": {
    backgroundColor:
      theme.components?.MuiOutlinedInput?.styleOverrides?.root?.[
        "&.Mui-disabled"
      ]?.backgroundColor,
    color:
      theme.components?.MuiOutlinedInput?.styleOverrides?.input?.[
        "&.Mui-disabled"
      ]?.color,
  },

  "& + .MuiInputLabel-root": {
    fontWeight: 600,
    color: `${theme.palette.text.primary} !important`,
  },
}));

export const DynamicButton = styled(Button)(({ theme }) => ({
  borderRadius: 4,
  height: 32,
  minWidth: 32,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "0", // Reset padding để icon được căn giữa hoàn hảo
  backgroundColor: theme.palette.primary.main, // Tương đương color="primary"
  color: theme.palette.primary.contrastText,
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export const AddRowButton = styled(DynamicButton)(({ theme }) => ({
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
}));

export const StyledBoxContainer = styled(Box)(({ theme }) => ({
  paddingRight: theme.spacing(2),
  paddingLeft: 5,

  [theme.breakpoints.up("md")]: {
    paddingLeft: "55px",
  },
}));

export const StyledGrids = styled(Box)(({ theme }) => ({
  display: "grid",
  gap: theme.spacing(3),
  alignItems: "center",

  gridTemplateColumns: "1fr", // xs

  [theme.breakpoints.up("sm")]: {
    gridTemplateColumns: "repeat(2, 1fr)",
  },

  [theme.breakpoints.up("md")]: {
    gridTemplateColumns: "repeat(3, 1fr)",
  },

  [theme.breakpoints.up("lg")]: {
    gridTemplateColumns: "repeat(4, 1fr)",
  },
}));

export const FormControlLabelStyled = styled(FormControlLabel)(() => ({
  margin: 0,
}));
