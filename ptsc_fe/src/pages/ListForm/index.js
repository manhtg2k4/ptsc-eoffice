import React, { useCallback, useState } from "react";
import CustomTable from "@components/CustomTable/CustomTable";
import { defaultValue, formListSchema, filters } from "./constants";
import { useDispatch } from "react-redux";

import { useToast } from "@components/common/ToastProvider";
import {
  fetchListFormBpmn,
  addFormBpmn,
  getFormBpmnDetail,
  deleteFormBpmn,
  updateFormBpmn,
} from "@redux/slices/BPMN/FormlistSlice";
import { useForm } from "react-hook-form";
import FormList from "./FormList";
import { yupResolver } from "@hookform/resolvers/yup";
import Delete from "./Delete";
import EditDialog from "./EditDialog";
import ViewDialog from "./View";
import PropTypes from "prop-types";

function ListForm({ idList, tableMaxHeightOffset = 380 }) {
  const dispatch = useDispatch();
  const toast = useToast();

  const [openDialogs, setOpenDialogs] = useState({
    delete: false,
    view: false,
    add: false,
    edit: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState();
  const [latestUpdatedId, setLatestUpdatedId] = useState(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dataDetailTable, setDataDetailTable] = useState([]);
  const [dataVersion, setDataVersion] = useState(0);

  const {
    reset,
    control,
    getValues,
    // handleSubmit,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(formListSchema),
    defaultValues: defaultValue,
    mode: "onChange",
  });

  //  const handleOpenDialog = async (dialogKey, idsOrRecord = null) => {
  //   if (dialogKey === "add") {
  //     // Reset form về giá trị mặc định khi mở dialog thêm mới
  //     reset(defaultValue);
  //     setOpenDialogs((prev) => ({ ...prev, add: true }));
  //     return;
  //   }

  //   if (dialogKey === "edit" || dialogKey === "view") {
  //     setSelectedIds(idsOrRecord);
  //     const result = await dispatch(getFormBpmnDetail(idsOrRecord)).unwrap();
  //     reset(result);
  //     setDataDetailTable(result.field);
  //   } else if (dialogKey === "delete") {
  //     setSelectedIds(
  //       Array.isArray(idsOrRecord) ? idsOrRecord : [idsOrRecord]
  //     );
  //   }

  //   setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
  // };

  const handleOpenDialog = useCallback(
    async (dialogKey, idsOrRecord = null) => {
      if (dialogKey === "add") {
        reset(defaultValue);
        setOpenDialogs((prev) => ({ ...prev, add: true }));
        return;
      }

      if (dialogKey === "edit" || dialogKey === "view") {
        setSelectedIds(idsOrRecord);
        
        try {
          const result = await dispatch(getFormBpmnDetail(idsOrRecord)).unwrap();
          reset(result);
          setDataDetailTable(result.field);
          setDataVersion(prev => prev + 1); 
          setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
        } catch (error) {
          toast("Không thể tải dữ liệu!", "error");
        }
      } else if (dialogKey === "delete") {
        setSelectedIds(
          Array.isArray(idsOrRecord) ? idsOrRecord : [idsOrRecord]
        );
        setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
      }
    },
    [dispatch, reset, toast]
  );

  // const handleCloseDialog = (dialogKey) => {
  //   setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
  // };

  const handleCloseDialog = useCallback((dialogKey) => {
    setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
  }, []);

  const fetchDataFromApi = useCallback(
    async ({ page, limit, query, code, sort, processID }) => {
      if (!page || !limit) {
        return { data: [], total: 0 };
      }
      try {
        // Hoàn tác lại để truyền `query` và `code` tới thunk theo yêu cầu.
        // Thao tác này sẽ gửi các tham số riêng biệt cho mỗi trường tìm kiếm (ví dụ: `code=...&name=...`).
        const response = await dispatch(
          fetchListFormBpmn({ page, limit, query, code, sort, processID })
        ).unwrap();

        return {
          data: response.data || [],
          total: response.total || response.length || 0,
        };
      } catch (error) {
        return { data: [], total: 0 };
      }
    },
    [dispatch]
  );
  //Thêm mới
  const onAdd = async (data) => {
    try {
      await dispatch(addFormBpmn(data)).unwrap();
      setOpenDialogs((prev) => ({ ...prev, add: false }));
      setRefreshTrigger((prev) => prev + 1);
      toast("Thêm mới thành công!", "success");
    } catch (error) {
      const errorMessage = error?.message || "Đã xảy ra lỗi không xác định";
      toast(errorMessage, "error");
    }
  };

  //Xóa
  const handleDelete = async () => {
    setIsLoading(true);
    if (!selectedIds?.length) {
      toast("Vui lòng chọn ít nhất một bản ghi để xóa!", "warning");
      return;
    }
    try {
      await dispatch(deleteFormBpmn(selectedIds)).unwrap();
      handleCloseDialog("delete");
      setIsLoading(false);
      setRefreshTrigger((prev) => prev + 1);
      toast(`Đã xóa ${selectedIds.length} bản ghi thành công!`, "success");
    } catch (error) {
      toast("Đã xảy ra lỗi khi xóa!", "error");
      setIsLoading(false);
    }
  };

  //Cập nhật
  const onUpdate = async (data) => {
    const id = selectedIds;
    setIsLoading(true);

    try {
      const updateAction = await dispatch(
        updateFormBpmn({ id, updatedData: data })
      );

      if (updateFormBpmn.fulfilled.match(updateAction)) {
        toast("Cập nhật thành công!", "success");
        // Tải lại dữ liệu chi tiết ngay sau khi cập nhật thành công
        const result = await dispatch(getFormBpmnDetail(id)).unwrap();
        reset(result);
        setDataDetailTable(result.field);
        setLatestUpdatedId(id);
        handleCloseDialog("edit");
        setIsLoading(false);
        setSelectedIds(null);
        setRefreshTrigger((prev) => prev + 1);
      } else {
        const errorMsg =
          updateAction.payload?.errors.map((e) => e.message).join("\n") ||
          "Cập nhật thất bại!";
        toast(errorMsg, "error");
      }
    } catch (error) {
      let errorMsg = "Đã xảy ra lỗi khi cập nhật!";
      if (error?.errors && Array.isArray(error.errors)) {
        errorMsg = error.errors.map((e) => e.message).join("\n");
      } else if (error?.message) {
        errorMsg = error.message;
      }
      toast(errorMsg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = useCallback(
    (codes) => handleOpenDialog("delete", codes),
    [handleOpenDialog]
  );
  const handleViewClick = useCallback(
    (id) => handleOpenDialog("view", id),
    [handleOpenDialog]
  );
  const handleAddClick = useCallback(
    (id) => handleOpenDialog("add", id),
    [handleOpenDialog]
  );
  const handleEditClick = useCallback(
    (record) => handleOpenDialog("edit", record),
    [handleOpenDialog]
  );

  const handleCloseAddDialog = useCallback(
    () => handleCloseDialog("add"),
    [handleCloseDialog]
  );
  const handleCloseEditDialog = useCallback(
    () => handleCloseDialog("edit"),
    [handleCloseDialog]
  );
  const handleCloseViewDialog = useCallback(
    () => handleCloseDialog("view"),
    [handleCloseDialog]
  );
  const handleCloseDeleteDialog = useCallback(
    () => handleCloseDialog("delete"),
    [handleCloseDialog]
  );

  return (
    <>
      <div style={{ width: "100%" }}>
      <CustomTable
        codeModule="AttributeSetBPMN"
        latestUpdatedId={latestUpdatedId}
        idList={idList}
        fetchData={fetchDataFromApi}
        filter={filters}
        disableMore
        disableSynchronize
        // onDelete={(ids) => handleOpenDialog("delete", ids)}
        // onDelete={(codes) => handleOpenDialog("delete", codes)}
        // onView={(id) => handleOpenDialog("view", id)}
        // onAdd={(id) => handleOpenDialog("add", id)}
        // onEdit={(record) => handleOpenDialog("edit", record)}
        onDelete={handleDeleteClick}
        onView={handleViewClick}
        onAdd={handleAddClick}
        onEdit={handleEditClick}
        refreshTrigger={refreshTrigger}
        isDeleteWithCode
        customMaxHeight={tableMaxHeightOffset}
        fixedHeight
        forceFooterFullWidth
				filterPopupAlignLeft
				encodeHtml
      >
        <FormList
          title="Thêm mới cấu hình thuộc tính"
          open={openDialogs.add}
          control={control}
          getValues={getValues}
          idList={idList}
          // onClose={() => handleCloseDialog("add")}
          onClose={handleCloseAddDialog}
          onSave={onAdd}
          errors={errors}
          trigger={trigger}
        />
        <EditDialog
          key={`edit-${dataVersion}`}
          open={openDialogs.edit}
          idList={idList}
          // onClose={() => handleCloseDialog("edit")}
          onClose={handleCloseEditDialog}
          onSubmit={onUpdate}
          control={control}
          errors={errors}
          // handleSubmit={handleSubmit}
          getValues={getValues}
          isLoading={isLoading}
          trigger={trigger}
          reset={reset}
          defaultValues={dataDetailTable}
        />
        <ViewDialog
          key={`view-${selectedIds}-${dataVersion}`}
          open={openDialogs.view}
          idList={idList}
          // onClose={() => handleCloseDialog("view")}
          onClose={handleCloseViewDialog}
          getValues={getValues}
          control={control}
          errors={errors}
          reset={reset}
          defaultValues={dataDetailTable}
        />
        <Delete
          open={openDialogs.delete}
          idList={idList}
          // onClose={() => handleCloseDialog("delete")}
          onClose={handleCloseDeleteDialog}
          onSave={handleDelete}
          selectedIds={selectedIds}
          isLoading={isLoading}
        />
      </CustomTable>
      </div>
    </>
  );
}
ListForm.propTypes = {
  idList: PropTypes.any, // Change 'any' to the appropriate type if known (e.g., PropTypes.string, PropTypes.array)
  tableMaxHeightOffset: PropTypes.number,
};

export default ListForm;
