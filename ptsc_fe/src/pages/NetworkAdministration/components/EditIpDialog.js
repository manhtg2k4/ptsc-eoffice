import React from "react";
import { Box, Grid, IconButton, styled } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { Controller, useFieldArray } from "react-hook-form";
import CustomInput from "@components/CustomInput/CustomInput";
import PropTypes from "prop-types";

const DialogForm = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(2),
}));

const RemoveIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.error.main,
  padding: theme.spacing(0.5),
  transform: "translateY(-1px)",
}));
const CloseIconStyled = styled(CloseIcon)(() => ({
  fontSize: "small"
}));


const EditIpDialog = ({
  open,
  onClose,
  onSave,
  control,
  errors,
  isLoading,
}) => {
  const { fields, remove } = useFieldArray({
    control,
    name: "ipAddresses",
  });

  /**
   * Tạo một hàm để xử lý việc xóa một dòng IP.
   * @param {number} index - Chỉ số của dòng cần xóa.
   * @returns {function} - Hàm để gán vào sự kiện onClick.
   */
  const createRemoveIpHandler = (index) => () => {
    remove(index);
  };

  return (
    <CustomDialog
      title="Cập nhật địa chỉ IP để chặn"
      open={open}
      onClose={onClose}
      onSave={onSave}
      type="edit"
      size="md"
      isLoading={isLoading}
    >
      <DialogForm component="form">
        <Grid container spacing={2}>
          {fields.length === 0 && (
            <Grid item xs={12}>
              <CustomInput
                label="Địa chỉ IP"
                placeholder="Nhập địa chỉ IP..."
                error={!!errors.ipAddresses?.[0]?.value}
                helperText={errors.ipAddresses?.[0]?.value?.message}
                required
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
                    placeholder="Nhập địa chỉ IP..."
                    {...field}
                    error={!!errors.ipAddresses?.[index]?.value}
                    helperText={errors.ipAddresses?.[index]?.value?.message}
                    required
                    InputProps={{
                      endAdornment: (
                        <RemoveIconButton size="small" onClick={createRemoveIpHandler(index)}>
                          <CloseIconStyled />
                        </RemoveIconButton>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
          ))}
        </Grid>
      </DialogForm>
    </CustomDialog>
  );
};

EditIpDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  control: PropTypes.object.isRequired,
  errors: PropTypes.object,
  isLoading: PropTypes.bool,
};

EditIpDialog.defaultProps = {
  isLoading: false,
  errors: {},
};

export default EditIpDialog;
