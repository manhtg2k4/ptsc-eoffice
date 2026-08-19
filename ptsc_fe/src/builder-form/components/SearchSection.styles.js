import { styled } from "@mui/material/styles";
import { Box, Typography, Grid, InputAdornment } from "@mui/material";
import { FilterBox as BaseFilterBox } from "@styles/CustomTable.styles";
import { ClearIcon } from "@mui/x-date-pickers";

export const SearchContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  position: "relative",
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(1),
}));

export const SearchFilterBox = styled(BaseFilterBox)({
  zIndex: 1001,
});

export const FilterTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  fontWeight: "bold",
  textAlign: "left",
}));

export const DatePickerGrid = styled(Grid)(({ theme }) => ({
  margin: theme.spacing(0, 2),
}));

export const OptionPickerGrid = styled(Grid)(({ theme }) => ({
  margin: theme.spacing(0, 2),
  minWidth: 250,
}));

export const OptionClearIcon = styled(ClearIcon)(() => ({
  fontSize: "small",
}));

export const OptionInputAdornment = styled(InputAdornment)(() => ({
  position: "end",
}));
