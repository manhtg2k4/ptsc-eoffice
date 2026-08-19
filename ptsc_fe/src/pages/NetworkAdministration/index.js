import React, { useCallback, useState } from "react";
import CustomTable from "@components/CustomTable/CustomTable";
import { useDispatch } from "react-redux";
import { useToast } from "@components/common/ToastProvider";
import { useForm, FormProvider } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { columns, defaultValue, filters, ipSchema } from "./constant";
import ViewTemplateDialog from "./components/ViewTemplateDialog";
import { addNetworkAdministration, deleteNetworkAdministration, getDataNetworkAdministration, getDetailNetworkAdministration, updateNetworkAdministration } from "@redux/slices/SharedCategory/listNetworkAdministration";
import AddIpDialog from "./components/AddIpDialog";
import EditIpDialog from "./components/EditIpDialog";
import DeleteTemplateDialog from "./components/DeleteTemplateDialog";

function NetworkAdministration() {
  const dispatch = useDispatch();
  const toast = useToast();
 
  const [openDialogs, setOpenDialogs] = useState({
    add: false,
    delete: false,
    edit: false,
    view: false,
  });
  const [selectedIds, setSelectedIds] = useState();
  const [latestUpdatedId, setLatestUpdatedId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [originalIp, setOriginalIp] = useState(null); // State để lưu IP gốc khi sửa
  const [refreshTrigger, setRefreshTrigger] = useState(0);  
  const methods = useForm({
    
    // Sử dụng resolver động tùy thuộc vào dialog
    // resolver: yupResolver(templateSchema),
       defaultValues: {
      ipAddresses: [{ value: "" }],
      ...defaultValue,
    },

  });
  const { control, handleSubmit, reset, formState: { errors }, trigger } = methods;
  // Hàm để thay đổi resolver
  const setResolver = (schema) => methods.resolver = yupResolver(schema);

  const fetchDataFromApi = useCallback(
    async ({ page, limit, query, code, sort }) => {
      if (!page || !limit) {
        return { data: [], total: 0 };
        
      }
      try {
        const response = await dispatch(
          getDataNetworkAdministration({ page, limit, query, code, sort })
        ).unwrap()

        return {
          data: response.data || [],
          total: response.total || 0,
        };
      } catch (error) {
        toast("Lỗi hệ thống", "warning");
        return { data: [], total: 0 };
      }
    },
    [dispatch]
  );

  const handleOpenDialog = async (dialogKey, idsOrRecord = null) => {
  if (dialogKey === 'add') {
    setResolver(ipSchema);
  } else {
    // Khi sửa, cũng dùng ipSchema
    setResolver(ipSchema);
  }
  if (idsOrRecord) {
    if (dialogKey === "edit" || dialogKey === "view") {
      setSelectedIds(idsOrRecord);
      
      try {
        // Gọi API lấy chi tiết IP
        const ipDetail = await dispatch(getDetailNetworkAdministration(idsOrRecord)).unwrap();
        
        // Lưu lại IP gốc để gửi lên API khi cập nhật
        setOriginalIp(ipDetail.ip);
        
        // Reset form với dữ liệu IP lấy được
        reset({ ipAddresses: [{ value: ipDetail.ip }] });
      } catch (error) {
        logger.error("Error fetching IP details:", error);
        toast("Lỗi khi tải thông tin địa chỉ IP", "error");
        // Reset về trạng thái mặc định nếu lỗi
        reset(defaultValue);
      }
      
    } else if (dialogKey === "delete") {
      setSelectedIds(
        Array.isArray(idsOrRecord) ? idsOrRecord : [idsOrRecord]
      );
    }
  } else {
    // Khi mở dialog thêm mới, reset về trạng thái ban đầu
    reset({ ipAddresses: [{ value: "" }], ...defaultValue });
  }
  
  setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
};

  const handleCloseDialog = (dialogKey) => {
    setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
    setIsLoading(false);
    reset({ ipAddresses: [{ value: "" }], ...defaultValue });
  };

  const onUpdate = async (data) => {
    setIsLoading(true);
    try {
      const newIp = data.ipAddresses[0]?.value;

      if (!originalIp || !newIp) {
        toast("Thiếu thông tin IP cũ hoặc mới.", "error");
        setIsLoading(false);
        return;
      }

      const payload = {
        oldIp: originalIp,
        newIp: newIp,
        type: "dhvbtc",
        // path: PATH_NGINX,
      };

      await dispatch(updateNetworkAdministration({ id: selectedIds, updatedData: payload })).unwrap();

      reset({ ipAddresses: [{ value: "" }] });
      setRefreshTrigger((prev) => prev + 1);
      setLatestUpdatedId(selectedIds);
      handleCloseDialog("edit");
      setSelectedIds(null);
      setOriginalIp(null);
      toast("Cập nhật thành công!", "success");
    } catch (error) {
      toast(
        error?.message || 'Lỗi cập nhật!',
        "error"
      );
      setIsLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      // Lấy danh sách IP từ form
      const ips = data.ipAddresses
        .map((item) => item.value)
        .filter((ip) => ip && ip.trim() !== "");

      if (ips.length === 0) {
        toast("Vui lòng nhập ít nhất một địa chỉ IP!", "warning");
        setIsLoading(false);
        return;
      }

      const payload = { ips, type: "dhvbtc" };

      await dispatch(addNetworkAdministration(payload)).unwrap();
      handleCloseDialog("add");
      reset({ ipAddresses: [{ value: "" }] });
      setRefreshTrigger((prev) => prev + 1);
      toast("Thêm mới địa chỉ IP thành công!", "success");
    } catch (error) {
      toast(Array.isArray(error?.errors) ? error.errors[0] : error?.message || "Có lỗi xảy ra!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Các hàm xử lý sự kiện cho CustomTable và Dialogs ---

  const handleOpenAddDialog = () => handleOpenDialog("add");
  const handleOpenDeleteDialog = (ids) => handleOpenDialog("delete", ids);
  const handleOpenEditDialog = (record) => handleOpenDialog("edit", record);
  const handleOpenViewDialog = (record) => handleOpenDialog("view", record);

  const handleCloseAddDialog = () => handleCloseDialog("add");
  const handleCloseEditDialog = () => handleCloseDialog("edit");
  const handleCloseViewDialog = () => handleCloseDialog("view");
  const handleCloseDeleteDialog = () => handleCloseDialog("delete");

  /**
   * Xử lý sự kiện lưu cho dialog thêm mới.
   * Kích hoạt validation và sau đó gọi hàm onSubmit nếu hợp lệ.
   */
  const handleSaveAddDialog = async () => {
    const isValid = await trigger(); // Kích hoạt validation thủ công
    if (isValid) {
      handleSubmit(onSubmit)();
    }
  };

  /**
   * Xử lý sự kiện lưu cho dialog cập nhật.
   */
  const handleSaveEditDialog = handleSubmit(onUpdate);

  const handleDelete = async () => {
    if (!selectedIds?.length) {
      toast("Vui lòng chọn ít nhất một dòng để xóa!", "warning");
      return;
    }
    setIsLoading(true);
    try {
      await dispatch(deleteNetworkAdministration(selectedIds)).unwrap();
      handleCloseDialog("delete");
      
      setSelectedIds();
      setRefreshTrigger((prev) => prev + 1);
      setIsLoading(false);
      toast(`Đã xóa ${selectedIds.length} bản ghi thành công!`, "success");
    } catch (error) {
      setIsLoading(false);
      toast(error?.message || "Đã xảy ra lỗi khi xóa!", "error");
    }
  };

  return (
    <>
			<CustomTable
				codeModule={"Network_Administration"}
        disableSynchronize
        fetchData={fetchDataFromApi}
        disableMore
        filter={filters}
        columns={columns}
        onAdd={handleOpenAddDialog}
        onDelete={handleOpenDeleteDialog}
        selected={selectedIds || []}
        onSelectionChange={setSelectedIds}
        onEdit={handleOpenEditDialog}
        onView={handleOpenViewDialog}
        latestUpdatedId={latestUpdatedId}
        refreshTrigger={refreshTrigger}
        isCheckTitle
				encodeHtml
      >
        <FormProvider {...methods}>
          <AddIpDialog
            open={openDialogs.add}
            onClose={handleCloseAddDialog}
            onSave={handleSaveAddDialog}
            control={control}
            errors={errors}
            isLoading={isLoading}
          />
          <EditIpDialog
            open={openDialogs.edit}
            onClose={handleCloseEditDialog}
            onSave={handleSaveEditDialog}
            control={control}
            onUpdate={onUpdate}
            errors={errors}
            isLoading={isLoading} 
          />
            <ViewTemplateDialog
            open={openDialogs.view}
            onClose={handleCloseViewDialog}
            control={control}
          />
      
          <DeleteTemplateDialog
            open={openDialogs.delete}
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

export default NetworkAdministration;
