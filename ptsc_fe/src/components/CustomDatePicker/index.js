import React, { memo, useState, useCallback, useMemo } from "react";
import { DesktopDatePicker as DatePicker } from "@mui/x-date-pickers/DesktopDatePicker";
import { DesktopDateTimePicker as DateTimePicker } from "@mui/x-date-pickers/DesktopDateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { PickersActionBar } from "@mui/x-date-pickers/PickersActionBar";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import TodayIcon from "@mui/icons-material/Today";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import customParseFormat from "dayjs/plugin/customParseFormat";
import PropTypes from "prop-types";
import {
  inputLabelPropsStyle,
  textFieldSx,
  StyledInputAdornment,
  StyledClearIconButton,
  StyledClearIcon,
} from "@styles/DatePicker/DatePicker.style";

dayjs.extend(customParseFormat);

// Cấu hình locale ổn định bên ngoài component
const VI_LOCALE = {
  ...dayjs.Ls.vi,
  name: "vi-custom",
  months: ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"],
  monthsShort: ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"],
};
dayjs.locale(VI_LOCALE);

function CustomActionBar(props) {
  const { onAccept, onCancel, currentValue, onDateChange, ...other } = props;
  
  const handleAccept = useCallback(() => {
    if (!currentValue) {
      onDateChange(dayjs());
    }
    onAccept();
  }, [currentValue, onDateChange, onAccept]);

  return (
    <PickersActionBar
      {...other}
      onAccept={handleAccept}
      onCancel={onCancel}
      actions={["cancel", "accept"]}
    />
  );
}

function CustomDatePicker(props) {
  const {
    value,
    defaultValue,
    label,
    onBlur,
    onChange,
    onError,
    required = false,
    error,
    helperText,
    disablePast = false,
    minDate,
    maxDate,
    restrictFuture = false,
    placeholder,
    futureOnly = false,
    disabled = false,
    readOnly = false,
    isView = false,
    disableEndIcon = false,
    views,
    format,
    showClearIcon = false,
    enableTime = false,
    showTime = false,
    ...restProps
  } = props;

  const [localError, setLocalError] = useState(false);
  const [localHelperText, setLocalHelperText] = useState("");

  const isEffectiveEnableTime = Boolean(enableTime || showTime);
  const effectiveDisabled = Boolean(disabled || isView);
  const effectiveReadOnly = Boolean(readOnly);

  const effectiveFormat = format || (isEffectiveEnableTime ? "DD/MM/YYYY HH:mm" : "DD/MM/YYYY");
  const effectivePlaceholder = placeholder || (isEffectiveEnableTime ? "DD/MM/YYYY HH:mm" : "DD/MM/YYYY");

  const dayjsValue = useMemo(() => {
    const rawVal = value !== undefined ? value : defaultValue;
    if (!rawVal) return null;
    if (dayjs.isDayjs(rawVal)) return rawVal.isValid() ? rawVal : null;
    let d = dayjs(rawVal);
    if (d.isValid()) return d;
    const formats = [
      "DD/MM/YYYY HH:mm",
      "DD/MM/YYYY HH:mm:ss",
      "DD/MM/YYYY",
      "YYYY-MM-DD HH:mm:ss",
      "YYYY-MM-DD HH:mm",
      "YYYY-MM-DD",
    ];
    d = dayjs(rawVal, formats, true);
    return d.isValid() ? d : null;
  }, [value, defaultValue]);

  const computedMaxDate = useMemo(() => {
    if (restrictFuture) return dayjs().endOf("day");
    if (maxDate) {
      const d = dayjs(maxDate);
      return d.isValid() ? d : undefined;
    }
    return undefined;
  }, [restrictFuture, maxDate]);

  const computedMinDate = useMemo(() => {
    if (futureOnly || disablePast) return dayjs().startOf("day");
    if (minDate) {
      const d = dayjs(minDate);
      return d.isValid() ? d : undefined;
    }
    return undefined;
  }, [futureOnly, disablePast, minDate]);

  const handleDateChange = useCallback((date) => {
    if (!date || !dayjs(date).isValid()) {
      setLocalError(false);
      setLocalHelperText("");
      if (onError) onError(false);
      if (onChange) onChange(null);
      return;
    }

    const isPast = date.isBefore(dayjs().startOf("day"), "day");
    if ((futureOnly || disablePast) && isPast) {
      setLocalError(true);
      setLocalHelperText("Không được chọn thời gian trong quá khứ");
      if (onError) onError(true);
      if (onChange) onChange(date); 
      return;
    }

    setLocalError(false);
    setLocalHelperText("");
    if (onError) onError(false);
    if (onChange) onChange(date);
  }, [futureOnly, disablePast, onChange, onError]);

  const handleClearDate = useCallback((e) => {
    e.stopPropagation();
    handleDateChange(null);
  }, [handleDateChange]);

  const handleBlur = (event) => {
    const inputValue = event.target.value;
    if (!inputValue || inputValue === effectivePlaceholder || inputValue === effectiveFormat) {
      if (required) {
        setLocalError(true);
        setLocalHelperText("Vui lòng nhập ngày");
        if (onError) onError(true);
      }
      return;
    }
    if (onBlur) onBlur(event);
  };

  const PickerComponent = isEffectiveEnableTime ? DateTimePicker : DatePicker;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
      <PickerComponent
        label={label}
        value={dayjsValue}
        onChange={handleDateChange}
        format={effectiveFormat}
        views={views || (isEffectiveEnableTime ? ["year", "month", "day", "hours", "minutes"] : undefined)}
        disabled={effectiveDisabled}
        readOnly={effectiveReadOnly}
        minDate={computedMinDate}
        maxDate={computedMaxDate}
        {...(isEffectiveEnableTime ? { ampm: false } : {})}
        slots={{
          openPickerIcon: disableEndIcon ? () => null : TodayIcon,
          actionBar: CustomActionBar,
        }}
        dayOfWeekFormatter={(date) => {
          const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
          return days[date.day()];
        }}
        localeText={{
          okButtonLabel: "Đồng ý",
          cancelButtonLabel: "Hủy bỏ",
        }}
        slotProps={{
          textField: {
            placeholder: effectivePlaceholder,
            required: required,
            fullWidth: true,
            size: "small",
            error: !!(error || localError),
            helperText: error ? helperText : localHelperText,
            onBlur: handleBlur,
            sx: textFieldSx,
            ...restProps,
            InputProps: {
              ...restProps?.InputProps,
              startAdornment: (showClearIcon && dayjsValue) ? (
                <StyledInputAdornment>
                  <StyledClearIconButton size="small" onClick={handleClearDate}>
                    <StyledClearIcon />
                  </StyledClearIconButton>
                </StyledInputAdornment>
              ) : null,
            },
            InputLabelProps: { ...inputLabelPropsStyle, required },
          },
          actionBar: {
            currentValue: dayjsValue,
            onDateChange: handleDateChange,
          },
        }}
      />
    </LocalizationProvider>
  );
}

CustomDatePicker.propTypes = {
  value: PropTypes.any,
  defaultValue: PropTypes.any,
  label: PropTypes.string,
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  onError: PropTypes.func,
  required: PropTypes.bool,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  disablePast: PropTypes.bool,
  minDate: PropTypes.any,
  maxDate: PropTypes.any,
  restrictFuture: PropTypes.bool,
  placeholder: PropTypes.string,
  futureOnly: PropTypes.bool,
  disabled: PropTypes.bool,
  readOnly: PropTypes.bool,
  isView: PropTypes.bool,
  forceViewStyle: PropTypes.bool,
  disableEndIcon: PropTypes.bool,
  views: PropTypes.array,
  format: PropTypes.string,
  showClearIcon: PropTypes.bool,
  enableTime: PropTypes.bool,
  showTime: PropTypes.bool,
};

export default memo(CustomDatePicker);