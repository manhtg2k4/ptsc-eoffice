import { Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export const StyledStack = styled(Stack)(({ theme }) => ({
  flexDirection: "row",
  alignItems: "start",
  justifyContent: "space-between",
  marginBottom: theme.spacing(1),
  padding: 0,
}));

export const TitleTypography = styled(Typography)(() => ({
  fontWeight: "bold",
  // Nếu bạn muốn giữ style của antd, có thể thêm các thuộc tính khác ở đây
  // Ví dụ: fontSize: '1rem',
}));
