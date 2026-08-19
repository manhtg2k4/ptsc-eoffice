import { styled } from "@mui/material/styles";
import {
  TableRow,
  TableCell,

  Checkbox,
  Box,
  TableHead,
  TableContainer,
  Table,
  Typography,
  Grid,
  InputAdornment,
  Dialog,
  IconButton,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import { ScrollTableContainer } from "@styles/Common.styles";

import { StyleButton } from '@styles/StyleComponent.style'
import { SkyBox, SkyTypography } from "@styles/SkyStyles";
import SendIcon from "@mui/icons-material/Send";

export const StyleBoxNoBorder = styled(Box)(() => ({
  width: "100%",
  flex: 1,
  display: "flex",
  flexDirection: "column",
}));

export const StyledSendIcon = styled(SendIcon)(({ theme }) => ({
  color: theme.palette.primary.main,
  fontSize: "20px",
  transform: "rotate(-45deg)",
  position: "relative",
  top: "-2px",
}));

export const OpinionHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
  marginBottom: theme.spacing(1),
  padding: theme.spacing(0, 2.5),
}));

export const OpinionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  fontSize: "15px",
  color: theme.palette.primary.main,
  textTransform: "none",
}));

export const OpinionArea = styled(Box)(({ theme }) => ({
  width: "100%",
  padding: theme.spacing(0, 2),
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    backgroundColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "#fcfcfd",
    transition: "all 0.2s ease-in-out",
    "&:hover": {
      backgroundColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "#fff",
    },
    "&.Mui-focused": {
      backgroundColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "#fff",
    },
    "& fieldset": {
      borderColor: theme.palette.divider,
    },
  },
  "& .MuiInputBase-input": {
    fontSize: "13px",
    padding: "10px 14px !important",
    lineHeight: 1.5,
    "&::placeholder": {
      color: theme.palette.text.secondary,
      opacity: 0.6,
    },
  },
}));

export const StyleContentBorder = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: "8px",
  padding: theme.spacing(2),
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : "#ffffff",
  margin: theme.spacing(1.5),
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  boxShadow: "0 2px 4px rgba(0,0,0,0.02)", // Subtle shadow for premium feel
}));

export const StylePanel = StyleContentBorder; // Alias for convenience

export const StyleDialogBody = styled(Box)(() => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  minHeight: 0,
}));

export const StyledActionButton = styled(StyleButton, {
  shouldForwardProp: (prop) => prop !== 'variant',
})(({ theme, variant = 'secondary' }) => {
  const isError = variant === "close" || variant === "red" || variant === "error";
  const isPrimary = variant === "primary";
  const borderColor = isError ? "#d32f2f" : "#2364B0";
  
  return {
    backgroundColor: isPrimary ? "#2364B0" : (isError ? "#d32f2f" : "#ffffff"),
    fontSize: 14,
    color: (isPrimary || isError) ? "#ffffff" : "#303940",
    border: `1px solid ${borderColor}`,
    borderRadius: "10px",
    textTransform: "none",
    fontWeight: 600,
    padding: "0 20px",
    height: "38px",
    "&:hover": {
      backgroundColor: isPrimary 
        ? "#1b4e89" 
        : (isError ? "#b71c1c" : "rgba(26, 86, 219, 0.05)"),
      borderColor: borderColor,
    },
    ...(theme.palette.mode === "dark" && {
      backgroundColor: isPrimary 
        ? "rgba(35, 100, 176, 0.8)" 
        : (isError ? "rgba(211, 47, 47, 0.7)" : "rgba(123, 165, 198, 0.7)"),
      color: "#ffffff",
      border: "none",
      "&:hover": {
        backgroundColor: isPrimary 
          ? "rgba(35, 100, 176, 0.95)" 
          : (isError ? "rgba(211, 47, 47, 0.9)" : "rgba(123, 165, 198, 0.9)"),
      },
    }),
    "&.Mui-disabled": {
      backgroundColor: theme.palette.action.disabledBackground,
      color: theme.palette.action.disabled,
      borderColor: theme.palette.action.disabledBackground,
    },
  };
});
// Container chính
export const StyleBoxContainer = styled(Box, {
  shouldForwardProp: (prop) =>
    !["$isMobileOrTablet", "$showPanel"].includes(prop),
})(({ theme, $isMobileOrTablet, $showPanel }) => ({
  // height: "80vh",
  width: "100%",
  flex: 1, // Add this
  display: "flex", // Change to flex to support children filling height
  flexDirection: "column", // Add this
  border: `1px solid ${theme.palette.divider}`,
  [theme.breakpoints.down("md")]: {
    display: $isMobileOrTablet && !$showPanel ? "none" : "flex", // Adjust to flex
  },
}));

export const StyleListUserBoxContainer = styled(Box)(({ theme }) => ({
  width: "100%",
  flex: 1, // Add this
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  minHeight: 0,
  padding: '0',
}));

export const StyleBoxContainerRight = styled(Box, {
  shouldForwardProp: (prop) =>
    !["$isMobileOrTablet", "$showPanel"].includes(prop),
})(({ theme, $isMobileOrTablet, $showPanel }) => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  width: "100%",
  padding: "0 10px",
  border: `1px solid ${theme.palette.divider}`,
  borderLeft: "none",
  overflow: "hidden",
  minHeight: 0,

  [theme.breakpoints.down("md")]: {
    display: $isMobileOrTablet && !$showPanel ? "none" : "flex",
  },
}));

export const StyledContainer = styled(Box)({
  display: "flex",
  flex: 1,
  minHeight: 0,
  height: "100%",
  padding: '0',
  "@media (min-width: 320px) and (max-width: 600px)": {
    padding: 0,
  },

});

export const PanelContainer = styled(Box)(({ theme }) => ({
  width: "100%",
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  borderRight: `1px solid ${theme.palette.divider}`,
}));

export const PanelHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
  overflowX: "hidden",
  width: "100%",
  "@media (min-width: 320px) and (max-width: 600px)": {
    padding: 0,
  },
}));

export const StyledCheckbox = styled(Checkbox)(({ theme }) => ({
  padding: 0,
  "&.Mui-checked": {
    color: theme.palette.error.main,
  },
  "&.Mui-disabled": {
    color: "#acabad",
  },
  "&.Mui-checked.Mui-disabled": {
    color: "#acabad",
  },
}));

export const StyledTableCellLeft = styled(TableCell)(() => ({
  padding: "6px !important",
  textAlign: "center",
  "@media (min-width: 320px) and (max-width: 600px)": {
    padding: "4px !important",
    textAlign: "start",
  },
}));

export const StyledGridContainer = styled(Grid)(() => ({
  alignItems: "center",
  width: "100%",
  position: "sticky",
  zIndex: 999,
  "@media (min-width: 320px) and (max-width: 600px)": {
    padding: 0,
    margin: 0,
    "&.MuiGrid-container": {
      margin: 0,
      width: "100%",
    },
  },
}));

export const StyledGridItemLeft = styled(Grid)(({ theme }) => ({
  [theme.breakpoints.up("sm")]: {
    flexBasis: "50%",
    maxWidth: "50%",
  },
  [theme.breakpoints.down("sm")]: {
    flexBasis: "100%",
    maxWidth: "100%",
  },

  "@media (min-width: 320px) and (max-width: 600px)": {
    paddingLeft: "0 !important",
    paddingRight: "0 !important",
    margin: "0 !important",
  },

}));

export const StyledGridItemRight = styled(Grid)(({ theme }) => ({
  [theme.breakpoints.up("sm")]: {
    flexBasis: "50%",
    maxWidth: "50%",
  },
  [theme.breakpoints.down("sm")]: {
    flexBasis: "100%",
    maxWidth: "100%",
  },
  "@media (min-width: 320px) and (max-width: 600px)": {
    paddingLeft: "0 !important",
    paddingRight: "0 !important",
    margin: "0 !important",
  },
}));

export const StyledInputAdornment = styled(InputAdornment)(({ theme }) => ({
  padding: theme.spacing(0.5),
}));

export const StyledInputAdornmentInput = styled(InputAdornment)(
  ({ theme }) => ({
    position: "start",
    color: theme.palette.text.primary,
  })
);

export const StyleDialog = styled(Dialog, {
  shouldForwardProp: (prop) => prop !== 'isheight',
})(({ theme, maxWidth, isheight }) => ({
  "& .MuiDialog-paper": {
    width: "100%",
    maxWidth: maxWidth ? undefined : 1900,
    maxHeight: isheight || '90vh',
    height: isheight || 'auto',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
  },
}));


export const StyledTableContainer = styled(
  ScrollTableContainer.withComponent(TableContainer), {
  shouldForwardProp: (prop) => prop !== "checkTransfer" && prop !== "isMobileOrTablet" && prop !== "isHeight" && prop !== "customMaxHeight",
})(() => {
   return {
    // marginTop: "16px",
    height: "100%", // Always fill parent flex
    flex: 1,
    minHeight: 0,
    backgroundColor: "transparent",
    overflow: "visible !important",
    "& .MuiTable-root": {
      borderCollapse: "separate",
      borderSpacing: 0,
    }
  };
});


export const StyledTableContainer1 = styled(
  ScrollTableContainer.withComponent(TableContainer),
  {
    shouldForwardProp: (prop) =>
      prop !== "customHeight" &&
      prop !== "customMinHeight" &&
      prop !== "noBorder" &&
      prop !== "lastColumnAlign",
  }
)(({ theme, customHeight, customMinHeight, noBorder, lastColumnAlign = "right" }) => ({
  // borderBottom: `1px solid ${theme.palette.divider}`,
  marginTop: theme.spacing(1),
  height: customHeight || "100%",
  minHeight: customMinHeight || "500px",
  backgroundColor: "transparent",
  overflowY: "auto !important",
  overflowX: "hidden !important",
  ...(noBorder && {
    "& .MuiTable-root": {
      border: "none",
    },
    "& .MuiTableCell-root": {
      border: "none !important",
    },
    "& thead .MuiTableCell-root": {
      borderBottom: `1px solid ${theme.palette.divider} !important`,
      backgroundColor: `${theme.palette.mode === 'dark' ? theme.palette.background.paper : "#fff"} !important`,
      padding: "12px 8px !important",
      zIndex: 100,
      "& *": {
        fontWeight: "700 !important",
        color: `${theme.palette.text.primary} !important`,
        fontSize: "14px !important",
      },
    },
    "& thead .MuiTableCell-root:last-child": {
      textAlign: `${lastColumnAlign} !important`,
      ...(lastColumnAlign === "right" && {
        paddingRight: "16px !important",
      }),
      ...(lastColumnAlign === "center" && {
        paddingLeft: "8px !important",
        paddingRight: "8px !important",
      }),
    },
    "& tbody .MuiTableCell-root:last-child": {
      textAlign: `${lastColumnAlign} !important`,
      ...(lastColumnAlign === "right" && {
        paddingRight: "12px !important",
      }),
      ...(lastColumnAlign === "center" && {
        paddingLeft: "8px !important",
        paddingRight: "8px !important",
      }),
    },
    "& tbody .MuiTableRow-root:hover": {
      backgroundColor: "transparent !important",
    },
  }),
}));

export const StyledTableContainerBorder = styled(
  ScrollTableContainer.withComponent(TableContainer)
)(({ theme }) => ({
  // borderBottom: `1px solid ${theme.palette.divider}`,
  marginTop: theme.spacing(1),
   height: "380px",
  minHeight: "380px",
  backgroundColor: "transparent",
}));

export const StyledTable = styled(Table)(() => ({
  tableLayout: "fixed",
  width: "100%",
}));

export const StyledTableHead = styled(TableHead, {
  shouldForwardProp: (prop) => prop !== "isBgCl",
})(({ theme, isBgCl }) => ({
  '& th': {
    backgroundColor: isBgCl ? theme.palette.primary.main : (theme.palette.mode === 'dark' ? theme.palette.background.default : "#f8fafd"), // Standard light grey-blue for headers
    color: isBgCl ? theme.palette.primary.contrastText : theme.palette.text.primary,
    fontWeight: 600,
    zIndex: 100,
    position: 'sticky !important',
    border: `1px solid ${theme.palette.divider}`, // Add border to each cell
  },
  // Row 1 sticky top
  '& tr:nth-of-type(1) th': {
    top: '0 !important',
    zIndex: 110, 
  },
  // Row 2 sticky top
  '& tr:nth-of-type(2) th': {
    top: '53px !important',
    zIndex: 105, 
  }
}));

export const StylePanelHeader = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.default : "#f8fafd",
  padding: "12px 16px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  borderRadius: "8px 8px 0 0",
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "48px",
}));

export const StylePanelTitle = styled(Typography)(({ theme }) => ({
  color: theme.palette.primary.main,
  fontWeight: "bold",
  textAlign: "center",
  textTransform: "uppercase",
  fontSize: "13px",
}));

export const StyledTableRow = styled(TableRow)(() => ({}));

export const StyledTableCellLarge = styled(TableCell, {
  shouldForwardProp: (prop) => prop !== "hideCheckboxes",
})(({ theme, hideCheckboxes }) => ({
  width: hideCheckboxes ? "100%" : "auto",

  verticalAlign: "middle",
  overflow: "hidden",
  // textOverflow: "ellipsis",
  // whiteSpace: "nowrap",
  maxWidth: "100%",
  border: `1px solid ${theme.palette.divider}`,
  "@media (min-width: 320px) and (max-width: 600px)": {
    fontSize: "11px",
    textAlign: "start",
  },
}));

export const StyledTableCellMedium = styled(TableCell)(({ theme, roleColor }) => ({
  width: "120px",
  minWidth: "120px",
  padding: "4px !important",
  textAlign: "center",
  backgroundColor: theme.palette.background.paper,
  whiteSpace: "normal",
  lineHeight: 1.2,
  overflow: "hidden",
  maxWidth: "120px",

  color: roleColor || "",
  borderRight: `1px solid ${theme.palette.divider}`,
  borderBottom: `1px solid ${theme.palette.divider}`,
  "&:last-child": {
    borderRight: "none",
  },

  "@media (min-width: 320px) and (max-width: 600px)": {
    textAlign: "start",
    fontSize: "11px",
    position: "relative",
    right: "auto !important",
    width: "auto",
    minWidth: "auto",
  },
}));


// export const StyledTableCellMedium = styled(TableCell, {
//   shouldForwardProp: (prop) => prop !== "colorText",
// })(({ theme, colorText }) => ({
//   width: "18%",
//   textAlign: "center",
//   overflow: "hidden",
//   textOverflow: "ellipsis",
//   whiteSpace: "nowrap",
//   maxWidth: "100%",
//   color:
//     colorText === "error"
//       ? theme.palette.error.main
//       : colorText === "primary"
//       ? theme.palette.primary.main
//       : colorText === "warning"
//       ? theme.palette.warning.main
//       : colorText === "info"
//       ? theme.palette.info.main
//       : theme.palette.text.primary,
//   "@media (min-width: 320px) and (max-width: 600px)": {
//     textAlign: "start",
//     fontSize: "11px",
//   },
// }));

export const StyledTableCellSmall = styled(TableCell)(({ theme }) => ({
  width: "10% !important",
  minWidth: "70px",
  textAlign: "center",
  borderRight: `1px solid ${theme.palette.divider}`,
  borderBottom: `1px solid ${theme.palette.divider}`,
  "@media (min-width: 320px) and (max-width: 600px)": {
    textAlign: "start",
    fontSize: "11px",
    minWidth: "50px",
  },
}));

export const StyledTableCell = styled(TableCell)(({ theme }) => ({
  "& .MuiTypography-root": {
    fontWeight: 600,
    fontSize: 13,
    color: theme.palette.text.primary,
  },
  "@media (min-width: 320px) and (max-width: 600px)": {
    padding: "4px !important",
    "& .MuiTypography-root": {
      fontSize: "11px",
      textAlign: "start",
    },
  },
}));

export const StyledHeaderBox = styled(Box)(() => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  minWidth: 0,
  overflow: "visible",

  "@media (min-width: 320px) and (max-width: 600px)": {
    justifyContent: "flex-start",
    gap: 2,
  },
  "& > *:first-of-type": {
    overflow: "visible",

    // textOverflow: "ellipsis",
    // whiteSpace: "nowrap",
    flex: 1,
    minWidth: 0,
  },
}));

export const StyledCheckboxs = styled(Checkbox)(({ theme }) => ({
  padding: 0,
  marginLeft: 0,
  color: theme.palette.text.secondary,
  "&.Mui-checked": {
    color: theme.palette.primary.main,
  },
}));

export const StyledRow = styled(TableRow, {
  shouldForwardProp: (prop) => prop !== "$isSelected",
})(({ theme, $isSelected }) => ({
  "& td, & th": {
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
  backgroundColor: $isSelected ? theme.palette.action.hover : "inherit",
}));

export const StyledTableCellLeft1 = styled(TableCell)(({ theme }) => ({
  paddingTop: 6,
  paddingBottom: 6,
  fontSize: 13,
  color: theme.palette.text.primary,
  "@media (min-width: 320px) and (max-width: 600px)": {
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 4,
    paddingRight: 4,
    fontSize: "11px",
    textAlign: "start",
  },
}));

export const StyledRowBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== "level",
})(({ theme, level }) => ({
  display: "flex",
  alignItems: "center",
  marginLeft: theme.spacing((level || 0) * 2),
  "@media (min-width: 320px) and (max-width: 600px)": {
    marginLeft: theme.spacing((level || 0) * 1),
    fontSize: "11px",
  },
}));

export const StyledDialogFooterButtons = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  width: "100%",
  gap: theme.spacing(1.5),
  flexShrink: 0,
  "& button, & button *, & .MuiButton-root, & .MuiButton-root *": {
    whiteSpace: "nowrap !important",
  },
  "& button, & .MuiButton-root": {
    fontSize: "12px !important",
    padding: "8px 12px !important",
    minWidth: "auto !important",
  }
}));

export const StyledFlexBetween = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  paddingTop: theme.spacing(1),
}));

export const StyledInputFullWidth = styled(Box)(() => ({
  width: "100%",
  marginTop: "16px",
}));

export const StyledClickableBox = styled(Box, {
  shouldForwardProp: (prop) => !["hasChild", "isUser"].includes(prop),
})(({ theme, hasChild, isUser }) => ({
  display: "flex",
  alignItems: "center",
  cursor: hasChild ? "pointer" : "default",
  color: isUser ? theme.palette.primary.main : theme.palette.text.primary,
  minWidth: 0,
  flex: 1,
  overflow: "hidden",
  "&:hover": hasChild
    ? {
      color: theme.palette.primary.main,
    }
    : {},
  "@media (min-width: 320px) and (max-width: 600px)": {
    fontSize: "11px",
  },
}));

export const StyledExpandButton = styled(IconButton)(({ theme }) => ({
  marginLeft: 4,
  padding: 4,
  color: theme.palette.text.secondary,
}));

export const StyledNameText = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "isColor" && prop !== "isBold",
})(({ theme, isColor, isBold }) => ({
  fontSize: 12,
  marginLeft: 4,
  fontWeight: isBold ? 600 : 'normal',
  color: isColor ? theme.palette.primary.main : theme.palette.text.primary,
  "@media (min-width: 320px) and (max-width: 600px)": {
    fontSize: "11px",
    marginLeft: 0,
    textAlign: "start",
  },
}));

export const StyledNameTextHeader = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "textColor",
})(({ theme, textColor }) => ({
  fontSize: 11,
  marginLeft: 4,
  textAlign: "center",
	// color: theme.palette.text.primary,
	color: textColor ? theme.palette.text.primary : theme.palette.primary.contrastText,
  // overflow: "hidden",
  // textOverflow: "ellipsis",
  // whiteSpace: "nowrap",
  maxWidth: "100%",
  "@media (min-width: 320px) and (max-width: 600px)": {
    fontSize: "11px",
    marginLeft: 0,
    textAlign: "start",
  },
}));

export const StyledNameTextHeaderTH = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "textColor",
})(({ theme, textColor }) => ({
  fontSize: 13,
  marginLeft: 4,
  textAlign: "center",
	// color: theme.palette.text.primary,
	color: textColor ? textColor : theme.palette.text.primary,
  // overflow: "hidden",
  // textOverflow: "ellipsis",
  // whiteSpace: "nowrap",
  maxWidth: "100%",
  "@media (min-width: 320px) and (max-width: 600px)": {
    fontSize: "11px",
    marginLeft: 0,
    textAlign: "start",
  },
}));

export const StyleContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  position: "relative",
  flex: 1,
  height: "100%",
  width: "100%",
  padding: theme.spacing(1),
  overflow: "hidden",
  minHeight: 0,
  [theme.breakpoints.down("md")]: {
    flexDirection: "column",
  },
}));

export const IconWrapper = styled(Box)({
  display: "flex",
  alignItems: "center",
  "& svg": {
    marginRight: "8px",
    color: "#2196f3",
    fontSize: "16px",
  },
});

export const StyleBoxFoodter = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});

export const StyleBoxFoodterEnd = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "end",
  padding: "10px",
});

export const StyledDialogFooter = styled(Box)(({ theme }) => ({
  flexShrink: 0,
  padding: theme.spacing(1, 1.5),
  backgroundColor: theme.palette.background.paper,
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
  zIndex: 1,
}));

export const StyleAssignmentsTableWrapper = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: "240px",
  display: "flex",
  flexDirection: "column",
  border: `1px solid ${theme.palette.divider}`,
  overflow: "auto",
  [theme.breakpoints.down("xl")]: {
    minHeight: "280px",
  },
}));

export const StyledAssignmentsTableContainer = styled(StyledTableContainer)(
  ({ theme }) => ({
    marginTop: 0,
    height: "100%",
    flex: 1,
    overflowY: "auto !important",
    overflowX: "auto !important",
    [theme.breakpoints.down("xl")]: {
      maxHeight: "400px",
    },
  })
);

export const StyledToggleButton = styled(StyleButton)(({ theme }) => ({
  position: "absolute",
  top: "50%",
  right: theme.spacing(2),
  transform: "translateY(-50%)",
  zIndex: 1300,
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
  minWidth: "auto",
  padding: theme.spacing(0.75, 1.5),
  fontSize: "0.75rem",
  textTransform: "none",
  [theme.breakpoints.up("md")]: {
    display: "none",
  },
  "& svg": {
    fontSize: "1rem",
  },
}));


export const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center", // Căn giữa nội dung
  flexShrink: 0,
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.default : "#f0f4f8", // Màu nền thanh tiêu đề
  borderBottom: `1px solid ${theme.palette.divider}`,
  padding: "12px 24px",
  "@media (min-width: 320px) and (max-width: 600px)": {
    padding: theme.spacing(1),
    fontSize: "11px",
    "& > *": {
      fontSize: "11px",
      // textAlign: "start",
    },
    "& .MuiTypography-root": {
      fontSize: "11px",
      // textAlign: "start",
    },
  },
}));

export const StyledTitleText = styled(SkyTypography)(({theme}) => ({
  overflow: "hidden",
  // flex: 1,
  minWidth: 0,
  color: theme.palette.primary.main,
  fontWeight: "bold",
  fontSize: 20,
  textAlign: "center",
  textTransform: "uppercase", // Thường tiêu đề dialog viết hoa

  "@media (min-width: 320px) and (max-width: 600px)": {
    fontSize: "14px",
  },
}));

export const StyledDialogContentMobile = styled(DialogContent)(() => ({
  padding: '0',
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  minHeight: 0,
  "@media (min-width: 320px) and (max-width: 600px)": {
    padding: "8px !important",
    "& .MuiInputBase-root": {
      fontSize: "11px",
    },
    "& .MuiInputLabel-root": {
      fontSize: "11px",
    },
  },
}));


export const StyledNameAndIcon = styled(Box)(() => ({
  display: "flex",
  alignItems: "center",
  gap: '4px',

}));

export const StyledDeleteButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.error.main,
  padding: 4,
  "&:hover": {
    backgroundColor: theme.palette.error.light + "20",
  },
}));

export const StyledSearchButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  borderRadius: "0 4px 4px 0",
  padding: "8px 12px",
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export const StyledSearchContainer = styled(Box)(() => ({
  display: "flex",
  alignItems: "stretch",
  width: "100%",
  "& .MuiFormControl-root, & .MuiTextField-root": {
    flex: 1,
  },
  "& .MuiOutlinedInput-root": {
    borderRadius: "4px 0 0 4px",
  },
}));


export const StyleScrollRenderTableTree = styled(SkyBox)(({ customMaxHeight }) => ({
  maxHeight: customMaxHeight || '',
  // overflow: "auto",
}));

export const StyleButtonOtherOpinions = styled(StyledActionButton)(() => ({
	backgroundColor: "#FFA600",
	"&:hover": { backgroundColor: "#e69500" },
}));
