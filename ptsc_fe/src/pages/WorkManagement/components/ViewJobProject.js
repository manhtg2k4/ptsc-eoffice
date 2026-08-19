/* eslint-disable camelcase */
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
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import * as XLSX from "xlsx";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
// import DeleteIcon from "@mui/icons-material/Delete";
import FolderIcon from "@mui/icons-material/Folder";
import LinkIcon from "@mui/icons-material/Link";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";
import CustomTable from "@components/CustomTable/CustomTableStatic";
import { VisibilityOutlined, DeleteOutline, DownloadOutlined, } from "@mui/icons-material";
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
  JobHeaderWrapper,
  StyledListItemIcon,
  JobBreadcrumbContainer,
  JobBreadcrumbItem,
  JobBreadcrumbSeparator,
  JobNoteContainer,
  BoldSkyFormControlLabel,
  ParticipantInfoContainer,
  SkyFlexGap16Center,
  StyledBoxContainerContentHeader,
  JobTitleText,
  JobSubtext,
  StytedProgressWrapper,
  JobProgressLabel,
  JobProgressPercent,
  JobProgressFlexContainer,
  JobProgressBarContainerHeader,
  JobStatusBox,
  JobStatusTitle,
  JobStatusPillRow,
  JobStatusPill,
  JobStatusEditButton,
  JobStatusEditIcon,
  JobStatusDatesRow,
  JobStatusDateItem,
  JobStatusDateLabel,
  JobStatusDateValue,
  JobStatusPriorityRow,
  JobStatusPriorityIcon,
  StytedDescriptionIcon,
  StyleLine,
  StytedPeopleIcon,
  JobActionOutlineButton,
  JobPillOutlineButton,
  StyledCheckOutLineIcon,
  StytedHistoryIcon,
  JobCommentGridContainer,
  JobFileTreeWrapper,
  JobScrollWrapper
} from "./Job.styles";
import UpdateJobDialog from "./UpdateJobDialogNew";
import FileTreeTable from "@components/FileTreeTable";
import axiosInstance from "@utils/axiosInstance";
import {
  API_ADD_COMMON_WORK,
  APP_BASE,
  API_GET_COMMON_WORK_DETAIL,
  API_GET_SUBTASKS,
  API_COMMON_WORK_COMMENTS,
  API_XLSX_TO_PDF,
  API_MERGE_LINK
} from "@EnvironmentFile/constants/urlConfig";
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
  generateDuplicateName
} from "./constants";
import AddNewJob from "./AddNewJobProject";
import CustomInput from "@components/CustomInput/CustomInputBase";
import CustomAsyncAutoComplete from "@components/CustomAsyncAutoComplete";
import ViewJobChild from "./ViewJob";
import FormButton from "@components/FormButton";
import Comment from "./Comment";
import ReasonsDelayJob from "./ReasonsDelayJob";
import HistoryJob from "./HistoryJob";
import FilePreviewDialog from "@components/UploadFile/components/FilePreviewDialog";
import api from "@services/api";
import DateTimeRangePicker from "@components/CustomDateTimePicker/DateTimeRangePicker";
import { SkyFlexGap8, SkyTypography, SkyGrid, SkyCheckbox, SkyBox } from "@styles/SkyStyles";
import DOMPurify from "dompurify";
import CustomSwipper from "@components/Swipper/BaseSwiper";
import withFormWrapper from "@components/common/FormWrapper";
import { AbstractSummaryBox, AbstractSummaryContent, AbstractSummaryText, AbstractSummaryTitle, StyledIconWrapper, StyledInfoIcon } from "@pages/ProjectManager/components/AddProject.styles";

// import { encodeHTML } from "@/utils/securityUtils";
const ViewJob = ({
  open,
  onClose,
  onSuccess,
  sharedComponents,
  title = "Chi tiết công việc thuộc dự án",
  data: dataProps, // Giả sử bạn truyền data công việc vào để hiển thị (mode view/edit)
  dataDetail,
  documentId,
  setReloadData,
  isFromProject: isFromProjectProp = false,
  projectId: projectIdProp = null,
  projectDetail: projectDetailProp = null,
  startDateParent,
  endDateParent,
}) => {
  const data = useMemo(() => {
    return dataProps || dataDetail;
  }, [dataProps, dataDetail]);
  const {
    InputComponents: BaseInput,
    ButtonOutline,
    toast,
    Dialog,
  } = sharedComponents;
  const dispatch = useDispatch();
  const { commentsList } = useSelector((state) => state.unit);
  const { dataUser: authUser } = useSelector((state) => state.auth || {});
  const userData = authUser || {};

  const [isLoading, setIsLoading] = useState(false);
  const [openNote, setOpenNote] = useState({
    open: false,
    note: null,
  })

  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [flags, setFlags] = useState({});
  const [openSubTask, setOpenSubTask] = useState(false);
  const [subTaskData, setSubTaskData] = useState(null);
  const { crmSource } = useSelector((state) => state.config);
  const urgencyOptions =
    crmSource.find((item) => item.code === "DOUUTIEN")?.data || [];


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
      topic: data?.topic,
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
      templateId: data?.templateId,
      projectName: data?.projectName || projectDetailProp?.name || "",
      isApprovalRequired: !!data?.isApprovalRequired,
    },
  });

  // const repeatTask = watch("repeatTask");
  const progress = watch("progress") ?? 0;
  // const parentName = watch("parentName");

  const [displayData, setDisplayData] = useState(data);
  const isCancelled = useMemo(() => {
    const rawStatus = displayData?.processStatus || '';
    if (typeof rawStatus !== 'string') return false;
    const cleanStatus = rawStatus.replace(/<[^>]*>/g, '').toLowerCase();
    return cleanStatus.includes('hủy') || cleanStatus.includes('huỷ') || rawStatus === '8';
  }, [displayData?.processStatus]);
  const [isUpdated, setIsUpdated] = useState(false);
  // State cho dialog cập nhật
  const [updateDialogState, setUpdateDialogState] = useState({
    open: false,
    type: null, // 'general' | 'participants'
  });

  const [commentText, setCommentText] = useState("");
  const [isCommentMultiline, setIsCommentMultiline] = useState(false);
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

  const [dataReasonsDelayJob, setDataReasonsDelayJob] = useState([]);

  const [linkPopupOpen, setLinkPopupOpen] = useState(false);
  const [linkSection, setLinkSection] = useState("task"); // 'task' or 'final'
  const [linkFormValues, setLinkFormValues] = useState({ documentName: "", documentUrl: "" });
  const [linkErrors, setLinkErrors] = useState({ documentName: "", documentUrl: "" });

  const validateURL = useCallback((url) => {
    const pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
      '(\\#[-a-z\\d_.~+%=&]*)?$', 'i'); // fragment locator
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

  // Kiểm tra xem file được chọn có phải là người upload không
  const checkCanDeleteFile = selectedFile?.is_uploader === true;



  useEffect(() => {
    if (open) {
      setIsUpdated(false);
    }
  }, [open]);

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


  const handleCloseInternal = () => {
    if (isUpdated) {
      onSuccess?.();
    }
    onClose();
  };

  const handleDateRangeChangeNoop = useCallback(() => { }, []);

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

  const [subTasksData, setSubTasksData] = useState([]);

  const fetchSubTasksData = useCallback(async () => {
    if (!currentTaskId) return;
    try {
      const parentId = currentTaskId;
      const response = await axiosInstance.get(API_GET_SUBTASKS, {
        params: {
          parent: parentId,
        },
      });
      const responseData = response.data || response;
      setSubTasksData(responseData.data || responseData || []);
    } catch (error) {
      toast('Không thể tải danh sách công việc con!', 'error');
      setSubTasksData([]);
    }
  }, [currentTaskId, toast]);

  const handleCloseFileViewer = useCallback(() => {
    if (viewingFile.url) URL.revokeObjectURL(viewingFile.url);
    setViewingFile({ open: false, url: null, name: "", type: null });
  }, [viewingFile.url]);




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

    if (selectedFile?.type_file === 'link') {
      toast("Link đính kèm không thể xem trực tiếp, vui lòng Copy link!", "warning");
      return;
    }

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

    if (selectedFile?.type_file === 'link') {
      toast("Link đính kèm không thể tải xuống!", "warning");
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
    const allAttachments = [...taskDocuments, ...finalDocuments];
    const targetDocuments = objectType === "taskdocuments" ? taskDocuments : finalDocuments;

    const currentTotalCount = allAttachments.length;

    // Tính tổng dung lượng hiện có
    const currentTotalSize = allAttachments.reduce((sum, file) => {
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
              const existingFoldersInParent = targetDocuments
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
          const existingFilesInParent = targetDocuments
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
          const existingFilesAtRoot = targetDocuments
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
      event.target.value = null;
    }
  };

  const handleTaskDocumentsUpload = (e) => handleFileUpload(e, "taskdocuments");
  const handleFinalDocumentsUpload = (e) => handleFileUpload(e, "finaldocuments");


  const handleOpenAddSubJob = () => {
    setIsAddSubJobOpen(true);
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
      toast(error?.response?.data?.message || "Xóa thất bại!", "error");
      setIsLoading(false);
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
      toast("Thao tác thất bại", "error");
      setIsLoading(false);
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
      try {
        setIsLoading(true);
        const response = await axiosInstance.get(`${API_ADD_COMMON_WORK}/${currentTaskId}`);
        const jobDetail = response?.data || response;

        setDisplayData(jobDetail);
        setFlags(response?.flags || {});

        // Map backend data to form data
        const formData = {
          taskName: jobDetail.name || "",
          startDate: jobDetail.startDate ? dayjs(jobDetail.startDate) : null,
          deadline: jobDetail.endDate ? dayjs(jobDetail.endDate) : null,
          reminderTime: jobDetail.reminderTime || "",
          priority: jobDetail.priority || "",
          topic: jobDetail.topic || "",
          repeatTask: jobDetail.repetitiveTask || false,
          recurringMonth: jobDetail.month || "",
          recurringDay: jobDetail.repetitiveStart ? dayjs(jobDetail.repetitiveStart) : null,
          recurringTime: jobDetail.repetitiveEnd ? dayjs(jobDetail.repetitiveEnd) : null,
          description: jobDetail.note || "",
          assigner: jobDetail.assigners?.[0]?.processId || null,
          leader: jobDetail.directors?.[0]?.processId || null,
          leaderType: jobDetail.directors?.[0]?.type === 2 ? "unit" : "person",
          coordinators: jobDetail.supporters?.map((item) => item.processId) || [],
          coordinatorType: jobDetail.supporters?.[0]?.type === 2 ? "unit" : "person",
          viewers: jobDetail.viewers?.map((item) => ({ _id: item.processId, name: item.name })) || [],
          progress: parseFloat(jobDetail.progress) || 0,
          status: parseStatusHTML(jobDetail.processStatus),
          code: jobDetail.code || "",
          parentName: jobDetail.parentName || "",
          templateId: jobDetail?.templateId || null,
          templateName: jobDetail?.templateName || "",
          projectName: jobDetail.projectName || projectDetailProp?.name || "",
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
      } catch (error) {
        toast(error?.response?.data?.message || "Lấy chi tiết công việc thất bại!", "error");
      } finally {
        setIsLoading(false);
      }
    }
  }, [open, currentTaskId, reset, toast, projectDetailProp?.name]);

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

    // Tự động bật multiline khi có từ 50 ký tự trở lên
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

    formatted = formatted.replace(/(@[^@\u200B]+)\u200B/g, '<span style="color: #1976d2; font-weight: 500;">$1</span>');
    formatted = formatted.replace(/\n/g, "<br/>");
    return formatted;
  };


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
    },
    {
      name: "Tiến độ",
      row: "progressView",

    },
    {
      name: "Ngày bắt đầu",
      row: "startDate",
      accessor: (row) => (row.startDate ? dayjs(row.startDate).format("DD/MM/YYYY") : "–"),
    },
    {
      name: "Hạn kết thúc",
      row: "endDate",
      accessor: (row) => (row.endDate ? dayjs(row.endDate).format("DD/MM/YYYY") : "–"),
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

  const createBreadcrumbClickHandler = useCallback((item, isLast) => () => {
    if (!isLast) {
      handleBreadcrumbClick(item.id);
    }
  }, [handleBreadcrumbClick]);

  const handleViewSubTask = (row) => {
    setOpenSubTask(true);
    setSubTaskData(row);
  }

  const handleMoreAction = (action, row) => {
    if (action.id === "viewDetail") {
      handleViewSubTask(row);
    }
  }

  const handleCloseSubTask = () => {
    setOpenSubTask(false);
    setSubTaskData(null);
  }

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
      fetchSubTasksData();
      fetchHistory();
      setIsUpdated(true);
    } catch (error) {
      toast(error?.response?.data?.message || "Cập nhật tiến độ thất bại!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSliderChange = useCallback((event, newValue) => {
    setValue("progress", newValue);
  }, [setValue]);



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

  // const nameUser = userData?.name;
  // // Kiểm tra người tạo
  // const assignerUsername =
  //   displayData?.assigners?.[0]?.name?.split(' - ')?.[0]?.trim() || data?.assigners?.[0]?.name?.split(' - ')?.[0]?.trim();

  // Wrapper component to move labels above inputs
  const InputComponents = useMemo(() => {
    const Wrapped = withFormWrapper(BaseInput, "input");
    const Component = (props) => <Wrapped {...props} isView />;
    Component.displayName = "InputComponents";
    return Component;
  }, [BaseInput]);

  const WrappedDateTimeRangePicker = useMemo(() => {
    const Wrapped = withFormWrapper(DateTimeRangePicker, "date");
    const Component = (props) => <Wrapped {...props} isView />;
    Component.displayName = "WrappedDateTimeRangePicker";
    return Component;
  }, []);

  const WrapperInputComponents = useMemo(() => {
    const Wrapped = withFormWrapper(CustomInput, "input");
    const Component = (props) => <Wrapped {...props} isView />;
    Component.displayName = "WrapperInputComponents";
    return Component;
  }, []);

  const WrappedCustomAsyncAutoComplete = useMemo(() => {
    const Wrapped = withFormWrapper(CustomAsyncAutoComplete, "asyncSelect");
    const Component = (props) => <Wrapped {...props} />;
    Component.displayName = "WrappedCustomAsyncAutoComplete";
    return Component;
  }, []);

  const [showMoreGeneral, setShowMoreGeneral] = useState(false);
  const showMore = () => {
    setShowMoreGeneral(!showMoreGeneral);
  }

  const reduxBreadcrumbs = useSelector((state) => state.layout.currentPageBreadcrumb || []);
  const customBreadcrumbs = useMemo(() => {
    if (isFromProjectProp) {
      return [...reduxBreadcrumbs, { title: "Chi tiết dự án", path: "CLOSE_SWIPER" }];
    }
    return undefined;
  }, [isFromProjectProp, reduxBreadcrumbs]);

  const childBreadcrumbs = useMemo(() => {
    if (!customBreadcrumbs) return undefined;
    return [...customBreadcrumbs, { title: "Chi tiết công việc thuộc dự án", path: "CLOSE_SWIPER" }];
  }, [customBreadcrumbs]);

  return (
    <CustomSwipper
      title={title}
      breadcrumbs={customBreadcrumbs}
      open={open}
      onClose={handleCloseInternal}
      type="view" // hoặc "edit" tùy mode
      hideBackdrop
      moreActions={
        <FormButton
          dataDetail={displayData}
          setReloadData={setReloadData}
          viewMode='jobGeneral'
          onClose={handleFormButtonClose}
        />
      }
    >
      <JobMainContent>
        {/* HEADER: Tiến độ + Trạng thái */}
        <JobHeaderWrapper>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} lg={9.2}>
              <StyledBoxContainerContentHeader styledMargin="left" fullHeight>
                {/* ===== BREADCRUMB CÔNG VIỆC ===== */}
                <JobBreadcrumbContainer>
                  {breadcrumb.map((item, index) => {
                    const isLast = index === breadcrumb.length - 1;

                    return (
                      <React.Fragment key={item.id}>
                        <JobBreadcrumbItem
                          isLast={isLast}
                          onClick={createBreadcrumbClickHandler(item, isLast)}
                        >
                          {item.name}
                        </JobBreadcrumbItem>

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
                <JobTitleText variant="h6">
                  {watch("taskName") || ""}
                </JobTitleText>

                {/* Mã công việc & Thời gian nhắc hạn */}
                <JobSubtext variant="body2">
                  Mã công việc: {displayData?.code || ""} • Thời gian nhắc hạn: {displayData?.reminderTime || ""}
                </JobSubtext>

                {/* Tiến độ tổng thể + Slider & Phần trăm */}
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
                          $colr="#2364B0"
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
            <Grid item xs={12} lg={2.8}>
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
                  {flags?.updateStatus && !isCancelled && (
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
              <SkyFlexGap8>
                <StyledIconWrapper>
                  <StytedDescriptionIcon />
                </StyledIconWrapper>
                <JobSectionTitle variant="h6" gutterBottom mb={0} >
                  THÔNG TIN CHUNG
                </JobSectionTitle>
              </SkyFlexGap8>
              <JobPillOutlineButton onClick={showMore}>
                {showMoreGeneral ? "Thu gọn" : "Xem thêm"}
              </JobPillOutlineButton>

            </SkyFlexGap8>
            {flags?.canUpdate && !isCancelled && <JobActionOutlineButton startIcon={<EditIcon />} onClick={handleOpenUpdateGeneralDialog}>Chỉnh sửa</JobActionOutlineButton>}
          </JobSectionHeader>
          <StyleLine />
          <Grid container rowSpacing="6px" columnSpacing="10px" mb={1}>
            {/* Row 1 */}
            {showMoreGeneral && (
              <>
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
                    endLabel="Hạn xử lý"
                    disabled
                  />
                </Grid>

                {/* Row 2 */}
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
                <Grid item xs={12} md={4}>
                  <Controller
                    name="priority"
                    control={control}
                    render={({ field }) => (
                      <WrapperInputComponents
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
                <Grid item xs={12} md={4}>
                  <Controller
                    name="templateName"
                    control={control}
                    render={({ field }) => (
                      <WrapperInputComponents
                        label="Quy trình"
                        {...field}
                        disabled
                      />
                    )}
                  />
                </Grid>

                {/* Row 3 */}
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
                <Grid item xs={12} md={4}>
                  <Controller
                    name="projectName"
                    control={control}
                    render={({ field }) => (
                      <WrapperInputComponents
                        label="Thuộc dự án"
                        {...field}
                        disabled
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <ParticipantInfoContainer>
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
              </>
            )}

            {/* Row 4: Mô tả */}
            <Grid item xs={12}>
              <Controller
                name="description"
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

            {/* Optional: Công việc cha */}
            {/* {parentName && (
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
            )} */}
          </Grid>
        </StyledBoxContainerContent>

        {/* ==================== THÔNG TIN NGƯỜI THAM GIA ==================== */}
        <StyledBoxContainerContent styledMarginTop>
          <JobSectionHeader mt={2.5} mb={2.5}>
            <SkyFlexGap8 >
              <StyledIconWrapper>
                <StytedPeopleIcon />
              </StyledIconWrapper>
              <JobSectionTitle variant="h6" gutterBottom mb={0} >
                NGƯỜI THAM GIA
              </JobSectionTitle>
            </SkyFlexGap8>
            <SkyFlexGap16Center>

              {flags?.canUpdate && !isCancelled &&
                <JobActionOutlineButton
                  startIcon={<EditIcon />}
                  onClick={handleOpenUpdateParticipantsDialog}>
                  Chỉnh sửa
                </JobActionOutlineButton>
              }
            </SkyFlexGap16Center>
          </JobSectionHeader>

          <Grid container rowSpacing={3} columnSpacing={3} mb={1}>
            <Grid item xs={12}>
              <Grid container rowSpacing={3} columnSpacing={3}>
                <Grid item xs={12} md={6}>
                  <WrappedCustomAsyncAutoComplete
                    limitTags={2}
                    options={displayData?.assigners?.[0] ? [displayData.assigners[0]] : []}
                    value={displayData?.assigners?.[0] ? [displayData.assigners[0]] : []}
                    disabled
                    isMulti
                    optionValue="_id"
                    optionLabel="name"
                    optionSubLabel="parentName"
                    label="Người giao việc"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <WrappedCustomAsyncAutoComplete
                    limitTags={2}
                    options={displayData?.directors?.[0] ? [displayData.directors[0]] : []}
                    value={displayData?.directors?.[0] ? [displayData.directors[0]] : []}
                    disabled
                    isMulti
                    optionValue="_id"
                    optionLabel="name"
                    optionSubLabel="parentName"
                    label="Người chủ trì"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <WrappedCustomAsyncAutoComplete
                    limitTags={2}
                    options={Array.isArray(displayData?.supporters) ? displayData.supporters : []}
                    value={Array.isArray(displayData?.supporters) ? displayData.supporters : []}
                    disabled
                    isMulti
                    optionValue="_id"
                    optionLabel="name"
                    optionSubLabel="parentName"
                    label="Người phối hợp"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
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
                {/* {!(displayData?.createdBy === nameUser && assignerUsername === nameUser) && (
                  <Grid item xs={12} md={6}>
                    <InputComponents
                      label="Người tạo"
                      value={displayData?.createdBy || null}
                      disabled
                    />
                  </Grid>
                )} */}
              </Grid>
            </Grid>
          </Grid>
        </StyledBoxContainerContent>

        {/* ==================== TÀI LIỆU CÔNG VIỆC ==================== */}
        <Grid container spacing={3} mt={0.5}>
          <Grid item xs={12} md={6}>
            <SkyFlexGap8 mb={2.5}>
              <StyledIconWrapper noBg>
                <StyledCheckOutLineIcon />
              </StyledIconWrapper>
              <JobSectionTitle variant="h6" gutterBottom mb={0} mt={0}>
                TÀI LIỆU LIÊN QUAN
              </JobSectionTitle>
            </SkyFlexGap8>
            <StyledBoxContainerContent styledMarginTop fixedHeight="430px">
              {displayData?.flags?.canUpdate && (
                <JobButtonContainer>
                  <ButtonOutline onClick={handleOpenTaskLinkPopup} startIcon={<LinkIcon />}>
                    Thêm link
                  </ButtonOutline>
                  <ButtonOutline component="label" startIcon={<AddIcon />}>
                    Thêm file
                    <input type="file" hidden multiple onChange={handleTaskDocumentsUpload} />
                  </ButtonOutline>
                  <ButtonOutline component="label" startIcon={<FolderIcon />}>
                    Thư mục
                    <input type="file" hidden multiple webkitdirectory="" onChange={handleTaskDocumentsUpload} />
                  </ButtonOutline>
                </JobButtonContainer>
              )}

              {/* Tree View tài liệu */}
              <JobFileTreeWrapper>
                <FileTreeTable
                  data={taskDocuments}
                  onFileMenuClick={handleDynamicFileMenuClick}
                  MenuIcon={StyledMenuIcon}
                  isView
                  sourceAsync
                  fileName={displayData?.name || data?.taskName}
                  emptyMessage={displayData?.flags?.canUpdate ? "Kéo thả tệp hoặc thư mục vào đây để tải lên" : "Chưa có tài liệu nào"}
                  columnNameLabel="TÊN TÀI LIỆU"
                />
              </JobFileTreeWrapper>
            </StyledBoxContainerContent>
          </Grid>
          <Grid item xs={12} md={6}>
            <SkyFlexGap8 mb={2.5}>
              <StyledIconWrapper noBg>
                <StyledCheckOutLineIcon />
              </StyledIconWrapper>
              <JobSectionTitle variant="h6" gutterBottom mb={0} mt={0}>
                KẾT QUẢ CÔNG VIỆC
              </JobSectionTitle>
            </SkyFlexGap8>
            <StyledBoxContainerContent styledMarginTop fixedHeight="430px">
              {displayData?.flags?.canUpdateFolder && (
                <JobButtonContainer>
                  <ButtonOutline onClick={handleOpenFinalLinkPopup} startIcon={<LinkIcon />}>
                    Thêm link
                  </ButtonOutline>
                  <ButtonOutline component="label" startIcon={<AddIcon />}>
                    Thêm file
                    <input type="file" hidden multiple onChange={handleFinalDocumentsUpload} />
                  </ButtonOutline>
                  <ButtonOutline component="label" startIcon={<FolderIcon />}>
                    Thư mục
                    <input type="file" hidden multiple webkitdirectory="" onChange={handleFinalDocumentsUpload} />
                  </ButtonOutline>
                </JobButtonContainer>
              )}

              {/* Tree View tài liệu kết quả */}
              <JobFileTreeWrapper>
                <FileTreeTable
                  data={finalDocuments}
                  onFileMenuClick={handleDynamicFileMenuClick}
                  MenuIcon={StyledMenuIcon}
                  isView
                  fileName={displayData?.name || data?.taskName}
                  sourceAsync
                  emptyMessage={displayData?.flags?.canUpdateFolder ? "Kéo thả tệp hoặc thư mục vào đây để tải lên" : "Chưa có tài liệu nào"}
                  columnNameLabel="TÊN TÀI LIỆU"
                  columnSourceLabel="NGUỒN TẢI"
                />
              </JobFileTreeWrapper>
            </StyledBoxContainerContent>
          </Grid>
        </Grid>


        {/* ==================== CÔNG VIỆC CON ==================== */}
        <StyledBoxContainerContent styledMarginTop>
          <JobSubTaskHeader>
            <JobSectionTitle variant="h6" mt={0}>
              CÔNG VIỆC CON
            </JobSectionTitle>
            <JobSubTaskActionContainer>
              {selectedSubTasks.length > 0 && (
                <JobDeleteButton variant="contained" startIcon={<DeleteOutline />} onClick={handleDeleteSubTasks}>
                  Xóa
                </JobDeleteButton>
              )}
              {flags?.canCreateTaskSub && <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddSubJob}>
                Tạo công việc con
              </Button>}
            </JobSubTaskActionContainer>
          </JobSubTaskHeader>

          <JobSubTaskTableContainer>
            <CustomTable
              columns={subTaskColumns}
              data={subTasksData}
              customMaxHeight={500}
              disablePaperHeight
              // disableAct
              onlyTable
              enableMoreActions
              moreActions={[
                {
                  id: "viewDetail",
                  label: "Xem chi tiết",
                  icon: <VisibilityOutlined />,
                  onClick: (row) => handleViewSubTask(row),
                },
              ]}
              onMoreAction={handleMoreAction}
              disableEdit
              disableDelete
              onSelectView={handleViewSubTask}
              // onView={handleViewSubTask}
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
            <SkyFlexGap8 mb={1.5}>
              <StyledIconWrapper noBg>
                <StytedHistoryIcon />
              </StyledIconWrapper>
              <JobSectionTitle variant="h6" gutterBottom mb={0} mt={0}>
                LỊCH SỬ HOẠT ĐỘNG
              </JobSectionTitle>
            </SkyFlexGap8>
            <StyledBoxContainerContent fixedHeight="400px">
              <JobScrollWrapper>
                <HistoryJob historyData={historyData} createHandleNoteClick={createHandleNoteClick} />
              </JobScrollWrapper>
            </StyledBoxContainerContent>
          </Grid>
        </JobCommentGridContainer>

        {flags?.isSlowReason &&
          // <StyledBoxContainerContent styledMarginTop>
          <ReasonsDelayJob reasons={dataReasonsDelayJob} currentTaskId={currentTaskId} fecthDataReasonsDelayJob={fecthDataReasonsDelayJob} setReloadData={setReloadData} />
          // </StyledBoxContainerContent>
        }
      </JobMainContent>

      {/* Dialog cập nhật */}
      <UpdateJobDialog
        open={updateDialogState.open}
        onClose={handleCloseUpdateDialog}
        updateDialogState={updateDialogState}
        fetchJobDetail={() => {
          fetchJobDetail();
          fetchSubTasksData();
        }}
        setIsUpdated={setIsUpdated}
        fetchHistory={fetchHistory}
        currentTaskId={currentTaskId}
        isFromProject={isFromProjectProp || !!(displayData?.projectId || data?.projectId)}
        projectId={projectIdProp || displayData?.projectId || data?.projectId || null}
        projectDetail={projectDetailProp || displayData?.project || data?.project || null}
        data={useMemo(() => {
          if (!updateDialogState.open) return {};
          if (updateDialogState.type === 'participants') {
            return {
              assigner: displayData?.assigners?.[0] ? { _id: displayData.assigners[0].processId, name: displayData.assigners[0].name } : null,
              leader: displayData?.directors?.[0] ? { _id: displayData.directors[0].processId, name: displayData.directors[0].name } : null,
              leaderType: displayData?.directors?.[0]?.type === 2 ? 'unit' : 'person',
              coordinators: displayData?.supporters?.map(item => ({ _id: item.processId, name: item.name })) || [],
              coordinatorType: displayData?.supporters?.[0]?.type === 2 ? 'unit' : 'person',
              viewers: displayData?.viewers?.map(item => ({ _id: item.processId, name: item.name })) || [],
              isApprovalRequired: !!displayData?.isApprovalRequired,
            };
          }
          return watch();
        }, [updateDialogState.open, updateDialogState.type, displayData, watch])}
        dataDetail={displayData}
        type={updateDialogState.type}
        startDateParent={data?.deadlineStartParentISO ?? data?.deadlineStartParent ?? data?.startDateISO ?? startDateParent}
        endDateParent={data?.deadlineEndParentISO ?? data?.deadlineEndParent ?? data?.endDateISO ?? endDateParent}
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
        {
          checkCanDeleteFile
          && <MenuItem onClick={handleOpenDeleteDialog}>
            <StyledListItemIcon>
              <DeleteOutline />
            </StyledListItemIcon>
            <ListItemText>Xóa</ListItemText>
          </MenuItem>
        }
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
        {selectedCommentForMenu?.isCreated &&
          <MenuItem onClick={handleDeleteComment}>
            <StyledListItemIcon>
              <DeleteOutline />
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
        viewType={'jobGeneral'}
        parentName={displayData?.name || data?.taskName}
        parentProgress={displayData?.progress ?? 0}
        hasChildren={flags?.hasChildren ?? false}
        isFromProject={isFromProjectProp || !!(displayData?.projectId || data?.projectId)}
        projectId={projectIdProp || displayData?.projectId || data?.projectId || null}
        projectDetail={projectDetailProp || displayData?.project || data?.project || null}
        parentStartDate={displayData?.startDate || data?.startDate || null}
        parentEndDate={displayData?.endDate || data?.endDate || null}
        breadcrumbs={childBreadcrumbs}
      />
      <ViewJobChild
        open={openSubTask}
        onClose={handleCloseSubTask}
        data={subTaskData}
        documentId={subTaskData?.id}
        isViewMode
        title={subTaskData?.name || 'Chi tiết công việc thuộc dự án'}
        breadcrumbs={childBreadcrumbs}
        startDateParent={data?.deadlineStartParentISO ?? data?.deadlineStartParent ?? data?.startDateISO ?? startDateParent}
        endDateParent={data?.deadlineEndParentISO ?? data?.deadlineEndParent ?? data?.endDateISO ?? endDateParent}
        isFromProject
        projectId={projectIdProp || data?.projectId || data?.project?.id}
        projectDetail={projectDetailProp}
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
      <LoadingDialog open={isLoading} >
        Đang tải tài liệu, vui lòng đợi...
      </LoadingDialog>

      <CustomDialog
        open={linkPopupOpen}
        onClose={handleCloseLinkPopup}
        onSave={handleSaveLink}
        title="Gắn link tài liệu"
        titleButton="Lưu"
        disabled={!linkFormValues.documentName.trim() || !linkFormValues.documentUrl.trim() || !!linkErrors.documentUrl}
      >
        <SkyGrid container spacing={2}>
          <SkyGrid item xs={12}>
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
          </SkyGrid>
          <SkyGrid item xs={12}>
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
          </SkyGrid>
        </SkyGrid>
      </CustomDialog>
    </CustomSwipper>
  );
};

export default withSharedComponents(ViewJob);