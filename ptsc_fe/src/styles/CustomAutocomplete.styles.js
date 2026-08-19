import { Autocomplete, CircularProgress, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export const StyledAutocomplete = styled(Autocomplete)(() => ({
  "& .MuiInputBase-root": {
    "&.MuiInputBase-sizeSmall": {
      paddingTop: "3px",
      paddingBottom: "3px",
      "& .MuiInputBase-input": {
        fontSize: "13px",
      },
    },
  },
  "& .MuiAutocomplete-paper": {
    "&.MuiAutocomplete-paperSizeSmall": {
      fontSize: "13px",
    },
  },
}));

export const StyledRequiredAsterisk = styled("span")(({ theme }) => ({
  color: theme.palette.error.main,
}));

export const LabelTypography = styled(Typography)(({ theme }) => ({
  fontWeight: "bold",
  color: theme.palette.text.primary,
}));

export const StyledCircularProgress = styled(CircularProgress)(() => ({
  color: "inherit",
  width: "20px !important",
  height: "20px !important",
}));
