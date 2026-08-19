import React from "react";
import { RequiredLabel, StyledTextField } from "@styles/CustomInput.styles";
import { Box, MenuItem, Typography, styled } from "@mui/material";
import PropTypes from "prop-types";
import { useFormFieldLayout } from "./FormFieldLayoutContext";

const StackedFieldLabel = styled(Typography)({
  fontSize: "14px",
  fontWeight: 600,
  lineHeight: "20px",
  marginBottom: "6px",
});

const CustomTreeView = ({
  value: propValue,
  onChange,
  placeholder,
  label,
  fullWidth = true,
  error,
  helperText,
  required,
  multiline,
  rows,
  select = false, // Thêm prop select
  options = [], // Thêm prop options cho danh sách tùy chọn
  customLabel,
  customValue,
  labelLayout,
  ...props
}) => {
  const { inputLabelLayout } = useFormFieldLayout();
  const resolvedLabelLayout = labelLayout || inputLabelLayout || "floating";
  const isStackedLabel = resolvedLabelLayout === "stacked";
  const validParentIds = new Set(options.map(opt => opt._id));

const filteredOptions = options.filter(option => {
  // Nếu không có parent (mục gốc), giữ lại
  if (!option.parent) return true;

  // Nếu parent tồn tại trong danh sách _id hợp lệ, giữ lại
  return validParentIds.has(option.parent);
});
  return (
    <Box>
      {isStackedLabel && label && (
        <StackedFieldLabel variant="body2">
          {label}
          {required && <RequiredLabel> *</RequiredLabel>}
        </StackedFieldLabel>
      )}
      <StyledTextField
        value={propValue}
        onChange={onChange}
        placeholder={placeholder}
        label={isStackedLabel ? undefined : label}
        fullWidth={fullWidth}
        variant="outlined"
        multiline={multiline}
        rows={multiline ? rows : undefined}
        InputLabelProps={isStackedLabel ? undefined : { shrink: true }}
        error={error}
        helperText={helperText}
        required={isStackedLabel ? false : required}
        select={select}
        {...props}
      >
        {select &&
          filteredOptions.map((option) => (
            <MenuItem key={option.index} value={customValue ? option[customValue] : option.value}>
              {customLabel ? option[customLabel] : option.title}
            </MenuItem>
          ))}
      </StyledTextField>
    </Box>
  );
};

CustomTreeView.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), // Giá trị input
  onChange: PropTypes.func.isRequired, // Hàm xử lý thay đổi
  placeholder: PropTypes.string, // Gợi ý nhập liệu
  label: PropTypes.string, // Nhãn của input
  fullWidth: PropTypes.bool, // Chiều rộng full
  error: PropTypes.bool, // Trạng thái lỗi
  helperText: PropTypes.string, // Nội dung trợ giúp khi có lỗi
  required: PropTypes.bool, // Trường bắt buộc nhập
  multiline: PropTypes.bool, // Cho phép nhiều dòng
  rows: PropTypes.number, // Số hàng nếu là textarea
  select: PropTypes.bool, // Xác định có phải select không
  customLabel: PropTypes.string, // Xác định có phải select không
  customValue: PropTypes.string, // Xác định có phải select không
  labelLayout: PropTypes.oneOf(["floating", "stacked"]),
  options: PropTypes.arrayOf(PropTypes.string), // Danh sách tùy chọn cho select

};

CustomTreeView.defaultProps = {
  value: "",
  placeholder: "",
  label: "",
  fullWidth: true,
  error: false,
  helperText: "",
  required: false,
  multiline: false,
  rows: 3,
  select: false,
  options: [],
};

export default CustomTreeView;
