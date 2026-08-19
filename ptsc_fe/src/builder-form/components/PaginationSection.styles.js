import { styled } from "@mui/material/styles";
import { Box, Typography, Select, Pagination, Stack } from "@mui/material";

export const PaginationContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: theme.spacing(2),
}));

export const InfoBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const TotalTypography = styled(Typography)({});

export const RecordRangeTypography = styled(Typography)({});

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

export const RowsPerPageBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const DisplayTypography = styled(Typography)({});

export const RowsPerPageSelect = styled(Select)({
  height: "24px",
});

export const RowsStack = styled(Stack)({
  alignItems: "center",
});
