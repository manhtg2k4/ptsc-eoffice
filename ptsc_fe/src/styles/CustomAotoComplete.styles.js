import { styled } from "@mui/material/styles";
import { Autocomplete } from "@mui/material";

export const StyledAutoComplete = styled(Autocomplete, {
  shouldForwardProp: (prop) => prop !== "$optionSubLabel" && prop !== "error",
})(({ theme, $optionSubLabel }) => ({
  position: "relative",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  "& .MuiOutlinedInput-root": {
    borderRadius: theme.shape?.borderRadius || 4,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    flexWrap: "nowrap",
    alignItems: "center",
    overflowX: "hidden",
    overflowY: "hidden",
    position: "relative",
    paddingRight: "50px !important",
    ...($optionSubLabel && {
      paddingTop: "10px !important",
      paddingBottom: "10px !important",
      minHeight: "54px",
    }),
    "&::-webkit-scrollbar": {
      height: "5px",
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.25)",
      borderRadius: "4px",
    },
    "&::-webkit-scrollbar-track": {
      backgroundColor: "transparent",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: theme.palette.primary.light,
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: theme.palette.primary.main,
    },
    "&.Mui-error .MuiOutlinedInput-notchedOutline": {
      borderColor: `${theme.palette.error.main} !important`,
    },
  },
  "& .MuiInputLabel-root": {
     color: `${theme.palette.text.primary} !important`,
  },
  "& .MuiOutlinedInput-root.Mui-disabled": {
    backgroundColor: theme.components?.MuiOutlinedInput?.styleOverrides
      ?.root?.["&.Mui-disabled"]?.backgroundColor,
    pointerEvents: "auto",
    cursor: "default",
  },
  "& .MuiAutocomplete-tag": {
    margin: "2px 3px !important",
    maxWidth: "160px !important",
    flexShrink: "1 !important",
    minWidth: "0 !important",
  },
  "& .MuiAutocomplete-input": {
    minWidth: "30px !important",
    width: "0 !important",
    maxWidth: "100%",
    flexGrow: 1,
  },
  "& .MuiFormHelperText-root": {
    color: theme.palette.error.main,
    margin: "4px 14px 0 14px",
    fontSize: "0.75rem",
    lineHeight: 1.25,
  },
}));
