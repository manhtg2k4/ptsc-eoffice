import React, { useCallback, useState, useMemo, useEffect } from "react";
// import { Box } from '@mui/material';
import CustomTable from "@components/CustomTable/CustomTable";
import { filtersSigningSubmission, incomingDocumentSchema } from "./constants";
import { useForm } from "react-hook-form";
import { useToast } from "@components/common/ToastProvider";
import { yupResolver } from "@hookform/resolvers/yup";
import {
	PageContainer,
	TableWrapper,
} from "@styles/SigningSubmissionTab.styles";
import AddIncommingDoc from "@pages/IncomingDocumentManagement/components/AddIncommingDoc";
import {
	// API_DETAIL_VANBANDEN_DHVB,
	API_INCOMMINGDOCUMENT_RECEPTION,
} from "@EnvironmentFile/constants/urlConfig";
import UpdateIncommingDoc from "@pages/IncomingDocumentManagement/components/UpdateIncommingDoc";
import ViewIncommingDoc from "@pages/IncomingDocumentManagement/components/ViewIncommingDoc";
import DeleteDialog from "@pages/IncomingDocumentManagement/components/DeleteDialog";
import RecallIncomingTextDialog from "@pages/DocumentRetrieval/components/RecallIncomingTextDialog"; // Import the new dialog
import { useDispatch, useSelector } from "react-redux";
import { fetchDhvbConfig } from "@redux/slices/configSlice";
import axiosInstance from "@utils/axiosInstance";
import withSharedComponents from "@components/WrapperComponent";

const Reception = ({
	selection,
	onSelectionChange,
	renderCustomActions,
	panelContainerRef,
	setDataDetail,
	dataReload = null,
	sharedComponents
}) => {
	const { CustomChildTab } = sharedComponents
	const [openDialogs, setOpenDialogs] = useState({
		add: false,
		delete: false,
		edit: false,
		view: false,
		recallReason: false, // Add state for the new dialog
	});
	const dispatch = useDispatch();
	const toast = useToast();
	const { crmSource } = useSelector((state) => state.config);
	const {
		// control,
		// handleSubmit,
		// formState: { errors },
		reset,
	} = useForm({
		resolver: yupResolver(incomingDocumentSchema), // Tích hợp yup
	});
	const [tableData, setTableData] = useState([]);

	const [data, setData] = useState([]);
	const [currentTab, setCurrentTab] = useState(1);
	const [refreshTrigger, setRefreshTrigger] = useState(0);
	const [, setIsLoading] = useState(false);
	const [selectedIds, setSelectedIds] = useState([]);
	// const [documentFlags, setDocumentFlags] = useState(null);
	const [, setDocumentFlags] = useState(null);
	const [recallDocData, setRecallDocData] = useState(null); // State to hold incomingDocId and workItemId
	const [reloadData, setReloadData] = useState(dataReload);


	useEffect(() => {
		if (dataReload !== null) {
			setReloadData(dataReload);     
		}
	}, [dataReload]);

	useEffect(() => {
		dispatch(fetchDhvbConfig());
	}, [dispatch]);

	// Tabs data - wrapped in useMemo to avoid dependency issues
	const tabs = useMemo(() => [
		{ label: "PHIẾU XỬ LÝ", value: "receive" },
		{ label: "TIẾP NHẬN", value: "waiting" },
		{ label: "TRA CỨU", value: "submited" },
	], []);

	const columns = useMemo(() => {
		try {
			const viewConfigStr = localStorage.getItem("viewConfig");
			if (!viewConfigStr) return [];

			const viewConfig = JSON.parse(viewConfigStr);
			const config = Array.isArray(viewConfig) ? viewConfig : viewConfig.data;
			const docConfig = config.find((c) => c.code === "IncommingDocument");

			if (!docConfig?.field) return [];

			return docConfig.field
				.filter((f) => f.checked)
				.sort((a, b) => a.order - b.order)
				.map((f) => ({
					row: f.name, // ← BẮT BUỘC
					name: f.title, // ← Hiển thị
					width: f.width, // ← API sẽ cập nhật
				}));
		} catch (e) {
			logger.error(e);
			return [];
		}
	}, []);
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
					API_INCOMMINGDOCUMENT_RECEPTION,
					{ params: apiParams }
				);

				if (response && response.items) {
					setTableData(response.items);
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

	const handleTabChange = (event, newValue) => {
		setCurrentTab(newValue);
		setRefreshTrigger((prev) => prev + 1); // reload table khi đổi tab
		onSelectionChange([]);
	};
	// Handle delete
	const handleDeleteConfirm = useCallback(
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

	const handleOpenDialog = useCallback(
		async (dialogKey, record = null) => {
			switch (dialogKey) {
				case "add":
					{
						const getFirstValue = (code) => crmSource.find(item => item.code === code)?.data?.[0]?.value;


						const defaultValues = {
							documentDate: new Date(),
							receiveDate: new Date(),
							toBookDate: new Date(),
							receiveMethod: getFirstValue("S27"), // Phương thức nhận
							privateLevel: getFirstValue("S21"), // Độ mật
							urgencyLevel: getFirstValue("S20"), // Độ khẩn
							documentType: getFirstValue("S19"), // Loại văn bản
							documentField: getFirstValue("S26"), // Lĩnh vực
						};
						// Lọc ra các giá trị undefined để không ghi đè giá trị rỗng
						const filteredDefaults = Object.fromEntries(Object.entries(defaultValues).filter(([, v]) => v !== undefined));

						reset(filteredDefaults);
					}
					break;

				case "edit":
				case "view": {
					// Lấy ID của văn bản từ record được chọn
					const docId = record?._id || record?.documentId || record?.id || record;
					if (!docId) {
						toast("Không tìm thấy ID văn bản!", "error");
						return;
					}
					// Truyền ID vào state để các component con sử dụng
					setData({ documentId: docId });
					break;
				}

				case "delete":
					setSelectedIds(Array.isArray(record) ? record : [record]);
					break;

				case "recallIncomingDoc": // This key matches the dialogKey in componentRegistry.js
					// console.log("Dữ liệu bản ghi để thu hồi (recall):", record); // Console.log a record
					if (!record?.documentId || !record?.workItem?.id) {
						toast("Không tìm thấy thông tin văn bản hoặc quy trình để thu hồi.", "error");
						return;
					}
					setRecallDocData({
						incomingDocId: record.documentId,
					});
					setOpenDialogs((prev) => ({ ...prev, recallReason: true }));
					return; // Return early as we handle opening the specific dialog
				default:
					break;
			}
			setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
		},
		[reset, toast, tableData, crmSource]
	);

	const handleCloseDialog = useCallback((dialogKey) => {
		setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
		setIsLoading(false);
		reset({}); // Luôn reset form khi đóng dialog để đảm bảo sạch sẽ
		if (dialogKey === "edit" || dialogKey === "view" || dialogKey === "add") {
			setData(null); // Reset data khi đóng dialog
			setRecallDocData(null); // Reset recall data
			if (dialogKey === 'view') setDocumentFlags(null);
			// reset(defaultFormValuesEnviroMonitor);
		} else if (dialogKey === "delete") {
			setSelectedIds([]);
		}
		// reset(undefined, { keepValues: true });
	}, [reset]);

	// Wrapper handlers to avoid inline functions in JSX
	const handleAdd = useCallback(
		() => handleOpenDialog("add"),
		[handleOpenDialog]
	);
	const handleEdit = useCallback(
		(record) => handleOpenDialog("edit", record),
		[handleOpenDialog]
	);

	const handleView = useCallback(
		(record) => {
			// logger.log("view record", record);
			handleOpenDialog("view", record);
		},
		[handleOpenDialog]
	);
	const handleDelete = useCallback(
		(ids) => handleOpenDialog("delete", ids),
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
	const handleViewClose = useCallback(
		() => handleCloseDialog("view"),
		[handleCloseDialog]
	);
	const handleDeleteClose = useCallback(
		() => handleCloseDialog("delete"),
		[handleCloseDialog]
	);
	const handleRecallReasonClose = useCallback(
		() => handleCloseDialog("recallReason"),
		[handleCloseDialog]
	);
	const handleRecallReasonSuccess = useCallback(
		() => handleSuccess("recallReason"),
		[handleSuccess]
	);

	const handleSuccess = useCallback(
		(dialogKey) => {
			handleCloseDialog(dialogKey);
			// Trigger việc tải lại dữ liệu trong CustomTable bằng cách thay đổi state refreshTrigger
			setRefreshTrigger((prev) => prev + 1);
		},
		[handleCloseDialog]
	);

	const handleAddSuccess = useCallback(() => handleSuccess("add"), [handleSuccess]);
	const handleEditSuccess = useCallback(() => handleSuccess("edit"), [handleSuccess]);
	return (
		<PageContainer>
			<CustomChildTab tabs={tabs} currentTab={currentTab} onChange={handleTabChange} />
			<TableWrapper id="incoming-list-overlay-root" ref={panelContainerRef}>
				<CustomTable
					codeModule="IncommingDocument"
					key={currentTab}
					fetchData={getDataSigningFromApi}
					disableSynchronize
					columns={columns}
					anableDateRangePicker
					filter={filtersSigningSubmission}
					reload={`${refreshTrigger}-${reloadData}`} // Sử dụng refreshTrigger để reload
					// Chỉ hiển thị các nút Thêm, Sửa, Xóa ở tab "Tiếp nhận" (index 1)
					onAdd={currentTab === 1 ? handleAdd : undefined}
					onDelete={currentTab === 1 ? handleDelete : undefined}
					onEdit={currentTab === 1 ? handleEdit : undefined}
					onView={handleView}

					disableAdd={currentTab !== 1}
					disableEdit={currentTab !== 1}
					disableDelete={currentTab !== 1}
					// codeModule={moduleCode}
					getDataBySelectRows={(data) => {
						// logger.log("datasssss", data);
						setDataDetail(data);
					}}
					selection={selection}
					onSelectionChange={onSelectionChange}
					disableDeletePQ // Disable default delete button
					renderCustomActions={renderCustomActions} // Pass the custom actions rendering function
					encodeHtml
				>
					{/* Chỉ render các dialog này ở tab "Tiếp nhận" */}
					{currentTab === 1 && (
						<>
							<AddIncommingDoc
								open={openDialogs.add}
								onClose={handleAddClose}
								onSuccess={handleAddSuccess}
							/>
							<UpdateIncommingDoc
								open={openDialogs.edit}
								onClose={handleEditClose}
								documentId={data?.documentId}
								onSuccess={handleEditSuccess}
							/>
						</>
					)}
					<ViewIncommingDoc
						open={openDialogs.view}
						onClose={handleViewClose}
						documentId={data?.documentId}
						setReloadData={setReloadData}
					/>

					<DeleteDialog
						open={openDialogs.delete}
						onClose={handleDeleteClose}
						onSave={handleDeleteConfirm}
						selectedIds={selectedIds}
					/>

					{/* New RecallIncomingTextDialog */}
					<RecallIncomingTextDialog
						open={openDialogs.recallReason}
						onClose={handleRecallReasonClose}
						onSuccess={handleRecallReasonSuccess}
						incomingDocId={recallDocData?.incomingDocId}
					/>
				</CustomTable>
			</TableWrapper>
		</PageContainer>
	);
};

// export default Reception;
export default withSharedComponents(Reception);
