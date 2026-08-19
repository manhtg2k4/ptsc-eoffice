import { styled, Box, Typography, Paper, Switch, Button, IconButton, Divider, DialogContent, DialogActions, FormControlLabel, Drawer, Avatar } from "@mui/material";
import ImageIcon from "@mui/icons-material/Image";
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
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(2),
  marginTop: theme.spacing(1),
}));

export const UploadArea = styled(Box)(({ theme }) => ({
  border: `2px dashed ${theme.palette.mode === "dark" ? theme.palette.divider : "#E0E0E0"}`,
  borderRadius: theme.spacing(1),
  padding: theme.spacing(4),
  textAlign: "center",
  cursor: "pointer",
  transition: "all 0.3s ease",
  backgroundColor: theme.palette.mode === "dark" ? "#334155" : "#FAFAFA",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  minHeight: "200px",
  "&:hover": {
    borderColor: "#0066CC",
    backgroundColor: theme.palette.mode === "dark" ? "#475569" : "#F5F5F5",
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
  backgroundColor: theme.palette.mode === "dark" ? "#334155" : "#E3F2FD",
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

export const SubDescription = styled(Typography)(({ theme }) => ({
  fontSize: "12px",
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(2),
}));

export const FieldLabel = styled(Typography)(({ theme }) => ({
  fontSize: "14px",
  fontWeight: 500,
  color: theme.palette.text.primary,
}));

export const FieldLabelText = styled(Typography)(() => ({
  fontWeight: "bold",
  my: 2,
  fontSize: "16px",
}));

export const FieldBox = styled(Box)({
  paddingLeft: 19,
  paddingTop: 10,
});

// TipTap Editor Styles
export const EditorWrapper = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.mode === "dark" ? theme.palette.divider : "#e0e0e0"}`,
  borderRadius: theme.spacing(1),
  overflow: "hidden",
  backgroundColor:
    theme.palette.mode === "dark" ? "#334155" : theme.palette.background.paper,
}));

export const MenuBar = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: theme.spacing(0.25),
  padding: theme.spacing(1, 1.5),
  backgroundColor: theme.palette.mode === "dark" ? "#334155" : "#ffffff",
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

export const MenuButton = styled(IconButton)(({ theme, active }) => ({
  width: "36px",
  height: "36px",
  padding: "6px",
  borderRadius: theme.spacing(0.5),
  backgroundColor: active
    ? theme.palette.mode === "dark"
      ? "rgba(144, 202, 249, 0.16)"
      : "#e3f2fd"
    : "transparent",
  color: active ? theme.palette.primary.main : theme.palette.text.secondary,
  transition: "all 0.2s",
  "&:hover": {
    backgroundColor:
      theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#f5f5f5",
  },
  "&.Mui-disabled": {
    color: theme.palette.action.disabled,
  },
  "& .MuiSvgIcon-root": {
    fontSize: "20px",
  },
}));

export const HeadingButton = styled(Button)(({ theme, active }) => ({
  minWidth: "40px",
  height: "36px",
  padding: "6px 10px",
  fontSize: "13px",
  fontWeight: 600,
  textTransform: "none",
  borderRadius: theme.spacing(0.5),
  backgroundColor: active
    ? theme.palette.mode === "dark"
      ? "rgba(144, 202, 249, 0.16)"
      : "#e3f2fd"
    : "transparent",
  color: active ? theme.palette.primary.main : theme.palette.text.secondary,
  transition: "all 0.2s",
  "&:hover": {
    backgroundColor:
      theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#f5f5f5",
  },
}));

export const ToolbarDivider = styled(Divider)(({ theme }) => ({
  height: "24px",
  margin: theme.spacing(0, 0.5),
  borderColor: theme.palette.divider,
}));

export const EditorContentWrapper = styled(Box)(({ theme }) => ({
  height: "637px",
  overflow: "auto",
  backgroundColor: theme.palette.mode === "dark" ? "#334155" : "#FAFAFA",
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
  height: "100%",
  minHeight: { xs: "180px", md: "240px" },
  display: "flex",
  flexDirection: "column",
});

export const PreviewImageStyledContainer = styled(Box)({
  height: "100%",
  objectFit: "contain",
});

export const PreviewInput = styled(Box)({
  marginTop: 10,
});

export const PreviewInputBottom = styled(Box)({
  marginBottom: 10,
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

// const ImageBoxWithSpaceBetween = styled(Box)({
//   flex: 1,
//   justifyContent: "space-between",
// });

// Styled component for UploadArea with flex styling
export const UploadAreaStyled = styled(UploadArea)({
  flex: 1,
  height: "220px",
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

export const ImageUploadBox = styled(Box)(({ theme }) => ({
  border: "2px dashed",
  borderColor: theme.palette.divider,
  borderRadius: theme.spacing(1),
  padding: theme.spacing(3),
  textAlign: "center",
  cursor: "pointer",
  transition: "all 0.3s",
  "&:hover": {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
  },
}));

export const DialogContentStyled = styled(DialogContent)(({ theme }) => ({
  width: '465px',
  paddingTop: theme.spacing(2),
}));

export const DialogActionsStyled = styled(DialogActions)(({ theme }) => ({
  padding: theme.spacing(2),
}));

export const ImageIconStyled = styled(ImageIcon)(({ theme }) => ({
  fontSize: 40,
  color: theme.palette.primary.main,
  marginBottom: theme.spacing(1),
}));

export const InputWrapper = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const LinkDialogContentStyled = styled(DialogContent)(({ theme }) => ({
  paddingTop: theme.spacing(3),
  paddingBottom: theme.spacing(3),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(3),
  minWidth: "400px",
}));

export const LinkDialogActionsStyled = styled(DialogActions)(({ theme }) => ({
  padding: theme.spacing(2, 3),
  gap: theme.spacing(2),
  justifyContent: "flex-end",
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
  marginBottom: theme.spacing(2),
  padding: theme.spacing(0.5, 1),
  borderRadius: theme.spacing(0.5),
  cursor: "pointer",
  transition: "background-color 0.2s",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
  // "&:last-child": {
  //   marginBottom: 0,
  // },
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

export const StyledFormControlLabel = styled(FormControlLabel)(({ theme }) => ({
  marginLeft: 0,
  gap: theme.spacing(1),
}));

// User List Popup (Facebook style) -> Changed to Drawer
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

export const UserListDialogTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  fontSize: "18px",
  color: theme.palette.text.primary,
}));

export const UserListDialogContent = styled(Box)({
  flex: 1,
  padding: 0,
  width: "100%",
  overflowY: "auto",
});

export const UserListContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1, 0),
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

export const FeedbackContent = styled(Typography)(({ theme }) => ({
  fontSize: "14px",
  color: theme.palette.mode === "dark" ? theme.palette.text.primary : "#334155",
  lineHeight: 1.6,
}));

export const FeedbackBubble = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));

export const UserListDialogActions = styled(Box)(({ theme }) => ({
  borderTop: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(2),
}));

export const CloseIconDrawer = styled(CloseIcon)(({ theme }) => ({
  fontSize: "1.25rem",
  color: theme.palette.text.secondary,
}));

export const CloseDrawerButton = styled(Button)(() => ({
  borderRadius: "8px",
  textTransform: "none",
}));

export const UnitFilterBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1, 3),
  borderBottom: `1px solid ${theme.palette.divider}`,
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

export const UserAvatarIcon = styled(Avatar)(({ theme }) => ({
  width: 40,
  height: 40,
  fontSize: "14px",
  fontWeight: 600,
  backgroundColor: theme.palette.mode === "dark" ? "#475569" : "#f1f5f9",
  color: theme.palette.primary.main,
}));

export const TitleContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing(1.5),
}));

export const InfoBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: theme.spacing(2),
  padding: theme.spacing(0, 0, 2.5, 0),
  borderRadius: theme.spacing(1),
}));