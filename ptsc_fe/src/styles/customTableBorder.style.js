import { styled } from "@mui/material/styles";
import {
  TableRow,
  TableCell,
  Button,
  Checkbox,
  Box,
  TablePagination,
  TableHead,
  TextField,
  TableContainer,
  Table,
  Grid,
  IconButton,
  Typography,
  FormControl,
  Popover,
  FormControlLabel,
  MenuItem,
  Skeleton,
} from "@mui/material";
import { ArrowDropUp, ArrowDropDown } from "@mui/icons-material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { ScrollTableContainer } from "./Common.styles";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";


// ✅ TẠO BASE CELL ĐỘC LẬP: Không kế thừa từ file khác
const BaseStyledTableCell = styled(TableCell, {
  shouldForwardProp: (prop) =>
    !["styleWidth", "styleMinWidth", "styleMaxWidth"].includes(prop),
})(({ theme, styleWidth, styleMinWidth, styleMaxWidth }) => ({
  minHeight: theme.components?.MuiTableCell?.styleOverrides?.root?.height || 41,
  height: theme.components?.MuiTableCell?.styleOverrides?.root?.height || 41,
  borderRight: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
    ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
    theme.palette.divider
    : "transparent"
    }`,
  borderBottom: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
    ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
    theme.palette.divider
    : "transparent"
    }`,
  // ✅ Border left chỉ cho ô đầu tiên
  "&:first-of-type": {
    borderLeft: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
      ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
      theme.palette.divider
      : "transparent"
      }`,
  },
  width: styleWidth,
  minWidth: styleMinWidth,
  maxWidth: styleMaxWidth,
  textAlign: "left",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  backgroundColor: "inherit",
  boxSizing: "border-box",
  padding: "0px 8px",
}));

export const StyledPaper = styled("div")(({ theme }) => ({
  width: "100%",
  overflow: "hidden",
  padding: 12,
  background: theme.palette.mode === "light" ? theme.palette.background.paper : theme.palette.background.default,
  borderRadius: 10,
}));

export const StyledToolbar = styled(Box)(() => ({
  minHeight: "0 !important",
  display: "flex",
  position: "relative",
  width: "100%",
  padding: 0,
  margin: 0,
}));

export const FilterBox = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: "108%",
  display: "flex",
  flexDirection: "column",
  background: theme.palette.background.paper,
  boxShadow: theme.shadows[2],
  borderRadius: 5,
  padding: 8,
  zIndex: 10,
  width: "auto",
  maxWidth: "90vw",
  whiteSpace: "nowrap",
  "& .MuiFormControl-root": {
    width: "100%",
    marginBottom: 6,
    "& .MuiOutlinedInput-root": {
      backgroundColor: `${theme.components?.MuiOutlinedInput?.styleOverrides?.root?.backgroundColor || (theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF")} !important`,
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: `${theme.palette.divider} !important`,
      },
      "& .MuiInputBase-input": {
        color: `${theme.palette.text.primary} !important`,
      },
    },
  },
}));

export const StyledSearchField = styled(TextField)(({ theme }) => ({
  width: 280,
  "& .MuiOutlinedInput-root": {
    borderRadius: "4px 0px 0px 4px",
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: `${theme.palette.divider} !important`,
    },
    "& .MuiInputBase-input": {
      color: `${theme.palette.text.primary} !important`,
      padding: "8px 12px !important",
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
    borderRadius: "4px 0px 0px 4px",
  },
}));

export const StyledPaginationContainer = styled(Box)(() => ({
  display: "flex",
  justifyContent: "flex-start",
  width: "100%",
}));

export const StyledTablePagination = styled(TablePagination)(() => ({
  "& .MuiTablePagination-toolbar": {
    justifyContent: "flex-start",
  },
}));

export const StyledTableHead = styled(TableHead)(({ theme }) => {
  return {
    position: "sticky",
    top: 0,
    zIndex: 1000,
    backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",
    "& .MuiTableCell-root": {
      backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#F9FAFB",
      textTransform: "uppercase",
      borderTop: "none !important",
      // borderBottom: "none !important",
      boxShadow: "none !important",
      color: theme.palette.mode === "dark" ? "#FFFFFF" : "#323943",
    },
  };
});

export const StyledTableContainer = styled(
  ScrollTableContainer.withComponent(TableContainer), {
  shouldForwardProp: (prop) =>
    prop !== "customMaxHeight" &&
    prop !== "styledDynamicMaxHeight" &&
    prop !== "uiVariant",
}
)(({ styledDynamicMaxHeight, customMaxHeight, uiVariant, theme }) => ({
  overflow: "auto",

  //fix height
  height: customMaxHeight ? "auto" : (styledDynamicMaxHeight ? "calc(100vh - 200px)" : "calc(100vh - 282px)"),
  maxHeight: customMaxHeight ? `${customMaxHeight}px` : "none",
  width: "100%", // Đảm bảo container chiếm toàn bộ chiều rộng
  display: "flex", // Sử dụng flex để co giãn
  flexDirection: "column", // Hướng dọc
  flex: "1 1 auto", // Cho phép co giãn và thu nhỏ
  overflowY: "auto", // Chỉ cuộn theo chiều dọc
  position: "relative",
  ...(uiVariant === "leadershipDutySchedule" && {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    "& .MuiTableCell-root": {
      border: `1px solid ${theme.palette.divider} !important`,
    },
    "& .MuiTableCell-root:last-of-type": {
      borderRight: `1px solid ${theme.palette.divider} !important`,
    },
    "& thead .MuiTableCell-root": {
      backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#F9FBFB",
      fontWeight: 700,
      textTransform: "uppercase",
    },
  }),
}));

export const StyledTable = styled(Table, {
  shouldForwardProp: (prop) => prop !== "uiVariant",
})(({ uiVariant, theme }) => ({
  tableLayout: "auto",
  width: "100%", // Thay max-content bằng 100% để scrollbar ngang luôn xuất hiện
  borderCollapse:
    uiVariant === "leadershipDutySchedule"
      ? "collapse !important"
      : "separate !important",
  borderSpacing: 0,
  borderTop:
    uiVariant === "leadershipDutySchedule"
      ? `1px solid ${theme.palette.divider}`
      : `1px solid ...`,
}));

export const StyledTableCellActionsSpecial = styled(BaseStyledTableCell)(
  ({ theme }) => ({
    position: "sticky",
    right: 0,
    width: 100,
    minWidth: 100,
    textAlign: "center",
    [theme.breakpoints.down('md')]: {
      width: 50, // Giảm chiều rộng trên màn hình nhỏ
      minWidth: 50, // Giảm chiều rộng tối thiểu trên màn hình nhỏ
    },
    zIndex: 2,
    borderLeft: "none",
    backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",

    // Style cho header của cột Hành động
    "thead &": {
      backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",
      fontWeight: "bold",
      zIndex: 3, // zIndex cao hơn để nằm trên các ô khác
      borderBottom: `1px solid ${theme.palette.mode === "dark" ? theme.palette.divider : "#dee2e6"}`,
    },
    // Sử dụng ::after để vẽ lại đường viền trái, tránh lỗi đường viền ngang
    "&::after": {
      content: '""',
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width:
        theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth ||
        "1px",
      backgroundColor: theme.components?.MuiTableCell?.styleOverrides?.root
        ?.enableCustomBorder
        ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
        theme.palette.divider
        : "transparent",
    },
    // ✅ Thêm border phải để hiển thị đường viền ngoài cùng
    borderRight: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
      ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
      theme.palette.divider
      : "transparent"
      }`,
  })
);

// export const StyledTableCellActions = styled(BaseStyledTableCell)(
//   ({ isBold, styleWidthCell, theme }) => ({
//     width: styleWidthCell || "auto",
//     minWidth: styleWidthCell || "auto",
//     maxWidth: styleWidthCell || "auto",
//     position: "sticky",
//     [theme.breakpoints.down(900)]: { // Sử dụng 900px cho chính xác
//       width: 50, // Giảm chiều rộng trên màn hình nhỏ
//       minWidth: 50, // Giảm chiều rộng tối thiểu trên màn hình nhỏ
//       fontSize: 0, // Ẩn văn bản "Hành động"
//       padding: 0, // Bỏ padding để cột hẹp hơn
//     },
//     right: 0,
//     zIndex: 1002,
//     // ✅ Thêm lại border-top cho header của cột Action
//     borderTop: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
//       theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
//         ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
//           theme.palette.divider
//         : "transparent"
//     }`,
//     borderLeft: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
//       theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
//         ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
//           theme.palette.divider
//         : "transparent"
//     }`,
//     // ✅ Thêm border phải để hiển thị đường viền ngoài cùng
//     borderRight: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
//       theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
//         ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
//           theme.palette.divider
//         : "transparent"
//     }`,
//     textAlign: "center",
//     fontWeight: isBold ? "bold" : "normal",
//   })
// );
export const StyledTableCellActions = styled(BaseStyledTableCell, {
  shouldForwardProp: (prop) =>
    !["alignCenter", "styleWidth", "index", "isAction"].includes(prop),
})(({ theme, alignCenter, styleWidth, isAction }) => {
  const borderWidth =
    theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px";

  const borderColor =
    theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
      ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
      theme.palette.divider
      : "transparent";

  return {
    textAlign: alignCenter ? "center" : "left",
    whiteSpace: "nowrap",
    padding: "0px 10px",
    width: styleWidth || null,
    // borderBottom: `${borderWidth} solid ${borderColor}`,
    // borderRight: `${borderWidth} solid ${borderColor}`,
    // borderLeft: "none",
    position: "relative",
    zIndex: 2,

    "thead &": {
      backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",
      fontWeight: "bold",
      borderTop: "none !important",
      borderBottom: `1px solid ${theme.palette.mode === "dark" ? theme.palette.divider : "#dee2e6"}`,
      color: theme.palette.mode === "dark" ? "#FFFFFF" : "#323943",

      ...(isAction && {
        textAlign: "center",
      }),

      "&:last-child": {
        position: "sticky",
        right: 0,
        zIndex: 99999,
        backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#F9FAFB",
        width: "120px !important",
        minWidth: "120px !important",
        maxWidth: "120px !important",
        [theme.breakpoints.down("md")]: {
          width: "60px !important",
          minWidth: "60px !important",
          maxWidth: "60px !important",
        },
      },
    },

    "tbody &": {
      backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#FFFFFF",
    },

    "&:last-child": {
      width: "100px !important",
      minWidth: "100px !important",
      maxWidth: "100px !important",
      position: "sticky",
      right: 0,
      zIndex: 20,
      boxSizing: "border-box",

      // // ⭐ Thêm border bottom bị thiếu
      // borderBottom: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
      //   theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
      //     ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor || theme.palette.divider
      //     : "transparent"
      // }`,

      backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",
      "tr.Mui-selected &": {
        backgroundColor: theme.palette.mode === "dark" ? "#2c3e50" : "#F5F5F5",
      },

      // "&::after": {
      //   content: '""',
      //   position: "absolute",
      //   top: 0,
      //   bottom: 0,
      //   left: "-1px",
      //   borderLeft: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
      //     theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
      //       ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor || "#ddd"
      //       : "transparent"
      //   }`,
      // },
      borderLeft: `${borderWidth} solid ${borderColor}`,
    },

    "tbody tr:hover &": {
      backgroundColor: `${theme.palette.action.hover} !important`,
      "&:last-child": {
        backgroundColor: `${theme.palette.action.hover} !important`,
      },
    },
  };
});

export const StyledTableRow = styled(TableRow)(({ theme, rowcolor }) => ({
  cursor: "pointer",
  // ✅ Sửa lỗi: Lấy chiều cao từ cấu hình theme, fallback về 41px nếu không có
  height: theme.layout?.dynamicTable?.rowHeight || "55px",
  backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#FFFFFF",
  "&.Mui-selected": {
    backgroundColor: (theme.palette.mode === "dark" ? "#2c3e50" : "#F5F5F5") + " !important",
  },
  // borderBottom: "none", // Tắt viền mặc định
  // Áp dụng cho cả header row
  "thead &": {
    borderTop: "none !important",
    borderBottom: `1px solid ${theme.palette.mode === "dark" ? theme.palette.divider : "#dee2e6"}`,
    backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",
  },
  "&:hover": {
    backgroundColor: `${theme.palette.action.hover} !important`,
  },
  color: rowcolor || theme.palette.text.primary,
}));

export const StyledTableCell = styled(BaseStyledTableCell, {
  shouldForwardProp: (prop) => !["isFixed", "fixedPosition"].includes(prop),
})(({ isFixed, fixedPosition, theme }) => ({
  ...(isFixed && {
    position: "sticky",
    [fixedPosition === "right" ? "right" : "left"]:
      fixedPosition === "right" ? 0 : fixedPosition || 0,
    zIndex: 1,
    boxShadow:
      fixedPosition === "right"
        ? "-2px 0 4px rgba(0,0,0,0.1)"
        : "2px 0 4px rgba(0,0,0,0.1)",
    backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#FFFFFF",
  }),
  // ✅ Thêm border-bottom và background cho header của cột checkbox/STT
  "thead &": {
    borderTop: "none !important",
    borderBottom: `1px solid ${theme.palette.mode === "dark" ? theme.palette.divider : "#dee2e6"}`,
    backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",
  },
}));

export const StyledCheckbox = styled(Checkbox)(() => ({
  color: (theme) => theme.palette.primary.main,
}));

export const HeaderCellContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== "align",
})(({ align, theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent:
    align === "left"
      ? "flex-start"
      : align === "right"
        ? "flex-end"
        : "center",
  position: "relative",
  color: theme?.palette?.mode === "dark" ? "#FFFFFF" : "#323943",
}));

export const SortIconContainer = styled(Box)(() => ({
  position: "relative",
  width: 16,
  height: 20,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  marginLeft: 4,
}));

export const StyledArrowUp = styled(ArrowDropUp)(({ theme, isActive }) => ({
  position: "absolute",
  top: -3,
  fontSize: "20px",
  color: isActive ? theme.palette.text.primary : theme.palette.text.secondary,
  opacity: isActive ? 1 : 0.3,
  "&:hover": {
    opacity: 1,
  },
}));

export const StyledArrowDown = styled(ArrowDropDown)(({ theme, isActive }) => ({
  position: "absolute",
  bottom: -4,
  fontSize: "20px",
  color: isActive ? theme.palette.text.primary : theme.palette.text.secondary,
  opacity: isActive ? 1 : 0.3,
  "&:hover": {
    opacity: 1,
  },
}));

export const StyledGrid = styled(Grid)(() => ({
  flexBasis: "23%",
  display: "flex",
}));

export const StyledButton = styled(Button)(
  ({ theme, styleColor, styleMargin, styleMinWidth }) => ({
    borderRadius: 4,
    height:
      theme.components?.MuiOutlinedInput?.styleOverrides?.root?.height || 40,
    width:
      theme.components?.MuiOutlinedInput?.styleOverrides?.root?.height || 40,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 0,
    color: styleColor || null,
    margin: styleMargin || null,
    minWidth: styleMinWidth || "40px !important",
  })
);

export const StyledSearchButton = styled(Button)(({ theme }) => ({
  height:
    theme.components?.MuiOutlinedInput?.styleOverrides?.root?.height || 40,
  width: theme.components?.MuiOutlinedInput?.styleOverrides?.root?.height || 40,
  minWidth: "40px !important",
  color: "#fff",
  borderRadius: "0px 8px 8px 0px !important",
}));

export const StyledFilterButton = styled(Button)(({ theme }) => ({
  height:
    theme.components?.MuiOutlinedInput?.styleOverrides?.root?.height || 40,
  minWidth: "40px !important",
  color: `${theme.palette.text.secondary} !important`,
  backgroundColor: `${theme.palette.background.paper} !important`,
  borderRadius: "0px !important",
  borderLeft: "none !important",
  borderRight: `1px solid ${theme.palette.divider} !important`,
  borderTop: `1px solid ${theme.palette.divider} !important`,
  borderBottom: `1px solid ${theme.palette.divider} !important`,
}));

export const StyledBoxContainer = styled(Box)(() => ({
  border: "1px solid #ddd !important",
  borderRadius: 1,
  marginBottom: 1,
  padding: 1,
}));

export const StyledBox = styled(Box)(
  ({
    styleAlignItems,
    styleJustifyContent,
    styleFlexWrap,
    styleDisplay,
    styleFlexDirection,
    styleGap,
    styleBorderRadius,
    // stylePadding,
    stylePosition,
    styleRight,
    styleTop,
    styleWidth,
    styleHeight,
    styleCursor,
    styleUserSelect,
  }) => ({
    display: styleDisplay || "flex",
    flexWrap: styleFlexWrap,
    flexDirection: styleFlexDirection,
    alignItems: styleAlignItems || null,
    justifyContent: styleJustifyContent || null,
    gap: styleGap || null,
    borderRadius: styleBorderRadius || null,
    // padding: stylePadding || null,
    position: stylePosition || null,
    right: styleRight || null,
    top: styleTop || null,
    width: styleWidth || null,
    height: styleHeight || null,
    cursor: styleCursor || null,
    userSelect: styleUserSelect || null,
  })
);

export const StyledIconButton = styled(IconButton)(({
  styleColor,
  theme, // Thêm theme vào props để truy cập palette
  styleBackgroundColor,
}) => {
  let finalColor = null;
  if (styleColor) {
    // Nếu styleColor là một key trong palette (vd: "primary", "error")
    if (theme.palette[styleColor] && theme.palette[styleColor].main) {
      finalColor = theme.palette[styleColor].main;
    } else if (styleColor === "inherit") {
      finalColor = "inherit";
    } else {
      // Nếu không, coi nó là một giá trị màu CSS trực tiếp (vd: "#FF5733")
      finalColor = styleColor;
    }
  }
  return {
    color: finalColor,
    backgroundColor: styleBackgroundColor || null,
  };
});

export const StyledTypography = styled(Typography)(({ stylePadding }) => ({
  padding: stylePadding || null,
}));
export const StyledFormControl = styled(FormControl)(({ styleMarginTop }) => ({
  marginTop: styleMarginTop || null,
}));

export const StyledBoxTable = styled(Box)(() => ({
  display: "flex",
  flexWrap: "wrap",
  gap: 1,
}));

export const StyledButtonTable = styled(Button, {
  shouldForwardProp: (prop) => prop !== "styleColor",
})(({ theme, styleColor }) => {
  const finalStyles = {
    minWidth: 30,
    height: 30,
    padding: 0,
  };

  // Apply color styles only if styleColor is provided
  if (styleColor && theme.palette[styleColor]) {
    finalStyles.backgroundColor = theme.palette[styleColor].main;
    finalStyles.color = theme.palette[styleColor].contrastText;
    finalStyles["&:hover"] = {
      backgroundColor: theme.palette[styleColor].dark,
    };
  }
  return finalStyles;
});

export const StyledFormControlTable = styled(FormControl)(() => ({
  mt: 2,
}));

export const StyledBoxTableBoder = styled(Box)(() => ({
  borderRadius: 1,
  backgroundColor: "background.paper",
  display: "flex",
  flexDirection: "column",
  height: "100%",
  position: "relative"
}));

export const StyledBoxss = styled(Box)(() => ({
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(255, 255, 255, 0.5)",
  zIndex: 10,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
}));

export const StyledBoxBoder = styled(Box)(() => ({
  display: "flex",
  gap: 1,
}));

export const StyledBoxBoderPadding = styled(Box)(() => ({
  padding: 1,
}));

export const StyledTypographyBoder = styled(Typography)(() => ({
  padding: "4px 12px",
}));

export const StyledButtonTableBoder = styled(Button)(() => ({
  margin: "8px",
}));

export const StyledBoxBoderBox = styled(Box)(() => ({
  minWidth: 300,
}));

export const StyledCheckboxTable = styled(Checkbox)(() => ({
  color: "primary",
}));

export const StyledBoxBoderBuilder = styled(Box)(() => ({
  position: "absolute",
  right: 0,
  top: 0,
  height: "100%",
  width: "5px",
  cursor: "col-resize",
  userSelect: "none",
}));

export const StyleBoxActionsBoder = styled(Box)({
  display: "flex",
  gap: 1,
  flexWrap: "wrap",
  justifyContent: "center",
});

export const StyledTableHeaderCell = styled(BaseStyledTableCell, {
  // ✅ Sửa lại logic: Lọc ra các prop tùy chỉnh, giữ lại các prop HTML hợp lệ
  shouldForwardProp: (prop) =>
    ![
      "isDragging",
      "draggedColumnIndex",
      "styleWidth",
      "styleMinWidth",
      "styleMaxWidth",
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
    // Nếu đang ở chế độ builder, con trỏ sẽ là 'move', ngược lại là 'pointer' để sort
    cursor: isDragging ? "move" : "pointer",
    opacity: draggedColumnIndex !== null ? 0.5 : 1, // ✅ Sửa: Kiểm tra null để tránh lỗi
    position: "relative",
    userSelect: "none",
    borderTop: "none !important",
    // ✅ Thêm lại border-bottom cho các header cell khác để đồng bộ
    borderBottom: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
      ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
      theme.palette.divider
      : "#dee2e6"
      }`,
    // ✅ Sửa lỗi: Áp dụng lại width từ props styleWidth
    width: styleWidth, // Giữ nguyên để styled-component nhận prop
    minWidth: styleMinWidth,
    maxWidth: styleMaxWidth,
    "&:hover": {
      backgroundColor: `${theme.palette.action.hover} !important`,
    },
  })
);

export const StyledTableCellWrap = styled(BaseStyledTableCell, {
  shouldForwardProp: (prop) => !["isBold", "isTitle"].includes(prop),
})(({ isBold, isTitle }) => ({
  whiteSpace: "normal",
  wordWrap: "break-word",
  overflowWrap: "break-word",
  padding: "6px 8px",
  fontWeight: isTitle ? 600 : isBold ? "bold" : "inherit",
  color: isTitle ? "#2364B0" : "inherit",
}));

// ✅ Style cho icon "ba chấm" trên mobile để tuân thủ Eslint
export const MobileActionsIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

// ✅ Style cho các nút hành động trong Popover trên mobile
export const PopoverActionButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== "styleColor",
})(({ theme, styleColor }) => ({
  justifyContent: "flex-start",
  width: "100%",
  padding: "11px 16px",
  backgroundColor: "transparent !important",
  boxShadow: "none !important",
  color: theme.palette.mode === "dark"
    ? "#FFFFFF"
    : (styleColor === "inherit"
      ? "#1976d2"
      : theme.palette[styleColor]
        ? theme.palette[styleColor].main
        : styleColor),
  '& .MuiSvgIcon-root': {
    color: theme.palette.mode === "dark" ? "#FFFFFF" : "#1976d2",
  },
  '& .MuiButton-startIcon': {
    color: theme.palette.mode === "dark" ? "#FFFFFF" : "#1976d2",
  },
  '&:hover': {
    backgroundColor: "transparent !important",
  },
  '&:active': {
    backgroundColor: "transparent !important",
  },
}));

export const FileDisplayContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
}));

export const ViewFileIconButton = styled(IconButton)(({ theme }) => ({
  padding: theme.spacing(0.25), // ~2px
  color: theme.palette.text.secondary,
  "&:hover": {
    color: theme.palette.primary.main,
  },
  // ✅ Thêm dòng này để icon bên trong tự động kế thừa kích thước
  // Tương đương với size="small" của IconButton
  fontSize: theme.typography.pxToRem(20),
}));

export const FileNameTypography = styled(Typography)({
  cursor: "default",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const FileIconContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(0.5),
  flexWrap: "wrap",
}));

export const StyledVisibilityIcon = styled(VisibilityOutlinedIcon)(
  ({ theme }) => ({
    fontSize: theme.typography.pxToRem(20), // Tương đương với fontSize="small"
    color: theme.palette.text.primary,
  })
);
export const StyledFilePopover = styled(Popover)(() => ({
  pointerEvents: "none", // ✅ Cho phép chuột đi qua overlay
  "& .MuiPaper-root": {
    pointerEvents: "auto", // ✅ Đảm bảo Paper bên trong Popover bắt được sự kiện chuột
  },
}));

export const StyleBoxCH = styled(Box)(({ theme }) => ({
  padding: theme.spacing(0, 2, 2, 2),
  width: 600,
  minWidth: 0,
  maxWidth: "calc(100vw - 32px)",
  boxSizing: "border-box",
  background: theme.palette.background.paper,
  borderRadius: 16,
  boxShadow: theme.shadows[3],
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}));

export const StyleBoxDropDown = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing(2.5, 2),
  margin: theme.spacing(0, -2, 2, -2),
  backgroundColor: theme.palette.mode === 'dark' ? "#769fbf" : "#e8eff7",
  position: 'relative',
}));

export const StyleTyprographyDropDown = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  fontSize: "20px !important",
  textAlign: 'center',
  color: theme.palette.mode === 'dark' ? "#FFFFFF" : "#2364B0",
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}));

export const StyleIconDropDown = styled(SettingsOutlinedIcon)(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? "#FFFFFF" : "#1e293b",
  fontSize: 20,
  width: 20,
  height: 20,
  position: 'absolute',
  right: 20,
}));

export const StyleBoxDrop = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(1),
}));

export const StyleFomControl = styled(FormControlLabel)(({ theme }) => ({
  fontWeight: 400,
  width: "100%",
  minWidth: 0,
  marginLeft: 0,
  marginRight: 0,
  '.MuiFormControlLabel-label': {
    fontSize: 15,
    color: theme.palette.text.primary,
    minWidth: 0,
    whiteSpace: "normal",
  },
}));

export const StyleBoxDrown = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(2),
  [theme.breakpoints.down("sm")]: {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
}));

export const StyleBoxButton = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: theme.spacing(1.5),
  marginTop: theme.spacing(1),
}));

export const StyleButtonH = styled(Button)(({ theme }) => ({
  minWidth: 64,
  color: theme.palette.text.primary,
  background: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 500,
  boxShadow: 'none',
  '&:hover': {
    background: theme.palette.action.hover,
    boxShadow: 'none',
  },
}));

export const StyleButtonAD = styled(Button)(({ theme }) => ({
  minWidth: 80,
  color: theme.palette.common.white,
  background: theme.palette.primary.main,
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 500,
  boxShadow: 'none',
  '&:hover': {
    background: theme.palette.primary.dark,
    boxShadow: 'none',
  },
}));

export const BoxStyed = styled(Box)(() => ({
  width: '24px',
  height: '24px',
  minWidth: '24px',
  minHeight: '24px',
  marginRight: '0px',
}));

export const ToggleButton = styled(IconButton)(({ theme }) => ({
  padding: 0,
  minWidth: '24px',
  minHeight: '24px',
  width: '24px',
  height: '24px',
  marginRight: '0px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.text.primary,
  '& svg': {
    fontSize: '18px',
    color: theme.palette.text.primary,
  },
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  }
}));

export const TreeTableCell = styled(Box)(({ theme, $level }) => ({
  display: 'flex',
  alignItems: 'center',
  position: 'relative',
  paddingLeft: theme.spacing($level * 3),
  minHeight: '40px',
}));

export const TreeCheckboxContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== '$level',
})(({ theme, $level = 0 }) => ({
  display: 'flex',
  alignItems: 'center',
  paddingLeft: theme.spacing($level * 3), // 8px * 3 = 24px per level
}));

export const NodeName = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  flex: 1,
  minHeight: '24px',
});

export const BoxFl = styled(Box)({
  display: 'flex',
  alignItems: 'center',
});

export const SkeletonWH = styled(Skeleton)({
  width: 18,
  height: 18,
});

export const SkeletonW20 = styled(Skeleton)({
  width: 20,
});

export const SkeletonW80 = styled(Skeleton)({
  width: 80,
});

// Styled cho MenuItem trong dropdown
export const StyledActionMenuItem = styled(MenuItem)(({ theme }) => ({
  color: theme.palette.mode === "dark" ? "#FFFFFF" : "#1976d2",
  padding: 0,
  '& .MuiSvgIcon-root': {
    color: theme.palette.mode === "dark" ? "#FFFFFF" : "#1976d2",
  },
  '& .MuiButton-startIcon': {
    color: theme.palette.mode === "dark" ? "#FFFFFF" : "#1976d2",
  },
  '& .MuiTypography-root': {
    color: theme.palette.mode === "dark" ? "#FFFFFF" : "#1976d2",
  },
  '&:hover': {
    backgroundColor: theme.palette.mode === "dark"
      ? "rgba(255, 255, 255, 0.08)"
      : "rgba(25, 118, 210, 0.08)",
  },
}));
