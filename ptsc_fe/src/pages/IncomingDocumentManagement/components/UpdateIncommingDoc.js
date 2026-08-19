import withSharedComponents from '@components/WrapperComponent';
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useToast } from "@components/common/ToastProvider";
import GeneralInformation from './AddIncommingDoc/components/GeneralInformation';
// import ProposedTreatment from './AddIncommingDoc/components/ProposedTreatment';
// Import action vừa tạo từ configSlice
import { updateIncomingDocument } from '@redux/slices/configSlice';
import { incomingDocumentSchema } from '@pages/IncomingDocumentManagement/Tab/Reception/constants';
import axiosInstance from '@utils/axiosInstance';
import { API_DETAIL_VANBANDEN_DHVB, APP_BASE } from '@EnvironmentFile/constants/urlConfig';
import FormButton from '@components/FormButton';
import { patchFilesCopy, clearSelectedTextCopy, patchFileImportance } from '@redux/slices/IncomingDocument/IncommingDocSlice';
import { MAX_DEPTH_LEVEL } from '@variable';
// import Button from '@components/CustomButton';
import CustomSwipper from "@components/Swipper/BaseSwiper";
import { FlexGrowBox, FooterActions } from '@styles/BaseSwiper/BaseSwiper.style';
const UpdateIncommingDoc = ({
	open,
	onClose,
	documentId,
	onSuccess,
	sharedComponents,
	setReloadData,
	mode = "edit"
}) => {
	const dispatch = useDispatch();
	const panelContainerRef = useRef(null);
	const toast = useToast();
	const {
		// CustomTabsWithBadge,
		ButtonOutline,
		TransferProcess,
		SubmitProposal
	} = sharedComponents;
	// const [tabValue, setTabValue] = useState(0);
	const [docData, setDocData] = useState({});
	const [dataDetail, setDataDetail] = useState({});
	const [originalFormData, setOriginalFormData] = useState(null); // Lưu data ban đầu để so sánh
	const [transferConfig, setTransferConfig] = useState(null);
	const transferSuccessfulRef = useRef(false);

	const {
		control,
		handleSubmit,
		formState: { errors },
		reset,
		setValue,
		getValues,
	} = useForm({
		resolver: yupResolver(incomingDocumentSchema),
	});


	// Helper function để trích xuất giá trị từ object hoặc trả về chính nó nếu là primitive
	const getVal = useCallback((val, key = "_id") => {
		if (val && typeof val === 'object') return val[key] || "";
		return val || "";
	}, []);

	const getFileIdString = useCallback((fileids) => {
		const fileList = Array.isArray(fileids) ? fileids : [];
		return fileList
			.filter((file) => file?._id || file?.id) // Lọc những file có _id hoặc id
			.map((file) => file._id || file.id)
			.join(',');
	}, []);

	// Hàm map lại dữ liệu chi tiết từ API sang primitive cho form
	const mapDetailToFormValues = useCallback((doc) => {
		if (!doc) return {};
		const rawBookId = (doc.bookDocumentId && typeof doc.bookDocumentId === 'object')
			? (doc.bookDocumentId.bookDocumentId || doc.bookDocumentId.book_document_id || doc.bookDocumentId.id || doc.bookDocumentId._id)
			: doc.bookDocumentId;
		const bookId = rawBookId ? String(rawBookId) : "";
		return {
			...doc,
			senderUnit: doc.senderUnit?._id || doc.senderUnit,
			receiverUnit: doc.receiverUnit,
			receiveMethod: getVal(doc.receiveMethod, 'value'),
			privateLevel: getVal(doc.privateLevel, 'value'),
			urgencyLevel: getVal(doc.urgencyLevel, 'value'),
			documentType: getVal(doc.documentType, 'value'),
			documentField: getVal(doc.documentField, 'value'),
			viewGroup: doc.viewGroup?.code || doc.viewGroup?.Id || doc.viewGroup?.id || doc.viewGroup?._id || (typeof doc.viewGroup === 'string' ? doc.viewGroup : ""),
			bookDocumentId: bookId,
		};
	}, [getVal]);

	useEffect(() => {
		const fetchDetail = async () => {
			if (open && documentId) {
				try {
					// 1. Lấy chi tiết văn bản
					const url = API_DETAIL_VANBANDEN_DHVB(documentId);
					const response = await axiosInstance.get(url);
					const data = response?.document || {};


					// 2. Lấy danh sách file từ API mới
					let fileList = [];
					try {
						const objectType = "incommingdocument";
						const filesApiUrl = `${APP_BASE}/api/files/by-object?object_type=${objectType}&object_id=${documentId}`;
						const filesResponse = await axiosInstance.get(filesApiUrl);
						const filesData = Array.isArray(filesResponse) ? filesResponse : (filesResponse.data || []);
						if (Array.isArray(filesData)) {
							fileList = filesData.map(file => ({
								_id: file.id,
								name: file.file_name,
								fileName: file.file_name,
								path: file.file_path,
								size: file.file_size,
								mimetype: file.mime_type,
								createdAt: file.created_at,
								isCertifiedCopy: Boolean(
									file.isCertifiedCopy ??
									file.is_certified_copy ??
									file.isCertifiedcopy ??
									file.is_certifiedCopy ??
									false
								),
								isImportant: Boolean(
									file.isImportant ??
									file.is_important ??
									false
								),
							}));
							fileList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
						}
					} catch (err) {
						logger.error("Lỗi lấy danh sách file đính kèm:", err);
					}

					// 4. Reset form với dữ liệu đã gộp, đã map lại các trường object sang primitive
					setDocData(data);
					setDataDetail(response);
					const initialData = {
						...mapDetailToFormValues(data),
						fileids: fileList
					};
					reset(initialData);
					// Lưu original data để so sánh sau này
					setOriginalFormData(initialData);

				} catch (error) {
					logger.error(error);
					toast("Có lỗi xảy ra khi lấy chi tiết văn bản", "error");
				}
			}
		};
		fetchDetail();
	}, [open, documentId, reset, toast, mapDetailToFormValues]);

	// const handleTabChange = (event, newValue) => {
	// 	setTabValue(newValue);
	// };

	// const tabs = [
	// 	{ label: "Thông tin chung" },
	// 	{ label: "Đề xuất xử lý" },
	// ];

	// const renderTabContent = () => {
	// 	switch (tabValue) {
	// 		case 0:
	// 			return <GeneralInformation control={control} errors={errors} disableReceiverUnitTreeView documentId={documentId} dataDetail={docData} />;
	// 		case 1:
	// 			return <ProposedTreatment control={control} errors={errors} />;
	// 		default:
	// 			return null;
	// 	}
	// };

	const onSubmitForm = useCallback(async (data) => {
		try {
			const arrConvertedStringIds = getFileIdString(data.fileids);
			// Dữ liệu từ form (data) đã chứa documentId khi bạn load chi tiết
			await dispatch(updateIncomingDocument({
				...data,
				senderUnit: getVal(data.senderUnit),
				receiverUnit: getVal(data.receiverUnit),
				receiveMethod: getVal(data.receiveMethod, 'value'),
				privateLevel: getVal(data.privateLevel, 'value'),
				urgencyLevel: getVal(data.urgencyLevel, 'value'),
				documentType: getVal(data.documentType, 'value'),
				documentField: getVal(data.documentField, 'value'),
				viewGroup: typeof data.viewGroup === 'object' ? (data.viewGroup?.code || data.viewGroup?.Id || data.viewGroup?.id || data.viewGroup?._id || "") : (data.viewGroup || ""),
				documentId: documentId, // Đảm bảo documentId được gửi đi
				fileids: arrConvertedStringIds // Gửi chuỗi ID file

			})).unwrap();
			dispatch(clearSelectedTextCopy());
			toast('Cập nhật văn bản thành công!', 'success');
			onSuccess(); // Gọi hàm onSuccess để đóng form và tải lại bảng
		} catch (error) {
			toast(error.message || 'Đã có lỗi xảy ra!', 'error');
		}
	}, [dispatch, documentId, toast, onSuccess, getFileIdString, getVal]);


	const handleDeXuatXuLy = useCallback(() => {
		logger.log("Đề xuất xử lý clicked");
	}, []);

	const handleChuyenXuLy = useCallback(() => {
		logger.log("Chuyển xử lý clicked");
	}, []);


	const handleSaveClick = useCallback(() => {

		handleSubmit(
			onSubmitForm,
			(errs) => {
				toast(errs?.senderUnit?.message || 'Cập nhật thất bại!', 'error')
			}
		)();
	}, [handleSubmit, onSubmitForm, toast]);

	// Hàm lấy dữ liệu form để chia sẻ với TransferProcess
	const getFormDataForUpdate = useCallback(() => {
		const currentData = getValues();
		const arrConvertedStringIds = getFileIdString(currentData.fileids);

		// Hàm normalize giá trị để tránh false positive khi so sánh
		const normalizeValue = (value) => {
			// Coi null, undefined, "" như nhau
			if (value === null || value === undefined || value === '') return null;
			// Nếu là date string, normalize về ISO
			if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
				try {
					return new Date(value).toISOString();
				} catch (e) {
					// Fallback if date parsing fails
					return value;
				}
			}
			return value;
		};

		let hasChanged = false;
		const changedFields = [];

		if (originalFormData) {
			// So sánh TẤT CẢ các trường còn lại một cách động
			for (const field in currentData) {
				const currentValue = currentData[field];
				const originalValue = originalFormData[field];

				if (field === 'fileids') {
					const originalFileIds = originalValue?.filter(f => f._id)?.map(f => f._id)?.sort()?.join(',') || '';
					const currentFileIds = arrConvertedStringIds || '';
					if (originalFileIds !== currentFileIds) {
						hasChanged = true;
						changedFields.push({ field, original: originalFileIds, current: currentFileIds });
					}
				} else {
					const normalizedCurrent = normalizeValue(currentValue);
					const normalizedOriginal = normalizeValue(originalValue);

					if (normalizedCurrent !== normalizedOriginal) {
						hasChanged = true;
						changedFields.push({
							field,
							original: originalValue,
							current: currentValue,
							normalizedOriginal,
							normalizedCurrent
						});
					}
				}
			}
		}

		return {
			body: {
				...currentData,
				senderUnit: getVal(currentData.senderUnit),
				receiverUnit: getVal(currentData.receiverUnit),
				receiveMethod: getVal(currentData.receiveMethod, 'value'),
				privateLevel: getVal(dataDetail?.document?.privateLevel || dataDetail?.privateLevel, 'value'), // Giữ nguyên privateLevel từ detail nếu form ko có
				urgencyLevel: getVal(currentData.urgencyLevel, 'value'),
				documentType: getVal(currentData.documentType, 'value'),
				documentField: getVal(currentData.documentField, 'value'),
				viewGroup: typeof currentData.viewGroup === 'object' ? (currentData.viewGroup?.code || currentData.viewGroup?.Id || currentData.viewGroup?.id || currentData.viewGroup?._id || "") : (currentData.viewGroup || ""),
				documentId: documentId,
				fileids: arrConvertedStringIds
			},
			hasChanged
		};
	}, [getValues, documentId, originalFormData, dataDetail, getFileIdString, getVal]);

	const handleClose = useCallback(() => {
		onClose();
		setReloadData(prev => prev + 1);
	}, [onClose, setReloadData]);

	const handleSaveCertifiedSign = useCallback(
		async (file, isChecked) => {
			try {
				if (!file?._id && !file?.id) return;
				const body = {
					documentId: documentId,
					fileId: file._id || file.id,
					isCertifiedCopy: Boolean(isChecked),
				}
				await dispatch(patchFilesCopy(body)).unwrap();
				toast("Cập nhật ký sao y thành công", "success");
				dispatch(clearSelectedTextCopy());
			} catch (err) {
				logger.log('Cập nhật ký sao y thất bại', err)
				toast("Cập nhật ký sao y thất bại", "error");
			}
		},
		[dispatch, toast, documentId]
	);

	const handleSaveImportant = useCallback(
		async (file, isChecked) => {
			try {
				if (!file?._id && !file?.id) return;
				const fileId = file._id || file.id;
				await dispatch(patchFileImportance({ fileId, isImportant: Boolean(isChecked) })).unwrap();
				toast("Cập nhật file quan trọng thành công", "success");
			} catch (err) {
				logger.log('Cập nhật file quan trọng thất bại', err)
				toast("Cập nhật file quan trọng thất bại", "error");
			}
		},
		[dispatch, toast]
	);

	const handleOpenInlineTransfer = useCallback((config) => {
		setTransferConfig(config);
	}, []);

	const handleCloseInlineTransfer = useCallback(() => {
		setTransferConfig(null);
	}, []);

	const handleTransferSuccess = useCallback(() => {
		transferSuccessfulRef.current = true;
	}, []);

	const handleTransferSuccessAndClose = useCallback(() => {
		transferSuccessfulRef.current = true;
		setTransferConfig(null);
		onClose();
		setReloadData(prev => prev + 1);
	}, [onClose, setReloadData]);

	const renderInlineTransferInterface = useMemo(() => {
		if (!transferConfig) return null;

		const ComponentToRender =
			transferConfig.secType === 'suggestionHandling'
				? SubmitProposal
				: TransferProcess;

		return (
			<ComponentToRender
				{...transferConfig}
				open
				inline
				isUpdate
				onClose={handleCloseInlineTransfer}
				onCloseDialog={handleCloseInlineTransfer}
				onCloseAppBar={handleTransferSuccessAndClose}
				onTransferSuccess={handleTransferSuccess}
				getFormDataForUpdate={getFormDataForUpdate}
				maxDepthLevel={MAX_DEPTH_LEVEL}
			/>
		);
	}, [transferConfig, handleCloseInlineTransfer, handleTransferSuccessAndClose, handleTransferSuccess, getFormDataForUpdate, SubmitProposal, TransferProcess]);

	return (
		<CustomSwipper
			key={open ? "edit-incoming-doc-open" : "edit-incoming-doc-closed"}
			open={open}
			onClose={handleClose}
			title="Chỉnh sửa tiếp nhận văn bản đến"
			type="edit"
			screenType="incoming"
			onDeXuatXuLy={handleDeXuatXuLy}
			onChuyenXuLy={handleChuyenXuLy}
			onLuu={handleSubmit(onSubmitForm)}
			hideBackdrop
			noneOverflow
			footer={
				<>
					<FlexGrowBox />
					<FooterActions>
						<FormButton
							dataDetail={dataDetail}
							setReloadData={setReloadData}
							onClose={handleClose}
							isUpdate
							getFormDataForUpdate={getFormDataForUpdate}
							onTransferSuccess={handleTransferSuccess}
							panelContainerRef={panelContainerRef}
							onOpenInlineTransfer={handleOpenInlineTransfer}
						/>
						<ButtonOutline onClick={handleSaveClick} variant="outlined">
							LƯU
						</ButtonOutline>
					</FooterActions>
				</>

			}
		>
			{/* <CustomTabsWithBadge
				tabs={tabs}
				value={tabValue}
				onChange={handleTabChange}
			/>
			{renderTabContent()} */}
			<div style={{ height: '100%', overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
			<GeneralInformation
				control={control}
				errors={errors}
				setValue={setValue}
				disableReceiverUnitTreeView
				documentId={documentId}
				dataDetail={docData}
				dataDetailFull={dataDetail}
				onToggleCertifiedSign={handleSaveCertifiedSign}
				onToggleImportant={handleSaveImportant}
				isColumnOfTextToCopy
				panelContainerRef={panelContainerRef}
				isSuggestionOpen={!!transferConfig}
				suggestionInterface={renderInlineTransferInterface}
				mode={mode}
				allowMultipleDelete
			/>
		</div>
		</CustomSwipper>
	)
}

export default withSharedComponents(UpdateIncommingDoc)
