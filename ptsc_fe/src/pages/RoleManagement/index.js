import React, { useCallback, useState } from "react";

import CustomTable from "@components/CustomTable/CustomTable";

import {
  useDispatch,
  //  useSelector
} from "react-redux";

import { columnTable, filters } from "./constants";
// import { getDetailBusiness } from "@redux/slices/CitizenBusinessInfo/businessInfoSlice";

import { useToast } from "@components/common/ToastProvider";
import {
  fetchListFormBpmn,
  addFormBpmn,
  deleteBpmn,
} from "@redux/slices/BPMN/BpmnSlice";
import FormBpmn from "./FormBpmn";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import DeleteDialog from "./DeleteDialog";

function RoleManagement() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
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
    //   reset,
    getValues,
    //   trigger,
    formState: { errors },
    // setError
  } = useForm({
    //   resolver: yupResolver(docTypeDynamicMetadataSchema),
    //   defaultValues: defaultFormValuesDocTypeDynamicMetadata,
  });

  // const [latestUpdatedId, setLatestUpdatedId] = useState(null);

  // logger.log(businessDetail);

  const handleOpenDialog = useCallback((dialogKey, idsOrRecord = null) => {
    // if (idsOrRecord) {
    //   dispatch(getDetailBusiness({ id: idsOrRecord }));
    // }
    setSelectedIds(idsOrRecord);
    setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
  }, []);

  const handleCloseDialog = useCallback((dialogKey) => {
    setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
  }, []);

  const handleDeleteClick = useCallback(
    (ids) => handleOpenDialog("delete", ids),
    [handleOpenDialog]
  );
  const handleAddClick = useCallback(
    () => navigate(``),
    [navigate]
  );
  const handleEditClick = useCallback(
    (id) => {
      logger.log(id);
      navigate(``)
    },
    [navigate]
  );

  const handleCloseAddDialog = useCallback(
    () => handleCloseDialog("add"),
    [handleCloseDialog]
  );
  const handleCloseDeleteDialog = useCallback(
    () => handleCloseDialog("delete"),
    [handleCloseDialog]
  );

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
            fetchListFormBpmn({ page, limit, query, code, sort })
          ).unwrap();
        } else if (sort) {
          //Chỉ sort thì rơi vào nhánh này
          response = await dispatch(
            fetchListFormBpmn({ page, limit, query, code, sort })
          ).unwrap();
        } else {
          //Mặc định
          response = await dispatch(
            fetchListFormBpmn({ page, limit, sort })
          ).unwrap();
        }
        return {
          data: response.data || [], // Giả sử fetchTemplateCategories trả về mảng dữ liệu
          total: response.total || response.length || 0, // Cần điều chỉnh nếu API trả về total
        };
      } catch (error) {
        // logger.error("Error fetching data:", error);
        return { data: [], total: 0 };
      }
    },
    [dispatch] // Dependency chỉ có dispatch, không phụ thuộc vào list
  );
  const onAdd = async (data) => {
    // logger.log(data);
    try {
      await dispatch(addFormBpmn(data));
      setOpenDialogs((pre) => ({ ...pre, add: false }));
      setRefesh(refesh + 1);
      toast(`Thêm mới thành công`, "success");
    } catch (error) {
      toast(`Lỗi khi thêm mới`, "error");
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
        selectedIds.map((id) => dispatch(deleteBpmn({ ids: id })))
      );
      handleCloseDialog("delete");
      setSelectedIds();
      setIsLoading(false);
      toast(`Đã xóa ${selectedIds.length} bản ghi thành công!`, "success");
    } catch (error) {
      toast("Đã xảy ra lỗi khi xóa!", "error");
      setIsLoading(false);
    }
  };

  return (
    <>
      <CustomTable
        fetchData={fetchDataFromApi}
        columns={columnTable}
        filter={filters}
        disableMore
        disableSynchronize
        disableDetail
        //  onDelete={(ids) => handleOpenDialog("delete", ids)}
        // // onView={(id) => handleOpenDialog("view", id)}
        // // onAdd={(id) => handleOpenDialog("add", id)}
        // onAdd={() => navigate(`/list-bpmn/add`)}
        // onEdit={(id) => navigate(`/list-bpmn/${id}`)}
        onDelete={handleDeleteClick}
        onAdd={handleAddClick}
        onEdit={handleEditClick}
        refreshTrigger={refesh}
				encodeHtml
        // latestUpdatedId={latestUpdatedId}
      >
        <FormBpmn
          title="Thêm mới biểu mẫu quy trình"
          open={openDialogs.add}
          control={control}
          getValues={getValues}
          onClose={handleCloseAddDialog}
          onSave={onAdd}
          errors={errors}
        />
      </CustomTable>

      <DeleteDialog
        open={openDialogs.delete}
        // onClose={() => handleCloseDialog("add")}
        onClose={handleCloseDeleteDialog}
        onSave={handleDelete}
        selectedIds={selectedIds}
        isLoading={isLoading} // Truyền isLoading để disable button và hiển thị loading
      />
    </>
  );
}

export default RoleManagement;
