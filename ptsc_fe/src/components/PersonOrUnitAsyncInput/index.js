import React, { memo, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { styled } from "@mui/material";
import AsyncAutocompletes from "../CustomAsyncAutoCompleted";
import { SkyBox } from "@styles/SkyStyles";

/* ================= STYLE ================= */

const StyledToggleButton = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "disabled",
})(({ theme, disabled }) => {
  const isDark = theme.palette.mode === "dark";
  return {
    width: "92px",
    height: "36px",
    borderRadius: "48px",
    background: isDark
      ? "linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)"
      : "linear-gradient(180deg, rgba(234, 234, 234, 0.95) 0%, rgba(221, 221, 221, 0.8) 100%)",
    border: isDark
      ? "1px solid rgba(255, 255, 255, 0.25)"
      : "1px solid rgba(255, 255, 255, 1)",
    boxShadow: isDark
      ? `
        0 4px 12px rgba(0, 0, 0, 0.3),
        0 1px 3px rgba(0, 0, 0, 0.2),
        inset 0 2px 4px rgba(255, 255, 255, 0.3),
        inset 0 -2px 4px rgba(0, 0, 0, 0.2)
      `
      : `
        0 4px 10px rgba(0, 0, 0, 0.05),
        0 1px 3px rgba(0, 0, 0, 0.03),
        inset 0 3px 5px rgba(255, 255, 255, 1),
        inset 0 -3px 5px rgba(0, 0, 0, 0.02)
      `,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "bold",
    color: isDark ? "#cbd5e1" : "#5e6d82",
    cursor: "pointer",
    userSelect: "none",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    boxSizing: "border-box",
    textAlign: "center",
    ...(disabled ? {
      opacity: 0.5,
      pointerEvents: "none",
      cursor: "not-allowed",
    } : {
      "&:hover": {
        background: "linear-gradient(135deg, rgba(29, 78, 216, 0.9) 0%, rgba(59, 130, 246, 0.9) 100%)",
        borderColor: "rgba(255, 255, 255, 1)",
        color: "#ffffff",
        boxShadow: `
          0 4px 14px rgba(59, 130, 246, 0.5),
          inset 0 3px 5px rgba(255, 255, 255, 0.4),
          inset 0 -3px 5px rgba(0, 0, 0, 0.1)
        `,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        transform: "translateY(-1px)",
      },
      "&:active": {
        transform: "translateY(0px)",
      }
    }),
  };
});

/* ================= COMPONENT ================= */

function PersonOrUnitAsyncInput({
  value,
  onChange,
  label,                  // Label hiển thị phía trên (ví dụ: "Người chủ trì")
  personUrl,
  unitUrl,
  optionLabel = "name",
  optionValue = "_id",
  isMulti = false,
  limitTags = 2,
  error = false,
  helperText,
  required = false,
  disabled = false,
  onTypeChange,
  defaultType = "person",
  disabledInput = false,
  personOptions = [],
  unitOptions = [],
  optionSubLabel = false,
  personQueryParams = ["name"],   // Query params khi type = "person"
  unitQueryParams = ["name"],    // Query params khi type = "unit"
  ...rest
}) {
  const [type, setType] = useState(defaultType);

  React.useEffect(() => {
    // Chỉ clear value khi defaultType thay đổi từ bên ngoài (instance khác)
    // Không clear khi chính instance này thay đổi (vì đã clear trong handleToggle)
    if (defaultType !== type) {
      setType(defaultType);
      onChange(isMulti ? [] : null);
    }
  }, [defaultType, type, isMulti, onChange]);

  const handleToggle = useCallback(() => {
    if (disabled) return;
    const newType = type === "person" ? "unit" : "person";
    setType(newType);
    onChange(isMulti ? [] : null); // reset giá trị khi đổi loại
    if (onTypeChange) onTypeChange(newType);
  }, [disabled, type, isMulti, onChange, onTypeChange]);

  const toggleButton = (
    <StyledToggleButton
      disabled={disabled}
      onClick={handleToggle}
    >
      {type === "person" ? "Cá nhân" : "Phòng ban"}
    </StyledToggleButton>
  );

  return (
    <AsyncAutocompletes
      key={type}
      {...rest}
      value={value}
      onChange={onChange}
      label={label}
      placeholder="Tìm kiếm"
      url={type === "person" ? personUrl : unitUrl}
      options={type === "person" ? personOptions : unitOptions}
      optionLabel={optionLabel}
      optionValue={optionValue}
      optionSubLabel={optionSubLabel}
      isMulti={isMulti}
      limitTags={limitTags}
      error={error}
      helperText={helperText}
      required={required}
      fullWidth
      disabled={disabledInput}
      endAdornment={toggleButton}
      hideDropdownIcon
      returnObject
      queryParams={type === "person" ? personQueryParams : unitQueryParams}
    />
  );
}

PersonOrUnitAsyncInput.propTypes = {
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
  personUrl: PropTypes.string,
  unitUrl: PropTypes.string,
  personOptions: PropTypes.array,
  unitOptions: PropTypes.array,
  optionLabel: PropTypes.string,
  optionValue: PropTypes.string,
  optionSubLabel: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  isMulti: PropTypes.bool,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  required: PropTypes.bool,
  personQueryParams: PropTypes.arrayOf(PropTypes.string),
  unitQueryParams: PropTypes.arrayOf(PropTypes.string),
};

export default memo(PersonOrUnitAsyncInput);
