import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Grid, CircularProgress, FormControlLabel, Checkbox } from "@mui/material";
import { Controller, useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import PropTypes from "prop-types";
import withSharedComponents from "@components/WrapperComponent";
import { useToast } from "@components/common/ToastProvider";
import axiosInstance from "@utils/axiosInstance";
import { API_ADD_DOCUMENT_BOOK, API_USER_VT } from "@EnvironmentFile/constants/urlConfig";
import CustomAsyncAutoComplete from "@components/CustomAsyncAutoComplete";

const schema = yup.object().shape({
  bookCode: yup.string(),
  bookName: yup.string().required("Vui lòng nhập tên sổ").min(3, "Tên sổ phải có ít nhất 3 ký tự"),
  count: yup.number().typeError("Số bắt đầu phải là số").min(0, "Số bắt đầu phải lớn hơn hoặc bằng 0"),
  order: yup.number().typeError("Thứ tự phải là số").min(0, "Thứ tự  bắt đầu phải lớn hơn hoặc bằng 0"),
  unitName: yup.string().required("Vui lòng nhập tên đơn vị"),
  year: yup.number().typeError("Vui lòng chọn năm").required("Vui lòng chọn năm"),
  status: yup.string().required("Vui lòng chọn trạng thái hoạt động"),
  isCertifiedCopies: yup.boolean(),
});

const EditDocumentBookOut = ({ open, bookDocumentId, onClose, onSuccess, isLoading = false, sharedComponents }) => {
  const { Dialog, InputComponents } = sharedComponents;
  const { crmSource = [] } = useSelector((state) => state.config || {});
  const { dataUser: authUser } = useSelector((state) => state.auth || {});
  const toast = useToast();

  // const [, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const { control, handleSubmit, reset ,setValue, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      bookCode: "", bookName: "", count: 1, order: 1, unitName: "",
      year: new Date().getFullYear(),  documentField: [], bookManager: [], status: "active", isDefault: false, isCertifiedCopies: false
    },
  });
     const bookNameValue = useWatch({ control, name: "bookName" });
     const yearValue = useWatch({ control, name: "year" });
  

  // Options cố định
  const yearOptions = Array.from({ length: 10 }, (_, i) => ({ value: 2020 + i, title: `${2020 + i}` }));
  const fieldOpts = (crmSource.find(x => x?.code === "S26")?.data || []).filter(Boolean);
  // const levelOpts  = (crmSource.find(x => x?.code === "S21")?.data || []).filter(Boolean);

  useEffect(() => {
    if (!open || !bookDocumentId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [detailRes] = await Promise.all([
          axiosInstance.get(`${API_ADD_DOCUMENT_BOOK}/${bookDocumentId}`)
        ]);
        

        const d = detailRes?.data || detailRes;


        // Tìm user hiện tại (dù có bị khóa hay không)
        const managerBookData = d.manager_book || d.managerBook || [];
        const documentFieldData = d.document_field || d.documentField || [];
        // const currentUser = userList.find(u => u._id === currentManagerId);

        reset({
          bookName: d.name || "",
          year: d.year || new Date().getFullYear(),
          unitName: d.sender_unit || d.senderUnit || "",
          bookCode: d.to_book_code || d.toBookCode || "",
          // Map lại mảng object thành mảng các giá trị primitive (string)
          documentField: Array.isArray(documentFieldData) ? documentFieldData.map(df => df.value) : [],
          bookManager: managerBookData, // dùng object trực tiếp để PersonOrUnitAsyncInput hiển thị
          order: d.order ?? 1,
          status: (d.active === true || d.active === 1 || d.active === "Hoạt động") ? "active" : "inactive",
          count: d.start_number || d.count || 1, 
          isDefault: d.is_default || d.isDefault || false,
          isCertifiedCopies: d.is_certified_copies || d.isCertifiedCopies || false,
        });

      } catch (err) {
        logger.error(err);
        toast("Lỗi tải dữ liệu!", "error");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, bookDocumentId, crmSource, reset, toast]);
  useEffect(() => {
    // Chỉ tạo mã khi người dùng đã nhập tên sổ và có năm
    if (bookNameValue && yearValue) {
      const prefix = "SOVBDI";
      const organizationCode = authUser?.organizationCode || "";

      // Chuyển đổi tên sổ thành dạng không dấu, không khoảng trắng và viết hoa
      const sanitizedBookName = bookNameValue
        .replace(/[Đđ]/g, "D")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "")
        .toUpperCase();

      const generatedCode = `${organizationCode}/${prefix}/${yearValue}/${sanitizedBookName}`;
      setValue("bookCode", generatedCode, { shouldValidate: true });
    }
  }, [bookNameValue, yearValue, setValue, authUser]);


  const onSave = handleSubmit(async (data) => {
    const payload = {    
      name: data.bookName,
      year: data.year,
      "type_document": "OutGoingDocument",
      "sender_unit": data.unitName,
      "to_book_code": data.bookCode,
      "document_field": data.documentField,
      "order": String(data.order),
      "manager_book": Array.isArray(data.bookManager) ? data.bookManager.map(m => m.id || m._id || m) : data.bookManager,
      count: data.count,
      active: data.status === "active",
      isDefault: data.isDefault,
      isCertifiedCopies: data.isCertifiedCopies,
    };

    // Kiểm tra xem năm này đã có sổ Sao y chưa (loại trừ sổ hiện tại)
    if (data.isCertifiedCopies) {
      try {
        const response = await axiosInstance.get(API_ADD_DOCUMENT_BOOK, {
          params: {
            year: data.year,
            "type_document": "OutGoingDocument",
          }
        });
        const allBooks = response?.data?.data || response?.data || [];
        if (Array.isArray(allBooks)) {
          const duplicate = allBooks.find(book => 
            (book.isCertifiedCopies || book.is_certified_copies) && 
            String(book.id || book._id) !== String(bookDocumentId)
          );
          if (duplicate) {
            toast(`Năm ${data.year} đã có sổ Sao y cho loại văn bản này. Vui lòng kiểm tra lại!`, "error");
            return;
          }
        }
      } catch (error) {
        logger.error("Lỗi kiểm tra sổ sao y:", error);
      }
    }

    try {
      await axiosInstance.patch(`${API_ADD_DOCUMENT_BOOK}/${bookDocumentId}`, payload);
      toast("Cập nhật thành công!", "success");
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast(err.response?.data?.message || "Cập nhật thất bại!", "error");
    }
  });

  if (loading) {
    return (
      <Dialog title="Chỉnh sửa Sổ văn bản đi" open={open} onClose={onClose} size="sm">
        <div style={{ padding: "40px", textAlign: "center" }}>
          <CircularProgress />
          <div style={{ marginTop: 16 }}>Đang tải dữ liệu...</div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      title="Chỉnh sửa sổ văn bản đi"
      open={open}
      onClose={onClose}
      onSave={onSave}
      type="edit"
      isLoading={isLoading}
      size="sm"
      cancelButtonText="Đóng"
    >
      <Grid container spacing={2} mt={1}>
        <Grid item xs={12}><Controller name="unitName" control={control} render={({ field }) => <InputComponents label="Tên đơn vị" {...field} error={!!errors.unitName} helperText={errors.unitName?.message}  disabled />} /></Grid>
        <Grid item xs={12}><Controller name="year" control={control} render={({ field }) => <InputComponents select label="Năm" options={yearOptions} customLabel="title" customValue="value" {...field} error={!!errors.year} helperText={errors.year?.message} required/>} /></Grid>
        <Grid item xs={12}><Controller name="documentField" control={control} render={({ field }) => <InputComponents select label="Lĩnh vực" options={fieldOpts} customLabel="title" customValue="value" multiple {...field} error={!!errors.documentField} helperText={errors.documentField?.message}  />} /></Grid>
        <Grid item xs={12}><Controller name="bookName" control={control} render={({ field }) => <InputComponents label="Tên sổ" {...field} error={!!errors.bookName} helperText={errors.bookName?.message} required />} /></Grid>
        <Grid item xs={12}><Controller name="bookCode" control={control} render={({ field }) => <InputComponents label="Mã sổ" {...field} error={!!errors.bookCode} helperText={errors.bookCode?.message} disabled />} /></Grid>
        <Grid item xs={12}><Controller name="count" control={control} render={({ field }) => <InputComponents label="Số bắt đầu" type="number" {...field} error={!!errors.count} helperText={errors.count?.message} />} /></Grid>
           <Grid item xs={12}>
             <Controller
               name="bookManager"
               control={control}
               render={({ field }) => (
                 <CustomAsyncAutoComplete
                   label="Văn thư quản lý sổ"
                   placeholder="Tìm kiếm"
                   url={API_USER_VT}
                   queryParam="name"
                   optionLabel="name"
                   optionValue="id"
                   isMulti
                   limitTags={3}
                   {...field}
                   error={!!errors.bookManager}
                   helperText={errors.bookManager?.message}
                 />
               )}
             />
           </Grid>
        <Grid item xs={12}>
          <Controller
            name="status"
            control={control}
            render={({ field }) => {
              const onStatusChange = (e) => {
                field.onChange(e.target.checked ? "active" : "inactive");
              };
              return (
                <FormControlLabel
                  control={
                    <Checkbox checked={field.value === "active"} onChange={onStatusChange} />
                  }
                  label="Hoạt động"
                />
              );
            }}
          />
           <Controller
                      name="isDefault"
                      control={control}
                      render={({ field }) => {
                        const onDefaultChange = (e) => {
                          field.onChange(e.target.checked);
                        };
                        return (
                          <FormControlLabel
                            control={
                              <Checkbox checked={!!field.value} onChange={onDefaultChange} />
                            }
                            label="Mặc định"
                          />
                        );
                      }}
                    />
          <Controller
            name="isCertifiedCopies"
            control={control}
            render={({ field }) => {
              const onCertifiedChange = (e) => {
                field.onChange(e.target.checked);
              };
              return (
                <FormControlLabel
                  control={
                    <Checkbox checked={!!field.value} onChange={onCertifiedChange} />
                  }
                  label="Sao y"
                />
              );
            }}
          />
        </Grid>
      </Grid>
    </Dialog>
  );
};

EditDocumentBookOut.propTypes = {
  open: PropTypes.bool.isRequired,
  bookDocumentId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  isLoading: PropTypes.bool,
  sharedComponents: PropTypes.object.isRequired,
};

export default withSharedComponents(EditDocumentBookOut);