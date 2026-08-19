import { styled } from "@mui/material/styles";
import { DatePicker } from "@mui/x-date-pickers";

export const RequiredLabel = styled("span")(({ theme }) => ({
  color: theme.palette.error.main,
}));

export const StyledDatePicker = styled(DatePicker, {
  shouldForwardProp: (prop) => prop !== "width",
})(({ theme, width }) => ({
  width: width || "100%",
  "& .MuiOutlinedInput-root": {
    // ✅ Ghi đè style cho autofill của trình duyệt
    "& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus":
      {
        // Sử dụng màu nền của input từ theme, nếu không có thì dùng màu mặc định theo mode
        WebkitBoxShadow: `0 0 0 1000px ${
          theme.components?.MuiOutlinedInput?.styleOverrides?.root
            ?.backgroundColor ||
          (theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF")
        } inset !important`,
        // Sử dụng màu chữ chính của theme
        WebkitTextFillColor: `${theme.palette.text.primary} !important`,
        caretColor: `${theme.palette.text.primary} !important`,
        borderRadius: "inherit", // Giữ bo góc của input
        transition: "background-color 5000s ease-in-out 0s", // Trick để giữ màu nền
      },

    borderRadius: theme.shape.borderRadius,
    "&:hover": {
      borderColor: theme.palette.primary.light,
    },
    "&.Mui-focused": {
      borderColor: theme.palette.primary.main,
    },
    "& .MuiInputBase-input": {
      color: theme.palette.text.primary,
      padding: "10px",
      lineHeight: 1.5,
      fontWeight: 400,
    },
  },

  "& .MuiInputLabel-root": {
    fontWeight: 400,
    color: theme.palette.text.secondary,
  },
  "& .MuiFormHelperText-root": {
    color: theme.palette.error.main,
  },
}));
