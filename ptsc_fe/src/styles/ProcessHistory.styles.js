import { styled } from "@mui/material/styles";
import { Box, Typography } from "@mui/material";
import { StyledTableRow as BaseStyledTableRow } from "@styles/CustomTable.styles";

export const HistoryContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
}));

export const HistoryTitle = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.h5.fontWeight,
  fontSize: theme.typography.h5.fontSize,
  marginBottom: theme.spacing(2),
}));

export const TableWrapper = styled(Box)(() => ({
  width: "100%",
  height: "75vh", // Consider moving this to theme if it's a common value
  overflowY: "auto",
}));

export const CenteredBox = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: theme.spacing(3),
}));

export const HistoryTableRow = styled(BaseStyledTableRow)(({ theme }) => ({
  "&:hover": {
    backgroundColor: `${theme.palette.action.hover} !important`,
  },
}));
