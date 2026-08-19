import { useCallback, useEffect, useState } from "react";
import CustomTableTree from "@components/CustomTable/CustomTableTree";
import { useDispatch, useSelector } from "react-redux";
import { useToast } from "@components/common/ToastProvider";
import { useForm } from "react-hook-form";
import {
  getDataListUnit,
  getListTypeUnit,
  getListPosition,
  getDataDetailUnit,
  addUnit,
  updateUnit,
  deleteUnit,
  getDataDetailUnitUpdate,
} from "@redux/slices/SharedCategory/managementUnitSlice";
import {
  columnsDistrict,
  defaultFormValuesDistrict,
  documentSchema,
  filtersDistrict,
} from "@pages/Users/constantsDistrict";
import AddDialog from "./components/AddDialog";
import EditDialog from "./components/EditDialog";
import DeleteDialog from "./components/DeleteDialog";
import { yupResolver } from "@hookform/resolvers/yup";
import { normalizeApiData } from "./utilsDistrict";
import ViewUnitDetail from "./components/ViewUnitDetail";

const ManagementUnit = () => {
  const dispatch = useDispatch();
  const { listUnit, listTypeUnit, listPosition } = useSelector(
    (state) => state.unit
  );
  const toast = useToast();
  const [openDialogs, setOpenDialogs] = useState({
    view: false,
    edit: false,
    add: false,
    delete: false,
  });
  const [isLoading, setIsLoading] = useState(false); // Thêm state để quản lý loading
  const [reload, setReload] = useState(false);

  const [selectedIds, setSelectedIds] = useState();
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [open, setOpen] = useState(false);
  const {
    control,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: defaultFormValuesDistrict,
    resolver: yupResolver(documentSchema),
  });
  useEffect(() => {
    dispatch(getListTypeUnit());
    dispatch(getListPosition());
  }, [dispatch]);

  const getDataDistrictFromApi = useCallback(
    async ({ page, limit, query, code, sort }) => {
      if (!page || !limit) {
        return { data: [], total: 0 };
      }
      try {
        let response;
        if (query !== "" && code && sort) {
          //Tìm kiếm rơi vào nhánh này
          response = await dispatch(
            getDataListUnit({ page, limit, query, code, sort })
          ).unwrap();
        } else if (sort) {
          //Chỉ sort thì rơi vào nhánh này
          response = await dispatch(
            getDataListUnit({ page, limit, query, code, sort })
          ).unwrap();
        } else {
          //Mặc định
          response = await dispatch(
            getDataListUnit({ page, limit, sort })
          ).unwrap();
        }
        return {
          data: (response.data || []).map((item) => ({
            ...item,
            parent: item.parentId || item.parent?.id || null,
          })), // Giả sử fetchDocuments trả về mảng dữ liệu
          total: response.total || response.length || 0, // Cần điều chỉnh nếu API trả về total
        };
      } catch (error) {
        return { data: [], total: 0 };
      }
    },
    [dispatch] // Dependency chỉ có dispatch, không phụ thuộc vào list
  );
  const handleOpenDialog = useCallback(
    async (dialogKey, idsOrRecord = null) => {
      if (idsOrRecord) {
        if (dialogKey === "edit") {
          setSelectedIds(idsOrRecord);
          const result = await dispatch(
            getDataDetailUnitUpdate(idsOrRecord)
          ).unwrap();
          reset(result.data);
        } else if (dialogKey === "view") {
          setSelectedIds(idsOrRecord);
          const result = await dispatch(
            getDataDetailUnit(idsOrRecord)
          ).unwrap();
          reset(result.data);
        } else if (dialogKey === "delete") {
          setSelectedIds(
            Array.isArray(idsOrRecord) ? idsOrRecord : [idsOrRecord]
          );
        }
      }
      setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
    },
    [dispatch, reset]
  );

  const handleCloseDialog = (dialogKey) => {
    setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
    setReload(new Date() * 1);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    if (!selectedIds?.length) {
      toast("Vui lòng chọn ít nhất một dòng để xóa!", "warning");
      return;
    }
    try {
      await Promise.all(selectedIds.map((id) => dispatch(deleteUnit(id))));
      handleCloseDialog("delete");
      setSelectedIds();
      setIsLoading(false);
      toast(`Đã xóa ${selectedIds.length} bản ghi thành công!`, "success");
    } catch (error) {
      toast("Đã xảy ra lỗi khi xóa!", "error");
      setIsLoading(false);
    }
  };

  const onUpdate = async (data) => {
    const id = selectedIds;
    setIsLoading(true);
    const formattedData = normalizeApiData(data);

    if (formattedData.parent && typeof formattedData.parent === 'object') {
      formattedData.parent = formattedData.parent.id;
      formattedData.parentId = formattedData.parent.id;
    }

    try {
      const action = await dispatch(
        updateUnit({ id, updatedData: formattedData })
      );
      if (updateUnit.fulfilled.match(action)) {
        reset(defaultFormValuesDistrict);
        // setLatestUpdatedId(id);
        handleCloseDialog("edit");
        setSelectedIds(null);
        toast("Cập nhật thành công!", "success");
      } else {
        toast(action.payload || "Cập nhật thất bại!", "error");
      }
      setIsLoading(false);
    } catch (error) {
      toast("Đã xảy ra lỗi khi cập nhật!", "error");
      setIsLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setIsLoading(true); // Bật loading
    try {
      const formattedData = normalizeApiData(data);
      if (formattedData.parent && typeof formattedData.parent === 'object') {
        formattedData.parent = formattedData.parent.id;
        formattedData.parentId = formattedData.parent.id;
      }
      const result = await dispatch(addUnit(formattedData)).unwrap(); // Lấy dữ liệu từ API
      // Kiểm tra response có success hay không
      if (result?.success) {
        handleCloseDialog("add");
        reset(defaultFormValuesDistrict);
        toast("Thêm mới thành công!", "success");
      } else {
        toast(result?.message || "Thêm mới thất bại!", "error");
      }
    } catch (error) {
      toast(error?.message || "Đã xảy ra lỗi khi thêm mới!", "error");
    } finally {
      setIsLoading(false); // Tắt loading sau khi xong
    }
  };

  const handleClick = () => {
    setOpen(!open);
  };

  const handleClose = () => {
    setOpen(null);
  };

  const handleToggle = (key) => {
    const newPermissions = selectedPermissions.includes(key)
      ? selectedPermissions.filter((perm) => perm !== key)
      : [...selectedPermissions, key];

    setSelectedPermissions(newPermissions);
  };

  const handleAddOpenDialog = useCallback(() => {
    handleOpenDialog("add");
  }, [handleOpenDialog]);

  const handleOnDelelete = useCallback(
    (ids) => {
      handleOpenDialog("delete", ids);
    },
    [handleOpenDialog]
  );

  const handleOnView = useCallback(
    (record) => {
      handleOpenDialog("view", record);
    },
    [handleOpenDialog]
  );

  const handleOnEdit = useCallback(
    (record) => {
      // Open edit dialog for the selected record
      handleOpenDialog("edit", record);
    },
    [handleOpenDialog]
  );

  const handleOnCloseView = useCallback(() => {
    handleCloseDialog("view");
  }, []);
  const handleOnCloseAdd = useCallback(() => {
    handleCloseDialog("add");
  }, []);
  const handleOnCloseEdit = useCallback(() => {
    handleCloseDialog("edit");
  }, []);
  const handleOnCloseDelete = useCallback(() => {
    handleCloseDialog("delete");
  }, []);
  
  const formattedListUnit = listUnit?.map((item) => ({
    ...item,
    parent: item.parentId || item.parent?.id || null,
  })) || [];

  return (
    <>
      <CustomTableTree
        data={formattedListUnit}
        fetchData={getDataDistrictFromApi}
        reload={reload}
        disableSynchronize
        disableMore
        disableCheckbox
        columns={columnsDistrict}
        filter={filtersDistrict}
        onAdd={handleAddOpenDialog}
        onDelete={handleOnDelelete}
        onEdit={handleOnEdit}
        onView={handleOnView}
        isCheckTitle
        addButtonLabel="Thêm mới"
        actionIconSize="medium"
        useModernActionColors
        useModernPagination
				filterPopupAlignLeft
      >
        <AddDialog
          open={openDialogs.add}
          onClose={handleOnCloseAdd}
          onSave={handleSubmit(onSubmit)}
          control={control}
          handleSubmit={handleSubmit}
          onSubmit={onSubmit}
          errors={errors}
          isLoading={isLoading} // Truyền isLoading để disable button và hiển thị loading
          handleClick={handleClick}
          handleClose={handleClose}
          handleToggle={handleToggle}
          openPermistion={open}
          selectedPermissions={selectedPermissions}
          listTypeUnit={listTypeUnit}
          listPosition={listPosition}
          listUnit={listUnit}
        />

        <EditDialog
          open={openDialogs.edit}
          onClose={handleOnCloseEdit}
          onSave={handleSubmit(onUpdate)}
          control={control}
          handleSubmit={handleSubmit}
          onUpdate={onUpdate}
          errors={errors}
          isLoading={isLoading} // Truyền isLoading để disable button và hiển thị loading
          handleClick={handleClick}
          handleClose={handleClose}
          handleToggle={handleToggle}
          openPermistion={open}
          selectedPermissions={selectedPermissions}
          listTypeUnit={listTypeUnit}
          listPosition={listPosition}
          listUnit={listUnit}
        />

        <ViewUnitDetail
          open={openDialogs.view}
          onClose={handleOnCloseView}
          id={selectedIds}
        />

        <DeleteDialog
          open={openDialogs.delete}
          onClose={handleOnCloseDelete}
          onSave={handleDelete}
          selectedIds={selectedIds}
          isLoading={isLoading} // Truyền isLoading để disable button và hiển thị loading
        />
      </CustomTableTree>
    </>
  );
};

export default ManagementUnit;
