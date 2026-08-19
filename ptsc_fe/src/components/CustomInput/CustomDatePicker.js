// CustomDatePicker.js (thay thế toàn bộ file hiện tại)
import React, { useCallback, useEffect, useState } from "react";
import { RequiredLabel, StyledDatePicker } from "@styles/CustomDatePicker.styles";
import PropTypes from "prop-types";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Box, Typography, styled } from "@mui/material";
import { useFormFieldLayout } from "./FormFieldLayoutContext";

const StackedFieldLabel = styled(Typography)({
  fontSize: "14px",
  fontWeight: 600,
  lineHeight: "20px",
  marginBottom: "6px",
});


/**
 * CustomDatePicker
 * - onChange trả về Date object (không convert sang string tại đây) — dễ xử lý.
 * - Component đảm bảo chỉ truyền null hoặc Date hợp lệ vào DatePicker.
 */

const parseToDate = (value) => {
  if (value == null || value === "") return null;

  // Nếu đã là Date
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // Nếu là number: có thể là seconds hoặc milliseconds
  if (typeof value === "number") {
    // nếu > 10^12 thì coi như milliseconds, nếu < 10^12 thì có thể là seconds
    const maybeMs = value > 1_000_000_000_000 ? value : value * 1000;
    const d = new Date(maybeMs);
    return isNaN(d.getTime()) ? null : d;
  }

  // Nếu chuỗi dd/MM/yyyy
  if (typeof value === "string" && value.includes("/")) {
    const parts = value.split("/").map((p) => parseInt(p, 10));
    if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
      const [day, month, year] = parts;
      const d = new Date(year, month - 1, day);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  // Thử parse ISO/other string
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const CustomDatePicker = ({
  label,
  value,
  onChange,
  formatDate = "dd/MM/yyyy",
  error,
  helperText,
  disabled = false,
  hasMaxDate = false,
  required = false,
  labelLayout,
  ...props
}) => {
  const { inputLabelLayout } = useFormFieldLayout();
  const resolvedLabelLayout = labelLayout || inputLabelLayout || "floating";
  const isStackedLabel = resolvedLabelLayout === "stacked";
  const [innerValue, setInnerValue] = useState(() => parseToDate(value));
  const [pickerError, setPickerError] = useState(null); // reason string from onError

  // Sync when parent `value` changes
  useEffect(() => {
    setInnerValue(parseToDate(value));
  }, [value]);

  const maxDate = hasMaxDate ? new Date() : undefined;

  const handleError = useCallback((reason) => {
    setPickerError(reason);
  }, []);

  const handleDateChange = useCallback((date) => {
    if (date && !isNaN(date.getTime())) {
      setInnerValue(date);
      setPickerError(null);
      onChange(date);
    } else {
      setInnerValue(null);
      onChange(null);
    }
  }, [onChange]);
  
  return (
    <Box>
      {isStackedLabel && label && (
        <StackedFieldLabel variant="body2">
          {label}
          {required && <RequiredLabel> *</RequiredLabel>}
        </StackedFieldLabel>
      )}
      <StyledDatePicker
  label={
    isStackedLabel
      ? undefined
      : (required && label ? (
        <>
          {label} <RequiredLabel>(*)</RequiredLabel>
        </>
      ) : (
        label
      ))
  }
  // 👇 Sửa 1: đảm bảo null thì input trống, không mặc định "hôm nay"
  value={innerValue || null}    

  required={required}
  // onError={(reason) => {
  //   // 👇 Sửa 2: lưu lại lỗi reason
  //   setPickerError(reason);
  // }}
  // onChange={(date) => {
  //   if (date && !isNaN(date.getTime())) {
  //     setInnerValue(date);
  //     setPickerError(null);
  //     onChange(date);
  //   } else {
  //     setInnerValue(null);
  //     onChange(null);
  //   }
  // }}
  onError={handleError}
  onChange={handleDateChange}
  format={formatDate}
  dayOfWeekFormatter={(day) => format(day, "EEE", { locale: vi })}

  // 👇 Cho phép nhập tay
  disableMaskedInput
allowKeyboardEditing
  slotProps={{
    textField: {
      InputLabelProps: isStackedLabel ? undefined : { shrink: true, required: false },
      error: !!error || !!pickerError, // 👈 Sửa 3: báo lỗi khi invalid
      helperText:
  helperText ||
  (pickerError === "invalidDate"
    ? `Vui lòng nhập đúng định dạng cho ${label || 'ngày'}`
    : ""),

      placeholder: "DD/MM/yyyy",   
      disabled,
      required,
    },
  }}
  maxDate={maxDate}
  disabled={disabled}
  {...props}
/>
    </Box>
  );
};

CustomDatePicker.propTypes = {
  label: PropTypes.string,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.instanceOf(Date),
  ]),
  onChange: PropTypes.func.isRequired,
  formatDate: PropTypes.string,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  error: PropTypes.bool,
  helperText: PropTypes.string,
  disabled: PropTypes.bool,
  hasMaxDate: PropTypes.bool,
  required: PropTypes.bool,
  labelLayout: PropTypes.oneOf(["floating", "stacked"]),
};

CustomDatePicker.defaultProps = {
  label: "",
  value: null,
  width: "100%",
  error: false,
  helperText: "",
  disabled: false,
  hasMaxDate: false,
  required: false,
};

export default CustomDatePicker;
