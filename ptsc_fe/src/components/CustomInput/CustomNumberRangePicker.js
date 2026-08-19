import React, { useCallback } from "react";
import PropTypes from "prop-types";
import { TextField, styled } from "@mui/material";
import {
  DateRangePickerWrapper,
  SeparatorTypography,
} from "./CustomDateRangePicker.styles";

const StyledNumberField = styled(TextField)(() => ({
  flex: 1,
  "& .MuiOutlinedInput-notchedOutline": { border: "none" }, // Ẩn khung của từng ô con
  "& .MuiInputBase-input": {
    textAlign: "center", // <--- Căn giữa nội dung số
    padding: "8px 0",
    "&::-webkit-inner-spin-button, &::-webkit-outer-spin-button": {
      display: "none", // Ẩn cái mũi tên lên xuống mặc định của input number
    },
  },
  "& .MuiInputLabel-root": {
    backgroundColor: "#fff",
    paddingLeft: "4px",
    paddingRight: "4px",
    zIndex: 1,
  },
}));
const CustomNumberRangePicker = ({
  start,
  end,
  onChange,
  label,
  styledMaxWidth,
}) => {
  const handleStartChange = useCallback(
    (e) => {
      const val = e.target.value;
      onChange?.([val === "" ? null : Number(val), end]);
    },
    [onChange, end]
  );

  const handleEndChange = useCallback(
    (e) => {
      const val = e.target.value;
      onChange?.([start, val === "" ? null : Number(val)]);
    },
    [onChange, start]
  );

  return (
    <DateRangePickerWrapper styledMaxWidth={styledMaxWidth || 454}>
      <StyledNumberField
        type="number"
        size="small"
        value={start ?? ""}
        onChange={handleStartChange}
        label={label}
        placeholder="Từ"
        slotProps={{
          inputLabel: { shrink: true },
        }}
      />
      <SeparatorTypography> - </SeparatorTypography>
      <StyledNumberField
        type="number"
        size="small"
        value={end ?? ""}
        onChange={handleEndChange}
        placeholder="Đến"
        slotProps={{
          inputLabel: { shrink: true },
        }}
      />
    </DateRangePickerWrapper>
  );
};

CustomNumberRangePicker.propTypes = {
  start: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  end: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  label: PropTypes.string,
  styledMaxWidth: PropTypes.number,
};

export default CustomNumberRangePicker;
