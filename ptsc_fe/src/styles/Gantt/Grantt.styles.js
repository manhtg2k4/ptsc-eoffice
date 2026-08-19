import { styled } from "@mui/material/styles";
import {
  Typography,
  IconButton,
  Checkbox as MuiCheckbox,
  Box,
} from "@mui/material";
import {
  KeyboardArrowDown,
  KeyboardArrowRight,
  Flag,
  Link as MuiLinkIcon,
} from "@mui/icons-material";
import { MarginControlBox, StickyHeader } from "@styles/ThemeConfig.styles";

const DAY_WIDTH = 50;
const LEFT_PANEL_WIDTH = 320;

// Khung chứa chính - flex container với chiều cao tối đa
export const GanttWrapper = styled(MarginControlBox)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  height: "100%",
  maxHeight: "calc(100vh - 100px)",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: '8px 0 8px 8px',
  overflow: "hidden",
	backgroundColor: theme.palette.background.paper,
	width: "unset",
}));

// Thanh điều hướng tháng
export const MonthNav = styled(MarginControlBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: theme.spacing(0.5, 1),
  backgroundColor: "transparent",
  width: "100%",
}));

// Khối header bám dính gồm navigation + header tháng/ngày
export const StickyHeaderGrantt = styled(StickyHeader)(({ theme }) => ({
  position: "sticky",
  top: 0,
  zIndex: 15,
  display: "flex",
  flexDirection: "row",
  backgroundColor: theme.palette.background.paper,
  padding: "0px !important",
  width: "unset",
  boxShadow: "none !important",
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

// Text hiển thị tháng
export const MonthNavText = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  fontSize: "1.1rem",
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
}));

// Nút điều hướng
export const NavIconButton = styled(IconButton)({
  padding: 4,
});

export const NavButtonGroup = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: "6px",
  backgroundColor: theme.palette.background.paper,
  overflow: "hidden",
  height: 28,
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
}));

export const NavButton = styled(IconButton)(({ theme }) => ({
  padding: 0,
  borderRadius: 0,
  width: 28,
  height: 28,
  color: "#2364B0 !important",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
    color: "#1a4d87 !important",
  },
  "& svg": {
    fontSize: "1.2rem",
  }
}));

export const TodayButton = styled(Box)(({ theme }) => ({
  padding: theme.spacing(0, 1.25),
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: theme.palette.text.secondary,
  cursor: "pointer",
  borderLeft: `1px solid ${theme.palette.divider}`,
  borderRight: `1px solid ${theme.palette.divider}`,
  userSelect: "none",
  transition: "all 0.2s",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
    color: theme.palette.text.primary,
  },
}));

export const GanttTopBar = styled(MarginControlBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "start",
  gap: "16px",
  padding: "12px 20px",
  marginTop: "8px",
  backgroundColor: theme.palette.mode === "dark" 
    ? theme.palette.background.default 
    : "#F9FAFB !important",
  borderRadius: "8px",
  border: "none !important",
  marginBottom: "16px",
  marginRight:"16px",
  marginLeft:"16px",
  flexShrink: 0,
  width: "unset",
}));

export const TopBarMonthText = styled(Typography)(() => ({
  fontWeight: 600,
  fontSize: "28px",
  color: '#565D6D',
  whiteSpace: "nowrap",
  // fontFamily: "Roboto",
}));

export const TopBarNavButtonGroup = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: "8px",
  backgroundColor: theme.palette.background.paper,
  overflow: "hidden",
  height: 32,
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
}));

export const TopBarNavButton = styled(IconButton)(({ theme }) => ({
  padding: 0,
  borderRadius: 0,
  width: 32,
  height: 32,
  color: theme.palette.text.secondary,
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
    color: theme.palette.text.primary,
  },
  "& svg": {
    fontSize: "1.1rem",
  }
}));

export const TopBarTodayButton = styled(Box)(({ theme }) => ({
  padding: "0 14px",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "13px",
  fontWeight: 600,
  color: "#2364B0 !important",
  cursor: "pointer",
  borderLeft: `1px solid ${theme.palette.divider}`,
  borderRight: `1px solid ${theme.palette.divider}`,
  userSelect: "none",
  transition: "all 0.2s",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
    color: "#1a4d87 !important",
  },
}));

export const StickyGanttMonthNav = styled(MarginControlBox)(({ theme }) => ({
  position: "sticky",
  left: LEFT_PANEL_WIDTH,
  zIndex: 3,
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
  backgroundColor: theme.palette.background.paper,
  height: "100%",
  padding: theme.spacing(0, 1),
  borderRight: "none",
  flexShrink: 0,
  width: "unset",
}));

export const GanttInlineMonthText = styled(Typography)({
  fontSize: "0.875rem",
  fontWeight: 600,
  whiteSpace: "nowrap",
  color: "#2364B0 !important",
});

// Container chứa panel trái và phải
export const GanttContainer = styled(StickyHeader)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  overflow: "hidden",
  backgroundColor: theme.palette.background.paper,
  position: "relative",
  width: "unset",
  padding: "0px !important",
  zIndex: "unset",
  top: "unset",
  boxShadow: "none !important",
}));

// Hàng header tháng - cố định ở top:0
export const MonthHeaderRowContainer = styled(MarginControlBox)(({ theme }) => ({
  display: "flex",
  minWidth: "100%",
  flexShrink: 0,
  backgroundColor: theme.palette.background.paper,
	borderBottom: `1px solid ${theme.palette.divider}`,
	width: "unset",
}));

// Hàng header ngày - cố định ở top:28 (bên dưới header tháng)
export const DayHeaderRowContainer = styled(MarginControlBox)(({ theme }) => ({
  display: "flex",
  minWidth: "100%",
  flexShrink: 0,
  backgroundColor: theme.palette.background.paper,
	width: "unset",
}));

// Khung chứa nội dung công việc - container scroll chính
export const TaskBodyWrapper = styled(MarginControlBox)({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  overflow: "auto",
	position: "relative",
	width: "unset",
});

// Hàng công việc đơn chứa cả trái và phải
export const TaskRowContainer = styled(StickyHeader)(({ theme }) => ({
  display: "flex",
  minWidth: "100%",
  borderBottom: `1px solid ${theme.palette.divider}`,
  top: "unset",
  zIndex: "unset",
  position: "unset",
  boxShadow: "none !important",
  padding: "0px !important",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

// Khung panel bên trái
export const LeftPanelWrapper = styled(StickyHeader)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  flexShrink: 0,
  backgroundColor: theme.palette.background.paper,
  padding: "0px !important",
  position: "unset",
  top: "unset",
  zIndex: "unset",
  boxShadow: "none !important",
}));

// Ô header bên trái - cố định khi scroll
export const HeaderLeftCell = styled(MarginControlBox)(({ theme }) => ({
  width: LEFT_PANEL_WIDTH,
  minWidth: LEFT_PANEL_WIDTH,
  flexShrink: 0,
  position: "sticky",
  left: 0,
  zIndex: 2,
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(1),
  borderRight: `1px solid ${theme.palette.divider}`,
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  fontWeight: 600,
  height: 40,
}));

// Text header bên trái
export const HeaderLeftText = styled(Typography)({
  fontWeight: 700,
  textTransform: "uppercase",
  fontSize: "15px !important",
  letterSpacing: "0.05em",
  textAlign: "center",
});

export const MergedHeaderLeftCell = styled(MarginControlBox)(({ theme }) => ({
  width: LEFT_PANEL_WIDTH,
  minWidth: LEFT_PANEL_WIDTH,
  flexShrink: 0,
  position: "sticky",
  left: 0,
  zIndex: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  padding: theme.spacing(1),
  paddingLeft:'15px',
  borderRight: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  alignSelf: "stretch",
  height: "auto",
  boxSizing: "border-box",
}));

// Ô header tháng bên trái - cố định khi scroll
export const MonthHeaderLeftCell = styled(StickyHeader)(({ theme }) => ({
  width: LEFT_PANEL_WIDTH,
  minWidth: LEFT_PANEL_WIDTH,
  flexShrink: 0,
  position: "sticky",
  left: 0,
  zIndex: 2,
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  borderRight: `1px solid ${theme.palette.divider}`,
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  minHeight: 48,
	padding: theme.spacing(0, 1.5),
	top: "unset",
	boxShadow: "unset",
}));

// Hàng header tháng
export const MonthHeaderRow = styled(MarginControlBox)(({ theme }) => ({
  display: "flex",
  flex: 1,
  backgroundColor: theme.palette.background.paper,
  width: "unset",
}));

// Khung header bên phải (flex để lấp đầy không gian)
export const HeaderRightWrapper = styled(MarginControlBox)(({ theme }) => ({
  display: "flex",
  flex: 1,
  backgroundColor: theme.palette.background.paper,
  width: "unset",
}));

// Ô header tháng
export const MonthHeaderCell = styled(MarginControlBox, {
  shouldForwardProp: (prop) => prop !== "cellWidth",
})(({ theme, cellWidth }) => ({
  width: cellWidth,
  minWidth: cellWidth,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  // borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  fontWeight: 600,
  fontSize: 13,
  color: theme.palette.text.primary,
  height: 48,
}));

// Hàng công việc (cả trái và phải)
export const TaskRow = styled(MarginControlBox)(({ theme }) => ({
  display: "flex",
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  width: "unset",
}));

// Hàng công việc có hiệu ứng hover
export const TaskRowHover = styled(TaskRow)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

// Ô công việc bên trái - cố định khi scroll, mở rộng để hiển thị chi tiết
export const TaskLeftCell = styled(MarginControlBox, {
  shouldForwardProp: (prop) => prop !== "level",
})(({ theme, level = 0 }) => ({
  width: LEFT_PANEL_WIDTH,
  minWidth: LEFT_PANEL_WIDTH,
  flexShrink: 0,
  position: "sticky",
  left: 0,
  zIndex: 5,
  display: "flex",
  flexDirection: "column",
  paddingLeft: theme.spacing(level * 2 + 1),
  paddingRight: theme.spacing(1),
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1),
  borderRight: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  cursor: "pointer",
}));

// Hàng header công việc (checkbox, cờ, tên)
export const TaskHeaderRow = styled(MarginControlBox)({
  display: "flex",
  alignItems: "center",
  width: "100%",
});

// Phần chi tiết công việc
export const TaskDetailsSection = styled(MarginControlBox)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(0.5),
  marginTop: theme.spacing(0.5),
  marginLeft: 56,
  fontSize: 12,
  width: "auto",
}));

// Nhãn trạng thái
export const StatusBadge = styled(MarginControlBox, {
  shouldForwardProp: (prop) => prop !== "statusType",
})(({ theme, statusType }) => {
  const colors = {
    1: { bg: "#E0E0E0", text: "#555555", border: "#AEB5BE" },
    2: { bg: "#DBEAFE", text: "#0062AD", border: "#AEB5BE" },
    3: { bg: "#FEF9C2", text: "#FFA600", border: "#AEB5BE" },
    4: { bg: "#D0FFDE", text: "#007222", border: "#ADECC0" },
    5: { bg: "#FFDCD9", text: "#F44336", border: "#AEB5BE" },
    6: { bg: "#FEF9C2", text: "#FFA600", border: "#AEB5BE" },
    8: { bg: "#FFDCD9", text: "#F44336", border: "#AEB5BE" },
    "Công việc mới": { bg: "#E0E0E0", text: "#555555", border: "#AEB5BE" },
    "Đang thực hiện": { bg: "#DBEAFE", text: "#0062AD", border: "#AEB5BE" },
    "Chờ phê duyệt": { bg: "#FEF9C2", text: "#FFA600", border: "#AEB5BE" },
    "Hoàn thành": { bg: "#D0FFDE", text: "#007222", border: "#ADECC0" },
    "Hủy": { bg: "#FFDCD9", text: "#F44336", border: "#AEB5BE" },
    pending: { bg: "#eeeeee", text: "#666", border: "#ccc" },
  };
  const color = colors[statusType] || colors[String(statusType)] || colors.pending;

  return {
    display: "inline-flex",
    alignItems: "center",
    padding: theme.spacing(0.25, 1),
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 500,
    backgroundColor: color.bg,
    color: color.text,
    border: `1px solid ${color.border}`,
    whiteSpace: "nowrap",
    width: "unset",
  };
});

// Hàng chi tiết công việc
export const TaskDetailRow = styled(MarginControlBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: theme.spacing(0.5),
  color: theme.palette.text.secondary,
  fontSize: 12,
  width: "100%",
  "& strong": {
    fontWeight: 500,
  },
}));

// Khung icon cờ ưu tiên
export const FlagIconWrapper = styled(MarginControlBox, {
  shouldForwardProp: (prop) => prop !== "flagType",
})(({ flagType }) => {
  const colors = {
    high: "#ef5350",
    medium: "#ff9800",
    low: "#4CAF50",
  };
  return {
    display: "flex",
    alignItems: "center",
    marginRight: 4,
    color: colors[flagType] || "transparent",
		width: "unset",
  };
});

// Thông tin tiến độ inline
export const ProgressInfo = styled(MarginControlBox)(({ theme, timeColor }) => ({
  display: "inline-flex",
  alignItems: "center",
  marginLeft: 0,
  color:  timeColor || theme.palette.text.secondary,
  fontSize: 12,
  width: "unset",
	fontWeight: timeColor ? 600 : "unset",
}));

// Khung panel bên phải
export const RightPanelWrapper = styled(MarginControlBox)(({ theme }) => ({
  flex: 1,
  overflow: "auto",
  backgroundColor: theme.palette.background.paper,
  width: "unset",
}));

// Header bên phải (hàng ngày) - căn chỉnh với "Tên công việc"
export const HeaderRightRow = styled(MarginControlBox)(({ theme }) => ({
  display: "inline-flex",
  minWidth: "100%",
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  height: 40,
  alignItems: "center",
  width: "unset",
}));

// Ô ngày trong header - căn giữa theo chiều dọc
export const DayCell = styled(MarginControlBox)(({ theme }) => ({
  width: DAY_WIDTH,
  minWidth: DAY_WIDTH,
  height: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  borderRight: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
}));

// Khung bên phải công việc - chứa các ô grid và thanh tiến độ
export const TaskRightWrapper = styled(MarginControlBox, {
  shouldForwardProp: (prop) => prop !== "dayWidth",
})(({ theme, dayWidth }) => ({
  position: "relative",
  display: "flex",
  alignItems: "center",
  minHeight: 60,
  minWidth:dayWidth ? `${dayWidth}px` : "fit-content",
  backgroundColor: theme.palette.background.paper,
  width:dayWidth ? `${dayWidth}px` : "unset",
  flex: 1,
  backgroundImage: `repeating-linear-gradient(to right, transparent, transparent ${DAY_WIDTH - 1}px, ${theme.palette.divider} ${DAY_WIDTH - 1}px, ${theme.palette.divider} ${DAY_WIDTH}px)`,
}));

export const FillerCell = styled(MarginControlBox)(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  height: "100%",
  backgroundImage: `repeating-linear-gradient(to right, transparent, transparent ${DAY_WIDTH - 1}px, ${theme.palette.divider} ${DAY_WIDTH - 1}px, ${theme.palette.divider} ${DAY_WIDTH}px)`,
}));

// Ô bên phải công việc (ô grid cho mỗi ngày)
export const TaskRightCell = styled(MarginControlBox, {
  shouldForwardProp: (prop) => prop !== "isToday",
})(({ theme, isToday }) => ({
  width: DAY_WIDTH,
  minWidth: DAY_WIDTH,
  height: "100%",
  borderRight: `1px solid ${theme.palette.divider}`,
  backgroundColor: isToday ? "#497db81a" : theme.palette.background.paper,
}));

// Container thanh tiến độ - căn giữa theo chiều dọc
export const BarContainer = styled(MarginControlBox, {
  shouldForwardProp: (prop) => !["barLeft", "barWidth"].includes(prop),
})(({ barLeft, barWidth }) => ({
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  left: barLeft,
  width: barWidth,
  height: 32,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
	cursor: "pointer",
  zIndex: 3,
  
  // Hiển thị link handles khi hover vào bar
  "&:hover > div[title]": {
    opacity: 1,
  },
}));

// Thanh kế hoạch (màu nhạt)
export const PlannedBar = styled(MarginControlBox, {
  shouldForwardProp: (prop) => prop !== "barColor",
})(({ barColor }) => ({
  height: 35,
  borderRadius: 6,
  backgroundColor: barColor + "40",
  position: "relative",
  overflow: "hidden",
  width: "unset",
}));

// Thanh thực tế (tiến độ)
export const ActualBar = styled(MarginControlBox, {
  shouldForwardProp: (prop) => !["barColor", "progress"].includes(prop),
})(({ barColor, progress }) => ({
  height: "100%",
  width: `${progress}%`,
  backgroundColor: barColor,
  borderRadius: 4,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

// Text hiển thị phần trăm tiến độ
export const ProgressText = styled(Typography)({
  fontSize: 11,
  color: "#fff",
  fontWeight: 500,
  whiteSpace: "nowrap",
});

// Chú thích - cố định ở dưới cùng
export const LegendWrapper = styled(MarginControlBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(3),
  padding: theme.spacing(1.5, 2),
  flexShrink: 0,
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
  width: "unset",
}));

// Mục chú thích
export const LegendItem = styled(MarginControlBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  width: "unset",
}));

// Ô màu chú thích
export const LegendBox = styled(MarginControlBox, {
  shouldForwardProp: (prop) => !["boxColor", "isLight"].includes(prop),
})(({ boxColor, isLight }) => ({
  width: 24,
  height: 16,
  borderRadius: 4,
  backgroundColor: isLight ? boxColor + "40" : boxColor,
}));

// Nút mở rộng
export const ExpandIconButton = styled(IconButton)({
  padding: 0,
  marginRight: 4,
});

// Placeholder cho các mục không thể mở rộng
export const ExpandPlaceholder = styled(MarginControlBox)({
  width: 24,
});

// Text tên công việc
export const TaskNameText = styled(Typography)({
  fontSize: 14,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontWeight: "600",
  color:'#17191C'
});

// Checkbox
export const StyledCheckbox = styled(MuiCheckbox)({
  padding: 0,
  marginRight: 8,
});

// Khung nội dung tooltip
export const TooltipContent = styled(MarginControlBox)(({ theme }) => ({
  padding: theme.spacing(1),
  minWidth: 200,
  width: "unset",
}));

// Tiêu đề tooltip
export const TooltipTitle = styled(Typography)({
  fontWeight: 600,
  marginBottom: 8,
});

// Chi tiết tooltip
export const TooltipDetail = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  display: "block",
}));

// Khung chi tiết tooltip
export const TooltipDetailWrapper = styled(MarginControlBox)({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  width: "unset",
});

// Icon mũi tên xuống nhỏ
// export const SmallArrowDown = styled(KeyboardArrowDown)({
//   fontSize: 20,
// });

export const SmallArrowDown = styled(KeyboardArrowDown)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontSize: 20,
}));

export const SmallArrowRight = styled(KeyboardArrowRight)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontSize: 20,
}));

// Icon mũi tên phải nhỏ
// export const SmallArrowRight = styled(KeyboardArrowRight)({
//   fontSize: 20,
// });

// Icon cờ nhỏ
export const SmallFlagIcon = styled(Flag)({
  fontSize: 18,
});

// Icon link nhỏ cho handle
export const SmallLinkIcon = styled(MuiLinkIcon)({
  fontSize: 8,
  color: "white",
});

// Xuất các hằng số
export const GANTT_CONSTANTS = {
  DAY_WIDTH,
  LEFT_PANEL_WIDTH,
};

export const HEADER_HEIGHT = 88; // MonthNav + header tháng (~48) + header ngày (40)

export const GanttContent = styled(MarginControlBox)({
  position: "relative",
  minWidth: "fit-content",
  width: "unset",
});

// export const TodayIndex = styled("div", {
//   shouldForwardProp: (prop) => prop !== "todayLeft" && prop !== "lineHeight",
// })(({ todayLeft, lineHeight }) => ({
//   position: "absolute",
//   left: `${todayLeft}px`,
//   top: 0,
//   height: `${Math.max(0, lineHeight)}px`,
//   width: "2px",
//   backgroundColor: "#FF4444",
//   zIndex: 12,          // để nổi hơn header sticky (header đang 10/11)
//   pointerEvents: "none",
// }));

export const TodayIndex = styled("div", {
  shouldForwardProp: (prop) =>
    prop !== "todayLeft" && prop !== "styledLineHeight" && prop !== "topOffset",
})(({ todayLeft, styledLineHeight, topOffset }) => {
  const safeTop = Math.max(0, topOffset || 0);
  const safeHeight = Math.max(0, (styledLineHeight || 0) - safeTop);

  return {
    position: "absolute",
    left: `${todayLeft}px`,
    top: `${safeTop}px`,          // ✅ bắt đầu dưới header
    height: `${safeHeight}px`,    // ✅ kéo dài tới cuối list
    width: "2px",
    backgroundColor: "#FF4444",
		// zIndex: 0,
		 zIndex: 1,
    // zIndex: 9,
    pointerEvents: "none",
  };
});

export const DeadlineMarker = styled("div", {
  shouldForwardProp: (prop) => prop !== "markerLeft",
})(({ markerLeft }) => ({
  position: "absolute",
  left: `${markerLeft}px`,
  top: 0,
  bottom: 0,
  width: "2px",
  backgroundColor: "#FF4444",
  zIndex: 4,              // ✅ nổi trên bar để dễ nhìn
	// pointerEvents: "none",
	pointerEvents: "auto",
	cursor: "pointer",

  // 2 tam giác nhỏ trên/dưới
  "&::before": {
    content: '""',
    position: "absolute",
    top: 6,
    left: "50%",
    transform: "translateX(-50%)",
    width: 0,
    height: 0,
    borderLeft: "5px solid transparent",
    borderRight: "5px solid transparent",
    borderBottom: "6px solid #FF4444",
  },
  "&::after": {
    content: '""',
    position: "absolute",
    bottom: 6,
    left: "50%",
    transform: "translateX(-50%)",
    width: 0,
    height: 0,
    borderLeft: "5px solid transparent",
    borderRight: "5px solid transparent",
    borderTop: "6px solid #FF4444",
  },
}));

// ==================== DEPENDENCY STYLES ====================

// SVG Overlay container cho mũi tên dependency
export const DependencyOverlay = styled("svg", {
  shouldForwardProp: (prop) => !["svgWidth", "svgHeight"].includes(prop),
})(({ svgWidth, svgHeight }) => ({
  position: "absolute",
  top: 0,
  left: 0,
  width: svgWidth || "100%",
  height: svgHeight || "100%",
  pointerEvents: "none",
  zIndex: 6,
  overflow: "visible",
}));

// Link handle icon trên bar công việc
export const LinkHandle = styled("div", {
  shouldForwardProp: (prop) => prop !== "handlePosition",
})(({ theme, handlePosition }) => ({
  position: "absolute",
  [handlePosition === "left" ? "left" : "right"]: -6,
  top: "50%",
  transform: "translateY(-50%)",
  width: 12,
  height: 12,
  borderRadius: "50%",
  backgroundColor: theme.palette.primary.main,
  border: `2px solid ${theme.palette.background.paper}`,
  cursor: "crosshair",
  pointerEvents: "auto",
  opacity: 0,
  transition: "opacity 0.2s ease",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10,
  
  "&:hover": {
    opacity: 1,
    transform: "translateY(-50%) scale(1.2)",
  },
}));

// Container cho bar với link handles
export const BarContainerWithHandles = styled(BarContainer)({
  "&:hover": {
    "& .link-handle": {
      opacity: 1,
    },
  },
});

// Highlight khi hover target trong khi kéo
export const TaskRowHighlight = styled(TaskRowContainer, {
  shouldForwardProp: (prop) => prop !== "isHighlighted" && prop !== "isValidTarget",
})(({ theme, isHighlighted, isValidTarget }) => ({
  ...(isHighlighted && {
    backgroundColor: isValidTarget 
      ? theme.palette.success.light + "30"
      : theme.palette.error.light + "30",
    outline: `2px dashed ${isValidTarget ? theme.palette.success.main : theme.palette.error.main}`,
    outlineOffset: -2,
  }),
}));

// Drag preview indicator
export const DragPreviewLine = styled("line")({
  stroke: "#1976d2",
  strokeWidth: 2,
  strokeDasharray: "5,5",
  fill: "none",
  pointerEvents: "none",
});

// Arrow marker cho dependency
export const DependencyPath = styled("path", {
  shouldForwardProp: (prop) => prop !== "isPreview",
})(({ isPreview }) => ({
  fill: "none",
  stroke: isPreview ? "#1976d2" : "#666",
  strokeWidth: 2,
  strokeDasharray: isPreview ? "5,5" : "none",
  pointerEvents: "none",
}));

// Container wrapper để track vị trí bar
export const BarAnchorWrapper = styled("div")({
  position: "relative",
  width: "100%",
  height: "100%",
});

export const FilterWrapper = styled(Box)({
  position: "relative",
});