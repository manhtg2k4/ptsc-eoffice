import {
  Box,
  IconButton,
  InputBase,
  TextField,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";

export const TitleTypography = styled(Typography)(({ theme }) => ({
  width: "100%",
  fontSize: theme.typography.h6.fontSize,
  fontWeight: theme.typography.h6.fontWeight,
}));

export const TitleInput = styled(InputBase)(({ theme }) => ({
  fontSize: theme.typography.h6.fontSize,
  fontWeight: theme.typography.h6.fontWeight,
  backgroundColor: "transparent",
  width: "100%",
  "& .MuiInputBase-input": {
    padding: 0,
    border: "none",
    outline: "none",
    background: "transparent",
  },
}));

export const SettingsButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== "isconfigopen",
})(({ isconfigopen }) => ({
  transition: "transform 0.3s ease",
  transform: isconfigopen ? "rotate(30deg)" : "rotate(0deg)",
  padding: "5px", // Tương đương size="small"
}));

export const ConfigContainer = styled(Box)(({ theme }) => ({
  paddingBottom: theme.spacing(2),
  marginBottom: theme.spacing(1),
  display: "flex",
  gap: theme.spacing(2),
  flexWrap: "wrap",
  alignItems: "center",
}));

export const SizeInputTextField = styled(TextField)(({ theme }) => ({
  "& .MuiInputBase-input": {
    width: theme.layout.accordion.sizeInputWidth, // Lấy giá trị từ theme
  },
}));
