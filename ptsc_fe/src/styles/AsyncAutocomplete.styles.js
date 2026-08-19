import {
  Autocomplete,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";

export const StyledAutocomplete = styled(Autocomplete, {
  shouldForwardProp: (prop) => prop !== "fieldSize",
})(() => ({
  "& .MuiInputBase-root": {
    // Áp dụng padding dựa trên fieldSize
    "&.MuiInputBase-sizeSmall, .MuiInputBase-root": {
      paddingTop: "3px",
      paddingBottom: "3px",
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

export const StyledTextField = styled(TextField, {
  shouldForwardProp: (prop) => prop !== "size",
})(() => ({
  // TextField không cần style đặc biệt cho size ở đây
  // vì nó đã được xử lý trong StyledAutocomplete
}));

export const StyledCircularProgress = styled(CircularProgress)(() => ({
  color: "inherit",
  // size={20} tương đương với width/height 20px
  width: "20px !important",
  height: "20px !important",
}));
