import { Box, Grid } from "@mui/material";
import { styled } from "@mui/material/styles";

export const FormContainer = styled(Box)(({ theme }) => ({
  // Thêm một chút padding ở trên để không dính vào title
  paddingTop: theme.spacing(1),
  overflow: "hidden",
  height: "100%",
}));

export const FullWidthGridItem = styled(Grid)({
  // Luôn chiếm 100% chiều rộng
  flexBasis: "100%",
  maxWidth: "100%",
  
});

export const HalfWidthGridItem = styled(Grid)(({ theme }) => ({
  // Mặc định chiếm 100% trên màn hình nhỏ (xs)
  flexBasis: "100%",
  maxWidth: "100%",
  // Khi màn hình từ sm (600px) trở lên, chiếm 50%
  [theme.breakpoints.up("sm")]: {
    flexBasis: "50%",
    maxWidth: "50%",
  },
}));
