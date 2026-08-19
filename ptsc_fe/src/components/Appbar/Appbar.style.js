import { styled } from "@mui/material/styles";
import {
  Box,
  AppBar,
  Typography,
  Button,
  CircularProgress,
	IconButton,
} from "@mui/material";

export const DialogContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== "sidebarWidth",
})(({ theme }) => ({
  position: "relative", // Thay đổi từ 'fixed' sang 'relative'
  top: 'auto', // Reset các thuộc tính không cần thiết
  left: 'auto', // Reset các thuộc tính không cần thiết
  width: "100%", // Chiếm 100% chiều rộng của container cha
  height: "100%", // Chiếm 100% chiều cao của container cha
  zIndex: 1300,
  backgroundColor: theme.palette.background.paper,
  display: "flex",
  flexDirection: "column",
  boxShadow: theme.shadows[4],
}));

// export const StyledAppBar = styled(AppBar)(({ appBarColor }) => ({
// 	position: "relative",
// 	color: appBarColor,
// }));

export const StyledAppBar = styled(AppBar)(({ appBarColor }) => {
	// console.log("appBarColor:", appBarColor); // <-- log ở đây
	return {
		position: "relative",
		color: appBarColor,
	};
});

export const TitleTypography = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "showCloseIcon",
})(({ theme, showCloseIcon }) => ({
  marginLeft: showCloseIcon ? theme.spacing(2) : 0,
  flex: 1,
}));

export const RequiredAsterisk = styled("span")(({ theme }) => ({
  color: theme.palette.error.main,
}));

export const ActionsContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1),
}));


export const RightActionsContainer = styled(ActionsContainer)({
  marginLeft: 'auto',
});

export const ActionButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== "isDelete",
})(({ theme, isDelete }) => ({
	color: isDelete ? theme.palette.error.main : "inherit",

}));

export const OpinionButton = styled(Button)(() => ({
	// Styles are now handled by the 'appBar' variant in the theme
	color: "inherit",
}));

export const SigningButton = styled(Button)(() => ({
	// Styles are now handled by the 'appBar' variant in the theme
	color: "inherit",
}));
export const StyleIconButton = styled(IconButton)(() => ({
	// Styles are now handled by the 'appBar' variant in the theme
	color: "inherit",
}));

export const LoadingSpinner = styled(CircularProgress)(() => ({
  color: "inherit",
}));

export const ContentBox = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: "auto",
  padding: theme.spacing(2),
}));
