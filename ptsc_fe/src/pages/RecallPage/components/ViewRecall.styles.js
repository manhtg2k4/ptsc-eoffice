import {
  styled,
  Box,
  Typography,
  Paper,
  Switch,
  Button,
  Grid,
  // Radio,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Drawer,
  Avatar,
  IconButton
} from "@mui/material";
import { SkyBox } from "@styles/SkyStyles";
import CloseIcon from "@mui/icons-material/Close";

export const AlignedGridContainer = styled(Grid)(({ theme }) => ({
  alignItems: 'flex-end',
  marginBottom: theme.spacing(1),
}));

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
  color: theme.palette.text.primary,
//   marginBottom: theme.spacing(2),
  padding: theme.spacing(2),
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

export const UploadButton = styled(Button)(({ theme }) => ({
  backgroundColor: "#0066CC",
  color: "#FFFFFF",
  textTransform: "none",
  fontWeight: 500,
  padding: theme.spacing(1, 2),
  "&:hover": {
    backgroundColor: "#0052A3",
  },
}));

export const ButtonOutline = styled(Button)(({ theme }) => ({
  backgroundColor: "transparent",
  color: theme.palette.text.secondary,
  textTransform: "none",
  fontWeight: 500,
  padding: theme.spacing(1, 2),
  border: `1px solid ${theme.palette.divider}`,
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
    border: `1px solid ${theme.palette.text.secondary}`,
  },
}));

export const SaveButton = styled(Button)(({ theme }) => ({
  backgroundColor: "transparent",
  color: "#0066CC",
  textTransform: "none",
  fontWeight: 500,
  padding: theme.spacing(1, 2),
  border: `1px solid #0066CC`,
  "&:hover": {
    backgroundColor: "rgba(0, 102, 204, 0.04)",
    border: `1px solid #0052A3`,
  },
}));

export const SubSectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: "14px",
  fontWeight: 600,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(1),
  marginTop: theme.spacing(3),
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

export const ButtonGroupBoxAuto = styled(Box)({
  marginTop: "auto",
  display: "flex",
  gap: "8px",
});

export const ErrorText = styled(Typography)({
  color: "#d32f2f",
  fontSize: "12px",
  marginTop: "4px",
});

// Styled components for inline sx props
export const ImageUploadAreaBox = styled(Box)({
  height: "84%",
  minHeight: { xs: "180px", md: "240px" },
  display: "flex",
  flexDirection: "column",
});

export const PreviewImageStyledContainer = styled(Box)({
  width: "100%",
  height: "100%",
  maxWidth: "100%",
  maxHeight: "300px", // Limit height to prevent excessive stretching
  objectFit: "contain",
  borderRadius: "8px",
  display: "block",
});

export const UploadPlaceholder = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
});

export const RightColumnBox = styled(Box)({
  height: "100%",
  minHeight: { xs: "180px", md: "240px" },
  display: "flex",
  flexDirection: "column",
});

export const InteractionBoxContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  justifyContent: "center",
  padding: 7,
  backgroundColor:
    theme.palette.mode === "dark" ? "#334155" : "#FAFAFA",
  borderRadius: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  display: "flex",
  flexDirection: "column",
}));

// Styled component for UploadArea with flex styling
export const UploadAreaStyled = styled(UploadArea)({
  flex: 1,
  minHeight: "100%",
});

// Styled component for secondary text
export const SecondaryText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

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

export const ImageAreaWrapper = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
  height: "100%",
}));

export const UploadAreaBoxWrapper = styled(Box)(({ theme }) => ({
  flex: 1,
  border: `2px dashed ${theme.palette.divider}`,
  borderRadius: theme.spacing(1.5),
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing(3),
  backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#FAFAFA",
  cursor: "pointer",
  minHeight: "260px",
  transition: "all 0.2s ease-in-out",
  overflow: "hidden",
  "&:hover": {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "#F0F7FF",
  },
}));

export const ActionHeaderBox = styled(Box)(({ theme }) => ({
  width: "64px",
  height: "64px",
  borderRadius: "50%",
  backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "#F0F7FF",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: theme.spacing(2),
}));

export const ActionIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.primary.main,
  "& svg": {
    fontSize: "32px",
  },
}));

export const UploadTextBold = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  fontSize: "14px",
  color: theme.palette.text.primary,
  textAlign: "center",
  marginBottom: theme.spacing(0.5),
}));

export const MainContentBox = styled(Box)(({ theme }) => ({
  border: `1px dashed ${theme.palette.divider}`,
  borderRadius: theme.spacing(1.5),
  padding: theme.spacing(2),
  minHeight: "400px",
  backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.01)" : "#FAFAFA",
  "& .ProseMirror": {
    outline: "none",
    minHeight: "360px",
  }
}));

export const InteractionIcon = styled(Box)(({ theme }) => ({
  fontSize: "24px",
  color: theme.palette.text.secondary,
}));

export const InteractionCount = styled(Typography)(({ theme }) => ({
  fontSize: "18px",
  fontWeight: 600,
  color: theme.palette.text.primary,
}));

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



export const TagsBox = styled(SkyBox)(({ theme }) => ({
  marginTop: "52px", // Theo yêu cầu của bạn
  marginBottom: theme.spacing(3),
}));

export const FieldWrapper = styled(SkyBox)({
  display: "flex",
  alignItems: "center",
  height: "40px",
});

export const CustomGridContainer = styled(SkyBox)(({ theme, spacing = 2 }) => ({
  display: "grid",
  gridTemplateColumns: "repeat(12, 1fr)",
  gap: theme.spacing(spacing),
}));

export const CustomGridItem = styled(SkyBox)(({ sm = 12, md = 12, xs = 12 }) => ({
  gridColumn: `span ${xs}`,
  "@media (min-width: 600px)": {
    gridColumn: `span ${sm}`,
  },
  "@media (min-width: 900px)": {
    gridColumn: `span ${md}`,
  },
}));

export const RowContainer = styled(Grid)({
  display: "flex",
  alignItems: "flex-start",
});

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
