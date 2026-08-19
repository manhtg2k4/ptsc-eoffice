import {
  Box,
  Button,
  FormHelperText,
  IconButton,
  Table,
  TableCell,
  TableContainer,
  TableRow,
  TextField,
} from "@mui/material";
import { styled } from "@mui/material/styles";

export const StyledTableContainer = styled(TableContainer)(() => ({
  "&.MuiTableContainer-root": {
    border: "1px solid rgba(0, 0, 0, 0.12)",
  },
}));

export const StyledTableHead = styled("thead")(({ theme }) => ({
  position: "sticky",
  height: "40px",
  width: "100%",
  top: 0,
  backgroundColor:
    theme.components?.MuiTableHead?.styleOverrides?.root?.backgroundColor ||
    theme.palette.background.paper, // Để tránh bị trong suốt khi scroll
  zIndex: 1, // Giúp header nằm trên nội dung khi cuộn
}))

export const StyledTable = styled(Table)({});

export const StyledTableRow = styled(TableRow)({
  "& .MuiTableCell-root": {
    verticalAlign: "top",
  },
});

export const IndexTableCell = styled(TableCell)({
  width: "10%",
});

export const StyledTextField = styled(TextField)({
  // Các style chung cho TextField nếu cần
});

export const StyledFormHelperText = styled(FormHelperText)({
  width: "100%",
});

export const DeleteIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.error.main,
}));

export const AddValueButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(1, 0, 1, 1),
}));
export const StyleBoxTitle = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.25, 0, 2.5, 0),
}));