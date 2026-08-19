import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import PropTypes from 'prop-types';

import dayjs from 'dayjs';
// import { useSelector } from 'react-redux';

export function WithController(Component) {
    const ControlledField = ({
        item,
        mode,
        // error,
        helperText,
        options,
        label,
        selectedField,
        ...rest
    }) => {

        // const predefinedFields = useSelector((state) => state.formDesign.dataField);
        // const selectedField = predefinedFields.find(f => f.name === selectedFieldName);
        const selectedFieldName = item?.props?.field;
        // const label = selectedField?.label || item?.props?.label || selectedFieldName;
        // const options = selectedField?.valueInput ?? [];

        const fieldType = selectedField?.type || 'text';
        const form = useFormContext();

        const sanitizedField = {
            ...selectedField,
            margin: selectedField?.margin || "none",      // default hợp lệ
            size: selectedField?.size || "medium",        // default hợp lệ
            textStyle: undefined,                        // MUI không biết prop này, bỏ đi
            spellcheck: undefined,                       // MUI input mặc định có spellCheck
        };

        if (mode === 'builder') {
            return (
                <Component
                    {...sanitizedField}
                    {...rest}
                    label={label}
                    name={selectedFieldName}
                    // error={error}
                    // helperText={helperText}
                    options={options}
                />
            );
        }

        if (mode === 'runtime' && selectedFieldName) {
            // const form = useFormContext();

            if (!form || !form.control) {
                return null;
            }

            const { control } = form;

            return (
                <Controller
                    name={selectedFieldName}
                    control={control}
                    defaultValue={{ type: fieldType, value: '' }} // Thêm defaultValue ở đây
                    render={({ field, fieldState }) => {
                        const { onChange, value = { type: fieldType, value: '' }, ...restField } = field;


                        const handleChange = (val, newValue) => {

                            logger.log('handleChange', newValue)
                            let newVal = '';

                            if (fieldType === 'autocomplete' || fieldType === 'enum' || fieldType === 'nextHandlers') {
                                newVal = newValue ?? '';
                                logger.log("🚀 ~ handleChange ~ newVal:", newVal)
                            } else if (fieldType === 'date') {
                                newVal = val?.$d && dayjs(val.$d).isValid()
                                    ? dayjs(val.$d).format('MM-DD-YYYY')
                                    : null;
                            } else if (fieldType === 'file') {
                                newVal = val;
                            } else {
                                newVal = val?.target?.value ?? val;
                            }

                            logger.log("🚀 ~ handleChange ~ newVal:", newVal)
                            onChange({ type: fieldType, value: newVal });
                        };

                        let displayValue = value?.value ?? '';

                        if (fieldType === 'autocomplete' || fieldType === 'enum') {
                            displayValue = value?.value ?? null;
                        } else if (fieldType === 'date') {
                            displayValue = value?.value && dayjs(value.value).isValid()
                                ? dayjs(value.value)
                                : null;
                        }

                        return (
                            <Component
                                {...sanitizedField}
                                {...rest}
                                {...restField}
                                value={displayValue}
                                onChange={handleChange}
                                error={!!fieldState.error}
                                helperText={fieldState.error?.message || helperText}
                                label={label}
                                options={options}
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
        mode: PropTypes.oneOf(['builder', 'runtime']),
        error: PropTypes.bool,
        helperText: PropTypes.node,
        options: PropTypes.array,
    };

    ControlledField.defaultProps = {
        mode: 'builder',
        error: false,
        helperText: '',
        options: [],
    };

    return ControlledField;
}