import React, { useCallback } from "react";
import { TextField } from "@mui/material";

import PropTypes from "prop-types";

import {
  LabelTypography,
  StyledAutocomplete,
  StyledCircularProgress,
  StyledRequiredAsterisk,
} from "@styles/CustomAutocomplete.styles";

const AutocompleteWrapper = ({ fieldSize, ...rest }) => {
  // eslint-disable-next-line react/forbid-component-props
  return <StyledAutocomplete size={fieldSize} {...rest} />;
};

AutocompleteWrapper.propTypes = {
  fieldSize: PropTypes.oneOf(["small", "medium"]),
};

const CustomAutocomplete = ({
  field,
  options = [],
  loading = false,
  error = false,
  helperText = "",
  label,
  required = false,
  placeholder = "Nhập để tìm kiếm...",
  getOptionLabel = (option) => option?.name || "",
  isOptionEqualToValue = (option, value) => option?._id === value?._id,
  noOptionsText = "Không có dữ liệu",
  size = "medium",
  disableClearable,
  multiple = false,
  ...rest
}) => {
  const handleOnChange = useCallback(
    (_, newValue) => {
      field.onChange(newValue);
    },
    [field]
  );

  return (
    <AutocompleteWrapper
      {...field}
      options={options}
      fieldSize={size}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={isOptionEqualToValue}
      value={field?.value ?? (multiple ? [] : null)}
      onChange={handleOnChange}
      multiple={multiple}
      loading={loading}
      disableClearable={disableClearable || false}
      filterOptions={(options, { inputValue }) =>
        options.filter((option) =>
          String(option.name || "")
            .toLowerCase()
            .includes(inputValue.toLowerCase().trim())
        )
      }
      noOptionsText={noOptionsText}
      componentsProps={{
        popper: {
          modifiers: [
            { name: "offset", options: { offset: [0, 4] } },
          ],
        },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={
            label ? (
              <LabelTypography>
                {label}{" "}
                {required && <StyledRequiredAsterisk> (*)</StyledRequiredAsterisk>}
              </LabelTypography>
            ) : undefined
          }
          placeholder={placeholder}
          error={!!error}
          helperText={helperText}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading && <StyledCircularProgress />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
          {...rest}
        />
      )}
    />
  );
};

CustomAutocomplete.propTypes = {
  field: PropTypes.shape({
    value: PropTypes.any,
    onChange: PropTypes.func.isRequired,
    ref: PropTypes.any,
    name: PropTypes.string,
  }).isRequired,
  options: PropTypes.arrayOf(PropTypes.object),
  loading: PropTypes.bool,
  error: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
  helperText: PropTypes.string,
  label: PropTypes.string,
  required: PropTypes.bool,
  placeholder: PropTypes.string,
  getOptionLabel: PropTypes.func,
  isOptionEqualToValue: PropTypes.func,
  noOptionsText: PropTypes.string,
  size: PropTypes.oneOf(["small", "medium"]),
  disableClearable: PropTypes.bool,
  multiple: PropTypes.bool,
};

export default CustomAutocomplete;
