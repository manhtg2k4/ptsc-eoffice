import React, { useEffect, useMemo, useState, useRef } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import { IconButton, Autocomplete } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import {
  StyledTextField,
  ClearableInputAdornment,
  StyledMenuItems,
  StyledChipTab,
  StyledTextFieldTab,
	ClearButtonWrapper,
} from "@styles/CustomInput.styles";
import { convertDatetime2Date } from "@utils/Common/Common";
import useDebounce from "@hooks/useDebounce";

const HASHTAG_REGEX = /#([^\s,#]+)/g;

function extractHashtags(str = "") {
  const matches = str.match(HASHTAG_REGEX) || [];
  return matches.map((m) => m.slice(1)).filter(Boolean);
}

function removeHashtags(str = "") {
  // Xóa các token hashtag khỏi text, giữ khoảng trắng hợp lý
  return str
    .replace(HASHTAG_REGEX, "")
    .replace(/[,\n]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trimStart();
}

const CustomInputTag = (props) => {
  const {
    size = "small",
    variant = "outlined",
    value,
    label,
    type,
    select,
    onChange,
    formatType,
    options = [],
    disabled,
    rows,
    minRows,
    maxRows,
    required,
    helperText,
    placeholder,
    multiline,
    error,
    multiple,
    noBorderRadius = false,
    optionLabel,
    optionValue,
    enableHashtag = false,

    // NEW (optional): nếu muốn control phần text như controlled component
    textValue,

    name,
    ...restProps
  } = props;

  const [internalValue, setInternalValue] = useState(value || "");
  const [tags, setTags] = useState(Array.isArray(value) ? value : []);
  const [text, setText] = useState(
    typeof textValue === "string" ? textValue : ""
  );
  const inputRootRef = useRef(null);

  const debouncedChange = useDebounce((val) => {
    onChange && onChange({ target: { name, value: val } });
  }, 500);

  useEffect(() => {
    if (enableHashtag) {
      setTags(Array.isArray(value) ? value : []);
      if (typeof textValue === "string") setText(textValue);
    } else {
      setInternalValue(value ?? "");
    }
  }, [value, enableHashtag, textValue]);

  const curParsePrice = (str) => {
    if (!str) return 0;
    return parseFloat(
      typeof str === "number" ? str : String(str).replace(/,/g, "")
    );
  };

  const datetime2Date = (val) => {
    if (type === "date") {
      return val && Number(val).toString().length > 3
        ? convertDatetime2Date(val)
        : val;
    }
    if (type === "number" && formatType === "Money") {
      return curParsePrice(val).toLocaleString("en-IE");
    }
    return val;
  };

  // =========================
  // HASHTAG MODE (SOCIAL-LIKE)
  // =========================
  const mergedTags = useMemo(() => Array.from(new Set(tags)), [tags]);

  const emitHashtagChange = (nextTags, nextText) => {
    onChange &&
      onChange({
        target: {
          name,
          value: nextTags,
          text: nextText,
        },
      });
  };

  const commitFromInputIfNeeded = (rawInput) => {
    // Khi gặp delimiter (space/comma/enter/newline) thì chốt hashtag
    const shouldCommit =
      rawInput.endsWith(" ") ||
      rawInput.endsWith(",") ||
      rawInput.endsWith("\n");

    if (!shouldCommit) return { committed: false, nextText: rawInput };

    const found = extractHashtags(rawInput);
    if (!found.length) return { committed: false, nextText: rawInput };

    const nextTags = Array.from(new Set([...mergedTags, ...found]));
    const nextText = removeHashtags(rawInput);

    setTags(nextTags);
    setText(nextText);
    emitHashtagChange(nextTags, nextText);

    return { committed: true, nextText };
  };

  const handleDeleteTag = (tagToDelete) => {
    const nextTags = mergedTags.filter((t) => t !== tagToDelete);
    setTags(nextTags);
    emitHashtagChange(nextTags, text);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (enableHashtag) {
      setTags([]);
      setText("");
      emitHashtagChange([], "");
    } else {
      onChange && onChange({ target: { name, value: "" } });
      setInternalValue("");
    }
  };

  // Externalized handlers to avoid inline functions inside JSX
  const handleAutocompleteInputChange = (event, newInputValue) => {
    const nextRaw = newInputValue ?? "";
    setText(nextRaw);

    const { committed, nextText } = commitFromInputIfNeeded(nextRaw);

    if (!committed) {
      emitHashtagChange(mergedTags, nextText);
    }

    // Auto scroll to right when typing
    setTimeout(() => {
      if (inputRootRef.current) {
        const inputRoot = inputRootRef.current.querySelector(
          ".MuiAutocomplete-inputRoot"
        );
        if (inputRoot) {
          inputRoot.scrollLeft = inputRoot.scrollWidth;
        }
      }
    }, 0);
  };

  const handleAutocompleteChange = (event, newValue) => {
    const nextTags = Array.from(new Set((newValue || []).map(String)));
    setTags(nextTags);
    emitHashtagChange(nextTags, text);
  };

  const getChipDeleteHandler = (option) => () => handleDeleteTag(option);

  const renderAutocompleteTags = (tagValue, getTagProps) =>
    tagValue.map((option, index) => (
      <StyledChipTab
        {...getTagProps({ index })}
        key={`${option}-${index}`}
        label={`#${option}`}
        size="small"
        variant="outlined"
        onDelete={getChipDeleteHandler(option)}
      />
    ));

  const renderAutocompleteInput = (params) => (
    <StyledTextFieldTab
      {...params}
      size={size}
      label={label}
      variant={variant}
      placeholder={
        mergedTags.length === 0 && !text
          ? "Nhập #tag rồi space/comma để tạo..."
          : ""
      }
      InputLabelProps={{ shrink: true }}
      required={required}
      error={error}
      helperText={helperText}
      noBorderRadius={noBorderRadius}
      autocompleteTagStyle
      multiline={false}
      {...restProps}
    />
  );

  // =========================
  // NORMAL MODE (GIỮ LẠI LOGIC CŨ, SỬA LỖI)
  // =========================
  const handleChangeNormal = (e) => {
    const val = e.target.value;

    if (!onChange) return;

    switch (type) {
      case "number": {
        setInternalValue(val);
        if (formatType === "Money") {
          // Debounce gửi số “thô” (không format), UI hiển thị format
          debouncedChange(curParsePrice(val));
        } else {
          debouncedChange(val);
        }
        break;
      }
      case "date": {
        const [y, m, d] = String(val).split("-");
        const year =
          Number(y).toString().length > 3 &&
          (Number(y) > 3000 || Number(y) < 1900)
            ? dayjs().year()
            : y;
        const next = `${year}-${m}-${d}`;
        setInternalValue(next);
        debouncedChange(next);
        break;
      }
      default: {
        const inputType = e?.nativeEvent?.inputType || null;
        const raw = val ?? "";
        let next = raw;

        if (raw && !Number(raw) && typeof raw !== "object") {
          next = raw.replace(/^\s+|\s+$/g, " ");
          next =
            inputType === "insertLineBreak"
              ? `${next.trimStart()}\n`
              : next.trimStart();
        }

        setInternalValue(next);
        debouncedChange(next);
        break;
      }
    }
  };

  // =========================
  // RENDER
  // =========================
  if (enableHashtag) {
    return (
      <div
        ref={inputRootRef}
        style={{
          position: "relative",
          width: "100%",
        }}
      >
        <Autocomplete
          multiple
          freeSolo
          disableClearable
          disabled={disabled}
          options={[]}
          value={mergedTags}
          inputValue={text}
          onInputChange={handleAutocompleteInputChange}
          onChange={handleAutocompleteChange}
          renderTags={renderAutocompleteTags}
          renderInput={renderAutocompleteInput}
          limitTags={4}
        />
        {!disabled && (mergedTags.length > 0 || text) && (
          // <ClearContentTag>
          //   <IconButton
          //     size="small"
          //     onClick={handleClear}
          //     edge="end"
          //   >
          //     <CloseIcon />
          //   </IconButton>
          // </ClearContentTag>
          <ClearButtonWrapper>
            <IconButton onClick={handleClear} size="small">
              <CloseIcon />
            </IconButton>
          </ClearButtonWrapper>
        )}
      </div>
    );
  }

  // NORMAL MODE (select / input thường)
  return (
    <StyledTextField
      size={size}
      value={datetime2Date(internalValue)}
      onChange={handleChangeNormal}
      placeholder={placeholder}
      label={label}
      variant={variant}
      multiline={multiline}
      rows={multiline && !minRows ? rows : undefined}
      minRows={multiline && minRows ? minRows : undefined}
      maxRows={multiline ? maxRows : undefined}
      InputLabelProps={{ shrink: true }}
      required={required}
      error={error}
      helperText={helperText}
      select={select}
      disabled={disabled}
      noBorderRadius={noBorderRadius}
      InputProps={{
        endAdornment: (
          <>
            {select && !multiple && !disabled && (
              <ClearableInputAdornment>
                <IconButton size="small" onClick={handleClear} edge="end">
                  ✖
                </IconButton>
              </ClearableInputAdornment>
            )}
          </>
        ),
      }}
      {...restProps}
    >
      {select &&
        Array.isArray(options) &&
        options.length > 0 &&
        options.map((option, index) => (
          <StyledMenuItems
            key={
              option?._id || option?.id || option?.value || option?.key || index
            }
            value={
              option?.[optionValue] ||
              option?.value ||
              option?.code ||
              option?.id ||
              option?._id
            }
          >
            {option?.[optionLabel] ||
              option.label ||
              option.title ||
              option.name}
          </StyledMenuItems>
        ))}

      {select && (!Array.isArray(options) || options.length === 0) && (
        <StyledMenuItems disabled>Không có dữ liệu</StyledMenuItems>
      )}
    </StyledTextField>
  );
};

CustomInputTag.propTypes = {
  size: PropTypes.oneOf(["small", "medium"]),
  variant: PropTypes.oneOf(["outlined", "filled", "standard"]),
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.array,
  ]),
  label: PropTypes.string,
  type: PropTypes.oneOf(["text", "number", "date", "email", "password", "tel"]),
  select: PropTypes.bool,
  onChange: PropTypes.func,
  formatType: PropTypes.oneOf(["Money"]),
  options: PropTypes.arrayOf(PropTypes.object),
  disabled: PropTypes.bool,
  rows: PropTypes.number,
  minRows: PropTypes.number,
  maxRows: PropTypes.number,
  required: PropTypes.bool,
  helperText: PropTypes.string,
  placeholder: PropTypes.string,
  multiline: PropTypes.bool,
  error: PropTypes.bool,
  multiple: PropTypes.bool,
  name: PropTypes.string,
  enableHashtag: PropTypes.bool,
  noBorderRadius: PropTypes.bool,

  // NEW optional
  textValue: PropTypes.string,
};

export default CustomInputTag;
