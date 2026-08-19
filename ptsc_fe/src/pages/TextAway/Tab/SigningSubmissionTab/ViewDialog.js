import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import {
	Grid,
	// Tooltip,
	Collapse,
	// Typography,
	Checkbox,
	FormControlLabel,
	CircularProgress,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { SectionCard, FormLabel, FlexGrowBox } from "@styles/BaseSwiper/BaseSwiper.style";
import axiosInstance from "@utils/axiosInstance";
import {
	API_ADD_VANBANDI_DHVB,
	API_GET_LIST_USERS,
	APP_BASE,
	// API_RECEIVE_TO_KNOW,
	API_VIEW_FILE,
	API_PROCESSING_RECEIVER,
	API_GROUP_USERS_IN_DOCUMENT,
	API_GET_LIST_UNIT,
} from "@EnvironmentFile/constants/urlConfig";
import DynamicExportDialog from "@components/DynamicExportDialog";

// import LoadingDialog from "@components/LoadingDialog";
import {
	StyleDriveFileRenameOutlineOutlinedIcon,
	TabsHeaderContainer,
	TabsWrapper,
	BatchSignButtonWrapper,
} from "@styles/UploadFile/UploadFile.style";
import {
	getCommentsByDocument,
	getDocumentHistory,
} from "@redux/slices/SharedCategory/managementUnitSlice";
import { getListBookDocuments } from "@redux/slices/GiveNumber/GiveNumberSlice";
import { verifyPdfSignature, verifyFilesSignature } from "@redux/slices/DigitalSignatureFileSlice/DigitalSignatureFileSlice";

// Components
import { useToast } from "@components/common/ToastProvider";
import CustomComment from "@components/CustomComment";
import { CustomDialog, FileViewerDialog } from "@components/CustomDialog";
import withSharedComponents from "@components/WrapperComponent";
import UploadFile from "@components/UploadFile";
import CustomTable from "@components/CustomTable/CustomTable";
import ListOfRecipients from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/ListOfRecipients";
import ViewIncommingDoc from "@pages/IncomingDocumentManagement/components/ViewIncommingDoc";
// import WithdrawReplaceTableSection from "./componentStyle/WithdrawReplaceTableSection";

// Styles
import {
	JobProfileTableContainer,
	ActionContainer,
	StyledButton,
} from "./componentStyle/AddDialog.style";
import {
	FormGridItem,
	GeneralInfoGridContainer,
	StyledBoxContainerContent,
	StyledGridContainerInfo,
	StyledSubTabGrid,
	StyledGrid,
	StyledTypography,
	StyledLink,
	SummaryHeaderBox,
	StyledViewGridContainer,
	StyledMainColumn,
	StyledSidebarColumn,
	StyledComment,
	StyledCompactStyleBoxComent,
	SeeMoreToggleButton,
	FadeInGridItem,
	AttachedDocLabel,
	StyledHeaderContent,
	StyledTabsContainerOutGoingDoc,
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/ViewIncommingDoc.styles";
import {
	UrgencyBadge,
	StyledIconWrapper,
	AbstractSummaryBox,
	AbstractSummaryContent,
	AbstractSummaryTitle,
	AbstractSummaryText,
	StyledInfoIcon,
	StyledDivider,
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import FormButton from "@components/FormButton";
import {
	StyledDialog,
	StyledDialogActions,
	StyledDialogContent,
} from "@styles/CustomDialog.styles";
import { API_PROCCESS_DOCUMENT } from "@EnvironmentFile/constants/ulrConfigNew";

import DraftVersionTable from "./componentStyle/DraftSection";
import api from "@services/api";
import { Delete } from "@mui/icons-material";
import getSocketGetFile from "@utils/socketFileUpdate/socket";
import { WarningIconStyled } from "@styles/QualificationManagement.styles";
import { getSideBarMenu } from "@redux/slices/ManagerMenu/managementMenuSlice";
import CustomStepper from "@components/CustomStepper/CustomSteppers";
import { withFormWrapper } from "@components/common/FormWrapper";
// import {
// 	KeyboardArrowDownIcon,
// 	KeyboardArrowUpIcon,
// } from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/RecipientInfoTable.styles";
import DigitalSignatureProposalPopup from "@components/CustomStepper/components/DigitalSignatureProposalPopup";
import { getKanbanProcessProgress } from "@redux/slices/OutGoingDoc/OutGoingDocSlice";
import { getStepFromStatus, createSigningSubmissionPayload, getJobProfileColumns , getUnitId } from "./constants";
import {
	// ActionContainer,
	// ChipContainer, 
	// ChipInputContainer, 
	// CustomChip, 
	// InputLabel, 
	// PlaceholderTypography, 
	StyleGrid
} from "@styles/ViewDialogReplacementDoc.styles";
import ViewJobToDocument from "@pages/WorkManagement/components/ViewJobToDocument";
import IsMultiSigner from "@components/CustomStepper/components/DigitalSignatureProposalPopup/IsMultiSigner";
import SignTypeCheckboxGroup from "./SignTypeCheckboxGroup";
import EditDialog from "./EditDialog";
import RecipientInfoTableOutGoing from "./RecipientInfoTableOutGoing";
import ReceivingUnitDialog from "./ReceivingUnitDialog";
import ForInformationLoadmoreDialog from "./ForInformationLoadmoreDialog";


// Map lại các trường object về primitive cho form
const mapToPrimitive = (val, key) => {
	if (!val) return val;
	if (
		Array.isArray(val) &&
		val?.length > 0 &&
		typeof val[0] === "object"
	) {
		return val[0]._id || val[0].value || val[0];
	}
	if (typeof val === "object") {
		if (
			key === "urgency" ||
			key === "securityLevel" ||
			key === "documentField" ||
			key === "documentType" ||
			key === "typeOfProcess"
		) {
			return val?.value || val?._id || val?.id || val?.title || val?.name;
		}
		if (
			key === "drafter" ||
			key === "signer" ||
			key === "reportSigner"
		) {
			return val?._id || val?.id || val?.value || val?.name;
		}
		return val?._id || val?.value || val?.name || val;
	}
	return val;
};

// Ánh xạ dữ liệu DB sang dữ liệu tương ứng của Form để so sánh
const mapDbToFormData = (dbData) => {
	if (!dbData) return {};

	const doc = dbData.document || dbData;
	const viewers = Array.isArray(dbData.viewers) ? dbData.viewers : [];

	return {
		draftingUnit: mapToPrimitive(dbData.senderUnit, "draftingUnit"),
		drafter: mapToPrimitive(dbData.drafter, "drafter"),
		documentType: mapToPrimitive(dbData.documentType, "documentType"),
		urgency: mapToPrimitive(dbData.urgencyLevel, "urgency"),
		reportSigner: (() => {
			const val = dbData.reportSigner;
			if (Array.isArray(val)) {
				return val.map(item => {
					if (typeof item === 'string') return item;
					if (item && typeof item === 'object') return item._id || item.id || item.value;
					return item;
				}).filter(Boolean);
			}
			if (typeof val === 'string') return [val];
			if (val && typeof val === 'object') return [val?._id || val?.id || val?.value].filter(Boolean);
			return [];
		})(),
		typeOfProcess: typeof dbData.typeOfProcess === "object"
			? (dbData.typeOfProcess?.name || dbData.typeOfProcess?.processKey || dbData.typeOfProcess?.id || dbData.typeOfProcess?._id || "")
			: (dbData.typeOfProcess || ""),
		securityLevel: mapToPrimitive(dbData.privateLevel, "securityLevel"),
		documentField: mapToPrimitive(dbData.documentField, "documentField"),
		approverSymbol: dbData.reportDocumentSymbol || doc.reportDocumentSymbol || "",
		signer: mapToPrimitive(dbData.draftSigner, "signer"),
		draftSymbol: dbData.toBookTextSymbols || doc.toBookTextSymbols || "",
		notifyUnit: viewers.map((v) => v.name || v.title || ""),
		replyDeadline: dbData.deadlineReply || doc.deadlineReply || null,
		extract: dbData.abstractNote || doc.abstractNote || "",
		knowReceivers: dbData.knowReceivers || [],
		bookDocumentId: dbData.bookDocumentId || "",
		toBook: dbData.toBook || "",
		toBookCode: dbData.toBookCode || "",
		documentDate: dbData.documentDate || doc.documentDate || null,
		processor: Array.isArray(dbData.processor) ? dbData.processor : [],
		documentViewerGroups: Array.isArray(dbData.documentViewerGroups) ? dbData.documentViewerGroups : [],
		internalDepartment: Array.isArray(dbData.internalReceivingUnit)
			? dbData.internalReceivingUnit.map((u) => u._id || u.id || u)
			: [],
		externalDepartment: Array.isArray(dbData.externalReceivingUnit)
			? dbData.externalReceivingUnit.map((u) => u._id || u.id || u)
			: [],
		internalReceivingDept: Array.isArray(dbData.internalReceivingDept)
			? dbData.internalReceivingDept.map((u) => {
				if (u && typeof u === "object") {
					const normalizedId = u._id || u.id || u.value;
					return {
						...u,
						...(normalizedId ? { _id: normalizedId, id: normalizedId } : {}),
					};
				}
				return u;
			})
			: [],
		internalReceivingDeptOld: Array.isArray(dbData.internalReceivingDeptOld)
			? dbData.internalReceivingDeptOld.map((u) => u._id || u.id || u)
			: [],
		signatureType: dbData.signatureType || "",
	};
};

const ViewDialog = (props) => {

	const {
		open,
		onClose,
		documentId,
		sharedComponents,
		setReloadData,
		allowSignDigital,
		allowSignInitial,
		isAuthority,
		bpmnVersion,
		documentType,
		title,
		isVanThuCuc,
		isPendingPublishOrStamp,
	} = props;
	// logger.log("ViewDialog", props)
	// Destructure shared components
	const {
		// CustomSwipper,
		BaseSwipper,
		DatePicker,
		InputComponents,
		Input,
		CustomTabsWithBadge,
		Button,
		AsyncAutoComplete,
		ButtonOutline,
	} = sharedComponents;

	// Hooks
	const {
		control,
		reset,
		formState: { errors },
		setValue,
		watch,
		getValues,
	} = useForm();

	// Wrapper components for View mode consistency (Matching ViewIncommingDoc style)
	const isView = true;
	const MemoizedInputComponents = useMemo(() => {
		const Wrapped = withFormWrapper(InputComponents, "input");
		const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : isView} />;
		Component.displayName = "MemoizedInputComponents";
		return Component;
	}, [InputComponents, isView]);

	const MemoizedDatePicker = useMemo(() => {
		const Wrapped = withFormWrapper(DatePicker, "date");
		const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : isView} />;
		Component.displayName = "MemoizedDatePicker";
		return Component;
	}, [DatePicker, isView]);

	// const MemoizedAsyncAutoCompletes = useMemo(() => {
	// 	const Wrapped = withFormWrapper(AsyncAutoComplete, "asyncSelect");
	// 	const Component = (props) => <Wrapped {...props} isView={isView} />;
	// 	Component.displayName = "MemoizedAsyncAutoCompletes";
	// 	return Component;
	// }, [AsyncAutoComplete]);

	const dispatch = useDispatch();
	const toast = useToast();
	const [showStampOption, setShowStampOption] = useState(false);
	const [isStamp, setIsStamp] = useState(false);

	// Local State
	const [documentDetail, setDocumentDetail] = useState(null);
	const [draftingUnitOptions, setDraftingUnitOptions] = useState([]);
	const [userOptions, setUserOptions] = useState([]);
	// const [, setNotifyUnitOptions] = useState([]);
	// const [notifyUnitOptions, setNotifyUnitOptions] = useState([]);
	const [userByOrganizationUnits, setUserByOrganizationUnits] = useState([]);
	const [dialogOpenFor, setDialogOpenFor] = useState(null);
	const [dialogOpenForInformationDialog, setDialogOpenForInformationDialog] = useState(null);
	const [internalUnitUnits, setInternalUnitUnits] = useState([]);
	const [internalReceivingDeptOldUnits, setInternalReceivingDeptOldUnits] = useState([]);
	const [subTabValue, setSubTabValue] = useState(0);
	const [isLoadingDetail, setIsLoadingDetail] = useState(false);
	const [openDialog, setOpenDialog] = useState({});
	const [note, setNote] = useState("");
	const [isOpen, setIsOpen] = useState({
		replyDocuments: false,
		jobProfile: false,
		draftVersion: false,
		attachedDoc: true,
		attachedVersion: false,
		revocationDoc: false,
		replacementDoc: false,
		draft: true,
		generalInfo: true,
	});
	const [showAll, setShowAll] = useState(() => Boolean(isVanThuCuc));
	const toggleShowAll = () => setShowAll((prev) => !prev);

	// Batch Sign States
	const [triggerBatchSignCount, setTriggerBatchSignCount] = useState(0);
	const [isSigningMultiple, setIsSigningMultiple] = useState(false);

	// File States
	// const [submissionFiles, setSubmissionFiles] = useState([]);
	const [draftFiles, setDraftFiles] = useState([]);
	const [attachmentFiles, setAttachmentFiles] = useState([]);
	const [recallProcessing, setRecallProcessing] = useState(false);
	const [repliedDocuments, setRepliedDocuments] = useState([]);
	const [, setRecalledDocuments] = useState([]);
	// const [recalledDocuments, setRecalledDocuments] = useState([]);
	const [replacedDocuments, setReplacedDocuments] = useState([]);
	const [jobProfiles, setJobProfiles] = useState([]);
	const [viewingFile, setViewingFile] = useState({
		open: false,
		url: null,
		name: "",
		type: null,
	});

	const [, setConfirmDelete] = useState({
		open: false,
		onConfirm: null,
		title: "",
		content: "",
	});
	// logger.log("confirmDelete", confirmDelete);
	// const [reloadDocProposal, setReloadDocProposal] = useState(0);
	const [reloadDocDraft, setReloadDocDraft] = useState(0);
	const [reloadDataLocal, setReloadDataLocal] = useState(0);
	// const [reloadDocAttachments, setReloadDocAttachments] = useState(0);

	// State for dynamic form export
	const [openDialogExport, setOpenDialogExport] = useState(false);
	const [, setFileDraft] = useState([]);
	// logger.log("fileDraft", fileDraft);
	const [dataDetail, setDataDetail] = useState(null);
	const [repliedDocumentsData, setRepliedDocumentsData] = useState([]);
	const [recalledDocumentsData, setRecalledDocumentsData] = useState([]);

	// CustomStepper States
	const [activeStep, setActiveStep] = useState(0);
	const [openStepDialog, setOpenStepDialog] = useState(false);
	const [selectedStep, setSelectedStep] = useState(null);
	const [selectedTypeOfProcess, setSelectedTypeOfProcess] = useState(null);
	const [selectedUsersByStep, setSelectedUsersByStep] = useState({});

	const [documentStack, setDocumentStack] = useState([]);
	const currentDocumentId = useMemo(
		() => documentStack[documentStack.length - 1] || documentId,
		[documentStack, documentId]
	);

	// State cho ViewIncommingDoc của reply documents
	const [openIncommingDocDetail, setOpenIncommingDocDetail] = useState(false);
	const [selectedIncommingDocId, setSelectedIncommingDocId] = useState(null);
	// const isViewingNested = documentStack.length > 1;

	// State cho ViewJobToDocument
	const [openDetailModal, setOpenDetailModal] = useState(false);
	const [selectedTask, setSelectedTask] = useState(null);
	const [openEditDialogFromView, setOpenEditDialogFromView] = useState(false);
	const isVTDaBanHanh = dataDetail?.isDaBanHanh === true;

	const calledRef = useRef(null);
	const lastReloadDocDraftRef = useRef(reloadDocDraft);
	const lastReloadDataLocalRef = useRef(reloadDataLocal);
	const verifiedFilesRef = useRef([]);
	const lastKanbanParamsRef = useRef(null);
	const lastListBookKeyRef = useRef(null);

	const handleReloadAll = useCallback(
		(time) => {
			const currentTime = time || new Date().getTime();
			if (setReloadData) setReloadData(currentTime);
			setReloadDataLocal(currentTime);
		},
		[setReloadData]
	);

	useEffect(() => {
		if (open && documentId) {
			setDocumentStack([documentId]);
			setSelectedUsersByStep({});
			setSelectedStep(null);
		}
		if (!open) {
			setDocumentStack([]);
		}
	}, [open, documentId]);

	useEffect(() => {
		if (open) {
			setShowAll(Boolean(isVanThuCuc || documentType === "success"));
		}
	}, [open, documentType, isVanThuCuc]);

	// Redux State
	const { commentsList: comments, documentHistory } = useSelector(
		(state) => state.unit
	);
	const { crmSource } = useSelector((state) => state.config);
	const { dataKanbanProcessProgress } = useSelector((state) => state.outGoingDoc);
	const stepActionsRef = useRef([]);
	// logger.log("dataKanbanProcessProgress", dataKanbanProcessProgress);

	useEffect(() => {
		stepActionsRef.current = (Array.isArray(dataKanbanProcessProgress)
			? dataKanbanProcessProgress
			: []
		)
			.map((step) => step?.action)
			.filter(
				(action, index, actions) =>
					Boolean(action) && actions.indexOf(action) === index
			);
	}, [dataKanbanProcessProgress]);
	const { dataUser: authUser } = useSelector((state) => state.auth);
	const userData = useMemo(() => authUser || {}, [authUser]);
	const userId = userData?._id || userData?.id || userData?.user?._id || userData?.user?.id;
	const { listBookDocuments, optionsSoVbDi } = useSelector(
		(state) => state.giveNumber
	);
	const { verificationResult } = useSelector((state) => state.digitalSignatureFile);

	// Options from Redux
	const urgencyOptions =
		crmSource.find((item) => item.code === "S20")?.data || [];
	// const optionTypeOfProcess =
	//   crmSource.find((item) => item.code === "S99ultra")?.data || [];

	// const securityLevelOptions =
	//   crmSource.find((item) => item.code === "S21")?.data || [];
	// const isDocumentFile = (file) => {
	// 	if (!file) return false;
	// 	const fileName = file.fileName || file.file_name || "";
	// 	const docExtensions = ["pdf", "doc", "docx", "txt", "xls", "xlsx"];
	// 	const fileExt = fileName.split(".").pop()?.toLowerCase();
	// 	if (docExtensions.includes(fileExt)) return true;

	// 	const docMimetypes = [
	// 		"application/pdf",
	// 		"application/msword",
	// 		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	// 		"text/plain",
	// 		"application/vnd.ms-excel",
	// 		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	// 	];
	// 	return docMimetypes.includes(file.mimetype || file.mime_type);
	// };
	const documentTypeOptions =
		crmSource.find((item) => item.code === "S19")?.data || [];
	const fieldsOptions =
		crmSource.find((item) => item.code === "S26")?.data || [];

	const handleJobRowClick = useCallback((job) => () => {
		setSelectedTask(job);
		setOpenDetailModal(true);
	}, []);
	// Cột cho bảng Hồ sơ công việc
	const jobProfileColumns = useMemo(
		() => getJobProfileColumns(handleJobRowClick),
		[handleJobRowClick]
	);

	const docIds = documentDetail?.document?.documentId.toString();
	// const getValue = (value) => {
	// 	if (value == null) return "";
	// 	if (typeof value === "object")
	// 		return value.value || value.id || value._id || "";
	// 	return value;
	// };
	// --- Effects ---

	// 1. Lấy đơn vị soạn thảo mặc định
	useEffect(() => {
		if (open) {
			const user = userData?.user || userData;
			const targetUnit = user?.grandParent?._id ? user.grandParent : user?.parent;

			if (targetUnit?._id) {
				const unit = {
					_id: targetUnit._id,
					name: targetUnit.name || targetUnit.organizationName,
				};
				setDraftingUnitOptions([unit]);
			}
		}
	}, [open, setValue, userData]);

	useEffect(() => {
		if (documentDetail?.senderUnit) {
			setDraftingUnitOptions((prev) => {
				// Kiểm tra xem senderUnit đã có trong options chưa
				const exists = prev.some(
					(unit) => unit._id === documentDetail.senderUnit._id
				);

				if (!exists) {
					// Thêm senderUnit vào đầu mảng
					return [
						{
							_id: documentDetail.senderUnit._id,
							name: documentDetail.senderUnit.name,
						},
						...prev,
					];
				}

				return prev;
			});
		}
	}, [documentDetail]);

	// Thêm drafter vào userOptions nếu chưa có (để hiển thị tên thay vì ID)
	useEffect(() => {
		if (documentDetail?.drafter) {
			const drafterData = documentDetail.drafter;
			// Xử lý cả trường hợp drafter là object hoặc nằm trong mảng
			const drafterObj = Array.isArray(drafterData) ? drafterData[0] : drafterData;

			if (drafterObj && typeof drafterObj === 'object') {
				const drafterId = drafterObj._id || drafterObj.id;

				setUserOptions((prev) => {
					const exists = prev.some((user) => user._id === drafterId || user.id === drafterId);
					if (!exists && drafterId) {
						return [
							{
								_id: drafterId,
								id: drafterId,
								name: drafterObj.name || drafterObj.title || drafterId,
							},
							...prev,
						];
					}
					return prev;
				});
			}
		}
	}, [documentDetail]);

	useEffect(() => {
		if (documentDetail) {
			const hasStampFromFlag = !!documentDetail?.flags?.hasStampOption;
			const stampValue = !!(documentDetail?.isStamp || documentDetail?.document?.isStamp);
			setShowStampOption(hasStampFromFlag);
			setIsStamp(stampValue);
		}
	}, [documentDetail]);
	// 2. Fetch Document Details & Users & Files
	useEffect(() => {
		if (!open) {
			calledRef.current = null;
			return;
		}

		const isReload = reloadDocDraft !== lastReloadDocDraftRef.current || reloadDataLocal !== lastReloadDataLocalRef.current;
		lastReloadDocDraftRef.current = reloadDocDraft;
		lastReloadDataLocalRef.current = reloadDataLocal;

		if (!isReload && calledRef.current === currentDocumentId) return;
		calledRef.current = currentDocumentId;

		const fetchDetail = async () => {
			if (!currentDocumentId) return;
			setIsLoadingDetail(true);

			const safeJsonParse = (str) => {
				if (typeof str !== "string") return str;
				try {
					return JSON.parse(str);
				} catch (e) {
					return [];
				}
			};

			const fetchFiles = async (objectType, objectId) => {
				try {
					const filesResponse = await axiosInstance.get(
						`${APP_BASE}/api/files/latest-by-object?object_type=${objectType}&object_id=${objectId}`
					);
					const filesData = Array.isArray(filesResponse)
						? filesResponse
						: filesResponse.data || [];

					return filesData;
				} catch (error) {
					logger.error(`Lỗi khi tải file cho ${objectType}:`, error);
					return [];
				}
			};

			try {
				// Giai đoạn 1: Tải chi tiết văn bản ngay lập tức
				const docResponse = await axiosInstance.get(`${API_ADD_VANBANDI_DHVB}/${currentDocumentId}`, {
					params: {
						...(isAuthority && { isAuthority: true }),
						...(bpmnVersion && { bpmnVersion }),
					},
				});

				if (docResponse) {
					// Logic xử lý merged
					let finalDocData = { ...docResponse };

					// Nếu API trả về cấu trúc lồng document (như code bạn check)
					if (docResponse.document) {
						const documentData = docResponse.document;
						finalDocData = {
							...finalDocData,
							...documentData, // Merge properties từ document con ra ngoài
							internalReceivingUnit: safeJsonParse(
								documentData.internalReceivingUnit ||
								docResponse.internalReceivingUnit
							),
							externalReceivingUnit: safeJsonParse(
								documentData.externalReceivingUnit ||
								docResponse.externalReceivingUnit
							),
							internalReceivingDept: safeJsonParse(
								documentData.internalReceivingDept ||
								docResponse.internalReceivingDept
							),
							processor: Array.isArray(documentData?.processor)
								? documentData.processor
								: [],
							documentViewerGroups: documentData.documentViewerGroups || docResponse.documentViewerGroups || [],
						};
					} else {
						// Cấu trúc phẳng thường thấy
						finalDocData = {
							...finalDocData,
							internalReceivingUnit: safeJsonParse(
								docResponse.internalReceivingUnit
							),
							externalReceivingUnit: safeJsonParse(
								docResponse.externalReceivingUnit
							),
							internalReceivingDept: safeJsonParse(
								docResponse.internalReceivingDept
							),
							processor: Array.isArray(docResponse?.processor)
								? docResponse.processor
								: [],
							documentViewerGroups: docResponse.documentViewerGroups || [],
						};
					}

					// Giai đoạn 1.1: Map processors & viewers ban đầu (chưa có thông tin đầy đủ từ users/units phụ)
					const originalProcessors = finalDocData.processor || [];
					const initialMappedViewers = Array.isArray(finalDocData.viewers)
						? finalDocData.viewers
						: [];

					if (finalDocData && Array.isArray(finalDocData.docAnswer)) {
						setRepliedDocuments(finalDocData.docAnswer);
					}
					if (finalDocData && Array.isArray(finalDocData.docRecall)) {
						setRecalledDocuments(finalDocData.docRecall);
					}
					if (finalDocData && Array.isArray(finalDocData.docReplacement)) {
						setReplacedDocuments(finalDocData.docReplacement);
					}
					if (finalDocData && Array.isArray(finalDocData.docWorkFiles)) {
						setJobProfiles(finalDocData.docWorkFiles);
					}

					const detailWithInitialProcessors = {
						...finalDocData,
						processor: originalProcessors,
						viewers: initialMappedViewers,
					};
					setDocumentDetail(detailWithInitialProcessors);


					const formData = {
						draftingUnit: mapToPrimitive(
							finalDocData.senderUnit,
							"draftingUnit"
						),
						drafter: mapToPrimitive(finalDocData.drafter, "drafter"),
						documentType: mapToPrimitive(
							finalDocData.documentType,
							"documentType"
						),
						urgency: mapToPrimitive(finalDocData.urgencyLevel, "urgency"),
						reportSigner: (() => {
							const val = finalDocData.reportSigner;
							if (Array.isArray(val)) {
								return val?.map(item => {
									if (typeof item === 'string') return item;
									if (item && typeof item === 'object') return item._id || item.id || item.value;
									return item;
								}).filter(Boolean);
							}
							if (typeof val === 'string') return [val];
							if (val && typeof val === 'object') return [val?._id || val?.id || val?.value].filter(Boolean);
							return [];
						})(),
						typeOfProcess: (finalDocData.typeOfProcess && typeof finalDocData.typeOfProcess === "object")
							? (finalDocData.typeOfProcess.name || finalDocData.typeOfProcess.processKey || finalDocData.typeOfProcess.id || finalDocData.typeOfProcess._id || "")
							: (finalDocData.typeOfProcess || ""),

						securityLevel: mapToPrimitive(
							finalDocData.privateLevel,
							"securityLevel"
						),
						documentField: mapToPrimitive(
							finalDocData.documentField,
							"documentField"
						),
						approverSymbol: finalDocData.reportDocumentSymbol,
						signer: mapToPrimitive(finalDocData.draftSigner, "signer"),
						draftSymbol: finalDocData.toBookTextSymbols || getValues("draftSymbol") || "",
						notifyUnit: (initialMappedViewers && Array.isArray(initialMappedViewers))
							? initialMappedViewers.map((v) => v.name || v.title || "")
							: [],
						replyDeadline: finalDocData.deadlineReply,
						extract: finalDocData.abstractNote,
						knowReceivers: finalDocData?.knowReceivers || [],
						bookDocumentId: finalDocData.bookDocumentId || getValues("bookDocumentId"),
						toBook: finalDocData.toBook || getValues("toBook") || "",
						toBookCode: finalDocData.toBookCode || getValues("toBookCode") || "",
						documentDate: finalDocData.documentDate ? (dayjs(finalDocData.documentDate).isValid() ? dayjs(finalDocData.documentDate) : dayjs(finalDocData.documentDate, "DD/MM/YYYY")) : (getValues("documentDate") || dayjs()),
						processor: Array.isArray(finalDocData?.processor)
							? finalDocData.processor
							: [],
						documentViewerGroups: Array.isArray(finalDocData?.documentViewerGroups)
							? finalDocData.documentViewerGroups
							: [],
						internalDepartment: Array.isArray(finalDocData.internalReceivingUnit)
							? finalDocData.internalReceivingUnit.map((u) => u._id || u.id || u)
							: [],
						externalDepartment: Array.isArray(finalDocData.externalReceivingUnit)
							? finalDocData.externalReceivingUnit.map((u) => u._id || u.id || u)
							: [],
						internalReceivingDept: Array.isArray(finalDocData.internalReceivingDept)
							? finalDocData.internalReceivingDept.map((u) => {
								if (u && typeof u === "object") {
									const normalizedId = u._id || u.id || u.value;
									return {
										...u,
										...(normalizedId ? { _id: normalizedId, id: normalizedId } : {}),
									};
								}
								return u;
							})
							: [],
						internalReceivingDeptOld: Array.isArray(finalDocData.internalReceivingDeptOld)
							? finalDocData.internalReceivingDeptOld.map((u) => u._id || u.id || u)
							: [],
						signatureType: finalDocData.signatureType || "",
					};

					const filteredData = Object.fromEntries(
						Object.entries(formData).filter(([, v]) => v != null)
					);
					reset(filteredData);
					setUserByOrganizationUnits(filteredData?.knowReceivers || []);
					setInternalUnitUnits(filteredData?.internalReceivingDept || []);
					setInternalReceivingDeptOldUnits(finalDocData?.internalReceivingDeptOld || []);
					setDataDetail(finalDocData);
					setRepliedDocumentsData(finalDocData?.docAnswer || []);
					setRecalledDocumentsData(finalDocData?.docRecall || []);

					if (finalDocData?.typeOfProcess) {
						const processObj =
							typeof finalDocData.typeOfProcess === "object"
								? finalDocData.typeOfProcess
								: null;
						if (processObj) {
							setSelectedTypeOfProcess(processObj);
						}
					}

					const status = finalDocData?.documentStatus;
					if (status) {
						setActiveStep(getStepFromStatus(status));
					}

					// Ẩn spinner tải chi tiết ngay lập tức để render UI
					setIsLoadingDetail(false);

					// Giai đoạn 2: Tải song song nền các dữ liệu phụ trợ
					(async () => {
						try {
							const [
								draftFilesRes,
								attachmentFilesRes,
							] = await Promise.all([
								fetchFiles("docDraft", currentDocumentId),
								fetchFiles("docAttachments", currentDocumentId),
							]);

							// let usersList = [];
							// if (userResponse && Array.isArray(userResponse)) {
							// 	usersList = userResponse;
							// 	setUserOptions(usersList);
							// }

							// let notifyList = [];
							// if (notifyRes && Array.isArray(notifyRes)) {
							// 	notifyList = notifyRes;
							// 	setNotifyUnitOptions(notifyList);
							// }

							// // Map đầy đủ processors & viewers dựa trên dữ liệu mới tải xong
							// const fullProcessors = originalProcessors
							// 	.map((processor) => {
							// 		const processorId = processor?._id || processor?.id || (typeof processor === 'string' ? processor : null);
							// 		const userDetail = usersList.find((u) => u?._id === processorId || u?.id === processorId);
							// 		return userDetail ? { ...userDetail, ...processor } : processor;
							// 	})
							// 	.filter(Boolean);

							// const mappedViewers = Array.isArray(finalDocData.viewers)
							// 	? finalDocData.viewers.map((viewer) => {
							// 		const fullViewer = notifyList.find(
							// 			(unit) => unit?._id === viewer?._id
							// 		);
							// 		return fullViewer || viewer;
							// 	})
							// 	: [];

							// Dữ liệu users/notify không cần fetch thêm vì backend đã trả về đủ thông tin processors/viewers 
							// trong finalDocData hoặc được thêm vào từ effect bên ngoài.
							const fullProcessors = originalProcessors;
							const mappedViewers = Array.isArray(finalDocData.viewers) ? finalDocData.viewers : [];

							// Cập nhật lại documentDetail với thông tin chi tiết đầy đủ
							setDocumentDetail((prevDetail) => ({
								...prevDetail,
								processor: fullProcessors,
								viewers: mappedViewers,
							}));

							// Cập nhật giá trị notifyUnit cho form
							setValue("notifyUnit", mappedViewers.map((v) => v.name || v.title || ""));

							// Cập nhật files
							setDraftFiles(draftFilesRes);
							setAttachmentFiles(attachmentFilesRes);

						} catch (errorBg) {
							logger.error("Lỗi khi tải dữ liệu phụ trợ nền:", errorBg);
						}
					})();
				}

				// Tải ý kiến & lịch sử
				dispatch(getCommentsByDocument({ documentId: currentDocumentId, type: "outgoing" }));
				dispatch(getDocumentHistory(currentDocumentId));
			} catch (error) {
				const messageError = error?.response?.data?.message || error?.message || "Có lỗi xảy ra khi lấy chi tiết văn bản";
				logger.log("Có lỗi xảy ra khi lấy chi tiết văn bản", messageError);
				toast(messageError, "error");
				setIsLoadingDetail(false);
			}
		};

		if (open) {
			fetchDetail();
		}
	},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			open,
			currentDocumentId,
			dispatch,
			isAuthority,
			bpmnVersion,
			reloadDocDraft,
			reloadDataLocal,
			isVanThuCuc,
		]);

	useEffect(() => {
		if (!dataDetail) return;

		const mapUserToStep = (user) => {
			if (typeof user === "string") {
				return {
					userId: user,
					id: user,
					key: user,
					unitType: "user",
					chiDao: true,
				};
			}

			const id = user?.userId || user?.id || user?._id;
			if (!id) return null;

			return {
				userId: id,
				name: user?.name || user?.userName,
				unitType: "user",
				id,
				key: id,
				chiDao: true,
			};
		};

		const kanbanStepActions = Array.isArray(dataKanbanProcessProgress)
			? dataKanbanProcessProgress
				.map((step) => step?.action)
				.filter(
					(action, index, actions) =>
						Boolean(action) && actions.indexOf(action) === index
				)
			: [];

		const fallbackStepActions = Object.keys(dataDetail || {}).filter(
			(key) => key.startsWith("sign") && Array.isArray(dataDetail?.[key])
		);

		const STEP_KEYS =
			kanbanStepActions.length > 0
				? kanbanStepActions
				: fallbackStepActions;

		const usersByStep = {};
		STEP_KEYS.forEach((key) => {
			if (!Array.isArray(dataDetail?.[key])) return;
			usersByStep[key] = dataDetail[key].map(mapUserToStep).filter(Boolean);
		});

		if (dataDetail?.reportSigner) {
			const reportSignerList = Array.isArray(dataDetail.reportSigner)
				? dataDetail.reportSigner
				: [dataDetail.reportSigner];
			usersByStep.reportSigner = reportSignerList
				.map(mapUserToStep)
				.filter(Boolean);
		}

		if (Object.keys(usersByStep).length > 0) {
			setSelectedUsersByStep((prev) => ({
				...usersByStep,
				...prev,
			}));
		}
	}, [dataDetail, dataKanbanProcessProgress]);

	useEffect(() => {
		// if (!documentId) return;
		if (!currentDocumentId) return;
		const socket = getSocketGetFile();
		const onConnect = () => {
			// logger.info("✅ Socket đã kết nối thành công! ID:", socket.id);
		};

		const onConnectError = (err) => {
			logger.error("❌ Socket lỗi kết nối:", err);
		};

		const handleFileUpdateSuccess = async (payload) => {
			const fileInfo = payload?.fileInfo || payload;
			const type = fileInfo?.object_type;

			// Xử lý reload danh sách file hiện tại (Dự thảo mới nhất)
			if (type === "docDraft") {
				try {
					// Lấy timestamp để force reload
					const triggerTime = new Date().getTime();

					// 1. Fetch lại file dự thảo mới nhất để cập nhật UI UploadFile
					const response = await axiosInstance.get(
						`${APP_BASE}/api/files/latest-by-object?object_type=docDraft&object_id=${documentId}&_t=${triggerTime}`
					);
					const files = Array.isArray(response)
						? response
						: response.data || [];
					setDraftFiles([...files]);
					// 2. Kích hoạt reload bảng Phiên bản dự thảo (DraftVersionTable)
					setReloadDocDraft(triggerTime);

					// console.log("✅ Đã kích hoạt load lại Phiên bản dự thảo lúc:", triggerTime);
				} catch (err) {
					// logger.error("Lỗi cập nhật socket:", err);
				}
			}
		};

		// Đăng ký sự kiện
		socket.on("connect", onConnect);
		socket.on("connect_error", onConnectError);
		socket.on("fileUpdateSuccess", handleFileUpdateSuccess);

		if (socket.connected) onConnect();

		// QUAN TRỌNG: Cleanup function để tránh memory leak và duplicate listeners
		return () => {
			socket.off("connect", onConnect);
			socket.off("connect_error", onConnectError);
			socket.off("fileUpdateSuccess", handleFileUpdateSuccess);
		};
		// }, [documentId]);
	}, [currentDocumentId, documentId]);


	useEffect(() => {
		setIsOpen((prev) => ({
			...prev,
			replyDocuments: repliedDocuments.length > 0,
			jobProfile: jobProfiles.length > 0,
			replacementDoc: replacedDocuments.length > 0,
			// revocationDoc: recalledDocuments.length > 0,
		}));
	}, [repliedDocuments, jobProfiles, replacedDocuments]);

	useEffect(() => {
		const filesFromDetail = dataDetail?.files || dataDetail?.document?.files || [];
		if (open && filesFromDetail.length > 0) {
			const pdfFileIds = filesFromDetail
				.filter((file) => {
					const fileName = file.fileName || file.file_name || "";
					return fileName.toLowerCase().endsWith(".pdf");
				})
				.map((file) => file.fileId)
				.filter(Boolean);

			// Remove duplicates
			const uniqueFileIds = [...new Set(pdfFileIds)];

			const isSame = uniqueFileIds.length === verifiedFilesRef.current.length &&
				uniqueFileIds.every((id) => verifiedFilesRef.current.includes(id));

			if (uniqueFileIds.length > 0 && !isSame) {
				verifiedFilesRef.current = uniqueFileIds;
				dispatch(verifyFilesSignature(uniqueFileIds));
			}
		}
	}, [open, dataDetail, dispatch]);

	// Fetch kanban process progress when typeOfProcess changes
	useEffect(() => {
		if (!selectedTypeOfProcess) return;
		const processCode =
			selectedTypeOfProcess?.processKey || selectedTypeOfProcess?.id;
		const workItemId = dataDetail?.workItem?.id;
		const isAuthority = dataDetail?.document
			? dataDetail?.document?.isAuthority
			: dataDetail?.isAuthority;
		const params = {
			processCode,
			workItemId,
			docId: documentId,
			...(isAuthority === true && { isAuthority: true }),
		};

		const paramsStr = JSON.stringify(params);
		if (lastKanbanParamsRef.current === paramsStr) return;
		lastKanbanParamsRef.current = paramsStr;

		dispatch(getKanbanProcessProgress(params));
	}, [selectedTypeOfProcess, dispatch, dataDetail, documentId]);

	// Sorted data for CustomStepper
	const sortedStepsData = useMemo(() => {
		if (
			!Array.isArray(dataKanbanProcessProgress) ||
			dataKanbanProcessProgress.length === 0
		) {
			return [];
		}
		return [...dataKanbanProcessProgress].sort((a, b) => a.order - b.order);
	}, [dataKanbanProcessProgress]);

	const stepsFromApi = useMemo(() => {
		return sortedStepsData.map((item) => ({
			id: item.id,
			action: item.action,
			assigned: item.assigned,
			label: item.name || item.title || "",
			curWorkItem: item.curWorkItem,
			completed: item.completed,
			currentLane: item.currenLane,
			signerRequiredRole: item.signerRequiredRole,
		}));
	}, [sortedStepsData]);

	useEffect(() => {
		// const activeIndex = stepsFromApi.findIndex(
		// 	step => step.curWorkItem && !step.completed
		// );
		let activeIndex = -1;

		// Case A: bước đang xử lý (curWorkItem=true, completed=false)
		activeIndex = stepsFromApi.findIndex(
			(step) => step.curWorkItem === true && step.completed === false
		);

		// Case B: bước trước đã xong (curWorkItem=true, completed=true),
		// bước tiếp theo chưa bắt đầu (cả 2 đều false)
		if (activeIndex === -1) {
			for (let i = 0; i < stepsFromApi.length - 1; i += 1) {
				const cur = stepsFromApi[i];
				const next = stepsFromApi[i + 1];
				if (
					cur?.curWorkItem === true &&
					cur?.completed === true &&
					next?.curWorkItem === false &&
					next?.completed === false
				) {
					activeIndex = i + 1;
					break;
				}
			}
		}

		if (activeIndex !== -1) {
			setActiveStep(activeIndex);
		}
	}, [stepsFromApi]);

	const stepKey = useMemo(() => {
		return (
			selectedStep?.action ||
			selectedStep?.lane ||
			selectedStep?.name ||
			selectedStep?.title ||
			"default"
		);
	}, [selectedStep]);

	// Danh sách user được preselect khi mở popup Trình ký
	// = assigned users của bước sẽ gửi đến.
	// Nếu bước đích đầu tiên chưa có người, tiếp tục dò các bước sau để lấy bước gần nhất có người.
	const activeStepPreselectedUsers = useMemo(() => {
		let targetIndex = -1;

		const normalizeStepUsers = (users) => {
			if (!Array.isArray(users) || users.length === 0) return [];
			return users
				.map((user) => {
					if (typeof user === "string") {
						return { userId: user, id: user, key: user, unitType: "user", chiDao: true };
					}
					const id = user?.userId || user?.id || user?._id;
					if (!id) return null;
					return {
						userId: id,
						id,
						key: id,
						name: user?.name || user?.userName || "",
						unitType: "user",
						chiDao: true,
					};
				})
				.filter(Boolean);
		};

		const getUsersFromStateByStep = (step) => {
			const stateKey = step?.action || step?.lane || step?.name || step?.title;
			if (!stateKey) return [];
			return normalizeStepUsers(selectedUsersByStep?.[stateKey]);
		};

		const getUsersFromApiByStep = (step) => {
			return normalizeStepUsers(step?.assigned);
		};

		// Case A: đang ở bước curWorkItem=true, completed=false
		// → sẽ trình lên bước KẾ (index + 1)
		const caseAIdx = stepsFromApi.findIndex(
			(step) => step.curWorkItem === true && step.completed === false
		);
		if (caseAIdx !== -1 && caseAIdx < sortedStepsData.length - 1) {
			targetIndex = caseAIdx + 1;
		} else {
			// Case B: bước trước done, bước tiếp theo chưa bắt đầu
			// → bước tiếp theo chính là nơi sẽ gửi đến
			for (let i = 0; i < stepsFromApi.length - 1; i += 1) {
				const cur = stepsFromApi[i];
				const next = stepsFromApi[i + 1];
				if (
					cur?.curWorkItem === true &&
					cur?.completed === true &&
					next?.curWorkItem === false &&
					next?.completed === false
				) {
					targetIndex = i + 1;
					break;
				}
			}
		}

		// Fallback cho document chưa bắt đầu quy trình (giống AddDialog)
		if (targetIndex === -1 && sortedStepsData.length > 1) {
			targetIndex = 1;
		}

		if (targetIndex === -1) return [];

		let assignedUsers = [];
		for (let i = targetIndex; i < sortedStepsData.length; i += 1) {
			const step = sortedStepsData[i];
			const usersFromState = getUsersFromStateByStep(step);
			if (usersFromState.length > 0) {
				assignedUsers = usersFromState;
				break;
			}

			const usersFromApi = getUsersFromApiByStep(step);
			if (usersFromApi.length > 0) {
				assignedUsers = usersFromApi;
				break;
			}
		}

		if (assignedUsers.length === 0) return [];

		return assignedUsers;
	}, [stepsFromApi, sortedStepsData, selectedUsersByStep]);

	// Kiểm tra xem step có thể được chọn không
	const isStepSelectable = useCallback((stepData) => {
		if (!stepData) return false;

		const currentLane = stepData?.currentLane;
		const signerRequiredRole = stepData?.signerRequiredRole || [];

		// Nếu currentLane nằm trong signerRequiredRole, step không khả dụng
		if (
			currentLane &&
			Array.isArray(signerRequiredRole) &&
			signerRequiredRole.includes(currentLane)
		) {
			return false;
		}

		// Nếu canChoose !== true, step không thể chọn
		if (stepData?.canChoose !== true) {
			return false;
		}

		return true;
	}, []);

	// Tính toán những step bị disable (không có quyền)
	const disabledSteps = useMemo(() => {
		return sortedStepsData.reduce((acc, item, index) => {
			if (!isStepSelectable(item)) {
				acc[index] = true;
			}
			return acc;
		}, {});
	}, [sortedStepsData, isStepSelectable]);

	// Handler for step click - view only mode shows popup
	const handleStepChange = useCallback(
		(index) => {
			const stepData = sortedStepsData[index];
			const currentLane =
				stepData?.currentLane
			const signerRequiredRole =
				stepData?.signerRequiredRole || []
			if (
				currentLane &&
				Array.isArray(signerRequiredRole) &&
				signerRequiredRole.includes(currentLane)
			) {
				toast("Bước này chưa khả dụng để chọn người xử lý", "warning");
				return;
			}
			if (stepData?.canChoose !== true) {
				toast("Bước này chưa khả dụng để chọn người xử lý", "warning");
				return;
			}
			setSelectedStep(stepData);
			setOpenStepDialog(true);
		},
		[sortedStepsData, toast]
	);

	const handleCloseDialogStep = useCallback(() => {
		setOpenStepDialog(false);
	}, []);

	// --- Handlers ---
	// const handleDateChange = useCallback(
	// 	(field) => (newDate) => {
	// 		field.onChange(newDate ? dayjs(newDate).format("DD/MM/YYYY") : null);
	// 	},
	// 	[]
	// );

	const handleSelectBook = useCallback(
		(fieldOnChange) => (event) => {
			fieldOnChange(event);
			const selectedBookDocument = listBookDocuments.find(
				(doc) => doc.bookDocumentId === event
			);
			if (selectedBookDocument) {
				const countValue = selectedBookDocument.count || "";
				const symbols = selectedBookDocument.textSymbols || selectedBookDocument.toBookTextSymbols;
				const toBookCode = selectedBookDocument.toBookCode || "";

				setValue("toBook", countValue, { shouldValidate: true });
				setValue("toBookCode", toBookCode, { shouldValidate: true });

				if (symbols) {
					setValue("draftSymbol", symbols, { shouldValidate: true });
					setValue("textSymbols", symbols, { shouldValidate: true });
				}
			}
		},
		[listBookDocuments, setValue]
	);

	useEffect(() => {
		if (open && isVanThuCuc && currentDocumentId) {
			const key = `${currentDocumentId}_${reloadDocDraft}_${reloadDataLocal}`;
			if (lastListBookKeyRef.current === key) return;
			lastListBookKeyRef.current = key;

			dispatch(getListBookDocuments());
		}
	}, [
		open,
		isVanThuCuc,
		currentDocumentId,
		reloadDocDraft,
		reloadDataLocal,
		dispatch,
	]);

	// Logic fill tương tự PopupGiveNumber
	useEffect(() => {
		if (open && isVanThuCuc && !dataDetail?.isPromulgate) {
			const currentDate = watch("documentDate");
			if (!currentDate) {
				setValue("documentDate", dayjs(), { shouldValidate: true });
			}
		}
	}, [open, isVanThuCuc, dataDetail, setValue, watch]);

	useEffect(() => {
		if (open && isVanThuCuc && !dataDetail?.isPromulgate && listBookDocuments?.length > 0) {
			const currentBook = watch("bookDocumentId");
			if (!currentBook) {
				const firstBook = listBookDocuments[0];
				if (firstBook) {
					setValue("bookDocumentId", firstBook.bookDocumentId, { shouldValidate: true });
					const countValue = firstBook.count || "";
					const symbols = firstBook.textSymbols || firstBook.toBookTextSymbols;
					const toBookCode = firstBook.toBookCode || "";
					setValue("toBook", countValue, { shouldValidate: true });
					setValue("toBookCode", toBookCode, { shouldValidate: true });
					if (symbols) {
						setValue("draftSymbol", symbols, { shouldValidate: true });
						setValue("textSymbols", symbols, { shouldValidate: true });
					}
				}
			}
		}
	}, [open, isVanThuCuc, dataDetail, listBookDocuments, setValue, watch]);

	const handlePreview = useCallback(
		async (file) => {
			if (!file || !file.fileId) {
				toast("File không hợp lệ hoặc không có ID.", "warning");
				return;
			}
			try {
				const response = await axiosInstance.get(
					`${API_VIEW_FILE}/${file.fileId}`,
					{ responseType: "blob" }
				);
				const blob = response;
				const objectUrl = URL.createObjectURL(blob);

				const fileExtension = file.fileName?.split(".").pop().toLowerCase();
				let fileType = null;
				if (["jpg", "jpeg", "png", "gif"].includes(fileExtension)) {
					fileType = "image";
				} else if (fileExtension === "pdf") {
					fileType = "pdf";
					// Gọi API xác thực chữ ký số nếu là file PDF
					dispatch(verifyPdfSignature(file.fileId));
				}

				setViewingFile({
					open: true,
					url: objectUrl,
					name: file.fileName,
					type: fileType,
				});
			} catch (error) {
				toast("Không thể tải file để xem trước.", "error");
			}
		},
		[toast, dispatch]
	);

	const handleCloseFileViewer = useCallback(() => {
		if (viewingFile.url) {
			URL.revokeObjectURL(viewingFile.url);
		}
		setViewingFile({ open: false, url: null, name: "", type: null });
	}, [viewingFile.url]);



	const handleSubTabChange = useCallback((event, newValue) => {
		setSubTabValue(newValue);
	}, []);

	const tabConfigs = useMemo(() => {
		return [
			{ key: "draft", label: "VB trình ký" },
			...(isVTDaBanHanh ? [{ key: "recipientUnits", label: "ĐV nhận" }] : []),
			{ key: "draftVersion", label: "Phiên bản DT" },
			{ key: "replyDocs", label: "Phúc đáp VB" },
			{ key: "jobProfiles", label: "Công việc" },
			{ key: "replacements", label: "Thay thế" },
		];
	}, [isVTDaBanHanh]);

	const activeSubTabKey = tabConfigs[subTabValue]?.key || tabConfigs[0]?.key;

	useEffect(() => {
		if (subTabValue >= tabConfigs.length) {
			setSubTabValue(0);
		}
	}, [subTabValue, tabConfigs.length]);

	const handleCompleteProposal = useCallback(async () => {
		try {
			const actionCode = documentDetail?.availableActions?.find(
				(a) => a.type === "completeProposal"
			)?.code;

			const body = {
				docIds,
				userId,
				actionCode,
				note,
				authority: documentDetail?.document?.isAuthority,
			};
			const res = await axiosInstance.post(
				`${API_PROCCESS_DOCUMENT}/${documentDetail?.workItem?.id}/complete-draft`,
				body
			);

			if (res) {
				handleReloadAll();
				toast(res?.message || "Hoàn thành VBDT thành công", "success");
				setNote("");
			}
		} catch (error) {
			logger.log("err", error);
			const messageError = error?.response?.data?.message || error.message || "Có lỗi xảy ra khi hoàn thành VBDT";
			toast(messageError, "error");
		}
	}, [
		docIds,
		documentDetail?.availableActions,
		documentDetail?.workItem?.id,
		note,
		handleReloadAll,
		toast,
		userId,
		documentDetail?.document?.isAuthority,
	]);


	const handleChangeNote = useCallback((e) => {
		setNote(e.target.value);
	}, []);

	const handleOpenDialogDocDraft = useCallback(() => {
		setOpenDialog({
			...openDialog,
			CompleteProposal: true,
		});
	}, [openDialog]);

	// const handleOpenDialogCompleteProposal = useCallback(() => {
	//   setOpenDialog({
	//     ...openDialog,
	//     CompleteProposal: true,
	//   });
	// }, [openDialog]);

	const handleCloseDialogCompleteProposal = useCallback(() => {
		setOpenDialog({
			...openDialog,
			CompleteProposal: false,
		});
		setNote("");
	}, [openDialog]);

	const getFormDataForUpdate = useCallback(() => {
		const currentData = watch();

		// Nếu user chọn reportSigner từ dialog (selectedUsersByStep), ưu tiên giá trị đó
		const normalizeStepSigner = (reportSigner) => {
			if (!reportSigner) return [];
			if (Array.isArray(reportSigner)) {
				return reportSigner
					.map((user) => user && (user.userId || user.id || user._id))
					.filter(Boolean);
			}
			return [reportSigner];
		};

		if (
			selectedUsersByStep?.reportSigner &&
			selectedUsersByStep.reportSigner.length > 0
		) {
			currentData.reportSigner = normalizeStepSigner(selectedUsersByStep.reportSigner);
		}

		const originalData = mapDbToFormData(dataDetail);

		const areArraysEqual = (arr1, arr2) => {
			const getIds = (arr) => {
				if (!arr) return [];
				if (!Array.isArray(arr)) arr = [arr];
				return arr.map(item => {
					if (!item) return "";
					if (typeof item === "object") {
						return String(item._id || item.id || item.value || "");
					}
					return String(item);
				}).filter(Boolean).sort();
			};

			const ids1 = getIds(arr1);
			const ids2 = getIds(arr2);

			if (ids1.length !== ids2.length) return false;
			return ids1.every((val, index) => val === ids2[index]);
		};

		const normalizeValue = (value) => {
			if (value === null || value === undefined || value === "") return null;
			if (value && typeof value.format === "function") {
				return value.format("YYYY-MM-DD");
			}
			if (typeof value === "string") {
				const parsed = dayjs(value);
				if (parsed.isValid() && value.match(/^\d{4}-\d{2}-\d{2}/)) {
					return parsed.format("YYYY-MM-DD");
				}
				const parsedDmy = dayjs(value, "DD/MM/YYYY");
				if (parsedDmy.isValid() && value.match(/^\d{2}\/\d{2}\/\d{4}/)) {
					return parsedDmy.format("YYYY-MM-DD");
				}
			}
			if (value && typeof value === "object") {
				return value._id || value.id || value.value || value;
			}
			return value;
		};

		let hasChanged = false;
		const changedFields = [];

		Object.keys(originalData).forEach((key) => {
			const oldValue = originalData[key];
			const newValue = currentData[key];

			if (Array.isArray(oldValue) || Array.isArray(newValue)) {
				if (!areArraysEqual(oldValue, newValue)) {
					hasChanged = true;
					changedFields.push(key);
				}
				return;
			}

			const oldValNorm = normalizeValue(oldValue);
			const newValNorm = normalizeValue(newValue);

			if (newValNorm !== oldValNorm) {
				hasChanged = true;
				changedFields.push(key);
			}
		});

		// Chuyển đổi selectedUsersByStep từ object arrays sang ID arrays (giống EditDialog)
		const transformedUsersByStep = {};
		Object.keys(selectedUsersByStep).forEach((stepKey) => {
			const users = selectedUsersByStep[stepKey];
			if (Array.isArray(users) && users.length > 0) {
				transformedUsersByStep[stepKey] = [...new Set(users
					.map((user) => user.userId || user.id || user._id)
					.filter(Boolean))];
			}
		});

		// Sử dụng createSigningSubmissionPayload giống như EditDialog
		const body = createSigningSubmissionPayload(
			currentData,
			repliedDocumentsData,
			recalledDocumentsData,
			replacedDocuments,
			1, // documentType for outgoing
			jobProfiles,
			null, // dataDetail should be null here to avoid adding the document itself to docAnswer
			transformedUsersByStep // QUAN TRỌNG: Truyền transformed users để merge vào body
		);

		// Đảm bảo documentId được thêm vào body
		if (documentId) {
			body.documentId = documentId;
		}

		return {
			hasChanged,
			changedFields,
			body,
			currentData,
			selectedUsersByStep,
			documentId,
		};
	}, [
		watch,
		dataDetail,
		repliedDocumentsData,
		recalledDocumentsData,
		replacedDocuments,
		jobProfiles,
		selectedUsersByStep,
		documentId,
	]);

	// const handleCloseAndReload = useCallback(() => {
	// 	setReloadData(new Date() * 1);
	// 	onClose();
	// }, [onClose, setReloadData]);

	// const fetchDraftVersionsDocProposal = async () => {
	//   const res = await api.get(
	//     `${APP_BASE}/api/files/old-by-object?object_type=docProposal&object_id=${documentId}`
	//   );
	//   return res.data;
	// };
	// Thêm useCallback để hàm không bị tạo mới mỗi lần render trừ khi documentId thay đổi
	const fetchDraftVersionsDocDraft = useCallback(async () => {
		if (!documentId) return []; // Check an toàn
		try {
			const res = await api.get(
				`${APP_BASE}/api/files/old-by-object?object_type=docDraft&object_id=${documentId}`
			);
			return res.data;
		} catch (error) {
			logger.error(error);
			return [];
		}
	}, [documentId]); // Dependency quan trọng
	// const fetchDraftVersionsDocAttachments = async () => {
	//   const res = await api.get(
	//     `${APP_BASE}/api/files/old-by-object?object_type=docAttachments&object_id=${documentId}`
	//   );
	//   return res.data;
	// };

	// const canGiveNumber = documentDetail?.flags?.canSetNumber;
	// const canDigitalSign = documentDetail?.flags?.canDigitalSign;
	// const canSignDraft = documentDetail?.flags?.canSignDraft;
	// const canSignCertificate = documentDetail?.flags?.canSignCertificate;
	// logger.log("documentDetail", documentDetail);
	// const handleToggleOpen = () => {
	//   setIsOpen((prev) => !prev);
	// };

	const handleToggleOpen = useCallback((event, value) => {
		const section =
			event?.currentTarget?.dataset?.section ||
			event?.target?.dataset?.section;
		if (!section) return;
		const isExplicitValue = typeof value === "boolean";
		setIsOpen((prev) => ({
			...prev,
			[section]: isExplicitValue ? value : !prev[section],
		}));
	}, []);

	const handleToggleSection = useCallback(
		(section, value) => {
			const explicitValue = typeof value === "boolean" ? value : undefined;
			handleToggleOpen({ target: { dataset: { section } } }, explicitValue);
		},
		[handleToggleOpen]
	);

	const handleToggleDraftSection = useCallback(
		(value) => {
			handleToggleSection("draft", value);
		},
		[handleToggleSection]
	);

	// const handleToggleGeneralInfo = useCallback(
	// 	(value) => {
	// 		handleToggleSection("generalInfo", value);
	// 	},
	// 	[handleToggleSection]
	// );


	const handleSelectUsers = useCallback(
		(users) => {
			// Xử lý logic khi người dùng chọn người phê duyệt
			if (stepKey) {
				// Lưu danh sách users đã chọn vào selectedUsersByStep (cập nhật immutable)
				const nextUsers = Array.isArray(users) ? users : users ? [users] : [];
				setSelectedUsersByStep((prev) => ({
					...prev,
					[stepKey]: nextUsers,
				}));
			}

			// Trigger gọi lại API chi tiết sau khi popup lưu signer thành công
			setReloadDataLocal(new Date().getTime());

			// Reload kanban để cập nhật danh sách assigned bên dưới mỗi step
			if (selectedTypeOfProcess) {
				const processCode =
					selectedTypeOfProcess?.processKey || selectedTypeOfProcess?.id;
				const workItemId = dataDetail?.workItem?.id;
				const isAuthority = dataDetail?.document
					? dataDetail?.document?.isAuthority
					: dataDetail?.isAuthority;
				const params = {
					processCode,
					workItemId,
					docId: documentId,
					...(isAuthority === true && { isAuthority: true }),
				};
				dispatch(getKanbanProcessProgress(params));
			}
		},
		[stepKey, selectedTypeOfProcess, dataDetail, documentId, dispatch]
	);

	const createActionHandler = useCallback(
		(handler, file) => () => {
			handler(file);
		},
		[]
	);

	const repliedDocActions = [
		{
			id: "delete",
			config: {
				icon: <Delete />,
				color: "#0782E0",
				actionType: "delete",
				displayName: "Xóa văn bản",
			},
		},
	];

	const handleReplacedDocAction = useCallback((action, row) => {
		if (action.id === "delete") {
			setConfirmDelete({
				open: true,
				onConfirm: () => {
					setReplacedDocuments((prev) =>
						prev.filter((d) => d.documentId !== row.documentId)
					);
					setConfirmDelete({ open: false, onConfirm: null });
				},
				title: "Xác nhận xóa",
				content: "Bạn có chắc chắn muốn xóa văn bản thay thế này không?",
			});
		}
	}, []);

	const handleCloseRecallDialog = useCallback(() => {
		setRecallProcessing(false);
	}, []);

	// const handleOpenRecallDialog = useCallback(() => {
	// 	setRecallProcessing(true);
	// }, []);

	// Thu hồi xử lý Vb đi
	const handleRecall = useCallback(async () => {
		try {
			const body = {
				outgoingDocId: documentId?.toString(),
			};
			const params = isAuthority === true
				? { isAuthority: true }
				: undefined;
			const response = await axiosInstance.post(
				`${APP_BASE}/api/documents/outgoing/recall`,
				body,
				{ params }
			);
			if (response) {
				toast("Thu hồi xử lý thành công", "success");
				dispatch(getSideBarMenu()); // Cập nhật sidebar
				handleCloseRecallDialog();
				handleReloadAll();
			}
		} catch (error) {
			logger.log("error", error);
			toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
		}
	}, [
		documentId,
		dispatch,
		handleReloadAll,
		handleCloseRecallDialog,
		toast,
		isAuthority
	]);

	const handleNavigateToDoc = useCallback((docId) => {
		if (!docId) return;
		setDocumentStack((prev) => {
			const cur = prev[prev.length - 1];
			if (cur === docId) return prev;          // tránh push trùng
			return [...prev, docId];
		});
	}, []);

	// Handler cho Phúc đáp - mở ViewIncommingDoc
	const createReplyViewDialogHandler = useCallback(
		(docId) => (e) => {
			e.preventDefault();
			e.stopPropagation();
			setSelectedIncommingDocId(docId);
			setOpenIncommingDocDetail(true);
		},
		[]
	);

	// Handler đóng ViewIncommingDoc
	const handleCloseIncommingDocDetail = useCallback(() => {
		setOpenIncommingDocDetail(false);
		// Khôi phục lại ý kiến xử lý và lịch sử của văn bản hiện tại
		if (currentDocumentId) {
			dispatch(getCommentsByDocument({ documentId: currentDocumentId, type: "outgoing" }));
			dispatch(getDocumentHistory(currentDocumentId));
		}
	}, [dispatch, currentDocumentId]);

	// Handlers cho ViewJobToDocument
	// const handleJobRowClick = useCallback((job) => {
	// 	logger.log("job", job);
	// 	if (!job?.id) return;
	// 	setSelectedTask(job);
	// 	setOpenDetailModal(true);
	// }, [])

	const handleCloseModal = useCallback(() => {
		setOpenDetailModal(false);
		setSelectedTask(null);
		// Khôi phục lại ý kiến xử lý và lịch sử của văn bản hiện tại
		if (currentDocumentId) {
			dispatch(getCommentsByDocument({ documentId: currentDocumentId, type: "outgoing" }));
			dispatch(getDocumentHistory(currentDocumentId));
		}
	}, [dispatch, currentDocumentId]);

	const handleJobDetailSuccess = useCallback(() => {
		// Reload data if needed
		handleReloadAll();
	}, [handleReloadAll]);

	// Handler cho Văn bản thay thế - giữ nguyên logic hiện tại
	const handleOpenInternalUnitDialog = useCallback(() => {
		setDialogOpenFor("internalReceivingDept");
	}, []);

	const handleOpenForInformationDialog = useCallback(() => {
		setDialogOpenForInformationDialog("knowReceivers");
	}, []);

	const handleCloseDialog = useCallback(() => {
		setDialogOpenFor(null);
		setDialogOpenForInformationDialog(null);
	}, []);

	const handleSaveUnits = useCallback(
		(units) => {
			if (!dialogOpenFor) return;

			switch (dialogOpenFor) {
				case "internalReceivingDept": {
					const oldUnitIds = (internalReceivingDeptOldUnits || [])
						.map((item) => getUnitId(item))
						.filter(Boolean);

					const newUnitsOnly = units.filter(
						(unit) => getUnitId(unit) && !oldUnitIds.includes(getUnitId(unit))
					);

					setInternalUnitUnits(newUnitsOnly);
					setValue("internalReceivingDept", newUnitsOnly, { shouldValidate: true });
					break;
				}
				default:
					break;
			}

			handleCloseDialog();
		},
		[dialogOpenFor, setValue, handleCloseDialog, internalReceivingDeptOldUnits]
	);

	const handleSaveKnowReceivers = useCallback(
		(units) => {
			setUserByOrganizationUnits(units);
			setValue("knowReceivers", units, { shouldValidate: true });
			handleCloseDialog();
		},
		[setValue, handleCloseDialog]
	);

	const handleChangeInternalReceivingDept = useCallback(
		(val) => {
			setValue("internalReceivingDept", val, { shouldValidate: true });
			setInternalUnitUnits(val || []);
		},
		[setValue]
	);

	const handleChangeKnowReceivers = useCallback(
		(val) => {
			setValue("knowReceivers", val, { shouldValidate: true });
			setUserByOrganizationUnits(val || []);
		},
		[setValue]
	);

	const createViewDialogHandler = useCallback(
		(docId) => (e) => {
			e.preventDefault();
			e.stopPropagation();
			handleNavigateToDoc(docId);
		},
		[handleNavigateToDoc]
	);

	const handleCloseAndReload = useCallback(() => {
		setDocumentStack((prev) => {
			if (prev.length > 1) {
				// đang xem B/C -> quay lại văn bản trước (A)
				return prev.slice(0, -1);
			}
			// đang ở A -> đóng dialog như cũ
			handleReloadAll();
			onClose();
			return prev; // hoặc []
		});
	}, [onClose, handleReloadAll]);

	// const handleOpenExportDialog = useCallback(() => {
	// 	setOpenDialogExport(true);
	// }, []);

	const handleOpenEditDialogFromView = useCallback(() => {
		setOpenEditDialogFromView(true);
	}, []);

	const handleCloseEditDialogFromView = useCallback(() => {
		setOpenEditDialogFromView(false);
	}, []);

	const handleEditSuccessFromView = useCallback(() => {
		setOpenEditDialogFromView(false);
		setReloadDataLocal((prev) => prev + 1);
	}, []);

	const handleCloseExport = useCallback(() => {
		setOpenDialogExport(false);
	}, []);

	const isVTChoPhatHanh = useMemo(() => isVanThuCuc && (dataDetail?.isChoBanHanh || documentDetail?.isChoBanHanh), [isVanThuCuc, dataDetail, documentDetail]);
	const isPromulgate = dataDetail?.isPromulgate === true;

	const flagSign = useMemo(() => {
		return !!(
			documentDetail?.flags?.canSignContentDraft ||
			documentDetail?.flags?.canSignFormatDraft ||
			documentDetail?.flags?.canReportSigner ||
			documentDetail?.flags?.canStampDoc ||
			documentDetail?.flags?.canSignCopy ||
			documentDetail?.flags?.canOfficialSigner1 ||
			documentDetail?.flags?.canOfficialSigner2 ||
			documentDetail?.flags?.canOfficialSigner3
		);
	}, [documentDetail]);

	const showBatchSignBtn = useMemo(() => {
		return (
			flagSign &&
			!isPromulgate &&
			activeSubTabKey === "draft" &&
			Array.isArray(draftFiles) &&
			draftFiles.some((file) => file?.canSign === true)
		);
	}, [flagSign, isPromulgate, activeSubTabKey, draftFiles]);

	const handleBatchSignClick = useCallback(() => {
		setTriggerBatchSignCount((prev) => prev + 1);
	}, []);

	const resetTriggerBatchSign = useCallback(() => {
		setTriggerBatchSignCount(0);
	}, []);

	const isDongDau = useMemo(() => {
		return (
			documentDetail?.availableActions?.some(item => item?.code === "DONG_DAU" && item?.type === "stampDoc")
		);
	}, [documentDetail]);

	const shouldShowDocumentDate = useMemo(() => {
		// 1. Hiển thị nếu isVTChoPhatHanh === true
		if (isVTChoPhatHanh) return true;

		// 2. Hiển thị nếu isDongDau === true
		if (isDongDau) return true;

		const processList = Array.isArray(dataKanbanProcessProgress) ? dataKanbanProcessProgress : [];

		// 3. Tồn tại một bước đồng thời thỏa mãn: action === "signStamp" và completed === true
		const hasCompletedSignStamp = processList.some(
			(step) => step?.action === "signStamp" && step?.completed === true
		);
		if (hasCompletedSignStamp) return true;

		// 4. Trường hợp quy trình không có bước đóng dấu:
		// - isStamp === false (từ chi tiết văn bản)
		// - tất cả các bước trong dataKanbanProcessProgress đều có action !== "signStamp"
		// - và bước cuối cùng của quy trình có completed === true
		const currentIsStamp = isStamp || !!(documentDetail?.isStamp || documentDetail?.document?.isStamp);
		if (!currentIsStamp && processList.length > 0) {
			const hasNoSignStampStep = processList.every((step) => step?.action !== "signStamp");
			if (hasNoSignStampStep) {
				const sortedList = [...processList].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
				const lastStep = sortedList[sortedList.length - 1];
				if (lastStep?.completed === true) {
					return true;
				}
			}
		}

		return false;
	}, [isVTChoPhatHanh, isDongDau, dataKanbanProcessProgress, isStamp, documentDetail]);

	return (
		<>
			<BaseSwipper
				title={title || "Chi tiết dự thảo văn bản"}
				onClose={handleCloseAndReload}
				open={open}
				type="view"
				hideBackdrop
				moreActions={
					<>
						{/* {documentDetail?.flags?.canRecall && (
							<Button variant="outlined" onClick={handleOpenRecallDialog}>
								THU HỒI XỬ LÝ
							</Button>
						)} */}
						{(isVTChoPhatHanh || isDongDau) && (
							<ButtonOutline variant="outlined" onClick={handleOpenEditDialogFromView}>
								CHỈNH SỬA
							</ButtonOutline>
						)}
						{/* <Button variant="outlined" onClick={handleOpenExportDialog}>
							XUẤT BIỂU MẪU
						</Button> */}
						{showBatchSignBtn && (
							<BatchSignButtonWrapper>
								<ButtonOutline
									variant="contained"
									disabled={isSigningMultiple}
									onClick={handleBatchSignClick}
									startIcon={
										isSigningMultiple ? (
											<CircularProgress size={24} />
										) : (
											<StyleDriveFileRenameOutlineOutlinedIcon />
										)
									}
								>
									{isSigningMultiple ? "Đang ký số..." : "KÝ SỐ"}
								</ButtonOutline>
							</BatchSignButtonWrapper>
						)}
						<FormButton
							setReloadData={handleReloadAll}
							dataDetail={documentDetail}
							getFormDataForUpdate={getFormDataForUpdate}
							selectedUsersByStep={selectedUsersByStep}
							initialPreselectedUsers={activeStepPreselectedUsers}
							selectedStep={selectedStep}
							isVanThuCuc={isVanThuCuc}
							draftFiles={draftFiles}
							isView
							disabled={isLoadingDetail}
						/>
					</>
				}
			>
				<>
					<SectionCard>
						<CustomStepper
							steps={stepsFromApi}
							activeStep={activeStep}
							onStepClick={handleStepChange}
							alternativeLabel={false}
							selectedUsersByStep={selectedUsersByStep}
							stepKey={stepKey}
							disabledSteps={disabledSteps}
						/>
					</SectionCard>
					<GeneralInfoGridContainer container spacing={4}>
						<FormGridItem item xs={12}>
							<StyledGrid container spacing={2}>
								<StyledGridContainerInfo item xs={12}>
									<StyledViewGridContainer container spacing={2} isView>
										<StyledMainColumn item xs={12} md={8} isView>
											<SectionCard>
												<SummaryHeaderBox>
													<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>

														<StyledIconWrapper>
															<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M2.53027 16.6411L2.53027 3.36109C2.53027 2.7007 2.7928 2.06756 3.25977 1.60059C3.72673 1.13362 4.35988 0.871094 5.02027 0.871094L12.4903 0.871094L12.5721 0.875144C12.7622 0.893977 12.9409 0.978023 13.0771 1.11426L17.2271 5.26426C17.3828 5.41992 17.4703 5.63096 17.4703 5.85109L17.4703 16.6411C17.4703 17.3015 17.2077 17.9346 16.7408 18.4016C16.2738 18.8686 15.6407 19.1311 14.9803 19.1311L5.02027 19.1311C4.35988 19.1311 3.72673 18.8686 3.25977 18.4016C2.7928 17.9346 2.53027 17.3014 2.53027 16.6411ZM4.19027 16.6411C4.19027 16.8612 4.27778 17.0723 4.43344 17.2279C4.5891 17.3836 4.80014 17.4711 5.02027 17.4711L14.9803 17.4711C15.2004 17.4711 15.4115 17.3836 15.5671 17.2279C15.7228 17.0723 15.8103 16.8612 15.8103 16.6411L15.8103 6.19476L12.1466 2.53109L5.02027 2.53109C4.80014 2.53109 4.5891 2.6186 4.43344 2.77426C4.27778 2.92992 4.19027 3.14096 4.19027 3.36109L4.19027 16.6411Z" fill="#2364B0" />
																<path d="M10.8506 5.00156L10.8506 1.68156C10.8506 1.22317 11.2222 0.851563 11.6806 0.851563C12.139 0.851563 12.5106 1.22317 12.5106 1.68156L12.5106 5.00156C12.5106 5.22169 12.5981 5.43274 12.7538 5.5884C12.9094 5.74406 13.1205 5.83156 13.3406 5.83156L16.6606 5.83156C17.119 5.83156 17.4906 6.20317 17.4906 6.66156C17.4906 7.11995 17.119 7.49156 16.6606 7.49156L13.3406 7.49156C12.6802 7.49156 12.047 7.22903 11.5801 6.76207C11.1131 6.2951 10.8506 5.66195 10.8506 5.00156Z" fill="#2364B0" />
																<path d="M8.32984 6.67188C8.78825 6.67188 9.15984 7.04348 9.15984 7.50187C9.15984 7.96027 8.78825 8.33187 8.32984 8.33187H6.66984C6.21145 8.33187 5.83984 7.96027 5.83984 7.50187C5.83984 7.04348 6.21145 6.67188 6.66984 6.67188L8.32984 6.67188Z" fill="#2364B0" />
																<path d="M13.3206 10C13.779 10 14.1506 10.3716 14.1506 10.83C14.1506 11.2884 13.779 11.66 13.3206 11.66L6.68059 11.66C6.22219 11.66 5.85059 11.2884 5.85059 10.83C5.85059 10.3716 6.22219 10 6.68059 10L13.3206 10Z" fill="#2364B0" />
																<path d="M13.3206 13.3398C13.779 13.3398 14.1506 13.7114 14.1506 14.1698C14.1506 14.6283 13.779 14.9998 13.3206 14.9998L6.68059 14.9998C6.22219 14.9998 5.85059 14.6283 5.85059 14.1698C5.85059 13.7114 6.22219 13.3398 6.68059 13.3398L13.3206 13.3398Z" fill="#2364B0" />
															</svg>
														</StyledIconWrapper>
														<StyledHeaderContent variant="h6" noWrap isView={isView}>
															THÔNG TIN CHUNG
														</StyledHeaderContent>


														<SeeMoreToggleButton onClick={toggleShowAll}>
															{showAll ? "Thu gọn" : "Xem thêm"}
														</SeeMoreToggleButton>

													</div>
													<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
														{(watch("urgency") || documentDetail?.urgencyLevel) && (
															<UrgencyBadge
																urgencyCode={watch("urgency") || (typeof documentDetail?.urgencyLevel === 'object' ? documentDetail?.urgencyLevel?.value : documentDetail?.urgencyLevel)}
																urgencyLabel={urgencyOptions.find(opt => opt.value === (watch("urgency") || (typeof documentDetail?.urgencyLevel === 'object' ? documentDetail?.urgencyLevel?.value : documentDetail?.urgencyLevel)))?.title}
															>
																{urgencyOptions.find(opt => opt.value === (watch("urgency") || (typeof documentDetail?.urgencyLevel === 'object' ? documentDetail?.urgencyLevel?.value : documentDetail?.urgencyLevel)))?.title || "Bình thường"}
															</UrgencyBadge>
														)}
													</div>
												</SummaryHeaderBox>
												{isOpen.generalInfo && <StyledDivider />}
												<Collapse in={isOpen.generalInfo}>
													<>
														<Grid container spacing={2}>
															{/* Row 1 */}
															{showAll && (
																<FadeInGridItem item xs={12} sm={8}>
																	<Controller
																		name="typeOfProcess"
																		control={control}
																		render={({ field }) => (
																			<MemoizedInputComponents
																				label="Loại quy trình"
																				{...field}
																			/>
																		)}
																	/>
																</FadeInGridItem>
															)}
															{showAll && (
																<FadeInGridItem item xs={12} sm={4}>
																	<Controller
																		name="documentType"
																		control={control}
																		render={({ field }) => (
																			<MemoizedInputComponents
																				select
																				label="Loại văn bản"
																				options={documentTypeOptions}
																				customLabel="title"
																				customValue="value"
																				{...field}
																			/>
																		)}
																	/>
																</FadeInGridItem>
															)}

															{showAll && (
																<FadeInGridItem item xs={12} sm={(isPromulgate || isVTChoPhatHanh) ? 4 : 8}>
																	<Controller
																		name="draftingUnit"
																		control={control}
																		render={({ field }) => (
																			<MemoizedInputComponents
																				select
																				options={draftingUnitOptions}
																				customLabel="name"
																				customValue="_id"
																				label="Đơn vị soạn thảo"
																				{...field}
																			/>
																		)}
																	/>
																</FadeInGridItem>
															)}
															{showAll && (
																<FadeInGridItem item xs={12} sm={4}>
																	<Controller
																		name="drafter"
																		control={control}
																		render={({ field }) => (
																			<MemoizedInputComponents
																				select
																				options={userOptions}
																				customLabel="name"
																				customValue="_id"
																				label="Người soạn thảo"
																				{...field}
																			/>
																		)}
																	/>
																</FadeInGridItem>
															)}

															{/* Row 2
																{showAll && (
																	<FadeInGridItem item xs={12} sm={4}>
																		<Controller
																			name="urgency"
																			control={control}
																			render={({ field }) => (
																				<MemoizedInputComponents
																					select
																					label="Độ khẩn"
																					{...field}
																					options={urgencyOptions}
																					customLabel="title"
																					customValue="value"
																				/>
																			)}
																		/>
																	</FadeInGridItem>
																)} */}
															{showAll && (
																<FadeInGridItem item xs={12} sm={4}>
																	<Controller
																		name="documentField"
																		control={control}
																		render={({ field }) => (
																			<MemoizedInputComponents
																				select
																				options={fieldsOptions}
																				customLabel="title"
																				customValue="value"
																				label="Lĩnh vực"
																				{...field}
																			/>
																		)}
																	/>
																</FadeInGridItem>
															)}
															{/* Row 4 */}
															{showAll && (
																<FadeInGridItem item xs={12} sm={4}>
																	<Controller
																		name="draftSymbol"
																		control={control}
																		render={({ field }) => (
																			<MemoizedInputComponents
																				label="Ký hiệu văn bản dự thảo"
																				isView={!isVTChoPhatHanh}
																				forceViewStyle={isVTChoPhatHanh}
																				{...field}
																			/>
																		)}
																	/>
																</FadeInGridItem>
															)}
															{showAll && (
																<FadeInGridItem item xs={12} sm={4}>
																	<Controller
																		name="replyDeadline"
																		control={control}
																		render={({ field }) => (
																			<MemoizedDatePicker
																				label="Hạn trả lời"
																				value={field.value || null}
																			/>
																		)}
																	/>
																</FadeInGridItem>
															)}

															{showAll && (
																<>
																	{shouldShowDocumentDate && (
																		<FadeInGridItem item xs={12} sm={4}>
																			<Controller
																				name="documentDate"
																				control={control}
																				render={({ field }) => (
																					<MemoizedDatePicker
																						label="Ngày văn bản"
																						value={field.value || null}
																						onChange={field.onChange}
																						isView={!isVTChoPhatHanh}
																						forceViewStyle={isVTChoPhatHanh}
																					/>
																				)}
																			/>
																		</FadeInGridItem>
																	)}

																	{isVTChoPhatHanh && (
																		<>
																			<FadeInGridItem item xs={12} sm={4}>
																				<Controller
																					name="bookDocumentId"
																					control={control}
																					render={({ field }) => (
																						<MemoizedInputComponents
																							select
																							options={optionsSoVbDi}
																							customLabel="label"
																							customValue="value"
																							label="Sổ văn bản"
																							isView={!isVTChoPhatHanh}
																							forceViewStyle={isVTChoPhatHanh}
																							{...field}
																							onChange={handleSelectBook(field.onChange)}
																						/>
																					)}
																				/>
																			</FadeInGridItem>
																			<FadeInGridItem item xs={12} sm={4}>
																				<Controller
																					name="toBook"
																					control={control}
																					render={({ field }) => (
																						<MemoizedInputComponents
																							label="Số văn bản đi"
																							isView={!isVTChoPhatHanh}
																							forceViewStyle={isVTChoPhatHanh}
																							{...field}
																						/>
																					)}
																				/>
																			</FadeInGridItem>
																		</>
																	)}
																</>
															)}
															{showAll && isVanThuCuc && !showStampOption && (
																<FadeInGridItem item xs={12} sm={6} md={4}>
																	<Controller
																		name="signatureType"
																		control={control}
																		render={({ field }) => (
																			<SignTypeCheckboxGroup
																				value={field.value}
																				onChange={field.onChange}
																				disabled={!isVTChoPhatHanh}
																			/>
																		)}
																	/>
																</FadeInGridItem>
															)}
															{showAll && showStampOption && (
																<FadeInGridItem item xs={12} sm={6} md={4}>

																	<FormControlLabel
																		control={
																			<Checkbox
																				checked={isStamp}
																				disabled           // Vì là màn CHI TIẾT (View)
																				size="small"
																			/>
																		}
																		label="Đóng dấu"
																	/>
																</FadeInGridItem>
															)}

															<Grid item xs={12}>
																<AbstractSummaryBox>
																	<StyledInfoIcon />
																	<AbstractSummaryContent>
																		<AbstractSummaryTitle>Trích yếu nội dung</AbstractSummaryTitle>
																		<AbstractSummaryText>
																			{watch("extract") || "-"}
																		</AbstractSummaryText>
																	</AbstractSummaryContent>
																</AbstractSummaryBox>
															</Grid>

															{showAll && !isVTDaBanHanh && (
																<Grid item xs={12} sm={12} md={6}>
																	<FormLabel>
																		Đơn vị nhận
																	</FormLabel>
																	<ActionContainer>
																		<Controller
																			name="internalReceivingDept"
																			control={control}
																			render={({ field }) => (
																				<FlexGrowBox>
																					<AsyncAutoComplete
																						fullWidth
																						placeholder="Tìm kiếm đơn vị..."
																						url={`${API_GET_LIST_UNIT}?maxLevel=4`}
																						method="GET"
																						queryParam="name"
																						optionLabel="name"
																						optionValue="id"
																						value={field.value}
																						onChange={handleChangeInternalReceivingDept}
																						returnObject
																						error={!!errors.internalReceivingDept}
																						helperText={errors.internalReceivingDept?.message}
																						isMulti
																						size="small"
																						required
																						disabled={!isVTChoPhatHanh}
																						limitTags={2}
																					/>
																				</FlexGrowBox>
																			)}
																		/>
																		{isVTChoPhatHanh && (
																			<StyledButton onClick={handleOpenInternalUnitDialog}>
																				CHỌN
																			</StyledButton>
																		)}
																	</ActionContainer>
																</Grid>
															)}
															{showAll && (
																<Grid item xs={12} sm={12} md={isVTDaBanHanh ? 12 : 6}>
																	<FormLabel>Cá nhân nhận văn bản</FormLabel>
																	<ActionContainer>
																		<Controller
																			name="knowReceivers"
																			control={control}
																			render={({ field }) => (
																				<FlexGrowBox>
																					<AsyncAutoComplete
																						fullWidth
																						placeholder="Tìm kiếm cá nhân..."
																						url={`${API_GET_LIST_USERS}/principals`}
																						method="GET"
																						queryParam="name"
																						optionLabel="name"
																						optionValue="id"
																						value={field.value}
																						onChange={handleChangeKnowReceivers}
																						returnObject
																						error={!!errors.knowReceivers}
																						helperText={errors.knowReceivers?.message}
																						isMulti
																						size="small"
																						disabled={!isVTChoPhatHanh}
																						limitTags={3}
																					/>
																				</FlexGrowBox>
																			)}
																		/>
																		{isVTChoPhatHanh && (
																			<StyledButton onClick={handleOpenForInformationDialog}>
																				CHỌN
																			</StyledButton>
																		)}
																	</ActionContainer>
																</Grid>
															)}
															{showAll && (
																<FadeInGridItem item xs={12} sm={isVanThuCuc ? 6 : 12}>
																	<FormLabel>Xin ý kiến</FormLabel>
																	<Controller
																		name="processor"
																		control={control}
																		render={({ field }) => (
																			<AsyncAutoComplete
																				fullWidth
																				placeholder="Tìm kiếm người xin ý kiến..."
																				url={API_PROCESSING_RECEIVER}
																				queryParam="name"
																				optionLabel="name"
																				optionValue="id"
																				value={field.value}
																				onChange={field.onChange}
																				returnObject
																				isMulti
																				disabled={!isVTChoPhatHanh}
																				size="small"
																				limitTags={3}
																			/>
																		)}
																	/>
																</FadeInGridItem>
															)}
															{showAll && isVanThuCuc && (
																<Grid item xs={12} sm={6}>
																	<FormLabel>Nhóm xem văn bản</FormLabel>
																	<Controller
																		name="documentViewerGroups"
																		control={control}
																		render={({ field }) => (
																			<AsyncAutoComplete
																				fullWidth

																				placeholder="Tìm kiếm nhóm xem văn bản..."
																				url={`${API_GROUP_USERS_IN_DOCUMENT}/list-simple`}
																				queryParam="name"
																				optionLabel="name"
																				onChange={field.onChange}
																				optionValue="id"
																				value={field.value}
																				size="small"
																				isMulti
																				returnObject
																				unsetFontWeight
																				disabled={!isVTChoPhatHanh}
																				limitTags={3}
																			/>
																		)}
																	/>
																</Grid>
															)}
														</Grid>
													</>
												</Collapse>
											</SectionCard>
											{/* <StyledBoxContainerContent styledMarginTop> */}
											<SectionCard>
												<TabsHeaderContainer>
													<TabsWrapper>
														<StyledTabsContainerOutGoingDoc>
															<CustomTabsWithBadge
																tabs={tabConfigs.map((tab) => ({ label: tab.label }))}
																value={subTabValue}
																onChange={handleSubTabChange}
															/>
														</StyledTabsContainerOutGoingDoc>
													</TabsWrapper>
												</TabsHeaderContainer>
												<StyledSubTabGrid container spacing={2}>
													{activeSubTabKey === "draft" && (
														<>
															<StyledGrid item xs={12}>
																<UploadFile
																	value={draftFiles}
																	label="VĂN BẢN TRÌNH KÝ"
																	allowSignDigital={allowSignDigital}
																	allowSignInitial={allowSignInitial}
																	isView={dataDetail?.isPromulgate === true}
																	hiddenUploadAndScan
																	reloadDocDraft={reloadDocDraft}
																	objectId={documentId}
																	objectType="docDraft"
																	id="draftFiles-tab"
																	// canGiveNumber={canGiveNumber}
																	draftSymbol={watch("draftSymbol")}
																	documentDetail={documentDetail}
																	setReloadData={handleReloadAll}
																	editFile={dataDetail?.flags?.canEditFile}
																	canNotDeleteFile
																	setReloadDoc={setReloadDocDraft}
																	noneBorder
																	setFileDraft={setFileDraft}
																	titleButton="ĐỒNG Ý DỰ THẢO"
																	onButtonClick={handleOpenDialogDocDraft}
																	isOpen={isOpen.draft}
																	onToggle={handleToggleDraftSection}
																	hiddenPreview
																	hiddenTitle
																	hiddenToggleIcon
																	showSignatureIcon
																	hiddenBatchSign
																	triggerBatchSign={triggerBatchSignCount}
																	resetTriggerBatchSign={resetTriggerBatchSign}
																	onSigningStateChange={setIsSigningMultiple}
																	fetchOnMount={false}
																/>
															</StyledGrid>
															<StyledGrid item xs={12}>
																<UploadFile
																	value={attachmentFiles}
																	label={
																		<AttachedDocLabel>
																			VB ĐÍNH KÈM
																		</AttachedDocLabel>
																	}
																	isView
																	objectId={documentId}
																	objectType="docAttachments"
																	id="attachmentFiles-view"
																	// canGiveNumber={canGiveNumber}
																	draftSymbol={watch("draftSymbol")}
																	// documentDetail={documentDetail}
																	setReloadData={handleReloadAll}
																	editFile
																	hiddenUploadAndScan
																	canNotDeleteFile
																	// hiddenTitle
																	hiddenToggleIcon
																	noneBorder
																	showSignatureIcon
																	hiddenPreview
																	fetchOnMount={false}
																/>
															</StyledGrid>
														</>
													)}
													{activeSubTabKey === "recipientUnits" && (
														<StyledGrid item xs={12}>
															<ListOfRecipients documentDetail={documentDetail} />
														</StyledGrid>
													)}
													{activeSubTabKey === "draftVersion" && (
														<StyledGrid item xs={12}>
															<DraftVersionTable
																fetchApi={fetchDraftVersionsDocDraft}
																reload={reloadDocDraft}
																setIsOpen={setIsOpen}
																key={`2`}
																hiddenTitle
																hiddenToggleIcon
																noneBorder
																hiddenPreview
															/>
														</StyledGrid>
													)}
													{activeSubTabKey === "replyDocs" && repliedDocuments.length > 0 && (
														<JobProfileTableContainer item xs={12}>
															<CustomTable
																columns={[
																	{
																		name: "Số văn bản",
																		row: "toBook",
																		accessor: (row) => (
																			<div
																				onClick={createReplyViewDialogHandler(row?.documentId || row?._id)}
																			>
																				{row?.toBook}
																			</div>
																		),
																	},
																	{
																		name: "Ngày VB",
																		row: "documentDate",
																		accessor: (row) => (
																			<div
																				onClick={createReplyViewDialogHandler(row?.documentId || row?._id)}
																			>
																				{row?.documentDate}
																			</div>
																		),
																	},
																	{
																		name: "Trích yếu",
																		row: "abstractNote",
																		accessor: (row) => (
																			<div
																				onClick={createReplyViewDialogHandler(row?.documentId || row?._id)}
																			>
																				{row?.abstractNote}
																			</div>
																		),
																	},
																]}
																data={repliedDocuments}
																onlyTable
																disableCheckbox
																disableAct
																autoHeight
															/>
														</JobProfileTableContainer>
													)}
													{activeSubTabKey === "jobProfiles" && jobProfiles.length > 0 && (
														<JobProfileTableContainer item xs={12}>
															<CustomTable
																columns={jobProfileColumns}
																data={jobProfiles}
																onlyTable
																disableCheckbox
																disableAct
																rowKey="id"
																autoHeight
															/>
														</JobProfileTableContainer>
													)}
													{activeSubTabKey === "replacements" && replacedDocuments.length > 0 && (
														<JobProfileTableContainer item xs={12}>
															<CustomTable
																columns={[
																	{
																		name: "Số ký hiệu văn bản",
																		row: "toBookTextSymbols",
																		accessor: (row) => (
																			<div
																				onClick={createViewDialogHandler(row?.documentId || row?._id)}
																			>
																				{row?.toBookTextSymbols}
																			</div>
																		),
																	},
																	{
																		name: "Ngày ban hành",
																		row: "releaseDate",
																		accessor: (row) => (
																			<div
																				onClick={createViewDialogHandler(row?.documentId || row?._id)}
																			>
																				{row?.releaseDate}
																			</div>
																		),
																	},
																	{
																		name: "Trích yếu",
																		row: "abstractNote",
																		accessor: (row) => (
																			<div
																				onClick={createViewDialogHandler(row?.documentId || row?._id)}
																			>
																				{row?.abstractNote}
																			</div>
																		),
																	},
																	{
																		name: "File dự thảo",
																		row: "files",
																		accessor: (row) => {
																			const file =
																				row.files &&
																					Array.isArray(row.files) &&
																					row.files.length > 0
																					? row.files[0]
																					: null;
																			if (!file) return null;
																			return (
																				<StyledLink
																					component="button"
																					variant="body2"
																					onClick={createActionHandler(
																						handlePreview,
																						file
																					)}
																				>
																					{file.fileName}
																				</StyledLink>
																			);
																		},
																	},
																]}
																data={replacedDocuments}
																actions={dataDetail?.isPromulgate === true ? [] : repliedDocActions}
																onAction={handleReplacedDocAction}
																onlyTable
																disableCheckbox
																noneTitle
																autoHeight
															/>
														</JobProfileTableContainer>
													)}
												</StyledSubTabGrid>
											</SectionCard>
											{/* </StyledBoxContainerContent> */}
											<StyledBoxContainerContent styledMarginTop>
												<StyledGrid item xs={12}>
													<RecipientInfoTableOutGoing
														data={documentHistory?.steps || []}
														headerTitle="Thông tin luân chuyển"
														styledTextTransform="uppercase"
													/>
												</StyledGrid>
											</StyledBoxContainerContent>
										</StyledMainColumn>
										<StyledSidebarColumn item xs={12} md={4} isView>
											<StyledComment>
												<StyledCompactStyleBoxComent type="outgoing">
													<CustomComment
														documentId={documentId}
														comments={comments}
														type="outgoing"
														styledMaxHeightCommentListContainer="460px"
													/>
												</StyledCompactStyleBoxComent>
											</StyledComment>
										</StyledSidebarColumn>
									</StyledViewGridContainer>
								</StyledGridContainerInfo>
							</StyledGrid>
						</FormGridItem>
					</GeneralInfoGridContainer>
				</>


				{/* HTVB tờ trình */}

				<StyledDialog
					open={openDialog.CompleteProposal}
					onClose={handleCloseDialogCompleteProposal}
				>
					<StyledDialogContent>
						<StyledTypography align="center">
							<b>HOÀN THÀNH VĂN BẢN TỜ TRÌNH</b>
						</StyledTypography>
						<br />
						<Input
							label="Nội dung văn bản"
							multiline
							rows={5}
							value={note}
							onChange={handleChangeNote}
						/>
					</StyledDialogContent>
					<StyledDialogActions>
						<Button variant="primary" onClick={handleCompleteProposal}>
							Hoàn thành
						</Button>
						<Button variant="error" onClick={handleCloseDialogCompleteProposal}>
							Đóng
						</Button>
					</StyledDialogActions>
				</StyledDialog>

				<FileViewerDialog
					open={viewingFile.open}
					onClose={handleCloseFileViewer}
					fileUrl={viewingFile.url}
					fileName={viewingFile.name}
					fileType={viewingFile.type}
					title={`Xem file: ${viewingFile.name}`}
					verificationResult={verificationResult}
					showSignatureIcon
				/>
				{/* <LoadingDialog
					open={isLoadingDetail}
				>
					Đang tải dữ liệu bản ghi, vui lòng đợi...
				</LoadingDialog> */}
			</BaseSwipper>
			{/* Thu hồi xử lý Vb đi */}

			{/* ViewIncommingDoc cho Phúc đáp */}
			<ViewIncommingDoc
				open={openIncommingDocDetail}
				onClose={handleCloseIncommingDocDetail}
				documentId={selectedIncommingDocId}
				sharedComponents={sharedComponents}
				setReloadData={setReloadData}
			/>

			{/* ViewJobToDocument cho Hồ sơ công việc */}
			{selectedTask?.id && (
				<ViewJobToDocument
					open={openDetailModal}
					onClose={handleCloseModal}
					onSuccess={handleJobDetailSuccess}
					documentId={selectedTask.id}
					setReloadData={setReloadData}
				/>
			)}

			<CustomDialog
				open={recallProcessing}
				onClose={handleCloseRecallDialog}
				titleButton="Đồng ý"
				cancelButtonText="Hủy"
				onSave={handleRecall}
				titleAlign="center"
				title={
					<StyleGrid>
						<WarningIconStyled />
						THÔNG BÁO
					</StyleGrid>
				}
			>
				<>
					<b>{` Bạn có chắc chắn muốn thu hồi văn bản văn bản có trích yếu "${documentDetail?.document?.abstractNote || documentDetail?.abstractNote || documentDetail?.document?.extract || documentDetail?.extract || ""}"`}</b>
					<br />
					<br />
					<StyledTypography> Tác vụ này sẽ không thể hoàn tác</StyledTypography>
				</>
			</CustomDialog>

			{/* DigitalSignatureProposalPopup - View Only */}
			{
				(openStepDialog && selectedStep?.signerCount === "multi") && (
					<IsMultiSigner 
						key={stepKey}
						open={openStepDialog}
						onClose={handleCloseDialogStep}
						onCloseDialog={handleCloseDialogStep}
						label={selectedStep?.name || selectedStep?.title || "Đề xuất ký số"}
						actionCode={selectedStep?.lane || ""}
						targetRole={selectedStep?.lane || []}
						docId={documentId}
						dataDetail={documentDetail || dataDetail}
						sharedComponents={sharedComponents}
						getFormDataForUpdate={getFormDataForUpdate}
						onSelectUsers={handleSelectUsers}
						initialSelectedUsers={selectedUsersByStep[stepKey] || []}
						stepKey={stepKey}
						selectedStep={selectedStep}
						selectedTypeOfProcess={selectedTypeOfProcess}
						isUpdate
						multiSelect={selectedStep?.signerCount === "multi"}
					/>
				)}

			{
				(openStepDialog && (selectedStep?.signerCount !== "multi" || !selectedStep?.signerCount)) && (
					<DigitalSignatureProposalPopup
						key={stepKey}
						open={openStepDialog}
						onClose={handleCloseDialogStep}
						onCloseDialog={handleCloseDialogStep}
						label={selectedStep?.name || selectedStep?.title || "Đề xuất ký số"}
						actionCode={selectedStep?.lane || ""}
						targetRole={selectedStep?.lane || []}
						docId={documentId}
						dataDetail={documentDetail || dataDetail}
						sharedComponents={sharedComponents}
						getFormDataForUpdate={getFormDataForUpdate}
						onSelectUsers={handleSelectUsers}
						initialSelectedUsers={selectedUsersByStep[stepKey] || []}
						stepKey={stepKey}
						selectedStep={selectedStep}
						selectedTypeOfProcess={selectedTypeOfProcess}
						isUpdate
						multiSelect={selectedStep?.signerCount === "multi"}
					/>
				)}
			<DynamicExportDialog
				open={openDialogExport}
				onClose={handleCloseExport}
				documentId={documentId}
				typeDocument="OutGoingDocument"
				isAuthority={isAuthority}
			/>
			{openEditDialogFromView && (
				<EditDialog
					key={`edit-from-view-${documentId}`}
					open={openEditDialogFromView}
					onClose={handleCloseEditDialogFromView}
					onSuccess={handleEditSuccessFromView}
					documentId={documentId}
					documentType={documentType}
					isVanThuCuc={isVanThuCuc}
					setReloadData={setReloadData}
					isPendingPublishOrStamp={isPendingPublishOrStamp}
					disableRedirect
				/>
			)}
			<ForInformationLoadmoreDialog
				open={!!dialogOpenForInformationDialog}
				onClose={handleCloseDialog}
				onSave={handleSaveKnowReceivers}
				dialogKey={dialogOpenForInformationDialog}
				initialSelectedUnits={userByOrganizationUnits}
				maxLevel={4}
			/>
			<ReceivingUnitDialog
				open={!!dialogOpenFor}
				onClose={handleCloseDialog}
				onSave={handleSaveUnits}
				dialogKey={dialogOpenFor}
				initialSelectedUnits={
					dialogOpenFor === "internalReceivingDept"
						? [...internalReceivingDeptOldUnits, ...internalUnitUnits]
						: []
				}
				disabledInitialUnits={
					dialogOpenFor === "internalReceivingDept"
						? internalReceivingDeptOldUnits
						: []
				}
				control={control}
				maxLevel={4}
			/>
		</>
	);
};

ViewDialog.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	documentId: PropTypes.string,
	sharedComponents: PropTypes.object,
	isAuthority: PropTypes.bool,
};

export default withSharedComponents(ViewDialog);
