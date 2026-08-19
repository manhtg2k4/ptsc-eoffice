import { styled } from "@mui/material/styles";
import { Box, Typography } from "@mui/material";
import { FilterBox as CustomFilterBox } from "@styles/CustomTable.styles";

export const SearchContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  position: "relative",
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(1.5),
  borderRadius: theme.shape.borderRadius,
}));

export const FilterBox = styled(CustomFilterBox)({
  zIndex: 1001,
});

export const FilterTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  fontWeight: "bold",
  textAlign: "center"
}));

export const FilterWrapper = styled(Box)({});