import React from "react";
import { TextField } from "@mui/material";
import { LocalizationProvider, TimePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import PropTypes from "prop-types";

const TimePickerInput = ({
  value,
  onChange,
  disabled = false,
  format = "HH:mm",
  ...props
}) => {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <TimePicker
        value={value}
        onChange={onChange}
        disabled={disabled}
        ampm={false}
        inputFormat={format}
        renderInput={(params) => <TextField {...params} fullWidth />}
        {...props}
      />
    </LocalizationProvider>
  );
};

TimePickerInput.propTypes = {
  value: PropTypes.any,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  format: PropTypes.string,
};


export default TimePickerInput;
