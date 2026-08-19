import React, { useCallback, useState, useMemo } from "react";
import CustomTable from "@components/CustomTable/CustomTable";
import {
  columnsSigningSubmission,
  filtersSigningSubmission,
  signingSubmissionSchema,
  createSigningSubmissionPayload,
} from "./constants";
// import { useNavigate } from "react-router-dom";
import { useToast } from "@components/common/ToastProvider";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import AddDialog from "./AddDialog";
import EditDialog from "./EditDialog";
import ViewDialog from "./ViewDialog"; // 1. Import ViewDialog
import {
  PageContainer,
  TabsWrapper,
  TabsContainer,
  StyledTab,
  TabLabel,
  TableWrapper,
} from "@styles/SigningSubmissionTab.styles";
import {
  API_DS_VANBANDI_DHVB,
  API_ADD_VANBANDI_DHVB,
} from "@EnvironmentFile/constants/urlConfig";
import axiosInstance from "@utils/axiosInstance";

const SigningSubmissionTab = () => {
  const toast = useToast();
  // const navigate = useNavigate();

  const [currentTab, setCurrentTab] = useState(0);
  const [openDialogs, setOpenDialogs] = useState({
    add: false,
    edit: false,
    view: false, // 2. Thêm state cho dialog xem chi tiết
  });
  const [isLoading, setIsLoading] = useState(false);
  const [,setSelectedIds] = useState([]); // For multi-delete
  const [selectedId, setSelectedId] = useState(null); // For single edit/view

  const {
    control,
    // handleSubmit, 
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(signingSubmissionSchema),
    defaultValues: {},
  });

  // Tabs data
  const tabs = [
    { label: "DỰ THẢO", value: "draft" },
    { label: "ĐÃ TRÌNH KÝ", value: "submitted"},
    { label: "CHỜ BAN HÀNH", value: "waiting"},
    { label: "ĐÃ BAN HÀNH", value: "published"},
  ];

  // Columns từ localStorage
  const columns = useMemo(() => {
    try {
      const viewConfigStr = localStorage.getItem("viewConfig");

      if (!viewConfigStr) return columnsSigningSubmission;

      const viewConfigData = JSON.parse(viewConfigStr);
      const configArray = Array.isArray(viewConfigData)
        ? viewConfigData
        : viewConfigData?.data;

      const outgoingDocConfig = Array.isArray(configArray)
        ? configArray.find((config) => config.code === "OutgoingDocument")
        : null;

      if (outgoingDocConfig && Array.isArray(outgoingDocConfig.field)) {
        const dynamicColumns = outgoingDocConfig.field
          .filter((f) => f.checked === true)
          .map((f) => ({
            name: f.title,
            row: f.name,
            width: f.width || "150px",
          }));

        if (dynamicColumns.length > 0) {
          return dynamicColumns;
        }
      }
    } catch (error) {
      logger.error("Lỗi khi đọc hoặc phân tích cấu hình cột:", error);
    }
    return columnsSigningSubmission;
  }, []);

  // Fetch data từ API
  const getDataSigningFromApi = useCallback(
    async ({ page, limit, query, code, sort }) => {
      try {
        const params = {
          limit: limit || 100,
          sort: sort || "-updatedAt",
          "filter[stage]": "receive",
          "filter[createdBy]": "62346aa9da4d530f61bbbefd",
          "filter[checkRole]": true,
          codeStatus: "new",
          page: page || 1,
        };

        if (query && code && Array.isArray(code)) {
          code.forEach((c) => {
            params[`filter[${c}]`] = query;
          });
        }

        const response = await axiosInstance.get(API_DS_VANBANDI_DHVB, {
          params,
        });
        if (response) {
          return {
            data:
              response.map((item) => ({
                deadlineReply: item.deadlineReply || item.deadline,
                draftDocumentSymbol:
                  item.draftDocumentSymbol || item.documentNumber,
                abstractNote: item.abstractNote || item.extract,
                documentStatus: item.documentStatus, // Lấy trực tiếp giá trị
                urgencyLevel: item.urgencyLevel, // Lấy trực tiếp giá trị
                privateLevel: item.privateLevel, // Lấy trực tiếp giá trị
                reportDocumentSymbol: item.reportDocumentSymbol,
                docSenderUnit: item.docSenderUnit,
                documentType: item.documentType, // Lấy trực tiếp giá trị
                signer: item.signer, // Lấy trực tiếp giá trị
                createdAt: item.createdAt,
                toBookTextSymbols: item.toBookTextSymbols,
                documentField: item.documentField, // Lấy trực tiếp giá trị
                internalReceivingUnit: item.internalReceivingUnit,
                incommingDocument: item.incommingDocument,
                tasks: item.tasks,
                autoReleaseCheck: item.autoReleaseCheck ? "Có" : "Không",
                caSignCheck: item.caSignCheck ? "Có" : "Không",
                completeStatus: item.completeStatus,
                createdBy: item.createdBy,
                drafter: item.drafter, // Lấy trực tiếp giá trị
                listRecipientsOutSystem: item.listRecipientsOutSystem,
                _id: item._id,
              })) || [],
            total: response.length || 0,
          };
        }

        return { data: [], total: 0 };
      } catch (error) {
        logger.error("Lỗi khi gọi API:", error);
        toast("Đã xảy ra lỗi khi tải dữ liệu!", "error");
        return { data: [], total: 0 };
      }
    },
    [toast]
  );

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    setSelectedIds([]);
  };

  const handleDelete = async (ids) => {
    setIsLoading(true);
    try {
      if (!ids?.length) {
        toast("Vui lòng chọn ít nhất một dòng để xóa!", "warning");
        return;
      }
      toast(`Đã xóa ${ids.length} bản ghi thành công!`, "success");
      setSelectedIds([]);
    } catch (error) {
      toast("Đã xảy ra lỗi khi xóa!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (id) => {
    handleOpenDialog("edit", id);
  };

  const handleView = (id) => {
    // 3. Sửa lại handleView để mở dialog thay vì navigate
    setSelectedId(id);
    setOpenDialogs((prev) => ({ ...prev, view: true }));
  };

  // const handleOpenDialog = (dialogKey, id = null) => {
  //   if (dialogKey === "edit" && id) {
  //     setSelectedId(id);
  //     // reset form theo dữ liệu thực tế nếu có
  //   } else {
  //     reset();
  //   }
  //   setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
  // };
  const handleOpenDialog = (dialogKey, id = null) => {
  if (dialogKey === "edit" && id) {
    setSelectedId(id);
    
    // QUAN TRỌNG: Reset form trước khi mở Edit
    reset(); // ← Đây là cái bạn đang thiếu!

    // Sau đó mới mở dialog
    setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
  } else {
    reset(); // Reset khi thêm mới
    setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
  }
};

  const handleCloseDialogAdd = () => handleCloseDialog("add");
  const handleCloseDialogEdit = () => handleCloseDialog("edit");
  const handleCloseDialogView = () => handleCloseDialog("view"); // 4. Thêm hàm đóng cho ViewDialog

  const handleCloseDialog = (dialogKey) => {
    setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
    reset();
    setSelectedId(null);
  };

  const handleOpenDialogAdd = () => handleOpenDialog("add");
  
  // Hàm này sẽ được gọi khi AddDialog thêm mới thành công, để reload lại bảng
  const handleAddSuccess = () => {
    // Chỉ cần thay đổi state để trigger reload cho CustomTable
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 100); // Một mẹo nhỏ để reload
  }

  // // Tương tự, bỏ `handleSubmit` cho hàm edit
  const handleEditSubmit = async (data) => {
    setIsLoading(true);
    try {
      const payload = createSigningSubmissionPayload(data);
      const response = await axiosInstance.put(
        `${API_ADD_VANBANDI_DHVB}/${selectedId}`,
        payload
      );
      if (response) { // Thêm kiểm tra response
        toast("Cập nhật thành công!", "success");
        handleCloseDialog("edit");
      }
    } catch (error) {
      toast(error?.message || "Đã xảy ra lỗi khi cập nhật!", "error");
    } finally {
      setIsLoading(false);
    }
  };
    // Xác định title và documentType dựa trên tab hiện tại
  const isPromulgateTab = tabs[currentTab]?.value === 'promulgate'; // Giả sử bạn sẽ thêm tab này
  const dialogProps = {
    title: isPromulgateTab
      ? "Thêm mới dự thảo văn bản ban hành"
      : "Thêm mới dự thảo văn bản trình ký",
    editTitle: isPromulgateTab
      ? "Chỉnh sửa dự thảo văn bản ban hành"
      : "Chỉnh sửa văn bản dự thảo",
    documentType: isPromulgateTab ? 2 : 1,
  };

  return (
    <PageContainer>
      {/* Tabs */}
      <TabsWrapper>
        <TabsContainer
          value={currentTab}
          onChange={handleTabChange}
          variant="standard"
        >
          {tabs.map((tab) => (
            <StyledTab
              key={tab.value}
              label={
                <TabLabel>
                  {tab.label}
                  {/* {tab.badge > 0 && (
                    <TabBadge badgeContent={tab.badge} color="primary" />
                  )} */}
                </TabLabel>
              }
            />
          ))}
        </TabsContainer>
      </TabsWrapper>

      {/* Table */}
      <TableWrapper>
        <CustomTable
					codeModule="OutGoingDocument"
          fetchData={getDataSigningFromApi}
          columns={columns}
          key={currentTab}
          disableSynchronize
          filter={filtersSigningSubmission}
          reload={isLoading}
          onAdd={handleOpenDialogAdd}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onView={handleView}
          anableDateRangePicker
          enableColumnSelector
          enableCustomAdd
          enableSort
          enableViewConfig
          filterUp
          disableBL
        />
      </TableWrapper>

      {/* Dialog thêm mới */}
      {openDialogs.add && (
        <AddDialog
          key="add-dialog"
          mode="add"
          open={openDialogs.add}
          onClose={handleCloseDialogAdd}
          control={control}
		      onSuccess={handleAddSuccess} // Truyền hàm để reload bảng
          errors={errors}
           title={dialogProps.title}
          documentType={dialogProps.documentType}
          setValue={setValue}
        />
      )}

      {/* 5. Render ViewDialog */}
      {openDialogs.view && (
        <ViewDialog
          key="view-dialog"
          open={openDialogs.view}
          onClose={handleCloseDialogView}
          documentId={selectedId}
          control={control}
          reset={reset}
          errors={errors}
        />
      )}

      {/* Dialog chỉnh sửa */}
      {openDialogs.edit && (
        <EditDialog
          key="edit-dialog"
          mode="edit"
          open={openDialogs.edit}
          onClose={handleCloseDialogEdit}
          onSuccess={handleEditSubmit} 
          isLoading={isLoading}
          title={dialogProps.editTitle}
          documentType={dialogProps.documentType}
          documentId={selectedId}
        />
      )}
    </PageContainer>
  );
};

export default SigningSubmissionTab;
