import React from "react";
import { Box, Grid, styled } from "@mui/material";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { Controller } from "react-hook-form";
import CustomInput from "@components/CustomInput/CustomInput";
import PropTypes from "prop-types";
import { method, type } from "@pages/AdministrationSystem/ApiConfigtion/constant";

const FormContainer = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(2),
}));

const FullWidthGridItem = styled(Grid)({
  width: '100%',
});

const HalfWidthGridItem = styled(Grid)(({ theme }) => ({
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    width: '50%',
  },
}));

const EditTemplateDialog = ({
  open,
  onClose,
  onSave,
  control,
  // handleSubmit,
  // onUpdate,
  errors,
  isLoading,
}) => {
  // const revertValue = (value) => {
  //   if (value === "DANH_MUC") return "Danh mục";
  //   if (value === "THU_THAP") return "Thu thập";
  //   if (value === "KHAI_THAC") return "Khai thác";
  // }
  return (
    <CustomDialog
      title="Cập nhật cấu hình"
      open={open}
      onClose={onClose}
      onSave={onSave}
      type="edit"
      size="md"
      isLoading={isLoading}
    >
      <FormContainer component="form">
        <Grid container spacing={2}>
          <FullWidthGridItem item>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <CustomInput
                  label="Tên API"
                  {...field}
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  required
                />
              )}
            />
          </FullWidthGridItem>
          <HalfWidthGridItem item>
            <Controller
              name="code"
              control={control}
              render={({ field }) => (
                <CustomInput
                  label="Mã API"
                  {...field}
                  error={!!errors.code}
                  helperText={errors.code?.message}
                  required
                />
              )}
            />
          </HalfWidthGridItem>
          <HalfWidthGridItem item>
            <Controller
              name="method"
              control={control}
              render={({ field, fieldState }) => (
                <CustomInput
                  {...field}
                  label="Phương thức HTTP"
                  select // Kích hoạt chế độ select
                  options={method} // Truyền danh sách tùy chọn
                  fullWidth
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  required
                />
              )}
            />
          </HalfWidthGridItem>

          <FullWidthGridItem item>
            <Controller
              name="url"
              control={control}
              render={({ field }) => (
                <CustomInput
                  label="URL"
                  {...field}
                  required
                  error={!!errors.url}
                  helperText={errors.url?.message}
                />
              )}
            />
          </FullWidthGridItem>

          <HalfWidthGridItem item>
            <Controller
              name="type"
              control={control}
              render={({ field, fieldState }) => (
                <CustomInput
                  {...field}
                  label="Loại"
                  select // Kích hoạt chế độ select
                  options={type} // Truyền danh sách tùy chọn
                  fullWidth
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  required
                />
              )}
            />
          </HalfWidthGridItem>
          <FullWidthGridItem item>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <CustomInput
                  label="Mô tả"
                  {...field}
                  rows={5}
                  multiline
                  error={!!errors.description}
                  helperText={errors.description?.message}
                />
              )}
            />
          </FullWidthGridItem>
        </Grid>
      </FormContainer>
    </CustomDialog>
  );
};

EditTemplateDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onUpdate: PropTypes.func,
  isLoading: PropTypes.bool,
  control: PropTypes.object.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  errors: PropTypes.object,
};


export default EditTemplateDialog;