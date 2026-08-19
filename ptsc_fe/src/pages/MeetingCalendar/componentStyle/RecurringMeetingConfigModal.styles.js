import { styled } from "@mui/material/styles";
import { 
  SkyBox, 
  SkyTypography, 
  SkyButton, 
  SkyFormControlLabel 
} from "@styles/SkyStyles";

export const ModalContainer = styled(SkyBox)(({ theme }) => ({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 500,
  backgroundColor: theme.palette.background.paper,
  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
  borderRadius: 12,
  padding: theme.spacing(3),
  outline: "none",
  border: theme.palette.mode === "dark" ? `1px solid ${theme.palette.divider}` : "none",
}));

export const ModalTitle = styled(SkyTypography)(({ theme }) => ({
  fontSize: "18px",
  fontWeight: 700,
  marginBottom: theme.spacing(3),
  color: theme.palette.text.primary,
}));

export const FormLabel = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.9rem",
  fontWeight: 600,
  marginBottom: theme.spacing(1),
  color: theme.palette.text.primary,
  "& .required": {
    color: theme.palette.error.main,
    marginLeft: theme.spacing(0.5),
  },
}));

export const StyledFormControlLabel = styled(SkyFormControlLabel)(() => ({
  "& .MuiTypography-root": {
    fontSize: "0.9rem",
  },
}));

export const ActionButtons = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "flex-end",
  gap: theme.spacing(1.5),
  marginTop: theme.spacing(4),
}));

export const CancelButton = styled(SkyButton)(({ theme }) => ({
  textTransform: "none",
  color: theme.palette.text.secondary,
  border: `1px solid ${theme.palette.divider}`,
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
    border: `1px solid ${theme.palette.text.primary}`,
  },
}));

export const ApplyButton = styled(SkyButton)(({ theme }) => ({
  textTransform: "none",
  backgroundColor: theme.palette.primary.main,
  color: "#fff",
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export const RadioGroupRow = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(3),
  marginBottom: theme.spacing(2),
}));
