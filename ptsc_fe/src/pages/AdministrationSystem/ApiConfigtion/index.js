import React, { useCallback, useState } from "react";
// import { Box, Grid, Grid2, Stack, Typography } from "@mui/material";
import CustomTable from "@components/CustomTable/CustomTable";
// import CustomDialog from "@components/CustomDialog";
// import CustomInput from "@components/CustomInput";
import { useDispatch } from "react-redux";
import { useToast } from "@components/common/ToastProvider";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
// import * as yup from "yup";
// import CustomDatePicker from "@components/CustomDatePicker";
// import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
// import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  addApiConfigurationCategory,
  deleteConfigurationAPI,
  // fetchSearchTemplate,
  fetchConfigurationAPIById,
  fetchTemplateCategories,
  updateConfigurationAPI,
} from "@redux/slices/AdministrationSystem/apiConfiguration";
import { columns, defaultValue, filters, templateSchema } from "./constant";
// import CustomAutocomplete from "@components/CustomAutocomplete";
import AddTemplateDialog from "./components/AddTemplateDialog";
import EditTemplateDialog from "./components/EditTemplateDialog";
import ViewTemplateDialog from "./components/ViewTemplateDialog";
import DeleteTemplateDialog from "./components/DeleteTemplateDialog";

function APIConfiguration() {
  const dispatch = useDispatch();
  const toast = useToast();

  const [openDialogs, setOpenDialogs] = useState({
    add: false,
    delete: false,
    edit: false,
    view: false,
  });
  const [selectedIds, setSelectedIds] = useState();
  const [latestUpdatedId, setLatestUpdatedId] = useState(null); // Theo dõi bản ghi vừa sửa
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(templateSchema),
    defaultValues: defaultValue,
  });

  // Sử dụng useCallback để ổn định tham chiếu của fetchDataFromApi
  const fetchDataFromApi = useCallback(
    async ({ page, limit, query, code, sort }) => {
      if (!page || !limit) {
        // logger.warn("Invalid page or limit:", { page, limit, sort });
        return { data: [], total: 0 };
      }
      try {
        let response;
        if (query !== "" && code && sort) {
          //Tìm kiếm rơi vào nhánh này
          response = await dispatch(
            fetchTemplateCategories({ page, limit, query, code, sort })
          ).unwrap();
        } else if (sort) {
          //Chỉ sort thì rơi vào nhánh này
          response = await dispatch(
            fetchTemplateCategories({ page, limit, query, code, sort })
          ).unwrap();
        } else {
          //Mặc định
          response = await dispatch(
            fetchTemplateCategories({ page, limit, sort })
          ).unwrap();
        }
        return {
          data: response.data || [], // Giả sử fetchTemplateCategories trả về mảng dữ liệu
          total: response.total || response.length || 0, // Cần điều chỉnh nếu API trả về total
        };
      } catch (error) {
        toast("Error fetching data:", error);
        return { data: [], total: 0 };
      }
    },
    [dispatch, toast] // Dependency chỉ có dispatch, không phụ thuộc vào list
  );

  // const handleOpenDialog = async (dialogKey, idsOrRecord = null) => {
  //   // logger.log(dialogKey);
  //   if (idsOrRecord) {
  //     if (dialogKey === "edit" || dialogKey === "view") {
  //       setSelectedIds(idsOrRecord);
  //       const result = await dispatch(fetchConfigurationAPIById(idsOrRecord)).unwrap();
  //       reset(result.data);
  //     } else if (dialogKey === "delete") {
  //       setSelectedIds(
  //         Array.isArray(idsOrRecord) ? idsOrRecord : [idsOrRecord]
  //       );
  //     }
  //   }
  //   setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
  // };

  const handleOpenDialog = useCallback(
  async (dialogKey, idsOrRecord = null) => {
    if (idsOrRecord) {
      if (dialogKey === "edit" || dialogKey === "view") {
        setSelectedIds(idsOrRecord);

        const result = await dispatch(fetchConfigurationAPIById(idsOrRecord)).unwrap();
        reset(result.data);
      } else if (dialogKey === "delete") {
        setSelectedIds(
          Array.isArray(idsOrRecord) ? idsOrRecord : [idsOrRecord]
        );
      }
    }
    setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
  },
  [dispatch, reset, setSelectedIds, setOpenDialogs]
);


  // const handleCloseDialog = (dialogKey) => {
  //   setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
  //   setIsLoading(false); // Đảm bảo reset loading khi đóng dialog
  //   if (dialogKey === "edit" || dialogKey === "view" || dialogKey === "add") {
  //     reset(defaultValue); // Reset form khi đóng Edit hoặc View
  //   }
  //   reset(undefined, { keepValues: true });
  // };

  const handleCloseDialog = useCallback(
  (dialogKey) => {
    setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
    setIsLoading(false); // Đảm bảo reset loading khi đóng dialog

    if (dialogKey === "edit" || dialogKey === "view" || dialogKey === "add") {
      reset(defaultValue); // Reset form khi đóng Edit hoặc View
    }

    reset(undefined, { keepValues: true });
  },
  [reset, setOpenDialogs, setIsLoading]
);


  const handleDelete = async () => {
    if (!selectedIds?.length) {
      toast("Vui lòng chọn ít nhất một dòng để xóa!", "warning");
      return;
    }
    setIsLoading(true);
    try {
      await Promise.all(
        selectedIds.map((id) => dispatch(deleteConfigurationAPI(id)))
      );
      handleCloseDialog("delete");
      setSelectedIds();
      setRefreshTrigger((prev) => prev + 1);
      setIsLoading(false);
      toast(`Đã xóa ${selectedIds.length} bản ghi thành công!`, "success");
    } catch (error) {
      setIsLoading(false);
      toast(error.error, "error");
    }
  };

  const onUpdate = async (data) => {
    const id = selectedIds;
    // logger.log(data);
    setIsLoading(true);

    try {
      const action = await dispatch(
        updateConfigurationAPI({ id, updatedData: data })
      );

      // Kiểm tra nếu API cập nhật thành công
      if (updateConfigurationAPI.fulfilled.match(action)) {
        reset(defaultValue);
        setRefreshTrigger((prev) => prev + 1);
        setLatestUpdatedId(id);
        handleCloseDialog("edit");
        setSelectedIds(null);
        toast("Cập nhật thành công!", "success");
      } else {
        // Nếu API trả về lỗi từ rejectWithValue
        throw action.payload || new Error("Có lỗi xảy ra!");
      }
      setIsLoading(false);
    } catch (error) {
      // logger.error("Lỗi cập nhật:", error);
      toast(Array.isArray(error.errors) ? error.errors[0].message : error.message || error.error, "error");
      setIsLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setIsLoading(true);

    try {
      const result = await dispatch(addApiConfigurationCategory(data)).unwrap(); // Lấy dữ liệu trả về từ API
      setLatestUpdatedId(result._id);
      handleCloseDialog("add");
      reset(defaultValue);
      setRefreshTrigger((prev) => prev + 1);
      setIsLoading(false);
      toast("Thêm mới thành công!", "success");
    } catch (error) {
      // logger.error("Lỗi cập nhật:", error);
      setIsLoading(false);
      toast(Array.isArray(error.errors) ? error.errors[0].message : error.message || error.error, "error");
    }
  };
  // const handleSearch = async (query, code) => {
  //   logger.log(code);
  //   if (query === "") {
  //     dispatch(fetchTemplateCategories());
  //   } else {
  //     dispatch(fetchSearchTemplate({ query, code }));
  //   }
  // };

  const handleAdd = useCallback(() => {
    handleOpenDialog("add");
  }, [handleOpenDialog]);

  const handleEdit = useCallback((record) => {
    handleOpenDialog("edit", record);
  }, [handleOpenDialog]);

  const handleView = useCallback((record) => {
    handleOpenDialog("view", record);
  }, [handleOpenDialog]);

  const handleDeleteClick = useCallback((ids) => {
    handleOpenDialog("delete", ids);
  }, [handleOpenDialog]);

  const handleCloseAddDialog = useCallback(() => handleCloseDialog("add"), [handleCloseDialog]);
  const handleCloseEditDialog = useCallback(() => handleCloseDialog("edit"), [handleCloseDialog]);
  const handleCloseViewDialog = useCallback(() => handleCloseDialog("view"), [handleCloseDialog]);
  const handleCloseDeleteDialog = useCallback(() => handleCloseDialog("delete"), [handleCloseDialog]);

  return (
    <>
      <CustomTable
        // data={categories || []}
        disableSynchronize
        fetchData={fetchDataFromApi}
        disableMore
        filter={filters}
        columns={columns}
        // onAdd={() => handleOpenDialog("add")}
        // onDelete={(ids) => handleOpenDialog("delete", ids)}
        // onEdit={(record) => handleOpenDialog("edit", record)}
        // onView={(record) => handleOpenDialog("view", record)}
        onAdd={handleAdd}
        onDelete={handleDeleteClick}
        onEdit={handleEdit}
        onView={handleView}
        // onSearch={(query, code) => handleSearch(query, code)}
        latestUpdatedId={latestUpdatedId} // Truyền latestUpdatedId vào CustomTable
        refreshTrigger={refreshTrigger}
				encodeHtml
      >
        <AddTemplateDialog
          open={openDialogs.add}
          // onClose={() => handleCloseDialog("add")}
          onClose={handleCloseAddDialog}
          onSave={handleSubmit(onSubmit)}
          control={control}
          // handleSubmit={handleSubmit}
          onSubmit={onSubmit}
          errors={errors}
          isLoading={isLoading} // Truyền isLoading để disable button và hiển thị loading
        />
        <EditTemplateDialog
          open={openDialogs.edit}
          // onClose={() => handleCloseDialog("edit")}
          onClose={handleCloseEditDialog}
          onSave={handleSubmit(onUpdate)}
          control={control}
          // handleSubmit={handleSubmit}
          onUpdate={onUpdate}
          errors={errors}
          isLoading={isLoading} // Truyền isLoading để disable button và hiển thị loading
        />
        <ViewTemplateDialog
          open={openDialogs.view}
          // onClose={() => handleCloseDialog("view")}
          onClose={handleCloseViewDialog}
          control={control}
        // handleSubmit={handleSubmit}
        // onSubmit={onSubmit}
        />
        <DeleteTemplateDialog
          open={openDialogs.delete}
          // onClose={() => handleCloseDialog("delete")}
          onClose={handleCloseDeleteDialog}
          onSave={handleDelete}
          selectedIds={selectedIds}
          isLoading={isLoading} // Truyền isLoading để disable button và hiển thị loading
        />
      </CustomTable>
    </>
  );
}

export default APIConfiguration;
