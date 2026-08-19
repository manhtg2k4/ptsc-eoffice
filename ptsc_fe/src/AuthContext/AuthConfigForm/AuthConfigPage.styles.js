import { Box, Button, Paper, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export const MainContainerBox = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  minHeight: "calc(100vh - 60px)",
  backgroundColor: theme.palette.background.default,
  padding: theme.spacing(3),
}));

export const MainContentPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  width: "100%",
  maxWidth: "800px",
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(3),
  [theme.breakpoints.up("sm")]: {
    padding: theme.spacing(3),
  },
  [theme.breakpoints.up("md")]: {
    padding: theme.spacing(4),
  },
}));

export const TitleTypography = styled(Typography)(() => ({
  textAlign: "center",
  fontWeight: "bold",
}));

export const LoadingBox = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "center",
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(4),
}));

export const ActionButtonBox = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "center",
  gap: theme.spacing(2),
  marginTop: theme.spacing(2),
}));

export const EditConfigButton = styled(Button)(() => ({
  color: "primary",
}));

export const ConfigFormBox = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));
