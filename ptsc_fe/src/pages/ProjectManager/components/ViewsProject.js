import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Grid,
  Typography,
  Box,
  Button,
  Menu,
  MenuItem,
  // ListItemIcon,
  ListItemText,
  Popover,
  List,
  ListItem,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { Controller, useForm } from "react-hook-form";
import EditIcon from "@mui/icons-material/Edit";
// import DeleteIcon from "@mui/icons-material/Delete";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import FolderIcon from "@mui/icons-material/Folder";
import DescriptionIcon from "@mui/icons-material/Description";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";
import { withFormWrapper } from "@components/common/FormWrapper";
import CustomAsyncAutoComplete from "@components/CustomAsyncAutoComplete";
import { VisibilityOutlined, DeleteOutline, DownloadOutlined, ChatBubbleOutlineOutlined } from "@mui/icons-material";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import {
  JobMainContent,
  JobSectionTitle,
  JobButtonContainer,
  JobSectionHeader,
  StyledMenuIcon,
  JobMoreActionsContainer,
  mentionPopoverPaperStyle,
  StyledListItemIcon,
  StyledBoxContainerContent,
  JobNoteContainer,
  JobLoadingBox,
  StyledIconWrapper,
  JobSectionHeaderWrapper,
  JobSectionHeaderLeft,
  JobSectionDivider,
  AbstractSummaryBox,
  AbstractSummaryContent,
  AbstractSummaryTitle,
  AbstractSummaryText,
  StyledInfoIcon,
  // Responsive project header components
  ProjectHeaderWrapper,
  ProjectHeaderContentBox,
  ProjectHeaderTitle,
  ProjectHeaderSubtext,
  ProjectHeaderProgressWrapper,
  ProjectHeaderProgressLabel,
  ProjectHeaderProgressPercent,
  ProjectStatusCardTitle,
  ProjectStatusPillRow,
  ProjectStatusPillBadge,
  ProjectStatusEditBtn,
  ProjectStatusDateLabel,
  ProjectStatusPriorityRow,
  ProjectStatusPriorityBadge,
  ProjectStatusPriorityValue,
} from "./AddProject.styles";
import UpdateJobDialog from "./UpdateProjectDialog";
import AnalysisProject from "./AnalysisProject";
import DecentralizationProject from "./DecentralizationProject";

const SegmentedControlContainer = styled(Box)(() => ({
  display: 'inline-flex',
  backgroundColor: '#f1f5f9',
  border: '1px solid #cbd5e1',
  borderRadius: '30px',
  padding: '4px',
  height: '48px',
  alignItems: 'stretch',
}));

const SegmentedControlButton = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active'
})(({ active }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '0 24px',
  cursor: 'pointer',
  backgroundColor: active ? '#ffffff' : 'transparent',
  color: active ? '#17191C' : '#64748B',
  fontWeight: active ? 600 : 500,
  fontSize: '1.25rem',
  borderRadius: '24px',
  boxShadow: active ? '0px 2px 8px rgba(0, 0, 0, 0.1)' : 'none',
  transition: 'all 0.25s ease',
}));

const StyledChatBubbleOutlineOutlined = styled(ChatBubbleOutlineOutlined)(() => ({
  fontSize: 18,
  color: '#2364B0'
}));

const StyledTabHeaderWrapper = styled(SkyFlexGap8)(() => ({
  height: '48px',
  alignItems: 'center'
}));

import HistoryJob from "@pages/WorkManagement/components/HistoryJob";
import FileTreeTable from "@components/FileTreeTable";
import CustomTabsWithBadge from "@components/CustomTabs";
import { SkyGrid, SkyFlexGap8 } from "@styles/SkyStyles";
import axiosInstance from "@utils/axiosInstance";
import { APP_BASE, API_VIEW_FILE, API_GET_COMMON_WORK_DETAIL, API_SEND_APPROVAL_COMMON_WORK, API_GET_LIST_USERS, API_PROJECT_MANAGEMENT, API_COMMON_WORK_COMMENTS, API_MERGE_LINK } from "@EnvironmentFile/constants/urlConfig";
import CustomInput from "@components/CustomInput/CustomInputBase";
// import {
//   StyledCustomInput,
// } from "@styles/PopupTableMembersProject/PopupTableMembersProject.style";
import PopupTableMembersProject from "@pages/ProjectManager/components/PopupTableMembersProject";

import { FileViewerDialog } from "@components/CustomDialog";
import { useDispatch, useSelector } from "react-redux";
import { getCommentsByTask, addCommentToJob, updateCommentInJob, deleteCommentInJob, replyToCommentInJob, toggleCommentLike } from "@redux/slices/SharedCategory/managementUnitSlice";
import LoadingDialog from "@components/LoadingDialog";
import {
  UPLOAD_LIMITS_PER_FILE,
  UPLOAD_LIMITS_PER_FOLDER,
  UPLOAD_LIMITS_PER_BATCH,
  UPLOAD_LIMITS_PER_TASK,
  validateFileName,
  validateFileExtension,
  formatFileSize,
  generateDuplicateName
} from "./constants";
import JobProject from "./JobProject";
import Comment from "@pages/WorkManagement/components/Comment";
import SolutionToFix from "@pages/WorkManagement/components/SolutionToFix";
import ReasonsDelayJob from "@pages/WorkManagement/components/ReasonsDelayJob";
// import AutoComplete from "@components/AutoComplete";
import {
  JobActionOutlineButton,
  JobCommentGridContainer,
  JobSlider,
  JobStatusBox,
  JobStatusDateItem,
  JobStatusDateLabel,
  JobStatusDatesRow,
  JobStatusDateValue,
  JobStatusEditIcon,
  StytedPeopleIcon,
} from "@pages/WorkManagement/components/Job.styles";
import ProjectDisbursement from "./ProjectDisbursement";
import CustomSwipper from "@components/Swipper/BaseSwiper";
import DOMPurify from "dompurify";

const StyledDescriptionIcon = styled(DescriptionIcon)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

// const StyledSendIconButton = styled(IconButton)(({ theme }) => ({
//   backgroundColor: '#2364B0',
//   color: '#FFFFFF',
//   width: 36,
//   height: 36,
//   flexShrink: 0,
//   '&:hover': { backgroundColor: '#1a4d8f' },
//   '&.Mui-disabled': { backgroundColor: theme.palette.action.disabledBackground, color: theme.palette.action.disabled },
// }));

// const StyledSendIcon = styled(SendIcon)({
//   fontSize: '1.1rem',
// });

const StyledApproveContent = styled(StyledBoxContainerContent)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

const InfoItemContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: theme.spacing(1.5),
  marginBottom: theme.spacing(2),
}));

const IconWrapper = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(0.3),
}));

const ContentWrapper = styled(Box)(() => ({
  flex: 1,
}));

const LabelTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

const ValueTypography = styled(Typography)(() => ({
  fontWeight: 500,
}));

const LocalInfoItem = ({ icon, label, value }) => (
  <InfoItemContainer>
    {icon && <IconWrapper>{icon}</IconWrapper>}
    <ContentWrapper>
      <LabelTypography variant="caption">{label}</LabelTypography>
      <ValueTypography variant="body1">{value || ""}</ValueTypography>
    </ContentWrapper>
  </InfoItemContainer>
);

const StyledToggleButton = styled(Button)(({ theme }) => ({
  borderRadius: '20px',
  marginLeft: theme.spacing(2),
  textTransform: 'none',
  height: '28px',
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
}));


const ViewsProject = ({
  open,
  onClose,
  onSuccess,
  sharedComponents,
  data, // Giả sử bạn truyền data công việc vào để hiển thị (mode view/edit)
  documentId,
  setReloadData,
}) => {

  const {
    // CustomSwipper,
    InputComponents: BaseInput,
    DateTimePicker: BaseDateTimePicker,
    ButtonOutline,
    toast,
    Dialog,
  } = sharedComponents;

  const isViewMode = !data?.editable;

  const InputComponents = useMemo(() => {
    const Wrapped = withFormWrapper(BaseInput, "input");
    const Component = (props) => <Wrapped {...props} isView={isViewMode} />;
    Component.displayName = "InputComponents";
    return Component;
  }, [BaseInput, isViewMode]);

  const DateTimePicker = useMemo(() => {
    const Wrapped = withFormWrapper(BaseDateTimePicker, "date");
    const Component = (props) => <Wrapped {...props} isView={isViewMode} />;
    Component.displayName = "DateTimePicker";
    return Component;
  }, [BaseDateTimePicker, isViewMode]);

  // const AutoCompleteComponent = useMemo(() => {
  //   const Wrapped = withFormWrapper(AutoComplete, "asyncSelect");
  //   const Component = (props) => <Wrapped {...props} isView={isViewMode} />;
  //   Component.displayName = "AutoCompleteComponent";
  //   return Component;
  // }, [isViewMode]);

  // const WapperCustomAutoComplete = useMemo(() => {
  //   const Wrapped = withFormWrapper(AutoComplete, "asyncSelect");
  //   const Component = (props) => <Wrapped {...props} />;
  //   Component.displayName = "WapperCustomAutoComplete";
  //   return Component;
  // }, []);

  // const WrappedCustomAsyncAutoComplete = useMemo(() => {
  //   const Wrapped = withFormWrapper(CustomAsyncAutoComplete, "asyncSelect");
  //   const Component = (props) => <Wrapped {...props} />;
  //   Component.displayName = "WrappedCustomAsyncAutoComplete";
  //   return Component;
  // }, []);

  const WrappedCustomAsyncAutoComplete = useMemo(() => {
    const Wrapped = withFormWrapper(CustomAsyncAutoComplete, "asyncSelect");
    const Component = (props) => <Wrapped {...props} />;
    Component.displayName = "WrappedCustomAsyncAutoComplete";
    return Component;
  }, []);

  // const AsyncAutoCompletes = useMemo(() => {
  //   const Wrapped = withFormWrapper(AutoComplete, "asyncSelect");
  //   const Component = (props) => {
  //     const { onClick, value, disabled, ...rest } = props;

  //     return (
  //       <div onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
  //         <div style={{ pointerEvents: onClick ? 'none' : 'auto' }}>
  //           <Wrapped 
  //             {...rest}
  //             disabled={disabled}
  //             limitTags={2}
  //             multiple
  //             valueKey="_id"
  //             labelKey="name"
  //             options={Array.isArray(value) ? value : []}
  //             value={Array.isArray(value) ? value.map(v => v._id || v.id || v.name) : []}
  //           />
  //         </div>
  //       </div>
  //     );
  //   };
  //   Component.displayName = "AsyncAutoCompletes";
  //   return Component;
  // }, []);

  const dispatch = useDispatch();
  const { commentsList } = useSelector((state) => state.unit);
  const { crmSource } = useSelector((state) => state.config);
  const { dataUser: authUser } = useSelector((state) => state.auth || {});
  const userData = useMemo(() => authUser || {}, [authUser]);

  const [, setUserOptions] = useState([]);

  useEffect(() => {
    const fetchUserOptions = async () => {
      try {
        const response = await axiosInstance.get(`${API_GET_LIST_USERS}/all`);
        const data = response?.data?.data || response?.data || response || [];
        setUserOptions(data);
      } catch (error) {
        logger.error("Lỗi khi lấy danh sách người dùng:", error);
      }
    };
    fetchUserOptions();
  }, []);

  const urgencyOptions = useMemo(() => crmSource.find((item) => item.code === "DOUUTIEN")?.data || [], [crmSource]);
  const optionTypeOfProcess = useMemo(() => crmSource.find((item) => item.code === "S99ultra")?.data || [], [crmSource]);
  const topicOptions = useMemo(() => crmSource.find((item) => item.code === "LOAIDUAN")?.data || [], [crmSource]);
  const timeOptions = useMemo(() => crmSource.find((item) => item.code === "S34")?.data || [], [crmSource]);
  const [openNote, setOpenNote] = useState({
    open: false,
    note: null,
  });

  const handleNoteClick = useCallback((note) => {
    setOpenNote({
      open: true,
      note,
    });
  }, []);

  const handleCloseNote = useCallback(() => {
    setOpenNote({
      open: false,
      note: null,
    });
  }, []);

  const createHandleNoteClick = useCallback((note) => () => handleNoteClick(note), [handleNoteClick]);


  const [isLoading, setIsLoading] = useState(false);

  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [, setBreadcrumb] = useState([]);
  const [flags, setFlags] = useState({});
  const [myPermissions, setMyPermissions] = useState(null);
  const [activeTab, setActiveTab] = useState("general"); // 'general', 'work', 'analysis', 'permissions'
  const [delayReasonText, setDelayReasonText] = useState("");
  logger.info("delayReasonText", delayReasonText);
  const [dataReasonsDelay, setDataReasonsDelay] = useState([]);
  const [isLinkPopupOpen, setIsLinkPopupOpen] = useState(false);
  const [linkFormValues, setLinkFormValues] = useState({ name: "", link: "" });

  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [commentTab, setCommentTab] = useState(0);

  const displayDataRaw = data;
  const [displayData, setDisplayData] = useState(displayDataRaw);

  const handleSelectCommentTab = useCallback(() => setCommentTab(0), []);
  const handleSelectSuggestionTab = useCallback(() => setCommentTab(1), []);

  const isViewer = useMemo(() => {
    if (!displayData?.viewers || !Array.isArray(displayData.viewers)) return false;
    const currentUserId = String(userData?._id || userData?.id || userData?.user?._id || userData?.user?.id || "");
    return displayData.viewers.some(v => {
      const vid = String(v?.userId || v?._id || v?.id || v || "");
      return vid === currentUserId && vid !== "";
    });
  }, [displayData, userData]);

  const {
    control,
    // handleSubmit,
    // formState: { errors },
    watch,
    reset,
    setValue,
  } = useForm({
    defaultValues: {
      taskName: data?.name,
      startDate: data?.startDate,
      deadline: data?.endDate,
      reminderTime: data?.reminderDays,
      priority: data?.priority,
      typeProject: data?.typeProject,
      budget: data?.budget,
      description: data?.description,
      assigner: Array.isArray(data?.managerId)
        ? data.managerId.map(m => m.userId || m.id || m._id)
        : ((data?.managerId?.userId || data?.managerId?.id || data?.managerId?._id) || (data?.manager?._id || data?.manager?.id || data?.manager)),
      members: data?.members ? (Array.isArray(data.members) ? data.members.map(m => m.userId || m.id || m._id) : (typeof data.members === 'string' ? data.members.split(',') : data.members)) : [],
      viewers: data?.viewers ? (Array.isArray(data.viewers) ? data.viewers.map(v => v.userId || v.id || v._id) : (typeof data.viewers === 'string' ? data.viewers.split(',') : data.viewers)) : [],
      progress: data?.progress !== undefined ? parseFloat(data.progress) : 0,
      status: data?.projectStatus,
      code: data?.code,
    },
  });

  const currentStatusString = (watch("status") || "").toLowerCase();
  const isProjectCompletedCancelledOrPaused = currentStatusString.includes("hoàn thành") || currentStatusString.includes("hủy") || currentStatusString.includes("huỷ") || currentStatusString.includes("tạm dừng");
  const isProjectCompletedOrCancelled = currentStatusString.includes("hoàn thành") || currentStatusString.includes("hủy") || currentStatusString.includes("huỷ");

  const [openDialogMembers, setOpenDialogMembers] = useState(false);
  const [userByOrganizationUnitsMembers, setUserByOrganizationUnitsMembers] = useState([]);

  const handleOpenDialogMembers = () => {
    setOpenDialogMembers(true);
  };

  const handleCloseDialogMembers = () => {
    setOpenDialogMembers(false);
  };

  // const selectValueMembers = useMemo(() => {
  //   const membersArray = Array.isArray(displayData?.members) 
  //     ? displayData.members 
  //     : (typeof displayData?.members === 'string' ? displayData.members.split(',').map(name => ({ name, id: name, _id: name })) : []);
  //   const filteredData = membersArray.filter(u => !u?.isDepartment);
  //   return {
  //     data: filteredData,
  //     value: filteredData.map(u => u.name || u.fullName || u.id).join('; ')
  //   };
  // }, [displayData?.members]);

  useEffect(() => {
    const initialMembers = Array.isArray(displayData?.members) ? displayData.members : [];
    const initialDepts = Array.isArray(displayData?.organizationUnitId)
      ? displayData.organizationUnitId.map(id => ({
        id,
        _id: id,
        types: 'company',
        type: 'folder',
        isDepartment: true
      }))
      : [];

    const combined = [...initialMembers, ...initialDepts].map(m => {
      if (typeof m === 'object' && m !== null) {
        const id = m.id || m._id || m.userId;
        return {
          ...m,
          id: id,
          _id: id,
          name: m.name || m.fullName || (m.isDepartment ? "" : "N/A"),
          types: m.types || (m.isDepartment ? "company" : "user"),
          type: m.type || (m.isDepartment ? "folder" : "file"),
        };
      }
      return m;
    });
    setUserByOrganizationUnitsMembers(combined);
  }, [displayData?.members, displayData?.organizationUnitId]);

  const progress = watch("progress") ?? 0;

  const fetchJobDetail = useCallback(async (customViewMode) => {
    if (open && currentTaskId) {
      try {
        const params = customViewMode ? { viewMode: customViewMode } : { viewMode: null };
        const response = await axiosInstance.get(`${API_PROJECT_MANAGEMENT}/${currentTaskId}`, { params });
        const jobDetail = response?.data || response;

        setDisplayData(jobDetail);
        const detailFlags = jobDetail?.flags || response?.flags || {};

        const getParticipantId = (p) => p?.userId || p?.id || p?._id || p;

        // Map Project Entity to Form
        const formData = {
          taskName: jobDetail.name || "",
          startDate: jobDetail.startDate ? dayjs(jobDetail.startDate) : null,
          endDate: jobDetail.endDate ? dayjs(jobDetail.endDate) : null,
          reminderDays: jobDetail.reminderDays || "12h",
          priority: jobDetail.priority || "",
          typeProject: jobDetail.typeProject || "",
          budget: jobDetail.budget ? jobDetail.budget.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "",
          description: jobDetail.description || "",
          process: jobDetail.processName || "",
          assigner: Array.isArray(jobDetail.managerId)
            ? jobDetail.managerId.map(getParticipantId)
            : getParticipantId(jobDetail.managerId),
          members: Array.isArray(jobDetail.members)
            ? jobDetail.members.map(getParticipantId)
            : (jobDetail.members ? (typeof jobDetail.members === 'string' ? jobDetail.members.split(',') : []) : []),
          viewers: Array.isArray(jobDetail.viewers)
            ? jobDetail.viewers.map(getParticipantId)
            : (jobDetail.viewers ? (typeof jobDetail.viewers === 'string' ? jobDetail.viewers.split(',') : []) : []),
          progress: parseFloat(jobDetail.progress) || 0,
          status: jobDetail.projectStatus || "",
          code: jobDetail.code || "",
        };
        reset(formData);

        // Process breadcrumb
        const crumbs = [{ id: jobDetail.id, name: jobDetail.name }];
        setBreadcrumb(crumbs);

        // Fetch permissions based on myRole
        if (jobDetail.myRole) {
          try {
            const permResponse = await axiosInstance.get(`${API_PROJECT_MANAGEMENT}/${currentTaskId}/permissions/${jobDetail.myRole}`);
            const perms = permResponse?.permissions || permResponse;
            if (perms) {
              setMyPermissions(perms);
              setFlags({
                ...detailFlags,
                isStatus: perms.updateStatus ?? detailFlags.isStatus,
                isGeneralInfo: perms.updateGeneralInfo ?? detailFlags.isGeneralInfo,
                isParticipants: perms.updateParticipants ?? detailFlags.isParticipants,
                isFiles: perms.uploadFiles ?? detailFlags.isFiles,
                isSlowReason: detailFlags.isSlowReason && (perms.inputDelayReason ?? true),
                canComment: perms.comment,
                canAnalysis: perms.viewAnalysis,
                canViewAnalysis: perms.viewAnalysis,
                canDecentralize: perms.setPermissions,
              });
            } else {
              setFlags(detailFlags);
            }
          } catch (permError) {
            logger.error("Lỗi lấy quyền người dùng:", permError);
            setFlags(detailFlags);
          }
        } else {
          setFlags(detailFlags);
        }
      } catch (error) {
        logger.error("Lỗi lấy chi tiết dự án:", error);
      }
    }
  }, [open, currentTaskId, reset]);

  const refetchFiles = useCallback(async () => {
    if (!currentTaskId) return;
    const id = currentTaskId;
    try {
      const currentUserName = userData?.user?.name || userData?.name || "Người dùng";

      const [taskDocsRes, finalDocsRes, taskLinksRes] = await Promise.all([
        axiosInstance.get(`${APP_BASE}/api/files/by-object?object_type=project&object_id=${id}`),
        axiosInstance.get(`${APP_BASE}/api/files/by-object?object_type=final_documents&object_id=${id}`),
        axiosInstance.get(`${API_MERGE_LINK}?taskId=${id}`)
      ]);
      // Xử lý response có thể là { data: [...] } hoặc trực tiếp là array
      const taskDocsData = taskDocsRes?.data?.data || taskDocsRes?.data || taskDocsRes || [];
      const finalDocsData = finalDocsRes?.data?.data || finalDocsRes?.data || finalDocsRes || [];
      const taskLinksData = taskLinksRes?.data?.data || taskLinksRes?.data || taskLinksRes || [];

      /* eslint-disable camelcase */
      const formattedLinks = (Array.isArray(taskLinksData) ? taskLinksData : []).map(link => ({
        ...link,
        name: link.documentName,
        file_name: link.documentName,
        type_file: 'link',
        id: link.id || link._id,
        from_source: link.createdByName || link.userName || link.created_by_name || link.fullName || (link.isCreator ? currentUserName : ""),
        source_type: 'link',
        is_uploader: !!link.isCreator
      }));
      /* eslint-enable camelcase */

      const mergedTaskDocs = [...(Array.isArray(taskDocsData) ? taskDocsData : []), ...formattedLinks];

      setTaskDocuments(mergedTaskDocs);
      setFinalDocuments(Array.isArray(finalDocsData) ? finalDocsData : []);
    } catch (error) {
      logger.error("Không thể tải danh sách tệp đính kèm.", error);
    }
  }, [currentTaskId, userData?.name, userData?.user?.name]);



  const [linkErrors, setLinkErrors] = useState({ name: "", link: "" });

  const validateURL = useCallback((url) => {
    const pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
      '(\\#[-a-z\\d_.~+%=&]*)?$', 'i'); // fragment locator
    return !!pattern.test(url.trim());
  }, []);

  const handleOpenLinkPopup = useCallback(() => {
    setIsLinkPopupOpen(true);
    setLinkFormValues({ name: "", link: "" });
    setLinkErrors({ name: "", link: "" });
  }, []);

  const handleCloseLinkPopup = useCallback(() => {
    setIsLinkPopupOpen(false);
    setLinkErrors({ name: "", link: "" });
  }, []);

  const handleLinkNameChange = useCallback((e) => {
    setLinkFormValues(prev => ({ ...prev, name: e.target.value }));
    if (e.target.value.trim()) {
      setLinkErrors(prev => ({ ...prev, name: "" }));
    }
  }, []);

  const handleLinkUrlChange = useCallback((e) => {
    const url = e.target.value;
    setLinkFormValues(prev => ({ ...prev, link: url }));
    if (url.trim()) {
      if (validateURL(url)) {
        setLinkErrors(prev => ({ ...prev, link: "" }));
      } else {
        setLinkErrors(prev => ({ ...prev, link: "Đường dẫn tài liệu không hợp lệ." }));
      }
    } else {
      setLinkErrors(prev => ({ ...prev, link: "" }));
    }
  }, [validateURL]);

  const fetchHistory = useCallback(async () => {
    if (!currentTaskId) return;
    try {
      const response = await axiosInstance.get(`${API_GET_COMMON_WORK_DETAIL}/${currentTaskId}`);
      const responseData = response?.data || response;
      setHistoryData(Array.isArray(responseData) ? responseData : responseData?.data || []);
    } catch (error) {
      logger.error("Lỗi lấy lịch sử công việc:", error);
      setHistoryData([]);
    }
  }, [currentTaskId]);


  const handleSaveLink = useCallback(async () => {
    const errors = { name: "", link: "" };
    let hasError = false;

    if (!linkFormValues.name.trim()) {
      errors.name = "Vui lòng nhập tên tài liệu";
      hasError = true;
    }
    if (!linkFormValues.link.trim()) {
      errors.link = "Vui lòng nhập đường dẫn tài liệu";
      hasError = true;
    } else if (!validateURL(linkFormValues.link)) {
      errors.link = "Đường dẫn tài liệu không hợp lệ.";
      hasError = true;
    }

    if (hasError) {
      setLinkErrors(errors);
      return;
    }

    try {
      setIsLoading(true);
      await axiosInstance.post(API_MERGE_LINK, {
        taskId: String(currentTaskId),
        documentName: linkFormValues.name,
        documentUrl: linkFormValues.link
      });
      toast("Gắn link tài liệu thành công", "success");
      handleCloseLinkPopup();
      refetchFiles();
      if (fetchHistory) fetchHistory();
    } catch (error) {
      toast(error?.response?.data?.message || "Gắn link tài liệu thất bại", "error");
    } finally {
      setIsLoading(false);
    }
  }, [linkFormValues, currentTaskId, refetchFiles, fetchHistory, toast, handleCloseLinkPopup, validateURL]);



  const fecthDataReasonsDelayJob = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await axiosInstance.get(`${API_COMMON_WORK_COMMENTS}/${currentTaskId}/comments`, {
        params: {
          filter: {
            type: "slowReason",
          },
        },
      });
      setDataReasonsDelay(res);
      setIsLoading(false);
    } catch (error) {
      logger.error(error);
      setIsLoading(false);
      toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
    } finally {
      setIsLoading(false);
    }
  }, [currentTaskId, toast]);


  useEffect(() => {
    if (open) {
      if (data?.id || data?._id) {
        setCurrentTaskId(data.id || data._id);
      } else if (documentId) {
        setCurrentTaskId(documentId);
      }
    }
  }, [open, data, documentId]);

  // Xử lý hiển thị bình luận phân cấp
  const organizedComments = useMemo(() => {
    if (!commentsList || !Array.isArray(commentsList)) return [];

    const filteredComments = commentsList.filter((cmt) => {
      if (cmt.type === 'slowReason') return false;
      const cmtType = cmt.type || 'comment';
      return commentTab === 0 ? cmtType === 'comment' : cmtType === 'suggestion';
    });

    const commentMap = {};
    const rootComments = [];

    // Tạo map để tra cứu nhanh và khởi tạo mảng children
    filteredComments.forEach((cmt) => {
      const id = cmt.id || cmt._id;
      commentMap[id] = { ...cmt, children: [] };
    });

    // Xây dựng cây
    filteredComments.forEach((cmt) => {
      const id = cmt.id || cmt._id;
      const node = commentMap[id];
      // Kiểm tra parentId
      if (cmt.parentId && commentMap[cmt.parentId]) {
        commentMap[cmt.parentId].children.push(node);
      } else {
        rootComments.push(node);
      }
    });

    // Làm phẳng danh sách để render, thêm thuộc tính level
    const flatten = (nodes, level = 0) => {
      let res = [];
      nodes.forEach((node) => {
        res.push({ ...node, level });
        if (node.children?.length > 0) {
          res = res.concat(flatten(node.children, level + 1));
        }
      });
      return res;
    };

    return flatten(rootComments);
  }, [commentsList, commentTab]);




  // const allUserOptions = useMemo(() => {
  //   const participants = [];
  //   // Hàm bổ trợ để chuẩn hóa object người dùng
  //   const getP = (p) => {
  //     if (!p) return null;
  //     // Trường hợp p là ID (string)
  //     if (typeof p !== 'object') return { id: p, name: "Đang tải..." };
  //     // Trường hợp p là object
  //     return {
  //       id: p.userId || p.id || p._id,
  //       name: p.name || "N/A"
  //     };
  //   };

  //   // Lấy thông tin từ displayData (dữ liệu chi tiết dự án đã có sẵn tên)
  //   if (displayData?.managerId) participants.push(getP(displayData.managerId));
  //   if (Array.isArray(displayData?.members)) {
  //     displayData.members.forEach(m => participants.push(getP(m)));
  //   }
  //   if (Array.isArray(displayData?.viewers)) {
  //     displayData.viewers.forEach(v => participants.push(getP(v)));
  //   }

  //   // Lọc bỏ trùng lặp và null
  //   const uniqueParticipants = participants.filter((p, index, self) =>
  //     p && p.id && self.findIndex(t => t.id === p.id) === index
  //   );

  //   // Trộn với danh sách userOptions từ API (thường chỉ có 20-50 người đầu)
  //   const merged = [...uniqueParticipants];
  //   userOptions.forEach(opt => {
  //     const id = opt.id || opt._id || opt.userId;
  //     if (id && !merged.some(m => m.id === id)) {
  //       merged.push({ ...opt, id });
  //     }
  //   });

  //   return merged;
  // }, [displayData, userOptions]);

  const [isUpdated, setIsUpdated] = useState(false);
  // State cho dialog cập nhật
  const [updateDialogState, setUpdateDialogState] = useState({
    open: false,
    type: null, // 'general' | 'participants'
  });

  const [replyingToCommentId, setReplyingToCommentId] = useState(null);

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [taskDocuments, setTaskDocuments] = useState([]);
  const [finalDocuments, setFinalDocuments] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [viewingFile, setViewingFile] = useState({
    open: false,
    url: null,
    name: "",
    type: null,
  });
  const [mentionAnchorEl, setMentionAnchorEl] = useState(null);
  const [mentionSearchTerm, setMentionSearchTerm] = useState("");
  const [mentionUsers, setMentionUsers] = useState([]);
  const [mentionedIds, setMentionedIds] = useState([]);
  const textareaRef = React.useRef(null);
  const [isCommentMultiline, setIsCommentMultiline] = useState(false);
  const [confirmDeleteComment, setConfirmDeleteComment] = useState(false);

  const [commentMenuAnchor, setCommentMenuAnchor] = useState(null);
  const [selectedCommentForMenu, setSelectedCommentForMenu] = useState(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [confirmActionDialog, setConfirmActionDialog] = useState({
    open: false,
    title: "",
    actionCode: ""
  });
  const [actionDescription, setActionDescription] = useState("");
  const [isExpandedGeneralInfo, setIsExpandedGeneralInfo] = useState(false);

  const handleToggleExpandedGeneralInfo = useCallback(() => {
    setIsExpandedGeneralInfo((prev) => !prev);
  }, []);

  const isProjectManager = useMemo(() => {
    return displayData?.myRole === 'manager';
  }, [displayData]);

  const visibleTabs = useMemo(() => {
    const tabs = [
      { label: "THÔNG TIN CHUNG", key: "general" },
      { label: "CÔNG VIỆC", key: "work" },
    ];
    if (flags.canAnalysis) tabs.push({ label: "PHÂN TÍCH", key: "analysis" });
    if (flags.canDecentralize && !isProjectCompletedCancelledOrPaused) tabs.push({ label: "PHÂN QUYỀN", key: "permissions" });
    return tabs;
  }, [flags, isProjectCompletedCancelledOrPaused]);


  const handleActionClick = useCallback(async (event) => {
    const { code, label, type } = event.currentTarget.dataset;

    setConfirmActionDialog({
      open: type === 'updatetask' ? false : true,
      title: label,
      actionCode: code
    });
    if (type === 'updatetask') {
      try {
        const body = {
          id: currentTaskId
        }
        const response = await axiosInstance.post(`${APP_BASE}/api/tasks/confirm-adjust`, body);
        if (response) {
          toast("Xác nhận điều chỉnh công việc thành công", "success");
          handleCloseConfirmAction();
          setIsUpdated(true);
          fetchJobDetail();
          refetchFiles();
          fetchHistory();
        }
      } catch (error) {
        toast(error?.response?.data?.message || "Xác nhận điều chỉnh công việc thất bại", "error");
      }
    }
    setActionDescription("");
  }, [currentTaskId, toast, fetchJobDetail, refetchFiles, fetchHistory, setIsUpdated]);


  const handleActionDescriptionChange = useCallback((e) => {
    setActionDescription(e.target.value);
  }, []);

  const handleCloseConfirmAction = () => {
    setConfirmActionDialog({ open: false, title: "", actionCode: "" });
    setActionDescription("");
  };

  const handleConfirmAction = async () => {
    const id = currentTaskId;
    if (!id) return;

    try {
      await axiosInstance.post(API_SEND_APPROVAL_COMMON_WORK, {
        note: actionDescription,
        taskId: id,
        actionCode: confirmActionDialog.actionCode,
      });
      toast(`Đã ${confirmActionDialog.title.toLowerCase()}`, "success");
      handleCloseConfirmAction();
      setIsUpdated(true);
      fetchJobDetail();
      fetchHistory();
    } catch (error) {
      toast("Gửi thất bại!", "error");
    }
    handleCloseConfirmAction();
  };

  useEffect(() => {
    if (open) {
      setIsUpdated(false);
    }
  }, [open]);

  const handleCloseInternal = () => {
    if (isUpdated) {
      onSuccess?.();
    }
    if (setReloadData) {
      setReloadData(new Date());
    }
    onClose();
  };

  const handleOpenCommentMenu = (event, comment) => {
    setCommentMenuAnchor(event.currentTarget);
    setSelectedCommentForMenu(comment);
  };

  const handleCloseCommentMenu = () => {
    setCommentMenuAnchor(null);
    setSelectedCommentForMenu(null);
  };

  const handleReplyComment = useCallback((comment) => {
    setReplyingToCommentId(comment.id || comment._id);
    setEditingCommentId(null);
    const authorName = comment.userName || "User";
    setCommentText(`@${authorName}\u200B `);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleEditComment = () => {
    if (selectedCommentForMenu) {
      const isSlowReason = selectedCommentForMenu.type === 'slowReason';
      if (isSlowReason) {
        setDelayReasonText(selectedCommentForMenu.content || "");
      } else {
        setCommentText(selectedCommentForMenu.content || "");
      }
      setEditingCommentId(selectedCommentForMenu.id || selectedCommentForMenu._id);

      if (!isSlowReason && textareaRef.current) {
        textareaRef.current.focus();
      }
    }
    handleCloseCommentMenu();
  };

  const handleDeleteComment = () => {
    setConfirmDeleteComment(true);
    setCommentMenuAnchor(null); // Chỉ đóng menu, không xóa comment đang chọn
  };

  const handleConfirmDeleteComment = async () => {
    const commentId = selectedCommentForMenu?.id || selectedCommentForMenu?._id;
    const isSlowReason = selectedCommentForMenu?.type === 'slowReason' ||
      dataReasonsDelay.some(r => (r.id || r._id) === commentId);
    const taskId = currentTaskId;

    if (commentId && taskId) {
      try {
        setIsLoading(true);
        await dispatch(
          deleteCommentInJob({ documentId: taskId, commentId })
        ).unwrap();
        toast("Xóa bình luận thành công", "success");

        if (isSlowReason) {
          await fecthDataReasonsDelayJob();
        }
        await fetchHistory();
        setIsUpdated(true);
      } catch (error) {
        toast("Xóa bình luận thất bại", "error");
      } finally {
        setIsLoading(false);
      }
    }
    setConfirmDeleteComment(false);
    setSelectedCommentForMenu(null); // Dọn dẹp state sau khi xử lý
  };

  const handleCloseConfirmDeleteComment = () => {
    setConfirmDeleteComment(false);
    setSelectedCommentForMenu(null); // Dọn dẹp state khi hủy
  };

  const createOpenCommentMenuHandler = useCallback((cmt) => (event) => {
    handleOpenCommentMenu(event, cmt);
  }, []);

  const createReplyCommentHandler = useCallback((cmt) => () => {
    handleReplyComment(cmt);
  }, [handleReplyComment]);



  const handleMenuClick = useCallback((event, file) => {
    setAnchorEl(event.currentTarget);
    setSelectedFile(file);
  }, []);



  const handleDynamicFileMenuClick = useCallback((event) => {
    const fileId = event.currentTarget.dataset.fileId;
    const isFolder = event.currentTarget.dataset.isFolder === "1";
    const allFiles = [...taskDocuments, ...finalDocuments];
    const file = allFiles.find(f => (f.id || f._id).toString() === fileId);
    if (file) {
      handleMenuClick(event, { ...file, name: file.file_name || file.name, isFolder });
    }
  }, [handleMenuClick, taskDocuments, finalDocuments]);

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedFile(null);
  };

  const handleCloseFileViewer = useCallback(() => {
    if (viewingFile.url) URL.revokeObjectURL(viewingFile.url);
    setViewingFile({ open: false, url: null, name: "", type: null });
  }, [viewingFile.url]);



  // Tự động tải lại danh sách file khi mở dialog Phê duyệt
  useEffect(() => {
    if (confirmActionDialog.open && confirmActionDialog.actionCode === 'GUI_PHE_DUYET') {
      refetchFiles();
    }
  }, [confirmActionDialog.open, confirmActionDialog.actionCode, refetchFiles]);

  const handleOpenDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(true);
    setAnchorEl(null);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(false);
  }, []);

  const handleViewFile = async () => {
    handleMenuClose();
    if (!selectedFile) return;

    if (selectedFile.type_file === 'link') {
      toast("Không thể xem trước link tài liệu. Vui lòng nhấn trực tiếp vào tên link để mở trang mới.", "warning");
      return;
    }

    const fileId = selectedFile.id || selectedFile._id;
    if (!fileId) {
      toast("File không hợp lệ.", "warning");
      return;
    }

    try {
      const response = await axiosInstance.get(`${API_VIEW_FILE}/${fileId}`, {
        responseType: "blob",
      });
      const blob = response; // Giả sử axiosInstance trả về data trực tiếp
      const objectUrl = URL.createObjectURL(blob);
      const fileName = selectedFile.file_name || selectedFile.name;
      const fileExtension = fileName?.split(".").pop().toLowerCase();
      let fileType = null;
      if (["jpg", "jpeg", "png", "gif"].includes(fileExtension)) {
        fileType = "image";
      } else if (fileExtension === "pdf") {
        fileType = "pdf";
      }

      setViewingFile({
        open: true,
        url: objectUrl,
        name: fileName,
        type: fileType,
      });
    } catch (error) {
      toast("Không thể tải file để xem trước.", "error");
    }
  };

  const handleDeleteFile = async () => {
    if (!selectedFile) return;
    const fileId = selectedFile.id || selectedFile._id;
    if (!fileId) return;

    try {
      if (selectedFile.type_file === 'link') {
        const idToDelete = selectedFile.id || selectedFile._id;
        await axiosInstance.delete(`${API_MERGE_LINK}/${idToDelete}`);
      } else {
        await axiosInstance.delete(`${APP_BASE}/api/files/${fileId}`);
      }
      toast("Xóa thành công!", "success");
      refetchFiles();
      setIsUpdated(true);
    } catch (error) {
      toast("Xóa thất bại!", "error");
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const handleDownloadFile = async () => {
    handleMenuClose();
    if (!selectedFile) return;

    if (selectedFile.type_file === 'link') {
      toast("Không thể tải xuống link tài liệu.", "warning");
      return;
    }

    const fileId = selectedFile.id || selectedFile._id;
    if (!fileId) return;

    try {
      setIsLoading(true);

      const isFolder = selectedFile?.type_file === 'Thư mục';
      const fileName = selectedFile.file_name || selectedFile.name;

      if (isFolder) {
        const blob = await axiosInstance.get(
          `${APP_BASE}/api/files/download-folder/${fileId}`,
          { responseType: 'blob' }
        );

        const url = window.URL.createObjectURL(
          new Blob([blob], { type: 'application/zip' })
        );

        const link = document.createElement('a');
        link.href = url;
        const downloadName = fileName.endsWith('.zip') ? fileName : `${fileName}.zip`;
        link.setAttribute('download', downloadName);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        const blob = await axiosInstance.get(
          `${APP_BASE}/api/files/download/${fileId}`,
          { responseType: 'blob' }
        );

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      toast("Tải xuống thất bại!", "error");
    }
  };

  const handleFileUpload = async (event, objectType) => {
    const files = Array.from(event.target.files);
    const id = currentTaskId;
    if (!files.length || !id) return;

    // === VALIDATION 1: Kiểm tra số lượng file/folder theo BATCH ===
    const isFolderUpload = files.some((f) => f.webkitRelativePath && f.webkitRelativePath.includes("/"));

    if (isFolderUpload) {
      // Kiểm tra giới hạn folder/lần
      const folderCount = new Set(files.map(f => f.webkitRelativePath.split('/')[0])).size;
      if (folderCount > UPLOAD_LIMITS_PER_BATCH.MAX_FOLDERS) {
        toast(`Chỉ được tải tối đa ${UPLOAD_LIMITS_PER_BATCH.MAX_FOLDERS} folder/lần`, "error");
        event.target.value = null;
        return;
      }
    } else {
      // Kiểm tra giới hạn file/lần
      if (files.length > UPLOAD_LIMITS_PER_BATCH.MAX_FILES) {
        toast(`Vượt quá ${UPLOAD_LIMITS_PER_BATCH.MAX_FILES} file/lần tải lên. Hiện tại: ${files.length} file`, "error");
        event.target.value = null;
        return;
      }
    }

    // === VALIDATION 2: Kiểm tra giới hạn theo CÔNG VIỆC ===
    // Tính tổng số đính kèm hiện có (cả taskDocuments và finalDocuments)
    const currentAttachments = [...taskDocuments, ...finalDocuments];
    const currentTotalCount = currentAttachments.length;

    // Tính tổng dung lượng hiện có
    const currentTotalSize = currentAttachments.reduce((sum, file) => {
      const fileSize = parseInt(file.file_size || 0, 10);
      return sum + fileSize;
    }, 0);

    // Tính dung lượng file mới
    const newFilesSize = files.reduce((sum, file) => sum + file.size, 0);

    // Tính số items mới (folder upload = 1 item, files = số lượng file)
    const newItemsCount = isFolderUpload ? 1 : files.length;

    // Kiểm tra tổng số đính kèm
    if (currentTotalCount + newItemsCount > UPLOAD_LIMITS_PER_TASK.MAX_ATTACHMENTS) {
      toast(
        `Vượt quá giới hạn ${UPLOAD_LIMITS_PER_TASK.MAX_ATTACHMENTS} đính kèm/công việc. ` +
        `Hiện tại: ${currentTotalCount}, Muốn thêm: ${newItemsCount}`,
        "error"
      );
      event.target.value = null;
      return;
    }

    // Kiểm tra tổng dung lượng
    if (currentTotalSize + newFilesSize > UPLOAD_LIMITS_PER_TASK.MAX_TOTAL_SIZE) {
      toast(
        `Vượt quá tổng dung lượng ${formatFileSize(UPLOAD_LIMITS_PER_TASK.MAX_TOTAL_SIZE)}/công việc. ` +
        `Hiện tại: ${formatFileSize(currentTotalSize)}, Muốn thêm: ${formatFileSize(newFilesSize)}`,
        "error"
      );
      event.target.value = null;
      return;
    }

    // === VALIDATION 3: Kiểm tra kích thước file/folder ===

    if (isFolderUpload) {
      // Kiểm tra tổng dung lượng folder
      const totalFolderSize = files.reduce((sum, file) => sum + file.size, 0);
      if (totalFolderSize > UPLOAD_LIMITS_PER_FOLDER.MAX_SIZE) {
        toast(
          `Folder vượt quá giới hạn ${formatFileSize(UPLOAD_LIMITS_PER_FOLDER.MAX_SIZE)}. ` +
          `Kích thước hiện tại: ${formatFileSize(totalFolderSize)}`
          , "error"
        );
        event.target.value = null;
        return;
      }

      // Kiểm tra số lượng file trong folder
      if (files.length > UPLOAD_LIMITS_PER_FOLDER.MAX_FILES) {
        toast(`Folder chứa quá nhiều file (${files.length}). Giới hạn: ${UPLOAD_LIMITS_PER_FOLDER.MAX_FILES} file`, "error");
        event.target.value = null;
        return;
      }

      // Kiểm tra từng file trong folder
      for (const file of files) {
        // Kiểm tra kích thước từng file
        if (file.size > UPLOAD_LIMITS_PER_FILE.MAX_SIZE) {
          toast(
            `File "${file.name}" vượt quá giới hạn ${formatFileSize(UPLOAD_LIMITS_PER_FILE.MAX_SIZE)}. ` +
            `Kích thước: ${formatFileSize(file.size)}`
            , "error"
          );
          event.target.value = null;
          return;
        }

        // Validate tên file
        const nameValidation = validateFileName(file.name);
        if (!nameValidation.valid) {
          toast(`File "${file.name}": ${nameValidation.message}`, "error");
          event.target.value = null;
          return;
        }

        // Validate extension
        const extValidation = validateFileExtension(file.name);
        if (!extValidation.valid) {
          toast(`File "${file.name}": ${extValidation.message}`, "error");
          event.target.value = null;
          return;
        }
      }
    } else {
      // Upload file đơn lẻ - kiểm tra từng file
      for (const file of files) {
        // Kiểm tra kích thước file
        if (file.size > UPLOAD_LIMITS_PER_FILE.MAX_SIZE) {
          toast(
            `File "${file.name}" vượt quá giới hạn ${formatFileSize(UPLOAD_LIMITS_PER_FILE.MAX_SIZE)}. ` +
            `Kích thước: ${formatFileSize(file.size)}`
            , "error"
          );
          event.target.value = null;
          return;
        }

        // Validate tên file
        const nameValidation = validateFileName(file.name);
        if (!nameValidation.valid) {
          toast(`File "${file.name}": ${nameValidation.message}`, "error");
          event.target.value = null;
          return;
        }

        // Validate extension
        const extValidation = validateFileExtension(file.name);
        if (!extValidation.valid) {
          toast(`File "${file.name}": ${extValidation.message}`, "error");
          event.target.value = null;
          return;
        }
      }
    }

    // Set loading state
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 0));

    try {
      if (isFolderUpload) {
        const createdFolders = {};

        for (const file of files) {
          const relativePath = file.webkitRelativePath;
          const pathParts = relativePath.split("/");
          const folderParts = pathParts.slice(0, -1);

          let parentId = null;
          let currentPath = "";

          for (const folderName of folderParts) {
            currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

            if (createdFolders[currentPath]) {
              parentId = createdFolders[currentPath];
            } else {
              // === XỬ LÝ TRÙNG TÊN FOLDER ===
              // Lấy danh sách tên folder hiện có (cùng parentId)
              const existingFoldersInParent = currentAttachments
                .filter(f => {
                  const isFolder = f.is_directory === 1 || f.type_file === 'Thư mục';
                  const folderParentId = f.parent_id?.toString() || null;
                  const targetParentId = parentId?.toString() || null;
                  return isFolder && folderParentId === targetParentId;
                })
                .map(f => f.file_name || f.name);

              // Kiểm tra và đổi tên nếu trùng
              let finalFolderName = folderName;
              if (existingFoldersInParent.includes(finalFolderName)) {
                finalFolderName = generateDuplicateName(finalFolderName, existingFoldersInParent);
              }

              const folderPayload = {
                objectType: objectType,
                objectId: id,
                name: finalFolderName,
                folderName: finalFolderName,
                parentId: parentId,
              };

              const response = await axiosInstance.post(`${APP_BASE}/api/files/folder`, folderPayload);
              const resData = response.data || response;
              const newFolderId = resData.id || resData._id;

              createdFolders[currentPath] = newFolderId;
              parentId = newFolderId;
            }
          }

          const formData = new FormData();

          // === XỬ LÝ TRÙNG TÊN FILE ===
          // Lấy danh sách tên file hiện có trong công việc (cùng parentId)
          const existingFilesInParent = currentAttachments
            .filter(f => {
              const fileParentId = f.parent_id?.toString() || null;
              const targetParentId = parentId?.toString() || null;
              return fileParentId === targetParentId;
            })
            .map(f => f.file_name || f.name);

          // Kiểm tra và đổi tên nếu trùng
          let finalFileName = file.name;
          if (existingFilesInParent.includes(finalFileName)) {
            finalFileName = generateDuplicateName(finalFileName, existingFilesInParent);
          }

          // Tạo File object mới với tên đã đổi (nếu cần)
          const fileToUpload = finalFileName !== file.name
            ? new File([file], finalFileName, { type: file.type })
            : file;

          formData.append("file", fileToUpload);
          formData.append("object_type", objectType);
          formData.append("object_id", id);
          formData.append("isUpdate", "true");
          if (parentId) {
            formData.append("parent_id", parentId);
          }

          await axiosInstance.post(`${APP_BASE}/api/files/upload`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
      } else {
        // Upload file đơn lẻ
        for (const file of files) {
          // === XỬ LÝ TRÙNG TÊN FILE ===
          // Lấy danh sách tên file hiện có (không có parent)
          const existingFilesAtRoot = currentAttachments
            .filter(f => !f.parent_id)
            .map(f => f.file_name || f.name);

          // Kiểm tra và đổi tên nếu trùng
          let finalFileName = file.name;
          if (existingFilesAtRoot.includes(finalFileName)) {
            finalFileName = generateDuplicateName(finalFileName, existingFilesAtRoot);
          }

          // Tạo File object mới với tên đã đổi (nếu cần)
          const fileToUpload = finalFileName !== file.name
            ? new File([file], finalFileName, { type: file.type })
            : file;

          const formData = new FormData();
          formData.append("file", fileToUpload);
          formData.append("object_type", objectType);
          formData.append("object_id", id);
          formData.append("isUpdate", "true");

          await axiosInstance.post(`${APP_BASE}/api/files/upload`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
      }
      toast("Tải lên tài liệu thành công!", "success");
      await refetchFiles();
      setIsUpdated(true);
    } catch (error) {
      toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
    } finally {
      setIsLoading(false);
      event.target.value = null;
    }
  };

  const handleTaskDocumentsUpload = (e) => handleFileUpload(e, "project");



  const handleOpenUpdateDialog = useCallback((type) => {
    setUpdateDialogState({ open: true, type });
  }, []);

  const handleOpenUpdateStatusDialog = useCallback(() => {
    handleOpenUpdateDialog('status');
  }, [handleOpenUpdateDialog]);

  const handleOpenUpdateGeneralDialog = useCallback(() => {
    handleOpenUpdateDialog('general');
  }, [handleOpenUpdateDialog]);

  const handleOpenUpdateParticipantsDialog = useCallback(() => {
    handleOpenUpdateDialog('participants');
  }, [handleOpenUpdateDialog]);

  const handleCloseUpdateDialog = () => {
    setUpdateDialogState({ open: false, type: null });
  };
  const handleLikeComment = useCallback(async (comment) => {
    const commentId = comment.id || comment._id;
    const taskId = currentTaskId;
    const isLiked = comment.userLiked;

    try {
      await dispatch(toggleCommentLike({ commentId, taskId, isLiked })).unwrap();
      toast(isLiked ? "Đã bỏ thích bình luận" : "Đã thích bình luận", "success");
    } catch (error) {
      toast("Thao tác thất bại", "error");
    }
  }, [dispatch, currentTaskId, toast]);

  const createLikeCommentHandler = useCallback((comment) => () => {
    handleLikeComment(comment);
  }, [handleLikeComment]);
  const handleDateChange = useCallback((onChange) => (date) => onChange(date), []);



  // const handleSaveUpdate = (updatedData) => {
  //   // Xử lý lưu dữ liệu cập nhật tại đây (gọi API, update state...)
  //   reset(updatedData);
  //   // Sau khi lưu thành công:
  //   handleCloseUpdateDialog();
  //   onSuccess?.();
  const handleSaveUpdate = useCallback(async (updatedData) => {
    try {
      const id = currentTaskId;
      const updateType = updateDialogState.type;
      setIsLoading(true);
      const payload = {
        ...updatedData,
        isUpdateStatus: updateType === 'status',
        isUpdateGeneralInfo: updateType === 'general',
        isUpdateParticipants: updateType === 'participants',
        isUpdateProcess: updateType === 'process',
      };

      await axiosInstance.patch(`${API_PROJECT_MANAGEMENT}/${id}`, payload);
      toast("Cập nhật dự án thành công!", "success");

      handleCloseUpdateDialog();
      fetchHistory();
      fetchJobDetail();
      setIsUpdated(true);
    } catch (error) {
      const data = error?.response?.data;
      const message = data?.message || "Cập nhật thất bại!";
      toast(message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [currentTaskId, updateDialogState.type, fetchHistory, fetchJobDetail, toast]);

  const handleSliderChange = useCallback((event, newValue) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    const normalized = Math.max(0, Math.min(100, Number(value) || 0));
    setValue("progress", normalized);
  }, [setValue]);

  const handleProgressChange = useCallback(async (event, newValue) => {
    const id = currentTaskId;
    if (!id) return;

    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    const normalized = Math.max(0, Math.min(100, Number(value) || 0));

    try {
      setIsLoading(true);
      await axiosInstance.patch(`${API_PROJECT_MANAGEMENT}/${id}`, {
        progress: normalized,
        isUpdateProcess: true,
      });
      toast("Cập nhật tiến độ thành công!", "success");
      fetchJobDetail();
      fetchHistory();
      setIsUpdated(true);
    } catch (error) {
      toast(error?.response?.data?.message || "Cập nhật tiến độ thất bại!", "error");
      setValue("progress", Number(displayData?.progress) || 0);
    } finally {
      setIsLoading(false);
    }
  }, [currentTaskId, displayData?.progress, fetchHistory, fetchJobDetail, setValue, toast]);

  // Reset khi mở và load data
  useEffect(() => {
    if (open && currentTaskId) {
      fetchJobDetail();
      refetchFiles();
      fetchHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentTaskId]);

  const handleTabChange = useCallback(async (event, newValue) => {
    if (visibleTabs[newValue]) {
      const nextTab = visibleTabs[newValue].key;
      const currentViewMode = nextTab === "kanban" ? "kanban" : null;
      setIsLoading(true);
      try {
        await Promise.all([
          fetchJobDetail(currentViewMode),
          refetchFiles(),
          fetchHistory()
        ]);
        if (currentTaskId) {
          dispatch(getCommentsByTask({ documentId: currentTaskId }));
        }
      } catch (error) {
        logger.error("Lỗi khi load lại dữ liệu chuyển tab:", error);
      } finally {
        setActiveTab(nextTab);
        setTimeout(() => {
          setIsLoading(false);
        }, 500); // Đợi tab render xong
      }
    }
  }, [visibleTabs, fetchJobDetail, refetchFiles, fetchHistory, currentTaskId, dispatch]);


  useEffect(() => {
    if (displayData) {
      const users = [];

      // Manager (Hỗ trợ array)
      if (displayData.managerId) {
        const managers = Array.isArray(displayData.managerId) ? displayData.managerId : [displayData.managerId];
        managers.forEach(m => {
          if (m) {
            users.push({
              id: m.userId || m.id || m._id,
              name: m.name
            });
          }
        });
      }

      // Members
      if (Array.isArray(displayData.members)) {
        displayData.members.forEach(m => {
          users.push({
            id: m.userId || m.id || m._id,
            name: m.name
          });
        });
      }

      // Viewers
      if (Array.isArray(displayData.viewers)) {
        displayData.viewers.forEach(v => {
          users.push({
            id: v.userId || v.id || v._id,
            name: v.name
          });
        });
      }

      // Lấy ID người dùng hiện tại để lọc bỏ
      const currentUserId = userData?._id || userData?.id || userData?.user?._id || userData?.user?.id;

      // Lọc bỏ trùng lặp dựa trên ID và lọc bỏ chính mình
      const uniqueUsers = users.reduce((acc, current) => {
        if (current.id && current.id !== currentUserId && !acc.some(u => u.id === current.id)) {
          acc.push(current);
        }
        return acc;
      }, []);

      setMentionUsers(uniqueUsers);
    }
  }, [displayData, userData]);


  useEffect(() => {
    if (currentTaskId) {
      dispatch(getCommentsByTask({ documentId: currentTaskId }));
      fecthDataReasonsDelayJob();
    }
  }, [dispatch, currentTaskId, fecthDataReasonsDelayJob]);

  const handleCommentChange = useCallback((e) => {
    const textarea = e.target;
    const value = textarea.value;
    setCommentText(value);
    setIsCommentMultiline(value.includes("\n") || value.length > 80);

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex !== -1 && (atIndex === 0 || /[\s\u200B]/.test(textBeforeCursor[atIndex - 1]))) {
      const searchTerm = textBeforeCursor.substring(atIndex + 1);
      if (!/\s/.test(searchTerm)) {
        setMentionSearchTerm(searchTerm);
        setMentionAnchorEl(textarea);
      } else {
        setMentionAnchorEl(null);
      }
    } else {
      setMentionAnchorEl(null);
    }
  }, []);

  const handleSelectMention = useCallback((user) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const currentValue = commentText;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = currentValue.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex !== -1) {
      const textAfterCursor = currentValue.substring(cursorPos);
      const newText =
        currentValue.substring(0, atIndex) +
        `@${user.name} ` +
        "\u200B" +
        textAfterCursor;
      setCommentText(newText);

      setMentionedIds((prevIds) => {
        const newIdSet = new Set(prevIds);
        newIdSet.add(user.id || user._id);
        return Array.from(newIdSet);
      });

      const newCursorPos = atIndex + user.name.length + 3;
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
    setMentionAnchorEl(null);
  }, [commentText]);

  const handleCloseMentionPopover = useCallback(() => {
    setMentionAnchorEl(null);
  }, []);

  const createSelectMentionHandler = useCallback((user) => () => handleSelectMention(user), [handleSelectMention]);

  const handleSendComment = useCallback(async () => {
    if (!commentText.trim()) return;
    const id = currentTaskId;
    if (!id) return;

    if (editingCommentId) {
      try {
        await dispatch(updateCommentInJob({
          documentId: id,
          commentId: editingCommentId,
          content: commentText
        })).unwrap();
        setCommentText("");
        setEditingCommentId(null);
        setMentionedIds([]);
        toast("Cập nhật bình luận thành công", "success");
      } catch (error) {
        toast("Cập nhật bình luận thất bại", "error");
      }
      return;
    }

    if (replyingToCommentId) {
      try {
        const user = userData?.user || userData;

        const replyData = {
          userId: user?._id,
          userName: user?.name,
          content: commentText,
          fileId: [],
          mentionIds: mentionedIds,
        };

        await dispatch(replyToCommentInJob({
          documentId: id,
          commentId: replyingToCommentId,
          replyData
        })).unwrap();

        setCommentText("");
        setReplyingToCommentId(null);
        setMentionedIds([]);
        toast("Trả lời bình luận thành công", "success");
      } catch (error) {
        toast("Trả lời bình luận thất bại", "error");
      }
      return;
    }

    const user = userData?.user || userData;

    const commentData = {
      userId: user?._id,
      userName: user?.name,
      content: commentText,
      fileId: [],
      mentionIds: mentionedIds,
      type: commentTab === 1 ? 'suggestion' : 'comment'
    };

    try {
      await dispatch(addCommentToJob({ documentId: currentTaskId, commentData })).unwrap();
      setCommentText("");
      setMentionedIds([]);
      toast("Gửi bình luận thành công", "success");
    } catch (error) {
      toast("Gửi bình luận thất bại", "error");
    }
  }, [commentText, currentTaskId, dispatch, toast, mentionedIds, editingCommentId, replyingToCommentId, userData, commentTab]);

  const handleCommentKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  }, [handleSendComment]);

  const formatCommentContent = (content) => {
    if (!content) return "";
    let formatted = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    formatted = formatted.replace(/(@[^@\u200B]+)\u200B/g, '<span style="color: #1976d2; font-weight: 500;">$1</span>');
    formatted = formatted.replace(/\n/g, "<br/>");
    return formatted;
  };

  // const onSubmit = (formData) => {
  //   console.log("Cập nhật công việc:", formData);
  //   onSuccess?.();
  // };





  return (
    <CustomSwipper
      title={'Chi tiết dự án'}
      open={open}
      onClose={handleCloseInternal}
      type="view" // hoặc "edit" tùy mode
      hideBackdrop
      moreActions={
        <JobMoreActionsContainer>
          {displayData?.availableActions?.map((action) => (
            <ButtonOutline
              key={action.code}
              variant="contained"
              data-code={action.code}
              data-label={action.label}
              data-type={action.type}
              onClick={handleActionClick}
            >
              {action.label}
            </ButtonOutline>
          ))}
        </JobMoreActionsContainer>
      }
    >
      <JobMainContent>
        <Box>
          <CustomTabsWithBadge
            tabs={visibleTabs.map(t => ({ label: t.label }))}
            value={visibleTabs.findIndex(t => t.key === activeTab) !== -1 ? visibleTabs.findIndex(t => t.key === activeTab) : 0}
            onChange={handleTabChange}
            scrollButtons={false}
          />
        </Box>

        {activeTab === "general" && (
          <>
            {/* HEADER: Tiến độ + Trạng thái - lấy giao diện từ ViewJob */}
            {/* HEADER: Tiến độ + Trạng thái - Responsive */}
            <ProjectHeaderWrapper mb={2}>
              <Grid container spacing={2}>
                {/* Cột trái: Tên dự án + subtext + progress */}
                <Grid item xs={12} md={8} lg={9.2}>
                  <ProjectHeaderContentBox>
                    {/* Tên dự án */}
                    <ProjectHeaderTitle>
                      {(() => {
                        const rawName = displayData?.name || data?.taskName || "";
                        // Dữ liệu bị lỗi (chứa thẻ HTML/SVG...) -> không hiện nguyên si, chờ sửa dữ liệu gốc
                        if (/<[^>]+>/.test(rawName)) {
                          return "";
                        }
                        return rawName;
                      })()}
                    </ProjectHeaderTitle>

                    {/* Mã dự án & Thời gian nhắc hạn & Tổng mức đầu tư - wrap tốt trên mobile */}
                    <ProjectHeaderSubtext>
                      <span>Mã dự án: {displayData?.code || ""}</span>
                      <span className="dot">•</span>
                      <span>Thời gian nhắc hạn: {displayData?.reminderDays || 0}</span>
                    </ProjectHeaderSubtext>

                    <ProjectHeaderSubtext>
                      <span>
                        Tổng mức đầu tư: {displayData?.totalBudgetFormat || "0"}
                      </span>
                    </ProjectHeaderSubtext>

                    {/* Tiến độ tổng thể */}
                    <ProjectHeaderProgressWrapper>
                      <ProjectHeaderProgressLabel>
                        Tiến độ tổng thể
                      </ProjectHeaderProgressLabel>
                      <ProjectHeaderProgressPercent>
                        {progress}%
                      </ProjectHeaderProgressPercent>
                    </ProjectHeaderProgressWrapper>
                    <Box>
                      <Controller
                        name="progress"
                        control={control}
                        render={({ field }) => (
                          <JobSlider
                            $colr={displayData?.progressColor}
                            {...field}
                            value={typeof field?.value === "number" ? field?.value : 0}
                            onChange={handleSliderChange}
                            onChangeCommitted={handleProgressChange}
                            disabled
                            aria-label="Progress"
                            valueLabelDisplay="auto"
                          />
                        )}
                      />
                    </Box>
                  </ProjectHeaderContentBox>
                </Grid>

                {/* Cột phải: Trạng thái + ngày + độ ưu tiên */}
                <Grid item xs={12} md={4} lg={2.8}>
                  <JobStatusBox styledMargin="right" fullHeight>
                    {/* Tiêu đề */}
                    <ProjectStatusCardTitle>
                      Trạng thái dự án
                    </ProjectStatusCardTitle>

                    {/* Status pill + nút edit */}
                    <ProjectStatusPillRow>
                      <ProjectStatusPillBadge>
                        <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(watch("status")) }} />
                      </ProjectStatusPillBadge>
                      {flags?.isStatus && !isProjectCompletedOrCancelled && (
                        <ProjectStatusEditBtn size="small" onClick={handleOpenUpdateStatusDialog}>
                          <JobStatusEditIcon />
                        </ProjectStatusEditBtn>
                      )}
                    </ProjectStatusPillRow>

                    {/* Ngày bắt đầu & Ngày kết thúc - luôn 2 cột */}
                    <JobStatusDatesRow>
                      <JobStatusDateItem>
                        <JobStatusDateLabel variant="caption">Ngày bắt đầu</JobStatusDateLabel>
                        <JobStatusDateValue variant="body1">
                          {displayData?.startDate ? dayjs(displayData.startDate).format("DD/MM/YYYY") : "N/A"}
                        </JobStatusDateValue>
                      </JobStatusDateItem>
                      <JobStatusDateItem>
                        <JobStatusDateLabel variant="caption">Ngày dự kiến kết thúc</JobStatusDateLabel>
                        <JobStatusDateValue variant="body1">
                          {displayData?.endDate ? dayjs(displayData.endDate).format("DD/MM/YYYY") : "N/A"}
                        </JobStatusDateValue>
                      </JobStatusDateItem>
                    </JobStatusDatesRow>

                    {/* Độ ưu tiên */}
                    <Box>
                      <ProjectStatusDateLabel>Độ ưu tiên</ProjectStatusDateLabel>
                      <ProjectStatusPriorityRow>
                        <ProjectStatusPriorityBadge>!</ProjectStatusPriorityBadge>
                        <ProjectStatusPriorityValue>
                          {urgencyOptions.find(o => o.value === watch("priority"))?.title || watch("priority") || "Bình thường"}
                        </ProjectStatusPriorityValue>
                      </ProjectStatusPriorityRow>
                    </Box>
                  </JobStatusBox>
                </Grid>
              </Grid>
            </ProjectHeaderWrapper>



            <StyledBoxContainerContent>

              <JobSectionHeaderWrapper>
                <JobSectionHeaderLeft>
                  <StyledIconWrapper>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2.53027 16.6411L2.53027 3.36109C2.53027 2.7007 2.7928 2.06756 3.25977 1.60059C3.72673 1.13362 4.35988 0.871094 5.02027 0.871094L12.4903 0.871094L12.5721 0.875144C12.7622 0.893977 12.9409 0.978023 13.0771 1.11426L17.2271 5.26426C17.3828 5.41992 17.4703 5.63096 17.4703 5.85109L17.4703 16.6411C17.4703 17.3015 17.2077 17.9346 16.7408 18.4016C16.2738 18.8686 15.6407 19.1311 14.9803 19.1311L5.02027 19.1311C4.35988 19.1311 3.72673 18.8686 3.25977 18.4016C2.7928 17.9346 2.53027 17.3014 2.53027 16.6411ZM4.19027 16.6411C4.19027 16.8612 4.27778 17.0723 4.43344 17.2279C4.5891 17.3836 4.80014 17.4711 5.02027 17.4711L14.9803 17.4711C15.2004 17.4711 15.4115 17.3836 15.5671 17.2279C15.7228 17.0723 15.8103 16.8612 15.8103 16.6411L15.8103 6.19476L12.1466 2.53109L5.02027 2.53109C4.80014 2.53109 4.5891 2.6186 4.43344 2.77426C4.27778 2.92992 4.19027 3.14096 4.19027 3.36109L4.19027 16.6411Z" fill="#2364B0" />
                      <path d="M10.8506 5.00156L10.8506 1.68156C10.8506 1.22317 11.2222 0.851563 11.6806 0.851563C12.139 0.851563 12.5106 1.22317 12.5106 1.68156L12.5106 5.00156C12.5106 5.22169 12.5981 5.43274 12.7538 5.5884C12.9094 5.74406 13.1205 5.83156 13.3406 5.83156L16.6606 5.83156C17.119 5.83156 17.4906 6.20317 17.4906 6.66156C17.4906 7.11995 17.119 7.49156 16.6606 7.49156L13.3406 7.49156C12.6802 7.49156 12.047 7.22903 11.5801 6.76207C11.1131 6.2951 10.8506 5.66195 10.8506 5.00156Z" fill="#2364B0" />
                      <path d="M8.32984 6.67188C8.78825 6.67188 9.15984 7.04348 9.15984 7.50187C9.15984 7.96027 8.78825 8.33187 8.32984 8.33187H6.66984C6.21145 8.33187 5.83984 7.96027 5.83984 7.50187C5.83984 7.04348 6.21145 6.67188 6.66984 6.67188L8.32984 6.67188Z" fill="#2364B0" />
                      <path d="M13.3206 10C13.779 10 14.1506 10.3716 14.1506 10.83C14.1506 11.2884 13.779 11.66 13.3206 11.66L6.68059 11.66C6.22219 11.66 5.85059 11.2884 5.85059 10.83C5.85059 10.3716 6.22219 10 6.68059 10L13.3206 10Z" fill="#2364B0" />
                      <path d="M13.3206 13.3398C13.779 13.3398 14.1506 13.7114 14.1506 14.1698C14.1506 14.6283 13.779 14.9998 13.3206 14.9998L6.68059 14.9998C6.22219 14.9998 5.85059 14.6283 5.85059 14.1698C5.85059 13.7114 6.22219 13.3398 6.68059 13.3398L13.3206 13.3398Z" fill="#2364B0" />
                    </svg>
                  </StyledIconWrapper>
                  <JobSectionTitle variant="h6" mt={0}>
                    THÔNG TIN CHUNG
                  </JobSectionTitle>
                  <StyledToggleButton
                    variant="outlined"
                    size="small"
                    onClick={handleToggleExpandedGeneralInfo}
                  >
                    {isExpandedGeneralInfo ? "Thu gọn" : "Xem thêm"}
                  </StyledToggleButton>
                </JobSectionHeaderLeft>
                {flags?.isGeneralInfo && !isProjectCompletedOrCancelled && (
                  <JobActionOutlineButton
                    startIcon={<svg width="14" height="13" viewBox="0 0 14 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.7098 11.3555C13.0798 11.3555 13.3798 11.6554 13.3798 12.0255C13.3798 12.3955 13.0798 12.6955 12.7098 12.6955L6.67977 12.6955C6.30972 12.6955 6.00977 12.3955 6.00977 12.0255C6.00977 11.6554 6.30972 11.3555 6.67977 11.3555L12.7098 11.3555Z" fill="#17191C" />
                      <path d="M11.3894 2.09244C11.3894 1.89298 11.31 1.70156 11.169 1.5605C11.0456 1.43712 10.8837 1.36107 10.7116 1.34393L10.637 1.34C10.4624 1.34 10.2939 1.40042 10.1601 1.51011L10.1051 1.5605L2.05788 9.60769C1.99806 9.66745 1.95 9.738 1.91655 9.81512L1.88841 9.89364L1.49714 11.231L2.83518 10.841L2.915 10.8123C2.99208 10.7788 3.06266 10.7313 3.12242 10.6716L11.169 2.62438L11.2187 2.56877C11.3283 2.43497 11.3894 2.26693 11.3894 2.09244ZM12.7294 2.09244C12.7294 2.61267 12.5353 3.11279 12.1877 3.49656L12.1164 3.5718L4.06984 11.619C3.86058 11.8283 3.60788 11.9881 3.33048 12.0882L3.21075 12.1274L1.28646 12.6887C1.11356 12.7392 0.930293 12.7426 0.755825 12.6979C0.581343 12.6532 0.42193 12.5623 0.294543 12.4349C0.167163 12.3075 0.0762371 12.1481 0.0315146 11.9737C-0.0131677 11.7992 -0.0103403 11.6159 0.0400236 11.443L0.602067 9.51871L0.641322 9.39831C0.741487 9.12133 0.901389 8.86921 1.11046 8.66024L9.15768 0.613077L9.23292 0.541099C9.6167 0.193664 10.1169 0 10.637 0L10.741 0.00261303C11.2581 0.0283343 11.7486 0.245294 12.1164 0.613077C12.5087 1.00544 12.7294 1.53759 12.7294 2.09244Z" fill="#17191C" />
                    </svg>
                    }
                    onClick={handleOpenUpdateGeneralDialog}
                  >
                    Chỉnh sửa
                  </JobActionOutlineButton>
                )}
              </JobSectionHeaderWrapper>

              <JobSectionDivider />

              <Grid container spacing={isViewMode ? 1.5 : 2} mb={2}>
                {isExpandedGeneralInfo && (
                  <>
                    {/* Dòng 1: Tên dự án (8) + Ngày bắt đầu (4) */}
                    <Grid item xs={12} md={8}>
                      <Controller
                        name="taskName"
                        control={control}
                        render={({ field }) => (
                          <InputComponents label="TÊN DỰ ÁN, HẠNG MỤC ĐẦU TƯ" {...field} disabled={isViewMode} />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Controller
                        name="startDate"
                        control={control}
                        render={({ field }) => (
                          <DateTimePicker
                            label="NGÀY BẮT ĐẦU"
                            value={field.value}
                            onChange={handleDateChange(field.onChange)}
                            showTime
                            disabled
                          />
                        )}
                      />
                    </Grid>

                    {/* Dòng 2: Quy trình (4) + Loại dự án (4) + Hạn kết thúc (4) */}
                    <Grid item xs={12} md={4}>
                      <Controller
                        name="process"
                        control={control}
                        render={({ field }) => (
                          <InputComponents
                            select
                            label="QUY TRÌNH"
                            {...field}
                            options={optionTypeOfProcess}
                            customLabel="title"
                            customValue="value"
                            disabled={isViewMode}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Controller
                        name="typeProject"
                        control={control}
                        render={({ field }) => (
                          <InputComponents
                            select
                            label="LOẠI DỰ ÁN"
                            {...field}
                            options={topicOptions}
                            customLabel="title"
                            customValue="value"
                            disabled
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Controller
                        name="endDate"
                        control={control}
                        render={({ field }) => (
                          <DateTimePicker
                            label="HẠN KẾT THÚC"
                            value={field.value}
                            onChange={handleDateChange(field.onChange)}
                            showTime
                            disabled
                          />
                        )}
                      />
                    </Grid>

                    {/* Dòng 3: Độ ưu tiên (4) + Tổng mức đầu tư (4) + Nhắc hạn (2) + Mã dự án (2) */}
                    <Grid item xs={12} md={4}>
                      <Controller
                        name="priority"
                        control={control}
                        render={({ field }) => (
                          <InputComponents
                            select
                            label="ĐỘ ƯU TIÊN"
                            {...field}
                            options={urgencyOptions}
                            customLabel="title"
                            customValue="value"
                            disabled={isViewMode}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <InputComponents
                        label="TỔNG MỨC ĐẦU TƯ"
                        value={displayData?.totalBudgetFormat || ""}
                        disabled
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <Controller
                        name="reminderDays"
                        control={control}
                        render={({ field }) => (
                          <InputComponents
                            select
                            label="THỜI GIAN NHẮC HẠN"
                            options={timeOptions}
                            customLabel="title"
                            customValue="value"
                            {...field}
                            disabled={isViewMode}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <Controller
                        name="code"
                        control={control}
                        render={({ field }) => (
                          <InputComponents label="MÃ DỰ ÁN" {...field} disabled />
                        )}
                      />
                    </Grid>
                  </>
                )}

                {/* Dòng 4: Mô tả (12) */}
                <Grid item xs={12}>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => {
                      if (isViewMode) {
                        return (
                          <AbstractSummaryBox>
                            <StyledInfoIcon />
                            <AbstractSummaryContent>
                              <AbstractSummaryTitle>MÔ TẢ</AbstractSummaryTitle>
                              <AbstractSummaryText>
                                {field.value || ""}
                              </AbstractSummaryText>
                            </AbstractSummaryContent>
                          </AbstractSummaryBox>
                        );
                      }
                      return (
                        <InputComponents
                          label="MÔ TẢ CHI TIẾT/ TRÍCH YẾU"
                          multiline
                          rows={5}
                          {...field}
                          disabled={isViewMode}
                        />
                      );
                    }}
                  />
                </Grid>
              </Grid>
            </StyledBoxContainerContent>

            <StyledBoxContainerContent styledMarginTop>
              <JobSectionHeader>
                <SkyFlexGap8 >
                  <StyledIconWrapper>
                    <StytedPeopleIcon />
                  </StyledIconWrapper>
                  <JobSectionTitle variant="h6" gutterBottom mb={0} >
                    NGƯỜI THAM GIA
                  </JobSectionTitle>
                </SkyFlexGap8>
                {flags?.isParticipants && !isProjectCompletedOrCancelled && (
                  <JobActionOutlineButton
                    startIcon={<svg width="14" height="13" viewBox="0 0 14 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.7098 11.3555C13.0798 11.3555 13.3798 11.6554 13.3798 12.0255C13.3798 12.3955 13.0798 12.6955 12.7098 12.6955L6.67977 12.6955C6.30972 12.6955 6.00977 12.3955 6.00977 12.0255C6.00977 11.6554 6.30972 11.3555 6.67977 11.3555L12.7098 11.3555Z" fill="#17191C" />
                      <path d="M11.3894 2.09244C11.3894 1.89298 11.31 1.70156 11.169 1.5605C11.0456 1.43712 10.8837 1.36107 10.7116 1.34393L10.637 1.34C10.4624 1.34 10.2939 1.40042 10.1601 1.51011L10.1051 1.5605L2.05788 9.60769C1.99806 9.66745 1.95 9.738 1.91655 9.81512L1.88841 9.89364L1.49714 11.231L2.83518 10.841L2.915 10.8123C2.99208 10.7788 3.06266 10.7313 3.12242 10.6716L11.169 2.62438L11.2187 2.56877C11.3283 2.43497 11.3894 2.26693 11.3894 2.09244ZM12.7294 2.09244C12.7294 2.61267 12.5353 3.11279 12.1877 3.49656L12.1164 3.5718L4.06984 11.619C3.86058 11.8283 3.60788 11.9881 3.33048 12.0882L3.21075 12.1274L1.28646 12.6887C1.11356 12.7392 0.930293 12.7426 0.755825 12.6979C0.581343 12.6532 0.42193 12.5623 0.294543 12.4349C0.167163 12.3075 0.0762371 12.1481 0.0315146 11.9737C-0.0131677 11.7992 -0.0103403 11.6159 0.0400236 11.443L0.602067 9.51871L0.641322 9.39831C0.741487 9.12133 0.901389 8.86921 1.11046 8.66024L9.15768 0.613077L9.23292 0.541099C9.6167 0.193664 10.1169 0 10.637 0L10.741 0.00261303C11.2581 0.0283343 11.7486 0.245294 12.1164 0.613077C12.5087 1.00544 12.7294 1.53759 12.7294 2.09244Z" fill="#17191C" />
                    </svg>
                    }
                    onClick={handleOpenUpdateParticipantsDialog}
                  >
                    Chỉnh sửa
                  </JobActionOutlineButton>
                )}
              </JobSectionHeader>

              <Grid container rowSpacing={3} columnSpacing={3} mb={4}>
                <Grid item xs={12} md={4}>
                  <WrappedCustomAsyncAutoComplete
                    limitTags={2}
                    options={
                      (Array.isArray(displayData?.managerId)
                        ? displayData.managerId
                        : (displayData?.managerId || displayData?.manager ? [displayData.managerId || displayData.manager] : [])
                      ).map(m => m ? { ...m, _id: m.userId || m._id || m.id || m } : null).filter(Boolean)
                    }
                    value={
                      (Array.isArray(displayData?.managerId)
                        ? displayData.managerId
                        : (displayData?.managerId || displayData?.manager ? [displayData.managerId || displayData.manager] : [])
                      ).map(m => m ? { ...m, _id: m.userId || m._id || m.id || m } : null).filter(Boolean)
                    }
                    disabled
                    isMulti
                    optionValue="_id"
                    optionLabel="name"
                    optionSubLabel="parentName"
                    label="Quản lý dự án"
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <WrappedCustomAsyncAutoComplete
                    limitTags={2}
                    options={Array.isArray(displayData?.members) ? displayData.members : []}
                    value={Array.isArray(displayData?.members) ? displayData.members : []}
                    disabled
                    isMulti
                    optionValue="_id"
                    optionLabel="name"
                    optionSubLabel="parentName"
                    label="Thành viên dự án"
                    onClick={handleOpenDialogMembers}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <WrappedCustomAsyncAutoComplete
                    limitTags={2}
                    options={Array.isArray(displayData?.viewers) ? displayData.viewers : []}
                    value={Array.isArray(displayData?.viewers) ? displayData.viewers : []}
                    disabled
                    isMulti
                    optionValue="_id"
                    optionLabel="name"
                    optionSubLabel="parentName"
                    label="Người xem"
                  />
                </Grid>
              </Grid>
            </StyledBoxContainerContent>


            <SkyFlexGap8 mt={0.5}>
              <StyledIconWrapper noBg>
                <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g clipPath="url(#clip0_5038_8324)">
                    <path d="M2.53125 17.3143L2.53125 3.50028C2.53125 2.81333 2.79378 2.15473 3.26075 1.66898C3.72771 1.18324 4.36086 0.910156 5.02125 0.910156L12.4913 0.910156L12.5731 0.914369C12.7632 0.933959 12.9419 1.02138 13.0781 1.1631L17.2281 5.47997C17.3838 5.64189 17.4713 5.86142 17.4713 6.0904L17.4713 17.3143C17.4713 18.0013 17.2087 18.6598 16.7418 19.1456C16.2748 19.6313 15.6417 19.9044 14.9813 19.9044L5.02125 19.9044C4.36086 19.9044 3.72771 19.6313 3.26075 19.1456C2.79378 18.6598 2.53125 18.0012 2.53125 17.3143ZM4.19125 17.3143C4.19125 17.5432 4.27876 17.7628 4.43442 17.9247C4.59007 18.0866 4.80112 18.1776 5.02125 18.1776L14.9813 18.1776C15.2014 18.1776 15.4124 18.0866 15.5681 17.9247C15.7238 17.7628 15.8113 17.5432 15.8113 17.3143L15.8113 6.44789L12.1475 2.6369L5.02125 2.6369C4.80112 2.6369 4.59007 2.72793 4.43442 2.88985C4.27876 3.05176 4.19125 3.27129 4.19125 3.50028L4.19125 17.3143Z" fill="#2364B0" />
                    <path d="M10.8516 5.20359L10.8516 1.75009C10.8516 1.27327 11.2232 0.886719 11.6816 0.886719C12.14 0.886719 12.5116 1.27327 12.5116 1.75009L12.5116 5.20359C12.5116 5.43257 12.599 5.6521 12.7548 5.81402C12.9104 5.97594 13.1214 6.06696 13.3416 6.06696L16.6616 6.06696C17.12 6.06696 17.4916 6.45351 17.4916 6.93034C17.4916 7.40716 17.12 7.79371 16.6616 7.79371L13.3416 7.79371C12.6812 7.79371 12.048 7.52063 11.581 7.03488C11.1141 6.54914 10.8516 5.89053 10.8516 5.20359Z" fill="#2364B0" />
                    <path d="M8.33375 6.94141C8.79216 6.94141 9.16375 7.32796 9.16375 7.80478C9.16375 8.2816 8.79216 8.66815 8.33375 8.66815H6.67375C6.21536 8.66815 5.84375 8.2816 5.84375 7.80478C5.84375 7.32796 6.21536 6.94141 6.67375 6.94141L8.33375 6.94141Z" fill="#2364B0" />
                    <path d="M13.3216 10.4023C13.78 10.4023 14.1516 10.7889 14.1516 11.2657C14.1516 11.7426 13.78 12.1291 13.3216 12.1291L6.68156 12.1291C6.22317 12.1291 5.85156 11.7426 5.85156 11.2657C5.85156 10.7889 6.22317 10.4023 6.68156 10.4023L13.3216 10.4023Z" fill="#2364B0" />
                    <path d="M13.3216 13.8789C13.78 13.8789 14.1516 14.2654 14.1516 14.7423C14.1516 15.2191 13.78 15.6057 13.3216 15.6057L6.68156 15.6057C6.22317 15.6057 5.85156 15.2191 5.85156 14.7423C5.85156 14.2654 6.22317 13.8789 6.68156 13.8789L13.3216 13.8789Z" fill="#2364B0" />
                  </g>
                  <defs>
                    <clipPath id="clip0_5038_8324">
                      <rect width="20" height="20.8042" fill="white" />
                    </clipPath>
                  </defs>
                </svg>

              </StyledIconWrapper>
              <JobSectionTitle variant="h6" gutterBottom mb={0} mt={0}>
                TÀI LIỆU DỰ ÁN
              </JobSectionTitle>
            </SkyFlexGap8>

            <StyledBoxContainerContent>
              {/* TÀI LIỆU DỰ ÁN */}

              {displayData?.flags?.isFiles && (
                <JobButtonContainer>
                  <ButtonOutline startIcon={<svg width="17" height="8" viewBox="0 0 17 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7.35183 7.2L4.08435 7.2C2.95434 7.2 1.99126 6.84888 1.19508 6.14664C0.398905 5.4444 0.000545137 4.59552 5.5759e-07 3.6C-0.000544022 2.60448 0.397816 1.7556 1.19508 1.05336C1.99235 0.35112 2.95543 0 4.08435 0L7.35183 0V1.44L4.08435 1.44C3.40362 1.44 2.82501 1.65 2.3485 2.07C1.87199 2.49 1.63374 3 1.63374 3.6C1.63374 4.2 1.87199 4.71 2.3485 5.13C2.82501 5.55 3.40362 5.76 4.08435 5.76L7.35183 5.76V7.2ZM4.90122 4.32V2.88L11.4362 2.88L11.4362 4.32L4.90122 4.32ZM8.98556 7.2V5.76L12.253 5.76C12.9338 5.76 13.5124 5.55 13.9889 5.13C14.4654 4.71 14.7036 4.2 14.7036 3.6C14.7036 3 14.4654 2.49 13.9889 2.07C13.5124 1.65 12.9338 1.44 12.253 1.44L8.98556 1.44V0L12.253 0C13.383 0 14.3464 0.35112 15.1431 1.05336C15.9398 1.7556 16.3379 2.60448 16.3374 3.6C16.3368 4.59552 15.9385 5.44464 15.1423 6.14736C14.3461 6.85008 13.383 7.20096 12.253 7.2L8.98556 7.2Z" fill="#2364B0" />
                  </svg>
                  } disabled={!myPermissions?.uploadFiles} onClick={handleOpenLinkPopup}>
                    Thêm link
                  </ButtonOutline>
                  <ButtonOutline component="label" startIcon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 11.3617L0 8.68172C0 8.31168 0.299972 8.01172 0.67 8.01172C1.04003 8.01172 1.34 8.31168 1.34 8.68172L1.34 11.3617L1.34327 11.4278C1.35847 11.5812 1.42632 11.7255 1.53629 11.8354C1.66194 11.9611 1.8323 12.0317 2.01 12.0317L11.39 12.0317C11.5677 12.0317 11.7381 11.9611 11.8637 11.8354C11.9894 11.7098 12.06 11.5394 12.06 11.3617L12.06 8.68172C12.06 8.31168 12.36 8.01172 12.73 8.01172C13.1 8.01172 13.4 8.31168 13.4 8.68172L13.4 11.3617C13.4 11.8948 13.1881 12.4059 12.8111 12.7829C12.4342 13.1598 11.9231 13.3717 11.39 13.3717L2.01 13.3717C1.47691 13.3717 0.965818 13.1598 0.58887 12.7829C0.259096 12.4531 0.0555498 12.0207 0.00981557 11.5606L0 11.3617Z" fill="#2364B0" />
                    <path d="M9.62683 4.82611C9.89 4.61148 10.2779 4.62661 10.5232 4.87191C10.7685 5.11721 10.7837 5.50514 10.569 5.76832L10.5232 5.81931L7.17322 9.16931C6.91159 9.43101 6.48748 9.43101 6.22584 9.16931L2.87582 5.81931L2.83002 5.76832C2.61538 5.50514 2.63052 5.11721 2.87582 4.87191C3.12112 4.62661 3.50905 4.61148 3.77221 4.82611L3.82324 4.87191L6.69953 7.74817L9.57584 4.87191L9.62683 4.82611Z" fill="#2364B0" />
                    <path d="M6.03125 8.71L6.03125 0.67C6.03125 0.299972 6.33121 0 6.70125 0C7.07129 0 7.37125 0.299972 7.37125 0.67L7.37125 8.71C7.37125 9.08004 7.07129 9.38 6.70125 9.38C6.33121 9.38 6.03125 9.08004 6.03125 8.71Z" fill="#2364B0" />
                  </svg>
                  } disabled={!myPermissions?.uploadFiles}>
                    Tải file
                    <input type="file" hidden multiple onChange={handleTaskDocumentsUpload} />
                  </ButtonOutline>
                  <ButtonOutline component="label" startIcon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clipPath="url(#clip0_5038_8471)">
                      <path d="M0.632812 12.0247L0.632812 3.31469C0.632812 2.7816 0.844733 2.27051 1.22168 1.89356C1.59863 1.51661 2.10973 1.30469 2.64281 1.30469L5.2757 1.30469L5.40067 1.30861C5.69019 1.32665 5.97278 1.4074 6.22901 1.54547C6.52192 1.70332 6.77162 1.93104 6.9546 2.20893L7.49314 3.00651L7.49703 3.01305L7.54741 3.08045C7.60168 3.14387 7.66761 3.19671 7.74178 3.23617C7.84061 3.2888 7.95102 3.31575 8.06298 3.31469L13.3628 3.31469L13.5617 3.3245C14.0218 3.37024 14.4542 3.57378 14.7839 3.90356C15.1609 4.28051 15.3728 4.7916 15.3728 5.32469L15.3728 12.0247C15.3728 12.5578 15.1609 13.0689 14.7839 13.4458C14.407 13.8228 13.8959 14.0347 13.3628 14.0347L2.64281 14.0347C2.10973 14.0347 1.59863 13.8228 1.22168 13.4458C0.844733 13.0689 0.632812 12.5577 0.632812 12.0247ZM1.97281 12.0247C1.97281 12.2024 2.04345 12.3728 2.1691 12.4984C2.29475 12.6241 2.46512 12.6947 2.64281 12.6947L13.3628 12.6947C13.5405 12.6947 13.7109 12.6241 13.8365 12.4984C13.9622 12.3728 14.0328 12.2024 14.0328 12.0247L14.0328 5.32469C14.0328 5.14699 13.9622 4.97663 13.8365 4.85098C13.7266 4.741 13.5823 4.67316 13.4289 4.65796L13.3628 4.65469L8.06954 4.65469C7.73575 4.65683 7.40638 4.57609 7.11165 4.41914C6.81718 4.2623 6.56661 4.03426 6.38212 3.75634L5.8397 2.95286L5.83513 2.94632C5.77417 2.85375 5.69124 2.77778 5.59369 2.72517C5.52054 2.68575 5.44077 2.66017 5.3588 2.64992L5.2757 2.64469L2.64281 2.64469C2.46512 2.64469 2.29475 2.71533 2.1691 2.84098C2.04345 2.96663 1.97281 3.13699 1.97281 3.31469L1.97281 12.0247Z" fill="#2364B0" />
                      <path d="M9.38187 8.87881C9.53899 8.75067 9.77059 8.75971 9.91703 8.90616C10.0635 9.0526 10.0725 9.2842 9.94438 9.44132L9.91703 9.47176L7.91705 11.4717C7.76085 11.628 7.50765 11.628 7.35146 11.4717L5.35147 9.47176L5.32412 9.44132C5.19599 9.2842 5.20502 9.0526 5.35147 8.90616C5.49791 8.75971 5.72951 8.75067 5.88662 8.87881L5.91709 8.90616L7.63425 10.6233L9.35143 8.90616L9.38187 8.87881Z" fill="#2364B0" />
                      <path d="M7.23437 11.1999L7.23438 6.4C7.23438 6.17909 7.41345 6 7.63437 6C7.85529 6 8.03437 6.17909 8.03437 6.4L8.03437 11.1999C8.03437 11.4209 7.85529 11.5999 7.63437 11.5999C7.41345 11.5999 7.23437 11.4209 7.23437 11.1999Z" fill="#2364B0" />
                    </g>
                    <defs>
                      <clipPath id="clip0_5038_8471">
                        <rect width="16" height="16" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                  } disabled={!myPermissions?.uploadFiles}>
                    Tải thư mục
                    <input type="file" hidden multiple webkitdirectory="" onChange={handleTaskDocumentsUpload} />
                  </ButtonOutline>
                </JobButtonContainer>
              )}

              {/* Hiển thị FileTreeTable với cấu trúc cây */}
              <FileTreeTable
                data={taskDocuments}
                onFileMenuClick={handleDynamicFileMenuClick}
                MenuIcon={StyledMenuIcon}
                isView
                fileName={displayData?.name || data?.taskName}
                hideActionTitle
                sourceAsync
              />
            </StyledBoxContainerContent>


            <StyledBoxContainerContent styledMarginTop>
              <ProjectDisbursement data={displayData} />
            </StyledBoxContainerContent>

            <JobCommentGridContainer container spacing={1.875} styledMarginTop>
              <Comment
                organizedComments={organizedComments}
                createOpenCommentMenuHandler={createOpenCommentMenuHandler}
                formatCommentContent={formatCommentContent}
                createLikeCommentHandler={createLikeCommentHandler}
                createReplyCommentHandler={createReplyCommentHandler}
                commentText={commentText}
                handleCommentChange={handleCommentChange}
                handleCommentKeyPress={handleCommentKeyPress}
                textareaRef={textareaRef}
                isCommentMultiline={isCommentMultiline}
                handleSendComment={handleSendComment}
                fixedHeight="500px"
                onlyContent
                readOnly={commentTab === 1 && !isViewer}
                emptyText={commentTab === 1 && organizedComments.length === 0 ? "Chưa có góp ý trong dự án" : undefined}
                customHeader={
                  <StyledTabHeaderWrapper mb={1.5}>
                    <SegmentedControlContainer>
                      <SegmentedControlButton
                        active={commentTab === 0}
                        onClick={handleSelectCommentTab}
                      >
                        <StyledChatBubbleOutlineOutlined />
                        THẢO LUẬN & BÌNH LUẬN
                      </SegmentedControlButton>
                      <SegmentedControlButton
                        active={commentTab === 1}
                        onClick={handleSelectSuggestionTab}
                      >
                        <StyledChatBubbleOutlineOutlined />
                        GÓP Ý
                      </SegmentedControlButton>
                    </SegmentedControlContainer>
                  </StyledTabHeaderWrapper>
                }
              />
              <Grid item xs={12} md={6}>
                <StyledTabHeaderWrapper mb={1.5}>
                  <StyledIconWrapper>
                    <svg width="18" height="17" viewBox="0 0 18 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8.56346 0.0273438C10.2525 0.0273438 11.9036 0.51433 13.308 1.42635C14.7124 2.33835 15.8074 3.63425 16.4538 5.15081C17.1001 6.66743 17.2687 8.33681 16.9392 9.94684C16.6096 11.5568 15.7966 13.0358 14.6024 14.1965C13.408 15.3572 11.8863 16.1474 10.2298 16.4677C8.57319 16.7879 6.85554 16.6241 5.29506 15.996C3.73465 15.3677 2.40127 14.3034 1.4629 12.9386C0.524506 11.5736 0.0234375 9.96892 0.0234375 8.32734C0.0234375 7.86893 0.405791 7.49734 0.877439 7.49734C1.34909 7.49734 1.73144 7.86893 1.73144 8.32734C1.73144 9.64065 2.13246 10.9242 2.88317 12.0161C3.63385 13.1081 4.7006 13.959 5.94891 14.4615C7.19722 14.9641 8.57097 15.0962 9.89613 14.8401C11.2215 14.5839 12.4393 13.9514 13.3947 13.0228C14.3502 12.0942 15.0009 10.9106 15.2646 9.62256C15.5281 8.33465 15.3921 6.99951 14.875 5.78628C14.3579 4.57305 13.4824 3.53628 12.3589 2.80671C11.2359 2.07739 9.91577 1.68767 8.56516 1.68734C6.63736 1.69478 4.78713 2.42604 3.40108 3.7283L1.48124 5.59418C1.14774 5.91832 0.607139 5.91832 0.273634 5.59418C-0.059879 5.27005 -0.059879 4.74464 0.273634 4.42051L2.20347 2.5449L2.53957 2.24338C4.20157 0.825829 6.33899 0.0354943 8.56013 0.0273438H8.56346Z" fill="#2364B0" />
                      <path d="M0 0.83C0 0.371608 0.382354 0 0.854002 0C1.32565 0 1.708 0.371608 1.708 0.83L1.708 4.15L5.12401 4.15C5.59566 4.15 5.97801 4.52161 5.97801 4.98C5.97801 5.43839 5.59566 5.81 5.12401 5.81L0.854002 5.81C0.382354 5.81 0 5.43839 0 4.98L0 0.83Z" fill="#2364B0" />
                      <path d="M7.71875 4.16984C7.71875 3.71145 8.10109 3.33984 8.57275 3.33984C9.04442 3.33984 9.42675 3.71145 9.42675 4.16984L9.42675 7.80674L12.3708 9.23741L12.4466 9.27949C12.8123 9.50475 12.9505 9.96673 12.7527 10.3511C12.555 10.7355 12.0916 10.9055 11.6869 10.7563L11.6068 10.7223L8.19076 9.06228C7.90151 8.92168 7.71875 8.63425 7.71875 8.31984L7.71875 4.16984Z" fill="#2364B0" />
                    </svg>


                  </StyledIconWrapper>
                  <JobSectionTitle variant="h6" gutterBottom mb={0} >
                    LỊCH SỬ HOẠT ĐỘNG
                  </JobSectionTitle>
                </StyledTabHeaderWrapper>
                <StyledBoxContainerContent fixedHeight="500px" flexColumn>
                  <HistoryJob
                    historyData={historyData}
                    createHandleNoteClick={createHandleNoteClick}
                  />
                </StyledBoxContainerContent>
              </Grid>
            </JobCommentGridContainer>

            {flags.isSlowReason && (
              <Grid container spacing={1.875} mb={1}>
                <Grid item xs={12} md={6}>
                  <ReasonsDelayJob reasons={dataReasonsDelay} currentTaskId={currentTaskId} fecthDataReasonsDelayJob={fecthDataReasonsDelayJob} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <SolutionToFix currentTaskId={currentTaskId} />
                </Grid>
              </Grid>
            )}
          </>
        )}

        {activeTab === "work" && (
          <JobProject
            currentTaskId={currentTaskId}
            displayData={displayData}
            flags={flags}
            sharedComponents={sharedComponents}
            onSuccess={onSuccess}
            setIsUpdated={setIsUpdated}
            permissions={myPermissions}
            isProjectCompletedCancelledOrPaused={isProjectCompletedCancelledOrPaused}
          />
        )}

        {activeTab === "analysis" && flags.canAnalysis && (
          <AnalysisProject
            projectId={currentTaskId}
            sharedComponents={sharedComponents}
          />
        )}

        {activeTab === "permissions" && flags.canDecentralize && (
          <DecentralizationProject
            projectId={currentTaskId}
            userPermissions={myPermissions}
            sharedComponents={sharedComponents}
          />
        )}
      </JobMainContent>

      {/* Dialog cập nhật */}
      <UpdateJobDialog
        open={updateDialogState.open}
        onClose={handleCloseUpdateDialog}
        onSave={handleSaveUpdate}
        data={useMemo(() => {
          if (!updateDialogState.open) return {};
          return { ...watch(), id: currentTaskId };
        }, [updateDialogState.open, watch, currentTaskId])}
        type={updateDialogState.type}
        fetchJobDetail={fetchJobDetail}
      />

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedFile && !selectedFile.isFolder && selectedFile.type_file !== 'link' && (
          <MenuItem onClick={handleViewFile}>
            <StyledListItemIcon>
              <VisibilityOutlined />
            </StyledListItemIcon>
            <ListItemText>Xem</ListItemText>
          </MenuItem>
        )}
        {(isProjectManager || selectedFile?.is_uploader) && (
          <MenuItem onClick={handleOpenDeleteDialog}>
            <StyledListItemIcon>
              <DeleteOutline />
            </StyledListItemIcon>
            <ListItemText>Xóa</ListItemText>
          </MenuItem>
        )}
        {selectedFile && selectedFile.type_file !== 'link' && (
          <MenuItem onClick={handleDownloadFile}>
            <StyledListItemIcon>
              <DownloadOutlined />
            </StyledListItemIcon>
            <ListItemText>Tải xuống</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <Menu
        anchorEl={commentMenuAnchor}
        open={Boolean(commentMenuAnchor)}
        onClose={handleCloseCommentMenu}
      >
        {selectedCommentForMenu && dayjs().diff(dayjs(selectedCommentForMenu.createdAt), 'minute') <= 5 && (
          <MenuItem onClick={handleEditComment}>
            <StyledListItemIcon>
              <EditIcon />
            </StyledListItemIcon>
            <ListItemText>Chỉnh sửa</ListItemText>
          </MenuItem>
        )}
        {selectedCommentForMenu?.isCreated && (
          <MenuItem onClick={handleDeleteComment}>
            <StyledListItemIcon>
              <DeleteOutline />
            </StyledListItemIcon>
            <ListItemText>Xóa</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <CustomDialog
        open={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onSave={handleDeleteFile}
        title="Xác nhận xóa"
        type="delete"
        size="sm"
      >
        Bạn có muốn xóa không?
      </CustomDialog>

      <FileViewerDialog
        open={viewingFile.open}
        onClose={handleCloseFileViewer}
        fileUrl={viewingFile.url}
        fileName={viewingFile.name}
        fileType={viewingFile.type}
        title={`Xem file: ${viewingFile.name}`}
      />



      <Dialog
        open={confirmDeleteComment}
        onClose={handleCloseConfirmDeleteComment}
        onSave={handleConfirmDeleteComment}
        title="Xác nhận xóa bình luận"
        type="delete"
      >
        <Typography>Bạn có chắc chắn muốn xóa bình luận này không?</Typography>
      </Dialog>

      <Popover
        open={Boolean(mentionAnchorEl)}
        anchorEl={mentionAnchorEl}
        onClose={handleCloseMentionPopover}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        disableRestoreFocus
        PaperProps={{
          sx: mentionPopoverPaperStyle,
        }}
      >
        <List dense>
          {mentionUsers.filter((user) =>
            user.name
              ?.toLowerCase()
              .includes(mentionSearchTerm.toLowerCase())
          ).length > 0 ? (
            mentionUsers
              .filter((user) =>
                user.name
                  ?.toLowerCase()
                  .includes(mentionSearchTerm.toLowerCase())
              )
              .map((user) => (
                <ListItem
                  key={user.id || user._id}
                  component={Button}
                  onClick={createSelectMentionHandler(user)}
                  fullWidth
                >
                  <ListItemText primary={user.name} />
                </ListItem>
              ))
          ) : (
            <ListItem>
              <ListItemText primary="Không tìm thấy người dùng" />
            </ListItem>
          )}
        </List>
      </Popover>

      <Dialog
        open={confirmActionDialog.open}
        onClose={handleCloseConfirmAction}
        onSave={handleConfirmAction}
        title={confirmActionDialog.title}
        titleButton={confirmActionDialog.title}
      >
        <Box p={2}>
          <LocalInfoItem
            icon={<StyledDescriptionIcon />}
            label="Tên công việc"
            value={watch("taskName")}
          />
          <InputComponents

            multiline
            rows={4}
            placeholder="Nhập mô tả..."
            value={actionDescription}
            onChange={handleActionDescriptionChange}
          />
          {confirmActionDialog.actionCode === 'GUI_PHE_DUYET' && (
            <StyledApproveContent>
              <JobSectionTitle variant="h6" gutterBottom>
                TÀI LIỆU LIÊN QUAN
              </JobSectionTitle>
              {displayData?.flags?.canUpdateFolder && (
                <JobButtonContainer>
                  <ButtonOutline component="label" startIcon={<AttachFileIcon />}>
                    Tải File
                    <input type="file" hidden multiple onChange={handleTaskDocumentsUpload} />
                  </ButtonOutline>
                  <ButtonOutline component="label" startIcon={<FolderIcon />}>
                    Tải Folder
                    <input
                      type="file"
                      hidden
                      multiple
                      webkitdirectory=""
                      onChange={handleTaskDocumentsUpload} />
                  </ButtonOutline>
                </JobButtonContainer>
              )}
              <FileTreeTable
                data={taskDocuments}
                onFileMenuClick={handleDynamicFileMenuClick}
                MenuIcon={StyledMenuIcon}
                isView
                fileName={displayData?.name || data?.taskName}
              />
            </StyledApproveContent>
          )}
        </Box>


      </Dialog>
      <CustomDialog
        open={openNote.open}
        onClose={handleCloseNote}

        title="Lý do từ chối"
        type="view"
        size="sm"
      >
        <JobNoteContainer>{openNote.note}</JobNoteContainer>
      </CustomDialog>

      <CustomDialog
        open={isLinkPopupOpen}
        onClose={handleCloseLinkPopup}
        onSave={handleSaveLink}
        title="Gắn link tài liệu"
        titleButton="Lưu"
        disabled={!linkFormValues.name.trim() || !linkFormValues.link.trim() || !!linkErrors.link}
      >
        <SkyGrid container spacing={2}>
          <SkyGrid item xs={12}>
            <CustomInput
              label={<>Tên link <span style={{ color: 'red' }}>*</span></>}
              placeholder="Ví dụ: Báo cáo tháng 1"
              fullWidth
              value={linkFormValues.name}
              onChange={handleLinkNameChange}
              error={!!linkErrors.name}
              helperText={linkErrors.name}
            />
          </SkyGrid>
          <SkyGrid item xs={12}>
            <CustomInput
              label={<>Đường dẫn link <span style={{ color: 'red' }}>*</span></>}
              placeholder="Ví dụ: https://docs.google.com/document/d/..."
              fullWidth
              value={linkFormValues.link}
              onChange={handleLinkUrlChange}
              error={!!linkErrors.link}
              helperText={linkErrors.link}
            />
          </SkyGrid>
        </SkyGrid>
      </CustomDialog>

      <LoadingDialog open={isLoading} >
        <JobLoadingBox>
          <Typography>Đang tải dữ liệu...</Typography>
        </JobLoadingBox>
      </LoadingDialog>
      <PopupTableMembersProject
        open={openDialogMembers}
        onClose={handleCloseDialogMembers}

        dialogKey={openDialogMembers}
        initialSelectedUnits={userByOrganizationUnitsMembers}
        readOnly
      />
    </CustomSwipper>
  );
};

export default withSharedComponents(ViewsProject);