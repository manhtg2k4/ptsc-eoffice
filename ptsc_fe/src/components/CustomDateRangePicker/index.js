import React, { memo, useCallback, useState } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { TextField, Popover, Box, Stack, IconButton, styled } from "@mui/material";
import TodayIcon from "@mui/icons-material/Today";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import PropTypes from "prop-types";

dayjs.locale("vi");

// Styled components để thay thế sx prop
const StyledTextField = styled(TextField)(() => ({
  "& .MuiOutlinedInput-root": {
    cursor: "pointer",
  },
}));

const PopoverContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  minWidth: 580,
}));

const PopoverStack = styled(Stack)(() => ({
  alignItems: "center",
}));

const ArrowBox = styled(Box)(({ theme }) => ({
  fontSize: 20,
  color: theme.palette.text.secondary,
}));

const TodayIconStyled = styled(TodayIcon)({
  fontSize: "small",
});

function CustomDateRangePicker({
  value,                    // [start, end] dạng string hoặc dayjs
  label = "Ngày ban hành",
  onChange,
  required = false,
  error,
  helperText,
  disabled = false,
  readOnly = false,
  placeholder = "__/__/____ - __/__/____",
  ...restProps
}) {
  const [anchorEl, setAnchorEl] = useState(null);

  // Chuyển value về dayjs (có thể là string hoặc null)
  const startValue = value?.[0] ? dayjs(value[0], "DD/MM/YYYY") : null;
  const endValue = value?.[1] ? dayjs(value[1], "DD/MM/YYYY") : null;

  const open = Boolean(anchorEl);

  const handleOpen = (e) => {
    if (disabled || readOnly) return;
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleDateChange = (newValue, isStart) => {
    const newStart = isStart ? newValue : startValue;
    const newEnd = isStart ? endValue : newValue;

    // Nếu cả 2 ngày đều đã chọn → tự động đóng popup
    if (newStart && newEnd) {
      handleClose();
    }

    // Gọi callback với format bạn muốn (ở đây mình trả về string DD/MM/YYYY)
    onChange?.([
      newStart ? newStart.format("DD/MM/YYYY") : null,
      newEnd ? newEnd.format("DD/MM/YYYY") : null,
    ]);
  };

  // Sử dụng useCallback để tránh tạo lại hàm mỗi lần render
  const handleStartDateChange = useCallback((newVal) => handleDateChange(newVal, true), [handleDateChange]);
  const handleEndDateChange = useCallback((newVal) => handleDateChange(newVal, false), [handleDateChange]);

  const formattedValue =
    startValue && endValue
      ? `${startValue.format("DD/MM/YYYY")} - ${endValue.format("DD/MM/YYYY")}`
      : startValue
      ? `${startValue.format("DD/MM/YYYY")} - __/__/____`
      : endValue
      ? `__/__/____ - ${endValue.format("DD/MM/YYYY")}`
      : "";

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
      {/* INPUT CHÍNH */}
      <StyledTextField
        fullWidth
        size="small"
        label={label}
        value={formattedValue}
        placeholder={placeholder}
        onClick={handleOpen}
        error={!!error}
        helperText={helperText}
        disabled={disabled}
        required={required}
        InputProps={{
          readOnly: true,
          endAdornment: (
            <IconButton size="small" edge="end"><TodayIconStyled /></IconButton>
          ),
        }}
      />

      {/* POPOVER CHỈ HIỆN 2 DATEPICKER */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          sx: { boxShadow: 3, borderRadius: 2 },
        }}
      >
        <PopoverContainer>
          <PopoverStack direction="row" spacing={3}>
            {/* Ngày bắt đầu */}
            <DatePicker
              label="Từ ngày"
              value={startValue}
              onChange={handleStartDateChange}
              slotProps={{
                textField: { size: "small", fullWidth: true },
              }}
              {...restProps}
              maxDate={endValue} // Chỉ cho phép chọn ngày trước hoặc bằng ngày kết thúc
            />

            <ArrowBox>→</ArrowBox>

            {/* Ngày kết thúc */}
            <DatePicker
              label="Đến ngày"
              value={endValue}
              onChange={handleEndDateChange}
              slotProps={{
                textField: { size: "small", fullWidth: true },
              }}
              {...restProps}
              minDate={startValue} // Chỉ cho phép chọn ngày sau hoặc bằng ngày bắt đầu
            />
          </PopoverStack>
        </PopoverContainer>
      </Popover>
    </LocalizationProvider>
  );
}

CustomDateRangePicker.propTypes = {
  value: PropTypes.array,
  onChange: PropTypes.func,
  label: PropTypes.string,
  required: PropTypes.bool,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  disabled: PropTypes.bool,
  readOnly: PropTypes.bool,
};

export default memo(CustomDateRangePicker);