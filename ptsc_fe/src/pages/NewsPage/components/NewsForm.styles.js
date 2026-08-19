import {
  styled,
  Box,
  Typography,
  Paper,
  Switch,
  Button,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
} from "@mui/material";
import { NodeViewWrapper } from "@tiptap/react";
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';
import ImageIcon from "@mui/icons-material/Image";

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

export const BasicInfoCard = styled(MainCard)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

export const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: "16px",
  fontWeight: 600,
  color: theme.palette.primary.main,
  marginBottom: theme.spacing(2),
}));

export const UploadArea = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isError" && prop !== "isDragActive",
})(({ theme, isError, isDragActive }) => ({
  position: "relative",
  border: `2px dashed ${
    isError
      ? theme.palette.error.main
      : isDragActive
      ? "#0066CC"
      : theme.palette.mode === "dark"
      ? theme.palette.divider
      : "#E0E0E0"
  }`,
  borderRadius: theme.spacing(1),
  padding: theme.spacing(2),
  textAlign: "center",
  cursor: "pointer",
  transition: "all 0.3s ease",
  backgroundColor: isDragActive
    ? (theme.palette.mode === "dark" ? "#475569" : "#F5F5F5")
    : (theme.palette.mode === "dark" ? "#334155" : "#FAFAFA"),
  height: "270px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  overflow: "hidden",
  marginTop: 10,
  "&:hover": {
    borderColor: isError ? theme.palette.error.dark : "#0066CC",
    backgroundColor: theme.palette.mode === "dark" ? "#475569" : "#F5F5F5",
  },
}));

export const RemoveImageIconButton = styled(IconButton)(() => ({
  position: "absolute",
  top: 8,
  right: 8,
  backgroundColor: "rgba(255, 255, 255, 0.85)",
  color: "#d32f2f",
  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
  "&:hover": {
    backgroundColor: "#ffffff",
    color: "#b71c1c",
  },
}));

export const UploadIcon = styled(Box)(({ theme }) => ({
  width: "40px",
  height: "40px",
  margin: "0 auto 8px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  backgroundColor: theme.palette.mode === "dark" ? "#475569" : "#E3F2FD",
  marginBottom: theme.spacing(1),
  "& svg": {
    fontSize: "20px",
    color: "#0066CC",
  },
}));

export const UploadText = styled(Typography)(({ theme }) => ({
  fontSize: "13px",
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(0.5),
}));

export const UploadSubText = styled(Typography)(({ theme }) => ({
  fontSize: "11px",
  color: theme.palette.text.disabled,
}));

export const UploadSwitch = styled(Switch)(() => ({
  color: 'primary',
}));

export const HiddenFileInput = styled("input")({
  display: "none",
});

export const UploadButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#769ebf" : "#FFFFFF",
  color: theme.palette.mode === "dark" ? "#FFFFFF" : "#000000",
  border: `1px solid ${theme.palette.mode === "dark" ? "#769ebf" : "#2364B0"}`,
  textTransform: "none",
  fontWeight: 600,
  padding: "6px 20px",
  height: "36px",
  borderRadius: "6px",
  "&:hover": {
    backgroundColor: theme.palette.mode === "dark" ? "#5d84a5" : "#F3F4F6",
    borderColor: theme.palette.mode === "dark" ? "#5d84a5" : "#1b4e8d",
  },
  "&.Mui-disabled": {
    backgroundColor: theme.palette.action.disabledBackground,
    color: theme.palette.action.disabled,
  }
}));

export const ButtonDangerOutline = styled(Button)(() => ({
  color: "#d32f2f",
  borderColor: "#d32f2f",
  textTransform: "none",
  fontWeight: 500,
  "&:hover": {
    borderColor: "#b71c1c",
    backgroundColor: "rgba(211, 47, 47, 0.04)",
  },
}));

export const ButtonDanger = styled(Button)(() => ({
  backgroundColor: "#d32f2f",
  color: "#FFFFFF",
  textTransform: "none",
  fontWeight: 600,
  borderRadius: "8px",
  padding: "0px 24px",
  boxShadow: "0 2px 4px rgba(211, 47, 47, 0.2)",
  "&:hover": {
    backgroundColor: "#b71c1c",
    boxShadow: "0 4px 12px rgba(211, 47, 47, 0.4)",
  },
}));

export const ButtonDangerHuy = styled(Button)(() => ({
  backgroundColor: "#d32f2f",
  height: "36px",
  color: "#FFFFFF",
  textTransform: "none",
  fontWeight: 600,
  borderRadius: "8px",
  padding: "0px 24px",
  boxShadow: "0 2px 4px rgba(211, 47, 47, 0.2)",
  "&:hover": {
    backgroundColor: "#b71c1c",
    boxShadow: "0 4px 12px rgba(211, 47, 47, 0.4)",
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
  fontWeight: "bold", my: 2, fontSize: "16px",
}));

export const PreviewTitleText = styled(Typography)(({ theme }) => ({
  fontSize: "26px",
  fontWeight: 700,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(2),
  lineHeight: 1.3,
}));

export const FieldBox = styled(Box)({
  paddingLeft: 19,
  paddingTop: 10,
});

export const EditorWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'error',
})(({ theme, error }) => ({
  border: error
    ? `1.5px solid ${theme.palette.error.main}`
    : `1px solid ${theme.palette.mode === "dark" ? theme.palette.divider : "#e0e0e0"}`,
  borderRadius: theme.spacing(1),
  overflow: "hidden",
  backgroundColor: theme.palette.mode === "dark" ? "#334155" : theme.palette.background.paper,
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
  color: active 
    ? theme.palette.primary.main 
    : theme.palette.text.secondary,
  transition: "all 0.2s",
  "&:hover": {
    backgroundColor: theme.palette.mode === "dark" 
      ? "rgba(255, 255, 255, 0.08)" 
      : "#f5f5f5",
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
  color: active 
    ? theme.palette.primary.main 
    : theme.palette.text.secondary,
  transition: "all 0.2s",
  "&:hover": {
    backgroundColor: theme.palette.mode === "dark" 
      ? "rgba(255, 255, 255, 0.08)" 
      : "#f5f5f5",
  },
}));

export const ToolbarDivider = styled(Divider)(({ theme }) => ({
  height: "24px",
  margin: theme.spacing(0, 0.5),
  borderColor: theme.palette.divider,
}));

export const EditorContentWrapper = styled(Box)(({ theme }) => ({
  height: "640px",
  overflow: "auto",
  "& .ProseMirror": {
    minHeight: "540px",
    padding: theme.spacing(2),
    outline: "none",
    fontSize: "14px",
    lineHeight: "1.6",
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.mode === "dark" ? "#334155" : theme.palette.background.paper,
    
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
      backgroundColor: theme.palette.mode === "dark" ? theme.palette.grey[800] : "#f5f5f5",
      padding: "0.2em 0.4em",
      borderRadius: "3px",
      fontSize: "0.9em",
      fontFamily: "monospace",
      color: theme.palette.mode === "dark" ? "#90caf9" : "#d32f2f",
    },
    
    "& pre": {
      backgroundColor: theme.palette.mode === "dark" ? theme.palette.grey[900] : "#f5f5f5",
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

    "& .slogan-container": {
      backgroundColor: theme.palette.mode === "dark" ? "rgba(30, 58, 138, 0.2)" : "#f0f7ff",
      borderRadius: "16px",
      padding: "20px 24px",
      margin: "4px 20px 12px 0",
      float: "left",
      maxWidth: "45%",
      border: "2px solid transparent",
      transition: "all 0.2s",
      "&.ProseMirror-selectednode": {
        borderColor: "#0066CC",
        backgroundColor: theme.palette.mode === "dark" ? "rgba(30, 58, 138, 0.4)" : "#e3f2fd",
        boxShadow: "0 0 0 2px rgba(0, 102, 204, 0.2)",
      },
      "& .slogan-text": {
        background: "linear-gradient(to right, #47A1FF, #0066CC)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        fontSize: "18px",
        fontWeight: 600,
        fontStyle: "italic",
        marginBottom: "12px",
        lineHeight: "1.6",
      },
      "& .slogan-motto": {
        color: theme.palette.mode === "dark" ? theme.palette.grey[400] : theme.palette.grey[600],
        fontSize: "13px",
        fontWeight: 600,
        fontStyle: "italic",
        display: "block",
        marginTop: "8px",
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

export const PreviewImageBox = styled(Box)({
  width: "100%",
  height: "100%",
  objectFit: "cover",
  borderRadius: "4px",
  display: "block",
});

export const ImageBoxContainer = styled(Box)({
  height: "100%",
  display: "flex",
  flexDirection: "column",
});

export const DialogPreviewImage = styled(AuthImage)(({ theme }) => ({
  width: "100%",
  maxHeight: "250px",
  objectFit: "contain",
  marginBottom: theme.spacing(2),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(0.5),
}));

export const ErrorText = styled(Typography)({
  color: "#d32f2f",
  fontSize: "12px",
  marginTop: "4px",
});

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
  paddingTop: "20px !important",
  paddingBottom: theme.spacing(3),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(4),
  minWidth: "550px",
  overflow: "visible !important",
}))

export const LinkDialogActionsStyled = styled(DialogActions)(({ theme }) => ({
  padding: theme.spacing(2, 3),
  gap: theme.spacing(2),
  justifyContent: "flex-end",
}))

export const PreviewDialogTitle = styled(DialogTitle)(({ theme }) => ({
  fontWeight: 600,
  fontSize: "18px",
  color: theme.palette.text.primary,
}));

export const PreviewDialogContentStyled = styled(DialogContent)(({ theme }) => ({
  paddingTop: theme.spacing(2),
  maxHeight: "70vh",
  overflow: "auto",
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#ffffff",
}));

export const PreviewContentBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.spacing(1),
  border: `1px solid ${theme.palette.mode === "dark" ? theme.palette.divider : "#e0e0e0"}`,
  
  "& h1, & h2, & h3, & h4, & h5, & h6": {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
    fontWeight: 600,
  },
  
  "& h1": { fontSize: "2em" },
  "& h2": { fontSize: "1.5em" },
  "& h3": { fontSize: "1.25em" },
  
  "& p": {
    marginBottom: theme.spacing(1),
    lineHeight: 1.6,
  },
  
  "& ul, & ol": {
    marginLeft: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  
  "& li": {
    marginBottom: theme.spacing(0.5),
  },
  
  "& img": {
    maxWidth: "100%",
    height: "auto",
    borderRadius: theme.spacing(1),
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  
  "& blockquote": {
    borderLeft: `3px solid ${theme.palette.divider}`,
    paddingLeft: theme.spacing(2),
    marginLeft: 0,
    fontStyle: "italic",
    color: theme.palette.text.secondary,
  },
  
  "& code": {
    backgroundColor: theme.palette.mode === "dark" ? theme.palette.grey[800] : "#f5f5f5",
    padding: "0.2em 0.4em",
    borderRadius: "3px",
    fontSize: "0.9em",
    fontFamily: "monospace",
    color: theme.palette.mode === "dark" ? "#90caf9" : "#d32f2f",
  },
  
  "& pre": {
    backgroundColor: theme.palette.mode === "dark" ? theme.palette.grey[900] : "#f5f5f5",
    padding: theme.spacing(1.5),
    borderRadius: theme.spacing(1),
    overflow: "auto",
    border: `1px solid ${theme.palette.divider}`,

    "& code": {
      backgroundColor: "transparent",
      padding: 0,
      color: theme.palette.text.primary,
    },
  },

  "& .slogan-container": {
    backgroundColor: theme.palette.mode === "dark" ? "rgba(30, 58, 138, 0.2)" : "#f0f7ff",
    borderRadius: "16px",
    padding: "20px 24px",
    margin: "4px 20px 12px 0",
    float: "left",
    maxWidth: "45%",
    border: "2px solid transparent",
    transition: "all 0.2s",
    "&.ProseMirror-selectednode": {
      borderColor: "#0066CC",
      backgroundColor: theme.palette.mode === "dark" ? "rgba(30, 58, 138, 0.4)" : "#e3f2fd",
      boxShadow: "0 0 0 2px rgba(0, 102, 204, 0.2)",
    },
    "& .slogan-text": {
      background: "linear-gradient(to right, #47A1FF, #0066CC)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      fontSize: "18px",
      fontWeight: 600,
      fontStyle: "italic",
      marginBottom: "12px",
      lineHeight: "1.6",
    },
    "& .slogan-motto": {
      color: theme.palette.mode === "dark" ? theme.palette.grey[400] : theme.palette.grey[600],
      fontSize: "13px",
      fontWeight: 600,
      fontStyle: "italic",
      display: "block",
      marginTop: "8px",
    },
  },
}));

export const PreviewImageSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  textAlign: "center",
}));

export const ButtonActionBox = styled(Box)(() => ({
  display: 'flex',
  gap: '8px',
}));

export const PreviewButton = styled(Box)(() => ({
  display: 'flex',
  gap: '8px',
}));

export const PreviewImage = styled(AuthImage)({
  maxWidth: "100%",
  height: "auto",
  borderRadius: 8,
});

export const PreviewImageCaption = styled(Typography)(({ theme }) => ({
  display: "block",
  marginTop: theme.spacing(1),
  fontSize: "12px",
}));

export const PreviewDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    minWidth: "800px",
    [theme.breakpoints.down("md")]: {
      minWidth: "95vw",
    },
  },
}));
export const CropContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  marginBottom: theme.spacing(2),
  backgroundColor: "#f5f5f5",
  padding: theme.spacing(2),
  borderRadius: "8px",
  "& .ReactCrop": {
    maxWidth: "100%",
  },
}));

export const CropCaptionText = styled(Typography)(({ theme }) => ({
  fontSize: "14px",
  color: theme.palette.text.secondary,
  textAlign: "center",
  marginTop: theme.spacing(1),
}));

export const FileDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    width: "100%",
    maxWidth: "550px",
    borderRadius: theme.spacing(1.5),
  },
}));

export const LinkDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    width: "100%",
    maxWidth: "550px",
    borderRadius: theme.spacing(1.5),
  },
}));

export const SloganDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    width: "100%",
    maxWidth: "550px",
    borderRadius: theme.spacing(1.5),
  },
}));

export const FileDialogSectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: "14px",
  fontWeight: 600,
  marginBottom: theme.spacing(1),
  marginTop: theme.spacing(2),
  color: theme.palette.text.primary,
}));

export const FileDialogHelperText = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "isCaption",
})(({ theme, isCaption }) => ({
  fontSize: isCaption ? "11px" : "12px",
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
}));

export const StyledFormGroup = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
}));

export const TagsAndOptionsGrid = styled(Grid)(() => ({
  alignItems: "flex-end",
}));

export const CheckboxGridItem = styled(Grid)(() => ({
  display: "flex",
  alignItems: "center",
  paddingTop: "28px",
}));
export const StyledRadio = styled(Radio)(() => ({}));
export const StyledRadioGroup = styled(RadioGroup)(() => ({}));
export const StyledFormControlLabel = styled(FormControlLabel)(() => ({}));
export const StyledFormControl = styled(FormControl)(() => ({}));
export const StyledDialog = styled(Dialog)(() => ({}));
export const StyledDialogTitle = styled(DialogTitle)(() => ({}));
export const StyledDialogContent = styled(DialogContent)(() => ({}));
export const StyledButton = styled(Button)(() => ({}));
export const StyledTypography = styled(Typography)(() => ({}));

export const StyledSloganWrapper = styled(NodeViewWrapper)(({ selected, theme }) => ({
  cursor: "text",
  display: "block",
  float: "left",
  maxWidth: "45%",
  backgroundColor: selected
    ? theme?.palette?.mode === "dark"
      ? "rgba(30, 58, 138, 0.4)"
      : "#e3f2fd"
    : theme?.palette?.mode === "dark"
    ? "rgba(30, 58, 138, 0.2)"
    : "#f0f7ff",
  borderRadius: "16px",
  padding: "20px 24px",
  margin: "4px 20px 12px 0",
  border: selected ? `2px solid #0066CC !important` : "2px solid transparent",
  outline: "none !important",
  boxShadow: selected ? "0 0 0 2px rgba(0, 102, 204, 0.2)" : "none",
  transition: "all 0.2s",

  "& .slogan-text": {
    background: "linear-gradient(to right, #47A1FF, #0066CC)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    fontSize: "18px",
    fontWeight: 600,
    fontStyle: "italic",
    marginBottom: "12px",
    lineHeight: "1.6",
  },
  "& .slogan-motto": {
    color: theme?.palette?.mode === "dark" ? theme.palette.grey[400] : theme.palette.grey[600],
    fontSize: "13px",
    fontWeight: 600,
    fontStyle: "italic",
    display: "block",
    marginTop: "8px",
  },
}));
