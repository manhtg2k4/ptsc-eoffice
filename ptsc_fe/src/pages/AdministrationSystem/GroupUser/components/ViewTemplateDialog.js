import React from "react";
import { Box, FormControl, FormControlLabel, FormLabel, Grid, MenuItem, Radio, RadioGroup, TextField, styled } from "@mui/material";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { Controller } from "react-hook-form";
import CustomInput from "@components/CustomInput/CustomInput";
import PropTypes from "prop-types";

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

const DisabledFormLabel = styled(FormLabel)({
  '&.Mui-disabled': {
    opacity: 1,
    color: 'inherit !important',
  },
});

const DisabledRadio = styled(Radio)({
  '&.Mui-disabled': {
    opacity: 1,
    color: 'inherit !important',
  },
});

const DisabledFormControlLabel = styled(FormControlLabel)({
  '&.Mui-disabled': {
    opacity: 1,
    '& .MuiFormControlLabel-label.Mui-disabled': {
      opacity: 1,
      color: 'inherit !important',
    },
  },
});

const ViewTemplateDialog = ({
  open,
  onClose,
  control,
  // handleSubmit,
  // onSubmit,
}) => {
  return (
    <CustomDialog
      title="Xem chi tiết thông tin"
      open={open}
      onClose={onClose}
      disableSave
      type="view"
      size="md"
    >
      <FormContainer component="form">
        <Grid container spacing={2}>
          <FullWidthGridItem item>
            <Controller
              name="code"
              control={control}
              render={({ field }) => (
                <CustomInput disabled label="Mã chức năng" {...field} />
              )}
            />
          </FullWidthGridItem>
          <FullWidthGridItem item>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <CustomInput disabled label="Tên chức năng" {...field} />
              )}
            />
          </FullWidthGridItem>
          <FullWidthGridItem item>
            <Controller
              name="capCha"
              control={control}
              render={({ field }) =>
                <TextField
                  {...field}
                  disabled
                  select
                  label="Cấp cha"
                  variant="outlined"
                  fullWidth
                >
                  {field.value && (
                    <MenuItem key={field.value} value={field.value}>
                      {field.value}
                    </MenuItem>
                  )}
                </TextField>
              }
            />
          </FullWidthGridItem>
          <HalfWidthGridItem item>
            <Controller
              name="order"
              control={control}
              render={({ field }) => (
                <CustomInput
                  label="Số thứ tự"
                  {...field}
                  disabled
                />
              )}
            />
          </HalfWidthGridItem>
          <HalfWidthGridItem item>
            <FormControl component="fieldset" disabled >
              <DisabledFormLabel component="legend" focused={false}>
                Trạng thái
              </DisabledFormLabel>
              <Controller
                name="statusFeature"
                control={control}
                render={({ field }) => (
                  <RadioGroup {...field} row >
                    <DisabledFormControlLabel value="Hiển thị" control={<DisabledRadio />} label="Hiển thị" />
                    <DisabledFormControlLabel value="Ẩn" control={<DisabledRadio />} label="Ẩn" />
                  </RadioGroup>
                )}
              />
            </FormControl>
          </HalfWidthGridItem>
          <FullWidthGridItem item>
            <Controller
              name="description"
              control={control}
              disabled
              render={({ field }) => (
                <CustomInput disabled label="Mô tả" {...field} rows={5} multiline />
              )}
            />
          </FullWidthGridItem>
        </Grid>
      </FormContainer>
    </CustomDialog>
  );
};

ViewTemplateDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  control: PropTypes.object.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default ViewTemplateDialog;
