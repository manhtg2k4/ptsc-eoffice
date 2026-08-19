/* eslint-disable react/forbid-component-props */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Tooltip, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import DescriptionIcon from "@mui/icons-material/Description";
import HistoryIcon from "@mui/icons-material/History";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

import ViewJob from "@pages/WorkManagement/components/ViewJob";
import ViewJobProject from "@pages/WorkManagement/components/ViewJobProject";
import ViewJobToDocument from "@pages/WorkManagement/components/ViewJobToDocument";
import ViewJobToMeeting from "@pages/WorkManagement/components/ViewJobToMeeting";

import { useDispatch, useSelector } from "react-redux";
import { getCommentsByTask, toggleCommentLike } from "@redux/slices/SharedCategory/managementUnitSlice";
import Comment from "@pages/WorkManagement/components/Comment";
import HistoryJob from "@pages/WorkManagement/components/HistoryJob";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { JobNoteContainer } from "@pages/WorkManagement/components/Job.styles";

import { SkyBox, SkyDivider } from "@styles/SkyStyles.js";
import dayjs from "dayjs";

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
  InfoLabel,
  TaskCodeLink,
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
  InfoCardContent,
  InfoCardRight,
  DescriptionWrapper,
  ProgressHeader,
  DateHintContainer,
  ParticipantsContainer,
  StyledAvatarGroup,
  AssignerAvatar,
  DirectorAvatar,
  SupporterAvatar,
  ViewerAvatar,
  SurplusAvatar,
  SubtaskSectionHeader,
  SubtaskCard,
  SubtaskRow,
  SubtaskInfo,
  SubtaskName,
  SubtaskDate,
  SubtaskRight,
  SubtaskProgressWrapper,
  SubtaskProgressText,
  SubtaskAvatar,
  DescriptionBox,
  DescriptionText,
  SubtaskProgressBar,
  AttachmentSectionHeader,
  AttachmentCardContainer,
  AttachmentRow,
  AttachmentIconBox,
  AttachmentInfo,
  AttachmentName,
  AttachmentSize,
  TabBarContainer,
  TabButton,
  TabContentContainer,
  EmptyText,
  SourceCardContainer,
  SourceBadge,
  SourceInfo,
  SourceTitle,
  SourceSubtitle,
} from "@styles/TaskDetailPanel/TaskDetailPanel.styles.js";
import DOMPurify from "dompurify";
import axiosInstance from "@utils/axiosInstance";
import { API_GET_SUBTASKS, APP_BASE, API_GET_COMMON_WORK_DETAIL } from "@EnvironmentFile/constants/urlConfig";
import ViewRepetitiveWork from "@pages/WorkManagement/components/RepetitiveWork/ViewRepetitiveWork";
// Helper to extract initials safely
const getInitials = (name) => {
  if (!name) return "";
  const cleanName = name.split("(")[0].trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  return parts[0][0].toUpperCase();
};

const cleanAndGetInitials = (fullName) => {
  if (!fullName) return "";
  const nameOnly = fullName.split(" - ")[0].trim();
  return getInitials(nameOnly);
};

// Safe date formatter
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const cleanStr = String(dateStr).replace(/<[^>]*>/g, "").trim();
  const match = cleanStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [, d, m, y] = match;
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  }
  const d = dayjs(cleanStr);
  return d.isValid() ? d.format("DD/MM/YYYY") : cleanStr;
};

const getRepetitiveText = (type) => {
  if (!type) return "-";
  const lower = String(type).toLowerCase();
  if (lower === "ngay" || lower === "day" || lower === "hangngay" || lower === "hằng ngày") return "Hàng ngày";
  if (lower === "tuan" || lower === "week" || lower === "hangtuan" || lower === "hằng tuần") return "Hàng tuần";
  if (lower === "thang" || lower === "month" || lower === "hangthang" || lower === "hằng tháng") return "Hàng tháng";
  if (lower === "nam" || lower === "year" || lower === "hangnam" || lower === "hằng năm") return "Hàng năm";
  return type;
};



const formatBytes = (bytes) => {
  if (!bytes || isNaN(bytes)) return "";
  const num = typeof bytes === "string" ? parseFloat(bytes) : bytes;
  if (num === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return parseFloat((num / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const getFileIconColor = (fileName) => {
  if (!fileName) return "#1D4ED8";
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "#EF4444";
  if (/\.(xls|xlsx|csv)$/.test(lower)) return "#10B981";
  if (/\.(doc|docx)$/.test(lower)) return "#2563EB";
  if (/\.(ppt|pptx)$/.test(lower)) return "#F59E0B";
  if (/\.(jpg|jpeg|png|webp|gif)$/.test(lower)) return "#8B5CF6";
  return "#64748B";
};

const MENU_COLORS = [
  "#F44336",
  "#FF9800",
  "#4CAF50",
  "#1976D2",
  "#9C27B0",
  "#EC4899",
  "#14B8A6",
];

const getRandomAvatarColor = (username = "") => {
  const randomSeed = username
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return MENU_COLORS[randomSeed % MENU_COLORS.length];
};

const TaskDetailPanel = ({ open = false, onClose, dataDetail, setReloadData, typeJob, projectId, projectDetail, processFn }) => {
  const queryParams = new URLSearchParams(window.location.search);
  const urlProcessFn = queryParams.get("processFn");
  const effectiveProcessFn = processFn || urlProcessFn;

  const dispatch = useDispatch();
  const { commentsList } = useSelector((state) => state.unit || {});

  const [subTasksData, setSubTasksData] = useState({ items: [], parentType: null });
  const [taskFiles, setTaskFiles] = useState([]);
  const [finalFiles, setFinalFiles] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [openNote, setOpenNote] = useState({ open: false, note: null });
  const [activeTab, setActiveTab] = useState("final");
  const { crmSource } = useSelector((state) => state.config);
  const urgencyOptions =
    crmSource.find((item) => item.code === "DOUUTIEN")?.data || [];
  logger.log("urgencyOptions", urgencyOptions);


  const getPriorityColorType = (p) => {
    if (p === null || p === undefined) return "gray";
    const title = urgencyOptions.find((item) => String(item.value) === String(p))?.title || p;

    const value = String(title).toLowerCase();

    if (value.includes("gấp")) return "#EF5350";
    if (value.includes("bình thường")) return "#EF5350";

    return "#EF5350";
  };
  const currentTaskId = dataDetail?._id || dataDetail?.id;
  // Lưu typeTask vào ref để không bị mất khi component sắp unmount (khi onClose được gọi)
  const typeTaskRef = React.useRef(dataDetail?.typeTask);
  if (dataDetail?.typeTask) {
    typeTaskRef.current = dataDetail.typeTask;
  }
  const typeTask = typeTaskRef.current || dataDetail?.typeTask;

  const handleNoteClick = useCallback((note) => {
    setOpenNote({ open: true, note });
  }, []);

  const handleCloseNote = useCallback(() => {
    setOpenNote({ open: false, note: null });
  }, []);

  const createHandleNoteClick = useCallback((note) => () => handleNoteClick(note), [handleNoteClick]);

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

      setSubTasksData([]);
    }
  }, [currentTaskId]);

  const fetchTaskFiles = useCallback(async () => {
    if (!currentTaskId) return;
    try {
      const response = await axiosInstance.get(`${APP_BASE}/api/files/by-object?object_type=taskdocuments&object_id=${currentTaskId}`);
      const resData = response?.data?.data || response?.data || response || [];
      setTaskFiles(Array.isArray(resData) ? resData : []);
    } catch (error) {
      logger.error("Error fetching task documents", error);
      setTaskFiles([]);
    }
  }, [currentTaskId]);

  const fetchFinalFiles = useCallback(async () => {
    if (!currentTaskId) return;
    try {
      const response = await axiosInstance.get(`${APP_BASE}/api/files/by-object?object_type=finaldocuments&object_id=${currentTaskId}`);
      const resData = response?.data?.data || response?.data || response || [];
      setFinalFiles(Array.isArray(resData) ? resData : []);
    } catch (error) {
      logger.error("Error fetching final documents", error);
      setFinalFiles([]);
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

  useEffect(() => {
    if (typeTask) {
      fetchSubTasksData();
      fetchTaskFiles();
      fetchFinalFiles();
      fetchHistory();
      if (currentTaskId) {
        dispatch(getCommentsByTask({ documentId: currentTaskId })).unwrap().catch(() => { });
      }
    }
  }, [fetchSubTasksData, fetchTaskFiles, fetchFinalFiles, fetchHistory, currentTaskId, dispatch, typeTask]);


  const t = dataDetail || {};

  const sourceWorkInfo = useMemo(() => {
    if (!typeTask || (typeTask !== "form_doc" && typeTask !== "form_meeting")) return null;
    const isDoc = typeTask === "form_doc";
    const badgeText = isDoc ? "VB" : "KL";
    const titleText = isDoc ? dataDetail?.note : dataDetail?.meetingTitle;
    const subText = isDoc
      ? `Dự án • Văn bản: ${dataDetail?.code || ""}`
      : `Cuộc họp • ${dataDetail?.code || ""}`;
    const creatorName = dataDetail?.createdBy?.name || dataDetail?.assigner || "";
    const creatorInitials = cleanAndGetInitials(creatorName);
    const creatorCol = getRandomAvatarColor(creatorName);

    return {
      badgeText,
      titleText,
      subText,
      creatorName,
      creatorInitials,
      creatorCol,
    };
  }, [typeTask, dataDetail]);

  const progressVal = useMemo(() => {
    const p = dataDetail?.progress;
    if (p === null || p === undefined) return 0;
    const num = parseInt(p, 10);
    return isNaN(num) ? 0 : num;
  }, [dataDetail?.progress]);

  const deadlineLabel = useMemo(() => {
    const parseSafeDate = (dateVal) => {
      if (!dateVal) return null;
      const cleanStr = String(dateVal).replace(/<[^>]*>/g, "").trim();
      const match = cleanStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) {
        const [, d, m, y] = match;
        return dayjs(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
      }
      const d = dayjs(cleanStr);
      return d.isValid() ? d : null;
    };

    const end = parseSafeDate(dataDetail?.endDate) || parseSafeDate(dataDetail?.endDateNotHTML);
    if (end) {
      const now = dayjs();
      const isOverdue = end.isBefore(now);
      const t1 = isOverdue ? end : now;
      const t2 = isOverdue ? now : end;

      const diffHours = t2.diff(t1, "hour");
      const diffDays = t2.diff(t1, "day");
      const diffMonths = t2.diff(t1, "month");
      const diffYears = t2.diff(t1, "year");

      const prefix = isOverdue ? "Quá hạn" : "Còn";

      if (diffHours < 24) {
        return `${prefix} ${diffHours} giờ`;
      }
      if (diffDays < 30) {
        return `${prefix} ${diffDays} ngày`;
      }
      if (diffMonths < 12) {
        return `${prefix} ${diffMonths} tháng`;
      }
      const remMonths = diffMonths % 12;
      const monthStr = remMonths > 0 ? ` ${remMonths} tháng` : "";
      return `${prefix} ${diffYears} năm${monthStr}`;
    }

    if (dataDetail?.progressView) {
      const text = dataDetail.progressView.replace(/<[^>]*>/g, "").trim();
      const parts = text.split("-");
      if (parts.length > 1) {
        return parts[1].trim();
      }
      return text;
    }
    return dataDetail?.deadlineLabel || "";
  }, [dataDetail?.endDate, dataDetail?.endDateNotHTML, dataDetail?.progressView, dataDetail?.deadlineLabel]);

  const assignerList = useMemo(() => {
    if (Array.isArray(dataDetail?.assigners)) {
      return dataDetail.assigners.map(item => ({
        name: item.name,
        initials: cleanAndGetInitials(item.name),
        avatar: item.avatar,
      }));
    }
    if (dataDetail?.assigners) {
      const name = dataDetail.assigners.name || dataDetail.assigners;
      return [{
        name,
        initials: cleanAndGetInitials(name),
        avatar: dataDetail.assigners.avatar,
      }];
    }
    if (dataDetail?.assigner) {
      return [{
        name: dataDetail.assigner,
        initials: cleanAndGetInitials(dataDetail.assigner),
      }];
    }
    return [];
  }, [dataDetail?.assigners, dataDetail?.assigner]);

  const directorList = useMemo(() => {
    if (Array.isArray(dataDetail?.directors)) {
      return dataDetail.directors.map(item => ({
        name: item.name,
        initials: cleanAndGetInitials(item.name),
        avatar: item.avatar,
      }));
    }
    if (dataDetail?.directors) {
      const name = dataDetail.directors.name || dataDetail.directors;
      return [{
        name,
        initials: cleanAndGetInitials(name),
        avatar: dataDetail.directors.avatar,
      }];
    }
    if (dataDetail?.director) {
      return [{
        name: dataDetail.director,
        initials: cleanAndGetInitials(dataDetail.director),
      }];
    }
    return [];
  }, [dataDetail?.directors, dataDetail?.director]);

  const supporterList = useMemo(() => {
    if (Array.isArray(dataDetail?.supporters)) {
      return dataDetail.supporters.map(item => ({
        name: item.name,
        initials: cleanAndGetInitials(item.name),
        avatar: item.avatar,
      }));
    }
    if (dataDetail?.supporters) {
      const name = dataDetail.supporters.name || dataDetail.supporters;
      return [{
        name,
        initials: cleanAndGetInitials(name),
        avatar: dataDetail.supporters.avatar,
      }];
    }
    if (dataDetail?.supporter) {
      return dataDetail.supporter.split(",").map(s => s.trim()).filter(Boolean).map(name => ({
        name,
        initials: cleanAndGetInitials(name),
      }));
    }
    return [];
  }, [dataDetail?.supporters, dataDetail?.supporter]);

  const viewerList = useMemo(() => {
    if (Array.isArray(dataDetail?.viewers)) {
      return dataDetail.viewers.map(item => ({
        name: item.name,
        initials: cleanAndGetInitials(item.name),
        avatar: item.avatar,
      }));
    }
    if (dataDetail?.viewers) {
      const name = dataDetail.viewers.name || dataDetail.viewers;
      return [{
        name,
        initials: cleanAndGetInitials(name),
        avatar: dataDetail.viewers.avatar,
      }];
    }
    if (dataDetail?.viewer) {
      return dataDetail.viewer.split(",").map(v => v.trim()).filter(Boolean).map(name => ({
        name,
        initials: cleanAndGetInitials(name),
      }));
    }
    return [];
  }, [dataDetail?.viewers, dataDetail?.viewer]);

  const [openMoreModal, setOpenMoreModal] = useState(false);

  const handleViewMore = useCallback(() => {
    // KHÔNG gọi onClose ở đây!
    // Lý do: onClose = handleCloseDrawer trong DemoTablePage sẽ set SpecificComponent=null
    // và defaultValues={}, làm unmount TaskDetailPanel trước khi ViewJob kịp mount.
    // ViewJob (CustomSwipper) sẽ tự overlay lên trên panel.
    setOpenMoreModal(true);
  }, []);



  const handleSelectTabFinal = useCallback(() => setActiveTab("final"), []);
  const handleSelectTabComments = useCallback(() => setActiveTab("comments"), []);
  const handleSelectTabHistory = useCallback(() => setActiveTab("history"), []);

  const organizedComments = useMemo(() => {

    if (!commentsList || !Array.isArray(commentsList)) return [];

    const commentMap = {};
    const rootComments = [];

    commentsList.forEach((cmt) => {
      const id = cmt.id || cmt._id;
      commentMap[id] = { ...cmt, children: [] };
    });

    commentsList.forEach((cmt) => {
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
  }, [commentsList]);

  const handleLikeComment = useCallback(async (comment) => {
    const commentId = comment.id || comment._id;
    const taskId = currentTaskId;
    const isLiked = comment.userLiked;

    try {
      await dispatch(toggleCommentLike({ commentId, taskId, isLiked })).unwrap();
      await dispatch(getCommentsByTask({ documentId: currentTaskId })).unwrap();
    } catch (error) {
      logger.error("Like failed", error);
    }
  }, [dispatch, currentTaskId]);

  const createLikeCommentHandler = useCallback((comment) => () => {
    handleLikeComment(comment);
  }, [handleLikeComment]);

  const createOpenCommentMenuHandler = useCallback(() => () => { }, []);
  const createReplyCommentHandler = useCallback(() => () => { }, []);
  const handleCommentChange = useCallback(() => { }, []);
  const handleCommentKeyPress = useCallback(() => { }, []);
  const handleSendComment = useCallback(() => { }, []);
  const textareaRef = React.useRef(null);
  const commentText = "";
  const isCommentMultiline = false;

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

  // Cho phép render khi panel đang mở HOẶC khi modal đang mở
  if (!open && !openMoreModal) return null;


  const renderAvatarGroup = (list, AvatarComponent) => {
    if (!list || list.length === 0) return null;
    const max = 3;
    if (list.length <= max) {
      return (
        <StyledAvatarGroup max={4}>
          {list.map((p) => (
            <Tooltip key={p.name} title={p.name}>
              <AvatarComponent src={p.avatar} col={getRandomAvatarColor(p.name)}>
                {p.initials}
              </AvatarComponent>
            </Tooltip>
          ))}
        </StyledAvatarGroup>
      );
    }

    const visibleList = list.slice(0, max - 1);
    const surplusList = list.slice(max - 1);

    return (
      <StyledAvatarGroup max={4}>
        {visibleList.map((p) => (
          <Tooltip key={p.name} title={p.name}>
            <AvatarComponent src={p.avatar} col={getRandomAvatarColor(p.name)}>
              {p.initials}
            </AvatarComponent>
          </Tooltip>
        ))}
        <Tooltip
          title={
            <div style={{ whiteSpace: "pre-line" }}>
              {surplusList.map((p) => p.name).join("\n")}
            </div>
          }
        >
          <SurplusAvatar>
            +{surplusList.length}
          </SurplusAvatar>
        </Tooltip>
      </StyledAvatarGroup>
    );
  };

  const renderDetailModal = () => {
    if (!openMoreModal) return null;

    // Ưu tiên typeTask từ dataDetail, nếu không có thì dùng ref đã lưu
    const resolvedTypeTask = dataDetail?.typeTask || typeTaskRef.current;

    const commonProps = {
      open: openMoreModal,
      onClose: () => {
        setOpenMoreModal(false);
        // Sau khi ViewJob đóng, cũng đóng panel sidebar
        onClose?.();
      },
      onSuccess: () => {
        setReloadData?.((prev) => !prev);
        setOpenMoreModal(false);
        onClose?.();
      },
      documentId: currentTaskId,
      setReloadData,
      dataDetail,
      data: dataDetail,
      typeJob,
      isFromProject: typeJob === "project",
      title: typeJob === "project" ? "Chi tiết công việc thuộc dự án" : undefined,
      projectId,
      projectDetail,
    };


    if (typeJob === "project") {
      return <ViewJobProject {...commonProps} />;
    }

    switch (resolvedTypeTask) {
      case "general":
        return <ViewJob {...commonProps} />;
      case "form_doc":
        return <ViewJobToDocument {...commonProps} />;
      case "form_meeting":
        return <ViewJobToMeeting {...commonProps} />;
      default:
        return <ViewRepetitiveWork {...commonProps} />;
    }
  };

  return (
    <>
      {/* Chỉ render PanelContainer khi modal chưa mở - tránh chiếm không gian màn hình */}
      {!openMoreModal && (
        <PanelContainer open={open}>
          <PanelHeader>
            <PanelTitleContainer>
              <PanelTitleLabel>Chi tiết công việc</PanelTitleLabel>
            </PanelTitleContainer>
            <HeaderActions>
              <XemThemButton onClick={handleViewMore}>Xem thêm</XemThemButton>
              <CloseButton
                size="small"
                onClick={onClose}
                aria-label="Đóng panel"
              >
                <CloseIcon />
              </CloseButton>
            </HeaderActions>
          </PanelHeader>

          {/* ── Body ── */}
          <PanelBody key={t.id}>
            {/* Trạng thái */}
            {effectiveProcessFn === "cvllpb" ? (
              <StatusContainer direction="row" spacing={1}>
                <PillChip colortype="#EF5350">
                  {urgencyOptions.find(
                    (item) => item.value === dataDetail?.priority
                  )?.title || (dataDetail?.priority === "binhthuong" ? "Ưu tiên cao" : dataDetail?.priority)}
                </PillChip>
                <PillChip colortype="#1976D2">
                  Đang thực hiện
                </PillChip>
              </StatusContainer>
            ) : (
              <StatusContainer direction="row" spacing={1}>
                {dataDetail?.priority && (
                  <PillChip
                    colortype={getPriorityColorType(dataDetail?.priority)}
                  >
                    {urgencyOptions.find(
                      (item) => item.value === dataDetail?.priority
                    )?.title || dataDetail?.priority}
                  </PillChip>
                )}
                <div
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(dataDetail?.processStatusUi),
                  }}
                />
              </StatusContainer>
            )}

            {/* Tiêu đề */}
            <TaskTitle>{dataDetail?.name}</TaskTitle>
            <SkyDivider />

            {effectiveProcessFn === "cvllpb" ? (
              <>
                {/* Mã công việc + Ngày tạo */}
                <InfoCard>
                  <InfoCardContent>
                    <SkyBox>
                      <InfoLabel>MÃ CÔNG VIỆC</InfoLabel>
                      <TaskCodeLink>{dataDetail?.code}</TaskCodeLink>
                    </SkyBox>
                    {dataDetail?.createdAt && (
                      <InfoCardRight>
                        <InfoLabel>NGÀY TẠO</InfoLabel>
                        <InfoValue>{formatDate(dataDetail?.createdAt)}</InfoValue>
                      </InfoCardRight>
                    )}
                  </InfoCardContent>
                </InfoCard>
                <SkyDivider />

                {/* Chủ đề + Thời gian nhắc hạn */}
                <InfoCard>
                  <InfoCardContent>
                    <SkyBox>
                      <InfoLabel>CHỦ ĐỀ</InfoLabel>
                      <InfoValue style={{ fontWeight: 600 }}>{dataDetail?.topic || "Hàng ngày"}</InfoValue>
                    </SkyBox>
                    <InfoCardRight>
                      <InfoLabel>THỜI GIAN NHẮC HẠN</InfoLabel>
                      <InfoValue style={{ fontWeight: 600 }}>{dataDetail?.reminderTime || "-"}</InfoValue>
                    </InfoCardRight>
                  </InfoCardContent>
                </InfoCard>
                <SkyDivider />

                {/* Công việc lặp lại + Giờ lặp */}
                <InfoCard>
                  <InfoCardContent>
                    <SkyBox>
                      <InfoLabel>CÔNG VIỆC LẶP LẠI</InfoLabel>
                      <InfoValue style={{ fontWeight: 600 }}>{getRepetitiveText(dataDetail?.repetitiveTask)}</InfoValue>
                    </SkyBox>
                    <InfoCardRight>
                      <InfoLabel>GIỜ LẶP</InfoLabel>
                      <InfoValue style={{ fontWeight: 600 }}>{dataDetail?.startTime || "-"}</InfoValue>
                    </InfoCardRight>
                  </InfoCardContent>
                </InfoCard>
              </>
            ) : (
              <>
                {/* Mã công việc + Ngày tạo */}
                <InfoCard>
                  <InfoCardContent>
                    <SkyBox>
                      <InfoLabel>Mã công việc</InfoLabel>
                      <TaskCodeLink>{dataDetail?.code}</TaskCodeLink>
                    </SkyBox>
                    {dataDetail?.createdAt && (
                      <InfoCardRight>
                        <InfoLabel>Ngày tạo</InfoLabel>
                        <InfoValue>{formatDate(dataDetail?.createdAt)}</InfoValue>
                      </InfoCardRight>
                    )}
                  </InfoCardContent>
                </InfoCard>
              </>
            )}

            {/* Mô tả công việc */}
            {effectiveProcessFn === "cvllpb" ? (
              <DescriptionWrapper>
                <InfoLabel>MÔ TẢ CÔNG VIỆC</InfoLabel>
                <DescriptionBox style={{ backgroundColor: "#F1F3F5", borderRadius: "12px", padding: "16px" }}>
                  <DescriptionText style={{ fontStyle: "italic", color: "#4B5563" }}>
                    {dataDetail?.note || "Chưa có mô tả"}
                  </DescriptionText>
                </DescriptionBox>
              </DescriptionWrapper>
            ) : (
              dataDetail?.note && (
                <DescriptionWrapper>
                  <InfoLabel>Mô tả công việc</InfoLabel>
                  <DescriptionBox>
                    <DescriptionText>{dataDetail?.note}</DescriptionText>
                  </DescriptionBox>
                </DescriptionWrapper>
              )
            )}

            {/* Tiến độ (Ẩn nếu là cvllpb) */}
            {effectiveProcessFn !== "cvllpb" && (
              <>
                <InfoLabel>Tiến độ hoàn thành</InfoLabel>
                <ProgressHeader>
                  <ProgressNumber col={dataDetail?.progressColor}>{progressVal}%</ProgressNumber>
                  {deadlineLabel && (
                    <DeadlineText>{`Kết thúc: ${formatDate(dataDetail?.endDate)} (${deadlineLabel})`}</DeadlineText>
                  )}
                </ProgressHeader>

                <StyledProgress
                  variant="determinate"
                  value={progressVal}
                  col={dataDetail?.progressColor}
                />

                <DateHintContainer mt={"10px"}>
                  <DateHintText>
                    Bắt đầu: {formatDate(dataDetail?.startDate)}
                  </DateHintText>
                  <></>
                </DateHintContainer>
              </>
            )}

            {/* Người tham gia */}
            <ParticipantsContainer direction="row" spacing={0}>
              <AvatarRoleBox>
                <RoleLabel>Người giao</RoleLabel>
                {assignerList.length > 0 &&
                  renderAvatarGroup(assignerList, AssignerAvatar)}
              </AvatarRoleBox>

              <AvatarRoleBox>
                <RoleLabel>Chủ trì</RoleLabel>
                {directorList.length > 0 &&
                  renderAvatarGroup(directorList, DirectorAvatar)}
              </AvatarRoleBox>

              <AvatarRoleBox>
                <RoleLabel>Phối hợp</RoleLabel>
                {supporterList.length > 0 &&
                  renderAvatarGroup(supporterList, SupporterAvatar)}
              </AvatarRoleBox>

              <AvatarRoleBox>
                <RoleLabel>Theo dõi</RoleLabel>
                {viewerList.length > 0 &&
                  renderAvatarGroup(viewerList, ViewerAvatar)}
              </AvatarRoleBox>
            </ParticipantsContainer>

            {/* Nguồn công việc (Ẩn nếu là cvllpb) */}
            {effectiveProcessFn !== "cvllpb" && sourceWorkInfo && (
              <>
                <SubtaskSectionHeader>
                  <InfoLabel>NGUỒN CÔNG VIỆC</InfoLabel>
                </SubtaskSectionHeader>
                <SourceCardContainer>
                  <SourceBadge>{sourceWorkInfo.badgeText}</SourceBadge>
                  <SourceInfo>
                    <Tooltip
                      title={sourceWorkInfo.titleText || ""}
                      placement="top"
                    >
                      <SourceTitle>{sourceWorkInfo.titleText}</SourceTitle>
                    </Tooltip>
                    <SourceSubtitle>{sourceWorkInfo.subText}</SourceSubtitle>
                  </SourceInfo>
                </SourceCardContainer>
              </>
            )}

            {/* Công việc con */}
            {subTasksData?.items && subTasksData.items.length > 0 && (
              <>
                <SubtaskSectionHeader>
                  <InfoLabel>Công việc con</InfoLabel>
                  <IconButton size="small">
                    <MoreHorizIcon fontSize="small" />
                  </IconButton>
                </SubtaskSectionHeader>
                <SubtaskCard>
                  {subTasksData.items.map((item) => {
                    const nameStr = item.name || "";
                    const displayTitle =
                      nameStr.length > 22
                        ? `${nameStr.substring(0, 22)}...`
                        : nameStr;
                    const startDateStr =
                      item.startDateNotHTML || formatDate(item.startDate) || "";
                    const progNum = parseInt(item.progress, 10) || 0;

                    const assigner =
                      Array.isArray(item.assigners) && item.assigners.length > 0
                        ? item.assigners[0]
                        : null;
                    const assignerName =
                      assigner?.processName || assigner?.name || "";
                    const assignerInitials = cleanAndGetInitials(assignerName);
                    const assignerAvatarCol =
                      getRandomAvatarColor(assignerName);

                    return (
                      <SubtaskRow key={item.id || Math.random()}>
                        <SubtaskInfo>
                          {nameStr.length > 30 ? (
                            <Tooltip title={nameStr} placement="top">
                              <SubtaskName>{displayTitle}</SubtaskName>
                            </Tooltip>
                          ) : (
                            <SubtaskName>{displayTitle}</SubtaskName>
                          )}
                          {startDateStr && (
                            <SubtaskDate>Bắt đầu: {startDateStr}</SubtaskDate>
                          )}
                        </SubtaskInfo>

                        <SubtaskRight>
                          <SubtaskProgressWrapper>
                            <SubtaskProgressBar
                              variant="determinate"
                              value={progNum}
                              col="#1D4ED8"
                            />
                            <SubtaskProgressText>
                              {progNum}%
                            </SubtaskProgressText>
                          </SubtaskProgressWrapper>

                          {assignerName && (
                            <Tooltip title={assignerName} placement="top">
                              <SubtaskAvatar col={assignerAvatarCol}>
                                {assignerInitials}
                              </SubtaskAvatar>
                            </Tooltip>
                          )}
                        </SubtaskRight>
                      </SubtaskRow>
                    );
                  })}
                </SubtaskCard>
              </>
            )}

            {/* Tài liệu đính kèm */}
            {effectiveProcessFn === "cvllpb" ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", marginBottom: "12px" }}>
                  <InfoLabel style={{ margin: 0 }}>TÀI LIỆU ĐÍNH KÈM</InfoLabel>
                </div>
                {taskFiles && taskFiles.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", width: "100%" }}>
                    {taskFiles.map((file) => {
                      const fileName = file.file_name || file.name || "Tài liệu";
                      const fileSize = file.file_size || file.size;
                      const iconCol = getFileIconColor(fileName);

                      return (
                        <AttachmentRow key={file.id || file._id || Math.random()} style={{ padding: "12px", border: "1px solid #E2E8F0" }}>
                          <AttachmentIconBox col={iconCol}>
                            <DescriptionIcon />
                          </AttachmentIconBox>
                          <AttachmentInfo>
                            <Tooltip title={fileName} placement="top">
                              <AttachmentName style={{ fontWeight: 600, color: "#1E293B" }}>{fileName}</AttachmentName>
                            </Tooltip>
                            <AttachmentSize>
                              {formatBytes(fileSize)}
                            </AttachmentSize>
                          </AttachmentInfo>
                        </AttachmentRow>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyText>Chưa có tài liệu đính kèm</EmptyText>
                )}
              </>
            ) : (
              taskFiles && taskFiles.length > 0 && (
                <>
                  <AttachmentSectionHeader>
                    <InfoLabel>Tài liệu đính kèm</InfoLabel>
                  </AttachmentSectionHeader>
                  <AttachmentCardContainer>
                    {taskFiles.map((file) => {
                      const fileName = file.file_name || file.name || "Tài liệu";
                      const fileSize = file.file_size || file.size;
                      const iconCol = getFileIconColor(fileName);

                      return (
                        <AttachmentRow key={file.id || file._id || Math.random()}>
                          <AttachmentIconBox col={iconCol}>
                            <DescriptionIcon />
                          </AttachmentIconBox>
                          <AttachmentInfo>
                            <Tooltip title={fileName} placement="top">
                              <AttachmentName>{fileName}</AttachmentName>
                            </Tooltip>
                            <AttachmentSize>
                              {formatBytes(fileSize)}
                            </AttachmentSize>
                          </AttachmentInfo>
                        </AttachmentRow>
                      );
                    })}
                  </AttachmentCardContainer>
                </>
              )
            )}

            {/* Tab kết quả, thảo luận, lịch sử */}

            {effectiveProcessFn !== "cvllpb" && (
              <>
                <TabBarContainer>
                  <TabButton
                    active={activeTab === "final"}
                    onClick={handleSelectTabFinal}
                  >
                    Kết quả ({finalFiles.length})
                  </TabButton>
                  <TabButton
                    active={activeTab === "comments"}
                    onClick={handleSelectTabComments}
                  >
                    Thảo luận ({organizedComments.length})
                  </TabButton>
                  <TabButton
                    active={activeTab === "history"}
                    onClick={handleSelectTabHistory}
                  >
                    <HistoryIcon /> Lịch sử
                  </TabButton>
                </TabBarContainer>

                <TabContentContainer>
                  {activeTab === "final" &&
                    (finalFiles.length > 0 ? (
                      <AttachmentCardContainer customMaxHeight={300}>
                        {finalFiles.map((file) => {
                          const fileName =
                            file.file_name || file.name || "Báo cáo kết quả";
                          const fileSize = file.file_size || file.size;
                          return (
                            <AttachmentRow
                              key={file.id || file._id || Math.random()}
                            >
                              <AttachmentIconBox col="#10B981">
                                <CheckCircleOutlineIcon />
                              </AttachmentIconBox>
                              <AttachmentInfo>
                                <Tooltip title={fileName} placement="top">
                                  <AttachmentName>{fileName}</AttachmentName>
                                </Tooltip>
                                <AttachmentSize>
                                  {formatBytes(fileSize)}
                                </AttachmentSize>
                              </AttachmentInfo>
                            </AttachmentRow>
                          );
                        })}
                      </AttachmentCardContainer>
                    ) : (
                      <EmptyText>Không có tài liệu kết quả</EmptyText>
                    ))}

                  {activeTab === "comments" &&
                    (organizedComments.length > 0 ? (
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
                        onlyContent
                        hideInput={false}
                      />
                    ) : (
                      <EmptyText>Chưa có bình luận nào.</EmptyText>
                    ))}

                  {activeTab === "history" && (
                    <HistoryJob
                      historyData={historyData}
                      createHandleNoteClick={createHandleNoteClick}
                    />
                  )}
                </TabContentContainer>
              </>
            )}

            <CustomDialog
              open={openNote.open}
              onClose={handleCloseNote}
              title="Ghi chú / Chi tiết từ chối"
              type="view"
              size="sm"
              disableSave
            >
              <JobNoteContainer>{openNote.note}</JobNoteContainer>
            </CustomDialog>
          </PanelBody>
        </PanelContainer>
      )}
      {renderDetailModal()}
    </>
  );
};

export default TaskDetailPanel;