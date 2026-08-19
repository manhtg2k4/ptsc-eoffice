import React, { useState, useCallback, useEffect } from "react";
import { Grid, styled, Box, Chip } from "@mui/material";
import { Clear as ClearIcon } from "@mui/icons-material";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";
import axiosInstance from "@utils/axiosInstance"; // Đã có
import { API_AUTHORIZED_USER, API_DELEGATION_MANAGEMENT } from "@EnvironmentFile/constants/urlConfig";
import { apiUploadFile } from "@services/FileUpload/fileUpload";
import { useForm, Controller } from "react-hook-form";

const FormGridContainer = styled(Grid)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));

const ChipContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  gap: theme.spacing(1),
  marginTop: theme.spacing(1),
}));

const validationSchema = yup.object().shape({
  user: yup.string().required("Người được ủy quyền không được để trống"),
  startDate: yup.date().required("Ngày bắt đầu không được để trống"),
  endDate: yup
    .date()
    .required("Ngày kết thúc không được để trống")
    .min(yup.ref("startDate"), "Ngày kết thúc phải sau ngày bắt đầu"),
});

const AuthorizationManagements = ({
  open,
  onClose,
  onSuccess,
  sharedComponents,
  ...props
}) => {
  const { DiaLogStyle, Button, DateTimePicker, InputComponents, toast } =
    sharedComponents;
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      user: null,
      startDate: dayjs(),
      endDate: dayjs().add(2, "day"),
    },
  });
  const [files, setFiles] = useState([]);
  const [authorizedUserOptions, setAuthorizedUserOptions] = useState([]);
   const startDateValue = watch("startDate");

  useEffect(() => {
    const fetchAuthorizedUsers = async () => {
      try {
        const response = await axiosInstance.get(API_AUTHORIZED_USER);
        if (response && Array.isArray(response)) {
          setAuthorizedUserOptions(response);
        }
      } catch (error) {
        toast("Lỗi khi tải danh sách người được ủy quyền!", "error");
      }
    };

    if (open) {
      fetchAuthorizedUsers();
      reset({
        startDate: dayjs(),
        endDate: dayjs().add(2, "day"),
        user: null,
      });
      setFiles([]);
    }
  }, [open, toast, reset]);

  // Cho phép chọn nhiều tệp
  const handleFileChange = useCallback((event) => {
    const newFiles = Array.from(event.target.files);
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  // Xóa một tệp khỏi danh sách
  const handleRemoveFile = useCallback((fileToRemove) => {
    setFiles((prev) => prev.filter((file) => file !== fileToRemove));
  }, []);

  const createOnDeleteHandler = useCallback((file) => () => {
    handleRemoveFile(file);
  }, [handleRemoveFile]);

  // Tạo một hàm callback để xử lý việc thay đổi ngày tháng
  // Giúp tránh tạo hàm mới mỗi lần render, tối ưu hiệu suất
  const handleDateChange = useCallback((onChange) => {
    return (date) => {
      onChange(date);
    };
  }, []);
  const handleSave = handleSubmit(async (data) => {
    // Bước 1: Tạo bản ghi ủy quyền (chưa có file)
    const initialPayload = {
      authorized: data.user,
      startDate: data.startDate.toISOString(),
      endDate: data.endDate.toISOString(),
    };

    try {
      const createResponse = await axiosInstance.post(
        API_DELEGATION_MANAGEMENT,
        initialPayload
      );
      const newAuthorizationId = createResponse?._id || createResponse?.id;

      if (!newAuthorizationId) {
        throw new Error("Không nhận được ID của bản ghi ủy quyền sau khi tạo.");
      }

      if (files.length === 0) {
        toast("Thêm mới ủy quyền thành công!", "success");
        onSuccess?.();
        onClose();
        reset();
        return;
      }

      const uploadedFileIds = [];
      for (const file of files) {
        try {
          const uploadResponse = await apiUploadFile(
            file,
            "delegation",
            newAuthorizationId
          );
          const uploadedId = uploadResponse?.data?._id || uploadResponse?._id || uploadResponse?.id;
          if (uploadedId) {
            uploadedFileIds.push(uploadedId);
          }
        } catch (uploadError) {
          toast(`Tải lên tệp ${file.name} thất bại.`, "warning");
          // Vẫn tiếp tục tải các file khác
        }
      }

      if (uploadedFileIds.length > 0) {
        const updatePayload = {
          ...initialPayload,
          files: uploadedFileIds,
        };
        await axiosInstance.put(
          `${API_DELEGATION_MANAGEMENT}/${newAuthorizationId}`,
          updatePayload
        );
      }

      toast("Thêm mới ủy quyền và tải tệp đính kèm thành công!", "success");
      onSuccess?.();
      onClose();
      reset();
    } catch (error) {
      toast(
        error?.response?.data?.message || "Thêm mới ủy quyền thất bại!",
        "error"
      );
    }
  }, () => {
    // Callback này sẽ được gọi nếu validation thất bại
    toast("Vui lòng điền đầy đủ các trường bắt buộc.", "warning");
  });

  return (
    <DiaLogStyle
      open={open}
      onClose={onClose}
      title="THÊM MỚI ỦY QUYỀN"
      onSave={handleSave}
      fullWidth // Đã có
      // dialogHeight="620px"
      {...props}
    >
      <FormGridContainer container spacing={2}>
        {/* Ngày bắt đầu */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <DateTimePicker
                label="Ngày bắt đầu"
                value={field.value}
                onChange={handleDateChange(field.onChange)}
                showTime={true}                 // BẬT CHỌN GIỜ
                required
                error={!!errors.startDate}
                helperText={errors.startDate?.message}
              />
            )}
          />
        </Grid>

        {/* Ngày kết thúc */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="endDate"
            control={control}
            render={({ field }) => (
              <DateTimePicker
                label="Ngày kết thúc"
                value={field.value}
                onChange={handleDateChange(field.onChange)}
                showTime={true}
                minDate={startDateValue}
                required
                error={!!errors.endDate}
                helperText={errors.endDate?.message}
              />
            )}
          />
        </Grid>

        {/* Người được ủy quyền */}
<Grid item xs={12}>
  <Controller
    name="user"
    control={control}
    render={({ field }) => (
      <InputComponents
        select
        options={authorizedUserOptions}
        getOptionLabel={(option) => option.name || "Không tên"}
        customLabel="name"
        customValue="_id"
        label="Người được ủy quyền"
        placeholder="Chọn người được uỷ quyền..."
        required
        {...field}
        error={!!errors.user} // Sử dụng errors từ react-hook-form
        helperText={errors.user?.message}
      />
    )}
  />
</Grid>

        {/* Upload File */}
        <Grid item xs={12}>
          <Button variant="contained" component="label">
            TỆP ĐÍNH KÈM
            <input
              type="file"
              hidden
              multiple // Thêm thuộc tính multiple
              onChange={handleFileChange}
            />
          </Button>

          {files.length > 0 && (
            <ChipContainer>
              {files.map((file, index) => (
                <Chip
                  key={index}
                  label={file.name}
                  onDelete={createOnDeleteHandler(file)}
                  deleteIcon={<ClearIcon />}
                />
              ))}
            </ChipContainer>
          )}
        </Grid>
      </FormGridContainer>
    </DiaLogStyle>
  );
};

export default withSharedComponents(AuthorizationManagements);
       
