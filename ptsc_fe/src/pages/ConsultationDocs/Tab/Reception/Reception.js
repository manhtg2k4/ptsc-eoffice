import React, { useCallback, useState, useMemo } from "react";
// import { useDispatch } from "react-redux";
// import { Box } from '@mui/material';
import CustomTable from "@components/CustomTable/CustomTable";
import { filtersSigningSubmission, defaultColumns } from "./constants";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useToast } from "@components/common/ToastProvider";
import { useModuleCode } from "@utils/Common/Common";
import {
  PageContainer,
  TabsWrapper,
  TabsContainer,
  StyledTab,
  TabLabel,
  TabBadge,
  TableWrapper,
} from "@styles/SigningSubmissionTab.styles";
import AddIncommingDoc from "@pages/IncomingDocumentManagement/components/AddIncommingDoc";
import { API_DS_VANBANDEN_DHVB } from "@EnvironmentFile/constants/urlConfig";
import UpdateIncommingDoc from "@pages/IncomingDocumentManagement/components/UpdateIncommingDoc";
import { callApi } from "@services/api";

const Reception = ({ selection, onSelectionChange, renderCustomActions }) => {
  const [openDialogs, setOpenDialogs] = useState({
    add: false,
    delete: false,
    edit: false,
    view: false,
  });
  // const dispatch = useDispatch();
  const toast = useToast();
  const navigate = useNavigate();
  const moduleCode = useModuleCode();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const [currentTab, setCurrentTab] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Tabs data
  const tabs = [
    { label: "VĂN BẢN KHẨN", value: "urgent" },
    { label: "VĂN BẢN CÓ HẠN", value: "deadline" },
    { label: "VĂN BẢN KHÁC", value: "other" },
    { label: "ĐÃ XỬ LÝ", value: "processed" },
    { label: "HOÀN THÀNH", value: "completed" },
  ];

  const columns = useMemo(() => {
    try {
      const viewConfigStr = localStorage.getItem("viewConfig");

      if (!viewConfigStr) {
        return defaultColumns;
      }

      const viewConfigData = JSON.parse(viewConfigStr);

      // Kiểm tra xem dữ liệu có nằm trong thuộc tính 'data' hay không
      const configArray = Array.isArray(viewConfigData)
        ? viewConfigData
        : viewConfigData?.data;

      // Tìm cấu hình cho "IncommingDocument"
      const incomingDocConfig = Array.isArray(configArray)
        ? configArray.find((config) => config.code === "IncommingDocument")
        : null;

      if (incomingDocConfig && Array.isArray(incomingDocConfig.field)) {
        const dynamicColumns = incomingDocConfig.field
          .filter((f) => f.checked === true)
          .map((f) => ({
            name: f.title, // Tên cột hiển thị
            row: f.name, // Key để lấy dữ liệu từ data
            width: f.width || "150px", // Sử dụng width từ config hoặc mặc định
          }));

        if (dynamicColumns.length > 0) {
          return dynamicColumns;
        }
      }
    } catch (error) {
      logger.error("Lỗi khi đọc hoặc phân tích cấu hình cột:", error);
    }
    return defaultColumns;
  }, []);
  // const [dialogType, setDialogType] = useState(null);
  // Fetch data function - filter theo tab hiện tại
  const getDataSigningFromApi = useCallback(
    async ({ page, limit, query, code, sort }) => {
      try {
        const params = {
          limit: limit || 100,
          sort: sort || "-receiveDate",
          "filter[stage]": "receive",
          "filter[receiverUnit]": "62242770f0c9f55a3af8da8a",
          "filter[checkRole]": true,
          "filter[accuracy]": 90,
          page: page || 1,
        };

        if (query && code && Array.isArray(code)) {
          code.forEach((c) => {
            params[`filter[${c}]`] = query;
          });
        }

        // const response = await callApi('get', API_DS_VANBANDEN_DHVB, { params });
        const response = await callApi(
          "get",
          API_DS_VANBANDEN_DHVB,
          {},
          { params }
        );
        logger.log("Response from API:", response);

        if (response && response.data) {
          return {
            data:
              response.data.map((item) => ({
                name: item.name ?? "",
                userDeadline: item.userDeadline ?? "",
                toBook: item.toBook ?? "",
                documentDate: item.documentDate ?? "",
                abstractNote: item.abstractNote ?? "",
                processors: item.processors ?? "",
                bookDocumentId: item.bookDocumentId ?? [],
                toBookDate: item.toBookDate ?? "",
                kanbanStatus: item.kanbanStatus ?? "",
                urgencyLevel: item.urgencyLevel ?? "",
                toBookCode: item.toBookCode ?? "",
                senderUnit: item.senderUnit ?? "",
                files: item.files ?? [],
                secondBook: item.secondBook ?? "",
                receiverUnit: item.receiverUnit ?? "",
                documentType: item.documentType ?? "",
                receiveDate: item.receiveDate ?? "",
                documentField: item.documentField ?? "",
                privateLevel: item.privateLevel ?? "",
                _id: item._id,
              })) || [],
            total: response.count || 0,
          };
        }

        return {
          data: [],
          total: 0,
        };
      } catch (error) {
        toast("Đã xảy ra lỗi khi tải dữ liệu!", "error");
        return { data: [], total: 0 };
      }
    },
    [toast]
  );

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    onSelectionChange([]); // Clear selection when tab changes
  };

  // Handle delete
  const handleDelete = useCallback(
    async (ids) => {
      setIsLoading(true);
      try {
        if (!ids?.length) {
          toast("Vui lòng chọn ít nhất một dòng để xóa!", "warning");
          return;
        }

        // Thay thế bằng API call thực tế
        // await dispatch(deleteSigningSubmission({ ids })).unwrap();

        toast(`Đã xóa ${ids.length} bản ghi thành công!`, "success");
        // setSelectedIds([]);
      } catch (error) {
        toast("Đã xảy ra lỗi khi xóa!", "error");
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  // Handle edit
  // const handleEdit = (id) => {
  // 	navigate(`/signing-submission/${id}`, {
  // 		state: { id, view: 'update' }
  // 	});
  // };

  // Handle view
  const handleView = useCallback(
    (id) => {
      navigate(`/signing-submission/view/${id}`, {
        state: { id, view: "view" },
      });
    },
    [navigate]
  );

  const handleOpenDialog = useCallback(
    async (dialogKey, idsOrRecord = null) => {
      // setDialogType(dialogKey);
      if (idsOrRecord) {
        if (dialogKey === "edit" || dialogKey === "view") {
          // setSelectedIds(idsOrRecord);
          // const result = await dispatch(
          // 	getDetailEnviroMonitor(idsOrRecord)
          // ).unwrap();
          // reset(result.data);
        } else if (dialogKey === "delete") {
          // setSelectedIds(
          // 	Array.isArray(idsOrRecord) ? idsOrRecord : [idsOrRecord]
          // );
        }
      } else if (dialogKey === "add") {
        // const result = await dispatch(autoGenCodeEnviroMonitor()).unwrap();
        // if (result) {
        // 	setValue("code", result);
        // }
      }
      setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
    },
    []
  );

  const handleCloseDialog = useCallback((dialogKey) => {
    setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
    setIsLoading(false);
    if (dialogKey === "edit" || dialogKey === "view" || dialogKey === "add") {
      // reset(defaultFormValuesEnviroMonitor);
    }
    // reset(undefined, { keepValues: true });
  }, []);

  // Wrapper handlers to avoid inline functions in JSX
  const handleAdd = useCallback(
    () => handleOpenDialog("add"),
    [handleOpenDialog]
  );
  const handleEdit = useCallback(
    (record) => handleOpenDialog("edit", record),
    [handleOpenDialog]
  );
  const handleAddClose = useCallback(
    () => handleCloseDialog("add"),
    [handleCloseDialog]
  );
  const handleEditClose = useCallback(
    () => handleCloseDialog("edit"),
    [handleCloseDialog]
  );

  return (
    <PageContainer>
      {/* Tabs ở vị trí bên phải */}
      <TabsWrapper>
        <TabsContainer
          value={currentTab}
          onChange={handleTabChange}
          variant="scrollable"
        >
          {tabs.map((tab) => (
            <StyledTab
              key={tab.value}
              label={
                <TabLabel>
                  {tab.label}
                  {tab.badge > 0 && <TabBadge badgeContent={tab.badge} />}
                </TabLabel>
              }
            />
          ))}
        </TabsContainer>
      </TabsWrapper>

      {/* CustomTable */}
      <TableWrapper>
        <CustomTable
          key={currentTab}
          fetchData={getDataSigningFromApi}
          disableSynchronize
          columns={columns}
          anableDateRangePicker
          filter={filtersSigningSubmission}
          reload={isLoading}
          // onAdd={handleAdd}
          onAdd={handleAdd}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onView={handleView}
          codeModule={moduleCode}
          selection={selection}
          onSelectionChange={onSelectionChange}
          disableDeletePQ // Disable default delete button
          renderCustomActions={renderCustomActions} // Pass the custom actions rendering function
					encodeHtml
        >
          <AddIncommingDoc
            open={openDialogs.add}
            onClose={handleAddClose}
            control={control}
            errors={errors}
            handleSubmit={handleSubmit}
          />
          <UpdateIncommingDoc
            open={openDialogs.edit}
            onClose={handleEditClose}
            control={control}
            errors={errors}
            handleSubmit={handleSubmit}
          />
        </CustomTable>
      </TableWrapper>
    </PageContainer>
  );
};

export default Reception;
