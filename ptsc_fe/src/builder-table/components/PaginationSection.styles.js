import { styled } from "@mui/material/styles";
import { Box, Typography, Select, Pagination, Stack } from "@mui/material";

export const PaginationContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isCentered',
})(({ theme, isCentered }) => ({
  display: "flex",
  justifyContent: isCentered ? 'center' : "space-between",
  alignItems: "center",
  width: "100%",
  gap: theme.spacing(1.5),
  flexWrap: 'wrap',
  padding: theme.spacing(1, 0),
}));

export const InfoBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isCentered',
})(({ theme, isCentered }) => ({
  display: "flex",
  alignItems: "center",
  color: theme.palette.text.secondary,
  fontSize: "14px",
  marginRight: isCentered ? 0 : "auto",
  "& strong": {
    color: theme.palette.text.primary,
    fontWeight: 700,
    margin: "0 4px",
  }
}));

export const TotalTypography = styled(Typography)({});

export const RecordRangeTypography = styled(Typography)({});

export const StyledPagination = styled(Pagination)(({ theme }) => ({
  "& .MuiPagination-ul": {
    gap: theme.spacing(0.5),
    flexWrap: 'nowrap',
  },
  "& .MuiPaginationItem-root": {
    margin: 0,
    minWidth: "32px",
    height: "32px",
    borderRadius: "8px",
    fontSize: "14px",
    border: "none",
    color: theme.palette.text.primary,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    padding: 0,
    fontWeight: 600,
    "&.Mui-selected": {
      backgroundColor: "#2364B0",
      color: "#fff",
      fontWeight: 600,
      "&:hover": {
        backgroundColor: "#2364B0",
      },
    },
    "&:hover": {
      backgroundColor: "rgba(0, 0, 0, 0.04)",
    },
  },
  "& .MuiPaginationItem-previousNext": {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: `1px solid ${theme.palette.divider}`,
    padding: "0 16px",
    height: "32px",
    width: "auto",
    borderRadius: "8px",
    color: theme.palette.text.secondary,
    fontSize: "14px",
    fontWeight: 600,
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
      borderColor: theme.palette.text.disabled,
    },
    "&.Mui-disabled": {
      opacity: 0.5,
    }
  },
  "& .MuiPaginationItem-ellipsis": {
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "24px",
    color: theme.palette.text.secondary,
  }
}));

export const RowsPerPageBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const DisplayTypography = styled(Typography)(() => ({
  color: '#91969C',
  fontSize: "14px",
  fontWeight: 600,
}));

export const RowsPerPageSelect = styled(Select)(({ theme }) => ({
  height: "32px",
  minWidth: "64px",
  borderRadius: "10px",
  fontSize: "14px",
  color: theme.palette.text.primary,
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.divider,
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.text.disabled,
  },
  "& .MuiSelect-select": {
    padding: "4px 12px",
    paddingRight: "32px !important",
  }
}));

export const RowsPerPageStack = styled(Stack)({
  alignItems: "center",
  flexDirection: "row",
  gap: "16px",
});