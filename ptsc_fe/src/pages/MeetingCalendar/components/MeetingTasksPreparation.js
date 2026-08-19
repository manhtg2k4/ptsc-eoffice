import React, { useState, useCallback, useEffect, memo } from 'react';
import dayjs from 'dayjs';
import axiosInstance from '@utils/axiosInstance';
import api from '@services/api';
import { API_MARK_IMPORTANT_DOCUMENT, APP_BASE, API_VIEW_FILE, API_XLSX_TO_PDF } from '@EnvironmentFile/constants/urlConfig';
import { 
  SkyBox, 
  SkyTypography, 
  SkyButton,
  SkyList,
  // SkyTableContainer,
  // SkyTableCell
} from '@styles/SkyStyles';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import {
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
  // JobCommentActionsLeft,
  JobCommentActionText,
  JobCommentLikeContainer,
  JobLikeCount,
  JobLike,
  JobLikeIcon,
  JobCommentEditedText,
  JobCommentInputContainer,
  JobCommentMenuIcon,
  JobTooltipContainer,
  JobTooltipText,
  StyledListItemIcon,
} from '@pages/WorkManagement/components/Job.styles';
import { FileViewerDialog } from "@components/CustomDialog";
import { styled } from '@mui/material/styles';
import { 
  IconButton, 
  TextField, 
  Tooltip, 
  Menu, 
  MenuItem, 
  ListItemText,
  Popover,
} from '@mui/material';
import GetAppIcon from '@mui/icons-material/GetApp';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useDispatch, useSelector } from 'react-redux';
import { useToast } from '@components/common/ToastProvider';
// import { useMemo } from 'react';
import {
  addCommentToMeeting,
  updateCommentInMeeting,
  replyToCommentInMeeting,
  toggleCommentLikeMeeting,
  deleteCommentInMeeting,
  getCommentsByMeeting,
} from "@redux/slices/SharedCategory/managementUnitSlice";
import DOMPurify from "dompurify";
const StyledGetAppIcon = styled(GetAppIcon)(() => ({
  fontSize: 18,
  color: '#1e88e5',
}));
import { 
  StyledHeaderContent,
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
const StyledRemoveRedEyeIcon = styled(RemoveRedEyeIcon)(() => ({
  fontSize: 18,
  color: '#1e88e5',
}));

const ItalicTypography = styled(SkyTypography)(({ theme }) => ({
  fontStyle: 'italic',
  paddingLeft: theme.spacing(1),
}));

const StyledJobLikeIcon = styled(JobLikeIcon)(() => ({
  fontSize: '1.1rem',
}));

const StyledSendIcon = styled(SendIcon)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

const Flex1Box = styled(SkyBox)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  gap: theme.spacing(2),
  alignItems: 'center',
}));

const ExpandedTaskContent = styled('div')(({ theme }) => ({
  marginTop: theme.spacing(2),
  paddingLeft: theme.spacing(2.5),
}));


const TaskFilesSection = styled('div')(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

const TaskCommentsSection = styled('div')(() => ({}));

const StyledBoxContainerContent = styled(SkyBox)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",
  borderRadius: 6,
  border: theme.palette.mode === "dark" ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e8eaf1",
  marginBottom: theme.spacing(2),
  padding: theme.spacing(1.5),
}));

// const JobSectionTitle = styled(SkyTypography)(({ theme }) => ({
//   marginTop: theme.spacing(1),
//   marginBottom: theme.spacing(2.5),
//   fontSize: "16px",
//   fontWeight: 600,
//   color: theme.palette.mode === "dark" ? "#FFFFFF" : "#0066CC",
// }));

const ParticipantHeaderBox = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  padding: theme.spacing(1, 0),
  borderBottom: `1px solid ${theme.palette.divider}`,
  marginBottom: theme.spacing(2),
  cursor: 'pointer',
}));

const FlexCenterGap16 = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: "center",
  gap: theme.spacing(2),
}));

const ParticipantStats = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(2),
}));

const StatItem = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "colorType",
})(({ theme, colorType }) => ({
  fontSize: "0.875rem",
  fontWeight: 600,
  color: colorType === "blue" ? theme.palette.primary.main : theme.palette.error.main,
  "& span": {
    marginLeft: theme.spacing(0.5),
  },
}));

const ArrowUpIcon = styled(KeyboardArrowUpIcon)(() => ({
  color: "#6b7280",
}));

const ArrowDownIcon = styled(KeyboardArrowDownIcon)(() => ({
  color: "#6b7280",
}));


const DocumentBox = styled(SkyBox)(({ theme }) => ({
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

const FlexSpaceBetweenBox = styled(SkyBox)(() => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
}));

const FlexOneBox = styled(SkyBox)(() => ({
  flex: 1,
}));

const TaskTitle = styled(SkyTypography)(({ theme }) => ({
  fontWeight: 700,
  marginBottom: theme.spacing(1),
  color: theme.palette.text.primary,
}));

const DocumentInfoRow = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1),
  marginBottom: theme.spacing(1),
  "&:last-child": {
    marginBottom: 0,
  },
}));

const DocumentLabel = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.875rem",
  color: theme.palette.text.secondary,
  // width: 70,
  flexShrink: 0,
}));

const DocumentValue = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "preLine",
})(({ theme, preLine }) => ({
  fontSize: "0.875rem",
  color: theme.palette.text.primary,
  fontWeight: 500,
  whiteSpace: preLine ? "pre-line" : "normal",
}));

const SectionSubtitle = styled(SkyTypography)(({ theme }) => ({
  fontWeight: "bold",
  color: theme.palette.mode === "dark" ? "#cbd5e1" : "#334155",
  marginBottom: theme.spacing(1.5),
  marginTop: theme.spacing(2),
  fontSize: "0.875rem",
}));

const DocumentHeaderWrapper = styled(FlexSpaceBetweenBox)(() => ({
  cursor: 'pointer',
  width: '100%',
}));

const TaskListContainer = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1.5),
}));

const FileItemContainer = styled(SkyBox)(({ theme }) => ({
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

const FileRowInfo = styled(SkyBox)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flex: 1,
}));

const FileDescriptionBox = styled(SkyBox)(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
}));

const FileNameButton = styled(SkyButton)(({ theme }) => ({
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

const FileMetaRow = styled(SkyBox)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
}));

const FileMeta = styled(SkyTypography)(({ theme }) => ({
  fontSize: '0.75rem',
  color: theme.palette.text.secondary,
}));

const StyledInsertDriveFileIcon = styled(InsertDriveFileIcon)(() => ({
  color: '#42a5f5',
  fontSize: '28px',
}));

const ImportantFileMeta = styled(SkyTypography)(() => ({
  fontSize: '0.75rem',
  color: '#ef4444',
  fontWeight: 600,
}));

const FileRowActions = styled(SkyBox)(() => ({
  display: 'flex',
  gap: '8px',
}));

const TaskCommentBox = styled(JobCommentBox)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "rgba(30, 41, 59, 0.5)" : "#f1f3f5",
  border: 'none',
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

/**
 * Component hiển thị danh sách tài liệu họp cần chuẩn bị
 * @param {Array} tasks - Danh sách các task cần chuẩn bị
 * @param {boolean} showHeader - Hiển thị header hay không (default: true)
 * @param {string} title - Tiêu đề section (default: "Tài liệu họp cần chuẩn bị")
 */

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

const getOrganizedComments = (commentList) => {
  if (!commentList || !Array.isArray(commentList)) return [];

  const commentMap = {};
  const rootComments = [];

  commentList.forEach((cmt) => {
    const id = cmt.id || cmt._id;
    commentMap[id] = { ...cmt, children: [] };
  });

  commentList.forEach((cmt) => {
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
};

const FileItemRow = memo(({ file, onDownload, onView }) => {
  const handleDownload = useCallback(() => onDownload(file), [file, onDownload]);
  const handleView = useCallback(() => onView(file), [file, onView]);

  return (
    <FileItemContainer>
      <FileRowInfo>
        <StyledInsertDriveFileIcon />
        <FileDescriptionBox>
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

const CommentItemRow = memo(({ cmt, taskId, onOpenMenu, onLike, onReply, isOwner }) => {
  const handleMenu = useCallback((e) => onOpenMenu(e, taskId, cmt), [taskId, cmt, onOpenMenu]);
  const handleLike = useCallback(() => onLike(taskId, cmt), [taskId, cmt, onLike]);
  const handleReply = useCallback(() => onReply(taskId, cmt), [taskId, cmt, onReply]);

  return (
    <JobCommentItem level={cmt.level}>
      <JobCommentAvatar>
        {cmt.userName ? cmt.userName.charAt(0).toUpperCase() : "U"}
      </JobCommentAvatar>
      <JobCommentBody>
        <TaskCommentBox>
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
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formatCommentContent(cmt.content)) }}
          />
        </TaskCommentBox>
        <JobCommentActions>
          <Flex1Box>
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
          </Flex1Box>
          
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
  handleOpenCommentMenu,
  handleLikeComment,
  handleReplyComment,
  handleDownloadFile,
  handleViewFile,
  textareaRef,
  currentUserId,
  meetingData
}) => {
  const taskId = task.id || task._id || idx;
  const isExpanded = expandedTasks[taskId];
  const files = taskFiles[taskId] || [];
  const rawComments = taskComments[taskId] || [];
  const comments = getOrganizedComments(rawComments);

  const exactDeadline = (function() {
    if (!meetingData) return task.deadline;
    let foundDeadline = null;
    
    const checkTasks = (tasksArr) => {
      if (!tasksArr || !Array.isArray(tasksArr)) return;
      const match = tasksArr.find(t => (t.id || t._id) === taskId);
      if (match && match.deadline) foundDeadline = match.deadline;
    };

    if (meetingData.peopleInRoom) {
      const pInRoom = meetingData.peopleInRoom;
      const arr = Array.isArray(pInRoom) ? pInRoom : 
                 (pInRoom?.unitId ? [pInRoom] : Object.values(pInRoom).filter(v => v && typeof v === 'object' && v.unitId));
      arr.forEach(u => checkTasks(u.tasks));
    }

    if (!foundDeadline && meetingData.units) {
      meetingData.units.forEach(u => checkTasks(u.tasks));
    }

    return foundDeadline || task.deadline;
  })();

  const onToggle = useCallback(() => handleToggleTaskExpand(taskId), [taskId, handleToggleTaskExpand]);
  
  const onCommentChange = useCallback((e) => {
    handleCommentChange(taskId, e.target.value, e.target);
  }, [taskId, handleCommentChange]);

  const onKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendComment(taskId);
    }
  }, [taskId, handleSendComment]);

  const onSendClick = useCallback(() => {
    handleSendComment(taskId);
  }, [taskId, handleSendComment]);

  const setRef = useCallback((el) => {
    textareaRef.current[taskId] = el;
  }, [taskId, textareaRef]);

  return (
    <DocumentBox>
      <DocumentHeaderWrapper onClick={onToggle}>
        <FlexOneBox>
          <TaskTitle variant="subtitle2">
            {idx + 1}. {task.documentName}
          </TaskTitle>
          <DocumentInfoRow>
            <DocumentLabel>Thời hạn : </DocumentLabel>
            <DocumentValue> { exactDeadline ? dayjs(exactDeadline).format("HH:mm - DD/MM/YYYY") : "---"}</DocumentValue>
          </DocumentInfoRow>
          {task.content && (
            <DocumentInfoRow>
              <DocumentLabel>Nội dung : </DocumentLabel>
              <DocumentValue preLine> { task.content}</DocumentValue>
            </DocumentInfoRow>
          )}
        </FlexOneBox>
        <IconButton size="small">
          {isExpanded ? <ArrowUpIcon /> : <ArrowDownIcon />}
        </IconButton>
      </DocumentHeaderWrapper>

      {isExpanded && (
        <ExpandedTaskContent>
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

          <TaskCommentsSection>
            <SectionSubtitle variant="subtitle2">Thảo luận tài liệu</SectionSubtitle>
            <JobCommentSection>
              {comments.map((cmt, i) => (
                <CommentItemRow 
                  key={cmt.id || cmt._id || i} 
                  cmt={cmt} 
                  taskId={taskId} 
                  onOpenMenu={handleOpenCommentMenu}
                  onLike={handleLikeComment}
                  onReply={handleReplyComment}
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
        </ExpandedTaskContent>
      )}
    </DocumentBox>
  );
});

TaskDocumentItem.displayName = 'TaskDocumentItem';

const MeetingTasksPreparation = ({ 
  tasks = [], 
  showHeader = true,
  title = "Tài liệu họp cần chuẩn bị",
  meetingData
}) => {
  const dispatch = useDispatch();
  const toast = useToast();
  
  const [isTasksExpanded, setIsTasksExpanded] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [taskFiles, setTaskFiles] = useState({});
  const [taskComments, setTaskComments] = useState({});
  const [commentText, setCommentText] = useState({}); // Keyed by taskId
  const [editingComment, setEditingComment] = useState(null); // { taskId, commentId }
  const [replyingToComment, setReplyingToComment] = useState(null); // { taskId, commentId }
  const [commentMenuAnchor, setCommentMenuAnchor] = useState(null);
  const [selectedCommentForMenu, setSelectedCommentForMenu] = useState(null);
  const [selectedTaskIdForMenu, setSelectedTaskIdForMenu] = useState(null);
  
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

  const handleToggleTasksExpanded = useCallback(() => {
    setIsTasksExpanded(prev => !prev);
  }, []);

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
  }, [dispatch]);

  // Extract users for mention
  useEffect(() => {
    if (meetingData) {
      const users = [];
      
      // Units and participants
      if (meetingData.units && Array.isArray(meetingData.units)) {
        meetingData.units.forEach(unit => {
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

      // Unique by ID or Name
      const unique = Array.from(new Map(users.map(u => [u.id || u.name, u])).values());
      setMentionUsers(unique);
    }
  }, [meetingData]);

  const handleSelectMention = useCallback((user) => {
    const taskId = selectedTaskIdForMenu; 
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

  // Organize comments hierarchically helper
  // const getOrganizedComments = (commentList) => {
  //   if (!commentList || !Array.isArray(commentList)) return [];

  //   const commentMap = {};
  //   const rootComments = [];

  //   commentList.forEach((cmt) => {
  //     const id = cmt.id || cmt._id;
  //     commentMap[id] = { ...cmt, children: [] };
  //   });

  //   commentList.forEach((cmt) => {
  //     const id = cmt.id || cmt._id;
  //     const node = commentMap[id];
  //     if (cmt.parentId && commentMap[cmt.parentId]) {
  //       commentMap[cmt.parentId].children.push(node);
  //     } else {
  //       rootComments.push(node);
  //     }
  //   });

  //   const flatten = (nodes, level = 0) => {
  //     let res = [];
  //     nodes.forEach((node) => {
  //       res.push({ ...node, level });
  //       if (node.children?.length > 0) {
  //         res = res.concat(flatten(node.children, level + 1));
  //       }
  //     });
  //     return res;
  //   };

  //   return flatten(rootComments);
  // };

  const handleToggleTaskExpand = useCallback((taskId) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  }, []);

  // Effect to fetch initial data
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      tasks.forEach(task => {
        const taskId = task.id || task._id;
        if (taskId) {
          fetchTaskFiles(taskId);
          fetchTaskComments(taskId);
        }
      });
    }
  }, [tasks, fetchTaskFiles, fetchTaskComments]);

  // Comment Handlers
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
        setSelectedTaskIdForMenu(taskId);
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
      if (editingComment && editingComment.taskId === taskId) {
        await dispatch(updateCommentInMeeting({
          documentId: taskId,
          commentId: editingComment.commentId,
          content: text,
        })).unwrap();
      } else if (replyingToComment && replyingToComment.taskId === taskId) {
        const replyData = {
          userId,
          userName,
          content: text,
          fileId: [],
          mentionIds: [],
        };
        await dispatch(replyToCommentInMeeting({
          documentId: taskId,
          commentId: replyingToComment.commentId,
          replyData,
        })).unwrap();
      } else {
        const commentData = {
          userId,
          userName,
          content: text,
          fileId: [],
          mentionIds: mentionedIds[taskId] || [],
        };
        await dispatch(addCommentToMeeting({
          documentId: taskId,
          commentData,
          type: "meeting",
        })).unwrap();
      }
      
      setCommentText(prev => ({ ...prev, [taskId]: "" }));
      setEditingComment(null);
      setReplyingToComment(null);
      fetchTaskComments(taskId); // Refresh comments
    } catch (error) {
      logger.error("Error sending comment:", error);
    }
  }, [commentText, editingComment, replyingToComment, dispatch, fetchTaskComments]);

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
      return { ...prev, [taskId]: updatedComments };
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
    setReplyingToComment({ taskId, commentId: comment.id || comment._id });
    setEditingComment(null);
    const authorName = comment.userName || "User";
    setCommentText(prev => ({ ...prev, [taskId]: `@${authorName} ` }));
    if (textareaRef.current[taskId]) {
      textareaRef.current[taskId].focus();
    }
  }, []);

  const handleOpenCommentMenu = useCallback((event, taskId, comment) => {
    setCommentMenuAnchor(event.currentTarget);
    setSelectedCommentForMenu(comment);
    setSelectedTaskIdForMenu(taskId);
  }, []);

  const handleCloseCommentMenu = useCallback(() => {
    setCommentMenuAnchor(null);
    setSelectedCommentForMenu(null);
  }, []);

  const handleEditComment = useCallback(() => {
    if (selectedCommentForMenu) {
      const taskId = selectedTaskIdForMenu;
      const comment = selectedCommentForMenu;
      setCommentText(prev => ({ ...prev, [taskId]: comment.content || "" }));
      setEditingComment({ taskId, commentId: comment.id || comment._id });
      if (textareaRef.current[taskId]) {
        textareaRef.current[taskId].focus();
      }
    }
    handleCloseCommentMenu();
  }, [selectedCommentForMenu, selectedTaskIdForMenu, handleCloseCommentMenu]);

  const handleDeleteComment = useCallback(async () => {
    if (selectedCommentForMenu) {
      const taskId = selectedTaskIdForMenu;
      const comment = selectedCommentForMenu;
      const commentId = comment.id || comment._id;
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
    handleCloseCommentMenu();
  }, [selectedCommentForMenu, selectedTaskIdForMenu, dispatch, toast, fetchTaskComments, handleCloseCommentMenu]);

  const handleViewFile = useCallback(async (file) => {
    if (!file || !(file.id || file._id)) {
      toast("File không hợp lệ hoặc không có ID.", "warning");
      return;
    }

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
      toast("Không thể tải file để xem trước.", "error");
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
      toast("Tải xuống thất bại!", "error");
    }
  }, [toast]);

  const handleCloseFileViewer = useCallback(() => {
    if (viewingTaskFile.url) {
      URL.revokeObjectURL(viewingTaskFile.url);
    }
    setViewingTaskFile({
      open: false,
      url: null,
      name: '',
      type: null,
      "is_important": false,
    });
  }, [viewingTaskFile.url]);
  if (!tasks || tasks.length === 0) {
    return null;
  }

  return (
    <>
      <StyledBoxContainerContent>
        {showHeader && (
          <ParticipantHeaderBox 
            onClick={handleToggleTasksExpanded}
            isExpanded={isTasksExpanded}
          >
            <StyledHeaderContent variant="h6" mt={0}>
              {title}
            </StyledHeaderContent>
            <FlexCenterGap16>
              <ParticipantStats mb={0}>
                <StatItem colorType="blue">
                  Tài liệu cần chuẩn bị : <span>{tasks.length} loại tài liệu</span>
                </StatItem>
              </ParticipantStats>
              {isTasksExpanded ? <ArrowUpIcon /> : <ArrowDownIcon />}
            </FlexCenterGap16>
          </ParticipantHeaderBox>
        )}
        
        {(!showHeader || isTasksExpanded) && (
          <TaskListContainer>
            {tasks.map((task, idx) => (
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
                handleOpenCommentMenu={handleOpenCommentMenu}
                handleLikeComment={handleLikeComment}
                handleReplyComment={handleReplyComment}
                handleDownloadFile={handleDownloadFile}
                handleViewFile={handleViewFile}
                textareaRef={textareaRef}
                currentUserId={currentUserId}
                meetingData={meetingData}
              />
            ))}
          </TaskListContainer>
        )}
      </StyledBoxContainerContent>

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

      {/* File Preview Dialog */}
      <FileViewerDialog
        open={viewingTaskFile.open}
        onClose={handleCloseFileViewer}
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
        <SkyBox >
          <SkyList dense>
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
          </SkyList>
        </SkyBox>
      </Popover>
    </>
  );
};

export default MeetingTasksPreparation;
