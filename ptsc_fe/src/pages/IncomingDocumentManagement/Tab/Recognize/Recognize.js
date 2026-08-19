import React, { useCallback, useMemo, useState } from 'react';
// import { useDispatch } from "react-redux";
import CustomTable from '@components/CustomTable/CustomTable';
import { filtersSigningSubmission } from './constants';
import { useToast } from "@components/common/ToastProvider";
import { API_INCOMMINGDOCUMENT_RECIPIENT_TO_KNOW } from '@EnvironmentFile/constants/urlConfig';
import {
	PageContainer,
	TableWrapper
} from '@styles/SigningSubmissionTab.styles';
import withSharedComponents from '@components/WrapperComponent';
import ViewIncommingDoc from '@pages/IncomingDocumentManagement/components/ViewIncommingDoc';
import axiosInstance from '@utils/axiosInstance';

const Recognize = ({ sharedComponents }) => {
	const { CustomChildTab } = sharedComponents
//   const dispatch = useDispatch();
  const toast = useToast();
  
  const [currentTab, setCurrentTab] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [openDialogs, setOpenDialogs] = useState({ view: false });
  const [dataDetail, setDataDetail] = useState(null);
  const [reloadData, setReloadData] = useState(null);

  // Tabs data
  const tabs = useMemo(() => [
   { label: 'CHỜ XỬ LÝ', value: 'waiting' },
    { label: 'ĐÃ XỬ LÝ', value: 'processed'},
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
					API_INCOMMINGDOCUMENT_RECIPIENT_TO_KNOW,
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
		setRefreshTrigger(prev => prev + 1);
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
			<TableWrapper>
				<CustomTable
					key={currentTab}
					codeModule={"IncommingDocument_Recognize"}
					fetchData={getDataSigningFromApi}
					disableSynchronize
					filter={filtersSigningSubmission}
				    reload={`${refreshTrigger} - ${reloadData}`}
					onView={handleView}
					disableAdd
					disableEdit
					disableDeletePQ
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

export default withSharedComponents(Recognize);