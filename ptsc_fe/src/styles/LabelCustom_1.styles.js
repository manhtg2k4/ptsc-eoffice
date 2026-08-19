import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export const LabelContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1),
  alignItems: "center",
}));

export const LabelText = styled(Typography)(() => ({
  fontWeight: "bold",
  width: "170px",
}));

export const ValueText = styled(Typography)(() => ({}));
