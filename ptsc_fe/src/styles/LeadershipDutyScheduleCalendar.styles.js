import { styled } from "@mui/material/styles";
import { SkyBox, SkyTypography } from "./SkyStyles";
import { StyledPaper } from "./ThemeConfig.styles";


export const Container = styled(SkyBox)(({ theme }) => ({
	backgroundColor: theme.palette.background.default, // Replaced #f5f7fa (assuming default matches) or use theme.palette.background.paper
	minHeight: "100vh",
}));

export const SectionWrapper = styled(StyledPaper)(({ theme }) => ({
	padding: theme.spacing(3),
	marginBottom: theme.spacing(2),
	boxShadow: theme.shadows[1], // User theme.shadows
	border: `1px solid ${theme.palette.divider}`, // Replaced #e0e0e0
	borderRadius: theme.shape.borderRadius,
	width: "unset",
	// backgroundColor: "unset"
}));

export const SectionHeader = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: theme.spacing(1),
}));

export const SectionTitle = styled(SkyTypography)(({ theme }) => ({
	color: theme.palette.primary.main, // Replaced #005baa
	fontWeight: 700,
	fontSize: "16px",
	textTransform: "none",
	margin: 0,
}));

export const EmptyStateBox = styled(SkyBox)(({ theme }) => ({
	padding: theme.spacing(5),
	textAlign: "center",
	color: theme.palette.text.secondary, // Replaced #666
	fontStyle: "italic",
	fontSize: "14px",
	backgroundColor: theme.palette.background.paper,
	borderRadius: theme.shape.borderRadius,
	border: `1px solid ${theme.palette.divider}`,
}));

export const DayCardItem = styled(SkyBox)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  transition: "border-color 0.2s",
  "&:hover": { borderColor: theme.palette.primary.main }, // Replaced #005baa
}));

export const DayHeader = styled(SkyTypography)(({ theme }) => ({
	fontWeight: 700,
	fontSize: "14px",
	color: theme.palette.text.primary,
	marginBottom: theme.spacing(1.5),
}));

export const PreviewTableContainer = styled(SkyBox)(({ theme }) => ({
	flex: 1,
	overflow: "auto",
	padding: "0",
	position: "relative",
	border: `1px solid ${theme.palette.divider}`,
	borderRadius: theme.shape.borderRadius,
}));

export const PreviewTable = styled("table")(() => ({
	width: "100%",
	borderCollapse: "collapse",
	fontSize: "14px",
}));

export const PreviewTableHead = styled("thead")(({ theme }) => ({
	backgroundColor: theme.palette.primary.main, // Replaced #005baa
	color: theme.palette.primary.contrastText, // Replaced #fff
	position: "sticky",
	top: 0,
	zIndex: 10,
}));

export const PreviewTableRow = styled("tr", {
	shouldForwardProp: (prop) => prop !== "isToday",
})(({ theme, isToday }) => ({
	backgroundColor: isToday
		? theme.palette.action.selected
		: theme.palette.background.paper, // Replaced #e3f2fd, #fff
	borderBottom: `1px solid ${theme.palette.divider}`,
	"&:hover": {
		backgroundColor: isToday
			? theme.palette.action.hover
			: theme.palette.action.hover, // Replaced #bbdefb
	},
}));

export const PreviewTableHeaderCell = styled("th")(({ theme }) => ({
	backgroundColor: theme.palette.primary.main, // Replaced #005baa
	color: theme.palette.primary.contrastText, // Replaced #fff
	padding: theme.spacing(1.5),
	textAlign: "left",
	fontWeight: "bold",
	borderRight: `1px solid ${theme.palette.divider}`, // Adjusted transparency logic with theme divider if needed, or keeping explicit rgba if strict design. Let's use divider for consistency or a lighter shade of primary.
	// Ideally header borders are subtle. Let's keep rgba(255,255,255,0.2) as it's specific to the white text on dark bg design pattern often used.
	textTransform: "uppercase",
	fontSize: "13px",
	"&:last-child": { borderRight: "none" },
}));

export const PreviewTh150 = styled(PreviewTableHeaderCell)({ width: "150px" });
export const PreviewTh30Pct = styled(PreviewTableHeaderCell)({ width: "30%" });
export const PreviewThAuto = styled(PreviewTableHeaderCell)({ width: "auto" });

export const PreviewTableCell = styled("td", {
	shouldForwardProp: (prop) => prop !== "active" && prop !== "bold",
})(({ theme, active, bold }) => ({
	padding: theme.spacing(2),
	borderRight: `1px solid ${theme.palette.divider}`,
	color: active ? theme.palette.primary.main : theme.palette.text.primary, // Replaced #005baa
	verticalAlign: "middle",
	fontWeight: bold ? "bold" : "normal",
	"&:last-child": { borderRight: "none" },
}));

export const PreviewLeaderInfo = styled(SkyBox)({
	display: "flex",
	flexDirection: "column",
	gap: "4px",
});

export const PreviewLeaderPosition = styled("div")(({ theme }) => ({
	fontSize: "12px",
	color: theme.palette.text.secondary,
}));

export const PreviewLeaderName = styled("div")({
	fontWeight: 600,
	fontSize: "14px",
});

export const ActionButtonGroup = styled(SkyBox)(({ theme }) => ({
	display: "flex",
	gap: theme.spacing(1),
}));

export const PreviewNoteCell = styled(PreviewTableCell)(({ theme }) => ({
	fontStyle: "italic",
	color: theme.palette.text.primary,
}));

export const EmptyLeaderText = styled("span")(({ theme }) => ({
  color: theme.palette.text.disabled,
}));