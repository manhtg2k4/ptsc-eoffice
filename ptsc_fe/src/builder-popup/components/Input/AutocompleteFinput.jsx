// import CustomInput from "@components/CustomInput/CustomInput";
// import { Autocomplete } from "@mui/material";
// import React from "react";

// const AutocompleteFinput = (props) => {
//   const { value, options = [], error, helperText, label, required, item } = props;
//   logger.log("🚀 ~ AutocompleteFinput ~ value:", value)
//   logger.log("🚀 ~ AutocompleteFinput ~ options:", options)

//   return (
//     <Autocomplete
//       {...props}
//       value={options.find((opt) => opt.value === value || opt.value === value?.value) || null}
//       isOptionEqualToValue={(option, val) => option.value === val?.value || option.value === val}
//       getOptionLabel={(option) =>
//         typeof option === "string" ? option : option.label
//       }
//       renderInput={(params) => (
//         <CustomInput
//           {...params}
//           label={
//             required && label ? (
//               <>
//                 {label} <span style={{ color: "red" }}>(*)</span>
//               </>
//             ) : (
//               label
//             )
//           }
//           InputLabelProps={{ shrink: true }}
//           size={props.size ?? "small"}
//           error={error}
//           helperText={helperText}
//         />
//       )}
//     />
//   );
// };

// export default AutocompleteFinput;

import CustomInput from "@components/CustomInput/CustomInput";
import { Autocomplete } from "@mui/material";
import PropTypes from "prop-types";
import React from "react";

const AutocompleteFinput = (props) => {
  const { value, options = [], error, helperText, label, required, item, onChange } = props;
  const isMultiple = item?.props?.isMultiple;

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
  const selectedValue = isMultiple
    ? options.filter((opt) =>
        parsedValue.some((val) => opt.value === val || opt.value === val?.value)
      )
    : options.find(
        (opt) => opt.value === value || opt.value === value?.value
      ) || null;
  const handleChange = (event, newValue) => {
    if (isMultiple) {
      onChange?.(event, newValue);
    } else {
      onChange?.(event, newValue);
    }
  };


  return (
    <Autocomplete
      {...props}
      multiple={isMultiple}
      options={options}
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

AutocompleteFinput.propTypes = {
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

export default AutocompleteFinput;
