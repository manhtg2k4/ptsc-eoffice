import { IconButton } from "@mui/material";
import {
  ClearableInputAdornment,
  StyledMenuItems,
  StyledTextField,
} from "@styles/CustomInput.styles";
import { convertDatetime2Date } from "@utils/Common/Common";
import dayjs from "dayjs";
import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import useDebounce from "@hooks/useDebounce";

const CustomInput = (props) => {
  const {
    size = "small",
    variant = "outlined",
    value,
    label,
    type,
    select,
    onChange,
    formatType,
    options = [],

    disabled,
    rows,
    minRows,
    maxRows,
    required,
    helperText,
    placeholder,
    multiline,
    error,
    multiple,
    noBorderRadius,
    optionLabel,
    optionValue,
    disableClear,
    InputProps: externalInputProps,
    inputProps: externalInnerInputProps,
    disablePortal,
    isFilter,
    ...restProps
  } = props;
  const [internalValue, setInternalValue] = useState(value);
  const debouncedChange = useDebounce((val) => {
    onChange && onChange({ target: { name, value: val } });
  }, 500);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const curParsePrice = (str) => {
    if (!str) return 0;
    return parseFloat(typeof str === "number" ? str : str.replace(/,/g, ""));
  };

  const datetime2Date = (val) => {
    if (type === "date") {
      return val && Number(val).toString().length > 3
        ? convertDatetime2Date(val)
        : val;
    }
    if (type === "number" && formatType === "Money") {
      return curParsePrice(val).toLocaleString("en-IE");
    }

    return val;
  };

  const handleChange = (e) => {
    const val = e.target.value;
    if (!onChange) return;
    switch (type) {
      case "number": {
        if (formatType === "Money") {
          e.target.value = curParsePrice(e.target.value);
          debouncedChange(val);
          setInternalValue(val);
        } else {
          setInternalValue(val);
          debouncedChange(val);
        }
        break;
      }
      case "date": {
        const [y, m, d] = e.target.value.split("-");
        const year =
          Number(y).toString().length > 3 && (y > 3000 || y < 1900)
            ? dayjs().year()
            : y;
        e.target.value = `${year}-${m}-${d}`;
        debouncedChange(val);
        break;
      }
      default: {
        const inputType = e.nativeEvent?.inputType || null;
        if (e.target.value) {
          const value = e.target.value;
          const newValue =
            !Number(value) && typeof value !== "object"
              ? value.replace(/^\s+|\s+$/g, " ")
              : value;
          if (inputType === "insertLineBreak") {
            e.target.value =
              !Number(value) && typeof value !== "object"
                ? `${newValue.trimStart()}\n`
                : newValue;
          } else {
            e.target.value =
              !Number(value) && typeof value !== "object"
                ? newValue.trimStart()
                : newValue;
          }
          debouncedChange(val);
          setInternalValue(val);
        } else {
          debouncedChange(val);
          setInternalValue(val);
        }
      }
    }
  };

  const handleClick = (e) => {
    e.stopPropagation();
    onChange && onChange({ target: { value: "" } });
  };

  return (
    <>
      <StyledTextField
        size={size}
        value={select ? (value ?? "") : datetime2Date(internalValue)}
        onChange={handleChange}
        placeholder={placeholder}
        label={label}
        variant={variant}
        multiline={multiline}
        rows={multiline && !minRows ? rows : undefined}
        minRows={multiline && minRows ? minRows : undefined}
        maxRows={multiline ? maxRows : undefined}
        InputLabelProps={{ shrink: true }}
        required={required}
        error={error}
        helperText={helperText}
        select={select}
        disabled={disabled}
        noBorderRadius={noBorderRadius}
        isFilter={isFilter}
        // Truyền rows và minRows vào styled component để styles có thể sử dụng
        // Chỉ truyền rows nếu không có minRows, chỉ truyền minRows nếu người dùng thực sự truyền minRows
        {...(multiline ? { 
          rows: !minRows && rows ? rows : undefined, 
          minRows: minRows ? minRows : undefined 
        } : {})}
        InputProps={{
          ...externalInputProps,
          style: {
            ...(externalInputProps?.readOnly ? { cursor: "pointer" } : {}),
            ...externalInputProps?.style,
          },
          endAdornment: (
            <>
              {externalInputProps?.endAdornment}
              {select && !multiple && !disabled && !disableClear && (
                <ClearableInputAdornment>
                  <IconButton size="small" onClick={handleClick} edge="end">
                    ✖
                  </IconButton>
                </ClearableInputAdornment>
              )}
            </>
          ),
        }}
        inputProps={{
          ...externalInnerInputProps,
          style: {
            ...(externalInputProps?.readOnly ? { cursor: "pointer" } : {}),
            ...externalInnerInputProps?.style,
          },
        }}
        SelectProps={{
          MenuProps: {
            disablePortal: disablePortal,
          },
        }}
        {...restProps}
      >
        {/* {select &&
          Array.isArray(options) &&
          options.length > 0 && options.map((option) => (
            <StyledMenuItems
               key={option?.key || option?.index}
              value={
                (value && option[value]) ||
                option?.value ||
                option?.code ||
                option?.id ||
                option?._id
              }
            >
              {label
                ? option[label]
                : option.label || option.title || option.name}
            </StyledMenuItems>
          ))} */}
          {select &&
  Array.isArray(options) &&
  options.length > 0 &&
  options.map((option, index) => (
    <StyledMenuItems
      key={option?._id || option?.id || option?.value || option?.key || index}
      value={
        option?.[optionValue] ||
        option?.value ||
        option?.code ||
        option?.id ||
        option?._id
      }
    >
      {option?.[optionLabel] || option.label || option.title || option.name}
    </StyledMenuItems>
  ))}

        {select && (!Array.isArray(options) || options.length === 0) && (
          <StyledMenuItems disabled>Không có dữ liệu</StyledMenuItems>
        )}
      </StyledTextField>
    </>
  );
};
CustomInput.propTypes = {
  size: PropTypes.oneOf(["small", "medium"]),
  variant: PropTypes.oneOf(["outlined", "filled", "standard"]),
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.array,
  ]),
  label: PropTypes.string,
  type: PropTypes.oneOf(["text", "number", "date", "email", "password", "tel"]),
  select: PropTypes.bool,
  onChange: PropTypes.func,
  formatType: PropTypes.oneOf(["Money"]),
  setReload: PropTypes.func,
  options: PropTypes.arrayOf(PropTypes.object),
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  disabled: PropTypes.bool,
  rows: PropTypes.number,
  minRows: PropTypes.number,
  maxRows: PropTypes.number,
  required: PropTypes.bool,
  helperText: PropTypes.string,
  placeholder: PropTypes.string,
  multiline: PropTypes.bool,
  error: PropTypes.bool,
  multiple: PropTypes.bool,
  name: PropTypes.string,
};

export default CustomInput;
