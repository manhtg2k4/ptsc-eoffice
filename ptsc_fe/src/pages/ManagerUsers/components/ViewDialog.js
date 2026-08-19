import React from "react";
import { Box, Grid, styled } from "@mui/material";
import { Controller } from "react-hook-form";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import CustomInput from "@components/CustomInput/CustomInput";
import CustomDatePicker from "@components/CustomInput/CustomDatePicker";
import PropTypes from "prop-types";

const FormContainer = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(2),
}));

const HalfWidthGridItem = styled(Grid)({
  width: "100%",
  "@media (min-width: 600px)": {
    width: "50%",
  },
});

const ViewDialog = ({ open, onClose, control, handleSubmit, onSubmit }) => (
  <LocalizationProvider dateAdapter={AdapterDateFns}>
    <CustomDialog
      title="Xem chi tiết dữ liệu"
      open={open}
      onClose={onClose}
      // disableSave={true}
      disableSave
      type="view"
    >
      <FormContainer component="form" onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2}>
          <HalfWidthGridItem item>
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
          </HalfWidthGridItem>
          <HalfWidthGridItem item>
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
          </HalfWidthGridItem>
          <HalfWidthGridItem item>
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
          </HalfWidthGridItem>
          <HalfWidthGridItem item>
            <Controller
              name="issuedDate"
              control={control}
              render={({ field }) => (
                <CustomDatePicker
                  label="Ngày ban hành"
                  value={field.value || ""}
                  // onChange={(formattedDate) => field.onChange(formattedDate)}
                  onChange={field.onChange}
                  disabled
                />
              )}
            />
          </HalfWidthGridItem>
          <HalfWidthGridItem item>
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
          </HalfWidthGridItem>
          <HalfWidthGridItem item>
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
          </HalfWidthGridItem>
        </Grid>
      </FormContainer>
    </CustomDialog>
  </LocalizationProvider>
);
ViewDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  control: PropTypes.object.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default ViewDialog;
