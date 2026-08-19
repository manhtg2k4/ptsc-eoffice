
import { styled } from "@mui/material/styles";
import {
  FormControlLabel,
} from "@mui/material";
import { 
  SkyBox, 
  SkyTypography, 
  SkyTableContainer,
  SkyTable,
  SkyTableBody,
  SkyTableCell,
  SkyTableHead,
  SkyTableRow,
  SkyTextField,
  SkySelect,
  SkyPagination,
  SkyInputAdornment,
  SkyFormControl,
  SkyStack,
  SkyButton,
  SkyGrid,
  SkyCheckbox,
  SkyRadio,
  SkyIconButton,
  SkyDialog,
  SkyDialogTitle,
  SkyDialogContent,
  SkyDialogActions,
} from "@styles/SkyStyles";
import {
  ArrowDropUp,
  ArrowDropDown,
  Clear as ClearIcon,
} from "@mui/icons-material";

export const StyledPaper = styled("div")(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  maxHeight: "calc(100vh - 100px)",
  overflow: "hidden",
  padding: 8,
  borderRadius: 10,
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : "transparent",
}));

export const StyledToolbar = styled(SkyBox)(() => ({
  minHeight: "0 !important",
  display: "flex",
  position: "relative",
  width: "100%",
  padding: 0,
  margin: 0,
  paddingTop: 0, 
  paddingBottom: 0, 
}));

export const SearchContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  position: "relative",
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : "transparent",
  padding: 0, 
  borderRadius: theme.shape.borderRadius,
  [theme.breakpoints.down("md")]: {
    flexWrap: "wrap",
  },
}));

export const ToolbarContent = styled(SkyBox)(() => ({
  display: "flex",
  alignItems: "center",
  width: "100%",
  paddingTop: 18, 
  paddingBottom: 28, 
}));

export const ActionsContainer = styled(SkyBox)(({ styleJustifyContent }) => ({
  display: "flex",
  justifyContent: styleJustifyContent || "space-between",
  alignItems: "center",
  gap: 2,
  paddingTop: 8, 
  paddingBottom: 8, 
}));
export const ActionsContainerFooter = styled(SkyBox)({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 2,
  paddingTop: 0, 
  paddingBottom: 0, 
});

export const TopActionsContainer = styled(SkyBox)(({ styleJustifyContent }) => ({
  display: "flex",
  justifyContent: styleJustifyContent || "space-between",
  paddingTop: 8, 
  paddingBottom: 8, 
}));

export const ExtraContentBox = styled(SkyBox)(() => ({
  marginTop: 0, 
  marginBottom: 0, 
}));

export const ToolbarContainer = styled(SkyBox)({
  width: "100%",
  padding: 0, 
  margin: 0, 
});

export const FilterBox = styled(SkyBox)(({ theme }) => ({
  position: "absolute",
  top: "108%",
  display: "flex",
  flexDirection: "column",
  background: theme.palette.background.paper,
  boxShadow: "rgba(0, 0, 0, 0.1) 0px 4px 10px",
  borderRadius: 5,
  padding: 10,
  zIndex: 1001,
  minWidth: 340,
  maxWidth: 380,
  maxHeight: 500,
  overflowY: "auto",
  whiteSpace: "nowrap",
  [theme.breakpoints.down("sm")]: {
    left: 0,
  },
}));

export const FilterTitle = styled(SkyTypography)({
  textAlign: "center",
  fontSize: "16px !important",
  fontWeight: "bold",
  marginBottom: "8px",
});

export const FilterFormControlLabel = styled(FormControlLabel)({
  fontSize: "14px !important",
});

export const StyledSearchField = styled(SkyTextField)(({ theme }) => ({
  flexGrow: 1, 
  minWidth: 400, 
  maxWidth: 450, 

  "& .MuiOutlinedInput-root": {
    borderRadius: `${theme.shape.borderRadius}px`,
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
    borderRadius: `${theme.shape.borderRadius}px`,
  },
  [theme.breakpoints.down("md")]: {
    minWidth: "calc(100% - 160px)", 
    maxWidth: "100%",
    flexBasis: "calc(100% - 160px)", 
  },
}));

export const StyledTableHead = styled(SkyTableHead)(({ theme, styleColor }) => ({
  position: "sticky",
  top: 0,
  zIndex: 1000,
  backgroundColor:
    theme.components?.MuiTableHead?.styleOverrides?.root?.backgroundColor ||
    theme.palette.background.paper,
  borderBottom: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${theme.palette.divider}`,
  borderTop: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${theme.palette.divider}`, 
  color: styleColor || theme.palette.text.primary,
}));

export const StyledTableContainer = styled(SkyTableContainer)(
  ({ isMaxHeight }) => ({
    flex: 1, 
    overflowY: "auto",
    position: "relative",
    width: "100%", 
    height: "100%", 
    ...(isMaxHeight && { maxHeight: "calc(100vh - 420px)" }),
  })
);

export const StyledTable = styled(SkyTable)(
  ({ styleBorderCollapse, styleBorder }) => ({
    borderCollapse: styleBorderCollapse || "separate !important",
    minWidth: "unset !important",
    width: "100%",
    border: styleBorder || null,
  })
);

export const StyledTableBorder = styled(SkyTable)(
  ({ styleBorderCollapse, styleBorder, styleTableLayout }) => ({
    tableLayout: styleTableLayout || "auto", 
    borderCollapse: styleBorderCollapse || "collapse", 
    minWidth: "unset !important",
    width: "100%",
    border: styleBorder || "1px solid #e0e0e0", 
  })
);

export const StyledTableBody = styled(SkyTableBody)({});

export const StyledTableRow = styled(SkyTableRow, {
  shouldForwardProp: (prop) => prop !== "index",
})(({ theme }) => ({
  color: theme.palette.text.primary,
  borderBottom: "none",
  cursor: "pointer",
  "&.MuiTableRow-root": {
    backgroundColor: theme.palette.background.paper,
    "&:nth-of-type(odd)": {
      backgroundColor: theme.palette.background.paper,
    },
    "&:nth-of-type(even)": {
      backgroundColor: theme.palette.background.paper,
    },
    "&:hover": {
      backgroundColor: `${theme.palette.action.hover} !important`,
    },
  },
}));

export const StyledTableCells = styled(SkyTableCell, {
  shouldForwardProp: (prop) =>
    ![
      "borderLeft",
      "alignCenter",
      "width",
      "disableActions",
      "disableCol",
      "isAction",
    ].includes(prop),
})(({
  theme,
  borderLeft,
  alignCenter,
  width,
  disableActions,
  disableCol,
  isAction,
}) => {
  const isLastSticky = disableActions || disableCol;

  return {
    minHeight: 41,
    height: 41,
    borderBottom: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
      theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
        ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
          theme.palette.divider
        : "transparent"
    }`,
    borderLeft: borderLeft
      ? `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
          theme.components?.MuiTableCell?.styleOverrides?.root
            ?.enableCustomBorder
            ? theme.components?.MuiTableCell?.styleOverrides?.root
                ?.borderColor || "#ddd"
            : "transparent"
        }`
      : "none",
    textAlign: alignCenter ? "center" : "left",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    overflow: "hidden",
    maxWidth: width || 200,
    backgroundColor: "inherit",
    padding: "0px 10px", 
    position: "relative",
    zIndex: 1,
    "tbody tr:hover &": {
      backgroundColor: `${theme.palette.action.hover} !important`,
    },

    ...(isLastSticky && isAction
      ? {
          "&:last-child": {
            minWidth: 70,
            maxWidth: 200,
            overflow: "hidden",
            textOverflow: "ellipsis",
            textAlign: "center",
            backgroundColor: "inherit",
            position: "sticky",
            right: 0,
            zIndex: 2,
            borderLeft: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
              theme.components?.MuiTableCell?.styleOverrides?.root
                ?.enableCustomBorder
                ? theme.components?.MuiTableCell?.styleOverrides?.root
                    ?.borderColor || "#ddd"
                : "transparent"
            }`,
            "tbody tr:hover &": {
              backgroundColor: `${theme.palette.action.hover} !important`,
            },
          },
        }
      : {}),
  };
});

export const StyledTableCellActions = styled(SkyTableCell, {
  shouldForwardProp: (prop) =>
    !["alignCenter", "styleWidth", "index", "isAction"].includes(prop),
})(({ theme, alignCenter, styleWidth, isAction }) => ({
  borderBottom: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
    theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
      ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
        theme.palette.divider
      : "transparent"
  }`,
  borderRight: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
    theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
      ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
        theme.palette.divider
      : "transparent"
  }`,
  borderLeft: "none", 
  textAlign: alignCenter ? "center" : "left",
  whiteSpace: "nowrap",
  padding: "0px 10px", 
  width: styleWidth || null,
  "thead &": {
    backgroundColor:
      theme.components?.MuiTableHead?.styleOverrides?.root?.backgroundColor ||
      theme.palette.background.paper,
    borderTop: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
      theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
        ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
          theme.palette.divider
        : "transparent"
    }`,
    fontWeight: "bold",
    ...(isAction && {
      textAlign: "left",
    }),
    "&:last-child": {
      position: "sticky",
      right: 0,
      zIndex: 21, 
      backgroundColor:
        theme.components?.MuiTableHead?.styleOverrides?.root?.backgroundColor ||
        theme.palette.background.paper, 
    },
  },
  "tbody &": {
    backgroundColor: "inherit",
  },
  position: "relative",
  zIndex: 2,

  "&:last-child": {
    width: 110,
    minWidth: 110,
    maxWidth: 130,
    overflow: "visible",
    textOverflow: "ellipsis",
    textAlign: "center",
    position: "sticky",
    right: 0,
    zIndex: 20, 
    padding: "8px 12px",
    backgroundColor: "inherit",
    "&::after": {
      content: '""',
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      borderLeft: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
        theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
          ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
            "#ddd"
          : "transparent"
      }`,
    },
    [theme.breakpoints.down("md")]: {
      width: 50,
      minWidth: 50,
      maxWidth: 70,
    },
  },
  "tbody tr:hover &": {
    backgroundColor: `${theme.palette.action.hover} !important`,
    "&:last-child": {
      backgroundColor: `${theme.palette.action.hover} !important`,
    },
  },
}));

export const StyledTableCellActionsSpecial = styled(StyledTableCellActions)(
  () => ({
    width: 150,
    minWidth: 150,
    borderCollapse: "collapse",
    borderBottom: "1px solid #e0e0e0 !important",
    borderRight: "1px solid #e0e0e0 !important",
  })
);

export const StyledTableCell = styled(SkyTableCell, {
  shouldForwardProp: (prop) =>
    ![
      "styleWidth",
      "styleMinWidth",
      "styleMaxWidth",
      "wrapContent",
      "stylePosition",
      "styleZIndex",
      "styleCursor",
      "styleOpacity",
      "styleOverflow",
      "styleTextOverflow",
      "stylePadding",
      "styleleWordWrap",
      "styleOverflowWrap",
      "styleBorderCollapse",
      "styleWidthCell",
    ].includes(prop),
})(({
  theme,
  styleWidth,
  styleMinWidth,
  styleMaxWidth,
  wrapContent,
  stylePosition,
  styleZIndex,
  styleCursor,
  styleOpacity,
  styleOverflow,
  styleTextOverflow,
  stylePadding,
  styleleWordWrap,
  styleOverflowWrap,
  styleBorderCollapse,
  styleWidthCell,
}) => {
  // -----------------------
  // AUTO px → rem converter
  // -----------------------
  const toRem = (value) => {
    if (!value) return undefined;

    // Nếu là số (ví dụ 120) → assume px
    if (typeof value === "number") return `${value / 16}rem`;

    // Nếu là string chứa px
    if (typeof value === "string" && value.includes("px")) {
      const num = parseFloat(value);
      return `${num / 16}rem`;
    }

    // Nếu đã là rem → trả lại
    if (typeof value === "string" && value.includes("rem")) {
      return value;
    }

    // Nếu string mà không có đơn vị → assume px
    const num = parseFloat(value);
    return isNaN(num) ? value : `${num / 16}rem`;
  };

  return {
    width: toRem(styleWidth || styleWidthCell),
    minWidth: toRem(styleMinWidth),
    maxWidth: toRem(styleMaxWidth),

    whiteSpace: wrapContent ? "normal" : "nowrap",

    borderRight: `${
      theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"
    } solid ${
      theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
        ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
          theme.palette.divider
        : "transparent"
    }`,
    "&:first-of-type": {
      borderLeft: `${
        theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth ||
        "1px"
      } solid ${
        theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
          ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
            theme.palette.divider
          : "transparent"
      }`,
    },
    borderBottom: `${
      theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"
    } solid ${
      theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
        ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
          theme.palette.divider
        : "transparent"
    }`,

    "thead &": {
      borderTop: `${
        theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth ||
        "1px"
      } solid ${
        theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
          ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
            theme.palette.divider
          : "transparent"
      }`,
      backgroundColor:
        theme.components?.MuiTableHead?.styleOverrides?.root?.backgroundColor ||
        theme.palette.background.paper,
      fontWeight: "bold",
    },

    overflow: styleOverflow || "hidden",
    textOverflow: styleTextOverflow || "ellipsis",
    backgroundColor: "inherit",
    padding: stylePadding || `0px 10px`,
    height: theme.layout?.dynamicTable?.rowHeight || "55px",

    "tbody tr:hover &": {
      backgroundColor: `${theme.palette.action.hover} !important`,
    },

    position: stylePosition || null,
    zIndex: styleZIndex || null,
    cursor: styleCursor || null,
    opacity: styleOpacity || null,
    wordWrap: styleleWordWrap || null,
    overflowWrap: styleOverflowWrap || null,
    borderCollapse: styleBorderCollapse || null,
  };
});

export const StyledTableCellWrap = styled(StyledTableCell)(() => ({
  whiteSpace: "normal",
  wordWrap: "break-word",
  overflowWrap: "break-word",
  padding: "8px",
  borderCollapse: "collapse",
  
  overflow: "visible",
  textOverflow: "unset",
}));

export const StyledTableHeaderCell = styled(StyledTableCell, {
  shouldForwardProp: (prop) =>
    ![
      "draggedColumnIndex",
      "isDragging",
      "styleWidth",
      "styleMinWidth",
      "styleMaxWidth",
      "wrapContent",
      "stylePosition",
      "styleZIndex",
      "styleCursor",
      "styleOpacity",
      "styleOverflow",
      "styleTextOverflow",
      "stylePadding",
      "styleleWordWrap",
      "styleOverflowWrap",
      "styleBorderCollapse",
      "styleWidthCell",
    ].includes(prop),
})(
  ({
    theme,
    draggedColumnIndex,
    isDragging,
    styleWidth,
    styleMinWidth,
    styleMaxWidth,
  }) => ({
    cursor: isDragging ? "move" : "pointer",
    opacity: draggedColumnIndex ? 0.5 : 1,
    position: "relative",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    userSelect: "none",
    width: styleWidth || "auto",
    minWidth: styleMinWidth || "auto",
    maxWidth: styleMaxWidth || "auto",
    "&:hover": {
      backgroundColor: `${theme.palette.action.hover} !important`,
    },
  })
);

export const DataTableCell = styled(StyledTableCell)({});

export const PopoverButton = styled(SkyButton)({
  width: "100%",
  justifyContent: "flex-start",
});

export const PaginationContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  width: "100%",
  padding: "12px 16px",
  flexShrink: 0,
  marginTop: "16px",
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : "#FFFFFF",
  borderRadius: "8px",
  boxShadow: "rgba(0, 0, 0, 0.1) 0px 2px 8px",
  border: theme.palette.mode === 'dark' ? `1px solid ${theme.palette.divider}` : "1px solid rgb(226, 232, 240)",
  zIndex: 10,
  position: "sticky",
  bottom: "0px",
  boxSizing: "border-box",
}));

export const PaginationStack = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  gap: theme.spacing(1),
  alignItems: "center",
}));

export const RowsPerPageBox = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const DatePickerGrid = styled(SkyGrid)(({ theme }) => ({
  margin: theme.spacing(0, 2),
}));

export const DatePickerBox = styled(SkyBox)(({ theme }) => ({
  margin: theme.spacing(0, 3),
}));

export const MoreSearchBox = styled(SkyBox)(() => ({
  width: "100%",
  backgroundColor: "transparent",
  padding: "12px",
}));

export const RadioBox = styled(SkyBox)(({ theme }) => ({
  marginLeft: theme.spacing(2.5),
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2),
}));

export const ActionIconButton = styled(SkyIconButton)(({ theme, colorType }) => ({
  color:
    colorType === "error"
      ? theme.palette.error.main
      : theme.palette.actionIcon?.default || theme.palette.primary.main,
  padding: 5,
  minWidth: 0,

  "&& .MuiCircularProgress-root": { display: "none" },
}));

export const StyledRadio = styled(SkyRadio)(({ theme, value }) => ({
  color:
    value === "PDF" ? theme.palette.text.secondary : theme.palette.primary.main,
}));

export const StyledClearIcon = styled(ClearIcon)({
  fontSize: "1.25rem",
});

export const SearchAdornment = styled(SkyInputAdornment)({});

export const CheckboxHeaderCell = styled(StyledTableCell)({
  width: "50px",
  padding: "0px 16px",
});

export const STTHeaderCell = styled(StyledTableCell)({
  width: "20px",
});

export const CheckboxBodyCell = styled(SkyTableCell)(({ theme, index }) => ({
  // Fix cứng độ rộng
  width: "50px !important",
  minWidth: "50px !important",
  maxWidth: "50px !important",
  padding: "0px 16px !important",
  
  // Sticky column
  position: "sticky !important",
  left: 0,
  zIndex: 3,
  
  // Style body cell
  textAlign: "center",
  height: "41px !important",
  minHeight: "41px !important",
  
  // Alternating row colors
  backgroundColor:
    index % 2 !== 0
      ? theme.palette.table?.rowOdd ||
        (theme.palette.mode === "dark" ? "#2c3e50" : "#F9F9F9")
      : theme.palette.table?.rowEven || theme.palette.background.paper,
  
  // Border
  borderBottom: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
    theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
      ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
        theme.palette.divider
      : "transparent"
  }`,
  borderRight: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
    theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
      ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
        theme.palette.divider
      : "transparent"
  }`,
  borderLeft: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
    theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
      ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
        theme.palette.divider
      : "transparent"
  }`,
  
  // Ẩn ColumnResizer
  "& .ColumnResizer": {
    display: "none !important",
  },
  
  // Hover effect
  "tbody tr:hover &": {
    backgroundColor: `${theme.palette.action.hover} !important`,
  },
  
  cursor: "default !important",
  userSelect: "none",
}));

export const STTBodyCell = styled(SkyTableCell)(({ theme, index }) => ({
  // Fix cứng độ rộng
  width: "50px !important",
  minWidth: "50px !important",
  maxWidth: "50px !important",
  padding: "0px 16px !important",
  
  // Sticky column
  position: "sticky !important",
  left: 50,
  zIndex: 2,
  
  // Style body cell
  textAlign: "center",
  height: "41px !important",
  minHeight: "41px !important",
  
  // Alternating row colors
  backgroundColor:
    index % 2 !== 0
      ? theme.palette.table?.rowOdd ||
        (theme.palette.mode === "dark" ? "#2c3e50" : "#F9F9F9")
      : theme.palette.table?.rowEven || theme.palette.background.paper,
  
  // Border
  borderBottom: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
    theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
      ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
        theme.palette.divider
      : "transparent"
  }`,
  borderRight: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
    theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
      ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
        theme.palette.divider
      : "transparent"
  }`,
  borderLeft: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
    theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
      ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
        theme.palette.divider
      : "transparent"
  }`,
  
  // Ẩn ColumnResizer
  "& .ColumnResizer": {
    display: "none !important",
  },
  
  // Hover effect
  "tbody tr:hover &": {
    backgroundColor: `${theme.palette.action.hover} !important`,
  },
  
  cursor: "default !important",
  userSelect: "none",
}));

export const StyledButton = styled(SkyButton)(({ theme, iscolor }) => ({
  borderRadius: theme.shape.borderRadius,
  height:
    theme.components?.MuiOutlinedInput?.styleOverrides?.root?.height || 40,
  width: theme.components?.MuiOutlinedInput?.styleOverrides?.root?.height || 40,
  minWidth: "40px !important",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  marginLeft: 15,
  padding: 0,
  // Mặc định màu primary
  backgroundColor: theme.palette.primary.main,
  color: iscolor || theme.palette.primary.contrastText,
  "&:hover": { backgroundColor: theme.palette.primary.dark },
}));

export const AddButton = styled(StyledButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  "&:hover": { backgroundColor: theme.palette.primary.dark },
}));

export const StyledSearchButton = styled(SkyButton)(({ theme, iscolor }) => ({
  height:
    theme.components?.MuiOutlinedInput?.styleOverrides?.root?.height || 40,
  width: theme.components?.MuiOutlinedInput?.styleOverrides?.root?.height || 40,
  minWidth: "40px !important",
  backgroundColor: theme.palette.primary.main,
  color: iscolor || theme.palette.primary.contrastText,
  marginLeft: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export const StyledFilterButton = styled(SkyButton)(({ theme }) => ({
  height:
  theme.components?.MuiOutlinedInput?.styleOverrides?.root?.height || 40,
  minWidth: "40px !important",
  color: theme.palette.mode === 'dark' ? '#ffffff' : '#637381', 
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : "#ffffff",
  borderRadius: `${theme.shape.borderRadius}px`,
  border: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${theme.palette.divider}`,
  marginLeft: theme.spacing(1),
  boxShadow: "none",
  '& .MuiSvgIcon-root': { 
    color: theme.palette.mode === 'dark' ? '#ffffff' : '#637381',
  },
}));

export const ActionsBox = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
}));

export const StyledCheckbox = styled(SkyCheckbox)({});

export const StyledPagination = styled(SkyPagination)(({ theme }) => ({
  "& .MuiPaginationItem-root": {
    border: "none",
    borderRadius: 0,
    padding: "4px 8px",
    minWidth: "24px",
    height: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  "& .Mui-selected": {
    backgroundColor: "transparent",
    color: theme.palette.primary.main,
    fontWeight: "bold",
  },
}));

export const RowsPerPageSelect = styled(SkySelect)({
  height: "24px",
});

export const StyleFormControl = styled(SkyFormControl)({
  minWidth: 200,
});

export const DeleteStyledButton = styled(StyledButton)(({ theme }) => ({
  backgroundColor: theme.palette.error.main,
  color: theme.palette.error.contrastText,
  "&:hover": {
    backgroundColor: theme.palette.error.dark,
  },
  "&.Mui-disabled": {
    backgroundColor: theme.palette.error.light, 
    color: theme.palette.error.contrastText,
    opacity: 0.3, 
  },
}));

export const ColumnResizer = styled("div")(({ theme }) => ({
  position: "absolute",
  right: 0,
  top: 0,
  bottom: 0,
  width: 8,
  cursor: "col-resize",
  zIndex: 5,
  "&::after": {
    content: '""',
    position: "absolute",
    top: "25%",
    right: "3px",
    height: "50%",
    width:
      theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth ||
      "1px",
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    boxShadow: "2px 0 rgba(0, 0, 0, 0.15)",
  },
  "&:hover::after": {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    boxShadow: "2px 0 rgba(0, 0, 0, 0.3)",
  },
}));

export const LoadingDialogTitle = styled(SkyDialogTitle)({
  margin: 0,
  padding: "16px",
});

export const LoadingTypography = styled(SkyTypography)({
  fontSize: "16px",
  fontWeight: 500,
  textAlign: "center",
});

export const PopoverContainer = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(0.5),
  display: "flex",
  flexDirection: "column",
  "& .MuiButton-root": {
    justifyContent: "flex-start",
    textAlign: "left",
    textTransform: "none",
    padding: theme.spacing(1, 2),
    minWidth: "180px",
    color: theme.palette.text.primary,
    fontWeight: 500,
    borderRadius: theme.spacing(0.5),
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
    "& .MuiButton-startIcon": {
      marginRight: theme.spacing(1.5),
      "& .MuiSvgIcon-root": {
        fontSize: "20px",
      },
    },
  },
}));

export const HeaderCellContainer = styled(SkyBox)(() => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  position: "relative",
  width: "100%",
}));

export const SortIconContainer = styled(SkyBox)(() => ({
  position: "relative",
  width: 16,
  height: 20,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  marginLeft: 4,
}));

export const StyledArrowUp = styled(ArrowDropUp, {
  shouldForwardProp: (prop) => prop !== "isActive",
})(({ theme, isActive }) => ({
  position: "absolute",
  top: -5,
  color: isActive ? theme.palette.text.primary : theme.palette.text.secondary,
  opacity: isActive ? 1 : 0.3,
  zIndex: isActive ? 2 : 1, 
}));

export const SynchronizeButton = styled(AddButton)({});

export const DeleteSelectedButton = styled(StyledButton)(({ theme }) => ({
  color: theme.palette.error.contrastText, 
  backgroundColor: theme.palette.error.main,
  "&:hover": {
    backgroundColor: theme.palette.error.dark,
  },
  "&:disabled": {
    backgroundColor: theme.palette.error.light, 
    color: theme.palette.error.contrastText, 
    opacity: 0.5, 
  },
}));

export const StyledArrowDown = styled(ArrowDropDown, {
  shouldForwardProp: (prop) => prop !== "isActive",
})(({ theme, isActive }) => ({
  position: "absolute",
  bottom: -4,
  color: isActive ? theme.palette.text.primary : theme.palette.text.secondary,
  opacity: isActive ? 1 : 0.3,
  zIndex: isActive ? 2 : 1, 
}));

export const StyledGrid = styled(SkyGrid)(() => ({
  flexBasis: "23%",
  display: "flex",
}));

export const AdvancedFilterDialog = styled(SkyDialog)(() => ({
  "& .MuiPaper-root": {
    borderRadius: 8,
    maxWidth: "1000px",
    width: "calc(100% - 80px)",
    minHeight: "460px",
    maxHeight: "75vh",
    overflowY: "auto",
  },
}));

export const AdvancedFilterDialogTitle = styled(SkyDialogTitle)(({ theme }) => ({
  textAlign: "center",
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(1),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

export const AdvancedFilterDialogContent = styled(SkyDialogContent)(
  ({ theme }) => ({
    padding: theme.spacing(2, 3),
    minHeight: 140,
    width: "100%",
  })
);

export const AdvancedFilterDialogActions = styled(SkyDialogActions)(
  ({ theme }) => ({
    padding: theme.spacing(2, 3),
    justifyContent: "flex-end",
  })
);

export const AdvancedFilterList = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  gap: theme.spacing(1.5),
}));

export const AdvancedFilterItem = styled(SkyBox)(() => ({
  flex: "0 0 220px",
  display: "flex",
  alignItems: "center",
}));

export const AdvancedFilterApplyButton = styled(SkyButton)(() => ({
  minWidth: 100,
  height: 40,
}));

export const AdvancedFilterCloseButton = styled(SkyButton)(({ theme }) => ({
  minWidth: 100,
  height: 40,
  color: theme.palette.mode === "dark" ? theme.palette.common.white : undefined,
  borderColor:
    theme.palette.mode === "dark" ? "rgba(255,255,255,0.12)" : undefined,
  "&.MuiButton-outlined": {
    borderColor:
      theme.palette.mode === "dark" ? "rgba(255,255,255,0.12)" : undefined,
  },
  "&:hover": {
    borderColor:
      theme.palette.mode === "dark" ? "rgba(255,255,255,0.2)" : undefined,
  },
}));

export const AdvancedFilterWrapper = styled(SkyBox)({
  width: "40%",
  minWidth: 200,
});

export const StyleBoxInTableTree = styled(SkyBox)({
  display: "inline-block",
  width: "100%",
});
export const StyleStack = styled(SkyStack)(() => ({
  alignItems: "center",
}));

export const StyleBoxActionsRespon = styled(SkyBox)({
  display: "flex",
  width: "100%",
});

export const StyleBoxActionsBoder = styled(SkyBox)({
  display: "flex",
  gap: 1,
  flexWrap: "wrap",
  justifyContent: "center",
});

export const UnreadNotificationRow = styled(StyledTableRow)(({ theme }) => ({
  "&.MuiTableRow-root": {
    backgroundColor:
      theme.palette.mode === "dark"
        ? "#303642 !important"       
        : "#EBF3FF !important",      
  },
  "&:hover": {
    backgroundColor: theme.palette.mode === "dark" 
      ? "rgba(99, 130, 246, 0.32) !important" 
      : "rgba(59, 130, 246, 0.16) !important",
  },
  "& td": {
    backgroundColor: "inherit",
  },
  fontWeight: 600,
}));

export const ActionButtonGroup = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(0.75),
  alignItems: "center",
  justifyContent: "center",
  flexWrap: "wrap",
  width: "100%",
}));

export const ActionButtonText = styled(SkyButton)(({ theme, colorType }) => ({
  justifyContent: "flex-start",
  textAlign: "left",
  width: "100%",
  padding: "8px 16px",
  color:
    colorType === "error"
      ? theme.palette.error.main
      : theme.palette.text.primary,
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
  "& .MuiButton-startIcon": {
    marginRight: theme.spacing(1.5),
  },
}));

export const InfoBox = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const TotalTypography = styled(SkyTypography)({});

export const RecordRangeTypography = styled(SkyTypography)({});

export const ActionStack = styled(SkyStack)({
  flexDirection: "row",
  alignItems: "center",
  gap: "11px",
  marginLeft: "16px",
});

export const PrimaryActionButton = styled(SkyButton)(({ theme }) => ({
  borderRadius: "8px",
  textTransform: "none",
  fontWeight: 600,
  height: "40px",
  paddingTop: "9px",
  paddingBottom: "9px",
  paddingLeft: "24px",
  paddingRight: "24px",
  whiteSpace: "nowrap",
  minWidth: "max-content",
  border: `1px solid ${theme.palette.primary.main}`,
  color: theme.palette.primary.main,
  backgroundColor: "transparent",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const SecondaryActionButton = styled(SkyButton)(({ theme }) => ({
  borderRadius: "8px",
  textTransform: "none",
  fontWeight: 600,
  height: "40px",
  paddingTop: "9px",
  paddingBottom: "9px",
  paddingLeft: "24px",
  paddingRight: "24px",
  whiteSpace: "nowrap",
  minWidth: "max-content",
  border: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.primary,
  backgroundColor: "transparent",
  "&:hover": {
    borderColor: theme.palette.text.primary,
    backgroundColor: theme.palette.action.hover,
  },
}));
