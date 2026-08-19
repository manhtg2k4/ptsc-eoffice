/* eslint-disable react/forbid-component-props */
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Grid,
  Typography,
  Button,
  Menu,
  MenuItem,
  // ListItemIcon,
  ListItemText,
  Popover,
  List,
  ListItem,
  InputAdornment,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { Controller, useForm } from "react-hook-form";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
// import DeleteIcon from "@mui/icons-material/Delete";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import LinkIcon from "@mui/icons-material/Link";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import withSharedComponents from "@components/WrapperComponent";
import CustomTable from "@components/CustomTable/CustomTableStatic";
import { DownloadOutlined, DeleteOutlined, VisibilityOutlined, FolderOutlined } from "@mui/icons-material";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import {
  JobButtonContainer,
  JobMainContent,
  JobSectionTitle,
  StyledBoxContainerContent,

  JobSectionHeader,
  JobSubTaskHeader,
  JobSubTaskTableContainer,
  JobSlider,
  StyledMenuIcon,
  // JobEditButton,
  JobSubTaskActionContainer,
  // StyledHistoryTableCell,
  mentionPopoverPaperStyle,
  JobDeleteButton,
  StyledListItemIcon,
  JobBreadcrumbContainer,
  JobBreadcrumbItem,
  JobBreadcrumbSeparator,
  JobHeaderWrapper,
  JobNoteContainer,
  UploadDropZone,
  JobCommentGridContainer,
  BoldSkyFormControlLabel,
  ParticipantInfoContainer,
  SkyFlexGap16Center,
  StytedDescriptionIcon,
  StyleLine,
  StytedPeopleIcon,
  StytedAppsIcon,
  StyledBoxContainerContentHeader,
  JobTitleText,
  JobSubtext,
  JobProgressLabel,
  JobProgressFlexContainer,
  JobProgressBarContainerHeader,
  JobProgressPercent,
  JobStatusBox,
  JobStatusTitle,
  JobStatusPillRow,
  JobStatusPill,
  JobStatusEditButton,
  JobStatusDatesRow,
  JobStatusDateItem,
  JobStatusDateLabel,
  JobStatusDateValue,
  JobStatusPriorityRow,
  JobStatusPriorityIcon,
  JobStatusEditIcon,
  StytedProgressWrapper,
  StytedHistoryIcon,
  JobPillOutlineButton,
  StyledCheckOutLineIcon,
  DocumentsGridItem,
  JobActionOutlineButton,
} from "./Job.styles";
import UpdateJobToMeeting from "./UpdateJobToMeeting";
import AddNewJob from "./AddNewJob";
import * as XLSX from "xlsx";
import FileTreeTable from "@components/FileTreeTable";
import axiosInstance from "@utils/axiosInstance";
import { API_ADD_COMMON_WORK, APP_BASE, API_GET_COMMON_WORK_DETAIL, API_GET_SUBTASKS, API_JOB_TO_MEETING, API_COMMON_WORK_COMMENTS, API_XLSX_TO_PDF, API_MERGE_LINK } from "@EnvironmentFile/constants/urlConfig";
import { apiUploadFile } from "@services/FileUpload/fileUpload";
import { useDispatch, useSelector } from "react-redux";
import { addCommentToJob, updateCommentInJob, deleteCommentInJob, replyToCommentInJob, toggleCommentLike, getCommentsByTask } from "@redux/slices/SharedCategory/managementUnitSlice";
import LoadingDialog from "@components/LoadingDialog";
import {
  UPLOAD_LIMITS_PER_FILE,
  UPLOAD_LIMITS_PER_FOLDER,
  UPLOAD_LIMITS_PER_BATCH,
  UPLOAD_LIMITS_PER_TASK,
  validateFileName,
  validateFileExtension,
  formatFileSize,
  generateDuplicateName,
  truncateFileName
} from "./constants";
import { StyledGridContainer } from "./AddJobToDocument";
import CustomInputBase from "@components/CustomInput/CustomInputBase";
import CustomDatePicker from "@components/CustomDatePicker";
import FormButton from "@components/FormButton";

import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import Comment from "./Comment";
import DateTimeRangePicker from "@components/CustomDateTimePicker/DateTimeRangePicker";
import ReasonsDelayJob from "./ReasonsDelayJob";
import HistoryJob from "./HistoryJob";
import FilePreviewDialog from "@components/UploadFile/components/FilePreviewDialog";
import api from "@services/api";
import ViewJob from "./ViewJob";
import ViewMeetingSchedule from "@pages/MeetingCalendar/components/ViewMeetingSchedule";
import { SkyFlexGap8, SkyTypography, SkyCheckbox, SkyBox, SkyTooltip } from "@styles/SkyStyles";
import DOMPurify from "dompurify";
// import { encodeHTML } from "@/utils/securityUtils";
import { AbstractSummaryBox, AbstractSummaryContent, AbstractSummaryText, AbstractSummaryTitle, StyledIconWrapper, StyledInfoIcon } from "@pages/ProjectManager/components/AddProject.styles";
import CustomSwipper from "@components/Swipper/BaseSwiper";
import withFormWrapper from "@components/common/FormWrapper";
import CustomAsyncAutoComplete from "@components/CustomAsyncAutoComplete";


const StyledDescriptionIcon = styled(MeetingRoomIcon)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

const ViewJobToMeeting = ({
  open,
  onClose,
  onSuccess,
  sharedComponents,
  title = "Chi tiết công việc từ cuộc họp",
  data, // Giả sử bạn truyền data công việc vào để hiển thị (mode view/edit)
  documentId,
  setReloadData,
  breadcrumbs: breadcrumbsProp,
}) => {

  const {
    InputComponents: BaseInput,
    ButtonOutline,
    toast,
    Dialog,
  } = sharedComponents;
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [isCommentMultiline, setIsCommentMultiline] = useState(false);
  const { commentsList } = useSelector((state) => state.unit);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [flags, setFlags] = useState({});

  const [openNote, setOpenNote] = useState({
    open: false,
    note: null,
  });

  const { dataUser: authUser } = useSelector((state) => state.auth || {});
  const userData = authUser || {};
  // const nameUser = userData?.name;

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

    const commentMap = {};
    const rootComments = [];

    // Tạo map để tra cứu nhanh và khởi tạo mảng children
    commentsList.forEach((cmt) => {
      const id = cmt.id || cmt._id;
      commentMap[id] = { ...cmt, children: [] };
    });

    // Xây dựng cây
    commentsList.forEach((cmt) => {
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
  }, [commentsList]);

  const isViewMode = !data?.editable; // Ví dụ: nếu không editable thì chỉ xem

  const {
    control,
    // handleSubmit,
    // formState: { errors },
    watch,
    reset,
    setValue,
  } = useForm({
    defaultValues: {
      taskName: data?.taskName,
      startDate: data?.startDate,
      deadline: data?.deadline,
      reminderTime: data?.reminderTime,
      priority: data?.priority,
      mode: data?.mode,
      repeatTask: data?.repeatTask,
      recurringMonth: data?.recurringMonth,
      recurringDay: data?.recurringDay,
      recurringTime: data?.recurringTime,
      description: data?.description,
      assigner: data?.assigner,
      leader: data?.leader,
      coordinators: data?.coordinators,
      viewers: data?.viewers,
      progress: data?.progress !== undefined ? parseFloat(data.progress) : 0, // Tiến độ
      status: data?.status, // Trạng thái
      templateName: data?.templateName,
      isApprovalRequired: !!data?.isApprovalRequired,
    },
  });

  // const repeatTask = watch("repeatTask");
  const progress = watch("progress") ?? 0;
  const parentName = watch("parentName");

  const [displayData, setDisplayData] = useState(data);
  const [isUpdated, setIsUpdated] = useState(false);
  // State cho dialog cập nhật
  const [updateDialogState, setUpdateDialogState] = useState({
    open: false,
    type: null, // 'general' | 'participants'
  });

  const [commentText, setCommentText] = useState("");
  const [isAddSubJobOpen, setIsAddSubJobOpen] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
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
  const { crmSource } = useSelector((state) => state.config);
  const urgencyOptions =
    crmSource.find((item) => item.code === "DOUUTIEN")?.data || [];
  const [mentionAnchorEl, setMentionAnchorEl] = useState(null);
  const [mentionSearchTerm, setMentionSearchTerm] = useState("");
  const [mentionUsers, setMentionUsers] = useState([]);
  const [mentionedIds, setMentionedIds] = useState([]);
  const textareaRef = React.useRef(null);
  const [confirmDeleteComment, setConfirmDeleteComment] = useState(false);
  const [selectedSubTasks, setSelectedSubTasks] = useState([]);
  const [confirmDeleteSubTask, setConfirmDeleteSubTask] = useState(false);

  const [commentMenuAnchor, setCommentMenuAnchor] = useState(null);
  const [selectedCommentForMenu, setSelectedCommentForMenu] = useState(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDraggingTask, setIsDraggingTask] = useState(false);
  const [isDraggingFinal, setIsDraggingFinal] = useState(false);

  const [linkPopupOpen, setLinkPopupOpen] = useState(false);
  const [linkSection, setLinkSection] = useState("task"); // 'task' or 'final'
  const [linkFormValues, setLinkFormValues] = useState({ documentName: "", documentUrl: "" });
  const [linkErrors, setLinkErrors] = useState({ documentName: "", documentUrl: "" });

  const [showMoreGeneral, setShowMoreGeneral] = useState(false);
  const showMore = () => {
    setShowMoreGeneral(!showMoreGeneral);
  }

  const validateURL = useCallback((url) => {
    const pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
      '(\\#[-a-z\\d__.~+%=&]*)?$', 'i'); // fragment locator
    return !!pattern.test(url.trim());
  }, []);

  const handleOpenLinkPopup = useCallback((section = "task") => {
    setLinkSection(section);
    setLinkPopupOpen(true);
    setLinkFormValues({ documentName: "", documentUrl: "" });
    setLinkErrors({ documentName: "", documentUrl: "" });
  }, []);

  const handleOpenTaskLinkPopup = useCallback(() => handleOpenLinkPopup("task"), [handleOpenLinkPopup]);
  const handleOpenFinalLinkPopup = useCallback(() => handleOpenLinkPopup("final"), [handleOpenLinkPopup]);

  const handleCloseLinkPopup = useCallback(() => {
    setLinkPopupOpen(false);
    setLinkErrors({ documentName: "", documentUrl: "" });
  }, []);

  const handleLinkNameChange = useCallback((e) => {
    setLinkFormValues(prev => ({ ...prev, documentName: e.target.value }));
    if (e.target.value.trim()) {
      setLinkErrors(prev => ({ ...prev, documentName: "" }));
    }
  }, []);

  const handleLinkUrlChange = useCallback((e) => {
    const url = e.target.value;
    setLinkFormValues(prev => ({ ...prev, documentUrl: url }));
    if (url.trim()) {
      if (validateURL(url)) {
        setLinkErrors(prev => ({ ...prev, documentUrl: "" }));
      } else {
        setLinkErrors(prev => ({ ...prev, documentUrl: "Đường dẫn tài liệu không hợp lệ." }));
      }
    } else {
      setLinkErrors(prev => ({ ...prev, documentUrl: "" }));
    }
  }, [validateURL]);

  // confirmAddSubJob được chuyển sang AddNewJob
  const [dataReasonsDelayJob, setDataReasonsDelayJob] = useState([]);
  const checkCanDeleteFile = selectedFile?.is_uploader === true;
  const [openSubTask, setOpenSubTask] = useState(false);
  const [subTaskData, setSubTaskData] = useState(null);

  const [openDialogMeeting, setOpenDialogMeeting] = useState(false);
  const [viewMeetingId, setViewMeetingId] = useState(null);



  useEffect(() => {
    if (open) {
      setIsUpdated(false);
    }
  }, [open]);

  const handleCloseInternal = () => {
    if (isUpdated) {
      onSuccess?.();
    }
    onClose();
    setReloadData?.(new Date() * 1);
  };

  const handleDateRangeChangeNoop = useCallback(() => { }, []);



  const fecthDataReasonsDelayJob = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await axiosInstance.get(
        `${API_COMMON_WORK_COMMENTS}/${currentTaskId}/comments`,
        {
          params: {
            filter: {
              type: "slowReason",
            },
          },
        }
      );
      setDataReasonsDelayJob(res);
      setIsLoading(false);
    } catch (error) {
      logger.error(error);
      setIsLoading(false);
      toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
    } finally {
      setIsLoading(false);
    }
  }, [currentTaskId, toast]);

  const handleOpenCommentMenu = (event, comment) => {
    setCommentMenuAnchor(event.currentTarget);
    setSelectedCommentForMenu(comment);
  };

  const handleCloseCommentMenu = () => {
    setCommentMenuAnchor(null);
    setSelectedCommentForMenu(null);
  };

  const handleReplyComment = useCallback((comment) => {
    // Giới hạn độ sâu reply - tối đa cấp 3 (level 0, 1, 2)
    // Nếu comment đang reply là cấp 3 trở lên, hãy reply cấp 2 thay vì cấp 3
    let targetComment = comment;

    if (comment.level >= 1) {
      // Tìm comment cha (level = 2) trong organizedComments
      const commentAtLevel2 = organizedComments.find((c) => {
        if (c.level === 1) {
          // Kiểm tra xem comment hiện tại có phải là con/cháu của c không
          const checkIfDescendant = (node, targetId) => {
            if ((node.id || node._id) === targetId) return true;
            if (node.children?.length > 0) {
              return node.children.some(child => checkIfDescendant(child, targetId));
            }
            return false;
          };
          return checkIfDescendant(c, comment.id || comment._id);
        }
        return false;
      });

      if (commentAtLevel2) {
        targetComment = commentAtLevel2;
      }
    }

    setReplyingToCommentId(targetComment.id || targetComment._id);
    setEditingCommentId(null);
    const authorName = targetComment.userName || "User";
    const mentionText = `@${authorName}\u200B `;
    setCommentText(mentionText);
    setIsCommentMultiline(false);

    // Thêm ID người được mention vào danh sách
    setMentionedIds((prevIds) => {
      const newIdSet = new Set(prevIds);
      newIdSet.add(targetComment.id || targetComment._id);
      return Array.from(newIdSet);
    });

    if (textareaRef.current) {
      textareaRef.current.focus();
      // Đặt cursor vào cuối text
      setTimeout(() => {
        textareaRef.current.setSelectionRange(mentionText.length, mentionText.length);
      }, 0);
    }
  }, [organizedComments]);

  const handleEditComment = () => {
    if (selectedCommentForMenu) {
      setCommentText(selectedCommentForMenu.content || "");
      setEditingCommentId(selectedCommentForMenu.id || selectedCommentForMenu._id);
      if (textareaRef.current) {
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
    const taskId = currentTaskId;
    if (commentId && taskId) {
      try {
        await dispatch(
          deleteCommentInJob({ documentId: taskId, commentId })
        ).unwrap();
        toast("Xóa bình luận thành công", "success");
      } catch (error) {
        toast("Xóa bình luận thất bại", "error");
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

  const handleCloseConfirmDelete = useCallback(() => {
    setConfirmDeleteSubTask(false);
  }, []);

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

  const [subTasksData, setSubTasksData] = useState({ items: [], parentType: null });

  const fetchSubTasksData = useCallback(async () => {
    if (!currentTaskId) return;
    try {
      const parentId = currentTaskId;
      const response = await axiosInstance.get(API_GET_SUBTASKS, {
        params: {
          parent: parentId,
        },
      });
      const responseData = response.data || response || {};
      const items = Array.isArray(responseData) ? responseData : (responseData.data || []);

      setSubTasksData({
        items,
        parentType: true,
      });
    } catch (error) {
      toast('Không thể tải danh sách công việc con!', 'error');
      setSubTasksData([]);
    }
  }, [currentTaskId, toast]);

  const handleCloseFileViewer = useCallback(() => {
    if (viewingFile.url) URL.revokeObjectURL(viewingFile.url);
    setViewingFile({ open: false, url: null, name: "", type: null });
  }, [viewingFile.url]);

  const refetchFiles = useCallback(async () => {
    if (!currentTaskId) return;
    const id = currentTaskId;
    try {
      const currentUserName = userData?.user?.name || userData?.name || "Người dùng";

      const [taskDocsRes, finalDocsRes, linksRes] = await Promise.all([
        axiosInstance.get(`${APP_BASE}/api/files/by-object?object_type=taskdocuments&object_id=${id}`),
        axiosInstance.get(`${APP_BASE}/api/files/by-object?object_type=finaldocuments&object_id=${id}`),
        axiosInstance.get(`${API_MERGE_LINK}?taskId=${id}`)
      ]);

      const taskDocsData = taskDocsRes?.data?.data || taskDocsRes?.data || taskDocsRes || [];
      const finalDocsData = finalDocsRes?.data?.data || finalDocsRes?.data || finalDocsRes || [];
      const linksDataRaw = linksRes?.data?.data || linksRes?.data || linksRes || [];

      const linksDataArray = Array.isArray(linksDataRaw) ? linksDataRaw : (linksDataRaw && typeof linksDataRaw === 'object' && Object.keys(linksDataRaw).length > 0 ? [linksDataRaw] : []);

      /* eslint-disable camelcase */
      const linksData = linksDataArray.map(l => ({
        ...l,
        name: l.documentName,
        file_name: l.documentName,
        type_file: 'link',
        id: l._id || l.id,
        is_uploader: !!l.isCreator,
        from_source: l.createdByName || l.userName || l.created_by_name || l.fullName || (l.isCreator ? currentUserName : ""),
        source_type: 'link'
      }));
      /* eslint-enable camelcase */

      setTaskDocuments(Array.isArray(taskDocsData) ? [...taskDocsData, ...linksData.filter(l => !l.objectType || l.objectType === 'taskdocuments')] : linksData.filter(l => !l.objectType || l.objectType === 'taskdocuments'));
      setFinalDocuments(Array.isArray(finalDocsData) ? [...finalDocsData, ...linksData.filter(l => l.objectType === 'finaldocuments')] : linksData.filter(l => l.objectType === 'finaldocuments'));
    } catch (error) {
      logger.error("Không thể tải danh sách tệp đính kèm.", error);
    }
  }, [currentTaskId]);

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
    const errors = { documentName: "", documentUrl: "" };
    let hasError = false;

    if (!linkFormValues.documentName.trim()) {
      errors.documentName = "Vui lòng nhập tên tài liệu";
      hasError = true;
    }
    if (!linkFormValues.documentUrl.trim()) {
      errors.documentUrl = "Vui lòng nhập đường dẫn tài liệu";
      hasError = true;
    } else if (!validateURL(linkFormValues.documentUrl)) {
      errors.documentUrl = "Đường dẫn tài liệu không hợp lệ.";
      hasError = true;
    }

    if (hasError) {
      setLinkErrors(errors);
      return;
    }
    const id = currentTaskId;
    if (!id) return;
    setIsLoading(true);
    try {
      await axiosInstance.post(API_MERGE_LINK, {
        taskId: String(id),
        documentName: linkFormValues.documentName,
        documentUrl: linkFormValues.documentUrl,
        objectType: linkSection === "task" ? "taskdocuments" : "finaldocuments"
      });
      toast("Gắn link thành công!", "success");
      refetchFiles();
      if (fetchHistory) fetchHistory();
      handleCloseLinkPopup();
    } catch (error) {
      toast("Gắn link thất bại!", "error");
    } finally {
      setIsLoading(false);
    }
  }, [linkFormValues, currentTaskId, toast, refetchFiles, fetchHistory, handleCloseLinkPopup, linkSection, validateURL]);



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
    const fileId = selectedFile.id || selectedFile._id;
    if (!fileId) {
      toast("File không hợp lệ.", "warning");
      return;
    }
    setIsLoading(true);
    try {

      const fileName = selectedFile.file_name || selectedFile.name;
      const lower = fileName.toLowerCase();

      const isDoc = /\.(doc|docx)$/i.test(lower);
      const isExcel = /\.(xls|xlsx)$/i.test(lower);
      const isPpt = /\.(ppt|pptx)$/i.test(lower);
      const isOtherOffice = isPpt;
      const isBrowserFile = /\.(pdf|jpeg|jpg|png|gif|webp|txt)$/i.test(lower);

      if (selectedFile?.id || selectedFile?._id) {

        const fileId = selectedFile._id || selectedFile.id;

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
            timeout: 0,
          });
          blob = new Blob([res.data], {
            type: res.headers["content-type"] || res.data.type,
          });
        } else if (isOtherOffice) {
          const viewUrl = `${APP_BASE}/api/files/view/${fileId}`;
          const res = await api.get(viewUrl, {
            responseType: "blob",
            timeout: 0,
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

        const url = URL.createObjectURL(blob);
        setViewingFile({
          open: true,
          url: url,
          name: previewName,

        });

      }


      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      toast("Không thể tải file để xem trước.", "error");
    }
  };

  const handleDeleteFile = async () => {
    if (!selectedFile) return;
    const fileId = selectedFile.id || selectedFile._id;
    if (!fileId) return;

    try {
      if (selectedFile?.type_file === 'link') {
        await axiosInstance.delete(`${API_MERGE_LINK}/${fileId}`);
        toast("Xóa link thành công!", "success");
      } else {
        await axiosInstance.delete(`${APP_BASE}/api/files/${fileId}`);
        toast("Xóa file thành công!", "success");
      }
      refetchFiles();
      if (fetchHistory) fetchHistory();
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

  const getFilesFromEntries = useCallback(async (items) => {
    const files = [];
    const readEntry = async (entry, path = "") => {
      if (entry.isFile) {
        const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
        try {
          Object.defineProperty(file, "webkitRelativePath", {
            value: path ? `${path}/${file.name}` : file.name,
            writable: false,
            configurable: true,
          });
        } catch (e) {
          file.customRelativePath = path ? `${path}/${file.name}` : file.name;
        }
        files.push(file);
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const entriesInDir = await new Promise((resolve, reject) => {
          let allEntries = [];
          const readMore = () => {
            dirReader.readEntries((results) => {
              if (results.length) {
                allEntries = allEntries.concat(results);
                readMore();
              } else {
                resolve(allEntries);
              }
            }, reject);
          };
          readMore();
        });
        for (const childEntry of entriesInDir) {
          await readEntry(childEntry, path ? `${path}/${entry.name}` : entry.name);
        }
      }
    };

    const entries = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry();
      if (entry) entries.push(entry);
    }

    for (const entry of entries) {
      await readEntry(entry);
    }
    return files;
  }, []);

  const processFilesUpload = useCallback(async (files, objectType) => {
    const id = currentTaskId;
    if (!files.length || !id) return;

    // === VALIDATION 1: Kiểm tra số lượng file/folder theo BATCH ===
    const isFolderUpload = files.some((f) => (f.webkitRelativePath && f.webkitRelativePath.includes("/")) || f.customRelativePath);

    if (isFolderUpload) {
      const folderPaths = files.map(f => (f.webkitRelativePath || f.customRelativePath).split('/')[0]);
      const folderCount = new Set(folderPaths).size;
      if (folderCount > UPLOAD_LIMITS_PER_BATCH.MAX_FOLDERS) {
        toast(`Chỉ được tải tối đa ${UPLOAD_LIMITS_PER_BATCH.MAX_FOLDERS} folder/lần`, "error");
        return;
      }
    } else {
      if (files.length > UPLOAD_LIMITS_PER_BATCH.MAX_FILES) {
        toast(`Vượt quá ${UPLOAD_LIMITS_PER_BATCH.MAX_FILES} file/lần tải lên. Hiện tại: ${files.length} file`, "error");
        return;
      }
    }

    // === VALIDATION 2: Kiểm tra giới hạn theo CÔNG VIỆC ===
    const allAttachments = [...taskDocuments, ...finalDocuments];
    const targetDocuments = objectType === "taskdocuments" ? taskDocuments : finalDocuments;

    const currentTotalCount = allAttachments.length;
    const currentTotalSize = allAttachments.reduce((sum, file) => sum + parseInt(file.file_size || 0, 10), 0);
    const newFilesSize = files.reduce((sum, file) => sum + file.size, 0);
    const newItemsCount = isFolderUpload ? 1 : files.length;

    if (currentTotalCount + newItemsCount > UPLOAD_LIMITS_PER_TASK.MAX_ATTACHMENTS) {
      toast(`Vượt quá giới hạn ${UPLOAD_LIMITS_PER_TASK.MAX_ATTACHMENTS} đính kèm/công việc.`, "error");
      return;
    }

    if (currentTotalSize + newFilesSize > UPLOAD_LIMITS_PER_TASK.MAX_TOTAL_SIZE) {
      toast(`Vượt quá tổng dung lượng ${formatFileSize(UPLOAD_LIMITS_PER_TASK.MAX_TOTAL_SIZE)}/công việc.`, "error");
      return;
    }

    // === VALIDATION 3: Kiểm tra kích thước file/folder ===
    if (isFolderUpload) {
      const totalFolderSize = files.reduce((sum, file) => sum + file.size, 0);
      if (totalFolderSize > UPLOAD_LIMITS_PER_FOLDER.MAX_SIZE) {
        toast(`Folder vượt quá giới hạn ${formatFileSize(UPLOAD_LIMITS_PER_FOLDER.MAX_SIZE)}.`, "error");
        return;
      }
      if (files.length > UPLOAD_LIMITS_PER_FOLDER.MAX_FILES) {
        toast(`Folder chứa quá nhiều file (${files.length}).`, "error");
        return;
      }
    }

    for (const file of files) {
      if (file.size > UPLOAD_LIMITS_PER_FILE.MAX_SIZE) {
        toast(`File "${truncateFileName(file.name, 20)}" vượt quá giới hạn.`, "error");
        return;
      }
      const nameValidation = validateFileName(file.name);
      if (!nameValidation.valid) {
        toast(`File "${file.name}": ${nameValidation.message}`, "error");
        return;
      }
      const extValidation = validateFileExtension(file.name);
      if (!extValidation.valid) {
        toast(`File "${file.name}": ${extValidation.message}`, "error");
        return;
      }
    }

    setIsLoading(true);
    try {
      if (isFolderUpload) {
        const createdFolders = {};
        for (const file of files) {
          const relativePath = file.webkitRelativePath || file.customRelativePath;
          const pathParts = relativePath.split("/");
          const folderParts = pathParts.slice(0, -1);
          let parentId = null;
          let currentPath = "";

          for (const folderName of folderParts) {
            currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
            if (createdFolders[currentPath]) {
              parentId = createdFolders[currentPath];
            } else {
              const existingFoldersInParent = targetDocuments
                .filter(f => (f.is_directory === 1 || f.type_file === 'Thư mục') && (f.parent_id?.toString() || null) === (parentId?.toString() || null))
                .map(f => f.file_name || f.name);

              let finalFolderName = folderName;
              if (existingFoldersInParent.includes(finalFolderName)) {
                finalFolderName = generateDuplicateName(finalFolderName, existingFoldersInParent);
              }

              const response = await axiosInstance.post(`${APP_BASE}/api/files/folder`, {
                objectType, objectId: id, name: finalFolderName, folderName: finalFolderName, parentId
              });
              const newFolderId = response.data?.id || response.data?._id || response.id || response._id;
              createdFolders[currentPath] = newFolderId;
              parentId = newFolderId;
            }
          }

          const existingFilesInParent = targetDocuments
            .filter(f => (f.parent_id?.toString() || null) === (parentId?.toString() || null))
            .map(f => f.file_name || f.name);

          let finalFileName = file.name;
          if (existingFilesInParent.includes(finalFileName)) {
            finalFileName = generateDuplicateName(finalFileName, existingFilesInParent);
          }
          const fileToUpload = finalFileName !== file.name ? new File([file], finalFileName, { type: file.type }) : file;

          const formData = new FormData();
          formData.append("file", fileToUpload);
          formData.append("object_type", objectType);
          formData.append("object_id", id);
          if (parentId) formData.append("parent_id", parentId);
          await axiosInstance.post(`${APP_BASE}/api/files/upload`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        }
      } else {
        for (const file of files) {
          const existingFilesAtRoot = targetDocuments.filter(f => !f.parent_id).map(f => f.file_name || f.name);
          let finalFileName = file.name;
          if (existingFilesAtRoot.includes(finalFileName)) {
            finalFileName = generateDuplicateName(finalFileName, existingFilesAtRoot);
          }
          const fileToUpload = finalFileName !== file.name ? new File([file], finalFileName, { type: file.type }) : file;
          await apiUploadFile(fileToUpload, objectType, id);
        }
      }
      toast("Tải lên tài liệu thành công!", "success");
      await refetchFiles();
      if (fetchHistory) fetchHistory();
      setIsUpdated(true);
    } catch (error) {
      toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
    } finally {
      setIsLoading(false);
    }
  }, [currentTaskId, taskDocuments, finalDocuments, toast, refetchFiles, fetchHistory]);

  const handleFileUpload = useCallback(async (event, objectType) => {
    const files = Array.from(event.target.files);
    await processFilesUpload(files, objectType);
    event.target.value = null;
  }, [processFilesUpload]);

  const handleTaskDocumentsUpload = useCallback((e) => handleFileUpload(e, "taskdocuments"), [handleFileUpload]);
  const handleFinalDocumentsUpload = useCallback((e) => handleFileUpload(e, "finaldocuments"), [handleFileUpload]);

  // === DRAG & DROP HANDLERS ===
  const handleDragOver = useCallback((e, setter) => {
    e.preventDefault();
    e.stopPropagation();
    setter(true);
  }, []);

  const handleDragLeave = useCallback((e, setter) => {
    e.preventDefault();
    e.stopPropagation();
    setter(false);
  }, []);

  const handleDrop = useCallback(async (e, objectType, setter) => {
    e.preventDefault();
    e.stopPropagation();
    setter(false);

    const items = e.dataTransfer.items;
    if (items) {
      const files = await getFilesFromEntries(items);
      if (files.length > 0) {
        await processFilesUpload(files, objectType);
      }
    }
  }, [getFilesFromEntries, processFilesUpload]);

  const handleDragOverTask = useCallback((e) => {
    if (displayData?.flags?.canUpdate) handleDragOver(e, setIsDraggingTask);
  }, [displayData?.flags?.canUpdate, handleDragOver]);

  const handleDragLeaveTask = useCallback((e) => {
    handleDragLeave(e, setIsDraggingTask);
  }, [handleDragLeave]);

  const handleDropTask = useCallback((e) => {
    if (displayData?.flags?.canUpdate) handleDrop(e, "taskdocuments", setIsDraggingTask);
  }, [displayData?.flags?.canUpdate, handleDrop]);

  const handleDragOverFinal = useCallback((e) => {
    if (displayData?.flags?.canUpdateFolder) handleDragOver(e, setIsDraggingFinal);
  }, [displayData?.flags?.canUpdateFolder, handleDragOver]);

  const handleDragLeaveFinal = useCallback((e) => {
    handleDragLeave(e, setIsDraggingFinal);
  }, [handleDragLeave]);

  const handleDropFinal = useCallback((e) => {
    if (displayData?.flags?.canUpdateFolder) handleDrop(e, "finaldocuments", setIsDraggingFinal);
  }, [displayData?.flags?.canUpdateFolder, handleDrop]);

  const handleOpenAddSubJob = () => {
    setIsAddSubJobOpen(true);
  };

  const handleResetParentProgress = async () => {
    const id = currentTaskId;
    await axiosInstance.patch(`${API_ADD_COMMON_WORK}/${id}`, { progress: "0" });
    fetchJobDetail();
  };

  const handleCloseAddSubJob = () => {
    setIsAddSubJobOpen(false);
  };

  const handleAddSubJobSuccess = () => {
    handleCloseAddSubJob();
    fetchSubTasksData();
    fetchJobDetail();
    if (fetchHistory) fetchHistory();
    setIsUpdated(true);
    // onSuccess?.(); // Không gọi lại onSuccess của component cha để tránh đóng màn hình chi tiết
  };

  const handleDeleteSubTasks = () => {
    setConfirmDeleteSubTask(true);
  };

  const handleConfirmDeleteSubTasks = async () => {
    try {
      setIsLoading(true);
      await axiosInstance.delete(API_ADD_COMMON_WORK, { data: { ids: selectedSubTasks } });
      toast("Xóa công việc con thành công!", "success");
      fetchSubTasksData();
      setSelectedSubTasks([]);
      setConfirmDeleteSubTask(false);
      if (fetchHistory) fetchHistory();
      setIsUpdated(true);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      toast(error?.response?.data?.message || "Xóa thất bại!", "error");
    }
  };

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
      setIsLoading(true);
      await dispatch(toggleCommentLike({ commentId, taskId, isLiked })).unwrap();
      toast(isLiked ? "Đã bỏ thích bình luận" : "Đã thích bình luận", "success");
      await dispatch(getCommentsByTask({ documentId: currentTaskId })).unwrap();

      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      toast("Thao tác thất bại", "error");
    }
  }, [dispatch, currentTaskId, toast]);

  const createLikeCommentHandler = useCallback((comment) => () => {
    handleLikeComment(comment);
  }, [handleLikeComment]);


  const parseStatusHTML = (htmlString) => {
    if (!htmlString) return '';

    // Remove HTML tags và lấy text
    const temp = document.createElement('div');
    temp.innerHTML = htmlString;
    return temp.textContent?.trim() || '';
  };

  const fetchJobDetail = useCallback(async () => {
    if (open && currentTaskId) {
      if (!currentTaskId) {
        reset(data);
        setDisplayData(data);
        return;
      }
      try {
        setIsLoading(true);
        const response = await axiosInstance.get(`${API_JOB_TO_MEETING}/${currentTaskId}`);
        const jobDetail = response.data || response;

        setDisplayData(jobDetail);
        setFlags(jobDetail?.flags || response?.flags);
        const safeDayjs = (dateStr) => {
          if (!dateStr || dateStr === "-" || dateStr.toLowerCase().includes("dd/mm/yyyy")) return null;
          const formats = [
            "DD/MM/YYYY HH:mm:ss",
            "DD/MM/YYYY HH:mm",
            "DD/MM/YYYY",
            "D/M/YYYY",      // Single digit day and month
            "D/MM/YYYY",     // Single digit day
            "DD/M/YYYY",     // Single digit month
            "YYYY-MM-DDTHH:mm:ss.SSSZ",
            "YYYY-MM-DD HH:mm:ss",
          ];
          const parsed = dayjs(dateStr, formats, true);
          return parsed.isValid() ? parsed : dayjs(dateStr); // fallback to native parse
        };

        // Ánh xạ dữ liệu từ API (backend) sang Form (frontend)
        const formData = {
          taskName: jobDetail.name,
          startDate: safeDayjs(jobDetail.startDate) || null,
          deadline: safeDayjs(jobDetail.endDate) || null,
          reminderTime: jobDetail.reminderTime,
          priority: jobDetail.priority,
          mode: jobDetail.topic,
          repeatTask: jobDetail.repetitiveTask,
          recurringMonth: jobDetail.month,
          recurringDay: jobDetail.repetitiveStart ? safeDayjs(jobDetail.repetitiveStart) : null,
          recurringTime: jobDetail.repetitiveEnd ? safeDayjs(jobDetail.repetitiveEnd) : null,
          description: jobDetail.note,
          assigner: jobDetail.assigners?.[0]?.processId || null,
          leader: jobDetail.directors?.[0]?.processId || null,
          leaderType: jobDetail.directors?.[0]?.type === 2 ? "unit" : "person",
          coordinators: jobDetail.supporters?.map((item) => item.processId) || [],
          coordinatorType: jobDetail.supporters?.[0]?.type === 2 ? "unit" : "person",
          viewers: jobDetail.viewers?.map((item) => ({ _id: item.processId, name: item.name })) || [],
          progress: parseFloat(jobDetail.progress) || 0,
          status: parseStatusHTML(jobDetail.processStatus),
          code: jobDetail.code,
          parentName: jobDetail.parentName,
          titleMeeting: jobDetail.titleMeeting,
          meetingTitle: jobDetail.meetingTitle,
          meetingDate: safeDayjs(jobDetail.meetingDate),
          note: jobDetail.note,
          conclusionContent: jobDetail.conclusionContent,
          receiveDate: safeDayjs(jobDetail.receiveDate),
          templateName: jobDetail.templateName,
          isApprovalRequired: !!jobDetail.isApprovalRequired,
        };
        reset(formData);

        // Xử lý breadcrumb - hỗ trợ N cấp
        const crumbs = [];
        if (jobDetail.ancestors && Array.isArray(jobDetail.ancestors) && jobDetail.ancestors.length > 0) {
          // Backend trả về đầy đủ danh sách tổ tiên theo thứ tự từ gốc → cha
          jobDetail.ancestors.forEach(a => crumbs.push({ id: a._id || a.id, name: a.name }));
        } else if (jobDetail.parent && jobDetail.parentName) {
          // Fallback: leo ngược lên cây bằng cách gọi API đệ quy
          const buildAncestors = async (parentId) => {
            const ancestors = [];
            let currentParentId = parentId;
            const visited = new Set();

            while (currentParentId) {
              if (visited.has(currentParentId)) break; // chống vòng lặp vô hạn
              visited.add(currentParentId);
              try {
                const parentRes = await axiosInstance.get(`${API_ADD_COMMON_WORK}/${currentParentId}`);
                const parentDetail = parentRes.data || parentRes;
                ancestors.unshift({ id: parentDetail._id || parentDetail.id, name: parentDetail.name });
                currentParentId = parentDetail.parent || null;
              } catch {
                break;
              }
            }
            return ancestors;
          };

          const ancestors = await buildAncestors(jobDetail.parent);
          ancestors.forEach(a => crumbs.push(a));
        }
        crumbs.push({ id: jobDetail._id || jobDetail.id, name: jobDetail.name });
        setBreadcrumb(crumbs);
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
        toast(error?.response?.data?.message || "Lấy chi tiết công việc thất bại!", "error");

        // console.error("Lỗi lấy chi tiết công việc:", error);
      }
    }
  }, [open, currentTaskId, data, reset, toast]);

  const handleFormButtonClose = useCallback(async () => {
    await fetchJobDetail();
    await refetchFiles();
    await fetchHistory();
    await fetchSubTasksData();
    setReloadData?.(new Date() * 1);
  }, [fetchJobDetail, refetchFiles, fetchHistory, fetchSubTasksData, setReloadData]);


  // Reset khi mở và load data
  useEffect(() => {
    if (open && currentTaskId) {
      fetchJobDetail();
      refetchFiles();
      fetchHistory();
      fetchSubTasksData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentTaskId]);
  useEffect(() => {
    if (displayData) {
      const allUsers = [
        ...(displayData.assigners || []),
        ...(displayData.directors || []),
        ...(displayData.supporters || []),
        ...(displayData.viewers || []),
      ];
      const uniqueUsers = Array.from(new Map(allUsers.map(user => [user.processId, { id: user.processId, name: user.name }])).values());
      setMentionUsers(uniqueUsers);
    }
  }, [displayData]);


  useEffect(() => {
    if (currentTaskId) {
      dispatch(getCommentsByTask({ documentId: currentTaskId }));
      fecthDataReasonsDelayJob();
    }
  }, [dispatch, currentTaskId, fecthDataReasonsDelayJob]);

  //  const handleCommentChange = useCallback((e) => {
  //   setCommentText(e.target.value);
  // }, []);
  const handleCommentChange = useCallback((e) => {
    const textarea = e.target;
    const value = textarea.value;
    setCommentText(value);
    setIsCommentMultiline(value.length >= 50);

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
        setIsLoading(true);
        await dispatch(updateCommentInJob({
          documentId: id,
          commentId: editingCommentId,
          content: commentText
        })).unwrap();
        setCommentText("");
        setIsCommentMultiline(false);
        setEditingCommentId(null);
        setMentionedIds([]);
        setIsLoading(false);
        toast("Cập nhật bình luận thành công", "success");
      } catch (error) {
        setIsLoading(false);
        toast("Cập nhật bình luận thất bại", "error");
      }
      return;
    }

    if (replyingToCommentId) {
      try {
        setIsLoading(true);

        const replyData = {
          userId: userData?.user?._id,
          userName: userData?.user?.name,
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
        setIsCommentMultiline(false);
        setReplyingToCommentId(null);
        setMentionedIds([]);
        setIsLoading(false);
        toast("Trả lời bình luận thành công", "success");
      } catch (error) {
        setIsLoading(false);
        toast("Trả lời bình luận thất bại", "error");
      }
      return;
    }

    const commentData = {
      userId: userData?.user?._id || userData?.user?.id,
      userName: userData?.user?.name,
      content: commentText,
      fileId: [],
      mentionIds: [],
    };

    try {
      setIsLoading(true);
      await dispatch(addCommentToJob({ documentId: id, commentData })).unwrap();
      setCommentText("");
      setIsCommentMultiline(false);
      setMentionedIds([]);
      setIsLoading(false);
      toast("Gửi bình luận thành công", "success");
      setIsLoading(false);
    } catch (error) {
      toast("Gửi bình luận thất bại", "error");
      setIsLoading(false);
    }
  }, [commentText, currentTaskId, dispatch, toast, mentionedIds, editingCommentId, replyingToCommentId]);

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

    formatted = formatted.replace(/(@[^@\u200B]+)\u200B/g, '<span style="color: #1976d2; font-weight: bold;">$1</span>');
    formatted = formatted.replace(/\n/g, "<br/>");
    return formatted;
  };

  // const onSubmit = (formData) => {
  //   console.log("Cập nhật công việc:", formData);
  //   onSuccess?.();
  // };

  const subTaskColumns = [
    {
      name: "Tên công việc",
      row: "name",
      accessor: (row) => {
        return (
          <SkyFlexGap8>
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(`<p>${DOMPurify.sanitize(row?.flag)}</p>`) }} />
            <SkyTypography >{row.name}</SkyTypography>
          </SkyFlexGap8>
        )
      },
      width: 400,
      wrapContent: true
    },
    {
      name: "Tiến độ",
      row: "progressView",
      width: 250

    },
    {
      name: "Ngày bắt đầu",
      row: "startDate",
      accessor: (row) => (row.startDate ? dayjs(row.startDate).format("DD/MM/YYYY") : ""),
    },
    {
      name: "Hạn kết thúc",
      row: "endDate",
      accessor: (row) => (row.endDate ? dayjs(row.endDate).format("DD/MM/YYYY") : ""),
    },
    {
      name: "Người giao",
      row: "assigners",
      accessor: (row) => row.assigners?.[0]?.processName || "–",
    },
    {
      name: "Người chủ trì",
      row: "directors",
      accessor: (row) => row.directors?.[0]?.processName || "–",
    },
    {
      name: "Trạng thái",
      row: "processStatusUi",

    },
  ];

  const handleBreadcrumbClick = useCallback((id) => {
    if (id && id !== currentTaskId) {
      setCurrentTaskId(id);
    }
  }, [currentTaskId]);

  const handleSliderChange = useCallback((event, newValue) => {
    setValue("progress", newValue);
  }, [setValue]);

  const handleProgressChange = async (event, newValue) => {
    const id = currentTaskId;
    if (!id) return;
    try {
      setIsLoading(true);
      await axiosInstance.patch(`${API_ADD_COMMON_WORK}/${id}`, {
        progress: String(newValue)
      });
      toast("Cập nhật tiến độ thành công!", "success");
      fetchJobDetail();
      fetchHistory();
      setIsUpdated(true);
    } catch (error) {
      toast(error?.response?.data?.message || "Cập nhật tiến độ thất bại!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const createBreadcrumbClickHandler = useCallback((item, isLast) => () => {
    if (!isLast) {
      handleBreadcrumbClick(item.id);
    }
  }, [handleBreadcrumbClick]);



  const handleNoteClick = useCallback((note) => {
    setOpenNote({
      open: true,
      note,
    });
  }, []);

  const handleCloseNote = () => {
    setOpenNote({
      open: false,
      note: null,
    });
  }


  const createHandleNoteClick = useCallback((note) => () => {
    handleNoteClick(note);
  }, [handleNoteClick]);

  const handleViewSubTask = (row) => {
    logger.log('row', row)
    setOpenSubTask(true);
    setSubTaskData(row);
  }

  const handleCloseSubTask = () => {
    setOpenSubTask(false);
    setSubTaskData(null);
  }

  const handleOpenDialogMeeting = () => {
    setViewMeetingId(data?.meetingId || '');
    setOpenDialogMeeting(true);
  };

  const handleCloseDialogMeeting = () => {
    setOpenDialogMeeting(false);
    setViewMeetingId(null);
  };

  const titleMeeting = data?.titleMeeting || displayData?.titleMeeting;
  const meetingTitle = data?.meetingTitle || displayData?.meetingTitle;
  const conclusionContent = data?.conclusionContent || displayData?.conclusionContent;

  // Kiểm tra người tạo
  // const assignerUsername =
  //   displayData?.assigners?.[0]?.name?.split(' - ')?.[0]?.trim() || data?.assigners?.[0]?.name?.split(' - ')?.[0]?.trim();

  // Wrapper component to move labels above inputs (giống GeneralInformation.js)
  const InputComponents = useMemo(() => {
    const Wrapped = withFormWrapper(BaseInput, "input");
    const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : true} />;
    Component.displayName = "InputComponents";
    return Component;
  }, [BaseInput]);

  const WrappedDateTimeRangePicker = useMemo(() => {
    const Wrapped = withFormWrapper(DateTimeRangePicker, "date");
    const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : true} />;
    Component.displayName = "WrappedDateTimeRangePicker";
    return Component;
  }, []);


  // Wrapper component to move labels above inputs (giống GeneralInformation.js)
  const CustomInput = useMemo(() => {
    const Wrapped = withFormWrapper(CustomInputBase, "input");
    const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : true} />;
    Component.displayName = "CustomInput";
    return Component;
  }, []);



  const WrappedDate = useMemo(() => {
    const Wrapped = withFormWrapper(CustomDatePicker, "date");
    const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : true} />;
    Component.displayName = "WrappedDate";
    return Component;
  }, []);



  const reduxBreadcrumbs = useSelector((state) => state.layout.currentPageBreadcrumb || []);

  const childBreadcrumbs = useMemo(() => {
    const baseBreadcrumbs = breadcrumbsProp || reduxBreadcrumbs;
    return [...baseBreadcrumbs, { title: title || "Chi tiết công việc từ cuộc họp", path: "CLOSE_SWIPER" }];
  }, [breadcrumbsProp, reduxBreadcrumbs, title]);


  const WrappedCustomAsyncAutoComplete = useMemo(() => {
    const Wrapped = withFormWrapper(CustomAsyncAutoComplete, "asyncSelect");
    const Component = (props) => <Wrapped {...props} />;
    Component.displayName = "WrappedCustomAsyncAutoComplete";
    return Component;
  }, []);

  return (
    <CustomSwipper
      title={title}
      breadcrumbs={breadcrumbsProp}
      open={open}
      onClose={handleCloseInternal}
      type="view" // hoặc "edit" tùy mode
      hideBackdrop
      moreActions={
        <FormButton
          dataDetail={displayData}
          setReloadData={setReloadData}
          viewMode='meeting'
          onClose={handleFormButtonClose}
        />
      }
    >
      <JobMainContent>
        {/* HEADER: Tiến độ + Trạng thái */}
        <JobHeaderWrapper>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} md={8} lg={9.2}>
              <StyledBoxContainerContentHeader styledMargin="left" fullHeight>
                {/* ===== BREADCRUMB CÔNG VIỆC ===== */}
                <JobBreadcrumbContainer>
                  {breadcrumb.map((item, index) => {
                    const isLast = index === breadcrumb.length - 1;

                    return (
                      <React.Fragment key={item.id}>
                        <SkyTooltip title={item.name} arrow placement="top">
                          <JobBreadcrumbItem
                            isLast={isLast}
                            onClick={createBreadcrumbClickHandler(item, isLast)}
                          >
                            {item.name}
                          </JobBreadcrumbItem>
                        </SkyTooltip>

                        {!isLast && (
                          <JobBreadcrumbSeparator>
                            &gt;
                          </JobBreadcrumbSeparator>
                        )}
                      </React.Fragment>
                    );
                  })}
                </JobBreadcrumbContainer>

                {/* Tên công việc */}
                <SkyTooltip title={displayData?.name || watch("taskName") || ""} arrow placement="top">
                  <JobTitleText variant="h6">
                    {displayData?.name || watch("taskName") || ""}
                  </JobTitleText>
                </SkyTooltip>

                {/* Mã công việc & Thời gian nhắc hạn */}
                <JobSubtext variant="body2">
                  Mã công việc: {displayData?.code || ""} • Thời gian nhắc hạn: {displayData?.reminderTime || ""}
                </JobSubtext>

                {/* Tiến độ tổng thể */}
                <StytedProgressWrapper>
                  <JobProgressLabel variant="subtitle2">
                    Tiến độ tổng thể
                  </JobProgressLabel>
                  <JobProgressPercent variant="h4">
                    {progress}%
                  </JobProgressPercent>
                </StytedProgressWrapper>
                <JobProgressFlexContainer>
                  <JobProgressBarContainerHeader>
                    <Controller
                      name="progress"
                      control={control}
                      render={({ field }) => (
                        <JobSlider
                          {...field}
                          $colr={displayData?.progressColor}
                          value={typeof field?.value === "number" ? field?.value : 0}
                          onChange={handleSliderChange}
                          onChangeCommitted={handleProgressChange}
                          disabled={!flags?.canInProcess || (subTasksData?.items?.length > 0)}
                          aria-label="Progress"
                          valueLabelDisplay="auto"
                        />
                      )}
                    />
                  </JobProgressBarContainerHeader>
                </JobProgressFlexContainer>
              </StyledBoxContainerContentHeader>
            </Grid>

            <Grid item xs={12} md={4} lg={2.8}>
              <JobStatusBox styledMargin="right" fullHeight>
                {/* Row 1: Tiêu đề */}
                <JobStatusTitle variant="body2">
                  Trạng thái công việc
                </JobStatusTitle>

                {/* Row 2: Status Pill & Edit Button */}
                <JobStatusPillRow>
                  {displayData?.processStatus ? (
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(displayData.processStatus) }} />
                  ) : (
                    <JobStatusPill>Đang thực hiện</JobStatusPill>
                  )}
                  {flags?.updateStatus && (
                    <JobStatusEditButton onClick={handleOpenUpdateStatusDialog}>
                      <JobStatusEditIcon />
                    </JobStatusEditButton>
                  )}
                </JobStatusPillRow>

                {/* Row 3: Dates */}
                <JobStatusDatesRow>
                  <JobStatusDateItem>
                    <JobStatusDateLabel variant="caption">
                      Ngày bắt đầu
                    </JobStatusDateLabel>
                    <JobStatusDateValue variant="body1">
                      {watch("startDate") ? dayjs(watch("startDate")).format("DD/MM/YYYY") : "N/A"}
                    </JobStatusDateValue>
                  </JobStatusDateItem>
                  <JobStatusDateItem>
                    <JobStatusDateLabel variant="caption">
                      Ngày dự kiến kết thúc
                    </JobStatusDateLabel>
                    <JobStatusDateValue variant="body1">
                      {watch("deadline") ? dayjs(watch("deadline")).format("DD/MM/YYYY") : "N/A"}
                    </JobStatusDateValue>
                  </JobStatusDateItem>
                </JobStatusDatesRow>

                {/* Row 4: Độ ưu tiên */}
                <SkyBox>
                  <JobStatusDateLabel variant="caption">
                    Độ ưu tiên
                  </JobStatusDateLabel>
                  <JobStatusPriorityRow>
                    <JobStatusPriorityIcon>!</JobStatusPriorityIcon>
                    <JobStatusDateValue variant="body1">
                      {urgencyOptions?.find(opt => opt.value === watch("priority"))?.title || watch("priority") || "Bình thường"}
                    </JobStatusDateValue>
                  </JobStatusPriorityRow>
                </SkyBox>
              </JobStatusBox>
            </Grid>
          </Grid>
        </JobHeaderWrapper>


        {/* ==================== THÔNG TIN CHUNG ==================== */}
        <StyledBoxContainerContent styledMarginTop>
          <JobSectionHeader mt={2}>
            <SkyFlexGap8>
              <StyledIconWrapper>
                <StytedDescriptionIcon />
              </StyledIconWrapper>
              <JobSectionTitle variant="h6" gutterBottom mb={0} >
                THÔNG TIN CHUNG
              </JobSectionTitle>
              <JobPillOutlineButton onClick={showMore}>
                {showMoreGeneral ? "Thu gọn" : "Xem thêm"}
              </JobPillOutlineButton>
            </SkyFlexGap8>
            {flags?.canUpdate && <JobActionOutlineButton startIcon={<EditIcon />} onClick={handleOpenUpdateGeneralDialog}>Cập nhật</JobActionOutlineButton>}
          </JobSectionHeader>
          <StyleLine />
          {!showMoreGeneral ? (
            <Grid container rowSpacing="6px" columnSpacing="10px" mb={1}>
              <Grid item xs={12}>
                <Controller
                  name="note"
                  control={control}
                  render={({ field }) => (
                    <AbstractSummaryBox>
                      <StyledInfoIcon />
                      <AbstractSummaryContent>
                        <AbstractSummaryTitle>Mô tả</AbstractSummaryTitle>
                        <AbstractSummaryText>
                          {field.value || ""}
                        </AbstractSummaryText>
                      </AbstractSummaryContent>
                    </AbstractSummaryBox>
                  )}
                />
              </Grid>
            </Grid>
          ) : (meetingTitle || conclusionContent || titleMeeting) ? (
            <Grid container rowSpacing="6px" columnSpacing="10px" mb={1}>
              {/* Nguồn cuộc họp - Full width */}
              <Grid item xs={12}>
                <StyledGridContainer container spacing={1}>
                  <Grid item xs>
                    <Controller
                      name="titleMeeting"
                      control={control}
                      render={({ field }) => (
                        <CustomInput
                          label="Nguồn cuộc họp"
                          {...field}
                          inputBgColor="#F5F7FA"
                          isView={false}
                          InputProps={{
                            readOnly: true,
                            onClick: handleOpenDialogMeeting,
                            startAdornment: field.value ? (
                              <InputAdornment position="start">
                                <StyledDescriptionIcon />
                              </InputAdornment>
                            ) : null,
                          }}
                          inputProps={{
                            style: {
                              color: "#0062AD",
                              fontWeight: "bold",
                            }
                          }}
                        />
                      )}
                    />
                  </Grid>
                </StyledGridContainer>
              </Grid>

              {/* Tiêu đề cuộc họp */}
              <Grid item xs={12} md={4}>
                <Controller
                  name="meetingTitle"
                  control={control}
                  render={({ field }) => (
                    <InputComponents
                      label="Tiêu đề cuộc họp"
                      {...field}
                      disabled
                    />
                  )}
                />
              </Grid>

              {/* Kết luận */}
              <Grid item xs={12} md={4}>
                <Controller
                  name="conclusionContent"
                  control={control}
                  render={({ field }) => (
                    <InputComponents
                      label="Kết luận"
                      {...field}
                      disabled
                    />
                  )}
                />
              </Grid>

              {/* Ngày họp */}
              <Grid item xs={12} md={4}>
                <Controller
                  name="meetingDate"
                  control={control}
                  render={({ field }) => (
                    <WrappedDate
                      label="Ngày họp"
                      value={field.value}
                      onBlur={field.onBlur}
                      showTime
                      disabled
                    />
                  )}
                />
              </Grid>

              {/* Tên công việc */}
              <Grid item xs={12} md={8}>
                <Controller
                  name="taskName"
                  control={control}
                  render={({ field }) => (
                    <InputComponents
                      label="Tên công việc"
                      {...field}
                      disabled={isViewMode}
                    />
                  )}
                />
              </Grid>

              {/* Ngày bắt đầu - Hạn kết thúc */}
              <Grid item xs={12} md={4}>
                <WrappedDateTimeRangePicker
                  showTime
                  label="Ngày bắt đầu - Ngày dự kiến kết thúc"
                  value={{
                    startDate: watch("startDate"),
                    endDate: watch("deadline"),
                  }}
                  onChange={handleDateRangeChangeNoop}
                  startLabel="Ngày bắt đầu"
                  endLabel="Hạn kết thúc"
                  disabled
                />
              </Grid>

              {/* Mã công việc */}
              <Grid item xs={12} md={4}>
                <Controller
                  name="code"
                  control={control}
                  render={({ field }) => (
                    <InputComponents
                      label="Mã công việc"
                      {...field}
                      disabled
                    />
                  )}
                />
              </Grid>

              {/* Độ ưu tiên */}
              <Grid item xs={12} md={4}>
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <CustomInput
                      select
                      label="Độ ưu tiên"
                      placeholder="Nhập dữ liệu..."
                      options={urgencyOptions}
                      optionLabel="title"
                      optionValue="value"
                      {...field}
                      disabled={isViewMode}
                    />
                  )}
                />
              </Grid>

              {/* Quy trình */}
              <Grid item xs={12} md={4}>
                <Controller
                  name="templateName"
                  control={control}
                  render={({ field }) => (
                    <CustomInput
                      label="Quy trình"
                      {...field}
                      disabled
                    />
                  )}
                />
              </Grid>

              {/* Thời gian nhắc hạn */}
              <Grid item xs={12} md={4}>
                <Controller
                  name="reminderTime"
                  control={control}
                  render={({ field }) => (
                    <InputComponents select label="Thời gian nhắc hạn" {...field} disabled={isViewMode}>
                      <option value="24h">24h</option>
                      <option value="12h">12h</option>
                    </InputComponents>
                  )}
                />
              </Grid>

              {/* Công việc cần phê duyệt */}
              <Grid item xs={12} md={4}>
                <ParticipantInfoContainer >
                  <Controller
                    name="isApprovalRequired"
                    control={control}
                    render={({ field }) => (
                      <BoldSkyFormControlLabel
                        control={
                          <SkyCheckbox
                            {...field}
                            checked={!!field.value}
                            disabled
                          />
                        }
                        label="Xác nhận hoàn thành"
                        labelPlacement="end"
                      />
                    )}
                  />
                </ParticipantInfoContainer>
              </Grid>

              {/* Mô tả */}
              <Grid item xs={12}>
                <Controller
                  name="note"
                  control={control}
                  render={({ field }) => (
                    <AbstractSummaryBox  >
                      <StyledInfoIcon />
                      <AbstractSummaryContent>
                        <AbstractSummaryTitle>Mô tả</AbstractSummaryTitle>
                        <AbstractSummaryText>
                          {field.value || ""}
                        </AbstractSummaryText>
                      </AbstractSummaryContent>
                    </AbstractSummaryBox>
                  )}
                />
              </Grid>

              {/* Công việc cha */}
              {parentName && (
                <Grid item xs={12}>
                  <Controller
                    name="parentName"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        label="Công việc cha"
                        {...field}
                        disabled
                      />
                    )}
                  />
                </Grid>
              )}
            </Grid>
          ) : (
            <Grid container rowSpacing="6px" columnSpacing="10px" mb={1}>
              {/* CỘT TRÁI - lg=8 */}
              <Grid item xs={12} lg={8}>
                <Grid container rowSpacing="6px" columnSpacing="10px">
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="taskName"
                      control={control}
                      render={({ field }) => (
                        <InputComponents
                          label="Tên công việc"
                          {...field}
                          disabled={isViewMode}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <DateTimeRangePicker
                      showTime
                      label="Ngày bắt đầu - Ngày dự kiến kết thúc"
                      value={{
                        startDate: watch("startDate"),
                        endDate: watch("deadline"),
                      }}
                      onChange={handleDateRangeChangeNoop}
                      startLabel="Ngày bắt đầu"
                      endLabel="Hạn kết thúc"
                      disabled
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="reminderTime"
                      control={control}
                      render={({ field }) => (
                        <InputComponents select label="Thời gian nhắc hạn" {...field} disabled={isViewMode}>
                          <option value="24h">24h</option>
                          <option value="12h">12h</option>
                        </InputComponents>
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="priority"
                      control={control}
                      render={({ field }) => (
                        <CustomInput
                          select
                          label="Độ ưu tiên"
                          placeholder="Nhập dữ liệu..."
                          options={urgencyOptions}
                          optionLabel="title"
                          optionValue="value"
                          {...field}
                          disabled={isViewMode}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name="note"
                      control={control}
                      render={({ field }) => (
                        <InputComponents
                          label="Mô tả"
                          multiline
                          rows={5}
                          {...field}
                          disabled={isViewMode}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* CỘT PHẢI - lg=4 */}
              <Grid item xs={12} lg={4}>
                <Grid container rowSpacing="6px" columnSpacing="10px">
                  <Grid item xs={12}>
                    <Controller
                      name="templateName"
                      control={control}
                      render={({ field }) => (
                        <CustomInput
                          label="Quy trình"
                          {...field}
                          disabled
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name="code"
                      control={control}
                      render={({ field }) => (
                        <InputComponents
                          label="Mã công việc"
                          {...field}
                          disabled
                        />
                      )}
                    />
                  </Grid>

                  {/* Công việc cha */}
                  {parentName && (
                    <Grid item xs={12}>
                      <Controller
                        name="parentName"
                        control={control}
                        render={({ field }) => (
                          <InputComponents
                            label="Công việc cha"
                            {...field}
                            disabled
                          />
                        )}
                      />
                    </Grid>
                  )}
                </Grid>
              </Grid>
            </Grid>
          )}
        </StyledBoxContainerContent>

        {/* ==================== THÔNG TIN NGƯỜI THAM GIA ==================== */}
        <StyledBoxContainerContent styledMarginTop>
          <JobSectionHeader mt={2.5} mb={2.5}>
            <SkyFlexGap8 >
              <StyledIconWrapper noBg>
                <StytedPeopleIcon />
              </StyledIconWrapper>
              <JobSectionTitle variant="h6" gutterBottom mb={0} >
                NGƯỜI THAM GIA
              </JobSectionTitle>
            </SkyFlexGap8>
            <SkyFlexGap16Center>
              {flags?.canUpdate &&
                <JobActionOutlineButton
                  startIcon={<EditIcon />}
                  onClick={handleOpenUpdateParticipantsDialog}>
                  Chỉnh sửa
                </JobActionOutlineButton>
              }
            </SkyFlexGap16Center>
          </JobSectionHeader>

          <Grid container rowSpacing={3} columnSpacing={3} mb={1}>
            <Grid item xs={12} md={6}>
              <WrappedCustomAsyncAutoComplete
                label="Người giao việc"
                options={displayData?.assigners?.[0] ? [displayData.assigners[0]] : []}
                value={displayData?.assigners?.[0] ? [displayData.assigners[0]] : []}
                disabled
                isMulti
                optionValue="_id"
                optionLabel="name"
                optionSubLabel="parentName"

              />
            </Grid>

            <Grid item xs={12} md={6}>
              <WrappedCustomAsyncAutoComplete
                label="Người chủ trì"
                options={displayData?.directors?.[0] ? [displayData.directors[0]] : []}
                value={displayData?.directors?.[0] ? [displayData.directors[0]] : []}
                disabled
                optionValue="_id"
                optionLabel="name"
                optionSubLabel="parentName"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <WrappedCustomAsyncAutoComplete
                label="Người phối hợp"
                limitTags={3}
                options={Array.isArray(displayData?.supporters) ? displayData.supporters : []}
                value={Array.isArray(displayData?.supporters) ? displayData.supporters : []}
                disabled
                isMulti
                optionValue="_id"
                optionLabel="name"
                optionSubLabel="parentName"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <WrappedCustomAsyncAutoComplete
                label="Người xem"
                options={Array.isArray(displayData?.viewers) ? displayData.viewers : []}
                value={Array.isArray(displayData?.viewers) ? displayData.viewers : []}
                disabled
                limitTags={3}
                isMulti
                optionValue="_id"
                optionLabel="name"
                optionSubLabel="parentName"
              />
            </Grid>
            {/* {!(displayData?.createdBy === nameUser && assignerUsername === nameUser) && (
              <Grid item xs={12} md={6}>
                <InputComponents
                  label="Người tạo"
                  value={displayData?.createdBy || null}
                  disabled
                  isView={false}
                  
                />
              </Grid>
            )} */}
          </Grid>
        </StyledBoxContainerContent>

        {/* ==================== TÀI LIỆU CÔNG VIỆC ==================== */}
        <Grid container spacing={3} mt={0.5}>
          <DocumentsGridItem item xs={12} md={6}>
            <SkyFlexGap8  >
              <StyledIconWrapper noBg>
                <StyledCheckOutLineIcon />
              </StyledIconWrapper>
              <JobSectionTitle variant="h6" gutterBottom mb={0} mt={0}>
                TÀI LIỆU LIÊN QUAN
              </JobSectionTitle>
            </SkyFlexGap8>
            <UploadDropZone
              styledMarginTop
              as={StyledBoxContainerContent}
              isDragging={isDraggingTask}
              disabled={!displayData?.flags?.canUpdate}
              onDragOver={handleDragOverTask}
              onDragLeave={handleDragLeaveTask}
              onDrop={handleDropTask}
              flex={1}
            >

              {displayData?.flags?.canUpdate && (
                <JobButtonContainer>
                  <ButtonOutline onClick={handleOpenTaskLinkPopup} startIcon={<LinkIcon />}>
                    Thêm link
                  </ButtonOutline>
                  <ButtonOutline component="label" startIcon={<AttachFileIcon />}>
                    Thêm file
                    <input type="file" hidden multiple onChange={handleTaskDocumentsUpload} />
                  </ButtonOutline>
                  <ButtonOutline component="label" startIcon={<FolderOutlined />}>
                    Thư mục
                    <input type="file" hidden multiple webkitdirectory="" onChange={handleTaskDocumentsUpload} />
                  </ButtonOutline>
                </JobButtonContainer>
              )}

              {/* Tree View tài liệu */}
              <FileTreeTable
                data={taskDocuments}
                onFileMenuClick={handleDynamicFileMenuClick}
                MenuIcon={StyledMenuIcon}
                isView
                sourceAsync
                fileName={displayData?.name || data?.taskName}
                emptyMessage={displayData?.flags?.canUpdate ? "Kéo thả tệp hoặc thư mục vào đây để tải lên" : "Chưa có tài liệu nào"}
              />
            </UploadDropZone>
          </DocumentsGridItem>
          <DocumentsGridItem item xs={12} md={6}>
            <SkyFlexGap8  >
              <StyledIconWrapper noBg>
                <StyledCheckOutLineIcon />
              </StyledIconWrapper>
              <JobSectionTitle variant="h6" gutterBottom mb={0} mt={0}>
                KẾT QUẢ CÔNG VIỆC
              </JobSectionTitle>
            </SkyFlexGap8>
            <UploadDropZone
              styledMarginTop
              as={StyledBoxContainerContent}
              isDragging={isDraggingFinal}
              disabled={!displayData?.flags?.canUpdateFolder}
              onDragOver={handleDragOverFinal}
              onDragLeave={handleDragLeaveFinal}
              onDrop={handleDropFinal}
              flex={1}
            >

              {displayData?.flags?.canUpdateFolder && (
                <JobButtonContainer>
                  <ButtonOutline onClick={handleOpenFinalLinkPopup} startIcon={<LinkIcon />}>
                    Thêm link
                  </ButtonOutline>
                  <ButtonOutline component="label" startIcon={<AttachFileIcon />}>
                    Tải file
                    <input type="file" hidden multiple onChange={handleFinalDocumentsUpload} />
                  </ButtonOutline>
                  <ButtonOutline component="label" startIcon={<FolderOutlined />}>
                    Thư mục
                    <input type="file" hidden multiple webkitdirectory="" onChange={handleFinalDocumentsUpload} />
                  </ButtonOutline>

                </JobButtonContainer>
              )}

              {/* Tree View tài liệu kết quả */}
              <FileTreeTable
                data={finalDocuments}
                onFileMenuClick={handleDynamicFileMenuClick}
                MenuIcon={StyledMenuIcon}
                isView
                sourceAsync
                fileName={displayData?.name || data?.taskName}
                emptyMessage={displayData?.flags?.canUpdateFolder ? "Kéo thả tệp hoặc thư mục vào đây để tải lên" : "Chưa có tài liệu nào"}
              />
            </UploadDropZone>
          </DocumentsGridItem>
        </Grid>

        {/* ==================== CÔNG VIỆC CON ==================== */}
        <JobSubTaskHeader>
          <SkyFlexGap8>
            <StyledIconWrapper noBg>
              <StytedAppsIcon />
            </StyledIconWrapper>
            <JobSectionTitle variant="h6" mt={0} mb={0}>
              DANH SÁCH CÔNG VIỆC CON
            </JobSectionTitle>
          </SkyFlexGap8>
          <JobSubTaskActionContainer>
            {selectedSubTasks.length > 0 && (
              <JobDeleteButton variant="contained" startIcon={<DeleteOutlined />} onClick={handleDeleteSubTasks}>
                Xóa
              </JobDeleteButton>
            )}
            {flags?.canCreateTaskSub && <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddSubJob}>
              Thêm mới
            </Button>}
          </JobSubTaskActionContainer>
        </JobSubTaskHeader>
        <StyledBoxContainerContent styledMarginTop>


          <JobSubTaskTableContainer>
            <CustomTable
              columns={subTaskColumns}
              data={subTasksData?.items || []}
              customMaxHeight={500}
              disablePaperHeight
              onlyTable
              disableEdit
              disableDelete
              onView={handleViewSubTask}
              onSelectView={handleViewSubTask}
              selection={selectedSubTasks}
              onSelectionChange={setSelectedSubTasks}
            />
          </JobSubTaskTableContainer>
        </StyledBoxContainerContent>

        {/* ==================== BÌNH LUẬN & LỊCH SỬ (2 cột) ==================== */}
        <JobCommentGridContainer container spacing={1.875} styledMarginTop>
          {/* BÌNH LUẬN */}
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
            fixedHeight="400px"
          />

          {/* LỊCH SỬ */}
          <Grid item xs={12} md={6}>
            <SkyFlexGap8 mb={'12px'}>
              <StyledIconWrapper noBg>
                <StytedHistoryIcon />
              </StyledIconWrapper>
              <JobSectionTitle variant="h6" gutterBottom mb={0} mt={0}>
                LỊCH SỬ HOẠT ĐỘNG
              </JobSectionTitle>
            </SkyFlexGap8>
            <StyledBoxContainerContent fixedHeight="400px">
              <HistoryJob historyData={historyData} createHandleNoteClick={createHandleNoteClick} />
            </StyledBoxContainerContent>
          </Grid>
        </JobCommentGridContainer>

        {flags?.isSlowReason &&
          // <StyledBoxContainerContent styledMarginTop>
          <ReasonsDelayJob reasons={dataReasonsDelayJob} currentTaskId={currentTaskId} fecthDataReasonsDelayJob={fecthDataReasonsDelayJob} />
          // </StyledBoxContainerContent>
        }
      </JobMainContent>

      {/* Dialog cập nhật */}
      <UpdateJobToMeeting
        open={updateDialogState.open}
        onClose={handleCloseUpdateDialog}
        updateDialogState={updateDialogState}
        fetchJobDetail={fetchJobDetail}
        setIsUpdated={setIsUpdated}
        fetchSubTasksData={fetchSubTasksData}
        fetchHistory={fetchHistory}
        currentTaskId={currentTaskId}
        dataDetail={displayData}
        data={
          updateDialogState.type === 'participants'
            ? {
              // Chỉ dùng cho participants: map đầy đủ object có name
              assigner: displayData.assigners?.[0] ? { _id: displayData.assigners[0].processId, name: displayData.assigners[0].name } : null,
              leader: displayData.directors?.[0] ? { _id: displayData.directors[0].processId, name: displayData.directors[0].name } : null,
              leaderType: displayData.directors?.[0]?.type === 2 ? 'unit' : 'person',
              coordinators: displayData.supporters?.map(item => ({ _id: item.processId, name: item.name })) || [],
              coordinatorType: displayData.supporters?.[0]?.type === 2 ? 'unit' : 'person',
              viewers: displayData.viewers?.map(item => ({ _id: item.processId, name: item.name })) || [],
              isApprovalRequired: !!displayData.isApprovalRequired,
            }
            : watch() // Các type khác (general, status) thì dùng watch() bình thường
        }
        type={updateDialogState.type}
        startDateParent={data?.deadlineStartParentISO ?? data?.deadlineStartParent}
        endDateParent={data?.deadlineEndParentISO ?? data?.deadlineEndParent}
      />

      <CustomDialog
        open={linkPopupOpen}
        onClose={handleCloseLinkPopup}
        onSave={handleSaveLink}
        title="Gắn link tài liệu"
        titleButton="Lưu"
        disabled={!linkFormValues.documentName.trim() || !linkFormValues.documentUrl.trim() || !!linkErrors.documentUrl}
      >
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <CustomInput
              label={<>Tên link <span style={{ color: 'red' }}>*</span></>}
              placeholder="Ví dụ: Báo cáo tháng 1"
              fullWidth
              value={linkFormValues.documentName}
              onChange={handleLinkNameChange}
              error={!!linkErrors.documentName}
              helperText={linkErrors.documentName}
              isView={false}
            />
          </Grid>
          <Grid item xs={12}>
            <CustomInput
              label={<>Đường dẫn link <span style={{ color: 'red' }}>*</span></>}
              placeholder="Ví dụ: https://docs.google.com/document/d/..."
              fullWidth
              value={linkFormValues.documentUrl}
              onChange={handleLinkUrlChange}
              error={!!linkErrors.documentUrl}
              helperText={linkErrors.documentUrl}
              isView={false}
            />
          </Grid>
        </Grid>
      </CustomDialog>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedFile && !selectedFile.isFolder && selectedFile?.type_file !== 'link' && (
          <MenuItem onClick={handleViewFile}>
            <StyledListItemIcon>
              <VisibilityOutlined />
            </StyledListItemIcon>
            <ListItemText>Xem</ListItemText>
          </MenuItem>
        )}
        {checkCanDeleteFile
          && <MenuItem onClick={handleOpenDeleteDialog}>
            <StyledListItemIcon>
              <DeleteOutlined />
            </StyledListItemIcon>
            <ListItemText>Xóa</ListItemText>

          </MenuItem>
        }
        {selectedFile && selectedFile?.type_file !== 'link' && (
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
        {selectedCommentForMenu?.isCreated && <MenuItem onClick={handleDeleteComment}>
          <StyledListItemIcon>
            <DeleteOutlined />
          </StyledListItemIcon>
          <ListItemText>Xóa</ListItemText>
        </MenuItem>
        }
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

      <FilePreviewDialog
        open={viewingFile.open}
        onClose={handleCloseFileViewer}
        url={viewingFile.url}
        fileName={viewingFile.name}
        fileType={viewingFile.type}
        title={`Xem file: ${viewingFile.name}`}
      />

      <AddNewJob
        open={isAddSubJobOpen}
        onClose={handleCloseAddSubJob}
        onSuccess={handleAddSubJobSuccess}
        title="Thêm mới công việc con"
        parentId={currentTaskId}
        viewType="jobToMeeting"
        parentName={displayData?.name || data?.taskName}
        parentProgress={progress}
        hasChildren={flags?.hasChildren}
        onResetParentProgress={handleResetParentProgress}
        parentStartDate={displayData?.startDate}
        parentEndDate={displayData?.endDate}
        parentTopic={displayData?.topic}
        breadcrumbs={childBreadcrumbs}
      />

      <ViewJob
        open={openSubTask}
        onClose={handleCloseSubTask}
        data={subTaskData}
        documentId={subTaskData}
        isViewMode
        parentType={subTaskData?.parentType}
        title='Xem chi tiết công việc con'
        typeJob='noTatic'
        breadcrumbs={childBreadcrumbs}
        startDateParent={data?.deadlineStartParentISO ?? data?.deadlineStartParent ?? data?.startDateISO}
        endDateParent={data?.deadlineEndParentISO ?? data?.deadlineEndParent ?? data?.endDateISO}
      />

      <Dialog
        open={confirmDeleteSubTask}
        onClose={handleCloseConfirmDelete}
        onSave={handleConfirmDeleteSubTasks}
        title="Xác nhận xóa"
        isLoading={isLoading}
      >
        <Typography>Bạn có chắc chắn muốn xóa các công việc con đã chọn không?</Typography>
      </Dialog>

      <Dialog
        open={confirmDeleteComment}
        onClose={handleCloseConfirmDeleteComment}
        onSave={handleConfirmDeleteComment}
        title="Xác nhận xóa bình luận"
        type="delete"
        isLoading={isLoading}
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
          {mentionUsers?.filter((user) =>
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
      <CustomDialog
        open={openNote.open}
        onClose={handleCloseNote}
        isLoading={isLoading}
        title="Lý do từ chối"
        type="view"
        size="sm"
        disableSave
      >
        <JobNoteContainer>{openNote.note}</JobNoteContainer>
      </CustomDialog>

      <ViewMeetingSchedule
        open={openDialogMeeting}
        onClose={handleCloseDialogMeeting}
        meetingId={viewMeetingId}
      />
      <LoadingDialog open={isLoading} >
        Đang tải tài liệu, vui lòng đợi...
      </LoadingDialog>
    </CustomSwipper>
  );
};

export default withSharedComponents(ViewJobToMeeting);