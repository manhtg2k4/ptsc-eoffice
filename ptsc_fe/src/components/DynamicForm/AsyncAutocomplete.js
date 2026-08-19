import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";

import { callApi } from "../../services/api";
import {
    LabelTypography,
    StyledAutocomplete, StyledCircularProgress, StyledRequiredAsterisk, StyledTextField
} from "@styles/AsyncAutocomplete.styles";
/**
 * Props:
 * - `field`: The field object from Formik.
 * - `apiUrl`: The URL to fetch the options from.
 * - `label`: The label for the field.
 * - `required`: Whether the field is required.
 * - `placeholder`: The placeholder text to display in the input.
 * - `getOptionLabel`: A function that takes an option and returns the label
 *   to display in the input.
 * - `isOptionEqualToValue`: A function that takes an option and a value and
 *   returns whether the two are equal.
 * - `noOptionsText`: The text to display when there are no options.
 * - `size`: The size of the input field.
 * - `transformResponse`: A function that takes the response from the API and
 *   returns the list of options.
 * - `error`: An error object to display with the input.
 * - `helperText`: The helper text to display with the input.
 * - `optionSearch`: The name of the query parameter to use when searching for
 *   options.
 * - `isMulti`: Whether the field is a multi-select.
 */

// Component trung gian để đổi tên prop, tránh lỗi ESLint
const AutocompleteWrapper = ({ fieldSize, ...rest }) => {
    // eslint-disable-next-line react/forbid-component-props
    return <StyledAutocomplete size={fieldSize} {...rest} />;
};

AutocompleteWrapper.propTypes = {
    fieldSize: PropTypes.oneOf(["small", "medium"]),
    // Thêm các prop khác nếu cần
};

const AsyncAutocomplete = ({
    field,
    apiUrl,
    label,
    required = false,
    placeholder = "Nhập để tìm kiếm...",
    getOptionLabel = (option) => option?.name || "",
    isOptionEqualToValue = (option, value) => option?._id === value?._id,
    noOptionsText = "Không có dữ liệu",
    size = "medium",
    transformResponse = (json) => json,
    error,
    helperText,
    optionSearch = "name",
    isMulti = false,
    ...rest
}) => {
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [inputValue, setInputValue] = useState("");

    useEffect(() => {
        // Only fetch options when the input is open and the user has typed something.
        if (!open) return;
        let active = true;

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                // Construct the URL to fetch the options from.
                const url = new URL(apiUrl);
                if (inputValue) {
                    url.searchParams.append(optionSearch, inputValue);
                }
                // const response = await fetch(url);
                const response = await callApi('get',url);

                logger.log(response.data,'response.data')
                const json = response.data;
                if (active) {
                    // Transform the response into a list of options.
                    const fetchedOptions = transformResponse(json);
                logger.log(fetchedOptions,'fetchedOptions')

                    setOptions(Array.isArray(fetchedOptions) ? fetchedOptions : []);
                }
            } catch (e) {
                logger.error("Không thể tải options:", e);
                if (active) setOptions([]);
            } finally {
                if (active) setLoading(false);
            }
        }, 500);

        // Clean up the timer when the component is unmounted.
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [inputValue, open, apiUrl, optionSearch, transformResponse]);


    const handleOpen = useCallback(() => {
        setOpen(true);
    }, []);

    const handleClose = useCallback(() => {
        setOpen(false);
    }, []);

    const handleInputChange = useCallback((_, newInputValue) => {
        setInputValue(newInputValue);
    }, []);

    const handleOnChange = useCallback(
        (_, newValue) => {
            field.onChange(newValue);
        },
        [field]
    );

    // Calculate the font size based on the size prop.
    // const fontSize = size === "small" ? "13px" : "16px";

    // If the field is a multi-select, add the current value to the list of options.
    const allOptions = [...options];
    if (isMulti) {
        if (Array.isArray(field.value)) {
            field.value.forEach((val) => {
                if (!options.some((opt) => isOptionEqualToValue(opt, val))) {
                    allOptions.push(val);
                }
            });
        }
    } else {
        if (field.value && !options.some((opt) => isOptionEqualToValue(opt, field.value))) {
            allOptions.push(field.value);
        }
    }

    return (
        <AutocompleteWrapper
            {...field}
            multiple={isMulti}
            open={open}
            // onOpen={() => setOpen(true)}
            // onClose={() => setOpen(false)}
            onOpen={handleOpen}
            onClose={handleClose}
            options={allOptions}
            loading={loading}
            size={size}
            // onInputChange={(_, newInputValue) => {
            //     setInputValue(newInputValue);
            // }}
            onInputChange={handleInputChange}
            getOptionLabel={getOptionLabel}
            isOptionEqualToValue={isOptionEqualToValue}
            value={field?.value || (isMulti ? [] : null)}
            // onChange={(_, newValue) => field.onChange(newValue)}
            onChange={handleOnChange}
            noOptionsText={noOptionsText}
            filterOptions={(x) => x}
            fieldSize={size} // Truyền prop với tên mới
            componentsProps={{ // Giữ lại componentsProps
                popper: {
                    modifiers: [
                        {
                            name: "offset",
                            options: {
                                offset: [0, 4],
                            },
                        },
                    ],
                },
            }}
            renderInput={(params) => (
                <StyledTextField
                    {...params}
                    label={
                        label ? (
                            <LabelTypography component="span">
                                {label}
                                {required && (
                                    <StyledRequiredAsterisk>{" (*)"}</StyledRequiredAsterisk>
                                )}
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
                                {loading ? <StyledCircularProgress /> : null}
                                {params.InputProps.endAdornment}
                            </>
                        ), // Dấu ngoặc này bị sai vị trí
                    }}
                    {...rest}
                />
            )}
        />
    );
};

AsyncAutocomplete.propTypes = {
    field: PropTypes.shape({
        value: PropTypes.any,
        onChange: PropTypes.func.isRequired,
    }).isRequired,
    apiUrl: PropTypes.string.isRequired,
    label: PropTypes.string,
    required: PropTypes.bool,
    placeholder: PropTypes.string,
    getOptionLabel: PropTypes.func,
    isOptionEqualToValue: PropTypes.func,
    noOptionsText: PropTypes.string,
    size: PropTypes.oneOf(["small", "medium"]),
    transformResponse: PropTypes.func,
    error: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
    helperText: PropTypes.string,
    optionSearch: PropTypes.string,
    isMulti: PropTypes.bool,
};

export default AsyncAutocomplete;
