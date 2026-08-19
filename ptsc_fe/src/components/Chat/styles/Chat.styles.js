import { styled } from "@mui/material/styles";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Badge,
  Avatar,
  IconButton,
  Popover,
  Divider,
  Tabs,
  Tab,
  MenuItem,
} from "@mui/material";

/* Layout */
export const ChatPageContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  height: "calc(100vh - 100px)",
  padding: theme.spacing(2),
  gap: theme.spacing(2),
}));

export const ConversationsSidebar = styled(Paper)(() => ({
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
}));


export const ChatMainArea = styled(Paper)(() => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
}));

/* Sidebar */
export const SidebarHeader = styled(Box)(({ theme }) => ({
  paddingLeft: 15,
  paddingRight: 15,
  paddingTop: 10,
  paddingBottom: 10,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

export const CloseButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.text.primary,
}));

export const SidebarDivider = styled(Divider)(({ theme }) => ({
  margin: theme.spacing(1, 0),
}));


export const SidebarTitle = styled(Typography)(() => ({
  fontWeight: 600,
//   marginBottom: 16,
}));

export const SearchInput = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 10,
    backgroundColor:
      theme.palette.mode === "dark"
        ? "rgba(255, 255, 255, 0)"
        : theme.palette.grey[100],
    width: "92%",
  },
  alignItems:"center",
  marginTop: theme.spacing(1),
}));

export const ConversationList = styled(Box)(() => ({
  height: 70,
  overflowY: "auto",
  marginBottom: 0,
}));

export const ConversationLists = styled(Box)(() => ({
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
}));

// export const ConversationItem = styled(Box, {
//   shouldForwardProp: (prop) => prop !== "$isActive",
// })(({ theme, $isActive }) => ({
//   display: "flex",
//   width: "100%",          // ✅ DÒNG QUYẾT ĐỊNH
//   gap: theme.spacing(1.5),
//   padding: theme.spacing(1),
//   cursor: "pointer",
//   backgroundColor: $isActive ? theme.palette.action.selected : "transparent",
//   borderLeft: $isActive
//     ? `4px solid ${theme.palette.primary.main}`
//     : "4px solid transparent",
  
//   "& .delete-btn": {
//     opacity: 0,
//     transition: "opacity 0.15s",
//   },

//   "&:hover .delete-btn": {
//     opacity: 1,
//   },

// }));

export const TimeText = styled(Typography)(() => ({
  fontSize: 12,
  opacity: 0.7,
  whiteSpace: "nowrap",
}));

export const RightMeta = styled("div")({
  position: "relative",
  minWidth: 60,
  height: 24,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",

  // 👇 gắn attribute
  '[data-role="meta"]': {},
});

export const MetaTime = styled(TimeText)({
  position: "absolute",
  right: 0,
  top: "50%",
  transform: "translateY(-50%)",
  opacity: 1,
  transition: "opacity 0.15s ease",
  whiteSpace: "nowrap",

  '[data-role="time"]': {},
});

// export const MetaMoreButton = styled(IconButton)({
//   position: "absolute",
//   right: -8,
//   top: "50%",
//   transform: "translateY(-50%)",
//   opacity: 0,
//   pointerEvents: "none",
//   transition: "opacity 0.15s ease",
//   zIndex: 2,
//   padding: 4,
//   color:"black",
//   '[data-role="more"]': {},
// });
export const MetaMoreButton = styled(IconButton)(({ theme }) => ({
  position: "absolute",
  right: -8,
  top: "50%",
  transform: "translateY(-50%)",
  opacity: 0,
  pointerEvents: "none",
  transition: "opacity 0.15s ease",
  zIndex: 2,
  padding: 4,
  color: theme.palette.text.secondary,
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));


export const ConversationItem = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$isActive",
})(({ theme, $isActive }) => ({
  display: "flex",
  width: "100%",
  gap: theme.spacing(1.5),
  padding: theme.spacing(1),
  cursor: "pointer",
  alignItems: "center",
  backgroundColor: $isActive ? theme.palette.action.selected : "transparent",
  borderLeft: $isActive
    ? `4px solid ${theme.palette.primary.main}`
    : "4px solid transparent",

  "&:hover": {
    backgroundColor: theme.palette.action.hover,

    '& [data-role="time"]': {
      opacity: 0,
      pointerEvents: "none",
    },

    '& [data-role="more"]': {
      opacity: 1,
      pointerEvents: "auto",
    },
  },
}));


// export const OnlineBadge = styled(Badge, {
//   shouldForwardProp: (prop) => prop !== "$online",
// })(({ $online }) => ({
//   "& .MuiBadge-badge": {
//     backgroundColor: $online ? "#44b700" : "#bdbdbd",
//     width: 10,
//     height: 10,
//     borderRadius: "50%",
//     border: "2px solid white",
//   },
// }));
export const OnlineBadge = styled(Badge, {
  shouldForwardProp: (prop) => prop !== "$online",
})(({ theme, $online }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: $online ? "#44b700" : theme.palette.grey[500],
    width: 10,
    height: 10,
    borderRadius: "50%",
    border: `2px solid ${theme.palette.background.paper}`,
  },
}));

export const Avatar40 = styled(Avatar)(() => ({
  width: 40,
  height: 40,
  fontSize: 14,
}));

/* Messages */
export const MessagesContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: "auto",
  padding: theme.spacing(2),
}));

export const MessageRow = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$own",
})(({ $own }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: $own ? "flex-end" : "flex-start",
}));

export const MessageBubble = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$own",
})(({ theme, $own }) => ({
  maxWidth: "60%",
  padding: "10px 14px",
  borderRadius: 12,
  backgroundColor: $own
    ? theme.palette.primary.main
    : theme.palette.background.paper,
  color: $own ? "#fff" : "inherit",
}));

export const MessageTime = styled(Typography)(() => ({
  fontSize: 11,
  marginTop: 4,
}));

/* Input */
export const InputArea = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1),
  padding: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
}));

export const MessageInput = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 20,
    backgroundColor:
      theme.palette.mode === "dark"
        ? "rgba(255,255,255,0.05)"
        : theme.palette.grey[100],
  },
}));

export const SendButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: "#fff",
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export const EmptyState = styled(Box)(() => ({
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

/* Conversation content */
export const ConversationContent = styled(Box)(() => ({
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
}));

export const ConversationHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: theme.spacing(0.5),
}));

export const UserName = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "$unread",
})(({ $unread }) => ({
  fontWeight: $unread ? 600 : 400,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}));

export const LastMessageRow = styled(Box)(() => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
}));

export const LastMessage = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "$unread",
})(({ $unread }) => ({
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontWeight: $unread ? 600 : 400,
}));

export const UnreadBadge = styled(Box)(({ theme }) => ({
  minWidth: 20,
  height: 20,
  borderRadius: 10,
  backgroundColor: theme.palette.primary.main,
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  fontWeight: 600,
  padding: "0 6px",
}));

/* Chat header */
export const ChatHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

export const ChatHeaderLeft = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
}));

export const ChatUserInfo = styled(Box)(() => ({
  display: "flex",
  flexDirection: "column",
}));

export const ChatUserName = styled(Typography)(() => ({
  fontWeight: 600,
}));

export const ChatStatus = styled(Typography)(() => ({
  fontSize: 12,
  opacity: 0.7,
}));
/* Maximized layout */
export const FullscreenDialogContent = styled(Box)(() => ({
  padding: 0,
  display: "flex",
  height: "100vh",
}));

export const LeftSidebarWrapper = styled(Box)(({ theme }) => ({
  width: 330,
  borderRight: `1px solid ${theme.palette.divider}`,
  overflow: "hidden",
}));

export const ChatMainWrapper = styled(Box)(() => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
}));

export const RightPanelWrapper = styled(Box)(({ theme }) => ({
  width: 350,
  borderLeft: `1px solid ${theme.palette.divider}`,
  display: "flex",
  flexDirection: "column",

  [theme.breakpoints.down("md")]: {
    display: "none",
  },
}));
/* Floating sidebar / mobile chat */
export const FloatingPopover = styled(Popover)(() => ({
  pointerEvents: "none",
}));

export const FloatingPopoverPaper = styled(Paper)(({ theme }) => ({
  position: "fixed",
  pointerEvents: "auto",

  [theme.breakpoints.down("sm")]: {
    bottom: 26,
    right: 0,
    left: 14,
    width: "94%",
    height: "65vh",
    maxWidth: "100vw",
  },

  [theme.breakpoints.up("sm")]: {
    bottom: 16,
    right: 16,
    width: 350,
    height: 600,
    maxWidth: 350,
  },
}));

export const SidebarTabs = styled(Tabs)(({ theme }) => ({
  minHeight: 0,
  borderBottom: `1px solid ${theme.palette.divider}`,

  "& .MuiTabs-indicator": {
    height: 2,
  },
}));

export const SidebarTab = styled(Tab)(() => ({
  minHeight: 0,
  textTransform: "none",
  fontWeight: 500,
}));


/* Media grid */
export const MediaWrapper = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));

export const MediaDateGroup = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

export const MediaDateText = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  color: theme.palette.text.secondary,
}));

export const MediaGridContainer = styled(Box)(() => ({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 8,
}));

export const MediaItem = styled(Box)(({ theme }) => ({
  position: "relative",
  aspectRatio: "1 / 1",
  borderRadius: 8,
  overflow: "hidden",
  cursor: "pointer",
  backgroundColor: theme.palette.grey[900],
}));

export const MediaImage = styled("img")(() => ({
  width: "100%",
  height: "100%",
  objectFit: "cover",
}));

export const VideoOverlay = styled(Box)(() => ({
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(0,0,0,0.3)",
  color: "#fff",
  fontSize: 24,
}));

export const IconButtonGroupAddIcon = styled(IconButton)(() => ({
  color: "#0782e0",
}));

export const MenuItems= styled(MenuItem)(()=>({
  color:"red",
}))