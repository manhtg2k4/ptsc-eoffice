import React, { useCallback, useEffect, useState } from "react";

import CustomTable from "@components/CustomTable/CustomTable";

import {
  useDispatch,
  useSelector,
  //  useSelector
} from "react-redux";

import { filters } from "./constants";

import { useToast } from "@components/common/ToastProvider";
import { useForm } from "react-hook-form";
import DeleteDialog from "./DeleteDialog";
import { getListFunction } from "@redux/slices/ManagerMenu/managementMenuSlice";
import {
  addDynamicForm,
  deleteDynamicForm,
  fetchListFormDynamic,
  updateDynamicForm,
} from "@redux/slices/DynamicForm/DynamicFormSlice";
// import AddForm from "./addForm";
import {
  API_UPLOAD_FILESS,
  APP_BASE,
} from "@EnvironmentFile/constants/urlConfig";
//  
import EditForm from "./EditForm";
import AddForm from "./AddForm";
import api from "@services/api";

function DynamicForm({idList}) {
  const { listFunction } = useSelector((state) => state.menu);
  // const {listDynamic} = useSelector(state => state.dynamic)
  // logger.log(listDynamic,'listDynamic')

  const dispatch = useDispatch();
  const [selectedIds, setSelectedIds] = useState();
  const [isLoading, setIsLoading] = useState(false);

  // const { businessDetail } = useSelector((state) => state.businessInfoSlice);
  const toast = useToast();

  const [openDialogs, setOpenDialogs] = useState({
    delete: false,
    view: false,
    add: false,
    edit: false,
  });

  const [refesh, setRefesh] = useState(0);

  const {
    control,
    reset,
    getValues,
    handleSubmit,
    //   trigger,
    formState: { errors },
    // setError
  } = useForm({
    //   resolver: yupResolver(docTypeDynamicMetadataSchema),
    //   defaultValues: defaultFormValuesDocTypeDynamicMetadata,
  });

  // const [latestUpdatedId, setLatestUpdatedId] = useState(null);

  // logger.log(businessDetail);
  useEffect(() => {
    dispatch(getListFunction());
  }, [dispatch]);

  // const handleOpenDialog = (dialogKey, idsOrRecord = null) => {
  //   if (dialogKey === 'add') {
  //     // Reset form về trạng thái rỗng khi mở dialog thêm mới
  //     reset({ name: '', code: '', feature: '', file: null });
  //   }

  //   setSelectedIds(idsOrRecord);
  //   setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
  // };

  const handleOpenDialog = useCallback((dialogKey, idsOrRecord = null) => {
    if (dialogKey === 'add') {
      // Reset form về trạng thái rỗng khi mở dialog thêm mới
      reset({ name: '', code: '', feature: '', file: null });
    }

    setSelectedIds(idsOrRecord);
    setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
  }, [reset]);

  // const handleCloseDialog = (dialogKey) => {
  //   setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
  // };
  const handleCloseDialog = useCallback((dialogKey) => {
    setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
  }, []);

  const fetchDataFromApi = useCallback(
    async ({ page, limit, query, code, sort,processID }) => {
      if (!page || !limit) {
        return { data: [], total: 0 };
      }
      try {
        // Luôn gửi tất cả các tham số, thunk sẽ xử lý logic.
        const response = await dispatch(
          fetchListFormDynamic({ page, limit, query, code, sort, processID })
        ).unwrap();
        return {
          data: response.data || [],
          total: response.total || response.length || 0,
        };
      } catch (error) {
        return { data: [], total: 0 };
      }
    },
    [dispatch] // Dependency chỉ có dispatch, không phụ thuộc vào list
  );
  const onAdd = async (data) => {
    try {
      const { file, ...restData } = data;
      const dataFinally = {
        ...restData,
        processID: idList
      }
      const res = await dispatch(addDynamicForm(dataFinally)).unwrap();

      // Nếu có file thì upload file kèm id (hoặc thông tin từ res)
      if (file && file.length > 0) {
        const formData = new FormData();
        formData.append("file", file[0]); // nếu chỉ chọn 1 file

        // Upload file
        const uploadRes = await api.post(API_UPLOAD_FILESS, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        // Lấy url file trả về
        const fileUrl = `${APP_BASE}/api/files/download/${uploadRes.data.id}`;

        // Nếu có url thì gọi API update để gán vào bản ghi vừa tạo
        if (fileUrl) {
          await dispatch(
            updateDynamicForm({
              id: res._id, // id từ API thêm mới trả về
              updatedData: { file: fileUrl, fileName: uploadRes.data.file_name },
            })
          ).unwrap();
        }
      }

      setOpenDialogs((pre) => ({ ...pre, add: false }));
      setRefesh(refesh + 1);
      toast(`Thêm mới thành công`, "success");
    } catch (error) {
      toast(`Lỗi khi thêm mới`, "error");
    }
  };
  const onUpdate = async (data) => {
  try {
    const { file, ...restData } = data;

    // Cập nhật thông tin trước (trừ file)
    await dispatch(
      updateDynamicForm({
        id: selectedIds, // 👈 id bản ghi cần update (truyền từ props/biến ngoài)
        updatedData: restData,
      })
    ).unwrap();

    // Nếu có file mới thì upload
    if (file && file.length > 0) {
      const formData = new FormData();
      formData.append("file", file[0]);

      const uploadRes = await api.post(API_UPLOAD_FILESS, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const fileUrl = `${APP_BASE}/api/files/download/${uploadRes.data.id}`;

      if (fileUrl) {
        await dispatch(
          updateDynamicForm({
            id: selectedIds, // vẫn là id cũ
            updatedData: { 
              file: fileUrl, 
              fileName: uploadRes.data.file_name 
            },
          })
        ).unwrap();
      }
    }

    setOpenDialogs((pre) => ({ ...pre, edit: false }));
    setRefesh(refesh + 1);
    toast(`Cập nhật thành công`, "success");
  } catch (error) {
    toast(`Lỗi khi cập nhật`, "error");
  }
};


  const handleDelete = async () => {
    setIsLoading(true);
    if (!selectedIds?.length) {
      toast("Vui lòng chọn ít nhất một dòng để xóa!", "warning");
      return;
    }
    try {
      await Promise.all(
        selectedIds.map((id) => dispatch(deleteDynamicForm({ ids: id })))
      );
      handleCloseDialog("delete");
      setSelectedIds();
      setRefesh(refesh + 1);
      setIsLoading(false);
      toast(`Đã xóa ${selectedIds.length} bản ghi thành công!`, "success");
    } catch (error) {
      toast("Đã xảy ra lỗi khi xóa!", "error");
      setIsLoading(false);
    }
  };

  const handleDeleteClick = useCallback((ids) => {
    handleOpenDialog("delete", ids);
  }, [handleOpenDialog]);

  const handleAddClick = useCallback((id) => {
    handleOpenDialog("add", id);
  }, [handleOpenDialog]);

  const handleEditClick = useCallback((id) => {
    handleOpenDialog("edit", id);
  }, [handleOpenDialog]);

  const handleCloseAddDialog = useCallback(() => handleCloseDialog("add"), [handleCloseDialog]);
  const handleCloseEditDialog = useCallback(() => handleCloseDialog("edit"), [handleCloseDialog]);
  const handleCloseDeleteDialog = useCallback(() => handleCloseDialog("delete"), [handleCloseDialog]);

  return (
    <>
      <div style={{ width: "100%" }}>
				<CustomTable
				codeModule="DynamicFormConfigurationBPMN"
        fetchData={fetchDataFromApi}
        filter={filters}
        disableMore
        idList={idList}
        disableSynchronize
        disableDetail
        // onDelete={(ids) => handleOpenDialog("delete", ids)}
        // // onView={(id) => handleOpenDialog("view", id)}
        // onAdd={(id) => handleOpenDialog("add", id)}
        // // onAdd={() => navigate(`/dynamic-form/add`)}
        // onEdit={(id) => handleOpenDialog("edit", id)}
        onDelete={handleDeleteClick}
        onAdd={handleAddClick}
        onEdit={handleEditClick}
        refreshTrigger={refesh}
        autoHeight
        forceFooterFullWidth
        // latestUpdatedId={latestUpdatedId}
				filterPopupAlignLeft
				encodeHtml
      >
        <AddForm
          key={openDialogs.add ? "add-open" : "add-closed"} 
          title="Thêm mới biểu mẫu"
          open={openDialogs.add}
          control={control}
          getValues={getValues}
          handleSubmit={handleSubmit}
          // onClose={() => handleCloseDialog("add")}
          onClose={handleCloseAddDialog}
          onSave={onAdd}
          errors={errors}
          listFunction={listFunction}
        />

        <EditForm
          title="Chỉnh sửa biểu mẫu"
          open={openDialogs.edit}
          control={control}
          getValues={getValues}
          handleSubmit={handleSubmit}
          // onClose={() => handleCloseDialog("edit")}
          onClose={handleCloseEditDialog}
          onSave={onUpdate}
          reset={reset}
          id={selectedIds}
          errors={errors}
          listFunction={listFunction}
        />
	      </CustomTable>
      </div>

	      <DeleteDialog
        open={openDialogs.delete}
        // onClose={() => handleCloseDialog("delete")}
        onClose={handleCloseDeleteDialog}
        onSave={handleDelete}
        selectedIds={selectedIds}
        isLoading={isLoading} // Truyền isLoading để disable button và hiển thị loading
      />
    </>
  );
}

export default DynamicForm;
