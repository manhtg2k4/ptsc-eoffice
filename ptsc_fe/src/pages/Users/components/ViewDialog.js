import React, { useCallback } from "react";
import { Box, Grid } from "@mui/material";
import { Controller } from "react-hook-form";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import CustomInput from "@components/CustomInput/CustomInput";
import CustomDatePicker from "@components/CustomInput/CustomDatePicker";
import PropTypes from "prop-types";

const ViewDialog = ({ open, onClose, control, handleSubmit, onSubmit }) => {
  const handleIssuedDateChange = useCallback(
    (field) => (formattedDate) => {
      field.onChange(formattedDate);
    },
    []
  );
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <CustomDialog
        title="Xem chi tiết dữ liệu"
        open={open}
        onClose={onClose}
        disableSave
        type="view"
      >
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="code"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    label="Mã loại văn bản"
                    placeholder="Nhập dữ liệu..."
                    {...field}
                    disabled
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    label="Tên loại văn bản"
                    placeholder="Nhập dữ liệu..."
                    {...field}
                    disabled
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="decisionType"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    label="QĐ ban hành / QĐ sửa đổi"
                    placeholder="Nhập dữ liệu..."
                    {...field}
                    disabled
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="issuedDate"
                control={control}
                render={({ field }) => (
                  <CustomDatePicker
                    label="Ngày ban hành"
                    value={field.value || ""}
                    onChange={handleIssuedDateChange(field)}
                    disabled
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="issuingAgency"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    label="Cơ quan ban hành"
                    placeholder="Nhập dữ liệu..."
                    {...field}
                    disabled
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="abbreviation"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    label="Chữ viết tắt"
                    placeholder="Nhập dữ liệu..."
                    {...field}
                    disabled
                  />
                )}
              />
            </Grid>
          </Grid>
        </Box>
      </CustomDialog>
    </LocalizationProvider>
  );
};
ViewDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  control: PropTypes.object.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default ViewDialog;
