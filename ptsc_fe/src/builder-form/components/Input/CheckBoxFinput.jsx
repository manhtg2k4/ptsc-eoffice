/* eslint-disable no-console */
import { Checkbox, FormControlLabel, FormGroup } from "@mui/material";
import React, { useMemo } from "react";
import PropTypes from "prop-types";
import {
  CheckBoxContainer,
  StyledDebouncedInput,
  TitleTypography,
  OptionLabelTypography,
} from "./CheckBoxFinput.styles";

const CheckBoxFinput = ({
  value = "[]",
  onChange,
  item,
  disabled,
  mode,
  onPropChange,
}) => {
  const options = item.props?.options || [];

  const parsedValue = useMemo(() => {
    if (Array.isArray(value)) return value;

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        logger.warn("CheckBoxFinput: Không parse được JSON", value);
      }
    }

    return [];
  }, [value]);

  const handleToggle = (val) => {
    const newValue = parsedValue.includes(val)
      ? parsedValue.filter((v) => v !== val)
      : [...parsedValue, val];

    onChange(JSON.stringify(newValue));
  };
  const handleTitleChange = (val) => {
    onPropChange?.(item.id, "titleCheckBox", val);
  };

  const getToggleHandler = (val) => () => {
    handleToggle(val);
  };

  return (
    <CheckBoxContainer>
      {mode === "builder" ? (
        <StyledDebouncedInput
          onChange={handleTitleChange}
          value={item?.props.titleCheckBox || "Chọn tùy chọn"}
          delay={400}
          fullWidth
          fontSizeTextInput={14}
          disabled={mode !== "builder"}
        />
      ) : (
        <TitleTypography>
          {item?.props.titleCheckBox || "Chọn tùy chọn"}
        </TitleTypography>
      )}

      <FormGroup>
        {options.map((opt, idx) => (
          <FormControlLabel
            key={idx}
            control={
              <Checkbox
                size="medium"
                checked={parsedValue.includes(opt.value)}
                onChange={getToggleHandler(opt.value)}
                disabled={disabled}
              />
            }
            label={<OptionLabelTypography>{opt.label}</OptionLabelTypography>}
          />
        ))}
      </FormGroup>
    </CheckBoxContainer>
  );
};

CheckBoxFinput.propTypes = {
  value: PropTypes.any,
  onChange: PropTypes.func,
  item: PropTypes.object,
  disabled: PropTypes.bool,
  mode: PropTypes.string,
  onPropChange: PropTypes.func,
};

export default CheckBoxFinput;
