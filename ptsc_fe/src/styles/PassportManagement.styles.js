import { styled } from "@mui/material/styles";
import { ConfigSectionSubheader, PageContainer } from "./ThemeConfig.styles";
import { Box, Button, Card, IconButton, Link, Typography } from "@mui/material";
import { Add, DeleteOutline } from "@mui/icons-material";
import {
  HistoryCard,
  SectionTitleNoMargin,
} from "@pages/RecommendationsPage/components/RecommendationsForm.styles";

export const StyledBoxOptionTypeAdd = styled(PageContainer)(
  ({ theme, isType }) => ({
    padding: theme.spacing(4),
    display: "block",
    textAlign: "center",
    cursor: "pointer",
    borderRadius: theme.shape.borderRadius,
    backgroundColor: isType === "personal" ? "#E3F2FD" : "#E8F5E9",
    color: isType === "personal" ? "#1976d2" : "#2e7d32",
    border: isType === "personal" ? "2px solid #1976d2" : "2px solid #2e7d32",
    transition: "all 0.2s ease",
    "&:hover": {
      transform: "translateY(-3px)",
      boxShadow: theme.shadows[3],
    },
  })
);

export const TextOption = styled(ConfigSectionSubheader)({
  fontWeight: "bold",
});

export const TotalPassportType = styled(ConfigSectionSubheader)(({ theme, styleMarginTop }) => ({
  fontWeight: "unset",
  marginTop: styleMarginTop ? theme.spacing(2) : "unset",
}));

export const TextCancelReasonPassportRequest = styled(ConfigSectionSubheader)(
  ({ theme }) => ({
    fontWeight: "bold",
    paddingBottom: theme.spacing(1),
  })
);

export const SubTextCancelReasonPassportRequest = styled(
  ConfigSectionSubheader
)(({ theme }) => ({
  paddingBottom: theme.spacing(3),
  color: theme.palette.text.secondary,
  fontWeight: "unset",
}));

export const MemberTableHeader = styled(PageContainer)(({ theme }) => ({
  padding: "unset",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: theme.spacing(1),
}));

export const MemberTableActions = styled(PageContainer)({
  padding: "unset",
  justifyContent: "unset",
  alignItems: "center",
  gap: 16,
});

export const StyledHeaderSectionContent = styled(SectionTitleNoMargin)(() => ({
  textTransform: "uppercase",
}));

export const AddMemberButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

export const DeleteMemberButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.error.main,
}));

export const SmallDeleteIcon = styled(DeleteOutline)({
  fontSize: 20,
});

export const SpanRequired = styled("span")(({ theme }) => ({
  color: theme.palette.error.main,
  marginLeft: theme.spacing(0.5),
}));

export const HistoryCardPassport = styled(HistoryCard)(({ theme }) => ({
	height: "unset",
  maxHeight: "530px",
  overflowY: "auto",
  marginTop: theme.spacing(2),
}));

export const TableWrapperPassport = styled(PageContainer)({
	padding: "unset",
	display: "unset",
	justifyContent: "unset",
	"& .MuiPaper-root": {
		overflow: "hidden",
	},
	"& .MuiTableContainer-root": {
		maxHeight: "583px", // Header (53px) + 10 rows (53px * 10)
		overflowY: "auto",
		overflowX: "auto",
	},
});

export const VoucherSummaryHeader = styled(PageContainer)(() => ({
  padding: "unset",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
}));

export const VoucherSummaryDeadline = styled(Typography)(() => ({
  color: "#757575",
  fontStyle: "italic",
}));

export const VoucherSummaryDeadlineValue = styled(Box)(({ theme, isColor }) => ({
  color: isColor ? "#d32f2f" : theme.palette.text.secondary,
  fontWeight: 700,
  fontStyle: "normal",
}));

export const VoucherSummaryCard = styled(Box)(() => ({
  border: "1px solid #d9d9d9",
  borderRadius: 8,
  padding: 16,
}));

export const VoucherSummaryTitle = styled(Typography)(() => ({
  fontWeight: 700,
  textAlign: "center",
  marginBottom: 12,
}));

export const VoucherLabelText = styled(Typography)(() => ({
  color: "#757575",
}));

export const VoucherValueText = styled(Typography)(() => ({
  fontWeight: 600,
}));

export const VoucherStatusText = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "statusColor",
})(({ statusColor }) => ({
  fontWeight: 700,
  color: statusColor || "#F59E0B",
}));

export const VoucherLinkText = styled(Link)(() => ({}));

export const ReturnHistoryContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
  paddingTop: theme.spacing(2),
  borderTop: "1px dashed #c4c4c4",
}));

export const ReturnHistoryHeader = styled(PageContainer)(() => ({
  padding: "unset",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
}));

export const ReturnHistoryTitle = styled(Typography)(() => ({
  fontWeight: 800,
  fontSize: 18,
  textTransform: "uppercase",
}));

export const ReturnHistorySummary = styled(Typography)(() => ({
  color: "#d32f2f",
  fontWeight: 700,
  fontSize: 16,
}));

export const ReturnHistoryItem = styled(PageContainer)(({ theme }) => ({
  padding: "unset",
  justifyContent: "space-between",
  alignItems: "center",
  gap: theme.spacing(2),
  marginBottom: theme.spacing(1.5),
}));

export const ReturnHistoryItemText = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  fontSize: 16,
  borderLeft: "4px solid #1976d2",
  paddingLeft: theme.spacing(1.5),
}));

export const ReturnHistoryLink = styled(Link)(() => ({
  color: "#1e88e5",
  fontStyle: "italic",
  fontSize: 16,
  cursor: "pointer",
  textDecoration: "none",
  "&:hover": {
    textDecoration: "underline",
  },
}));

export const StyledDescription = styled(TextOption)(({ theme }) => ({
	color: theme.palette.text.secondary,
	fontSize: 13
}));	

export const StyledRequiredIcon = styled("span")(({ theme }) => ({
	color: theme.palette.error.main,
}));

export const StyledRequiredText = styled(StyledRequiredIcon)(({ theme }) => ({
	fontSize: "0.75rem",
	display: "inline-block",
	marginTop: theme.spacing(0.5),
}));

export const ScopeConfigWarningText = styled(StyledDescription)(({ theme }) => ({
	// fontSize: "0.75rem",
	fontWeight: "unset",
	marginTop: theme.spacing(0.5),
	color: "#F59E0B",
}));

export const TableCardContainer = styled(Card)(({ theme }) => ({
	padding: theme.spacing(2),
	borderRadius: "12px",
	borderColor: "#e2e8f0",
	backgroundColor: "#ffffff",
	boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.05)",
}));

export const TableCardTitle = styled(Typography)(() => ({
	fontWeight: 700,
	marginBottom: "16px",
	fontSize: "16px",
	color: "#16191D",
}));

export const StyledRemovePassportButton = styled(Button)(() => ({
	color: "#d32f2f",
	backgroundColor: "#fff0f0",
	borderColor: "#ffcdd2",
	borderRadius: "16px",
	textTransform: "none",
	fontSize: "12px",
	fontWeight: 600,
	padding: "3px 12px",
	minWidth: "unset",
	"&:hover": {
		backgroundColor: "#ffebee",
		borderColor: "#e57373",
	},
}));

export const StyledAddIcon = styled(Add)(() => ({
	fontSize: 16,
}));

export const StyledDeleteIcon = styled(DeleteOutline)(() => ({
	fontSize: 16,
}));