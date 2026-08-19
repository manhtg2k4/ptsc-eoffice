import React, { memo, useState, useCallback } from "react";
import { DesktopDatePicker as DatePicker } from "@mui/x-date-pickers/DesktopDatePicker";
import { DesktopDateTimePicker as DateTimePicker } from "@mui/x-date-pickers/DesktopDateTimePicker";
import { DesktopTimePicker as TimePicker } from "@mui/x-date-pickers/DesktopTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import TodayIcon from "@mui/icons-material/Today";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import customParseFormat from "dayjs/plugin/customParseFormat";
import PropTypes from "prop-types";
import {
  inputLabelPropsStyle,
  textFieldSx,
} from "@styles/DatePicker/DatePicker.style";
import DateTimeRangePicker from "./DateTimeRangePicker";

dayjs.extend(customParseFormat);
dayjs.locale("vi");


function CustomDateTimePicker(props) {
  const {
    value,
    label,
    onBlur,
    onChange,
    required = false,
    error,
    helperText,
    // disablePast = false,
    minDate,
    maxDate,
    restrictFuture = false,
    futureOnly = false,
    placeholder,
    disabled = false,
    readOnly = false,
    showTime = false,
    timeOnly = false,
    minDateTime,
    maxDateTime,
    minTime,
    maxTime,
    views,
    format,
    onValidationError, // Callback để báo lỗi lên parent component
    // Range mode
    isRange = false,
    startLabel,
    endLabel,
    isEdit = false,
    shouldDisableTime,
    ...restProps
  } = props;

  const [localError, setLocalError] = useState(false);
  const [localHelperText, setLocalHelperText] = useState("");
  // Lưu giá trị gốc từ DB — cập nhật đồng bộ trong render (trước khi onError fire)
  const initialValueRef = React.useRef(null);
  if (value == null) {
    initialValueRef.current = null;
  } else if (isEdit && initialValueRef.current == null) {
    initialValueRef.current = value;
  }

  const parseDate = (val) => {
    if (!val) return null;
    if (dayjs.isDayjs(val)) return val.isValid() ? val : null;

    // Thử parse thông thường (ISO, etc.)
    let d = dayjs(val);
    if (d.isValid()) return d;

    // Thử parse với các format phổ biến trong hệ thống
    const formats = [
      "DD/MM/YYYY",
      "DD/MM/YYYY HH:mm",
      "HH:mm DD/MM/YYYY",
      "DD/MM/YYYY HH:mm:ss",
      "YYYY-MM-DD",
      "YYYY-MM-DD HH:mm",
      "YYYY-MM-DD HH:mm:ss",
    ];
    d = dayjs(val, formats, true);
    if (d.isValid()) return d;

    return null;
  };

  const dayjsValue = parseDate(value);

  const now = dayjs().startOf("minute");

  let finalMinDateTime = parseDate(minDateTime) || parseDate(minDate);

  if (futureOnly) {
    if (finalMinDateTime) {
      // Nếu có cả minDateTime và futureOnly, chọn cái lớn hơn giữa now và minDateTime
      finalMinDateTime = now.isAfter(finalMinDateTime) ? now : finalMinDateTime;
    } else {
      finalMinDateTime = now;
    }
  }

  const finalMaxDateTime =
    parseDate(maxDateTime) ||
    (restrictFuture ? dayjs().endOf("day") : parseDate(maxDate)) ||
    undefined;

  // Tính toán giờ gần nhất trong tương lai để làm reference date
  const getReferenceDate = () => {
    // Nếu showTime và futureOnly đều true, set reference date là giờ hiện tại + 5 phút, làm tròn lên bội số 5
    if (showTime && futureOnly && !dayjsValue) {
      // Cộng thêm 5 phút
      const timePlusFive = now.add(5, "minute");
      const currentMinute = timePlusFive.minute();

      // Làm tròn lên bội số 5 phút gần nhất
      const remainder = currentMinute % 5;
      let suggestedDate = timePlusFive;
      if (remainder !== 0) {
        const minutesToAdd = 5 - remainder;
        suggestedDate = timePlusFive
          .add(minutesToAdd, "minute")
          .second(0)
          .millisecond(0);
      }

      // Đảm bảo reference date nằm trong khoảng [finalMinDateTime, finalMaxDateTime]
      if (finalMinDateTime && suggestedDate.isBefore(finalMinDateTime)) {
        suggestedDate = finalMinDateTime;
      }
      if (finalMaxDateTime && suggestedDate.isAfter(finalMaxDateTime)) {
        suggestedDate = finalMaxDateTime;
      }

      return suggestedDate;
    }

    return undefined;
  };

  // ======================
  // HANDLERS (STABLE)
  // ======================
  const handleDateChange = useCallback(
    (date) => {
      if (date === null) {
        if (required) {
          setLocalError(true);
          setLocalHelperText("Trường này là bắt buộc");
        } else {
          setLocalError(false);
          setLocalHelperText("");
        }
        onChange?.(null);
        return;
      }

      if (!dayjs(date).isValid()) return;

      setLocalError(false);
      setLocalHelperText("");
      onChange?.(date);
    },
    [onChange, required]
  );

  const handleBlur = useCallback(
    (e) => {
      onBlur?.(e);
    },
    [onBlur]
  );

  const handleDateError = useCallback((reason) => {
    if (!reason) {
      setLocalError(false);
      setLocalHelperText("");
      onValidationError?.(null); // Báo không có lỗi
      return;
    }

    // Bỏ qua các lỗi giới hạn nếu giá trị trùng với giá trị gốc từ DB
    if ((reason === "minDate" || reason === "minDateTime" || reason === "maxDate" || reason === "maxDateTime" || reason === "minTime" || reason === "maxTime") && value != null && initialValueRef.current != null) {
      if (dayjs(value).isSame(dayjs(initialValueRef.current), "minute")) {
        setLocalError(false);
        setLocalHelperText("");
        onValidationError?.(null);
        return;
      }
    }

    const errorMap = {
      invalidDate: "Định dạng ngày không hợp lệ",
      minDate: "Ngày nhỏ hơn giới hạn",
      maxDate: "Ngày vượt quá giới hạn",
    };

    const errorMessage = errorMap[reason] || "Ngày không hợp lệ";
    setLocalError(true);
    setLocalHelperText(errorMessage);
    onValidationError?.(errorMessage); // Báo lỗi lên parent
  }, [value, onValidationError]);

  const handleDateTimeError = useCallback((reason) => {
    if (!reason) {
      setLocalError(false);
      setLocalHelperText("");
      onValidationError?.(null); // Báo không có lỗi
      return;
    }

    // Bỏ qua các lỗi giới hạn nếu giá trị trùng với giá trị gốc từ DB
    if ((reason === "minDate" || reason === "minDateTime" || reason === "maxDate" || reason === "maxDateTime" || reason === "minTime" || reason === "maxTime") && value != null && initialValueRef.current != null) {
      if (dayjs(value).isSame(dayjs(initialValueRef.current), "minute")) {
        setLocalError(false);
        setLocalHelperText("");
        onValidationError?.(null);
        return;
      }
    }

    const errorMap = {
      invalidDate: "Định dạng ngày giờ không hợp lệ",
      minDate: "Ngày giờ nhỏ hơn giới hạn",
      minDateTime: "Ngày giờ nhỏ hơn giới hạn",
      maxDate: "Ngày giờ vượt quá giới hạn",
      maxDateTime: "Ngày giờ vượt quá giới hạn",
      minTime: "Giờ nhỏ hơn giới hạn",
      maxTime: "Giờ vượt quá giới hạn",
      disablePast: "Không được chọn thời điểm trong quá khứ",
    };

    const errorMessage = errorMap[reason] || "Ngày giờ không hợp lệ";
    setLocalError(true);
    setLocalHelperText(errorMessage);
    onValidationError?.(errorMessage); // Báo lỗi lên parent
  }, [value, onValidationError]);

  const handleTimeError = useCallback((reason) => {
    if (!reason) {
      setLocalError(false);
      setLocalHelperText("");
      onValidationError?.(null); // Báo không có lỗi
      return;
    }
    const errorMessage = "Giờ không hợp lệ";
    setLocalError(true);
    setLocalHelperText(errorMessage);
    onValidationError?.(errorMessage); // Báo lỗi lên parent
  }, [onValidationError]);

  const handleDayOfWeekFormatter = useCallback((day) => {
    const dayIndex = dayjs(day).day();
    const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    return weekdays[dayIndex];
  }, []);

  const commonProps = {
    label,
    value: dayjsValue ?? null,
    onChange: handleDateChange,
    disabled,
    readOnly,
    slots: { openPickerIcon: TodayIcon },
    localeText: {
      okButtonLabel: "Đồng ý",
      cancelButtonLabel: "Hủy bỏ",
    },
    shouldDisableTime,

    slotProps: {
      textField: {
        placeholder: timeOnly
          ? "HH:MM"
          : showTime
            ? "DD/MM/YYYY HH:mm"
            : placeholder || (views && views.includes('year') && !views.includes('day') ? "MM/YYYY" : "__/__/____"),
        required,
        fullWidth: true,
        size: "small",
        variant: "outlined",
        error: error || localError,
        helperText: error ? helperText : localHelperText,
        onBlur: handleBlur,
        sx: textFieldSx,
        InputLabelProps: { ...inputLabelPropsStyle, required },

        ...restProps,
      },
      actionBar: { actions: ["cancel", "accept"] },

    },
    dayOfWeekFormatter: handleDayOfWeekFormatter,
  };

  // When isRange=true, delegate to DateTimeRangePicker (single input, start→end)
  if (isRange) {
    return (
      <DateTimeRangePicker
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        label={label}
        required={required}
        error={error}
        helperText={helperText}
        disabled={disabled}
        readOnly={readOnly}
        showTime={showTime}
        startLabel={startLabel}
        endLabel={endLabel}
        minDate={minDate}
        maxDate={maxDate}
        placeholder={placeholder}
        {...restProps}
      />
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
      {timeOnly ? (
        <TimePicker
          {...commonProps}
          format={format || "HH:mm"}
          ampm={false}
          views={views || ["hours", "minutes"]}
          minTime={minTime}
          maxTime={maxTime}
          onError={handleTimeError}
        />
      ) : showTime ? (
        <DateTimePicker
          {...commonProps}
          format={format || "DD/MM/YYYY HH:mm"}
          ampm={false}
          minDate={finalMinDateTime}
          minDateTime={finalMinDateTime}
          maxDate={finalMaxDateTime}
          maxDateTime={finalMaxDateTime}
          views={views || ["year", "month", "day", "hours", "minutes"]}
          onError={handleDateTimeError}
          referenceDate={getReferenceDate()}
        />
      ) : (
        <DatePicker
          {...commonProps}
          format={format || "DD/MM/YYYY"}
          minDate={finalMinDateTime}
          maxDate={finalMaxDateTime}
          views={views}
          onError={handleDateError}
        />
      )}
    </LocalizationProvider>
  );
}

CustomDateTimePicker.propTypes = {
  value: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.string,
    PropTypes.instanceOf(Date),
  ]),
  label: PropTypes.string,
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  required: PropTypes.bool,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  disablePast: PropTypes.bool,
  minDate: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.string,
    PropTypes.instanceOf(Date),
  ]),
  maxDate: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.string,
    PropTypes.instanceOf(Date),
  ]),
  minDateTime: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.string,
    PropTypes.instanceOf(Date),
  ]),
  maxDateTime: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.string,
    PropTypes.instanceOf(Date),
  ]),
  minTime: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.string,
    PropTypes.instanceOf(Date),
  ]),
  maxTime: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.string,
    PropTypes.instanceOf(Date),
  ]),
  restrictFuture: PropTypes.bool,
  futureOnly: PropTypes.bool,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  readOnly: PropTypes.bool,
  showTime: PropTypes.bool,
  timeOnly: PropTypes.bool,
  onValidationError: PropTypes.func,
  isRange: PropTypes.bool,
  startLabel: PropTypes.string,
  endLabel: PropTypes.string,
  isEdit: PropTypes.bool,
};

export default memo(CustomDateTimePicker);
