import React, { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import CustomInput from "@components/CustomInput/CustomInput";
import { Grid } from "@mui/material";
import { FormContainer, FullWidthGridItem } from "@styles/FormDialog.styles";
import PropTypes from "prop-types";

const folderSchema = yup.object().shape({
  documentSymbol: yup
    .string()
    .trim()
    .required("Số và ký hiệu hồ sơ là bắt buộc"),
  documentTitle: yup
    .string()
    .trim()
    .required("Tiêu đề hồ sơ là bắt buộc"),
});

const defaultValues = {
  documentSymbol: "",
  documentTitle: "",
};

function AddFolderDialog({ open, onClose, onSave, isLoading }) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(folderSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      reset(defaultValues);
    }
  }, [open, reset]);

  const handleSaveClick = handleSubmit((data) => {
    onSave(data);
  });

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      title="Thêm danh mục hồ sơ"
      onSave={handleSaveClick}
      size="sm"
      isLoading={isLoading}
    >
      <FormContainer>
        <Grid container spacing={2}>
          <FullWidthGridItem item>
            <Controller
              name="documentSymbol"
              control={control}
              render={({ field }) => (
                <CustomInput
                  label="Số và ký hiệu hồ sơ"
                  placeholder="Nhập số và ký hiệu hồ sơ"
                  {...field}
                  error={!!errors.documentSymbol}
                  helperText={errors.documentSymbol?.message}
                  required
                />
              )}
            />
          </FullWidthGridItem>
          <FullWidthGridItem item>
            <Controller
              name="documentTitle"
              control={control}
              render={({ field }) => (
                <CustomInput
                  label="Tiêu đề hồ sơ"
                  placeholder="Nhập tiêu đề hồ sơ"
                  {...field}
                  error={!!errors.documentTitle}
                  helperText={errors.documentTitle?.message}
                  required
                />
              )}
            />
          </FullWidthGridItem>
        </Grid>
      </FormContainer>
    </CustomDialog>
  );
}

AddFolderDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};

export default AddFolderDialog;
