import React, { useState, useCallback, useMemo, memo , useEffect} from "react";
import { Box, Typography, IconButton, Tabs, Tab, TextField, Button, Tooltip, Menu, MenuItem, ListItemText, Popover, List } from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import GetAppIcon from "@mui/icons-material/GetApp";
import RemoveRedEyeIcon from "@mui/icons-material/RemoveRedEye";
// import DeleteIcon from "@mui/icons-material/Delete";
import SendIcon from "@mui/icons-material/Send";
import EditIcon from "@mui/icons-material/Edit";
import {
  StyledBoxContainerContent,
  // JobSectionTitle,
  DocumentInfoRow,
  DocumentLabel,
  DocumentValue,
  ArrowUpIcon,
  ArrowDownIcon,
  JobCommentSection,
  JobCommentItem,
  JobCommentAvatar,
  JobCommentBody,
  JobCommentBox,
  JobCommentHeader,
  JobCommentUserInfo,
  JobCommentUserName,
  JobCommentTime,
  JobCommentContent,
  JobCommentActions,
  JobCommentActionsLeft,
  JobCommentActionText,
  JobCommentEditedText,
  JobCommentLikeContainer,
  JobLikeCount,
  JobLikeIcon,
  JobCommentInputContainer,
  JobCommentMenuIcon,
  JobTooltipContainer,
  JobTooltipText,
  StyledListItemIcon,
  JobLike,
} from "@pages/MeetingCalendar/componentStyle/CreateMeetingSchedule.styles";
import { styled } from "@mui/material/styles";
import dayjs from "dayjs";
import { 
  StyledHeaderContent,
  StyledDivider
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import { useDispatch, useSelector } from 'react-redux';
import { getCommentsByMeeting, addCommentToMeeting, updateCommentInMeeting, deleteCommentInMeeting, replyToCommentInMeeting, toggleCommentLikeMeeting } from "@redux/slices/SharedCategory/managementUnitSlice";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { useToast } from "@components/common/ToastProvider";
import axiosInstance from "@utils/axiosInstance";
import api from "@services/api";
import { API_MARK_IMPORTANT_DOCUMENT, APP_BASE, API_VIEW_FILE, API_XLSX_TO_PDF } from "@EnvironmentFile/constants/urlConfig";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { FileViewerDialog } from "@components/CustomDialog";
import { SkyTypography } from "@styles/SkyStyles";
import { encodeHTML } from "@/utils/securityUtils";
// Styled components
const HeaderContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: theme.spacing(2),
}));
const SectionSubtitle = styled(Typography)(({ theme }) => ({
  fontWeight: "bold",
  color: theme.palette.mode === "dark" ? "#cbd5e1" : "#334155",
  marginBottom: theme.spacing(1.5),
  marginTop: theme.spacing(2),
  fontSize: "0.875rem",
}));

const StatsContainer = styled(Box)(({ theme}) => ({
  display: "flex",
  gap: theme.spacing(1),
  alignItems: "center",
  fontSize: "0.875rem",
}));

const StatSeparator = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

// New styled components for task-specific layout
// const ExpandedTaskContent = styled('div')(({ theme }) => ({
//   marginTop: theme.spacing(2),
//   paddingLeft: theme.spacing(2.5),
// }));

const TaskFilesSection = styled('div')(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

const TaskCommentsSection = styled('div')(() => ({}));

const DocumentBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#ffffff",
  borderRadius: 8,
  border: "1px solid",
  borderColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "#e2e8f0",
  marginBottom: theme.spacing(1.5),
  transition: 'all 0.2s ease',
  '&:hover': {
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    borderColor: '#94a3b8',
  }
}));

const TaskTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  marginBottom: theme.spacing(1),
  color: theme.palette.text.primary,
}));

// const DocumentHeaderWrapper = styled(Box)(() => ({
//   display: 'flex',
//   justifyContent: 'space-between',
//   alignItems: 'flex-start',
//   cursor: 'pointer',
//   width: '100%',
// }));

// const FlexOneBox = styled(Box)(() => ({
//   flex: 1,
// }));

const TaskListContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1.5),
}));

const TaskCommentInputWrapper = styled(JobCommentInputContainer)(({ theme }) => ({
  marginTop: theme.spacing(2),
  padding: theme.spacing(1.5),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: '12px',
  backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "#fff",
  '& .MuiOutlinedInput-root': {
    backgroundColor: theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.2)" : "#f8fafc",
    '& fieldset': {
      border: 'none',
    }
  }
}));

const ImportantFileMeta = styled(Typography)(() => ({
  fontSize: '0.75rem',
  color: '#ef4444',
  fontWeight: 600,
}));

const FileItemContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(1.5, 2),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: '8px',
  backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "#fff",
  marginBottom: theme.spacing(1),
  '&:last-child': {
    marginBottom: 0,
  },
}));

const FileRowInfo = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flex: 1,
}));

const FileDescriptionBox = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
}));

const FileNameButton = styled(Button)(({ theme }) => ({
  padding: 0,
  minWidth: 0,
  textAlign: 'left',
  justifyContent: 'flex-start',
  fontWeight: 600,
  fontSize: '0.875rem',
  color: theme.palette.primary.main,
  textTransform: 'none',
  '&:hover': {
    backgroundColor: 'transparent',
    textDecoration: 'underline',
  },
}));

const FileMetaRow = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
}));

const FileMeta = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  color: theme.palette.text.secondary,
}));

const FileRowActions = styled(Box)(() => ({
  display: 'flex',
  gap: '8px',
}));

const ItalicTypography = styled(Typography)(({ theme }) => ({
  fontStyle: 'italic',
  paddingLeft: theme.spacing(1),
}));

const StyledDescriptionIcon = styled(DescriptionIcon)(() => ({
  color: '#42a5f5',
  fontSize: 24,
}));

const StyledGetAppIcon = styled(GetAppIcon)(({ theme }) => ({
  color: theme.palette.primary.main,
  fontSize: '1.25rem',
}));

const StyledRemoveRedEyeIcon = styled(RemoveRedEyeIcon)(({ theme }) => ({
  color: theme.palette.primary.main,
  fontSize: '1.25rem',
}));

const StyledJobLikeIcon = styled(JobLikeIcon)(() => ({
  fontSize: '1.1rem',
}));

const StatItem = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'colorType',
})(({ theme, colorType }) => {
  const getColor = () => {
    switch (colorType) {
      case "total":
        return theme.palette.primary.main;
      case "uploaded":
        return "#52c41a";
      case "pending":
        return "#ff4d4f";
      default:
        return theme.palette.text.primary;
    }
  };

  return {
    fontSize: "0.875rem",
    fontWeight: 500,
    color: getColor(),
  };
});

const ItemStatusBadge = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'status',
})(({ theme, status }) => {
  let colors = {
    bg: theme.palette.mode === 'dark' ? 'rgba(34, 197, 94, 0.2)' : '#f0fdf4',
    text: theme.palette.mode === 'dark' ? '#4ade80' : '#166534',
    border: theme.palette.mode === 'dark' ? 'rgba(34, 197, 94, 0.3)' : '#dcfce7',
  };

  if (status === 'overdue') {
    colors = {
      bg: theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2',
      text: theme.palette.mode === 'dark' ? '#f87171' : '#991b1b',
      border: theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.3)' : '#fee2e2',
    };
  } else if (status === 'pending') {
    colors = {
      bg: theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.2)' : '#fffbeb',
      text: theme.palette.mode === 'dark' ? '#fbbf24' : '#92400e',
      border: theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.3)' : '#fef3c7',
    };
  }

  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 10px',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: 600,
    backgroundColor: colors.bg,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    marginLeft: theme.spacing(1.5),
  };
});

const TaskHeader = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isExpanded',
})(({ theme, isExpanded }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
  paddingBottom: theme.spacing(1.5),
  marginBottom: isExpanded ? theme.spacing(2.5) : 0,
  borderBottom: `1px solid ${theme.palette.divider}`,
  marginLeft: theme.spacing(-2),
  marginRight: theme.spacing(-2),
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
}));

const TaskTitleGroup = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
}));

const TaskMainTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  fontSize: '1rem',
  color: theme.palette.text.primary,
}));

const StyledSendIcon = styled(SendIcon)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

const StyledTabs = styled(Tabs)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.mode === "dark" 
    ? "rgba(255, 255, 255, 0.12)" 
    : "rgba(0, 0, 0, 0.12)"}`,
  marginBottom: theme.spacing(3),
  minHeight: "48px",
  "& .MuiTabs-indicator": {
    backgroundColor: theme.palette.primary.main,
    height: 3,
  },
  "& .MuiTabs-scrollButtons": {
    color: theme.palette.text.primary,
  },
}));

const StyledTab = styled(Tab)(({ theme }) => ({
  textTransform: "none",
  minWidth: 0,
  fontWeight: 500,
  fontSize: "0.875rem",
  marginRight: theme.spacing(3),
  padding: theme.spacing(1.5, 0),
  color: theme.palette.mode === "dark" 
    ? "rgba(255, 255, 255, 0.7)" 
    : "rgba(0, 0, 0, 0.7)",
  "&.Mui-selected": {
    color: theme.palette.primary.main,
    fontWeight: 600,
  },
  "&:hover": {
    color: theme.palette.primary.main,
    opacity: 1,
  },
}));

const TabBadge = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "20px",
  height: "20px",
  padding: "0 6px",
  marginLeft: theme.spacing(1),
  borderRadius: "10px",
  backgroundColor: theme.palette.mode === "dark" 
    ? "rgba(255, 255, 255, 0.1)" 
    : "rgba(0, 0, 0, 0.1)",
  fontSize: "0.75rem",
  fontWeight: 600,
}));

// const DocumentListItem = styled(Box)(({ theme }) => ({
//   display: "flex",
//   alignItems: "center",
//   padding: theme.spacing(1.5),
//   marginBottom: theme.spacing(1),
//   borderRadius: theme.spacing(1),
//   backgroundColor: theme.palette.mode === "dark" 
//     ? "rgba(255, 255, 255, 0.05)" 
//     : "rgba(0, 0, 0, 0.02)",
//   border: `1px solid ${theme.palette.mode === "dark" 
//     ? "rgba(255, 255, 255, 0.1)" 
//     : "rgba(0, 0, 0, 0.1)"}`,
//   transition: "all 0.2s ease-in-out",
//   "&:hover": {
//     backgroundColor: theme.palette.mode === "dark" 
//       ? "rgba(255, 255, 255, 0.08)" 
//       : "rgba(0, 0, 0, 0.04)",
//     borderColor: theme.palette.primary.main,
//   },
// }));

// const DocumentIcon = styled(Box)(({ theme }) => ({
//   width: 40,
//   height: 40,
//   borderRadius: theme.spacing(1),
//   backgroundColor: theme.palette.primary.main,
//   display: "flex",
//   alignItems: "center",
//   justifyContent: "center",
//   marginRight: theme.spacing(2),
//   flexShrink: 0,
//   "& svg": {
//     color: "#fff",
//     fontSize: "1.25rem",
//   },
// }));

// const DocumentInfo = styled(Box)({
//   flex: 1,
//   minWidth: 0,
// });

// const DocumentName = styled(Typography)(({ theme }) => ({
//   fontWeight: 500,
//   fontSize: "0.875rem",
//   color: theme.palette.mode === "dark" ? "#fff" : "#1a1a1a",
//   marginBottom: theme.spacing(0.5),
//   overflow: "hidden",
//   textOverflow: "ellipsis",
//   whiteSpace: "nowrap",
// }));

// const DocumentMeta = styled(Typography)(({ theme }) => ({
//   fontSize: "0.75rem",
//   color: theme.palette.mode === "dark" 
//     ? "rgba(255, 255, 255, 0.6)" 
//     : "rgba(0, 0, 0, 0.6)",
// }));

// const DocumentActions = styled(Box)(({ theme }) => ({
//   display: "flex",
//   gap: theme.spacing(0.5),
//   marginLeft: theme.spacing(1),
// }));

// const ActionIconButton = styled(IconButton)(({ theme }) => ({
//   padding: theme.spacing(0.75),
//   "& svg": {
//     fontSize: "1.125rem",
//   },
// }));

// const StatusBadge = styled(Box)(({ theme, status }) => {
//   const getStatusColor = () => {
//     switch (status) {
//       case "completed":
//         return {
//           bg: "rgba(82, 196, 26, 0.1)",
//           color: "#52c41a",
//           border: "#52c41a",
//         };
//       case "pending":
//         return {
//           bg: "rgba(250, 173, 20, 0.1)",
//           color: "#faad14",
//           border: "#faad14",
//         };
//       case "overdue":
//         return {
//           bg: "rgba(255, 77, 79, 0.1)",
//           color: "#ff4d4f",
//           border: "#ff4d4f",
//         };
//       default:
//         return {
//           bg: "rgba(24, 144, 255, 0.1)",
//           color: "#1890ff",
//           border: "#1890ff",
//         };
//     }
//   };

//   const colors = getStatusColor();
//   return {
//     display: "inline-flex",
//     alignItems: "center",
//     padding: "2px 8px",
//     borderRadius: theme.spacing(0.5),
//     fontSize: "0.75rem",
//     fontWeight: 500,
//     backgroundColor: colors.bg,
//     color: colors.color,
//     border: `1px solid ${colors.border}`,
//   };
// });

// const MeetingInfoBox = styled(Box)(({ theme }) => ({
//   padding: theme.spacing(2),
//   marginBottom: theme.spacing(2),
//   backgroundColor: theme.palette.mode === "dark" 
//     ? "rgba(255, 255, 255, 0.03)" 
//     : "rgba(0, 0, 0, 0.02)",
//   borderRadius: theme.spacing(1),
//   border: `1px solid ${theme.palette.mode === "dark" 
//     ? "rgba(255, 255, 255, 0.08)" 
//     : "rgba(0, 0, 0, 0.08)"}`,
// }));

const ContentContainer = styled(Box)(() => ({
  minHeight: "400px",
}));

// const EmptyStateText = styled(Typography)(({ theme }) => ({
//   textAlign: "center",
//   color: theme.palette.text.secondary,
//   paddingTop: theme.spacing(3),
//   paddingBottom: theme.spacing(3),
// }));

const EmptyDocumentText = styled(Typography)(({ theme }) => ({
  textAlign: "center",
  color: theme.palette.text.secondary,
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(2),
}));

// const DocumentListContainer = styled(Box)(({ theme }) => ({
//   marginBottom: theme.spacing(2),
// }));

const TabLabelContainer = styled(Box)(() => ({
  display: "flex",
  alignItems: "center",
}));

// const DocumentNameContainer = styled(Box)(() => ({
//   display: "flex",
//   alignItems: "center",
// }));

// const CommentSectionContainer = styled(Box)(({ theme }) => ({
//   marginTop: theme.spacing(3),
// }));
const FileSizeText = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  padding: '0 4px',
  fontSize: '0.7rem',
  lineHeight: '1.2',
}));

const LikedActionText = styled(JobCommentActionText)(({ theme, liked }) => ({
  color: liked ? theme.palette.primary.main : 'inherit',
  fontWeight: liked ? 600 : 400,
}));

const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const FileItemRow = memo(({ file, onDownload, onView }) => {
  const handleDownload = useCallback(() => onDownload(file), [file, onDownload]);
  const handleView = useCallback(() => onView(file), [file, onView]);

  return (
    <FileItemContainer>
      <FileRowInfo>
        <StyledDescriptionIcon />
        <FileDescriptionBox>
          {/* <FileNameButton onClick={handleView}>
            {file.file_name || file.name}
          </FileNameButton> */}
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileNameButton onClick={handleView}>
              {file.file_name || file.name}
            </FileNameButton>
             <FileSizeText variant="caption">
               {formatFileSize(file.file_size)}
             </FileSizeText>
          </div>
          <FileMetaRow>
            <FileMeta>
              Tải lên bởi {file.created_by_name || 'Người dùng'}  {file.created_at ? dayjs(file.created_at.toString().replace('Z', '')).format('DD/MM/YYYY HH:mm') : ''}
            </FileMeta>
            {file.is_important && (
              <>
                <FileMeta>  </FileMeta>
                <ImportantFileMeta>
                  Tài liệu chỉ xem
                </ImportantFileMeta>
              </>
            )}
          </FileMetaRow>
        </FileDescriptionBox>
      </FileRowInfo>
      <FileRowActions>
        {!file.is_important && (
          <IconButton size="small" title="Tải xuống" onClick={handleDownload}>
            <StyledGetAppIcon />
          </IconButton>
        )}
        <IconButton size="small" title="Xem" onClick={handleView}>
          <StyledRemoveRedEyeIcon />
        </IconButton>
      </FileRowActions>
    </FileItemContainer>
  );
});
FileItemRow.displayName = 'FileItemRow';

const CommentItemRow = memo(({ cmt, taskId, onOpenMenu, onLike, onReply, formatCommentContent, isOwner }) => {
  const handleMenu = useCallback((e) => onOpenMenu(e, cmt), [cmt, onOpenMenu]);
  const handleLike = useCallback(() => onLike(taskId, cmt), [taskId, cmt, onLike]);
  const handleReply = useCallback(() => onReply(taskId, cmt), [taskId, cmt, onReply]);

  return (
    <JobCommentItem level={cmt.level}>
      <JobCommentAvatar>
        {cmt.userName ? cmt.userName.charAt(0).toUpperCase() : "U"}
      </JobCommentAvatar>
      <JobCommentBody>
        <JobCommentBox>
          <JobCommentHeader>
            <JobCommentUserInfo>
              <JobCommentUserName variant="subtitle2">
                {cmt.userName}
              </JobCommentUserName>
              <JobCommentTime variant="caption">
                {cmt.createdAt ? dayjs(cmt.createdAt).format("DD/MM/YYYY HH:mm") : ""}
              </JobCommentTime>
            </JobCommentUserInfo>
            {isOwner && (
              <IconButton size="small" onClick={handleMenu}>
                <JobCommentMenuIcon />
              </IconButton>
            )}
          </JobCommentHeader>
          <JobCommentContent 
            variant="body2"
            dangerouslySetInnerHTML={{ __html: encodeHTML(formatCommentContent(cmt.content)) }}
          />
        </JobCommentBox>
        <JobCommentActions>
          <JobCommentActionsLeft>
            {/* <JobCommentActionText variant="caption" onClick={handleLike}>
              Thích
            </JobCommentActionText> */}
            <LikedActionText 
              variant="caption" 
              onClick={handleLike}
              liked={cmt.userLiked ? 1 : 0}
            >
              Thích
            </LikedActionText>
            <JobCommentActionText variant="caption" onClick={handleReply}>
              Trả lời
            </JobCommentActionText>
            {cmt.updatedAt && dayjs(cmt.updatedAt).diff(dayjs(cmt.createdAt), 'minute') > 0 && (
              <JobCommentEditedText variant="caption">
                Đã chỉnh sửa
              </JobCommentEditedText>
            )}
          </JobCommentActionsLeft>
          
          <Tooltip
            title={
              cmt.likes && cmt.likes.length > 0 ? (
                <JobTooltipContainer>
                  {cmt.likes.map((name, idx) => (
                    <JobTooltipText key={idx} variant="caption">
                      {name}
                    </JobTooltipText>
                  ))}
                </JobTooltipContainer>
              ) : ""
            }
            placement="top"
          >
            <JobCommentLikeContainer 
              userLiked={!!cmt.userLiked}
              onClick={handleLike}
            >
              {cmt.likeCount > 0 && (
                <JobLikeCount variant="caption">
                  {cmt.likeCount}
                </JobLikeCount>
              )}
              <JobLike userLiked={!!cmt.userLiked}>
                <StyledJobLikeIcon />
              </JobLike>
            </JobCommentLikeContainer>
          </Tooltip>
        </JobCommentActions>
      </JobCommentBody>
    </JobCommentItem>
  );
});
CommentItemRow.displayName = 'CommentItemRow';

const TaskDocumentItem = memo(({ 
  task, 
  idx, 
  expandedTasks, 
  taskFiles, 
  taskComments, 
  commentText,
  handleToggleTaskExpand,
  handleCommentChange,
  handleSendComment,
  handleCommentKeyPress,
  handleOpenCommentMenu,
  onLike,
  handleReplyComment,
  handleDownloadFile,
  handleViewFile,
  organizedComments,
   formatCommentContent,
  textareaRef,
  currentUserId
}) => {
  const taskId = task._id || task.id || task.preparationTaskId || task.taskId || idx;
  const isExpanded = expandedTasks[taskId];
  const files = taskFiles[taskId] || [];
  const rawComments = taskComments[taskId] || [];
  const comments = organizedComments(rawComments);

  const onToggle = useCallback(() => handleToggleTaskExpand(taskId), [taskId, handleToggleTaskExpand]);
  
  const onCommentChange = useCallback((e) => {
    handleCommentChange(taskId, e.target.value, e.target);
  }, [taskId, handleCommentChange]);

  const onKeyPress = useCallback((e) => {
    handleCommentKeyPress(e, taskId);
  }, [taskId, handleCommentKeyPress]);

  const onSendClick = useCallback(() => {
    handleSendComment(taskId);
  }, [taskId, handleSendComment]);

  const setRef = useCallback((el) => {
    if (textareaRef && textareaRef.current) {
        textareaRef.current[taskId] = el;
    }
  }, [taskId, textareaRef]);

  const handleOpenMenu = useCallback((e, cmt) => {
    handleOpenCommentMenu(e, cmt, taskId);
  }, [handleOpenCommentMenu, taskId]);

  const statusInfo = useMemo(() => {
    if (files.length > 0) {
      return { label: "Đã gán tài liệu", status: "uploaded" };
    }
    const now = dayjs();
    const deadline = task.deadline ? dayjs(task.deadline) : null;
    
    if (deadline && now.isAfter(deadline)) {
      return { label: "Quá hạn", status: "overdue" };
    }
    return { label: "Chưa gán tài liệu", status: "pending" };
  }, [files.length, task.deadline]);

  return (
    <DocumentBox>
      {/* Header mới chứa tên tài liệu và nút đóng/mở */}
      <TaskHeader isExpanded={isExpanded} onClick={onToggle}>
        <TaskTitleGroup>
          <TaskMainTitle variant="subtitle1">
            {task.documentName}
          </TaskMainTitle>
          <ItemStatusBadge status={statusInfo.status}>
            {statusInfo.label}
          </ItemStatusBadge>
        </TaskTitleGroup>
        <IconButton size="small">
          {isExpanded ? <ArrowUpIcon /> : <ArrowDownIcon />}
        </IconButton>
      </TaskHeader>

      {isExpanded && (
        <>
          {/* Khối 1: Nội dung chuẩn bị */}
          <StyledBoxContainerContent styledPadding={2.5}>
            <TaskTitle variant="subtitle2">
              Nội dung chuẩn bị
            </TaskTitle>
            <DocumentInfoRow >
              <DocumentLabel>Tài liệu :</DocumentLabel>
              <DocumentValue preLine>{task.documentName}</DocumentValue>
            </DocumentInfoRow>
            <DocumentInfoRow >
              <DocumentLabel>Thời hạn :</DocumentLabel>
              <DocumentValue>{task.deadline ? dayjs(task.deadline).format("HH:mm - DD/MM/YYYY") : "---"}</DocumentValue>
            </DocumentInfoRow>
            {task.content && (
              <DocumentInfoRow>
                <DocumentLabel>Nội dung :</DocumentLabel>
                <DocumentValue preLine>{task.content}</DocumentValue>
              </DocumentInfoRow>
            )}
          </StyledBoxContainerContent>

          {/* Khối 2: Danh sách tài liệu */}
          <StyledBoxContainerContent styledPadding={2.5} styledMarginTop>
            <TaskFilesSection>
              <SectionSubtitle variant="subtitle2">Danh sách tài liệu</SectionSubtitle>
              {files.length === 0 ? (
                <ItalicTypography variant="body2">Chưa có tài liệu</ItalicTypography>
              ) : (
                files.map((file, fIdx) => (
                  <FileItemRow 
                    key={file.id || file._id || fIdx} 
                    file={file} 
                    onDownload={handleDownloadFile} 
                    onView={handleViewFile}
                  />
                ))
              )}
            </TaskFilesSection>
          </StyledBoxContainerContent>

          {/* Khối 3: Thảo luận tài liệu */}
          <StyledBoxContainerContent styledPadding={2.5} styledMarginTop>
            <TaskCommentsSection>
              <SectionSubtitle variant="subtitle2">Thảo luận tài liệu</SectionSubtitle>
              <JobCommentSection>
                 {comments.map((cmt, i) => (
                  <CommentItemRow 
                    key={cmt.id || cmt._id || i} 
                    cmt={cmt} 
                    taskId={taskId} 
                    onOpenMenu={handleOpenMenu}
                    onLike={onLike}
                    onReply={handleReplyComment}
                    formatCommentContent={formatCommentContent}
                    isOwner={(cmt.userId === currentUserId && !!currentUserId) || (cmt.user_id === currentUserId && !!currentUserId)}
                  />
                ))}
              </JobCommentSection>
              
              <TaskCommentInputWrapper>
                <TextField
                  fullWidth
                  placeholder="Nhập bình luận của bạn..."
                  size="small"
                  value={commentText[taskId] || ""}
                  onChange={onCommentChange}
                  onKeyPress={onKeyPress}
                  inputRef={setRef}
                  multiline
                  maxRows={4}
                  variant="standard"
                  InputProps={{
                    disableUnderline: true,
                  }}
                />
                <IconButton onClick={onSendClick}>
                  <StyledSendIcon />
                </IconButton>
              </TaskCommentInputWrapper>
            </TaskCommentsSection>
          </StyledBoxContainerContent>
        </>
      )}
    </DocumentBox>
  );
});
TaskDocumentItem.displayName = 'TaskDocumentItem';

const MeetingDocuments = ({ meetingData }) => {
  const dispatch = useDispatch();
  const toast = useToast();
  // const { meetingCommentsList } = useSelector((state) => state?.unit);

  const [selectedUnitIndex, setSelectedUnitIndex] = useState(0);
  const [commentText, setCommentText] = useState({}); // Keyed by taskId
  const [editingCommentId, setEditingCommentId] = useState(null); // { taskId, commentId }
  const [replyingToCommentId, setReplyingToCommentId] = useState(null); // { taskId, commentId }
  const [commentMenuAnchor, setCommentMenuAnchor] = useState(null);
  const [selectedCommentForMenu, setSelectedCommentForMenu] = useState(null);
  const [selectedTaskIdForMenu, setSelectedTaskIdForMenu] = useState(null);
  const [confirmDeleteComment, setConfirmDeleteComment] = useState(false);
  
  const [taskFiles, setTaskFiles] = useState({});
  const [taskComments, setTaskComments] = useState({});
  const [expandedTasks, setExpandedTasks] = useState({});
  const [viewingTaskFile, setViewingTaskFile] = useState({
    open: false,
    url: null,
    name: '',
    type: null,
    "is_important": false,
  });
  
   const textareaRef = React.useRef({});
  
  const { dataUser: authUser } = useSelector((state) => state.auth || {});
  const currentUser = authUser?.user || {};
  const currentUserId = currentUser._id || currentUser.id;
  
  const [mentionAnchorEl, setMentionAnchorEl] = useState(null);
  const [mentionSearchTerm, setMentionSearchTerm] = useState("");
  const [mentionUsers, setMentionUsers] = useState([]);
  const [mentionedIds, setMentionedIds] = useState({}); // Keyed by taskId: array of ids
  
  const mentionPopoverPaperStyle = {
    maxHeight: 300,
    width: 250,
    overflow: "auto",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    borderRadius: "8px",
    marginTop: "8px",
  };

  const unitDocument = useMemo(() => {
    return (meetingData?.unitDocument || []).filter(unit => (unit.tasks?.length || 0) > 0);
  }, [meetingData?.unitDocument]);

  // Ensure selectedUnitIndex is valid when units change
  useEffect(() => {
    if (selectedUnitIndex >= unitDocument.length && unitDocument.length > 0) {
      setSelectedUnitIndex(0);
    }
  }, [unitDocument, selectedUnitIndex]);

  // Calculate statistics
  const stats = useMemo(() => {
    const summary = meetingData?.documentMeetingSummary;
    if (summary) {
      return {
        total: summary.total || 0,
        uploaded: summary.prepared || 0,
        pending: summary.unprepared || 0,
      };
    }

    let totalDocs = 0;
    let uploadedDocs = 0;
    let pendingDocs = 0;

    unitDocument.forEach((unit) => {
      // Only add unit-level tasks
      const unitTasksCount = unit.tasks?.length || 0;
      totalDocs += unitTasksCount;
      pendingDocs += unitTasksCount;
    });

    return {
      total: totalDocs,
      uploaded: uploadedDocs,
      pending: pendingDocs,
    };
  }, [unitDocument, meetingData?.documentMeetingSummary]);

  // Extract users for mention
  useEffect(() => {
    if (meetingData) {
      const users = [];
      
      // Units and participants
      if (meetingData.unitDocument && Array.isArray(meetingData.unitDocument)) {
        meetingData.unitDocument.forEach(unit => {
          if (unit.participants && Array.isArray(unit.participants)) {
            unit.participants.forEach(p => {
              users.push({ id: p.userId, name: p.userName || p.userId });
            });
          }
        });
      }
      
      // Chairman and Secretary
      if (meetingData.chairman && Array.isArray(meetingData.chairman)) {
        meetingData.chairman.forEach(c => {
          users.push({ id: c.userId, name: c.userName || c.userId });
        });
      }
      if (meetingData.secretary && Array.isArray(meetingData.secretary)) {
        meetingData.secretary.forEach(s => {
          users.push({ id: s.userId, name: s.userName || s.userId });
        });
      }

      // Unique by ID
      const unique = Array.from(new Map(users.map(u => [u.id || u.name, u])).values());
      setMentionUsers(unique);
    }
  }, [meetingData]);

  const handleSelectMention = useCallback((user) => {
    const taskId = selectedTaskIdForMenu; // We use this state as temp for currently active taskId
    const textarea = textareaRef.current[taskId];
    if (!textarea) return;

    const currentValue = commentText[taskId] || "";
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
      
      setCommentText(prev => ({ ...prev, [taskId]: newText }));

      setMentionedIds(prev => {
        const currentIds = prev[taskId] || [];
        const newIdSet = new Set(currentIds);
        newIdSet.add(user.id || user._id);
        return { ...prev, [taskId]: Array.from(newIdSet) };
      });

      const newCursorPos = atIndex + user.name.length + 3;
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
    setMentionAnchorEl(null);
  }, [commentText, selectedTaskIdForMenu]);

  const handleCloseMentionPopover = useCallback(() => {
    setMentionAnchorEl(null);
  }, []);

  const createSelectMentionHandler = useCallback((user) => () => handleSelectMention(user), [handleSelectMention]);
    const fetchTaskComments = useCallback(async (taskId) => {
    try {
      const response = await dispatch(getCommentsByMeeting({ 
        documentId: taskId, 
        type: 'meeting' 
      })).unwrap();
      
      const commentsData = response?.data || response || [];
      
      const currentUserName = currentUser.name || "";

      const processedComments = commentsData.map(cmt => {
        let likes = [];
        if (typeof cmt.likeUsers === "string") {
          try {
            const parsedLikes = JSON.parse(cmt.likeUsers);
            if (Array.isArray(parsedLikes)) {
              likes = parsedLikes;
            }
          } catch (e) {
            // Ignore parse errors
          }
        } else if (Array.isArray(cmt.likeUsers)) {
          likes = cmt.likeUsers;
        }

        return {
          ...cmt,
          likes,
          likeCount: cmt.likeNumber !== undefined ? cmt.likeNumber : (likes.length || 0),
          userLiked: cmt.status !== undefined ? (cmt.status === 1) : likes.includes(currentUserName)
        };
      });

      setTaskComments(prev => ({
        ...prev,
        [taskId]: processedComments
      }));
    } catch (error) {
      logger.error('Error fetching task comments:', error);
    }
  }, [dispatch, currentUser.name]);

  // Organize comments hierarchically helper
  const getOrganizedComments = useCallback((commentList) => {
    if (!commentList || !Array.isArray(commentList)) return [];

    const commentMap = {};
    const rootComments = [];

    commentList.forEach((cmt) => {
      const id = cmt.id || cmt._id;
      commentMap[id] = { ...cmt, children: [] };
    });

    commentList?.forEach((cmt) => {
      const id = cmt.id || cmt._id;
      const node = commentMap[id];
      if (cmt.parentId && commentMap[cmt.parentId]) {
        commentMap[cmt.parentId].children.push(node);
      } else {
        rootComments.push(node);
      }
    });

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
  }, []);

  const handleTabChange = useCallback((event, newValue) => {
    setSelectedUnitIndex(newValue);
  }, []);

  const handleCommentChange = useCallback((taskId, value, textarea) => {
    setCommentText(prev => ({ ...prev, [taskId]: value }));

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex !== -1 && (atIndex === 0 || /[\s\u200B]/.test(textBeforeCursor[atIndex - 1]))) {
      const searchTerm = textBeforeCursor.substring(atIndex + 1);
      if (!/\s/.test(searchTerm)) {
        setMentionSearchTerm(searchTerm);
        setMentionAnchorEl(textarea);
        setSelectedTaskIdForMenu(taskId); // Use this to track which task's textarea is active
      } else {
        setMentionAnchorEl(null);
      }
    } else {
      setMentionAnchorEl(null);
    }
  }, []);

  const handleSendComment = useCallback(async (taskId) => {
    const text = commentText[taskId];
    if (!text?.trim()) return;
    
    const userId = currentUser._id || currentUser.id;
    const userName = currentUser.name;

    try {
      if (editingCommentId && editingCommentId.taskId === taskId) {
        await dispatch(updateCommentInMeeting({
          documentId: taskId,
          commentId: editingCommentId.commentId,
          content: text,
        })).unwrap();
      } else if (replyingToCommentId && replyingToCommentId.taskId === taskId) {
        const replyData = {
          userId,
          userName,
          content: text,
          fileId: [],
          mentionIds: [],
        };
        await dispatch(replyToCommentInMeeting({
          documentId: taskId,
          commentId: replyingToCommentId.commentId,
          replyData,
        })).unwrap();
      } else {
        const commentData = {
          userId,
          userName,
          content: text,
          fileId: [],
          mentionIds: mentionedIds[taskId] || [],
          type: "meeting",
        };
        await dispatch(addCommentToMeeting({
          documentId: taskId,
          commentData,
          type: "meeting",
        })).unwrap();
      }
      
      setCommentText(prev => ({ ...prev, [taskId]: "" }));
      setEditingCommentId(null);
      setReplyingToCommentId(null);
      fetchTaskComments(taskId); // Refresh comments
    } catch (error) {
      logger.error("Error sending comment:", error);
    }
  }, [commentText, editingCommentId, replyingToCommentId, dispatch, currentUser._id, currentUser.id, currentUser.name, fetchTaskComments, mentionedIds]);

  const handleCommentKeyPress = useCallback((e, taskId) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendComment(taskId);
    }
  }, [handleSendComment]);

  const handleLikeComment = useCallback(async (taskId, comment) => {
    const commentId = comment.id || comment._id;
    const isLiked = comment.userLiked;

    // Optimistic Update
    setTaskComments(prev => {
      const currentTasksComments = prev[taskId] || [];
      const updatedComments = currentTasksComments.map(cmt => {
        if ((cmt.id || cmt._id) === commentId) {
          const newLikeCount = isLiked ? Math.max(0, (cmt.likeCount || 0) - 1) : (cmt.likeCount || 0) + 1;
          return { ...cmt, userLiked: !isLiked, likeCount: newLikeCount };
        }
        return cmt;
      });
      return {
        ...prev,
        [taskId]: updatedComments
      };
    });

    try {
      await dispatch(toggleCommentLikeMeeting({ 
        commentId, 
        taskId, 
        isLiked 
      })).unwrap();
      fetchTaskComments(taskId); // Refresh
    } catch (error) {
      logger.error("Error liking comment:", error);
      fetchTaskComments(taskId); // Rollback on error
    }
  }, [dispatch, fetchTaskComments]);

  const handleReplyComment = useCallback((taskId, comment) => {
    setReplyingToCommentId({ taskId, commentId: comment.id || comment._id });
    setEditingCommentId(null);
    const authorName = comment.userName || "User";
    setCommentText(prev => ({ ...prev, [taskId]: `@${authorName} ` }));
    
    // Defer focus to ensure state update has happened
    setTimeout(() => {
      if (textareaRef.current && textareaRef.current[taskId]) {
        textareaRef.current[taskId].focus();
      }
    }, 0);
  }, []);

  const handleOpenCommentMenu = (event, comment, taskId) => {
    setCommentMenuAnchor(event.currentTarget);
    setSelectedCommentForMenu(comment);
    setSelectedTaskIdForMenu(taskId);
  };

  const handleCloseCommentMenu = () => {
    setCommentMenuAnchor(null);
    setSelectedCommentForMenu(null);
  };

  const handleEditComment = () => {
    if (selectedCommentForMenu) {
      const taskId = selectedTaskIdForMenu;
      setCommentText(prev => ({ ...prev, [taskId]: selectedCommentForMenu.content || "" }));
      setEditingCommentId({ taskId, commentId: selectedCommentForMenu.id || selectedCommentForMenu._id });
      if (textareaRef.current[taskId]) {
        textareaRef.current[taskId].focus();
      }
    }
    handleCloseCommentMenu();
  };

  const handleDeleteComment = () => {
    setConfirmDeleteComment(true);
    setCommentMenuAnchor(null);
  };

  const handleConfirmDeleteComment = async () => {
    const commentId = selectedCommentForMenu?.id || selectedCommentForMenu?._id;
    const taskId = selectedTaskIdForMenu;
    
    if (commentId && taskId) {
      try {
        await dispatch(deleteCommentInMeeting({ 
          documentId: taskId, 
          commentId 
        })).unwrap();
        toast("Xóa bình luận thành công", "success");
        fetchTaskComments(taskId);
      } catch (error) {
        toast("Xóa bình luận thất bại", "error");
      }
    }
    setConfirmDeleteComment(false);
    setSelectedCommentForMenu(null);
    setSelectedTaskIdForMenu(null);
  };

  const handleCloseConfirmDeleteComment = () => {
    setConfirmDeleteComment(false);
    setSelectedCommentForMenu(null);
  };

  const handleCloseViewFile = useCallback(() => {
    if (viewingTaskFile.url) URL.revokeObjectURL(viewingTaskFile.url);
    setViewingTaskFile({ open: false, url: null, name: "", type: null });
  }, [viewingTaskFile.url]);

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

  const handleViewFile = useCallback(async (file) => {
    const fileId = file.id || file._id;
    const fileName = file.file_name || file.name;
    const lower = fileName.toLowerCase();
    const isDoc = /\.(doc|docx)$/i.test(lower);
    const isExcel = /\.(xls|xlsx)$/i.test(lower);
    const isBrowserFile = /\.(pdf|jpeg|jpg|png|gif|webp|txt)$/i.test(lower);
    
    try {
      let blob;
      if (isDoc) {
        const conversionApi = `${APP_BASE}/api/doc-url-to-pdf?id=${fileId}`;
        const res = await axiosInstance.get(conversionApi, {
          responseType: "blob",
          timeout: 0,
        });
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
        const response = await axiosInstance.get(`${API_VIEW_FILE}/${fileId}`, {
          responseType: "blob",
        });
        blob = response.data || response;
      } else {
        toast("Định dạng file không được hỗ trợ xem trước.", "warning");
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      const fileExtension = fileName.split(".").pop().toLowerCase();
      let fileType = null;
      if (["jpg", "jpeg", "png", "gif", "webp"].includes(fileExtension) && isBrowserFile) {
        fileType = "image";
      } else {
        // Office files after conversion are PDF
        fileType = "pdf";
      }

      setViewingTaskFile({
        open: true,
        url: objectUrl,
        name: fileName,
        type: fileType,
        "is_important": !!file.is_important,
      });
    } catch (error) {
      logger.error("Error viewing file:", error);
      let errorMsg = "Không thể tải file để xem trước.";
      if (error?.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          if (json.message) {
            errorMsg = json.message;
          }
        } catch (e) {
          logger.error("Error parsing blob error message:", e);
        }
      } else if (error?.response?.data?.message) {
        errorMsg = error.response.data.message;
      }
      toast(errorMsg, "error");
    }
  }, [toast]);

  const handleDownloadFile = useCallback(async (file) => {
    const fileId = file.id || file._id;
    const fileName = file.file_name || file.name;

    try {
      const response = await axiosInstance.get(`${APP_BASE}/api/files/download/${fileId}`, {
        responseType: "blob",
      });
      
      const blob = response.data || response;
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      logger.error("Error downloading file:", error);
      let errorMsg = "Tải xuống thất bại!";
      if (error?.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          if (json.message) {
            errorMsg = json.message;
          }
        } catch (e) {
          logger.error("Error parsing blob error message:", e);
        }
      } else if (error?.response?.data?.message) {
        errorMsg = error.response.data.message;
      }
      toast(errorMsg, "error");
    }
  }, [toast]);

  const fetchTaskFiles = useCallback(async (taskId) => {
    try {
      const fileRes = await axiosInstance.get(`${API_MARK_IMPORTANT_DOCUMENT}/by-object`, {
        params: {
          "object_type": 'MeetingTask',
          "object_id": taskId,
        },
      });
      const filesData = fileRes?.data || fileRes || [];
      setTaskFiles(prev => ({
        ...prev,
        [taskId]: filesData
      }));
    } catch (error) {
      logger.error('Error fetching task files:', error);
    }
  }, []);


  const selectedUnit = useMemo(() => unitDocument[selectedUnitIndex], [unitDocument, selectedUnitIndex]);
  
  const allTasks = useMemo(() => (selectedUnit?.tasks || []).map(task => ({
    ...task,
    assignee: selectedUnit?.unitName || "Đơn vị",
    assigneeId: selectedUnit?.unitId,
  })), [selectedUnit]);

  const handleToggleTaskExpand = useCallback((taskId) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  }, []);

  // Effect to fetch initial data for tasks
  React.useEffect(() => {
    if (allTasks && allTasks.length > 0) {
      allTasks.forEach(task => {
        const taskId = task._id || task.id || task.preparationTaskId || task.taskId;
        if (taskId) {
          fetchTaskFiles(taskId);
          fetchTaskComments(taskId);
        }
      });
    }
  }, [allTasks, fetchTaskFiles, fetchTaskComments]);

  if (unitDocument.length === 0) {
    return null;
  }

  
  
  // Collect only unit-level tasks


  return (
    <>
      <StyledBoxContainerContent styledMarginTop>
          <HeaderContainer>
            <StyledHeaderContent variant="h6" gutterBottom mt={0} mb={0}>
              Tài liệu họp
            </StyledHeaderContent>
            <StatsContainer>
              <StatItem colorType="total">
                Tổng số tài liệu cần chuẩn bị: {stats.total}
              </StatItem>
              <StatSeparator>|</StatSeparator>
              <StatItem colorType="uploaded">
                Đã upload: {stats.uploaded}
              </StatItem>
              <StatSeparator>|</StatSeparator>
              <StatItem colorType="pending">
                Chưa upload: {stats.pending}
              </StatItem>
            </StatsContainer>
          </HeaderContainer>
          <StyledDivider />

          <StyledTabs
            value={selectedUnitIndex}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            {unitDocument.map((unit) => {
              const taskCount = unit.tasks?.length || 0;

              return (
                <StyledTab
                  key={unit.unitId}
                  label={
                    <TabLabelContainer>
                      {unit.unitName}
                      <TabBadge>{taskCount}</TabBadge>
                    </TabLabelContainer>
                  }
                />
              );
            })}
          </StyledTabs>

          <ContentContainer>
            {allTasks.length === 0 ? (
              <EmptyDocumentText variant="body2">
                Chưa có tài liệu
              </EmptyDocumentText>
            ) : (
              <TaskListContainer>
                {allTasks.map((task, idx) => (
                  <TaskDocumentItem 
                    key={task.id || task._id || idx} 
                    task={task} 
                    idx={idx}
                    expandedTasks={expandedTasks}
                    taskFiles={taskFiles}
                    taskComments={taskComments}
                    commentText={commentText}
                    handleToggleTaskExpand={handleToggleTaskExpand}
                    handleCommentChange={handleCommentChange}
                    handleSendComment={handleSendComment}
                    handleCommentKeyPress={handleCommentKeyPress}
                    handleOpenCommentMenu={handleOpenCommentMenu}
                    onLike={handleLikeComment}
                    handleReplyComment={handleReplyComment}
                    handleDownloadFile={handleDownloadFile}
                    handleViewFile={handleViewFile}
                    organizedComments={getOrganizedComments}
                    formatCommentContent={formatCommentContent}
                    textareaRef={textareaRef}
                    currentUserId={currentUserId}
                  />
                ))}
              </TaskListContainer>
            )}
          </ContentContainer>
        </StyledBoxContainerContent>

      {/* Comment Menu */}
      <Menu
        anchorEl={commentMenuAnchor}
        open={Boolean(commentMenuAnchor)}
        onClose={handleCloseCommentMenu}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {selectedCommentForMenu && (selectedCommentForMenu.userId === currentUserId || selectedCommentForMenu.user_id === currentUserId) && dayjs().diff(dayjs(selectedCommentForMenu.createdAt), 'minute') <= 5 && (
          <MenuItem onClick={handleEditComment}>
            <StyledListItemIcon>
              <EditIcon />
            </StyledListItemIcon>
            <ListItemText>Chỉnh sửa</ListItemText>
          </MenuItem>
        )}
        {selectedCommentForMenu && (selectedCommentForMenu.userId === currentUserId || selectedCommentForMenu.user_id === currentUserId) && (
          <MenuItem onClick={handleDeleteComment}>
            <StyledListItemIcon>
              <DeleteOutlineIcon />
            </StyledListItemIcon>
            <ListItemText>Xóa</ListItemText>
          </MenuItem>
        )}
      </Menu>

        <CustomDialog
          open={confirmDeleteComment}
          onClose={handleCloseConfirmDeleteComment}
          onSave={handleConfirmDeleteComment}
          title="Xác nhận xóa"
          titleButton="Xóa"
        >
          Bạn có chắc chắn muốn xóa bình luận này?
        </CustomDialog>

        {/* File Preview Dialog */}
        <FileViewerDialog
            open={viewingTaskFile.open}
            onClose={handleCloseViewFile}
            fileUrl={viewingTaskFile.url}
            fileName={viewingTaskFile.name}
            fileType={viewingTaskFile.type}
            showDownloadButton={!viewingTaskFile.is_important}
            title={`Xem file: ${viewingTaskFile.name}`}
        />

        {/* Mention Popover */}
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
          <Box>
            <List dense>
              {mentionUsers.filter((user) =>
                user.name
                  .toLowerCase()
                  .includes(mentionSearchTerm.toLowerCase())
              ).length > 0 ? (
                mentionUsers
                  .filter((user) =>
                    user.name
                      .toLowerCase()
                      .includes(mentionSearchTerm.toLowerCase())
                  )
                  .map((user) => (
                    <MenuItem
                      key={user.id || user._id}
                      onClick={createSelectMentionHandler(user)}
                    >
                      <ListItemText primary={user.name} />
                    </MenuItem>
                  ))
              ) : (
                <MenuItem disabled>
                  <ListItemText primary="Không tìm thấy người dùng" />
                </MenuItem>
              )}
            </List>
          </Box>
        </Popover>
      </>
    );
  };

export default MeetingDocuments;
