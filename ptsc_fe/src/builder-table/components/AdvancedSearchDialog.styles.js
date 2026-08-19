import { styled } from "@mui/material/styles";
import { Box, Button, Grid } from "@mui/material";

export const LoadingContainer = styled(Box)(() => ({
	display: "flex",
	justifyContent: "center",
	alignItems: "center",
	minHeight: 150,
}));

export const FieldsGridContainer = styled(Grid)(() => ({
	// paddingTop: theme.spacing(1),
}));

export const FieldGridItem = styled(Grid, {
	shouldForwardProp: (prop) => prop !== "isCheckboxField",
})(({ theme, isCheckboxField }) => ({
	minWidth: 0,
	...(isCheckboxField && {
		display: "flex",
		alignItems: "center",
		minHeight: 40,
	}),
	"& > *": {
		minWidth: 0,
		maxWidth: "100%",
	},
	"& > .MuiBox-root": {
		width: "100%",
	},
	"& > .MuiBox-root > .MuiFormControl-root": {
		flex: "1 1 0",
		minWidth: 0,
	},
	"& .MuiInputBase-root": {
		height: "40px !important",
		minHeight: "40px !important",
		minWidth: 0,
		flexWrap: "nowrap",
	},
	"& .MuiInputBase-input": {
		padding: "0 14px !important",
		height: "40px !important",
		boxSizing: "border-box !important",
	},
	"& .MuiOutlinedInput-root": {
		height: "40px !important",
	},
	"& .MuiAutocomplete-inputRoot": {
		height: "40px !important",
		paddingTop: "0 !important",
		paddingBottom: "0 !important",
	},
	"& .MuiAutocomplete-input": {
		padding: "0 !important",
	},
	"& .MuiSelect-select": {
		paddingTop: "0 !important",
		paddingBottom: "0 !important",
		height: "40px !important",
		lineHeight: "40px !important",
		display: "flex",
		alignItems: "center",
	},
	[theme.breakpoints.down("sm")]: {
		"& .MuiInputBase-input": {
			paddingLeft: "8px !important",
			paddingRight: "8px !important",
		},
	},
}));


export const CancelButton = styled(Button)(({ theme }) => ({
	textTransform: "none",
	color: theme.palette.text.primary,
	backgroundColor: theme.palette.mode === 'light' ? '#fff' : theme.palette.background.paper,
	border: `1px solid ${theme.palette.mode === 'light' ? '#e0e0e0' : theme.palette.divider}`,
	borderRadius: '5px !important',
	padding: '8px 24px',
	marginRight: 8,
	fontWeight: 400,
	fontSize: '14px',
	whiteSpace: 'nowrap',
	height: '41px',
	minWidth: '89px',
	"&:hover": {
		backgroundColor: theme.palette.action.hover,
		borderColor: theme.palette.mode === 'light' ? '#d0d0d0' : theme.palette.divider,
	},
	'&.MuiButton-root': {
		borderRadius: '5px !important',
	},
	[theme.breakpoints.down("sm")]: {
		width: "100%",
		minWidth: 0,
		marginRight: 0,
		padding: theme.spacing(1, 1.5),
	},
}));

export const ResetButton = styled(Button)(({ theme }) => ({
	textTransform: "none",
	color: theme.palette.text.primary,
	backgroundColor: theme.palette.mode === 'light' ? '#fff' : theme.palette.background.paper,
	border: `1px solid ${theme.palette.mode === 'light' ? '#e0e0e0' : theme.palette.divider}`,
	borderRadius: '5px !important',
	padding: '8px 24px',
	fontWeight: 400,
	fontSize: '14px',
	whiteSpace: 'nowrap',
	height: '41px',
	minWidth: '89px',
	"&:hover": {
		backgroundColor: theme.palette.action.hover,
		borderColor: theme.palette.mode === 'light' ? '#d0d0d0' : theme.palette.divider,
	},
	'&.MuiButton-root': {
		borderRadius: '5px !important',
	},
	[theme.breakpoints.down("sm")]: {
		width: "100%",
		minWidth: 0,
		padding: theme.spacing(1, 1.5),
	},
}));

export const ApplyButton = styled(Button)(({ theme }) => ({
	textTransform: "none",
	backgroundColor: theme.palette.primary.main,
	color: '#fff',
	borderRadius: '5px !important',
	padding: '8px 24px',
	fontWeight: 400,
	fontSize: '14px',
	whiteSpace: 'nowrap',
	height: '41px',
	minWidth: '120px',
	boxShadow: 'none',
	"&:hover": {
		backgroundColor: theme.palette.primary.dark,
		boxShadow: 'none',
	},
	'&.MuiButton-root': {
		borderRadius: '5px !important',
	},
	[theme.breakpoints.down("sm")]: {
		width: "100%",
		minWidth: 0,
		padding: theme.spacing(1, 1.5),
	},
}));
