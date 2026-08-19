import { styled } from "@mui/material/styles";
import { Box, Typography } from "@mui/material";

export const StyledFooter = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.footer?.backgroundImage
    ? "transparent"
    : theme.palette.footer?.background ||
      (theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF"),
  color: theme.palette.footer?.text || theme.palette.text.secondary,
  boxShadow: "0 -2px 5px rgba(0,0,0,0.1)",
  textAlign: "center",
  backgroundImage: theme.palette.footer?.backgroundImage,
  backgroundSize: "cover",
  backgroundPosition: "center",
  position: "relative", // Cần thiết để zIndex hoạt động
  zIndex: theme.zIndex.appBar - 1, // Đảm bảo footer nằm trên nền nhưng dưới các thành phần khác như dialog
}));

export const FooterText = styled(Typography)({
  fontSize: "0.875rem",
});
