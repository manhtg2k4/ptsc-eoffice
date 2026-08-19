import { Box, Tabs, Tab, Badge } from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  PageContainer as BasePageContainer,
  ScrollTableContainer,
} from "./Common.styles";

export const PageContainer = styled(BasePageContainer)(({ theme }) => ({
  position: "relative",
  overflow: "hidden", // Ngăn scroll ở page level
  minHeight: "unset",
  height: "100%", // ✅ Sửa từ 100vh thành 100% để tránh scroll toàn trang
  paddingTop: theme.spacing(7.5), // 60px
}));

// Wrapper cho Tabs - Floating ở góc phải trên
export const TabsWrapper = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: theme.spacing(1.5), // 12px
  right: theme.spacing(2), // 16px
  zIndex: 10,
  backgroundColor: "transparent",
  maxWidth: "calc(100% - 32px)", // Ngăn overflow ra ngoài viewport
  [theme.breakpoints.down("md")]: {
    right: theme.spacing(1),
    maxWidth: "calc(100% - 16px)",
  },
}));

// Container cho Tabs
export const TabsContainer = styled(Tabs)(({ theme }) => ({
  minHeight: theme.spacing(4), // 32px
  backgroundColor: "transparent",
  // Default (desktop): no horizontal scroll
  overflowX: "visible",
  overflowY: "visible",
  "& .MuiTabs-indicator": {
    display: "none",
  },
  "& .MuiTabs-flexContainer": {
    gap: theme.spacing(0.75), // 6px
    flexWrap: "nowrap", // Không cho wrap, buộc cuộn ngang khi cần
    minWidth: "min-content", // Cho phép container lớn hơn parent
  },
  "& .MuiTabs-scrollButtons": {
    // Hide scroll buttons on desktop
    display: "none",
    color: theme.palette.primary.main,
    [theme.breakpoints.down("sm")]: {
      width: 32,
      "&.Mui-disabled": {
        opacity: 0.5,
      },
    },
  },

  // Small screens: enable horizontal scroll and hide native scrollbar
  [theme.breakpoints.down("md")]: {
    overflowX: "auto",
    overflowY: "hidden",
    "& .MuiTabs-scrollButtons": {
      display: "flex",
    },
    // Ẩn scrollbar nhưng vẫn cho cuộn
    scrollbarWidth: "none", // Firefox
    "-ms-overflow-style": "none", // IE và Edge
    "&::-webkit-scrollbar": {
      display: "none", // Chrome, Safari và Opera
    },
  },
}));

// Styled cho mỗi Tab
export const StyledTab = styled(Tab)(({ theme }) => ({
  minHeight: theme.spacing(4), // 32px
  minWidth: "auto",
  flex: "0 0 auto", // Không co giãn, giữ nguyên kích thước
  textTransform: "none",
  fontSize: theme.typography.pxToRem(13),
  fontWeight: theme.typography.fontWeightMedium,
  padding: theme.spacing(0.5, 1.25), // 4px 10px
  color: theme.palette.text.secondary,
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  transition: "all 0.2s ease",
  boxShadow: theme.shadows[1],
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  whiteSpace: "nowrap", // Không cho text xuống dòng
  [theme.breakpoints.down("sm")]: {
    fontSize: theme.typography.pxToRem(12),
    padding: theme.spacing(0.5, 1), // 4px 8px on small screens
  },
  "&.Mui-selected": {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    fontWeight: theme.typography.fontWeightBold,
    border: `1px solid ${theme.palette.primary.main}`,
    boxShadow: theme.shadows[3],
  },
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
    transform: "translateY(-1px)",
  },
  "&.Mui-selected:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));

// Label của Tab (chứa text + badge)
export const TabLabel = styled("span")(() => ({
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  "& > span": {
    // Style cho text content
    display: "block",
    textAlign: "center",
  },
}));

export const TabBadge = styled(Badge)(({ theme }) => ({
  "& .MuiBadge-badge": {
    position: "absolute",
    top: -9, // Đẩy lên cao hơn chút
    right: -15, // *** ĐÂY LÀ CHÌA KHÓA: dịch sát ra ngoài bên phải
    transform: "translate(50%, -50%)", // căn giữa viên badge
    backgroundColor: theme.palette.primary.main,
    color: "white",
    fontSize: "10px",
    fontWeight: 700,
    height: 19,
    minWidth: 19,
    borderRadius: "50%", // luôn tròn
    padding: "0 5px",
    border: "2.5px solid white", // viền trắng đậm hơn
    boxShadow: "0 2px 6px rgba(0,0,0,0.25)", // bóng đậm như app thật
    zIndex: 1,
  },
  // Khi tab được chọn → badge trắng nền xanh
  ".Mui-selected & .MuiBadge-badge": {
    backgroundColor: "white",
    color: theme.palette.primary.main,
    border: "2.5px solid currentColor",
  },
}));

// TableWrapper - VỪA KHÍT, LOẠI BỎ KHOẢNG TRẮNG THỪA
export const TableWrapper = styled(ScrollTableContainer)(({ theme }) => ({
  position: "relative",
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden", // Ghi đè overflow từ ScrollTableContainer để ngăn cuộn ở cấp này
  height: `calc(100vh - ${theme.spacing(7.5)})`, // Giữ lại tính toán chiều cao
  // BẮT BUỘC: Đảm bảo bảng rộng hơn viewport
  "& .MuiTable-root": {
    minWidth: 4500, // ✅ Bổ sung khối bao bọc
    "& .MuiTableCell-root": {
      whiteSpace: "nowrap",
      padding: "0px 10px", // ✅ Bỏ padding dọc, chỉ giữ padding ngang
      fontSize: theme.typography.pxToRem(13),
      // ✅ Sửa lỗi: Thêm chiều cao từ theme để đồng bộ
      height: theme.layout?.dynamicTable?.rowHeight || "55px",
      // ✅ Đảm bảo màu hover đồng nhất với theme
      "tbody tr:hover &": {
        backgroundColor: `${theme.palette.action.hover} !important`,
      },
    },
  },
  // Đảm bảo TableContainer không bị giới hạn
  "& .MuiTableContainer-root": {
    maxWidth: "100%",
  },
}));
