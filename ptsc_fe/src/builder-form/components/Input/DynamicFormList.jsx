// import CustomInput from "@components/CustomInput/CustomInput";
// import { Autocomplete } from "@mui/material";
// import PropTypes from "prop-types";
// import React, { useEffect, useMemo, useState } from "react";

// import { callApi } from "../../../services/api";
// import { API_GET_LIST_FUNCTIONMANAGEMANT } from "@EnvironmentFile/constants/urlConfig";
// import { useDispatch, useSelector } from "react-redux";
// import { addCodeMoreForm } from "@redux/slices/FormDesign/formDesignSlice";

// const DynamicFormList = (props) => {
//   const { options = [], error, helperText, label, required, item, onChange, value } = props;

//   const [optionDynamicForm, setOptionDynamicForm] = useState([]);
//   const dispatch = useDispatch();

//   const reduxValue = useSelector((state) => state.formDesign.codeMoreForm);

//   useEffect(() => {
//     const fetchApi = async () => {
//       try {
//         const data = await callApi(
//           "get",
//           `${API_GET_LIST_FUNCTIONMANAGEMANT}?featureType=form`
//         );
//         setOptionDynamicForm(data?.data?.data || []);
//       } catch (error) {
//         logger.log("🚀 ~ fetchApi ~ error:", error);
//       }
//     };
//     fetchApi();
//   }, []);

//   const isMultiple = item?.props?.isMultiple;

//   const finalOptions = useMemo(() => {
//     return (optionDynamicForm || []).map((u) => ({
//       value: u.code,
//       label: u.name,
//     }));
//   }, [optionDynamicForm]);

//   const mergedOptions = useMemo(() => {
//     return [...options, ...finalOptions];
//   }, [options, finalOptions]);

//   let parsedValue = reduxValue;
//   if (isMultiple) {
//     try {
//       parsedValue = Array.isArray(reduxValue)
//         ? reduxValue
//         : reduxValue
//         ? JSON.parse(reduxValue)
//         : [];
//     } catch (e) {
//       parsedValue = [];
//     }
//   }

//   const selectedValue = isMultiple
//     ? mergedOptions.filter((opt) =>
//         parsedValue.some(
//           (val) => opt.value === val || opt.value === val?.value
//         )
//       )
//     : mergedOptions.find(
//         (opt) => opt.value === value || opt.value === value?.value
//       ) || null;

//   return (
//     <Autocomplete
//       {...props}
//       multiple={isMultiple}
//       options={mergedOptions}
//       value={selectedValue}
//       isOptionEqualToValue={(option, val) =>
//         option.value === val?.value || option.value === val
//       }
//       getOptionLabel={(option) =>
//         typeof option === "string" ? option : option.label
//       }
//       onChange={(event, newValue) => {
//         onChange(newValue)
//         dispatch(addCodeMoreForm(newValue));
//       }}
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

// DynamicFormList.propTypes = {
//   isMultiple: PropTypes.bool,
//   options: PropTypes.array,
//   error: PropTypes.bool,
//   helperText: PropTypes.string,
//   label: PropTypes.string,
//   required: PropTypes.bool,
//   item: PropTypes.object,
//   size: PropTypes.string,
// };

// export default DynamicFormList;



import CustomInput from "@components/CustomInput/CustomInput";
import { Autocomplete } from "@mui/material";
import PropTypes from "prop-types";
import React, { useEffect, useMemo, useState } from "react";

import { callApi } from "@services/api";
import { API_BPMN } from "@EnvironmentFile/constants/urlConfig";
import { useDispatch } from "react-redux";
import { addCodeMoreForm } from "@redux/slices/FormDesign/formDesignSlice";

const DynamicFormList = (props) => {
  const { options = [], error, helperText, label, required, item, onChange, value } = props;

  const [optionDynamicForm, setOptionDynamicForm] = useState([]);
  const dispatch = useDispatch();

  // const reduxValue = useSelector((state) => state.formDesign.codeMoreForm);
  const isMultiple = item?.props?.isMultiple;

  // --- fetch API options
  useEffect(() => {
    const fetchApi = async () => {
      try {
        const data = await callApi(
          "get",
          `${API_BPMN}/with-start-form`
        );
        setOptionDynamicForm(data?.data || []);
      } catch (error) {
        logger.log("🚀 ~ fetchApi ~ error:", error);
      }
    };
    fetchApi();
  }, []);

  // --- convert API data -> option format
  const finalOptions = useMemo(() => {
    return (optionDynamicForm || []).map((u) => ({
      value: u.startFormId,
      label: u.name,
    }));
  }, [optionDynamicForm]);

  // --- merge với props.options
  const mergedOptions = useMemo(() => {
    return [...options, ...finalOptions];
  }, [options, finalOptions]);

  // --- parse value (ưu tiên reduxValue nếu có)
  let parsedValue = value;
  if (isMultiple) {
    try {
      parsedValue = Array.isArray(parsedValue)
        ? parsedValue
        : parsedValue
        ? JSON.parse(parsedValue)
        : [];
    } catch (e) {
      parsedValue = [];
    }
  }

  // --- mapping value ra option
  const selectedValue = isMultiple
    ? mergedOptions.filter((opt) =>
        parsedValue?.some((val) => opt.value === val || opt.value === val?.value)
      )
    : mergedOptions.find(
        (opt) => opt.value === parsedValue || opt.value === parsedValue?.value
      ) || null;
  const handleChange = (event, newValue) => {
    if (isMultiple) {
      const values = newValue.map((v) => v.value);
      onChange?.(event, values);
      dispatch(addCodeMoreForm(newValue));
    } else {
      const val = newValue?.value ?? null;
      onChange?.(event, val);
      dispatch(addCodeMoreForm(newValue));
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

DynamicFormList.propTypes = {
  isMultiple: PropTypes.bool,
  options: PropTypes.array,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  label: PropTypes.string,
  required: PropTypes.bool,
  item: PropTypes.object,
  size: PropTypes.string,
  value: PropTypes.any,
  onChange: PropTypes.func,
};

export default DynamicFormList;
