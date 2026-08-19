import { styled } from "@mui/material/styles";
import { Box, IconButton, Typography, Paper, Grid } from "@mui/material";
import {
  UploadFile,
  AttachFile,
  RemoveRedEye,
  Delete,
} from "@mui/icons-material";
import DebouncedInput from "@components/DynamicForm/DebouncedInput";
import CustomDialog from "@components/CustomDialog/CustomDialog";

export const FileUploadContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  width: "100%",
}));

export const StyledDebouncedInput = styled(DebouncedInput)({
  "& .MuiInputBase-root": {
    padding: "0px",
    fontWeight: "medium",
    fontSize: "12px",
  },
});

export const TitleTypography = styled(Typography)(({ theme }) => ({
  fontWeight: "bold",
  fontSize: "12px",
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(1),
}));

export const UploadIconButton = styled(IconButton)(({ theme }) => ({
  border: `1px solid ${theme.palette.primary.main}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(1.25),
}));

export const StyledUploadIcon = styled(UploadFile)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

export const UploadHelperText = styled(Typography)({
  fontSize: 12,
});

export const FileNameContainer = styled(Box)({
  display: "flex",
  alignItems: "center",
});

export const StyledAttachFileIcon = styled(AttachFile)(({ theme }) => ({
  color: theme.palette.primary.main,
  marginRight: theme.spacing(1),
}));

export const FileNameTypography = styled(Typography)(({ theme }) => ({
  fontSize: "14px",
  color: theme.palette.primary.main,
}));

export const FileActionsContainer = styled(Box)({
  display: "flex",
  alignItems: "center",
});

export const StyledPreviewIcon = styled(RemoveRedEye)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

export const StyledDeleteIcon = styled(Delete)(({ theme }) => ({
  color: theme.palette.error.main,
}));

export const PreviewImage = styled("img")({
  maxWidth: "100%",
  objectFit: "contain",
});

export const PreviewIframe = styled("iframe")({
  width: "100%",
  height: "100%",
  border: "none",
});

export const PreviewDialog = styled(CustomDialog)(({ theme }) => ({
  maxWidth: "sm",
  height: "100%",
  "& .MuiDialog-paper": {
    borderRadius: theme.shape.borderRadius,
  },
}));

export const PreviewDialogContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  height: "100%",
}));

export const PreviewGrid = styled(Grid)({
  display: "flex",
  alignItems: "center",
  gap: 2
});

export const PreviewGridFile = styled(Grid)({
  alignItems: "center",
  justifyContent: "space-between"
});