import { styled } from "@mui/material/styles";
import { Autocomplete } from "@mui/material";

export const StyledAutoComplete = styled(Autocomplete, {
  shouldForwardProp: (prop) =>
    prop !== "inputBgColor" &&
    prop !== "hasStartAdornment" &&
    prop !== "isCompact" &&
    prop !== "$optionSubLabel",
})(({ theme, inputBgColor, hasStartAdornment, isCompact, $optionSubLabel }) => ({
  "& .MuiOutlinedInput-root": {
    alignItems: "center" ,
    position: "relative",
 paddingLeft: hasStartAdornment ? "120px !important" : undefined,
    backgroundColor:
      inputBgColor ||
      theme.components?.MuiOutlinedInput?.styleOverrides?.root
        ?.backgroundColor ||
      (theme.palette.mode === "dark" ? "#2D3A4E" : "#F5F7FA"),
    borderRadius: theme.shape.borderRadius,
    ...($optionSubLabel && {
      paddingTop: "10px !important",
      paddingBottom: "10px !important",
      minHeight: "54px",
    }),

    "&.Mui-disabled": {
      backgroundColor:
        theme.components?.MuiOutlinedInput?.styleOverrides?.root?.[
          "&.Mui-disabled"
        ]?.backgroundColor || (theme.palette.mode === "dark" ? "#334155" : "#EBEBEB"),
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: theme.palette.divider,
      },
    },
    "& .MuiInputBase-input.Mui-disabled": {
      WebkitTextFillColor:
        theme.components?.MuiOutlinedInput?.styleOverrides?.input?.[
          "&.Mui-disabled"
        ]?.color || (theme.palette.mode === "dark" ? "#94a3b8" : "#000000"),
    },
    "&.Mui-error .MuiOutlinedInput-notchedOutline": {
      borderColor: `${theme.palette.error.main} !important`,
    },
  },

  "& .MuiAutocomplete-inputRoot": {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    paddingTop: "0 !important",
    paddingBottom: "0 !important",
    ...(isCompact && { padding: "2px 12px !important" }),
    gap: "4px",
    ...(isCompact && { minHeight: "32px" }),
  },

  "& .MuiAutocomplete-tag": {
    margin: 0,
    maxWidth: "100%",
  },

  "& .MuiAutocomplete-input": {
    ...(isCompact && { padding: "4px 0 !important" }),
    minWidth: 60,
    flexGrow: 1,
  },

  "& .MuiFormHelperText-root": {
    color: theme.palette.error.main,
    margin: "4px 14px 0 14px",
    fontSize: "0.75rem",
    lineHeight: 1.25,
  },
}));

export const StyledStartAdornment = styled("div")({
  position: "absolute",
  left: 8,
  top: 0,
  bottom: 0,
  display: "flex",
  alignItems: "center",
  zIndex: 2,
  whiteSpace: "nowrap",
});
