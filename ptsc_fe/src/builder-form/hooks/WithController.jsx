import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import PropTypes from "prop-types";

import dayjs from "dayjs";
// import { useSelector } from 'react-redux';

export function WithController(Component) {
  const ControlledField = ({
    item,
    mode,
    helperText,
    options,
    label,
    predefinedFields,
    selectedField,
    ...rest
  }) => {

    const selectedFieldName = item?.props?.field;

    const fieldType = selectedField?.type || "text";

    const form = useFormContext();

    const sanitizedField = {
      ...selectedField,
      margin: selectedField?.margin || "none",
      size: selectedField?.size || "medium",
      textStyle: undefined,
      spellcheck: undefined,
    };

    if (mode === "builder") {
      return (
        <Component
          {...sanitizedField}
          {...rest}
          item={item}
          label={label}
          mode={mode}
          name={selectedFieldName}
          // error={error}
          // helperText={helperText}
          options={options}
        />
      );
    }
    if (mode === "runtime" && selectedFieldName) {

      //  const form = useFormContext();
      if (!form || !form.control) {
        return null;
      }

      const { control, setValue } = form;

      return (
        <Controller
          name={selectedFieldName}
          control={control}
          defaultValue={{ type: fieldType, value: "" }}
          render={({ field, fieldState }) => {
            const {
              onChange,
              value = { type: fieldType, value: "" },
              ...restField
            } = field;

            const handleChange = (val, newValue) => {
              let newVal = "";

              if (fieldType === "autocomplete" || fieldType === "enum" || fieldType === 'dynamicFormList' || fieldType === 'nextHandlers') {
                newVal = newValue ?? "";
              } else if (fieldType === "date") {
                newVal =
                  val?.$d && dayjs(val.$d).isValid()
                    ? dayjs(val.$d).format("MM-DD-YYYY")
                    : null;
              } else if (fieldType === "file") {
                newVal = val;
              } else {
                newVal = val?.target?.value ?? val;
              }
              // Chuẩn hóa giá trị nếu là chuỗi
              if (typeof newVal === 'string') {
                // Xóa khoảng trắng ở đầu và nhiều hơn 1 khoảng trắng ở giữa
                newVal = newVal.replace(/^\s+/, "").replace(/\s{2,}/g, " ");
              }

              // dispatch(setFieldValue({ [selectedFieldName]: newVal }))
              onChange({ type: fieldType, value: newVal });

              // 🔑 Auto-fill nếu chọn autocomplete
              if (
                (fieldType === "autocomplete" || fieldType === "enum") &&
                newValue &&
                item.props?.autoFillFields
              ) {
                item.props.autoFillFields.forEach(fieldToFill => {
                  const targetField = predefinedFields?.find(f => f.name === fieldToFill.name);
                  if (targetField && newValue[fieldToFill.valueKey]) {
                    setValue(fieldToFill.name, {
                      type: targetField.type || 'text',
                      value: newValue[fieldToFill.valueKey]
                    }, { shouldValidate: true });
                  }
                });
              }

            };

            let displayValue = value?.value ?? "";

            if (fieldType === "autocomplete" || fieldType === "enum") {
              displayValue = value?.value ?? null;
            } else if (fieldType === "date") {
              displayValue =
                value?.value && dayjs(value.value).isValid()
                  ? dayjs(value.value)
                  : null;
            }

            const handleBlur = () => {
              // Trim giá trị khi người dùng rời khỏi ô input
              if (typeof value?.value === 'string') {
                const trimmedValue = value.value.trim();
                if (trimmedValue !== value.value) {
                  onChange({ type: fieldType, value: trimmedValue });
                }
              }
            };

            return (
              <Component
                {...sanitizedField}
                {...rest}
                {...restField}
                value={displayValue}
                onChange={handleChange}
                error={!!fieldState.error}
                // onBlur={(e) => {
                //   // Trim giá trị khi người dùng rời khỏi ô input
                //   if (typeof value?.value === 'string') {
                //     const trimmedValue = value.value.trim();
                //     if (trimmedValue !== value.value) {
                //       onChange({ type: fieldType, value: trimmedValue });
                //     }
                //   }
                // }}
                onBlur={handleBlur}
                helperText={fieldState.error?.value?.message || helperText}
                label={label}
                options={options}
                item={item}
                mode={mode} // Vẫn giữ lại mode
                // Không cần truyền các hàm này nữa
                // setValue={setValue}
                // setError={setError}
                // clearErrors={clearErrors}
              />
            );
          }}
        />
      );
    }

    return null;
  };

  ControlledField.propTypes = {
    item: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      props: PropTypes.shape({
        field: PropTypes.string,
        value: PropTypes.any,
        label: PropTypes.string,
      }),
    }).isRequired,
    onPropChange: PropTypes.func,
    mode: PropTypes.oneOf(["builder", "runtime"]),
    error: PropTypes.bool,
    helperText: PropTypes.node,
    options: PropTypes.array,
    label: PropTypes.string,
    selectedField: PropTypes.object,
    predefinedFields: PropTypes.array,
    selectedFieldName: PropTypes.string,
  };

  ControlledField.defaultProps = {
    mode: "builder",
    error: false,
    helperText: "",
    options: [],
  };

  return ControlledField;
}
