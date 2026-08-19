import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export const FormColumnBox = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
}));

export const ConfigHeaderTypography = styled(Typography)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  fontWeight: "bold",
}));
