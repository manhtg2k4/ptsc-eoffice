import React, {
  useState,
  useImperativeHandle,
  forwardRef,
  useEffect,
  useCallback,
  useMemo,
  memo,
} from "react";

import PropTypes from "prop-types";

import { Grid, } from "@mui/material";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { FormContainer, HalfWidthGridItem } from "@styles/FormDialog.styles";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { childDocument } from "@pages/CategoryManagement/constant";
import CustomInput from "@components/CustomInput/CustomInput";
import { useToast } from "@components/common/ToastProvider";
import { StyledFormLabel, ViewFieldBox, ViewFieldLabel, ViewFieldValue } from "@components/common/FormWrapper";
import axiosInstance from "@utils/axiosInstance";
import api from "@services/api";
import CustomTable from "@components/CustomTable/CustomTable";
import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";

const DynamicValuesTable = forwardRef(
  ({ disabled = false, idDocumentParent, defaultValue, type, disableEdit, titlePopup, customMaxHeight }, ref) => {
    const [values, setValues] = useState([]);
    const [, setErrors] = useState([]);
    const [reload, setReload] = useState(null);

    const toast = useToast();
    const [openDialog, setOpenDiaLog] = useState({
      add: false,
      edit: false,
      view: false,
    });

    // State cho confirm delete dialog
    const [confirmDelete, setConfirmDelete] = useState({
      open: false,
      type: null, // 'single' hoặc 'bulk'
      itemId: null, // dùng cho single delete
      selectedIds: [], // dùng cho bulk delete
    });
    const {
      control,
      // handleSubmit,
      reset,
      formState: { errors: formErrors },

      getValues,
      trigger,
    } = useForm({
      resolver: yupResolver(childDocument),
      mode: "onChange", // Thêm dòng này để validate ngay khi có thay đổi
      defaultValues: { value: "", title: "" },
    });

    const validateValues = useCallback((currentValues) => {
      if (currentValues.length === 0) {
        setErrors([{ general: "Danh mục phải có ít nhất một giá trị." }]);
        return false;
      }

      const newErrors = Array.from(
        { length: currentValues.length },
        () => ({})
      );
      const valueSet = new Set();
      let hasError = false;

      // Regex để kiểm tra ký tự đặc biệt, cho phép chữ, số, khoảng trắng và một số ký tự thông dụng
      const noSpecialCharsRegex =
        /^[a-zA-Z0-9\sàáâãèéêìíòóôõùúăđĩũơưăạảấầẩẫậắằẳẵặẹẻẽềềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳýỵỷỹÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲÝỴỶỸ_.-]*$/;

      currentValues.forEach((item, index) => {
        const trimmedValue = item.value?.trim();
        const trimmedTitle = item.title?.trim();

        if (!trimmedValue) {
          newErrors[index].value = "Giá trị là bắt buộc.";
          hasError = true;
        } else if (valueSet.has(trimmedValue)) {
          newErrors[index].value = "Giá trị không được trùng lặp.";
          hasError = true;
        } else if (noSpecialCharsRegex.test(trimmedValue)) {
          valueSet.add(trimmedValue);
        } else {
          newErrors[index].value = "Giá trị không được chứa ký tự đặc biệt.";
          hasError = true;
        }

        if (!trimmedTitle) {
          newErrors[index].title = "Tên hiển thị là bắt buộc.";
          hasError = true;
        } else if (!noSpecialCharsRegex.test(trimmedTitle)) {
          newErrors[index].title =
            "Tên hiển thị không được chứa ký tự đặc biệt.";
          hasError = true;
        }
      });

      setErrors(newErrors);
      return !hasError;
    }, []);

    // fetchData for CustomTable - trả về { data, total }
    // Hàm này được sử dụng cho cả CustomTable và các thao tác CRUD
    const fetchDataForTable = useCallback(async ({ page, limit, query, code, sort } = {}) => {
      try {
        // Build params object - chỉ thêm params nếu có giá trị
        const params = {
          page,
          limit,
          ...(sort && { sort }),
        };
        // Thêm query params theo các field được filter
        if (query && Array.isArray(code) && code.length > 0) {
          code.forEach((field) => {
            params[field] = query;
          });
        }

        const res = await api.get(
          `${APP_BASE}/api/crm-sources/${idDocumentParent}/data`,
          Object.keys(params).length > 0 ? { params } : undefined
        );

        // API trả về { success, message, data: [...], total } hoặc array trực tiếp
        const responseData = res?.data?.data ?? res?.data;
        const dataArray = Array.isArray(responseData) ? responseData : [];
        const total = res?.data?.total || dataArray.length;

        setValues(dataArray);

        return {
          data: dataArray,
          total,
        };
      } catch (error) {
        toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
        return { data: [], total: 0 };
      }
    }, [idDocumentParent, toast]);

    // Columns config cho CustomTable
    const tableColumns = useMemo(() => [
      { name: "Tên hiển thị", row: "title", width: "200px" },
      { name: "Giá trị", row: "value", width: "200px" },
    ], []);

    // Filter config cho CustomTable
    const tableFilters = useMemo(() => [
      { name: "Tên hiển thị", code: "title" },
      { name: "Giá trị", code: "value" },
    ], []);

    useImperativeHandle(ref, () => ({
      getValues: () => values,
      validate: () => validateValues(values),
      getIdDocumentParent: () => idDocumentParent,
      resetData: () => {
        setValues([]);
        setErrors([]);

      },

    }), [values, validateValues, idDocumentParent]);



    const deleteChilDocument = useCallback(
      async (item) => {
        try {
          const body = {
            ids: [item?.id],
          };
          const res = await axiosInstance.delete(
            `${APP_BASE}/api/crm-sources/data`,
            { data: body }
          );
          if (res) {
            toast(res?.data?.message || "Xóa danh mục con thành công", "success");
            // Chỉ cần setReload, CustomTable sẽ tự fetch lại
            setReload(new Date() * 1);
          }
        } catch (error) {
          toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
        }
      },
      [toast]
    );

    // Hàm hiện confirm dialog cho bulk delete
    const handleBulkDelete = useCallback(
      (selectedIds) => {
        if (!selectedIds || selectedIds.length === 0) {
          toast("Vui lòng chọn ít nhất một mục để xóa", "warning");
          return;
        }
        // Mở confirm dialog thay vì xóa trực tiếp
        setConfirmDelete({
          open: true,
          type: 'bulk',
          itemId: null,
          selectedIds: selectedIds,
        });
      },
      [toast]
    );

    // Hàm thực hiện xóa nhiều items sau khi confirm
    const executeBulkDelete = useCallback(
      async (selectedIds) => {
        try {
          const body = {
            ids: selectedIds,
          };
          const res = await axiosInstance.delete(
            `${APP_BASE}/api/crm-sources/data`,
            { data: body }
          );
          if (res) {
            toast(res?.data?.message || `Xóa ${selectedIds.length} danh mục con thành công`, "success");
            // Chỉ cần setReload, CustomTable sẽ tự fetch lại
            setReload(new Date() * 1);
          }
        } catch (error) {
          toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
        }
      },
      [toast]
    );

    const handleOpenDialog = useCallback((key) => {
      setOpenDiaLog((prev) => ({ ...prev, [key]: true }));
    }, []);

    const handleCloseDialog = useCallback(() => {
      setOpenDiaLog({
        add: false,
        edit: false,
        view: false,
      });
    }, []);

    const handleAddDialog = useCallback(() => {
      // Reset form về rỗng khi thêm mới
      reset({ value: "", title: "" });
      setEditingItem(null);
      handleOpenDialog("add");
    }, [handleOpenDialog, reset]);

    const handleDocument = useCallback(async () => {
      try {
        // Validate form trước khi submit
        const isValid = await trigger();
        if (!isValid) {
          return;
        }

        const formData = getValues();

        // Chỉ lấy value và title để gửi lên API
        const submitData = {
          value: formData.value,
          title: formData.title,
        };

        // Gửi dữ liệu lên API
        const res = await axiosInstance.post(
          `${APP_BASE}/api/crm-sources/${idDocumentParent}/data`,
          submitData
        );

        if (res) {

          toast(res?.data?.message || "Thêm mới thành công danh mục con", "success");

          setReload(new Date() * 1);
          // Reset form và đóng dialog
          reset();
          setOpenDiaLog({
            add: false,
            edit: false,
            view: false,
          });
        }
      } catch (error) {
        logger.error("Error adding document:", error);
        toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
      }
    }, [trigger, getValues, idDocumentParent, toast, reset]);

    // Hàm hiện confirm dialog cho single delete
    const handleDeleteClick = useCallback(
      (itemId) => {
        setConfirmDelete({
          open: true,
          type: 'single',
          itemId: itemId?.id,
          selectedIds: [],
        });
      },
      []
    );

    // Hàm xử lý khi user confirm xóa
    const handleConfirmDelete = useCallback(() => {
      if (confirmDelete.type === 'single') {
        deleteChilDocument({ id: confirmDelete.itemId });
      } else if (confirmDelete.type === 'bulk') {
        executeBulkDelete(confirmDelete.selectedIds);
      }
      // Đóng confirm dialog
      setConfirmDelete({
        open: false,
        type: null,
        itemId: null,
        selectedIds: [],
      });
    }, [confirmDelete, deleteChilDocument, executeBulkDelete]);

    // Hàm đóng confirm dialog (hủy xóa)
    const handleCancelDelete = useCallback(() => {
      setConfirmDelete({
        open: false,
        type: null,
        itemId: null,
        selectedIds: [],
      });
    }, []);

    // State để lưu item đang edit
    const [editingItem, setEditingItem] = useState(null);

    // Hàm lấy chi tiết item để edit
    const handleEditClick = useCallback(async (itemId) => {
      try {
        const res = await api.get(
          `${APP_BASE}/api/crm-sources/data/${itemId}`
        );

        if (res?.data?.data) {
          const itemData = res.data.data;
          setEditingItem(itemData);
          // Set giá trị vào form
          reset({
            value: itemData.value || "",
            title: itemData.title || "",
          });

          // Mở dialog edit
          handleOpenDialog("edit");
        }
      } catch (error) {
        toast(error?.response?.data?.message || "Có lỗi xảy ra khi lấy chi tiết", "error");
      }
    }, [toast, reset, handleOpenDialog]);

    // Hàm xem chi tiết item
    const handleViewClick = useCallback(async (itemId) => {
      try {
        const res = await api.get(
          `${APP_BASE}/api/crm-sources/data/${itemId}`
        );

        if (res?.data?.data) {
          const itemData = res.data.data;
          setEditingItem(itemData);
          // Set giá trị vào form
          reset({
            value: itemData.value || "",
            title: itemData.title || "",
          });

          // Mở dialog view
          handleOpenDialog("view");
        }
      } catch (error) {
        toast(error?.response?.data?.message || "Có lỗi xảy ra khi lấy chi tiết", "error");
      }
    }, [toast, reset, handleOpenDialog]);

    // Hàm cập nhật item (PATCH)
    const handleEditDocument = useCallback(async () => {
      try {
        const isValid = await trigger();
        if (!isValid) {
          return;
        }

        const formData = getValues();
        const submitData = {
          value: formData.value,
          title: formData.title,
        };

        const res = await axiosInstance.patch(
          `${APP_BASE}/api/crm-sources/data/${editingItem?.id}`,
          submitData
        );

        if (res) {
          toast(res?.data?.message || "Cập nhật thành công", "success");

          // Reset form và đóng dialog
          reset();
          setEditingItem(null);
          setOpenDiaLog({
            add: false,
            edit: false,
            view: false,
          });
          // Chỉ cần setReload, CustomTable sẽ tự fetch lại
          setReload(new Date() * 1);
        }
      } catch (error) {
        logger.error("Error updating document:", error);
        toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
      }
    }, [trigger, getValues, editingItem, toast, reset,]);

    // Đã loại bỏ useEffect gọi fetchDataForTable vì CustomTable đã tự động fetch khi mount
    // Rely on CustomTable's automatic fetch on mount and use `setReload` to trigger refreshes.
    // Do NOT call fetchDataForTable() here to avoid duplicate API requests

    // Set values từ defaultValue khi edit/view
    useEffect(() => {
      if (
        defaultValue &&
        Array.isArray(defaultValue) &&
        defaultValue.length > 0
      ) {
        setValues(defaultValue);
      }
    }, [defaultValue]);

		const isEditDisabled = disableEdit && openDialog.edit;

    return (
      <>
        <CustomTable
          fetchData={fetchDataForTable}
          columns={tableColumns}
          filter={tableFilters}
           addButtonLabel="Thêm mới"
          disableAdd={disabled}
          disableEdit={disabled}
          onDelete={handleBulkDelete}
          disableDelete={disabled}
          onAdd={handleAddDialog}
          onView={handleViewClick}
          onEdit={handleEditClick}
          reload={reload}
          customMaxHeight={customMaxHeight ? customMaxHeight : 500}

          // isInsideDialog
          disableCheckbox = {type === 'view'}
          onRowDelete={handleDeleteClick}
          disableSynchronize
          uiPreset="unitModern"
          actionIconSize="medium"
          useModernActionColors
          rowsPerPageOptions={[25, 50, 100, 500]}
          lockRowsPerPageOptions
					encodeHtml
        />
        <CustomDialog
          open={openDialog.add || openDialog.edit || openDialog.view}
          title={
            openDialog.add
              ? `Thêm mới ${titlePopup || "danh mục con"}`
              : openDialog.edit
                ? `Cập nhật ${titlePopup || "danh mục con"}`
                : `Xem chi tiết ${titlePopup || "danh mục con"}`
          }
          onClose={handleCloseDialog}
          onSave={openDialog.view ? undefined : (openDialog.edit ? handleEditDocument : handleDocument)}
          disableSave={openDialog.view}
          size="sm"
        >
          <FormContainer>
            <br />
            <Grid container spacing={2}>
              <HalfWidthGridItem item>
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    openDialog.view ? (
                      <ViewFieldBox>
                        <ViewFieldLabel>Tên hiển thị</ViewFieldLabel>
                        <ViewFieldValue>{field.value || ""}</ViewFieldValue>
                      </ViewFieldBox>
                    ) : (
                      <>
                        <StyledFormLabel>
                          Tên hiển thị{" "}
                          {(openDialog.add || openDialog.edit) && (
                            <span style={{ color: "red", marginLeft: "2px" }}>*</span>
                          )}
                        </StyledFormLabel>
                        <CustomInput
                          {...field}
                          error={!!formErrors.title}
                          helperText={formErrors.title?.message}
                        />
                      </>
                    )
                  )}
                />
              </HalfWidthGridItem>
              <HalfWidthGridItem item>
                <Controller
                  name="value"
                  control={control}
                  render={({ field }) => (
                    openDialog.view ? (
                      <ViewFieldBox>
                        <ViewFieldLabel>Giá trị</ViewFieldLabel>
                        <ViewFieldValue>{field.value || ""}</ViewFieldValue>
                      </ViewFieldBox>
                    ) : (
                      <>
                        <StyledFormLabel>
                          Giá trị{" "}
                          {(openDialog.add || openDialog.edit) && (
                            <span style={{ color: "red", marginLeft: "2px" }}>*</span>
                          )}
                        </StyledFormLabel>
                        <CustomInput
                          {...field}
                          error={!!formErrors.value}
                          helperText={formErrors.value?.message}
                          disabled={isEditDisabled}
                        />
                      </>
                    )
                  )}
                />
              </HalfWidthGridItem>
            </Grid>
          </FormContainer>
        </CustomDialog>

        {/* Dialog xác nhận xóa */}
        <CustomDialog
          open={confirmDelete.open}
          title="Xác nhận xóa"
          onClose={handleCancelDelete}
          onSave={handleConfirmDelete}
          saveButtonText="Xác nhận"
          cancelButtonText="Hủy"
          size="xs"
        >
          <div style={{ padding: '16px 0' }}>
            {confirmDelete.type === 'bulk'
              ? `Bạn có chắc chắn muốn xóa ${confirmDelete.selectedIds.length} bản ghi này không?`
              : "Bạn có chắc chắn muốn xóa bản ghi này không?"
            }
          </div>
        </CustomDialog>
      </>
    );
  }
);

DynamicValuesTable.displayName = "DynamicValuesTable";

DynamicValuesTable.propTypes = {
  defaultValue: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string,
      title: PropTypes.string,
    })
  ),
	disabled: PropTypes.bool,
	disableEdit: PropTypes.bool,
	idDocumentParent: PropTypes.string,
	titlePopup: PropTypes.string,
	type: PropTypes.oneOf(['add', 'edit', 'view']),
};

export default memo(DynamicValuesTable);