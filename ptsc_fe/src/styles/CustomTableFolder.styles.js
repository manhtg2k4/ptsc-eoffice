import { styled } from "@mui/material/styles";
import CustomInputBase from "@components/CustomInput/CustomInputBase";
import {
  TableCell,
  Button,
  Checkbox,
  TableHead,
  TableContainer,
  Table,
  TableRow,
  TableBody,
  Grid,
  Typography,
  IconButton,
  FormControlLabel,
  Pagination,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Radio,
  FormControl,
  Stack,
	ListItemIcon,
  Popover,
  Box 
} from "@mui/material";
import {
  ArrowDropUp,
  ArrowDropDown,
	Clear as ClearIcon,
	Menu as MenuIcon,
} from "@mui/icons-material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { SkyBox } from "./SkyStyles";

export const StyledPaper = styled("div")(({ theme, isInsideDialog, autoHeight, fixedHeight, customMaxHeight, styledMaxHeight, disablePaperHeight }) => ({
  display: "flex",
  flexDirection: "column",
  // Khi disablePaperHeight = true, bỏ hẳn height để bố cục không bị ép
  height: (autoHeight || disablePaperHeight)
    ? "auto"
    : styledMaxHeight
    ? `calc(100vh - ${styledMaxHeight}px)`
    : fixedHeight
    ? (customMaxHeight ? `calc(100vh - ${customMaxHeight - 60}px)` : "calc(100vh - 360px)")
    : isInsideDialog
    ? "auto"
    : "calc(100vh - 280px)", // ✅ Tăng từ 100 lên 280 để tránh scroll toàn màn hình
  overflow: "hidden", // ✅ Luôn ẩn overflow để tránh thanh scroll dọc toàn màn
  position: "relative",
  [theme.breakpoints.down("md")]: {
    overflow: "hidden", 
  },
  padding: 8,
  background:
    theme.palette.mode === "light"
      ? theme.palette.background.paper
      : theme.palette.background.default,
  borderRadius: 10,

  [theme.breakpoints.down("lg")]: {
    height: disablePaperHeight
      ? "unset"
      : fixedHeight
      ? (customMaxHeight ? `calc(100vh - ${customMaxHeight - 50}px)` : "calc(100vh - 350px)")
      : isInsideDialog
      ? "auto"
      : "calc(100vh - 90px)",
  },
  [theme.breakpoints.down("md")]: {
    height: disablePaperHeight
      ? "unset"
      : fixedHeight
      ? (customMaxHeight ? `calc(100vh - ${customMaxHeight - 40}px)` : "calc(100vh - 340px)")
      : isInsideDialog
      ? "auto"
      : "calc(100vh - 80px)",
    padding: 4, // ✅ Giảm padding
  },
  [theme.breakpoints.down("sm")]: {
    height: disablePaperHeight
      ? "unset"
      : fixedHeight
      ? (customMaxHeight ? `calc(100vh - ${customMaxHeight - 30}px)` : "calc(100vh - 330px)")
      : autoHeight
      ? "auto"
      : isInsideDialog
      ? "auto"
      : "calc(100vh - 70px)",
    padding: 2, // ✅ Giảm padding nhiều hơn
    // ✅ Đảm bảo pagination luôn hiển thị
    paddingBottom: 8,
  },
}));

export const StyledToolbar = styled(SkyBox)(({ theme }) => ({
  minHeight: "0 !important",
  display: "flex",
  flexDirection: "row",
  flexWrap: "nowrap",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "24px",
  position: "relative",
  width: "100%",
  padding: 0,
  margin: '0 0 12px 0',
  [theme.breakpoints.down("md")]: {
    flexDirection: "column",
    alignItems: "stretch",
    margin: '8px 0',
    gap: "12px", // ✅ Giảm gap
  },
}));

export const SearchContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  position: "relative",
  backgroundColor: theme.palette.background.paper,
  padding: 0, // ✅ Bỏ paddingLeft để thẳng hàng với bảng
  borderRadius: theme.shape.borderRadius,
  // Trên màn hình nhỏ, giữ nguyên flex-nowrap để input và icon không bị tách rời
  [theme.breakpoints.down("md")]: {
    flexWrap: "nowrap",
    width: "100%",
  },
}));

export const ToolbarContent = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  flexWrap: "nowrap",
  alignItems: "center",
  gap: "16px",
  flex: 1,
  minWidth: 0,
  [theme.breakpoints.down("md")]: {
    width: "100%",
    flex: "none",
    flexWrap: "nowrap", // ✅ Tránh wrap quá nhiều ở cấp cụm search
    gap: "8px",
    "& > div": { flex: 1 } 
  },
}));

// Removed duplicate ReportSelectBox from here

export const ActionsContainer = styled(SkyBox)(({ theme, styleJustifyContent }) => ({
  display: "flex",
  flexWrap: "nowrap",
  justifyContent: styleJustifyContent || "flex-end",
  alignItems: "center",
  gap: "12px",
  flexShrink: 0,
  paddingTop: 0,
  minWidth: "fit-content",
  [theme.breakpoints.down("md")]: {
    width: "100%",
    justifyContent: "flex-start", // ✅ Chuyển về trái trên màn hình nhỏ
  },
}));

export const ActionsContainerFooter = styled(SkyBox)({
  display: "flex",
  justifyContent: "center", // ✅ Căn giữa phân trang
  alignItems: "center",
  gap: 2,
  padding: 0,
});

export const PaginationWrapper = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "flex-end",
  width: "100%",
  flexShrink: 0,
  marginTop: "auto",
  marginBottom: -8, // ✅ Kéo xuống sát đáy hơn (bù lại padding của Paper)
  paddingTop: 8,
  
  [theme.breakpoints.down("md")]: {
    marginBottom: -4,
    padding: "4px 8px",
  },
  
  [theme.breakpoints.down("sm")]: {
    marginBottom: 0,
    marginTop: 4,
    padding: "0 4px",
    justifyContent: "center",
  },
}));

export const PaginationContainerStyled = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  padding: theme.spacing(0, 2),
  flexShrink: 0,
  minHeight: "56px",
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.spacing(1),
  boxShadow: "none",
  border: "none",
  zIndex: 10,

  // ✅ Responsive cho tablet
  [theme.breakpoints.down("md")]: {
    padding: theme.spacing(1),
    minHeight: "50px",
    fontSize: "0.875rem", // Giảm font size
    "& > span": {
      fontSize: "0.8125rem",
    },
  },
  
  // ✅ Responsive cho mobile
  [theme.breakpoints.down("sm")]: {
    flexWrap: "wrap",
    gap: theme.spacing(1),
    justifyContent: "center", // Căn giữa
    padding: theme.spacing(0.75, 1),
    minHeight: "auto",
    "& > span": {
      fontSize: "0.75rem",
      // ✅ Ẩn text "bản ghi" trên mobile để tiết kiệm không gian
      "&:nth-of-type(2)": {
        display: "none",
      },
    },
  },
  
  // ✅ Responsive cho màn hình rất nhỏ (< 375px)
  [theme.breakpoints.down(375)]: {
    padding: theme.spacing(0.5),
    "& .MuiIconButton-root": {
      padding: "4px",
    },
  },
}));export const TopActionsContainer = styled(SkyBox)(({ styleJustifyContent }) => ({
  display: "flex",
  justifyContent: styleJustifyContent || "space-between",
  paddingTop: 8, // XÓA HOÀN TOÀN
  paddingBottom: 8, // XÓA HOÀN TOÀN
}));

export const ExtraContentBox = styled(SkyBox)(() => ({
  marginTop: 0, // XÓA HOÀN TOÀN
  marginBottom: 0, // XÓA HOÀN TOÀN
}));

export const ToolbarContainer = styled(SkyBox)({
  width: "100%",
  padding: 0, // XÓA HOÀN TOÀN
  margin: 0, // XÓA HOÀN TOÀN
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
  zIndex: 1100, // ✅ Tăng zIndex để không bị header đè lên
  minWidth: "380px", // ✅ Cố định chiều rộng tối thiểu
  maxWidth: "90vw",
  maxHeight: "500px", // ✅ Giới hạn chiều cao
  overflowY: "auto", // ✅ Thêm scroll khi quá nhiều item
  "& .MuiFormControlLabel-root": {
    whiteSpace: "nowrap", // ⭐ Không cho xuống dòng
    margin: 0,
  },
  [theme.breakpoints.down("sm")]: {
    left: 0,
    minWidth: "300px",
  },
}));

export const FilterTitle = styled(Typography)({
  textAlign: "center",
  fontSize: "16px !important",
  fontWeight: "bold",
  marginBottom: "8px",
});

export const FilterFormControlLabel = styled(FormControlLabel)({
  fontSize: "14px !important",
});

export const StyledSearchField = styled(CustomInputBase)(({ theme }) => ({
  flexGrow: 1, 
  minWidth: 300, 
  maxWidth: 450, 

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
    // ✅ Thêm xử lý autofill
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
    // border: "none", // ✅ Phục hồi lại border đã bị xóa
  },
  // Responsive trên màn hình nhỏ
  [theme.breakpoints.down("md")]: {
    minWidth: "0", // ✅ Cho phép co lại để nhường chỗ cho icon
    flex: 1, 
    marginBottom: 0,
  },
}));

export const StyledTableHead = styled(TableHead)(({ theme, styleColor }) => {
  const headerBorderWidth = theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px";
  const headerBorderColor = theme.palette.mode === "dark" ? theme.palette.divider : "#dee2e6";
  const headerBg = theme.palette.mode === "dark" ? "#1e293b" : "#F9FAFB";
  const headerBorder = `${headerBorderWidth} solid ${headerBorderColor}`;
  return {
    position: "sticky",
    top: 0,
    zIndex: 1001,
    backgroundColor: headerBg,
    boxShadow: `inset 0 ${headerBorderWidth} 0 ${headerBorderColor}`,
    "& .MuiTableRow-root": {
      borderBottom: headerBorder,
    },
    "& .MuiTableCell-root": {
      backgroundColor: `${headerBg} !important`,
      position: "sticky",
      top: 0,
      zIndex: 1002,
      boxShadow: `inset 0 ${headerBorderWidth} 0 ${headerBorderColor}, inset 0 -${headerBorderWidth} 0 ${headerBorderColor}`,
    },
    borderBottom: headerBorder,
    color: styleColor || theme.palette.text.primary,
  };
});

export const StyledTableContainer = styled(TableContainer)(
  ({ autoHeight, disablePaperHeight }) => ({
    flex: 1,
    overflowY: (autoHeight || disablePaperHeight) ? "visible" : "auto",
    overflowX: (autoHeight || disablePaperHeight) ? "visible" : "auto", // Cho phép container cha xử lý cuộn ngang
    position: "relative",
    width: "100%",
    minHeight: 0, // ✅ QUAN TRỌNG
    // customMaxHeight hoặc styledMaxHeight được ưu tiên, sau đó là isMaxHeight
    maxHeight: (autoHeight || disablePaperHeight)
      ? "unset"
      : "100%", // ✅ Sử dụng 100% của flex container thay vì calc cứng
  })
);
export const StyleTableContainer = styled(TableContainer)(
  ({  autoHeight, disablePaperHeight }) => ({
    flex: 1,
    overflowY: (autoHeight || disablePaperHeight) ? "visible" : "auto",
    overflowX: "auto", // Cho phép container cha xử lý cuộn ngang
    position: "relative",
    width: "100%",
    minHeight: 0, // ✅ QUAN TRỌNG
    // customMaxHeight hoặc styledMaxHeight được ưu tiên, sau đó là isMaxHeight
    maxHeight: (autoHeight || disablePaperHeight)
      ? "unset"
      : "100%", // ✅ Sử dụng 100% của flex container
  })
);

export const StyledTable = styled(Table)(
  ({ styleBorderCollapse, styleBorder, styleTableLayout }) => ({
    borderCollapse: styleBorderCollapse || "separate !important",
    tableLayout: styleTableLayout || "auto",
    minWidth: "unset !important", // 👈 loại bỏ min-width mặc định
    width: "100%",
    border: styleBorder || null,
  })
);

export const StyledTableBorder = styled(Table)(
  ({ styleBorderCollapse, styleBorder, styleTableLayout }) => ({
    tableLayout: styleTableLayout || "auto", // Thêm tableLayout
    borderCollapse: styleBorderCollapse || "collapse", // ← Đổi default từ "separate" → "collapse"
    minWidth: "unset !important",
    width: "100%",
    border: styleBorder || "1px solid #e0e0e0", // ← Đổi default từ null → "1px solid #e0e0e0"
  })
);

export const StyledTableBody = styled(TableBody)({});

export const StyledTableRow = styled(TableRow, {
  shouldForwardProp: (prop) => prop !== "index" && prop !== "clickable" && prop !== "disableHover",
})(({ theme, clickable, disableHover }) => ({
  color: theme.palette.text.primary,
  borderBottom: "none", // ✅ Xóa border ở hàng, sẽ chuyển xuống cho từng ô
  backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#FFFFFF",
  cursor: clickable ? "pointer" : "default",
  "&.Mui-selected": {
    backgroundColor: `${
      theme.palette.mode === "dark" ? "#2c3e50" : "#F5F5F5"
    } !important`,
  },
  "tbody &": {
    backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#FFFFFF",
    ...(!disableHover && {
      "&:hover": {
        backgroundColor: `${
          theme.palette.mode === "dark"
            ? "rgba(148, 163, 184, 0.14)"
            : theme.palette.action.hover
        } !important`,
      },
    }),
  },
}));

export const StyledTableCells = styled(TableCell, {
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
    // ✅ Kiểm tra cờ enableCustomBorder trước khi áp dụng border
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
    backgroundColor: "inherit", // Kế thừa từ row để đồng bộ khi hover
    padding: "0px 10px", // ✅ Bỏ padding dọc
    position: "relative",
    zIndex: 1,
    // Đảm bảo khi row hover, cell cũng có cùng màu
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
            backgroundColor: "inherit", // Kế thừa từ row
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

// export const StyledTableCellActions = styled(TableCell, {
//   shouldForwardProp: (prop) =>
//     !["alignCenter", "styleWidth", "index", "isAction"].includes(prop),
// })(({ theme, alignCenter, styleWidth, index, isAction }) => ({
//   // ✅ Kiểm tra cờ enableCustomBorder trước khi áp dụng border
//   borderBottom: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
//     theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
//       ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
//         theme.palette.divider
//       : "transparent"
//   }`,
//   borderRight: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
//     theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
//       ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
//         theme.palette.divider
//       : "transparent"
//   }`,
//   borderLeft: "none", // ✅ Loại bỏ borderLeft để tránh chồng chéo
//   textAlign: alignCenter ? "center" : "left",
//   whiteSpace: "nowrap",
//   padding: "0px 10px", // ✅ Bỏ padding dọc
//   width: styleWidth || null,
//   "thead &": {
//     backgroundColor:
//       theme.components?.MuiTableHead?.styleOverrides?.root?.backgroundColor ||
//       theme.palette.background.paper,
//     borderTop: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
//       theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
//         ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
//           theme.palette.divider
//         : "transparent"
//     }`, // Giữ nguyên border top
//     fontWeight: "bold", // ✅ Đồng bộ font weight với các header khác
//     ...(isAction && {
//       textAlign: "center",
//     }),
//     // ✅ Đảm bảo header của cột Action khi sticky cũng có nền đồng bộ
//     "&:last-child": {
//       position: "sticky",
//       right: 0,
//       zIndex: 21, // Đảm bảo zIndex cao hơn các ô nội dung
//       backgroundColor:
//         theme.components?.MuiTableHead?.styleOverrides?.root?.backgroundColor ||
//         theme.palette.background.paper, // ✅ Đặt màu nền rõ ràng
//       // 🔒 Fix cứng độ rộng cột hành động
//       width: "180px !important",
//       minWidth: "180px !important",
//       maxWidth: "180px !important",
//     },
//   },
//   // Đặt màu nền rõ ràng dựa trên index để khớp với row
//   "tbody &": {
//     backgroundColor:
//       index % 2 !== 0
//         ? theme.palette.table?.rowOdd ||
//           (theme.palette.mode === "dark" ? "#2c3e50" : "#F9F9F9")
//         : theme.palette.table?.rowEven || theme.palette.background.paper,
//   },
//   position: "relative",
//   zIndex: 2,

//   "&:last-child": {
//     width: "180px !important", // 🔒 Fix cứng độ rộng
//     minWidth: "180px !important",
//     maxWidth: "180px !important",
//     overflow: "hidden",
//     textOverflow: "ellipsis",
//     textAlign: "center",
//     position: "sticky",
//     right: 0,
//     zIndex: 20, // Giữ nguyên zIndex
//     // Đặt màu nền mặc định cho ô hành động cố định để đảm bảo nó luôn đục
//     backgroundColor:
//       index % 2 !== 0
//         ? theme.palette.table?.rowOdd ||
//           (theme.palette.mode === "dark" ? "#2c3e50" : "#f9fafb")
//         : theme.palette.table?.rowEven || theme.palette.background.paper,
//     // 🔒 Ẩn ColumnResizer cho cột actions
//     "& .ColumnResizer": {
//       display: "none",
//     },
//     "&::after": {
//       content: '""',
//       position: "absolute",
//       left: 0,
//       top: 0,
//       bottom: 0,
//       borderLeft: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
//         theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
//           ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
//             "#ddd"
//           : "transparent"
//       }`,
//     },
//     // Responsive cho màn hình nhỏ
//     [theme.breakpoints.down("md")]: {
//       width: "60px !important",
//       minWidth: "60px !important",
//       maxWidth: "60px !important",
//     },
//   },
//   // Đảm bảo khi row hover, cell action cũng có cùng màu
//   "tbody tr:hover &": {
//     backgroundColor: `${theme.palette.action.hover} !important`,
//     "&:last-child": {
//       // ✅ Đảm bảo cột Action cũng có màu hover
//       backgroundColor: `${theme.palette.action.hover} !important`,
//     },
//   },
// }));

export const StyledTableCellActions = styled(TableCell, {
  shouldForwardProp: (prop) =>
    !["alignCenter", "styleWidth", "index", "isAction"].includes(prop),
})(({ theme, alignCenter, styleWidth, isAction }) => ({
  // ✅ Kiểm tra cờ enableCustomBorder trước khi áp dụng border
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
  borderLeft: "none", // ✅ Loại bỏ borderLeft để tránh chồng chéo
  textAlign: alignCenter ? "center" : "left",
  whiteSpace: "nowrap",
  padding: "0px 10px", // ✅ Bỏ padding dọc
  width: styleWidth || null,
  "thead &": {
    backgroundColor: theme.components?.MuiTableHead?.styleOverrides?.root?.backgroundColor || (theme.palette.mode === "dark" ? "#1e293b" : "#f9fafb"),
    borderTop: `1px solid ${theme.palette.mode === "dark" ? theme.palette.divider : "#dee2e6"}`, // Giữ nguyên border top
    fontWeight: "bold", // ✅ Đồng bộ font weight với các header khác
    ...(isAction && {
      textAlign: "center",
    }),
    // ✅ Đảm bảo header của cột Action khi sticky cũng có nền đồng bộ
    "&:last-child": {
      position: "sticky",
      right: 0,
      zIndex: 1002, // Đảm bảo zIndex cao hơn các ô header khác (1001)
      backgroundColor: theme.components?.MuiTableHead?.styleOverrides?.root?.backgroundColor || (theme.palette.mode === "dark" ? "#1e293b" : "#f9fafb"), // ✅ Đặt màu nền rõ ràng
    },
  },
  "tbody &": {
    backgroundColor: "inherit",
  },
  position: "relative",
  zIndex: 2,

  "&:last-child": {
    width: 100, // Giữ nguyên chiều rộng
    minWidth: 100,
    maxWidth: 140,
    overflow: "hidden",
    textOverflow: "ellipsis",
    textAlign: "center",
    position: isAction ? "sticky" : "static",
    right: 0,
    zIndex: 20, // Giữ nguyên zIndex
    // Đặt màu nền mặc định cho ô hành động cố định để đảm bảo nó luôn đục
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
    // Responsive cho màn hình nhỏ
    [theme.breakpoints.down("md")]: {
      width: 40,
      minWidth: 40,
      maxWidth: 60,
    },
  },
  // Đảm bảo khi row hover, cell action cũng có cùng màu
  "tbody tr:hover &": {
    backgroundColor: `${theme.palette.action.hover} !important`,
    "&:last-child": {
      // ✅ Đảm bảo cột Action cũng có màu hover
      backgroundColor: `${theme.palette.action.hover} !important`,
    },
  },
}));

export const StyledTableCellActionsSpecial = styled(StyledTableCellActions)(
  () => ({
    width: 150,
    minWidth: 150,
    borderCollapse: "collapse",
    // Override border nếu cần
    borderBottom: "1px solid #e0e0e0 !important",
    borderRight: "1px solid #e0e0e0 !important",
  })
);

//Ko được xóa StyledTableCell
// export const StyledTableCell = styled(TableCell, {
//   shouldForwardProp: (prop) => prop !== "$width" && prop !== "$minWidth" && prop !== "$maxWidth" && prop !== "wrapContent",
// })(({ theme, $width, $minWidth, $maxWidth, wrapContent }) => ({
//   width: $width || "auto",
//   minWidth: $minWidth || "auto",
//   maxWidth: $maxWidth || "auto",
//   whiteSpace: wrapContent ? "normal" : "nowrap",
//   // ✅ Kiểm tra cờ enableCustomBorder trước khi áp dụng border
//   borderRight: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || '1px'} solid ${
//     theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
//       ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor || theme.palette.divider
//       : 'transparent'
//   }`,
//   "&:first-of-type": {
//     borderLeft: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || '1px'} solid ${
//       theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
//         ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor || theme.palette.divider
//         : 'transparent'
//     }`,
//   },
//   borderBottom: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || '1px'} solid ${
//     theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
//       ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor || theme.palette.divider
//       : 'transparent'
//   }`,
//   // ✅ Thêm border-top cho header
//   'thead &': {
//     borderTop: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || '1px'} solid ${theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder ? (theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor || theme.palette.divider) : 'transparent'}`,
//     backgroundColor: theme.components?.MuiTableHead?.styleOverrides?.root?.backgroundColor || theme.palette.background.paper,
//     fontWeight: 'bold', // header chữ đậm
//   },
//   overflow: "hidden",
//   textOverflow: "ellipsis",
//   backgroundColor: "inherit",
//   padding: `0px 10px`, // ✅ Bỏ padding dọc, không cần !important
//   height: theme.layout?.dynamicTable?.rowHeight || '55px', // ✅ Áp dụng chiều cao từ theme
//   'tbody tr:hover &': {
//     backgroundColor: `${theme.palette.action.hover} !important`,
//   },
// }));

// export const StyledTableCell = styled(TableCell, {
// 	shouldForwardProp: (prop) =>
// 		!["styleWidth", "styleMinWidth", "styleMaxWidth", "wrapContent", "stylePosition", "styleZIndex"].includes(prop),
// })(({
// 	theme,
// 	styleWidth,
// 	styleMinWidth,
// 	styleMaxWidth,
// 	wrapContent,
// 	stylePosition,
// 	styleZIndex,
// 	styleCursor,
// 	styleOpacity,
// 	styleOverflow,
// 	styleTextOverflow,
// 	stylePadding,
// 	styleleWordWrap,
// 	styleOverflowWrap,
// 	styleBorderCollapse,
//   styleWidthCell
// }) => {
// 	return {
// 		width: styleWidth || styleWidthCell || "auto",
// 		minWidth: styleMinWidth || "auto",
// 		maxWidth: styleMaxWidth || "auto",
// 		whiteSpace: wrapContent ? "normal" : "nowrap",
// 		borderRight: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
// 				? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor || theme.palette.divider
// 				: "transparent"
// 			}`,
// 		"&:first-of-type": {
// 			borderLeft: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
// 					? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor || theme.palette.divider
// 					: "transparent"
// 				}`,
// 		},
// 		borderBottom: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
// 				? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor || theme.palette.divider
// 				: "transparent"
// 			}`,
// 		"thead &": {
// 			borderTop: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
// 					? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor || theme.palette.divider
// 					: "transparent"
// 				}`,
// 			backgroundColor:
// 				theme.components?.MuiTableHead?.styleOverrides?.root?.backgroundColor ||
// 				theme.palette.background.paper,
// 			fontWeight: "bold",
// 		},
// 		overflow: styleOverflow || "hidden",
// 		textOverflow: styleTextOverflow || "ellipsis",
// 		backgroundColor: "inherit",
// 		padding: stylePadding || `0px 10px`,
// 		height: theme.layout?.dynamicTable?.rowHeight || "55px",
// 		"tbody tr:hover &": {
// 			backgroundColor: `${theme.palette.action.hover} !important`,
// 		},
// 		position: stylePosition || null,
// 		zIndex: styleZIndex || null,
// 		cursor: styleCursor || null,
// 		opacity: styleOpacity || null,
// 		wordWrap: styleleWordWrap || null,
// 		overflowWrap: styleOverflowWrap || null,
// 		borderCollapse: styleBorderCollapse || null
// 	};
// });

export const StyledTableCell = styled(TableCell, {
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
      "styleTextAlign",
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
  styleTextAlign,
	styleJustifyContent
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

    textAlign: styleTextAlign || "left",
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
      borderTop: `1px solid ${theme.palette.mode === "dark" ? theme.palette.divider : "#dee2e6"}`,
      backgroundColor:
        theme.components?.MuiTableHead?.styleOverrides?.root?.backgroundColor ||
        (theme.palette.mode === "dark" ? "#1e293b" : "#F1F3F5"),
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
    
    // Ensure ellipsis works properly for all cell content
    "& > *": {
      maxWidth: "100%",
      minWidth: 0,
    },

    position: stylePosition || "relative",
    zIndex: styleZIndex || null,
    cursor: styleCursor || null,
    opacity: styleOpacity || null,
    wordWrap: styleleWordWrap || null,
    overflowWrap: styleOverflowWrap || null,
    borderCollapse: styleBorderCollapse || null,
		justifyContent: styleJustifyContent || null
  };
});

export const StyleSkyTableCell = styled(StyledTableCell)(() => ({
  textAlign: "center",
}));

export const StyledTableCellLoadMore = styled(StyledTableCell)(({theme}) => ({
	padding: theme.spacing(0),
	borderLeft: "none",
	borderRight: "none",
}))

export const StyledTableCellWrap = styled(StyledTableCell)(() => ({
  whiteSpace: "normal",
  wordWrap: "break-word",
  overflowWrap: "break-word",
  padding: "8px",
  borderCollapse: "collapse",
  // Override overflow settings để cho phép wrap
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

export const PopoverButton = styled(Button)({
  width: "100%",
  justifyContent: "flex-start",
});

export const PaginationContainer = styled(SkyBox)({
  gap: "8px",
  display: "flex",
  alignItems: "center",
  padding: "16px 0px 0px 0px",
});

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

export const DatePickerGrid = styled(Grid)(({ theme }) => ({
  margin: theme.spacing(0, 2),
  minWidth: 250,
  maxWidth: 350,
}));

export const DatePickerBox = styled(SkyBox)(({ theme }) => ({
  margin: theme.spacing(0, 3),
}));

export const MoreSearchBox = styled(SkyBox)(() => ({
  // width: '100%',
  // backgroundColor: theme.palette.background.paper,
  // padding: '12px',
  // width: "100%",
  // Thay đổi màu nền thành trong suốt để loại bỏ hộp nền bên ngoài
  backgroundColor: "transparent",
  padding: "12px",
}));

export const ReportSelectBox = styled(SkyBox)(({ theme }) => ({
  marginLeft: 0,
  minWidth: 250,
  [theme.breakpoints.down("md")]: {
    width: "100%",
    minWidth: "unset",
  },
}));
export const RadioBox = styled(SkyBox)(({ theme }) => ({
  marginLeft: theme.spacing(2.5),
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2),
}));

// export const ActionIconButton = styled(IconButton, {
//   shouldForwardProp: (prop) => prop !== "colorType",
// })(({ theme, colorType }) => ({
//   color:
//     colorType === "error" // Nếu là icon lỗi (vd: Xóa)
//       ? theme.palette.error.main // Dùng màu error của theme
//       : theme.palette.actionIcon?.default ||
//         (theme.palette.mode === "dark"
//           ? "#FFFFFF"
//           : theme.palette.primary.main),
// }));
export const ActionIconButton = styled(IconButton)(({ theme, colorType }) => ({
  // Sửa lỗi: Luôn ưu tiên màu chính khi không có colorType
  color:
    colorType === "error"
      ? theme.palette.error.main
      : theme.palette.actionIcon?.default || theme.palette.primary.main,
  padding: 5,
  minWidth: 0,

  // Dòng này là "sát thủ" diệt 3 chấm thừa
  "&& .MuiCircularProgress-root": { display: "none" },
}));

export const StyledRadio = styled(Radio)(({ theme, value }) => ({
  color:
    value === "PDF" ? theme.palette.text.secondary : theme.palette.primary.main,
}));

export const StyledClearIcon = styled(ClearIcon)({
  fontSize: "1.25rem",
});

export const SearchAdornment = styled(InputAdornment)({});

// export const CheckboxHeaderCell = styled(TableCell)(({ theme }) => ({
//   // 🔒 Fix cứng độ rộng, không cho resize - override mọi cái khác
//   width: "50px !important",
//   minWidth: "50px !important",
//   maxWidth: "50px !important",
//   padding: "0px 16px !important",

//   // Đảm bảo nó sticky nếu cần
//   position: "sticky !important",
//   left: 0,
//   zIndex: 3,

//   // Style header
//   backgroundColor:
//     theme.components?.MuiTableHead?.styleOverrides?.root?.backgroundColor ||
//     theme.palette.background.paper,
//   fontWeight: "bold",
//   borderTop: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
//     theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
//       ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
//         theme.palette.divider
//       : "transparent"
//   }`,
//   borderBottom: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
//     theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
//       ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
//         theme.palette.divider
//       : "transparent"
//   }`,
//   borderRight: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
//     theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
//       ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
//         theme.palette.divider
//       : "transparent"
//   }`,
//   borderLeft: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
//     theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
//       ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
//         theme.palette.divider
//       : "transparent"
//   }`,

//   // Ẩn ColumnResizer
//   "& .ColumnResizer": {
//     display: "none !important",
//     pointerEvents: "none",
//   },

//   // Đảm bảo không có con trỏ resize
//   cursor: "default !important",
//   userSelect: "none",
// }));

// 🔒 Component cho cột checkbox trong body rows

export const CheckboxHeaderCell = styled(StyledTableCell)({
  width: "50px",
  padding: "0px 16px",
  textAlign: "center",
  verticalAlign: "middle",
});

export const STTHeaderCell = styled(StyledTableCell)({
  width: "50px",
});

export const CheckboxBodyCell = styled(TableCell)(({ theme, index }) => ({
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
  backgroundColor: theme.palette?.table?.rowEven || (theme.palette.mode === "dark" ? "#0f172a" : "#FFFFFF"),
  "tr:nth-of-type(even) &": {
    backgroundColor: theme.palette?.table?.rowOdd || (theme.palette.mode === "dark" ? "#1e293b" : "#F1F3F5"),
  },
  ...(typeof index !== "undefined" && {
    backgroundColor:
      index % 2 === 0
        ? theme.palette?.table?.rowEven || (theme.palette.mode === "dark" ? "#0f172a" : "#FFFFFF")
        : theme.palette?.table?.rowOdd || (theme.palette.mode === "dark" ? "#1e293b" : "#F1F3F5"),
  }),

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

// export const STTHeaderCell = styled(TableCell)(({ theme }) => ({
//   // 🔒 Fix cứng độ rộng, không cho resize
//   width: "50px !important",
//   minWidth: "50px !important",
//   maxWidth: "50px !important",
//   padding: "0px 16px !important",

//   // Đảm bảo nó sticky nếu cần
//   position: "sticky !important",
//   left: 0,
//   zIndex: 3,

//   // Style header
//   backgroundColor:
//     theme.components?.MuiTableHead?.styleOverrides?.root?.backgroundColor ||
//     theme.palette.background.paper,
//   fontWeight: "bold",
//   borderTop: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
//     theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
//       ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
//         theme.palette.divider
//       : "transparent"
//   }`,
//   borderBottom: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
//     theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
//       ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
//         theme.palette.divider
//       : "transparent"
//   }`,
//   borderRight: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
//     theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
//       ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
//         theme.palette.divider
//       : "transparent"
//   }`,
//   borderLeft: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
//     theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
//       ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
//         theme.palette.divider
//       : "transparent"
//   }`,

//   // Ẩn ColumnResizer
//   "& .ColumnResizer": {
//     display: "none !important",
//     pointerEvents: "none",
//   },

//   // Đảm bảo không có con trỏ resize
//   cursor: "default !important",
//   userSelect: "none",
// }));

// 🔒 Component cho cột STT trong body rows

export const STTBodyCell = styled(TableCell)(({ theme, index }) => ({
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
  backgroundColor: theme.palette?.table?.rowEven || (theme.palette.mode === "dark" ? "#0f172a" : "#FFFFFF"),
  "tr:nth-of-type(even) &": {
    backgroundColor: theme.palette?.table?.rowOdd || (theme.palette.mode === "dark" ? "#1e293b" : "#F1F3F5"),
  },
  ...(typeof index !== "undefined" && {
    backgroundColor:
      index % 2 === 0
        ? theme.palette?.table?.rowEven || (theme.palette.mode === "dark" ? "#0f172a" : "#FFFFFF")
        : theme.palette?.table?.rowOdd || (theme.palette.mode === "dark" ? "#1e293b" : "#F1F3F5"),
  }),

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

export const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  height: theme.components?.MuiOutlinedInput?.styleOverrides?.root?.height || 40,
  minWidth: "40px",
  display: "inline-flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "0 12px",
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  textTransform: "none",
  "&:hover": { backgroundColor: theme.palette.primary.dark },
  "&.Mui-disabled": {
    backgroundColor: theme.palette.action.disabledBackground || (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'),
    color: theme.palette.action.disabled || (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.26)'),
  },
}));

export const AddButton = styled(StyledButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  "&:hover": { backgroundColor: theme.palette.primary.dark },
}));

export const StyledSearchButton = styled(Button)(({ theme, iscolor }) => ({
  height:
    theme.components?.MuiOutlinedInput?.styleOverrides?.root?.height || 40,
  width: theme.components?.MuiOutlinedInput?.styleOverrides?.root?.height || 40,
  minWidth: "40px !important",
  // Thay đổi màu nền và màu chữ dựa trên prop 'iscolor'
  backgroundColor:
    iscolor === "warning"
      ? theme.palette.warning.main
      : theme.palette.primary.main,
  color:
    iscolor === "warning"
      ? theme.palette.warning.contrastText
      : theme.palette.primary.contrastText,
  // ✅ Sửa lỗi: Thêm khoảng cách để nút không dính vào ô tìm kiếm
  marginLeft: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  "&:hover": {
    backgroundColor:
      iscolor === "warning"
        ? theme.palette.warning.dark
        : theme.palette.primary.dark,
  },
  // marginTop: 8,
}));

export const StyledFilterButton = styled(Button)(({ theme }) => ({
  height:
  theme.components?.MuiOutlinedInput?.styleOverrides?.root?.height || 40,
  minWidth: "40px !important",
  color: theme.palette.mode === 'dark' ? '#ffffff' : '#637381', // Thêm logic cho dark/light mode
  backgroundColor: "background.paper",
  borderRadius: `0 ${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0`,
  border: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${theme.palette.divider}`,
  borderLeft: "none",
  boxShadow: "none",
  '& .MuiSvgIcon-root': { // Target icon trực tiếp
    color: theme.palette.mode === 'dark' ? '#ffffff' : '#637381',
  },
}));
export const ActionsBox = styled(SkyBox)(() => ({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "nowrap",
  flexShrink: 0
}));

export const DeleteActionButton = styled(StyledButton)(({theme}) => ({
  minWidth: "40px",
  width: "40px",
  height: "40px",
   backgroundColor: "#fff",
  color: theme.palette.error.main,
  border: `1px solid ${theme.palette.error.main}`,
  padding: 0,
  borderRadius: "8px",
  "& svg": {
    width: "14px",
    height: "14px",
  },
    "&:hover": {
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(211, 47, 47, 0.16)' : 'rgba(211, 47, 47, 0.04)',
    borderColor: theme.palette.error.dark,
    color: theme.palette.error.dark,
  },
  "& .MuiSvgIcon-root": {
    fontSize: "20px",
  },
}));

export const ExportActionButton = styled(StyledButton)(({ theme }) => ({
  minWidth: "40px",
  width: "40px",
  height: "40px",
  padding: 0,
  borderRadius: "8px",
  backgroundColor: theme.palette.mode === "dark" ? "#2d3748" : "#ffffff",
  color: "#5A6573",
  border: `1px solid ${theme.palette.mode === "dark" ? "rgba(255,255,255,0.12)" : "#d0d5dd"}`,
  boxShadow: "0px 1px 2px rgba(16, 24, 40, 0.05)",
  "&:hover": {
    backgroundColor: theme.palette.mode === "dark" ? "#3d4a5c" : "#f5f7fa",
    color: "#3a4450",
    border: `1px solid ${theme.palette.mode === "dark" ? "rgba(255,255,255,0.2)" : "#b0b8c4"}`,
  },
  "& svg": {
    color: "#5A6573",
    fill: "#5A6573",
  },
}));

export const AddActionButton = styled(StyledButton)(() => ({
  gap: "8px",
  padding: "0 20px",
  whiteSpace: "nowrap",
  minWidth: "fit-content",
  width: "auto",
  height: "40px",
  fontSize: "14px",
  fontWeight: 600,
  borderRadius: "8px",
  textTransform: "none",
}));

export const SquareIconActionButton = styled(StyledButton)(() => ({
  minWidth: "40px",
  width: "40px",
  height: "40px",
  padding: 0,
  borderRadius: "8px",
}));

export const ConfigPopover = styled(Popover)(() => ({
  "& .MuiPaper-root": {
    width: 600,
    maxWidth: "90vw",
    borderRadius: "16px",
    boxShadow: "0px 8px 32px rgba(0, 0, 0, 0.12)",
    overflow: "hidden"
  }
}));

export const FlexAlignCenterBox = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
}));

export const PaginationActionsBox = styled(FlexAlignCenterBox)(() => ({
  gap: '16px',
}));

export const StyledCheckbox = styled(Checkbox)({});

export const StyledPagination = styled(Pagination)(({ theme }) => ({
  // "& .MuiPagination-ul": {
  // 	flexWrap: "nowrap",        // ⭐ KHÔNG CHO XUỐNG DÒNG
  // },
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

export const RowsPerPageSelect = styled(Select)({
  height: "24px",
});

export const StyleFormControl = styled(FormControl)({
  minWidth: 200,
});

export const DeleteStyledButton = styled(StyledButton)(({ theme }) => ({
  backgroundColor: theme.palette.error.main,
  color: theme.palette.error.contrastText,
  "&:hover": {
    backgroundColor: theme.palette.error.dark,
  },
  "&.Mui-disabled": {
    backgroundColor: theme.palette.error.light, // Màu nền nhạt hơn khi disable
    color: theme.palette.error.contrastText,
    opacity: 0.3, // Giảm độ mờ để nhạt hơn nữa
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

export const LoadingDialogTitle = styled(DialogTitle)({
  margin: 0,
  padding: "16px",
});

export const LoadingTypography = styled(Typography)({
  fontSize: "16px",
  fontWeight: 500,
  textAlign: "center",
});

export const PopoverContainer = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(1),
  display: "flex",
  flexDirection: "column",
  "& .MuiButton-root": {
    justifyContent: "flex-start",
    textAlign: "left",
    textTransform: "none",
    padding: theme.spacing(1, 2),
      
  },
}));

export const HeaderCellContainer = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "align",
})(({ align }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent:
    align === "left"
      ? "flex-start"
      : align === "right"
      ? "flex-end"
      : "center",
  position: "relative",
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

export const SynchronizeButton = styled(AddButton)({});
export const ExportButton = styled(AddButton)({});
export const ConfigButton = styled(AddButton)({});

export const DeleteSelectedButton = styled(StyledButton)(({ theme }) => ({
  color: theme.palette.error.contrastText, // Icon màu trắng
  backgroundColor: theme.palette.error.main,
  "&:hover": {
    backgroundColor: theme.palette.error.dark,
  },
  "&:disabled": {
    backgroundColor: theme.palette.error.light, // Màu nền nhạt hơn khi disable
    color: theme.palette.error.contrastText, // Giữ màu icon
    opacity: 0.5, // Thêm độ mờ để đồng bộ
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

// Advanced filter dialog styled components
export const AdvancedFilterDialog = styled(Dialog)(() => ({
  "& .MuiPaper-root": {
    borderRadius: 8,
    maxWidth: "1000px",
    width: "calc(100% - 80px)",
    minHeight: "460px",
    maxHeight: "75vh",
    overflowY: "auto",
  },
}));

export const AdvancedFilterDialogTitle = styled(DialogTitle)(({ theme }) => ({
  textAlign: "center",
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(1),
  // draw a full-width divider under the title so it doesn't look 'half'
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

export const AdvancedFilterDialogContent = styled(DialogContent)(
  ({ theme }) => ({
    padding: theme.spacing(2, 3),
    /* ensure content area has enough vertical space */
    minHeight: 140,
    /* allow content to span full dialog width; avoid fixed narrow width */
    width: "100%",
  })
);

export const AdvancedFilterDialogActions = styled(DialogActions)(
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

export const AdvancedFilterApplyButton = styled(Button)(() => ({
  minWidth: 100,
  height: 40,
}));

export const AdvancedFilterCloseButton = styled(Button)(({ theme }) => ({
  minWidth: 100,
  height: 40,
  // In dark mode make the label white and adjust outline color so it remains visible
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
  width: "100%",
  minWidth: 200,
});

export const StyleBoxInTableTree = styled(SkyBox)({
  display: "inline-block",
  width: "100%",
});
export const StyleStack = styled(Stack)(() => ({
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

export const StyleIcon = styled(ArrowBackIosNewIcon)(({ theme }) => ({
  fontSize: "small",
  
  [theme.breakpoints.down("sm")]: {
    fontSize: "0.875rem",
  },
}));

export const StyleIconArrow = styled(ArrowForwardIosIcon)(({ theme }) => ({
  fontSize: "small",
  
  [theme.breakpoints.down("sm")]: {
    fontSize: "0.875rem",
  },
}));

export const StylePageContainer = styled(SkyBox)(({ theme }) => ({
  fontWeight: "bold",
  minWidth: "24px",
  textAlign: "center",
  
  // ✅ Responsive
  [theme.breakpoints.down("sm")]: {
    minWidth: "20px",
    fontSize: "0.875rem",
  },
}));

export const StyleDropDown = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
  
  // ✅ Responsive cho mobile
  [theme.breakpoints.down("sm")]: {
    "& > span": {
      display: "none", // Ẩn text "Hiển thị"
    },
    "& .MuiSelect-root": {
      minWidth: "60px", // Thu nhỏ dropdown
    },
  },
}));
export const StyleBoxActionDropDown = styled(SkyBox)(({ theme }) => ({
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

export const StyleActionCheckBox = styled(SkyBox)(({ theme }) => ({
  marginBottom: theme.spacing(1.5),
  paddingBottom: theme.spacing(0.5),
  "& .MuiFormControlLabel-root": {
    margin: 0,
    "& .MuiCheckbox-root": { 
      padding: theme.spacing(0.5) 
    },
    "& .MuiTypography-root": { 
      fontSize: "0.8125rem", 
      fontWeight: 500 
    },
  },
}));

export const StyleActionCellCheckBox = styled(SkyBox)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: theme.spacing(0.75),
  marginBottom: theme.spacing(1.5),
  "& .MuiFormControlLabel-root": {
    margin: 0,
    "& .MuiCheckbox-root": { 
      padding: theme.spacing(0.5) 
    },
    "& .MuiTypography-root": { 
      fontSize: "0.8125rem" 
    },
  },
}));

export const StyleActionButton = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "flex-end",
  gap: theme.spacing(1),
  paddingTop: theme.spacing(1.5),
  marginTop: theme.spacing(0.5),
}));

export const StyleActionButtonCancel = styled(Button)(({ theme }) => ({
  textTransform: "none",
  color: theme.palette.text.secondary,
  "&:hover": { 
    backgroundColor: theme.palette.action.hover 
  },
}));

export const StyleActionButtonApply = styled(Button)(({ theme }) => ({
  textTransform: "none",
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export const StyleActionPage = styled(SkyBox)({
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
});

export const StyleNavButton = styled(Button)(({ theme }) => ({
  textTransform: "none",
  color: theme.palette.text.secondary,
  fontSize: "0.875rem",
  fontWeight: 400,
  minWidth: "auto",
  padding: "4px 12px",
  "&:disabled": {
    color: theme.palette.text.disabled,
  },
  "&:hover": {
    backgroundColor: "transparent",
    color: theme.palette.primary.main,
  }
}));

export const StylePageButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== 'isActive',
})(({ theme, isActive }) => ({
  minWidth: '32px',
  height: '32px',
  borderRadius: '4px',
  backgroundColor: isActive ? theme.palette.primary.main : 'transparent',
  color: isActive ? 'white' : theme.palette.text.primary,
  '&:hover': {
    backgroundColor: isActive ? theme.palette.primary.dark : theme.palette.action.hover,
  },
}));

export const StylePageDots = styled('span')({
  padding: '0 4px',
});

export const StyledMenuIcon = styled(MenuIcon)({
	fontSize: "20px",
});

export const StyledListItemIcon = styled(ListItemIcon, {
  shouldForwardProp: (prop) => prop !== 'styledColor',
})(({ theme, styledColor }) => ({
  color:
    styledColor === 'error'
      ? theme.palette.error.main
      : styledColor === 'primary'
      ? theme.palette.primary.main
      : 'inherit',
}));

export const BoxML = styled(SkyBox)({
	 marginLeft: 'auto',
});


export const StyleBoxInput = styled(SkyBox)({
	// marginLeft:'15px',
  width:'500px',
});

export const StyledTableContentTolltip = styled('div', {
  shouldForwardProp: (prop) => prop !== 'styleJustifyContent',
})(({ styleJustifyContent }) => ({
  // Dùng absolute positioning để đảm bảo nội dung bị giới hạn trong ô
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  padding: '0 10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: styleJustifyContent === 'left' ? 'flex-start' : (styleJustifyContent === 'right' ? 'flex-end' : (styleJustifyContent || 'flex-start')),
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
  // Đảm bảo nội dung con cũng không overflow
  '& > *': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
    maxWidth: '100%',
    display: 'block',
  },
  '& div': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }
}))

export const StyledListItemIcon2 = styled(StyledListItemIcon)(({theme}) => ({
  minWidth: "32px",
  "& .MuiSvgIcon-root": {
    fontSize: "20px",
    color: theme.palette.text.primary,
  },
}))

export const StyledMenuIconButton = styled(ActionIconButton)(({ theme }) => ({
  color: theme.palette.primary.main || "inherit",
	padding: 'unset',
  minWidth: 'unset',
}));
export const TreeLoadingBox = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(1, 0),
  gap: theme.spacing(1),
}));
export const TreeLoadMoreRow = styled(TableRow)(({ theme }) => ({
  backgroundColor: theme.palette.action.hover,
  cursor: 'pointer',
  '&:hover': {
     backgroundColor: theme.palette.action.selected,
  }
}));
export const TreeLoadMoreBox = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(1),
}));
