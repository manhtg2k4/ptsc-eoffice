/* eslint-disable react/forbid-component-props */
import React, { useCallback, useEffect, useState } from "react";
import { Box, Grid } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useToast } from "@components/common/ToastProvider";
import { updateExampleFile } from "@services/ExampleFile/exampleFileService";
import { updateFileSchema, UPLOAD_CONSTRAINTS } from "./constants";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import CustomInput from "@components/CustomInput/CustomInput";

const ExampleFileEditDialog = ({ open, onClose, file, onSuccess }) => {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(updateFileSchema),
  });

  useEffect(() => {
    if (open && file) {
      reset({
        // eslint-disable-next-line camelcase
        example_type: file.example_type || "template",
        description: file.description || "",
      });
      setSelectedFile(null);
    }
  }, [open, file, reset]);

  const handleFileChange = useCallback(
    (e) => {
      const picked = e.target.files?.[0];
      if (!picked) {
        setSelectedFile(null);
        return;
      }

      if (picked.size > UPLOAD_CONSTRAINTS.MAX_FILE_SIZE) {
        toast(
          `File quá lớn. Tối đa: ${UPLOAD_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024}MB`,
          "error"
        );
        e.target.value = null;
        return;
      }

      const ext = picked.name.split(".").pop()?.toLowerCase();
      if (!UPLOAD_CONSTRAINTS.ALLOWED_EXTENSIONS.includes(ext)) {
        toast(
          `Định dạng không được phép. Cho phép: ${UPLOAD_CONSTRAINTS.ALLOWED_EXTENSIONS.join(", ")}`,
          "error"
        );
        e.target.value = null;
        return;
      }

      setSelectedFile(picked);
    },
    [toast]
  );
  const onSubmit = useCallback(
    async (data) => {
      try {
        setSubmitting(true);

        if (selectedFile) {
          const formData = new FormData();
          formData.append("file", selectedFile);
          formData.append("example_type", data.example_type || "");
          formData.append("description", data.description || "");
          await updateExampleFile(file.id, formData, true);
        } else {
          await updateExampleFile(file.id, data, false);
        }

        toast("Cập nhật file mẫu thành công", "success");
        onSuccess?.();
      } catch (error) {
        toast(error?.response?.data?.message || "Cập nhật file mẫu thất bại", "error");
      } finally {
        setSubmitting(false);
      }
    },
    [file, selectedFile, toast, onSuccess]
  );

  const handleClose = useCallback(() => {
    if (!submitting) {
      reset();
      setSelectedFile(null);
      onClose();
    }
  }, [submitting, reset, onClose]);

  const handleSubmitClick = useCallback(() => {
    handleSubmit(onSubmit)();
  }, [handleSubmit, onSubmit]);

  const stackedLabelProps = { labelLayout: "stacked" };

  return (
    <CustomDialog
      title={`Chỉnh sửa File Mẫu: ${file?.file_name || ""}`}
      open={open}
      onClose={handleClose}
      onSave={handleSubmitClick}
      type="edit"
      isLoading={submitting}
      size="sm"
    >
      <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ paddingTop: 2 }}>
        <Grid container spacing={2}>
          {/* Thay thế file (tùy chọn) */}
          <Grid item xs={12}>
            <Box position="relative">
              <CustomInput
                {...stackedLabelProps}
                label={<>Thay thế file hiện tại ({file?.file_name || "—"})</>}
                placeholder="Nhấn để chọn file mới (bỏ trống nếu giữ nguyên)..."
                value={selectedFile ? selectedFile.name : ""}
                error={false}
                helperText={`Hỗ trợ: ${UPLOAD_CONSTRAINTS.ALLOWED_EXTENSIONS.join(", ")}`}
                disabled={submitting}
                InputProps={{
                  readOnly: true,
                }}
              />
              <input
                type="file"
                accept={UPLOAD_CONSTRAINTS.ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",")}
                onChange={handleFileChange}
                disabled={submitting}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  opacity: 0,
                  cursor: submitting ? "default" : "pointer",
                }}
              />
            </Box>
          </Grid>

          {/* Example Type */}
          {/* <Grid item xs={12}>
            <Controller
              name="example_type"
              control={control}
              render={({ field }) => (
                <CustomInput
                  {...stackedLabelProps}
                  select
                  options={FILE_TYPES}
                  customLabel="label"
                  customValue="value"
                  label="Loại file"
                  error={!!errors.example_type}
                  helperText={errors.example_type?.message}
                  disabled={submitting}
                  {...field}
                />
              )}
            />
          </Grid> */}

          {/* Description */}
          <Grid item xs={12}>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <CustomInput
                  {...stackedLabelProps}
                  label="Mô tả"
                  multiline
                  rows={3}
                  error={!!errors.description}
                  helperText={errors.description?.message}
                  disabled={submitting}
                  {...field}
                />
              )}
            />
          </Grid>
        </Grid>
      </Box>
    </CustomDialog>
  );
};

export default ExampleFileEditDialog;

