import React, { useCallback, useEffect, useState } from "react";
import CustomTableTree from "@components/CustomTable/CustomTableTree";
import { useDispatch, useSelector } from "react-redux";
import { useToast } from "@components/common/ToastProvider";
import { useForm } from "react-hook-form";
import {
  getDataListUnit,
  getListPosition,
  getDataDetailMenu,
  addMenu,
  updateMenu,
  deleteMenu,
  getDataDetailMenuUpdate,
  getListRoles,
  getListFunction,
} from "@redux/slices/ManagerMenu/managementMenuSlice";
import {
  columnsDistrict,
  defaultFormValuesDistrict,
  documentSchema,
  filtersDistrict,
} from "@pages/ManagementMenu/constantsDistrict";
import AddDialog from "./components/AddDialog";
import EditDialog from "./components/EditDialog";
import DeleteDialog from "./components/DeleteDialog";
import { yupResolver } from "@hookform/resolvers/yup";
// import { useNavigate } from "react-router-dom";
import ViewDialogMenu from "./components/ViewDialogMenu";
import { normalizeApiData } from "./utilsDistrict";

const ManagementMenu = () => {
  const dispatch = useDispatch();
  const { listMenu, listTypeUnit, listPosition, listRoles, listFunction } =
    useSelector((state) => state.menu);
  const toast = useToast();
  const [openDialogs, setOpenDialogs] = useState({
    view: false,
    edit: false,
    add: false,
    delete: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [reload, setReload] = useState(false);

  const [selectedIds, setSelectedIds] = useState();
  const [selectedPermissions] = useState([]);
  const [localListRoles, setLocalListRoles] = useState([]);

  const [open, setOpen] = useState(false);
  const {
    control,
    reset,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: defaultFormValuesDistrict,
    resolver: yupResolver(documentSchema),
    mode: "onChange",
  });
  // const navigate = useNavigate();
  useEffect(() => {
    dispatch(getListRoles());
    dispatch(getListFunction());
    dispatch(getListPosition());
  }, [dispatch]);

  useEffect(() => {
    if (listRoles?.length) {
      setLocalListRoles(listRoles);
    }
  }, [listRoles]);

  const getDataDistrictFromApi = useCallback(
    async ({ page, limit, query, code, sort }) => {
      if (!page || !limit) {
        return { data: [], total: 0 };
      }
      try {
        let response;
        if (query !== "" && code && sort) {
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
          data: response.data || [], // Giả sử fetchDocuments trả về mảng dữ liệu
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
      if (dialogKey === "add") {
        reset(defaultFormValuesDistrict);
      }
      if (idsOrRecord) {
        if (dialogKey === "edit") {
          setSelectedIds(idsOrRecord);
          try {
            const result = await dispatch(
              getDataDetailMenuUpdate(idsOrRecord)
            ).unwrap();
            const array = result?.data?.roleGroup?.roles || [];
            const newPermissions = array.map((item) => {
              const isChecked =
                Array.isArray(item.methods) &&
                item.methods.some((m) => m.allow === true);
              return { ...item, isChecked };
            });
            setLocalListRoles(newPermissions);
            
            // Map roleGroups to roleGroupIds for the form to render properly
            const formattedResult = { ...result.data };
            if (formattedResult.roleGroups) {
              formattedResult.roleGroupIds = formattedResult.roleGroups;
            }
            
            reset(formattedResult);
          } catch (error) {
            toast("Lỗi khi lấy chi tiết menu!", "error");
          }
        } else if (dialogKey === "view") {
          setSelectedIds(idsOrRecord);
          try {
            const result = await dispatch(getDataDetailMenu(idsOrRecord)).unwrap();
            
            // Map roleGroups to roleGroupIds for the view dialog
            const formattedResult = { ...result.data };
            if (formattedResult.roleGroups) {
              formattedResult.roleGroupIds = formattedResult.roleGroups;
            }
            
            reset(formattedResult);
          } catch (error) {
            toast("Lỗi khi lấy chi tiết menu!", "error");
          }
        } else if (dialogKey === "delete") {
          setSelectedIds(
            Array.isArray(idsOrRecord) ? idsOrRecord : [idsOrRecord]
          );
        }
      }
      setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
    },
    [dispatch, reset, toast]
  );

  const handleCloseDialog = useCallback(
    (dialogKey) => {
      setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
      setReload(new Date() * 1);
      if (dialogKey === "add") {
        reset(defaultFormValuesDistrict); // reset toàn bộ form
      }
    },
    [reset]
  );

  const handleAddClick = useCallback(
    () => handleOpenDialog("add"),
    [handleOpenDialog]
  );
  const handleDeleteClick = useCallback(
    (ids) => handleOpenDialog("delete", ids),
    [handleOpenDialog]
  );
  const handleEditClick = useCallback(
    (record) => handleOpenDialog("edit", record),
    [handleOpenDialog]
  );
  const handleViewClick = useCallback(
    (record) => handleOpenDialog("view", record),
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

  const handleDelete = async () => {
    setIsLoading(true);
    if (!selectedIds?.length) {
      toast("Vui lòng chọn ít nhất một dòng để xóa!", "warning");
      return;
    }
    try {
      await Promise.all(selectedIds.map((id) => dispatch(deleteMenu(id))));
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
         const formattedData = {
        ...normalizeApiData(data),
        roleGroup: localListRoles,
      };

    try {
      const action = await dispatch(
        updateMenu({ id, updatedData: formattedData })
      );
      if (updateMenu.fulfilled.match(action)) {
        reset(defaultFormValuesDistrict);
        handleCloseDialog("edit");
        setSelectedIds(null);
        toast("Cập nhật thành công!", "success");
      } else {
        toast(action?.payload?.errors || "Cập nhật thất bại!", "error");
      }
      setIsLoading(false);
    } catch (error) {
      toast("Đã xảy ra lỗi khi cập nhật!", "error");
      setIsLoading(false);
    }
  };

  const onSubmit = async (data) => {
    const { parent, order } = data;

    // 🔹 Kiểm tra trùng "thứ tự" trong cùng cấp
    const siblings = listMenu.filter(
      (m) => (m.parent || null) === (parent || null)
    );

    if (siblings.some((m) => Number(m.order) === Number(order))) {
      toast(
        "Thứ tự bị trùng với menu cùng cấp. Vui lòng nhập giá trị khác!",
        "warning"
      );
      return; // Dừng submit, không gọi API
    }

    setIsLoading(true);
    try {
            const formattedData = {
        ...normalizeApiData(data),
        roleGroup: localListRoles,
      };
      const result = await dispatch(addMenu(formattedData)).unwrap();
      toast(result?.message || "Thêm mới thành công!", "success");
      setReload(new Date().getTime());
      reset(defaultFormValuesDistrict);
      handleCloseDialog("add");
    } catch (error) {
      toast(error || "Đã xảy ra lỗi khi thêm mới!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = () => {
    setOpen(!open);
  };

  const handleClose = () => {
    setOpen(null);
  };

  const handleToggle = (permission) => {
    const updated = localListRoles.map((role) => {
      if (role.titleFunction === permission.titleFunction) {
        const updatedMethods = role.methods.map((method) => ({
          ...method,
          allow: !method.allow,
        }));
        return {
          ...role,
          methods: updatedMethods,
        };
      }
      return role;
    });

    setLocalListRoles(updated);
  };

  return (
    <>
      <CustomTableTree
        data={listMenu || []}
        fetchData={getDataDistrictFromApi}
        reload={reload}
        disableSynchronize
        disableMore
        disableCheckbox
        columns={columnsDistrict}
        addButtonLabel="Thêm mới"
        filter={filtersDistrict}
        onAdd={handleAddClick}
        onDelete={handleDeleteClick}
        onEdit={handleEditClick}
        onView={handleViewClick}
        uiPreset="unitModern"
        actionIconSize="medium"
        useModernActionColors
        useModernPagination
				rowsPerPageOptions={[25, 50, 100, 500]}
				filterPopupAlignLeft
      >
        <AddDialog
          open={openDialogs.add}
          onClose={handleCloseAddDialog}
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
          listMenu={listMenu}
          listRoles={localListRoles}
          listFunction={listFunction}
          setValue={setValue}
        />

        <EditDialog
          open={openDialogs.edit}
          onClose={handleCloseEditDialog}
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
          listTypeUnit={listTypeUnit}
          listPosition={listPosition}
          listMenu={listMenu}
          listRoles={localListRoles}
          setLocalListRoles={setLocalListRoles}
          listFunction={listFunction}
          setValue={setValue}
        />
        <ViewDialogMenu
          open={openDialogs.view}
          onClose={handleCloseViewDialog}
          control={control}
          handleSubmit={handleSubmit}
          // onSubmit={() => {}}
          listUnit={listMenu}
          listFunction={listFunction}
        />

        <DeleteDialog
          open={openDialogs.delete}
          onClose={handleCloseDeleteDialog}
          onSave={handleDelete}
          selectedIds={selectedIds}
          isLoading={isLoading} // Truyền isLoading để disable button và hiển thị loading
        />
      </CustomTableTree>
    </>
  );
};

export default ManagementMenu;
