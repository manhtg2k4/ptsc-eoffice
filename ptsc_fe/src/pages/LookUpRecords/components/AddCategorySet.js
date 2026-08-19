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
// TODO: Cập nhật API endpoint cho việc thêm mới bộ danh mục
// import { API_RECORD_CATEGORY_SET } from "@EnvironmentFile/constants/urlConfig";
import {  API_ADD_DOCUMENT_BOOK } from "@EnvironmentFile/constants/urlConfig";

// Schema validation cho các trường trong dialog
const categorySetSchema = yup.object().shape({
  name: yup.string().required("Vui lòng nhập tên bộ danh mục").min(3, "Tên bộ danh mục phải có ít nhất 3 ký tự"),
  code: yup.string(),
  year: yup.number().typeError("Vui lòng chọn năm danh mục").required("Vui lòng chọn năm danh mục"),
  note: yup.string(),
});

const AddCategorySet = ({
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
    resolver: yupResolver(categorySetSchema),
    defaultValues: {
      name: "",
      code: "",
      year: currentYear,
      note: "",
    },
  });

  const nameValue = useWatch({ control, name: "name" });
  const yearValue = useWatch({ control, name: "year" });

  const yearOptions = Array.from({ length: 6 }, (_, index) => {
    const year = 2025 + index;
    return { value: year, title: year.toString() };
  });

  useEffect(() => {
    if (open) { 
      reset({
        name: "",
        code: "",
        year: currentYear,
        note: "",
      });
    }
  }, [open, reset, currentYear]);

  // useEffect để tự động tạo Mã bộ danh mục
  useEffect(() => {
    if (nameValue && yearValue) {
      const organizationCode = authUser?.organizationCode || "";
      const prefix = "BDMHS"; // Prefix cho Mã bộ danh mục hồ sơ

      // Chuyển đổi tên thành dạng không dấu, không khoảng trắng và viết hoa
      const sanitizedName = nameValue
        .replace(/[Đđ]/g, "D")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "")
        .toUpperCase();

      const generatedCode = `${organizationCode}/${prefix}/${yearValue}/${sanitizedName}`;
      setValue("code", generatedCode, { shouldValidate: true });
    }
  }, [nameValue, yearValue, setValue, authUser]);

  // Xử lý khi nhấn nút Lưu
  const handleSave = handleSubmit(async (data) => {
    const payload = {
      name: data.name,
      code: data.code,
      year: data.year,
      note: data.note,
    };

    try {
      // TODO: Đảm bảo API_RECORD_CATEGORY_SET là endpoint đúng
      await axiosInstance.post(API_ADD_DOCUMENT_BOOK, payload);
      toast("Thêm mới bộ danh mục thành công!", "success");
      onSuccess(); // Gọi callback để component cha có thể đóng dialog và tải lại dữ liệu
    } catch (error) {
      toast(error.response?.data?.message || "Có lỗi xảy ra khi thêm mới", "error");
    }
  });


  return (
    <Dialog
      title="Thêm mới bộ danh mục"
      open={open}
      onClose={onClose}
      onSave={handleSave}
      type="add"
      isLoading={isLoading}
      size="sm"
    >
      <Grid container spacing={2} mt={1}>
        <Grid item xs={12} >
          <Controller name="name" control={control} render={({ field }) => (<InputComponents label="Tên bộ danh mục" {...field} error={!!errors.name} helperText={errors.name?.message} required />)} />
        </Grid>
        <Grid item xs={12} >
          <Controller name="code" control={control} render={({ field }) => (<InputComponents label="Mã bộ danh mục" {...field} error={!!errors.code} helperText={errors.code?.message} disabled />)} />
        </Grid>
           <Grid item xs={12}>
          <Controller
            name="year"
            control={control}
            render={({ field }) => (
              <InputComponents
                select
                label="Năm danh mục"
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
         <Grid item xs={12} >
          <Controller name="note" control={control} render={({ field }) => (<InputComponents label="Ghi chú" {...field} error={!!errors.note} helperText={errors.note?.message} />)} />
        </Grid>
      </Grid>
    </Dialog>
  );
};

AddCategorySet.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  sharedComponents: PropTypes.object.isRequired,
};
export default withSharedComponents(AddCategorySet);