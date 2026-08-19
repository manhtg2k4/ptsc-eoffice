import React, { useCallback } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import advancedFormat from "dayjs/plugin/advancedFormat";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/vi";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { styled } from "@mui/material/styles";
import {
  DateRangePickerWrapper,
  SeparatorTypography,
} from "./CustomDateRangePicker.styles";

dayjs.extend(utc);
dayjs.extend(advancedFormat);
dayjs.extend(customParseFormat);

const StyledDateTimePicker = styled(DateTimePicker)(({ theme }) => ({
  height: "40px",
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
    textAlign: "center",
  },
  "& .MuiInputLabel-root": {
    backgroundColor: theme.palette.background.paper,
    paddingLeft: 4,
    paddingRight: 4,
    zIndex: 1,
    color: theme.palette.text.primary,
  },
}));

const CustomDateTimeRangePicker = ({
  start,
  end,
  onChange,
  formatAdvanced,
  styledMaxWidth,
  label,
}) => {
  const defaultFormat = "DD/MM/YYYY HH:mm";

  const handleStartChange = useCallback(
    (date) => {
      onChange?.([date ? dayjs(date).format("YYYY-MM-DD HH:mm:ss") : null, end]);
    },
    [onChange, end]
  );

  const handleEndChange = useCallback(
    (date) => {
      onChange?.([start, date ? dayjs(date).format("YYYY-MM-DD HH:mm:ss") : null]);
    },
    [onChange, start]
  );

  const parsedStart = start ? dayjs(start) : null;
  const parsedEnd = end ? dayjs(end) : null;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
      <DateRangePickerWrapper styledMaxWidth={styledMaxWidth || 454}>
        <StyledDateTimePicker
          value={parsedStart}
          label={label}
          onChange={handleStartChange}
          format={formatAdvanced || defaultFormat}
          maxDateTime={parsedEnd}
          dayOfWeekFormatter={(day) => {
            const dayIndex = dayjs(day).day();
            const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
            return weekdays[dayIndex];
          }}
          slotProps={{
            textField: {
              InputLabelProps: { shrink: true },
            },
            field: { clearable: true },
            openPickerButton: { sx: { padding: 0 } },
          }}
        />
        <SeparatorTypography> - </SeparatorTypography>
        <StyledDateTimePicker
          value={parsedEnd}
          onChange={handleEndChange}
          format={formatAdvanced || defaultFormat}
          minDateTime={parsedStart}
          dayOfWeekFormatter={(day) => {
            const dayIndex = dayjs(day).day();
            const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
            return weekdays[dayIndex];
          }}
          slotProps={{
            textField: {
              InputLabelProps: { shrink: true },
            },
            field: { clearable: true },
            openPickerButton: { sx: { padding: 0 } },
          }}
        />
      </DateRangePickerWrapper>
    </LocalizationProvider>
  );
};

CustomDateTimeRangePicker.propTypes = {
  start: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  end: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  onChange: PropTypes.func,
  formatAdvanced: PropTypes.string,
  label: PropTypes.string,
  styledMaxWidth: PropTypes.number,
};

export default CustomDateTimeRangePicker;
