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
// nút button
export const StyledActionButton = styled(StyleButton, {
})(({ theme, variantColor, variant, color }) => {
  const isError =
    variantColor === "close" ||
    variantColor === "red" ||
    variant === "error" ||
    color === "error";

  return {
    padding: '0 12px',
    height: '40px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    color: isError ? `${theme.palette.error.main} !important` : theme.palette.primary.main,
    borderColor: isError ? `${theme.palette.error.main} !important` : undefined,
    '& .MuiSvgIcon-root, & svg': {
      color: isError ? `${theme.palette.error.main} !important` : 'inherit',
    },
    '&:hover': {
      borderColor: isError ? `${theme.palette.error.dark} !important` : undefined,
      backgroundColor: isError ? "rgba(211, 47, 47, 0.05)" : undefined,
    },
    // Các style mặc định cho trạng thái disabled, áp dụng bất kể variant
    '&.Mui-disabled': {
      backgroundColor: theme.palette.action.disabledBackground,
      color: theme.palette.action.disabled,
    },

    // Các style cụ thể cho nút outlined với color="inherit"
    '&.MuiButton-outlinedInherit': {
      '&:hover': {
        borderColor: 'rgba(255, 255, 255, 0.7)',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
      },
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
  [theme.breakpoints.down("md")]: {
    display: $isMobileOrTablet && !$showPanel ? "none" : "block",
  },
}));

export const StyleListUserBoxContainer = styled(Box)(({ theme }) => ({
  width: "100%",
  height: "90%",
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  minHeight: 0,
}));

export const StyleBoxContainerRight = styled(Box, {
  shouldForwardProp: (prop) =>
    !["$isMobileOrTablet", "$showPanel"].includes(prop),
})(({ theme, $isMobileOrTablet, $showPanel }) => ({
  // height: "80%",
  // maxHeight:'500px',
  width: "100%",
  [theme.breakpoints.down("md")]: {
    display: $isMobileOrTablet && !$showPanel ? "none" : "block",
  },
}));

export const StyledContainer = styled(Box)({
  display: "flex",
  height: "100%",
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
  // borderBottom: `1px solid ${theme.palette.divider}`,
  flexShrink: 0,
  width: "100%",
  "@media (min-width: 320px) and (max-width: 600px)": {
    padding: 0,
  },
}));

export const StyledCheckbox = styled(Checkbox)(({ theme }) => ({
  padding: 0,
  "&.Mui-checked": {
    color: theme.palette.error.main, // tự động theo theme
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

export const StyleDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    width: "100%",
    maxWidth: 1900,
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
  },
}));


export const StyledTableContainer = styled(
  ScrollTableContainer.withComponent(TableContainer)
)(({ theme, isMobileOrTablet }) => ({
  marginTop: theme.spacing(2),
  height: "650px",
  backgroundColor: "transparent",
  "@media (max-width: 2000px)": {
    height: "520px",
  },

  ...(isMobileOrTablet && {
    height: "520px", // ví dụ height nhỏ hơn cho mobile/tablet
  }),
}));


export const StyledTableContainer1 = styled(
  ScrollTableContainer.withComponent(TableContainer)
)(({ theme }) => ({
  // borderBottom: `1px solid ${theme.palette.divider}`,
  marginTop: theme.spacing(2),
  height: "380px",
  backgroundColor: "transparent",

}));

export const StyledTable = styled(Table)(() => ({}));

export const StyledTableHead = styled(TableHead)(() => ({}));

export const StyledTableRow = styled(TableRow)(() => ({}));

export const StyledTableCellLarge = styled(TableCell)({
  width: "46%",
  verticalAlign: "middle",
  overflow: "hidden",
  // textOverflow: "ellipsis",
  // whiteSpace: "nowrap",
  maxWidth: "100%",
  "@media (min-width: 320px) and (max-width: 600px)": {
    fontSize: "11px",
    textAlign: "start",
  },
});

export const StyledTableCellMedium = styled(TableCell)(() => ({
  width: "18%",
  textAlign: "center",
  overflow: "hidden",
  // textOverflow: "ellipsis",
  // whiteSpace: "nowrap",
  maxWidth: "100%",
  "@media (min-width: 320px) and (max-width: 600px)": {
    textAlign: "start",
    fontSize: "11px",
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

export const StyledTableCellSmall = styled(TableCell)({
  width: "10% !important",
  textAlign: "center",
  "@media (min-width: 320px) and (max-width: 600px)": {
    textAlign: "start",
    fontSize: "11px",
  },
});

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
  overflow: "hidden",
  "@media (min-width: 320px) and (max-width: 600px)": {
    justifyContent: "flex-start",
    gap: 2,
  },
  "& > *:first-of-type": {
    overflow: "hidden",
    // textOverflow: "ellipsis",
    // whiteSpace: "nowrap",
    flex: 1,
    minWidth: 0,
  },
}));

export const StyledCheckboxs = styled(Checkbox)(({ theme }) => ({
  padding: 0,
  marginLeft: 4,
  color: theme.palette.text.secondary,
  "&.Mui-checked": {
    color: theme.palette.primary.main,
  },
}));

export const StyledRow = styled(TableRow)(({ theme }) => ({
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
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
  marginLeft: theme.spacing(level * 2),
  "@media (min-width: 320px) and (max-width: 600px)": {
    marginLeft: theme.spacing(level * 1),
    fontSize: "11px",
  },
}));

export const StyledClickableBox = styled(Box, {
  shouldForwardProp: (prop) => !["hasChild", "isUser"].includes(prop),
})(({ theme, hasChild, isUser }) => ({
  display: "flex",
  alignItems: "center",
  cursor: hasChild ? "pointer" : "default",
  color: isUser ? theme.palette.primary.main : theme.palette.text.primary,
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

export const StyledNameText = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  marginLeft: 4,
  color: theme.palette.text.primary,
  "@media (min-width: 320px) and (max-width: 600px)": {
    fontSize: "11px",
    marginLeft: 0,
    textAlign: "start",
  },
}));

export const StyledNameTextHeader = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  marginLeft: 4,
  textAlign: "center",
  color: theme.palette.text.primary,
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
  // flexDirection: "column",
  // gap:'5px',
  width: "99%",
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

export const StyleAssignmentsTableWrapper = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: "240px",
  display: "flex",
  flexDirection: "column",
  [theme.breakpoints.down("xl")]: {
    minHeight: "280px",
  },
}));

export const StyledAssignmentsTableContainer = styled(StyledTableContainer)(
  () => ({
    marginTop: 0,
    height: 500,
    maxHeight: 500,
    flex: "0 0 500px",
    overflow: "auto",
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
  justifyContent: "space-between",
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

export const StyledTitleText = styled(Typography)(() => ({
  overflow: "hidden",
  // textOverflow: "ellipsis",
  // whiteSpace: "nowrap",
  flex: 1,
  minWidth: 0,
  fontWeight: 600,

  "@media (min-width: 320px) and (max-width: 600px)": {
    fontSize: "11px",
    // textAlign: "start",
  },
}));

export const StyledDialogContentMobile = styled(DialogContent)(() => ({
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
