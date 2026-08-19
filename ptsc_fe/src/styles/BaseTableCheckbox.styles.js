import { Box, Button, Pagination, Select, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { StyledTableCell } from "@styles/CustomTable.styles";

export const TableWrapper = styled(Box)({
  borderRadius: "4px",
  boxShadow: "0px 2px 8px rgba(0,0,0,0.1)",
  backgroundColor: "background.paper",
});

export const BuilderToolbar = styled(Box)({
  display: "flex",
  gap: "8px",
});

export const PopoverContent = styled(Box)({
  padding: "8px",
});

export const PopoverTitle = styled(Typography)({
  padding: "4px 12px",
});

export const ResetButton = styled(Button)({
  margin: "8px",
});

export const StyledTable = styled("table")(({ theme }) => ({
  tableLayout: "fixed",
  borderCollapse: "collapse",
  border: `1px solid ${theme.palette.divider}`,
}));

export const DraggableHeaderCell = styled(StyledTableCell, {
  shouldForwardProp: (prop) => prop !== "$isDragging",
})(({ $isDragging }) => ({
  cursor: "move",
  opacity: $isDragging ? 0.5 : 1,
  position: "relative",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}));

export const ResizeHandle = styled(Box)({
  position: "absolute",
  right: 0,
  top: 0,
  height: "100%",
  width: "5px",
  cursor: "col-resize",
  userSelect: "none",
});

export const DataTableCell = styled(StyledTableCell)(({ $width }) => ({
  width: $width,
  maxWidth: $width || "220px",
  whiteSpace: "normal",
  wordWrap: "break-word",
  overflowWrap: "break-word",
  padding: "8px",
  borderCollapse: "collapse",
}));

export const PaginationContainer = styled(Box)({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: "16px",
  padding: "20px",
});

export const PaginationInfo = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: "8px",
});

export const StyledPagination = styled(Pagination)(({ theme }) => ({
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
    color: theme.palette.primary.main,
    fontWeight: "bold",
  },
}));

export const RowsPerPageSelect = styled(Select)({
  height: "24px",
});
