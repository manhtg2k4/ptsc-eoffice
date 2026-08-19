import React, { useCallback } from "react";
import { StyledAutoComplete } from "@styles/CustomAotoComplete.styles";
import PropTypes from "prop-types";
import { StyledTextField } from "@styles/CustomInput.styles";

const CustomAutocomplete = ({
  label,
  options = [],
  value,
  handleChange,
  field,
  multiple = true,
}) => {
  const mappedOptions = Array.isArray(options)
    ? options
    : Object.values(options); // Chuyển đổi nếu options là object

  // Xử lý giá trị `value` để đảm bảo nó tồn tại trong `options`
  const formattedValue = multiple
    ? mappedOptions.filter((option) => value?.includes(option))
    : mappedOptions.find((option) => option === value) || null;

  const handleOnChange = useCallback((event, newValue) => {
    handleChange(field, newValue);
  }, [handleChange, field]);

  return (
    <StyledAutoComplete
      multiple={multiple}
      options={mappedOptions}
      value={formattedValue} // Truyền giá trị đã xử lý vào đây
      // onChange={(event, newValue) => handleChange(field, newValue)}
      onChange={handleOnChange}
      filterSelectedOptions
      filterOptions={(options, state) =>
        options.filter((option) =>
          option.toLowerCase().includes(state.inputValue.toLowerCase())
        )
      }
      renderInput={(params) => (
        <StyledTextField {...params} label={label} variant="outlined" />
      )}
    />
  );
};

CustomAutocomplete.propTypes = {
  label: PropTypes.string.isRequired, // Label là chuỗi, bắt buộc
  options: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.string), // Mảng các string
    PropTypes.object, // Hoặc object (nếu là key-value object)
  ]),
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string), // Nếu multiple=true thì value là mảng
  ]),
  handleChange: PropTypes.func.isRequired, // Hàm bắt buộc
  field: PropTypes.string.isRequired, // Field là chuỗi, bắt buộc
  multiple: PropTypes.bool, // Boolean
};

CustomAutocomplete.defaultProps = {
  options: [],
  multiple: true,
};

export default CustomAutocomplete;
