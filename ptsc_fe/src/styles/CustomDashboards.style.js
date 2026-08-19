import { Box, styled } from "@mui/material";

export const ContainerDashboard = styled(Box)(({ theme }) => ({
  padding: theme.spacing(4),
  maxHeight: "90vh",
  overflow: "auto",
}));
