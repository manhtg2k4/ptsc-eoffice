import React, { useCallback } from "react";
import { Autocomplete } from "@mui/material";
import { StyledCircularProgress } from "@styles/AutocompletepPro.styles";
import PropTypes from "prop-types";
import { StyledTextField } from "@styles/CustomInput.styles";

function AutocompletepPro({
  required,
  label,
  onChange,
  value,
  options = [],
  loading = false,
  size = "small",
  disabled = false,
  valueKey = "_id", // 👈 key nào làm value
  labelKey = "name", // 👈 key nào hiển thị label
  ...props
}) {
  // tìm object tương ứng với value
  // ✅ Dùng cách xác định giá trị linh hoạt để tránh mất khi value là object hoặc string
  const selectedOption = React.useMemo(() => {
    if (!value) return null;
    // Nếu value là string (id)
    if (typeof value === "string") {
      return options.find((opt) => opt[valueKey] === value) || null;
    }
    // Nếu value là object
    if (typeof value === "object" && value[valueKey]) {
      return options.find((opt) => opt[valueKey] === value[valueKey]) || null;
    }
    return null;
  }, [value, options, valueKey]);

  const handleOnChange = useCallback((_, newValue) => {
    onChange(newValue ? newValue[valueKey] : "");
  }, [onChange, valueKey]);

  return (
    <Autocomplete
      disabled={disabled}
      options={options}
      size={size}
      getOptionLabel={(option) => option?.[labelKey]}
      isOptionEqualToValue={(option, val) =>
        option[valueKey] === (typeof val === "string" ? val : val?.[valueKey])
      }
      value={selectedOption}
      // onChange={(_, newValue) => {
      //   onChange(newValue ? newValue[valueKey] : "");
      // }}
      onChange={handleOnChange}
      loading={loading}
      filterOptions={(options, { inputValue }) =>
        options.filter((option) =>
          (option[labelKey] || "")
            .toLowerCase()
            .includes(inputValue.toLowerCase())
        )
      }
      noOptionsText="Không có dữ liệu"
      renderInput={(params) => (
        <StyledTextField
          {...params}
          label={label}
          required={required}
          InputLabelProps={{ shrink: true, required: required }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading && <StyledCircularProgress />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
          {...props}
        />
      )}
    />
  );
}

AutocompletepPro.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string, // chỉ là _id
  options: PropTypes.array, // [{ _id, name }]
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  label: PropTypes.string,
  required: PropTypes.bool,
  valueKey: PropTypes.string, // 👈 key nào làm value
  labelKey: PropTypes.string,
  size: PropTypes.string,
};

export default AutocompletepPro;
