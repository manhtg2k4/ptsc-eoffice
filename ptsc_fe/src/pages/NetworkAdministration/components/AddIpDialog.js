import React, { useEffect } from "react";
import { Box, Grid, Button, IconButton, styled } from "@mui/material";
import { Add, Close as CloseIcon } from "@mui/icons-material";
import { Controller, useFieldArray } from "react-hook-form";
import PropTypes from "prop-types";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import CustomInput from "@components/CustomInput/CustomInput";

const DialogContent = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(1),
}));

const IpRow = styled(Grid)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

const AddButton = styled(Button)(({ theme }) => ({
  textTransform: "none",
  color: theme.palette.primary.main,
  fontWeight: 500,
}));

const RemoveIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.error.main,
}));

const AddIpDialog = ({ open, onClose, onSave, control, errors, isLoading }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "ipAddresses",
  });

  // Khi dialog mở mà chưa có dòng nào -> thêm 1 dòng mặc định
  useEffect(() => {
    if (open && fields.length === 0) {
      append({ value: "" });
    }
  }, [open, fields.length, append]);

  const handleAddIp = () => append({ value: "" });

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
      title="Thêm mới địa chỉ ip mạng để chặn"
      open={open}
      onClose={onClose}
      onSave={onSave}
      type="add"
      size="sm"
      isLoading={isLoading}
    >
      <DialogContent>
        <Grid container spacing={2}>
          {fields.map((item, index) => (
            <IpRow item xs={12} key={item.id}>
              <Controller
                name={`ipAddresses.${index}.value`}
                control={control}
                render={({ field }) => (
                  <CustomInput
                    {...field}
                    placeholder={`Địa chỉ IP mạng ${index + 1}`}
                    error={!!errors.ipAddresses?.[index]?.value}
                    helperText={errors.ipAddresses?.[index]?.value?.message}
                    fullWidth
                  />
                )}
              />
              {fields.length > 1 && (
                <RemoveIconButton onClick={createRemoveIpHandler(index)}>
                  <CloseIcon />
                </RemoveIconButton>
              )}
            </IpRow>
          ))}

          <Grid item xs={12}>
            <AddButton startIcon={<Add />} onClick={handleAddIp}>
              Thêm địa chỉ IP
            </AddButton>
          </Grid>
        </Grid>
      </DialogContent>
    </CustomDialog>
  );
};

AddIpDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  control: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  isLoading: PropTypes.bool,
};

AddIpDialog.defaultProps = {
  isLoading: false,
};

export default AddIpDialog;
