import React, { useCallback, useState, useMemo, useEffect } from 'react';
import CustomTable from '@components/CustomTable/CustomTable';
import { filtersSigningSubmission } from './constants';
import { useToast } from "@components/common/ToastProvider";
import {
  PageContainer,
  TableWrapper
} from '@styles/SigningSubmissionTab.styles';
import { API_INCOMMINGDOCUMENT_IMPLEMENTATION_COORDINATION } from '@EnvironmentFile/constants/urlConfig';
import ViewIncommingDoc from '@pages/IncomingDocumentManagement/components/ViewIncommingDoc';
import axiosInstance from '@utils/axiosInstance';
import withSharedComponents from '@components/WrapperComponent';

const Combination = ({ selection, onSelectionChange, dataReload = null, sharedComponents,renderCustomActions, panelContainerRef }) => {
	const { CustomChildTab } = sharedComponents
	const toast = useToast();
  const [currentTab, setCurrentTab] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [reload, setReload] = useState(dataReload);
  const [openDialogs, setOpenDialogs] = useState({ view: false });
  const [dataDetail, setDataDetail] = useState(null);

  useEffect(() => {
      if (dataReload !== null) {
        setReload(dataReload);     // cập nhật đúng mỗi khi cha thay đổi
      }
    }, [dataReload]);

  const tabs = useMemo(() => [
    { label: 'CHỜ XỬ LÝ', value: 'waiting', badge: 0 },
    { label: 'ĐÃ XỬ LÝ', value: 'processed', badge: 0 },
    { label: 'CHƯA HOÀN THÀNH', value: 'incompleted', badge: 0 },
    { label: 'HOÀN THÀNH', value: 'completed', badge: 0 },
  ], []);

  const getDataSigningFromApi = useCallback(
    async ({ page, limit, query, code, sort, startDate, endDate }) => {
      try {
        // Xây dựng data object từ các tham số truyền vào
        const apiParams = {
          page: page || 1,
          limit: limit || 100,
        };

        // Thêm search query vào từng field được chọn
        if (query && query.trim() && code && code.length > 0) {
          const searchValue = query.trim();
          // Gửi search query cho từng field code
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

        // Thêm tab value nếu cần
        if (currentTab !== undefined) {
          apiParams.type = tabs[currentTab]?.value;
        }

        // Gửi trực tiếp như data, không phải { params }
        const response = await axiosInstance.get(
          API_INCOMMINGDOCUMENT_IMPLEMENTATION_COORDINATION,
          { params: apiParams }
        );

        if (response && response.items) {
          return {
            data:
              response.items?.map((item) => {
                const doc = item.document || item;

                return {
                  // ID fields
                  _id: doc._id || doc.document_id || doc.documentId || null,
                  documentId: doc._id || doc.document_id || doc.documentId || null,

                  // Status & metadata
                  statusCode: doc.statusCode || doc.status_code || "",
                  createdAt: doc.createdAt || doc.created_at || "",
                  updatedAt: doc.updatedAt || doc.updated_at || "",

                  // Document info
                  bookDocumentId: doc.bookDocumentId || doc.book_document_id || "",
                  abstractNote: doc.abstractNote || doc.abstract_note || "",
                  toBook: doc.toBook || doc.to_book || "",
                  secondBook: doc.secondBook || doc.second_book || "",
                  signer: doc.signer || "",

                  // Units
                  senderUnit: doc.senderUnit || doc.sender_unit || "",
                  receiverUnit: doc.receiverUnit || doc.receiver_unit || "",

                  // Dates
                  documentDate: doc.documentDate || doc.document_date || null,
                  receiveDate: doc.receiveDate || doc.receive_date || null,
                  toBookDate: doc.toBookDate || doc.to_book_date || null,
                  deadline: doc.deadline ?? null,

                  // Classification
                  receiveMethod: doc.receiveMethod || doc.receive_method || "",
                  privateLevel: doc.privateLevel || doc.private_level || "",
                  urgencyLevel: doc.urgencyLevel || doc.urgency_level || "",
                  documentType: doc.documentType || doc.document_type || "",
                  documentField: doc.documentField || doc.document_field || "",

                  // Workflow & actions
                  openWorkItems: doc.openWorkItems || [],
                  workItem: doc.workItem || null,
                  node: doc.node || null,
                  availableActions: doc.availableActions || [],
                  flags: doc.flags || { canProcess: false, canReturn: false },
                  perItems: doc.perItems || [],
                };

              }) || [],

            total: response.total || 0,
            page: response.page ?? 1,
            limit: response.limit ?? 100,
            totalPages: response.totalPages ?? 1,
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
    [toast, currentTab, tabs]
  );

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    setRefreshTrigger(prev => prev + 1); // Tải lại bảng khi chuyển tab
    onSelectionChange([]);
  };

  const handleCloseDialog = useCallback((dialogKey) => {
    setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
  }, []);

  const handleOpenDialog = useCallback(async (dialogKey, record = null) => {
    if (dialogKey === "view" && record) {
      const docId = record._id || record.documentId || record.id || record;

      if (!docId) {
        toast("Không tìm thấy ID văn bản!", "error");
        return;
      }

      setDataDetail({ documentId: docId });
      setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
    }
  }, [toast]);

  const handleView = useCallback((record) => {
    handleOpenDialog("view", record);
  }, [handleOpenDialog]);

  const handleViewClose = useCallback(() => handleCloseDialog("view"), [handleCloseDialog]);

  return (
    <PageContainer>

			<CustomChildTab tabs={tabs} currentTab={currentTab} onChange={handleTabChange} />
      {/* CustomTable */}
      <TableWrapper id="incoming-list-overlay-root" ref={panelContainerRef}>
        <CustomTable
          key={currentTab}
					codeModule={"IncommingDocument_Combination"}
          // columns={columns}
          fetchData={getDataSigningFromApi}
          disableSynchronize
          filter={filtersSigningSubmission}
          reload={`${refreshTrigger} - ${reload}`}
          onView={handleView}
          selection={selection}
          onSelectionChange={onSelectionChange}
          disableAdd
          disableEdit
          disableDeletePQ
          renderCustomActions={renderCustomActions}
					encodeHtml
        />
      </TableWrapper>
      <ViewIncommingDoc
        open={openDialogs.view}
        onClose={handleViewClose}
        documentId={dataDetail?.documentId}
        setReloadData={setReload}
      />
    </PageContainer>
  );
};

export default withSharedComponents(Combination);
