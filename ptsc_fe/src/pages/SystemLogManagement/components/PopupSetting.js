import React from "react";
import PropTypes from "prop-types";
import { CustomDialog } from "@components/CustomDialog";
import { FormControlLabel, Grid } from "@mui/material";
import { Controller } from "react-hook-form";
import CustomInput from "@components/CustomInput/CustomInput";
import { FormContainer, FullWidthGridItem } from "@styles/FormList.styles";
import { StyledCheckboxAutoClean, StyledSubTypography } from "@styles/SystemLogManagement.styles";
import { StyledFormLabel } from "@components/common/FormWrapper";

const PopupSetting = ({
  open,
  onClose,
  onSave,
  control,
  handleSubmit,
  onSubmit,
  errors,
	isLoading,
	watch,
}) => {
	const autoCleanValue = watch("autoClean"); 
  return (
    <CustomDialog
      title="Cấu hình lưu trữ nhật ký"
      open={open}
      onClose={onClose}
      onSave={onSave}
      type="add"
      size="sm"
      isLoading={isLoading}
    >
      <FormContainer component="form" onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2}>
          <FullWidthGridItem item>
            <Controller
              name="timeSave"
              control={control}
              render={({ field }) => (
                <>
                  <StyledFormLabel>
                    Thời gian lưu trữ (ngày){" "}
                    {!autoCleanValue && <span style={{ color: "red", marginLeft: "2px" }}>*</span>}
                  </StyledFormLabel>
                  <CustomInput
                    placeholder="Nhập số ngày (1-365)"
                    {...field}
                    inputProps={{ min: 1, max: 365 }}
                    type="number"
                    error={!!errors.timeSave}
                    helperText={errors.timeSave?.message}
                    disabled={autoCleanValue}
                  />
                </>
              )}
            />
            <StyledSubTypography variant="caption">
              Log cũ hơn thời gian này sẽ tự động bị xóa
            </StyledSubTypography>
          </FullWidthGridItem>
          <FullWidthGridItem item>
            <Controller
              name="autoClean"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <StyledCheckboxAutoClean
                      {...field}
                      checked={field.value || false}
                    />
                  }
                  label="Tự động dọn dẹp tất cả log cũ hằng ngày (2:00 AM)"
                />
              )}
            />
          </FullWidthGridItem>
          <FullWidthGridItem item>
            <Controller
              name="updater"
              control={control}
              render={({ field }) => (
                <>
                  <StyledFormLabel>Người cập nhật</StyledFormLabel>
                  <CustomInput
                    {...field}
                    disabled
                  />
                </>
              )}
            />
          </FullWidthGridItem>
        </Grid>
      </FormContainer>
    </CustomDialog>
  );
};

PopupSetting.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  control: PropTypes.object.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  errors: PropTypes.object,
	isLoading: PropTypes.bool,
	watch: PropTypes.func,
};

export default PopupSetting;