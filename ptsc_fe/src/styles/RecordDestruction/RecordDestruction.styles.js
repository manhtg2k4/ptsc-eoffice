import { Box, Chip, Grid, IconButton, Typography, DialogContent, Button as MuiButton } from "@mui/material";
import { styled } from "@mui/material/styles";
import { StyleDialog } from "@styles/DialogDirective/index";

export const FormContainer = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(1.25),
}));

export const StyleGridContainer = styled(Grid)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));
export const StyledBoxContainerContent = styled(Box)(
  ({ theme, styledMarginTop, $isUnifiedBlock }) => ({
    backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",
    borderRadius: $isUnifiedBlock ? 10 : 6,
    border: 'none',
    marginTop: styledMarginTop ? theme.spacing(2) : null,
    padding: $isUnifiedBlock ? theme.spacing(3) : theme.spacing(1.5),
  })
);

export const FormGridItem = styled(Grid)({
  paddingTop: "0 !important",
});


export const StyledGridContainerInfo = styled(Grid)(({ styledIsView }) => ({
  // marginTop: theme.spacing(1),
  display: styledIsView ? "flex" : null,
  gap: styledIsView ? "16px" : null,
  alignItems: styledIsView ? "stretch" : null,
}));


export const StyledHeaderContent = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

// Header container with flex layout for title and status badge
export const StyledHeaderWrapper = styled(Box)(({ theme, $isTableHeader }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: $isTableHeader ? 0 : theme.spacing(3.5),
  flexWrap: "wrap",
  gap: theme.spacing(1),
  ...( $isTableHeader && {
    padding: "16px 24px",
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#F8F9FA'
  })
}));

// Wrapper for title with toggle icon
export const StyledTitleWithToggle = styled(Box)(({ $isClickable }) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  cursor: $isClickable ? 'pointer' : 'default',
}));

// Wrapper for header right-side actions (status chip, buttons, toggle)
export const StyledHeaderActions = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  flexWrap: "wrap",
}));

// Styled collapse toggle icon button
export const StyledCollapseIconButton = styled("div")(({ theme, isCollapsed }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transform: isCollapsed ? "rotate(0deg)" : "rotate(180deg)",
  transition: "transform 0.3s",
  color: theme.palette.primary.main,
}));

// Section title styling
export const StyledSectionTitle = styled(Typography)(({ theme, $isTableHeader }) => ({
  fontWeight: 600,
  fontSize: $isTableHeader ? "0.95rem" : "1rem",
  color: $isTableHeader ? "#333" : (theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.common.black),
  textTransform: "uppercase",
  display: 'flex',
  alignItems: 'center',
  whiteSpace: 'nowrap',
  [theme.breakpoints.down("sm")]: {
    fontSize: "0.875rem",
  },
}));

// Status badge chip styling
// Supports custom colors from BE via transient props: $bgColor, $textColor, $bdColor
export const StyledStatusChip = styled(Chip)(({ theme, status, backgColor, textColor, bdColor }) => {
  // Define default colors based on status
  const getDefaultColors = () => {
    switch (status) {
      case "approved":
        return {
          backgroundColor: theme.palette.success.lighter || "#e8f5e9",
          color: theme.palette.success.main,
          borderColor: theme.palette.success.main,
        };
      case "rejected":
        return {
          backgroundColor: theme.palette.error.lighter || "#ffebee",
          color: theme.palette.error.main,
          borderColor: theme.palette.error.main,
        };
      case "pending":
      default:
        return {
          backgroundColor: theme.palette.mode === "dark" ? "#2d3748" : "#f5f5f5",
          color: theme.palette.text.secondary,
          borderColor: theme.palette.divider,

        };
    }
  };

  const defaultColors = getDefaultColors();

  // Use props colors if provided, otherwise use defaults
  const finalColors = {
    backgroundColor: backgColor || defaultColors.backgroundColor,
    color: textColor || defaultColors.color,
    borderColor: bdColor || defaultColors.borderColor,
  };

  return {
    ...finalColors,
    border: `1px solid ${finalColors.borderColor}`,
    fontWeight: 500,
    fontSize: "0.813rem",
    height: 32,
    borderRadius: "25px",
    marginLeft: theme.spacing(1),
    [theme.breakpoints.down("sm")]: {
      fontSize: "0.75rem",
      height: 28,
    },
  };
});

// Form fields container
export const StyledFormFieldsContainer = styled(Grid)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));

// Dialog header wrapper - responsive layout - Now used for filters row
export const StyledDialogHeaderWrapper = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  // marginBottom: theme.spacing(2),
  gap: theme.spacing(2),
  overflow: "visible", // Allow filter dropdown to show
  justifyContent: "flex-start",
  // Desktop (>= 1200px) - all on ONE row
  [theme.breakpoints.up("lg")]: {
    flexWrap: "nowrap",
  },
  // Tablet (600px - 1199px) - wrap: title first row, others second row
  [theme.breakpoints.between("sm", "lg")]: {
    flexWrap: "wrap",
  },
  // Mobile (< 600px) - stack all elements vertically
  [theme.breakpoints.down("sm")]: {
    flexDirection: "column",
    alignItems: "stretch",
  },
}));

// Dialog title - responsive
export const StyledDialogTitle = styled(Typography)(({ theme }) => ({
  fontWeight: "bold",
  // color: "#1a3353",
  whiteSpace: "nowrap",
  // Desktop - share row with others, push them to right
  [theme.breakpoints.up("lg")]: {
    marginRight: "auto",
  },
  // Tablet - full width to push others to next row
  [theme.breakpoints.between("sm", "lg")]: {
    width: "100%",
    marginBottom: theme.spacing(1),
  },
  // Mobile - full width, smaller font
  [theme.breakpoints.down("sm")]: {
    width: "100%",
    fontSize: "1rem",
    textAlign: "center",
  },
}));

// Container for DatePickers - keeps them together
export const StyledDatePickersRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  flexShrink: 0,
  // Tablet - keep compact
  [theme.breakpoints.between("sm", "lg")]: {
    flexShrink: 0,
  },
  // Mobile - full width, DatePickers share space
  [theme.breakpoints.down("sm")]: {
    width: "100%",
    "& > *": {
      flex: 1,
    },
  },
}));

// Dialog search controls wrapper - grouped input with buttons
export const StyledDialogSearchWrapper = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  overflow: "visible", // Allow filter dropdown to show
  // Tablet - grow to fill remaining space
  [theme.breakpoints.between("sm", "lg")]: {
    flex: 1,
    minWidth: 0,
  },
  // Mobile - full width
  [theme.breakpoints.down("sm")]: {
    width: "100%",
  },
}));

// Styled input wrapper for search field in dialog - responsive
export const StyledSearchInputWrapper = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "stretch",
  "& .MuiInputBase-root": {
    borderRadius: "8px",
    width: 320, // Wider for premium feel matching mockup
    height: 40,
    paddingRight: "0px !important", // Override MUI default padding-right for adornedEnd to align filter dropdown beautifully
  },
  // Desktop lg and up - fixed width
  [theme.breakpoints.up("lg")]: {
    "& .MuiInputBase-root": {
      width: 320,
    },
  },
  // Tablet - grow to fill remaining space
  [theme.breakpoints.between("sm", "lg")]: {
    flex: 1,
    minWidth: 0,
    "& .MuiInputBase-root": {
      width: "100%",
    },
  },
  // Mobile - full width
  [theme.breakpoints.down("sm")]: {
    flex: 1,
    "& .MuiInputBase-root": {
      width: "100%",
    },
  },
}));

// Styled wrapper for compact DatePicker in dialog - responsive
export const StyledDatePickerWrapper = styled(Box)(({ theme }) => ({
  "& .MuiFormControl-root": {
    minWidth: 160,
    maxWidth: 200,
  },
  "& .MuiInputBase-root": {
    minWidth: 160,
    maxWidth: 200,
    height: 40,
    borderRadius: "8px",
  },
  // Tablet - compact but flexible
  [theme.breakpoints.between("sm", "lg")]: {
    "& .MuiFormControl-root": {
      minWidth: 140,
      maxWidth: 180,
    },
    "& .MuiInputBase-root": {
      minWidth: 140,
      maxWidth: 180,
      height: 40,
      borderRadius: "8px",
    },
  },
  // Mobile - slightly smaller
  [theme.breakpoints.down("sm")]: {
    "& .MuiFormControl-root": {
      minWidth: 100,
      maxWidth: 150,
    },
    "& .MuiInputBase-root": {
      minWidth: 100,
      maxWidth: 150,
      height: 40,
      borderRadius: "8px",
    },
  },
}));

// Filter icon button - separate with borders
export const StyledFilterIconButton = styled(IconButton)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40, // Fixed height to match Input
  minHeight: 40,
  border: `1px solid ${theme.palette.mode === 'dark' ? theme.palette.divider : '#e2e8f0'}`,
  borderRadius: "8px",
  color: theme.palette.text.primary,
  backgroundColor: "transparent",
  cursor: "pointer",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

// Search icon button - separate with blue background
export const StyledSearchIconButton = styled(IconButton)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40, // Fixed height to match Input
  minHeight: 40,
  border: "none",
  borderRadius: "8px",
  backgroundColor: theme.palette.primary.main,
  color: "white",
  cursor: "pointer",
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));

// Filter dropdown box - copied from SearchSection.styles.js
export const SearchFilterBox = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: "100%",
  // right: 0,
  zIndex: 1001,
  minWidth: 409,
  maxWidth: 409,
  padding: theme.spacing(1.75),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
  boxShadow: theme.shadows[3],
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#fff",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  marginTop: 4,
}));

// Filter title with icon - copied from SearchSection.styles.js
export const FilterTitle = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
  fontWeight: 600,
  fontSize: "0.9375rem",
  paddingBottom: theme.spacing(1.5),
  marginBottom: theme.spacing(1.5),
  color: theme.palette.text.primary,
  borderBottom: `1px solid ${theme.palette.divider}`,
  "& .MuiSvgIcon-root": {
    fontSize: "1.125rem",
    color: theme.palette.primary.main,
  },
}));

// Checkbox "Tất cả" wrapper - copied from SearchSection.styles.js
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

// Grid layout for checkboxes - copied from SearchSection.styles.js
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

// Actions box - copied from SearchSection.styles.js
export const FilterActionsBox = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "flex-end",
  gap: theme.spacing(1),
  paddingTop: theme.spacing(1.5),
  marginTop: theme.spacing(0.5),
}));

// Cancel button - pill-shaped with blue border
export const FilterCancelButton = styled("button")(({ theme }) => ({
  textTransform: "none",
  color: theme.palette.primary.main,
  backgroundColor: theme.palette.mode === 'light' ? '#fff' : theme.palette.background.paper,
  border: `1.5px solid ${theme.palette.primary.main}`,
  borderRadius: '7px',
  padding: '10px 23px',
  height: '45px',
  fontWeight: 500,
  fontSize: '14px',
  minWidth: '85px',
  cursor: "pointer",
  transition: 'all 0.2s ease',
  "&:hover": {
   borderColor: theme.palette.primary.main,
  },
}));

// Apply button - pill-shaped with blue background
export const FilterApplyButton = styled("button")(({ theme }) => ({
  textTransform: "none",
  backgroundColor: theme.palette.primary.main,
  color: '#fff',
  borderRadius: '7px',
  padding: '10px 28px',
  height: '45px',
  fontWeight: 500,
  fontSize: '14px',
  minWidth: '120px',
  boxShadow: 'none',
  border: `1.5px solid ${theme.palette.primary.main}`,
  cursor: "pointer",
  transition: 'all 0.2s ease',
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
    borderColor: theme.palette.primary.dark,
    boxShadow: 'none',
  },
}));

// Wrapper for filter button with relative positioning
export const FilterButtonWrapper = styled(Box)(() => ({
  position: "relative",
  zIndex: 1099,
}));

// Dialog blue header - Redesigned to match centered gray/blue mockup
export const StyledDialogHeaderTitle = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#E6F0FA',
  padding: theme.spacing(2, 3),
  margin: theme.spacing(-3, -3, 2, -3),
  borderRadius: "4px 4px 0 0",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  borderBottom: `1px solid ${theme.palette.mode === 'dark' ? '#334155' : '#D5E3F5'}`,
}));

export const StyledDialogTitleWhite = styled(Typography)(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? '#93c5fd' : '#2364B0',
  fontWeight: 700,
  fontSize: "1.1rem",
  textTransform: "uppercase",
  textAlign: "center",
  letterSpacing: "0.5px",
}));

// Dialog content với scrollbar ẩn
export const StyledDialogContentNoScrollbar = styled(DialogContent)(() => ({
  height: "var(--dialog-content-height, auto)",
  overflowY: "hidden",
  paddingTop: "24px !important",
  // Ẩn scrollbar nhưng vẫn giữ chức năng scroll
  scrollbarWidth: "none", // Firefox
  msOverflowStyle: "none", // IE và Edge
  "&::-webkit-scrollbar": {
    display: "none", // Chrome, Safari, Opera
  },
}));
// Styled delete icon button for records section
export const StyledDeleteIconButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: theme.palette.error.main,
  color: "white",
  borderRadius: "4px",
  padding: "7px",
  "&:hover": {
    backgroundColor: theme.palette.error.dark,
  },
  "& .MuiSvgIcon-root": {
    fontSize: "1.25rem",
  }
}));

export const StyledSelectionDialog = styled(StyleDialog)(() => ({
  "& .MuiDialog-paper": {
    maxWidth: "1200px !important",
    width: "100%",
  },
}));

export const StyledTableWrapper = styled(Box)(() => ({
  border: "1px solid #E0E4E8",
  borderRadius: "8px",
  overflow: "hidden",
  // marginTop: theme.spacing(2),
}));

export const StyledTableContent = styled(Box)(({ theme, $isMobile }) => ({
  padding: $isMobile ? 0 : theme.spacing(2),
}));

export const StyledSelectionButton = styled(Box)(({ theme }) => ({
  "& .MuiButton-root": {
    backgroundColor: theme.palette.mode === 'dark' ? '#759fbc' : '#FFFFFF',
    color: theme.palette.mode === 'dark' ? "#FFFFFF" : "#2364B0",
    borderColor: theme.palette.mode === 'dark' ? '#759fbc' : '#2364B0',
    fontWeight: 600,
    textTransform: "uppercase",
    "&:hover": {
      backgroundColor: "rgba(35, 100, 176, 0.04)",
      borderColor: "#2364B0",
    },
  }
}));

// Styled clear button inside dialog input field to bypass eslint bans on style/sx
export const StyledDialogClearIconButton = styled(IconButton)({
  padding: "4px",
  "& .MuiSvgIcon-root": {
    fontSize: "16px",
  }
});

// Styled nested filter button inside dialog input field (38px height) to bypass eslint bans on style/sx
export const StyledNestedFilterIconButton = styled(IconButton)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 38,
  height: 38,
  minHeight: 32,
  border: `1px solid ${theme.palette.mode === 'dark' ? theme.palette.divider : '#e2e8f0'}`,
  borderRadius: "8px",
  color: theme.palette.text.primary,
  backgroundColor: "transparent",
  padding: 0,
  cursor: "pointer",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

// Dialog Actions container wrapper (without style/sx)
export const StyledSelectionDialogActions = styled(Box)(() => ({
  display: "flex",
  justifyContent: "flex-end",
  gap: "12px",
  padding: "16px 24px",
}));

// Dialog Cancel Button (without style/sx)
export const StyledDialogCancelButton = styled(MuiButton)(() => ({
  // backgroundColor: "#ffffff",
  // color: "#2364B0",
  // borderColor: "#2364B0",
  // border: "1px solid #2364B0",
  backgroundColor: "#dd3030",
  color:"#fff",
  fontWeight: 600,
  padding: "4px 24px",
  borderRadius: "8px",
  textTransform: "none",
  // "&:hover": {
  //   backgroundColor: "rgba(35, 100, 176, 0.04)",
  //   borderColor: "#2364B0",
  //   border: "1px solid #2364B0",
  // }
}));

// Dialog Save Button (without style/sx)
export const StyledDialogSaveButton = styled(MuiButton)(() => ({
  backgroundColor: "#2364B0",
  color: "#ffffff",
  fontWeight: 600,
  padding: "4px 24px",
  borderRadius: "8px",
  textTransform: "none",
  "&:hover": {
    backgroundColor: "#1b4f8f",
  }
}));

export const StyledCancelOutlinedButton = styled(MuiButton)(({ theme }) => ({
  color: theme.palette.error.main,
  borderColor: theme.palette.error.main,
  "&:hover": {
    borderColor: theme.palette.error.dark,
    backgroundColor: "rgba(211, 47, 47, 0.04)",
  }
}));

// Styled block wrapper for each section
export const StyledBlockWrapper = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",
  borderRadius: "8px",
  // border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#E0E4E8"}`,
  padding: theme.spacing(2.5),
  // marginBottom: theme.spacing(1.5),
}));
