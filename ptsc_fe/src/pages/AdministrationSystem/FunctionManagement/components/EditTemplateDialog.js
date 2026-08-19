import React from "react";
import { Box, FormControl, FormControlLabel, FormLabel, Grid, Radio, RadioGroup, styled } from "@mui/material";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { Controller } from "react-hook-form";
import CustomInput from "@components/CustomInput/CustomInput";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";

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
  // dataSelect
}) => {

  const { categories } = useSelector((state) => state.functionManagement)

  return (
    <CustomDialog
      title="Cập nhật chức năng"
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
              name="code"
              control={control}
              render={({ field }) => (
                <CustomInput
                  label="Mã chức năng"
                  {...field}
                  error={!!errors.code}
                  helperText={errors.code?.message}
                  required
                />
              )}
            />
          </FullWidthGridItem>
          <FullWidthGridItem item>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <CustomInput
                  label="Tên chức năng"
                  {...field}
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  required
                />
              )}
            />
          </FullWidthGridItem>
          {/* <Grid item xs={12} sm={12}>
            <Controller
              name="parentId"
              control={control}
              render={({ field, fieldState }) => (
                <CustomInput
                  {...field}
                  select
                  label="Cấp cha"
                  variant="outlined"
                  fullWidth
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  customValue={"parentId"}
                  customLabel={"name"}
                  options={categories}
                >
                 
                  
                </CustomInput>


              )}
            />
          </Grid> */}

          <FullWidthGridItem item>
            <Controller
              name="parentId"
              control={control}
              render={({ field }) => (
                <CustomInput
                  {...field}
                  
                  label="Cấp cha"
                  select // Kích hoạt chế độ select
                  options={categories} // Truyền danh sách tùy chọn
                  fullWidth
                  customLabel={"name"}
                  customValue={"_id"}
                />
              )}
            />
          </FullWidthGridItem>
          <FullWidthGridItem item>
            <Controller
              name="url"
              control={control}
              render={({ field }) => (
                <CustomInput
                  label="URL"
                  {...field}
                  error={!!errors.url}
                  helperText={errors.url?.message}
                />
              )}
            />
          </FullWidthGridItem>
          {/* <Grid item xs={12} sm={6}>
            <Controller
              name="order"
              control={control}
              render={({ field }) => (
                <CustomInput
                  label="Số thứ tự"
                  {...field}
                  value={field.value}
                  error={!!errors.order}
                  helperText={errors.order?.message}
                />
              )}
            />
          </Grid> */}
          <HalfWidthGridItem item>
            <FormControl component="fieldset" required error={!!errors.statusFeature}>
              <FormLabel component="legend" focused={false}>
                Trạng thái
              </FormLabel>
              <Controller
                name="statusFeature"
                control={control}
                render={({ field }) => (
                  <RadioGroup {...field} row>
                    <FormControlLabel value="1" control={<Radio />} label="Hiển thị" />
                    <FormControlLabel value="0" control={<Radio />} label="Ẩn" />
                  </RadioGroup>
                )}
              />
            </FormControl>
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
  dataSelect: []
};


export default EditTemplateDialog;