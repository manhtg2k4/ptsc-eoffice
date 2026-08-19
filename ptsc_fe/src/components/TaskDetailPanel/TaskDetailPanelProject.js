import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Tooltip, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
// import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import { useDispatch, useSelector } from "react-redux";

import { SkyBox, SkyDivider } from "@styles/SkyStyles.js";
import DOMPurify from "dompurify";
import dayjs from "dayjs";
import axiosInstance from "@utils/axiosInstance";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { APP_BASE, API_MERGE_LINK, API_PROJECT_MANAGEMENT, API_GET_COMMON_WORK_DETAIL, API_ADD_COMMON_WORK } from "@EnvironmentFile/constants/urlConfig";
import { getCommentsByTask, toggleCommentLike } from "@redux/slices/SharedCategory/managementUnitSlice";

import {
  PanelContainer,
  PanelHeader,
  PanelTitleContainer,
  PanelTitleLabel,
  PanelBody,
  XemThemButton,
  PillChip,
  TaskTitle,
  InfoCard,
  InfoCardContent,
  InfoCardRight,
  InfoValue,
  ProgressNumber,
  DeadlineText,
  StyledProgress,
  DateHintText,
  AvatarRoleBox,
  RoleLabel,
  HeaderActions,
  CloseButton,
  StatusContainer,
  DescriptionWrapper,
  ProgressHeader,
  DateHintContainer,
  ParticipantsContainer,
  StyledAvatarGroup,
  SectionHeader,
  SectionTitle,
  SubTaskCard,
  SubTaskInfo,
  SubTaskTitle,
  SubTaskDate,
  SubTaskProgressWrapper,
  MiniProgress,
  ProgressPercent,
  SubTaskListContainer,
  TabsContainer,
  TabItem,
  HistoryList,
  HistoryItem,
  HistoryIconWrapper,
  HistoryContent,
  HistoryTitle,
  HistoryTime,
  TaskCodeLink,
  StyledSkeletonText,
  StyledSkeletonRectLarge,
  StyledSkeletonRectSmall,
  LoadingWrapper,
  DescriptionBox,
  DescriptionText,
  FullWidthCenterText,
  HistoryEmptyText,
  StyledAvatar32,
  StyledDynamicAvatar,
  DiscussionList,
  DiscussionCard,
  DiscussionAvatar,
  DiscussionMain,
  DiscussionHeader,
  DiscussionAuthor,
  DiscussionDate,
  DiscussionMessage,
  DiscussionActions,
  DiscussionActionText,
  DiscussionLikeBox,
  DiscussionLikeCount,
  TimelineList,
  TimelineItem,
  TimelineDot,
  TimelineBody,
  TimelineTitle,
  TimelineTime,
  TimelineNoteButton,
  DialogNoteContent,
} from "@styles/TaskDetailPanel/TaskDetailPanel.styles.js";

// Helper to strip HTML/SVG from strings coming from table renderers reliably
const stripHtml = (html) => {
  if (!html) return "";
  if (typeof html !== "string") return html;
  try {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const text = temp.textContent || temp.innerText || "";
    // If it still contains < (rare case of double encoding), do one more pass
    if (text.includes("<") && text.includes(">")) {
      temp.innerHTML = text;
      return (temp.textContent || temp.innerText || "").trim();
    }
    return text.trim();
  } catch (e) {
    // Fallback to regex if document is not available (SSR)
    return html.replace(/<[^>]*>?/gm, "").trim();
  }
};

// Helper to extract initials safely
const getInitials = (name) => {
  const cleanName = stripHtml(name);
  if (!cleanName) return "";
  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [, d, m, y] = match;
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  }
  const d = dayjs(dateStr);
  return d.isValid() ? d.format("DD/MM/YYYY") : dateStr;
};

const MENU_COLORS = ["#F44336", "#FF9800", "#4CAF50", "#1976D2", "#9C27B0", "#EC4899", "#14B8A6"];

const getRandomAvatarColor = (username = "") => {
  const randomSeed = stripHtml(username).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return MENU_COLORS[randomSeed % MENU_COLORS.length];
};

// Map priorities and statuses to color types
const getPriorityColorType = (p) => {
  const val = stripHtml(p).toLowerCase();
  if (val.includes("gấp") || val.includes("cao")) return "red";
  if (val.includes("trung bình") || val.includes("bình thường")) return "orange";
  return "gray";
};

const getStatusColorType = (s) => {
  const val = stripHtml(s).toLowerCase();
  if (val.includes("thực hiện") || val.includes("chạy")) return "blue";
  if (val.includes("hoàn thành") || val.includes("xong")) return "green";
  return "gray";
};

const formatSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return "";
  const b = parseInt(bytes, 10);
  if (b === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Helper to check if string contains HTML tags
const hasHtml = (str) => {
  if (typeof str !== "string") return false;
  return /<[a-z][\s\S]*>/i.test(str) || str.includes("&lt;");
};

// ─── Main Component ───────────────────────────────────────────────────────────
const TaskDetailPanelProject = ({ open = false, onClose, dataDetail, documentId, handleAction }) => {
  const dispatch = useDispatch();
  const { commentsList } = useSelector((state) => state.unit || {});
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(dataDetail || {});
  const [finalDocuments, setFinalDocuments] = useState([]);
  const [projectFiles, setProjectFiles] = useState([]);
  const [taskLinks, setTaskLinks] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [fetchedSubTasks, setFetchedSubTasks] = useState([]);
  const [openNote, setOpenNote] = useState({ open: false, note: null });
  const [, setIsLoadingTabContent] = useState(false);

  const taskId = useMemo(() => {
    // Ưu tiên ID từ prop dataDetail để đảm bảo khi click dự án khác sẽ dùng ID mới ngay lập tức
    return dataDetail?.id || dataDetail?._id || documentId || detail?.id || detail?._id;
  }, [dataDetail, documentId, detail]);

  const fetchDetail = useCallback(async (id) => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await axiosInstance.get(`${API_PROJECT_MANAGEMENT}/${id}`);
      const data = response?.data?.data || response?.data || response;
      if (data) {
        setDetail(data);
      }
    } catch (error) {
      logger.error("Error fetching project detail:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTabDocuments = useCallback(async (id) => {
    if (!id) return;
    try {
      setIsLoadingTabContent(true);
      
      const [projectDocsRes, finalDocsRes, taskLinksRes] = await Promise.all([
        axiosInstance.get(`${APP_BASE}/api/files/by-object?object_type=project&object_id=${id}`),
        axiosInstance.get(`${APP_BASE}/api/files/by-object?object_type=final_documents&object_id=${id}`),
        axiosInstance.get(`${API_MERGE_LINK}?taskId=${id}`)
      ]);

      const projectDocsData = projectDocsRes?.data?.data || projectDocsRes?.data || projectDocsRes || [];
      const finalDocsData = finalDocsRes?.data?.data || finalDocsRes?.data || finalDocsRes || [];
      const taskLinksData = taskLinksRes?.data?.data || taskLinksRes?.data || taskLinksRes || [];

      setProjectFiles(Array.isArray(projectDocsData) ? projectDocsData : []);
      setFinalDocuments(Array.isArray(finalDocsData) ? finalDocsData : []);
      setTaskLinks(Array.isArray(taskLinksData) ? taskLinksData : []);
    } catch (error) {
      logger.error("Error fetching tab documents:", error);
    } finally {
      setIsLoadingTabContent(false);
    }
  }, []);

  const fetchHistory = useCallback(async (id) => {
    if (!id) return;
    try {
      const response = await axiosInstance.get(`${API_GET_COMMON_WORK_DETAIL}/${id}`);
      const responseData = response?.data || response;
      setHistoryData(Array.isArray(responseData) ? responseData : responseData?.data || []);
    } catch (error) {
      logger.error("Error fetching history:", error);
      setHistoryData([]);
    }
  }, []);

  const fetchSubTasks = useCallback(async (id) => {
    if (!id) return;
    try {
      const params = {
        "filter[projectId]": id,
        "filter[parent]": id,
        typeTask: "project",
        page: 1,
        limit: 50,
      };
      const response = await axiosInstance.get(API_ADD_COMMON_WORK, { params });
      // axiosInstance interceptor auto-unwraps all .data layers
      // response could be the array directly, or { data: [...], total } before final unwrap
      const responseData = response?.data || response;
      const tasks = responseData?.data || responseData || [];
      setFetchedSubTasks(Array.isArray(tasks) ? tasks : []);
    } catch (error) {
      logger.error("Error fetching sub tasks:", error);
    }
  }, []);

  const fetchComments = useCallback(async (id) => {
    if (!id) return;
    try {
      await dispatch(getCommentsByTask({ documentId: id })).unwrap();
    } catch (error) {
      logger.error("Error fetching comments:", error);
    }
  }, [dispatch]);

  const handleNoteClick = useCallback((note) => {
    setOpenNote({ open: true, note });
  }, []);

  const handleCloseNote = useCallback(() => {
    setOpenNote({ open: false, note: null });
  }, []);

  const createHandleNoteClick = useCallback((note) => () => handleNoteClick(note), [handleNoteClick]);

  // Reset detail về dataDetail mới ngay khi prop thay đổi (ví dụ: click sang dự án khác)
  useEffect(() => {
    if (dataDetail) {
      setDetail(dataDetail);
      setFetchedSubTasks([]);
      setHistoryData([]);
      setProjectFiles([]);
      setFinalDocuments([]);
      setTaskLinks([]);
      setActiveTab(0);
    }
  }, [dataDetail]);

  useEffect(() => {
    if (open) {
      const id = dataDetail?.id || dataDetail?._id || documentId;
      if (id) {
        fetchDetail(id);
        fetchTabDocuments(id);
        fetchHistory(id);
        fetchComments(id);
        fetchSubTasks(id);
      } else if (dataDetail) {
        setDetail(dataDetail);
      }
    }
  }, [open, dataDetail, documentId, fetchDetail, fetchTabDocuments, fetchHistory, fetchComments, fetchSubTasks]);

  const statusValueRaw = useMemo(() => {
    return detail?.processStatusUi || detail?.projectStatus || "";
  }, [detail]);

  const statusText = useMemo(() => {
    if (statusValueRaw) {
      return stripHtml(statusValueRaw);
    }
    if (detail?.processStatus === "1") return "Công việc mới";
    if (detail?.processStatus === "2") return "Đang thực hiện";
    return "Đang thực hiện";
  }, [detail, statusValueRaw]);

  const progressVal = useMemo(() => {
    const p = detail?.progress;
    if (p === null || p === undefined) return 0;
    const num = parseInt(p, 10);
    return isNaN(num) ? 0 : num;
  }, [detail?.progress]);

  const deadlineLabel = useMemo(() => {
    if (detail?.progressView) {
      const text = stripHtml(detail.progressView);
      const parts = text.split("-");
      if (parts.length > 1) return parts[1].trim();
      return text;
    }
    if (detail?.deadlineLabel) {
      return detail.deadlineLabel;
    }

    // Calculate remaining days
    const end = detail?.endDate || detail?.deadline;
    if (end) {
      const endD = dayjs(end);
      const today = dayjs().startOf("day");
      if (endD.isValid()) {
        const diff = endD.startOf("day").diff(today, "day");
        if (diff > 0) return `CÒN ${diff} NGÀY`;
        if (diff === 0) return `HÔM NAY`;
        return `TRỄ ${Math.abs(diff)} NGÀY`;
      }
    }
    return "";
  }, [detail]);

  // Sub-tasks handling
  const subTasks = useMemo(() => {
    let tasks = [];
    if (fetchedSubTasks.length > 0) {
      tasks = fetchedSubTasks;
    } else if (Array.isArray(detail?.subTasks)) {
      tasks = detail.subTasks;
    } else if (Array.isArray(detail?.childTasks)) {
      tasks = detail.childTasks;
    }
    
    // Chỉ lấy công việc cha (không có parentId hoặc parent_id)
    return tasks.filter(task => !task.parentId && !task.parent_id);
  }, [detail, fetchedSubTasks]);

  // Files handling
  const files = useMemo(() => {
    // If we have explicitly fetched project files, use them
    const baseFiles = projectFiles.length > 0 ? projectFiles : (Array.isArray(detail?.files) ? detail.files : (Array.isArray(detail?.attachments) ? detail.attachments : []));
    
    const normalizedFiles = baseFiles.map(f => {
      const name = f.name || f.fileName || f.file_name || f.documentName || "Tài liệu không tên";
      const sizeRaw = f.size || f.fileSize || f.file_size;
      const size = (typeof sizeRaw === 'number' || (!isNaN(sizeRaw) && sizeRaw !== "")) ? formatSize(sizeRaw) : (sizeRaw || "");
      
      return {
        ...f,
        displayName: name,
        displaySize: size || (f.isFolder || f.type === 'folder' ? "" : "N/A"),
        renderType: f.type || f.fileType || (f.isFolder ? 'folder' : 'file')
      };
    });

    const formattedLinks = taskLinks.map(link => ({
      ...link,
      displayName: link.documentName || "Liên kết",
      displaySize: "Link",
      renderType: 'link',
      id: link.id || link._id,
    }));

    return [...normalizedFiles, ...formattedLinks];
  }, [detail, projectFiles, taskLinks]);

  const allTabDocuments = useMemo(() => {
    const normalizedFinal = finalDocuments.map(doc => ({
      id: doc.id || doc._id,
      displayName: doc.name || doc.file_name || "Tài liệu không tên",
      status: doc.status || "Đã phê duyệt",
      sentAt: doc.created_at || doc.createdAt || null,
      isFinal: true
    }));

    const normalizedOther = files.map(f => ({
      id: f.id || f._id,
      displayName: f.displayName,
      status: f.renderType === 'link' ? "Liên kết" : "Tài liệu đính kèm",
      sentAt: f.created_at || f.createdAt || null,
      isFinal: false
    }));

    return [...normalizedFinal, ...normalizedOther];
  }, [finalDocuments, files]);

  const formatCommentContent = useCallback((content) => {
    if (!content) return "";
    let formatted = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    formatted = formatted.replace(/(@[^@\u200B]+)\u200B/g, '<span style="color: #0f5cb6; font-weight: 500;">$1</span>');
    formatted = formatted.replace(/\n/g, "<br/>");
    return formatted;
  }, []);

  const organizedComments = useMemo(() => {
    if (!commentsList || !Array.isArray(commentsList)) return [];

    const commentMap = {};
    const rootComments = [];

    commentsList.forEach((cmt) => {
      if (cmt.type !== "slowReason") {
        const id = cmt.id || cmt._id;
        commentMap[id] = { ...cmt, children: [] };
      }
    });

    commentsList.forEach((cmt) => {
      if (cmt.type !== "slowReason") {
        const id = cmt.id || cmt._id;
        const node = commentMap[id];
        if (cmt.parentId && commentMap[cmt.parentId]) {
          commentMap[cmt.parentId].children.push(node);
        } else {
          rootComments.push(node);
        }
      }
    });

    const flatten = (nodes, level = 0) => {
      let result = [];
      nodes.forEach((node) => {
        result.push({ ...node, level });
        if (node.children?.length > 0) {
          result = result.concat(flatten(node.children, level + 1));
        }
      });
      return result;
    };

    return flatten(rootComments);
  }, [commentsList]);

  const handleLikeComment = useCallback(async (comment) => {
    const commentId = comment.id || comment._id;
    if (!commentId || !taskId) return;

    try {
      await dispatch(toggleCommentLike({ commentId, taskId, isLiked: !!comment.userLiked })).unwrap();
      await dispatch(getCommentsByTask({ documentId: taskId })).unwrap();
    } catch (error) {
      logger.error("Error toggling comment like:", error);
    }
  }, [dispatch, taskId]);

  const createLikeCommentHandler = useCallback((comment) => () => handleLikeComment(comment), [handleLikeComment]);

  // History handling
  const history = useMemo(() => {
    if (Array.isArray(historyData) && historyData.length > 0) return historyData;
    if (Array.isArray(detail?.history)) return detail.history;
    if (Array.isArray(detail?.logs)) return detail.logs;
    return [];
  }, [historyData, detail]);

  // Stable handlers for tabs
  const handleTab0 = useCallback(() => setActiveTab(0), []);
  const handleTab1 = useCallback(() => {
    setActiveTab(1);
    if (taskId) fetchComments(taskId);
  }, [taskId, fetchComments]);
  const handleTab2 = useCallback(() => {
    setActiveTab(2);
    if (taskId) fetchHistory(taskId);
  }, [taskId, fetchHistory]);

  const handleOpenViewsProject = () => {
    if (handleAction) {
      handleAction(
        {
          config: {
            componentKey: "VIEW_PROJECT",
            displayType: "swiper",
            actionType: "view",
            size: "xl",
          },
        },
        detail
      );
    }
  };

  if (!open) return null;

  return (
    <>
      <PanelContainer open={open}>
      <PanelHeader>
        <PanelTitleContainer>
          <PanelTitleLabel>Tên dự án, hạng mục đầu tư</PanelTitleLabel>
        </PanelTitleContainer>
        <HeaderActions>
          <XemThemButton 
            variant="outlined" 
            // startIcon={<OpenInNewIcon />}
            onClick={handleOpenViewsProject}
          >
            Xem thêm
          </XemThemButton>
          <CloseButton size="small" onClick={onClose}>
            <CloseIcon />
          </CloseButton>
        </HeaderActions>
      </PanelHeader>

      <PanelBody>
        {loading ? (
          <LoadingWrapper>
            <StyledSkeletonText variant="text" />
            <StyledSkeletonRectLarge variant="rectangular" />
            <StyledSkeletonRectSmall variant="rectangular" />
          </LoadingWrapper>
        ) : (
          <>
            {/* Priority & Status */}
            <StatusContainer direction="row" spacing={1.5}>
              {detail?.priority ? (
                hasHtml(detail.priority) ? (
                  <div
                      dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(detail.priority),
                      }}
                  />
                ) : (
                  <PillChip colortype={getPriorityColorType(detail?.priority)}>{stripHtml(detail?.priority || "")}</PillChip>
                )
              ) : null}

              {statusValueRaw && hasHtml(statusValueRaw) ? (
                <div
                    dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(statusValueRaw),
                    }}
                />
              ) : (
                <PillChip colortype={getStatusColorType(statusText)}>{statusText}</PillChip>
              )}
            </StatusContainer>

            {/* Title */}
            <TaskTitle>{stripHtml(detail?.name || detail?.projectName || "Tên dự án đang cập nhật...")}</TaskTitle>

            <SkyDivider />

            {/* Project ID & Created Date */}
            <InfoCard>
              <InfoCardContent>
                <SkyBox>
                  <SectionTitle>Mã dự án</SectionTitle>
                  <TaskCodeLink>{detail?.code || "N/A"}</TaskCodeLink>
                </SkyBox>
                <InfoCardRight>
                  <SectionTitle>Ngày tạo</SectionTitle>
                  <InfoValue>{formatDate(detail?.createdAt) || "--/--/----"}</InfoValue>
                </InfoCardRight>
              </InfoCardContent>
            </InfoCard>

            {/* Description */}
            <DescriptionWrapper>
              <SectionTitle>Mô tả dự án</SectionTitle>
              <DescriptionBox>
                <DescriptionText>
                  {stripHtml(detail?.description || detail?.note || "Chưa có mô tả chi tiết cho dự án này.")}
                </DescriptionText>
              </DescriptionBox>
            </DescriptionWrapper>

            {/* Progress */}
            <SectionTitle>Tiến độ hoàn thành</SectionTitle>
            <ProgressHeader>
              <ProgressNumber>{progressVal}%</ProgressNumber>
              <DeadlineText>
                {`KẾT THÚC: ${formatDate(detail?.endDate || detail?.deadline) || "--/--"} ${deadlineLabel ? `(${deadlineLabel})` : ""}`}
              </DeadlineText>
            </ProgressHeader>

            <StyledProgress variant="determinate" value={progressVal} col="#2364B0" />

            <DateHintContainer>
              <DateHintText>Bắt đầu: {formatDate(detail?.startDate) || "--/--"}</DateHintText>
            </DateHintContainer>

            {/* Participants */}
            <ParticipantsContainer direction="row" spacing={1}>
              <AvatarRoleBox>
                <RoleLabel>Quản lý dự án</RoleLabel>
                <StyledAvatarGroup>
                  {Array.isArray(detail?.managerId) && detail.managerId.length > 0 ? (
                    detail.managerId.map((m, idx) => (
                      <Tooltip key={idx} title={stripHtml(m.name || m.userName || "N/A")}>
                        <StyledDynamicAvatar 
                          src={m.avatar || m.userAvatar}
                          $avatarColor={getRandomAvatarColor(m.name || m.userName)}
                        >
                          {getInitials(m.name || m.userName)}
                        </StyledDynamicAvatar>
                      </Tooltip>
                    ))
                  ) : (detail?.managerId && !Array.isArray(detail?.managerId) ? (
                    <Tooltip title={stripHtml(detail.managerId.name || detail.managerId.userName || "N/A")}>
                      <StyledDynamicAvatar 
                        src={detail.managerId.avatar || detail.managerId.userAvatar}
                        $avatarColor={getRandomAvatarColor(detail.managerId.name || detail.managerId.userName)}
                      >
                        {getInitials(detail.managerId.name || detail.managerId.userName)}
                      </StyledDynamicAvatar>
                    </Tooltip>
                  ) : (
                    <StyledDynamicAvatar $avatarColor="#cbd5e1">?</StyledDynamicAvatar>
                  ))}
                </StyledAvatarGroup>
              </AvatarRoleBox>
              <AvatarRoleBox>
                <RoleLabel>Thành viên dự án</RoleLabel>
                <StyledAvatarGroup max={3}>
                  {Array.isArray(detail?.members) && detail.members.length > 0 ? (
                    detail.members.map((m, idx) => (
                      <Tooltip key={idx} title={stripHtml(m.name || m.userName || "N/A")}>
                        <StyledDynamicAvatar 
                          src={m.avatar || m.userAvatar}
                          $avatarColor={getRandomAvatarColor(m.name || m.userName)}
                        >
                          {getInitials(m.name || m.userName)}
                        </StyledDynamicAvatar>
                      </Tooltip>
                    ))
                  ) : (
                    <StyledDynamicAvatar $avatarColor="#cbd5e1">?</StyledDynamicAvatar>
                  )}
                </StyledAvatarGroup>
              </AvatarRoleBox>
              <AvatarRoleBox>
                <RoleLabel>Người xem</RoleLabel>
                <StyledAvatarGroup>
                  {Array.isArray(detail?.viewers) && detail.viewers.length > 0 ? (
                    detail.viewers.map((v, idx) => (
                      <Tooltip key={idx} title={stripHtml(v.name || v.userName || "N/A")}>
                        <StyledDynamicAvatar 
                          src={v.avatar || v.userAvatar}
                          $avatarColor={getRandomAvatarColor(v.name || v.userName)}
                        >
                          {getInitials(v.name || v.userName)}
                        </StyledDynamicAvatar>
                      </Tooltip>
                    ))
                  ) : (
                    <StyledDynamicAvatar $avatarColor="#cbd5e1">?</StyledDynamicAvatar>
                  )}
                </StyledAvatarGroup>
              </AvatarRoleBox>
            </ParticipantsContainer>

            {/* Sub-tasks Section */}
            <SectionHeader>
              <SectionTitle>Công việc thuộc dự án</SectionTitle>
              <IconButton size="small">
                <MoreHorizIcon />
              </IconButton>
            </SectionHeader>

            {subTasks.length > 0 ? (
              <SubTaskListContainer>
                {subTasks.map((st) => (
                  <SubTaskCard key={st.id || st._id}>
                    <SubTaskInfo>
                      <SubTaskTitle>{stripHtml(st.name || st.taskName)}</SubTaskTitle>
                      <SubTaskDate>Bắt đầu: {formatDate(st.startDate)}</SubTaskDate>
                    </SubTaskInfo>
                    <SubTaskProgressWrapper>
                      <MiniProgress variant="determinate" value={st.progress || 0} />
                      <ProgressPercent>{st.progress || 0}%</ProgressPercent>
                    </SubTaskProgressWrapper>
                    <StyledAvatar32 
                      src={st.assignee?.avatar || st.assignee?.userAvatar}
                      $avatarColor={getRandomAvatarColor(st.assignee?.name)}
                    >
                      {getInitials(st.assignee?.name)}
                    </StyledAvatar32>
                  </SubTaskCard>
                ))}
              </SubTaskListContainer>
            ) : (
              <FullWidthCenterText>
                Chưa có công việc nào.
              </FullWidthCenterText>
            )}



            {/* Tabs & History */}
            <TabsContainer>
              <TabItem active={activeTab === 0} onClick={handleTab0}>
                TL Dự án ({allTabDocuments.length})
              </TabItem>
              <TabItem active={activeTab === 1} onClick={handleTab1}>
                Thảo luận ({organizedComments.length})
              </TabItem>
              <TabItem active={activeTab === 2} onClick={handleTab2}>
                Lịch sử
              </TabItem>
            </TabsContainer>

            {activeTab === 0 && (
              <HistoryList>
                {allTabDocuments.length > 0 ? (
                  allTabDocuments.map((doc) => (
                    <HistoryItem key={doc.id || doc._id}>
                      <HistoryIconWrapper>
                        <CheckCircleOutlineIcon />
                      </HistoryIconWrapper>
                      <HistoryContent>
                        <HistoryTitle>
                          {doc.displayName} - {doc.status}
                        </HistoryTitle>
                        <HistoryTime>
                          Gửi lúc {doc.sentAt ? dayjs(doc.sentAt).format("HH:mm • DD/MM/YYYY") : "--:-- • --/--/----"}
                        </HistoryTime>
                      </HistoryContent>
                    </HistoryItem>
                  ))
                ) : (
                  <HistoryEmptyText>Chưa có tài liệu dự án nào.</HistoryEmptyText>
                )}
              </HistoryList>
            )}

            {activeTab === 1 && (
              <DiscussionList>
                {organizedComments.length > 0 ? (
                  organizedComments.map((comment, idx) => (
                    <DiscussionCard key={comment.id || comment._id || `comment-${idx}`} level={comment.level || 0}>
                      <DiscussionAvatar src={comment.avatar || comment.userAvatar}>
                        {getInitials(comment.userName || comment.fullName || comment.user_name || "U")}
                      </DiscussionAvatar>
                      <DiscussionMain>
                        <DiscussionHeader>
                          <DiscussionAuthor>{stripHtml(comment.userName || comment.fullName || comment.user_name || "Người dùng")}</DiscussionAuthor>
                          <DiscussionDate>
                            {(comment.createdAt || comment.created_at)
                              ? dayjs(comment.createdAt || comment.created_at).format("DD/MM/YYYY HH:mm")
                              : "--/--/---- --:--"}
                          </DiscussionDate>
                        </DiscussionHeader>
                        <DiscussionMessage
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(formatCommentContent(comment.content)),
                          }}
                        />
                        <DiscussionActions>
                          <DiscussionActionText
                            userLiked={comment.userLiked}
                            onClick={createLikeCommentHandler(comment)}
                          >
                            Thích
                          </DiscussionActionText>
                          <DiscussionActionText>Trả lời</DiscussionActionText>
                          {(comment.likeCount > 0 || comment.userLiked) && (
                            <DiscussionLikeBox userLiked={comment.userLiked} onClick={createLikeCommentHandler(comment)}>
                              {comment.likeCount > 0 ? <DiscussionLikeCount>{comment.likeCount}</DiscussionLikeCount> : null}
                              <ThumbUpAltOutlinedIcon />
                            </DiscussionLikeBox>
                          )}
                        </DiscussionActions>
                      </DiscussionMain>
                    </DiscussionCard>
                  ))
                ) : (
                  <HistoryEmptyText>Chưa có bình luận nào.</HistoryEmptyText>
                )}
              </DiscussionList>
            )}

            {activeTab === 2 && (
              <TimelineList>
                {history.length > 0 ? (
                  history.map((item, idx) => (
                    <TimelineItem key={item.id || item._id || idx}>
                      <TimelineDot />
                      <TimelineBody>
                        <TimelineTitle isRejected={String(item.details || "").toLowerCase().includes("từ chối")}>
                          <strong>{stripHtml(item.fullName || item.userName || item.full_name || "Người dùng")}</strong>{" "}
                          {stripHtml(item.details || item.title || item.action || "")}
                          {item?.note ? (
                            <TimelineNoteButton onClick={createHandleNoteClick(item.note)}>
                              <VisibilityOutlinedIcon />
                            </TimelineNoteButton>
                          ) : null}
                        </TimelineTitle>
                        <TimelineTime>
                          <AccessTimeOutlinedIcon />
                          {(item.createdAt || item.created_at)
                            ? dayjs(item.createdAt || item.created_at).format("DD/MM/YYYY HH:mm")
                            : "--/--/---- --:--"}
                        </TimelineTime>
                      </TimelineBody>
                    </TimelineItem>
                  ))
                ) : (
                  <HistoryEmptyText>Chưa có lịch sử nào.</HistoryEmptyText>
                )}
              </TimelineList>
            )}
          </>
        )}
      </PanelBody>
      </PanelContainer>

      <CustomDialog
        open={openNote.open}
        onClose={handleCloseNote}
        title="Chi tiết ghi chú"
        type="view"
        size="sm"
      >
        <DialogNoteContent>{openNote.note || "Không có ghi chú."}</DialogNoteContent>
      </CustomDialog>
    </>
  );
};

export default TaskDetailPanelProject;
