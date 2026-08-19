import { styled } from "@mui/material/styles";
import { Typography, FormHelperText, Select, MenuItem } from "@mui/material";

// Typography cho nhãn của component
export const LabelTypography = styled(Typography)(({ theme }) => ({
  fontSize: "14px",
  fontWeight: "bold",
  marginBottom: theme.spacing(2),
}));

// FormHelperText được tùy chỉnh
export const StyledFormHelperText = styled(FormHelperText)({
  // Có thể thêm các style tùy chỉnh ở đây nếu cần
});

// Select được sử dụng trong chế độ "builder"
export const BuilderSelect = styled(Select)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  width: "100%",
}));

// MenuItem được tùy chỉnh
export const StyledMenuItem = styled(MenuItem)({});