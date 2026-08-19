import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  styled,
} from "@mui/material";

export const StyledDialog = styled(Dialog)({
  "& .MuiDialog-paper": {
    borderRadius: "8px",
    maxWidth: "500px",
    width: "100%",
  },
});

export const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  fontWeight: 600,
  fontSize: "18px",
  color: theme.palette.text.primary,
  padding: theme.spacing(2.5, 3),
  borderBottom: "none",
}));

export const StyledDialogContentStyled = styled(DialogContent)(({ theme }) => ({
  padding: theme.spacing(0, 3, 2, 3),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
}));

export const StyledDialogActions = styled(DialogActions)(({ theme }) => ({
  padding: theme.spacing(2, 3, 2.5, 3),
  gap: theme.spacing(1.5),
  justifyContent: "flex-end",
}));

export const ModalTextField = styled(TextField)({
  "& .MuiOutlinedInput-root": {
    fontSize: "14px",
  },
});

export const ErrorText = styled(Typography)({
  color: "#d32f2f",
  fontSize: "12px",
  marginTop: "4px",
});

export const PrimaryButton = styled(Button)({
  backgroundColor: "#1976D2",
  color: "#FFFFFF",
  textTransform: "none",
  fontWeight: 500,
  padding: "8px 20px",
  minWidth: "100px",
  borderRadius: "4px",
  fontSize: "14px",
  "&:hover": {
    backgroundColor: "#1565C0",
  },
  "&.Mui-disabled": {
    backgroundColor: "#E0E0E0",
    color: "#9E9E9E",
  },
});

export const SecondaryButton = styled(Button)(({ theme }) => ({
  backgroundColor: "transparent",
  color: theme.palette.text.secondary,
  textTransform: "none",
  fontWeight: 500,
  padding: "8px 20px",
  minWidth: "80px",
  borderRadius: "4px",
  fontSize: "14px",
  border: `1px solid ${theme.palette.divider}`,
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));
