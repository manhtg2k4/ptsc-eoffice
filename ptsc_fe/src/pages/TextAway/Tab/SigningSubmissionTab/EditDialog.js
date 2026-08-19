import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useDispatch, useSelector } from "react-redux";
import axiosInstance from "@utils/axiosInstance";
import {
  Box,
  Chip,
  CircularProgress,
  FormHelperText,
  Grid,
  IconButton,
  // Link,
  Tooltip,
  Typography,
   Checkbox,
  FormControlLabel,
} from "@mui/material";
import { FileViewerDialog } from "@components/CustomDialog";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import { useToast } from "@components/common/ToastProvider";
import { getComponentByKey } from "@builder-table/components/componentRegistry";
import { openDetailDialog } from "@components/GlobalDialogPortal";
import { styled } from "@mui/material/styles";
import {
  createSigningSubmissionPayload,
  editDigningSubmissionSchema,
  getJobProfileColumns,
  getStepFromStatus,
  getUnitId,
  // signingSubmissionSchema,
} from "./constants";
import {
  // RemoveRedEyeOutlined as ViewIcon,
  GetApp as DownloadIcon,
  Delete,
	Description,
	// Info,
} from "@mui/icons-material";
// import VanBanThuHoiTable from "@pages/TextAway/Tab/component/Vanbanthuhoi";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import DocumentReplyDialog from "@pages/TextAway/Tab/component/DocumentReplyDialog";
import DocumentRevocation from "@pages/TextAway/Tab/component/DocumentRevocation";
import JobProfileSearchDialog from "./JobProfileSearchDialog";
import CustomTable from "@components/CustomTable/CustomTable";
import withSharedComponents from "@components/WrapperComponent";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import {
  ActionContainer,
  // SectionTitle,
  // SectionHeaderV2,
  // SectionGrid,
  // UploadIcon,
  // SectionHeader,
  // WarningContainer,
  // WarningIcon,
  // WarningText,
  StyledButton,
  // UploadSection,
  SelectionContainer,
  JobProfileTableContainer,
  // ClearAllButton,
} from "./componentStyle/AddDialog.style";
// import { API_GET_LIST_USERS, API_ADD_VANBANDI_DHVB } from "@EnvironmentFile/constants/urlConfig";
import {
  API_PROCESSING_RECEIVER,
  API_RECEIVE_TO_KNOW,
  API_ADD_VANBANDI_DHVB,
  APP_BASE,
  API_VIEW_FILE,
  APP_DHVB_BASE,
  API_GET_PROCESS_OUTGOING_DOCUMENT,
	API_GROUP_USERS_IN_DOCUMENT,
	API_GET_LIST_USERS,
	API_GET_LIST_UNIT,
  API_CHECK_STAMP_BUTTON
} from "@EnvironmentFile/constants/urlConfig";
import { API_USER } from "@EnvironmentFile/constants/ulrConfigNew";
import ReceivingUnitDialog from "./ReceivingUnitDialog";
import UploadFile from "@components/UploadFile"; // Import UploadFile
// import { ClearIcon } from "@mui/x-date-pickers";
import { getDataListUnit } from "@redux/slices/managementUsersSlice";
import { 
	StyledBoxContainerContent, 
	SectionCard, 
	MainSectionHeader, 
	ClickableLink, 
  FormLabel,
  FlexGrowBox,
  FooterActions
	// FlexGrowBox 
} from "@styles/BaseSwiper/BaseSwiper.style";
// import { StyledIconKeyboardArrow } from "@styles/UploadFile/UploadFile.style";
// import { StyledIconKeyboardArrow } from "@styles/UploadFile/UploadFile.style";
// import {
//   KeyboardArrowDownIcon,
//   KeyboardArrowUpIcon,
// } from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/RecipientInfoTable.styles";
import CustomButton from "@components/CustomButtonBorder";
import SectionHeaderToggle from "@components/UploadFile/components/SectionHeaderToggle";
// import ForInformationDialog from "./ForInformationDialog";
import {
  getKanbanProcessProgress,
} from "@redux/slices/OutGoingDoc/OutGoingDocSlice";
import { 
	IconRequied, 
	// StyledStackActions, 
	StyledDocumentIcon 
} from "@styles/UploadFile/UploadFile.style";
import FormButton from "@components/FormButton";
import CustomStepper from "@components/CustomStepper/CustomSteppers";
import DigitalSignatureProposalPopup from "@components/CustomStepper/components/DigitalSignatureProposalPopup";
import ViewDialog from "./ViewDialog";
import ViewIncommingDoc from "@pages/IncomingDocumentManagement/components/ViewIncommingDoc";
import ViewJobToDocument from "@pages/WorkManagement/components/ViewJobToDocument";
import IsMultiSigner from "@components/CustomStepper/components/DigitalSignatureProposalPopup/IsMultiSigner";
import SignTypeCheckboxGroup from "./SignTypeCheckboxGroup";
import ForInformationLoadmoreDialog from "./ForInformationLoadmoreDialog";

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

const InputLabel = styled(Typography)(({ theme }) => ({
  position: "absolute",
  top: "-0.7em",
  left: "10px",
  backgroundColor: theme.palette.background.paper, // Hoặc màu nền của dialog
  padding: "0 4px",
  fontSize: "0.75rem",
  color: theme.palette.text.secondary, // Màu label mặc định
  zIndex: 1, // Đảm bảo label luôn ở trên border
}));

const StyledActionIconButton = styled(IconButton)(({ theme }) => ({
  padding: theme.spacing(0.5),
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

// const StyledViewIcon = styled(ViewIcon)(({ theme }) => ({
//   color: theme.palette.primary.main,
// }));

const StyledDownloadIcon = styled(DownloadIcon)(({ theme }) => ({
  color: theme.palette.success.main,
}));

const PlaceholderTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

const CustomChip = styled(Chip)(({ theme }) => ({
  height: "24px",
  backgroundColor: theme.palette.action.hover, // Nền màu xám từ theme
  color: theme.palette.text.primary, // Chữ màu đen từ theme
  border: `1px solid ${theme.palette.divider}`,
}));

const getValue = (value) => {
  if (value == null) return "";
  if (typeof value === "object")
    return value.value || value.id || value._id || "";
  return value;
};

const getObjectOrNull = (value) => {
  return value && typeof value === "object" ? value : null;
};

const toIdArray = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        return item?.userId || item?.id || item?._id;
      })
      .filter(Boolean);
  }

  if (typeof value === "string") return [value];

  if (value && typeof value === "object") {
    const id = value.userId || value.id || value._id;
    return id ? [id] : [];
  }

  return [];
};

const EditDialog = (props) => {
	const {
  open,
  onClose,
  onSuccess,
  isLoading,
  documentId,
  title, // Nhận title từ props
  documentType = 1,
  sharedComponents,
	setReloadData,
	isVanThuCuc,
	isPendingPublishOrStamp 
} = props;
  const {
    // CustomSwipper,
    BaseSwipper,
    InputComponents,
    DatePicker,
    ButtonOutline,
		AsyncAutoCompletes,
		AsyncAutoComplete,
    // AsyncAutoCompletes,
	} = sharedComponents;
	
  const toast = useToast();
  const dispatch = useDispatch();
  const dialogFieldRef = useRef(null);
  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    getValues,
    watch,
  } = useForm({
    resolver: yupResolver(editDigningSubmissionSchema),
    defaultValues: {},
  });
const [showStampOption, setShowStampOption] = useState(false);
const [isStamp, setIsStamp] = useState(false);
  const { crmSource } = useSelector((state) => state.config);
  const { dataUser: currentUser } = useSelector((state) => state.auth || {});
  // const { dataReportSigner } = useSelector((state) => state.outGoingDoc);
  const { dataKanbanProcessProgress } = useSelector(
    (state) => state.outGoingDoc
  );
  // const { listUnit } = useSelector((state) => state.unit); // <-- Lấy danh sách đơn vị từ Redux
  const [drafterOptions, setDrafterOptions] = useState([]);
  const [draftingUnitOptions, setDraftingUnitOptions] = useState([]);
  // const [signerOptions, setSignerOptions] = useState([]);
  // const [notifyUnitOptions, setNotifyUnitOptions] = useState([]);
  // const [processorOptions, setProcessorOptions] = useState([]);
  const [userByOrganizationUnits, setUserByOrganizationUnits] = useState([]);
  const [openDocumentReplyDialog, setOpenDocumentReplyDialog] = useState(false);
  const [openRecallDialog, setOpenRecallDialog] = useState(false);
  const [openReplaceDialog, setOpenReplaceDialog] = useState(false);
  const [dialogOpenForInformationDialog, setDialogOpenForInformationDialog] =
    useState(null);
  const [recordId, setRecordId] = useState(null); // State mới để lưu `id` của bản ghi
  const [repliedDocuments, setRepliedDocuments] = useState([]);
  const [documentDetails, setDocumentDetails] = useState(null); // State để lưu chi tiết văn bản
  const [recalledDocuments, setRecalledDocuments] = useState([]);
  const [replacedDocuments, setReplacedDocuments] = useState([]);
  const [jobProfiles, setJobProfiles] = useState([]);
  const [openJobProfileSearch, setOpenJobProfileSearch] = useState(false);
  const [dataDetail, setDataDetail] = useState(null);
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
  const [internalDepartmentUnits, setInternalDepartmentUnits] = useState([]);
  const [externalDepartmentUnits, setExternalDepartmentUnits] = useState([]);
  const [internalUnitUnits, setInternalUnitUnits] = useState([]);
  const [dialogOpenFor, setDialogOpenFor] = useState(null);
  const [viewingFile, setViewingFile] = useState({
    open: false,
    url: null,
    name: "",
    type: null,
  });
  const [confirmDelete, setConfirmDelete] = useState({
    open: false,
    onConfirm: null,
    title: "",
    content: "",
  });

  const [isOpen, setIsOpen] = useState({
    replyDocuments: false,
    jobProfile: false,
    revocationDoc: false,
    replacementDoc: false,
    draftFiles: true,
    attachmentFiles: true,
  });

  const [activeStep, setActiveStep] = useState(0);
  const [openStepDialog, setOpenStepDialog] = useState(false);
  const [selectedStep, setSelectedStep] = useState(null);
  const [internalReceivingDeptOldUnits, setInternalReceivingDeptOldUnits] =
    useState([]);
  const [selectedTypeOfProcess, setSelectedTypeOfProcess] = useState(null);
	const [selectedUsersByStep, setSelectedUsersByStep] = useState({});
	const [openViewDialog, setOpenViewDialog] = useState(false);
	const [viewDocumentId, setViewDocumentId] = useState(null);

	const [openIncommingDocDetail, setOpenIncommingDocDetail] = useState(false);
	const [selectedIncommingDocId, setSelectedIncommingDocId] = useState(null);

  // State cho ViewJobToDocument
  const [openJobDetailModal, setOpenJobDetailModal] = useState(false);
  const [selectedJobTask, setSelectedJobTask] = useState(null);
  const [uploadErrors, setUploadErrors] = useState({
    draftFiles: false,
    attachmentFiles: false,
  });
  const [uploadingFiles, setUploadingFiles] = useState({
    draftFiles: false,
    attachmentFiles: false,
  });

  const handleDraftUploadErrorChange = useCallback((hasError) => {
    setUploadErrors((prev) => ({ ...prev, draftFiles: hasError }));
  }, []);

  const handleDraftSigningStateChange = useCallback((isUploading) => {
    setUploadingFiles((prev) => ({ ...prev, draftFiles: isUploading }));
  }, []);

  const handleAttachmentUploadErrorChange = useCallback((hasError) => {
    setUploadErrors((prev) => ({ ...prev, attachmentFiles: hasError }));
  }, []);

  const handleAttachmentSigningStateChange = useCallback((isUploading) => {
    setUploadingFiles((prev) => ({ ...prev, attachmentFiles: isUploading }));
  }, []);

  const draftFiles = watch("draftFiles");
  const attachmentFiles = watch("attachmentFiles");

  const hasUploadError = useMemo(() => {
    const isFileError = (file) => {
      if (!file) return false;
      if (file.hasError === true) return true;
      const status = String(file.status || file.uploadStatus || file.upload_status || "").trim().toLowerCase();
      return ["failed", "upload error", "rejected", "timeout", "error"].includes(status);
    };
    const draftList = draftFiles || [];
    const attachmentList = attachmentFiles || [];
    return draftList.some(isFileError) || attachmentList.some(isFileError);
  }, [draftFiles, attachmentFiles]);
  const bodyUser = useMemo(() => {
    return {
      documentId: documentId || dataDetail?.documentId || dataDetail?._id,
      userId: currentUser?._id || currentUser?.id,
      type: "feedback",
      roles: "BANLANHDAO",
      documentType: "outgoingdocument",
    };
  }, [documentId, dataDetail, currentUser]);
  // logger.log("dataDetail", dataDetail);
  // Update activeStep when document status changes
  useEffect(() => {
    const status = documentDetails?.documentStatus;
    if (status) {
      setActiveStep(getStepFromStatus(status));
    }
  }, [documentDetails]);

  useEffect(() => {
    setIsOpen((prev) => ({
      ...prev,
      replyDocuments: repliedDocuments.length > 0,
      jobProfile: jobProfiles.length > 0,
      replacementDoc: replacedDocuments.length > 0,
      revocationDoc: recalledDocuments.length > 0,
      draftFiles: true,
      attachmentFiles: true,
    }));
  }, [repliedDocuments, jobProfiles, replacedDocuments, recalledDocuments]);
  // logger.log("selectedTypeOfProcess", selectedTypeOfProcess);
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
			isStamp,
      ...(isAuthority === true && { isAuthority: true }),
		}
    dispatch(getKanbanProcessProgress(params));
  }, [selectedTypeOfProcess, dispatch, dataDetail, documentId, isStamp]);
  // useEffect(() => {
  //   if (!selectedTypeOfProcess) return;
  //   const processCode = Array.isArray(selectedTypeOfProcess)
  //     ? selectedTypeOfProcess?.[0]?.processKey
  //     : selectedTypeOfProcess?.processKey;
  //   dispatch(getKanbanProcessProgress({ processCode }));
  // }, [selectedTypeOfProcess, dispatch]);

  const handleCloseConfirmDelete = useCallback(() => {
    setConfirmDelete({ open: false, onConfirm: null, title: "", content: "" });
  }, []);

  // const handleOpenInternalDepartmentDialog = () => {
  //   dialogFieldRef.current = "internalDepartment";
  //   setDialogOpenFor("internalDepartment");
  // };
  // const handleOpenExternalDepartmentDialog = () => {
  //   dialogFieldRef.current = "externalDepartment";
  //   setDialogOpenFor("externalDepartment");
  // };

  const handleOpenInternalUnitDialog = useCallback(() => {
    dialogFieldRef.current = "externalDepartment";
    setDialogOpenFor("internalReceivingDept");
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpenFor(null);
    setDialogOpenForInformationDialog(null);
  }, []);

  const handleDateChange = useCallback(
    (field) => (newDate) => {
      field.onChange(newDate ? dayjs(newDate).toISOString() : null);
    },
    []
  );

const checkStampOption = useCallback(async (bpmnVersion) => {
  if (!bpmnVersion) {
    setShowStampOption(false);
    return;
  }

  try {
    const response = await axiosInstance.get(
      `${API_CHECK_STAMP_BUTTON}?bpmnVersion=${bpmnVersion}`
    );

    // DEBUG - In ra toàn bộ response để xem cấu trúc
    // console.log("🔍 [Stamp Full Response]:", {
    //   bpmnVersion,
    //   fullResponse: response,
    //   responseData: response?.data,
    //   responseDirect: response,
    //   hasDataProperty: !!response?.data
    // });

    // Cách lấy an toàn hơn (xử lý nhiều trường hợp)
    let hasStamp = false;

    if (response?.data?.hasStampOption !== undefined) {
      hasStamp = response.data.hasStampOption === true;
    } else if (response?.hasStampOption !== undefined) {
      hasStamp = response.hasStampOption === true;
    } else if (typeof response === 'object' && response.hasStampOption !== undefined) {
      hasStamp = response.hasStampOption === true;
    }

    // console.log("✅ [Stamp Final Result]:", { bpmnVersion, hasStampOption: hasStamp });

    setShowStampOption(hasStamp);

    if (!hasStamp) {
      setIsStamp(false);
      setValue("isStamp", false);
    }
  } catch (error) {
    // console.error("❌ Lỗi check stamp option:", error);
    setShowStampOption(false);
  }
}, [setValue]);

useEffect(() => {
  if (selectedTypeOfProcess) {
    const bpmnVersion = 
      selectedTypeOfProcess?.processKey || 
      selectedTypeOfProcess?.id || 
      selectedTypeOfProcess?.key;

    checkStampOption(bpmnVersion);
  }
}, [selectedTypeOfProcess, checkStampOption]);
  const handleToggleDocDraft = useCallback(() => {
    setIsOpen((prev) => ({ ...prev, draftFiles: !prev.draftFiles }));
  }, []);

  const handleToggleAttachmentFiles = useCallback(() => {
    setIsOpen((prev) => ({ ...prev, attachmentFiles: !prev.attachmentFiles }));
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

  const handleDownload = useCallback(
    async (file) => {
      if (!file || !file.fileId) {
        toast("File không hợp lệ hoặc không có ID.", "warning");
        return;
      }
      try {
        const response = await axiosInstance.get(
          `${APP_DHVB_BASE}/files/download/${file.fileId}`,
          { responseType: "blob" }
        );
        const blob = response;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", file.fileName || "download");
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        toast("Tải file thất bại.", "error");
      }
    },
    [toast]
  );

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
  const handleSaveUnits = useCallback(
    (units) => {
      if (!dialogOpenFor) return;
      // logger.log("units", units);
      // Trích xuất mảng chỉ chứa các _id để gửi trong payload
      const unitIds = units.map((unit) => getUnitId(unit)).filter(Boolean);
      // logger.log("unitIds", unitIds);
      switch (dialogOpenFor) {
        case "internalDepartment":
          setInternalDepartmentUnits(units);
          setValue("internalDepartment", unitIds, { shouldValidate: true });
          break;
        case "externalDepartment":
          setExternalDepartmentUnits(units);
          setValue("externalDepartment", unitIds, { shouldValidate: true });
          break;
        // case "internalReceivingDept":
        //   setInternalUnitUnits(units);
        //   setValue("internalReceivingDept", unitIds, { shouldValidate: true });
        // 	break;
        case "internalReceivingDept": {
          // Lọc ra chỉ những đơn vị mới (không có trong đơn vị cũ)
          const oldUnitIds = internalReceivingDeptOldUnits
            .map((item) => getUnitId(item))
            .filter(Boolean);
          const newUnitsOnly = units.filter(
            (unit) => unit._id && !oldUnitIds.includes(unit._id)
          );

          // Chỉ lưu đơn vị mới vào state để hiển thị
          setInternalUnitUnits(newUnitsOnly);

          // Set objects đầy đủ để AsyncAutoComplete có thể hiển thị
          // Gồm cả đơn vị cũ + đơn vị mới
          const allUnits = [...internalReceivingDeptOldUnits, ...newUnitsOnly];
          setValue("internalReceivingDept", allUnits, { shouldValidate: true });
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
      // Lọc ra các user objects đầy đủ
      const userObjects = units
        .filter((unit) => unit.types === "user");
      
      setUserByOrganizationUnits(userObjects);
      // Set objects đầy đủ để AsyncAutoComplete có thể hiển thị
      setValue("knowReceivers", userObjects, { shouldValidate: true });
      handleCloseDialog();
    },
    [setValue, handleCloseDialog]
  );

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

  // --- Logic xử lý Job Profile ---
  const handleOpenJobProfileSearch = useCallback(() => {
    setOpenJobProfileSearch(true);
  }, []);

  const handleCloseJobProfileSearch = useCallback(() => {
    setOpenJobProfileSearch(false);
  }, []);

  const handleOpenForInformationDialog = useCallback(() => {
    setDialogOpenForInformationDialog("knowReceivers");
  }, []);

  const handleSaveJobProfiles = useCallback(
    (selectedProfiles) => {
      setJobProfiles((prev) => [
        ...prev,
        ...selectedProfiles.filter((p) => !prev.some((e) => e.id === p.id)),
      ]);
      setIsOpen({ ...isOpen, jobProfile: true });
    },
    [setJobProfiles, setIsOpen, isOpen]
  );

  const handleDeleteJobProfile = useCallback((idToDelete) => {
    setJobProfiles((prev) => prev.filter((p) => p.id !== idToDelete));
  }, []);

  const handleJobProfileAction = useCallback(
    (action, row) => {
      if (action.id === "delete") {
        setConfirmDelete({
          open: true,
          onConfirm: () => {
            handleDeleteJobProfile(row.id);
            setConfirmDelete({ open: false, onConfirm: null });
          },
          title: "Xác nhận xóa",
          content: "Bạn có chắc chắn muốn xóa hồ sơ công việc này không?",
        });
      }
    },
    [handleDeleteJobProfile]
  );

	// Handlers cho ViewJobToDocument
	const handleJobRowClick = useCallback((job) => () => {
  	setSelectedJobTask(job);
  	setOpenJobDetailModal(true);
	}, []);

  const jobProfileColumns = useMemo(
		() => getJobProfileColumns(handleJobRowClick),
		[handleJobRowClick]
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

  // --- Logic xử lý dialogs ---
  const handleOpenReplyDialog = useCallback(
    () => setOpenDocumentReplyDialog(true),
    []
  );
  const handleCloseReplyDialog = useCallback(
    () => setOpenDocumentReplyDialog(false),
    []
  );
  const handleSaveReplyDocument = useCallback((selectedDocs) => {
    setRepliedDocuments((prev) => [
      ...prev,
      ...selectedDocs.filter(
        (doc) => !prev.some((d) => d.documentId === doc.documentId)
      ),
    ]);
  }, []);

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
  }, []);

  const handleOpenReplaceDialog = useCallback(
    () => setOpenReplaceDialog(true),
    []
  );
  const handleCloseReplaceDialog = useCallback(
    () => setOpenReplaceDialog(false),
    []
  );

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

      // Set objects đầy đủ cho internalReceivingDeptOld
      setValue("internalReceivingDeptOld", nextOldUnits, { shouldValidate: true });

      // 3) internalReceivingDept = oldUnits + (newUnits hiện tại, loại trùng)
      const oldIds = nextOldUnits.map(getUnitId).filter(Boolean);
      const newUnitsFiltered = (internalUnitUnits || [])
        .filter((unit) => {
          const id = getUnitId(unit);
          return id && !oldIds.includes(id);
        });

      // Combine oldUnits objects + newUnits objects
      const allUnits = [...nextOldUnits, ...newUnitsFiltered];
      setValue("internalReceivingDept", allUnits, {
        shouldValidate: true,
      });
    },
    [internalUnitUnits, setValue]
	);
	
	const sortedStepsData = useMemo(() => {
    if (
      !Array.isArray(dataKanbanProcessProgress) ||
      dataKanbanProcessProgress.length === 0
    ) {
      return [];
    }
    return [...dataKanbanProcessProgress].sort((a, b) => a.order - b.order);
  }, [dataKanbanProcessProgress]);

  const handleSave = useCallback((e) => {
    handleSubmit(
      async (data) => {
        // Double check VĂN BẢN DỰ THẢO in success handler
        if (!data.draftFiles || data.draftFiles.length === 0) {
          toast("Vui lòng đính kèm file Văn bản dự thảo.", "error");
          return;
        }

        // Merge internalReceivingDept với internalReceivingDeptOld
        const oldUnitIds = (data.internalReceivingDeptOld || []).filter(Boolean);
        const newUnitIds = (data.internalReceivingDept || []).filter(Boolean);
        const allInternalReceivingDeptIds = [
          ...oldUnitIds,
          ...newUnitIds.filter((id) => !oldUnitIds.includes(id)),
        ];
        data.internalReceivingDept = allInternalReceivingDeptIds;

        // if (!allInternalReceivingDeptIds || allInternalReceivingDeptIds.length === 0) {
        //   toast("Bạn cần chọn ít nhất 1 người/đơn vị nhận.", "warning");
        //   return;
        // }

				// Kiểm tra trường reportSigner
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
					requiresReportSigner &&
					!skipLane &&
					(!Array.isArray(data.reportSigner) || data.reportSigner.length === 0)
				) {
          toast("Vui lòng chọn Người ký phát hành.", "warning");
          return;
        }

        try {
          // Chuyển đổi selectedUsersByStep từ object arrays sang ID arrays
          const transformedUsersByStep = {};
          Object.keys(selectedUsersByStep).forEach((stepKey) => {
            const users = selectedUsersByStep[stepKey];
            if (Array.isArray(users) && users.length > 0) {
              transformedUsersByStep[stepKey] = [...new Set(users
                .map((user) => user.userId || user.id || user._id)
                .filter(Boolean))];
            }
          });

          const payload = createSigningSubmissionPayload(
            data,
            repliedDocuments,
            recalledDocuments,
            replacedDocuments,
            documentType,
            jobProfiles,
            null, // dataDetail should be null here to avoid adding the document itself to docAnswer
            transformedUsersByStep
          );
					payload.documentId = documentId;
					payload.isStamp = data.isStamp ? 1 : 0;
					// payload.reqSignFormatDraft = data.isStamp ? 1 : 0;
					// Đảm bảo typeOfProcess luôn được gửi từ state (không phụ thuộc form data)
					payload.typeOfProcess = selectedTypeOfProcess?.processKey || selectedTypeOfProcess?.id || payload.typeOfProcess || null;
					// Chỉ gửi reqSignFormatDraft nếu loại quy trình chưa thay đổi
					const currentProcessKey = selectedTypeOfProcess?.processKey || selectedTypeOfProcess?.id;
					const originalProcessKey = dataDetail?.document?.typeOfProcess || dataDetail?.typeOfProcess;
					const processChanged = currentProcessKey && originalProcessKey && currentProcessKey !== originalProcessKey;
					if (!processChanged && dataDetail?.flags?.reqSignFormatDraft) {
						payload.reqSignFormatDraft = dataDetail?.flags?.reqSignFormatDraft;
					}
          const response = await axiosInstance.put(
            `${API_ADD_VANBANDI_DHVB}/${recordId}`,
            payload
          );
          if (response) {
            toast("Cập nhật thành công!", "success");
            if (onSuccess) onSuccess();
            onClose();

            if (isPendingPublishOrStamp && !props.disableRedirect && documentId) {
              setTimeout(() => {
                const componentConfig = getComponentByKey("VIEW_OUTCOMING_PROMULGATE_DOC");
                if (componentConfig) {
                  openDetailDialog(componentConfig, documentId);
                }
              }, 100);
            }
          }
        } catch (error) {
         toast(error?.response?.data?.message || error?.message || "Đã xảy ra lỗi khi cập nhật!", "error");
        }
      },
      (errors) => {
        // Hiển thị toast khi có lỗi validation
        if (errors.draftFiles) {
          toast(errors.draftFiles.message, "warning");
        } else {
          const firstError = Object.values(errors)[0];
          if (firstError?.message) {
            toast(firstError.message, "warning");
          }
        }
      }
    )(e);
  }, [
    handleSubmit,
    toast,
    selectedUsersByStep,
    repliedDocuments,
    recalledDocuments,
    replacedDocuments,
    documentType,
    jobProfiles,
    documentId,
    recordId,
    onSuccess,
		onClose,
		dataDetail?.document?.typeOfProcess,
		dataDetail?.flags?.reqSignFormatDraft,
		dataDetail?.typeOfProcess,
		selectedTypeOfProcess?.id,
		selectedTypeOfProcess?.processKey,
		sortedStepsData,
		isPendingPublishOrStamp,
		props.disableRedirect
  ]);

  useEffect(() => {
    const fetchDocumentData = async () => {
      if (!documentId || !open) return;
      setSelectedUsersByStep({});
      setUploadErrors({ draftFiles: false, attachmentFiles: false });
      setUploadingFiles({ draftFiles: false, attachmentFiles: false });
      try {
        const response = await axiosInstance.get(
          `${API_ADD_VANBANDI_DHVB}/${documentId}`
        );
        setDataDetail(response);

        dispatch(getDataListUnit({ page: 1, limit: 500 }));

        // Hàm helper để lấy file từ API
        const fetchFiles = async (objectType, objectId) => {
          try {
            const filesResponse = await axiosInstance.get(
              `${APP_BASE}/api/files/by-object?object_type=${objectType}&object_id=${objectId}`
            );
            const filesData = Array.isArray(filesResponse)
              ? filesResponse
              : filesResponse.data || [];
            return filesData
              .map((file) => ({
                _id: file.id,
                name: file.file_name,
                fileName: file.file_name,
                path: file.file_path,
                size: file.file_size,
                mimetype: file.mime_type,
                createdAt: file.created_at,
              }))
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          } catch (error) {
            logger.error(`Lỗi khi tải file cho ${objectType}:`, error);
            return []; // Trả về mảng rỗng nếu có lỗi
          }
        };

        setRecordId(response.document.id || response.document._id); // Lưu lại `id` của bản ghi
        setDocumentDetails(response.document); // Lưu lại chi tiết văn bản từ response.document

        if (response && response.document) {
          const documentData = response?.document || {};

          const senderUnitData = getObjectOrNull(documentData?.senderUnit);
          if (senderUnitData) {
            setDraftingUnitOptions([senderUnitData]);
          }

          const drafterData = getObjectOrNull(documentData?.drafter);
          if (drafterData) {
            setDrafterOptions([drafterData]);
          }

          const signerData = getObjectOrNull(documentData?.draftSigner);
          if (signerData) {
            // setSignerOptions([signerData]);
          }

          // Set typeOfProcess object and trigger kanban data fetch
          if (documentData?.typeOfProcess) {
            const processObj =
              typeof documentData.typeOfProcess === "object"
                ? documentData.typeOfProcess
                : null;
            if (processObj) {
              setSelectedTypeOfProcess(processObj);
            }
          }
         const currentIsStamp = !!(documentData?.isStamp || response?.isStamp);
          setIsStamp(currentIsStamp);
          setValue("isStamp", currentIsStamp, { shouldValidate: true });

          const formData = {
            draftingUnit: getValue(documentData?.senderUnit),
            drafter: getValue(documentData?.drafter),
            documentType: getValue(documentData?.documentType),
            urgency: getValue(documentData?.urgencyLevel),
            securityLevel: getValue(documentData?.privateLevel),
            documentField: getValue(documentData?.documentField),
            reportSigner: toIdArray(documentData?.reportSigner),
            signer: getValue(documentData?.draftSigner),

            approverSymbol: documentData?.reportDocumentSymbol || "",
            draftSymbol: documentData?.toBookTextSymbols || "",

            statusCode: documentData?.statusCode,
            notifyUnit: documentData?.viewers || [],
            replyDeadline: documentData?.deadlineReply || null,
            extract: documentData?.abstractNote || "",
						
            processor: documentData?.processor || [],

            submissionFiles: [],
            draftFiles: [],
            attachmentFiles: [],

            knowReceivers: documentData?.knowReceivers || [],
            internalReceivingDeptOld:
              documentData?.internalReceivingDeptOld || [],
						typeOfProcess: documentData?.typeOfProcess || null,
						documentViewerGroups: documentData?.documentViewerGroups || [],
						signatureType: documentData?.signatureType || "",
            isStamp: currentIsStamp,
          };

          const filteredData = Object.fromEntries(
            Object.entries(formData).filter(([, v]) => v != null)
          );
          reset(filteredData);

          // Populate old receiving units from API response
          if (
            Array.isArray(documentData?.internalReceivingDeptOld) &&
            documentData.internalReceivingDeptOld.length > 0
          ) {
            setInternalReceivingDeptOldUnits(
              documentData.internalReceivingDeptOld
            );
            setValue(
              "internalReceivingDeptOld",
              documentData.internalReceivingDeptOld,
              { shouldValidate: true }
            );
          }

          // For new units, only show those not in old units
          const oldUnitIds = (documentData?.internalReceivingDeptOld || [])
            .map((u) => getUnitId(u))
            .filter(Boolean);
          const newUnitsOnly = (
            documentData?.internalReceivingDept || []
          ).filter((unit) => {
            const unitId = getUnitId(unit);
            return unitId && !oldUnitIds.includes(unitId);
          });
          setInternalUnitUnits(newUnitsOnly);
          // Set form field with full objects (old + new units combined)
          const allUnits = [...(documentData?.internalReceivingDeptOld || []), ...newUnitsOnly];
          setValue(
            "internalReceivingDept",
            allUnits,
            { shouldValidate: true }
          );

          // Giai đoạn 2: Tải song song nền các tệp đính kèm
          (async () => {
            try {
              const [draft, attachment] = await Promise.all([
                fetchFiles("docDraft", documentId),
                fetchFiles("docAttachments", documentId),
              ]);
              setValue("draftFiles", draft || []);
              setValue("attachmentFiles", attachment || []);
            } catch (errorBg) {
              logger.error("Lỗi khi tải file nền:", errorBg);
            }
          })();
        }
      } catch (error) {
        logger.log("Lỗi khi tải dữ liệu văn bản!", error);
        toast("Lỗi khi tải dữ liệu văn bản!", "error");
      }
    };
    fetchDocumentData();
  }, [open, documentId, reset, toast, dispatch, setValue]); // Thêm reset, toast và dispatch vào dependencies

  // Sync selectedUsersByStep from document data + kanban process progress
  useEffect(() => {
    if (!dataDetail) return;

    const documentData = dataDetail?.document || dataDetail;

    const mapUserToStep = (user) => {
      if (typeof user === "string") {
        return { userId: user, id: user, key: user, unitType: "user", chiDao: true };
      }
      const id = user?.userId || user?.id || user?._id;
      if (!id) return null;
      return { userId: id, name: user?.name, unitType: "user", id, key: id, chiDao: true };
    };

    const kanbanStepActions = Array.isArray(dataKanbanProcessProgress)
      ? dataKanbanProcessProgress
          .map((step) => step?.action)
          .filter((action, index, actions) => Boolean(action) && actions.indexOf(action) === index)
      : [];

    const fallbackStepActions = Object.keys(documentData || {}).filter(
      (key) => key.startsWith("sign") && Array.isArray(documentData?.[key])
    );

    const STEP_KEYS = kanbanStepActions.length > 0 ? kanbanStepActions : fallbackStepActions;

    const usersByStep = {};
    STEP_KEYS.forEach((key) => {
      if (!Array.isArray(documentData?.[key])) return;
      usersByStep[key] = documentData[key].map(mapUserToStep).filter(Boolean);
    });

    if (documentData?.reportSigner) {
      const reportSignerList = Array.isArray(documentData.reportSigner)
        ? documentData.reportSigner
        : [documentData.reportSigner];
      usersByStep.reportSigner = reportSignerList.map(mapUserToStep).filter(Boolean);
    }

    if (Object.keys(usersByStep).length > 0) {
      setSelectedUsersByStep((prev) => ({ ...usersByStep, ...prev }));
    }
  }, [dataDetail, dataKanbanProcessProgress]);

  // useEffect để cập nhật danh sách văn bản phúc đáp khi có dữ liệu chi tiết
  useEffect(() => {
    // Kiểm tra nếu documentDetails có dữ liệu và docAnswer là một mảng
    if (documentDetails && Array.isArray(documentDetails.docAnswer)) {
      // Cập nhật state để hiển thị danh sách văn bản phúc đáp đã lưu
      setRepliedDocuments(documentDetails.docAnswer);
    }
    // Bổ sung: Kiểm tra và cập nhật state cho văn bản thu hồi
    if (documentDetails && Array.isArray(documentDetails.docRecall)) {
      setRecalledDocuments(documentDetails.docRecall);
    }
    // Bổ sung: Kiểm tra và cập nhật state cho văn bản thay thế
    if (documentDetails && Array.isArray(documentDetails.docReplacement)) {
      setReplacedDocuments(documentDetails.docReplacement);
    }
    // Bổ sung: Kiểm tra và cập nhật state cho hồ sơ công việc
    if (documentDetails && Array.isArray(documentDetails.docWorkFiles)) {
      setJobProfiles(documentDetails.docWorkFiles);
    }
    if (documentDetails && Array.isArray(documentDetails.knowReceivers)) {
      // Giả định knowReceivers là một mảng các object đầy đủ { _id, name }
      setUserByOrganizationUnits(documentDetails.knowReceivers);
      // Cập nhật react-hook-form với objects đầy đủ (không chỉ IDs)
      // vì AsyncAutoComplete với returnObject=true cần objects đầy đủ để hiển thị
      setValue(
        "knowReceivers",
        documentDetails.knowReceivers,
        { shouldValidate: true }
      );
    }

  }, [documentDetails, setValue]); // Hook này sẽ chạy mỗi khi documentDetails thay đổi

  // useEffect để xử lý việc hiển thị tên các đơn vị nhận đã lưu
  // Thay thế useEffect cũ bằng cái này
  useEffect(() => {
    // Chờ tất cả dữ liệu cần thiết sẵn sàng
    if (
      !open ||
      !documentDetails
    )
      return;

    let isMounted = true;

    const mapUnitIdsToUnitObjects = () => {
      if (!isMounted) return;

      const internalDepartmentObjects =
        documentDetails.internalReceivingUnit || [];
      const externalDepartmentObjects =
        documentDetails.externalReceivingUnit || [];
      const internalUnitObjects = documentDetails.internalReceivingDept || [];

      // Cập nhật state và form value
      if (
        internalDepartmentUnits.length === 0 &&
        internalDepartmentObjects.length > 0
      ) {
        setInternalDepartmentUnits(internalDepartmentObjects);
        setValue(
          "internalDepartment",
          internalDepartmentObjects.map((u) => u._id || u.id),
          { shouldValidate: true }
        );
      }

      if (
        externalDepartmentUnits.length === 0 &&
        externalDepartmentObjects.length > 0
      ) {
        setExternalDepartmentUnits(externalDepartmentObjects);
        setValue(
          "externalDepartment",
          externalDepartmentObjects.map((u) => u._id || u.id),
          { shouldValidate: true }
        );
      }

      if (internalUnitUnits.length === 0 && internalUnitObjects.length > 0) {
        setInternalUnitUnits(internalUnitObjects);
        setValue(
          "internalReceivingDept",
          internalUnitObjects.map((u) => u._id || u.id),
          { shouldValidate: true }
        );
      }
    };

    mapUnitIdsToUnitObjects();

    return () => {
      isMounted = false;
    };
  }, [
    open,
    documentDetails,
    setValue,
    internalDepartmentUnits.length,
    externalDepartmentUnits.length,
    internalUnitUnits.length,
  ]);

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
            prev.filter((d) => d.documentId !== row.documentId)
          );
          setConfirmDelete({ open: false, onConfirm: null });
        },
        title: "Xác nhận xóa",
        content: "Bạn có chắc chắn muốn xóa văn bản phúc đáp này không?",
      });
    }
  }, []);
  // const handleRecalledDocAction = useCallback((action, row) => {
  //   if (action.id === "delete") {
  //     setConfirmDelete({
  //       open: true,
  //       onConfirm: () => {
  //         setRecalledDocuments((prev) =>
  //           prev.filter((d) => d.documentId !== row.documentId)
  //         );
  //         setConfirmDelete({ open: false, onConfirm: null });
  //       },
  //       title: "Xác nhận xóa",
  //       content: "Bạn có chắc chắn muốn xóa văn bản thu hồi này không?",
  //     });
  //   }
  // }, []);
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

            // Cập nhật internalReceivingDept: chỉ giữ đơn vị mới (set objects đầy đủ)
            setValue("internalReceivingDept", internalUnitUnits || [], { shouldValidate: true });

            setConfirmDelete({ open: false, onConfirm: null });
          },
          title: "Xác nhận xóa",
          content: "Bạn có chắc chắn muốn xóa văn bản thay thế này không?",
        });
      }
    },
    [internalUnitUnits, setValue]
  );
  useEffect(() => {
    const user = currentUser?.user || currentUser;
    const targetUnit = user?.grandParent?._id ? user.grandParent : user?.parent;
    if (user && targetUnit?._id) {
      // Set options for select dropdowns
      setDraftingUnitOptions([
        { _id: targetUnit._id, name: targetUnit.name || targetUnit.organizationName },
      ]);
      setDrafterOptions([{ _id: user._id, name: user.name }]);

      // Set form values
      setValue("draftingUnit", targetUnit._id, { shouldValidate: true });
      setValue("drafter", user._id, { shouldValidate: true });
    }
  }, [setValue, currentUser]);

  // useEffect(() => {
  //   const fetchSigners = async () => {
  //     try {
  //       const [approverRes, signerRes] = await Promise.all([
  //         // axiosInstance.get(API_APPROVE_SIGNER),
  //         axiosInstance.get(API_DRAFT_SIGNER),
  //       ]);
  //       if (approverRes && Array.isArray(approverRes)) {
  //         setApproverOptions(approverRes);
  //       }
  //       if (signerRes && Array.isArray(signerRes)) {
  //         setSignerOptions(signerRes);
  //       }
  //     } catch (error) {
  //       toast("Lỗi khi tải danh sách người ký!", "error");
  //     }
  //   };
  //   if (open) fetchSigners();
  // }, [open, toast]);

  useEffect(() => {
    const fetchReceivers = async () => {
      try {
        const [notifyRes, processorRes] = await Promise.all([
          axiosInstance.get(API_RECEIVE_TO_KNOW),
          axiosInstance.get(API_PROCESSING_RECEIVER),
        ]);
        if (notifyRes && Array.isArray(notifyRes)) {
          // setNotifyUnitOptions(notifyRes);
        }
        if (processorRes && Array.isArray(processorRes)) {
          // setProcessorOptions(processorRes);
        }
      } catch (error) {
        toast("Lỗi khi tải danh sách người nhận!", "error");
      }
    };
    if (open) fetchReceivers();
  }, [open, toast]);

  // const getOnDeleteHandlerForUnit = useCallback(
  //   (fieldName, unitIdToRemove) => {
  //     // const getUnitId = (unit) => unit._id || unit.id;
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
  //           setInternalUnitUnits(updatedUnits);
  //           // Set objects đầy đủ thay vì chỉ IDs
  //           setValue("internalReceivingDept", updatedUnits, {
  //             shouldValidate: true,
  //           });
  //           break;
  //         }
  //         case "internalReceivingDeptOld": {
  //           const updatedUnits = internalReceivingDeptOldUnits.filter(
  //             (unit) => getUnitId(unit) !== unitIdToRemove
  //           );
  //           // const updatedUnitIds = updatedUnits.map((unit) => getUnitId(unit));
  //           setInternalReceivingDeptOldUnits(updatedUnits);
  //           setValue("internalReceivingDeptOld", updatedUnits, {
  //             shouldValidate: true,
  //           });
  //           break;
  //         }
  //         case "knowReceivers": {
  //           const updatedUnits = userByOrganizationUnits.filter(
  //             (unit) => getUnitId(unit) !== unitIdToRemove
  //           );
  //           setUserByOrganizationUnits(updatedUnits);
  //           // Set objects đầy đủ thay vì chỉ IDs
  //           setValue("knowReceivers", updatedUnits, { shouldValidate: true });
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
  //     userByOrganizationUnits,
  //     setValue,
  //     internalReceivingDeptOldUnits,
  //   ]
  // );

  const handleToggleOpen = useCallback((event) => {
    const section = event.currentTarget.dataset.section;
    if (section) {
      setIsOpen((prev) => ({ ...prev, [section]: !prev[section] }));
    }
  }, []);

  const getFormDataForUpdate = useCallback(() => {
    const currentData = getValues();

    // Hàm normalize giá trị để tránh false positive khi so sánh
    const normalizeValue = (value) => {
      // Coi null, undefined, "" như nhau
      if (value === null || value === undefined || value === "") return null;
      // Nếu là date string, normalize về ISO
      if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}/)) {
        try {
          return new Date(value).toISOString();
        } catch (e) {
          // Fallback if date parsing fails
          return value;
        }
      }
      return value;
    };

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

    let hasChanged = false;
    const changedFields = [];

    Object.keys(currentData).forEach((key) => {
      let oldValue = dataDetail?.document?.[key] || dataDetail?.[key];
      const newValue = currentData[key];

      if (key === "draftSymbol") {
        oldValue = dataDetail?.document?.toBookTextSymbols || dataDetail?.toBookTextSymbols ||
                   dataDetail?.document?.draftDocumentSymbol || dataDetail?.draftDocumentSymbol ||
                   dataDetail?.document?.textSymbols || dataDetail?.textSymbols;
      } else if (key === "approverSymbol") {
        oldValue = dataDetail?.document?.reportDocumentSymbol || dataDetail?.reportDocumentSymbol;
      } else if (key === "replyDeadline") {
        oldValue = dataDetail?.document?.deadlineReply || dataDetail?.deadlineReply;
      } else if (key === "extract") {
        oldValue = dataDetail?.document?.abstractNote || dataDetail?.abstractNote;
      }

      // So sánh cho các trường danh sách (mảng các Object hoặc ID)
      const arrayFields = [
        "internalReceivingDept",
        "knowReceivers",
        "processor",
        "documentViewerGroups",
        "reportSigner"
      ];

      if (arrayFields.includes(key)) {
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

    // Sử dụng createSigningSubmissionPayload giống như handleSave
    const body = createSigningSubmissionPayload(
      currentData,
      repliedDocuments,
      recalledDocuments,
      replacedDocuments,
      documentType,
      jobProfiles
    );

    if (documentId) {
      body.documentId = documentId;
    }

    return {
      hasChanged,
      changedFields,
      body,
      selectedUsersByStep,
      documentId,
    };
  }, [
    getValues,
    dataDetail,
    repliedDocuments,
    recalledDocuments,
    replacedDocuments,
    documentType,
    jobProfiles,
    selectedUsersByStep,
    documentId,
  ]);

	const handleChangeInternalReceivingDept = useCallback(
		(val) => {
			setValue("internalReceivingDept", val, { shouldValidate: true });
			setInternalUnitUnits(val || []);
		},
		[setValue]
	)

	const handleChangeKnowReceivers = useCallback(
		(val) => {
			setValue("knowReceivers", val, { shouldValidate: true });
			setUserByOrganizationUnits(val || []);
		},
		[setValue]
	);

  const handleClose = useCallback(() => {
    onClose();
    setReloadData(new Date() * 1);
  }, [onClose, setReloadData]);

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

	const disabledSteps = useMemo(() => {
		return sortedStepsData.reduce((acc, item, index) => {
			if (!isStepSelectable(item)) {
				acc[index] = true;
			}
			return acc;
		}, {});
	}, [sortedStepsData, isStepSelectable]);

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
		[sortedStepsData, toast, isStepSelectable]);

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
			currentLane: item.currenLane,
			signerRequiredRole: item.signerRequiredRole,
      // canChoose: item.canChoose,
  	}));
	}, [sortedStepsData]);

	useEffect(() => {
  	const activeIndex = stepsFromApi.findIndex(
    	step => step.curWorkItem && !step.completed
  	);

  	if (activeIndex !== -1) {
    	setActiveStep(activeIndex);
  	}
	}, [stepsFromApi]);

	const handleCloseDialogStep = useCallback(() => {
    setOpenStepDialog(false);
  }, []);

const handleTypeOfProcessChange = useCallback(
  (value) => {
    setValue("typeOfProcess", value, { shouldValidate: true });
    setSelectedTypeOfProcess(value);

    // Reset selected users
    setSelectedUsersByStep({});

    // Check stamp option
    const bpmnVersion = value?.processKey || value?.id || value?.key;
    checkStampOption(bpmnVersion);
  },
  [setValue, setSelectedTypeOfProcess, checkStampOption]
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
    // -> sẽ trình lên bước KẾ (index + 1)
    const caseAIdx = stepsFromApi.findIndex(
      (step) => step.curWorkItem === true && step.completed === false
    );
    if (caseAIdx !== -1 && caseAIdx < sortedStepsData.length - 1) {
      targetIndex = caseAIdx + 1;
    } else {
      // Case B: bước trước done, bước tiếp theo chưa bắt đầu
      // -> bước tiếp theo chính là nơi sẽ gửi đến
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


  const handleSelectUsers = useCallback(
    (users) => {
      // Xử lý logic khi người dùng chọn người phê duyệt
      if (users && users.length > 0) {
        // Lưu danh sách users đã chọn vào selectedUsersByStep
        setSelectedUsersByStep((prev) => ({ ...prev, [stepKey]: users || [] }));
        
        // Nếu stepKey là reportSigner, cập nhật trường reportSigner trong form
        if (stepKey === 'reportSigner') {
          const signerIds = users
            .map((user) => user?.userId || user?.id || user?._id)
            .filter(Boolean);
          setValue('reportSigner', signerIds, { shouldValidate: true });
        }

        // Reload kanban để cập nhật danh sách assigned bên dưới mỗi step
        if (selectedTypeOfProcess) {
          const processCode = selectedTypeOfProcess?.processKey || selectedTypeOfProcess?.id;
          const workItemId = dataDetail?.workItem?.id;
          const isAuthority = dataDetail?.document
            ? dataDetail?.document?.isAuthority
            : dataDetail?.isAuthority;
          dispatch(getKanbanProcessProgress({
            processCode,
            workItemId,
            docId: documentId,
            isStamp,
            ...(isAuthority === true && { isAuthority: true }),
          }));
        }
      }
    },
    [stepKey, setValue, selectedTypeOfProcess, dataDetail, documentId, isStamp, dispatch]
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
		},[handleOpenViewDialog]
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

  const handleCloseJobDetailModal = useCallback(() => {
    setOpenJobDetailModal(false);
    setSelectedJobTask(null);
  }, []);

  const handleJobDetailSuccess = useCallback(() => {
    if (setReloadData) {
      setReloadData(new Date().getTime());
    }
  }, [setReloadData]);

  const handleChangeStamp = (e) => {
  const checked = e.target.checked;

  setIsStamp(checked);
  setValue("isStamp", checked, {
    shouldValidate: true,
  });
};

  return (
    <BaseSwipper
      title={title || "Chỉnh sửa văn bản dự thảo"}
      open={open}
      onClose={handleClose}
      onSave={handleSave}
      footer={
        <>
          <FlexGrowBox />
          <FooterActions>
          	<FormButton
          	  dataDetail={dataDetail}
          	  setReloadData={setReloadData}
          	  onClose={onClose}
          	  isUpdate
							getFormDataForUpdate={getFormDataForUpdate}
							selectedUsersByStep={selectedUsersByStep}
							initialPreselectedUsers={activeStepPreselectedUsers}
							disabled={isLoading || uploadingFiles.draftFiles || uploadingFiles.attachmentFiles}
							hasUploadError={hasUploadError || uploadErrors.draftFiles || uploadErrors.attachmentFiles}
							isUploadingFiles={uploadingFiles.draftFiles || uploadingFiles.attachmentFiles}
          	/>
          	<ButtonOutline
          	  onClick={handleSave}
          	  disabled={isLoading}
          	  variant="outlined"
          	  // color="inherit"
          	>
          	  LƯU
          	</ButtonOutline>
        	</FooterActions>
      	</>
    }
      isLoading={isLoading}
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
                  url={API_GET_PROCESS_OUTGOING_DOCUMENT}
                  // url={API_APPROVE_SIGNER}
                  queryParam="name"
                  optionLabel="name"
                  optionValue="id"
                  onChange={handleTypeOfProcessChange}
                  error={!!errors.typeOfProcess}
                  helperText={errors.typeOfProcess?.message}
                  returnObject
                  disableClearable
                  disabled={
                    documentDetails &&
                    (currentUser?.id || currentUser?._id) !==
                      (documentDetails?.drafter?.id ||
                        documentDetails?.drafter?._id)
                  }
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
                  error={!!errors?.draftingUnit}
                  helperText={errors?.draftingUnit?.message}
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
                  error={!!errors?.drafter}
                  helperText={errors?.drafter?.message}
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
                <InputComponents
                  select
                  placeholder="Nhập dữ liệu..."
                  options={documentTypeOptions}
                  customLabel="title"
                  customValue="value"
                  {...field}
                  error={!!errors.documentType}
                  helperText={errors.documentType?.message}
                  required
                />
              )}
            />
          </Grid>
        
          {/* Độ mật */}
          {/* <Grid item xs={12} sm={6} md={4}>
            <Controller
              name="securityLevel"
              control={control}
              render={({ field }) => (
                <InputComponents
                  select
                  label="Độ mật"
                  placeholder="Nhập dữ liệu..."
                  options={securityLevelOptions}
                  customLabel="title"
                  customValue="value"
                  {...field}
                  error={!!errors?.securityLevel}
                  helperText={errors.securityLevel?.message}
                  required
                />
              )}
            />
          </Grid> */}
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
                  error={!!errors?.documentField}
                  helperText={errors?.documentField?.message}
                />
              )}
            />
          </Grid>
           <Grid item xs={12} sm={6} md={4}>
              <FormLabel>
                          Độ khẩn
                        </FormLabel>
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
                  error={!!errors?.urgency}
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
              render={({ field }) => {
                return (
                  <InputComponents
                    select
                    label="Người ký phát hành"
                    placeholder="Chọn người ký...."
                    options={dataReportSigner}
                    customLabel="name"
                    customValue="id"
                    required
                    {...field}
                    error={!!errors?.reportSigner}
                    helperText={errors.reportSigner?.message}
                  />
                );
              }}
            />
          </Grid> */}
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
                  // required
                  // multiline
                  // rows={3}
                />
              )}
            />
          </Grid>
          {/* <Grid item xs={12} sm={6} md={4}>
            <Controller
              name="approver"
              control={control}
              render={({ field }) => (
                <InputComponents
                  select
                  options={approverOptions}
                  customLabel="name"
                  customValue="_id"
                  label="Người ký tờ trình"
                  placeholder="Nhập dữ liệu..."
                  {...field}
                  error={!!errors?.approver}
                  helperText={errors?.approver?.message}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller
              name="approverSymbol"
              control={control}
              render={({ field }) => (
                <InputComponents
                  label="Ký hiệu văn bản tờ trình"
                  placeholder="Nhập dữ liệu..."
                  {...field}
                  error={!!errors.approverSymbol}
                  helperText={errors.approverSymbol?.message}
                  //   required
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller
              name="signer"
              control={control}
              render={({ field }) => (
                <InputComponents
                  select
                  options={signerOptions}
                  customLabel="name"
                  customValue="_id"
                  label="Người ký dự thảo"
                  placeholder="Nhập dữ liệu..."
                  {...field}
                  error={!!errors.signer}
                  helperText={errors.signer?.message}
                  required
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Controller
              name="notifyUnit"
              control={control}
              render={({ field }) => (
                <InputComponents
                  select
                  multiple
                  label="Nơi để nhận biết"
                  placeholder="Chọn nơi nhận..."
                  options={notifyUnitOptions}
                  customLabel="name"
                  customValue="id"
                  {...field}
                  error={!!errors.notifyUnit}
                  helperText={errors.notifyUnit?.message}
                />
              )}
            />
          </Grid> */}

          <Grid item xs={12} sm={6} md={4}>
            <FormLabel>Hạn trả lời</FormLabel>
            <Controller
              name="replyDeadline"
              control={control}
              render={({ field }) => (
                <DatePicker
                  value={field.value || null}
                  onChange={handleDateChange(field)}
                  error={!!errors.replyDeadline}
                  helperText={errors.replyDeadline?.message}
                  minDate={dayjs()}

                  //   required
                />
              )}
            />
					</Grid>
					{isVanThuCuc && !showStampOption && (
						<Grid item xs={12} sm={6} md={4}>
              <FormLabel>&nbsp;</FormLabel>
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
         {showStampOption && (
  <Grid item xs={12} sm={6} md={4}>
    <FormLabel>&nbsp;</FormLabel>
    <FormControlLabel
      control={
        <Checkbox
          checked={isStamp}
          onChange={handleChangeStamp}
          size="small"
        />
      }
      label="Đóng dấu"
    />
  </Grid>
)}

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

          {/* Đơn vị nhận */}
          <Grid item xs={12} sm={12} md={6}>
            <FormLabel>
              Đơn vị nhận 
							{/* <IconRequied component="span">*</IconRequied> */}
            </FormLabel>
            <ActionContainer>
              <Controller
                name="internalReceivingDept"
                control={control}
                render={(
                  { field } // ← Bắt buộc phải có field
								) => (
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
								
                  // <div style={{ flexGrow: 1 }}>
                  //   <ChipInputContainer error={!!errors.internalReceivingDept}>
                  //     <InputLabel>
                  //       Đơn vị nhận
                  //       <IconRequied component="span">*</IconRequied>
                  //     </InputLabel>
                  //     {(() => {
                  //       // Lấy dữ liệu từ API response của các đơn vị nhận cũ
                  //       const apiOldUnitIds = internalReceivingDeptOldUnits.map(
                  //         (u) => getUnitId(u)
                  //       );
                  //       // Lấy giá trị hiện tại từ form field internalReceivingDeptOld
                  //       const formOldUnitIds =
                  //         dataDetail?.document?.internalReceivingDeptOld.map(
                  //           (u) => getUnitId(u)
                  //         ) || [];
                  //       // Kết hợp cả dữ liệu API và form để loại bỏ những phần tử trùng lặp
                  //       const allOldUnitIds = [
                  //         ...new Set([...apiOldUnitIds, ...formOldUnitIds]),
                  //       ];
                  //       // Lọc các đơn vị mới để loại bỏ những phần tử trùng với đơn vị nhận cũ
                  //       const newUnitsOnly = internalUnitUnits.filter(
                  //         (unit) => !allOldUnitIds.includes(getUnitId(unit))
                  //       );
                  //       return newUnitsOnly.length > 0 ? (
                  //         <>
                  //           <ChipContainer>
                  //             {newUnitsOnly.map((unit) => (
                  //               <CustomChip
                  //                 key={getUnitId(unit)}
                  //                 label={unit.name}
                  //                 onDelete={getOnDeleteHandlerForUnit(
                  //                   "internalReceivingDept",
                  //                   getUnitId(unit)
                  //                 )}
                  //                 size="small"
                  //               />
                  //             ))}
                  //           </ChipContainer>
                  //           <ClearAllButton
                  //             size="small"
                  //             data-field="internalReceivingDept"
                  //             onClick={handleClearUnits}
                  //           >
                  //             <ClearIcon />
                  //           </ClearAllButton>
                  //         </>
                  //       ) : (
                  //         <PlaceholderTypography variant="body1">
                  //           Tìm kiếm
                  //         </PlaceholderTypography>
                  //       );
                  //     })()}
                  //   </ChipInputContainer>
                  //   {errors.internalReceivingDept && (
                  //     <FormHelperText error>
                  //       {errors.internalReceivingDept.message}
                  //     </FormHelperText>
                  //   )}
                  //   {/* Hidden input để lưu giá trị vào form */}
                  //   <input
                  //     type="hidden"
                  //     {...field}
                  //     value={JSON.stringify(
                  //       internalUnitUnits.map((u) => u._id || u.id)
                  //     )}
                  //   />
                  // </div>
                )}
              />
              <StyledButton onClick={handleOpenInternalUnitDialog}>
                CHỌN
              </StyledButton>
            </ActionContainer>
          </Grid>
          {/* Cá nhân nhận văn bản */}
          <Grid item xs={12} sm={12} md={6}>
            <FormLabel>Cá nhân nhận văn bản</FormLabel>
            <ActionContainer>
              <Controller
                name="knowReceivers"
                control={control}
                render={(
                  { field } // ← Bắt buộc phải có field
								) => (
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
							

                  // <div style={{ flexGrow: 1 }}>
                  //   <ChipInputContainer error={!!errors.knowReceivers}>
                  //     <InputLabel>Cá nhân nhận văn bản</InputLabel>
                  //     {userByOrganizationUnits.length > 0 ? (
                  //       <>
                  //         <ChipContainer>
                  //           {userByOrganizationUnits.map((unit) => (
                  //             <CustomChip
                  //               key={getUnitId(unit)}
                  //               label={unit.name}
                  //               onDelete={getOnDeleteHandlerForUnit(
                  //                 "knowReceivers",
                  //                 getUnitId(unit)
                  //               )}
                  //               size="small"
                  //             />
                  //           ))}
                  //         </ChipContainer>
                  //         <ClearAllButton
                  //           size="small"
                  //           data-field="knowReceivers"
                  //           onClick={handleClearUnits}
                  //         >
                  //           <ClearIcon />
                  //         </ClearAllButton>
                  //       </>
                  //     ) : (
                  //       <PlaceholderTypography variant="body1">
                  //         Tìm kiếm
                  //       </PlaceholderTypography>
                  //     )}
                  //   </ChipInputContainer>
                  //   {errors.knowReceivers && (
                  //     <FormHelperText error>
                  //       {errors.knowReceivers.message}
                  //     </FormHelperText>
                  //   )}
                  //   <input
                  //     type="hidden"
                  //     {...field}
                  //     value={JSON.stringify(
                  //       userByOrganizationUnits.map((u) => u._id || u.id)
                  //     )}
                  //   />
                  // </div>
                )}
              />
              <StyledButton onClick={handleOpenForInformationDialog}>
                CHỌN
              </StyledButton>
            </ActionContainer>
          </Grid>

          {(replacedDocuments.length > 0 ||
            internalReceivingDeptOldUnits.length > 0) && (
            <Grid item xs={12}>
              <FormLabel>
                              Đơn vị nhận cũ <IconRequied component="span">*</IconRequied>
                            </FormLabel>
              <ActionContainer>
                <Controller
                  name="internalReceivingDeptOld"
                  control={control}
                  render={(
                    { field } // ← Bắt buộc phải có field
                  ) => (
                    <div style={{ flexGrow: 1 }}>
                      <ChipInputContainer
                        error={!!errors.internalReceivingDeptOld}
                      >
                        <InputLabel>
                          Đơn vị nhận cũ
                          <IconRequied component="span">*</IconRequied>
                        </InputLabel>
                        {internalReceivingDeptOldUnits.length > 0 ? (
                          <>
                            <ChipContainer>
                              {internalReceivingDeptOldUnits.map((unit) => (
                                  <CustomChip
                                    key={getUnitId(unit)}
                                    label={unit.name}
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
                    </div>
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
										returnObject
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
        {/* Văn bản dự thảo */}
        <SectionCard>
          <Controller
            name="draftFiles"
            control={control}
            render={({ field }) => (
              <UploadFile
                {...field}
                label="VĂN BẢN TRÌNH KÝ"
                objectId={documentId}
                objectType="docDraft"
                id="draftFiles-upload"
                editFile = {dataDetail?.flags?.canEditFile}
                isRequired
                useSecondaryLayout
                isCollapsible
                isOpen={isOpen.draftFiles}
                onToggle={handleToggleDocDraft}
                onUploadErrorChange={handleDraftUploadErrorChange}
                onSigningStateChange={handleDraftSigningStateChange}
              />
            )}
          />
        </SectionCard>

           {/* Văn bản đính kèm */}
        <SectionCard>
          <Controller
            name="attachmentFiles"
            control={control}
            render={({ field }) => (
              <UploadFile
                {...field}
                label="VĂN BẢN ĐÍNH KÈM"
                // manualUpload
                objectId={documentId}
                objectType="docAttachments"
                id="attachmentFiles-upload"
                editFile
                useSecondaryLayout
                hiddenDownload
                isCollapsible
                isOpen={isOpen.attachmentFiles}
                onToggle={handleToggleAttachmentFiles}
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
          />
          {isOpen.replyDocuments && repliedDocuments.length > 0 && (
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
                  data={repliedDocuments}
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
          {jobProfiles.length > 0 && isOpen.jobProfile && (
            <JobProfileTableContainer container mt={1}>
              <Grid item xs={12}>
                <CustomTable
                  columns={jobProfileColumns}
                  data={jobProfiles}
                  actions={jobProfileActions}
                  onAction={handleJobProfileAction}
                  onlyTable
                  disableCheckbox
                  rowKey="id"
                  autoHeight
                />
              </Grid>
            </JobProfileTableContainer>
          )}
        </SectionCard>

        {/* Văn bản thay thế */}
        <SectionCard>
          <SectionHeaderToggle
            title="VĂN BẢN THAY THẾ"
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
                          onClick={createViewDialogHandler(row.documentId || row._id)}
                        >
                          {row.toBookTextSymbols}
                        </ClickableLink>
                      ),
                    },
                    {
                      name: "Ngày bàn hành",
                      row: "releaseDate",
                      accessor: (row) => {
                        return (
                          <ClickableLink
                            onClick={createViewDialogHandler(row.documentId || row._id)}
                          >
                            {row.releaseDate}
                          </ClickableLink>
                        )},
                    },
                    {
                      name: "Trích yếu",
                      row: "abstractNote",
                      accessor: (row) => (
                        <ClickableLink
                          onClick={createViewDialogHandler(row.documentId || row._id)}
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
                          <ClickableLink
                            onClick={createActionHandler(handlePreview, file)}
                          >
                            {file.fileName}
                          </ClickableLink>
                        )},
                    },
                    {
                      name: "Tải file",
                      row: "downloadFile",
                      accessor: (row) => {
                        const file =
                          row.files &&
                          Array.isArray(row.files) &&
                          row.files.length > 0
                            ? row.files[0]
                            : null;
                        if (!file) return null;
                        return (
                          <Tooltip title="Tải xuống">
                            <StyledActionIconButton
                              onClick={createActionHandler(
                                handleDownload,
                                file
                              )}
                            >
                              <StyledDownloadIcon />
                            </StyledActionIconButton>
                          </Tooltip>
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
      {/* Dialogs */}
      <DocumentRevocation
        open={openRecallDialog}
        onClose={handleCloseRecallDialog}
        onSave={handleSaveRecallDocument}
        sharedComponents={sharedComponents}
        initialSelectedIds={recalledDocuments.map((doc) => doc.documentId)}
      />

      {/* Popup Đơn vị nhận */}
      <ReceivingUnitDialog
        open={!!dialogOpenFor}
        onClose={handleCloseDialog}
        onSave={handleSaveUnits}
        dialogKey={dialogOpenFor}
        control={control}
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
        maxLevel={4}
      />

      {/* Popup Người nhận để biết */}
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

      <DocumentRevocation
        open={openReplaceDialog}
        onClose={handleCloseReplaceDialog}
        onSave={handleSaveReplaceDocument}
        sharedComponents={sharedComponents}
        initialSelectedIds={replacedDocuments.map((doc) => doc.documentId)}
        bpmnVersion={documentDetails?.bpmnVersion}
      />

      {/* Popup Tìm kiếm công việc đính kèm*/}
      <JobProfileSearchDialog
        open={openJobProfileSearch}
        onClose={handleCloseJobProfileSearch}
        onSave={handleSaveJobProfiles}
        isNotCallApiWithSave
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
			
			{/* ViewIncommingDoc cho Phúc đáp */}
				<ViewIncommingDoc
					open={openIncommingDocDetail}
					onClose={handleCloseIncommingDocDetail}
					documentId={selectedIncommingDocId}
					sharedComponents={sharedComponents}
					setReloadData={setReloadData}
				/>

      {/* ViewJobToDocument cho Hồ sơ công việc */}
      {selectedJobTask?.id && (
        <ViewJobToDocument
          open={openJobDetailModal}
          onClose={handleCloseJobDetailModal}
          onSuccess={handleJobDetailSuccess}
          documentId={selectedJobTask.id}
          setReloadData={setReloadData}
        />
      )}

      {/* Popup đề xuất Ký số */}
      {openStepDialog && selectedStep?.signerCount === "multi" && (
        <IsMultiSigner
          open={openStepDialog}
          onClose={handleCloseDialogStep}
          onCloseDialog={handleCloseDialogStep}
          label={selectedStep?.name || selectedStep?.title || "Đề xuất ký số"}
          actionCode={selectedStep?.lane || ""}
          targetRole={selectedStep?.lane || []}
          docId={documentId}
          dataDetail={documentDetails || dataDetail}
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
      {openStepDialog &&
        (selectedStep?.signerCount !== "multi" ||
          !selectedStep?.signerCount) && (
          <DigitalSignatureProposalPopup
            key={stepKey}
            open={openStepDialog}
            onClose={handleCloseDialogStep}
            onCloseDialog={handleCloseDialogStep}
            label={selectedStep?.name || selectedStep?.title || "Đề xuất ký số"}
            actionCode={selectedStep?.lane || ""}
            targetRole={selectedStep?.lane || []}
            docId={documentId}
            dataDetail={documentDetails || dataDetail}
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

      <ViewDialog
        open={openViewDialog}
        documentId={viewDocumentId}
        onClose={handleCloseViewDialog}
        setReloadData={setReloadData}
      />
    </BaseSwipper>
  );
};

EditDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  isLoading: PropTypes.bool,
  documentId: PropTypes.string,
  sharedComponents: PropTypes.object,
  title: PropTypes.string,
  documentType: PropTypes.number,
};

export default withSharedComponents(EditDialog);
