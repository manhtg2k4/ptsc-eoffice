import React, { useCallback, useState } from "react";
import CustomTable from "@components/CustomTable/CustomTable";
import { useDispatch, useSelector } from "react-redux";
import { useToast } from "@components/common/ToastProvider";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  addApiConfigurationCategory,
  addApiConfigurationUpdate,
  deleteConfigurationAPI,
  fetchConfigurationAPIById,
  fetchTemplateCategories,
  // getParentId,
} from "@redux/slices/AdministrationSystem/functionManagement";
import { defaultValue, filters, templateSchema } from "./constant";
import TemplateDialog from "./components/TemplateDialog";
import ViewTemplateDialog from "./components/ViewTemplateDialog";
import DeleteTemplateDialog from "./components/DeleteTemplateDialog";
import PropTypes from "prop-types";

function FunctionManagement({ idList = '', tableMaxHeightOffset }) {
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
  const { categories } = useSelector((state) => state.functionManagement);
  const methods = useForm({
    resolver: yupResolver(templateSchema),
    defaultValues: defaultValue,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  // useEffect(() => {
  //   dispatch(getParentId());
  // }, [dispatch]);
  // Sử dụng useCallback để ổn định tham chiếu của fetchDataFromApi
  const fetchDataFromApi = useCallback(
    async ({ page, limit, query, code, sort, processID }) => {
      if (!page || !limit) {
        return { data: [], total: 0 };
      }
      try {
        // Luôn gửi tất cả các tham số, thunk sẽ xử lý logic.
        const response = await dispatch(
          fetchTemplateCategories({
            page,
            limit,
            query,
            code,
            sort,
            processID,
          })
        ).unwrap();
        return {
          data: response.data || [],
          total: response.total || response.length || 0,
        };
      } catch (error) {
        toast("Lỗi hệ thống", "warning");
        return { data: [], total: 0 };
      }
    },
    [dispatch, toast]
  );

  // useEffect(() => {
  //   dispatch(getParentId());
  // }, [dispatch, openDialogs]);

  // const handleOpenDialog = async (dialogKey, idsOrRecord = null) => {
  //   // logger.log(dialogKey);
  //   if (idsOrRecord) {
  //     if (dialogKey === "edit" || dialogKey === "view") {
  //       setSelectedIds(idsOrRecord);
  //       const result = await dispatch(
  //         fetchConfigurationAPIById(idsOrRecord)
  //       ).unwrap();

  //       methods.reset(result.data);
  //     } else if (dialogKey === "delete") {
  //       setSelectedIds(
  //         Array.isArray(idsOrRecord) ? idsOrRecord : [idsOrRecord]
  //       );
  //     }
  //     dispatch(getParentId());
  //   }
  //   setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
  // };

  // const handleCloseDialog = (dialogKey) => {
  //   setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
  //   setIsLoading(false); // Đảm bảo reset loading khi đóng dialog
  //   if (dialogKey === "edit" || dialogKey === "view" || dialogKey === "add") {
  //     methods.reset(defaultValue); // Reset form khi đóng Edit hoặc View
  //   }
  //   methods.reset(undefined, { keepValues: true });
  // };

  const handleOpenDialog = useCallback(
    async (dialogKey, idsOrRecord = null) => {
      if (idsOrRecord) {
        if (dialogKey === "edit" || dialogKey === "view") {
          setSelectedIds(idsOrRecord);
          const result = await dispatch(
            fetchConfigurationAPIById(idsOrRecord)
          ).unwrap();
          methods.reset(result.data);
        } else if (dialogKey === "delete") {
          setSelectedIds(
            Array.isArray(idsOrRecord) ? idsOrRecord : [idsOrRecord]
          );
        }
        // dispatch(getParentId());
      }
      setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
    },
    [dispatch, methods]
  );

  const handleCloseDialog = useCallback(
    (dialogKey) => {
      setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
      setIsLoading(false);
      if (dialogKey === "edit" || dialogKey === "view" || dialogKey === "add") {
        methods.reset(defaultValue);
      }
      methods.reset(undefined, { keepValues: true });
    },
    [methods]
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
      toast("Đã xảy ra lỗi khi xóa!", "error");
    }
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const result = await dispatch(addApiConfigurationCategory(data)).unwrap(); // Lấy dữ liệu trả về từ API
      setLatestUpdatedId(result._id);
      handleCloseDialog("add");
      methods.reset(defaultValue);
      // dispatch(getParentId());
      setRefreshTrigger((prev) => prev + 1);
      setIsLoading(false);
      toast("Thêm mới thành công!", "success");
      return result
    } catch (error) {
      setIsLoading(false);
      toast(
        Array.isArray(error?.errors)
          ? error.errors[0].message
          : error.error
            ? error.error
            : error.message,
        "error"
      );
    }
  };

  const handleUpdate = async (data) => {
    setIsLoading(true);
    try {
      const result = await dispatch(
        addApiConfigurationUpdate({ id: selectedIds, data, processID: idList })
      ).unwrap();
      setLatestUpdatedId(result._id);
      handleCloseDialog("edit");
      methods.reset(defaultValue);
      // dispatch(getParentId());
      setRefreshTrigger((prev) => prev + 1);
      setIsLoading(false);
      toast("Cập nhật thành công!", "success");
    } catch (error) {
      setIsLoading(false);
      toast(
        Array.isArray(error?.errors)
          ? error.errors[0].message
          : error.error
            ? error.error
            : error.message,
        "error"
      );
    }
  };

  const handleDuplicate = async (idsOrRecord) => {
    const { data: result } = await dispatch(fetchConfigurationAPIById(idsOrRecord)).unwrap();

    // Clone object để có thể chỉnh sửa
    const cloned = JSON.parse(JSON.stringify(result));

    // Clean up fields to remove
    delete cloned._id;
    delete cloned.createdAt;
    delete cloned.updatedAt;
    delete cloned.__v;

    const uniqueCode = crypto.randomUUID().split('-')[0].toUpperCase();

    // const timestamp = Date.now().toString().slice(-4);
    const prefix = cloned.featureType;

    cloned.code = `${prefix}${uniqueCode}`;
    cloned.name = `${cloned.name} ${uniqueCode}`;
    cloned.url = `${cloned.url}-${uniqueCode}`;

    // if (cloned.valueField) {
    //   cloned.valueField.code = `hskt_${uniqueCode}`;
    // }

    await onSubmit(cloned);
  };

  // onSubmit giữ nguyên, nhưng giờ gọi từ ngoài: const newResult = await handleDuplicate(id); then onSubmit(newResult);
  // const handleSearch = async (query, code) => {
  //   logger.log(code);
  //   if (query === "") {
  //     dispatch(fetchTemplateCategories());
  //   } else {
  //     dispatch(fetchSearchTemplate({ query, code }));
  //   }
  // };

  const handleAdd = useCallback(() => handleOpenDialog("add"), [handleOpenDialog]);
  const handleOpenDeleteDialog = useCallback((ids) => handleOpenDialog("delete", ids), [handleOpenDialog]);
  const handleEdit = useCallback((record) => handleOpenDialog("edit", record), [handleOpenDialog]);
  const handleView = useCallback((record) => handleOpenDialog("view", record), [handleOpenDialog]);

  const handleCloseAdd = useCallback(() => handleCloseDialog("add"), [handleCloseDialog]);
  const handleCloseEdit = useCallback(() => handleCloseDialog("edit"), [handleCloseDialog]);
  const handleCloseView = useCallback(() => handleCloseDialog("view"), [handleCloseDialog]);
  const handleCloseDelete = useCallback(() => handleCloseDialog("delete"), [handleCloseDialog]);

  return (
    <>
      <div style={{ width: "100%" }}>
      <CustomTable
        codeModule="FunctionalManagementBPMN"
        disableSynchronize
        isMaxHeight
        idList={idList}
        fetchData={fetchDataFromApi}
        filter={filters}
        onAdd={handleAdd}
        onDelete={handleOpenDeleteDialog}
        onEdit={handleEdit}
        onView={handleView}
        // onSearch={(query, code) => handleSearch(query, code)}
        latestUpdatedId={latestUpdatedId}
        refreshTrigger={refreshTrigger}
        optionMore={[{
          title: 'Sao chép',
          onClick: handleDuplicate
        }]}
        fixedHeight
        customMaxHeight={tableMaxHeightOffset}
        forceFooterFullWidth
				filterPopupAlignLeft
				encodeHtml
      >
        {openDialogs.add && (
          <TemplateDialog
            idList={idList}
            title="Thêm mới chức năng"
            open={openDialogs.add}
            onClose={handleCloseAdd}
            onSave={onSubmit}
            control={methods.control}
            // handleSubmit={handleSubmit}
            onSubmit={onSubmit}
            errors={methods.errors}
            methods={methods}
            isLoading={isLoading} // Truyền isLoading để disable button và hiển thị loading
            dataSelect={categories}
          />
        )}

        {openDialogs.edit && (
          <TemplateDialog
            idList={idList}
            title="Sửa chức năng"
            open={openDialogs.edit}
            onClose={handleCloseEdit}
            onSave={handleUpdate}
            control={methods.control}
            // handleSubmit={handleSubmit}
            onSubmit={handleUpdate}
            errors={methods.errors}
            methods={methods}
            isLoading={isLoading} // Truyền isLoading để disable button và hiển thị loading
            dataSelect={categories}
          />
        )}
        <ViewTemplateDialog
          idList={idList}
          open={openDialogs.view}
          onClose={handleCloseView}
          control={methods.control}
          // handleSubmit={handleSubmit}
          // onSubmit={onSubmit}
          dataSelect={categories}
        />
        <DeleteTemplateDialog
          open={openDialogs.delete}
          onClose={handleCloseDelete}
          onSave={handleDelete}
          selectedIds={selectedIds}
          isLoading={isLoading} // Truyền isLoading để disable button và hiển thị loading
        />
      </CustomTable>
      </div>
    </>
  );
}
FunctionManagement.propTypes = {
  idList: PropTypes.any,
  tableMaxHeightOffset: PropTypes.number,
};

export default FunctionManagement;
