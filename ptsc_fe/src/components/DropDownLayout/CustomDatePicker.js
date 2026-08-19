/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import React, { memo, useCallback } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { Today } from '@mui/icons-material';
// import { StyledDatePicker } from '@styles/DropDownDatePicker.styles';

function CustomDatePicker(props) {
  const {
    value,
    label,
    name,
    error,
    helperText,
    isFuture = false,
    isUpdate = false,
    isTimeJoin = false,
    isAddExe = false,
    clone = false,
    sendAllData,
    placeholder,
    onBlur,
    onChange,
    ...restProps
  } = props;

  const getMinDate = () => dayjs('1900-01-01');
  const getMaxDate = () => dayjs('2100-12-31');
  const handleDateChange = useCallback((newValue) => {
    // Chuẩn hóa giá trị: chỉ lấy ngày, bỏ qua giờ/phút/giây
    const dateOnly = newValue ? dayjs(newValue).startOf('day') : null;
    if (onChange) {
      onChange(dateOnly);
    }

    if (onBlur) {
      onBlur(newValue ? newValue.format('DD/MM/YYYY') : '', name);
    }
  }, [onChange, onBlur, name]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        label={label}
        value={value || null}
        // onChange={(newValue) => {
        //   // Chuẩn hóa giá trị: chỉ lấy ngày, bỏ qua giờ/phút/giây
        //   const dateOnly = newValue ? dayjs(newValue).startOf('day') : null;
        //   onChange && onChange(dateOnly);

        //   if (onBlur) {
        //     onBlur(newValue ? newValue.format('DD/MM/YYYY') : '', name);
        //   }
        // }}
        onChange={handleDateChange}
        minDate={getMinDate()}
        maxDate={getMaxDate()}
        format="DD/MM/YYYY"
        slots={{ openPickerIcon: Today }}
        slotProps={{
          textField: {
            fullWidth: true,
            variant: "outlined",
            error: !!error,
            helperText: helperText,
            placeholder: placeholder || '__/__/____',
            InputLabelProps: { shrink: true },
            size: restProps.size || 'small'
          }
        }}
        {...restProps}
      />
    </LocalizationProvider>
  );
}

export default memo(CustomDatePicker);
