import React, { useCallback, useState } from "react";
// import CustomTable from "@components/CustomTable/CustomTableClone_1";
import { useDispatch } from "react-redux";
import { useToast } from "@components/common/ToastProvider";
import { useForm, FormProvider } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  getParentId,
} from "@redux/slices/AdministrationSystem/functionManagement";
import { columns, defaultValue, filters, templateSchema } from "./constant";
import AddTemplateDialog from "./components/AddTemplateDialog";
import EditTemplateDialog from "./components/EditTemplateDialog";
import DeleteTemplateDialog from "./components/DeleteTemplateDialog";
import ViewTemplateDialog from "./components/ViewTemplateDialog";
import { addRoles, deleteMultipleRoles, getDataDetailroles, getDataListroles, updateRoles } from "@redux/slices/AdministrationSystem/rolesSlice";
import CustomTable from "@components/CustomTable/CustomTable";
// import { useModuleCode } from "@utils/Common/Common";

function RoleManagement() {
  const dispatch = useDispatch();
  const toast = useToast();
	// const moduleCode = useModuleCode();
  const [openDialogs, setOpenDialogs] = useState({
    add: false,
    delete: false,
    edit: false,
    view: false,
  });
  const [selectedIds, setSelectedIds] = useState();
  const [latestUpdatedId, setLatestUpdatedId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);  
  const methods = useForm({
    resolver: yupResolver(templateSchema),
       defaultValues: {
      code: "",
      name: "",
      describe: "",
      roles: [], // Khởi tạo giá trị mặc định cho mảng roles
      ...defaultValue,
    },

  });
  const { control, handleSubmit, reset, formState: { errors } } = methods;

  const fetchDataFromApi = useCallback(
    async ({ page, limit, query, code, sort }) => {
      if (!page || !limit) {
        return { data: [], total: 0 };
      }
      try {
        const response = await dispatch(
          getDataListroles({ page, limit, query, code, sort })
        ).unwrap()
        const processedData = (response.data || []).map((item) => {
          let functionNameDisplay = "N/A";
          if (Array.isArray(item.roles) && item.roles.length > 0) {
            functionNameDisplay = item.roles
              .map((role) => role.functionName?.name)
              .filter(Boolean) // Loại bỏ các giá trị null/undefined
              .join(", ");
          }
          return { ...item, functionNameDisplay };
        });
        return {
          data: processedData,
          total: response.total || response.length || 0,
        };
      } catch (error) {
        toast("Lỗi hệ thống", "warning");
        return { data: [], total: 0 };
      }
    },
    [dispatch, toast]
  );

//   const handleOpenDialog = async (dialogKey, idsOrRecord = null) => {
//   if (idsOrRecord) {
//     if (dialogKey === "edit" || dialogKey === "view") {
//       setSelectedIds(idsOrRecord);
      
//       try {
//         const result = await dispatch(getDataDetailroles(idsOrRecord)).unwrap();
//         // API trả về { data: { ... } }
//         const roleData = result.data;

//         // Reset form với dữ liệu từ API
//         reset(roleData);

//       } catch (error) {
//         logger.error("Error fetching role details:", error);
//         toast("Lỗi khi tải thông tin vai trò", "error");
        
//         // Reset về trạng thái mặc định nếu lỗi
//         reset(defaultValue);
//       }
      
//     } else if (dialogKey === "delete") {
//       setSelectedIds(
//         Array.isArray(idsOrRecord) ? idsOrRecord : [idsOrRecord]
//       );
//     }
//   } else {
//     // Khi mở dialog thêm mới, reset về trạng thái ban đầu
//     reset(defaultValue);
//   }
  
//   setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
// };

//   const handleCloseDialog = (dialogKey) => {
//     setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
//     setIsLoading(false);
//     reset({ code: "", name: "", describe: "", roles: [], ...defaultValue });
//   };

const handleOpenDialog = useCallback(
  async (dialogKey, idsOrRecord = null) => {
    if (idsOrRecord) {
      if (dialogKey === "edit" || dialogKey === "view") {
        setSelectedIds(idsOrRecord);
        try {
          const result = await dispatch(getDataDetailroles(idsOrRecord)).unwrap();
          const roleData = result.data;
          reset(roleData);
        } catch (error) {
          toast("Lỗi khi tải thông tin vai trò", "error");
          reset(defaultValue); // defaultValue không cần đưa vào dependency
        }
      } else if (dialogKey === "delete") {
        setSelectedIds(Array.isArray(idsOrRecord) ? idsOrRecord : [idsOrRecord]);
      }
    } else {
      reset(defaultValue);
    }
    setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
  },
  [dispatch, reset, setSelectedIds, setOpenDialogs, toast] // loại bỏ defaultValue và logger
);

const handleCloseDialog = useCallback(
  (dialogKey) => {
    setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
    setIsLoading(false);
    reset({ code: "", name: "", describe: "", roles: [], ...defaultValue }); // vẫn dùng defaultValue bình thường
  },
  [reset, setOpenDialogs, setIsLoading] // loại bỏ defaultValue
);


  const handleDelete = async () => {
    if (!selectedIds?.length) {
      toast("Vui lòng chọn ít nhất một dòng để xóa!", "warning");
      return;
    }
    setIsLoading(true);
    try {
      await dispatch(deleteMultipleRoles(selectedIds)).unwrap();
      handleCloseDialog("delete");
      setSelectedIds();
      setRefreshTrigger((prev) => prev + 1);
      setIsLoading(false);
      toast(`Đã xóa ${selectedIds.length} bản ghi thành công!`, "success");
    } catch (error) {
      setIsLoading(false);
      toast("Đã xảy ra lỗi khi xóa!", "error");
    }
  };

  const onUpdate = async (data) => {
    const id = selectedIds;

    setIsLoading(true);

    try {
      const action = await dispatch(updateRoles({ id, updatedData: data }));
    
      if (updateRoles.fulfilled.match(action)) {
        reset(defaultValue);
        dispatch(getParentId());
        setRefreshTrigger((prev) => prev + 1);
        setLatestUpdatedId(id);
        handleCloseDialog("edit");
        setSelectedIds(null);
        toast("Cập nhật thành công!", "success");
      } else {
        throw action.payload || new Error("Có lỗi xảy ra!");
      }
    
      setIsLoading(false);
    } catch (error) {
      toast(
        error?.errors || 'Lỗi cập nhật!',
        "error"
      );
      setIsLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      
      const result = await dispatch(addRoles(data)).unwrap();
      setLatestUpdatedId(result._id);
      handleCloseDialog("add");
      reset(defaultValue);
      dispatch(getParentId());
      setRefreshTrigger((prev) => prev + 1);
      setIsLoading(false);
      toast("Thêm mới thành công!", "success");
    } catch (error) {
      setIsLoading(false);
    toast(
  Array.isArray(error?.errors)
    ? error.errors[0]  // lấy string luôn
    : (error?.message || "Có lỗi xảy ra!"),
  "error"
);
    }
  };

  const handleAdd = useCallback(() => handleOpenDialog("add"), [handleOpenDialog]);
  const handleDeleteClick = useCallback((ids) => handleOpenDialog("delete", ids), [handleOpenDialog]);
  const handleEdit = useCallback((record) => handleOpenDialog("edit", record), [handleOpenDialog]);
  const handleView = useCallback((record) => handleOpenDialog("view", record), [handleOpenDialog]);

  const handleCloseAddDialog = useCallback(() => handleCloseDialog("add"), [handleCloseDialog]);
  const handleCloseEditDialog = useCallback(() => handleCloseDialog("edit"), [handleCloseDialog]);
  const handleCloseViewDialog = useCallback(() => handleCloseDialog("view"), [handleCloseDialog]);
  const handleCloseDeleteDialog = useCallback(() => handleCloseDialog("delete"), [handleCloseDialog]);

  return (
    <>
      <CustomTable
				codeModule="RoleManagement"
        disableSynchronize
        fetchData={fetchDataFromApi}
        disableMore
        filter={filters}
        columns={columns}
        // onAdd={() => handleOpenDialog("add")}
        // onDelete={(ids) => handleOpenDialog("delete", ids)}
        onAdd={handleAdd}
        onDelete={handleDeleteClick}
        selected={selectedIds || []}
        onSelectionChange={setSelectedIds}
        // onEdit={(record) => handleOpenDialog("edit", record)}
        // onView={(record) => handleOpenDialog("view", record)}
        onEdit={handleEdit}
        onView={handleView}
        latestUpdatedId={latestUpdatedId}
				refreshTrigger={refreshTrigger}
        isCheckTitle
        addButtonLabel="Thêm mới"
        uiPreset="unitModern"
        actionIconSize="medium"
        useModernActionColors
        rowsPerPageOptions={[25, 50, 100, 500]}
        lockRowsPerPageOptions
				filterPopupAlignLeft
				encodeHtml
      >
        <FormProvider {...methods}>
          <AddTemplateDialog
            open={openDialogs.add}
            // onClose={() => handleCloseDialog("add")}
            onClose={handleCloseAddDialog}
            onSave={handleSubmit(onSubmit)}
            control={control}
            onSubmit={onSubmit}
            errors={errors}
            isLoading={isLoading}
          
          />
          <EditTemplateDialog
            open={openDialogs.edit}
            // onClose={() => handleCloseDialog("edit")}
            onClose={handleCloseEditDialog}
            onSave={handleSubmit(onUpdate)}
            control={control}
            onUpdate={onUpdate}
            errors={errors}
            isLoading={isLoading} 
          />
            <ViewTemplateDialog
            open={openDialogs.view}
            // onClose={() => handleCloseDialog("view")}
            onClose={handleCloseViewDialog}
            control={control}
          />
      
          <DeleteTemplateDialog
            open={openDialogs.delete}
            // onClose={() => handleCloseDialog("delete")}
            onClose={handleCloseDeleteDialog}
            onSave={handleDelete}
            selectedIds={selectedIds}
            isLoading={isLoading}
          />
        </FormProvider>
      </CustomTable>
    </>
  );
}

export default RoleManagement;
