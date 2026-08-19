import React, { useCallback } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import advancedFormat from "dayjs/plugin/advancedFormat";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/vi"; // Import locale tiếng Việt cho dayjs

// Import các component cần thiết từ MUI X Date Pickers
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import {
  DateRangePickerWrappers,
  SeparatorTypography,
  StyledDatePicker,
} from "./CustomDateRangePicker.styles";

dayjs.extend(utc);
dayjs.extend(advancedFormat);
dayjs.extend(customParseFormat);

const CustomDateRangePicker = ({
  start,
  end,
  onChange,
  formatAdvanced,
  // placeholder,
  styledMaxWidth,
  label,
}) => {
  const defaultFormat = "DD/MM/YYYY";

  const handleStartChange = useCallback(
    (date) => {
      onChange?.([date ? dayjs(date).format("YYYY-MM-DD") : null, end]);
    },
    [onChange, end]
  );

  const handleEndChange = useCallback(
    (date) => {
      onChange?.([start, date ? dayjs(date).format("YYYY-MM-DD") : null]);
    },
    [onChange, start]
  );

  // Cho phép dayjs tự động phân tích cú pháp.
  // Nó có thể xử lý cả chuỗi ISO ('YYYY-MM-DD') và đối tượng Date.
  const parsedStart = start ? dayjs(start) : null;
  const parsedEnd = end ? dayjs(end) : null;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
      <DateRangePickerWrappers styledMaxWidth={ styledMaxWidth || 454}>
        <StyledDatePicker
          value={parsedStart}
          label={label}
          onChange={handleStartChange}
          format={formatAdvanced || defaultFormat}
          maxDate={parsedEnd}
          dayOfWeekFormatter={(day) => {
            const dayIndex = dayjs(day).day();
            const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
            return weekdays[dayIndex];
          }}
          styled={{ height: "40px" }}
          slotProps={{
            textField: {
              InputLabelProps: { shrink: true },
            },
            field: { clearable: true },
            openPickerButton: { sx: { padding: 0 } },
            clearButton: { sx: { padding: 0 } },
          }}
        />
        <SeparatorTypography> - </SeparatorTypography>
        <StyledDatePicker
          value={parsedEnd}
          // label={label}
          onChange={handleEndChange}
          format={formatAdvanced || defaultFormat}
          minDate={parsedStart} // Ngày kết thúc không được trước ngày bắt đầu
          dayOfWeekFormatter={(day) => {
            const dayIndex = dayjs(day).day();
            const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
            return weekdays[dayIndex];
          }}
          styled={{ height: "40px" }}
          slotProps={{
            textField: {
              InputLabelProps: { shrink: true },
            },
            field: { clearable: true },
            openPickerButton: { sx: { padding: 0 } },
            clearButton: { sx: { padding: 0 } },
          }}
        />
      </DateRangePickerWrappers>
    </LocalizationProvider>
  );
};

CustomDateRangePicker.propTypes = {
  placeholder: PropTypes.arrayOf(PropTypes.string),
  start: PropTypes.string,
  end: PropTypes.string,
  onChange: PropTypes.func,
  formatAdvanced: PropTypes.string,
  label: PropTypes.string,
};

export default CustomDateRangePicker;
