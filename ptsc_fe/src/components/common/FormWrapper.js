import React from "react";
import { Chip } from "@mui/material";
import { styled } from "@mui/material/styles";
import dayjs from "dayjs";
import { SkyBox, SkyTypography } from "@styles/SkyStyles";

/**
 * Styled components cho chế độ xem (View Mode)
 */
export const ViewFieldBox = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "rows",
})(({ theme, rows }) => ({
  backgroundColor:
    theme.components?.MuiOutlinedInput?.styleOverrides?.root?.[
      "&.Mui-disabled"
    ]?.backgroundColor ||
    (theme.palette.mode === "dark" ? "rgba(30, 41, 59, 0.5)" : "#F8FAFC"),
  padding: "8px 14px",
  borderRadius: "8px",
  minHeight: rows ? `calc(${rows * 1.4}em + 36px)` : "70px",
  height: rows ? "auto" : "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: rows ? "flex-start" : "center",
  border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#F1F5F9"}`,
  transition: "all 0.2s ease-in-out",
  "&:hover": {
    backgroundColor: theme.palette.mode === "dark" ? "rgba(30, 41, 59, 0.8)" : "#F1F5F9",
  },
}));

export const ViewFieldLabel = styled(SkyTypography)(({ theme }) => ({
  fontSize: "13px !important", // 13px
  color: theme.palette.mode === "dark" ? "#94A3B8" : "#64748B",
  textTransform: "uppercase",
  fontWeight: 600,
  marginBottom: "2px",
  letterSpacing: "0.05em",
}));

export const ViewFieldValue = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "multiline",
})(({ theme, multiline }) => ({
  fontSize: "1rem",
  color: theme.palette.mode === "dark" ? "#F1F5F9" : "#1E293B",
  fontWeight: 700,
  lineHeight: 1.4,
  minHeight: "1.4em",
  ...(multiline && {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    overflow: "visible",
  }),
}));

/**
 * Styled components cho chế độ chỉnh sửa (Edit Mode)
 */
export const StyledForceViewBox = styled(SkyBox)(() => ({
  marginTop: "4px",
  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
  "& .MuiInputBase-root": { backgroundColor: "transparent", padding: "0 8px 0 0" },
  "& .MuiInputBase-input": { padding: 0, fontSize: "1rem", fontWeight: 700, color: "inherit", minHeight: "1.4em", height: "auto" },
  "& .MuiSelect-select": { paddingRight: "24px !important" },
  "& .MuiAutocomplete-inputRoot": { padding: "0 8px 0 0 !important", "& .MuiAutocomplete-endAdornment": { right: 0 } }
}));

export const StyledFormLabel = styled(SkyTypography)(({ theme }) => ({
  fontWeight: '600',
  textTransform: "uppercase",
  color: `${theme.palette.text.primary} !important`,
  marginBottom: theme.spacing(0.5),
  display: "block",
  fontSize: "13px !important",
  letterSpacing: "0.025em",
  ...(theme.palette.mode === "dark" && {
    color: "#fff !important",
  }),
}));

/**
 * Component bọc Item của Form
 */
export const FormItem = ({ label, required, children, isView }) => {
  if (isView || !label) return children;
  return (
    <div style={{ marginBottom: "4px" }}>
      <StyledFormLabel variant="caption">
        {label}{" "}
        {required && <span style={{ color: "red", marginLeft: "2px" }}>*</span>}
      </StyledFormLabel>
      {children}
    </div>
  );
};

/**
 * Higher-Order Component tạo Wrapper cho các loại Input khác nhau
 * @param {React.Component} BaseComponent Component gốc (Input, DatePicker, ...)
 * @param {string} type Loại component ('input', 'date', 'asyncSelect')
 */
export const withFormWrapper = (BaseComponent, type = "input") => {
  const WrappedComponent = (props) => {
    const { 
      isView, 
      forceViewStyle,
      label, 
      value, 
      options, 
      customValue, 
      customLabel, 
      required, 
      placeholder, 
      InputLabelProps,
      ...rest 
    } = props;

    // Xử lý hiển thị ở chế độ VIEW
    if (isView) {
      let displayValue = value;

      if (type === "date") {
        let format = props.format || "DD/MM/YYYY";
        if (props.timeOnly) {
          format = "HH:mm";
        } else if (props.showTime) {
          format = props.format || "DD/MM/YYYY HH:mm";
        }
        
        if (value && typeof value === "object" && (value.startDate || value.endDate)) {
          const start = value.startDate ? dayjs(value.startDate).format(format) : "";
          const end = value.endDate ? dayjs(value.endDate).format(format) : "";
          displayValue = start || end ? `${start} - ${end}` : "";
        } else {
          displayValue = value ? dayjs(value).format(format) : format;
        }
      } else if (type === "select" || (type === "input" && props.select)) {
        if (options && value !== undefined && value !== null) {
          const cv = customValue || "value";
          const option = options.find(opt => 
            (opt[cv] === value) || 
            (opt["id"] === value) || 
            (opt["_id"] === value) ||
            (opt["value"] === value)
          );
          
          if (option) {
            const labelKey = customLabel || (option.label !== undefined ? "label" : (option.title !== undefined ? "title" : (option.name !== undefined ? "name" : "value")));
            displayValue = option[labelKey];
          }
        }
      } else if (type === "asyncSelect") {
        const labelKey = props.optionLabel || props.customLabel || "name";
        const getObjLabel = (v) => (typeof v === "object" && v !== null ? (v[labelKey] || v?.name || v?.title || v?.nameVn || "") : v || "");
        if (Array.isArray(value)) {
          displayValue = value.map(getObjLabel).join(", ");
        } else {
          displayValue = getObjLabel(value);
        }
      }

      const isMultiline = !!(props.multiline || props.rows);

      return (
        <ViewFieldBox rows={props.rows}>
          <ViewFieldLabel>{label}</ViewFieldLabel>
          <ViewFieldValue component="div" noWrap={!isMultiline} multiline={isMultiline}>
            {React.isValidElement(displayValue)
              ? displayValue
              : typeof displayValue === "object" && displayValue !== null
                ? Array.isArray(displayValue)
                  ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                      {displayValue.map((v, i) => (
                        <Chip
                          key={i}
                          label={`${props.enableHashtag ? "#" : ""}${typeof v === "object" && v !== null ? v?.[props.optionLabel || props.customLabel || "name"] || v?.name || v?.title || v?.nameVn || "" : v}`}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </div>
                  )
                  : displayValue?.[props.optionLabel || props.customLabel || "name"] || displayValue?.name || displayValue?.title || displayValue?.nameVn || ""
                : displayValue || ""}
          </ViewFieldValue>
        </ViewFieldBox>
      );
    }

    // Xử lý hiển thị đồng bộ layout VIEW nhưng cho phép EDIT
    if (forceViewStyle) {
      return (
        <ViewFieldBox>
          <ViewFieldLabel>
            {label} {required && <span style={{ color: "red", marginLeft: "2px" }}>*</span>}
          </ViewFieldLabel>
          <StyledForceViewBox>
            <BaseComponent
              {...rest}
              value={value}
              customValue={customValue}
              customLabel={customLabel}
              required={required}
              {...(options !== undefined && { options })}
              label={null} 
              formLabel={label}
              placeholder={placeholder || ""}
              InputLabelProps={InputLabelProps}
            />
          </StyledForceViewBox>
        </ViewFieldBox>
      );
    }

    // Xử lý hiển thị ở chế độ EDIT thông thường
    return (
      <FormItem label={label} required={required} isView={isView}>
        <BaseComponent
          {...rest}
          value={value}
          customValue={customValue}
          customLabel={customLabel}
          required={required}
          {...(options !== undefined && { options })}
          label={null} // Ẩn label bên trong component gốc vì đã có FormItem label
          formLabel={label} // Thêm formLabel để truyền nhãn gốc cho các component cần dùng
          placeholder={placeholder || ""}
          InputLabelProps={InputLabelProps}
          rows={props.rows}
        />
      </FormItem>
    );
  };

  WrappedComponent.displayName = `FormWrapper(${BaseComponent?.displayName || BaseComponent?.name || "Component"})`;
  return WrappedComponent;
};

export default withFormWrapper;