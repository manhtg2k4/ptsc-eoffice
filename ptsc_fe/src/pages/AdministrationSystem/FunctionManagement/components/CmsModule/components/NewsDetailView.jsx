"use client";
import React, { useState, useEffect, useCallback, useRef, useContext } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchNewsDetail, fetchSuggestedNews } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/redux/slices/newsSlice";
import { API_COMMENT, API_LIKE_COMMENT, API_EDIT_COMMENT, API_UPLOAD_FILE, APP_BASE, API_USER } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/EnvironmentFile/urlConfig";
import axiosClient from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/hooks/axiosClient";
import { toast } from "react-toastify";
import { useNewsSocket } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/hooks/useNewsSocket";
import { AuthContext } from "@AuthContext/AuthProvider";
import {
  Eye,
  Heart,
  // Share2,
  Send,
  Edit2,
  // MessageCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ArrowLeft,
  Paperclip,
  ThumbsDown,
  MoreVertical,
  Trash2,
  FileText,
  Download,
  X,
  Pencil
} from "lucide-react";
// import { useRouter } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimNav";
import { ROUTES } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/routes";
import moment from "moment";
import "moment/locale/vi";
import AuthModal from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/dialog/AuthModal";
import ShareModal from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/dialog/ShareModal";
import ConfirmDeleteModal from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/dialog/ConfirmDeleteModal";
import ErrorState from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/dialog/ErrorState";
import { getResponsiveImage, DEFAULT_NEWS_THUMBNAIL } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/utils/imageHelper";
import { useCMS } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/context/CMSContext";
import FilePreviewModal from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/dialog/FilePreviewModal";
import OpinionModal from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/dialog/OpinionModal";
import DOMPurify from "dompurify";
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';
import { globalComponentRegistry } from "@builder-table/components/componentRegistry";
import { openDetailDialog } from "@components/GlobalDialogPortal";
import { useFilePreview } from "@components/FilePreview/useFilePreview";
import FilePreviewModalCommon from "@components/FilePreview/FilePreviewModal";
import { useAttachmentClick } from "@hooks/useAttachmentClick";
import {
  COMPRESSED_FILE_EXTENSIONS,
  getFileExtensionFromUrlOrName,
  downloadFileWithAuth,
} from "@services/FileUpload/fileUpload";

moment.locale("vi");

const extractFileIds = (htmlContent) => {
  if (!htmlContent) return [];
  const regex = /\/api\/files\/view\/([a-zA-Z0-9]+)/g;
  const ids = [];
  let match;
  while ((match = regex.exec(htmlContent)) !== null) {
    if (!ids.includes(match[1])) {
      ids.push(match[1]);
    }
  }
  return ids;
};

export default function NewsDetailView({ newsId, onFileClick }) {
  const [imageMap, setImageMap] = useState({});
  const dispatch = useDispatch();
  const {
    previewOpen,
    previewUrl,
    previewFileName,
    isPreviewLoading: isCommonPreviewLoading,
    verificationResult,
    handlePreview,
    handleClosePreview,
  } = useFilePreview();

  const handleFileClick = useCallback(
    async ({ href, fileName, event }) => {
      if (onFileClick) {
        onFileClick({ href, fileName, event });
        return;
      }
      const match = href ? href.match(/\/api\/files\/view\/([a-zA-Z0-9]+)/) : null;
      const fileId = match ? match[1] : null;

      const ext = getFileExtensionFromUrlOrName(href, fileName);

      if (COMPRESSED_FILE_EXTENSIONS.includes(ext)) {
        try {
          await downloadFileWithAuth({ fileId, href, fileName });
        } catch (error) {
          logger.log("Lỗi khi tải file nén:", error);
          toast.error("Không thể tải file về máy.");
        }
        return;
      }

      if (fileId) {
        handlePreview({ id: fileId, fileName, href });
      }
    },
    [onFileClick, handlePreview]
  );

  const handleArticleClick = useAttachmentClick(handleFileClick);

  const getProcessedHtmlContent = useCallback((htmlContent) => {
    if (!htmlContent) return "";
    
    // 1. Sanitize the HTML
    const sanitized = DOMPurify.sanitize(htmlContent, {
      ADD_ATTR: ["target", "rel", "data-type"],
    });

    if (typeof window === "undefined" || !window.DOMParser) {
      return sanitized;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(sanitized, "text/html");

      // 2. Process all image tags
      const images = doc.querySelectorAll("img");
      images.forEach((img) => {
        const src = img.getAttribute("src") || img.getAttribute("data-src");
        if (src && src.includes("/api/files/view/")) {
          const match = src.match(/\/api\/files\/view\/([a-zA-Z0-9]+)/);
          const fileId = match ? match[1] : null;
          if (fileId) {
            if (imageMap[fileId]) {
              img.setAttribute("src", imageMap[fileId]);
              img.removeAttribute("data-src");
              img.style.opacity = "1";
            } else {
              // Set a 1x1 transparent gif placeholder
              img.setAttribute("src", "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
              img.setAttribute("data-loading-file-id", fileId);
              img.style.opacity = "0.5";
            }
          }
        }
      });

      // 3. Process other media elements with data-src
      const mediaElements = doc.querySelectorAll("[data-src]");
      mediaElements.forEach((el) => {
        if (el.tagName.toLowerCase() === "img") return; // already handled
        const src = el.getAttribute("data-src");
        if (src && src.includes("/api/files/view/")) {
          const match = src.match(/\/api\/files\/view\/([a-zA-Z0-9]+)/);
          const fileId = match ? match[1] : null;
          if (fileId) {
            if (imageMap[fileId]) {
              el.setAttribute("src", imageMap[fileId]);
              el.removeAttribute("data-src");
            }
          }
        }
      });

      return doc.body.innerHTML;
    } catch (e) {
      /* eslint-disable-next-line no-console */
      console.error("Error processing HTML content:", e);
      return sanitized;
    }
  }, [imageMap]);
  const { currentNews, suggestedNews, error, topicList } = useSelector((state) => state.news || {});
  const { user } = useContext(AuthContext);
  const { setActivePage } = useCMS();
  // const router = useRouter();

  // Check permission to update published status from detail API
  const canUpdatePublished = !!currentNews?.canUpdatePublished || !!currentNews?.flags?.canUpdatePublished;
  // console.log("currentNews",currentNews)
  // States for UI (kept from original)
  const [comments, setComments] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [isTitleMultiline, setIsTitleMultiline] = useState(false);
  const [expandedComments, setExpandedComments] = useState({}); // Track expanded replies
  const [activeMenuId, setActiveMenuId] = useState(null); // Track which menu is open

  // Mention/Tag states
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [showOpinionModal, setShowOpinionModal] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [showReplyMentionDropdown, setShowReplyMentionDropdown] = useState(false);
  const [replyMentionSearch, setReplyMentionSearch] = useState("");
  const [localUserList, setLocalUserList] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const mentionDropdownRef = useRef(null);
  const replyMentionDropdownRef = useRef(null);
  const titleRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeMenuId && !event.target.closest('button') && !event.target.closest('[style*="position: absolute"]')) {
        setActiveMenuId(null);
      }
      if (showMentionDropdown && !event.target.closest('.nd-mention-container')) {
        setShowMentionDropdown(false);
      }
      if (showReplyMentionDropdown && !event.target.closest('.nd-reply-mention-container')) {
        setShowReplyMentionDropdown(false);
      }
    };

    if (activeMenuId || showMentionDropdown || showReplyMentionDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [activeMenuId, showMentionDropdown, showReplyMentionDropdown]);


  const [comment, setComment] = useState("");
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");

  const [localNewsLikes, setLocalNewsLikes] = useState(0);
  const [isNewsLiked, setIsNewsLiked] = useState(false);
  const [localNewsDislikes, setLocalNewsDislikes] = useState(0);
  const [isNewsDisliked, setIsNewsDisliked] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [commentUploads, setCommentUploads] = useState([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState({ open: false, url: null, name: "", type: null });
  const fileInputRef = useRef(null);
  const articleBodyRef = useRef(null);

  const commentInputRef = useRef(null);
  const commentOverlayRef = useRef(null);
  const handleCommentScroll = useCallback((e) => {
    if (commentOverlayRef.current) commentOverlayRef.current.scrollLeft = e.target.scrollLeft;
  }, []);

  const replyInputRef = useRef(null);
  const replyOverlayRef = useRef(null);
  const handleReplyScroll = useCallback((e) => {
    if (replyOverlayRef.current) replyOverlayRef.current.scrollLeft = e.target.scrollLeft;
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
    }
  }, []);

  const fetchUsersDirectly = useCallback(async (searchQuery = "") => {
    setIsLoadingUsers(true);
    try {
      const response = await axiosClient.get(`${API_USER}/all`, {
        params: { limit: 20, name: searchQuery }
      });
      const data = response.data || response;
      const users = data.data || data.items || data;
      setLocalUserList(Array.isArray(users) ? users : []);
    } catch (error) {
      setLocalUserList([]);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  const handleCommentInputChange = useCallback((e) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;
    setComment(value);

    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const beforeAt = textBeforeCursor.substring(0, lastAtIndex);
      if (lastAtIndex === 0 || beforeAt.endsWith(" ")) {
        const query = textBeforeCursor.substring(lastAtIndex + 1);
        if (query.includes("  ") || query.length >= 40) {
          setShowMentionDropdown(false);
          return;
        }
        const words = query.trim().split(/\s+/);
        if (words.length <= 5) {
          setShowMentionDropdown(true);
          setMentionSearch(query);
          return;
        }
      }
    }
    setShowMentionDropdown(false);
  }, []);

  const handleReplyInputChange = useCallback((e) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;
    setReplyContent(value);

    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const beforeAt = textBeforeCursor.substring(0, lastAtIndex);
      if (lastAtIndex === 0 || beforeAt.endsWith(" ")) {
        const query = textBeforeCursor.substring(lastAtIndex + 1);
        if (query.includes("  ") || query.length >= 40) {
          setShowReplyMentionDropdown(false);
          return;
        }
        const words = query.trim().split(/\s+/);
        if (words.length <= 5) {
          setShowReplyMentionDropdown(true);
          setReplyMentionSearch(query);
          return;
        }
      }
    }
    setShowReplyMentionDropdown(false);
  }, []);

  const addMentionToComment = useCallback((targetedUser) => {
    const lastAtIndex = comment.lastIndexOf("@");
    const beforeAt = comment.substring(0, lastAtIndex);
    const newComment = `${beforeAt}@${targetedUser.name}  `;
    setComment(newComment);
    setShowMentionDropdown(false);
    setMentionSearch("");
  }, [comment]);

  const addMentionToReply = useCallback((targetedUser) => {
    const lastAtIndex = replyContent.lastIndexOf("@");
    const beforeAt = replyContent.substring(0, lastAtIndex);
    const newReply = `${beforeAt}@${targetedUser.name}  `;
    setReplyContent(newReply);
    setShowReplyMentionDropdown(false);
    setReplyMentionSearch("");
  }, [replyContent]);

  const renderContentWithMentions = useCallback((text) => {
    if (!text) return null;
    const parts = text.split(/(@[^@]+?)(?=\s{2}|$)/g);
    return parts.map((part, index) => {
      if (part && part.startsWith("@")) {
        return (
          /* eslint-disable-next-line react/no-array-index-key */
          <span key={`mention-${part}-${index}`} style={{ color: "#2c82d8" }}>
            {part}
          </span>
        );
      }
      return part;
    });
  }, []);

  const handleSendComment = useCallback(async (content, pId = null) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const text = content?.trim();
    if (!text) return;
    try {
      const payload = {
        content: text,
        parentId: pId,
        file: commentUploads.map(f => ({
          id: f.id,
          file_name: f.file_name || f.name, // eslint-disable-line camelcase
          storage_type: f.storage_type, // eslint-disable-line camelcase
          file_path: f.file_path, // eslint-disable-line camelcase
          object_type: f.object_type // eslint-disable-line camelcase
        }))
      };
      await axiosClient.post(`${API_COMMENT}/${newsId}/comment`, payload);
      setCommentUploads([]);
      if (pId) {
        setReplyingToId(null);
        setReplyContent("");
        setShowReplyMentionDropdown(false);
      } else {
        setComment("");
        setShowMentionDropdown(false);
      }
    } catch (error) {
      toast.error("Lỗi khi gửi bình luận.");
    }
  }, [user, newsId, commentUploads]);


  const handleCloseAuthModal = useCallback(() => setShowAuthModal(false), []);
  // const handleOpenAuthModal = useCallback(() => setShowAuthModal(true), []);
  const handleOpenShare = useCallback(() => setShowShareModal(true), []);
  const handleCloseShareModal = useCallback(() => setShowShareModal(false), []);
  const handleOpenOpinion = useCallback(() => setShowOpinionModal(true), []);
  const handleCloseOpinionModal = useCallback(() => setShowOpinionModal(false), []);
  const handleCloseDeleteModal = useCallback(() => setDeleteConfirmId(null), []);
  const handleClosePreviewModal = useCallback(() => setPreviewFile(prev => ({ ...prev, open: false })), []);

  const onGoHomeClick = useCallback(() => {
    setActivePage("/");
    window.history.pushState(null, "", "/");
    window.scrollTo(0, 0);
  }, [setActivePage]);

  const onTopicClick = useCallback((topicName) => () => {
    if (!topicName) return;

    // Tìm topicId từ topicList
    let topicId = null;
    if (topicList) {
      const list = Array.isArray(topicList) ? topicList : (topicList.data || topicList.items || []);
      const foundTopic = list.find(t => t.name === topicName || t.title === topicName);
      topicId = foundTopic?.id;
    }

    // Tạo URL với query params
    const params = new URLSearchParams();
    if (topicId) params.set("topicId", topicId);
    params.set("topicName", topicName);

    const url = `${ROUTES.TIN_TUC}?${params.toString()}`;
    setActivePage(url);
    window.history.pushState(null, "", url);
    window.scrollTo(0, 0);
  }, [setActivePage, topicList]);

  const onSearchBreadcrumbClick = useCallback(() => {
    const state = window.history.state;
    if (state && state.fromSearch && state.searchUrl) {
      setActivePage(state.searchUrl);
      window.history.pushState(null, "", state.searchUrl);
    } else {
      const url = ROUTES.SEARCH;
      setActivePage(url);
      window.history.pushState(null, "", url);
    }
    window.scrollTo(0, 0);
  }, [setActivePage]);

  const onBackClick = useCallback(() => {
    const state = window.history.state;

    // 1. Nếu có fromUrl (URL trang nguồn), quay về trang đó
    if (state && state.fromUrl) {
      setActivePage(state.fromUrl);
      window.history.pushState(null, "", state.fromUrl);
      window.scrollTo(0, 0);
      return;
    }

    // 2. Nếu đến từ trang tìm kiếm (legacy)
    if (state && state.fromSearch) {
      onSearchBreadcrumbClick();
      return;
    }

    // 3. Fallback: về trang chủ đề nếu có topic info
    const topicName = currentNews?.topicName || currentNews?.topic;
    let topicId = currentNews?.topicId || currentNews?.categoryId || currentNews?.topic_id;

    if (!topicId && topicName && topicList) {
      const list = Array.isArray(topicList) ? topicList : (topicList.data || topicList.items || []);
      const foundTopic = list.find(t => t.name === topicName || t.title === topicName);
      topicId = foundTopic?.id;
    }

    if (topicId) {
      const params = new URLSearchParams();
      params.set("topicId", topicId);
      if (topicName) params.set("topicName", topicName);
      const url = `/tin-tuc?${params.toString()}`;
      setActivePage(url);
      window.history.pushState(null, "", url);
      window.scrollTo(0, 0);
      return;
    }

    // 4. Trường hợp xấu nhất: về Home
    onGoHomeClick();
  }, [currentNews, topicList, onGoHomeClick, onSearchBreadcrumbClick, setActivePage]);

  const handleEditContentChange = useCallback((e) => setEditContent(e.target.value), []);
  const onDownloadFileClick = useCallback((e) => e.stopPropagation(), []);

  const onTriggerFileUpload = useCallback(() => fileInputRef.current?.click(), []);

  const onRemoveFile = useCallback((fileId) => () => {
    setCommentUploads(prev => prev.filter(item => item.id !== fileId));
  }, []);

  const onClearUploads = useCallback(() => setCommentUploads([]), []);

  const onToggleMenu = useCallback((id) => (e) => {
    if (e) e.stopPropagation();
    setActiveMenuId(prev => (prev === id ? null : id));
  }, []);

  const onEditComment = useCallback((cmt) => () => {
    setEditingId(cmt.id);
    setEditContent(cmt.content);
    setActiveMenuId(null);
  }, []);

  const onCancelEdit = useCallback(() => setEditingId(null), []);


  const onReplyClick = useCallback((id, author) => () => {
    setReplyingToId(prev => {
      if (prev === id) {
        setReplyContent("");
        return null;
      } else {
        setReplyContent(`@${author}  `);
        return id;
      }
    });
  }, []);

  const onRelatedCardClick = useCallback((id) => () => {
    const url = ROUTES.newsDetail(id);
    // Giữ lại fromUrl từ state hiện tại khi chuyển sang tin liên quan
    const currentState = window.history.state || {};
    setActivePage(url);
    window.history.pushState(
      { fromUrl: currentState.fromUrl || currentState.searchUrl },
      "",
      url
    );
    window.scrollTo(0, 0);
  }, [setActivePage]);

  const onEditClick = useCallback(() => {
    if (!currentNews?.id) return;
    openDetailDialog(globalComponentRegistry.EDIT_NEWS, currentNews.id, {
      onSuccess: () => {
        dispatch(fetchNewsDetail(newsId));
      },
      autoClose: true
    });
  }, [currentNews, newsId, dispatch]);

  const onRetryClick = useCallback(() => {
    window.location.reload();
  }, []);

  const displayNewsTitle = (mounted && currentNews?.title) ? currentNews.title : "Äang táº£i dá»¯ liá»‡u...";

  useEffect(() => {
    const checkTitleWrap = () => {
      const titleEl = titleRef.current;
      if (!titleEl) return;

      const style = window.getComputedStyle(titleEl);
      const lineHeight = parseFloat(style.lineHeight);
      if (!lineHeight) return;

      setIsTitleMultiline(titleEl.getBoundingClientRect().height > (lineHeight * 1.5));
    };

    checkTitleWrap();
    window.addEventListener("resize", checkTitleWrap);
    return () => window.removeEventListener("resize", checkTitleWrap);
  }, [displayNewsTitle, mounted]);

  const { isConnected, toggleLike, onEvent } = useNewsSocket(newsId, user);

  useEffect(() => {
    if (newsId) {
      dispatch(fetchNewsDetail(newsId));
    }
  }, [dispatch, newsId]);

  const topicId = currentNews?.topicId || currentNews?.categoryId || currentNews?.topic_id || currentNews?.topicEntity?.id;

  const normalizeTagsParam = (tagsValue) => {
    if (!tagsValue) return "";
    if (typeof tagsValue === "string") return tagsValue;
    if (Array.isArray(tagsValue)) {
      return tagsValue
        .map((tag) => {
          if (typeof tag === "string") return tag.trim();
          return (tag?.name || tag?.title || tag?.tagName || "").trim();
        })
        .filter(Boolean)
        .join(",");
    }
    return "";
  };

  const tagsString = normalizeTagsParam(currentNews?.tags);

  useEffect(() => {
    if (!topicId) return;

    dispatch(fetchSuggestedNews({
      topic: topicId,
      tags: tagsString,
      limit: 6
    }));
  }, [dispatch, topicId, tagsString]);



  useEffect(() => {
    if (currentNews) {
      setLocalNewsLikes(currentNews.likeCount || 0);
      setIsNewsLiked(currentNews.meLike || false);
      setLocalNewsDislikes(currentNews.dislikeCount || 0);
      setIsNewsDisliked(currentNews.meDislike || false);
    }
  }, [currentNews]);
  // Use the earlier declaration of fetchComments

  useEffect(() => {
    if (isConnected) {
      const cleanup = onEvent("newComment", (data) => {
        if (data.newsId === Number(newsId)) {
          if (data.comment?.type && data.comment.type !== "comment") {
            return;
          }
          const currentUserId = user?.user?.id || user?.id;
          const isMe = data.comment.authorId === currentUserId;
          const authorNameFromPayload = data.comment.authorName || data.comment.userName || data.comment.author;
          const myName = user?.user?.username || user?.username;

          const finalAuthor = authorNameFromPayload || (isMe ? myName : "Người dùng");

          let fileData = [];
          if (data.comment.file) {
            try {
              const parsed = typeof data.comment.file === 'string' ? JSON.parse(data.comment.file) : data.comment.file;
              fileData = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
              fileData = [];
            }
          }

          setComments((prev) => {
            if (prev.find(c => c.id === data.comment.id)) return prev;

            return [
              {
                id: data.comment.id,
                parentId: data.comment.parentId,
                author: finalAuthor,
                authorId: data.comment.authorId || data.comment.userId,
                time: moment(data.comment.createdAt).format("DD/MM/YYYY"),
                content: data.comment.content,
                likes: 0,
                dislikes: 0,
                replies: 0,
                meLike: data.comment.meLike || false,
                meDislike: data.comment.meDislike || data.comment.meDisLike || false,
                file: fileData
              },
              ...prev
            ];
          });
        }
      });

      const likeCleanup = onEvent("commentLikeUpdate", (data) => {
        if (data.newsId === Number(newsId)) {
          const newLikes = data.likeCount !== undefined ? data.likeCount : data.likesCount;
          const newDislikes = data.dislikeCount !== undefined ? data.dislikeCount : data.dislikesCount;
          const meLike = data.meLike !== undefined ? data.meLike : undefined;
          const meDislike = data.meDislike !== undefined ? data.meDislike : undefined;

          setComments((prev) =>
            prev.map(c =>
              c.id === (data.commentId || data.id)
                ? {
                  ...c,
                  ...(newLikes !== undefined && { likes: newLikes }),
                  ...(newDislikes !== undefined && { dislikes: newDislikes }),
                  ...(meLike !== undefined && { meLike }),
                  ...(meDislike !== undefined && { meDislike })
                }
                : c
            )
          );
        }
      });

      const newsLikeCleanup = onEvent("likeUpdate", (data) => {
        if (data.newsId === Number(newsId)) {
          const newLikes = data.likeCount !== undefined ? data.likeCount : data.likesCount;
          const newDislikes = data.dislikeCount !== undefined ? data.dislikeCount : data.dislikesCount;
          if (newLikes !== undefined) setLocalNewsLikes(newLikes);
          if (newDislikes !== undefined) setLocalNewsDislikes(newDislikes);

          if (data.userId === (user?.user?.id || user?.id)) {
            if (data.meLike !== undefined) setIsNewsLiked(data.meLike);
            if (data.meDislike !== undefined) setIsNewsDisliked(data.meDislike);
          }
        }
      });

      const editCleanup = onEvent("updateComment", (data) => {
        if (data.newsId === Number(newsId)) {
          setComments((prev) =>
            prev.map(c =>
              c.id === data.comment.id
                ? { ...c, content: data.comment.content }
                : c
            )
          );
        }
      });

      const deleteCleanup = onEvent("deleteComment", (data) => {
        if (data.newsId === Number(newsId)) {
          const targetId = data.commentId || data.id || (data.comment && data.comment.id);
          if (targetId) {
            setComments((prev) => prev.filter(c => c.id !== targetId && c.parentId !== targetId));
          }
        }
      });

      return () => {
        cleanup();
        likeCleanup();
        newsLikeCleanup();
        editCleanup();
        deleteCleanup();
      };
    }
  }, [isConnected, newsId, onEvent, user]);


  // Debounced user search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (showMentionDropdown && mentionSearch !== undefined) {
        fetchUsersDirectly(mentionSearch);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [mentionSearch, showMentionDropdown, fetchUsersDirectly]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (showReplyMentionDropdown && replyMentionSearch !== undefined) {
        fetchUsersDirectly(replyMentionSearch);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [replyMentionSearch, showReplyMentionDropdown, fetchUsersDirectly]);

  // Fetch users directly without Redux to avoid scroll issues


  const handleCommentInput = useCallback((e) => {
    handleCommentInputChange(e);
  }, [handleCommentInputChange]);



  // Function to highlight mentions in comment text
  // --- Implementation Logic (Helper functions called by handlers) ---

  const toggleReplies = useCallback((commentId) => {
    setExpandedComments(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  }, []);

  const onToggleReplies = useCallback((id) => () => toggleReplies(id), [toggleReplies]);

  const fetchComments = useCallback(async () => {
    if (!newsId) return;
    try {
      const response = await axiosClient.get(`${API_COMMENT}/${newsId}/comments?type=comment`);
      const data = response.data || response;
      if (Array.isArray(data)) {
        setComments(data.map(c => {
          let fileData = [];
          if (c.file) {
            try {
              const parsed = typeof c.file === 'string' ? JSON.parse(c.file) : c.file;
              fileData = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
              fileData = [];
            }
          }
          return {
            id: c.id,
            parentId: c.parentId,
            author: c.authorName || c.userName || "Người dùng",
            authorId: c.authorId || c.userId,
            time: moment(c.createdAt).format("DD/MM/YYYY"),
            content: c.content,
            likes: c.likeCount || 0,
            dislikes: c.dislikeCount || 0,
            replies: 0,
            meLike: !!c.meLike,
            meDislike: !!(c.meDislike || c.meDisLike),
            file: fileData
          };
        }));
      }
    } catch (error) {
      toast.error("Không thể tải bình luận.");
    }
  }, [newsId]);

  const isCommentAllowed = currentNews ? currentNews.isComment !== false : false;
  useEffect(() => {
    if (newsId && isCommentAllowed) {
      fetchComments();
    }
  }, [newsId, isCommentAllowed, fetchComments, user]);





  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    // Optional: link to newsId if backend supports it
    formData.append("newsId", newsId);
    try {
      const res = await axiosClient.post(API_UPLOAD_FILE, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const uploadedFile = res.data?.data || res.data || res;
      const fileData = {
        ...uploadedFile,
        name: uploadedFile.file_name || uploadedFile.name || uploadedFile.filename || file.name,
        size: uploadedFile.size || file.size,
        type: uploadedFile.type || file.type,
      };
      setCommentUploads((prev) => [fileData, ...prev]);
    } catch (error) {
      toast.error("Lỗi khi tải file lên.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [user, newsId]);

  const isExcelFile = (fileName) => /\.(xls|xlsx)$/i.test(fileName || "");

  const handleFilePreview = useCallback(async (file) => {
    const fileName = file?.file_name || file?.name || "file";
    const lower = fileName.toLowerCase();

    const isDoc = /\.(doc|docx)$/i.test(lower);
    const isExcel = /\.(xls|xlsx)$/i.test(lower);
    const isPpt = /\.(ppt|pptx)$/i.test(lower);
    const isOtherOffice = isPpt;
    const isBrowserFile = /\.(pdf|jpeg|jpg|png|gif|webp|txt)$/i.test(lower);

    const fileId = file?.id || file?.fileId || file?._id;

    if (!fileId) {
      toast.error("File không có mã định danh hợp lệ để xem trước.");
      return;
    }

    setIsPreviewLoading(true);

    try {
      let blob;
      let previewName = fileName;
      let previewType = null;
      let previewHtml = null;

      if (isDoc) {
        const conversionApi = `${APP_BASE}/api/doc-url-to-pdf?id=${fileId}`;
        const resData = await axiosClient.get(conversionApi, {
          responseType: "blob",
          timeout: 0,
        });
        blob = new Blob([resData], { type: "application/pdf" });
        previewType = "pdf";
      } else if (isBrowserFile) {
        const viewUrl = `${APP_BASE}/api/files/view/${fileId}`;
        const resData = await axiosClient.get(viewUrl, {
          responseType: "blob",
          timeout: 0,
        });
        blob = resData;
        const ext = fileName.split(".").pop().toLowerCase();
        previewType = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)
          ? "image"
          : "pdf";
      } else if (isExcel) {
        // Disabling preview for Excel as requested, opening download instead
        const downloadUrl = `${APP_BASE}/api/files/download/${fileId}`;
        window.open(downloadUrl, '_blank');
        return;
      } else if (isOtherOffice) {
        toast.info("Đang mở tài liệu bằng trình xem văn phòng...");
        const viewUrl = `${APP_BASE}/api/files/view/${fileId}`;
        window.open(viewUrl, '_blank');
        return;
      } else {
        throw new Error("Định dạng file không được hỗ trợ xem trước.");
      }

      if (blob) {
        const url = URL.createObjectURL(blob);
        setPreviewFile({
          open: true,
          url: url,
          name: previewName,
          type: previewType,
          html: previewHtml
        });
      }
    } catch (error) {
      const message = error.message || "Không thể xem trước tài liệu.";
      toast.error(message);
    } finally {
      setIsPreviewLoading(false);
    }
  }, []);


  const onFilePreviewClick = useCallback((fileItem) => (e) => {
    e.stopPropagation();
    handleFilePreview(fileItem);
  }, [handleFilePreview]);


  const handleCommentReaction = useCallback(async (commentId, isLike) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const currentComment = comments.find(c => c.id === commentId);
    if (!currentComment) return;

    const oldMeLike = currentComment.meLike;
    const oldMeDislike = currentComment.meDislike;
    const oldLikes = currentComment.likes;
    const oldDislikes = currentComment.dislikes;

    // Optimistic Update
    setComments(prev => prev.map(c => {
      if (c.id !== commentId) return c;

      let newMeLike = c.meLike;
      let newMeDislike = c.meDislike;
      let newLikes = c.likes;
      let newDislikes = c.dislikes;

      if (isLike) {
        if (newMeLike) {
          newMeLike = false;
          newLikes = Math.max(0, newLikes - 1);
        } else {
          newMeLike = true;
          newLikes++;
          if (newMeDislike) {
            newMeDislike = false;
            newDislikes = Math.max(0, newDislikes - 1);
          }
        }
      } else {
        if (newMeDislike) {
          newMeDislike = false;
          newDislikes = Math.max(0, newDislikes - 1);
        } else {
          newMeDislike = true;
          newDislikes++;
          if (newMeLike) {
            newMeLike = false;
            newLikes = Math.max(0, newLikes - 1);
          }
        }
      }
      return { ...c, meLike: newMeLike, meDislike: newMeDislike, likes: newLikes, dislikes: newDislikes };
    }));

    try {
      await axiosClient.post(API_LIKE_COMMENT, {
        type: "COMMENT",
        objectId: commentId,
        isLike: isLike
      });
    } catch (error) {
      toast.error("Lỗi khi phản hồi bình luận.");
      setComments(prev => prev.map(c =>
        c.id === commentId ? { ...c, meLike: oldMeLike, meDislike: oldMeDislike, likes: oldLikes, dislikes: oldDislikes } : c
      ));
    }
  }, [user, comments]);

  const onCommentReaction = useCallback((id, isLike) => () => handleCommentReaction(id, isLike), [handleCommentReaction]);


  const handleNewsReaction = useCallback(async (isLike) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const oldIsLiked = isNewsLiked;
    const oldIsDisliked = isNewsDisliked;
    const oldLikeCount = localNewsLikes;
    const oldDislikeCount = localNewsDislikes;

    let newIsLiked = isNewsLiked;
    let newIsDisliked = isNewsDisliked;
    let newLikeCount = localNewsLikes;
    let newDislikeCount = localNewsDislikes;

    if (isLike) {
      if (newIsLiked) {
        newIsLiked = false;
        newLikeCount = Math.max(0, newLikeCount - 1);
      } else {
        newIsLiked = true;
        newLikeCount++;
        if (newIsDisliked) {
          newIsDisliked = false;
          newDislikeCount = Math.max(0, newDislikeCount - 1);
        }
      }
    } else {
      if (newIsDisliked) {
        newIsDisliked = false;
        newDislikeCount = Math.max(0, newDislikeCount - 1);
      } else {
        newIsDisliked = true;
        newDislikeCount++;
        if (newIsLiked) {
          newIsLiked = false;
          newLikeCount = Math.max(0, newLikeCount - 1);
        }
      }
    }

    setIsNewsLiked(newIsLiked);
    setIsNewsDisliked(newIsDisliked);
    setLocalNewsLikes(newLikeCount);
    setLocalNewsDislikes(newDislikeCount);

    try {
      // Send the action type (true for like button, false for dislike button)
      toggleLike(isLike);

      await axiosClient.post(API_LIKE_COMMENT, {
        type: "NEWS",
        objectId: Number(newsId),
        isLike: isLike
      });
    } catch (error) {
      toast.error("Lỗi khi phản hồi tin tức.");
      setIsNewsLiked(oldIsLiked);
      setIsNewsDisliked(oldIsDisliked);
      setLocalNewsLikes(oldLikeCount);
      setLocalNewsDislikes(oldDislikeCount);
    }
  }, [user, isNewsLiked, isNewsDisliked, localNewsLikes, localNewsDislikes, toggleLike, newsId, setIsNewsDisliked, setLocalNewsDislikes]);

  const handleEditComment = useCallback(async (id, newContent) => {
    const text = newContent?.trim();
    if (!text) return;

    try {
      await axiosClient.patch(`${API_EDIT_COMMENT}/${id}`, {
        content: text
      });

      setComments(prev =>
        prev.map(c =>
          c.id === id ? { ...c, content: text } : c
        )
      );
      setEditingId(null);
      setEditContent("");
    } catch (error) {
      toast.error("Lỗi khi chỉnh sửa bình luận.");
    }
  }, []);

  const onSaveEdit = useCallback((id, content) => () => handleEditComment(id, content), [handleEditComment]);


  const handleDeleteComment = useCallback((id) => {
    setDeleteConfirmId(id);
    setActiveMenuId(null);
  }, []);

  const onDeleteConfirm = useCallback((id) => () => handleDeleteComment(id), [handleDeleteComment]);


  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmId) return;

    try {
      await axiosClient.delete(`${API_EDIT_COMMENT}/${deleteConfirmId}`);
      setComments(prev => prev.filter(c => c.id !== deleteConfirmId && c.parentId !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (error) {
      toast.error("Lỗi khi xóa bình luận.");
    }
  }, [deleteConfirmId]);




  const handleReplyInput = useCallback((e) => {
    handleReplyInputChange(e);
  }, [handleReplyInputChange]);




  const handleFavoriteClick = useCallback(() => handleNewsReaction(true), [handleNewsReaction]);

  const onMentionClick = useCallback((targetedUser) => () => addMentionToComment(targetedUser), [addMentionToComment]);
  const onReplyMentionClick = useCallback((targetedUser) => () => addMentionToReply(targetedUser), [addMentionToReply]);



  const onSendReply = useCallback((content, parentId) => () => handleSendComment(content, parentId), [handleSendComment]);
  const handleCommentSubmit = useCallback((e) => {
    if (e.key === 'Enter' && !showMentionDropdown) {
      handleSendComment(comment);
    }
  }, [comment, showMentionDropdown, handleSendComment]);

  const onSendComment = useCallback(() => handleSendComment(comment), [comment, handleSendComment]);
  const onReplyKeyDown = useCallback((cmt) => (e) => {
    if (e.key === 'Enter' && !showReplyMentionDropdown) {
      handleSendComment(replyContent, cmt.id);
    }
  }, [replyContent, showReplyMentionDropdown, handleSendComment]);

  // Fetch and resolve authenticated image and media blob URLs using axiosClient
  useEffect(() => {
    const htmlContent = currentNews?.content;
    if (!htmlContent) {
      setImageMap({});
      return;
    }

    const fileIds = extractFileIds(htmlContent);
    if (fileIds.length === 0) {
      setImageMap({});
      return;
    }

    let isMounted = true;
    const localUrls = {};
    const createdUrls = [];

    const loadImages = async () => {
      await Promise.all(
        fileIds.map(async (fileId) => {
          try {
            const viewUrl = `${APP_BASE}/api/files/view/${fileId}`;
            const resData = await axiosClient.get(viewUrl, {
              responseType: "blob",
              timeout: 0,
            });

            if (resData && isMounted) {
              const objectUrl = URL.createObjectURL(resData);
              createdUrls.push(objectUrl);
              localUrls[fileId] = objectUrl;
            }
          } catch (error) {
            // Silent catch: image failed to load
          }
        })
      );

      if (isMounted) {
        setImageMap(localUrls);
      }
    };

    loadImages();

    return () => {
      isMounted = false;
      // Revoke all local ObjectURLs created for this content to prevent memory leaks
      createdUrls.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // Silent catch: failed to revoke URL
        }
      });
    };
  }, [currentNews?.content]);

  if (!currentNews && !error) {
    const sk = {
      background: '#e2e8f0',
      backgroundImage: 'linear-gradient(90deg, #e2e8f0 0px, #f8fafc 50%, #e2e8f0 100%)',
      backgroundSize: '200% 100%',
      animation: 'nd-shimmer 2s infinite linear',
      borderRadius: '6px',
    };
    return (
      <div style={{ width: '100%', minHeight: '100vh', background: 'transparent', fontFamily: "'Be Vietnam Pro', -apple-system, sans-serif" }}>
        <style>{`
          @keyframes nd-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
        {/* Hero Banner skeleton */}
        <div style={{ background: '#e8edf5', padding: '40px 20px', marginBottom: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ ...sk, width: '120px', height: '14px', marginBottom: 8 }}></div>
          <div style={{ ...sk, width: '60%', height: '32px', marginBottom: 8 }}></div>
          <div style={{ ...sk, width: '40%', height: '20px' }}></div>
        </div>
        {/* Main layout: left content + right sidebar */}
        <div style={{ display: 'flex', gap: '32px', padding: '0 24px 40px', boxSizing: 'border-box', width: '100%' }}>
          {/* Left: Article */}
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 32, border: '1px solid #f1f5f9' }}>
              <div style={{ ...sk, width: '100%', height: '420px', borderRadius: 12, marginBottom: 32 }}></div>
              {[100, 100, 95, 100, 88, 100, 60].map((w, i) => (
                <div key={i} style={{ ...sk, width: `${w}%`, height: '18px', marginBottom: 14 }}></div>
              ))}
            </div>
          </div>
          {/* Right: Sidebar */}
          <div style={{ width: '340px', flexShrink: 0 }}>
            <div style={{ background: '#fff', padding: '24px', borderRadius: 16, border: '1px solid #f1f5f9' }}>
              <div style={{ ...sk, width: '100%', height: '42px', borderRadius: 8, marginBottom: 24 }}></div>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ marginBottom: 24, display: 'flex', gap: 16 }}>
                  <div style={{ ...sk, width: '100px', height: '65px', borderRadius: 8, flexShrink: 0 }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...sk, width: '100%', height: '16px', marginBottom: 8 }}></div>
                    <div style={{ ...sk, width: '75%', height: '16px', marginBottom: 8 }}></div>
                    <div style={{ ...sk, width: '40%', height: '12px' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) return (
    <ErrorState
      errorDetail={error}
      onRetry={onRetryClick}
    />
  );





  // Safe default if data not loaded yet
  // Ensure displayNews is stable during hydration
  const displayNews = (mounted && currentNews) ? currentNews : {
    title: "Đang tải dữ liệu...",
    topic: "Tin tức",
    content: "",
    authorName: "...",
    createdAt: "2024-01-01T00:00:00Z",
    viewCount: 0,
    likeCount: 0
  };

  // Image Logic
  // const responsiveMainImage = getResponsiveImage(displayNews);
  // const mainImageUrl = responsiveMainImage.src;
  const currentRelatedNewsId = Number(currentNews?.id || newsId);
  const getArrayData = (val) => {
    if (Array.isArray(val)) return val;
    if (Array.isArray(val?.items)) return val.items;
    if (Array.isArray(val?.data)) return val.data;
    if (Array.isArray(val?.data?.items)) return val.data.items;
    return [];
  };
  const suggestedNewsItems = getArrayData(suggestedNews)
    .filter((item) => Number(item?.id) !== currentRelatedNewsId);
  // const latestNewsItems = getArrayData(latestNews)
  //   .filter((item) => Number(item?.id) !== currentRelatedNewsId);
  const relatedNewsItems = suggestedNewsItems.slice(0, 5);

  const sendButtonClass = comment.trim() ? "nd-send-icon active" : "nd-send-icon";
  const titleClassName = isTitleMultiline ? "nd-title nd-title-multiline" : "nd-title";

  return (
    <div className="nd-page-wrapper">
      <FilePreviewModalCommon
        open={previewOpen}
        onClose={handleClosePreview}
        fileName={previewFileName}
        url={previewUrl}
        loading={isCommonPreviewLoading}
        verificationResult={verificationResult}
      />
      <AuthModal isOpen={showAuthModal} onClose={handleCloseAuthModal} />
      <ShareModal isOpen={showShareModal} onClose={handleCloseShareModal} url={currentUrl} title={displayNews.title} />
      <ConfirmDeleteModal
        isOpen={!!deleteConfirmId}
        onClose={handleCloseDeleteModal}
        onConfirm={confirmDelete}
        title="Xác nhận xóa"
        message="Bạn có chắc chắn muốn xóa bình luận này không?"
      />
      <OpinionModal
        isOpen={showOpinionModal}
        onClose={handleCloseOpinionModal}
        newsTitle={displayNews.title}
        newsId={newsId}
      />

      <FilePreviewModal
        isOpen={previewFile.open}
        onClose={handleClosePreviewModal}
        file={previewFile}
        loading={isPreviewLoading}
      />

      {/* 1. Hero Banner Section - Đã tối ưu vị trí nút Back */}
      <div className="nd-hero-banner">
        <div className="nd-hero-pattern"></div>

        {/* Nút Back nằm độc lập để có thể di chuyển ra lề trái màn hình */}
        <button
          className="nd-back-button-fixed"
          onClick={onBackClick}
          type="button"
          aria-label="Quay lại"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="nd-hero-content">
          <div className="nd-breadcrumb">
            <span onClick={onGoHomeClick}>Trang chủ</span>
            <span className="nd-icon-wrap">
              <ChevronRight size={14} />
            </span>
            {window.history.state?.fromSearch ? (
              <span onClick={onSearchBreadcrumbClick}>Tìm kiếm</span>
            ) : (
              <span onClick={onTopicClick(displayNews.topicName || displayNews.topic)}>
                {displayNews.topicName || displayNews.topic || "Hoạt động kinh doanh"}
              </span>
            )}
            <span className="nd-icon-wrap">
              <ChevronRight size={14} />
            </span>
            <span className="active" title={displayNews.title}>{displayNews.title}</span>
          </div>

          <h1 ref={titleRef} className={titleClassName}>{displayNews.title}</h1>

          <div className="nd-meta">
            <span>Ngày đăng: {moment(displayNews.publishedAt || displayNews.createdAt, ["DD/MM/YYYY", "YYYY-MM-DD", moment.ISO_8601]).format("DD/MM/YYYY")}</span>
            <span className="nd-meta-divider">•</span>
            <span>Ngày cập nhật: {moment(displayNews?.updatedAt, ["DD/MM/YYYY", "YYYY-MM-DD", moment.ISO_8601]).format("DD/MM/YYYY")}</span>
            <span className="nd-meta-divider">•</span>
            <span>Người soạn tin: {displayNews.authorName || "Phạm Công Hoan - TL CTr"}</span>
          </div>
        </div>
      </div>

      <div className="nd-container">
        {/* 2. Featured Image */}
        {/* {mainImageUrl && (
          <div className="nd-main-image-box" style={{ width: "960px", height: "547px", margin: "0 auto", overflow: "hidden", borderRadius: "16px" }}>
            <AuthImage src={mainImageUrl} alt="Featured" customClassName="nd-main-img" />
            {(() => {
              const caption = displayNews.imageTitle || (displayNews.nameThumbnail && !displayNews.nameThumbnail.includes('://') && !displayNews.nameThumbnail.startsWith('/') ? displayNews.nameThumbnail : null);
              if (!caption) return null;
              return (
                <div className="nd-main-image-caption">
                  <span>{caption}</span>
                </div>
              );
            })()}
          </div>
        )} */}

        {/* 3. Article Brief/Summary */}
        {displayNews.summary && (
          <div className="nd-summary-box">
            <p className="nd-summary-text">{displayNews.summary}</p>
          </div>
        )}

        <div className="nd-grid-layout">
          {/* 4. Left Column: Related News (Relocated & Redesigned) */}
          <aside className="nd-left-col">
              <div className="nd-related-sidebar">
                <h2 className="nd-related-sidebar-title">Tin liên quan</h2>
                {relatedNewsItems.length > 0 ? (
                  <div className="nd-related-list">
                    {relatedNewsItems.map((item) => (
                      <div key={item.id} className="nd-rel-list-item" onClick={onRelatedCardClick(item.id)}>
                        <div className="nd-rel-list-content">
                          <div className="nd-rel-list-img-box">
                            {(() => {
                              const resImg = getResponsiveImage(item);
                              const isPlaceholder = resImg.src?.includes('placeholder.com');
                              return (
                                <AuthImage
                                  src={isPlaceholder ? DEFAULT_NEWS_THUMBNAIL : resImg.src}
                                  alt={item.title}
                                />
                              );
                            })()}
                          </div>
                          <div className="nd-rel-list-text">
                            <h3 className="nd-rel-list-item-title">{item.title}</h3>
                            <div className="nd-rel-list-item-date">
                              {moment(item.publishedAt || item.createdAt, ["DD/MM/YYYY", "YYYY-MM-DD", moment.ISO_8601]).format("DD/MM/YYYY")}
                            </div>
                            <div className="nd-rel-list-item-stats">
                              <div className="nd-rel-list-stat">
                                <Eye size={14} />
                                <span>{item.viewCount || 0}</span>
                              </div>
                              <div className="nd-rel-list-stat">
                                <Heart size={14} />
                                <span>{item.likeCount || 0}</span>
                              </div>
                              <div className="nd-rel-list-stat">
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M6.6665 2.14844C5.73031 2.36202 4.85902 2.79712 4.12581 3.41719C3.3926 4.03725 2.81887 4.8242 2.45279 5.71193C2.08671 6.59966 1.93897 7.56227 2.02198 8.51893C2.10499 9.47558 2.41632 10.3984 2.92984 11.2098L1.99984 13.9998L4.78984 13.0698C5.60125 13.5833 6.52402 13.8946 7.48068 13.9776C8.43734 14.0606 9.39995 13.9129 10.2877 13.5468C11.1754 13.1807 11.9624 12.607 12.5824 11.8738C13.2025 11.1406 13.6376 10.2693 13.8512 9.3331M13.8512 6.66644C13.5994 5.56457 13.0419 4.55609 12.2427 3.75688C11.4435 2.95767 10.435 2.40017 9.33317 2.14844M11.3332 7.99977C11.3332 7.11572 10.982 6.26787 10.3569 5.64275C9.73174 5.01763 8.88389 4.66644 7.99984 4.66644M8.6665 7.99977C8.6665 7.82296 8.59626 7.65339 8.47124 7.52837C8.34622 7.40334 8.17665 7.3331 7.99984 7.3331" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <span>{item.commentCount || 0}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "#64748b", fontSize: "14px" }}>
                    Không có tin liên quan
                  </div>
                )}
              </div>

            {error && (
              <ErrorState message={error} onRetry={onRetryClick} />
            )}
          </aside>

          {/* 5. Right Column: Main Article Body */}
          <main className="nd-right-col" style={{ minWidth: 0 }}>
            <div ref={articleBodyRef} className="nd-article-body" onClick={handleArticleClick} dangerouslySetInnerHTML={{ __html: getProcessedHtmlContent(displayNews.content) }} />

            {/* Source & Tags */}
            <div className="nd-article-footer">
              <div className="nd-tags">
                {displayNews.tags ? displayNews.tags.split(',').map((tag) => (
                  <span key={`tag-${tag.trim()}`} className="nd-tag">#{tag.trim()}</span>
                )) : null}
              </div>
            </div>
          </main>
        </div>



        {/* 4. Engagement & Comments - RELOCATED TO BOTTOM */}
        <aside className="nd-bottom-comment-section">
          <div className="nd-engagement-bar">
            <div className="nd-eng-item" onClick={handleFavoriteClick}>
              <span>Yêu thích</span>
              {/* <span style={{ color: isNewsLiked ? "#ef4444" : "#64748b", display: 'flex' }}>
                <Heart size={20} fill={isNewsLiked ? "#ef4444" : "none"} />
              </span> */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                fill={isNewsLiked ? "#ef4444" : "none"}
              >
                <path
                  d="M17 4C13.8 4 12 6.667 12 8C12 6.667 10.2 4 7 4C3.8 4 3 6.667 3 8C3 15 12 20 12 20C12 20 21 15 21 8C21 6.667 20.2 4 17 4Z"
                  /* Sửa dòng stroke ở dưới đây */
                  stroke={isNewsLiked ? "#ef4444" : "url(#paint0_linear_1538_5167)"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <defs>
                  <linearGradient id="paint0_linear_1538_5167" x1="4.1" y1="-0.571429" x2="23.8699" y2="1.44758" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#22A6EC" />
                    <stop offset="1" stopColor="#4363EF" />
                  </linearGradient>
                </defs>
              </svg>

            </div>
            <div className="nd-eng-item" onClick={handleOpenShare}>
              <span>Chia sẻ</span>
              <AuthImage src="/share.png" alt="share" />
            </div>
            <div className="nd-eng-item" onClick={handleOpenOpinion}>
              <span>Góp ý</span>
              <svg width="20" height="20" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.5 9L2.25 15.75L15.75 9L2.25 2.25L4.5 9ZM4.5 9H9" stroke="url(#paint0_linear_344_4544)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                  <linearGradient id="paint0_linear_344_4544" x1="3.075" y1="-1.60714" x2="17.9346" y2="-0.258216" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#22A6EC" />
                    <stop offset="1" stopColor="#4363EF" />
                  </linearGradient>
                </defs>
              </svg>

            </div>
            {canUpdatePublished && (
              <div className="nd-eng-item" onClick={onEditClick}>
                <span>Chỉnh sửa</span>
                <Pencil size={18} stroke="url(#paint0_linear_344_4544)" />
              </div>
            )}
            <div className="nd-like-badge">
              {/* <span style={{ color: "white", display: 'flex' }}>
                <Heart size={14} fill="white" />
              </span> */}
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 0C4.475 0 0 4.475 0 10C0 15.525 4.475 20 10 20C15.525 20 20 15.525 20 10C20 4.475 15.525 0 10 0Z" fill="url(#paint0_radial_1538_5175)" />
                <path d="M13.1002 5.00001C10.3502 5.00001 10.0002 7.27501 10.0002 7.27501C10.0002 7.27501 9.65017 5.00001 6.90017 5.00001C4.25017 5.00001 3.47517 7.77501 3.80017 9.27501C4.65017 13.2 9.97517 15.95 9.97517 15.95C9.97517 15.95 15.3002 13.2 16.1502 9.27501C16.5002 7.77501 15.7252 5.00001 13.1002 5.00001Z" fill="white" />
                <defs>
                  <radialGradient id="paint0_radial_1538_5175" cx="0" cy="0" r="1" gradientTransform="matrix(2.70729 10.5884 -10.5883 2.70731 8.90602 8.89376)" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FF8297" />
                    <stop offset="0.1592" stopColor="#FD7A90" />
                    <stop offset="0.4121" stopColor="#F8637B" />
                    <stop offset="0.7251" stopColor="#EF3D5B" />
                    <stop offset="1" stopColor="#E61739" />
                  </radialGradient>
                </defs>
              </svg>

              <span>{localNewsLikes}</span>
            </div>
          </div>

          {displayNews.isComment !== false && (
            <div className="nd-comment-box-container">
              <div className="nd-comment-input-area nd-mention-container" ref={mentionDropdownRef}>
                <div className="nd-user-avatar-ring">
                  <div className="nd-user-small-avatar">
                    {mounted ? (user?.username || user?.user?.username || "U")[0].toUpperCase() : "U"}
                  </div>
                </div>
                <div className="nd-input-wrapper">
                  <span className="nd-input-icon" onClick={onTriggerFileUpload}>
                    <span style={{ color: "#3b82f6", display: 'flex' }}>
                      <Paperclip
                        strokeWidth={1.5}
                        size={18}
                      />
                    </span>
                  </span>
                  <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', height: '100%', overflow: 'hidden' }}>
                    <div
                      ref={commentOverlayRef}
                      style={{
                        position: 'absolute', top: 0, left: 0, bottom: 0, right: 0,
                        padding: '10px 0', fontSize: '14px', whiteSpace: 'pre', overflow: 'hidden',
                        color: '#1e293b', pointerEvents: 'none', zIndex: 0, fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center'
                      }}
                    >
                      {comment ? renderContentWithMentions(comment) : <span style={{ color: '#94a3b8' }}>Nhập @ để tag người</span>}
                    </div>
                    <input
                      ref={commentInputRef}
                      type="text"
                      value={comment}
                      onChange={handleCommentInput}
                      onKeyDown={handleCommentSubmit}
                      onScroll={handleCommentScroll}
                      style={{
                        border: 'none', background: 'transparent', flex: 1, padding: '10px 0', fontSize: '14px', outline: 'none',
                        color: 'transparent', caretColor: '#1e293b', position: 'relative', zIndex: 1, width: '100%', fontFamily: 'inherit'
                      }}
                    />
                  </div>
                  <span className={sendButtonClass} onClick={onSendComment}>
                    <span style={{ display: 'flex' }}>
                      <Send
                        size={20}
                      />
                    </span>
                  </span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                  />
                </div>

                {/* Mention Dropdown */}
                {showMentionDropdown && (
                  <div className="nd-mention-dropdown" style={{ zIndex: 10 }}>
                    <div className="nd-mention-list">
                      {(localUserList || []).slice(0, 10).map((userItem) => {
                        const avatarUrl = Array.isArray(userItem.avatar) && userItem.avatar.length > 0
                          ? userItem.avatar[0]
                          : `https://ui-avatars.com/api/?name=${encodeURIComponent(userItem.name)}&background=random&color=fff`;
                        return (
                          <div
                            key={userItem.id}
                            className="nd-mention-item"
                            onClick={onMentionClick(userItem)}
                          >
                            <AuthImage src={avatarUrl} alt="" />
                            <div className="nd-mention-info">
                              <span className="nd-mention-name">{userItem.name}</span>
                              <span className="nd-mention-role">{userItem.position || "Nhân viên"}</span>
                            </div>
                          </div>
                        );
                      })}
                      {(!localUserList || localUserList.length === 0) && (
                        <div className="nd-mention-empty">
                          {isLoadingUsers ? "Đang tìm kiếm..." : "Không tìm thấy người dùng"}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Uploaded Files Preview near Comment Box */}
              {commentUploads.length > 0 && (
                <div className="nd-comment-uploads-preview">
                  {commentUploads.map((f, idx) => (
                    <div key={f.id || `upload-${idx}`} className="nd-comment-file-tag">
                      <FileText size={12} />
                      <span className="nd-file-name-mini">{f.name}</span>
                      <span className="nd-remove-file" onClick={onRemoveFile(f.id)}>
                        <X size={12} />
                      </span>
                    </div>
                  ))}
                  <div className="nd-clear-uploads" onClick={onClearUploads}>Xóa tất cả</div>
                </div>
              )}

              <div className="nd-comment-count-title">Bình luận ({comments.length})</div>

              <div className="nd-comments-list">
                {comments.filter(c => !c.parentId).map((cmt) => {
                  const childComments = comments.filter(child => child.parentId === cmt.id);
                  const isExpanded = expandedComments[cmt.id];

                  return (
                    <div key={cmt.id} className="nd-cmt-wrapper">
                      <div className="nd-cmt-item">
                        <div className="nd-cmt-main">
                          <div className="nd-cmt-avatar">{cmt.author ? cmt.author[0].toUpperCase() : "U"}</div>
                          <div className="nd-cmt-content">
                            <div className="nd-cmt-header">
                              <span className="nd-cmt-author">{cmt.author}</span>
                              <span className="nd-cmt-time">• {cmt.time}</span>

                              {(user?.id === cmt.authorId || user?.user?.id === cmt.authorId) && !editingId && (
                                <div className="nd-cmt-more-wrap">
                                  <button className="nd-cmt-more-btn" onClick={onToggleMenu(cmt.id)}>
                                    <MoreVertical size={16} />
                                  </button>
                                  {activeMenuId === cmt.id && (
                                    <div className="nd-cmt-menu">
                                      <button onClick={onEditComment(cmt)}>
                                        <Edit2 size={14} /> Chỉnh sửa
                                      </button>
                                      <button className="delete" onClick={onDeleteConfirm(cmt.id)}>
                                        <Trash2 size={14} /> Xóa
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {editingId === cmt.id ? (
                              <div className="nd-edit-box">
                                <textarea
                                  autoFocus
                                  value={editContent}
                                  onChange={handleEditContentChange}
                                />
                                <div className="nd-edit-actions">
                                  <button className="save" onClick={onSaveEdit(cmt.id, editContent)}>Lưu</button>
                                  <button onClick={onCancelEdit}>Hủy</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="nd-cmt-text">{renderContentWithMentions(cmt.content)}</p>
                                <div className="nd-attached-files-list">
                                  {(cmt.file || []).map((fileItem, fIdx) => (
                                    isExcelFile(fileItem.file_name || fileItem.name) ? (
                                      <a
                                        key={fileItem.id || `file-${fIdx}`}
                                        href={`${APP_BASE}/api/files/download/${fileItem.id || fileItem.fileId}`}
                                        download
                                        className="nd-cmt-attached-file"
                                        onClick={onDownloadFileClick}
                                      >
                                        <span style={{ display: 'flex' }}><FileText size={14} /></span>
                                        <span>{fileItem.file_name}</span>
                                        <span style={{ marginLeft: 4, display: 'flex' }}><Download size={12} /></span>
                                      </a>
                                    ) : (
                                      <div
                                        key={fileItem.id || `file-${fIdx}`}
                                        className="nd-cmt-attached-file"
                                        onClick={onFilePreviewClick(fileItem)}
                                        style={{ cursor: 'pointer' }}
                                      >
                                        <span style={{ display: 'flex' }}><FileText size={14} /></span>
                                        <span>{fileItem.file_name}</span>
                                        <span style={{ marginLeft: 4, display: 'flex' }}><Eye size={12} /></span>
                                      </div>
                                    )
                                  ))}
                                </div>
                              </>
                            )}

                            <div className="nd-cmt-actions">
                              <div className="nd-cmt-left-actions">
                                <span className="nd-cmt-reply-btn" onClick={onReplyClick(cmt.id, cmt.author)}>
                                  {replyingToId === cmt.id ? "Hủy" : "Trả lời"}
                                </span>
                              </div>
                              <div className="nd-cmt-stats">
                                <div className="nd-cmt-stat" onClick={onCommentReaction(cmt.id, true)}>
                                  <span style={{ color: cmt.meLike ? "#ef4444" : "#94a3b8", display: 'flex' }}>
                                    <Heart size={14} fill={cmt.meLike ? "#ef4444" : "none"} />
                                  </span>
                                  <span>{cmt.likes || 0}</span>
                                </div>
                                <div className="nd-cmt-stat" onClick={onCommentReaction(cmt.id, false)}>
                                  <span style={{ color: "#94a3b8", display: 'flex' }}>
                                    <ThumbsDown size={14} fill={cmt.meDislike ? "#64748b" : "none"} />
                                  </span>
                                  <span>{cmt.dislikes || 0}</span>
                                </div>
                              </div>
                            </div>

                            {/* Reply Input for parent */}
                            {replyingToId === cmt.id && (
                              <div className="nd-reply-input-box nd-reply-mention-container" ref={replyMentionDropdownRef}>
                                <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', height: '100%', overflow: 'hidden' }}>
                                  <div
                                    ref={replyOverlayRef}
                                    style={{
                                      position: 'absolute', top: 0, left: 0, bottom: 0, right: 0,
                                      fontSize: '13px', whiteSpace: 'pre', overflow: 'hidden',
                                      color: '#1e293b', pointerEvents: 'none', zIndex: 0, fontFamily: 'inherit',
                                      display: 'flex', alignItems: 'center'
                                    }}
                                  >
                                    {replyContent ? renderContentWithMentions(replyContent) : <span style={{ color: '#94a3b8' }}>Phản hồi {cmt.author}...</span>}
                                  </div>
                                  <input
                                    autoFocus
                                    ref={replyInputRef}
                                    value={replyContent}
                                    onChange={handleReplyInput}
                                    onKeyDown={onReplyKeyDown(cmt)}
                                    onScroll={handleReplyScroll}
                                    style={{
                                      border: 'none', background: 'transparent', flex: 1, fontSize: '13px', outline: 'none',
                                      color: 'transparent', caretColor: '#1e293b', position: 'relative', zIndex: 1, width: '100%', fontFamily: 'inherit'
                                    }}
                                  />
                                </div>
                                <span style={{ color: "#3b82f6", display: 'flex' }}>
                                  <Send size={16} onClick={onSendReply(replyContent, cmt.id)} />
                                </span>

                                {/* Reply Mention Dropdown */}
                                {showReplyMentionDropdown && (
                                  <div className="nd-mention-dropdown nd-reply-mention-dropdown">
                                    <div className="nd-mention-list">
                                      {localUserList && localUserList.length > 0 ? (
                                        localUserList.slice(0, 10).map((userItem) => {
                                          const avatarUrl = Array.isArray(userItem.avatar) && userItem.avatar.length > 0
                                            ? userItem.avatar[0]
                                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(userItem.name)}&background=random&color=fff`;
                                          return (
                                            <div
                                              key={userItem.id}
                                              className="nd-mention-item"
                                              onClick={onReplyMentionClick(userItem)}
                                            >
                                              <AuthImage src={avatarUrl} alt="" />
                                              <div className="nd-mention-info">
                                                <span className="nd-mention-name">{userItem.name}</span>
                                                <span className="nd-mention-role">{userItem.position || "Nhân viên"}</span>
                                              </div>
                                            </div>
                                          );
                                        })
                                      ) : (
                                        <div className="nd-mention-empty">
                                          {isLoadingUsers ? "Đang tìm kiếm..." : "Không tìm thấy người dùng"}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Nested Replies */}
                      {childComments.length > 0 && (
                        <div className="nd-replies-section">
                          {!isExpanded ? (
                            <button className="nd-toggle-replies" onClick={onToggleReplies(cmt.id)}>
                              <span style={{ display: 'flex' }}>
                                <ChevronDown size={14} />
                              </span>
                              Xem {childComments.length} phản hồi
                            </button>
                          ) : (
                            <div className="nd-replies-list">
                              {childComments.map(reply => (
                                <div key={reply.id} className="nd-cmt-item reply">
                                  <div className="nd-cmt-main">
                                    <div className="nd-cmt-avatar small">{reply.author ? reply.author[0].toUpperCase() : "U"}</div>
                                    <div className="nd-cmt-content">
                                      <div className="nd-cmt-header">
                                        <span className="nd-cmt-author">{reply.author}</span>
                                        <span className="nd-cmt-time">• {reply.time}</span>

                                        {(user?.id === reply.authorId || user?.user?.id === reply.authorId) && !editingId && (
                                          <div className="nd-cmt-more-wrap">
                                            <button className="nd-cmt-more-btn" onClick={onToggleMenu(reply.id)}>
                                              <span style={{ display: 'flex' }}>
                                                <MoreVertical size={14} />
                                              </span>
                                            </button>
                                            {activeMenuId === reply.id && (
                                              <div className="nd-cmt-menu small">
                                                <button onClick={onEditComment(reply)}>
                                                  <span style={{ display: 'flex' }}><Edit2 size={12} /></span> Sửa
                                                </button>
                                                <button className="delete" onClick={onDeleteConfirm(reply.id)}>
                                                  <span style={{ display: 'flex' }}><Trash2 size={12} /></span> Xóa
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      {editingId === reply.id ? (
                                        <div className="nd-edit-box small">
                                          <textarea autoFocus value={editContent} onChange={handleEditContentChange} />
                                          <div className="nd-edit-actions">
                                            <button className="save" onClick={onSaveEdit(reply.id, editContent)}>Lưu</button>
                                            <button onClick={onCancelEdit}>Hủy</button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <p className="nd-cmt-text">{renderContentWithMentions(reply.content)}</p>
                                          <div className="nd-attached-files-list">
                                            {(reply.file || []).map((fileItem, rIdx) => (
                                              isExcelFile(fileItem.file_name || fileItem.name) ? (
                                                <a
                                                  key={fileItem.id || `reply-file-${rIdx}`}
                                                  href={`${APP_BASE}/api/files/download/${fileItem.id || fileItem.fileId}`}
                                                  download
                                                  className="nd-cmt-attached-file small"
                                                  onClick={onDownloadFileClick}
                                                >
                                                  <span style={{ display: 'flex' }}><FileText size={12} /></span>
                                                  <span>{fileItem.file_name}</span>
                                                  <span style={{ marginLeft: 4, display: 'flex' }}><Download size={10} /></span>
                                                </a>
                                              ) : (
                                                <div
                                                  key={fileItem.id || `reply-file-${rIdx}`}
                                                  className="nd-cmt-attached-file small"
                                                  onClick={onFilePreviewClick(fileItem)}
                                                  style={{ cursor: 'pointer' }}
                                                >
                                                  <span style={{ display: 'flex' }}><FileText size={12} /></span>
                                                  <span>{fileItem.file_name}</span>
                                                  <span style={{ marginLeft: 4, display: 'flex' }}>
                                                    <Eye size={10} />
                                                  </span>
                                                </div>
                                              )
                                            ))}
                                          </div>
                                        </>
                                      )}

                                      <div className="nd-cmt-actions">
                                        <div className="nd-cmt-left-actions">
                                          <span className="nd-cmt-reply-btn" onClick={onReplyClick(reply.id, reply.author)}>
                                            {replyingToId === reply.id ? "Hủy" : "Trả lời"}
                                          </span>
                                        </div>
                                        <div className="nd-cmt-stats">
                                          <div className="nd-cmt-stat" onClick={onCommentReaction(reply.id, true)}>
                                            <span style={{ color: reply.meLike ? "#ef4444" : "#94a3b8", display: 'flex' }}>
                                              <Heart size={12} fill={reply.meLike ? "#ef4444" : "none"} />
                                            </span>
                                            <span>{reply.likes || 0}</span>
                                          </div>
                                          <div className="nd-cmt-stat" onClick={onCommentReaction(reply.id, false)}>
                                            <span style={{ color: "#94a3b8", display: 'flex' }}>
                                              <ThumbsDown size={12} fill={reply.meDislike ? "#64748b" : "none"} />
                                            </span>
                                            <span>{reply.dislikes || 0}</span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Reply Input for Level 1 */}
                                      {replyingToId === reply.id && (
                                        <div className="nd-reply-input-box nd-reply-mention-container small-reply-input" ref={replyMentionDropdownRef} style={{ marginTop: 12 }}>
                                          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', height: '100%', overflow: 'hidden' }}>
                                            <div
                                              ref={replyOverlayRef}
                                              style={{
                                                position: 'absolute', top: 0, left: 0, bottom: 0, right: 0,
                                                fontSize: '12px', whiteSpace: 'pre', overflow: 'hidden',
                                                color: '#1e293b', pointerEvents: 'none', zIndex: 0, fontFamily: 'inherit',
                                                display: 'flex', alignItems: 'center'
                                              }}
                                            >
                                              {replyContent ? renderContentWithMentions(replyContent) : <span style={{ color: '#94a3b8' }}>Phản hồi {reply.author}...</span>}
                                            </div>
                                            <input
                                              autoFocus
                                              ref={replyInputRef}
                                              value={replyContent}
                                              onChange={handleReplyInput}
                                              onKeyDown={onReplyKeyDown(reply)}
                                              onScroll={handleReplyScroll}
                                              style={{
                                                border: 'none', background: 'transparent', flex: 1, fontSize: '12px', outline: 'none',
                                                color: 'transparent', caretColor: '#1e293b', position: 'relative', zIndex: 1, width: '100%', fontFamily: 'inherit'
                                              }}
                                            />
                                          </div>
                                          <span style={{ color: "#3b82f6", display: 'flex', cursor: 'pointer' }}>
                                            <Send size={14} onClick={onSendReply(replyContent, reply.id)} />
                                          </span>

                                          {/* Reply Mention Dropdown */}
                                          {showReplyMentionDropdown && (
                                            <div className="nd-mention-dropdown nd-reply-mention-dropdown">
                                              <div className="nd-mention-list">
                                                {localUserList && localUserList.length > 0 ? (
                                                  localUserList.slice(0, 10).map((userItem) => {
                                                    const avatarUrl = Array.isArray(userItem.avatar) && userItem.avatar.length > 0
                                                      ? userItem.avatar[0]
                                                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(userItem.name)}&background=random&color=fff`;
                                                    return (
                                                      <div
                                                        key={userItem.id}
                                                        className="nd-mention-item"
                                                        onClick={onReplyMentionClick(userItem)}
                                                      >
                                                        <AuthImage src={avatarUrl} alt="" />
                                                        <div className="nd-mention-info">
                                                          <span className="nd-mention-name">{userItem.name}</span>
                                                          <span className="nd-mention-role">{userItem.position || "Nhân viên"}</span>
                                                        </div>
                                                      </div>
                                                    );
                                                  })
                                                ) : (
                                                  <div className="nd-mention-empty">
                                                    {isLoadingUsers ? "Đang tìm kiếm..." : "Không tìm thấy người dùng"}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Level 2 Grandchild Comments */}
                                      {(() => {
                                        const grandchildComments = comments.filter(g => g.parentId === reply.id);
                                        if (grandchildComments.length === 0) return null;
                                        return (
                                          <div className="nd-replies-list grandchild" style={{ marginTop: 12, paddingLeft: 12, borderLeft: '1px dashed #e2e8f0' }}>
                                            {grandchildComments.map(grandchild => (
                                              <div key={grandchild.id} className="nd-cmt-item reply level-2" style={{ padding: '8px 0 8px 8px' }}>
                                                <div className="nd-cmt-main">
                                                  <div className="nd-cmt-avatar small" style={{ width: 24, height: 24, fontSize: '11px' }}>
                                                    {grandchild.author ? grandchild.author[0].toUpperCase() : "U"}
                                                  </div>
                                                  <div className="nd-cmt-content">
                                                    <div className="nd-cmt-header">
                                                      <span className="nd-cmt-author">{grandchild.author}</span>
                                                      <span className="nd-cmt-time">• {grandchild.time}</span>
                                                      
                                                      {(user?.id === grandchild.authorId || user?.user?.id === grandchild.authorId) && !editingId && (
                                                        <div className="nd-cmt-more-wrap">
                                                          <button className="nd-cmt-more-btn" onClick={onToggleMenu(grandchild.id)}>
                                                            <span style={{ display: 'flex' }}>
                                                              <MoreVertical size={12} />
                                                            </span>
                                                          </button>
                                                          {activeMenuId === grandchild.id && (
                                                            <div className="nd-cmt-menu small">
                                                              <button onClick={onEditComment(grandchild)}>
                                                                <span style={{ display: 'flex' }}><Edit2 size={12} /></span> Sửa
                                                              </button>
                                                              <button className="delete" onClick={onDeleteConfirm(grandchild.id)}>
                                                                <span style={{ display: 'flex' }}><Trash2 size={12} /></span> Xóa
                                                              </button>
                                                            </div>
                                                          )}
                                                        </div>
                                                      )}
                                                    </div>
                                                    
                                                    {editingId === grandchild.id ? (
                                                      <div className="nd-edit-box small">
                                                        <textarea autoFocus value={editContent} onChange={handleEditContentChange} />
                                                        <div className="nd-edit-actions">
                                                          <button className="save" onClick={onSaveEdit(grandchild.id, editContent)}>Lưu</button>
                                                          <button onClick={onCancelEdit}>Hủy</button>
                                                        </div>
                                                      </div>
                                                    ) : (
                                                      <>
                                                        <p className="nd-cmt-text">{renderContentWithMentions(grandchild.content)}</p>
                                                        <div className="nd-attached-files-list">
                                                          {(grandchild.file || []).map((fileItem, gIdx) => (
                                                            isExcelFile(fileItem.file_name || fileItem.name) ? (
                                                              <a
                                                                key={fileItem.id || `grandchild-file-${gIdx}`}
                                                                href={`${APP_BASE}/api/files/download/${fileItem.id || fileItem.fileId}`}
                                                                download
                                                                className="nd-cmt-attached-file small"
                                                                onClick={onDownloadFileClick}
                                                              >
                                                                <span style={{ display: 'flex' }}><FileText size={12} /></span>
                                                                <span>{fileItem.file_name}</span>
                                                                <span style={{ marginLeft: 4, display: 'flex' }}><Download size={10} /></span>
                                                              </a>
                                                            ) : (
                                                              <div
                                                                key={fileItem.id || `grandchild-file-${gIdx}`}
                                                                className="nd-cmt-attached-file small"
                                                                onClick={onFilePreviewClick(fileItem)}
                                                                style={{ cursor: 'pointer' }}
                                                              >
                                                                <span style={{ display: 'flex' }}><FileText size={12} /></span>
                                                                <span>{fileItem.file_name}</span>
                                                                <span style={{ marginLeft: 4, display: 'flex' }}>
                                                                  <Eye size={10} />
                                                                </span>
                                                              </div>
                                                            )
                                                          ))}
                                                        </div>
                                                      </>
                                                    )}
                                                    
                                                    <div className="nd-cmt-actions">
                                                      <div className="nd-cmt-stats">
                                                        <div className="nd-cmt-stat" onClick={onCommentReaction(grandchild.id, true)}>
                                                          <span style={{ color: grandchild.meLike ? "#ef4444" : "#94a3b8", display: 'flex' }}>
                                                            <Heart size={12} fill={grandchild.meLike ? "#ef4444" : "none"} />
                                                          </span>
                                                          <span>{grandchild.likes || 0}</span>
                                                        </div>
                                                        <div className="nd-cmt-stat" onClick={onCommentReaction(grandchild.id, false)}>
                                                          <span style={{ color: "#94a3b8", display: 'flex' }}>
                                                            <ThumbsDown size={12} fill={grandchild.meDislike ? "#64748b" : "none"} />
                                                          </span>
                                                          <span>{grandchild.dislikes || 0}</span>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                              <button className="nd-toggle-replies hide" onClick={onToggleReplies(cmt.id)}>
                                <span style={{ display: 'flex' }}>
                                  <ChevronUp size={14} />
                                </span>
                                Thu gọn
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <ErrorState message={error} onRetry={onRetryClick} />
          )}
        </aside>
      </div>

      <style>{`
        .nd-page-wrapper {
          background: transparent;
          width: 100%;
          min-height: 100vh;
          font-family: 'Be Vietnam Pro', -apple-system, sans-serif;
        }
        .nd-hero-banner {
          background: url('/anhtrongdong.png') no-repeat center center;
          background-size: cover;
          padding: 40px 20px; /* Tăng padding để nội dung thông thoáng */
          text-align: center;
          position: relative; /* Quan trọng: Để làm mốc cho nút absolute */
          overflow: hidden;
          margin-bottom: 30px;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .nd-hero-pattern {
          position: absolute;
          top: 0; right: 0; bottom: 0;
          width: 40%;
          background: url('https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Vietnam_Dong_Son_drum.svg/500px-Vietnam_Dong_Son_drum.svg.png') no-repeat right center;
          background-size: contain;
          opacity: 0.05;
        }
        .nd-hero-content {
          position: relative;
          z-index: 1;
          width: min(100%, 1000px);
          margin: 0 auto;
          box-sizing: border-box;
        }
        .nd-back-button-fixed {
          position: absolute;
          left: 40px; /* Khoảng cách cố định từ lề trái banner vào */
          top: 10px;  /* Khoảng cách từ trên xuống */
          width: 44px;
          height: 44px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 50%;
          background: white;
          color: #1e293b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          z-index: 20;
        }
          .nd-back-button-fixed:hover {
          background: #2563eb;
          color: white;
          transform: translateX(-5px); /* Hiệu ứng nhích nhẹ sang trái khi hover */
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.2);
        }
          @media (max-width: 1200px) {
          .nd-back-button-fixed {
            left: 20px; /* Thu hẹp khoảng cách khi màn hình nhỏ đi */
          }
        }

        @media (max-width: 768px) {
          .nd-hero-banner {
            padding: 60px 15px 30px 15px; /* Thêm padding top để không đè nút */
          }
          .nd-back-button-fixed {
            top: 15px;
            left: 15px;
            width: 36px;
            height: 36px;
          }
          .nd-title {
            font-size: 22px;
          }
        }
        .nd-breadcrumb {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          font-size: 13px; color: #64748b; margin-bottom: 20px;
          white-space: nowrap;
          overflow: hidden;
          width: 100%;
        }
        .nd-breadcrumb span { 
          cursor: pointer; 
          transition: color 0.2s;
          display: inline-block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 300px;
        }
        .nd-breadcrumb span:hover { color: #2563eb; }
        .nd-breadcrumb .active { 
          color: #2563eb; 
          font-weight: 600; 
          cursor: default;
          max-width: 450px;
        }
        .nd-breadcrumb span.nd-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: default;
          padding: 0;
          margin: 0;
          color: #94a3b8;
          max-width: fit-content;
        }
        .nd-breadcrumb span.nd-icon-wrap:hover { color: #94a3b8; }
        
        .nd-title {
          font-size: 26px;
          font-weight: 400;
          color: #2563eb;
          line-height: 1.3;
          margin-bottom: 24px;
          text-align: center;
          max-width: 100%;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .nd-title.nd-title-multiline {
          // text-align: left;
        }
        .nd-meta {
          font-size: 14px;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-weight: 500;
        }
        .nd-meta-divider { opacity: 0.5; }

        .nd-container {
          max-width: 1550px;
          margin: 0 auto;
          padding: 0 20px 60px 20px;
        }
        .nd-main-image-box {
          width: 100%;
          margin: 0 auto 40px auto;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 10px 30px -5px rgba(0,0,0,0.1);
        }
        .nd-main-img { width: 100%; height: 100%; display: block; max-height: 510px; object-fit: fill; }

        .nd-summary-box {
          // margin: 0 auto 40px auto;
          text-align: center;
        }
        .nd-summary-text {
          font-size: 20px;
          font-weight: 600;
          color: #1e293b;
          line-height: 1.6;
          display: inline-block;
          text-align: left;
        }

        .nd-grid-layout {
          display: grid;
          grid-template-columns: 420px 1fr;
          gap: 60px;
          align-items: flex-start;
        }

        .nd-left-col {
          display: flex;
          flex-direction: column;
          gap: 40px;
          position: sticky;
          top: 100px;
          height: fit-content;
        }

        .nd-related-sidebar-title {
          font-size: 20px;
          font-weight: 700;
          color: #2563eb;
          margin-bottom: 24px;
        }

        .nd-related-list {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .nd-rel-list-item {
          cursor: pointer;
          transition: transform 0.2s;
        }

        .nd-rel-list-item:hover {
          transform: translateX(4px);
        }

        .nd-rel-list-content {
          display: flex;
          gap: 16px;
        }

        .nd-rel-list-img-box {
          width: 140px;
          height: 94px;
          flex-shrink: 0;
          border-radius: 8px;
          overflow: hidden;
          background: #f1f5f9;
        }

        .nd-rel-list-img-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .nd-rel-list-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .nd-rel-list-item-title {
          font-size: 17px;
          font-weight: 500;
          line-height: 1.4;
          color: #1e293b;
          margin: 0 0 4px 0;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .nd-rel-list-item-date {
          font-size: 14px;
          color: #94a3b8;
          margin-bottom: 8px;
        }

        .nd-rel-list-item-stats {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .nd-rel-list-stat {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
        }

        .nd-bottom-comment-section {
          margin-top: 60px;
          padding-top: 40px;
          border-top: 2px solid #f1f5f9;
        }

        /* Left Column */
        .nd-engagement-bar {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 32px;
          padding-bottom: 20px;
          border-bottom: 1px solid #e2e8f0;
        }
        .nd-eng-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
        }
        .nd-like-badge {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 6px;
          // background: #ef4444;
          color: black;
          padding: 4px 12px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 14px;
        }

        .nd-cmt-attached-file {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
          color: #475569;
          text-decoration: none;
          transition: all 0.2s;
          border: 1px solid #e2e8f0;
          max-width: 100%;
        }
        .nd-cmt-attached-file:hover {
          background: #f1f5f9;
          color: #2563eb;
          border-color: #cbd5e1;
        }
        .nd-cmt-attached-file.small {
          padding: 4px 8px;
          font-size: 11px;
          margin-top: 4px;
        }
        .nd-cmt-attached-file span {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .nd-cmt-attached-file .ml-1 { margin-left: 4px; opacity: 0.6; }
        .nd-attached-files-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: flex-start;
          margin-top: 4px;
        }

        .nd-comment-box-container {
          background: white;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          border: 1px solid #f1f5f9;
        }
        .nd-comment-input-area {
          display: flex;
          gap: 12px;
          margin-bottom: 32px;
        }
        .nd-user-avatar-ring {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 2px solid #3b82f6;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2px;
        }
        .nd-user-small-avatar {
          width: 100%; height: 100%; border-radius: 50%; background: #3b82f6; 
          color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px;
        }
        .nd-input-wrapper {
          flex: 1; background: white; border: 1.5px solid #dbeafe; border-radius: 30px;
          display: flex; align-items: center; padding: 0 16px; gap: 10px;
        }
        .nd-input-wrapper input {
          border: none; background: transparent; flex: 1; padding: 10px 0; font-size: 14px; outline: none;
        }
        .nd-input-icon { color: #3b82f6; opacity: 0.7; cursor: pointer; transition: opacity 0.2s; }
        .nd-input-icon:hover { opacity: 1; }
        .nd-send-icon { color: #3b82f6; cursor: pointer; transition: transform 0.2s; }
        .nd-send-icon:hover { transform: scale(1.1); }

        .nd-comment-count-title { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 24px; }
        .nd-comments-list {
          padding-right: 10px;
        }
        
        .nd-comments-list::-webkit-scrollbar {
          width: 4px;
        }
        .nd-comments-list::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 4px;
        }

        .nd-cmt-item { margin-bottom: 15px; }
        .nd-cmt-main { display: flex; gap: 12px; }
        .nd-cmt-avatar { 
          width: 38px; height: 38px; border-radius: 50%; background: #94a3b8; 
          color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px;
        }
        .nd-cmt-content { flex: 1; }
        .nd-cmt-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .nd-cmt-author { font-size: 14px; font-weight: 700; color: #1e293b; }
        .nd-cmt-time { font-size: 12px; color: #94a3b8; }
        .nd-cmt-text { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 12px; }
        .nd-cmt-actions { display: flex; justify-content: space-between; align-items: center; }
        .nd-cmt-left-actions { display: flex; align-items: center; gap: 12px; }
        .nd-cmt-reply-btn { font-size: 12px; font-weight: 700; color: #3b82f6; cursor: pointer; margin-top: 8px; }
        .nd-cmt-stats { display: flex; gap: 16px; }
        .nd-cmt-stat { display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 500; color: #94a3b8; cursor: pointer; }
        
        /* New Comment Logic Styles */
        .nd-cmt-more-wrap { position: relative; margin-left: auto; }
        .nd-cmt-more-btn { background: none; border: none; padding: 4px; cursor: pointer; color: #94a3b8; border-radius: 50%; display: flex; }
        .nd-cmt-more-btn:hover { background: #f1f5f9; color: #475569; }
        .nd-cmt-menu {
          position: absolute; right: 0; top: 100%; background: white; border: 1px solid #e2e8f0; border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 50; min-width: 140px; margin-top: 5px; overflow: hidden;
        }
        .nd-cmt-menu button {
          width: 100%; padding: 10px 15px; border: none; background: none; text-align: left; font-size: 13px; color: #475569;
          cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.2s;
        }
        .nd-cmt-menu button:hover { background: #f8fafc; color: #2563eb; }
        .nd-cmt-menu button.delete:hover { border-color: #fef2f2; color: #ef4444; }

        .nd-edit-box { margin-bottom: 15px; }
        .nd-edit-box textarea {
          width: 100%; min-height: 80px; border: 1.5px solid #dbeafe; border-radius: 12px; padding: 12px;
          font-size: 14px; color: #475569; outline: none; margin-bottom: 8px; resize: none;
        }
        .nd-edit-actions { display: flex; gap: 8px; }
        .nd-edit-actions button {
          padding: 6px 16px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; border: none;
          background: #f1f5f9; color: #64748b;
        }
        .nd-edit-actions button.save { background: #3b82f6; color: white; }

        .nd-reply-input-box {
          margin-top: 15px; display: flex; align-items: center; gap: 10px; background: #f8fafc;
          border-radius: 12px; padding: 8px 12px; border: 1px solid #e2e8f0;
          position: relative;
        }
        .nd-reply-input-box input { border: none; background: transparent; flex: 1; font-size: 13px; outline: none; }
        .nd-reply-input-box :global(svg) { color: #3b82f6; cursor: pointer; }

        /* Mention Dropdown Styles */
        .nd-mention-container {
          position: relative;
        }
        .nd-mention-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 56px;
          right: 0;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 16px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          z-index: 9999;
          overflow: hidden;
          max-width: 400px;
          animation: slideIn 0.2s ease-out;
        }
        .nd-reply-mention-dropdown {
          left: 0;
          bottom: calc(100% + 12px);
          top: auto;
          box-shadow: 0 -10px 15px -3px rgba(0, 0, 0, 0.1), 0 -4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .nd-reply-mention-dropdown {
          animation: slideUp 0.2s ease-out;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .nd-mention-search {
          padding: 10px 14px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f8fafc;
          color: #64748b;
          font-size: 12px;
          font-weight: 500;
        }
        .nd-mention-list {
          max-height: 250px;
          overflow-y: auto;
        }
        .nd-mention-list::-webkit-scrollbar {
          width: 5px;
        }
        .nd-mention-list::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .nd-mention-list::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .nd-mention-list::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .nd-mention-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .nd-mention-item:hover {
          background: #f8fafc;
        }
        .nd-mention-item img {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }
        .nd-mention-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }
        .nd-mention-name {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
        }
        .nd-mention-role {
          font-size: 11px;
          color: #94a3b8;
        }
        .nd-mention-empty {
          padding: 20px;
          text-align: center;
          color: #94a3b8;
          font-size: 13px;
        }

        .nd-replies-section { margin-left: 50px; margin-top: 15px; margin-bottom: 15px; }
        .nd-toggle-replies {
          background: none; border: none; color: #3b82f6; font-size: 13px; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; gap: 5px; padding: 0;
        }
        .nd-toggle-replies.hide { margin-top: 10px; color: #94a3b8; }
        .nd-cmt-item.reply { margin-top: 15px; margin-bottom: 0; }
        .nd-cmt-avatar.small { width: 32px; height: 32px; font-size: 12px; }
        .nd-edit-box.small textarea { min-height: 60px; }
        .nd-cmt-menu.small { min-width: 110px; }
        .nd-cmt-menu.small button { padding: 8px 12px; font-size: 12px; }

        /* Right Column */
        .nd-article-body {
          font-size: 17px;
          line-height: 1.8;
          color: #334155;
          word-wrap: break-word;
          word-break: break-word;
          overflow-wrap: break-word;
        }
        .nd-article-body :global(p) { margin-bottom: 1.5em; }
        .nd-article-body :global(h2), .nd-article-body :global(h3) {
          color: #1e293b; margin: 2em 0 1em 0; font-weight: 700;
        }
        :global(.nd-article-body img) {
          width: 100% !important; 
          min-width: 100% !important; 
          max-width: 100% !important; 
          height: auto !important; 
          aspect-ratio: auto !important; 
          border-radius: 12px; 
          margin: 20px auto !important;
          display: block !important;
          object-fit: contain !important;
          background: transparent !important;
        }
        :global(.nd-article-body table) {
          width: 100% !important;
          max-width: 100% !important;
          border-collapse: collapse;
          margin: 20px 0;
          display: block;
          overflow-x: auto;
        }
        :global(.nd-article-body iframe) {
          max-width: 100% !important;
          border-radius: 12px;
        }
        /* Overriding all potential wrappers to prevent clipping */
        :global(.nd-article-body figure), 
        :global(.nd-article-body div),
        :global(.nd-article-body section),
        :global(.nd-article-body p) {
          max-width: 100% !important;
          width: auto !important;
          height: auto !important;
          overflow: visible !important;
          display: block !important;
          margin-bottom: 1.5em;
        }
        .nd-article-body {
          width: 100%;
          overflow: visible; /* Changed from hidden to prevent clipping */
        }
      `}</style>

      {/* Global CSS for Raw HTML Content (dangerouslySetInnerHTML) */}
      <style>{`
        .nd-article-body img {
          width: 100% !important;
          height: auto !important;
          max-width: 100% !important;
          display: block !important;
          margin: 20px 0 0 0 !important;
          object-fit: contain !important;
          border-radius: 12px;
        }
        .nd-article-body p, 
        .nd-article-body section, 
        .nd-article-body figure {
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          overflow: visible !important;
          margin: 0 !important;
        }
        /* Phải bỏ div ra khỏi rule 100% width này để slogan-container (là div) có thể float và co giãn theo max-width */
        .nd-article-body div:not(.slogan-container):not(.slogan-text):not(.slogan-motto) {
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
        }

        .nd-article-body table {
          width: 100% !important;
          max-width: 100% !important;
          margin: 20px 0 !important;
          display: block !important;
          overflow-x: auto !important;
        }
        .nd-article-body em {
          color: #94a3b8 !important;
        }

        .slogan-container {
          background-color: #e3ebfe;
          border-radius: 16px;
          padding: 24px;
          margin: 0 24px 16px 0;
          float: left;
          max-width: 40%;
          border: none;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.05);
        }
        .slogan-text {
          background: linear-gradient(to right, #47A1FF, #0066CC);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-size: 18px;
          font-weight: 600;
          font-style: italic;
          margin-bottom: 12px;
          line-height: 1.6;
          display: block;
        }
        .slogan-motto {
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
          font-style: italic;
          display: block;
          margin-top: 12px;
        }
        .nd-main-image-caption {
          padding: 8px 24px;
          background: #f8fafc;
          border-top: 1px solid #f1f5f9;
          color: #475569;
          font-size: 14px;
          font-style: italic;
          text-align: center;
          line-height: 1.5;
        }
        .nd-main-image-caption span {
          display: inline-block;
          text-align: left;
        }

        @media (max-width: 768px) {
          .slogan-container {
            max-width: 100%;
            float: none;
            margin: 16px 0;
            padding: 20px;
          }
        }
      `}</style>

      {/* Comment Uploads Preview */}
      <style>{`
        .nd-comment-uploads-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
          margin-bottom: 8px;
          padding-left: 56px; /* Align with input */
        }
        .nd-comment-file-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f1f5f9;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          color: #475569;
          border: 1px solid #e2e8f0;
        }
        .nd-file-name-mini {
          max-width: 120px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .nd-remove-file {
          cursor: pointer;
          color: #94a3b8;
          transition: color 0.2s;
        }
        .nd-remove-file:hover {
          color: #ef4444;
        }
        .nd-clear-uploads {
          font-size: 11px;
          color: #3b82f6;
          cursor: pointer;
          display: flex;
          align-items: center;
          font-weight: 600;
          margin-left: 4px;
        }
        .nd-clear-uploads:hover {
          text-decoration: underline;
        }

        /* Article Footer (Source & Tags) */
        .nd-article-footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #f1f5f9;
        }
        .nd-source {
          text-align: right;
          font-weight: 700;
          font-style: italic;
          color: #1e293b;
          margin-bottom: 20px;
        }
        .nd-tags {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          flex-wrap: wrap;
        }
        .nd-tag {
          color: #3b82f6;
          font-size: 16px;
          font-weight: 400;
          cursor: pointer;
        }
        .nd-tag:hover { text-decoration: underline; }

        /* Related News Section */
        .nd-related-section {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }
        .nd-related-title {
          font-size: 24px;
          font-weight: 700;
          color: #2563eb;
          margin-bottom: 30px;
        }
        .nd-related-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .nd-rel-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0,0,0,0.03);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid #f1f5f9;
        }
        .nd-rel-card:hover { transform: translateY(-5px); box-shadow: 0 12px 25px rgba(0,0,0,0.08); }
        .nd-rel-img-box { position: relative; width: 100%; height: 160px; }
        .nd-rel-img-box img { width: 100%; height: 100%; object-fit: cover; }
        .nd-rel-stripe { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: #ef4444; }
        
        .nd-rel-body { padding: 18px; }
        .nd-rel-date { font-size: 11px; color: #94a3b8; font-weight: 500; margin-bottom: 8px; }
        .nd-rel-card-title { 
          font-size: 15px; font-weight: 700; color: #1e293b; line-height: 1.4; margin-bottom: 16px;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
          min-height: 42px;
        }
        .nd-rel-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #f8fafc; }
        .nd-rel-stats { display: flex; gap: 12px; }
        .nd-rel-stat { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #94a3b8; font-weight: 500; }
        .nd-rel-more { color: #cbd5e1; }

        @media (max-width: 1024px) {
          .nd-grid-layout { 
            display: flex !important;
            flex-direction: column !important;
            gap: 25px !important;
          }
          .nd-left-col, .nd-right-col { 
            width: 100% !important; 
            max-width: 100% !important;
            float: none !important;
          }
          .nd-left-col { order: 2; margin-top: 30px; }
          .nd-right-col { order: 1; }
          .nd-related-grid { grid-template-columns: repeat(2, 1fr); }
          .nd-title { font-size: 26px; margin-bottom: 16px; }
        }

        @media (max-width: 768px) {
          .nd-container { 
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 12px 40px 12px !important;
            overflow-x: hidden !important;
          }
          .nd-hero-content { padding: 0 18px 0 56px; }
          .nd-back-button-fixed { top: 4px; left: -8px; width: 38px; height: 38px; }
          .nd-hero-banner { padding: 24px 12px; margin-bottom: 20px; }
          .nd-main-image-box { border-radius: 12px; margin-bottom: 20px; }
          .nd-summary-text { font-size: 16px; }
          .nd-article-body { font-size: 16px; }
          .nd-comment-box-container { padding: 16px; border-radius: 12px; }
          .nd-comment-uploads-preview { padding-left: 0; margin-top: 12px; }
          .nd-replies-section { margin-left: 15px; }
          .nd-related-title { font-size: 20px; margin-bottom: 20px; }
        }

        @media (max-width: 480px) {
          .nd-container { padding: 0 10px 30px 10px !important; }
          .nd-hero-content {
            width: 100%;
            padding: 0 12px 0 48px;
          }
          .nd-back-button-fixed { top: 2px; left: -2px; width: 36px; height: 36px; }
          .nd-breadcrumb { justify-content: flex-start; gap: 4px; font-size: 12px; }
          .nd-meta { justify-content: flex-start; flex-wrap: wrap; gap: 6px; font-size: 13px; }
          .nd-engagement-bar { gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
          .nd-related-grid { 
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
          .nd-cmt-reply-btn { margin-top: 4px; }
          .nd-user-avatar-ring { width: 32px; height: 32px; flex-shrink: 0; }
          .nd-input-wrapper { padding: 0 10px; border-radius: 20px; min-width: 0; }
          .nd-input-wrapper input { font-size: 13px; width: 100%; }
          .nd-title { font-size: 20px; line-height: 1.4; margin-bottom: 18px; }
          .nd-hero-banner { padding: 20px 10px; margin-bottom: 20px; }
          .nd-cmt-avatar { width: 32px; height: 32px; font-size: 12px; flex-shrink: 0; }
          .nd-cmt-author { font-size: 13px; }
          .nd-cmt-text { font-size: 13.5px; }
          .nd-comment-count-title { font-size: 14px; margin-bottom: 16px; }
          .nd-cmt-actions { flex-wrap: wrap; gap: 10px; }
          .nd-cmt-stat { font-size: 11px; }
        }
      `}</style>
    </div>
  );
}
