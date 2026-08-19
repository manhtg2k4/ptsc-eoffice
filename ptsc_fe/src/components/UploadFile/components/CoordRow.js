import React from "react";
import PropTypes from "prop-types";
import { Grid, Tooltip } from "@mui/material";
import { Controller } from "react-hook-form";
import CustomInput from "@components/CustomInput/CustomInput";
import {
  CoordFontInputWrapper,
  CoordRowContainer,
  CoordRowLabel,
  CoordTypeInputWrapper,
  CoordXInputWrapper,
  CoordYInputWrapper,
  StyledIconButtonGiveNumber,
} from "@styles/UploadFile/UploadFile.style";
import { RemoveRedEye } from "@mui/icons-material";

const CoordRow = ({
  control,
  prefix,
  label,
  options,
  handlePreviewGiveNumber,
}) => (
  <Grid item xs={12}>
    <CoordRowContainer>
      {/* Nhãn */}
      <CoordRowLabel>{label}</CoordRowLabel>

      {/* Loại văn bản */}
      <CoordTypeInputWrapper>
        <Controller
          name={`${prefix}.type`}
          control={control}
          render={({ field }) => (
            <CustomInput
              select
              options={options}
              {...field}
              size="small"
              placeholder="Công văn giấy"
            />
          )}
        />
      </CoordTypeInputWrapper>

      {/* X */}
      <CoordXInputWrapper>
        <Controller
          name={`${prefix}.x`}
          control={control}
          render={({ field }) => (
            <CustomInput {...field} size="small" label="X" />
          )}
        />
      </CoordXInputWrapper>

      {/* Y */}
      <CoordYInputWrapper>
        <Controller
          name={`${prefix}.y`}
          control={control}
          render={({ field }) => (
            <CustomInput {...field} size="small" label="Y" />
          )}
        />
      </CoordYInputWrapper>

      {/* Font */}
      <CoordFontInputWrapper>
        <Controller
          name={`${prefix}.fontSize`}
          control={control}
          render={({ field }) => (
            <CustomInput {...field} size="small" label="Font" />
          )}
        />
      </CoordFontInputWrapper>

      {/* Nút chọn điểm */}
      <StyledIconButtonGiveNumber onClick={handlePreviewGiveNumber}>
        <Tooltip title="Xem trước file">
          <RemoveRedEye onClick={handlePreviewGiveNumber} />
        </Tooltip>
      </StyledIconButtonGiveNumber>
    </CoordRowContainer>
  </Grid>
);

CoordRow.propTypes = {
  control: PropTypes.object,
  prefix: PropTypes.string,
  label: PropTypes.string,
  options: PropTypes.array,
  handlePreviewGiveNumber: PropTypes.func,
};

export default CoordRow;
