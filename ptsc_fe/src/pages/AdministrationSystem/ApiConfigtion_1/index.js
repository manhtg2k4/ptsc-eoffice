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
  fetchConfigurationAPIById,
  // fetchSearchTemplate,
  fetchTemplateCategories,
  updateConfigurationAPI
} from "@redux/slices/AdministrationSystem/generalCategories";
import { columns, defaultValue, filters, templateSchema } from "./constant";
// import CustomAutocomplete from "@components/CustomAutocomplete";
import AddTemplateDialog from "./components/AddTemplateDialog";
import EditTemplateDialog from "./components/EditTemplateDialog";
import ViewTemplateDialog from "./components/ViewTemplateDialog";
import DeleteTemplateDialog from "./components/DeleteTemplateDialog";
import { delay } from "./utils";

function GeneralCategories() {
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
    reset,
    formState: { errors },
    setValue,
    getValues,
    trigger,
    setError
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
  //   if (idsOrRecord) {
  //     if (dialogKey === "edit" || dialogKey === "view") {
  //       setSelectedIds(idsOrRecord);
  //       const result = await dispatch(fetchConfigurationAPIById(idsOrRecord)).unwrap();
  //       // Kiểm tra và bổ sung categoryCode nếu thiếu
  //       const formData = {
  //         ...defaultValue,
  //         ...result.data,
  //         categoryCode: result.data.categoryCode || "", // Đảm bảo categoryCode không undefined
  //       };
  //       reset(formData);
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

        // Kiểm tra và bổ sung categoryCode nếu thiếu
        const formData = {
          ...defaultValue,
          ...result.data,
          categoryCode: result.data.categoryCode || "", // đảm bảo không undefined
        };
        reset(formData);
      } else if (dialogKey === "delete") {
        setSelectedIds(
          Array.isArray(idsOrRecord) ? idsOrRecord : [idsOrRecord]
        );
      }
    }
    setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
  },
  [dispatch, reset, setOpenDialogs, setSelectedIds]
);


  // const handleCloseDialog = (dialogKey) => {
  //   setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
  //   setIsLoading(false);
  //   if (dialogKey === "edit" || dialogKey === "view" || dialogKey === "add") {
  //     reset(defaultValue); // Đảm bảo defaultValue có categoryCode
  //   }
  // };

  const handleCloseDialog = useCallback(
  (dialogKey) => {
    setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
    setIsLoading(false);
    if (dialogKey === "edit" || dialogKey === "view" || dialogKey === "add") {
      reset(defaultValue); // đảm bảo defaultValue đã có categoryCode
    }
  },
  [reset, setOpenDialogs, setIsLoading]
);


  // const handleDelete = async () => {

  //   if (!selectedIds?.length) {
  //     toast("Vui lòng chọn ít nhất một dòng để xóa!", "warning");
  //     return;
  //   }
  //   setIsLoading(true);


  //   try {
  //     await Promise.all(
  //       selectedIds.map((id) => dispatch(deleteConfigurationAPI(id)))
  //     );
  //     handleCloseDialog("delete");
  //     setSelectedIds();
  //     setRefreshTrigger((prev) => prev + 1);
  //     setIsLoading(false);
  //     toast(`Đã xóa ${selectedIds.length} bản ghi thành công!`, "success");
  //   } catch (error) {
  //     setIsLoading(false);
  //     toast(error.error, "error");
  //   }
  // };


  const handleDelete = async () => {
    if (!selectedIds?.length) {
      toast("Vui lòng chọn ít nhất một dòng để xóa!", "warning");
      return;
    }

    setIsLoading(true);

    try {

      const resultList = await Promise.all(
        selectedIds.map(async (id) => {
          const response = await dispatch(fetchConfigurationAPIById(id)).unwrap();
          return response.data;
        })
      );

      const deletableIds = resultList
        .filter((item) => item.isRequired === false)
        .map((item) => item._id);

      const undeletableCount = selectedIds.length - deletableIds.length;

      if (!deletableIds.length) {
        toast("Không có bản ghi nào có thể xóa vì tất cả đều là bắt buộc!", "warning");
        return;
      }

      if (undeletableCount > 0) {
        toast(`${undeletableCount} bản ghi không thể xóa vì đang là bắt buộc.`, "info");
        await delay(1500)
      }


      await Promise.all(
        deletableIds.map((id) => dispatch(deleteConfigurationAPI(id)))
      );

      handleCloseDialog("delete");
      setSelectedIds([]);
      setRefreshTrigger((prev) => prev + 1);
      toast(`Đã xóa ${deletableIds.length} bản ghi thành công!`, "success");
      await delay(1500)

    } catch (error) {
      toast(error?.error || "Đã xảy ra lỗi khi xóa!", "error");
    } finally {
      setIsLoading(false);
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

      const serverErrors = error.errors;

      if (Array.isArray(serverErrors)) {

        serverErrors.forEach((err) => {
          // err.field có thể là: "0.code" → ta chuyển thành: "valueList.0.code"
          const fieldPath = `valueList.${err.field}`;

          setError(fieldPath, {
            type: "server",
            message: err.message,
          });
        });
      }

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
      const serverErrors = error.errors;

      if (Array.isArray(serverErrors)) {

        serverErrors.forEach((err) => {
          // err.field có thể là: "0.code" → ta chuyển thành: "valueList.0.code"
          const fieldPath = `valueList.${err.field}`;

          setError(fieldPath, {
            type: "server",
            message: err.message,
          });
        });
      }

      toast(Array.isArray(error.errors) ? error.errors[0].message : error.message || error.error, "error");
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
      // disableSpecialChars
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
          // onSave={(data) => onSubmit(data)}
          onSave={onSubmit}
          control={control}
          // handleSubmit={handleSubmit}
          errors={errors}
          isLoading={isLoading} // Truyền isLoading để disable button và hiển thị loading
          setValue={setValue}
          getValues={getValues}
          trigger={trigger}
        />
        <EditTemplateDialog
          open={openDialogs.edit}
          // onClose={() => handleCloseDialog("edit")}
          // onSave={(data) => onUpdate(data)}
          onClose={handleCloseEditDialog}
          onSave={onUpdate}
          control={control}
          // handleSubmit={handleSubmit}
          errors={errors}
          isLoading={isLoading} // Truyền isLoading để disable button và hiển thị loading
          setValue={setValue}
          getValues={getValues}
          trigger={trigger}

        />
        <ViewTemplateDialog
          open={openDialogs.view}
          // onClose={() => handleCloseDialog("view")}
          onClose={handleCloseViewDialog}
          control={control}
          // handleSubmit={handleSubmit}
          // onSubmit={onSubmit}
          onUpdate={onUpdate}
          errors={errors}
          isLoading={isLoading} 
          setValue={setValue}
          getValues={getValues}
        />
        <DeleteTemplateDialog
          open={openDialogs.delete}
          // onClose={() => handleCloseDialog("delete")}
          onClose={handleCloseDeleteDialog}
          onSave={handleDelete}
          selectedIds={selectedIds}
          isLoading={isLoading} 
        />
      </CustomTable>
    </>
  );
}

export default GeneralCategories;
