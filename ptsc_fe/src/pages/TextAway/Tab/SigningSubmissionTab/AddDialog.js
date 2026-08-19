import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  Grid,
  // Tooltip,
  Chip,
  Box,
  Typography,
  FormHelperText,
  Checkbox,
  FormControlLabel,
  // IconButton,
  CircularProgress,
  Link,
  // Stack,
} from "@mui/material";
// import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import CustomDialog from "@components/CustomDialog/CustomDialog";
// import ClearIcon from "@mui/icons-material/Clear";
import CustomTable from "@components/CustomTable/CustomTable";
import { useToast } from "@components/common/ToastProvider";
import { styled } from "@mui/material/styles";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import axiosInstance from "@utils/axiosInstance";
import { FileViewerDialog } from "@components/CustomDialog";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import ViewDialog from "./ViewDialog";
// import VanBanThuHoiTable from "@pages/TextAway/Tab/component/Vanbanthuhoi";
import withSharedComponents from "@components/WrapperComponent";
import { getComponentByKey } from "@builder-table/components/componentRegistry";
import { openDetailDialog } from "@components/GlobalDialogPortal";
import {
  ActionContainer,
  // SectionTitle,
  // SectionHeaderV2,
  // SectionGrid,
  // UploadIcon,
  // WarningContainer,
  // WarningIcon,
  // WarningText,
  StyledButton,
  // SectionHeader,
  // UploadSection,
  SelectionContainer,
  JobProfileTableContainer,
  // ClearAllButton,
} from "./componentStyle/AddDialog.style";
import ReceivingUnitDialog from "./ReceivingUnitDialog";
import {
  createSigningSubmissionPayload,
  getJobProfileColumns,
  getStepFromStatus,
  getUnitId,
  // pickMoreActions,
  signingSubmissionSchema,
} from "./constants";
import UploadFile from "@components/UploadFile";
import { apiUploadFile } from "@services/FileUpload/fileUpload";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import { Delete, Description } from "@mui/icons-material";
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
const ChipContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  gap: theme.spacing(0.5),
}));

const ChipInputContainer = styled("div", {
  shouldForwardProp: (prop) => prop !== "error",
})(({ theme, error }) => ({
  position: "relative",
  padding: "8px 14px",
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${error ? theme.palette.error.main : theme.palette.divider}`,
  minHeight: "25px",
  display: "flex",
  alignItems: "center",
  "&:hover": {
    borderColor: error ? theme.palette.error.main : theme.palette.text.primary,
  },
}));

// const InputLabel = styled(Typography)(({ theme }) => ({
//   position: "absolute",
//   top: "-0.7em",
//   left: "10px",
//   backgroundColor: theme.palette.background.paper, // Hoặc màu nền của dialog
//   padding: "0 4px",
//   fontSize: "0.75rem",
//   color: theme.palette.text.secondary, // Màu label mặc định
//   zIndex: 1, // Đảm bảo label luôn ở trên border
// }));

const PlaceholderTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

const FormLabel = styled(Typography)(({ theme }) => ({
	fontSize: "14px",
	fontWeight: 600,
	 color: theme.palette.text.primary,
	marginBottom: theme.spacing(0.5),
	display: "flex",
	alignItems: "center",
  textTransform: "uppercase",
}));

const CustomChip = styled(Chip)(({ theme }) => ({
  height: "24px",
  backgroundColor: theme.palette.action.hover,
  color: theme.palette.text.primary,
  border: `1px solid ${theme.palette.divider}`,
  // Thêm media query cho màn hình mobile
  [theme.breakpoints.down("md")]: {
    maxWidth: "calc(50vw - 40px)", // Giới hạn chiều rộng tối đa của chip
    "& .MuiChip-label": {
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
  },
}));


import {
  API_ADD_VANBANDI_DHVB,
  // API_DRAFT_SIGNER,
  API_GET_PROCESS_OUTGOING_DOCUMENT,
  API_PROCESSING_RECEIVER,
  API_RECEIVE_TO_KNOW,
  API_VIEW_FILE,
  APP_BASE,
  API_DRAFT_CREATE,
  API_DRAFT_DELETE,
  API_GET_LIST_UNIT,
  API_GET_LIST_USERS,
	API_GROUP_USERS_IN_DOCUMENT,
} from "@EnvironmentFile/constants/urlConfig";
import JobProfileSearchDialog from "./JobProfileSearchDialog";
import DocumentReplyDialog from "@pages/TextAway/Tab/component/DocumentReplyDialog"; // Import component mới
import DocumentRevocation from "@pages/TextAway/Tab/component/DocumentRevocation";
import CustomSwipper from "@components/Swipper/BaseSwiper";
// import { 
//   // StyledBoxContainerContent,
//   StyledContainerUploadFile,
// } from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";


import {StyledBoxContainerContent, SectionCard, MainSectionHeader, ClickableLink, FlexGrowBox, FooterActions} from "@styles/BaseSwiper/BaseSwiper.style";
import CustomButton from "@components/CustomButtonBorder";
// import { StyledIconKeyboardArrow } from "@styles/UploadFile/UploadFile.style";
// import {
//   KeyboardArrowDownIcon,
//   KeyboardArrowUpIcon,
// } from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/RecipientInfoTable.styles";
import SectionHeaderToggle from "@components/UploadFile/components/SectionHeaderToggle";
// import ForInformationDialog from "./ForInformationDialog";
import { 
  IconRequied, 
  // StyledStackActions, 
  StyledDocumentIcon 
} from "@styles/UploadFile/UploadFile.style";
import CustomStepper from "@components/CustomStepper/CustomSteppers";
import { getKanbanProcessProgress } from "@redux/slices/OutGoingDoc/OutGoingDocSlice";
import DigitalSignatureProposalPopup from "@components/CustomStepper/components/DigitalSignatureProposalPopup";
import ViewIncommingDoc from "@pages/IncomingDocumentManagement/components/ViewIncommingDoc";
import ViewJobToDocument from "@pages/WorkManagement/components/ViewJobToDocument";
import FormButton from "@components/FormButton";
import IsMultiSigner from "@components/CustomStepper/components/DigitalSignatureProposalPopup/IsMultiSigner";
import { API_USER } from "@EnvironmentFile/constants/ulrConfigNew";
import SignTypeCheckboxGroup from "./SignTypeCheckboxGroup";
import ForInformationLoadmoreDialog from "./ForInformationLoadmoreDialog";

const AddDialog = (props) => {
  const {
    open,
    onClose,
    onSuccess,
    sharedComponents,
    mode = "add",
    title, // Nhận title từ props
    documentType = 1,
    dataDetail,
    workItem,
    documentId,
    actionCode,
		incomingCreate = false,
		isVanThuCuc,
    isStamp: isStampProp,
		isPendingPublishOrStamp 
  } = props;
  const {
    // CustomSwipper,
    InputComponents,
    DatePicker,
    ButtonOutline,
    AsyncAutoCompletes,
    AsyncAutoComplete,
    Autocomplete
  } = sharedComponents;
  const documentDetail = dataDetail?.document ?? dataDetail;
  const stampQueryValue = useMemo(() => {
    if (isStampProp === null || isStampProp === undefined || isStampProp === "") {
      return null;
    }
    const normalized = String(isStampProp).trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return "true";
    if (normalized === "false" || normalized === "0" || normalized === "fasle") return "false";
    return null;
  }, [isStampProp]);
  const processOutgoingDocumentUrl = useMemo(() => {
    if (!stampQueryValue) return API_GET_PROCESS_OUTGOING_DOCUMENT;
    const separator = API_GET_PROCESS_OUTGOING_DOCUMENT.includes("?")
      ? "&"
      : "?";
    return `${API_GET_PROCESS_OUTGOING_DOCUMENT}${separator}isStamp=${stampQueryValue}`;
  }, [stampQueryValue]);

  const toast = useToast();
  const dispatch = useDispatch();                      
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [openStepDialog, setOpenStepDialog] = useState(false);
  const [selectedStep, setSelectedStep] = useState(null);
  const [documentStatus, setDocumentStatus] = useState(null); // Trạng thái văn bản
  const [uploadErrors, setUploadErrors] = useState({
    docDraft: false,
    docAttachments: false,
  });
  const [uploadingFiles, setUploadingFiles] = useState({
    docDraft: false,
    docAttachments: false,
  });

  const handleDraftUploadErrorChange = useCallback((hasError) => {
    setUploadErrors((prev) => ({ ...prev, docDraft: hasError }));
  }, []);

  const handleDraftSigningStateChange = useCallback((isUploading) => {
    setUploadingFiles((prev) => ({ ...prev, docDraft: isUploading }));
  }, []);

  const handleAttachmentUploadErrorChange = useCallback((hasError) => {
    setUploadErrors((prev) => ({ ...prev, docAttachments: hasError }));
  }, []);

  const handleAttachmentSigningStateChange = useCallback((isUploading) => {
    setUploadingFiles((prev) => ({ ...prev, docAttachments: isUploading }));
  }, []);
  const { crmSource } = useSelector((state) => state.config);
  const [drafterOptions, setDrafterOptions] = useState([]);

  const { dataUser: authUser } = useSelector((state) => state.auth || {});
  const parsedProfile = authUser || {};
  const userId = parsedProfile?.user?._id || parsedProfile?.user?.id; // lấy người dùng

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
    reset,
    // watch,
  } = useForm({
    // Cần cung cấp resolver và defaultValues ở đây
    resolver: yupResolver(signingSubmissionSchema),
    defaultValues: {
      // === CÁC TRƯỜNG CƠ BẢN ===
      draftingUnit: "", // Đơn vị soạn thảo (disabled, auto-fill)
      drafter: "", // Người soạn thảo (disabled, auto-fill)
      documentType: "", // Loại văn bản
      urgency: "", // Độ khẩn
      securityLevel: "", // Độ mật (b
      documentField: "", // Lĩnh vực

      // === NGƯỜI KÝ ===
      approver: "", // Người ký tờ trình (AsyncAutoComplete single)
      approverSymbol: "", // Ký hiệu tờ trình
      signer: "", // Người ký dự thảo (AsyncAutoComplete single)
      draftSymbol: "", // Ký hiệu dự thảo

      // === NƠI NHẬN (multiple) ===
      notifyUnit: [], // Nơi để nhận biết (AsyncAutoComplete multiple)
      processor: [], // Người nhận xử lý (AsyncAutoComplete multiple)

      // === ĐƠN VỊ NHẬN (dạng chip tự làm) ===
      internalDepartment: [], // Đơn vị nhận nội ngành → mảng ID
      externalDepartment: [], // Đơn vị nhận ngoại ngành → mảng ID
      internalReceivingDept: [], // Đơn vị nhận nội bộ → mảng ID
      internalReceivingDeptOld: [], // Đơn vị nhận nội bộ cũ
      knowReceivers: [], //Cá nhân nhận văn bản
      // === FILE UPLOAD ===
      // docProposal: [], // Văn bản tờ trình
      docDraft: [], // Văn bản dự thảo
      docAttachments: [], // Văn bản đính kèm

      // === CÁC TRƯỜNG KHÁC ===
      extract: "", // Trích yếu
      replyDeadline: null, // Hạn trả lời (DatePicker)
      reportSigner: [], // Người ký phát hành
			documentViewerGroups: [], // Nhóm người xem văn bản
			signatureType: "", // Loại ký (ký số, ký tay, ký mạng qs)
    },
  });

  const [draftingUnitOptions, setDraftingUnitOptions] = useState([]);
  // const [approverOptions, setApproverOptions] = useState([]);
  // const [, setSignerOptions] = useState([]);
  // const [signerOptions, setSignerOptions] = useState([]);
  const [, /*notifyUnitOptions*/ setNotifyUnitOptions] = useState([]);
  // const [processorOptions, setProcessorOptions] = useState([]);
  const [openDocumentReplyDialog, setOpenDocumentReplyDialog] = useState(false); // State để mở/đóng dialog phúc đáp
  const [openRecallDialog, setOpenRecallDialog] = useState(false);
  const [openReplaceDialog, setOpenReplaceDialog] = useState(false);

  const [viewingFile, setViewingFile] = useState({
    open: false,
    url: null,
    name: "",
    type: null,
  });
  const [recalledDocuments, setRecalledDocuments] = useState([]);
  const [replacedDocuments, setReplacedDocuments] = useState([]);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [viewDocumentId, setViewDocumentId] = useState(null);
  const [, setReloadData] = useState(null);
  const [draftDocumentData, setDraftDocumentData] = useState(null);
  const [newDocumentId, setNewDocumentId] = useState(null);

  const [openIncommingDocDetail, setOpenIncommingDocDetail] = useState(false);
  const [selectedIncommingDocId, setSelectedIncommingDocId] = useState(null);

  const resolvedDocumentId = useMemo(() => {
    return (
      draftDocumentData?.document?.documentId ||
      draftDocumentData?.documentId ||

      documentId ||
      newDocumentId ||
      dataDetail?.documentId ||
      dataDetail?._id ||
      null
    );
  }, [documentId, newDocumentId, draftDocumentData, dataDetail]);

  const luanChuyenAction = useMemo(() => {
    return draftDocumentData?.availableActions?.find(
      (action) => action.code === "LUAN_CHUYEN_VAN_BAN_DI"
    );
  }, [draftDocumentData]);

  const bodyUser = useMemo(() => {
    return {
      documentId: resolvedDocumentId,
      userId: userId,
      type: "feedback",
      roles: "BANLANHDAO",
      documentType: "outgoingdocument",
    };
  }, [resolvedDocumentId, userId]);

  const processorFieldKey = `processor-${resolvedDocumentId || "no-document-id"}`;

  // const bodyCommon = useMemo(() => {
  //   return {
  //     documentId:
  //       documentId ||
  //       draftDocumentData?.document?.documentId ||
  //       draftDocumentData?.documentId ||
  //       dataDetail?.documentId ||
  //       dataDetail?._id,
  //     userId: userId,
  //     documentType: "outgoingdocument",
  //   };
  // }, [documentId, draftDocumentData, dataDetail, userId]);

  const [isOpen, setIsOpen] = useState({
    replyDocuments: false,
    jobProfile: false,
    draftVersion: false,
    attachedDoc: false,
    attachedVersion: false,
    revocationDoc: false,
    replacementDoc: false,
    draft: false,
  });
  const [repliedDocuments, setRepliedDocuments] = useState([]); // State mới cho văn bản phúc đáp

  const memoizedInitialSelectedIds = useMemo(() => {
    const ids = new Set();
    const docId =
      documentDetail?.documentId || documentDetail?._id || documentDetail?.id;
    if (docId) {
      ids.add(docId);
    }
    repliedDocuments.forEach((doc) => {
      const id = doc.documentId || doc._id || doc.id;
      if (id) ids.add(id);
    });
    return Array.from(ids);
  }, [documentDetail, repliedDocuments]);

  const memoizedRepliedTableData = useMemo(() => {
    const docId =
      documentDetail?.documentId || documentDetail?._id || documentDetail?.id;
    const base = docId ? [documentDetail] : [];
    const additional = repliedDocuments.filter((d) => {
      const dId = d.documentId || d._id || d.id;
      return !base.some((b) => (b.documentId || b._id || b.id) === dId);
    });
    return [...base, ...additional];
  }, [documentDetail, repliedDocuments]);

  // Tính toán initialSelectedIds cho văn bản thay thế
  const memoizedReplacedInitialIds = useMemo(() => {
    return replacedDocuments.map((doc) => doc.id || doc.documentId).filter(Boolean);
  }, [replacedDocuments]);

  const [jobProfiles, setJobProfiles] = useState([]);
  const [openJobProfileSearch, setOpenJobProfileSearch] = useState(false);
  const [selectedTypeOfProcess, setSelectedTypeOfProcess] = useState(null);
  const [selectedUsersByStep, setSelectedUsersByStep] = useState({});
  const [reqSignFormatDraft, setReqSignFormatDraft] = useState(false);
  const [isStamp, setIsStamp] = useState(false);
  const { dataKanbanProcessProgress } = useSelector(
    (state) => state.outGoingDoc
  );

  // const isNotRequireUnit = useMemo(() => {
  //   if (!selectedTypeOfProcess) return false;
  //   const processKey = selectedTypeOfProcess.processKey || selectedTypeOfProcess.id;
  //   return processKey === "KY_SO_HS_K_DD" || processKey === "KY_SO_HS_VBD";
  // }, [selectedTypeOfProcess]);

  const urgencyOptions =
    crmSource.find((item) => item.code === "S20")?.data || [];
  // const optionTypeOfProcess =
  //   crmSource.find((item) => item.code === "S99ultra")?.data || [];
  // const securityLevelOptions =
  //   crmSource.find((item) => item.code === "S21")?.data || [];
  const documentTypeOptions =
    crmSource.find((item) => item.code === "S19")?.data || [];
  const fieldsOptions =
    crmSource.find((item) => item.code === "S26")?.data || [];

  const [dialogOpenFor, setDialogOpenFor] = useState(null);
  const [dialogOpenForInformationDialog, setDialogOpenForInformationDialog] =
    useState(null);
  const [internalDepartmentUnits, setInternalDepartmentUnits] = useState([]);
  const [externalDepartmentUnits, setExternalDepartmentUnits] = useState([]);
  const [internalUnitUnits, setInternalUnitUnits] = useState([]);
  const [internalReceivingDeptOldUnits, setInternalReceivingDeptOldUnits] =
    useState([]);
  const [userByOrganizationUnits, setUserByOrganizationUnits] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState({
    open: false,
    onConfirm: null,
    title: "",
    content: "",
  });
  const hasInitializedDraftRef = useRef(false);
  const [openJobDetailModal, setOpenJobDetailModal] = useState(false);
  const [selectedJobTask, setSelectedJobTask] = useState(null);

  const handleCloseConfirmDelete = useCallback(() => {
    setConfirmDelete({ open: false, onConfirm: null, title: "", content: "" });
  }, []);

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
    [toast]
  );
    const onError = (formErrors) => {
    // console.log("Form Validation Errors:", formErrors);
    
    // Nếu lỗi do chưa có file dự thảo
    if (formErrors.docDraft) {
      toast(formErrors.docDraft.message || "Vui lòng đính kèm file văn bản dự thảo!", "error");
    } 
    // Nếu lỗi ở các trường khác (Trích yếu, Ký hiệu...)
    else if (Object.keys(formErrors).length > 0) {
      toast("Vui lòng nhập đầy đủ các trường thông tin bắt buộc!", "warning");
    }
  };

  // const handleDownload = useCallback(
  //   async (file) => {
  //     if (!file || !file.fileId) {
  //       toast("File không hợp lệ hoặc không có ID.", "warning");
  //       return;
  //     }
  //     try {
  //       const response = await axiosInstance.get(
  //         `${APP_DHVB_BASE}/files/download/${file.fileId}`,
  //         { responseType: "blob" }
  //       );
  //       const blob = response;
  //       const url = window.URL.createObjectURL(blob);
  //       const link = document.createElement("a");
  //       link.href = url;
  //       link.setAttribute("download", file.fileName || "download");
  //       document.body.appendChild(link);
  //       link.click();
  //       link.parentNode.removeChild(link);
  //       window.URL.revokeObjectURL(url);
  //     } catch (error) {
  //       toast("Tải file thất bại.", "error");
  //     }
  //   },
  //   [toast]
  // );

  const handleCloseFileViewer = useCallback(() => {
    if (viewingFile.url) {
      URL.revokeObjectURL(viewingFile.url);
    }
    setViewingFile({ open: false, url: null, name: "", type: null });
  }, [viewingFile.url]);

  const createActionHandler = useCallback(
    (handler, file) => () => {
      handler(file);
    },
    []
  );

  const handleOpenViewDialog = useCallback((docId) => {
    if (!docId) return;
    setViewDocumentId(docId);
    setOpenViewDialog(true);
  }, []);

  const createViewDialogHandler = useCallback(
    (docId) => (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleOpenViewDialog(docId);
    },
    [handleOpenViewDialog]
  );

  const handleCloseViewDialog = useCallback(() => {
    setOpenViewDialog(false);
    setViewDocumentId(null);
  }, []);

  // Handler cho Phúc đáp - mở ViewIncommingDoc
  const createReplyViewDialogHandler = useCallback(
    (docId) => (e) => {
      e?.preventDefault();
      e?.stopPropagation();
      setSelectedIncommingDocId(docId);
      setOpenIncommingDocDetail(true);
    },
    []
  );

  // Handler đóng ViewIncommingDoc
  const handleCloseIncommingDocDetail = useCallback(() => {
    setOpenIncommingDocDetail(false);
    setSelectedIncommingDocId(null);
  }, []);

  // Hàm để mở/đóng dialog phúc đáp, được bọc trong useCallback để tối ưu

  const handleOpenReplyDialog = useCallback(() => {
    setOpenDocumentReplyDialog(true);
  }, []);

  const handleCloseReplyDialog = useCallback(() => {
    setOpenDocumentReplyDialog(false);
  }, []);

  // Hàm để xử lý khi lưu từ dialog phúc đáp
  const handleSaveReplyDocument = useCallback(
    (selectedDocs) => {
      // Lọc bỏ documentDetail khỏi danh sách chọn (vì nó được xử lý riêng)
      // để repliedDocuments chỉ chứa các văn bản được chọn thêm
      const baseId =
        documentDetail?.documentId || documentDetail?._id || documentDetail?.id;
      const additionalDocs = selectedDocs.filter(
        (doc) => (doc.documentId || doc._id) !== baseId
      );

      setRepliedDocuments(additionalDocs);
      setIsOpen((prev) => ({ ...prev, replyDocuments: true }));
    },
    [documentDetail]
  );

  // --- Văn bản thu hồi ---
  // const handleOpenRecallDialog = useCallback(
  //   () => setOpenRecallDialog(true),
  //   []
  // );
  const handleCloseRecallDialog = useCallback(
    () => setOpenRecallDialog(false),
    []
  );
  const handleSaveRecallDocument = useCallback((selectedDocs) => {
    setRecalledDocuments((prev) => [
      ...prev,
      ...selectedDocs.filter(
        (doc) => !prev.some((d) => d.documentId === doc.documentId)
      ),
    ]);
    setIsOpen(true);
  }, []);

  // --- Văn bản thay thế ---
  const handleOpenReplaceDialog = useCallback(
    () => setOpenReplaceDialog(true),
    []
  );
  const handleCloseReplaceDialog = useCallback(
    () => setOpenReplaceDialog(false),
    []
  );
  // const handleCloseViewDialog = useCallback(() => {
  //   setOpenViewDialog(false);
  //   setViewDocumentId(null);
  // }, []);
  const handleSaveReplaceDocument = useCallback(
		(selectedDocs = []) => {
			// Dialog đã giới hạn 1 item, nhưng vẫn "chốt" lại cho chắc:
			const picked = selectedDocs?.length
				? [selectedDocs[selectedDocs.length - 1]]
				: [];

			// 1) CHỈ GIỮ 1 VĂN BẢN THAY THẾ (replace, không append)
			setReplacedDocuments(picked);

			// 2) Re-calc lại "Đơn vị nhận cũ" theo đúng VB thay thế mới
			const deps = picked.flatMap((doc) => doc?.internalDepObj || []);

			// Dedup theo unitId
			const map = new Map();
			deps.forEach((u) => {
				const id = getUnitId(u);
				if (id) map.set(id, u);
			});
			const nextOldUnits = Array.from(map.values());

			setInternalReceivingDeptOldUnits(nextOldUnits);

			const oldIds = nextOldUnits.map(getUnitId).filter(Boolean);
			setValue("internalReceivingDeptOld", oldIds, { shouldValidate: true });

			// 3) internalReceivingDept = oldIds + (newUnits hiện tại, loại trùng)
			const newIds = (internalUnitUnits || [])
				.map(getUnitId)
				.filter(Boolean)
				.filter((id) => !oldIds.includes(id));

			setValue("internalReceivingDept", [...oldIds, ...newIds], {
				shouldValidate: true,
			});
		},
		[internalUnitUnits, setValue]
	);

  const handleDateChange = useCallback(
    (field) => (newDate) => {
      field.onChange(newDate ? dayjs(newDate).toISOString() : null);
    },
    []
  );

  // const handleOpenInternalDepartmentDialog = useCallback(() => {
  //   setDialogOpenFor("internalDepartment");
  // }, []);

  // const handleOpenExternalDepartmentDialog = useCallback(() => {
  //   setDialogOpenFor("externalDepartment");
  // }, []);

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

      // Trích xuất mảng chỉ chứa các _id để gửi trong payload, loại bỏ null/undefined
      const unitIds = units.map((unit) => unit._id).filter(Boolean);

      switch (dialogOpenFor) {
        case "internalDepartment":
          setInternalDepartmentUnits(units);
          setValue("internalDepartment", unitIds, { shouldValidate: true });
          break;
        case "externalDepartment":
          setExternalDepartmentUnits(units);
          setValue("externalDepartment", unitIds, { shouldValidate: true });
          break;
        case "internalReceivingDept": {
          // Lọc ra chỉ những đơn vị mới (không có trong đơn vị cũ)
          const oldUnitIds = internalReceivingDeptOldUnits
            .map((item) => getUnitId(item))
            .filter(Boolean);
          const newUnitsOnly = units.filter(
            (unit) => getUnitId(unit) && !oldUnitIds.includes(getUnitId(unit))
          );

          // Chỉ lưu đơn vị mới vào state để hiển thị
          setInternalUnitUnits(newUnitsOnly);

          // Nhưng khi setValue, phải bao gồm cả đơn vị cũ + đơn vị mới (loại bỏ null)
          // Lưu full objects
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

  const isSavedRef = useRef(false);

  // Xử lý xóa draft khi đóng mà chưa lưu
  const handleClose = useCallback(async () => {
    const draftId =
      draftDocumentData?.document?.documentId ||
      draftDocumentData?.document?.id;

    if (!isSavedRef.current && draftId) {
      try {
        await axiosInstance.delete(`${API_DRAFT_DELETE}/${draftId}`);
      } catch (error) {
        logger.error("Lỗi khi xóa draft:", error);
      }
    }
    onClose();
  }, [onClose, draftDocumentData]);

  // Theo dõi thay đổi documentStatus để cập nhật activeStep
  useEffect(() => {
    if (documentStatus) {
      const stepIndex = getStepFromStatus(documentStatus);
      setActiveStep(stepIndex);
    }
  }, [documentStatus]);

  // Reset documentStatus khi dialog đóng
  useEffect(() => {
    if (!open) {
      setDocumentStatus(null);
      setActiveStep(0);
    }
  }, [open]);

  useEffect(() => {
    if (!selectedTypeOfProcess) return;
    const processCode = Array.isArray(selectedTypeOfProcess)
      ? selectedTypeOfProcess?.[0]?.processKey
      : selectedTypeOfProcess?.processKey;
    dispatch(getKanbanProcessProgress({ processCode, isStamp }));
  }, [selectedTypeOfProcess, dispatch, isStamp]);

  const handleStampChange = useCallback(
    (event) => {
      const checked = event.target.checked;
      setIsStamp(checked);
    },
    []
  );

  // Auto-fill reportSigner từ selectedUsersByStep
  useEffect(() => {
    const reportSignerUsers = selectedUsersByStep.reportSigner;
    if (reportSignerUsers && reportSignerUsers.length > 0) {
      const signerIds = reportSignerUsers
        .map((user) => user.userId || user.id || user._id)
        .filter(Boolean);
      setValue("reportSigner", signerIds, { shouldValidate: true });
    }
  }, [selectedUsersByStep, setValue]);

	const sortedStepsData = useMemo(() => {
    if (
      !Array.isArray(dataKanbanProcessProgress) ||
      dataKanbanProcessProgress.length === 0
    ) {
      return [];
    }
    return [...dataKanbanProcessProgress].sort((a, b) => a.order - b.order);
  }, [dataKanbanProcessProgress]);


  const onUpdate = useCallback(async (data, isAutoSave = false) => {
    logger.log("onUpdate data", data);
    const { docDraft, docAttachments, ...formData } = data;
    delete formData.docProposal;

    // Lấy reportSigner từ selectedUsersByStep nếu có
    if (
      selectedUsersByStep.reportSigner &&
      selectedUsersByStep.reportSigner.length > 0
    ) {
      formData.reportSigner = selectedUsersByStep.reportSigner
        .map((user) => user.userId || user.id || user._id)
        .filter(Boolean);
    }

    // Merge internalReceivingDept với internalReceivingDeptOld
    /* Logic cũ - Comment lại
    const oldUnitIds = (formData.internalReceivingDeptOld || []).filter(
      Boolean
    );
    const newUnitIds = (formData.internalReceivingDept || []).filter(Boolean);
    */
    const oldUnitIds = (formData.internalReceivingDeptOld || [])
      .map((u) => (typeof u === "object" ? getUnitId(u) : u))
      .filter(Boolean);
    const newUnitIds = (formData.internalReceivingDept || [])
      .map((u) => (typeof u === "object" ? getUnitId(u) : u))
      .filter(Boolean);
    const allInternalReceivingDeptIds = [
      ...oldUnitIds,
      ...newUnitIds.filter((id) => !oldUnitIds.includes(id)),
    ];
    formData.internalReceivingDept = allInternalReceivingDeptIds;

    setIsLoading(true);

    // if (
    //   !data.internalReceivingDept ||
    //   data.internalReceivingDept?.length === 0
    // ) {
    //   toast("Bạn cần chọn ít nhất 1 người/đơn vị nhận.", "warning");
    //   setIsLoading(false);
    //   return null;
    // }
    if (!docDraft || docDraft.length === 0) {
      toast("Vui lòng đính kèm file dự thảo.", "warning");
      setIsLoading(false);
      return null;
    }
    const reportSignerStep = sortedStepsData.find(
      (step) => step?.action === "reportSigner"
    );
    const requiresReportSigner = Boolean(reportSignerStep);
    const skipLaneValue =
      reportSignerStep?.flag?.skipLane 
      
    const skipLane =
      skipLaneValue === true ||
      (typeof skipLaneValue === "string" &&
        skipLaneValue.toLowerCase() === "true");
    if (
      requiresReportSigner && !skipLane &&
      (!Array.isArray(formData.reportSigner) || formData.reportSigner.length === 0)
    ) {
      toast("Vui lòng chọn người ký phát hành.", "warning");
      setIsLoading(false);
      return null;
    }

    try {
      // Chuyển đổi selectedUsersByStep từ object arrays sang ID arrays
      const transformedUsersByStep = {};
      Object.keys(selectedUsersByStep).forEach((stepKey) => {
        const users = selectedUsersByStep[stepKey];
        if (Array.isArray(users) && users.length > 0) {
          transformedUsersByStep[stepKey] = users
            .map((user) => user.userId || user.id || user._id)
            .filter(Boolean);
        }
      });

      // Bước 1: Lấy ID của bản ghi dự thảo hiện tại
      const currentDraftId =
        draftDocumentData?.document?.id || draftDocumentData?.id || draftDocumentData?.document?.documentId;

      if (!currentDraftId) {
        throw new Error("Không tìm thấy ID dự thảo để cập nhật.");
      }
      const currentDraftDocumentId =
        draftDocumentData?.document?.documentId || draftDocumentData?.documentId;

      if (!currentDraftDocumentId) {
        throw new Error("Không tìm thấy ID dự thảo để cập nhật.");
      }

      const payload = createSigningSubmissionPayload(
        formData,
        repliedDocuments,
        recalledDocuments,
        replacedDocuments,
        documentType,
        jobProfiles,
        dataDetail,
        transformedUsersByStep,
        incomingCreate
      );

      if (currentDraftDocumentId) {
        payload.documentId = String(currentDraftDocumentId);
      }
      
      payload.isStamp = isStamp ? 1 : 0;
      // Nếu có hasStampOption thì reqSignFormatDraft đi theo checkbox isStamp
      // Nếu không có hasStampOption thì giữ nguyên theo flags ban đầu
      // if (draftDocumentData?.flags?.hasStampOption) {
      //   payload.reqSignFormatDraft = isStamp ? 1 : 0;
      // } else {
      //   payload.reqSignFormatDraft = reqSignFormatDraft ? 1 : 0;
      // }
      payload.reqSignFormatDraft = reqSignFormatDraft === true;
      
      await axiosInstance.put(`${API_ADD_VANBANDI_DHVB}/${currentDraftId}`, payload);


      const createdDocumentId = currentDraftDocumentId;
      setNewDocumentId(currentDraftDocumentId);
      isSavedRef.current = true;

      // Bước 2: Upload file
      let uploadHasFailed = false;
      const uploadedDocDraft = [...(docDraft || [])];
      const uploadedDocAttachments = [...(docAttachments || [])];

      const uploadFilesForType = async (filesList, objectType, updateList) => {
        if (!filesList || filesList.length === 0) return;
        for (let i = 0; i < filesList.length; i++) {
          const fileItem = filesList[i];
          if (fileItem.rawFile) {
            try {
              const resFile = await apiUploadFile(
                fileItem.rawFile,
                objectType,
                createdDocumentId
              );
              // Cập nhật file đã upload thành công
              updateList[i] = {
                ...fileItem,
                _id: resFile?.id || resFile?._id || fileItem._id,
                fileId: resFile?.id || resFile?._id || fileItem.fileId,
                id: resFile?.id || resFile?._id || fileItem.id,
                rawFile: null, // Đánh dấu đã upload thành công, không upload lại
                hasError: false,
              };
            } catch (err) {
              logger.error(
                `Lỗi upload file ${fileItem.name} cho ${objectType}:`,
                err
              );
              uploadHasFailed = true;
              updateList[i] = {
                ...fileItem,
                hasError: true,
              };
            }
          }
        }
      };

      // Thực hiện upload cho từng loại file
      await Promise.all([
        uploadFilesForType(docDraft, "docDraft", uploadedDocDraft),
        uploadFilesForType(docAttachments, "docAttachments", uploadedDocAttachments),
      ]);

      // Cập nhật lại form state để hiển thị đúng trạng thái các file
      setValue("docDraft", uploadedDocDraft);
      setValue("docAttachments", uploadedDocAttachments);

      if (uploadHasFailed) {
        toast("Có tệp đính kèm tải lên thất bại. Vui lòng tải lại các tệp lỗi trước khi thực hiện trình ký.", "error");
        setIsLoading(false);
        return null;
      }

      // Bước 3: Cập nhật documentStatus và work item
      setDocumentStatus("draft");
      let idWorkItem = documentDetail?.workItem?.id || workItem;
      
      if (dataDetail && documentId && idWorkItem) {
        const bodyWorkItem = {
          actionCode: actionCode,
          userId: userId,
        };

        try {
          const resWorkItem = await axiosInstance.post(
            `${APP_BASE}/api/work-items/${documentId}/${idWorkItem}/createdoc-draft`,
            bodyWorkItem
          );
          // Nếu API trả về work item mới, cần cập nhật để Trình ký sử dụng
          if (resWorkItem?.id) {
            idWorkItem = resWorkItem.id;
          }
        } catch (error) {
          logger.error("Lỗi khi tạo work item", error);
        }
      }
      
      if (!isAutoSave) {
        toast(mode === 'add' ? "Thêm mới dự thảo trình ký thành công!" : "Cập nhật dự thảo trình ký thành công!", "success");
        if (onSuccess) onSuccess();
        onClose();

        if (isPendingPublishOrStamp && !props.disableRedirect && createdDocumentId) {
          setTimeout(() => {
            const componentConfig = getComponentByKey("VIEW_OUTCOMING_PROMULGATE_DOC");
            if (componentConfig) {
              openDetailDialog(componentConfig, createdDocumentId);
            }
          }, 100);
        }
      }
      
      return { 
        documentId: createdDocumentId, 
        workItem: idWorkItem 
      };
    } catch (error) {
      let errorMessage = "Đã xảy ra lỗi khi lưu!";
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast(errorMessage, "error");
      return null;
    } finally {
      setIsLoading(false);
    }
	},
	// eslint-disable-next-line react-hooks/exhaustive-deps
	[ mode,
		selectedUsersByStep,
		repliedDocuments,
		recalledDocuments,
		replacedDocuments,
		documentType,
		jobProfiles,
		dataDetail,
		documentDetail,
		workItem,
		actionCode,
		userId,
		onSuccess,
		onClose,
		toast,
		documentId,
		draftDocumentData,
    sortedStepsData,
    reqSignFormatDraft,
		incomingCreate,
		isStamp
	]);
  const handleUpdate = handleSubmit((data) => onUpdate(data, false), onError);


  const getFormDataFromAddDialog = useCallback(async () => {
    if (mode === 'add') {
      const result = await onUpdate(getValues(), true ,mode);


      if (result) {
        return {
          isCreated: true,
          newDocId: result.documentId,
          newWorkItem: result.workItem,
          body: {}, 
          hasChanged: false
        };
      }
      return null;
    }
    return null;
  }, [mode, getValues, onUpdate]);



  // Call API_DRAFT_CREATE when dialog opens to get canSigningSubmission flag
  useEffect(() => {
    if (!open) {
      hasInitializedDraftRef.current = false;
      setUploadErrors({ docDraft: false, docAttachments: false });
      setUploadingFiles({ docDraft: false, docAttachments: false });
      return;
    }
    if (hasInitializedDraftRef.current) return;
    hasInitializedDraftRef.current = true;

    const createDraft = async () => {
      try {
        setIsLoading(true);
        
        // Fetch danh sách quy trình và tự động chọn quy trình đầu tiên
        let firstProcess = null;
        try {
          const processResponse = await axiosInstance.get(processOutgoingDocumentUrl);
          
          // axiosInstance đã unwrap response, nên data trực tiếp là processResponse
          const processList = Array.isArray(processResponse) 
            ? processResponse 
            : (processResponse?.data?.data || processResponse?.data);
          
          if (processList && processList.length > 0) {
            // Ưu tiên chọn "Quy trình soạn thảo - phát hành văn bản đi"
            firstProcess = processList.find(
              (p) => p.name === "Quy trình soạn thảo - phát hành văn bản đi"
            ) || processList[0];
            setValue("typeOfProcess", firstProcess, { shouldValidate: true });
            setSelectedTypeOfProcess(firstProcess);
          }
        } catch (error) {
          logger.error("Lỗi khi lấy danh sách quy trình:", error);
        }
        
        const payload = createSigningSubmissionPayload(
          { ...getValues(), typeOfProcess: firstProcess,incomingCreate : false  },
          repliedDocuments,
          recalledDocuments,
          replacedDocuments,
          documentType,
          jobProfiles,
          dataDetail,
          selectedUsersByStep,
          // incomingCreate
        );
        
        const response = await axiosInstance.post(API_DRAFT_CREATE, payload);
        if (response) {
          setDraftDocumentData(response);
          setReqSignFormatDraft(Boolean(response?.flags?.reqSignFormatDraft));
        }
      } catch (error) {
        logger.error("Lỗi khi tạo draft:", error);
        toast("Vui lòng kiểm tra lại cấu hình luồng.", "error");
      } finally {
        setIsLoading(false);
      }
    };

    createDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // const getOnDeleteHandlerForUnit = useCallback(
  //   (fieldName, unitIdToRemove) => {
  //     // const getUnitId = (unit) => unit._id ?? unit.id;

  //     return () => {
  //       switch (fieldName) {
  //         case "internalDepartment": {
  //           const updatedUnits = internalDepartmentUnits.filter(
  //             (unit) => getUnitId(unit) !== unitIdToRemove
  //           );
  //           const updatedUnitIds = updatedUnits.map((unit) => getUnitId(unit));
  //           setInternalDepartmentUnits(updatedUnits);
  //           setValue("internalDepartment", updatedUnitIds, {
  //             shouldValidate: true,
  //           });
  //           break;
  //         }
  //         case "externalDepartment": {
  //           const updatedUnits = externalDepartmentUnits.filter(
  //             (unit) => getUnitId(unit) !== unitIdToRemove
  //           );
  //           const updatedUnitIds = updatedUnits.map((unit) => getUnitId(unit));
  //           setExternalDepartmentUnits(updatedUnits);
  //           setValue("externalDepartment", updatedUnitIds, {
  //             shouldValidate: true,
  //           });
  //           break;
  //         }
  //         case "internalReceivingDept": {
  //           const updatedUnits = internalUnitUnits.filter(
  //             (unit) => getUnitId(unit) !== unitIdToRemove
  //           );
  //           const updatedUnitIds = updatedUnits.map((unit) => getUnitId(unit));
  //           setInternalUnitUnits(updatedUnits);
  //           setValue("internalReceivingDept", updatedUnitIds, {
  //             shouldValidate: true,
  //           });
  //           break;
  //         }
  //         case "internalReceivingDeptOld": {
  //           const updatedUnits = internalReceivingDeptOldUnits.filter(
  //             (unit) => getUnitId(unit) !== unitIdToRemove
  //           );
  //           const updatedUnitIds = updatedUnits.map((unit) => getUnitId(unit));
  //           setInternalReceivingDeptOldUnits(updatedUnits);
  //           setValue("internalReceivingDeptOld", updatedUnitIds, {
  //             shouldValidate: true,
  //           });
  //           break;
  //         }
  //         case "knowReceivers": {
  //           const updatedUnits = userByOrganizationUnits.filter(
  //             (unit) => getUnitId(unit) !== unitIdToRemove
  //           );
  //           const updatedUnitIds = updatedUnits.map((unit) => getUnitId(unit));
  //           setUserByOrganizationUnits(updatedUnits);
  //           setValue("knowReceivers", updatedUnitIds, { shouldValidate: true });
  //           break;
  //         }
  //         default:
  //           break;
  //       }
  //     };
  //   },
  //   [
  //     internalDepartmentUnits,
  //     externalDepartmentUnits,
  //     internalUnitUnits,
  //     internalReceivingDeptOldUnits,
  //     userByOrganizationUnits,
  //     setValue,
  //   ]
  // ); // Dependencies cho useCallback
  const handleOpenJobProfileSearch = () => setOpenJobProfileSearch(true);

  // const handleClearUnits = useCallback(
  //   (event) => {
  //     const fieldName = event.currentTarget.dataset.field;
  //     if (fieldName) {
  //       switch (fieldName) {
  //         case "internalDepartment":
  //           setInternalDepartmentUnits([]);
  //           break;
  //         case "externalDepartment":
  //           setExternalDepartmentUnits([]);
  //           break;
  //         case "internalReceivingDept":
  //           setInternalUnitUnits([]);
  //           break;
  //         case "internalReceivingDeptOld":
  //           setInternalReceivingDeptOldUnits([]);
  //           break;
  //         case "knowReceivers":
  //           setUserByOrganizationUnits([]);
  //           break;
  //       }
  //       setValue(fieldName, [], { shouldValidate: true });
  //     }
  //   },
  //   [setValue]
  // );
  const handleCloseJobProfileSearch = () => setOpenJobProfileSearch(false);

  const handleSaveJobProfiles = (selectedProfiles) => {
    // Thêm các hồ sơ mới vào danh sách hiện có, tránh trùng lặp
    setJobProfiles((prev) => [
      ...prev,
      ...selectedProfiles.filter((p) => !prev.some((e) => e.id === p.id)),
    ]);
    setIsOpen(true);
  };

  // useEffect(() => {
  //   const userDataString = localStorage.getItem("userData");
  //   if (!userDataString) return;

  //   try {
  //     const userData = JSON.parse(userDataString);
  //     const user = userData?.user && typeof userData.user === 'object' ? userData.user : userData;
  // console.log("User Data:", user); // Debugging line
  //     if (user?.parent?._id && user?._id) {
  //       const unit = { _id: user.parent._id, name: user.parent.name };
  //       console.log("Drafting Unit:", unit); // Debugging line
  //       const person = { _id: user._id, name: user.name };
  //       console.log("Drafter:", person); // Debugging line

  //       setDraftingUnitOptions([unit]);
  //       setDrafterOptions([person]);

  //       // Đảm bảo setValue sau khi state đã update
  //       setTimeout(() => {
  //         setValue("draftingUnit", unit._id, { shouldValidate: true });
  //         setValue("drafter", person._id, { shouldValidate: true });
  //       }, 100);
  //     }
  //   } catch (err) {
  //     console.error(err);
  //   }
  // }, [setValue]);

  useEffect(() => {
    reset(); // Reset form khi mở dialog
    // CHỈ chạy khi: dialog mở + là chế độ thêm mới
    if (!open || mode !== "add") return;

    if (!open || mode !== "add" || !authUser) return;

    let isMounted = true; // chống memory leak

    try {
      const user =
        authUser?.user && typeof authUser.user === "object"
          ? authUser.user
          : authUser;

			const getFirstValueOrDefault = (code, targetValue = "") => {
				const data = crmSource.find((item) => item.code === code)?.data || [];	
				if (targetValue !== undefined && targetValue !== null) {
					return (
						data.find((item) => item.value === targetValue)?.value ??
						data[0]?.value ?? ""
					);
				}
				return data[0]?.value ?? "";
			};

      if ((user?.grandParent?._id || user?.parent?._id) && user?._id) {
        const targetUnit = user.grandParent?._id ? user.grandParent : user.parent;
        const unit = {
          _id: targetUnit._id,
          name: targetUnit.name || targetUnit.organizationName,
        };
        const person = { _id: user._id, name: user.name || user.username };

        // Cập nhật options
        // if (isMounted) {
        //   setDraftingUnitOptions([unit]);
        //   setDrafterOptions([person]);

        //   // Đảm bảo setValue sau khi React đã render lại với options mới
        //   requestAnimationFrame(() => {
        //     if (isMounted) {
        //       const defaultFormValues = {
        //         draftingUnit: unit._id,
        //         drafter: person._id,
        //         documentType: getFirstValueOrDefault("S19"), // Loại văn bản
        //         urgency: getFirstValueOrDefault("S25"), // Độ khẩn
        //         securityLevel: getFirstValueOrDefault("S21"), // Sử dụng S21 cho Độ mật
        //         documentField: getFirstValueOrDefault("S26"),
        //         // typeOfProcess: getFirstValueOrDefault("S99ultra"),
        //       };


        if (isMounted) {
          setDraftingUnitOptions([unit]);
          setDrafterOptions([person]);

          // Auto-fill "Cá nhân nhận văn bản" với người soạn thảo (user đang đăng nhập)
          const currentUserId = user._id || user.id;
          const knowReceiverUser = { 
            id: currentUserId, 
            _id: currentUserId, 
            name: user.name || user.username, 
            types: "user" 
          };
          setUserByOrganizationUnits([knowReceiverUser]);

          // Đảm bảo setValue sau khi React đã render lại với options mới
          requestAnimationFrame(() => {
            if (isMounted) {
              const defaultFormValues = {
                draftingUnit: unit._id,
                drafter: person._id,
                knowReceivers: [knowReceiverUser], // Mặc định "Cá nhân nhận văn bản" = người đăng nhập
                // documentType: getFirstValueOrDefault("S19"), // Loại văn bản
                urgency: getFirstValueOrDefault("S20", "thng"), // Độ khẩn
                securityLevel: getFirstValueOrDefault("S21"), // Sử dụng S21 cho Độ mật
                documentField: getFirstValueOrDefault("S26"),
                // typeOfProcess: getFirstValueOrDefault("S99ultra"),
              };

              // Lọc ra các giá trị undefined để không ghi đè giá trị rỗng
              const filteredDefaults = Object.fromEntries(
                Object.entries(defaultFormValues).filter(
                  ([, v]) => v !== undefined
                )
              );

              reset(filteredDefaults);
            }
          });
        }
      }
    } catch (err) {
      logger.error("Lỗi parse userData:", err);
    }
    return () => {
      isMounted = false;
    }; // cleanup
  }, [
    open,
    mode,
    setValue,
    reset,
    crmSource,
    dataDetail,
    workItem,
    documentId,
    authUser,
    actionCode,
  ]);

  useEffect(() => {
    const fetchReceivers = async () => {
      try {
				const [
					notifyRes,
					// processorRes
				] = await Promise.all([
          axiosInstance.get(API_RECEIVE_TO_KNOW),
          axiosInstance.get(API_PROCESSING_RECEIVER),
        ]);
        if (notifyRes && Array.isArray(notifyRes)) {
          setNotifyUnitOptions(notifyRes);
        }
        // if (processorRes && Array.isArray(processorRes)) {
        //   setProcessorOptions(processorRes);
        // }
      } catch (error) {
        toast("Lỗi khi tải danh sách người nhận!", "error");
      }
    };
    if (open) fetchReceivers();
  }, [open, toast]);

  useEffect(() => {
    setIsOpen((prev) => ({
      ...prev,
      replyDocuments: repliedDocuments.length > 0,
      jobProfile: jobProfiles.length > 0,
      replacementDoc: replacedDocuments.length > 0,
      revocationDoc: recalledDocuments.length > 0,
    }));
  }, [repliedDocuments, jobProfiles, replacedDocuments, recalledDocuments]);

  const handleJobRowClick = useCallback(
    (job) => () => {
      setSelectedJobTask(job);
      setOpenJobDetailModal(true);
    },
    []
  );

  const handleCloseJobDetailModal = useCallback(() => {
    setOpenJobDetailModal(false);
    setSelectedJobTask(null);
  }, []);

  const handleJobDetailSuccess = useCallback(() => {
    if (setReloadData) {
      setReloadData(new Date().getTime());
    }
  }, [setReloadData]);

  const jobProfileColumns = useMemo(
    () => getJobProfileColumns(handleJobRowClick),
    [handleJobRowClick]
  );

  const handleDeleteJobProfile = useCallback((idToDelete) => {
    setJobProfiles((prev) => prev.filter((p) => p.id !== idToDelete));
  }, []);

  const handleJobProfileAction = useCallback(
    (action, row) => action.id === "delete" && handleDeleteJobProfile(row.id),
    [handleDeleteJobProfile]
  );

  const jobProfileActions = [
    {
      id: "delete",
      config: {
        icon: <Delete />,
        color: "error",
        actionType: "delete",
        displayName: "Xóa hồ sơ",
      },
    },
  ];

  // --- Cấu hình cho bảng Phúc đáp văn bản ---
  const repliedDocActions = [
    {
      id: "delete",
      config: {
        icon: <Delete />,
        color: "error",
        actionType: "delete",
        displayName: "Xóa văn bản",
      },
    },
  ];

  const handleRepliedDocAction = useCallback((action, row) => {
    if (action.id === "delete") {
      setConfirmDelete({
        open: true,
        onConfirm: () => {
          setRepliedDocuments((prev) =>
            prev.filter(
              (d) => (d.documentId || d._id) !== (row.documentId || row._id)
            )
          );
          setConfirmDelete({ open: false, onConfirm: null });
        },
        title: "Xác nhận xóa",
        content: "Bạn có chắc chắn muốn xóa văn bản phúc đáp này không?",
      });
    }
  }, []);

 const handleReplacedDocAction = useCallback(
	(action) => {
		 if (action.id === "delete") {
			 setConfirmDelete({
				 open: true,
				 onConfirm: () => {
					 // Xóa văn bản thay thế
					 setReplacedDocuments([]);

					 // Clear hoàn toàn "Đơn vị nhận cũ" (vì chỉ có 1 VB thay thế)
					 setInternalReceivingDeptOldUnits([]);
					 setValue("internalReceivingDeptOld", [], { shouldValidate: true });

					 // Cập nhật internalReceivingDept: chỉ giữ đơn vị mới
					 const newIds = (internalUnitUnits || [])
						 .map((u) => getUnitId(u))
						 .filter(Boolean);
					 setValue("internalReceivingDept", newIds, { shouldValidate: true });

					 setConfirmDelete({ open: false, onConfirm: null });
				 },
				 title: "Xác nhận xóa",
				 content: "Bạn có chắc chắn muốn xóa văn bản thay thế này không?",
			 });
		 }
	 },
	 [internalUnitUnits, setValue]
	);

  const toggleSection = useCallback((section) => {
    setIsOpen((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  const handleToggleOpen = useCallback((e) => {
    const key = e.currentTarget.dataset.section;
    toggleSection(key);
  }, [toggleSection]);

  const handleToggleDocDraft = useCallback(() => {
    toggleSection("docDraft");
  }, [toggleSection]);

  const handleToggleDocAttachments = useCallback(() => {
    toggleSection("docAttachments");
  }, [toggleSection]);

  // const handleMoreAction = useCallback((action, row) => {
  //   switch (action.id) {
  //     case "download": {
  //       const file =
  //         row?.files && Array.isArray(row.files) && row.files.length > 0
  //           ? row.files[0]
  //           : null;
  //       if (!file) return;
  //       createActionHandler(handleDownload, file)();
  //       break;
  //     }
  //     case "edit":
  //       logger.log("Edit", row);
  //       break;
  //     case "delete": {
  //       setConfirmDelete({
  //         open: true,
  //         onConfirm: () => {
  //           setReplacedDocuments((prev) =>
  //             prev.filter((d) => d.documentId !== row.documentId)
  //           );
  //           setConfirmDelete({ open: false, onConfirm: null });
  //         },
  //         title: "Xác nhận xóa",
  //         content: "Bạn có chắc chắn muốn xóa văn bản thay thế này không?",
  //       });
  //       break;
  //     }
  //     default:
  //       break;
  //   }
  // }, []);

  const isStepSelectable = useCallback((stepData) => {
    if (!stepData) return false;

    const currentLane = stepData?.currentLane;
    const signerRequiredRole = stepData?.signerRequiredRole || [];
    const isBlockedByRequiredRole =
      currentLane &&
      Array.isArray(signerRequiredRole) &&
      signerRequiredRole.includes(currentLane);

    return stepData?.canChoose === true && !isBlockedByRequiredRole;
  }, []);

  const handleStepChange = useCallback(
    (index) => {
      const stepData = sortedStepsData[index];

      if (!isStepSelectable(stepData)) {
        toast("Bước này chưa khả dụng để chọn người xử lý", "warning");
        return;
      }

      setSelectedStep(stepData);
      setOpenStepDialog(true);
    },
    [sortedStepsData, toast, isStepSelectable]
  );

  // const stepsFromApi = useMemo(() => {
  //   return sortedStepsData.map((item) => item.name || item.title || "");
  // }, [sortedStepsData]);
  const stepsFromApi = useMemo(() => {
    return sortedStepsData.map((item) => ({
			id: item.id,
			action: item.action,
			assigned: item.assigned,
      label: item.name || item.title || "",
      curWorkItem: item.curWorkItem,
      completed: item.completed,
    }));
  }, [sortedStepsData]);

  // Danh sách user được preselect khi mở popup Trình ký
  // = assigned users của bước sẽ được gửi đến (bước tiếp theo trong workflow)
  const activeStepPreselectedUsers = useMemo(() => {
    let targetIndex = -1;

    const normalizeStepUsers = (users) => {
      if (!Array.isArray(users) || users.length === 0) return [];
      return users
        .map((user) => {
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
    // → sẽ trình lên bước kế (index + 1)
    const caseAIdx = stepsFromApi.findIndex(
      (step) => step.curWorkItem === true && step.completed === false
    );
    if (caseAIdx !== -1 && caseAIdx < sortedStepsData.length - 1) {
      targetIndex = caseAIdx + 1;
    } else {
      // Case B: bước trước done, bước tiếp theo chưa bắt đầu
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

    // Fallback cho mode "add": document chưa tồn tại nên không có bước nào active
    // → luôn ở bước đầu tiên, gửi đến bước kế (index 1)
    if (targetIndex === -1 && sortedStepsData.length > 1) {
      targetIndex = 1;
    }

    if (targetIndex === -1) return [];

    let sourceUsers = [];
    for (let i = targetIndex; i < sortedStepsData.length; i += 1) {
      const step = sortedStepsData[i];

      const usersFromState = getUsersFromStateByStep(step);
      if (usersFromState.length > 0) {
        sourceUsers = usersFromState;
        break;
      }

      const usersFromApi = getUsersFromApiByStep(step);
      if (usersFromApi.length > 0) {
        sourceUsers = usersFromApi;
        break;
      }
    }

    if (sourceUsers.length === 0) return [];

    return sourceUsers;
  }, [stepsFromApi, sortedStepsData, selectedUsersByStep]);

  const disabledSteps = useMemo(() => {
    return sortedStepsData.reduce((acc, item, index) => {
      if (!isStepSelectable(item)) {
        acc[index] = true;
      }
      return acc;
    }, {});
  }, [sortedStepsData, isStepSelectable]);

  const handleCloseDialogStep = useCallback(() => {
    setOpenStepDialog(false);
  }, []);

  // Stable handler to avoid inline function for "Loại quy trình"
  const handleTypeOfProcessChange = useCallback(
    async (value) => {
      setValue("typeOfProcess", value, { shouldValidate: true });
      setSelectedTypeOfProcess(value);
      setSelectedUsersByStep({});
      setValue("reportSigner", [], { shouldValidate: true });
      setReqSignFormatDraft(false);
      setIsStamp(true);

      if (value) {
        try {
          setIsLoading(true);
          // Khi đổi quy trình, luôn reset người xử lý theo step để tránh giữ dữ liệu quy trình cũ
          const transformedUsers = {};
          Object.keys(selectedUsersByStep).forEach((step) => {
            transformedUsers[step] = selectedUsersByStep[step]
              .map((user) => user.userId || user.id || user._id)
              .filter(Boolean);
          });
          
          const payload = createSigningSubmissionPayload(
            { ...getValues(), typeOfProcess: value,incomingCreate : false },
            repliedDocuments,
            recalledDocuments,
            replacedDocuments,
            documentType,
            jobProfiles,
            dataDetail,
            transformedUsers,
            // incomingCreate
          );
          const initialDocId =
            draftDocumentData?.document?.documentId
          if (initialDocId) {
            payload.documentId = String(initialDocId);
          }
          payload.reqSignFormatDraft = false;

          const response = await axiosInstance.post(API_DRAFT_CREATE, payload);
          if (response) {
            setDraftDocumentData(response);
            setReqSignFormatDraft(Boolean(response?.flags?.reqSignFormatDraft));
          }
        } catch (error) {
          logger.error("Lỗi khi call API_DRAFT_CREATE:", error);
          toast("Vui lòng kiểm tra lại cấu hình.", "error");
        } finally {
          setIsLoading(false);
        }
      }
    },
    [
      setValue,
      setSelectedTypeOfProcess,
      getValues,
      repliedDocuments,
      recalledDocuments,
      replacedDocuments,
      documentType,
      jobProfiles,
      dataDetail,
      selectedUsersByStep,
      draftDocumentData,
      toast
    ]
  );

  const stepKey = useMemo(() => {
    return (
      selectedStep?.action ||
      selectedStep?.lane ||
      selectedStep?.name ||
      selectedStep?.title ||
      "default"
    );
  }, [selectedStep]);

  const refreshDraftDetailForActions = useCallback(
    async () => {
      try {
        const currentDocumentId =
          draftDocumentData?.document?.documentId ||
          draftDocumentData?.documentId ||
          resolvedDocumentId;

        if (!currentDocumentId) {
          return;
        }

        const response = await axiosInstance.get(
          `${API_ADD_VANBANDI_DHVB}/${currentDocumentId}`
        );
        if (response) {
          setDraftDocumentData(response);
          setReqSignFormatDraft(Boolean(response?.flags?.reqSignFormatDraft));
        }
      } catch (error) {
        logger.error(
          "Lỗi khi refresh chi tiết dự thảo sau cập nhật người ký:",
          error
        );
      }
    },
    [
      draftDocumentData,
      resolvedDocumentId,
    ]
  );

  const handleSelectUsers = useCallback(
    async (users) => {
      const nextUsers = Array.isArray(users) ? users : [];
      const nextSelectedUsersByStep = {
        ...selectedUsersByStep,
        [stepKey]: nextUsers,
      };

      setSelectedUsersByStep(nextSelectedUsersByStep);

      // Nếu stepKey là reportSigner, tự động fill vào form
      if (stepKey === "reportSigner" && nextUsers.length > 0) {
        const signerIds = nextUsers
          .map((user) => user.userId || user.id || user._id)
          .filter(Boolean);
        setValue("reportSigner", signerIds, { shouldValidate: true });
      }

      await refreshDraftDetailForActions();
    },
    [stepKey, setValue, selectedUsersByStep, refreshDraftDetailForActions]
  );

  return (
    <CustomSwipper
      title={title || "Thêm mới dự thảo văn bản trình ký"}
      open={open}
      onClose={handleClose}
      onSave={handleUpdate}
      type="add"
      hideBackdrop
      isLoading={isLoading}
      footer={
        <>
        <FlexGrowBox />
        <FooterActions>
        
          {luanChuyenAction && (
            <FormButton
              dataDetail={{
                ...draftDocumentData,
                availableActions: [luanChuyenAction],
                flags: {
                  ...(draftDocumentData?.flags || {}),
                  canDocumentFlowTransfer: true,
                },
              }}
              setReloadData={setReloadData}
              onClose={handleClose}
              mode={mode}
              getFormDataForUpdate={getFormDataFromAddDialog}
              selectedUsersByStep={selectedUsersByStep}
              disabled={isLoading || uploadingFiles.docDraft || uploadingFiles.docAttachments}
              noWrapper
							initialPreselectedUsers={activeStepPreselectedUsers}
              hasUploadError={uploadErrors.docDraft || uploadErrors.docAttachments}
              isUploadingFiles={uploadingFiles.docDraft || uploadingFiles.docAttachments}
            />
          )}
          {draftDocumentData?.flags?.canSigningSubmission && (
            <FormButton
              dataDetail={draftDocumentData}
              setReloadData={setReloadData}
              onClose={handleClose}
              mode={mode}
              getFormDataForUpdate={getFormDataFromAddDialog}
              selectedUsersByStep={selectedUsersByStep}
              initialPreselectedUsers={activeStepPreselectedUsers}
              disabled={isLoading || uploadingFiles.docDraft || uploadingFiles.docAttachments}
              noWrapper
              hasUploadError={uploadErrors.docDraft || uploadErrors.docAttachments}
              isUploadingFiles={uploadingFiles.docDraft || uploadingFiles.docAttachments}
            />
          )}
          <ButtonOutline
            onClick={handleUpdate}
            disabled={isLoading}
            variant="outlined"
          >
            LƯU
          </ButtonOutline>
        </FooterActions>
      </>
      }
    >
      <StyledBoxContainerContent>
        {/* Stepper Section */}
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

        {/* Thông tin chung */}
        <SectionCard>
          {/* <SectionHeaderWrapper>
            <HeaderIconBox>
              <Description />
            </HeaderIconBox>
            <Typography>Thông tin chung</Typography>
          </SectionHeaderWrapper> */}
          <Grid container spacing={2}>
              {/* Loại quy trình */}
          <Grid item xs={12} sm={6} md={4}>
						<FormLabel>
							Loại quy trình <IconRequied component="span">*</IconRequied>
						</FormLabel>
            <Controller
              name="typeOfProcess"
              control={control}
              render={({ field }) => (
                <AsyncAutoCompletes
                  fullWidth
                  placeholder="Chọn loại quy trình..."
                  required
                  {...field}
                  url={processOutgoingDocumentUrl}
                  queryParam="name"
                  optionLabel="name"
                  optionValue="id"
                  onChange={handleTypeOfProcessChange}
                  error={!!errors.typeOfProcess}
                  helperText={errors.typeOfProcess?.message}
									returnObject
									disableClearable
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
						<FormLabel>
							Đơn vị soạn thảo <IconRequied component="span">*</IconRequied>
						</FormLabel>
            <Controller
              name="draftingUnit"
              control={control}
              render={({ field }) => (
                <InputComponents
                  select
                  options={draftingUnitOptions}
                  customLabel="name"
                  customValue="_id"
                  placeholder="Nhập dữ liệu..."
                  {...field}
                  error={!!errors.draftingUnit}
                  helperText={errors.draftingUnit?.message}
                  disabled
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
						<FormLabel>
							Người soạn thảo <IconRequied component="span">*</IconRequied>
						</FormLabel>
            <Controller
              name="drafter"
              control={control}
              render={({ field }) => (
                <InputComponents
                  select
                  options={drafterOptions}
                  customLabel="name"
                  customValue="_id"
                  placeholder="Nhập dữ liệu..."
                  {...field}
                  error={!!errors.drafter}
                  helperText={errors.drafter?.message}
                  disabled
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
						<FormLabel>
							Loại văn bản <IconRequied component="span">*</IconRequied>
						</FormLabel>
            <Controller
              name="documentType"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  placeholder="Nhập dữ liệu..."
                  options={documentTypeOptions}
                  labelKey="title"
                  valueKey="value"
                  {...field}
                  error={!!errors.documentType}
                  helperText={errors.documentType?.message}
                  required
                />
              )}
            />
          </Grid>
            <Grid item xs={12} sm={6} md={4}>
						<FormLabel>Lĩnh vực</FormLabel>
            <Controller
              name="documentField"
              control={control}
              render={({ field }) => (
                <InputComponents
                  select
                  placeholder="Nhập dữ liệu..."
                  options={fieldsOptions}
                  customLabel="title"
                  customValue="value"
                  {...field}
                  error={!!errors.documentField}
                  helperText={errors.documentField?.message}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
						<FormLabel>Độ khẩn</FormLabel>
            <Controller
              name="urgency"
              control={control}
              render={({ field }) => (
                <InputComponents
                  select
                  placeholder="Nhập dữ liệu..."
                  options={urgencyOptions}
                  customLabel="title"
                  customValue="value"
                  {...field}
                  error={!!errors.urgency}
                  helperText={errors.urgency?.message}
                />
              )}
            />
          </Grid>

        
        

          {/* Người ký phát hành */}
          {/* <Grid item xs={12} sm={6} md={4}>
            <Controller
              name="reportSigner"
              control={control}
              // key={`approver-${approverOptions.length}-${open}`}
              render={({ field, fieldState: { error } }) => (
                <AsyncAutoCompletes
                  fullWidth
                  label="Người ký phát hành"
                  placeholder="Chọn người ký..."
                  required
                  {...field}
                  url={API_DRAFT_SIGNER}
                  // url={API_APPROVE_SIGNER}
                  queryParam="name"
                  optionLabel="name"
                  optionValue="_id"
                  error={!!error}
                  helperText={error?.message}
                  returnObject={false}
                />
              )}
            />
          </Grid> */}

          {/* Ký hiệu văn bản dự thảo */}
          <Grid item xs={12} sm={6} md={4}>
						<FormLabel>Ký hiệu văn bản dự thảo</FormLabel>
            <Controller
              name="draftSymbol"
              control={control}
              render={({ field }) => (
                <InputComponents
                  placeholder="Nhập dữ liệu..."
                  {...field}
                  error={!!errors.draftSymbol}
                  helperText={errors.draftSymbol?.message}
                />
              )}
            />
          </Grid>
          {/* <Grid item xs={12} sm={6} md={4}>
            <Controller
              name="notifyUnit"
              control={control}
              render={({ field }) => (
                <InputComponents
                  select
                  multiple
                  fullWidth
                  label="Người nhận xử lý" // Giữ lại userOptions nếu trường này vẫn dùng API cũ
                  options={processorOptions} // Thay bằng processorOptions
                  customLabel="name"
                  customValue="id"
                  placeholder="Tìm kiếm"
                  {...field}
                  error={!!errors.processor}
                  helperText={errors.processor?.message}
                />
              )}
            />
          </Grid> */}

          {/* Hạn trả lời */}
          <Grid item xs={12} sm={6} md={4}>
						<FormLabel>Hạn trả lời</FormLabel>
            <Controller
              name="replyDeadline"
              control={control}
              render={({ field }) => (
                <DatePicker
                  value={field.value ? dayjs(field.value) : null}
                  onChange={handleDateChange(field)}
                  error={!!errors.replyDeadline}
                  helperText={errors.replyDeadline?.message}
                  minDate={dayjs()}
                />
              )}
            />
          </Grid>

					{isVanThuCuc && !draftDocumentData?.flags?.hasStampOption && (
						<Grid item xs={12} sm={6} md={4}>
							<FormLabel>&nbsp;</FormLabel> {/* Label trống để căn hàng */}
            	<Controller
            	  name="signatureType"
            	  control={control}
            	  render={({ field }) => (
            	    <SignTypeCheckboxGroup
            	      value={field.value}
            	      onChange={field.onChange}
            	    />
            	  )}
            	/>
          	</Grid>
					)}
          {
            draftDocumentData?.flags?.hasStampOption && (
              <Grid item xs={12} sm={6} md={4}>
                <FormLabel>&nbsp;</FormLabel> 
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isStamp}
                      onChange={handleStampChange}
                      size="small"
                    />
                  }
                  label="Đóng dấu"
                />
              </Grid>
            )
          }

          {/* Trích yếu */}
          <Grid item xs={12} sm={12}>
						<FormLabel>
							Trích yếu nội dung <IconRequied component="span">*</IconRequied>
						</FormLabel>
            <Controller
              name="extract"
              control={control}
              render={({ field }) => (
                <InputComponents
                  placeholder="Nhập dữ liệu..."
                  {...field}
                  error={!!errors.extract}
                  helperText={errors.extract?.message}
                  required
                  multiline
                  rows={3}
                />
              )}
            />
          </Grid>
        </Grid>

        <SelectionContainer container spacing={2}>
          {/* <Grid item xs={12}>
            <WarningContainer>
              {internalUnitUnits &&
                internalUnitUnits.length === 0 &&
                (!watch("processor") || watch("processor").length === 0) && (
                <>
                  <WarningIcon />
                  <WarningText>
                    Bạn cần chọn ít nhất 1 người/đơn vị nhận
                  </WarningText>
                </>
              )}
            </WarningContainer>
          </Grid> */}
          {/* Đơn vị nhận nội bộ */}
          <Grid item xs={12} sm={12} md={6}>
						<FormLabel>
							Đơn vị nhận 
							{/* <IconRequied component="span">*</IconRequied> */}
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
                      limitTags={3}
                    />
                  </FlexGrowBox>
                )}
                
              />
              <StyledButton onClick={handleOpenInternalUnitDialog}>
                CHỌN
              </StyledButton>
            </ActionContainer>
          </Grid>

          <Grid item xs={12} sm={12} md={6}>
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
                      limitTags={3}
                    />
                  </FlexGrowBox>
                )}
              />
              <StyledButton onClick={handleOpenForInformationDialog}>
                CHỌN
              </StyledButton>
            </ActionContainer>
          </Grid>
          {/* Đơn vị nhận cũ */}
          {replacedDocuments.length > 0 && (
            <Grid item xs={12}>
							<FormLabel>
								Đơn vị nhận cũ <IconRequied component="span">*</IconRequied>
							</FormLabel>
                      <ActionContainer>
                        <Controller
                          name="internalReceivingDeptOld"
                          control={control}
                          render={({ field }) => (
                            <FlexGrowBox>
                              <ChipInputContainer
                                error={!!errors.internalReceivingDeptOld}
                              >
                                {internalReceivingDeptOldUnits.length > 0 ? (
                                  <>
                                    <ChipContainer>
                                      {internalReceivingDeptOldUnits.map((unit) => (
                                        <CustomChip
                                          key={getUnitId(unit)}
                                          label={unit.name}
                                          // onDelete={getOnDeleteHandlerForUnit(
                                          //   "internalReceivingDeptOld",
                                          //   getUnitId(unit)
                                          // )}
                                          size="small"
                                        />
                                      ))}
                                    </ChipContainer>
                                    {/* <ClearAllButton
                                      size="small"
                                      data-field="internalReceivingDeptOld"
                                      onClick={handleClearUnits}
                                    >
                                      <ClearIcon />
                                    </ClearAllButton> */}
                                  </>
                                ) : (
                                  <PlaceholderTypography variant="body1">
                                    Tìm kiếm
                                  </PlaceholderTypography>
                                )}
                              </ChipInputContainer>
                              {errors.internalReceivingDeptOld && (
                                <FormHelperText error>
                                  {errors.internalReceivingDeptOld.message}
                                </FormHelperText>
                              )}
                              <input
                                type="hidden"
                                {...field}
                                value={JSON.stringify(
                                  internalReceivingDeptOldUnits.map((u) => getUnitId(u))
                                )}
                              />
                            </FlexGrowBox>
                          )}
                        />
                      </ActionContainer>
                    </Grid>
                  )}
          <Grid item xs={12} sm={isVanThuCuc ? 6 : 12}>
						<FormLabel>Xin ý kiến</FormLabel>
            <Controller
              name="processor"
              control={control}
              render={({ field }) => (
                <AsyncAutoComplete
                  key={processorFieldKey}
                  fullWidth
                  placeholder="Tìm kiếm người xin ý kiến..."
                  url={API_USER}
                  method="POST"
                  queryParam="keySearch"
                  body={bodyUser}
                  optionLabel="name"
                  optionValue="id"
                  value={field.value}
                  onChange={field.onChange}
                  returnObject
                  error={!!errors.processor}
                  helperText={errors.processor?.message}
                  isMulti
                  size="small"
                  limitTags={3}
                />
              )}
            />
					</Grid>
					{isVanThuCuc && (
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
										optionValue="id"
										value={field.value}
										onChange={field.onChange}
										error={!!errors.documentViewerGroups}
										helperText={errors.documentViewerGroups?.message}
										size="small"
										isMulti
										returnObject={false}
										unsetFontWeight
                    limitTags={3}
									/>
						    )}
						  />
						</Grid>
					)}
        </SelectionContainer>
      </SectionCard>

      {/* Tài liệu & hồ sơ liên quan Section */}
      <MainSectionHeader>
        <Description />
        <Typography>Tài liệu & hồ sơ liên quan</Typography>
      </MainSectionHeader>

      {/* VĂN BẢN DỰ THẢO */}
      <SectionCard>
        <Controller
          name="docDraft"
          control={control}
          defaultValue={[]}
          render={({ field, fieldState }) => (
            <UploadFile
              {...field}
              label="VĂN BẢN TRÌNH KÝ"
              manualUpload
              objectId={newDocumentId}
              objectType="docDraft"
              id="docDraft-upload"
              editFile
              isRequired
              hiddenPreview
              hiddenDownload
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
              useSecondaryLayout
              isCollapsible
              isOpen={isOpen.docDraft}
              onToggle={handleToggleDocDraft}
              onUploadErrorChange={handleDraftUploadErrorChange}
              onSigningStateChange={handleDraftSigningStateChange}
            />
          )}
        />
      </SectionCard>

      {/* VĂN BẢN ĐÍNH KÈM */}
      <SectionCard>
        <Controller
          name="docAttachments"
          control={control}
          defaultValue={[]}
          render={({ field }) => (
            <UploadFile
              {...field}
              label="VĂN BẢN ĐÍNH KÈM"
              manualUpload
              objectId={newDocumentId}
              objectType="docAttachments"
              id="docAttachments-upload"
              editFile
              useSecondaryLayout
              hiddenDownload
              isCollapsible
              isOpen={isOpen.docAttachments}
              onToggle={handleToggleDocAttachments}
              onUploadErrorChange={handleAttachmentUploadErrorChange}
              onSigningStateChange={handleAttachmentSigningStateChange}
            />
          )}
        />
      </SectionCard>

      {/* Phúc đáp văn bản */}
      <SectionCard>
        <SectionHeaderToggle
          title="PHÚC ĐÁP VĂN BẢN"
          isOpen={isOpen.replyDocuments}
          dataSection={"replyDocuments"}
          onClick={handleToggleOpen}
          useSecondaryLayout
          icon={
            <StyledDocumentIcon>
              <DescriptionOutlinedIcon />
            </StyledDocumentIcon>
          }
        >
          {isOpen.replyDocuments && (
            <CustomButton
              component="label"
              variant="outlined"
              size="small"
              onClick={handleOpenReplyDialog}
              disabled={isLoading}
              startIcon={
                isLoading ? (
                  <CircularProgress size={20} />
                ) : (
                  <UploadRoundedIcon />
                )
              }
            >
              Chọn
            </CustomButton>
          )}
        </SectionHeaderToggle>

        <DocumentReplyDialog
          open={openDocumentReplyDialog}
          onClose={handleCloseReplyDialog}
          onSave={handleSaveReplyDocument}
          sharedComponents={sharedComponents}
          initialSelectedIds={memoizedInitialSelectedIds}
        />
        {/* Bảng hiển thị các văn bản phúc đáp đã chọn */}
        {isOpen.replyDocuments &&
          (repliedDocuments.length > 0 ||
            memoizedRepliedTableData.length > 0) && (
            <JobProfileTableContainer container mt={1}>
              <Grid item xs={12}>
                <CustomTable
                  columns={[
                    {
                      name: "Số văn bản",
                      row: "toBook",
                      accessor: (row) => (
                        <ClickableLink
                          onClick={createReplyViewDialogHandler(
                            row.documentId || row._id
                          )}
                        >
                          {row.toBook}
                        </ClickableLink>
                      ),
                    },
                    {
                      name: "Ngày VB",
                      row: "documentDate",
                      accessor: (row) => (
                        <ClickableLink
                          onClick={createReplyViewDialogHandler(
                            row.documentId || row._id
                          )}
                        >
                          {row.documentDate}
                        </ClickableLink>
                      ),
                    },
                    {
                      name: "Trích yếu",
                      row: "abstractNote",
                      accessor: (row) => (
                        <ClickableLink
                          onClick={createReplyViewDialogHandler(
                            row.documentId || row._id
                          )}
                        >
                          {row.abstractNote}
                        </ClickableLink>
                      ),
                    },
                  ]}
                  data={memoizedRepliedTableData}
                  actions={repliedDocActions}
                  onAction={handleRepliedDocAction}
                  onlyTable
                  disableCheckbox
                  autoHeight
                />
              </Grid>
            </JobProfileTableContainer>
          )}
      </SectionCard>

      {/* CÔNG VIỆC ĐÍNH KÈM */}
      <SectionCard>
        <SectionHeaderToggle
          title="CÔNG VIỆC ĐÍNH KÈM"
          isOpen={isOpen.jobProfile}
          dataSection={"jobProfile"}
          onClick={handleToggleOpen}
          useSecondaryLayout
          icon={
            <StyledDocumentIcon>
              <DescriptionOutlinedIcon />
            </StyledDocumentIcon>
          }
        >
          {isOpen.jobProfile && (
            <CustomButton
              component="label"
              variant="outlined"
              size="small"
              onClick={handleOpenJobProfileSearch}
              disabled={isLoading}
              startIcon={
                isLoading ? (
                  <CircularProgress size={20} />
                ) : (
                  <UploadRoundedIcon />
                )
              }
            >
              Chọn
            </CustomButton>
          )}
        </SectionHeaderToggle>

        {isOpen.jobProfile && jobProfiles.length > 0 && (
          <JobProfileTableContainer container mt={1}>
            <Grid item xs={12}>
              <CustomTable
                columns={jobProfileColumns}
                data={jobProfiles}
                actions={jobProfileActions}
                codeModule={null}
                onAction={handleJobProfileAction}
                onlyTable
                disableCheckbox
                autoHeight
              />
            </Grid>
          </JobProfileTableContainer>
        )}
      </SectionCard>

      {/* VĂN BẢN THAY THẾ */}
      <SectionCard>
        <SectionHeaderToggle
          title="VĂN BẢN THAY THẾ (NẾU CÓ)"
          isOpen={isOpen.replacementDoc}
          dataSection={"replacementDoc"}
          onClick={handleToggleOpen}
          useSecondaryLayout
          icon={
            <StyledDocumentIcon>
              <DescriptionOutlinedIcon />
            </StyledDocumentIcon>
          }
        >
          {isOpen.replacementDoc && (
            <CustomButton
              component="label"
              variant="outlined"
              size="small"
              onClick={handleOpenReplaceDialog}
              disabled={isLoading}
              startIcon={
                isLoading ? (
                  <CircularProgress size={20} />
                ) : (
                  <UploadRoundedIcon />
                )
              }
            >
              Chọn
            </CustomButton>
          )}
        </SectionHeaderToggle>

        {isOpen.replacementDoc && replacedDocuments.length > 0 && (
          <JobProfileTableContainer container mt={1}>
            <Grid item xs={12}>
              <CustomTable
                columns={[
                  {
                    name: "Số ký hiệu văn bản",
                    row: "toBookTextSymbols",
                    accessor: (row) => (
                      <ClickableLink
                        onClick={createViewDialogHandler(
                          row.documentId || row._id
                        )}
                      >
                        {row.toBookTextSymbols}
                      </ClickableLink>
                    ),
                  },
                  {
                    name: "Ngày bàn hành",
                    row: "releaseDate",
                    accessor: (row) => (
                      <ClickableLink
                        onClick={createViewDialogHandler(
                          row.documentId || row._id
                        )}
                      >
                        {row.releaseDate}
                      </ClickableLink>
                    ),
                  },
                  {
                    name: "Trích yếu",
                    row: "abstractNote",
                    accessor: (row) => (
                      <ClickableLink
                        onClick={createViewDialogHandler(
                          row.documentId || row._id
                        )}
                      >
                        {row.abstractNote}
                      </ClickableLink>
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
                        <Link
                          component="button"
                          variant="body2"
                          onClick={createActionHandler(handlePreview, file)}
                        >
                          {file.fileName}
                        </Link>
                      );
                    },
                  },
                ]}
                data={replacedDocuments}
                actions={repliedDocActions}
                onAction={handleReplacedDocAction}
                onlyTable
                disableCheckbox
                autoHeight
              />
            </Grid>
          </JobProfileTableContainer>
        )}
      </SectionCard>
  </StyledBoxContainerContent>

      {selectedJobTask?.id && (
        <ViewJobToDocument
          open={openJobDetailModal}
          onClose={handleCloseJobDetailModal}
          onSuccess={handleJobDetailSuccess}
          documentId={selectedJobTask.id}
          setReloadData={setReloadData}
        />
      )}

      {/* <ForInformationDialog
        open={!!dialogOpenForInformationDialog}
        onClose={handleCloseDialog}
        onSave={handleSaveKnowReceivers}
        dialogKey={dialogOpenForInformationDialog}
        initialSelectedUnits={userByOrganizationUnits}
      /> */}
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
            : dialogOpenFor === "internalDepartment"
              ? internalDepartmentUnits
              : externalDepartmentUnits
        }
        disabledInitialUnits={
          dialogOpenFor === "internalReceivingDept"
            ? internalReceivingDeptOldUnits
            : []
        }
        control={control}
        maxLevel={4}
      />
      {/* Dialog Tìm kiếm hồ sơ công việc */}
      <JobProfileSearchDialog
        open={openJobProfileSearch}
        onClose={handleCloseJobProfileSearch}
        onSave={handleSaveJobProfiles}
        isNotCallApiWithSave
      />
      {/* Dialog cho Văn bản thu hồi */}
      <DocumentRevocation
        open={openRecallDialog}
        onClose={handleCloseRecallDialog}
        onSave={handleSaveRecallDocument}
        sharedComponents={sharedComponents}
        initialSelectedIds={recalledDocuments.map((doc) => doc.documentId)}
      />
      {/* Dialog cho Văn bản thay thế */}
      <DocumentRevocation
        open={openReplaceDialog}
        onClose={handleCloseReplaceDialog}
        onSave={handleSaveReplaceDocument}
        sharedComponents={sharedComponents}
        initialSelectedIds={memoizedReplacedInitialIds}
        bpmnVersion={selectedTypeOfProcess?.name || selectedTypeOfProcess?.processKey}
      />

      {/* ViewIncommingDoc cho Phúc đáp */}
      <ViewIncommingDoc
        open={openIncommingDocDetail}
        onClose={handleCloseIncommingDocDetail}
        documentId={selectedIncommingDocId}
        sharedComponents={sharedComponents}
        setReloadData={setReloadData}
      />

      <ViewDialog
        open={openViewDialog}
        documentId={viewDocumentId}
        onClose={handleCloseViewDialog}
        setReloadData={setReloadData}
      />

      <FileViewerDialog
        open={viewingFile.open}
        onClose={handleCloseFileViewer}
        fileUrl={viewingFile.url}
        fileName={viewingFile.name}
        fileType={viewingFile.type}
        title={`Xem file: ${viewingFile.name}`}
      />

      <CustomDialog
        open={confirmDelete.open}
        onClose={handleCloseConfirmDelete}
        onSave={confirmDelete.onConfirm}
        title={confirmDelete.title}
        type="delete"
        disableSave={false}
      >
        <Typography>{confirmDelete.content}</Typography>
      </CustomDialog>

      {/* ViewIncommingDoc for reply documents */}
      <ViewIncommingDoc
        open={openIncommingDocDetail}
        onClose={handleCloseIncommingDocDetail}
        documentId={selectedIncommingDocId}
        sharedComponents={sharedComponents}
        setReloadData={setReloadData}
      />

      {/* <CustomDialog
        open={openStepDialog}
        onClose={handleCloseDialogStep}
        fullWidth
        title={selectedStep?.name || selectedStep?.title || "Chi tiết bước"}
        type="delete"
      /> */}
      {(openStepDialog && selectedStep?.signerCount === "multi") && (
          <IsMultiSigner
            key={stepKey}
            open={openStepDialog}
            onClose={handleCloseDialogStep}
            onCloseDialog={handleCloseDialogStep}
            label={selectedStep?.name || selectedStep?.title || "Đề xuất ký số"}
            actionCode={selectedStep?.lane || ""}
            targetRole={selectedStep?.lane || []}
            docId={resolvedDocumentId || documentId}
            dataDetail={draftDocumentData || dataDetail}
            // sharedComponents={sharedComponents}
            // getFormDataForUpdate={getFormDataForUpdate}
            onSelectUsers={handleSelectUsers}
            initialSelectedUsers={selectedUsersByStep[stepKey] || []}
            stepKey={stepKey}
            selectedStep={selectedStep}
            selectedTypeOfProcess={selectedTypeOfProcess}
            isUpdate
            multiSelect={selectedStep?.signerCount === "multi"}
          />
        )
			}
      {(openStepDialog && (selectedStep?.signerCount !== "multi" || !selectedStep?.signerCount)) && (
          <DigitalSignatureProposalPopup
        		key={stepKey}
        		open={openStepDialog}
        		onClose={handleCloseDialogStep}
        		onCloseDialog={handleCloseDialogStep}
        		label={selectedStep?.name || selectedStep?.title || "Đề xuất ký số"}
        		actionCode={selectedStep?.lane || ""}
        		targetRole={selectedStep?.lane || []}
        		docId={resolvedDocumentId || documentId}
          dataDetail={draftDocumentData || dataDetail}
        		// sharedComponents={sharedComponents}
        		// getFormDataForUpdate={getFormDataForUpdate}
        		onSelectUsers={handleSelectUsers}
        		initialSelectedUsers={selectedUsersByStep[stepKey] || []}
        		stepKey={stepKey}
        		selectedStep={selectedStep}
        		selectedTypeOfProcess={selectedTypeOfProcess}
        		isUpdate
        		multiSelect={selectedStep?.signerCount === "multi"}
      		/>
        )
      }
      
    </CustomSwipper>
  );
};

AddDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  isLoading: PropTypes.bool,
  sharedComponents: PropTypes.object,
  mode: PropTypes.string,
  title: PropTypes.string,
  documentType: PropTypes.number,
  incomingCreate: PropTypes.bool,
  isStamp: PropTypes.oneOfType([PropTypes.bool, PropTypes.string, PropTypes.number]),
};

export default withSharedComponents(AddDialog);
