

import CustomInput from "@components/CustomInput/CustomInput";
import { Autocomplete } from "@mui/material";
import PropTypes from "prop-types";
import React, { useMemo } from "react";
import { useSelector } from "react-redux";

const NextHandlers = (props) => {
  const { value, options = [], error, helperText, label, required, item, onChange } = props;

  const isMultiple = item?.props?.isMultiple;

  // --- Redux userFlow
  const userFlow = useSelector((state) => state.formDesign.userFlow);
  logger.log("🚀 ~ NextHandlers ~ userFlow:", userFlow)

  // convert userFlow.users -> options format
  const userOptions = useMemo(() => {
    return (userFlow || []).map((u) => ({
      value: u._id,
      label: u.name,
    }));
  }, [userFlow]);

  // merge với options truyền từ props
  const mergedOptions = useMemo(() => {
    return [...options, ...userOptions];
  }, [options, userOptions]);

  // --- parse value cho multiple
  let parsedValue = value;
  if (isMultiple) {
    try {
      parsedValue = Array.isArray(value)
        ? value
        : value
        ? JSON.parse(value)
        : [];
    } catch (e) {
      parsedValue = [];
    }
  }

  // --- mapping value ra option
  const selectedValue = isMultiple
    ? mergedOptions.filter((opt) =>
        parsedValue.some((val) => opt.value === val || opt.value === val?.value)
      )
    : mergedOptions.find(
        (opt) => opt.value === value || opt.value === value?.value
      ) || null;
  const handleChange = (event, newValue) => {
    if (isMultiple) {
      // Trả về list value
      onChange?.(event, newValue.map((v) => v.value));
    } else {
      // Trả về value đơn
      onChange?.(event, newValue?.value);
    }
  };

  return (
    <Autocomplete
      {...props}
      multiple={isMultiple}
      options={mergedOptions}
      value={selectedValue}
      isOptionEqualToValue={(option, val) =>
        option.value === val?.value || option.value === val
      }
      getOptionLabel={(option) =>
        typeof option === "string" ? option : option.label
      }
      onChange={handleChange}
      renderInput={(params) => (
        <CustomInput
          {...params}
          label={
            required && label ? (
              <>
                {label} <span style={{ color: "red" }}>(*)</span>
              </>
            ) : (
              label
            )
          }
          InputLabelProps={{ shrink: true }}
          size={props.size ?? "small"}
          error={error}
          helperText={helperText}
        />
      )}
    />
  );
};

NextHandlers.propTypes = {
  isMultiple: PropTypes.bool,
  value: PropTypes.any,
  options: PropTypes.array,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  label: PropTypes.string,
  required: PropTypes.bool,
  item: PropTypes.object,
  onChange: PropTypes.func,
  size: PropTypes.string,
};

export default NextHandlers;