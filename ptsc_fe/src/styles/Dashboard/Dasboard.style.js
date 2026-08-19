import { styled } from "@mui/material/styles";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import NorthEastIcon from "@mui/icons-material/NorthEast";
import SouthEastIcon from "@mui/icons-material/SouthEast";

import {
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Typography,
  ListItemIcon,
} from "@mui/material";

export const DashboardContainer = styled(Box)((props) => ({
  padding: props.theme.spacing(3),
  // backgroundColor: props.theme.palette.background.default,
  overflowY: "scroll",
}));

export const StatCardWrapper = styled(Card, {
  shouldForwardProp(prop) {
    return prop !== "variant";
  },
})((props) => {
  const { theme, variant } = props;
  const backgrounds = {
    incoming: "linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)",
    outgoing: "linear-gradient(135deg, #4ade80 0%, #22c55e 100%)",
    work: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
  };

  return {
    height: "100%",
    color: theme.palette.common.white,
    background: backgrounds[variant],
    transition: "transform 0.2s, box-shadow 0.2s",
    "&:hover": {
      // transform: "translateY(-4px)",
      boxShadow: theme.shadows[6],
    },
  };
});

export const ChartCard = styled(Card)((props) => ({
  height: "100%",
  backgroundColor: props.theme.palette.background.paper,
  transition: "box-shadow 0.3s",
  "&:hover": {
    boxShadow: props.theme.shadows[8],
  },
}));

export const StatCardContentWrapper = styled(CardContent)((props) => ({
  padding: props.theme.spacing(4),
}));

export const StatNumber = styled(Typography)((props) => ({
  fontWeight: props.theme.typography.fontWeightBold,
  marginBottom: props.theme.spacing(2),
}));

export const StatLabel = styled(Typography)((props) => ({
  marginBottom: props.theme.spacing(3),
}));

export const StatCardButton = styled(Button, {
  shouldForwardProp(prop) {
    return prop !== "buttonColor";
  },
})((props) => {
  const { theme, buttonColor } = props;
  return {
    backgroundColor: buttonColor,
    color: theme.palette.common.white,
    padding: theme.spacing(1.5, 0),
    borderRadius: 0,
    "&:hover": {
      backgroundColor: buttonColor,
      opacity: 0.9,
    },
  };
});

export const TypographyStyled = styled(Typography)((props) => ({
  color: props.theme.palette.text.secondary,
}));

export const ChartTitle = styled(Typography)((props) => ({
  fontWeight: props.theme.typography.fontWeightBold,
  marginBottom: props.theme.spacing(3),
  textTransform: "uppercase",
  textAlign: "center",
}));

export const ChartContainer = styled(Box)({
  display: "flex",
  flexDirection: "column", // Legend TRÊN, chart DƯỚI
  alignItems: "center",
  width: "100%",
  position: "relative",
});

export const ChartWrapper = styled(Box)({
  width: "100%",
  height: "280px",
  "& *": {
    outline: "none !important",
  },
  "& *:focus": {
    outline: "none !important",
  },
  "& *:focus-visible": {
    outline: "none !important",
  },
});

export const LegendContainer = styled(Box)(() => ({
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexWrap: "wrap",
  // gap: props.theme.spacing(1.2),
  // marginBottom: props.theme.spacing(1.5),
  marginTop: 0,
}));

export const LegendItem = styled(Box, {
  shouldForwardProp(prop) {
    return prop !== "isHidden";
  },
})((props) => {
  const { theme, isHidden } = props;
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(1, 2),
    borderRadius: theme.shape.borderRadius,
    cursor: "pointer",
    transition: "background-color 0.2s, opacity 0.3s",
    opacity: isHidden ? 0.4 : 1,
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
  };
});

export const LegendColorBox = styled(Box, {
  shouldForwardProp(prop) {
    return prop !== "boxColor" && prop !== "isHidden";
  },
})((props) => {
  const { boxColor, isHidden } = props;
  return {
    width: 16,
    height: 16,
    backgroundColor: boxColor,
    borderRadius: 4,
    opacity: isHidden ? 0.4 : 1,
    transition: "opacity 0.3s",
  };
});

export const LegendLabel = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 12,
});

export const LegendValue = styled(Typography)((props) => ({
  fontWeight: props.theme.typography.fontWeightBold,
}));

export const SingleLegendBox = styled(Box, {
  shouldForwardProp(prop) {
    return prop !== "isHidden";
  },
})((props) => {
  const { theme, isHidden } = props;
  return {
    marginTop: theme.spacing(2),
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
    padding: theme.spacing(1, 2),
    backgroundColor: theme.palette.action.hover,
    borderRadius: theme.shape.borderRadius,
    cursor: "pointer",
    opacity: isHidden ? 0.4 : 1,
    transition: "opacity 0.3s",
  };
});

export const ManagementCard = styled(Card)((props) => ({
  backgroundColor: props.theme.palette.background.paper,
}));

export const ManagementContent = styled(CardContent)((props) => ({
  paddingTop: props.theme.spacing(3),
}));

export const ManagementTitle = styled(Typography)((props) => ({
  fontWeight: props.theme.typography.fontWeightBold,
  marginBottom: props.theme.spacing(2),
}));

export const StatRow = styled(Box)((props) => ({
  display: "flex",
  flexDirection: "column",
  gap: props.theme.spacing(1.5),
}));

export const StatItem = styled(Box)({
  display: "flex",
  justifyContent: "space-between",
});

export const ManagementIconWrapper = styled(ListItemIcon)((props) => ({
  color: props.theme.palette.primary.main,
}));

export const ManagementTitleText = styled(Typography)((props) => ({
  fontWeight: props.theme.typography.fontWeightBold,
}));

export const StatValue = styled(Typography)((props) => ({
  fontWeight: props.theme.typography.fontWeightBold,
}));

export const StatValueError = styled(Typography)((props) => ({
  fontWeight: props.theme.typography.fontWeightBold,
  color: props.theme.palette.error.main,
}));

export const StatsGrid = styled(Grid)((props) => ({
  marginBottom: props.theme.spacing(4),
}));

export const TooltipBox = styled(Box)((props) => ({
  backgroundColor: props.theme.palette.background.paper,
  padding: props.theme.spacing(1.5),
  border: `1px solid ${props.theme.palette.divider}`,
  borderRadius: props.theme.shape.borderRadius,
  boxShadow: props.theme.shadows[2],
}));

export const StyleBoxNoData = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "60%",
  width: "100%",

  [theme.breakpoints.down(899)]: {
    height: "320px",
  },
}));


export const StyleTypographyNoData = styled(Typography)((theme) => ({
  color: theme?.palette?.text?.primary,
  textAlign: "center",
  fontWeight: "600", // Lấy fontWeight từ theme
  fontSize: "0.875rem", // Lấy fontSize từ theme, bạn có thể sử dụng body1 hoặc heading tùy vào nhu cầu
}));

// Styled components cho bảng thống kê
export const StatisticsTableContainer = styled(Box)(({ theme }) => ({
  width: "100%",
  overflowX: "auto",
  marginTop: theme.spacing(2),
}));

export const StatisticsTable = styled("table")(({ theme }) => ({
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.875rem",
  "& th, & td": {
    border: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(1, 1.5),
    textAlign: "center",
  },
  "& th": {
    backgroundColor: theme.palette.mode === "dark" 
      ? theme.palette.grey[800] 
      : theme.palette.grey[100],
    fontWeight: 600,
    color: theme.palette.text.primary,
    whiteSpace: "nowrap",
  },
  "& td": {
    color: theme.palette.text.secondary,
  },
  "& tbody tr:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const StatisticsTableHeaderGroup = styled("th")(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" 
    ? theme.palette.grey[600]
    : theme.palette.primary.light,
  color: theme.palette.mode === "dark" 
    ? `${theme.palette.common.white} !important`
    : `${theme.palette.common.black} !important`,
  fontWeight: "600 !important",
}));

export const StatisticsTableHeaderCell = styled("th")(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" 
    ? theme.palette.grey[700] 
    : theme.palette.grey[200],
  minWidth: 80,
}));

export const StatisticsTableUnitCell = styled("td", {
  shouldForwardProp: (prop) => prop !== "indentLevel",
})(({ theme, indentLevel = 0 }) => ({
  textAlign: "left !important",
  fontWeight: indentLevel === 0 ? 600 : 400,
  color: `${theme.palette.text.primary} !important`,
  minWidth: 180,
  whiteSpace: "nowrap",
  paddingLeft: `${16 + indentLevel * 24}px !important`,
}));

// Ký hiệu thụt lề cây
export const TreeIndentIndicator = styled("span")(({ theme }) => ({
  display: "inline-block",
  width: 12,
  marginRight: 8,
  color: theme.palette.mode === "dark" ? theme.palette.grey[500] : "#9ca3af",
}));

export const StatisticsTableValueCell = styled("td")(({ theme }) => ({
  color: `${theme.palette.text.primary} !important`,
  fontWeight: 400,
}));

// Styled component cho filter ngày
export const DateFilterContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: theme.spacing(2),
  marginBottom: theme.spacing(2),
  flexWrap: "nowrap",
}));

export const DatePickerWrapper = styled(Box)(() => ({
  width: 200,
  minWidth: 200,
  maxWidth: 200,
  "& .MuiFormControl-root": {
    width: "100%",
  },
}));

export const BannerRoot = styled(Box)(({ theme }) => ({
  background: theme.palette.background.paper,
  // background: "#EFF3F8",
  border: "1px solid #E0E7F0",
	borderRadius: 16,
  padding: "28px 32px",
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
  gap: 32,
	position: "relative",
	overflow: "hidden",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.25)",
	[theme.breakpoints.down("md")]: {
		flexDirection: "column",
		alignItems: "flex-start",
    gap: 20,
    padding: "20px 20px",
	},
  "@media (min-width: 600px) and (max-width: 1199.95px)": {
    padding: "20px 24px",
    gap: 16,
  },
}));

export const BannerLeft = styled(Box)({
	display: "flex",
	flexDirection: "column",
  gap: 8,
	minWidth: 0,
	flex: 1,
});

export const GreetingRow = styled(Box)({
	display: "flex",
	alignItems: "baseline",
	flexWrap: "wrap",
	gap: 6,
});

export const GreetingLabel = styled(Typography)(({ theme }) => ({
	fontFamily: theme.typography.fontFamily,
  fontSize: 36,
	fontWeight: 800,
	color: "#131A20",
	lineHeight: 1.2,
  [theme.breakpoints.down("md")]: {
    fontSize: 30,
  },
  "@media (min-width: 600px) and (max-width: 1199.95px)": {
    fontSize: 20,
    whiteSpace: "nowrap",
  },
}));

export const GreetingName = styled(Typography)(({ theme }) => ({
	fontFamily: theme.typography.fontFamily,
  fontSize: 36,
	fontWeight: 800,
	color: "#2364B0",
	lineHeight: 1.2,
  [theme.breakpoints.down("md")]: {
    fontSize: 30,
  },
  "@media (min-width: 600px) and (max-width: 1199.95px)": {
    fontSize: 20,
    whiteSpace: "nowrap",
  },
}));

export const DateRow = styled(Box)(() => ({
	display: "flex",
	alignItems: "center",
  gap: 8,
  color: "#5C6B7B",
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  marginLeft: 10,
  "@media (min-width: 600px) and (max-width: 1199.95px)": {
    width: "100%",
    marginLeft: 0,
    marginTop: 6,
  },
}));

export const DateIcon = styled(CalendarTodayOutlinedIcon)({
  fontSize: 14,
  opacity: 0.75,
});

export const DateText = styled(Typography)({
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: 0.6,
  textTransform: "uppercase",
	lineHeight: 1,
});

export const AlertRow = styled(Box)({
	display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginTop: 8,
  padding: "13px 16px",
  borderRadius: 12,
  background: "#E8EEF6",
  border: "1px solid #D5DFEC",
  maxWidth: 680,
  width: "100%",
});

export const AlertRowClickable = styled(AlertRow, {
	shouldForwardProp: (prop) => prop !== "clickable",
})(({ clickable }) => ({
	cursor: clickable ? "pointer" : "default",
	background: "#F2F7FC80"
}));

export const AlertIcon = styled(Box)({
  color: "#2B6CB7",
	display: "flex",
	alignItems: "center",
  justifyContent: "center",
	flexShrink: 0,
  width: 22,
  height: 22,
  borderRadius: "50%",
  background: "#DCE8F7",
  fontSize: 14,
	"& .MuiSvgIcon-root": { fontSize: "inherit" },
});

export const AlertContent = styled(Box)({
	display: "flex",
	flexDirection: "column",
  gap: 2,
	minWidth: 0,
  flex: 1,
});

export const AlertMainText = styled(Typography)(({ theme }) => ({
	fontFamily: theme.typography.fontFamily,
  fontSize: 14,
  fontWeight: 700,
  color: "#131A20",
	lineHeight: 1.4,
  [theme.breakpoints.down("md")]: {
    fontSize: 11,
  },
}));

export const AlertEmText = styled("span")({
  fontWeight: 800,
  color: "#E54C44",
});

export const AlertSubText = styled(Typography)(({ theme }) => ({
	fontFamily: theme.typography.fontFamily,
  fontSize: 13,
  color: "#58667A",
	lineHeight: 1.4,
}));

export const AlertMessageRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
  flex: 1,
});

export const AlertAction = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: "nowrap",
  color: "#1F5DAA",
  userSelect: "none",
  "& .MuiSvgIcon-root": {
    fontSize: 17,
  },
});

export const BoltDecor = styled(Box)(({ theme }) => ({
	position: "absolute",
  right: 12,
	top: "50%",
	transform: "translateY(-50%)",
  opacity: 1,
  color: "#D6DEEA",
  fontSize: 170,
	lineHeight: 1,
	pointerEvents: "none",
	"& .MuiSvgIcon-root": { fontSize: "inherit" },
  [theme.breakpoints.down("md")]: {
    right: -6,
    fontSize: 120,
    opacity: 0.8,
  },
  "@media (min-width: 600px) and (max-width: 1199.95px)": {
    display: "none",
  },
}));

// ─── Boss Panel (right side, only for BossDashboard) ──────────────────────────

export const BossPanel = styled(Box)(({ theme }) => ({
	display: "flex",
	flexDirection: "column",
  gap: 18,
  minWidth: 320,
  paddingLeft: theme.spacing(2.5),
  paddingRight: theme.spacing(15),
  zIndex: 1,
	[theme.breakpoints.down("md")]: {
		borderLeft: "none",
    borderTop: "none",
		paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
		width: "100%",
    minWidth: 0,
    gap: 10,
	},
  "@media (min-width: 600px) and (max-width: 1199.95px)": {
    paddingRight: 0,
    minWidth: "auto",
    gap: 10,
  },
}));

export const BossPanelLabel = styled(Typography)(({ theme }) => ({
	fontFamily: theme.typography.fontFamily,
  fontSize: 14,
	fontWeight: 600,
  color: "#585E65",
	textTransform: "uppercase",
  letterSpacing: 0.4,
  lineHeight: 1.2,
  [theme.breakpoints.down("md")]: {
    fontSize: 12,
  },
}));

export const BossPanelSubRow = styled(Box)({
	display: "flex",
	alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  marginTop: 0,
});

export const BossPanelGoalText = styled(Typography)(({ theme }) => ({
	fontFamily: theme.typography.fontFamily,
  fontSize: 10,
  color: "#5A6573",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: 1.6,
  [theme.breakpoints.down("md")]: {
    fontSize: 8,
    letterSpacing: 1,
  },
}));

export const BossPanelGoalSubText = styled(BossPanelGoalText)(() => ({
  color: "#5C6B7B",
  // color: "#9aa7b880",
}));

export const BossPanelGoalValue = styled("span")({
	fontWeight: 800,
  color: "#5C6B7B",
  // color: "#9aa7b880",
});

export const BossPanelValueRow = styled(Box)({
	display: "flex",
	alignItems: "center",
  justifyContent: "space-between",
  gap: 20,
  marginTop: 0,
});

export const BossPanelTrendColumn = styled(Box)({
  display: "flex",
  alignItems: "center",
  borderLeft: "2px solid #D9DEE5",
  paddingLeft: 24,
  marginLeft: 8,
});

export const BossPanelColumns = styled(Box)({
  display: "flex",
  alignItems: "stretch",
});

export const BossPanelLeftSection = styled(Box)({
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  gap: 10,
});

export const BossPanelRightSection = styled(Box)({
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  borderLeft: "2px solid #D9DEE5",
  paddingLeft: 24,
  marginLeft: 24,
  gap: 10,
});

export const BossPanelBigValue = styled(Typography)(({ theme }) => ({
	fontFamily: theme.typography.fontFamily,
  fontSize: 50,
	fontWeight: 900,
	lineHeight: 1,
  color: "#2364B0",
  [theme.breakpoints.down("md")]: {
    fontSize: 40,
  },
}));

export const BossTrendChip = styled(Box, {
	shouldForwardProp: (prop) => prop !== "isUp",
})(({ isUp }) => ({
	display: "inline-flex",
	alignItems: "center",
  gap: 6,
  fontSize: 30,
	fontWeight: 700,
  padding: 0,
  lineHeight: 1,
  color: isUp ? "#2364B0" : "#C62828",
}));

export const BossTrendUpIcon = styled(NorthEastIcon)({
  fontSize: 26,
});

export const BossTrendDownIcon = styled(SouthEastIcon)({
  fontSize: 26,
});

export const BossTrendValue = styled("span")({
  fontSize: 30,
  fontWeight: 800,
  lineHeight: 1,
  color: "#131A20",
});

export const BossTrendLabel = styled("span")({
  fontSize: 10,
  fontWeight: 500,
  lineHeight: 1.2,
  color: "#5A6573",
  whiteSpace: "nowrap",
  marginLeft: 8,
  textTransform: "none",
});