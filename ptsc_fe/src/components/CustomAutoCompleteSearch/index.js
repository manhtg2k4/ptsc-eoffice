/* eslint-disable react-hooks/exhaustive-deps */
import React, { memo, useCallback, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import { StyledAutoComplete } from "@styles/CustomAotoComplete.styles";
import Input from "@components/CustomInput/CustomInputBase";
import { Chip, Tooltip } from "@mui/material";
import { normalizeText } from "@utils/Common/Common";

/**
 * CustomAutoCompleteSearch Component
 *
 * Mô tả:
 * - Component autocomplete lấy options từ crmSource trong Redux theo `code`.
 * - Không gọi API, tìm kiếm bằng regex trên mảng options đã lấy từ Redux.
 * - Hỗ trợ chọn đơn hoặc nhiều giá trị (isMulti).
 * - Có thể trả về object hoặc chỉ giá trị id/code/... tùy vào cấu hình.
 *
 * Props:
 * @param {string} code - Mã code để tìm trong crmSource (ví dụ: "DOUUTIEN").
 * @param {any|any[]} value - Giá trị hiện tại của autocomplete (object hoặc id/code).
 * @param {function} onChange - Hàm callback khi thay đổi giá trị.
 * @param {boolean} [disabled=false] - Disable input.
 * @param {boolean} [error=false] - Hiển thị trạng thái lỗi.
 * @param {string} [helperText] - Text hiển thị dưới input khi lỗi hoặc gợi ý.
 * @param {string} [heplText] - Alias của helperText (tương thích ngược).
 * @param {boolean} [required=false] - Có bắt buộc nhập không.
 * @param {string} [optionLabel="name"] - Tên thuộc tính hiển thị trong option.
 * @param {string} [optionValue="code"] - Tên thuộc tính dùng làm giá trị định danh option.
 * @param {boolean} [isMulti=false] - Cho phép chọn nhiều giá trị.
 * @param {boolean} [returnObject=false] - Nếu true trả về object, nếu false trả về giá trị optionValue.
 * @param {string} [label] - Label hiển thị cho input.
 * @param {number|string} [limitTags] - Giới hạn số tag hiển thị khi isMulti = true.
 * @param {string} [size="small"] - Kích thước input (`small` | `medium`).
 * @param {...object} rest - Các props khác truyền xuống `Autocomplete` gốc của MUI.
 *
 * Ví dụ sử dụng:
 * ```jsx
 *   <CustomAutoCompleteSearch
 *     label="Độ ưu tiên"
 *     code="DOUUTIEN"
 *     optionLabel="name"
 *     optionValue="code"
 *     value={selectedValue}
 *     onChange={(val) => setSelectedValue(val)}
 *   />
 * ```
 */

function CustomAutoCompleteSearch(props) {
  const {
    limitTags,
    code,
    value: propValue,
    label,
    onChange,
    disabled,
    error,
    heplText,
    helperText,
    required,
    optionLabel = "title",
    optionValue = "value",
    isMulti = false,
    returnObject = false,
    size = "small",
    rows = 1,
    isFilter,
    placeholder,
    ...rest
  } = props;

  const [searchText, setSearchText] = useState("");
  const [open, setOpen] = useState(false);

  // Lấy crmSource từ Redux
  const { crmSource } = useSelector((state) => state.config);

  // Lấy danh sách options từ crmSource theo code hoặc từ props.options nếu được truyền vào
  const options = useMemo(() => {
    if (props.options && Array.isArray(props.options)) return props.options;
    if (!code || !Array.isArray(crmSource)) return [];
    const targetCategory = crmSource.find(
      (item) => item?.code && String(item.code).toLowerCase().trim() === String(code).toLowerCase().trim()
    );
    return targetCategory?.data || targetCategory?.items || targetCategory?.values || [];
  }, [crmSource, code, props.options]);

  // Hàm lấy giá trị định danh từ một option
  const getValueFromOption = useCallback((option) => {
    if (!option) return null;
    if (typeof option !== "object") return option;
    if (optionValue && option[optionValue] !== undefined) {
      return option[optionValue];
    }
    return option.value ?? option.code ?? option.id ?? option._id ?? null;
  }, [optionValue]);

  // Hàm lấy label hiển thị từ một option
  const getLabelFromOption = useCallback((option) => {
    if (!option) return "";
    if (typeof option !== "object") return String(option);
    if (optionLabel && option[optionLabel] !== undefined) {
      return String(option[optionLabel]);
    }
    return String(option.title ?? option.name ?? option.label ?? getValueFromOption(option) ?? "");
  }, [optionLabel, getValueFromOption]);

  // Filter bằng regex thay vì gọi API — không phân biệt hoa/thường, có/không dấu
  const filteredOptions = useMemo(() => {
    if (!searchText.trim()) return options;
    const normalizedSearch = normalizeText(searchText.trim());
    try {
      const regex = new RegExp(normalizedSearch, "i");
      return options.filter((opt) =>
        regex.test(normalizeText(getLabelFromOption(opt)))
      );
    } catch {
      // Nếu regex sai cú pháp, fallback về includes
      return options.filter((opt) =>
        normalizeText(getLabelFromOption(opt)).includes(normalizedSearch)
      );
    }
  }, [options, searchText, getLabelFromOption]);

  // Resolve giá trị hiện tại từ propValue sang object (hoặc mảng object) thuộc CHÍNH DANH MỤC (options)
  const resolvedValue = useMemo(() => {
    const isMatching = (val, o) => {
      if (val === null || val === undefined || val === "" || !o) return false;
      const optVal = getValueFromOption(o);
      if (optVal === val) return true;
      if (typeof val === "string" && typeof optVal === "string") {
        if (optVal.toLowerCase().trim() === val.toLowerCase().trim()) return true;
      }
      const optLabel = getLabelFromOption(o);
      if (typeof val === "string" && typeof optLabel === "string") {
        if (optLabel.toLowerCase().trim() === val.toLowerCase().trim()) return true;
      }
      return false;
    };

    if (isMulti) {
      if (!Array.isArray(propValue)) return [];
      return propValue
        .map((val) =>
          val && typeof val === "object"
            ? (options.find((o) => isMatching(getValueFromOption(val), o)) || val)
            : options.find((o) => isMatching(val, o))
        )
        .filter(Boolean);
    }

    const val = Array.isArray(propValue) ? propValue[0] : propValue;
    if (val === null || val === undefined || val === "") return null;
    if (typeof val === "object") {
      const valId = getValueFromOption(val);
      return options.find((o) => isMatching(valId, o)) || val;
    }
    return options.find((o) => isMatching(val, o)) ?? null;
  }, [propValue, options, isMulti, getValueFromOption, getLabelFromOption]);

  const handleOnChange = (event, value) => {
    if (isMulti) {
      const values = value
        ? value.map((option) =>
            returnObject ? option : getValueFromOption(option)
          )
        : [];
      onChange(values);
    } else {
      const singleValue = value
        ? returnObject
          ? value
          : getValueFromOption(value)
        : null;
      onChange(singleValue);
      setOpen(false);
    }
    setSearchText("");
  };

  const handleInputChange = (event, newInputValue, reason) => {
    if (reason === "input") {
      setSearchText(newInputValue);
    } else if (reason === "clear") {
      setSearchText("");
    }
  };

  const handleClose = useCallback(() => {
    setOpen(false);
    setSearchText("");
  }, []);

  const handleOpen = useCallback(() => setOpen(true), []);

  const filterOptions = useCallback((opts) => opts, []);

  const getOptionLabel = useCallback(
    (option) => getLabelFromOption(option),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [optionLabel, optionValue]
  );

  const isOptionEqualToValue = useCallback(
    (o, v) => getValueFromOption(o) === getValueFromOption(v),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [optionValue]
  );

  return (
    <>
      <StyledAutoComplete
        multiple={isMulti}
        value={resolvedValue}
        disabled={disabled}
        filterSelectedOptions
        open={open}
        onOpen={handleOpen}
        onClose={handleClose}
        options={filteredOptions}
        filterOptions={filterOptions}
        size={size}
        noOptionsText="Không tìm thấy kết quả"
        onChange={handleOnChange}
        inputValue={isMulti ? searchText : undefined}
        limitTags={limitTags}
        onInputChange={handleInputChange}
        getOptionLabel={getOptionLabel}
        isOptionEqualToValue={isOptionEqualToValue}
        renderTags={
          isMulti
            ? (value, getTagProps) =>
                value.map((option, index) => {
                  const fullLabel = getLabelFromOption(option);
                  const isLongLabel = fullLabel.length > 12;
                  const displayLabel = isLongLabel
                    ? `${fullLabel.substring(0, 12)}...`
                    : fullLabel;

                  const chip = (
                    <Chip
                      {...getTagProps({ index })}
                      key={getValueFromOption(option) ?? index}
                      label={displayLabel}
                      size="small"
                    />
                  );

                  return isLongLabel ? (
                    <Tooltip
                      key={getValueFromOption(option) ?? index}
                      title={fullLabel}
                      arrow
                    >
                      {chip}
                    </Tooltip>
                  ) : (
                    chip
                  );
                })
            : undefined
        }
        renderInput={(params) => (
          <Input
            {...params}
            label={label}
            placeholder={placeholder}
            required={required}
            multiline={isMulti}
            rows={rows}
            error={error}
            isFilter={isFilter}
            helperText={helperText || heplText}
            InputLabelProps={{ shrink: true }}
            disabled={disabled}
            InputProps={{
              ...params.InputProps,
            }}
            slotProps={{
              input: {
                ...params.InputProps,
                type: "text",
              },
            }}
          />
        )}
        {...rest}
      />
    </>
  );
}

CustomAutoCompleteSearch.propTypes = {
  code: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.object,
    PropTypes.arrayOf(
      PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
        PropTypes.object,
      ])
    ),
  ]),
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  heplText: PropTypes.string,
  helperText: PropTypes.string,
  required: PropTypes.bool,
  label: PropTypes.string,
  optionLabel: PropTypes.string,
  optionValue: PropTypes.string,
  isMulti: PropTypes.bool,
  returnObject: PropTypes.bool,
  limitTags: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  size: PropTypes.oneOf(["small", "medium"]),
};

export default memo(CustomAutoCompleteSearch);
