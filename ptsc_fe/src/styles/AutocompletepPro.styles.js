import { Autocomplete, CircularProgress } from "@mui/material";
import { styled } from "@mui/material/styles";

export const StyledCircularProgress = styled(CircularProgress)(() => ({
  color: "inherit",
  width: "20px !important",
  height: "20px !important",
}));

export const StyledAutocomplete = styled(Autocomplete)(() => ({
  "& .MuiAutocomplete-inputRoot": {
    flexWrap: "wrap",
    height: "auto",
    alignItems: "flex-start",
    padding: "4px 8px !important",
    gap: "4px",
    "& .MuiAutocomplete-input": {
      padding: "4px 4px !important",
      minWidth: "60px !important",
      width: 0,
      flexGrow: 1,
    },
  },
  "& .MuiAutocomplete-tag": {
    margin: 0,
  },
}));

