import { Box, Paper, Button } from "@mui/material";
import { styled } from "@mui/system";

export const StyledContainer = styled(Box)({
  height: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  backgroundImage: "url('/your-background-image.jpg')",
  backgroundSize: "cover",
  backgroundPosition: "center",
});

export const StyledForm = styled(Paper)({
  padding: "32px",
  maxWidth: "400px",
  width: "100%",
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  backdropFilter: "blur(10px)",
  borderRadius: "8px",
});

export const StyledButton = styled(Button)({
  marginTop: "16px",
  height: "36px",
});
