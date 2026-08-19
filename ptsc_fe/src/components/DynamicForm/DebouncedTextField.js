import React, { useState, useEffect, useCallback } from "react";
import { TextField } from "@mui/material";
import PropTypes from "prop-types";

const DebounceTextField = ({ value, onChange, delay = 500, ...props }) => {
  const [inputValue, setInputValue] = useState(value || "");

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (inputValue !== value) {
        // Tạo sự kiện giả để giữ nguyên interface của onChange
        const fakeEvent = {
          target: { value: inputValue },
        };
        onChange(fakeEvent);
      }
    }, delay);

    return () => clearTimeout(handler);
  }, [inputValue, delay, onChange, value]);

  const handleInputChange = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  return (
    <TextField
      {...props}
      value={inputValue}
      onChange={handleInputChange}
    />
  );
};

DebounceTextField.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  delay: PropTypes.number,
};

DebounceTextField.defaultProps = {
  value: "",
  delay: 500,
};

export default DebounceTextField;