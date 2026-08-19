// CreateGroupModal.styles.js
import { styled } from "@mui/material/styles";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ListItemButton,
  IconButton,
  Avatar,
  Box,
  List,
  Typography,
  InputAdornment,
  Stack,
  TextField,
} from "@mui/material";

/* Dialog */
export const StyledDialog = styled(Dialog)(() => ({
  "& .MuiPaper-root": {
    borderRadius: 24,
    overflow: "hidden",
  },
  maxWidth: "sm",
}));

/* Header */
export const Header = styled(DialogTitle)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
  background: "linear-gradient(135deg, rgba(25,118,210,.12), rgba(156,39,176,.10))",
}));

/* Content */
export const StyledContent = styled(DialogContent)(({ theme }) => ({
  padding: theme.spacing(2.5),
}));

/* Actions */
export const StyledActions = styled(DialogActions)(({ theme }) => ({
  padding: theme.spacing(2, 3),
  gap: theme.spacing(1),
}));

/* Avatar picker */
export const AvatarWrapper = styled(Box)(() => ({
  position: "relative",
  width: 72,
}));

export const GroupAvatar = styled(Avatar)(() => ({
  width: 50,
  height: 50,
}));

export const CameraButton = styled(IconButton)(({ theme }) => ({
  position: "absolute",
  right: 0,
  bottom: -8,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[1],

  "& svg": {
    color: theme.palette.common.black, // 🖤 icon màu đen
    fontSize: 18, // 🔍 chỉnh icon nhỏ lại
  },
}));


export const RemoveAvatarButton = styled(IconButton)(({ theme }) => ({
  position: "absolute",
  left: -8,
  top: -8,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[1],

  "& svg": {
    color: theme.palette.common.black, // 🖤 icon màu đen
    fontSize: 18, // 🔍 chỉnh icon nhỏ lại
  },
}));

/* Selected users list */
export const UserList = styled(List)(({ theme }) => ({
  maxHeight: 320,
  overflow: "auto",
  marginTop: theme.spacing(0.5),
}));

export const UserItem = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== "checked",
})(({ theme, checked }) => ({
  borderRadius: 16,
  marginBottom: theme.spacing(0.5),
  alignItems: "center",
  backgroundColor: checked ? theme.palette.action.selected : "transparent",
  transition: "all .15s",
  "&:hover": {
    transform: "translateY(-1px)",
  },
}));

export const Title = styled(Typography)({
  fontWeight: 700,
});

export const Subtitle = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));


export const HeaderGrid = styled(Box)({
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  gap: 16, // = theme.spacing(2)
  marginBottom: 16,
  alignItems: "center",
});

export const InputAdornmentd = styled(InputAdornment)({
  position: "start",
})

export const Stacks = styled(Stack)({
   flexWrap: "wrap",
})

export const TextFields = styled(TextField)({
   marginTop: 8,
})

