import { styled } from "@mui/material/styles";
import { Box, Button } from "@mui/material";


export const FormContainer = styled(Box)({
  overflow: "auto",
  height: "95vh",
});

export const SubmitButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(1),
}));