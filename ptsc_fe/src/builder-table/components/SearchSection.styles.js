import { styled } from "@mui/material/styles";
import {
  Box,
  Grid,
  InputAdornment,
  TextField,
  Button,
  Typography,
  IconButton
} from "@mui/material";
import { FilterBox } from "@styles/CustomTable.styles";
import { ClearIcon } from "@mui/x-date-pickers";
import { SkyButton } from "@styles/SkyStyles";

export const SearchContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== "uiVariant",
})(({ theme, uiVariant }) => ({
  display: "flex",
  alignItems: "center",
  position: "relative",
  // backgroundColor: theme.palette.background.paper,
  // borderRadius: theme.shape.borderRadius,
  flexGrow: 1,
  padding: 0,
  ...(uiVariant === "leadershipDutySchedule" && {
    backgroundColor: "transparent",
  }),
  [theme.breakpoints.down("md")]: {
    flexWrap: "nowrap",
  },
}));

export const InputsContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== "uiVariant",
})(({ theme, uiVariant }) => ({
  display: "flex",
  flexWrap: "wrap",
  flexGrow: 1,
  gap: theme.spacing(0.75),
  alignItems: "center",
  minWidth: 0,
  ...(uiVariant === "leadershipDutySchedule" && {
    gap: theme.spacing(1),
  }),
}));

export const SearchInputGroup = styled(Box)(({ theme, styleDynamic }) => ({
  display: "flex",
  alignItems: "center",
  flexGrow: 1,
  maxWidth: styleDynamic ? 227 : 453,
  flexWrap: "wrap",
  "& > div": {
    display: "flex",
    alignItems: "center",
    flexGrow: 1,
    "& .MuiOutlinedInput-root": {
      borderTopRightRadius: "0 !important",
      borderBottomRightRadius: "0 !important",
    },
    // "& .MuiButton-root": {
    //   borderTopLeftRadius: "0 !important",
    //   borderBottomLeftRadius: "0 !important",
    // },
  },
  marginTop: 8,
  [theme.breakpoints.down("md")]: {
    minWidth: "unset",
    width: "unset",
    maxWidth: "unset",
    flexGrow: 1,
  },
}));

export const StyledSearchFieldDynamic = styled(TextField)(
  ({ theme, styleDynamic }) => ({
    flexGrow: 1,
    minWidth: styleDynamic ? null : 400,
    maxWidth: styleDynamic ? 227 : 450,
    "& .MuiOutlinedInput-root": {
      borderRadius: `${theme.shape.borderRadius}px 0 0 ${theme.shape.borderRadius}px`,
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: theme.palette.divider,
      },
      "& .MuiInputBase-input": {
        color: `${theme.palette.text.primary} !important`,
        "&::placeholder": {
          color: theme.palette.text.secondary,
          opacity: 1,
        },
      },
      "& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus":
      {
        WebkitBoxShadow: `0 0 0 1000px ${theme.palette.background.paper} inset !important`,
        WebkitTextFillColor: `${theme.palette.text.primary} !important`,
        caretColor: `${theme.palette.text.primary} !important`,
        transition: "background-color 5000s ease-in-out 0s",
      },
    },
    "& .MuiOutlinedInput-notchedOutline": {
      borderRadius: `${theme.shape.borderRadius}px 0 0 ${theme.shape.borderRadius}px`,
    },
    [theme.breakpoints.down("md")]: {
      minWidth: "calc(100% - 160px)",
      maxWidth: "100%",
      flexBasis: "calc(100% - 160px)",
    },
  })
);

export const UnifiedSearchGroup = styled(Box, {
  shouldForwardProp: (prop) => prop !== "uiVariant",
})(({ theme, uiVariant }) => ({
  display: "flex",
  alignItems: "center",
  backgroundColor: theme.palette.mode === 'light' ? '#fff' : theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: "12px", // Matches the image better
  padding: 0, // Remove padding, handle it in children
  height: "40px",
  marginTop: 8,
  flexGrow: 1,
  minWidth: 400,
  maxWidth: 600,
  transition: "all 0.2s ease-in-out",
  // overflow: "hidden", // Remove this to allow dropdowns to show
  "&:focus-within": {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 1px ${theme.palette.primary.main}`,
  },
  [theme.breakpoints.down("md")]: {
    minWidth: "unset",
    maxWidth: "100%",
  },
  ...(uiVariant === "leadershipDutySchedule" && {
    borderRadius: "10px",
    height: "39px",
    minWidth: 360,
    boxShadow: "none",
  }),
}));

export const FilterTrigger = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  cursor: "pointer",
  padding: "0 16px",
  borderRight: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.primary,
  height: "100%",
  flexShrink: 0,
  borderTopLeftRadius: "inherit",
  borderBottomLeftRadius: "inherit",
  [theme.breakpoints.down(600)]: {
    padding: "0 12px",
    gap: 0,
  },
  "& span": {
    fontSize: "14px",
    fontWeight: 600,
    marginTop: "3px",
    whiteSpace: "nowrap",
    [theme.breakpoints.down(600)]: {
      display: "none",
    },
  },
  "& .MuiSvgIcon-root, & svg": {
    fontSize: "20px",
    color: theme.palette.mode === 'light' ? "#31383F" : theme.palette.text.secondary,
  }
}));

export const UnifiedInput = styled(TextField)(({ theme }) => ({
  flexGrow: 1,
  height: "100%",
  "& .MuiOutlinedInput-root": {
    height: "100%",
    padding: 0,
    backgroundColor: "transparent",
    "& fieldset": {
      border: "none !important",
    },
    "& input": {
      padding: "0 12px",
      height: "100%",
      fontSize: "14px",
      color: theme.palette.text.primary,
      "&::placeholder": {
        color: theme.palette.text.secondary,
        opacity: 0.8,
      },
    },
  }
}));

export const StyledSearchSectionButton = styled(Button, {
  shouldForwardProp: (prop) => !["iscolor", "uiVariant"].includes(prop),
})(
  ({ theme, iscolor, uiVariant }) => ({
    height: 40,
    width: 40,
    minWidth: "40px !important",
    backgroundColor:
      iscolor === "warning"
        ? theme.palette.warning.main
        : theme.palette.primary.main,
    color: "#fff",
    borderRadius: "12px",
    "&:hover": {
      backgroundColor:
        iscolor === "warning"
          ? theme.palette.warning.dark
          : theme.palette.primary.dark,
    },
    marginTop: 8,
    marginLeft: theme.spacing(1),
    boxShadow: "none",
    ...(uiVariant === "leadershipDutySchedule" && {
      height: 39,
      width: 39,
      minWidth: "39px !important",
      borderRadius: "10px",
    }),
  })
);

export const TuneIconBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== "uiVariant",
})(({ theme, uiVariant }) => ({
  width: 40,
  height: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.palette.mode === 'light' ? '#fff' : theme.palette.background.paper,
  border: `1px solid ${theme.palette.mode === 'light' ? '#DDE0E4' : theme.palette.divider}`,
  borderRadius: "12px",
  cursor: "pointer",
  transition: "all 0.2s ease-in-out",
  "&:hover": {
    backgroundColor: theme.palette.mode === 'light' ? '#F8F9FA' : theme.palette.action.hover,
    borderColor: theme.palette.primary.main,
  },
  "& svg": {
    color: theme.palette.mode === 'light' ? "#161A1D" : theme.palette.text.primary,
  }
  ,
  ...(uiVariant === "leadershipDutySchedule" && {
    width: 39,
    height: 39,
    borderRadius: "10px",
  }),
}));

export const TuneTriggerContainer = styled(Box)(() => ({
  position: "relative",
  display: "flex",
  alignItems: "center",
}));

export const ClearIconButton = styled(IconButton)(({ theme }) => ({
  padding: theme.spacing(0.5),
}));

export const SearchAdornmentStack = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: theme.spacing(0.5),
}));

export const SearchFilterBox = styled(FilterBox)(({ theme }) => ({
  zIndex: 1001,
  width: 360,
  minWidth: 360,
  maxWidth: "calc(100vw - 24px)",
  boxSizing: "border-box",
  padding: theme.spacing(0, 2, 2, 2),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
  boxShadow: theme.shadows[3],
  borderRadius: 16,
  overflow: 'hidden',
  [theme.breakpoints.down("sm")]: {
    width: "calc(100vw - 24px)",
    minWidth: 0,
  },
}));

export const FilterTitle = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing(2.5, 2),
  margin: theme.spacing(0, -2, 2, -2),
  backgroundColor: theme.palette.mode === 'dark' ? "#769fbf" : "#e8eff7",
  position: 'relative',
  fontWeight: 700,
  fontSize: 20,
  color: theme.palette.mode === 'dark' ? "#FFFFFF" : "#2364B0",
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  gap: theme.spacing(1.5),
  "& .MuiSvgIcon-root, & svg": {
    fontSize: 22,
    width: 22,
    height: 22,
    color: "inherit",
  },
  "& span": {
    textAlign: "center",
  }
}));

export const FilterCheckboxAll = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(1.5),
  paddingBottom: theme.spacing(0.5),
  "& .MuiFormControlLabel-root": {
    margin: 0,
    "& .MuiCheckbox-root": {
      padding: theme.spacing(0.5),
    },
    "& .MuiTypography-root": {
      fontSize: "0.8125rem",
      fontWeight: 500,
    },
  },
}));

export const FilterCheckboxGrid = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: theme.spacing(0.75),
  marginBottom: theme.spacing(1.5),
  "& .MuiFormControlLabel-root": {
    margin: 0,
    "& .MuiCheckbox-root": {
      padding: theme.spacing(0.5),
    },
    "& .MuiTypography-root": {
      fontSize: "0.8125rem",
    },
  },
}));

export const FilterActionsBox = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "flex-end",
  gap: theme.spacing(1),
  paddingTop: theme.spacing(1.5),
  marginTop: theme.spacing(0.5),
}));

export const FilterCancelButton = styled(Button)(({ theme }) => ({
  textTransform: "none",
  color: theme.palette.text.primary,
  backgroundColor: theme.palette.mode === 'light' ? '#fff' : theme.palette.background.paper,
  border: `1px solid ${theme.palette.mode === 'light' ? '#e0e0e0' : theme.palette.divider}`,
  borderRadius: '5px !important',
  padding: '8px 24px',
  fontWeight: 400,
  fontSize: '14px',
  minWidth: '60px',
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
    borderColor: theme.palette.mode === 'light' ? '#d0d0d0' : theme.palette.divider,
  },
}));

export const FilterApplyButton = styled(Button)(({ theme }) => ({
  textTransform: "none",
  backgroundColor: theme.palette.primary.main,
  color: '#fff',
  borderRadius: '5px !important',
  padding: '8px 24px',
  fontWeight: 400,
  fontSize: '14px',
  minWidth: '80px',
  boxShadow: 'none',
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
    boxShadow: 'none',
  },
}));
export const DatePickerGrid = styled(Grid)(({ theme }) => ({
  margin: theme.spacing(0, 0.5),
  marginTop: 8,
  [theme.breakpoints.down("md")]: {
    flexGrow: 1,
    minWidth: "calc(50% - 4px)",
    margin: theme.spacing(0.75, 0, 0, 0),
  },
}));

export const OptionPickerGrid = styled(Grid)(({ theme }) => ({
  margin: theme.spacing(0, 0.5),
  marginTop: 8,
  minWidth: 220,
  [theme.breakpoints.down("md")]: {
    flexGrow: 1,
    minWidth: "calc(50% - 4px)",
    margin: theme.spacing(0.75, 0, 0, 0),
  },
}));

export const AdvancedSearchButton = styled(Button)(({ theme }) => ({
  marginTop: 8,
  height:
    theme.components?.MuiOutlinedInput?.styleOverrides?.root?.height || 40,
  minWidth: "auto",
  padding: theme.spacing(0.75, 1.5),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  borderRadius: theme.shape.borderRadius,
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
  textTransform: "none",
  fontSize: "0.875rem",
  fontWeight: 500,
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
  "& .MuiSvgIcon-root": {
    fontSize: "1.25rem",
  },
}));

// ✅ CẬP NHẬT: Thêm position relative
export const ActionButtonsContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexWrap: "nowrap",
  gap: 11,
  alignItems: "center",
  flexShrink: 0,
  whiteSpace: "nowrap",
  position: "relative", // ✅ QUAN TRỌNG: để dropdown có thể position absolute
  [theme.breakpoints.down("md")]: {
    gap: theme.spacing(0.5),
  },
}));

export const SearchInListButtonGroup = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: 11,
  marginLeft: 4,
  alignItems: "center",
  [theme.breakpoints.down("md")]: {
    flexWrap: "wrap",
  },
}));

export const SearchFilterInputAdornment = styled(InputAdornment)({
  position: "end",
});

export const SearchClearIcon = styled(ClearIcon)({
  fontSize: "small",
});

export const SearchRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  width: "100%",
  gap: theme.spacing(1),
  "& > *": {
    minWidth: 0,
  },
  [theme.breakpoints.down("md")]: {
    flexWrap: "nowrap",
  },
}));

export const InputWrapper = styled(Box)(() => ({
  flexGrow: 1,
  display: "flex",
  alignItems: "center",
}));

export const DropDownBox = styled(Box)(() => ({
  position: "relative",
  display: "inline-block",
}));

// ✅ Thêm styled components cho header
export const PageHeaderContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2, 2, 1, 2),
  backgroundColor: theme.palette.background.paper,
}));

export const PageTitle = styled(Typography)(({ theme }) => ({
  fontSize: "1.25rem",
  fontWeight: 600,
  color: theme.palette.text.primary,
  letterSpacing: "0.01em",
}));

export const StyleBoxTittle = styled(Box, {
  shouldForwardProp: (prop) => prop !== "fillHeight",
})(({ fillHeight }) => ({
  display: "flex",
  flexDirection: "column", // ✅ QUAN TRỌNG: Layout dọc
  width: "100%",
  gap: 0, // Không có khoảng cách
  ...(fillHeight && {
    flex: 1,
    minHeight: 0,
    height: "100%",
  }),
}));

export const StyleTittleBox = styled(Box)(({ theme }) => ({
  paddingBottom: theme.spacing(0.5),
  backgroundColor: "transparent",
}));

export const StyleTittleTyprography = styled(Box)(({ theme }) => ({
  fontSize: "2rem",
  fontWeight: 700,
  color: theme.palette.mode === "dark" ? "#fff" : "#2962b0",
  // textTransform: "uppercase",
}));

export const StyleBreadcrumb = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
  marginBottom: theme.spacing(0.5),
  flexWrap: "wrap",
}));

export const StyleBreadcrumbItem = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "isActive",
})(({ theme, isActive }) => ({
  fontSize: "18px",
  fontWeight: isActive ? 600 : 500,
  color:
    theme.palette.mode === "dark"
      ? isActive
        ? "#FFFFFF"
        : "#CCCCCC"
      : isActive
        ? "#2364B0"
        : "#5c8ec1",
  pointerEvents: isActive ? "auto" : "none",
  textTransform: "uppercase",
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
}));

export const BreadcrumbSeparator = styled('span')(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  margin: theme.spacing(0, 0.5),
  color: "#98a2b6",
  "& svg": {
    width: 12,
    height: 12,
  }
}));

export const SearchInListButton = styled(SkyButton, {
  shouldForwardProp: (prop) => !["active", "uiVariant"].includes(prop),
})(({ active, uiVariant }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 40,
  padding: "0 20px",
  marginTop: 8,
  borderRadius: "12px",
  border: active ? "1.5px solid #1976d2" : "1.5px solid #e0e0e0",
  backgroundColor: active ? "#f7f7f7ff" : "#F9FAFB",
  color: active ? "#1976d2" : "#1a1a1a",
  fontWeight: 600,
  fontSize: "15px",
  cursor: "pointer",
  transition: "all 0.2s ease",
  whiteSpace: "nowrap",
  boxShadow: active
    ? "0px 8px 20px rgba(25, 118, 210, 0.25)"
    : "0px 1px 3px rgba(0,0,0,0.08)",
  "&:hover": {
    backgroundColor: active ? "#d2e3fc" : "#ececec",
    borderColor: active ? "#1976d2" : "#bdbdbd",
  },
  ...(uiVariant === "leadershipDutySchedule" && {
    borderRadius: "10px",
    minHeight: "39px",
  }),
}));
