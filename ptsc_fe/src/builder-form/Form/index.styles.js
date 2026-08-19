import { styled } from "@mui/material/styles";
import { Box } from "@mui/material";

export const FormContainer = styled(Box)(({ customStyle }) => ({
  overflow: "auto",
  ...customStyle,
}));