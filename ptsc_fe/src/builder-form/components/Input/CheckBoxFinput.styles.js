import { styled } from "@mui/material/styles";
import { Box, Typography } from "@mui/material";
import DebouncedInput from "@components/DynamicForm/DebouncedInput";

// Container chính cho nhóm checkbox
export const CheckBoxContainer = styled(Box)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  width: "100%",
}));

// Input đã được Debounced cho tiêu đề ở chế độ builder
export const StyledDebouncedInput = styled(DebouncedInput)({
  "& .MuiInputBase-root": {
    padding: "2px 4px",
    fontWeight: 500,
    fontSize: "14px",
  },
});

// Typography cho tiêu đề ở chế độ xem
export const TitleTypography = styled(Typography)(({ theme }) => ({
  fontWeight: "bold",
  fontSize: "14px",
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(0.5),
}));

// Typography cho nhãn của mỗi checkbox
export const OptionLabelTypography = styled(Typography)({
  fontSize: "14px",
});
