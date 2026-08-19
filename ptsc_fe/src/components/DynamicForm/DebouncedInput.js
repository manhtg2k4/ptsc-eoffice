import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";

import { StyledTextField } from "@styles/DebouncedInput.styles";

const DebouncedInput = ({
  value: initialValue = "",
  onChange,
  delay = 500,
  placeholder = "Nhập tiêu đề",
  fontSizeTextInput,
  ...props
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (value !== initialValue) {
        onChange(value);
      }
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay, onChange, initialValue]);

  const handleInputChange = useCallback((e) => {
    setValue(e.target.value);
  }, []);

  return (
    <StyledTextField
      {...props}
      value={value}
      onChange={handleInputChange}
      placeholder={placeholder}
      fontSizeTextInput={fontSizeTextInput}
    />
  );
};

DebouncedInput.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  delay: PropTypes.number,
  placeholder: PropTypes.string,
  fontSizeTextInput: PropTypes.string,
};

export default DebouncedInput;