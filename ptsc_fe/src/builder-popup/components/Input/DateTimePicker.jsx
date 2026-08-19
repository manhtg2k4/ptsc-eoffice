import React from "react";
import { TextField } from "@mui/material";
import { LocalizationProvider, DateTimePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import PropTypes from "prop-types";

const DateTimePickerInput = ({
  value,
  onChange,
  minDateTime,
  maxDateTime,
  disabled = false,
  format,
  ...props
}) => {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DateTimePicker
        value={value}
        onChange={onChange}
        minDateTime={minDateTime}
        maxDateTime={maxDateTime}
        disabled={disabled}
        inputFormat={format}
        renderInput={(params) => <TextField {...params} fullWidth />}
        {...props}
      />
    </LocalizationProvider>
  );
};

DateTimePickerInput.propTypes = {
  value: PropTypes.any,
  onChange: PropTypes.func,
  minDateTime: PropTypes.any,
  maxDateTime: PropTypes.any,
  disabled: PropTypes.bool,
  format: PropTypes.string,
};

export default DateTimePickerInput;
