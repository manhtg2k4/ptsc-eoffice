import { TextField } from "@mui/material";
import { styled } from "@mui/material/styles";

export const StyledTextField = styled(TextField, {
  shouldForwardProp: (prop) => prop !== "fontSizeTextInput",
})(({ theme, fontSizeTextInput }) => ({
  minWidth: theme.layout.accordion.debouncedInputMinWidth,
  "& .MuiInput-root": {
    // Tương đương variant="standard" và disableUnderline={true}
    "&::before, &::after": {
      display: "none",
    },
    fontSize: fontSizeTextInput || "16px",
    fontWeight: theme.typography.h6.fontWeight,
  },
}));
