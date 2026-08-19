import { styled } from "@mui/material/styles";
import { Box, AppBar, Stack, Toolbar, Button, IconButton, MenuItem } from "@mui/material";
import { Close } from "@mui/icons-material";
// import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';

export const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  minHeight: 60,
  paddingLeft: theme.spacing(0),
  paddingRight: theme.spacing(2),
}));

export const StyledToolbarSwipper = styled(Toolbar)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  minHeight: '55px !important',
  // paddingLeft: theme.spacing(0),
  paddingRight: theme.spacing(2),
}));

export const TitleContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  flex: 1,
  gap: theme.spacing(1),
  minWidth: 0,
}));

export const ButtonStack = styled(Stack)(({ theme }) => ({
  marginLeft: theme.spacing(2),
  "& .MuiButton-root": {
    textTransform: "none",
    borderRadius: 6,
  },

  "& .MuiButton-outlined": {
    // Ở chế độ tối, nút outlined sẽ trông giống contained
    ...(theme.palette.mode === "dark" && {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
      border: "none",
      "&:hover": {
        backgroundColor: theme.palette.primary.dark,
      },
    }),
    // Ở chế độ sáng, nút outlined sẽ có màu trắng để nổi bật trên nền xanh
    // ...(theme.palette.mode === "light" && {
    //   borderColor: theme.palette.primary.contrastText,
    //   color: theme.palette.primary.contrastText,
    // }),
  },
}));

export const StyleButtonSwipper = styled(Button);

export const Backdrop = styled(Box)(() => ({
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1100,
  backgroundColor: "rgba(0, 0, 0, 0.15)",
  transition: "background-color 0.3s ease",
}));

export const BoxContained = styled(Box, {
  shouldForwardProp: (prop) => prop !== "sidebarWidth",
})(({ theme, sidebarWidth }) => ({
  position: "fixed",
  top: 60,
  // top: 0,
  left: `${sidebarWidth}px`,
  width: `calc(100% - ${sidebarWidth}px)`,
  height: "calc(100vh - 60px)",
  // height: "94vh",
  // height: "100vh",
  // zIndex: 1300,
  backgroundColor: theme.palette.mode === "dark" ? "#1E293B" : "#F9FAFB",
  display: "flex",
  flexDirection: "column",
  boxShadow: theme.shadows[2],
  [theme.breakpoints.down("sm")]: {
    width: "100vw",
    height: "100vh",
    left: 0,
    top: 50,
  },
}));

export const AppBarWrapper = styled(AppBar)(({ theme }) => ({
  // width: "97.6%",
  // position: "relative",
	// color: theme.palette.navbar?.text || theme.palette.text.primary,
	// backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",
	// left: '16px',
	// top: '10px',
	// borderRadius: '4px',
  width: "100%",
  position: "relative",
  color: theme.palette.navbar?.text || theme.palette.text.primary,
  // backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",
  backgroundColor: theme.palette.mode === "dark" ? "#1E293B" : "#F9FAFB",

  // boxShadow: "none",
}));

export const Title = styled("div", {
  shouldForwardProp: (prop) => prop !== "showCloseIcon",
})(({ theme, showCloseIcon }) => ({
  marginLeft: showCloseIcon ? theme.spacing(2) : 0,
  flex: 1,
  fontSize: "16px",
  fontWeight: 500,
}));

export const ActionsBox = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1),
  alignItems: "center",
}));

export const Body = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'variant' && prop !== 'noneOverflow' && prop !== 'nonePadding',
})(({ theme, noneOverflow, nonePadding }) => ({
  flex: 1,
  overflow: noneOverflow ? "hidden" : "auto",
  padding: nonePadding ? "unset" : `${theme.spacing(1)} ${theme.spacing(2)} ${theme.spacing(1.25)} ${theme.spacing(2)}`,
  // marginBottom: theme.spacing(2.5),
}));

export const CloseIcon = styled(Close)(({ theme }) => ({
  color: theme.palette.common.white,
}));

export const BackIcon = styled(ArrowBackRoundedIcon)(({ theme }) => ({
  // color: theme.palette.common.white,
  color: theme.palette.navbar?.text || theme.palette.text.primary,
}));

export const MoreIconButton = styled(IconButton)(({ theme }) => ({
  // color: theme.palette.primary.contrastText,
  color: theme.palette.navbar?.text || theme.palette.text.primary,
}));

export const StyledMobileMenuItem = styled(MenuItem)(() => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  padding: '4px 16px',
  gap: '8px',
  minWidth: 150,
  '&:not(:last-child)': {
    marginBottom: 8,
  },
}));