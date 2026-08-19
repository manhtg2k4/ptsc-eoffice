import {
  styled,
  Box,
  Typography,
  Paper,
  Switch,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Drawer,
  Avatar,
  IconButton,
  Grid
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export const FormContainer = styled(Box)(({ theme }) => ({
  // padding: theme.spacing(3),
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(2),
  },
}));

export const MainCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.mode === "dark" ? theme.palette.divider : "#E0E0E0"}`,
  borderRadius: theme.spacing(1),
  boxShadow:
    theme.palette.mode === "dark"
      ? "0 2px 4px rgba(0,0,0,0.3)"
      : "0 2px 4px rgba(0,0,0,0.08)",
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(2),
  },
}));

export const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: "16px",
  fontWeight: 600,
  color: theme.palette.mode === "dark" ? "#fff" : "#2364B0",
  //   marginBottom: theme.spacing(2),
  padding: "16px 0",
}));

export const UploadArea = styled(Box)(({ theme }) => ({
  border: `2px dashed ${theme.palette.mode === "dark" ? theme.palette.divider : "#E0E0E0"}`,
  borderRadius: theme.spacing(1),
  padding: theme.spacing(4),
  textAlign: "center",
  cursor: "pointer",
  transition: "all 0.3s ease",
  backgroundColor:
    theme.palette.mode === "dark" ? "#334155" : "#FAFAFA",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  minHeight: "200px",
  "&:hover": {
    borderColor: "#0066CC",
    backgroundColor:
      theme.palette.mode === "dark" ? "#475569" : "#F5F5F5",
  },
}));

export const UploadIcon = styled(Box)(({ theme }) => ({
  width: "48px",
  height: "48px",
  margin: "0 auto 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  backgroundColor:
    theme.palette.mode === "dark" ? "#334155" : "#E3F2FD",
  "& svg": {
    fontSize: "24px",
    color: "#0066CC",
  },
}));

export const UploadText = styled(Typography)(({ theme }) => ({
  fontSize: "14px",
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(0.5),
}));

export const UploadSubText = styled(Typography)(({ theme }) => ({
  fontSize: "12px",
  color: theme.palette.text.disabled,
}));

export const UploadSwitch = styled(Switch)(() => ({
  color: "primary",
}));

export const HiddenFileInput = styled("input")({
  display: "none",
});

export const ApproveButton = styled(Button)(() => ({
  backgroundColor: "#1976D2",
  color: "#FFFFFF",
  textTransform: "none",
  fontWeight: 600,
  minWidth: "100px",
  fontSize: "13px",
  height: "38px",
  "&:hover": {
    backgroundColor: "#1565C0",
  },
}));

export const ReturnButton = styled(Button)(() => ({
  backgroundColor: "#616161",
  color: "#FFFFFF",
  textTransform: "none",
  fontWeight: 600,
  minWidth: "100px",
  fontSize: "13px",
  height: "38px",
  "&:hover": {
    backgroundColor: "#424242",
  },
}));

export const CancelButton = styled(Button)(() => ({
  backgroundColor: "#D32F2F",
  color: "#FFFFFF",
  textTransform: "none",
  fontWeight: 600,
  minWidth: "100px",
  fontSize: "13px",
  height: "38px",
  "&:hover": {
    backgroundColor: "#C62828",
  },
}));

export const ModalTextField = styled(TextField)({
  "& .MuiOutlinedInput-root": {
    fontSize: "14px",
  },
});

export const StyledDialog = styled(Dialog)({
  "& .MuiDialog-paper": {
    minWidth: "500px",
  },
});

export const StyledDialogTitle = styled(DialogTitle)({
  fontWeight: 600,
  fontSize: "16px",
});

export const StyledDialogActions = styled(DialogActions)({
  padding: 16,
  gap: 8,
});

export const ModalActionButton = styled(Button)(({ theme }) => ({
  textTransform: "none",
  fontWeight: 500,
  padding: theme.spacing(0.75, 2),
}));

export const ModalSubmitButton = styled(Button)(({ theme }) => ({
  backgroundColor: "#1976D2",
  color: "#FFFFFF",
  textTransform: "none",
  fontWeight: 600,
  padding: theme.spacing(0.75, 2),
  "&:hover": {
    backgroundColor: "#1565C0",
  },
}));

export const FieldLabel = styled(Typography)(({ theme }) => ({
  fontSize: "14px",
  fontWeight: 500,
  color: theme.palette.text.primary,
}));

export const FieldBox = styled(Box)({
  paddingLeft: 19,
  paddingTop: 4,
});

// TipTap Editor Styles
export const EditorWrapper = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.mode === "dark" ? theme.palette.divider : "#e0e0e0"}`,
  borderRadius: theme.spacing(1),
  overflow: "hidden",
  backgroundColor:
    theme.palette.mode === "dark" ? "#334155" : theme.palette.background.paper,
}));

export const EditorContentWrapper = styled(Box)(({ theme }) => ({
  height: "637px",
  overflow: "auto",
  backgroundColor:
    theme.palette.mode === "dark"
      ? "#334155"
      : "#FFFFFF",
  "& .ProseMirror": {
    minHeight: "540px",
    padding: theme.spacing(2),
    outline: "none",
    fontSize: "14px",
    lineHeight: "1.6",
    color: theme.palette.text.primary,
    backgroundColor:
      theme.palette.mode === "dark"
        ? "#334155"
        : theme.palette.background.paper,

    "& p": {
      margin: "0 0 1em 0",
    },

    "& h1, & h2, & h3, & h4, & h5, & h6": {
      lineHeight: 1.3,
      marginTop: "1.5em",
      marginBottom: "0.5em",
      fontWeight: 600,
    },

    "& h1": { fontSize: "2em" },
    "& h2": { fontSize: "1.5em" },
    "& h3": { fontSize: "1.25em" },

    "& ul, & ol": {
      paddingLeft: "1.5em",
      marginBottom: "1em",
    },

    "& li": {
      marginBottom: "0.25em",
    },

    "& a": {
      color: theme.palette.primary.main,
      textDecoration: "underline",
      cursor: "pointer",
    },

    "& img": {
      maxWidth: "100%",
      height: "auto",
      borderRadius: "4px",
    },

    "& blockquote": {
      borderLeft: `3px solid ${theme.palette.divider}`,
      paddingLeft: "1em",
      marginLeft: 0,
      fontStyle: "italic",
      color: theme.palette.text.secondary,
    },

    "& code": {
      backgroundColor:
        theme.palette.mode === "dark" ? theme.palette.grey[800] : "#f5f5f5",
      padding: "0.2em 0.4em",
      borderRadius: "3px",
      fontSize: "0.9em",
      fontFamily: "monospace",
      color: theme.palette.mode === "dark" ? "#90caf9" : "#d32f2f",
    },

    "& pre": {
      backgroundColor:
        theme.palette.mode === "dark" ? theme.palette.grey[900] : "#f5f5f5",
      padding: "1em",
      borderRadius: "4px",
      overflow: "auto",
      border: `1px solid ${theme.palette.divider}`,

      "& code": {
        backgroundColor: "transparent",
        padding: 0,
        color: theme.palette.text.primary,
      },
    },
  },

  "& .ProseMirror-focused": {
    outline: "none",
  },

  "& .ProseMirror p.is-editor-empty:first-child::before": {
    content: "attr(data-placeholder)",
    float: "left",
    color: theme.palette.text.disabled,
    pointerEvents: "none",
    height: 0,
    fontStyle: "italic",
  },
}));

export const FlexColumnGapBox = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 2,
});

export const ErrorText = styled(Typography)({
  color: "#d32f2f",
  fontSize: "12px",
  marginTop: "4px",
});

// Styled components for inline sx props
export const ImageUploadAreaBox = styled(Box)({
  height: "100%",
  minHeight: { xs: "180px", md: "240px" },
  display: "flex",
  flexDirection: "column",
});

export const PreviewImageStyledContainer = styled(Box)({
  height: "100%",
  objectFit: "contain",
});

export const UploadPlaceholder = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
});

// const ImageBoxWithSpaceBetween = styled(Box)({
//   flex: 1,
//   justifyContent: "space-between",
// });

// Styled component for UploadArea with flex styling
export const UploadAreaStyled = styled(UploadArea)({
  flex: 1,
  minHeight: "100%",
});

// Styled component wrapper for disabled input styling
export const DisabledInputWrapper = styled(Box)(({ theme }) => ({
  "& .MuiInputBase-root.Mui-disabled": {
    backgroundColor:
      theme.palette.mode === "dark"
        ? "#334155"
        : "#EBEBEB",
    color: theme.palette.text.primary,
  },
  "& .MuiInputBase-root.Mui-disabled input": {
    WebkitTextFillColor: theme.palette.text.primary,
  },
  "& .MuiInputBase-root.Mui-disabled textarea": {
    color: theme.palette.text.primary,
  },
  "& .MuiSelect-select.Mui-disabled": {
    color: theme.palette.text.primary,
  },
}));

export const ImageTitleBoxStyled = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

export const SpacingBox = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(3),
}));

export const InteractionBoxContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  justifyContent: "center",
  padding: 26,
  backgroundColor:
    theme.palette.mode === "dark" ? "#334155" : "#FAFAFA",
  borderRadius: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  display: "flex",
  flexDirection: "column",
}));

export const SecondaryText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

export const InteractionItem = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
  padding: theme.spacing(0.5, 1),
  borderRadius: theme.spacing(0.5),
  cursor: "pointer",
  transition: "background-color 0.2s",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const InteractionCount = styled(Typography)(({ theme }) => ({
  fontSize: "18px",
  fontWeight: 600,
  color: theme.palette.text.primary,
}));

export const StyledUserListDrawer = styled(Drawer)(({ theme }) => ({
  "& .MuiPaper-root": {
    width: "400px",
    maxWidth: "100%",
    display: "flex",
    flexDirection: "column",
    [theme.breakpoints.down("sm")]: {
      width: "100%",
    },
  },
}));

export const PageLayoutWrapper = styled(Box)({
  display: "flex",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  position: "relative",
});

export const MainContentArea = styled(Box)({
  flex: 1,
  overflow: "auto",
  transition: "all 0.3s ease",
  minWidth: 0,
});

export const SidePanelContainer = styled(Box)(({ theme, open }) => ({
  width: open ? "380px" : "0px",
  minWidth: open ? "380px" : "0px",
  overflow: "hidden",
  transition: "all 0.3s ease",
  display: "flex",
  flexDirection: "column",
  borderLeft: open ? `1px solid ${theme.palette.divider}` : "none",
  backgroundColor: theme.palette.background.paper,
  flexShrink: 0,
}));

export const UserListDrawerHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: theme.spacing(2, 2, 2, 3),
  borderBottom: `1px solid ${theme.palette.divider}`,
  flexShrink: 0,
  backgroundColor: theme.palette.background.paper,
  position: "sticky",
  top: 0,
  zIndex: 10,
}));

export const UserListDrawerTitleBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
}));

export const TitleIndicator = styled(Box)(({ theme }) => ({
  width: "4px",
  height: "20px",
  backgroundColor: theme.palette.primary.main,
  borderRadius: "2px",
}));

export const UnitFilterBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1, 3),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

export const CloseIconDrawer = styled(CloseIcon)(({ theme }) => ({
  fontSize: "1.25rem",
  color: theme.palette.text.secondary,
}));

export const UserAvatarIcon = styled(Avatar)(({ theme }) => ({
  width: 40,
  height: 40,
  fontSize: "14px",
  fontWeight: 600,
  backgroundColor: theme.palette.mode === "dark" ? "#475569" : "#f1f5f9",
  color: theme.palette.primary.main,
}));

export const UserActionStatus = styled(Typography)(({ theme }) => ({
  fontSize: "12px",
  color: theme.palette.text.secondary,
}));

export const UserMetaRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  marginTop: theme.spacing(0.5),
}));

export const FeedbackContent = styled(Typography)(({ theme }) => ({
  fontSize: "14px",
  color: theme.palette.mode === "dark" ? theme.palette.text.primary : "#334155",
  lineHeight: 1.6,
}));

export const FeedbackBubble = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));

export const StyledUserListDialog = styled(Dialog)({
  "& .MuiPaper-root": {
    borderRadius: "12px",
    maxHeight: "80vh",
    width: "100%",
    maxWidth: "444px", // Chiều rộng tương đương 'xs'
  },
});

export const UserListDialogTitle = styled(DialogTitle)(({ theme }) => ({
  textAlign: "center",
  fontWeight: 600,
  borderBottom: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(2),
}));

export const UserListDialogContent = styled(DialogContent)({
  padding: 0,
  minWidth: "unset",
  width: "100%",
  flex: 1,
  overflowY: "auto",
});

export const UserListContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1, 0),
}));

export const UserListItem = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: theme.spacing(2),
  padding: theme.spacing(1.5, 3),
  transition: "background-color 0.2s",
  cursor: "default",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const UserAvatar = styled(Box)(({ theme }) => ({
  width: 40,
  height: 40,
  borderRadius: "50%",
  backgroundColor: theme.palette.mode === "dark" ? "#475569" : "#e0e0e0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 600,
  color: theme.palette.text.secondary,
  fontSize: "14px",
}));

export const UserInfo = styled(Box)({
  display: "flex",
  flexDirection: "column",
});

export const UserName = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.text.primary,
  fontSize: "14px",
}));

export const UserActionTime = styled(Typography)(({ theme }) => ({
  fontSize: "12px",
  color: theme.palette.text.secondary,
  opacity: 0.8,
}));

export const EmptyDataBox = styled(Box)({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "100px",
});

export const LoadingText = styled(Typography)(({ theme }) => ({
  fontSize: "14px",
  color: theme.palette.text.secondary,
}));

export const NoDataText = styled(Typography)(({ theme }) => ({
  fontSize: "14px",
  color: theme.palette.text.secondary,
}));




export const UserListDialogActions = styled(DialogActions)(({ theme }) => ({
  borderTop: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(1, 2),
}));

// New styled components for refactoring inline styles
export const StatusContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(4),
  marginBottom: theme.spacing(1.5),
}));

export const StatusItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

export const StatusCircle = styled(Box)(({ theme, active, isEditMode }) => ({
  width: 16,
  height: 16,
  borderRadius: '50%',
  backgroundColor: active ? theme.palette.primary.main : theme.palette.grey[300],
  cursor: isEditMode ? 'pointer' : 'default',
}));

export const StatusLabel = styled(Typography)(({ theme }) => ({
  fontSize: '14px',
  color: theme.palette.text.secondary,
}));

export const MainContentBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'error',
})(({ theme, error }) => ({
  border: error
    ? `1.5px solid ${theme.palette.error.main}`
    : `1px dashed ${theme.palette.mode === "dark" ? theme.palette.divider : "#ccc"}`,
  borderRadius: '8px',
  minHeight: '300px',
  padding: theme.spacing(2),
}));

export const ImageAreaWrapper = styled(Box)(() => ({
  marginTop: 0,
}));

export const UploadAreaBoxWrapper = styled(UploadAreaStyled)(() => ({
  minHeight: '180px',
}));

export const ActionHeaderBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  marginBottom: theme.spacing(1),
}));

export const UserListTitleText = styled("span")(() => ({
  fontWeight: 700,
  fontSize: "18px",
}));


export const FeedbackContentBox = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));

export const ActionIconButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.light,
  color: theme.palette.primary.main,
  '&:hover': {
    backgroundColor: theme.palette.primary.light,
  },
}));

export const UploadTextBold = styled(UploadText)(() => ({
  fontWeight: 600,
}));

export const AlignedGridContainer = styled(Grid)(({ theme }) => ({
  alignItems: 'flex-end',
  marginBottom: theme.spacing(1),
}));

