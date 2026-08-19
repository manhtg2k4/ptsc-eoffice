import { styled, alpha } from "@mui/material/styles";
import { 
  SkyBox, 
  SkyIconButton, 
  SkyTableCell, 
  SkyPagination, 
  SkySelect, 
  SkyCheckbox 
} from "./SkyStyles";
import { 
  PopoverButton, 
  HeaderCellContainer, 
   StyledSearchButton, 
  StyledFilterButton, 
   
} from "./CustomTable.styles";
import {
  KeyboardArrowRight,
  KeyboardArrowDown,
  Flag,
} from "@mui/icons-material";
import CustomInputBase from "@components/CustomInput/CustomInputBase";


export const TreeTableCell = styled(SkyTableCell, {
  shouldForwardProp: (prop) => prop !== "$level",
})(({ theme, $level = 0 }) => ({
  // display: "flex",
  // alignItems: "center",
  backgroundColor: "inherit",
  // ✅ Sửa lỗi: Chỉ áp dụng border khi được bật trong theme, nếu không thì ẩn đi
  borderBottom: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
    theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
      ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
        theme.palette.divider
      : "transparent"
  }`,
  // ✅ Sửa lỗi: Hiển thị border-right đồng bộ với các ô khác trong bảng
  borderRight: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
    theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
      ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
        theme.palette.divider
      : "transparent"
  }`,
  // ✅ Thêm border-left cho ô đầu tiên để đồng bộ
  "&:first-of-type": {
    borderLeft: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor || theme.palette.divider : "transparent"}`,
  },
  position: "relative",
  padding: "0px 16px", // ✅ Sử dụng padding chung
  paddingLeft: `${$level * 30 + 20}px`, // ✅ Ghi đè padding-left để giữ cấu trúc tree

  // Đồng bộ màu nền khi hàng được hover
  "tbody tr:hover &": {
    backgroundColor: `${theme.palette.action.hover} !important`,
  },
}));

export const VerticalLine = styled("div", {
  shouldForwardProp: (prop) => prop !== "level",
})(({ theme, level = 0 }) => ({
  position: "absolute",
  left: `${level * 30 + 10}px`,
  top: 0,
  bottom: 0,
  pointerEvents: "none",

  width:
    theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px",
  // ✅ Sửa lỗi: Dùng màu text.secondary để đường kẻ đậm và dễ nhìn hơn
  borderLeft: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${theme.palette.text.secondary}`,
}));

export const HorizontalLine = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "level",
})(({ theme, level = 1 }) => ({
  position: "absolute",
  left: `${(level - 1) * 30 + 10}px`,
  top: "50%",
  transform: "translateY(-50%)",
  pointerEvents: "none",

  width: "20px",
  height:
    theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px",
  // ✅ Sửa lỗi: Dùng màu text.secondary để đường kẻ đậm và dễ nhìn hơn
  borderBottom: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${theme.palette.text.secondary}`,
}));

export const ToggleButton = styled(SkyIconButton)(({ theme }) => ({
  width: "22px",
  height: "22px",
  borderRadius: "1px",
  // border: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${theme.palette.divider}`,
  fontSize: "12px",
  // display: "flex",
  // alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: "2px",
  backgroundColor: "inherit", // ✅ Sửa: Kế thừa màu nền từ cha
  "& .MuiSvgIcon-root": {
    fontSize: "1.2rem",
    color: theme.palette.text.primary, // ✅ Sửa lỗi: Dùng màu text chính để icon đậm hơn
  },
  "&:hover": {
    backgroundColor: alpha(theme.palette.primary.main, 0.1), // Thêm hover effect riêng cho button
  },
}));

export const NodeName = styled("span")({
  marginLeft: "2px",
  // backgroundColor: "inherit", // ✅ Sửa: Kế thừa màu nền từ cha
  padding: "8px 4px",
  borderRadius: "4px",
  flexGrow: 1,
  cursor: "pointer",
  fontWeight: 600,
  color: "#323943",
});

export const PaginationContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "center",
  gap: theme.spacing(2),
  padding: "20px",
}));

export const PaginationInfo = styled(SkyBox)(({ theme }) => ({
  // display: "flex",
  // alignItems: "center",
  gap: theme.spacing(1),
}));

export const RowsPerPageContainer = styled(SkyBox)(({ theme }) => ({
  // display: "flex",
  // alignItems: "center",
  gap: theme.spacing(1),
}));

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
  height: "36px",
  minWidth: "76px",
  "& .MuiSelect-select": {
    display: "flex",
    alignItems: "center",
    paddingTop: "0 !important",
    paddingBottom: "0 !important",
  },
});
export const CellContent = styled("div")({
  display: "flex",
  alignItems: "center",
});



export const StyledPopoverActionButton = styled(PopoverButton)(({ theme, colortype }) => ({
  color: colortype === "error" ? theme.palette.error.main : theme.palette.primary.main,
  textTransform: "none",
  fontSize: "0.9rem",
  "& .MuiButton-startIcon": {
    color: colortype === "error" ? theme.palette.error.main : theme.palette.primary.main,
  },
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const TreeRowBox = styled(SkyBox)(({ theme, level }) => ({
  display: 'flex',
  alignItems: 'center',
  marginLeft: theme.spacing(level * 2),
}));


export const TreeRowBoxLevel = styled(SkyBox)(() => ({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
}));

export const TreeToggleWrapper = styled(SkyBox)(() => ({
  width: 20,
  minWidth: 20,
  flexShrink: 0,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
}));

export const TreeToggleButton = styled(ToggleButton)(() => ({
  padding: 0,
}));

export const FlagIcon = styled(Flag, {
  shouldForwardProp: (prop) => prop !== "priority",
})(({ theme, priority }) => {
  // Normalize priority
  let p = priority ? String(priority).toLowerCase() : "";

  // Check for "Gấp" cases
  if (p === "gấp" || p === "gap" || p === "1") {
    return {
      color: "#f44336", // Red for "Gấp"
      marginRight: theme.spacing(0.5),
      fontSize: "1.2rem",
    };
  }
  
  return {
    color: "#bdbdbd", // Grey for "Bình thường" or no priority
    marginRight: theme.spacing(0.5),
    fontSize: "1.2rem",
  };
});

export const TreeCheckbox = styled(SkyCheckbox)(({ theme }) => ({
  padding: theme.spacing(0.5),
}));

export const StyledExpandIcon = styled(KeyboardArrowRight)({
   
});

export const StyledCollapseIcon = styled(KeyboardArrowDown)({
   
});

export const SkeletonLoadingBox = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  marginLeft: theme.spacing(4),
}));
export const TreeHeaderCellContainer = styled(HeaderCellContainer)(() => ({
  marginLeft: 0,
}));

export const TreeRowIndenter = styled("div", {
  shouldForwardProp: (prop) => prop !== "$level",
})(({ $level = 0 }) => ({
  paddingLeft: `${$level * 30}px`,
}));

export const TreeCheckboxSlot = styled("div")(() => ({
  width: 30,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  flexShrink: 0,
}));

export const StyledSearch = styled(CustomInputBase)(({ theme }) => ({
  flexGrow: 1, 
  minWidth: 300, 
  maxWidth: 450, 

  "& .MuiOutlinedInput-root": {
    borderRadius: theme.shape.borderRadius,
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: theme.palette.divider,
    },
    "& .MuiInputBase-input": {
      color: `${theme.palette.text.primary} !important`,
      "&::placeholder": {
        color: theme.palette.text.secondary,
        opacity: 0.4,
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
    borderRadius: theme.shape.borderRadius,
    // border: "none", // ✅ Phục hồi lại border đã bị xóa
  },
  // Responsive trên màn hình nhỏ
  [theme.breakpoints.down("md")]: {
    minWidth: "calc(100% - 160px)", // Chiếm gần hết chiều rộng, trừ đi không gian cho các nút
    maxWidth: "100%",
    flexBasis: "calc(100% - 160px)", // Đảm bảo nó chiếm không gian cần thiết
  },
}));

export const StyledSearchFieldJoined = styled(StyledSearch)(({ theme }) => ({
  "& .MuiOutlinedInput-root, & .MuiOutlinedInput-notchedOutline": {
    borderRadius: `${theme.shape.borderRadius}px 0 0 ${theme.shape.borderRadius}px`,
  },
}));

export const StyledSearchButtonJoined = styled(StyledSearchButton)(({ theme }) => ({
  marginLeft: 0,
  borderRadius: `0 ${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0`,
}));

export const StyledFilterButtonJoined = styled(StyledFilterButton)(() => ({
  borderRadius: 0,
}));

export const TreeSpacer = styled("div")({
  width: "22px",
  height: "22px",
  display: "inline-block",
  flexShrink: 0,
});
