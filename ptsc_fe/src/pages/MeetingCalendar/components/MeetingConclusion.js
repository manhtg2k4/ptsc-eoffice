import React, { useState, useRef, useEffect, useCallback } from "react";
import { TableBody, TableRow, TableCell, TextField, Checkbox, Tooltip } from "@mui/material";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import RelatedMeetingModal from "./RelatedMeetingModal";
import { apiUploadFile } from "@services/FileUpload/fileUpload";
import { useToast } from "@components/common/ToastProvider";
import { useSelector } from "react-redux";
import axiosInstance from "@utils/axiosInstance";
import api from "@services/api";
import { API_EXPORT_REPORT,APP_BASE, API_ADD_MEETING_SCHEDULE, API_VIEW_FILE, API_JOB_TO_MEETING, API_UPDATE_MEETING_CONCLUSION, API_XLSX_TO_PDF } from "@EnvironmentFile/constants/urlConfig";
import dayjs from "dayjs";
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import DescriptionIcon from '@mui/icons-material/Description';
// import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import AddNewJob from "@pages/WorkManagement/components/AddJobToMeeting";
import ViewMeetingSchedule from "./ViewMeetingSchedule";
import CustomTableBorderTree from "@components/CustomTable/CustomTableBorderTree";
import ViewJobToMeeting from "@pages/WorkManagement/components/ViewJobToMeeting";
import { 
  StyledHeaderContent,
  StyledDivider
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import {
  SkyMenu,
  SkyMenuItem,
  SkyListItemIcon,
  SkyListItemText,
  SkyIconButton,
  SkyMenuIcon,
  SkyBox,
  SkyTypography,
  SkyHiddenInput,
} from "@styles/SkyStyles";
import CustomDialog from "@components/CustomDialog/CustomDialog";

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

import {
  ConclusionContainer,
  ConclusionSection,
  // SectionTitle,
  StyledTable,
  StyledTableHead,
  RelatedMeetingCard,
  RelatedMeetingTitle,
  RelatedMeetingTime,
  // RemoveIconButton, // Có thể bỏ nếu không dùng nữa
  NoFileText,
  // StyledDeleteIconButton, // Có thể bỏ nếu không dùng nữa
  // StyledDeleteIcon, // Có thể bỏ nếu không dùng nữa
  StyledAddIcon,
  AddLinkBox,
  // StyledCloseIcon, // Có thể bỏ nếu không dùng nữa
  TableCellSTT,
  TableCellAction,
  TableCellCheckbox,
  // BulkExportButton,
  ExportIcon,
  HeaderActionBox,
  // UploadConclusionButton,
  // AddConclusionButton,
  // AddLinkConclusionButton,
  // UploadContainer,
  FileItemContainer,
  FileItemInfo,
  StyledInsertDriveFileIcon,
  // FileName,
  FileMeta,
  FileListContainer,
  FileDescriptionBox,
  FileRowInfo,
  FileNameButton,
  FileMetaRow,
  StyledDownloadIcon,
  TopRightActionBox,
  SectionHeader,
  TotalTaskSummaryText,
  TaskGroup,
  TaskGroupHeader,
  TaskGroupTitle,
  TaskGroupAction,
  TaskCountBadge,
  TaskTableContainer,
} from "@pages/MeetingCalendar/componentStyle/MeetingConclusion.styles";
import FilePreviewDialog from "@components/UploadFile/components/FilePreviewDialog";
import { styled } from "@mui/material/styles";

// const TasksTableCell = styled(TableCell)(({ theme }) => ({
//   paddingLeft: '40px',
//   paddingRight: '40px',
//   paddingTop: theme.spacing(2),
//   paddingBottom: theme.spacing(2),
// }));

// const TasksSummaryText = styled('div')(({ theme }) => ({
//   marginBottom: theme.spacing(1),
//   fontWeight: 600,
//   color: theme.palette.primary.main,
// }));

const ErrorListItemText = styled(SkyListItemText)(({ theme }) => ({
  color: theme.palette.error.main,
}));

const SmallVisibilityIcon = styled(VisibilityOutlinedIcon)(() => ({

}));

const SmallEditIcon = styled(EditOutlinedIcon)(() => ({

}));

const SmallPersonAddIcon = styled(PersonAddAltOutlinedIcon)(() => ({

}));

const SmallDeleteIcon = styled(DeleteOutlineIcon)(() => ({

  color: 'error',
}));

const DATA_COLUMN_CONFIG = [
  { label: "Tên công việc", key: "name", name: "name", width: "400px" },
  { label: "Tiến độ", key: "progressView", name: "progressView", width: "180px", margin: "center" },
  { label: "Bắt đầu", key: "startDate", name: "startDate", width: "120px", margin: "center" },
  { label: "Hạn kết thúc", key: "endDate", name: "endDate", width: "120px", margin: "center" },
  { label: "Người chủ trì", key: "director", name: "director", width: "180px" },
  { label: "Trạng thái", key: "processStatusUi", name: "processStatusUi", width: "150px", margin: "center" },
];

const TABLE_ITEM_PROPS = { 
  id: "meeting_tasks_table",
  props: { 
    isShowSTT: false, 
    hideCheckbox: true, 
    configs: [
      {
        id: "view-job-detail",
        config: {
          icon: "Visibility",
          displayName: "Xem chi tiết",
          actionType: "view",
          color: "primary",
        },
      },
    ],
  } 
};
const EMPTY_ARRAY = [];

const canEditMeetingConclusion = (userRoles, isDelegating) =>
  !isDelegating &&
  !!(userRoles?.isChairman || userRoles?.isSecretary || userRoles?.isPersonalApprove);

const ActionMenu = ({ onDelete, onView, onEdit, onAssign, onExport, disabled }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = useCallback((event) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleViewClick = useCallback(() => {
    onView();
    handleClose();
  }, [onView, handleClose]);

  const handleEditClick = useCallback(() => {
    onEdit();
    handleClose();
  }, [onEdit, handleClose]);

  const handleAssignClick = useCallback(() => {
    onAssign();
    handleClose();
  }, [onAssign, handleClose]);

  const handleDeleteClick = useCallback(() => {
    onDelete();
    handleClose();
  }, [onDelete, handleClose]);

  const handleExportClick = useCallback(() => {
    onExport();
    handleClose();
  }, [onExport, handleClose]);

  if (disabled) return null;

  return (
    <>
      <SkyIconButton onClick={handleClick} size="small">
        <SkyMenuIcon />
      </SkyIconButton>
      <SkyMenu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {onView && (
          <SkyMenuItem onClick={handleViewClick}>
            <SkyListItemIcon>
              <SmallVisibilityIcon />
            </SkyListItemIcon>
            <SkyListItemText>Xem chi tiết</SkyListItemText>
          </SkyMenuItem>
        )}
        {onEdit && (
           <SkyMenuItem onClick={handleEditClick}>
             <SkyListItemIcon>
               <SmallEditIcon />
             </SkyListItemIcon>
             <SkyListItemText>Chỉnh sửa</SkyListItemText>
           </SkyMenuItem>
         )}
      
        {onDelete && (
           <SkyMenuItem onClick={handleDeleteClick}>
             <SkyListItemIcon>
               <SmallDeleteIcon />
             </SkyListItemIcon>
             <ErrorListItemText>Xóa</ErrorListItemText>
           </SkyMenuItem>
         )}
           {onAssign && (
           <SkyMenuItem onClick={handleAssignClick}>
             <SkyListItemIcon>
               <SmallPersonAddIcon />
             </SkyListItemIcon>
             <SkyListItemText>Giao việc</SkyListItemText>
           </SkyMenuItem>
         )}
         {onExport && (
           <SkyMenuItem onClick={handleExportClick}>
             <SkyListItemIcon>
               <DescriptionIcon />
             </SkyListItemIcon>
             <SkyListItemText>Xuất báo cáo</SkyListItemText>
           </SkyMenuItem>
         )}
      </SkyMenu>
    </>
  );
};

const ConclusionRow = ({ 
  item, 
  index, 
  onDelete, 
  onChange, 
  userRoles, 
  onAssign, 
  onStartEdit, 
  onExport, 
  isDelegating,
  onSelect,
  isSelected,
  hasTasks
}) => {
  const [isEditingRow, setIsEditingRow] = useState(false);

  const handleDelete = useCallback(() => {
    onDelete(item.id);
  }, [onDelete, item.id]);

  const handleChange = useCallback((e) => {
    onChange(item.id, e.target.value);
  }, [onChange, item.id]);

  const handleEdit = useCallback(() => {
    setIsEditingRow(true);
    onStartEdit?.(item.id);
  }, [onStartEdit, item.id]);
  
  const handleSelect = useCallback((e) => {
    onSelect(item.id, e.target.checked);
  }, [onSelect, item.id]);

  const handleAssign = useCallback(() => {
    onAssign(item);
  }, [onAssign, item]);

  const handleExport = useCallback(() => {
    onExport?.(item);
  }, [onExport, item]);

  const isReadOnly = !canEditMeetingConclusion(userRoles, isDelegating);

  // Nếu là ID chuỗi (đã lưu) thì phải ở chế độ isEditingRow mới được sửa
  const isFieldDisabled = isReadOnly || (typeof item.id === 'string' && !isEditingRow);

  return (
    <TableRow>
      <TableCellCheckbox align="center">
        <Checkbox 
          checked={isSelected}
          onChange={handleSelect}
          disabled={!hasTasks}
          size="small"
        />
      </TableCellCheckbox>
      <TableCell align="center">{index + 1}</TableCell>
      <TableCell>
        <TextField
          fullWidth
          variant="standard"
          placeholder="Nhập kết luận cuộc họp ....."
          value={item.content}
          onChange={handleChange}
          InputProps={{ disableUnderline: true }}
          disabled={isFieldDisabled}
        />
      </TableCell>
      <TableCell align="center">
        {!isReadOnly && (
        <ActionMenu 
          onDelete={!isReadOnly ? handleDelete : undefined}
          onEdit={!isReadOnly && typeof item.id === 'string' && !isEditingRow ? handleEdit : undefined}
          onAssign={!isReadOnly && typeof item.id === 'string' ? handleAssign : undefined}
          onExport={typeof item.id === 'string' ? handleExport : undefined}
        />
        )}
      </TableCell>
    </TableRow>
  );
};

const TaskFromConclusionGroup = ({ item, index, tasks, isLoadingTasks, onAction }) => {
  const [isOpen, setIsOpen] = useState(index === 0);

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return (
    <TaskGroup>
      <TaskGroupHeader onClick={toggleOpen}>
        <TaskGroupTitle>
          <span>{index + 1}.</span>
          <span>{item.content || "Chưa có nội dung kết luận"}</span>
        </TaskGroupTitle>
        <TaskGroupAction>
          <TaskCountBadge>
            Công việc đã giao : {tasks?.length || 0}
          </TaskCountBadge>
          {isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </TaskGroupAction>
      </TaskGroupHeader>
      {isOpen && (
        <TaskTableContainer>
           <CustomTableBorderTree
              data={tasks || EMPTY_ARRAY}
              loading={isLoadingTasks}
              customMaxHeight={500}
              type="meeting_tasks_tree"
              item={TABLE_ITEM_PROPS}
              dataColumn={DATA_COLUMN_CONFIG}
              onAction={onAction}
            />
        </TaskTableContainer>
      )}
    </TaskGroup>
  );
};

const MeetingConclusion = React.forwardRef(({ meetingData, userRoles, sharedComponents, isDelegating }, ref) => {
  const isReadOnly = !canEditMeetingConclusion(userRoles, isDelegating);
  const meetingId = meetingData?.id || meetingData?._id;
  const [files, setFiles] = useState([]);
  const [conclusions, setConclusions] = useState([{ id: 1, content: "" }]);
  const [relatedMeetings, setRelatedMeetings] = useState([]);
  const [viewingFile, setViewingFile] = useState({
    open: false,
    url: null,
    name: "",
    type: null,
  });
  const fileInputRef = useRef(null);
  const toast = useToast();
  const { dataUser: authUser } = useSelector((state) => state.auth || {});
  const currentUser = authUser?.user || {};
  const currentUserId = currentUser._id || currentUser.id || "";

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [openAddNewJob, setOpenAddNewJob] = useState(false);
  const [selectedConclusion, setSelectedConclusion] = useState(null);
  const [conclusionTasks, setConclusionTasks] = useState({});
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [openViewMeeting, setOpenViewMeeting] = useState(false);
  const [viewingMeetingId, setViewingMeetingId] = useState(null);
  const [openViewJob, setOpenViewJob] = useState(false);
  const [viewingJob, setViewingJob] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFileDownload, setIsLoadingFileDownload] = useState(false);
  const [selectedConclusions, setSelectedConclusions] = useState([]);
  const [saveVersion, setSaveVersion] = useState(0);
  const [editingIds, setEditingIds] = useState(new Set());
  const [openDeleteConclusionDialog, setOpenDeleteConclusionDialog] = useState(false);
  const [conclusionToDelete, setConclusionToDelete] = useState(null);



  const conclusionsRef = useRef(conclusions);
  useEffect(() => {
    conclusionsRef.current = conclusions;
  }, [conclusions]);

  const handleViewRelatedMeeting = useCallback((id) => () => {
    setViewingMeetingId(id);
    setOpenViewMeeting(true);
  }, []);

  const handleTaskAction = useCallback((action, row) => {
    if (action.id === "view-job-detail") {
      setViewingJob(row);
      setOpenViewJob(true);
    }
  }, []);

  const handleCloseViewRelatedMeeting = useCallback(() => {
    setOpenViewMeeting(false);
    setViewingMeetingId(null);
  }, []);
  const handleCloseViewJob = useCallback(() => {
    setOpenViewJob(false);
    setViewingJob(null);
  }, []);


  const handleOpenAddNewJob = useCallback((conclusion) => {
    setSelectedConclusion(conclusion);
    setOpenAddNewJob(true);
  }, []);

  const handleCloseAddNewJob = useCallback(() => {
    setSelectedConclusion(null);
    setOpenAddNewJob(false);
  }, []);
  const fetchConclusionTasks = useCallback(async (currentConclusions) => {
    if (!meetingId) return;
    const targetConclusions = currentConclusions || conclusionsRef.current;
    if (!targetConclusions || targetConclusions.length === 0) return;

    setIsLoadingTasks(true);
    try {
      const tasksMap = {};
      const results = await Promise.all(
        targetConclusions.map(async (c) => {
          if (!c.id) return { id: c.id, tasks: [] };
          try {
            const response = await axiosInstance.get(
              `${API_JOB_TO_MEETING}/${meetingId}/conclusions/${c.id}/tasks`
            );
            return { id: c.id, tasks: response?.data || response || [] };
          } catch (error) {
            logger.error(`Error fetching tasks for conclusion ${c.id}:`, error);
            return { id: c.id, tasks: [] };
          }
        })
      );

      results.forEach((result) => {
        if (result) {
          tasksMap[result.id] = result.tasks;
        }
      });

      setConclusionTasks(tasksMap);
    } catch (error) {
      logger.error("Error fetching conclusion tasks:", error);
    } finally {
      setIsLoadingTasks(false);
    }
  }, [meetingId]);

  const handleJobSuccess = useCallback(() => {
    toast("Giao việc thành công", "success");
    fetchConclusionTasks();
    handleCloseAddNewJob();
  }, [toast, fetchConclusionTasks, handleCloseAddNewJob]);

  const handleExportReport = useCallback(async (item) => {
    const tasks = conclusionTasks[item.id];
    if (!tasks || tasks.length === 0) {
      toast("Chưa có công việc được tạo từ kết luận này!", "warning");
      return;
    }

    try {
      setIsLoading(true);
      const fileName = `Ket_luan_cuoc_hop_${meetingData?.meetingTitle || 'Bao_cao'}`;
      const response = await axiosInstance.get(API_EXPORT_REPORT, {
        params: {
          meetingConclusionId: item?.id,
          exportType: "xlsx",
          viewConfigCode: "congviectucuochop"
        },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data || response]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${fileName}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast("Xuất báo cáo thành công", "success");
    } catch (error) {
      toast("Có lỗi khi xuất báo cáo", "error");
    } finally {
      setIsLoading(false);
    }
  }, [meetingId, meetingData, toast, conclusionTasks]);
  
  const handleBulkExportReport = useCallback(async () => {
    if (selectedConclusions.length === 0) return;

    try {
      setIsLoading(true);
      const fileName = `Ket_luan_cuoc_hop_${meetingData?.meetingTitle || 'Bao_cao'}`;
      const response = await axiosInstance.get(API_EXPORT_REPORT, {
        params: {
          meetingConclusionId: selectedConclusions.join(","),
          exportType: "xlsx",
          viewConfigCode: "congviectucuochop"
        },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data || response]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${fileName}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast("Xuất báo cáo thành công", "success");
    } catch (error) {
      toast("Có lỗi khi xuất báo cáo", "error");
    } finally {
      setIsLoading(false);
    }
  }, [meetingData, toast, selectedConclusions]);

  const handleSelectRow = useCallback((id, checked) => {
    setSelectedConclusions(prev => 
      checked ? [...prev, id] : prev.filter(item => item !== id)
    );
  }, []);

  const handleSelectAll = useCallback((e) => {
    if (e.target.checked) {
      // Chỉ chọn những cái có task
      const validIds = conclusions
        .filter(c => conclusionTasks[c.id]?.length > 0)
        .map(c => c.id);
      setSelectedConclusions(validIds);
    } else {
      setSelectedConclusions([]);
    }
  }, [conclusions, conclusionTasks]);



  const fetchData = useCallback(async () => {
    if (!meetingId) return;
    try {
      // 1. Lấy danh sách kết luận và cuộc họp liên quan
      const response = await axiosInstance.get(`${API_ADD_MEETING_SCHEDULE}/${meetingId}/conclusion`);
      // console.log("response", response);

      let initialFile = null;

      // Based on the provided log, the 'response' object is the data payload itself.
      const { conclusionItems, relatedMeetings: linkedMeetings, files: apiFiles } = response || {};

      const hasData = (conclusionItems && conclusionItems.length > 0) || 
                      (linkedMeetings && linkedMeetings.length > 0) || 
                      (apiFiles && apiFiles.length > 0);
      
      setIsUpdateMode(hasData);

      if (conclusionItems && conclusionItems.length > 0) {
        const mappedConclusions = conclusionItems.map((item, idx) => ({
          id: item.id || idx + 1,
          content: item.content
        }));
        setConclusions(mappedConclusions);
        fetchConclusionTasks(mappedConclusions);
        setIsUpdateMode(true);
      } else {
        setConclusions([{ id: 1, content: "" }]);
        setIsUpdateMode(false);
      }

      if (linkedMeetings && linkedMeetings.length > 0) {
        setRelatedMeetings(linkedMeetings.map(m => ({
          id: m.id,
          title: m.title,
          time: `${m.meetingTime || ''} ngày ${m.meetingDate || ''}`,
          items: [1, 2]
        })));
      }

      if (apiFiles && apiFiles.length > 0) {
        initialFile = apiFiles[0];
        setFiles(apiFiles.map(f => ({ 
          _id: f.id, 
          name: f.file_name || f.name,
          size: f.file_size,
          time: f.created_at || f.updated_at
        })));
      }

      // 2. Nếu file vẫn trống, lấy theo object_type
      if (!initialFile) {
        const fileRes = await axiosInstance.get(`${APP_BASE}/api/files/by-object`, {
          params: {
            "object_type": 'RecordMeeting',
            "object_id": meetingId
          }
        });
        const filesData = fileRes?.data || fileRes || [];
        if (Array.isArray(filesData) && filesData.length > 0) {
          setFiles(filesData.map(f => ({ 
            _id: f.id || f._id, 
            name: f.file_name || f.name,
            size: f.file_size,
            time: f.created_at || f.updated_at
          })));
        }
      }

      setEditingIds(new Set());
      setSelectedConclusions(prev => prev.filter(id => conclusionItems?.some(c => c.id === id)));
    } catch (error) {
      logger.error("Error fetching conclusion data:", error);
    }
  }, [meetingId, fetchConclusionTasks]);

  const [isUpdateMode, setIsUpdateMode] = useState(false);

  useEffect(() => {
    fetchData();
  }, [meetingId]);

  React.useImperativeHandle(ref, () => ({
    getConclusionData: () => ({
      conclusions: conclusions
        .filter(c => c.content.trim() !== "")
        .map(c => ({
          id: c.id,
          content: c.content,
          createdBy: currentUserId
        })),
      relatedMeetingIds: relatedMeetings.map(m => m.id),
      isUpdateMode
    })
  }));

  const handleUploadClick = () => {
    if (isDelegating) return;
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      try {
        const response = await apiUploadFile(selectedFile, "RecordMeeting", meetingId);
        if (response?.data) {
           const newFile = response.data;
           setFiles(prev => [...prev, { 
             _id: newFile.id, 
             name: newFile.file_name || selectedFile.name,
             size: newFile.file_size || selectedFile.size,
             time: newFile.created_at || new Date().toISOString()
           }]);
        }
        toast("Tải lên biên bản họp thành công", "success");
        fetchData();
      } catch (error) {
        toast("Lỗi khi tải lên biên bản họp", "error");
      }
    }
  };

  const handleRemoveFile = useCallback((id) => () => {
    setFileToDelete(id);
    setOpenDeleteDialog(true);
  }, []);

  const handleConfirmDeleteFile = useCallback(async () => {
    if (!fileToDelete) return;

    try {
      await axiosInstance.delete(`${APP_BASE}/api/files/${fileToDelete}`);
      setFiles(prev => prev.filter(f => f._id !== fileToDelete));
      toast("Xóa file thành công", "success");
      setOpenDeleteDialog(false);
      setFileToDelete(null);
      fetchData(); 
    } catch (error) {
       // Fallback: If api delete fails, try deleting from state if it was a local add (though unlikely here as we upload immediately)
      logger.error("Error deleting file:", error);
      toast("Lỗi khi xóa file", "error");
    }
  }, [fileToDelete, toast, fetchData]);

  const handleCloseDeleteDialog = useCallback(() => {
    setOpenDeleteDialog(false);
    setFileToDelete(null);
  }, []);

  const createViewFileHandler = useCallback(
    (file) => async () => {
      if (!file || !file._id) {
        toast("File không hợp lệ hoặc không có ID.", "warning");
        return;
      }
      try {
        setIsLoading(true);
        const fileName = file.name || file.file_name || "file";
        const lower = fileName.toLowerCase();
        const isDoc = /\.(doc|docx)$/i.test(lower);
        const isExcel = /\.(xls|xlsx)$/i.test(lower);
        const isBrowserFile = /\.(pdf|jpeg|jpg|png|gif|webp|txt)$/i.test(lower);
        const fileId = file._id || file.id;

        let blob;
        let previewName = fileName;

        if (isDoc) {
          const conversionApi = `${APP_BASE}/api/doc-url-to-pdf?id=${fileId}`;
          const res = await axiosInstance.get(conversionApi, { responseType: "blob", timeout: 0 });
          blob = res.data || res;
        } else if (isExcel) {
          // 1. Download file from server
          const downloadUrl = `${APP_BASE}/api/files/download/${fileId}`;
          const fileRes = await axiosInstance.get(downloadUrl, {
            responseType: "blob",
            timeout: 0,
          });

          // 2. Convert to PDF
          const formData = new FormData();
          formData.append("file", new File([fileRes.data || fileRes], fileName));

          const res = await api.post(API_XLSX_TO_PDF, formData, {
            responseType: "blob",
            headers: {
              "Content-Type": "multipart/form-data",
            },
            timeout: 0,
          });

          blob = res.data || res;
        } else if (isBrowserFile) {
          const response = await axiosInstance.get(
            `${API_VIEW_FILE}/${fileId}`,
            { responseType: "blob" }
          );
          blob = response.data || response;
        } else {
          toast("Định dạng file không được hỗ trợ xem trước.", "warning");
          return;
        }

        const objectUrl = URL.createObjectURL(blob);
        const fileExtension = fileName.split(".").pop().toLowerCase();
        let fileType = null;
        if (["jpg", "jpeg", "png", "gif"].includes(fileExtension) && isBrowserFile) {
          fileType = "image";
        } else {
          // Office files after conversion are PDF
          fileType = "pdf";
        }

        setViewingFile({
          open: true,
          url: objectUrl,
          name: previewName,
          type: fileType,
        });
      } catch (error) {
        toast("Không thể tải hoặc chuyển đổi file để xem trước.", "error");
        logger.error("Preview error:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  const handleCloseFileViewer = useCallback(() => {
    if (viewingFile.url) URL.revokeObjectURL(viewingFile.url);
    setViewingFile({ open: false, url: null, name: "", type: null });
  }, [viewingFile.url]);

  const handleAddConclusion = () => {
    if (isDelegating) return;
    const newId = conclusions.length > 0 ? Math.max(...conclusions.map((c) => c.id)) + 1 : 1;
    setConclusions([...conclusions, { id: newId, content: "" }]);
  };

  const handleDeleteConclusion = useCallback((id) => {
    // Nếu là ID chuỗi (đã lưu trên server) -> Mở popup xác nhận
    if (typeof id === 'string') {
      setConclusionToDelete(id);
      setOpenDeleteConclusionDialog(true);
      return;
    }

    // Nếu là ID số (chưa lưu) -> Xóa luôn trên FE
    const updatedConclusions = conclusions.filter((c) => c.id !== id);
    setConclusions(updatedConclusions);
    setEditingIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setSelectedConclusions(prev => prev.filter(item => item !== id));
  }, [conclusions]);

  const handleConfirmDeleteConclusion = async () => {
    if (!conclusionToDelete) return;
    setIsLoading(true);
    try {
      await axiosInstance.delete(`${API_UPDATE_MEETING_CONCLUSION}/${conclusionToDelete}`);
      toast("Xóa kết luận thành công!", "success");
      
      // Xóa khỏi local state
      const updatedConclusions = conclusions.filter((c) => c.id !== conclusionToDelete);
      setConclusions(updatedConclusions);
      setEditingIds(prev => {
        const next = new Set(prev);
        next.delete(conclusionToDelete);
        return next;
      });
      setSelectedConclusions(prev => prev.filter(item => item !== conclusionToDelete));
      setSaveVersion(prev => prev + 1);
      setOpenDeleteConclusionDialog(false);
      setConclusionToDelete(null);
      fetchData();
    } catch (error) {
      toast(error?.response?.data?.message || error?.message || "Có lỗi xảy ra khi xóa kết luận!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseDeleteConclusionDialog = useCallback(() => {
    setOpenDeleteConclusionDialog(false);
    setConclusionToDelete(null);
  }, []);

  const handleConclusionChange = (id, value) => {
    setConclusions(
      conclusions.map((c) => (c.id === id ? { ...c, content: value } : c))
    );
  };

  const handleStartEdit = useCallback((id) => {
    if (typeof id === 'string') { // Only track existing items for editing
      setEditingIds(prev => new Set(prev).add(id));
    }
  }, []);

  const [openRelatedModal, setOpenRelatedModal] = useState(false);

  const handleOpenRelatedModal = () => {
    if (isDelegating) return;
    setOpenRelatedModal(true);
  };

  const handleCloseRelatedModal = () => {
    setOpenRelatedModal(false);
  };

  const handleConfirmRelatedMeetings = (selectedMeetings) => {
    const newRelatedMeetings = selectedMeetings.map(meeting => ({
      id: meeting.id || meeting._id,
      title: meeting.meetingTitle || meeting.title,
      time: `${meeting.meetingTime || (meeting.startTime ? `${meeting.startTime} - ${meeting.endTime}` : '00:00 - 00:00')} ngày ${meeting.meetingDate || meeting.startDate || ''}`,
      items: meeting.conclusions ? meeting.conclusions.map((c, i) => i + 1) : [1, 2]
    }));
    
    const uniqueNewMeetings = newRelatedMeetings.filter(
      newM => !relatedMeetings.some(existingM => existingM.id === newM.id)
    );

    setRelatedMeetings([...relatedMeetings, ...uniqueNewMeetings]);
  };

  const handleRemoveRelatedMeeting = useCallback((id) => () => {
    setRelatedMeetings(prev => prev.filter(m => m.id !== id));
  }, []);

  const handleSaveConclusion = async () => {
    if (isDelegating) return;
    setIsLoading(true);
    try {
      const allValid = conclusions.filter(c => c.content.trim() !== "");
      
      // Tách nhóm: Mới hoàn toàn (không có ID chuỗi)
      const newItems = allValid.filter(c => typeof c.id !== 'string');
      
      // Tách nhóm: Đã tồn tại VÀ có nhấn Chỉnh sửa
      const touchedExistingOnes = allValid.filter(c => typeof c.id === 'string' && editingIds.has(c.id));

      const promises = [];

      // 1. Nếu có hàng mới -> Gọi POST để tạo (mặc định status: 1)
      if (newItems.length > 0) {
        const postPayload = {
          conclusions: newItems.map(c => ({
            content: c.content,
            createdBy: currentUserId
          })),
          relatedMeetingIds: relatedMeetings.map(m => m.id),
        };
        promises.push(axiosInstance.post(`${API_ADD_MEETING_SCHEDULE}/${meetingId}/create/conclusions`, postPayload));
      }

      // 2. Nếu có hàng cũ được "Chỉnh sửa" -> Gọi PATCH để cập nhật
      if (touchedExistingOnes.length > 0) {
        const patchPayload = {
          conclusions: touchedExistingOnes.map(c => ({
            id: c.id,
            content: c.content,
            createdBy: currentUserId
          })),
          relatedMeetingIds: relatedMeetings.map(m => m.id),
        };
        promises.push(axiosInstance.patch(`${API_UPDATE_MEETING_CONCLUSION}/${meetingId}`, patchPayload));
      }

      // 3. Nếu chỉ thay đổi Liên kết mà không sửa kết luận cũ (và không thêm kết luận mới)
      // ta vẫn cần gọi PATCH để cập nhật quan hệ
      if (promises.length === 0 && isUpdateMode) {
          const relationPayload = {
            conclusions: allValid.filter(c => typeof c.id === 'string').map(c => ({
              id: c.id,
              content: c.content,
              createdBy: c.createdBy || currentUserId
            })),
            relatedMeetingIds: relatedMeetings.map(m => m.id),
          };
          promises.push(axiosInstance.patch(`${API_UPDATE_MEETING_CONCLUSION}/${meetingId}`, relationPayload));
      }

      if (promises.length > 0) {
        await Promise.all(promises);
        toast("Lưu kết luận cuộc họp thành công!", "success");
        setSaveVersion(prev => prev + 1);
        fetchData();
        setEditingIds(new Set()); 
      } else {
        toast("Không có thay đổi nào để lưu", "info");
      }
    } catch (error) {
       // eslint-disable-next-line no-console
       console.error("Error saving conclusion:", error);
       toast(error?.response?.data?.message || error?.message || "Có lỗi xảy ra khi lưu kết luận!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const { ButtonOutline } = sharedComponents;

  const totalTasks = Object.values(conclusionTasks).reduce((acc, tasks) => acc + (tasks?.length || 0), 0);

  const handleDownload = useCallback((file) => async () => {
    if (!file || !file._id) {
      toast("File không hợp lệ hoặc not found.", "warning");
      return;
    }
    if (isLoadingFileDownload) return;
    try {
      setIsLoadingFileDownload(true);
      const fileId = file._id;
      const fileName = file.name || "file";
      
      const downloadUrl = `${APP_BASE}/api/files/download/${fileId}`;
      const response = await axiosInstance.get(downloadUrl, {
        responseType: "blob",
        timeout: 0,
      });

      const blob = response.data || response;
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      
      toast("Tải file thành công", "success");
    } catch (error) {
      toast("Lỗi khi tải file", "error");
    } finally {
      setIsLoadingFileDownload(false);
    }
  }, [toast, isLoadingFileDownload]);

  return (
    <ConclusionContainer>
      {/* BIÊN BẢN HỌP */}
      <ConclusionSection >
        <StyledHeaderContent variant="h6">Biên bản cuộc họp</StyledHeaderContent>
        <StyledDivider />
        <SkyHiddenInput
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        
        {!isReadOnly && (
            <ButtonOutline
              variant="contained"
              startIcon={<FileUploadIcon />}
              onClick={handleUploadClick}
              isRelative
            >
              Tải Lên
            </ButtonOutline>
        )}
        
        {files.length === 0 ? (
          // <UploadContainer>
            <NoFileText variant="body2" align="center">
              Chưa có biên bản cuộc họp
            </NoFileText>
          // </UploadContainer>
        ) : (
          <FileListContainer>
            {files.map((f, index) => (
              <FileItemContainer key={f._id || index}>
                <FileItemInfo>
                  <StyledInsertDriveFileIcon />
                  <FileDescriptionBox>
                    <FileRowInfo>
                      <FileNameButton 
                        component="button" 
                        onClick={createViewFileHandler(f)}
                      >
                        {f.name}
                      </FileNameButton>
                      <FileMetaRow onClick={handleDownload(f)}>
                        <Tooltip title="Tải xuống">
                          {f.size ? `${(f.size / (1024 * 1024)).toFixed(1)} MB ` : '0 MB '}
                            <StyledDownloadIcon/>
                        </Tooltip>
                      </FileMetaRow>
                    </FileRowInfo>
                    <FileMeta>
                      Tải lên lúc {f.time ? dayjs(f.time).format('HH:mm - DD/MM/YYYY') : dayjs().format('HH:mm - DD/MM/YYYY')}
                    </FileMeta>
                  </FileDescriptionBox>
                </FileItemInfo>
                <ActionMenu 
                  onDelete={!isReadOnly ? handleRemoveFile(f._id) : undefined}
                  onView={createViewFileHandler(f)}
                />
              </FileItemContainer>
            ))}
          </FileListContainer>
        )}
      </ConclusionSection>

      {/* KẾT LUẬN CUỘC HỌP */}
      <ConclusionSection >
        <SectionHeader>
            <StyledHeaderContent variant="h6" mb={0}>Kết luận cuộc họp</StyledHeaderContent>
            {!isReadOnly && (
              <HeaderActionBox>
                {selectedConclusions.length > 0 && (
                  <ButtonOutline
                    onClick={handleBulkExportReport}
                    disabled={isLoading}
                    startIcon={<ExportIcon />}
                    variant="outlined"
                  >
                    Xuất báo cáo
                  </ButtonOutline>
                )}
                <ButtonOutline
                  onClick={handleSaveConclusion}
                  disabled={isLoading || isDelegating}
                  variant="outlined"
                >
                  Lưu
                </ButtonOutline>
              </HeaderActionBox>
            )}
        </SectionHeader>
        <StyledDivider />
        {!isReadOnly && (
          <ButtonOutline
            variant="contained"
            startIcon={<StyledAddIcon />}
            onClick={handleAddConclusion}
          >
            Thêm kết luận
          </ButtonOutline>
        )}
        <StyledTable>
          <StyledTableHead>
            <TableRow>
              <TableCellCheckbox align="center">
                <Checkbox 
                  size="small"
                  indeterminate={selectedConclusions.length > 0 && selectedConclusions.length < conclusions.filter(c => conclusionTasks[c.id]?.length > 0).length}
                  checked={conclusions.filter(c => conclusionTasks[c.id]?.length > 0).length > 0 && selectedConclusions.length === conclusions.filter(c => conclusionTasks[c.id]?.length > 0).length}
                  onChange={handleSelectAll}
                />
              </TableCellCheckbox>
              <TableCellSTT>STT</TableCellSTT>
              <TableCell>Nội dung kết luận</TableCell>
              <TableCellAction>Hành động</TableCellAction>
            </TableRow>
          </StyledTableHead>
          <TableBody>
            {conclusions.map((item, index) => (
              <ConclusionRow
                key={`${item.id}-${saveVersion}`}
                item={item}
                index={index}
                onDelete={handleDeleteConclusion}
                onChange={handleConclusionChange}
                userRoles={userRoles}
                onAssign={handleOpenAddNewJob}
                onStartEdit={handleStartEdit}
                onExport={handleExportReport}
                isDelegating={isDelegating}
                onSelect={handleSelectRow}
                isSelected={selectedConclusions.includes(item.id)}
                hasTasks={conclusionTasks[item.id]?.length > 0}
              />
            ))}
          </TableBody>
        </StyledTable>
      </ConclusionSection>

      {/* CÔNG VIỆC TỪ KẾT LUẬN */}
      <ConclusionSection>
        <SectionHeader>
          <StyledHeaderContent variant="h6">Công việc từ kết luận</StyledHeaderContent>
          <TotalTaskSummaryText>
            Tổng số công việc đã giao từ kết luận : {totalTasks}
          </TotalTaskSummaryText>
        </SectionHeader>
        <StyledDivider />
        
        {conclusions.filter(c => c.content?.trim()).map((item, index) => (
          <TaskFromConclusionGroup
            key={item.id}
            item={item}
            index={index}
            tasks={conclusionTasks[item.id]}
            isLoadingTasks={isLoadingTasks}
            onAction={handleTaskAction}
          />
        ))}
        
        {conclusions.filter(c => c.content?.trim()).length === 0 && (
          <NoFileText variant="body2" align="center">
            Chưa có kết luận nào để hiển thị công việc
          </NoFileText>
        )}
      </ConclusionSection>

      {/* CUỘC HỌP LIÊN QUAN */}
      <ConclusionSection>
        <SectionHeader>
          <StyledHeaderContent variant="h6" mb={0}>Cuộc họp liên quan</StyledHeaderContent>
          {!isReadOnly && (
            <ButtonOutline
              onClick={handleSaveConclusion}
              disabled={isLoading || isDelegating}
              variant="outlined"
            >
              Lưu
            </ButtonOutline>
          )}
        </SectionHeader>
        <StyledDivider />
        {!isReadOnly && (
          <AddLinkBox>
            <ButtonOutline
              variant="contained"
              startIcon={<StyledAddIcon />}
              onClick={handleOpenRelatedModal}
            >
              Thêm liên kết
            </ButtonOutline>
          </AddLinkBox>
        )}

        {relatedMeetings.map((meeting) => (
          <RelatedMeetingCard key={meeting.id}>
             <TopRightActionBox>
              <ActionMenu 
                onDelete={!isReadOnly ? handleRemoveRelatedMeeting(meeting.id) : undefined} 
                onView={handleViewRelatedMeeting(meeting.id)}
              />
             </TopRightActionBox>
            <RelatedMeetingTitle>{meeting.title}</RelatedMeetingTitle>
            <RelatedMeetingTime>{meeting.time}</RelatedMeetingTime>
            {/* <RelatedConclusionList>
              {meeting.items.map((cIdx) => (
                <div className="item" key={cIdx}>
                  {cIdx}. Kết luận của cuộc họp
                </div>
              ))}
            </RelatedConclusionList> */}
          </RelatedMeetingCard>
        ))}
      </ConclusionSection>

      <RelatedMeetingModal 
        open={openRelatedModal}
        onClose={handleCloseRelatedModal}
        onConfirm={handleConfirmRelatedMeetings}
        meetingId={meetingId}
        initialSelected={relatedMeetings}
        sharedComponents={sharedComponents}
      />

      <FilePreviewDialog
        open={viewingFile.open}
        onClose={handleCloseFileViewer}
        url={viewingFile.url}
        fileName={viewingFile.name}
        fileType={viewingFile.type}
        title={`Xem file: ${viewingFile.name}`}
      />

      <CustomDialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        title="Xác nhận xóa" // Assuming styledTitle or titleAlign works, or default title
        type="delete"
        onSave={handleConfirmDeleteFile}
        size="xs"
      >
        Bạn có chắc chắn muốn xóa file này không?
      </CustomDialog>

      {openAddNewJob && (
        <AddNewJob
          open={openAddNewJob}
          onClose={handleCloseAddNewJob}
          sharedComponents={sharedComponents}
          onSuccess={handleJobSuccess}
          title="Thêm công việc từ cuộc họp"
          meetingId={meetingId}
          meetingData={meetingData}
          meetingConclusion={selectedConclusion}
        />
      )}

      {openViewJob && (
        <ViewJobToMeeting
          open={openViewJob}
          onClose={handleCloseViewJob}
          data={viewingJob}
          sharedComponents={sharedComponents}
          setReloadData={() => fetchConclusionTasks()}
        />
      )}
      {openViewMeeting && (
        <ViewMeetingSchedule
          open={openViewMeeting}
          onClose={handleCloseViewRelatedMeeting}
          meetingId={viewingMeetingId}
          sharedComponents={sharedComponents}
        />
      )}
      <CustomDialog
        open={openDeleteConclusionDialog}
        onClose={handleCloseDeleteConclusionDialog}
        onSave={handleConfirmDeleteConclusion}
        title="Xác nhận xóa kết luận"
        titleButton="Xác nhận"
        cancelButtonText="Hủy"
      >
        <SkyBox>
          <SkyTypography>
            Bạn có chắc chắn muốn xóa kết luận này không? Thao tác này không thể hoàn tác.
          </SkyTypography>
        </SkyBox>
      </CustomDialog>

    </ConclusionContainer>
  );
});

MeetingConclusion.displayName = "MeetingConclusion";

export default MeetingConclusion;
