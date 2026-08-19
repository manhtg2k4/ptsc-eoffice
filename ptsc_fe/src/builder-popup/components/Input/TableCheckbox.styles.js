import { styled } from "@mui/material/styles";
import { Typography } from "@mui/material";

export const LabelTypography = styled(Typography)(({ theme }) => ({
  fontSize: "14px",
  fontWeight: "bold",
  marginBottom: theme.spacing(2),
}));

export const RequiredMark = styled("span")({ color: "red" });