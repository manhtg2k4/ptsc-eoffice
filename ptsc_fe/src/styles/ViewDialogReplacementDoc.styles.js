import { Chip } from "@mui/material";
import { styled } from "@mui/material/styles";
import { CenteredGridContainer, HeaderButtonContainer, MarginControlBox, PageTitle } from "./ThemeConfig.styles";

export const ChipInputContainer = styled("div", {
	shouldForwardProp: (prop) => prop !== "error",
})(({ theme, error }) => ({
	position: "relative",
	padding: "8px 14px",
	borderRadius: theme.shape.borderRadius,
	border: `1px solid ${error ? theme.palette.error.main : theme.palette.divider}`,
	minHeight: "25px",
	display: "flex",
	alignItems: "center",
	"&:hover": {
		borderColor: error ? theme.palette.error.main : theme.palette.text.primary,
	},
}));

export const ChipContainer = styled(MarginControlBox)(({ theme }) => ({
	display: "flex",
	flexWrap: "wrap",
	gap: theme.spacing(0.5),
	width: "unset"
}));

export const CustomChip = styled(Chip)(({ theme }) => ({
	height: "24px",
	backgroundColor: theme.palette.action.hover,
	color: theme.palette.text.primary,
	border: `1px solid ${theme.palette.divider}`,
	// Thêm media query cho màn hình mobile
	[theme.breakpoints.down("md")]: {
		maxWidth: "calc(50vw - 40px)", // Giới hạn chiều rộng tối đa của chip
		"& .MuiChip-label": {
			whiteSpace: "nowrap",
			overflow: "hidden",
			textOverflow: "ellipsis",
		},
	},
}));

export const PlaceholderTypography = styled(PageTitle)(({ theme }) => ({
	color: theme.palette.text.secondary,
}));

export const InputLabel = styled(PageTitle)(({ theme }) => ({
	position: "absolute",
	top: "-0.7em",
	left: "10px",
	backgroundColor: theme.palette.background.paper, // Hoặc màu nền của dialog
	padding: "0 4px",
	fontSize: "0.75rem",
	color: theme.palette.text.secondary, // Màu label mặc định
	zIndex: 1, // Đảm bảo label luôn ở trên border
}));

export const ActionContainer = styled(HeaderButtonContainer)(({ theme }) => ({
	alignItems: "flex-start",
	gap: theme.spacing(1),
	width: "100%",
	pointerEvents: "none",
	opacity: 0.6,
	flexWrap: "unset",
	justifyContent: "unset",
}));

export const StyleGrid = styled(CenteredGridContainer)(() => ({
	justifyContent: "center",
	gap: "5px",
	width: "unset",
	margin: "unset",
}));