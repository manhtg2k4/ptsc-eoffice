import { styled } from "@mui/material/styles";
import {
  Box,
  Button,
  Pagination,
  Select,
  Table,
  TableContainer,
} from "@mui/material";
import { StyledTableCell as BaseStyledTableCell } from "@styles/CustomTableBorder.style";
import { ScrollTableContainer } from "./Common.styles";

export const PaginationContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: theme.spacing(2),
  padding: "20px",
}));

export const PaginationInfo = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const StyledPagination = styled(Pagination)({
  "& .MuiPaginationItem-root": {
    border: "none",
    borderRadius: 0,
    padding: "4px 8px",
    minWidth: "24px",
    height: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  "& .Mui-selected": {
    backgroundColor: "transparent",
    color: "#1976d3",
    fontWeight: "bold",
  },
});

export const RowsPerPageSelect = styled(Select)({
  height: "24px",
});

export const CustomTableContainer = styled(
  ScrollTableContainer.withComponent(TableContainer)
)({});

export const FixedLayoutTable = styled(Table)({
  tableLayout: "fixed",
  width: "100%",
});

export const DeleteButton = styled(Button)(() => ({
  border: "none",
}));

export const EllipsisTableCell = styled(BaseStyledTableCell)(({ width }) => ({
  width: width || "auto",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}));

export const NoDataCell = styled(BaseStyledTableCell)({
  textAlign: "center",
});
