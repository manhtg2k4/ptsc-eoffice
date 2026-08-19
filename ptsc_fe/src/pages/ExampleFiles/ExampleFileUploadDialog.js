/* eslint-disable react/forbid-component-props */
import React, { useCallback, useState } from "react";
import { Box, Typography, Grid, LinearProgress } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useToast } from "@components/common/ToastProvider";
import { createExampleFile } from "@services/ExampleFile/exampleFileService";
import {
  createFileUploadSchema,
  // FILE_TYPES,
  UPLOAD_CONSTRAINTS,
} from "./constants";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import CustomInput from "@components/CustomInput/CustomInput";
// import { StyledFormLabel } from "@components/common/FormWrapper";

// const errorTextSmStyle = { color: "#f44336", marginTop: 8 };
const progressTextStyle = { marginTop: 8 };

const ExampleFileUploadDialog = ({ open, onClose, onSuccess }) => {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: yupResolver(createFileUploadSchema),
    defaultValues: {
      file: null,
      // eslint-disable-next-line camelcase
      example_key: "",
      // eslint-disable-next-line camelcase
      example_type: "template",
      description: "",
    },
  });

  const handleFileChange = useCallback(
    (file) => {
      setSelectedFile(file);
      setValue("file", file);
    },
    [setValue]
  );

  const handleInputChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > UPLOAD_CONSTRAINTS.MAX_FILE_SIZE) {
        toast(
          `File quá lớn. Tối đa: ${UPLOAD_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024}MB`,
          "error"
        );
        return;
      }

      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!UPLOAD_CONSTRAINTS.ALLOWED_EXTENSIONS.includes(ext)) {
        toast(
          `Định dạng file không được phép. Cho phép: ${UPLOAD_CONSTRAINTS.ALLOWED_EXTENSIONS.join(", ")}`,
          "error"
        );
        return;
      }

      handleFileChange(file);
    },
    [handleFileChange, toast]
  );

  const onSubmit = useCallback(
    async (data) => {
      try {
        setUploading(true);
        const formData = new FormData();
        formData.append("file", data.file);
        formData.append("example_key", data.example_key);
        formData.append("example_type", data.example_type);
        formData.append("description", data.description || "");

        await createExampleFile(formData);

        toast("Upload file mẫu thành công", "success");
        reset();
        setSelectedFile(null);
        setUploadProgress(0);
        onSuccess?.();
      } catch (error) {
        toast(error?.response?.data?.message || "Upload file mẫu thất bại", "error");
      } finally {
        setUploading(false);
      }
    },
    [reset, toast, onSuccess]
  );

  const handleClose = useCallback(() => {
    if (!uploading) {
      reset();
      setSelectedFile(null);
      onClose();
    }
  }, [uploading, reset, onClose]);

  const handleSubmitClick = useCallback(() => {
    handleSubmit(onSubmit)();
  }, [handleSubmit, onSubmit]);

  const stackedLabelProps = {  };

  return (
    <CustomDialog
      title="Tải lên File Mẫu"
      open={open}
      onClose={handleClose}
      onSave={handleSubmitClick}
      type="add"
      isLoading={uploading}
      size="sm"
    >
      <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ paddingTop: 2 }}>
        <Grid container spacing={2}>
          {/* File Input */}
          <Grid item xs={12}>
            <Box position="relative">
              <CustomInput
                {...stackedLabelProps}
                label={<>Chọn file <span style={{ color: "red", marginLeft: "2px" }}>*</span></>}
                placeholder="Nhấn để chọn file..."
                value={selectedFile ? selectedFile.name : ""}
                error={!!errors.file}
                helperText={errors.file?.message}
                disabled={uploading}
                InputProps={{
                  readOnly: true,
                }}
              />
              <input
                type="file"
                accept={UPLOAD_CONSTRAINTS.ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",")}
                onChange={handleInputChange}
                disabled={uploading}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  opacity: 0,
                  cursor: uploading ? "default" : "pointer",
                }}
              />
            </Box>
          </Grid>

          {/* Example Key */}
          <Grid item xs={12}>
            <Controller
              name="example_key"
              control={control}
              render={({ field }) => (
                <CustomInput
                  {...stackedLabelProps}
                  label={<>Key File Mẫu <span style={{ color: "red", marginLeft: "2px" }}>*</span></>}
                  placeholder="e.g., template_invoice"
                  error={!!errors.example_key}
                  helperText={errors.example_key?.message}
                  disabled={uploading}
                  {...field}
                />
              )}
            />
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
                  label={<>Loại file <span style={{ color: "red", marginLeft: "2px" }}>*</span></>}
                  error={!!errors.example_type}
                  helperText={errors.example_type?.message}
                  disabled={uploading}
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
                  label="Mô tả (tùy chọn)"
                  multiline
                  rows={3}
                  error={!!errors.description}
                  helperText={errors.description?.message}
                  disabled={uploading}
                  {...field}
                />
              )}
            />
          </Grid>

          {/* Upload Progress */}
          {uploading && uploadProgress > 0 && (
            <Grid item xs={12}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="body2" sx={progressTextStyle}>
                {uploadProgress}% hoàn thành
              </Typography>
            </Grid>
          )}
        </Grid>
      </Box>
    </CustomDialog>
  );
};

export default ExampleFileUploadDialog;

