import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import PropTypes from 'prop-types';

import dayjs from 'dayjs';
import { useSelector } from 'react-redux';

export function WithController(Component) {
    const ControlledField = ({
        item,
        mode,
        error,
        helperText,
        options,
        ...rest
    }) => {
        const predefinedFields = useSelector((state) => state.formDesign.data);

        const selectedFieldName = item?.props?.field;
        const selectedField = predefinedFields.find(f => f.name === selectedFieldName);
        const label = selectedField?.label || item?.props?.label || selectedFieldName;
        const fieldType = selectedField?.type || 'text';
        const form = useFormContext();

        if (mode === 'builder') {
            return (
                <Component
                    {...selectedField}
                    {...rest}
                    label={label}
                    name={selectedFieldName}
                    error={error}
                    helperText={helperText}
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
                            let newVal = '';

                            if (fieldType === 'autocomplete') {
                                newVal = newValue ?? '';
                            } else if (fieldType === 'date') {
                                newVal = val?.$d && dayjs(val.$d).isValid()
                                    ? dayjs(val.$d).format('YYYY-MM-DD')
                                    : null;
                            } else {
                                newVal = val?.target?.value ?? val;
                            }

                            onChange({ type: fieldType, value: newVal });
                        };

                        let displayValue = value?.value ?? '';

                        if (fieldType === 'autocomplete') {
                            displayValue = value?.value;
                        } else if (fieldType === 'date') {
                            displayValue = value?.value && dayjs(value.value).isValid()
                                ? dayjs(value.value)
                                : null;
                        }

                        return (
                            <Component
                                {...selectedField}
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