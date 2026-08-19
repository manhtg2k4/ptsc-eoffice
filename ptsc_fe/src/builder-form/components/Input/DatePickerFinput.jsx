import React from "react";
import { DatePicker } from "@mui/x-date-pickers";
// import { TextField } from "@mui/material";

const DatePickerFinput = ({ label, required, helperText, error, ...props }) => {
  logger.log("🚀 ~ DatePickerFinput ~ helperText:", helperText);

  const formattedLabel = required ? (
    <>
      {label} <span style={{ color: "red", fontWeight: "bold"}}>(*)</span>
    </>
  ) : (
    label
  );

  // Tạo slotProps để override TextField
  const textFieldProps = {
    // required,
    fullWidth: true,
    error: error || props.error, // Fallback nếu có error từ props gốc
    helperText: helperText || props.helperText, // Ưu tiên helperText truyền vào
    InputLabelProps: {
      shrink: true, // Tắt shrink label
    },

  };

  return (
    <DatePicker
      label={formattedLabel}
      {...props}
      slotProps={{
        textField: textFieldProps,
      }}
    />
  );
};

export default DatePickerFinput;