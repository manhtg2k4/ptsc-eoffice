import { styled, alpha } from "@mui/material/styles";
import { Box, Button, Stack, Typography } from "@mui/material";
import { PageTitle } from "./ThemeConfig.styles";

const premiumPalette = {
	surfaceAlt: "#F8F9FB",
	borderLight: "#EEF0F4",
	textSecondary: "#5F6B7A",
	textMuted: "#8D96A3",
	blue: "#0052CC",
	blueLight: "#E8F0FE",
	blueDark: "#003D99",
	navy: "#0A1628",
	red: "#E53935",
	redBg: "#FFF0F0",
	orange: "#F57C00",
	orangeBg: "#FFF4E6",
	green: "#2E7D32",
	greenBg: "#E8F5E9",
	teal: "#00897B",
	tealBg: "#E0F2F1",
	purple: "#7B1FA2",
	purpleBg: "#F3E5F5",
};

export const getPremiumColor = (color) => {
	const map = {
		blue: premiumPalette.blue,
		green: premiumPalette.green,
		orange: premiumPalette.orange,
		teal: premiumPalette.teal,
		purple: premiumPalette.purple,
		red: premiumPalette.red,
		gray: premiumPalette.textMuted,
	};
	return map[color] || premiumPalette.blue;
};

export const getPremiumSoftColor = (color) => {
	const map = {
		blue: premiumPalette.blueLight,
		green: premiumPalette.greenBg,
		orange: premiumPalette.orangeBg,
		teal: premiumPalette.tealBg,
		purple: premiumPalette.purpleBg,
		red: premiumPalette.redBg,
		neutral: premiumPalette.surfaceAlt,
		default: premiumPalette.surfaceAlt,
		warning: premiumPalette.orangeBg,
		success: premiumPalette.greenBg,
		danger: premiumPalette.redBg,
	};
	return map[color] || premiumPalette.surfaceAlt;
};

export const getPremiumTagColor = (type) => {
	const map = {
		up: premiumPalette.green,
		down: premiumPalette.red,
		neutral: premiumPalette.textSecondary,
	};
	return map[type] || premiumPalette.textSecondary;
};

export const getPremiumTagBg = (type) => {
	const map = {
		up: premiumPalette.greenBg,
		down: premiumPalette.redBg,
		neutral: premiumPalette.surfaceAlt,
	};
	return map[type] || premiumPalette.surfaceAlt;
};

export const getPremiumStatusColor = (status) => {
	const map = {
		good: premiumPalette.green,
		warn: premiumPalette.orange,
		bad: premiumPalette.red,
	};
	return map[status] || premiumPalette.blue;
};

export const getPremiumStatusBg = (status) => {
	const map = {
		good: premiumPalette.greenBg,
		warn: premiumPalette.orangeBg,
		bad: premiumPalette.redBg,
	};
	return map[status] || premiumPalette.blueLight;
};

export const getPremiumApprovalTypeBg = (type) => {
	const map = {
		doc: premiumPalette.blueLight,
		hr: premiumPalette.purpleBg,
		it: premiumPalette.tealBg,
		vehicle: premiumPalette.orangeBg,
		training: premiumPalette.greenBg,
	};
	return map[type] || premiumPalette.surfaceAlt;
};

export const getPremiumDocUrgencyColor = (urgency) => {
	const map = {
		urgent: premiumPalette.red,
		expedite: premiumPalette.orange,
		normal: premiumPalette.textSecondary,
		done: premiumPalette.green,
		draft: "#F9A825",
		pending: premiumPalette.blue,
	};
	return map[urgency] || premiumPalette.textSecondary;
};

export const getPremiumDocUrgencyBg = (urgency) => {
	const map = {
		urgent: premiumPalette.red,
		expedite: premiumPalette.orange,
		normal: premiumPalette.borderLight,
		done: premiumPalette.greenBg,
		draft: "#FFF9C4",
		pending: premiumPalette.blueLight,
	};
	return map[urgency] || premiumPalette.borderLight;
};

export const GhostContainer = styled("div", {
	shouldForwardProp: (prop) => prop !== "dndStyle",
})(({ dndStyle }) => ({
	background: "rgba(255,255,255,0.95)",
	border: "2px dashed #0052CC",
	borderRadius: 12,
	padding: "20px 24px",
	display: "flex",
	alignItems: "center",
	gap: 10,
	fontSize: 14,
	fontWeight: 600,
	color: "#0052CC",
	boxShadow: "0 8px 24px rgba(0,82,204,0.18)",
	minHeight: 60,

	// 👇 thay cho .attrs()
	...(dndStyle || {}),
}));

export const DraggableWrapper = styled("div", {
	shouldForwardProp: (prop) => prop !== "dndStyle" && prop !== "snapshot",
})(({ snapshot, dndStyle }) => ({
	opacity: snapshot?.isDragging ? 0 : 1,
	height: "100%",

	// 👇 thay cho .attrs()
	...(dndStyle || {}),
}));

export const HandleNode = styled("div")({
	cursor: "grab",
	opacity: 0.5,
	marginRight: 8,
	display: "flex",
	alignItems: "center",
});

export const PremiumMainStack = styled(Stack)(({ theme }) => ({
	gap: 24,
	[theme.breakpoints.down("md")]: {
		gap: 20,
	},
	[theme.breakpoints.down("sm")]: {
		gap: 16,
	},
}));

export const PremiumKpiGrid = styled(Box, {
	shouldForwardProp: (prop) => prop !== "columnsCount",
})(({ theme, columnsCount }) => ({
	display: "grid",
	gridTemplateColumns: `repeat(${Math.max(columnsCount || 1, 1)}, minmax(0, 1fr))`,
	gap: 16,
	[theme.breakpoints.down("lg")]: {
		gridTemplateColumns: "repeat(3, 1fr)",
	},
	[theme.breakpoints.down("md")]: {
		gridTemplateColumns: "repeat(2, 1fr)",
	},
	[theme.breakpoints.down("sm")]: {
		gridTemplateColumns: "1fr",
	},
	"@media (min-width: 600px) and (max-width: 1199.95px)": {
		display: "flex",
		flexDirection: "row",
		overflowX: "auto",
		flexWrap: "nowrap",
		gap: 16,
		paddingBottom: 8,
		"& > *": {
			flex: "1 0 240px",
		},
		"&::-webkit-scrollbar": {
			height: 6,
		},
		"&::-webkit-scrollbar-thumb": {
			backgroundColor: "rgba(0,0,0,0.15)",
			borderRadius: 3,
		},
	},
}));

export const PremiumStatCard = styled(Box, {
	shouldForwardProp: (prop) => prop !== "accentColor",
})(({ theme, accentColor }) => ({
	background: theme.palette.background.paper,
	height: "100%",
	display: "flex",
	flexDirection: "column",
	border: `1px solid ${theme.palette.divider}`,
	borderRadius: 12,
	padding: 20,
	position: "relative",
	overflow: "hidden",
	transition: "box-shadow .2s, transform .15s",
	"&:hover": {
		boxShadow: theme.shadows[3],
		transform: "translateY(-1px)",
	},
	"&::before": {
		content: '""',
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		height: 10,
		// background: getPremiumColor(accentColor),
		background: accentColor,
	},
}));

export const PremiumKpiIconBox = styled(Box, {
	shouldForwardProp: (prop) => prop !== "accentColor",
})(({ accentColor }) => ({
	position: "absolute",
	top: 16,
	right: 16,
	width: 36,
	height: 36,
	borderRadius: 10,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	fontSize: 16,
	background: getPremiumSoftColor(accentColor),
}));

export const PremiumKpiLabel = styled(PageTitle)(() => ({
	fontSize: 18,
	color:"#585E65",
	fontWeight: 500,
	// marginBottom: 10,
	textTransform: "uppercase",
	paddingRight: 44,
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
	"@media (min-width: 600px) and (max-width: 1199.95px)": {
		fontSize: 12,
	},
}));

export const PremiumKpiValue = styled(PageTitle, {
	shouldForwardProp: (prop) => prop !== "accentColor",
})(({ accentColor }) => ({
	fontSize: 28,
	fontWeight: 800,
	letterSpacing: -1,
	lineHeight: 1,
	marginBottom: 8,
	color: accentColor,
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
}));

export const PremiumKpiTagRow = styled(Box, {
	shouldForwardProp: (prop) => prop !== "singleLine",
})(({ singleLine }) => ({
	display: "flex",
	gap: 6,
	flexWrap: singleLine ? "nowrap" : "wrap",
	justifyContent: singleLine ? "space-between" : "flex-start",
	alignItems: "center",
	marginTop: "auto",
	paddingTop: 10,
}));

export const PremiumKpiTag = styled(Box, {
	shouldForwardProp: (prop) => prop !== "tagType",
})(({ tagType }) => ({
	fontSize: 11,
	padding: "3px 8px",
	borderRadius: 4,
	fontWeight: 500,
	background: getPremiumTagBg(tagType),
	color: getPremiumTagColor(tagType),
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
}));

export const PremiumGridTwo = styled(Box)(({ theme }) => ({
	display: "grid",
	gridTemplateColumns: "1fr 1fr",
	gap: 20,
	[theme.breakpoints.down("md")]: {
		gridTemplateColumns: "1fr",
	},
}));

export const PremiumGridThree = styled(Box)(({ theme }) => ({
	display: "grid",
	gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
	gap: 20,
	[theme.breakpoints.down("lg")]: {
		gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
	},
	[theme.breakpoints.down("md")]: {
		gridTemplateColumns: "1fr",
	},
}));

export const PremiumAlertBanner = styled(Box)(({ theme }) => ({
	background: `linear-gradient(135deg, ${alpha(theme.palette.warning.light, 0.16)} 0%, ${alpha(theme.palette.warning.main, 0.08)} 100%)`,
	border: `1px solid ${alpha(theme.palette.warning.main, 0.28)}`,
	borderRadius: 12,
	padding: "16px 24px",
	display: "flex",
	alignItems: "center",
	gap: 16,
	[theme.breakpoints.down("sm")]: {
		padding: "14px 16px",
		alignItems: "flex-start",
	},
}));

export const PremiumAlertIcon = styled(Box)({
	width: 40,
	height: 40,
	background: "#FF9800",
	borderRadius: 10,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	fontSize: 18,
	flexShrink: 0,
});

export const PremiumAlertText = styled(PageTitle)(() => ({
	fontSize: 13.5,
	// color: theme.palette.text.primary,
	lineHeight: 1.55,
}));

export const PremiumAlertStrong = styled(Box)(({ theme }) => ({
	display: "inline",
	color: theme.palette.warning.dark,
	fontWeight: 600,
}));

export const PremiumAlertSeparator = styled(Box)(({ theme }) => ({
	display: "inline",
	margin: "0 8px",
	color: alpha(theme.palette.text.secondary, 0.75),
}));

export const PremiumPanelWrapper = styled(Box)(({ theme, backgroundDf }) => ({
	background: backgroundDf ? "#f9fafb" : theme.palette.background.paper,
	// background: backgroundDf ? theme.palette.background.default : theme.palette.background.paper,
	border: `1px solid ${theme.palette.divider}`,
	borderRadius: 12,
	overflow: "hidden",
	boxShadow: theme.shadows[2],
	height: 540,
	minHeight: 540,
	display: "flex",
	flexDirection: "column",
}));

export const PremiumPanelHeader = styled(Box)(({ theme, nonePdBt }) => ({
	padding:  nonePdBt ? theme.spacing(2, 2.5, 0, 2.5) : theme.spacing(2, 2.5),
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 12,
}));

export const PremiumPanelTitle = styled(Box)(({ theme }) => ({
	display: "flex",
	alignItems: "center",
	gap: 8,
	fontSize: 25,
	fontWeight: 700,
	color: theme.palette.text.primary,
	// textTransform: "uppercase",
	letterSpacing: 0.3,
}));

export const PremiumPanelLink = styled(Button)(({ theme }) => ({
	fontSize: 12.5,
	color: theme.palette.primary.main,
	textTransform: "none",
	fontWeight: 500,
	minWidth: "auto",
	padding: 0,
}));

export const PremiumBadge = styled(Box)(({ theme }) => ({
	background: theme.palette.error.main,
	color: "#fff",
	fontSize: 11,
	padding: "2px 8px",
	borderRadius: 10,
	fontWeight: 600,
}));

export const PremiumTabOuter = styled(Box)({
	padding: "16px 20px 0",
});

export const PremiumTabOuterFill = styled(PremiumTabOuter)({
	display: "flex",
	flexDirection: "column",
	flex: 1,
	minHeight: 0,
});

export const PremiumTabs = styled(Box)(({theme}) => ({
	display: "flex",
	gap: 2,
	marginBottom: theme.spacing(2.25),
	background: "#E8EDF2",
	// background: alpha(theme.palette.text.primary, 0.04),
	borderRadius: 8,
	padding: 3,
}));

export const PremiumTabButton = styled(Button, {
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
}));

export const PremiumScrollArea = styled(Box, {
	shouldForwardProp: (prop) => prop !== "scrollPadding" && prop !== "lockScroll",
})(({ scrollPadding, lockScroll }) => ({
	height: "auto",
	minHeight: 0,
	flex: 1,
	overflowY: lockScroll ? "hidden" : "auto",
	padding: scrollPadding || 0,
	scrollbarWidth: "none",
	msOverflowStyle: "none",
	"&::-webkit-scrollbar": {
		width: 0,
		height: 0,
		display: "none",
	},
}));

export const PremiumContentBody = styled(Box)(({ nonePdTop, theme }) => ({
	// padding: 20,
	padding: nonePdTop ? theme.spacing(0, 2.5, 2.5) : theme.spacing(2.5),
	height: "auto",
	minHeight: 0,
	flex: 1,
	boxSizing: "border-box",
	overflowY: "auto",
	"&::-webkit-scrollbar": {
		width: 0,
		height: 0,
		display: "none",
	},
}));

export const PremiumFlexContentBody = styled(PremiumContentBody)({
	display: "flex",
	flexDirection: "column",
});

export const PremiumSectionTitle = styled(PageTitle)(({ stCl }) => ({
	fontSize: 10,
	fontWeight: 700,
	color: stCl || "#5A6573",
	textTransform: "uppercase",
	letterSpacing: 0.5,
	marginBottom: 10,
}));

export const PremiumLegendRow = styled(Box)({
	display: "flex",
	flexWrap: "wrap",
	gap: 12,
	marginTop: 14,
	alignItems: "center",
	marginBottom: 4
});

export const PremiumLegendItem = styled(Box)(({ theme }) => ({
	display: "flex",
	alignItems: "center",
	gap: 6,
	fontSize: 12,
	color: theme.palette.text.secondary,
}));

export const PremiumLegendDot = styled(Box, {
	shouldForwardProp: (prop) => prop !== "dotColor",
})(({ dotColor }) => ({
	width: 10,
	height: 10,
	borderRadius: 3,
	background: dotColor,
}));

export const PremiumLegendNote = styled(Box)(({ theme }) => ({
	marginLeft: "auto",
	fontSize: 11,
	color: alpha(theme.palette.text.secondary, 0.7),
}));

export const PremiumBarChartWrap = styled(Box)({
	display: "flex",
	flexDirection: "column",
	gap: 6,
});

export const PremiumBarRow = styled(Box)(({ theme, styleCursor }) => ({
	display: "flex",
	alignItems: "flex-end",
	gap: 12,
	cursor: styleCursor ? 'pointer' : 'default',
	paddingBottom: theme.spacing(1.875),
}));

export const PremiumBarContent = styled(Box)({
	flex: 1,
	display: "flex",
	flexDirection: "column",
	gap: 6,
	minWidth: 0,
});

export const PremiumBarName = styled(PageTitle)(({ theme }) => ({
	fontSize: 11.5,
	color: theme.palette.text.secondary,
	width: "100%",
	flex: "none",
	textAlign: "left",
	fontWeight: 500,
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
}));

export const PremiumBarTrack = styled(Box)(({ theme }) => ({
	width: "100%",
	height: 6,
	background: alpha(theme.palette.text.primary, 0.06),
	borderRadius: 3,
	overflow: "hidden",
	position: "relative",
}));

export const PremiumBarFill = styled(Box, {
	shouldForwardProp: (prop) => prop !== "fillWidth" && prop !== "fillColor",
})(({ fillWidth, fillColor }) => ({
	height: "100%",
	width: `${fillWidth}%`,
	background: fillColor,
	borderRadius: 3,
	transition: "width 0.8s ease",
	transformOrigin: "left center",
	animation: "premiumBarBoot .95s ease-out",
	"@keyframes premiumBarBoot": {
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

export const PremiumBarTargetLine = styled(Box, {
	shouldForwardProp: (prop) => prop !== "positionLeft",
})(({ theme, positionLeft }) => ({
	position: "absolute",
	left: `${positionLeft}%`,
	top: 0,
	bottom: 0,
	width: 1.5,
	background: theme.palette.text.primary,
	opacity: 0.2,
}));

export const PremiumBarValue = styled(PageTitle, {
	shouldForwardProp: (prop) => prop !== "textColor",
})(({ textColor }) => ({
	fontSize: 12,
	fontWeight: 700,
	width: 40,
	flex: "0 0 40px",
	textAlign: "right",
	color: textColor,
}));

export const PremiumDeptTable = styled(Box)(({ theme }) => ({
	display: "flex",
	flexDirection: "column",
	[theme.breakpoints.down("sm")]: {
		overflowX: "auto",
	},
}));

export const PremiumDeptTableHeader = styled(Box)(({ theme }) => ({
	display: "grid",
	gridTemplateColumns: "2.4fr 1fr 1.3fr .8fr 1fr",
	gap: 12,
	padding: "0 12px 12px 20px",
	borderBottom: `1px solid ${theme.palette.divider}`,
	[theme.breakpoints.down("sm")]: {
		minWidth: 560,
	},
}));

export const PremiumDeptHeaderCell = styled(PageTitle)(({ theme }) => ({
	fontSize: 10.5,
	fontWeight: 600,
	color: alpha(theme.palette.text.secondary, 0.7),
	textTransform: "uppercase",
	letterSpacing: 0.5,
}));

export const PremiumDeptTableRow = styled(Box)(({ theme, styleCursor }) => ({
	display: "grid",
	gridTemplateColumns: "2.4fr 1fr 1.3fr .8fr 1fr",
	gap: 12,
	padding: "14px 12px 14px 20px",
	alignItems: "center",
	borderBottom: `1px solid ${theme.palette.divider}`,
	"&:last-child": {
		borderBottom: "none",
	},
	"&:hover": {
		background: alpha(theme.palette.text.primary, 0.03),
	},
	[theme.breakpoints.down("sm")]: {
		minWidth: 560,
	},
	cursor: styleCursor ? 'pointer' : 'default'
}));

export const PremiumDeptNameWrap = styled(Box)({
	display: "flex",
	alignItems: "center",
	gap: 10,
	minWidth: 0,
});

export const PremiumDeptAvatar = styled(Box, {
	shouldForwardProp: (prop) => prop !== "avatarColor",
})(({ avatarColor }) => ({
	width: 34,
	height: 34,
	borderRadius: 8,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	fontSize: 13,
	fontWeight: 700,
	color: "#fff",
	flexShrink: 0,
	background: avatarColor,
}));

export const PremiumDeptName = styled(PageTitle)(() => ({
	fontWeight: 600,
	fontSize: 13,
	// color: theme.palette.text.primary,
}));

export const PremiumDeptHead = styled(PageTitle)(({ theme }) => ({
	fontSize: 11,
	color: alpha(theme.palette.text.secondary, 0.72),
}));

export const PremiumRatioText = styled(PageTitle)({
	fontSize: 13,
});

export const PremiumRatioStrong = styled(Box)({
	display: "inline",
	fontWeight: 600,
});

export const PremiumRatioMuted = styled(Box)(({ theme }) => ({
	display: "inline",
	color: alpha(theme.palette.text.secondary, 0.72),
}));

export const PremiumProgressTrack = styled(Box, {
	shouldForwardProp: (prop) => prop !== "trackHeight",
})(({ theme, trackHeight }) => ({
	width: "100%",
	height: trackHeight || 6,
	background: alpha(theme.palette.text.primary, 0.06),
	borderRadius: 3,
	overflow: "hidden",
}));

export const PremiumProgressFill = styled(Box, {
	shouldForwardProp: (prop) => prop !== "fillWidth" && prop !== "fillColor",
})(({ fillWidth, fillColor }) => ({
	width: `${fillWidth}%`,
	height: "100%",
	borderRadius: 3,
	transition: "width .8s ease",
	background: fillColor,
}));

export const PremiumStatusChip = styled(Box, {
	shouldForwardProp: (prop) => prop !== "statusType",
})(({ statusType }) => ({
	display: "inline-flex",
	alignItems: "center",
	gap: 4,
	fontSize: 11.5,
	fontWeight: 600,
	padding: "4px 10px",
	borderRadius: 6,
	background: getPremiumStatusBg(statusType),
	color: getPremiumStatusColor(statusType),
}));

export const PremiumOverviewStatGrid = styled(Box)(({ theme }) => ({
	display: "grid",
	gridTemplateColumns: "repeat(3, 1fr)",
	gap: 10,
	marginBottom: 18,
	[theme.breakpoints.down("sm")]: {
		gridTemplateColumns: "1fr",
	},
}));

export const PremiumOverviewStatCard = styled(Box, {
	shouldForwardProp: (prop) => prop !== "tone",
})(() => ({
	padding: 12,
	borderRadius: 8,
	textAlign: "center",
	backgroundColor: "#F9FAFB",
	// backgroundColor: theme.palette.background.default,
}));

export const PremiumOverviewStatValue = styled(PageTitle, {
	shouldForwardProp: (prop) => prop !== "colorValue",
})(({ colorValue }) => ({
	fontSize: 20,
	fontWeight: 800,
	// color:
	// 	tone === "danger"
	// 		? theme.palette.error.main
	// 		: tone === "success"
	// 			? theme.palette.success.main
	// 			: theme.palette.primary.main,
	color: colorValue
}));

export const PremiumOverviewStatLabel = styled(PageTitle)(({ theme }) => ({
	fontSize: 10.5,
	color: alpha(theme.palette.text.secondary, 0.7),
}));

export const PremiumHeatmapWrap = styled(Box)({
	marginBottom: 10,
});

export const PremiumHeatmapGrid = styled(Box)(({ theme }) => ({
	display: "grid",
	gridTemplateColumns: "auto repeat(5, 1fr)",
	gap: 3,
	fontSize: 10,
	[theme.breakpoints.down("sm")]: {
		minWidth: 320,
	},
}));

export const PremiumHeatmapHeader = styled(Box)(({ theme }) => ({
	fontWeight: 600,
	color: alpha(theme.palette.text.secondary, 0.7),
	textAlign: "center",
	padding: "4px 2px",
}));

export const PremiumHeatmapLabel = styled(Box)(({ theme }) => ({
	fontWeight: 500,
	color: theme.palette.text.secondary,
	padding: "4px 6px 4px 0",
	textAlign: "right",
	fontSize: 11,
}));

export const PremiumHeatmapCell = styled(Box, {
	shouldForwardProp: (prop) => prop !== "cellColor",
})(({ cellColor }) => ({
	borderRadius: 3,
	height: 26,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	fontSize: 10,
	fontWeight: 600,
	color: "#fff",
	background: cellColor,
}));

export const PremiumHeatLegendWrap = styled(Box)({
	display: "flex",
	alignItems: "center",
	gap: 8,
	marginBottom: 18,
});

export const PremiumHeatLegendText = styled(PageTitle)(({ theme }) => ({
	fontSize: 11,
	color: alpha(theme.palette.text.secondary, 0.7),
}));

export const PremiumHeatLegendScale = styled(Box)({
	display: "flex",
	gap: 2,
});

export const PremiumHeatLegendCell = styled(Box, {
	shouldForwardProp: (prop) => prop !== "cellColor",
})(({ cellColor }) => ({
	width: 16,
	height: 12,
	background: cellColor,
	borderRadius: 2,
}));

export const PremiumSummaryGridFour = styled(Box)(({ theme }) => ({
	display: "grid",
	gridTemplateColumns: "repeat(4, 1fr)",
	gap: 10,
	marginBottom: 14,
	[theme.breakpoints.down("md")]: {
		gridTemplateColumns: "repeat(2, 1fr)",
	},
	[theme.breakpoints.down("sm")]: {
		gridTemplateColumns: "1fr",
	},
}));

export const PremiumDetailProjectTitle = styled(PageTitle)(({ theme }) => ({
	fontSize: 25,
	fontWeight: 700,
	lineHeight: 1.1,
	marginBottom: 14,
	color: theme.palette.text.primary,
	[theme.breakpoints.down("md")]: {
		fontSize: 18,
	},
	[theme.breakpoints.down("sm")]: {
		fontSize: 14,
	},
}));

export const PremiumProjectListScrollCard = styled(Box)(({ theme }) => ({
	border: `1px solid ${alpha(theme.palette.text.primary, 0.18)}`,
	borderRadius: 10,
	background: theme.palette.background.paper,
	padding: "10px 12px",
	display: "flex",
	flexDirection: "column",
	flex: 1,
	minHeight: 0,
	overflow: "hidden",
}));

export const PremiumDetailBody = styled(Box)({
	padding: 20,
	display: "flex",
	flexDirection: "column",
	height: "100%",
	minHeight: 0,
	boxSizing: "border-box",
});

export const PremiumSummaryGridThree = styled(Box)(({ theme }) => ({
	display: "grid",
	gridTemplateColumns: "repeat(3, 1fr)",
	gap: 10,
	marginBottom: 18,
	[theme.breakpoints.down("md")]: {
		gridTemplateColumns: "repeat(2, 1fr)",
	},
	[theme.breakpoints.down("sm")]: {
		gridTemplateColumns: "1fr",
	},
}));

export const PremiumSummaryBox = styled(Box, {
	shouldForwardProp: (prop) => prop !== "tone",
})(({ theme }) => ({
	padding: 12,
	borderRadius: 8,
	textAlign: "left",
	backgroundColor: theme.palette.paper,
	border: "1px solid #E5E7EB",
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

export const PremiumSummaryValue = styled(PageTitle, {
	shouldForwardProp: (prop) => prop !== "tone",
})(({ theme, clText }) => ({
	fontSize: 22,
	fontWeight: 800,
	color: clText || theme.palette.text.primary,
}));

export const PremiumSummaryLabel = styled(PageTitle)(() => ({
	fontSize: 10.5,
	color: "#94A3B8",
}));

export const PremiumMiniProjectList = styled(Box)({
	display: "flex",
	flexDirection: "column",
	gap: 14,
});

export const PremiumMiniProjectItem = styled(Box)(({ theme, styleCursor }) => ({
	paddingBottom: 14,
	borderBottom: `1px solid ${theme.palette.divider}`,
	"&:last-child": {
		paddingBottom: 0,
		borderBottom: "none",
	},
	cursor: styleCursor ? 'pointer' : 'default'
}));

export const PremiumMiniProjectHeader = styled(Box)({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 12,
	marginBottom: 4,
});

export const PremiumMiniProjectName = styled(PageTitle)(() => ({
	fontSize: 12.5,
	fontWeight: 600,
	// color: theme.palette.text.primary,
}));

export const PremiumMiniProjectMeta = styled(PageTitle)(({ theme }) => ({
	fontSize: 11,
	color: alpha(theme.palette.text.secondary, 0.7),
	marginBottom: 6,
}));

export const PremiumMiniProjectProgressRow = styled(Box)({
	display: "flex",
	alignItems: "center",
	gap: 8,
});

export const PremiumMiniProjectPercent = styled(PageTitle, {
	shouldForwardProp: (prop) => prop !== "textColor",
})(({ textColor }) => ({
	fontSize: 13,
	fontWeight: 800,
	color: textColor,
	minWidth: 36,
	textAlign: "right",
}));

export const PremiumActionRow = styled(Box)(({ theme, justifyContentEnd }) => ({
	display: "flex",
	gap: 6,
	alignItems: "center",
	justifyContent: justifyContentEnd || "unset",
	[theme.breakpoints.down("sm")]: {
		flexDirection: "column",
		alignItems: "stretch",
		width: "100%",
	},
}));

export const PremiumActionButton = styled(Button, {
	shouldForwardProp: (prop) => prop !== "tone",
})(({ theme, tone }) => ({
	padding: "6px 14px",
	height: 32,
	borderRadius: 6,
	fontSize: 12,
	fontWeight: 600,
	textTransform: "none",
	minWidth: 88,
	color: tone === "reject" ? theme.palette.error.main : theme.palette.success.main,
	background:
		tone === "reject"
			? alpha(theme.palette.error.main, 0.1)
			: alpha(theme.palette.success.main, 0.1),
	[theme.breakpoints.down("sm")]: {
		width: "100%",
		minWidth: 0,
		height: 30,
		fontSize: 11,
	},
}));

export const PremiumApprovalItem = styled(Box)(({ theme, styleCursor }) => ({
	padding: "12px 16px",
	display: "flex",
	alignItems: "flex-start",
	gap: 14,
	background: theme.palette.background.default,
	borderRadius: 12,
	// border: `1px solid ${theme.palette.divider}`,
	marginBottom: 10,
	"&:last-child": {
		marginBottom: 0,
	},
	// "&:hover": {
	//   background: alpha(theme.palette.primary.main, 0.04),
	//   borderColor: alpha(theme.palette.primary.main, 0.2),
	// },
	cursor: styleCursor ? "pointer" : "default",
}));

export const PremiumApprovalType = styled(Box, {
	shouldForwardProp: (prop) => prop !== "approvalType",
})(({ approvalType }) => ({
	width: 38,
	height: 38,
	borderRadius: 10,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	fontSize: 16,
	flexShrink: 0,
	background: getPremiumApprovalTypeBg(approvalType),
}));

export const PremiumApprovalBody = styled(Box)({
	flex: 1,
	minWidth: 0,
});

export const PremiumApprovalMeta = styled(PageTitle)(({ theme }) => ({
	fontSize: 11.5,
	color: alpha(theme.palette.text.secondary, 0.7),
	// marginBottom: 6,
	display: "flex",
	alignItems: "center",
	gap: 8,
	flexWrap: "wrap",
}));

export const PremiumApprovalMetaChip = styled(Box)(({ theme }) => ({
	display: "inline-flex",
	alignItems: "center",
	gap: 4,
	padding: "4px 10px",
	borderRadius: 999,
	background: alpha(theme.palette.primary.main, 0.08),
	color: alpha(theme.palette.text.primary, 0.78),
	fontSize: 10.5,
	fontWeight: 600,
	lineHeight: 1.2,
}));

export const PremiumApprovalOverdue = styled(Box)(({ theme }) => ({
	display: "inline-flex",
	alignItems: "center",
	gap: 4,
	background: alpha(theme.palette.error.main, 0.12),
	color: theme.palette.error.main,
	fontSize: 10.5,
	padding: "4px 10px",
	borderRadius: 999,
	fontWeight: 600,
}));

export const PremiumApprovalDesc = styled(PageTitle)(() => ({
	fontSize: 16,
	fontWeight: 600,
	color: "#131A20",
	lineHeight: 1.45,
}));

export const PremiumApprovalSubDesc = styled("div")(() => ({
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
}));

export const SubTextFrom = styled(PageTitle)(() => ({
	fontWeight: 500,
	fontSize: 11
}));

export const PremiumDocumentItem = styled(Box)(({ theme, styleCursor }) => ({
	padding: "12px 20px",
	// borderBottom: `1px solid ${theme.palette.divider}`,
	display: "flex",
	alignItems: "center",
	borderRadius: 12,
	gap: 12,
	"&:last-child": {
		borderBottom: "none",
	},
	"&:hover": {
		background: alpha(theme.palette.text.primary, 0.03),
	},
	cursor: styleCursor ? 'pointer' : 'default'
}));

export const PremiumDocumentTimeCol = styled(Box)(({ theme }) => ({
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	gap: 2,
	textAlign: "center",
	minWidth: 64,
	height: 64,
	padding: "6px 8px",
	borderRadius: 12,
	border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
	background: "#2364B0",
	flexShrink: 0,
	[theme.breakpoints.down("sm")]: {
		alignSelf: "flex-start",
	},
}));

export const PremiumDocumentTime = styled(PageTitle)(() => ({
	fontSize: 20,
	color: "#fff",
	minWidth: 48,
	flexShrink: 0,
}));

export const PremiumDocumentBody = styled(Box)({
	flex: 1,
	minWidth: 0,
});

export const PremiumDocumentTitle = styled(PageTitle)(() => ({
	fontSize: 13,
	fontWeight: 600,
	marginBottom: 2,
	color: "#131A20",
}));

export const PremiumDocumentFrom = styled(PageTitle)(({ theme }) => ({
	fontSize: 11.5,
	color: alpha(theme.palette.text.secondary, 0.7),
}));

export const PremiumDocumentMetaRow = styled(Box)({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 10,
});

export const PremiumDocumentUrgency = styled(Box, {
	shouldForwardProp: (prop) => prop !== "urgencyType",
})(({ urgencyType }) => ({
	fontSize: 10,
	fontWeight: 700,
	padding: "3px 8px",
	// borderRadius: 4,
	borderRadius: "999px",
	border: `1px solid ${getPremiumDocUrgencyColor(urgencyType)}20`,
	letterSpacing: 0.3,
	whiteSpace: "nowrap",
	background: getPremiumDocUrgencyBg(urgencyType),
	color:
		urgencyType === "urgent" || urgencyType === "expedite"
			? "#fff"
			: getPremiumDocUrgencyColor(urgencyType),
}));

export const PremiumBarColumnWrap = styled(Box)(({ theme }) => ({
	display: "flex",
	alignItems: "flex-end",
	gap: 12,
	height: 160,
	paddingBottom: 1,
	borderBottom: `1px solid ${theme.palette.divider}`,
}));

export const PremiumBarMonthGroup = styled(Box)({
	flex: 1,
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	gap: 0,
});

export const PremiumBarPair = styled(Box)({
	display: "flex",
	gap: 3,
	alignItems: "flex-end",
	width: "100%",
	justifyContent: "center",
});

export const PremiumMonthBars = styled(Box, {
	shouldForwardProp: (prop) =>
		prop !== "barHeight" && prop !== "barColor" && prop !== "labelColor",
})(({ barHeight, barColor, labelColor }) => ({
	width: "38%",
	height: barHeight,
	background: barColor,
	borderRadius: "3px 3px 0 0",
	position: "relative",
	transition: "height 0.6s ease",
	transformOrigin: "bottom center",
	animation: "premiumMonthBoot .85s ease-out",
	"@keyframes premiumMonthBoot": {
		from: {
			transform: "scaleY(0)",
			opacity: 0.75,
		},
		to: {
			transform: "scaleY(1)",
			opacity: 1,
		},
	},
	"&::before": {
		content: `attr(data-label)`,
		position: "absolute",
		top: -16,
		left: "50%",
		transform: "translateX(-50%)",
		fontSize: 10,
		fontWeight: 700,
		color: labelColor,
	},
}));

export const PremiumMonthLabels = styled(Box)({
	display: "flex",
	gap: 12,
});

export const PremiumMonthLabel = styled(Box)(({ theme }) => ({
	flex: 1,
	textAlign: "center",
	fontSize: 11,
	color: alpha(theme.palette.text.secondary, 0.7),
	paddingTop: 6,
}));

export const PremiumCategoryGridFour = styled(Box)(({ theme }) => ({
	display: "grid",
	gridTemplateColumns: "repeat(4,1fr)",
	gap: 8,
	[theme.breakpoints.down("sm")]: {
		gridTemplateColumns: "repeat(2, 1fr)",
	},
}));

export const PremiumCategoryCard = styled(Box, {
	shouldForwardProp: (prop) => prop !== "bgCl",
})(({ bgCl }) => ({
	padding: 10,
	borderRadius: 8,
	textAlign: "center",
	background: bgCl
}));

export const PremiumCategoryLabel = styled(PageTitle, {
	shouldForwardProp: (prop) => prop !== "colorText",
})(({ colorText }) => ({
	fontSize: 10,
	fontWeight: 500,
	color: colorText,
}));

export const PremiumCategoryValue = styled(PageTitle, {
	shouldForwardProp: (prop) => prop !== "colorText",
})(({ colorText }) => ({
	fontSize: 18,
	fontWeight: 800,
	color: colorText
}));

export const PremiumStackedBarRow = styled(Box)(({ styleCursor, theme }) => ({
	display: "flex",
	alignItems: "center",
	gap: 10,
	marginBottom: theme.spacing(2.5),
	cursor: styleCursor ? 'pointer' : 'default'
}));

export const PremiumStackedBarColumn = styled(Box)({
	flex: 1,
	minWidth: 0,
	display: "flex",
	flexDirection: "column",
	gap: 6,
});

export const PremiumStackedBarHead = styled(Box)({
	width: "100%",
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 12,
});

export const PremiumStackedLabel = styled(PageTitle)(() => ({
	fontSize: 12,
	// color: theme.palette.text.secondary,
	color: "#475569",
	flex: 1,
	textAlign: "left",
	fontWeight: 700,
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
}));

export const PremiumStackedTrack = styled(Box, {
	shouldForwardProp: (prop) =>
		prop !== "trackHeight" &&
		prop !== "trackRadius" &&
		prop !== "trackBg" &&
		prop !== "trackFlex" &&
		prop !== "trackWidth",
})(({ theme, trackHeight, trackRadius, trackBg, trackFlex, trackWidth }) => ({
	flex: trackFlex ?? "none",
	width: trackWidth || "100%",
	height: trackHeight || 24,
	display: "flex",
	borderRadius: trackRadius || 4,
	overflow: "hidden",
	background: trackBg || alpha(theme.palette.text.primary, 0.06),
}));

export const PremiumStackedSegment = styled(Box, {
	shouldForwardProp: (prop) => prop !== "segmentWidth" && prop !== "segmentColor" && prop !== "segmentRadius",
})(({ segmentWidth, segmentColor, segmentRadius }) => ({
	width: `${segmentWidth}%`,
	flexShrink: 0,
	background: segmentColor,
	borderRadius: segmentRadius || 0,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	color: "#fff",
	fontSize: 10,
	fontWeight: 700,
	transformOrigin: "left center",
	animation: "premiumStackBoot .9s ease-out",
	"@keyframes premiumStackBoot": {
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

export const PremiumStackedValue = styled(PageTitle, {
	shouldForwardProp: (prop) => prop !== "valueSize" && prop !== "valueMinWidth",
})(({ valueSize, valueMinWidth }) => ({
	fontSize: valueSize || 12,
	fontWeight: 700,
	// color: theme.palette.text.primary,
	minWidth: valueMinWidth || 24,
	textAlign: "right",
}));

export const PremiumAvgBox = styled(Box)(() => ({
	marginTop: 16,
	// background: alpha(theme.palette.text.primary, 0.04),
	borderRadius: 10,
	// padding: "14px 16px",
}));

export const PremiumAvgInner = styled(Box)(({ theme }) => ({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 16,
	[theme.breakpoints.down("sm")]: {
		flexDirection: "column",
		alignItems: "flex-start",
	},
}));

export const PremiumAvgLabel = styled(PageTitle)(() => ({
	fontSize: 11,
	color: "#94A3B8",
	fontWeight: 900,
	marginBottom: 2,
}));

export const PremiumAvgValue = styled(PageTitle)(() => ({
	fontSize: 20,
	fontWeight: 800,
	color: "#2364B0",
}));

export const PremiumAvgSuffix = styled(Box)(() => ({
	display: "inline",
	fontSize: 12,
	fontWeight: 500,
	color: "#94A3B8",
}));

export const PremiumAvgChange = styled(PageTitle)(({ theme }) => ({
	fontSize: 14,
	fontWeight: 700,
	color: theme.palette.success.main,
}));

export const PremiumTaskStackLegend = styled(PremiumLegendRow)({
	marginTop: 12,
});

export const PremiumHrGrid = styled(Box)(({ theme }) => ({
	display: "grid",
	gridTemplateColumns: "repeat(3, 1fr)",
	gap: 12,
	marginBottom: 16,
	[theme.breakpoints.down("sm")]: {
		gridTemplateColumns: "1fr",
	},
}));

export const PremiumHrStat = styled(Box)(({ styleCursor }) => ({
	background: "#F9FAFB",
	// background: alpha(theme.palette.text.primary, 0.04),
	borderRadius: 8,
	padding: 14,
	textAlign: "center",
	cursor: styleCursor ? "pointer" : "default",

}));

export const PremiumHrStatValue = styled(PageTitle, {
	shouldForwardProp: (prop) => prop !== "tone",
})(({ theme, tone }) => ({
	fontSize: 22,
	fontWeight: 800,
	color:
		tone === "green"
			? theme.palette.success.main
			: tone === "red"
				? theme.palette.error.main
				: theme.palette.primary.main,
}));

export const PremiumHrStatLabel = styled(PageTitle)(({ theme }) => ({
	fontSize: 11,
	color: alpha(theme.palette.text.secondary, 0.7),
	marginTop: 2,
}));

export const PremiumHrDeptRow = styled(Box)(({ theme, styleCursor }) => ({
	display: "flex",
	alignItems: "center",
	gap: 10,
	padding: theme.spacing(1.25, 0),
	// padding: "8px 0",
	borderBottom: `1px solid ${theme.palette.divider}`,
	"&:last-child": {
		borderBottom: "none",
	},
	cursor: styleCursor ? "pointer" : "default",
}));

export const PremiumHrDeptName = styled(PageTitle)(() => ({
	flex: 1,
	fontSize: 12.5,
	fontWeight: 500,
	// color: theme.palette.text.primary,
}));

export const PremiumHrDeptBarWrap = styled(Box)({
	flex: 1,
	maxWidth: 80,
});

export const PremiumHrDeptCount = styled(PageTitle)(({ theme }) => ({
	fontSize: 13,
	fontWeight: 700,
	color: theme.palette.primary.main,
	minWidth: 30,
	textAlign: "right",
}));

export const PremiumMeetingItem = styled(Box)(({ theme, styleCursor }) => ({
	padding: "14px 20px",
	// borderBottom: `1px solid ${theme.palette.divider}`,
	borderRadius: 12,
	display: "flex",
	gap: 14,
	alignItems: "flex-start",
	"&:last-child": {
		borderBottom: "none",
	},
	"&:hover": {
		background: alpha(theme.palette.text.primary, 0.03),
	},
	[theme.breakpoints.down("sm")]: {
		flexDirection: "column",
	},
	cursor: styleCursor ? "pointer" : "default"
}));

export const PremiumMeetingTimeCol = styled(Box, {
	shouldForwardProp: (prop) => prop !== "bgCl",
})(({ theme, bgCl }) => ({
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	gap: 2,
	textAlign: "center",
	minWidth: 64,
	height: 64,
	padding: "6px 8px",
	borderRadius: 12,
	border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
	background: bgCl || alpha(theme.palette.text.primary, 0.06),
	flexShrink: 0,
	"& > *": {
		color: bgCl === "#2364B0" ? "#FFFFFF !important" : undefined,
	},
	[theme.breakpoints.down("sm")]: {
		alignSelf: "flex-start",
	},
}));

export const PremiumMeetingHour = styled(PageTitle)(({ theme }) => ({
	fontSize: 14,
 	fontWeight: 700,
	lineHeight: 1.1,
	color: theme.palette.text.primary,
}));

export const PremiumMeetingDate = styled(PageTitle)(({ theme }) => ({
	fontSize: 10.5,
	lineHeight: 1.1,
	color: alpha(theme.palette.text.secondary, 0.7),
}));

export const PremiumMeetingBody = styled(Box)({
	flex: 1,
});

export const PremiumMeetingTitle = styled(PageTitle)(() => ({
	fontSize: 13,
	fontWeight: 600,
	marginBottom: 3,
	// color: theme.palette.text.primary,
}));

export const PremiumMeetingDetail = styled(PageTitle)(({ theme }) => ({
	fontSize: 12,
	color: theme.palette.text.secondary,
	paddingBottom: 4,
}));

export const PremiumMeetingLive = styled(Box)(({ theme }) => ({
	display: "inline-flex",
	alignItems: "center",
	gap: 4,
	fontSize: 11,
	fontWeight: 600,
	color: theme.palette.error.main,
	marginTop: 4,
}));

export const PremiumPulseDot = styled(Box)(({ theme }) => ({
	width: 6,
	height: 6,
	background: theme.palette.error.main,
	borderRadius: "50%",
	animation: "pulse 1.5s infinite",
	"@keyframes pulse": {
		"0%, 100%": { opacity: 1 },
		"50%": { opacity: 0.3 },
	},
}));

export const PremiumJoinButton = styled(Button)(({ theme }) => ({
	padding: "6px 14px",
	height: 32,
	background: theme.palette.primary.main,
	color: "#fff",
	borderRadius: 6,
	fontSize: 12,
	fontWeight: 600,
	textTransform: "none",
	minWidth: 88,
	alignSelf: "center",
	"&:hover": {
		background: theme.palette.primary.dark,
	},
	[theme.breakpoints.down("sm")]: {
		alignSelf: "stretch",
		minWidth: 0,
		height: 30,
		fontSize: 11,
	},
}));

export const PremiumUtilityGrid = styled(Box)(({ theme }) => ({
	display: "grid",
	gridTemplateColumns: "repeat(3,1fr)",
	gap: 12,
	[theme.breakpoints.down("sm")]: {
		gridTemplateColumns: "1fr",
	},
}));

export const PremiumUtilityCard = styled(Box)(({ theme, styleCursor }) => ({
	background: alpha(theme.palette.text.primary, 0.04),
	borderRadius: 8,
	padding: 16,
	textAlign: "center",
	border: "1px solid transparent",
	transition: "all .2s",
	"&:hover": {
		borderColor: theme.palette.primary.main,
		background: alpha(theme.palette.primary.main, 0.08),
	},
	cursor: styleCursor ? 'pointer' : 'default'
}));

export const PremiumUtilityIcon = styled(Box)({
	fontSize: 24,
	marginBottom: 8,
});

export const PremiumUtilityLabel = styled(PageTitle)(({ theme }) => ({
	fontSize: 12,
	color: theme.palette.text.secondary,
	fontWeight: 500,
}));

export const PremiumUtilityCount = styled(PageTitle)(({ theme }) => ({
	fontSize: 20,
	fontWeight: 800,
	color: theme.palette.primary.main,
	marginTop: 4,
}));

export const PremiumUtilityStatsGrid = styled(Box)(({ theme }) => ({
	display: "grid",
	gridTemplateColumns: "1fr 1fr 1fr",
	gap: 8,
	[theme.breakpoints.down("sm")]: {
		gridTemplateColumns: "1fr",
	},
}));

export const PremiumUtilityStatCard = styled(Box)(({ theme, styleCursor }) => ({
	background: alpha(theme.palette.text.primary, 0.04),
	padding: "10px 12px",
	borderRadius: 8,
	cursor: styleCursor ? 'pointer' : 'default'
}));

export const PremiumUtilityStatLabel = styled(PageTitle)(({ theme }) => ({
	fontSize: 11,
	color: alpha(theme.palette.text.secondary, 0.7),
}));

export const PremiumUtilityStatValue = styled(PageTitle)(() => ({
	fontSize: 16,
	fontWeight: 700,
}));

export const PremiumUtilityHighlight = styled(Box)(({ theme }) => ({
	display: "inline",
	color: theme.palette.success.main,
}));

export const PremiumNewsItem = styled(Box)(({ theme, styleCursor }) => ({
	padding: "14px 20px",
	// borderBottom: `1px solid ${theme.palette.divider}`,
	display: "flex",
	alignItems: "center",
	gap: 14,
	transition: "background .15s",
	"&:last-child": {
		borderBottom: "none",
	},
	"&:hover": {
		background: alpha(theme.palette.text.primary, 0.03),
	},
	cursor: styleCursor ? 'pointer' : 'default'
}));

export const PremiumNewsIcon = styled(Box)(({ theme }) => ({
	width: 64,
	height: 64,
	borderRadius: 10,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	fontSize: 18,
	flexShrink: 0,
	background: alpha(theme.palette.text.primary, 0.04),
}));

export const PremiumNewsBody = styled(Box)({
	flex: 1,
});

export const PremiumNewsTitle = styled(PageTitle)(() => ({
	fontSize: 15,
	fontWeight: 600,
	marginBottom: 3,
	// color: theme.palette.text.primary,
}));

export const PremiumNewsStats = styled(PageTitle)(({ theme }) => ({
	fontSize: 11.5,
	color: alpha(theme.palette.text.secondary, 0.7),
}));

export const PremiumRowGap = styled(Stack)({
	gap: 16,
});

export const PremiumThreeColumns = styled(Box)(({ theme }) => ({
	display: "grid",
	gridTemplateColumns: "repeat(3, 1fr)",
	gap: 12,
	[theme.breakpoints.down("md")]: {
		gridTemplateColumns: "repeat(2, 1fr)",
	},
	[theme.breakpoints.down("sm")]: {
		gridTemplateColumns: "1fr",
	},
}));

export const PremiumChartSvgWrap = styled(Box)({
	width: "100%",
});

export const NoDataContainer = styled(Box)(() => ({
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	height: "100%",
	minHeight: 200,
	width: "100%",
	gap: 12,
	padding: 20,
	textAlign: "center",
}));

export const NoDataTypography = styled(PageTitle)(({ theme }) => ({
	fontSize: 14,
	color: alpha(theme.palette.text.secondary, 0.6),
	fontWeight: 500,
}));

export const PremiumNestedScrollArea = styled(Box)(() => ({
	flex: 1,
	overflowY: "auto",
	scrollbarWidth: "none",
	msOverflowStyle: "none",
	"&::-webkit-scrollbar": {
		width: 0,
		height: 0,
		display: "none",
	},
}));


export const HeaderCard = styled("div")(({ theme }) => ({
	display: "flex",
	alignItems: "center",
	flexWrap: "nowrap",
	gap: 8,
	paddingBottom: theme.spacing(1)
}));

export const HeatmapWrap = styled(Box, {
	shouldForwardProp: (prop) => prop !== "variantType",
})(({ variantType }) => ({
	padding: variantType === "premium" ? 0 : "14px 18px",
}));

export const HeatmapTitle = styled(PageTitle, {
	shouldForwardProp: (prop) => prop !== "variantType",
})(({ variantType }) => ({
	fontSize: variantType === "premium" ? 10 : 10,
	color:"#2364B0",
	// color: variantType === "premium" ? "#1A1D23" : theme.palette.text.secondary,
	// color: variantType === "premium" ? "#1A1D23" : "#546e8a",
	marginBottom: variantType === "premium" ? 10 : 8,
	fontWeight: variantType === "premium" ? 700 : 700,
	textTransform: variantType === "premium" ? "uppercase" : "none",
	letterSpacing: variantType === "premium" ? 0.5 : 0,
}));

export const HeatmapColumnLabels = styled(Box, {
	shouldForwardProp: (prop) => prop !== "columnCount" && prop !== "hasWeekLabels",
})(({ columnCount, hasWeekLabels }) => ({
	display: "grid",
	gridTemplateColumns: hasWeekLabels
		? `56px repeat(${columnCount}, 1fr)`
		: `repeat(${columnCount}, 1fr)`,
	gap: 3,
	marginBottom: 4,
}));

export const HeatmapColumnLabel = styled(Typography, {
	shouldForwardProp: (prop) => prop !== "variantType",
})(({ variantType }) => ({
	fontSize: variantType === "premium" ? 10 : 9.5,
	color: variantType === "premium" ? "#8D96A3" : "#8fa8bf",
	textAlign: "center",
	fontWeight: 500,
}));

export const HeatmapGrid = styled(Box, {
	shouldForwardProp: (prop) => prop !== "columnCount" && prop !== "hasWeekLabels",
})(({ columnCount, hasWeekLabels }) => ({
	display: "grid",
	gridTemplateColumns: hasWeekLabels
		? `56px repeat(${columnCount}, 1fr)`
		: `repeat(${columnCount}, 1fr)`,
	gap: 3,
	marginBottom: 8,
}));

export const HeatmapWeekLabel = styled(Box)(() => ({
	fontWeight: 700,
	color: "#64748B",
	padding: "4px 6px 4px 0",
	textAlign: "right",
	fontSize: 10,
	display: "flex",
	alignItems: "center",
}));

export const HeatmapCell = styled(Box, {
	shouldForwardProp: (prop) =>
		prop !== "cellColor" && prop !== "variantType" && prop !== "showValue",
})(({ cellColor, variantType, showValue }) => ({
	height: variantType === "premium" ? 40 : 40,
	borderRadius: 10,
	transition: "transform .15s",
	background: cellColor,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	fontSize: showValue ? 10 : 0,
	fontWeight: 600,
	color: showValue ? "#0F172A" : "transparent",
	cursor: "pointer",
	animation: "heatmapBoot .45s ease-out",
	"&:hover": {
		transform: "scale(1.08)",
	},
	"@keyframes heatmapBoot": {
		from: {
			opacity: 0,
			transform: "scale(.85)",
		},
		to: {
			opacity: 1,
			transform: "scale(1)",
		},
	},
}));

export const HeatmapLegend = styled(Box)({
	display: "flex",
	gap: 5,
	alignItems: "center",
	justifyContent: "end"
});

export const HeatmapLegendLabel = styled(Typography, {
	shouldForwardProp: (prop) => prop !== "variantType",
})(({ variantType }) => ({
	fontSize: variantType === "premium" ? 11 : 10,
	color: variantType === "premium" ? "#8D96A3" : "#8fa8bf",
}));

export const HeatmapLegendDot = styled(Box, {
	shouldForwardProp: (prop) => prop !== "dotColor",
})(({ dotColor }) => ({
	width: 12,
	height: 12,
	borderRadius: 2,
	background: dotColor,
}));