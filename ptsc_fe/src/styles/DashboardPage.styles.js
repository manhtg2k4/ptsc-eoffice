import { styled } from "@mui/material/styles";
import {
	Box,
	Card,
	CardContent,
	Typography,
	Stack,
	Chip,
	Button,
	Avatar,
	LinearProgress,
} from "@mui/material";
import {
	EmojiEvents,
	ErrorOutline,
	HourglassTop,
	InfoOutlined,
} from "@mui/icons-material";
import { FlexGridItem, PageContainer, PageTitle } from "./ThemeConfig.styles";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";


// ============ THEME COLORS ============
export const themeColors = {
	primary: "#0f4c81",
	primaryLight: "#1a6bb5",
	secondary: "#00a8e8",
	accent: "#00b894",
	accentWarm: "#e17055",
	warning: "#fdcb6e",
	danger: "#d63031",
	success: "#00b894",
	info: "#74b9ff",
	bgBody: "#f0f4f8",
	bgCard: "#ffffff",
	textPrimary: "#1e293b",
	textSecondary: "#64748b",
	textMuted: "#5A6573",
	border: "#e2e8f0",
};

// ============ HELPER FUNCTIONS ============
export const getGradientByColor = (color) => {
	const map = {
		blue: "linear-gradient(135deg, #0f4c81 0%, #1a6bb5 100%)",
		green: "linear-gradient(135deg, #00b894 0%, #00cec9 100%)",
		orange: "linear-gradient(135deg, #e17055 0%, #fdcb6e 100%)",
		purple: "linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)",
		red: "linear-gradient(135deg, #d63031 0%, #ff7675 100%)",
	};
	return map[color] || map.blue;
};

export const getColorValue = (color) => {
	const map = {
		blue: "#0f4c81",
		green: "#00b894",
		orange: "#e17055",
		purple: "#6c5ce7",
		red: "#d63031",
		gray: "#94a3b8",
	};
	if (typeof color === "string") {
		const t = color.trim();
		if (t.startsWith("#") || t.startsWith("rgb") || t.startsWith("hsl")) return t;
	}
	return map[color] || map.blue;
};

export const getSoftBg = (color) => {
	const map = {
		blue: "rgba(15, 76, 129, 0.08)",
		green: "rgba(0, 184, 148, 0.08)",
		orange: "rgba(225, 112, 85, 0.08)",
		purple: "rgba(108, 92, 231, 0.08)",
		red: "rgba(214, 48, 49, 0.08)",
		gray: "rgba(148, 163, 184, 0.12)",
	};
	if (typeof color === "string") {
		const hex = color.trim();
		if (/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(hex)) {
			const full = hex.length === 4
				? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
				: hex;
			const r = parseInt(full.slice(1, 3), 16);
			const g = parseInt(full.slice(3, 5), 16);
			const b = parseInt(full.slice(5, 7), 16);
			return `rgba(${r}, ${g}, ${b}, 0.12)`;
		}
	}
	return map[color] || map.blue;
};

// ============ DASHBOARD LAYOUT ============
export const DashboardRoot = styled(Box)(({ theme }) => {
	return {
		height: "100%",
		minHeight: 0,
		overflowY: "auto",
		overflowX: "hidden",
		WebkitOverflowScrolling: "touch",
		touchAction: "pan-y",
		backgroundColor: "transparent",
		// backgroundColor: theme.palette.background.default,
		color: themeColors.textPrimary,
		fontFamily: theme.typography.fontFamily,
		scrollbarWidth: "none",
		msOverflowStyle: "none",
		"&::-webkit-scrollbar": {
			display: "none",
			width: 0,
			height: 0,
		},
	};
});

export const DashboardContainer = styled(Box)(({ theme }) => ({
	padding: theme.spacing(3),
	paddingTop: theme.spacing(0),
	paddingLeft: 0,
	paddingRight: 0,
	maxWidth: 1600,
	marginLeft: "auto",
	marginRight: "auto",
	// backgroundColor: theme.palette.background.paper,
	backgroundColor: "transparent",
	[theme.breakpoints.down("md")]: {
		padding: theme.spacing(2),
		paddingLeft: 0,
		paddingRight: 0,
	},
}));

// ============ SECTION CARD ============
export const SectionCardWrapper = styled(Card)({
	borderRadius: 16,
	border: `1px solid ${themeColors.border}`,
	boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)",
});

export const SectionCardContent = styled(CardContent)({
	padding: 22,
});

export const SectionCardHeader = styled(Stack)(({ styleHeader }) => ({
	flexDirection: "row",
	justifyContent: "space-between",
	alignItems: "center",
	marginBottom: styleHeader ? styleHeader : 18,
}));

export const SectionCardTitleGroup = styled(Stack)({
	flexDirection: "row",
	gap: 10,
	alignItems: "center",
});

export const SectionCardTitle = styled(PageTitle)(({ theme, sizeTitle }) => ({
	fontFamily: theme.typography.fontFamily,
	fontWeight: 700,
	fontSize: sizeTitle || 30,
}));

export const SectionCardActionButton = styled(Button)(({ theme }) => ({
	fontFamily: theme.typography.fontFamily,
	color: themeColors.primary,
	fontWeight: 600,
	textTransform: "none",
}));

export const DashboardIconBox = styled(Box, {
	shouldForwardProp: (prop) =>
		prop !== "styledColor" && prop !== "styledFontSize",
})(({ styledColor, styledFontSize }) => ({
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	color: styledColor,
	fontSize: styledFontSize,
	lineHeight: 1,
	"& .MuiSvgIcon-root": {
		fontSize: "inherit",
	},
}));

export const StyleGridDashboard = styled(Box)(({ theme }) => ({
	display: "grid",
	gridTemplateColumns: "repeat(4, 1fr)",
	gap: 24,
	marginBottom: 24,
	width: "100%",
	[theme.breakpoints.down("md")]: {
		gridTemplateColumns: "repeat(2, 1fr)",
	},
	[theme.breakpoints.down("sm")]: {
		gridTemplateColumns: "1fr",
	},
}));

const createScrollArea = (defaultMaxHeight) =>
	styled(Box, {
		shouldForwardProp: (prop) =>
			prop !== "fillHeight" && prop !== "disableMaxHeight",
	})(({ fillHeight, disableMaxHeight }) => ({
		maxHeight: disableMaxHeight ? "none" : defaultMaxHeight,
		...(fillHeight
			? {
				height: "100%",
				flex: 1,
				minHeight: 0,
			}
			: {}),
		overflowY: "auto",
		scrollbarWidth: "none",
		msOverflowStyle: "none",
		"&::-webkit-scrollbar": {
			display: "none",
			width: 0,
			height: 0,
		},
	}));

export const ProjectListScrollArea = createScrollArea("41.7rem");
export const QuickActionsScrollArea = createScrollArea("18rem");
export const MeetingsScrollArea = createScrollArea("11rem");
export const EventsScrollArea = createScrollArea("20rem");
export const NewsScrollArea = createScrollArea("20rem");

// ============ NORMAL STATS HELPERS ============
export const NormalStatGridItem = styled("div", {
	shouldForwardProp: (prop) => prop !== "dndStyle" && prop !== "snapshot",
})(({ dndStyle }) => ({
	display: "block",
	height: "100%",
	...(dndStyle || {}),
}));

export const NormalDragHandleWrapper = styled("div")({
	cursor: "grab",
	opacity: 0.5,
	marginRight: 8,
	display: "flex",
	alignItems: "center",
});

// ============ STAT CARD ============
export const StatCardWrapper = styled(Card, {
	shouldForwardProp: (prop) => prop !== "cardColor",
})(({ cardColor }) => ({
	borderRadius: 16,
	height: "100%",
	display: "flex",
	flexDirection: "column",
	border: `1px solid ${themeColors.border}`,
	position: "relative",
	overflow: "hidden",
	boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)",
	"&:before": {
		content: '""',
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		height: 10,
		// background: getGradientByColor(cardColor),
		background: cardColor,
	},
	"&:hover": {
		transform: "translateY(-4px)",
		boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
	},
	transition: "all 0.3s ease",
	justifyContent: "space-around"
}));

export const StatCardContent = styled(CardContent)({
	padding: 20,
	height: "100%",
	display: "flex",
	flexDirection: "column",
});

export const StatCardHeader = styled(Stack)({
	flexDirection: "row",
	justifyContent: "space-between",
	alignItems: "flex-start",
	marginBottom: 12,
});

export const StatCardHeaderMeta = styled(Stack)({
	flexDirection: "row",
	alignItems: "center",
	gap: 8,
});

export const StatCardLabelGroup = styled(Stack)({
	flexDirection: "row",
	gap: 8,
	alignItems: "center",
});

export const StatCardLabel = styled(PageTitle)(() => ({
	fontSize: 18,
	fontWeight: 500,
	color: "#585E65",
	textTransform: "uppercase",
	"@media (min-width: 600px) and (max-width: 1199.95px)": {
		fontSize: 12,
	},
}));

export const StatCardValueBox = styled(Box)({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 10,
	textAlign: "left",
	paddingTop: 4,
	paddingBottom: 10,
});

export const StatCardValue = styled(Typography, {
	shouldForwardProp: (prop) => prop !== "valueColor",
})(({ valueColor }) => ({
	fontSize: 42,
	lineHeight: 1,
	fontWeight: 900,
	// color: getColorValue(valueColor),
	color: valueColor,
}));

// ============ TREND CHIP ============
export const StyledTrendChip = styled(Chip, {
	shouldForwardProp: (prop) => prop !== "isUp",
})(({ isUp }) => ({
	height: 24,
	fontSize: 11,
	fontWeight: 700,
	color: isUp ? themeColors.success : themeColors.accentWarm,
	backgroundColor: isUp
		? "rgba(0, 184, 148, 0.12)"
		: "rgba(225, 112, 85, 0.12)",
	"& .MuiChip-icon": {
		fontSize: 14,
		color: "inherit",
	},
}));

// ============ INSIGHT BOX ============
export const InsightBoxWrapper = styled(Box, {
	shouldForwardProp: (prop) => prop !== "styledBgColor" && prop !== "textColor",
})(({ styledBgColor, textColor }) => ({
	display: "flex",
	alignItems: "center",
	gap: 8,
	padding: "9.6px",
	borderRadius: 8,
	marginTop: 10,
	marginBottom: 10,
	backgroundColor: styledBgColor,
	color: textColor,
}));

export const InsightText = styled(Typography)({
	fontSize: 11.5,
	fontWeight: 600,
});

// ============ STAT DETAILS ============
export const StatDetailsWrapper = styled(Stack)({
	flexDirection: "row",
	paddingTop: 12.8,
	marginTop: "auto",
	paddingBottom: 0,
	borderTop: `1px solid ${themeColors.border}`,
});

export const StatDetailValue = styled(Typography, {
	shouldForwardProp: (prop) => prop !== "valueColor",
})(({ valueColor }) => ({
	fontSize: 16,
	fontWeight: 800,
	color: getColorValue(valueColor || "blue"),
}));

export const StatDetailLabel = styled(Typography)({
	fontSize: 10,
	color: themeColors.textMuted,
	textTransform: "uppercase",
	letterSpacing: 0.3,
	marginTop: 3.2,
});

// ============ PERFORMANCE SECTION ============
export const PerformanceWrapper = styled(Box)(() => ({
	paddingTop: 8,
	paddingBottom: 8,
	paddingLeft: 0,
	paddingRight: 0,
	borderRadius: 0,
	border: "none",
	marginBottom: 16,
	backgroundColor: "transparent",
}));

export const PerformanceHeader = styled(Stack)(({ theme }) => ({
	flexDirection: "row",
	justifyContent: "space-between",
	alignItems: "center",
	marginBottom: theme.spacing(1) || 8,
}));

export const PerformanceTitle = styled(PageTitle)(() => ({
	fontSize: 14,
	fontWeight: 700,
	textTransform: "none",
}));

export const PerformanceValue = styled(Typography)(({ bgCl }) => ({
	fontSize: 28,
	fontWeight: 700,
	lineHeight: 1,
	color: bgCl || "#2364B0",
}));

export const StyledLinearProgress = styled(LinearProgress)(({ bgCl }) => ({
	height: 16,
	borderRadius: 999,
	backgroundColor: "#E8EDF2",
	// backgroundColor: "#f9fafb",
	"& .MuiLinearProgress-bar": {
		borderRadius: 999,
		background: bgCl || "#2364B0",
	},
}));

export const PerformanceMetaRow = styled(Box)({
	display: "flex",
	alignItems: "center",
	justifyContent: "flex-start",
	marginBottom: 8,
	gap: 12,
});

export const GoalLabel = styled(Typography)({
	fontSize: 12,
	fontWeight: 600,
	color: "#6B7280",
});

export const RemainLabel = styled(Typography)({
	fontSize: 14,
	fontWeight: 700,
	color: "#111827",
	lineHeight: 1,
	whiteSpace: "nowrap",
});

export const ProgressWrap = styled(Box)({
	position: "relative",
	paddingTop: 6,
});

export const RemainLabelOnBar = styled(RemainLabel)({
	position: "absolute",
	left: "66%",
	top: -25,
	transform: "translateX(-50%)",
	zIndex: 1,
});

export const PerformanceFooter = styled(Stack)({
	flexDirection: "row",
	justifyContent: "space-between",
	marginTop: 8,
});

export const PerformanceFooterLabel = styled(Typography)({
	fontSize: 12,
	fontWeight: 500,
	color: "#94A3B8",
});

// ============ DOUGHNUT CHART CARD ============
export const DoughnutCardWrapper = styled(Box)(() => ({
	padding: 12,
	borderRadius: 0,
	backgroundColor: "#F9FAFB",
	// backgroundColor: theme.palette.background.default,
	border: "none",
	height: "100%",
}));

export const DoughnutCardHeader = styled(Stack)({
	flexDirection: "row",
	justifyContent: "space-between",
	alignItems: "center",
	marginBottom: 10,
});

export const DoughnutCardTitle = styled(PageTitle)(() => ({
	fontSize: 14,
	fontWeight: 700,
	textTransform: "none",
}));

export const DoughnutBadgeChip = styled(Chip, {
	shouldForwardProp: (prop) => prop !== "badgeType",
})(({ badgeType }) => ({
	height: 22,
	fontSize: 12,
	fontWeight: 700,
	borderRadius: 999,
	backgroundColor:
		badgeType === "success"
			? "rgba(20, 184, 166, 0.16)"
			: "rgba(245, 158, 11, 0.16)",
	color: badgeType === "success" ? "#0F766E" : "#B45309",
}));

export const DoughnutChartBox = styled(Box)({
	height: 240,
});

// ============ PROJECT SUMMARY ============
export const ProjectSummaryValue = styled(Typography, {
	shouldForwardProp: (prop) => prop !== "valueColor",
})(({ valueColor }) => ({
	fontSize: 38,
	fontWeight: 900,
	// color: getColorValue(valueColor || "blue"),
	color: valueColor || "blue",
}));

export const ProjectSummaryLabel = styled(PageTitle)(({ textCl }) => ({
	fontSize: 10,
	// color: themeColors.textMuted,
	color: textCl || "#6B7280",
	marginTop: 3.2,
}));

export const ProjectSummaryItemBox = styled(Box)(({ theme }) => ({
	textAlign: "left",
	padding: 12,
	// backgroundColor: themeColors.bgBody,
	backgroundColor: theme.palette.background.paper,
	borderRadius: 10,
	border: `1px solid ${themeColors.border}`,
	transition: "background-color 0.2s ease, border-color 0.2s ease",
	"& > *": {
		transition: "color 0.2s ease",
	},
	"&:hover": {
		backgroundColor: "#2364B0",
		borderColor: "#2364B0",
		"& > *": {
			color: "#FFFFFF !important",
		},
	},
	// "&:hover": {
	// 	background:
	// 		"linear-gradient(135deg, #ff0000, #ff7f00, #ffff00, #00ff00, #00ffff, #0000ff, #8b00ff)",
	// 	borderColor: "transparent",
	// 	transition: "all 0.3s ease",
	// 	"& > *": {
	// 		color: "#FFFFFF !important",
	// 	},
	// },
}));

// ============ PROJECT ITEM ============
export const ProjectItemWrapper = styled(Box, {
	shouldForwardProp: (prop) => prop !== "styleCursor",
})(({ styleCursor, theme }) => ({
	padding: "12px 2px",
	borderBottom: `1px solid ${theme.palette.divider}`,
	"&:last-child": {
		borderBottom: "none",
	},
	cursor: styleCursor ? 'pointer' : 'default',
}));

export const ProjectItemHeader = styled(Stack)({
	flexDirection: "row",
	justifyContent: "space-between",
	alignItems: "flex-start",
	marginBottom: 4,
});

export const ProjectItemName = styled(Typography)(({ theme }) => ({
	fontFamily: theme.typography.fontFamily,
	fontSize: 14,
	fontWeight: 700,
	marginBottom: 6,
}));

export const ProjectContentBox = styled(Box)(() => ({
	flex: 1,
	minWidth: 0,
}));

export const ProjectMetaRow = styled(Stack)({
	flexDirection: "row",
	flexWrap: "wrap",
});

export const ProjectMetaProgressRow = styled(Box)({
	display: "flex",
	flexDirection: "row",
	justifyContent: "space-between",
	alignItems: "center",
	marginBottom: 8,
});

export const ProjectMetaItem = styled(Stack)({
	flexDirection: "row",
	alignItems: "center",
});

export const ProjectItemMetaText = styled(Typography)({
	fontSize: 11,
	color: themeColors.textMuted,
});

export const ProjectDeadlineText = styled(Typography, {
	shouldForwardProp: (prop) => prop !== "styledTextColor",
})(({ styledTextColor }) => ({
	fontSize: 11,
	color: styledTextColor,
}));

export const ProjectItemStatusChip = styled(Chip, {
	shouldForwardProp: (prop) => prop !== "chipColor" && prop !== "chipBgColor",
})(({ theme, chipColor }) => ({
	height: 32,
	fontSize: 12,
	fontWeight: 700,
	borderRadius: 999,
	backgroundColor: theme.palette.background.paper,
	color: chipColor,
	border: `1.5px solid ${chipColor}`,
	boxShadow: "none",
	"& .MuiChip-label": {
		paddingLeft: 14,
		paddingRight: 14,
		color: "inherit",
	},
	"&:hover": {
		backgroundColor: theme.palette.background.paper,
		boxShadow: "none",
	},
}));

export const ProjectProgressBox = styled(Box)({
	padding: 0,
});

export const ProjectProgressLabel = styled(Typography)({
	fontSize: 11,
	color: themeColors.textMuted,
});

export const ProjectProgressValue = styled(Typography)({
	fontSize: 18,
	fontWeight: 800,
	lineHeight: 1,
	minWidth: 40,
	textAlign: "right",
});

export const ProjectProgressHeader = styled(Stack)({
	flexDirection: "row",
	justifyContent: "space-between",
});

export const ProjectProgressBarOuter = styled(Box)({
	height: 6,
	backgroundColor: themeColors.border,
	borderRadius: 999,
	overflow: "hidden",
});

export const ProjectProgressBarInner = styled(Box, {
	shouldForwardProp: (prop) => prop !== "progress" && prop !== "progressBg",
})(({ progress, progressBg }) => ({
	width: `${progress}%`,
	height: "100%",
	borderRadius: 999,
	background: progressBg,
}));

// ============ QUICK ACTION ITEM ============
export const QuickActionButton = styled(Button)(({ theme }) => ({
	// padding: 14.4,
	padding: theme.spacing(2.25, 1.5),
	borderRadius: 12,
	border: "1px solid #E5E7EB",
	backgroundColor: theme.palette.background.paper,
	// backgroundColor: "#FFFFFF",
	// color: themeColors.textPrimary,
	color: theme.palette.text.primary,
	textTransform: "uppercase",
	display: "flex",
	flexDirection: "column",
	gap: 8,
	minHeight: 96,
	boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
	"&:hover": {
		transform: "translateY(-2px)",
		backgroundColor: "#FFFFFF",
		boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
		borderColor: "#C7D0E0",
		position: "relative",
		zIndex: 1,
	},
	"@media (min-width: 600px) and (max-width: 1199.95px)": {
		padding: theme.spacing(1.25, 0.75),
		minHeight: 76,
		gap: 6,
	},
}));

export const QuickActionIconBox = styled(Box, {
	shouldForwardProp: (prop) =>
		prop !== "styledBgColor" && prop !== "styledIconColor",
})(({ styledBgColor, styledIconColor }) => ({
	width: 60,
	height: 60,
	borderRadius: "50%",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	position: "relative",
	backgroundColor: styledBgColor || "#F2F7FC",
	color: styledIconColor,
	"@media (min-width: 600px) and (max-width: 1199.95px)": {
		width: 36,
		height: 36,
	},
}));

export const QuickActionInnerIcon = styled(Box)({
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	fontSize: 28,
	lineHeight: 1,
	"& .MuiSvgIcon-root": {
		fontSize: "inherit",
	},
	"@media (min-width: 600px) and (max-width: 1199.95px)": {
		fontSize: 18,
	},
});

export const QuickActionBadge = styled(Box, {
	shouldForwardProp: (prop) => prop !== "badgeColor",
})(({ badgeColor }) => ({
	position: "absolute",
	top: 2,
	right: 2,
	minWidth: 20,
	height: 20,
	paddingLeft: 4,
	paddingRight: 4,
	borderRadius: 10,
	backgroundColor: badgeColor,
	color: "#fff",
	fontSize: 10,
	fontWeight: 800,
	lineHeight: 1,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	whiteSpace: "nowrap",
	"@media (min-width: 600px) and (max-width: 1199.95px)": {
		top: -2,
		right: -2,
		minWidth: 16,
		height: 16,
		fontSize: 9,
	},
}));

export const QuickActionLabel = styled(Typography)({
	fontSize: 12,
	fontWeight: 700,
	lineHeight: 1.25,
	minHeight: 30,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	textAlign: "center",
	textTransform: "uppercase",
	"@media (min-width: 600px) and (max-width: 1199.95px)": {
		fontSize: 10,
		minHeight: 24,
	},
});

// ============ MEETING ITEM ============
export const MeetingItemWrapper = styled(Box)(({ theme, styleCursor }) => ({
	display: "flex",
	alignItems: "flex-start",
	gap: 14,
	padding: "14px 16px",
	backgroundColor: theme.palette.background.paper,
	border: `1px solid ${themeColors.border}`,
	borderRadius: 12,
	transition: "all 0.3s ease",
	"&:hover": {
		backgroundColor: theme.palette.background.default,
	},
	[theme.breakpoints.down("sm")]: {
		flexDirection: "column",
	},
	cursor: styleCursor ? "pointer" : "default"
}));

export const MeetingTimeBox = styled(Box, {
	shouldForwardProp: (prop) => prop !== "timeColor",
})(({ timeColor }) => ({
	minWidth: 64,
	height: 64,
	textAlign: "center",
	padding: "6px 8px",
	borderRadius: 12,
	color: themeColors.textPrimary,
	display: "flex",
	flexDirection: "column",
	justifyContent: "center",
	alignItems: "center",
	gap: 2,
	border: `1px solid ${themeColors.border}`,
	backgroundColor: timeColor
}));

export const MeetingTimeText = styled(Typography)({
	fontSize: 14,
	fontWeight: 700,
	lineHeight: 1.1,
});

export const MeetingDateText = styled(Typography)({
	fontSize: 10.5,
	lineHeight: 1.1,
	color: themeColors.textSecondary,
});

export const MeetingTitle = styled(Typography)({
	fontSize: 13,
	fontWeight: 600,
	marginBottom: 4,
});

export const MeetingContentBox = styled(Box)({
	flex: 1,
	minWidth: 0,
});

export const MeetingDetailText = styled(Typography)({
	fontSize: 12,
	color: themeColors.textSecondary,
	paddingBottom: 6,
});

export const MeetingLive = styled(Box)({
	display: "inline-flex",
	alignItems: "center",
	gap: 4,
	fontSize: 11,
	fontWeight: 600,
	color: themeColors.danger,
	marginTop: 2,
	marginBottom: 6,
	"& .MuiSvgIcon-root": {
		fontSize: 8,
	},
});

export const MeetingTitleRow = styled(Stack)(({ theme }) => ({
	flexDirection: "row",
	alignItems: "center",
	marginBottom: theme.spacing(1.75),
}));

export const MeetingMetaRow = styled(Stack)({
	flexDirection: "row",
	flexWrap: "wrap",
	alignItems: "center",
});

export const MeetingMetaItem = styled(Stack)({
	flexDirection: "row",
	alignItems: "center",
});

export const MeetingActionRow = styled(Stack)(({ theme }) => ({
	flexDirection: "row",
	alignItems: "center",
	justifyContent: "flex-end",
	gap: 8,
	flexShrink: 0,
	"& .MuiButton-root": {
		minWidth: 82,
		height: 32,
		fontWeight: 700,
		fontSize: 12,
		paddingLeft: 12,
		paddingRight: 12,
		whiteSpace: "nowrap",
	},
	[theme.breakpoints.down("sm")]: {
		flexDirection: "column",
		alignItems: "stretch",
		gap: 6,
		"& .MuiButton-root": {
			minWidth: 72,
			height: 28,
			fontSize: 11,
			paddingLeft: 10,
			paddingRight: 10,
			width: "100%",
		},
	},
	[theme.breakpoints.down(390)]: {
		gap: 4,
		"& .MuiButton-root": {
			minWidth: 64,
			height: 26,
			fontSize: 10,
			paddingLeft: 8,
			paddingRight: 8,
		},
	},
}));

export const MeetingMetaText = styled(Typography)({
	fontSize: 10,
	color: themeColors.textMuted,
});

export const MeetingBadgeChip = styled(Chip)({
	height: 20,
	fontSize: 9,
	fontWeight: 700,
	color: themeColors.danger,
	backgroundColor: "rgba(214, 48, 49, 0.1)",
});

export const MeetingAcceptButton = styled(Button)({
	textTransform: "none",
	borderRadius: 8,
	backgroundColor: themeColors.success,
	color: "#fff",
	lineHeight: 1,
	"&:hover": {
		backgroundColor: "#00a783",
	},
});

export const MeetingDeclineButton = styled(Button)({
	textTransform: "none",
	borderRadius: 8,
});

export const MeetingJoinButton = styled(Button)({
	textTransform: "none",
	borderRadius: 8,
	backgroundColor: themeColors.success,
	color: "#fff",
	lineHeight: 1,
	"&:hover": {
		backgroundColor: "#00a783",
	},
});

export const MeetingDeclineButtonOutlined = styled(Button)({
	textTransform: "none",
	borderRadius: 8,
	color: themeColors.danger,
	borderColor: themeColors.danger,
	lineHeight: 1,
	"&:hover": {
		borderColor: themeColors.danger,
		backgroundColor: "rgba(214, 48, 49, 0.08)",
	},
});

// ============ EVENT ITEM ============
export const EventItemWrapper = styled(Box)(({ theme, styleCursor }) => ({
	display: "flex",
	gap: 14,
	padding: 14,
	backgroundColor: "#f9fafb",
	// backgroundColor: theme.palette.background.default,
	// border: `1px solid ${themeColors.border}`,
	borderRadius: 12,
	"&:hover": {
		backgroundColor: theme.palette.background.default,
	},
	cursor: styleCursor ? 'pointer' : 'default'
}));

export const EventDateBox = styled(Box, {
	shouldForwardProp: (prop) => prop !== "styledbgColor",
})(({ styledbgColor }) => ({
	minWidth: 58,
	textAlign: "center",
	paddingLeft: 12.8,
	paddingRight: 12.8,
	paddingTop: 9.6,
	paddingBottom: 9.6,
	color: "#fff",
	borderRadius: 10,
	background: styledbgColor,
}));

export const EventDay = styled(PageTitle)(() => ({
	fontSize: 20,
	fontWeight: 900,
	lineHeight: 1,
	color: "#fff",
}));

export const EventMonth = styled(PageTitle)(() => ({
	fontSize: 10,
	textTransform: "uppercase",
	color: "#fff",
}));

export const EventTitle = styled(PageTitle)(() => ({
	fontSize: 14,
	fontWeight: 700,
	marginBottom: 6,
}));

export const EventDescription = styled(PageTitle)(() => ({
	fontSize: 11,
	color: themeColors.textMuted,
}));

// ============ NEWS ITEM ============
export const NewsItemWrapper = styled(Box)(({ theme, styleCursor }) => ({
	display: "flex",
	gap: 14,
	paddingBottom: 14,
	borderBottom: `1px solid ${themeColors.border}`,
	"&:last-child": {
		borderBottom: "none",
		paddingBottom: 0,
	},
	"&:hover": {
		backgroundColor: theme.palette.background.default,
	},
	transition: "all 0.3s ease",
	cursor: styleCursor ? 'pointer' : 'default'
}));

export const NewsAvatar = styled(Avatar, {
	shouldForwardProp: (prop) => prop !== "styledBgColor",
})(({ styledBgColor }) => ({
	width: 60,
	height: 60,
	fontSize: 24,
	background: styledBgColor,
}));

export const NewsTitle = styled(PageTitle)(() => ({
	fontSize: 13,
	fontWeight: 700,
	lineHeight: 1.45,
	marginBottom: 8,
	display: "-webkit-box",
	WebkitLineClamp: 2,
	WebkitBoxOrient: "vertical",
	overflow: "hidden",
}));

export const NewsDateText = styled(PageTitle)(() => ({
	fontSize: 11,
	color: themeColors.textMuted,
}));

export const NewsLikesText = styled(PageTitle)(() => ({
	fontSize: 11,
	color: themeColors.danger,
}));

export const NewsCommentsText = styled(PageTitle)(() => ({
	fontSize: 11,
	color: themeColors.secondary,
}));

export const StyledErrorOutline = styled(ErrorOutline)(() => ({
	fontSize: "small",
}));

export const StyledHourglassTop = styled(HourglassTop)(() => ({
	fontSize: "small",
}));

export const StyledEmojiEvents = styled(EmojiEvents)(() => ({
	fontSize: "small",
}));

export const StyledInfoOutlined = styled(InfoOutlined)(() => ({
	fontSize: "small",
}));

export const StyledStack = styled(Stack)(() => ({
	flexWrap: "wrap",
}));

export const StyledBoxDashboard = styled(PageContainer)({
	padding: "unset",
	display: "unset",
	justifyContent: "unset",
	flex: 1,
	minWidth: 0,
});

export const StyledStackMeeting = styled(StyledStack)(({ theme, styleFlexWrap }) => ({
	flexWrap: styleFlexWrap || "unset",
	alignItems: "center",
	marginBottom: theme.spacing(0.5),
	direction: "row",
}));

export const StyledBoxStatDetails = styled(PageContainer, {
	shouldForwardProp: (prop) => prop !== "isClickable",
})(({ isClickable }) => ({
	padding: "unset",
	display: "unset",
	justifyContent: "unset",
	flex: 1,
	textAlign: "center",
	cursor: isClickable ? "pointer" : "default",
	transition: "all 0.2s ease-in-out",
	borderRadius: 6,
	"&:hover": isClickable
		? {
				backgroundColor: "rgba(0, 0, 0, 0.04)",
				transform: "scale(1.02)",
		  }
		: {},
}));

export const StyledBodyQuickActionItem = styled(FlexGridItem)(({ theme }) => ({
	// display: "unset",
	alignItems: "unset",
	justifyContent: "unset",
	paddingTop: theme.spacing(1)
}));

export const EmptyStateStack = styled(Stack)({
	height: "100%",
	textAlign: "center",
	alignItems: "center",
	justifyContent: "center",
	gap: 10,
});

export const EmptyStateIconCircle = styled("div")({
	width: 88,
	height: 88,
	borderRadius: "50%",
	backgroundColor: "#eff3f8",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	"& > *": {
		fontSize: 44,
		color: "#c2cedd",
	},
});

export const EmptyStateTitle = styled(PageTitle)({
	fontWeight: 600,
});

export const EmptyStateDescription = styled(PageTitle)({
	color: "#64748b",
});

export const DroppableContainer = styled(Stack)({
	height: "100%",
	width: "100%",
	minHeight: 150
});

export const DragHandleIcon = styled(DragIndicatorIcon)({
	transform: "rotate(90deg)"
});

export const QuickActionGroupTitle = styled(Typography)(({ theme, nonePdBt }) => ({
	fontSize: 14,
	fontWeight: 700,
	textTransform: "uppercase",
	letterSpacing: "0.12em",
	color: "#565D6D",
	lineHeight: 1.2,
	paddingBottom: nonePdBt ? 0 : theme.spacing(1.5),
}));

export const QuickActionGrid = styled(Box)(({ theme, stylePbottom }) => ({
	display: "grid",
	gap: theme.spacing(1.5),
	paddingBottom: theme.spacing(stylePbottom || 0),
	gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
	[theme.breakpoints.up("sm")]: {
		// Use auto-fit so odd item counts don't leave a rigid empty column at row end.
		gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
	},
	"@media (min-width: 600px) and (max-width: 1199.95px)": {
		gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
		gap: theme.spacing(1),
	},
}));