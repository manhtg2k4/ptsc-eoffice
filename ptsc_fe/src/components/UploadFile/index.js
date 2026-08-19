import React, {
  useCallback,
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";
import PropTypes from "prop-types";
// import axios from "axios";
import {
  Tooltip,
  CircularProgress,
  Dialog,
  Toolbar,
  Typography,
  Slide,
  Stack,
  Checkbox,
} from "@mui/material";
import {
  UploadLabel,
  UploadHeader,
  StyledPreviewAppBar,
  StyledDialogTitle,
  StyledCancelButton,
  PreviewContainer,
  PreviewContentBox,
  StyledBackdrop,
  StyledLoadingStack,
  StyledCircularProgress,
  StyledContainerUploadLabel,
  StyledIconKeyboardArrow,
  IconRequied,
  EditStyled,
  BatchSignContainer,
  StyledHeaderTitleStack,
  StyledDownloadAllButton,
  StyledCloudDownloadIcon,
  StyledContainerButtons,
  StyledButtonText,
  StyledCountBadge,
  StyledSecondaryLabelBox,
  StyledSecondaryHeader,
  StyledDocumentIcon,
  StyleDriveFileRenameOutlineOutlinedIcon,
  StyledSecondaryActionButton,
  StyledSecondaryActionStack,
  StyledBulkDeleteIconButton,
  StyledBulkDeleteIcon,
} from "@styles/UploadFile/UploadFile.style";
import CropFreeIcon from '@mui/icons-material/CropFree';
import { Close as CloseIcon} from "@mui/icons-material";
import { apiUploadFile } from "@services/FileUpload/fileUpload";
import { useToast } from "@components/common/ToastProvider";
import {
  signWithUSBToken,
  arrayBufferToBase64,
  getFileNameFromHeader,
} from "@utils/usbTokenSigning";
import {
  APP_BASE,
  // URL_TOOL_EDIT,
  // URL_DOWLOAD_EDIT_WORD,
  API_SIGN_DIGITAL,
  API_XLSX_TO_PDF,
  API_DOWNLOAD_FILE_NEW,
  API_CHECK_PERMISSION_DOWNLOAD,
} from "@EnvironmentFile/constants/urlConfig";
import CustomDialog from "@components/CustomDialog/CustomDialog";

// --- IMPORT COMPONENT BẢNG ---
import FileTableInPopup from "./components/FileTableInPopup";
import FilePreviewDialog from "./components/FilePreviewDialog";
// Import ScanDialog
import ScanDialog from "@components/Scandoc/ScanDialog";
import api from "@services/api";
import PopupGiveNumber from "./components/PopupGiveNumber";
import { useForm } from "react-hook-form";
import {
  blobFileToBase64,
  blobToBase64,
  defaultFormValues,
  defaultFormValuesOTP,
  giveNumberSchema,
  isDocumentFile,
  otpSchema,
} from "./constantGiveNumber";
import {
  convertFileToPdf,
  postGiveNumber,
  postInsertTextToPdf,
  previewFileToPdf,
  putGiveNumber,
} from "@redux/slices/GiveNumber/GiveNumberSlice";
import { useDispatch, useSelector } from "react-redux";
import * as XLSX from "xlsx";
import { yupResolver } from "@hookform/resolvers/yup";
// ❌ OnlyOffice - Đã thay thế bằng Collabora
// import OnlyOfficeEditor from "./components/OnlyOfficeEdittor";

// ✅ Collabora Online - WOPI Integration
import CollaboraEditor from "./components/CollaboraEditor";
import getSocketGetFile from "@utils/socketFileUpdate/socket";
import ViewFileBase64 from "./components/ViewFileBase64";
import PopupSignDigital from "./components/PopupSignDigital";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import CustomButton from "@components/CustomButtonBorder";
import { StyledContainerUploadFile } from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { SectionGrid } from "@pages/TextAway/Tab/SigningSubmissionTab/componentStyle/AddDialog.style";
import PopupSendOTP from "./components/PopupSendOTP";
import {
  postSignDocument,
  postSignDocumentInsertImagesAndKeywords,
  // postSignDraftDocumentInsertImagesAndKeywords,
  // postWorkItems,
  requestOtp,
  getTokenSign,
  verifyOtp,
  postSignBatch,
  verifyPdfSignature,
} from "@redux/slices/DigitalSignatureFileSlice/DigitalSignatureFileSlice";
import OtpOrPinCodeConfirmDialog from "./components/OtpOrPinCodeConfirmDialog";
import PopupCreateCertifiedCopyReport from "./components/PopupCreateCertifiedCopyReport";
import {
  clearSelectedTextCopy,
  saveCertifiedCopyRecord,
  setSelectedTextCopy,
  setSelectedImportant,
  clearSelectedImportant,
} from "@redux/slices/IncomingDocument/IncommingDocSlice";
// import { urlFileExample } from "@variable";
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { viewBase64FileWithId } from "@redux/slices/UploadFile/UploadFileSlice";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { getExampleFileByKey } from "@services/ExampleFile";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const normalizeFlag = (value) => {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  return false;
};

const resolveSignErrorMessage = async (
  error,
  fallbackMessage = "Lỗi không xác định"
) => {
  if (error instanceof Blob) {
    try {
      const text = await error.text();
      if (!text) return fallbackMessage;

      try {
        const parsed = JSON.parse(text);
        return resolveSignErrorMessage(parsed, fallbackMessage);
      } catch {
        return text;
      }
    } catch {
      return fallbackMessage;
    }
  }

  if (typeof error === "string") {
    return error || fallbackMessage;
  }

  const messageCandidates = [
    error?.message,
    error?.response?.data?.message,
    error?.data?.message,
    error?.error?.message,
  ];

  for (const candidate of messageCandidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate.join(", ");
    }

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  const nestedCandidates = [error?.response?.data, error?.data, error?.error];

  for (const candidate of nestedCandidates) {
    if (candidate && candidate !== error) {
      const nestedMessage = await resolveSignErrorMessage(
        candidate,
        fallbackMessage
      );
      if (nestedMessage && nestedMessage !== fallbackMessage) {
        return nestedMessage;
      }
    }
  }

  return fallbackMessage;
};

let isVanThuCache = null;
let checkPermissionPromise = null;

function UploadFile({
  // id,
  label = "TỆP ĐÍNH KÈM",
  value = [],
  onChange,
  isView = false,
  objectType,
  objectId,
  manualUpload = false,
  canGiveNumber = false,
  // canDigitalSign = false, //Ký số chèn ảnh và key word
  // canSignDraft = false, //Ký nháy chèn ảnh và key word
  // canSignCertificate = false, //Ký số chỉ có chứng chỉ (ko chèn ảnh và key word)
  editFile = false,
  draftSymbol,
  documentDetail,
  documentDetailFull,
  setReloadData,
  hiddenUploadAndScan = false,
  hiddenLabel = false,
  hiddenButtonScan = false,
  allowSignDigital = false,
  allowSignInitial = false, // Cho phép ký nháy
  canNotDeleteFile = false,
  setReloadDocProposal,
  setReloadDocDraft,
  setReloadDocAttachments,
  setReloadDoc,
  noneBorder,
  titleButton,
  onButtonClick,
  flags,
  isRequired = false,
  setFileDraft,
  onToggleCertifiedSign,
  onToggleImportant,
  isColumnOfTextToCopy = false,
  customLabel,
  hiddenBatchSign = false,
  isCompact = false,
  showDownloadAll = false,
  isOpen: propIsOpen,
  onToggle,
  hiddenDownload = false,
  hiddenPreview = false,
  isActionMenu = false,
  hideLabelWhenClosed = false,
  hiddenTitle = false,
	hiddenToggleIcon = false,
	disableActions = false,
  showSignatureIcon = false,
  setSignedCopyFiles, // state để lưu file ký sao y, truyền từ component cha nếu cần sử dụng cho mục đích khác (ví dụ: hiển thị ở tab khác)
  useSecondaryLayout = false,
  hiddenTable = false,
  buttonPosition = "top",
  buttonAlign = "left",
  isCollapsible = false,
  hiddenTypeAndSize = false,
  triggerBatchSign,
  resetTriggerBatchSign,
  onSigningStateChange,
  onUploadErrorChange,
  fetchOnMount = true,
  hiddenNeedCertifiedSign = false,
  allowMultipleDelete = false,
}) {
  const { dataUser } = useSelector((state) => state.auth);
  // logger.log("documentDetailFull", documentDetailFull)
  const { verificationResult } = useSelector((state) => state.digitalSignatureFile);
  const { dataFileCopy } = useSelector((state) => state.incommingDoc);
  const [files, setFiles] = useState([]);
   // const [isLoading, setIsLoading] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
  const [hasUploadError, setHasUploadError] = useState(false);

  useEffect(() => {
    if (onSigningStateChange) {
      onSigningStateChange(isUploading);
    }
  }, [isUploading, onSigningStateChange]);

  useEffect(() => {
    if (onUploadErrorChange) {
      onUploadErrorChange(hasUploadError);
    }
  }, [hasUploadError, onUploadErrorChange]);
	const [loadingGiveNumber, setLoadingGiveNumber] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const toast = useToast();
  const dispatch = useDispatch();
  const [openChoSo, setOpenChoSo] = useState(false);
  const [selectedFileForGiveNumber, setSelectedFileForGiveNumber] =
    useState(null);
  
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;
  const setIsOpen = onToggle || setInternalIsOpen;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewFileName, setPreviewFileName] = useState("");
  const [scanDialogState, setScanDialogState] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    file: null,
    index: null,
    isBulk: false,
  });
  const [selectedDeleteKeys, setSelectedDeleteKeys] = useState([]);

  const handleToggleSelectDelete = useCallback((fileUniqueKey, checked) => {
    setSelectedDeleteKeys(prev => {
      if (checked) {
        return [...prev, fileUniqueKey];
      } else {
        return prev.filter(k => k !== fileUniqueKey);
      }
    });
  }, []);

  const handleSelectAllDelete = useCallback((checked) => {
    if (checked) {
      const allKeys = files.map((file, index) => file?._id || file?.id || file?.fileId || `temp-${index}`);
      setSelectedDeleteKeys(allKeys);
    } else {
      setSelectedDeleteKeys([]);
    }
  }, [files]);
  const [iframeDialog, setIframeDialog] = useState({
    open: false,
    url: "",
    file: null,
    isLoading: false,
    nextcloudData: null,
    idEditFile: "",
  });

  const [signDigitalDialog, setSignDigitalDialog] = useState({
    open: false,
    file: null,
  });

  const [signOtpDialog, setSignOtpDialog] = useState({
    open: false,
    file: null,
    type: null,
  });

  const [signOtpInputDialog, setSignOtpInputDialog] = useState({
    open: false,
    file: null,
    type: null,
  });

  const [signOtpSignatureDialog, setSignOtpSignatureDialog] = useState({
    open: false,
    file: null,
    type: null,
  });
  const [viewerDialogOpen, setViewerDialogOpen] = useState(false);
  const [dataFileBase64, setDataFileBase64] = useState(null);

  const [tokenSigning, setTokenSigning] = useState("");
  const [otpError, setOtpError] = useState(null);
  const [tokenGenerated, setTokenGenerated] = useState(null);
  const [confirmMethod, setConfirmMethod] = useState("caSoft");
  const [selectedCertifiedSignId, setSelectedCertifiedSignId] = useState(null);
  const [openCertifiedCopyReport, setOpenCertifiedCopyReport] = useState(false);
  const [signCopyPreviewDialog, setSignCopyPreviewDialog] = useState({ open: false, file: null, url: null });
  const [selectedFileForCertifiedCopy, setSelectedFileForCertifiedCopy] =
    useState(null);
  const [selectedImportantId, setSelectedImportantId] = useState(null);
  const [selectedFileForImportant, setSelectedFileForImportant] =
    useState(null);
  const [pinCode, setPinCode] = useState("");
  const [isBatchSign, setIsBatchSign] = useState(false);
  // const [base64ContentSignImage, setBase64ContentSignImage] = useState(null); //Ảnh chữ ký phê duyệt có nền
  // const [base64ParaphSignImage, setBase64ParaphSignImage] = useState(null); //Ảnh chữ ký nháy có nền
  // const [
  //   base64ParaphSignTransparentImage,
  //   setBase64ParaphSignTransparentImage,
  // ] = useState(null); //Ảnh chữ ký nháy ko nền
  // const [base64StampSignImage, setBase64StampSignImage] = useState(null); //Ảnh chữ ký đóng dấu
  const [isVanThu, setIsVanThu] = useState(false);
  // logger.log("base64ContentSignImage", base64ContentSignImage);

  useEffect(() => {
    const checkPermission = async () => {
      if (isVanThuCache !== null) {
        setIsVanThu(isVanThuCache);
        return;
      }
      try {
        if (!checkPermissionPromise) {
          checkPermissionPromise = api.get(API_CHECK_PERMISSION_DOWNLOAD).then(res => {
            const data = res?.data || res;
            const value = !!(data && (data.isVanThu === true || String(data.isVanThu) === "true"));
            isVanThuCache = value;
            return value;
          }).catch(err => {
            checkPermissionPromise = null;
            throw err;
          });
        }
        const value = await checkPermissionPromise;
        setIsVanThu(value);
      } catch (error) {
        logger.error("Lỗi kiểm tra quyền download:", error);
      }
    };
    checkPermission();
  }, []);

  // Ref chứa thẻ a ẩn để download an toàn
  const downloadRef = useRef(null);

  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = React.useRef(value);
  valueRef.current = value;
  const qrBasePath = `${window.location.origin}/View_QR`;
  const typeOfProcess = documentDetail?.document?.typeOfProcess?.id || ''

  const getQrPathByFileId = useCallback(
    (fileId) => {
      const documentIdObj = documentDetail?.document?.documentId;
      const docId = objectId ||
                    documentDetailFull?.document?.documentId || 
                    (typeof documentIdObj === 'object' && documentIdObj !== null ? documentIdObj.id : documentIdObj) || 
                    '';
      logger.log('docId', docId)
      if (fileId && docId && ["KY_SO_BIEN_BAN", "PAYMENT_2_SIGNER", "VBDI_KY_SO_PHONG_CNTT","QUY_TRINH_KY_UQ"].includes(typeOfProcess)) return `${qrBasePath}/${docId}`;
      return "";
    },
    [qrBasePath, typeOfProcess, documentDetailFull, documentDetail, objectId]
  );
  // --- LOGIC HIỂN THỊ ---
  const flagSign =
    documentDetail?.flags?.canSignContentDraft ||
    documentDetail?.flags?.canSignFormatDraft ||
    documentDetail?.flags?.canReportSigner;
  const showLabel = !hiddenLabel;
  const showButtons = !isView && !hiddenUploadAndScan;
  const showHeader = showLabel || showButtons;
  // logger.log('documentDetailFull', documentDetailFull)
  const canCreateFileCopy =
    documentDetailFull?.flags?.canCreateFileCopy ?? false;
  // const canCreateFileCopy = documentDetailFull?.availableActions?.some((item => item.type === "createFileCopy")) ?? false;
  
	const signKey = useMemo(() => {
		return documentDetail?.signKey?.keySign
	}, [documentDetail])

	const {
    control,
    reset,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
  } = useForm({
    defaultValues: defaultFormValues,
    resolver: yupResolver(giveNumberSchema),
  });

  // Form riêng cho OTP ký số
  const {
    control: controlOtp,
    reset: resetOtp,
    handleSubmit: handleSubmitOtp,
    formState: { errors: errorsOtp },
    setError: setErrorOtp,
    // setValue: setValueOtp,
    // getValues: getValuesOtp,
  } = useForm({
    defaultValues: defaultFormValuesOTP,
    resolver: yupResolver(otpSchema),
  });

  const resolveActiveActionType = useCallback((availableActions = []) => {
    const actionTypes = new Set(availableActions.map((item) => item?.type));
    const actionPriority = [
      "stampDoc",
      "reportSigner",
      "signCopy",
      "signFormatDraft",
      "signContentDraft",
			'officialSigner1',
			'officialSigner2',
			'officialSigner3',
    ];
    const matchedActionTypes = actionPriority.filter((type) =>
      actionTypes.has(type)
    );
    const activeActionType = actionPriority.find((type) =>
      actionTypes.has(type)
    );
    return { activeActionType, matchedActionTypes };
  }, []);

  /*
  const fetchSignatureImageByActionType = useCallback(
    async (actionType) => {
      if (!actionType) return;

      const isBackGroundImg = documentDetail?.signKey?.isBackground;
      let targetId = null;
      let setter = null;

      if (actionType === "signFormatDraft" || actionType === "signContentDraft") {
        if (isBackGroundImg) {
          targetId = dataUser?.paraphSignTransparentImage; // Ảnh ko nền
          // targetId = dataUser?.paraphSignImage;
          setter = setBase64ParaphSignImage;
        } else {
          targetId = dataUser?.paraphSignTransparentImage;
          setter = setBase64ParaphSignTransparentImage;
        }
      } else if (
        actionType === "reportSigner" ||
        actionType === "signCopy" ||
        actionType === "officialSigner1" ||
        actionType === "officialSigner2" ||
        actionType === "officialSigner3"
      ) {
        targetId = dataUser?.paraphSignTransparentImage; // Ảnh ko nền
        // targetId = dataUser?.contentSignImage;
        setter = setBase64ContentSignImage;
      } else if (actionType === "stampDoc") {
        targetId = dataUser?.stampSignImage;
        setter = setBase64StampSignImage;
      }

      if (!targetId || !setter) return;

      try {
        const blob = await dispatch(viewBase64FileWithId(targetId)).unwrap();
        setter(blob ? await blobFileToBase64(blob) : null);
      } catch (error) {
        logger.error("Lỗi lấy ảnh chữ ký base64:", error);
        setter(null);
      }
    },
    [
      dispatch,
      // dataUser?.contentSignImage,
      // dataUser?.paraphSignImage,
      dataUser?.paraphSignTransparentImage,
      dataUser?.stampSignImage,
      documentDetail?.signKey?.isBackground,
    ]
  );

  const fetchFileBase64ForSign = useCallback(
    async (file) => {
      const fileId = file?._id || file?.id || file?.fileId;
      if (!fileId) return null;
      logger.log('fileId', fileId)

      try {
        const blob = await dispatch(viewBase64FileWithId(fileId)).unwrap();
        return blob ? await blobFileToBase64(blob) : null;
      } catch (error) {
        logger.error("Lỗi lấy base64 file ký số:", error);
        return null;
      }
    },
    [dispatch]
  );
  */

  const fetchFileBase64ForSign = useCallback(
    async (file) => {
      const fileId = file?._id || file?.id || file?.fileId;
      if (!fileId) return null;

      try {
        const blob = await dispatch(viewBase64FileWithId(fileId)).unwrap();
        return blob ? await blobFileToBase64(blob) : null;
      } catch (error) {
        logger.error("Lỗi lấy base64 file ký số:", error);
        return null;
      }
    },
    [dispatch]
  );
  useEffect(() => {
    if (files.length > 0 && !isOpen) {
      if (onToggle) {
        onToggle();
      } else {
        setInternalIsOpen(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  useEffect(() => {
    if (!files || files.length === 0) {
      setSelectedCertifiedSignId(null);
      setSelectedFileForCertifiedCopy(null);
      return;
    }

    if (selectedCertifiedSignId) {
      const matchedSelected = files.find((file, idx) => {
        const key = file?._id || file?.id || file?.fileId || `temp-${idx}`;
        return key === selectedCertifiedSignId;
      });

      if (matchedSelected && matchedSelected !== selectedFileForCertifiedCopy) {
        setSelectedFileForCertifiedCopy(matchedSelected);
      }
      if (matchedSelected) return;

      // Selection is stale after reload; clear to allow fallback to isCertifiedCopy
      setSelectedCertifiedSignId(null);
      setSelectedFileForCertifiedCopy(null);
    }

    const certifiedFile = files.find((file) =>
      normalizeFlag(file?.isCertifiedCopy)
    );
    if (!certifiedFile) return;

    const certifiedKey =
      certifiedFile?._id ||
      certifiedFile?.id ||
      certifiedFile?.fileId ||
      `temp-${files.indexOf(certifiedFile)}`;

    setSelectedCertifiedSignId(certifiedKey);
    setSelectedFileForCertifiedCopy(certifiedFile);
  }, [files, selectedCertifiedSignId, selectedFileForCertifiedCopy]);

  useEffect(() => {
    if (!files || files.length === 0) {
      setSelectedImportantId(null);
      setSelectedFileForImportant(null);
      return;
    }

    if (selectedImportantId) {
      const matchedSelected = files.find((file, idx) => {
        const key = file?._id || file?.id || file?.fileId || `temp-${idx}`;
        return key === selectedImportantId;
      });

      if (matchedSelected && matchedSelected !== selectedFileForImportant) {
        setSelectedFileForImportant(matchedSelected);
      }
      if (matchedSelected) return;

      setSelectedImportantId(null);
      setSelectedFileForImportant(null);
    }

    const importantFile = files.find((file) =>
      normalizeFlag(file?.isImportant)
    );
    if (!importantFile) return;

    const importantKey =
      importantFile?._id ||
      importantFile?.id ||
      importantFile?.fileId ||
      `temp-${files.indexOf(importantFile)}`;

    setSelectedImportantId(importantKey);
    setSelectedFileForImportant(importantFile);
  }, [files, selectedImportantId, selectedFileForImportant]);

  const profileUser = dataUser;

  const getSignatureImageId = useCallback((actionType) => {
    // const isBackGroundImg = documentDetail?.signKey?.isBackground;
    let targetId = null;

    if (actionType === "signFormatDraft" || actionType === "signContentDraft") {
      targetId = dataUser?.paraphSignTransparentImage;
    } else if (
      actionType === "reportSigner" ||
      actionType === "signCopy" ||
      actionType === "officialSigner1" ||
      actionType === "officialSigner2" ||
      actionType === "officialSigner3"
    ) {
      targetId = dataUser?.contentSignImage || dataUser?.paraphSignTransparentImage;
    } else if (actionType === "stampDoc") {
      targetId = dataUser?.stampSignImage;
    }

    if (!targetId) return "";
    if (typeof targetId === "object") {
      return targetId._id || targetId.id || "";
    }
    return targetId;
  }, [dataUser]);

  // 1. Thêm hàm lấy danh sách file cũ (Lịch sử/Dự thảo cũ)
  const refetchFilesOld = useCallback(async () => {
    if (!objectId || !objectType || manualUpload) {
      // Logic clean up nếu cần
      return;
    }

    // setIsLoading(true); // Có thể bỏ loading ở đây để tránh nháy loading 2 lần
    try {
      const url = `${APP_BASE}/api/files/old-by-object?object_type=${objectType}&object_id=${objectId}`;
      const response = await api.get(url, { timeout: 0 });
      const rawFiles = response.data.data || response.data || [];

      // ⚠️ LƯU Ý: Nếu bạn muốn hiển thị riêng, hãy dùng setOldFiles(rawFiles)
      // Nếu dùng setFiles(rawFiles) ở đây nó sẽ tranh chấp với refetchFiles()
      // setFiles(rawFiles);
      logger.log("Danh sách file cũ đã tải:", rawFiles);
    } catch (error) {
      // logger.error("Lỗi tải danh sách tệp cũ", error);
      logger.error("Lỗi tải danh sách tệp cũ", error);
    }
  }, [objectId, objectType, manualUpload]);

  // 2. Hàm lấy danh sách file mới nhất (Giữ nguyên của bạn)
  const refetchFiles = useCallback(async (options = {}) => {
    const { shouldReloadDoc = true } = options;
    if (!objectId || !objectType || manualUpload) {
      if (manualUpload && Array.isArray(valueRef.current)) {
        setFiles(valueRef.current);
      } else {
        setFiles([]);
      }
      return;
    }
    // setIsLoading(true);
    setIsUploading(true);
    try {
      const url = `${APP_BASE}/api/files/latest-by-object?object_type=${objectType}&object_id=${objectId}`;
      const response = await api.get(url, { timeout: 0 });
      const rawFiles = response?.data?.data || response?.data || [];
      if (Array.isArray(rawFiles)) {
        rawFiles.sort((a, b) => {
          const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
          const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
          if (timeA && timeB && timeA !== timeB) return timeA - timeB;
          const idA = a.id || a._id;
          const idB = b.id || b._id;
          if (idA > idB) return 1;
          if (idA < idB) return -1;
          return 0;
        });
      }
      const filesData = rawFiles?.map((f) => ({
        ...f,
        isSignedFile: f.is_signed_file ?? f.isSignedFile ?? 0,
        isCertifiedCopy: normalizeFlag(
          f.isCertifiedCopy ?? f.is_certified_copy
        ),
        isImportant: normalizeFlag(
          f.isImportant ?? f.is_important
        ),
      }));
      setFiles((prevFiles) => {
        const prevErrorFiles = prevFiles.filter((f) => f.hasError === true);
        const mergedFiles = [...filesData, ...prevErrorFiles];
        if (onChangeRef.current) onChangeRef.current(mergedFiles);
        if (setFileDraft) setFileDraft(mergedFiles);
        return mergedFiles;
      });
      if (shouldReloadDoc && setReloadDoc) setReloadDoc(Date.now());
    } catch (error) {
			const messageError = error?.response?.data?.message || error?.message || "Lỗi tải danh sách tệp đính kèm";
      logger.log(messageError, error);
      toast(messageError, "error");
    } finally {
      // setIsLoading(true);
      setIsUploading(false);
    }
  }, [objectId, objectType, manualUpload, toast, setFileDraft, setReloadDoc]);

  // 3. useEffect XỬ LÝ SOCKET (Đã thêm refetchFilesOld)
  useEffect(() => {
    if (!objectId || !objectType) return;

    const socket = getSocketGetFile({ objectId, objectType });

    const handleFileUpdated = (dataFromBE) => {
      // Dùng logger.log hoặc logger.log tùy project của bạn
      logger.log("⚡ Socket nhận sự kiện 'fileUpdateSuccess':", dataFromBE);

      // A. Gọi API lấy danh sách mới nhất
      refetchFiles();

      // B. Gọi API lấy danh sách cũ (Đã thêm theo yêu cầu)
      refetchFilesOld();

      // C. Reload các component cha
      const currentTime = new Date().getTime();
      if (setReloadData) setReloadData(currentTime);
      if (setReloadDocProposal) setReloadDocProposal(currentTime);
      if (setReloadDocDraft) setReloadDocDraft(currentTime);
      if (setReloadDocAttachments) setReloadDocAttachments(currentTime);
    };

    socket.on("fileUpdateSuccess", handleFileUpdated);

    return () => {
      logger.log("🔌 Ngắt kết nối socket fileUpdateSuccess");
      socket.off("fileUpdateSuccess", handleFileUpdated);
    };
  }, [
    objectId,
    objectType,
    refetchFiles,
    refetchFilesOld, // Nhớ thêm dependency này
    setReloadData,
    setReloadDocProposal,
    setReloadDocDraft,
    setReloadDocAttachments,
  ]);

  useEffect(() => {
    if (fetchOnMount) {
      refetchFiles({ shouldReloadDoc: false });
    }
  }, [refetchFiles, fetchOnMount]);

  useEffect(() => {
    if ((!fetchOnMount || manualUpload) && value) {
      setFiles(value);
    }
  }, [value, fetchOnMount, manualUpload]);

  useEffect(() => {
    if (Array.isArray(value)) {
      const containsError = value.some((file) => file.hasError === true);
      setHasUploadError(containsError);
    }
  }, [value]);

  const selectedFileRef = useRef(selectedFileForGiveNumber);

  useEffect(() => {
    selectedFileRef.current = selectedFileForGiveNumber;
  }, [selectedFileForGiveNumber]);

  // Đồng bộ selectedFileForGiveNumber ra component cha qua setSignedCopyFiles (nếu được truyền vào)
  useEffect(() => {
    if (setSignedCopyFiles) {
      setSignedCopyFiles(selectedFileForCertifiedCopy);
    }
  }, [selectedFileForCertifiedCopy, setSignedCopyFiles]);

  const processUploadFiles = async (inputFiles) => {
    if (!inputFiles || inputFiles.length === 0) return;
    // setIsLoading(true);
    setIsUploading(true);
    setHasUploadError(false);
    let successCount = 0;
    let duplicateCount = 0;
    const newTempFiles = [];

    try {
      for (const file of inputFiles) {
        const isDuplicate = files.some(
          (f) => (f.name || f.fileName || f.file_name) === file.name
        );
        if (isDuplicate) {
          duplicateCount++;
          continue;
        }

        if (manualUpload) {
          const blobUrl = URL.createObjectURL(file);
          const tempFile = {
            name: file.name,
            fileName: file.name,
            rawFile: file,
            path: blobUrl,
            _id: null,
            size: file.size,
            mimetype: file.type,
          };
          newTempFiles.push(tempFile);
        } else {
          try {
            await apiUploadFile(file, objectType, objectId);
            successCount++;
          } catch (err) {
            logger.error(`Lỗi upload file ${file.name}:`, err);
            const tempErrorFile = {
              name: file.name,
              fileName: file.name,
              rawFile: file,
              _id: `error-${Date.now()}-${Math.random()}`,
              size: file.size,
              mimetype: file.type,
              hasError: true,
            };
            newTempFiles.push(tempErrorFile);
            setHasUploadError(true);
          }
        }
      }

      if (manualUpload) {
        const updatedFiles = [...files, ...newTempFiles];
        setFiles(updatedFiles);
        if (onChange) onChange(updatedFiles);
      } else {
        const url = `${APP_BASE}/api/files/latest-by-object?object_type=${objectType}&object_id=${objectId}`;
        const response = await api.get(url, { timeout: 0 });
        const rawFiles = response?.data?.data || response?.data || [];
        if (Array.isArray(rawFiles)) {
          rawFiles.sort((a, b) => {
            const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
            const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
            if (timeA && timeB && timeA !== timeB) return timeA - timeB;
            const idA = a.id || a._id;
            const idB = b.id || b._id;
            if (idA > idB) return 1;
            if (idA < idB) return -1;
            return 0;
          });
        }
        const filesData = rawFiles?.map((f) => ({
          ...f,
          isSignedFile: f.is_signed_file ?? f.isSignedFile ?? 0,
          isCertifiedCopy: normalizeFlag(f.isCertifiedCopy ?? f.is_certified_copy),
          isImportant: normalizeFlag(f.isImportant ?? f.is_important),
        }));

        setFiles((prevFiles) => {
          const prevErrorFiles = prevFiles.filter((f) => f.hasError === true);
          const mergedFiles = [...filesData, ...prevErrorFiles, ...newTempFiles];
          if (onChange) onChange(mergedFiles);
          return mergedFiles;
        });

        if (successCount > 0) {
          toast(`Tải lên thành công ${successCount} tệp!`, "success");
        }
        if (newTempFiles.length > 0) {
          toast(`Có ${newTempFiles.length} tệp tải lên thất bại.`, "error");
        }
      }

      if (duplicateCount > 0) {
        toast(`Bỏ qua ${duplicateCount} tệp đã tồn tại.`, "warning");
      }
    } catch (error) {
			const messageError = error?.response?.data?.message || error?.message || "Lỗi kết nối server!";
      toast(messageError, "error");
      setHasUploadError(true);
      if (!manualUpload) {
        await refetchFiles();
      }
    } finally {
      // setIsLoading(true);
      setIsUploading(false);
      setReloadDocProposal && setReloadDocProposal(new Date() * 1);
      setReloadDocDraft && setReloadDocDraft(new Date() * 1);
      setReloadDocAttachments && setReloadDocAttachments(new Date() * 1);
    }
  };

  const handleUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files);
    await processUploadFiles(selectedFiles);
    event.target.value = null;
    setIsOpen(true);
  };

  const handleSaveScan = async (file) => {
    setIsScanning(true);
    const filesToUpload = Array.isArray(file) ? file : [file];
    await processUploadFiles(filesToUpload);
    setIsScanning(false);
    setScanDialogState(null);
  };

  // ... (Giữ nguyên logic handleRemove, handleDeleteClick...)
  const handleRemove = useCallback(
    async (index, file) => {
      // 1. Kiểm tra xem file có ID từ server chưa (chấp nhận cả _id và id)
      const fileId = file?._id || file?.id;

      // TRƯỜNG HỢP 1: File chưa lưu (Manual Upload hoặc chưa có ID) -> Xóa Local
      if (!file || !fileId || file.hasError) {
        const updatedFiles = files.filter((_, i) => i !== index);
        setFiles(updatedFiles);
        if (onChange) onChange(updatedFiles);
        toast("Đã xóa tệp khỏi danh sách.", "success");
        return;
      }

      // TRƯỜNG HỢP 2: File đã có trên Server -> Gọi API Xóa
      // setIsLoading(true);
      setIsUploading(true);
      try {
        // Sử dụng fileId đã lấy ở trên
        const url = `/api/files/${fileId}`;

        await api.delete(url, {
          timeout: 30000,
        });

        // Nếu xóa thành công
        toast("Xóa tệp thành công.", "success");

        // Gọi lại danh sách file mới nhất từ server để đồng bộ
        if (!manualUpload && objectType && objectId) {
          await refetchFiles();
        } else {
          // Nếu là manualUpload nhưng xóa file đã có ID, cần cập nhật state
          const updatedFiles = files.filter((_, i) => i !== index);
          setFiles(updatedFiles);
          if (onChangeRef.current) onChangeRef.current(updatedFiles);
        }
      } catch (error) {
				const messageError = error?.response?.data?.message || error.message || error?.error?.message || "Xóa tệp không thành công. Vui lòng thử lại!";
        logger.log("Lỗi xóa file:", error);
        toast(messageError, "error");
      } finally {
        // setIsLoading(true);
        setIsUploading(false);
      }
    },
    [files, onChange, toast, refetchFiles, manualUpload, objectType, objectId]
  );

  const handleBulkRemove = useCallback(async () => {
    setIsUploading(true);
    try {
      const serverFileIds = [];
      const localIndices = [];
      
      selectedDeleteKeys.forEach((key) => {
        const fileIndex = files.findIndex((f, idx) => {
          const fKey = f?._id || f?.id || f?.fileId || `temp-${idx}`;
          return fKey === key;
        });
        if (fileIndex !== -1) {
          const file = files[fileIndex];
          const fileId = file?._id || file?.id;
          if (!file || !fileId || file.hasError) {
            localIndices.push(fileIndex);
          } else {
            serverFileIds.push(fileId);
          }
        }
      });

      if (serverFileIds.length > 0) {
        await Promise.all(
          serverFileIds.map(fileId => api.delete(`/api/files/${fileId}`, { timeout: 30000 }))
        );
      }

      toast("Xóa các tệp thành công.", "success");
      setSelectedDeleteKeys([]);

      if (!manualUpload && objectType && objectId) {
        await refetchFiles();
      } else {
        setFiles(prev => {
          const updated = prev.filter((f, idx) => {
            const fKey = f?._id || f?.id || f?.fileId || `temp-${idx}`;
            return !selectedDeleteKeys.includes(fKey);
          });
          if (onChangeRef.current) onChangeRef.current(updated);
          return updated;
        });
      }
    } catch (error) {
      const messageError = error?.response?.data?.message || error.message || error?.error?.message || "Xóa các tệp không thành công. Vui lòng thử lại!";
      logger.log("Lỗi xóa các file:", error);
      toast(messageError, "error");
    } finally {
      setIsUploading(false);
    }
  }, [selectedDeleteKeys, files, toast, refetchFiles, manualUpload, objectType, objectId]);

  const handleDeleteClick = useCallback((index, file) => {
    setDeleteConfirm({ open: true, file, index, isBulk: false });
  }, []);

  const handleBulkDeleteClick = useCallback(() => {
    setDeleteConfirm({ open: true, file: null, index: null, isBulk: true });
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    setDeleteConfirm({ open: false, file: null, index: null, isBulk: false });
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirm.isBulk) {
      handleBulkRemove();
    } else {
      handleRemove(deleteConfirm.index, deleteConfirm.file);
    }
    handleCloseDeleteDialog();
  }, [deleteConfirm, handleRemove, handleBulkRemove, handleCloseDeleteDialog]);

  // ... (Giữ nguyên handlePreview, handleOpenSignDigitalDialog...)
  const handlePreview = useCallback(
    async (file) => {
      const fileName = file.fileName || file.name || file.file_name || "file";
      const lower = fileName.toLowerCase();

      const isDoc = /\.(doc|docx)$/i.test(lower);
      const isExcel = /\.(xls|xlsx)$/i.test(lower);
      const isPpt = /\.(ppt|pptx)$/i.test(lower);
      const isOtherOffice = isPpt;
      const isBrowserFile = /\.(pdf|jpeg|jpg|png|gif|webp|txt)$/i.test(lower);

      if (file.rawFile instanceof File && !file._id) {
        // setIsLoading(true);
        setIsUploading(true);
        try {
          if (isDoc || isExcel) {
            const formData = new FormData();
            formData.append("file", file.rawFile);

            let urlEndpoint;
            if (isDoc) {
              urlEndpoint = `${APP_BASE}/api/file-to-pdf`;
            } else {
              urlEndpoint = API_XLSX_TO_PDF;
            }

            const response = await api.post(urlEndpoint, formData, {
              responseType: "blob",
              timeout: 0,
            });

            const pdfBlob = new Blob([response.data], {
              type: "application/pdf",
            });
            setPreviewUrl(URL.createObjectURL(pdfBlob));
            setPreviewFileName(fileName);
            setPreviewOpen(true);
            return;
          }
          if (isOtherOffice) {
            const arrayBuffer = await file.rawFile.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: "array" });
            const htmlString = XLSX.utils.sheet_to_html(
              workbook.Sheets[workbook.SheetNames[0]]
            );
            const htmlBlob = new Blob([htmlString], { type: "text/html" });
            setPreviewUrl(URL.createObjectURL(htmlBlob));
            setPreviewFileName(fileName);
            setPreviewOpen(true);
            return;
          }
          if (isBrowserFile) {
            const blobUrl = URL.createObjectURL(file.rawFile);
            setPreviewUrl(blobUrl);
            setPreviewFileName(fileName);
            setPreviewOpen(true);
            return;
          }
          toast("Định dạng không hỗ trợ xem trước khi chưa lưu.", "warning");
        } catch (e) {
          const status = e?.response?.status || e?.status;
          if (status === 403) {
            toast("Bạn không có quyền xem tài liệu này.", "error");
          } else {
            toast("Không thể xem trước file này.", "error");
          }
        } finally {
          // setIsLoading(true);
          setIsUploading(false);
        }
        return;
      }

      if (file._id || file.id) {
        // setIsLoading(true);
        setIsUploading(true);
        const fileId = file._id || file.id;

        try {
          let blob;
          let previewName = fileName;

          if (isDoc) {
            const conversionApi = `${APP_BASE}/api/doc-url-to-pdf?id=${fileId}`;
            const res = await api.get(conversionApi, {
              responseType: "blob",
              timeout: 0,
            });
            blob = new Blob([res.data], { type: "application/pdf" });
            previewName = fileName;
          } else if (isExcel) {
            // Download file first
            const downloadUrl = `${APP_BASE}/api/files/download/${fileId}`;
            const fileRes = await api.get(downloadUrl, {
              responseType: "blob",
              timeout: 0,
            });

            // Convert to PDF
            const formData = new FormData();
            formData.append("file", new File([fileRes.data], fileName));
            formData.append("fileId", fileId);

            const res = await api.post(API_XLSX_TO_PDF, formData, {
              responseType: "blob",
              timeout: 0,
            });

            blob = new Blob([res.data], { type: "application/pdf" });
            previewName = fileName;
          } else if (isBrowserFile) {
            const viewUrl = `${APP_BASE}/api/files/view/${fileId}`;
            const res = await api.get(viewUrl, {
              responseType: "blob",
              timeout: 100000,
            });
            blob = new Blob([res.data], {
              type: res.headers["content-type"] || res.data.type,
            });
          } else if (isOtherOffice) {
            const viewUrl = `${APP_BASE}/api/files/view/${fileId}`;
            const res = await api.get(viewUrl, {
              responseType: "blob",
              timeout: 100000,
            });
            const arrayBuffer = await res.data.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: "array" });
            const html = XLSX.utils.sheet_to_html(
              workbook.Sheets[workbook.SheetNames[0]]
            );
            blob = new Blob([html], { type: "text/html" });
            previewName = fileName;
          } else {
            throw new Error("Định dạng file không được hỗ trợ xem trước.");
          }

          // Gọi API xác thực chữ ký số nếu là file PDF
          if (lower.endsWith(".pdf")) {
            dispatch(verifyPdfSignature(fileId));
          }

          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          setPreviewFileName(previewName);
          setPreviewOpen(true);
        } catch (e) {
          const status = e?.response?.status || e?.status;
          if (status === 403) {
            toast("Bạn không có quyền xem tài liệu này.", "error");
          } else {
            toast("Không thể xem trước tài liệu.", "error");
          }
        } finally {
          // setIsLoading(true);
          setIsUploading(false);
        }
        return;
      }
      toast("Không xác định được nguồn file để xem trước.", "error");
    },
    [toast, dispatch]
  );

  const handleCloseCertifiedCopyReport = useCallback(() => {
    setOpenCertifiedCopyReport(false);
  }, []);
  // ... (Các hàm SignDigital, Edit, Scan, GiveNumber... GIỮ NGUYÊN)
  const handleOpenSignDigitalDialog = useCallback(
    (file) => {
      setIsBatchSign(false);
      // const { activeActionType } = resolveActiveActionType(
      //   documentDetail?.availableActions || []
      // );
      // fetchSignatureImageByActionType(activeActionType);
      setSignOtpDialog({ open: true, file: file });
      handleCloseCertifiedCopyReport();
    },
    [
      // documentDetail?.availableActions,
      // fetchSignatureImageByActionType,
      handleCloseCertifiedCopyReport,
      // resolveActiveActionType,
    ]
  );

  const handleCloseSignDigitalDialog = useCallback(() => {
    setSignDigitalDialog({ open: false, file: null });
  }, []);

  const handleConfirmOtpDialog = useCallback(async () => {
    setIsOtpLoading(true);
    setOtpError(null);
    try {
      const token = await dispatch(getTokenSign()).unwrap();
      const otpResponse = await dispatch(requestOtp(token)).unwrap();
      if (otpResponse?.success === false) {
        throw otpResponse;
      }

      const toastMsg =
        otpResponse?.message ||
        "OTP đã được gửi thành công đến email/số điện thoại của bạn.";
      const hasPartialDeliveryError = Boolean(
        otpResponse?.emailError || otpResponse?.phoneError
      );
      toast(toastMsg, hasPartialDeliveryError ? "warning" : "success");

      setTokenGenerated(token);
      const fileToSign = signOtpDialog.file;
      const type = signOtpDialog.type || null;
      setSignOtpDialog({ open: false, file: null, type: null });
      setSignOtpInputDialog({
        open: true,
        file: fileToSign,
        type,
      });
    } catch (error) {
      logger.log("Lỗi gửi OTP:", error);
      setTokenGenerated(null);
      setOtpError(error?.message || error?.error || "Gửi OTP thất bại. Vui lòng thử lại.");
    } finally {
      setIsOtpLoading(false);
    }
  }, [dispatch, setIsOtpLoading, signOtpDialog, toast, profileUser]);

  const handleConfirmPinCodeDialog = useCallback(async () => {
    setIsOtpLoading(true);
    setOtpError(null);
    try {
      const token = await dispatch(getTokenSign()).unwrap();
      setTokenSigning(token);
      const fileToSign = signOtpDialog.file;
      const type = signOtpDialog.type || null;
      setSignOtpDialog({ open: false, file: null, type: null });
      setSignOtpInputDialog({
        open: true,
        file: fileToSign,
        type,
      });
    } catch (error) {
      logger.log("Lỗi lấy token ký số:", error);
      setOtpError(error?.message || "Lỗi lấy token ký số. Vui lòng thử lại.");
    } finally {
      setIsOtpLoading(false);
    }
  }, [dispatch, signOtpDialog, setTokenSigning]);

  const handleSubmitConfirmOtpOrPinCode = useMemo(() => {
    return confirmMethod === "caSoft"
      ? handleConfirmOtpDialog
      : handleConfirmPinCodeDialog;
  }, [confirmMethod, handleConfirmOtpDialog, handleConfirmPinCodeDialog]);

  const handleCloseOtpInputDialog = useCallback(() => {
    setSignOtpInputDialog({ open: false, file: null, type: null });
    resetOtp();
  }, [resetOtp]);

  const handleCloseSignOtpDialog = useCallback(() => {
    setSignOtpSignatureDialog({ open: false, file: null, type: null });
    setIsBatchSign(false);
  }, []);

  // logger.log("Chi tiết vb đi:", documentDetail);
  //Hàm ký số với OTP
  const handleConfirmSignWithOtp = useCallback(
		async (formData, fileOverride, typeOverride, tokenSigningOverride) => {
			// logger.log('tokenSigningOverride', tokenSigningOverride)
      const file = fileOverride || signOtpSignatureDialog.file;
      const { reason, location } = formData;
      const availableActions = documentDetail?.availableActions || [];
      const { activeActionType, matchedActionTypes } =
        resolveActiveActionType(availableActions);
      const finalActionCode =
        availableActions.find((item) => item.type === activeActionType)?.code || "";
      const resolvedSignatureImageId = getSignatureImageId(activeActionType);
			// logger.log("resolvedSignatureImageId", resolvedSignatureImageId)
      if (!activeActionType) {
        toast("Không xác định được loại ký từ availableActions!", "error");
        return;
      }

      if (matchedActionTypes.length > 1) {
        logger.warn("availableActions bị overlap, đang dùng signMode theo ưu tiên:", {
          matchedActionTypes,
          activeActionType,
        });
      }

      if (!resolvedSignatureImageId) {
        toast("Chưa cấu hình ảnh chữ ký cho loại ký đang chọn!", "error");
        return;
      }

      if (!file) {
        toast("Không có file để ký!", "error");
        return;
      }

      const effectiveTokenSigning = tokenSigningOverride || "";
      if (!effectiveTokenSigning) {
        toast("Vui lòng lấy và xác thực OTP trước khi ký.", "error");
        return;
      }

      setIsUploading(true);
      try {
        const originalFileId = file._id || file.id;
        // const fileSignBase64 =
        //   file?.base64 || (await fetchFileBase64ForSign(file));
        const fileSignInfo = {
          fileName:
            file?.file_name || file?.fileName || file?.name || "",
          filePath: file?.file_path || file?.path || "",
          mimeType: file?.mime_type || file?.mimetype || file?.type || "",
          // base64: fileSignBase64 || "",
          id: String(file?.id || file?._id || ""),
        };
        // Tạo payload JSON gửi đến backend theo loại ký đồng nhất với BE
        const resolvedQrPath = getQrPathByFileId(originalFileId);
        const payloadToSend = {
          docId: objectId || "",
          workItemId: documentDetail?.workItem?.id || null,
          id: originalFileId, // BE yêu cầu number, truyền ID file
          actionCode: finalActionCode || "",
          type: activeActionType || "",
          reason: reason || "Ký số điện tử",
          location: location || "Việt Nam",
          username: profileUser?.username,
          password: "12345678",
          signatureLevel: "B",
          typeSign: (activeActionType === "signFormatDraft" || activeActionType === "signContentDraft") ? "draft" : "digital",
          isBackground: documentDetail?.signKey?.isBackground ?? false,
          keyword: signKey || "",
          ...(resolvedQrPath ? { qrPath: resolvedQrPath } : {}),
          imageSign: resolvedSignatureImageId || "",
          tokenAccessSign: tokenGenerated?.token || tokenGenerated || "",
          isOTP: true,
          isIncommingDoc: documentDetail?.document?.isIncomming,
          fileSign: fileSignInfo,
        };
 
        /*
        const createImageMetadata = (width, height) => [
          {
            keyWord: keyWord || documentDetail?.signKey?.keySign || "",
            imagesBase: payloadBase64ImgDigital,
            width,
            height,
          },
        ];
        */

        /*
        if (activeActionType === "signFormatDraft") {
          // Ký nháy
          payloadToSend.imageMetadata = createImageMetadata(60, 40);
        } else if (isReportAction) {
          // Ký phê duyệt (Ký phát hành)
          payloadToSend.base64Image = payloadBase64ImgDigital;
          payloadToSend.keyword = keyWord || documentDetail?.signKey?.keySign || "";
          payloadToSend.imageMetadata = createImageMetadata(100, 80);
        } else if (activeActionType === "stampDoc") {
          payloadToSend.base64Image = payloadBase64ImgDigital;
          payloadToSend.keyword = keyWord || documentDetail?.signKey?.keySign || "";
          payloadToSend.imageMetadata = createImageMetadata(85, 85);
        }
        */

        logger.log("activeActionType", activeActionType);
        logger.log("Payload gửi lên:", payloadToSend);

        // //Đoạn for để log check body gửi lên
        // const formDataObject = {};
        // for (const [key, value] of formDataToSend.entries()) {
        //   formDataObject[key] = value;
        // }
        // logger.log("Body gửi lên:", formDataObject);


        // Các action OTP hiện tại đều là ký có chèn ảnh và keyword.
        const thunkAction = postSignDocumentInsertImagesAndKeywords;

        await dispatch(
          thunkAction({
            tokenSigning: effectiveTokenSigning,
            tokenSign: tokenGenerated,
            body: payloadToSend,
            params: documentDetail?.document?.isAuthority ? { isAuthority: true } : {},
          })
        ).unwrap();
        // let res = null;
        // logger.log("Kết quả ký số với OTP:", res);
        toast("Ký số thành công!", "success");

        /* 
         // Lấy file đã ký từ response và upload vào API_UPLOAD_FILESS
         if (res && res.data) {
           try {
             // res.data có thể là Blob, ArrayBuffer hoặc base64 string -> chuẩn hóa về Blob pdf
             let signedFileBlob;
 
             if (res.data instanceof Blob) {
               signedFileBlob = res.data;
             } else if (res.data instanceof ArrayBuffer) {
               signedFileBlob = new Blob([res.data], {
                 type: "application/pdf",
               });
             } else if (typeof res.data === "string") {
               // Trường hợp backend trả base64 string
               const isBase64Pdf = /^([A-Za-z0-9+/=]+)$/.test(res.data.trim());
               if (isBase64Pdf) {
                 const byteCharacters = atob(res.data);
                 const byteNumbers = new Array(byteCharacters.length);
                 for (let i = 0; i < byteCharacters.length; i++) {
                   byteNumbers[i] = byteCharacters.charCodeAt(i);
                 }
                 const byteArray = new Uint8Array(byteNumbers);
                 signedFileBlob = new Blob([byteArray], {
                   type: "application/pdf",
                 });
               } else {
                 // Chuỗi thường: coi như payload binary dạng string
                 signedFileBlob = new Blob([res.data], {
                   type: "application/pdf",
                 });
               }
             } else {
               // Fallback: wrap vào Blob nếu là kiểu khác
               signedFileBlob = new Blob([res.data], {
                 type: "application/pdf",
               });
             }
 
             // Lấy tên file từ Content-Disposition header, nếu không có thì dùng fallback
             const fileNameFromHeader = getFileNameFromHeader(
               res.headers?.["content-disposition"]
             );
             const fileName =
               fileNameFromHeader ||
               file.fileName ||
               file.name ||
               file.file_name ||
               "signed.pdf";
 
             const signedFile = new File([signedFileBlob], fileName, {
               type: "application/pdf",
             });
 
             const uploadFormData = new FormData();
             uploadFormData.append("file", signedFile);
             uploadFormData.append("object_type", objectType || "");
             uploadFormData.append("object_id", objectId || "");
             uploadFormData.append("signed_file_id", originalFileId || "");
 
             const mapActionCode =
               availableActions.find((item) => item.type === activeActionType)
                 ?.code || "";
             // Gọi song song upload file và cập nhật work item
             await Promise.all([
               dispatch(uploadDigitallySignedDocument(uploadFormData)).unwrap(),
               dispatch(
                 postWorkItems({
                   workItemId: documentDetail?.workItem?.id || null,
                   body: {
                     actionCode: mapActionCode || "",
                     docIds: objectId || "",
                   },
                 })
               ),
             ]);
 
             toast("Upload file đã ký thành công!", "success");
             await refetchFiles();
           } catch (uploadError) {
             logger.error("Lỗi upload file đã ký:", uploadError);
             toast("Upload file đã ký thất bại!", "error");
           }
         }
        */

        await refetchFiles();
        const currentTime = new Date().getTime();
        if (setReloadData) setReloadData(currentTime);
        if (setReloadDocProposal) setReloadDocProposal(currentTime);
        if (setReloadDocDraft) setReloadDocDraft(currentTime);
        if (setReloadDocAttachments) setReloadDocAttachments(currentTime);

        handleCloseSignOtpDialog();
      } catch (error) {
        logger.log("Lỗi ký số với OTP:", error);
        const errorMessage = await resolveSignErrorMessage(error);
        toast("Có lỗi xảy ra khi ký số: " + errorMessage, "error");
      } finally {
        setTokenSigning("");
        setTokenGenerated(null);
        setIsUploading(false);
      }
    },
    [
      signOtpSignatureDialog,
      toast,
      objectId,
      refetchFiles,
      handleCloseSignOtpDialog,
      dispatch,
      tokenGenerated,
      resolveActiveActionType,
      documentDetail,
      profileUser?.username,
      // base64ContentSignImage,
      // base64ParaphSignImage,
      // base64ParaphSignTransparentImage,
      // base64StampSignImage,
      setReloadData,
      setReloadDocProposal,
      setReloadDocDraft,
			setReloadDocAttachments,
			signKey,
			getQrPathByFileId,
			getSignatureImageId
    ]
	);
	
  const handleConfirmSignWithPinCode = useCallback(
    async (formData, fileOverride, typeOverride, pinCodeOverride) => {
      const file = fileOverride || signOtpSignatureDialog.file;
      const type = typeOverride || signOtpSignatureDialog.type;
      const { reason, location } = formData;

      // Lấy activeActionType giống OTP flow để resolve đúng image
      const availableActions = documentDetail?.availableActions || [];
      const { activeActionType } = resolveActiveActionType(availableActions);
      const resolvedSignatureImageId = getSignatureImageId(activeActionType);

      /* Logic cũ call api lấy ảnh chữ ký base64 và file base64:
      const isBackGroundImg = documentDetail?.signKey?.isBackground;
      const signatureConfig = {
        signFormatDraft: () =>
          isBackGroundImg
            ? base64ParaphSignImage
            : base64ParaphSignTransparentImage,
        signContentDraft: () =>
          isBackGroundImg
            ? base64ParaphSignImage
            : base64ParaphSignTransparentImage,
        reportSigner: () => base64ContentSignImage,
        signCopy: () => base64ContentSignImage,
        stampDoc: () => base64StampSignImage,
        officialSigner1: () => base64ContentSignImage,
        officialSigner2: () => base64ContentSignImage,
        officialSigner3: () => base64ContentSignImage,
      };

      // Nếu chưa có image thì gọi API fetch lại
      let resolvedImagesBase =
        imagesBase ||
        signatureConfig[activeActionType]?.() ||
        "";

      if (!resolvedImagesBase) {
        // Gọi API lấy ảnh mới
        let targetId = null;
        if (activeActionType === "signFormatDraft" || activeActionType === "signContentDraft") {
          targetId = isBackGroundImg
            ? dataUser?.paraphSignImage
            : dataUser?.paraphSignTransparentImage;
        } else if (
          activeActionType === "reportSigner" ||
          activeActionType === "signCopy" ||
          activeActionType === "officialSigner1" ||
          activeActionType === "officialSigner2" ||
          activeActionType === "officialSigner3"
        ) {
          targetId = dataUser?.contentSignImage;
        } else if (activeActionType === "stampDoc") {
          targetId = dataUser?.stampSignImage;
        }

        if (targetId) {
          try {
            const blob = await dispatch(viewBase64FileWithId(targetId)).unwrap();
            resolvedImagesBase = blob ? await blobFileToBase64(blob) : null;
          } catch (error) {
            logger.error("Lỗi lấy ảnh chữ ký base64:", error);
            resolvedImagesBase = null;
          }
        }
      }

      // const fileSignBase64 =
      //   file?.base64 || (await fetchFileBase64ForSign(file));
      */

      if (!resolvedSignatureImageId) {
        toast("Chưa cấu hình ảnh chữ ký cho loại ký đang chọn!", "error");
        return;
      }

      if (!file) {
        toast("Không có file để ký!", "error");
        return;
      }

      setIsUploading(true);
      try {
        // Lấy file base64 giống OTP flow
        const originalFileId = file._id || file.id;
        const fileSignBase64 = file?.base64 || (await fetchFileBase64ForSign(file));
        const fileSignInfo = {
          fileName:
            file?.file_name || file?.fileName || file?.name || "",
          filePath: file?.file_path || file?.path || "",
          mimeType: file?.mime_type || file?.mimetype || file?.type || "",
          base64: fileSignBase64 || "",
          id: String(file?.id || file?._id || ""),
        };

        const finalActionCode =
          availableActions.find((item) => item.type === activeActionType)?.code || "";

        // Gọi USB Token signing trực tiếp từ FE (không qua BE)
        let fileBuffer;
        if (fileSignInfo.base64) {
          // Convert base64 to ArrayBuffer
          const base64Data = fileSignInfo.base64.replace(/^data:([A-Za-z-+/]+);base64,/, '');
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          fileBuffer = bytes.buffer;
        } else {
          throw new Error("Không có dữ liệu file để ký");
        }

        const resolvedQrPath = getQrPathByFileId(originalFileId);
        let resolvedImagesBase = "";
        if (resolvedSignatureImageId) {
          try {
            const signatureBlob = await dispatch(viewBase64FileWithId(resolvedSignatureImageId)).unwrap();
            resolvedImagesBase = signatureBlob ? await blobFileToBase64(signatureBlob) : "";
          } catch (error) {
            logger.error("Lỗi lấy ảnh chữ ký base64:", error);
          }
        }
        if (!resolvedImagesBase) {
          throw new Error("Không thể đọc ảnh chữ ký để ký USB");
        }
        const signResult = await signWithUSBToken({
          fileBuffer,
          filename: fileSignInfo.fileName || "document.pdf",
          mimeType: fileSignInfo.mimeType || "application/pdf",
          username: profileUser?.username,
          password: pinCodeOverride || pinCode,
          reason: reason || "Ký số điện tử",
          location: location || "Việt Nam",
          signatureLevel: "B",
          type: activeActionType || type || "",
          options: {
            keyword: signKey || "",
            imageSign: resolvedImagesBase || "",
            ...(resolvedQrPath ? { qrPath: resolvedQrPath } : {}),
          },
          tokenSigning: tokenSigning?.token || tokenSigning,
          token: tokenGenerated,
          serviceId: "",
        });


        const item = signResult;
        let signedBase64 = item?.data || item;

        if (!signedBase64) {
          throw new Error("API không trả về dữ liệu file đã ký (signedBase64)");
        }

        let signedBase64String = "";
        if (typeof signedBase64 === "string") {
            signedBase64String = signedBase64;
        } else {
            signedBase64String = await arrayBufferToBase64(signedBase64);
        }

        // Trích xuất tên file từ header (logic name gốc_signed_date_number từ service ký)
        const fileNameFromHeader = getFileNameFromHeader(
          item?.headers?.["content-disposition"]
        );

        // Debug log trước khi gửi

        const resolvedSignatureImageId = getSignatureImageId(activeActionType);
        const payloadToSend = {
          docId: objectId || "",
          workItemId: documentDetail?.workItem?.id || null,
          id: originalFileId,
          actionCode: finalActionCode || "",
          type: activeActionType || "",
          reason: reason || "Ký số điện tử",
          location: location || "Việt Nam",
          username: profileUser?.username,
          password: "12345678",
          signatureLevel: "B",
          typeSign: (activeActionType === "signFormatDraft" || activeActionType === "signContentDraft") ? "draft" : "digital",
          isBackground: documentDetail?.signKey?.isBackground ?? false,
          keyword: signKey || "",
          ...(resolvedQrPath ? { qrPath: resolvedQrPath } : {}),

          imageSign: resolvedSignatureImageId || "",
          tokenAccessSign: tokenGenerated?.token || tokenGenerated || tokenSigning?.token || tokenSigning || "",
          isOTP: false,
          isIncommingDoc: documentDetail?.document?.isIncomming,
          fileSign: {
            ...fileSignInfo,
            fileName: fileNameFromHeader || fileSignInfo.fileName,
          },
          signedFileBuffer: signedBase64String
        };

        const thunkAction = postSignDocumentInsertImagesAndKeywords;

        await dispatch(
          thunkAction({
            tokenSigning: tokenSigning?.token || tokenSigning,
            tokenSign: tokenGenerated,
            body: payloadToSend,
            params: documentDetail?.document?.isAuthority ? { isAuthority: true } : {},
          })
        ).unwrap();

        toast("Ký số thành công!", "success");

        await refetchFiles();
        const currentTime = new Date().getTime();
        if (setReloadData) setReloadData(currentTime);
        if (setReloadDocProposal) setReloadDocProposal(currentTime);
        if (setReloadDocDraft) setReloadDocDraft(currentTime);
        if (setReloadDocAttachments) setReloadDocAttachments(currentTime);

        handleCloseSignOtpDialog();
      } catch (error) {
        logger.log("Lỗi ký số với OTP:", error);
        const errorMessage = await resolveSignErrorMessage(error);
				logger.log("errorMessage", errorMessage);
        toast("Có lỗi xảy ra khi ký số: " + errorMessage, "error");
      } finally {
        setIsUploading(false);
      }
    },
    [
      signOtpSignatureDialog,
      toast,
      // objectType,
      objectId,
      refetchFiles,
      handleCloseSignOtpDialog,
      dispatch,
      fetchFileBase64ForSign,
      tokenSigning,
      tokenGenerated,
      documentDetail,
      profileUser?.username,
      pinCode,
      // base64ContentSignImage,
      // base64ParaphSignImage,
      // base64ParaphSignTransparentImage,
      // base64StampSignImage,
      resolveActiveActionType,
      // dataUser,
			setReloadData,
			signKey,
			getSignatureImageId,
			getQrPathByFileId,
			setReloadDocAttachments,
			setReloadDocDraft,
			setReloadDocProposal
    ]
  );

  const handleConfirmSignBatchWithOTP = useCallback(
    async (formData, fileOverride, typeOverride, tokenSigningOverride, pinCodeOverride) => {
      const type = typeOverride || signOtpSignatureDialog.type;
      // logger.log("signOtpSignatureDialog", type);
      const { reason, location } = formData;
      const availableActions = documentDetail?.availableActions || [];
      const { activeActionType, matchedActionTypes } =
        resolveActiveActionType(availableActions);
      const resolvedSignatureImageId = getSignatureImageId(activeActionType);

      if (!activeActionType) {
        toast("Không xác định được loại ký từ availableActions!", "error");
        return;
      }

      if (matchedActionTypes.length > 1) {
        logger.warn("availableActions bị overlap, đang dùng signMode theo ưu tiên:", {
          matchedActionTypes,
          activeActionType,
        });
      }

      if (!resolvedSignatureImageId) {
        toast("Chưa cấu hình ảnh chữ ký cho loại ký đang chọn!", "error");
        return;
      }
      setIsUploading(true);
      try {
        const arrIdFiles = files.map((file) => file._id || file.id);
        const isOtpSigning = confirmMethod === "caSoft";
        const effectiveTokenSigning = isOtpSigning
          ? tokenSigningOverride || ""
          : tokenSigning?.token || tokenSigning || tokenSigningOverride || "";
        if (isOtpSigning && !effectiveTokenSigning) {
          toast("Vui lòng lấy và xác thực OTP trước khi ký.", "error");
          return;
        }
        const effectiveTokenAccessSign = tokenGenerated?.token || tokenGenerated || "";
        // ====== TẠO BODY JSON ======
        const finalActionCode =
          availableActions.find((item) => item.type === activeActionType)?.code || "";
       const qr = getQrPathByFileId(arrIdFiles[0]);
       const resolvedSignatureImageId = getSignatureImageId(activeActionType);
        const bodyToSend = {
          docId: objectId || "",
          workItemId: documentDetail?.workItem?.id || null,
          ids: arrIdFiles, // BE yêu cầu number, truyền ID file
          actionCode: finalActionCode || "",
          type: activeActionType || "",
          reason: reason || "Ký số điện tử",
          location: location || "Việt Nam",
          username: profileUser?.username ,
          password: isOtpSigning ? "12345678" : (pinCodeOverride || pinCode || ""),
          signatureLevel: "B",
          typeSign: (activeActionType === "signFormatDraft" || activeActionType === "signContentDraft") ? "draft" : "digital",
          isBackground: documentDetail?.signKey?.isBackground ?? false,
          keyword: signKey || "",
          ...(qr ? { qrPath: qr } : {}),
          imageSign: resolvedSignatureImageId || "",
          tokenAccessSign: effectiveTokenAccessSign,
          isOTP: isOtpSigning,
          isIncommingDoc: documentDetail?.document?.isIncomming,
        };
 
        // ====== CHỌN API KÝ ======
        let thunkAction = postSignDocument; // Mặc định cho ký chứng chỉ

        if (type === "digital") {
          thunkAction = postSignBatch; // Ký số chèn ảnh và key word: giữ nguyên imageMetadata
        } else if (type === "draft") {
          thunkAction = postSignBatch; // Ký nháy: đưa trường ra ngoài
        }

        await dispatch(
          thunkAction({
            tokenSigning: effectiveTokenSigning,
            tokenSign: tokenGenerated,
            body: bodyToSend,
            params: documentDetail?.document?.isAuthority ? { isAuthority: true } : {},
          })
        ).unwrap();

        toast("Ký số thành công!", "success");

        // ====== CHỈ GỌI POST WORK ITEM ======
        // const mapActionCode =
        //   documentDetail?.availableActions?.find((item) =>
        //     [
        //       "signContentDraft",
        //       "signFormatDraft",
        //       "reportSigner",
        //       "stampDoc",
        //       "signCopy",
        //     ].includes(item.type)
        //   )?.code || "";

        // await dispatch(
        //   postWorkItems({
        //     workItemId: documentDetail?.workItem?.id || null,
        //     body: {
        //       actionCode: mapActionCode,
        //       docIds: objectId || "",
        //     },
        //   })
        // );

        handleCloseSignOtpDialog();
        await refetchFiles();
        if (setReloadData) setReloadData(new Date().getTime());
      } catch (error) {
        logger.log("Lỗi ký số:", error);

        const errorMessage = await resolveSignErrorMessage(error);

        toast("Có lỗi xảy ra khi ký số: " + errorMessage, "error");
      } finally {
        setTokenSigning("");
        setTokenGenerated(null);
        setIsUploading(false);
      }
    },
    [
      signOtpSignatureDialog,
      toast,
      objectId,
      refetchFiles,
      handleCloseSignOtpDialog,
      dispatch,
      tokenSigning,
      tokenGenerated,
      confirmMethod,
      pinCode,
      resolveActiveActionType,
      documentDetail,
      profileUser?.username,
      files,
      // base64ContentSignImage,
      // base64ParaphSignImage,
			// base64ParaphSignTransparentImage,
			// base64StampSignImage,
			setReloadData,
			signKey,
			getQrPathByFileId,
			getSignatureImageId
    ]
  );

  const handleConfirmSign = useMemo(() => {
    if (isBatchSign) {
      return handleConfirmSignBatchWithOTP;
    }
    return confirmMethod === "caSoft"
      ? handleConfirmSignWithOtp //Ký số với OTP
      : handleConfirmSignWithPinCode; //Ký số với USB TOKEN
  }, [
    confirmMethod,
    handleConfirmSignWithOtp,
    handleConfirmSignWithPinCode,
    handleConfirmSignBatchWithOTP,
    isBatchSign,
  ]);
  const handleConfirmOtpInputDialog = useCallback(
    async (data) => {
      setIsOtpLoading(true);
      try {
        const res = await dispatch(
          verifyOtp({ body: data, tokenSign: tokenGenerated })
				).unwrap();
				// logger.log('handleConfirmOtpInputDialog', res)
        setTokenSigning(res.data.signingToken);
        toast("Xác thực OTP thành công.", "success");
        const fileToSign = signOtpInputDialog.file;
        const type = signOtpInputDialog.type || null;
        setSignOtpInputDialog({ open: false, file: null, type: null });
        handleCloseOtpInputDialog();
        // Bỏ qua popup ký số sau khi xác thực OTP thành công, gọi trực tiếp hàm ký
        setSignOtpSignatureDialog({ open: false, file: fileToSign, type });
        if (isBatchSign) {
          handleConfirmSignBatchWithOTP({}, fileToSign, type, res.data.signingToken);
        } else {
          handleConfirmSignWithOtp({}, fileToSign, type, res.data.signingToken);
				}
      } catch (error) {
        logger.log("Lỗi xác thực OTP:", error);
        const message =
          error?.message || "Xác thực OTP thất bại. Vui lòng thử lại.";
        setErrorOtp("otp", { type: "custom", message });
      } finally {
        setIsOtpLoading(false);
      }
    },
    [
      dispatch,
      toast,
      signOtpInputDialog,
      setErrorOtp,
      setIsOtpLoading,
      handleCloseOtpInputDialog,
      setTokenSigning,
      tokenGenerated,
      isBatchSign,
      handleConfirmSignBatchWithOTP,
      handleConfirmSignWithOtp,
    ]
  );

  // const handleConfirmOtpInputDialog = useCallback((data) => {
  //   logger.log("OTP nhập:", data);
  //   handleCloseOtpInputDialog();
  // }, [handleCloseOtpInputDialog]);

  const handleConfirmSignDigital = useCallback(
    async (formData) => {
      const { file } = signDigitalDialog;
      const { password, reason, location } = formData;
      if (!file) {
        toast("Không có file để ký!", "error");
        return;
      }

      if (!password) {
        toast("Vui lòng nhập mật khẩu xác nhận!", "error");
        return;
      }
      // setIsLoading(true);
      setIsUploading(true);
      try {
        // Lấy file thực tế
        let fileToSign;
        const originalFileId = file._id || file.id;

        if (file.rawFile instanceof File) {
          fileToSign = file.rawFile;
        } else if (originalFileId) {
          const downloadUrl = `${APP_BASE}/api/files/download/${originalFileId}`;
          const res = await api.get(downloadUrl, {
            responseType: "blob",
            timeout: 0,
          });
          fileToSign = new File(
            [res.data],
            file.fileName || file.name || file.file_name || "file.pdf",
            { type: res.data.type }
          );
        } else {
          throw new Error("Không thể xác định nguồn file");
        }
        const qr = getQrPathByFileId(originalFileId);
        // Tạo FormData để gửi đến backend service
        const formDataToSend = new FormData();
        formDataToSend.append("file", fileToSign);
        formDataToSend.append("password", password);
        formDataToSend.append("reason", reason || "Ký số điện tử");
        formDataToSend.append("location", location || "Việt Nam");
        formDataToSend.append("signatureLevel", "B");
        if (qr) {
          formDataToSend.append("qrPath", qr);
        }
        const availableActions = documentDetail?.availableActions || [];
        const { activeActionType } = resolveActiveActionType(availableActions);
        const resolvedSignatureImageId = getSignatureImageId(activeActionType);
        const imageMetadata = [
          {
            keyWord: signKey || "",
            imagesBase: resolvedSignatureImageId || "",
          },
        ];
        formDataToSend.append("imageMetadata", JSON.stringify(imageMetadata));

        // Nếu có fileId, gửi kèm để backend tự update
        if (originalFileId && objectType && objectId) {
          formDataToSend.append("fileId", originalFileId);
          formDataToSend.append("objectType", objectType);
          formDataToSend.append("objectId", objectId);
        }
        // Gọi API backend để ký số
        const response = await api.post(API_SIGN_DIGITAL, formDataToSend, {
          headers: { "Content-Type": "multipart/form-data" },
          params: documentDetail?.document?.isAuthority ? { isAuthority: true } : {},
          timeout: 120000, // 2 phút timeout cho việc ký số
        });

        if (response.data.success) {
          toast("Ký số và lưu thành công!", "success");
          handleCloseSignDigitalDialog();
          await refetchFiles();
          if (setReloadData) setReloadData(new Date().getTime());
        } else {
          throw new Error(response.data.message || "Lỗi ký số");
        }
      } catch (error) {
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Lỗi không xác định";
        toast("Có lỗi xảy ra khi ký số: " + errorMessage, "error");
      } finally {
        setIsUploading(false);
      }
    },
    [
      signDigitalDialog,
      toast,
      handleCloseSignDigitalDialog,
      objectType,
      objectId,
      refetchFiles,
			setReloadData,
			signKey,
			documentDetail?.availableActions,
			documentDetail?.document?.isAuthority,
			getQrPathByFileId,
			getSignatureImageId,
			resolveActiveActionType
    ]
  );

  const handleConfirmSignDigitalWrapper = useCallback(
    async (...args) => handleConfirmSignDigital(...args),
    [handleConfirmSignDigital]
  );

  const handleClosePreview = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewOpen(false);
    setPreviewUrl(null);
  };

  // const handleEdit = useCallback(
  //   (file, objectType, objectId) => {
  //     if (!file || (!file._id && !file.id)) {
  //       toast(
  //         "Không thể mở trang chỉnh sửa cho file chưa được tải lên.",
  //         "warning"
  //       );
  //       return;
  //     }
  //
  //     const fileName = file.fileName || file.name || file.file_name || "";
  //     const isDoc = /\.(doc|docx)$/i.test(fileName);
  //     const isExcel = /\.(xls|xlsx)$/i.test(fileName);
  //     const isPpt = /\.(ppt|pptx)$/i.test(fileName);
  //
  //     if (!(isDoc || isExcel || isPpt)) {
  //       toast("Chỉ có thể mở file trong bộ văn bản.", "warning");
  //       return;
  //     }
  //
  //     const fileId = file._id || file.id;
  //     const userData = JSON.parse(localStorage.getItem("userData"));
  //     const userId = userData?.user?._id;
  //     const rawUrl = `${URL_TOOL_EDIT}/files/${fileId}/${userId}/${objectType}/${objectId}/${fileId}/${fileName}`;
  //     const encodedUrl = rawUrl;
  //     let editPageUrl = "";
  //     if (isDoc) editPageUrl = `ms-word:ofe|u|${encodedUrl}`;
  //     if (isExcel) editPageUrl = `ms-excel:ofe|u|${encodedUrl}`;
  //     if (isPpt) editPageUrl = `ms-powerpoint:ofe|u|${encodedUrl}`;
  //     // KHÔNG encode toàn bộ chuỗi một lần nữa
  //     window.location.href = editPageUrl;
  //   },
  //   [toast]
  // );

  const handleOpenInIframe = useCallback(
    async (file) => {
      if (!file || (!file._id && !file.id)) {
        toast("Không có file để chỉnh sửa!", "error");
        return;
      }
      const fileId = file._id || file.id;
      setIframeDialog({ open: true, file: file, fileId: fileId });
    },
    [toast]
  );

  const refreshAfterEditorClose = useCallback(async () => {
    const currentTime = new Date().getTime();

    try {
      await refetchFiles({ shouldReloadDoc: false });
      await refetchFilesOld();
    } finally {
      if (setReloadData) setReloadData(currentTime);
      if (setReloadDoc) setReloadDoc(currentTime);
      if (setReloadDocProposal) setReloadDocProposal(currentTime);
      if (setReloadDocDraft) setReloadDocDraft(currentTime);
      if (setReloadDocAttachments) setReloadDocAttachments(currentTime);
    }
  }, [
    refetchFiles,
    refetchFilesOld,
    setReloadData,
    setReloadDoc,
    setReloadDocProposal,
    setReloadDocDraft,
    setReloadDocAttachments,
  ]);

  const handleCloseIframeDialog = useCallback(() => {
    // Chỉ đóng dialog, KHÔNG xóa file ngay lập tức để tránh lỗi removeChild
    setIframeDialog((prev) => ({ ...prev, open: false }));
    refreshAfterEditorClose();
  }, [refreshAfterEditorClose]);

  const handleIframeDialogExited = useCallback(() => {
    setIframeDialog({
      open: false,
      url: "",
      file: null,
      isLoading: false,
      nextcloudData: null,
      idEditFile: "",
    });
    window.setTimeout(() => {
      refreshAfterEditorClose();
    }, 800);
  }, [refreshAfterEditorClose]);
  const handleOpenScan = () => setScanDialogState({});
  const handleOpenChoSo = useCallback((file = null) => {
    setSelectedFileForGiveNumber(file);
    setOpenChoSo(true);
  }, []);

  const handleCloseChoSo = useCallback(() => {
    setOpenChoSo(false);
    setSelectedFileForGiveNumber(null);
    reset(defaultFormValues);
  }, [reset]);

  const handleOpenKySo = useCallback(
    async (file = null) => {
      setIsBatchSign(false);
      // const { activeActionType } = resolveActiveActionType(
      //   documentDetail?.availableActions || []
      // );
      // fetchSignatureImageByActionType(activeActionType);
        // logger.log('file', file)

      if (!file) {
        setSignOtpDialog({ open: true, file: null, type: "digital" });

        return;
      }

      // const base64 = await fetchFileBase64ForSign(file);
     
      // const nextFile = base64 ? { ...file, base64 } : file;
      const nextFile = file;

      setSignOtpDialog({ open: true, file: nextFile, type: "digital" });
    },
    [
      // documentDetail?.availableActions,
      fetchFileBase64ForSign,
      // fetchSignatureImageByActionType,
      // resolveActiveActionType,
    ]
  );

  const handleOpenBatchSign = useCallback(() => {
    setIsBatchSign(true);
    // const { activeActionType } = resolveActiveActionType(
    //   documentDetail?.availableActions || []
    // );
    // fetchSignatureImageByActionType(activeActionType);
    // setSignOtpDialog({ open: true, file: null, type: "digital" });
    setSignOtpDialog({
      open: true,
      file: null,
      type: documentDetail?.availableActions?.some(
        (item) => ["signFormatDraft"].includes(item.type) //Ký đóng dấu
      )
        ? "draft"
        : "digital",
    });
  }, [
    documentDetail?.availableActions,
    // fetchSignatureImageByActionType,
    // resolveActiveActionType,
  ]);

  useEffect(() => {
    if (triggerBatchSign > 0) {
      handleOpenBatchSign();
      if (resetTriggerBatchSign) {
        resetTriggerBatchSign();
      }
    }
  }, [triggerBatchSign, handleOpenBatchSign, resetTriggerBatchSign]);

  const handleCloseKySo = useCallback(() => {
    setSignOtpDialog({ open: false, file: null, type: null });
    setOtpError(null);
    resetOtp(defaultFormValues);
    setIsBatchSign(false);
  }, [resetOtp]);

  // Mở theo từng loại nút ký
	const handleOpenSignDraft = useCallback(async (file = null) => {
    setIsBatchSign(false);
    const hasSignCopy = documentDetailFull?.availableActions?.some(
      (item) => item.type === "signCopy"
    ) || (documentDetailFull?.availableActions?.some(
      (item) => item.type === "stampDoc"
    ) && documentDetail?.document?.isIncomming);
    if (hasSignCopy) {
      try {
        const fileId = file?._id || file?.id;
        if (!fileId) {
          setSignCopyPreviewDialog({ open: true, file, url: null });
          return;
        }
        const viewUrl = `${APP_BASE}/api/files/view/${fileId}`;
        const res = await api.get(viewUrl, { responseType: "blob", timeout: 100000 });
        const blob = new Blob([res.data], {
          type: res.headers["content-type"] || res.data.type,
        });
        const blobUrl = URL.createObjectURL(blob);
        setSignCopyPreviewDialog({ open: true, file, url: blobUrl });
      } catch (e) {
        toast("Không thể tải file để xem trước.", "error");
      }
    } else {
      // const { activeActionType } = resolveActiveActionType(
      //   documentDetail?.availableActions || []
      // );
      // fetchSignatureImageByActionType(activeActionType);
      setSignOtpDialog({ open: true, file: file, type: "draft" });
    }
  }, [
    // documentDetail?.availableActions,
    documentDetail?.document?.isIncomming,
    documentDetailFull?.availableActions,
    // fetchSignatureImageByActionType,
    // resolveActiveActionType,
    toast
  ]);

  const handleCloseSignCopyPreviewDialog = useCallback(() => {
    setSignCopyPreviewDialog((prev) => {
      if (prev.url) URL.revokeObjectURL(prev.url);
      return { open: false, file: null, url: null };
    });
  }, []);

  const handleConfirmSignCopyPreviewDialog = useCallback(() => {
    const { file, url } = signCopyPreviewDialog;
    if (url) URL.revokeObjectURL(url);
    setSignCopyPreviewDialog({ open: false, file: null, url: null });
    // const { activeActionType } = resolveActiveActionType(
    //   documentDetail?.availableActions || []
    // );
    // fetchSignatureImageByActionType(activeActionType);
    setSignOtpDialog({ open: true, file, type: "draft" });
  }, [
    // documentDetail?.availableActions,
    // fetchSignatureImageByActionType,
    // resolveActiveActionType,
    signCopyPreviewDialog
  ]);

  const handleOpenSignCertificate = useCallback(async (file = null) => {
    setIsBatchSign(false);
    const hasSignCopy = documentDetailFull?.availableActions?.some(
      (item) => item.type === "signCopy"
    ) || (documentDetailFull?.availableActions?.some(
      (item) => item.type === "stampDoc"
    ) && documentDetail?.document?.isIncomming);
    if (hasSignCopy) {
      try {
        const fileId = file?._id || file?.id;
        if (!fileId) {
          setSignCopyPreviewDialog({ open: true, file, url: null });
          return;
        }
        const viewUrl = `${APP_BASE}/api/files/view/${fileId}`;
        const res = await api.get(viewUrl, { responseType: "blob", timeout: 100000 });
        const blob = new Blob([res.data], {
          type: res.headers["content-type"] || res.data.type,
        });
        const blobUrl = URL.createObjectURL(blob);
        setSignCopyPreviewDialog({ open: true, file, url: blobUrl });
      } catch (e) {
        toast("Không thể tải file để xem trước.", "error");
      }
    } else {
      // const { activeActionType } = resolveActiveActionType(
      //   documentDetail?.availableActions || []
      // );
      // fetchSignatureImageByActionType(activeActionType);
      setSignOtpDialog({ open: true, file: file, type: "certificate" });
    }
  }, [
    documentDetail?.document?.isIncomming,
    documentDetailFull?.availableActions,
    toast
  ]);

  // ... (Logic giveNumber giữ nguyên)
  // const buildAutoPayload = (docId) => {
  //   const now = new Date();
  //   let result = [];
  //   result.push({ key: "day", value: String(now.getDate()).padStart(2, "0") });
  //   result.push({
  //     key: "month",
  //     value: String(now.getMonth() + 1).padStart(2, "0"),
  //   });
  //   result.push({ key: "year", value: String(now.getFullYear()) });
  //   result.push({ key: "number", value: docId });
  //   return result;
  // };

  // const parseReleaseDateParts = (releaseDate) => {
  //   if (typeof releaseDate === "string") {
  //     const [day, month, year] = releaseDate.split("/");
  //     if (day && month && year) {
  //       return { day, month, year };
  //     }
  //   }

  //   const date = releaseDate ? new Date(releaseDate) : new Date();
  //   if (!Number.isNaN(date.getTime())) {
  //     return {
  //       day: String(date.getDate()).padStart(2, "0"),
  //       month: String(date.getMonth() + 1),
  //       year: String(date.getFullYear()),
  //     };
  //   }

  //   const now = new Date();
  //   return {
  //     day: String(now.getDate()).padStart(2, "0"),
  //     month: String(now.getMonth() + 1),
  //     year: String(now.getFullYear()),
  //   };
  // };

  const parseReleaseDate = (releaseDate) => {
    let date = null;

    if (releaseDate instanceof Date) {
      date = releaseDate;
    } else if (
      releaseDate &&
      typeof releaseDate === "object" &&
      typeof releaseDate.toDate === "function"
    ) {
      date = releaseDate.toDate();
    } else if (typeof releaseDate === "string" && releaseDate.includes("/")) {
      const parts = releaseDate.split("/");
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        date = new Date(year, month, day);
      }
    } else if (releaseDate) {
      date = new Date(releaseDate);
    }

    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      date = new Date();
    }

    return date;
  };

  const normalizeTextValue = (value) =>
    String(value ?? "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .trim();

  const extractDocNumberPart = (value) => {
    const normalized = normalizeTextValue(value);
    if (!normalized) return "";

    const firstPart = normalized.split("/")[0] || normalized;
    return normalizeTextValue(firstPart);
  };

  const getDocNumberForAuto = ({ toBook, releaseNo }) => {
    const docNumberFromToBook = extractDocNumberPart(toBook);
    if (docNumberFromToBook) {
      return docNumberFromToBook;
    }

    return extractDocNumberPart(releaseNo);
  };

  const buildAutoPayload = ({ toBook, releaseNo, releaseDate }) => {
    const date = parseReleaseDate(releaseDate);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const formattedDay = String(day).padStart(2, "0");
    const formattedMonth = month <= 2 ? String(month).padStart(2, "0") : String(month);
    const docNumber = getDocNumberForAuto({ toBook, releaseNo });
    const formattedDocNumber = docNumber ? docNumber.padStart(2, "0") : "";

    return [
      {
        key: "NgayVanBan",
        value: `N\u0067\u00E0y ${formattedDay} th\u00E1ng ${formattedMonth} n\u0103m ${year}`,
      },
      { key: "So", value: formattedDocNumber },
    ];
  };

const buildTextsPayload = (data, texts = {}, releaseDate) => {
  let date;

  if (releaseDate instanceof Date) {
    date = releaseDate;
  } else if (typeof releaseDate === "string" && releaseDate.includes("/")) {
    const parts = releaseDate.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      date = new Date(year, month, day);
    } else {
      date = new Date(releaseDate);
    }
  } else {
    date = new Date(releaseDate);
  }

  if (Number.isNaN(date?.getTime?.())) {
    date = new Date();
  }

  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = String(date.getFullYear()).padStart(4, "0");

  const result = {};

  if (data?.auto?.docNumber && texts.docNumber) {
    result.docNumber = {
      ...texts.docNumber,
      content: String(data?.toBook ?? "").padStart(2, "0"),
    };
  }

  if (data?.auto?.day && texts.day) {
    result.day = {
      ...texts.day,
      content: String(day).padStart(2, "0"),
    };
  }

  if (data?.auto?.month && texts.month) {
    result.month = {
      ...texts.month,
      content: month <= 2 ? String(month).padStart(2, "0") : String(month),
    };
  }

  if (data?.auto?.year && texts.year) {
    result.year = {
      ...texts.year,
      content: year,
    };
  }

  return result;
};

  const handleSaveGiveNumber = async (data) => {
    try {
      setLoadingGiveNumber(true);
      const autoInsert = data?.auto?.tuDongNhap;
      const payload = {
        bookDocumentId: data.bookDocumentId,
        docIds: [objectId],
        releaseDate: data.releaseDate,
        releaseNo: data.releaseNo,
        textSymbols: data.textSymbols,
        toBook: data.toBook,
        workItemId: documentDetail?.workItem?.id || null,
      };
      let fileId =
        selectedFileForGiveNumber?.id || selectedFileForGiveNumber?._id;
      if (
        selectedFileForGiveNumber &&
        isDocumentFile(selectedFileForGiveNumber)
      ) {
        if (
          !(
            selectedFileForGiveNumber.fileName ||
            selectedFileForGiveNumber.file_name
          )
            .toLowerCase()
            .endsWith(".pdf")
        ) {
          const convertedFile = await dispatch(
            convertFileToPdf({ id: fileId })
          ).unwrap();
          fileId = convertedFile?.pdfFileId;
        }
      }
      const body = { id: fileId };
      const payloadSignNumer = { isNumbered: 1 };

      const giveNumberResponse = await dispatch(postGiveNumber(payload)).unwrap();
      if (autoInsert) {
        const releaseDateFromBe = giveNumberResponse?.releaseDate || data?.releaseDate;
        const releaseNoFromBe = giveNumberResponse?.releaseNo || data?.releaseNo;
        const toBookFromBe = giveNumberResponse?.toBook || data?.toBook;
        body.auto = buildAutoPayload({
          toBook: toBookFromBe,
          releaseNo: releaseNoFromBe,
          releaseDate: releaseDateFromBe,
        });
      } else {
        body.texts = buildTextsPayload(data, data.texts, data.releaseDate);
      }
      // logger.log("body", body);
      // logger.log("Payload-2:", payloadSignNumer);
      await Promise.all([
        dispatch(postInsertTextToPdf(body)).unwrap(),
        dispatch(putGiveNumber({ fileId, data: payloadSignNumer })).unwrap(),
      ]);
      toast("Cho số văn bản thành công", "success");
      handleCloseChoSo();
      refetchFiles();
      if (setReloadData) {
        setReloadData(new Date() * 1);
      }
    } catch (error) {
      logger.log("Lỗi khi cho số!", error);
      toast("Lỗi khi cho số văn bản", "error");
    } finally {
      setLoadingGiveNumber(false);
    }
  };

  const handlePreviewGiveNumber = useCallback(async () => {
    // ... (Code cũ giữ nguyên)
    const selectedFile = selectedFileRef.current;
    if (!selectedFile) return;
    try {
      setViewerDialogOpen(true);
      const formData = getValues();
      const body = {
        id: selectedFile?._id || selectedFile?.id,
        newFile: selectedFile?.isNumbered === 0 ? true : false,
      };
      body.texts = buildTextsPayload(formData, formData.texts);
      const res = await dispatch(previewFileToPdf(body)).unwrap();
      setDataFileBase64(res.data);
    } catch (error) {
      toast("Lỗi khi xem trước mẫu số văn bản", "error");
    }
  }, [dispatch, getValues, toast]);

  const handleCloseViewerDialog = () => {
    setViewerDialogOpen(false);
    setDataFileBase64(null);
  };

  // --- HÀM DOWNLOAD FILE AN TOÀN ---
  const handleDownload = useCallback(
    async (file, type, isVanThuParam) => {
      if (!file) {
        toast("Không có file để tải!", "error");
        return;
      }
      if (type) {
        logger.log("Download type selected:", type);
      }
      // setIsLoading(true);
      setIsUploading(true);
      try {
        let blob;
        let fileName = file.fileName || file.name || file.file_name || "download";

        if (file.rawFile instanceof File) {
          blob = file.rawFile;
        } else if (file._id || file.id) {
          const fileId = file._id || file.id;
          let downloadUrl = `${APP_BASE}/api/files/download/${fileId}`;
          let isForcePdf = false;

          if (type) {
            downloadUrl = `${API_DOWNLOAD_FILE_NEW}/${fileId}`;
            // Nếu tải không watermark thì giữ nguyên logic đuôi file gốc (isForcePdf = false)
            isForcePdf = type !== "no-watermark"; 
            if (type === "no-watermark") {
              downloadUrl += "?downloadMode=none";
            } else if (type === "no-stamp") {
              downloadUrl += "?downloadMode=nostamp";
            }
          } else if (isVanThuParam === false || String(isVanThuParam) === "false") {
            downloadUrl = `${API_DOWNLOAD_FILE_NEW}/${fileId}`;
            isForcePdf = true;
          }

          const res = await api.get(downloadUrl, {
            responseType: "blob",
            timeout: 0,
          });

          if (isForcePdf) {
            // Trường hợp dùng API NEW: Chuyển hết thành đuôi .pdf và blob PDF
            if (!fileName.toLowerCase().endsWith(".pdf")) {
              const lastDotIndex = fileName.lastIndexOf(".");
              if (lastDotIndex !== -1) {
                fileName = fileName.substring(0, lastDotIndex) + ".pdf";
              } else {
                fileName += ".pdf";
              }
            }
            blob = new Blob([res.data], { type: "application/pdf" });
          } else {
            // Trường hợp dùng APP_BASE: Giữ nguyên logic xác định đuôi và blob cũ
            const ext = fileName.split(".").pop()?.toLowerCase();
            const imageExt = ["jpg", "jpeg", "png", "gif", "webp"];
            const docExt = ["doc", "docx"];
            const excelExt = ["xls", "xlsx"];
            const pptExt = ["ppt", "pptx"];
            const pdfExt = ["pdf"];
            const txtExt = ["txt"];

            if (excelExt.includes(ext)) {
              blob = new Blob([res.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              });
            } else if (docExt.includes(ext)) {
              blob = new Blob([res.data], {
                type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              });
            } else if ([...imageExt, ...pdfExt, ...txtExt].includes(ext)) {
              blob = new Blob([res.data], { type: res.data.type });
            } else if (pptExt.includes(ext)) {
              blob = res.data;
            } else {
              blob = new Blob([res.data], {
                type: res.data.type || "application/octet-stream",
              });
            }
          }
        } else {
          toast("File không có dữ liệu để tải!", "error");
          // setIsLoading(false);
          return;
        }

        // --- SỬ DỤNG REF CONTAINER ---
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = fileName;

        // Ưu tiên dùng ref container, nếu không có mới dùng body
        const container = downloadRef.current || document.body;
        container.appendChild(link);
        link.click();

        // Xóa link an toàn
        if (container.contains(link)) {
          container.removeChild(link);
        }

        window.URL.revokeObjectURL(objectUrl);
      } catch (error) {
        // logger.error(error);
        toast("Không thể tải file!", "error");
      } finally {
        // setIsLoading(true);
        setIsUploading(false);
      }
    },
    [toast]
  );

  const handleDownloadAll = useCallback(async () => {
    if (!files || files.length === 0) {
      toast("Không có file để tải!", "warning");
      return;
    }
    
    setIsUploading(true);
    try {
      for (const file of files) {
        await handleDownload(file, null, isVanThu);
      }
      toast(`Bắt đầu tải ${files.length} tệp...`, "success");
    } catch (error) {
      toast("Lỗi khi tải hàng loạt!", "error");
    } finally {
      setIsUploading(false);
    }
  }, [files, handleDownload, toast, isVanThu]);

  // Hàm này sẽ được truyền vào FileTableInPopup để thay thế logic mặc định không an toàn
  // const handleDownloadTool = useCallback(() => {
  //   try {
  //     const link = document.createElement("a");
  //     link.href = URL_DOWLOAD_EDIT_WORD;
  //     link.download = "";
  //
  //     const container = downloadRef.current || document.body;
  //     container.appendChild(link);
  //     link.click();
  //
  //     if (container.contains(link)) {
  //       container.removeChild(link);
  //     }
  //   } catch (e) {
  //     toast("Không thể tải công cụ hỗ trợ.", "error");
  //   }
  // }, [toast]);

  const handleToggleOpen = () => {
    setIsOpen((prev) => !prev);
  };
  const handleChangeConfirmMethod = (value) => {
    setConfirmMethod(value);
  };

  const handleConfirmPinCodeInputDialog = useCallback(
    (data) => {
      logger.log("Xác nhận mã PIN:", data);
      setPinCode(data?.otp);
      const fileToSign = signOtpInputDialog.file;
      const type = signOtpInputDialog.type || null;
      setSignOtpInputDialog({ open: false, file: null, type: null });
      setSignOtpSignatureDialog({ open: false, file: fileToSign, type });
      if (isBatchSign) {
        handleConfirmSignBatchWithOTP({}, fileToSign, type, undefined, data?.otp);
      } else {
        handleConfirmSignWithPinCode({}, fileToSign, type, data?.otp);
      }
    },
    [
      signOtpInputDialog,
      isBatchSign,
      handleConfirmSignBatchWithOTP,
      handleConfirmSignWithPinCode,
    ]
  );

  const handleSubmitConfirm = useMemo(() => {
    return confirmMethod === "caSoft"
      ? handleConfirmOtpInputDialog
      : handleConfirmPinCodeInputDialog;
  }, [
    confirmMethod,
    handleConfirmOtpInputDialog,
    handleConfirmPinCodeInputDialog,
  ]);

  const handleCreateCertifiedCopyReport = useCallback(
    (file) => {
      if (!selectedCertifiedSignId) {
        toast("Vui lòng chọn file để tạo biên bản sao y.", "warning");
        return;
      }
      setOpenCertifiedCopyReport(true);
      setSelectedFileForCertifiedCopy(file);
    },
    [selectedCertifiedSignId, toast]
  );

  const handleToggleCertifiedSign = useCallback(
    (file, checked) => {
      setSelectedFileForCertifiedCopy(checked ? file : null);
      if (checked) {
        dispatch(setSelectedTextCopy(file));
      } else {
        dispatch(clearSelectedTextCopy());
      }
      if (onToggleCertifiedSign) {
        onToggleCertifiedSign?.(file, checked);
      }
    },
    [dispatch, onToggleCertifiedSign]
  );

  const handleToggleImportant = useCallback(
    (file, checked) => {
      setSelectedFileForImportant(checked ? file : null);
      if (checked) {
        dispatch(setSelectedImportant(file));
      } else {
        dispatch(clearSelectedImportant());
      }
      if (onToggleImportant) {
        onToggleImportant?.(file, checked);
      }
    },
    [dispatch, onToggleImportant]
  );


  const extraColumns = [
    ...(!hiddenNeedCertifiedSign? [
      {
      key: "needCertifiedSign",
      header: "CẦN KÝ SAO Y",
      align: "center",
      width: "120px",
      render: (file, fileIndex) => {
        // unique key cho file (có id hoặc file tạm)
        const fileUniqueKey =
          file?._id || file?.id || file?.fileId || `temp-${fileIndex}`;

        const selectedUniqueKey =
          selectedFileForCertifiedCopy?._id ||
          selectedFileForCertifiedCopy?.id ||
          selectedFileForCertifiedCopy?.fileId ||
          (selectedFileForCertifiedCopy
            ? `temp-${files.indexOf(selectedFileForCertifiedCopy)}`
            : null);
        const checked = selectedUniqueKey
          ? selectedUniqueKey === fileUniqueKey
          : normalizeFlag(file?.isCertifiedCopy);

        const handleChange = (e) => {
          const nextChecked = e.target.checked;
          const previousSelected = selectedFileForCertifiedCopy;

          if (nextChecked) {
            if (previousSelected) {
              handleToggleCertifiedSign(previousSelected, false);
            }
            setSelectedCertifiedSignId(fileUniqueKey);
            setSelectedFileForCertifiedCopy(file);
            setFiles((prevFiles) =>
              prevFiles.map((f, idx) => ({
                ...f,
                isCertifiedCopy:
                  idx === fileIndex ||
                  f?._id === file?._id ||
                  f?.id === file?.id ||
                  f?.fileId === file?.fileId,
              }))
            );
            handleToggleCertifiedSign(file, true);
          } else {
            setSelectedCertifiedSignId(null);
            setSelectedFileForCertifiedCopy(null);
            setFiles((prevFiles) =>
              prevFiles.map((f) => ({
                ...f,
                isCertifiedCopy: false,
              }))
            );
            handleToggleCertifiedSign(file, false);
          }
        };

        return (
          <Checkbox
            checked={checked}
            onChange={handleChange}
            size="small"
            disabled={isView}
          />
        );
      },
    }
    ]  : []),
    {
      key: "isImportant",
      header: "QUAN TRỌNG",
      align: "center",
      width: "120px",
      render: (file, fileIndex) => {
        // unique key cho file (có id hoặc file tạm)
        const fileUniqueKey =
          file?._id || file?.id || file?.fileId || `temp-${fileIndex}`;

        const selectedUniqueKey =
          selectedFileForImportant?._id ||
          selectedFileForImportant?.id ||
          selectedFileForImportant?.fileId ||
          (selectedFileForImportant
            ? `temp-${files.indexOf(selectedFileForImportant)}`
            : null);
        const checked = selectedUniqueKey
          ? selectedUniqueKey === fileUniqueKey
          : normalizeFlag(file?.isImportant);

        const handleChange = (e) => {
          const nextChecked = e.target.checked;
          const previousSelected = selectedFileForImportant;

          if (nextChecked) {
            if (previousSelected) {
              handleToggleImportant(previousSelected, false);
            }
            setSelectedImportantId(fileUniqueKey);
            setSelectedFileForImportant(file);
            setFiles((prevFiles) => {
              const updated = prevFiles.map((f, idx) => ({
                ...f,
                isImportant:
                  idx === fileIndex ||
                  f?._id === file?._id ||
                  f?.id === file?.id ||
                  f?.fileId === file?.fileId,
              }));
              if (onChangeRef.current) onChangeRef.current(updated);
              return updated;
            });
            handleToggleImportant(file, true);
          } else {
            setSelectedImportantId(null);
            setSelectedFileForImportant(null);
            setFiles((prevFiles) => {
              const updated = prevFiles.map((f) => ({
                ...f,
                isImportant: false,
              }));
              if (onChangeRef.current) onChangeRef.current(updated);
              return updated;
            });
            handleToggleImportant(file, false);
          }
        };

        return (
          <Checkbox
            icon={<StarBorderIcon />}
            checkedIcon={
              <span style={{ color: "#e53935", display: "inline-flex" }}>
                <StarIcon />
              </span>
            }
            checked={checked}
            onChange={handleChange}
            size="small"
            disabled={isView}
          />
        );
      },
    },
  ];

  const handleSaveCertifiedCopyRecord = useCallback(async () => {
    try {
      const mapRole =
        documentDetailFull?.availableActions?.find(
          (item) => item.type === "createFileCopy"
        ) ?? null;
      const docId = documentDetailFull?.document?.documentId;
      const workItemId = documentDetailFull?.workItem?.id;
      const fileBase64 = await blobToBase64(dataFileCopy);
      const fileExample = await getExampleFileByKey('SAO_Y_TEMPLATE');
      const urlTemplateFile = `${APP_BASE}/api/files/download/${fileExample?.id}?public=true`;
      const body = {
        roles: mapRole?.targetRole || "",
        actionCode: mapRole?.code || "",
        fileOrigin: selectedFileForCertifiedCopy?.id,
        fileExample: urlTemplateFile,
        fileName:
          selectedFileForCertifiedCopy?.file_name ||
          selectedFileForCertifiedCopy?.name ||
          selectedFileForCertifiedCopy?.fileName ||
          "",
        fileBase64,
      };
      await dispatch(
        saveCertifiedCopyRecord({ docId: docId, workItemId: workItemId, body })
      ).unwrap();
      toast("Tạo biên bản sao y thành công!", "success");
      await refetchFiles();
      handleCloseCertifiedCopyReport();
    } catch (error) {
      const messageError = error?.response?.data?.message || error?.error?.message || error.message || "Lỗi khi lưu biên bản sao y!";
      logger.log("Lỗi khi lưu biên bản sao y:", error);
      toast(messageError, "error");
    }
  }, [
    dispatch,
    toast,
    documentDetailFull?.availableActions,
    documentDetailFull?.document?.documentId,
    documentDetailFull?.workItem?.id,
    selectedFileForCertifiedCopy,
    handleCloseCertifiedCopyReport,
    dataFileCopy,
    refetchFiles,
  ]);


  return (
    <StyledContainerUploadFile noneBorder={noneBorder}>
      {showHeader && (
        <UploadHeader>
          {useSecondaryLayout ? (
            <StyledSecondaryHeader>
              <StyledSecondaryLabelBox>
                <StyledDocumentIcon>
                  <DescriptionOutlinedIcon />
                </StyledDocumentIcon>
                <Tooltip title={label} placement="top-start">
                  <UploadLabel variant="subtitle1" isSecondary>
                    {label}
                    {isRequired && (
                      <IconRequied component="span">*</IconRequied>
                    )}
                  </UploadLabel>
                </Tooltip>
                <StyledCountBadge>
                  {files.length} tệp
                </StyledCountBadge>
              </StyledSecondaryLabelBox>

              {isCollapsible && (
                <Tooltip title={isOpen ? "Thu gọn" : "Mở rộng"}>
                  <StyledIconKeyboardArrow
                    size="small"
                    onClick={handleToggleOpen}
                  >
                    {isOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                  </StyledIconKeyboardArrow>
                </Tooltip>
              )}

              {showButtons && (
                <StyledSecondaryActionStack>
                  {allowMultipleDelete && selectedDeleteKeys.length > 0 && (
                    <Tooltip title="Xóa các tệp đã chọn">
                      <StyledBulkDeleteIconButton
                        disabled={isUploading || isScanning}
                        onClick={handleBulkDeleteClick}
                      >
                        <StyledBulkDeleteIcon />
                      </StyledBulkDeleteIconButton>
                    </Tooltip>
                  )}
                  {!hiddenButtonScan && (
                    <StyledSecondaryActionButton
                      variant="outlined"
                      size="small"
                      disabled={isUploading || isScanning}
                      onClick={handleOpenScan}
                      startIcon={<CropFreeIcon />}
                    >
                      Quét văn bản
                    </StyledSecondaryActionButton>
                  )}
                  <StyledSecondaryActionButton
                    component="label"
                    variant="outlined"
                    size="small"
                    disabled={isUploading || isScanning}
                    startIcon={<UploadRoundedIcon />}
                  >
                    Tải lên tệp tin
                    <input
                      hidden
                      multiple
                      type="file"
                      onChange={handleUpload}
                    />
                  </StyledSecondaryActionButton>
                </StyledSecondaryActionStack>
              )}
            </StyledSecondaryHeader>
          ) : (
            <>
              {/* BÊN TRÁI */}
              <StyledContainerUploadLabel>
                <SectionGrid noneMarginTop>
                  {showLabel && !hiddenTitle && (isOpen || !hideLabelWhenClosed) && (
                    customLabel ? (
                      customLabel
                    ) : (
                      <StyledHeaderTitleStack>
                        <Tooltip title={label} placement="top-start">
                          <UploadLabel variant="subtitle1"  >
                            {label}
                            {isRequired && (
                              <IconRequied component="span">*</IconRequied>
                            )}
                          </UploadLabel>
                        </Tooltip>
                        {isOpen && files.length > 0 && showDownloadAll && (
                          <Tooltip title="Tải xuống tất cả">
                            <StyledDownloadAllButton size="small" onClick={handleDownloadAll}>
                              <StyledCloudDownloadIcon />
                            </StyledDownloadAllButton>
                          </Tooltip>
                        )}
                      </StyledHeaderTitleStack>
                    )
                  )}
                  {flagSign && !hiddenBatchSign && (
                    <BatchSignContainer showLabel>
                      {(() => {
                        const available = documentDetail?.availableActions || [];
                        const seenTypes = new Set();
                        const uniqueActions = available.filter((action) => {
                          if (!action?.type || seenTypes.has(action.type)) return false;
                          seenTypes.add(action.type);
                          return true;
                        });
                        return uniqueActions.map((action) => {
                          if (
                            action.type === "signContentDraft" ||
                            action.type === "signFormatDraft" ||
                            action.type === "reportSigner"
                          ) {
                            return (
                              <Tooltip title="Ký đồng thời" key={action.type}>
                                <span>
                                  <CustomButton
                                    component="label"
                                    variant="contained"
                                    disabled={isUploading || isScanning}
                                    startIcon={
                                      isUploading ? (
                                        <CircularProgress size={24} />
                                      ) : (
                                        <StyleDriveFileRenameOutlineOutlinedIcon />
                                      )
                                    }
                                    onClick={handleOpenBatchSign}
                                  >
                                    {isUploading ? (
                                      <StyledButtonText component="span">
                                        Đang ký đồng thời...
                                      </StyledButtonText>
                                    ) : (
                                      <StyledButtonText component="span">
                                        Ký đồng thời
                                      </StyledButtonText>
                                    )}
                                  </CustomButton>
                                </span>
                              </Tooltip>
                            );
                          }
                          return null;
                        });
                      })()}
                    </BatchSignContainer>
                  )}
                  {flags && value?.length > 0 && (
                    <CustomButton onClick={onButtonClick}  >
                      {titleButton}
                    </CustomButton>
                  )}
                </SectionGrid>

                {!hiddenToggleIcon && (
                  <Tooltip title={isOpen ? "Thu gọn" : "Mở rộng"}>
                    <StyledIconKeyboardArrow size="small" onClick={handleToggleOpen}>
                      {isOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </StyledIconKeyboardArrow>
                  </Tooltip>
                )}
              </StyledContainerUploadLabel>
            </>
          )}
        </UploadHeader>
      )}



      {buttonPosition === "top" && showButtons && isOpen && !useSecondaryLayout &&(
        <StyledContainerButtons buttonAlign={buttonAlign}>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Tải lên">
              <span>
                <CustomButton
                  component="label"
                  variant="contained"
                  disabled={isUploading || isScanning}
                  startIcon={
                    isUploading ? (
                      <CircularProgress size={24} />
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M2.4375 9.75H5.1975C5.44439 9.74996 5.68747 9.81087 5.90517 9.92731C6.12288 10.0437 6.30848 10.2121 6.4455 10.4175L7.0545 11.3325C7.19152 11.5379 7.37712 11.7063 7.59483 11.8227C7.81253 11.9391 8.05561 12 8.3025 12H9.6975C9.94439 12 10.1875 11.9391 10.4052 11.8227C10.6229 11.7063 10.8085 11.5379 10.9455 11.3325L11.5545 10.4175C11.6915 10.2121 11.8771 10.0437 12.0948 9.92731C12.3125 9.81087 12.5556 9.74996 12.8025 9.75H15.5625"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M9.00225 9L9 5.04M4.0875 3.0825L2.466 8.96775C2.3228 9.4869 2.25015 10.023 2.25 10.5615V14.25C2.25 14.6478 2.40804 15.0294 2.68934 15.3107C2.97064 15.592 3.35218 15.75 3.75 15.75H14.25C14.6478 15.75 15.0294 15.592 15.3107 15.3107C15.592 15.0294 15.75 14.6478 15.75 14.25V10.5615C15.7499 10.023 15.6772 9.4869 15.534 8.96775L13.9125 3.0825C13.7883 2.83259 13.5969 2.62228 13.3597 2.47521C13.1226 2.32814 12.8491 2.25015 12.57 2.25H5.43C5.15094 2.25015 4.87745 2.32814 4.64028 2.47521C4.40312 2.62228 4.21168 2.83259 4.0875 3.0825Z"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M10.875 6.48975L9 4.5L7.125 6.48975"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )
                  }
                >
                  {isUploading ? (
                    <StyledButtonText component="span">
                      Đang tải lên...
                    </StyledButtonText>
                  ) : (
                    <StyledButtonText component="span">
                      Tải Lên
                    </StyledButtonText>
                  )}
                  <input
                    hidden
                    multiple
                    type="file"
                    onChange={handleUpload}
                  />
                </CustomButton>
              </span>
            </Tooltip>

            {!hiddenButtonScan && (
              <Tooltip title="Quét văn bản">
                <span>
                  <CustomButton
                    variant="contained"
                    disabled={isUploading || isScanning}
                    onClick={handleOpenScan}
                    startIcon={
                      isScanning ? (
                        <CircularProgress size={24} />
                      ) : (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M3.75 15C3.3375 15 2.9845 14.8533 2.691 14.5597C2.3975 14.2662 2.2505 13.913 2.25 13.5V11.25H3.75V13.5H12.75V11.25H14.25V13.5C14.25 13.9125 14.1033 14.2657 13.8097 14.5597C13.5162 14.8538 13.163 15.0005 12.75 15H3.75ZM2.25 6.75V1.5C2.25 1.0875 2.397 0.7345 2.691 0.441C2.985 0.1475 3.338 0.0005 3.75 0H9.75L14.25 4.5V6.75H12.75V5.25H9V1.5H3.75V6.75H2.25ZM0 9.75V8.25H16.5V9.75H0Z"
                            fill="white"
                          />
                        </svg>
                      )
                    }
                  >
                    {isScanning ? (
                      <StyledButtonText component="span">
                        Đang quét...
                      </StyledButtonText>
                    ) : (
                      <StyledButtonText component="span">
                        Quét
                      </StyledButtonText>
                    )}
                  </CustomButton>
                </span>
              </Tooltip>
            )}
          </Stack>
        </StyledContainerButtons>
      )}

      {/* --- TABLE --- */}
      {isOpen && files.length > 0 && !hiddenTable && (

        <FileTableInPopup
          files={files}
          onPreview={handlePreview}
          onSignDigital={handleOpenSignDigitalDialog}
          onDownload={handleDownload}
          onDelete={handleDeleteClick}
          // onEdit={handleEdit}
          onOpenIframe={handleOpenInIframe}
          onGiveNumber={handleOpenChoSo}
          onDigitalSign={handleOpenKySo}
          onSignDraft={handleOpenSignDraft}
          onSignCertificate={handleOpenSignCertificate}
          // canDigitalSign={canDigitalSign}
          // canSignDraft={canSignDraft}
          // canSignCertificate={canSignCertificate}
          isView={isView}
          setReloadDoc={setReloadDoc}
          editFile={editFile}
          canGiveNumber={canGiveNumber}
          canCreateFileCopy={canCreateFileCopy}
          objectType={objectType}
          objectId={objectId}
          onRefreshList={refetchFiles}
          allowSignDigital={allowSignDigital}
          allowSignInitial={allowSignInitial}
          // onDownloadTool={handleDownloadTool}
          canNotDeleteFile={canNotDeleteFile}
          documentDetail={documentDetail}
          documentDetailFull={documentDetailFull}
          extraColumns={
            objectType === "incommingdocument" && isColumnOfTextToCopy
              ? extraColumns
              : []
          }
          onCreateCertifiedCopyReport={handleCreateCertifiedCopyReport}
          selectedFileCopyKey={selectedCertifiedSignId}
          isCompact={isCompact}
          hiddenDownload={hiddenDownload}
          hiddenPreview={hiddenPreview}
          isActionMenu={isActionMenu}
          onDownloadAll={handleDownloadAll}
          showDownloadAll={showDownloadAll}
          disableActions={disableActions}
          isVanThu={isVanThu}
          useSecondaryLayout={useSecondaryLayout}
          hiddenTypeAndSize={hiddenTypeAndSize}
          allowMultipleDelete={allowMultipleDelete}
          selectedDeleteKeys={selectedDeleteKeys}
          onToggleSelectDelete={handleToggleSelectDelete}
          onSelectAllDelete={handleSelectAllDelete}
        />




      )}

      {buttonPosition === "bottom" && showButtons && isOpen && (
        <StyledContainerButtons buttonAlign={buttonAlign}>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Tải lên">
              <span>
                <CustomButton
                  component="label"
                  variant="contained"
                  disabled={isUploading || isScanning}
                  startIcon={
                    isUploading ? (
                      <CircularProgress size={24} />
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M2.4375 9.75H5.1975C5.44439 9.74996 5.68747 9.81087 5.90517 9.92731C6.12288 10.0437 6.30848 10.2121 6.4455 10.4175L7.0545 11.3325C7.19152 11.5379 7.37712 11.7063 7.59483 11.8227C7.81253 11.9391 8.05561 12 8.3025 12H9.6975C9.94439 12 10.1875 11.9391 10.4052 11.8227C10.6229 11.7063 10.8085 11.5379 10.9455 11.3325L11.5545 10.4175C11.6915 10.2121 11.8771 10.0437 12.0948 9.92731C12.3125 9.81087 12.5556 9.74996 12.8025 9.75H15.5625"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M9.00225 9L9 5.04M4.0875 3.0825L2.466 8.96775C2.3228 9.4869 2.25015 10.023 2.25 10.5615V14.25C2.25 14.6478 2.40804 15.0294 2.68934 15.3107C2.97064 15.592 3.35218 15.75 3.75 15.75H14.25C14.6478 15.75 15.0294 15.592 15.3107 15.3107C15.592 15.0294 15.75 14.6478 15.75 14.25V10.5615C15.7499 10.023 15.6772 9.4869 15.534 8.96775L13.9125 3.0825C13.7883 2.83259 13.5969 2.62228 13.3597 2.47521C13.1226 2.32814 12.8491 2.25015 12.57 2.25H5.43C5.15094 2.25015 4.87745 2.32814 4.64028 2.47521C4.40312 2.62228 4.21168 2.83259 4.0875 3.0825Z"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M10.875 6.48975L9 4.5L7.125 6.48975"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )
                  }
                >
                  {isUploading ? (
                    <StyledButtonText component="span">
                      Đang tải lên...
                    </StyledButtonText>
                  ) : (
                    <StyledButtonText component="span">
                      Tải Lên
                    </StyledButtonText>
                  )}
                  <input
                    hidden
                    multiple
                    type="file"
                    onChange={handleUpload}
                  />
                </CustomButton>
              </span>
            </Tooltip>

            {!hiddenButtonScan && (
              <Tooltip title="Quét văn bản">
                <span>
                  <CustomButton
                    variant="contained"
                    disabled={isUploading || isScanning}
                    onClick={handleOpenScan}
                    startIcon={
                      isScanning ? (
                        <CircularProgress size={24} />
                      ) : (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M3.75 15C3.3375 15 2.9845 14.8533 2.691 14.5597C2.3975 14.2662 2.2505 13.913 2.25 13.5V11.25H3.75V13.5H12.75V11.25H14.25V13.5C14.25 13.9125 14.1033 14.2657 13.8097 14.5597C13.5162 14.8538 13.163 15.0005 12.75 15H3.75ZM2.25 6.75V1.5C2.25 1.0875 2.397 0.7345 2.691 0.441C2.985 0.1475 3.338 0.0005 3.75 0H9.75L14.25 4.5V6.75H12.75V5.25H9V1.5H3.75V6.75H2.25ZM0 9.75V8.25H16.5V9.75H0Z"
                            fill="white"
                          />
                        </svg>
                      )
                    }
                  >
                    {isScanning ? (
                      <StyledButtonText component="span">
                        Đang quét...
                      </StyledButtonText>
                    ) : (
                      <StyledButtonText component="span">
                        Quét
                      </StyledButtonText>
                    )}
                  </CustomButton>
                </span>
              </Tooltip>
            )}
          </Stack>
        </StyledContainerButtons>
      )}

      {/* --- CÁC DIALOG KHÁC (GIỮ NGUYÊN) --- */}
      <FilePreviewDialog
        open={previewOpen}
        onClose={handleClosePreview}
        fileName={previewFileName}
				url={previewUrl}
				hiddenDownload={hiddenDownload}
        verificationResult={verificationResult}
        showSignatureIcon={showSignatureIcon}
      />

      <Dialog
        fullScreen
        open={iframeDialog.open}
        onClose={handleCloseIframeDialog}
        TransitionComponent={Transition}
        TransitionProps={{
          onExited: handleIframeDialogExited,
        }}
      >
        <StyledPreviewAppBar>
          <Toolbar variant="dense">
            <StyledDialogTitle variant="h6" component="div">
              {iframeDialog.file?.fileName ||
                iframeDialog.file?.name ||
                "Chỉnh sửa tài liệu"}
            </StyledDialogTitle>

            <StyledCancelButton
              onClick={handleCloseIframeDialog}
              startIcon={<CloseIcon />}
            >
              Đóng
            </StyledCancelButton>
          </Toolbar>
        </StyledPreviewAppBar>

        <PreviewContainer>
          <PreviewContentBox>
            {iframeDialog?.file && (
              <EditStyled
                key={
                  iframeDialog.file._id ||
                  iframeDialog.file.id ||
                  "editor-wrapper"
                }
              >
                {/* ❌ OnlyOffice - Đã thay thế bằng Collabora */}
                {/*
                <OnlyOfficeEditor
                  fileId={iframeDialog.file._id || iframeDialog.file.id}
                  fileName={
                    iframeDialog.file.fileName ||
                    iframeDialog.file.name ||
                    iframeDialog.file.file_name
                  }
                  objectType={objectType}
                  objectId={objectId}
                />
                */}

                {/* ✅ Collabora Online - WOPI Integration */}
                <CollaboraEditor
                  fileId={iframeDialog.file._id || iframeDialog.file.id}
                  fileName={
                    iframeDialog.file.fileName ||
                    iframeDialog.file.name ||
                    iframeDialog.file.file_name
                  }
                  objectType={objectType}
                  objectId={objectId}
                   
                />
              </EditStyled>
            )}
          </PreviewContentBox>
        </PreviewContainer>
      </Dialog>

      {scanDialogState && (
        <ScanDialog
          onSave={handleSaveScan}
          scanDialog={scanDialogState}
          setScanDialog={setScanDialogState}
        />
      )}

      <PopupGiveNumber
        open={openChoSo}
        onClose={handleCloseChoSo}
        onSave={handleSubmit(handleSaveGiveNumber)}
        handleSubmit={handleSubmit}
        onSubmit={handleSaveGiveNumber}
        control={control}
        reset={reset}
        setValue={setValue}
        errors={errors}
        watch={watch}
        files={selectedFileForGiveNumber ? [selectedFileForGiveNumber] : files}
        handlePreview={handlePreview}
        handlePreviewGiveNumber={handlePreviewGiveNumber}
        handleDownload={handleDownload}
				draftSymbol={draftSymbol}
				isLoading={loadingGiveNumber}
      />

      <ViewFileBase64
        open={viewerDialogOpen}
        onClose={handleCloseViewerDialog}
        base64String={dataFileBase64}
        fileName="bienban.pdf"
        title="Xem trước file"
      />

      <PopupSignDigital
        open={signDigitalDialog.open}
        onClose={handleCloseSignDigitalDialog}
        onSave={handleConfirmSignDigitalWrapper}
        isLoading={isUploading}
        //  isLoading={isLoading}
        fileName={
          signDigitalDialog.file?.fileName ||
          signDigitalDialog.file?.name ||
          signDigitalDialog.file?.file_name
        }
      />

      <CustomDialog
        open={deleteConfirm.open}
        onClose={handleCloseDeleteDialog}
        onSave={handleConfirmDelete}
        title="Xác nhận xóa"
        type="delete"
      >
        <Typography>
          {deleteConfirm.isBulk
            ? `Bạn có chắc chắn muốn xóa ${selectedDeleteKeys.length} tệp tin đã chọn không?`
            : `Bạn có chắc chắn muốn xóa tệp tin ${
                deleteConfirm.file?.name ||
                deleteConfirm.file?.fileName ||
                deleteConfirm.file?.file_name
              } không?`}
        </Typography>
      </CustomDialog>

      {/* Popup xác nhận gửi OTP */}
      <OtpOrPinCodeConfirmDialog
        open={signOtpDialog.open}
        onClose={handleCloseKySo}
        onConfirm={handleSubmitConfirmOtpOrPinCode}
        title="Xác nhận Ký Số"
        isLoading={isOtpLoading}
        email={profileUser?.emailUser}
        phone={profileUser?.phone_number_user}
        error={otpError}
        onChangeConfirmMethod={handleChangeConfirmMethod}
        confirmMethod={confirmMethod}
      />
      {/* Popup nhập OTP hoặc mã PIN*/}
      <PopupSendOTP
        open={signOtpInputDialog.open}
        onClose={handleCloseOtpInputDialog}
        // onSave={handleSubmitOtp(handleConfirmOtpInputDialog)}
        onSave={handleSubmitOtp(handleSubmitConfirm)}
        isLoading={isOtpLoading}
        title={confirmMethod === "caSoft" ? "Nhập mã OTP" : "Nhập mã PIN"}
        type={confirmMethod}
        handleSubmit={handleSubmitOtp}
        onSubmit={handleSubmitConfirm}
        // onSubmit={handleConfirmOtpInputDialog}
        control={controlOtp}
        errors={errorsOtp}
      />

      {/* Popup ký số sau khi xác thực OTP */}
      <PopupSignDigital
        open={signOtpSignatureDialog.open}
        onClose={handleCloseSignOtpDialog}
        onSave={handleConfirmSign}
        isLoading={isUploading}
        fileName={
          signOtpSignatureDialog.file?.fileName ||
          signOtpSignatureDialog.file?.name ||
          signOtpSignatureDialog.file?.file_name
        }
        hidePasswordField
        signType={signOtpSignatureDialog.type}
        signKey={documentDetail?.signKey?.keySign}
        documentDetail={documentDetail}
      />
      {/* <PopupSignDigital
        open={signOtpSignatureDialog.open}
        onClose={handleCloseSignOtpDialog}
        onSave={handleConfirmSignWithOtp}
        isLoading={isUploading}
        fileName={
          signOtpSignatureDialog.file?.fileName ||
          signOtpSignatureDialog.file?.name ||
          signOtpSignatureDialog.file?.file_name
        }
        hidePasswordField
      /> */}

      <PopupCreateCertifiedCopyReport
        open={openCertifiedCopyReport}
        onClose={handleCloseCertifiedCopyReport}
        onConfirm={handleSaveCertifiedCopyRecord}
        file={selectedFileForCertifiedCopy}
        documentDetailFull={documentDetailFull}
        selectedFileForCertifiedCopy={selectedFileForCertifiedCopy}
      />

      <FilePreviewDialog
        open={signCopyPreviewDialog.open}
        onClose={handleCloseSignCopyPreviewDialog}
        onConfirm={handleConfirmSignCopyPreviewDialog}
        confirmLabel="Bắt đầu ký"
        fileName={
          signCopyPreviewDialog.file?.fileName ||
          signCopyPreviewDialog.file?.name ||
          signCopyPreviewDialog.file?.file_name
        }
        url={signCopyPreviewDialog.url}
        hiddenDownload
        showSignatureIcon={showSignatureIcon}
      />

      {(isUploading || isScanning) && (
        <StyledBackdrop open={isUploading || isScanning}>
          <StyledLoadingStack>
            <StyledCircularProgress />
            <Typography variant="body1">
              {isUploading ? "Đang xử lý tài liệu..." : "Đang quét..."}
            </Typography>
          </StyledLoadingStack>
        </StyledBackdrop>
      )}

      {/* Container ẩn dùng để mount thẻ download link (cho cả File và Tool) */}
      <div ref={downloadRef} style={{ display: "none" }} />
    </StyledContainerUploadFile>
  );
}

UploadFile.propTypes = {
  id: PropTypes.string,
  label: PropTypes.string,
  value: PropTypes.array,
  onChange: PropTypes.func,
  sharedComponents: PropTypes.object,
  isView: PropTypes.bool,
  objectType: PropTypes.string,
  objectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  manualUpload: PropTypes.bool,
  canGiveNumber: PropTypes.bool,
  canDigitalSign: PropTypes.bool,
  canSignDraft: PropTypes.bool,
  canSignCertificate: PropTypes.bool,
  editFile: PropTypes.bool,
  draftSymbol: PropTypes.string,
  documentDetail: PropTypes.object,
  setReloadData: PropTypes.func,
  hiddenUploadAndScan: PropTypes.bool,
  hiddenLabel: PropTypes.bool,
  hiddenButtonScan: PropTypes.bool,
  hiddenBatchSign: PropTypes.bool,
  allowSignDigital: PropTypes.bool,
  noneBorder: PropTypes.bool,
  isRequired: PropTypes.bool,
  onToggleCertifiedSign: PropTypes.func,
  onToggleImportant: PropTypes.func,
  isColumnOfTextToCopy: PropTypes.bool,
  customLabel: PropTypes.node,
  hiddenDownload: PropTypes.bool,
  hiddenPreview: PropTypes.bool,
  isActionMenu: PropTypes.bool,
  hideLabelWhenClosed: PropTypes.bool,
  hiddenTitle: PropTypes.bool,
	hiddenToggleIcon: PropTypes.bool,
	disableActions: PropTypes.bool,
  showSignatureIcon: PropTypes.bool,
  hiddenTable: PropTypes.bool,
  fetchOnMount: PropTypes.bool,
  hiddenNeedCertifiedSign: PropTypes.bool,
  onSigningStateChange: PropTypes.func,
  onUploadErrorChange: PropTypes.func,
  allowMultipleDelete: PropTypes.bool,
};

export default UploadFile;

