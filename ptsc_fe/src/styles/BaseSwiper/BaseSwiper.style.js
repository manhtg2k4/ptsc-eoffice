import { styled } from "@mui/material/styles";
import { Box, AppBar, Stack, Toolbar, Button, IconButton, MenuItem, Typography } from "@mui/material";
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
  [theme.breakpoints.down("md")]: {
    flexDirection: "column",
    alignItems: "stretch",
    height: "auto",
    gap: theme.spacing(1.5),
    paddingTop: theme.spacing(1.5),
    paddingBottom: theme.spacing(1.5),
  },
}));

export const TitleContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  flex: 1,
  gap: theme.spacing(1),
  minWidth: 0,
  flexWrap: "wrap",
}));

export const ButtonStack = styled(Stack)(({ theme }) => ({
  marginLeft: theme.spacing(2),
  flexWrap: "wrap",
  gap: theme.spacing(1),
  [theme.breakpoints.down("md")]: {
    marginLeft: 0,
    marginTop: theme.spacing(0.5),
  },
  "& .MuiButton-root": {
    textTransform: "none",
    borderRadius: 10,
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
  backgroundColor: "transparent",
  pointerEvents: "none",
  transition: "background-color 0.3s ease",
}));

export const BoxContained = styled(Box, {
  shouldForwardProp: (prop) => prop !== "sidebarWidth",
})(({ theme, sidebarWidth }) => ({
  position: "fixed",
  top: 60,
  bottom: 0,
  left: `${sidebarWidth}px`,
  width: `calc(100% - ${sidebarWidth}px)`,
  backgroundColor: theme.palette.mode === "dark" ? "#1E293B" : "#f4f7fa",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  boxShadow: "none",
  pointerEvents: "auto",
  [theme.breakpoints.down("sm")]: {
    width: "100vw",
    bottom: 0,
    left: 0,
    top: 50,
  },
}));

export const AppBarWrapper = styled(AppBar)(({ theme }) => ({
  width: "100%",
  position: "relative",
  color: theme.palette.text.primary,
  backgroundColor: theme.palette.mode === "dark" ? "#1E293B" : "#f4f7fa",
  boxShadow: "none",
  paddingTop: theme.spacing(2),
  // paddingBottom: theme.spacing(1),
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
  padding: nonePadding ? "unset" : `${theme.spacing(0)} ${theme.spacing(2)} ${theme.spacing(1.25)} ${theme.spacing(2)}`,
  // marginBottom: theme.spacing(2.5),
}));

export const CloseIcon = styled(Close)(({ theme }) => ({
  color: theme.palette.common.white,
}));

export const BackIcon = styled(ArrowBackRoundedIcon)(({ theme }) => ({
  // color: theme.palette.common.white,
  color: theme.palette.navbar?.text || theme.palette.text.primary,
}));

export const BackIconV2 = styled(BackIcon)(() => ({
  color: "#2364B0"
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

export const StyledBreadcrumbs = styled(Typography)(() => ({
  fontSize: "18px",
  fontWeight: 500,
  color: "rgba(35, 100, 176, 0.7)",
  textTransform: "uppercase",
  marginBottom: 0,
  "& .breadcrumb-current": {
    color: "#2364B0",
    fontWeight: 600,
  },
}));

export const BreadcrumbsFromNotification = styled(StyledBreadcrumbs)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  paddingLeft: theme.spacing(1.25),
}));

export const MainTitle = styled(Typography)(() => ({
  fontSize: "28px",
  fontWeight: 700,
  color: "#0062ac",
  lineHeight: 1.2,
}));

export const HeaderInnerContainer = styled(Box)(() => ({
  display: "flex",
  flexDirection: "column",
  flex: 1,
}));

export const StyledBoxContainerContent = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  width: "100%",
}));

export const SectionCard = styled(Box, {
  shouldForwardProp: (prop) => prop !== "withMarginTop",
})(({ theme, withMarginTop }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#1E293B" : "#FFFFFF",
  borderRadius: "8px",
  padding: theme.spacing(2),
  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  marginTop: withMarginTop ? theme.spacing(1) : 0,
  marginBottom: theme.spacing(1),
}));

export const MainSectionHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(1),
  paddingLeft: theme.spacing(1.5),
  borderLeft: `4px solid #0062ac`,
  "& .MuiTypography-root": {
    fontSize: "18px",
    fontWeight: 700,
    color: theme.palette.text.primary,
    textTransform: "uppercase",
  },
  "& .MuiSvgIcon-root, & svg": {
    color: "#0062ac", // Màu xanh cho icon trong header section
  },
}));

export const SectionHeaderWrapper = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
  marginBottom: theme.spacing(2.5),
  "& .MuiTypography-root": {
    fontSize: "18px",
    fontWeight: 700,
    color: theme.palette.text.primary,
    textTransform: "uppercase",
  },
}));

export const HeaderIconBox = styled(Box)(({ theme }) => ({
  width: "40px",
  height: "40px",
  borderRadius: "8px",
  backgroundColor: theme.palette.mode === "dark" ? "rgba(0, 98, 172, 0.2)" : "#EEF2F6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#0062ac",
}));

export const ClickableLink = styled("div")(({ theme }) => ({
  cursor: "pointer",
  color: theme.palette.primary.main,
  "&:hover": {
    textDecoration: "underline",
  },
}));

export const BreadcrumbLink = styled("span")(() => ({
  cursor: "pointer",
  color: "inherit", // Thừa hưởng màu xám nhạt từ StyledBreadcrumbs
  fontSize: "inherit",
  fontWeight: 500,
  "&:hover": {
    color: "#0e68b5", // Hover vào thì đậm lên
    textDecoration: "underline",
  },
}));

export const FlexGrowBox = styled(Box)({
  flexGrow: 1,
  minWidth: 0,
  maxWidth: "100%",
});
export const FormLabel = styled(Typography)(({ theme }) => ({
  fontSize: "13px !important",
  fontWeight: 600,
  color: "#000000 !important",
  marginBottom: theme.spacing(0.5),
  display: "flex",
  alignItems: "center",
  textTransform: "uppercase",
}));

export const FooterWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== "footerVariant",
})(({ theme, footerVariant }) => {
  const isTemplateSampleVariant = footerVariant === "templateSample";
  return {
    padding: isTemplateSampleVariant ? "16px 24px 17px" : theme.spacing(1.5, 3),
    minHeight: isTemplateSampleVariant ? "73px" : "unset",
    backgroundColor: isTemplateSampleVariant
      ? "rgba(255, 255, 255, 0.8)"
      : (theme.palette.mode === "dark" ? "#1E293B" : "#FFFFFF"),
    borderTop: isTemplateSampleVariant
      ? "1px solid #DCE0E5"
      : `1px solid ${theme.palette.divider}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 -2px 10px rgba(0,0,0,0.05)",
    zIndex: 10,
    [theme.breakpoints.down("sm")]: {
      padding: isTemplateSampleVariant ? "12px 16px" : theme.spacing(1.5, 2),
      minHeight: isTemplateSampleVariant ? "auto" : "unset",
      flexDirection: "column",
      gap: theme.spacing(1.5),
    },
  };
});

export const FooterActions = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(2),
  alignItems: "center",
}));

export const AutoSaveText = styled(Typography)(({ theme }) => ({
  fontSize: "13px",
  color: theme.palette.text.secondary,
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const BreadcrumbSeparator = styled(Box)(() => ({
  display: "inline-flex",
  alignItems: "center",
  margin: "0 10px",
}));

export const BreadcrumbCurrent = styled("span")(() => ({
  color: "#2364B0",
  fontWeight: 600,
  fontSize: "inherit",
}));

export const NotificationBackLink = styled("span")(() => ({
  cursor: "pointer",
  color: "#2364B0",
  fontSize: "18px",
  fontWeight: 500,
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  textTransform: "uppercase",
  "&:hover": {
    color: "#0e68b5",
    textDecoration: "underline",
  },
}));

