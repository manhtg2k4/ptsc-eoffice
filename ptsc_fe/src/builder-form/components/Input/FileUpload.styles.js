import { styled } from "@mui/material/styles";
import {
  Box,
  IconButton,
  Typography,
  Grid,
  Paper,
  FormHelperText,
} from "@mui/material";
import {
  UploadFile,
  AttachFile,
  RemoveRedEye,
  Delete,
  Download,
  Draw,
} from "@mui/icons-material";
import DebouncedInput from "@components/DynamicForm/DebouncedInput";
import CustomDialog from "@components/CustomDialog/CustomDialog";

export const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  width: "100%",
  elevation: 0,
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
  borderRadius: "8px",
  padding: "10px",
}));

export const UploadIcon = styled(UploadFile)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

export const FileListGrid = styled(Grid)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

export const AttachmentIcon = styled(AttachFile)(({ theme }) => ({
  color: theme.palette.primary.main,
  marginRight: theme.spacing(1),
}));

export const FileNameTypography = styled(Typography)(({ theme }) => ({
  fontSize: "14px",
  color: theme.palette.primary.main,
}));

export const SignStatusTypography = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'isSigned',
})(({ theme, isSigned }) => ({
  fontSize: "12px",
  color: isSigned ? "green" : "orange",
  marginLeft: theme.spacing(1),
  fontStyle: 'italic',
}));

export const ActionIcon = styled(IconButton)({
  padding: "4px", // Giảm padding cho các icon action
});

export const PrimaryActionIcon = styled(Draw)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

export const DownloadActionIcon = styled(Download)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

export const PreviewActionIcon = styled(RemoveRedEye)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

export const DeleteActionIcon = styled(Delete)(({ theme }) => ({
  color: theme.palette.error.main,
}));

export const PreviewDialog = styled(CustomDialog)({
  maxWidth: "sm",
  height: "100%",
  "& .MuiDialog-paper": {
    borderRadius: "8px",
  },
});

export const PreviewBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  height: "100%",
}));

export const StyledFormHelperText = styled(FormHelperText)(() => ({
  marginLeft: 0, // Ghi đè margin mặc định nếu cần
}));

export const ActionGrid = styled(Grid)({
  display:"flex", 
  alignItems: "center", 
  gap: 2
});

export const ActionTypography = styled(Typography)({
  fontSize: 12
});

export const ActionGridCenter = styled(Grid)({
  alignItems: "center",
  justifyContent: "space-between"
});

export const ActionBox = styled(Box)({
  display: "flex", 
  alignItems: "center"
});