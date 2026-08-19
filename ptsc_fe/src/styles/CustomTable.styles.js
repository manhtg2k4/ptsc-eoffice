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
  Toolbar,
  TextField,
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

export const StyledPaper = styled("div", {
  shouldForwardProp: (prop) =>
    ![
      "isInsideDialog",
      "autoHeight",
      "fixedHeight",
      "customMaxHeight",
      "styledMaxHeight",
      "disablePaperHeight",
      "noPadding",
      "fillHeight",
    ].includes(prop),
})(({ theme, isInsideDialog, autoHeight, fixedHeight, customMaxHeight, styledMaxHeight, disablePaperHeight ,noPadding, fillHeight}) => ({
  display: "flex",
  flexDirection: "column",
  flex: fillHeight ? 1 : undefined,
  minHeight: fillHeight ? 0 : undefined,
  // Khi disablePaperHeight = true, bỏ hẳn height để bố cục không bị ép
  height: fillHeight
    ? "100%"
    : disablePaperHeight
    ? "unset"
    : styledMaxHeight
    ? `calc(100vh - ${styledMaxHeight}px)`
    : fixedHeight
    ? (customMaxHeight ? `calc(100vh - ${customMaxHeight - 60}px)` : "calc(100vh - 360px)")
    : autoHeight
    ? "auto"
    : isInsideDialog
    ? "auto"
    : "calc(100vh - 130px)",
  overflow: "visible",
  [theme.breakpoints.down("md")]: {
    overflow: "visible", // Cho phép filter dropdown hiện ra ngoài
  },
  padding: noPadding ? 0 : 8,
  background:
    theme.palette.mode === "light"
      ? theme.palette.background.paper
      : "#0f172a",
  borderRadius: 10,

  [theme.breakpoints.down("lg")]: {
    height: fillHeight
      ? "100%"
      : disablePaperHeight
      ? "unset"
      : styledMaxHeight
      ? `calc(100vh - ${styledMaxHeight}px)`
      : fixedHeight
      ? (customMaxHeight ? `calc(100vh - ${customMaxHeight - 50}px)` : "calc(100vh - 350px)")
      : autoHeight
      ? "auto"
      : isInsideDialog
      ? "auto"
      : "calc(100vh - 90px)",
  },
  [theme.breakpoints.down("md")]: {
    height: fillHeight
      ? "100%"
      : disablePaperHeight
      ? "unset"
      : styledMaxHeight
      ? `calc(100vh - ${styledMaxHeight}px)`
      : fixedHeight
      ? (customMaxHeight ? `calc(100vh - ${customMaxHeight - 40}px)` : "calc(100vh - 340px)")
      : autoHeight
      ? "auto"
      : isInsideDialog
      ? "auto"
      : "calc(100vh - 80px)",
    padding: 4, // ✅ Giảm padding
  },
  [theme.breakpoints.down("sm")]: {
    height: fillHeight
      ? "100%"
      : disablePaperHeight
      ? "unset"
      : styledMaxHeight
      ? `calc(100vh - ${styledMaxHeight}px)`
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

export const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: theme.spacing(1),
  padding: "0px !important",
  minHeight: "unset !important",
  position: "relative",
  marginBottom: '8px',
  // zIndex: 1205,
  // isolation: "isolate",
  // overflow: "visible",
  width: "100%",
  [theme.breakpoints.down("md")]: {
    margin: '10px 0',
    gap: theme.spacing(1.5),
  },
}));

export const StyledToolbarList = styled(Toolbar)(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: theme.spacing(1),
  padding: "23px 0 15px 0!important",
  minHeight: "unset !important",
  position: "relative",
  marginBottom: '8px',
  // zIndex: 1205,
  // isolation: "isolate",
  // overflow: "visible",
  width: "100%",
  [theme.breakpoints.down("md")]: {
    margin: '10px 0',
    gap: theme.spacing(1.5),
  },
}));

export const StyledToolbarkanba = styled(Toolbar)(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: theme.spacing(1),
  padding: "30px 0 15px 0!important",
  minHeight: "unset !important",
  position: "relative",
  // zIndex: 1205,
  // isolation: "isolate",
  // overflow: "visible",
  width: "100%",
  [theme.breakpoints.down("md")]: {
    margin: '10px 0',
    gap: theme.spacing(1.5),
  },
}));

export const StyledToolbarGantt = styled(Toolbar)(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: theme.spacing(1),
  padding: "30px 16px 15px 16px !important",
  minHeight: "unset !important",
  position: "relative",
  width: "100%",
  boxSizing: "border-box",
  [theme.breakpoints.down("md")]: {
    margin: '10px 0',
    gap: theme.spacing(1.5),
  },
}));

export const StyledToolbarLoadmore = styled(StyledToolbar, {
  shouldForwardProp: (prop) => prop !== "pdBottom",
})(({ theme, pdBottom }) => ({
  marginBottom: pdBottom ? theme.spacing(pdBottom) : 0
}));

export const SearchContainer = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "noPaddingLeft",
})(({ theme, noPaddingLeft }) => ({
  display: "flex",
  // flexGrow: 1, // Cho phép container co giãn
  alignItems: "center",
  position: "relative",
  backgroundColor: "#FFFFFF",
  border: `1px solid ${theme.palette.divider}`,
  padding: 0, // XÓA HOÀN TOÀN
  borderRadius: "10px",
  overflow: "visible",
  paddingLeft: noPaddingLeft ? 0 : 10,
  [theme.breakpoints.down("md")]: {
    width: "100%",
    marginBottom: theme.spacing(1),
  },
}));

export const SearchContainerLoadmoreTree = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "noPaddingLeft" && prop !== "useUnifiedSearch",
})(({ theme, noPaddingLeft, useUnifiedSearch }) => ({
  display: "flex",
  // flexGrow: 1, // Cho phép container co giãn
  alignItems: "center",
  position: "relative",
  backgroundColor: "#FFFFFF",
  padding: 0, // XÓA HOÀN TOÀN
  // borderRadius: theme.shape.borderRadius,
  paddingLeft: noPaddingLeft ? 0 : 10,
  border: useUnifiedSearch ? `1px solid ${theme.palette.divider}` : "none",
  borderRadius: useUnifiedSearch ? 12 : theme.shape.borderRadius,
  minHeight: useUnifiedSearch ? 40 : "auto",
  overflow: useUnifiedSearch ? "visible" : "unset",
  [theme.breakpoints.down("md")]: {
    width: "100%",
    marginBottom: theme.spacing(1),
  },
}));

export const SearchAdornmentContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
  paddingRight: theme.spacing(0.5),
}));

export const SearchFilterPopupAnchor = styled(SkyBox)({
  position: "relative",
});

export const SearchLeftFilterTrigger = styled("button")(({ theme }) => ({
  height: "100%",
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.75),
  padding: theme.spacing(0, 1.5),
  border: "none",
  borderRight: `1px solid ${theme.palette.divider}`,
  backgroundColor: "transparent",
  color: theme.palette.text.primary,
  cursor: "pointer",
  whiteSpace: "nowrap",
  fontWeight: 600,
  fontSize: "0.875rem",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
  "& .MuiSvgIcon-root": {
    fontSize: 18,
  },
}));

export const SearchClearButton = styled("button")(({ theme }) => ({
  width: 24,
  height: 24,
  borderRadius: "50%",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  backgroundColor: "transparent",
  color: theme.palette.text.secondary,
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
  "& .MuiSvgIcon-root": {
    fontSize: 16,
  },
}));

export const SearchTuneButton = styled("button")(({ theme }) => ({
  width: 30,
  height: 30,
  borderRadius: 10,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: "#FFFFFF",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

// === UNIFIED SEARCH BAR (matching RoomScheduleCalendar UI) ===
export const UnifiedSearchButton = styled(Button)(({ theme }) => ({
  height: 40,
  width: 40,
  minWidth: "40px !important",
  padding: 0,
  backgroundColor: theme.palette.primary.main,
  color: "#fff",
  borderRadius: "12px",
  boxShadow: "none",
  flexShrink: 0,
  "& svg": {
    fontSize: "20px",
  },
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
    boxShadow: "none",
  },
}));

export const SearchBarWrapper = styled(SkyBox)(({ $isTreeSearch }) => ({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
  ...($isTreeSearch && {
    width: "100%",
  }),
}));

export const SearchBarWrapperLoadmore = styled(SearchBarWrapper)(({ theme }) => ({
  marginBottom: theme.spacing(4.375)
}));

export const UnifiedSearchGroup = styled(SkyBox)(({ theme, $isTreeSearch }) => ({
  display: "flex",
  alignItems: "center",
  backgroundColor:
    theme.palette.mode === "light" ? "#fff" : theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: "12px",
  height: "40px",
  flexGrow: 1,
  minWidth: 280,
  maxWidth: 600,
  overflow: "visible",
  transition: "all 0.2s ease-in-out",
  "&:focus-within": {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 1px ${theme.palette.primary.main}`,
  },
  [theme.breakpoints.down("sm")]: {
    minWidth: "unset",
    maxWidth: "100%",
  },
  ...($isTreeSearch && {
    minWidth: "0px !important",
    width: "100% !important",
    maxWidth: "none !important",
  }),
}));

export const FilterTriggerBox = styled(SkyBox)({
  position: "relative",
  display: "flex",
  alignItems: "center",
  height: "100%",
});

export const FilterTrigger = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  cursor: "pointer",
  padding: "0 16px",
  borderRight: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.primary,
  height: "100%",
  flexShrink: 0,
  borderTopLeftRadius: "inherit",
  borderBottomLeftRadius: "inherit",
  "& span": {
    fontSize: "14px",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  "& svg": {
    fontSize: "20px",
    color:
      theme.palette.mode === "light"
        ? "#31383F"
        : theme.palette.text.secondary,
  },
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const FilterDropdownContainer = styled(SkyBox)(({ theme }) => ({
  position: "absolute",
  top: "45px",
  left: "0",
  background: theme.palette.background.paper,
  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
  borderRadius: "16px",
  padding: "24px",
  zIndex: 1400,
  minWidth: 320,
  width: "max-content",
  border: `1px solid ${theme.palette.divider}`,
  "@media (max-width: 768px)": {
    width: "calc(100vw - 30px)",
    left: "-15px",
  },
}));

export const TuneTriggerContainer = styled(SkyBox)({
  position: "relative",
  display: "flex",
  alignItems: "center",
  marginRight: "4px",
});

export const TuneIconBox = styled(SkyBox)(({ theme }) => ({
  width: 32,
  height: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor:
    theme.palette.mode === "light" ? "#fff" : theme.palette.background.paper,
  border: `1px solid ${
    theme.palette.mode === "light" ? "#DDE0E4" : theme.palette.divider
  }`,
  borderRadius: "10px",
  cursor: "pointer",
  transition: "all 0.2s ease-in-out",
  "&:hover": {
    backgroundColor:
      theme.palette.mode === "light" ? "#F8F9FA" : theme.palette.action.hover,
    borderColor: theme.palette.primary.main,
  },
  "& svg": {
    fontSize: "18px",
    color:
      theme.palette.mode === "light" ? "#161A1D" : theme.palette.text.primary,
  },
}));

export const ClearIconButton = styled("button")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 26,
  height: 26,
  borderRadius: "50%",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  padding: 0,
  color: theme.palette.text.secondary,
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
    color: theme.palette.text.primary,
  },
  "& svg": {
    fontSize: "17px",
  },
}));

export const SearchAdornmentStack = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: theme.spacing(0.5),
  paddingRight: "4px",
}));

export const SearchAdornmentStackLoadmore = styled(SearchAdornmentStack)(() => ({
	justifyContent: "flex-end",
	width: "fit-content !important",
}));



export const UnifiedSearchButtonLoadmore = styled(UnifiedSearchButton)(({ theme }) => ({
	backgroundColor: theme.palette.primary.main,
}));

export const UnifiedInput = styled(TextField)(({ theme }) => ({
  flexGrow: 1,
  height: "100%",
  overflow: "visible",
  "& .MuiOutlinedInput-root": {
    height: "100%",
    padding: 0,
    overflow: "visible",
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
  },
}));

export const ToolbarContent = styled(SkyBox)(() => ({
  display: "contents",
}));

// Removed duplicate ReportSelectBox from here

export const ActionsContainer = styled(SkyBox, {
  shouldForwardProp: (prop) =>
    !["styleJustifyContent", "$isModern", "$forceFullWidth"].includes(prop),
})(({ theme, styleJustifyContent, $isModern, $forceFullWidth }) => ({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: styleJustifyContent || "flex-end",
  alignItems: "center",
  gap: theme.spacing(1),
  paddingTop: 0,
  marginLeft: ($isModern || $forceFullWidth) ? 0 : "auto", // Pushes to the right
  width: ($isModern || $forceFullWidth) ? "100%" : "auto",
  [theme.breakpoints.down("md")]: {
    justifyContent: "flex-start",
    marginLeft: 0, // Reset on mobile
    width: "100%",
  },
}));
export const ActionsContainerFooter = styled(SkyBox)({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 2,
  paddingTop: 0, // XÓA HOÀN TOÀN
  paddingBottom: 0, // XÓA HOÀN TOÀN
});

export const PaginationWrapper = styled(SkyBox)(({ theme, $footerGap }) => ({
  display: "flex",
  justifyContent: "flex-end",
  width: "100%",
  flexShrink: 0,
  marginTop: "auto",
  marginBottom: 0,
  paddingTop: $footerGap ? `${$footerGap}px` : 0,
  paddingBottom: theme.spacing(0.5),
  
  // ✅ Responsive cho tablet
  [theme.breakpoints.down("md")]: {
    marginBottom: 0,
    padding: "0 8px",
  },
  
  // ✅ Responsive cho mobile
  [theme.breakpoints.down("sm")]: {
    marginBottom: 0, // Bỏ margin để giảm khoảng trắng
    marginTop: 8, // Chỉ cần margin trên nhỏ
    padding: "0 4px 2px",
    justifyContent: "center", // Căn giữa trên mobile
  },
}));

export const PaginationContainerStyled = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  padding: theme.spacing(0.75, 1.5),
  minHeight: 44,
  boxSizing: "border-box",
  flexShrink: 0,
  // minHeight: "60px",
  backgroundColor: "#FFFFFF",
  borderRadius: theme.spacing(1),
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
}));export const TopActionsContainer = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "styleJustifyContent",
})(({ styleJustifyContent }) => ({
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

export const FilterBoxLoadmore = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "alignRight",
})(({ theme, alignRight }) => ({
  position: "absolute",
  top: "108%",
  right: alignRight ? 0 : "auto",
  display: "flex",
  flexDirection: "column",
  background: theme.palette.background.paper,
  boxShadow: "rgba(0, 0, 0, 0.1) 0px 4px 10px",
  borderRadius: 5,
  padding: 10,
  zIndex: 1400,
  minWidth: "380px",
  maxWidth: "90vw",
  maxHeight: "500px",
  overflowY: "auto",
  "& .MuiFormControlLabel-root": {
    whiteSpace: "nowrap",
    margin: 0,
  },
  [theme.breakpoints.down("sm")]: {
    left: 0,
    minWidth: "300px",
  },
}));

// export const FilterBox = styled(SkyBox, {
//   shouldForwardProp: (prop) => !["alignRight", "isStatic"].includes(prop),
// })(({ theme, alignRight = true, isStatic = false }) => ({
//   position: isStatic ? "static" : "absolute",
//   top: "calc(100% + 8px)",
//   right: alignRight ? 0 : "auto",
//   left: alignRight ? "auto" : 0,
//   display: "flex",
//   flexDirection: "column",
//   background: theme.palette.background.paper,
//   boxShadow: "rgba(0, 0, 0, 0.1) 0px 4px 10px",
//   borderRadius: 5,
//   padding: 10,
//   zIndex: 1500,
//   minWidth: "380px", // ✅ Cố định chiều rộng tối thiểu
//   maxWidth: "90vw",
//   maxHeight: "500px", // ✅ Giới hạn chiều cao
//   overflowY: "auto", // ✅ Thêm scroll khi quá nhiều item
//   "& .MuiFormControlLabel-root": {
//     whiteSpace: "nowrap", // ⭐ Không cho xuống dòng
//     margin: 0,
//   },
//   [theme.breakpoints.down("sm")]: {
//     right: alignRight ? 0 : "auto",
//     left: alignRight ? "auto" : 0,
//     minWidth: "300px",
//   },
// }));

export const FilterBox = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "alignRight",
})(({ theme, alignRight = false }) => ({
  position: "absolute",
  top: "calc(100% + 8px)",
  right: alignRight ? 0 : "auto",
  left: alignRight ? "auto" : 0,
  display: "flex",
  flexDirection: "column",
  background: theme.palette.background.paper,
  boxShadow: "rgba(0, 0, 0, 0.1) 0px 4px 10px",
  borderRadius: 5,
  padding: 10,
  zIndex: 1300,
  minWidth: "380px", // ✅ Cố định chiều rộng tối thiểu
  maxWidth: "90vw",
  maxHeight: "500px", // ✅ Giới hạn chiều cao
  overflowY: "auto", // ✅ Thêm scroll khi quá nhiều item
  "& .MuiFormControlLabel-root": {
    whiteSpace: "nowrap", // ⭐ Không cho xuống dòng
    margin: 0,
  },
  [theme.breakpoints.down("sm")]: {
    right: alignRight ? 0 : "auto",
    left: alignRight ? "auto" : 0,
    minWidth: "300px",
  },
}));

export const FilterBoxFixed = styled(SkyBox, {
  shouldForwardProp: (prop) => !["popupTop", "popupRight"].includes(prop),
})(({ theme, popupTop, popupRight }) => ({
  position: "fixed",
  top: popupTop ?? 0,
  right: popupRight ?? 0,
  display: "flex",
  flexDirection: "column",
  background: theme.palette.background.paper,
  boxShadow: "rgba(0, 0, 0, 0.1) 0px 4px 10px",
  borderRadius: 5,
  padding: 10,
  zIndex: 1400,
  minWidth: "380px",
  maxWidth: "calc(100vw - 20px)",
  maxHeight: "500px",
  overflowY: "auto",
  "& .MuiFormControlLabel-root": {
    whiteSpace: "nowrap",
    margin: 0,
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

export const StyledSearchField = styled(CustomInputBase, {
  shouldForwardProp: (prop) => prop !== "outlined",
})(({ theme, outlined }) => ({
  flexGrow: 1, 
  minWidth: 200, 
  maxWidth: 450, 

  "& .MuiOutlinedInput-root": {
    borderRadius: `${theme.shape.borderRadius}px 0 0 ${theme.shape.borderRadius}px`,
    "& .MuiOutlinedInput-notchedOutline": {
      border: outlined ? `1px solid ${theme.palette.divider}` : "none",
      borderRight: outlined ? "none" : undefined,
    },
    "& .MuiInputBase-input": {
      color: `${theme.palette.text.primary} !important`,
      "&::placeholder": {
        color: theme.palette.mode === "dark" ? "#ffffff" : "#637381",
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
    border: outlined ? `1px solid ${theme.palette.divider}` : "none",
    borderRight: outlined ? "none" : undefined,
  },
  "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
    border: outlined ? `1px solid ${theme.palette.text.secondary}` : "none",
    borderRight: outlined ? "none" : undefined,
  },
  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
    border: outlined ? `1px solid ${theme.palette.primary.main}` : "none",
    borderRight: outlined ? "none" : undefined,
  },
  // Responsive trên màn hình nhỏ
  [theme.breakpoints.down("md")]: {
    minWidth: "calc(100% - 160px)", // Chiếm gần hết chiều rộng, trừ đi không gian cho các nút
    maxWidth: "100%",
    flexBasis: "calc(100% - 160px)", // Đảm bảo nó chiếm không gian cần thiết
  },
}));

export const StyledSearchFieldLoadmore = styled(CustomInputBase, {
  shouldForwardProp: (prop) => prop !== "fullRadius" && prop !== "borderless",
})(({ theme, fullRadius, borderless }) => ({
  flexGrow: 1, 
  minWidth: 200, 
  maxWidth: 450, 

  "& .MuiOutlinedInput-root": {
    borderRadius: fullRadius
      ? `${theme.shape.borderRadius}px`
      : `${theme.shape.borderRadius}px 0 0 ${theme.shape.borderRadius}px`,
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: borderless ? "transparent" : theme.palette.divider,
      border: borderless ? "none" : undefined,
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
    borderRadius: fullRadius
      ? `${theme.shape.borderRadius}px`
      : `${theme.shape.borderRadius}px 0 0 ${theme.shape.borderRadius}px`,
    border: borderless ? "none" : undefined,
  },
  // Responsive trên màn hình nhỏ
  [theme.breakpoints.down("md")]: {
    minWidth: "calc(100% - 160px)", // Chiếm gần hết chiều rộng, trừ đi không gian cho các nút
    maxWidth: "100%",
    flexBasis: "calc(100% - 160px)", // Đảm bảo nó chiếm không gian cần thiết
  },
}));

export const StyledTableHead = styled(TableHead, {
  shouldForwardProp: (prop) => prop !== "styleColor",
})(({ theme, styleColor }) => {
  const headerBorderWidth = theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px";
  const headerBorderColor = theme.palette.mode === "dark" ? theme.palette.divider : "#dee2e6";
  const headerBg = theme.palette.mode === "dark" ? "#1e293b" : "#f9fafb";
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
      backgroundColor: headerBg,
      position: "sticky",
      top: 0,
      zIndex: 1002,
      boxShadow: `inset 0 ${headerBorderWidth} 0 ${headerBorderColor}, inset 0 -${headerBorderWidth} 0 ${headerBorderColor}`,
    },
    borderBottom: headerBorder,
    color: styleColor || theme.palette.text.primary,
  };
});

export const StyledTableContainer = styled(TableContainer, {
  shouldForwardProp: (prop) =>
    !["isMaxHeight", "customMaxHeight", "autoHeight", "disablePaperHeight"].includes(prop),
})(
  ({ theme, isMaxHeight, customMaxHeight, autoHeight, disablePaperHeight }) => ({
    flex: 1,
    overflowY: (autoHeight || disablePaperHeight) ? "visible" : "auto",
    overflowX: (autoHeight || disablePaperHeight) ? "visible" : "auto",
    position: "relative",
    width: "100%",
    minHeight: 0,
    backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : theme.palette.background.paper,
    maxHeight: customMaxHeight 
      ? `calc(100vh - ${customMaxHeight}px)` 
      : (isMaxHeight ? "calc(100vh - 420px)" : "unset"),
  })
);
export const StyleTableContainer = styled(TableContainer, {
  shouldForwardProp: (prop) =>
    !["isMaxHeight", "customMaxHeight", "autoHeight", "disablePaperHeight"].includes(prop),
})(
  ({ theme, isMaxHeight, customMaxHeight, autoHeight, disablePaperHeight }) => ({
    flex: 1,
    overflowY: (autoHeight || disablePaperHeight) ? "visible" : "auto",
    overflowX: "auto",
    position: "relative",
    width: "100%",
    minHeight: 0,
    backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : theme.palette.background.paper,
    maxHeight: customMaxHeight 
      ? `calc(100vh - ${customMaxHeight}px)` 
      : (isMaxHeight ? "calc(100vh - 420px)" : "unset"),
  })
);

export const StyledTable = styled(Table, {
  shouldForwardProp: (prop) =>
    !["styleBorderCollapse", "styleBorder", "styleTableLayout", "styleMinWidth"].includes(prop),
})(({ styleBorderCollapse, styleBorder, styleTableLayout, styleMinWidth }) => ({
  borderCollapse: styleBorderCollapse || "separate !important",
  tableLayout: styleTableLayout || "auto",
  minWidth: styleMinWidth || "unset !important",
  width: "100%",
  border: styleBorder || null,
}));

export const StyledTableBorder = styled(Table, {
  shouldForwardProp: (prop) =>
    !["styleBorderCollapse", "styleBorder", "styleTableLayout"].includes(prop),
})(
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
      backgroundColor: `${
        theme.palette.mode === "dark"
          ? "rgba(148, 163, 184, 0.14)"
          : theme.palette.action.hover
      } !important`,
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
              backgroundColor: `${
                theme.palette.mode === "dark"
                  ? "rgba(148, 163, 184, 0.14)"
                  : theme.palette.action.hover
              } !important`,
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
})(({ theme, alignCenter, styleWidth, index, isAction }) => ({
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
      backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#f9fafb",
      borderTop: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
        theme.palette.mode === "dark" ? theme.palette.divider : "#dee2e6"
      }`,
      borderBottom: `1px solid ${theme.palette.mode === "dark" ? theme.palette.divider : "#dee2e6"}`,
      boxShadow: `inset 0 ${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} 0 ${
        theme.palette.mode === "dark" ? theme.palette.divider : "#dee2e6"
      }, inset 0 -${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} 0 ${
        theme.palette.mode === "dark" ? theme.palette.divider : "#dee2e6"
      }`,
      zIndex: 1002,
      fontWeight: "bold",
      padding: "12px 10px",
      lineHeight: "28px",
      ...(isAction && {
        textAlign: "center",
      }),
      "&:last-child": {
        position: "sticky",
        right: 0,
        zIndex: 1002,
        backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#f9fafb",
      },
    },
  "tbody &": {
    backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#FFFFFF",
  },
  // Sử dụng nth-of-type để đảm bảo xen kẽ kể cả khi không có index - ĐÃ XÓA
  "tbody tr:nth-of-type(even) &": {
    backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#FFFFFF",
  },
  // Giữ logic cũ nếu có index để ghi đè chính xác
  ...(typeof index !== "undefined" && {
    "tbody &": {
      backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#FFFFFF",
    },
  }),
  position: "relative",
  zIndex: 2,

  "&:last-child": {
    width: 100, // Giữ nguyên chiều rộng
    minWidth: 100,
    maxWidth:140,
    overflow: "hidden",
    textOverflow: "ellipsis",
    textAlign: "center",
    position: isAction ? "sticky" : "static",
    right: 0,
    zIndex: 20, // Giữ nguyên zIndex
    // Đặt màu nền rõ ràng cho ô hành động cố định để đảm bảo nó luôn đục
    backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",
    "tr:nth-of-type(even) &": {
       backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",
    },
    ...(typeof index !== "undefined" && {
      backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",
    }),
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
  // Đồng bộ màu nền khi hàng được hover (giống TreeTableWithIconCell)
  "tbody tr:hover > &": {
    backgroundColor: `${
      theme.palette.mode === "dark"
        ? "rgba(148, 163, 184, 0.14)"
        : theme.palette.action.hover
    } !important`,
    "&:last-child": {
      backgroundColor: `${
        theme.palette.mode === "dark"
          ? "rgba(148, 163, 184, 0.14)"
          : theme.palette.action.hover
      } !important`,
    },
  },

  // Đồng bộ với trạng thái selected của row (nếu có)
  "tbody tr.Mui-selected > &": {
    backgroundColor: "inherit",
    "&:last-child": {
      backgroundColor: "inherit",
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
//     padding: stylePadding || `0px 10px`,
//     verticalAlign: styleVerticalAlign || null,
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
      "stylePaddingLeft",
      "styleleWordWrap",
      "styleOverflowWrap",
      "styleBorderCollapse",
      "styleWidthCell",
      "styleTextAlign",
      "styleTransform",
      "styleBoxShadow",
      "styleBgColor",
      "styleLeft",
      "styleTop",
      "styleHeight",
      "styleVerticalAlign",
			"styleLeftColumnFirst"
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
  stylePaddingLeft,
  styleleWordWrap,
  styleOverflowWrap,
  styleBorderCollapse,
  styleWidthCell,
  styleTextAlign,
  styleTransform,
  styleBoxShadow,
  styleBgColor,
  styleLeft,
  styleTop,
  styleHeight,
  styleVerticalAlign,
	styleLeftColumnFirst
}) => {
  // -----------------------
  // AUTO px → rem converter
  // -----------------------
  const toRem = (value) => {
    if (!value) return undefined;

    // Nếu là số (ví dụ 120) → assume px
    if (typeof value === "number") return `${value / 16}rem`;

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (/^(calc|max|min|clamp)\(/.test(trimmed) || /(%|rem|em|vw|vh)$/.test(trimmed)) {
        return trimmed;
      }

      if (trimmed.includes("px")) {
        const num = parseFloat(trimmed);
        return `${num / 16}rem`;
      }

      const num = parseFloat(trimmed);
      return isNaN(num) ? trimmed : `${num / 16}rem`;
    }

    return value;
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

    "thead &&": {
      borderTop: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
        theme.palette.mode === "dark" ? theme.palette.divider : "#dee2e6"
      }`,
      borderBottom: `1px solid ${theme.palette.mode === "dark" ? theme.palette.divider : "#dee2e6"}`,
      backgroundColor: styleBgColor || (theme.palette.mode === "dark" ? "#1e293b" : "#f9fafb"),
      boxShadow: `inset 0 ${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} 0 ${
        theme.palette.mode === "dark" ? theme.palette.divider : "#dee2e6"
      }, inset 0 -${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} 0 ${
        theme.palette.mode === "dark" ? theme.palette.divider : "#dee2e6"
      }`,
      zIndex: styleZIndex || 1002,
      fontWeight: "bold",
      padding: "12px 10px",
      lineHeight: "28px",
    },

    overflow: styleOverflow || "hidden",
    textOverflow: styleTextOverflow || "ellipsis",
    backgroundColor: styleBgColor || (theme.palette.mode === "dark" ? "#0f172a" : "#FFFFFF"),
    transform: styleTransform || null,
    willChange: styleTransform ? "transform" : null,
    boxShadow: styleBoxShadow || null,
    padding: stylePadding || `0px 10px`,
    verticalAlign: styleVerticalAlign || null,
    ...(stylePaddingLeft && { paddingLeft: `${stylePaddingLeft} !important` }),
    height: styleHeight || theme.layout?.dynamicTable?.rowHeight || "55px",
    "tbody tr:hover > &": {
      backgroundColor: `${
        theme.palette.mode === "dark"
          ? "rgba(148, 163, 184, 0.14)"
          : theme.palette.action.hover
      } !important`,
    },
    
    // Ensure ellipsis works properly for all cell content
    "& > *": {
      maxWidth: "100%",
      minWidth: 0,
    },

    position: stylePosition || "relative",
    top: styleTop || null,
    zIndex: styleZIndex || null,
    left: styleLeftColumnFirst ? styleLeftColumnFirst : (styleLeft !== undefined ? (styleLeft === 0 || styleLeft === "0" ? "0px" : toRem(styleLeft)) : null),
    // left: "-1px" ,
    cursor: styleCursor || null,
    opacity: styleOpacity || null,
    wordWrap: styleleWordWrap || null,
    overflowWrap: styleOverflowWrap || null,
    borderCollapse: styleBorderCollapse || null,
  };
});

export const StyleSkyTableCell = styled(StyledTableCell)(() => ({
  textAlign: "center",
}));

export const StyledTableCellLoadMore = styled(StyledTableCell)(({theme}) => ({
	padding: theme.spacing(0),
	borderLeft: "none",
	borderRight: "none",
	// Không highlight wrapper cell khi hover vùng trắng bên trong virtual list
	"tbody tr:hover &": {
		backgroundColor: "inherit !important",
	},
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
export const ActionIconButton = styled(IconButton, {
  shouldForwardProp: (prop) => !["colorType", "iconSize"].includes(prop),
})(({ theme, colorType, iconSize = "medium" }) => {
  const resolvedColor =
    colorType === "error"
      ? theme.palette.error.main
      : colorType === "view"
      ? theme.palette.text.secondary
      : colorType === "edit"
      ? theme.palette.primary.main
      : theme.palette.actionIcon?.default || theme.palette.primary.main;

  const resolvedIconSize = iconSize === "small" ? "1.1rem" : "1.3rem";

  return {
    color: resolvedColor,
    padding: iconSize === "small" ? 4 : 5,
    minWidth: 0,
    "& .MuiSvgIcon-root": {
      fontSize: resolvedIconSize,
    },

    // Dòng này là "sát thủ" diệt 3 chấm thừa
    "&& .MuiCircularProgress-root": { display: "none" },
  };
});

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

export const CheckboxBodyCell = styled(TableCell, {
  shouldForwardProp: (prop) => prop !== "index",
})(({ theme, index }) => ({
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

export const STTBodyCell = styled(TableCell, {
  shouldForwardProp: (prop) => prop !== "index",
})(({ theme, index }) => ({
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

export const StyledButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== "iscolor",
})(({ iscolor }) => ({
  borderRadius: "10px",
  height: 40,
  width: 40,
  minWidth: "40px !important",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 0,
  // Mặc định màu primary
  backgroundColor: "#FFFFFF",
  color: iscolor || "rgb(100, 116, 139)",
  border: "1px solid rgb(100, 116, 139)",
  boxShadow: "none",
  "& .MuiSvgIcon-root": {
    color: iscolor || "rgb(100, 116, 139)",
    fontSize: "1.2rem",
  },
  "&:hover": {
    backgroundColor: "#F8FAFC",
    borderColor: "rgb(100, 116, 139)",
    boxShadow: "none",
  },
  "&.Mui-disabled": {
    backgroundColor: "#FFFFFF",
    color: "rgba(100, 116, 139, 0.35)",
    borderColor: "rgba(100, 116, 139, 0.35)",
    "& .MuiSvgIcon-root": {
      color: "rgba(100, 116, 139, 0.35)",
    },
  },
}));

export const AddButton = styled(StyledButton, {
  shouldForwardProp: (prop) => prop !== "$hasLabel",
})(({ theme, $hasLabel }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  "& .MuiSvgIcon-root": {
    color: theme.palette.primary.contrastText,
  },
  "&:hover": { backgroundColor: theme.palette.primary.dark },
  ...($hasLabel && {
    width: "auto",
    minWidth: "max-content !important",
    paddingLeft: `${theme.spacing(1.25)} !important`,
    paddingRight: `${theme.spacing(1.25)} !important`,
    gap: theme.spacing(0.75),
    borderRadius: "6px",
  }),
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

export const DeleteActionButton = styled(StyledButton)(({ theme }) => ({
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

export const SquareIconActionButton = styled(StyledButton)(() => ({
  minWidth: "40px",
  width: "40px",
  height: "40px",
  padding: 0,
  borderRadius: "8px",
}));

export const StyledSearchButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== "iscolor",
})(({ theme, iscolor }) => ({
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
  borderRadius: theme.shape.borderRadius,
  "&:hover": {
    backgroundColor:
      iscolor === "warning"
        ? theme.palette.warning.dark
        : theme.palette.primary.dark,
  },
  // marginTop: 8,
}));

export const StyledFilterButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== "outlined",
})(() => ({
  height: 40,
  width: 40,
  minWidth: "40px !important",
    color: "rgb(100, 116, 139)",
  backgroundColor: "#FFFFFF",
  borderRadius: "10px",
  border: "1px solid rgb(100, 116, 139)",
  boxShadow: "none",
  "&:hover": {
    borderColor: "rgb(100, 116, 139)",
    backgroundColor: "#F8FAFC",
    boxShadow: "none",
  },
  "& .MuiSvgIcon-root": {
    color: "rgb(100, 116, 139)",
  },
}));

export const StyledFilterButtonNoBorder = styled(Button, {
  shouldForwardProp: (prop) => prop !== "outlined",
})(() => ({
  height: 40,
  width: 40,
  minWidth: "40px !important",
  color: "rgb(100, 116, 139)",
  backgroundColor: "transparent",
  borderRadius: "10px",
  border: "none",
  boxShadow: "none",
  "&:hover": {
    backgroundColor: "#F8FAFC",
    boxShadow: "none",
  },
  "& .MuiSvgIcon-root": {
    color: "rgb(100, 116, 139)",
  },
}));
export const ActionsBox = styled(SkyBox)(() => ({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  flexShrink: 0,
  marginLeft: "auto",
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

export const RowsPerPageSelect = styled(Select)(({ theme }) => ({
  height: "32px",
  borderRadius: "8px",
  backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff',
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.mode === 'dark' ? '#334155' : '#E4E5E7',
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.mode === 'dark' ? '#475569' : '#D2D3D6',
  },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: '#2364B0',
  },
  "& .MuiSelect-select": {
    paddingTop: "0px",
    paddingBottom: "0px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    fontSize: "0.8125rem",
    color: theme.palette.mode === 'dark' ? '#cbd5e1' : '#5E646A',
  },
}));

export const StyleFormControl = styled(FormControl)({
  minWidth: 200,
});

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

export const DeleteStyledButton = styled(StyledButton)(({ theme }) => ({
  backgroundColor: "#FFFFFF",
  color: theme.palette.error.main,
  border: `1px solid ${theme.palette.error.main}`,
  "& .MuiSvgIcon-root": {
    color: theme.palette.error.main,
  },
  "&:hover": {
    backgroundColor: "#FFF5F5",
    borderColor: theme.palette.error.main,
  },
  "&.Mui-disabled": {
    backgroundColor: "#FFFFFF",
    color: theme.palette.error.light,
    borderColor: theme.palette.error.light,
    opacity: 0.5,
    "& .MuiSvgIcon-root": {
      color: theme.palette.error.light,
    },
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

export const StyledArrowUp = styled(ArrowDropUp, {
  shouldForwardProp: (prop) => prop !== "isActive",
})(({ theme, isActive }) => ({
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
export const ExportButton = styled(StyledButton)({
  backgroundColor: "#FFFFFF",
  border: "1px solid #5A6573",
  color: "#5A6573",
  "&:hover": {
    backgroundColor: "#F4F5F7",
    borderColor: "#5A6573",
    color: "#5A6573",
  },
});
export const ConfigButton = styled(AddButton)({});

export const DeleteSelectedButton = styled(StyledButton)(({ theme }) => ({
  color: theme.palette.error.main,
  backgroundColor: "#FFFFFF",
  border: `1px solid ${theme.palette.error.main}`,
  "& .MuiSvgIcon-root": {
    color: theme.palette.error.main,
  },
  "&:hover": {
    backgroundColor: "#FFF5F5",
    borderColor: theme.palette.error.main,
  },
  "&:disabled": {
    backgroundColor: "#FFFFFF",
    color: theme.palette.error.light,
    borderColor: theme.palette.error.light,
    opacity: 0.5,
    "& .MuiSvgIcon-root": {
      color: theme.palette.error.light,
    },
  },
}));

export const StyledArrowDown = styled(ArrowDropDown, {
  shouldForwardProp: (prop) => prop !== "isActive",
})(({ theme, isActive }) => ({
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
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
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
  gap: theme.spacing(1),
  marginLeft: theme.spacing(2),
  marginRight: theme.spacing(1.5),

   

  "& .MuiSelect-select": {
    paddingTop: "0 !important",
    paddingBottom: "0 !important",
    display: "flex",
    alignItems: "center",
  },
  "& .MuiInputBase-root": {
    minWidth: "76px !important",
    height: "36px",
  },

  // ✅ Responsive cho mobile
  [theme.breakpoints.down("sm")]: {
    marginLeft: theme.spacing(1),
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
  gap: '4px',
  alignItems: 'center',
});

export const ModernPaginationLayout = styled(SkyBox)(({ theme }) => ({
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: theme.spacing(2),
  [theme.breakpoints.down("lg")]: {
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
}));

export const ModernPaginationSummary = styled("span")(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: "0.875rem",
  [theme.breakpoints.down("lg")]: {
    width: "100%",
    textAlign: "right",
  },
}));

export const ModernPaginationControls = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const StylePageNavButton = styled(Button)(({ theme }) => ({
  minWidth: "auto",
  textTransform: "none",
  height: "36px",
  padding: "4px 10px",
  borderRadius: 8,
  color: theme.palette.text.secondary,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: "#FFFFFF",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
    borderColor: theme.palette.divider,
  },
  "&.Mui-disabled": {
    color: theme.palette.text.disabled,
    borderColor: theme.palette.divider,
  },
}));

export const StylePageButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== 'isActive',
})(({ theme, isActive }) => ({
  minWidth: '36px',
  height: '36px',
  fontSize: "0.8125rem",
  borderRadius: '8px',
  backgroundColor: isActive ? '#2364B0' : 'transparent',
  color: isActive ? '#ffffff' : (theme.palette.mode === 'dark' ? '#cbd5e1' : '#5E646A'),
  fontWeight: isActive ? 600 : 500,
  '&:hover': {
    backgroundColor: isActive ? '#1b4f8f' : (theme.palette.mode === 'dark' ? '#334155' : '#F4F5F7'),
  },
}));

export const StylePageDots = styled('span')(({ theme }) => ({
  padding: '0 8px',
  color: theme.palette.mode === 'dark' ? '#cbd5e1' : '#5E646A',
  fontSize: "0.8125rem",
  fontWeight: 500,
}));

export const StyledNavButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff',
  color: theme.palette.mode === 'dark' ? '#cbd5e1' : '#5E646A',
  border: `1px solid ${theme.palette.mode === 'dark' ? '#334155' : '#E4E5E7'}`,
  borderRadius: '8px',
  padding: '0 16px',
  height: '36px',
  minHeight: '36px',
  fontWeight: 500,
  fontSize: '0.8125rem',
  textTransform: 'none',
  minWidth: 'unset',
  lineHeight: 1.5,
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? '#334155' : '#F4F5F7',
    borderColor: theme.palette.mode === 'dark' ? '#475569' : '#D2D3D6',
  },
  '&.Mui-disabled': {
    backgroundColor: theme.palette.mode === 'dark' ? '#0f172a' : '#ffffff',
    color: theme.palette.mode === 'dark' ? '#475569' : '#C2C3C6',
    borderColor: theme.palette.mode === 'dark' ? '#1e293b' : '#E4E5E7',
    opacity: 0.5,
  },
}));

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
  width: '500px',
});

export const StyledTableContentTolltip = styled('div')(() => ({
  // Dùng absolute positioning để đảm bảo nội dung bị giới hạn trong ô
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  padding: '0 10px',
  display: 'flex',
  alignItems: 'center',
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

export const StyledListItemIcon2 = styled(StyledListItemIcon)(({ theme }) => ({
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

export const StyledLogSettingButton = styled(Button)(() => ({
  height: 40,
  width: 40,
  minWidth: "40px !important",
  backgroundColor: "#ffffff",
  color: "#6b727d",
  border: "1px solid #6b727d",
  borderRadius: "10px",
  boxShadow: "none",
  "&:hover": {
    backgroundColor: "#f9fafb",
    borderColor: "#5e646e",
    color: "#5e646e",
    boxShadow: "none",
  },
  "& .MuiSvgIcon-root": {
    color: "inherit",
  },
}));

export const StyledBoxBoderBuilder = styled(SkyBox)(() => ({
  position: "absolute",
  right: 0,
  top: 0,
  height: "100%",
  width: "5px",
  cursor: "col-resize",
  userSelect: "none",
}));
