import React, { useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { Grid , Checkbox, FormControlLabel } from "@mui/material";
import { Controller, useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import PropTypes from "prop-types";
import withSharedComponents from "@components/WrapperComponent";
import { useToast } from "@components/common/ToastProvider";
import axiosInstance from "@utils/axiosInstance";

import { API_USER_VT, API_ADD_DOCUMENT_BOOK } from "@EnvironmentFile/constants/urlConfig";
import withFormWrapper from "@components/common/FormWrapper";


// Schema validation cho các trường trong dialog
const documentBookSchema = yup.object().shape({
  bookCode: yup.string(),
  bookName: yup.string().required("Vui lòng nhập tên sổ").min(3, "Tên sổ phải có ít nhất 3 ký tự"),
  count: yup.number().typeError("Số bắt đầu phải là số").min(0, "Số bắt đầu phải lớn hơn hoặc bằng 0"),
  order: yup.number().typeError("Thứ tự phải là số").min(0, "Thứ tự  bắt đầu phải lớn hơn hoặc bằng 0"),
  unitName: yup.string().required("Vui lòng nhập tên đơn vị"),
  year: yup.number().typeError("Vui lòng chọn năm").required("Vui lòng chọn năm"),
  isCertifiedCopies: yup.boolean(),
});

const AddDocumentBook = ({
  open,
  // mode = "add",
  // documentId,
  // setReloadData,
  onClose,
  onSuccess,
  isLoading,
  sharedComponents,
  dialogKey
}) => {
  const toast = useToast();
  const {
		Dialog,
		InputComponents: BaseInput,
		AsyncAutoComplete: BaseAsyncAutoComplete,
	} = sharedComponents;

	const InputComponents = useMemo(() => {
		const Wrapped = withFormWrapper(BaseInput, "input");
		const Component = (props) => <Wrapped {...props} />;
		Component.displayName = "InputComponents";
		return Component;
	}, [BaseInput]);

	const AsyncAutoComplete = useMemo(() => {
    const Wrapped = withFormWrapper(BaseAsyncAutoComplete, "asyncSelect");
    const Component = (props) => <Wrapped {...props} />;
    Component.displayName = "AsyncAutoComplete";
    return Component;
	}, [BaseAsyncAutoComplete]);
	
  const { crmSource } = useSelector((state) => state.config);
  const { dataUser: authUser } = useSelector((state) => state.auth || {});
  const currentYear = new Date().getFullYear();
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(documentBookSchema),
    defaultValues: {
      bookCode: "",
      bookName: "",
      count: 1,
      order: 1,
      unitName: "",
      year: currentYear,
      documentField: [], // Chuyển thành mảng rỗng
      bookManager: [], // Chuyển thành mảng rỗng
      status: "active",
      isDefault: false,
      isCertifiedCopies: false,
    },
  });

  const bookNameValue = useWatch({ control, name: "bookName" });
  const yearValue = useWatch({ control, name: "year" });

  // Lấy các options từ redux store
  const yearOptions = Array.from({ length: 6 }, (_, index) => {
    const year = 2025 + index;
    return { value: year, title: year.toString() };
  });
  // const [loading, setLoading] = useState(false);
  const documentFieldOptions = crmSource.find((item) => item.code === "S26")?.data || [];
  // const securityLevelOptions =
  //   crmSource.find((item) => item.code === "S21")?.data || [];
//   const documentTypeOptions =
//     crmSource.find((item) => item.code === "S19")?.data || [];
//   const receiveMethodOptions =
//     crmSource.find((item) => item.code === "S27")?.data || []; //cái này k dùng nên kệ
  useEffect(() => {
    if (open) { 
      const organizationName = authUser?.organizationName || "";
      reset({
        bookCode: "",
        bookName: "",
        count: 1,
        order: 1,
        unitName: organizationName,
        year: currentYear,
        documentField: [],
        bookManager: [],
        status: "active",
        isDefault: false,
        isCertifiedCopies: false,
      });
    }
  }, [open, reset, currentYear, authUser]);

  // useEffect để tự động tạo Mã sổ
  useEffect(() => {
    if (bookNameValue && yearValue) {
      const organizationCode = authUser?.organizationCode || "";
      const prefix = dialogKey === "addDocumentBook" ? "SOVBDEN" : "SOVBDI";

      // Chuyển đổi tên sổ thành dạng không dấu, không khoảng trắng và viết hoa
      const sanitizedBookName = bookNameValue
        .replace(/[Đđ]/g, "D")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "")
        .toUpperCase();

      // Thêm organizationCode vào trước prefix
      const generatedCode = `${organizationCode}/${prefix}/${yearValue}/${sanitizedBookName}`;
      setValue("bookCode", generatedCode, { shouldValidate: true });
    }
  }, [bookNameValue, yearValue, setValue, dialogKey, authUser]);

  // Xử lý khi nhấn nút Lưu
  const handleSave = handleSubmit(async (data) => {
    const typeDocument = dialogKey === "addDocumentBook"
      ? "IncommingDocument"
      : "OutGoingDocument";

    const payload = {
      name: data.bookName,
      year: data.year,
      "type_document": typeDocument,
      "sender_unit": data.unitName,
      "to_book_code": data.bookCode,
      "document_field": data.documentField,
      count: data.count,
      "manager_book": Array.isArray(data.bookManager) ? data.bookManager.map(m => m.id || m._id || m) : data.bookManager,
      "order": String(data.order),
      active: data.status === 'active',
      isDefault: data.isDefault, 
      isCertifiedCopies: data.isCertifiedCopies,
    };

    // Kiểm tra xem năm này đã có sổ Sao y chưa
    if (data.isCertifiedCopies) {
      try {
        const response = await axiosInstance.get(API_ADD_DOCUMENT_BOOK, {
          params: {
            year: data.year,
            "type_document": typeDocument,
          }
        });
        const allBooks = response?.data?.data || response?.data || [];
        if (Array.isArray(allBooks)) {
          const existing = allBooks.find(book => book.isCertifiedCopies || book.is_certified_copies);
          if (existing) {
            toast(`Năm ${data.year} đã có sổ Sao y cho loại văn bản này. Vui lòng kiểm tra lại!`, "error");
            return;
          }
        }
      } catch (error) {
        logger.error("Lỗi kiểm tra sổ sao y:", error);
      }
    }
    
    try {
      await axiosInstance.post(API_ADD_DOCUMENT_BOOK, payload);
      toast("Thêm mới sổ văn bản thành công!", "success");
      onSuccess(); // Gọi callback để component cha có thể đóng dialog và tải lại dữ liệu
    } catch (error) {
      toast(error.response?.data?.message || "Có lỗi xảy ra khi thêm mới", "error");
    }
  });

  return (
    <Dialog
      title="Thêm mới Sổ văn bản"
      open={open}
      onClose={onClose}
      onSave={handleSave}
      type="add"
      isLoading={isLoading}
      size="sm"
      cancelButtonText="Đóng"
    >
      <Grid container spacing={2} mt={1}>
        {/* Hàng 1 */}
        <Grid item xs={12}>
          <Controller name="unitName" control={control} render={({ field }) => ( <InputComponents label="Tên đơn vị" {...field} error={!!errors.unitName} helperText={errors.unitName?.message} disabled /> )} />
        </Grid>
           <Grid item xs={12}>
          <Controller
            name="year"
            control={control}
            render={({ field }) => (
              <InputComponents
                select
                label="Năm"
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
           <Grid item xs={12}>
          <Controller
            name="documentField"
            control={control}
            render={({ field }) => (
              <InputComponents
                select
                label="Lĩnh vực"
                options={documentFieldOptions}
                customLabel="title"
                customValue="value"
                {...field}
                multiple // Cho phép chọn nhiều
                error={!!errors.documentField}
                helperText={errors.documentField?.message}
                
              />
            )}
          />
        </Grid>
        
        <Grid item xs={12} >
          <Controller name="bookName" control={control} render={({ field }) => (<InputComponents label="Tên sổ" {...field} error={!!errors.bookName} helperText={errors.bookName?.message} required />)} />
        </Grid>
        <Grid item xs={12} >
          <Controller name="bookCode" control={control} render={({ field }) => (<InputComponents label="Mã sổ" {...field} error={!!errors.bookCode} helperText={errors.bookCode?.message} disabled />)} />
        </Grid>
         <Grid item xs={12}>
          <Controller name="count" control={control} render={({ field }) => ( <InputComponents label="Số bắt đầu" {...field} error={!!errors.count} helperText={errors.count?.message} /> )} />
        </Grid>
            <Grid item xs={12}>
          <Controller
            name="bookManager"
            control={control}
            render={({ field }) => (
              <AsyncAutoComplete
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
          <Checkbox
            checked={field.value === "active"}
              onChange={onStatusChange}
          />
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
      const onStatusChange = (e) => {
        field.onChange(e.target.checked ? true : false);
      };
      return (
        <FormControlLabel
          control={
          <Checkbox
            checked={field.value === true}
              onChange={onStatusChange}
          />
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
      const onCertifiedCopiesChange = (e) => {
        field.onChange(e.target.checked ? true : false);
      };
      return (
        <FormControlLabel
          control={
          <Checkbox
            checked={field.value === true}
              onChange={onCertifiedCopiesChange}
          />
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

AddDocumentBook.propTypes = {
  mode: PropTypes.string,
  documentId: PropTypes.string,
  setReloadData: PropTypes.func,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  sharedComponents: PropTypes.object.isRequired,
};
export default withSharedComponents(AddDocumentBook);