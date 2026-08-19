import { Box, Chip, DialogActions, Grid, IconButton, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import { SaveButton } from "./CustomDialog.styles";
import { StyledSearchField } from "./CustomTable.styles";

export const StyledContainerTitle = styled(Box)(({theme}) => ({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	paddingBottom: 1,
	  [theme.breakpoints.down("sm")]: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: theme.spacing(0.5),
  },
}));

export const StyledGeneralInformation = styled(Typography)(({theme}) => ({
	fontWeight: 700,
	textTransform: "uppercase",
	color: theme.palette.primary.main,
}));

export const StyledTitleStatus = styled(Typography)(({ theme }) => ({
	color: theme.palette.text.secondary,
}));

export const StyledSupTitle = styled(Box)(({ recordstate }) => {
	let color = "#1976d2"; // Default Blue (State 1)
	if (recordstate === 2) color = "#2E7D32"; // Green (State 2)
	else if (recordstate === 0) color = "#616161"; // Gray (State 0)

	return {
		fontWeight: 500,
		color: color,
	};
});

export const StyledSectionTitleFileIndex = styled(Grid)(({ theme }) => ({
	alignItems: "center",
	marginBottom: theme.spacing(1.25),
}));

export const StyledDescriptionRoundedIcon = styled(DescriptionRoundedIcon)(({ theme }) => ({
	color: theme.palette.primary.main,
	fontSize: theme.typography.pxToRem(24),
}));

export const StyledSearchFieldWrapper = styled(StyledSearchField)({
	flex: "none",
	width: "350px",
	'& .MuiOutlinedInput-root': {
		paddingRight: '14px',
	},
});

export const SearchButton = styled(IconButton)(({ theme }) => ({
	backgroundColor: theme.palette.primary.main,
	color: "#fff",
	borderRadius: "0 4px 4px 0",
	padding: "8px",
	marginLeft: "0",
	height: "40px",
	width: "40px",
	"&:hover": {
		backgroundColor: theme.palette.primary.dark,
	},
}));

export const FilterButton = styled(SaveButton)({
	minWidth: 120,
	height: 40,
	marginLeft: "8px",
});

export const TabChip = styled(Chip)(({ active }) => ({
	backgroundColor: active ? "#1976d2" : "#e0e0e0",
	color: active ? "#fff" : "#000",
	fontWeight: active ? 600 : 400,
	fontSize: "14px",
	height: "36px",
	borderRadius: "18px",
	cursor: "pointer",
	"&:hover": {
		backgroundColor: active ? "#1565c0" : "#d0d0d0",
	},
}));

export const TabsWrapper = styled(Box)({
	marginBottom: "16px",
});

export const TabsContainer = styled(Box)({
	display: "flex",
	gap: "8px",
});

export const LoadingContainer = styled(Box)({
	display: 'flex',
	justifyContent: 'center',
	alignItems: 'center',
	minHeight: '200px',
});

export const FilterBoxWrapper = styled(Box)({
	position: 'relative',
	zIndex: 100,
});

export const DialogActionsWrapper = styled(DialogActions)({
	justifyContent: "flex-end",
	padding: "16px 24px",
});