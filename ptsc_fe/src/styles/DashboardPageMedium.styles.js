import { styled, alpha } from "@mui/material/styles";
import { Box, Button, Stack } from "@mui/material";
import { QuickActionGroupTitle, themeColors } from "./DashboardPage.styles";
import { MarginControlBox, PageTitle } from "./ThemeConfig.styles";
// import { SkyBox } from "./SkyStyles";
import DragHandleIcon from "@mui/icons-material/DragHandle";

const mediumPalette = {
	navy: "#0a2240",
	navyMid: "#0e2f5a",
	teal: "#00a99d",
	tealLight: "#00c4b4",
	tealPale: "#e6f7f6",
	orange: "#f5821f",
	orangePale: "#fff4eb",
	red: "#e63946",
	redPale: "#fef0f1",
	green: "#2db84b",
	greenPale: "#edfbf0",
	yellow: "#f5b800",
	yellowPale: "#fffbeb",
	blueAccent: "#2563eb",
	purple: "#7c3aed",
	bg: "#f0f4f8",
	card: "#ffffff",
	textPrimary: "#0d1b2e",
	textSecondary: "#546e8a",
	textMuted: "#8fa8bf",
	border: "#dce8f0",
	shadow: "0 2px 12px rgba(10,34,64,0.08)",
	shadowMd: "0 4px 24px rgba(10,34,64,0.12)",
};

export const getMediumColor = (color) => {
	const map = {
		navy: mediumPalette.navy,
		teal: mediumPalette.teal,
		orange: mediumPalette.orange,
		red: mediumPalette.red,
		green: mediumPalette.green,
		yellow: mediumPalette.yellow,
		blue: mediumPalette.blueAccent,
		purple: mediumPalette.purple,
		cyan: "#0891b2",
		emerald: "#059669",
		amber: "#f59e0b",
		pink: "#db2777",
	};
	return map[color] || mediumPalette.navy;
};

export const getMediumSoftColor = (color) => {
	const map = {
		navy: "rgba(10,34,64,.07)",
		teal: mediumPalette.tealPale,
		orange: mediumPalette.orangePale,
		red: mediumPalette.redPale,
		green: mediumPalette.greenPale,
		yellow: mediumPalette.yellowPale,
		blue: "rgba(37,99,235,.08)",
		purple: "rgba(124,58,237,.08)",
	};
	return map[color] || map.navy;
};

export const getMediumGradient = (color) => {
	const map = {
		blue: "linear-gradient(135deg,#2563eb,#1d4ed8)",
		cyan: "linear-gradient(135deg,#0891b2,#0e7490)",
		purple: "linear-gradient(135deg,#7c3aed,#6d28d9)",
		pink: "linear-gradient(135deg,#db2777,#be185d)",
		emerald: "linear-gradient(135deg,#059669,#047857)",
		amber: "linear-gradient(135deg,#f59e0b,#d97706)",
	};
	return map[color] || "linear-gradient(135deg,#2563eb,#1d4ed8)";
};

export const MediumMainStack = styled(Stack)(({ theme }) => ({
	gap: 14,
	[theme.breakpoints.down("md")]: {
		gap: 12,
	},
	[theme.breakpoints.down("sm")]: {
		gap: 10,
	},
}));

export const MediumGridTwo = styled(Box)(({ theme }) => ({
	display: "grid",
	gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
	gap: 14,
	[theme.breakpoints.down("md")]: {
		gridTemplateColumns: "1fr",
	},
}));

export const MediumGridThree = styled(Box)(({ theme }) => ({
	display: "grid",
	gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
	gap: 14,
	[theme.breakpoints.down("lg")]: {
		gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
	},
	[theme.breakpoints.down("md")]: {
		gridTemplateColumns: "1fr",
	},
}));

export const MediumKpiGrid = styled(Box)(({ theme }) => ({
	display: "grid",
	gridTemplateColumns: "repeat(4, 1fr)",
	gap: 14,
	[theme.breakpoints.down("md")]: {
		gridTemplateColumns: "repeat(2, 1fr)",
	},
	[theme.breakpoints.down("sm")]: {
		gridTemplateColumns: "1fr",
	},
}));

export const AlertBar = styled(Box)(({ theme }) => ({
	background: `linear-gradient(90deg, ${alpha(theme.palette.warning.light, 0.18)}, ${alpha(theme.palette.warning.main, 0.1)})`,
	borderBottom: `1px solid ${alpha(theme.palette.warning.main, 0.28)}`,
	padding: "8px 24px",
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 12,
	fontSize: 12.5,
	[theme.breakpoints.down("md")]: {
		flexDirection: "column",
		alignItems: "flex-start",
		padding: "12px 16px",
	},
}));

export const AlertItems = styled(Box)({
	display: "flex",
	alignItems: "center",
	flex: 1,
	flexWrap: "wrap",
	gap: 6,
});

export const AlertDot = styled(Box)({
	color: mediumPalette.orange,
	marginRight: 6,
	fontSize: 8,
});

export const AlertText = styled(PageTitle)(({ theme }) => ({
	fontSize: 12.5,
	color: theme.palette.text.secondary,
}));

export const AlertEmphasis = styled(Box)({
	color: mediumPalette.red,
	fontWeight: 700,
	display: "inline",
});

export const AlertSeparator = styled(Box)({
	color: mediumPalette.textMuted,
	margin: "0 10px",
});

export const AlertAction = styled(Button)(({ theme }) => ({
	color: theme.palette.text.primary,
	fontWeight: 600,
	fontSize: 12,
	cursor: "pointer",
	whiteSpace: "nowrap",
	border: `1px solid ${theme.palette.divider}`,
	borderRadius: 4,
	padding: "2px 10px",
	background: alpha(theme.palette.text.primary, 0.04),
	textTransform: "none",
}));

export const LeadPanelWrapper = styled(Box)(({ theme }) => ({
	background: theme.palette.background.paper,
	borderRadius: 12,
	boxShadow: theme.shadows[2],
	border: `1px solid ${theme.palette.divider}`,
	overflow: "hidden",
	height: 540,
	minHeight: 540,
	display: "flex",
	flexDirection: "column",
}));

export const LeadPanelHeader = styled(Box)(({ theme }) => ({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	padding: "16px 20px",
	borderBottom: `1px solid ${theme.palette.divider}`,
	gap: 10,
}));

export const LeadPanelTitleGroup = styled(Box)(() => ({
	display: "flex",
	alignItems: "center",
	gap: 8,
	fontSize: 25,
	fontWeight: 700,
}));

export const LeadPanelTitle = styled(PageTitle)(() => ({
	fontSize: 25,
	fontWeight: 700,
}));

export const LeadPanelLink = styled(Button)(({ theme }) => ({
	color: theme.palette.primary.main,
	fontSize: 11.5,
	fontWeight: 600,
	cursor: "pointer",
	whiteSpace: "nowrap",
	textTransform: "none",
	padding: 0,
	minWidth: "auto",
}));

export const LeadBadgeCount = styled(Box)({
	background: mediumPalette.orange,
	color: "#fff",
	fontSize: 10,
	fontWeight: 700,
	padding: "1px 6px",
	borderRadius: 20,
	minWidth: 20,
	textAlign: "center",
});

export const LeadTabRow = styled(Box)(({ theme }) => ({
	display: "flex",
	padding: "0 18px",
	borderBottom: `1px solid ${theme.palette.divider}`,
	background: alpha(theme.palette.text.primary, 0.02),
	overflowX: "auto",
}));

export const LeadTabButton = styled(Button, {
	shouldForwardProp: (prop) => prop !== "active",
})(({ active, theme }) => ({
	padding: "9px 12px",
	fontSize: 12,
	fontWeight: active ? 600 : 500,
	color: active ? theme.palette.primary.main : theme.palette.text.secondary,
	cursor: "pointer",
	borderBottom: `2px solid ${active ? theme.palette.primary.main : "transparent"}`,
	marginBottom: -1,
	transition: "all .2s",
	whiteSpace: "nowrap",
	textTransform: "none",
	borderRadius: 0,
	minWidth: "auto",
}));

export const LeadTabBadge = styled(Box, {
	shouldForwardProp: (prop) => prop !== "badgeColor",
})(({ badgeColor }) => ({
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	width: 18,
	height: 18,
	borderRadius: "50%",
	fontSize: 10,
	fontWeight: 700,
	marginLeft: 4,
	background: getMediumSoftColor(badgeColor),
	color: getMediumColor(badgeColor),
}));

export const MediumKpiCard = styled(Box, {
	shouldForwardProp: (prop) => prop !== "accentColor",
})(({ accentColor, theme }) => ({
	background: theme.palette.background.paper,
	height: "100%",
	display: "flex",
	flexDirection: "column",
	borderRadius: 12,
	padding: 20,
	boxShadow: theme.shadows[2],
	border: `1px solid ${theme.palette.divider}`,
	position: "relative",
	overflow: "hidden",
	textAlign: "left",
	transition: "transform .2s, box-shadow .2s",
	"&:hover": {
		transform: "translateY(-2px)",
		boxShadow: theme.shadows[4],
	},
	"&::before": {
		content: '""',
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		height: 10,
		background: accentColor,
	},
}));

export const MediumKpiValue = styled(PageTitle, {
	shouldForwardProp: (prop) => prop !== "accentColor",
})(({ accentColor, theme }) => ({
	// fontFamily: theme.PageTitle.fontFamily,
	fontFamily: theme.typography.fontFamily,
	fontSize: 48,
	fontWeight: 700,
	lineHeight: 1,
	marginBottom: 8,
	color: accentColor,
}));

export const MediumKpiSuffix = styled(Box)({
	fontSize: 22,
	fontWeight: 600,
	display: "inline-block",
	marginLeft: 2,
});

export const MediumKpiSubText = styled(PageTitle)(({ theme }) => ({
	fontSize: 11.5,
	color: theme.palette.text.secondary,
	marginBottom: 8,
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
}));

export const MediumKpiTrend = styled(Box, {
	shouldForwardProp: (prop) => prop !== "trendType",
})(({ trendType }) => ({
	fontSize: 11,
	display: "inline-flex",
	alignItems: "center",
	gap: 4,
	justifyContent: "flex-start",
	color: trendType === "down" ? mediumPalette.red : mediumPalette.green,
}));

export const MediumChipRow = styled(Box)({
	display: "flex",
	gap: 5,
	flexWrap: "wrap",
	justifyContent: "flex-start",
	marginTop: "auto",
	paddingTop: 10,
});

export const MediumChip = styled(Box, {
	shouldForwardProp: (prop) => prop !== "chipColor",
})(({ chipColor }) => ({
	fontSize: 10.5,
	padding: "2px 8px",
	borderRadius: 20,
	fontWeight: 500,
	background: getMediumSoftColor(chipColor === "default" ? "teal" : chipColor),
	color:
		chipColor === "default" ? mediumPalette.navy : getMediumColor(chipColor),
	border: `1px solid ${chipColor === "default" ? "rgba(0,169,157,.2)" : "rgba(10,34,64,.15)"}`,
}));

export const MediumKpiFooter = styled(Box)({
	display: "flex",
	gap: 12,
	marginTop: "auto",
	paddingTop: 10,
	justifyContent: "flex-start",
	fontSize: 11,
	flexWrap: "wrap",
});

export const MediumKpiStat = styled(Box)({
	display: "flex",
	alignItems: "center",
	gap: 3,
});

export const MediumDot = styled(Box, {
	shouldForwardProp: (prop) => prop !== "dotColor",
})(({ dotColor }) => ({
	width: 6,
	height: 6,
	borderRadius: "50%",
	background: getMediumColor(dotColor),
}));

export const MediumKpiFooterText = styled(Box, {
	shouldForwardProp: (prop) => prop !== "textColor",
})(({ textColor }) => ({
	color: textColor ? getMediumColor(textColor) : mediumPalette.textSecondary,
}));

export const ScrollPanel = styled(Box)(({ theme }) => ({
	height: "29rem",
	minHeight: "29rem",
	overflowY: "auto",
	scrollbarWidth: "none",
	paddingBottom: theme.spacing(1.25),
	msOverflowStyle: "none",
	"&::-webkit-scrollbar": {
		display: "none",
		width: 0,
		height: 0,
	},
}));

export const ApprovalScrollPanel = styled(ScrollPanel)({
	height: "25rem",
	minHeight: "25rem",
});

export const StackedBarWrap = styled(Box)(({ theme }) => ({
	padding: theme.spacing(0, 2.25, 1.5),
	// padding: "14px 18px 12px",
	borderBottom: `1px solid ${mediumPalette.border}`,
}));

export const SectionMiniTitle = styled(PageTitle)(() => ({
	fontSize: 14,
	fontWeight: 700,
	textTransform: "uppercase",
	letterSpacing: 0.5,
	marginBottom: 8,
	color: "#5A6573"
}));

export const LegendRow = styled(Box)({
	display: "flex",
	gap: 14,
	marginBottom: 8,
	flexWrap: "wrap",
	justifyContent: "end"
});

export const LegendItem = styled(MarginControlBox)(({ theme }) => ({
	width: "unset",
	display: "flex",
	alignItems: "center",
	gap: 5,
	fontSize: 11,
	color: theme.palette.text.primary,
	// color: mediumPalette.textSecondary,
}));

export const LegendSquare = styled(Box, {
	shouldForwardProp: (prop) => prop !== "squareColor",
})(({ squareColor }) => ({
	width: 8,
	height: 8,
	borderRadius: "50%",
	flexShrink: 0,
	background: squareColor,
}));

export const StackedTrack = styled(Box)({
	height: 28,
	borderRadius: 100,
	overflow: "hidden",
	display: "flex",
	background: mediumPalette.bg,
});

export const StackedSegment = styled(Box, {
	shouldForwardProp: (prop) => prop !== "segWidth" && prop !== "segColor",
})(({ segWidth, segColor }) => ({
	width: `${segWidth}%`,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	fontSize: 14,
	fontWeight: 700,
	color: "#fff",
	overflow: "hidden",
	whiteSpace: "nowrap",
	background: segColor,
	transformOrigin: "left center",
	animation: "mediumStackBoot .9s ease-out",
	"@keyframes mediumStackBoot": {
		from: {
			transform: "scaleX(0)",
			opacity: 0.75,
		},
		to: {
			transform: "scaleX(1)",
			opacity: 1,
		},
	},
}));

export const DeptMetricsWrap = styled(Box)({
	padding: "12px 16px 14px",
});

export const BigStatsRow = styled(Box)({
	display: "flex",
	marginBottom: 14,
});

export const BigStatItem = styled(Box)({
	flex: 1,
	textAlign: "center",
	padding: "0 10px",
	borderRight: `1px solid ${mediumPalette.border}`,
	"&:last-child": {
		borderRight: "none",
	},
});

export const BigStatValue = styled(PageTitle, {
	shouldForwardProp: (prop) => prop !== "valueColor",
})(({ valueColor, theme }) => ({
	fontFamily: theme.typography.fontFamily,
	fontSize: 26,
	fontWeight: 700,
	lineHeight: 1,
	color: valueColor,
}));

export const BigStatLabel = styled(PageTitle)(() => ({
	fontSize: 13,
	color: "#94A3B8",
	fontWeight: 600,
	marginTop: 3,
}));

export const BigStatSubLabel = styled(BigStatLabel)(() => ({
	fontSize: 11,
}));

export const ResourceRow = styled(Box)(({ theme }) => ({
	display: "flex",
	alignItems: "center",
	gap: 8,
	padding: theme.spacing(1.25, 0),
	// padding: "5px 0",
}));

export const ResourceListScrollPanel = styled(Box)({
	maxHeight: "9.5rem",
	overflowY: "scroll",
	paddingRight: 4,
	scrollbarWidth: "none",
	msOverflowStyle: "none",
	"&::-webkit-scrollbar": {
		width: 0,
		height: 0,
		display: "none",
	},
	"&::-webkit-scrollbar-thumb": {
		display: "none",
	},
	"&::-webkit-scrollbar-track": {
		display: "none",
	},
});

export const ResourceName = styled(PageTitle)(() => ({
	fontSize: 12,
	// color: mediumPalette.textPrimary,
	width: 105,
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
}));

export const ResourceBar = styled(Box)(({ theme }) => ({
	flex: 1,
	height: 8,
	background: alpha(theme.palette.text.primary, 0.08),
	borderRadius: 4,
	overflow: "hidden",
}));

export const ResourceFill = styled(Box, {
	shouldForwardProp: (prop) => prop !== "fillWidth" && prop !== "fillColor",
})(({ fillWidth, fillColor }) => ({
	height: "100%",
	width: `${fillWidth}%`,
	borderRadius: 4,
	background: getMediumColor(fillColor),
	transformOrigin: "left center",
	animation: "mediumResourceBoot .85s ease-out",
	"@keyframes mediumResourceBoot": {
		from: {
			transform: "scaleX(0)",
			opacity: 0.8,
		},
		to: {
			transform: "scaleX(1)",
			opacity: 1,
		},
	},
}));

export const ResourcePercent = styled(PageTitle, {
	shouldForwardProp: (prop) => prop !== "textColor",
})(({ textColor }) => ({
	fontSize: 11.5,
	fontWeight: 700,
	width: 34,
	textAlign: "right",
	color: getMediumColor(textColor),
}));

export const EmployeeTableWrap = styled(Box)({
	width: "100%",
	padding: "0 18px 16px",
	overflowX: "auto",
});

export const EmployeeTableScrollPanel = styled(Box)({
	height: "29rem",
	minHeight: "29rem",
	overflowY: "auto",
	scrollbarWidth: "none",
	msOverflowStyle: "none",
	"&::-webkit-scrollbar": {
		display: "none",
		width: 0,
		height: 0,
	},
});

export const StyledEmployeeTable = styled("table")({
	width: "100%",
	borderCollapse: "collapse",
});

export const EmployeeTh = styled("th")(({ theme }) => ({
	fontSize: 10.5,
	fontWeight: 600,
	color: mediumPalette.textMuted,
	textTransform: "uppercase",
	letterSpacing: 0.5,
	padding: "10px 8px 8px",
	textAlign: "left",
	whiteSpace: "nowrap",
	backgroundColor: alpha(theme.palette.text.primary, 0.02),
}));

export const EmployeeTd = styled("td")(({ theme }) => ({
	padding: "10px 8px",
	borderTop: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
	verticalAlign: "middle",
}));

export const EmployeeInfo = styled(Box)({
	display: "flex",
	alignItems: "center",
	gap: 10,
});

export const EmployeeAvatar = styled(Box, {
	shouldForwardProp: (prop) => prop !== "avatarColor",
})(({ avatarColor }) => ({
	width: 30,
	height: 30,
	borderRadius: "50%",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	fontWeight: 700,
	fontSize: 11,
	color: "#fff",
	flexShrink: 0,
	background: getMediumGradient(avatarColor),
}));

export const EmployeeName = styled(PageTitle)({
	fontWeight: 600,
	fontSize: 12.5,
	// color: mediumPalette.textPrimary,
});

export const EmployeeRole = styled(PageTitle)({
	fontSize: 10.5,
	color: mediumPalette.textMuted,
	marginTop: 1,
});

export const EmployeeTask = styled(PageTitle)(() => ({
	fontSize: 12,
	// color: mediumPalette.textSecondary,
	maxWidth: 150,
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
}));

export const EmployeeProgressWrap = styled(Box)({
	display: "flex",
	alignItems: "center",
});

export const EmployeeProgressBar = styled(Box)(({ theme }) => ({
	height: 6,
	background: alpha(theme.palette.text.primary, 0.08),
	borderRadius: 3,
	width: 80,
	overflow: "hidden",
}));

export const EmployeeProgressFill = styled(Box, {
	shouldForwardProp: (prop) => prop !== "fillWidth" && prop !== "fillColor",
})(({ fillWidth, fillColor }) => ({
	height: "100%",
	width: `${fillWidth}%`,
	background: getMediumColor(fillColor),
}));

export const EmployeeProgressText = styled(PageTitle, {
	shouldForwardProp: (prop) => prop !== "textColor",
})(({ textColor }) => ({
	fontSize: 11,
	fontWeight: 600,
	marginLeft: 6,
	color: getMediumColor(textColor),
}));

export const StatusBadge = styled(Box, {
	shouldForwardProp: (prop) => prop !== "statusType",
})(({ statusType }) => ({
	display: "inline-flex",
	alignItems: "center",
	gap: 4,
	fontSize: 11,
	fontWeight: 500,
	padding: "2px 8px",
	borderRadius: 20,
	color:
		statusType === "ok"
			? mediumPalette.green
			: statusType === "warn"
				? mediumPalette.orange
				: mediumPalette.red,
	background:
		statusType === "ok"
			? mediumPalette.greenPale
			: statusType === "warn"
				? mediumPalette.orangePale
				: mediumPalette.redPale,
}));

export const ApprovalTabRow = styled(Box)({
	display: "flex",
	borderBottom: `1px solid ${mediumPalette.border}`,
});

export const ApprovalTabButton = styled(Button, {
	shouldForwardProp: (prop) => prop !== "active",
})(({ active, theme }) => ({
	flex: 1,
	padding: "9px 0",
	textAlign: "center",
	fontSize: 11.5,
	fontWeight: 600,
	color: active ? theme.palette.text.primary : mediumPalette.textSecondary,
	// color: active ? mediumPalette.navy : mediumPalette.textSecondary,
	cursor: "pointer",
	borderBottom: `2px solid ${active ? mediumPalette.teal : "transparent"}`,
	transition: "all .15s",
	textTransform: "none",
	borderRadius: 0,
}));

export const DonutWrap = styled(Box)(({ theme, nonePdTop }) => ({
	padding: nonePdTop ? theme.spacing(0, 2.25, 2.25) : theme.spacing(2.25),
	// padding: 18,
	display: "flex",
	flexDirection: "row",
	alignItems: "center",
	gap: 20,
	justifyContent: "center",
	[theme.breakpoints.down("sm")]: {
		flexDirection: "column",
	},
}));

export const DonutLegend = styled(Box)({
	display: "flex",
	flexDirection: "column",
	gap: 10,
});

export const DonutLegendRow = styled(Box)({
	display: "grid",
	gridTemplateColumns: "12px 1fr auto",
	alignItems: "center",
	gap: 7,
});

export const DonutLegendDot = styled(Box, {
	shouldForwardProp: (prop) => prop !== "dotColor",
})(({ dotColor }) => ({
	width: 10,
	height: 10,
	borderRadius: 3,
	background: getMediumColor(dotColor),
}));

export const DonutLegendLabel = styled(PageTitle)(({ theme }) => ({
	fontSize: 15,
	color: "#8A97A8",
	whiteSpace: "nowrap",
	textTransform: "uppercase",
	fontWeight: 400,
	paddingBottom: theme.spacing(0.5),
}));

export const DonutLegendPercent = styled(PageTitle, {
	shouldForwardProp: (prop) => prop !== "textColor",
})(({ textColor, theme }) => ({
	fontFamily: theme.typography.fontFamily,
	fontSize: 14,
	fontWeight: 700,
	lineHeight: 1,
	color: getMediumColor(textColor),
}));

export const DonutSummary = styled(Box)({
	display: "flex",
	borderTop: `1px solid ${mediumPalette.border}`,
	width: "100%",
});

export const DonutSummaryItem = styled(Box)({
	flex: 1,
	padding: "10px 0",
	textAlign: "center",
	borderRight: `1px solid ${mediumPalette.border}`,
	"&:last-child": {
		borderRight: "none",
	},
});

export const DonutSummaryValue = styled(PageTitle, {
	shouldForwardProp: (prop) => prop !== "textColor",
})(({ textColor, theme }) => ({
	fontFamily: theme.typography.fontFamily,
	fontSize: 32,
	fontWeight: 700,
	lineHeight: 1,
	color: getMediumColor(textColor),
	paddingBottom: theme.spacing(0.5),
}));

export const DonutSummaryValuePercent = styled(PageTitle, {
	shouldForwardProp: (prop) => prop !== "textColor",
})(({ textColor, theme }) => ({
	fontFamily: theme.typography.fontFamily,
	fontSize: 14,
	fontWeight: 700,
	lineHeight: 1,
	color: getMediumColor(textColor),
}));

export const BreakdownWrap = styled(Box)({
	padding: "12px 18px 12px",
	borderTop: `1px solid ${mediumPalette.border}`,
});

export const BreakdownTitle = styled(PageTitle)(() => ({
	fontSize: 11,
	fontWeight: 700,
	// color: mediumPalette.textSecondary,
	textTransform: "uppercase",
	letterSpacing: 0.5,
	marginBottom: 10,
	display: "block",
}));

export const BreakdownRow = styled(Box)({
	display: "grid",
	gridTemplateColumns: "24px minmax(120px, 1fr) minmax(220px, 1.8fr) auto",
	alignItems: "center",
	columnGap: 12,
	padding: "12px 0",
	borderBottom: `1px solid ${mediumPalette.border}`,
	"&:last-child": {
		borderBottom: "none",
		paddingBottom: 0,
	},
});

export const BreakdownList = styled(Stack)({
	gap: 0,
	width: "100%",
});

export const BreakdownBar = styled(Box)({
	width: "100%",
	height: 8,
	borderRadius: 999,
	background: "#DDE5EE",
	overflow: "hidden",
});

export const BreakdownBarFill = styled(Box, {
	shouldForwardProp: (prop) => prop !== "fillWidth" && prop !== "fillColor",
})(({ fillWidth, fillColor }) => ({
	height: "100%",
	width: `${fillWidth}%`,
	borderRadius: 3,
	background: fillColor,
	transformOrigin: "left center",
	animation: "mediumBreakdownBoot .8s ease-out",
	"@keyframes mediumBreakdownBoot": {
		from: {
			transform: "scaleX(0)",
			opacity: 0.8,
		},
		to: {
			transform: "scaleX(1)",
			opacity: 1,
		},
	},
}));

export const BreakdownLabel = styled(PageTitle)(() => ({
	fontSize: 12,
	fontWeight: 600,
	color: mediumPalette.textPrimary,
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
}));

export const BreakdownValue = styled(PageTitle)(({ clText }) => ({
	fontSize: 10,
	fontWeight: 700,
	color: clText,
	minWidth: 60,
	textAlign: "right",
}));

export const GlobalActionRow = styled(Box)({
	display: "flex",
	gap: 8,
	padding: "0 16px 12px",
});

export const ApprovalList = styled(Stack)(({ theme, nonePdTop }) => ({
	// padding: "10px 16px 14px",
	padding: nonePdTop ? theme.spacing(0, 2, 1.75) : theme.spacing(1.25, 2, 1.75),
	gap: theme.spacing(1.25),
	// height: "26.5rem",
	// minHeight: "26.5rem",
	height: "29rem",
	minHeight: "29rem",
	overflowY: "auto",
	scrollbarWidth: "none",
	msOverflowStyle: "none",
	"&::-webkit-scrollbar": {
		display: "none",
		width: 0,
		height: 0,
	},
}));

/**
 * ApprovalListInner: phiên bản không có scroll riêng của ApprovalList.
 * Dùng khi đặt bên trong ApprovalScrollPanel — để ApprovalScrollPanel
 * là scroll container duy nhất, tránh double-scroll container.
 */
export const ApprovalListInner = styled(Stack)(({ theme, nonePdTop }) => ({
	padding: nonePdTop ? theme.spacing(0, 2, 1.75) : theme.spacing(1.25, 2, 1.75),
	gap: theme.spacing(1.25),
}));

export const ApprovalItemWrap = styled(Box, {
	shouldForwardProp: (prop) => prop !== "overdue",
})(({ overdue, theme, styleCursor }) => ({
	border: `1px solid ${theme.palette.divider}`,
	borderRadius: 8,
	padding: "12px 14px",
	background: alpha(theme.palette.background.default, 0.7),
	transition: "border-color .2s, box-shadow .2s",
	borderLeft: overdue
		? `3px solid ${mediumPalette.red}`
		: `1px solid ${theme.palette.divider}`,
	"&:hover": {
		borderColor: mediumPalette.teal,
		boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.16)}`,
	},
	cursor: styleCursor ? 'pointer' : 'default'
}));

export const ApprovalMeta = styled(Box)({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	marginBottom: 5,
	gap: 10,
});

export const ApprovalMetaLeft = styled(Box)({
	display: "flex",
	alignItems: "center",
	gap: 8,
	minWidth: 0,
});

export const ApprovalSender = styled(PageTitle)(() => ({
	fontSize: 11,
	// color: mediumPalette.textMuted,
}));

export const ApprovalTitle = styled(PageTitle)(() => ({
	fontSize: 12.5,
	fontWeight: 600,
	// color: mediumPalette.textPrimary,
	marginBottom: 4,
	lineHeight: 1.35,
}));

export const OverdueBadge = styled(Box)({
	fontSize: 10,
	fontWeight: 700,
	padding: "2px 8px",
	borderRadius: 3,
	background: mediumPalette.redPale,
	color: mediumPalette.red,
	whiteSpace: "nowrap",
	border: "1px solid rgba(230,57,70,.2)",
});

export const ApprovalActions = styled(Box)({
	display: "flex",
	gap: 6,
	marginTop: 8,
});

export const ApprovalActionButton = styled(Button, {
	shouldForwardProp: (prop) => prop !== "actionColor",
})(({ actionColor }) => ({
	padding: "4px 12px",
	borderRadius: 4,
	fontSize: 11,
	fontWeight: 600,
	cursor: "pointer",
	border: "1px solid",
	transition: "all .15s",
	textTransform: "none",
	minWidth: "auto",
	background: getMediumSoftColor(actionColor),
	color: getMediumColor(actionColor),
	borderColor: getMediumColor(actionColor),
}));

export const ApprovalActionButtonFlex = styled(ApprovalActionButton)({
	flex: 1,
});

export const DocumentTabRow = styled(Box)(({ theme }) => ({
	display: "flex",
	padding: "0 16px",
	borderBottom: `1px solid ${theme.palette.divider}`,
	background: alpha(theme.palette.text.primary, 0.02),
}));

export const DocumentTabButton = styled(Button, {
	shouldForwardProp: (prop) => prop !== "active",
})(({ active, theme }) => ({
	padding: "8px 12px",
	fontSize: 12,
	fontWeight: active ? 600 : 500,
	color: active ? mediumPalette.teal : theme.palette.text.secondary,
	// color: active ? mediumPalette.teal : mediumPalette.textSecondary,
	cursor: "pointer",
	borderBottom: `2px solid ${active ? mediumPalette.teal : "transparent"}`,
	marginBottom: -1,
	transition: "all .2s",
	textTransform: "none",
	borderRadius: 0,
	minWidth: "auto",
}));

export const DocumentList = styled(Stack)(({ theme }) => ({
	padding: theme.spacing(0, 1.75, 1.75),
	// padding: "12px 14px 14px",
	height: "34.7rem",
	minHeight: "24.7rem",
	overflowY: "auto",
	gap: 10,
	scrollbarWidth: "none",
	msOverflowStyle: "none",
	"&::-webkit-scrollbar": {
		display: "none",
		width: 0,
		height: 0,
	},
}));

export const DocumentItem = styled(Box)(({ theme, styleCursor }) => ({
	display: "flex",
	alignItems: "center",
	gap: 14,
	padding: "12px",
	borderRadius: 16,
	background: alpha(theme.palette.text.primary, 0.045),
	border: `1px solid ${alpha(theme.palette.text.primary, 0.05)}`,
	"&:last-child": {
		borderBottom: "none",
	},
	"&:hover": {
		background: alpha(theme.palette.text.primary, 0.065),
	},
	cursor: styleCursor ? 'pointer' : 'default'
}));

export const DocumentTime = styled(PageTitle)({
	display: "flex",
	flexDirection: "column",
	justifyContent: "center",
	alignItems: "center",
	gap: 2,
	width: 64,
	minWidth: 64,
	height: 64,
	padding: "4px 6px",
	boxSizing: "border-box",
	borderRadius: 16,
	background: "#2466B0",
	color: "#fff",
	textAlign: "center",
	boxShadow: "0 8px 16px rgba(36, 102, 176, 0.24)",
	"& .document-day": {
		display: "block",
		maxWidth: "100%",
		fontSize: 20,
		lineHeight: 1,
		fontWeight: 700,
		whiteSpace: "nowrap",
	},
	"& .document-day.is-text": {
		fontSize: 14,
		lineHeight: 1.15,
		whiteSpace: "normal",
		overflowWrap: "anywhere",
	},
	"& .document-month": {
		fontSize: 10,
		fontWeight: 700,
		letterSpacing: 0.4,
		textTransform: "uppercase",
	},
});

export const DocumentBody = styled(Box)({
	flex: 1,
	minWidth: 0,
});

export const DocumentTitle = styled(PageTitle)(() => ({
	fontSize: 13.5,
	fontWeight: 700,
	// color: mediumPalette.textPrimary,
	lineHeight: 1.2,
	marginBottom: 8,
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
}));

export const DocumentFrom = styled(PageTitle)({
	fontSize: 11.5,
	fontWeight: 500,
	color: mediumPalette.textMuted,
	flex: 1,
	minWidth: 0,
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
});

export const DocumentMetaRow = styled(Box)({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 12,
});

export const DocumentTagRow = styled(Box)({
	display: "flex",
	gap: 8,
	flexWrap: "wrap",
	alignItems: "center",
	justifyContent: "flex-end",
	minWidth: 0,
});

export const DocumentTag = styled(Box, {
	shouldForwardProp: (prop) => prop !== "tagType",
})(({ tagType }) => {
	const configs = {
		red: {
			bg: mediumPalette.redPale,
			color: mediumPalette.red,
			border: "rgba(230,57,70,.2)",
		},
		redSolid: { bg: "#fde8ea", color: "#b91c1c", border: "rgba(185,28,28,.2)" },
		orangeSolid: {
			bg: mediumPalette.orangePale,
			color: "#c2410c",
			border: "rgba(194,65,12,.2)",
		},
		normal: {
			bg: mediumPalette.tealPale,
			color: mediumPalette.teal,
			border: "rgba(0,169,157,.2)",
		},
		out: {
			bg: "rgba(10,34,64,.07)",
			color: mediumPalette.navy,
			border: "rgba(10,34,64,.15)",
		},
		warn: {
			bg: mediumPalette.orangePale,
			color: mediumPalette.orange,
			border: "rgba(245,130,31,.2)",
		},
		waiting: {
			bg: mediumPalette.tealPale,
			color: mediumPalette.teal,
			border: "rgba(0,169,157,.2)",
		},
	};
	const current = configs[tagType] || configs.normal;
	return {
		fontSize: 11,
		padding: "4px 12px",
		borderRadius: 999,
		fontWeight: 600,
		letterSpacing: 0.3,
		lineHeight: 1,
		whiteSpace: "nowrap",
		background: current.bg,
		color: current.color,
		border: `1px solid ${current.border}`,
	};
});

export const CertifyToggle = styled(Button, {
	shouldForwardProp: (prop) => prop !== "active",
})(({ active }) => ({
	display: "inline-flex",
	alignItems: "center",
	gap: 0,
	padding: "4px 12px",
	borderRadius: 999,
	fontSize: 11,
	fontWeight: 600,
	cursor: "pointer",
	userSelect: "none",
	transition: "all .18s",
	border: "1px solid",
	whiteSpace: "nowrap",
	flexShrink: 0,
	marginLeft: "auto",
	textTransform: "none",
	color: active ? "#185DAB" : "#8A99AB",
	background: active ? "#DDE9F9" : "#E3E8F0",
	borderColor: active ? "#C5D8F3" : "#D5DCE5",
	boxShadow: "none",
	minWidth: "auto",
}));

export const CertifyDot = styled(Box, {
	shouldForwardProp: (prop) => prop !== "active",
})(({ active }) => ({
	width: 6,
	height: 6,
	borderRadius: "50%",
	flexShrink: 0,
	background: active ? mediumPalette.yellow : mediumPalette.textMuted,
}));

export const HeatmapWrap = styled(Box)({
	padding: "14px 18px",
});

export const HeatmapLabel = styled(PageTitle)({
	fontSize: 11,
	color: mediumPalette.textSecondary,
	marginBottom: 8,
	fontWeight: 500,
});

export const HeatmapColLabels = styled(Box)({
	display: "grid",
	gridTemplateColumns: "repeat(7,1fr)",
	gap: 3,
	marginBottom: 4,
});

export const HeatmapColLabel = styled(PageTitle)({
	fontSize: 9.5,
	color: mediumPalette.textMuted,
	textAlign: "center",
	fontWeight: 500,
});

export const HeatmapGrid = styled(Box)({
	display: "grid",
	gridTemplateColumns: "repeat(7,1fr)",
	gap: 3,
	marginBottom: 8,
});

export const HeatmapCell = styled(Box, {
	shouldForwardProp: (prop) => prop !== "cellColor",
})(({ cellColor }) => ({
	height: 26,
	borderRadius: 4,
	cursor: "pointer",
	transition: "transform .15s",
	background: cellColor,
	"&:hover": {
		transform: "scale(1.1)",
	},
}));

export const HeatmapLegend = styled(Box)({
	display: "flex",
	gap: 5,
	alignItems: "center",
});

export const HeatmapLegendLabel = styled(PageTitle)({
	fontSize: 10,
	color: mediumPalette.textMuted,
});

export const HeatmapLegendDot = styled(Box, {
	shouldForwardProp: (prop) => prop !== "dotColor",
})(({ dotColor }) => ({
	width: 12,
	height: 12,
	borderRadius: 2,
	background: dotColor,
}));

export const SectionDividerTop = styled(Box)({
	borderTop: `1px solid ${mediumPalette.border}`,
	padding: "10px 18px 6px",
});

export const ProjectList = styled(Stack)({
	padding: "0 18px 16px",
	gap: 10,
	height: "22rem",
	minHeight: "11rem",
	overflowY: "auto",
	scrollbarWidth: "none",
	msOverflowStyle: "none",
	"&::-webkit-scrollbar": {
		display: "none",
		width: 0,
		height: 0,
	},
});

export const LeadProjectItem = styled(Box)((styleCursor) => ({
	border: `1px solid ${mediumPalette.border}`,
	borderRadius: 8,
	padding: "12px 14px",
	cursor: styleCursor ? 'pointer' : 'default'
}));

export const LeadProjectHeader = styled(Box)({
	display: "flex",
	justifyContent: "space-between",
	alignItems: "flex-start",
	marginBottom: 8,
	gap: 8,
});

export const LeadProjectName = styled(PageTitle)(() => ({
	fontSize: 12.5,
	fontWeight: 600,
	// color: mediumPalette.textPrimary,
}));

export const LeadProjectStatus = styled(Box, {
	shouldForwardProp: (prop) => prop !== "statusType",
})(({ statusType }) => ({
	fontSize: 10.5,
	fontWeight: 600,
	padding: "2px 7px",
	borderRadius: 3,
	background:
		statusType === "ok"
			? mediumPalette.greenPale
			: statusType === "warn"
				? mediumPalette.orangePale
				: mediumPalette.redPale,
	color:
		statusType === "ok"
			? mediumPalette.green
			: statusType === "warn"
				? mediumPalette.orange
				: mediumPalette.red,
}));

export const LeadProjectMeta = styled(Box)({
	fontSize: 10.5,
	color: mediumPalette.textMuted,
	marginBottom: 8,
	display: "flex",
	gap: 10,
	flexWrap: "wrap",
});

export const LeadProjectMetaHighlight = styled(Box)({
	color: mediumPalette.teal,
	fontWeight: 600,
	display: "inline",
	marginLeft: 2,
});

export const LeadProjectProgress = styled(Box)({
	display: "flex",
	alignItems: "center",
	gap: 8,
});

export const LeadProjectProgressBar = styled(Box)({
	flex: 1,
	height: 6,
	background: "#e8f0f5",
	borderRadius: 3,
	overflow: "hidden",
});

export const LeadProjectProgressFill = styled(Box, {
	shouldForwardProp: (prop) => prop !== "fillWidth" && prop !== "fillColor",
})(({ fillWidth, fillColor }) => ({
	height: "100%",
	width: `${fillWidth}%`,
	borderRadius: 3,
	background: getMediumColor(fillColor),
}));

export const LeadProjectProgressText = styled(PageTitle, {
	shouldForwardProp: (prop) => prop !== "textColor",
})(({ textColor }) => ({
	fontSize: 11.5,
	fontWeight: 700,
	minWidth: 30,
	textAlign: "right",
	color: getMediumColor(textColor),
}));

export const MeetingList = styled(Stack)({
	padding: "12px 14px 14px",
	gap: 10,
	height: "37.2rem",
	minHeight: "37.2rem",
	overflowY: "auto",
	scrollbarWidth: "none",
	msOverflowStyle: "none",
	"&::-webkit-scrollbar": {
		display: "none",
		width: 0,
		height: 0,
	},
});

export const MeetingSeparator = styled(PageTitle)({
	fontSize: 11,
	fontWeight: 700,
	color: mediumPalette.textSecondary,
	textTransform: "uppercase",
	letterSpacing: 0.5,
	padding: "6px 2px",
	borderTop: `1px solid ${mediumPalette.border}`,
	borderBottom: `1px solid ${mediumPalette.border}`,
	margin: "2px 0 0",
});

export const LeadMeetingItem = styled(Box)(({ theme, styleCursor }) => ({
	display: "flex",
	alignItems: "center",
	gap: 12,
	padding: "12px",
	borderRadius: 16,
	// background: alpha(theme.palette.text.primary, 0.045),
	background: theme.palette.background.paper,
	border: `1px solid ${alpha(theme.palette.text.primary, 0.05)}`,
	"&:hover": {
		background: alpha(theme.palette.text.primary, 0.065),
	},
	cursor: styleCursor ? 'pointer' : 'default'
}));

export const LeadMeetingTime = styled(Box, {
	shouldForwardProp: (prop) => prop !== "blockColor",
})(({ blockColor }) => ({
	width: 64,
	minWidth: 64,
	height: 64,
	padding: "4px 6px",
	boxSizing: "border-box",
	borderRadius: 16,
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	gap: 2,
	fontWeight: 700,
	color: "#fff",
	flexShrink: 0,
	background: blockColor,
	boxShadow: "0 8px 16px rgba(36, 102, 176, 0.24)",
}));

export const LeadMeetingTimeValue = styled(PageTitle)(({status}) => ({
	display: "block",
	maxWidth: "100%",
	fontFamily: "inherit",
	fontSize: 19,
	lineHeight: 1,
	fontWeight: 700,
	color: ['CONFIRMED', 'DONE', 'PROCESSING'].includes(status) ? "#fff" : "#565D6D",
	whiteSpace: "nowrap",
}));

export const LeadMeetingDay = styled(PageTitle)(({status}) => ({
	fontSize: 10,
	fontWeight: 700,
	letterSpacing: 0.5,
	textTransform: "uppercase",
	textAlign: "center",
	color: ['CONFIRMED', 'DONE', 'PROCESSING'].includes(status) ? "#fff" : "#565D6D",
}));

export const LeadMeetingBody = styled(Box)({
	flex: 1,
	minWidth: 0,
	display: "flex",
	flexDirection: "column",
	justifyContent: "center",
});

export const LeadMeetingTitle = styled(PageTitle)(() => ({
	fontSize: 12.5,
	fontWeight: 700,
	// color: mediumPalette.textPrimary,
	lineHeight: 1.2,
	marginBottom: 6,
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
}));

export const LeadMeetingMeta = styled(PageTitle)({
	fontSize: 11.5,
	color: mediumPalette.textSecondary,
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
});

export const LeadMeetingRight = styled(Box)({
	display: "flex",
	flexDirection: "column",
	alignItems: "flex-end",
	gap: 5,
	flexShrink: 0,
	minWidth: 0,
});

export const LeadMeetingActions = styled(Box)({
	display: "flex",
	gap: 5,
});

export const LeadMeetingButton = styled(Button, {
	shouldForwardProp: (prop) => prop !== "variantType",
})(({ variantType }) => ({
	padding: "4px 10px",
	borderRadius: 4,
	fontSize: 11,
	fontWeight: 600,
	cursor: "pointer",
	transition: "all .15s",
	whiteSpace: "nowrap",
	textTransform: "none",
	minWidth: "auto",
	border:
		variantType === "outline" ? `1px solid ${mediumPalette.border}` : "none",
	background: variantType === "outline" ? "transparent" : mediumPalette.teal,
	color: variantType === "outline" ? mediumPalette.textSecondary : "#fff",
}));

export const LeadMeetingNote = styled(PageTitle, {
	shouldForwardProp: (prop) => prop !== "textColor",
})(({ textColor }) => ({
	fontSize: 10,
	color: getMediumColor(textColor),
	fontWeight: 700,
}));

export const UpcomingList = styled(Box)({
	display: "flex",
	flexDirection: "column",
	flex: 1,
	padding: "12px 14px 14px",
	gap: 10,
	height: "22rem",
	minHeight: "22rem",
	overflowY: "auto",
	scrollbarWidth: "none",
	msOverflowStyle: "none",
	"&::-webkit-scrollbar": {
		display: "none",
		width: 0,
		height: 0,
	},
});

export const UpcomingItem = styled(Box, {
	shouldForwardProp: (prop) => prop !== "styleCursor",
})(({ theme, styleCursor }) => ({
	display: "flex",
	alignItems: "center",
	gap: 12,
	padding: "12px",
	borderRadius: 16,
	background: alpha(theme.palette.text.primary, 0.045),
	border: `1px solid ${alpha(theme.palette.text.primary, 0.05)}`,
	cursor: styleCursor ? "pointer" : "default",
	"&:hover": {
		background: alpha(theme.palette.text.primary, 0.065),
	},
}));

export const UpcomingDate = styled(Box)(() => ({
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	gap: 2,
	width: 64,
	minWidth: 64,
	height: 64,
	padding: "4px 6px",
	boxSizing: "border-box",
	borderRadius: 16,
	background: "#2466B0",
	color: "#fff",
	textAlign: "center",
	boxShadow: "0 8px 16px rgba(36, 102, 176, 0.24)",
	flexShrink: 0,
}));

export const UpcomingDay = styled(PageTitle, {
	shouldForwardProp: (prop) => prop !== "isTextDay",
})(({ isTextDay }) => ({
	display: "block",
	maxWidth: "100%",
	fontFamily: "inherit",
	fontSize: isTextDay ? 14 : 20,
	fontWeight: 700,
	lineHeight: isTextDay ? 1.15 : 1,
	whiteSpace: isTextDay ? "normal" : "nowrap",
	overflowWrap: isTextDay ? "anywhere" : "normal",
	color: "#fff",
}));

export const UpcomingMonth = styled(PageTitle)({
	fontSize: 10,
	fontWeight: 700,
	textTransform: "uppercase",
	letterSpacing: 0.5,
	marginTop: 1,
	color: "#fff",
});

export const UpcomingBody = styled(Box)({
	flex: 1,
	minWidth: 0,
});

export const UpcomingTitle = styled(PageTitle)({
	fontSize: 12.5,
 	fontWeight: 700,
	color: mediumPalette.textPrimary,
	lineHeight: 1.2,
	marginBottom: 8,
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
});

export const UpcomingMeta = styled(PageTitle)({
	fontSize: 11.5,
	fontWeight: 500,
	color: mediumPalette.textMuted,
	lineHeight: 1.3,
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
});

export const UtilityWrap = styled(Box)({
	padding: "14px 16px",
	height: "22rem",
	minHeight: "22rem",
	overflowY: "auto",
	scrollbarWidth: "none",
	msOverflowStyle: "none",
	"&::-webkit-scrollbar": {
		display: "none",
		width: 0,
		height: 0,
	},
});

export const UtilityGrid = styled(Box)({
	display: "grid",
	gridTemplateColumns: "repeat(3,1fr)",
	gap: 10,
	marginBottom: 14,
});

export const UtilityItem = styled(Box)({
	border: `1px solid ${mediumPalette.border}`,
	borderRadius: 8,
	padding: "12px 10px",
	textAlign: "center",
	cursor: "pointer",
	transition: "all .2s",
	position: "relative",
	"&:hover": {
		borderColor: mediumPalette.teal,
		background: mediumPalette.tealPale,
	},
});

export const UtilityIcon = styled(PageTitle)({
	fontSize: 22,
	marginBottom: 6,
	display: "block",
});

export const UtilityLabel = styled(PageTitle)({
	fontSize: 11,
	fontWeight: 600,
	color: mediumPalette.textPrimary,
});

export const UtilityBadge = styled(Box, {
	shouldForwardProp: (prop) => prop !== "badgeColor",
})(({ badgeColor }) => ({
	position: "absolute",
	top: -6,
	right: -6,
	background: getMediumColor(badgeColor),
	color: "#fff",
	fontSize: 10,
	fontWeight: 700,
	minWidth: 18,
	height: 18,
	borderRadius: 9,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	padding: "0 4px",
}));

export const UtilityStatsWrap = styled(Box)({
	borderTop: `1px solid ${mediumPalette.border}`,
	paddingTop: 12,
});

export const UtilityStatsTitle = styled(PageTitle)(() => ({
	fontSize: 11,
	fontWeight: 600,
	// color: mediumPalette.textSecondary,
	marginBottom: 8,
	textTransform: "uppercase",
	letterSpacing: 0.5,
}));

export const UtilityStatRow = styled(Box)(({ theme }) => ({
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
	padding: "4px 0",
	borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
	"&:last-child": {
		borderBottom: "none",
	},
}));

export const UtilityStatLabel = styled(PageTitle)(() => ({
	fontSize: 12,
	// color: mediumPalette.textSecondary,
}));

export const UtilityStatValueGroup = styled(Box)({
	display: "flex",
	alignItems: "center",
	gap: 6,
});

export const UtilityStatValue = styled(PageTitle, {
	shouldForwardProp: (prop) => prop !== "textColor",
})(({ textColor }) => ({
	fontSize: 12.5,
	fontWeight: 700,
	color: getMediumColor(textColor),
}));

export const UtilityStatSlash = styled(PageTitle)(() => ({
	color: mediumPalette.textMuted,
	fontSize: 11,
}));

export const NewsList = styled(Stack)({
	padding: "12px 16px 14px",
	height: "auto",
	minHeight: 0,
	flex: 1,
	overflowY: "auto",
	scrollbarWidth: "none",
	msOverflowStyle: "none",
	"&::-webkit-scrollbar": {
		display: "none",
		width: 0,
		height: 0,
	},
});

export const LeadNewsItem = styled(Box)(({ theme }) => ({
	display: "flex",
	gap: 12,
	padding: "10px 0",
	borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
	"&:last-child": {
		borderBottom: "none",
	},
}));

export const LeadNewsIcon = styled(PageTitle)({
	fontSize: 20,
	flexShrink: 0,
	width: 32,
	textAlign: "center",
});

export const LeadNewsBody = styled(Box)({
	flex: 1,
});

export const LeadNewsTitle = styled(PageTitle)({
	fontSize: 13,
	fontWeight: 600,
	color: mediumPalette.textPrimary,
	marginBottom: 5,
	lineHeight: 1.35,
});

export const LeadNewsReactions = styled(Box)({
	display: "flex",
	gap: 12,
	fontSize: 11,
	color: mediumPalette.textMuted,
	flexWrap: "wrap",
});

export const LeadNewsDate = styled(PageTitle)({
	fontSize: 10.5,
	color: mediumPalette.textMuted,
	flexShrink: 0,
	whiteSpace: "nowrap",
});

export const mediumThemeColors = {
	...themeColors,
	...mediumPalette,
};

export const NoDataContainer = styled(Box)(({ theme }) => ({
	display: 'flex',
	justifyContent: 'center',
	alignItems: 'center',
	height: '100%',
	width: '100%',
	padding: theme.spacing(3),
	textAlign: 'center',
}));

export const NoDataTypography = styled(PageTitle)(({ theme }) => ({
	color: theme.palette.text.secondary,
}));

export const GhostContainer = styled("div")(({ dndStyle }) => ({
	background: "rgba(255,255,255,0.95)",
	border: "2px dashed #00a99d",
	borderRadius: 12,
	padding: "20px 24px",
	display: "flex",
	alignItems: "center",
	gap: 10,
	fontSize: 14,
	fontWeight: 600,
	color: "#00a99d",
	boxShadow: "0 8px 24px rgba(0,169,157,0.18)",
	minHeight: 60,

	// 👇 thay cho .attrs()
	...(dndStyle || {}),
}));

export const DraggableWrapper = styled("div")(({ snapshot, dndStyle }) => ({
	opacity: snapshot?.isDragging ? 0 : 1,
	height: snapshot?.isDragging ? "auto" : "100%",

	// 👇 thay cho .attrs()
	...(dndStyle || {}),
}));

export const StyledDragHandleIcon = styled(DragHandleIcon)({
	opacity: 0.7,
});

export const HandleNode = styled("div")({
	cursor: "grab",
	opacity: 0.5,
	marginRight: 8,
	display: "flex",
	alignItems: "center",
});

export const MedimiumTabButton = styled(Button, {
	shouldForwardProp: (prop) => prop !== "active",
})(({ theme, active }) => ({
	flex: 1,
	padding: "8px 16px",
	fontSize: 12.5,
	fontWeight: active ? 600 : 500,
	textAlign: "center",
	borderRadius: 6,
	color: active ? theme.palette.primary.main : theme.palette.text.secondary,
	background: active ? theme.palette.background.paper : "transparent",
	boxShadow: active ? theme.shadows[1] : "none",
	textTransform: "none",
	minWidth: "auto",

	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	gap: 8,

	"& .tab-badge": {
		minWidth: 20,
		height: 20,
		padding: "0 6px",

		display: "flex",
		alignItems: "center",
		justifyContent: "center",

		borderRadius: "999px",

		fontSize: 11,
		fontWeight: 700,
		lineHeight: 1,

		background: "#EF53501A",
		color: "#EF5350",
	},
}));

export const MedimiumTabValue = styled(PageTitle, {
	shouldForwardProp: (prop) => prop !== "active",
})(({ active }) => ({
	fontSize: 12,
	fontWeight: 700,
	color: active ? "#2364B0" : "#64748B",
	textTransform: "uppercase",
}));

export const MedimiumTabBadge = styled(PageTitle)(({ theme, clText, bgCl }) => ({
	minWidth: 20,
	height: 20,
	padding: theme.spacing(0, 0.75),
	// padding: "0 6px",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	borderRadius: "999px",
	fontSize: 11,
	fontWeight: 700,
	lineHeight: 1,
	background: bgCl,
	color: clText,
}));

export const CardTitleWrapper = styled(QuickActionGroupTitle)({
	paddingBottom: 0,
	// display: "inline-block",
	display: "flex",
});

export const StatsDivider = styled("div")({
	borderTop: "1px dotted #E2E8F0",
	margin: "12px 0 16px 0",
	width: "100%",
});

export const StatsTitle = styled("div")({
	fontSize: 13,
	fontWeight: 600,
	color: "#5F6B7A",
	textAlign: "left",
	width: "100%",
	paddingBottom: 4,
});

export const StatsRowContainer = styled(Box)({
	display: "flex",
	flexDirection: "row",
	justifyContent: "space-between",
	alignItems: "center",
	width: "100%",
	flexWrap: "wrap",
	gap: 12,
});

export const StatItemWrapper = styled(Box, {
	shouldForwardProp: (prop) => prop !== "styleCursor",
})(({ styleCursor }) => ({
	display: "flex",
	alignItems: "center",
	gap: 8,
	flex: "1 1 0px",
	minWidth: 150,
	cursor: styleCursor ? "pointer" : "default",
	"&:hover": styleCursor ? {
		opacity: 0.8,
	} : {},
}));

export const StatIconWrapper = styled("span")({
	display: "inline-flex",
	alignItems: "center",
	color: "#8D96A3",
	"& .MuiSvgIcon-root": {
		fontSize: 20,
	}
});

export const StatItemLabel = styled("span")({
	fontSize: 11.5,
	color: "#8D96A3",
	fontWeight: 500,
	whiteSpace: "nowrap",
});

export const StatItemValue = styled("span")({
	display: "inline-flex",
	alignItems: "baseline",
	fontSize: 13,
	fontWeight: 700,
	color: "#1E293B",
	marginLeft: 6,
	whiteSpace: "nowrap",
});

export const StatHighlightValue = styled("span")({
	color: "#0052CC",
	fontWeight: 700,
});

const StatSlash = styled("span")({
	fontWeight: 400,
	margin: "0 2px",
	color: "#8D96A3",
});
export { StatSlash };