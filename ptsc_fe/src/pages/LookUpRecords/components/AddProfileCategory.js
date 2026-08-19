import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { Grid } from "@mui/material";
import { Controller, useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import PropTypes from "prop-types";
import withSharedComponents from "@components/WrapperComponent";
import { useToast } from "@components/common/ToastProvider";
import axiosInstance from "@utils/axiosInstance";
import { API_ADD_DOCUMENT_BOOK } from "@EnvironmentFile/constants/urlConfig";

// Schema validation
const profileCategorySchema = yup.object().shape({
  title: yup.string().required("Vui lòng nhập tiêu đề").min(3, "Tiêu đề phải có ít nhất 3 ký tự"),
  code: yup.string(),
  year: yup.number().typeError("Vui lòng chọn năm áp dụng").required("Vui lòng chọn năm áp dụng"),
  responsibleUnit: yup.string().required("Vui lòng nhập đơn vị chịu trách nhiệm chính"),
  usageType: yup.string().required("Vui lòng nhập loại hình sử dụng"),
  usageMode: yup.string().required("Vui lòng nhập chế độ sử dụng"),
  preservationPeriod: yup.string().required("Vui lòng nhập thời hạn bảo quản"),
  language: yup.string().required("Vui lòng nhập ngôn ngữ"),
});

const AddProfileCategory = ({
  open,
  onClose,
  onSuccess,
  isLoading,
  sharedComponents,
}) => {
  const toast = useToast();
  const { Dialog, InputComponents } = sharedComponents;
  const currentYear = new Date().getFullYear();
  const { dataUser: authUser } = useSelector((state) => state.auth || {});

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(profileCategorySchema),
    defaultValues: {
      title: "",
      code: "",
      year: currentYear,
      responsibleUnit: "",
      usageMode: "",
      usageType: "",
      preservationPeriod: "",
      language: "",
    },
  });

  const titleValue = useWatch({ control, name: "title" });
  const yearValue = useWatch({ control, name: "year" });

  // Danh sách năm (2025 trở đi)
  const yearOptions = Array.from({ length: 10 }, (_, i) => {
    const year = 2025 + i;
    return { value: year, title: year.toString() };
  });

  // Lấy tên đơn vị từ localStorage
  useEffect(() => {
    if (open) {
      const organizationName = authUser?.organizationName || "";
      reset({
        title: "",
        code: "",
        year: currentYear,
        responsibleUnit: organizationName,
        usageMode: "",
        usageType: "",
        preservationPeriod: "",
        language: "",
      });
    }
  }, [open, reset, currentYear, authUser]);

  // Tự động sinh mã bộ danh mục
  useEffect(() => {
    if (titleValue && yearValue) {
      const organizationCode = authUser?.organizationCode || "";

      const prefix = "DMHS"; // Danh mục Hồ Sơ

      const sanitizedTitle = titleValue
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase()
        .replace(/\s/g, ""); // Loại bỏ khoảng trắng sau khi trim

      // Cấu trúc mã: ORGANIZATION_CODE/DMHS/YEAR/SANITIZED_TITLE
      const generatedCode = `${organizationCode}/${prefix}/${yearValue}/${sanitizedTitle}`;
      setValue("code", generatedCode, { shouldValidate: true });
    }
  }, [titleValue, yearValue, setValue, authUser]);

  const handleSave = handleSubmit(async (data) => {
    const payload = {
      title: data.title,
      code: data.code,
      year: data.year,
      "usage_type": data.usageType, // Đổi tên trường payload
      "responsible_unit": data.responsibleUnit, // Đổi tên trường payload
      "usage_mode": data.usageMode,
      "preservation_period": data.preservationPeriod,
      language: data.language,
      // Các trường khác nếu cần thêm sau
    };

    try {
      // TODO: Đảm bảo API_ADD_DOCUMENT_BOOK là endpoint đúng cho việc thêm mới danh mục hồ sơ
      await axiosInstance.post(API_ADD_DOCUMENT_BOOK, payload); 
      toast("Thêm mới danh mục hồ sơ thành công!", "success");
      onSuccess();
    } catch (error) {
      toast(error.response?.data?.message || "Thêm mới thất bại!", "error");
    }
  });

  return (
    <Dialog
      title="Thêm mới danh mục hồ sơ"
      open={open}
      onClose={onClose}
      onSave={handleSave}
      type="add"
      isLoading={isLoading}
      size="md" // Tăng size lên md để đủ chỗ cho 2 cột
      saveButtonText="Lưu"
      cancelButtonText="Hủy"
    >
      <Grid container spacing={2} mt={1}>
        {/* Hàng 1 */}
        <Grid item xs={12} md={6}>
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <InputComponents
                label="Tiêu đề"

                {...field}
                error={!!errors.title}
                helperText={errors.title?.message}
                required
              />
            )}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Controller
            name="code"
            control={control}
            render={({ field }) => (
              <InputComponents
                label="Số & ký hiệu"
                {...field}
                error={!!errors.code}
                helperText={errors.code?.message}
                disabled
              />
            )}
          />
        </Grid>

        {/* Hàng 2 */}
        <Grid item xs={12} md={6}>
          <Controller
            name="year"
            control={control}
            render={({ field }) => (
              <InputComponents
                select
                label="Năm áp dụng"
                options={yearOptions}
                customLabel="title"
                customValue="value"
                {...field}
                error={!!errors.year}
                helperText={errors.year?.message}
                required
              />
            )}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Controller
            name="responsibleUnit"
            control={control}
            render={({ field }) => (
              <InputComponents
                label="Đơn vị chịu trách nhiệm chính"
                {...field}
                error={!!errors.responsibleUnit}
                helperText={errors.responsibleUnit?.message}
                required
              />
            )}
          />
        </Grid>
            <Grid item xs={12} md={6}>
          <Controller
            name="usageType"
            control={control}
            render={({ field }) => (
              <InputComponents
                label="Loại hình sử dụng"
                {...field}
                error={!!errors.usageType}
                helperText={errors.usageType?.message}
                required
              />
            )}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Controller
            name="preservationPeriod"
            control={control}
            render={({ field }) => (
              <InputComponents
                label="Thời hạn bảo quản"
                {...field}
                error={!!errors.preservationPeriod}
                helperText={errors.preservationPeriod?.message}
                required
              />
            )}
          />
        </Grid>

        {/* Hàng 3 */}
        <Grid item xs={12} md={6}>
          <Controller
            name="usageMode"
            control={control}
            render={({ field }) => (
              <InputComponents
                label="Chế độ sử dụng"

                {...field}
                error={!!errors.usageMode}
                helperText={errors.usageMode?.message}
                required
              />
            )}
          />
        </Grid>

        {/* Hàng 4 */}
        <Grid item xs={12} md={6}>
          <Controller
            name="language"
            control={control}
            render={({ field }) => (
              <InputComponents
                label="Ngôn ngữ"

                {...field}
                error={!!errors.language}
                helperText={errors.language?.message}
                required
              />
            )}
          />
        </Grid>
      </Grid>
    </Dialog>
  );
};

AddProfileCategory.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  sharedComponents: PropTypes.object.isRequired,
};

export default withSharedComponents(AddProfileCategory);