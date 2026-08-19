import React, { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import CustomTable from "@components/CustomTable/CustomTable";
import { useToast } from "@components/common/ToastProvider";
import { API_CRMSOURCE_DHVB, API_CRMSOURCE_DETAIL_DHVB, API_DELETE_CRMSOURCE_DHVB, API_ADD_CRMSOURCE_DHVB, APP_BASE } from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";
import { columns, filters, categorySchema, defaultCategoryValue } from "./constant";
import AddDialog from "./components/AddDialog";
import EditDialog from "./components/EditDialog";
import ViewDialog from "./components/ViewDialog";
import DeleteDialog from "./components/DeleteDialog";

function CategoryManagement() {
  const toast = useToast();
  const [openDialog, setOpenDialog] = useState({ add: false, edit: false, view: false, delete: false });
  const [selectedItem, setSelectedItem] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [idDocumentParent, setIdDocumentParent] = useState(null);

  const {
    control,
    // handleSubmit,
    reset,
    formState: { errors },
    getValues,
    trigger,
  } = useForm({
    resolver: yupResolver(categorySchema),
    mode: "onChange", // Thêm dòng này để validate ngay khi có thay đổi
    defaultValues: defaultCategoryValue,
  });

  const fetchDataFromApi = useCallback(
    async ({ page, limit, query, code, sort }) => {
      try {
        const params = {
          page,
          limit,
          ...(sort && { sort }),
        };

        if (query && Array.isArray(code) && code.length > 0) {
          code.forEach((field) => {
            params[field] = query;
          });
        }

        const response = await api.get(API_CRMSOURCE_DHVB, { params });
        const responseData = response.data;

        // Kiểm tra cấu trúc dữ liệu trả về và đảm bảo rawData luôn là một mảng
        const rawData = Array.isArray(responseData)
          ? responseData
          : responseData?.items || responseData?.data || [];

        return {
          data: rawData,
          // Ưu tiên lấy total từ API, nếu không có thì dùng độ dài mảng
          total: responseData?.total ?? rawData.length,
        };
      } catch (error) {
        toast("Có lỗi xảy ra khi tải dữ liệu danh mục!", "error");
        return { data: [], total: 0 };
      }
    },
    [toast]
  );

  const handleOpenDialog = useCallback(async (dialog, itemIdOrData) => {
    if (dialog === 'add') {
      setIsLoading(true);
      try {
        // Gọi API tạo draft để lấy idDocumentParent
        const res = await api.post(`${APP_BASE}/api/crm-sources/draft`);
        setIdDocumentParent(res?.data?.data?.id);
        reset(defaultCategoryValue);
        setSelectedItem(null);
        setOpenDialog(prev => ({ ...prev, add: true }));
      } catch (error) {
        toast(error?.response?.data?.message || "Có lỗi khi tạo danh mục mới!", "error");
      } finally {
        setIsLoading(false);
      }
    } else if ((dialog === 'edit' || dialog === 'view') && itemIdOrData) {
      setIsLoading(true);
      try {
        const idToFetch = typeof itemIdOrData === 'object' ? itemIdOrData.id || itemIdOrData._id : itemIdOrData;
        const response = await api.get(API_CRMSOURCE_DETAIL_DHVB(idToFetch));
        const itemData = response.data.data;
        setSelectedItem(itemData);
        reset(itemData);
        setOpenDialog(prev => ({ ...prev, [dialog]: true }));
      } catch (error) {
        toast("Không thể tải dữ liệu chi tiết của danh mục!", "error");
      } finally {
        setIsLoading(false);
      }
    } else if (dialog === 'delete') {
      setSelectedItem(itemIdOrData);
      setOpenDialog(prev => ({ ...prev, delete: true }));
    }
  }, [reset, toast]);

  const handleCloseDialog = useCallback((dialog) => {
    setOpenDialog(prev => ({ ...prev, [dialog]: false }));
    setSelectedItem(null);
    reset(defaultCategoryValue);
  }, [reset]);

  const handleAdd = async (data) => {
    setIsLoading(true);
    try {
      delete data.data;
      const payload = {
        ...data,
        status: 1,
      };
      await api.patch(`${API_ADD_CRMSOURCE_DHVB}/${idDocumentParent}`, payload);
      toast("Thêm mới danh mục thành công!", "success");
      handleCloseDialog("add");
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      toast(error?.response?.data?.message || "Có lỗi xảy ra khi thêm mới!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (data) => {
    setIsLoading(true);
    try {
      await api.patch(`${API_ADD_CRMSOURCE_DHVB}/${selectedItem.id}`, data);
      toast("Cập nhật danh mục thành công!", "success");
      handleCloseDialog("edit");
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      toast(error?.response?.data?.message || "Có lỗi xảy ra khi cập nhật!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const extractId = (item) => typeof item === 'object' ? item.id || item._id : item;
      const idsToDelete = Array.isArray(selectedItem) ? selectedItem.map(extractId) : [extractId(selectedItem)];
      // Giả sử API hỗ trợ xóa nhiều qua body { ids: [...] }
      await api.delete(API_DELETE_CRMSOURCE_DHVB, { data: { ids: idsToDelete } });
      toast(`Đã xóa ${idsToDelete.length} danh mục thành công!`, "success");
      handleCloseDialog("delete");
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      toast(error?.response?.data?.message || "Có lỗi xảy ra khi xóa!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Tối ưu hóa các hàm callback để tránh re-render không cần thiết ---
  const handleAddClick = useCallback(() => handleOpenDialog('add'), [handleOpenDialog]);
  const handleEditClick = useCallback((id) => handleOpenDialog('edit', id), [handleOpenDialog]);
  const handleViewClick = useCallback((id) => handleOpenDialog('view', id), [handleOpenDialog]);
  const handleDeleteClick = useCallback((ids) => handleOpenDialog('delete', ids), [handleOpenDialog]);

  const handleCloseAddDialog = useCallback(() => handleCloseDialog('add'), [handleCloseDialog]);
  const handleCloseEditDialog = useCallback(() => handleCloseDialog('edit'), [handleCloseDialog]);
  const handleCloseViewDialog = useCallback(() => handleCloseDialog('view'), [handleCloseDialog]);
  const handleCloseDeleteDialog = useCallback(() => handleCloseDialog('delete'), [handleCloseDialog]);
  // --------------------------------------------------------------------

  return (
    <>
      <CustomTable
        codeModule={"Category_Management"}
        fetchData={fetchDataFromApi}
        columns={columns}
        filter={filters}
        title="Quản lý danh mục"
        addButtonLabel="Thêm mới"
        disableSynchronize
        onAdd={handleAddClick}
        onEdit={handleEditClick}
        onView={handleViewClick}
        onDelete={handleDeleteClick}
        refreshTrigger={refreshTrigger}
        isDeleteWithCode={false} // Sử dụng id để xóa
        isCheckTitle
        uiPreset="unitModern"
        actionIconSize="medium"
        useModernActionColors
        rowsPerPageOptions={[25, 50, 100, 500]}
				lockRowsPerPageOptions
				filterPopupAlignLeft
				encodeHtml
      />
      <AddDialog
        open={openDialog.add}
        onClose={handleCloseAddDialog}
        onSave={handleAdd}
        control={control}
        errors={errors}
        getValues={getValues}
        trigger={trigger}
        isLoading={isLoading}
        idDocumentParent={idDocumentParent}
      />
      <EditDialog
        open={openDialog.edit}
        onClose={handleCloseEditDialog}
        onSave={handleEdit}
        control={control}
        errors={errors}
        getValues={getValues}
        trigger={trigger}
        reset={reset}
        defaultData={selectedItem}
        isLoading={isLoading}
        idDocumentParent={selectedItem?.id}
      />
      <ViewDialog
        open={openDialog.view}
        onClose={handleCloseViewDialog}
        control={control}
        reset={reset}
        defaultData={selectedItem}
        idDocumentParent={selectedItem?.id}
      />
      <DeleteDialog
        open={openDialog.delete}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDelete}
        selectedIds={Array.isArray(selectedItem) ? selectedItem : [selectedItem?.id]}
      />
    </>
  );
}

export default CategoryManagement;
