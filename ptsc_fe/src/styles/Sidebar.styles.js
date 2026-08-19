import { styled } from "@mui/material/styles";
import {
  Badge,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
} from "@mui/material";
import { Link } from "react-router-dom";

const moduleRailWidth = 68;
const menuPanelWidth = 240;
const hoverSubMenuWidth = 240;
const drawerWidth = moduleRailWidth + menuPanelWidth; // 68 + 240 = 308px
const totalHoverWidth = moduleRailWidth + menuPanelWidth + hoverSubMenuWidth; // 68 + 240 + 240 = 548px
const collapsedWidth = moduleRailWidth;

export const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== "$isOpen" && prop !== "$isHoverOpen" && prop !== "$isHoverSubMenuOpen",
})(({ $isOpen, $isHoverOpen, $isHoverSubMenuOpen, theme }) => {
  const paperWidth = $isHoverSubMenuOpen
    ? totalHoverWidth
    : ($isOpen || $isHoverOpen ? drawerWidth : collapsedWidth);

  return {
    width: collapsedWidth, // Luôn cố định 68px để tránh giật trang khi hover, đồng thời khớp với độ rộng của icons rail
    flexShrink: 0,
    // zIndex: 1300,
    transition: "width 0.3s ease",
    "& .MuiDrawer-paper": {
      width: paperWidth, // Sidebar rộng 308px hoặc 548px tùy thuộc sub-menu có mở hay không
      marginTop: "60px",
      height: "calc(100% - 60px)",
      // zIndex: 1300,
      transition: "width 0.3s ease",
      backgroundColor: theme.palette.sidebar?.backgroundImage
        ? "transparent"
        : theme.palette.sidebar?.background || "#ffffffff",
      color: theme.palette.sidebar?.text || "#020C1A",
      overflowX: "hidden",
      overflowY: "auto",
      backgroundImage: theme.palette.sidebar?.backgroundImage,
      backgroundSize: "cover",
      backgroundPosition: "center",
      [theme.breakpoints.down(426)]: {
        width: "100%",
      },
    },
    [theme.breakpoints.down(426)]: {
      width: "100%",
      display: $isOpen ? "block" : "none",
    },
  };
});

export const StyledToolbar = styled(Toolbar, {
  shouldForwardProp: (prop) => prop !== "$isOpen",
})(({ $isOpen }) => ({
  display: "flex",
  justifyContent: $isOpen ? "space-between" : "center",
}));

export const StyledListItemButton = styled(ListItemButton, {
  shouldForwardProp: (prop) =>
    prop !== "$level" && prop !== "$isActive" && prop !== "itemPath",
})(({ theme, $level, $isActive, itemPath }) => {
  const customStyle =
    itemPath && theme.palette.menuItemOverrides?.[itemPath]
      ? theme.palette.menuItemOverrides[itemPath]
      : {};

  const isTopLevel = $level === 0;

  return {
    paddingLeft: theme.spacing(2 + $level * 2),
    minHeight: isTopLevel ? 56 : 44,
    margin: isTopLevel ? "4px 2px" : "2px 8px",
    borderRadius: isTopLevel ? 18 : 8,
    display: "flex",
    alignItems: "center",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    color: $isActive
      ? theme.palette.primary.main
      : theme.palette.sidebar?.text || theme.palette.text.primary,
    backgroundColor:
      $isActive && isTopLevel
        ? theme.palette.mode === "dark"
          ? "rgba(255, 255, 255, 0.08)"
          : "#f4f7fc"
        : "transparent",
    ...customStyle,
    "&:hover": {
      backgroundColor: theme.palette.mode === "dark"
        ? "rgba(255, 255, 255, 0.08)"
        : "#f4f7fc",
      color: theme.palette.primary.main,
      transform: "translateY(-1px)",
      boxShadow: theme.palette.mode === "dark"
        ? "0 4px 12px rgba(0,0,0,0.3)"
        : "0 4px 12px rgba(32, 105, 184, 0.08)",
      "& .MuiListItemText-primary": {
        color: theme.palette.primary.main,
      },
      "& .MuiListItemIcon-root": {
        color: theme.palette.primary.main,
      },
    },
    "&.Mui-selected": {
      backgroundColor:
        $isActive && isTopLevel
          ? theme.palette.mode === "dark"
            ? "rgba(255, 255, 255, 0.08)"
            : "#f4f7fc"
          : "transparent",
      "&:hover": {
        backgroundColor: theme.palette.mode === "dark"
          ? "rgba(255, 255, 255, 0.08)"
          : "#f4f7fc",
      },
    },
    "& .MuiListItemText-primary": {
      fontWeight: $isActive ? 700 : 500,
      fontSize: 13,
      textTransform: $level === 0 ? "uppercase" : "none",
      color: $isActive ? theme.palette.primary.main : "#94A3B8",
      lineHeight: 1,
      transition: "color 0.2s ease",
    },
    "& .MuiListItemIcon-root": {
      color: $isActive ? theme.palette.primary.main : "#94A3B8",
      display: "flex",
      alignItems: "center",
      minWidth: "32px",
      transition: "color 0.2s ease", 
      "& svg": {
        width: 20,
        height: 20,
      },
    },
  };
});

export const StyledListItemIcon = styled(ListItemIcon)(() => ({
  color: "inherit",
  minWidth: "40px",
  display: "flex",
  alignItems: "center",
}));

export const StyledListItemText = styled(ListItemText)(() => ({
  margin: 0,
  "& .MuiListItemText-primary": {
    // Styles moved to StyledListItemButton to support dynamic levels
  },
}));

export const DrawerContentBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$isOpen" && prop !== "$isHoverOpen" && prop !== "$isHoverSubMenuOpen",
})(({ $isOpen, $isHoverOpen, $isHoverSubMenuOpen, theme }) => ({
  display: "flex",
  flexDirection: "row",
  position: "relative",
  height: "100%",
  width: $isHoverSubMenuOpen
    ? totalHoverWidth
    : ($isOpen || $isHoverOpen ? drawerWidth : collapsedWidth),
  transition: "width 0.3s ease",
  [theme.breakpoints.down(426)]: {
    width: "100%",
  },
}));

export const StyledLogoLink = styled(Link, {
  shouldForwardProp: (prop) => prop !== "$isOpen",
})(({ theme, $isOpen }) => ({
  color: theme.palette.sidebar.text,
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: "1.2rem",
  display: $isOpen ? "block" : "none",
}));

export const SubMenuList = styled(List)({
  paddingLeft: 0,
});

export const ToggleSidebarButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? '#fff' : '#64748b',
  height: 40,
  width: 40,
  marginTop: "auto",
  marginBottom: theme.spacing(2),
  transition: "all 0.3s ease",
  "&:hover": {
    backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
  },
  "& svg": {
    fontSize: 26,
  }
}));

export const StyledSvg = styled(Box)(
  ({ styledWidth, styledHeight }) => ({
    color: "inherit",
    width: styledWidth,
    height: styledHeight,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": { width: "100%", height: "100%" },
  })
);

export const StyledSvgW = styled(Box)(
  ({ theme, styledWidth, styledHeight }) => ({
    color: theme.palette.common.white,
    width: styledWidth,
    height: styledHeight,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": { width: "100%", height: "100%" },
  })
);

export const StyledContainerSvg = styled(Box)(() => ({
  color: "inherit",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

export const CountBadge = styled(Badge)(({ theme }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
    right: -12,
    top: -10,
    fontSize: "0.7rem",
  },
}));

export const SidebarBox = styled(Box)(() => ({
  position: "absolute",
  top: "8px",
  right: "45px",
}));

export const BoxST = styled(Box)(() => ({
  flexGrow: 1,
  overflowY: "auto",
  overflowX: "hidden",
}));

export const BoxStyleds = styled(Box)(() => ({
  padding: 8,
  display: "flex",
  justifyContent: "flex-end",
  position: "sticky",
  bottom: 0,
  flexShrink: 0,
}));

export const ModuleRailWrapper = styled(Box)(() => ({
  display: "flex",
  height: "100%",
  position: "relative",
  zIndex: 1201,
}));

export const ModuleRail = styled(Box)(({ theme }) => ({
  width: moduleRailWidth,
  minWidth: moduleRailWidth,
  height: "100%",
  borderRight: `1px solid ${theme.palette.divider}`,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: theme.spacing(1, 0),
  position: "relative",
  backgroundColor: "inherit",
}));

export const ModuleRailList = styled(List)(({ theme }) => ({
  width: "100%",
  padding: theme.spacing(1, 0),
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 0,
}));

export const ModuleRailContent = styled(Box)(() => ({
  flexGrow: 1,
  overflowY: "auto",
  overflowX: "hidden",
  width: "100%",
  "&::-webkit-scrollbar": {
    width: "4px",
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    borderRadius: "10px",
  },
  "&:hover::-webkit-scrollbar-thumb": {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
}));

export const ModuleRailItem = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== "$isActive",
})(({ theme, $isActive }) => ({
  width: "100%",
  height: 52,
  minWidth: "100%",
  padding: 0,
  borderRadius: 0,
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: $isActive ? "#2069b8" : "#5A6573",
  backgroundColor: $isActive ? "#f4f7fc" : "transparent",
  boxShadow: "none",
  "&:hover": {
    backgroundColor: $isActive
      ? "#f4f7fc"
      : theme.palette.mode === "dark"
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(31, 51, 77, 0.08)",
    "& .module-rail-label": {
      display: "none", // Xóa bỏ label cũ
    },
  },
  "&.MuiButtonBase-root": {
    backgroundImage: "none",
  },
  "&::after": $isActive
    ? {
        content: '""',
        position: "absolute",
        top: 0,
        bottom: 0,
        right: 0,
        width: 3,
        borderRadius: 0,
        backgroundColor: theme.palette.primary.main,
      }
    : {},
  "& .MuiSvgIcon-root": {
    fontSize: 20,
  },
  "& svg": {
    width: 20,
    height: 20,
  },
}));

export const ModuleRailIconBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$isActive",
})(({ $isActive }) => ({
  width: 20,
  height: 20,
  minWidth: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 0,
  backgroundColor: "transparent",
  borderRadius: 0,
  boxShadow: "none",
  color: $isActive ? "#2069b8" : "#5A6573",
  "& .MuiSvgIcon-root": {
    fontSize: 20,
  },
  "& svg": {
    width: 20,
    height: 20,
    display: "block",
  },
}));

export const ModuleNamesPanel = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$isOpen",
})(({ theme, $isOpen }) => ({
  width: $isOpen ? menuPanelWidth : 0,
  minWidth: $isOpen ? menuPanelWidth : 0,
  height: "100%",
  backgroundColor: theme.palette.mode === "dark" ? "#2c2c2c" : "#ffffff",
  borderRight: $isOpen ? `1px solid ${theme.palette.divider}` : "none",
  transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  overflowY: "auto",
  overflowX: "hidden",
  "&::-webkit-scrollbar": {
    display: "none",
  },
  msOverflowStyle: "none",
  scrollbarWidth: "none",
  display: "flex",
  flexDirection: "column",
  zIndex: 1205,
  position: "absolute",
  left: moduleRailWidth,
  paddingTop: "16px",
  boxSizing: "border-box",
  boxShadow: "none",
}));

export const ModuleNamesList = styled(List)(() => ({
  padding: 0,
}));

export const ModuleNameItem = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$isActive",
})(({ theme, $isActive }) => ({
  height: 52,
  display: "flex",
  alignItems: "center",
  padding: "0 20px",
  whiteSpace: "nowrap",
  fontSize: 14,
  fontWeight: $isActive ? 700 : 500,
  color: $isActive ? theme.palette.primary.main : "#94A3B8",
  textTransform: "uppercase",
  cursor: "pointer",
  transition: "all 0.2s ease",
  "&:hover": {
    backgroundColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "#f4f7fc",
    color: theme.palette.primary.main,
  },
  
}));

export const MenuPanel = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$isOpen" && prop !== "$isHoverOpen",
})(({ $isOpen, $isHoverOpen }) => ({
  width: $isOpen || $isHoverOpen ? menuPanelWidth : 0,
  minWidth: $isOpen || $isHoverOpen ? menuPanelWidth : 0,
  height: "100%",
  position: "relative",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  transition: "width 0.3s ease, min-width 0.3s ease",
  boxSizing: "border-box",
}));

export const HoverSubMenuPanel = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$isOpen",
})(({ theme, $isOpen }) => ({
  width: $isOpen ? menuPanelWidth : 0,
  minWidth: $isOpen ? menuPanelWidth : 0,
  height: "100%",
  backgroundColor: theme.palette.mode === "dark" ? "#2c2c2c" : "#ffffff",
  borderRight: $isOpen ? `1px solid ${theme.palette.divider}` : "none",
  transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  overflowY: "auto",
  overflowX: "hidden",
  "&::-webkit-scrollbar": {
    display: "none",
  },
  msOverflowStyle: "none",
  scrollbarWidth: "none",
  display: "flex",
  flexDirection: "column",
  zIndex: 1204,
  position: "absolute",
  left: moduleRailWidth + menuPanelWidth,
  paddingTop: "16px",
  boxSizing: "border-box",
  boxShadow: $isOpen ? "10px 0 15px rgba(0,0,0,0.1)" : "none",
}));
