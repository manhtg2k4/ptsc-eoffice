import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import DOMPurify from "dompurify";
import {
  Backdrop,
  Box,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Popover,
  Stack,
  Typography,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import {
 
  FileUploadOutlined,
  //  KeyboardArrowDown,
  //   KeyboardArrowUp 
} from "@mui/icons-material";
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';

import withSharedComponents from "@components/WrapperComponent";
import Comment from "@components/Comment";
import FileViewerDialog from "@components/CustomDialog/FileViewerDialog";
import {
  addCommentToDocument,
  replyToCommentInDocument,
} from "@redux/slices/SharedCategory/managementUnitSlice";
import { styled } from "@mui/material/styles";
import SendRoundedIcon from "@mui/icons-material/SendRounded";

import {
  // OpinionButton,
  OpinionForm,
  OpinionHeader,
  OpinionTitle,
  SeeMoreButton,
  // SubmitOpinionButton,
  RecursiveCommentContainer,
  OpinionFormV2,
  // OpinionContent,
  // OpinionContentV2,
  StyledBoxInputCommentAndButtonSend,
  // StyledBoxContainerContent,
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import { uploadFileToCmt } from "@redux/slices/Comment/CommentSlice";
import {
  FileActions,
  FileName,
  StyleAttachFile,
  StyledIconDown,
  // StyledIconKeyboardArrow,
  StyledIconView,
  UploadedFilePreview,
} from "@styles/UploadFile/UploadFile.style";
import { ActionIconButton } from "@styles/CustomTable.styles";
import {
  APP_BASE,
  API_DETAIL_USER,
  API_XLSX_TO_PDF,
} from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";
import * as XLSX from "xlsx";
import CustomInput from "@components/CustomInput/CustomInputBase";

const StyledBackdrop = styled(Backdrop)(({ theme }) => ({
  color: "#fff",
  zIndex: theme.zIndex.modal + 1,
}));

const StyledLoadingStack = styled(Stack)(({ theme }) => ({
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing(2),
}));

const StyledCircularProgress = styled(CircularProgress)(() => ({
  color: "inherit",
}));

const StyledCircularBox = styled(Box)(() => ({
  display: "flex",
  justifyContent: "center",
  p: 2,
}));
// --- HELPER FUNCTIONS ---
const CommentListContainer = styled(Box, {
  shouldForwardProp: (prop) =>
    prop !== "styledMaxHeightCommentListContainer" && prop !== "type",
})(({ theme, styledMaxHeightCommentListContainer }) => ({
  // Dùng flexGrow: 1 để giãn ra hết khoảng không còn lại giữa Header và Input
  flexGrow: styledMaxHeightCommentListContainer ? 0 : 1,
  flexShrink: 1,
  flexBasis: styledMaxHeightCommentListContainer ? "auto" : "0",
  [theme.breakpoints.down("lg")]: {
    flexBasis: "auto",
    maxHeight: "350px",
  },
  height: styledMaxHeightCommentListContainer || "auto",
  overflowY: "auto",
  overflowX: "hidden",
  width: "100%",
  minHeight: 0,
  paddingRight: theme.spacing(1),
  paddingBottom: theme.spacing(1),
  '&::-webkit-scrollbar': {
    width: 8,
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: '#9E9E9E',
    borderRadius: 8,
  },
}));

const ReplyList = styled(Box, {
  shouldForwardProp: (prop) => prop !== "parentLevel",
})(({ parentLevel }) => ({
  position: "relative",
  "&::before": {
    content: '""',
    position: "absolute",
    top: -14,
    bottom: 0,
    left: parentLevel === 0 ? 17 : 61,
    width: 2,
    borderRadius: 2,
    backgroundColor: "#DDE3EA",
    zIndex: 0,
    pointerEvents: "none",
  },
}));

const StyledRecursiveCommentContainer = styled(RecursiveCommentContainer, {
  shouldForwardProp: (prop) =>
    !["isLastChild", "showRootContinuation", "shouldMaskConnector"].includes(prop),
})(({ theme, isLastChild, level, showRootContinuation, shouldMaskConnector }) => ({
  position: "relative",
  ...(showRootContinuation && {
    "&::before": {
      content: '""',
      position: "absolute",
      left: 17,
      top: 35,
      bottom: -16,
      width: 2,
      borderRadius: 2,
      backgroundColor: "#DDE3EA",
      zIndex: 0,
      pointerEvents: "none",
    },
  }),
  ...(isLastChild &&
    shouldMaskConnector &&
    level > 0 && {
      "&::after": {
        content: '""',
        position: "absolute",
        left: -1,
        top: 18,
        bottom: -16,
        width: 4,
        backgroundColor: theme.palette.background.paper,
        zIndex: 1,
        pointerEvents: "none",
      },
    }),
}));

const BoxStyle = styled(Box)(() => ({
  wordBreak: "break-word",
  overflowWrap: "break-word",
  maxWidth: "100%",
  '& p': {
    margin: 0,
  },
}));

const StyleBoxContainerComment = styled(Box)(() => ({
  display: "flex",
  flexDirection: "column",
  height: "100%",
  flex: 1, // Đảm bảo chiếm trọn 452px từ cha
  overflow: "hidden",
  position: "relative",
  padding: 0
}));

const HeaderTitleContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
});

const HeaderBadgeContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
});

const StyledChatBubbleOutlineIcon = styled(ChatBubbleOutlineIcon)({
  color: '#0F5F82',
  fontSize: 19,
});

const StyledOpinionTitle = styled(OpinionTitle)(({ theme }) => ({
  margin: 0,
  fontSize: '16px',
  lineHeight: 1.4,
  color: theme.palette.text.primary,
}));

const CommentBadge = styled(Box)({
  padding: '4px 10px',
  borderRadius: '14px',
  border: '1px solid #2E7B9F',
  color: '#2E7B9F',
  fontSize: '12px',
  lineHeight: 1.4,
  fontWeight: 500,
});

const StyledOpinionHeader = styled(OpinionHeader)(({ theme }) => ({
  paddingBottom: '12px',
  borderBottom: `1px solid ${theme.palette.divider}`,
  marginBottom: '16px',
}));

const FooterSection = styled(Box)({
  marginTop: '16px',
});

const FooterTitle = styled(Typography)(({ theme }) => ({
  fontSize: '14px',
  fontWeight: 'bold',
  marginBottom: '8px',
  color: theme.palette.text.primary,
}));

const StyledOpinionFormV2 = styled(OpinionFormV2)({
  borderTop: 'none',
  padding: 0,
  marginTop: 0,
});

const InputWrapper = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f8f9fa',
  borderRadius: '8px',
  padding: '8px',
  width: '100%',
  marginBottom: '12px',
}));

const StyledInputComponents = styled('div')({
  width: '100%',
  '& .MuiInputBase-root': {
    backgroundColor: 'transparent',
    border: 'none',
    '& fieldset': { border: 'none' },
  },
});

const ButtonGroup = styled(StyledBoxInputCommentAndButtonSend)({
  justifyContent: 'space-between',
  width: '100%',
});

const SendOpinionButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== "hasValue",
})(({ hasValue }) => ({
  borderRadius: '8px',
  textTransform: 'none',
  flexGrow: 1,
  marginRight: '8px',
  backgroundColor: hasValue ? '#0c63d4ff' : '#8eaed7',
  color: '#fff',
  '&:hover': {
    backgroundColor: hasValue ? '#0b57b9' : '#7a9cc5',
  },
}));

const StyledSendRoundedIcon = styled(SendRoundedIcon)({
  fontSize: 18,
  transform: 'rotate(-45deg)',
  marginBottom: '4px',
});

const MoreOptionsButton = styled(Button)(({ theme }) => ({
  minWidth: 'auto',
  width: '36px',
  height: '36px',
  padding: 0,
  borderRadius: '8px',
  color: theme.palette.primary.main,
  borderColor: theme.palette.primary.main,
}));



function buildCommentTree(comments) {
  if (!Array.isArray(comments) || comments.length === 0) {
    return [];
  }
  const commentMap = {};
  const rootComments = [];
  comments.forEach((comment) => {
    commentMap[comment.id] = { ...comment, replies: [] };
  });
  comments.forEach((comment) => {
    
    if (comment.parentId && commentMap[comment.parentId]) {
      commentMap[comment.parentId].replies.push(commentMap[comment.id]);
    } else {
      rootComments.push(commentMap[comment.id]);
    }
  });
  return rootComments;
}

function formatVietnameseDate(isoString) {
  if (!isoString) return "";
  try {
    return new Date(isoString).toLocaleString("vi-VN");
  } catch (error) {
    return isoString;
  }
}

// Helper này dùng để hiển thị icon và làm fallback
function getFileTypeForFile(fileName) {
  if (!fileName) return null;
  const name = fileName.toLowerCase();

  if (name.endsWith(".pdf")) return "pdf";
  if (name.match(/\.(html|htm)$/)) return "html";
  if (name.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg|heic)$/)) return "image";
  if (name.match(/\.(doc|docx)$/)) return "doc";
  if (name.match(/\.(xls|xlsx)$/)) return "excel";
  if (name.match(/\.(ppt|pptx)$/)) return "ppt";
  if (name.endsWith(".txt")) return "txt";
  if (name.match(/\.(mp4|avi|mov|mkv|webm)$/)) return "video";

  return "other";
}

function AttachmentItem({ file, onView, onDownload }) {
  const handleView = useCallback(() => {
    if (onView) onView(file);
  }, [onView, file]);

  const handleDownload = useCallback(() => {
    if (onDownload) onDownload(file);
  }, [onDownload, file]);

  return (
    <UploadedFilePreview>
      <StyleAttachFile />
      <FileName>{file.file_name}</FileName>
      <FileActions>
        <ActionIconButton onClick={handleView}>
          <StyledIconView />
        </ActionIconButton>
        <ActionIconButton onClick={handleDownload}>
          <StyledIconDown />
        </ActionIconButton>
      </FileActions>
    </UploadedFilePreview>
  );
}

AttachmentItem.propTypes = {
  file: PropTypes.object.isRequired,
  onView: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
};

const decodeHtml = (html) => {
  if (!html) return "";
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};
// const renderCommentContent = (content) => {
//   const mentionRegex = /(@[a-zA-ZÀ-ỹ\s]+?\u200B)/g;
//   const parts = content.split(mentionRegex);

//   return (
//     <Typography variant="body2" component="span">
//       {parts.map((part, index) => {
//         // Kiểm tra xem phần này có khớp với regex mention không
//         if (part.match(mentionRegex)) {
//           return (
//             <span key={index} style={{ color: "#3B82F6"}}>
//               {part.replace(/\u200B/g, '')}
//             </span>
//           );
//         }
//         // Nếu không, đây là văn bản thường - sử dụng inherit để theo theme
//         return (
//           <span key={index}>
//             {part}
//           </span>
//         );
//       })}
//     </Typography>
//   );
// };

const renderCommentContent = (content) => {
  const decodedContent = decodeHtml(content);
  // const content = "<div style='color:#3375FF;'>Đây là dòng 1<br/><b>Dòng 2</b><br/><span style='color:red;'>Dòng 3 màu đỏ</span></div>";
  return (
    <BoxStyle
      component="div"
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(`<p>${decodedContent}</p>`) }}
    />
  );
};

// --- SUB COMPONENT ---

function RecursiveComment({
  comment,
  rootCommentId,
  level = 0,
  onReply,
  onViewFile,
  onDownloadFile,
  isLast,
  InputComponents,
  rootHasNextSibling = false,
  nestedColumnHasContinuation = false,
}) {

  const [isExpanded, setIsExpanded] = useState(false);
  const handleToggleExpand = useCallback(
    () => setIsExpanded((prev) => !prev),
    []
  );

  const MAX_INDENT_LEVEL = 2; // Cấp 0, 1, 2 có thụt lề (hiển thị là cấp 1, 2, 3)

  const handleReply = useCallback(
    (replyText, commentId) => {
      onReply(replyText, commentId, rootCommentId);
    },
    [rootCommentId, onReply]
  );

  // Phân loại replies: những cái còn trong giới hạn indent vs những cái ngoài
 const sortedReplies = Array.isArray(comment.replies)
    ? [...comment.replies].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    )
    : [];

  const visibleReplies = isExpanded ? sortedReplies : sortedReplies.slice(0, 3);

  // const isWithinIndentLimit = level <= MAX_INDENT_LEVEL;
  const nextLevel = level + 1;
  const shouldIndentChildren = nextLevel <= MAX_INDENT_LEVEL;
  const shouldMaskConnector =
    isLast &&
    level > 0 &&
    (level === 1 ? !rootHasNextSibling : !nestedColumnHasContinuation);

  const getChildNestedColumnContinuation = useCallback(() => {
    if (level >= 2) {
      return nestedColumnHasContinuation || !isLast;
    }
    return false;
  }, [isLast, level, nestedColumnHasContinuation]);

  return (
    <>
      <StyledRecursiveCommentContainer
        level={Math.min(level, MAX_INDENT_LEVEL)}
        isLastChild={isLast}
        showRootContinuation={level === 0 && rootHasNextSibling}
        shouldMaskConnector={shouldMaskConnector}
      >
        <Comment
          username={comment.userName}
          role={comment.positionName || ''}
          tags={comment.departmentName ? [comment.departmentName] : []}
          isLast={isLast}
          isReply={level > 0}
          hasReplies={sortedReplies.length > 0}
          content={
            <>
              {renderCommentContent(comment.content)}
              {Array.isArray(comment.fileId) &&
                comment.fileId.map((file) => (
                  <AttachmentItem
                    key={file.id}
                    file={file}
                    onView={onViewFile}
                    onDownload={onDownloadFile}
                  />
                ))}
            </>
          }
          time={formatVietnameseDate(comment.createdAt)}
          onReply={handleReply}
          commentId={comment.id}
          rootCommentId={rootCommentId}
          dataComment={comment}
          InputComponents={InputComponents}
          variant="opinionFlow"
        />

        {/* Chỉ render replies còn trong giới hạn indent BÊN TRONG container này */}
        {shouldIndentChildren && visibleReplies.length > 0 && (
          <ReplyList parentLevel={Math.min(level, MAX_INDENT_LEVEL)}>
            {visibleReplies.map((reply, index) => (
              <RecursiveComment
                key={reply.id}
                comment={reply}
                rootCommentId={rootCommentId}
                level={nextLevel}
                onReply={onReply}
                onViewFile={onViewFile}
                onDownloadFile={onDownloadFile}
                InputComponents={InputComponents}
                isLast={index === visibleReplies.length - 1}
                rootHasNextSibling={rootHasNextSibling}
                nestedColumnHasContinuation={getChildNestedColumnContinuation()}
              />
            ))}
          </ReplyList>
        )}
      </StyledRecursiveCommentContainer>

      {/* Render replies vượt quá giới hạn indent BÊN NGOÀI container */}
      {!shouldIndentChildren && visibleReplies.length > 0 && (
        <ReplyList parentLevel={MAX_INDENT_LEVEL}>
          {visibleReplies.map((reply, index) => (
            <RecursiveComment
              key={reply.id}
              comment={reply}
              rootCommentId={rootCommentId}
              level={nextLevel}
              onReply={onReply}
              onViewFile={onViewFile}
              onDownloadFile={onDownloadFile}
              InputComponents={InputComponents}
              isLast={index === visibleReplies.length - 1}
              rootHasNextSibling={rootHasNextSibling}
              nestedColumnHasContinuation={getChildNestedColumnContinuation()}
            />
          ))}
        </ReplyList>
      )}

      {sortedReplies.length > 3 && (
        <SeeMoreButton onClick={handleToggleExpand} size="small">
          {isExpanded ? "Thu gọn" : "Xem thêm"}
          {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        </SeeMoreButton>
      )}
    </>
  );
}

RecursiveComment.propTypes = {
  comment: PropTypes.object.isRequired,
  rootCommentId: PropTypes.string,
  level: PropTypes.number,
  onReply: PropTypes.func.isRequired,
  onViewFile: PropTypes.func.isRequired,
  onDownloadFile: PropTypes.func.isRequired,
  InputComponents: PropTypes.elementType.isRequired,
  isLast: PropTypes.bool,
  rootHasNextSibling: PropTypes.bool,
  nestedColumnHasContinuation: PropTypes.bool,
};

// --- MAIN COMPONENT ---

function CustomComment({
  documentId,
  comments,
  sharedComponents,
  type,
  noneTitle,
  isDetailMeeting,
  styledMaxHeightCommentListContainer,
  label = 'Ý kiến xử lý',
  labelComment = 'Ý kiến của bạn'
}) {
  const { dataUser } = useSelector((state) => state.auth);
  const userData = useMemo(() => dataUser || {}, [dataUser]);
  const { InputComponents, toast } = sharedComponents;
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  const [showOpinionInput, setShowOpinionInput] = useState(false);
  // const [isExpanded, setIsExpanded] = useState(false);
  const [opinionText, setOpinionText] = useState("");

  const [uploadedFile, setUploadedFile] = useState(null);

  // States Viewer
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [dataViewFile, setDataViewFile] = useState(null);
  const [viewingFileInfo, setViewingFileInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // State for mention popup
  const [mentionAnchorEl, setMentionAnchorEl] = useState(null);
  const [mentionSearchTerm, setMentionSearchTerm] = useState("");
  const [mentionUsers, setMentionUsers] = useState([]);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);
  const [mentionedIds, setMentionedIds] = useState([]);

  const [isOpenBoardArrow,] = useState(true);

  // State quan trọng: Quyết định chế độ hiển thị của Dialog (html, pdf, video, image, txt)
  const [viewingFileType, setViewingFileType] = useState(null);

  const commentTree = React.useMemo(
    () => buildCommentTree(comments),
    [comments]
  );

  useEffect(() => {
    // Nếu popover không mở hoặc không có documentId, không làm gì cả
    if (!mentionAnchorEl || !documentId) {
      return;
    }

    // Đặt timeout để debounce việc gọi API
    const handler = setTimeout(async () => {
      setIsFetchingUsers(true);
      try {
        const response = await api.get(API_DETAIL_USER(documentId));
        const usersData = response.data?.data;
        if (Array.isArray(usersData)) {
          setMentionUsers(usersData);
        } else {
          setMentionUsers([]);
        }
      } catch (error) {
        setMentionUsers([]);
      } finally {
        setIsFetchingUsers(false);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [mentionAnchorEl, documentId]);

  const handleUploadOpinion = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleOpinionTextChange = useCallback((event) => {
    const textarea = event.target;
    const value = textarea.value;
    setOpinionText(value);

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (
      atIndex !== -1 &&
      (atIndex === 0 || /[\s\u200B]/.test(textBeforeCursor[atIndex - 1]))
    ) {
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

  // const handleToggleOpinionInput = useCallback(
  //   () => setShowOpinionInput((prev) => !prev),
  //   []
  // );
  // const handleToggleExpand = useCallback(
  //   () => setIsExpanded((prev) => !prev),
  //   []
  // );

  const handleSubmitOpinion = useCallback(async () => {
    if (!opinionText || !opinionText.trim()) {
      toast("Ý kiến xử lý không được để trống!", "error");
      return;
    }
    if (opinionText.length > 500) {
      toast("Ý kiến xử lý không được vượt quá 500 ký tự!", "error");
      return;
    }
    try {
      const commentData = {
        userId: userData?._id || userData?.id || userData?.user?._id || userData?.user?.id,
        userName: userData?.name || userData?.username || userData?.user?.name || userData?.user?.username,
        content: opinionText,
        fileId: uploadedFile ? [uploadedFile] : [],
        mentionIds: mentionedIds,
      };
      await dispatch(
        addCommentToDocument({ documentId, commentData, type })
      ).unwrap();
      setOpinionText("");
      setUploadedFile(null);
      setMentionedIds([]); // Reset danh sách ID sau khi gửi

      setShowOpinionInput(false);
    } catch (error) {
      logger.error(error);
    }
  }, [documentId, opinionText, uploadedFile, dispatch, mentionedIds, type, toast, userData]);

  const handleReplyComment = useCallback(
    async (replyText, parentId, rootCommentId) => {
      if (!replyText || !replyText.trim() || !documentId) return;
      if (replyText.length > 500) {
        toast("Nội dung phản hồi không được vượt quá 500 ký tự!", "error");
        return;
      }
      try {
        const replyData = {
          userId: userData?._id || userData?.id || userData?.user?._id || userData?.user?.id,
          userName: userData?.name || userData?.username || userData?.user?.name || userData?.user?.username,
          content: replyText,
        };
        await dispatch(
          replyToCommentInDocument({
            documentId,
            commentId: rootCommentId,
            parentId,
            replyData,
            type,
          })
        ).unwrap();
      } catch (error) {
        logger.error(error);
        throw error; // Re-throw để Comment component biết có lỗi
      }
    },
    [documentId, dispatch, type, toast, userData]
  );

  const handleFileSelected = useCallback(
    async (e) => {
      try {
        const file = e.target.files[0];
        if (!file) return;

        // Chặn file trên 100MB
        const maxSize = 100 * 1024 * 1024; // 100MB in bytes
        if (file.size > maxSize) {
          toast("Bạn không được upload file quá 100MB", "error");
          e.target.value = ""; // Clear the input
          return;
        }

        const formData = new FormData();
        formData.append("file", file);
        const res = await dispatch(uploadFileToCmt(formData)).unwrap();
        setUploadedFile(res?.payload ? res?.payload : res);
        toast("Tải file đính kèm thành công!", "success");
      } catch (error) {
        toast("Tải file đính kèm thất bại!", "error");
      }
    },
    [dispatch, toast]
  );

  const handleCloseFileViewer = useCallback(() => {
    setFileViewerOpen(false);
    if (dataViewFile) {
      URL.revokeObjectURL(dataViewFile);
      setDataViewFile(null);
      setViewingFileInfo(null);
      setViewingFileType(null);
    }
  }, [dataViewFile]);

  // --- HÀM XEM FILE: XỬ LÝ MỌI ĐỊNH DẠNG ---
  const viewFile = useCallback(
    async (file) => {
      const fileName = file.file_name || file.fileName || file.name || "file";
      const fileId = file.id || file._id;
      const lower = fileName.toLowerCase();

      // Phân loại
      const isDoc = /\.(doc|docx)$/i.test(lower);
      const isExcel = /\.(xls|xlsx)$/i.test(lower);
      const isOtherOffice = /\.(ppt|pptx)$/i.test(lower); // PPT only
      const isBrowserFile = /\.(pdf|jpeg|jpg|png|gif|webp|bmp)$/i.test(lower);
      const isTxt = /\.(txt)$/i.test(lower);
      const isVideo = /\.(mp4|avi|mov|mkv|webm)$/i.test(lower);

      setViewingFileInfo(file); // Lưu tên gốc
      setViewingFileType(null); // Reset loại file xem trước

      const wrapHtml = (htmlContent) => `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body{font-family:Arial,sans-serif;padding:20px;background:#fff;}
              table{border-collapse:collapse;width:100%;font-size:14px;}
              th,td{border:1px solid #ddd;padding:8px;text-align:left;}
              th{background:#f4f4f4;font-weight:bold;}
              tr:nth-child(even){background:#fafafa;}
            </style>
          </head>
          <body>${htmlContent}</body>
        </html>`;

      try {
        setIsLoading(true);

        // A. TRƯỜNG HỢP EXCEL -> PDF
        if (isExcel) {
          let blob;
          if (file.rawFile instanceof File && !fileId) {
            const formData = new FormData();
            formData.append("file", file.rawFile);

            const res = await api.post(API_XLSX_TO_PDF, formData, {
              responseType: "blob",
              timeout: 0,
            });
            blob = new Blob([res.data], { type: "application/pdf" });
          } else if (fileId) {
            // 1. Download file from server
            const downloadUrl = `${APP_BASE}/api/files/download/${fileId}`;
            const fileRes = await api.get(downloadUrl, {
              responseType: "blob",
              timeout: 0,
            });

            // 2. Convert to PDF using new API
            const formData = new FormData();
            formData.append("file", new File([fileRes.data], fileName));

            const res = await api.post(API_XLSX_TO_PDF, formData, {
              responseType: "blob",
              timeout: 0,
            });

            blob = new Blob([res.data], { type: "application/pdf" });
          }

          setDataViewFile(URL.createObjectURL(blob));
          setViewingFileType("pdf"); // Ép kiểu PDF cho Dialog
          setFileViewerOpen(true);
          return;
        }

        // A'. TRƯỜNG HỢP PPT -> HTML (Giữ nguyên logic cũ cho PPT)
        if (isOtherOffice) {
          let arrayBuffer;
          if (file.rawFile instanceof File && !fileId) {
            arrayBuffer = await file.rawFile.arrayBuffer();
          } else if (fileId) {
            const viewUrl = `${APP_BASE}/api/files/view/${fileId}`;
            const res = await api.get(viewUrl, {
              responseType: "blob",
              timeout: 0,
            });
            arrayBuffer = await res.data.arrayBuffer();
          }

          const workbook = XLSX.read(arrayBuffer, { type: "array" });
          if (!workbook.SheetNames.length) throw new Error("File rỗng");

          const html = XLSX.utils.sheet_to_html(
            workbook.Sheets[workbook.SheetNames[0]]
          );
          const fullHtml = wrapHtml(html);
          const blob = new Blob([fullHtml], {
            type: "text/html;charset=utf-8",
          });

          setDataViewFile(URL.createObjectURL(blob));
          setViewingFileType("html"); // Ép kiểu HTML cho Dialog
          setFileViewerOpen(true);
          return;
        }

        // B. TRƯỜNG HỢP DOC / DOCX -> PDF
        if (isDoc) {
          let blob;
          if (file.rawFile instanceof File && !fileId) {
            const formData = new FormData();
            formData.append("file", file.rawFile);
            const res = await api.post(`${APP_BASE}/api/file-to-pdf`, formData, {
              responseType: "blob",
            });
            blob = new Blob([res.data], { type: "application/pdf" });
          } else if (fileId) {
            const conversionApi = `${APP_BASE}/api/doc-url-to-pdf?id=${fileId}`;
            const res = await api.get(conversionApi, { responseType: "blob" });
            blob = new Blob([res.data], { type: "application/pdf" });
          }

          setDataViewFile(URL.createObjectURL(blob));
          setViewingFileType("pdf"); // Ép kiểu PDF cho Dialog
          setFileViewerOpen(true);
          return;
        }

        // C. TRƯỜNG HỢP TXT -> TEXT
        if (isTxt) {
          let blob;
          if (file.rawFile instanceof File && !fileId) {
            blob = file.rawFile;
          } else if (fileId) {
            const viewUrl = `${APP_BASE}/api/files/view/${fileId}`;
            const res = await api.get(viewUrl, { responseType: "blob" });
            blob = new Blob([res.data], { type: "text/plain;charset=utf-8" });
          }

          setDataViewFile(URL.createObjectURL(blob));
          setViewingFileType("txt"); // Ép kiểu TXT cho Dialog
          setFileViewerOpen(true);
          return;
        }

        // D. TRƯỜNG HỢP VIDEO
        if (isVideo) {
          let blobUrl;
          if (file.rawFile instanceof File && !fileId) {
            blobUrl = URL.createObjectURL(file.rawFile);
          } else if (fileId) {
            const viewUrl = `${APP_BASE}/api/files/view/${fileId}`;
            const res = await api.get(viewUrl, { responseType: "blob" });
            const blob = new Blob([res.data], {
              type: res.headers["content-type"] || "video/mp4",
            });
            blobUrl = URL.createObjectURL(blob);
          }

          setDataViewFile(blobUrl);
          setViewingFileType("video"); // Ép kiểu VIDEO cho Dialog
          setFileViewerOpen(true);
          return;
        }

        // E. TRƯỜNG HỢP PDF / ẢNH (Mặc định)
        if (isBrowserFile || fileId) {
          let blobUrl;
          if (file.rawFile instanceof File && !fileId) {
            blobUrl = URL.createObjectURL(file.rawFile);
            // Detect type local
            if (lower.endsWith(".pdf")) setViewingFileType("pdf");
            else setViewingFileType("image");
          } else {
            const viewUrl = `${APP_BASE}/api/files/view/${fileId}`;
            const res = await api.get(viewUrl, { responseType: "blob" });
            const blob = new Blob([res.data], {
              type: res.headers["content-type"],
            });
            blobUrl = URL.createObjectURL(blob);

            if (blob.type.includes("pdf") || lower.endsWith(".pdf"))
              setViewingFileType("pdf");
            else setViewingFileType("image");
          }

          setDataViewFile(blobUrl);
          setFileViewerOpen(true);
          return;
        }

        throw new Error("Định dạng file không hỗ trợ.");
      } catch (e) {
        logger.error(e);
        const status = e?.response?.status || e?.status;
        if (status === 403) {
          toast("Bạn không có quyền xem tài liệu này.", "error");
        } else {
          toast("Lỗi xem file: " + e.message, "error");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  const downloadFile = useCallback(
    async (file) => {
      if (!file) {
        toast("Không có file để tải!", "error");
        return;
      }
      setIsLoading(true);

      const fileName =
        file.file_name || file.fileName || file.name || "download";
      const fileId = file.id || file._id;
      const ext = fileName.split(".").pop()?.toLowerCase();

      const excelExt = ["xls", "xlsx"];
      const pptExt = ["ppt", "pptx"];
      const docExt = ["doc", "docx"];

      try {
        let blob;
        let downloadName = fileName;

        if (file.rawFile instanceof File) {
          blob = file.rawFile;
        } else if (fileId) {
          const downloadUrl = `${APP_BASE}/api/files/download/${fileId}`;
          const res = await api.get(downloadUrl, {
            responseType: "blob",
            timeout: 0,
          });

          if (excelExt.includes(ext)) {
            blob = new Blob([res.data], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
          } else if (docExt.includes(ext)) {
            blob = new Blob([res.data], {
              type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            });
          } else if (pptExt.includes(ext)) {
            blob = res.data;
          } else {
            blob = new Blob([res.data], {
              type: res.data.type || "application/octet-stream",
            });
          }
        } else {
          toast("Dữ liệu file không hợp lệ.", "error");
          setIsLoading(false);
          return;
        }

        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = downloadName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
      } catch (error) {
        logger.error(error);
        toast("Không thể tải file!", "error");
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  const handleDownloadFromViewer = useCallback(() => {
    if (dataViewFile && viewingFileInfo) {
      const a = document.createElement("a");
      a.href = dataViewFile;
      a.download = viewingFileInfo.file_name || "downloaded_file";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, [dataViewFile, viewingFileInfo]);

  const handleFormSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      await handleSubmitOpinion();
    },
    [handleSubmitOpinion]
  );

  const handleCloseMentionPopover = useCallback(() => {
    setMentionAnchorEl(null);
  }, []);

  const handleSelectMention = useCallback(
    (user) => {
      const textarea = mentionAnchorEl;
      if (!textarea) return;

      const currentValue = opinionText;
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = currentValue.substring(0, cursorPos);
      const atIndex = textBeforeCursor.lastIndexOf("@");

      if (atIndex !== -1) {
        const textAfterCursor = currentValue.substring(cursorPos);
        const newText =
          currentValue.substring(0, atIndex) + // Phần text trước @
          `@${user.name} ` + // Tên người dùng và một khoảng trắng
          "\u200B" + // Thêm ký tự zero-width space để đánh dấu kết thúc mention
          textAfterCursor; // Phần text sau con trỏ
        setOpinionText(newText);

        // Thêm ID của người dùng được chọn vào state, đảm bảo không trùng lặp
        setMentionedIds((prevIds) => {
          const newIdSet = new Set(prevIds);
          newIdSet.add(user._id || user.id);
          return Array.from(newIdSet);
        });
        const newCursorPos = atIndex + user.name.length + 3; // Vị trí mới của con trỏ: sau @, tên, khoảng trắng, và ký tự vô hình
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
      }
      setMentionAnchorEl(null);
    },
    [opinionText, setMentionedIds, mentionAnchorEl]
  );

  const createSelectMentionHandler = useCallback(
    (user) => {
      return function selectMentionHandler() {
        handleSelectMention(user);
      };
    },
    [handleSelectMention]
  );

  // const handleToggleBoardArrow = useCallback(() => {
  //   setIsOpenBoardArrow((prev) => !prev);
  // }, []);

  return (
    <StyleBoxContainerComment >
      {/* <StyledBoxContainerContent> */}
      {!noneTitle && (
        <>
          {/* 
          // Giao diện OpinionHeader cũ (đã ẩn theo yêu cầu)
          <OpinionHeader>
            <OpinionTitle>Ý KIẾN XỬ LÝ</OpinionTitle>
            <StyledIconKeyboardArrow
              data-section="generalInfo"
              onClick={handleToggleBoardArrow}
            >
              {isOpenBoardArrow ? (
                <KeyboardArrowUp />
              ) : (
                <KeyboardArrowDown />
              )}
            </StyledIconKeyboardArrow>
          </OpinionHeader> 
          */}
          <StyledOpinionHeader>
            <HeaderTitleContainer>
              <StyledChatBubbleOutlineIcon />
              <StyledOpinionTitle>{label}</StyledOpinionTitle>
            </HeaderTitleContainer>
            <HeaderBadgeContainer>
              <CommentBadge>
                {comments?.length ? (comments.length < 10 ? `0${comments.length}` : comments.length) : "00"} ý kiến
              </CommentBadge>
            </HeaderBadgeContainer>
          </StyledOpinionHeader>
        </>
      )}

      {showOpinionInput && (
        <OpinionForm component="form" onSubmit={handleFormSubmit}>
          {/* <InputComponents
            fullWidth
            placeholder="Nhập ý kiến của bạn..."
            value={opinionText}
            onChange={handleOpinionTextChange}
            isUpfileToComment
            onUploadFile={handleUploadOpinion}
            multiline
            rows={inputRows}
          />
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileSelected}
          />
          <SubmitOpinionButton type="submit" variant="contained" size="small">
            Gửi
          </SubmitOpinionButton> */}
        </OpinionForm>
      )}

      {isOpenBoardArrow && <CommentListContainer
        styledMaxHeightCommentListContainer={styledMaxHeightCommentListContainer}
        type={type}
      >
        {Array.isArray(commentTree) &&
          commentTree.map((comment, index) => (
            <RecursiveComment
              key={comment.id}
              comment={comment}
              rootCommentId={comment.id}
              onReply={handleReplyComment}
              onViewFile={viewFile}
              onDownloadFile={downloadFile}
              InputComponents={InputComponents}
              isLast={index === commentTree.length - 1}
              rootHasNextSibling={index !== commentTree.length - 1}
            />
          ))}
      </CommentListContainer>}

      {/* Logic này đã được chuyển vào trong RecursiveComment */}
      {/* {Array.isArray(commentTree) && commentTree.length > 3 && (
        <SeeMoreButton onClick={handleToggleExpand} size="small">
          {isExpanded ? "Thu gọn" : "Xem thêm"}
          {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        </SeeMoreButton>
      )} */}

      <FileViewerDialog
        open={fileViewerOpen}
        onClose={handleCloseFileViewer}
        fileUrl={`${dataViewFile}#toolbar=0`}
        fileName={viewingFileInfo?.file_name}
        // ƯU TIÊN SỬ DỤNG STATE viewingFileType để quyết định cách hiển thị
        fileType={
          viewingFileType || getFileTypeForFile(viewingFileInfo?.file_name)
        }
        title={viewingFileInfo?.file_name || "Xem file đính kèm"}
        size="lg"
        showDownloadButton
        onDownload={handleDownloadFromViewer}
        showZoomControls
      />
      {isOpenBoardArrow && (
        <>
          {/* 
          // Giao diện Form nhập ý kiến cũ (đã ẩn theo yêu cầu)
          <OpinionFormV2 component="form" onSubmit={handleFormSubmit}>
            {uploadedFile && (
              <AttachmentItem
                file={uploadedFile}
                onView={viewFile}
                onDownload={downloadFile}
              />
            )}
            <StyledBoxInputCommentAndButtonSend isDetailMeeting={isDetailMeeting}>
              <InputComponents
                ref={textareaRef}
                fullWidth
                placeholder="Nhập ý kiến của bạn..."
                value={opinionText}
                onChange={handleOpinionTextChange}
                isUpfileToComment
                onUploadFile={handleUploadOpinion}
                rows={inputRows}
                maxRows={3}
              />

              <SubmitOpinionButton type="submit" variant="contained" size="small">
                <SendRoundedIcon />
              </SubmitOpinionButton>
            </StyledBoxInputCommentAndButtonSend>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileSelected}
            />
          </OpinionFormV2> 
          */}
          <FooterSection>
            <FooterTitle>
              {labelComment}
            </FooterTitle>
            <StyledOpinionFormV2 component="form" onSubmit={handleFormSubmit}>
              {uploadedFile && (
                <AttachmentItem
                  file={uploadedFile}
                  onView={viewFile}
                  onDownload={downloadFile}
                />
              )}
              <InputWrapper>
                {/* <StyledInputComponents as={InputComponents}
                  ref={textareaRef}
                  fullWidth
                  placeholder="Nhập nội dung chỉ đạo hoặc ý kiến cá nhân..."
                  value={opinionText}
                  onChange={handleOpinionTextChange}
                  isUpfileToComment
                  onUploadFile={handleUploadOpinion}
                  rows={inputRows || 3}
                  maxRows={5}
                /> */}
                <StyledInputComponents as={CustomInput}
                  value={opinionText}
                  onChange={handleOpinionTextChange}
                  rows={3}
                  maxRows={5}
                  multiline
                  placeholder="Nhập nội dung chỉ đạo hoặc ý kiến cá nhân..."
                />
              </InputWrapper>
              <ButtonGroup isDetailMeeting={isDetailMeeting}>
                <SendOpinionButton
                  type="submit"
                  variant="contained"
                  size="medium"
                  startIcon={<StyledSendRoundedIcon />}
                  hasValue={!!opinionText?.trim()}
                >
                  Gửi ý kiến
                </SendOpinionButton>
                <MoreOptionsButton type="button" variant="outlined" onClick={handleUploadOpinion} >
                  <FileUploadOutlined />
                </MoreOptionsButton>
              </ButtonGroup>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileSelected}
              />
            </StyledOpinionFormV2>
          </FooterSection>
        </>
      )}

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
          sx: {
            width: "300px",
            maxHeight: "250px",
          },
        }}
      >
        {isFetchingUsers ? (
          <StyledCircularBox>
            <CircularProgress size={24} />
          </StyledCircularBox>
        ) : (
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
                  <ListItem
                    key={user._id || user.id}
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
        )}
      </Popover>

      {isLoading && <StyledBackdrop open={isLoading}>
        <StyledLoadingStack>
          <StyledCircularProgress />
          <Typography variant="body1">Đang xử lý tài liệu...</Typography>
        </StyledLoadingStack>
      </StyledBackdrop>}
    </StyleBoxContainerComment>
  );
}

CustomComment.propTypes = {
  documentId: PropTypes.string,
  comments: PropTypes.array.isRequired,
  sharedComponents: PropTypes.object.isRequired,
  type: PropTypes.oneOf(["incoming", "outgoing"]),
  noneTitle: PropTypes.bool,
  isDetailMeeting: PropTypes.bool,
  styledMaxHeightCommentListContainer: PropTypes.string,
};

export default withSharedComponents(CustomComment);
