import withSharedComponents from "@components/WrapperComponent";
import React, { lazy, memo, useCallback, useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { MAX_DEPTH_LEVEL } from "@variable";
import CircularProgress from '@mui/material/CircularProgress';
import { useDispatch, useSelector } from "react-redux";
import { Box, Typography, useMediaQuery, useTheme, RadioGroup, FormControlLabel, Button } from "@mui/material";
import { getSideBarMenu } from "@redux/slices/ManagerMenu/managementMenuSlice";
import { styled, alpha } from "@mui/material/styles";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PropTypes from "prop-types";
import {
  StyleMenu,
  StyleMenuItem,
  WarningIconStyled
} from "@styles/QualificationManagement.styles";
import {
  StyledDialog,
  StyledDialogActions,
  StyledDialogContent,
  SaveButton,
	StyledContentPopupViewed,
} from "@styles/CustomDialog.styles";



import ButtonOutline from "@components/CustomButtonOutline";
import { API_PROCCESS_DOCUMENT } from "@EnvironmentFile/constants/ulrConfigNew";
import axiosInstance from "@utils/axiosInstance";
import DOMPurify from "dompurify";

import { ACTION_MAP, typeFlagMap } from "./constant";
import { API_WORK_ITEMS, APP_BASE, API_ADD_MEETING_SCHEDULE, API_DELEGATE_PARTICIPANT, API_REJECT_REQUEST, API_CANCEL_REQUEST, API_COMPLETED_REQUEST, API_CONFIRM_DRIVER, API_ADD_VANBANDI_DHVB, API_CONFIRM_REJECT_INCOMING } from "@EnvironmentFile/constants/urlConfig";


// Import Plugin Registry System
import pluginRegistry from "./pluginRegistry";
import { FormLabel } from "@pages/MeetingCalendar/componentStyle/RegisterForMeetingRooms.style";
import { SkyBox, SkyFlexGap16, SkyFlexGap8, SkyTypography } from "@styles/SkyStyles";
import {  promulgateDoc} from "@redux/slices/OutGoingDoc/OutGoingDocSlice";
import {
  ConfirmScopeTitle,
  ConfirmScopeLabel,
  ConfirmScopeRadio
} from "@pages/MeetingCalendar/componentStyle/CreateMeetingSchedule.styles";

import { postGiveNumber, postInsertTextToPdf, putGiveNumber, convertFileToPdf } from "@redux/slices/GiveNumber/GiveNumberSlice";
import { withFormWrapper } from "@components/common/FormWrapper";

import LoadingDialog from "@components/LoadingDialog";
import CustomDialog from "@components/CustomDialog/CustomDialog";

const ReturnModel = lazy(() => import("@components/ReturnModel"));
const SigningSubmission = lazy(() => import("@components/SigningSubmission"));
const FeedbackModel = lazy(() => import("@components/FeedbackModel"));
const RecallTextModel = lazy(() => import("@components/RecallTextModel"));
const TransferFeedback = lazy(() => import("@components/TransferFeedback"));
const SubmitProposal = lazy(() => import("@components/SubmitProposal/indexSubmitV2"));
const AdditionalRelease = lazy(() => import("@components/AdditionalRelease/indexPHBS"));
const SubmitApproval = lazy(() => import("@components/SubmitApproval"));
const ApproveNewsDialogBulk = lazy(() => import("@pages/NewsPage/components/ApproveNewsDialogBulk"));
const RecallNewsDialogBulk = lazy(() => import("@pages/NewsPage/components/RecallNewsDialogBulk"));
const SuggestTransferProcess = lazy(() => import("@components/SuggestTransferProcess/indexV2"));
const ParticipatingUnits = lazy(() => import("@pages/MeetingCalendar/components/ParticipatingUnits"));
const RecallIncomingTextDialog = lazy(() => import("@pages/IncomingDocumentManagement/components/RecallIncomingTextDialog"));
// import dayjs from "dayjs";

// ─── Error Boundary cho Lazy components ───────────────────────────────────────
class LazyErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Không dùng console.log theo rule. Lỗi được catch im lặng để không crash UI.
    void error;
    void info;
  }

  render() {
    if (this.state.hasError) {
      // Trả về null — không hiện gì, không sập giao diện
      return null;
    }
    return this.props.children;
  }
}

/**
 * Bọc mỗi lazy component trong ErrorBoundary + Suspense riêng biệt.
 * Mục đích: loading/lỗi của một component không ảnh hưởng phần còn lại.
 */
const LAZY_SUSPENSE_FALLBACK = (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 40 }}>
    <CircularProgress size={22} />
  </div>
);

function SafeLazy({ children }) {
  return (
    <LazyErrorBoundary>
      <React.Suspense fallback={LAZY_SUSPENSE_FALLBACK}>
        {children}
      </React.Suspense>
    </LazyErrorBoundary>
  );
}
// ──────────────────────────────────────────────────────────────────────────────

const getDashboardButtonPalette = (theme, variantType, variantColor) => {
  const normalized = String(variantColor || "").toLowerCase();

  if (variantType === "outline") {
    return {
      border: alpha(theme.palette.primary.main, 0.18),
      background: theme.palette.background.paper,
      color: theme.palette.primary.main,
      hoverBackground: alpha(theme.palette.primary.main, 0.06),
    };
  }

  if (/(reject|danger|error|red|cancel|refuse)/.test(normalized)) {
    return {
      border: "#f1b8b8",
      background: "#fff1f1",
      color: "#d94b4b",
      hoverBackground: "#ffe5e5",
    };
  }

  if (/(approve|primary|blue|info|accept|success)/.test(normalized)) {
    return {
      border: "#a9c8f2",
      background: "#eef5ff",
      color: "#2f6fbf",
      hoverBackground: "#e4efff",
    };
  }

  return {
    border: "#9ad9d3",
    background: "#e8f7f5",
    color: "#008f85",
    hoverBackground: "#ddf3f0",
  };
};

const ButtonDashboardPage = styled(Button, {
  shouldForwardProp: (prop) => prop !== "variantType" && prop !== "variantColor",
})(({ theme, variantType, variantColor }) => {
  const palette = getDashboardButtonPalette(theme, variantType, variantColor);

  return {
    padding: "0 14px",
    borderRadius: 10,
    // borderRadius: 999,
    fontSize: 10,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all .15s",
    whiteSpace: "nowrap",
    textTransform: "none",
    minWidth: "fit-content",
    height: "28px",
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: `1px solid ${palette.border}`,
    // background: palette.background,
    color: palette.color,
    boxShadow: "none",
    "&:hover": {
      background: palette.hoverBackground,
      boxShadow: "none",
      opacity: 1,
    },
    "&:disabled": {
      background: "#f5f5f5",
      color: "#bdbdbd",
      borderColor: "#e0e0e0",
    },
  };
});

const getDashboardButtonTone = (action) => {
  const actionSignature = `${action?.type || ""} ${action?.label || ""}`.toLowerCase();

  if (/(reject|từ chối|không duyệt|hủy|huỷ|cancel|refuse)/.test(actionSignature)) {
    return "reject";
  }

  if (/(approve|phê duyệt|xác nhận|đồng ý|accept|confirm)/.test(actionSignature)) {
    return "approve";
  }

  return action?.color || "default";
};

const RecallDialogBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const SecondaryTypography = styled(Typography)(({ theme }) => ({
  fontSize: "12px",
  color: theme.palette.text.secondary,
}));

const isDocumentFile = (file) => {
  if (!file) return false;
  const fileName = file.fileName || file.file_name || file.name || "";
  const docExtensions = ["pdf", "doc", "docx", "txt", "xls", "xlsx"];
  const fileExt = fileName.split(".").pop()?.toLowerCase();
  if (docExtensions.includes(fileExt)) return true;

  const docMimetypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  return docMimetypes.includes(file.mimetype || file.mime_type);
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
  let date;
  if (typeof releaseDate === 'string' && releaseDate.includes('/')) {
    const parts = releaseDate.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      date = new Date(year, month, day);
    } else {
      date = new Date(releaseDate);
    }
  } else if (releaseDate instanceof Date) {
    date = releaseDate;
  } else {
    date = new Date(releaseDate);
  }

  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  const formattedDay = String(day).padStart(2, "0");
  const formattedMonth = month <= 2 ? String(month).padStart(2, "0") : month;
  const docNumber = getDocNumberForAuto({ toBook, releaseNo });
  const formattedDocId = docNumber ? docNumber.padStart(2, "0") : "";

  return [
    {
      key: "NgayVanBan",
      value: `ngày ${formattedDay} tháng ${formattedMonth} năm ${year}`,
    },
    { key: "So", value: formattedDocId },
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

function FormButton(props) {
  const {
    sharedComponents,
    dataDetail,
    setReloadData,
    onClose = () => { },
    selectedIds,
    isUpdate,
    isView,
    getFormDataForUpdate,
    onAction,// New prop,
    viewMode,
    allSelectedData,
    allElectronic,
    allManual,
    onTransferSuccess, // Callback khi chuyển xử lý thành công
    disabled,
    isDashboardLook = false,
    isVanThuCuc,
    draftFiles,
    panelContainerRef,
    onOpenSuggestion,
    onOpenInlineTransfer,
    hasUploadError,
    isUploadingFiles,
    onCloseInlinePanel,
    // noWrapper = false,
  } = props;
  const {
    Button,
    Input,
    TransferProcess,
    SaveForReference,
    toast = () => { },
    SaveBookModel,
    InputComponents,
  } = sharedComponents;
  // logger.log("Dataaaaaaaa", dataDetail)
  const theme = useTheme();
  const isMobileTablet = useMediaQuery(theme.breakpoints.between(350, 750));
  const dispatch = useDispatch();
  const isAuthority = useMemo(() => dataDetail?.document?.isAuthority || dataDetail?.isAuthority, [dataDetail?.document?.isAuthority, dataDetail?.isAuthority]);
  const [openDialog, setOpenDialog] = useState({});
  // logger.log("ossssspenDialog", openDialog);
  const [anchorEl, setAnchorEl] = useState(null);
  const flags = useMemo(() => dataDetail?.flags || {}, [dataDetail?.flags]); // Removed useState to prevent double render
  const [currentAction, setCurrentAction] = useState(null);
  const [actionCode, setActionCode] = useState(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
  const [note, setNote] = useState(''); // Added note state
  const [noteError, setNoteError] = useState(''); // Error state for note validation
  const {
    control: rejectJoinControl,
    handleSubmit: handleRejectJoinSubmit,
    reset: resetRejectJoinForm,
    formState: { errors: rejectJoinErrors },
  } = useForm({
    defaultValues: {
      rejectJoinNote: "",
    },
  });

  useEffect(() => {
    if (openDialog.RejectJoin) {
      resetRejectJoinForm({ rejectJoinNote: "" });
    }
  }, [openDialog.RejectJoin, resetRejectJoinForm]);
  const [recallReason, setRecallReason] = useState('');
  const [recallReasonError, setRecallReasonError] = useState('');
  const [openParticipatingUnits, setOpenParticipatingUnits] = useState(false);
  const [delegatedUsers, setDelegatedUsers] = useState([]);
  const [cancelRecurrenceType, setCancelRecurrenceType] = useState('ONLY_THIS');
  const { dataUser } = useSelector((state) => state.auth);
  const { listBookDocuments } = useSelector((state) => state.giveNumber || {});
  const FormInput = useMemo(() => withFormWrapper(Input, "input"), [Input]);

  const [, setSelectedSigners] = useState(null);
  // logger.log(selectedSigners)
  // const handleSignerChange = useCallback((newValue) => {
  //   setSelectedSigners(newValue);
  // }, []);

  const handleChangeNote = useCallback((e) => {
    setNote(e.target.value);
    // Clear error when user starts typing
    if (noteError) {
      setNoteError('');
    }
  }, [noteError]);
  const handleCancelRecurrenceTypeChange = useCallback((e) => {
    setCancelRecurrenceType(e.target.value);
  }, []);

  const handleChangeRecallReason = useCallback((e) => {
    setRecallReason(e.target.value);
    if (recallReasonError) {
      setRecallReasonError('');
    }
  }, [recallReasonError]);

  const userId = dataUser?._id || dataUser?.id;

  const workItem = dataDetail?.workItem?.id;
  const documentId = dataDetail?.document?.documentId || dataDetail?.documentId || dataDetail?.document?.id || dataDetail?.id || dataDetail?.recordId;
  const isIncomming = !!(dataDetail?.document?.isIncomming || dataDetail?.isIncomming);

  const [isLoading, setIsLoading] = useState(false);
  const [viewedTimerDone, setViewedTimerDone] = useState(!isIncomming);
  // Sử dụng state để theo dõi sự thay đổi của văn bản hiện tại
  const [prevDocId, setPrevDocId] = useState(documentId);

  const excludeUserIdsData = useMemo(() => {
    const ids = new Set();
    const curUserId = dataUser?.id || dataUser?._id || userId;
    if (curUserId) {
      ids.add(curUserId.toString());
    }

    // Disable chairman
    if (dataDetail?.chairman && Array.isArray(dataDetail.chairman)) {
      dataDetail.chairman.forEach(c => {
        if (c.userId) ids.add(c.userId.toString());
        if (c.id) ids.add(c.id.toString());
      });
    }

    // Disable secretary
    if (dataDetail?.secretary && Array.isArray(dataDetail.secretary)) {
      dataDetail.secretary.forEach(s => {
        if (s.userId) ids.add(s.userId.toString());
        if (s.id) ids.add(s.id.toString());
      });
    }

    return Array.from(ids);
  }, [dataUser, userId, dataDetail]);


  // Đồng bộ state ngay khi render nếu văn bản thay đổi để tránh "nháy" (flicker)
  if (documentId !== prevDocId) {
    setPrevDocId(documentId);
    setViewedTimerDone(!isIncomming);
  }

  useEffect(() => {
    let timer;
    if (isIncomming && documentId) {
      // Nếu là văn bản đến, bắt đầu đếm ngược
      setViewedTimerDone(false);
      timer = setTimeout(() => {
        setViewedTimerDone(true);
      }, 15000);
    } else {
      // Nếu không phải văn bản đến, hiển thị nút ngay lập tức
      setViewedTimerDone(true);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [documentId, isIncomming]);




  // const bodyUser = useMemo(() => {
  //   return {
  //     documentId: documentId?.toString(),
  //     userId: userId,
  //     type: openDialog?.ROLE_XIN_Y_KIEN ? 'feedback' : null,
  //     roles: openDialog?.ROLE_XIN_Y_KIEN,
  //     documentType: dataDetail?.document?.isIncomming || dataDetail?.isIncomming
  //       ? "incomingdocument"
  //       : "outgoingdocument",
  //   }
  // }, [documentId, userId, openDialog?.ROLE_XIN_Y_KIEN, dataDetail]);

  useEffect(() => {
    if (openDialog?.IssueProposal) {
      setSelectedSigners(null); // Reset state
    }
  }, [openDialog?.IssueProposal]);

  const handleCloseDialogReject = useCallback(() => {
    setOpenDialog((prev) => ({ ...prev, RejectMeeting: false, RejectModel: false }));
    setNote("");
  }, []);

  const handleCloseDialogRejectVehicleRegistrant = useCallback(() => {
    setOpenDialog((prev) => ({ ...prev, RejectVehicleRegistrant: false }));
    setNote("");
    setNoteError("");
  }, []);

  const handleCloseDialogCancelVehicleRegistrant = useCallback(() => {
    setOpenDialog((prev) => ({ ...prev, CancelVehicleRegistrant: false }));
    setNote("");
  }, []);

  const handleCloseDialogFinishVehicleRegistrant = useCallback(() => {
    setOpenDialog((prev) => ({ ...prev, FinishVehicleRegistrant: false }));
    // setNote("");
  }, []);
  const handleCloseDialogConfirmVehicleRegistrant = useCallback(() => {
    setOpenDialog((prev) => ({ ...prev, ConfirmVehicleRegistrant: false }));
    // setNote("");
  }, []);

  // const handleCloseDialogApprove = useCallback(() => {
  //   setOpenDialog((prev) => ({ ...prev, ApproveModel: false }));
  // }, []);
  const handleConfirmRejectVehicleRegistrant = useCallback(async () => {
    if (!note || !note.trim()) {
      setNoteError("Vui lòng nhập lý do từ chối");
      return;
    }
    const dataObj = dataDetail?.data || dataDetail || {};
    const id = dataDetail?.id || dataDetail?._id || dataDetail?.documentId || dataDetail?.vehicleRegistrationId || dataObj?.id || dataObj?._id || dataObj?.documentId || dataObj?.vehicleRegistrationId;
    const workItemId = dataDetail?.workItem || dataDetail?.workItemId;


    if (currentAction?.type === 'reject_vehicle_registrant' && workItemId && id) {
      try {
        const payload = {
          actionCode: openDialog?.actionCode || actionCode || currentAction?.code || '',
          workItem: workItemId,
          noteDetail: note
        };
        await axiosInstance.post(`${API_REJECT_REQUEST}/${id}`, payload);
        toast(`Đã từ chối yêu cầu đăng ký xe thành công`, "success");
        setReloadData?.(new Date());
        handleCloseDialogRejectVehicleRegistrant();
        onClose?.();
        return;
      } catch (error) {
        const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
        toast(errorMessage, "error");
        logger.error(error);
        return;
      }
    }

    // if (onAction) {
    //   onAction("reject_vehicle_registrant", { note });
    //   handleCloseDialogRejectVehicleRegistrant();
    // }
  }, [note, handleCloseDialogRejectVehicleRegistrant, dataDetail, actionCode, currentAction, openDialog, setReloadData, onClose, toast]);

  const handleConfirmCancelVehicleRegistrant = useCallback(async () => {
    const dataObj = dataDetail?.data || dataDetail || {};
    const id = dataDetail?.id || dataDetail?._id || dataDetail?.documentId || dataDetail?.vehicleRegistrationId || dataObj?.id || dataObj?._id || dataObj?.documentId || dataObj?.vehicleRegistrationId;
    const workItemId = dataDetail?.workItem || dataDetail?.workItemId;


    if (currentAction?.type === 'cancel_vehicle_registrant' && workItemId && id) {
      try {
        const payload = {
          actionCode: openDialog?.actionCode || actionCode || currentAction?.code || '',
          workItem: workItemId,
          noteDetail: note
        };
        await axiosInstance.post(`${API_CANCEL_REQUEST}/${id}`, payload);
        toast(`Đã hủy chuyến thành công`, "success");
        setReloadData?.(new Date());
        handleCloseDialogCancelVehicleRegistrant();
        onClose?.();
        return;
      } catch (error) {
        const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
        toast(errorMessage, "error");
        logger.error(error);
        return;
      }
    }
  }, [note, handleCloseDialogCancelVehicleRegistrant, dataDetail, actionCode, currentAction, openDialog, setReloadData, onClose, toast]);

  const handleConfirmFinishVehicleRegistrant = useCallback(async () => {
    const dataObj = dataDetail?.data || dataDetail || {};
    const id = dataDetail?.id || dataDetail?._id || dataDetail?.documentId || dataDetail?.vehicleRegistrationId || dataObj?.id || dataObj?._id || dataObj?.documentId || dataObj?.vehicleRegistrationId;
    const workItemId = dataDetail?.workItem || dataDetail?.workItemId;

    if (currentAction?.type === 'finish_vehicle_registrant' && workItemId && id) {
      try {
        const payload = {
          actionCode: openDialog?.actionCode || actionCode || currentAction?.code || '',
          workItem: workItemId,
        };
        await axiosInstance.post(`${API_COMPLETED_REQUEST}/${id}`, payload);
        toast(`Hoàn thành chuyến đi thành công`, "success");
        setReloadData?.(new Date());
        handleCloseDialogFinishVehicleRegistrant();
        onClose?.();
        return;
      } catch (error) {
        const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
        toast(errorMessage, "error");
        logger.error(error);
        return;
      }
    }
  }, [handleCloseDialogFinishVehicleRegistrant, dataDetail, actionCode, currentAction, openDialog, setReloadData, onClose, toast]);

  const handleConfirmVehicleRegistrant = useCallback(async () => {
    const dataObj = dataDetail?.data || dataDetail || {};
    const id = dataDetail?.id || dataDetail?._id || dataDetail?.documentId || dataDetail?.vehicleRegistrationId || dataObj?.id || dataObj?._id || dataObj?.documentId || dataObj?.vehicleRegistrationId;
    const workItemId = dataDetail?.workItem || dataDetail?.workItemId;

    if (currentAction?.type === 'comfirm_vehicle_registrant' && workItemId && id) {
      try {
        const payload = {
          actionCode: openDialog?.actionCode || actionCode || currentAction?.code || '',
          workItem: workItemId,
        };
        await axiosInstance.post(`${API_CONFIRM_DRIVER}/${id}`, payload);
        toast(`Xác nhận chuyến đi thành công`, "success");
        setReloadData?.(new Date());
        handleCloseDialogConfirmVehicleRegistrant();
        onClose?.();
        return;
      } catch (error) {
        const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
        toast(errorMessage, "error");
        logger.error(error);
        return;
      }
    }
  }, [handleCloseDialogConfirmVehicleRegistrant, dataDetail, actionCode, currentAction, openDialog, setReloadData, onClose, toast]);

  const handleConfirmReject = useCallback(async () => {
    const id = dataDetail?.id || dataDetail?._id || dataDetail?.documentId || dataDetail?.meetingId;
    const workItemId = dataDetail?.workItem?.id || dataDetail?.workItemId;

    // Nếu là luồng Lịch họp (Meeting), xử lý gọi API từ chối tại đây
    if (currentAction?.type === 'reject_meeting' && workItemId && id) {
      try {
        const payload = {
          meetingId: id,
          userId: userId || dataUser?.id || dataUser?._id,
          actionCode: openDialog?.actionCode || actionCode,
          note: note
        };
        await axiosInstance.post(`${API_WORK_ITEMS}/${id}/${workItemId}/reject-meeting`, payload);
        toast(`Đã từ chối lịch họp thành công`, "success");
        setReloadData?.(new Date());
        handleCloseDialogReject();
        onClose?.();
        return;
      } catch (error) {
        const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
        toast(errorMessage, "error");
        return;
      }
    }

    if (onAction) {
      onAction("reject", { note });
      handleCloseDialogReject();
      return;
    }

    // Luồng xử lý từ chối văn bản đến mặc định khi không truyền onAction (ví dụ: màn hình danh sách)
    try {
      const docIds = selectedIds || (id ? [id] : []);
      if (!docIds || docIds.length === 0) {
        toast("Không tìm thấy thông tin văn bản để từ chối.", "error");
        return;
      }
      if (!note || note.trim() === '') {
        toast("Vui lòng nhập lý do từ chối.", "error");
        return;
      }
      const payload = {
        documentIds: Array.isArray(docIds) ? docIds : [docIds],
        note: note.trim(),
      };
      await axiosInstance.patch(API_CONFIRM_REJECT_INCOMING, payload);
      toast("Từ chối văn bản thành công!", "success");
      dispatch(getSideBarMenu());
      setReloadData?.(new Date() * 1);
      handleCloseDialogReject();
      onClose?.();
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || "Từ chối văn bản thất bại!";
      toast(errorMessage, "error");
    }
  }, [onAction, note, handleCloseDialogReject, dataDetail, userId, actionCode, currentAction, openDialog, setReloadData, onClose, toast, dataUser, selectedIds, dispatch]);

  const handleCloseDialog = useCallback((dialogKey) => {
    setOpenDialog((prev) => ({
      ...prev,
      [dialogKey]: false,
      selectedAction: null,
    }));
  }, []);

  const handleConfirmAnnounceCalendar = useCallback(async () => {
    const id = dataDetail?.id || dataDetail?._id || dataDetail?.documentId || dataDetail?.meetingId;
    const workItemId = openDialog?.workItemId || (typeof dataDetail?.workItem === 'string' ? dataDetail.workItem : dataDetail?.workItem?.id) || dataDetail?.workItemId;
    if (!id || !workItemId) return;

    try {
      const payload = {
        meetingId: id,
        userId: userId || dataUser?.id || dataUser?._id,
        actionCode: openDialog?.actionCode || actionCode,
        note: note
      };
      await axiosInstance.post(`${API_WORK_ITEMS}/${id}/${workItemId}/approve-meeting`, payload);
      toast(`Đã công bố lịch họp thành công`, "success");
      setReloadData?.(new Date());
      handleCloseDialog("AnnounceCalendar");
      onClose?.();
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
      toast(errorMessage, "error");
    }
  }, [dataDetail, userId, actionCode, note, dataUser, openDialog?.actionCode, setReloadData, onClose, toast, handleCloseDialog, openDialog?.workItemId]);

  const handleConfirmApproveMeeting = useCallback(async () => {
    const id = dataDetail?.id || dataDetail?._id || dataDetail?.documentId || dataDetail?.meetingId;
    const workItemId = dataDetail?.workItem?.id || dataDetail?.workItemId;
    if (!id || !workItemId) return;

    try {
      const payload = {
        meetingId: id,
        userId: userId || dataUser?.id || dataUser?._id,
        actionCode: openDialog?.actionCode || actionCode,
        note: note
      };
      await axiosInstance.post(`${API_WORK_ITEMS}/${id}/${workItemId}/approve-meeting`, payload);
      toast(`Đã phê duyệt lịch họp thành công`, "success");
      setReloadData?.(new Date());
      handleCloseDialog("ApproveMeeting");
      onClose?.();
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
      toast(errorMessage, "error");
    }
  }, [dataDetail, userId, actionCode, note, dataUser, openDialog?.actionCode, setReloadData, onClose, toast, handleCloseDialog]);
  const handleConfirmProposeMeeting = useCallback(async () => {
    const id = dataDetail?.id || dataDetail?._id || dataDetail?.documentId || dataDetail?.meetingId;
    const workItemId = dataDetail?.workItem?.id || dataDetail?.workItemId;
    if (!id || !workItemId) return;

    try {
      const payload = {
        meetingId: id,
        userId: userId || dataUser?.id || dataUser?._id,
        actionCode: openDialog?.actionCode || actionCode,
        note: note
      };
      await axiosInstance.post(`${API_WORK_ITEMS}/${id}/${workItemId}/propose`, payload);
      toast(`Đã trình duyệt lịch họp thành công`, "success");
      setReloadData?.(new Date());
      handleCloseDialog("ProposeMeeting");
      onClose?.();
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
      toast(errorMessage, "error");
    }
  }, [dataDetail, userId, actionCode, note, dataUser, openDialog?.actionCode, setReloadData, onClose, toast, handleCloseDialog]);


  const handleConfirmJoinMeeting = useCallback(async () => {
    const id = dataDetail?.id || dataDetail?._id || dataDetail?.documentId || dataDetail?.meetingId;
    const workItemId = openDialog?.workItemId || (typeof dataDetail?.workItem === 'string' ? dataDetail.workItem : dataDetail?.workItem?.id) || dataDetail?.workItemId;
    const assigneeUserId = dataDetail?.assigneeUserId || dataDetail?.workItem?.assigneeUserId;

    if (!id || !workItemId) {
      toast("Thiếu thông tin lịch họp hoặc ID công việc", "error");
      return;
    }

    try {
      const payload = {
        meetingId: id,
        actionCode: openDialog?.actionCode || actionCode,
        assigneeUserId: assigneeUserId,
      };
      const actionType = openDialog?.typeAction;
      let endpointSuffix = 'room-confirm-join'; // default for confirm_join_meeting
      if (actionType === 'confirm_join') {
        endpointSuffix = 'user-confirm-join';
      }

      await axiosInstance.post(
        `${API_ADD_MEETING_SCHEDULE}/${id}/${workItemId}/${endpointSuffix}`,
        payload
      );
      toast(`Đã xác nhận tham gia lịch họp thành công`, "success");
      setReloadData?.(new Date());
      handleCloseDialog("JoinMeeting");
      onClose?.();
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
      toast(errorMessage, "error");
    }
  }, [dataDetail, actionCode, openDialog, setReloadData, onClose, toast, handleCloseDialog]);

  const handleConfirmRejectJoin = useCallback(async (noteValue) => {
    const id = dataDetail?.id || dataDetail?._id || dataDetail?.documentId || dataDetail?.meetingId;
    const workItemId = dataDetail?.workItem?.id || dataDetail?.workItemId;
    if (!id || !workItemId) return;

    try {
      const payload = {
        //   meetingId: id,
        //   userId: userId || dataUser?.id || dataUser?._id,
        //   actionCode: openDialog?.actionCode || actionCode,
        note: noteValue !== undefined ? noteValue : note
      };
      await axiosInstance.patch(`${API_ADD_MEETING_SCHEDULE}/${id}/user-reject-join`, payload);
      toast(`Đã từ chối tham gia lịch họp thành công`, "success");
      setReloadData?.(new Date());
      handleCloseDialog("RejectJoin");
      onClose?.();
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
      toast(errorMessage, "error");
    }
  }, [dataDetail, note, setReloadData, onClose, toast, handleCloseDialog]);

  const handleConfirmDelegateJoin = useCallback(async () => {
    // This might need a delegated userId. For now, assuming standard payload
    const id = dataDetail?.id || dataDetail?._id || dataDetail?.documentId || dataDetail?.meetingId;
    const workItemId = dataDetail?.workItem?.id || dataDetail?.workItemId;
    if (!id || !workItemId) return;

    try {
      const payload = {
        meetingId: id,
        userId: userId || dataUser?.id || dataUser?._id,
        actionCode: openDialog?.actionCode || actionCode,
        note: note
      };
      await axiosInstance.post(`${API_WORK_ITEMS}/${id}/${workItemId}/delegate-meeting`, payload);
      toast(`Đã ủy quyền tham gia lịch họp thành công`, "success");
      setReloadData?.(new Date());
      handleCloseDialog("DelegateJoin");
      onClose?.();
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
      toast(errorMessage, "error");
    }
  }, [dataDetail, userId, actionCode, note, dataUser, openDialog?.actionCode, setReloadData, onClose, toast, handleCloseDialog]);

  const handleConfirmDeleteMeeting = useCallback(async () => {
    const id = dataDetail?.id || dataDetail?._id || dataDetail?.documentId || dataDetail?.meetingId;
    if (!id) return;
    try {
      const payload = {
        ids: [id],
      }
      await axiosInstance.delete(API_ADD_MEETING_SCHEDULE, { data: payload });
      toast("Xóa lịch họp thành công!", "success");
      setReloadData?.(new Date());
      setOpenDialog(prev => ({ ...prev, DeleteMeeting: false }));
      onClose?.();
    } catch (error) {
      toast(error?.response?.data?.message || "Có lỗi xảy ra khi xóa lịch họp!", "error");
    }
  }, [dataDetail, setReloadData, onClose, toast]);

  const handleCloseDeleteMeeting = useCallback(() => {
    setOpenDialog(prev => ({ ...prev, DeleteMeeting: false }));
  }, []);

  const handleConfirmLockAttendance = useCallback(async () => {
    const id = dataDetail?.id || dataDetail?._id || dataDetail?.documentId || dataDetail?.meetingId;
    if (!id) return;
    try {
      await axiosInstance.post(`${API_ADD_MEETING_SCHEDULE}/${id}/attendance/lock`);
      toast("Khóa điểm danh thành công!", "success");
      setReloadData?.(new Date());
      setOpenDialog(prev => ({ ...prev, LockAttendance: false }));
      onClose?.();
    } catch (error) {
      toast(error?.response?.data?.message || "Có lỗi xảy ra khi khóa điểm danh!", "error");
    }
  }, [dataDetail, setReloadData, onClose, toast]);

  const handleCloseLockAttendance = useCallback(() => {
    setOpenDialog(prev => ({ ...prev, LockAttendance: false }));
  }, []);

  const handleConfirmRecallMeeting = useCallback(async () => {
    const id = dataDetail?.id || dataDetail?._id || dataDetail?.documentId || dataDetail?.meetingId;
    if (!id) return;
    try {

      await axiosInstance.post(`${API_ADD_MEETING_SCHEDULE}/${id}/recall`);
      toast("Thu hồi lịch họp thành công!", "success");
      setReloadData?.(new Date());
      setOpenDialog(prev => ({ ...prev, RecallMeeting: false }));
      onClose?.();
    } catch (error) {
      toast(error?.response?.data?.message || "Có lỗi xảy ra khi thu hồi lịch họp!", "error");
    }
  }, [dataDetail, setReloadData, onClose, toast]);

  const handleConfirmCancelMeeting = useCallback(async () => {
    if (!note || !note.trim()) {
      setNoteError("Lý do huỷ lịch họp là bắt buộc");
      return;
    }
    const id = dataDetail?.id || dataDetail?._id || dataDetail?.documentId || dataDetail?.meetingId;
    if (!id) return;
    try {
      const payload = {
        note: note
      }
      await axiosInstance.post(`${API_ADD_MEETING_SCHEDULE}/${id}/cancel`, payload);
      toast("Hủy lịch họp thành công!", "success");
      setReloadData?.(new Date());
      setOpenDialog(prev => ({ ...prev, CancelMeeting: false }));
      onClose?.();
    } catch (error) {
      toast(error?.response?.data?.message || "Có lỗi xảy ra khi hủy lịch họp!", "error");
    }
  }, [dataDetail, setReloadData, onClose, toast, note]);

  const handleConfirmCancelRecurrenceMeeting = useCallback(async () => {
    if (!note || !note.trim()) {
      setNoteError("Lý do huỷ lịch họp là bắt buộc");
      return;
    }
    const id = dataDetail?.id || dataDetail?._id || dataDetail?.documentId || dataDetail?.meetingId;
    if (!id) return;
    try {
      const payload = {
        note: note,
        isToday: cancelRecurrenceType === "ONLY_THIS",
        isNextDay: cancelRecurrenceType === "ALL_FOLLOWING"
      }
      // Giả định API cho hủy lịch họp lặp là /cancel-recurrence hoặc thêm type vào payload
      await axiosInstance.post(`${API_ADD_MEETING_SCHEDULE}/${id}/cancel-recurring`, payload);
      toast("Hủy chuỗi lịch họp thành công!", "success");
      setReloadData?.(new Date());
      setOpenDialog(prev => ({ ...prev, CancelRecurrenceMeeting: false }));
      onClose?.();
    } catch (error) {
      toast(error?.response?.data?.message || "Có lỗi xảy ra khi hủy lịch họp lặp!", "error");
    }
  }, [dataDetail, setReloadData, onClose, toast, note, cancelRecurrenceType]);
  // const handleConfirmApprove = useCallback(() => {
  //    if (onAction) {
  //      onAction("approve");
  //      handleCloseDialogApprove();
  //    }
  // }, [onAction, handleCloseDialogApprove]);

  // const handleEditClick = useCallback((action) => {
  //     // Direct action or dialog? Assuming direct for now or via onAction
  //     if (onAction) onAction("edit", { action });
  // }, [onAction]);

  const handleCloseDialogComplete = useCallback(() => {
    handleCloseDialog("Complete");
  }, [handleCloseDialog]);

  const handleCloseDialogCompleteDoc = useCallback(() => {
    handleCloseDialog("CompleteDoc");
  }, [handleCloseDialog]);


  // API HOÀN THÀNH  XỬ LÝ(complete-processing) / HOÀN THÀNH VĂN BẢN (complete-doc)
  const handleCompelete = useCallback(
    async (completeDoc = false) => {
      const workItemByAction = openDialog?.actionType === 'completeDoc'

      try {
        // Validate note is not empty
        if (!note || note.trim() === '') {
          setNoteError('Đồng chí chưa nhập nội dung');
          return;
        }

        const body = {
          userId,
          actionCode: openDialog?.codeAvailableActions,
          isAuthority,
          note: note.trim()
        };
        const endpoint = completeDoc
          ? `${API_PROCCESS_DOCUMENT}/${documentId}/${workItemByAction ? openDialog?.workItemByAction : workItem}/complete-doc`
          : `${API_PROCCESS_DOCUMENT}/${documentId}/${workItem}/complete-processing`;
        const params = (completeDoc && isAuthority) ? { isAuthority: true } : undefined;
        await axiosInstance.post(endpoint, body, { params });
        toast("Văn bản đã được hoàn thành thành công", "success");
        dispatch(getSideBarMenu()); // Cập nhật sidebar
        setReloadData(new Date() * 1);
        completeDoc
          ? handleCloseDialogCompleteDoc(openDialog?.codeAvailableActions)
          : handleCloseDialogComplete();
        setNote(''); // Reset note after completion
        setNoteError(''); // Clear error
        onClose();
      } catch (error) {
        const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
        toast(errorMessage, "error");
      }
    },
    [
      openDialog?.actionType,
      documentId,
      userId,
      note,
      openDialog?.codeAvailableActions,
      workItem,
      toast,
      dispatch,
      setReloadData,
      onClose,
      isAuthority,
      handleCloseDialogComplete,
      handleCloseDialogCompleteDoc,
      openDialog?.workItemByAction
    ]
  );

  //   const filteredActions = useMemo(() => {
  //   const actions = dataDetail?.availableActions || [];
  //   return actions.filter((action) => {
  //     const flagKey = typeFlagMap[action.type];
  //     // Kiểm tra flag trước
  //     const isFlagValid = flags?.[flagKey] === true;

  //     // Nếu isUpdate = true, chỉ hiển thị transfer và signingSubmission
  //     if (isUpdate) {
  //       return isFlagValid && (action.type === 'transfer' || action.type === 'signingSubmission');
  //     }

  //     // Nếu isUpdate = null, false, hoặc undefined, hiển thị tất cả theo flags
  //     return isFlagValid;
  //   });
  // }, [dataDetail?.availableActions, flags, isUpdate]);


  const filteredActions = useMemo(() => {
    const rawActions = dataDetail?.availableActions || [];
    const actions = [];
    const seenCodes = new Set();
    for (const a of rawActions) {
      if (a?.code === "DA_XEM") {
        if (!seenCodes.has(a.code)) {
          seenCodes.add(a.code);
          actions.push({ ...a });
        }
      } else {
        actions.push({ ...a });
      }
    }
    // Sử dụng flags từ dataDetail
    const activeFlags = flags;

    // Inject "Thu hồi xử lý" nếu có flag canRecall và chưa có trong action list
    if (activeFlags.canRecallOutgoing && !actions.some(a => a.type === 'recallProcessing')) {
      actions.push({
        code: 'recallProcessing',
        type: 'recallProcessing',
        label: 'THU HỒI XỬ LÝ',
      });
    }

    // Inject "Thu hồi văn bản đến" nếu có flag canRecallIncoming và chưa có trong action list
    if (activeFlags.canRecallIncoming && !actions.some(a => a.type === 'recallIncomingDoc')) {
      actions.push({
        code: 'recallIncomingDoc',
        type: 'recallIncomingDoc',
        label: 'THU HỒI',
      });
    }

    return actions.filter((action) => {
      // Bypass flag check cho action HOAN_THANH_LUAN_CHUYEN
      if (action?.code === "HOAN_THANH_LUAN_CHUYEN") {
        return true;
      }

      const flagKey = typeFlagMap[action?.type];

      // Hỗ trợ kiểm tra mảng các flag hoặc 1 flag duy nhất
      const isFlagValid = Array.isArray(flagKey)
        ? flagKey.some(key => activeFlags[key] === true)
        : activeFlags[flagKey] === true;

      // Logic isElectronic: ẩn/hiện nút theo loại VB được tick
      if (allElectronic !== undefined && allManual !== undefined) {
        // Lưu số (saveBook) — chỉ hiện khi toàn VB điện tử
        if (action?.type === 'saveBook' && !allElectronic) return false;
        // Chuyển xử lý (transfer) — chỉ hiện khi toàn VB thêm mới
        if (action?.type === 'transfer' && !allManual) return false;
      }

      // Lọc bỏ nút "Đã xem" nếu đang trong thời gian delay (chỉ áp dụng cho Văn bản đến)
      if (!viewedTimerDone && (action?.type === 'viewed' || action?.type === 'viewMark')) {
        return false;
      }

      // Nếu isUpdate = true, chỉ hiển thị transfer và signingSubmission
      if (isUpdate) {
        return isFlagValid && (action?.type === 'transfer' || action?.type === 'signingSubmission');
      }

      // Nếu isUpdate = null, false, hoặc undefined, hiển thị tất cả theo flags
      return isFlagValid;
    }).map(action => {
      // Inject sub-actions for "Thu hồi đơn vị nhận nội bộ"
      if (action.type === 'recallInternalReceiveUnit') {
        const targetRole = action.targetRoles?.[0] || 'internalUnit';
        return {
          ...action,
          subActions: [
            { label: 'Đơn vị nhận', targetRole: targetRole, type: 'recallInternalReceiveUnit', code: action.code + '_UNIT' },
            { label: 'Cá nhân nhận', targetRole: targetRole, type: 'recallUserReceive', code: action.code + '_USER' },
            { label: 'Xin ý kiến', targetRole: targetRole, type: 'recallCommentUser', code: action.code + '_COMMENT' }
          ],
          targetRoles: action.targetRoles || [targetRole]
        };
      }

      // Inject sub-actions for "Thu hồi văn bản đến" when isFurtherAssign is true
      if (action.type === 'recallIncomingDoc' && activeFlags.isFurtherAssign === true) {
        return {
          ...action,
          targetRoles: ["CHI_HUY_PHONG"],
          subActions: [
            {
              code: "recall_leader",
              label: "Thu hồi lãnh đạo",
              flowId: "demo",
              targetRole: "CHI_HUY_PHONG",
              candidates: [],
              min: 0,
              max: null,
              secType: null,
              requiresAssignee: false,
              selectionMode: "multi",
              canTransferRoom: false,
              canSetProcessor: true,
              canTransferOptions: false,
              type: "recallIncomingDoc",
              canExecute: true,
              actionGroup: "CHUYEN_XU_LY_G",
              groupLabel: "Thu hồi lãnh đạo",
              skippedSignerSteps: [],
              skipToTypeSign: null,
              onlyUsers: true
            },
            {
              code: "recall_assignment",
              label: "Thu hồi phân công",
              flowId: "demo",
              targetRole: "CHI_HUY_PHONG",
              candidates: [],
              min: 0,
              max: null,
              secType: null,
              requiresAssignee: false,
              selectionMode: "multi",
              canTransferRoom: false,
              canSetProcessor: true,
              canTransferOptions: false,
              type: "recallIncomingDoc",
              canExecute: true,
              actionGroup: "CHUYEN_XU_LY_G",
              groupLabel: "CHUYỂN XỬ LÝ",
              actionLabel: "Thu hồi phân công",
              skippedSignerSteps: [],
              skipToTypeSign: null
            }
          ]
        };
      }
      return action;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataDetail?.availableActions, JSON.stringify(dataDetail?.flags), JSON.stringify(flags), isUpdate, allElectronic, allManual, viewedTimerDone]);

  const handleSeen = useCallback(async () => {
    try {
      const body = {
        userId,
        actionCode: openDialog?.actionCode ?? actionCode,
        isAuthority
      };
      await axiosInstance.post(
        `${API_PROCCESS_DOCUMENT}/${documentId}/${workItem}/viewer`,
        body
      );
      toast("Xem thành công", "success");
      dispatch(getSideBarMenu()); // Cập nhật sidebar
      onClose();
      setReloadData(new Date() * 1);
    } catch (error) {
      logger.log("error", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
      toast(errorMessage, "error");
    }
  }, [
    userId,
    openDialog?.actionCode,
    actionCode,
    documentId,
    workItem,
    toast,
    dispatch,
    onClose,
    setReloadData,
    isAuthority
  ]);

  // API HOÀN THÀNH PHỐI HỢP
  const handleCompeleteSuppor = useCallback(async () => {
    try {
      // Validate note is not empty
      if (!note || note.trim() === '') {
        setNoteError('Vui lòng nhập nội dung');
        return;
      }

      const body = {
        userId,
        actionCode: openDialog?.actionCode ?? actionCode,
        isAuthority,
        note: note.trim()
      };

      await axiosInstance.post(
        `${API_PROCCESS_DOCUMENT}/${documentId}/${workItem}/completed `,
        body
      );
      toast("Hoàn thành phối hợp thành công", "success");
      dispatch(getSideBarMenu()); // Cập nhật sidebar
      onClose();
      setReloadData(new Date() * 1);
      setNote(''); // Reset note after completion
      setNoteError(''); // Clear error
    } catch (error) {
      logger.log("error", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
      toast(errorMessage, "error");
    }
  }, [
    userId,
    note,
    openDialog?.actionCode,
    actionCode,
    documentId,
    workItem,
    toast,
    dispatch,
    onClose,
    setReloadData,
    isAuthority
  ]);

  // API BAN HÀNH

  // const handleBeforeIssueProposal = useCallback(async (workItem, selectedSignerId) => {
  //   try {
  //     const body = {
  //       "docIds": [
  //         documentId
  //       ],
  //       "commanders": [
  //         selectedSignerId
  //       ],
  //       "note": "",
  //       "role": openDialog?.ROLE_XIN_Y_KIEN,
  //     };
  //     const response = await dispatch(requestFeedback({ workItem, body })).unwrap();
  //     if (response) {
  //       logger.log('Gửi thành công')
  //     }
  //   } catch (error) {
  //     logger.log("error", error);
  //     const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
  // 		 toast(errorMessage, "error");
  //   }
  // }, [
  //   documentId,
  //   toast,
  //   dispatch,
  // 	openDialog?.ROLE_XIN_Y_KIEN
  // ]);

  const handleIssueProposal = useCallback(async (actionArg) => {
    try {
      setIsLoading(true);

      const formData = getFormDataForUpdate ? getFormDataForUpdate() : null;
      const payload = formData?.body || {};
      const rawData = formData?.currentData || {};

      if (formData?.hasChanged && dataDetail) {
        await axiosInstance.put(
          `${API_ADD_VANBANDI_DHVB}/${dataDetail?.id || dataDetail?.document?.id}`,
          payload
        );
      }

      // Xác định quyền văn thư một cách chắc chắn
      const isArchivist = isVanThuCuc || dataUser?.isVanThuCuc === 1 || dataUser?.isVanThuCuc === true;
      // Lấy các trường số văn bản từ payload hoặc dữ liệu form thô
      let bookDocumentId = payload.bookDocumentId || rawData.bookDocumentId;
      const toBook = payload.toBook || rawData.toBook;
      const documentDate = payload.documentDate || rawData.documentDate;

      // Đảm bảo bookDocumentId là ID chứ không phải tên sổ
      if (bookDocumentId && typeof bookDocumentId === "string" && (bookDocumentId.includes("Sổ") || isNaN(Number(bookDocumentId)))) {
        const foundBook = listBookDocuments?.find(b => b.name === bookDocumentId || b.bookDocumentName === bookDocumentId || b.title === bookDocumentId);
        if (foundBook) {
          bookDocumentId = foundBook.bookDocumentId || foundBook.id || foundBook._id;
        }
      }

      // console.log("isArchivist:", isArchivist);
      // console.log("bookDocumentId:", bookDocumentId);
      // console.log("toBook:", toBook);

      // Kiểm tra dữ liệu cho số nếu là văn thư và chưa ban hành
      if (isArchivist && !dataDetail?.isPromulgate) {
        if (!bookDocumentId) {
          toast("Vui lòng chọn sổ văn bản", "error");
          setIsLoading(false);
          return;
        }
        if (!toBook) {
          toast("Vui lòng nhập số văn bản", "error");
          setIsLoading(false);
          return;
        }
      }

      // Logic "Cho số" tích hợp (Copied from UploadFile/index.js)
      if (isArchivist && bookDocumentId && toBook && !dataDetail?.isPromulgate) {
        const targetFile = Array.isArray(draftFiles) && draftFiles.length > 0 ? draftFiles[0] : null;
        // console.log("draftFiles:", draftFiles);
        // console.log("targetFile:", targetFile);

        let fileId = targetFile?.id || targetFile?._id;
        const isNumbered = targetFile?.isNumbered === 1 || targetFile?.is_numbered === 1;

        if (!fileId) {
          logger.warn("Không tìm thấy file để cho số. Đang bỏ qua bước đóng dấu.");
        }

        if (fileId && !isNumbered) {
          // Kiểm tra và chuyển đổi PDF nếu cần
          const fileName = targetFile?.fileName || targetFile?.file_name || "";
          if (isDocumentFile(targetFile) && !fileName.toLowerCase().endsWith(".pdf")) {
            const convertedFile = await dispatch(convertFileToPdf({ id: fileId })).unwrap();
            fileId = convertedFile?.pdfFileId;
          }

          // Tìm toBookCode từ danh sách sổ nếu không có sẵn
          let toBookCode = payload.toBookCode || rawData.toBookCode;
          if (!toBookCode && bookDocumentId && listBookDocuments) {
            const foundBook = listBookDocuments.find(b => b.bookDocumentId === bookDocumentId || b.id === bookDocumentId || b._id === bookDocumentId);
            toBookCode = foundBook?.toBookCode;
          }

          const numberingPayload = {
            bookDocumentId: bookDocumentId,
            docIds: [documentId],
            releaseDate: documentDate,
            releaseNo: payload.releaseNo || (rawData.releaseNo),
            textSymbols: payload.textSymbols || rawData.textSymbols ,
            toBook: toBook,
            workItemId: workItem || null,
          };
          // console.log("numberingPayload FINAL:", numberingPayload);

          const giveNumberResponse = await dispatch(postGiveNumber(numberingPayload)).unwrap();

          // Mặc định autoInsert = true cho luồng văn bản đi dự thảo
          const autoInsert = true;
          const stampBody = { id: fileId };

          if (autoInsert) {
            const releaseDateFromBe = giveNumberResponse?.releaseDate || documentDate;
            const releaseNoFromBe = giveNumberResponse?.releaseNo || numberingPayload.releaseNo;
            const toBookFromBe = giveNumberResponse?.toBook || numberingPayload.toBook;
            stampBody.auto = buildAutoPayload({
              toBook: toBookFromBe,
              releaseNo: releaseNoFromBe,
              releaseDate: releaseDateFromBe,
            });
          } else {
            stampBody.texts = buildTextsPayload(rawData, rawData.texts, documentDate);
          }

          await Promise.all([
            dispatch(postInsertTextToPdf(stampBody)).unwrap(),
            dispatch(putGiveNumber({ fileId: fileId, data: { isNumbered: 1 } })).unwrap(),
          ]);
        }
      }

      const hasActionArg = actionArg && typeof actionArg === 'object' && ('code' in actionArg || 'actionCode' in actionArg);
      const activeAction = hasActionArg ? actionArg : openDialog;
      const body = {
        ...payload,
        userId,
        actionCode: activeAction?.actionCode || activeAction?.code || actionCode,
        docIds: documentId.toString(),
        isAuthority,
        type: activeAction?.ROLE_XIN_Y_KIEN ? 'feedback' : null,
        roles: activeAction?.ROLE_XIN_Y_KIEN,
      };

      const response = await dispatch(promulgateDoc({ workItem, body })).unwrap();
      if (response) {
        toast("Ban hành tờ trình thành công", "success");
        dispatch(getSideBarMenu()); // Cập nhật sidebar
        onClose();
        setReloadData(new Date() * 1);
        setIsLoading(false);
      }
    } catch (error) {
      setIsLoading(false);
      logger.log("error", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
      toast(errorMessage, "error");
    }
  }, [
    userId,
    openDialog,
    actionCode,
    documentId,
    workItem,
    toast,
    dispatch,
    onClose,
    setReloadData,
    isAuthority,
    isVanThuCuc,
    draftFiles,
    getFormDataForUpdate,
    dataUser?.isVanThuCuc,
    listBookDocuments,
    dataDetail
  ]);

  // api đề nghị ban hành

  const handleSuggestPromulgate = useCallback(async () => {
    try {
      const body = {
        userId,
        actionCode: openDialog?.actionCode ?? actionCode,
        docIds: documentId.toString(),
        isAuthority
      };

      const response = await axiosInstance.post(
        `${API_PROCCESS_DOCUMENT}/${workItem}/propose-release`,
        body
      );

      if (response) {
        toast("Đề nghị ban hành thành công", "success");
        dispatch(getSideBarMenu()); // Cập nhật sidebar
        onClose();
        setReloadData(new Date() * 1);
      }
    } catch (error) {
      logger.log("error", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
      toast(errorMessage, "error");
    }
  }, [
    userId,
    openDialog?.actionCode,
    actionCode,
    documentId,
    workItem,
    toast,
    dispatch,
    onClose,
    setReloadData,
    isAuthority
  ]);


  // api Đã xem vb đi
  const handleMarkView = useCallback(async () => {
    try {
      const id = documentId.toString()
      const body = {
        documentIds: [id],
        isAuthority
      }
      const res = await axiosInstance.post(`${APP_BASE}/api/outgoing-documents/mark-viewed`, body)
      if (res) {
        toast("Xem thành công", "success");
        dispatch(getSideBarMenu()); // Cập nhật sidebar
        onClose();
        setReloadData(new Date() * 1);
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
      toast(errorMessage, "error");
    }
  }, [isAuthority, documentId, toast, dispatch, onClose, setReloadData])


  const handleMainActionClick = useCallback(
    async (event) => {
      if (onCloseInlinePanel) {
        onCloseInlinePanel();
      }
      const code = event.currentTarget.dataset.code;
      const typeFromEvent = event.currentTarget.dataset.type;
      const action =
        filteredActions.find(
          (a) =>
            a.code === code && (!typeFromEvent || a.type === typeFromEvent)
        ) || filteredActions.find((a) => a.code === code);
      if (!action) return;
      const { type } = action;
      const targetDialogKey = ACTION_MAP[action.code] || ACTION_MAP[action.type];

      if (type === 'signingSubmission' || type === 'documentFlowTransfer' || targetDialogKey === 'SigningSubmission') {
        if (hasUploadError || isUploadingFiles) {
          toast("Có tệp đính kèm tải lên thất bại. Vui lòng tải lại tệp trước khi thực hiện trình ký.", "error");
          return;
        }
      }

      if (type === 'reject_join') {
        const id = dataDetail?.id || dataDetail?._id || dataDetail?.documentId || dataDetail?.meetingId;
        const currentWorkItemId = action.workItemId || workItem || (typeof dataDetail?.workItem === 'string' ? dataDetail.workItem : dataDetail?.workItem?.id) || dataDetail?.workItemId;
        const assigneeUserId = dataDetail?.assigneeUserId || dataDetail?.workItem?.assigneeUserId;

        if (!id || !currentWorkItemId) {
          toast("Thiếu thông tin lịch họp hoặc ID công việc", "error");
          return;
        }

        try {
          const payload = {
            meetingId: id,
            actionCode: "KHONG_THAM_GIA_LICH",
            assigneeUserId: assigneeUserId,
          };
          const response = await axiosInstance.post(
            `${API_ADD_MEETING_SCHEDULE}/${id}/${currentWorkItemId}/user-not-join`,
            payload
          );

          // Extract actions from response based on the observed structure
          const responseActions = response?.data?.availableActions || response?.availableActions || [];
          const workItem = response?.data?.workItem || response?.workItem || [];


          setOpenDialog({
            RejectJoin: true,
            codeAvailableActions: code,
            actionCode: code,
            actionType: type,
            workItemId: currentWorkItemId,
            label: action.label,
            type: "RejectJoin",
            innerActions: responseActions, // Add captured actions here
            workItem: workItem,
            profileButton: action,
          });
          return;
        } catch (error) {
          const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra khi xử lý hành động";
          toast(errorMessage, "error");
          return;
        }
      }

      // Handle custom immediate actions
      if (onAction && (
        type === 'signingSubmission' ||
        type === 'approve' ||
        type === 'process_meeting' ||
        type === 'edit_meeting' ||
        type === 'seat_assigment' ||
        type === 'create_meeting' ||
        type === 'auto_submit_meeting' ||
        type === 'create_meeting_seat' ||
        type === 'auto_announced_meeting' ||
        type === 'process_meeting_user' ||
        type === 'save_mining_records' ||
        type === 'auto_submit_mining_records' ||
        type === 'edit_mining_records' ||
        type === 'update_meeting_unit_process' ||
        type === 'submit_vehicle_registrant' ||
        type === 'update_seat_asignment' ||
        type === 'agree_vehicle_registrant' ||
        type === 'edit_vehicle_registrant' ||
        type === 'agree_vehicle_registrant_again' ||
        type === 'noti_vehicle_registrant' ||
        type === 'update_meeting_person'
      )) {
        const currentWorkItemId = action.workItemId || workItem || (typeof dataDetail?.workItem === 'string' ? dataDetail.workItem : dataDetail?.workItem?.id) || dataDetail?.workItemId;
        onAction(type, { action, workItemId: currentWorkItemId });
        return;
      }

      const actionObj =
        filteredActions.find(
          (act) =>
            act.code === code &&
            (!typeFromEvent || act.type === typeFromEvent)
        ) || action;

      setActionCode(code);


      if (type === 'announce_calendar') {
        setCurrentAction(action);
        setActionCode(code);
        setOpenDialog({ [ACTION_MAP[type] || 'AnnounceCalendar']: true, codeAvailableActions: action.code, actionCode: action.code, type: ACTION_MAP[type] || 'AnnounceCalendar', profileButton: action });
        return;
      }
      if (type === 'approve_meeting') {
        setCurrentAction(action);
        setActionCode(code);
        setOpenDialog({ [ACTION_MAP[type] || 'ApproveMeeting']: true, codeAvailableActions: action.code, actionCode: action.code, type: ACTION_MAP[type] || 'ApproveMeeting', profileButton: action });
        return;
      }
      if (type === 'reject_meeting') {
        setCurrentAction(action);
        setActionCode(code);
        setOpenDialog({ [ACTION_MAP[type] || 'RejectMeeting']: true, codeAvailableActions: action.code, actionCode: action.code, type: ACTION_MAP[type] || 'RejectMeeting', profileButton: action });
        return;
      }
      if (type === 'reject_vehicle_registrant') {
        setCurrentAction(action);
        setActionCode(code);
        setOpenDialog({ RejectVehicleRegistrant: true, codeAvailableActions: action.code, actionCode: action.code, type: 'RejectVehicleRegistrant', profileButton: action });
        return;
      }
      if (type === 'cancel_vehicle_registrant') {
        setCurrentAction(action);
        setActionCode(code);
        setOpenDialog({ CancelVehicleRegistrant: true, codeAvailableActions: action.code, actionCode: action.code, type: 'CancelVehicleRegistrant', profileButton: action });
        return;
      }
      if (type === 'finish_vehicle_registrant') {
        setCurrentAction(action);
        setActionCode(code);
        setOpenDialog({ FinishVehicleRegistrant: true, codeAvailableActions: action.code, actionCode: action.code, type: 'FinishVehicleRegistrant', profileButton: action });
        return;
      }
      if (type === 'comfirm_vehicle_registrant') {
        setCurrentAction(action);
        setActionCode(code);
        setOpenDialog({ ConfirmVehicleRegistrant: true, codeAvailableActions: action.code, actionCode: action.code, type: 'ConfirmVehicleRegistrant', profileButton: action });
        return;
      }
      if (type === 'transfer_meeting') {
        setCurrentAction(action);
        setActionCode(code);
        setOpenDialog({ [ACTION_MAP[type] || 'propose']: true, codeAvailableActions: action.code, actionCode: action.code, type: ACTION_MAP[type] || 'propose', profileButton: action });
        return;
      }

      if (type === 'issueProposal') {
        handleIssueProposal(action);
        return;
      }

      if (type === 'reject') {
        setOpenDialog({ RejectModel: true, codeAvailableActions: action.code, actionCode: action.code, profileButton: action });
        return;
      }
      if (type === 'edit') {
        setOpenDialog({ EditModel: true, codeAvailableActions: action.code, actionCode: action.code, profileButton: action });
        return;
      }

      if (type === 'delete_meeting') {
        setOpenDialog({ DeleteMeeting: true, codeAvailableActions: action.code, actionCode: action.code, profileButton: action });
        return;
      }

      if (type === 'attendanceLocked') {
        setOpenDialog({ LockAttendance: true, codeAvailableActions: action.code, actionCode: action.code, profileButton: action });
        return;
      }

      if (type === 'recall_meeting') {
        setOpenDialog({ RecallMeeting: true, codeAvailableActions: action.code, actionCode: action.code, profileButton: action });
        return;
      }

      if (type === 'cancel_meeting') {
        if (action.isRecurrence) {
          setOpenDialog({ CancelRecurrenceMeeting: true, codeAvailableActions: action.code, actionCode: action.code, profileButton: action });
        } else {
          setOpenDialog({ CancelMeeting: true, codeAvailableActions: action.code, actionCode: action.code, profileButton: action });
        }
        return;
      }


      const validSubActions = (action?.subActions || []).filter((sub) =>
        action?.targetRoles?.includes(sub.targetRole)
      );
      const hasSub = validSubActions.length > 0;

      if (hasSub) {
        setCurrentAction(actionObj);
        setAnchorEl({ id: `${action.code}::${action.type || ""}`, el: event.currentTarget });
        return;
      }

      // Check theo action.code trước (cho các action đặc biệt như HOAN_THANH_LUAN_CHUYEN)
      let dialogKey = ACTION_MAP[action.code] || ACTION_MAP[action.type];

      // Nếu dialogKey là mảng, chọn key phù hợp dựa trên viewMode
      if (Array.isArray(dialogKey)) {
        if (viewMode === 'meeting' || viewMode === 'jobToMeeting') {
          dialogKey = dialogKey.find(key => key.includes('Meeting')) || dialogKey[0];
        } else {
          dialogKey = dialogKey.find(key => !key.includes('Meeting')) || dialogKey[0];
        }
      }

      const dialogConfig = {
        type: dialogKey,
        [dialogKey]: true,
        codeAvailableActions: action.code,
        actionCode: action.code,
        actionType: action.type,
        targetRole: action.targetRole,
        workItemId: action.workItemId,
        actionsCodeSubTab: Array.isArray(action.actions) ? action.actions.map(a => a.code).join(',') : null,
        actionsBySub: action.actions || null,
        canSetProcessor: action.canSetProcessor,
        canSetSupporter: action.canSetSupporter,
        canSetViewer: action.canSetViewer,
        canTransferRooms: action.canTransferRoom || action.canTransferRooms,
        canTransferRoomProcessor: action.canTransferRoomProcessor,
        canTransferRoomSupporter: action.canTransferRoomSupporter,
        canTransferRoomViewer: action.canTransferRoomViewer,
        typeAction: action.type,
        label: action.label,
        secType: action.secType,
        ROLE_XIN_Y_KIEN: action?.ROLE_XIN_Y_KIEN,
        canTransferOption: action?.canTransferOption,
        viewAndSupport: action?.viewAndSupport,
        canSubmitToAllSecretary: action.canSubmitToAllSecretary,
        typeSe: action?.typeSe, // kiểm tra xem có phải là chuyển xử lý ở Phân công đa nhánh không
        workItemByAction: action?.workItemId,
        availableActionsType: action?.type || action?.actionType || null,
        profileButton: action,
      };

      const transferConfig = {
        ...dialogConfig,
        docId: documentId,
        isNhanDeBiet: action.label?.toUpperCase()?.includes("NHẬN ĐỂ BIẾT"),
        docIds: selectedIds,
        selectedFullRows: allSelectedData,
        dataDetail: dataDetail, // Add dataDetail here
        canConfirmPropose: dataDetail?.flags?.canConfirmPropose,
        flags: flags,
        signedCopyFiles: props?.signedCopyFiles,
      };

      const inlineKeys = ['TransferProcess', 'TransferSupport', 'ConfirmPropose'];

      if (inlineKeys.includes(dialogKey) && action.secType === 'suggestion' && onOpenSuggestion) {
        onOpenSuggestion(transferConfig);
        return;
      }

      if (inlineKeys.includes(dialogKey) && panelContainerRef && onOpenInlineTransfer) {
        onOpenInlineTransfer(transferConfig);
        return;
      }

      setOpenDialog(dialogConfig);
    },
    [
			dataDetail, 
			workItem, 
			toast, 
			onAction, 
			filteredActions, 
			viewMode, 
			allSelectedData, 
			documentId, 
			flags, 
			onOpenInlineTransfer, 
			onOpenSuggestion, 
			panelContainerRef, 
			props?.signedCopyFiles, 
			selectedIds,
			hasUploadError,
			isUploadingFiles,
			handleIssueProposal,
			onCloseInlinePanel
		]
  );

  const handleCloseMenu = useCallback(() => {
    setAnchorEl(null);
    setCurrentAction(null);
  }, []);

  const handleSubActionClick = useCallback(
    (event) => {
      if (onCloseInlinePanel) {
        onCloseInlinePanel();
      }
      setAnchorEl(null);
      if (!currentAction) return;

      const codeBySubTab = event.currentTarget.dataset.codebysubtab;
      const targetRole = event.currentTarget.dataset.targetrole;
      const subType = event.currentTarget.dataset.subtype;
      const sub = currentAction.subActions?.find(
        (s) =>
          s.code === codeBySubTab &&
          s.targetRole === targetRole &&
          (!subType || s.type === subType)
      );

      if (!sub) return;

      const { type } = sub;
      if (type === 'issueProposal') {
        handleIssueProposal(sub);
        return;
      }
      const subDialogKey = ACTION_MAP[sub?.type || currentAction?.type];
      if (type === 'signingSubmission' || type === 'documentFlowTransfer' || subDialogKey === 'SigningSubmission') {
        if (hasUploadError || isUploadingFiles) {
          toast("Có tệp đính kèm tải lên thất bại. Vui lòng tải lại tệp trước khi thực hiện trình ký.", "error");
          return;
        }
      }

      const dialogKey = ACTION_MAP[sub?.type || currentAction.type];
      if (!dialogKey) return;

      const actionsCodeSubTab = sub?.actions?.map((act) => act.code) || [];
      const actionsBySub = sub?.actions || [];
      const dialogConfig = {
        type: dialogKey,
        [dialogKey]: true,
        codeAvailableActions: currentAction.code,
        actionCode: sub.code,
        subActionType: sub?.type,
        targetRole: sub.targetRole,
        workItemId: sub.workItemId || currentAction.workItemId, // Capture workItemId from sub-action or parent
        actionsCodeSubTab,
        codeBySubTab: sub?.actions?.map((act) => act.code) || [],
        canTransferRooms: sub.canTransferRoom,
        canTransferRoomProcessor: sub.canTransferRoomProcessor,
        canTransferRoomSupporter: sub.canTransferRoomSupporter,
        canTransferRoomViewer: sub.canTransferRoomViewer,
        canSetProcessor: sub.canSetProcessor,
        canSetSupporter: sub.canSetSupporter,
        canSetViewer: sub.canSetViewer,
        viewAndSupport: sub.viewAndSupport,
        canTransferOption: sub.canTransferOption,
        secType: sub.secType,
        signerCount: sub.signerCount,
        chiDao: sub.chiDao, // cờ chỉ đạo thay đổi text chỉ đạo -> chuyển xử lý
        actionsBySub,
        label: sub.label,
        typeSe: sub?.typeSe || currentAction?.typeSe, // kiểm tra xem có phải là chuyển xử lý ở Phân công đa nhánh không
        canSubmitToAllSecretary: sub.canSubmitToAllSecretary,
        workItemByAction: sub?.workItemId,
        availableActionsType:
          sub?.type ||
          currentAction?.type ||
          currentAction?.actionType ||
          null,
        priority: sub.priority, // ưu tiên hiển thị sub-action theo thứ tự đã sắp xếp
        profileButton: sub,
      };

      const transferConfig = {
        ...dialogConfig,
        docId: documentId,
        isNhanDeBiet: sub.label?.toUpperCase()?.includes("NHẬN ĐỂ BIẾT"),
        docIds: selectedIds,
        selectedFullRows: allSelectedData,
        dataDetail: dataDetail, // Add dataDetail here
        canConfirmPropose: dataDetail?.flags?.canConfirmPropose,
        signedCopyFiles: props?.signedCopyFiles,
        flags: flags,
      };

      const inlineKeys = ['TransferProcess', 'TransferSupport', 'ConfirmPropose'];

      if (inlineKeys.includes(dialogKey) && sub.secType === 'suggestion' && onOpenSuggestion) {
        onOpenSuggestion(transferConfig);
        setCurrentAction(null);
        return;
      }

      if (inlineKeys.includes(dialogKey) && panelContainerRef && onOpenInlineTransfer) {
        onOpenInlineTransfer(transferConfig);
        setCurrentAction(null);
        return;
      }

      setOpenDialog(dialogConfig);

      setCurrentAction(null);
    },
    [
			currentAction, 
			allSelectedData, 
			dataDetail, 
			documentId, 
			flags, 
			onOpenInlineTransfer, 
			onOpenSuggestion, 
			panelContainerRef, 
			props?.signedCopyFiles, 
			selectedIds,
			hasUploadError,
			isUploadingFiles,
			toast,
			handleIssueProposal,
			onCloseInlinePanel
		]
  );



  // call api hoàn thành dự thảo

  const handleDocumentDraft = useCallback(async () => {
    try {
      const actionCode = dataDetail?.availableActions?.find(
        (a) => a.type === "approve"
      )?.code;
      const body = {
        docIds: documentId,
        userId,
        actionCode,
        note,
        isAuthority: dataDetail?.document?.isAuthority,
      };
      const isAuthority = dataDetail?.document?.isAuthority;
      const params = isAuthority ? { isAuthority } : {};
      const res = await axiosInstance.post(
        `${API_PROCCESS_DOCUMENT}/${dataDetail?.workItem?.id}/approve`,
        body, { params }
      );

      if (res) {
        onClose();
        setReloadData(new Date() * 1);
        toast(res?.message || "Hoàn thành VBDT thành công", "success");
        setNote("");
      }
    } catch (error) {
      logger.log("error", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
      toast(errorMessage, "error");
    }
  }, [
    dataDetail?.availableActions,
    dataDetail?.workItem?.id,
    userId,
    note,
    onClose,
    setReloadData,
    toast,
    documentId,
    dataDetail?.document?.isAuthority,
  ]);

  const handleCloseApproveNewsBulk = useCallback(() => {
    handleCloseDialog("ApproveNewsDialogBulk");
  }, [handleCloseDialog]);

  const handleSuccessApproveNewsBulk = useCallback(() => {
    setReloadData?.(new Date());
    onClose?.();
  }, [setReloadData, onClose]);

  const handleCloseRecallNewsBulk = useCallback(() => {
    handleCloseDialog("RecallNewsDialogBulk");
  }, [handleCloseDialog]);

  const handleSuccessRecallNewsBulk = useCallback(() => {
    setReloadData?.(new Date());
    onClose?.();
  }, [setReloadData, onClose]);


  const closeChuyenXuLy = useCallback(() => {
    handleCloseDialog("TransferProcess");
  }, [handleCloseDialog]);

  const closeChuyenXuLySupport = useCallback(() => {
    handleCloseDialog("TransferSupport");
  }, [handleCloseDialog]);

  const closeReturnModel = useCallback(() => {
    handleCloseDialog("ReturnModel");
  }, [handleCloseDialog]);

  const closeRecallTextModel = useCallback(() => {
    handleCloseDialog("RecallTextModel");
  }, [handleCloseDialog]);

  const handleCloseDialogCompleteSupport = useCallback(() => {
    handleCloseDialog("CompleteSupport");
  }, [handleCloseDialog]);

  const handleCloseDialogCompleteAndTransition = useCallback(() => {
    handleCloseDialog("CompleteAndTransition");
  }, [handleCloseDialog]);

  const handleCompleteAndTransition = useCallback(async () => {
    try {
      const action = dataDetail?.availableActions?.find(
        (a) => a.code === "HOAN_THANH_LUAN_CHUYEN"
      );

      if (!action) return;

      const body = {
        userId: dataDetail?.workItem?.assigneeUserId,
        actionCode: action.code,
      };

      const res = await axiosInstance.post(
        `${API_PROCCESS_DOCUMENT}/${dataDetail?.document?.documentId || documentId}/${dataDetail?.workItem?.id || workItem}/complete-and-transition`,
        body
      );

      if (res) {
        toast(res?.message || "Xác nhận hoàn thành thành công", "success");
        setReloadData(new Date() * 1);
        handleCloseDialogCompleteAndTransition();
        onClose();
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra khi xác nhận hoàn thành";
      toast(errorMessage, "error");
    }
  }, [dataDetail, documentId, workItem, toast, setReloadData, handleCloseDialogCompleteAndTransition, onClose]);

  const handleCompeleteProcessing = useCallback(() => {
    handleCompelete(false);
  }, [handleCompelete]);

  const handleCompeleteDoc = useCallback(() => {
    handleCompelete(true);
  }, [handleCompelete]);

  const handleOpenMobileMenu = useCallback((event) => {
    setMobileMenuAnchor(event.currentTarget);
  }, []);

  const handleCloseMobileMenu = useCallback(() => {
    setMobileMenuAnchor(null);
  }, []);

  const handleMobileMenuItemClick = useCallback(
    (event) => {
      handleCloseMobileMenu();
      handleMainActionClick(event);
    },
    [handleCloseMobileMenu, handleMainActionClick]
  );

  const closeFeedbackModel = useCallback(() => {
    handleCloseDialog("FeedbackModel");
  }, [handleCloseDialog]);

  const closeTranferFeedback = useCallback(() => {
    handleCloseDialog("TranferFeedback");
  }, [handleCloseDialog]);

  const closeSigningSubmission = useCallback(() => {
    handleCloseDialog("SigningSubmission");
  }, [handleCloseDialog]);

  const handleCloseIssueProposal = useCallback(() => {
    handleCloseDialog("IssueProposal");
  }, [handleCloseDialog]);

  const handleCloseDialogViewed = useCallback(() => {
    handleCloseDialog("Viewed");
  }, [handleCloseDialog]);

  const handleCloseDialogSuggestPromulgate = useCallback(() => {
    handleCloseDialog("suggestPromulgate");
  }, [handleCloseDialog]);

  const handleCloseDialogMarkView = useCallback(() => {
    handleCloseDialog("MarkView");
  }, [handleCloseDialog]);


  const handleCloseSaveBook = useCallback(() => {
    setOpenDialog({
      SaveBookModel: false,
    });
  }, []);

  const handleOpenAdditionalRelease = useCallback(() => {
    setOpenDialog({
      AdditionalReleaseModel: true,
    });
  }, []);

  const handleCloseAdditionalRelease = useCallback(() => {
    setOpenDialog({
      AdditionalReleaseModel: false,
    });
  }, []);


  const closeApproveTaskFormDoc = useCallback(() => {
    handleCloseDialog("ApproveTaskFormDoc");
  }, [handleCloseDialog]);

  const closeTaskFormDoc = useCallback(() => {
    handleCloseDialog("TaskFormDoc");
  }, [handleCloseDialog]);

  const closeApprovetask = useCallback(() => {
    handleCloseDialog("Approvetask");
  }, [handleCloseDialog]);

  const closeRejecttask = useCallback(() => {
    handleCloseDialog("Rejecttask");
  }, [handleCloseDialog]);
  const closeProposetask = useCallback(() => {
    handleCloseDialog("Proposetask");
  }, [handleCloseDialog]);

  const closeApproveMeeting = useCallback(() => {
    handleCloseDialog("ApproveMeeting");
  }, [handleCloseDialog]);

  const closeAnnounceCalendar = useCallback(() => {
    handleCloseDialog("AnnounceCalendar");
  }, [handleCloseDialog]);

  const closeProposeMeeting = useCallback(() => {
    handleCloseDialog("ProposeMeeting");
  }, [handleCloseDialog]);

  const closeRejectJoinMeeting = useCallback(() => {
    resetRejectJoinForm({ rejectJoinNote: "" });
    handleCloseDialog("RejectJoin");
  }, [handleCloseDialog, resetRejectJoinForm]);

  // Handler to open ParticipatingUnits for delegation
  const handleOpenDelegation = useCallback(() => {
    setOpenParticipatingUnits(true);
  }, []);

  // Handler to close ParticipatingUnits
  const handleCloseParticipatingUnits = useCallback(() => {
    setOpenParticipatingUnits(false);
  }, []);

  // Handler to save delegated users from ParticipatingUnits
  const handleSaveDelegatedUsers = useCallback(async (selectedUnitsArray) => {
    const isDelegationFlow = openDialog?.isDelegation || true; // Based on usage in render
    if (!isDelegationFlow) {
      setDelegatedUsers(selectedUnitsArray);
      setOpenParticipatingUnits(false);
      return;
    }

    const id = dataDetail?.id || dataDetail?._id || dataDetail?.documentId || dataDetail?.meetingId;
    const workItemId = openDialog?.workItemId || (typeof dataDetail?.workItem === 'string' ? dataDetail.workItem : dataDetail?.workItem?.id) || dataDetail?.workItemId;
    const assigneeUserId = dataDetail?.assigneeUserId || dataDetail?.workItem?.assigneeUserId;

    // Find the selected user (assuming single selection for delegation)
    const selectedUser = selectedUnitsArray.find(u => u.types === 'user' || u.type === 'user');
    const selectedUserId = selectedUser?.id || selectedUser?._id;

    if (!id || !workItemId || !selectedUserId) {
      toast("Thiếu thông tin để thực hiện ủy quyền", "error");
      return;
    }

    try {
      const payload = {
        meetingId: id,
        actionCode: openDialog?.actionCode || actionCode,
        assigneeUserId: assigneeUserId,
        userId: selectedUserId,
        workItem: openDialog.workItem

      };

      await axiosInstance.post(API_DELEGATE_PARTICIPANT, payload);

      toast("Ủy quyền thành công", "success");
      setOpenParticipatingUnits(false);
      handleCloseDialog("RejectJoin"); // Close the parent dialog too
      setReloadData?.(new Date());
      onClose?.();
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra khi thực hiện ủy quyền";
      toast(errorMessage, "error");
    }
  }, [dataDetail, openDialog, actionCode, toast, setReloadData, onClose, handleCloseDialog]);

  // Handler for "Không tham gia" button - calls handleConfirmRejectJoin
  const handleRejectWithoutDelegation = handleRejectJoinSubmit(async (formData) => {
    await handleConfirmRejectJoin(formData.rejectJoinNote);
  });
  const closeJoinMeetingMeeting = useCallback(() => {
    handleCloseDialog("JoinMeeting");
  }, [handleCloseDialog]);
  const closeDelegateJoinMeeting = useCallback(() => {
    handleCloseDialog("DelegateJoin");
  }, [handleCloseDialog]);

  const closeRecallMeeting = useCallback(() => {
    handleCloseDialog("RecallMeeting");
  }, [handleCloseDialog]);

  const closeRecallProcessing = useCallback(() => {
    handleCloseDialog("RecallProcessing");
    setRecallReason('');
    setRecallReasonError('');
  }, [handleCloseDialog]);

  const closeRecallIncoming = useCallback(() => {
    handleCloseDialog("RecallIncomingTextDialog");
  }, [handleCloseDialog]);

  const handleRecallProcessing = useCallback(async () => {
    if (!recallReason || !recallReason.trim()) {
      setRecallReasonError("Lý do thu hồi là bắt buộc");
      return;
    }
    try {
      setIsLoading(true);
      const body = {
        outgoingDocId: documentId?.toString(),
        // recallReason: recallReason || "",
        note: recallReason || "",
      };
      const params = isAuthority === true ? { isAuthority: true } : undefined;
      const response = await axiosInstance.post(
        `${APP_BASE}/api/documents/outgoing/recall`,
        body,
        { params }
      );
      if (response) {
        toast("Thu hồi xử lý thành công", "success");
        dispatch(getSideBarMenu()); // Cập nhật sidebar
        closeRecallProcessing();
        onClose?.();
        setReloadData?.(new Date());
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
      toast(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  }, [documentId, dispatch, onClose, setReloadData, closeRecallProcessing, toast, isAuthority, recallReason]);

  const handleRecallIncomingSuccess = useCallback(() => {
    setReloadData?.(new Date() * 1);
    handleCloseDialog("RecallIncomingTextDialog");
    onClose?.();
  }, [setReloadData, handleCloseDialog, onClose]);

  const closeCancelMeeting = useCallback(() => {
    handleCloseDialog("CancelMeeting");
    setNote("");
    setNoteError("");
  }, [handleCloseDialog]);

  const closeCancelRecurrenceMeeting = useCallback(() => {
    handleCloseDialog("CancelRecurrenceMeeting");
    setNote("");
    setNoteError("");
  }, [handleCloseDialog]);

  const handleConfirmAction = useCallback(async () => {
    const id = dataDetail?.id || dataDetail?._id || dataDetail?.documentId || dataDetail?.meetingId;
    if (!id) return;

    // Phân loại hành động dựa trên ENDPOINT_MAP (Dùng cho Lịch họp và các luồng BPMN mới)
    const apiEndpoint = ACTION_MAP[currentAction?.type];
    const workItemId = dataDetail?.workItem?.id || dataDetail?.workItemId;

    setIsLoading(true);
    if (apiEndpoint && workItemId) {
      try {
        const payload = {
          meetingId: id,
          userId: userId || dataUser?.id || dataUser?._id,
          actionCode: openDialog?.actionCode || actionCode,
          note: note
        };

        await axiosInstance.post(`${API_WORK_ITEMS}/${id}/${workItemId}/${apiEndpoint}`, payload);
        toast(`Thao tác thành công`, "success");
        setReloadData?.(new Date());
        const currentType = Object.keys(openDialog).find(key => openDialog[key] === true && key !== "actionCode" && key !== "codeAvailableActions");
        handleCloseDialog(currentType);
        onClose?.();
        setIsLoading(false);
        return;
      } catch (error) {
        const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
        toast(errorMessage, "error");
        setIsLoading(false);
        return;
      }
    }

    if (onAction) {
      const currentType = Object.keys(openDialog).find(key => openDialog[key] === true && key !== "actionCode" && key !== "codeAvailableActions");
      // Map dialog name back to type if possible, or just pass context
      let mappedType = currentAction?.type || "agreetask";

      onAction(mappedType, { actionCode, note });
      handleCloseDialog(currentType);
      return;
    }

    try {
      setIsLoading(true);
      await axiosInstance.post(`${APP_BASE}/api/tasks/send-approval-form-doc`, {
        taskId: id,
        actionCode: actionCode,
      });
      toast(`Đã gửi phê duyệt công việc thành công`, "success");
      setReloadData?.(new Date());
      closeApprovetask?.();
      onClose?.()
      setIsLoading(false);
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
      toast(errorMessage, "error");
      setIsLoading(false);
    }
  }, [dataDetail, userId, dataUser, actionCode, note, openDialog, onClose, setReloadData, setIsLoading, toast, closeApprovetask, currentAction?.type, handleCloseDialog, onAction]);

  const closeUpdateTaskFormDoc = useCallback(() => {
    handleCloseDialog("UpdateTaskFormDoc");
  }, [handleCloseDialog]);

  const handleUpdateTaskFormDoc = useCallback(async () => {
    const id = dataDetail?.id;
    if (!id) return;
    try {
      setIsLoading(true);
      await axiosInstance.post(`${APP_BASE}/api/tasks/confirm-adjust-form-doc`, {
        id: id,
        actionCode: actionCode,
      });
      toast(`Đã xác nhận điều chỉnh công việc thành công`, "success");
      setReloadData?.(new Date());
      closeUpdateTaskFormDoc?.();
      onClose?.()
      setIsLoading(false);
      handleCloseDialog?.("UpdateTaskFormDoc");
    } catch (error) {
      logger.log('error', error)
      const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
      toast(errorMessage, "error");
      setIsLoading(false);
    }

  }, [dataDetail, actionCode, toast, setReloadData, closeUpdateTaskFormDoc, onClose, handleCloseDialog])


  const handleCloseApproveModel = useCallback(() => {
    handleCloseDialog("ApproveModel");
  }, [handleCloseDialog]);


  const closeSuggestion = useCallback(() => {
    handleCloseDialog("TransferProcess");
  }, [handleCloseDialog]);

  const titlePopup = useMemo(() => {
    return dataDetail?.availableActions?.find(action => action.code === actionCode)?.label || "";
  }, [dataDetail?.availableActions, actionCode]);

  const selectedMultiple = useMemo(() => {
    return dataDetail?.availableActions?.find(action => action.code === actionCode)?.selectionMode === "multi";
  }, [dataDetail?.availableActions, actionCode]);

  // Render các component, dialog

  const sharedDialogsMemo = useMemo(() => (
    <>
      {/* Chuyển xử lý */}

      {openDialog?.secType === 'suggestion' && !onOpenSuggestion
        ?
        <SafeLazy><SuggestTransferProcess open={
          openDialog?.TransferProcess || false
        }
          docId={documentId}
          onCloseDialog={closeSuggestion}
          label={openDialog?.label || titlePopup || "Chuyển xử lý"}
          isNhanDeBiet={openDialog?.label?.toUpperCase()?.includes("NHẬN ĐỂ BIẾT")}
          dataDetail={dataDetail}
          actionCode={openDialog?.actionCode || actionCode}
          subActionType={openDialog?.subActionType}
          targetRole={openDialog?.targetRole}
          profileButton={openDialog?.profileButton}
          codeAvailableActions={openDialog?.codeAvailableActions}
          setReloadData={setReloadData}
          actionsCodeSubTab={openDialog?.actionsCodeSubTab}
          onCloseAppBar={onClose}
          canTransferRooms={openDialog?.canTransferRooms}
          canTransferRoomProcessor={openDialog?.canTransferRoomProcessor}
          canTransferRoomSupporter={openDialog?.canTransferRoomSupporter}
          canTransferRoomViewer={openDialog?.canTransferRoomViewer}
          canSetProcessor={openDialog?.canSetProcessor}
          canSetSupporter={openDialog?.canSetSupporter}
          canSetViewer={openDialog?.canSetViewer}
          isUpdate={isUpdate}
          isView={isView}
          viewAndSupport={openDialog?.viewAndSupport}
          canTransferOption={openDialog?.canTransferOption}
          getFormDataForUpdate={getFormDataForUpdate}
          canProcessSupport={flags.canProcessSupport}
          docIds={selectedIds}
          selectedFullRows={allSelectedData}
          typeSe={openDialog?.typeSe}
          availableActionsType={openDialog?.availableActionsType}
          secType={openDialog?.secType}
          panelContainerRef={panelContainerRef}
          signedCopyFiles={props?.signedCopyFiles}
          maxDepthLevel={MAX_DEPTH_LEVEL}
        /></SafeLazy>
        :
        openDialog?.secType === 'suggestionHandling'
          ?
          <SafeLazy><SubmitProposal
            open={
              openDialog?.TransferProcess || false
            }
            docId={documentId}
            onCloseDialog={closeSuggestion}
            label={openDialog?.label || titlePopup || "Chuyển xử lý"}
            isNhanDeBiet={openDialog?.label?.toUpperCase()?.includes("NHẬN ĐỂ BIẾT")}
            dataDetail={dataDetail}
            actionCode={openDialog?.actionCode || actionCode}
            subActionType={openDialog?.subActionType}
            targetRole={openDialog?.targetRole}
            profileButton={openDialog?.profileButton}
            codeAvailableActions={openDialog?.codeAvailableActions}
            setReloadData={setReloadData}
            actionsCodeSubTab={openDialog?.actionsCodeSubTab}
            onCloseAppBar={onClose}
            canTransferRooms={openDialog?.canTransferRooms}
            canTransferRoomProcessor={openDialog?.canTransferRoomProcessor}
            canTransferRoomSupporter={openDialog?.canTransferRoomSupporter}
            canTransferRoomViewer={openDialog?.canTransferRoomViewer}
            canSetProcessor={openDialog?.canSetProcessor}
            canSetSupporter={openDialog?.canSetSupporter}
            canSetViewer={openDialog?.canSetViewer}
            isUpdate={isUpdate}
            isView={isView}
            viewAndSupport={openDialog?.viewAndSupport}
            canTransferOption={openDialog?.canTransferOption}
            getFormDataForUpdate={getFormDataForUpdate}
            canProcessSupport={flags.canProcessSupport}
            docIds={selectedIds}
            chiDao={openDialog?.chiDao}
            actionsBySub={openDialog?.actionsBySub}
            selectedFullRows={allSelectedData}
            typeSe={openDialog?.typeSe}
            availableActionsType={openDialog?.availableActionsType}
            signedCopyFiles={props?.signedCopyFiles}
            maxDepthLevel={MAX_DEPTH_LEVEL}

          /></SafeLazy>
          :
          <TransferProcess
            open={
              openDialog?.TransferProcess ?? openDialog?.TransferSupport ?? false
            }
            docId={documentId}
            onCloseDialog={closeChuyenXuLy ?? closeChuyenXuLySupport}
            label={openDialog?.label || titlePopup || "Chuyển xử lý"}
            isNhanDeBiet={openDialog?.label?.toUpperCase()?.includes("NHẬN ĐỂ BIẾT")}
            dataDetail={dataDetail}
            actionCode={openDialog?.actionCode || actionCode}
            subActionType={openDialog?.subActionType}
            targetRole={openDialog?.targetRole}
            profileButton={openDialog?.profileButton}
            codeAvailableActions={openDialog?.codeAvailableActions}
            setReloadData={setReloadData}
            actionsCodeSubTab={openDialog?.actionsCodeSubTab}
            onCloseAppBar={onClose}
            canTransferRooms={openDialog?.canTransferRooms}
            canTransferRoomProcessor={openDialog?.canTransferRoomProcessor}
            canTransferRoomSupporter={openDialog?.canTransferRoomSupporter}
            canTransferRoomViewer={openDialog?.canTransferRoomViewer}
            canSetProcessor={openDialog?.canSetProcessor}
            canSetSupporter={openDialog?.canSetSupporter}
            canSetViewer={openDialog?.canSetViewer}
            isUpdate={isUpdate}
            isView={isView}
            flags={flags}
            viewAndSupport={openDialog?.viewAndSupport}
            canTransferOption={openDialog?.canTransferOption}
            getFormDataForUpdate={getFormDataForUpdate}
            canProcessSupport={flags.canProcessSupport}
            onTransferSuccess={onTransferSuccess}
            chiDao={openDialog?.chiDao}
            actionsBySub={openDialog?.actionsBySub}
            docIds={selectedIds}
            selectedFullRows={allSelectedData}
            panelContainerRef={panelContainerRef}
            typeSe={openDialog?.typeSe}
            availableActionsType={openDialog?.availableActionsType}
            canConfirmPropose={dataDetail?.flags?.canConfirmPropose}
            signedCopyFiles={props?.signedCopyFiles} // ký sao y 
            maxDepthLevel={MAX_DEPTH_LEVEL}
          />
      }

      {/* Trả lại */}

      {(openDialog?.ReturnModel || false) && (
        <SafeLazy><ReturnModel
          open={openDialog?.ReturnModel || false}
          onCloseDialog={closeReturnModel}
          label="Trả lại"
          dataDetail={dataDetail}
          docId={documentId}
          actionCode={openDialog?.actionCode}
          codeAvailableActions={openDialog?.codeAvailableActions}
          onCloseAppBar={onClose}
          targetRole={openDialog?.targetRole}
          setReloadData={setReloadData}
          codeBySubTab={openDialog?.codeBySubTab}
          priority={openDialog?.priority}
          openDialog={openDialog}
        /></SafeLazy>
      )}

      {/* Thu hồi */}

      {(openDialog?.RecallTextModel || false) && (
        <SafeLazy><RecallTextModel
          open={openDialog?.RecallTextModel || false}
          onCloseDialog={closeRecallTextModel}
          label={openDialog.label || "Thu hồi"}
          dataDetail={dataDetail}
          docId={documentId}
          actionCode={openDialog?.actionCode}
          codeAvailableActions={openDialog?.codeAvailableActions}
          onCloseAppBar={onClose}
          targetRole={openDialog?.targetRole}
          setReloadData={setReloadData}
          codeBySubTab={openDialog?.codeBySubTab}
          subActionType={openDialog?.subActionType}
        /></SafeLazy>
      )}

      {/* Thu hồi văn bản đến */}
      {openDialog?.RecallIncomingTextDialog && (
        <SafeLazy>
					<RecallIncomingTextDialog
          	open={openDialog.RecallIncomingTextDialog}
          	onClose={closeRecallIncoming}
          	onSuccess={handleRecallIncomingSuccess}
          	docIds={documentId}
          	documentData={dataDetail}
          	recallType={openDialog?.actionCode}
        	/>
				</SafeLazy>
      )}

      {/* Thu hồi xử lý văn bản đi */}
      {(openDialog.RecallProcessing || false) && (
      <CustomDialog
        open={openDialog.RecallProcessing || false}
        onClose={closeRecallProcessing}
        titleButton="Đồng ý"
        cancelButtonText="Hủy"
        onSave={handleRecallProcessing}
        titleAlign="center"
        title={
          <RecallDialogBox>
            <WarningIconStyled />
            THÔNG BÁO
          </RecallDialogBox>
        }
      >
        {logger.log("dataDetail", dataDetail)}
        <Box>
          <Typography variant="body1">
            <b>
              Bạn có chắc chắn muốn thu hồi văn bản có trích yếu &quot;
              <span
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(
                    dataDetail?.document?.abstractNote ||
                      dataDetail?.abstractNote ||
                      dataDetail?.document?.extract ||
                      dataDetail?.extract ||
                      dataDetail?.document?.abstract_note ||
                      dataDetail?.abstract_note ||
                      ""
                  ),
                }}
              />
              &quot;
            </b>
          </Typography>
          <br />
          <InputComponents
            required
            multiline
            rows={3}
            label="Lý do thu hồi"
            placeholder="Nhập lý do thu hồi..."
            value={recallReason}
            onChange={handleChangeRecallReason}
            error={!!recallReasonError}
            helperText={recallReasonError}
          />
          <br />
          <br />
          <SecondaryTypography>
            Tác vụ này sẽ không thể hoàn tác
          </SecondaryTypography>
        </Box>
      </CustomDialog>
    )}

      {/*  */}
      {(openDialog?.SaveForReference || false) && (
        <SaveForReference
          open={openDialog?.SaveForReference || false}
          dataDetail={dataDetail}
          setReloadData={setReloadData}
        />
      )}

      {/* Lưu sổ */}
      {(openDialog?.SaveBookModel || false) && (
        <SaveBookModel
          open={openDialog?.SaveBookModel || false}
          dataDetail={dataDetail}
          onCloseDialog={handleCloseSaveBook}
          selectedIds={selectedIds}
          setReloadData={setReloadData}
          label="Lưu sổ"
        />
      )}

      {/* Trình ký */}

      {(openDialog?.SigningSubmission ?? false) && (
        <SafeLazy><SigningSubmission
          label={titlePopup || "Trình ký"}
          dataDetail={dataDetail}
          docId={documentId}
          targetRole={openDialog?.targetRole}
          actionCode={openDialog?.actionCode}
          open={openDialog?.SigningSubmission ?? false}
          onCloseDialog={closeSigningSubmission}
          onCloseAppBar={onClose}
          setReloadData={setReloadData}
          selectedUsersByStep={props.selectedUsersByStep}
          getFormDataForUpdate={getFormDataForUpdate}
          initialPreselectedUsers={props.initialPreselectedUsers}
          isUpdate={isUpdate}
          isView={isView}
          mode={props.mode} // Pass mode from props
          selectedMultiple={selectedMultiple}
          // selectedMultiple={openDialog?.signerCount === "multi"}
          canSubmitToAllSecretary={openDialog?.canSubmitToAllSecretary}
        /></SafeLazy>
      )}

      {/* Xin Ý kiến */}

      {(openDialog?.FeedbackModel || false) && (
        <SafeLazy><FeedbackModel
          open={openDialog?.FeedbackModel || false}
          onCloseDialog={closeFeedbackModel}
          label="Xin ý kiến"
          dataDetail={dataDetail}
          docId={documentId}
          actionCode={openDialog?.actionCode}
          codeAvailableActions={openDialog?.codeAvailableActions}
          onCloseAppBar={onClose}
          targetRole={openDialog?.targetRole}
          setReloadData={setReloadData}
          codeBySubTab={openDialog?.codeBySubTab}
        /></SafeLazy>
      )}

      {/* Chuyển cho ý kiến */}

      {(openDialog?.TranferFeedback || false) && (
        <SafeLazy><TransferFeedback
          open={openDialog?.TranferFeedback || false}
          onCloseDialog={closeTranferFeedback}
          label="Chuyển cho ý kiến"
          dataDetail={dataDetail}
          docId={documentId}
          actionCode={openDialog?.actionCode}
          codeAvailableActions={openDialog?.codeAvailableActions}
          onCloseAppBar={onClose}
          targetRole={openDialog?.targetRole}
          setReloadData={setReloadData}
          codeBySubTab={openDialog?.codeBySubTab}
          keyActions="chuyenChoYKien"
        /></SafeLazy>
      )}

      {/* Phát hành bổ sung */}
      {(openDialog?.AdditionalReleaseModel || false) && (
        <SafeLazy>
					<AdditionalRelease
          	open={openDialog?.AdditionalReleaseModel || false}
          	onClose={handleCloseAdditionalRelease}
          	// label="Phát hành bổ sung"
          	dataDetail={dataDetail}
          	docId={documentId}
          	actionCode={openDialog?.actionCode}
          	codeAvailableActions={openDialog?.codeAvailableActions}
          	onCloseAppBar={onClose}
          	targetRole={openDialog?.targetRole}
          	setReloadData={setReloadData}
          	codeBySubTab={openDialog?.codeBySubTab}
						textUnit="Đơn vị nhận văn bản"
        	/>
				</SafeLazy>
      )}



      {/* Gửi phê duyệt công việc*/}
      {(openDialog?.ApproveTaskFormDoc || false) && (
        <SafeLazy><SubmitApproval
          open={openDialog?.ApproveTaskFormDoc || false}
          onCloseDialog={closeApproveTaskFormDoc}
          label="TRÌNH PHÊ DUYỆT CÔNG VIỆC"
          dataDetail={dataDetail}
          docId={documentId}
          actionCode={openDialog?.actionCode}
          codeAvailableActions={openDialog?.codeAvailableActions}
          onCloseAppBar={onClose}
          targetRole={openDialog?.targetRole}
          setReloadData={setReloadData}
          codeBySubTab={openDialog?.codeBySubTab}
          typeAction={openDialog?.typeAction}
        /></SafeLazy>
      )}

      {/* Gửi điều chỉnh */}
      {(openDialog?.TaskFormDoc || false) && (
        <SafeLazy><SubmitApproval
          open={openDialog?.TaskFormDoc || false}
          onCloseDialog={closeTaskFormDoc}
          label="Phản hồi"
          dataDetail={dataDetail}
          docId={documentId}
          actionCode={openDialog?.actionCode}
          codeAvailableActions={openDialog?.codeAvailableActions}
          onCloseAppBar={onClose}
          targetRole={openDialog?.targetRole}
          setReloadData={setReloadData}
          codeBySubTab={openDialog?.codeBySubTab}
          typeAction={openDialog?.typeAction}
        /></SafeLazy>
      )}

      {/* Duyệt tin hàng loạt */}
      {(openDialog?.ApproveNewsDialogBulk || false) && (
        <SafeLazy><ApproveNewsDialogBulk
          open={openDialog?.ApproveNewsDialogBulk || false}
          onClose={handleCloseApproveNewsBulk}
          onSuccess={handleSuccessApproveNewsBulk}
          newsIds={selectedIds}
          dataDetail={allSelectedData || (Array.isArray(dataDetail) ? dataDetail : [dataDetail])}
          toast={toast}
        /></SafeLazy>
      )}

      {/* Thu hồi tin hàng loạt */}
      {(openDialog?.RecallNewsDialogBulk || false) && (
        <SafeLazy><RecallNewsDialogBulk
          open={openDialog?.RecallNewsDialogBulk || false}
          onClose={handleCloseRecallNewsBulk}
          onSuccess={handleSuccessRecallNewsBulk}
          newsIds={selectedIds}
          dataDetail={allSelectedData || (Array.isArray(dataDetail) ? dataDetail : [dataDetail])}
          toast={toast}
        /></SafeLazy>
      )}

      {(openDialog?.UpdateTaskFormDoc || false) && (
        <CustomDialog
          open={openDialog?.UpdateTaskFormDoc || false}
          title={openDialog?.label}
          onClose={closeUpdateTaskFormDoc}
          onSave={handleUpdateTaskFormDoc}
          titleButton="Đồng ý"
          size="sm"
          isLoading={isLoading}
        >
          <Typography  >
            <b>Bạn có muốn xác nhận điều chỉnh không?</b>
          </Typography>
        </CustomDialog>
      )}




      {/* Từ chối công việc Vb */}

      {(openDialog?.Rejecttask || false) && (
        <CustomDialog
          open={openDialog?.Rejecttask || false}
          title={openDialog?.label}
          onClose={closeRejecttask}
          onSave={handleConfirmAction}
          titleButton="Đồng ý"
          size="sm"
          isLoading={isLoading}
        >
          <Typography  >
            <b>Bạn có muốn từ chối công việc không?</b>
          </Typography>
        </CustomDialog>
      )}



      {/* Dồng ý công việc Vb */}

      {(openDialog?.Approvetask || false) && (
        <CustomDialog
          open={openDialog?.Approvetask || false}
          title={openDialog?.label}
          onClose={closeApprovetask}
          onSave={handleConfirmAction}
          titleButton="Đồng ý"
          size="sm"
          isLoading={isLoading}
        >
          <Typography  >
            <b>Bạn có muốn đồng ý công việc không?</b>
          </Typography>
        </CustomDialog>
      )}


      {/* Hoàn thành vb xly */}
      {(openDialog?.Complete || false) && (
        <CustomDialog
          open={openDialog?.Complete || false}
          title={openDialog?.label}
          onClose={handleCloseDialogComplete}
          onSave={handleCompeleteProcessing}
          titleButton="Đồng ý"
          size="sm"
        >
          {/* <Typography  >
            <b>Bạn có chắc chắn muốn hoàn thành văn bản xử lý không?</b>
          </Typography> */}
          <FormInput
            label="Nội dung"
            multiline
            rows={4}
            placeholder="Nhập nội dung..."
            value={note}
            onChange={handleChangeNote}
            error={!!noteError}
            helperText={noteError}
            required
          />
        </CustomDialog>
      )}

      {/* Phê duyệt lịch họp */}
      {(openDialog.ApproveMeeting) && (
        <CustomDialog
          open={openDialog.ApproveMeeting}
          onClose={closeApproveMeeting}
          title="Xác nhận phê duyệt"
          onSave={handleConfirmApproveMeeting}
          titleButton="Phê duyệt"
        >
          <Box>
            <Typography >
              Bạn có chắc chắn muốn <b>phê duyệt</b> lịch họp này không?
            </Typography>
          </Box>
        </CustomDialog>
      )}

      {/* Công bố lịch họp */}
      {(openDialog.AnnounceCalendar) && (
        <CustomDialog
          open={openDialog.AnnounceCalendar}
          onClose={closeAnnounceCalendar}
          title="Xác nhận công bố lịch họp"
          onSave={handleConfirmAnnounceCalendar}
          titleButton="Xác nhận"
        >
          <Box>
            <Typography >
              <b>Xác nhận công bố lịch họp “{dataDetail?.title || dataDetail?.document?.title}”</b>
            </Typography>
            <Typography variant="body2" mt={1}>
              Sau khi công bố lịch họp sẽ được gửi đến thành phần tham gia
            </Typography>
          </Box>
        </CustomDialog>
      )}

      {/* Trình duyệt lịch họp */}
      {(openDialog.ProposeMeeting) && (
        <CustomDialog
          open={openDialog.ProposeMeeting}
          onClose={closeProposeMeeting}
          title="Xác nhận trình duyệt"
          onSave={handleConfirmProposeMeeting}
          titleButton="Trình duyệt"
        >
          <Box >
            <Typography>
              Bạn có chắc chắn muốn <b>trình duyệt</b> lịch họp này không?
            </Typography>
          </Box>
        </CustomDialog>
      )}


      {/* Hoàn thành vb */}
      {(openDialog?.CompleteDoc || false) && (
        <CustomDialog
          open={openDialog?.CompleteDoc || false}
          title={openDialog?.label}
          onClose={handleCloseDialogCompleteDoc}
          onSave={handleCompeleteDoc}
          titleButton="Đồng ý"
          size="sm"
        >
          {/* <Typography  >
            <b>Bạn có chắc chắn muốn hoàn thành văn bản không?</b>
          </Typography> */}
          <FormInput
            label="Nội dung"
            multiline
            rows={4}
            placeholder="Nhập nội dung..."
            value={note}
            onChange={handleChangeNote}
            error={!!noteError}
            helperText={noteError}
            required
          />
        </CustomDialog>
      )}


      {/* Hoàn thành vb phối hợp */}
      {(openDialog?.CompleteSupport || false) && (
        <CustomDialog
          open={openDialog?.CompleteSupport || false}
          title={openDialog?.label}
          onClose={handleCloseDialogCompleteSupport}
          onSave={handleCompeleteSuppor}
          titleButton="Đồng ý"
          size="sm"
        >
          {/* <Typography  >
            <b>Bạn có chắc chắn muốn hoàn thành không?</b>
          </Typography> */}
          <FormInput
            label="Nội dung"
            multiline
            rows={4}
            placeholder="Nhập nội dung..."
            value={note}
            onChange={handleChangeNote}
            error={!!noteError}
            helperText={noteError}
            required
          />
        </CustomDialog>
      )}

      {/* Hoàn thành luân chuyển */}
      {(openDialog?.CompleteAndTransition || false) && (
        <CustomDialog
          open={openDialog?.CompleteAndTransition || false}
          title="Xác nhận hoàn thành"
          onClose={handleCloseDialogCompleteAndTransition}
          onSave={handleCompleteAndTransition}
          titleButton="Xác nhận"
          size="sm"
        >
          <Typography>
            <b>Bạn có chắc chắn muốn xác nhận hoàn thành luân chuyển văn bản này không?</b>
          </Typography>
        </CustomDialog>
      )}

      {/* Ban Hành */}
      {(openDialog?.IssueProposal || false) && (
        <CustomDialog
          open={openDialog?.IssueProposal || false}
          title={openDialog?.label}
          onClose={handleCloseIssueProposal}
          onSave={handleIssueProposal}
          titleButton="Đồng ý"
          isLoading={isLoading}
          size="sm"
        >
          {/* <CustomAsyncAutoCompletes
            label="Chọn người xin ý kiến"
            url={API_USER}
            body={bodyUser}
            value={selectedSigners}
            onChange={handleSignerChange}
            // multiple={false} // Default is single selection
            isMulti={false}
            optionLabel="name"
            optionValue="_id"
          /> */}

          <SkyBox mt={2}>
            <SkyTypography>
              <b>Bạn có chắc chắn muốn Phát hành không?</b>
            </SkyTypography>
          </SkyBox>
        </CustomDialog>
      )}


      {/* Để xem */}

      {(openDialog?.Viewed || false) && (
        <CustomDialog
          open={openDialog?.Viewed || false}
          title={openDialog?.label}
          onClose={handleCloseDialogViewed}
          onSave={handleSeen}
          titleButton="Đồng ý"
          size="sm"
					textTransformTitle="uppercase"
        >
          <StyledContentPopupViewed>
            <b>Bạn có chắc chắn muốn đã xem không?</b>
          </StyledContentPopupViewed>
        </CustomDialog>
      )}


      {/* Đề nghị ban hành */}

      {(openDialog?.suggestPromulgate || false) && (
        <CustomDialog
          open={openDialog?.suggestPromulgate || false}
          title={openDialog?.label}
          onClose={handleCloseDialogSuggestPromulgate}
          onSave={handleSuggestPromulgate}
          titleButton="Đồng ý"
          size="sm"
        >
          <Typography  >
            <b>Bạn có chắc chắn muốn đề nghị ban hành không?</b>
          </Typography>
        </CustomDialog>
      )}




      {/* Để xem vb đi */}

      {(openDialog?.MarkView || false) && (
        <CustomDialog
          open={openDialog?.MarkView || false}
          title={openDialog?.label}
          onClose={handleCloseDialogMarkView}
          onSave={handleMarkView}
          titleButton="Đồng ý"
          size="sm"
        >
          <Typography  >
            <b>Bạn có chắc chắn muốn đã xem không?</b>
          </Typography>
        </CustomDialog>
      )}

      {/* Từ chối lịch họp */}
      {(openDialog.RejectMeeting) && (
        <CustomDialog
          open={openDialog.RejectMeeting}
          onClose={closeProposetask}
          onSave={handleConfirmReject}
          title="Lý do từ chối"
          titleButton="Xác nhận từ chối"
          disabled={!note?.trim()}
        >
          <Box p={2}>
            <InputComponents
              multiline
              rows={4}
              placeholder="Nhập lý do từ chối..."
              value={note}
              onChange={handleChangeNote}
            />
          </Box>
        </CustomDialog>
      )}

      {/* Xác nhận tham gia */}
      {(openDialog.JoinMeeting) && (
        <CustomDialog
          open={openDialog.JoinMeeting}
          onClose={closeJoinMeetingMeeting}
          onSave={handleConfirmJoinMeeting}
          title="Xác nhận tham gia"
          titleButton="Xác nhận"
        >
          <Box>
            <Typography>
              Bạn có chắc chắn muốn <b>xác nhận tham gia</b> lịch họp này không?
            </Typography>
          </Box>
        </CustomDialog>
      )}

      {/* Từ chối tham gia
      {(openDialog.RejectJoin) && (
      <CustomDialog
          open={openDialog.RejectJoin}
          onClose={closeRejectJoinMeeting}
          onSave={handleConfirmRejectJoin}
          title="Lý do từ chối tham gia"
          titleButton="Xác nhận từ chối"
        >
          <Box p={2}>
            <InputComponents
              multiline
              rows={4}
              placeholder="Nhập lý do từ chối..."
              value={note}
              onChange={handleChangeNote}
            />
          </Box>
        </CustomDialog>
    )} */}
      {(openDialog.RejectJoin) && (
        <CustomDialog
          open={openDialog.RejectJoin}
          onClose={closeRejectJoinMeeting}
          onSave={handleRejectWithoutDelegation}
          title="Xác nhận không tham gia lịch họp"
          titleButton="Xác nhận"
          cancelButtonText="Hủy"
          leftButtons={
            openDialog.innerActions?.map((innerAction, idx) => {
              const isDelegation = innerAction.type === 'delegate_join';
              const handleActionClick = () => {
                if (isDelegation) {
                  handleOpenDelegation();
                  // Store sub-action data if needed
                  setOpenDialog(prev => ({
                    ...prev,
                    actionCode: innerAction.code,
                    targetRole: innerAction.targetRole
                  }));
                }
              };

              return (
                <SaveButton
                  key={idx}
                  onClick={handleActionClick}

                >
                  {innerAction.label}
                </SaveButton>
              );
            })
          }
        >
          <Box p={2}>
            <FormLabel>
              Bạn không thể tham dự cuộc họp này. Vui lòng chọn hình thức xử lý:
            </FormLabel>
            <Controller
              name="rejectJoinNote"
              control={rejectJoinControl}
              rules={{
                required: "Vui lòng nhập lý do không tham gia lịch họp",
                validate: (value) =>
                  (value && value.trim().length > 0) || "Vui lòng nhập lý do không tham gia lịch họp",
              }}
              render={({ field }) => (
                <InputComponents
                  {...field}
                  multiline
                  rows={4}
                  placeholder="Nhập lý do không tham gia lịch họp..."
                  error={Boolean(rejectJoinErrors.rejectJoinNote)}
                  helperText={rejectJoinErrors.rejectJoinNote?.message}
                />
              )}
            />
          </Box>
        </CustomDialog>
      )}

      {/* Ủy quyền tham gia */}
      {(openDialog.DelegateJoin) && (
        <CustomDialog
          open={openDialog.DelegateJoin}
          onClose={closeDelegateJoinMeeting}
          onSave={handleConfirmDelegateJoin}
          title="Xác nhận ủy quyền"
          titleButton="Xác nhận"
        >
          <Box>
            <Typography>
              Bạn có chắc chắn muốn <b>ủy quyền tham gia</b> lịch họp này không?
            </Typography>
            {/* Note: In a real scenario, this would need a user selector */}
          </Box>
        </CustomDialog>
      )}

      {/* Xóa lịch họp */}
      {(openDialog.DeleteMeeting) && (
        <CustomDialog
          open={openDialog.DeleteMeeting}
          onClose={handleCloseDeleteMeeting}
          onSave={handleConfirmDeleteMeeting}
          title="THÔNG BÁO"
          titleButton="ĐỒNG Ý"
          cancelString="ĐÓNG"
        >
          <Box>
            <Typography>
              Bạn có chắc muốn xóa lịch họp này không?
            </Typography>
          </Box>
        </CustomDialog>
      )}

      {/* Khóa điểm danh */}
      {(openDialog.LockAttendance) && (
        <CustomDialog
          open={openDialog.LockAttendance}
          onClose={handleCloseLockAttendance}
          onSave={handleConfirmLockAttendance}
          title="Xác nhận khóa điểm danh cuộc họp"
          titleButton="Xác nhận"
          cancelButtonText="Hủy"
        >
          <Box>
            <Typography >
              Bạn xác nhận khóa điểm danh cuộc họp “<b>{dataDetail?.title || dataDetail?.document?.title}</b>”.
            </Typography>
          </Box>
        </CustomDialog>
      )}

      {/* Thu hồi lịch họp */}
      {(openDialog.RecallMeeting) && (
        <CustomDialog
          open={openDialog.RecallMeeting}
          onClose={closeRecallMeeting}
          onSave={handleConfirmRecallMeeting}
          title="Xác nhận thu hồi lịch họp"
          titleButton="Xác nhận"
        // cancelString="ĐÓNG"
        >
          <Box>
            <Typography>
              Bạn có chắc muốn <b>thu hồi</b> lịch họp này không?
            </Typography>
          </Box>
        </CustomDialog>
      )}

      {/* Hủy lịch họp */}
      {(openDialog.CancelMeeting) && (
        <CustomDialog
          open={openDialog.CancelMeeting}
          onClose={closeCancelMeeting}
          onSave={handleConfirmCancelMeeting}
          title="Xác nhận hủy lịch họp"
          titleButton="Xác nhận huỷ"
          cancelString="Đóng"
        >
          <Box p={2}>
            <InputComponents
              multiline
              rows={4}
              placeholder="Nhập lý do huỷ lịch họp..."
              value={note}
              onChange={handleChangeNote}
              error={!!noteError}
              helperText={noteError}
            />
          </Box>
        </CustomDialog>
      )}

      {/* Hủy lịch họp lặp */}
      {(openDialog.CancelRecurrenceMeeting) && (
        <CustomDialog
          open={openDialog.CancelRecurrenceMeeting}
          onClose={closeCancelRecurrenceMeeting}
          onSave={handleConfirmCancelRecurrenceMeeting}
          title="Xác nhận hủy lịch họp"
          titleButton="Xác nhận"
          cancelString="Hủy"
        >
          <Box p={2}>
            <ConfirmScopeTitle variant="body1">
              Lịch họp này thuộc một chuỗi lịch lặp. Vui lòng chọn phạm vi hủy.
            </ConfirmScopeTitle>
            <RadioGroup
              value={cancelRecurrenceType}
              onChange={handleCancelRecurrenceTypeChange}
            >
              <FormControlLabel
                value="ONLY_THIS"
                control={<ConfirmScopeRadio />}
                label={
                  <ConfirmScopeLabel
                    variant="body1"
                    active={cancelRecurrenceType === 'ONLY_THIS'}
                  >
                    Chỉ hủy phiên họp này
                  </ConfirmScopeLabel>
                }
              />
              <FormControlLabel
                value="ALL_FOLLOWING"
                control={<ConfirmScopeRadio />}
                label={
                  <ConfirmScopeLabel
                    variant="body1"
                    active={cancelRecurrenceType === 'ALL_FOLLOWING'}
                    dimmed={cancelRecurrenceType !== 'ALL_FOLLOWING'}
                  >
                    Hủy phiên này và các phiên sau
                  </ConfirmScopeLabel>
                }
              />
            </RadioGroup>
            <Box mt={2}>
              <InputComponents
                multiline
                rows={4}
                placeholder="Nhập lý do huỷ lịch họp..."
                value={note}
                onChange={handleChangeNote}
                error={!!noteError}
                helperText={noteError}
              />
            </Box>
          </Box>
        </CustomDialog>
      )}

      {/* Từ chối */}
      {(openDialog.RejectModel || openDialog.RejectMeeting || false) && (
        <CustomDialog
          open={openDialog.RejectModel || openDialog.RejectMeeting || false}
          onClose={handleCloseDialogReject}
          onSave={handleConfirmReject}
          title="Lý do từ chối"
          titleButton="Xác nhận từ chối"
          disabled={!note?.trim()}
        >
          <Box p={2}>
            <InputComponents
              multiline
              rows={4}
              placeholder="Nhập lý do từ chối..."
              value={note}
              onChange={handleChangeNote}
            />
          </Box>
        </CustomDialog>
      )}


      {/* Từ chối yêu cầu đăng ký xe */}
      {(openDialog.RejectVehicleRegistrant) && (
        <CustomDialog
          open={openDialog.RejectVehicleRegistrant}
          onClose={handleCloseDialogRejectVehicleRegistrant}
          onSave={handleConfirmRejectVehicleRegistrant}
          title="Lý do từ chối"
          titleButton="Xác nhận"
        >
          <Box p={2}>
            <InputComponents
              multiline
              rows={4}
              placeholder="Nhập lý do từ chối..."
              value={note}
              onChange={handleChangeNote}
							required
              error={!!noteError}
              helperText={noteError}
            />
          </Box>
        </CustomDialog>
      )}

      {/* Hủy chuyến yêu cầu đăng ký xe */}
      {(openDialog.CancelVehicleRegistrant) && (
        <CustomDialog
          open={openDialog.CancelVehicleRegistrant}
          onClose={handleCloseDialogCancelVehicleRegistrant}
          onSave={handleConfirmCancelVehicleRegistrant}
          title="Lý do hủy chuyến"
          titleButton="Xác nhận"
        >
          <Box>
            <Typography>
              Bạn có chắc muốn huỷ chuyến này không?
            </Typography>
          </Box>
          <Box p={2}>

            <InputComponents
              multiline
              rows={4}
              placeholder="Nhập lý do hủy chuyến..."
              value={note}
              onChange={handleChangeNote}
            />
          </Box>
        </CustomDialog>
      )}

      {/* Hoàn thành chuyến yêu cầu đăng ký xe */}
      {(openDialog.FinishVehicleRegistrant) && (
        <CustomDialog
          open={openDialog.FinishVehicleRegistrant}
          onClose={handleCloseDialogFinishVehicleRegistrant}
          onSave={handleConfirmFinishVehicleRegistrant}
          title="Hoàn thành chuyến đi"
          titleButton="Xác nhận"
        >
          <Box>
            <Typography>
              <b>Bạn có chắc chắn muốn xác nhận hoàn thành chuyến đi này không?</b>
            </Typography>
          </Box>
        </CustomDialog>
      )}

      {(openDialog.ConfirmVehicleRegistrant) && (
        <CustomDialog
          open={openDialog.ConfirmVehicleRegistrant}
          onClose={handleCloseDialogConfirmVehicleRegistrant}
          onSave={handleConfirmVehicleRegistrant}
          title="Xác nhận tài xế"
          titleButton="Xác nhận"
        >
          <Box>
            <Typography>
              <b>Bạn có chắc chắn muốn xác nhận đi chuyến này không?</b>
            </Typography>
          </Box>
        </CustomDialog>
      )}

      {/* Đồng ý vb dự thảo */}

      {(openDialog.ApproveModel) && (
        <StyledDialog
          open={openDialog.ApproveModel}
          onClose={handleCloseApproveModel}
        >
          <StyledDialogContent>
            <Typography>
              <b style={{ textTransform: "uppercase" }}>
                {openDialog?.label}
              </b>          </Typography>
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
            <Button variant="primary" onClick={handleDocumentDraft}>
              Hoàn thành
            </Button>
            <Button variant="error" onClick={handleCloseApproveModel}>
              Đóng
            </Button>
          </StyledDialogActions>
        </StyledDialog>
      )}


      {/* Điều chỉnh - Nếu cần xử lý riêng */}
      {/* {openDialog?.EditModel && (
         <StyledDialog open={true} onClose={() => setOpenDialog(prev => ({...prev, EditModel: false}))}>
             <StyledDialogContent>
                 <Typography>Chức năng điều chỉnh (Edit) đang được xử lý...</Typography>
             </StyledDialogContent>
               <StyledDialogActions>
             <Button variant="primary" onClick={() => {
                if (onAction) onAction("edit");
                setOpenDialog(prev => ({...prev, EditModel: false}));
             }}>Tiếp tục</Button>
             <Button variant="error" onClick={() => setOpenDialog(prev => ({...prev, EditModel: false}))}>Đóng</Button>
         </StyledDialogActions>
         </StyledDialog>
      )} */}


      {/* ===== CUSTOM PLUGINS ===== */}
      {/* Tự động render tất cả custom plugins từ thư mục plugins/ */}
      {Array.from(pluginRegistry.getAllPlugins().values()).map((plugin) => {
        const PluginComponent = plugin.component;

        // Nếu plugin có mapProps function, sử dụng nó để map props
        let pluginProps = {};
        if (typeof plugin.mapProps === 'function') {
          // Tạo object chứa tất cả props có thể cần cho plugin
          const allProps = {
            openDialog,
            dataDetail,
            setReloadData,
            onClose,
            documentId,
            workItem,
            userId,
            actionCode,
            sharedComponents,
            handleCloseDialog,
            flags,
            isUpdate,
            getFormDataForUpdate,
            onAction,
            selectedIds,
            allSelectedData,
            viewMode,
            note,
            handleChangeNote,
            setNote,
            isLoading,
            setIsLoading,
            isView,
            onTransferSuccess,
            availableActionsType: openDialog?.availableActionsType,
            toast,
            profileButton: openDialog?.profileButton,
          };

          pluginProps = plugin.mapProps(openDialog, allProps);
        } else {
          // Nếu không có mapProps, truyền props mặc định
          pluginProps = {
            open: openDialog?.[plugin.name] || false,
            onClose: () => handleCloseDialog(plugin.name),
            dataDetail,
            setReloadData,
            sharedComponents,
            profileButton: openDialog?.profileButton,
          };
        }

        return (
          <PluginComponent
            key={plugin.name}
            profileButton={openDialog?.profileButton}
            {...pluginProps}
          />
        );
      })}

      {/* ParticipatingUnits Dialog for Delegation */}
      {(openParticipatingUnits) && (
        <SafeLazy><ParticipatingUnits
          open={openParticipatingUnits}
          onClose={handleCloseParticipatingUnits}
          onSave={handleSaveDelegatedUsers}
          dialogKey="internalUnit"
          initialSelectedUnits={delegatedUsers}
          hideRoles={['chair', 'secretary']}
          isDelegation
          excludeUserIds={excludeUserIdsData}
        /></SafeLazy>
      )}

    </>
  ), 
	[
    openDialog,
		actionCode,
		note,
		noteError,
		rejectJoinControl,
		rejectJoinErrors,
		openParticipatingUnits,
		delegatedUsers,
		cancelRecurrenceType,
		isLoading,
		dataDetail,
		documentId,
		workItem,
		isUpdate,
		isView,
		selectedIds,
		allSelectedData,
		flags,
		props,
		toast,
		viewMode,
		excludeUserIdsData,
		onOpenSuggestion,
		titlePopup,
		handleCloseDialog,
		setReloadData,
		sharedComponents,
		handleSaveDelegatedUsers,
		getFormDataForUpdate,
		onAction,
		handleChangeNote,
		setNote,
		setIsLoading,
		onTransferSuccess,
		closeChuyenXuLy,
		closeChuyenXuLySupport,
		panelContainerRef,
		onClose,
		handleCloseParticipatingUnits,
		closeAnnounceCalendar,
		closeApproveMeeting,
		closeApproveTaskFormDoc,
		closeApprovetask,
		closeCancelMeeting,
		closeCancelRecurrenceMeeting,
		closeDelegateJoinMeeting,
		closeFeedbackModel,
		closeJoinMeetingMeeting,
		closeProposeMeeting,
		closeProposetask,
		closeRecallMeeting,
		closeRecallProcessing,
		closeRecallIncoming,
		closeRecallTextModel,
		closeRejectJoinMeeting,
		closeRejecttask,
		closeReturnModel,
		closeSigningSubmission,
		closeSuggestion,
		closeTaskFormDoc,
		closeTranferFeedback,
		closeUpdateTaskFormDoc,
		handleCancelRecurrenceTypeChange,
		handleCloseAdditionalRelease,
		handleCloseApproveModel,
		handleCloseApproveNewsBulk,
		handleCloseDeleteMeeting,
		handleCloseDialogCancelVehicleRegistrant,
		handleCloseDialogComplete,
		handleCloseDialogCompleteAndTransition,
		handleCloseDialogCompleteDoc,
		handleCloseDialogCompleteSupport,
		handleCloseDialogConfirmVehicleRegistrant,
		handleCloseDialogFinishVehicleRegistrant,
		handleCloseDialogMarkView,
		handleCloseDialogReject,
		handleCloseDialogRejectVehicleRegistrant,
		handleCloseDialogSuggestPromulgate,
		handleCloseDialogViewed,
		handleCloseIssueProposal,
		handleCloseLockAttendance,
		handleCloseRecallNewsBulk,
		handleCloseSaveBook,
		handleCompeleteDoc,
		handleCompeleteProcessing,
		handleCompeleteSuppor,
		handleCompleteAndTransition,
		handleConfirmAction,
		handleConfirmAnnounceCalendar,
		handleConfirmApproveMeeting,
		handleConfirmCancelMeeting,
		handleConfirmCancelRecurrenceMeeting,
		handleConfirmCancelVehicleRegistrant,
		handleConfirmDelegateJoin,
		handleConfirmDeleteMeeting,
		handleConfirmFinishVehicleRegistrant,
		handleConfirmJoinMeeting,
		handleConfirmLockAttendance,
		handleConfirmProposeMeeting,
		handleConfirmRecallMeeting,
		handleConfirmReject,
		handleConfirmRejectVehicleRegistrant,
		handleConfirmVehicleRegistrant,
		handleDocumentDraft,
		handleIssueProposal,
		handleMarkView,
		handleOpenDelegation,
		handleRecallProcessing,
		handleRecallIncomingSuccess,
		handleRejectWithoutDelegation,
		handleSeen,
		handleSuccessApproveNewsBulk,
		handleSuccessRecallNewsBulk,
		handleSuggestPromulgate,
		handleUpdateTaskFormDoc,
		selectedMultiple,
		userId,
		recallReason,
		handleChangeRecallReason,
		recallReasonError
  ]);

  // Render cho mobile/tablet (350-750px)
  if (isMobileTablet) {
    return (
      <>
        {filteredActions.length > 0 && (
          <SkyFlexGap8>
            {isDashboardLook ? (
              <ButtonDashboardPage
                variantType="outline"
                variantColor="default"
                disabled={disabled || isLoading}
                onClick={handleOpenMobileMenu}
              >
                <MoreVertIcon />
              </ButtonDashboardPage>
            ) : (
              <ButtonOutline
                variant="contained"
                disabled={disabled || isLoading}
                onClick={handleOpenMobileMenu}
              >
                <MoreVertIcon />
              </ButtonOutline>
            )}

            <StyleMenu
              anchorEl={mobileMenuAnchor}
              open={Boolean(mobileMenuAnchor)}
              onClose={handleCloseMobileMenu}
            >
              {filteredActions.map((action) => {
                const validSubActions = (action?.subActions || []).filter((sub) =>
                  action?.targetRoles?.includes(sub.targetRole)
                );
                const hasSub = validSubActions.length > 0;

                return (
                  <StyleMenuItem
                    key={`${action.code}-${action.type || ""}`}
                    data-code={action.code}
                    data-type={action.type}
                    data-hassub={hasSub}
                    onClick={handleMobileMenuItemClick}
                  >
                    {action.label?.toUpperCase()}
                  </StyleMenuItem>
                );
              })}
            </StyleMenu>
          </SkyFlexGap8>
        )}
        {/* Sub-action menu */}
        {currentAction && (
          <StyleMenu
            anchorEl={anchorEl?.el}
            open={Boolean(anchorEl)}
            onClose={handleCloseMenu}
          >
            {(currentAction?.subActions || [])
              .filter((sub) =>
                currentAction?.targetRoles?.includes(sub.targetRole)
              )
              .map((sub) => {
                const actionsCodeSubTab =
                  sub?.actions?.map((act) => act.code) || [];
                // logger.log('sub', sub)
                return (
                  <StyleMenuItem
                    key={sub.targetRole}
                    data-targetrole={sub.targetRole}
                    data-codebysubtab={sub.code}
                    data-subtype={sub.type}
                    data-actioncodebysubtab={actionsCodeSubTab.join(",")}
                    onClick={handleSubActionClick}
                  >
                    {sub.label?.toUpperCase()}
                  </StyleMenuItem>
                );
              })}
          </StyleMenu>
        )}
        <React.Suspense fallback={null}>
          {sharedDialogsMemo}
          {isLoading && (
            <LoadingDialog open={isLoading}>
              Đang tải dữ liệu, vui lòng đợi...
            </LoadingDialog>
          )}
        </React.Suspense>
      </>
    );
  }

  // Render cho desktop (>750px) - giữ nguyên logic cũ
  return (
    <>
      {(filteredActions.length > 0 || flags?.canAdditionalRelease) && (
        <SkyFlexGap16>
          {filteredActions.map((action) => {
            const validSubActions = (action?.subActions || []).filter((sub) =>
              action?.targetRoles?.includes(sub.targetRole)
            );
            const hideKySaoY = action?.subActions?.some(sub => sub.hideAcMenu)
            const hasSub = validSubActions.length > 0;
            const actionIdentity = `${action.code}::${action.type || ""}`;
            const isMenuOpen = anchorEl?.id === actionIdentity;

            return (
              <React.Fragment key={`${action.code}-${action.type || ""}`}>
                {!(hideKySaoY && selectedIds && selectedIds.length > 0) && (
                  isDashboardLook ? (
                    <ButtonDashboardPage
                      variantType="filled"
                      variantColor={getDashboardButtonTone(action)}
                      disabled={disabled || isLoading || action.isDisabled}
                      id={actionIdentity}
                      aria-controls={isMenuOpen ? `${actionIdentity}-menu` : undefined}
                      aria-haspopup="true"
                      aria-expanded={isMenuOpen ? "true" : undefined}
                      data-code={action.code}
                      data-type={action.type}
                      data-hassub={hasSub}
                      onClick={handleMainActionClick}
                    >
                      {action.label?.toUpperCase()}
                    </ButtonDashboardPage>
                  ) : (
                    <ButtonOutline
                      variant="outlined"
                      variantColor={action?.color}
                      disabled={disabled || isLoading || action.isDisabled}
                      id={actionIdentity}
                      aria-controls={isMenuOpen ? `${actionIdentity}-menu` : undefined}
                      aria-haspopup="true"
                      aria-expanded={isMenuOpen ? "true" : undefined}
                      data-code={action.code}
                      data-type={action.type}
                      data-hassub={hasSub}
                      onClick={handleMainActionClick}
                    >
                      {action.label?.toUpperCase()}
                    </ButtonOutline>
                  )
                )}

                {hasSub && (
                  <StyleMenu
                    id={`${actionIdentity}-menu`}
                    anchorEl={anchorEl?.el}
                    open={isMenuOpen}
                    onClose={handleCloseMenu}
                    MenuListProps={{ "aria-labelledby": actionIdentity }}
                  >
                    {validSubActions?.map((sub) => {
                      const actionsCodeSubTab =
                        sub?.actions?.map((act) => act.code) || [];
                      // logger.log('sub-1', sub)
                      return (
                        <StyleMenuItem
                          key={sub.targetRole}
                          data-codebysubtab={sub.code}
                          data-targetrole={sub.targetRole}
                          data-subtype={sub.type}
                          data-actioncodebysubtab={actionsCodeSubTab}
                          onClick={handleSubActionClick}
                        >
                          {sub.label?.toUpperCase()}
                        </StyleMenuItem>
                      );
                    })}
                  </StyleMenu>
                )}
              </React.Fragment>
            );
          })}

          {flags?.canAdditionalRelease && (
            isDashboardLook ? (
              <ButtonDashboardPage variantType="outline" variantColor="default" onClick={handleOpenAdditionalRelease}>
                PHÁT HÀNH BỔ SUNG
              </ButtonDashboardPage>
            ) : (
              <ButtonOutline variant="outlined" onClick={handleOpenAdditionalRelease}>
                PHÁT HÀNH BỔ SUNG
              </ButtonOutline>
            )
          )}
        </SkyFlexGap16>
      )}

      <React.Suspense fallback={null}>
        {sharedDialogsMemo}
        {isLoading && (
          <LoadingDialog open={isLoading}>
            Đang tải dữ liệu, vui lòng đợi...
          </LoadingDialog>
        )}
      </React.Suspense>
    </>
  );
}

FormButton.propTypes = {
  sharedComponents: PropTypes.object,
  dataDetail: PropTypes.object,
  setReloadData: PropTypes.func,
  panelContainerRef: PropTypes.shape({
    current: PropTypes.instanceOf(typeof Element !== "undefined" ? Element : Object),
  }),
  hasUploadError: PropTypes.bool,
  isUploadingFiles: PropTypes.bool,
};

FormButton.displayName = "FormButton";

export default memo(withSharedComponents(FormButton));
