/* eslint-disable no-console */
import { Radio, FormControlLabel, RadioGroup } from "@mui/material";
import React, { useMemo } from "react";
import PropTypes from "prop-types";
import {
  RadioContainer,
  StyledDebouncedInput,
  TitleTypography,
  OptionLabelTypography,
} from "./RadioFinput.styles";

const RadioFinput = ({
  value = "", 
  onChange, 
  item, 
  disabled, 
  mode, 
  onPropChange 
}) => {
  const options = item.props?.options || [];

  const parsedValue = useMemo(() => {
    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "number") {
      return value.toString();
    }

    logger.warn("RadioFinput: Giá trị không hợp lệ", value);
    return "";
  }, [value]);

  const handleChange = (event) => {
    const newValue = event.target.value;
    onChange(newValue);
  };
  const handleTitleRadioChange = (val) => {
    onPropChange?.(item.id, "titleRadio", val);
  };

  return (
    <RadioContainer>
      {mode === "builder" ? (
        <StyledDebouncedInput
          onChange={handleTitleRadioChange}
          value={item?.props.titleRadio || "Chọn một tùy chọn"}
          delay={400}
          fullWidth
          fontSizeTextInput={14}
          disabled={mode !== "builder"}
        />
      ) : (
        <TitleTypography>
          {item?.props.titleRadio || "Chọn một tùy chọn"}
        </TitleTypography>
      )}

      <RadioGroup
        value={parsedValue}
        onChange={handleChange}
        row={item.props?.radioDirection === "row"}
      >
        {options.map((opt, idx) => (
          <FormControlLabel
            key={idx}
            value={opt.value}
            control={
              <Radio
                size="medium"
                disabled={disabled}
              />
            }
            label={
              <OptionLabelTypography>{opt.label}</OptionLabelTypography>
            }
          />
        ))}
      </RadioGroup>
    </RadioContainer>
  );
};

RadioFinput.propTypes = {
  value: PropTypes.any,
  onChange: PropTypes.func,
  item: PropTypes.object,
  disabled: PropTypes.bool,
  mode: PropTypes.string,
  onPropChange: PropTypes.func,
};

export default RadioFinput;