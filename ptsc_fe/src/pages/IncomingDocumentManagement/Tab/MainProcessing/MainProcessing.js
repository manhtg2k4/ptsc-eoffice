import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useToast } from "@components/common/ToastProvider";
import CustomTable from "@components/CustomTable/CustomTable";
import {
  PageContainer,
  TableWrapper,
} from "@styles/SigningSubmissionTab.styles";
import { filtersSigningSubmission } from "./constants";
import ViewIncommingDoc from "@pages/IncomingDocumentManagement/components/ViewIncommingDoc"; 
import { API_INCOMMINGDOCUMENT_PROSSING } from "@EnvironmentFile/constants/urlConfig";
import axiosInstance from "@utils/axiosInstance";
import withSharedComponents from "@components/WrapperComponent";

const MainProcessing = ({ selection, onSelectionChange, dataReload = null, sharedComponents, renderCustomActions, panelContainerRef }) => {
  const { CustomChildTab } = sharedComponents
  const toast = useToast();

  const [currentTab, setCurrentTab] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [openDialogs, setOpenDialogs] = useState({ view: false });
  const [dataDetail, setDataDetail] = useState(null);
  const [reloadData,setReloadData] = useState(dataReload);
 
  useEffect(() => {
    if (dataReload !== null) {
      setReloadData(dataReload);     // cập nhật đúng mỗi khi cha thay đổi
    }
  }, [dataReload]);

  const handleCloseDialog = useCallback((dialogKey) => {
    setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
  }, []);

  const tabs = useMemo(() => [
    { label: "VĂN BẢN KHẨN", value: "urgent" },
    { label: "VĂN BẢN CÓ HẠN", value: "deadline" },
    { label: "VĂN BẢN KHÁC", value: "other" },
    { label: "ĐÃ XỬ LÝ", value: "processed" },
    { label: "CHƯA HOÀN THÀNH", value: "incompleted" },
    { label: "HOÀN THÀNH", value: "completed" },
  ], []);

  const getDataSigningFromApi = useCallback(
    async ({ page, limit, query, code, sort, startDate, endDate }) => {
      try {
        const type = tabs[currentTab].value; // ← Lấy type theo tab

        const apiParams = {
          page: page || 1,
          limit: limit || 100,
          type: type,
        };

        // Gửi search query vào từng field được chọn
        if (query && query.trim() && code && code.length > 0) {
          const searchValue = query.trim();
          code.forEach((fieldCode) => {
            apiParams[fieldCode] = searchValue;
          });
        }

        // Thêm date range filters nếu có
        if (startDate) {
          apiParams.startDate = startDate;
        }
        if (endDate) {
          apiParams.endDate = endDate;
        }

        // Thêm sort nếu có
        if (sort) {
          apiParams.sort = sort;
        }

        const response = await axiosInstance.get(
          API_INCOMMINGDOCUMENT_PROSSING,
          { params: apiParams }
        );

        if (response && response.items) {
          return {
            data: response.items.map((item) => {
              return {
                _id: item.documentId || item.document_id || null,
                documentId: item.documentId || item.document_id || null,
                documentNumber:
                  item.documentNumber || item.document_number || item.documentNo || item.document_no || "",
                statusCode:
                 item.statusCode || "",
                status: item.status || item.statusName || item.status_code || item.statusCode || "",
                createdAt: item.createdAt || "",
                updatedAt: item.updatedAt || "",
                bookDocumentId:
                  item.bookDocumentId || "",
                abstractNote: item.abstractNote || "",
                extract: item.abstractNote || item.abstract_note || "",
                toBook: item.toBook || "",
                senderUnit: item.senderUnit  || "",
                receiverUnit: item.receiverUnit  || "",
                documentDate: item.documentDate || null,
                receiveDate: item.receiveDate || null,
                toBookDate: item.toBookDate || null,
                deadline: item.deadline ?? null,
                secondBook: item.secondBook || "",
                receiveMethod: item.receiveMethod || "",
                privateLevel: item.privateLevel || "",
                urgencyLevel: item.urgencyLevel || "",
                documentType: item.documentType || "",
                documentField: item.documentField || "",
                signer: item.signer || "",
                openWorkItems: item.openWorkItems || [],
                workItem: item.workItem || null,
                flags: item.flags || {},
                perItems: item.perItems || [],
              };
            }),
            total: response.total || 0,
            page: response.page ?? 1,
            limit: response.limit ?? 100,
            totalPages: response.totalPages ?? 1,
          };
        }

        return { data: [], total: 0 };
      } catch (error) {
        toast("Đã xảy ra lỗi khi tải dữ liệu!", "error");
        return { data: [], total: 0 };
      }
    },
    [currentTab, toast, tabs]
  );

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    setRefreshTrigger((prev) => prev + 1); // reload table khi đổi tab
    onSelectionChange([]);
  };

  const handleOpenDialog = useCallback(async (dialogKey, record = null) => {
    if (dialogKey === "view" && record) { 
      const docId = record._id || record.documentId || record.id || record;

      if (!docId) {
        toast("Không tìm thấy ID văn bản!", "error");
        return;
      }

      // Chỉ truyền documentId, không gọi API ở đây
      setDataDetail({ documentId: docId });
      setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
    }
  }, [toast]);

  const handleView = useCallback((record) => {
    handleOpenDialog("view", record);
  }, [handleOpenDialog]);

  const handleViewClose = useCallback(() => {
    handleCloseDialog("view");
  }, [handleCloseDialog]);

  return (
    <PageContainer>
			<CustomChildTab tabs={tabs} currentTab={currentTab} onChange={handleTabChange} />
      <TableWrapper id="incoming-list-overlay-root" ref={panelContainerRef}>
        <CustomTable
          key={currentTab} // force refresh khi đổi tab
					codeModule={"IncommingDocument_MainProcessing"}
          fetchData={getDataSigningFromApi}
          filter={filtersSigningSubmission}          
          refreshTrigger={refreshTrigger}
          selection={selection}
          onSelectionChange={onSelectionChange}
          disableDefaultSort
          disableEdit
          reload={reloadData}
          disableDeletePQ
          onView={handleView}
          disableSynchronize
          disableAdd
          renderCustomActions={renderCustomActions}
					encodeHtml
        />
      </TableWrapper>
      <ViewIncommingDoc
        open={openDialogs.view}
        onClose={handleViewClose}
        documentId={dataDetail?.documentId}
        setReloadData={setReloadData}
        />
    
    </PageContainer>
  );
};

export default withSharedComponents(MainProcessing);
