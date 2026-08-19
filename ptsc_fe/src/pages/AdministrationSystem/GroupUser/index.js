import React, { useCallback, useState } from "react";
// import CustomTable from "@components/CustomTable/CustomTableClone_1";
import { useDispatch } from "react-redux";
import { useToast } from "@components/common/ToastProvider";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { getParentId } from "@redux/slices/AdministrationSystem/functionManagement";
import { columns, defaultValue, filters, templateSchema } from "./constant";
import AddTemplateDialog from "./components/AddTemplateDialog";
import EditTemplateDialog from "./components/EditTemplateDialog";
import DeleteTemplateDialog from "./components/DeleteTemplateDialog";
import MappingHrmJobsDialog from "./components/MappingHrmJobsDialog";
// import { useNavigate } from "react-router-dom";
import {
  addGroupUser,
  deleteGroupUser,
  getDataDetailGroupUsers,
  getDataListGroupUsers,
  updateGroupUser,
} from "@redux/slices/AdministrationSystem/groupUserSlice";
import { normalizeApiData } from "./utils";
import CustomTable from "@components/CustomTable/CustomTable";
import DetailGroupUser from "@pages/AdministrationSystem/DetailGroupUser";
// import ViewTemplateDialogs from "./components/ViewTemplateDialogs";
// import { useModuleCode } from "@utils/Common/Common";

function GroupUser() {
  const dispatch = useDispatch();
  // const moduleCode = useModuleCode();
  const toast = useToast();
  // const navigate = useNavigate();
  const [openDialogs, setOpenDialogs] = useState({
    add: false,
    delete: false,
    edit: false,
    view: false,
    mappingHrm: false,
  });
  const [selectedIds, setSelectedIds] = useState();
  const [latestUpdatedId, setLatestUpdatedId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [roleType, setRoleType] = useState("fixed");
  const [selectedFixedRole, setSelectedFixedRole] = useState([]);
  const [selectedDynamicRole, setSelectedDynamicRole] = useState([]);
  const [allDynamicRoles, setAllDynamicRoles] = useState([]); // ✅ State mới để lưu tất cả vai trò động
  
  // ✅ Callback để merge dữ liệu động (không replace, để giữ full cache)
  const handleAccumulateDynamicRoles = useCallback((newData) => {
    setAllDynamicRoles((prev) => {
      if (!Array.isArray(newData)) return prev;
      const map = new Map();
      // Thêm dữ liệu cũ
      prev.forEach((item) => {
        const key = item._id || item.id;
        map.set(key, item);
      });
      // Merge dữ liệu mới (không replace)
      newData.forEach((item) => {
        const key = item._id || item.id;
        map.set(key, item);
      });
      return Array.from(map.values());
    });
  }, []);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(templateSchema),
    defaultValues: defaultValue,
  });

  const fetchDataFromApi = useCallback(
    async ({ page, limit, query, code, sort }) => {
      if (!page || !limit) {
        return { data: [], total: 0 };
      }
      try {
        const params = {
          page,
          limit,
        };

        // Chỉ thêm query và code khi có giá trị
        if (query && query.trim() !== "") {
          params.query = query;
        }
        if (code && Array.isArray(code) && code.length > 0) {
          params.code = code;
        }

        // Chỉ thêm sort khi thực sự có giá trị (không phải null, undefined, hoặc empty string)
        if (sort) {
          params.sort = sort;
        }

        const response = await dispatch(getDataListGroupUsers(params)).unwrap();
        const data = response.data || [];
        return {
          data: data,
          total: response.total || response.length || 0,
        };
      } catch (error) {
        toast("Lỗi hệ thống", "warning");
        return { data: [], total: 0 };
      }
    },
    [dispatch, toast]
  );

  const handleOpenDialog = useCallback(
    async (dialogKey, idsOrRecord = null) => {
      if (idsOrRecord) {
        if (dialogKey === "edit") {
          setSelectedIds(idsOrRecord);
          try {
            const result = await dispatch(getDataDetailGroupUsers(idsOrRecord)).unwrap();
            dispatch(getParentId());
            reset(result.data);
            const roleTypeFromApi = result.data.roleType || "fixed";
            const rolesFromApi = result.data.roles || [];
            setRoleType(roleTypeFromApi);
            
            // Phân tách vai trò cố định và vai trò động từ dữ liệu API
            const fixedRoles = rolesFromApi.filter(roleId => {
              if (typeof roleId === 'string' && roleId.includes('_')) return false;
              const isDynamic = allDynamicRoles.some(dr => dr._id === roleId || dr.roleId === roleId);
              return !isDynamic;
            });
            
            const dynamicRoles = rolesFromApi.filter(roleId => {
              if (typeof roleId === 'string' && roleId.includes('_')) return true;
              return allDynamicRoles.some(dr => dr._id === roleId || dr.roleId === roleId);
            });
            
            const fullDynamicRoles = dynamicRoles
              .map(roleId => allDynamicRoles.find(dynamicRole => dynamicRole._id === roleId || dynamicRole.roleId === roleId))
              .filter(Boolean);

            setSelectedFixedRole(fixedRoles);
            setSelectedDynamicRole(fullDynamicRoles.length > 0 ? fullDynamicRoles : dynamicRoles);
          } catch (error) {
            toast("Lỗi khi tải thông tin nhóm người dùng", "error");
            reset(defaultValue);
          }
        } else if (dialogKey === "delete" || dialogKey === "view") {
          setSelectedIds(Array.isArray(idsOrRecord) ? idsOrRecord : [idsOrRecord]);
        }
      } else {
        reset(defaultValue);
        setRoleType("fixed");
        setSelectedFixedRole([]);
        setSelectedDynamicRole([]);
      }
      setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
    },
		[
		dispatch,
    reset,
    setRoleType,
    setSelectedFixedRole,
    setSelectedDynamicRole,
    setSelectedIds,
    setOpenDialogs,
		toast,
		allDynamicRoles
		]
  );

  const handleCloseDialog = useCallback(
    (dialogKey) => {
      setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
      setIsLoading(false);

      if (dialogKey === "edit" || dialogKey === "view" || dialogKey === "add") {
        reset(defaultValue);
        setRoleType("fixed");
        setSelectedFixedRole([]);
        setSelectedDynamicRole([]);
      }
    },
    [reset, setRoleType, setSelectedFixedRole, setSelectedDynamicRole]
  );


  const handleDelete = async () => {
    if (!selectedIds?.length) {
      toast("Vui lòng chọn ít nhất một dòng để xóa!", "warning");
      return;
    }
    setIsLoading(true);
    try {
      await Promise.all(selectedIds.map((id) => dispatch(deleteGroupUser(id))));
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
    
    // Kết hợp cả vai trò cố định và vai trò động
    const fixedRoleIds = (selectedFixedRole || []).map((role) => (role && typeof role === "object" ? role._id || role.id : role));
    const dynamicRoleIds = (selectedDynamicRole || []).map((role) => (role && typeof role === "object" ? role._id || role.id : role));
    const combinedRoles = [...fixedRoleIds, ...dynamicRoleIds];

    let rolesDynamicPayload = [];
    if (Array.isArray(selectedDynamicRole)) {
      rolesDynamicPayload = selectedDynamicRole.map((role) => {
        if (typeof role === "string") {
          const found = allDynamicRoles.find(
            (r) => r._id === role || r.roleId === role
          );
          return found
            ? {
                processKey: found.processKey,
                roleCode: found.roleCode,
                name: found.name,
              }
            : null;
        }
        return {
          processKey: role.processKey,
          roleCode: role.roleCode,
          name: role.name
        };
      }).filter(Boolean);
    }

    const updateData = {
      ...data,
      roles: combinedRoles,
      roleType: roleType,
      "roles_dynamic": rolesDynamicPayload,
      // Normalize organizationUnits: BE chỉ nhận IDs (strings), không nhận objects
      organizationUnits: (data.organizationUnits || []).map(
        (ou) => (typeof ou === 'object' ? ou._id || ou.id : ou)
      ),
    };

    setIsLoading(true);

    try {
      const action = await dispatch(
        updateGroupUser({ id, updatedData: updateData })
      );

      if (updateGroupUser.fulfilled.match(action)) {
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
        (Array.isArray(error?.errors) && error.errors[0]) ||
        error?.message || "Lỗi cập nhật!", "error"
      );
      setIsLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const fixedRoleIds = (selectedFixedRole || []).map((role) => (role && typeof role === "object" ? role._id || role.id : role));
      const dynamicRoleIds = (selectedDynamicRole || []).map((role) => (role && typeof role === "object" ? role._id || role.id : role));
      const combinedRoles = [...fixedRoleIds, ...dynamicRoleIds];
      let rolesDynamicPayload = [];

      if (Array.isArray(selectedDynamicRole)) {
        rolesDynamicPayload = selectedDynamicRole.map(role => {
          return {
            processKey: role.processKey,
            roleCode: role.roleCode,
            name: role.name
          };
        });
      }
      const submitData = {
        ...data,
        roles: combinedRoles,
        roleType: roleType,
        "roles_dynamic": rolesDynamicPayload,
      };

      const dataFormat = normalizeApiData(submitData);
      const result = await dispatch(addGroupUser(dataFormat)).unwrap();
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
        (Array.isArray(error?.errors) && error.errors[0]) ||
        error?.message || "Lỗi khi thêm mới!",
        "error"
      );
    }
  };

  const handleAdd = useCallback(() => handleOpenDialog("add"), [handleOpenDialog]);
  const handleDeleteClick = useCallback((ids) => handleOpenDialog("delete", ids), [handleOpenDialog]);
  const handleEdit = useCallback((record) => handleOpenDialog("edit", record), [handleOpenDialog]);
    const handleView = useCallback((id) => {
    handleOpenDialog("view", id);
  }, [handleOpenDialog]);

  const handleCloseAddDialog = useCallback(() => handleCloseDialog("add"), [handleCloseDialog]);
  const handleCloseEditDialog = useCallback(() => handleCloseDialog("edit"), [handleCloseDialog]);
  const handleCloseDeleteDialog = useCallback(() => handleCloseDialog("delete"), [handleCloseDialog]);
  const handleCloseViewDialog = useCallback(() => handleCloseDialog("view"), [handleCloseDialog]);
  const handleCloseMappingHrmDialog = useCallback(() => handleCloseDialog("mappingHrm"), [handleCloseDialog]);

  const handleMappingHrm = useCallback(() => {
    setOpenDialogs((prev) => ({ ...prev, mappingHrm: true }));
  }, []);

  return (
    <>
      <CustomTable
        codeModule="GroupUser"
        disableSynchronize
        fetchData={fetchDataFromApi}
        disableMore
        filter={filters}
        columns={columns}
        onAdd={handleAdd}
        onDelete={handleDeleteClick}
        onEdit={handleEdit}
        onView={handleView}
        onMappingHrm={handleMappingHrm}
        latestUpdatedId={latestUpdatedId}
        refreshTrigger={refreshTrigger}
        disableDefaultSort // Thêm prop này để tắt sort mặc định
        isCheckTitle
        uiPreset="unitModern"
        actionIconSize="medium"
        useModernActionColors
        rowsPerPageOptions={[25, 50, 100, 500]}
        lockRowsPerPageOptions
        addButtonLabel="Thêm mới"
        filterPopupAlignLeft
				encodeHtml
      >
        <AddTemplateDialog
          open={openDialogs.add}
          onClose={handleCloseAddDialog}
          onSave={handleSubmit(onSubmit)}
          control={control}
          onSubmit={onSubmit}
          errors={errors}
          isLoading={isLoading}
          reset={reset}
          roleType={roleType}
          setRoleType={setRoleType}
          selectedFixedRole={selectedFixedRole}
          setSelectedFixedRole={setSelectedFixedRole}
          selectedDynamicRole={selectedDynamicRole}
          setSelectedDynamicRole={setSelectedDynamicRole}
        />
        <EditTemplateDialog
          open={openDialogs.edit}
          onClose={handleCloseEditDialog}
          onSave={handleSubmit(onUpdate)}
          control={control}
          onUpdate={onUpdate}
          errors={errors}
          isLoading={isLoading}
          roleType={roleType}
          setRoleType={setRoleType}
          selectedFixedRole={selectedFixedRole}
          setSelectedFixedRole={setSelectedFixedRole}
          selectedDynamicRole={selectedDynamicRole}
					setSelectedDynamicRole={setSelectedDynamicRole}
          onDynamicDataLoaded={handleAccumulateDynamicRoles} // ✅ Callback merge (không replace)
        />
        <DetailGroupUser
          openDialog={openDialogs.view}
          onCloseDialog={handleCloseViewDialog}
          control={control}
          isLoading={isLoading}
          reset={reset}
          roleType={roleType}
          setRoleType={setRoleType}
          selectedFixedRole={selectedFixedRole}
          setSelectedFixedRole={setSelectedFixedRole}
          selectedDynamicRole={selectedDynamicRole}
          setSelectedDynamicRole={setSelectedDynamicRole}
        />
        <DeleteTemplateDialog
          open={openDialogs.delete}
          onClose={handleCloseDeleteDialog}
          onSave={handleDelete}
          selectedIds={selectedIds}
          isLoading={isLoading}
        />
        <DetailGroupUser
          groupUser={selectedIds}
          open={openDialogs.view}
          onClose={handleCloseViewDialog}
          id={selectedIds?.[0]}
        />
        <MappingHrmJobsDialog
          open={openDialogs.mappingHrm}
          onClose={handleCloseMappingHrmDialog}
        />
      </CustomTable>
    </>
  );
}

export default GroupUser;
