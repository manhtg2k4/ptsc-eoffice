import React from "react";
import { Box, Grid, styled } from "@mui/material";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { Controller, useFieldArray } from "react-hook-form";
import CustomInput from "@components/CustomInput/CustomInput";
import PropTypes from "prop-types";

const StyledBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
}));

const ViewIpDialog = ({ open, onClose, control }) => {
  const { fields } = useFieldArray({
    control,
    name: "ipAddresses",
  });

  return (
    <CustomDialog
      title="Xem chi tiết địa chỉ IP bị chặn"
      open={open}
      onClose={onClose}
      type="view"
      size="md"
      disableSave // ẩn nút Lưu, chỉ hiển thị nút Hủy/Đóng
    >
      <StyledBox component="form">
        <Grid container spacing={2}>
          {fields.length === 0 && (
            <Grid item xs={12}>
              <CustomInput
                label="Địa chỉ IP"
                placeholder="Không có địa chỉ IP nào"
                disabled
              />
            </Grid>
          )}

          {fields.map((item, index) => (
            <Grid item xs={12} key={item.id}>
              <Controller
                name={`ipAddresses.${index}.value`}
                control={control}
                render={({ field }) => (
                  <CustomInput
                    label={`Địa chỉ IP ${index + 1}`}
                    placeholder="Không có dữ liệu"
                    {...field}
                    disabled
                  />
                )}
              />
            </Grid>
          ))}
        </Grid>
      </StyledBox>
    </CustomDialog>
  );
};

ViewIpDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  control: PropTypes.object.isRequired,
};

export default ViewIpDialog;
