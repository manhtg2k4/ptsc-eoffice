import { Box, Typography, styled } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker"; // Sử dụng DatePicker từ gói tiêu chuẩn
import { SkyBox } from "@styles/SkyStyles";
import dayjs from "dayjs";

export const DateRangePickerWrapper = styled(Box)(({ theme, styledMaxWidth }) => ({
  display: "flex",
  alignItems: "center",
  border: "1px solid",
  borderColor: theme.palette.divider,
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  //   "&:hover": {
  //     borderColor: theme.palette.text.primary,
  //   },
  padding: 0,
  maxWidth: styledMaxWidth ? styledMaxWidth : 400,
}));

export const DateRangePickerWrappers = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  border: `1px solid ${theme.palette.divider}`, 
  borderRadius: theme.shape.borderRadius, 
  backgroundColor: theme.palette.background.paper,
  padding: "0 8px", 
  height: "40px", 
  "&:hover": {
    borderColor: theme.palette.text.primary,
  },
  "&:focus-within": {
    borderColor: theme.palette.primary.main,
    borderWidth: "2px",
    padding: "0 7px", 
  }
}));

export const StyledDatePicker = styled(DatePicker)(({ theme }) => ({
  height: "40px",
  // ----- chỉnh TextField bên trong DatePicker -----
  "& .MuiOutlinedInput-root": {
    borderRadius: 0,
    backgroundColor: "transparent",
  },

  "& .MuiOutlinedInput-notchedOutline": {
    border: "none !important",
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    border: "none !important",
  },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    border: "none !important",
  },

  "& .MuiInputBase-input": {
    textAlign: "left",
    paddingLeft: "14px",
  },

  // label nền trắng để không bị border đè
  "& .MuiInputLabel-root": {
    backgroundColor: theme.palette.background.paper,
    paddingLeft: 4,
    paddingRight: 4,
    zIndex: 1,
    color: theme.palette.text.primary,
  },
}));


export const SeparatorTypography = styled(Typography)(({ theme }) => ({
  margin: theme.spacing(0, 0.5),
  color: theme.palette.text.secondary,
}));

export const datePickerSlotProps = {
  textField: {
    sx: {
      "& .MuiOutlinedInput-notchedOutline": {
        border: "none",
      },
      "& .MuiInputBase-input": {
        textAlign: "left",
        paddingLeft: "14px",
      },
      flex: 1,
    },
  },
  dayOfWeekFormatter: (day) => {
    const dayIndex = dayjs(day).day();
    const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    return weekdays[dayIndex];
  },
};
