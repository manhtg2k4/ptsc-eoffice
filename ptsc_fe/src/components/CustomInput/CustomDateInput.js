import React, { useState, useRef, useEffect, useCallback } from "react";
import { ClickAwayListener, useTheme } from "@mui/material";
import { CalendarToday, Clear } from "@mui/icons-material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import updateLocale from "dayjs/plugin/updateLocale";
import PropTypes from "prop-types";
import {
  StyledDateInputWrapper,
  StyledDatePickerTextField,
  StyledClearButton,
  StyledCalendarButton,
  datePickerSlotProps,
} from "@styles/CustomDateInput.styles";
import { StyleInputAdornment } from "@styles/CustomInput.styles";

dayjs.extend(updateLocale);

// Hàm kiểm tra dải giá trị hợp lệ cho ngày
const isValidDateRange = (dateStr) => {
  const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  if (!datePattern.test(dateStr)) {
    return { isValid: false, error: "Vui lòng nhập theo định dạng: DD/MM/YYYY." };
  }

  const [day, month] = dateStr.split("/").map(Number);

  if (day < 1 || day > 31) {
    return { isValid: false, error: `Ngày không hợp lệ: ${day}. Ngày phải từ 01 đến 31.` };
  }
  if (month < 1 || month > 12) {
    return { isValid: false, error: `Tháng không hợp lệ: ${month}. Tháng phải từ 01 đến 12.` };
  }

  const date = dayjs(dateStr, "DD/MM/YYYY");
  if (!date.isValid()) {
    return { isValid: false, error: "Ngày không hợp lệ." };
  }

  const parsedDay = date.date();
  const parsedMonth = date.month() + 1;
  if (parsedDay !== day || parsedMonth !== month) {
    return { isValid: false, error: `Ngày không hợp lệ: ${dateStr}.` };
  }

  return { isValid: true, error: "" };
};

const CustomDateInput = ({ start, end, onChange, size, fullWidth, reset, resetPage }) => {
  const [openPicker, setOpenPicker] = useState(false);
  const [pickerStage, setPickerStage] = useState("start");
  const [tempStart, setTempStart] = useState(start ? dayjs(start) : null);
  const [errorMessage, setErrorMessage] = useState("");
  const [inputValue, setInputValue] = useState(
    start && end
      ? `${dayjs(start).format("DD/MM/YYYY")} - ${dayjs(end).format("DD/MM/YYYY")}`
      : ""
  );
  const textFieldRef = useRef(null);
  const theme = useTheme();

  // Đồng bộ inputValue và tempStart khi reset hoặc start/end thay đổi
  useEffect(() => {
    if (reset || (!start && !end)) {
      setInputValue("");
      setTempStart(null);
      setPickerStage("start");
      setErrorMessage("");
    }
  }, [start, end, reset]);

  const handleDateChange = (newValue) => {
    if (!newValue || !dayjs(newValue).isValid()) {
      setErrorMessage("Ngày không hợp lệ.");
      return;
    }

    if (pickerStage === "start") {
      let updatedEndDate = end;
      if (newValue && end && dayjs(newValue).isAfter(end)) {
        updatedEndDate = newValue;
      }
      onChange({ startDate: newValue.toDate(), endDate: updatedEndDate });
      resetPage && resetPage(); // Gọi resetPage
      setTempStart(newValue);
      setPickerStage("end");
      setInputValue(`${dayjs(newValue).format("DD/MM/YYYY")} - `);
      setErrorMessage("");
      setTimeout(() => setOpenPicker(true), 0);
    } else {
      let updatedStartDate = tempStart ? tempStart.toDate() : newValue.toDate();
      if (newValue && tempStart && dayjs(newValue).isBefore(tempStart)) {
        updatedStartDate = newValue.toDate();
      }
      const startDate = updatedStartDate;
      const endDate = newValue.toDate();

      onChange({ startDate, endDate });
      resetPage && resetPage(); // Gọi resetPage
      setInputValue(
        `${dayjs(startDate).format("DD/MM/YYYY")} - ${dayjs(endDate).format("DD/MM/YYYY")}`
      );
      setOpenPicker(false);
      setPickerStage("start");
      setErrorMessage("");
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    setErrorMessage("");

    if (!value.trim()) {
      onChange({ startDate: null, endDate: null });
      resetPage && resetPage(); // Gọi resetPage
      setTempStart(null);
      return;
    }

    const datePattern = /^(\d{2}\/\d{2}\/\d{4}) - (\d{2}\/\d{2}\/\d{4})$/;
    if (datePattern.test(value)) {
      const [startStr, endStr] = value.split(" - ");

      const startValidation = isValidDateRange(startStr);
      const endValidation = isValidDateRange(endStr);

      if (!startValidation.isValid) {
        setErrorMessage(`Ngày bắt đầu: ${startValidation.error}`);
        return;
      }
      if (!endValidation.isValid) {
        setErrorMessage(`Ngày kết thúc: ${endValidation.error}`);
        return;
      }

      const startDate = dayjs(startStr, "DD/MM/YYYY");
      const endDate = dayjs(endStr, "DD/MM/YYYY");

      let updatedStartDate = startDate.toDate();
      let updatedEndDate = endDate.toDate();

      if (dayjs(updatedEndDate).isBefore(updatedStartDate)) {
        setErrorMessage("Ngày kết thúc không được nhỏ hơn ngày bắt đầu.");
        return;
      }

      onChange({
        startDate: updatedStartDate,
        endDate: updatedEndDate,
      });
      resetPage && resetPage(); // Gọi resetPage
      setTempStart(dayjs(updatedStartDate));
      setErrorMessage("");
    } else {
      setErrorMessage("'Vui lòng nhập theo định dạng: DD/MM/YYYY - DD/MM/YYYY.");
    }
  };

  const handleClear = () => {
    setInputValue("");
    setTempStart(null);
    setPickerStage("start");
    setErrorMessage("");
    onChange({ startDate: null, endDate: null });
    resetPage && resetPage(); // Gọi resetPage
  };

  const handleOpenPicker = () => {
    setOpenPicker(true);
    setPickerStage("start");
    setTempStart(start ? dayjs(start) : null);
  };

  const handleClickAway = () => {
    if (openPicker) {
      setOpenPicker(false);
      setPickerStage("start");
    }
  };

  const handleMouseDownClear = useCallback((event) => {
    event.stopPropagation();
    event.preventDefault();
  }, []);

  const handleClosePicker = useCallback(() => {
    setOpenPicker(false);
  }, []);

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <StyledDateInputWrapper>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
          <StyledDatePickerTextField
            size={size}
            placeholder="Ngày trả kết quả từ - đến"
            fullWidth={fullWidth}
            value={inputValue}
            onChange={handleInputChange}
            inputRef={textFieldRef}
            error={!!errorMessage}
            helperText={errorMessage}
            hasValue={!!inputValue}
            InputProps={{
              endAdornment: (
								<StyleInputAdornment stylePosition="end">
                  {inputValue && (
                    <StyledClearButton
                      onClick={handleClear}
                      // onMouseDown={(event) => {
                      //   event.stopPropagation();
                      //   event.preventDefault();
                      // }}
                      onMouseDown={handleMouseDownClear}
                    >
                      <Clear/>
                    </StyledClearButton>
                  )}
                  <StyledCalendarButton onClick={handleOpenPicker}>
                    <CalendarToday />
                  </StyledCalendarButton>
                </StyleInputAdornment>
              ),
              inputProps: {
                title: inputValue || undefined,
              },
            }}
          />

          <DatePicker
            open={openPicker}
            // onClose={() => setOpenPicker(false)}
            onClose={handleClosePicker}
            value={pickerStage === "start" ? tempStart : null}
            onChange={handleDateChange}
            format="DD/MM/YYYY"
            views={["year", "month", "day"]}
            slotProps={{
              textField: { sx: { display: "none" } },
              ...datePickerSlotProps(theme),
              actionBar: {
                actions: [],
              },
              openPickerButton: {
                sx: { display: "none" },
              },
            }}
            dayOfWeekFormatter={(day) => {
              const dayIndex = dayjs(day).day();
              const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
              return weekdays[dayIndex];
            }}
          />
        </LocalizationProvider>
      </StyledDateInputWrapper>
    </ClickAwayListener>
  );
};

CustomDateInput.propTypes = {
  start: PropTypes.object,
  end: PropTypes.object,
  onChange: PropTypes.func,
  size: PropTypes.string,
  fullWidth: PropTypes.bool,
  reset: PropTypes.bool,
  resetPage: PropTypes.func, // Thêm prop resetPage
};

CustomDateInput.defaultProps = {
  size: "small",
  fullWidth: true,
  reset: false,
  resetPage: null,
};

export default CustomDateInput;
