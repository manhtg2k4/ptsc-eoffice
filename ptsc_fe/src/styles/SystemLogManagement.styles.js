import { Checkbox, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";


export const StyledSubTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  display: "block",
  marginTop: theme.spacing(0.5),
}));

export const StyledCheckboxAutoClean = styled(Checkbox)(({ theme }) => ({
  color:  theme.palette.primary.main,
}));
