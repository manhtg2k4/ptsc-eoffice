import { styled } from "@mui/material/styles";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Badge,
  Chip,
} from "@mui/material";
import AttachFile from "@mui/icons-material/AttachFile";
import InsertEmoticon from "@mui/icons-material/InsertEmoticon";
import AutoAwesomeMosaicIcon from '@mui/icons-material/AutoAwesomeMosaic';

/* ================= ROOT ================= */
export const ChatRoot = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$maximized",
})(({ theme, $maximized }) => ({
  display: "flex",
  flexDirection: "column",
  height: $maximized ? "100vh" : "100%",
  background: theme.palette.background.paper,
  overflow: "hidden",
}));

/* ================= HEADER ================= */
export const ChatHeader = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$maximized",
})(({ theme }) => ({
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: theme.spacing(1.5),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

export const ChatHeaderLeft = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 12,
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
});

export const ChatUserInfo = styled(Box)({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  flex: 1,
  overflow: "hidden",
});

export const ChatUserName = styled(Typography)({
  fontWeight: 600,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const ChatStatus = styled(Typography)({
  fontSize: 12,
  opacity: 0.7,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const HeaderActions = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 4,
  flexShrink: 0,
});

export const HeaderIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.text.primary,
  padding: 4,
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

/* ================= AVATAR & BADGE ================= */
export const Avatar40 = styled(Avatar)({
  width: 40,
  height: 40,
  fontSize: 14,
  flexShrink: 0,
});

export const Avatar41 = styled(Avatar)({
  width: 25,
  height: 25,
  fontSize: 14,
  flexShrink: 0,
});

export const OnlineBadge = styled(Badge, {
  shouldForwardProp: (prop) => prop !== "$online",
})(({ theme, $online }) => ({
  flexShrink: 0,
  "& .MuiBadge-badge": {
    backgroundColor: $online ? "#44b700" : theme.palette.grey[400],
    width: 10,
    height: 10,
    borderRadius: "50%",
    border: `2px solid ${theme.palette.background.paper}`,
  },
}));

/* ================= MESSAGES ================= */
export const MessagesContainer = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  padding: "7px 16px",

});

export const MessageRow = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$own",
})(({ $own }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: $own ? "flex-end" : "flex-start",
  marginBottom: 8,
}));

export const MessageOtherWrapper = styled(Box)({
  display: "flex",
  width: "100%",
  gap: 8,
});

export const OtherMessageBody = styled(Box)({
  flex: 1,
  minWidth: 0,
  display:"flex",
  flexDirection:"column"
});

export const SenderName = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.secondary, // 👈 ĐƯA VÀO STYLE
  marginBottom: 4,
}));


// export const MessageBubble = styled(Box, {
//   shouldForwardProp: (prop) => prop !== "$own",
// })(({ theme, $own }) => ({
//   background: $own ? "#1976d2" : "#42a928",
//   color: $own ? "#fff" : "#fff",
//   padding: theme.spacing(1),
//   borderRadius: 12,
//   maxWidth: "70%",
//   wordBreak: "break-word",
//   border:"1px solid white",
// }));
export const MessageBubble = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$own",
})(({ theme, $own }) => ({
  display: "inline-flex",          // 🔥 CỐT LÕI
  flexDirection: "column",
  alignSelf: $own ? "flex-end" : "flex-start",

  maxWidth: "70%",
  width: "fit-content",            // 🔥 ôm sát nội dung
  
  background: $own ? "#1976d2" : "#42a928",
  color: "#fff",
  padding: theme.spacing(1),
  borderRadius: 12,

  wordBreak: "break-word",
}));

export const MessageTime = styled(Typography)({
  fontSize: 11,
  opacity: 0.6,
  marginTop: 2,
});

/* ================= MESSAGE CONTENT ================= */
export const TextMessage = styled(Typography)({
  fontSize: 14,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  display: "inline",
});

export const TypingRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
});

export const TypingText = styled(Typography)({
  fontStyle: "italic",
  opacity: 0.7,
});

export const MediaWrapper = styled(Box)({
  display: "inline-block",
  maxWidth: 220,
  overflow: "hidden",
  borderRadius: 8,
  cursor: "zoom-in",

  "& img, & video": {
    display: "block",
    maxWidth: "100%",   // 🔥 KHÔNG dùng width: 100%
    height: "auto",
    borderRadius: 8,
  },
});


// export const FileBubble = styled(Box)(({ theme }) => ({
//   background: theme.palette.grey[100],
//   padding: theme.spacing(1),
//   borderRadius: 8,
//   wordBreak: "break-all",
// }));
export const FileBubble = styled(Box)(({ theme }) => ({
  display: "inline-flex",   // 🔥
  alignItems: "center",
  gap: 6,
  maxWidth: 260,
  background: theme.palette.grey[100],
  padding: theme.spacing(1),
  borderRadius: 8,
  wordBreak: "break-all",
}));

/* ================= EMPTY ================= */
export const EmptyState = styled(Box)(({ theme }) => ({
  textAlign: "center",
  color: theme.palette.text.secondary,
  padding: theme.spacing(4),
}));

/* ================= ATTACHMENTS PREVIEW ================= */
// export const AttachmentsWrapper = styled(Box)(({ theme }) => ({
//   display: "flex",
//   gap: theme.spacing(1),
//   padding: theme.spacing(1.5),
//   borderTop: `1px solid ${theme.palette.divider}`,
//   flexWrap: "wrap",
//   maxHeight: 160,
//   overflowY: "auto",
//   backgroundColor: theme.palette.background.default,
// }));

export const AttachmentsWrapper = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  gap: theme.spacing(1),
  padding: theme.spacing(1.5),
  borderTop: `1px solid ${theme.palette.divider}`,
  flexWrap: "nowrap",
  overflowX: "auto",
  overflowY: "hidden",
  WebkitOverflowScrolling: "touch",
  backgroundColor: theme.palette.background.default,
}));


export const FilePreviewImage = styled("img")(({ theme }) => ({
  width: 40,
  height: 40,
  objectFit: "cover",
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  display: "block",
}));

export const FileChip = styled(Chip)(() => ({
  maxWidth: 220,
  height: "auto",
  flexShrink: 0,
  paddingTop: 4,
  paddingBottom: 4,
  "& .MuiChip-icon": {
    marginLeft: 8,
  },
  "& .MuiChip-label": {
    paddingTop: 4,
    paddingBottom: 4,
  },
}));

export const FileChipLabel = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
});

export const FileName = styled(Typography)({
  maxWidth: 120,
  fontWeight: 500,
});

export const FileSize = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.secondary,
  lineHeight: 1.2,
}));


/* ================= INPUT ================= */
export const InputArea = styled(Box)(({ theme }) => ({
  flexShrink: 0,
  display: "flex",
  alignItems: "flex-end",
  gap: 8,
  padding: 8,
  borderTop: `1px solid ${theme.palette.divider}`,
  minHeight: 56,
  maxHeight: 150,
  overflow: "hidden",
}));

export const MessageInput = styled(TextField)({
  flex: 1,

  "& .MuiInputBase-root": {
    alignItems: "stretch",
    padding: 0,
  },

  "& .MuiInputBase-inputMultiline": {
    padding: "8px 12px",
    maxHeight: "150px",
    resize: "none",
    overflowY: "auto",
  },
});

export const SendButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== "disabled",
})(({ theme, disabled }) => ({
  backgroundColor: disabled
    ? theme.palette.action.disabledBackground
    : theme.palette.primary.main,
  color: "#fff",
  width: 40,
  maxHeight: 150,
  flexShrink: 0,

  "&:hover": {
    backgroundColor: disabled
      ? theme.palette.action.disabledBackground
      : theme.palette.primary.dark,
  },
}));

export const BlackAttachFileIcon = styled(AttachFile)({
  color: "#19abed",
});

export const BlackEmojiIcon = styled(InsertEmoticon)({
  color: "#f6a510",
});

export const ChatDateDivider = styled("div")(({ theme }) => ({
  textAlign: "center",
  // margin: "12px 0",
  fontSize: 12,
  color: theme.palette.text.secondary,
  position: "relative",

  "&::before, &::after": {
    content: '""',
    position: "absolute",
    top: "50%",
    width: "30%",
    height: "1px",
    backgroundColor: theme.palette.divider,
  },

  "&::before": {
    left: 0,
  },

  "&::after": {
    right: 0,
  },
}));


export const EmojiGrid = styled(Box)(({ theme }) => ({
  width: 240,
  maxHeight: 220,
  overflowY: "auto",
  padding: theme.spacing(1),
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: theme.spacing(0.5),
}));

export const EmojiItem = styled(Box)(({ theme }) => ({
  fontSize: 24,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 36,
  height: 36,
  borderRadius: theme.shape.borderRadius,
  transition: "background-color 0.15s ease",

  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const StyledIcon = styled(AutoAwesomeMosaicIcon)(({ theme, active }) => ({
  color: active ? theme.palette.primary.main : "inherit",
}));

export const MentionPopoverContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  minWidth: 210,
}));

export const MentionItem = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  cursor: "pointer",
  borderRadius: theme.shape.borderRadius,
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const MentionName = styled(Typography)(() => ({
  fontSize: 14,
}));
